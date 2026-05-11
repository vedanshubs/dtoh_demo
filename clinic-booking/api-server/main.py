import logging
import os
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

MOCK_DONORS = [
    {"id": 1, "first_name": "James",   "last_name": "Harrington", "city": "New York",   "state": "NY", "zip": "10019", "role": "Analyst, Investment Banking"},
    {"id": 2, "first_name": "Priya",   "last_name": "Mehta",      "city": "New York",   "state": "NY", "zip": "10020", "role": "Associate, Wealth Management"},
    {"id": 3, "first_name": "Marcus",  "last_name": "Chen",       "city": "Hoboken",    "state": "NJ", "zip": "07030", "role": "VP, Technology"},
    {"id": 4, "first_name": "Sofia",   "last_name": "Rossi",      "city": "New York",   "state": "NY", "zip": "10022", "role": "Director, Compliance"},
    {"id": 5, "first_name": "Daniel",  "last_name": "Okafor",     "city": "Brooklyn",   "state": "NY", "zip": "11201", "role": "Analyst, Risk Management"},
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
    return MOCK_DONORS


@app.post("/api/chat")
async def chat(req: ChatRequest):
    donor = next((d for d in MOCK_DONORS if d["id"] == req.donor_id), MOCK_DONORS[0])
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
