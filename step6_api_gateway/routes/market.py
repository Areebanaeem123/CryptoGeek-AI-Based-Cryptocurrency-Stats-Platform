"""
Market / Price endpoints — price history, market data, and market overview.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from step2_db_storage.session import get_db
from step2_db_storage.models.coin import Coin
from step2_db_storage.models.price_history import PriceHistory
from step2_db_storage.models.market_data import MarketData
from step6_api_gateway.schemas.market import (
    PricePointResponse,
    PriceHistoryResponse,
    MarketDataResponse,
    MarketOverviewItem,
    MarketOverviewResponse,
)

router = APIRouter(prefix="/market", tags=["Market"])


# ── Price history ───────────────────────────────────────────────────────────
@router.get(
    "/prices/{coingecko_id}",
    response_model=PriceHistoryResponse,
    summary="Get price history for a coin",
)
async def get_price_history(
    coingecko_id: str,
    timeframe: str = Query(
        "24h",
        description="Timeframe filter: 1h, 24h, 7d, 30d, 90d, all",
    ),
    db: AsyncSession = Depends(get_db),
):
    """Return price history for a specific coin within the given timeframe."""
    # Resolve coin
    result = await db.execute(
        select(Coin).where(Coin.coingecko_id == coingecko_id)
    )
    coin = result.scalar_one_or_none()
    if not coin:
        raise HTTPException(404, f"Coin '{coingecko_id}' not found")

    # Timeframe → start date
    now = datetime.now(timezone.utc)
    tf_map = {
        "1h": timedelta(hours=1),
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "90d": timedelta(days=90),
    }
    start = now - tf_map.get(timeframe, timedelta(days=1))

    query = (
        select(PriceHistory)
        .where(PriceHistory.coin_id == coin.id)
        .order_by(PriceHistory.timestamp.asc())
    )
    if timeframe != "all":
        query = query.where(PriceHistory.timestamp >= start)

    rows = (await db.execute(query)).scalars().all()

    return PriceHistoryResponse(
        coin_id=coin.id,
        coingecko_id=coin.coingecko_id,
        symbol=coin.symbol,
        total_points=len(rows),
        prices=[PricePointResponse.model_validate(r) for r in rows],
    )


# ── Market data for a coin ──────────────────────────────────────────────────
@router.get(
    "/data/{coingecko_id}",
    response_model=MarketDataResponse,
    summary="Get market data for a coin",
)
async def get_market_data(
    coingecko_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return current market data snapshot for a specific coin."""
    result = await db.execute(
        select(Coin).where(Coin.coingecko_id == coingecko_id)
    )
    coin = result.scalar_one_or_none()
    if not coin:
        raise HTTPException(404, f"Coin '{coingecko_id}' not found")

    md = (
        await db.execute(select(MarketData).where(MarketData.coin_id == coin.id))
    ).scalar_one_or_none()
    if not md:
        raise HTTPException(404, f"No market data for '{coingecko_id}'")

    return MarketDataResponse.model_validate(md)


# ── Market overview (top coins) ─────────────────────────────────────────────
@router.get(
    "/overview",
    response_model=MarketOverviewResponse,
    summary="Market overview — top coins summary",
)
async def market_overview(
    limit: int = Query(20, ge=1, le=100, description="Number of coins"),
    db: AsyncSession = Depends(get_db),
):
    """Return a summary of top coins by market cap rank."""
    # Get coins with market data, sorted by rank
    query = (
        select(Coin, MarketData)
        .join(MarketData, MarketData.coin_id == Coin.id)
        .where(MarketData.market_cap_rank.isnot(None))
        .order_by(MarketData.market_cap_rank.asc())
        .limit(limit)
    )
    rows = (await db.execute(query)).all()

    items = []
    for coin, md in rows:
        # Get latest price
        price_q = (
            select(PriceHistory)
            .where(PriceHistory.coin_id == coin.id)
            .order_by(PriceHistory.timestamp.desc())
            .limit(1)
        )
        price_row = (await db.execute(price_q)).scalar_one_or_none()

        items.append(
            MarketOverviewItem(
                coingecko_id=coin.coingecko_id,
                symbol=coin.symbol,
                name=coin.name,
                image_url=coin.image_url,
                current_price=price_row.price_usd if price_row else None,
                market_cap=md.market_cap_usd,
                market_cap_rank=md.market_cap_rank,
                price_change_24h_pct=price_row.price_change_pct_24h if price_row else None,
                volume_24h=price_row.volume_24h if price_row else None,
                high_24h=md.high_24h,
                low_24h=md.low_24h,
            )
        )

    return MarketOverviewResponse(total=len(items), coins=items)
