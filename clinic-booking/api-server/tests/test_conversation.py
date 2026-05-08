import pytest
from unittest.mock import AsyncMock, MagicMock
from claude.conversation import run_turn  # transport.client is used internally


@pytest.mark.asyncio
async def test_run_turn_end_turn():
    mock_mcp = AsyncMock()
    mock_tool = MagicMock()
    mock_tool.name = "search_clinics"
    mock_tool.description = "Search clinics"
    mock_tool.inputSchema = {"type": "object", "properties": {}}
    mock_mcp.list_tools.return_value = [mock_tool]

    mock_client_response = MagicMock()
    mock_client_response.stop_reason = "end_turn"
    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = "Here are some clinics near you."
    mock_client_response.content = [text_block]

    import claude.conversation as conv_module
    original_get_client = conv_module.get_client

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_client_response)
    conv_module.get_client = lambda: mock_client

    result = await run_turn(
        messages=[{"role": "user", "content": "Find clinics near 60601"}],
        system_prompt="You are a helpful assistant.",
        donor_id=1,
        mcp=mock_mcp,
    )

    conv_module.get_client = original_get_client
    assert "reply" in result
    assert result["reply"] == "Here are some clinics near you."
