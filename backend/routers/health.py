from fastapi import APIRouter
from datetime import datetime
from core.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check():
    """System health endpoint."""
    db = get_db()
    db_status = "connected"
    node_count = 0
    file_count = 0

    if db is not None:
        try:
            node_count = await db.users.count_documents({})
            file_count = await db.files.count_documents({})
        except Exception:
            db_status = "error"
    else:
        db_status = "unavailable"

    return {
        "status": "healthy",
        "service": "DecentraStore Orchestrator",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "network": {
            "registered_nodes": node_count,
            "stored_files": file_count,
            "simulated_peers": 847,
            "protocol": "Hyperledger Fabric v2.5 (simulated)",
        },
    }


@router.get("/")
async def root():
    return {
        "message": "DecentraStore API is running",
        "docs": "/api/docs",
        "health": "/api/health",
    }
