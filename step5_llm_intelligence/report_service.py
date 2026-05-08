"""
ReportService — generates professional market intelligence reports.
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from sqlalchemy import select, func
from step2_db_storage.session import async_session_factory
from step2_db_storage.models.coin import Coin
from step2_db_storage.models.market_data import MarketData
from step2_db_storage.models.news import NewsArticle
from step5_llm_intelligence.groq_client import GroqService

logger = logging.getLogger(__name__)

class MarketReportService:
    """Service to synthesize market data and news into intelligence reports."""

    def __init__(self):
        self.llm = GroqService()

    async def generate_daily_brief(self) -> Dict[str, Any]:
        """
        Generates a comprehensive Daily Brief report.
        1. Gathers Top 10 coins and price data.
        2. Gathers Top news and sentiment.
        3. Uses Groq to synthesize into a 'Hedge Fund' style report.
        """
        logger.info("Generating Daily Brief report...")

        async with async_session_factory() as session:
            # 1. Fetch Top 10 Coins by Market Cap Rank
            # Joining Coin and MarketData
            stmt = (
                select(Coin.symbol, Coin.name, MarketData.market_cap_rank, MarketData.market_cap_usd)
                .join(MarketData, Coin.id == MarketData.coin_id)
                .order_by(MarketData.market_cap_rank.asc())
                .limit(10)
            )
            result = await session.execute(stmt)
            top_coins = result.all()

            # 2. Fetch Recent High-Impact News (Bullish/Bearish)
            news_stmt = (
                select(NewsArticle.title, NewsArticle.sentiment, NewsArticle.sentiment_score)
                .order_by(NewsArticle.created_at.desc())
                .limit(10)
            )
            news_result = await session.execute(news_stmt)
            latest_news = news_result.all()

        # 3. Formulate Data Strings for LLM
        coins_str = "\n".join([f"- {c.name} ({c.symbol.upper()}): Rank #{c.market_cap_rank}" for c in top_coins])
        news_str = "\n".join([f"- {n.title} (Sentiment: {n.sentiment}, Score: {n.sentiment_score})" for n in latest_news])

        # 4. LLM Synthesis
        system_prompt = f"""
You are a Senior Strategic Analyst at a top-tier Crypto Hedge Fund.
Your task is to provide a "Daily Brief" for the Investment Committee.

FORMAT:
1. Executive Summary: Overarching market vibe.
2. Market Dynamics: Analysis of the Top 10 movements.
3. Narrative & Sentiment: How the news is shaping the market.

TONE: 
- Professional, analytical, and data-driven.
- Avoid hype or slang. 
- Use financial terminology (e.g., "Liquidity," "Institutional Momentum," "Risk-off sentiment").

DATA AS OF {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC:
### TOP MARKET ASSETS:
{coins_str}

### RECENT INTELLIGENCE:
{news_str}
"""

        prompt = "Synthesize this data into a 3-paragraph executive daily brief."
        
        report_content = await self.llm.generate_response(prompt=prompt, system_prompt=system_prompt)

        return {
            "timestamp": datetime.now(timezone.utc),
            "report_markdown": report_content or "Failed to generate report.",
            "top_assets": [{"symbol": c.symbol, "name": c.name, "rank": c.market_cap_rank} for c in top_coins]
        }
