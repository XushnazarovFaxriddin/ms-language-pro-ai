"""Login, register, refresh, logout."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth_api.api.cookies import (
    REFRESH_COOKIE,
    clear_session_cookies,
    set_session_cookies,
)
from auth_api.db import get_session
from auth_api.models import Session as SessionModel
from auth_api.schemas import LoginRequest, LoginResponse, RegisterRequest, UserOut
from auth_api.services import passwords, tokens, users
from languagepro_common.errors import ConflictError, UnauthorizedError

router = APIRouter(tags=["auth"])


def _user_out(user) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        roles=users.user_role_codes(user),
        locale=user.locale,  # type: ignore[arg-type]
        created_at=user.created_at,
    )


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> LoginResponse:
    existing = await users.get_user_by_email(db, body.email)
    if existing:
        raise ConflictError("Email already registered")
    user = await users.create_user(
        db,
        email=body.email,
        password_hash=passwords.hash_password(body.password),
        display_name=body.display_name,
        locale=body.locale,
        role_codes=["student"],
    )
    raw_refresh, _ = await tokens.create_session(
        db,
        user_id=user.id,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    await db.commit()

    role_codes = users.user_role_codes(user)
    access = tokens.mint_access_jwt(user.id, role_codes, user.locale)
    set_session_cookies(
        response,
        access_jwt=access,
        refresh_token=raw_refresh,
        csrf_token=tokens.gen_csrf_token(),
    )
    return LoginResponse(user=_user_out(user))


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> LoginResponse:
    user = await users.get_user_by_email(db, body.email)
    if user is None or user.password_hash is None:
        raise UnauthorizedError("Invalid credentials")
    if not passwords.verify_password(body.password, user.password_hash):
        raise UnauthorizedError("Invalid credentials")
    if not user.is_active:
        raise UnauthorizedError("Account disabled")

    raw_refresh, _ = await tokens.create_session(
        db,
        user_id=user.id,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    await db.commit()

    role_codes = users.user_role_codes(user)
    access = tokens.mint_access_jwt(user.id, role_codes, user.locale)
    set_session_cookies(
        response,
        access_jwt=access,
        refresh_token=raw_refresh,
        csrf_token=tokens.gen_csrf_token(),
    )
    return LoginResponse(user=_user_out(user))


@router.post("/refresh", response_model=LoginResponse)
async def refresh(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_session)],
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> LoginResponse:
    if not refresh_token:
        raise UnauthorizedError("No refresh token")

    refresh_hash = tokens.hash_refresh(refresh_token)
    sess_row = (
        await db.execute(
            select(SessionModel)
            .where(SessionModel.refresh_token_hash == refresh_hash)
            .with_for_update()
        )
    ).scalar_one_or_none()

    if sess_row is None:
        raise UnauthorizedError("Invalid refresh token")

    if sess_row.revoked_at is not None:
        # Replay! Chain detection: revoke all of user's sessions.
        await tokens.revoke_user_sessions(db, sess_row.user_id)
        await db.commit()
        clear_session_cookies(response)
        raise UnauthorizedError("Refresh token replay detected; sessions revoked")

    if sess_row.expires_at < datetime.now(UTC):
        raise UnauthorizedError("Refresh token expired")

    user = await users.get_user_by_id(db, sess_row.user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("User inactive")

    sess_row.revoked_at = datetime.now(UTC)
    raw_refresh, _ = await tokens.create_session(
        db,
        user_id=user.id,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    await db.commit()

    role_codes = users.user_role_codes(user)
    access = tokens.mint_access_jwt(user.id, role_codes, user.locale)
    set_session_cookies(
        response,
        access_jwt=access,
        refresh_token=raw_refresh,
        csrf_token=tokens.gen_csrf_token(),
    )
    return LoginResponse(user=_user_out(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_session)],
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> None:
    if refresh_token:
        refresh_hash = tokens.hash_refresh(refresh_token)
        await db.execute(
            select(SessionModel)
            .where(SessionModel.refresh_token_hash == refresh_hash)
            .with_for_update()
        )
        sess = (
            await db.execute(
                select(SessionModel).where(SessionModel.refresh_token_hash == refresh_hash)
            )
        ).scalar_one_or_none()
        if sess and sess.revoked_at is None:
            sess.revoked_at = datetime.now(UTC)
            await db.commit()
    clear_session_cookies(response)
