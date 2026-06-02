import logging
import os
import ssl
import tempfile
from pathlib import Path

import requests

SOAP_URL = "https://test.escreen.com/EIS/EIS.svc"

log = logging.getLogger(__name__)

_pem_cert_file = None
_pem_key_file  = None


def _load_pfx_as_pem():
    """Convert PFX to temporary PEM files for requests (called once on first use)."""
    global _pem_cert_file, _pem_key_file

    if _pem_cert_file is not None:
        return

    pfx_path = Path(os.getenv("ESCREEN_PFX_PATH", str(Path(__file__).parent.parent.parent / "UBS 2.pfx")))
    pfx_pass = os.getenv("ESCREEN_PFX_PASSPHRASE", "")

    if not pfx_path.exists():
        log.warning("PFX file not found at %s — SOAP calls will proceed without client cert", pfx_path)
        return

    try:
        from cryptography.hazmat.primitives.serialization import pkcs12, Encoding, PrivateFormat, NoEncryption
        pfx_data = pfx_path.read_bytes()
        passphrase = pfx_pass.encode() if pfx_pass else None
        private_key, certificate, _ = pkcs12.load_key_and_certificates(pfx_data, passphrase)

        cert_pem = certificate.public_bytes(Encoding.PEM)
        key_pem  = private_key.private_bytes(Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption())

        cert_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pem")
        cert_tmp.write(cert_pem)
        cert_tmp.flush()

        key_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pem")
        key_tmp.write(key_pem)
        key_tmp.flush()

        _pem_cert_file = cert_tmp.name
        _pem_key_file  = key_tmp.name
        log.info("Client certificate loaded from %s", pfx_path)

    except Exception as e:
        log.error("Failed to load PFX certificate: %s", e)
        raise


def soap_post(soap_action: str, body_xml: str) -> str:
    """
    Send a raw SOAP 1.1 request to the eScreen endpoint with mutual TLS.
    Returns the response body as a string.
    Raises requests.HTTPError on non-2xx responses.
    """
    _load_pfx_as_pem()

    headers = {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction":   f'"{soap_action}"',
    }

    cert = (_pem_cert_file, _pem_key_file) if _pem_cert_file else None

    log.debug("SOAP POST → %s  action=%s  cert=%s", SOAP_URL, soap_action, bool(cert))
    resp = requests.post(SOAP_URL, headers=headers, data=body_xml.encode("utf-8"), cert=cert, timeout=30)
    log.debug("SOAP response status=%s", resp.status_code)
    resp.raise_for_status()
    return resp.text
