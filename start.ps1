# UBS eScreen MCP Demo - Windows Startup Script
# Run from the repo root:  .\start.ps1
# Prerequisites: run .\setup.ps1 once first to create venvs

$Root        = Split-Path -Parent $MyInvocation.MyCommand.Definition
$NgrokDomain = "rachal-nonputrescible-unobservedly.ngrok-free.dev"

# Per-service Python interpreters (Windows venvs)
$MCP_Python = "$Root\mcp-server\.venv\Scripts\python.exe"
$API_Python = "$Root\clinic-booking\api-server\venv\Scripts\python.exe"
$DV_Python  = "$Root\data-viz\api-server\venv\Scripts\python.exe"

# Verify venvs exist
foreach ($p in @($MCP_Python, $API_Python, $DV_Python)) {
    if (-not (Test-Path $p)) {
        Write-Host "ERROR: venv not found at $p" -ForegroundColor Red
        Write-Host "       Run .\setup.ps1 first to create all venvs." -ForegroundColor Red
        exit 1
    }
}

# Verify Docker is reachable
$dockerOk = docker info 2>$null
if (-not $?) {
    Write-Host "ERROR: Docker is not running." -ForegroundColor Red
    Write-Host "       Please start Docker Desktop, wait for it to be ready, then re-run this script." -ForegroundColor Red
    exit 1
}

# Helper: wait until a TCP port is accepting connections
function Wait-Port {
    param([int]$Port, [int]$MaxSeconds = 30, [string]$Label = "service")
    Write-Host "      Waiting for $Label on port $Port..." -ForegroundColor DarkGray
    for ($i = 0; $i -lt $MaxSeconds; $i++) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $Port)
            $tcp.Close()
            Write-Host "      $Label is up." -ForegroundColor DarkGray
            return
        } catch { }
        Start-Sleep -Seconds 1
    }
    Write-Host "      WARNING: $Label did not respond within $MaxSeconds seconds." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  UBS eScreen MCP Demo - Starting Services" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ── Kill stale processes on our ports ─────────────────────────────────
Write-Host "Clearing stale processes on ports 8005, 8006, 8010..." -ForegroundColor DarkGray
foreach ($port in @(8005, 8006, 8010)) {
    $pids = (netstat -ano | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Select-Object -Unique)
    foreach ($p in $pids) {
        if ($p -match '^\d+$' -and $p -ne '0') {
            Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
            Write-Host "  Cleared PID $p on port $port" -ForegroundColor DarkGray
        }
    }
}
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# ── 1. MySQL Docker container ──────────────────────────────────────────
Write-Host "[1/6] Ensuring MySQL Docker container (escreen-db) is running..." -ForegroundColor Yellow
$dbRunning = docker ps --format "{{.Names}}" 2>$null | Select-String "^escreen-db$"
if (-not $dbRunning) {
    Write-Host "      Starting escreen-db..." -ForegroundColor DarkGray
    docker start escreen-db | Out-Null
    Start-Sleep -Seconds 5
    Write-Host "      escreen-db started." -ForegroundColor DarkGray
} else {
    Write-Host "      escreen-db already running." -ForegroundColor DarkGray
}

# ── 2. MCP HTTP Server (port 8010) ────────────────────────────────────
Write-Host "[2/6] Starting MCP HTTP server on port 8010..." -ForegroundColor Yellow
$mcpProc = Start-Process -PassThru -FilePath $MCP_Python `
    -ArgumentList "server_http.py" `
    -WorkingDirectory "$Root\mcp-server" `
    -WindowStyle Normal
Wait-Port -Port 8010 -MaxSeconds 20 -Label "MCP server"

# ── 3. Clinic-Booking API (port 8005) ─────────────────────────────────
Write-Host "[3/6] Starting Clinic-Booking API server on port 8005..." -ForegroundColor Yellow
$apiProc = Start-Process -PassThru -FilePath $API_Python `
    -ArgumentList "-m", "uvicorn", "main:app", "--port", "8005", "--log-level", "info" `
    -WorkingDirectory "$Root\clinic-booking\api-server" `
    -WindowStyle Normal
Wait-Port -Port 8005 -MaxSeconds 30 -Label "Clinic API"

# ── 4. Clinic-Booking Frontend (port 5173) ────────────────────────────
Write-Host "[4/6] Starting Clinic-Booking Frontend on port 5173..." -ForegroundColor Yellow
$feProc = Start-Process -PassThru -FilePath "C:\Program Files\nodejs\npm.cmd" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory "$Root\clinic-booking\frontend" `
    -WindowStyle Normal

# ── 5. Data-Viz API (port 8006) ───────────────────────────────────────
Write-Host "[5/6] Starting Data-Viz API server on port 8006..." -ForegroundColor Yellow
$dvProc = Start-Process -PassThru -FilePath $DV_Python `
    -ArgumentList "-m", "uvicorn", "main:app", "--port", "8006", "--log-level", "info" `
    -WorkingDirectory "$Root\data-viz\api-server" `
    -WindowStyle Normal

# ── 6. ngrok tunnel → port 8010 (skipped — ngrok not installed) ──────
Write-Host "[6/6] Skipping ngrok tunnel (not installed)." -ForegroundColor DarkGray
$ngrokProc = $null

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  All services launched" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  MySQL DB              ->  localhost:3306"            -ForegroundColor White
Write-Host "  MCP Server            ->  http://localhost:8010/mcp" -ForegroundColor White
Write-Host "  Clinic Booking API    ->  http://localhost:8005"     -ForegroundColor White
Write-Host "  Clinic Booking UI     ->  http://localhost:5173"     -ForegroundColor White
Write-Host "  Data-Viz API          ->  http://localhost:8006"     -ForegroundColor White
Write-Host "  ngrok tunnel          ->  (not running)"             -ForegroundColor DarkGray
Write-Host ""
Write-Host "  API Docs  :  http://localhost:8005/docs"  -ForegroundColor DarkGray
Write-Host "  ngrok UI  :  http://localhost:4040"       -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press Enter to STOP all services and exit." -ForegroundColor Red
Read-Host | Out-Null

Write-Host "Stopping all services..." -ForegroundColor Yellow
foreach ($proc in @($mcpProc, $apiProc, $feProc, $dvProc, $ngrokProc)) {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "Done." -ForegroundColor Green
