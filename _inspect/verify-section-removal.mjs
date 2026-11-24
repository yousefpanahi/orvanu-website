import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'public/index.html'), 'utf8');
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

check('deleted section markup is gone', () => {
  for (const token of [
    'class="section principle"', 'id="approach"', 'approach-title',
    '02 / HOW WE WORK', 'A partner from', 'We believe the best digital products',
    'LESS NOISE. MORE MOMENTUM.', '<h3>Understand</h3>', '<h3>Shape</h3>',
    '<h3>Build</h3>', '<h3>Grow</h3>', 'class="timeline-step"'
  ]) {
    assert(!html.includes(token), `still present: ${token}`);
  }
});

check('no approach links remain', () => {
  assert(!html.includes('#approach'), 'approach href remains');
  assert(!html.includes('>Approach<'), 'Approach label remains');
});

check('navigation order is exact', () => {
  const navStart = html.indexOf('<nav id="site-nav"');
  const navEnd = html.indexOf('</nav>', navStart);
  const nav = html.slice(navStart, navEnd);
  const labels = [...nav.matchAll(/<a[^>]*>([^<]+)/g)].map((m) => m[1].trim());
  assert(JSON.stringify(labels) === JSON.stringify(['Services', 'Projects', 'Team', 'About', "Let's talk"]), `got ${JSON.stringify(labels)}`);
});

check('footer explore links match', () => {
  const footer = html.slice(html.indexOf('<footer'));
  assert(!footer.includes('#approach'), 'footer approach link remains');
  for (const label of ['Services', 'Projects', 'Team', 'About']) {
    assert(footer.includes(`<a href="#${label === 'About' ? 'about' : label === 'Team' ? 'team' : label === 'Projects' ? 'work' : 'services'}">${label}</a>`), `footer link missing: ${label}`);
  }
});

check('eyebrow numbering is exact and in order', () => {
  const expected = [
    '01 / SERVICES',
    '02 / SOLUTIONS &amp; EXPERTISE',
    '03 / SELECTED PROJECTS',
    '04 / ABOUT ORVANU',
    '05 / MEET THE TEAM',
    "06 / LET'S CONNECT"
  ];
  let cursor = 0;
  for (const value of expected) {
    cursor = html.indexOf(value, cursor);
    assert(cursor !== -1, `missing or out of order: ${value}`);
    cursor += value.length;
  }
  assert(!html.includes('07 /'), 'stale 07 numbering remains');
  assert(!html.includes('04 / SELECTED EXPERIENCE'), 'stale comment numbering remains');
});

check('section order is exact', () => {
  const ids = [...html.matchAll(/<section[^>]*id="([^"]+)"/g)].map((m) => m[1]);
  assert(JSON.stringify(ids) === JSON.stringify(['services', 'capabilities', 'work', 'about', 'team', 'contact']), `got ${JSON.stringify(ids)}`);
});

check('deleted CSS selectors are gone', () => {
  for (const token of ['.principle', '.asterisk', '.approach', '.timeline']) {
    assert(!css.includes(token), `CSS still contains ${token}`);
  }
});

check('preserved content hooks remain', () => {
  for (const token of [
    'id="services-title"', 'id="capabilities-title"', 'id="work-title"',
    'id="about-title"', 'id="team-title"', 'id="contact-title"',
    'id="team-grid"', 'id="inquiry-form"', 'class="work-note"',
    'experience-feature', 'class="service-card featured"'
  ]) {
    assert(html.includes(token), `missing hook: ${token}`);
  }
});

check('CTA wording and optional service tag remain', () => {
  assert(html.includes('>Schedule a Discovery Call</button>'), 'CTA wording missing');
  assert(html.includes('<label for="f-service">Service needed <span class="opt">Optional</span></label>'), 'service optional tag missing');
});

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll section-removal checks passed.');
