"""Storage Node Router — Storage Pledging and Status."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from backend.core.security import get_current_user
from backend.core.database import get_db
from backend.services.docker_service import get_docker_service
from backend.services.provider_agent_service import get_provider_agent_service
from backend.services.token_service import AST_DAILY_EARN_PER_GB, apply_daily_storage_rewards
from backend.core.config import settings

router = APIRouter()


class PledgeRequest(BaseModel):
    gigabytes: int
    host_storage_path: Optional[str] = None
    storage_target_label: Optional[str] = None
    provider_agent_url: Optional[str] = None


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

    user, daily_reward = await apply_daily_storage_rewards(db, user)

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
    container_running = False
    container_info = None
    provider_agent_url = user.get("provider_agent_url")

    if provider_agent_url:
        agent_service = get_provider_agent_service()
        try:
            health = await agent_service.health_check(provider_agent_url)
            container_running = bool(health.get("ok", False))
            container_info = health
        except Exception:
            container_running = False
    else:
        docker_service = get_docker_service()
        container_running = docker_service.is_container_running(current_user["sub"])
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
        "daily_reward_rate_per_gb": AST_DAILY_EARN_PER_GB,
        "daily_reward_applied_ast": daily_reward,
        "is_active": user.get("is_active", True),
        "container_running": container_running,
        "container_id": user.get("container_id"),
        "container_name": user.get("container_name"),
        "host_storage_path": user.get("host_storage_path"),
        "storage_target_label": user.get("storage_target_label"),
        "container_quota_enforced": user.get("container_quota_enforced"),
        "provider_agent_url": user.get("provider_agent_url"),
        "provisioning_mode": user.get("provisioning_mode") or "legacy-local-docker",
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
    total_pledge_gb = int(new_pledge / (1024 * 1024 * 1024))

    user, daily_reward = await apply_daily_storage_rewards(db, user)
    current_balance = float(user.get("token_balance", 0.0) or 0.0)

    selected_host_path = (req.host_storage_path or user.get("host_storage_path") or "").strip()
    if not selected_host_path:
        raise HTTPException(
            status_code=400,
            detail="Please provide a folder path for provider machine Docker storage mount before pledging"
        )

    agent_service = get_provider_agent_service()
    normalized_agent_url = agent_service.normalize_agent_url(
        req.provider_agent_url or user.get("provider_agent_url")
    )

    if not normalized_agent_url:
        existing_ip = user.get("ip_address")
        if existing_ip:
            normalized_agent_url = agent_service.normalize_agent_url(
                f"{existing_ip}:{settings.NODE_AGENT_DEFAULT_PORT}"
            )

    if not normalized_agent_url:
        raise HTTPException(
            status_code=400,
            detail=(
                "provider_agent_url is required. Run the Node Agent on provider machine "
                f"and share URL (example: http://<provider-ip>:{settings.NODE_AGENT_DEFAULT_PORT})."
            )
        )

    try:
        await agent_service.health_check(normalized_agent_url)
    except Exception as agent_error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Provider node agent is unreachable. Start node agent on provider machine and verify "
                f"URL {normalized_agent_url}. Error: {str(agent_error)}"
            ),
        )

    try:
        container_result = await agent_service.provision_storage(
            agent_url=normalized_agent_url,
            node_id=current_user["sub"],
            storage_gb=max(1, total_pledge_gb),
            host_storage_path=selected_host_path,
        )
    except Exception as provision_error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to provision storage container on provider machine. "
                f"Error: {str(provision_error)}"
            )
        )

    if container_result.get("status") != "running":
        raise HTTPException(
            status_code=503,
            detail=f"Provider container is not running: {container_result.get('message', 'Unknown error')}"
        )

    provider_host = agent_service.extract_host(normalized_agent_url)

    update_data = {
        "storage_pledged": new_pledge,
        "last_pledge_at": datetime.utcnow(),
        "host_storage_path": selected_host_path,
        "storage_target_label": req.storage_target_label,
        "provider_agent_url": normalized_agent_url,
        "provisioning_mode": "provider-agent",
    }

    if provider_host:
        update_data["ip_address"] = provider_host

    update_data["container_id"] = container_result["container_id"]
    update_data["container_name"] = container_result["container_name"]
    update_data["container_volume"] = container_result.get("volume_name")
    update_data["container_mount_source"] = container_result.get("mount_source")
    update_data["container_mount_type"] = container_result.get("mount_type")
    update_data["container_quota_enforced"] = container_result.get("quota_enforced", False)
    update_data["is_storage_node"] = True

    await db.users.update_one(
        {"node_id": current_user["sub"]},
        {"$set": update_data}
    )

    # Record container creation in database
    container_doc = {
        "node_id": current_user["sub"],
        "container_id": container_result["container_id"],
        "container_name": container_result["container_name"],
        "storage_gb": max(1, total_pledge_gb),
        "provider_agent_url": normalized_agent_url,
        "volume_name": container_result.get("volume_name"),
        "mount_type": container_result.get("mount_type"),
        "mount_source": container_result.get("mount_source"),
        "quota_enforced": container_result.get("quota_enforced", False),
        "status": "running",
        "updated_at": datetime.utcnow(),
    }

    existing_container = await db.storage_containers.find_one({"node_id": current_user["sub"]})
    if existing_container:
        await db.storage_containers.update_one(
            {"node_id": current_user["sub"]},
            {"$set": container_doc}
        )
    else:
        container_doc["created_at"] = datetime.utcnow()
        await db.storage_containers.insert_one(container_doc)

    return {
        "pledged_gb": req.gigabytes,
        "total_pledge_gb": new_pledge / (1024 * 1024 * 1024),
        "reward_ast": 0.0,
        "daily_reward_applied_ast": daily_reward,
        "daily_reward_rate_per_gb": AST_DAILY_EARN_PER_GB,
        "new_balance": current_balance,
        "message": (
            f"Successfully pledged {req.gigabytes} GB. "
            f"You now earn {AST_DAILY_EARN_PER_GB} AST per GB per day."
        ),
        "host_storage_path": selected_host_path,
        "provider_agent_url": normalized_agent_url,
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

    # Get live status from provider agent (primary mode), fallback to local Docker for legacy records.
    provider_agent_url = container_record.get("provider_agent_url") or user.get("provider_agent_url")
    docker_status = "unknown"
    docker_running = False

    if provider_agent_url:
        agent_service = get_provider_agent_service()
        try:
            health = await agent_service.health_check(provider_agent_url)
            docker_running = bool(health.get("ok", False))
            docker_status = health.get("status") or ("running" if docker_running else "unknown")
        except Exception:
            docker_running = False
            docker_status = "agent-unreachable"
    else:
        docker_service = get_docker_service()
        container_info = docker_service.get_container_info(current_user["sub"])
        docker_status = container_info.get("status") if container_info else "unknown"
        docker_running = docker_service.is_container_running(current_user["sub"])

    return {
        "has_container": True,
        "container_id": container_record.get("container_id"),
        "container_name": container_record.get("container_name"),
        "storage_gb": container_record.get("storage_gb"),
        "volume_name": container_record.get("volume_name"),
        "mount_type": container_record.get("mount_type"),
        "mount_source": container_record.get("mount_source"),
        "quota_enforced": container_record.get("quota_enforced", False),
        "provider_agent_url": provider_agent_url,
        "created_at": container_record.get("created_at"),
        "docker_status": docker_status,
        "docker_running": docker_running,
    }


@router.get("/containers/list")
async def list_containers(current_user: dict = Depends(get_current_user)):
    """List all storage containers (admin view)."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    cursor = db.storage_containers.find({}, {"_id": 0}).sort("updated_at", -1)
    containers = await cursor.to_list(length=500)

    return {
        "count": len(containers),
        "containers": containers
    }

