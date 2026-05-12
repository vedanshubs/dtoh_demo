import logging
from mocks.clinics import load_clinics
from utils.geo import haversine_miles, centroid_for_zip

log = logging.getLogger(__name__)

_SPECIMEN_MAP: dict = {
    "5PANEL_U":  "U",
    "10PANEL_U": "U",
    "DOT5_U":    "U",
    "5PANEL_H":  "H",
    "5PANEL_O":  "O",
    "5PANEL_OF": "O",   # FIX BUG-01: main.py sends "5PANEL_OF" for Oral Fluid
    "BAT":       "B",
}

# Service identifiers that require a DOT-certified collection site
_DOT_SERVICE_IDS = {"DOT5_U", "5PANEL_U"}


def _attr(clinic: dict, name: str):
    for a in clinic.get("Attributes", []):
        if a["AttributeName"] == name:
            return a["AttributeValue"]
    return None


def _is_24_7(clinic: dict) -> bool:
    if _attr(clinic, "After Hours Drug Screening") != "Yes":
        return False
    hours = _attr(clinic, "Clinic Hours") or ""
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return all(
        f"{d}HoursOpen:00:00" in hours and f"{d}HoursClose:23:59" in hours
        for d in days
    )


def _mock_search(zipcode: str, radius: float, service_identifier: str) -> list:
    centroid = centroid_for_zip(zipcode)
    if not centroid:
        return []

    specimen = _SPECIMEN_MAP.get(service_identifier)

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
        results.append({**clinic, "Distance": round(dist, 1)})

    return sorted(results, key=lambda c: c["Distance"])


def _apply_attribute_filters(
    clinics: list,
    walk_in_only: bool,
    dot_certified_only: bool,
    wheelchair_accessible: bool,
    open_247: bool,
) -> list:
    out = []
    for c in clinics:
        if walk_in_only and _attr(c, "Walk In Drug Testing - No Appointment Required") != "Yes":
            continue
        if dot_certified_only and _attr(c, "DOT Certified Physician") != "Yes":
            continue
        if wheelchair_accessible and _attr(c, "Handicap Access") != "Yes":
            continue
        if open_247 and not _is_24_7(c):
            continue
        out.append(c)
    return out


async def handle_search_clinics(
    zipcode: str,
    radius: float,
    service_identifier: str,
    walk_in_only: bool = False,
    dot_certified_only: bool = False,
    wheelchair_accessible: bool = False,
    open_247: bool = False,
    use_mock: bool = True,
) -> list:
    # FIX BUG-02: DOT test types must always use DOT-certified sites regardless of
    # whether the LLM explicitly passed dot_certified_only=True.
    if service_identifier in _DOT_SERVICE_IDS:
        dot_certified_only = True
        log.debug("Auto-enabling dot_certified_only for service_identifier=%s", service_identifier)

    if use_mock:
        results = _mock_search(zipcode, radius, service_identifier)
    else:
        from soap.get_collection_sites import get_collection_sites
        results = await get_collection_sites(zipcode, radius, service_identifier)

    if any([walk_in_only, dot_certified_only, wheelchair_accessible, open_247]):
        results = _apply_attribute_filters(
            results, walk_in_only, dot_certified_only, wheelchair_accessible, open_247
        )
    return results
