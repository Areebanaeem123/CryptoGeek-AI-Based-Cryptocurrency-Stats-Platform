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

logger = logging.getLogger(__name__)

class MarketReportService:
    """Service to synthesize market data and news into intelligence reports."""

    def __init__(self):
        from step5_llm_intelligence.groq_client import GroqService
        self.llm = GroqService()

    async def generate_daily_brief(self, save_to_db: bool = True) -> Dict[str, Any]:
        """
        Generates a comprehensive Daily Brief report.
        """
        logger.info("Generating Daily Brief report...")

        async with async_session_factory() as session:
            # 1. Fetch Top 10 Coins
            stmt = (
                select(Coin.symbol, Coin.name, MarketData.market_cap_rank, MarketData.market_cap_usd)
                .join(MarketData, Coin.id == MarketData.coin_id)
                .order_by(MarketData.market_cap_rank.asc())
                .limit(10)
            )
            result = await session.execute(stmt)
            top_coins = result.all()

            # 2. Fetch Recent News
            news_stmt = (
                select(NewsArticle.title, NewsArticle.sentiment, NewsArticle.sentiment_score)
                .order_by(NewsArticle.created_at.desc())
                .limit(10)
            )
            news_result = await session.execute(news_stmt)
            latest_news = news_result.all()

        # 3. Formulate LLM Prompt
        coins_str = "\n".join([f"- {c.name} ({c.symbol.upper()}): Rank #{c.market_cap_rank}" for c in top_coins])
        news_str = "\n".join([f"- {n.title} (Sentiment: {n.sentiment}, Score: {n.sentiment_score})" for n in latest_news])

        system_prompt = f"""
You are a Senior Strategic Analyst at a top-tier Crypto Hedge Fund. 
Your task is to provide a "Daily Brief" for the Investment Committee. 
Tone: Professional, analytical, and data-driven. 
DATA AS OF {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC:
### TOP MARKET ASSETS:
{coins_str}
### RECENT INTELLIGENCE:
{news_str}
"""
        prompt = (
            "Synthesize this data into an executive daily brief in Markdown.\n"
            "You MUST structure your response with EXACTLY these three headers:\n"
            "### Market Overview\n"
            "### Key Trends\n"
            "### Strategic Recommendations"
        )
        report_content = await self.llm.generate_response(prompt=prompt, system_prompt=system_prompt)

        # 4. Save to Database
        report_data = {
            "timestamp": datetime.now(timezone.utc),
            "report_markdown": report_content or "Failed to generate report.",
            "top_assets": [{"symbol": c.symbol, "name": c.name, "rank": c.market_cap_rank} for c in top_coins]
        }

        if save_to_db and report_content:
            from step2_db_storage.models.report import MarketReport
            async with async_session_factory() as session:
                new_report = MarketReport(
                    report_type="daily_brief",
                    content=report_content,
                    metadata_json={"top_assets": report_data["top_assets"]}
                )
                session.add(new_report)
                await session.commit()
                logger.info("✅ Daily Brief saved to database.")

        return report_data

    async def get_latest_report(self) -> Optional[Dict[str, Any]]:
        """Retrieves the most recent report from the database."""
        from step2_db_storage.models.report import MarketReport
        async with async_session_factory() as session:
            stmt = select(MarketReport).order_by(MarketReport.created_at.desc()).limit(1)
            result = await session.execute(stmt)
            report = result.scalar_one_or_none()
            
            if report:
                return {
                    "timestamp": report.created_at,
                    "report_markdown": report.content,
                    "top_assets": report.metadata_json.get("top_assets", []) if report.metadata_json else []
                }
        return None
