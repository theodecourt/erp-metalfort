from __future__ import annotations

from typing import Literal

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

from app.config import settings
from app.lib.supabase import get_admin_client

Role = Literal["admin", "vendedor"]

_jwks_client: PyJWKClient | None = None

_ASYMMETRIC_ALGORITHMS = {"RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA"}


def _jwks() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = settings.supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(url)
    return _jwks_client


def _decode(token: str) -> dict:
    try:
        alg = jwt.get_unverified_header(token).get("alg", "HS256")
        if alg == "HS256":
            return jwt.decode(
                token, settings.supabase_jwt_secret,
                algorithms=["HS256"], audience="authenticated",
            )
        if alg not in _ASYMMETRIC_ALGORITHMS:
            raise jwt.InvalidAlgorithmError(f"Unsupported algorithm: {alg}")
        key = _jwks().get_signing_key_from_jwt(token).key
        return jwt.decode(
            token, key,
            algorithms=[alg], audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")


def current_user(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    payload = _decode(token)
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing sub")
    sb = get_admin_client()
    res = sb.table("usuario_interno").select("*").eq("id", uid).limit(1).execute()
    rows = res.data or []
    if not rows or not rows[0]["ativo"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "User not authorized")
    return rows[0]


def require_role(*allowed: Role):
    def _dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Role not allowed")
        return user
    return _dep
