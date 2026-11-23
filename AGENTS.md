# AGENTS.md — ORVANU Project Context

## What this project is

ORVANU is an early-stage **international B2B software development and product engineering company** (brand: *Software & Product Engineering*). This workspace holds the company website and its deployment pipeline.

## Hard rules (never violate)

- **Never fabricate** clients, testimonials, revenue, partnerships, certifications, case studies, or team credentials.
- Demonstration work must be **clearly labeled** as concepts/demonstrations (see the `id="work"` section pattern).
- **Never expose secrets** (API tokens, passwords) in code, commits, or chat. GitHub Actions secrets only.
- Do not delete/replace the live Cloudflare Pages project or its `orvanu.pages.dev` URL without explicit user approval.
- Do not publish team photos, personal info, or LinkedIn profiles without approval. Confirmed team facts only (see below).
- Keep costs near zero: free tiers only, unless the user explicitly approves a paid service.
- For legal/tax/sanctions/payment questions involving Iran ↔ international customers: flag for qualified professional review; never assume legality.

## Confirmed facts

- **Company:** ORVANU — Software & Product Engineering. Contact: orvanutech@gmail.com.
- **Live site:** https://orvanu.pages.dev/ (Cloudflare Pages, project `orvanu`, Direct Upload origin, deployed via Wrangler from GitHub Actions).
- **GitHub repo:** `yousefpanahi/orvanu-website`, branch `main`, deploy workflow `.github/workflows/deploy.yml`.
- **Services:** (1) Custom software development, (2) Dedicated engineering teams, (3) MVP & SaaS product development.
- **Team:**
  - Yousef Panahi — Product Strategy & Leadership. Senior PM; logistics, marketplaces, operational platforms. **He is not a software developer** — explain technical decisions in practical business language.
  - Saeed Najafi — Engineering & Frontend Lead. React, Next.js, TypeScript, frontend architecture.
  - Mohammadreza Akbari — Full-Stack Engineer. Next.js, NestJS, TypeScript, backend systems, dashboards, fintech-related software.
- **Markets:** Netherlands, wider Europe, UAE, Oman, Gulf region.
- **Engineering team is based in Iran**; customers are international.

## Environment constraints (this machine/network)

- **Git and GitHub CLI are NOT installed.** `tools/setup-repo.ps1` pushes via GitHub REST API; for ongoing work, installing Git for Windows is recommended.
- **Cloudflare (pages.dev, dashboard, 1.1.1.1) is unreachable from this network** (DNS returns private IPs). GitHub and Google are reachable. The Google Translate proxy (`<host>.translate.goog`) can fetch blocked sites when needed.
- npm works via `npm.cmd` (npm.ps1 is blocked by execution policy). Node v26 is installed.
- Windows, PowerShell. Prefer `curl.exe -o file` over PowerShell text capture for binary downloads (text capture corrupts bytes).

## Brand & design

- Purple accent `#7e37ef` (deep `#581acc`, lilac `#f2e9ff`, light `#faf9fc`), ink `#191624`.
- Logo: purple loop/ribbon symbol (`public/assets/orvanu-symbol.png`) + bold black ORVANU wordmark with purple accent dot. **Approved logo — preserve it; ask for original files rather than recreating.**
- Style: modern, premium-but-approachable, minimal, clean, European B2B appropriate. Avoid generic agency buzzwords.
- Writing: natural, concise, credible.

## Roadmap phases

1. **Website & infrastructure** — GitHub → Actions → Cloudflare Pages pipeline (done via `deploy.yml`); team section; SEO/responsiveness/accessibility.
2. **Credibility & portfolio** — professional team profiles, portfolio structure, demonstrable projects, stronger CTAs.
3. **Business launch** — LinkedIn company page, ideal customer profiles, pricing strategy, proposals, lead generation.
4. **First customers** — prospecting, outreach, sales pipeline, project estimation.

## Working style the user expects

- Proactive, execution-focused: implement, test, verify — don't just recommend.
- Step by step; large work split into clear phases/milestones.
- Ask only business-critical questions; otherwise make safe, reversible assumptions.
- Be transparent about what is done vs. proposed vs. unverified.
- Keep it simple; avoid unnecessary architectural complexity; prefer the team's stack (React/Next.js/TypeScript/NestJS/Node/PostgreSQL/Cloudflare).
