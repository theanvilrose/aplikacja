// Generuje js/seed-words.js ze słownika w ..\Angielski i js/seed-lessons.js z program_A1.md.
// Źródła: slownik.md (tematy) + zwroty.md (zwroty) + czesci_mowy.md (zaimki i słowa spoza słownika);
// gdy ich nie ma — dawny slowka.md. Użycie: node tools/import-slowka.js [folder albo plik .md]
const fs = require('fs');
const path = require('path');
const { parseMarkdown, parseProgram } = require('../js/parser.js');

const arg = process.argv[2] || path.join(__dirname, '..', '..', 'Angielski');
const dir = fs.existsSync(arg) && fs.statSync(arg).isDirectory() ? arg : path.dirname(arg);
const NEW = ['slownik.md', 'zwroty.md', 'czesci_mowy.md'].map((f) => path.join(dir, f)).filter((f) => fs.existsSync(f));
const sources = dir !== arg ? [arg] : NEW.length ? NEW : [path.join(dir, 'slowka.md')];
const dest = path.join(__dirname, '..', 'js', 'seed-words.js');

const words = parseMarkdown(sources.map((f) => fs.readFileSync(f, 'utf8')));
fs.writeFileSync(
  dest,
  '// Wygenerowane przez tools/import-slowka.js — nie edytuj ręcznie.\n' +
    'window.SEED_WORDS = [\n' + words.map((w) => JSON.stringify(w)).join(',\n') + '\n];\n'
);

const topics = {};
for (const w of words) topics[w.topic] = (topics[w.topic] || 0) + 1;
console.log(`Zapisano ${words.length} słówek z ${sources.map((f) => path.basename(f)).join(', ')} (${Object.keys(topics).length} tematów)`);

// Plan lekcji z program_A1.md (obok słownika) → js/seed-lessons.js — do zadań z lekcji.
const programSrc = path.join(dir, 'program_A1.md');
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
