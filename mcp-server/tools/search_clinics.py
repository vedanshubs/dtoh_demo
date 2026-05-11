from mocks.clinics import load_clinics
from utils.geo import haversine_miles, centroid_for_zip

_SPECIMEN_MAP: dict = {
    "5PANEL_U":  "U",
    "10PANEL_U": "U",
    "DOT5_U":    "U",
    "5PANEL_H":  "H",
    "5PANEL_O":  "O",
    "BAT":       "B",
}


def _attr(clinic: dict, name: str):
    for a in clinic.get("Attributes", []):
        if a["AttributeName"] == name:
            return a["AttributeValue"]
    return None


def _mock_search(zipcode: str, radius: float, service_identifier: str) -> list:
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
    use_mock: bool = True,
) -> list:
    if use_mock:
        return _mock_search(zipcode, radius, service_identifier)
    from soap.get_collection_sites import get_collection_sites
    return await get_collection_sites(zipcode, radius, service_identifier)
