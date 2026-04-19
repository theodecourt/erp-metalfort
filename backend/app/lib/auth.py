from __future__ import annotations

from typing import Literal

import jwt
from fastapi import Depends, Header, HTTPException, status

from app.config import settings
from app.lib.supabase import get_admin_client

Role = Literal["admin", "vendedor"]


def _decode(token: str) -> dict:
    try:
        return jwt.decode(
            token, settings.supabase_jwt_secret,
            algorithms=["HS256"], audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}")


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
