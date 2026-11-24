const fs = require('node:fs');

const html = fs.readFileSync('_inspect/main-index.html', 'utf8');
const blocks = [];
const marker = '<article class="experience-card"';
let at = html.indexOf(marker);

while (at !== -1) {
  const end = html.indexOf('</article>', at);
  if (end === -1) break;
  blocks.push(html.slice(at, end + '</article>'.length));
  at = html.indexOf(marker, end);
}

fs.writeFileSync('_inspect/experience-baseline.txt', blocks.join('\n---BLOCK---\n') + '\n', 'utf8');
console.log(`baseline blocks: ${blocks.length}`);
