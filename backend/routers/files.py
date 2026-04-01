"""Files Router — File Upload, Retrieval, and Management."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from backend.core.security import get_current_user
from backend.core.database import get_db
from backend.services.blockchain_service import record_blockchain_event
from backend.services.provider_agent_service import get_provider_agent_service
from backend.services.token_service import AST_UPLOAD_COST_PER_MB, calculate_upload_cost, apply_daily_storage_rewards
import base64

router = APIRouter()


class FileMetadata(BaseModel):
    cid: str
    filename: str
    size: int
    encrypted_size: int
    mime_type: Optional[str] = None
    total_chunks: int
    chunk_size: int
    encryption_key: str  # Base64 encoded AES key
    iv: str  # Base64 encoded initialization vector


async def _distribute_upload_reward_for_chunk(
    db,
    *,
    file_doc: dict,
    successful_replicas: list,
    chunk_index: int,
    is_complete: bool,
):
    """Share uploader AST spend with users who successfully stored this chunk's replicas."""
    unique_node_ids = []
    seen = set()
    for replica in successful_replicas:
        node_id = replica.get("node_id")
        if not node_id or node_id in seen:
            continue
        seen.add(node_id)
        unique_node_ids.append(node_id)

    if not unique_node_ids:
        return {"distributed_ast": 0.0, "recipients": []}

    total_chunks = max(1, int(file_doc.get("total_chunks") or 1))
    total_pool = float(
        file_doc.get("total_reward_pool_ast")
        or file_doc.get("upload_cost_ast")
        or calculate_upload_cost(int(file_doc.get("size") or 0))
    )
    remaining_pool = float(file_doc.get("remaining_reward_pool_ast", total_pool) or 0.0)

    if remaining_pool <= 0 or total_pool <= 0:
        return {"distributed_ast": 0.0, "recipients": []}

    # Budget a fair slice per chunk and flush rounding leftovers on the final chunk.
    per_chunk_budget = total_pool / total_chunks
    chunk_budget = min(remaining_pool, per_chunk_budget)
    if is_complete:
        chunk_budget = remaining_pool

    if chunk_budget <= 0:
        return {"distributed_ast": 0.0, "recipients": []}

    recipients_count = len(unique_node_ids)
    base_amount = round(chunk_budget / recipients_count, 4)
    payouts = []
    distributed_total = 0.0
    for idx, node_id in enumerate(unique_node_ids):
        if idx == recipients_count - 1:
            amount = round(max(0.0, chunk_budget - distributed_total), 4)
        else:
            amount = base_amount
        distributed_total = round(distributed_total + amount, 4)
        payouts.append((node_id, amount))

    actual_distributed = 0.0
    paid_recipients = []
    now = datetime.utcnow()

    for node_id, amount in payouts:
        if amount <= 0:
            continue

        provider_user = await db.users.find_one({"node_id": node_id})
        if not provider_user:
            continue

        current_balance = float(provider_user.get("token_balance", 0.0) or 0.0)
        new_balance = round(current_balance + amount, 4)
        await db.users.update_one(
            {"node_id": node_id},
            {"$set": {"token_balance": new_balance}},
        )

        await db.token_transactions.insert_one(
            {
                "node_id": node_id,
                "type": "earn",
                "amount": amount,
                "description": f"Upload hosting reward for chunk {chunk_index}",
                "category": "upload_hosting",
                "metadata": {
                    "cid": file_doc.get("cid"),
                    "chunk_index": chunk_index,
                },
                "timestamp": now,
            }
        )

        actual_distributed = round(actual_distributed + amount, 4)
        paid_recipients.append(node_id)

    if actual_distributed > 0:
        new_remaining = round(max(0.0, remaining_pool - actual_distributed), 4)
        distributed_so_far = round(total_pool - new_remaining, 4)
        await db.files.update_one(
            {"cid": file_doc.get("cid")},
            {
                "$set": {
                    "remaining_reward_pool_ast": new_remaining,
                    "reward_distributed_ast": distributed_so_far,
                }
            },
        )

    return {
        "distributed_ast": actual_distributed,
        "recipients": paid_recipients,
    }


async def _resolve_storage_nodes(
    db,
    owner_node_id: str,
    max_nodes: int = 3,
    include_owner_fallback: bool = False,
):
    """Choose active storage nodes for replicas, excluding uploader unless fallback is requested."""
    projection = {
        "_id": 0,
        "node_id": 1,
        "ip_address": 1,
        "provider_agent_url": 1,
        "region": 1,
        "is_active": 1,
    }

    query = {
        "is_active": True,
        "provider_agent_url": {"$exists": True, "$ne": None},
        "container_id": {"$exists": True, "$ne": None},
        "$or": [
            {"is_storage_node": True},
            {"storage_pledged": {"$gt": 0}},
            {"storage_pledged_gb": {"$gt": 0}},
        ],
    }
    if owner_node_id:
        query["node_id"] = {"$nin": [owner_node_id]}

    cursor = db.users.find(query, projection).limit(50)

    selected_nodes = []
    seen = set()
    async for node in cursor:
        node_id = node.get("node_id")
        if not node_id or node_id in seen:
            continue
        selected_nodes.append({
            "node_id": node_id,
            "ip_address": node.get("ip_address") or "N/A",
            "provider_agent_url": node.get("provider_agent_url"),
            "region": node.get("region") or "Unknown",
            "is_active": bool(node.get("is_active", True)),
        })
        seen.add(node_id)
        if len(selected_nodes) >= max_nodes:
            break

    if include_owner_fallback and owner_node_id and owner_node_id not in seen:
        owner_doc = await db.users.find_one({"node_id": owner_node_id}, projection)
        if owner_doc:
            selected_nodes.insert(0, {
                "node_id": owner_doc.get("node_id"),
                "ip_address": owner_doc.get("ip_address") or "N/A",
                "provider_agent_url": owner_doc.get("provider_agent_url"),
                "region": owner_doc.get("region") or "Unknown",
                "is_active": bool(owner_doc.get("is_active", True)),
            })

    # Keep only the requested number of replica destinations
    return selected_nodes[:max_nodes]


async def _hydrate_file_storage_nodes(db, file_doc: dict, max_nodes: int = 3):
    """Return storage nodes for a file, with fallback for old records."""
    stored_nodes = file_doc.get("storage_nodes") or []
    if stored_nodes:
        return stored_nodes[:max_nodes]

    # First fallback: use chunk replica metadata if available.
    sample_chunk = await db.chunks.find_one({"cid": file_doc.get("cid")}, {"_id": 0, "replicas": 1})
    replicas = (sample_chunk or {}).get("replicas") or []
    if replicas:
        return replicas[:max_nodes]

    # Last fallback: show owner node so UI can still display at least one destination node.
    owner_node_id = file_doc.get("owner_node_id")
    if owner_node_id:
        owner_nodes = await _resolve_storage_nodes(
            db,
            owner_node_id=owner_node_id,
            max_nodes=1,
            include_owner_fallback=True,
        )
        if owner_nodes:
            return owner_nodes

    return []


@router.post("/upload")
async def upload_file_metadata(
    file_metadata: FileMetadata,
    current_user: dict = Depends(get_current_user)
):
    """Store file metadata and encryption information."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Check if file already exists
    existing = await db.files.find_one({"cid": file_metadata.cid})
    if existing:
        raise HTTPException(status_code=409, detail="File with this CID already exists")

    storage_nodes = await _resolve_storage_nodes(
        db,
        owner_node_id=current_user["sub"],
        max_nodes=3,
        include_owner_fallback=False,
    )
    if not storage_nodes:
        raise HTTPException(
            status_code=409,
            detail="No remote active storage nodes available. Ask other nodes to pledge storage first.",
        )

    user = await db.users.find_one({"node_id": current_user["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user, daily_reward = await apply_daily_storage_rewards(db, user)
    upload_cost = calculate_upload_cost(file_metadata.size)
    current_balance = float(user.get("token_balance", 0.0) or 0.0)
    if upload_cost > current_balance:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Insufficient AST balance for upload. Required {upload_cost:.4f} AST, "
                f"available {current_balance:.4f} AST."
            ),
        )

    new_balance = round(current_balance - upload_cost, 4)
    await db.users.update_one(
        {"node_id": current_user["sub"]},
        {"$set": {"token_balance": new_balance}},
    )

    await db.token_transactions.insert_one({
        "node_id": current_user["sub"],
        "type": "spend",
        "amount": upload_cost,
        "description": f"Upload charge for {file_metadata.filename}",
        "category": "upload",
        "metadata": {
            "cid": file_metadata.cid,
            "size_bytes": file_metadata.size,
            "rate_ast_per_mb": AST_UPLOAD_COST_PER_MB,
        },
        "timestamp": datetime.utcnow(),
    })

    await record_blockchain_event(
        db,
        "UPLOAD_CHARGE",
        current_user["sub"],
        {
            "cid": file_metadata.cid,
            "filename": file_metadata.filename,
            "size_bytes": file_metadata.size,
            "upload_cost_ast": upload_cost,
            "storage_nodes": [node.get("node_id") for node in storage_nodes if node.get("node_id")],
        },
    )

    file_doc = {
        "cid": file_metadata.cid,
        "owner_node_id": current_user["sub"],
        "filename": file_metadata.filename,
        "size": file_metadata.size,
        "encrypted_size": file_metadata.encrypted_size,
        "mime_type": file_metadata.mime_type,
        "total_chunks": file_metadata.total_chunks,
        "chunk_size": file_metadata.chunk_size,
        "encryption_key": file_metadata.encryption_key,
        "iv": file_metadata.iv,
        "uploaded_at": datetime.utcnow(),
        "is_complete": False,
        "chunks_uploaded": 0,
        "storage_nodes": storage_nodes,
        "storage_node_ids": [node.get("node_id") for node in storage_nodes if node.get("node_id")],
        "replica_count": len(storage_nodes),
        "upload_cost_ast": upload_cost,
        "total_reward_pool_ast": upload_cost,
        "remaining_reward_pool_ast": upload_cost,
        "reward_distributed_ast": 0.0,
    }

    await db.files.insert_one(file_doc)

    return {
        "cid": file_metadata.cid,
        "status": "metadata_saved",
        "storage_nodes": storage_nodes,
        "upload_cost_ast": upload_cost,
        "daily_reward_applied_ast": daily_reward,
        "token_balance": new_balance,
        "message": "Upload file chunks next",
    }


@router.post("/chunks/upload")
async def upload_chunk(
    chunk: UploadFile = File(...),
    chunk_id: str = Form(...),
    chunk_index: int = Form(...),
    cid: str = Form(...),
    chunk_hash: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a single encrypted chunk."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Verify file exists and belongs to user
    file_doc = await db.files.find_one({"cid": cid, "owner_node_id": current_user["sub"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    # Idempotency: avoid duplicate payout or duplicate replication work on retry.
    existing_chunk = await db.chunks.find_one({"chunk_id": chunk_id})
    if existing_chunk:
        return {"chunk_id": chunk_id, "status": "already_exists"}

    # Read chunk data
    chunk_data = await chunk.read()
    chunk_data_b64 = base64.b64encode(chunk_data).decode('utf-8')

    # Store chunk and replicate to provider agents.
    file_storage_nodes = file_doc.get("storage_nodes") or []
    provider_agent_service = get_provider_agent_service()
    replica_results = []

    if not file_storage_nodes:
        raise HTTPException(status_code=409, detail="No storage providers mapped for this file")

    for replica in file_storage_nodes:
        target_node_id = replica.get("node_id")
        agent_url = provider_agent_service.normalize_agent_url(replica.get("provider_agent_url"))
        if not target_node_id or not agent_url:
            replica_results.append({
                "node_id": target_node_id or "unknown",
                "status": "failed",
                "detail": "Missing provider_agent_url",
            })
            continue

        try:
            write_result = await provider_agent_service.write_chunk(
                agent_url=agent_url,
                node_id=target_node_id,
                cid=cid,
                chunk_id=chunk_id,
                chunk_index=chunk_index,
                chunk_hash=chunk_hash,
                data_b64=chunk_data_b64,
            )
            replica_results.append({
                "node_id": target_node_id,
                "agent_url": agent_url,
                "status": "stored",
                "path": write_result.get("path"),
            })
        except Exception as replica_error:
            replica_results.append({
                "node_id": target_node_id,
                "agent_url": agent_url,
                "status": "failed",
                "detail": str(replica_error),
            })

    successful_replicas = [r for r in replica_results if r.get("status") == "stored"]
    if not successful_replicas:
        raise HTTPException(
            status_code=503,
            detail="Chunk replication failed on all provider nodes. Ensure provider agents are running.",
        )

    chunk_doc = {
        "chunk_id": chunk_id,
        "cid": cid,
        "chunk_index": chunk_index,
        "chunk_hash": chunk_hash,
        "data": chunk_data_b64,
        "size": len(chunk_data),
        "uploaded_at": datetime.utcnow(),
        "replicas": file_storage_nodes,
        "replica_results": replica_results,
    }

    await db.chunks.insert_one(chunk_doc)

    # Update file progress
    chunks_uploaded = file_doc.get("chunks_uploaded", 0) + 1
    is_complete = chunks_uploaded >= file_doc["total_chunks"]

    await db.files.update_one(
        {"cid": cid},
        {
            "$set": {
                "chunks_uploaded": chunks_uploaded,
                "is_complete": is_complete,
            }
        }
    )

    reward_distribution = await _distribute_upload_reward_for_chunk(
        db,
        file_doc=file_doc,
        successful_replicas=successful_replicas,
        chunk_index=chunk_index,
        is_complete=is_complete,
    )

    await record_blockchain_event(
        db,
        "UPLOAD_HOSTING_REWARD",
        file_doc.get("owner_node_id") or "unknown",
        {
            "cid": file_doc.get("cid"),
            "chunk_index": chunk_index,
            "recipients": reward_distribution.get("recipients", []),
            "distributed_ast": reward_distribution.get("distributed_ast", 0.0),
        },
    )

    return {
        "chunk_id": chunk_id,
        "chunk_index": chunk_index,
        "status": "uploaded",
        "replicas_stored": len(successful_replicas),
        "reward_distributed_ast": reward_distribution.get("distributed_ast", 0.0),
        "reward_recipients": reward_distribution.get("recipients", []),
        "file_complete": is_complete,
    }


@router.get("/list")
async def list_files(current_user: dict = Depends(get_current_user)):
    """List all files uploaded by the current user."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    cursor = db.files.find(
        {"owner_node_id": current_user["sub"]},
        {"_id": 0}
    ).sort("uploaded_at", -1)

    files = await cursor.to_list(length=100)

    # Backfill storage mapping for older file records that predate replica metadata.
    for file_doc in files:
        storage_nodes = await _hydrate_file_storage_nodes(db, file_doc, max_nodes=3)
        file_doc["storage_nodes"] = storage_nodes
        file_doc["storage_node_ids"] = [node.get("node_id") for node in storage_nodes if node.get("node_id")]
        file_doc["replica_count"] = len(storage_nodes)

    return {"files": files}


@router.get("/distribution/summary")
async def get_file_distribution_summary(current_user: dict = Depends(get_current_user)):
    """Get per-user file distribution summary: node IDs, node IPs and active node counts."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    cursor = db.files.find(
        {"owner_node_id": current_user["sub"]},
        {
            "_id": 0,
            "cid": 1,
            "filename": 1,
            "size": 1,
            "storage_nodes": 1,
            "uploaded_at": 1,
        },
    ).sort("uploaded_at", -1)

    files = await cursor.to_list(length=200)
    unique_nodes = {}
    files_with_distribution = 0

    for file_doc in files:
        storage_nodes = await _hydrate_file_storage_nodes(db, file_doc, max_nodes=3)
        file_doc["storage_nodes"] = storage_nodes
        if storage_nodes:
            files_with_distribution += 1
        for node in storage_nodes:
            node_id = node.get("node_id")
            if not node_id:
                continue
            unique_nodes[node_id] = {
                "node_id": node_id,
                "ip_address": node.get("ip_address") or "N/A",
                "region": node.get("region") or "Unknown",
                "is_active": bool(node.get("is_active", False)),
            }

    active_nodes_count = sum(1 for node in unique_nodes.values() if node.get("is_active"))

    return {
        "total_files": len(files),
        "files_with_distribution": files_with_distribution,
        "nodes_storing_user_data": len(unique_nodes),
        "active_nodes_storing_user_data": active_nodes_count,
        "nodes": list(unique_nodes.values()),
        "files": files,
    }


@router.get("/{cid}")
async def get_file_metadata(cid: str, current_user: dict = Depends(get_current_user)):
    """Get file metadata by CID."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    file_doc = await db.files.find_one(
        {"cid": cid, "owner_node_id": current_user["sub"]},
        {"_id": 0}
    )

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    return file_doc


@router.get("/{cid}/chunks")
async def retrieve_file_chunks(cid: str, current_user: dict = Depends(get_current_user)):
    """Retrieve all chunks for a file."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Verify file exists and belongs to user
    file_doc = await db.files.find_one({"cid": cid, "owner_node_id": current_user["sub"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    # Get all chunks
    cursor = db.chunks.find(
        {"cid": cid},
        {"_id": 0, "chunk_id": 1, "chunk_index": 1, "data": 1, "chunk_hash": 1}
    ).sort("chunk_index", 1)

    chunks = await cursor.to_list(length=file_doc["total_chunks"])

    if len(chunks) < file_doc["total_chunks"]:
        raise HTTPException(
            status_code=500,
            detail=f"Incomplete file: {len(chunks)}/{file_doc['total_chunks']} chunks available"
        )

    return {"chunks": chunks, "total": len(chunks)}


@router.delete("/{cid}")
async def delete_file(cid: str, current_user: dict = Depends(get_current_user)):
    """Delete a file and all its chunks."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Verify file exists and belongs to user
    file_doc = await db.files.find_one({"cid": cid, "owner_node_id": current_user["sub"]})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    provider_agent_service = get_provider_agent_service()
    storage_nodes = await _hydrate_file_storage_nodes(db, file_doc, max_nodes=10)
    remote_cleanup_results = []

    for node in storage_nodes:
        node_id = node.get("node_id")
        agent_url = provider_agent_service.normalize_agent_url(node.get("provider_agent_url"))
        if not node_id or not agent_url:
            remote_cleanup_results.append({
                "node_id": node_id or "unknown",
                "status": "failed",
                "detail": "Missing provider_agent_url or node_id",
            })
            continue

        try:
            await provider_agent_service.delete_file_chunks(
                agent_url=agent_url,
                node_id=node_id,
                cid=cid,
            )
            remote_cleanup_results.append({
                "node_id": node_id,
                "status": "deleted",
            })
        except Exception as cleanup_error:
            remote_cleanup_results.append({
                "node_id": node_id,
                "status": "failed",
                "detail": str(cleanup_error),
            })

    failed_nodes = [result for result in remote_cleanup_results if result.get("status") != "deleted"]
    if failed_nodes:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Failed to delete chunks from one or more storage nodes",
                "failed_nodes": failed_nodes,
            },
        )

    # Delete all chunks
    await db.chunks.delete_many({"cid": cid})

    # Delete file metadata
    await db.files.delete_one({"cid": cid})

    await record_blockchain_event(
        db,
        "FILE_DELETED",
        current_user["sub"],
        {
            "cid": cid,
            "filename": file_doc.get("filename"),
            "remote_cleanup": remote_cleanup_results,
        },
    )

    return {
        "cid": cid,
        "status": "deleted",
        "message": "File and all chunks removed",
        "remote_cleanup": remote_cleanup_results,
    }
