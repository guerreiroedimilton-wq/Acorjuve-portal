# ACORJUVE security hardening

This project is configured for production with the following controls:

- Administrative actions are enforced server-side.
- The first OAuth login matching `ACORJUVE_ADMIN_EMAIL` claims the admin identity; its immutable OAuth `openId` is persisted as `admin_open_id` in `siteSettings`.
- After the identity is locked, an email match alone is not enough to administer the portal.
- A later session refresh that does not include an email no longer accidentally downgrades the administrator.
- Production sessions use `HttpOnly`, `Secure`, `SameSite=Lax` cookies and a 30-day lifetime.
- The preview-only Bearer/sessionStorage fallback is disabled by the server in production.
- Public comments and contact submissions have per-process rate limits.
- JSON/form request limits are reduced from the previous 50 MB global limit.
- Storage proxy access is restricted to the `acorjuve/` object namespace.
- Basic browser security headers are enabled in production, including HSTS, `nosniff`, frame protection, referrer policy, and a restrictive permissions policy.

## Required production environment

Set a strong random `JWT_SECRET` that is different for production and never commit it.

Set `ACORJUVE_ADMIN_EMAIL` to the exact verified OAuth email that should be the sole administrator.

If the deployment platform provides a stable trusted proxy, set `TRUST_PROXY=1` so Express can use the real client IP for rate limiting. Only enable this when the platform actually terminates the connection through a trusted reverse proxy.

Optionally set `ACORJUVE_ADMIN_OPEN_ID` after the administrator has logged in once. When present, it becomes the strongest explicit administrator identity check and overrides the database bootstrap identity.

## First production login

1. Deploy with the correct `ACORJUVE_ADMIN_EMAIL`.
2. Log in once with that OAuth account.
3. The server stores that account's OAuth `openId` as `admin_open_id` and demotes all other users to `user`.
4. Do not share the OAuth password, session token, recovery code, or API keys.

## Remaining operational requirements

Rate limiting in this project is intentionally in-memory. For multiple application instances, replace it with a shared Redis/database-backed limiter before scaling horizontally.

Use HTTPS only in production, keep the database private, rotate secrets if exposure is suspected, and maintain database/storage backups.
