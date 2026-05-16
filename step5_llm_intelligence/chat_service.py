"""
ChatService — orchestrates RAG flow for conversational AI.
"""

import logging
from typing import List, Dict, Any, Optional

from core.config import get_settings
from step5_llm_intelligence.groq_client import GroqService

logger = logging.getLogger(__name__)
settings = get_settings()

class ChatService:
    """Service to handle RAG-powered chat queries."""

    def __init__(self):
        from step3_ai_embeddings.embeddings import EmbeddingService
        from step4_rag_vector_store.vector_store import VectorStoreService
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStoreService()
        self.llm = GroqService()

    async def get_chat_response(self, query: str) -> Dict[str, Any]:
        """
        Processes a user query through the RAG pipeline.
        1. Embed query
        2. Retrieve context from FAISS
        3. Formulate prompt with context
        4. Get response from Groq
        """
        logger.info(f"Processing chat query: {query}")

        # 1. Embed query
        query_embedding = await self.embedding_service.get_query_embedding(query)

        # 2. Retrieve relevant context (Top 5 matches)
        context_docs = self.vector_store.similarity_search(query_embedding, k=5)
        
        # 3. Construct Context String
        context_text = ""
        sources = []
        for doc in context_docs:
            context_text += f"\n---\nSource: {doc['title']}\nContent: {doc['text']}\n"
            sources.append({
                "title": doc['title'],
                "url": doc.get('url'),
                "source": doc.get('source'),
                "score": doc.get('score')
            })

        # 4. Formulate System Prompt
        system_prompt = f"""
You are a highly intelligent Crypto Intelligence Assistant. 
Use the provided news context to answer the user's question accurately.
If the answer is not in the context, use your general knowledge but clearly state that it is not from the current news data.
Always be professional, concise, and data-backed.

### LATEST NEWS CONTEXT:
{context_text}
"""

        # 5. Get LLM Response
        response = await self.llm.generate_response(prompt=query, system_prompt=system_prompt)

        return {
            "answer": response or "I'm sorry, I couldn't generate a response at this time.",
            "sources": sources
        }
