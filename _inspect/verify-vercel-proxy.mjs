// Verifies the Vercel mirror routes its inquiry form to the Cloudflare backend
// without exposing the admin API, and that Turnstile is enabled on the mirror host.
// Run: node _inspect/verify-vercel-proxy.mjs   (exits 1 on any failure)
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
function check(name, fn) {
  try { fn(); console.log(`OK   ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }

const vercelPath = join(root, 'vercel.json');
const formJs = readFileSync(join(root, 'public/form.js'), 'utf8');
const indexHtml = readFileSync(join(root, 'public/index.html'), 'utf8');

let cfg = null;
check('vercel.json exists', () => {
  assert(existsSync(vercelPath), 'vercel.json is missing at the repo root');
});

check('vercel.json is valid JSON with a rewrites array', () => {
  cfg = JSON.parse(readFileSync(vercelPath, 'utf8'));
  assert(Array.isArray(cfg.rewrites), 'rewrites must be an array');
});

const rewrites = (cfg && cfg.rewrites) || [];
const find = (src) => rewrites.find((r) => r && r.source === src);

check('proxies POST /api/inquiry to the Cloudflare backend', () => {
  const r = find('/api/inquiry');
  assert(r, 'no rewrite for /api/inquiry');
  assert(r.destination === 'https://orvanu.pages.dev/api/inquiry', `unexpected destination: ${r.destination}`);
});

check('proxies GET /api/file to the Cloudflare backend', () => {
  const r = find('/api/file');
  assert(r, 'no rewrite for /api/file');
  assert(r.destination === 'https://orvanu.pages.dev/api/file', `unexpected destination: ${r.destination}`);
});

check('does NOT expose /api/admin through the Vercel mirror', () => {
  const bad = rewrites.some((r) => String(r.source || '').includes('/api/admin'));
  assert(!bad, 'a rewrite references /api/admin — admin must stay Cloudflare-only');
});

check('Turnstile allowlist includes both production hosts', () => {
  const match = /const TURNSTILE_HOSTS = \[([^\]]*)\];/.exec(formJs);
  assert(match, 'TURNSTILE_HOSTS not found');
  assert(match[1].includes("'orvanu.pages.dev'"), 'orvanu.pages.dev missing from TURNSTILE_HOSTS');
  assert(match[1].includes("'orvanu.vercel.app'"), 'orvanu.vercel.app missing from TURNSTILE_HOSTS');
});

check('form still posts to the relative /api/inquiry endpoint', () => {
  assert(indexHtml.includes('action="/api/inquiry"'), 'form action changed away from /api/inquiry');
});

if (failures.length > 0) { console.error(`\n${failures.length} check(s) failed.`); process.exit(1); }
console.log('\nAll Vercel proxy checks passed.');
