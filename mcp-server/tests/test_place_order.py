import pytest
from tools.place_order import handle_place_order


@pytest.mark.asyncio
async def test_place_order_mock_success():
    result = await handle_place_order(10001, 1, "5PANEL", "PE", use_mock=True)
    assert result["success"] is True
    assert "registration_id" in result
    assert result["errors"] == []
