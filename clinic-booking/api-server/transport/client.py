import json
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class MCPClientManager:
    def __init__(self):
        self._session = None
        self._context = None
        self._read = None
        self._write = None

    async def start(self):
        server_path = os.getenv("MCP_SERVER_PATH", "../mcp-server/server.py")
        server_params = StdioServerParameters(
            command="python",
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
