"""
RAG Ingestion Sync — pipelines to move news data from PostgreSQL to Vector Store.
"""

import logging
from datetime import datetime, timezone
from typing import List

from sqlalchemy import select, update
from app.db.session import async_session_factory
from app.db.models.news import NewsArticle
from app.services.embeddings import EmbeddingService
from app.services.vector_store import VectorStoreService
from app.core.rag.processor import TextProcessor

logger = logging.getLogger(__name__)


async def sync_news_to_vector_store(limit: int = 50) -> int:
    """
    Fetch un-embedded news from DB, chunk them, generate embeddings,
    and store in FAISS.
    Returns the number of articles processed.
    """
    embedding_service = EmbeddingService()
    vector_store = VectorStoreService()
    processor = TextProcessor()
    
    processed_count = 0
    
    async with async_session_factory() as session:
        # 1. Fetch un-embedded news
        stmt = (
            select(NewsArticle)
            .where(NewsArticle.is_embedded == False)
            .limit(limit)
        )
        result = await session.execute(stmt)
        articles = result.scalars().all()
        
        if not articles:
            logger.info("No un-embedded news articles found.")
            return 0
            
        all_chunks = []
        all_metadata = []
        article_ids = []
        
        for article in articles:
            # 2. Chunk article content (use title + content)
            full_text = f"{article.title}. {article.content or ''}"
            chunks = processor.chunk_text(full_text)
            
            for i, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_metadata.append({
                    "article_id": article.id,
                    "chunk_id": i,
                    "title": article.title,
                    "url": article.url,
                    "source": article.source,
                    "published_at": article.published_at.isoformat() if article.published_at else None,
                    "text": chunk  # Store text in metadata for retrieval retrieval
                })
            
            article_ids.append(article.id)
            processed_count += 1
            
        if all_chunks:
            try:
                # 3. Generate embeddings
                logger.info(f"Generating embeddings for {len(all_chunks)} chunks...")
                embeddings = await embedding_service.get_embeddings(all_chunks)
                
                # 4. Store in FAISS
                vector_store.add_documents(embeddings, all_metadata)
                
                # 5. Update is_embedded flag in DB
                update_stmt = (
                    update(NewsArticle)
                    .where(NewsArticle.id.in_(article_ids))
                    .values(is_embedded=True)
                )
                await session.execute(update_stmt)
                await session.commit()
                
                logger.info(f"✅ Successfully synced {processed_count} articles ({len(all_chunks)} chunks) to vector store.")
            except Exception as e:
                logger.error(f"Error during RAG sync: {e}")
                await session.rollback()
                processed_count = 0
                
    return processed_count
