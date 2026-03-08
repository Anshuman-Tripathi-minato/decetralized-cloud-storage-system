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
VENV_DIR="$SCRIPT_DIR/.venv"

if [ ! -x "$VENV_DIR/bin/python" ] && [ ! -x "$VENV_DIR/bin/python3" ]; then
  echo "   ⚠️  Virtual environment is missing a Python binary. Recreating .venv..."
  SYS_PYTHON="$(command -v python3 || command -v python)"
  if [ -z "$SYS_PYTHON" ]; then
    echo "   ❌ No system Python found to rebuild virtual environment."
    exit 1
  fi
  rm -rf "$VENV_DIR"
  "$SYS_PYTHON" -m venv "$VENV_DIR" || {
    echo "   ❌ Failed to recreate virtual environment at $VENV_DIR"
    exit 1
  }
fi

source "$VENV_DIR/bin/activate"
PYTHON_BIN="$VENV_DIR/bin/python"
if [ ! -x "$PYTHON_BIN" ] && [ -x "$VENV_DIR/bin/python3" ]; then
  PYTHON_BIN="$VENV_DIR/bin/python3"
fi
if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="$(command -v python || command -v python3)"
fi
if [ -z "$PYTHON_BIN" ]; then
  echo "   ❌ No Python interpreter found in the active environment."
  exit 1
fi

if ! "$PYTHON_BIN" -c "import uvicorn" > /dev/null 2>&1; then
  echo "   📦 Installing backend dependencies..."
  "$PYTHON_BIN" -m pip install -r "$SCRIPT_DIR/backend/requirements.txt" > /tmp/decentrastore-backend-install.log 2>&1 || {
    echo "   ❌ Dependency install failed. Check /tmp/decentrastore-backend-install.log"
    exit 1
  }
fi

"$PYTHON_BIN" -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/decentrastore-backend.log 2>&1 &
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

if [ ! -x "$SCRIPT_DIR/frontend/node_modules/.bin/vite" ]; then
  echo "   📦 Installing frontend dependencies..."
  npm install > /tmp/decentrastore-frontend-install.log 2>&1 || {
    echo "   ❌ Frontend dependency install failed. Check /tmp/decentrastore-frontend-install.log"
    exit 1
  }
fi

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
