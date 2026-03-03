# 🎯 DecentraStore — QUICK START GUIDE

## ✅ Sprint 1 Complete — System is READY!

---

## 🚀 How to Start Everything

### Option 1: Use the Startup Script (Recommended)
```bash
cd "/home/minato/Desktop/decetralized cloud storage system"
./start.sh
```

### Option 2: Manual Start

**Terminal 1 — Backend:**
```bash
cd backend
/home/minato/.pyenv/versions/3.13.0/bin/python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

---

## 📍 Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Landing Page** | http://localhost:5173/ | Hero section, features, network stats |
| **User Login** | http://localhost:5173/app/login | Decentralized login placeholder |
| **User Register** | http://localhost:5173/app/register | Node setup placeholder |
| **Admin Login** | http://localhost:5173/admin/login | Admin portal placeholder |
| **API Docs** | http://localhost:8000/api/docs | Interactive Swagger UI |
| **Health Check** | http://localhost:8000/api/health | System status JSON |

---

## 🎨 What You'll See

### Landing Page Features:
- ✅ Glassmorphism design with purple/indigo gradients
- ✅ Light/Dark theme toggle (top-right)
- ✅ 4 feature cards (AES-256, P2P, Earn Tokens, Zero Trust)
- ✅ Live network stats (847 nodes, 2.4 TB stored, 99.97% uptime)
- ✅ Call-to-action buttons: "Setup Your Node" and "Connect Existing Node"
- ✅ Responsive layout with floating animated orbs

### User Portal (`/app/*`):
- Sidebar navigation with 5 routes
- User badge showing node ID
- Token balance displayed in topbar
- All pages show "Coming in Sprint X" placeholders

### Admin Portal (`/admin/*`):
- Enterprise-style sidebar with admin badge
- Network health indicators
- 5 control panel routes
- Purple/indigo gradient theme

---

## 🧪 Test the APIs

```bash
# Health check
curl http://localhost:8000/api/health

# Simulated network peers
curl http://localhost:8000/api/network/peers

# Network topology for graph
curl http://localhost:8000/api/network/topology

# Blockchain logs (Hyperledger simulation)
curl http://localhost:8000/api/blockchain/stats
```

---

## 🔍 Check System Status

```bash
./status.sh
```

Example output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 DecentraStore — Status Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Backend (FastAPI):
   ✅ Running at http://localhost:8000
   
🎨 Frontend (React + Vite):
   ✅ Running at http://localhost:5173
   
💾 MongoDB:
   ⚠️  Not connected (optional for Sprint 1)
```

---

## 🛑 Stop All Services

```bash
killall -9 python uvicorn node npm
```

---

## 📂 Project Structure

```
decetralized cloud storage system/
├── frontend/          # React + Vite + Tailwind
│   ├── src/
│   │   ├── App.jsx              # Router with dual portals
│   │   ├── context/             # Theme & Auth contexts
│   │   ├── layouts/             # PublicLayout & AdminLayout
│   │   ├── pages/               # LandingPage + placeholders
│   │   └── components/          # Shared components
│   └── package.json
│
├── backend/           # FastAPI + MongoDB
│   ├── main.py                  # App factory
│   ├── core/                    # Config, DB, Security
│   ├── routers/                 # API endpoints
│   └── requirements.txt
│
├── start.sh          # Startup script
├── status.sh         # Status checker
└── README.md         # Full documentation
```

---

## 🎯 What's Implemented (Sprint 1)

### Frontend:
- [x] Vite + React setup
- [x] Tailwind CSS with glassmorphism utilities
- [x] Light/Dark theme with localStorage
- [x] React Router with dual-portal architecture
- [x] Landing page (Page 1 from PDF spec)
- [x] PublicLayout sidebar + topbar
- [x] AdminLayout sidebar + topbar
- [x] Route guards (RequireAuth, RequireAdmin)
- [x] Placeholder pages for all Sprint 2-5 routes

### Backend:
- [x] FastAPI app with CORS
- [x] MongoDB connection (optional for Sprint 1)
- [x] JWT authentication helpers
- [x] Health check endpoint
- [x] Auth stubs (register, login, admin login)
- [x] Network simulation endpoints
- [x] Blockchain logs simulation
- [x] Admin endpoints (stats, nodes, protocol)
- [x] Storage & Files stubs

---

## 🐛 Troubleshooting

### Frontend not loading?
```bash
cd frontend
npm install
npm run dev
```

### Backend errors?
```bash
cd backend
/home/minato/.pyenv/versions/3.13.0/bin/pip install -r requirements.txt
/home/minato/.pyenv/versions/3.13.0/bin/python -m uvicorn main:app --reload
```

### Port conflicts?
```bash
# Check what's using port 8000 or 5173
lsof -ti:8000
lsof -ti:5173

# Kill the process
kill -9 <PID>
```

### MongoDB warning?
MongoDB is **optional** for Sprint 1. The system runs without it.  
To install MongoDB:
```bash
sudo apt install mongodb  # Ubuntu/Debian
brew install mongodb-community  # macOS
```

---

## 📚 Next Steps — Sprint 2

**Goal:** Identity & Authentication  
**Tasks:**
1. Build RSA-2048 keypair generator in React
2. Build Node Setup UI (download keystore.json)
3. Build Decentralized Login UI (upload keystore + sign challenge)
4. Build Admin Login UI (username/password)
5. Implement JWT route guards
6. Create protected route wrappers

**Files to create:**
- `frontend/src/utils/crypto.js` — RSA keygen, signing
- `frontend/src/pages/user/RegisterPage.jsx`
- `frontend/src/pages/user/LoginPage.jsx`
- `frontend/src/pages/admin/AdminLoginPage.jsx`
- Update `backend/routers/auth.py` with signature verification

---

## 🎉 Success Criteria

If you can see:
- ✅ Landing page at http://localhost:5173/
- ✅ Theme toggle switches between light/dark
- ✅ "Setup Your Node" button navigates to `/app/register`
- ✅ "Connect Existing Node" button navigates to `/app/login`
- ✅ API docs at http://localhost:8000/api/docs
- ✅ Health endpoint returns JSON with 200 status

**Then Sprint 1 is COMPLETE!** 🚀

---

**Last Updated:** February 19, 2026  
**Status:** ✅ All services running  
**Next Sprint:** Sprint 2 — Identity & Authentication
