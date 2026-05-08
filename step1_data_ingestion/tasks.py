"""
Data ingestion tasks — fetch data from external APIs and persist to database.

Each task function is designed to run independently within the APScheduler
or be triggered manually via the /api/v1/ingestion/trigger endpoint.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from step2_db_storage.models.coin import Coin
from step2_db_storage.models.price_history import PriceHistory
from step2_db_storage.models.market_data import MarketData
from step2_db_storage.models.news import NewsArticle
from step2_db_storage.session import async_session_factory
from step1_data_ingestion.coingecko import CoinGeckoService
from step1_data_ingestion.coinmarketcap import CoinMarketCapService
from step5_llm_intelligence.sentiment_service import SentimentService

logger = logging.getLogger(__name__)

# Constants for scaling
MAX_COINS_TO_SYNC = 250
BATCH_SIZE = 50


# ═══════════════════════════════════════════════════════════════════════════
# COIN LIST SYNC
# ═══════════════════════════════════════════════════════════════════════════
async def sync_coin_list() -> int:
    """
    Fetch the top coin market data from CoinGecko and upsert into the coins table.
    Returns the number of coins upserted.
    """
    service = CoinGeckoService()
    try:
        # Fetch Top N coins (CG free tier allows 250 per page)
        markets = await service.get_coin_markets(per_page=MAX_COINS_TO_SYNC, page=1)
        count = 0

        async with async_session_factory() as session:
            for coin_data in markets:
                await _upsert_coin(session, coin_data)
                count += 1
            await session.commit()

        logger.info("✅ Synced %d coins from CoinGecko", count)
        return count
    except Exception as e:
        logger.error("❌ Coin list sync failed: %s", e)
        raise
    finally:
        await service.close()


async def _upsert_coin(session: AsyncSession, data: dict[str, Any]) -> None:
    """Insert or update a coin record."""
    stmt = pg_insert(Coin).values(
        coingecko_id=data["id"],
        symbol=data.get("symbol", ""),
        name=data.get("name", ""),
        image_url=data.get("image"),
    ).on_conflict_do_update(
        index_elements=["coingecko_id"],
        set_={
            "symbol": data.get("symbol", ""),
            "name": data.get("name", ""),
            "image_url": data.get("image"),
            "updated_at": datetime.now(timezone.utc),
        },
    )
    await session.execute(stmt)


# ═══════════════════════════════════════════════════════════════════════════
# PRICE SYNC
# ═══════════════════════════════════════════════════════════════════════════
async def sync_prices() -> int:
    """
    Fetch current prices for all coins stored in the database.
    Uses batching to stay within CoinGecko API limits.
    """
    service = CoinGeckoService()
    try:
        async with async_session_factory() as session:
            # 1. Get all coins from DB
            result = await session.execute(select(Coin))
            coins = result.scalars().all()
            if not coins:
                logger.warning("No coins found in DB. Run sync_coin_list first.")
                return 0

            count = 0
            now = datetime.now(timezone.utc)
            
            # 2. Process in batches of BATCH_SIZE (e.g. 50)
            for i in range(0, len(coins), BATCH_SIZE):
                batch_coins = coins[i : i + BATCH_SIZE]
                cg_ids = [c.coingecko_id for c in batch_coins if c.coingecko_id]
                
                logger.debug(f"Fetching prices for batch: {cg_ids[:3]}...")
                prices = await service.get_prices(cg_ids)
                
                for coin in batch_coins:
                    price_data = prices.get(coin.coingecko_id)
                    if not price_data:
                        continue

                    record = PriceHistory(
                        coin_id=coin.id,
                        timestamp=now,
                        price_usd=price_data.get("usd", 0),
                        volume_24h=price_data.get("usd_24h_vol"),
                        market_cap=price_data.get("usd_market_cap"),
                        price_change_pct_24h=price_data.get("usd_24h_change"),
                        source="coingecko",
                    )
                    session.add(record)
                    count += 1
                
                # Small delay to respect rate limits if many batches
                if i + BATCH_SIZE < len(coins):
                    await asyncio.sleep(1)

            await session.commit()

        logger.info("✅ Synced %d price records for %d coins", count, len(coins))
        return count
    except Exception as e:
        logger.error("❌ Price sync failed: %s", e)
        raise
    finally:
        await service.close()


# ═══════════════════════════════════════════════════════════════════════════
# MARKET DATA SYNC
# ═══════════════════════════════════════════════════════════════════════════
async def sync_market_data() -> int:
    """
    Fetch detailed market data specifically for coins already in our DB.
    """
    service = CoinGeckoService()
    try:
        async with async_session_factory() as session:
            # 1. Get all coins from DB
            result = await session.execute(select(Coin))
            coins = result.scalars().all()
            if not coins:
                return 0

            count = 0
            # Fetch market data in Top 250 chunks to ensure coverage
            markets = await service.get_coin_markets(per_page=MAX_COINS_TO_SYNC, page=1)
            
            # Create mapping for quick lookup
            market_map = {m["id"]: m for m in markets}

            for coin in coins:
                data = market_map.get(coin.coingecko_id)
                if not data:
                    continue

                # Upsert: delete old + insert new
                existing = await session.execute(
                    select(MarketData).where(MarketData.coin_id == coin.id)
                )
                old = existing.scalar_one_or_none()
                if old:
                    await session.delete(old)
                    await session.flush()

                md = MarketData(
                    coin_id=coin.id,
                    market_cap_rank=data.get("market_cap_rank"),
                    market_cap_usd=data.get("market_cap"),
                    total_supply=data.get("total_supply"),
                    circulating_supply=data.get("circulating_supply"),
                    max_supply=data.get("max_supply"),
                    ath=data.get("ath"),
                    ath_date=_parse_dt(data.get("ath_date")),
                    ath_change_pct=data.get("ath_change_percentage"),
                    atl=data.get("atl"),
                    atl_date=_parse_dt(data.get("atl_date")),
                    atl_change_pct=data.get("atl_change_percentage"),
                    high_24h=data.get("high_24h"),
                    low_24h=data.get("low_24h"),
                    last_updated=datetime.now(timezone.utc),
                )
                session.add(md)
                count += 1

            await session.commit()

        logger.info("✅ Synced %d market data records", count)
        return count
    except Exception as e:
        logger.error("❌ Market data sync failed: %s", e)
        raise
    finally:
        await service.close()


# ═══════════════════════════════════════════════════════════════════════════
# CMC ENRICHMENT (supplement CoinGecko data with CMC rankings)
# ═══════════════════════════════════════════════════════════════════════════
async def enrich_from_cmc() -> int:
    """Fetch latest listings from CoinMarketCap and update coin CMC IDs."""
    service = CoinMarketCapService()
    try:
        response = await service.get_latest_listings(limit=100)
        data = response.get("data", [])
        count = 0

        async with async_session_factory() as session:
            for item in data:
                symbol = item.get("symbol", "").lower()
                result = await session.execute(
                    select(Coin).where(Coin.symbol == symbol)
                )
                coin = result.scalar_one_or_none()
                if coin:
                    coin.cmc_id = item.get("id")
                    count += 1

            await session.commit()

        logger.info("✅ Enriched %d coins with CMC data", count)
        return count
    except Exception as e:
        logger.error("❌ CMC enrichment failed: %s", e)
        raise
    finally:
        await service.close()


# ═══════════════════════════════════════════════════════════════════════════
# FULL SYNC PIPELINE
# ═══════════════════════════════════════════════════════════════════════════
async def run_full_sync() -> dict[str, int]:
    """Run the complete data ingestion pipeline."""
    logger.info("🔄 Starting full data sync…")
    results: dict[str, int] = {}

    results["coins"] = await sync_coin_list()
    results["prices"] = await sync_prices()
    results["market_data"] = await sync_market_data()
    results["news"] = await sync_news()

    try:
        results["cmc_enrichment"] = await enrich_from_cmc()
    except Exception:
        logger.warning("CMC enrichment skipped (may not have valid key)")
        results["cmc_enrichment"] = 0

    logger.info("✅ Full sync complete: %s", results)
    return results


# ═══════════════════════════════════════════════════════════════════════════
# NEWS SYNC & SENTIMENT
# ═══════════════════════════════════════════════════════════════════════════
async def sync_news() -> int:
    """
    Fetch news (currently mock news for the sentiment demo) 
    and automatically analyze sentiment.
    """
    sentiment_service = SentimentService()
    
    # Diverse News Samples for the Intelligence Demo
    DIVERSE_NEWS = [
        {"title": "SEC Approves Spot Ethereum ETFs in Landmark Decision", "source": "CryptoDaily", "content": "The SEC has finally given the green light to several spot Ethereum ETFs, marking a massive milestone for institutional adoption.", "currencies": ["ETH"]},
        {"title": "Major Exchange Hacked: $500M in Assets Stolen", "source": "SecurityWatch", "content": "A top-tier cryptocurrency exchange has reported a security breach resulting in the loss of half a billion dollars.", "currencies": []},
        {"title": "Bitcoin Whales Accumulate Record Amounts of BTC Below $60k", "source": "WhaleTracker", "content": "On-chain data shows that large holders are buying aggressively during the recent dip, signaling long-term confidence.", "currencies": ["BTC"]},
        {"title": "New Regulatory Crackdown Announced in Asia-Pacific Region", "source": "GlobalNews", "content": "Regulators in several countries have issued warnings against unregistered crypto platforms, causing market uncertainty.", "currencies": []},
        {"title": "Stablecoin Volume Hits All-Time High as Investors De-Risk", "source": "MarketPulse", "content": "The total supply of USDC and USDT has surged, suggesting that traders are moving to the sidelines amid volatility.", "currencies": ["USDT", "USDC"]}
    ]

    count = 0
    async with async_session_factory() as session:
        for news_data in DIVERSE_NEWS:
            # Check if news exists by title
            stmt = select(NewsArticle).where(NewsArticle.title == news_data["title"])
            existing = await session.execute(stmt)
            if existing.scalar_one_or_none():
                continue

            # 1. Analyze Sentiment with AI
            logger.info(f"Analyzing sentiment for: {news_data['title']}")
            analysis = await sentiment_service.analyze_sentiment(news_data["title"], news_data["content"])

            # 2. Create Article with Sentiment
            article = NewsArticle(
                title=news_data["title"],
                content=news_data["content"],
                source=news_data["source"],
                currencies=news_data.get("currencies", []),
                sentiment=analysis["sentiment"],
                sentiment_score=analysis["score"],
                is_embedded=False
            )
            session.add(article)
            count += 1
            
        await session.commit()
    
    logger.info(f"✅ Synced {count} articles with AI sentiment analysis.")
    return count


# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════
def _parse_dt(value: str | None) -> datetime | None:
    """Parse an ISO datetime string, returning None on failure."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
