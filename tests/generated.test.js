// Pliki generowane narzędziami muszą być aktualne (inaczej telefon offline albo ciemny motyw rozjadą się z kodem).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const assets = require('../tools/build-assets.js');
const dark = require('../tools/build-dark.js');

const ROOT = path.join(__dirname, '..');

test('sw-assets.js jest aktualny (node tools/build-assets.js)', () => {
  assert.strictEqual(fs.readFileSync(path.join(ROOT, 'sw-assets.js'), 'utf8'), assets.render());
});

test('lista offline zawiera wszystkie ikony słówek i istniejące nagrania', () => {
  const files = assets.list();
  assert.ok(files.some((f) => f.startsWith('assets/words/')));
  for (const f of files) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
});

test('dark.css jest aktualny (node tools/build-dark.js)', () => {
  assert.strictEqual(fs.readFileSync(path.join(ROOT, 'dark.css'), 'utf8'), dark.render());
});

test('ciemny motyw: jasne tło → ciemne, ciemny tekst → jasny', () => {
  const lum = (c) => (c.r + c.g + c.b) / 3;
  const bg = dark.darken(dark.parseColor('#ffffff'), 'bg');
  const txt = dark.darken(dark.parseColor('#1b1f3e'), 'text');
  assert.ok(lum(bg) < 60, 'białe tło robi się ciemne');
  assert.ok(lum(txt) > 200, 'ciemny tekst robi się jasny');
  assert.strictEqual(dark.darken(dark.parseColor('#6143ff'), 'bg'), null, 'kolor marki zostaje');
});
