# UBS eScreen MCP Demo - One-time Windows Setup
# Run once before start.ps1:  .\setup.ps1

$Root   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Python = "C:\Users\vedansh.kamdar\AppData\Roaming\uv\python\cpython-3.12.13-windows-x86_64-none\python.exe"

if (-not (Test-Path $Python)) {
    Write-Host "ERROR: Python not found at $Python" -ForegroundColor Red
    Write-Host "       Update the `$Python variable in this script to your actual python.exe path." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  UBS eScreen MCP Demo - Environment Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Using Python: $Python" -ForegroundColor DarkGray
Write-Host ""

# Helper: (re)create a venv and install requirements
function Setup-Venv {
    param([string]$Dir, [string]$VenvName)
    $venvPath = "$Dir\$VenvName"
    Write-Host "  Setting up venv in $venvPath ..." -ForegroundColor DarkGray
    if (Test-Path $venvPath) {
        Write-Host "    Removing old venv..." -ForegroundColor DarkGray
        Remove-Item -Recurse -Force $venvPath
    }
    & $Python -m venv $venvPath
    $pip = "$venvPath\Scripts\pip.exe"
    & $pip install --upgrade pip --quiet
    & $pip install -r "$Dir\requirements.txt"
    Write-Host "    Done." -ForegroundColor Green
}

# ── MCP Server ─────────────────────────────────────────────────────────
Write-Host "[1/3] MCP Server ($Root\mcp-server)" -ForegroundColor Yellow
Setup-Venv -Dir "$Root\mcp-server" -VenvName ".venv"

# ── Clinic-Booking API ─────────────────────────────────────────────────
Write-Host "[2/3] Clinic-Booking API ($Root\clinic-booking\api-server)" -ForegroundColor Yellow
Setup-Venv -Dir "$Root\clinic-booking\api-server" -VenvName "venv"

# ── Data-Viz API ───────────────────────────────────────────────────────
Write-Host "[3/3] Data-Viz API ($Root\data-viz\api-server)" -ForegroundColor Yellow
Setup-Venv -Dir "$Root\data-viz\api-server" -VenvName "venv"

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Setup complete. Run .\start.ps1 to launch." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
