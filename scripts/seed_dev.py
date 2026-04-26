"""Seed dev data: demo admin user, demo content_admin, demo IELTS blueprint.

Idempotent. Run after migrations:
    uv run python scripts/seed_dev.py
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Allow running from repo root without install
sys.path.insert(0, "apps/auth-api/src")
sys.path.insert(0, "python/languagepro_common/src")

from auth_api.models import Role, User, UserRole  # noqa: E402
from auth_api.services import passwords  # noqa: E402
from auth_api.settings import settings  # noqa: E402


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    Sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async with Sessionmaker() as db:
        # Find roles
        roles = (await db.execute(select(Role))).scalars().all()
        role_by_code = {r.code: r for r in roles}

        await _ensure_user(
            db,
            email="admin@aiexam.uz",
            password="admin12345",
            display_name="Demo Admin",
            roles=[role_by_code["superadmin"], role_by_code["content_admin"]],
        )
        await _ensure_user(
            db,
            email="bobomurod@aiexam.uz",
            password="content12345",
            display_name="Bobomurod",
            roles=[role_by_code["content_admin"]],
        )
        await _ensure_user(
            db,
            email="faxriddin@aiexam.uz",
            password="content12345",
            display_name="Faxriddin",
            roles=[role_by_code["content_admin"]],
        )
        await _ensure_user(
            db,
            email="student@aiexam.uz",
            password="student12345",
            display_name="Demo Talaba",
            roles=[role_by_code["student"]],
        )

        await db.commit()
        print("✅ Seeded users:")
        print("   - admin@aiexam.uz / admin12345 (superadmin)")
        print("   - bobomurod@aiexam.uz / content12345 (content_admin)")
        print("   - faxriddin@aiexam.uz / content12345 (content_admin)")
        print("   - student@aiexam.uz / student12345 (student)")

    await engine.dispose()


async def _ensure_user(db, *, email: str, password: str, display_name: str, roles: list[Role]) -> None:
    existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing is not None:
        return
    user = User(
        email=email,
        password_hash=passwords.hash_password(password),
        display_name=display_name,
        locale="uz",
    )
    db.add(user)
    await db.flush()
    for role in roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))


if __name__ == "__main__":
    asyncio.run(main())
