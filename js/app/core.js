// Słowik — Rdzeń: stałe, dane (localStorage), seria i diamenty, okienko ask(), listy, wymowa (nagrania + syntezator).
// Pliki js/app/*.js to jeden program podzielony na części (kolejność w index.html ma znaczenie).
'use strict';

const KEY = 'slowik.v1';
const DAY = SRS.DAY;
const STREAK_MIN = 5;        // tyle odpowiedzi w ciągu dnia zalicza dzień do serii
const CHEST_BONUS = 10;      // 💎 ze skrzyni za ukończony plan dnia
const EXAM_BONUS = 20;       // 💎 za zdany test
const EXAM_PASS = 80;        // próg zaliczenia testu w %
const FREEZE_PRICE = 50;     // 💎 za zamrożenie serii
const MAX_FREEZES = 2;
const DEFAULT_SETTINGS = {
  accent: 'en-GB', voice: '', rate: 0.9, newPerDay: 10, minutes: 5, autoplay: true,
  examName: 'Certyfikat Busuu A1', examDate: '2027-01-17',
  // ustawienia planu dnia
  newOrder: 'lesson', warmup: true, reviewsFirst: false, listening: true, typing: true, reviewCap: 0,
  autoNext: false,
  theme: 'light', // wygląd: 'light' | 'dark' | 'auto' (jak w systemie)
  exOff: [], // wyłączone rodzaje ćwiczeń (np. ['dictation']) // po dobrej odpowiedzi samo przechodzi dalej (wyłączone: czeka na „Dalej”)
  content: 'all', // co ćwiczyć w planie: 'all' | 'words' (bez zwrotów) | 'phrases' (same zwroty)
  // zadania z lekcji: słowa ('all' = z Twoich lekcji, 'known' = tylko poznane w aplikacji), części, ile zadań w części (0 = jak w lekcji)
  taskSource: 'all', taskParts: 'ABCD', taskCount: 0,
};
const LEVEL_NAMES = ['nowe', 'poznane', 'słyszę', 'pamiętam', 'piszę', 'umiem'];
// co ćwiczysz na danym etapie — te same zasady stosuje dobór ćwiczeń w sesji (exerciseType, buildMode)
const LEVEL_HINTS = [
  'Jeszcze nie ćwiczone — zacznij od „Ucz się”.',
  'Rozpoznajesz znaczenie (wybór z 4, tak/nie, obrazki) i układasz słowo z sylab.',
  'Rozpoznajesz ze słuchu i układasz słowo z sylab przy obrazku.',
  'Tłumaczysz na angielski, łączysz pary i układasz słowo z liter.',
  'Wpisujesz słowo i układasz je z liter z pułapkami.',
  'Dyktando i szybkie powtórki — słowo prawie opanowane.',
];
const WEEKDAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];

// Odznaki za serię dni — premia: 5 💎 × liczba dni (tylko za pierwsze zdobycie).
const BADGES = [
  { days: 3, name: 'Rozgrzewka' }, { days: 7, name: 'Tydzień' }, { days: 14, name: 'Dwa tygodnie' },
  { days: 30, name: 'Miesiąc' }, { days: 50, name: 'Pół setki' }, { days: 100, name: 'Setka' },
  { days: 200, name: 'Dwieście' }, { days: 365, name: 'Rok nauki' },
];

// Pakiety słówek: tematyczne i gramatyczne w stylu kart
const PACKS = [
  // Podróże: kraje, pochodzenie, miasto, hotel… — bez przymiotników narodowości (są w temacie Kraje i w Przymiotnikach)
  { key: 'podroze', name: 'Podróże', color: '#FFD84D', textColor: '#1E1B33', test: (w, pos) => !/^przym/i.test(pos) && /podróż|kraj|narodow|pochodz|zamieszk|miast|hotel|lotnis|bilet|zwiedz/i.test(w.topic || '') },
  // klucz 'biznes' zostaje (ikona, zapisany „Wznów”) — w praktyce to zwroty grzecznościowe i reakcje w rozmowie
  { key: 'biznes', name: 'Grzeczności i rozmowa', color: '#4EB4FF', textColor: '#FFFFFF', test: (w) => /reagow|grzeczn|rozmow/i.test(w.topic || '') },
  { key: 'phrases', name: 'Rozmówki', color: '#FF7568', textColor: '#FFFFFF', test: (w, pos) => /zwrot/i.test(pos) },
  { key: 'nouns', name: 'Rzeczowniki', color: '#FFA834', textColor: '#FFFFFF', test: (w, pos) => /^rz/i.test(pos) },
  { key: 'verbs', name: 'Czasowniki', color: '#4CD080', textColor: '#FFFFFF', test: (w, pos) => /^cz/i.test(pos) },
  { key: 'adj', name: 'Przymiotniki', color: '#9E7BFF', textColor: '#FFFFFF', test: (w, pos) => /^przym/i.test(pos) },
  { key: 'all', name: 'Wszystkie', color: '#8DCBFF', textColor: '#1E1B33', test: () => true },
];
const MIN_PACK = 5; // pakiet z mniejszą liczbą słów się nie pokazuje (np. Czasowniki, dopóki są 2) — pojawi się sam po kolejnych lekcjach
const TINTS = ['#FFF1C9', '#DDF6E8', '#FFE6DF', '#DDEFFF', '#EFEAFF', '#FFE8D2'];

// Ikony pakietów i tematów (assets/pk-*.png z Desktop/ikony_do_aplikacji; własne listy = notatnik „listy”)
const COLL_ART = {
  'pack:podroze': 'podroze', 'pack:biznes': 'biznes', 'pack:phrases': 'rozmowki', 'pack:nouns': 'rzeczowniki',
  'pack:verbs': 'czasowniki', 'pack:adj': 'przymiotniki', 'pack:all': 'wszystkie',
  'topic:Powitania': 'powitania', 'topic:Przedstawianie się': 'przedstawianie', 'topic:Samopoczucie': 'samopoczucie',
  'topic:Przedstawianie się, Powitania i Pożegnania': 'pozegnania', 'topic:Kraje': 'kraje', 'topic:Narodowości': 'swiat', 'topic:Podróże': 'podroze', 'topic:Biznes': 'biznes',
  'topic:Small Talk i Reakcje Konwersacyjne': 'reagowanie', 'topic:Nastroje': 'samopoczucie',
  'topic:Grzeczności': 'grzecznosci', 'topic:Pożegnania': 'pozegnania', 'topic:Kraje i narodowości': 'kraje', 'topic:Kraje i narodowości — Europa': 'kraje', 'topic:Kraje i narodowości — świat i kontynenty': 'swiat',
  'topic:Pochodzenie i miejsce zamieszkania': 'pochodzenie', 'topic:Reagowanie w rozmowie': 'reagowanie', 'topic:Ludzie i rzeczy': 'biznes',
  'auto:last': 'ostatnia-lekcja', 'auto:hard': 'trudne', 'auto:mistakes': 'bledy',
};
// [tło karty, pigułka] dobrane do koloru ikony
const ART_TINT = {
  powitania: ['#FDE9EF', '#EE86AA'], samopoczucie: ['#E3F6E2', '#58BF71'], grzecznosci: ['#FDF0DC', '#E3A04C'],
  pozegnania: ['#F3E6FA', '#B07ADB'], przedstawianie: ['#FFE9DC', '#F2925A'], kraje: ['#E2F0FD', '#56A2EC'],
  swiat: ['#E2F0FD', '#56A2EC'], listy: ['#E6F0FF', '#4C86E8'], pochodzenie: ['#E0F4FA', '#44B0D2'], reagowanie: ['#E6F7EE', '#46BD85'],
  podroze: ['#E1EEFF', '#4F8FF0'], biznes: ['#E3E9FB', '#5A77DE'], czasowniki: ['#DDF0FF', '#3E9BEA'],
  rozmowki: ['#FDE4E6', '#EC6875'], rzeczowniki: ['#FFEEDB', '#F29B3C'], przymiotniki: ['#EEF1F8', '#8997C2'],
  'ostatnia-lekcja': ['#F3EAE2', '#B08561'], trudne: ['#E1ECFD', '#4C86E8'], bledy: ['#DFF5FB', '#31AFD3'],
  wszystkie: ['#EEF0F7', '#8C95B6'],
};

// Grafiki 3D (Meta Muse Image → assets/ui/) zamiast płaskich rysunków SVG z js/icons.js — ten sam styl co rakieta i ikony pakietów
const ART3D = { gradCap: 'gradcap', trophy: 'trophy', globe: 'globe', cup: 'cup', suitcase: 'suitcase', book: 'book', cardStack: 'cards', listenGirl: 'girl', ear: 'ear', chestOpen: 'chest', medal: 'medal' };
for (const [k, file] of Object.entries(ART3D)) ART[k] = `<img class="art3d art-${file}" src="assets/ui/${file}.png" alt="" draggable="false">`;
ART.rocketBook = '<img class="art3d art-rocket" src="assets/plan-rocket.webp" alt="" draggable="false">';

// Ikony słówek: mapa w js/word-icons.js (window.WORD_ICONS)
const WORD_IMG = { ...(window.WORD_ICONS || {}) };
// + ikony dodane w panelu dewelopera (js/word-icons-extra.js)
// oryginalne ikony (sprzed panelu) — „przywróć oryginał” w panelu dewelopera
const BASE_WORD_IMG = { ...WORD_IMG };
Object.assign(WORD_IMG, window.EXTRA_WORD_IMG || {});



// Testy jak w planie nauki: tygodniowy, miesięczny i egzamin próbny.
const EXAMS = [
  { key: 'week', name: 'Test tygodnia', n: 10, days: 7 },
  { key: 'month', name: 'Test miesięczny', n: 25, days: 30 },
  { key: 'mock', name: 'Egzamin próbny', n: 40, days: 0 },
];

// Ścieżka do egzaminu: 3 testy tygodnia, potem miesięczny, i tak dalej.
const PATH_PTS = [[84, 25], [230, 85], [300, 165], [190, 240], [90, 320], [200, 395]];
const PATH_TROPHY = [318, 450];
const PATH_SEGS = [
  'M84 25 C150 25 230 35 230 85', 'M230 85 C230 125 300 125 300 165', 'M300 165 C300 215 245 240 190 240',
  'M190 240 C130 240 90 270 90 320', 'M90 320 C90 370 150 395 200 395', 'M200 395 C260 395 318 405 318 450',
];
const SEG_COLORS = ['#38C6B4', '#6FD08C', '#FFC24B'];
const CHIP_POS = [[33, 25], [182, 85], [351, 165]];
const pathKind = (i) => ((i + 1) % 4 === 0 ? 'month' : 'week');

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, one, few, many) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
const wordsLabel = (n) => `${n} ${plural(n, 'słówko', 'słówka', 'słówek')}`;
const phrasesLabel = (n) => `${n} ${plural(n, 'zwrot', 'zwroty', 'zwrotów')}`;
// „21 słówek · 68 zwrotów” — osobno słowa i zwroty w zestawie
const itemsLabel = (ws) => { const p = ws.filter(isPhrase).length, n = ws.length - p; return [n && wordsLabel(n), p && phrasesLabel(p)].filter(Boolean).join(' · ') || wordsLabel(0); };
const daysLabel = (n) => `${n} ${plural(n, 'dzień', 'dni', 'dni')}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (x) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;

// ---------- dane ----------

let db = load();
let words = [];
let byId = new Map();
let view = 'home';
let S = null; // bieżąca sesja nauki / test
let P = null; // odtwarzacz w trybie słuchania
let wordsFilter = { q: '', coll: '', status: '', kind: '' };
let listenSource = '__seen';
let collFrom = 'home'; // skąd wszedłeś do pakietu (strzałka wstecz)

function normalize(d) {
  return {
    cards: d.cards || {}, days: d.days || {}, extra: d.extra || [], seedVer: d.seedVer || 0, resetAt: d.resetAt || 0,
    gems: d.gems || 0, freezes: d.freezes || 0, best: d.best || 0,
    lists: d.lists || [], exams: d.exams || [], path: d.path || [], mistakes: d.mistakes || [], badges: d.badges || {}, lastColl: d.lastColl || null, tasks: d.tasks || {}, lastBackup: d.lastBackup || 0, backupSnooze: d.backupSnooze || 0,
    stamp: d.stamp || {}, // kiedy zmieniło się każde pole (synchronizacja: wygrywa nowsza wersja)
    settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) },
  };
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d) return normalize(d);
  } catch (e) { /* uszkodzone dane — zaczynamy od zera */ }
  return normalize({});
}

function save() {
  stampChanges();
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('Nie udało się zapisać postępów'); }
  syncSoon();
}

// Znaczniki czasu zmian: przy zapisie porównujemy każde pole z poprzednim zapisem.
let savedJson = {};
function stampChanges() {
  const now = Date.now();
  db.stamp = db.stamp || {};
  for (const k of Object.keys(db)) {
    if (k === 'stamp') continue;
    const j = JSON.stringify(db[k]);
    if (savedJson[k] !== undefined && savedJson[k] !== j) db.stamp[k] = now;
    savedJson[k] = j;
  }
}
stampChanges(); // stan po wczytaniu — bez znaczników

// Motyw: jasny / ciemny / jak w systemie (ciemne kolory: dark.css, generuje tools/build-dark.js)
const darkQuery = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() {
  const t = db.settings.theme;
  const dark = t === 'dark' || (t === 'auto' && !!darkQuery && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#16142a' : '#6b4eff';
}
applyTheme();
if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);

// ---------- synchronizacja z serwerem na komputerze (tools/server.js, js/sync.js) ----------
// Na komputerze (localhost / 127.0.0.1) działa sama; telefon przez Wi‑Fi — po wpisaniu PIN-u z komputera.
const SYNC_PIN_KEY = 'slowik.syncPin';
const SYNC = { on: false, needPin: false, pin: '', timer: 0, busy: false, again: false, last: 0, error: '', info: null };
try { SYNC.pin = localStorage.getItem(SYNC_PIN_KEY) || ''; } catch (e) { /* brak dostępu do pamięci */ }
const syncReady = () => SYNC.on && (!SYNC.needPin || !!SYNC.pin);

async function syncInit() {
  if (!/^https?:$/.test(location.protocol)) return;
  try {
    const r = await fetch('/api/sync/status', { cache: 'no-store' });
    if (!r.ok) return;
    SYNC.needPin = !!(await r.json()).needPin;
    SYNC.on = true;
  } catch (e) { return; } // wersja bez serwera (np. GitHub) — bez synchronizacji
  if (!SYNC.needPin) {
    try { SYNC.info = await (await fetch('/api/sync/info', { cache: 'no-store' })).json(); } catch (e) { /* bez informacji o telefonie */ }
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
  if (syncReady()) await syncNow();
  if (view === 'profile') render();
}

function syncSoon() {
  if (!syncReady()) return;
  clearTimeout(SYNC.timer);
  SYNC.timer = setTimeout(syncNow, 1500);
}

// Wysyłamy swój zapis; serwer łączy go ze swoim i odsyła wynik, który przyjmujemy (poza sesją nauki).
async function syncNow() {
  if (!syncReady()) return;
  if (SYNC.busy) { SYNC.again = true; return; }
  SYNC.busy = true;
  try {
    const r = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(SYNC.needPin ? { 'X-Sync-Pin': SYNC.pin } : {}) },
      body: JSON.stringify({ db }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { SYNC.pin = ''; try { localStorage.removeItem(SYNC_PIN_KEY); } catch (e) { /* */ } }
    if (!r.ok) throw new Error(j.error || 'Serwer nie odpowiada');
    SYNC.error = '';
    SYNC.last = Date.now();
    applySynced(j.db);
  } catch (e) {
    SYNC.error = e.message;
  }
  SYNC.busy = false;
  if (SYNC.again) { SYNC.again = false; syncSoon(); }
  if (view === 'profile') render();
}

function applySynced(remote) {
  if (!remote) return;
  const merged = normalize(Sync.merge(db, remote));
  if (Sync.same(merged, db)) return;
  if (view === 'session') return; // w trakcie nauki nie podmieniamy danych — połączą się przy następnej synchronizacji
  db = merged;
  savedJson = {};
  stampChanges();
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* zapis przy następnej zmianie */ }
  buildWords();
  render();
}

async function syncConnect(pin) {
  SYNC.pin = String(pin || '').replace(/\D/g, '');
  try { localStorage.setItem(SYNC_PIN_KEY, SYNC.pin); } catch (e) { /* PIN tylko do zamknięcia karty */ }
  await syncNow();
  toast(SYNC.error ? SYNC.error : '✓ Połączono — postęp synchronizuje się z komputerem');
}

// Karta w profilu
function syncCard() {
  if (!SYNC.on) {
    return `<section class="card sync-card"><div class="set-head">${setIcon('refresh', ['#D4F3EC', '#0F7466'])}<b>Synchronizacja</b></div>
      <p class="set-hint">Działa, gdy otwierasz aplikację z komputera (start.bat) albo na telefonie przez Wi‑Fi z adresu komputera. Tutaj postęp jest tylko w tej przeglądarce — zrób kopię zapasową.</p></section>`;
  }
  const status = SYNC.error ? `<span class="sync-bad">⚠ ${esc(SYNC.error)}</span>`
    : SYNC.last ? `<span class="sync-ok">✓ Zsynchronizowano ${new Date(SYNC.last).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>` : '';
  if (SYNC.needPin && !SYNC.pin) {
    return `<section class="card sync-card"><div class="set-head">${setIcon('refresh', ['#D4F3EC', '#0F7466'])}<b>Połącz z komputerem</b></div>
      <p class="set-hint">Wpisz PIN z komputera (Profil → Synchronizacja). Postęp z telefonu i komputera połączy się w jeden.</p>
      <div class="sync-pin"><input id="sync-pin" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="PIN (6 cyfr)"><button class="btn" data-act="sync-connect">Połącz</button></div>
      ${status}</section>`;
  }
  const phone = SYNC.info && (SYNC.info.lan && SYNC.info.urls.length
    ? `Telefon (to samo Wi‑Fi): otwórz <b>${esc(SYNC.info.urls[0])}</b> i wpisz PIN <b class="sync-code">${esc(SYNC.info.pin)}</b>`
    : 'Telefon: dostęp przez Wi‑Fi jest wyłączony (w .dev-config.json ustaw "lan": true i uruchom ponownie start.bat).');
  return `<section class="card sync-card"><div class="set-head">${setIcon('refresh', ['#D4F3EC', '#0F7466'])}<b>Synchronizacja</b><button class="btn small ghost" data-act="sync-now" ${SYNC.busy ? 'disabled' : ''}>Teraz</button></div>
    <p class="set-hint">Postęp zapisuje się na komputerze i łączy między przeglądarkami${SYNC.needPin ? ' i tym telefonem' : ''}.${phone ? '<br>' + phone : ''}</p>
    ${status}</section>`;
}

function buildWords() {
  const map = new Map();
  for (const w of window.SEED_WORDS || []) map.set(w.id, w);
  for (const w of db.extra) map.set(w.id, { ...map.get(w.id), ...w });
  words = [...map.values()];
  byId = map;
}

const card = (id) => db.cards[id] || SRS.fresh();
const today = () => (db.days[dayKey()] ||= { n: 0, ok: 0, ms: 0, nw: 0, rv: 0 });
const isKnown = (c) => !!c && c.s >= 2; // słowo zapamiętane co najmniej na 2 dni
const isHard = (c) => !!c && (c.lapses >= 1 || c.d >= 6.5);
const goalMin = () => db.settings.minutes || 5;
const goalMs = () => goalMin() * 60000;
const wordStatus = (w) => { const c = db.cards[w.id]; return !c ? 'new' : isKnown(c) ? 'known' : 'learning'; };
const isPhrase = (w) => /zwrot/i.test(w.pos || '');
// słowo bywa w kilku działach słownika (topics); topic = dział główny
const cefr = (w) => ({ A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 })[w.level] || 3; // poziom CEFR jako liczba (bez poziomu → środek)
const inTopic = (w, t) => w.topic === t || (!!w.topics && w.topics.includes(t));
// filtr „Słówka / Zwroty” z listy słówek (działa tylko, gdy zestaw ma jedno i drugie)
const byKind = (ws) => { const n = ws.filter(isPhrase).length; const k = n > 0 && n < ws.length ? wordsFilter.kind : ''; return k ? ws.filter((w) => (k === 'phrases') === isPhrase(w)) : ws; };
// czy słowo należy do planu dnia (ustawienie „Co ćwiczyć”)
const inPlan = (w) => (db.settings.content === 'words' ? !isPhrase(w) : db.settings.content === 'phrases' ? isPhrase(w) : true);
const packOf = (w) => (PACKS.find((p) => p.key !== 'all' && p.test(w, w.pos || '')) || PACKS[0]).key;

function topicsList() {
  const list = [];
  const seen = new Set();
  for (const w of words) if (!seen.has(w.topic)) { seen.add(w.topic); list.push({ name: w.topic, icon: w.icon }); }
  return list;
}

function lastLessonDate() {
  return words.reduce((m, w) => (w.added && w.added > m ? w.added : m), '');
}

function formatDate(key, withYear = true) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });
}

// Kolekcja słówek: temat, pakiet, moja lista albo lista automatyczna.
function collection(ref) {
  if (!ref) return null;
  const i = ref.indexOf(':');
  const kind = ref.slice(0, i), key = ref.slice(i + 1);
  let c = null;
  if (kind === 'topic') {
    const topics = topicsList();
    const t = topics.find((x) => x.name === key);
    if (t) c = { name: t.name, ws: words.filter((w) => inTopic(w, key)), bg: TINTS[topics.indexOf(t) % TINTS.length], art: `<span class="pk-emoji">${esc(t.icon)}</span>` };
  } else if (kind === 'pack') {
    const p = PACKS.find((x) => x.key === key);
    if (p) c = { name: p.name, ws: words.filter((w) => key === 'all' || (p.test ? p.test(w, w.pos || '') : packOf(w) === key)), bg: p.color, textColor: p.textColor, art: packArt(p.key) };
  } else if (kind === 'list') {
    const l = db.lists.find((x) => x.id === key);
    if (l) c = { name: l.name, ws: l.ids.map((id) => byId.get(id)).filter(Boolean), bg: '#EFEAFF', art: ART.cardStack, list: l };
  } else if (kind === 'auto' && key === 'hard') {
    c = { name: 'Trudne słowa', ws: words.filter((w) => isHard(db.cards[w.id])), bg: '#FFE6DF', art: ART.cardStack, desc: 'słowa, przy których się mylisz' };
  } else if (kind === 'auto' && key === 'last') {
    const d = lastLessonDate();
    c = { name: 'Z ostatniej lekcji', ws: d ? words.filter((w) => w.added === d) : [], bg: '#DDF6E8', art: ART.book, desc: d ? `dodane ${formatDate(d, false)}` : '' };
  } else if (kind === 'auto' && ['new', 'seen', 'known', 'learning', 'known7', 'known30'].includes(key)) {
    const since = (days) => (w) => wordStatus(w) === 'known' && db.cards[w.id].last >= Date.now() - days * DAY; // wyuczone i ćwiczone w ostatnich dniach
    const AUTO = {
      known7: ['Wyuczone — ostatni tydzień', since(7), 'wyuczone, ćwiczone w ostatnich 7 dniach'],
      known30: ['Wyuczone — ostatni miesiąc', since(30), 'wyuczone, ćwiczone w ostatnich 30 dniach'],
      new: ['Słówka do nauczenia', (w) => !db.cards[w.id], 'jeszcze nie ćwiczone'],
      seen: ['Moje słówka', (w) => !!db.cards[w.id], 'wszystkie, które już poznałeś'],
      known: ['Umiem', (w) => wordStatus(w) === 'known', 'wyuczone'],
      learning: ['Uczę się', (w) => wordStatus(w) === 'learning', 'w trakcie nauki'],
    }[key];
    c = { name: AUTO[0], ws: words.filter(AUTO[1]), bg: '#EFEAFF', art: ART.cardStack, desc: AUTO[2] };
  } else if (kind === 'auto' && key === 'mistakes') {
    c = { name: 'Pomyłki', ws: db.mistakes.map((id) => byId.get(id)).filter(Boolean), bg: '#FFE6DF', art: ART.cardStack, desc: 'słowa z błędną odpowiedzią — znikają po poprawnej' };
  }
  if (!c) return null;
  c.ref = ref;
  const art = COLL_ART[ref] || (kind === 'list' ? 'listy' : null); // temat bez własnej grafiki → jego emoji ze słownika
  c.img = art ? `pk-${art}.png` : null;
  [c.tint, c.pill] = ART_TINT[art] || [c.bg, '#8C95B6'];
  c.total = c.ws.length;
  c.known = c.ws.filter((w) => isKnown(db.cards[w.id])).length;
  return c;
}

function counts() {
  const now = Date.now();
  let due = 0, seen = 0, known = 0, planDue = 0, planTotal = 0, planUnseen = 0;
  const levels = [0, 0, 0, 0, 0, 0];
  for (const w of words) {
    const c = db.cards[w.id];
    const plan = inPlan(w);
    if (plan) planTotal++;
    if (!c) { levels[0]++; if (plan) planUnseen++; continue; }
    seen++;
    if (c.due <= now) { due++; if (plan) planDue++; }
    if (isKnown(c)) known++;
    levels[Math.max(1, c.level)]++;
  }
  const day = db.days[dayKey()] || {};
  const newLeft = Math.min(planUnseen, Math.max(0, db.settings.newPerDay - (day.nw || 0)));
  // dzienny limit powtórek z ustawień planu (0 = bez limitu)
  const cap = db.settings.reviewCap;
  const dueLeft = cap ? Math.max(0, Math.min(planDue, cap - (day.rv || 0))) : planDue;
  return { due, dueLeft, seen, known, newLeft, levels, planTotal, planUnseen };
}

// Opcje ćwiczeń z ustawień planu (tryb „Trening słuchu” zawsze używa słuchu).
function typeOpts() {
  return {
    speak: speechReady() && (db.settings.listening || S?.mode === 'listen'),
    typing: db.settings.typing,
  };
}

// Plan dnia: trzy zadania; wszystkie zrobione = skrzynia z diamentami.
function dayPlan() {
  const d = db.days[dayKey()] || {};
  const c = counts();
  const rv = d.rv || 0, nw = d.nw || 0, ms = d.ms || 0;
  const revTotal = rv + c.dueLeft;
  const newTarget = Math.min(db.settings.newPerDay, nw + c.planUnseen);
  const tasks = [
    {
      icon: 'refresh', tone: 'teal', done: rv >= revTotal, value: revTotal ? rv / revTotal : 1,
      label: revTotal ? `Powtórz ${wordsLabel(revTotal)}` : 'Brak powtórek na dziś', text: revTotal ? `${rv}/${revTotal}` : '',
    },
    {
      icon: 'sparkle', tone: 'purple', done: nw >= newTarget, value: newTarget ? nw / newTarget : 1,
      label: newTarget
        ? `Poznaj ${newTarget} ${db.settings.content === 'phrases' ? plural(newTarget, 'nowy zwrot', 'nowe zwroty', 'nowych zwrotów') : plural(newTarget, 'nowe słowo', 'nowe słowa', 'nowych słów')}`
        : db.settings.content === 'phrases' ? 'Nowe zwroty: wszystkie poznane' : 'Nowe słowa: wszystkie poznane', text: newTarget ? `${Math.min(nw, newTarget)}/${newTarget}` : '',
    },
    {
      icon: 'clock', tone: 'orange', done: ms >= goalMs(), value: ms / goalMs(),
      label: `Ucz się ${goalMin()} ${plural(goalMin(), 'minutę', 'minuty', 'minut')}`, text: `${Math.min(goalMin(), Math.floor(ms / 60000))}/${goalMin()}`,
    },
  ];
  return { tasks, complete: tasks.every((t) => t.done), claimed: !!d.chest };
}

// ---------- seria, odznaki i diamenty ----------

const counted = (k) => { const d = db.days[k]; return !!d && (d.n >= STREAK_MIN || !!d.frozen); };

function streak() {
  const d = new Date();
  if (!counted(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (counted(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Opuszczone dni są automatycznie pokrywane zamrożeniami serii (jeśli wystarczy).
function applyFreezes() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const missing = [];
  for (let i = 0; i < 400 && !counted(dayKey(d)); i++) { missing.push(dayKey(d)); d.setDate(d.getDate() - 1); }
  if (!missing.length || !counted(dayKey(d)) || missing.length > db.freezes) return;
  for (const k of missing) db.days[k] = { n: 0, ok: 0, ms: 0, nw: 0, ...(db.days[k] || {}), frozen: true };
  db.freezes -= missing.length;
  save();
  setTimeout(() => toast(`🧊 Zamrożenie uratowało Twoją serię (${daysLabel(missing.length)})`), 500);
}

// Nagrody po każdej aktywności: seria, odznaki i skrzynia za plan dnia.
function dailyRewards(wasCounted) {
  const d = today();
  let earned = 0;
  if (!wasCounted && counted(dayKey())) {
    const st = streak();
    db.best = Math.max(db.best, st);
    if (S) S.streakUp = st;
    const badge = BADGES.find((b) => b.days === st);
    if (badge && !db.badges[badge.days]) {
      db.badges[badge.days] = dayKey();
      earned += badge.days * 5;
      if (S) S.badge = badge;
      toast(`🏅 Nowa odznaka: ${badge.name}! +${badge.days * 5} 💎`);
    } else {
      toast(`🔥 Seria: ${daysLabel(st)}!`);
    }
  }
  if (!d.chest && dayPlan().complete) {
    d.chest = true;
    earned += CHEST_BONUS;
    if (S) S.chestOpened = true;
    setTimeout(() => toast(`🎁 Plan dnia ukończony! +${CHEST_BONUS} 💎`), 1200);
  }
  return earned;
}

function addGems(n) {
  if (!n) return;
  db.gems += n;
  today().gems = (today().gems || 0) + n;
  if (S) S.gems += n;
}

function buyFreeze() {
  if (db.freezes >= MAX_FREEZES) return toast('Masz już maksymalną liczbę zamrożeń');
  if (db.gems < FREEZE_PRICE) return toast(`Potrzebujesz ${FREEZE_PRICE} 💎`);
  db.gems -= FREEZE_PRICE;
  db.freezes++;
  save();
  toast('🧊 Kupiono zamrożenie serii');
  render();
}

function forecast() {
  const out = [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const from = start.getTime() + i * DAY, to = from + DAY;
    let n = 0;
    for (const w of words) { const c = db.cards[w.id]; if (c && (i === 0 ? c.due < to : c.due >= from && c.due < to)) n++; } // tylko słowa ze słownika (bez usuniętych)
    out.push({ label: i === 0 ? 'dziś' : WEEKDAYS[new Date(from).getDay()], n });
  }
  return out;
}

// ---------- ścieżka do egzaminu ----------

function pathName(i) {
  const kind = pathKind(i);
  let n = 0;
  for (let j = 0; j <= i; j++) if (pathKind(j) === kind) n++;
  return `${kind === 'month' ? 'Test miesięczny' : 'Test tygodnia'} ${n}`;
}

const examDef = (key) => EXAMS.find((x) => x.key === key);

// ---------- okienko w stylu aplikacji (zamiast prompt / confirm przeglądarki) ----------

// ask({ title, text, input, value, ok, danger }) → tekst z pola (gdy input), true / false (pytanie) albo null (Anuluj)
function ask({ title, text = '', input = false, value = '', ok = 'OK', cancel = 'Anuluj', danger = false }) {
  if (document.querySelector('dialog.ask')) return Promise.resolve(input ? null : false); // jedno okienko naraz
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'ask';
    dlg.innerHTML = `
      <form method="dialog" class="ask-box">
        <h2>${esc(title)}</h2>
        ${text ? `<p>${esc(text)}</p>` : ''}
        ${input ? `<input class="ask-input" value="${esc(value)}" maxlength="40" autocomplete="off" required>` : ''}
        <div class="ask-actions">
          ${cancel === false ? '' : `<button type="button" class="ask-btn ghost" value="cancel">${esc(cancel)}</button>`}
          <button type="submit" class="ask-btn ${danger ? 'danger' : ''}" value="ok">${esc(ok)}</button>
        </div>
      </form>`;
    document.body.append(dlg);
    const field = dlg.querySelector('.ask-input');
    let answer = null;
    dlg.querySelector('.ghost').addEventListener('click', () => dlg.close());
    dlg.querySelector('form').addEventListener('submit', (e) => {
      if (input && !field.value.trim()) { e.preventDefault(); field.focus(); return; }
      answer = input ? field.value.trim() : true;
    });
    let done = false;
    const finish = () => { if (done) return; done = true; dlg.remove(); resolve(input ? answer : !!answer); };
    dlg.addEventListener('close', finish);
    dlg.addEventListener('cancel', () => { answer = null; setTimeout(finish, 0); }); // Esc = Anuluj (sprząta nawet bez zdarzenia close)
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // klik w tło = Anuluj
    dlg.showModal();
    if (field) { field.focus(); field.select(); } else dlg.querySelector('[value="ok"]').focus();
  });
}

// ---------- moje listy ----------

async function createList(firstWordId) {
  const name = await ask({ title: 'Nowa lista', text: 'Jak ją nazwiesz?', input: true, ok: 'Utwórz' });
  if (!name) return null;
  const l = { id: 'l' + Date.now().toString(36), name, ids: firstWordId ? [firstWordId] : [] };
  db.lists.push(l);
  save();
  toast(`Utworzono listę „${name}”`);
  return l;
}

function toggleInList(listId, wordId) {
  const l = db.lists.find((x) => x.id === listId);
  if (!l) return;
  const i = l.ids.indexOf(wordId);
  if (i >= 0) l.ids.splice(i, 1); else l.ids.push(wordId);
  save();
}

async function renameList(l) {
  const name = await ask({ title: 'Zmień nazwę listy', input: true, value: l.name, ok: 'Zapisz' });
  if (!name) return;
  l.name = name;
  save();
  render();
}

async function deleteList(l) {
  if (!(await ask({ title: `Usunąć listę „${l.name}”?`, text: 'Słówka i postęp nauki zostają.', ok: 'Usuń', danger: true }))) return;
  db.lists = db.lists.filter((x) => x.id !== l.id);
  save();
  go('home');
}

// ---------- wymowa ----------

const canSpeak = 'speechSynthesis' in window;
let allVoices = [];
let voices = [];
function loadVoices() {
  allVoices = canSpeak ? speechSynthesis.getVoices() : [];
  voices = allVoices.filter((v) => /^en[-_]/i.test(v.lang));
}
// głosy mogą przyjść, zanim wczytają się widoki (render jest w views.js)
if (canSpeak) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); if (typeof render === 'function' && ['profile', 'listen', 'home'].includes(view)) render(); }; }
const speechReady = () => canSpeak && voices.length > 0;
const plVoice = () => allVoices.find((v) => /^pl[-_]/i.test(v.lang)) || null;

function pickVoice() {
  if (db.settings.voice) { const v = voices.find((x) => x.name === db.settings.voice); if (v) return v; }
  const acc = db.settings.accent.toLowerCase();
  const list = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === acc);
  return list.find((v) => /natural|online|google/i.test(v.name)) || list[0] || voices[0] || null;
}

function utterance(text, lang, rate) {
  const u = new SpeechSynthesisUtterance(text.replace(/\s+\/\s+/g, '. '));
  if (lang === 'pl') { u.lang = 'pl-PL'; const v = plVoice(); if (v) u.voice = v; u.rate = 1; }
  else { u.lang = db.settings.accent; const v = pickVoice(); if (v) u.voice = v; u.rate = rate || db.settings.rate; }
  return u;
}

// Nagrania z panelu dewelopera (js/word-audio.js): prawdziwy lektor zamiast syntezatora przeglądarki.
const audioKey = (t) => String(t || '').trim().toLowerCase();
function audioFile(text, lang) {
  const A = window.WORD_AUDIO || {}, k = audioKey(text);
  if (lang === 'pl') return (A.pl || {})[k];
  const acc = db.settings.accent === 'en-US' ? 'en-US' : 'en-GB', other = acc === 'en-US' ? 'en-GB' : 'en-US';
  return (A[acc] || {})[k] || (A[other] || {})[k]; // brak w wybranym akcencie → drugi akcent, dopiero potem syntezator
}
let audioEl = null;
function stopSpeech() {
  if (canSpeak) speechSynthesis.cancel();
  if (audioEl) { audioEl.pause(); audioEl = null; }
}
function playAudio(src, rate) {
  stopSpeech();
  audioEl = new Audio(src);
  if (rate && rate < 0.8) audioEl.playbackRate = 0.75; // „wolniej” — wysokość głosu zostaje
  return audioEl;
}

function speak(text, rate) {
  if (!text) return;
  const file = audioFile(text, 'en');
  if (file) { playAudio('assets/audio/' + file, rate).play().catch(() => {}); return; }
  if (!canSpeak) return;
  stopSpeech();
  speechSynthesis.speak(utterance(text, 'en', rate));
}

// Wersja z oczekiwaniem na koniec wypowiedzi (dla trybu słuchania).
function say(text, lang = 'en', rate) {
  const file = text && audioFile(text, lang);
  if (file) {
    return new Promise((resolve) => {
      let done = false;
      const fin = () => { if (!done) { done = true; clearTimeout(t); resolve(); } };
      const a = playAudio('assets/audio/' + file, rate);
      a.onended = fin; a.onerror = fin;
      const t = setTimeout(fin, 15000);
      a.play().catch(fin);
    });
  }
  if (!canSpeak || !text) return wait(0);
  if (lang === 'pl' && !plVoice()) return wait(1400);
  return new Promise((resolve) => {
    let done = false;
    const fin = () => { if (!done) { done = true; clearTimeout(t); resolve(); } };
    const u = utterance(text, lang, rate);
    u.onend = fin;
    u.onerror = fin;
    const t = setTimeout(fin, 2500 + text.length * 130);
    stopSpeech();
    speechSynthesis.speak(u);
  });
}
