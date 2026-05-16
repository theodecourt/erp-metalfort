from __future__ import annotations

from typing import Literal

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

from app.config import settings
from app.lib.supabase import get_admin_client

Role = Literal["admin", "vendedor"]

_jwks_client: PyJWKClient | None = None


def _jwks() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = settings.supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(url)
    return _jwks_client


# Algoritmos aceitos. Limitamos explicitamente para evitar bugs de algorithm
# confusion: o header `alg` e controlado pelo emissor do token, entao nunca
# passamos esse valor cru para `algorithms=[...]` do PyJWT.
_ASYMMETRIC_ALGS = ("ES256", "RS256")
_SYMMETRIC_ALGS = ("HS256",)


def _decode(token: str) -> dict:
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg in _SYMMETRIC_ALGS:
            # Supabase legacy: assinatura simetrica com o JWT secret.
            return jwt.decode(
                token, settings.supabase_jwt_secret,
                algorithms=list(_SYMMETRIC_ALGS), audience="authenticated",
            )
        if alg in _ASYMMETRIC_ALGS:
            # Supabase moderno: chave publica via JWKS.
            key = _jwks().get_signing_key_from_jwt(token).key
            return jwt.decode(
                token, key,
                algorithms=list(_ASYMMETRIC_ALGS), audience="authenticated",
            )
        # alg desconhecido (ou "none") nunca chega ate aqui sem cair em 401.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
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
