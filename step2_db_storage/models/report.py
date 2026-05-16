"""
MarketReport model — persistent storage for AI-generated reports.
"""

from datetime import datetime, timezone
from sqlalchemy import Integer, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from step2_db_storage.base import Base

class MarketReport(Base):
    """Stores AI-generated market intelligence reports."""

    __tablename__ = "market_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_type: Mapped[str] = mapped_column(default="daily_brief")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True) # Top movers, etc.
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<MarketReport {self.report_type} at {self.created_at}>"
