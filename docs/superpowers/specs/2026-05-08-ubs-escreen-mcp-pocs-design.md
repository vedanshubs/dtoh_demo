# UBS eScreen MCP POCs — Design Document
*2026-05-08*

## Overview

Two independent POCs demonstrating MCP as the core intelligence layer between Claude and external systems. Claude never directly touches an API or database — every data operation flows through a named MCP tool that Claude autonomously decides when and how to invoke.

**Repo:** `ubs_mcp_demo/` (empty git repo, starting from scratch)
**LLM:** Claude claude-sonnet-4-6 via Anthropic API
**MCP tech stack:** Node.js (both POCs)
**Frontend:** React (separate apps per POC)
**Database:** Existing SQL DB (type TBC from team)

---

## POC 1 — Clinic Search & Booking

### What it does

A conversational chatbot that lets an HR Admin or Candidate search for drug test collection clinics near a location and place a booking — all through a chat interface. Donor details are pre-filled from the DB and silently injected. The user never re-enters personal information.

Two modes:
- **Mode 1 (Quick):** User sends intent in one message → clinics listed → user picks → booking placed
- **Mode 2 (Conversational):** Claude guides step-by-step through date, test type, location, filters, selection, booking

Both modes end with a RegistrationId (Booking ID) shown as a confirmation receipt.

### Architecture

```
User (React Chat UI)
    ↓
Claude claude-sonnet-4-6 — system prompt defines tools + injects donor profile
    ↓ autonomous tool calls
MCP Server (Node.js)
    ├── search_clinics  →  SOAP: GetCollectionSites
    └── place_order     →  SOAP: RegisterScheduledEvent
                             ↓ reads donor from
Internal DB
    ├── candidates      (3-5 pre-seeded donors)
    └── test_types      (5-6 tests → ServiceIdentifier + SpecimenType + ReasonForTest)

eScreen SOAP endpoint: https://test.escreen.com/EIS/EIS.svc
```

### MCP Tools

#### `search_clinics`
- **Purpose:** Fetch all clinics near a location for a given test type
- **Inputs:** `zipcode` (string), `radius` (1–60 miles), `service_identifier` (string)
- **Action:** Calls `GetCollectionSites` SOAP operation
- **Output:** Array of clinic objects with all attributes and hours
- **Called when:** User provides location + test type. Re-called only if location/test changes.
- **Filtering:** All attribute filtering (handicap, walk-in, hours) done by LLM in-context — no second tool call needed

```json
// Output shape per clinic
{
  "EscreenSiteId": 12345,
  "SiteName": "...",
  "Address1": "...", "City": "...", "State": "...", "ZipCode": "...",
  "PhoneNumber": "...",
  "Latitude": 0.0, "Longitude": 0.0,
  "Distance": 2.3,
  "Attributes": [{ "AttributeName": "...", "AttributeValue": "..." }],
  "GoogleMapsUrl": "https://www.google.com/maps?q={lat},{lng}"
}
```

#### `place_order`
- **Purpose:** Submit a drug test booking to eScreen
- **Inputs:** `clinic_id` (EscreenSiteId), `donor_id` (internal), `service_identifier`, `reason_for_test`
- **Action:** MCP fetches donor from DB, constructs `RegisterScheduledEvent` SOAP call
- **Output:** `{ registration_id, success, errors }`
- **Called when:** User confirms clinic selection
- **Security:** Donor PII fetched server-side — never passes through Claude

### Database Schema

```sql
-- candidates table
CREATE TABLE candidates (
  id          SERIAL PRIMARY KEY,
  first_name  VARCHAR(40) NOT NULL,
  last_name   VARCHAR(40) NOT NULL,
  ssn         VARCHAR(9),
  dob         DATE,
  day_phone   VARCHAR(10),
  email       VARCHAR(320),
  address1    VARCHAR(100),
  city        VARCHAR(32),
  state       CHAR(2),
  zip         CHAR(5),
  other_id    VARCHAR(20),
  other_id_type CHAR(1)   -- D=Driver License, P=Passport, E=Employer
);

-- test_types table
CREATE TABLE test_types (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,  -- e.g. "5-Panel Urine"
  service_identifier  VARCHAR(50) NOT NULL,   -- eScreen code (TBC from team)
  specimen_type       CHAR(1) NOT NULL,       -- U=Urine, H=Hair, B=Breath
  default_reason      CHAR(2) NOT NULL        -- PE=Pre-employment, RA=Random etc.
);
```

### Frontend Components

- Chat input + message display (standard chat layout)
- Clinic card: name, address, distance, hours, attributes badges, Google Maps link
- Booking confirmation: RegistrationId + receipt summary
- Candidate selector: dropdown to load pre-seeded donor before starting chat

### What's Mocked for POC

- Authentication — hardcoded candidate selected from dropdown
- eScreen API responses — stub JSON returned when credentials unavailable
- Error handling — happy path only
- Mode 2 only after Mode 1 is working

### Credentials Needed (from team)

- PartnerID, PartnerPassword
- ClientAccount, ClientSubAccount, ElectronicClientID
- ServiceIdentifier codes per test type
- Whether Scheduling Rules are configured (or: default NumberOfDays + TimeType)
- Which donor fields are mandatory for their account config

---

## POC 2 — Data Visualization

### What it does

A conversational interface for a Client Admin to query eScreen drug test data in plain English and receive answers as numbers, tables, or charts. No pre-built reports — fully self-serve through chat. All data is scoped to the logged-in client's account, enforced at the MCP server level.

### Architecture

```
Admin (React Chat UI)
    ↓
Claude claude-sonnet-4-6 — system prompt defines 4 tools, client_id injected at session start
    ↓ autonomous tool calls
MCP Server (Node.js) — client_id enforced on EVERY query, never left to LLM
    ├── get_results_summary    → SELECT from SpecimenResults
    ├── get_pipeline_status    → SELECT from SpecimenStatus
    ├── get_analyte_breakdown  → SELECT from Analytes JOIN SpecimenResults
    └── get_turnaround_stats   → SELECT date diffs from SpecimenResults
    ↓
Existing SQL DB (SpecimenStatus, SpecimenResults, Analytes tables)
```

### Data Sources

eScreen pushes data via HTTP XML to a receiver endpoint:
- **Specimen Status Service** — real-time lifecycle updates per test as it moves through stages
- **Specimen Results Service** — final outcomes when a test result is finalized and MRO-verified
- **Analytes** — one record per substance within a result, child of SpecimenResults

For POC: both tables already exist in the DB with data. No receiver needed.

### MCP Tools

#### `get_results_summary`
- **Purpose:** Answer questions about completed test outcomes
- **Inputs:** `client_id`, `date_range`, `disposition?`, `reason_for_test?`, `specimen_type?`, `regulation?`
- **Output:** Result counts grouped by requested dimension
- **Example questions:** "How many positives last quarter?", "DOT vs Non-DOT split?", "No-shows this month?"

#### `get_pipeline_status`
- **Purpose:** Answer questions about tests currently in progress
- **Inputs:** `client_id`, `date_range`, `status?`, `reason_for_test?`, `specimen_type?`
- **Output:** Count + list of in-flight tests grouped by status stage
- **Example questions:** "How many in MRO review?", "Any expired tests this month?"

#### `get_analyte_breakdown`
- **Purpose:** Answer substance-level questions
- **Inputs:** `client_id`, `date_range`, `analyte_name?`, `disposition?`
- **Output:** Per-substance positive/negative counts
- **Why separate:** Analyte is a child record — one result has many analytes. Mixing gives wrong counts.
- **Example questions:** "Which substance tests positive most?", "Marijuana positives last quarter?"

#### `get_turnaround_stats`
- **Purpose:** Answer time-based lifecycle questions
- **Inputs:** `client_id`, `date_range`, `reason_for_test?`, `specimen_type?`, `regulation?`
- **Output:** avg/min/max days across: Collection→LabReceived, LabReceived→LabReport, LabReport→Verification, Collection→Verification
- **Example questions:** "Average end-to-end turnaround this month?", "MRO time trend over 3 months?"

### Tool Chaining

| Question type | Tools called |
|---|---|
| Single dimension | One tool, relevant filter |
| Cross-dimension | Two tools chained, results combined |
| Follow-up | Same tool re-called with updated filters |
| Ambiguous | LLM asks clarifying question before calling any tool |

### Visualization Logic

Frontend renders based on data shape returned:

| Data shape | Component |
|---|---|
| Single number | Large stat card |
| 2–3 values | Side-by-side number cards |
| Multiple categories | Bar chart or pie chart (Recharts) |
| Trend over time | Line chart (Recharts) |
| Multi-row breakdown | Table |

### Date Range Handling (in MCP server)

```
"last 30 days"     → WHERE date >= NOW() - INTERVAL 30 DAY
"last 90 days"     → WHERE date >= NOW() - INTERVAL 90 DAY
"current year"     → WHERE YEAR(date) = YEAR(NOW())
"last quarter"     → calculated quarter boundaries
```

### Security — client_id Scoping

client_id is injected into session context at login. Every MCP tool call appends `AND eScreenClientAccount = :client_id` to its query. This is enforced in the MCP server — the LLM cannot override or omit it.

### What's Mocked for POC

- Authentication — hardcoded client_id for the demo admin
- Start with `get_results_summary` + `get_pipeline_status` first; add analyte + turnaround after
- Full date range flexibility — support last 30 days, last 90 days, current year for POC

### Details Needed (from team)

- DB connection string (host, port, DB name, credentials)
- Exact column names for SpecimenStatus, SpecimenResults, Analytes tables
- eScreenClientAccount value for the demo client
- Disposition + Status storage format (numeric codes or decoded strings)
- Date field types (DATE/DATETIME or VARCHAR)

---

## Repo Structure

```
ubs_mcp_demo/
├── mcp-server/
│   ├── poc1-booking/
│   │   ├── index.js          ← MCP server entry
│   │   ├── tools/
│   │   │   ├── search-clinics.js
│   │   │   └── place-order.js
│   │   ├── soap/
│   │   │   ├── get-collection-sites.js
│   │   │   └── register-scheduled-event.js
│   │   └── db/
│   │       └── candidates.js
│   └── poc2-dataviz/
│       ├── index.js
│       └── tools/
│           ├── get-results-summary.js
│           ├── get-pipeline-status.js
│           ├── get-analyte-breakdown.js
│           └── get-turnaround-stats.js
├── frontend/
│   ├── poc1/                 ← React: chat + clinic cards
│   └── poc2/                 ← React: chat + charts
├── db/
│   ├── schema-candidates.sql
│   ├── schema-test-types.sql
│   └── seed-candidates.sql
└── docs/
    └── superpowers/specs/
        └── 2026-05-08-ubs-escreen-mcp-pocs-design.md
```

---

## Build Order

### Phase 1 — Foundations (no credentials needed)
1. Repo scaffolding — both MCP servers + both React apps
2. MCP tool skeletons with mock responses
3. Claude system prompts for both POCs
4. React frontends (chat UI + components)
5. DB schema + seed scripts for POC 1

### Phase 2 — POC 2 SQL Layer (needs DB access)
6. Connect MCP to real DB
7. Write + test all 4 SQL queries
8. Wire Claude → MCP → DB → frontend end-to-end

### Phase 3 — POC 1 SOAP Integration (needs eScreen credentials)
9. Build SOAP XML request/response handlers
10. Swap mock → live eScreen calls
11. Test both booking modes end-to-end

---

## What We Are Parking

- Real authentication (both POCs use a mocked logged-in user)
- Full error handling (happy path only for POC)
- Real-time clinic availability checking
- eScreen Document Retrieval Service
- Complex multi-tool chained queries (validate single tools first)
