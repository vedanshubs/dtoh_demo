import logging
from mocks.clinics import MOCK_CLINICS

log = logging.getLogger(__name__)


async def handle_search_clinics(
    zipcode: str,
    radius: float,
    service_identifier: str,
    use_mock: bool,
) -> list[dict]:
    if use_mock:
        return MOCK_CLINICS
    from soap.get_collection_sites import get_collection_sites
    try:
        return await get_collection_sites(zipcode, radius, service_identifier)
    except Exception as exc:
        log.error("GetCollectionSites failed: %s", exc)
        return [{"error": True, "message": str(exc)}]
