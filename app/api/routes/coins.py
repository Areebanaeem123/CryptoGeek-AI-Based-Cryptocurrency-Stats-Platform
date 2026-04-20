"""
Coin endpoints — list and detail views for tracked cryptocurrencies.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.coin import Coin
from app.db.models.price_history import PriceHistory
from app.db.models.market_data import MarketData
from app.api.schemas.coin import CoinWithPrice, CoinListResponse

router = APIRouter(prefix="/coins", tags=["Coins"])


@router.get("", response_model=CoinListResponse, summary="List all tracked coins")
async def list_coins(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by name or symbol"),
    db: AsyncSession = Depends(get_db),
):
    """Return a paginated list of coins with latest price info."""
    query = select(Coin)

    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            (Coin.name.ilike(pattern)) | (Coin.symbol.ilike(pattern))
        )

    # Total count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    query = query.order_by(Coin.id).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    coins = result.scalars().all()

    # Enrich each coin with latest price + market data
    enriched = []
    for coin in coins:
        # Latest price
        price_q = (
            select(PriceHistory)
            .where(PriceHistory.coin_id == coin.id)
            .order_by(PriceHistory.timestamp.desc())
            .limit(1)
        )
        price_row = (await db.execute(price_q)).scalar_one_or_none()

        # Latest market data
        md_q = select(MarketData).where(MarketData.coin_id == coin.id)
        md_row = (await db.execute(md_q)).scalar_one_or_none()

        enriched.append(
            CoinWithPrice(
                id=coin.id,
                coingecko_id=coin.coingecko_id,
                symbol=coin.symbol,
                name=coin.name,
                image_url=coin.image_url,
                cmc_id=coin.cmc_id,
                created_at=coin.created_at,
                updated_at=coin.updated_at,
                current_price_usd=price_row.price_usd if price_row else None,
                price_change_24h_pct=price_row.price_change_pct_24h if price_row else None,
                market_cap_usd=md_row.market_cap_usd if md_row else None,
                volume_24h=price_row.volume_24h if price_row else None,
                market_cap_rank=md_row.market_cap_rank if md_row else None,
            )
        )

    return CoinListResponse(total=total, page=page, per_page=per_page, coins=enriched)


@router.get("/{coingecko_id}", response_model=CoinWithPrice, summary="Get coin details")
async def get_coin(
    coingecko_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return details for a single coin by CoinGecko ID."""
    result = await db.execute(
        select(Coin).where(Coin.coingecko_id == coingecko_id)
    )
    coin = result.scalar_one_or_none()
    if not coin:
        raise HTTPException(status_code=404, detail=f"Coin '{coingecko_id}' not found")

    # Latest price
    price_q = (
        select(PriceHistory)
        .where(PriceHistory.coin_id == coin.id)
        .order_by(PriceHistory.timestamp.desc())
        .limit(1)
    )
    price_row = (await db.execute(price_q)).scalar_one_or_none()

    # Market data
    md_q = select(MarketData).where(MarketData.coin_id == coin.id)
    md_row = (await db.execute(md_q)).scalar_one_or_none()

    return CoinWithPrice(
        id=coin.id,
        coingecko_id=coin.coingecko_id,
        symbol=coin.symbol,
        name=coin.name,
        image_url=coin.image_url,
        cmc_id=coin.cmc_id,
        created_at=coin.created_at,
        updated_at=coin.updated_at,
        current_price_usd=price_row.price_usd if price_row else None,
        price_change_24h_pct=price_row.price_change_pct_24h if price_row else None,
        market_cap_usd=md_row.market_cap_usd if md_row else None,
        volume_24h=price_row.volume_24h if price_row else None,
        market_cap_rank=md_row.market_cap_rank if md_row else None,
    )
