from fastapi import APIRouter, HTTPException
from step6_api_gateway.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["Chatbot"])
@router.post("/", response_model=ChatResponse)
async def chat_query(request: ChatRequest):
    """
    Send a message to the AI Crypto Intelligence Copilot.
    The response is backed by real-time news data (RAG).
    """
    from step5_llm_intelligence.chat_service import ChatService
    service = ChatService()
    try:
        response = await service.get_chat_response(request.message)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
