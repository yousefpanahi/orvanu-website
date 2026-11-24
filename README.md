# ORVANU Website

Source code and deployment pipeline for [https://orvanu.pages.dev/](https://orvanu.pages.dev/) — the ORVANU company website (Software & Product Engineering).

## Repository layout

| Path | Purpose |
|------|---------|
| `public/` | The website. This folder is deployed as-is to Cloudflare Pages. |
| `public/index.html` | Single-page site (hero, services, capabilities, work, about, team, contact). |
| `public/assets/` | Brand assets: logo symbol, favicons, OG preview image. Do not replace the logo without approval. |
| `public/_headers` | Cloudflare Pages response headers (security headers). |
| `public/robots.txt`, `public/sitemap.xml` | Basic SEO files. Update the domain everywhere when a custom domain is connected. |
| `.github/workflows/deploy.yml` | GitHub Actions workflow: deploys `public/` to Cloudflare Pages on every push to `main`, then verifies the live site. |
| `wrangler.toml` | Wrangler config (`pages_build_output_dir = "public"`). |
| `tools/setup-repo.ps1` | One-time script that created this repository via the GitHub API (no Git needed). |

## How deployment works

```
git push to main  →  GitHub Actions (deploy.yml)  →  wrangler pages deploy public --project-name=orvanu
                                                      →  https://orvanu.pages.dev/  →  verification step checks HTTP 200 + content
```

- **Live site:** `orvanu.pages.dev` (Cloudflare Pages project `orvanu`, Direct Upload origin — managed by Wrangler).
- **Secrets** (repo → Settings → Secrets and variables → Actions):
  - `CLOUDFLARE_API_TOKEN` — Cloudflare API token with *Cloudflare Pages: Edit* permission.
  - `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID.
- **Roll back:** revert the commit on `main` and push (a new deploy replaces the previous one). For an instant rollback without a new deploy, use Cloudflare dashboard → Pages → `orvanu` → Deployments → select a previous deployment → **Rollback**.

## Editing the website

1. Create a branch, edit files in `public/`, open a pull request to `main`.
2. After merge, the workflow deploys automatically and verifies the result in the Actions log.
3. Keep changes honest: no fabricated clients, testimonials, metrics, or case studies. Demonstration concepts must stay clearly labeled.
4. **Team section:** names, titles, bios, expertise tags, photo paths and LinkedIn URLs are defined once in the `TEAM` array in `public/script.js`. Add a member by appending an entry; enable a photo by setting its `photo` path (see `public/assets/team/README.md`); leave `linkedin` empty until the URL is verified.

### Local preview

Any static file server works, e.g.:

```powershell
npx serve public
# or
node -e "const h=require('http'),f=require('fs'),p=require('path');h.createServer((q,s)=>{let d=q.url.split('?')[0];if(d.endsWith('/'))d+='index.html';const fp=p.join('public',d);f.readFile(fp,(e,b)=>{if(e){s.statusCode=404;s.end('not found');return}const t={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.ico':'image/x-icon','.xml':'application/xml','.txt':'text/plain'}[p.extname(fp)]||'application/octet-stream';s.setHeader('Content-Type',t);s.end(b)})}).listen(3000,()=>console.log('http://localhost:3000'))"
```

## Brand rules (summary)

- Purple (`#7e37ef`) is the primary accent on white/light-lilac backgrounds.
- Logo: purple loop symbol + bold dark wordmark. Use the files in `public/assets/`.
- Tone: modern, professional, minimal, credible for European B2B. No buzzwords, no unsupported claims.
- Contact: orvanutech@gmail.com

See `AGENTS.md` for full company context.
