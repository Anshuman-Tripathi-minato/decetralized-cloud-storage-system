"""Network Router — P2P peer data from database."""
from datetime import datetime
from fastapi import APIRouter
from backend.core.database import get_db

router = APIRouter()


def _format_last_seen(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value or "unknown"


@router.get("/peers")
async def get_peers(limit: int = 20):
    """Get real P2P peer list from registered users."""
    db = get_db()
    if db is None:
        return {
            "total_peers": 0,
            "online_peers": 0,
            "degraded_peers": 0,
            "offline_peers": 0,
            "peers": [],
        }

    safe_limit = min(max(limit, 1), 1000)
    cursor = db.users.find({}, {
        "_id": 0,
        "node_id": 1,
        "is_active": 1,
        "last_seen": 1,
        "region": 1,
        "node_type": 1,
        "storage_pledged": 1,
        "storage_pledged_gb": 1,
        "uptime_score": 1,
        "avg_latency_ms": 1,
        "ip_address": 1,
        "is_storage_node": 1,
    }).sort("last_seen", -1).limit(safe_limit)

    peers = []
    async for user in cursor:
        node_id = user.get("node_id")
        files_stored = await db.files.count_documents({"owner_node_id": node_id}) if node_id else 0
        storage_pledged_bytes = user.get("storage_pledged", 0) or 0
        storage_pledged_gb = user.get("storage_pledged_gb")
        if storage_pledged_gb is None:
            storage_pledged_gb = round(storage_pledged_bytes / (1024 ** 3), 2) if storage_pledged_bytes else 0

        status = "online" if user.get("is_active", False) else "offline"
        peers.append({
            "node_id": node_id,
            "ip_address": user.get("ip_address") or "N/A",
            "region": user.get("region") or "Unknown",
            "node_type": user.get("node_type") or ("Storage Node" if user.get("is_storage_node") else "Node"),
            "status": status,
            "latency_ms": int(user.get("avg_latency_ms", 0) or 0),
            "storage_pledged_gb": storage_pledged_gb,
            "files_stored": files_stored,
            "uptime_pct": float(user.get("uptime_score", 0) or 0),
            "last_seen": _format_last_seen(user.get("last_seen")),
        })

    online_peers = sum(1 for peer in peers if peer["status"] == "online")
    offline_peers = len(peers) - online_peers

    return {
        "total_peers": len(peers),
        "online_peers": online_peers,
        "degraded_peers": 0,
        "offline_peers": offline_peers,
        "peers": peers,
    }


@router.get("/topology")
async def get_topology():
    """Get deterministic topology based on current peers."""
    peers_data = await get_peers(limit=200)
    peers = peers_data.get("peers", [])
    nodes = []
    for index, peer in enumerate(peers):
        nodes.append({
            "id": peer.get("node_id") or f"peer_{index}",
            "region": peer.get("region") or "Unknown",
            "latency": peer.get("latency_ms", 0),
            "x": float(index),
            "y": float(index % 10),
            "size": 8,
            "status": peer.get("status", "offline"),
        })

    edges = []
    for index in range(len(nodes) - 1):
        edges.append({"source": nodes[index]["id"], "target": nodes[index + 1]["id"]})

    return {"nodes": nodes, "edges": edges}


@router.get("/metrics/history")
async def metrics_history():
    """Return real network summary and optional historical data."""
    db = get_db()
    if db is None:
        return {
            "interval": "hourly",
            "data": [],
            "active_nodes": 0,
            "total_storage": 0,
            "total_files": 0,
            "uptime": 0,
        }

    total_nodes = await db.users.count_documents({})
    active_nodes = await db.users.count_documents({"is_active": True})
    total_files = await db.files.count_documents({})

    total_storage = 0
    pipeline = [{"$group": {"_id": None, "total_size": {"$sum": "$size"}}}]
    async for doc in db.files.aggregate(pipeline):
        total_storage = doc.get("total_size", 0)

    uptime = round((active_nodes / total_nodes) * 100, 2) if total_nodes else 0

    return {
        "interval": "hourly",
        "data": [],
        "active_nodes": active_nodes,
        "total_storage": total_storage,
        "total_files": total_files,
        "uptime": uptime,
    }
