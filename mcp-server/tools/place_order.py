from mocks.booking import mock_booking_response


async def handle_place_order(
    clinic_id: int,
    donor_id: int,
    service_identifier: str,
    reason_for_test: str,
) -> dict:
    return mock_booking_response(clinic_id)
