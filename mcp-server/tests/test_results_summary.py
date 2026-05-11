import pytest
from tools.get_results_summary import handle_get_results_summary


@pytest.mark.asyncio
async def test_mock_returns_breakdown():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert "breakdown" in result
    assert result["total"] > 0


@pytest.mark.asyncio
async def test_mock_has_positive_and_negative():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    labels = [b["disposition"] for b in result["breakdown"]]
    assert "Negative" in labels
    assert "Positive" in labels


@pytest.mark.asyncio
async def test_mock_client_id_echoed():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert result["client_id"] == "DEMO_CLIENT"


@pytest.mark.asyncio
async def test_mock_date_range_echoed():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 90 days", use_mock=True)
    assert result["date_range"] == "last 90 days"


@pytest.mark.asyncio
async def test_mock_total_matches_breakdown_sum():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    total_from_breakdown = sum(b["count"] for b in result["breakdown"])
    assert result["total"] == total_from_breakdown

