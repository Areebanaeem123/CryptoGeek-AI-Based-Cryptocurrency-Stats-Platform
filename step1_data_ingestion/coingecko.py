"""
CoinGecko API service — prices, market data, coin lists, and historical data.

Docs: https://docs.coingecko.com/v3.0.1/reference
"""

import logging
from typing import Any

from core.config import get_settings
from step1_data_ingestion.base_client import BaseAPIClient

logger = logging.getLogger(__name__)
settings = get_settings()


class CoinGeckoService(BaseAPIClient):
    """Async client for the CoinGecko REST API."""

    def __init__(self) -> None:
        headers = {}
        if settings.COINGECKO_API_KEY:
            headers["x-cg-demo-api-key"] = settings.COINGECKO_API_KEY

        super().__init__(
            base_url=settings.COINGECKO_API_URL,
            headers=headers,
            timeout=30.0,
            max_retries=3,
        )

    # ── Coin list ───────────────────────────────────────────────────────
    async def get_coin_list(self) -> list[dict[str, Any]]:
        """Fetch the full list of coins (id, symbol, name)."""
        return await self.get("/coins/list")

    # ── Current prices (batch) ──────────────────────────────────────────
    async def get_prices(
        self,
        coin_ids: list[str],
        vs_currency: str = "usd",
    ) -> dict[str, Any]:
        """Get current prices for multiple coins at once."""
        ids_str = ",".join(coin_ids)
        return await self.get(
            "/simple/price",
            params={
                "ids": ids_str,
                "vs_currencies": vs_currency,
                "include_market_cap": "true",
                "include_24hr_vol": "true",
                "include_24hr_change": "true",
                "include_last_updated_at": "true",
            },
        )

    # ── Detailed coin market data (paginated) ───────────────────────────
    async def get_coin_markets(
        self,
        vs_currency: str = "usd",
        per_page: int = 50,
        page: int = 1,
        order: str = "market_cap_desc",
    ) -> list[dict[str, Any]]:
        """Fetch detailed market data for top coins."""
        return await self.get(
            "/coins/markets",
            params={
                "vs_currency": vs_currency,
                "order": order,
                "per_page": per_page,
                "page": page,
                "sparkline": "false",
            },
        )

    # ── Single coin detail ──────────────────────────────────────────────
    async def get_coin_detail(self, coin_id: str) -> dict[str, Any]:
        """Fetch full detail for a single coin."""
        return await self.get(
            f"/coins/{coin_id}",
            params={
                "localization": "false",
                "tickers": "false",
                "community_data": "false",
                "developer_data": "false",
            },
        )

    # ── Historical prices ───────────────────────────────────────────────
    async def get_market_chart(
        self,
        coin_id: str,
        vs_currency: str = "usd",
        days: int = 30,
    ) -> dict[str, Any]:
        """
        Fetch historical price/volume/market-cap data.

        Returns: {prices: [[ts, price], ...], market_caps: [...], total_volumes: [...]}
        """
        return await self.get(
            f"/coins/{coin_id}/market_chart",
            params={
                "vs_currency": vs_currency,
                "days": str(days),
            },
        )

    # ── Trending coins ──────────────────────────────────────────────────
    async def get_trending(self) -> dict[str, Any]:
        """Fetch trending coins (top-7 by search popularity)."""
        return await self.get("/search/trending")

    # ── Global market data ──────────────────────────────────────────────
    async def get_global_data(self) -> dict[str, Any]:
        """Fetch global crypto market stats."""
        return await self.get("/global")
