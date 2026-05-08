import json
import os
import anthropic
from transport.client import MCPClientManager

MODEL = "claude-sonnet-4-6"
MAX_ITERATIONS = 10


def get_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


async def run_turn(messages: list[dict], system_prompt: str, mcp: MCPClientManager) -> dict:
    tools = await mcp.list_tools()
    anthropic_tools = [
        {"name": t.name, "description": t.description, "input_schema": t.inputSchema}
        for t in tools
    ]
    client = get_client()
    current_messages = list(messages)

    for _ in range(MAX_ITERATIONS):
        response = await client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            tools=anthropic_tools,
            messages=current_messages,
        )

        if response.stop_reason == "end_turn":
            text = next((b.text for b in response.content if b.type == "text"), "")
            current_messages.append(
                {"role": "assistant", "content": [{"type": "text", "text": text}]}
            )
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = {"summary": text, "visualization": "stat", "data": {}}
            return {"reply": parsed, "messages": current_messages}

        if response.stop_reason == "tool_use":
            tool_uses = [b for b in response.content if b.type == "tool_use"]
            current_messages.append(
                {
                    "role": "assistant",
                    "content": [
                        {"type": "tool_use", "id": b.id, "name": b.name, "input": b.input}
                        for b in tool_uses
                    ],
                }
            )
            tool_results = []
            for block in tool_uses:
                result = await mcp.call_tool(block.name, dict(block.input))
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    }
                )
            current_messages.append({"role": "user", "content": tool_results})

    return {"reply": {"summary": "Unable to complete.", "visualization": "stat", "data": {}}, "messages": current_messages}
