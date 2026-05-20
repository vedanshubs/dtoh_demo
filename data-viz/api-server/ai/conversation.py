import json
import logging
import os
from pydantic import ValidationError
from openai import AsyncOpenAI
from transport.client import MCPClientManager
from ai.view_schema import Reply

log = logging.getLogger(__name__)

MODEL = "gpt-4.1-mini"
MAX_ITERATIONS = 10

_client = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


def _tool_result_summary(result: dict) -> str:
    if not isinstance(result, dict):
        return str(result)[:60]
    if result.get("avg_end_to_end_days") is not None:
        return f"{result['avg_end_to_end_days']} days avg"
    if result.get("total_in_progress") is not None:
        return f"{result['total_in_progress']} in pipeline"
    if result.get("total_positives") is not None:
        return f"{result['total_positives']} positives"
    if result.get("total") is not None:
        return f"{result['total']} records"
    return "OK"


async def run_turn(messages: list[dict], system_prompt: str, mcp: MCPClientManager) -> dict:
    tool_calls_log: list = []
    tools = await mcp.list_tools()
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
    client = get_client()
    current_messages = [{"role": "system", "content": system_prompt}] + list(messages)

    for iteration in range(MAX_ITERATIONS):
        log.info("Calling %s (iteration %d, %d messages)", MODEL, iteration + 1, len(current_messages))

        response = await client.chat.completions.create(
            model=MODEL,
            messages=current_messages,
            tools=openai_tools,
            response_format={"type": "json_object"},
        )

        choice = response.choices[0]
        log.info("finish_reason=%s", choice.finish_reason)

        if choice.finish_reason == "stop":
            text = choice.message.content or ""
            current_messages.append({"role": "assistant", "content": text})
            log.info("Final reply: %s", text[:200])

            try:
                raw = json.loads(text)
            except json.JSONDecodeError:
                # Should not happen with json_object enforced, but guard anyway
                raw = {"summary": text}

            try:
                reply = Reply.model_validate(raw)
                parsed = reply.model_dump(exclude_none=False)
                log.info("View validation OK — panels: %d", len(reply.view.panels) if reply.view else 0)
            except ValidationError as exc:
                errors = exc.errors(include_url=False)
                short = "; ".join(f"{'.'.join(str(l) for l in e['loc'])}: {e['msg']}" for e in errors[:3])
                log.warning("View validation failed (%d errors): %s", len(errors), short)

                if iteration < MAX_ITERATIONS - 2:
                    # Inject error as user feedback and retry — the model sees its own mistake
                    current_messages.append({
                        "role": "user",
                        "content": (
                            f"Your response did not match the required JSON schema. "
                            f"Validation errors: {short}. "
                            f"Please respond again with a valid JSON object matching the schema exactly."
                        ),
                    })
                    continue

                # Fallback: pass raw through so the UI can at least show the summary
                parsed = raw

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
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in tool_calls
                ],
            })
            for tc in tool_calls:
                args = json.loads(tc.function.arguments)
                log.info("Tool call → %s(%s)", tc.function.name, json.dumps(args))
                result = await mcp.call_tool(tc.function.name, args)
                log.info("Tool result ← %s: %s", tc.function.name, str(result)[:200])
                tool_calls_log.append({
                    "tool": tc.function.name,
                    "args": args,
                    "result": _tool_result_summary(result),
                })
                current_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })

    log.warning("Reached MAX_ITERATIONS without stop")
    return {
        "reply": {"summary": "Unable to complete the request.", "view": None, "suggestions": []},
        "messages": current_messages[1:],
    }
