# ORVANU — project log & handoff

**Purpose.** This is the running record of what ORVANU's website does, what was
built, why decisions were made, and what is still open. It is written so a
future session — human or another LLM — can pick up without re-reading old chat
transcripts.

Last updated: **24 November 2026**.

Related documents:

- `AGENTS.md` — hard rules, confirmed company facts, environment limits.
- `docs/INQUIRY-SYSTEM-PLAN.md` — architecture and cost analysis of the inquiry system.
- `docs/FORM-SETUP.md` — the exact steps to configure the form (Resend, Turnstile, R2, D1, secrets).
- `docs/ADMIN.md` — how the dashboard works and how to operate it.

---

## 1. Production state

| Item | Value |
| --- | --- |
| Live site | https://orvanu.pages.dev/ |
| Hosting | Cloudflare Pages, project `orvanu`, Direct Upload via Wrangler |
| Repository | `yousefpanahi/orvanu-website`, branch `main` (public) |
| Deploy trigger | push to `main` → `.github/workflows/deploy.yml` → `wrangler pages deploy public --project-name=orvanu` |
| Deployed commit | `01ddcfa` — "Rewrite the About section with facts, expertise and experience" |
| Previous deploys | `b2ed250` (inquiry backend + dashboard, run #9 ✓), `01ddcfa` (About rewrite, run #10 ✓) |

What is live right now:

- Full public site (hero, services, approach, concept work, about, team, contact, inquiry form).
- `POST /api/inquiry` — validates, stores to D1 + R2, sends email, returns an `ORV-YYYYMMDD-xxxxxxxx` reference.
- `GET /api/file` — expiring signed download links used by the notification email.
- `/admin` — private inquiry dashboard (email OTP sign-in), plus `/api/admin/*`.
- `public/_headers` applies CSP, `noindex`, `no-store` to `/admin/*` and `no-store` to `/api/admin/*`; `robots.txt` disallows `/admin` and `/api/`.

**Not yet proven in production:** that D1/R2 bindings and the Resend key exist on
the Pages project. If they are missing, the form politely tells the visitor to
email `orvanutech@gmail.com`, and `/admin` refuses sign-in — nothing breaks, but
nothing works either. See §12.

---

## 2. Company facts (do not invent more)

- **ORVANU** — Software & Product Engineering. Contact: orvanutech@gmail.com.
- **Services:** custom software development; dedicated engineering teams; MVP & SaaS product development.
- **Team:** 15 people total. Featured: Yousef Panahi (Director of Product — not a developer), Saeed Najafi (Full-Stack, React/Next.js/TypeScript), Mohammadreza Akbari (Full-Stack, business apps, Next.js/NestJS/TypeScript). Engineering team is based in Iran; customers are international.
- **Markets:** Netherlands, wider Europe, UAE, Oman, Gulf.
- **Experience:** the team's product/software engineering experience starts in **2019**, before ORVANU existed as a company. ORVANU's own founding year is **not stated anywhere** and must not be claimed.
- **Never fabricate** clients, testimonials, revenue, partnerships, certifications, case studies, or credentials. Demonstration work is labelled as concept/demonstration.

---

## 3. Site files

```
public/
  index.html      single-page site (sections 01–07, id="inquiry" form, id="about")
  styles.css      all styles (minified single-line blocks per section)
  script.js       nav, scroll reveal, TEAM array rendering, year
  form.js         inquiry form: validation, file list, drag & drop, Turnstile, submit
  admin/          index.html, admin.css, admin.js — the private dashboard
  _headers        security headers (admin + api scoping)
  robots.txt      disallows /admin and /api/
  sitemap.xml     public pages only
functions/
  _lib/core.js    shared: sessions, OTP, rate limit, HMAC signing, email, audit
  api/inquiry.js  POST submission (multipart)
  api/file.js     signed expiring attachment download (email links)
  api/admin/*.js  login, verify, session, inquiries, inquiry, file, purge
schema.sql        D1 schema (6 tables + indexes)
wrangler.toml     name, pages_build_output_dir, compatibility_date only
tools/            serve.js (static preview), dev-db.mjs (apply schema locally),
                  push-branch.js, merge-pr.js (GitHub API deploys), setup-repo.ps1
_inspect/         local test suites and scratch output — never deployed
```

D1/R2 bindings are deliberately **not** in `wrangler.toml`: a binding to a
non-existent bucket/database fails the entire deploy. They are configured in the
Pages dashboard instead.

---

## 4. Inquiry system — how it works

### Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/inquiry` | POST | Public form submission (multipart, ≤3 files ≤10 MB) |
| `/api/file?k=&e=&s=` | GET | HMAC-signed attachment link from the notification email (7 days) |
| `/api/admin/login` | POST | Request a six-digit code |
| `/api/admin/verify` | POST | Exchange code → session cookie |
| `/api/admin/session` | GET / POST | Probe session / sign out |
| `/api/admin/inquiries` | GET | List with `q`, `status`, `sort`, `page`, `per` |
| `/api/admin/inquiry?id=` | GET / PATCH / DELETE | Detail, status change, delete (records + R2 objects) |
| `/api/admin/file?id=` | GET | Authenticated attachment download |
| `/api/admin/purge` | POST | Delete inquiries older than N days (min 30) |

### Data model (`schema.sql`)

`inquiries` (status `CHECK` constrained to New / Contacted / In Discussion / Won /
Lost), `attachments`, `admin_sessions`, `login_codes`, `rate_limits`, `audit_log`.

### Security posture

- Every `/api/admin/*` call re-resolves the session cookie against D1; the
  frontend never holds a credential, so knowing `/admin` grants nothing.
- Cookies: `HttpOnly`, `SameSite=Strict`, `Secure` on HTTPS. The DB stores only
  `sha256(token + SESSION_SECRET)`.
- OTP codes: 6 digits, 10-minute expiry, single use, hashed, 5 attempts max.
- Mutating admin requests must carry `X-Orvanu-Admin: 1` (cannot be set by a
  cross-site form). Missing/incorrect → **403**.
- Rate limits (D1-backed, survive restarts): 5 submissions/hour/connection,
  5 code requests/15 min/IP, 5/hour/address; IPs stored hashed only.
- Attachments: private R2 bucket (EU), magic-byte checked, served with
  `Content-Disposition: attachment`, `private, no-store`, `nosniff`, `CSP: sandbox`.
- Adding an administrator = append to `ADMIN_EMAILS`, no code change.

### Retention

Attachments: R2 lifecycle 90 days (rule not yet created). Inquiry records: kept
until manually deleted. `purge` exists for scheduled/ manual cleanup.

---

## 5. Decisions and why

1. **Cloudflare-native (Option B) over a form provider.** Providers can't host
   `/admin`, can't model five statuses, and gate file access behind paid tiers.
   Cost stays €0 on free tiers.
2. **First-party email OTP instead of Cloudflare Access.** Access path policies
   need a zone the company owns; Pages-wide Access would hide the public site.
   OTP works on `orvanu.pages.dev` today and is replaced if a domain arrives.
3. **Initial administrator:** `orvanutech@gmail.com` (approved by the owner).
   Using the same address for Resend matters: on the free tier mail can only go
   to the account owner until a domain is verified.
4. **About layout (approved):** copy → two fact cards (2019 / 15) → eight
   expertise chips; the old 01/02/03 value rows removed; no founding year stated.
5. **Retention:** attachments 90 days, records manual — matches how the business
   actually works at this stage.
6. **Bindings stay in the dashboard**, not in `wrangler.toml` (see §3).

---

## 6. Session history

### Session A — 23 Nov 2026: inquiry form and backend

- Built the "Start Your Project" form (fields, optional WhatsApp/company/service/
  budget/timeline, description, ≤3 attachments, honeypot, Turnstile slot).
- Built `POST /api/inquiry`: validation, rate limiting, R2 storage, D1 record,
  Resend email with every field, submission time and expiring links, `notified`
  flag in the response; 503 (not fake success) when unconfigured.
- Built `GET /api/file` with HMAC signing (tampered → 403, expired → 410).
- Verified in the browser: validation messages, drag & drop add/remove, `.txt`
  rejection, "Sending…" state, success panel with reference, 390 px layout with
  no overflow.
- Test suite `_inspect/test-inquiry.mjs` — 15 cases; now 16 after adding an
  explicit rate-limit case.

### Session B — 23/24 Nov 2026: admin dashboard

- Wrote `schema.sql`, `functions/_lib/core.js` and all `functions/api/admin/*`.
- Wrote the vanilla dashboard UI (textContent-only rendering, tabs with counts,
  debounced search, detail pane, status select, DELETE confirmation, pager).
- Hardened `_headers` and `robots.txt`.
- Admin API suite `_inspect/test-admin.mjs` — now **32/32 passing**.
- Browser-verified the whole flow against `wrangler pages dev`: sign-in screen →
  code → dashboard → list → detail → status change → tabs update.
- Deployed: PR #7 → `b2ed250` → workflow run #9 **SUCCESS**.

### Session C — 24 Nov 2026: About rewrite + this log

- Replaced the About copy with facts only (2019 experience explicitly *before*
  the company, 15 people, no founding year), added the two fact cards and the
  eight expertise chips, removed the old numbered value rows, added responsive
  styles (single column below 480 px).
- Verified locally at 552 px and inside a 390 px iframe: 2 cards → 1 column,
  chips wrap to 4 rows, `scrollWidth == clientWidth` (no horizontal overflow).
- Deployed: PR #8 → `01ddcfa` → workflow run #10 **SUCCESS**; live HTML contains
  `about-facts`, `about-chips`, no `about-values`.

### Session D — 24 Nov 2026: AI service, experience, footer HQ, team

- Added the AI solutions service card and replaced §04 with four anonymised
  SELECTED EXPERIENCE cards (team work elsewhere, no client names or endorsement).
  Deployed via PR #12, workflow run #14 **SUCCESS**; old concept cards removed.
- Footer CONNECT column now carries HEADQUARTERS / Utrecht, Netherlands with a
  15 px pin. No street address, no map; existing email/social links untouched.
- Team: Mohammad Behbahani added second (AI Engineer & Data Scientist, exact
  LinkedIn URL), distinct from Mohammadreza Akbari. Four-column desktop grid,
  horizontal rows below 1200 px, stacked cards below 620 px. New 4:5 portraits
  for Yousef and Mohammad; the stated team count deliberately stays at 15.
- Image generation was unavailable (invalid credential), so the first pass used
  hand-built SVG. Owner-supplied 16:10 visuals now replace all four in
  `public/assets/experience/`; the section note still states they are selected
  team experience, not ORVANU client work.
- Deployment lesson: a Wrangler-managed Pages project wipes dashboard-set plain
  vars on each deploy. `[vars]` and the D1 binding must stay in `wrangler.toml`.
- Verified: `node --check`, four photos at 576×720, no horizontal overflow at
  1440/1024/390 px, no site-code console errors.

### Session E — 24 Nov 2026: Vitelize featured draft (deployed)

- Added a fifth, full-width split card for Vitelize Health as the first item in
  §04. It uses the supplied category, copy, tags and external CTA, with a short
  `Draft · public-site reference` badge near the title. No ORVANU ownership,
  client engagement, clinical work or results are claimed.
- At the owner's direction, replaced the locally composed visual with the
  previously shared Healix telemedicine Dribbble concept image, centre-cropped
  to 1120×700 JPEG (186 KB) and labelled `Concept reference — not a Vitelize
  screenshot`. It is not presented as Vitelize branding or an ORVANU-created
  interface. The original illustration is backed up in the temp folder.
- Replaced `ai-support.jpg` with the owner-supplied customer-support image,
  cropped to the same 16:10 format.
- Fixed review findings: the ≤480px featured overrides now come after the base
  rules; the CTA is a clear purple button; the badge is visible near the title;
  and the static checks now pin the full existing article blocks, paragraph
  order, JPEG dimensions, effective CSS, badge and approved image exceptions.
- Verification: `_inspect/verify-vitelize-draft.mjs` passes all 22 checks; a
  deliberately mutated HTML copy fails only the preservation check; `node
  --check` exits 0; five cards load at 1440/1024/390 px with no overflow; the
  feature image is 1120×700; the CTA and mobile computed styles are correct;
  the long draft sentence is absent; the external link is correct with
  `noopener noreferrer`; no site console errors. Desktop/tablet split and
  mobile stack confirmed.
- Deployed: PR #15 → `03200fe` → workflow run #17 **SUCCESS**. Live HTML contains
  the Vitelize card, short draft badge, concept caption and full section note;
  the live image is a 1120×700 JPEG (190 KB).

### Session F — 24 Nov 2026: navigation label draft (not deployed)

- Changed the `#work` nav label from **Experience** to **Projects** in
  `public/index.html`. The desktop and mobile menus share one `#site-nav`
  element, so one edit covers both; the footer `EXPLORE` link was changed too.
- `href="#work"`, all other menu items, the portfolio section headline, card
  content, styling and menu behaviour are unchanged. Other "Experience" strings
  in the Vitelize card copy were deliberately left alone.
- Verified at 1440/390 px: labels and links, footer link, headline, menu
  open/close, click-to-scroll landing at the 86 px sticky-header offset, zero
  horizontal overflow and no console errors (two consecutive green runs).
  The initial mobile failure was a test-timing artifact — the fixed 1.2 s sleep
  sampled a 7,835 px smooth scroll mid-animation; the test now waits for the
  settled position.
- Local preview opened in the Review pane. **Not deployed** — awaiting approval.

### Session G — 24 Nov 2026: Vitelize card revision draft (not deployed)

- Revised the existing first featured card in `public/index.html` with the
  owner's exact new title, category, single-paragraph description, four tags
  and three statistics. The statistics read strictly as published
  partner-network facts (`USA / Market`, `9 / Partner Locations`,
  `2 / U.S. States`), sourced inline to the Vitelize partner-network page.
- Kept the approved visual, its `Concept reference — not a Vitelize screenshot`
  caption, the short `Draft · public-site reference` badge, the full section
  note, the CTA, layout and the four other cards unchanged. The owner waived
  contribution confirmation; no contribution, client or performance claim was
  added.
- Added compact `.exp-stats` styles in `public/styles.css` with effective
  ≤480px overrides. Added `_inspect/verify-vitelize-revision.mjs`; spec and plan
  amendments live in `docs/superpowers/`.
- Verification: static script 17/17 checks pass; `node --check public/script.js`
  exits 0; headless Chrome at 1440/1024/390 px confirms exact DOM copy, stats,
  source link, tags, image, CTA, preserved caption/badge, four unchanged card
  sources, zero overflow, correct split/stacked layout and no site console
  errors (only the unrelated Cloudflare Turnstile error was filtered). Local
  preview opened in the Review pane.
- Pushed to feature branch `feat/vitelize-card-revision` only. **No PR, merge or
  deploy** — awaiting explicit approval. Note: this branch's `index.html` also
  carries Session F's local `Experience → Projects` nav label change because
  the workspace has no Git binary to separate the two edits.

---

## 7. Bugs found and fixed (so they are not re-introduced)

| Symptom | Cause | Fix |
| --- | --- | --- |
| `status update without CSRF header` test returned 200 | the test helper overwrote an explicit `x-orvanu-admin: 0` with `1` | helper only sets the header when absent; test now covers wrong value *and* absent header, and that the status stayed unchanged |
| Admin suite 14/30 after a restart | stale `.wrangler` state (`no such table`, `SQLITE_BUSY`, "Directory named d1:storage not found") | kill all wrangler node + `workerd` processes, delete `.wrangler/inquiries`, apply `node tools/dev-db.mjs`, restart, then test |
| Second branch push silently deleted the first commit's files | `push-branch.js` always built its tree from `main` | it now bases on the branch's own tree when the branch exists |
| Detail pane never showed the current status | `renderDetail` had no pill; update code looked for `.pill` inside the pane | status pill added next to the name and updated on save |
| PR body mentioned an unrelated "team section rebuild" | hard-coded string in `merge-pr.js` | body now derives from the title |

Test-only note: the form suite sends a unique synthetic `cf-connecting-ip` per
case, because Cloudflare sets that header in production and the endpoint limits
5 submissions/hour/connection. Locally nothing sets it, so the header passes
through — and a real client cannot spoof it.

---

## 8. Running locally

```powershell
# static preview of the site (port 3000)
node tools/serve.js

# full stack with D1 + R2 (port 3006). Bindings are not in wrangler.toml.
& "_inspect\dev\node_modules\.bin\wrangler.cmd" pages dev public --port 3006 `
    --d1=DB --r2=INQUIRIES --persist-to ".wrangler/inquiries" `
    --compatibility-date=2026-11-23
```

First run creates an empty local database. Then **stop the server** and run
`node tools/dev-db.mjs` (applies `schema.sql`), then start it again. Do not run
two wrangler instances against the same persist dir.

`.dev.vars` (git-ignored) holds local-only values: `MAIL_MODE=console`,
`FILE_SIGNING_SECRET`, `SESSION_SECRET`, `PUBLIC_SITE_URL=http://localhost:3006`,
`INQUIRY_TO_EMAIL`, `INQUIRY_FROM_EMAIL`, `ADMIN_EMAILS=yousef@orvanu.test`.
With `MAIL_MODE=console`, sign-in codes and notification emails print to the
wrangler terminal.

### Tests

```powershell
$env:BASE = "http://127.0.0.1:3006"
node _inspect/test-inquiry.mjs     # 16 cases
node _inspect/test-admin.mjs       # 32 cases (reads the OTP from $env:WRANGLER_LOG)
```

If the form suite starts returning 429, the local rate-limit rows are full:
stop the server, `DELETE FROM rate_limits` in the local D1 file, restart.

---

## 9. Deployment tooling

**Git is not installed on this machine.** Deploys go through the GitHub API:

```powershell
# token lives in Windows Credential Manager, target:
#   GitHub - https://api.github.com/yousefpanahi
# Never print it. Read it into $env:GITHUB_TOKEN for the two scripts below.

node tools/push-branch.js <branch> "<commit message>" <file...>
node tools/merge-pr.js    <branch> "<PR title>"
```

`merge-pr.js` opens (or reuses) the PR, squash-merges to `main`, waits for the
deploy run and prints `RESULT: SUCCESS|FAILURE`. It can occasionally print
`ERROR: fetch failed` *after* a successful merge — check the Actions tab.

Deploy verification built into the workflow: live `https://orvanu.pages.dev/`
must return 200 and contain "ORVANU", otherwise the run fails.

`_inspect/remote-tree.mjs <branch>` compares the local tree to a branch by git
blob SHA — the fastest way to confirm a push actually contains what you think,
and to spot files that exist on only one side.

### Network reality on this machine

Cloudflare (`pages.dev`, dashboard) is unreachable directly. Two working ways to
look at production:

- `https://orvanu-pages-dev.translate.goog/<path>?_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en&_x_tr_pto=wapp` — good for HTML, returns a 400 page for JSON.
- `https://api.allorigins.win/raw?url=<urlencoded>` — good for JSON, but rate-limits quickly.

GitHub is reachable. `r.jina.ai` returns 451 here. npm must be run as `npm.cmd`.

---

## 10. Verified test evidence

Latest runs (23 Nov 2026, local wrangler on :3006, clean D1):

- `_inspect/test-admin.mjs` → **32/32 pass**: unauthenticated access blocked,
  forged cookie rejected, generic login response for non-admin addresses, code
  delivered, wrong code 401, CSRF-less and wrong-header mutations 403, session
  cookie flags, submission stored + emailed, list/search/filter/paging, detail
  with attachments, exact-byte download, status transitions, invalid status 422,
  delete cascades to R2, 404 afterwards, login rate limit 429, logout revokes.
- `_inspect/test-inquiry.mjs` → **16/16** expected statuses: valid submission,
  gmail accepted, optional fields empty, required/malformed/phone/extension/
  magic-byte/size/count/tampered-value 422s, honeypot silently ignored, per-
  connection 429 on the sixth submission, 405/400/410 on the file route.

Raw output: `_inspect/admin-test-results.txt`, `_inspect/inquiry-test-results.txt`.

---

## 11. What is finished

- Public site + responsive layout; team section; concept work clearly labelled.
- Inquiry form with a real backend, private file storage, email notification.
- Private `/admin` with OTP auth, five statuses, search/filter/sort, secure
  downloads, delete and purge, audit log.
- About section rewritten with facts only, fact cards and eight expertise chips.
- Docs: system plan, form setup, admin operations, this log.

## 12. Open items (owner)

| # | Item | Who |
| --- | --- | --- |
| 1 | Create D1 `orvanu-inquiries` (EU) and run `schema.sql`; bind as `DB` | owner, Cloudflare dashboard |
| 2 | Create R2 bucket `orvanu-inquiries` (EU, private); bind as `INQUIRIES`; add a 90-day lifecycle rule | owner |
| 3 | Add secrets: `RESEND_API_KEY`, `FILE_SIGNING_SECRET`, `SESSION_SECRET`, `ADMIN_EMAILS=orvanutech@gmail.com`, `INQUIRY_TO_EMAIL`, `INQUIRY_FROM_EMAIL`, `PUBLIC_SITE_URL` | owner |
| 4 | Create the Turnstile widget and paste the **site key** into `TURNSTILE_SITEKEY` in `public/form.js` (currently empty), then add `TURNSTILE_SECRET_KEY` to Pages | owner + agent |
| 5 | Prove the chain end to end: sign in at `/admin`, submit one inquiry with an attachment, confirm the email arrives | owner |
| 6 | Verify the Resend free-tier sender (`onboarding@resend.dev`) actually delivers to the inbox | owner |
| 7 | If the About copy should change, edit the block in `public/index.html` (`#about`) — facts only | owner + agent |
| 8 | Optional: verify a domain in Resend to send from `@orvanu.com`-style addresses and to email anyone | later |

Nothing in the open list blocks the site from being live; items 1–4 block the
form and dashboard from actually working.

---

## 13. Rules that must never be broken

- Never fabricate clients, testimonials, revenue, partnerships, certifications,
  case studies or team credentials.
- Demonstration work stays labelled as a concept.
- No secrets in code, commits or chat — GitHub Actions secrets / Pages variables only.
- Don't delete or replace the live Pages project or `orvanu.pages.dev` without
  explicit approval.
- No team photos, personal info or LinkedIn URLs without approval.
- Free tiers only unless a paid service is explicitly approved.
- Iran ↔ international legal/tax/sanctions questions: flag for professional
  review, never assume legality.

---

## 14. How to use this file in a new session

1. Read this file, then `AGENTS.md` for the hard rules.
2. Check §1 for what is live and §12 for what is still open.
3. Confirm the repo state before editing: `node _inspect/remote-tree.mjs main`
   (needs `GITHUB_TOKEN`) lists local `CHANGED` / `NEW` / `REMOTE-ONLY` files.
4. Make changes on a branch, verify locally (§8), then deploy with
   `tools/push-branch.js` + `tools/merge-pr.js`.
5. Append a dated entry to §6 when you finish a meaningful piece of work.
