# Design: Remove the How We Work section

Date: 24 November 2026

## Intent

Shorten the landing page by removing the philosophy band and the entire
`02 / HOW WE WORK` process section, so Services flows directly into
Solutions & Expertise. No replacement content is added.

## In scope

- Remove the `.principle` band containing “We believe the best digital products
  happen when business insight meets thoughtful engineering.” and
  “LESS NOISE. MORE MOMENTUM.”
- Remove the `.approach` section with `id="approach"`, its heading
  “A partner from idea to impact.”, its supporting paragraph and all four
  timeline steps: Understand, Shape, Build, Grow.
- Remove the unused `.principle*`, `.asterisk`, `.approach` and `.timeline*`
  CSS rules, including their responsive overrides.
- Remove the Approach link from the shared desktop/mobile nav and the footer.
- Renumber remaining eyebrows: `01 / SERVICES`, `02 / SOLUTIONS & EXPERTISE`,
  `03 / SELECTED PROJECTS`, `04 / ABOUT ORVANU`, `05 / MEET THE TEAM`,
  `06 / LET'S CONNECT`.

## Preserved

- Existing section ids and hrefs: `#services`, `#capabilities`, `#work`,
  `#team`, `#about`, `#contact`, `#inquiry`, `#top`.
- Final nav order: Services, Projects, Team, About, Let’s talk.
- All project cards, team profiles, services, contact form fields, validation,
  attachments, styling, animations, typography and responsive behaviour.
- No new claims, client names or case studies.

## Verification

Static assertions for removed markup/CSS and exact numbering, then browser
checks at 1440/390 px for layout, navigation labels, scroll targets, zero
overflow and no site console errors. Local preview first; deploy only after
the owner’s explicit `deploy all` approval.
