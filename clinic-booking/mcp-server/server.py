import logging
import os
import sys
from mcp.server.fastmcp import FastMCP
from tools.search_clinics import handle_search_clinics
from tools.place_order import handle_place_order
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(asctime)s [MCP:clinic-booking] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

mcp = FastMCP("clinic-booking")
USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"
log.info("Server starting (USE_MOCK=%s)", USE_MOCK)


@mcp.tool()
async def search_clinics(zipcode: str, radius: float, service_identifier: str) -> list[dict]:
    """Search for drug test collection clinics near a zip code.
    Returns a list of clinic objects with address, distance, attributes, and Google Maps URL."""
    log.info("search_clinics(zipcode=%s, radius=%s, service=%s)", zipcode, radius, service_identifier)
    result = await handle_search_clinics(zipcode, radius, service_identifier, USE_MOCK)
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
    result = await handle_place_order(clinic_id, donor_id, service_identifier, reason_for_test, USE_MOCK)
    log.info("place_order result: success=%s, registration_id=%s", result.get("success"), result.get("registration_id"))
    return result


if __name__ == "__main__":
    mcp.run()
