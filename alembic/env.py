"""
Alembic environment configuration.

Reads the SQLAlchemy URL from our app config and registers all models
for autogenerate support.
"""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Import our models + Base so Alembic can see them ────────────────────────
from step2_db_storage.base import Base
from step2_db_storage.models import Coin, PriceHistory, MarketData, NewsArticle, MarketReport  # noqa: F401

# Alembic Config object
config = context.config

# Override sqlalchemy.url from our settings if available
import os
from core.config import get_settings
settings = get_settings()

db_url = (
    os.environ.get("DATABASE_URL_SYNC") or 
    os.environ.get("DATABASE_URL") or 
    settings.DATABASE_URL_SYNC
).strip()

if db_url:
    # Ensure it's the sync version for psycopg2/Alembic
    if "asyncpg" in db_url:
        db_url = db_url.replace("asyncpg", "psycopg2")
    elif "postgresql://" in db_url:
        # Standard postgresql:// URI needs to be postgresql+psycopg2:// for Alembic/SQLAlchemy in some versions
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://")
    
    # Log database connection info (safe version)
    db_host = db_url.split("@")[-1] if "@" in db_url else "unknown"
    print(f"🚀 Alembic using database host: {db_host}")

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    # Bypass config and use db_url directly to avoid interpolation errors
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Bypass config and create engine directly to avoid interpolation errors
    from sqlalchemy import create_engine
    connectable = create_engine(
        db_url,
        poolclass=pool.NullPool,
    )
    
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
