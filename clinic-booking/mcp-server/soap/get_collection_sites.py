import os
from soap.client import get_soap_client


async def get_collection_sites(zipcode: str, radius: float, service_identifier: str) -> list[dict]:
    client = get_soap_client()
    request_data = {
        "PartnerID": os.environ["ESCREEN_PARTNER_ID"],
        "PartnerPassword": os.environ["ESCREEN_PARTNER_PASSWORD"],
        "ClientAccount": os.environ["ESCREEN_CLIENT_ACCOUNT"],
        "ClientSubAccount": os.environ["ESCREEN_CLIENT_SUB_ACCOUNT"],
        "ZipCode": zipcode,
        "Radius": int(radius),
        "ServiceIdentifier": service_identifier,
    }
    response = client.service.GetCollectionSites(**request_data)
    sites = []
    for site in (response.CollectionSites.CollectionSite or []):
        attrs = []
        if hasattr(site, "Attributes") and site.Attributes:
            for attr in (site.Attributes.SiteAttribute or []):
                attrs.append({"AttributeName": attr.AttributeName, "AttributeValue": attr.AttributeValue})
        sites.append({
            "EscreenSiteId": site.EscreenSiteId,
            "SiteName": site.SiteName,
            "Address1": site.Address1,
            "City": site.City,
            "State": site.State,
            "ZipCode": site.ZipCode,
            "PhoneNumber": site.PhoneNumber,
            "Latitude": float(site.Latitude or 0),
            "Longitude": float(site.Longitude or 0),
            "Distance": float(site.Distance or 0),
            "Attributes": attrs,
            "GoogleMapsUrl": f"https://www.google.com/maps?q={site.Latitude},{site.Longitude}",
        })
    return sites
