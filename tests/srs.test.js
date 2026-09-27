// Testy algorytmu powtórek i sprawdzania odpowiedzi.
// Uruchom w folderze aplikacji: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const SRS = require('../js/srs.js');
const Answer = require('../js/answer.js');

const DAY = SRS.DAY;
const NOW = new Date(2026, 8, 26, 12, 0).getTime();
const isKnown = (c) => c.s >= 2; // tak samo jak w js/app/core.js

test('nowe słowo: poprawne odpowiedzi podnoszą poziom i wydłużają przerwę', () => {
  let c = { ...SRS.fresh(), level: 1, due: NOW, last: NOW };
  c = SRS.review(c, 2, NOW);
  assert.equal(c.level, 2);
  assert.equal(c.s, 1);
  assert.ok(c.due > NOW);
  const later = c.due + 1000;
  const c2 = SRS.review(c, 2, later);
  assert.ok(c2.s > c.s, 'stabilność rośnie po kolejnej dobrej odpowiedzi');
});

test('pomyłka: słowo wraca za 10 minut, spada o poziom i rośnie trudność', () => {
  const c = { ...SRS.fresh(), level: 4, s: 10, d: 5, reps: 5, due: NOW, last: NOW - 10 * DAY };
  const r = SRS.review(c, 0, NOW);
  assert.equal(r.level, 3);
  assert.equal(r.lapses, 1);
  assert.equal(r.due, NOW + 10 * 60000);
  assert.ok(r.d > c.d);
  assert.ok(!isKnown(r) || r.s <= 2, 'pomyłka mocno skraca przerwę');
});

test('poziom nie spada poniżej 1 i nie rośnie ponad MAX_LEVEL', () => {
  const low = SRS.review({ ...SRS.fresh(), level: 1, s: 0.5 }, 0, NOW);
  assert.equal(low.level, 1);
  let c = { ...SRS.fresh(), level: SRS.MAX_LEVEL, s: 30, last: NOW - 40 * DAY };
  c = SRS.review(c, 3, NOW);
  assert.equal(c.level, SRS.MAX_LEVEL);
});

test('szybka odpowiedź daje wyższą ocenę niż wolna', () => {
  assert.equal(SRS.grade(true, 1000, 'en2pl', 5, false), 3);
  assert.equal(SRS.grade(true, 9000, 'en2pl', 5, false), 1);
  assert.equal(SRS.grade(false, 1000, 'en2pl', 5, false), 0);
  assert.equal(SRS.grade(true, 1000, 'en2pl', 5, true), 1, 'literówka / podpowiedź = z trudem');
});

test('„Wiem” (s = 2, sprawdzenie jutro): dobra odpowiedź zostawia słowo wyuczonym, pomyłka cofa do nauki', () => {
  // ten sam stan, który ustawia markKnown() w js/app/word.js
  const known = { ...SRS.fresh(), level: SRS.MAX_LEVEL - 1, s: 2, d: 5, reps: 1, last: NOW, due: NOW + DAY };
  assert.ok(isKnown(known));
  const ok = SRS.review(known, 2, NOW + DAY);
  assert.ok(isKnown(ok) && ok.s > 2, 'dobra odpowiedź wydłuża przerwę');
  const bad = SRS.review(known, 0, NOW + DAY);
  assert.ok(!isKnown(bad), 'pomyłka zdejmuje „wyuczone”');
});

test('„Naucz się ponownie” (poziom 1, s = 0): słowo przechodzi fazę nauki od nowa', () => {
  const again = { ...SRS.fresh(), level: 1, s: 0, d: 4, reps: 9, lapses: 1, due: NOW, last: NOW };
  assert.ok(!isKnown(again));
  const r = SRS.review(again, 3, NOW);
  assert.equal(r.s, 2, 'faza nauki: błyskawiczna odpowiedź = 2 dni');
  assert.equal(r.level, 2);
});

test('wybór ćwiczenia respektuje wyłączony słuch i pisanie', () => {
  const word = { en: 'teacher' };
  for (let i = 0; i < 200; i++) {
    const t = SRS.pickType({ level: 5 }, word, { speak: false, typing: false });
    assert.ok(!SRS.isListening(t) && !SRS.isTyping(t), `dostałem ${t}`);
  }
});

test('sprawdzanie odpowiedzi: wielkość liter, skróty, „the”, literówki', () => {
  assert.equal(Answer.check('Good Morning!', 'Good morning!'), 'ok');
  assert.equal(Answer.check("I am from Poland", "I'm from Poland."), 'ok');
  assert.equal(Answer.check('czech republic', 'the Czech Republic'), 'ok');
  assert.equal(Answer.check('teachr', 'teacher'), 'typo');
  assert.equal(Answer.check('doctor', 'teacher'), 'wrong');
  assert.equal(Answer.check('', 'teacher'), 'wrong');
  assert.equal(Answer.check('hi', 'hello / hi'), 'ok', 'warianty rozdzielone ukośnikiem');
});
