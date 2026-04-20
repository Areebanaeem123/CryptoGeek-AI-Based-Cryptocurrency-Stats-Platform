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

from app.db.models.coin import Coin
from app.db.models.price_history import PriceHistory
from app.db.models.market_data import MarketData
from app.db.session import async_session_factory
from app.services.coingecko import CoinGeckoService
from app.services.coinmarketcap import CoinMarketCapService

logger = logging.getLogger(__name__)

# Top coins to track (can be expanded from coin list later)
DEFAULT_TRACKED_COINS = [
    "bitcoin", "ethereum", "tether", "binancecoin", "solana",
    "ripple", "cardano", "dogecoin", "avalanche-2", "polkadot",
    "chainlink", "polygon-pos", "litecoin", "uniswap", "cosmos",
    "stellar", "monero", "near", "internet-computer", "aptos",
]


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
        markets = await service.get_coin_markets(per_page=100, page=1)
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
async def sync_prices(coin_ids: list[str] | None = None) -> int:
    """
    Fetch current prices from CoinGecko and store as PriceHistory snapshots.
    Returns the number of price records inserted.
    """
    coin_ids = coin_ids or DEFAULT_TRACKED_COINS
    service = CoinGeckoService()
    try:
        prices = await service.get_prices(coin_ids)
        count = 0
        now = datetime.now(timezone.utc)

        async with async_session_factory() as session:
            for cg_id, price_data in prices.items():
                # Look up internal coin ID
                result = await session.execute(
                    select(Coin.id).where(Coin.coingecko_id == cg_id)
                )
                coin_row = result.scalar_one_or_none()
                if coin_row is None:
                    logger.debug("Coin %s not in DB yet, skipping price", cg_id)
                    continue

                record = PriceHistory(
                    coin_id=coin_row,
                    timestamp=now,
                    price_usd=price_data.get("usd", 0),
                    volume_24h=price_data.get("usd_24h_vol"),
                    market_cap=price_data.get("usd_market_cap"),
                    price_change_pct_24h=price_data.get("usd_24h_change"),
                    source="coingecko",
                )
                session.add(record)
                count += 1

            await session.commit()

        logger.info("✅ Synced %d price records", count)
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
    Fetch detailed market data from CoinGecko /coins/markets and upsert MarketData records.
    """
    service = CoinGeckoService()
    try:
        markets = await service.get_coin_markets(per_page=100, page=1)
        count = 0

        async with async_session_factory() as session:
            for data in markets:
                result = await session.execute(
                    select(Coin.id).where(Coin.coingecko_id == data["id"])
                )
                coin_row = result.scalar_one_or_none()
                if coin_row is None:
                    continue

                # Upsert: delete old + insert new (simpler than ON CONFLICT for many columns)
                existing = await session.execute(
                    select(MarketData).where(MarketData.coin_id == coin_row)
                )
                old = existing.scalar_one_or_none()
                if old:
                    await session.delete(old)
                    await session.flush()

                md = MarketData(
                    coin_id=coin_row,
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

    try:
        results["cmc_enrichment"] = await enrich_from_cmc()
    except Exception:
        logger.warning("CMC enrichment skipped (may not have valid key)")
        results["cmc_enrichment"] = 0

    logger.info("✅ Full sync complete: %s", results)
    return results


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
