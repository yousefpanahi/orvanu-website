import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const js = readFileSync(join(root, 'public/form.js'), 'utf8');

const failures = [];
function check(name, fn) {
  try { fn(); console.log(`OK   ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }

check('hostname allowlist exists and pins the production hosts', () => {
  assert(
    js.includes("const TURNSTILE_HOSTS = ['orvanu.pages.dev', 'orvanu.vercel.app'];"),
    'TURNSTILE_HOSTS allowlist missing or changed'
  );
});

check('widget loading is gated on the allowlist', () => {
  assert(
    js.includes('if (TURNSTILE_SITEKEY && TURNSTILE_HOSTS.includes(location.hostname)) {'),
    'Turnstile loader is not gated on TURNSTILE_HOSTS'
  );
});

check('sitekey is unchanged', () => {
  assert(js.includes("const TURNSTILE_SITEKEY = '0x4AAAAAAGPeAoSwkEhoDlOT';"), 'sitekey changed');
});

check('token is still attached to submissions when present', () => {
  assert(js.includes('payload.append(\'cf-turnstile-response\', token.value)'), 'token submit logic changed');
});

check('widget reset after failed submit is preserved', () => {
  assert(js.includes('window.turnstile.reset(turnstileWidget)'), 'reset logic changed');
});

if (failures.length > 0) { console.error(`\n${failures.length} check(s) failed.`); process.exit(1); }
console.log('\nAll turnstile-host checks passed.');
