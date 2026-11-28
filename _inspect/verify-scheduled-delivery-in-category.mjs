// TDD verification: Scheduled Delivery Business Line moved into the
// "Selected Product & Operations Experience" category as a project card,
// placed in the middle (4th of 7).
// Run: node _inspect/verify-scheduled-delivery-in-category.mjs
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${extra ? ' :: ' + extra : ''}`); }
};

function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1]; i += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const len = buf.readUInt16BE(i);
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) return { width: buf.readUInt16BE(i + 5), height: buf.readUInt16BE(i + 3) };
    i += len;
  }
  return null;
}

const html = read('public/index.html');
const js = read('public/script.js');
const publicCopy = html + '\n' + js;

// 1. Scheduled Delivery exists as a project in the PROJECTS data, with image + copy
check('scheduled-delivery project id present', js.includes("id: 'scheduled-delivery'"));
check('title present in PROJECTS', js.includes("title: 'Scheduled Delivery Business Line'"));
check('image path present in PROJECTS', js.includes("image: 'assets/experience/scheduled-delivery.jpg'"));
const imgPath = path.join(ROOT, 'public/assets/experience/scheduled-delivery.jpg');
const imgOk = existsSync(imgPath);
check('scheduled-delivery image file exists', imgOk);
if (imgOk) {
  const sz = jpegSize(readFileSync(imgPath));
  check('scheduled-delivery image 1120x700', !!sz && sz.width === 1120 && sz.height === 700, JSON.stringify(sz));
}

// 2. All seven project ids present, in the expected order with scheduled in the middle
const ids = ['yard-management', 'single-item', 'driver-analytics', 'scheduled-delivery', 'quality-control', 'proof-of-delivery', 'dark-store'];
const pos = {};
for (const id of ids) pos[id] = js.indexOf("id: '" + id + "'");
check('all seven project ids present', ids.every(id => pos[id] >= 0), JSON.stringify(pos));
check('scheduled-delivery is middle (after driver, before quality)',
  pos['scheduled-delivery'] > pos['driver-analytics'] && pos['scheduled-delivery'] < pos['quality-control']);
const numValues = ['01', '02', '03', '04', '05', '06', '07'].map(n => js.includes("num: '" + n + "'"));
check('nums 01-07 all used', numValues.every(Boolean), JSON.stringify(numValues));

// 3. The standalone experience card is gone from the experience grid
check('no logistics experience card in HTML', !html.includes('data-sector="logistics"'));
check('no LOGISTICS split-card label in HTML', !html.includes('exp-visual-label">LOGISTICS'));
check('no standalone Scheduled Delivery <h3> in experience cards',
  !/<article class="experience-card"[^>]*>[\s\S]*?<h3>Scheduled Delivery Business Line<\/h3>/.test(html));

// 4. Category intro reflects seven initiatives
check('category intro says Seven', html.includes('Seven representative initiatives spanning logistics, e-commerce, and operational systems.'));
check('no leftover "Six representative"', !html.includes('Six representative'));

// 5. noscript fallback lists Scheduled Delivery in the middle
const nsMatch = html.match(/<noscript>[\s\S]*?Digital Yard Management[\s\S]*?<\/noscript>/);
const ns = nsMatch ? nsMatch[0] : '';
check('project noscript present', !!nsMatch);
check('noscript lists Scheduled Delivery', ns.includes('Scheduled Delivery Business Line'));
check('noscript places it between Driver and Inbound',
  ns.indexOf('Driver') > -1 && ns.indexOf('Scheduled Delivery Business Line') > ns.indexOf('Driver') &&
  ns.indexOf('Scheduled Delivery Business Line') < ns.indexOf('Inbound Receiving'));

// 6. Compliance: withheld metrics + no employer/brand names in public copy
check('+18% still withheld', !publicCopy.includes('+18%'));
check('12% still withheld', !/12%/.test(publicCopy));
check('no employer/brand names leaked', !/platbricks|dispatchone|swift\s*quick/i.test(publicCopy));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
