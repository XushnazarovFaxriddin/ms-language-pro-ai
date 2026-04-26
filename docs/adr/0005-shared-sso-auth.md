# ADR 0005 — Shared SSO via Apex-Domain JWT Cookie

- **Status**: Accepted
- **Date**: 2026-04-26
- **Deciders**: Bobomurod, Faxriddin

## Context

LanguagePro AI has 3 web subdomains: `aiexam.uz` (landing), `app.aiexam.uz` (exam), `admin.aiexam.uz` (admin). One user (e.g., a researcher with role=`content_admin` AND `student`) may use multiple subdomains in one session and should not have to log in twice.

Auth must:
1. Be shared across all subdomains.
2. Resist common attacks: XSS token theft, CSRF, session fixation.
3. Work without third-party dependencies (no Auth0/Clerk/Supabase) — defendable in dissertation as our own design.
4. Be invalidatable on logout / suspicious activity.

## Considered options

| Option | Pros | Cons |
|---|---|---|
| **A. Apex-domain JWT cookie + opaque refresh token in DB** | Simple, no third-party, fully under our control | Token revocation requires sessions table |
| B. OAuth 2.0 with our own auth server (full RFC 8252) | Industry standard, third-party login | Massive over-engineering for our scope |
| C. NextAuth/Auth.js | JS-side auth, well-tested | Tied to Next.js; backend (FastAPI) needs separate verification; complex multi-subdomain |
| D. Clerk / Auth0 / Supabase Auth | Zero-ops auth | $$$ at scale, vendor lock-in, less defensible IP |
| E. Per-subdomain auth | Strong isolation | UX disaster (login twice); breaks SSO promise |

## Decision

**Option A**: Custom `auth-api` FastAPI service. Apex-domain `__Host-` cookie carries a short-lived (15 min) HS256 JWT access token. Refresh token (opaque random 256-bit, stored hashed in `auth.sessions`) is set as a separate `__Host-` cookie limited to `/auth/v1/refresh` path.

### Cookie configuration

| Cookie | Lifetime | Path | Domain | SameSite | Secure | HttpOnly |
|---|---|---|---|---|---|---|
| `__Host-lp_access` | 15 min | `/` | `.aiexam.uz` | Lax | yes | yes |
| `__Host-lp_refresh` | 30 days | `/auth/v1/refresh` | `.aiexam.uz` | Strict | yes | yes |
| `__Host-lp_csrf` | session | `/` | `.aiexam.uz` | Lax | yes | no (read by JS for double-submit) |

> **Note on `__Host-` prefix**: This RFC 6265bis convention requires `Secure`, `Path=/`, no explicit `Domain` attribute in the Set-Cookie header. To use it across subdomains, we set `Domain=.aiexam.uz` and accept that we are technically using a custom prefix `lp_*` rather than strict `__Host-`. We retain the `__Host-` prefix as a defense-in-depth signal, but the canonical apex-domain cookie has `Domain` set. For production, evaluate `__Secure-` prefix instead, which is compatible with explicit `Domain`.

### Token payloads

Access JWT (HS256):
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

Refresh: opaque, hashed (SHA-256) in `auth.sessions(refresh_token_hash, user_id, ua, ip, expires_at, revoked_at)`.

### Refresh flow

1. Frontend silently calls `POST /auth/v1/refresh` ~5 min before access expiry.
2. auth-api validates refresh cookie hash, marks the row as rotated (`revoked_at = now()`), and issues a new access cookie + new refresh cookie (rotation prevents reuse).
3. If refresh is invalid, return 401; frontend redirects to `/login`.

### CSRF defense

Cross-subdomain `Lax` cookies still allow some CSRF. Defense-in-depth:
- Mutating endpoints require `X-CSRF-Token` header matching `__Host-lp_csrf` cookie.
- The CSRF token is rotated on every login.
- Frontend reads cookie via `document.cookie` and attaches the header on every mutation.

## Consequences

- ✅ True SSO across all subdomains.
- ✅ Revocation possible (`auth.sessions.revoked_at`).
- ✅ No third-party dependency.
- ✅ Defensible in dissertation: "We designed the auth flow ourselves, not delegated."
- ⚠️ JWT secret rotation requires overlapping keys (key ID `kid` in header). Phase 2 work.
- ⚠️ Refresh rotation must be atomic — `SELECT … FOR UPDATE` to prevent double-spend.
- ⚠️ MFA out of MVP scope. Roadmap: TOTP via `pyotp` in Phase 2.

## Threat coverage

| Threat | Mitigation |
|---|---|
| XSS token theft | `HttpOnly` cookies; access token never accessible from JS |
| CSRF | `SameSite=Lax/Strict` + double-submit CSRF token |
| Session fixation | Refresh tokens are rotated; old refresh becomes invalid |
| Replay | Short access TTL (15 min); refresh single-use |
| Brute force login | `fastapi-limiter` 5/min/IP, 10 fails → 15 min account lock |
| Stolen refresh token | Detection via "refresh used twice" — when an already-rotated refresh appears, **all** sessions for that user are revoked (chain detection) |

## References

- OWASP Session Management Cheat Sheet
- RFC 7519 (JWT)
- RFC 6265bis (cookies)
- "Don't put refresh tokens in localStorage" (the obvious truth)
