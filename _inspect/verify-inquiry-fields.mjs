import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const html = read('public/index.html');
const js = read('public/form.js');
const api = read('functions/api/inquiry.js');
const schema = read('schema.sql');
const admin = read('public/admin/admin.js');
const adminHtml = read('public/admin/index.html');

const formStart = html.indexOf('<form class="inquiry-form"');
const formEnd = html.indexOf('</form>', formStart);
if (formStart === -1 || formEnd === -1) throw new Error(' inquiry form bounds missing');
const form = html.slice(formStart, formEnd);
const panelStart = html.indexOf('<div class="inquiry-panel"');
const panel = html.slice(panelStart, html.indexOf('</section>', panelStart));

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

check('public form has only the intended field names', () => {
  const names = [...form.matchAll(/name="([^"]+)"/g)].map((m) => m[1]).sort();
  assert(JSON.stringify(names) === JSON.stringify(['description', 'email', 'files', 'name', 'service', 'website']), `got ${JSON.stringify(names)}`);
});

check('removed controls and labels are absent', () => {
  for (const token of [
    'f-phone', 'f-company', 'f-budget', 'f-timeline',
    'name="phone"', 'name="company"', 'name="budget"', 'name="timeline"',
    'WhatsApp number', 'Company name', 'Estimated project budget', 'Project timeline',
    'Include your country code.', 'Select budget range', 'When would you like to launch?'
  ]) {
    assert(!form.includes(token), `still present: ${token}`);
  }
});

check('privacy note no longer mentions WhatsApp', () => {
  assert(!form.includes('WhatsApp'), 'WhatsApp sentence remains');
});

check('required public hooks are preserved', () => {
  for (const token of [
    'id="inquiry-form"', 'id="f-name"', 'id="f-email"', 'id="f-service"',
    'id="f-description"', 'id="f-files"', 'id="f-website"', 'id="turnstile-slot"',
    'id="inquiry-submit"', 'id="inquiry-status"', 'id="inquiry-success"',
    'name="website"', 'aria-labelledby="inquiry-title"'
  ]) {
    assert(panel.includes(token), `missing hook: ${token}`);
  }
});

check('client validation list is exact', () => {
  assert(js.includes("const fields = ['name', 'email', 'description'];"), 'fields array differs');
});

check('phone validation code is removed', () => {
  assert(!js.includes('isPhone'), 'isPhone still present');
  assert(!js.includes("name === 'phone'"), 'phone validation branch still present');
});

check('removed fields are no longer submitted', () => {
  for (const name of ['phone', 'company', 'budget', 'timeline']) {
    assert(!js.includes(`payload.append('${name}'`), `payload still appends ${name}`);
  }
});

check('remaining payload lines are exact and in order', () => {
  const expected = [
    "payload.append('name', String(form.elements.name.value).trim());",
    "payload.append('email', String(form.elements.email.value).trim());",
    "payload.append('service', form.elements.service.value);",
    "payload.append('description', String(form.elements.description.value).trim());",
    "payload.append('website', String(form.elements.website.value || ''));",
    "selectedFiles.forEach((file) => payload.append('files', file, file.name));",
    "if (token && token.value) payload.append('cf-turnstile-response', token.value);"
  ];
  let cursor = js.indexOf("const payload = new FormData();");
  assert(cursor !== -1, 'FormData block missing');
  for (const line of expected) {
    cursor = js.indexOf(line, cursor);
    assert(cursor !== -1, `missing or out of order: ${line}`);
    cursor += line.length;
  }
});

check('backend, schema and admin still support historical fields', () => {
  for (const name of ['phone', 'company', 'budget', 'timeline']) {
    assert(api.includes(`'${name}'`) || api.includes(name), `API no longer references ${name}`);
    assert(schema.includes(`${name}`), `schema no longer references ${name}`);
  }
  assert(api.includes('function buildEmail'), 'email builder missing');
  assert(admin.includes('item.company'), 'admin company display missing');
  assert(adminHtml.includes('Search name, email, company'), 'admin company search missing');
});

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll inquiry-field checks passed.');
