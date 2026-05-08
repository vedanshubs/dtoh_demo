def mock_booking_response(clinic_id: int) -> dict:
    return {
        "success": True,
        "registration_id": f"MOCK-REG-{clinic_id}-20260508",
        "errors": [],
    }
