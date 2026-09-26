// Generuje js/seed-words.js z pliku slowka.md i js/seed-lessons.js z program_A1.md.
// Użycie: node tools/import-slowka.js [ścieżka/do/slowka.md]
const fs = require('fs');
const path = require('path');
const { parseMarkdown, parseProgram } = require('../js/parser.js');

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

// Plan lekcji z program_A1.md (obok slowka.md) → js/seed-lessons.js — do zadań z lekcji.
const programSrc = path.join(path.dirname(src), 'program_A1.md');
const lessonsDest = path.join(__dirname, '..', 'js', 'seed-lessons.js');
if (fs.existsSync(programSrc)) {
  const program = parseProgram(fs.readFileSync(programSrc, 'utf8'));
  fs.writeFileSync(
    lessonsDest,
    '// Wygenerowane przez tools/import-slowka.js z program_A1.md — nie edytuj ręcznie.\n' +
      'window.SEED_PROGRAM = ' + JSON.stringify(program, null, 1) + ';\n'
  );
  const cur = program.lessons.find((l) => l.status === 'progress');
  console.log(`Zapisano plan: ${program.lessons.length} lekcji${cur ? `, teraz ${cur.id} ${cur.title}` : ''}`);
} else {
  console.log(`Brak ${programSrc} — plan lekcji bez zmian`);
}
