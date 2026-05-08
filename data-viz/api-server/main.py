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
CLIENT_ID = os.getenv("DEMO_CLIENT_ID", "DEMO_CLIENT")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await mcp_manager.start()
    yield
    await mcp_manager.stop()


app = FastAPI(lifespan=lifespan)
register_action_routes(app, mcp_manager)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict]
    user_message: str


@app.post("/api/chat")
async def chat(req: ChatRequest):
    system_prompt = build_system_prompt(CLIENT_ID)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]
    result = await run_turn(messages, system_prompt, mcp_manager)
    return result
