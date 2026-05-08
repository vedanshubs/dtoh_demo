import json
import os
import pathlib
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Absolute path to api-server directory — works regardless of cwd
_HERE = pathlib.Path(__file__).resolve().parent.parent  # api-server/
_MCP_SERVER = _HERE.parent / "mcp-server"


class MCPClientManager:
    def __init__(self):
        self._session = None
        self._context = None
        self._read = None
        self._write = None

    async def start(self):
        server_path = os.getenv("MCP_SERVER_PATH") or str(_MCP_SERVER / "server.py")
        python_bin = os.getenv("MCP_PYTHON") or str(_MCP_SERVER / "venv" / "bin" / "python")
        server_params = StdioServerParameters(
            command=python_bin,
            args=[server_path],
            env={**os.environ},
        )
        self._context = stdio_client(server_params)
        self._read, self._write = await self._context.__aenter__()
        self._session = ClientSession(self._read, self._write)
        await self._session.__aenter__()
        await self._session.initialize()

    async def stop(self):
        if self._session:
            await self._session.__aexit__(None, None, None)
        if self._context:
            await self._context.__aexit__(None, None, None)

    async def list_tools(self):
        result = await self._session.list_tools()
        return result.tools

    async def call_tool(self, name: str, arguments: dict):
        result = await self._session.call_tool(name, arguments)
        return json.loads(result.content[0].text)
