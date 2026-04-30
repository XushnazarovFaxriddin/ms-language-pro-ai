"""JWT verification (cookie-based) and S2S token verification.

Used by data-engine-api and exam-platform-api. auth-api owns issuing.
"""

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import Cookie, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel

from languagepro_common.errors import ForbiddenError, UnauthorizedError

AUTH_COOKIE_ACCESS = "lp_access"
AUTH_COOKIE_REFRESH = "lp_refresh"
AUTH_COOKIE_CSRF = "lp_csrf"

Role = Literal["student", "examiner", "content_admin", "researcher", "superadmin"]


class CurrentUser(BaseModel):
    id: UUID
    roles: list[Role]
    locale: Literal["uz", "en"] = "uz"


def make_get_current_user(
    secret: str,
    algorithm: str = "HS256",
    issuer: str = "auth.aiexam.uz",
    audience: str = "aiexam.uz",
):
    """Factory: creates the FastAPI dependency bound to service settings."""

    async def get_current_user(
        request: Request,
        access_token: Annotated[str | None, Cookie(alias=AUTH_COOKIE_ACCESS)] = None,
    ) -> CurrentUser:
        if not access_token:
            # Also support Authorization: Bearer for test clients
            auth_header = request.headers.get("authorization", "")
            if auth_header.lower().startswith("bearer "):
                access_token = auth_header[7:]
        if not access_token:
            raise UnauthorizedError("No access token")
        try:
            payload = jwt.decode(
                access_token,
                secret,
                algorithms=[algorithm],
                issuer=issuer,
                audience=audience,
            )
        except JWTError as e:
            raise UnauthorizedError(f"Invalid token: {e}") from e
        return CurrentUser(
            id=UUID(payload["sub"]),
            roles=payload.get("roles", ["student"]),
            locale=payload.get("locale", "uz"),
        )

    return get_current_user


def require_role(*allowed: Role):
    """Dependency factory: ensures current_user has at least one allowed role.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("content_admin"))])
    """

    async def _check() -> None:
        # NOTE: real wiring done in service-side `deps.py` because get_current_user
        # is constructed from settings. See apps/*/api/deps.py.
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "wire require_role in service deps.py",
        )

    return _check


# ----------------------------------------------------------------------------
# S2S tokens (exam-platform → data-engine)
# ----------------------------------------------------------------------------


def mint_s2s_token(
    *,
    secret: str,
    issuer: str,
    audience: str,
    scope: list[str],
    ttl_seconds: int = 300,
) -> str:
    now = datetime.now(UTC)
    payload = {
        "iss": issuer,
        "aud": audience,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=ttl_seconds)).timestamp()),
        "jti": str(uuid4()),
        "scope": scope,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def verify_s2s_token(
    token: str,
    *,
    secret: str,
    expected_issuer: str,
    expected_audience: str,
    required_scopes: list[str],
) -> dict:
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            issuer=expected_issuer,
            audience=expected_audience,
        )
    except JWTError as e:
        raise UnauthorizedError(f"Invalid S2S token: {e}") from e
    granted = set(payload.get("scope", []))
    missing = [s for s in required_scopes if s not in granted]
    if missing:
        raise ForbiddenError(f"S2S token missing scopes: {missing}")
    # TODO(prod): track jti in Redis for replay defense
    return payload
