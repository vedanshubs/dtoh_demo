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


def _specimen_types() -> list:
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
        "SiteName": f"{chain} \u2013 {label}",
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


def generate() -> list:
    zipcodes = json.loads(ZIPCODES_PATH.read_text())
    clinics = []
    site_id = 20001

    used_labels = {c: set() for c in LOCATION_LABELS}

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
    print(f"Generated {len(clinics)} clinics \u2192 {OUTPUT_PATH}")
