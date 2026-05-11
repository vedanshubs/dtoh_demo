import json
from functools import lru_cache
from pathlib import Path

_PATH = Path(__file__).parent / "clinics.json"


@lru_cache(maxsize=1)
def load_clinics() -> list:
    return json.loads(_PATH.read_text())
