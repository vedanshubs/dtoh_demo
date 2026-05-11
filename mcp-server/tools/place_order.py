import logging
from mocks.booking import mock_booking_response

log = logging.getLogger(__name__)


async def handle_place_order(
    clinic_id: int,
    donor_id: int,
    service_identifier: str,
    reason_for_test: str,
    use_mock: bool,
) -> dict:
    if use_mock:
        return mock_booking_response(clinic_id)
    from db.candidates import get_candidate
    from soap.register_event import register_scheduled_event
    try:
        donor = await get_candidate(donor_id)
        return await register_scheduled_event(clinic_id, donor, service_identifier, reason_for_test)
    except Exception as exc:
        log.error("RegisterScheduledEvent failed: %s", exc)
        return {"success": False, "registration_id": None, "errors": [str(exc)]}
