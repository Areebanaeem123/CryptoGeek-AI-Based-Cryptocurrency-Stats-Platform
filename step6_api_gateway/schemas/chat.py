from pydantic import BaseModel, Field
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str = Field(..., description="User message to the chatbot")
    session_id: Optional[str] = Field(None, description="Optional session ID for conversation tracking")

class ChatSource(BaseModel):
    title: str
    url: Optional[str] = None
    source: Optional[str] = None
    score: float

class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource]
