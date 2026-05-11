from mocks.clinics import MOCK_CLINICS


async def handle_search_clinics(
    zipcode: str,
    radius: float,
    service_identifier: str,
) -> list[dict]:
    return MOCK_CLINICS
