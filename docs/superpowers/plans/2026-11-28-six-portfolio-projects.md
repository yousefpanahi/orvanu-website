# Six Portfolio Projects — Implementation Plan

> **For agentic workers:** Execute task-by-task using TDD. Steps use checkbox syntax.

**Goal:** Add a "Selected Product & Operations Experience" category with six data-driven project cards (each with an accessible detail dialog) to the existing `#work` portfolio section, using the six supplied images with neutral filenames.

**Architecture:** Static vanilla site (HTML/CSS/JS). Follow the existing `TEAM` array pattern in `public/script.js`: define a `PROJECTS` data array and render cards + a single `<dialog>` from it. Cards are `<article>` elements; detail opens a native accessible `<dialog>`.

**Tech Stack:** Vanilla HTML/CSS/JS, Node (sharp for image normalization), headless Chrome for verification.

**Spec:** Recovered from prior session `ses_de342c22affe7vd9K7UFNIRGyp` (user message seq 825) — "Expand ORVANU Website Portfolio with Six Product & Operations Projects".

## Global Constraints

- Projects are **previous professional experience**, never ORVANU client work. Add category title exactly: `Selected Product & Operations Experience`.
- Add clarification line below the portfolio intro: `Selected examples of product and operational initiatives from previous professional experience.`
- **Never** reveal previous employer name/logo/branding in content, filenames, alt text, or SEO.
- **Do NOT publish** Project 03 `+18%` or Project 04 `12%` return-rate (unconfirmed). Project 05 `98% POD compliance` and Project 06 `12 dark stores / 45-min target` are labelled "Reported" per spec.
- No fabricated architecture, languages, integrations, clients, contracts, financials.
- Preserve all existing sections, branding, nav, form, and functionality.
- No deployment. Local prepare + validation only.
- Free/zero-dependency; reuse existing CSS variables.

## Structure Decisions (approved)

- Keep Vitelize featured card + AI Customer Support + AI Travel + Scheduled Delivery.
- **Remove** the existing "Yard Management System" card (superseded by new Project 01).
- Six new cards render as a second category block inside `#work`, after the existing grid.

## Image → project map (neutral filenames)

| # | Project | Source (Downloads) | New file |
|---|---------|--------------------|----------|
| 01 | Digital Yard Management | platbricks® Yard Management… | `project-yard-management.jpg` |
| 02 | Single-Item Order Optimization | Warehouse worker seals package | `project-single-item.jpg` |
| 03 | Driver & Delivery Partner Incentive Dashboard | Introducing_ Driver Analytics | `project-driver-analytics.jpg` |
| 04 | Inbound Receiving & Quality Control | Controle de qualidade… | `project-quality-control.jpg` |
| 05 | OTP-Based Proof of Delivery | Best Dispatch… DispatchOne | `project-proof-of-delivery.jpg` |
| 06 | Dark Store Fulfillment for Quick Commerce | Dark Stores… Q-Commerce | `project-dark-store.jpg` |

Normalize each to 1120×700 JPEG via sharp `resize(1120,700,{fit:'cover',position:'attention'})`.

## File Structure

- Modify: `public/index.html` — remove old yard card, add category block + `<dialog id="project-dialog">`, update work-note.
- Modify: `public/script.js` — add `PROJECTS` array, `buildProjectCard`, `renderProjects`, `openProjectDialog`, wire dialog.
- Modify: `public/styles.css` — add `.project-grid`, `.project-card`, `.project-media`, `.project-dialog` styles + responsive.
- Create: `public/assets/experience/project-*.jpg` (6 files).
- Create: `_inspect/verify-six-portfolio.mjs` — static + data checks.
- Modify: `docs/PROJECT-LOG.md` — Session K entry + §3/§11 updates.

## Tasks

### Task 1: Normalize + copy six images
- [ ] Run sharp to produce six `project-*.jpg` at 1120×700 in `public/assets/experience/`.
- [ ] Verify each is a valid JPEG 1120×700 and > 10 KB.

### Task 2: Verify script (RED)
- [ ] Write `_inspect/verify-six-portfolio.mjs` asserting: six image files exist; `#work` contains "Selected Product & Operations Experience" + clarification line; old "Yard Management System" card absent; `PROJECTS` array has 6 entries with required fields; no forbidden employer names; `+18%` and `12%` absent from public strings; work-note updated.
- [ ] Run it — expect FAIL (not yet implemented).

### Task 3: HTML — section restructure
- [ ] Remove the existing Yard Management `<article>` (lines ~436-449).
- [ ] After existing `.experience-grid`, add category heading + intro + `<div class="project-grid" id="project-grid"></div>` + `<noscript>` fallback + `<dialog>` shell.
- [ ] Update `.work-note` copy to cover the six new projects.

### Task 4: JS — PROJECTS data + render + dialog
- [ ] Add `PROJECTS` array (id, num, title, category, summary, tags[], image, alt, challenge, solution, capabilities[], outcome?).
- [ ] Implement `buildProjectCard`, `renderProjects`, dialog open/close (Esc, backdrop, focus return), wire "Explore Project" buttons.
- [ ] Guard all DOM lookups (`if (!grid) return`).

### Task 5: CSS — category grid + dialog
- [ ] `.project-grid` 3-col desktop (≤900px 2-col, ≤620px 1-col); card, media aspect, tag chips, button, dialog (backdrop, panel, close), reduced-motion safe.

### Task 6: Verify (GREEN) + quality checks
- [ ] `node --check public/script.js`; run `verify-six-portfolio.mjs` → all pass.
- [ ] Headless Chrome at 1440/1024/390: 6 project cards visible, images 200, dialog opens/closes, no horizontal overflow, no console errors (filter unrelated Turnstile).

### Task 7: Docs
- [ ] Append Session K to `docs/PROJECT-LOG.md` §6; update §1/§3/§11; note "not deployed".

### Task 8: Final report
- [ ] Report files changed, features, tests+results, remaining issues, local preview steps.

## Review Focus

- A project with no confirmed metric renders with **no** metric badge (03, 04) rather than an invented one.
- Dialog is keyboard accessible (Esc closes, focus returns to trigger) at all widths.
- No brand/employer string leaks into filenames, alt text, or visible copy.
- Cards stay equal-height and images don't distort across breakpoints.
- With JS disabled, `<noscript>` still lists all six project titles.
