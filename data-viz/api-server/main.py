import json
import logging
import os
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
from ai.conversation import run_turn
from ai.stream import run_turn_stream
from ai.prompts.system_prompt import build_system_prompt, build_tool_selection_prompt
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict]
    user_message: str


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Non-streaming fallback — kept for API docs and testing."""
    log.info("Chat request (non-stream) | client=%s | message=%r", CLIENT_ID, req.user_message[:80])
    system_prompt = build_system_prompt(CLIENT_ID)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]
    result = await run_turn(messages, system_prompt, mcp_manager)
    return result


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest, request: Request):
    """Streaming SSE endpoint — primary path for the UI."""
    log.info("Chat request (stream)  | client=%s | message=%r", CLIENT_ID, req.user_message[:80])
    system_prompt = build_system_prompt(CLIENT_ID)
    tool_selection_prompt = build_tool_selection_prompt(CLIENT_ID)
    messages = list(req.messages) + [{"role": "user", "content": req.user_message}]

    async def event_generator():
        try:
            async for event in run_turn_stream(messages, system_prompt, tool_selection_prompt, mcp_manager):
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
