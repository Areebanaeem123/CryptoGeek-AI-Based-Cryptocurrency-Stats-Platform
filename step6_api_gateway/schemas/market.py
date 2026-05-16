"""Pydantic schemas for Market / Price endpoints."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PricePointResponse(BaseModel):
    """Single price data point."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    coin_id: int
    timestamp: datetime
    price_usd: float
    volume_24h: float | None = None
    market_cap: float | None = None
    price_change_pct_24h: float | None = None
    source: str


class PriceHistoryResponse(BaseModel):
    """Price history for a coin."""
    coin_id: int
    coingecko_id: str
    symbol: str
    total_points: int
    prices: list[PricePointResponse]


class MarketDataResponse(BaseModel):
    """Market data snapshot for a coin."""
    model_config = ConfigDict(from_attributes=True)

    coin_id: int
    market_cap_rank: int | None = None
    market_cap_usd: float | None = None
    total_supply: float | None = None
    circulating_supply: float | None = None
    max_supply: float | None = None
    ath: float | None = None
    ath_date: datetime | None = None
    ath_change_pct: float | None = None
    atl: float | None = None
    atl_date: datetime | None = None
    atl_change_pct: float | None = None
    high_24h: float | None = None
    low_24h: float | None = None
    last_updated: datetime


class MarketOverviewItem(BaseModel):
    """Single item in the market overview."""
    coingecko_id: str
    symbol: str
    name: str
    image_url: str | None = None
    current_price: float | None = None
    market_cap: float | None = None
    market_cap_rank: int | None = None
    price_change_24h_pct: float | None = None
    volume_24h: float | None = None
    high_24h: float | None = None
    low_24h: float | None = None
    sparkline_in_7d: list[float] | None = None


class MarketOverviewResponse(BaseModel):
    """Market overview with top coins."""
    total: int
    coins: list[MarketOverviewItem]
