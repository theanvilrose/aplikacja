const test = require('node:test');
const assert = require('node:assert');
const B = require('../js/builder.js');

// powtarzalne „losowanie” do testów
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test('target: pierwszy wariant bez nawiasów i interpunkcji', () => {
  assert.strictEqual(B.target('Hello / Hi!'), 'Hello');
  assert.strictEqual(B.target('Good morning!'), 'Good morning');
  assert.strictEqual(B.target('first name (imię)'), 'first name');
});

test('sylaby: 2–4 kawałki po min. 2 znaki, sklejają się w słowo', () => {
  for (const w of ['pack', 'friend', 'hotel', 'window', 'nationality', 'Switzerland', 'circumstance', 'teacher']) {
    const parts = B.syllables(w);
    assert.strictEqual(parts.join(''), w, w);
    assert.ok(parts.length >= 2 && parts.length <= 4, `${w}: ${parts}`);
    assert.ok(parts.every((p) => p.length >= 2), `${w}: ${parts}`);
  }
  assert.deepStrictEqual(B.syllables('pack'), ['pa', 'ck']);
  // typowe cząstki i granice sylab
  assert.deepStrictEqual(B.syllables('nationality'), ['na', 'tion', 'al', 'ity']);
  assert.deepStrictEqual(B.syllables('information'), ['in', 'for', 'ma', 'tion']);
  assert.deepStrictEqual(B.syllables('friend'), ['fri', 'end']);
  assert.deepStrictEqual(B.syllables('doctor'), ['doc', 'tor']);
  assert.deepStrictEqual(B.syllables('you'), ['you']); // krótkie słowo zostaje w całości
});

test('tryby: sylaby, litery, litery z pułapkami', () => {
  const syl = B.make('friend', 'syll', { rand: seeded(3) });
  assert.strictEqual(syl.kind, 'chars');
  assert.ok(syl.tiles.some((t) => t.text.length > 1));
  assert.deepStrictEqual([...syl.tiles.map((t) => t.text).join('')].sort(), [...'friend'].sort()); // same litery słowa, bez pułapek

  const let3 = B.make('friend', 'letters', { rand: seeded(5) });
  assert.strictEqual(let3.tiles.length, 6);
  assert.deepStrictEqual(let3.tiles.map((t) => t.text).sort(), [...'friend'].sort());

  const hard = B.make('friend', 'letters+', { rand: seeded(7) });
  const extra = hard.tiles.map((t) => t.text).filter((c) => !'friend'.includes(c));
  assert.ok(extra.length >= 2, 'są litery-pułapki');
  assert.strictEqual(hard.tiles.length, 6 + extra.length);
});

test('kafelki nie leżą od razu w dobrej kolejności', () => {
  for (let s = 1; s < 30; s++) {
    const t = B.make('hotel', 'letters', { rand: seeded(s) });
    assert.notStrictEqual(t.tiles.map((x) => x.text).join(''), 'hotel');
  }
});

test('zwroty układa się z wyrazów (+ wyraz-pułapka na wysokim poziomie)', () => {
  const easy = B.make('Nice to meet you.', 'syll', { rand: seeded(2) });
  assert.strictEqual(easy.kind, 'words');
  assert.strictEqual(easy.tiles.length, 4);
  const hard = B.make('Nice to meet you.', 'letters+', { rand: seeded(2), decoyWords: ['see', 'you'] });
  assert.strictEqual(hard.tiles.length, 5);
  assert.ok(hard.tiles.some((t) => t.text === 'see'));
});

test('sprawdzanie ułożenia i licznik pól', () => {
  const t = B.make("I'm", 'letters', { rand: seeded(4) });
  assert.strictEqual(B.total(t), 2); // apostrof jest stały
  assert.ok(B.check(t, ['i', 'm']));
  assert.ok(!B.check(t, ['m', 'i']));
  const syl = B.make('pack', 'syll', { rand: seeded(1) });
  assert.strictEqual(B.filled(syl, ['pa']), 2);
  assert.ok(B.check(syl, ['pa', 'ck']));
  const phrase = B.make('Nice to meet you', 'syll', { rand: seeded(1) });
  assert.ok(B.check(phrase, ['Nice', 'to', 'meet', 'you']));
  assert.strictEqual(B.filled(phrase, ['Nice']), 1);
});
