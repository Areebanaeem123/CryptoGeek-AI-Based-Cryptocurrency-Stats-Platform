"""
EmbeddingService — wrapper for OpenAI embeddings API.
"""

import logging
from typing import List

from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmbeddingService:
    """Service to generate vector embeddings using a local SentenceTransformer model."""

    _model = None

    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL
        self._ensure_model_loaded()

    def _ensure_model_loaded(self):
        """Lazy load the model to avoid overhead if not used."""
        if EmbeddingService._model is None:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading local embedding model: {self.model_name}")
            EmbeddingService._model = SentenceTransformer(self.model_name)
            logger.info("Model loaded successfully.")

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts locally.
        """
        if not texts:
            return []

        try:
            import numpy as np
            # Process texts
            processed_texts = [text.replace("\n", " ") for text in texts]
            
            # Generate embeddings (this runs locally on CPU/GPU)
            embeddings = EmbeddingService._model.encode(processed_texts)
            
            # Convert numpy array to list of lists
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embeddings locally: {e}")
            raise

    async def get_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for a single query string.
        """
        embeddings = await self.get_embeddings([query])
        return embeddings[0] if embeddings else []
