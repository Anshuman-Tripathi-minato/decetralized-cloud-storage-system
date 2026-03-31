"""
Docker Service — Storage Node Container Management
Handles creation and management of Docker containers for storage nodes
"""
import logging
import os
import re
import docker
from docker.errors import DockerException, APIError
from typing import Optional, Dict, Any
from backend.core.config import settings

logger = logging.getLogger(__name__)


class DockerService:
    """Service for managing Docker containers for storage nodes"""

    def __init__(self):
        """Initialize Docker client"""
        self._enabled = settings.DOCKER_ENABLED
        self._availability_checked = False

        if not self._enabled:
            logger.info("Docker features disabled (DOCKER_ENABLED=false)")
            self.client = None
            return

        try:
            self.client = docker.from_env()
            logger.info("✅ Docker client initialized successfully")
        except DockerException as e:
            logger.warning(f"Docker client unavailable via environment: {e}")
            self.client = None

            # Fallback for Linux local development where DOCKER_HOST may be misconfigured.
            for socket_path in ("unix:///var/run/docker.sock", "unix:///run/user/1000/docker.sock"):
                try:
                    fallback_client = docker.DockerClient(base_url=socket_path)
                    fallback_client.ping()
                    self.client = fallback_client
                    logger.info(f"✅ Docker client initialized via fallback socket: {socket_path}")
                    break
                except Exception:
                    continue

    def is_available(self) -> bool:
        """Check if Docker is available and connected"""
        if not self._enabled:
            return False

        if self.client is None:
            return False
        try:
            self.client.ping()
            self._availability_checked = True
            return True
        except Exception as e:
            if not self._availability_checked:
                logger.warning(f"Docker connection check failed: {e}")
                self._availability_checked = True
            return False

    @staticmethod
    def _safe_node_id(node_id: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_.-]", "-", node_id)

    def _container_name(self, node_id: str) -> str:
        return f"decentrastore-storage-{self._safe_node_id(node_id)[:32]}"

    def _volume_name(self, node_id: str) -> str:
        return f"decentrastore-data-{self._safe_node_id(node_id)[:32]}"

    def create_storage_container(
        self,
        node_id: str,
        storage_gb: int,
        host_storage_path: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a Docker container for a storage node
        
        Args:
            node_id: Unique identifier for the storage node (user)
            storage_gb: Storage space allocated in GB
            **kwargs: Additional container configuration
            
        Returns:
            Dict containing:
            {
                "container_id": str,
                "container_name": str,
                "status": "running" | "error",
                "message": str,
                "storage_gb": int,
                "volume_path": str
            }
        """
        if not self.is_available():
            return {
                "container_id": None,
                "container_name": None,
                "status": "error",
                "message": "Docker daemon is not available",
                "storage_gb": storage_gb,
                "volume_path": None,
            }

        container_name = self._container_name(node_id)
        volume_name = self._volume_name(node_id)
        
        try:
            # Recreate container when pledge changes so mount/quota are updated.
            try:
                existing_container = self.client.containers.get(container_name)
                existing_container.stop(timeout=5)
                existing_container.remove(v=True, force=True)
                logger.info(f"Recreated existing container: {container_name}")
            except docker.errors.NotFound:
                pass

            mount_source = None
            volumes = {}
            mount_type = "docker-volume"

            if host_storage_path:
                mount_source = os.path.abspath(host_storage_path)
                os.makedirs(mount_source, exist_ok=True)
                volumes = {
                    mount_source: {
                        'bind': '/storage',
                        'mode': 'rw'
                    }
                }
                mount_type = "bind"
            else:
                try:
                    volume = self.client.volumes.get(volume_name)
                    logger.info(f"Using existing volume: {volume_name}")
                except docker.errors.NotFound:
                    volume = self.client.volumes.create(
                        name=volume_name,
                        driver='local',
                        labels={
                            'decentrastore': 'true',
                            'node_id': node_id,
                            'storage_gb': str(storage_gb),
                        }
                    )
                    logger.info(f"Created new volume: {volume_name}")

                mount_source = volume_name
                volumes = {
                    volume_name: {
                        'bind': '/storage',
                        'mode': 'rw'
                    }
                }

            common_config = {
                'image': 'alpine:latest',
                'name': container_name,
                'volumes': volumes,
                'environment': {
                    'NODE_ID': node_id,
                    'STORAGE_GB': str(storage_gb),
                    'PURPOSE': 'decentrastore-chunk-storage',
                },
                'labels': {
                    'decentrastore': 'true',
                    'node_id': node_id,
                    'node_type': 'storage',
                    'created_at': 'now',
                    'storage_gb': str(storage_gb),
                    'mount_type': mount_type,
                },
                'stdin_open': False,
                'tty': False,
                'restart_policy': {'Name': 'unless-stopped'},
            }

            quota_enforced = True
            warning_message = None

            try:
                self.client.images.get('alpine:latest')
            except docker.errors.ImageNotFound:
                logger.info("Pulling missing image alpine:latest")
                self.client.images.pull('alpine:latest')

            try:
                container = self.client.containers.create(
                    **common_config,
                    storage_opt={'size': f'{int(storage_gb)}G'},
                )
            except APIError as quota_error:
                # Some Docker drivers do not support storage_opt size quotas.
                logger.warning(f"Storage quota option unsupported, retrying without quota: {quota_error}")
                quota_enforced = False
                warning_message = "Container started, but hard Docker quota is unsupported by current storage driver"
                container = self.client.containers.create(**common_config)

            # Start container
            container.start()
            logger.info(f"✅ Storage container created and started: {container_name}")

            return {
                "container_id": container.id[:12],  # Short ID
                "container_name": container_name,
                "status": "running",
                "message": warning_message or "Storage node container created successfully",
                "storage_gb": storage_gb,
                "volume_path": f"/var/lib/docker/volumes/{volume_name}/_data" if mount_type == "docker-volume" else mount_source,
                "volume_name": volume_name if mount_type == "docker-volume" else None,
                "mount_type": mount_type,
                "mount_source": mount_source,
                "quota_enforced": quota_enforced,
            }

        except APIError as e:
            logger.error(f"Docker API error creating container: {e}")
            return {
                "container_id": None,
                "container_name": container_name,
                "status": "error",
                "message": f"Failed to create container: {str(e)}",
                "storage_gb": storage_gb,
                "volume_path": None,
            }
        except Exception as e:
            logger.error(f"Unexpected error creating container: {e}")
            return {
                "container_id": None,
                "container_name": container_name,
                "status": "error",
                "message": f"Unexpected error: {str(e)}",
                "storage_gb": storage_gb,
                "volume_path": None,
            }

    def get_container_info(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a storage node's container"""
        if not self.is_available():
            return None

        container_name = self._container_name(node_id)
        try:
            container = self.client.containers.get(container_name)
            stats = container.stats(stream=False)
            
            return {
                "container_id": container.id[:12],
                "container_name": container.name,
                "status": container.status,
                "state": container.attrs['State'],
                "memory_usage": stats.get('memory_stats', {}).get('usage', 0),
                "created": container.attrs['Created'],
                "image": container.image.tags[0] if container.image.tags else 'unknown',
            }
        except docker.errors.NotFound:
            return None
        except Exception as e:
            logger.error(f"Error getting container info: {e}")
            return None

    def is_container_running(self, node_id: str) -> bool:
        """Check if a storage node's container is running"""
        info = self.get_container_info(node_id)
        return info is not None and info['status'] == 'running'

    def list_storage_containers(self) -> list:
        """List all DecentraStore storage containers"""
        if not self.is_available():
            return []

        try:
            containers = self.client.containers.list(
                all=True,
                filters={'label': 'decentrastore=true'}
            )
            
            result = []
            for container in containers:
                labels = container.labels
                result.append({
                    "container_id": container.id[:12],
                    "container_name": container.name,
                    "status": container.status,
                    "node_id": labels.get('node_id', 'unknown'),
                    "storage_gb": labels.get('storage_gb', '0'),
                })
            return result
        except Exception as e:
            logger.error(f"Error listing containers: {e}")
            return []

    def stop_container(self, node_id: str) -> bool:
        """Stop a storage node's container (but keep data intact)"""
        if not self.is_available():
            return False

        container_name = self._container_name(node_id)
        try:
            container = self.client.containers.get(container_name)
            container.stop()
            logger.info(f"Container stopped: {container_name}")
            return True
        except docker.errors.NotFound:
            logger.warning(f"Container not found: {container_name}")
            return False
        except Exception as e:
            logger.error(f"Error stopping container: {e}")
            return False

    def get_container_volume(self, node_id: str) -> Optional[str]:
        """Get the volume name for a storage node's container"""
        if not self.is_available():
            return None

        volume_name = self._volume_name(node_id)
        try:
            volume = self.client.volumes.get(volume_name)
            return volume.name
        except docker.errors.NotFound:
            return None
        except Exception as e:
            logger.error(f"Error getting volume: {e}")
            return None


# Global Docker service instance
_docker_service: Optional[DockerService] = None


def get_docker_service() -> DockerService:
    """Get or create the Docker service instance"""
    global _docker_service
    if _docker_service is None:
        _docker_service = DockerService()
    return _docker_service
