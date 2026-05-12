import os
import uvicorn
from starlette.middleware.cors import CORSMiddleware
from mcp.server.transport_security import TransportSecuritySettings
from server import mcp
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("MCP_PORT", "8010"))

mcp.settings.host = "0.0.0.0"
mcp.settings.port = PORT
mcp.settings.transport_security = TransportSecuritySettings(enable_dns_rebinding_protection=False)

# Get the inner FastMCP ASGI app (streamable-http transport)
_mcp_inner = mcp.streamable_http_app()

# Wrap with CORS as a direct ASGI middleware so OPTIONS preflights are
# intercepted before they ever reach the MCP handler.
# CORSMiddleware passes lifespan events straight through to _mcp_inner.
app = CORSMiddleware(
    app=_mcp_inner,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["mcp-session-id"],
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
