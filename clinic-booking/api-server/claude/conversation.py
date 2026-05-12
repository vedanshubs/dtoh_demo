import json
import logging
import re
from claude.client import get_client
from transport.client import MCPClientManager

log = logging.getLogger(__name__)

MODEL = "gpt-4.1-mini"
MAX_ITERATIONS = 10
MAX_CLINICS_TO_LLM = 5

_SUMMARY_RE = re.compile(r'\[BOOKING_SUMMARY\](.*?)\[/BOOKING_SUMMARY\]', re.DOTALL)

def _extract_booking_summary(text: str) -> dict | None:
    """Parse [BOOKING_SUMMARY]...[/BOOKING_SUMMARY] block from Claude's reply."""
    m = _SUMMARY_RE.search(text)
    if not m:
        return None
    summary = {}
    for line in m.group(1).strip().splitlines():
        if ':' in line:
            key, _, val = line.partition(':')
            summary[key.strip()] = val.strip()
    return summary if summary else None


async def run_turn(
    messages: list[dict],
    system_prompt: str,
    donor_id: int,
    mcp: MCPClientManager,
    existing_clinics: list = [],
) -> dict:
    last_clinics: list = []   # only populated when search_clinics fires this turn
    tool_calls_log: list = [] # MCP tool calls this turn
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
        )

        choice = response.choices[0]
        log.info("finish_reason=%s", choice.finish_reason)

        if choice.finish_reason == "stop":
            text = choice.message.content or ""
            current_messages.append({"role": "assistant", "content": text})
            log.info("Final reply: %s", text[:120])
            response_payload = {"reply": text, "messages": current_messages[1:]}
            if last_clinics:
                response_payload["clinics"] = last_clinics
            if tool_calls_log:
                response_payload["tool_calls"] = tool_calls_log
            booking_summary = _extract_booking_summary(text)
            if booking_summary:
                response_payload["booking_summary"] = booking_summary
                log.info("Booking summary detected: %s", booking_summary)
            return response_payload

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
                if tc.function.name == "place_order":
                    args["donor_id"] = donor_id
                log.info("Tool call → %s(%s)", tc.function.name, json.dumps(args))
                result = await mcp.call_tool(tc.function.name, args)
                log.info("Tool result ← %s: %s", tc.function.name, str(result)[:200])

                # Build MCP activity log entry
                safe_args = {k: v for k, v in args.items() if k not in ("donor_id",)}
                if tc.function.name == "search_clinics":
                    # Normalise: transport returns a bare dict when exactly 1 clinic found
                    if isinstance(result, dict):
                        result = [result]
                    if not isinstance(result, list):
                        result = []
                    valid = [c for c in result if isinstance(c, dict) and not c.get("error")]
                    result_summary = f"{len(valid)} clinics returned"
                    if valid:
                        last_clinics = valid
                    result = valid[:MAX_CLINICS_TO_LLM]
                    log.info("search_clinics: %d total, %d sent to LLM", len(valid), len(result))
                elif tc.function.name == "place_order":
                    reg_id = result.get("registration_id") or result.get("registrationId") or "" if isinstance(result, dict) else ""
                    result_summary = f"Registration ID: {reg_id}" if reg_id else "Order placed"
                else:
                    result_summary = str(result)[:80] if result else "OK"

                tc_log = {
                    "tool": tc.function.name,
                    "args": safe_args,
                    "result": result_summary,
                }
                if tc.function.name == "place_order" and isinstance(result, dict):
                    sched_time = result.get("scheduled_time", "")
                    if sched_time:
                        tc_log["scheduled_time"] = sched_time
                tool_calls_log.append(tc_log)
                current_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })

    log.warning("Reached MAX_ITERATIONS without end_turn")
    return {"reply": "I wasn't able to complete your request.", "messages": current_messages[1:]}
