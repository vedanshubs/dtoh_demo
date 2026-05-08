import os
from mcp.server.fastmcp import FastMCP
from tools.get_results_summary import handle_get_results_summary
from tools.get_pipeline_status import handle_get_pipeline_status
from tools.get_analyte_breakdown import handle_get_analyte_breakdown
from tools.get_turnaround_stats import handle_get_turnaround_stats
from dotenv import load_dotenv

load_dotenv()
mcp = FastMCP("data-viz")
USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"
CLIENT_ID = os.getenv("ESCREEN_CLIENT_ACCOUNT", "DEMO_CLIENT")


@mcp.tool()
async def get_results_summary(
    date_range: str,
    disposition: str | None = None,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
) -> dict:
    """Get completed drug test result counts grouped by disposition.
    date_range examples: 'last 30 days', 'last 90 days', 'last quarter', 'current year'."""
    return await handle_get_results_summary(CLIENT_ID, date_range, disposition, reason_for_test, specimen_type, regulation, USE_MOCK)


@mcp.tool()
async def get_pipeline_status(
    date_range: str,
    status: str | None = None,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
) -> dict:
    """Get counts of drug tests currently in progress, grouped by pipeline stage."""
    return await handle_get_pipeline_status(CLIENT_ID, date_range, status, reason_for_test, specimen_type, USE_MOCK)


@mcp.tool()
async def get_analyte_breakdown(
    date_range: str,
    analyte_name: str | None = None,
    disposition: str | None = None,
) -> dict:
    """Get per-substance positive/negative counts from analyte records."""
    return await handle_get_analyte_breakdown(CLIENT_ID, date_range, analyte_name, disposition, USE_MOCK)


@mcp.tool()
async def get_turnaround_stats(
    date_range: str,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
) -> dict:
    """Get average turnaround time statistics across all lifecycle stages."""
    return await handle_get_turnaround_stats(CLIENT_ID, date_range, reason_for_test, specimen_type, regulation, USE_MOCK)


if __name__ == "__main__":
    mcp.run()
