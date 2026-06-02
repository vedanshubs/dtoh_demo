import logging
import os
import pymysql
from soap.register_event import register_scheduled_event

log = logging.getLogger(__name__)


def _get_donor(donor_id: int) -> dict | None:
    try:
        conn = pymysql.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "escreen"),
            password=os.getenv("DB_PASSWORD", "escreen"),
            database=os.getenv("DB_NAME", "escreen"),
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
        )
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, first_name, last_name, ssn, dob, day_phone, "
                    "email, address1, city, state, zip FROM candidates WHERE id = %s",
                    (donor_id,),
                )
                row = cur.fetchone()
                if row:
                    row["dob"] = str(row["dob"]) if row["dob"] else ""
                return row
    except Exception as exc:
        log.error("DB error fetching donor %s: %s", donor_id, exc)
        return None


async def handle_place_order(
    clinic_id: int,
    donor_id: int,
    service_identifier: str,
    reason_for_test: str,
    use_mock: bool = False,
) -> dict:
    if use_mock:
        from mocks.booking import mock_booking_response
        return mock_booking_response(clinic_id)

    donor = _get_donor(donor_id)
    if not donor:
        return {
            "success": False,
            "registration_id": None,
            "confirmation_code": None,
            "errors": [f"Donor ID {donor_id} not found in database"],
        }

    log.info("Placing order for donor_id=%s (%s %s) at clinic_id=%s",
             donor_id, donor.get("first_name"), donor.get("last_name"), clinic_id)

    return await register_scheduled_event(
        clinic_id=clinic_id,
        donor=donor,
        service_identifier=service_identifier,
        reason_for_test=reason_for_test,
    )
