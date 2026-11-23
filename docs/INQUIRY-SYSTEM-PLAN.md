# Inquiry System — Architecture Decision (for approval)

Status: **proposal, not implemented.** Nothing in this document is deployed.
Date: 2026-11-23

---

## 1. What already exists (and what was verified)

The public form is built and tested locally on `wrangler pages dev`:

| Piece | File | State |
| --- | --- | --- |
| Form markup + copy | `public/index.html` (`#inquiry`) | done |
| Client validation, file queue, Turnstile wiring | `public/form.js` | done |
| Styling (responsive to 390 px) | `public/styles.css` | done |
| Submit endpoint (validate → spam check → store → email) | `functions/api/inquiry.js` | done |
| Private attachment download | `functions/api/file.js` | done |

Verified locally:

- 15 API tests pass (required fields, email formats, international phone, file type/size/magic-byte checks, file count, honeypot, tampered dropdown values).
- Attachment round-trip: signed link returns byte-identical file, `Content-Disposition: attachment`, `Cache-Control: private, no-store`, `nosniff`; tampered signature → 403; expired → 410.
- Turnstile enforced when `TURNSTILE_SECRET_KEY` is set (missing token → 403).
- Unconfigured states degrade safely: no Resend key → 503 with a clear message, never a false "sent".
- Browser test: full submit → "Sending…" → success panel with reference `ORV-20261123-…`.
- Layout at 390 px: single column, full-width submit, no horizontal overflow.

**Not yet true:** no real email has been sent, and nothing is deployed. Both need the accounts in §7.

---

## 2. Option A vs Option B

### Option A — managed form provider (Formspree / Getform / Basin / Tally)

| Criterion | Assessment |
| --- | --- |
| Setup complexity | Lowest — point the form at their endpoint |
| Email notifications | Yes, included |
| File attachments | Usually **paid only**; free tiers cap size or exclude files |
| Submission dashboard | Yes, hosted on the provider's domain, their branding, their login |
| Status workflow (New → Contacted → In Discussion → Won → Lost) | **No.** These are form inboxes, not pipelines. Freeform tags at best |
| Dashboard at `/admin` on orvanu.pages.dev | **Impossible** — the dashboard lives on the provider's domain |
| Data control | Submissions and files sit with a third party; retention/deletion depends on their plan |
| Cost | Free tier typically 50 submissions/month, files excluded |
| Vendor lock-in | High — migrating history means exporting CSVs |

Verdict: can deliver email notifications cheaply, cannot deliver the requested dashboard, status model, or retention controls.

### Option B — Cloudflare-native (Pages Functions + D1 + R2 + Turnstile + Resend)

| Criterion | Assessment |
| --- | --- |
| Setup complexity | Moderate — needs D1, R2, secrets, an auth decision |
| Email notifications | Resend API, free 100/day |
| Attachments | R2 private bucket, zero egress cost |
| Submission dashboard | **Yes, at `https://orvanu.pages.dev/admin`** |
| Status workflow | Native — the five requested values, enforced by a DB constraint |
| Data control | Our account, our bucket, our DB; delete on demand |
| Cost | €0/month at this volume |
| Maintenance | No servers, no dependencies to patch; the code is ~600 lines in this repo |
| Lock-in | Low — D1 exports SQL, R2 is S3-compatible |
| Free-tier risk | Request/CPU caps only matter under abuse, which rate limiting covers |

### Recommendation

**Option B.** Option A fails three hard requirements (dashboard at `/admin`, the five statuses, deletion/retention control), and its file support is the paid part. Option B costs nothing extra because the site already runs on Cloudflare Pages and the form backend already exists — the dashboard is the only new surface, and it sits behind auth on the same deployment.

---

## 3. Costs and free-tier limits

All figures are Cloudflare free-plan limits. At ~50–200 inquiries/month the real usage is a rounding error.

| Service | Free allowance | What we use |
| --- | --- | --- |
| Pages (static) | Unlimited requests/bandwidth, 500 builds/month | The public site |
| Pages Functions / Workers | 100,000 requests/day, 10 ms CPU/request | Form submit + admin API |
| D1 | 5 GB storage, 5M rows read/day, 100k rows written/day | Inquiry records (a few KB each) |
| R2 | 10 GB-month storage, 1M Class A + 10M Class B ops/month, **$0 egress** | Attachments (max 30 MB per inquiry) |
| Turnstile | Free, unlimited | Spam protection on the form |
| Resend | 100 emails/day, 3,000/month, 1 domain | Inquiry notifications, OTP codes |
| Cloudflare Access (if chosen) | Free up to 50 users | `/admin` gating |

**Total: €0/month.** The only optional spend is a custom domain (≈ €10–12/year), which would also remove the Resend sender limitation in §7.

Limits worth knowing:

- Resend free tier: until a domain is verified, mail can only be delivered **to the Resend account owner's own address**. Creating the account with `orvanutech@gmail.com` makes the notification path work, but replies to customers are still sent from Gmail manually (which is what we want anyway).
- Workers free CPU limit is 10 ms. Our handlers are I/O-bound (R2/D1/fetch), not CPU-bound, so this is not a practical constraint — but a 30 MB upload across a slow link is the thing to watch, not CPU.
- D1 has no region choice; R2 buckets can be set to EU jurisdiction (see §6).

---

## 4. Dashboard URL

`https://orvanu.pages.dev/admin`

Pages:

| Path | Purpose |
| --- | --- |
| `/admin` | Login screen (when no valid session) |
| `/admin` | Inquiry list: search, filter by status, sort by date, pagination |
| `/admin/inquiry?id=ORV-…` | Full details, attachments, status control, delete |

The static shell is `public/admin/index.html`; all data comes from `/api/admin/*` endpoints that re-check the session server-side on every request. The HTML contains no data and no secrets — knowing the URL grants nothing.

---

## 5. Authentication — one decision needed

Requirement: only Yousef Panahi, MFA preferred, server-side checks, no frontend secrets, extensible.

Two workable routes:

**5a. Cloudflare Access (recommended if a domain is added)**

- Native Cloudflare MFA: email one-time PIN, TOTP, hardware keys.
- Zero auth code in this repo — Cloudflare itself refuses unauthenticated requests.
- Free for up to 50 users; add admins by adding emails to the policy.
- **Blocker:** Access policies scoped to a *path* (`/admin*`) require a hostname in a Cloudflare zone you control. On `*.pages.dev` you can only enable the Pages-wide policy, which would put the entire public marketing site behind a login. So this path needs a custom domain (≈ €10–12/year) pointed at the Pages project.

**5b. First-party email OTP on pages.dev (recommended for zero cost, available today)**

- `/admin` shows an email field; a 6-digit code is sent to a server-side allowlist address (initially `ADMIN_EMAILS=yousef@…`).
- Code: random, hashed at rest, 10-minute expiry, 5 attempts, rate-limited per IP and per email.
- Successful verification issues an `HttpOnly; Secure; SameSite=Strict` session cookie: random 32-byte id, server-side row in `admin_sessions`, 12-hour expiry, revocable.
- Every `/api/admin/*` request resolves the session against D1 before touching data. No client-side role flags anywhere.
- CSRF: `SameSite=Strict` plus a required `X-Requested-With` header on mutations.
- Adding an admin later = one more address in `ADMIN_EMAILS`.
- Honest limitation: email OTP is **one factor** (possession of the inbox). It is materially stronger than a shared password, and the inbox itself is protected by Google's MFA. A TOTP second step can be layered on later without changing the URL or storage.

Both options satisfy "knowing `/admin` grants nothing". **Decision (approved): option 5b — first-party email OTP on `orvanu.pages.dev`.** It needs no purchase, works on the current URL, and stores nothing in the frontend. If a domain is ever added, option 5a replaces this code rather than sitting alongside it.

Initial administrator: `orvanutech@gmail.com` (`ADMIN_EMAILS` in the Pages environment, comma-separate more addresses later). Codes are delivered through the same Resend account as the inquiry notifications, so the Resend free-tier restriction (delivery only to the account owner until a domain is verified) is satisfied by using that inbox for the account.

---

## 6. Where data lives

**D1 database** (`orvanu-inquiries`, binding `DB`) — Cloudflare's SQLite:

```sql
inquiries(id PK, created_at, updated_at, name, email, phone, company,
          service, budget, timeline, description, status, status_changed_at,
          email_sent_at, email_error, ip_hash)
attachments(id PK, inquiry_id FK, r2_key, filename, content_type, size,
            created_at, deleted_at)
admin_sessions(id PK, email, created_at, expires_at, revoked_at, ip_hash)
login_codes(id PK, email, code_hash, expires_at, attempts, consumed_at)
audit_log(id PK, at, actor, action, inquiry_id, detail)
rate_limits(key PK, window_start, count)
```

`status` is `CHECK (status IN ('New','Contacted','In Discussion','Won','Lost'))` — the five requested values are the only ones the database will store.

**R2 bucket** (`orvanu-inquiries`, binding `INQUIRIES`, **EU jurisdiction**, no public access):

```
inquiries/<inquiryId>/<n>-<uuid>.<ext>     attachments
```

No public bucket URL exists. Downloads happen only through:
- `/api/admin/file?id=…` — requires a valid admin session; streams with `Content-Disposition: attachment`, `Cache-Control: private, no-store`, `nosniff`, `CSP: sandbox`.
- The 7-day HMAC-signed link included in the notification email (already implemented) — a bearer capability, unguessable, expiring, and revocable by rotating `FILE_SIGNING_SECRET`.

**IP addresses** are never stored raw: `ip_hash = SHA-256(ip + secret)`, used only for abuse control and rate limiting. No IPs in logs.

---

## 7. Account configuration you must complete

Cloudflare is unreachable from this machine, so these are dashboard steps. Nothing here can be done by me.

1. **Resend** (resend.com)
   - Create the account **using `orvanutech@gmail.com`** (free tier can only deliver to the account owner until a domain is verified).
   - Create an API key → Cloudflare secret `RESEND_API_KEY`.
   - Verify the sender domain later if you want customers to see `inquiries@orvanu.com` instead of `onboarding@resend.dev`.
2. **Cloudflare Turnstile**
   - Add a widget for `orvanu.pages.dev` → take the **site key** (public, goes in `public/form.js`) and **secret key** (Pages secret `TURNSTILE_SECRET_KEY`).
3. **Cloudflare R2**
   - Create bucket `orvanu-inquiries`, jurisdiction **EU**, public access **off**.
   - Pages project → Settings → Functions → R2 binding: variable `INQUIRIES` → that bucket.
   - Optional: lifecycle rule deleting objects after 90 days (retention default).
4. **Cloudflare D1**
   - Create database `orvanu-inquiries`; Pages project → Settings → Functions → D1 binding: variable `DB`.
   - Run `schema.sql` (I will generate it) in the D1 console.
5. **Pages secrets** (Settings → Environment variables → Production)
   - `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `FILE_SIGNING_SECRET` (32+ random bytes), `SESSION_SECRET` (32+ random bytes), `ADMIN_EMAILS=yousef@…`, `INQUIRY_TO_EMAIL=orvanutech@gmail.com`, `INQUIRY_FROM_EMAIL=onboarding@resend.dev`, `PUBLIC_SITE_URL=https://orvanu.pages.dev`.
6. **Optional but high value:** a domain (e.g. `orvanu.com`) → unlocks Cloudflare Access MFA for `/admin`, sends customer-visible mail from your own domain, and ends the Resend restriction.

Until step 1 is done the form is live-safe: it returns "not fully configured" rather than pretending to send.

---

## 8. Privacy, retention, abuse

- Only fields the user typed are stored; no tracking pixels, no cookies on the public site, no IPs.
- Privacy notice on the form, stating purpose (replying to the inquiry), private attachment storage, 7-day link expiry, and that a WhatsApp number is used for this conversation only — not marketing consent.
- GDPR: Cloudflare is a data processor under its DPA; inquiry data is a legitimate-interest/business-correspondence record. Default retention: inquiry records kept until manually deleted, attachments auto-expiring after 90 days via R2 lifecycle. The dashboard has per-inquiry **Delete** (purges D1 row + R2 objects) and a **purge older than N days** action.
- Abuse: Turnstile, honeypot, D1-backed rate limits (5 submits/IP/hour, 20 OTP requests/IP/hour, 5 code attempts), size/type/magic-byte restrictions, and an audit log of admin actions.
- No antivirus engine is available on the free tier. Mitigations: extension allowlist, content sniffing, private storage, forced download (never inline), `nosniff` + CSP `sandbox`, no server-side parsing of DOCX/XLSX. Optionally, VirusTotal's free API could scan uploads — it means sending customer files to a third party, so it stays off unless you ask for it.

---

## 9. Build plan after your approval

1. `schema.sql` + D1 binding and migration.
2. `functions/api/admin/login.js`, `/verify`, `/logout` (OTP + session).
3. `functions/api/admin/inquiries.js` (list/search/filter/sort/paginate) and status update + delete.
4. `functions/api/admin/file.js` (session-gated streaming download).
5. `public/admin/` shell (HTML/CSS/JS, no framework, matching the brand).
6. Write inquiries to D1 from the existing submit handler (it currently only emails).
7. Rate limiting, retention purge, audit log.
8. Tests: authorized vs unauthorized access, session expiry, tampered cookie, link expiry, status transitions, deletion purges R2, rate limits, mobile layout.
9. Feature branch + preview deployment for your review. **No merge to `main`, no production deploy without your explicit approval.**
