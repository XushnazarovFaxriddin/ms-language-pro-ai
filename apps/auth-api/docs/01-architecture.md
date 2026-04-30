# 01 — Architecture

## Layers (kichik FastAPI servis)
```
src/auth_api/
├── api/v1/             # routers
│   ├── auth.py         # login, register, refresh, logout
│   ├── me.py           # /me, /me PATCH
│   ├── oauth.py        # /oauth/google/start, /callback
│   └── admin.py        # /admin/api-keys (superadmin)
├── domain/
│   ├── user.py
│   ├── session.py
│   └── tokens.py
├── services/
│   ├── password.py     # argon2 hash + verify
│   ├── tokens.py       # JWT mint + verify, refresh rotation
│   ├── oauth.py        # OAuth state + callback
│   └── api_keys.py
├── adapters/
│   └── db/             # SQLAlchemy
├── schemas/
├── settings.py
└── main.py
```

## Login flow
```
1. POST /v1/login {email, password}
2. service: lookup user, verify Argon2 hash
3. service: mint access JWT (HS256, 15min, claims {sub, roles, locale, exp, iat, iss, aud})
4. service: generate refresh (256-bit hex), store hash in sessions
5. response: Set-Cookie: lp_access=...; ...
              Set-Cookie: lp_refresh=...; Path=/auth/v1/refresh
              Set-Cookie: lp_csrf=...; HttpOnly=false (JS reads it)
6. body: {user: {id, email, roles, locale}}
```

## Refresh flow (atomic rotation)
```
1. POST /v1/refresh (cookie attached)
2. SELECT FROM sessions WHERE refresh_hash = $1 AND revoked_at IS NULL
   FOR UPDATE  -- atomic
3. UPDATE sessions SET revoked_at = now() WHERE id = $1
4. Generate new refresh, INSERT new session
5. Mint new access JWT
6. Set new cookies, 200 OK
```

If refresh hash already revoked → suspicious; revoke ALL user sessions (chain detection).

## OAuth (Google)
1. `GET /v1/oauth/google/start?redirect_uri=` → redirect to Google with state cookie
2. Google → `GET /v1/oauth/google/callback?code=&state=`
3. Verify state, exchange code for tokens
4. Get user info; upsert into users + oauth_accounts
5. Mint cookies (same as login)

## Verifying tokens (other services use this pattern)
Other FastAPI services don't call auth-api. They verify JWT locally with shared `AUTH_JWT_SECRET`:
```python
# python/languagepro_common/auth.py
async def get_current_user(request: Request) -> User:
    token = request.cookies.get("lp_access")
    if not token: raise Unauthorized()
    payload = jwt.decode(token, settings.AUTH_JWT_SECRET, algorithms=["HS256"],
                        audience="aiexam.uz", issuer="auth.aiexam.uz")
    return User(id=payload["sub"], roles=payload["roles"], locale=payload["locale"])
```

## Acceptance
- [ ] Register + login + /me round trip works
- [ ] Cookies set with correct flags (HttpOnly, Secure, SameSite)
- [ ] Refresh rotation: old refresh becomes invalid after use
- [ ] Concurrent refresh attempts: only one succeeds (FOR UPDATE)
- [ ] Chain detection: re-using revoked refresh revokes all user sessions
- [ ] OAuth Google flow completes
- [ ] JWT verification works in other services (data-engine-api, exam-platform-api)
