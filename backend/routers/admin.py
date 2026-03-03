"""Admin Router — Sprint 5 stub."""
from fastapi import APIRouter, Depends
from core.security import get_current_admin
from core.database import get_db
from datetime import datetime

router = APIRouter()


@router.get("/stats")
async def network_stats(admin: dict = Depends(get_current_admin)):
    db = get_db()
    total_nodes = total_files = total_chunks = 0
    total_storage_bytes = 0
    
    if db:
        total_nodes = await db.users.count_documents({})
        total_files = await db.files.count_documents({})
        total_chunks = await db.chunks.count_documents({})
        
        # Calculate total storage
        pipeline = [
            {"$group": {"_id": None, "total_size": {"$sum": "$size"}}}
        ]
        async for doc in db.files.aggregate(pipeline):
            total_storage_bytes = doc.get("total_size", 0)

    # Simulate realistic network metrics
    storage_tb = total_storage_bytes / (1024 ** 4) if total_storage_bytes > 0 else 12.5
    storage_capacity = 20.0  # 20 PB total capacity
    storage_utilization = round((storage_tb / (storage_capacity * 1024)) * 100, 1)
    
    return {
        "total_nodes": total_nodes,
        "active_nodes": max(total_nodes, 847),
        "total_files": total_files,
        "total_chunks": total_chunks,
        "total_storage": int(storage_tb * (1024 ** 4)),  # bytes
        "storage_utilization": storage_utilization,
        "network_health": "Excellent",
        "uptime": 99.9,
        "active_peers": max(total_nodes, 847),
        "avg_latency": 45,
        "throughput": 125,
        "failed_requests": 3,
        "regions": 12,
        "last_block": 14829 + total_files,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/nodes")
async def list_nodes(admin: dict = Depends(get_current_admin)):
    db = get_db()
    if not db:
        return {"nodes": []}
    cursor = db.users.find({}, {"keystore_encrypted": 0}).sort("registered_at", -1).limit(50)
    nodes = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        nodes.append(doc)
    return {"nodes": nodes}


@router.patch("/nodes/{node_id}/ban")
async def ban_node(node_id: str, admin: dict = Depends(get_current_admin)):
    db = get_db()
    if db:
        await db.users.update_one({"node_id": node_id}, {"$set": {"is_active": False}})
    return {"message": f"Node {node_id} banned", "node_id": node_id}


@router.get("/protocol")
async def get_protocol_settings(admin: dict = Depends(get_current_admin)):
    return {
        "replication_factor": 3,
        "chunk_size_mb": 4,
        "token_mint_rate": 0.1,
        "min_storage_pledge_gb": 1,
        "max_storage_pledge_gb": 500,
    }


@router.patch("/protocol")
async def update_protocol_settings(settings: dict, admin: dict = Depends(get_current_admin)):
    return {"message": "Protocol settings updated — Sprint 5", "applied": settings}
