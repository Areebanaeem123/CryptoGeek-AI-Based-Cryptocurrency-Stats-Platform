"""
Verification script for the Autonomous Daily Brief Generator.
"""

import asyncio
import logging
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from step5_llm_intelligence.report_service import MarketReportService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_daily_brief():
    service = MarketReportService()
    
    logger.info("Generating Autonomous Daily Brief...")
    logger.info("This involves multiple DB queries and an LLM synthesis step...")
    
    try:
        report = await service.generate_daily_brief()
        
        print("\n" + "="*80)
        print(f"MARKET INTELLIGENCE REPORT - {report['timestamp'].strftime('%Y-%m-%d %H:%M:%S')} UTC")
        print("="*80)
        print(report['report_markdown'])
        print("="*80)
        
        print("\nTOP ASSETS INCLUDED:")
        for asset in report['top_assets'][:5]:
            print(f"- {asset['name']} ({asset['symbol'].upper()}) - Rank: {asset['rank']}")
        print("...")
        
    except Exception as e:
        logger.error(f"Daily Brief generation failed: {e}")

async def main():
    await verify_daily_brief()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Verification failed: {e}")
