"""Network Router — P2P peer simulation."""
from fastapi import APIRouter
import random
import uuid

router = APIRouter()

# Simulated peer regions
REGIONS = ["US-East", "EU-West", "AP-South", "US-West", "EU-Central", "AP-East", "SA-East"]
NODE_TYPES = ["Full Node", "Storage Node", "Gateway Node"]


def _simulate_peer(i: int) -> dict:
    region = random.choice(REGIONS)
    latency = random.randint(10, 200)
    storage_gb = random.randint(10, 500)
    status = "online" if random.random() > 0.1 else "offline"
    return {
        "node_id": f"node-{uuid.uuid4().hex[:8]}",
        "ip_address": f"192.168.{random.randint(0, 255)}.{random.randint(1, 254)}",
        "region": region,
        "node_type": random.choice(NODE_TYPES),
        "status": status,
        "latency_ms": latency,
        "storage_pledged_gb": storage_gb,
        "files_stored": random.randint(0, 1000),
        "uptime_pct": round(random.uniform(95, 99.9), 1),
        "last_seen": "Just now" if status == "online" else f"{random.randint(1, 60)} min ago",
    }


@router.get("/peers")
async def get_peers(limit: int = 20):
    """Get simulated P2P peer list."""
    peers = [_simulate_peer(i) for i in range(min(limit, 100))]
    return {
        "total_peers": 847,
        "online_peers": 831,
        "degraded_peers": 12,
        "offline_peers": 4,
        "peers": peers,
    }


@router.get("/topology")
async def get_topology():
    """Get simulated network topology data for graph visualization."""
    nodes = [
        {
            "id": f"peer_{i}",
            "region": random.choice(REGIONS),
            "latency": random.randint(5, 200),
            "x": random.uniform(-180, 180),
            "y": random.uniform(-90, 90),
            "size": random.randint(5, 20),
            "status": random.choice(["online", "online", "online", "degraded"]),
        }
        for i in range(30)
    ]
    edges = [
        {"source": f"peer_{random.randint(0,29)}", "target": f"peer_{random.randint(0,29)}"}
        for _ in range(45)
    ]
    return {"nodes": nodes, "edges": edges}


@router.get("/metrics/history")
async def metrics_history():
    """Return simulated time-series metrics for charts."""
    import random
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    data = []
    for i in range(24):
        ts = now - timedelta(hours=23 - i)
        data.append({
            "timestamp": ts.strftime("%H:00"),
            "active_nodes": random.randint(820, 860),
            "storage_tb": round(2.0 + i * 0.02 + random.uniform(-0.05, 0.05), 2),
            "requests_per_min": random.randint(120, 480),
            "avg_latency_ms": random.randint(18, 55),
            "token_minted": round(random.uniform(10, 50), 2),
        })
    return {"interval": "hourly", "data": data}
