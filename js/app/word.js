// Słowik — Słówko: szczegóły, wybór słów do nauki, wznawianie, zadania z lekcji i ich ustawienia.
// Pliki js/app/*.js to jeden program podzielony na części (kolejność w index.html ma znaczenie).
'use strict';

// ---------- słówko: szczegóły, wybór słów do nauki („Nauka”) i wznawianie ----------

const HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/></svg>';
const POS_NAMES = { 'rz.': 'rzeczownik', 'przym.': 'przymiotnik', 'cz.': 'czasownik', zwrot: 'zwrot', 'zaim.': 'zaimek', 'zaim. + być': 'zaimek + być', 'przyim.': 'przyimek', 'przysł.': 'przysłówek', 'spój.': 'spójnik', 'liczeb.': 'liczebnik' };
// plakietka części mowy na liście słówek: [ikona, skrót, kolor tła, kolor tekstu]
const POS_BADGE = {
  'rz.': ['📦', 'rzecz.', '#E4EEFF', '#2B5BD7'], 'przym.': ['🎨', 'przym.', '#FFEBD9', '#B45309'], 'cz.': ['⚡', 'czas.', '#DDF7E6', '#15803D'],
  'zaim.': ['👤', 'zaim.', '#EFE7FF', '#6D28D9'], 'zaim. + być': ['👤', 'zaim.+być', '#EFE7FF', '#6D28D9'], 'przyim.': ['📍', 'przyim.', '#DDF6F6', '#0F766E'],
  'przysł.': ['⏱️', 'przysł.', '#FFE4EF', '#BE185D'], zwrot: ['💬', 'zwrot', '#F1F1F6', '#4B5170'],
  'spój.': ['🔗', 'spój.', '#E9F5DC', '#4D7C0F'], 'liczeb.': ['🔢', 'liczeb.', '#FFF4CC', '#A16207'],
};
function posBadge(w) {
  const b = POS_BADGE[w.pos];
  if (!b) return '';
  return `<span class="wr-pos" style="--pb:${b[2]};--pf:${b[3]}" title="${esc(POS_NAMES[w.pos] || w.pos)}"><i aria-hidden="true">${b[0]}</i><span>${b[1]}</span></span>`;
}
const FAV_ID = 'fav';      // lista „Ulubione” (serduszko na ekranie słówka)
const PICK_BATCH = 5;      // tyle nowych słów wybierasz, zanim ruszy nauka
let wordView = null;       // { id, back, scroll } — otwarte słówko
let PK = null;             // wybór słów do nauki: { ref, ids, i, picked, known, back }

function wordTint(w) {
  const topics = topicsList();
  const i = Math.max(0, topics.findIndex((t) => t.name === w.topic));
  return TINTS[i % TINTS.length];
}

// Duża grafika słówka (ekran słówka i wybór do nauki).
function wordArt(w) {
  if (isPhrase(w)) return '';
  const img = WORD_IMG[w.id];
  return img ? `<img class="wa-img" src="assets/words/${img}.png" alt="" draggable="false">` : `<span class="wa-emoji">${esc(w.icon || '💬')}</span>`;
}

// „Wiem”: słowo od razu liczy się jako wyuczone (s = 2 dni), ale już jutro wraca na szybkie sprawdzenie.
// Dobra odpowiedź wydłuża przerwę jak zwykle; pomyłka cofa je do nauki (SRS.review).
function markKnown(id) {
  const now = Date.now();
  const c = db.cards[id] || SRS.fresh();
  const tomorrow = new Date(now + DAY);
  tomorrow.setHours(3, 0, 0, 0);
  db.cards[id] = { ...c, level: Math.max(c.level, SRS.MAX_LEVEL - 1), s: Math.max(c.s, 2), d: Math.min(c.d, 5), due: tomorrow.getTime(), reps: c.reps + 1, last: now };
  save();
}

// „Naucz się ponownie”: słowo wraca na początek drabiny ćwiczeń (historia pomyłek zostaje).
function relearn(id) {
  const now = Date.now();
  db.cards[id] = { ...(db.cards[id] || SRS.fresh()), level: 1, s: 0, due: now, last: now };
  save();
}

function toggleFav(id) {
  let l = db.lists.find((x) => x.id === FAV_ID);
  if (!l) { l = { id: FAV_ID, name: 'Ulubione', ids: [] }; db.lists.push(l); }
  const on = !l.ids.includes(id);
  if (on) l.ids.push(id); else l.ids = l.ids.filter((x) => x !== id);
  save();
  toast(on ? '❤️ Dodano do listy „Ulubione”' : 'Usunięto z ulubionych');
}

function showWord(id) {
  wordView = { id, back: view, scroll: window.scrollY };
  go('word');
}

function closeWord() {
  const back = wordView?.back || 'words', y = wordView?.scroll || 0;
  wordView = null;
  view = back;
  render();
  window.scrollTo(0, y);
}

function viewWord() {
  const w = byId.get(wordView?.id);
  if (!w) { view = 'words'; return viewWords(); }
  const c = db.cards[w.id];
  const st = wordStatus(w);
  const lvl = c ? Math.max(1, c.level) : 0;
  const fav = !!db.lists.find((l) => l.id === FAV_ID)?.ids.includes(w.id);
  return `
  <section class="wd-hero" style="--tint:${wordTint(w)}">
    <div class="wd-bar">
      <button class="pk-back" data-act="word-back" aria-label="Wróć">${ICON.back}</button>
      <button class="pk-back wd-fav ${fav ? 'on' : ''}" data-act="word-fav" aria-pressed="${fav}" aria-label="Ulubione" title="${fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}">${HEART}</button>
    </div>
    ${isPhrase(w) ? '' : `<div class="wd-art">${wordArt(w)}</div>`}
    <h1 class="wd-en">${esc(w.en)}<button class="wd-say" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button></h1>
    ${w.pron ? `<p class="wd-pron">${esc(w.pron)}</p>` : ''}
  </section>
  <section class="wd-body">
    <div class="wd-pl"><b>${esc(w.pl)}</b><span>${esc([POS_NAMES[w.pos] || w.pos, w.article && `${w.article} ${w.en}`].filter(Boolean).join(' · '))}</span>${w.level ? `<span class="wd-cefr" title="Poziom CEFR">${esc(w.level)}</span>` : ''}</div>
    <div class="wd-chip-row">${(w.topics || [w.topic]).map((t) => `<button class="wd-topic" data-coll="topic:${esc(t)}">${esc(t)}</button>`).join('')}</div>
    ${w.notes ? `<div class="wd-block"><h3>Uwagi</h3><p>${esc(w.notes)}</p></div>` : ''}
    ${w.example ? `<div class="wd-block"><h3>Przykład</h3><p class="wd-example"><button class="wr-say" data-say="${esc(w.example)}" aria-label="Posłuchaj zdania">${SPEAKER}</button><i>${esc(w.example)}</i></p></div>` : ''}
    ${w.mnemo ? `<div class="wd-block"><h3>Skojarzenie</h3><p>🧠 ${esc(w.mnemo)}</p></div>` : ''}
    <div class="wd-block">
      <h3>Twój postęp</h3>
      <div class="wd-track" role="list" aria-label="Etapy nauki">
        ${LEVEL_NAMES.map((n, i) => `<span role="listitem" class="wd-step ${i < lvl ? 'done' : i === lvl ? 'cur' : ''}" ${i === lvl ? 'aria-current="step"' : ''}><i></i><small>${n}</small></span>`).join('')}
      </div>
      <p class="wd-level"><b>${LEVEL_NAMES[lvl]}${isKnown(c) ? ' · wyuczone ✓' : ''}</b> — ${LEVEL_HINTS[lvl]}</p>
      ${c ? `<p class="wd-meta">powtórka ${dueLabel(c)} · powtórzeń ${c.reps} · pomyłek ${c.lapses}</p>` : ''}
    </div>
    <div class="wd-block"><h3>Moje listy</h3>${listTags(w)}</div>
  </section>
  <div class="wd-cta">
    ${st === 'known' ? `
      <div class="wd-state known">${ICON.check}<span>Wyuczone</span></div>
      <div class="wd-actions one"><button class="wd-link" data-act="word-relearn">${ICON.refresh}Naucz się ponownie</button></div>`
    : st === 'learning' ? `
      <div class="wd-state learning"><span class="wd-ring" style="--p:${lvl / SRS.MAX_LEVEL}"></span><span>Uczenie</span></div>
      <div class="wd-actions"><button class="wd-link" data-act="word-practice">Ćwicz teraz</button><span></span><button class="wd-link" data-act="word-known">Już to umiem</button></div>`
    : `
      <button class="pick-go" data-act="word-learn"><span>Ucz się</span></button>
      <div class="wd-actions one"><button class="wd-link" data-act="word-known">Wiem</button></div>`}
  </div>`;
}

// „Ucz się” w pakiecie albo na karcie Nauka: karuzela nowych słów (jak „Nowe słówka” w WRD) —
// Naucz się / Później / Wiem (z „Cofnij”); po wybraniu celu rusza lekcja.
function startPick(ref) {
  const coll = collection(ref);
  if (!coll) return;
  db.lastColl = ref;
  save();
  const ws = byKind(coll.ws);
  const ids = ws.filter((w) => !db.cards[w.id]).map((w) => w.id);
  if (!ids.length) return startSession({ ids: ws.map((w) => w.id), coll: ref }); // wszystko poznane — powtórka pakietu
  openPick({ ref, ids, goal: Math.min(PICK_BATCH, ids.length) });
}

// karta Nauka: do przejrzenia 2× tyle nowych słów, ile jest w ustawieniach planu; cel = ile zostało na dziś
// (po dziennym celu — kolejne 5). Karuzela zaczyna od słowa, które było widać na karcie.
function startPlanPick(first) {
  const fresh = freshWords();
  if (!fresh.length) return startSession({ mode: 'review' });
  let ids = fresh.slice(0, Math.max(2, db.settings.newPerDay * 2)).map((w) => w.id);
  if (first && ids.includes(first)) ids = [first, ...ids.filter((x) => x !== first)];
  openPick({ ref: null, ids, goal: Math.min(counts().newLeft || MORE_NEW, ids.length) });
}

function openPick({ ref, ids, goal }) {
  PK = { ref, ids, goal, i: 0, picked: [], known: 0, back: view === 'summary' ? 'home' : view, hist: [], dir: '' };
  go('pick');
  speakPick();
}

function speakPick() {
  const w = PK && byId.get(PK.ids[PK.i]);
  if (w && db.settings.autoplay) setTimeout(() => speak(w.en), 250);
}

const pickIcon = (w) => (WORD_IMG[w.id] && !isPhrase(w) ? `<img src="assets/words/${WORD_IMG[w.id]}.png" alt="">` : `<span>${esc(isPhrase(w) ? '💬' : w.icon || '📘')}</span>`);

// Naucz się: od razu wybór prawidłowego tłumaczenia tego słowa, po odpowiedzi powrót do karuzeli (następne słowo).
// Później: następne słowo. Wiem: zapisane jako wyuczone, następne słowo.
function pickWord(action) {
  const id = PK.ids[PK.i], w = byId.get(id);
  PK.hist.push({ i: PK.i, picked: PK.picked.slice(), known: PK.known, card: db.cards[id] ? { ...db.cards[id] } : null, action });
  if (action === 'learn') PK.picked.push(id);
  else if (action === 'known') { markKnown(id); PK.known++; }
  PK.i++;
  PK.dir = 'next';
  if (action === 'learn') return startSession({ mode: 'new', ids: [id], picked: true, pick: true });
  if (PK.i >= PK.ids.length) return finishPick();
  render();
  speakPick();
  if (action !== 'learn') toast(action === 'known' ? 'Już wyuczone' : 'Przeskoczyłeś słowo', { undo: pickUndo, icon: pickIcon(w) });
}

// „Cofnij” w komunikacie albo przesunięcie karuzeli w prawo: wraca poprzednie słowo (i jego stan sprzed „Wiem”)
function pickUndo() {
  if (view !== 'pick' || !PK || !PK.hist.length) return;
  const h = PK.hist.pop(), id = PK.ids[h.i];
  if (h.action === 'known') { if (h.card) db.cards[id] = h.card; else delete db.cards[id]; save(); }
  Object.assign(PK, { i: h.i, picked: h.picked, known: h.known, dir: 'prev' });
  render();
  speakPick();
}

// koniec karuzeli (przejrzane wszystkie słowa albo „Wróć”)
function finishPick() {
  const { picked, known, back } = PK;
  PK = null;
  view = back === 'pick' || back === 'session' ? 'home' : back;
  render();
  const parts = [picked.length && `poznane: ${picked.length}`, known && `już znane: ${known}`].filter(Boolean);
  toast(parts.length ? `✓ Nowe słówka — ${parts.join(', ')}` : 'Nie wybrano słówek do nauki');
}

// po jednym pytaniu z karuzeli: z powrotem do karuzeli, na następne słowo (skrzynia — najpierw ekran nagrody)
function backToPick() {
  if (S && S.chestOpened) { view = 'summary'; render(); return; }
  S = null;
  if (!PK) { go('home'); return; }
  if (PK.i >= PK.ids.length) return finishPick();
  view = 'pick';
  render();
  window.scrollTo(0, 0);
  speakPick();
}

function viewPick() {
  const w = byId.get(PK.ids[PK.i]);
  const art = (x) => (isPhrase(x) ? '<span class="wa-emoji">💬</span>' : wordArt(x));
  const card = (x, cls) => (x ? `<div class="pc-card ${cls}" style="--tint:${wordTint(x)}" ${cls === 'cur' ? '' : 'aria-hidden="true"'}>${art(x)}</div>` : '');
  // kropki jak w WRD: bieżąca duża, dalsze coraz mniejsze
  const dots = [];
  for (let k = Math.max(0, PK.i - 2); k < Math.min(PK.ids.length, PK.i + 4); k++) dots.push(`<i class="d${Math.min(3, Math.abs(k - PK.i))}"></i>`);
  const n = PK.goal;
  // „?” przy głośniku: po najechaniu (albo dotknięciu) wymowa, uwagi, przykład i skojarzenie
  const info = [['Wymowa', w.pron], ['Uwagi', w.notes], ['Przykład', w.example && `<i>${esc(w.example)}</i>`, true], ['Skojarzenie', w.mnemo && `🧠 ${esc(w.mnemo)}`, true]]
    .filter(([, v]) => v).map(([h, v, html]) => `<h4>${h}</h4><p>${html ? v : esc(v)}</p>`).join('');
  return `
  <header class="pick-top">
    <button class="pk-back" data-act="pick-back" aria-label="Wróć">${ICON.back}</button>
    <h2>${PK.ref ? 'Nauka' : 'Nowe słówka'}</h2>
    <span class="pick-count" title="Wybrane do nauki (po ${n} rusza lekcja)">${ICON.sparkle}<b>${PK.picked.length}/${n}</b></span>
  </header>
  <span class="pick-progress"><i style="width:${pct(PK.i / PK.ids.length)}"></i></span>
  <section class="pc-stage ${PK.dir}">
    ${card(byId.get(PK.ids[PK.i - 1]), 'prev')}${card(byId.get(PK.ids[PK.i + 1]), 'next')}${card(w, 'cur')}
  </section>
  <section class="pick-card pc-text">
    <p class="pick-meta">${w.level ? `<span class="ln-cefr" title="Poziom CEFR">${esc(w.level)}</span>` : ''}${posBadge(w)}</p>
    <h1 class="pick-en">${esc(w.en)}<button class="wd-say" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button>${info ? '<button class="pick-q" type="button" aria-label="Więcej o słowie: wymowa, uwagi, przykład, skojarzenie">?</button>' : ''}</h1>
    <p class="pick-pl">${esc(w.pl)}</p>
    ${info ? `<div class="pick-info" role="tooltip">${info}</div>` : ''}
  </section>
  <div class="pc-dots" aria-label="Słowo ${PK.i + 1} z ${PK.ids.length}">${dots.join('')}</div>
  <div class="pick-actions">
    <button class="pick-go" data-act="pick-learn"><span>Naucz się</span></button>
    <div class="wd-actions"><button class="wd-link" data-act="pick-later">Później</button><span></span><button class="wd-link" data-act="pick-known">Wiem</button></div>
  </div>`;
}

// Karta „Wznów” na ekranie Pakietów: ostatni pakiet / temat, którego się uczyłeś.
function resumeCard() {
  if (db.lastColl && !collection(db.lastColl) && db.lastColl.startsWith('topic:')) {
    const t = topicsList().find((x) => x.name.startsWith(db.lastColl.slice(6)));
    if (t) { db.lastColl = 'topic:' + t.name; save(); }
  }
  const c = db.lastColl && collection(db.lastColl);
  if (!c || !c.total || c.known === c.total) return '';
  return `
  <div class="rs-card" style="--tint:${c.tint}">
    <span class="rs-art">${c.img ? IMG(c.img, 'rs-img') : c.art}</span>
    <span class="rs-text">
      <button class="rs-open" data-coll="${esc(c.ref)}" title="Otwórz listę słówek"><b>${esc(c.name)}</b></button>
      <span>Umiesz ${c.known} z ${c.total}</span>
      <button class="rs-go" data-act="resume" data-ref="${esc(c.ref)}">Wznów</button>
    </span>
    <span class="rs-chev" aria-hidden="true">›</span>
  </div>`;
}

// ---------- zadania z lekcji (generator js/exercises.js, plan lekcji z program_A1.md) ----------

const PROGRAM = window.SEED_PROGRAM || { lessons: [], themes: {} };
const LESSON_STATUS = { done: 'zrobiona', progress: 'w trakcie', todo: 'przed Tobą' };
let taskLesson = null; // wybrana na karcie lekcja (domyślnie bieżąca)
let EX = null;         // otwarty arkusz: { lesson, sections, values, results, checked, start }

// Lekcje z zadaniami: zrobione i bieżąca, które mają generator (bez program_A1.md — wszystkie z generatorem).
function taskLessons() {
  const all = PROGRAM.lessons.length ? PROGRAM.lessons : Exercises.SUPPORTED.map((id) => ({ id, n: +id.slice(1), title: id, grammar: '', status: 'done' }));
  return all.filter((l) => Exercises.supported(l.id) && l.status !== 'todo');
}

// Bieżąca lekcja z planu: ta „w trakcie”, a gdy jej nie ma — ostatnia zrobiona.
function currentLesson() {
  const ls = PROGRAM.lessons;
  return ls.find((l) => l.status === 'progress') || [...ls].reverse().find((l) => l.status === 'done') || null;
}

function lessonById(id) {
  return PROGRAM.lessons.find((l) => l.id === id) || { id, n: +id.slice(1), title: '', grammar: '', status: 'done' };
}

function selectedTaskLesson() {
  const list = taskLessons();
  if (taskLesson && list.some((l) => l.id === taskLesson)) return lessonById(taskLesson);
  const cur = currentLesson();
  return cur && list.some((l) => l.id === cur.id) ? cur : list[list.length - 1] || null;
}

// Karta 2 na stronie głównej: zadania z lekcji.
function lessonTasksCard() {
  const list = taskLessons();
  const L = selectedTaskLesson();
  const cur = currentLesson();
  if (!L) {
    return `
      <section class="card plan-focus daily-slide lesson-card">
        <div class="focus-top"><h2 class="card-title">Zadania z lekcji</h2></div>
        <p class="lk-empty">Zadania pojawią się po pierwszej lekcji z planu (program_A1.md).</p>
      </section>`;
  }
  const gen = taskGen(L.id);
  const parts = gen.sections;
  const stats = db.tasks[L.id];
  const src = db.settings.taskSource === 'known';
  return `
    <section class="card plan-focus daily-slide lesson-card">
      <div class="focus-top lk-head">
        <h2 class="card-title">Zadania z lekcji</h2>
        <button class="ph-settings" data-view="task-settings" aria-label="Ustawienia zadań" title="Ustawienia zadań">${ICON.sliders}</button>
      </div>
      <div class="lk-lesson">
        <span class="lk-num">${L.id}</span>
        <div class="lk-info"><b>${esc(L.title || 'Lekcja ' + L.n)}</b>${L.grammar ? `<span>${esc(L.grammar)}</span>` : ''}</div>
        <span class="lk-status ${L.status}">${LESSON_STATUS[L.status] || ''}</span>
      </div>
      <div class="lk-parts">${parts.map((s) => `<button class="lk-part" data-act="tasks-start" data-part="${s.key}" title="Rozwiąż tylko część ${s.key}"><b>${s.key}</b><span>${esc(s.title)} · ${s.items.length}</span><i aria-hidden="true">›</i></button>`).join('')}</div>
      ${gen.skipped.length ? `<p class="lk-note">Pominięto: ${gen.skipped.map((p) => `${p.key} (${esc(p.title)})`).join(', ')} — za mało ${src ? 'poznanych ' : ''}słówek. Pojawi się, gdy je poznasz.</p>` : ''}
      ${src ? '<p class="lk-best">Tylko słowa poznane w aplikacji</p>' : ''}
      ${cur && !Exercises.supported(cur.id) ? `<p class="lk-note">Zadania do ${cur.id} „${esc(cur.title)}” jeszcze nie gotowe — na razie powtórz wcześniejsze lekcje.</p>` : ''}
      ${list.length > 1 ? `
      <div class="lk-pick" role="radiogroup" aria-label="Lekcja">
        ${list.map((l) => `<button class="lk-chip ${l.id === L.id ? 'on' : ''}" role="radio" aria-checked="${l.id === L.id}" data-act="task-lesson" data-lesson="${l.id}" title="${esc(l.title)}">${l.id}${l.status === 'done' ? ' ✓' : ''}</button>`).join('')}
      </div>` : ''}
      ${stats ? `<p class="lk-best">Ostatnio <b>${stats.last}/${stats.total}</b> · najlepiej <b>${stats.best}/${stats.total}</b> · rozwiązano ${stats.n}×</p>` : ''}
      <button class="btn pill wide" data-act="tasks-start" ${parts.length ? '' : 'disabled'}>Rozwiąż zadania</button>
    </section>`;
}

// part: 'A'…'D' = tylko ta część arkusza; bez niej — cały zestaw
// Słowa do zadań: wszystkie z Twoich lekcji albo tylko te, które już poznałeś w aplikacji — nigdy spoza nich.
function taskWords() {
  return db.settings.taskSource === 'known' ? words.filter((w) => db.cards[w.id]) : words;
}

function taskGen(id, part = '') {
  const s = db.settings;
  return Exercises.generate(id, taskWords(), Math.random, { parts: part || s.taskParts, count: s.taskCount || 0 });
}

// ---------- ustawienia zadań z lekcji ----------

const TASK_SOURCES = [
  ['all', 'Z moich lekcji', (n) => `Wszystkie słówka z Twoich notatek (slowka.md) — ${wordsLabel(n)}.`],
  ['known', 'Tylko poznane', (n) => `Tylko słowa, które już poznałeś w aplikacji — ${wordsLabel(n)}. Dobre na powtórkę bez niespodzianek; zadania, do których brakuje słów, zostaną pominięte.`],
];
const TASK_PART_HINTS = { A: 'Wybór jednej odpowiedzi z kilku.', B: 'Uzupełnianie luk w zdaniach.', C: 'Przekształcanie: zdanie → pytanie, pełna forma → skrót.', D: 'Tłumaczenie z polskiego na angielski (wpisujesz).' };
PLAN_STEPS.taskCount = {
  title: 'Zadań w każdej części', icon: 'target', tone: ['#DDEFFF', '#1F5FA8'],
  options: [[0, 'Auto'], [3, '3'], [5, '5'], [8, '8']],
  hints: { 0: 'Tyle, ile w lekcji (5–8 w części).', 3: 'Krótki zestaw — szybka powtórka w 2 minuty.', 5: 'Średni zestaw.', 8: 'Długi zestaw — pełny trening (jeśli starczy słów).' },
};

function viewTaskSettings() {
  const s = db.settings;
  const L = selectedTaskLesson();
  const known = words.filter((w) => db.cards[w.id]).length;
  const src = TASK_SOURCES.find(([v]) => v === s.taskSource) || TASK_SOURCES[0];
  const gen = L ? taskGen(L.id) : null;
  const total = gen ? gen.sections.reduce((n, x) => n + x.items.length, 0) : 0;
  const nParts = gen ? gen.sections.length : 0;
  return `
  ${subHero({
    title: 'Ustawienia zadań',
    sub: L ? `Twój zestaw · ${L.id} ${esc(L.title)}` : 'Twój zestaw',
    art: heroArt('hero-tasks.png'),
    rows: `
      ${heroRow({ icon: sqIcon(ICON.order, '#8fb7ff', '#2f7fe6'), label: plural(nParts, 'Część', 'Części', 'Części'), sub: 'A–D z planu lekcji', right: heroNum(nParts), tint: '59, 142, 240', ink: '#2f7fe6', i: 0 })}
      ${heroRow({ icon: IMG('task-star.png', 'ph-icon'), label: 'Zadania', sub: 'w jednym zestawie', right: heroNum(total), tint: '255, 194, 26', ink: '#e09a00', i: 1 })}
      ${heroRow({ icon: IMG('stat-check.png', 'ph-icon'), label: 'Słówka do użycia', sub: 'tylko Twoje — żadnych nowych słów', right: heroNum(s.taskSource === 'known' ? known : words.length), tint: '39, 173, 179', ink: '#27adb3', i: 2 })}
      ${gen && gen.skipped.length ? heroRow({ icon: sqIcon(ICON.target, '#ffb38a', '#e8590c'), label: 'Pominięte części', sub: `${gen.skipped.map((p) => `${p.key} — ${esc(p.title)}`).join(', ')} (za mało słówek)`, tint: '232, 89, 12', ink: '#e8590c', i: 3 }) : ''}`,
  })}

  <h2 class="section-title">Słowa</h2>
  <section class="card set-card">
    <div class="set-head">${setIcon('words', ['#E7E0FF', '#5A3FE0'])}<b>Z jakich słów układać zadania</b></div>
    <div class="segmented two" role="radiogroup" aria-label="Z jakich słów">
      ${TASK_SOURCES.map(([v, label]) => `<button class="seg ${src[0] === v ? 'on' : ''}" role="radio" aria-checked="${src[0] === v}" data-setval="taskSource:${v}">${label}</button>`).join('')}
    </div>
    <p class="set-hint">${src[2](src[0] === 'known' ? known : words.length)}</p>
  </section>

  <h2 class="section-title">Zestaw</h2>
  <section class="card set-list">
    ${(L ? Exercises.parts(L.id) : []).map((p) => {
      const on = s.taskParts.includes(p.key);
      return `
      <div class="set-row">
        <span class="set-icon tk-part-icon">${p.key}</span>
        <div class="set-text"><b>${esc(p.title)}</b><span>${TASK_PART_HINTS[p.key] || ''}</span></div>
        <button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="Część ${p.key}: ${esc(p.title)}" data-taskpart="${p.key}"><span></span></button>
      </div>`;
    }).join('')}
  </section>
  ${stepper('taskCount')}

  <button class="btn pill wide" data-act="tasks-start" ${total ? '' : 'disabled'}>Wygeneruj zestaw (${total} ${plural(total, 'zadanie', 'zadania', 'zadań')})</button>`;
}

function startTasks(id, part = '') {
  const ex = taskGen(id, part);
  if (!ex) return toast('Do tej lekcji nie ma jeszcze zadań');
  const sections = part ? ex.sections.filter((s) => s.key === part) : ex.sections;
  if (!sections.length) return toast('Za mało słów do tych zadań — zmień ustawienia albo poznaj więcej słówek');
  EX = { lesson: id, part, sections, values: {}, results: {}, checked: false, start: Date.now() };
  go('tasks');
}

const taskKey = (si, ii) => `${si}-${ii}`;

function checkTasks() {
  let ok = 0, typo = 0, total = 0;
  EX.sections.forEach((s, si) => s.items.forEach((it, ii) => {
    const k = taskKey(si, ii);
    const r = Exercises.check(it, EX.values[k]);
    EX.results[k] = r;
    total++;
    if (r === 'ok') ok++;
    if (r === 'typo') typo++;
  }));
  const good = ok + typo;
  EX.checked = true;
  EX.score = { ok, typo, good, total };
  // wynik, diamenty (1 za każdą dobrą), czas nauki i odpowiedzi do serii
  const d = today();
  const wasCounted = counted(dayKey());
  d.ms += Math.min(Date.now() - EX.start, 30 * 60000);
  d.n += total;
  d.ok += good;
  // wynik na karcie liczy tylko całe zestawy (pojedyncza część ma mniej zadań)
  if (!EX.part) {
    const st = db.tasks[EX.lesson] || { best: 0, n: 0 };
    db.tasks[EX.lesson] = { best: Math.max(st.best, good), last: good, total, n: st.n + 1, at: Date.now() };
  }
  EX.gems = good + dailyRewards(wasCounted);
  addGems(EX.gems);
  save();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function taskItem(it, k, n) {
  const val = EX.values[k] || '';
  const res = EX.results[k];
  const mark = EX.checked ? (res === 'ok' ? 'ok' : res === 'typo' ? 'typo' : 'bad') : '';
  if (it.kind === 'choice') {
    const shown = val ? `<span class="tk-blank filled">${esc(val)}</span>` : '<span class="tk-blank">___</span>';
    const prompt = esc(it.prompt).replace('___', shown);
    return `
      <li class="tk-item ${mark}" value="${n}">
        <p class="tk-prompt">${prompt.includes('tk-blank') ? prompt : `${prompt} ${shown}`}</p>
        <div class="tk-opts">
          ${it.options.map((o) => {
            const cls = EX.checked ? (o === it.answer ? 'right' : o === val ? 'wrong' : 'dim') : o === val ? 'on' : '';
            return `<button class="tk-opt ${cls}" data-act="task-pick" data-k="${k}" data-v="${esc(o)}" ${EX.checked ? 'disabled' : ''}>${esc(o)}</button>`;
          }).join('')}
        </div>
      </li>`;
  }
  return `
    <li class="tk-item ${mark}" value="${n}">
      <p class="tk-prompt">${esc(it.prompt)}${it.tag ? ` <span class="tk-tag">→ ${esc(it.tag)}</span>` : ''}</p>
      <input class="tk-input" data-task="${k}" value="${esc(val)}" ${EX.checked ? 'readonly' : ''} autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="false" lang="en" placeholder="Twoja odpowiedź" aria-label="Odpowiedź ${n}">
      ${EX.checked && res !== 'ok' ? `<p class="tk-correct">${res === 'typo' ? 'Prawie — poprawnie' : 'Poprawnie'}: <b>${esc(it.answers[0])}</b> <button class="wr-say" data-say="${esc(it.answers[0])}" aria-label="Posłuchaj">${SPEAKER}</button></p>` : ''}
    </li>`;
}

function viewTasks() {
  if (!EX) { view = 'home'; return viewHome(); }
  const L = lessonById(EX.lesson);
  const total = EX.sections.reduce((n, s) => n + s.items.length, 0);
  const answered = Object.values(EX.values).filter((v) => String(v).trim()).length;
  const sc = EX.score;
  return `
    <header class="tk-top">
      <button class="pk-back" data-act="tasks-back" aria-label="Wróć">${ICON.back}</button>
      <div class="tk-title"><h2>Zadania · ${L.id}${EX.part ? ` · ${EX.part}` : ''}</h2><span>${esc(L.title)}</span></div>
      <button class="pk-back" data-act="tasks-new" aria-label="Nowy zestaw" title="Nowy zestaw zadań">${ICON.refresh}</button>
    </header>
    <span class="pick-progress"><i style="width:${pct(EX.checked ? 1 : answered / total)}"></i></span>
    ${EX.checked ? `
    <section class="tk-score ${sc.good / sc.total >= 0.8 ? 'great' : ''}">
      <b>${sc.good}/${sc.total}</b>
      <span>${sc.good === sc.total ? 'Bezbłędnie! 🎉' : sc.good / sc.total >= 0.8 ? 'Świetnie!' : sc.good / sc.total >= 0.5 ? 'Nieźle — popraw błędy poniżej' : 'Przejrzyj poprawki i spróbuj nowego zestawu'}${sc.typo ? ` · ${sc.typo} prawie` : ''}</span>
      <span class="tk-gems">+${EX.gems} ${gemIcon()}</span>
      <div class="tk-secscore">${EX.sections.map((s, si) => {
        const g = s.items.filter((_, ii) => EX.results[taskKey(si, ii)] !== 'wrong').length;
        return `<span><b>${s.key}</b> ${g}/${s.items.length}</span>`;
      }).join('')}</div>
    </section>` : L.grammar ? `<p class="tk-grammar">✍️ ${esc(L.grammar)}</p>` : ''}
    ${EX.sections.map((s, si) => `
    <section class="tk-sec">
      <h3><span class="tk-key">${s.key}</span>${esc(s.title)}</h3>
      <ol class="tk-list">${s.items.map((it, ii) => taskItem(it, taskKey(si, ii), ii + 1)).join('')}</ol>
    </section>`).join('')}
    <div class="cv-cta tk-cta">
      ${EX.checked
        ? '<button class="cv-learn" data-act="tasks-new"><span>Nowy zestaw</span></button>'
        : `<button class="cv-learn" data-act="tasks-check"><span>Sprawdź${answered < total ? ` (${answered}/${total})` : ''}</span></button>`}
    </div>`;
}
