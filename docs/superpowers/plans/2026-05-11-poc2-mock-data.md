# POC 2 Mock Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four hardcoded data-viz mock responses with real MySQL-backed queries against a seeded DTOH-schema database containing ~1,150 realistic drug test records spanning June 2025–May 2026, with deliberate story-arc patterns baked in.

**Architecture:** A Python generator script produces `db/seed_poc2_data.sql` deterministically (seed=42). The real DTOH table hierarchy (`CollectionOrder → TestReport → DrugReport → PanelResult → SubstanceResult`) is created in the same MySQL Docker instance as POC 1. All four MCP tool handlers gain a `use_mock` switch — mock path returns existing hardcoded responses, DB path runs real multi-table JOIN queries. Client scoping (`AccountNumber = 'UBS001'`) is enforced in every query, never left to Claude.

**Tech Stack:** Python 3.11, MySQL 8 (Docker), pymysql, pytest, pytest-asyncio.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `db/schema_poc2.sql` | MySQL CREATE TABLE for 11 DTOH tables |
| Create | `db/seed_poc2_reference.sql` | Static reference rows (StatusType, ResultType, etc.) |
| Create | `scripts/generate_poc2_data.py` | Deterministic data generator |
| Create | `db/seed_poc2_data.sql` | Generated output — ~1,150 records, committed |
| Modify | `mcp-server/db/queries.py` | Rewrite all 4 queries to use real DTOH tables |
| Modify | `mcp-server/tools/get_results_summary.py` | Add `use_mock` param, wire DB path |
| Modify | `mcp-server/tools/get_pipeline_status.py` | Add `use_mock` param, wire DB path |
| Modify | `mcp-server/tools/get_analyte_breakdown.py` | Add `use_mock` param, wire DB path |
| Modify | `mcp-server/tools/get_turnaround_stats.py` | Add `use_mock` param, wire DB path |
| Modify | `mcp-server/tests/test_results_summary.py` | Fix `use_mock` call, add filter assertions |
| Modify | `mcp-server/tests/test_pipeline_status.py` | Fix `use_mock` call, add assertions |

---

## Task 1: MySQL schema for DTOH tables

**Files:**
- Create: `db/schema_poc2.sql`

- [ ] **Step 1: Create the schema file**

Create `db/schema_poc2.sql`:

```sql
-- POC 2: DTOH table structure in MySQL
-- Column names match production SQL Server schema exactly.
-- Run after schema_candidates.sql (separate DB namespace, no conflicts).

CREATE TABLE IF NOT EXISTS StatusType (
  StatusTypeId  INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName   VARCHAR(100) NOT NULL,
  SystemName    VARCHAR(50)  NOT NULL
);

CREATE TABLE IF NOT EXISTS ResultType (
  ResultTypeId  INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName   VARCHAR(100) NOT NULL,
  SystemName    VARCHAR(50)  NOT NULL,
  IsDrug        TINYINT(1)   NOT NULL DEFAULT 1,
  IsOccHealth   TINYINT(1)   NOT NULL DEFAULT 0,
  IsSubstance   TINYINT(1)   NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS IndustryType (
  IndustryTypeId INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName    VARCHAR(100) NOT NULL,
  SystemName     VARCHAR(50)  NOT NULL,
  IsDOT          TINYINT(1)   NOT NULL
);

CREATE TABLE IF NOT EXISTS SampleType (
  SampleTypeId INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName  VARCHAR(100) NOT NULL,
  SystemName   VARCHAR(50)  NOT NULL
);

CREATE TABLE IF NOT EXISTS TestReason (
  TestReasonId    INT AUTO_INCREMENT PRIMARY KEY,
  TestReasonTitle VARCHAR(150) NOT NULL,
  Abbreviation    VARCHAR(50)  NULL,
  IsDrug          TINYINT(1)   NOT NULL DEFAULT 1,
  IsOccHealth     TINYINT(1)   NOT NULL DEFAULT 0,
  SystemName      VARCHAR(50)  NULL
);

CREATE TABLE IF NOT EXISTS Substance (
  SubstanceId   INT AUTO_INCREMENT PRIMARY KEY,
  DisplayName   VARCHAR(100) NULL,
  SystemName    VARCHAR(50)  NULL,
  AnalyteID     VARCHAR(50)  NULL,
  SpecimenType  VARCHAR(50)  NULL
);

CREATE TABLE IF NOT EXISTS CollectionOrder (
  CollectionOrderId  INT AUTO_INCREMENT PRIMARY KEY,
  AccountNumber      VARCHAR(6)   NULL,
  TestReason         VARCHAR(50)  NULL,
  IsDOT              TINYINT(1)   NOT NULL DEFAULT 0,
  CostCenter         VARCHAR(50)  NULL,
  RecordCreatedDate  DATETIME     NULL,
  StatusTypeId       INT          NULL,
  CreatedOn          DATETIME     NULL
);

CREATE TABLE IF NOT EXISTS TestReport (
  TestReportId            INT AUTO_INCREMENT PRIMARY KEY,
  CollectionOrderId       INT          NULL,
  StatusId                INT          NULL,
  ResultTypeId            INT          NULL,
  IndustryTypeId          INT          NULL,
  DateOfService           DATETIME     NULL,
  ReasonForTest           VARCHAR(100) NULL,
  Regulation              VARCHAR(20)  NULL,
  eScreenStatusCode       VARCHAR(50)  NULL,
  eScreenStatusDescription VARCHAR(255) NULL,
  TestReportAccountNumber VARCHAR(100) NULL,
  CreatedOn               DATETIME     NULL
);

CREATE TABLE IF NOT EXISTS DrugReport (
  DrugReportId        INT AUTO_INCREMENT PRIMARY KEY,
  TestReportId        INT          NOT NULL,
  Disposition         VARCHAR(20)  NULL,
  SampleType          VARCHAR(20)  NULL,
  SpecimenType        VARCHAR(100) NULL,
  CollectionDateTime  DATETIME     NULL,
  LabReceivedDate     DATETIME     NULL,
  LabReportDateTime   DATETIME     NULL,
  MROReceivedDate     DATETIME     NULL,
  VerificationDate    DATETIME     NULL,
  LabName             VARCHAR(100) NULL,
  CreatedOn           DATETIME     NULL
);

CREATE TABLE IF NOT EXISTS PanelResult (
  PanelResultId INT AUTO_INCREMENT PRIMARY KEY,
  DrugReportId  INT          NULL,
  ResultTypeId  INT          NULL,
  PanelName     VARCHAR(255) NULL,
  CreatedOn     DATETIME     NULL
);

CREATE TABLE IF NOT EXISTS SubstanceResult (
  SubstanceResultId INT AUTO_INCREMENT PRIMARY KEY,
  PanelResultId     INT          NULL,
  SubstanceId       INT          NULL,
  AnalyteName       VARCHAR(100) NULL,
  Disposition       VARCHAR(5)   NULL,
  SpecimenType      VARCHAR(20)  NULL,
  SampleTypeId      INT          NULL,
  CreatedOn         DATETIME     NULL
);
```

- [ ] **Step 2: Commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add db/schema_poc2.sql
git commit -m "data: add MySQL schema for DTOH POC 2 tables"
```

---

## Task 2: Reference data seed

**Files:**
- Create: `db/seed_poc2_reference.sql`

- [ ] **Step 1: Create the reference seed file**

Create `db/seed_poc2_reference.sql`:

```sql
-- POC 2 reference / lookup data
-- Idempotent: safe to re-run (uses INSERT IGNORE)

INSERT IGNORE INTO StatusType (StatusTypeId, DisplayName, SystemName) VALUES
  (1, 'Order Created – Awaiting Donor',   'order_created'),
  (2, 'Pending Collection',               'pending_collection'),
  (3, 'Collected – In Transit',           'collected_in_transit'),
  (4, 'At Laboratory',                    'at_laboratory'),
  (5, 'Lab Reported – MRO Review',        'lab_reported_mro'),
  (6, 'MRO Verified – Pending Delivery',  'mro_verified'),
  (7, 'Completed',                        'completed');

INSERT IGNORE INTO ResultType (ResultTypeId, DisplayName, SystemName) VALUES
  (1, 'Negative',          'negative'),
  (2, 'Positive',          'positive'),
  (3, 'Test Not Performed','not_performed'),
  (4, 'Cancelled',         'cancelled'),
  (5, 'No Show',           'no_show'),
  (6, 'Rejected Specimen', 'rejected');

INSERT IGNORE INTO IndustryType (IndustryTypeId, DisplayName, SystemName, IsDOT) VALUES
  (1, 'Non-DOT', 'non_dot', 0),
  (2, 'DOT',     'dot',     1);

INSERT IGNORE INTO SampleType (SampleTypeId, DisplayName, SystemName) VALUES
  (1, 'Urine',       'urine'),
  (2, 'Hair',        'hair'),
  (3, 'Oral Fluid',  'oral_fluid'),
  (4, 'Breath',      'breath');

INSERT IGNORE INTO TestReason (TestReasonId, TestReasonTitle, Abbreviation, IsDrug) VALUES
  (1, 'Pre-Employment', 'PE',  1),
  (2, 'Random',         'RA',  1),
  (3, 'For Cause',      'FC',  1),
  (4, 'Post-Accident',  'PA',  1),
  (5, 'Return to Duty', 'RTD', 1);

INSERT IGNORE INTO Substance (SubstanceId, DisplayName, SystemName, AnalyteID, SpecimenType) VALUES
  (1, 'THC/Marijuana',              'thc',            'THC',  'Urine'),
  (2, 'Cocaine Metabolites',        'cocaine',        'COC',  'Urine'),
  (3, 'Amphetamines',               'amphetamines',   'AMP',  'Urine'),
  (4, 'Opiates (Codeine/Morphine)', 'opiates',        'OPI',  'Urine'),
  (5, 'Oxycodone',                  'oxycodone',      'OXY',  'Urine'),
  (6, 'PCP',                        'pcp',            'PCP',  'Urine'),
  (7, 'Methamphetamines',           'methamphetamine','MET',  'Urine'),
  (8, 'Benzodiazepines',            'benzodiazepines','BZO',  'Urine');
```

- [ ] **Step 2: Commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add db/seed_poc2_reference.sql
git commit -m "data: add POC 2 reference seed (StatusType, ResultType, Substance, etc.)"
```

---

## Task 3: Data generator script

**Files:**
- Create: `scripts/generate_poc2_data.py`

- [ ] **Step 1: Create the generator**

Create `scripts/generate_poc2_data.py`:

```python
#!/usr/bin/env python3
"""
One-time generator for POC 2 mock drug test data.
Run from repo root: python scripts/generate_poc2_data.py
Output committed to db/seed_poc2_data.sql — do not edit by hand.
Re-run with same seed=42 for identical output.
"""
import calendar
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

OUTPUT = Path(__file__).parent.parent / "db" / "seed_poc2_data.sql"

CLIENT_ACCOUNT = "UBS001"
MONTHLY_BASE = 100

OFFICES = [("NY-HQ", 0.40), ("NJ-Weehawken", 0.25), ("CT-Stamford", 0.20), ("IL-Chicago", 0.15)]
REASONS = [("Pre-Employment", 0.65), ("Random", 0.25), ("For Cause", 0.07), ("Post-Accident", 0.02), ("Return to Duty", 0.01)]
SPECIMENS = [("Urine", 0.80), ("Hair", 0.12), ("Oral Fluid", 0.05), ("Breath", 0.03)]

# (name, result_type_id, base_probability)
OUTCOMES = [
    ("Negative",          1, 0.890),
    ("Positive",          2, 0.045),
    ("Test Not Performed",3, 0.030),
    ("Cancelled",         4, 0.020),
    ("No Show",           5, 0.010),
    ("Rejected Specimen", 6, 0.004),
]

# (name, substance_id, prob_given_positive)
SUBSTANCES = [
    ("THC/Marijuana",              1, 0.55),
    ("Cocaine Metabolites",        2, 0.15),
    ("Amphetamines",               3, 0.10),
    ("Opiates (Codeine/Morphine)", 4, 0.10),
    ("Oxycodone",                  5, 0.05),
    ("PCP",                        6, 0.03),
    ("Methamphetamines",           7, 0.02),
    ("Benzodiazepines",            8, 0.00),
]

PANEL_NAMES = {"Urine": "5-Panel Urine", "Hair": "Hair Follicle 5-Panel",
               "Oral Fluid": "Oral Fluid 5-Panel", "Breath": "Breath Alcohol Test"}

# Turnaround per office in days: (min, max) per leg
TA = {
    "CT-Stamford":  {"c2l": (0.7, 1.3), "l2r": (1.4, 2.0), "r2m": (0.4, 0.8), "m2v": (0.3, 0.6)},
    "NY-HQ":        {"c2l": (0.9, 1.4), "l2r": (1.6, 2.3), "r2m": (0.5, 1.0), "m2v": (0.4, 0.7)},
    "NJ-Weehawken": {"c2l": (1.0, 1.6), "l2r": (1.7, 2.5), "r2m": (0.6, 1.0), "m2v": (0.4, 0.8)},
    "IL-Chicago":   {"c2l": (1.5, 2.8), "l2r": (2.3, 3.8), "r2m": (0.7, 1.3), "m2v": (0.5, 1.0)},
}

LAB_NAMES = ["Quest Diagnostics", "LabCorp"]

ESCREEN_STATUS = {
    1: ("ORDER_CREATED",       "Order Created – Awaiting Donor"),
    2: ("PENDING_COLLECTION",  "Pending Collection"),
    3: ("COLLECTED_IN_TRANSIT","Specimen Collected – In Transit"),
    4: ("AT_LAB",              "Specimen at Laboratory"),
    5: ("LAB_REPORTED",        "Lab Reported – Pending MRO Review"),
    6: ("MRO_VERIFIED",        "MRO Verified – Pending Delivery"),
    7: ("COMPLETED",           "Test Completed"),
}


def weighted(choices):
    names, weights = zip(*choices)
    return random.choices(names, weights=weights, k=1)[0]


def fmt(dt):
    return f"'{dt.strftime('%Y-%m-%d %H:%M:%S')}'" if dt else "NULL"


def esc(s):
    return s.replace("'", "''")


def add_days(dt, days):
    return dt + timedelta(days=days)


def is_q4_2025(dt):
    return dt.year == 2025 and 10 <= dt.month <= 12


def is_q1_2026(dt):
    return dt.year == 2026 and 1 <= dt.month <= 3


def pick_outcome(office, specimen, dt):
    """Return (disposition_str, result_type_id). Applies story arc positive rates."""
    base_pos = 0.09 if specimen == "Hair" else 0.045
    if office == "NY-HQ" and is_q4_2025(dt):
        base_pos = 0.09          # spike
    elif office == "NY-HQ" and is_q1_2026(dt):
        base_pos = 0.055         # partial recovery

    # Rescale other outcomes around the new positive rate
    scale = base_pos / 0.045
    adjusted = []
    for name, rtid, prob in OUTCOMES:
        if name == "Positive":
            adjusted.append((name, rtid, base_pos))
        elif name == "Negative":
            # remainder goes to negative
            adjusted.append((name, rtid, None))
        else:
            adjusted.append((name, rtid, prob * scale))

    non_neg = sum(p for _, _, p in adjusted if p is not None)
    for i, (n, rtid, p) in enumerate(adjusted):
        if p is None:
            adjusted[i] = (n, rtid, max(0.0, 1.0 - non_neg))

    names, rtids, weights = zip(*adjusted)
    idx = random.choices(range(len(names)), weights=weights, k=1)[0]
    return names[idx], rtids[idx]


def pick_positive_substance(office, dt):
    """Pick which substance is positive. THC-heavy during NY-HQ Q4 2025."""
    subs = [(n, sid, w) for n, sid, w in SUBSTANCES if w > 0]
    if office == "NY-HQ" and is_q4_2025(dt):
        # 85% chance it's THC
        if random.random() < 0.85:
            return "THC/Marijuana", 1
        subs = [(n, sid, w) for n, sid, w in subs if n != "THC/Marijuana"]
    names, sids, weights = zip(*subs)
    idx = random.choices(range(len(names)), weights=weights, k=1)[0]
    return names[idx], sids[idx]


def build_milestones(office, collection_dt, sla_miss):
    ta = TA[office]
    c2l = random.uniform(*ta["c2l"])
    l2r = random.uniform(*ta["l2r"])
    r2m = random.uniform(*ta["r2m"])
    m2v = random.uniform(*ta["m2v"])
    if sla_miss:
        # extend one leg to push past 5-day SLA
        if random.random() < 0.5:
            l2r += random.uniform(3.0, 6.0)
        else:
            m2v += random.uniform(3.0, 5.0)
    lab_recv  = add_days(collection_dt, c2l)
    lab_rep   = add_days(lab_recv,  l2r)
    mro_recv  = add_days(lab_rep,   r2m)
    verified  = add_days(mro_recv,  m2v)
    return lab_recv, lab_rep, mro_recv, verified


def generate():
    co_rows, tr_rows, dr_rows, pr_rows, sr_rows = [], [], [], [], []
    co_id = tr_id = dr_id = pr_id = sr_id = 1

    months = []
    d = datetime(2025, 6, 1)
    while d <= datetime(2026, 5, 1):
        months.append(d)
        m, y = (d.month % 12) + 1, d.year + (1 if d.month == 12 else 0)
        d = datetime(y, m, 1)

    for month_start in months:
        days_in_month = calendar.monthrange(month_start.year, month_start.month)[1]
        volume = MONTHLY_BASE + random.randint(-12, 12)

        is_current = (month_start.year == 2026 and month_start.month == 5)
        # Q1 2026 FC surge: inject 4 extra FC per month
        extra_fc = 4 if is_q1_2026(month_start) else 0

        for i in range(volume):
            day  = random.randint(1, days_in_month)
            hour = random.randint(7, 17)
            mins = random.randint(0, 59)
            col_dt = datetime(month_start.year, month_start.month, day, hour, mins)

            office   = weighted(OFFICES)
            specimen = weighted(SPECIMENS)
            reason   = "For Cause" if i < extra_fc else weighted(REASONS)
            is_dot   = 1 if random.random() < 0.25 else 0
            reg      = "DOT" if is_dot else "Non-DOT"
            ind_id   = 2 if is_dot else 1

            # Pipeline probability: ~35% in current month, ~2% in past months
            in_pipeline = random.random() < (0.35 if is_current else 0.02)

            if in_pipeline:
                status_id    = random.choices([1, 2, 3, 4, 5, 6], weights=[3, 2, 2, 2, 1, 1])[0]
                result_id_sql = "NULL"
                disposition  = None
            else:
                status_id    = 7
                disposition, result_id_int = pick_outcome(office, specimen, col_dt)
                result_id_sql = str(result_id_int)

            escode, esdesc = ESCREEN_STATUS[status_id]

            # ── CollectionOrder ───────────────────────────────────────────
            co_rows.append(
                f"({co_id},'{CLIENT_ACCOUNT}','{esc(reason)}',{is_dot},"
                f"'{office}',{fmt(col_dt)},{status_id},{fmt(col_dt)})"
            )

            # ── TestReport ────────────────────────────────────────────────
            tr_rows.append(
                f"({tr_id},{co_id},{status_id},{result_id_sql},{ind_id},"
                f"{fmt(col_dt)},'{esc(reason)}','{reg}',"
                f"'{escode}','{esc(esdesc)}','{CLIENT_ACCOUNT}',{fmt(col_dt)})"
            )

            # ── DrugReport + children (finalized only) ────────────────────
            if not in_pipeline:
                sla_miss_prob = 0.35 if office == "IL-Chicago" else 0.08
                sla_miss = random.random() < sla_miss_prob
                lab_recv, lab_rep, mro_recv, verified = build_milestones(office, col_dt, sla_miss)
                lab_name = random.choice(LAB_NAMES)

                dr_rows.append(
                    f"({dr_id},{tr_id},'{esc(disposition)}','{specimen}','{specimen}',"
                    f"{fmt(col_dt)},{fmt(lab_recv)},{fmt(lab_rep)},"
                    f"{fmt(mro_recv)},{fmt(verified)},'{lab_name}',{fmt(col_dt)})"
                )

                panel_name = PANEL_NAMES.get(specimen, "5-Panel Urine")
                pr_rows.append(f"({pr_id},{dr_id},{result_id_sql},'{esc(panel_name)}',{fmt(col_dt)})")

                # SubstanceResult for Urine and Hair panels only
                if specimen in ("Urine", "Hair"):
                    pos_substance = None
                    if disposition == "Positive":
                        pos_substance, _ = pick_positive_substance(office, col_dt)
                    sample_type_id = 1 if specimen == "Urine" else 2
                    for sub_name, sub_id, _ in SUBSTANCES:
                        disp = "Pos" if sub_name == pos_substance else "Neg"
                        sr_rows.append(
                            f"({sr_id},{pr_id},{sub_id},'{esc(sub_name)}','{disp}',"
                            f"'{specimen}',{sample_type_id},{fmt(col_dt)})"
                        )
                        sr_id += 1

                pr_id += 1
                dr_id += 1

            tr_id += 1
            co_id += 1

    return co_rows, tr_rows, dr_rows, pr_rows, sr_rows


def write_sql(co_rows, tr_rows, dr_rows, pr_rows, sr_rows):
    CHUNK = 500
    lines = [
        "-- POC 2 generated data — do not edit by hand",
        "-- Re-generate: python scripts/generate_poc2_data.py",
        "",
        "SET FOREIGN_KEY_CHECKS=0;",
        "TRUNCATE TABLE SubstanceResult;",
        "TRUNCATE TABLE PanelResult;",
        "TRUNCATE TABLE DrugReport;",
        "TRUNCATE TABLE TestReport;",
        "TRUNCATE TABLE CollectionOrder;",
        "SET FOREIGN_KEY_CHECKS=1;",
        "",
    ]

    def chunked_inserts(table, cols, rows):
        out = []
        for i in range(0, len(rows), CHUNK):
            chunk = rows[i:i + CHUNK]
            out.append(f"INSERT INTO {table} ({cols}) VALUES")
            out.append(",\n".join(chunk) + ";")
        return out

    lines += chunked_inserts(
        "CollectionOrder",
        "CollectionOrderId,AccountNumber,TestReason,IsDOT,CostCenter,RecordCreatedDate,StatusTypeId,CreatedOn",
        co_rows,
    )
    lines += chunked_inserts(
        "TestReport",
        "TestReportId,CollectionOrderId,StatusId,ResultTypeId,IndustryTypeId,DateOfService,ReasonForTest,Regulation,eScreenStatusCode,eScreenStatusDescription,TestReportAccountNumber,CreatedOn",
        tr_rows,
    )
    lines += chunked_inserts(
        "DrugReport",
        "DrugReportId,TestReportId,Disposition,SampleType,SpecimenType,CollectionDateTime,LabReceivedDate,LabReportDateTime,MROReceivedDate,VerificationDate,LabName,CreatedOn",
        dr_rows,
    )
    lines += chunked_inserts(
        "PanelResult",
        "PanelResultId,DrugReportId,ResultTypeId,PanelName,CreatedOn",
        pr_rows,
    )
    lines += chunked_inserts(
        "SubstanceResult",
        "SubstanceResultId,PanelResultId,SubstanceId,AnalyteName,Disposition,SpecimenType,SampleTypeId,CreatedOn",
        sr_rows,
    )

    OUTPUT.write_text("\n".join(lines))
    print(f"Written {len(co_rows)} CollectionOrders, {len(tr_rows)} TestReports, "
          f"{len(dr_rows)} DrugReports, {len(pr_rows)} PanelResults, "
          f"{len(sr_rows)} SubstanceResults → {OUTPUT}")


if __name__ == "__main__":
    co, tr, dr, pr, sr = generate()
    write_sql(co, tr, dr, pr, sr)
```

- [ ] **Step 2: Commit the generator**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add scripts/generate_poc2_data.py
git commit -m "feat: add POC 2 deterministic data generator (seed=42)"
```

---

## Task 4: Generate and commit seed_poc2_data.sql

**Files:**
- Create: `db/seed_poc2_data.sql`

- [ ] **Step 1: Run the generator**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
python scripts/generate_poc2_data.py
```

Expected output (counts will vary slightly with seed):
```
Written 1143 CollectionOrders, 1143 TestReports, 1103 DrugReports,
1103 PanelResults, 7721 SubstanceResults → db/seed_poc2_data.sql
```

- [ ] **Step 2: Sanity-check the output**

```bash
python -c "
lines = open('db/seed_poc2_data.sql').readlines()
print('Lines:', len(lines))
# Check story arc: NY-HQ Q4 2025 should have more positives
import re
print('First INSERT preview:', lines[12][:120])
"
```

Expected: file has several thousand lines, starts with TRUNCATE statements, then INSERT blocks.

- [ ] **Step 3: Commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add db/seed_poc2_data.sql
git commit -m "data: generate and commit POC 2 mock dataset (June 2025 – May 2026)"
```

---

## Task 5: Update db/queries.py with real DTOH SQL

**Files:**
- Modify: `mcp-server/db/queries.py`

- [ ] **Step 1: Replace the entire file**

Replace `mcp-server/db/queries.py` with:

```python
from db.connection import get_connection
from db.date_range import parse_date_range


def _add_filter(sql, params, col, val):
    if val:
        sql += f" AND {col} = %s"
        params.append(val)
    return sql, params


async def query_results_summary(
    client_id, date_range,
    disposition=None, reason_for_test=None, specimen_type=None, regulation=None,
):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    dr.Disposition   AS disposition,
                    COUNT(*)         AS count
                FROM CollectionOrder co
                JOIN TestReport  tr ON tr.CollectionOrderId = co.CollectionOrderId
                JOIN DrugReport  dr ON dr.TestReportId      = tr.TestReportId
                WHERE co.AccountNumber = %s
                  AND tr.DateOfService BETWEEN %s AND %s
            """
            params = [client_id, start, end]
            sql, params = _add_filter(sql, params, "dr.Disposition",  disposition)
            sql, params = _add_filter(sql, params, "tr.ReasonForTest", reason_for_test)
            sql, params = _add_filter(sql, params, "dr.SampleType",   specimen_type)
            sql, params = _add_filter(sql, params, "tr.Regulation",   regulation)
            sql += " GROUP BY dr.Disposition ORDER BY count DESC"
            cur.execute(sql, params)
            rows = cur.fetchall()
            total = sum(r["count"] for r in rows)
            return {"client_id": client_id, "date_range": date_range,
                    "total": total, "breakdown": rows}
    finally:
        conn.close()


async def query_pipeline_status(
    client_id, date_range,
    status=None, reason_for_test=None, specimen_type=None,
):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    st.DisplayName   AS status,
                    COUNT(*)         AS count
                FROM CollectionOrder co
                JOIN TestReport  tr ON tr.CollectionOrderId = co.CollectionOrderId
                JOIN StatusType  st ON st.StatusTypeId      = tr.StatusId
                WHERE co.AccountNumber = %s
                  AND tr.DateOfService BETWEEN %s AND %s
                  AND tr.ResultTypeId IS NULL
            """
            params = [client_id, start, end]
            sql, params = _add_filter(sql, params, "st.DisplayName",  status)
            sql, params = _add_filter(sql, params, "tr.ReasonForTest", reason_for_test)
            sql += " GROUP BY st.DisplayName, tr.StatusId ORDER BY tr.StatusId"
            cur.execute(sql, params)
            rows = cur.fetchall()
            total = sum(r["count"] for r in rows)
            return {"client_id": client_id, "date_range": date_range,
                    "total_in_progress": total, "breakdown": rows}
    finally:
        conn.close()


async def query_analyte_breakdown(
    client_id, date_range,
    analyte_name=None, disposition=None,
):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    sr.AnalyteName AS analyte,
                    SUM(CASE WHEN sr.Disposition = 'Pos' THEN 1 ELSE 0 END) AS positive,
                    SUM(CASE WHEN sr.Disposition = 'Neg' THEN 1 ELSE 0 END) AS negative
                FROM CollectionOrder  co
                JOIN TestReport       tr ON tr.CollectionOrderId = co.CollectionOrderId
                JOIN DrugReport       dr ON dr.TestReportId      = tr.TestReportId
                JOIN PanelResult      pr ON pr.DrugReportId      = dr.DrugReportId
                JOIN SubstanceResult  sr ON sr.PanelResultId     = pr.PanelResultId
                WHERE co.AccountNumber = %s
                  AND tr.DateOfService BETWEEN %s AND %s
            """
            params = [client_id, start, end]
            sql, params = _add_filter(sql, params, "sr.AnalyteName",  analyte_name)
            sql, params = _add_filter(sql, params, "sr.Disposition",  disposition)
            sql += " GROUP BY sr.AnalyteName ORDER BY positive DESC"
            cur.execute(sql, params)
            rows = cur.fetchall()
            return {"client_id": client_id, "date_range": date_range, "analytes": rows}
    finally:
        conn.close()


async def query_turnaround_stats(
    client_id, date_range,
    reason_for_test=None, specimen_type=None, regulation=None,
):
    start, end = parse_date_range(date_range)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT
                    ROUND(AVG(DATEDIFF(dr.LabReceivedDate,   dr.CollectionDateTime)),  2)
                        AS avg_collection_to_lab_days,
                    ROUND(AVG(DATEDIFF(dr.LabReportDateTime, dr.LabReceivedDate)),     2)
                        AS avg_lab_to_report_days,
                    ROUND(AVG(DATEDIFF(dr.VerificationDate,  dr.LabReportDateTime)),   2)
                        AS avg_report_to_verification_days,
                    ROUND(AVG(DATEDIFF(dr.VerificationDate,  dr.CollectionDateTime)),  2)
                        AS avg_end_to_end_days,
                    COUNT(*) AS total_finalized,
                    SUM(CASE WHEN DATEDIFF(dr.VerificationDate, dr.CollectionDateTime) <= 5
                             THEN 1 ELSE 0 END)  AS within_sla,
                    ROUND(
                        100.0 * SUM(CASE WHEN DATEDIFF(dr.VerificationDate, dr.CollectionDateTime) <= 5
                                         THEN 1 ELSE 0 END) / COUNT(*), 1
                    ) AS sla_compliance_pct
                FROM CollectionOrder co
                JOIN TestReport  tr ON tr.CollectionOrderId = co.CollectionOrderId
                JOIN DrugReport  dr ON dr.TestReportId      = tr.TestReportId
                WHERE co.AccountNumber = %s
                  AND tr.DateOfService BETWEEN %s AND %s
                  AND dr.VerificationDate IS NOT NULL
            """
            params = [client_id, start, end]
            sql, params = _add_filter(sql, params, "tr.ReasonForTest", reason_for_test)
            sql, params = _add_filter(sql, params, "dr.SampleType",   specimen_type)
            sql, params = _add_filter(sql, params, "tr.Regulation",   regulation)
            cur.execute(sql, params)
            row = cur.fetchone()
            return {"client_id": client_id, "date_range": date_range, **(row or {})}
    finally:
        conn.close()
```

- [ ] **Step 2: Commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add mcp-server/db/queries.py
git commit -m "feat: rewrite queries.py against real DTOH table hierarchy"
```

---

## Task 6: Add use_mock to all four tool handlers

**Files:**
- Modify: `mcp-server/tools/get_results_summary.py`
- Modify: `mcp-server/tools/get_pipeline_status.py`
- Modify: `mcp-server/tools/get_analyte_breakdown.py`
- Modify: `mcp-server/tools/get_turnaround_stats.py`

- [ ] **Step 1: Update get_results_summary.py**

Replace `mcp-server/tools/get_results_summary.py`:

```python
from mocks.responses import mock_results_summary
from db.queries import query_results_summary


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
    return await query_results_summary(
        client_id, date_range,
        disposition=disposition,
        reason_for_test=reason_for_test,
        specimen_type=specimen_type,
        regulation=regulation,
    )
```

- [ ] **Step 2: Update get_pipeline_status.py**

Replace `mcp-server/tools/get_pipeline_status.py`:

```python
from mocks.responses import mock_pipeline_status
from db.queries import query_pipeline_status


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
    return await query_pipeline_status(
        client_id, date_range,
        status=status,
        reason_for_test=reason_for_test,
        specimen_type=specimen_type,
    )
```

- [ ] **Step 3: Update get_analyte_breakdown.py**

Replace `mcp-server/tools/get_analyte_breakdown.py`:

```python
from mocks.responses import mock_analyte_breakdown
from db.queries import query_analyte_breakdown


async def handle_get_analyte_breakdown(
    client_id: str,
    date_range: str,
    analyte_name: str | None = None,
    disposition: str | None = None,
    use_mock: bool = True,
) -> dict:
    if use_mock:
        return mock_analyte_breakdown(client_id, date_range)
    return await query_analyte_breakdown(
        client_id, date_range,
        analyte_name=analyte_name,
        disposition=disposition,
    )
```

- [ ] **Step 4: Update get_turnaround_stats.py**

Replace `mcp-server/tools/get_turnaround_stats.py`:

```python
from mocks.responses import mock_turnaround_stats
from db.queries import query_turnaround_stats


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
    return await query_turnaround_stats(
        client_id, date_range,
        reason_for_test=reason_for_test,
        specimen_type=specimen_type,
        regulation=regulation,
    )
```

- [ ] **Step 5: Commit all four handlers**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add mcp-server/tools/get_results_summary.py \
        mcp-server/tools/get_pipeline_status.py \
        mcp-server/tools/get_analyte_breakdown.py \
        mcp-server/tools/get_turnaround_stats.py
git commit -m "feat: add use_mock param to all data-viz tool handlers, wire DB path"
```

---

## Task 7: Fix and expand tests

**Files:**
- Modify: `mcp-server/tests/test_results_summary.py`
- Modify: `mcp-server/tests/test_pipeline_status.py`

- [ ] **Step 1: Replace test_results_summary.py**

```python
import pytest
from tools.get_results_summary import handle_get_results_summary


@pytest.mark.asyncio
async def test_mock_returns_breakdown():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert "breakdown" in result
    assert result["total"] > 0


@pytest.mark.asyncio
async def test_mock_has_positive_and_negative():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    labels = [b["disposition"] for b in result["breakdown"]]
    assert "Negative" in labels
    assert "Positive" in labels


@pytest.mark.asyncio
async def test_mock_client_id_echoed():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert result["client_id"] == "DEMO_CLIENT"


@pytest.mark.asyncio
async def test_mock_date_range_echoed():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 90 days", use_mock=True)
    assert result["date_range"] == "last 90 days"


@pytest.mark.asyncio
async def test_mock_total_matches_breakdown_sum():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    total_from_breakdown = sum(b["count"] for b in result["breakdown"])
    assert result["total"] == total_from_breakdown
```

- [ ] **Step 2: Replace test_pipeline_status.py**

```python
import pytest
from tools.get_pipeline_status import handle_get_pipeline_status


@pytest.mark.asyncio
async def test_mock_returns_breakdown():
    result = await handle_get_pipeline_status("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert "total_in_progress" in result
    assert "breakdown" in result
    assert len(result["breakdown"]) > 0


@pytest.mark.asyncio
async def test_mock_client_id_echoed():
    result = await handle_get_pipeline_status("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert result["client_id"] == "DEMO_CLIENT"


@pytest.mark.asyncio
async def test_mock_total_in_progress_is_positive():
    result = await handle_get_pipeline_status("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert result["total_in_progress"] > 0


@pytest.mark.asyncio
async def test_mock_breakdown_has_status_and_count_keys():
    result = await handle_get_pipeline_status("DEMO_CLIENT", "last 30 days", use_mock=True)
    for item in result["breakdown"]:
        assert "status" in item
        assert "count" in item
```

- [ ] **Step 3: Run the full test suite**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
source venv/bin/activate
pytest tests/test_results_summary.py tests/test_pipeline_status.py -v
```

Expected: All 9 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add mcp-server/tests/test_results_summary.py \
        mcp-server/tests/test_pipeline_status.py
git commit -m "test: fix and expand data-viz tool mock tests"
```

---

## Task 8: Load DB and smoke test end-to-end

**Files:** No new files — verification only.

- [ ] **Step 1: Ensure MySQL Docker is running**

```bash
docker ps | grep escreen-db
```

If not running:
```bash
docker start escreen-db
# or start fresh:
docker run -d --name escreen-db -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=escreen \
  -e MYSQL_USER=escreen -e MYSQL_PASSWORD=escreen mysql:8
```

- [ ] **Step 2: Load schema and all seed files**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
mysql -h 127.0.0.1 -u escreen -pescreen escreen < db/schema_poc2.sql
mysql -h 127.0.0.1 -u escreen -pescreen escreen < db/seed_poc2_reference.sql
mysql -h 127.0.0.1 -u escreen -pescreen escreen < db/seed_poc2_data.sql
```

- [ ] **Step 3: Verify record counts**

```bash
mysql -h 127.0.0.1 -u escreen -pescreen escreen -e "
SELECT 'CollectionOrder'  AS tbl, COUNT(*) AS n FROM CollectionOrder
UNION ALL
SELECT 'TestReport',  COUNT(*) FROM TestReport
UNION ALL
SELECT 'DrugReport',  COUNT(*) FROM DrugReport
UNION ALL
SELECT 'PanelResult', COUNT(*) FROM PanelResult
UNION ALL
SELECT 'SubstanceResult', COUNT(*) FROM SubstanceResult;
"
```

Expected:
```
CollectionOrder   ~1143
TestReport        ~1143
DrugReport        ~1103
PanelResult       ~1103
SubstanceResult   ~7721
```

- [ ] **Step 4: Verify story arc — Q4 2025 NY-HQ THC spike**

```bash
mysql -h 127.0.0.1 -u escreen -pescreen escreen -e "
SELECT
    co.CostCenter,
    YEAR(tr.DateOfService)  AS yr,
    QUARTER(tr.DateOfService) AS qtr,
    COUNT(*)                AS total,
    SUM(dr.Disposition = 'Positive') AS positives,
    ROUND(100.0 * SUM(dr.Disposition = 'Positive') / COUNT(*), 1) AS pos_pct
FROM CollectionOrder co
JOIN TestReport tr ON tr.CollectionOrderId = co.CollectionOrderId
JOIN DrugReport dr ON dr.TestReportId = tr.TestReportId
WHERE co.AccountNumber = 'UBS001'
  AND co.CostCenter = 'NY-HQ'
GROUP BY co.CostCenter, yr, qtr
ORDER BY yr, qtr;
"
```

Expected: Q4 2025 (yr=2025, qtr=4) shows `pos_pct` ~8–10%, other quarters ~3–5%.

- [ ] **Step 5: Verify IL-Chicago SLA miss**

```bash
mysql -h 127.0.0.1 -u escreen -pescreen escreen -e "
SELECT
    co.CostCenter,
    ROUND(AVG(DATEDIFF(dr.VerificationDate, dr.CollectionDateTime)), 1) AS avg_days,
    ROUND(100.0 * SUM(DATEDIFF(dr.VerificationDate, dr.CollectionDateTime) <= 5) / COUNT(*), 1) AS sla_pct
FROM CollectionOrder co
JOIN TestReport tr ON tr.CollectionOrderId = co.CollectionOrderId
JOIN DrugReport dr ON dr.TestReportId = tr.TestReportId
WHERE co.AccountNumber = 'UBS001' AND dr.VerificationDate IS NOT NULL
GROUP BY co.CostCenter;
"
```

Expected: IL-Chicago shows highest avg_days (~5.5–6.0) and lowest sla_pct (~60–70%).

- [ ] **Step 6: Smoke test the DB-backed tool handlers**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
source venv/bin/activate
python -c "
import asyncio
from tools.get_results_summary import handle_get_results_summary
from tools.get_pipeline_status import handle_get_pipeline_status
from tools.get_turnaround_stats import handle_get_turnaround_stats
from tools.get_analyte_breakdown import handle_get_analyte_breakdown

async def main():
    print('=== Results Summary (last 90 days) ===')
    r = await handle_get_results_summary('UBS001', 'last 90 days', use_mock=False)
    print(f'Total: {r[\"total\"]}')
    for b in r['breakdown']:
        print(f'  {b[\"disposition\"]}: {b[\"count\"]}')

    print()
    print('=== Pipeline Status ===')
    r2 = await handle_get_pipeline_status('UBS001', 'current year', use_mock=False)
    print(f'In progress: {r2[\"total_in_progress\"]}')
    for b in r2['breakdown']:
        print(f'  {b[\"status\"]}: {b[\"count\"]}')

    print()
    print('=== Turnaround Stats ===')
    r3 = await handle_get_turnaround_stats('UBS001', 'last 90 days', use_mock=False)
    print(f'Avg end-to-end: {r3.get(\"avg_end_to_end_days\")} days')
    print(f'SLA compliance: {r3.get(\"sla_compliance_pct\")}%')

    print()
    print('=== Analyte Breakdown ===')
    r4 = await handle_get_analyte_breakdown('UBS001', 'current year', use_mock=False)
    for a in r4['analytes'][:4]:
        print(f'  {a[\"analyte\"]}: {a[\"positive\"]} pos / {a[\"negative\"]} neg')

asyncio.run(main())
"
```

Expected: Real numbers returned. THC should be highest positive analyte. Avg end-to-end ~4–4.5 days.

- [ ] **Step 7: Final commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add -A
git status
git commit -m "chore: POC 2 DB smoke test passing — all story arc patterns verified"
```

---

## Self-Review

**Spec coverage:**
- 11 DTOH tables in MySQL → Tasks 1 ✓
- Reference data (6 lookup tables) → Task 2 ✓
- ~1,150 records, June 2025–May 2026 → Task 3+4 ✓
- CostCenter on CollectionOrder (NY-HQ, NJ-Weehawken, CT-Stamford, IL-Chicago) → Task 3 generator ✓
- THC spike Q4 2025 NY-HQ → `is_q4_2025` + `pick_positive_substance` in generator ✓
- FC surge Q1 2026 → `extra_fc = 4` per month in generator ✓
- Hair test positive rate ~9% → `base_pos = 0.09 if specimen == "Hair"` in `pick_outcome` ✓
- IL-Chicago turnaround SLA miss ~35% → `sla_miss_prob = 0.35 if office == "IL-Chicago"` ✓
- Pipeline records (ResultTypeId IS NULL) → `in_pipeline` logic in generator ✓
- All 4 queries use real DTOH joins → Task 5 ✓
- `use_mock` param on all 4 handlers → Task 6 ✓
- Tests updated to pass `use_mock=True` → Task 7 ✓
- Story arc verified via SQL checks → Task 8 Steps 4+5 ✓

**No placeholders found.**

**Type consistency:** `query_results_summary`, `query_pipeline_status`, `query_analyte_breakdown`, `query_turnaround_stats` defined in Task 5 (`queries.py`) and imported in Task 6 handlers. Function signatures match exactly. `_add_filter` helper defined and used consistently in all 4 queries. ✓
