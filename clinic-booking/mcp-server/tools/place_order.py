from mocks.booking import mock_booking_response


async def handle_place_order(
    clinic_id: int,
    donor_id: int,
    service_identifier: str,
    reason_for_test: str,
    use_mock: bool,
) -> dict:
    if use_mock:
        return mock_booking_response(clinic_id)
    # Phase 3: fetch donor from DB and call SOAP
    from db.candidates import get_candidate
    from soap.register_event import register_scheduled_event
    donor = await get_candidate(donor_id)
    return await register_scheduled_event(clinic_id, donor, service_identifier, reason_for_test)
