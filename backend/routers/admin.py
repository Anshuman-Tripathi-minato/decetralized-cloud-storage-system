"""Admin Router — Sprint 5 stub."""
from fastapi import APIRouter, Depends
from backend.core.security import get_current_admin
from backend.core.database import get_db
from datetime import datetime

router = APIRouter()


async def _resolve_fallback_storage_nodes(db, file_doc: dict):
    """Fallback node mapping for legacy files without storage_nodes field."""
    sample_chunk = await db.chunks.find_one({"cid": file_doc.get("cid")}, {"_id": 0, "replicas": 1})
    chunk_replicas = (sample_chunk or {}).get("replicas") or []
    if chunk_replicas:
        return chunk_replicas

    owner_node_id = file_doc.get("owner_node_id")
    if not owner_node_id:
        return []

    owner = await db.users.find_one(
        {"node_id": owner_node_id},
        {"_id": 0, "node_id": 1, "ip_address": 1, "region": 1, "is_active": 1},
    )
    if not owner:
        return []

    return [{
        "node_id": owner.get("node_id"),
        "ip_address": owner.get("ip_address") or "N/A",
        "region": owner.get("region") or "Unknown",
        "is_active": bool(owner.get("is_active", False)),
    }]


@router.get("/stats")
async def network_stats(admin: dict = Depends(get_current_admin)):
    db = get_db()
    total_nodes = total_files = total_chunks = 0
    total_storage_bytes = 0
    active_nodes = 0
    avg_latency = 0
    uptime = 0
    regions = 0
    failed_requests = 0
    throughput = 0
    last_block = 0
    
    if db is not None:
        total_nodes = await db.users.count_documents({})
        active_nodes = await db.users.count_documents({"is_active": True})
        total_files = await db.files.count_documents({})
        total_chunks = await db.chunks.count_documents({})
        
        # Calculate total storage
        pipeline = [
            {"$group": {"_id": None, "total_size": {"$sum": "$size"}}}
        ]
        async for doc in db.files.aggregate(pipeline):
            total_storage_bytes = doc.get("total_size", 0)

        latency_pipeline = [
            {"$match": {"avg_latency_ms": {"$exists": True}}},
            {"$group": {"_id": None, "avg_latency": {"$avg": "$avg_latency_ms"}}}
        ]
        async for doc in db.users.aggregate(latency_pipeline):
            avg_latency = round(doc.get("avg_latency", 0) or 0)

        regions = len(await db.users.distinct("region", {"region": {"$nin": [None, ""]}}))
        failed_requests = await db.api_errors.count_documents({}) if "api_errors" in await db.list_collection_names() else 0
        throughput = await db.chunks.count_documents({"uploaded_at": {"$gte": datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)}})

        latest_log = await db.blockchain_logs.find_one(
            {},
            sort=[("block_number", -1)]
        )
        if latest_log:
            last_block = latest_log.get("block_number") or latest_log.get("block_height") or 0

    pledged_storage_bytes = 0
    if db is not None:
        pledge_pipeline = [{"$group": {"_id": None, "total_pledged": {"$sum": "$storage_pledged"}}}]
        async for doc in db.users.aggregate(pledge_pipeline):
            pledged_storage_bytes = doc.get("total_pledged", 0)

    storage_utilization = round((total_storage_bytes / pledged_storage_bytes) * 100, 1) if pledged_storage_bytes > 0 else 0
    uptime = round((active_nodes / total_nodes) * 100, 2) if total_nodes > 0 else 0
    network_health = "Healthy" if active_nodes > 0 else "No Data"
    
    return {
        "total_nodes": total_nodes,
        "active_nodes": active_nodes,
        "total_files": total_files,
        "total_chunks": total_chunks,
        "total_storage": total_storage_bytes,
        "storage_utilization": storage_utilization,
        "network_health": network_health,
        "uptime": uptime,
        "active_peers": active_nodes,
        "avg_latency": avg_latency,
        "throughput": throughput,
        "failed_requests": failed_requests,
        "regions": regions,
        "last_block": last_block,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/nodes")
async def list_nodes(admin: dict = Depends(get_current_admin)):
    db = get_db()
    if db is None:
        return {"nodes": []}
    cursor = db.users.find({}, {"keystore_encrypted": 0}).sort("registered_at", -1).limit(50)
    nodes = []
    async for doc in cursor:
        node_id = doc.get("node_id")
        if node_id:
            doc["files_stored"] = await db.files.count_documents({"owner_node_id": node_id})
            doc["chunks_stored"] = await db.chunks.count_documents({"replicas.node_id": node_id})
            pledged_bytes = doc.get("storage_pledged", 0) or 0
            doc["storage_pledged_gb"] = doc.get("storage_pledged_gb") or round(pledged_bytes / (1024 ** 3), 2)
        doc["_id"] = str(doc["_id"])
        nodes.append(doc)
    return {"nodes": nodes}


@router.get("/storage-distribution")
async def admin_storage_distribution(limit: int = 200, admin: dict = Depends(get_current_admin)):
    """Full admin view of which file is mapped to which nodes (IDs + IPs)."""
    db = get_db()
    if db is None:
        return {
            "summary": {
                "total_files": 0,
                "total_owner_nodes": 0,
                "total_storage_nodes": 0,
                "active_storage_nodes": 0,
            },
            "files": [],
        }

    safe_limit = min(max(limit, 1), 1000)
    cursor = db.files.find(
        {},
        {
            "_id": 0,
            "cid": 1,
            "filename": 1,
            "size": 1,
            "owner_node_id": 1,
            "total_chunks": 1,
            "chunks_uploaded": 1,
            "is_complete": 1,
            "storage_nodes": 1,
            "uploaded_at": 1,
        },
    ).sort("uploaded_at", -1).limit(safe_limit)

    files = []
    owner_nodes = set()
    unique_storage_nodes = {}
    async for file_doc in cursor:
        owner_node_id = file_doc.get("owner_node_id")
        if owner_node_id:
            owner_nodes.add(owner_node_id)

        storage_nodes = file_doc.get("storage_nodes") or []
        if not storage_nodes:
            storage_nodes = await _resolve_fallback_storage_nodes(db, file_doc)
        normalized_nodes = []
        for node in storage_nodes:
            node_id = node.get("node_id")
            if not node_id:
                continue

            normalized_node = {
                "node_id": node_id,
                "ip_address": node.get("ip_address") or "N/A",
                "region": node.get("region") or "Unknown",
                "is_active": bool(node.get("is_active", False)),
            }
            normalized_nodes.append(normalized_node)
            unique_storage_nodes[node_id] = normalized_node

        file_doc["storage_nodes"] = normalized_nodes
        file_doc["replica_count"] = len(normalized_nodes)
        files.append(file_doc)

    active_storage_nodes = sum(1 for node in unique_storage_nodes.values() if node.get("is_active"))

    return {
        "summary": {
            "total_files": len(files),
            "total_owner_nodes": len(owner_nodes),
            "total_storage_nodes": len(unique_storage_nodes),
            "active_storage_nodes": active_storage_nodes,
        },
        "storage_nodes": list(unique_storage_nodes.values()),
        "files": files,
    }


@router.patch("/nodes/{node_id}/ban")
async def ban_node(node_id: str, admin: dict = Depends(get_current_admin)):
    db = get_db()
    if db is not None:
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
