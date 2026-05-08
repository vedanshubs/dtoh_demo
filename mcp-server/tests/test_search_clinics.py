import pytest
from tools.search_clinics import handle_search_clinics


@pytest.mark.asyncio
async def test_search_clinics_mock_returns_list():
    result = await handle_search_clinics("60601", 10.0, "TEST_SERVICE", use_mock=True)
    assert isinstance(result, list)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_search_clinics_mock_has_required_fields():
    result = await handle_search_clinics("60601", 10.0, "TEST_SERVICE", use_mock=True)
    clinic = result[0]
    for field in ["EscreenSiteId", "SiteName", "Address1", "City", "Distance", "GoogleMapsUrl"]:
        assert field in clinic, f"Missing field: {field}"
