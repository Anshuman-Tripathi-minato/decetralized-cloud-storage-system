# DecentraStore Provider Agent

Run this agent on each storage provider machine (Node B, Node C, ...).

It enables the orchestrator backend to:
1. Create Docker storage containers on the provider machine.
2. Write uploaded encrypted chunks to that provider machine storage path.

## Why this exists

Without this agent, the central backend can only create Docker containers on its own host.
With this agent, storage is provisioned where the provider actually runs Docker (Windows, Linux, or macOS).

## Setup

1. Install Docker Desktop / Docker Engine and ensure Docker daemon is running.
2. Install Python 3.10+.
3. Install dependencies:

```bash
pip install -r provider_agent/requirements.txt
```

4. Optional security token (recommended):

Linux/macOS:
```bash
export NODE_AGENT_SHARED_TOKEN="change-me"
```

Windows PowerShell:
```powershell
$env:NODE_AGENT_SHARED_TOKEN="change-me"
```

5. Start agent:

```bash
uvicorn provider_agent.agent:app --host 0.0.0.0 --port 8765
```

## Configure in web app

In Storage Node page:
1. Enter Provider Node Agent URL, e.g. `http://192.168.1.25:8765`
2. Enter provider machine storage folder path:
   - Linux: `/home/user/decentrastore-storage`
   - macOS: `/Users/user/decentrastore-storage`
   - Windows: `C:\Users\user\decentrastore-storage`
3. Pledge storage.

The backend will call this provider agent and container/chunk data will be created on this provider machine.
