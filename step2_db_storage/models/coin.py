"""
Coin model — represents a cryptocurrency tracked by the system.
"""

from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from step2_db_storage.base import Base


class Coin(Base):
    """Cryptocurrency master record."""

    __tablename__ = "coins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coingecko_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(200))
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cmc_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # CoinMarketCap ID

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    price_history = relationship("PriceHistory", back_populates="coin", cascade="all, delete-orphan")
    market_data = relationship("MarketData", back_populates="coin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Coin {self.symbol.upper()} ({self.name})>"
