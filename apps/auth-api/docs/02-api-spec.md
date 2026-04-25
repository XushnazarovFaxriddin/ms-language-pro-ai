# 02 — API Spec

> Canonical: [`/docs/api-contracts.md`](../../../docs/api-contracts.md) § 4

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/register` | none | `{email, password, locale?}` → 201 + cookies |
| POST | `/v1/login` | none | `{email, password}` → 200 + cookies |
| POST | `/v1/refresh` | refresh cookie | 200 + new cookies (rotation) |
| POST | `/v1/logout` | access | revoke refresh, clear cookies |
| GET | `/v1/me` | access | current user, roles, locale |
| PATCH | `/v1/me` | access | `{locale?, display_name?}` |
| POST | `/v1/me/delete` | access | account deletion request |
| POST | `/v1/oauth/google/start` | none | redirect to Google |
| GET | `/v1/oauth/google/callback` | state | redirect back, set cookies |
| POST | `/v1/admin/api-keys` | superadmin | mint researcher key |
| GET | `/v1/admin/api-keys` | superadmin | list (scopes, last used) |
| DELETE | `/v1/admin/api-keys/{id}` | superadmin | revoke |

## Rate limits
- `/login`: 5/min/IP
- `/register`: 3/hour/IP
- All others: standard 120/min

## Errors
RFC 9457 problem details (see api-contracts.md).
