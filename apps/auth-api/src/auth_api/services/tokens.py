"""Mint and verify JWT access tokens; manage opaque refresh tokens."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from jose import jwt
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from auth_api.models import Session as SessionModel
from auth_api.settings import settings


def mint_access_jwt(user_id: UUID, roles: list[str], locale: str = "uz") -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "roles": roles,
        "locale": locale,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=settings.AUTH_ACCESS_TOKEN_TTL_SECONDS)).timestamp()),
        "iss": settings.AUTH_JWT_ISSUER,
        "aud": settings.AUTH_JWT_AUDIENCE,
    }
    return jwt.encode(payload, settings.AUTH_JWT_SECRET, algorithm=settings.AUTH_JWT_ALGORITHM)


def hash_refresh(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def gen_refresh_token() -> str:
    """256-bit URL-safe random."""
    return secrets.token_urlsafe(32)


def gen_csrf_token() -> str:
    return secrets.token_urlsafe(24)


async def create_session(
    db: AsyncSession,
    *,
    user_id: UUID,
    user_agent: str | None,
    ip: str | None,
) -> tuple[str, SessionModel]:
    """Returns (raw_refresh, session_model). Persist session_model.

    Caller commits the transaction.
    """
    raw = gen_refresh_token()
    sess = SessionModel(
        id=uuid4(),
        user_id=user_id,
        refresh_token_hash=hash_refresh(raw),
        user_agent=user_agent,
        ip=ip,
        expires_at=datetime.now(UTC) + timedelta(seconds=settings.AUTH_REFRESH_TOKEN_TTL_SECONDS),
    )
    db.add(sess)
    return raw, sess


async def revoke_user_sessions(db: AsyncSession, user_id: UUID) -> None:
    """Chain detection — revoke all sessions when reused refresh detected."""
    await db.execute(
        update(SessionModel)
        .where(SessionModel.user_id == user_id, SessionModel.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
