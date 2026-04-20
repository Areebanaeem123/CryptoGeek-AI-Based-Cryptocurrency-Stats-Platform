"""
CoinMarketCap API service — rankings, metadata, and market data.

Docs: https://coinmarketcap.com/api/documentation/v1/
"""

import logging
from typing import Any

from app.config import get_settings
from app.services.base_client import BaseAPIClient

logger = logging.getLogger(__name__)
settings = get_settings()


class CoinMarketCapService(BaseAPIClient):
    """Async client for the CoinMarketCap REST API."""

    def __init__(self) -> None:
        super().__init__(
            base_url=settings.COINMARKETCAP_API_URL,
            headers={
                "X-CMC_PRO_API_KEY": settings.COINMARKETCAP_API_KEY,
                "Accept": "application/json",
            },
            timeout=30.0,
            max_retries=3,
        )

    # ── Latest listings (top N by market cap) ───────────────────────────
    async def get_latest_listings(
        self,
        limit: int = 50,
        start: int = 1,
        convert: str = "USD",
    ) -> dict[str, Any]:
        """
        Get the latest listings sorted by market cap.
        Returns: {status: {...}, data: [{id, name, symbol, quote: {...}}, ...]}
        """
        return await self.get(
            "/cryptocurrency/listings/latest",
            params={
                "start": str(start),
                "limit": str(limit),
                "convert": convert,
                "sort": "market_cap",
            },
        )

    # ── Coin metadata / info ────────────────────────────────────────────
    async def get_coin_info(self, symbols: list[str]) -> dict[str, Any]:
        """
        Get metadata (logo, description, urls) for coins by symbol.
        """
        return await self.get(
            "/cryptocurrency/info",
            params={"symbol": ",".join(symbols)},
        )

    # ── Quotes (current price data) ─────────────────────────────────────
    async def get_quotes(
        self,
        symbols: list[str],
        convert: str = "USD",
    ) -> dict[str, Any]:
        """
        Get latest market quote for one or more symbols.
        """
        return await self.get(
            "/cryptocurrency/quotes/latest",
            params={
                "symbol": ",".join(symbols),
                "convert": convert,
            },
        )

    # ── Global metrics ──────────────────────────────────────────────────
    async def get_global_metrics(self, convert: str = "USD") -> dict[str, Any]:
        """
        Get aggregate market metrics (total market cap, BTC dominance, etc.).
        """
        return await self.get(
            "/global-metrics/quotes/latest",
            params={"convert": convert},
        )
