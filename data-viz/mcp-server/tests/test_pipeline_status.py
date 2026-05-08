import pytest
from tools.get_pipeline_status import handle_get_pipeline_status


@pytest.mark.asyncio
async def test_pipeline_status_mock_returns_breakdown():
    result = await handle_get_pipeline_status("DEMO_CLIENT", "last 30 days", use_mock=True)
    assert "total_in_progress" in result
    assert "breakdown" in result
    assert len(result["breakdown"]) > 0
