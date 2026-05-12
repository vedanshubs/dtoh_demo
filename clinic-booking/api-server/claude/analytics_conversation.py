import json
import logging
import os
from openai import AsyncOpenAI
from transport.client import MCPClientManager

log = logging.getLogger(__name__)

MODEL = "gpt-4.1-mini"
MAX_ITERATIONS = 10

ANALYTICS_TOOLS = {
    "get_results_summary",
    "get_pipeline_status",
    "get_analyte_breakdown",
    "get_turnaround_stats",
}

_client = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


async def run_analytics_turn(messages: list[dict], system_prompt: str, mcp: MCPClientManager) -> dict:
    all_tools = await mcp.list_tools()
    tools = [t for t in all_tools if t.name in ANALYTICS_TOOLS]
    openai_tools = [
        {
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.inputSchema,
            },
        }
        for t in tools
    ]

    client = _get_client()
    current_messages = [{"role": "system", "content": system_prompt}] + list(messages)

    tool_calls_log: list = []

    for iteration in range(MAX_ITERATIONS):
        log.info("Analytics: Calling %s (iteration %d, %d messages)", MODEL, iteration + 1, len(current_messages))
        response = await client.chat.completions.create(
            model=MODEL,
            messages=current_messages,
            tools=openai_tools if openai_tools else None,
        )
        choice = response.choices[0]
        log.info("Analytics: finish_reason=%s", choice.finish_reason)

        if choice.finish_reason == "stop":
            text = choice.message.content or ""
            current_messages.append({"role": "assistant", "content": text})
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = {"summary": text, "visualization": None}
            log.info("Analytics reply: %s", text[:120])
            payload = {"reply": parsed, "messages": current_messages[1:]}
            if tool_calls_log:
                payload["tool_calls"] = tool_calls_log
            return payload

        if choice.finish_reason == "tool_calls":
            tool_calls = choice.message.tool_calls
            current_messages.append({
                "role": "assistant",
                "content": choice.message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in tool_calls
                ],
            })
            for tc in tool_calls:
                args = json.loads(tc.function.arguments)
                log.info("Analytics tool call → %s(%s)", tc.function.name, json.dumps(args))
                result = await mcp.call_tool(tc.function.name, args)
                log.info("Analytics tool result ← %s: %s", tc.function.name, str(result)[:200])
                if isinstance(result, dict):
                    if result.get("avg_end_to_end_days") is not None:
                        result_summary = f"{result['avg_end_to_end_days']} days avg"
                    elif result.get("total_in_pipeline") is not None:
                        result_summary = f"{result['total_in_pipeline']} in pipeline"
                    elif result.get("total") is not None:
                        result_summary = f"{result['total']} records"
                    else:
                        result_summary = "OK"
                else:
                    result_summary = str(result)[:60]
                tool_calls_log.append({"tool": tc.function.name, "args": args, "result": result_summary})
                current_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })

    return {
        "reply": {"summary": "Maximum iterations reached.", "visualization": None},
        "messages": current_messages[1:],
    }
