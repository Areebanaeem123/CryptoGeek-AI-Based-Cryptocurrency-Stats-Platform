"""Pydantic schemas for Coin endpoints."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CoinBase(BaseModel):
    """Shared fields for a cryptocurrency."""
    coingecko_id: str
    symbol: str
    name: str
    image_url: str | None = None


class CoinResponse(CoinBase):
    """Full coin response with DB metadata."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    cmc_id: int | None = None
    created_at: datetime
    updated_at: datetime


class CoinWithPrice(CoinResponse):
    """Coin with its latest price info attached."""
    current_price_usd: float | None = None
    price_change_24h_pct: float | None = None
    market_cap_usd: float | None = None
    volume_24h: float | None = None
    market_cap_rank: int | None = None


class CoinListResponse(BaseModel):
    """Paginated list of coins."""
    total: int
    page: int
    per_page: int
    coins: list[CoinWithPrice]
