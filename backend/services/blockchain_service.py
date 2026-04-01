from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime
from typing import Any, Dict

EVENT_CATEGORY_ALIASES = {
    "node_registered": "register",
    "registered": "register",
    "register": "register",
    "upload": "upload",
    "file_uploaded": "upload",
    "upload_charge": "upload",
    "chunk_uploaded": "upload",
    "download": "download",
    "file_downloaded": "download",
    "pledge": "pledge",
    "storage_pledged": "pledge",
    "storage_pledge": "pledge",
    "reward": "reward",
    "signup_reward": "reward",
    "storage_daily_reward": "reward",
    "upload_hosting_reward": "reward",
    "reward_distributed": "reward",
    "delete": "delete",
    "file_deleted": "delete",
    "chunk_deleted": "delete",
}


def normalize_blockchain_event_category(event_type: str | None) -> str:
    if not event_type:
        return "unknown"

    normalized = event_type.strip().lower().replace(" ", "_")
    return EVENT_CATEGORY_ALIASES.get(normalized, normalized)


async def record_blockchain_event(
    db,
    event_type: str,
    node_id: str,
    metadata: Dict[str, Any] | None = None,
    status: str = "VALID",
) -> Dict[str, Any]:
    metadata = metadata or {}
    event_category = normalize_blockchain_event_category(event_type)

    tx_data = {
        "event_type": event_type,
        "event_category": event_category,
        "node_id": node_id,
        "metadata": metadata,
        "timestamp": datetime.utcnow().isoformat(),
        "nonce": str(uuid.uuid4()),
    }
    tx_hash = hashlib.sha256(json.dumps(tx_data, sort_keys=True).encode()).hexdigest()
    next_block = await db.blockchain_logs.count_documents({}) + 1

    doc = {
        "tx_hash": tx_hash,
        "event_type": event_type,
        "event_category": event_category,
        "node_id": node_id,
        "metadata": metadata,
        "block_number": next_block,
        "block_height": next_block,
        "channel": "decentrastore-channel",
        "chaincode": "storage-contract",
        "timestamp": datetime.utcnow(),
        "status": status,
    }
    await db.blockchain_logs.insert_one(doc)
    return doc
