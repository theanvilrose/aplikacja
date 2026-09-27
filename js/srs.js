// Adaptacyjny algorytm powtórek: bierze pod uwagę poprawność, czas reakcji
// i to, jak trudne jest dane słowo dla Ciebie (difficulty).
(function (root) {
  'use strict';

  const DAY = 86400000;
  const MIN = 60000;

  // Drabina ćwiczeń: im lepiej znasz słowo, tym trudniejsze zadanie.
  const LADDER = ['intro', 'en2pl', 'listen2pl', 'pl2en', 'type', 'dictation'];
  const MAX_LEVEL = LADDER.length - 1;

  function fresh() {
    return { level: 0, s: 0, d: 5, due: 0, reps: 0, lapses: 0, last: 0 };
  }

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const isTyping = (type) => type === 'type' || type === 'dictation';
  const isListening = (type) => type === 'listen2pl' || type === 'dictation';

  // 0 = źle, 1 = z trudem (wolno / literówka / podpowiedź), 2 = dobrze, 3 = błyskawicznie
  function grade(correct, ms, type, len, struggled) {
    if (!correct) return 0;
    if (struggled) return 1;
    const fast = isTyping(type) ? 3000 + len * 180 : 2200;
    const slow = isTyping(type) ? 9000 + len * 400 : 6500;
    if (ms <= fast) return 3;
    if (ms >= slow) return 1;
    return 2;
  }

  function dueAt(now, s) {
    const t = now + s * DAY * (0.95 + Math.random() * 0.1);
    if (s < 0.9) return t;
    const d = new Date(t);
    d.setHours(3, 0, 0, 0); // karta dostępna od rana danego dnia
    return d.getTime();
  }

  function review(prev, g, now) {
    const c = { ...prev, reps: prev.reps + 1, last: now };

    if (g === 0) {
      c.lapses = prev.lapses + 1;
      c.d = clamp(prev.d + 1.5, 1, 10);
      c.s = clamp(prev.s * 0.3, 0.01, 1.9); // < 2 — po pomyłce słowo przestaje być „wyuczone”
      c.level = Math.max(1, prev.level - 1);
      c.due = now + 10 * MIN;
      return c;
    }

    c.d = clamp(prev.d + { 1: 0.6, 2: 0, 3: -0.6 }[g], 1, 10);

    if (prev.s < 1) {
      // faza nauki: pierwsze poprawne odpowiedzi
      c.s = { 1: 0.6, 2: 1, 3: 2 }[g];
      if (g >= 2) c.level = Math.min(MAX_LEVEL, prev.level + 1);
    } else {
      // powtórka zrobiona przed terminem daje mniejszy przyrost
      const elapsed = (now - prev.last) / DAY;
      const ratio = clamp(elapsed / prev.s, 0, 1);
      const base = 1 + (11 - c.d) * 0.28;
      const growth = 1 + (base - 1) * { 1: 0.5, 2: 1, 3: 1.35 }[g];
      c.s = Math.min(365, prev.s * (1 + (growth - 1) * ratio));
      if (g >= 2 && ratio >= 0.5) c.level = Math.min(MAX_LEVEL, prev.level + 1);
    }
    c.due = dueAt(now, c.s);
    return c;
  }

  // Wybór ćwiczenia na podstawie poziomu, z odrobiną różnorodności.
  // opts.speak = false wyłącza ćwiczenia ze słuchu, opts.typing = false — z pisania.
  function pickType(card, word, opts = {}) {
    const speak = opts.speak !== false;
    const typing = opts.typing !== false;
    let lvl = Math.max(1, card.level);
    if (lvl >= 2 && Math.random() < 0.25) lvl -= 1;
    let type = LADDER[lvl];
    if (isTyping(type) && (word.en.length > 30 || !typing)) type = type === 'dictation' && speak ? 'listen2pl' : 'pl2en';
    if (!speak && isListening(type)) type = type === 'dictation' ? (typing ? 'type' : 'pl2en') : 'en2pl';
    return type;
  }

  // Jak bardzo karta jest „przeterminowana" (do sortowania powtórek).
  function overdue(card, now) {
    return (now - card.due) / (Math.max(card.s, 0.05) * DAY);
  }

  const api = { DAY, LADDER, MAX_LEVEL, fresh, grade, review, pickType, overdue, isTyping, isListening };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SRS = api;
})(typeof window !== 'undefined' ? window : globalThis);
