import pytest
from tools.get_results_summary import handle_get_results_summary


@pytest.mark.asyncio
async def test_results_summary_mock_returns_breakdown():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert "breakdown" in result
    assert result["total"] > 0
    labels = [b["disposition"] for b in result["breakdown"]]
    assert "Negative" in labels
    assert "Positive" in labels


@pytest.mark.asyncio
async def test_results_summary_client_id_in_response():
    result = await handle_get_results_summary("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert result["client_id"] == "DEMO_CLIENT"
