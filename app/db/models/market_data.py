"""
MarketData model — snapshot of a coin's market metrics.
"""

from datetime import datetime, timezone

from sqlalchemy import Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MarketData(Base):
    """Current / latest market data for a cryptocurrency."""

    __tablename__ = "market_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coin_id: Mapped[int] = mapped_column(Integer, ForeignKey("coins.id", ondelete="CASCADE"), index=True)

    market_cap_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    market_cap_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_supply: Mapped[float | None] = mapped_column(Float, nullable=True)
    circulating_supply: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_supply: Mapped[float | None] = mapped_column(Float, nullable=True)

    ath: Mapped[float | None] = mapped_column(Float, nullable=True)
    ath_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ath_change_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    atl: Mapped[float | None] = mapped_column(Float, nullable=True)
    atl_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    atl_change_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    high_24h: Mapped[float | None] = mapped_column(Float, nullable=True)
    low_24h: Mapped[float | None] = mapped_column(Float, nullable=True)

    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    coin = relationship("Coin", back_populates="market_data")

    def __repr__(self) -> str:
        return f"<MarketData coin_id={self.coin_id} rank={self.market_cap_rank}>"
