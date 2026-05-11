# UBS eScreen POC 1 — Mock Data Design
*2026-05-11*

## Overview

Mock data strategy for POC 1 (Clinic Search & Booking). All data is self-contained — no eScreen credentials or live API calls required. The mock faithfully replicates the shape and attribute names of real eScreen SOAP responses so that swapping to live calls in Phase 3 requires changing only the transport layer, not the data contract.

---

## Local Database Setup

The project uses **MySQL** (via `pymysql`). For local development, run MySQL in Docker — zero installation, easy reset:

```bash
docker run -d \
  --name escreen-db \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=escreen \
  -e MYSQL_USER=escreen \
  -e MYSQL_PASSWORD=escreen \
  mysql:8
```

Then populate `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=escreen
DB_PASSWORD=escreen
DB_NAME=escreen
```

Then run schemas + seed:
```bash
mysql -h 127.0.0.1 -u escreen -pescreen escreen < db/schema_candidates.sql
mysql -h 127.0.0.1 -u escreen -pescreen escreen < db/schema_test_types.sql
mysql -h 127.0.0.1 -u escreen -pescreen escreen < db/seed_data.sql
```

To reset: `docker rm -f escreen-db` and re-run the above.

---

## Storage Decisions

| Data | Storage | Reason |
|---|---|---|
| Candidates (PII) | MySQL DB | Security model — fetched server-side only, never passes through Claude |
| Test types | MySQL DB | Config data, looked up at booking time |
| Clinics | `mocks/clinics.json` | Mirrors eScreen API — fetched on demand, not persisted |
| Zip code centroids | `mocks/zipcodes.json` | Lookup table for haversine radius filtering |
| Booking receipts | Not stored | eScreen holds the booking; `RegistrationId` is returned and displayed only |

Clinic data is deliberately not in the DB. In production, it lives in eScreen's system and is fetched per-request via `GetCollectionSites`. The mock behaves identically — load from file, filter in memory, return JSON list. When Phase 3 goes live, only the transport changes.

---

## Geographic Coverage

**3 counties · 51 zip codes · ~70 clinics**

| County | State | Character | Zip codes | Clinics |
|---|---|---|---|---|
| New York County | NY | Urban, very dense | 18 | ~30 |
| Hudson County | NJ | Commuter belt | 15 | ~20 |
| Westchester County | NY | Suburban | 18 | ~20 |

### Manhattan — 18 zip codes
`10001` `10002` `10003` `10004` `10007` `10009` `10010` `10011` `10012` `10013` `10014` `10016` `10017` `10018` `10019` `10022` `10036` `10038`

### Hudson County NJ — 15 zip codes
`07302` `07304` `07305` `07306` `07307` `07310` `07030` `07087` `07093` `07086` `07047` `07029` `07032` `07097` `07099`

### Westchester County NY — 18 zip codes
`10701` `10710` `10550` `10552` `10601` `10603` `10605` `10530` `10522` `10523` `10533` `10591` `10801` `10804` `10502` `10504` `10510` `10562`

### Density rationale
Manhattan has 2–3 clinics per zip in core areas (Midtown, Downtown). Hudson County has 1–2 per zip. Westchester has 1 per zip with some gaps. This makes radius meaningful — searching `10018` with 5 miles returns 8–10 clinics; searching `10591` with 5 miles returns 2–3.

---

## Clinic Data Structure

Clinics are stored in `mcp-server/mocks/clinics.json` as a JSON array. Attribute names match the real eScreen SOAP response exactly.

### Schema per clinic

```json
{
  "EscreenSiteId": 10001,
  "SiteName": "Quest Diagnostics – Midtown West",
  "Address1": "1440 Broadway, Suite 300",
  "City": "New York",
  "State": "NY",
  "ZipCode": "10018",
  "PhoneNumber": "2125550191",
  "Latitude": 40.7549,
  "Longitude": -73.9862,
  "SupportedSpecimenTypes": ["U", "H"],
  "Attributes": [
    { "AttributeName": "Walk In Drug Testing - No Appointment Required", "AttributeValue": "Yes" },
    { "AttributeName": "Handicap Access", "AttributeValue": "Yes" },
    { "AttributeName": "DOT Certified Physician", "AttributeValue": "No" },
    { "AttributeName": "After Hours Drug Screening", "AttributeValue": "No" },
    { "AttributeName": "Public Transportation", "AttributeValue": "Yes" },
    { "AttributeName": "Observed Collections", "AttributeValue": "No" },
    { "AttributeName": "Clinic Hours", "AttributeValue": "MondayHoursOpen:07:30;MondayHoursClose:17:00;TuesdayHoursOpen:07:30;TuesdayHoursClose:17:00;WednesdayHoursOpen:07:30;WednesdayHoursClose:17:00;ThursdayHoursOpen:07:30;ThursdayHoursClose:17:00;FridayHoursOpen:07:30;FridayHoursClose:17:00;SaturdayHoursOpen:08:00;SaturdayHoursClose:12:00;SundayHoursOpen:00:00;SundayHoursClose:00:00" }
  ]
}
```

`SupportedSpecimenTypes` is the only field not in the real SOAP response. It is used by the mock filter to simulate eScreen returning only sites that support the requested test's specimen type.

`Distance` is NOT stored — it is computed at query time and injected into each result before returning.

### Attribute distributions across ~70 clinics

| Attribute | Yes | No |
|---|---|---|
| Walk In Drug Testing - No Appointment Required | 65% | 35% |
| Handicap Access | 70% | 30% |
| DOT Certified Physician | 40% | 60% |
| After Hours Drug Screening | 20% | 80% |
| Public Transportation | 80% (Manhattan) / 50% (Hudson) / 20% (Westchester) | — |
| Observed Collections | 25% | 75% |
| Saturday hours (SaturdayHoursOpen ≠ 00:00) | 30% | 70% |

### Specimen type coverage

| Specimen types supported | % of clinics |
|---|---|
| Urine only | 25% |
| Urine + Breath | 20% |
| Urine + Hair | 30% |
| Urine + Hair + Oral Fluid | 15% |
| Urine + Hair + Oral Fluid + Breath | 10% |

All clinics support Urine. Hair available at 55%, Oral Fluid at 25%, Breath at 30%.

---

## Radius Filtering Logic

`mcp-server/mocks/zipcodes.json` stores the lat/lng centroid for each of the 51 covered zip codes:

```json
{
  "10018": { "lat": 40.7549, "lng": -73.9919 },
  "07302": { "lat": 40.7178, "lng": -74.0431 },
  "10601": { "lat": 41.0340, "lng": -73.7629 }
}
```

`search_clinics` mock filter:

1. Look up the search zipcode in `zipcodes.json` → get `(lat, lng)`
2. If zipcode not found → return empty list with a note (outside covered area)
3. For each clinic: compute haversine distance from search centroid
4. Filter: `distance <= radius` AND `specimen_type in SupportedSpecimenTypes`
5. Inject `Distance` field (rounded to 1 decimal)
6. Sort by `Distance` ascending
7. Return

Haversine uses Earth radius = 3958.8 miles.

---

## Test Types (DB)

Stored in the `test_types` table. 6 tests across 3 specimen types.

| Name | service_identifier | specimen_type | default_reason | Clinic constraint |
|---|---|---|---|---|
| 5-Panel Urine | `5PANEL_U` | U | PE | All clinics |
| 10-Panel Urine | `10PANEL_U` | U | PE | All clinics |
| DOT 5-Panel Urine | `DOT5_U` | U | PE | DOT Certified only |
| Hair Follicle 5-Panel | `5PANEL_H` | H | PE | 55% of clinics |
| Oral Fluid 5-Panel | `5PANEL_O` | O | PE | 25% of clinics |
| Breath Alcohol Test | `BAT` | B | RA | 30% of clinics |

DOT test filtering is applied by the mock: after radius + specimen filter, additionally filter to clinics where `DOT Certified Physician = Yes`.

---

## Reasons for Test (DB)

Stored as a reference column in `test_types` (default_reason) and passed through to `place_order`. Claude may override the default based on user intent.

| Code | Full name | Typical pairing |
|---|---|---|
| `PE` | Pre-Employment | Any test — most common |
| `RA` | Random | Urine, Breath |
| `FC` | For Cause / Reasonable Suspicion | Any — urgency implies walk-in preferred |
| `PA` | Post-Accident | Urine, Breath |
| `RTD` | Return to Duty | DOT or standard urine |

---

## Candidates (DB)

8–10 candidates seeded in the `candidates` table. Realistic US addresses across varied states — their zip codes are booking PII only, not used for clinic search. Country field = `US` for all.

### Distribution
- 3–4 with Driver's License (`other_id_type = D`)
- 2–3 with Passport (`P`)
- 2 with Employer ID (`E`)
- Mix of male/female first names, varied last names
- DOB range: 1975–2000
- Phone numbers formatted as 10-digit strings (no dashes)

### Sample candidates (illustrative)

| Name | State | Zip | ID type |
|---|---|---|---|
| James Hartley | NY | 10001 | D |
| Sofia Morales | NJ | 07302 | P |
| Marcus Webb | IL | 60601 | D |
| Priya Nair | CA | 94102 | E |
| Daniel Okoye | TX | 77001 | D |
| Rachel Kim | NY | 10019 | P |
| Tom Bruckner | CT | 06901 | D |
| Amara Diallo | FL | 33101 | E |

---

## File Structure

```
mcp-server/
├── mocks/
│   ├── clinics.json          ← ~70 clinics, real SOAP attribute structure
│   ├── zipcodes.json         ← 51 zip codes → lat/lng centroids
│   ├── booking.py            ← existing booking mock (unchanged)
│   └── clinics.py            ← REPLACED by clinics.json loader
├── scripts/
│   └── generate_clinics.py   ← one-time generator script, committed
db/
├── schema_candidates.sql     ← existing (no changes)
├── schema_test_types.sql     ← existing (no changes)
└── seed_data.sql             ← NEW: replaces seed_candidates.sql, includes
                                 8-10 candidates + 6 test types + 5 reasons
```

---

## What This Enables for the Demo

| User query | What happens |
|---|---|
| "Find clinics near 10018 within 5 miles" | 8–10 Manhattan results, sorted by distance |
| "Only walk-in, I don't have time to book" | Claude filters in-context on `Walk In = Yes` |
| "We need a hair follicle test" | Specimen filter cuts list to 55% of clinics |
| "Open on Saturday" | Claude reads `Clinic Hours`, filters to Saturday-open only |
| "This is for a DOT drug test" | DOT filter applied, only certified sites shown |
| "Book clinic #3 for Marcus Webb" | `place_order` fetches Marcus from DB, submits booking |

---

## What Is Explicitly Out of Scope

- Candidates' zip codes do not drive clinic search — the user types the search location
- No authentication — candidate selected from UI dropdown before chat starts
- Happy path only — no error scenarios in the mock
- Mode 2 (conversational step-by-step) only after Mode 1 (quick intent) is working
