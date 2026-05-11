import logging
import requests

SOAP_URL = "https://test.escreen.com/EIS/EIS.svc"

log = logging.getLogger(__name__)


def soap_post(soap_action: str, body_xml: str) -> str:
    """
    Send a raw SOAP 1.1 request to the eScreen endpoint.
    Returns the response body as a string.
    Raises requests.HTTPError on non-2xx responses.
    """
    headers = {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": soap_action,
    }
    log.debug("SOAP POST → %s  action=%s", SOAP_URL, soap_action)
    resp = requests.post(SOAP_URL, headers=headers, data=body_xml.encode("utf-8"), timeout=30)
    log.debug("SOAP response status=%s", resp.status_code)
    resp.raise_for_status()
    return resp.text
