"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
async def health_check():
    """Returns service health status."""
    return {
        "status": "ok",
        "service": "AI Crypto Intelligence Copilot",
        "version": "0.1.0",
    }
