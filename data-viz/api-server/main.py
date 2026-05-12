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
from ai.conversation import run_turn
from ai.prompts.system_prompt import build_system_prompt
from rest_actions import register_action_routes

load_dotenv()

mcp_manager = MCPClientManager()
CLIENT_ID = os.getenv("DEMO_CLIENT_ID", "DEMO_CLIENT")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting MCP server subprocess...")
    await mcp_manager.start()
    log.info("MCP server ready")
    yield
    log.info("Shutting down MCP server...")
    await mcp_manager.stop()


app = FastAPI(lifespan=lifespan)
register_action_routes(app, mcp_manager)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict]
    user_message: str


@app.post("/api/chat")
async def chat(req: ChatRequest):
    log.info("Chat request | client=%s | message=%r", CLIENT_ID, req.user_message[:80])
    system_prompt = build_system_prompt(CLIENT_ID)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]
    result = await run_turn(messages, system_prompt, mcp_manager)
    return result
