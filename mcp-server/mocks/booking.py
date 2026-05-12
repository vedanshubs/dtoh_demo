import random
import string
from datetime import datetime


def mock_booking_response(clinic_id: int) -> dict:
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    date_str = datetime.now().strftime("%Y%m%d")
    return {
        "success": True,
        "registration_id": f"UBS-{date_str}-{clinic_id}-{suffix}",
        "confirmation_code": f"ES{suffix}",
        "clinic_id": clinic_id,
        "scheduled_date": datetime.now().strftime("%Y-%m-%d"),
        "scheduled_time": "8:00 AM – 5:00 PM",
        "instructions": (
            "Please arrive 10 minutes early. Bring a valid photo ID. "
            "Do not urinate for at least 2 hours before your appointment. "
            "Avoid excessive water intake."
        ),
        "errors": [],
    }
