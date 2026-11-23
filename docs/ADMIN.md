# Inquiry dashboard (`/admin`) — how it works

Internal tool for the ORVANU website. Not a CRM: it lists project inquiries, shows
their details and files, and tracks one status per inquiry.

## Signing in

1. Open `https://orvanu.pages.dev/admin`.
2. Enter an address listed in the `ADMIN_EMAILS` environment variable.
3. A six-digit code arrives by email; enter it within 10 minutes.

The code is single-use, hashed in storage, and limited to 5 attempts. A signed-in
session lasts 12 hours and can be ended with **Sign out**.

Nothing in the page grants access: every `/api/admin/*` request re-resolves the
session cookie against the `admin_sessions` table before reading any data. The
cookie is `HttpOnly`, `SameSite=Strict`, `Secure` on HTTPS, and the database
stores only `sha256(token + SESSION_SECRET)` — a copy of the database cannot be
replayed as a login.

Adding an administrator later: append the address to `ADMIN_EMAILS`
(comma-separated — `a@x.com,b@y.com`) and redeploy. No code change is needed.

## Statuses

`New` → `Contacted` → `In Discussion` → `Won` / `Lost`

The set is enforced by a `CHECK` constraint in D1, so an invalid value cannot be
stored even if the API is bypassed. Every change is written to `audit_log` with
the administrator's address, the previous status and the new one.

## Files

Attachments live in a private R2 bucket (EU jurisdiction, no public access).
There are two ways in, both authenticated or expiring:

- `/api/admin/file?id=…` — requires a signed-in session; streams the object with
  `Content-Disposition: attachment`, `Cache-Control: private, no-store`,
  `nosniff` and `CSP: sandbox`.
- The 7-day HMAC-signed link in the notification email — a bearer capability.
  Rotating `FILE_SIGNING_SECRET` invalidates every outstanding link.

There is no upload endpoint here; files arrive only with a website submission,
are capped at 3 × 10 MB, checked by extension **and** magic bytes, and are never
parsed server-side.

## Retention and deletion

- **Delete inquiry** removes the D1 row and every R2 object for that inquiry.
- **Purge** (`POST /api/admin/purge`) deletes inquiries older than N days, minimum
  30 — for scheduled or manual housekeeping.
- Configure an R2 lifecycle rule (e.g. 90 days) for automatic attachment expiry.
- Expired sessions, codes and rate-limit windows are cleaned up on each purge.

## Abuse controls

| Control | Value |
| --- | --- |
| Form submissions | 5 per connection per hour |
| Sign-in codes requested | 5 per IP per 15 min, 5 per address per hour |
| Code attempts | 5, then the code is destroyed |
| Session length | 12 hours |
| Mutating requests | Require `X-Orvanu-Admin: 1` (cannot be set cross-site) |

All counters live in D1 (`rate_limits`), so they survive worker restarts and are
shared across the edge. IP addresses are stored only as `sha256(ip + secret)`.

## Local development

```powershell
# 1. start the dev server with D1 + R2 bindings (bindings are not in wrangler.toml on purpose)
& "_inspect\dev\node_modules\.bin\wrangler.cmd" pages dev public --port 3006 `
    --d1=DB --r2=INQUIRIES --persist-to ".wrangler/inquiries"

# 2. once, with the server stopped, apply the schema
node tools/dev-db.mjs
```

`.dev.vars` supplies `MAIL_MODE=console` (codes and notifications print to the
terminal), `SESSION_SECRET`, `FILE_SIGNING_SECRET` and
`ADMIN_EMAILS=yousef@orvanu.test`.

Tests: `node _inspect/test-admin.mjs` with `BASE` and `WRANGLER_LOG` set.
