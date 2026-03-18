"""
DecentraStore FastAPI Backend — Sprint 1: Foundation
Orchestrator for the Decentralized Cloud Storage System
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.core.database import connect_db, disconnect_db
from backend.services.docker_service import get_docker_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 DecentraStore Orchestrator starting...")
    await connect_db()
    
    # Initialize Docker service
    docker_service = get_docker_service()
    if docker_service.is_available():
        logger.info("✅ Docker service initialized")
        containers = docker_service.list_storage_containers()
        logger.info(f"📦 Found {len(containers)} existing storage containers")
    else:
        logger.warning("⚠️  Docker daemon not available - container features disabled")
    
    logger.info("✅ System ready")
    yield
    logger.info("🛑 Shutting down DecentraStore Orchestrator...")
    await disconnect_db()


# ── App factory ───────────────────────────────────────────────────────
app = FastAPI(
    title="DecentraStore API",
    description="Orchestrator backend for the DecentraStore Decentralized Cloud Storage System.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers (imported progressively per sprint) ───────────────────────
from backend.routers import health, auth, storage, files, admin, network, blockchain

app.include_router(health.router,     prefix="/api",           tags=["Health"])
app.include_router(auth.router,       prefix="/api/auth",      tags=["Authentication"])
app.include_router(storage.router,    prefix="/api/storage",   tags=["Storage Node"])
app.include_router(files.router,      prefix="/api/files",     tags=["Files"])
app.include_router(admin.router,      prefix="/api/admin",     tags=["Admin"])
app.include_router(network.router,    prefix="/api/network",   tags=["Network"])
app.include_router(blockchain.router, prefix="/api/blockchain",tags=["Blockchain"])
