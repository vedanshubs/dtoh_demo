import os
from server import mcp
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    mcp.run(
        transport="sse",
        host="0.0.0.0",
        port=int(os.getenv("MCP_PORT", "8010")),
    )
