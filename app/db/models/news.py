"""
NewsArticle model — crypto news articles collected from various sources.
"""

from datetime import datetime, timezone

from sqlalchemy import Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NewsArticle(Base):
    """A crypto news article from an external source."""

    __tablename__ = "news_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    # JSON list of related currency symbols, e.g. ["BTC", "ETH"]
    currencies: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Sentiment: positive / negative / neutral (populated later by NLP)
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sentiment_score: Mapped[float | None] = mapped_column(nullable=True)

    # For RAG — marks whether embeddings have been generated
    is_embedded: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<NewsArticle '{self.title[:40]}…'>"
