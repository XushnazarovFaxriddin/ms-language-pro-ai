from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Cookie, Depends
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from auth_api.api.cookies import ACCESS_COOKIE
from auth_api.db import get_session
from auth_api.schemas import MeUpdate, UserOut
from auth_api.services import users
from auth_api.settings import settings
from languagepro_common.errors import UnauthorizedError

router = APIRouter(tags=["me"])


async def _current_user_id(access_token: str | None) -> str:
    if not access_token:
        raise UnauthorizedError("No access token")
    try:
        payload = jwt.decode(
            access_token,
            settings.AUTH_JWT_SECRET,
            algorithms=[settings.AUTH_JWT_ALGORITHM],
            issuer=settings.AUTH_JWT_ISSUER,
            audience=settings.AUTH_JWT_AUDIENCE,
        )
    except JWTError as e:
        raise UnauthorizedError(f"Invalid token: {e}") from e
    return payload["sub"]


@router.get("/me", response_model=UserOut)
async def me(
    db: Annotated[AsyncSession, Depends(get_session)],
    access_token: Annotated[str | None, Cookie(alias=ACCESS_COOKIE)] = None,
) -> UserOut:
    user_id = await _current_user_id(access_token)
    from uuid import UUID

    user = await users.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise UnauthorizedError("User not found")
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        roles=users.user_role_codes(user),
        locale=user.locale,  # type: ignore[arg-type]
        created_at=user.created_at,
    )


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: MeUpdate,
    db: Annotated[AsyncSession, Depends(get_session)],
    access_token: Annotated[str | None, Cookie(alias=ACCESS_COOKIE)] = None,
) -> UserOut:
    user_id = await _current_user_id(access_token)
    from uuid import UUID

    user = await users.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise UnauthorizedError("User not found")
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.locale is not None:
        user.locale = body.locale
    await db.commit()
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        roles=users.user_role_codes(user),
        locale=user.locale,  # type: ignore[arg-type]
        created_at=user.created_at,
    )
