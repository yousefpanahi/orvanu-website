import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const htmlPath = resolve(root, process.argv[2] ?? 'public/index.html');
const html = readFileSync(htmlPath, 'utf8');
const css = readFileSync(join(root, 'public/styles.css'), 'utf8');
const spec = readFileSync(join(root, 'docs/superpowers/specs/2026-11-24-vitelize-featured-draft-design.md'), 'utf8');
const baseline = readFileSync(join(root, '_inspect/experience-baseline.txt'), 'utf8').trimEnd();
const imagePath = join(root, 'public/assets/experience/vitelize-health.jpg');

const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function check(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
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
  throw new Error('unbalanced CSS block');
}

function ruleBlock(stylesheet, selector) {
  const start = stylesheet.indexOf(`${selector}{`);
  assert(start !== -1, `rule missing: ${selector}`);
  return balancedBlock(stylesheet, start);
}

function mediaBlocks(stylesheet, query) {
  const blocks = [];
  let at = stylesheet.indexOf(query);
  while (at !== -1) {
    const block = balancedBlock(stylesheet, at);
    blocks.push({ start: at, text: block });
    at = stylesheet.indexOf(query, at + block.length);
  }
  return blocks;
}

function extractArticles(source) {
  const blocks = [];
  const marker = '<article class="experience-card"';
  let at = source.indexOf(marker);
  while (at !== -1) {
    const end = source.indexOf('</article>', at);
    assert(end !== -1, 'unclosed experience article');
    blocks.push(source.slice(at, end + '</article>'.length));
    at = source.indexOf(marker, end);
  }
  return blocks;
}

function jpegDimensions(bytes) {
  assert(bytes[0] === 0xff && bytes[1] === 0xd8, 'JPEG magic bytes missing');
  let at = 2;
  while (at + 9 < bytes.length) {
    assert(bytes[at] === 0xff, 'invalid JPEG marker');
    const marker = bytes[at + 1];
    const length = bytes.readUInt16BE(at + 2);
    const isSof = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isSof) return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
    at += 2 + length;
  }
  throw new Error('JPEG SOF marker missing');
}

const featureMarker = '<article class="experience-card experience-feature"';
const firstExistingMarker = '<article class="experience-card" data-sector="ai"';

check('featured article is first in experience grid', () => {
  const featureAt = html.indexOf(featureMarker);
  const existingAt = html.indexOf(firstExistingMarker);
  assert(featureAt !== -1, 'featured article marker missing');
  assert(existingAt !== -1, 'first existing article marker missing');
  assert(featureAt < existingAt, 'featured article is not before the first existing article');
});

let feature = '';
check('featured article body can be isolated', () => {
  const start = html.indexOf(featureMarker);
  const end = html.indexOf('</article>', start);
  assert(start !== -1 && end !== -1, 'featured article bounds missing');
  feature = html.slice(start, end);
});

const exactStrings = [
  '<span class="exp-visual-label">HEALTHTECH / DIGITAL EXPERIENCE</span>',
  '<span class="exp-draft-badge">Draft · public-site reference</span>',
  '<h3>Vitelize Health — Digital Healthcare Experience</h3>',
  '<p class="exp-subtitle">Making integrated healthcare easier to discover and navigate.</p>',
  '<p>A digital health experience for Vitelize Health, connecting physician-guided metabolic care, personalized training, nutrition programs, and provider partnerships through a clear, user-friendly online journey.</p>',
  '<p>The website helps prospective members understand available programs, explore participating locations, and connect with the appropriate care or partnership team.</p>',
  '<a class="button exp-link" href="https://www.vitelizehealth.com/" target="_blank" rel="noopener noreferrer">',
  '<span class="exp-illustration-note">Concept reference — not a Vitelize screenshot</span>'
];

for (const [index, value] of exactStrings.entries()) {
  check(`featured article exact string ${index + 1}`, () => {
    assert(feature.includes(value), `missing: ${value.slice(0, 70)}`);
  });
}

check('draft badge is near the title and the long sentence is gone', () => {
  const badgeAt = feature.indexOf('<span class="exp-draft-badge">');
  const titleAt = feature.indexOf('<h3>');
  assert(badgeAt !== -1 && badgeAt < titleAt, 'draft badge is missing or not near the title');
  assert(!feature.includes('Draft — public-site reference; exact team contribution unconfirmed. This is not an ORVANU client claim.'), 'long draft sentence is still on the card');
});

check('featured article tags are in the supplied order', () => {
  const tags = [
    'HealthTech',
    'Healthcare Web Experience',
    'Patient Journeys',
    'Partner Discovery',
    'B2B &amp; B2C',
    'UX &amp; Web Development'
  ];
  let cursor = feature.indexOf('<div class="service-tags">');
  assert(cursor !== -1, 'service-tags block missing');
  for (const tag of tags) {
    cursor = feature.indexOf(`<span>${tag}</span>`, cursor);
    assert(cursor !== -1, `tag missing or out of order: ${tag}`);
    cursor += tag.length;
  }
});

check('featured description paragraphs stay in the supplied order', () => {
  const first = feature.indexOf('<p>A digital health experience for Vitelize Health,');
  const second = feature.indexOf('<p>The website helps prospective members');
  assert(first !== -1 && second !== -1, 'description paragraph missing');
  assert(first < second, 'description paragraphs are reversed');
});

check('featured article image uses the approved concept reference', () => {
  const img = feature.match(/<img class="exp-art"[^>]*>/)?.[0] ?? '';
  for (const fragment of [
    'src="assets/experience/vitelize-health.jpg"',
    'width="1120"',
    'height="700"',
    'loading="lazy"'
  ]) {
    assert(img.includes(fragment), `img missing ${fragment}`);
  }
  assert(/alt="[^"]*concept[^"]*"/i.test(img), 'img alt does not say concept');
  assert(/alt="[^"]*not a Vitelize Health screenshot"/i.test(img), 'img alt does not disclaim a real screenshot');
});

check('four existing cards are unchanged against the production baseline', () => {
  const actual = extractArticles(html).join('\n---BLOCK---\n').trimEnd();
  assert(actual === baseline, 'article markup/copy differs from the production baseline');
});

check('section note preserves draft/integrity wording', () => {
  const note = html.match(/<p class="work-note">([^<]*)<\/p>/)?.[1] ?? '';
  for (const phrase of [
    'draft public-site reference',
    'exact contribution is unconfirmed',
    'no ORVANU client relationship is claimed'
  ]) {
    assert(note.includes(phrase), `work-note missing: ${phrase}`);
  }
});

check('featured card CSS exists', () => {
  assert(css.includes('.experience-feature{grid-column:1/-1'), 'desktop grid-span rule missing');
  const mediaAt = css.indexOf('@media(max-width:900px)');
  assert(mediaAt !== -1, '900px media query missing');
  const mediaBlock = balancedBlock(css, mediaAt);
  assert(mediaBlock.includes('.experience-feature{grid-template-columns:1fr}'), '900px stack rule missing');
});

check('480px featured overrides come after the base rules', () => {
  const baseAt = css.indexOf('.experience-feature{grid-column');
  assert(baseAt !== -1, 'base featured rules missing');
  const smallBlocks = mediaBlocks(css, '@media(max-width:480px)').filter(block => block.start > baseAt);
  assert(smallBlocks.length > 0, 'no 480px media block appears after the base featured rules');
  for (const rule of [
    '.experience-feature .exp-body{padding:22px 20px 24px}',
    '.experience-feature .exp-visual{padding:14px 14px 0}',
    '.experience-feature .exp-subtitle{font-size:14px}'
  ]) {
    assert(smallBlocks.some(block => block.text.includes(rule)), `effective 480px rule missing: ${rule}`);
  }
});

check('external CTA is styled as a clear button', () => {
  const rule = ruleBlock(css, '.experience-feature .exp-link');
  assert(/background:#[0-9a-f]{6}/i.test(rule), 'CTA has no explicit background');
  assert(rule.includes('color:#fff'), 'CTA has no explicit white text');
  assert(rule.includes('border:'), 'CTA has no explicit border');
});

check('draft badge is visibly styled', () => {
  const rule = ruleBlock(css, '.exp-draft-badge');
  assert(rule.includes('background'), 'badge has no background');
  assert(rule.includes('color:'), 'badge has no text colour');
  assert(/font-size:\d+px/.test(rule), 'badge has no readable font size');
});

check('concept image file is an optimized 1120x700 JPEG', () => {
  const bytes = readFileSync(imagePath);
  const size = statSync(imagePath).size;
  const dimensions = jpegDimensions(bytes);
  assert(dimensions.width === 1120 && dimensions.height === 700, `wrong dimensions: ${dimensions.width}x${dimensions.height}`);
  assert(size >= 20 * 1024, 'image is smaller than 20 KB');
  assert(size <= 400 * 1024, 'image is larger than 400 KB');
});

check('spec records owner-approved image and badge changes', () => {
  for (const phrase of ['Healix', 'ai-support.jpg', 'short badge']) {
    assert(spec.includes(phrase), `spec missing approved-change note: ${phrase}`);
  }
});

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}

console.log('All Vitelize draft checks passed.');
