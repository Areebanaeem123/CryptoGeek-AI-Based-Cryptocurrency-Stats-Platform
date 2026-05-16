"""
APScheduler-based ingestion scheduler.

Runs background jobs to keep crypto data fresh:
  • Coin list:   every 24 h
  • Prices:      every 5 min
  • Market data: every 15 min
"""

import asyncio
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_scheduler: BackgroundScheduler | None = None


def _run_async(coro):
    """Helper to run an async coroutine from a sync APScheduler callback."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(coro)
        else:
            loop.run_until_complete(coro)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(coro)


def _job_sync_coins():
    from step1_data_ingestion.tasks import sync_coin_list
    logger.info("⏰ Scheduled: sync_coin_list")
    _run_async(sync_coin_list())


def _job_sync_prices():
    from step1_data_ingestion.tasks import sync_prices
    logger.info("⏰ Scheduled: sync_prices")
    _run_async(sync_prices())


def _job_sync_market_data():
    from step1_data_ingestion.tasks import sync_market_data
    logger.info("⏰ Scheduled: sync_market_data")
    _run_async(sync_market_data())


def _job_sync_rag():
    from step4_rag_vector_store.rag_sync import sync_news_to_vector_store
    logger.info("⏰ Scheduled: sync_news_to_vector_store")
    _run_async(sync_news_to_vector_store())


def _job_sync_news():
    from step1_data_ingestion.tasks import sync_news
    logger.info("⏰ Scheduled: sync_news")
    _run_async(sync_news())


def _job_daily_brief():
    from step1_data_ingestion.tasks import generate_daily_brief_task
    logger.info("⏰ Scheduled: generate_daily_brief_task")
    _run_async(generate_daily_brief_task())


def start_scheduler() -> None:
    """Create and start the background scheduler."""
    global _scheduler

    if _scheduler is not None:
        logger.warning("Scheduler already running")
        return

    _scheduler = BackgroundScheduler()

    # Coin list — every 24 hours
    _scheduler.add_job(
        _job_sync_coins,
        trigger=IntervalTrigger(seconds=settings.COIN_LIST_SYNC_INTERVAL),
        id="sync_coins",
        name="Sync coin list",
        replace_existing=True,
    )

    # Prices — every 5 minutes
    _scheduler.add_job(
        _job_sync_prices,
        trigger=IntervalTrigger(seconds=settings.PRICE_SYNC_INTERVAL),
        id="sync_prices",
        name="Sync prices",
        replace_existing=True,
    )

    # Market data — every 15 minutes
    _scheduler.add_job(
        _job_sync_market_data,
        trigger=IntervalTrigger(seconds=settings.MARKET_SYNC_INTERVAL),
        id="sync_market_data",
        name="Sync market data",
        replace_existing=True,
    )

    # News — every 10 minutes
    _scheduler.add_job(
        _job_sync_news,
        trigger=IntervalTrigger(seconds=settings.NEWS_SYNC_INTERVAL),
        id="sync_news",
        name="Sync news and sentiment",
        replace_existing=True,
    )

    # RAG sync — every 10 minutes (offset by 1 min)
    _scheduler.add_job(
        _job_sync_rag,
        trigger=IntervalTrigger(seconds=settings.NEWS_SYNC_INTERVAL + 60),
        id="sync_rag",
        name="Sync RAG vector store",
        replace_existing=True,
    )

    # Daily Brief — every 24 hours
    _scheduler.add_job(
        _job_daily_brief,
        trigger=IntervalTrigger(seconds=86400), # 24 hours
        id="daily_brief",
        name="Generate daily market report",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("📅 Scheduler started with %d jobs", len(_scheduler.get_jobs()))


def stop_scheduler() -> None:
    """Shut down the scheduler gracefully."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("📅 Scheduler stopped")
