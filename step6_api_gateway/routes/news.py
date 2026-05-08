"""
News endpoints — list and filter crypto news articles.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from step2_db_storage.session import get_db
from step2_db_storage.models.news import NewsArticle
from step6_api_gateway.schemas.news import NewsArticleResponse, NewsListResponse

router = APIRouter(prefix="/news", tags=["News"])


@router.get("", response_model=NewsListResponse, summary="List news articles")
async def list_news(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    source: str | None = Query(None, description="Filter by source"),
    currency: str | None = Query(None, description="Filter by currency symbol (e.g. BTC)"),
    db: AsyncSession = Depends(get_db),
):
    """Return paginated news articles with optional filters."""
    query = select(NewsArticle)

    if source:
        query = query.where(NewsArticle.source == source)
    if currency:
        # Filter articles whose currencies JSON contains the symbol
        query = query.where(
            NewsArticle.currencies.cast(str).ilike(f"%{currency.upper()}%")
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    query = (
        query.order_by(NewsArticle.published_at.desc().nullslast())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = (await db.execute(query)).scalars().all()

    return NewsListResponse(
        total=total,
        page=page,
        per_page=per_page,
        articles=[NewsArticleResponse.model_validate(a) for a in rows],
    )
