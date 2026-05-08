from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from step2_db_storage.session import get_db
from step2_db_storage.models.news import NewsArticle
from step6_api_gateway.schemas.intelligence import MarketSentimentResponse

router = APIRouter(prefix="/intelligence", tags=["Market Intelligence"])

@router.get("/sentiment/{symbol}", response_model=MarketSentimentResponse)
async def get_coin_sentiment(symbol: str, db: AsyncSession = Depends(get_db)):
    """
    Get aggregated AI sentiment for a specific coin.
    Analyzes recent news to determine the 'Market Pulse'.
    """
    symbol = symbol.upper()
    
    # Query news articles that mention this symbol in their 'currencies' JSON field
    # Improved check for JSON array containing symbol
    from sqlalchemy import cast, Text
    stmt = (
        select(NewsArticle)
        .where(cast(NewsArticle.currencies, Text).contains(f'"{symbol}"'))
        .order_by(NewsArticle.published_at.desc())
        .limit(20)
    )
    
    result = await db.execute(stmt)
    articles = result.scalars().all()
    
    if not articles:
        # Fallback to global news if no specific coin news found
        stmt_global = select(NewsArticle).order_by(NewsArticle.published_at.desc()).limit(10)
        result_global = await db.execute(stmt_global)
        articles = result_global.scalars().all()

    if not articles:
        return MarketSentimentResponse(
            coin_symbol=symbol,
            overall_sentiment="Neutral",
            sentiment_score=0.5,
            article_count=0,
            summary="No recent news found for analysis."
        )

    avg_score = sum(a.sentiment_score for a in articles if a.sentiment_score is not None) / len(articles)
    
    sentiment_label = "Neutral"
    if avg_score > 0.6:
        sentiment_label = "Bullish"
    elif avg_score < 0.4:
        sentiment_label = "Bearish"
        
    summary = f"Based on {len(articles)} recent articles, the market for {symbol} is currently {sentiment_label}."
    
    return MarketSentimentResponse(
        coin_symbol=symbol,
        overall_sentiment=sentiment_label,
        sentiment_score=avg_score,
        article_count=len(articles),
        summary=summary
    )
