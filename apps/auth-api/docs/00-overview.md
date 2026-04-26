# 00 — Overview

## Nima qiladi
- Email + parol bilan ro'yxatga olish (Argon2id hash)
- Login → JWT access cookie + opaque refresh cookie
- Refresh token rotation
- Google OAuth (qo'shimcha)
- `/me` — joriy foydalanuvchi
- API key chiqarish (researcher uchun)
- RBAC ma'lumotlarini saqlash (rol, permission)

## Roles
- `student` (default)
- `examiner`
- `content_admin`
- `researcher`
- `superadmin`

## Schema
PostgreSQL `auth` schema. Jadvallar:
- `users` (id, email, password_hash, locale, ...)
- `roles`, `user_roles`
- `sessions` (refresh_token_hash, ua, ip, expires_at, revoked_at)
- `oauth_accounts` (provider, provider_user_id, ...)
- `api_keys` (name, hash, scopes jsonb, ...)

## Subdomain
`https://api.aiexam.uz/auth/v1/*`

## Stack
FastAPI 0.115+, SQLAlchemy 2.0 async, Pydantic v2, `argon2-cffi`, `python-jose` (JWT), `authlib` (OAuth).

## Cookie
- `__Host-lp_access` — 15 min, HS256 JWT
- `__Host-lp_refresh` — 30 days, opaque, in DB
- `__Host-lp_csrf` — session, double-submit token
- All `Domain=.aiexam.uz` (prod), `Domain=.localhost` (dev)
