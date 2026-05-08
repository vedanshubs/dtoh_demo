import os
from soap.client import get_soap_client


async def register_scheduled_event(
    clinic_id: int,
    donor: dict,
    service_identifier: str,
    reason_for_test: str,
) -> dict:
    client = get_soap_client()
    request_data = {
        "PartnerID": os.environ["ESCREEN_PARTNER_ID"],
        "PartnerPassword": os.environ["ESCREEN_PARTNER_PASSWORD"],
        "ClientAccount": os.environ["ESCREEN_CLIENT_ACCOUNT"],
        "ClientSubAccount": os.environ["ESCREEN_CLIENT_SUB_ACCOUNT"],
        "ElectronicClientID": os.environ["ESCREEN_ELECTRONIC_CLIENT_ID"],
        "EscreenSiteId": clinic_id,
        "ServiceIdentifier": service_identifier,
        "ReasonForTest": reason_for_test,
        "FirstName": donor["first_name"],
        "LastName": donor["last_name"],
        "SSN": donor.get("ssn", ""),
        "DateOfBirth": str(donor.get("dob", "")),
        "DayPhone": donor.get("day_phone", ""),
        "EmailAddress": donor.get("email", ""),
        "Address1": donor.get("address1", ""),
        "City": donor.get("city", ""),
        "State": donor.get("state", ""),
        "ZipCode": donor.get("zip", ""),
    }
    response = client.service.RegisterScheduledEvent(**request_data)
    if response.RegistrationId:
        return {"success": True, "registration_id": response.RegistrationId, "errors": []}
    errors = [e.ErrorMessage for e in (response.Errors.Error or [])] if response.Errors else []
    return {"success": False, "registration_id": None, "errors": errors}
