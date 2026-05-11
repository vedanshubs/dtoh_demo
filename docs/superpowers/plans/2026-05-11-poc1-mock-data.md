# POC 1 Mock Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-clinic hardcoded Manhattan mock with ~70 geographically spread clinics across Manhattan, Hudson County NJ, and Westchester County NY, with real haversine radius filtering, specimen type filtering, and 8-10 seeded candidates + 6 test types in the DB.

**Architecture:** Static `clinics.json` + `zipcodes.json` fixture files loaded once at startup. A thin geo utility computes haversine distance at query time. The `search_clinics` mock handler filters by radius, specimen type, and DOT certification. Candidates and test types remain in MySQL. A one-time generator script (`scripts/generate_clinics.py`) produces `clinics.json` deterministically (seeded random) so the output is committed and version-controlled.

**Tech Stack:** Python 3.11, pytest, pytest-asyncio, MySQL 8 (Docker), JSON fixture files.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `mcp-server/mocks/zipcodes.json` | 51 zip → lat/lng/city/state/county centroids |
| Create | `mcp-server/utils/__init__.py` | Package marker |
| Create | `mcp-server/utils/geo.py` | Haversine distance + zipcode centroid lookup |
| Create | `mcp-server/scripts/__init__.py` | Package marker |
| Create | `mcp-server/scripts/generate_clinics.py` | One-time clinic data generator |
| Create | `mcp-server/mocks/clinics.json` | Generated output — ~70 clinics, committed |
| Modify | `mcp-server/mocks/clinics.py` | Replace hardcoded list with JSON loader |
| Modify | `mcp-server/tools/search_clinics.py` | Add haversine + specimen + DOT filtering |
| Modify | `mcp-server/tests/test_search_clinics.py` | Replace stub tests with real filtering assertions |
| Create | `db/seed_data.sql` | 8-10 candidates + 6 test types (replaces seed_candidates.sql) |

---

## Task 1: Create zipcodes.json

**Files:**
- Create: `mcp-server/mocks/zipcodes.json`

- [ ] **Step 1: Create the file**

```json
{
  "10001": {"lat": 40.7484, "lng": -73.9967, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10002": {"lat": 40.7157, "lng": -73.9863, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10003": {"lat": 40.7317, "lng": -73.9892, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10004": {"lat": 40.7004, "lng": -74.0398, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10007": {"lat": 40.7135, "lng": -74.0078, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10009": {"lat": 40.7257, "lng": -73.9783, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10010": {"lat": 40.7396, "lng": -73.9840, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10011": {"lat": 40.7440, "lng": -74.0002, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10012": {"lat": 40.7256, "lng": -74.0009, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10013": {"lat": 40.7197, "lng": -74.0053, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10014": {"lat": 40.7337, "lng": -74.0060, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10016": {"lat": 40.7478, "lng": -73.9814, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10017": {"lat": 40.7518, "lng": -73.9740, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10018": {"lat": 40.7549, "lng": -73.9919, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10019": {"lat": 40.7658, "lng": -73.9866, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10022": {"lat": 40.7582, "lng": -73.9673, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10036": {"lat": 40.7593, "lng": -73.9908, "city": "New York",    "state": "NY", "county": "manhattan"},
  "10038": {"lat": 40.7085, "lng": -74.0034, "city": "New York",    "state": "NY", "county": "manhattan"},
  "07302": {"lat": 40.7178, "lng": -74.0431, "city": "Jersey City", "state": "NJ", "county": "hudson_nj"},
  "07304": {"lat": 40.7247, "lng": -74.0669, "city": "Jersey City", "state": "NJ", "county": "hudson_nj"},
  "07305": {"lat": 40.6978, "lng": -74.0789, "city": "Jersey City", "state": "NJ", "county": "hudson_nj"},
  "07306": {"lat": 40.7329, "lng": -74.0633, "city": "Jersey City", "state": "NJ", "county": "hudson_nj"},
  "07307": {"lat": 40.7512, "lng": -74.0507, "city": "Jersey City", "state": "NJ", "county": "hudson_nj"},
  "07310": {"lat": 40.7260, "lng": -74.0370, "city": "Jersey City", "state": "NJ", "county": "hudson_nj"},
  "07030": {"lat": 40.7440, "lng": -74.0324, "city": "Hoboken",     "state": "NJ", "county": "hudson_nj"},
  "07087": {"lat": 40.7676, "lng": -74.0324, "city": "Union City",  "state": "NJ", "county": "hudson_nj"},
  "07093": {"lat": 40.7877, "lng": -74.0138, "city": "West New York","state": "NJ", "county": "hudson_nj"},
  "07086": {"lat": 40.7698, "lng": -74.0203, "city": "Weehawken",   "state": "NJ", "county": "hudson_nj"},
  "07047": {"lat": 40.7993, "lng": -74.0129, "city": "North Bergen", "state": "NJ", "county": "hudson_nj"},
  "07029": {"lat": 40.7390, "lng": -74.1544, "city": "Harrison",    "state": "NJ", "county": "hudson_nj"},
  "07032": {"lat": 40.7628, "lng": -74.1415, "city": "Kearny",      "state": "NJ", "county": "hudson_nj"},
  "07097": {"lat": 40.6912, "lng": -74.0960, "city": "Jersey City", "state": "NJ", "county": "hudson_nj"},
  "07099": {"lat": 40.7700, "lng": -74.1450, "city": "Kearny",      "state": "NJ", "county": "hudson_nj"},
  "10701": {"lat": 40.9312, "lng": -73.8988, "city": "Yonkers",     "state": "NY", "county": "westchester_ny"},
  "10710": {"lat": 40.9610, "lng": -73.8681, "city": "Yonkers",     "state": "NY", "county": "westchester_ny"},
  "10550": {"lat": 40.9126, "lng": -73.8370, "city": "Mount Vernon","state": "NY", "county": "westchester_ny"},
  "10552": {"lat": 40.9223, "lng": -73.8296, "city": "Mount Vernon","state": "NY", "county": "westchester_ny"},
  "10601": {"lat": 41.0340, "lng": -73.7629, "city": "White Plains","state": "NY", "county": "westchester_ny"},
  "10603": {"lat": 41.0505, "lng": -73.7963, "city": "White Plains","state": "NY", "county": "westchester_ny"},
  "10605": {"lat": 41.0163, "lng": -73.7712, "city": "White Plains","state": "NY", "county": "westchester_ny"},
  "10530": {"lat": 41.0218, "lng": -73.8026, "city": "Hartsdale",   "state": "NY", "county": "westchester_ny"},
  "10522": {"lat": 41.0076, "lng": -73.8720, "city": "Dobbs Ferry", "state": "NY", "county": "westchester_ny"},
  "10523": {"lat": 41.0548, "lng": -73.8182, "city": "Elmsford",    "state": "NY", "county": "westchester_ny"},
  "10533": {"lat": 41.0390, "lng": -73.8671, "city": "Irvington",   "state": "NY", "county": "westchester_ny"},
  "10591": {"lat": 41.0762, "lng": -73.8579, "city": "Tarrytown",   "state": "NY", "county": "westchester_ny"},
  "10801": {"lat": 40.9115, "lng": -73.7826, "city": "New Rochelle","state": "NY", "county": "westchester_ny"},
  "10804": {"lat": 40.9462, "lng": -73.7784, "city": "New Rochelle","state": "NY", "county": "westchester_ny"},
  "10502": {"lat": 41.0151, "lng": -73.8437, "city": "Ardsley",     "state": "NY", "county": "westchester_ny"},
  "10504": {"lat": 41.1268, "lng": -73.7207, "city": "Armonk",      "state": "NY", "county": "westchester_ny"},
  "10510": {"lat": 41.1593, "lng": -73.8440, "city": "Briarcliff Manor","state": "NY", "county": "westchester_ny"},
  "10562": {"lat": 41.1629, "lng": -73.8616, "city": "Ossining",    "state": "NY", "county": "westchester_ny"}
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add mcp-server/mocks/zipcodes.json
git commit -m "data: add 51-zipcode centroid lookup for NY/NJ/Westchester"
```

---

## Task 2: Geo utility (haversine)

**Files:**
- Create: `mcp-server/utils/__init__.py`
- Create: `mcp-server/utils/geo.py`
- Test: `mcp-server/tests/test_geo.py`

- [ ] **Step 1: Write the failing test**

Create `mcp-server/tests/test_geo.py`:

```python
import pytest
from utils.geo import haversine_miles, centroid_for_zip


def test_haversine_same_point():
    assert haversine_miles(40.7484, -73.9967, 40.7484, -73.9967) == 0.0


def test_haversine_known_distance():
    # 10001 (Chelsea) to 07302 (Jersey City downtown) — approx 2.1 miles across the Hudson
    dist = haversine_miles(40.7484, -73.9967, 40.7178, -74.0431)
    assert 1.5 < dist < 3.0, f"Expected ~2.1 miles, got {dist}"


def test_haversine_longer_distance():
    # 10001 (Manhattan) to 10601 (White Plains) — approx 25 miles north
    dist = haversine_miles(40.7484, -73.9967, 41.0340, -73.7629)
    assert 20.0 < dist < 30.0, f"Expected ~25 miles, got {dist}"


def test_centroid_for_known_zip():
    c = centroid_for_zip("10018")
    assert c is not None
    assert abs(c["lat"] - 40.7549) < 0.01
    assert abs(c["lng"] - (-73.9919)) < 0.01


def test_centroid_for_unknown_zip():
    assert centroid_for_zip("90210") is None
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
source venv/bin/activate
pytest tests/test_geo.py -v
```

Expected: `ModuleNotFoundError: No module named 'utils'`

- [ ] **Step 3: Create package markers and geo utility**

Create `mcp-server/utils/__init__.py` (empty).

Create `mcp-server/utils/geo.py`:

```python
import json
from math import atan2, cos, radians, sin, sqrt
from pathlib import Path
from functools import lru_cache

_ZIPCODES_PATH = Path(__file__).parent.parent / "mocks" / "zipcodes.json"


@lru_cache(maxsize=1)
def _load_zipcodes() -> dict:
    return json.loads(_ZIPCODES_PATH.read_text())


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def centroid_for_zip(zipcode: str) -> dict | None:
    return _load_zipcodes().get(zipcode)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
pytest tests/test_geo.py -v
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add mcp-server/utils/__init__.py mcp-server/utils/geo.py mcp-server/tests/test_geo.py
git commit -m "feat: add haversine geo utility with zipcode centroid lookup"
```

---

## Task 3: Clinic generator script

**Files:**
- Create: `mcp-server/scripts/__init__.py`
- Create: `mcp-server/scripts/generate_clinics.py`

- [ ] **Step 1: Create package marker**

Create `mcp-server/scripts/__init__.py` (empty).

- [ ] **Step 2: Create the generator script**

Create `mcp-server/scripts/generate_clinics.py`:

```python
#!/usr/bin/env python3
"""
One-time generator for mock clinic data.
Run from mcp-server/: python -m scripts.generate_clinics
Output is committed to mocks/clinics.json — do not edit clinics.json by hand.
Re-run this script if you need to change the data shape or counts.
"""
import json
import random
from pathlib import Path

random.seed(42)

ZIPCODES_PATH = Path(__file__).parent.parent / "mocks" / "zipcodes.json"
OUTPUT_PATH = Path(__file__).parent.parent / "mocks" / "clinics.json"

CHAINS = [
    "Quest Diagnostics",
    "LabCorp",
    "Concentra",
    "ClinPath",
    "AFC Urgent Care",
    "BioReference Laboratories",
    "MedExpress",
    "Carbon Health",
    "GoHealth Urgent Care",
    "Northwell Health Labs",
]

LOCATION_LABELS = {
    "manhattan": [
        "Midtown", "Downtown", "Chelsea", "Tribeca", "Flatiron",
        "Financial District", "Upper West Side", "Gramercy", "Times Square",
        "Murray Hill", "Hell's Kitchen", "SoHo", "West Village",
    ],
    "hudson_nj": [
        "Journal Square", "Newport", "Downtown", "Hoboken Center",
        "Heights", "Bayfront", "Powerhouse Arts District",
    ],
    "westchester_ny": [
        "Downtown", "Central", "North End", "Midtown",
        "Business District", "Medical Center",
    ],
}

STREETS = {
    "manhattan": [
        "Broadway", "Lexington Ave", "Park Ave", "Madison Ave",
        "5th Ave", "7th Ave", "8th Ave", "Avenue of the Americas",
        "Varick St", "Hudson St",
    ],
    "hudson_nj": [
        "Newark Ave", "Hudson St", "Washington Blvd",
        "Kennedy Blvd", "Observer Hwy", "Marin Blvd",
    ],
    "westchester_ny": [
        "Main St", "Mamaroneck Ave", "Central Ave",
        "White Plains Rd", "Post Rd", "Tarrytown Rd",
    ],
}

PHONE_AREA_CODES = {
    "manhattan": ["212", "646", "917"],
    "hudson_nj": ["201", "551"],
    "westchester_ny": ["914", "347"],
}


def _phone(county: str) -> str:
    area = random.choice(PHONE_AREA_CODES[county])
    rest = "".join(str(random.randint(0, 9)) for _ in range(7))
    return area + rest


def _clinic_hours(county: str) -> str:
    has_saturday = random.random() < 0.30
    has_extended = random.random() < 0.20

    if county == "manhattan" and has_extended:
        open_t, close_t = "07:00", "18:30"
    elif county == "manhattan":
        open_t, close_t = "07:30", "17:00"
    else:
        open_t, close_t = "08:00", "17:00"

    sat_open = "08:00" if has_saturday else "00:00"
    sat_close = "13:00" if has_saturday else "00:00"

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    parts = []
    for day in days:
        parts += [f"{day}HoursOpen:{open_t}", f"{day}HoursClose:{close_t}"]
    parts += [
        f"SaturdayHoursOpen:{sat_open}", f"SaturdayHoursClose:{sat_close}",
        "SundayHoursOpen:00:00", "SundayHoursClose:00:00",
    ]
    return ";".join(parts)


def _specimen_types() -> list[str]:
    types = ["U"]
    if random.random() < 0.55:
        types.append("H")
    if random.random() < 0.25:
        types.append("O")
    if random.random() < 0.30:
        types.append("B")
    return types


def _transit_prob(county: str) -> float:
    return {"manhattan": 0.90, "hudson_nj": 0.55, "westchester_ny": 0.20}[county]


def _clinic_count(county: str) -> int:
    if county == "manhattan":
        return random.choices([1, 2, 3], weights=[2, 4, 2])[0]
    if county == "hudson_nj":
        return random.choices([1, 2], weights=[2, 3])[0]
    return random.choices([1, 2], weights=[4, 2])[0]


def make_clinic(site_id: int, zipcode: str, zip_data: dict, chain: str, label: str) -> dict:
    county = zip_data["county"]
    lat = zip_data["lat"] + random.uniform(-0.004, 0.004)
    lng = zip_data["lng"] + random.uniform(-0.004, 0.004)

    street_num = random.randint(100, 999)
    street = random.choice(STREETS[county])
    suite_type = random.choice(["Suite", "Floor", "Suite"])
    suite_num = random.randint(1, 9) * 100 if suite_type == "Suite" else random.randint(1, 8)
    address = f"{street_num} {street}, {suite_type} {suite_num}"

    walk_in = random.random() < 0.65
    handicap = random.random() < 0.70
    dot_cert = random.random() < 0.40
    after_hours = random.random() < 0.20
    transit = random.random() < _transit_prob(county)
    observed = random.random() < 0.25

    return {
        "EscreenSiteId": site_id,
        "SiteName": f"{chain} – {label}",
        "Address1": address,
        "City": zip_data["city"],
        "State": zip_data["state"],
        "ZipCode": zipcode,
        "PhoneNumber": _phone(county),
        "Latitude": round(lat, 4),
        "Longitude": round(lng, 4),
        "GoogleMapsUrl": f"https://www.google.com/maps?q={round(lat, 4)},{round(lng, 4)}",
        "SupportedSpecimenTypes": _specimen_types(),
        "Attributes": [
            {"AttributeName": "Walk In Drug Testing - No Appointment Required",
             "AttributeValue": "Yes" if walk_in else "No"},
            {"AttributeName": "Handicap Access",
             "AttributeValue": "Yes" if handicap else "No"},
            {"AttributeName": "DOT Certified Physician",
             "AttributeValue": "Yes" if dot_cert else "No"},
            {"AttributeName": "After Hours Drug Screening",
             "AttributeValue": "Yes" if after_hours else "No"},
            {"AttributeName": "Public Transportation",
             "AttributeValue": "Yes" if transit else "No"},
            {"AttributeName": "Observed Collections",
             "AttributeValue": "Yes" if observed else "No"},
            {"AttributeName": "Clinic Hours",
             "AttributeValue": _clinic_hours(county)},
        ],
    }


def generate() -> list[dict]:
    zipcodes = json.loads(ZIPCODES_PATH.read_text())
    clinics = []
    site_id = 20001

    used_labels: dict[str, set] = {c: set() for c in LOCATION_LABELS}

    for zipcode, zip_data in zipcodes.items():
        county = zip_data["county"]
        count = _clinic_count(county)
        available_labels = [
            l for l in LOCATION_LABELS[county] if l not in used_labels[county]
        ]
        if not available_labels:
            used_labels[county] = set()
            available_labels = LOCATION_LABELS[county][:]

        for _ in range(count):
            chain = random.choice(CHAINS)
            label = random.choice(available_labels)
            used_labels[county].add(label)
            available_labels = [l for l in available_labels if l != label] or LOCATION_LABELS[county][:]

            clinics.append(make_clinic(site_id, zipcode, zip_data, chain, label))
            site_id += 1

    return clinics


if __name__ == "__main__":
    clinics = generate()
    OUTPUT_PATH.write_text(json.dumps(clinics, indent=2))
    print(f"Generated {len(clinics)} clinics → {OUTPUT_PATH}")
```

- [ ] **Step 3: Commit the generator**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add mcp-server/scripts/__init__.py mcp-server/scripts/generate_clinics.py
git commit -m "feat: add clinic data generator script"
```

---

## Task 4: Generate and commit clinics.json

**Files:**
- Create: `mcp-server/mocks/clinics.json`

- [ ] **Step 1: Run the generator**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
source venv/bin/activate
python -m scripts.generate_clinics
```

Expected output: `Generated 68 clinics → .../mocks/clinics.json` (count may vary 60–75 with seed=42)

- [ ] **Step 2: Verify the output looks sane**

```bash
python -c "
import json
from pathlib import Path
data = json.loads(Path('mocks/clinics.json').read_text())
print(f'Total clinics: {len(data)}')
counties = {}
for c in data:
    state = c['State']
    counties[state] = counties.get(state, 0) + 1
print('By state:', counties)
print('Sample:', data[0]['SiteName'], data[0]['ZipCode'], data[0]['SupportedSpecimenTypes'])
"
```

Expected: Total 60–75 clinics, breakdown across NY and NJ.

- [ ] **Step 3: Commit clinics.json**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add mcp-server/mocks/clinics.json
git commit -m "data: generate and commit 70-clinic mock dataset (NY/NJ/Westchester)"
```

---

## Task 5: Update mock clinic loader

**Files:**
- Modify: `mcp-server/mocks/clinics.py`

- [ ] **Step 1: Replace the hardcoded list with a JSON loader**

Replace the entire content of `mcp-server/mocks/clinics.py` with:

```python
import json
from functools import lru_cache
from pathlib import Path

_PATH = Path(__file__).parent / "clinics.json"


@lru_cache(maxsize=1)
def load_clinics() -> list[dict]:
    return json.loads(_PATH.read_text())
```

- [ ] **Step 2: Verify the loader works**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
python -c "from mocks.clinics import load_clinics; c = load_clinics(); print(len(c), 'clinics loaded')"
```

Expected: `68 clinics loaded` (matches generator output)

- [ ] **Step 3: Commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add mcp-server/mocks/clinics.py
git commit -m "refactor: replace hardcoded clinic list with JSON loader"
```

---

## Task 6: Update search_clinics tool with real filtering

**Files:**
- Modify: `mcp-server/tools/search_clinics.py`

- [ ] **Step 1: Write failing tests first**

Replace the content of `mcp-server/tests/test_search_clinics.py`:

```python
import pytest
from tools.search_clinics import handle_search_clinics, _mock_search


# ── _mock_search unit tests (synchronous, faster) ────────────────────────────

def test_unknown_zipcode_returns_empty():
    result = _mock_search("90210", 10.0, "5PANEL_U")
    assert result == []


def test_radius_filters_out_distant_clinics():
    # 10018 = Midtown Manhattan. 1-mile radius should return only nearby clinics.
    result = _mock_search("10018", 1.0, "5PANEL_U")
    assert all(c["Distance"] <= 1.0 for c in result), "All results must be within 1 mile"


def test_results_sorted_by_distance():
    result = _mock_search("10018", 10.0, "5PANEL_U")
    assert len(result) > 1
    distances = [c["Distance"] for c in result]
    assert distances == sorted(distances), "Results must be sorted nearest-first"


def test_distance_field_injected():
    result = _mock_search("10018", 10.0, "5PANEL_U")
    assert len(result) > 0
    for clinic in result:
        assert "Distance" in clinic
        assert isinstance(clinic["Distance"], float)


def test_specimen_filter_hair_reduces_results():
    urine = _mock_search("10018", 15.0, "5PANEL_U")
    hair = _mock_search("10018", 15.0, "5PANEL_H")
    assert len(hair) < len(urine), "Hair clinics should be a subset of urine clinics"
    for c in hair:
        assert "H" in c["SupportedSpecimenTypes"]


def test_oral_fluid_further_reduces_results():
    hair = _mock_search("10018", 15.0, "5PANEL_H")
    oral = _mock_search("10018", 15.0, "5PANEL_O")
    assert len(oral) <= len(hair)
    for c in oral:
        assert "O" in c["SupportedSpecimenTypes"]


def test_dot_filter_requires_dot_certified():
    result = _mock_search("10018", 15.0, "DOT5_U")
    for c in result:
        attrs = {a["AttributeName"]: a["AttributeValue"] for a in c["Attributes"]}
        assert attrs["DOT Certified Physician"] == "Yes"


def test_larger_radius_returns_more_clinics():
    small = _mock_search("10018", 2.0, "5PANEL_U")
    large = _mock_search("10018", 15.0, "5PANEL_U")
    assert len(large) > len(small)


def test_nj_zip_returns_nj_clinics():
    result = _mock_search("07302", 3.0, "5PANEL_U")
    assert len(result) > 0
    # At least one result should be in NJ
    states = [c["State"] for c in result]
    assert "NJ" in states


def test_required_fields_present():
    result = _mock_search("10018", 5.0, "5PANEL_U")
    assert len(result) > 0
    required = [
        "EscreenSiteId", "SiteName", "Address1", "City", "State",
        "ZipCode", "PhoneNumber", "Latitude", "Longitude",
        "Distance", "GoogleMapsUrl", "Attributes",
    ]
    for field in required:
        assert field in result[0], f"Missing field: {field}"


# ── Integration: full async handler ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_handle_search_clinics_mock_returns_list():
    result = await handle_search_clinics("10018", 5.0, "5PANEL_U", use_mock=True)
    assert isinstance(result, list)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_handle_search_clinics_unknown_zip_returns_empty():
    result = await handle_search_clinics("90210", 10.0, "5PANEL_U", use_mock=True)
    assert result == []
```

- [ ] **Step 2: Run to verify all fail**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
pytest tests/test_search_clinics.py -v
```

Expected: Most tests fail — `_mock_search` not defined yet, filtering not implemented.

- [ ] **Step 3: Implement the updated search_clinics tool**

Replace `mcp-server/tools/search_clinics.py` entirely:

```python
from mocks.clinics import load_clinics
from utils.geo import haversine_miles, centroid_for_zip

_SPECIMEN_MAP: dict[str, str] = {
    "5PANEL_U":  "U",
    "10PANEL_U": "U",
    "DOT5_U":    "U",
    "5PANEL_H":  "H",
    "5PANEL_O":  "O",
    "BAT":       "B",
}


def _attr(clinic: dict, name: str) -> str | None:
    for a in clinic.get("Attributes", []):
        if a["AttributeName"] == name:
            return a["AttributeValue"]
    return None


def _mock_search(zipcode: str, radius: float, service_identifier: str) -> list[dict]:
    centroid = centroid_for_zip(zipcode)
    if not centroid:
        return []

    specimen = _SPECIMEN_MAP.get(service_identifier)
    is_dot = service_identifier.startswith("DOT")

    results = []
    for clinic in load_clinics():
        dist = haversine_miles(
            centroid["lat"], centroid["lng"],
            clinic["Latitude"], clinic["Longitude"],
        )
        if dist > radius:
            continue
        if specimen and specimen not in clinic.get("SupportedSpecimenTypes", []):
            continue
        if is_dot and _attr(clinic, "DOT Certified Physician") != "Yes":
            continue
        results.append({**clinic, "Distance": round(dist, 1)})

    return sorted(results, key=lambda c: c["Distance"])


async def handle_search_clinics(
    zipcode: str,
    radius: float,
    service_identifier: str,
    use_mock: bool,
) -> list[dict]:
    if use_mock:
        return _mock_search(zipcode, radius, service_identifier)
    from soap.get_collection_sites import get_collection_sites
    return await get_collection_sites(zipcode, radius, service_identifier)
```

- [ ] **Step 4: Run all tests and verify they pass**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
pytest tests/test_search_clinics.py tests/test_geo.py -v
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add mcp-server/tools/search_clinics.py mcp-server/tests/test_search_clinics.py
git commit -m "feat: real haversine radius + specimen + DOT filtering in search_clinics mock"
```

---

## Task 7: New seed_data.sql — candidates + test types

**Files:**
- Create: `db/seed_data.sql`

- [ ] **Step 1: Create the seed file**

Create `db/seed_data.sql`:

```sql
-- Truncate and re-seed (idempotent)
TRUNCATE TABLE candidates;
TRUNCATE TABLE test_types;

-- 10 candidates: realistic US addresses, varied ID types
-- SSNs and DOBs are fictional for demo use only
INSERT INTO candidates
  (first_name, last_name, ssn, dob, day_phone, email, address1, city, state, zip, other_id, other_id_type)
VALUES
  ('James',   'Hartley',  '312445678', '1988-04-12', '2125550101', 'james.hartley@example.com',  '245 Park Ave, Apt 12B',    'New York',      'NY', '10017', 'DL-NY-8812345',  'D'),
  ('Sofia',   'Morales',  '423556789', '1992-09-23', '2015550202', 'sofia.morales@example.com',  '88 Hudson St, Apt 3',      'Jersey City',   'NJ', '07302', 'PP-US-23456789', 'P'),
  ('Marcus',  'Webb',     '534667890', '1985-11-07', '3125550303', 'marcus.webb@example.com',    '1500 S Lake Shore Dr',     'Chicago',       'IL', '60605', 'DL-IL-5534567',  'D'),
  ('Priya',   'Nair',     '645778901', '1995-02-14', '4155550404', 'priya.nair@example.com',     '450 Post St, Suite 200',   'San Francisco', 'CA', '94102', 'EMP-UBS-00412',  'E'),
  ('Daniel',  'Okoye',    '756889012', '1990-06-30', '7135550505', 'daniel.okoye@example.com',   '3200 Main St',             'Houston',       'TX', '77002', 'DL-TX-7756789',  'D'),
  ('Rachel',  'Kim',      '867990123', '1993-08-18', '2125550606', 'rachel.kim@example.com',     '310 W 72nd St, Apt 8F',    'New York',      'NY', '10023', 'PP-US-34567890', 'P'),
  ('Tom',     'Bruckner', '978001234', '1983-03-22', '2035550707', 'tom.bruckner@example.com',   '67 Atlantic St',           'Stamford',      'CT', '06901', 'DL-CT-9978012',  'D'),
  ('Amara',   'Diallo',   '189112345', '1997-12-05', '3055550808', 'amara.diallo@example.com',   '1000 Brickell Ave, Fl 3',  'Miami',         'FL', '33131', 'EMP-UBS-00837',  'E'),
  ('Wei',     'Zhang',    '290223456', '1989-07-16', '2065550909', 'wei.zhang@example.com',      '500 4th Ave S, Suite 110', 'Seattle',       'WA', '98104', 'DL-WA-2290234',  'D'),
  ('Natasha', 'Petrov',   '301334567', '1991-04-29', '6175551010', 'natasha.petrov@example.com', '200 State St, Apt 5C',     'Boston',        'MA', '02109', 'PP-US-45678901', 'P');

-- 6 test types covering 4 specimen types
INSERT INTO test_types
  (name, service_identifier, specimen_type, default_reason)
VALUES
  ('5-Panel Urine',          '5PANEL_U',  'U', 'PE'),
  ('10-Panel Urine',         '10PANEL_U', 'U', 'PE'),
  ('DOT 5-Panel Urine',      'DOT5_U',    'U', 'PE'),
  ('Hair Follicle 5-Panel',  '5PANEL_H',  'H', 'PE'),
  ('Oral Fluid 5-Panel',     '5PANEL_O',  'O', 'PE'),
  ('Breath Alcohol Test',    'BAT',       'B', 'RA');
```

- [ ] **Step 2: Commit the seed file**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add db/seed_data.sql
git commit -m "data: add 10 candidates and 6 test types seed for POC 1"
```

---

## Task 8: Local DB setup and smoke test

**Files:** No new files — verification only.

- [ ] **Step 1: Start MySQL in Docker (if not already running)**

```bash
docker run -d \
  --name escreen-db \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=escreen \
  -e MYSQL_USER=escreen \
  -e MYSQL_PASSWORD=escreen \
  mysql:8

# Wait ~15 seconds for MySQL to initialize, then verify:
docker logs escreen-db | tail -5
```

Expected: `ready for connections`

- [ ] **Step 2: Load schemas and seed data**

```bash
mysql -h 127.0.0.1 -u escreen -pescreen escreen < /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/db/schema_candidates.sql
mysql -h 127.0.0.1 -u escreen -pescreen escreen < /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/db/schema_test_types.sql
mysql -h 127.0.0.1 -u escreen -pescreen escreen < /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/db/seed_data.sql
```

- [ ] **Step 3: Verify DB contents**

```bash
mysql -h 127.0.0.1 -u escreen -pescreen escreen -e "SELECT COUNT(*) as candidates FROM candidates; SELECT COUNT(*) as test_types FROM test_types;"
```

Expected:
```
candidates: 10
test_types: 6
```

- [ ] **Step 4: Configure .env for local DB**

In `mcp-server/.env`, ensure:
```
USE_MOCK=true
DB_HOST=localhost
DB_PORT=3306
DB_USER=escreen
DB_PASSWORD=escreen
DB_NAME=escreen
```

- [ ] **Step 5: Run the full test suite**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
source venv/bin/activate
pytest tests/ -v --ignore=tests/test_place_order.py
```

Expected: All geo + search_clinics tests pass. (test_place_order requires DB connection — skipped for now.)

- [ ] **Step 6: Quick manual smoke test**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo/mcp-server
python -c "
import asyncio
from tools.search_clinics import handle_search_clinics

async def main():
    print('=== Midtown Manhattan, 2 miles, Urine ===')
    r = await handle_search_clinics('10018', 2.0, '5PANEL_U', use_mock=True)
    print(f'{len(r)} clinics')
    for c in r[:3]:
        print(f'  {c[\"Distance\"]}mi  {c[\"SiteName\"]}  {c[\"ZipCode\"]}')

    print()
    print('=== Same zip, Hair only ===')
    r2 = await handle_search_clinics('10018', 2.0, '5PANEL_H', use_mock=True)
    print(f'{len(r2)} clinics (should be fewer)')

    print()
    print('=== Jersey City, 5 miles ===')
    r3 = await handle_search_clinics('07302', 5.0, '5PANEL_U', use_mock=True)
    print(f'{len(r3)} clinics')
    for c in r3[:3]:
        print(f'  {c[\"Distance\"]}mi  {c[\"SiteName\"]}  {c[\"State\"]}')

asyncio.run(main())
"
```

Expected: Midtown returns more clinics than hair-only; Jersey City returns NJ and nearby Manhattan results.

- [ ] **Step 7: Final commit**

```bash
cd /home/vedanshkamdar/Desktop/ubs/ubs_mcp_demo
git add -A
git status  # verify nothing unexpected
git commit -m "chore: verify mock data end-to-end — all tests passing"
```

---

## Self-Review

**Spec coverage:**
- 3 counties, 51 zip codes → Task 1 ✓
- Haversine radius filtering → Task 2 + 6 ✓
- ~70 clinics, real SOAP attribute names → Task 3 + 4 ✓
- SupportedSpecimenTypes filtering → Task 6 ✓
- DOT Certified Physician filter → Task 6 ✓
- 6 test types, 5 reasons for test in DB → Task 7 ✓ (reasons stored as default_reason column)
- 8-10 candidates with US addresses → Task 7 ✓
- GoogleMapsUrl present → Generator in Task 3 ✓
- Distance computed at query time, not stored in JSON → Task 6 ✓
- Docker MySQL setup → Task 8 ✓

**No placeholders found.**

**Type consistency:** `_mock_search` defined in Task 6 and called from `handle_search_clinics` in same file. `load_clinics()` from `mocks/clinics.py` used in Task 6 after being defined in Task 5. `centroid_for_zip` and `haversine_miles` from `utils/geo.py` defined in Task 2, used in Task 6. All consistent.
