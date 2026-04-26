"""User CRUD + role management."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth_api.models import Role, User, UserRole


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(
        select(User).options(selectinload(User.user_roles).selectinload(UserRole.role)).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    password_hash: str | None,
    display_name: str | None = None,
    locale: str = "uz",
    role_codes: list[str] | None = None,
) -> User:
    user = User(
        email=email.lower().strip(),
        password_hash=password_hash,
        display_name=display_name,
        locale=locale,
    )
    db.add(user)
    await db.flush()
    role_codes = role_codes or ["student"]
    rows = await db.execute(select(Role).where(Role.code.in_(role_codes)))
    for role in rows.scalars().all():
        db.add(UserRole(user_id=user.id, role_id=role.id))
    await db.flush()
    return user


def user_role_codes(user: User) -> list[str]:
    return [ur.role.code for ur in user.user_roles]
