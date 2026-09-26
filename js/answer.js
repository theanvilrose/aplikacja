// Sprawdzanie wpisanych odpowiedzi: tolerancja na wielkość liter, interpunkcję,
// skróty (I'm = I am) i drobne literówki.
(function (root) {
  'use strict';

  const CONTRACTIONS = {
    "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
    "he's": 'he is', "she's": 'she is', "it's": 'it is', "what's": 'what is',
    "where's": 'where is', "who's": 'who is', "how's": 'how is', "that's": 'that is',
    "there's": 'there is', "isn't": 'is not', "aren't": 'are not', "don't": 'do not',
    "doesn't": 'does not', "can't": 'cannot', "i'll": 'i will', "let's": 'let us',
  };

  function norm(s) {
    let t = String(s)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[‘’`´]/g, "'")
      .replace(/[^a-z0-9' ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    t = t.split(' ').map((w) => CONTRACTIONS[w] || w).join(' ');
    return t.replace(/'/g, '').replace(/^the /, '');
  }

  function variants(en) {
    const parts = en.split(/\s+\/\s+/);
    return [en, ...(parts.length > 1 ? parts : [])].map(norm);
  }

  function lev(a, b) {
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  // Zwraca 'ok' | 'typo' | 'wrong'
  function check(input, en) {
    const got = norm(input);
    if (!got) return 'wrong';
    const targets = variants(en);
    if (targets.includes(got)) return 'ok';
    for (const t of targets) {
      const allowed = t.length >= 5 ? Math.max(1, Math.floor(t.length / 8)) : 0;
      if (lev(got, t) <= allowed) return 'typo';
    }
    return 'wrong';
  }

  const api = { check, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Answer = api;
})(typeof window !== 'undefined' ? window : globalThis);
