// Static verification for the six-project portfolio addition.
// Run: node _inspect/verify-six-portfolio.mjs   (from project root)
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${extra ? ' :: ' + extra : ''}`); }
}

function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    i += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const len = buf.readUInt16BE(i);
    const isSOF = marker >= 0xc0 && marker <= 0xcf &&
      marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) return { width: buf.readUInt16BE(i + 5), height: buf.readUInt16BE(i + 3) };
    i += len;
  }
  return null;
}

const html = read('public/index.html');
const js = read('public/script.js');
const css = read('public/styles.css');
const publicCopy = html + '\n' + js; // page copy only (CSS gradients contain harmless "%" values)

// 1. Images
const imgs = [
  'project-yard-management.jpg', 'project-single-item.jpg', 'project-driver-analytics.jpg',
  'project-quality-control.jpg', 'project-proof-of-delivery.jpg', 'project-dark-store.jpg',
];
for (const f of imgs) {
  const p = path.join(ROOT, 'public/assets/experience', f);
  const ok = existsSync(p);
  check(`image exists: ${f}`, ok);
  if (ok) {
    const buf = readFileSync(p);
    const sz = jpegSize(buf);
    check(`image 1120x700 jpeg: ${f}`, !!sz && sz.width === 1120 && sz.height === 700, JSON.stringify(sz));
    check(`image > 10KB: ${f}`, statSync(p).size > 10 * 1024, String(statSync(p).size));
  }
}

// 2. Section copy
check('category title present', html.includes('Selected Product &amp; Operations Experience') || html.includes('Selected Product & Operations Experience'));
check('clarification line present', html.includes('Selected examples of product and operational initiatives from previous professional experience.'));
check('old Yard Management System card removed', !html.includes('Yard Management System'));
check('project grid container present', html.includes('id="project-grid"'));
check('project dialog present', html.includes('id="project-dialog"'));
check('work-note mentions previous professional experience', /Selected Product &amp; Operations Experience|Selected Product & Operations Experience/.test(html) && html.includes('not by ORVANU as a vendor'));
check('noscript fallback lists Digital Yard Management', html.includes('<noscript>') && html.includes('Digital Yard Management'));

// 3. JS data + render
check('PROJECTS array present', /const PROJECTS\s*=\s*\[/.test(js));
const ids = ['yard-management', 'single-item', 'driver-analytics', 'quality-control', 'proof-of-delivery', 'dark-store'];
for (const id of ids) check(`project id present: ${id}`, js.includes(`id: '${id}'`) || js.includes(`id:'${id}'`));
check('renderProjects called', /renderProjects\s*\(\s*\)/.test(js));
check('openProjectDialog present', js.includes('openProjectDialog'));
check('dialog showModal used', js.includes('showModal'));

// 4. Withheld metrics must NOT appear in public text
check('+18% withheld', !publicCopy.includes('+18%'));
check('12% withheld', !publicCopy.includes('12%'));
check('no source brand names in public text', !/platbricks|dispatchone|swift quick|swift_quick/i.test(publicCopy));

// 5. CSS hooks
check('.project-grid style present', css.includes('.project-grid'));
check('.project-dialog style present', css.includes('.project-dialog'));
check('three-column project grid', /project-grid\{[^}]*repeat\(3/.test(css.replace(/\s/g, '')) || /project-grid\{[^}]*grid-template-columns:repeat\(3/.test(css.replace(/\s/g, '')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
