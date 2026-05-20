"""
Streaming variant of run_turn for clinic-booking.

Events yielded (SSE-shaped dicts):
  {"event": "tool_call",  "data": {tool, args, result}}
  {"event": "delta",      "data": {text}}           # message-field characters
  {"event": "state",      "data": {state, fingerprint}}
  {"event": "done",       "data": {message, actions, clinics?, tool_calls?, booking_summary?, state, fingerprint, messages}}
  {"event": "error",      "data": {message}}
"""
import json
import logging
from pydantic import ValidationError
from openai import AsyncOpenAI
from claude.client import get_client
from claude.action_schema import Reply
from claude.booking_state import get_session, infer_state_from_actions, State
from claude.conversation import _legacy_booking_summary, MODEL, MAX_ITERATIONS, MAX_CLINICS_TO_LLM
from transport.client import MCPClientManager

log = logging.getLogger(__name__)


class MessageExtractor:
    """Pulls the `message` string value out of a streaming JSON blob token-by-token."""
    _MARKERS = ('"message":"', '"message": "', '"message" : "', '"message"  :  "')

    def __init__(self):
        self._buf = ""
        self._state = "searching"

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


async def run_turn_stream(
    messages: list[dict],
    system_prompt: str,
    donor_id: int,
    mcp: MCPClientManager,
    existing_clinics: list = [],
):
    session = get_session(donor_id)
    last_clinics: list = []
    tool_calls_log: list = []
    usage_totals = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    clinics_returned_this_turn = False

    tools = await mcp.list_tools()
    openai_tools = [
        {"type": "function", "function": {"name": t.name, "description": t.description, "parameters": t.inputSchema}}
        for t in tools
    ]
    client: AsyncOpenAI = get_client()
    # Sanitise inbound history — strip any raw Reply JSON that older turns may have
    # left in assistant messages, otherwise the model echoes it back nested.
    sanitised: list = []
    for m in messages:
        if isinstance(m, dict) and m.get("role") == "assistant" and isinstance(m.get("content"), str):
            c = m["content"].lstrip()
            if c.startswith("{") and '"message"' in c:
                try:
                    j = json.loads(m["content"])
                    if isinstance(j, dict) and isinstance(j.get("message"), str):
                        log.info("Stripped raw-JSON from inbound assistant history")
                        m = {**m, "content": j["message"]}
                except json.JSONDecodeError:
                    pass
        sanitised.append(m)
    current_messages = [{"role": "system", "content": system_prompt}] + sanitised

    # Re-inject clinic list only while the user is still choosing — not after selection.
    # Limit to MAX_CLINICS_TO_LLM and use compact JSON to minimise token cost.
    if existing_clinics and session.state == State.CHOOSING_CLINIC:
        subset = existing_clinics[:MAX_CLINICS_TO_LLM]
        suffix = f" of {len(existing_clinics)} total" if len(existing_clinics) > len(subset) else ""
        clinic_context = (
            f"Clinics available for selection ({len(subset)} shown{suffix}):\n"
            + json.dumps(subset)
        )
        current_messages.insert(1, {"role": "system", "content": clinic_context})
        log.info("Re-injected %d/%d clinics into context (state=%s)", len(subset), len(existing_clinics), session.state.value)

    # ── Phase 1: tool-gathering (non-streaming) ────────────────────────────────
    synthesis_needed = False
    for iteration in range(MAX_ITERATIONS - 1):
        log.info("Stream phase-1 iter %d (%d msgs)", iteration + 1, len(current_messages))
        response = await client.chat.completions.create(
            model=MODEL,
            messages=current_messages,
            tools=openai_tools,
            response_format={"type": "json_object"},
        )
        choice = response.choices[0]
        log.info("finish_reason=%s", choice.finish_reason)
        if response.usage:
            usage_totals["prompt_tokens"]     += response.usage.prompt_tokens
            usage_totals["completion_tokens"] += response.usage.completion_tokens
            usage_totals["total_tokens"]      += response.usage.total_tokens

        if choice.finish_reason == "stop":
            text = choice.message.content or ""
            try:
                raw = json.loads(text)
                reply = Reply.model_validate(raw)
                parsed = reply.model_dump()
            except Exception:
                parsed = {"message": text, "actions": []}
            # Store clean prose in history — never raw JSON (model echoes it back otherwise).
            action_types = [a["type"] for a in parsed.get("actions", [])]
            hist = parsed.get("message", "")
            if action_types:
                hist += f"\n\n[ui_actions_sent: {', '.join(action_types)}]"
            current_messages.append({"role": "assistant", "content": hist})
            # Replay summary via delta events for UX consistency
            for ch in parsed.get("message", ""):
                yield {"event": "delta", "data": {"text": ch}}
            try:
                infer_state_from_actions(session, parsed["actions"], clinics_returned_this_turn)
            except Exception:
                pass
            payload = {
                "message": parsed["message"], "actions": parsed["actions"],
                "messages": current_messages[1:],
                "state": session.state.value, "fingerprint": session.fingerprint,
            }
            if last_clinics:    payload["clinics"] = last_clinics
            if tool_calls_log:  payload["tool_calls"] = tool_calls_log
            legacy = _legacy_booking_summary(parsed["actions"])
            if legacy:          payload["booking_summary"] = legacy
            payload["usage"] = usage_totals
            yield {"event": "done", "data": payload}
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

                # ── Gate: LLM must NOT call place_order — UI confirmation only.
                if tc.function.name == "place_order":
                    log.warning("[gate-stream] LLM attempted place_order — blocking")
                    blocked = {
                        "error": "place_order_blocked",
                        "message": (
                            "place_order may only be invoked by /api/bookings/confirm. "
                            "Emit a booking_summary action and stop."
                        ),
                    }
                    tc_log = {
                        "tool": "place_order",
                        "args": {k: v for k, v in args.items() if k != "donor_id"},
                        "result": "BLOCKED — UI confirmation required",
                    }
                    tool_calls_log.append(tc_log)
                    yield {"event": "tool_call", "data": tc_log}
                    current_messages.append({
                        "role": "tool", "tool_call_id": tc.id,
                        "content": json.dumps(blocked),
                    })
                    continue

                log.info("Tool call → %s(%s)", tc.function.name, json.dumps(args))
                result = await mcp.call_tool(tc.function.name, args)
                log.info("Tool result ← %s: %s", tc.function.name, str(result)[:200])
                safe_args = {k: v for k, v in args.items() if k != "donor_id"}

                if tc.function.name == "search_clinics":
                    if isinstance(result, dict): result = [result]
                    if not isinstance(result, list): result = []
                    valid = [c for c in result if isinstance(c, dict) and not c.get("error")]
                    result_summary = f"{len(valid)} clinics returned"
                    if valid:
                        last_clinics = valid
                        clinics_returned_this_turn = True
                    result = valid[:MAX_CLINICS_TO_LLM]
                else:
                    result_summary = str(result)[:80] if result else "OK"

                tc_log = {"tool": tc.function.name, "args": safe_args, "result": result_summary}
                tool_calls_log.append(tc_log)
                yield {"event": "tool_call", "data": tc_log}
                current_messages.append({
                    "role": "tool", "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })
            synthesis_needed = True
            break

    if not synthesis_needed:
        yield {"event": "error", "data": {"message": "Unable to complete the request."}}
        return

    # ── Phase 2: streaming synthesis ──────────────────────────────────────────
    # No tools in synthesis — forces the model to write content, not make more tool calls.
    log.info("Stream phase-2: synthesis (streaming)")
    try:
        stream = await client.chat.completions.create(
            model=MODEL,
            messages=current_messages,
            response_format={"type": "json_object"},
            stream=True,
            stream_options={"include_usage": True},
        )
    except Exception as exc:
        log.error("Streaming synthesis failed: %s", exc)
        yield {"event": "error", "data": {"message": str(exc)}}
        return

    full_text = ""
    extractor = MessageExtractor()
    async for chunk in stream:
        if chunk.usage:
            usage_totals["prompt_tokens"]     += chunk.usage.prompt_tokens
            usage_totals["completion_tokens"] += chunk.usage.completion_tokens
            usage_totals["total_tokens"]      += chunk.usage.total_tokens
        if not chunk.choices: continue
        content = chunk.choices[0].delta.content
        if content:
            full_text += content
            delta = extractor.feed(content)
            if delta:
                yield {"event": "delta", "data": {"text": delta}}

    log.info("Synthesis complete (%d chars) | tokens: %s", len(full_text), usage_totals)

    try:
        raw = json.loads(full_text)
    except json.JSONDecodeError:
        raw = {"message": full_text, "actions": []}

    # Defensive unwrap: if the model nested a Reply inside `message`
    # (history corruption from older raw-JSON turns can cause this),
    # peel it until we land on plain prose.
    for _ in range(3):
        inner = raw.get("message") if isinstance(raw, dict) else None
        if isinstance(inner, str) and inner.lstrip().startswith("{") and '"message"' in inner:
            try:
                nested = json.loads(inner)
                if isinstance(nested, dict) and "message" in nested:
                    log.warning("Unwrapping nested Reply JSON in message field")
                    if not raw.get("actions") and nested.get("actions"):
                        raw["actions"] = nested["actions"]
                    raw["message"] = nested["message"]
                    continue
            except json.JSONDecodeError:
                pass
        break

    try:
        reply = Reply.model_validate(raw)
        parsed = reply.model_dump()
        log.info("Reply validation OK — actions: %s", [a["type"] for a in parsed["actions"]])
    except ValidationError as exc:
        errors = exc.errors(include_url=False)
        short = "; ".join(f"{'.'.join(str(l) for l in e['loc'])}: {e['msg']}" for e in errors[:3])
        log.warning("Reply validation failed: %s", short)
        parsed = raw if isinstance(raw, dict) else {"message": full_text, "actions": []}

    # Store clean prose in history — never raw JSON.
    parsed.setdefault("message", full_text)
    parsed.setdefault("actions", [])
    action_types = [a["type"] for a in parsed["actions"]]
    hist = parsed["message"]
    if action_types:
        hist += f"\n\n[ui_actions_sent: {', '.join(action_types)}]"
    current_messages.append({"role": "assistant", "content": hist})

    try:
        infer_state_from_actions(session, parsed["actions"], clinics_returned_this_turn)
    except Exception as e:
        log.warning("state inference failed: %s", e)

    payload = {
        "message": parsed["message"], "actions": parsed["actions"],
        "messages": current_messages[1:],
        "state": session.state.value, "fingerprint": session.fingerprint,
    }
    if last_clinics:    payload["clinics"] = last_clinics
    if tool_calls_log:  payload["tool_calls"] = tool_calls_log
    legacy = _legacy_booking_summary(parsed["actions"])
    if legacy:          payload["booking_summary"] = legacy
    payload["usage"] = usage_totals
    yield {"event": "done", "data": payload}
