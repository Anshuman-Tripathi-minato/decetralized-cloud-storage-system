"""Blockchain Logs Router — audit trail endpoints."""
from fastapi import APIRouter, Depends, Query
from backend.core.security import get_current_admin
from backend.core.database import get_db
from datetime import datetime
from backend.services.blockchain_service import normalize_blockchain_event_category

router = APIRouter()


@router.get("/logs")
async def get_blockchain_logs(
    limit: int = Query(50, le=200),
    event_type: str = Query(None),
    admin: dict = Depends(get_current_admin),
):
    db = get_db()
    if db is None:
        return {"logs": [], "total": 0}

    query = {}
    if event_type:
        normalized_event_type = event_type.strip().lower()
        if normalized_event_type == "all":
            pass
        else:
            query = {
                "$or": [
                    {"event_category": normalize_blockchain_event_category(event_type)},
                    {"event_type": event_type},
                ]
            }

    cursor = db.blockchain_logs.find(query).sort("timestamp", -1).limit(limit)
    logs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["event_category"] = doc.get("event_category") or normalize_blockchain_event_category(doc.get("event_type"))
        if isinstance(doc.get("timestamp"), datetime):
            doc["timestamp"] = doc["timestamp"].isoformat()
        logs.append(doc)

    total = await db.blockchain_logs.count_documents(query)
    return {"logs": logs, "total": total}


@router.get("/logs/{tx_hash}")
async def get_log_by_hash(tx_hash: str, admin: dict = Depends(get_current_admin)):
    db = get_db()
    if db is None:
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
    latest_block = 0
    channel = "unknown"
    chaincode_version = "unknown"
    consensus = "unknown"

    if db is not None:
        total_tx = await db.blockchain_logs.count_documents({})
        pipeline = [{"$group": {"_id": "$event_category", "count": {"$sum": 1}}}]
        async for doc in db.blockchain_logs.aggregate(pipeline):
            events[doc["_id"]] = doc["count"]

        if not events:
            legacy_pipeline = [{"$group": {"_id": "$event_type", "count": {"$sum": 1}}}]
            async for doc in db.blockchain_logs.aggregate(legacy_pipeline):
                events[normalize_blockchain_event_category(doc["_id"])] = events.get(normalize_blockchain_event_category(doc["_id"]), 0) + doc["count"]

        latest_log = await db.blockchain_logs.find_one({}, sort=[("block_number", -1)])
        if latest_log:
            latest_block = latest_log.get("block_number") or latest_log.get("block_height") or 0
            channel = latest_log.get("channel", "unknown")
            chaincode_version = latest_log.get("chaincode_version") or latest_log.get("chaincode") or "unknown"
            consensus = latest_log.get("consensus", "unknown")

    return {
        "total_transactions": total_tx,
        "latest_block": latest_block,
        "channel": channel,
        "chaincode_version": chaincode_version,
        "consensus": consensus,
        "event_breakdown": events,
    }
