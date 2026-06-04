# Mock Data Summary — UBS eScreen MCP Demo

---

## Overview

| Item | Value |
|---|---|
| Client account | `UBS001` |
| Data period | June 2025 – May 2026 (12 months) |
| Monthly volume | ~100 tests/month (±12 random variance) |
| Total records | ~1,200 collection orders |
| Random seed | `42` (reproducible; re-run generator for identical output) |

---

## POC 1 — Clinic Booking

### Candidates (10)

All fictional individuals placed within the clinic service area (Manhattan NY, Hudson County NJ, Westchester NY).

| Name | Location | ID Type |
|---|---|---|
| James Hartley | New York, NY 10017 | Driver's License |
| Sofia Morales | Jersey City, NJ 07302 | Passport |
| Marcus Webb | Kearny, NJ 07032 | Driver's License |
| Priya Nair | New York, NY 10019 | Employee ID |
| Daniel Okoye | Weehawken, NJ 07086 | Driver's License |
| Rachel Kim | New York, NY 10022 | Passport |
| Tom Bruckner | White Plains, NY 10601 | Driver's License |
| Amara Diallo | New York, NY 10013 | Employee ID |
| Wei Zhang | Hoboken, NJ 07030 | Driver's License |
| Natasha Petrov | New Rochelle, NY 10801 | Passport |

### Test Types (6)

| Name | Specimen | Code |
|---|---|---|
| 5-Panel Urine | Urine | `5PANEL_U` |
| 10-Panel Urine | Urine | `10PANEL_U` |
| DOT 5-Panel Urine | Urine | `DOT5_U` |
| Hair Follicle 5-Panel | Hair | `5PANEL_H` |
| Oral Fluid 5-Panel | Oral Fluid | `5PANEL_O` |
| Breath Alcohol Test | Breath | `BAT` |

---

## POC 2 — Analytics

### Cost Centers & Volume Distribution

| Cost Center | Share |
|---|---|
| NY-HQ | 40% |
| NJ-Weehawken | 25% |
| CT-Stamford | 20% |
| NY-Midtown | 15% |

### Reason for Test

| Reason | Share |
|---|---|
| Pre-Employment | 65% |
| Random | 25% |
| For Cause | 7% |
| Post-Accident | 2% |
| Return to Duty | 1% |

> Q1 2026 includes 4 extra For Cause tests per month as a planted anomaly.

### Specimen Types

| Specimen | Share |
|---|---|
| Urine | 80% |
| Hair | 12% |
| Oral Fluid | 5% |
| Breath | 3% |

### Regulation Split

- **DOT**: 25%
- **Non-DOT**: 75%

### Test Outcomes (Dispositions)

| Outcome | Rate |
|---|---|
| Negative | ~89% |
| Positive | ~4.5% (urine); ~9% (hair) |
| Test Not Performed | ~3% |
| Cancelled | ~2% |
| No Show | ~1% |
| Rejected Specimen | ~0.4% |

> **NY-HQ anomaly**: positive rate elevated to **9%** in Q4 2025, tapering to **5.5%** in Q1 2026. Designed to surface as a compliance flag in analytics.

### Substances Tested (Positive Distribution)

| Substance | Share of Positives |
|---|---|
| THC/Marijuana | 55% |
| Cocaine Metabolites | 15% |
| Amphetamines | 10% |
| Opiates (Codeine/Morphine) | 10% |
| Oxycodone | 5% |
| PCP | 3% |
| Methamphetamines | 2% |
| Benzodiazepines | 0% (in panel, never positive) |

> During NY-HQ Q4 2025 spike: THC accounts for **85%** of positives at that office.

### Turnaround Times (Collection → Verified, by Office)

| Stage | CT-Stamford | NY-HQ | NJ-Weehawken | NY-Midtown |
|---|---|---|---|---|
| Collection → Lab received | 0.7–1.3 days | 0.9–1.4 days | 1.0–1.6 days | 0.8–1.3 days |
| Lab received → Lab report | 1.4–2.0 days | 1.6–2.3 days | 1.7–2.5 days | 1.5–2.2 days |
| Lab report → MRO received | 0.4–0.8 days | 0.5–1.0 days | 0.6–1.0 days | 0.5–0.9 days |
| MRO received → Verified | 0.3–0.6 days | 0.4–0.7 days | 0.4–0.8 days | 0.3–0.6 days |

- **SLA target**: 5 days end-to-end
- **SLA miss rate**: 8% uniform across all offices
- When an SLA miss occurs, the delay is added to either the lab stage (+3–6 days) or MRO stage (+3–5 days), randomly

### Pipeline Statuses

| Status | Meaning |
|---|---|
| Order Created – Awaiting Donor | Order placed, donor not yet collected |
| Pending Collection | Scheduled, awaiting sample |
| Collected – In Transit | Sample on its way to lab |
| At Laboratory | Sample being processed |
| Lab Reported – MRO Review | Results sent, pending MRO sign-off |
| MRO Verified – Pending Delivery | Verified, result being delivered |
| Completed | Fully closed |

> For the current month (May 2026), **~35%** of tests are left in an in-progress pipeline state to simulate live activity. All other months have ~2% in-progress (historical stragglers).

### Labs Used

- Quest Diagnostics
- LabCorp (assigned randomly, 50/50)

---

## Planted Anomalies (for Demo)

These are intentional signals the AI analytics should surface:

1. **NY-HQ positive rate spike** — 9% in Q4 2025, driven almost entirely by THC
2. **Q1 2026 For Cause surge** — 4 extra For Cause tests/month at all offices
3. **NY-HQ gradual normalisation** — positive rate drops back toward 5.5% in Q1 2026, showing trend recovery
4. **NJ-Weehawken slowest turnaround** — highest lab transit times of all offices

---

## Data Files

| File | Purpose |
|---|---|
| `db/seed_data.sql` | Candidates + test types (POC 1) |
| `db/seed_poc2_reference.sql` | Lookup tables: status, result, substance types |
| `db/seed_poc2_data.sql` | Generated transactions — 1,200+ orders (POC 2) |
| `scripts/generate_poc2_data.py` | Generator script; re-run to regenerate `seed_poc2_data.sql` |
