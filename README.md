# DecentraStore

A decentralized cloud storage prototype with:
- RSA keypair-based user identity
- client-side AES-256-GCM file encryption
- chunked file upload and retrieval
- storage pledging with AST token rewards
- upload charging at `1 MB = 0.5 AST`
- storage-hosting rewards distributed to nodes that store chunks
- signup bonus of `50 AST` on first registration
- provider-agent Docker containers on provider machines
- admin observability for nodes, files, network, and blockchain logs

## Current Status

All core sprint features are implemented in the current codebase:
- user register/login with keystore-based RSA signature auth
- admin login with JWT auth
- user storage pledge flow with provider agent URL + provider folder path
- remote container provisioning on provider machines (not backend host)
- chunk replication to provider nodes through provider-agent API
- per-file storage node mapping (node IDs and IPs)
- admin storage distribution view with search/filter
- user dashboard distribution summary (nodes storing user data)
- notification bell popovers in both user and admin layouts
- resilient local startup script with health-check retries
- blockchain logs normalized by category for admin charts and filters

## Screenshots

**Wireframe/site map diagram**
![Wireframe/site map diagram](docs/screenshots/Screenshot%20from%202026-02-19%2021-54-29.png)

**Landing page "How it Works" and "Built for Zero Trust" sections**
![Landing page overview](docs/screenshots/Screenshot%20from%202026-04-29%2019-38-16.png)
![Built for Zero Trust section](docs/screenshots/Screenshot%20from%202026-04-29%2019-39-11.png)
![How DecentraStore Works section](docs/screenshots/Screenshot%20from%202026-04-29%2019-39-36.png)
![Landing page call to action](docs/screenshots/Screenshot%20from%202026-04-29%2019-39-45.png)

**Setup Your Storage Node/Generate Keypair screen**
![Setup Your Storage Node](docs/screenshots/Screenshot%20from%202026-04-29%2019-40-12.png)

**Connect Your Node / keystore upload screen**
![Connect Your Node](docs/screenshots/Screenshot%20from%202026-04-29%2019-40-26.png)

**Keypair Generated Successfully screen**
![Keypair Generated Successfully](docs/screenshots/Screenshot%20from%202026-04-29%2019-40-40.png)

**Welcome to DecentraStore / Node Active screen**
![Welcome to DecentraStore](docs/screenshots/Screenshot%20from%202026-04-29%2019-40-47.png)

**Node Dashboard (user portal overview)**
![Node Dashboard](docs/screenshots/Screenshot%20from%202026-04-29%2019-40-57.png)

**User dashboard recent activity and quick actions**
![Recent Activity and Quick Actions](docs/screenshots/Screenshot%20from%202026-04-29%2019-41-09.png)

**Upload File page & My Files page**
![Upload File page](docs/screenshots/Screenshot%20from%202026-04-29%2019-41-17.png)
![Upload file selected](docs/screenshots/Screenshot%20from%202026-04-30%2000-22-15.png)
![Upload successful](docs/screenshots/Screenshot%20from%202026-04-30%2000-22-56.png)
![My Files page](docs/screenshots/Screenshot%20from%202026-04-30%2000-23-46.png)

**Storage Node - Current Pledge / Pledge Additional Storage**
![Storage Node pledge](docs/screenshots/Screenshot%20from%202026-04-29%2019-41-35.png)

**Storage Node - Provider Node Agent URL + Docker folder**
![Storage Node provider agent URL](docs/screenshots/Screenshot%20from%202026-04-29%2019-41-46.png)

**Storage Node - Successfully pledged 10 GB confirmation**
![Storage pledge confirmation](docs/screenshots/Screenshot%20from%202026-04-29%2019-42-02.png)

**Storage Container - Running, Container ID, Allocated Storage**
![Storage container running](docs/screenshots/Screenshot%20from%202026-04-29%2019-42-14.png)

**AST Wallet - Transaction History + Earn/Spend More AST**
![AST Wallet balance](docs/screenshots/Screenshot%20from%202026-04-30%2000-33-42.png)
![AST Wallet summary](docs/screenshots/Screenshot%20from%202026-04-30%2000-34-05.png)
![AST Wallet transaction history](docs/screenshots/Screenshot%20from%202026-04-30%2000-34-51.png)

**Admin Console login screen**
![Admin Console login](docs/screenshots/a/Screenshot%20from%202026-04-29%2019-43-25.png)

**Admin Global Dashboard displaying real-time network statistics retrieved via GET /api/admin/stats - showing Active Peers, Throughput, Total Nodes, Stored Files, Total Storage, and Network Health status.**
![Admin Global Dashboard](docs/screenshots/a/Screenshot%20from%202026-04-30%2000-40-07.png)

**File Storage Distribution view in Admin Dashboard - demonstrating the files, chunks, and storage_containers MongoDB collections working together, showing CID, replica count, chunk count, owner node ID, and active storage node assignment.**
![File Storage Distribution](docs/screenshots/a/Screenshot%20from%202026-04-30%2000-41-44.png)

**Network Monitor (P2P Topology, Peer Node Status table)**
![Network Monitor](docs/screenshots/a/Screenshot%20from%202026-04-30%2000-40-39.png)

**Blockchain Logs (Transaction History with TX hashProtocol)**
![Blockchain Logs](docs/screenshots/a/Screenshot%20from%202026-04-30%2000-40-49.png)

**Protocol Settings (Replication Factor, Chunk Size, Tokenomics)**
![Protocol Settings](docs/screenshots/a/Screenshot%20from%202026-04-30%2000-42-19.png)

**Node Registry (2 registered nodes with balances, storage pledged)**
![Node Registry](docs/screenshots/a/Screenshot%20from%202026-04-30%2000-42-34.png)

## Tech Stack

### Backend
- FastAPI 0.115.6
- Uvicorn 0.34.0
- Motor 3.7.0 / PyMongo 4.10.1
- python-jose 3.3.0
- Docker SDK for Python 7.1.0
- requests-unixsocket 0.4.1

### Frontend
- React 19.2.0
- React Router DOM 7.13.0
- Vite 7.3.1
- Tailwind CSS 4.2.0
- Lucide React 0.575.0

## Prerequisites

- Linux, macOS, or Windows
- Python 3.10+ (3.13 tested)
- Node.js 18+ and npm
- Docker Engine / Docker Desktop on each provider machine
- Optional: MongoDB (if unavailable, backend falls back to in-memory mode)

## Project Structure

- `backend/` FastAPI API, auth, storage, files, admin, network, blockchain
- `frontend/` React portal (user + admin)
- `provider_agent/` FastAPI node agent to provision provider-side Docker containers and write chunks
- `start.sh` one-command startup for backend and frontend

## Quick Start (Recommended)

From repo root:

```bash
./start.sh
```

This script will:
1. bootstrap/use `/.venv`
2. install missing backend deps
3. start backend on `http://localhost:8000`
4. install missing frontend deps
5. start frontend on `http://localhost:5173`
6. wait until both are healthy

### URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api`
- Swagger Docs: `http://localhost:8000/api/docs`

## Provider Agent (Required For Real Provider Storage)

Run provider agent on each storage provider machine (Node B, Node C, ...):

```bash
cd '/home/minato/Desktop/decetralized cloud storage system'
source .venv/bin/activate
uvicorn provider_agent.agent:app --host 0.0.0.0 --port 8765
```

Important:
- Use `--host 0.0.0.0` for reachable agent from backend/other nodes.
- `--host 127.0.0.1` only allows local-loopback access.

Background mode example:

```bash
cd '/home/minato/Desktop/decetralized cloud storage system' && source .venv/bin/activate && nohup uvicorn provider_agent.agent:app --host 0.0.0.0 --port 8765 > /tmp/decentrastore-provider-agent.log 2>&1 & echo $!
```

## Environment Configuration

### Backend

Set values in `backend/.env` (or root `.env`):

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=decentrastore
DOCKER_ENABLED=true
JWT_SECRET=decentrastore_jwt_secret_change_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
ADMIN_USERNAME=admin
ADMIN_PASSWORD=DecentraAdmin@2026
```

Notes:
- `DOCKER_ENABLED=true` is required for legacy local Docker mode.
- If Docker host env is misconfigured, backend tries common Linux unix socket fallbacks automatically.

### Frontend

Set `frontend/.env`:

```env
VITE_API_URL=/api
```

If omitted, frontend uses the local Vite `/api` proxy when running on localhost and the deployed API root in production.

## Authentication Flows

### User Auth
- Register: `POST /api/auth/register`
- Login: `POST /api/auth/login` (RSA signature challenge)
- Profile: `GET /api/auth/me`

### Admin Auth
- Login: `POST /api/auth/admin/login`

Default dev credentials:
- username: `admin`
- password: `DecentraAdmin@2026`

## Storage Pledge and Provider Container Flow

Storage page now enforces full flow:
1. user grants storage access in browser
2. user enters provider node agent URL (example: `http://192.168.1.25:8765`)
3. user enters provider machine absolute storage path
4. user pledges storage in GB
5. backend calls provider agent on provider machine
6. provider machine creates/recreates Docker container with bind mount
7. quota is applied based on total pledged GB (hard quota when storage driver supports it)

### Storage APIs
- `GET /api/storage/status`
- `POST /api/storage/pledge`
- `GET /api/storage/container/status`
- `GET /api/storage/containers/list`

Important behavior:
- pledge fails if absolute host path is missing
- pledge fails if provider agent URL is missing/unreachable
- pledge fails if provider-side container cannot be created
- response includes mount source/type and quota enforcement state

## File Upload and Distribution

### File APIs
- `POST /api/files/upload`
- `POST /api/files/chunks/upload`
- `GET /api/files/list`
- `GET /api/files/distribution/summary`
- `GET /api/files/{cid}`
- `GET /api/files/{cid}/chunks`
- `DELETE /api/files/{cid}`

Current behavior:
- file metadata stores storage node mapping (`node_id`, `ip_address`, `region`, `is_active`)
- chunk records include replica metadata
- encrypted chunks are pushed to provider agent endpoints for provider-side storage
- fallback hydration for old records without `storage_nodes`
- upload fee is charged once at metadata creation and shared with successful storage-node replicas
- provider storage nodes receive `upload_hosting` rewards in wallet history
- deleting a file removes all chunks from provider nodes and from the database

### AST Economics

- Upload cost: `1 MB = 0.5 AST`
- Signup reward: `50 AST`
- Storage hosting reward: split from upload fees among nodes that successfully store chunks
- Daily storage reward: `0.5 AST per GB per day`

## Admin Observability

### Admin APIs
- `GET /api/admin/stats`
- `GET /api/admin/nodes`
- `GET /api/admin/storage-distribution`
- `PATCH /api/admin/nodes/{node_id}/ban`
- `GET /api/admin/protocol`
- `PATCH /api/admin/protocol`

Admin dashboard includes:
- network/system summary metrics
- storage distribution summary and per-file placement details
- search/filter by CID, owner node, node ID, IP, active/inactive state
- node registry with node IDs, IPs, files stored, chunks hosted, pledged storage

## Network and Blockchain

### Network APIs
- `GET /api/network/peers`
- `GET /api/network/topology`
- `GET /api/network/metrics/history`

### Blockchain APIs
- `GET /api/blockchain/logs`
- `GET /api/blockchain/logs/{tx_hash}`
- `GET /api/blockchain/stats`

Blockchain log categories in the admin UI:
- `register`
- `upload`
- `download`
- `pledge`
- `reward`
- `delete`

## Local Troubleshooting

### 1) Frontend shows `ERR_NAME_NOT_RESOLVED` or `Failed to fetch`
- ensure `frontend/.env` has `VITE_API_URL=/api`
- restart frontend after env changes
- hard refresh browser

### 2) Console shows CORS error with backend 500
- check backend logs first; many "CORS" messages are secondary to server exceptions
- inspect `/tmp/decentrastore-backend.log`

### 3) Upload still fails on localhost
- restart the Vite dev server after changing `frontend/.env`
- confirm the browser request goes to `http://localhost:5173/api/files/upload`
- if the request still targets `http://localhost:8000`, clear browser cache and hard refresh

### 4) User sees `User not found` after restart
- in-memory DB mode does not persist users across restart
- register/login again to create fresh session

### 5) Docker container creation fails
- confirm Docker daemon is running
- ensure provider agent is running on provider machine and reachable
- verify provider agent URL in storage page is correct
- verify provider machine host path is absolute and writable

### 6) Storage page says `Please provide provider agent URL`
- run provider agent first on provider machine (port `8765`)
- use reachable URL in UI (example `http://<provider-ip>:8765`)
- for same machine local testing, use `http://localhost:8765`

## Logs and Service Management

Backend log:

```bash
tail -f /tmp/decentrastore-backend.log
```

Frontend log:

```bash
tail -f /tmp/decentrastore-frontend.log
```

Stop services:

```bash
killall -9 python uvicorn node npm
```

## Security Notes

- user files are encrypted client-side before upload
- JWT protects user/admin endpoints
- admin and user sessions are stored separately in localStorage
- CORS is restricted to known local and deployed origins

## License

Prototype/research project for decentralized storage experimentation.
