"""
PriceHistory model — time-series price snapshots for each coin.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Integer, Float, String, DateTime, ForeignKey, Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from step2_db_storage.base import Base


class PriceHistory(Base):
    """Historical price data point for a cryptocurrency."""

    __tablename__ = "price_history"
    __table_args__ = (
        Index("ix_price_coin_ts", "coin_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coin_id: Mapped[int] = mapped_column(Integer, ForeignKey("coins.id", ondelete="CASCADE"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    price_usd: Mapped[float] = mapped_column(Float, nullable=False)
    volume_24h: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_cap: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_change_24h: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_change_pct_24h: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="coingecko")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    coin = relationship("Coin", back_populates="price_history")

    def __repr__(self) -> str:
        return f"<PriceHistory coin_id={self.coin_id} ${self.price_usd:.2f} @ {self.timestamp}>"
