"""Quick connectivity test for the real eScreen SOAP API.
Run from mcp-server/ with the venv python:
    .venv\\Scripts\\python.exe test_escreen_reachable.py
"""
import asyncio
import socket
import ssl
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from soap.client import SOAP_URL, _load_pfx_as_pem  # noqa: E402
from soap.get_collection_sites import get_collection_sites  # noqa: E402


def check_tcp_tls():
    host = SOAP_URL.split("//", 1)[1].split("/", 1)[0]
    print(f"[1/3] TCP+TLS to {host}:443 ... ", end="", flush=True)
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, 443), timeout=10) as raw:
            with ctx.wrap_socket(raw, server_hostname=host) as tls:
                peer = tls.getpeercert()
                cn = next((v for k, v in (peer.get("subject") or [[]])[0] if k == "commonName"), "?")
                print(f"OK (peer CN={cn})")
                return True
    except Exception as e:
        print(f"FAIL ({type(e).__name__}: {e})")
        return False


def check_pfx():
    print("[2/3] Load PFX client cert ... ", end="", flush=True)
    try:
        _load_pfx_as_pem()
        from soap.client import _pem_cert_file
        if _pem_cert_file is None:
            print("SKIPPED (no PFX configured)")
            return False
        print("OK")
        return True
    except Exception as e:
        print(f"FAIL ({type(e).__name__}: {e})")
        return False


async def check_soap_call():
    print("[3/3] GetCollectionSites (real SOAP call, zip=10004, radius=5) ... ", end="", flush=True)
    t0 = time.perf_counter()
    try:
        result = await get_collection_sites("10004", 5.0, "1001")
        dt = time.perf_counter() - t0
        n = len(result) if isinstance(result, list) else "?"
        print(f"OK ({n} sites in {dt:.1f}s)")
        if isinstance(result, list) and result:
            first = result[0]
            sample = {k: first.get(k) for k in ("SiteName", "EscreenSiteId", "City", "State", "ZipCode")}
            print(f"      sample[0]: {sample}")
        return True
    except Exception as e:
        dt = time.perf_counter() - t0
        print(f"FAIL after {dt:.1f}s ({type(e).__name__}: {e})")
        return False


async def main():
    ok = check_tcp_tls()
    if not ok:
        sys.exit(1)
    check_pfx()
    await check_soap_call()


if __name__ == "__main__":
    asyncio.run(main())
