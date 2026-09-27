// Tworzy sw-assets.js: listę ikon słówek i nagrań wymowy, które service worker zapisuje do pracy bez internetu.
// Uruchamia go start.bat i serwer (po starcie oraz po zapisaniu ikony / nagrania w panelu dewelopera).
// node tools/build-assets.js        → zapisuje plik
// require('./build-assets').list()  → sama lista (do testów)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'sw-assets.js');

// wczytuje pliki window.X = {...} bez przeglądarki
function readWindowFile(file) {
  const ctx = { window: {} };
  try { vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx); } catch (e) { /* brak pliku */ }
  return ctx.window;
}

function list() {
  const icons = {
    ...(readWindowFile('js/word-icons.js').WORD_ICONS || {}),
    ...(readWindowFile('js/word-icons-extra.js').EXTRA_WORD_IMG || {}),
  };
  const audio = readWindowFile('js/word-audio.js').WORD_AUDIO || {};
  const files = new Set();
  for (const name of Object.values(icons)) files.add(`assets/words/${name}.png`);
  for (const byText of Object.values(audio)) for (const f of Object.values(byText)) files.add(`assets/audio/${f}`);
  // tylko pliki, które naprawdę są na dysku (brakujący plik nie może zablokować instalacji)
  return [...files].filter((f) => fs.existsSync(path.join(ROOT, f))).sort();
}

function render(files = list()) {
  return '// Wygenerowane przez tools/build-assets.js — nie edytuj ręcznie.\n' +
    '// Ikony słówek i nagrania wymowy do pracy offline (service worker: sw.js).\n' +
    `self.ASSET_FILES = ${JSON.stringify(files, null, 1)};\n`;
}

// zapisuje tylko przy zmianie (plik nie „drga” w gicie ani w przeglądarce)
function build() {
  const text = render();
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (old !== text) fs.writeFileSync(OUT, text);
  return old !== text;
}

module.exports = { list, render, build };
if (require.main === module) {
  const changed = build();
  console.log(`sw-assets.js: ${list().length} plików${changed ? ' (zaktualizowano)' : ''}`);
}
