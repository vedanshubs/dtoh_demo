import logging
import os
import sys
from mcp.server.fastmcp import FastMCP
from tools.search_clinics import handle_search_clinics
from tools.place_order import handle_place_order
from tools.get_results_summary import handle_get_results_summary
from tools.get_pipeline_status import handle_get_pipeline_status
from tools.get_analyte_breakdown import handle_get_analyte_breakdown
from tools.get_turnaround_stats import handle_get_turnaround_stats
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(asctime)s [MCP:unified] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

mcp = FastMCP("ubs-escreen")
CLIENT_ID = os.getenv("ESCREEN_CLIENT_ACCOUNT", "DEMO_CLIENT")
USE_MOCK = os.getenv("USE_MOCK", "true").lower() != "false"
log.info("Server starting (CLIENT_ID=%s, use_mock=%s)", CLIENT_ID, USE_MOCK)


# ── Clinic Booking Tools ──────────────────────────────────────────────────────

@mcp.tool()
async def search_clinics(zipcode: str, radius: float, service_identifier: str) -> list[dict]:
    """Search for drug test collection clinics near a zip code.
    Returns a list of clinic objects with address, distance, attributes, and Google Maps URL."""
    log.info("search_clinics(zipcode=%s, radius=%s, service=%s)", zipcode, radius, service_identifier)
    result = await handle_search_clinics(zipcode, radius, service_identifier)
    log.info("search_clinics returned %d clinics", len(result))
    return result


@mcp.tool()
async def place_order(
    clinic_id: int,
    donor_id: int,
    service_identifier: str,
    reason_for_test: str,
) -> dict:
    """Place a drug test booking at a clinic for a donor.
    Fetches donor PII server-side. Returns registration_id on success."""
    log.info("place_order(clinic_id=%s, donor_id=%s, service=%s, reason=%s)", clinic_id, donor_id, service_identifier, reason_for_test)
    result = await handle_place_order(clinic_id, donor_id, service_identifier, reason_for_test)
    log.info("place_order result: success=%s, registration_id=%s", result.get("success"), result.get("registration_id"))
    return result


# ── Data Visualization Tools ──────────────────────────────────────────────────

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
    log.info("get_results_summary(date_range=%s, disposition=%s)", date_range, disposition)
    result = await handle_get_results_summary(CLIENT_ID, date_range, disposition, reason_for_test, specimen_type, regulation, use_mock=USE_MOCK)
    log.info("get_results_summary → total=%s", result.get("total"))
    return result


@mcp.tool()
async def get_pipeline_status(
    date_range: str,
    status: str | None = None,
    reason_for_test: str | None = None,
) -> dict:
    """Get counts of drug tests currently in progress, grouped by pipeline stage."""
    log.info("get_pipeline_status(date_range=%s, status=%s)", date_range, status)
    result = await handle_get_pipeline_status(CLIENT_ID, date_range, status, reason_for_test, use_mock=USE_MOCK)
    log.info("get_pipeline_status → total_in_progress=%s", result.get("total_in_progress"))
    return result


@mcp.tool()
async def get_analyte_breakdown(
    date_range: str,
    analyte_name: str | None = None,
    disposition: str | None = None,
) -> dict:
    """Get per-substance positive/negative counts from analyte records."""
    log.info("get_analyte_breakdown(date_range=%s, analyte=%s)", date_range, analyte_name)
    result = await handle_get_analyte_breakdown(CLIENT_ID, date_range, analyte_name, disposition, use_mock=USE_MOCK)
    log.info("get_analyte_breakdown → %d analytes", len(result.get("analytes", [])))
    return result


@mcp.tool()
async def get_turnaround_stats(
    date_range: str,
    reason_for_test: str | None = None,
    specimen_type: str | None = None,
    regulation: str | None = None,
) -> dict:
    """Get average turnaround time statistics across all lifecycle stages."""
    log.info("get_turnaround_stats(date_range=%s)", date_range)
    result = await handle_get_turnaround_stats(CLIENT_ID, date_range, reason_for_test, specimen_type, regulation, use_mock=USE_MOCK)
    log.info("get_turnaround_stats → avg_end_to_end=%s days", result.get("avg_end_to_end_days"))
    return result


if __name__ == "__main__":
    mcp.run()
