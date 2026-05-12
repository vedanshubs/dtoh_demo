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
) -> dict:
    last_clinics: list = []  # captured from search_clinics tool result
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
            # Detect booking summary block — signals pre-confirmation state
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
                if tc.function.name == "search_clinics" and isinstance(result, list):
                    valid = [c for c in result if isinstance(c, dict) and not c.get("error")]
                    if valid:
                        last_clinics = valid          # all clinics → frontend pagination
                    result = valid[:MAX_CLINICS_TO_LLM]   # top 5 → LLM context
                    log.info("search_clinics: %d total, %d sent to LLM", len(valid), len(result))
                current_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })

    log.warning("Reached MAX_ITERATIONS without end_turn")
    return {"reply": "I wasn't able to complete your request.", "messages": current_messages[1:]}
