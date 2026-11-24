# How We Work Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove the philosophy band and How We Work process section, update navigation and section numbering, and leave the rest of the site unchanged.

**Architecture:** The static page is defined in `public/index.html` and styled in `public/styles.css`. A Node script pins the deleted markup/CSS, exact nav and eyebrow order, and preserved section ids before browser verification.

**Tech Stack:** Static HTML/CSS, Node verification script, local server on port 3000, headless Chrome at 1440/390 px.

**Spec:** `docs/superpowers/specs/2026-11-24-how-we-work-removal-design.md`

## Global Constraints

- Delete both `.principle` and `.approach` sections and their CSS.
- Final nav labels in order: Services, Projects, Team, About, Let’s talk.
- Eyebrows exactly: `01 / SERVICES`, `02 / SOLUTIONS & EXPERTISE`, `03 / SELECTED PROJECTS`, `04 / ABOUT ORVANU`, `05 / MEET THE TEAM`, `06 / LET'S CONNECT`.
- Keep all section ids, project/team/service/form content and responsive styling unchanged.
- Show localhost preview before deployment; the owner’s `deploy all` message authorizes production after verification.

## Review Focus

- No stale `approach` href or id may remain — pinned by whole-file absence.
- No orphaned CSS may remain — pinned by absent selectors in base and media blocks.
- Remaining section order and numbering must be exact — pinned by ordered DOM/string checks.
- Navigation and scroll targets must work at desktop and mobile sizes — pinned by browser checks.
- Unrelated content must not change — pinned by preserved marker checks.

---

### Task 1: Write the failing verification script

**Files:** Create `_inspect/verify-section-removal.mjs`

- [x] Write assertions for deleted markup, deleted CSS, nav order, eyebrow order, preserved ids and preserved content markers.
- [x] Run it and confirm it fails.

### Task 2: Edit HTML and CSS

**Files:** Modify `public/index.html`, `public/styles.css`

- [x] Remove the two sections and their CSS rules.
- [x] Update nav, footer and eyebrow numbering.
- [x] Run the script until all checks pass.

### Task 3: Browser verification and preview

- [x] Check 1440/390 px layout, no overflow, nav labels, scroll targets and no site console errors.
- [x] Open the localhost preview in the Review pane.

### Task 4: Deploy all pending changes

**Files:** Modify `docs/PROJECT-LOG.md`

- [x] Push one feature branch with section removal, CTA wording, optional service tag and logs.
- [x] Merge via PR and wait for workflow success.
- [x] Verify live production and report.
