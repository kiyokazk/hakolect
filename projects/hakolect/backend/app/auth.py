import os
from fastapi import Header, HTTPException
from typing import Optional


def get_api_key(x_api_key: Optional[str] = Header(default=None)) -> str:
    """
    Require a valid X-API-Key header. Returns 403 if missing or incorrect.
    Use as a FastAPI dependency for external/API-key-protected routes.
    """
    expected = os.getenv("API_KEY", "")
    if not expected:
        raise HTTPException(status_code=500, detail="API_KEY not configured on server")
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return x_api_key


def optional_api_key(x_api_key: Optional[str] = Header(default=None)) -> Optional[str]:
    """
    Optional API key check. Returns the key if provided and valid,
    None if no key is provided (browser session assumed), or raises 403 on wrong key.
    """
    expected = os.getenv("API_KEY", "")
    if x_api_key is None:
        return None  # browser session - let Caddy Basic Auth handle it
    if not expected or x_api_key != expected:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key
