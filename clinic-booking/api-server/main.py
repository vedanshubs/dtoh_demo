import logging
import os
import pymysql
import pymysql.cursors
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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


# Full mock donor profiles (used when DB is unavailable) — includes SSN/DOB for profile card
_MOCK_DONORS_FULL = [
    {"id": 1,  "first_name": "James",   "last_name": "Hartley",  "ssn": "312445678", "dob": "1988-04-12", "day_phone": "2125550101", "email": "james.hartley@example.com",  "address1": "245 Park Ave, Apt 12B",     "city": "New York",     "state": "NY", "zip": "10017", "other_id": "DL-NY-8812345",  "other_id_type": "D", "role": "Analyst"},
    {"id": 2,  "first_name": "Sofia",   "last_name": "Morales",  "ssn": "423556789", "dob": "1992-09-23", "day_phone": "2015550202", "email": "sofia.morales@example.com",  "address1": "88 Hudson St, Apt 3",       "city": "Jersey City",  "state": "NJ", "zip": "07302", "other_id": "PP-US-23456789", "other_id_type": "P", "role": "Associate"},
    {"id": 3,  "first_name": "Marcus",  "last_name": "Webb",     "ssn": "534667890", "dob": "1985-11-07", "day_phone": "2015550303", "email": "marcus.webb@example.com",    "address1": "300 Hackensack Ave, Apt 5", "city": "Kearny",       "state": "NJ", "zip": "07032", "other_id": "DL-NJ-5534567",  "other_id_type": "D", "role": "Manager"},
    {"id": 4,  "first_name": "Priya",   "last_name": "Nair",     "ssn": "645778901", "dob": "1995-02-14", "day_phone": "2125550404", "email": "priya.nair@example.com",     "address1": "140 W 57th St, Apt 6A",     "city": "New York",     "state": "NY", "zip": "10019", "other_id": "EMP-UBS-00412",  "other_id_type": "E", "role": "VP"},
    {"id": 5,  "first_name": "Daniel",  "last_name": "Okoye",    "ssn": "756889012", "dob": "1990-06-30", "day_phone": "2015550505", "email": "daniel.okoye@example.com",   "address1": "800 Boulevard East, Apt 2", "city": "Weehawken",    "state": "NJ", "zip": "07086", "other_id": "DL-NJ-7756789",  "other_id_type": "D", "role": "Analyst"},
    {"id": 6,  "first_name": "Rachel",  "last_name": "Kim",      "ssn": "867990123", "dob": "1993-08-18", "day_phone": "2125550606", "email": "rachel.kim@example.com",     "address1": "211 E 53rd St, Apt 4D",     "city": "New York",     "state": "NY", "zip": "10022", "other_id": "PP-US-34567890", "other_id_type": "P", "role": "Associate"},
    {"id": 7,  "first_name": "Tom",     "last_name": "Bruckner", "ssn": "978001234", "dob": "1983-03-22", "day_phone": "9145550707", "email": "tom.bruckner@example.com",   "address1": "1 Mamaroneck Ave, Apt 8B",  "city": "White Plains", "state": "NY", "zip": "10601", "other_id": "DL-NY-9978012",  "other_id_type": "D", "role": "Director"},
    {"id": 8,  "first_name": "Amara",   "last_name": "Diallo",   "ssn": "189112345", "dob": "1997-12-05", "day_phone": "2125550808", "email": "amara.diallo@example.com",   "address1": "75 Varick St, Fl 3",        "city": "New York",     "state": "NY", "zip": "10013", "other_id": "EMP-UBS-00837",  "other_id_type": "E", "role": "Analyst"},
    {"id": 9,  "first_name": "Wei",     "last_name": "Zhang",    "ssn": "290223456", "dob": "1989-07-16", "day_phone": "2015550909", "email": "wei.zhang@example.com",      "address1": "700 Park Ave, Apt 12",      "city": "Hoboken",      "state": "NJ", "zip": "07030", "other_id": "DL-NJ-2290234",  "other_id_type": "D", "role": "Associate"},
    {"id": 10, "first_name": "Natasha", "last_name": "Petrov",   "ssn": "301334567", "dob": "1991-04-29", "day_phone": "9145551010", "email": "natasha.petrov@example.com", "address1": "515 North Ave, Apt 5C",     "city": "New Rochelle", "state": "NY", "zip": "10801", "other_id": "PP-US-45678901", "other_id_type": "P", "role": "Manager"},
]

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting MCP server subprocess...")
    await mcp_manager.start()
    log.info("MCP server ready")
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


@app.post("/api/chat")
async def chat(req: ChatRequest):
    donors = _load_donors()
    donor = next((d for d in donors if d["id"] == req.donor_id), donors[0])
    log.info("Chat request | donor=%s %s | message=%r", donor["first_name"], donor["last_name"], req.user_message[:80])
    system_prompt = build_system_prompt(donor, MOCK_TEST_TYPES)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]
    result = await run_turn(messages, system_prompt, req.donor_id, mcp_manager)
    return result


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
