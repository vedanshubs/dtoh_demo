#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "================================================"
echo "  UBS eScreen MCP Demo - Starting Services"
echo "================================================"
echo ""

# --- Kill any stale processes on our ports ---
for port in 8005 8006 8010 5173 5174; do
    pids=$(lsof -ti :$port 2>/dev/null || true)
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null && echo "      Cleared stale process on port $port" || true
done

# --- MySQL Docker container ---
echo "[1/6] Ensuring MySQL container is running..."
if ! sudo docker ps --format "{{.Names}}" | grep -q "^escreen-db$"; then
    sudo docker start escreen-db
    echo "      Started escreen-db. Waiting 5s for MySQL to be ready..."
    sleep 5
else
    echo "      escreen-db already running."
fi

# --- MCP Server ---
echo "[2/6] Starting MCP server (port 8010)..."
cd "$ROOT/mcp-server"
source .venv/bin/activate
PYTHONPATH=. python3 server_http.py &
MCP_PID=$!
deactivate 2>/dev/null || true

# --- Clinic Booking API ---
echo "[3/6] Starting Clinic-Booking API server (port 8005)..."
cd "$ROOT/clinic-booking/api-server"
if [ -d ".venv" ]; then
    source .venv/bin/activate
    PYTHONUNBUFFERED=1 uvicorn main:app --port 8005 --log-level info &
    deactivate 2>/dev/null || true
elif [ -d "venv" ]; then
    source venv/bin/activate
    PYTHONUNBUFFERED=1 uvicorn main:app --port 8005 --log-level info &
    deactivate 2>/dev/null || true
else
    PYTHONUNBUFFERED=1 python3 -m uvicorn main:app --port 8005 --log-level info &
fi
CLINIC_API_PID=$!

# Wait for clinic API to be ready before starting frontend
echo "      Waiting for Clinic API to be ready..."
for i in $(seq 1 20); do
    if curl -sf http://localhost:8005/api/donors > /dev/null 2>&1; then
        echo "      Clinic API is up."
        break
    fi
    sleep 1
done

# --- Clinic Booking Frontend ---
echo "[4/6] Starting Unified Frontend (port 5173)..."
cd "$ROOT/clinic-booking/frontend"
npm run dev &
CLINIC_FE_PID=$!

# --- Data-Viz API ---
echo "[5/6] Starting Data-Viz API server (port 8006)..."
cd "$ROOT/data-viz/api-server"
if [ -d ".venv" ]; then
    source .venv/bin/activate
    PYTHONUNBUFFERED=1 uvicorn main:app --port 8006 --log-level info &
    deactivate 2>/dev/null || true
elif [ -d "venv" ]; then
    source venv/bin/activate
    PYTHONUNBUFFERED=1 uvicorn main:app --port 8006 --log-level info &
    deactivate 2>/dev/null || true
else
    PYTHONUNBUFFERED=1 python3 -m uvicorn main:app --port 8006 --log-level info &
fi
DATAVIZ_API_PID=$!

# Wait for data-viz API to be ready
echo "      Waiting for Data-Viz API to be ready..."
for i in $(seq 1 20); do
    if curl -sf http://localhost:8006/docs > /dev/null 2>&1; then
        echo "      Data-Viz API is up."
        break
    fi
    sleep 1
done

# --- Data-Viz Frontend ---
echo "[6/6] Starting Data-Viz Frontend (port 5174)..."
cd "$ROOT/data-viz/frontend"
npm run dev &
DATAVIZ_FE_PID=$!

echo ""
echo "================================================"
echo "  Services started:"
echo "  MySQL DB              -> localhost:3306"
echo "  MCP Server            -> http://localhost:8010"
echo "  Clinic Booking API    -> http://localhost:8005"
echo "  Data-Viz API          -> http://localhost:8006"
echo "  Clinic Booking UI     -> http://localhost:5173"
echo "  Data-Viz UI           -> http://localhost:5174"
echo "================================================"
echo ""
echo "Press Ctrl+C to stop all services."

trap "echo 'Stopping...'; kill $MCP_PID $CLINIC_API_PID $CLINIC_FE_PID $DATAVIZ_API_PID $DATAVIZ_FE_PID 2>/dev/null; exit 0" INT TERM

wait
