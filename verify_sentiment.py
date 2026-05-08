"""
Verification script for the AI Sentiment Insight Engine.
"""

import asyncio
import logging
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from step1_data_ingestion.tasks import sync_news
from step2_db_storage.session import async_session_factory
from step2_db_storage.models.news import NewsArticle
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_sentiment():
    # 1. Sync news and analyze sentiment
    logger.info("Step 1: Running news sync with AI sentiment analysis...")
    count = await sync_news()
    logger.info(f"Synced {count} new articles.")
    
    # 2. Check DB for sentiment data
    async with async_session_factory() as session:
        stmt = select(NewsArticle).order_by(NewsArticle.created_at.desc()).limit(5)
        result = await session.execute(stmt)
        articles = result.scalars().all()
        
        print("\n" + "="*80)
        print(f"{'TITLE':<50} | {'SENTIMENT':<10} | {'SCORE':<5}")
        print("-" * 80)
        for a in articles:
            sentiment = a.sentiment or "N/A"
            score = f"{a.sentiment_score:.2f}" if a.sentiment_score is not None else "N/A"
            print(f"{a.title[:49]:<50} | {sentiment:<10} | {score:<5}")
        print("="*80 + "\n")

    # 3. Simulate API call for aggregation
    # We can't easily call the API without a running server, but we can call the service logic
    from step6_api_gateway.routes.intelligence import get_coin_sentiment
    
    logger.info("Step 2: Testing Aggregated Sentiment for BTC...")
    async with async_session_factory() as session:
        res = await get_coin_sentiment("BTC", session)
        print(f"BTC Pulse: {res.overall_sentiment} (Score: {res.sentiment_score:.2f})")
        print(f"Summary: {res.summary}\n")

    logger.info("Step 3: Testing Aggregated Sentiment for ETH...")
    async with async_session_factory() as session:
        res = await get_coin_sentiment("ETH", session)
        print(f"ETH Pulse: {res.overall_sentiment} (Score: {res.sentiment_score:.2f})")
        print(f"Summary: {res.summary}\n")

async def main():
    await verify_sentiment()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Verification failed: {e}")
