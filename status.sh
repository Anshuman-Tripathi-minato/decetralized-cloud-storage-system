#!/bin/bash
# DecentraStore — Quick Status Check

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DecentraStore — Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Backend
echo "📡 Backend (FastAPI):"
if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
  echo "   ✅ Running at http://localhost:8000"
  echo "   ➜ API Docs: http://localhost:8000/api/docs"
  echo "   ➜ Health:   http://localhost:8000/api/health"
else
  echo "   ❌ NOT RUNNING"
  echo "   ➜ Start: cd backend && ./run.sh"
fi

echo ""

# Frontend
echo "🎨 Frontend (React + Vite):"
if curl -s http://localhost:5173/ > /dev/null 2>&1; then
  echo "   ✅ Running at http://localhost:5173"
  echo "   ➜ Landing:  http://localhost:5173/"
  echo "   ➜ Login:    http://localhost:5173/app/login"
  echo "   ➜ Register: http://localhost:5173/app/register"
else
  echo "   ❌ NOT RUNNING"
  echo "   ➜ Start: cd frontend && npm run dev"
fi

echo ""

# Database
echo "💾 MongoDB:"
if curl -s http://localhost:8000/api/health | grep -q '"database":"connected"'; then
  # Check if it's actually MongoDB (not in-memory)
  if mongosh decentrastore --eval "db.stats()" --quiet &>/dev/null; then
    echo "   ✅ Connected to MongoDB"
    echo "   ➜ Database: decentrastore"
  else
    echo "   ✅ Connected (in-memory mode)"
  fi
else
  echo "   ⚠️  Not connected"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Sprint 1: Foundation & Routing ✅ COMPLETE"
echo "Sprint 2: Identity & Authentication ✅ COMPLETE"
echo "Sprint 3: File Upload & Encryption ✅ COMPLETE"
echo "Sprint 4: Storage & Tokenomics ✅ COMPLETE"
echo "Sprint 5: Admin Dashboard & Observability ✅ COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
