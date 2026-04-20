"""
AI Crypto Intelligence Copilot — FastAPI Application Entry Point

Creates the FastAPI app with CORS, lifespan, and router registration.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Lifespan ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    logger.info("🚀 Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)

    # Start the ingestion scheduler
    from app.ingestion.scheduler import start_scheduler, stop_scheduler
    start_scheduler()
    logger.info("📡 Ingestion scheduler started")

    yield  # ← app is running

    stop_scheduler()
    logger.info("🛑 Shutdown complete")


# ── App Factory ─────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    """Build and return the FastAPI application."""
    _app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "AI-powered Crypto Intelligence Copilot — "
            "Real-time market data, news, RAG-based insights, and predictive analytics."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    _app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Logging
    logging.basicConfig(
        level=settings.LOG_LEVEL,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )

    # ── Register routers ────────────────────────────────────────────────
    from app.api.routes.health import router as health_router
    from app.api.routes.coins import router as coins_router
    from app.api.routes.market import router as market_router
    from app.api.routes.news import router as news_router
    from app.api.routes.ingestion import router as ingestion_router

    _app.include_router(health_router)
    _app.include_router(coins_router, prefix="/api/v1")
    _app.include_router(market_router, prefix="/api/v1")
    _app.include_router(news_router, prefix="/api/v1")
    _app.include_router(ingestion_router, prefix="/api/v1")

    return _app


app = create_app()
