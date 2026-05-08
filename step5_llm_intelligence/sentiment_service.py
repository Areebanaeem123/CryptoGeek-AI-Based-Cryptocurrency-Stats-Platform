"""
SentimentService — classifies news sentiment using Groq LLM.
"""

import logging
import json
import re
from typing import Dict, Any, Optional

from step5_llm_intelligence.groq_client import GroqService

logger = logging.getLogger(__name__)

class SentimentService:
    """Service to analyze crypto news sentiment."""

    def __init__(self):
        self.llm = GroqService()

    async def analyze_sentiment(self, title: str, content: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze the sentiment of a news article.
        Returns: {"sentiment": "Bullish"|"Bearish"|"Neutral", "score": 0.0-1.0}
        """
        text_to_analyze = f"Title: {title}\nContent: {content or ''}"
        
        system_prompt = """
You are a Crypto Market Analyst. Analyze the sentiment of the provided news article.
Classify it as one of: [Bullish, Bearish, Neutral].
Provide a sentiment score between 0.0 (extremely bearish) and 1.0 (extremely bullish). 
A neutral score should be around 0.5.

Return ONLY a JSON object in this format:
{"sentiment": "Bullish", "score": 0.85}
"""

        try:
            response_text = await self.llm.generate_response(
                prompt=f"Analyze this news:\n{text_to_analyze}",
                system_prompt=system_prompt
            )
            
            if not response_text:
                return {"sentiment": "Neutral", "score": 0.5}

            # Extract JSON from response (handling potential markdown formatting)
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    "sentiment": result.get("sentiment", "Neutral"),
                    "score": float(result.get("score", 0.5))
                }
            
            return {"sentiment": "Neutral", "score": 0.5}
            
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return {"sentiment": "Neutral", "score": 0.5}
