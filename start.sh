#!/bin/bash
# DecentraStore — Complete Startup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DecentraStore — Starting All Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
killall -9 python uvicorn node npm 2>/dev/null
sleep 2

# Start Backend
echo ""
echo "📡 Starting Backend (FastAPI)..."
cd "$SCRIPT_DIR/backend"
source "$SCRIPT_DIR/.venv/bin/activate"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/decentrastore-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 3

# Test backend
if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
  echo "   ✅ Backend is running"
else
  echo "   ❌ Backend failed to start. Check /tmp/decentrastore-backend.log"
  exit 1
fi

# Start Frontend
echo ""
echo "🎨 Starting Frontend (React + Vite)..."
cd "$SCRIPT_DIR/frontend"
npm run dev > /tmp/decentrastore-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
sleep 4

# Test frontend
if curl -s http://localhost:5173/ > /dev/null 2>&1; then
  echo "   ✅ Frontend is running"
else
  echo "   ❌ Frontend failed to start. Check /tmp/decentrastore-frontend.log"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All services started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Access URLs:"
echo "   🌐 Frontend:  http://localhost:5173/"
echo "   📡 Backend:   http://localhost:8000/api"
echo "   📚 API Docs:  http://localhost:8000/api/docs"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/decentrastore-backend.log"
echo "   Frontend: tail -f /tmp/decentrastore-frontend.log"
echo ""
echo "🛑 To stop all services:"
echo "   killall -9 python uvicorn node npm"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
