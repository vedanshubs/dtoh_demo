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

