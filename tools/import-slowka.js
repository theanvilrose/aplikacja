// Generuje js/seed-words.js z pliku slowka.md.
// Użycie: node tools/import-slowka.js [ścieżka/do/slowka.md]
const fs = require('fs');
const path = require('path');
const { parseMarkdown } = require('../js/parser.js');

const src = process.argv[2] || path.join(__dirname, '..', '..', 'Angielski', 'slowka.md');
const dest = path.join(__dirname, '..', 'js', 'seed-words.js');

const words = parseMarkdown(fs.readFileSync(src, 'utf8'));
fs.writeFileSync(
  dest,
  '// Wygenerowane przez tools/import-slowka.js — nie edytuj ręcznie.\n' +
    'window.SEED_WORDS = ' + JSON.stringify(words, null, 1) + ';\n'
);

const topics = {};
for (const w of words) topics[w.topic] = (topics[w.topic] || 0) + 1;
console.log(`Zapisano ${words.length} słówek do ${path.relative(process.cwd(), dest)}`);
for (const [t, n] of Object.entries(topics)) console.log(`  ${t}: ${n}`);
