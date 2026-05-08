"""
TextProcessor — handles news text cleaning and chunking for RAG.
"""

import re
import logging
from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class TextProcessor:
    """Processor to clean and chunk news articles."""

    def __init__(self):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ".", " ", ""]
        )

    def clean_text(self, text: str) -> str:
        """
        Basic text cleaning: remove extra whitespace, HTML tags, etc.
        """
        if not text:
            return ""
        
        # Remove HTML tags if any
        text = re.sub(r'<[^>]*>', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text

    def chunk_text(self, text: str) -> List[str]:
        """
        Split a long text into smaller chunks.
        """
        cleaned = self.clean_text(text)
        if not cleaned:
            return []
            
        return self.splitter.split_text(cleaned)
