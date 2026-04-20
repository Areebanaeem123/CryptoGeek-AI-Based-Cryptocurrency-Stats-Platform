"""
Verification script for Phase 2: RAG System.
Creates mock news, syncs to vector store, and tests retrieval.
"""

import asyncio
import logging
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.db.session import async_session_factory
from app.db.models.news import NewsArticle
from app.ingestion.rag_sync import sync_news_to_vector_store
from app.services.embeddings import EmbeddingService
from app.services.vector_store import VectorStoreService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MOCK_NEWS = [
    {
        "title": "Bitcoin Hits New All-Time High Above $90,000",
        "content": "The world's largest cryptocurrency, Bitcoin, has surged past the $90,000 mark for the first time in history. Analysts point to increased institutional adoption and the approval of spot ETFs as primary drivers for this bullish momentum. Investors are optimistic about the future of decentralized finance.",
        "url": "https://example.com/btc-90k",
        "source": "Mock News"
    },
    {
        "title": "Ethereum's Shanghai Upgrade Successfully Completed",
        "content": "Ethereum developers have successfully executed the Shanghai upgrade, allowing users to withdraw their staked ETH. This move marks a significant milestone in Ethereum's transition to proof-of-stake and is expected to enhance network liquidity and security.",
        "url": "https://example.com/eth-shanghai",
        "source": "Mock News"
    },
    {
        "title": "Solana Experiences Network Outage Amid High Volume",
        "content": "The Solana network went offline for several hours today due to a surge in transaction volume from a popular NFT mint. This is the third time this year that the high-performance blockchain has faced stability issues, raising concerns about its long-term reliability.",
        "url": "https://example.com/sol-outage",
        "source": "Mock News"
    }
]

async def create_mock_news():
    async with async_session_factory() as session:
        for item in MOCK_NEWS:
            # Check if exists
            stmt = select(NewsArticle).where(NewsArticle.title == item["title"])
            res = await session.execute(stmt)
            if res.scalar_one_or_none():
                continue
                
            article = NewsArticle(
                title=item["title"],
                content=item["content"],
                url=item["url"],
                source=item["source"],
                is_embedded=False
            )
            session.add(article)
        await session.commit()
    logger.info("Created mock news articles.")

async def test_retrieval(query: str):
    embedding_service = EmbeddingService()
    vector_store = VectorStoreService()
    
    logger.info(f"Searching for: '{query}'")
    query_embedding = await embedding_service.get_query_embedding(query)
    results = vector_store.similarity_search(query_embedding, k=2)
    
    logger.info(f"Found {len(results)} results:")
    for i, res in enumerate(results):
        logger.info(f"Result {i+1} (Score: {res['score']:.4f}):")
        logger.info(f"Title: {res['title']}")
        logger.info(f"Text: {res['text'][:100]}...")
        logger.info("-" * 20)

async def main():
    # 1. Create mock data
    await create_mock_news()
    
    # 2. Sync to vector store (No API key needed for local embeddings)
    await sync_news_to_vector_store()
    
    # 3. Test retrieval
    await test_retrieval("What happened with Bitcoin price today?")
    await test_retrieval("Is Ethereum network more secure now?")
    await test_retrieval("Why did Solana go offline?")

if __name__ == "__main__":
    import os
    # Suppress the "Event loop is closed" RuntimeError on Windows
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    try:
        asyncio.run(main())
    except (RuntimeError, KeyboardInterrupt):
        # Silently ignore the cleanup error at exit
        pass
