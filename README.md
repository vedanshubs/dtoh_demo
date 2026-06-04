# UBS eScreen MCP Demo

AI-powered drug testing portal built on the **Model Context Protocol (MCP)**. Provides two surfaces:

1. **Clinic Booking Chatbot** — conversational UI for placing drug test orders via the eScreen API
2. **Analytics Dashboard** — natural-language queries over live drug test data backed by MySQL

Both surfaces are driven by Claude/GPT tool calls routed through a FastMCP server.

---

## Architecture

```
Browser (localhost:5173)
    │
    ├─ /api/*  →  Clinic Booking API (8005)
    │                  ├─ POST /api/chat          →  Claude/GPT → MCP subprocess (stdio)
    │                  ├─ POST /api/analytics/chat →  Claude/GPT → MCP subprocess (stdio)
    │                  └─ GET  /api/donors         →  MySQL (3307)
    │
    └─ /actions/* →  Clinic Booking API (8005) → REST actions

ChatGPT / Claude Desktop
    └─ HTTPS → ngrok → MCP HTTP Server (8010) → MySQL (3307)
```

---

## Port Map

| Port | Service | Description |
|------|---------|-------------|
| 3307 | MySQL (Docker) | eScreen database |
| 5173 | Frontend (Vite/React) | Clinic booking + analytics UI |
| 8005 | Clinic Booking API | FastAPI — chat, analytics, REST actions |
| 8006 | Data-Viz API | FastAPI — data visualisation endpoints |
| 8010 | MCP HTTP Server | FastMCP streamable-HTTP for ChatGPT/Claude |
| 4040 | ngrok Dashboard | Local tunnel dashboard |

---

## Prerequisites

| Tool | Notes |
|------|-------|
| Python 3.12+ | Any 3.12/3.13/3.14 install works |
| Node.js 18+ | For the Vite frontend |
| Docker Desktop | Runs the MySQL container |
| ngrok | Only needed to expose MCP to external AI clients |

---

## First-Time Setup

### 1. Start MySQL (Docker)

```powershell
# Create the container (run once)
docker run -d `
  --name escreen-db `
  -e MYSQL_ROOT_PASSWORD=escreen `
  -e MYSQL_DATABASE=escreen `
  -e MYSQL_USER=escreen `
  -e MYSQL_PASSWORD=escreen `
  -p 3307:3306 `
  mysql:8

# Wait ~20 seconds, then seed the database
$db = ".\db"
foreach ($f in @("schema_candidates.sql","schema_test_types.sql","schema_poc2.sql",
                 "seed_candidates.sql","seed_data.sql","seed_poc2_reference.sql",
                 "seed_poc2_data.sql","seed_positive_analytes.sql")) {
    Get-Content "$db\$f" -Raw | docker exec -i escreen-db mysql -uescreen -pescreen escreen
    Write-Host "Loaded $f"
}

# Required for LIVE eScreen clinic search: replace placeholder service codes
# with 1001 (the code eScreen recognises). Skip if running fully in mock mode.
Get-Content "$db\patch_service_identifiers.sql" -Raw | docker exec -i escreen-db mysql -uescreen -pescreen escreen
```

### 2. Create Python Virtual Environments

Run once from the repo root:

```powershell
.\setup.ps1
```

This creates Windows-native venvs for all three Python services and installs their dependencies.

### 3. Install Frontend Dependencies

```powershell
cd clinic-booking\frontend && npm install && cd ..\..
cd data-viz\frontend     && npm install && cd ..\..
```

### 4. Configure Environment Variables

Each service has a `.env.example` — copy and fill in your values:

```powershell
Copy-Item mcp-server\.env.example                  mcp-server\.env
Copy-Item clinic-booking\api-server\.env.example   clinic-booking\api-server\.env
Copy-Item data-viz\api-server\.env.example         data-viz\api-server\.env
Copy-Item clinic-booking\frontend\.env.example     clinic-booking\frontend\.env
```

Key variables:

| Variable | Where | Description |
|----------|-------|-------------|
| `ESCREEN_USERNAME` | `mcp-server/.env` | eScreen SOAP username |
| `ESCREEN_PASSWORD` | `mcp-server/.env` | eScreen SOAP password |
| `ESCREEN_ELECTRONIC_CLIENT_ID` | `mcp-server/.env` | eScreen client ID |
| `ESCREEN_PFX_PATH` / `ESCREEN_PFX_PASSPHRASE` | `mcp-server/.env` | Path + passphrase for the mutual-TLS client cert (the `.pfx`, which is gitignored — copy it manually) |
| `ESCREEN_CLIENT_ACCOUNT` | `mcp-server/.env` | Must be `UBS001` to match the seeded DB |
| `USE_MOCK_CLINICS` | `mcp-server/.env` | `true` = mock clinics, `false` = live SOAP |
| `USE_MOCK_ANALYTICS` | `mcp-server/.env` | `true` = mock data, `false` = live MySQL |
| `OPENAI_API_KEY` | `clinic-booking/api-server/.env`, `data-viz/api-server/.env` | OpenAI API key for the chatbots |
| `DEMO_CLIENT_ID` | `data-viz/api-server/.env` | Must be `UBS001` (matches `CollectionOrder.AccountNumber`); `DEMO_CLIENT` returns 0 rows |
| `VITE_GOOGLE_MAPS_API_KEY` | `clinic-booking/frontend/.env` | Google Maps JS API key for the clinic map; restrict by referrer to `localhost:5173` |
| `DB_HOST` / `DB_PORT` | all `.env` files | MySQL connection (default: localhost:3307) |

> **Note:** the `.pfx` client certificate and all `.env` files are gitignored — they must be copied to each machine manually.

---

## Running the Demo

Make sure Docker Desktop is running, then from the repo root:

```powershell
.\start.ps1
```

This launches all services in order and prints a summary of running URLs. Press **Enter** to stop everything.

### Manual startup order (if needed)

```
1. Docker / MySQL   (3307)  ← must be first
2. MCP HTTP Server  (8010)
3. ngrok            (4040)  ← only if exposing externally
4. Clinic API       (8005)
5. Data-Viz API     (8006)
6. Frontend         (5173)
```

---

## Connecting External AI Clients

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ubs-escreen": {
      "url": "http://localhost:8010/mcp"
    }
  }
}
```

### ChatGPT (via ngrok)

1. Start ngrok: `ngrok http 8010 --domain=<your-domain>`
2. In ChatGPT → Settings → Connectors → Add MCP
3. URL: `https://<your-domain>/mcp` — Auth: None

---

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_clinics` | Find collection sites by ZIP code and test type |
| `place_order` | Register a donor for a drug test |
| `get_results_summary` | Completed test dispositions (Neg/Pos/Cancelled…) |
| `get_pipeline_status` | Tests currently in progress by stage |
| `get_analyte_breakdown` | Per-substance positive/negative counts |
| `get_turnaround_stats` | Collection → lab → MRO → verification timing + SLA % |

---

## eScreen API Integration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Clinic search | Mock / ready for live | Set `USE_MOCK_CLINICS=false` + valid credentials |
| Place order | Mock only | Real SOAP path pending implementation |
| Analytics | Live (MySQL) | Queries real DB by default |
| SOAP transport | Implemented | `mcp-server/soap/client.py` |

---

## Project Structure

```
ubs_mcp_demo/
├── mcp-server/             # FastMCP server (HTTP + stdio)
│   ├── tools/              # MCP tool implementations
│   ├── soap/               # eScreen SOAP client + envelopes
│   ├── db/                 # MySQL query functions
│   └── mocks/              # Mock data for demo mode
├── clinic-booking/
│   ├── api-server/         # FastAPI backend (Claude/GPT chat + REST)
│   └── frontend/           # React/Vite UI
├── data-viz/
│   ├── api-server/         # FastAPI backend (analytics)
│   └── frontend/           # React/Vite dashboard
├── db/                     # MySQL schema + seed SQL files
├── docs/                   # Design specs and planning docs
├── start.ps1               # Windows: launch all services
├── start.sh                # Linux/Mac: launch all services
└── setup.ps1               # Windows: create Python venvs
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `start.ps1` errors on Python path | Run `.\setup.ps1` first |
| Port already in use | Re-run `.\start.ps1` — it clears stale processes automatically |
| Frontend not loading | Run `npm install` in `clinic-booking/frontend` and `data-viz/frontend` |
| MySQL connection refused | Start Docker Desktop, then `docker start escreen-db` |
| eScreen SOAP returns 403 | Confirm your external IP is allowlisted by eScreen |
| Analytics returns no data | Check `ESCREEN_CLIENT_ACCOUNT=UBS001` in `.env` |
