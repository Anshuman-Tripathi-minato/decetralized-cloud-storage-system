"""Provider agent service for remote storage-node operations."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import httpx

from backend.core.config import settings

logger = logging.getLogger(__name__)


class ProviderAgentService:
    """HTTP client to communicate with provider-hosted node agents."""

    def __init__(self) -> None:
        self.timeout = float(settings.NODE_AGENT_TIMEOUT_SEC)

    @staticmethod
    def normalize_agent_url(raw_url: Optional[str]) -> Optional[str]:
        if not raw_url:
            return None

        value = raw_url.strip()
        if not value:
            return None

        if not value.startswith("http://") and not value.startswith("https://"):
            value = f"http://{value}"

        return value.rstrip("/")

    @staticmethod
    def extract_host(agent_url: str) -> Optional[str]:
        try:
            parsed = urlparse(agent_url)
            return parsed.hostname
        except Exception:
            return None

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        shared_token = (settings.NODE_AGENT_SHARED_TOKEN or "").strip()
        if shared_token:
            headers["X-Node-Agent-Token"] = shared_token
        return headers

    async def health_check(self, agent_url: str) -> Dict[str, Any]:
        endpoint = f"{agent_url}/agent/health"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(endpoint, headers=self._headers())
            response.raise_for_status()
            return response.json()

    async def provision_storage(
        self,
        agent_url: str,
        node_id: str,
        storage_gb: int,
        host_storage_path: str,
    ) -> Dict[str, Any]:
        endpoint = f"{agent_url}/agent/storage/provision"
        payload = {
            "node_id": node_id,
            "storage_gb": storage_gb,
            "host_storage_path": host_storage_path,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(endpoint, json=payload, headers=self._headers())
            response.raise_for_status()
            return response.json()

    async def write_chunk(
        self,
        agent_url: str,
        node_id: str,
        cid: str,
        chunk_id: str,
        chunk_index: int,
        chunk_hash: str,
        data_b64: str,
    ) -> Dict[str, Any]:
        endpoint = f"{agent_url}/agent/storage/chunks"
        payload = {
            "node_id": node_id,
            "cid": cid,
            "chunk_id": chunk_id,
            "chunk_index": chunk_index,
            "chunk_hash": chunk_hash,
            "data_b64": data_b64,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(endpoint, json=payload, headers=self._headers())
            response.raise_for_status()
            return response.json()


_provider_agent_service: Optional[ProviderAgentService] = None


def get_provider_agent_service() -> ProviderAgentService:
    global _provider_agent_service
    if _provider_agent_service is None:
        _provider_agent_service = ProviderAgentService()
    return _provider_agent_service
