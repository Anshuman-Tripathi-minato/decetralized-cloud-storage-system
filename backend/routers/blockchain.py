"""Blockchain Logs Router — Simulated Hyperledger Fabric audit trail."""
from fastapi import APIRouter, Depends, Query
from core.security import get_current_admin
from core.database import get_db
from datetime import datetime

router = APIRouter()


@router.get("/logs")
async def get_blockchain_logs(
    limit: int = Query(50, le=200),
    event_type: str = Query(None),
    admin: dict = Depends(get_current_admin),
):
    db = get_db()
    if not db:
        return {"logs": [], "total": 0}

    query = {}
    if event_type:
        query["event_type"] = event_type

    cursor = db.blockchain_logs.find(query).sort("timestamp", -1).limit(limit)
    logs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("timestamp"), datetime):
            doc["timestamp"] = doc["timestamp"].isoformat()
        logs.append(doc)

    total = await db.blockchain_logs.count_documents(query)
    return {"logs": logs, "total": total}


@router.get("/logs/{tx_hash}")
async def get_log_by_hash(tx_hash: str, admin: dict = Depends(get_current_admin)):
    db = get_db()
    if not db:
        return {"error": "Database unavailable"}

    log = await db.blockchain_logs.find_one({"tx_hash": tx_hash})
    if not log:
        return {"error": "Transaction not found"}

    log["_id"] = str(log["_id"])
    if isinstance(log.get("timestamp"), datetime):
        log["timestamp"] = log["timestamp"].isoformat()
    return log


@router.get("/stats")
async def blockchain_stats(admin: dict = Depends(get_current_admin)):
    db = get_db()
    total_tx = 0
    events: dict = {}

    if db:
        total_tx = await db.blockchain_logs.count_documents({})
        pipeline = [{"$group": {"_id": "$event_type", "count": {"$sum": 1}}}]
        async for doc in db.blockchain_logs.aggregate(pipeline):
            events[doc["_id"]] = doc["count"]

    return {
        "total_transactions": total_tx,
        "latest_block": 14829 + total_tx,
        "channel": "decentrastore-channel",
        "chaincode_version": "v1.0.0",
        "consensus": "RAFT",
        "event_breakdown": events,
    }
