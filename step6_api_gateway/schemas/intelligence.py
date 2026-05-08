from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MarketSentimentResponse(BaseModel):
    coin_symbol: str
    overall_sentiment: str  # e.g., "Bullish", "Bearish", "Neutral"
    sentiment_score: float  # 0.0 to 1.0
    article_count: int
    summary: str

class DailyBriefResponse(BaseModel):
    timestamp: datetime
    report_markdown: str
    top_assets: List[dict]

class SentimentDetail(BaseModel):
    title: str
    sentiment: str
    score: float
    source: str
