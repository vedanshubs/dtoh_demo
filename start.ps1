# UBS eScreen MCP Demo - Windows Startup Script
# Run from the repo root:  .\start.ps1

$Root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Python = "C:\Users\sohili.chauhan\AppData\Local\Programs\Python\Python313\python.exe"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  UBS eScreen MCP Demo - Starting Services" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Clinic-Booking API (port 8005) ──────────────────────────────────
Write-Host "[1/2] Starting Clinic-Booking API server on port 8005..." -ForegroundColor Yellow
$apiProc = Start-Process -PassThru -FilePath $Python `
    -ArgumentList "-m", "uvicorn", "main:app", "--port", "8005", "--reload" `
    -WorkingDirectory "$Root\clinic-booking\api-server" `
    -WindowStyle Normal

# ── 2. Clinic-Booking Frontend (port 5173) ─────────────────────────────
Write-Host "[2/2] Starting Clinic-Booking Frontend on port 5173..." -ForegroundColor Yellow
$feProc = Start-Process -PassThru -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory "$Root\clinic-booking\frontend" `
    -WindowStyle Normal

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  All services launched in separate windows" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Clinic Booking API  ->  http://localhost:8005" -ForegroundColor White
Write-Host "  Clinic Booking UI   ->  http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "  Docs / Health:  http://localhost:8005/docs" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press Enter to stop all services and exit." -ForegroundColor Red
Read-Host | Out-Null

Write-Host "Stopping services..." -ForegroundColor Yellow
Stop-Process -Id $apiProc.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $feProc.Id  -Force -ErrorAction SilentlyContinue
Write-Host "Done." -ForegroundColor Green
