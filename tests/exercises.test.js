// Testy generatora zadań z lekcji (js/exercises.js). Uruchom w folderze aplikacji: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const E = require('../js/exercises.js');
const { parseMarkdown } = require('../js/parser.js');

// prawdziwe słówka, jeśli są obok (bez nich generator układa tylko zadania niepotrzebujące słówek)
const dir = path.join(__dirname, '..', '..', 'Angielski');
const files = ['slownik.md', 'zwroty.md', 'czesci_mowy.md', 'slowka.md'].map((f) => path.join(dir, f)).filter((f) => fs.existsSync(f));
const WORDS = files.length ? parseMarkdown(files.map((f) => fs.readFileSync(f, 'utf8'))) : [];

function seeded(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

function allItems(ex) { return ex.sections.flatMap((s) => s.items.map((it) => ({ s, it }))); }

test('każda obsługiwana lekcja: poprawne, niepowtórzone zadania (Twoje słówka, mało słów i żadnych)', () => {
  const rand = seeded(42);
  const few = WORDS.filter((w, i) => i % 9 === 0); // „tylko poznane” — mały podzbiór
  for (const L of E.SUPPORTED) {
    for (let k = 0; k < 150; k++) {
      for (const words of [WORDS, few, []]) {
        const ex = E.generate(L, words, rand);
        for (const s of ex.sections) {
          assert.ok(s.items.length > 0, `${L}${s.key}: pusta sekcja`);
          const keys = s.items.map((i) => i.prompt + '|' + (i.tag || ''));
          assert.equal(new Set(keys).size, keys.length, `${L}${s.key}: powtórka`);
        }
        for (const { s, it } of allItems(ex)) {
          assert.ok(it.prompt && !/undefined|null/.test(it.prompt), `${L}${s.key}: ${it.prompt}`);
          if (it.kind === 'choice') assert.ok(it.options.includes(it.answer), `${L}${s.key}: brak odpowiedzi w opcjach`);
          else assert.equal(E.check(it, it.answers[0]), 'ok', `${L}${s.key}: wzorcowa odpowiedź nie przechodzi: ${it.answers[0]}`);
        }
      }
    }
  }
  // z pełnymi słówkami lekcje mają komplet części A–D
  for (const L of ['L1', 'L2', 'L3', 'L4']) assert.deepEqual(E.generate(L, WORDS, rand).sections.map((s) => s.key), ['A', 'B', 'C', 'D'], L);
});

test('żadnych nowych słów: przedmioty, zawody, kraje i nastroje tylko z przekazanych słówek', () => {
  const rand = seeded(5);
  const LEXICON = ['laptop', 'desk', 'office', 'chair', 'computer', 'phone', 'bag', 'wallet', 'umbrella', 'manager', 'engineer', 'mechanic', 'boss', 'teacher', 'nurse', 'doctor', 'hungry', 'thirsty', 'bored', 'angry'];
  const COUNTRIES = ['Poland', 'Spain', 'Germany', 'France', 'Italy', 'England', 'Canada', 'China', 'India', 'Japan', 'Mexico', 'Turkey', 'Sweden', 'Norway', 'Greece', 'Ireland', 'Portugal', 'Scotland', 'Ukraine'];
  for (const words of [WORDS, WORDS.filter((w, i) => i % 7 === 0), []]) {
    const allowed = new Set(words.map((w) => w.en.toLowerCase()));
    const inWords = (t) => [...allowed].some((en) => new RegExp(`\\b${t}\\b`, 'i').test(en));
    for (const L of E.SUPPORTED) {
      for (let k = 0; k < 100; k++) {
        for (const { it } of allItems(E.generate(L, words, rand))) {
          const textAll = [it.prompt, ...(it.answers || []), ...(it.options || [])].join(' ');
          for (const t of [...LEXICON, ...COUNTRIES]) {
            if (new RegExp(`\\b${t}\\b`, 'i').test(textAll)) assert.ok(inWords(t), `${L}: „${t}” nie ma w słówkach, a jest w: ${textAll}`);
          }
        }
      }
    }
  }
});

test('ustawienia: liczba zadań w części i wybór części', () => {
  const ex = E.generate('L4', WORDS, seeded(3), { count: 3, parts: 'AC' });
  assert.deepEqual(ex.sections.map((s) => s.key), ['A', 'C']);
  for (const s of ex.sections) assert.ok(s.items.length <= 3 && s.items.length > 0);
  assert.deepEqual(E.parts('L1').map((p) => p.key), ['A', 'B', 'C', 'D']);
});

test('lekcja bez generatora zwraca null', () => {
  assert.equal(E.generate('L37', WORDS), null);
  assert.equal(E.supported('L4'), true);
  assert.equal(E.supported('L30'), false);
});

test('L4: a / an zgodnie z pierwszą literą', () => {
  const rand = seeded(7);
  for (let k = 0; k < 200; k++) {
    const B = E.generate('L4', WORDS, rand).sections[1].items;
    for (const it of B) {
      const m = it.prompt.match(/It's ___ (\w+)/);
      if (m) assert.equal(it.answer, /^[aeiou]/.test(m[1]) ? 'an' : 'a', it.prompt);
    }
  }
});

test('sprawdzanie: skrót musi być skrótem, pytanie musi mieć szyk pytania', () => {
  const skrot = { kind: 'text', answers: ["She's from Spain."], mode: 'contraction' };
  assert.equal(E.check(skrot, "She's from Spain"), 'ok');
  assert.equal(E.check(skrot, 'she’s from spain!'), 'ok');
  assert.equal(E.check(skrot, 'Shes from Spain'), 'typo', 'zgubiony apostrof = prawie');
  assert.equal(E.check(skrot, 'She is from Spain.'), 'wrong', 'pełna forma to nie skrót');
  const pytanie = { kind: 'text', answers: ['Is he Polish?'], mode: 'loose' };
  assert.equal(E.check(pytanie, 'is he polish'), 'ok');
  assert.equal(E.check(pytanie, 'He is Polish?'), 'wrong');
  const tlum = { kind: 'text', answers: ['Who is this?', 'Who is it?'], mode: 'loose' };
  assert.equal(E.check(tlum, "Who's this?"), 'ok', 'skrót w tłumaczeniu też dobrze');
  assert.equal(E.check(tlum, ''), 'wrong');
  assert.equal(E.check({ kind: 'choice', answer: 'an' }, 'an'), 'ok');
  assert.equal(E.check({ kind: 'choice', answer: 'an' }, 'a'), 'wrong');
});
