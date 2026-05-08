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
from step2_db_storage.models import Coin, PriceHistory, MarketData, NewsArticle  # noqa: F401

# Alembic Config object
config = context.config

# Override sqlalchemy.url from our .env if available
try:
    from core.config import get_settings
    settings = get_settings()
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL_SYNC)
except Exception:
    pass  # Fall back to alembic.ini value

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
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
