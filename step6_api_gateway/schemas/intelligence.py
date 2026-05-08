from pydantic import BaseModel
from typing import List, Optional

class MarketSentimentResponse(BaseModel):
    coin_symbol: str
    overall_sentiment: str  # e.g., "Bullish", "Bearish", "Neutral"
    sentiment_score: float  # 0.0 to 1.0
    article_count: int
    summary: str

class SentimentDetail(BaseModel):
    title: str
    sentiment: str
    score: float
    source: str
