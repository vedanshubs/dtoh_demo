import os
from zeep import Client
from zeep.transports import Transport
import requests

WSDL_URL = "https://test.escreen.com/EIS/EIS.svc?wsdl"

_client = None


def get_soap_client() -> Client:
    global _client
    if _client is None:
        session = requests.Session()
        transport = Transport(session=session)
        _client = Client(WSDL_URL, transport=transport)
    return _client
