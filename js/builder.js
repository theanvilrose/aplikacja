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

  // Koszt cięcia słowa przed znakiem i (0 = naturalna granica sylaby).
  function cutCost(s, i) {
    const a = s[i - 1], b = s[i], c = s[i + 1] || '';
    if (DIGRAPHS.includes((a + b).toLowerCase())) return 4;
    if (!isVowel(b) && c && isVowel(c)) return 0; // pa|per, ho|tel
    if (!isVowel(a) && !isVowel(b)) return 1; // win|dow, pa|ck
    if (isVowel(a) && isVowel(b)) return 3;
    return 2;
  }

  // Słowo (same litery) → 2–4 kawałki po min. 2 znaki, możliwie równe i na naturalnych granicach.
  function syllables(word) {
    const s = String(word);
    const n = s.length;
    if (n < 4) return [s];
    const k = Math.min(4, Math.max(2, Math.round(n / 3.3)));
    const ideal = n / k;
    let best = null;
    const walk = (start, cuts) => {
      if (cuts.length === k - 1) {
        const bounds = [0, ...cuts, n];
        const lens = bounds.slice(1).map((b, i) => b - bounds[i]);
        if (lens.some((l) => l < 2)) return;
        const chunks = bounds.slice(1).map((b, i) => s.slice(bounds[i], b));
        // kawałek bez samogłoski (np. „Sw”) źle się czyta — dozwolony tylko na końcu (pa|ck)
        const noVowel = chunks.filter((ch, i) => ![...ch].some(isVowel) && i < chunks.length - 1).length;
        const cost = cuts.reduce((sum, i) => sum + cutCost(s, i), 0) + lens.reduce((sum, l) => sum + (l - ideal) ** 2, 0) * 0.6 + noVowel * 5;
        if (!best || cost < best.cost) best = { cost, cuts: cuts.slice() };
        return;
      }
      for (let i = start; i < n; i++) walk(i + 1, [...cuts, i]);
    };
    walk(2, []);
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
