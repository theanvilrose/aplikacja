// Słowik — Sesja nauki: kolejka, dobór ćwiczeń wg postępu, odpowiedzi i ocena, tryb słuchania.
// Pliki js/app/*.js to jeden program podzielony na części (kolejność w index.html ma znaczenie).
'use strict';

// ---------- sesja nauki ----------

function examType(w) {
  const r = Math.random();
  let t = r < 0.4 ? 'en2pl' : r < 0.65 ? 'pl2en' : r < 0.8 ? 'listen2pl' : 'type';
  const opts = typeOpts();
  if (t === 'listen2pl' && !opts.speak) t = 'en2pl';
  if (t === 'type' && (w.en.length > 30 || !opts.typing)) t = 'pl2en';
  return t;
}

function examQueue(ex) {
  const from = ex.days ? dayKey(new Date(Date.now() - ex.days * DAY)) : '';
  const recent = shuffle(words.filter((w) => !from || (w.added && w.added >= from)));
  const rest = shuffle(words.filter((w) => !recent.includes(w)));
  return recent.concat(rest).slice(0, ex.n).map((w) => ({ id: w.id, force: examType(w) }));
}

function buildQueue({ ids = null, mode = 'learn', intro = false } = {}) {
  const now = Date.now();
  const only = ids && new Set(ids);
  const pool = words.filter((w) => (only ? only.has(w.id) : inPlan(w)));
  const seen = pool.filter((w) => db.cards[w.id]);
  const soonest = (n) => seen.slice().sort((a, b) => db.cards[a.id].due - db.cards[b.id].due).slice(0, n);

  if (mode === 'listen') {
    return shuffle(soonest(15)).map((w) => ({
      id: w.id,
      force: db.cards[w.id].level >= 3 && Math.random() < 0.5 ? 'dictation' : 'listen2pl',
    }));
  }
  if (mode === 'extra') return shuffle(soonest(15)).map((w) => ({ id: w.id }));
  // ćwiczenie konkretnych słów (np. błędów z testu): nieznane najpierw pokazujemy jako nowe
  if (mode === 'drill') return shuffle(pool).map((w) => (db.cards[w.id] && !intro ? { id: w.id } : { id: w.id, intro: true }));

  const s = db.settings;
  const c = counts();
  const due = seen.filter((w) => db.cards[w.id].due <= now)
    .sort((a, b) => SRS.overdue(db.cards[b.id], now) - SRS.overdue(db.cards[a.id], now))
    .slice(0, only ? undefined : c.dueLeft);

  // kolejność nowych słów z ustawień planu
  let fresh = pool.filter((w) => !db.cards[w.id]);
  if (s.newOrder === 'recent') fresh = fresh.map((w, i) => [w, i]).sort((a, b) => (b[0].added || '').localeCompare(a[0].added || '') || a[1] - b[1]).map(([w]) => w);
  else if (s.newOrder === 'random') fresh = shuffle(fresh);
  fresh = fresh.slice(0, only ? 8 : c.newLeft);

  const queue = [];
  if (s.reviewsFirst) {
    due.forEach((w) => queue.push({ id: w.id }));
    fresh.forEach((w) => queue.push({ id: w.id, intro: true }));
  } else {
    let i = 0, j = 0;
    while (i < due.length || j < fresh.length) {
      for (let k = 0; k < 2 && i < due.length; k++) queue.push({ id: due[i++].id });
      if (j < fresh.length) queue.push({ id: fresh[j++].id, intro: true });
    }
  }
  if (!queue.length) return buildQueue({ ids, mode: 'extra' });

  // rozgrzewka: 2 słowa, które już znasz, na dobry początek
  if (s.warmup) {
    const warm = shuffle(seen.filter((w) => isKnown(db.cards[w.id]) && db.cards[w.id].due > now)).slice(0, 2);
    queue.unshift(...warm.map((w) => ({ id: w.id, warm: true })));
  }
  return queue;
}

function startSession(opts = {}) {
  stopPlayer();
  const exam = opts.exam ? examDef(opts.exam) : null;
  const queue = exam ? examQueue(exam) : buildQueue(opts);
  if (!queue.length) return toast('Najpierw poznaj kilka słówek');
  const mins = db.settings.minutes;
  S = {
    queue, pos: 0, start: Date.now(), budget: !exam && mins ? mins * 60000 : 0,
    mode: exam ? 'exam' : opts.mode || 'learn', exam, recorded: false,
    answers: [], wrong: new Set(), newIds: new Set(), extraSteps: {}, cur: null, timer: null,
    gems: 0, streakUp: 0, chestOpened: false, badge: null, pathAdvanced: false,
    coll: opts.coll || null, // pakiet / temat, z którego ruszyła lekcja (powrót po podsumowaniu)
  };
  view = 'session';
  window.scrollTo(0, 0);
  nextStep();
}

function timeUp() { return S.budget && Date.now() - S.start >= S.budget; }

function nextStep() {
  clearTimeout(S.timer);
  if (timeUp()) {
    // po czasie kończymy tylko rozpoczęte słowa (nowe i pomyłki)
    S.queue = S.queue.slice(0, S.pos).concat(S.queue.slice(S.pos).filter((q) => q.follow));
  }
  if (S.pos >= S.queue.length) return finish();
  const item = S.queue[S.pos];
  const w = byId.get(item.id);
  if (!w) { S.pos++; return nextStep(); }
  const opts = typeOpts();
  let type = item.intro ? 'intro' : item.force || SRS.pickType(card(w.id), w, opts);
  if ((SRS.isListening(type) && !opts.speak) || (SRS.isTyping(type) && !opts.typing)) type = SRS.pickType(card(w.id), w, opts);
  // „Czy to prawidłowe tłumaczenie?” — co trzecie łatwe pytanie wyboru (poziomy en→pl i pl→en)
  if (type !== 'intro') type = exerciseType(type, w, !!item.force);
  // przygotowanie ćwiczeń z obrazkami / parami / układaniem; gdy się nie da — zwykły wybór z 4
  const pics = type === 'pic4' ? takePicOptions(w) : null;
  const pairs = type === 'pairs' ? makePairs(w) : null;
  if ((type === 'pic4' && !pics) || (type === 'pairs' && !pairs)) type = 'en2pl';
  S.cur = { item, w, type, shownAt: Date.now(), answered: false, hints: 0, options: null, chosen: null, result: null, typed: '', earned: 0 };
  if (type.endsWith('2pl') || type === 'pl2en') S.cur.options = buildOptions(w, type === 'pl2en' ? 'en' : 'pl');
  if (type === 'pic4') S.cur.options = pics;
  if (type === 'pairs') S.cur.pairs = pairs;
  if (type === 'build') {
    const mode = buildMode(w);
    S.cur.build = { mode, task: Builder.make(w.en, mode, { decoyWords: buildDecoys(w) }), placed: [], backs: 0 };
  }
  if (type === 'truefalse') {
    // pół na pół: prawdziwe tłumaczenie albo podobne słowo z tego samego tematu (nie synonim!)
    const other = buildOptions(w, 'pl').find((o) => o.id !== w.id && !plOverlap(o.text, w.pl));
    const ok = !other || Math.random() < 0.5;
    S.cur.tf = { text: ok ? w.pl : other.text, ok };
  }
  render();
  const sayNow = type === 'intro' || type === 'en2pl' || type === 'truefalse' || type === 'pic4' || SRS.isListening(type) || (type === 'build' && S.cur.build.mode === 'syll');
  // odtwarzamy tylko, jeśli to słowo nadal jest na ekranie (szybkie „Dalej” / wyjście z sesji)
  const shown = S.cur;
  if (db.settings.autoplay && sayNow) setTimeout(() => { if (S && S.cur === shown) speak(w.en); }, 250);
  const input = $('#typed');
  if (input) input.focus();
}

// Rodzaje ćwiczeń (kolejność = mniej więcej od najłatwiejszych); w ustawieniach planu można je wyłączać.
const EX_TYPES = [
  ['en2pl', '🔤', 'Co to znaczy?', 'słowo → 4 odpowiedzi po polsku'],
  ['truefalse', '✅', 'Czy to dobre tłumaczenie?', 'tak albo nie'],
  ['pic4', '🖼️', 'Dopasuj kartę', 'słowo → 4 obrazki'],
  ['pairs', '🔗', 'Dopasuj pary', 'łączysz słowa z tłumaczeniami'],
  ['pl2en', '💬', 'Jak to powiesz po angielsku?', 'polskie słowo → 4 odpowiedzi'],
  ['listen2pl', '👂', 'Posłuchaj i wybierz', 'ze słuchu → 4 odpowiedzi'],
  ['build', '🧩', 'Utwórz słowo', 'z sylab, potem z liter — wg postępu'],
  ['type', '⌨️', 'Napisz po angielsku', 'wpisujesz z klawiatury'],
  ['dictation', '📝', 'Dyktando', 'napisz, co słyszysz'],
];
const EX_ORDER = EX_TYPES.map((t) => t[0]);

function exAllowed(t, w) {
  if ((db.settings.exOff || []).includes(t)) return false;
  const o = typeOpts();
  if (SRS.isListening(t) && !o.speak) return false;
  if (SRS.isTyping(t) && (!o.typing || w.en.length > 30)) return false;
  if (t === 'pic4') { picCache = { id: w.id, opts: picOptions(w) }; return !!picCache.opts; }
  if (t === 'build') { const tg = Builder.target(w.en); return tg.replace(/[^a-z]/gi, '').length >= 2 && tg.length <= 40 && tg.split(' ').length <= 7; }
  if (t === 'pairs') return words.filter((x) => x.id !== w.id && db.cards[x.id]).length >= 2;
  return true;
}

// Typ z drabiny SRS → czasem odmiana (tak/nie, obrazki); wyłączony typ → najbliższy włączony.
function exerciseType(type, w, forced) {
  // egzamin i trening słuchu mają stały zestaw — bez odmian i bez listy wyłączonych
  if (S.mode === 'exam' || S.mode === 'listen') return type;
  if (!forced) {
    const lvl = card(w.id).level, r = Math.random();
    // nowe ćwiczenia ≈ co 3.–4. pytanie: pary przy powtórkach, układanie zamiast pisania / na start
    if (lvl >= 2 && r < 0.12 && exAllowed('pairs', w)) type = 'pairs';
    else if ((type === 'pl2en' || type === 'type' || type === 'dictation') && r < 0.42 && exAllowed('build', w)) type = 'build';
    else if (lvl <= 2 && type === 'en2pl' && r < 0.3 && exAllowed('build', w)) type = 'build';
    else if ((type === 'en2pl' || type === 'pl2en') && Math.random() < 0.33 && exAllowed('truefalse', w)) type = 'truefalse';
    else if (type === 'en2pl' && Math.random() < 0.3 && exAllowed('pic4', w)) type = 'pic4'; // słuchu nie zastępujemy obrazkami
  }
  if (exAllowed(type, w)) return type;
  const i = Math.max(0, EX_ORDER.indexOf(type));
  const alt = EX_ORDER.filter((t) => exAllowed(t, w)).sort((a, b) => Math.abs(EX_ORDER.indexOf(a) - i) - Math.abs(EX_ORDER.indexOf(b) - i))[0];
  return alt || 'en2pl';
}

// „Utwórz słowo”: trudność wg postępu — sylaby przy obrazku na start, potem litery, na końcu litery z pułapkami
function buildMode(w) {
  const lvl = card(w.id).level;
  const letters = Builder.target(w.en).replace(/[^a-z]/gi, '').length;
  if (lvl <= 2 || letters > 14) return 'syll';
  return lvl === 3 ? 'letters' : 'letters+';
}
// wyrazy-pułapki dla zwrotów: z innych zwrotów tego samego tematu
function buildDecoys(w) {
  return shuffle(words.filter((x) => x.id !== w.id && x.topic === w.topic)).flatMap((x) => Builder.target(x.en).split(' ')).slice(0, 12);
}

function buildTap(id) {
  const cur = S.cur, B = cur.build;
  if (!B || cur.answered || B.placed.includes(id)) return;
  B.placed.push(id);
  const texts = B.placed.map((i) => B.task.tiles.find((t) => t.id === i).text);
  if (Builder.filled(B.task, texts) >= Builder.total(B.task)) {
    cur.typed = texts.join(B.task.kind === 'words' ? ' ' : '');
    answer(Builder.check(B.task, texts), B.backs > 0, cur.typed);
  } else render();
}
function buildBack() {
  const cur = S.cur, B = cur.build;
  if (!B || cur.answered || !B.placed.length) return;
  B.placed.pop();
  B.backs++;
  render();
}
// klawiatura: litera wybiera pierwszy wolny kafelek, który się nią zaczyna
function buildKey(key) {
  const B = S.cur.build;
  const t = B && B.task.tiles.find((x) => !B.placed.includes(x.id) && x.text[0].toLowerCase() === key.toLowerCase());
  if (t) buildTap(t.id);
}

// Polskie tłumaczenia z częścią wspólną (synonimy) — nie mogą udawać „złej” odpowiedzi
function plOverlap(a, b) {
  const parts = (x) => String(x).toLowerCase().replace(/\([^)]*\)/g, '').split(/[\/,;]/).map((p) => p.trim()).filter(Boolean);
  const pb = new Set(parts(b));
  return parts(a).some((p) => pb.has(p));
}

// „Dopasuj pary”: bieżące słowo + 2 (świeże słowo) albo 3 (dalszy etap) inne, już poznane słowa
function makePairs(w) {
  const n = card(w.id).level >= 3 ? 3 : 2;
  const usedEn = new Set([Answer.norm(w.en)]), out = [w];
  const take = (pool) => {
    for (const x of shuffle(pool)) {
      if (out.length > n) break;
      const e = Answer.norm(x.en);
      if (!db.cards[x.id] || usedEn.has(e) || out.some((o) => plOverlap(o.pl, x.pl))) continue;
      usedEn.add(e);
      out.push(x);
    }
  };
  take(words.filter((x) => x.id !== w.id && x.topic === w.topic));
  if (out.length <= n) take(words.filter((x) => x.id !== w.id));
  if (out.length < 3) return null;
  // shuffle() miesza w miejscu — każda kolumna dostaje własną kopię
  const ids = out.map((x) => x.id), en = shuffle([...ids]);
  // polska kolumna zawsze w innej kolejności niż angielska (inaczej pary łączą się „w poziomie”)
  let pl = shuffle([...ids]);
  for (let i = 0; i < 20 && pl.some((id, j) => id === en[j]); i++) pl = shuffle([...ids]);
  return { ids, en, pl, sel: null, done: [], miss: 0, missTarget: false, bad: null };
}
function pairPick(side, id) {
  const cur = S.cur, P = cur.pairs;
  if (!P || cur.answered || P.done.includes(id)) return;
  P.bad = null;
  if (!P.sel || P.sel.side === side) {
    P.sel = P.sel && P.sel.side === side && P.sel.id === id ? null : { side, id };
    return render();
  }
  if (P.sel.id === id) {
    P.done.push(id);
    P.sel = null;
    speak(byId.get(id).en);
  } else {
    P.miss++;
    if (id === cur.w.id || P.sel.id === cur.w.id) P.missTarget = true;
    P.bad = { [side]: id, [P.sel.side]: P.sel.id };
    P.sel = null;
    setTimeout(() => { if (S && S.cur === cur && P.bad) { P.bad = null; render(); } }, 600);
  }
  if (P.done.length === P.ids.length) answer(!P.missTarget, P.miss > 0, P.missTarget ? 'pomyłka w parze' : '');
  else render();
}

// obrazki wylosowane przy sprawdzaniu, czy ćwiczenie jest możliwe — używamy tych samych
let picCache = null;
const takePicOptions = (w) => (picCache && picCache.id === w.id && picCache.opts) || picOptions(w);

// „Dopasuj kartę”: słowo + 4 obrazki — tylko gdy słowo i 3 inne mają różne ikony
function picOptions(w) {
  const img = WORD_IMG[w.id];
  if (!img || isPhrase(w)) return null;
  const used = new Set([img]), out = [];
  // bez par kraj–narodowość (Austria / Austrian), które mają prawie ten sam obrazek
  const stem = (x) => x.en.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
  const stems = new Set([stem(w)]);
  const take = (pool) => {
    for (const x of shuffle(pool)) {
      if (out.length >= 3) break;
      const im = WORD_IMG[x.id];
      if (im && !used.has(im) && !isPhrase(x) && !stems.has(stem(x))) { used.add(im); stems.add(stem(x)); out.push(x); }
    }
  };
  take(words.filter((x) => x.id !== w.id && x.topic === w.topic));
  if (out.length < 3) take(words.filter((x) => x.id !== w.id));
  if (out.length < 3) return null;
  return shuffle([w, ...out]).map((x) => ({ id: x.id, text: x.pl }));
}

function buildOptions(w, field) {
  const used = new Set([w[field].toLowerCase()]);
  const pick = (pool) => {
    const out = [];
    for (const x of shuffle(pool)) {
      const v = x[field].toLowerCase();
      if (!used.has(v)) { used.add(v); out.push(x); }
      if (out.length >= 3) break;
    }
    return out;
  };
  let opts = pick(words.filter((x) => x.id !== w.id && x.topic === w.topic && x.pos === w.pos));
  if (opts.length < 3) opts = opts.concat(pick(words.filter((x) => x.id !== w.id && x.topic === w.topic)).slice(0, 3 - opts.length));
  if (opts.length < 3) opts = opts.concat(pick(words.filter((x) => x.id !== w.id)).slice(0, 3 - opts.length));
  return shuffle([w, ...opts]).map((x) => ({ id: x.id, text: x[field] }));
}

function trackTime() {
  today().ms += Math.min(Date.now() - S.cur.shownAt, 60000);
}

function introDone() {
  const { w } = S.cur;
  const wasCounted = counted(dayKey());
  trackTime();
  if (!db.cards[w.id]) {
    db.cards[w.id] = { ...SRS.fresh(), level: 1, due: Date.now(), last: Date.now() };
    today().nw++;
    S.newIds.add(w.id);
  }
  addGems(dailyRewards(wasCounted));
  save();
  insertLater({ id: w.id, follow: true, force: 'en2pl' }, 2);
  S.pos++;
  nextStep();
}

// „Później”: pomijamy nowe słowo w tej sesji — zostaje nowe i wróci w kolejnej.
// „Wiem”: od razu wyuczone (jak na ekranie wyboru słówek), jutro wraca na szybkie sprawdzenie.
function introSkip(known) {
  const { w } = S.cur;
  // stan sprzed decyzji — do „Cofnij”
  const ref = S, before = { queue: S.queue.slice(), pos: S.pos, cur: S.cur, card: db.cards[w.id] ? { ...db.cards[w.id] } : null };
  trackTime();
  if (known) markKnown(w.id);
  S.queue = S.queue.filter((it, i) => i <= S.pos || it.id !== w.id);
  S.pos++;
  nextStep();
  toast(known ? `✓ „${w.en}” — oznaczone jako znane` : `„${w.en}” — wróci w kolejnej sesji`, {
    undo: () => {
      if (known) { if (before.card) db.cards[w.id] = before.card; else delete db.cards[w.id]; save(); }
      // wracamy do tego słowa, jeśli sesja jeszcze trwa
      if (S === ref && view === 'session' && S.pos === before.pos + 1 && !S.cur.answered) {
        clearTimeout(S.timer);
        Object.assign(S, { queue: before.queue, pos: before.pos, cur: before.cur });
        render();
      } else if (known) toast(`„${w.en}” znowu jest nowe`);
    },
  });
}

function insertLater(item, gap) {
  S.queue.splice(Math.min(S.pos + 1 + gap, S.queue.length), 0, item);
}

function answer(correct, struggled = false, given = '') {
  const cur = S.cur;
  if (cur.answered) return;
  cur.answered = true;
  const { w, type } = cur;
  const exam = S.mode === 'exam';
  const now = Date.now();
  // czas na przeczytanie odpowiedzi do wyboru nie liczy się jako namysł
  const readMs = cur.options ? cur.options.reduce((a, o) => a + (o.text || '').length, 0) * 25 : 0;
  const ms = Math.max(300, now - cur.shownAt - (SRS.isListening(type) ? 1200 : 0) - readMs);
  // układanie i pary oceniamy czasowo jak pisanie; tak/nie i obrazki to lżejsze sprawdzenie — bez oceny „błyskawicznie”
  const gType = type === 'build' || type === 'pairs' ? 'type' : type;
  let g = SRS.grade(correct, ms, gType, type === 'pairs' ? 12 : w.en.length, struggled || cur.hints > 0);
  if ((type === 'truefalse' || type === 'pic4') && g > 2) g = 2;
  const prev = db.cards[w.id];
  const d = today();
  if (prev && prev.due <= now && !S.newIds.has(w.id)) d.rv = (d.rv || 0) + 1; // zadanie „powtórki” w planie dnia
  // W teście nie zakładamy kart słowom, których jeszcze nie poznałeś w aplikacji.
  if (!exam || prev) db.cards[w.id] = SRS.review(card(w.id), g, now);
  if (correct) db.mistakes = db.mistakes.filter((id) => id !== w.id);

  const wasCounted = counted(dayKey());
  d.n++;
  if (correct) d.ok++;
  trackTime();
  cur.earned = correct ? (g === 3 ? 2 : 1) : 0;
  addGems(cur.earned + dailyRewards(wasCounted));
  S.answers.push({ id: w.id, correct, g, ms, type, given });
  if (!correct) S.wrong.add(w.id);

  if (!exam) {
    const steps = (S.extraSteps[w.id] = S.extraSteps[w.id] || 0);
    if (!correct) {
      if (steps < 3) { S.extraSteps[w.id]++; insertLater({ id: w.id, follow: true }, 3); }
    } else if (S.newIds.has(w.id) && steps < 3 && !cur.item.second) {
      S.extraSteps[w.id]++;
      insertLater({ id: w.id, follow: true, second: true, force: Math.random() < 0.5 && typeOpts().speak ? 'listen2pl' : 'pl2en' }, 4);
    }
  }
  save();
  render();

  if (exam) { S.timer = setTimeout(advance, 450); return; }
  if (db.settings.autoplay && (type === 'pl2en' || type === 'build' || SRS.isTyping(type) || !correct)) speak(w.en);
  if (correct && !struggled && db.settings.autoNext) S.timer = setTimeout(advance, 1300);
}

function advance() {
  if (!S || !S.cur.answered) return;
  clearTimeout(S.timer);
  S.pos++;
  nextStep();
}

function choose(i) {
  const cur = S.cur;
  if (cur.answered || !cur.options[i]) return;
  cur.chosen = i;
  answer(cur.options[i].id === cur.w.id, false, cur.options[i].text);
}

// ✓ / ✗ w „Czy to prawidłowe tłumaczenie?”
function chooseTf(yes) {
  const cur = S.cur;
  if (cur.answered || cur.type !== 'truefalse') return;
  cur.chosen = yes;
  answer(yes === cur.tf.ok, false, `${cur.tf.text} → ${yes ? 'tak' : 'nie'}`);
}

function submitTyped() {
  const cur = S.cur;
  if (cur.answered) return;
  const input = $('#typed');
  cur.typed = input ? input.value : '';
  if (!cur.typed.trim()) { input && input.focus(); return; }
  cur.result = Answer.check(cur.typed, cur.w.en);
  answer(cur.result !== 'wrong', cur.result === 'typo', cur.typed);
}

function hint() {
  const cur = S.cur;
  const input = $('#typed');
  if (!input || cur.answered) return;
  const target = cur.w.en.split(/\s+\/\s+/)[0];
  cur.hints = Math.min(target.length, cur.hints + 1);
  input.value = target.slice(0, cur.hints);
  input.focus();
}

function examScore() {
  const ok = S.answers.filter((a) => a.correct).length;
  return { ok, total: S.answers.length, pct: S.answers.length ? Math.round((ok / S.answers.length) * 100) : 0 };
}

function finish() {
  clearTimeout(S.timer);
  if (S.mode === 'exam' && !S.recorded) {
    S.recorded = true;
    const { pct: score, total } = examScore();
    const wrong = S.answers.filter((a) => !a.correct).map((a) => a.id);
    db.exams.push({ kind: S.exam.key, date: Date.now(), pct: score, n: total, wrong });
    db.exams = db.exams.slice(-50);
    db.mistakes = [...new Set([...db.mistakes, ...wrong])];
    if (score >= EXAM_PASS) {
      addGems(EXAM_BONUS);
      if (S.exam.key === pathKind(db.path.length)) {
        db.path.push({ kind: S.exam.key, pct: score, date: Date.now() });
        S.pathAdvanced = true;
      }
    }
    save();
  }
  view = 'summary';
  render();
  window.scrollTo(0, 0);
}

async function quitSession() {
  if (!S) return;
  if (S.mode === 'exam') {
    if (S.pos === 0 || (await ask({ title: 'Przerwać test?', text: 'Wynik nie zostanie zapisany.', ok: 'Przerwij', cancel: 'Wracam do testu', danger: true }))) { S = null; go('home'); }
    return;
  }
  if (S.answers.length && !(await ask({ title: 'Zakończyć sesję?', text: 'Postęp jest już zapisany.', ok: 'Zakończ', cancel: 'Uczę się dalej' }))) return;
  if (S) finish();
}

// ---------- tryb słuchania (odtwarzacz) ----------

function startPlayer(source = listenSource) {
  let list = Array.isArray(source) ? source.map((id) => byId.get(id)).filter(Boolean)
    : source === '__all' ? words
    : source === '__seen' ? words.filter((w) => db.cards[w.id])
    : words.filter((w) => w.topic === source);
  if (!list.length && source === '__seen') list = words;
  if (!list.length) return toast('Brak słówek do odtworzenia');
  P = { ids: shuffle(list.map((w) => w.id)), i: 0, playing: true, phase: 0, token: 0, done: false, from: view };
  view = 'player';
  playLoop();
}

async function playLoop() {
  if (!P) return;
  const token = ++P.token;
  const alive = () => P && P.playing && P.token === token;
  while (alive() && P.i < P.ids.length) {
    const w = byId.get(P.ids[P.i]);
    P.phase = 0;
    render();
    const steps = [
      () => say(w.en), () => wait(700), () => say(w.en, 'en', 0.7), () => wait(600),
      () => { P.phase = 1; render(); return say(w.pl, 'pl'); }, () => wait(700),
      () => say(w.example), () => wait(1600),
    ];
    for (const step of steps) { if (!alive()) return; await step(); }
    if (!alive()) return;
    P.i++;
  }
  if (P && P.token === token) { P.playing = false; P.done = true; render(); }
}

function playerControl(act) {
  if (!P) return;
  stopSpeech();
  P.token++;
  if (act === 'toggle') {
    if (P.done) { P.i = 0; P.done = false; }
    P.playing = !P.playing;
  } else if (act === 'next') P.i = Math.min(P.ids.length - 1, P.i + 1);
  else if (act === 'prev') P.i = Math.max(0, P.i - 1);
  P.done = false;
  P.phase = 0;
  if (P.playing) playLoop(); else render();
}

function stopPlayer() {
  if (!P) return;
  P.token++;
  P = null;
  stopSpeech();
}
