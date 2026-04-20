"""
AI Crypto Intelligence Copilot - Application Configuration

Loads settings from environment variables / .env file using pydantic-settings.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "AI Crypto Intelligence Copilot"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/crypto_copilot"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/crypto_copilot"

    # ── Redis ────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── CoinGecko ────────────────────────────────────────
    COINGECKO_API_KEY: str = ""
    COINGECKO_API_URL: str = "https://api.coingecko.com/api/v3"

    # ── CoinMarketCap ────────────────────────────────────
    COINMARKETCAP_API_KEY: str = ""
    COINMARKETCAP_API_URL: str = "https://pro-api.coinmarketcap.com/v1"

    # ── Binance (deferred) ───────────────────────────────
    BINANCE_API_KEY: str = ""
    BINANCE_API_SECRET: str = ""
    BINANCE_API_URL: str = "https://api.binance.com/api/v3"

    # ── OpenAI (Phase 2+) ───────────────────────────────
    OPENAI_API_KEY: str = ""

    # ── Ingestion Schedule (seconds) ─────────────────────
    PRICE_SYNC_INTERVAL: int = 300       # 5 minutes
    MARKET_SYNC_INTERVAL: int = 900      # 15 minutes
    NEWS_SYNC_INTERVAL: int = 600        # 10 minutes
    COIN_LIST_SYNC_INTERVAL: int = 86400 # 24 hours


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()
