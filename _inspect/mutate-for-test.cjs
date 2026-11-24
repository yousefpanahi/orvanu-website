const fs = require('node:fs');

const source = fs.readFileSync('public/index.html', 'utf8');
const mutated = source.replace('Designed and launched an AI chatbot', 'MUTATED AI chatbot');
if (mutated === source) throw new Error('baseline text not found');
fs.writeFileSync('_inspect/mutated-index.html', mutated, 'utf8');
console.log('mutated copy written');
