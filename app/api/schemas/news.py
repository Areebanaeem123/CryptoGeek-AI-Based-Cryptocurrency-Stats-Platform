"""Pydantic schemas for News endpoints."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class NewsArticleResponse(BaseModel):
    """Single news article."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: str | None = None
    title: str
    content: str | None = None
    url: str | None = None
    source: str
    published_at: datetime | None = None
    currencies: Any | None = None
    sentiment: str | None = None
    sentiment_score: float | None = None
    created_at: datetime


class NewsListResponse(BaseModel):
    """Paginated news list."""
    total: int
    page: int
    per_page: int
    articles: list[NewsArticleResponse]
