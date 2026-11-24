# Vitelize Health Card Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the copy, category, tags and statistics on the existing first featured portfolio card, keeping its visual, layout, section note and all four other cards unchanged.

**Architecture:** The static site renders `#work` from `public/index.html` and `public/styles.css`. Revision 2 edits only the existing `.experience-feature` article body and adds one compact `.exp-stats` rule block; no image or layout changes. A focused Node script pins the exact new copy, stats, tags, preserved visual hooks, CTA safety and the four untouched cards before browser verification.

**Tech Stack:** Static HTML/CSS, Node verification script, local static server on port 3000, headless Chrome CDP at 1440/1024/390 px.

**Spec:** `docs/superpowers/specs/2026-11-24-vitelize-featured-draft-design.md`

## Global Constraints

- Do not deploy, merge or push to `main`; push a feature branch only, after the local preview passes.
- Keep `public/assets/experience/vitelize-health.jpg`, its alt text, and the `Concept reference — not a Vitelize screenshot` caption unchanged.
- Keep the `Draft · public-site reference` badge and the full `.work-note` wording unchanged.
- Keep the four existing portfolio articles byte-for-byte unchanged (pinned in `_inspect/experience-baseline.txt`).
- Exact new values: category `HealthTech · United States`; title `Vitelize Health — Digital Healthcare Platform`; one-paragraph description as supplied; stats `USA — Market`, `9 — Partner Locations`, `2 — U.S. States` in that order; tags `HealthTech`, `Digital Healthcare`, `Partner Discovery`, `Web Platform`; CTA `View Live Website` → `https://www.vitelizehealth.com/` with `target="_blank" rel="noopener noreferrer"`.
- No patient counts, performance improvements, technical contributions, client claims or endorsement. Stats are published partner-network facts only.

## Review Focus

- Stats must read as partner-network facts, not customers/patients/achievements — pinned by exact stat strings plus a check that forbidden claim words are absent from the card.
- Supplied copy and tag order must be verbatim — pinned by exact strings in the verification script.
- Existing visual, badge, caption and section note must survive — pinned by exact hooks.
- Four other cards must stay byte-for-byte identical — pinned against `_inspect/experience-baseline.txt`.
- Compact stats must not cause overflow at 390 px — pinned by CDP overflow and layout checks.

---

### Task 1: Write the failing verification script

**Files:**
- Create: `_inspect/verify-vitelize-revision.mjs`
- Read: `_inspect/experience-baseline.txt`, `public/index.html`, `public/styles.css`

**Interfaces:**
- Consumes: exact copy from Revision 2 of the spec and the existing production baseline.
- Produces: `node _inspect/verify-vitelize-revision.mjs` exit 0 only when the revision is complete.

- [ ] **Step 1: Write assertions**

Create the script to read the three files as UTF-8, isolate the first `.experience-feature` article, and assert:

- Exact category `<span class="exp-sector">HealthTech · United States</span>`.
- Exact title `<h3>Vitelize Health — Digital Healthcare Platform</h3>`.
- Exact single-paragraph description inside `.exp-description`, and that the two old description paragraphs are absent.
- A `<div class="exp-stats">` containing, in order, `<strong>USA</strong><span>Market</span>`, `<strong>9</strong><span>Partner Locations</span>`, `<strong>2</strong><span>U.S. States</span>`, plus a source link to `https://www.vitelizehealth.com/partner-network/`.
- The four tags in the supplied order and that the six old tags are absent.
- Unchanged image `src`, alt, caption, draft badge, CTA href/target/rel and section note.
- Absence of the words `patient count`, `customers`, `performance`, `we built`, `our development` from the featured article.
- `styles.css` contains `.exp-stats{` with an explicit `gap` and `.exp-stats strong{` with an explicit `font-size`, plus responsive rules inside the existing `max-width:480px` media block after the base rules.
- The four existing articles joined by `\n---BLOCK---\n` equal the baseline file.

Print `OK`/`FAIL` per check, collect all failures, exit 1 if any fail.

- [ ] **Step 2: Run to verify it fails**

Run: `node _inspect/verify-vitelize-revision.mjs`
Expected: FAIL on the new category/title/description/stats/tags checks.

---

### Task 2: Update the featured card HTML

**Files:**
- Modify: `public/index.html` — only the first `.experience-feature` article body.

**Interfaces:**
- Consumes: unchanged image, caption, badge and CTA from the existing article.
- Produces: DOM hooks `.exp-stats` consumed by Task 3.

- [ ] **Step 1: Replace the card body copy**

Replace sector, title, draft badge order, description paragraphs (one paragraph), and tag spans with the exact Revision 2 values from the spec. Keep the badge, image, caption and CTA exactly as they are.

- [ ] **Step 2: Add the statistics block**

Insert after `.exp-description` and before `.service-tags`:

```html
<div class="exp-stats" aria-label="Published Vitelize partner-network facts">
  <div><strong>USA</strong><span>Market</span></div>
  <div><strong>9</strong><span>Partner Locations</span></div>
  <div><strong>2</strong><span>U.S. States</span></div>
  <a href="https://www.vitelizehealth.com/partner-network/" target="_blank" rel="noopener noreferrer">Partner network source ↗</a>
</div>
```

- [ ] **Step 3: Run the script**

Run: `node _inspect/verify-vitelize-revision.mjs`
Expected: FAIL only on the missing `.exp-stats` CSS rules.

---

### Task 3: Add compact statistics styles

**Files:**
- Modify: `public/styles.css` — after `.experience-feature .exp-description p` near line 48; extend the `max-width:480px` block near line 56.

**Interfaces:**
- Consumes: `.exp-stats` from Task 2.
- Produces: compact, prominent, responsive statistics with no overflow.

- [ ] **Step 1: Add base rules**

Add minified CSS: `.exp-stats{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;margin-top:14px;padding:12px 0;border-top:1px solid #e8e3ef;border-bottom:1px solid #e8e3ef}`; `.exp-stats>div{flex:1 1 0;min-width:88px}`; `.exp-stats strong{display:block;font-size:21px;font-weight:800;letter-spacing:-.8px;color:#581acc;line-height:1.1}`; `.exp-stats span{display:block;margin-top:3px;font-size:9px;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:#6e6878}`; `.exp-stats a{flex-basis:100%;font-size:9px;color:#7f40e9;text-decoration:none;margin-top:2px}`; `.exp-stats a:hover{text-decoration:underline}`.

- [ ] **Step 2: Add mobile rules**

Add to the existing `max-width:480px` media block after the featured overrides: `.exp-stats{gap:8px;margin-top:12px;padding:10px 0}.exp-stats strong{font-size:18px}`.

- [ ] **Step 3: Run static checks**

Run: `node _inspect/verify-vitelize-revision.mjs`
Expected: all checks PASS.

---

### Task 4: Verify in the browser

**Files:**
- Read: `public/index.html`, `public/styles.css`
- Test: local server `http://localhost:3000/#work`, headless Chrome at 1440/1024/390 px.

**Interfaces:**
- Consumes: completed HTML/CSS from Tasks 2–3.
- Produces: browser evidence for the preview and the final report.

- [ ] **Step 1: Run code check**

Run: `node --check public/script.js`
Expected: exit 0.

- [ ] **Step 2: Assert DOM and layout at 1440/1024/390 px**

Check: feature card is first; exact new title/category/description/stats/tags are rendered; image is 1120×700 and complete; CTA safe; four existing image sources unchanged; `scrollWidth === clientWidth`; stats visible with non-zero height; desktop/tablet split and mobile stacked layout; no console errors.

- [ ] **Step 3: Show the preview**

Open `http://localhost:3000/#work` in the in-app browser Review pane and focus it.

---

### Task 5: Push a feature branch and stop

**Files:**
- Modify: `docs/PROJECT-LOG.md` — append a dated Revision 2 draft entry under §6.
- Remote: create `feat/vitelize-card-revision` via `tools/push-branch.js` with the changed production files.

**Interfaces:**
- Consumes: passing Task 3 and Task 4 results.
- Produces: a pushed branch with no PR, merge or deploy.

- [ ] **Step 1: Append the log entry**

Record the exact new copy/stats, unchanged visual/badge/note, verification results, branch name, and that no deployment occurred.

- [ ] **Step 2: Push the feature branch**

Run `node tools/push-branch.js feat/vitelize-card-revision "Revise Vitelize Health featured card" public/index.html public/styles.css docs/PROJECT-LOG.md docs/superpowers/specs/2026-11-24-vitelize-featured-draft-design.md` with `GITHUB_TOKEN` loaded from Windows Credential Manager.
Expected: commit hash printed; no PR or workflow run.

- [ ] **Step 3: Stop for approval**

Report the branch, preview and verification. Do not open a PR, merge or deploy until the owner explicitly approves.
