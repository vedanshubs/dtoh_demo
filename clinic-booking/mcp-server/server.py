import os
from mcp.server.fastmcp import FastMCP
from tools.search_clinics import handle_search_clinics
from tools.place_order import handle_place_order
from dotenv import load_dotenv

load_dotenv()
mcp = FastMCP("clinic-booking")
USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"


@mcp.tool()
async def search_clinics(zipcode: str, radius: float, service_identifier: str) -> list[dict]:
    """Search for drug test collection clinics near a zip code.
    Returns a list of clinic objects with address, distance, attributes, and Google Maps URL."""
    return await handle_search_clinics(zipcode, radius, service_identifier, USE_MOCK)


@mcp.tool()
async def place_order(
    clinic_id: int,
    donor_id: int,
    service_identifier: str,
    reason_for_test: str,
) -> dict:
    """Place a drug test booking at a clinic for a donor.
    Fetches donor PII server-side. Returns registration_id on success."""
    return await handle_place_order(clinic_id, donor_id, service_identifier, reason_for_test, USE_MOCK)


if __name__ == "__main__":
    mcp.run()
