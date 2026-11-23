# Form setup — what to configure

The inquiry form and its backend already exist in this repo. It runs but stays
in "not configured" mode until the steps below are done. Nothing here has been
applied to the live site.

Full architecture and cost details: `docs/INQUIRY-SYSTEM-PLAN.md`.

---

## 1. Resend (email delivery)

1. Create a free account at resend.com **with `orvanutech@gmail.com`** — on the
   free tier before a domain is verified, mail can only be delivered to the
   account owner's address. Using this address makes notifications work without
   a domain.
2. Create an API key.
3. Cloudflare Pages → your project → Settings → Environment variables →
   Production → add `RESEND_API_KEY` as a **secret**.

Verify: submit a test inquiry; the inbox should receive
"Project inquiry — <name>" with every field and attachment links.

## 2. Turnstile (spam protection)

1. Cloudflare dashboard → Turnstile → Add site → domain `orvanu.pages.dev`,
   widget mode *Managed*.
2. Copy the **site key** (public) into `TURNSTILE_SITEKEY` at the top of
   `public/form.js`.
3. Add the **secret key** to Pages as the secret `TURNSTILE_SECRET_KEY`.

Until the secret exists the server runs without a spam check. Once it exists,
any request without a valid token is rejected with 403.

## 3. R2 (private attachments)

1. R2 → Create bucket `orvanu-inquiries`, jurisdiction **EU**, public access
   **disabled**.
2. Pages project → Settings → Functions → **R2 bucket bindings** →
   variable name `INQUIRIES`, bucket `orvanu-inquiries`.
3. Optional: Settings → Object lifecycle → delete objects after 90 days.

Without this binding the form still works but the email says the file was
**NOT STORED** instead of linking to it.

## 4. Signing secret

Add `FILE_SIGNING_SECRET` as a Pages secret — 32+ random bytes. It signs the
7-day attachment links. Rotating it invalidates every outstanding link.

Generate one locally:

```powershell
$b = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($b)
[Convert]::ToBase64String($b)
```

## 5. D1 (inquiry store)

1. D1 → Create database `orvanu-inquiries` (EU region).
2. Open it → Console, or use Wrangler, and run `schema.sql` (creates
   `inquiries`, `attachments`, `admin_sessions`, `login_codes`, `rate_limits`,
   `audit_log`).
3. Pages project → Settings → Functions → **D1 database bindings** →
   variable name `DB`, database `orvanu-inquiries`.

Without this binding submissions still send an email but return
"storage is not configured" to the browser instead of a reference number, and
`/admin` cannot work.

## 6. Dashboard sign-in (`/admin`)

| Variable | Value |
| --- | --- |
| `ADMIN_EMAILS` | `orvanutech@gmail.com` (comma-separate more addresses later) |
| `SESSION_SECRET` | 32+ random bytes, same generator as below |

Sign-in is a six-digit code emailed to an address in `ADMIN_EMAILS`; the code
goes through the same Resend account. Details: `docs/ADMIN.md`.

## 7. Sender / destination variables

| Variable | Value |
| --- | --- |
| `INQUIRY_TO_EMAIL` | `orvanutech@gmail.com` |
| `INQUIRY_FROM_EMAIL` | `onboarding@resend.dev` (later: your verified domain) |
| `PUBLIC_SITE_URL` | `https://orvanu.pages.dev` |

## 8. Local development

`.dev.vars` (git-ignored) already contains local-only values:

```
MAIL_MODE=console
FILE_SIGNING_SECRET=local-dev-only-change-me
SESSION_SECRET=local-dev-only-change-me
PUBLIC_SITE_URL=http://localhost:3006
INQUIRY_TO_EMAIL=orvanutech@gmail.com
INQUIRY_FROM_EMAIL=onboarding@resend.dev
ADMIN_EMAILS=yousef@orvanu.test
```

`MAIL_MODE=console` prints the email to the terminal instead of sending it.
Never set `MAIL_MODE=console` in production — a missing `RESEND_API_KEY` must
produce the 503 "not fully configured" message, not a silent success.

Run locally with the D1 and R2 bindings (they are not in `wrangler.toml`):

```powershell
& "_inspect\dev\node_modules\.bin\wrangler.cmd" pages dev public --port 3006 `
    --d1=DB --r2=INQUIRIES --persist-to ".wrangler/inquiries"
```

The first run creates an empty local database; stop the server and apply the
schema with `node tools/dev-db.mjs`, then start it again.

API tests (server must be running):

```powershell
$env:BASE = "http://127.0.0.1:3006"
node _inspect/test-inquiry.mjs
node _inspect/test-admin.mjs
```

---

## Deployment note

R2/D1 bindings are deliberately **not** in `wrangler.toml`. A binding to a
bucket or database that does not exist fails the whole deploy. Bindings are set
in the Pages dashboard; `wrangler.toml` keeps only `name`,
`pages_build_output_dir` and `compatibility_date`.
