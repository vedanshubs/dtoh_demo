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
CLIENT_ID = os.getenv("ESCREEN_CLIENT_ACCOUNT", "142451")

def _get_db():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "escreen"),
        password=os.getenv("DB_PASSWORD", "escreen"),
        database=os.getenv("DB_NAME", "escreen"),
        cursorclass=pymysql.cursors.DictCursor,
    )


def _load_donors():
    try:
        conn = _get_db()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, first_name, last_name, city, state, zip FROM candidates ORDER BY id"
            )
            return cur.fetchall()
    except Exception as e:
        log.warning("DB unavailable, falling back to mock donors: %s", e)
        return [
            {"id": 1, "first_name": "James",   "last_name": "Hartley",  "city": "New York",    "state": "NY", "zip": "10017"},
            {"id": 2, "first_name": "Sofia",   "last_name": "Morales",  "city": "Jersey City", "state": "NJ", "zip": "07302"},
            {"id": 3, "first_name": "Marcus",  "last_name": "Webb",     "city": "Kearny",      "state": "NJ", "zip": "07032"},
            {"id": 4, "first_name": "Priya",   "last_name": "Nair",     "city": "New York",    "state": "NY", "zip": "10019"},
            {"id": 5, "first_name": "Daniel",  "last_name": "Okoye",    "city": "Weehawken",   "state": "NJ", "zip": "07086"},
            {"id": 6, "first_name": "Rachel",  "last_name": "Kim",      "city": "New York",    "state": "NY", "zip": "10022"},
            {"id": 7, "first_name": "Tom",     "last_name": "Bruckner", "city": "White Plains","state": "NY", "zip": "10601"},
            {"id": 8, "first_name": "Amara",   "last_name": "Diallo",   "city": "New York",    "state": "NY", "zip": "10013"},
            {"id": 9, "first_name": "Wei",     "last_name": "Zhang",    "city": "Hoboken",     "state": "NJ", "zip": "07030"},
            {"id": 10,"first_name": "Natasha", "last_name": "Petrov",   "city": "New Rochelle","state": "NY", "zip": "10801"},
        ]

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
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
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
