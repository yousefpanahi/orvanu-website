# Design: Vitelize Health featured portfolio draft

Date: 24 November 2026

## Intent

Add one draft portfolio entry for the public Vitelize Health website to the existing
“Real product experience behind ORVANU” section. It expands the section into
HealthTech and digital wellness while keeping the four existing projects visually
and textually unchanged. The entry must not be presented as confirmed ORVANU
client work until the team’s exact contribution is confirmed.

## Goals

- Add the entry as a **full-width split card placed first** in the experience
  section, directly under the heading and above the unchanged 2×2 grid.
- Use the supplied category, title, subtitle, description, tags and external CTA
  verbatim.
- Use an original, clearly labelled illustrative visual in the existing 16:10,
  1120×700 image format.
- Keep the draft local/preview-only until the user approves the result; no merge
  or production deploy.

## Non-goals / anti-goals

- No claims about clinical systems, prescriptions, medical records, backend
  functionality, project results, user counts, revenue or clinical outcomes.
- No claim that ORVANU owns Vitelize Health, that a formal client engagement
  existed, or that the team delivered a specific engineering component.
- No reuse of the attached Dribbble artwork or Vitelize screenshots/logos without
  permission.
- No changes to the four existing cards, their images, copy or order, except the
  two owner-approved image replacements recorded below.

## Constraints

- Static site: `public/index.html`, `public/styles.css`, images in
  `public/assets/experience/`.
- Existing images are 16:10 JPEGs at 1120×700; the new visual should match.
- No package build/lint script exists; available check is `node --check public/script.js`.
- Local preview runs at `http://localhost:3000/#work`.
- Draft status must remain explicit in the rendered card and in the section note.

## Owner-directed changes after approval (24 November 2026)

- The owner replaced the locally composed illustration with the previously shared
  `Healix - AI Telemedicine Landing Page by Elux UI_UX for Elux Space on
  Dribbble.jpg`, cropped to the standard 1120×700 format at
  `public/assets/experience/vitelize-health.jpg`. It is used only as a labelled
  concept reference, not as a Vitelize screenshot or a claim that ORVANU created
  the interface. This amends the earlier no-Dribbble constraint for this one
  approved file.
- The owner approved the earlier replacement of
  `public/assets/experience/ai-support.jpg` with the supplied customer-support
  image; this amends the no-existing-image-change constraint for that one file.
- The owner asked to remove the long draft sentence from the card. It is replaced
  by a short badge near the title: `Draft · public-site reference`. The section
  note keeps the full draft, unconfirmed-contribution and no-client-claim wording.

## Revision 2 (owner-directed, 24 November 2026)

The owner supplied a replacement copy deck for the same first featured card.
The card structure, split layout, responsive behaviour, existing visual and
section note stay as approved above; only the card text, category, tags and
three new business-fact statistics change.

- Visual: **unchanged** — keep `public/assets/experience/vitelize-health.jpg`
  (owner-approved Healix concept image) and the
  `Concept reference — not a Vitelize screenshot` caption. Keep the short
  `Draft · public-site reference` badge and the full section note.
- Category: `HealthTech · United States`.
- Title: `Vitelize Health — Digital Healthcare Platform`.
- Description (single paragraph, verbatim): `A U.S.-based digital health experience connecting physician-guided metabolic care, personalized fitness, and nutrition services. The platform helps users explore health programs, discover participating locations, and connect with healthcare and wellness partners.`
- Three compact statistics beneath the description, in this order:
  `USA — Market`, `9 — Partner Locations`, `2 — U.S. States`. Source:
  `https://www.vitelizehealth.com/partner-network/` (published partner
  directory: 8 Colorado + 1 Oklahoma = 9 locations in 2 states). Present them
  strictly as published partner-network facts — never as customers, patients,
  results or development achievements.
- Tags in order: `HealthTech`, `Digital Healthcare`, `Partner Discovery`,
  `Web Platform`.
- CTA unchanged: `View Live Website` → `https://www.vitelizehealth.com/`.
- The owner waived the pre-deployment confirmation of team contribution. No
  contribution, client, clinical or engineering claim may be added. The visual
  and draft labelling remain because the referenced artwork is a third-party
  concept, not a Vitelize screenshot.
- Implementation must be on a feature branch with a localhost preview and no
  deployment until the owner explicitly approves the result.

## Approaches considered

1. **Full-width featured card first (chosen).** A split image/text article spans
   both grid columns above the four existing cards. Gives the new entry room for
   its longer copy and six tags without altering the existing cards.
2. **Uniform grid, fifth card last.** Simplest styling, but leaves an empty sixth
   slot and compresses the long description.
3. **Rebalance all five as 3+2.** More even as a grid, but changes the layout of
   the four projects the user asked to preserve.

## Design

- Insert one new `<article class="experience-card experience-feature">` as the
  first child of `.experience-grid`; it spans `grid-column: 1 / -1`.
- Inside it, use `.exp-visual` for the labelled image and `.exp-body` for the
  category, exact title, exact subtitle, exact two-paragraph description, six
  tags, a `View Live Website` link to `https://www.vitelizehealth.com/`
  (`target="_blank" rel="noopener noreferrer"`), and a visible draft note.
- Add a short CSS block for the split desktop layout and a single-column stack at
  the existing 900 px breakpoint; below 480 px reuse the existing smaller card
  paddings.
- Create `public/assets/experience/vitelize-health.jpg`: original illustrative
  healthcare digital-experience artwork, no real branding or interface claims,
  with a visible “illustrative” caption and meaningful alt text.
- Update only the trailing `.work-note` so it distinguishes the four anonymised
  professional projects from the named Vitelize draft/public-site reference and
  states that no endorsement is implied.

## Verification

- Confirm the four existing cards and their image paths are unchanged.
- Confirm image loads at 1120×700 and is labelled illustrative.
- Confirm the external link URL, `target` and `rel`.
- Check desktop (1440 px), tablet (1024 px) and mobile (390 px) for no horizontal
  overflow; check split-to-stacked behaviour.
- Run `node --check public/script.js`.
- Show the localhost preview and report changed files.
- Stop for approval before pushing a branch or deploying.
