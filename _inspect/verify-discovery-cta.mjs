import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'public/index.html'), 'utf8');
const js = readFileSync(join(root, 'public/form.js'), 'utf8');
const css = readFileSync(join(root, 'public/styles.css'), 'utf8');

const failures = [];
function check(name, fn) {
  try {
    fn();
    console.log(`OK   ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

check('submit button uses the exact new wording', () => {
  assert(
    html.includes('<button class="button button-primary inquiry-submit" id="inquiry-submit" type="submit">Schedule a Discovery Call</button>'),
    'exact button markup not found'
  );
});

check('loading reset restores the new wording', () => {
  assert(js.includes("submitButton.textContent = loading ? 'Sending…' : 'Schedule a Discovery Call';"), 'reset string differs');
});

check('old wording is gone', () => {
  assert(!html.includes('Send Project Inquiry'), 'old text remains in index.html');
  assert(!js.includes('Send Project Inquiry'), 'old text remains in form.js');
});

check('button styling hooks are unchanged', () => {
  assert(html.includes('class="button button-primary inquiry-submit"'), 'button classes changed');
  assert(css.includes('.inquiry-submit{flex:0 0 auto}'), 'desktop rule missing');
  assert(css.includes('.inquiry-submit{width:100%}'), 'mobile rule missing');
});

check('service needed is marked optional', () => {
  assert(
    html.includes('<label for="f-service">Service needed <span class="opt">Optional</span></label>'),
    'Service needed label does not have the Optional tag'
  );
});

check('form functionality hooks are preserved', () => {
  for (const token of [
    'id="inquiry-form"', 'id="f-name"', 'id="f-email"', 'id="f-service"',
    'id="f-description"', 'id="f-files"', 'id="f-website"', 'id="turnstile-slot"',
    'id="inquiry-status"', 'id="inquiry-success"'
  ]) {
    assert(html.includes(token), `missing hook: ${token}`);
  }
  assert(js.includes("form.addEventListener('submit'"), 'submit handler missing');
});

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll discovery CTA checks passed.');
