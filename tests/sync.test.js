const test = require('node:test');
const assert = require('node:assert');
const Sync = require('../js/sync.js');

const base = () => ({ cards: {}, days: {}, gems: 0, best: 0, exams: [], lists: [], settings: { accent: 'en-GB' }, stamp: {} });

test('karty: każde słowo osobno, wygrywa nowsza nauka', () => {
  const a = { ...base(), cards: { cat: { level: 3, last: 200, reps: 5 }, dog: { level: 1, last: 50, reps: 1 } } };
  const b = { ...base(), cards: { cat: { level: 2, last: 100, reps: 4 }, dog: { level: 2, last: 90, reps: 2 }, sun: { level: 1, last: 10, reps: 1 } } };
  const m = Sync.merge(a, b);
  assert.strictEqual(m.cards.cat.level, 3);
  assert.strictEqual(m.cards.dog.level, 2);
  assert.ok(m.cards.sun, 'słowo tylko z drugiego urządzenia zostaje');
});

test('dni: liczniki biorą większą wartość, skrzynia raz otwarta zostaje otwarta', () => {
  const a = { ...base(), days: { '2026-09-27': { rv: 5, nw: 2, ms: 60000 } } };
  const b = { ...base(), days: { '2026-09-27': { rv: 3, nw: 4, ms: 90000, chest: true }, '2026-09-26': { rv: 1 } } };
  const m = Sync.merge(a, b);
  assert.deepStrictEqual(m.days['2026-09-27'], { rv: 5, nw: 4, ms: 90000, chest: true });
  assert.ok(m.days['2026-09-26']);
});

test('reszta: wygrywa wersja zmieniona później', () => {
  const a = { ...base(), gems: 40, settings: { accent: 'en-US' }, stamp: { gems: 100, settings: 300 } };
  const b = { ...base(), gems: 55, settings: { accent: 'en-GB' }, stamp: { gems: 200, settings: 100 } };
  const m = Sync.merge(a, b);
  assert.strictEqual(m.gems, 55);
  assert.strictEqual(m.settings.accent, 'en-US');
  assert.strictEqual(m.stamp.gems, 200);
});

test('seria i testy: największa seria, testy z obu urządzeń bez duplikatów', () => {
  const e1 = { kind: 'a1', date: 1, pct: 80 }, e2 = { kind: 'a1', date: 2, pct: 90 };
  const m = Sync.merge({ ...base(), best: 7, exams: [e1] }, { ...base(), best: 4, exams: [e1, e2] });
  assert.strictEqual(m.best, 7);
  assert.strictEqual(m.exams.length, 2);
});

test('pusty zapis nowego urządzenia przejmuje postęp; same() ignoruje znaczniki czasu', () => {
  const b = { ...base(), cards: { cat: { level: 2, last: 5, reps: 1 } }, stamp: { gems: 9 } };
  const m = Sync.merge(base(), b);
  assert.ok(m.cards.cat);
  assert.ok(Sync.same({ ...m, stamp: { x: 1 } }, { ...m, stamp: { y: 2 } }));
  assert.ok(!Sync.same(m, base()));
});
