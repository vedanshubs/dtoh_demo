import json
import logging
from pydantic import ValidationError
from claude.client import get_client
from claude.action_schema import Reply
from claude.booking_state import get_session, infer_state_from_actions, State
from transport.client import MCPClientManager

log = logging.getLogger(__name__)

MODEL = "gpt-4.1-mini"
MAX_ITERATIONS = 10
MAX_CLINICS_TO_LLM = 5


def _legacy_booking_summary(actions: list[dict]) -> dict | None:
    """Derive the legacy {Candidate, Test Type, ...} dict the existing UI still reads.
    Looks for either a booking_summary or booking_confirmed action and flattens to
    the title-cased keys the legacy frontend expects."""
    for a in actions:
        t = a.get("type")
        if t in ("booking_summary", "booking_confirmed"):
            out = {
                "Candidate":      a.get("candidate", ""),
                "Test Type":      a.get("test_type", ""),
                "Reason":         a.get("reason", ""),
                "Clinic":         a.get("clinic", ""),
                "Address":        a.get("address", ""),
                "ZIP":            a.get("zip", ""),
                "Preferred Date": a.get("preferred_date", ""),
            }
            if t == "booking_confirmed":
                out["Registration ID"] = a.get("registration_id", "")
            return out
    return None


async def run_turn(
    messages: list[dict],
    system_prompt: str,
    donor_id: int,
    mcp: MCPClientManager,
    existing_clinics: list = [],
) -> dict:
    session = get_session(donor_id)
    last_clinics: list = []
    tool_calls_log: list = []
    clinics_returned_this_turn = False
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

    if existing_clinics and session.state == State.CHOOSING_CLINIC:
        import json as _json
        subset = existing_clinics[:MAX_CLINICS_TO_LLM]
        suffix = f" of {len(existing_clinics)} total" if len(existing_clinics) > len(subset) else ""
        clinic_context = (
            f"Clinics available for selection ({len(subset)} shown{suffix}):\n"
            + _json.dumps(subset)
        )
        current_messages.insert(1, {"role": "system", "content": clinic_context})
        log.info("Re-injected %d/%d clinics into context (state=%s)", len(subset), len(existing_clinics), session.state.value)

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
            log.info("Final reply: %s", text[:200])

            try:
                raw = json.loads(text)
            except json.JSONDecodeError:
                raw = {"message": text, "actions": []}

            # Defensive unwrap nested Reply JSON inside `message`.
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
                short = "; ".join(
                    f"{'.'.join(str(l) for l in e['loc'])}: {e['msg']}" for e in errors[:3]
                )
                log.warning("Reply validation failed: %s", short)
                if iteration < MAX_ITERATIONS - 2:
                    current_messages.append({
                        "role": "user",
                        "content": (
                            f"Your response did not match the required JSON schema. "
                            f"Validation errors: {short}. "
                            f"Please respond again with a valid JSON object matching the schema exactly."
                        ),
                    })
                    continue
                # Fallback: keep what we have, frontend will render message-only
                parsed = raw if isinstance(raw, dict) else {"message": text, "actions": []}
                parsed.setdefault("message", text)
                parsed.setdefault("actions", [])

            # Append CLEAN assistant message (just prose) to history — never the raw JSON.
            # Storing JSON in history made the model echo its own past turns as
            # JSON-shaped strings inside `message`, which the UI then rendered as text.
            history_content = parsed["message"]
            action_types = [a["type"] for a in parsed["actions"]]
            if action_types:
                # A small marker so the model remembers what UI signals it sent.
                history_content += f"\n\n[ui_actions_sent: {', '.join(action_types)}]"
            current_messages.append({"role": "assistant", "content": history_content})

            # Drive state transitions from the validated actions + tool results.
            try:
                infer_state_from_actions(session, parsed["actions"], clinics_returned_this_turn)
            except Exception as e:
                log.warning("state inference failed: %s", e)

            payload = {
                "reply": parsed["message"],          # legacy: plain text
                "message": parsed["message"],         # new explicit field
                "actions": parsed["actions"],         # the structured DSL
                "messages": current_messages[1:],
                "state": session.state.value,         # new: explicit workflow state
                "fingerprint": session.fingerprint,   # idempotency token for /api/bookings/confirm
            }
            if last_clinics:
                payload["clinics"] = last_clinics
            if tool_calls_log:
                payload["tool_calls"] = tool_calls_log
            legacy = _legacy_booking_summary(parsed["actions"])
            if legacy:
                payload["booking_summary"] = legacy
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
                if tc.function.name == "place_order":
                    args["donor_id"] = donor_id
                    # ── Gate: LLM must NOT call place_order without explicit
                    # user confirmation through the UI. Reject and feed the
                    # error back so the model learns to emit booking_summary
                    # and stop instead.
                    log.warning(
                        "[gate] LLM attempted place_order (state=%s) — blocking; UI must confirm.",
                        session.state.value,
                    )
                    blocked = {
                        "error": "place_order_blocked",
                        "message": (
                            "place_order may only be invoked by the UI confirmation "
                            "endpoint /api/bookings/confirm, not by the assistant. "
                            "Emit a booking_summary action and stop; the user will "
                            "click Confirm and the backend will place the order."
                        ),
                    }
                    tool_calls_log.append({
                        "tool": "place_order",
                        "args": {k: v for k, v in args.items() if k != "donor_id"},
                        "result": "BLOCKED — UI confirmation required",
                    })
                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(blocked),
                    })
                    continue
                log.info("Tool call → %s(%s)", tc.function.name, json.dumps(args))
                result = await mcp.call_tool(tc.function.name, args)
                log.info("Tool result ← %s: %s", tc.function.name, str(result)[:200])

                safe_args = {k: v for k, v in args.items() if k not in ("donor_id",)}
                if tc.function.name == "search_clinics":
                    if isinstance(result, dict):
                        result = [result]
                    if not isinstance(result, list):
                        result = []
                    valid = [c for c in result if isinstance(c, dict) and not c.get("error")]
                    result_summary = f"{len(valid)} clinics returned"
                    if valid:
                        last_clinics = valid
                        clinics_returned_this_turn = True
                    result = valid[:MAX_CLINICS_TO_LLM]
                    log.info("search_clinics: %d total, %d sent to LLM", len(valid), len(result))
                elif tc.function.name == "place_order":
                    reg_id = (
                        result.get("registration_id") or result.get("registrationId") or ""
                        if isinstance(result, dict) else ""
                    )
                    result_summary = f"Registration ID: {reg_id}" if reg_id else "Order placed"
                else:
                    result_summary = str(result)[:80] if result else "OK"

                tc_log = {"tool": tc.function.name, "args": safe_args, "result": result_summary}
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

    log.warning("Reached MAX_ITERATIONS without stop")
    return {
        "reply": "I wasn't able to complete your request.",
        "message": "I wasn't able to complete your request.",
        "actions": [],
        "messages": current_messages[1:],
    }
