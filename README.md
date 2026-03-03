# 🛠️ DecentraStore — Decentralized Cloud Storage System

**ALL 5 SPRINTS COMPLETE ✅**

A fully functional prototype of a decentralized, peer-to-peer cloud storage system with:
- 🔐 RSA-2048 identity & signature-based authentication
- 🔒 AES-256-GCM client-side encryption with chunked storage
- 💾 MongoDB persistence layer
- 💰 AST token economy with storage pledging rewards
- 📊 Complete admin observability dashboard

Built with React 18, FastAPI, MongoDB, Web Crypto API, and Tailwind CSS.

---

## 📋 Project Structure

```
decetralized cloud storage system/
├── frontend/                      # React + Vite + Tailwind + Lucide
│   ├── src/
│   │   ├── App.jsx              # Main router with dual-portal layout
│   │   ├── main.jsx             # Entry point
│   │   ├── index.css            # Global glassmorphism styles
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx # Light/Dark mode (localStorage)
│   │   │   └── AuthContext.jsx  # User & Admin auth state
│   │   ├── layouts/
│   │   │   ├── PublicLayout.jsx # /app/* sidebar + topbar
│   │   │   └── AdminLayout.jsx  # /admin/* sidebar + topbar
│   │   ├── pages/
│   │   │   └── LandingPage.jsx  # Hero, features, stats (Page 1)
│   │   ├── components/
│   │   │   ├── shared/
│   │   │   │   ├── ThemeToggle.jsx
│   │   │   │   └── PlaceholderPage.jsx
│   │   │   ├── user/            # User portal components (Sprint 2+)
│   │   │   └── admin/           # Admin portal components (Sprint 5+)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Crypto, API, helpers
│   │   └── assets/              # Images, icons
│   ├── index.html               # HTML entry with Inter font
│   ├── package.json
│   ├── vite.config.js           # Vite + Tailwind config
│   └── tailwind.config.js       # Tailwind (generated)
│
├── backend/                       # FastAPI + MongoDB
│   ├── main.py                  # App factory, lifespan, CORS
│   ├── core/
│   │   ├── config.py            # Settings from .env
│   │   ├── database.py          # MongoDB motor client
│   │   └── security.py          # JWT creation & verification
│   ├── routers/
│   │   ├── health.py            # GET /api/health
│   │   ├── auth.py              # Register, login, JWT issuance
│   │   ├── storage.py           # Storage node management (Sprint 3)
│   │   ├── files.py             # Upload/retrieve (Sprint 4)
│   │   ├── admin.py             # Admin endpoints (Sprint 5)
│   │   ├── network.py           # P2P peer simulation
│   │   └── blockchain.py        # Hyperledger audit logs
│   ├── models/                  # Pydantic schemas (TBD)
│   ├── services/                # Business logic (TBD)
│   ├── utils/                   # Crypto utilities (TBD)
│   ├── requirements.txt
│   ├── .env                     # Config (MongoDB URI, JWT secret, etc.)
│   ├── run.sh                   # Startup script
│   └── README.md                # Backend docs
│
└── ui major project.pdf          # Design spec (reference)
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (npm)
- **Python** 3.13+ (or via pyenv)
- **MongoDB** 5.0+ (local or cloud) — optional for Sprint 1

### 1️⃣ Start the Backend (FastAPI)

```bash
cd backend
# Install dependencies (one time)
/home/minato/.pyenv/versions/3.13.0/bin/pip install -r requirements.txt

# Run the server
/home/minato/.pyenv/versions/3.13.0/bin/python -m uvicorn main:app --reload --port 8000
```

**Output:**
```
✅ 🚀 DecentraStore Orchestrator starting...
   ➜ API:  http://localhost:8000/api
   ➜ Docs: http://localhost:8000/api/docs
```

Test the health endpoint:
```bash
curl http://localhost:8000/api/health
```

---

### 2️⃣ Start the Frontend (React/Vite)

In a **new terminal**:

```bash
cd frontend
# Install dependencies (one time)
npm install

# Run the dev server
npm run dev
```

**Output:**
```
  VITE v7.3.1  ready in 306 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser to **http://localhost:5173/**

---

## 🎨 UI/UX Features (Sprint 1)

### ✅ Implemented
- **Global Light/Dark Theme** — Toggle saved to localStorage
- **Glassmorphism Design** — Soft gradients (#4A65F6 → #8A4DFF), backdrop blur
- **Landing Page (Page 1)** — Hero, 4 feature cards, network stats, CTA buttons
- **Public Portal Layout** — Sidebar nav, user badge, topbar with AST balance
- **Admin Portal Layout** — Sidebar nav, admin badge, topbar with system health
- **Route Guards** — `RequireAuth` and `RequireAdmin` wrappers
- **Placeholder Pages** — All Sprint 2–5 routes show coming-soon cards

### Color Palette
- **Primary:** `#4A65F6` (Indigo)
- **Secondary:** `#8A4DFF` (Purple)
- **Accent:** `#06D6A0` (Teal)
- **Danger:** `#FF4D6D` (Red)
- **Warning:** `#FFD166` (Gold)

---

## 🔐 Backend Features (Sprint 1)

### ✅ Implemented

#### Health Check
- `GET /api/health` — System status, DB connection, peer count

#### Authentication Stubs (Full impl in Sprint 2)
- `POST /api/auth/register` — Node registration with RSA public key
- `POST /api/auth/login` — Node authentication by signature
- `POST /api/auth/admin/login` — Admin login (username/password)

#### Network Simulation (Ready for Sprint 5)
- `GET /api/network/peers` — 20 random peer nodes
- `GET /api/network/topology` — Network graph nodes & edges
- `GET /api/network/metrics/history` — 24-hour simulated metrics

#### Blockchain Simulation (Ready for Sprint 5)
- `GET /api/blockchain/logs` — Hyperledger Fabric transaction history
- `GET /api/blockchain/logs/{tx_hash}` — Single transaction details
- `GET /api/blockchain/stats` — Chain stats & event breakdown

#### Admin Endpoints (Ready for Sprint 5)
- `GET /api/admin/stats` — Network-wide statistics
- `GET /api/admin/nodes` — Registered node registry
- `PATCH /api/admin/nodes/{node_id}/ban` — Ban a node
- `GET /api/admin/protocol` — Protocol configuration
- `PATCH /api/admin/protocol` — Update protocol settings

#### Storage & Files (Stubs for Sprints 3–4)
- `GET /api/storage/status` — Node storage pledge status
- `POST /api/storage/pledge` — Allocate storage contribution
- `POST /api/files/upload` — Placeholder for file upload
- `GET /api/files/retrieve/{cid}` — Placeholder for file retrieval
- `GET /api/files/list` — List user's uploaded files

---

### Database Schema (MongoDB)

Collections will be created with indexes on startup:

```javascript
// Users (nodes)
{
  _id: ObjectId,
  node_id: String (unique),
  public_key: String,
  public_key_fingerprint: String (unique),
  keystore_encrypted: String,
  token_balance: Number,
  storage_pledged_gb: Number,
  storage_used_gb: Number,
  is_active: Boolean,
  registered_at: ISODate,
  last_seen: ISODate,
  uptime_score: Number
}

// Files
{
  _id: ObjectId,
  cid: String (unique),
  owner_node_id: String,
  original_name: String,
  original_size: Number,
  encryption_key_hash: String,
  created_at: ISODate,
  chunk_count: Number
}

// Chunks
{
  _id: ObjectId,
  chunk_id: String (unique),
  cid: String,
  data_encrypted: Binary,
  replica_peers: [String],
  created_at: ISODate
}

// Blockchain Logs
{
  _id: ObjectId,
  tx_hash: String (unique),
  event_type: String,
  node_id: String,
  block_number: Number,
  channel: String,
  chaincode: String,
  timestamp: ISODate,
  status: String
}

// Token Transactions
{
  _id: ObjectId,
  node_id: String,
  amount: Number,
  tx_type: String,
  timestamp: ISODate,
  description: String
}
```

---

## 📁 Environment Configuration

### Backend `.env`
```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=decentrastore
JWT_SECRET=decentrastore_jwt_secret_change_in_production_2026
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
ADMIN_USERNAME=admin
ADMIN_PASSWORD=DecentraAdmin@2026
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend Proxy
Configured in `vite.config.js`:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  },
},
```

---

## 📚 Sprint Roadmap

| Sprint | Focus | Status |
|--------|-------|--------|
| **Sprint 1** | 🛠️ Foundation & Routing | ✅ **COMPLETE** |
| **Sprint 2** | 🔐 Identity & Authentication | ⏳ Next |
| **Sprint 3** | 💾 Storage Node & Tokenomics | ⏳ TBD |
| **Sprint 4** | 🚀 Upload & Retrieve Engine | ⏳ TBD |
| **Sprint 5** | 🏢 Admin Observability | ⏳ TBD |

---

## 🔗 Useful Links

- **Frontend:** http://localhost:5173/
  - Landing: `/`
  - Public Auth: `/app/login`, `/app/register`
  - Public Portal: `/app/dashboard`, `/app/upload`, `/app/retrieve`, `/app/storage`, `/app/wallet`
  - Admin Auth: `/admin/login`
  - Admin Portal: `/admin/dashboard`, `/admin/network`, `/admin/blockchain`, `/admin/settings`, `/admin/nodes`

- **Backend:**
  - API: http://localhost:8000/api
  - Docs (Swagger): http://localhost:8000/api/docs
  - ReDoc: http://localhost:8000/api/redoc
  - Health: http://localhost:8000/api/health

---

## 🛡️ Security Notes

- **Client-side encryption:** AES-256 (via crypto-js) — implemented in Sprint 4
- **Identity:** RSA-2048 keypair (locally generated) — implemented in Sprint 2
- **JWTs:** HS256 with 24h expiry — live in `/api/auth`
- **CORS:** Restricted to localhost (configurable in `.env`)
- **MongoDB:** Connection via Motor async driver (no blocking I/O)

---

## 🎯 Sprint Completion Status

### ✅ Sprint 1 — Foundation & Routing (COMPLETE)
- Vite React app with Tailwind CSS
- Dual-portal layouts (PublicLayout /app/\*, AdminLayout /admin/\*)
- ThemeContext, AuthContext
- LandingPage with glassmorphism design
- FastAPI backend with MongoDB, router stubs, health endpoint

### ✅ Sprint 2 — Identity & Authentication (COMPLETE)
- RSA-2048 keypair generation with Web Crypto API
- Signature-based authentication (challenge-response)
- RegisterPage (5-step flow with keystore download)
- LoginPage (3-step challenge signing)
- AdminLoginPage with bcrypt password hashing
- JWT token system (HS256, 24-hour expiry)

### ✅ Sprint 3 — File Upload & Encryption (COMPLETE)
- AES-256-GCM client-side encryption
- File chunking (256KB chunks)
- CID generation (SHA-256 hash)
- UploadPage (4-step: select → encrypt → upload → complete)
- FilesPage (browse, download/decrypt, delete)
- Backend chunk upload/retrieval endpoints

### ✅ Sprint 4 — Storage & Tokenomics (COMPLETE)
- DashboardPage with stats cards and activity feed
- StoragePage with pledge slider and earnings calculator
- WalletPage with transaction history
- AST token rewards (0.5 AST/GB/day)
- Backend storage pledge endpoint
- /auth/me endpoint for user data

### ✅ Sprint 5 — Admin Dashboard & Observability (COMPLETE)
- AdminDashboardPage with global network stats
- NetworkMonitorPage with P2P peer table
- BlockchainLogsPage with transaction audit trail
- NodeRegistryPage with ban/unban functionality
- ProtocolSettingsPage with configuration controls
- Enhanced backend admin endpoints

---

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** — Installation and setup guide
- **[SPRINT_5_SUMMARY.md](./SPRINT_5_SUMMARY.md)** — Complete Sprint 5 feature documentation

---

## 🤝 Contributing

This is a prototype for a UI/UX Major Project. All code follows:
- **Clean, minimal Web3 startup aesthetic**
- **Glassmorphism design system**
- **Responsive 1440px canvas grid**
- **Light/Dark mode support**
- **Zero external UI library dependencies** (except Lucide icons)

---

## 📄 License

This project is part of a UI/UX Major Project (2026). All rights reserved.

---

**Last Updated:** February 19, 2026  
**Project Status:** ✅ ALL 5 SPRINTS COMPLETE  
**Next Steps:** See SPRINT_5_SUMMARY.md for future enhancement suggestions
