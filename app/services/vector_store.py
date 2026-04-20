"""
VectorStoreService — FAISS-based vector database management.
"""

import os
import logging
import pickle
from typing import List, Dict, Any, Tuple

import faiss
import numpy as np
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class VectorStoreService:
    """Service to manage FAISS vector index and metadata."""

    def __init__(self):
        self.index_path = settings.VECTOR_DB_PATH
        self.index_file = os.path.join(self.index_path, "index.faiss")
        self.metadata_file = os.path.join(self.index_path, "metadata.pkl")
        
        self.index = None
        self.metadata: List[Dict[str, Any]] = []
        
        # Ensure directory exists
        os.makedirs(self.index_path, exist_ok=True)
        
        self.load_index()

    def load_index(self):
        """Load FAISS index and metadata from disk."""
        if os.path.exists(self.index_file) and os.path.exists(self.metadata_file):
            try:
                self.index = faiss.read_index(self.index_file)
                with open(self.metadata_file, "rb") as f:
                    self.metadata = pickle.load(f)
                logger.info(f"Loaded FAISS index with {len(self.metadata)} vectors")
            except Exception as e:
                logger.error(f"Error loading FAISS index: {e}")
                self.index = None
                self.metadata = []

    def save_index(self):
        """Save FAISS index and metadata to disk."""
        if self.index is not None:
            try:
                faiss.write_index(self.index, self.index_file)
                with open(self.metadata_file, "wb") as f:
                    pickle.dump(self.metadata, f)
                logger.info(f"Saved FAISS index with {len(self.metadata)} vectors")
            except Exception as e:
                logger.error(f"Error saving FAISS index: {e}")

    def add_documents(self, embeddings: List[List[float]], metadatas: List[Dict[str, Any]]):
        """
        Add document embeddings and their metadata to the index.
        """
        if not embeddings:
            return

        dim = len(embeddings[0])
        vector_data = np.array(embeddings).astype('float32')

        if self.index is None:
            # Initialize index (IndexFlatL2 for simplicity, can upgrade to IndexIVFFlat for scale)
            self.index = faiss.IndexFlatL2(dim)
        
        self.index.add(vector_data)
        self.metadata.extend(metadatas)
        self.save_index()

    def similarity_search(self, query_embedding: List[float], k: int = 5) -> List[Dict[str, Any]]:
        """
        Perform similarity search and return top k documents with metadata.
        """
        if self.index is None or not query_embedding:
            return []

        query_vector = np.array([query_embedding]).astype('float32')
        distances, indices = self.index.search(query_vector, k)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx != -1 and idx < len(self.metadata):
                res = self.metadata[idx].copy()
                res["score"] = float(dist)
                results.append(res)
        
        return results
