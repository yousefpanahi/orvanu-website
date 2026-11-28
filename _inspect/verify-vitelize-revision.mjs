import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const htmlPath = resolve(root, process.argv[2] ?? 'public/index.html');
const html = readFileSync(htmlPath, 'utf8');
const css = readFileSync(join(root, 'public/styles.css'), 'utf8');
const baseline = readFileSync(join(root, '_inspect/experience-baseline.txt'), 'utf8').trimEnd();

const failures = [];
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function check(name, fn) {
  try {
    fn();
    console.log(`OK   ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

function balancedBlock(source, start) {
  let depth = 0;
  for (let at = start; at < source.length; at += 1) {
    if (source[at] === '{') depth += 1;
    if (source[at] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, at + 1);
    }
  }
  throw new Error('unbalanced block');
}

function extractArticles(source) {
  const blocks = [];
  const marker = '<article class="experience-card"';
  let at = source.indexOf(marker);
  while (at !== -1) {
    const end = source.indexOf('</article>', at);
    assert(end !== -1, 'unclosed article');
    blocks.push(source.slice(at, end + '</article>'.length));
    at = source.indexOf(marker, end);
  }
  return blocks;
}

const marker = '<article class="experience-card experience-feature"';
let feature = '';
check('featured article can be isolated', () => {
  const start = html.indexOf(marker);
  const end = html.indexOf('</article>', start);
  assert(start !== -1 && end !== -1, 'featured article bounds missing');
  feature = html.slice(start, end);
});

const exactStrings = [
  '<span class="exp-sector">HealthTech · United States</span>',
  '<h3>Vitelize Health — Digital Healthcare Platform</h3>',
  '<p>A U.S.-based digital health experience connecting physician-guided metabolic care, personalized fitness, and nutrition services. The platform helps users explore health programs, discover participating locations, and connect with healthcare and wellness partners.</p>',
  '<span class="exp-draft-badge">Draft · public-site reference</span>',
  'src="assets/experience/vitelize-health.jpg"',
  'alt="Telemedicine landing-page concept shared as a design reference; not a Vitelize Health screenshot"',
  '<span class="exp-illustration-note">Concept reference — not a Vitelize screenshot</span>',
  '<a class="button exp-link" href="https://www.vitelizehealth.com/" target="_blank" rel="noopener noreferrer">',
  'The Vitelize Health entry is a draft public-site reference'
];

for (const [index, value] of exactStrings.entries()) {
  check(`exact string ${index + 1}`, () => assert(feature.includes(value) || html.includes(value), `missing: ${value.slice(0, 80)}`));
}

check('old card copy is gone', () => {
  for (const old of [
    'Vitelize Health — Digital Healthcare Experience',
    'Healthcare · Digital experience',
    'Making integrated healthcare easier to discover and navigate.',
    'Healthcare Web Experience',
    'Patient Journeys',
    'UX &amp; Web Development'
  ]) {
    assert(!feature.includes(old), `old copy still present: ${old}`);
  }
});

check('statistics block is exact and in order', () => {
  const block = feature.match(/<div class="exp-stats"[^>]*>[\s\S]*?<\/div>\s*<a\b[\s\S]*?<\/a>\s*<\/div>/)?.[0]
    ?? feature.slice(feature.indexOf('<div class="exp-stats"'), feature.indexOf('</div>', feature.indexOf('<div class="exp-stats"')));
  assert(block && block.includes('class="exp-stats"'), 'exp-stats block missing');
  const expected = [
    '<strong>USA</strong> <span>Market</span>',
    '<strong>9</strong> <span>Partner Locations</span>',
    '<strong>2</strong> <span>U.S. States</span>'
  ];
  let cursor = block.indexOf('<div class="exp-stats"');
  for (const value of expected) {
    cursor = block.indexOf(value, cursor);
    assert(cursor !== -1, `stat missing or out of order: ${value}`);
    cursor += value.length;
  }
  assert(block.includes('href="https://www.vitelizehealth.com/partner-network/"'), 'partner-network source link missing');
  assert(block.includes('target="_blank"') && block.includes('rel="noopener noreferrer"'), 'source link is not safe');
});

check('no invented claim words in the featured card', () => {
  const text = feature.toLowerCase();
  for (const phrase of ['patient count', 'customers', 'performance', 'we built', 'our development', 'clinical outcome']) {
    assert(!text.includes(phrase), `forbidden claim phrase present: ${phrase}`);
  }
});

check('new tags are in supplied order', () => {
  const tags = ['HealthTech', 'Digital Healthcare', 'Partner Discovery', 'Web Platform'];
  let cursor = feature.indexOf('<div class="service-tags">');
  assert(cursor !== -1, 'service-tags missing');
  for (const tag of tags) {
    cursor = feature.indexOf(`<span>${tag}</span>`, cursor);
    assert(cursor !== -1, `tag missing or out of order: ${tag}`);
    cursor += tag.length;
  }
});

check('existing cards unchanged (only Yard card intentionally removed)', () => {
  // Six-portfolio change (approved) supersedes the old "Yard Management System"
  // card with Project 01. Every other experience card must stay byte-identical
  // to the production baseline; the Yard card is the only allowed removal.
  const current = extractArticles(html);
  const previous = extractArticles(baseline);
  for (const block of current) {
    assert(previous.includes(block), 'an existing card was modified: ' + (block.match(/<h3>([\s\S]*?)<\/h3>/) || [, '?'])[1]);
  }
  const removed = previous.filter((block) => !current.includes(block));
  // Allowed removals from the experience grid: the superseded Yard card and the
  // Scheduled Delivery card relocated into the project category (Session L).
  const allowedRemoved = ['Yard Management System', 'Scheduled Delivery Business Line'];
  const removedTitles = removed.map((b) => (b.match(/<h3>([\s\S]*?)<\/h3>/) || [, '?'])[1]);
  assert(removedTitles.slice().sort().join('|') === allowedRemoved.slice().sort().join('|'),
    'unexpected removals/changes: ' + removedTitles.join(', '));
});

check('statistics CSS exists and is compact', () => {
  const start = css.indexOf('.exp-stats{');
  assert(start !== -1, 'base .exp-stats rule missing');
  const base = balancedBlock(css, start);
  assert(base.includes('gap:'), 'no explicit gap');
  assert(/font-size:\d+px/.test(css.slice(css.indexOf('.exp-stats strong{'), css.indexOf('.exp-stats strong{') + 120)), 'no explicit strong font-size');
  assert(css.includes('.exp-stats>div{flex:1 1 0'), 'stats columns are not equal-width');
});

check('mobile stats rules come after the base rules', () => {
  const baseAt = css.indexOf('.exp-stats{');
  assert(baseAt !== -1, 'base rules missing');
  let at = css.indexOf('@media(max-width:480px)', baseAt);
  while (at !== -1) {
    const block = balancedBlock(css, at);
    if (block.includes('.exp-stats strong{font-size:18px}')) return;
    at = css.indexOf('@media(max-width:480px)', at + block.length);
  }
  throw new Error('effective 480px stats rule missing after base rules');
});

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll Vitelize revision checks passed.');
