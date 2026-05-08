import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from transport.client import MCPClientManager
from claude.conversation import run_turn
from claude.prompts.system_prompt import build_system_prompt
from rest_actions import register_action_routes

load_dotenv()

mcp_manager = MCPClientManager()

MOCK_DONORS = [
    {"id": 1, "first_name": "Alice", "last_name": "Smith", "city": "Chicago", "state": "IL", "zip": "60601"},
    {"id": 2, "first_name": "Bob", "last_name": "Jones", "city": "New York", "state": "NY", "zip": "10001"},
    {"id": 3, "first_name": "Carol", "last_name": "Lee", "city": "Los Angeles", "state": "CA", "zip": "90001"},
]

MOCK_TEST_TYPES = [
    {"name": "5-Panel Urine", "service_identifier": "5PANEL_U", "default_reason": "PE"},
    {"name": "10-Panel Urine", "service_identifier": "10PANEL_U", "default_reason": "PE"},
    {"name": "Hair Follicle 5-Panel", "service_identifier": "5PANEL_H", "default_reason": "PE"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mcp_manager.start()
    yield
    await mcp_manager.stop()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
    system_prompt = build_system_prompt(donor, MOCK_TEST_TYPES)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]
    result = await run_turn(messages, system_prompt, req.donor_id, mcp_manager)
    return result
