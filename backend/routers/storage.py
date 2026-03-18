"""Storage Node Router — Storage Pledging and Status."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from backend.core.security import get_current_user
from backend.core.database import get_db
from backend.services.docker_service import get_docker_service

router = APIRouter()


class PledgeRequest(BaseModel):
    gigabytes: int


@router.get("/status")
async def storage_status(current_user: dict = Depends(get_current_user)):
    """Get storage node status and statistics."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Get user data
    user = await db.users.find_one({"node_id": current_user["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get file statistics
    files_count = await db.files.count_documents({"owner_node_id": current_user["sub"]})
    files_cursor = db.files.find({"owner_node_id": current_user["sub"]}, {"size": 1})
    files_list = await files_cursor.to_list(length=1000)
    total_uploaded_size = sum(f.get("size", 0) for f in files_list)

    # Get chunks stored (files uploaded by this user)
    chunks_count = await db.chunks.count_documents({})

    storage_pledged = user.get("storage_pledged", 0)
    storage_used_pct = 0
    if storage_pledged > 0:
        storage_used_pct = min(100, (total_uploaded_size / storage_pledged) * 100)

    # Get container status
    docker_service = get_docker_service()
    container_running = docker_service.is_container_running(current_user["sub"])
    container_info = None
    if container_running:
        container_info = docker_service.get_container_info(current_user["sub"])

    return {
        "node_id": current_user["sub"],
        "storage_pledged": storage_pledged,
        "storage_used": storage_used_pct,
        "files_uploaded": files_count,
        "total_uploaded_size": total_uploaded_size,
        "chunks_stored": chunks_count,
        "token_balance": user.get("token_balance", 0.0),
        "is_active": user.get("is_active", True),
        "container_running": container_running,
        "container_id": user.get("container_id"),
        "container_name": user.get("container_name"),
    }


@router.post("/pledge")
async def pledge_storage(
    req: PledgeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Pledge storage space to the network and earn tokens."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    if req.gigabytes < 1 or req.gigabytes > 1000:
        raise HTTPException(status_code=400, detail="Storage pledge must be between 1-1000 GB")

    # Get user
    user = await db.users.find_one({"node_id": current_user["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate storage in bytes
    storage_bytes = req.gigabytes * 1024 * 1024 * 1024

    # Update user's storage pledge
    current_pledge = user.get("storage_pledged", 0)
    new_pledge = current_pledge + storage_bytes

    # Calculate token reward (0.5 AST per GB pledged)
    reward = req.gigabytes * 0.5
    current_balance = user.get("token_balance", 0.0)
    new_balance = current_balance + reward

    # Create Docker container for storage node
    docker_service = get_docker_service()
    container_result = docker_service.create_storage_container(
        node_id=current_user["sub"],
        storage_gb=req.gigabytes
    )

    update_data = {
        "storage_pledged": new_pledge,
        "token_balance": new_balance,
        "last_pledge_at": datetime.utcnow(),
    }

    # Store container information if creation was successful
    if container_result["status"] == "running":
        update_data["container_id"] = container_result["container_id"]
        update_data["container_name"] = container_result["container_name"]
        update_data["container_volume"] = container_result.get("volume_name")
        update_data["is_storage_node"] = True

    await db.users.update_one(
        {"node_id": current_user["sub"]},
        {"$set": update_data}
    )

    # Record token transaction
    await db.token_transactions.insert_one({
        "node_id": current_user["sub"],
        "type": "earn",
        "amount": reward,
        "description": f"Storage pledge: {req.gigabytes} GB",
        "category": "storage",
        "timestamp": datetime.utcnow(),
    })

    # Record container creation in database
    if container_result["status"] == "running":
        await db.storage_containers.insert_one({
            "node_id": current_user["sub"],
            "container_id": container_result["container_id"],
            "container_name": container_result["container_name"],
            "storage_gb": req.gigabytes,
            "volume_name": container_result.get("volume_name"),
            "status": "running",
            "created_at": datetime.utcnow(),
        })

    return {
        "pledged_gb": req.gigabytes,
        "total_pledge_gb": new_pledge / (1024 * 1024 * 1024),
        "reward_ast": reward,
        "new_balance": new_balance,
        "message": f"Successfully pledged {req.gigabytes} GB. Earned {reward} AST!",
        "container": container_result,
    }


@router.get("/container/status")
async def get_container_status(current_user: dict = Depends(get_current_user)):
    """Get the status of the user's storage container."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user = await db.users.find_one({"node_id": current_user["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get container info from database
    container_record = await db.storage_containers.find_one(
        {"node_id": current_user["sub"]},
        sort=[("created_at", -1)]
    )

    if not container_record:
        return {
            "has_container": False,
            "message": "No storage container found for this node"
        }

    # Get live status from Docker
    docker_service = get_docker_service()
    container_info = docker_service.get_container_info(current_user["sub"])

    return {
        "has_container": True,
        "container_id": container_record.get("container_id"),
        "container_name": container_record.get("container_name"),
        "storage_gb": container_record.get("storage_gb"),
        "volume_name": container_record.get("volume_name"),
        "created_at": container_record.get("created_at"),
        "docker_status": container_info.get("status") if container_info else "unknown",
        "docker_running": docker_service.is_container_running(current_user["sub"]),
    }


@router.get("/containers/list")
async def list_containers(current_user: dict = Depends(get_current_user)):
    """List all storage containers (admin view)."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Check if user is admin (optional - can be removed for user view)
    docker_service = get_docker_service()
    containers = docker_service.list_storage_containers()

    return {
        "count": len(containers),
        "containers": containers
    }

