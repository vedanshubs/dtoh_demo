import os
import logging
import secrets
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from soap.client import soap_post

log = logging.getLogger(__name__)

_SOAP_ACTION = "http://www.eScreen.com/Eis/IEis/RegisterScheduledEvent"

_ENVELOPE = """\
<soapenv:Envelope
    xmlns:esc="http://schemas.datacontract.org/2004/07/eScreen.WebServiceHelper.Model"
    xmlns:eis1="http://schemas.datacontract.org/2004/07/EisBusinessModels.Model.Request"
    xmlns:eis2="http://schemas.datacontract.org/2004/07/EisBusinessModels.Model.Common"
    xmlns:eis="http://www.eScreen.com/Eis"
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <eis:RegisterScheduledEvent>
      <eis:request>
        <eis1:PartnerInformation>
          <esc:UserName>{username}</esc:UserName>
          <esc:Password>{password}</esc:Password>
        </eis1:PartnerInformation>
        <eis1:ClientInformation>
          <eis2:ClientIdentificationType>ElectronicClientId</eis2:ClientIdentificationType>
          <eis2:ElectronicClientId>{electronic_client_id}</eis2:ElectronicClientId>
        </eis1:ClientInformation>
        <eis1:Participant>
          <eis2:FirstName>{first_name}</eis2:FirstName>
          <eis2:LastName>{last_name}</eis2:LastName>
          <eis2:SSN>{ssn}</eis2:SSN>
          <eis2:DayPhone>{day_phone}</eis2:DayPhone>
          <eis2:DateOfBirth>{dob}</eis2:DateOfBirth>
          <eis2:ExternalDonorId>{external_donor_id}</eis2:ExternalDonorId>
          <eis2:Address1>{address1}</eis2:Address1>
          <eis2:City>{city}</eis2:City>
          <eis2:State>{state}</eis2:State>
          <eis2:PostalCode>{postal_code}</eis2:PostalCode>
        </eis1:Participant>
        <eis1:ServicesToBePerformed>
          <eis2:Services>
            <eis2:Service>
              <eis2:ServiceIdentifier>{service_identifier}</eis2:ServiceIdentifier>
            </eis2:Service>
          </eis2:Services>
          <eis2:OccHealthReasonForService>{reason_for_test}</eis2:OccHealthReasonForService>
        </eis1:ServicesToBePerformed>
        <eis1:CollectionSiteId>{collection_site_id}</eis1:CollectionSiteId>
        <eis1:EventSettings>
          <eis2:EventSetting>
            <eis2:SettingName>StartDate</eis2:SettingName>
            <eis2:SettingValue>{start_date}</eis2:SettingValue>
          </eis2:EventSetting>
          <eis2:EventSetting>
            <eis2:SettingName>ExpirationDate</eis2:SettingName>
            <eis2:SettingValue>{expiry_date}</eis2:SettingValue>
          </eis2:EventSetting>
          <eis2:EventSetting>
            <eis2:SettingName>AutoEmail</eis2:SettingName>
            <eis2:SettingValue>true</eis2:SettingValue>
          </eis2:EventSetting>
          <eis2:EventSetting>
            <eis2:SettingName>NoExpirationOnPassport</eis2:SettingName>
            <eis2:SettingValue>False</eis2:SettingValue>
          </eis2:EventSetting>
          <eis2:EventSetting>
            <eis2:SettingName>AllowSevenDays</eis2:SettingName>
            <eis2:SettingValue>False</eis2:SettingValue>
          </eis2:EventSetting>
        </eis1:EventSettings>
      </eis:request>
    </eis:RegisterScheduledEvent>
  </soapenv:Body>
</soapenv:Envelope>"""


def _format_ssn(ssn: str) -> str:
    digits = ssn.replace("-", "").replace(" ", "")
    if len(digits) == 9:
        return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}"
    return ssn


def _format_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        return f"({digits[:3]}){digits[3:6]}-{digits[6:]}"
    return phone


def _generate_external_donor_id() -> str:
    return secrets.token_hex(10).upper()


def _parse_response(xml_text: str) -> dict:
    """Parse the eScreenData XML response from RegisterScheduledEvent."""
    try:
        root = ET.fromstring(xml_text)

        # The response may be inside a SOAP envelope or returned directly
        # as eScreenData. Handle both.
        pr = None
        for elem in root.iter():
            local = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
            if local == "PhysicalResult":
                pr = elem
                break

        if pr is None:
            log.warning("PhysicalResult not found in response:\n%s", xml_text[:500])
            return {"success": False, "registration_id": None, "confirmation_code": None, "errors": ["PhysicalResult missing in response"]}

        def t(tag):
            el = pr.find(tag)
            if el is None:
                for child in pr:
                    if child.tag.split("}")[-1] == tag:
                        return child.text or ""
            return el.text or "" if el is not None else ""

        physical_id = t("PhysicalID")
        if not physical_id:
            return {"success": False, "registration_id": None, "confirmation_code": None, "errors": ["No PhysicalID in response"]}

        return {
            "success": True,
            "registration_id": physical_id,
            "confirmation_code": t("ConfirmationNumber"),
            "status": t("OverallStatusDescription"),
            "clinic_name": t("ClinicName"),
            "clinic_address": t("ClinicAddress1"),
            "clinic_city": t("ClinicCity"),
            "clinic_state": t("ClinicState"),
            "clinic_phone": t("CollectionSitePhoneNumber"),
            "external_donor_id": t("ExternalDonorID"),
            "errors": [],
        }
    except ET.ParseError as exc:
        log.error("XML parse error: %s\nResponse: %s", exc, xml_text[:500])
        return {"success": False, "registration_id": None, "confirmation_code": None, "errors": [str(exc)]}


async def register_scheduled_event(
    clinic_id: int,
    donor: dict,
    service_identifier: str,
    reason_for_test: str,
) -> dict:
    today = datetime.now()
    start_date  = today.strftime("%Y-%m-%dT00:00")
    expiry_date = (today + timedelta(days=5)).strftime("%Y-%m-%dT23:59")

    body = _ENVELOPE.format(
        username=os.environ["ESCREEN_USERNAME"],
        password=os.environ["ESCREEN_PASSWORD"],
        electronic_client_id=os.environ["ESCREEN_ELECTRONIC_CLIENT_ID"],
        first_name=donor["first_name"],
        last_name=donor["last_name"],
        ssn=_format_ssn(donor.get("ssn", "000-00-0000")),
        day_phone=_format_phone(donor.get("day_phone", "")),
        dob=str(donor.get("dob", "") or ""),
        external_donor_id=_generate_external_donor_id(),
        address1=donor.get("address1", ""),
        city=donor.get("city", ""),
        state=donor.get("state", ""),
        postal_code=donor.get("zip", ""),
        service_identifier=service_identifier,
        reason_for_test=reason_for_test,
        collection_site_id=clinic_id,
        start_date=start_date,
        expiry_date=expiry_date,
    )

    log.info(
        "RegisterScheduledEvent → clinic_id=%s donor=%s %s service=%s reason=%s",
        clinic_id, donor.get("first_name"), donor.get("last_name"), service_identifier, reason_for_test,
    )
    xml_response = soap_post(_SOAP_ACTION, body)
    result = _parse_response(xml_response)
    log.info(
        "RegisterScheduledEvent ← success=%s registration_id=%s confirmation=%s",
        result.get("success"), result.get("registration_id"), result.get("confirmation_code"),
    )
    return result


def _format_ssn(ssn: str) -> str:
    """Ensure SSN is formatted as XXX-XX-XXXX."""
    digits = ssn.replace("-", "").replace(" ", "")
    if len(digits) == 9:
        return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}"
    return ssn


def _format_phone(phone: str) -> str:
    """Ensure phone is formatted as (XXX)XXX-XXXX."""
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        return f"({digits[:3]}){digits[3:6]}-{digits[6:]}"
    return phone


def _generate_external_donor_id() -> str:
    """Generate a random 20-character uppercase hex donor ID."""
    return secrets.token_hex(10).upper()


def _parse_physical_result(response) -> dict:
    """
    Parse RegisterScheduledEvent response.
    zeep may return the eScreenData payload as a raw XML string or as a structured object.
    """
    # Try structured object path first (zeep sometimes wraps the response)
    try:
        if hasattr(response, "PhysicalResult"):
            pr = response.PhysicalResult
            return {
                "success": True,
                "registration_id": str(pr.PhysicalID),
                "confirmation_code": str(pr.ConfirmationNumber),
                "status": str(pr.OverallStatusDescription),
                "clinic_name": str(pr.ClinicName or ""),
                "clinic_address": str(pr.ClinicAddress1 or ""),
                "clinic_city": str(pr.ClinicCity or ""),
                "clinic_state": str(pr.ClinicState or ""),
                "external_donor_id": str(pr.ExternalDonorID or ""),
                "errors": [],
            }
    except Exception:
        pass

    # Fall back to XML string parsing (eScreenData envelope)
    try:
        raw = str(response)
        root = ET.fromstring(raw)
        ns = {"e": ""}
        # Strip namespace if present
        pr = root.find("PhysicalResult") or root.find(".//{*}PhysicalResult")
        if pr is not None:
            def _text(tag):
                el = pr.find(tag) or pr.find(f"{{*}}{tag}")
                return el.text or "" if el is not None else ""
            physical_id = _text("PhysicalID")
            if physical_id:
                return {
                    "success": True,
                    "registration_id": physical_id,
                    "confirmation_code": _text("ConfirmationNumber"),
                    "status": _text("OverallStatusDescription"),
                    "clinic_name": _text("ClinicName"),
                    "clinic_address": _text("ClinicAddress1"),
                    "clinic_city": _text("ClinicCity"),
                    "clinic_state": _text("ClinicState"),
                    "external_donor_id": _text("ExternalDonorID"),
                    "errors": [],
                }
    except Exception as exc:
        log.warning("XML parse fallback failed: %s", exc)

    return {"success": False, "registration_id": None, "confirmation_code": None, "errors": ["Unexpected response format"]}


async def register_scheduled_event(
    clinic_id: int,
    donor: dict,
    service_identifier: str,
    reason_for_test: str,
) -> dict:
    client = get_soap_client()

    today = datetime.now()
    start_date = today.strftime("%Y-%m-%dT00:00")
    expiry_date = (today + timedelta(days=5)).strftime("%Y-%m-%dT23:59")

    request = {
        "PartnerInformation": {
            "UserName": os.environ["ESCREEN_USERNAME"],
            "Password": os.environ["ESCREEN_PASSWORD"],
        },
        "ClientInformation": {
            "ClientIdentificationType": "ElectronicClientId",
            "ElectronicClientId": os.environ["ESCREEN_ELECTRONIC_CLIENT_ID"],
        },
        "Participant": {
            "FirstName": donor["first_name"],
            "LastName": donor["last_name"],
            "SSN": _format_ssn(donor.get("ssn", "000-00-0000")),
            "DayPhone": _format_phone(donor.get("day_phone", "")),
            "DateOfBirth": str(donor.get("dob", "")) or None,
            "ExternalDonorId": _generate_external_donor_id(),
            "Address1": donor.get("address1", ""),
            "City": donor.get("city", ""),
            "State": donor.get("state", ""),
            "PostalCode": donor.get("zip", ""),
        },
        "ServicesToBePerformed": {
            "Services": {
                "Service": [{"ServiceIdentifier": service_identifier}]
            },
            "OccHealthReasonForService": reason_for_test,
        },
        "CollectionSiteId": clinic_id,
        "EventSettings": {
            "EventSetting": [
                {"SettingName": "StartDate",               "SettingValue": start_date},
                {"SettingName": "ExpirationDate",          "SettingValue": expiry_date},
                {"SettingName": "AutoEmail",               "SettingValue": "true"},
                {"SettingName": "NoExpirationOnPassport",  "SettingValue": "False"},
                {"SettingName": "AllowSevenDays",          "SettingValue": "False"},
            ]
        },
    }

    log.info(
        "RegisterScheduledEvent → clinic_id=%s donor=%s %s service=%s reason=%s",
        clinic_id, donor.get("first_name"), donor.get("last_name"), service_identifier, reason_for_test,
    )
    response = client.service.RegisterScheduledEvent(request=request)
    result = _parse_physical_result(response)
    log.info(
        "RegisterScheduledEvent ← success=%s registration_id=%s confirmation=%s",
        result.get("success"), result.get("registration_id"), result.get("confirmation_code"),
    )
    return result
