# Vitelize Health Featured Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clearly labelled draft Vitelize Health portfolio entry as a full-width featured card above the four unchanged selected-experience cards.

**Architecture:** The existing static single-page site renders the experience section from `public/index.html` and `public/styles.css`. The new entry will be the first child of `.experience-grid`, spanning both columns on desktop and stacking below the section heading on smaller screens. A small Node script in `_inspect/` will pin the exact copy, link, image path, CSS hooks, and preservation of the four existing cards before browser verification.

**Tech Stack:** Static HTML/CSS, 1120×700 JPEG image, Node verification script, in-app browser and local static server.

**Spec:** `docs/superpowers/specs/2026-11-24-vitelize-featured-draft-design.md`

## Owner-directed amendments (24 November 2026)

- Use the owner's previously shared Healix telemedicine Dribbble image as the
  Vitelize card visual, cropped to 1120×700 and labelled as a concept reference.
  This supersedes Task 2's original-illustration/no-Dribbble instruction for this
  one approved file.
- Keep the owner-approved replacement of `ai-support.jpg` with the supplied
  customer-support image.
- Replace the long on-card draft sentence with a short badge near the title:
  `Draft · public-site reference`. The section note keeps the full integrity
  wording.
- Add explicit CTA styling and place the ≤480px featured overrides after the base
  featured rules so they take effect.

## Global Constraints

- Do not deploy, merge, or push to `main`.
- Do not reuse the attached Dribbble image, Vitelize screenshots, logos, or branding without permission.
- Do not claim clinical systems, prescriptions, medical records, backend work, results, user counts, revenue, clinical outcomes, or ORVANU ownership/client engagement.
- Keep the four existing portfolio cards and their image paths unchanged.
- Use the supplied copy verbatim:
  - Category: `HEALTHTECH / DIGITAL EXPERIENCE`
  - Title: `Vitelize Health — Digital Healthcare Experience`
  - Subtitle: `Making integrated healthcare easier to discover and navigate.`
  - Tags in order: `HealthTech`, `Healthcare Web Experience`, `Patient Journeys`, `Partner Discovery`, `B2B & B2C`, `UX & Web Development`
  - CTA: `View Live Website` → `https://www.vitelizehealth.com/`
- Image must be labelled illustrative, match the existing 16:10 ratio, and be optimized.
- No Git binary is installed; use `tools/push-branch.js` only after the user approves the local result.

## Review Focus

- Exact supplied copy and tag order: pinned by the verification script in Task 3.
- The four existing cards staying byte-for-byte equivalent in titles and image paths: pinned by the verification script in Task 3.
- Draft/integrity language remaining visible: pinned by assertions for `.exp-draft-note` and the updated `.work-note` in Task 3.
- External link safety: pinned by assertions for exact `href`, `target="_blank"`, and `rel="noopener noreferrer"` in Task 3.
- Responsive layout and image loading: browser assertions at 1440/1024/390 px in Task 5.

---

### Task 1: Create the failing verification script

**Files:**
- Create: `_inspect/verify-vitelize-draft.mjs`

**Interfaces:**
- Consumes: current `public/index.html`, `public/styles.css`, and `public/assets/experience/`.
- Produces: `node _inspect/verify-vitelize-draft.mjs` exit code 0 only when the draft meets the spec.

- [ ] **Step 1: Write the verification script**

Create `_inspect/verify-vitelize-draft.mjs` that reads the files as UTF-8 and asserts:

- `index.html` contains an `<article class="experience-card experience-feature"` before the first existing `<article class="experience-card" data-sector="ai"`.
- That article contains exactly:
  - `<span class="exp-visual-label">HEALTHTECH / DIGITAL EXPERIENCE</span>`
  - `<h3>Vitelize Health — Digital Healthcare Experience</h3>`
  - `<p class="exp-subtitle">Making integrated healthcare easier to discover and navigate.</p>`
  - The two supplied description paragraphs, in order.
  - The six supplied tags, in order.
  - `<a class="button exp-link" href="https://www.vitelizehealth.com/" target="_blank" rel="noopener noreferrer">`
  - A visible `.exp-draft-note` containing `Draft` and `contribution`.
  - An `<img class="exp-art">` with `src="assets/experience/vitelize-health.jpg"`, `width="1120"`, `height="700"`, `loading="lazy"`, and alt text containing `illustrative`.
- The four existing article titles and image paths remain present in their original order:
  - `ai-support.jpg` / `AI Customer Support Chatbot`
  - `ai-travel.jpg` / `AI Travel Recommendation System`
  - `scheduled-delivery.jpg` / `Scheduled Delivery Business Line`
  - `yard-management.jpg` / `Yard Management System`
- `.work-note` contains `draft public-site reference`, `exact contribution is unconfirmed`, and `no ORVANU client relationship is claimed`.
- `styles.css` contains `.experience-feature{grid-column:1/-1` and a `@media(max-width:900px)` rule containing `.experience-feature{grid-template-columns:1fr}`.
- `public/assets/experience/vitelize-health.jpg` exists, starts with JPEG magic bytes `FF D8`, and is at least 20 KB.

Use plain Node assertions and print one summary line per check. Exit non-zero on the first failure.

- [ ] **Step 2: Run the script to verify it fails**

Run: `node _inspect/verify-vitelize-draft.mjs`

Expected: FAIL because the feature article, CSS, and image do not exist yet.

- [ ] **Step 3: Checkpoint locally**

No commit yet. The failing script is the test baseline.

---

### Task 2: Create the original illustrative image

**Files:**
- Create: `public/assets/experience/vitelize-health.jpg`

**Interfaces:**
- Consumes: the design doc's no-branding/no-claims constraints.
- Produces: the image path asserted by Task 1 and used by Task 3.

- [ ] **Step 1: Generate the visual**

Create an original premium healthcare digital-experience illustration: a calm clinical/wellness setting with an abstract web-interface panel showing program discovery, location browsing, and member/partner inquiry paths. Use purple/lilac accents consistent with ORVANU. Do not reproduce the Vitelize logo, real screenshots, patient data, medical statistics, or the attached Dribbble design. Use the available image-generation tool first; if it is unavailable, compose the same illustration locally with HTML/CSS/SVG and rasterize it to JPEG.

- [ ] **Step 2: Normalize the file**

Crop/resize to exactly 1120×700 (16:10), export as optimized JPEG at quality ≈84, and write to `public/assets/experience/vitelize-health.jpg`.

- [ ] **Step 3: Verify the image alone**

Run: `node -e "const b=require('fs').readFileSync('public/assets/experience/vitelize-health.jpg'); if(b[0]!==0xff||b[1]!==0xd8) process.exit(1); console.log(b[0].toString(16),b[1].toString(16),Math.round(b.length/1024)+'KB');"`

Expected: `ff d8` followed by a file size of at least 20 KB.

- [ ] **Step 4: Checkpoint locally**

No commit yet. Keep the image local until the full draft passes.

---

### Task 3: Add the featured HTML card

**Files:**
- Modify: `public/index.html` — insert the new article as the first child of `.experience-grid` at approximately line 422; update `.work-note` at approximately line 488.
- Test: `_inspect/verify-vitelize-draft.mjs`

**Interfaces:**
- Consumes: `public/assets/experience/vitelize-health.jpg` from Task 2.
- Produces: the exact DOM hooks asserted by Task 1 and consumed by Task 4's CSS.

- [ ] **Step 1: Insert the article**

Add this structure as the first child of `.experience-grid`, before the existing AI customer support article:

```html
<article class="experience-card experience-feature" data-sector="healthtech" data-anon="true">
  <div class="exp-visual">
    <span class="exp-visual-label">HEALTHTECH / DIGITAL EXPERIENCE</span>
    <img class="exp-art" src="assets/experience/vitelize-health.jpg" alt="Illustrative healthcare digital-experience interface; not a Vitelize Health screenshot" width="1120" height="700" loading="lazy" decoding="async">
    <span class="exp-illustration-note">Illustrative visual — not a Vitelize screenshot</span>
  </div>
  <div class="exp-body">
    <span class="exp-sector">Healthcare · Digital experience</span>
    <h3>Vitelize Health — Digital Healthcare Experience</h3>
    <p class="exp-subtitle">Making integrated healthcare easier to discover and navigate.</p>
    <div class="exp-description">
      <p>A digital health experience for Vitelize Health, connecting physician-guided metabolic care, personalized training, nutrition programs, and provider partnerships through a clear, user-friendly online journey.</p>
      <p>The website helps prospective members understand available programs, explore participating locations, and connect with the appropriate care or partnership team.</p>
    </div>
    <div class="service-tags">
      <span>HealthTech</span><span>Healthcare Web Experience</span><span>Patient Journeys</span><span>Partner Discovery</span><span>B2B &amp; B2C</span><span>UX &amp; Web Development</span>
    </div>
    <a class="button exp-link" href="https://www.vitelizehealth.com/" target="_blank" rel="noopener noreferrer">View Live Website
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
    </a>
    <p class="exp-draft-note">Draft — public-site reference; exact team contribution unconfirmed. This is not an ORVANU client claim.</p>
  </div>
</article>
```

- [ ] **Step 2: Update the section note**

Replace the existing `.work-note` text with:

`Selected professional experience: the four cards above were delivered by members of our team while working with other organisations, not by ORVANU as a vendor. Client names are withheld and no endorsement is implied. The Vitelize Health entry is a draft public-site reference; the team's exact contribution is unconfirmed and no ORVANU client relationship is claimed.`

- [ ] **Step 3: Run the verification script**

Run: `node _inspect/verify-vitelize-draft.mjs`

Expected: FAIL only on the missing `.experience-feature` CSS rules.

- [ ] **Step 4: Checkpoint locally**

No commit yet. HTML is in place; CSS remains.

---

### Task 4: Add the featured-card styles

**Files:**
- Modify: `public/styles.css` — add `.experience-feature` rules immediately after the existing `.work-note` rule near lines 40–43; extend the existing `@media(max-width:900px)` rule near line 44; extend the existing `@media(max-width:480px)` rule near line 24.
- Test: `_inspect/verify-vitelize-draft.mjs`

**Interfaces:**
- Consumes: `.experience-feature`, `.exp-subtitle`, `.exp-description`, `.exp-link`, `.exp-draft-note`, and `.exp-illustration-note` from Task 3.
- Produces: desktop split layout and mobile stack asserted by Task 1 and visually checked in Task 5.

- [ ] **Step 1: Add desktop split styles**

Append CSS equivalent to:

```css
.experience-feature{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,42%) minmax(0,1fr)}
.experience-feature .exp-visual{display:flex;flex-direction:column;justify-content:center;padding:18px}
.experience-feature .exp-body{padding:28px 30px}
.experience-feature .exp-subtitle{font-size:15px;font-weight:650;color:#50485c;margin:12px 0 10px}
.experience-feature .exp-description p{font-size:14px;color:#6e6878;line-height:1.7;margin:0 0 10px}
.experience-feature .service-tags{margin-top:auto;padding-top:12px}
.experience-feature .exp-link{margin-top:18px;align-self:flex-start}
.experience-feature .exp-draft-note{margin:14px 0 0;font-size:11px;color:#8a8095;line-height:1.6}
.exp-illustration-note{position:relative;display:block;margin-top:8px;font-size:9px;letter-spacing:.06em;color:#8a8095}
```

Keep the rule text minified in the style of the existing file.

- [ ] **Step 2: Add responsive rules**

In `@media(max-width:900px)`, add `.experience-feature{grid-template-columns:1fr}`.

In `@media(max-width:480px)`, add:

```css
.experience-feature .exp-body{padding:22px 20px 24px}
.experience-feature .exp-visual{padding:14px 14px 0}
.experience-feature .exp-subtitle{font-size:14px}
```

- [ ] **Step 3: Run the verification script**

Run: `node _inspect/verify-vitelize-draft.mjs`

Expected: PASS with every check reported OK.

- [ ] **Step 4: Checkpoint locally**

No commit yet. The local draft now satisfies the static checks.

---

### Task 5: Verify in the browser

**Files:**
- Read: `public/index.html`, `public/styles.css`, `public/assets/experience/vitelize-health.jpg`
- Test: in-app browser at `http://localhost:3000/#work`

**Interfaces:**
- Consumes: completed HTML/CSS/image from Tasks 2–4.
- Produces: visual evidence and the `node --check` result for the final approval message.

- [ ] **Step 1: Run the available code check**

Run: `node --check public/script.js`

Expected: exit code 0.

- [ ] **Step 2: Start the local static server if needed**

Run: `node tools/serve.js` in the background.

Expected: `http://localhost:3000/` responds HTTP 200.

- [ ] **Step 3: Assert DOM, image, link, and overflow**

Open `http://localhost:3000/#work` in the browser and evaluate:

- First `.experience-card` has class `experience-feature`.
- Its `.exp-art` has `naturalWidth === 1120`, `naturalHeight === 700`, and `complete === true`.
- Its `.exp-link` has `href === "https://www.vitelizehealth.com/"`, `target === "_blank"`, and `rel` containing `noopener` and `noreferrer`.
- Four existing `.exp-art` sources are unchanged.
- `document.documentElement.scrollWidth === document.documentElement.clientWidth` at 1440 px, 1024 px, and 390 px.
- At 1440/1024 px, the feature card's `.exp-visual` and `.exp-body` are side by side; at 390 px they are stacked.

- [ ] **Step 4: Capture and show previews**

Capture `#work` at 1440 px and 390 px, save under `C:\Users\snapp\AppData\Local\Temp\opencode\`, and show them in the Review pane.

- [ ] **Step 5: Check console errors**

Read browser console errors and ignore only known Cloudflare Turnstile/challenge errors unrelated to this static page.

Expected: no errors from site HTML, CSS, images, or JS.

---

### Task 6: Record the work and hand off for approval

**Files:**
- Modify: `docs/PROJECT-LOG.md` — append a dated draft entry under §6.
- No production files after this point.

**Interfaces:**
- Consumes: passing results from Tasks 1 and 5.
- Produces: a complete local draft ready for the user's approve/reject decision.

- [ ] **Step 1: Append the log entry**

Record the new draft entry, exact files changed, verification results, and that it is not deployed. Do not claim a client relationship or confirmed engineering contribution.

- [ ] **Step 2: Summarize changed files**

Report: `public/index.html`, `public/styles.css`, `public/assets/experience/vitelize-health.jpg`, `_inspect/verify-vitelize-draft.mjs`, `docs/PROJECT-LOG.md`, plus the design and plan documents.

- [ ] **Step 3: Stop for approval**

Do not push a branch, open a PR, merge, or deploy. Wait for the user to approve the result.

- [ ] **Step 4: Only after explicit approval, push a feature branch**

Use `tools/push-branch.js` with a branch such as `feat/vitelize-featured-draft` and the changed production files. Still do not merge or deploy until separately instructed.
