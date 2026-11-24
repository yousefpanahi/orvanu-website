# Inquiry Fields Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove WhatsApp number, company name, budget and timeline from the public inquiry form while leaving the API, database and admin view intact.

**Architecture:** The static page defines the form in `public/index.html`; `public/form.js` validates and submits it via `fetch`. A focused Node script pins the exact public-field set, preserved hooks and untouched backend/admin files before browser verification.

**Tech Stack:** Static HTML/CSS/JS, Node verification script, local static server on port 3000, in-app browser.

**Spec:** `docs/superpowers/specs/2026-11-24-inquiry-fields-removal-design.md`

## Global Constraints

- Remove only `phone`, `company`, `budget`, `timeline` from the public form and its client submit payload.
- Keep `name`, `email`, `service`, `description`, `files`, `website` honeypot, Turnstile slot, submit button and success panel.
- Leave `functions/api/inquiry.js`, `schema.sql` and `public/admin/` unchanged.
- Do not alter the Approach section timeline steps, portfolio copy, layout, colours or typography.
- Deploy only after static and browser verification pass; the owner's `go on production` message is the deployment approval.

## Review Focus

- Stale labels/help text must not remain in the privacy note — pinned by absence of `WhatsApp` inside the form.
- Removed field names must not leak into `FormData` — pinned by exact payload lines and a browser submit capture.
- Server/admin historical display must keep working — pinned by presence of the four names in API/schema/admin files.
- Required-field validation must still work — pinned by the exact `fields` array and a browser validation check.
- Grid/responsive layout must not overflow — pinned by browser checks at 1440/390 px.

---

### Task 1: Write the failing verification script

**Files:**
- Create: `_inspect/verify-inquiry-fields.mjs`
- Read: `public/index.html`, `public/form.js`, `functions/api/inquiry.js`, `schema.sql`, `public/admin/admin.js`

- [ ] **Step 1: Write assertions**

Create a script that isolates `#inquiry-form` and asserts the exact remaining `name=` set, absence of removed labels/ids/names, absence of the WhatsApp privacy sentence, presence of preserved hooks, exact `fields` array, absence of `isPhone` and removed payload lines, exact remaining payload lines, and unchanged API/schema/admin markers.

- [ ] **Step 2: Run it to verify it fails**

Run: `node _inspect/verify-inquiry-fields.mjs`
Expected: FAIL on removed fields still present.

### Task 2: Edit the public form and submit logic

**Files:**
- Modify: `public/index.html` — remove four `.field` blocks and the WhatsApp privacy sentence.
- Modify: `public/form.js` — remove `phone` from `fields`, remove `isPhone` and its validation branch, remove four payload lines.

- [ ] **Step 1: Apply the minimal edits**
- [ ] **Step 2: Run the verification script**

Run: `node _inspect/verify-inquiry-fields.mjs`
Expected: all checks PASS.

- [ ] **Step 3: Check JavaScript syntax**

Run: `node --check public/form.js`
Expected: exit 0.

### Task 3: Browser verification and preview

- [ ] **Step 1: Confirm the rendered form**

At 1440/390 px: no removed labels/controls, preserved fields and honeypot/Turnstile/submit hooks visible, zero horizontal overflow, no site console errors.

- [ ] **Step 2: Capture the submit payload**

Stub `fetch`, fill valid values, submit, and assert the captured `FormData` keys contain only the remaining public fields plus the Turnstile token when present.

- [ ] **Step 3: Show localhost preview**

Open `http://localhost:3000/#contact` in the Review pane.

### Task 4: Push, merge and verify production

**Files:**
- Modify: `docs/PROJECT-LOG.md` — record the change and deployment.
- Remote: create a feature branch containing the form change, the team photo and the log update.

- [ ] **Step 1: Push the feature branch**
- [ ] **Step 2: Merge via PR and wait for deploy workflow**
- [ ] **Step 3: Verify live HTML and team photo**
