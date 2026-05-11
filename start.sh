#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "================================================"
echo "  UBS eScreen MCP Demo - Starting Services"
echo "================================================"
echo ""

# --- MySQL Docker container ---
echo "[1/4] Ensuring MySQL container is running..."
if ! sudo docker ps --format "{{.Names}}" | grep -q "^escreen-db$"; then
    sudo docker start escreen-db
    echo "      Started escreen-db. Waiting 5s for MySQL to be ready..."
    sleep 5
else
    echo "      escreen-db already running."
fi

# --- MCP Server ---
echo "[2/4] Starting MCP server (port 8010)..."
cd "$ROOT/mcp-server"
source .venv/bin/activate
PYTHONPATH=. python3 server_http.py &
MCP_PID=$!
deactivate 2>/dev/null || true

# --- Clinic Booking API ---
echo "[3/4] Starting Clinic-Booking API server (port 8005)..."
cd "$ROOT/clinic-booking/api-server"
if [ -d ".venv" ]; then
    source .venv/bin/activate
    uvicorn main:app --port 8005 --reload &
    deactivate 2>/dev/null || true
elif [ -d "venv" ]; then
    source venv/bin/activate
    uvicorn main:app --port 8005 --reload &
    deactivate 2>/dev/null || true
else
    python3 -m uvicorn main:app --port 8005 --reload &
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
echo "[4/4] Starting Clinic-Booking Frontend (port 5173)..."
cd "$ROOT/clinic-booking/frontend"
npm run dev &
CLINIC_FE_PID=$!

echo ""
echo "================================================"
echo "  Services started:"
echo "  MySQL DB            -> localhost:3306"
echo "  MCP Server          -> http://localhost:8010"
echo "  Clinic Booking API  -> http://localhost:8005"
echo "  Clinic Booking UI   -> http://localhost:5173"
echo "  API Docs            -> http://localhost:8005/docs"
echo "================================================"
echo ""
echo "Press Ctrl+C to stop all services."

trap "echo 'Stopping...'; kill $MCP_PID $CLINIC_API_PID $CLINIC_FE_PID 2>/dev/null; exit 0" INT TERM

wait
