"""
GroqService — wrapper for Groq's high-speed inference API.
"""

import logging
from typing import List, Dict, Any, Optional

from groq import AsyncGroq
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GroqService:
    """Service to interact with Groq LLMs."""

    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL

    async def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 1024,
        stream: bool = False
    ) -> Optional[str]:
        """
        Get a chat completion response from Groq.
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=stream
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return None

    async def generate_response(self, prompt: str, system_prompt: str = "You are a helpful assistant.") -> Optional[str]:
        """
        Simple wrapper for a single prompt.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        return await self.chat_completion(messages)
