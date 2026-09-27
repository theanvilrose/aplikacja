// Ćwiczenie „Utwórz prawidłowe słowo”: podział słowa na sylaby / litery i kafelki do układania.
// Trudność zależy od postępu słowa (tryb wybiera app.js): 'syll' — kawałki słowa, 'letters' — litery,
// 'letters+' — litery i kilka liter-pułapek. Zwroty układa się z całych wyrazów ('words').
(function (root) {
  'use strict';

  const VOWELS = 'aeiouy';
  const DIGRAPHS = ['ch', 'sh', 'th', 'ph', 'ck', 'ng', 'qu', 'wh', 'gh', 'ee', 'oo', 'ea', 'ou', 'ai', 'ay', 'oy', 'ey'];
  const isVowel = (c) => VOWELS.includes(c.toLowerCase());
  const isLetter = (c) => /[a-z]/i.test(c);

  // Co układamy: pierwszy wariant („Hello / Hi” → „Hello”), bez nawiasów i końcowej interpunkcji.
  function target(en) {
    return String(en || '')
      .split(/\s+\/\s+/)[0]
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[!?.,;:…]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Typowe cząstki angielskich słów — kawałki na ich granicach czytają się naturalnie (na|tion|al|ity).
  const UNITS = ['tion', 'sion', 'ture', 'ment', 'ness', 'ship', 'less', 'ful', 'ity', 'ous', 'ing', 'ish', 'ese', 'ian', 'est', 'er', 'or', 'al', 'ly', 'ty', 'ble'];
  const PREFIXES = ['un', 're', 'dis', 'pre', 'in', 'im', 'con', 'com', 'ex'];
  // spółgłoski, od których może zacząć się sylaba (Aus|tra|lia, cir|cum|stance)
  const ONSETS = ['tr', 'br', 'pr', 'cr', 'dr', 'gr', 'fr', 'pl', 'bl', 'cl', 'gl', 'fl', 'sl', 'st', 'sp', 'sc', 'sk', 'sm', 'sn', 'sw', 'tw', 'thr', 'str', 'spr'];

  // Koszt cięcia słowa przed znakiem i (0 = naturalna granica sylaby).
  function cutCost(s, i) {
    const low = s.toLowerCase();
    const a = low[i - 1], b = low[i], c = low[i + 1] || '';
    // nie tniemy w środku dwuznaku ani typowej cząstki (ti|on, men|t)
    if (DIGRAPHS.includes(a + b) && !(a + b === 'ng' && isVowel(c))) return 4; // Hun|ga|ry — ale nie sin|g
    if (UNITS.some((u) => u.length > 2 && [...Array(u.length - 1)].some((_, k) => low.slice(i - k - 1, i - k - 1 + u.length) === u))) return 4;
    if (!isVowel(b) && c && isVowel(c)) return 0; // pa|per, ho|tel
    if (!isVowel(a) || isVowel(b)) { /* dalej */ } else if (ONSETS.some((o) => low.startsWith(o, i) && isVowel(low[i + o.length] || ''))) return 0; // Aus|tra
    if (!isVowel(a) && !isVowel(b)) return 1; // win|dow, pa|ck
    if (isVowel(a) && isVowel(b)) return 3;
    return 2;
  }

  // premia za kawałek, który jest znaną cząstką (końcówka na końcu słowa, przedrostek na początku)
  function chunkBonus(ch, i, count) {
    const low = ch.toLowerCase();
    if (i === 0 && PREFIXES.includes(low) && count > 2) return -1.5;
    if (UNITS.includes(low)) return (low.length > 2 ? -2 : -0.8) - (i === count - 1 ? 1 : 0);
    return 0;
  }

  // Słowo (same litery) → 2–4 kawałki po min. 2 znaki, możliwie równe i na naturalnych granicach.
  function syllables(word) {
    const s = String(word);
    const n = s.length;
    if (n < 4) return [s];
    const kMin = n >= 9 ? 3 : 2, kMax = Math.min(4, Math.floor(n / 2));
    let best = null;
    for (let k = kMin; k <= kMax; k++) {
      const ideal = n / k;
      const walk = (start, cuts) => {
        if (cuts.length === k - 1) {
          const bounds = [0, ...cuts, n];
          const lens = bounds.slice(1).map((b, i) => b - bounds[i]);
          if (lens.some((l) => l < 2 || l > 6)) return;
          const chunks = bounds.slice(1).map((b, i) => s.slice(bounds[i], b));
          // kawałek bez samogłoski (np. „Sw”) źle się czyta — dozwolony tylko na końcu (pa|ck)
          const noVowel = chunks.filter((ch, i) => ![...ch].some(isVowel) && i < chunks.length - 1).length
            + (![...chunks[chunks.length - 1]].some(isVowel) ? 0.4 : 0); // na końcu (pa|ck) tylko, gdy nie ma lepszego podziału
          const cost = cuts.reduce((sum, i) => sum + cutCost(s, i), 0)
            + lens.reduce((sum, l) => sum + (l - ideal) ** 2, 0) * 0.35
            + chunks.reduce((sum, ch, i) => sum + chunkBonus(ch, i, chunks.length), 0)
            + noVowel * 5 + k * 0.4; // mniej kawałków, jeśli to nic nie psuje
          if (!best || cost < best.cost) best = { cost, cuts: cuts.slice() };
          return;
        }
        for (let i = start; i < n; i++) walk(i + 1, [...cuts, i]);
      };
      walk(2, []);
    }
    if (!best) return [s];
    const bounds = [0, ...best.cuts, n];
    return bounds.slice(1).map((b, i) => s.slice(bounds[i], b));
  }

  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Zadanie: { kind: 'chars'|'words', answer, template, tiles: [{ id, text }] }
  //  - chars: answer = same litery (małe), template = znaki słowa (litery = pola, reszta stała, np. ' i -)
  //  - words: answer = wyrazy zwrotu (małe), tiles = wyrazy (+ pułapki z decoyWords)
  function make(en, mode, { rand = Math.random, decoyWords = [] } = {}) {
    const t = target(en);
    if (/\s/.test(t)) {
      const words = t.split(' ');
      const answer = words.map((w) => w.toLowerCase());
      const extra = mode === 'letters+'
        ? shuffle(decoyWords.map((w) => w.toLowerCase()).filter((w) => w && !answer.includes(w)), rand).slice(0, 1)
        : [];
      const tiles = shuffle([...words, ...extra], rand).map((text, id) => ({ id, text }));
      return { kind: 'words', answer, template: words, tiles };
    }
    const letters = [...t].filter(isLetter).join('');
    const answer = letters.toLowerCase();
    const parts = mode === 'syll' && letters.length >= 4 ? syllables(letters) : [...letters];
    const tiles = parts.map((p) => p.toLowerCase());
    if (mode === 'letters+') {
      const pool = [...'abcdefghiklmnoprstuwy'].filter((c) => !answer.includes(c));
      tiles.push(...shuffle(pool, rand).slice(0, answer.length > 6 ? 3 : 2));
    }
    // mieszamy tak, żeby kafelki nie leżały w dobrej kolejności
    let mixed = shuffle(tiles, rand);
    for (let i = 0; i < 5 && tiles.length > 1 && mixed.join('') === answer; i++) mixed = shuffle(tiles, rand);
    return { kind: 'chars', answer, template: [...t], tiles: mixed.map((text, id) => ({ id, text })) };
  }

  // Ułożone kafelki (w kolejności) → czy to dobre słowo / zwrot
  function check(task, placed) {
    if (task.kind === 'words') return placed.map((p) => p.toLowerCase()).join(' ') === task.answer.join(' ');
    return placed.join('').toLowerCase() === task.answer;
  }

  // Ile „miejsc” już zapełniono (litery albo wyrazy) i ile jest razem
  const filled = (task, placed) => (task.kind === 'words' ? placed.length : placed.join('').length);
  const total = (task) => task.answer.length;

  const api = { target, syllables, make, check, filled, total, isLetter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Builder = api;
})(typeof window !== 'undefined' ? window : globalThis);
