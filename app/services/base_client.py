"""
BaseAPIClient — shared async HTTP client with retry, rate-limit handling, and logging.
"""

import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class BaseAPIClient:
    """Reusable async HTTP client with exponential-backoff retry logic."""

    def __init__(
        self,
        base_url: str,
        headers: dict[str, str] | None = None,
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        self.base_url = base_url.rstrip("/")
        self.headers = headers or {}
        self.timeout = timeout
        self.max_retries = max_retries
        self._client: httpx.AsyncClient | None = None

    # ── Client lifecycle ────────────────────────────────────────────────
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self.headers,
                timeout=self.timeout,
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ── Core request with retry ─────────────────────────────────────────
    async def _request(
        self,
        method: str,
        endpoint: str,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any] | list[Any]:
        """Make an HTTP request with exponential-backoff retry on failures."""
        client = await self._get_client()
        last_exception: Exception | None = None

        for attempt in range(1, self.max_retries + 1):
            try:
                response = await client.request(
                    method=method,
                    url=endpoint,
                    params=params,
                    json=json_body,
                )

                # Rate-limit handling
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 5))
                    logger.warning(
                        "Rate limited on %s %s — retrying in %ds (attempt %d/%d)",
                        method, endpoint, retry_after, attempt, self.max_retries,
                    )
                    await asyncio.sleep(retry_after)
                    continue

                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError as exc:
                last_exception = exc
                logger.error(
                    "HTTP %d on %s %s: %s",
                    exc.response.status_code, method, endpoint, exc.response.text[:200],
                )
                if exc.response.status_code < 500:
                    raise  # Don't retry client errors (4xx except 429)

            except (httpx.ConnectError, httpx.ReadTimeout, httpx.PoolTimeout) as exc:
                last_exception = exc
                logger.warning(
                    "Connection error on %s %s (attempt %d/%d): %s",
                    method, endpoint, attempt, self.max_retries, exc,
                )

            # Exponential backoff: 1s, 2s, 4s …
            backoff = 2 ** (attempt - 1)
            logger.info("Retrying in %ds…", backoff)
            await asyncio.sleep(backoff)

        raise last_exception or RuntimeError(f"Request failed after {self.max_retries} attempts")

    # ── Convenience methods ─────────────────────────────────────────────
    async def get(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        return await self._request("GET", endpoint, params=params)

    async def post(self, endpoint: str, json_body: dict[str, Any] | None = None) -> Any:
        return await self._request("POST", endpoint, json_body=json_body)
