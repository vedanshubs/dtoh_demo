import pytest
from tools.search_clinics import handle_search_clinics, _mock_search


# ── _mock_search unit tests (synchronous, faster) ────────────────────────────

def test_unknown_zipcode_returns_empty():
    result = _mock_search("90210", 10.0, "5PANEL_U")
    assert result == []


def test_radius_filters_out_distant_clinics():
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

