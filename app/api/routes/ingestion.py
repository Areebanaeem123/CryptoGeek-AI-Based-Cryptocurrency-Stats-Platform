"""
Ingestion trigger endpoint — manually trigger data sync pipelines.
"""

import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks

from app.ingestion.tasks import (
    run_full_sync,
    sync_coin_list,
    sync_prices,
    sync_market_data,
    enrich_from_cmc,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingestion", tags=["Ingestion"])


@router.post("/trigger", summary="Trigger full data sync")
async def trigger_full_sync(background_tasks: BackgroundTasks):
    """
    Manually trigger a full data ingestion pipeline.
    Runs in the background and returns immediately.
    """
    background_tasks.add_task(_run_sync)
    return {
        "status": "started",
        "message": "Full data sync started in background. Check logs for progress.",
    }


@router.post("/trigger/{task_name}", summary="Trigger a specific sync task")
async def trigger_specific_sync(
    task_name: str,
    background_tasks: BackgroundTasks,
):
    """
    Trigger a specific sync task by name.
    Valid names: coins, prices, market_data, cmc
    """
    task_map = {
        "coins": sync_coin_list,
        "prices": sync_prices,
        "market_data": sync_market_data,
        "cmc": enrich_from_cmc,
    }

    if task_name not in task_map:
        return {
            "status": "error",
            "message": f"Unknown task '{task_name}'. Valid: {list(task_map.keys())}",
        }

    background_tasks.add_task(task_map[task_name])
    return {
        "status": "started",
        "message": f"Task '{task_name}' started in background.",
    }


async def _run_sync():
    """Wrapper to run the async full sync."""
    try:
        results = await run_full_sync()
        logger.info("Manual sync completed: %s", results)
    except Exception as e:
        logger.error("Manual sync failed: %s", e)
