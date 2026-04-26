# 05 — Auth & RBAC

> **TL;DR.** `auth-api` issues HS256 JWT access cookies (15 min) + opaque rotating refresh cookies (30 days). Session cookies use `Domain=.aiexam.uz` apex so subdomains share session. Other services verify JWTs locally — they never call auth-api. East-west traffic between `exam-api` ↔ `data-api` uses 5-min S2S JWTs with explicit `scope[]`. RBAC has 5 roles; entitlement checks (e.g. "can use writing scoring") happen at the API boundary using a single helper.

---

## 1. Identity primitives

### Cookies

| Cookie | TTL | Path | SameSite | HttpOnly | Notes |
|---|---|---|---|---|---|
| `lp_access` | 15 min | `/` | `Lax` | yes | HS256 JWT |
| `lp_refresh` | 30 days | `/auth/v1/refresh` | `Strict` | yes | Opaque random; hash stored in DB |
| `lp_csrf` | session | `/` | `Lax` | **no** (JS reads it) | Double-submit token |

In production, `Domain=.aiexam.uz`, `Secure=true`. In dev, `Domain=.localhost`, `Secure=false`.
Do not use the `__Host-` prefix for these cookies: that prefix forbids an explicit
`Domain` attribute, so it is incompatible with the required cross-subdomain session.
When calling `auth-api` through Caddy at `api.aiexam.uz/auth/v1/*`, set
`AUTH_REFRESH_COOKIE_PATH=/auth/v1/refresh`; direct local service calls may use
`/v1/refresh`.

### Access JWT payload

```json
{
  "sub": "user-uuid",
  "roles": ["student", "content_admin"],
  "locale": "uz",
  "iat": 1714060800,
  "exp": 1714061700,
  "iss": "auth.aiexam.uz",
  "aud": "aiexam.uz"
}
```

Signed with `AUTH_JWT_SECRET` (≥ 32 bytes hex). Rotated quarterly with overlapping `kid` headers (Phase 5; for v1 single key is fine).

### Refresh tokens

256-bit URL-safe random (`secrets.token_urlsafe(32)`). Hashed (SHA-256) and stored in `auth.sessions(refresh_token_hash, user_id, ua, ip, expires_at, revoked_at)`. **Single-use rotation**: every refresh creates a new row and revokes the old.

Replay detection: if a refresh token already marked `revoked_at IS NOT NULL` is presented, **all** active sessions for that user are revoked (chain detection).

### CSRF token

Generated on login, set as a non-HttpOnly cookie. Frontend reads it from `document.cookie` and adds `X-CSRF-Token: <value>` to every mutating request. Server compares header to cookie. Mismatch → 403.

---

## 2. Roles

| Role | Description |
|---|---|
| `student` | default for all signups; can take exams, see own results |
| `examiner` | + access human review queue, override LLM grades |
| `content_admin` | + question/bank CRUD, generation jobs, prompt management |
| `researcher` | + read-only `/exports/*.csv`, mints API keys for scripts |
| `superadmin` | + role grants, LLM config, billing overrides |

Roles are **additive**: a user can have many. JWT `roles[]` is the union.

---

## 3. RBAC matrix (highlights)

| Action | student | examiner | content_admin | researcher | superadmin |
|---|---|---|---|---|---|
| Take an attempt | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own results | ✓ | ✓ | ✓ | ✓ | ✓ |
| View any user's results | — | ✓ | — | — | ✓ |
| Create a question bank | — | — | ✓ | — | ✓ |
| Run question generation | — | — | ✓ | — | ✓ |
| Override an LLM grade | — | ✓ | ✓ | — | ✓ |
| Edit prompt templates | — | — | ✓ | — | ✓ |
| Edit `runtime_config` | — | — | — | — | ✓ |
| Mint researcher API key | — | — | — | — | ✓ |
| View `analytics.llm_calls` | — | — | ✓ | ✓ | ✓ |
| Set LLM monthly budget | — | — | — | — | ✓ |
| Issue entitlement override | — | — | — | — | ✓ |
| Verify a certificate by public id | ✓ (public, no auth) | ✓ | ✓ | ✓ | ✓ |

Implementation: `Depends(require_role("content_admin", "superadmin"))` in routers.

---

## 4. S2S authentication (exam-api ↔ data-api)

When `exam-api` calls `data-api`, it mints a fresh JWT per request (or per minute, cached):

```python
def mint_s2s(scopes: list[str]) -> str:
    now = datetime.now(UTC)
    return jwt.encode({
        "iss": "exam-platform",
        "aud": "data-engine",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=300)).timestamp()),
        "jti": str(uuid4()),
        "scope": scopes,
    }, settings.S2S_SHARED_SECRET, algorithm="HS256")
```

`data-api` validates:

- Signature with `S2S_SHARED_SECRET`
- `iss == "exam-platform"`, `aud == "data-engine"`
- `exp` not past
- All required scopes present in `scope[]`
- `jti` not already seen (Redis SET, TTL = `exp + 30s`) — replay defense

Available scopes (per [`02-architecture.md`](02-architecture.md) §5):

`items:next, items:read, items:key, rubrics:read, blueprints:read, responses:write`

**No browser ever sends an S2S token.** If `data-api` sees an S2S JWT on a request that arrived through Caddy from a public IP (no `X-Forwarded-Internal` header), it rejects.

---

## 5. API key auth (researchers)

```http
Authorization: Bearer lp_pk_5f3a7c9b1e2d4f6a8b0c2d4e6f8a0b1c
```

Stored as **Argon2id hash** in `auth.api_keys.key_hash`. Plain key shown to user **once** at creation. Scopes stored as TEXT[]. Last-used timestamp updated on each successful call.

Default scope set: `analytics:read`. Future: `attempts:read` (read-only public API), `webhooks:write` (push score events back to LMS).

Rate limit: 60 req/min per key. Revocation: set `revoked_at`.

---

## 6. Entitlements (plan-driven authorisation)

A role determines **what you can administer**; an entitlement determines **what features you can use**. They're orthogonal.

Example:
- `student` role + `free` plan → can take 1 attempt/month, only Reading + Listening, no certificate.
- `student` role + `pro` plan → unlimited attempts, all 4 skills, certificate, history.

Implementation: a single helper in `python/languagepro_common/entitlements.py`:

```python
async def check_entitlement(db, user_id: UUID, key: str) -> Any:
    """Returns the entitlement value, or raises 402 PaymentRequired with upgrade URL."""
```

Callsites:

```python
@router.post("/v1/attempts")
async def start(body, user, db):
    quota = await check_entitlement(db, user.id, "attempts.monthly_quota")
    used = await count_attempts_this_month(db, user.id)
    if quota != "unlimited" and used >= quota:
        raise PaymentRequired(detail="Monthly attempt quota reached", upgrade_url="/pricing")
    skills = await check_entitlement(db, user.id, "skills.allowed")
    if blueprint.requires_skill not in skills:
        raise PaymentRequired(detail="Speaking is a Pro feature", upgrade_url="/pricing")
    ...
```

`PaymentRequired` is a custom `AppError` returning `402 application/problem+json` with `upgrade_url`. Frontend renders an upgrade modal.

Resolution order for an entitlement value (first match wins):
1. **`billing.entitlement_overrides`** for this user, not expired
2. The user's active subscription's plan entitlements (`billing.subscriptions` → `billing.plans.entitlements`)
3. The `free` plan defaults

See [`07-payments-and-billing.md`](07-payments-and-billing.md) for plan tables and entitlement keys.

---

## 7. Login flow (sequence)

```
1. POST /auth/v1/login {email, password}
2. auth-api: SELECT users WHERE email=$1
3. argon2.verify(stored_hash, password)          → ok / mismatch
4. INSERT sessions(refresh_token_hash, user_id, ua, ip, expires_at)
5. mint access_jwt
6. respond 200 + Set-Cookie ×3
```

Brute force: `fastapi-limiter` 5/min/IP on `/login`. After 10 failed attempts on the same email in 15 minutes, lock that account for 15 minutes (counter in Redis, key `login_fail:{email}`).

---

## 8. Refresh flow (sequence)

```
1. POST /auth/v1/refresh  (cookie sent automatically)
2. SELECT sessions WHERE refresh_token_hash=$1 FOR UPDATE
3. if revoked_at IS NOT NULL:
     // CHAIN DETECTION
     UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL
     respond 401 + clear cookies
4. if expires_at < now: respond 401
5. mark this row revoked, INSERT a new sessions row, mint new access_jwt
6. respond 200 + new Set-Cookie ×3
```

The `FOR UPDATE` row lock plus the chain detection make replay attacks self-destructive: any reuse of a stolen refresh token logs the legit user out, which they'll notice.

---

## 9. Sign-up flow (sequence)

```
1. POST /auth/v1/register {email, password, locale}
2. validate (email format, password ≥ 8 chars, no compromised passwords list lookup — Phase 2)
3. SELECT 1 FROM users WHERE email=$1 LIMIT 1  → if exists, 409 Conflict
4. INSERT users (password_hash = argon2.hash(password))
5. INSERT user_roles (student)
6. (Phase 2) send email_verified link via Resend; user can use the app immediately, but a banner asks them to verify
7. CREATE session + cookies (same as login)
8. fire analytics event "signup"
9. respond 201
```

---

## 10. OAuth Google flow

1. `GET /auth/v1/oauth/google/start?return_to=/exams`
   - server stores a random `state` in Redis (`oauth_state:<state>` → `{return_to, ts}`, TTL 10 min) and sets it as a `lp_oauth_state` cookie
   - returns 302 to Google's authorize URL with `state`, `redirect_uri=https://api.aiexam.uz/auth/v1/oauth/google/callback`
2. User signs in at Google → redirect back with `code` + `state`
3. `GET /auth/v1/oauth/google/callback?code=...&state=...`
   - validate `state` matches cookie + Redis
   - exchange `code` for tokens
   - fetch userinfo (email, sub, name, picture)
   - upsert `auth.users` and `auth.oauth_accounts`
   - mint cookies (same as login)
   - 302 to `return_to`

Email verification: Google-verified emails set `email_verified_at = now()` immediately. Other providers (future) require explicit verify.

---

## 11. Logout

```
POST /auth/v1/logout
  → mark current session revoked
  → clear Set-Cookie ×3 (Max-Age=0)
```

"Log out everywhere" (Phase 2): `POST /auth/v1/logout-all` revokes every session for the user.

---

## 12. Frontend integration

- **Server Components / Server Actions**: use Next's `cookies()` to read the cookie on the request, forward it as `Cookie:` header when calling APIs (already implemented in `apps/exam-platform-web/src/lib/auth-server.ts`).
- **Client Components**: use `fetch(..., { credentials: 'include' })`. Browser sends `lp_access` automatically.
- **Auto refresh**: client wrapper detects `401`, calls `POST /auth/v1/refresh`, retries the original request **once**.
- **CSRF**: all `fetch` mutations add `X-CSRF-Token: ${getCookie('lp_csrf')}`.

---

## 13. Audit log

Every authentication event writes a row to `analytics.events`:

`signup, login, login_failed, logout, password_changed, role_granted, role_revoked, oauth_linked, refresh_replay_detected`.

Retained 90 days hot, then archived to S3 cold (1-year retention). Used by:
- security review (replay alerts)
- account help (`Where did I last log in from?`)
- conversion funnel analytics

---

## 14. Threat coverage (summary)

| Threat | Mitigation |
|---|---|
| XSS token theft | `HttpOnly` access cookie; CSP header; React's escape-by-default |
| CSRF | `SameSite=Lax/Strict` + double-submit token + `Origin` check on mutations |
| Session fixation | Refresh tokens are rotated on every use |
| Replay | Short access TTL; refresh single-use + chain detection |
| Credential stuffing | Argon2id (memory-hard); rate limit; account lockout |
| Stolen refresh | Reuse triggers chain revocation; user is alerted via email |
| S2S token theft | 5-min TTL; bound to `iss/aud`; `jti` replay defense in Redis |

---

## 15. Acceptance

- [ ] Logging in at `app.aiexam.uz` makes the user logged in at `admin.aiexam.uz` (cookie domain works).
- [ ] Sending a request without `X-CSRF-Token` to a mutation returns 403.
- [ ] Reusing a revoked refresh token returns 401 **and** revokes all of the user's sessions.
- [ ] An expired access token + valid refresh → silent refresh succeeds; user not redirected to /login.
- [ ] An S2S token with missing scope is rejected with 403 by `data-api`.
- [ ] Decoding a JWT returns the same `sub` regardless of which service does the validation.
- [ ] Free user trying to take a 4-skill IELTS exam gets 402 with `upgrade_url`, not 403.
