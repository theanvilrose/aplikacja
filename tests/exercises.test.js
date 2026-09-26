// Testy generatora zadań z lekcji (js/exercises.js). Uruchom w folderze aplikacji: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const E = require('../js/exercises.js');
const { parseMarkdown } = require('../js/parser.js');

// prawdziwe słówka, jeśli są obok; inaczej generator korzysta z list zapasowych
const md = path.join(__dirname, '..', '..', 'Angielski', 'slowka.md');
const WORDS = fs.existsSync(md) ? parseMarkdown(fs.readFileSync(md, 'utf8')) : [];

function seeded(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

test('każda obsługiwana lekcja daje 4 sekcje A–D bez pustych i powtórzonych zadań', () => {
  const rand = seeded(42);
  for (const L of E.SUPPORTED) {
    for (let k = 0; k < 200; k++) {
      for (const words of [WORDS, []]) {
        const ex = E.generate(L, words, rand);
        assert.deepEqual(ex.sections.map((s) => s.key), ['A', 'B', 'C', 'D'], L);
        for (const s of ex.sections) {
          const prompts = s.items.map((i) => i.prompt);
          assert.equal(new Set(prompts).size, prompts.length, `${L}${s.key}: powtórka ${prompts}`);
          for (const it of s.items) {
            assert.ok(it.prompt && !/undefined|null/.test(it.prompt), `${L}${s.key}: ${it.prompt}`);
            if (it.kind === 'choice') assert.ok(it.options.includes(it.answer), `${L}${s.key}: brak odpowiedzi w opcjach`);
            else assert.equal(E.check(it, it.answers[0]), 'ok', `${L}${s.key}: wzorcowa odpowiedź nie przechodzi: ${it.answers[0]}`);
          }
        }
      }
    }
  }
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
