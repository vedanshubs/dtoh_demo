#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="/c/Users/sohili.chauhan/AppData/Local/Programs/Python/Python313/python.exe"

echo ""
echo "================================================"
echo "  UBS eScreen MCP Demo - Starting Services"
echo "================================================"
echo ""

echo "[1/2] Starting Clinic-Booking API server (port 8005)..."
cd "$ROOT/clinic-booking/api-server"
"$PYTHON" -m uvicorn main:app --port 8005 --reload &
CLINIC_API_PID=$!

echo "[2/2] Starting Clinic-Booking Frontend (port 5173)..."
cd "$ROOT/clinic-booking/frontend"
npm run dev &
CLINIC_FE_PID=$!

echo ""
echo "================================================"
echo "  Services started:"
echo "  Clinic Booking API  -> http://localhost:8005"
echo "  Clinic Booking UI   -> http://localhost:5173"
echo "  API Docs            -> http://localhost:8005/docs"
echo "================================================"
echo ""
echo "Press Ctrl+C to stop all services."

trap "echo 'Stopping...'; kill $CLINIC_API_PID $CLINIC_FE_PID 2>/dev/null; exit 0" INT TERM

wait
