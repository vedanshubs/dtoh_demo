# UBS eScreen MCP Demo

AI-powered drug testing portal with clinic booking (chatbot) and an analytics dashboard.  
Both surfaces are backed by a real MySQL database and driven by Claude/GPT tool calls via the **Model Context Protocol (MCP)**.

---

## Port Map

| Port | Service | Process | Description |
|------|---------|---------|-------------|
| **3306** | MySQL | Docker (`com.docker.backend`) | eScreen database |
| **4040** | ngrok Dashboard | `ngrok` | Local web UI – http://localhost:4040 |
| **5173** | Frontend (Vite) | `node` | React app – http://localhost:5173 |
| **8005** | API Server | `python` (uvicorn) | FastAPI – clinic booking + analytics REST endpoints |
| **8010** | MCP HTTP Server | `python` (uvicorn) | FastMCP streamable-http – used by ChatGPT connector |
| **ngrok tunnel** | Public MCP URL | ngrok | `https://rachal-nonputrescible-unobservedly.ngrok-free.dev/mcp` |

---

## Architecture

```
Browser (localhost:5173)
    │
    ├─ /api/*           → API Server (8005)
    │                        │
    │                        ├─ POST /api/chat            → GPT-4.1-mini → MCP subprocess (stdio)
    │                        ├─ POST /api/analytics/chat  → GPT-4.1-mini → MCP subprocess (stdio)
    │                        └─ GET  /api/donors          → MySQL (3306)
    │
    └─ /actions/*       → API Server (8005) → REST actions

ChatGPT (chatgpt.com)
    │
    └─ HTTPS → ngrok (rachal-nonputrescible-unobservedly.ngrok-free.dev)
                   │
                   └─ MCP HTTP Server (8010)  ← FastMCP streamable-http
                            │
                            └─ MySQL (3306)
```

---

## Prerequisites

- **Python 3.13** – `C:\Users\sohili.chauhan\AppData\Local\Programs\Python\Python313\python.exe`
- **Node.js** (for Vite frontend)
- **Docker Desktop** (for MySQL container)
- **ngrok** (installed, auth token already configured)

---

## Step 1 – Start MySQL (Docker)

```powershell
# Start the container (if not already running)
docker start escreen-db

# Verify it's running
docker ps | findstr escreen-db
```

If the container doesn't exist yet, create it:
```powershell
docker run -d `
  --name escreen-db `
  -e MYSQL_ROOT_PASSWORD=escreen `
  -e MYSQL_DATABASE=escreen `
  -e MYSQL_USER=escreen `
  -e MYSQL_PASSWORD=escreen `
  -p 3306:3306 `
  mysql:8
```

---

## Step 2 – Start MCP HTTP Server (Port 8010)

```powershell
cd "c:\Users\sohili.chauhan\Source\repos\UBS Demo\ubs_mcp_demo\mcp-server"

# Start (opens a new window so you can see logs)
Start-Process python "server_http.py" -WorkingDirectory "c:\Users\sohili.chauhan\Source\repos\UBS Demo\ubs_mcp_demo\mcp-server" -WindowStyle Normal

# Verify
Start-Sleep -Seconds 5
netstat -ano | findstr ":8010 "
```

**Stop:**
```powershell
$procId = (netstat -ano | findstr "0.0.0.0:8010 ") -replace '.*\s(\d+)$','$1'
Stop-Process -Id ([int]$procId.Trim()) -Force
```

---

## Step 3 – Start ngrok Tunnel

```powershell
# Start
Start-Process ngrok "http --domain=rachal-nonputrescible-unobservedly.ngrok-free.dev 8010" -WindowStyle Normal

# Verify tunnel is live
Start-Sleep -Seconds 5
Invoke-RestMethod "http://localhost:4040/api/tunnels" | Select-Object -ExpandProperty tunnels | Select-Object public_url
```

**Stop:**
```powershell
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Public MCP URL (for ChatGPT connector):**
```
https://rachal-nonputrescible-unobservedly.ngrok-free.dev/mcp
```

---

## Step 4 – Start API Server (Port 8005)

```powershell
cd "c:\Users\sohili.chauhan\Source\repos\UBS Demo\ubs_mcp_demo\clinic-booking\api-server"

# Install dependencies (first time only)
pip install -r requirements.txt

# Start with auto-reload
uvicorn main:app --host 127.0.0.1 --port 8005 --reload
```

**Or start in a new window:**
```powershell
Start-Process python "-m uvicorn main:app --host 127.0.0.1 --port 8005 --reload" `
  -WorkingDirectory "c:\Users\sohili.chauhan\Source\repos\UBS Demo\ubs_mcp_demo\clinic-booking\api-server" `
  -WindowStyle Normal
```

**Stop:**
```powershell
$procId = (netstat -ano | findstr "127.0.0.1:8005 .*LISTENING") -replace '.*\s(\d+)$','$1'
Stop-Process -Id ([int]$procId.Trim()) -Force
```

**Environment file** (`clinic-booking/api-server/.env`):
```
OPENAI_API_KEY=sk-proj-...
MCP_SERVER_PATH=../../mcp-server/server.py
MCP_PYTHON=C:\Users\sohili.chauhan\AppData\Local\Programs\Python\Python313\python.exe
PORT=8005
DB_HOST=localhost
DB_PORT=3306
DB_USER=escreen
DB_PASSWORD=escreen
DB_NAME=escreen
ESCREEN_CLIENT_ACCOUNT=UBS001
```

---

## Step 5 – Start Frontend (Port 5173)

```powershell
cd "c:\Users\sohili.chauhan\Source\repos\UBS Demo\ubs_mcp_demo\clinic-booking\frontend"

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Open in browser: **http://localhost:5173**

---

## Step 6 – Connect ChatGPT (MCP Connector)

1. Go to **chatgpt.com** → Settings → **Connectors** (or **Tools**)
2. Click **Add connector** → **MCP**
3. Enter URL: `https://rachal-nonputrescible-unobservedly.ngrok-free.dev/mcp`
4. Auth: **None**
5. Save and refresh

Available tools in ChatGPT after connecting:
- `search_clinics` – find collection sites by ZIP and test type
- `place_order` – register a donor for a drug test
- `get_results_summary` – completed test dispositions (neg/pos/cancelled...)
- `get_pipeline_status` – tests currently in progress by stage
- `get_analyte_breakdown` – per-substance positive/negative counts
- `get_turnaround_stats` – collection→lab→MRO→verification timing + SLA %

---

## Quick Health Checks

```powershell
# All services at a glance
foreach ($port in @(3306, 4040, 5173, 8005, 8010)) {
    $match = (netstat -ano | findstr "LISTENING") | Where-Object { $_ -match ":$port\s" } | Select-Object -First 1
    if ($match) {
        $procId = $match.Trim().Split()[-1]
        $proc = Get-Process -Id ([int]$procId) -ErrorAction SilentlyContinue
        Write-Host "Port $port  RUNNING  ($($proc.ProcessName))"
    } else {
        Write-Host "Port $port  STOPPED"
    }
}

# Test analytics API
Invoke-RestMethod "http://localhost:8005/api/analytics/chat" -Method POST `
  -ContentType "application/json" `
  -Body '{"messages":[],"user_message":"Results summary last 30 days"}' `
  -TimeoutSec 30 | Select-Object -ExpandProperty reply | Select-Object summary

# Test MCP server through ngrok (CORS + initialize)
python -c "
import urllib.request, json
base = 'https://rachal-nonputrescible-unobservedly.ngrok-free.dev'
init = {'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2024-11-05','capabilities':{},'clientInfo':{'name':'test','version':'1'}}}
req = urllib.request.Request(base+'/mcp', data=json.dumps(init).encode(), headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
with urllib.request.urlopen(req, timeout=10) as r:
    print('MCP status:', r.status, '| CORS:', r.headers.get('Access-Control-Allow-Origin','MISSING'))
"
```

---

## Startup Order (Always Follow This)

```
1. Docker / MySQL  (3306)   ← must be first, everything reads the DB
2. MCP HTTP Server (8010)   ← must be up before ngrok connects to it
3. ngrok           (4040)   ← tunnels to 8010
4. API Server      (8005)   ← spawns its own MCP subprocess (stdio) on start
5. Frontend        (5173)   ← last, depends on API server
```

---

## MCP Server `.env` (`mcp-server/.env`)

```
USE_MOCK=false
ESCREEN_CLIENT_ACCOUNT=UBS001
DB_HOST=localhost
DB_PORT=3306
DB_USER=escreen
DB_PASSWORD=escreen
DB_NAME=escreen
MCP_PORT=8010
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| ChatGPT "404 from analytics endpoint" | ngrok or MCP server stopped | Restart Steps 2 & 3 |
| ChatGPT "Error creating connector" | MCP server not running / CORS missing | Restart Step 2, verify port 8010 listening |
| Frontend "Server error 500" on analytics | Wrong Vite proxy port | `vite.config.js` must proxy `/api` → `http://localhost:8005` only |
| Analytics returns no data | Wrong CLIENT_ID | `.env` must have `ESCREEN_CLIENT_ACCOUNT=UBS001` |
| API server spawns MCP but gets no tools | MCP subprocess crash | Check `MCP_SERVER_PATH` and `MCP_PYTHON` in `.env` |
| ngrok `ERR_NGROK_334` | Old session still active | Kill all ngrok processes and restart |
