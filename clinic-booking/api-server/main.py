import json
import logging
import os
import pymysql
import pymysql.cursors
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

from transport.client import MCPClientManager
from claude.conversation import run_turn
from claude.stream import run_turn_stream
from claude.booking_state import get_session, reset_session, State
from claude.prompts.system_prompt import build_system_prompt
from claude.analytics_conversation import run_analytics_turn
from claude.prompts.analytics_prompt import build_analytics_prompt
from rest_actions import register_action_routes

load_dotenv()

mcp_manager = MCPClientManager()
CLIENT_ID = os.getenv("ESCREEN_CLIENT_ACCOUNT", "UBS001")

def _get_db():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "escreen"),
        password=os.getenv("DB_PASSWORD", "escreen"),
        database=os.getenv("DB_NAME", "escreen"),
        cursorclass=pymysql.cursors.DictCursor,
    )


# Donor fixtures — loaded from JSON file rather than inlined (used when DB is unavailable).
# Full profile includes SSN/DOB/email for the profile card; redacted view is used for LLM context.
_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "donors.json")
try:
    with open(_FIXTURE_PATH, "r") as _f:
        _MOCK_DONORS_FULL = __import__("json").load(_f)
    log.info("Loaded %d donor fixtures from %s", len(_MOCK_DONORS_FULL), _FIXTURE_PATH)
except FileNotFoundError:
    log.error("Donor fixtures missing at %s", _FIXTURE_PATH)
    _MOCK_DONORS_FULL = []


# PII fields that must never reach the LLM context.
_PII_FIELDS = {"ssn", "dob", "day_phone", "email", "other_id", "other_id_type"}


def redact_donor_for_llm(donor: dict) -> dict:
    """Return a copy of the donor profile with PII stripped — for system prompt use only."""
    return {k: v for k, v in donor.items() if k not in _PII_FIELDS}

def _load_donors():
    """Returns lightweight donor list (no SSN) for candidate selector."""
    try:
        conn = _get_db()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, first_name, last_name, city, state, zip FROM candidates ORDER BY id"
            )
            rows = cur.fetchall()
            role_map = {d["id"]: d.get("role", "") for d in _MOCK_DONORS_FULL}
            for r in rows:
                r["role"] = role_map.get(r["id"], "")
            return rows
    except Exception as e:
        log.warning("DB unavailable, falling back to mock donors: %s", e)
        return [{k: d[k] for k in ("id","first_name","last_name","city","state","zip","role")} for d in _MOCK_DONORS_FULL]

def _load_donor_full(donor_id: int) -> dict | None:
    """Returns full donor profile including SSN/DOB/contact for the profile card."""
    try:
        conn = _get_db()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, first_name, last_name, ssn, dob, day_phone, email, address1, city, state, zip, other_id, other_id_type "
                "FROM candidates WHERE id = %s",
                (donor_id,)
            )
            row = cur.fetchone()
            if row:
                role_map = {d["id"]: d.get("role", "") for d in _MOCK_DONORS_FULL}
                row["role"] = role_map.get(donor_id, "")
                if row.get("dob"):
                    row["dob"] = str(row["dob"])
                return row
    except Exception as e:
        log.warning("DB unavailable for donor detail, using mock: %s", e)
    return next((d for d in _MOCK_DONORS_FULL if d["id"] == donor_id), None)


MOCK_TEST_TYPES = [
    {"name": "5-Panel Urine (DOT)",      "service_identifier": "5PANEL_U",   "default_reason": "PE"},
    {"name": "10-Panel Urine (Non-DOT)", "service_identifier": "10PANEL_U",  "default_reason": "PE"},
    {"name": "Hair Follicle 5-Panel",    "service_identifier": "5PANEL_H",   "default_reason": "PE"},
    {"name": "Oral Fluid 5-Panel",       "service_identifier": "5PANEL_OF",  "default_reason": "RND"},
    {"name": "Breath Alcohol Test",      "service_identifier": "BAT",        "default_reason": "FC"},
]

# service_identifier override map — DB rows use generic codes; booking needs specific ones
_SERVICE_ID_OVERRIDE = {
    "5PANEL_U":  "5PANEL_U",
    "10PANEL_U": "10PANEL_U",
    "5PANEL_H":  "5PANEL_H",
    "5PANEL_O":  "5PANEL_OF",
    "BAT":       "BAT",
}

def _load_test_types() -> list[dict]:
    """Load test types from DB; falls back to MOCK_TEST_TYPES if DB unavailable."""
    try:
        conn = _get_db()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name, service_identifier, default_reason FROM test_types ORDER BY id"
            )
            rows = cur.fetchall()
            if rows:
                return [
                    {
                        "name": r["name"],
                        "service_identifier": _SERVICE_ID_OVERRIDE.get(
                            r["service_identifier"], r["service_identifier"]
                        ),
                        "default_reason": r["default_reason"],
                    }
                    for r in rows
                ]
    except Exception as e:
        log.warning("DB unavailable for test types, using mock: %s", e)
    return MOCK_TEST_TYPES


def _ensure_bookings_table():
    try:
        conn = _get_db()
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS bookings (
                    id              INT AUTO_INCREMENT PRIMARY KEY,
                    registration_id VARCHAR(64)  NOT NULL,
                    donor_id        INT,
                    candidate       VARCHAR(128),
                    test_type       VARCHAR(128),
                    reason          VARCHAR(64),
                    preferred_date  VARCHAR(128),
                    clinic          VARCHAR(256),
                    address         VARCHAR(256),
                    zip             VARCHAR(16),
                    transcript      MEDIUMTEXT,
                    fingerprint     VARCHAR(64),
                    booked_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Additive migration for existing tables — no destructive changes.
            for col_sql in (
                "ALTER TABLE bookings ADD COLUMN transcript MEDIUMTEXT",
                "ALTER TABLE bookings ADD COLUMN fingerprint VARCHAR(64)",
            ):
                try:
                    cur.execute(col_sql)
                except Exception:
                    pass  # column already exists
        conn.commit()
        conn.close()
        log.info("bookings table ready (with transcript + fingerprint audit columns)")
    except Exception as e:
        log.warning("Could not ensure bookings table: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting MCP server subprocess...")
    await mcp_manager.start()
    log.info("MCP server ready")
    _ensure_bookings_table()
    yield
    log.info("Shutting down MCP server...")
    await mcp_manager.stop()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"http://localhost:{p}" for p in range(5173, 5181)],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    donor_id: int
    messages: list[dict]
    user_message: str
    clinics: list[dict] = []


register_action_routes(app, mcp_manager)


@app.get("/api/donors")
async def list_donors():
    return _load_donors()


@app.get("/api/donors/{donor_id}")
async def get_donor(donor_id: int):
    from fastapi import HTTPException
    donor = _load_donor_full(donor_id)
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    return donor


class CreateDonorRequest(BaseModel):
    first_name:    str
    last_name:     str
    ssn:           str
    dob:           str            # YYYY-MM-DD
    day_phone:     str
    email:         str | None = None
    address1:      str
    city:          str
    state:         str
    zip:           str
    other_id:      str | None = None
    other_id_type: str | None = None   # D=Driver License, P=Passport, E=Employer, S=State ID


@app.post("/api/donors")
async def create_donor(req: CreateDonorRequest):
    """Insert a self-entered donor into the candidates table and return the new
    row (including its id). PII is stored server-side only — it never flows
    through the chat/LLM. place_order later re-fetches it by id."""
    from fastapi import HTTPException
    import re

    ssn   = re.sub(r"\D", "", req.ssn or "")
    phone = re.sub(r"\D", "", req.day_phone or "")
    zip5  = re.sub(r"\D", "", req.zip or "")[:5]
    state = (req.state or "").strip().upper()[:2]

    # Validation — keep messages user-friendly; the form mirrors these rules.
    errors = []
    if not req.first_name.strip():            errors.append("First name is required")
    if not req.last_name.strip():             errors.append("Last name is required")
    if len(ssn) != 9:                          errors.append("SSN must be 9 digits")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", req.dob or ""): errors.append("Date of birth must be YYYY-MM-DD")
    if len(phone) != 10:                       errors.append("Phone must be 10 digits")
    if not req.address1.strip():              errors.append("Address is required")
    if not req.city.strip():                  errors.append("City is required")
    if len(state) != 2:                        errors.append("State must be a 2-letter code")
    if len(zip5) != 5:                         errors.append("ZIP must be 5 digits")
    if errors:
        raise HTTPException(status_code=422, detail="; ".join(errors))

    try:
        conn = _get_db()
    except Exception as e:
        log.error("create_donor: DB unavailable: %s", e)
        raise HTTPException(status_code=503, detail="Database unavailable — cannot save profile")

    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO candidates
                   (first_name, last_name, ssn, dob, day_phone, email,
                    address1, city, state, zip, other_id, other_id_type)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (req.first_name.strip(), req.last_name.strip(), ssn, req.dob, phone,
                 (req.email or "").strip() or None, req.address1.strip(), req.city.strip(),
                 state, zip5, (req.other_id or "").strip() or None,
                 (req.other_id_type or "").strip().upper()[:1] or None),
            )
            new_id = cur.lastrowid
        conn.commit()
        conn.close()
        log.info("create_donor: inserted candidate id=%s (%s %s)", new_id, req.first_name, req.last_name)
    except Exception as e:
        log.error("create_donor: insert failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save profile")

    return _load_donor_full(new_id)


@app.post("/api/chat")
async def chat(req: ChatRequest):
    donor = _load_donor_full(req.donor_id)
    if not donor:
        donors = _load_donors()
        donor = next((d for d in donors if d["id"] == req.donor_id), donors[0])
    log.info("Chat request | donor=%s %s | message=%r", donor["first_name"], donor["last_name"], req.user_message[:80])
    test_types = _load_test_types()
    system_prompt = build_system_prompt(redact_donor_for_llm(donor), test_types)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]
    result = await run_turn(messages, system_prompt, req.donor_id, mcp_manager, existing_clinics=req.clinics)
    return result


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest, request: Request):
    """Streaming SSE endpoint — primary path for the UI."""
    donor = _load_donor_full(req.donor_id)
    if not donor:
        donors = _load_donors()
        donor = next((d for d in donors if d["id"] == req.donor_id), donors[0])
    log.info("Chat (stream) | donor=%s %s | message=%r", donor["first_name"], donor["last_name"], req.user_message[:80])
    test_types = _load_test_types()
    system_prompt = build_system_prompt(redact_donor_for_llm(donor), test_types)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]

    async def event_generator():
        try:
            async for event in run_turn_stream(messages, system_prompt, req.donor_id, mcp_manager, existing_clinics=req.clinics):
                if await request.is_disconnected():
                    log.info("Client disconnected — stopping stream")
                    break
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            log.error("Stream error: %s", exc, exc_info=True)
            yield f"data: {json.dumps({'event': 'error', 'data': {'message': str(exc)}})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


class AnalyticsChatRequest(BaseModel):
    messages: list[dict]
    user_message: str


@app.post("/api/analytics/chat")
async def analytics_chat(req: AnalyticsChatRequest):
    log.info("Analytics chat | client=%s | message=%r", CLIENT_ID, req.user_message[:80])
    system_prompt = build_analytics_prompt(CLIENT_ID)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]
    result = await run_analytics_turn(messages, system_prompt, mcp_manager)
    return result


class ConfirmBookingRequest(BaseModel):
    donor_id: int
    fingerprint: str   # idempotency token returned in the chat response


@app.post("/api/bookings/confirm")
async def confirm_booking(req: ConfirmBookingRequest):
    """
    Deterministic confirmation endpoint. The UI calls this when the user clicks
    Confirm. The LLM does NOT call place_order — only this endpoint does, and
    only when the per-donor state machine is in AWAITING_CONFIRMATION with a
    matching fingerprint.
    """
    from fastapi import HTTPException

    session = get_session(req.donor_id)
    ok, reason = session.can_place_order(req.fingerprint)
    if not ok:
        log.warning("[confirm] rejected donor=%d: %s", req.donor_id, reason)
        raise HTTPException(status_code=409, detail=f"Cannot confirm: {reason}")

    booking = dict(session.proposed or {})
    log.info("[confirm] placing order for donor=%d fingerprint=%s", req.donor_id, req.fingerprint)

    # Map the proposed booking to place_order arguments.
    # MCP tool requires: clinic_id (int), donor_id, service_identifier, reason_for_test
    try:
        clinic_id_val = int(booking.get("site_id", 0))
    except (TypeError, ValueError):
        clinic_id_val = 0
    args = {
        "donor_id":           req.donor_id,
        "clinic_id":          clinic_id_val,
        "service_identifier": booking.get("service_identifier", ""),
        "reason_for_test":    booking.get("reason", ""),
    }
    try:
        result = await mcp_manager.call_tool("place_order", args)
    except Exception as e:
        log.error("[confirm] place_order MCP call failed: %s", e)
        raise HTTPException(status_code=502, detail=f"place_order failed: {e}")

    if not isinstance(result, dict):
        raise HTTPException(status_code=502, detail="place_order returned malformed payload")

    # eScreen rejects some clinics for a given service (e.g. "Service Currently Not Supported").
    # Return a 422 with a user-friendly message so the frontend can surface it.
    if not result.get("success", True):
        errors = result.get("errors", [])
        raw_err = errors[0] if errors else "Booking was declined by the collection site."
        if "not supported" in raw_err.lower() or "service" in raw_err.lower():
            user_msg = "This clinic doesn't support online booking for this service. Please select a different clinic."
        else:
            user_msg = f"Booking declined: {raw_err}"
        log.warning("[confirm] place_order rejected: %s", raw_err)
        raise HTTPException(status_code=422, detail=user_msg)

    reg_id = result.get("registration_id") or result.get("registrationId") or ""
    if not reg_id:
        raise HTTPException(status_code=502, detail="place_order returned no registration_id")

    session.mark_confirmed(reg_id)

    return {
        "registration_id":    reg_id,
        "scheduled_time":     result.get("scheduled_time", ""),
        "appointment_window": result.get("appointment_window", ""),
        "state":              session.state.value,
    }


@app.post("/api/bookings/reset")
async def reset_booking_session(donor_id: int):
    reset_session(donor_id)
    return {"ok": True, "state": State.IDLE.value}


class BookingAuditRequest(BaseModel):
    donor_id:        int | None = None
    registrationId:  str
    candidate:       str | None = None
    testType:        str | None = None
    reason:          str | None = None
    preferredDate:   str | None = None
    clinic:          str | None = None
    address:         str | None = None
    zip:             str | None = None
    transcript:      list[dict] | None = None  # full message history at time of booking
    fingerprint:     str | None = None         # idempotency token used at confirm


@app.post("/api/bookings")
async def record_booking(req: BookingAuditRequest):
    try:
        conn = _get_db()
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO bookings
                   (registration_id, donor_id, candidate, test_type, reason, preferred_date,
                    clinic, address, zip, transcript, fingerprint)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (req.registrationId, req.donor_id, req.candidate, req.testType,
                 req.reason, req.preferredDate, req.clinic, req.address, req.zip,
                 json.dumps(req.transcript) if req.transcript else None,
                 req.fingerprint),
            )
        conn.commit()
        conn.close()
        log.info("Booking audit saved: %s (transcript: %d msgs)",
                 req.registrationId, len(req.transcript or []))
    except Exception as e:
        log.warning("Failed to save booking audit: %s", e)
    return {"ok": True}
