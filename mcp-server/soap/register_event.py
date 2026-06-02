import os
import logging
import secrets
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from soap.client import soap_post

log = logging.getLogger(__name__)

_SOAP_ACTION = "http://www.eScreen.com/Eis/IEis/RegisterScheduledEvent"

# VendorId for eScreen = 3 (always sent before the panel code)
_VENDOR_ID = "3"

_REASON_MAP = {
    "PE": ("PreEmp",          "PreEmployment"),
    "RA": ("Random",          "Random"),
    "PA": ("PostAccident",    "PostAccident"),
    "RD": ("ReturnToDuty",    "ReturnToDuty"),
    "FU": ("FollowUp",        "FollowUp"),
    "RS": ("ReasonableSusp",  "ReasonableSuspicion"),
    "PM": ("PrePromotion",    "PrePromotion"),
    "PR": ("Periodic",        "Periodic"),
    "TR": ("Transfer",        "Transfer"),
}

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
              <eis2:ServiceIdentifier>{vendor_id}</eis2:ServiceIdentifier>
              <eis2:ServiceIdentifier>{service_identifier}</eis2:ServiceIdentifier>
            </eis2:Service>
          </eis2:Services>
          <eis2:DrugReasonForTest>{drug_reason}</eis2:DrugReasonForTest>
          <eis2:OccHealthReasonForService>{occ_reason}</eis2:OccHealthReasonForService>
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


def _parse_response(xml_text: str) -> dict:
    try:
        root = ET.fromstring(xml_text)
        pr = None
        for elem in root.iter():
            local = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
            if local == "PhysicalResult":
                pr = elem
                break

        if pr is None:
            log.warning("PhysicalResult not found in response:\n%s", xml_text[:800])
            return {
                "success": False,
                "registration_id": None,
                "confirmation_code": None,
                "errors": ["PhysicalResult missing in response"],
                "raw_response": xml_text[:800],
            }

        def t(tag):
            for child in pr:
                local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if local == tag:
                    return child.text or ""
            return ""

        physical_id = t("PhysicalID")
        if not physical_id:
            return {
                "success": False,
                "registration_id": None,
                "confirmation_code": None,
                "errors": ["No PhysicalID in response"],
                "raw_response": xml_text[:800],
            }

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
    drug_reason, occ_reason = _REASON_MAP.get(reason_for_test, ("PreEmp", "PreEmployment"))

    today = datetime.now()
    start_date  = today.strftime("%Y-%m-%dT00:00:00")
    expiry_date = (today + timedelta(days=5)).strftime("%Y-%m-%dT23:59:59")

    body = _ENVELOPE.format(
        username=os.environ["ESCREEN_USERNAME"],
        password=os.environ["ESCREEN_PASSWORD"],
        electronic_client_id=os.environ["ESCREEN_ELECTRONIC_CLIENT_ID"],
        first_name=donor["first_name"],
        last_name=donor["last_name"],
        ssn=_format_ssn(donor.get("ssn", "000000000")),
        day_phone=_format_phone(donor.get("day_phone", "")),
        dob=str(donor.get("dob", "") or ""),
        external_donor_id=secrets.token_hex(10).upper(),
        address1=donor.get("address1", ""),
        city=donor.get("city", ""),
        state=donor.get("state", ""),
        postal_code=donor.get("zip", ""),
        vendor_id=_VENDOR_ID,
        service_identifier=service_identifier,
        drug_reason=drug_reason,
        occ_reason=occ_reason,
        collection_site_id=clinic_id,
        start_date=start_date,
        expiry_date=expiry_date,
    )

    log.info(
        "RegisterScheduledEvent → clinic_id=%s donor=%s %s service=%s reason=%s/%s",
        clinic_id, donor.get("first_name"), donor.get("last_name"),
        service_identifier, drug_reason, occ_reason,
    )
    xml_response = soap_post(_SOAP_ACTION, body)
    result = _parse_response(xml_response)
    log.info(
        "RegisterScheduledEvent ← success=%s registration_id=%s confirmation=%s",
        result.get("success"), result.get("registration_id"), result.get("confirmation_code"),
    )
    return result
