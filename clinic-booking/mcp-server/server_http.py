import os
from mcp.server.transport_security import TransportSecuritySettings
from server import mcp
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    mcp.settings.host = "0.0.0.0"
    mcp.settings.port = int(os.getenv("MCP_PORT", "8010"))
    mcp.settings.transport_security = TransportSecuritySettings(enable_dns_rebinding_protection=False)
    mcp.run(transport="streamable-http")
