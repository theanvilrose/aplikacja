// Synchronizacja postępu między urządzeniami: łączenie dwóch zapisów (ten sam kod w przeglądarce i na serwerze).
// Zasady:
//  - cards: każde słowo osobno — wygrywa nowsza nauka (pole last), przy remisie więcej powtórzeń,
//  - days: każdy dzień osobno — liczniki (powtórki, nowe, minuty…) biorą większą wartość,
//  - best: większa seria, exams: suma wyników z obu urządzeń (bez duplikatów),
//  - reszta (diamenty, ustawienia, listy, odznaki…): wygrywa wersja zmieniona później (db.stamp[pole]).
(function (root) {
  'use strict';

  const newer = (a, b) => ((a && a.last) || 0) > ((b && b.last) || 0) || (((a && a.last) || 0) === ((b && b.last) || 0) && ((a && a.reps) || 0) > ((b && b.reps) || 0));

  function mergeCards(a = {}, b = {}) {
    const out = { ...b };
    for (const [id, c] of Object.entries(a)) if (!out[id] || newer(c, out[id])) out[id] = c;
    return out;
  }

  function mergeDay(x = {}, y = {}) {
    const out = { ...y };
    for (const [k, v] of Object.entries(x)) {
      if (typeof v === 'number' && typeof out[k] === 'number') out[k] = Math.max(v, out[k]);
      else if (typeof v === 'boolean' && typeof out[k] === 'boolean') out[k] = v || out[k];
      else if (out[k] === undefined) out[k] = v;
    }
    return out;
  }

  function mergeDays(a = {}, b = {}) {
    const out = { ...b };
    for (const [d, v] of Object.entries(a)) out[d] = out[d] ? mergeDay(v, out[d]) : v;
    return out;
  }

  function mergeExams(a = [], b = []) {
    const key = (e) => `${e.date}|${e.kind || ''}|${e.pct}`;
    const seen = new Set(), out = [];
    for (const e of [...b, ...a]) if (!seen.has(key(e))) { seen.add(key(e)); out.push(e); }
    return out.sort((x, y) => (x.date > y.date ? 1 : x.date < y.date ? -1 : 0));
  }

  const SPECIAL = new Set(['cards', 'days', 'best', 'exams', 'stamp']);

  // a = ten zapis, b = drugi zapis; wynik = połączony zapis (nowy obiekt)
  function merge(a, b) {
    if (!b) return a;
    if (!a) return b;
    const sa = a.stamp || {}, sb = b.stamp || {};
    const out = { ...b, ...a };
    const stamp = { ...sb };
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (SPECIAL.has(k)) continue;
      const ta = sa[k] || 0, tb = sb[k] || 0;
      if (!(k in a)) out[k] = b[k];
      else if (!(k in b)) out[k] = a[k];
      else out[k] = tb > ta ? b[k] : a[k];
      stamp[k] = Math.max(ta, tb);
    }
    out.cards = mergeCards(a.cards, b.cards);
    out.days = mergeDays(a.days, b.days);
    out.best = Math.max(a.best || 0, b.best || 0);
    out.exams = mergeExams(a.exams, b.exams);
    for (const k of ['cards', 'days', 'best', 'exams']) stamp[k] = Math.max(sa[k] || 0, sb[k] || 0);
    out.stamp = stamp;
    return out;
  }

  // Czy dwa zapisy różnią się czymś, co warto wysłać / wczytać (bez znaczników czasu).
  function same(a, b) {
    const strip = (d) => JSON.stringify({ ...d, stamp: undefined });
    return strip(a) === strip(b);
  }

  const api = { merge, same, mergeCards, mergeDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sync = api;
})(typeof window !== 'undefined' ? window : globalThis);
