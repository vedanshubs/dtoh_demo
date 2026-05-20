import json
import logging
from pydantic import ValidationError
from openai import AsyncOpenAI
from transport.client import MCPClientManager
from ai.view_schema import Reply
from ai.conversation import get_client, _tool_result_summary, MODEL, MAX_ITERATIONS

log = logging.getLogger(__name__)


class SummaryExtractor:
    """
    Pulls the 'summary' string value out of a streaming JSON blob token by token.
    Handles escaped characters and marker split across token boundaries.
    """
    _MARKERS = ('"summary":"', '"summary": "', '"summary" : "', '"summary"  :  "')

    def __init__(self):
        self._buf = ""
        self._state = "searching"  # searching | in_value | done

    def feed(self, token: str) -> str:
        if self._state == "done":
            return ""

        self._buf += token

        if self._state == "searching":
            for marker in self._MARKERS:
                idx = self._buf.find(marker)
                if idx != -1:
                    self._state = "in_value"
                    self._buf = self._buf[idx + len(marker):]
                    break
            else:
                # Keep a trailing window so markers split across tokens are caught
                if len(self._buf) > 40:
                    self._buf = self._buf[-30:]
                return ""

        if self._state == "in_value":
            out = []
            i = 0
            while i < len(self._buf):
                ch = self._buf[i]
                if ch == "\\" and i + 1 < len(self._buf):
                    nxt = self._buf[i + 1]
                    out.append({"n": "\n", "t": "\t", "r": "\r", '"': '"', "\\": "\\"}.get(nxt, nxt))
                    i += 2
                elif ch == "\\" and i + 1 == len(self._buf):
                    # Escape split across tokens — hold the backslash
                    self._buf = "\\"
                    return "".join(out)
                elif ch == '"':
                    self._state = "done"
                    self._buf = ""
                    return "".join(out)
                else:
                    out.append(ch)
                    i += 1
            self._buf = ""
            return "".join(out)

        return ""


async def run_turn_stream(messages: list[dict], system_prompt: str, mcp: MCPClientManager):
    """
    Async generator that yields SSE-ready event dicts:
      {"event": "tool_call",  "data": {tool, args, result}}
      {"event": "delta",      "data": {text}}
      {"event": "done",       "data": {reply, tool_calls, messages}}
      {"event": "error",      "data": {message}}
    """
    tool_calls_log: list = []
    tools = await mcp.list_tools()
    openai_tools = [
        {"type": "function", "function": {"name": t.name, "description": t.description, "parameters": t.inputSchema}}
        for t in tools
    ]
    client: AsyncOpenAI = get_client()
    current_messages = [{"role": "system", "content": system_prompt}] + list(messages)

    # ── Phase 1: tool-gathering (non-streaming) ────────────────────────────────
    # Loop until we have tool results, or the model answers directly.
    synthesis_needed = False

    for iteration in range(MAX_ITERATIONS - 1):
        log.info("Stream phase-1 iteration %d (%d msgs)", iteration + 1, len(current_messages))
        response = await client.chat.completions.create(
            model=MODEL,
            messages=current_messages,
            tools=openai_tools,
            response_format={"type": "json_object"},
        )
        choice = response.choices[0]
        log.info("finish_reason=%s", choice.finish_reason)

        if choice.finish_reason == "stop":
            # Model answered without tools — parse and stream the summary via deltas
            text = choice.message.content or ""
            current_messages.append({"role": "assistant", "content": text})
            try:
                raw = json.loads(text)
                reply = Reply.model_validate(raw)
                parsed = reply.model_dump()
            except Exception:
                parsed = {"summary": text, "view": None, "suggestions": []}

            for char in parsed.get("summary", ""):
                yield {"event": "delta", "data": {"text": char}}
            yield {"event": "done", "data": {"reply": parsed, "tool_calls": tool_calls_log, "messages": current_messages[1:]}}
            return

        if choice.finish_reason == "tool_calls":
            tool_calls = choice.message.tool_calls
            current_messages.append({
                "role": "assistant",
                "content": choice.message.content,
                "tool_calls": [
                    {"id": tc.id, "type": "function",
                     "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in tool_calls
                ],
            })
            for tc in tool_calls:
                args = json.loads(tc.function.arguments)
                log.info("Tool call → %s(%s)", tc.function.name, json.dumps(args))
                result = await mcp.call_tool(tc.function.name, args)
                log.info("Tool result ← %s: %s", tc.function.name, str(result)[:200])
                summary = _tool_result_summary(result)
                tool_calls_log.append({"tool": tc.function.name, "args": args, "result": summary})
                # Yield immediately so the chip appears before synthesis starts
                yield {"event": "tool_call", "data": {"tool": tc.function.name, "args": args, "result": summary}}
                current_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })
            synthesis_needed = True
            break  # One tool-call round is enough for this domain; go to synthesis

    if not synthesis_needed:
        yield {"event": "error", "data": {"message": "Unable to complete the request."}}
        return

    # ── Phase 2: streaming synthesis ──────────────────────────────────────────
    log.info("Stream phase-2: synthesis (streaming)")
    try:
        stream = await client.chat.completions.create(
            model=MODEL,
            messages=current_messages,
            tools=openai_tools,
            response_format={"type": "json_object"},
            stream=True,
        )
    except Exception as exc:
        log.error("Streaming synthesis failed: %s", exc)
        yield {"event": "error", "data": {"message": str(exc)}}
        return

    full_text = ""
    extractor = SummaryExtractor()

    async for chunk in stream:
        if not chunk.choices:
            continue
        content = chunk.choices[0].delta.content
        if content:
            full_text += content
            delta = extractor.feed(content)
            if delta:
                yield {"event": "delta", "data": {"text": delta}}

    current_messages.append({"role": "assistant", "content": full_text})
    log.info("Synthesis complete (%d chars)", len(full_text))

    # ── Validate and yield done ────────────────────────────────────────────────
    try:
        raw = json.loads(full_text)
    except json.JSONDecodeError:
        raw = {"summary": full_text}

    try:
        reply = Reply.model_validate(raw)
        parsed = reply.model_dump()
        log.info("View validation OK — panels: %d", len(reply.view.panels) if reply.view else 0)
    except ValidationError as exc:
        errors = exc.errors(include_url=False)
        short = "; ".join(f"{'.'.join(str(l) for l in e['loc'])}: {e['msg']}" for e in errors[:3])
        log.warning("View validation failed: %s", short)
        parsed = raw  # Pass through so at least summary renders

    yield {"event": "done", "data": {"reply": parsed, "tool_calls": tool_calls_log, "messages": current_messages[1:]}}
