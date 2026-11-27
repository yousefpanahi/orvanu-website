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

check('server error is only used when it is a string', () => {
  assert(
    js.includes("setStatus(typeof result.error === 'string' && result.error ? result.error : fallback, true);"),
    'string guard on result.error missing'
  );
});

check('no unguarded result.error reaches the status banner', () => {
  assert(!js.includes('setStatus(result.error || fallback'), 'unguarded result.error usage remains');
});

check('readable fallback message is intact', () => {
  assert(js.includes("'Something went wrong sending your inquiry. Please try again, or email orvanutech@gmail.com.'"), 'fallback message changed');
});

check('network-failure message is intact', () => {
  assert(js.includes("'We could not reach the server. Check your connection and try again, or email orvanutech@gmail.com.'"), 'catch message changed');
});

check('field-level server errors still render', () => {
  assert(js.includes('for (const [name, message] of Object.entries(result.fields))'), 'fields handling changed');
});

if (failures.length > 0) { console.error(`\n${failures.length} check(s) failed.`); process.exit(1); }
console.log('\nAll error-message checks passed.');
