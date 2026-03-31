#!/bin/bash
# DecentraStore — Complete Startup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_venv_python() {
  local venv_dir="$1"
  local candidate

  for candidate in "$venv_dir/bin/python" "$venv_dir/bin/python3" "$venv_dir/bin/python"*; do
    if [ -x "$candidate" ] && [ -f "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

find_python() {
  local candidate

  for candidate in python3 python python3.13 python3.12 python3.11 python3.10 python3.9 python3.8; do
    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done

  # Some slim deployment images expose only versioned python3 binaries.
  for candidate in /usr/bin/python3* /usr/local/bin/python3*; do
    if [ -x "$candidate" ] && [ -f "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

wait_for_http_ok() {
  local url="$1"
  local timeout_seconds="$2"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    if curl -s "$url" > /dev/null 2>&1; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  return 1
}

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

VENV_PYTHON="$(find_venv_python "$VENV_DIR" || true)"

if [ -z "$VENV_PYTHON" ]; then
  echo "   ⚠️  Virtual environment is missing a Python binary. Recreating .venv..."
  SYS_PYTHON="$(find_python || true)"
  if [ -z "$SYS_PYTHON" ]; then
    echo "   ❌ No system Python found to rebuild virtual environment."
    exit 1
  fi
  rm -rf "$VENV_DIR"
  "$SYS_PYTHON" -m venv "$VENV_DIR" || {
    echo "   ❌ Failed to recreate virtual environment at $VENV_DIR"
    exit 1
  }
  VENV_PYTHON="$(find_venv_python "$VENV_DIR" || true)"
fi

source "$VENV_DIR/bin/activate"
PYTHON_BIN="$VENV_PYTHON"
if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="$(find_python || true)"
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

cd "$SCRIPT_DIR"
"$PYTHON_BIN" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 > /tmp/decentrastore-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Test backend
if wait_for_http_ok "http://localhost:8000/api/health" 20; then
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

# Test frontend
if wait_for_http_ok "http://localhost:5173/" 30; then
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
