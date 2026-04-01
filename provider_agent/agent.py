"""Provider Node Agent for DecentraStore.

Run this on each storage provider machine (Windows/Linux/macOS).
It provisions a Docker container locally and writes uploaded chunks to
its mounted storage folder.
"""
from __future__ import annotations

import base64
import hashlib
import io
import os
import re
import tarfile
from pathlib import Path
from typing import Any, Dict, Optional

import docker
from docker.errors import APIError, DockerException
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

SHARED_TOKEN = os.getenv("NODE_AGENT_SHARED_TOKEN", "").strip()
CONTAINER_PREFIX = "decentrastore-storage"

app = FastAPI(title="DecentraStore Provider Agent", version="1.0.0")


class ProvisionRequest(BaseModel):
    node_id: str
    storage_gb: int
    host_storage_path: str


class ChunkWriteRequest(BaseModel):
    node_id: str
    cid: str
    chunk_id: str
    chunk_index: int
    chunk_hash: str
    data_b64: str


class ChunkDeleteRequest(BaseModel):
    node_id: str
    cid: str


class AgentDockerService:
    def __init__(self) -> None:
        self.client = self._build_client()

    @staticmethod
    def _build_client() -> docker.DockerClient:
        try:
            client = docker.from_env()
            client.ping()
            return client
        except DockerException:
            # Linux fallback sockets
            for socket_path in ("unix:///var/run/docker.sock", "unix:///run/user/1000/docker.sock"):
                try:
                    client = docker.DockerClient(base_url=socket_path)
                    client.ping()
                    return client
                except Exception:
                    continue
            raise

    @staticmethod
    def safe_node_id(node_id: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_.-]", "-", node_id)

    def container_name(self, node_id: str) -> str:
        return f"{CONTAINER_PREFIX}-{self.safe_node_id(node_id)[:32]}"

    def ensure_image(self, image_name: str = "alpine:latest") -> None:
        try:
            self.client.images.get(image_name)
        except docker.errors.ImageNotFound:
            self.client.images.pull(image_name)

    def provision(self, node_id: str, storage_gb: int, host_storage_path: str) -> Dict[str, Any]:
        container_name = self.container_name(node_id)

        host_path = Path(host_storage_path).expanduser()
        host_path.mkdir(parents=True, exist_ok=True)

        try:
            existing = self.client.containers.get(container_name)
            existing.stop(timeout=5)
            existing.remove(v=True, force=True)
        except docker.errors.NotFound:
            pass

        self.ensure_image("alpine:latest")

        common_config = {
            "image": "alpine:latest",
            "name": container_name,
            "command": ["sh", "-c", "mkdir -p /storage/chunks && tail -f /dev/null"],
            "volumes": {
                str(host_path): {"bind": "/storage", "mode": "rw"},
            },
            "environment": {
                "NODE_ID": node_id,
                "STORAGE_GB": str(storage_gb),
                "PURPOSE": "decentrastore-provider-storage",
            },
            "labels": {
                "decentrastore": "true",
                "node_id": node_id,
                "node_type": "provider-storage",
                "storage_gb": str(storage_gb),
                "mount_type": "bind",
                "agent_managed": "true",
            },
            "restart_policy": {"Name": "unless-stopped"},
            "stdin_open": False,
            "tty": False,
        }

        quota_enforced = True
        message = "Storage node container created successfully"

        try:
            container = self.client.containers.create(
                **common_config,
                storage_opt={"size": f"{int(max(1, storage_gb))}G"},
            )
        except APIError:
            quota_enforced = False
            message = "Container started, but hard Docker quota is unsupported by current storage driver"
            container = self.client.containers.create(**common_config)

        container.start()

        return {
            "container_id": container.id[:12],
            "container_name": container_name,
            "status": "running",
            "message": message,
            "storage_gb": int(max(1, storage_gb)),
            "mount_type": "bind",
            "mount_source": str(host_path),
            "volume_name": None,
            "quota_enforced": quota_enforced,
        }


docker_service: Optional[AgentDockerService] = None
provider_paths: Dict[str, str] = {}


def require_auth(header_token: Optional[str]) -> None:
    if SHARED_TOKEN and header_token != SHARED_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid node agent token")


def get_service() -> AgentDockerService:
    global docker_service
    if docker_service is None:
        docker_service = AgentDockerService()
    return docker_service


@app.get("/agent/health")
async def health(x_node_agent_token: Optional[str] = Header(default=None)):
    require_auth(x_node_agent_token)
    service = get_service()
    service.client.ping()
    return {"ok": True, "status": "running"}


@app.post("/agent/storage/provision")
async def provision_storage(req: ProvisionRequest, x_node_agent_token: Optional[str] = Header(default=None)):
    require_auth(x_node_agent_token)

    if req.storage_gb < 1:
        raise HTTPException(status_code=400, detail="storage_gb must be >= 1")

    service = get_service()
    result = service.provision(req.node_id, req.storage_gb, req.host_storage_path)
    provider_paths[req.node_id] = str(Path(req.host_storage_path).expanduser())
    return result


@app.post("/agent/storage/chunks")
async def write_chunk(req: ChunkWriteRequest, x_node_agent_token: Optional[str] = Header(default=None)):
    require_auth(x_node_agent_token)

    base_path = provider_paths.get(req.node_id)

    raw_data = base64.b64decode(req.data_b64.encode("utf-8"))
    computed_hash = hashlib.sha256(raw_data).hexdigest()
    if computed_hash != req.chunk_hash:
        raise HTTPException(status_code=400, detail="Chunk hash mismatch")

    service = get_service()
    container_name = service.container_name(req.node_id)
    try:
        container = service.client.containers.get(container_name)
    except docker.errors.NotFound:
        raise HTTPException(status_code=409, detail="Node container is not running on provider machine")

    if not base_path:
        mounts = container.attrs.get("Mounts", [])
        for mount in mounts:
            destination = (mount.get("Destination") or "").rstrip("/")
            if destination == "/storage" and mount.get("Source"):
                base_path = mount.get("Source")
                provider_paths[req.node_id] = base_path
                break

    if not base_path:
        raise HTTPException(status_code=409, detail="Provider storage path is unknown for this node")

    container_dir = f"/storage/chunks/{req.cid}"
    container.exec_run(["sh", "-c", f"mkdir -p {container_dir}"])

    archive_buffer = io.BytesIO()
    filename = f"{req.chunk_index:08d}_{req.chunk_id}.bin"
    with tarfile.open(fileobj=archive_buffer, mode="w") as tar:
        tar_info = tarfile.TarInfo(name=filename)
        tar_info.size = len(raw_data)
        tar.addfile(tarinfo=tar_info, fileobj=io.BytesIO(raw_data))

    archive_buffer.seek(0)
    ok = container.put_archive(container_dir, archive_buffer.getvalue())
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to write chunk inside provider container")

    host_chunk_path = str(Path(base_path) / "chunks" / req.cid / filename)

    return {
        "status": "stored",
        "path": host_chunk_path,
        "size": len(raw_data),
    }


@app.post("/agent/storage/chunks/delete")
async def delete_file_chunks(req: ChunkDeleteRequest, x_node_agent_token: Optional[str] = Header(default=None)):
    require_auth(x_node_agent_token)

    service = get_service()
    container_name = service.container_name(req.node_id)
    try:
        container = service.client.containers.get(container_name)
    except docker.errors.NotFound:
        raise HTTPException(status_code=409, detail="Node container is not running on provider machine")

    safe_cid = re.sub(r"[^a-zA-Z0-9_.-]", "", req.cid)
    if not safe_cid:
        raise HTTPException(status_code=400, detail="Invalid cid")

    target_dir = f"/storage/chunks/{safe_cid}"
    exec_result = container.exec_run(["sh", "-c", f"rm -rf {target_dir}"])
    if exec_result.exit_code not in (0, None):
        raise HTTPException(status_code=500, detail="Failed to delete chunks from provider container")

    return {
        "status": "deleted",
        "cid": req.cid,
        "node_id": req.node_id,
    }
