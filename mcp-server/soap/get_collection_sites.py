# Real eScreen SOAP call removed — system uses mock data only.
# This file is retained as a placeholder for future integration
# once IP allowlisting is granted by eScreen.


log = logging.getLogger(__name__)

_SOAP_ACTION = "http://www.eScreen.com/Eis/IEis/GetCollectionSites"

_ENVELOPE = """\
<soapenv:Envelope
    xmlns:esc="http://schemas.datacontract.org/2004/07/eScreen.WebServiceHelper.Model"
    xmlns:eis1="http://schemas.datacontract.org/2004/07/EisBusinessModels.Model.Request"
    xmlns:eis2="http://schemas.datacontract.org/2004/07/EisBusinessModels.Model.Common"
    xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays"
    xmlns:eis="http://www.eScreen.com/Eis"
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <eis:GetCollectionSites>
      <eis:request>
        <eis1:AssociatedOnly>0</eis1:AssociatedOnly>
        <eis1:ClientInformation>
          <eis2:ClientIdentificationType>ElectronicClientId</eis2:ClientIdentificationType>
          <eis2:ElectronicClientId>{electronic_client_id}</eis2:ElectronicClientId>
        </eis1:ClientInformation>
        <eis1:LocationDetails>
          <eis2:DistanceMeasureType>1</eis2:DistanceMeasureType>
          <eis2:SearchRadius>{radius}</eis2:SearchRadius>
          <eis2:ZipCode>{zipcode}</eis2:ZipCode>
        </eis1:LocationDetails>
        <eis2:CustomPanel>{custom_panel}</eis2:CustomPanel>
        <eis1:PartnerInformation>
          <esc:Password>{password}</esc:Password>
          <esc:UserName>{username}</esc:UserName>
        </eis1:PartnerInformation>
        <eis1:ServiceIdentifiers>
          <arr:string>{service_identifier}</arr:string>
        </eis1:ServiceIdentifiers>
      </eis:request>
    </eis:GetCollectionSites>
  </soapenv:Body>
</soapenv:Envelope>"""


def _text(el, tag):
    """Get text of a child element by local name, stripping namespace."""
    child = el.find(tag) or el.find(f"{{*}}{tag}")
    if child is None:
        # wildcard namespace search
        for c in el:
            local = c.tag.split("}")[-1] if "}" in c.tag else c.tag
            if local == tag:
                return c.text or ""
    return child.text or "" if child is not None else ""


def _parse_sites(xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    # Find all CollectionSite elements regardless of namespace
    sites_out = []
    for site_el in root.iter("{http://schemas.datacontract.org/2004/07/EisBusinessModels.Model.Common}CollectionSite"):
        attrs = []
        attrs_parent = site_el.find("{http://schemas.datacontract.org/2004/07/EisBusinessModels.Model.Common}Attributes")
        if attrs_parent is not None:
            for attr_el in attrs_parent:
                name_el = attr_el.find("{http://schemas.datacontract.org/2004/07/EisBusinessModels.Model.Common}AttributeName")
                val_el  = attr_el.find("{http://schemas.datacontract.org/2004/07/EisBusinessModels.Model.Common}AttributeValue")
                if name_el is not None:
                    attrs.append({
                        "AttributeName":  name_el.text or "",
                        "AttributeValue": val_el.text or "" if val_el is not None else "",
                    })

        def t(tag):
            return _text(site_el, tag)

        ns = "http://schemas.datacontract.org/2004/07/EisBusinessModels.Model.Common"
        def ns_text(tag):
            el = site_el.find(f"{{{ns}}}{tag}")
            return el.text or "" if (el is not None and el.text) else ""

        lat = float(ns_text("Latitude") or 0)
        lng = float(ns_text("Longitude") or 0)

        sites_out.append({
            "EscreenSiteId":    int(ns_text("EscreenSiteId") or 0),
            "SiteName":         ns_text("SiteName"),
            "Address1":         ns_text("Address1"),
            "Address2":         ns_text("Address2"),
            "City":             ns_text("City"),
            "State":            ns_text("State"),
            "ZipCode":          ns_text("ZipCode"),
            "PhoneNumber":      ns_text("PhoneNumber"),
            "FaxNumber":        ns_text("FaxNumber"),
            "Latitude":         lat,
            "Longitude":        lng,
            "Distance":         float(ns_text("Distance") or 0),
            "IsDrugPreferred":  ns_text("IsDrugPreferred").lower() == "true",
            "OccHealthNetwork": ns_text("OccHealthNetwork"),
            "Attributes":       attrs,
            "GoogleMapsUrl":    f"https://www.google.com/maps?q={lat},{lng}",
        })
    return sites_out


async def get_collection_sites(zipcode: str, radius: float, service_identifier: str) -> list[dict]:
    body = _ENVELOPE.format(
        electronic_client_id=os.environ["ESCREEN_ELECTRONIC_CLIENT_ID"],
        radius=int(radius),
        zipcode=zipcode,
        custom_panel=int(os.environ.get("ESCREEN_CUSTOM_PANEL", "725146")),
        password=os.environ["ESCREEN_PASSWORD"],
        username=os.environ["ESCREEN_USERNAME"],
        service_identifier=service_identifier,
    )

    log.info("GetCollectionSites → zipcode=%s radius=%s service=%s", zipcode, radius, service_identifier)
    xml_response = soap_post(_SOAP_ACTION, body)
    sites = _parse_sites(xml_response)
    log.info("GetCollectionSites ← %d sites returned", len(sites))
    return sites
