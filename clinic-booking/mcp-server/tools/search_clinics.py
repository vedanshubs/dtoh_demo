from mocks.clinics import MOCK_CLINICS


async def handle_search_clinics(
    zipcode: str,
    radius: float,
    service_identifier: str,
    use_mock: bool,
) -> list[dict]:
    if use_mock:
        return MOCK_CLINICS
    # Phase 3: replace with SOAP call
    from soap.get_collection_sites import get_collection_sites
    return await get_collection_sites(zipcode, radius, service_identifier)
