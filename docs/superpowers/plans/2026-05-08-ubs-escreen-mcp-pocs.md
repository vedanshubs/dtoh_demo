# UBS eScreen MCP POCs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two MCP-powered POCs — a clinic search & booking chatbot (`clinic-booking`) and a drug test data visualization chatbot (`data-viz`) — both demonstrating Claude autonomously calling MCP tools to interact with external systems.

**Architecture:** Each POC has three layers: a React frontend, a FastAPI API server (manages Claude conversation + MCP client), and a Python MCP server built with FastMCP (exposes tools, talks to eScreen SOAP API or SQL DB). Claude never directly touches an API or database — all data flows through named MCP tools. Phase 1 uses mock responses so both POCs are fully demoable before credentials or DB access arrive. Task 11 adds Claude Desktop (HTTP/SSE transport) and ChatGPT Custom GPT (OpenAPI spec) as additional clients alongside the custom React UI.

**Tech Stack:** Python 3.11+, FastMCP (`mcp` package), FastAPI, Uvicorn, `anthropic` SDK, `zeep` (SOAP), `pymysql`, `python-dotenv`, `pytest` + `pytest-asyncio`, React + Vite, Recharts (data-viz charts)

---

## File Map

```
ubs_mcp_demo/
├── clinic-booking/
│   ├── mcp-server/
│   │   ├── requirements.txt
│   │   ├── server.py                    ← FastMCP stdio entry
│   │   ├── server_http.py               ← FastMCP SSE entry (Claude Desktop)
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── search_clinics.py        ← search_clinics tool handler
│   │   │   └── place_order.py           ← place_order tool handler
│   │   ├── soap/
│   │   │   ├── __init__.py
│   │   │   ├── client.py                ← zeep SOAP client factory
│   │   │   ├── get_collection_sites.py  ← GetCollectionSites wrapper
│   │   │   └── register_event.py        ← RegisterScheduledEvent wrapper
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── connection.py            ← pymysql connection pool
│   │   │   └── candidates.py            ← fetch donor by id
│   │   ├── mocks/
│   │   │   ├── __init__.py
│   │   │   ├── clinics.py               ← mock clinic list
│   │   │   └── booking.py               ← mock booking confirmation
│   │   ├── openapi.json                 ← ChatGPT Actions spec (Task 11)
│   │   └── tests/
│   │       ├── test_search_clinics.py
│   │       └── test_place_order.py
│   ├── api-server/
│   │   ├── requirements.txt
│   │   ├── main.py                      ← FastAPI entry, /api/chat endpoint
│   │   ├── claude/
│   │   │   ├── __init__.py
│   │   │   ├── client.py                ← Anthropic SDK wrapper
│   │   │   ├── conversation.py          ← agentic tool-call loop
│   │   │   └── prompts/
│   │   │       ├── __init__.py
│   │   │       └── system_prompt.py     ← system prompt + donor injection
│   │   ├── mcp/
│   │   │   ├── __init__.py
│   │   │   └── client.py                ← MCPClientManager (stdio)
│   │   └── tests/
│   │       └── test_conversation.py
│   └── frontend/
│       ├── package.json
│       ├── vite.config.js
│       └── src/
│           ├── App.jsx
│           └── components/
│               ├── Chat.jsx
│               ├── ClinicCard.jsx
│               ├── BookingConfirmation.jsx
│               └── CandidateSelector.jsx
├── data-viz/
│   ├── mcp-server/
│   │   ├── requirements.txt
│   │   ├── server.py
│   │   ├── server_http.py
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── get_results_summary.py
│   │   │   ├── get_pipeline_status.py
│   │   │   ├── get_analyte_breakdown.py
│   │   │   └── get_turnaround_stats.py
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── connection.py
│   │   │   └── date_range.py            ← "last 30 days" → SQL date bounds
│   │   ├── mocks/
│   │   │   ├── __init__.py
│   │   │   └── responses.py
│   │   ├── openapi.json                 ← ChatGPT Actions spec (Task 11)
│   │   └── tests/
│   │       ├── test_results_summary.py
│   │       └── test_pipeline_status.py
│   ├── api-server/
│   │   ├── requirements.txt
│   │   ├── main.py
│   │   ├── claude/
│   │   │   ├── __init__.py
│   │   │   ├── conversation.py
│   │   │   └── prompts/
│   │   │       ├── __init__.py
│   │   │       └── system_prompt.py
│   │   └── mcp/
│   │       ├── __init__.py
│   │       └── client.py
│   └── frontend/
│       ├── package.json
│       ├── vite.config.js
│       └── src/
│           ├── App.jsx
│           └── components/
│               ├── Chat.jsx
│               ├── NumberCard.jsx
│               ├── ChartRenderer.jsx
│               └── DataTable.jsx
└── db/
    ├── schema_candidates.sql
    ├── schema_test_types.sql
    └── seed_candidates.sql
```

---

## Task 1: Repo Scaffolding

**Files:**
- Create: `clinic-booking/mcp-server/requirements.txt`
- Create: `clinic-booking/api-server/requirements.txt`
- Create: `data-viz/mcp-server/requirements.txt`
- Create: `data-viz/api-server/requirements.txt`
- Create: `clinic-booking/mcp-server/.env.example`
- Create: `clinic-booking/api-server/.env.example`
- Create: `data-viz/mcp-server/.env.example`
- Create: `data-viz/api-server/.env.example`
- Create all `__init__.py` stubs and directory structure

- [ ] **Step 1: Create directory tree**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo

mkdir -p clinic-booking/mcp-server/{tools,soap,db,mocks,tests}
mkdir -p clinic-booking/api-server/{claude/prompts,mcp,tests}
mkdir -p clinic-booking/frontend/src/components

mkdir -p data-viz/mcp-server/{tools,db,mocks,tests}
mkdir -p data-viz/api-server/{claude/prompts,mcp}
mkdir -p data-viz/frontend/src/components

mkdir -p db
```

- [ ] **Step 2: Create `__init__.py` stubs**

```bash
touch clinic-booking/mcp-server/tools/__init__.py
touch clinic-booking/mcp-server/soap/__init__.py
touch clinic-booking/mcp-server/db/__init__.py
touch clinic-booking/mcp-server/mocks/__init__.py
touch clinic-booking/api-server/claude/__init__.py
touch clinic-booking/api-server/claude/prompts/__init__.py
touch clinic-booking/api-server/mcp/__init__.py

touch data-viz/mcp-server/tools/__init__.py
touch data-viz/mcp-server/db/__init__.py
touch data-viz/mcp-server/mocks/__init__.py
touch data-viz/api-server/claude/__init__.py
touch data-viz/api-server/claude/prompts/__init__.py
touch data-viz/api-server/mcp/__init__.py
```

- [ ] **Step 3: Write MCP server requirements**

`clinic-booking/mcp-server/requirements.txt`:
```
mcp>=1.0.0
pymysql>=1.1.0
zeep>=4.2.1
python-dotenv>=1.0.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
```

Same content for `data-viz/mcp-server/requirements.txt`.

- [ ] **Step 4: Write API server requirements**

`clinic-booking/api-server/requirements.txt`:
```
fastapi>=0.110.0
uvicorn>=0.29.0
anthropic>=0.27.0
mcp>=1.0.0
python-dotenv>=1.0.0
pytest>=8.0.0
pytest-asyncio>=0.23.0
httpx>=0.27.0
```

Same content for `data-viz/api-server/requirements.txt`.

- [ ] **Step 5: Write `.env.example` files**

`clinic-booking/mcp-server/.env.example`:
```
USE_MOCK=true
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ubs_escreen
DB_USER=root
DB_PASSWORD=
ESCREEN_PARTNER_ID=
ESCREEN_PARTNER_PASSWORD=
ESCREEN_CLIENT_ACCOUNT=
ESCREEN_CLIENT_SUB_ACCOUNT=
ESCREEN_ELECTRONIC_CLIENT_ID=
```

`clinic-booking/api-server/.env.example`:
```
ANTHROPIC_API_KEY=
MCP_SERVER_PATH=../mcp-server/server.py
```

`data-viz/mcp-server/.env.example`:
```
USE_MOCK=true
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ubs_escreen
DB_USER=root
DB_PASSWORD=
ESCREEN_CLIENT_ACCOUNT=DEMO_CLIENT
```

`data-viz/api-server/.env.example`:
```
ANTHROPIC_API_KEY=
MCP_SERVER_PATH=../mcp-server/server.py
DEMO_CLIENT_ID=DEMO_CLIENT
```

- [ ] **Step 6: Install dependencies**

```bash
cd clinic-booking/mcp-server && pip install -r requirements.txt --break-system-packages
cd ../../clinic-booking/api-server && pip install -r requirements.txt --break-system-packages
cd ../../data-viz/mcp-server && pip install -r requirements.txt --break-system-packages
cd ../../data-viz/api-server && pip install -r requirements.txt --break-system-packages
cd ../..
```

Expected: all packages install without errors.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: scaffold clinic-booking and data-viz directories"
```

---

## Task 2: clinic-booking MCP Server (Mocks)

**Files:**
- Create: `clinic-booking/mcp-server/mocks/clinics.py`
- Create: `clinic-booking/mcp-server/mocks/booking.py`
- Create: `clinic-booking/mcp-server/tools/search_clinics.py`
- Create: `clinic-booking/mcp-server/tools/place_order.py`
- Create: `clinic-booking/mcp-server/server.py`
- Create: `clinic-booking/mcp-server/tests/test_search_clinics.py`
- Create: `clinic-booking/mcp-server/tests/test_place_order.py`

- [ ] **Step 1: Write mock clinic data**

`clinic-booking/mcp-server/mocks/clinics.py`:
```python
MOCK_CLINICS = [
    {
        "EscreenSiteId": 10001,
        "SiteName": "Quest Diagnostics – Downtown",
        "Address1": "123 Main St",
        "City": "Chicago",
        "State": "IL",
        "ZipCode": "60601",
        "PhoneNumber": "3125550101",
        "Latitude": 41.8781,
        "Longitude": -87.6298,
        "Distance": 1.2,
        "Attributes": [
            {"AttributeName": "WalkIn", "AttributeValue": "Y"},
            {"AttributeName": "Handicap", "AttributeValue": "Y"},
        ],
        "GoogleMapsUrl": "https://www.google.com/maps?q=41.8781,-87.6298",
    },
    {
        "EscreenSiteId": 10002,
        "SiteName": "LabCorp – Wacker Drive",
        "Address1": "456 Wacker Dr",
        "City": "Chicago",
        "State": "IL",
        "ZipCode": "60606",
        "PhoneNumber": "3125550202",
        "Latitude": 41.8858,
        "Longitude": -87.6363,
        "Distance": 2.5,
        "Attributes": [
            {"AttributeName": "WalkIn", "AttributeValue": "N"},
            {"AttributeName": "Handicap", "AttributeValue": "Y"},
        ],
        "GoogleMapsUrl": "https://www.google.com/maps?q=41.8858,-87.6363",
    },
    {
        "EscreenSiteId": 10003,
        "SiteName": "ClinPath – North Side",
        "Address1": "789 Clark St",
        "City": "Chicago",
        "State": "IL",
        "ZipCode": "60610",
        "PhoneNumber": "3125550303",
        "Latitude": 41.9003,
        "Longitude": -87.6319,
        "Distance": 4.1,
        "Attributes": [
            {"AttributeName": "WalkIn", "AttributeValue": "Y"},
            {"AttributeName": "Handicap", "AttributeValue": "N"},
        ],
        "GoogleMapsUrl": "https://www.google.com/maps?q=41.9003,-87.6319",
    },
]
```

- [ ] **Step 2: Write mock booking data**

`clinic-booking/mcp-server/mocks/booking.py`:
```python
def mock_booking_response(clinic_id: int) -> dict:
    return {
        "success": True,
        "registration_id": f"MOCK-REG-{clinic_id}-20260508",
        "errors": [],
    }
```

- [ ] **Step 3: Write the search_clinics tool handler**

`clinic-booking/mcp-server/tools/search_clinics.py`:
```python
from mocks.clinics import MOCK_CLINICS


async def handle_search_clinics(
    zipcode: str,
    radius: float,
    service_identifier: str,
    use_mock: bool,
) -> list[dict]:
    if use_mock:
        return MOCK_CLINICS
    # Phase 3: replace with SOAP call
    from soap.get_collection_sites import get_collection_sites
    return await get_collection_sites(zipcode, radius, service_identifier)
```

- [ ] **Step 4: Write the place_order tool handler**

`clinic-booking/mcp-server/tools/place_order.py`:
```python
from mocks.booking import mock_booking_response


async def handle_place_order(
    clinic_id: int,
    donor_id: int,
    service_identifier: str,
    reason_for_test: str,
    use_mock: bool,
) -> dict:
    if use_mock:
        return mock_booking_response(clinic_id)
    # Phase 3: fetch donor from DB and call SOAP
    from db.candidates import get_candidate
    from soap.register_event import register_scheduled_event
    donor = await get_candidate(donor_id)
    return await register_scheduled_event(clinic_id, donor, service_identifier, reason_for_test)
```

- [ ] **Step 5: Write the MCP server entry**

`clinic-booking/mcp-server/server.py`:
```python
import os
from mcp.server.fastmcp import FastMCP
from tools.search_clinics import handle_search_clinics
from tools.place_order import handle_place_order
from dotenv import load_dotenv

load_dotenv()
mcp = FastMCP("clinic-booking")
USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"


@mcp.tool()
async def search_clinics(zipcode: str, radius: float, service_identifier: str) -> list[dict]:
    """Search for drug test collection clinics near a zip code.
    Returns a list of clinic objects with address, distance, attributes, and Google Maps URL."""
    return await handle_search_clinics(zipcode, radius, service_identifier, USE_MOCK)


@mcp.tool()
async def place_order(
    clinic_id: int,
    donor_id: int,
    service_identifier: str,
    reason_for_test: str,
) -> dict:
    """Place a drug test booking at a clinic for a donor.
    Fetches donor PII server-side. Returns registration_id on success."""
    return await handle_place_order(clinic_id, donor_id, service_identifier, reason_for_test, USE_MOCK)


if __name__ == "__main__":
    mcp.run()
```

- [ ] **Step 6: Write failing tests**

`clinic-booking/mcp-server/tests/test_search_clinics.py`:
```python
import pytest
from tools.search_clinics import handle_search_clinics


@pytest.mark.asyncio
async def test_search_clinics_mock_returns_list():
    result = await handle_search_clinics("60601", 10.0, "TEST_SERVICE", use_mock=True)
    assert isinstance(result, list)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_search_clinics_mock_has_required_fields():
    result = await handle_search_clinics("60601", 10.0, "TEST_SERVICE", use_mock=True)
    clinic = result[0]
    for field in ["EscreenSiteId", "SiteName", "Address1", "City", "Distance", "GoogleMapsUrl"]:
        assert field in clinic, f"Missing field: {field}"
```

`clinic-booking/mcp-server/tests/test_place_order.py`:
```python
import pytest
from tools.place_order import handle_place_order


@pytest.mark.asyncio
async def test_place_order_mock_success():
    result = await handle_place_order(10001, 1, "5PANEL", "PE", use_mock=True)
    assert result["success"] is True
    assert "registration_id" in result
    assert result["errors"] == []
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd clinic-booking/mcp-server
python -m pytest tests/ -v
```

Expected:
```
test_search_clinics_mock_returns_list PASSED
test_search_clinics_mock_has_required_fields PASSED
test_place_order_mock_success PASSED
```

- [ ] **Step 8: Smoke-test MCP server starts**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | USE_MOCK=true python server.py
```

Expected: JSON response listing `search_clinics` and `place_order` tools.

- [ ] **Step 9: Commit**

```bash
git add clinic-booking/mcp-server/
git commit -m "feat: clinic-booking MCP server with mock tools"
```

---

## Task 3: data-viz MCP Server (Mocks)

**Files:**
- Create: `data-viz/mcp-server/mocks/responses.py`
- Create: `data-viz/mcp-server/tools/get_results_summary.py`
- Create: `data-viz/mcp-server/tools/get_pipeline_status.py`
- Create: `data-viz/mcp-server/tools/get_analyte_breakdown.py`
- Create: `data-viz/mcp-server/tools/get_turnaround_stats.py`
- Create: `data-viz/mcp-server/server.py`
- Create: `data-viz/mcp-server/tests/test_results_summary.py`
- Create: `data-viz/mcp-server/tests/test_pipeline_status.py`

- [ ] **Step 1: Write mock responses**

`data-viz/mcp-server/mocks/responses.py`:
```python
def mock_results_summary(client_id: str, date_range: str, **kwargs) -> dict:
    return {
        "client_id": client_id,
        "date_range": date_range,
        "total": 120,
        "breakdown": [
            {"disposition": "Negative", "count": 98},
            {"disposition": "Positive", "count": 15},
            {"disposition": "Cancelled", "count": 5},
            {"disposition": "No Show", "count": 2},
        ],
    }


def mock_pipeline_status(client_id: str, date_range: str, **kwargs) -> dict:
    return {
        "client_id": client_id,
        "date_range": date_range,
        "total_in_progress": 34,
        "breakdown": [
            {"status": "Pending Collection", "count": 10},
            {"status": "Collected", "count": 8},
            {"status": "At Lab", "count": 12},
            {"status": "MRO Review", "count": 4},
        ],
    }


def mock_analyte_breakdown(client_id: str, date_range: str, **kwargs) -> dict:
    return {
        "client_id": client_id,
        "date_range": date_range,
        "analytes": [
            {"analyte": "Marijuana/THC", "positive": 8, "negative": 42},
            {"analyte": "Cocaine", "positive": 3, "negative": 47},
            {"analyte": "Opiates", "positive": 2, "negative": 48},
            {"analyte": "Amphetamines", "positive": 2, "negative": 48},
        ],
    }


def mock_turnaround_stats(client_id: str, date_range: str, **kwargs) -> dict:
    return {
        "client_id": client_id,
        "date_range": date_range,
        "avg_collection_to_lab_days": 1.2,
        "avg_lab_to_report_days": 2.3,
        "avg_report_to_verification_days": 0.8,
        "avg_end_to_end_days": 4.3,
    }
```

- [ ] **Step 2: Write tool handlers**

`data-viz/mcp-server/tools/get_results_summary.py`:
```python
from mocks.responses import mock_results_summary


async def handle_get_results_summary(
    client_id: str,
    date_range: str,
    disposition: str | None = None,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
    use_mock: bool = True,
) -> dict:
    if use_mock:
        return mock_results_summary(client_id, date_range)
    from db.queries import query_results_summary
    return await query_results_summary(client_id, date_range, disposition, reason_for_test, specimen_type, regulation)
```

`data-viz/mcp-server/tools/get_pipeline_status.py`:
```python
from mocks.responses import mock_pipeline_status


async def handle_get_pipeline_status(
    client_id: str,
    date_range: str,
    status: str | None = None,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    use_mock: bool = True,
) -> dict:
    if use_mock:
        return mock_pipeline_status(client_id, date_range)
    from db.queries import query_pipeline_status
    return await query_pipeline_status(client_id, date_range, status, reason_for_test, specimen_type)
```

`data-viz/mcp-server/tools/get_analyte_breakdown.py`:
```python
from mocks.responses import mock_analyte_breakdown


async def handle_get_analyte_breakdown(
    client_id: str,
    date_range: str,
    analyte_name: str | None = None,
    disposition: str | None = None,
    use_mock: bool = True,
) -> dict:
    if use_mock:
        return mock_analyte_breakdown(client_id, date_range)
    from db.queries import query_analyte_breakdown
    return await query_analyte_breakdown(client_id, date_range, analyte_name, disposition)
```

`data-viz/mcp-server/tools/get_turnaround_stats.py`:
```python
from mocks.responses import mock_turnaround_stats


async def handle_get_turnaround_stats(
    client_id: str,
    date_range: str,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
    use_mock: bool = True,
) -> dict:
    if use_mock:
        return mock_turnaround_stats(client_id, date_range)
    from db.queries import query_turnaround_stats
    return await query_turnaround_stats(client_id, date_range, reason_for_test, specimen_type, regulation)
```

- [ ] **Step 3: Write MCP server entry**

`data-viz/mcp-server/server.py`:
```python
import os
from mcp.server.fastmcp import FastMCP
from tools.get_results_summary import handle_get_results_summary
from tools.get_pipeline_status import handle_get_pipeline_status
from tools.get_analyte_breakdown import handle_get_analyte_breakdown
from tools.get_turnaround_stats import handle_get_turnaround_stats
from dotenv import load_dotenv

load_dotenv()
mcp = FastMCP("data-viz")
USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"
CLIENT_ID = os.getenv("ESCREEN_CLIENT_ACCOUNT", "DEMO_CLIENT")


@mcp.tool()
async def get_results_summary(
    date_range: str,
    disposition: str | None = None,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
) -> dict:
    """Get completed drug test result counts grouped by disposition.
    date_range examples: 'last 30 days', 'last 90 days', 'last quarter', 'current year'."""
    return await handle_get_results_summary(CLIENT_ID, date_range, disposition, reason_for_test, specimen_type, regulation, USE_MOCK)


@mcp.tool()
async def get_pipeline_status(
    date_range: str,
    status: str | None = None,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
) -> dict:
    """Get counts of drug tests currently in progress, grouped by pipeline stage."""
    return await handle_get_pipeline_status(CLIENT_ID, date_range, status, reason_for_test, specimen_type, USE_MOCK)


@mcp.tool()
async def get_analyte_breakdown(
    date_range: str,
    analyte_name: str | None = None,
    disposition: str | None = None,
) -> dict:
    """Get per-substance positive/negative counts from analyte records."""
    return await handle_get_analyte_breakdown(CLIENT_ID, date_range, analyte_name, disposition, USE_MOCK)


@mcp.tool()
async def get_turnaround_stats(
    date_range: str,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
) -> dict:
    """Get average turnaround time statistics across all lifecycle stages."""
    return await handle_get_turnaround_stats(CLIENT_ID, date_range, reason_for_test, specimen_type, regulation, USE_MOCK)


if __name__ == "__main__":
    mcp.run()
```

- [ ] **Step 4: Write failing tests**

`data-viz/mcp-server/tests/test_results_summary.py`:
```python
import pytest
from tools.get_results_summary import handle_get_results_summary


@pytest.mark.asyncio
async def test_results_summary_mock_returns_breakdown():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert "breakdown" in result
    assert result["total"] > 0
    labels = [b["disposition"] for b in result["breakdown"]]
    assert "Negative" in labels
    assert "Positive" in labels


@pytest.mark.asyncio
async def test_results_summary_client_id_in_response():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert result["client_id"] == "DEMO_CLIENT"
```

`data-viz/mcp-server/tests/test_pipeline_status.py`:
```python
import pytest
from tools.get_pipeline_status import handle_get_pipeline_status


@pytest.mark.asyncio
async def test_pipeline_status_mock_returns_breakdown():
    result = await handle_get_pipeline_status("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert "total_in_progress" in result
    assert "breakdown" in result
    assert len(result["breakdown"]) > 0
```

- [ ] **Step 5: Run tests**

```bash
cd data-viz/mcp-server
python -m pytest tests/ -v
```

Expected: 4 tests pass.

- [ ] **Step 6: Smoke-test MCP server**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | USE_MOCK=true python server.py
```

Expected: JSON listing all 4 tools.

- [ ] **Step 7: Commit**

```bash
git add data-viz/mcp-server/
git commit -m "feat: data-viz MCP server with 4 mock tools"
```

---

## Task 4: clinic-booking API Server

**Files:**
- Create: `clinic-booking/api-server/mcp/client.py`
- Create: `clinic-booking/api-server/claude/client.py`
- Create: `clinic-booking/api-server/claude/prompts/system_prompt.py`
- Create: `clinic-booking/api-server/claude/conversation.py`
- Create: `clinic-booking/api-server/main.py`
- Create: `clinic-booking/api-server/tests/test_conversation.py`

- [ ] **Step 1: Write MCPClientManager**

`clinic-booking/api-server/mcp/client.py`:
```python
import json
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class MCPClientManager:
    def __init__(self):
        self._session = None
        self._context = None
        self._read = None
        self._write = None

    async def start(self):
        server_path = os.getenv("MCP_SERVER_PATH", "../mcp-server/server.py")
        server_params = StdioServerParameters(
            command="python",
            args=[server_path],
            env={**os.environ},
        )
        self._context = stdio_client(server_params)
        self._read, self._write = await self._context.__aenter__()
        self._session = ClientSession(self._read, self._write)
        await self._session.__aenter__()
        await self._session.initialize()

    async def stop(self):
        if self._session:
            await self._session.__aexit__(None, None, None)
        if self._context:
            await self._context.__aexit__(None, None, None)

    async def list_tools(self):
        result = await self._session.list_tools()
        return result.tools

    async def call_tool(self, name: str, arguments: dict):
        result = await self._session.call_tool(name, arguments)
        return json.loads(result.content[0].text)
```

- [ ] **Step 2: Write Anthropic client wrapper**

`clinic-booking/api-server/claude/client.py`:
```python
import os
import anthropic

_client = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client
```

- [ ] **Step 3: Write system prompt**

`clinic-booking/api-server/claude/prompts/system_prompt.py`:
```python
def build_system_prompt(donor: dict, test_types: list[dict]) -> str:
    test_list = "\n".join(
        f"- {t['name']} (service_identifier={t['service_identifier']}, "
        f"reason_for_test={t['default_reason']})"
        for t in test_types
    )
    return f"""You are a clinic booking assistant for UBS drug testing.

The donor for this session is pre-loaded:
- Name: {donor['first_name']} {donor['last_name']}
- Donor ID: {donor['id']}
- Location: {donor.get('city', '')}, {donor.get('state', '')} {donor.get('zip', '')}

Available test types:
{test_list}

Your job:
1. Help the user find a drug test collection clinic near a location.
2. Use search_clinics to retrieve clinic options. Pass the zip code from the user's message,
   or default to the donor's zip code ({donor.get('zip', '')}) if none is given.
3. Present clinics clearly with name, address, distance, and walk-in status.
4. When the user selects a clinic, call place_order immediately with:
   - clinic_id: the EscreenSiteId of the selected clinic
   - donor_id: {donor['id']}
   - service_identifier: the code for the selected test type
   - reason_for_test: the default_reason for the selected test type
5. Confirm the booking by showing the registration_id as a receipt.

Rules:
- Never ask the donor to re-enter personal information. You already have it.
- If the user mentions filters (walk-in, handicap accessible), apply them in-context from the
  clinic list — do not call search_clinics again.
- Re-call search_clinics only if the user changes location or test type.
"""
```

- [ ] **Step 4: Write agentic conversation loop**

`clinic-booking/api-server/claude/conversation.py`:
```python
import json
from claude.client import get_client
from mcp.client import MCPClientManager

MODEL = "claude-sonnet-4-6"
MAX_ITERATIONS = 10


async def run_turn(
    messages: list[dict],
    system_prompt: str,
    donor_id: int,
    mcp: MCPClientManager,
) -> dict:
    tools = await mcp.list_tools()
    anthropic_tools = [
        {
            "name": t.name,
            "description": t.description,
            "input_schema": t.inputSchema,
        }
        for t in tools
    ]
    client = get_client()
    current_messages = list(messages)

    for _ in range(MAX_ITERATIONS):
        response = await client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            tools=anthropic_tools,
            messages=current_messages,
        )

        if response.stop_reason == "end_turn":
            text = next(
                (b.text for b in response.content if b.type == "text"), ""
            )
            current_messages.append(
                {"role": "assistant", "content": [{"type": "text", "text": text}]}
            )
            return {"reply": text, "messages": current_messages}

        if response.stop_reason == "tool_use":
            tool_uses = [b for b in response.content if b.type == "tool_use"]
            current_messages.append(
                {
                    "role": "assistant",
                    "content": [
                        {"type": "tool_use", "id": b.id, "name": b.name, "input": b.input}
                        for b in tool_uses
                    ],
                }
            )
            tool_results = []
            for block in tool_uses:
                args = dict(block.input)
                if block.name == "place_order":
                    args["donor_id"] = donor_id
                result = await mcp.call_tool(block.name, args)
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    }
                )
            current_messages.append({"role": "user", "content": tool_results})

    return {"reply": "I'm sorry, I wasn't able to complete your request.", "messages": current_messages}
```

- [ ] **Step 5: Write FastAPI entry point**

`clinic-booking/api-server/main.py`:
```python
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from mcp.client import MCPClientManager
from claude.conversation import run_turn
from claude.prompts.system_prompt import build_system_prompt

load_dotenv()

mcp_manager = MCPClientManager()

MOCK_DONORS = [
    {"id": 1, "first_name": "Alice", "last_name": "Smith", "city": "Chicago", "state": "IL", "zip": "60601"},
    {"id": 2, "first_name": "Bob", "last_name": "Jones", "city": "New York", "state": "NY", "zip": "10001"},
    {"id": 3, "first_name": "Carol", "last_name": "Lee", "city": "Los Angeles", "state": "CA", "zip": "90001"},
]

MOCK_TEST_TYPES = [
    {"name": "5-Panel Urine", "service_identifier": "5PANEL_U", "default_reason": "PE"},
    {"name": "10-Panel Urine", "service_identifier": "10PANEL_U", "default_reason": "PE"},
    {"name": "Hair Follicle 5-Panel", "service_identifier": "5PANEL_H", "default_reason": "PE"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mcp_manager.start()
    yield
    await mcp_manager.stop()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    donor_id: int
    messages: list[dict]
    user_message: str


@app.get("/api/donors")
async def list_donors():
    return MOCK_DONORS


@app.post("/api/chat")
async def chat(req: ChatRequest):
    donor = next((d for d in MOCK_DONORS if d["id"] == req.donor_id), MOCK_DONORS[0])
    system_prompt = build_system_prompt(donor, MOCK_TEST_TYPES)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]
    result = await run_turn(messages, system_prompt, req.donor_id, mcp_manager)
    return result
```

- [ ] **Step 6: Write failing test**

`clinic-booking/api-server/tests/test_conversation.py`:
```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from claude.conversation import run_turn


@pytest.mark.asyncio
async def test_run_turn_end_turn():
    mock_mcp = AsyncMock()
    mock_mcp.list_tools.return_value = []
    mock_tool = MagicMock()
    mock_tool.name = "search_clinics"
    mock_tool.description = "Search clinics"
    mock_tool.inputSchema = {"type": "object", "properties": {}}
    mock_mcp.list_tools.return_value = [mock_tool]

    mock_client_response = MagicMock()
    mock_client_response.stop_reason = "end_turn"
    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = "Here are some clinics near you."
    mock_client_response.content = [text_block]

    import claude.conversation as conv_module
    original_get_client = conv_module.get_client

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_client_response)
    conv_module.get_client = lambda: mock_client

    result = await run_turn(
        messages=[{"role": "user", "content": "Find clinics near 60601"}],
        system_prompt="You are a helpful assistant.",
        donor_id=1,
        mcp=mock_mcp,
    )

    conv_module.get_client = original_get_client
    assert "reply" in result
    assert result["reply"] == "Here are some clinics near you."
```

- [ ] **Step 7: Run test**

```bash
cd clinic-booking/api-server
python -m pytest tests/ -v
```

Expected: `test_run_turn_end_turn PASSED`

- [ ] **Step 8: Start API server and verify it starts**

```bash
ANTHROPIC_API_KEY=test USE_MOCK=true uvicorn main:app --port 8000 --reload
```

Expected: `Application startup complete.` with no errors. Ctrl+C to stop.

- [ ] **Step 9: Commit**

```bash
git add clinic-booking/api-server/
git commit -m "feat: clinic-booking FastAPI server with Claude conversation loop"
```

---

## Task 5: data-viz API Server

**Files:**
- Create: `data-viz/api-server/mcp/client.py`
- Create: `data-viz/api-server/claude/prompts/system_prompt.py`
- Create: `data-viz/api-server/claude/conversation.py`
- Create: `data-viz/api-server/main.py`

- [ ] **Step 1: Write MCPClientManager (identical pattern)**

`data-viz/api-server/mcp/client.py`:
```python
import json
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class MCPClientManager:
    def __init__(self):
        self._session = None
        self._context = None

    async def start(self):
        server_path = os.getenv("MCP_SERVER_PATH", "../mcp-server/server.py")
        server_params = StdioServerParameters(
            command="python",
            args=[server_path],
            env={**os.environ},
        )
        self._context = stdio_client(server_params)
        self._read, self._write = await self._context.__aenter__()
        self._session = ClientSession(self._read, self._write)
        await self._session.__aenter__()
        await self._session.initialize()

    async def stop(self):
        if self._session:
            await self._session.__aexit__(None, None, None)
        if self._context:
            await self._context.__aexit__(None, None, None)

    async def list_tools(self):
        result = await self._session.list_tools()
        return result.tools

    async def call_tool(self, name: str, arguments: dict):
        result = await self._session.call_tool(name, arguments)
        return json.loads(result.content[0].text)
```

- [ ] **Step 2: Write system prompt**

`data-viz/api-server/claude/prompts/system_prompt.py`:
```python
def build_system_prompt(client_id: str) -> str:
    return f"""You are a drug testing data analytics assistant for a UBS client administrator.

Client context: client_id={client_id} (injected at session start — you never need to ask for it).

You have four tools:
- get_results_summary: completed test outcomes (positives, negatives, no-shows, cancellations)
- get_pipeline_status: tests currently in progress, grouped by lifecycle stage
- get_analyte_breakdown: per-substance positive/negative counts (marijuana, cocaine, opiates, etc.)
- get_turnaround_stats: timing statistics across collection → lab → MRO → verification stages

Supported date_range values: "last 30 days", "last 90 days", "last quarter", "current year"

When answering:
1. Choose the most appropriate tool for the question. Do not call multiple tools unless the question
   genuinely requires combining data from two dimensions.
2. Respond with the data in a structured JSON block that the UI can render. Always include a
   "visualization" field with one of: "stat", "bar_chart", "pie_chart", "line_chart", "table".
3. Include a plain-English "summary" field explaining the result in 1-2 sentences.

Response format:
{{
  "summary": "...",
  "visualization": "bar_chart",
  "data": {{ ... }}
}}

If the question is ambiguous (e.g., no date range specified), ask one clarifying question before
calling any tool.
"""
```

- [ ] **Step 3: Write conversation loop**

`data-viz/api-server/claude/conversation.py`:
```python
import json
from claude.client import get_client
from mcp.client import MCPClientManager

MODEL = "claude-sonnet-4-6"
MAX_ITERATIONS = 10


def get_client():
    import os
    import anthropic
    return anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


async def run_turn(messages: list[dict], system_prompt: str, mcp: MCPClientManager) -> dict:
    tools = await mcp.list_tools()
    anthropic_tools = [
        {"name": t.name, "description": t.description, "input_schema": t.inputSchema}
        for t in tools
    ]
    client = get_client()
    current_messages = list(messages)

    for _ in range(MAX_ITERATIONS):
        response = await client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            tools=anthropic_tools,
            messages=current_messages,
        )

        if response.stop_reason == "end_turn":
            text = next((b.text for b in response.content if b.type == "text"), "")
            current_messages.append(
                {"role": "assistant", "content": [{"type": "text", "text": text}]}
            )
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = {"summary": text, "visualization": "stat", "data": {}}
            return {"reply": parsed, "messages": current_messages}

        if response.stop_reason == "tool_use":
            tool_uses = [b for b in response.content if b.type == "tool_use"]
            current_messages.append(
                {
                    "role": "assistant",
                    "content": [
                        {"type": "tool_use", "id": b.id, "name": b.name, "input": b.input}
                        for b in tool_uses
                    ],
                }
            )
            tool_results = []
            for block in tool_uses:
                result = await mcp.call_tool(block.name, dict(block.input))
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    }
                )
            current_messages.append({"role": "user", "content": tool_results})

    return {"reply": {"summary": "Unable to complete.", "visualization": "stat", "data": {}}, "messages": current_messages}
```

- [ ] **Step 4: Write FastAPI entry**

`data-viz/api-server/main.py`:
```python
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from mcp.client import MCPClientManager
from claude.conversation import run_turn
from claude.prompts.system_prompt import build_system_prompt

load_dotenv()

mcp_manager = MCPClientManager()
CLIENT_ID = os.getenv("DEMO_CLIENT_ID", "DEMO_CLIENT")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mcp_manager.start()
    yield
    await mcp_manager.stop()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict]
    user_message: str


@app.post("/api/chat")
async def chat(req: ChatRequest):
    system_prompt = build_system_prompt(CLIENT_ID)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]
    result = await run_turn(messages, system_prompt, mcp_manager)
    return result
```

- [ ] **Step 5: Start API server and verify**

```bash
cd data-viz/api-server
ANTHROPIC_API_KEY=test USE_MOCK=true uvicorn main:app --port 8001 --reload
```

Expected: `Application startup complete.` Ctrl+C to stop.

- [ ] **Step 6: Commit**

```bash
git add data-viz/api-server/
git commit -m "feat: data-viz FastAPI server with Claude conversation loop"
```

---

## Task 6: clinic-booking React Frontend

**Files:**
- Create: `clinic-booking/frontend/package.json`
- Create: `clinic-booking/frontend/vite.config.js`
- Create: `clinic-booking/frontend/index.html`
- Create: `clinic-booking/frontend/src/main.jsx`
- Create: `clinic-booking/frontend/src/App.jsx`
- Create: `clinic-booking/frontend/src/components/CandidateSelector.jsx`
- Create: `clinic-booking/frontend/src/components/Chat.jsx`
- Create: `clinic-booking/frontend/src/components/ClinicCard.jsx`
- Create: `clinic-booking/frontend/src/components/BookingConfirmation.jsx`

- [ ] **Step 1: Scaffold with Vite**

```bash
cd clinic-booking/frontend
npm create vite@latest . -- --template react
npm install
```

Expected: React + Vite project created with no errors.

- [ ] **Step 2: Write `vite.config.js` with proxy**

`clinic-booking/frontend/vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 3: Write CandidateSelector**

`clinic-booking/frontend/src/components/CandidateSelector.jsx`:
```jsx
import { useEffect, useState } from 'react'

export default function CandidateSelector({ onSelect }) {
  const [donors, setDonors] = useState([])

  useEffect(() => {
    fetch('/api/donors')
      .then(r => r.json())
      .then(setDonors)
  }, [])

  return (
    <div style={{ padding: '16px' }}>
      <label style={{ fontWeight: 'bold' }}>Select Donor: </label>
      <select onChange={e => onSelect(Number(e.target.value))}>
        <option value="">-- choose --</option>
        {donors.map(d => (
          <option key={d.id} value={d.id}>
            {d.first_name} {d.last_name}
          </option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 4: Write ClinicCard**

`clinic-booking/frontend/src/components/ClinicCard.jsx`:
```jsx
export default function ClinicCard({ clinic }) {
  const walkIn = clinic.Attributes?.find(a => a.AttributeName === 'WalkIn')?.AttributeValue === 'Y'
  const handicap = clinic.Attributes?.find(a => a.AttributeName === 'Handicap')?.AttributeValue === 'Y'

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, margin: '8px 0' }}>
      <strong>{clinic.SiteName}</strong>
      <p style={{ margin: '4px 0' }}>{clinic.Address1}, {clinic.City}, {clinic.State} {clinic.ZipCode}</p>
      <p style={{ margin: '4px 0', color: '#555' }}>{clinic.Distance} miles away</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {walkIn && <span style={{ background: '#d4edda', padding: '2px 8px', borderRadius: 4 }}>Walk-in</span>}
        {handicap && <span style={{ background: '#cce5ff', padding: '2px 8px', borderRadius: 4 }}>Handicap</span>}
      </div>
      <a href={clinic.GoogleMapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
        View on Google Maps →
      </a>
    </div>
  )
}
```

- [ ] **Step 5: Write BookingConfirmation**

`clinic-booking/frontend/src/components/BookingConfirmation.jsx`:
```jsx
export default function BookingConfirmation({ registrationId }) {
  return (
    <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 8, padding: 16, margin: '8px 0' }}>
      <strong>Booking Confirmed</strong>
      <p style={{ margin: '8px 0 0' }}>Registration ID: <code>{registrationId}</code></p>
    </div>
  )
}
```

- [ ] **Step 6: Write Chat component**

`clinic-booking/frontend/src/components/Chat.jsx`:
```jsx
import { useState, useRef, useEffect } from 'react'

export default function Chat({ donorId }) {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || !donorId) return
    const userMsg = { role: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donor_id: donorId, messages: history, user_message: input }),
    })
    const data = await res.json()
    setHistory(data.messages)
    setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '80vh' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            textAlign: m.role === 'user' ? 'right' : 'left',
            margin: '8px 0',
          }}>
            <span style={{
              display: 'inline-block',
              background: m.role === 'user' ? '#007bff' : '#f1f1f1',
              color: m.role === 'user' ? '#fff' : '#000',
              padding: '8px 12px',
              borderRadius: 12,
              maxWidth: '70%',
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </span>
          </div>
        ))}
        {loading && <p style={{ color: '#888' }}>Claude is thinking...</p>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', padding: 16, gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={donorId ? 'Type a message...' : 'Select a donor first'}
          disabled={!donorId}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
        />
        <button onClick={send} disabled={!donorId || loading} style={{ padding: '10px 20px' }}>
          Send
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Write App.jsx**

`clinic-booking/frontend/src/App.jsx`:
```jsx
import { useState } from 'react'
import CandidateSelector from './components/CandidateSelector'
import Chat from './components/Chat'

export default function App() {
  const [donorId, setDonorId] = useState(null)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ padding: 16 }}>Clinic Booking Assistant</h1>
      <CandidateSelector onSelect={setDonorId} />
      <Chat donorId={donorId} />
    </div>
  )
}
```

- [ ] **Step 8: Start dev server and manually test**

```bash
cd clinic-booking/frontend
npm run dev
```

Open http://localhost:5173 in browser.
- Select a donor from the dropdown
- Type "Find clinics near zip code 60601 for a 5-panel urine test"
- Verify Claude responds with clinic information
- Select a clinic and verify booking confirmation with registration ID

- [ ] **Step 9: Commit**

```bash
git add clinic-booking/frontend/
git commit -m "feat: clinic-booking React frontend with chat and clinic display"
```

---

## Task 7: data-viz React Frontend

**Files:**
- Create: `data-viz/frontend/` (Vite React app)
- Create: `data-viz/frontend/src/components/Chat.jsx`
- Create: `data-viz/frontend/src/components/NumberCard.jsx`
- Create: `data-viz/frontend/src/components/ChartRenderer.jsx`
- Create: `data-viz/frontend/src/components/DataTable.jsx`
- Create: `data-viz/frontend/src/App.jsx`

- [ ] **Step 1: Scaffold**

```bash
cd data-viz/frontend
npm create vite@latest . -- --template react
npm install recharts
```

- [ ] **Step 2: Write `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { '/api': 'http://localhost:8001' },
  },
})
```

- [ ] **Step 3: Write NumberCard**

`data-viz/frontend/src/components/NumberCard.jsx`:
```jsx
export default function NumberCard({ label, value }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, textAlign: 'center', minWidth: 140 }}>
      <div style={{ fontSize: 36, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  )
}
```

- [ ] **Step 4: Write ChartRenderer**

`data-viz/frontend/src/components/ChartRenderer.jsx`:
```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function ChartRenderer({ visualization, data }) {
  if (visualization === 'stat') {
    const entries = Object.entries(data).filter(([k]) => !['client_id', 'date_range'].includes(k))
    return (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 24, textAlign: 'center', minWidth: 140 }}>
            <div style={{ fontSize: 32, fontWeight: 'bold' }}>{typeof v === 'number' ? v.toFixed(1) : v}</div>
            <div style={{ color: '#666', marginTop: 4 }}>{k.replace(/_/g, ' ')}</div>
          </div>
        ))}
      </div>
    )
  }

  if (visualization === 'bar_chart') {
    const chartData = data.breakdown || data.analytes || []
    const dataKey = Object.keys(chartData[0] || {}).find(k => typeof chartData[0][k] === 'number') || 'count'
    const nameKey = Object.keys(chartData[0] || {}).find(k => typeof chartData[0][k] === 'string') || 'label'
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey={nameKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={dataKey} fill="#0088FE" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (visualization === 'pie_chart') {
    const chartData = data.breakdown || []
    const nameKey = Object.keys(chartData[0] || {}).find(k => typeof chartData[0][k] === 'string') || 'label'
    const valueKey = Object.keys(chartData[0] || {}).find(k => typeof chartData[0][k] === 'number') || 'count'
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={chartData} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={100} label>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (visualization === 'table') {
    const rows = Array.isArray(data) ? data : data.breakdown || data.analytes || []
    if (!rows.length) return null
    const cols = Object.keys(rows[0])
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{cols.map(c => <th key={c} style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd' }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map(c => <td key={c} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{row[c]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return null
}
```

- [ ] **Step 5: Write Chat component**

`data-viz/frontend/src/components/Chat.jsx`:
```jsx
import { useState, useRef, useEffect } from 'react'
import ChartRenderer from './ChartRenderer'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', text: input }])
    setInput('')
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, user_message: input }),
    })
    const data = await res.json()
    setHistory(data.messages)
    setMessages(prev => [...prev, { role: 'assistant', reply: data.reply }])
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '85vh' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '12px 0', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            {m.role === 'user' ? (
              <span style={{ background: '#007bff', color: '#fff', padding: '8px 12px', borderRadius: 12, display: 'inline-block' }}>
                {m.text}
              </span>
            ) : (
              <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16 }}>
                <p style={{ margin: '0 0 12px' }}>{m.reply?.summary}</p>
                {m.reply?.visualization && m.reply?.data && (
                  <ChartRenderer visualization={m.reply.visualization} data={m.reply.data} />
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <p style={{ color: '#888' }}>Analyzing...</p>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', padding: 16, gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your drug testing data..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
        />
        <button onClick={send} disabled={loading} style={{ padding: '10px 20px' }}>Send</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write App.jsx**

`data-viz/frontend/src/App.jsx`:
```jsx
import Chat from './components/Chat'

export default function App() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ padding: 16 }}>Drug Testing Analytics</h1>
      <Chat />
    </div>
  )
}
```

- [ ] **Step 7: Manual test**

```bash
npm run dev
```

Open http://localhost:5174. Type "How many positives in the last 30 days?" — verify chart renders.

- [ ] **Step 8: Commit**

```bash
git add data-viz/frontend/
git commit -m "feat: data-viz React frontend with Recharts visualization"
```

---

## Task 8: DB Schema + Seed Scripts

**Files:**
- Create: `db/schema_candidates.sql`
- Create: `db/schema_test_types.sql`
- Create: `db/seed_candidates.sql`

- [ ] **Step 1: Write candidates schema**

`db/schema_candidates.sql`:
```sql
CREATE TABLE IF NOT EXISTS candidates (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(40)  NOT NULL,
  last_name     VARCHAR(40)  NOT NULL,
  ssn           VARCHAR(9),
  dob           DATE,
  day_phone     VARCHAR(10),
  email         VARCHAR(320),
  address1      VARCHAR(100),
  city          VARCHAR(32),
  state         CHAR(2),
  zip           CHAR(5),
  other_id      VARCHAR(20),
  other_id_type CHAR(1)
);
```

- [ ] **Step 2: Write test_types schema**

`db/schema_test_types.sql`:
```sql
CREATE TABLE IF NOT EXISTS test_types (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  name               VARCHAR(100) NOT NULL,
  service_identifier VARCHAR(50)  NOT NULL,
  specimen_type      CHAR(1)      NOT NULL,
  default_reason     CHAR(2)      NOT NULL
);
```

- [ ] **Step 3: Write seed data**

`db/seed_candidates.sql`:
```sql
INSERT INTO candidates (first_name, last_name, ssn, dob, day_phone, email, address1, city, state, zip, other_id, other_id_type)
VALUES
  ('Alice',   'Smith',   '123456789', '1990-03-15', '3125550101', 'alice@example.com',  '123 Main St',   'Chicago',     'IL', '60601', 'DL123456', 'D'),
  ('Bob',     'Jones',   '234567890', '1985-07-22', '2125550202', 'bob@example.com',    '456 Park Ave',  'New York',    'NY', '10001', 'DL234567', 'D'),
  ('Carol',   'Lee',     '345678901', '1992-11-08', '3105550303', 'carol@example.com',  '789 Sunset Bl', 'Los Angeles', 'CA', '90001', 'PP345678', 'P'),
  ('David',   'Chen',    '456789012', '1988-01-30', '7135550404', 'david@example.com',  '321 Rice Blvd', 'Houston',     'TX', '77001', 'DL456789', 'D'),
  ('Emma',    'Wilson',  '567890123', '1995-05-19', '6025550505', 'emma@example.com',   '654 Desert Rd', 'Phoenix',     'AZ', '85001', 'DL567890', 'D');

INSERT INTO test_types (name, service_identifier, specimen_type, default_reason)
VALUES
  ('5-Panel Urine',         '5PANEL_U',  'U', 'PE'),
  ('10-Panel Urine',        '10PANEL_U', 'U', 'PE'),
  ('Hair Follicle 5-Panel', '5PANEL_H',  'H', 'PE'),
  ('Breath Alcohol',        'BAT',       'B', 'RA'),
  ('DOT 5-Panel Urine',     'DOT5_U',   'U', 'PE');
```

- [ ] **Step 4: Run migrations (when DB is available)**

```bash
mysql -u root -p ubs_escreen < db/schema_candidates.sql
mysql -u root -p ubs_escreen < db/schema_test_types.sql
mysql -u root -p ubs_escreen < db/seed_candidates.sql
```

Expected: no errors; `SELECT COUNT(*) FROM candidates;` returns 5.

- [ ] **Step 5: Commit**

```bash
git add db/
git commit -m "feat: DB schema and seed data for clinic-booking"
```

---

## Task 9: data-viz SQL Layer (Phase 2 — needs DB access)

**Files:**
- Create: `data-viz/mcp-server/db/connection.py`
- Create: `data-viz/mcp-server/db/date_range.py`
- Create: `data-viz/mcp-server/db/queries.py`

- [ ] **Step 1: Write DB connection**

`data-viz/mcp-server/db/connection.py`:
```python
import os
import pymysql
import pymysql.cursors


def get_connection():
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", 3306)),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        cursorclass=pymysql.cursors.DictCursor,
    )
```

- [ ] **Step 2: Write date range parser**

`data-viz/mcp-server/db/date_range.py`:
```python
from datetime import date, timedelta


def parse_date_range(date_range: str) -> tuple[str, str]:
    today = date.today()
    dr = date_range.lower().strip()

    if "last 30" in dr:
        start = today - timedelta(days=30)
    elif "last 90" in dr:
        start = today - timedelta(days=90)
    elif "last quarter" in dr:
        q = (today.month - 1) // 3
        if q == 0:
            start = date(today.year - 1, 10, 1)
            end_dt = date(today.year - 1, 12, 31)
        else:
            start = date(today.year, q * 3 - 2, 1)
            end_dt = date(today.year, q * 3, [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][q * 3 - 1])
        return start.isoformat(), end_dt.isoformat()
    elif "current year" in dr:
        start = date(today.year, 1, 1)
    else:
        start = today - timedelta(days=30)

    return start.isoformat(), today.isoformat()
```

- [ ] **Step 3: Write query functions**

`data-viz/mcp-server/db/queries.py`:
```python
from db.connection import get_connection
from db.date_range import parse_date_range


async def query_results_summary(client_id, date_range, disposition=None, reason_for_test=None, specimen_type=None, regulation=None):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT Disposition as disposition, COUNT(*) as count
                FROM SpecimenResults
                WHERE eScreenClientAccount = %s
                  AND CollectionDate BETWEEN %s AND %s
            """
            params = [client_id, start, end]
            if disposition:
                sql += " AND Disposition = %s"; params.append(disposition)
            if reason_for_test:
                sql += " AND ReasonForTest = %s"; params.append(reason_for_test)
            if specimen_type:
                sql += " AND SpecimenType = %s"; params.append(specimen_type)
            sql += " GROUP BY Disposition"
            cur.execute(sql, params)
            rows = cur.fetchall()
            total = sum(r["count"] for r in rows)
            return {"client_id": client_id, "date_range": date_range, "total": total, "breakdown": rows}
    finally:
        conn.close()


async def query_pipeline_status(client_id, date_range, status=None, reason_for_test=None, specimen_type=None):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT SpecimenStatus as status, COUNT(*) as count
                FROM SpecimenStatus
                WHERE eScreenClientAccount = %s
                  AND CollectionDate BETWEEN %s AND %s
                  AND FinalStatus = 0
            """
            params = [client_id, start, end]
            if status:
                sql += " AND SpecimenStatus = %s"; params.append(status)
            sql += " GROUP BY SpecimenStatus"
            cur.execute(sql, params)
            rows = cur.fetchall()
            total = sum(r["count"] for r in rows)
            return {"client_id": client_id, "date_range": date_range, "total_in_progress": total, "breakdown": rows}
    finally:
        conn.close()


async def query_analyte_breakdown(client_id, date_range, analyte_name=None, disposition=None):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT a.AnalyteName as analyte,
                       SUM(CASE WHEN a.Disposition = 'Positive' THEN 1 ELSE 0 END) as positive,
                       SUM(CASE WHEN a.Disposition != 'Positive' THEN 1 ELSE 0 END) as negative
                FROM Analytes a
                JOIN SpecimenResults r ON a.SpecimenID = r.SpecimenID
                WHERE r.eScreenClientAccount = %s
                  AND r.CollectionDate BETWEEN %s AND %s
            """
            params = [client_id, start, end]
            if analyte_name:
                sql += " AND a.AnalyteName = %s"; params.append(analyte_name)
            if disposition:
                sql += " AND a.Disposition = %s"; params.append(disposition)
            sql += " GROUP BY a.AnalyteName ORDER BY positive DESC"
            cur.execute(sql, params)
            rows = cur.fetchall()
            return {"client_id": client_id, "date_range": date_range, "analytes": rows}
    finally:
        conn.close()


async def query_turnaround_stats(client_id, date_range, reason_for_test=None, specimen_type=None, regulation=None):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    AVG(DATEDIFF(LabReceivedDate, CollectionDate))          as avg_collection_to_lab_days,
                    AVG(DATEDIFF(LabReportDate, LabReceivedDate))           as avg_lab_to_report_days,
                    AVG(DATEDIFF(VerificationDate, LabReportDate))          as avg_report_to_verification_days,
                    AVG(DATEDIFF(VerificationDate, CollectionDate))         as avg_end_to_end_days
                FROM SpecimenResults
                WHERE eScreenClientAccount = %s
                  AND CollectionDate BETWEEN %s AND %s
                  AND VerificationDate IS NOT NULL
            """
            params = [client_id, start, end]
            if reason_for_test:
                sql += " AND ReasonForTest = %s"; params.append(reason_for_test)
            if specimen_type:
                sql += " AND SpecimenType = %s"; params.append(specimen_type)
            cur.execute(sql, params)
            row = cur.fetchone()
            return {"client_id": client_id, "date_range": date_range, **(row or {})}
    finally:
        conn.close()
```

- [ ] **Step 4: Flip USE_MOCK=false and test end-to-end**

Update `data-viz/mcp-server/.env`:
```
USE_MOCK=false
DB_HOST=<from team>
DB_PORT=3306
DB_NAME=<from team>
DB_USER=<from team>
DB_PASSWORD=<from team>
ESCREEN_CLIENT_ACCOUNT=<from team>
```

```bash
cd data-viz/mcp-server
python -m pytest tests/ -v
```

Then start both servers and ask "How many positives last 30 days?" via the UI.

- [ ] **Step 5: Commit**

```bash
git add data-viz/mcp-server/db/
git commit -m "feat: data-viz SQL query layer (Phase 2)"
```

---

## Task 10: clinic-booking SOAP Layer (Phase 3 — needs eScreen credentials)

**Files:**
- Create: `clinic-booking/mcp-server/db/connection.py`
- Create: `clinic-booking/mcp-server/db/candidates.py`
- Create: `clinic-booking/mcp-server/soap/client.py`
- Create: `clinic-booking/mcp-server/soap/get_collection_sites.py`
- Create: `clinic-booking/mcp-server/soap/register_event.py`

- [ ] **Step 1: Write DB connection + candidates lookup**

`clinic-booking/mcp-server/db/connection.py`:
```python
import os
import pymysql
import pymysql.cursors


def get_connection():
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", 3306)),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        cursorclass=pymysql.cursors.DictCursor,
    )
```

`clinic-booking/mcp-server/db/candidates.py`:
```python
from db.connection import get_connection


async def get_candidate(donor_id: int) -> dict:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM candidates WHERE id = %s", (donor_id,))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Donor {donor_id} not found")
            return row
    finally:
        conn.close()
```

- [ ] **Step 2: Write SOAP client factory**

`clinic-booking/mcp-server/soap/client.py`:
```python
import os
from zeep import Client
from zeep.transports import Transport
import requests

WSDL_URL = "https://test.escreen.com/EIS/EIS.svc?wsdl"

_client = None


def get_soap_client() -> Client:
    global _client
    if _client is None:
        session = requests.Session()
        transport = Transport(session=session)
        _client = Client(WSDL_URL, transport=transport)
    return _client
```

- [ ] **Step 3: Write GetCollectionSites wrapper**

`clinic-booking/mcp-server/soap/get_collection_sites.py`:
```python
import os
from soap.client import get_soap_client


async def get_collection_sites(zipcode: str, radius: float, service_identifier: str) -> list[dict]:
    client = get_soap_client()
    request_data = {
        "PartnerID": os.environ["ESCREEN_PARTNER_ID"],
        "PartnerPassword": os.environ["ESCREEN_PARTNER_PASSWORD"],
        "ClientAccount": os.environ["ESCREEN_CLIENT_ACCOUNT"],
        "ClientSubAccount": os.environ["ESCREEN_CLIENT_SUB_ACCOUNT"],
        "ZipCode": zipcode,
        "Radius": int(radius),
        "ServiceIdentifier": service_identifier,
    }
    response = client.service.GetCollectionSites(**request_data)
    sites = []
    for site in (response.CollectionSites.CollectionSite or []):
        attrs = []
        if hasattr(site, "Attributes") and site.Attributes:
            for attr in (site.Attributes.SiteAttribute or []):
                attrs.append({"AttributeName": attr.AttributeName, "AttributeValue": attr.AttributeValue})
        sites.append({
            "EscreenSiteId": site.EscreenSiteId,
            "SiteName": site.SiteName,
            "Address1": site.Address1,
            "City": site.City,
            "State": site.State,
            "ZipCode": site.ZipCode,
            "PhoneNumber": site.PhoneNumber,
            "Latitude": float(site.Latitude or 0),
            "Longitude": float(site.Longitude or 0),
            "Distance": float(site.Distance or 0),
            "Attributes": attrs,
            "GoogleMapsUrl": f"https://www.google.com/maps?q={site.Latitude},{site.Longitude}",
        })
    return sites
```

- [ ] **Step 4: Write RegisterScheduledEvent wrapper**

`clinic-booking/mcp-server/soap/register_event.py`:
```python
import os
from soap.client import get_soap_client


async def register_scheduled_event(
    clinic_id: int,
    donor: dict,
    service_identifier: str,
    reason_for_test: str,
) -> dict:
    client = get_soap_client()
    request_data = {
        "PartnerID": os.environ["ESCREEN_PARTNER_ID"],
        "PartnerPassword": os.environ["ESCREEN_PARTNER_PASSWORD"],
        "ClientAccount": os.environ["ESCREEN_CLIENT_ACCOUNT"],
        "ClientSubAccount": os.environ["ESCREEN_CLIENT_SUB_ACCOUNT"],
        "ElectronicClientID": os.environ["ESCREEN_ELECTRONIC_CLIENT_ID"],
        "EscreenSiteId": clinic_id,
        "ServiceIdentifier": service_identifier,
        "ReasonForTest": reason_for_test,
        "FirstName": donor["first_name"],
        "LastName": donor["last_name"],
        "SSN": donor.get("ssn", ""),
        "DateOfBirth": str(donor.get("dob", "")),
        "DayPhone": donor.get("day_phone", ""),
        "EmailAddress": donor.get("email", ""),
        "Address1": donor.get("address1", ""),
        "City": donor.get("city", ""),
        "State": donor.get("state", ""),
        "ZipCode": donor.get("zip", ""),
    }
    response = client.service.RegisterScheduledEvent(**request_data)
    if response.RegistrationId:
        return {"success": True, "registration_id": response.RegistrationId, "errors": []}
    errors = [e.ErrorMessage for e in (response.Errors.Error or [])] if response.Errors else []
    return {"success": False, "registration_id": None, "errors": errors}
```

- [ ] **Step 5: Set credentials and flip USE_MOCK=false**

Update `clinic-booking/mcp-server/.env`:
```
USE_MOCK=false
ESCREEN_PARTNER_ID=<from team>
ESCREEN_PARTNER_PASSWORD=<from team>
ESCREEN_CLIENT_ACCOUNT=<from team>
ESCREEN_CLIENT_SUB_ACCOUNT=<from team>
ESCREEN_ELECTRONIC_CLIENT_ID=<from team>
DB_HOST=<from team>
...
```

- [ ] **Step 6: Test end-to-end booking via UI**

Start both servers. Select a donor, search for clinics near a real zip, pick one, confirm booking.
Expected: real RegistrationId returned from eScreen test environment.

- [ ] **Step 7: Commit**

```bash
git add clinic-booking/mcp-server/db/ clinic-booking/mcp-server/soap/
git commit -m "feat: clinic-booking SOAP layer for eScreen live integration (Phase 3)"
```

---

## Task 11: Multi-Transport — Claude Desktop + ChatGPT Actions

**Files:**
- Create: `clinic-booking/mcp-server/server_http.py`
- Create: `data-viz/mcp-server/server_http.py`
- Create: `clinic-booking/mcp-server/openapi.json`
- Create: `data-viz/mcp-server/openapi.json`
- Create: `clinic-booking/api-server/rest_actions.py`
- Create: `data-viz/api-server/rest_actions.py`

- [ ] **Step 1: Write clinic-booking HTTP/SSE server (Claude Desktop)**

`clinic-booking/mcp-server/server_http.py`:
```python
import os
from server import mcp
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    mcp.run(
        transport="sse",
        host="0.0.0.0",
        port=int(os.getenv("MCP_PORT", "8010")),
    )
```

- [ ] **Step 2: Write data-viz HTTP/SSE server**

`data-viz/mcp-server/server_http.py`:
```python
import os
from server import mcp
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    mcp.run(
        transport="sse",
        host="0.0.0.0",
        port=int(os.getenv("MCP_PORT", "8011")),
    )
```

- [ ] **Step 3: Start SSE servers and verify**

```bash
# Terminal 1
cd clinic-booking/mcp-server && USE_MOCK=true python server_http.py

# Terminal 2
cd data-viz/mcp-server && USE_MOCK=true python server_http.py
```

Expected: both servers start and listen on ports 8010/8011.

- [ ] **Step 4: Add Claude Desktop config**

Create `claude_desktop_config.json` at the project root (for reference — user copies relevant block into their Claude Desktop settings):

```json
{
  "mcpServers": {
    "clinic-booking": {
      "url": "http://localhost:8010/sse"
    },
    "data-viz": {
      "url": "http://localhost:8011/sse"
    }
  }
}
```

Actual Claude Desktop config file location:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

- [ ] **Step 5: Test Claude Desktop connection**

Open Claude Desktop → Settings → Developer → verify `clinic-booking` and `data-viz` MCP servers appear with green status. Type "search clinics near 60601 for a 5-panel test" and verify Claude invokes the `search_clinics` tool.

- [ ] **Step 6: Write clinic-booking OpenAPI spec**

`clinic-booking/mcp-server/openapi.json`:
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Clinic Booking MCP API",
    "version": "1.0.0",
    "description": "REST wrapper around the clinic-booking MCP tools for ChatGPT Custom GPT Actions"
  },
  "servers": [{ "url": "http://localhost:8000" }],
  "paths": {
    "/actions/search_clinics": {
      "post": {
        "operationId": "search_clinics",
        "summary": "Search for drug test collection clinics near a zip code",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["zipcode", "radius", "service_identifier"],
                "properties": {
                  "zipcode": { "type": "string", "description": "5-digit US zip code" },
                  "radius": { "type": "number", "description": "Search radius in miles (1-60)" },
                  "service_identifier": { "type": "string", "description": "eScreen service code" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "List of clinics",
            "content": { "application/json": { "schema": { "type": "array", "items": { "type": "object" } } } }
          }
        }
      }
    },
    "/actions/place_order": {
      "post": {
        "operationId": "place_order",
        "summary": "Place a drug test booking at a clinic",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["clinic_id", "donor_id", "service_identifier", "reason_for_test"],
                "properties": {
                  "clinic_id": { "type": "integer" },
                  "donor_id": { "type": "integer" },
                  "service_identifier": { "type": "string" },
                  "reason_for_test": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Booking result",
            "content": { "application/json": { "schema": { "type": "object" } } }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 7: Write REST action endpoints (clinic-booking)**

Add to `clinic-booking/api-server/main.py` (append after existing routes):

`clinic-booking/api-server/rest_actions.py`:
```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/actions")


class SearchClinicsRequest(BaseModel):
    zipcode: str
    radius: float
    service_identifier: str


class PlaceOrderRequest(BaseModel):
    clinic_id: int
    donor_id: int
    service_identifier: str
    reason_for_test: str


def register_action_routes(app, mcp_manager):
    @app.post("/actions/search_clinics")
    async def action_search_clinics(req: SearchClinicsRequest):
        return await mcp_manager.call_tool("search_clinics", req.model_dump())

    @app.post("/actions/place_order")
    async def action_place_order(req: PlaceOrderRequest):
        return await mcp_manager.call_tool("place_order", req.model_dump())
```

In `clinic-booking/api-server/main.py`, add after `app = FastAPI(lifespan=lifespan)`:
```python
from rest_actions import register_action_routes
# called after mcp_manager is available — add at bottom of file:
register_action_routes(app, mcp_manager)
```

- [ ] **Step 8: Write data-viz OpenAPI spec**

`data-viz/mcp-server/openapi.json`:
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Viz MCP API",
    "version": "1.0.0",
    "description": "REST wrapper around the data-viz MCP tools for ChatGPT Custom GPT Actions"
  },
  "servers": [{ "url": "http://localhost:8001" }],
  "paths": {
    "/actions/get_results_summary": {
      "post": {
        "operationId": "get_results_summary",
        "summary": "Get completed test result counts by disposition",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["date_range"],
                "properties": {
                  "date_range": { "type": "string", "description": "e.g. 'last 30 days', 'last quarter'" },
                  "disposition": { "type": "string" },
                  "reason_for_test": { "type": "string" },
                  "specimen_type": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": { "200": { "description": "Summary data", "content": { "application/json": { "schema": { "type": "object" } } } } }
      }
    },
    "/actions/get_pipeline_status": {
      "post": {
        "operationId": "get_pipeline_status",
        "summary": "Get counts of tests in progress by pipeline stage",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["date_range"],
                "properties": {
                  "date_range": { "type": "string" },
                  "status": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": { "200": { "description": "Pipeline data", "content": { "application/json": { "schema": { "type": "object" } } } } }
      }
    }
  }
}
```

- [ ] **Step 9: Write data-viz REST action endpoints**

`data-viz/api-server/rest_actions.py`:
```python
from pydantic import BaseModel


class ResultsSummaryRequest(BaseModel):
    date_range: str
    disposition: str | None = None
    reason_for_test: str | None = None
    specimen_type: str | None = None


class PipelineStatusRequest(BaseModel):
    date_range: str
    status: str | None = None


def register_action_routes(app, mcp_manager):
    @app.post("/actions/get_results_summary")
    async def action_results_summary(req: ResultsSummaryRequest):
        return await mcp_manager.call_tool("get_results_summary", req.model_dump(exclude_none=True))

    @app.post("/actions/get_pipeline_status")
    async def action_pipeline_status(req: PipelineStatusRequest):
        return await mcp_manager.call_tool("get_pipeline_status", req.model_dump(exclude_none=True))
```

Add to `data-viz/api-server/main.py` after app definition:
```python
from rest_actions import register_action_routes
register_action_routes(app, mcp_manager)
```

- [ ] **Step 10: Test REST endpoints**

```bash
curl -X POST http://localhost:8000/actions/search_clinics \
  -H "Content-Type: application/json" \
  -d '{"zipcode":"60601","radius":10,"service_identifier":"5PANEL_U"}'
```

Expected: JSON array of 3 mock clinics.

```bash
curl -X POST http://localhost:8001/actions/get_results_summary \
  -H "Content-Type: application/json" \
  -d '{"date_range":"last 30 days"}'
```

Expected: JSON with `total` and `breakdown` fields.

- [ ] **Step 11: Configure ChatGPT Custom GPT**

In ChatGPT:
1. Create a new Custom GPT → Configure → Actions
2. Import schema → paste contents of `clinic-booking/mcp-server/openapi.json`
3. Set auth to None (for local demo)
4. Test: "Search for clinics near zip code 60601 for a 5-panel urine test"

Expected: GPT calls `/actions/search_clinics` and displays results.

- [ ] **Step 12: Commit**

```bash
git add clinic-booking/mcp-server/server_http.py clinic-booking/mcp-server/openapi.json clinic-booking/api-server/rest_actions.py
git add data-viz/mcp-server/server_http.py data-viz/mcp-server/openapi.json data-viz/api-server/rest_actions.py
git add claude_desktop_config.json
git commit -m "feat: multi-transport support — Claude Desktop SSE + ChatGPT OpenAPI Actions"
```

---

## Summary of What Each Phase Unlocks

| Phase | Tasks | What works |
|---|---|---|
| Phase 1 (no credentials) | 1–8 | Both React UIs fully demoable with mock data |
| Phase 2 (DB access) | 9 | data-viz queries real eScreen specimen data |
| Phase 3 (eScreen credentials) | 10 | clinic-booking places real bookings via SOAP |
| Phase 4 (any) | 11 | Claude Desktop and ChatGPT also work as clients |

