import pytest
from unittest.mock import AsyncMock, MagicMock
from claude.conversation import run_turn


@pytest.mark.asyncio
async def test_run_turn_stop():
    mock_mcp = AsyncMock()
    mock_tool = MagicMock()
    mock_tool.name = "search_clinics"
    mock_tool.description = "Search clinics"
    mock_tool.inputSchema = {"type": "object", "properties": {}}
    mock_mcp.list_tools.return_value = [mock_tool]

    # Build a mock that matches OpenAI's response structure
    mock_choice = MagicMock()
    mock_choice.finish_reason = "stop"
    mock_choice.message.content = "Here are some clinics near you."
    mock_choice.message.tool_calls = None

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    import claude.conversation as conv_module
    original_get_client = conv_module.get_client

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
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
