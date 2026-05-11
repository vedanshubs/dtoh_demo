#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting clinic-booking API server (port 8005)..."
cd "$ROOT/clinic-booking/api-server"
./venv/bin/uvicorn main:app --port 8005 --reload &
CLINIC_API_PID=$!

echo "Starting data-viz API server (port 8006)..."
cd "$ROOT/data-viz/api-server"
./venv/bin/uvicorn main:app --port 8006 --reload &
DATAVIZ_API_PID=$!

echo "Starting clinic-booking frontend (port 5173)..."
cd "$ROOT/clinic-booking/frontend"
npm run dev &
CLINIC_FE_PID=$!

echo "Starting data-viz frontend (port 5174)..."
cd "$ROOT/data-viz/frontend"
npm run dev &
DATAVIZ_FE_PID=$!

echo ""
echo "All services started:"
echo "  Clinic Booking API  -> http://localhost:8005"
echo "  Data Viz API        -> http://localhost:8006"
echo "  Clinic Booking UI   -> http://localhost:5173"
echo "  Data Viz UI         -> http://localhost:5174"
echo ""
echo "Press Ctrl+C to stop all services."

trap "echo 'Stopping...'; kill $CLINIC_API_PID $DATAVIZ_API_PID $CLINIC_FE_PID $DATAVIZ_FE_PID 2>/dev/null; exit 0" INT TERM

wait
