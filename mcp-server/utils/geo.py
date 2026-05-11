import json
from math import atan2, cos, radians, sin, sqrt
from pathlib import Path
from functools import lru_cache

_ZIPCODES_PATH = Path(__file__).parent.parent / "mocks" / "zipcodes.json"


@lru_cache(maxsize=1)
def _load_zipcodes() -> dict:
    return json.loads(_ZIPCODES_PATH.read_text())


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def centroid_for_zip(zipcode: str) -> dict | None:
    return _load_zipcodes().get(zipcode)
