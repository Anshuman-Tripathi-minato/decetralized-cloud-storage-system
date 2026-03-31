# DecentraStore

A decentralized cloud storage prototype with:
- RSA keypair-based user identity
- client-side AES-256-GCM file encryption
- chunked file upload and retrieval
- storage pledging with AST token rewards
- Docker-backed per-node storage containers
- admin observability for nodes, files, network, and blockchain logs

## Current Status

All core sprint features are implemented in the current codebase:
- user register/login with keystore-based RSA signature auth
- admin login with JWT auth
- user storage pledge flow with folder selection and Docker mount path
- per-file storage node mapping (node IDs and IPs)
- admin storage distribution view with search/filter
- user dashboard distribution summary (nodes storing user data)
- notification bell popovers in both user and admin layouts
- resilient local startup script with health-check retries

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

- Linux or macOS (Linux tested)
- Python 3.10+ (3.13 tested)
- Node.js 18+ and npm
- Docker Engine (required for storage container features)
- Optional: MongoDB (if unavailable, backend falls back to in-memory mode)

## Project Structure

- `backend/` FastAPI API, auth, storage, files, admin, network, blockchain
- `frontend/` React portal (user + admin)
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
- `DOCKER_ENABLED=true` is required to create pledged storage containers.
- If Docker host env is misconfigured, backend tries common Linux unix socket fallbacks automatically.

### Frontend

Set `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

If omitted, frontend auto-uses localhost API when running on localhost.

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

## Storage Pledge and Docker Container Flow

Storage page now enforces full flow:
1. user grants storage access in browser
2. user enters absolute Docker host folder path
3. user pledges storage in GB
4. backend creates/recreates per-node Docker container
5. selected host folder is bind-mounted into container
6. quota is applied based on total pledged GB (hard quota when storage driver supports it)

### Storage APIs
- `GET /api/storage/status`
- `POST /api/storage/pledge`
- `GET /api/storage/container/status`
- `GET /api/storage/containers/list`

Important behavior:
- pledge fails if absolute host path is missing
- pledge fails if Docker container cannot be created
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
- fallback hydration for old records without `storage_nodes`

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

## Local Troubleshooting

### 1) Frontend shows `ERR_NAME_NOT_RESOLVED` or `Failed to fetch`
- ensure `frontend/.env` has `VITE_API_URL=http://localhost:8000`
- restart frontend after env changes
- hard refresh browser

### 2) Console shows CORS error with backend 500
- check backend logs first; many "CORS" messages are secondary to server exceptions
- inspect `/tmp/decentrastore-backend.log`

### 3) User sees `User not found` after restart
- in-memory DB mode does not persist users across restart
- register/login again to create fresh session

### 4) Docker container creation fails
- confirm Docker daemon is running
- ensure `DOCKER_ENABLED=true`
- verify host path is absolute and writable

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
