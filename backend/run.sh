#!/bin/bash
# DecentraStore Backend Launcher
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON="/home/minato/.pyenv/versions/3.13.0/bin/python"

echo "🚀 Starting DecentraStore FastAPI Backend..."
echo "   ➜ API:  http://localhost:8000/api"
echo "   ➜ Docs: http://localhost:8000/api/docs"
echo ""

$PYTHON -m uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --log-level info
