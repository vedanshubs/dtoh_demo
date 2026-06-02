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
    "5PANEL_OF": "O",
    "BAT":       "B",
}

_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
_DAY_ABBR = {
    "Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed",
    "Thursday": "Thu", "Friday": "Fri", "Saturday": "Sat", "Sunday": "Sun",
}


def _attr(clinic: dict, name: str):
    for a in clinic.get("Attributes", []):
        if a["AttributeName"] == name:
            return a["AttributeValue"]
    return None


def _parse_hours_string(hours_raw: str) -> dict:
    """
    Parse eScreen's semicolon-delimited clinic hours string into a dict keyed by day.
    Returns: { "Monday": {"open": "08:30", "close": "16:30", "closed": False}, ... }
    """
    parts = {}
    for segment in (hours_raw or "").split(";"):
        segment = segment.strip()
        if ":" not in segment:
            continue
        # Key may contain multiple colons (e.g. "MondayHoursOpen:08:30")
        first_colon = segment.index(":")
        key = segment[:first_colon]
        val = segment[first_colon + 1:]
        parts[key] = val

    result = {}
    for day in _DAYS:
        closed_key = f"Closed{day}"
        open_key   = f"{day}HoursOpen"
        close_key  = f"{day}HoursClose"
        is_closed  = parts.get(closed_key, "False").lower() == "true"
        open_time  = parts.get(open_key, "00:00")
        close_time = parts.get(close_key, "00:00")
        # treat 00:00–00:00 as closed even if flag not set
        if open_time == "00:00" and close_time == "00:00":
            is_closed = True
        result[day] = {"open": open_time, "close": close_time, "closed": is_closed}
    return result


def _format_hours_human(parsed: dict) -> str:
    """
    Collapse adjacent same-hours days into ranges.
    Returns a compact string like 'Mon–Fri 08:30–16:30 | Sat–Sun Closed'.
    """
    if not parsed:
        return "Hours unavailable"

    def slot(day):
        d = parsed[day]
        if d["closed"]:
            return "Closed"
        return f"{d['open']}–{d['close']}"

    groups = []
    current_days = [_DAYS[0]]
    current_slot = slot(_DAYS[0])

    for day in _DAYS[1:]:
        s = slot(day)
        if s == current_slot:
            current_days.append(day)
        else:
            groups.append((current_days[:], current_slot))
            current_days = [day]
            current_slot = s
    groups.append((current_days, current_slot))

    parts = []
    for days, s in groups:
        if len(days) == 1:
            label = _DAY_ABBR[days[0]]
        else:
            label = f"{_DAY_ABBR[days[0]]}–{_DAY_ABBR[days[-1]]}"
        parts.append(f"{label}: {s}")
    return " | ".join(parts)


def _is_open_at(parsed: dict, day: str, time_str: str) -> bool:
    """Check if clinic is open on `day` at `time_str` (HH:MM)."""
    info = parsed.get(day)
    if not info or info["closed"]:
        return False
    return info["open"] <= time_str <= info["close"]


def _normalize_clinic(clinic: dict) -> dict:
    """
    Flatten the Attributes array and parse clinic hours into human-readable fields.
    Returns an enriched clinic dict the LLM can use directly.
    """
    hours_raw = _attr(clinic, "Clinic Hours") or ""
    parsed_hours = _parse_hours_string(hours_raw)

    enriched = dict(clinic)
    enriched["walk_in"]             = _attr(clinic, "Walk In Drug Testing - No Appointment Required") == "Yes"
    enriched["wheelchair_accessible"] = _attr(clinic, "Handicap Access") == "Yes"
    enriched["dot_certified"]       = _attr(clinic, "DOT Certified Physician") == "Yes"
    enriched["eccf_enabled"]        = _attr(clinic, "eCCF Enabled") == "Yes"
    enriched["workers_comp"]        = _attr(clinic, "Workers' Comp") == "Yes"
    enriched["after_hours"]         = _attr(clinic, "After Hours Drug Screening") == "Yes"
    enriched["public_transport"]    = _attr(clinic, "Public Transportation") == "Yes"
    enriched["observed_collections"]= _attr(clinic, "Observed Collections") == "Yes"
    enriched["mobile_collections"]  = _attr(clinic, "Mobile Drug Collections") == "Yes"
    enriched["billing_tier"]        = _attr(clinic, "Billing Tier") or "Unknown"
    enriched["hours_by_day"]        = parsed_hours
    enriched["hours_display"]       = _format_hours_human(parsed_hours)
    return enriched


def _is_24_7(clinic: dict) -> bool:
    if _attr(clinic, "After Hours Drug Screening") != "Yes":
        return False
    parsed = _parse_hours_string(_attr(clinic, "Clinic Hours") or "")
    return all(
        not parsed[d]["closed"] and parsed[d]["open"] == "00:00" and parsed[d]["close"] == "23:59"
        for d in _DAYS
    )


def _mock_search(zipcode: str, radius: float, service_identifier: str) -> list:
    centroid = centroid_for_zip(zipcode)
    if not centroid:
        return []
    specimen = _SPECIMEN_MAP.get(service_identifier)
    results = []
    for clinic in load_clinics():
        dist = haversine_miles(centroid["lat"], centroid["lng"], clinic["Latitude"], clinic["Longitude"])
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
        if walk_in_only and not c.get("walk_in"):
            continue
        if dot_certified_only and not c.get("dot_certified"):
            continue
        if wheelchair_accessible and not c.get("wheelchair_accessible"):
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
    if use_mock:
        results = _mock_search(zipcode, radius, service_identifier)
    else:
        from soap.get_collection_sites import get_collection_sites
        results = await get_collection_sites(zipcode, radius, service_identifier)

    # Normalize every clinic (hours parsing + attribute flattening)
    results = [_normalize_clinic(c) for c in results]

    if any([walk_in_only, dot_certified_only, wheelchair_accessible, open_247]):
        results = _apply_attribute_filters(
            results, walk_in_only, dot_certified_only, wheelchair_accessible, open_247
        )

    return results
