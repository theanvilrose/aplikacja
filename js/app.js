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
  content: 'all', // co ćwiczyć w planie: 'all' | 'words' (bez zwrotów) | 'phrases' (same zwroty)
  // zadania z lekcji: słowa ('all' = z Twoich lekcji, 'known' = tylko poznane w aplikacji), części, ile zadań w części (0 = jak w lekcji)
  taskSource: 'all', taskParts: 'ABCD', taskCount: 0,
};
const LEVEL_NAMES = ['nowe', 'poznane', 'słyszę', 'pamiętam', 'piszę', 'umiem'];
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
  'topic:Grzeczności': 'grzecznosci', 'topic:Pożegnania': 'pozegnania', 'topic:Kraje i narodowości': 'kraje', 'topic:Kraje i narodowości — Europa': 'kraje', 'topic:Kraje i narodowości — świat i kontynenty': 'swiat',
  'topic:Pochodzenie i miejsce zamieszkania': 'pochodzenie', 'topic:Reagowanie w rozmowie': 'reagowanie',
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

// Ikony słówek (assets/words/, z Desktop/ikony_do_aplikacji/kraje) — kraj i narodowość zwykle mają tę samą;
// Wielka Brytania (autobus) ≠ Anglia (Big Ben), Szwecja ≠ szwedzki (drakkar), żeby się nie myliły.
const WORD_IMG = {
  'australia': 'australia',
  'australian': 'australia',
  'canada': 'kanada',
  'canadian': 'kanada',
  'china': 'chiny',
  'chinese': 'chiny',
  'india': 'indie',
  'indian': 'indie',
  'russia': 'rosja',
  'russian': 'rosja',
  'south africa': 'rpa',
  'south african': 'rpa',
  'brazil': 'brazylia',
  'brazilian': 'brazylia',
  'argentina': 'argentyna',
  'argentinian': 'argentyna',
  'mexico': 'meksyk',
  'mexican': 'meksyk',
  'egypt': 'egipt',
  'egyptian': 'egipt',
  'saudi arabia': 'arabia_saudyjska',
  'saudi': 'arabia_saudyjska',
  'turkey': 'turcja',
  'turkish': 'turcja',
  'germany': 'niemcy',
  'german': 'niemcy',
  'france': 'francja',
  'french': 'francja',
  'england': 'anglia',
  'english': 'anglia',
  'italy': 'wlochy',
  'italian': 'wlochy',
  'spain': 'hiszpania',
  'spanish': 'hiszpania',
  'poland': 'polska',
  'polish': 'polska',
  'sweden': 'szwecja',
  'the netherlands': 'holandia',
  'dutch': 'holandia',
  'belgium': 'belgia',
  'belgian': 'belgia',
  'denmark': 'dania',
  'danish': 'dania',
  'norway': 'norwegia',
  'norwegian': 'norwegia',
  'finland': 'finlandia',
  'finnish': 'finlandia',
  'the czech republic': 'czechy',
  'czech': 'czechy',
  'greece': 'grecja',
  'greek': 'grecja',
  'ireland': 'irlandia',
  'irish': 'irlandia',
  'japan': 'japonia',
  'japanese': 'japonia',
  'portugal': 'portugalia',
  'portuguese': 'portugalia',
  'scotland': 'szkocja',
  'scottish': 'szkocja',
  'ukraine': 'ukraina',
  'ukrainian': 'ukraina',
  'the usa': 'usa',
  'american': 'usa',
  'the uk': 'wielka_brytania_autobus',
  'british': 'wielka_brytania_autobus',
  'swedish': 'szwecja_drakkar',
  'switzerland': 'szwajcaria',
  'swiss': 'szwajcaria',
  'austria': 'austria',
  'austrian': 'austria',
  'south korea': 'korea_poludniowa',
  'korean': 'korea_poludniowa',
  'wales': 'walia',
  'welsh': 'walia',
  'hungary': 'wegry',
  'hungarian': 'wegry',
  'croatia': 'chorwacja',
  'croatian': 'chorwacja',
  'iceland': 'islandia',
  'icelandic': 'islandia',
  'slovakia': 'slowacja',
  'slovak': 'slowacja',
  'slovenia': 'slowenia',
  'slovenian': 'slowenia',
  'romania': 'rumunia',
  'romanian': 'rumunia',
  'bulgaria': 'bulgaria',
  'bulgarian': 'bulgaria',
  'serbia': 'serbia',
  'serbian': 'serbia',
  'lithuania': 'litwa',
  'lithuanian': 'litwa',
  'latvia': 'lotwa',
  'latvian': 'lotwa',
  'estonia': 'estonia',
  'estonian': 'estonia',
  'belarus': 'bialorus',
  'belarusian': 'bialorus',
  'thailand': 'tajlandia',
  'thai': 'tajlandia',
  'the uae': 'zea_dubaj',
  'emirati': 'zea_dubaj',
  'vietnam': 'wietnam',
  'vietnamese': 'wietnam',
  'indonesia': 'indonezja',
  'indonesian': 'indonezja',
  'the philippines': 'filipiny',
  'filipino': 'filipiny',
  'cuba': 'kuba',
  'cuban': 'kuba',
  'chile': 'chile',
  'chilean': 'chile',
  'colombia': 'kolumbia',
  'colombian': 'kolumbia',
  'morocco': 'maroko',
  'moroccan': 'maroko',
  'new zealand': 'nowa_zelandia',
  'new zealander': 'nowa_zelandia',
  'israel': 'izrael',
  'israeli': 'izrael',
  'georgia': 'gruzja',
  'georgian': 'gruzja',
  'iran': 'iran',
  'iranian': 'iran',
  'pakistan': 'pakistan',
  'pakistani': 'pakistan',
  'nigeria': 'nigeria',
  'nigerian': 'nigeria',
  'africa': 'afryka',
  'african': 'afryka',
  'asia': 'azja',
  'asian': 'azja',
  'europe': 'europa',
  'european': 'europa',
  'north america': 'ameryka_polnocna',
  'north american': 'ameryka_polnocna',
  'south america': 'ameryka_poludniowa',
  'south american': 'ameryka_poludniowa',
  'continent': 'kontynent',
  'warsaw': 'warszawa',
  'capital': 'stolica',
  'city': 'miasto',
  'town': 'miasteczko',
  'village': 'wies',
  'country': 'kraj',
  'nationality': 'narodowosc',
  // przedstawianie się (Desktop/ikony_do_aplikacji)
  'first name': 'first_name', 'friend': 'friend', 'mr': 'mr', 'mrs': 'mrs', 'ms': 'ms', 'name': 'name', 'surname': 'surname',
  "i'm": 'im', 'you': 'you', "you're": 'youre', 'nice to meet you.': 'nice_to_meet_you', 'nice to meet you too.': 'nice_to_meet_you',
};



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
    cards: d.cards || {}, days: d.days || {}, extra: d.extra || [],
    gems: d.gems || 0, freezes: d.freezes || 0, best: d.best || 0,
    lists: d.lists || [], exams: d.exams || [], path: d.path || [], mistakes: d.mistakes || [], badges: d.badges || {}, lastColl: d.lastColl || null, tasks: d.tasks || {}, lastBackup: d.lastBackup || 0, backupSnooze: d.backupSnooze || 0,
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
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('Nie udało się zapisać postępów'); }
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
// filtr „Słówka / Zwroty” z listy słówek (działa tylko, gdy zestaw ma jedno i drugie)
const byKind = (ws) => { const n = ws.filter(isPhrase).length; const k = n > 0 && n < ws.length ? wordsFilter.kind : ''; return k ? ws.filter((w) => (k === 'phrases') === isPhrase(w)) : ws; };
// czy słowo należy do planu dnia (ustawienie „Co ćwiczyć”)
const inPlan = (w) => (db.settings.content === 'words' ? !isPhrase(w) : db.settings.content === 'phrases' ? isPhrase(w) : true);
const packOf = (w) => (PACKS.find((p) => p.key !== 'all' && p.test(w, w.pos || '')) || PACKS[0]).key;

function topicsList() {
  const list = [];
  for (const w of words) if (!list.find((x) => x.name === w.topic)) list.push({ name: w.topic, icon: w.icon });
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
    if (t) c = { name: t.name, ws: words.filter((w) => w.topic === key), bg: TINTS[topics.indexOf(t) % TINTS.length], art: topicArt(t.name) };
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
  } else if (kind === 'auto' && key === 'mistakes') {
    c = { name: 'Błędy z testów', ws: db.mistakes.map((id) => byId.get(id)).filter(Boolean), bg: '#FFE6DF', art: ART.cardStack, desc: 'znikają po poprawnej odpowiedzi' };
  }
  if (!c) return null;
  c.ref = ref;
  const art = COLL_ART[ref] || (kind === 'topic' ? 'swiat' : kind === 'list' ? 'listy' : null); // nowy temat → globus
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
    for (const c of Object.values(db.cards)) if (i === 0 ? c.due < to : c.due >= from && c.due < to) n++;
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
          <button type="button" class="ask-btn ghost" value="cancel">${esc(cancel)}</button>
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
if (canSpeak) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); if (['profile', 'listen', 'home'].includes(view)) render(); }; }
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

function speak(text, rate) {
  if (!canSpeak || !text) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance(text, 'en', rate));
}

// Wersja z oczekiwaniem na koniec wypowiedzi (dla trybu słuchania).
function say(text, lang = 'en', rate) {
  if (!canSpeak || !text) return wait(0);
  if (lang === 'pl' && !plVoice()) return wait(1400);
  return new Promise((resolve) => {
    let done = false;
    const fin = () => { if (!done) { done = true; clearTimeout(t); resolve(); } };
    const u = utterance(text, lang, rate);
    u.onend = fin;
    u.onerror = fin;
    const t = setTimeout(fin, 2500 + text.length * 130);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

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
  S.cur = { item, w, type, shownAt: Date.now(), answered: false, hints: 0, options: null, chosen: null, result: null, typed: '', earned: 0 };
  if (type.endsWith('2pl') || type === 'pl2en') S.cur.options = buildOptions(w, type === 'pl2en' ? 'en' : 'pl');
  render();
  if (db.settings.autoplay && (type === 'intro' || type === 'en2pl' || SRS.isListening(type))) setTimeout(() => speak(w.en), 250);
  const input = $('#typed');
  if (input) input.focus();
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
  const ms = Math.max(300, now - cur.shownAt - (SRS.isListening(type) ? 1200 : 0));
  const g = SRS.grade(correct, ms, type, w.en.length, struggled || cur.hints > 0);
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
  if (db.settings.autoplay && (type === 'pl2en' || SRS.isTyping(type) || !correct)) speak(w.en);
  if (correct && !struggled) S.timer = setTimeout(advance, 1300);
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
  if (canSpeak) speechSynthesis.cancel();
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
  if (canSpeak) speechSynthesis.cancel();
}

// ---------- widoki ----------

function render() {
  const views = { home: viewHome, listen: viewListen, words: viewWords, profile: viewProfile, session: viewSession, summary: viewSummary, player: viewPlayer, 'plan-settings': viewPlanSettings, packs: viewPacks, word: viewWord, pick: viewPick, tasks: viewTasks, 'task-settings': viewTaskSettings };
  $('#app').innerHTML = views[view]();
  const navHidden = view === 'session' || view === 'player' || view === 'pick' || view === 'word' || view === 'tasks' || (view === 'summary' && !!S?.chestOpened);
  $('#nav').hidden = navHidden;
  document.body.classList.toggle('no-nav', navHidden);
  const tab = view === 'words' && wordsFilter.coll && collFrom !== 'words' ? 'home' : view === 'summary' || view === 'plan-settings' || view === 'task-settings' || view === 'packs' ? 'home' : view;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === tab));

  const deck = $('#dailyDeck');
  if (deck) {
    deck.addEventListener('scroll', () => {
      const idx = Math.round(deck.scrollLeft / (deck.clientWidth || 1));
      document.querySelectorAll('#carouselDots .dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    }, { passive: true });
  }
}

const gemIcon = (cls = '') => `<span class="gem-i ${cls}">${ICON.gem}</span>`;
// Grafiki wycięte z projektu (tools/cutter.html → assets/)
const IMG = (name, cls = '', alt = '') => `<img class="${cls}" src="assets/${name}" alt="${alt}" draggable="false">`;

function statusBar() {
  const c = counts();
  const hot = counted(dayKey());
  return `
  <header class="statusbar">
    <button class="pill-stat stat-known" data-act="known" aria-label="Umiesz ${wordsLabel(c.known)}">${IMG('stat-check.png', 'stat-img')}<b>${c.known}</b></button>
    <button class="pill-stat stat-gems" data-view="profile" aria-label="${db.gems} diamentów">${IMG('stat-gem.png', 'stat-img')}<b>${db.gems}</b></button>
    <button class="pill-stat flame ${hot ? 'hot' : ''}" data-view="profile" aria-label="Seria: ${daysLabel(streak())}" title="${hot ? 'Dzisiejszy dzień zaliczony' : `Zrób ${STREAK_MIN} odpowiedzi, żeby przedłużyć serię`}">${IMG('stat-flame.png', 'stat-img')}<b>${streak()}</b></button>
    <button class="flag" data-view="profile" aria-label="Profil — uczysz się angielskiego">${ICON.uk}</button>
  </header>`;
}

function sectionHead(title, action = '') {
  return `<div class="section-head"><h2 class="section-title">${title}</h2>${action}</div>`;
}

function bar(value, color, cls = '') {
  return `<span class="bar ${cls}"><i style="width:${pct(value)};${color ? `background:${color}` : ''}"></i></span>`;
}

function planCard() {
  const c = counts();
  const plan = dayPlan();
  const ready = c.dueLeft + c.newLeft;

  return `
  <div class="daily-carousel">
    <div class="daily-deck" id="dailyDeck">
      <!-- Karta 1: Plan dnia (ilustracja + zadania, jak w projekcie design/plan-mockup.jpg) -->
      <section class="plan-hero daily-slide">
        <div class="ph-head">
          <h2 class="ph-title">Plan dnia${db.settings.content !== 'all' ? `<button class="ph-mode" data-view="plan-settings" title="Zmień w ustawieniach planu">${db.settings.content === 'phrases' ? 'Tylko zwroty' : 'Tylko słówka'}</button>` : ''}</h2>
          <button class="ph-settings" data-view="plan-settings" aria-label="Ustawienia planu dnia" title="Ustawienia planu">${ICON.sliders}</button>
        </div>
        <div class="ph-grid">
          <div class="ph-art ${plan.complete ? 'launched' : ''}">${IMG('plan-rocket.webp')}</div>
          <div class="ph-tasks">
            ${plan.tasks.map((t, i) => {
              const icon = ['task-refresh.png', 'task-star.png', 'task-clock.png'][i];
              const tint = ['52, 192, 106', '255, 194, 26', '59, 142, 240'][i];
              const ink = ['#1fa45a', '#e09a00', '#2f7fe6'][i];
              const [have, need] = t.text.split('/');
              return `
              <button class="ph-task ${t.done ? 'done' : t.value > 0 ? 'going' : ''}" data-act="${ready ? 'start' : 'extra'}" style="--fill:${pct(t.value)};--tint:${tint};--ink:${ink};--i:${i}">
                ${IMG(icon, 'ph-icon')}
                <span class="ph-body">
                  <span class="ph-label">${esc(t.label)}</span>
                  <span class="ph-bar"><i></i></span>
                </span>
                ${t.done ? IMG('done-check.png', 'ph-done', 'Zrobione') : `<span class="ph-num"><b>${have}</b>/${need}</span>`}
              </button>`;
            }).join('')}
            ${(() => {
              // pasek skrzyni = postęp całego planu
              const total = plan.claimed ? 1 : plan.tasks.reduce((s, t) => s + Math.min(1, t.value), 0) / plan.tasks.length;
              return `
            <button class="ph-task reward ${plan.claimed ? 'done' : total > 0 ? 'going' : ''}" data-act="${plan.claimed ? 'chest-info' : ready ? 'start' : 'extra'}" style="--fill:${pct(total)};--tint:255, 122, 0;--ink:#f07800;--i:3">
              ${IMG('task-chest.png', 'ph-icon')}
              <span class="ph-body">
                <span class="ph-label">${plan.claimed ? 'Skrzynia otwarta — wracaj jutro!' : 'Ukończ plan i otwórz skrzynię'}</span>
                <span class="ph-bar"><i></i></span>
              </span>
              <span class="ph-gems">${plan.claimed ? '✓' : `+${CHEST_BONUS}`}${IMG('gem-small.png', 'ph-gem')}</span>
            </button>`;
            })()}
            ${c.seen || ready ? `<button class="ph-cta" data-act="${ready ? 'start' : 'extra'}"><span>${ready ? 'Ucz się' : 'Powtórz więcej'}</span></button>` : ''}
          </div>
        </div>
      </section>

      <!-- Karta 2: zadania z bieżącej lekcji (generator js/exercises.js) -->
      ${lessonTasksCard()}
    </div>
    <div class="carousel-dots" id="carouselDots">
      <button class="dot active" data-slide="0" aria-label="Plan dnia"></button>
      <button class="dot" data-slide="1" aria-label="Zadania z lekcji"></button>
    </div>
  </div>`;
}

function packCard(c) {
  const textColor = c.textColor || (c.bg === '#FFD84D' ? '#1E1B33' : '#FFFFFF');
  return `
    <button class="pack" style="background:${c.bg};color:${textColor}" data-coll="${esc(c.ref)}">
      <span class="pack-art">${c.img ? IMG(c.img, 'pack-img') : c.art}</span>
      <b style="color:${textColor}">${esc(c.name)}</b>
    </button>`;
}

function examHeader() {
  const s = db.settings;
  const c = counts();
  const readiness = words.length ? c.known / words.length : 0;
  let left = null;
  if (s.examDate) {
    const [y, m, d] = s.examDate.split('-').map(Number);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    left = Math.round((new Date(y, m - 1, d) - start) / DAY);
  }
  return `
  <section class="card exam-head">
    <div class="eh-row">
      <span class="eh-icon">${ART.gradCap}</span>
      <div class="eh-text">
        <span class="overline">Przygotuj się do egzaminu</span>
        <b>${esc(s.examName || 'Mój egzamin')}</b>
        <span class="muted small">${s.examDate ? formatDate(s.examDate) : 'ustaw datę w Profilu'}</span>
      </div>
      ${left !== null ? `<div class="countdown"><b>${left > 0 ? left : 0}</b><span>${left > 0 ? plural(left, 'dzień', 'dni', 'dni') : left === 0 ? 'dziś!' : 'minął'}</span></div>` : ''}
    </div>
    <div class="eh-bar"><span class="muted small">Gotowość</span>${bar(readiness, '#22C55E', 'thick')}<b>${pct(readiness)}</b></div>
  </section>`;
}

function examPath() {
  const done = db.path;
  const k = done.length;
  const shown = done.slice(-3);
  const firstDone = 3 - shown.length;
  const startSlot = k < 3 ? firstDone - 1 : -1;
  const firstVisible = Math.max(0, startSlot);
  const at = ([x, y]) => `left:${(x / 390) * 100}%;top:${(y / 470) * 100}%`;

  let segs = '';
  for (let s = firstVisible; s < PATH_SEGS.length; s++) {
    segs += `<path d="${PATH_SEGS[s]}" fill="none" stroke="${s < 3 ? SEG_COLORS[s] : '#DCD8EA'}" stroke-width="12" stroke-linecap="round"/>`;
  }
  const dots = PATH_SEGS.slice(firstVisible).join(' ');

  let nodes = '';
  PATH_PTS.forEach((pt, i) => {
    if (i < startSlot) return;
    if (i === startSlot) {
      nodes += `<span class="pnode start" style="${at(pt)}" role="img" aria-label="Start">${ICON.flag}</span>`;
      if (i < 3) nodes += `<span class="pchip" style="${at(CHIP_POS[i])}">Start</span>`;
      return;
    }
    if (i < 3) {
      const idx = k - shown.length + (i - firstDone);
      const r = shown[i - firstDone];
      nodes += `<button class="pnode done" style="${at(pt)}" data-act="path-done" data-msg="${esc(`${pathName(idx)}: zaliczony (${r.pct}%)`)}" aria-label="${esc(pathName(idx))} — zaliczony, ${r.pct}%">${ICON.tick}</button>`;
      nodes += `<span class="pchip ok" style="${at(CHIP_POS[i])}">${r.pct}%</span>`;
      return;
    }
    if (i === 3) {
      const ex = examDef(pathKind(k));
      nodes += `<span class="pglow" style="${at(pt)}"></span>`;
      nodes += `<button class="pnode current" style="${at(pt)}" data-exam="${ex.key}" aria-label="${esc(pathName(k))} — zacznij">${ICON.star}</button>`;
      nodes += `<span class="plabel below" style="${at(pt)}"><b>${esc(pathName(k))}</b><span>${Math.min(ex.n, words.length)} pytań · +${EXAM_BONUS} ${ICON.gem}</span></span>`;
      return;
    }
    nodes += `<button class="pnode locked" style="${at(pt)}" data-act="path-done" data-msg="${esc(`Najpierw zalicz: ${pathName(k)}`)}" aria-label="${esc(pathName(k + i - 3))} — zablokowany">${ICON.lock}</button>`;
  });

  const mock = [...db.exams].reverse().find((e) => e.kind === 'mock');
  nodes += `<button class="pnode trophy" style="${at(PATH_TROPHY)}" data-exam="mock" aria-label="Egzamin próbny — zacznij">${ART.trophy}</button>`;
  nodes += `<span class="plabel left" style="${at(PATH_TROPHY)}"><b>Egzamin próbny</b><span>${mock ? `ostatnio ${mock.pct}%` : `${Math.min(40, words.length)} pytań`}</span></span>`;

  const stickers = [['globe', 318, 32], ['cup', 48, 136], ['suitcase', 330, 306], ['book', 52, 424]]
    .map(([n, x, y]) => `<span class="sticker" style="${at([x, y])}">${ART[n]}</span>`).join('');

  return `
  <div class="path">
    <svg class="path-line" viewBox="0 0 390 470" preserveAspectRatio="none" aria-hidden="true">
      ${segs}
      <path d="${dots}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 11"/>
    </svg>
    ${stickers}
    ${nodes}
  </div>`;
}

function mistakesCard() {
  const n = db.mistakes.filter((id) => byId.has(id)).length;
  if (!n) return '';
  return `
  <section class="card float-card">
    <span class="fc-icon">${ICON.refresh}</span>
    <div class="fc-text"><b>Powtórka błędów</b><span class="muted small">${wordsLabel(n)} z testów</span></div>
    <button class="btn pill small-pill" data-act="drill-mistakes">Zacznij</button>
  </section>`;
}

// Przypomnienie o kopii: postęp żyje tylko w tej przeglądarce — raz w tygodniu prosimy o eksport.
function backupNag() {
  const now = Date.now();
  if (counts().seen < 10 || now - db.lastBackup < 7 * DAY || now < db.backupSnooze) return '';
  const days = db.lastBackup ? Math.floor((now - db.lastBackup) / DAY) : 0;
  return `
  <section class="backup-nag">
    <span class="bn-icon" aria-hidden="true">💾</span>
    <div class="bn-text"><b>Zrób kopię postępów</b><span>${days ? `Ostatnia ${days} dni temu — ` : ''}postęp jest tylko w tej przeglądarce.</span></div>
    <button class="bn-go" data-act="export">Zapisz</button>
    <button class="bn-close" data-act="backup-later" aria-label="Przypomnij za 3 dni" title="Przypomnij za 3 dni">${ICON.close}</button>
  </section>`;
}

function viewHome() {
  const packs = PACKS.map((p) => collection('pack:' + p.key)).filter((x) => x && x.total >= MIN_PACK);
  const lists = [...['auto:last', 'auto:hard'].map(collection).filter((x) => x && x.total), ...db.lists.map((l) => collection('list:' + l.id))];
  const topics = topicsList().map((tp) => collection('topic:' + tp.name));
  const seen = counts().seen;

  return `
  <section class="hero">
    <div class="hero-inner">
      ${statusBar()}
      ${planCard()}
    </div>
  </section>
  ${backupNag()}

  ${sectionHead('Pakiety słówek', '<button class="link" data-act="all-words">Wszystkie ›</button>')}
  <div class="packs">${packs.map(packCard).join('')}</div>

  ${sectionHead('Przygotuj się do egzaminu')}
  ${examHeader()}
  ${examPath()}
  ${mistakesCard()}


  <section class="lists-card" style="margin-top: 24px">
    <div class="lc-text"><h3>Moje listy</h3><span>Twoje zestawy do powtórek</span></div>
    <span class="lc-art">${ART.cardStack}</span>
    <div class="lc-chips">
      ${lists.map((l) => `<button class="lc-chip" data-coll="${esc(l.ref)}">${esc(l.name)} <b>${l.total}</b></button>`).join('')}
      <button class="lc-chip new" data-act="new-list">+ Nowa</button>
    </div>
  </section>

  ${sectionHead('Audio', '<button class="link" data-view="listen">Więcej ›</button>')}
  <div class="audio-row">
    <section class="audio-card yellow">
      <span class="ac-top">${ICON.play}</span>
      <h3>Słuchaj w drodze</h3>
      ${ART.listenGirl}
      <button class="white-pill" data-act="player-quick" ${canSpeak ? '' : 'disabled'}>Odtwórz</button>
    </section>
    <section class="audio-card blue">
      <span class="ac-top">${ICON.listen}</span>
      <h3>Trening słuchu</h3>
      ${ART.ear}
      <button class="white-pill" data-act="listen-quiz" ${seen >= 4 && canSpeak ? '' : 'disabled'}>${seen >= 4 ? 'Ćwicz słuch' : 'Poznaj 4 słowa'}</button>
    </section>
  </div>

  ${sectionHead('Tematy')}
  <div class="topic-grid">
    ${topics.map((tp) => `
      <button class="topic-tile" data-coll="${esc(tp.ref)}">
        ${tp.img ? IMG(tp.img, 'tt-icon tt-img') : `<span class="tt-icon" style="background:${tp.bg}">${tp.art}</span>`}
        <span class="tt-main">
          <b>${esc(tp.name)}</b>
          <span class="muted small">${tp.known} z ${tp.total}</span>
          ${bar(tp.known / tp.total, '#22C55E')}
        </span>
      </button>`).join('')}
  </div>`;
}

// ---------- ekran „Pakiety słówek” (Wszystkie / Uczę się / Wyuczone) ----------

let packsTab = 'all';
const PACK_TABS = [['all', 'Wszystkie'], ['learning', 'Uczę się'], ['known', 'Wyuczone']];

// Etap zestawu: wyuczony (wszystko umiesz), w trakcie (coś już poznane) albo nowy.
function collStage(c) {
  if (c.total && c.known === c.total) return 'known';
  return c.ws.some((w) => db.cards[w.id]) ? 'learning' : 'new';
}

function pkCard(c) {
  return `
    <button class="pk-card" data-coll="${esc(c.ref)}" style="--tint:${c.tint};--pill:${c.pill}">
      <span class="pk-text">
        <b class="pk-name">${esc(c.name)} <span class="pk-chev">›</span></b>
        <span class="pk-count">${itemsLabel(c.ws)}</span>
        <span class="pk-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>${c.known}/${c.total}</span>
      </span>
      ${c.img ? IMG(c.img, 'pk-img') : `<span class="pk-img svg">${c.art}</span>`}
    </button>`;
}

function viewPacks() {
  const show = (c) => c && c.total && (packsTab === 'all' || collStage(c) === packsTab);
  const groups = [
    ['Pakiety', PACKS.filter((p) => p.key !== 'all').map((p) => collection('pack:' + p.key)).filter((c) => show(c) && c.total >= MIN_PACK)],
    ['Tematy', topicsList().map((t) => collection('topic:' + t.name)).filter(show)],
  ].filter(([, cs]) => cs.length);
  const empty = { learning: 'Jeszcze nic nie zacząłeś — wybierz pakiet w zakładce Wszystkie.', known: 'Jeszcze nic nie wyuczone — ucz się dalej! 💪' };

  return `
    <header class="pk-top">
      <div class="pk-bar">
        <button class="pk-back" data-view="home" aria-label="Wróć">${ICON.back}</button>
        <h2>Pakiety słówek</h2>
        <span class="pk-spacer"></span>
      </div>
      <nav class="pk-tabs">
        ${PACK_TABS.map(([k, label]) => `<button class="${packsTab === k ? 'on' : ''}" data-ptab="${k}">${label}</button>`).join('')}
      </nav>
    </header>
    ${packsTab !== 'known' ? resumeCard() : ''}
    ${groups.length ? groups.map(([title, cs]) => `
      <h3 class="pk-group">${title}</h3>
      <div class="pk-list">${cs.map(pkCard).join('')}</div>`).join('') : `<p class="pk-empty">${empty[packsTab] || ''}</p>`}`;
}

// ---------- ustawienia planu dnia ----------

const PLAN_KEYS = ['content', 'newOrder', 'warmup', 'reviewsFirst', 'listening', 'typing', 'newPerDay', 'reviewCap', 'minutes'];

const PLAN_ORDERS = [
  ['lesson', 'Jak w lekcjach', 'W kolejności z Twoich notatek — temat po temacie.'],
  ['recent', 'Najnowsze', 'Najpierw słowa z ostatniej lekcji — świeży materiał od razu trafia do nauki.'],
  ['random', 'Losowo', 'Każda sesja przynosi inną mieszankę słów.'],
];

const PLAN_CONTENT = [
  ['all', 'Wszystko', (n) => `Słówka i zwroty razem — ${wordsLabel(n)} w planie.`],
  ['words', 'Słówka', (n) => `Same pojedyncze słowa (rzeczowniki, przymiotniki…) bez zwrotów — ${wordsLabel(n)}.`],
  ['phrases', 'Zwroty', (n) => `Same zwroty i wyrażenia, np. „Nice to meet you” — ${n} ${plural(n, 'zwrot', 'zwroty', 'zwrotów')}.`],
];

const PLAN_TOGGLES = [
  { key: 'warmup', icon: 'warm', tone: ['#FFE8D2', '#A5460A'], title: 'Rozgrzewka', desc: 'Sesja zaczyna się od 2 słów, które już znasz — łatwy start i szybkie diamenty.' },
  { key: 'reviewsFirst', icon: 'refresh', tone: ['#D4F3EC', '#0F7466'], title: 'Najpierw powtórki', desc: 'Zaległe powtórki przed nowymi słowami. Wyłączone: nowe słowa przeplatane z powtórkami.' },
  { key: 'listening', icon: 'listen', tone: ['#DDEFFF', '#1F5FA8'], title: 'Ćwiczenia ze słuchu', desc: 'Rozpoznawanie ze słuchu i dyktanda. Wyłącz, gdy nie możesz używać dźwięku — np. w autobusie.' },
  { key: 'typing', icon: 'keyboard', tone: ['#FFE6DF', '#B4260F'], title: 'Ćwiczenia z pisania', desc: 'Wpisywanie słów z klawiatury. Wyłącz na telefonie — zostaną wybory z 4 odpowiedzi.' },
];

const PLAN_STEPS = {
  newPerDay: {
    title: 'Nowe słowa dziennie', icon: 'sparkle', tone: ['#E7E0FF', '#5A3FE0'],
    options: [[5, '5'], [10, '10'], [15, '15'], [20, '20']],
    hints: { 5: 'Spokojne tempo — dobre na start.', 10: 'Normalne tempo — zalecane.', 15: 'Intensywnie — więcej powtórek w kolejnych dniach.', 20: 'Ekspresowo — licz się z dłuższymi sesjami.' },
  },
  reviewCap: {
    title: 'Limit powtórek dziennie', icon: 'refresh', tone: ['#D4F3EC', '#0F7466'],
    options: [[20, '20'], [50, '50'], [100, '100'], [0, '∞']],
    hints: { 20: 'Krótkie sesje — nadmiar powtórek przejdzie na kolejne dni.', 50: 'Rozsądny limit na zabiegane dni.', 100: 'Wysoki limit — prawie wszystko na czas.', 0: 'Bez limitu — algorytm powtarza każde słowo dokładnie na czas (zalecane).' },
  },
  minutes: {
    title: 'Dzienny cel i długość sesji', icon: 'clock', tone: ['#FFE8D2', '#A5460A'],
    options: [[2, '2 min'], [5, '5 min'], [10, '10 min'], [20, '20 min']],
    hints: { 2: 'Minimum, żeby nie wypaść z rytmu.', 5: 'Krótko, ale codziennie — najlepszy nawyk.', 10: 'Solidna porcja nauki.', 20: 'Pełny trening.' },
  },
};

function levelBars(level, n) {
  let out = '';
  for (let i = 1; i <= n; i++) out += `<i class="${i <= level ? 'on' : ''}" style="height:${3 + i * 3}px"></i>`;
  return `<span class="lvl-bars" aria-hidden="true">${out}</span>`;
}

function setIcon(icon, [bg, fg]) {
  return `<span class="set-icon" style="background:${bg};color:${fg}">${ICON[icon]}</span>`;
}

function stepper(key) {
  const def = PLAN_STEPS[key];
  const cur = key === 'minutes' ? goalMin() : db.settings[key];
  const n = def.options.length;
  const idx = def.options.findIndex(([v]) => v === cur);
  return `
  <section class="card set-card">
    <div class="set-head">${setIcon(def.icon, def.tone)}<b>${def.title}</b></div>
    <div class="stepper" role="radiogroup" aria-label="${def.title}" style="--n:${n}">
      <span class="st-track"><i style="width:${idx < 0 ? 0 : (idx / (n - 1)) * 100}%"></i></span>
      ${def.options.map(([v, label], i) => `
        <button class="st-stop ${i === idx ? 'on' : ''} ${idx >= 0 && i <= idx ? 'past' : ''}" role="radio" aria-checked="${i === idx}" data-setval="${key}:${v}">
          <span class="st-dot"></span>
          <span class="st-label">${levelBars(i + 1, n)}${label}</span>
        </button>`).join('')}
    </div>
    <p class="set-hint">${def.hints[cur] || ''}</p>
  </section>`;
}

function planPreview() {
  const s = db.settings;
  const c = counts();
  const unseen = c.planUnseen;
  const newN = Math.min(s.newPerDay, unseen);
  const revN = c.dueLeft;
  const estMin = Math.max(1, Math.round(newN * 0.6 + revN * 0.15)); // ~36 s na nowe słowo, ~9 s na powtórkę
  let forecastLine = s.content === 'all' ? `Znasz już wszystkie słówka z lekcji — nowe pojawią się po kolejnej lekcji.` : `Wszystkie wybrane już poznane — zmień „Co ćwiczyć” albo poczekaj na kolejną lekcję.`;
  let examLine = '';
  if (unseen > 0 && s.newPerDay > 0) {
    const days = Math.ceil(unseen / s.newPerDay);
    const end = new Date();
    end.setDate(end.getDate() + days - 1);
    forecastLine = `${s.content === 'all' ? 'Obecne' : 'Wybrane'} ${s.content === 'phrases' ? `${c.planTotal} ${plural(c.planTotal, 'zwrot', 'zwroty', 'zwrotów')}` : wordsLabel(c.planTotal)} poznasz do <b>${formatDate(dayKey(end), false)}</b>`;
    if (s.examDate) {
      const [y, m, d] = s.examDate.split('-').map(Number);
      const ok = end <= new Date(y, m - 1, d);
      examLine = `<p class="pp-exam ${ok ? 'ok' : 'warn'}">${ok ? `✓ Zdążysz spokojnie przed egzaminem (${formatDate(s.examDate, false)})` : `Przy tym tempie nie zdążysz przed egzaminem — zwiększ liczbę nowych słów`}</p>`;
    }
  } else if (unseen > 0) {
    forecastLine = 'Nowe słowa są wyłączone — ustaw ich liczbę niżej.';
  }
  return `
  <section class="plan-preview">
    <span class="overline light">Twój plan na dziś</span>
    <div class="pp-stats">
      <div><b>${newN}</b><span>${plural(newN, 'nowe słowo', 'nowe słowa', 'nowych słów')}</span></div>
      <div><b>${revN}</b><span>${plural(revN, 'powtórka', 'powtórki', 'powtórek')}</span></div>
      <div><b>~${estMin}</b><span>min nauki</span></div>
    </div>
    <p class="pp-forecast">${ICON.target}<span>${forecastLine}</span></p>
    ${examLine}
  </section>`;
}

function viewPlanSettings() {
  const s = db.settings;
  const order = PLAN_ORDERS.find(([v]) => v === s.newOrder) || PLAN_ORDERS[0];
  const content = PLAN_CONTENT.find(([v]) => v === s.content) || PLAN_CONTENT[0];
  return `
  <header class="page-head">
    <button class="icon-round" data-view="home" aria-label="Wróć">${ICON.back}</button>
    <h1>Ustawienia planu</h1>
    <span class="page-head-spacer"></span>
  </header>

  ${planPreview()}

  <h2 class="section-title">Dobór słów</h2>
  <section class="card set-card">
    <div class="set-head">${setIcon('words', ['#E7E0FF', '#5A3FE0'])}<b>Co ćwiczyć</b></div>
    <div class="segmented" role="radiogroup" aria-label="Co ćwiczyć">
      ${PLAN_CONTENT.map(([v, label]) => `<button class="seg ${content[0] === v ? 'on' : ''}" role="radio" aria-checked="${content[0] === v}" data-setval="content:${v}">${label}</button>`).join('')}
    </div>
    <p class="set-hint">${content[2](counts().planTotal)} Dotyczy nowych słów i powtórek w planie dnia; pakiety, tematy i testy zostają bez zmian.</p>
  </section>

  <section class="card set-card">
    <div class="set-head">${setIcon('order', ['#DDEFFF', '#1F5FA8'])}<b>Kolejność nowych słów</b></div>
    <div class="segmented" role="radiogroup" aria-label="Kolejność nowych słów">
      ${PLAN_ORDERS.map(([v, label]) => `<button class="seg ${order[0] === v ? 'on' : ''}" role="radio" aria-checked="${order[0] === v}" data-setval="newOrder:${v}">${label}</button>`).join('')}
    </div>
    <p class="set-hint">${order[2]}</p>
  </section>

  <section class="card set-list">
    ${PLAN_TOGGLES.map((t) => {
      const on = !!s[t.key];
      return `
      <div class="set-row">
        ${setIcon(t.icon, t.tone)}
        <div class="set-text"><b>${t.title}</b><span>${t.desc}</span></div>
        <button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${t.title}" data-toggle="${t.key}"><span></span></button>
      </div>`;
    }).join('')}
  </section>

  <h2 class="section-title">Tempo</h2>
  ${stepper('newPerDay')}
  ${stepper('reviewCap')}
  ${stepper('minutes')}

  <button class="btn wide ghost-line" data-act="plan-defaults">Przywróć ustawienia domyślne</button>`;
}

function viewListen() {
  const seen = words.filter((w) => db.cards[w.id]).length;
  const topics = topicsList();
  const plMissing = canSpeak && !plVoice();
  return `
  ${statusBar()}
  <h2 class="section-title">Słuchanie</h2>
  ${canSpeak ? '' : '<p class="card bad-text small">Ta przeglądarka nie obsługuje czytania na głos.</p>'}
  <section class="audio-card wide yellow">
    <div class="acw-art">${ART.listenGirl}</div>
    <div class="acw-text">
      <h3>Słuchaj w drodze</h3>
      <p>Aplikacja czyta słowo, jego tłumaczenie i przykład — bez patrzenia w ekran.</p>
    </div>
    <select id="listen-source" aria-label="Co odtwarzać">
      <option value="__seen" ${listenSource === '__seen' ? 'selected' : ''}>Poznane słówka (${seen})</option>
      <option value="__all" ${listenSource === '__all' ? 'selected' : ''}>Wszystkie słówka (${words.length})</option>
      ${topics.map((t) => `<option value="${esc(t.name)}" ${listenSource === t.name ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
    </select>
    <button class="btn pill wide" data-act="player" ${canSpeak ? '' : 'disabled'}>Odtwarzaj</button>
    ${plMissing ? '<p class="small">Brak polskiego głosu w systemie — tłumaczenie pojawi się tylko na ekranie.</p>' : ''}
  </section>
  <section class="audio-card wide blue">
    <div class="acw-art">${ART.ear}</div>
    <div class="acw-text">
      <h3>Trening słuchu</h3>
      <p>Rozpoznawaj poznane słówka ze słuchu i zapisuj, co słyszysz.</p>
    </div>
    <button class="btn pill wide" data-act="listen-quiz" ${seen < 4 || !canSpeak ? 'disabled' : ''}>Zacznij</button>
    ${seen < 4 ? '<p class="small">Najpierw poznaj co najmniej 4 słówka w zakładce Nauka.</p>' : ''}
  </section>`;
}

function viewPlayer() {
  const w = byId.get(P.ids[P.i]);
  return `
  <div class="session-top">
    <button class="icon-btn" data-act="player-close" aria-label="Zamknij">${ICON.close}</button>
    ${bar((P.i + (P.done ? 1 : 0)) / P.ids.length, '', 'thick')}
    <span class="muted small">${P.i + 1}/${P.ids.length}</span>
  </div>
  <section class="card study player">
    <div class="badge">${esc(w.topic)}</div>
    <div class="word-en">${esc(w.en)}</div>
    ${w.pron ? `<div class="pron">${esc(w.pron)}</div>` : ''}
    <div class="reveal ${P.phase ? 'on' : ''}">
      <div class="word-pl">${esc(w.pl)}</div>
      ${w.example ? `<div class="example center"><i>${esc(w.example)}</i></div>` : ''}
    </div>
  </section>
  ${P.done ? '<p class="muted center">Koniec listy</p>' : ''}
  <div class="player-controls">
    <button class="round" data-player="prev" aria-label="Poprzednie">${ICON.prev}</button>
    <button class="round main" data-player="toggle" aria-label="${P.playing ? 'Pauza' : 'Odtwarzaj'}">${P.playing ? ICON.pause : ICON.play}</button>
    <button class="round" data-player="next" aria-label="Następne">${ICON.next}</button>
  </div>`;
}

function wordInfo(w, { full = true } = {}) {
  return `
    <div class="word-en">${esc(w.en)} <button class="icon-btn" data-say="${esc(w.en)}" aria-label="Posłuchaj">🔊</button></div>
    ${w.pron ? `<div class="pron">${esc(w.pron)}</div>` : ''}
    <div class="word-pl">${esc(w.pl)}</div>
    ${full && w.mnemo ? `<div class="mnemo">🧠 ${esc(w.mnemo)}</div>` : ''}
    ${full && w.example ? `<div class="example"><button class="icon-btn" data-say="${esc(w.example)}" aria-label="Posłuchaj zdania">🔊</button> <i>${esc(w.example)}</i></div>` : ''}`;
}

function viewSession() {
  const { w, type, answered, options, chosen, result } = S.cur;
  const exam = S.mode === 'exam';
  const progress = S.budget ? (Date.now() - S.start) / S.budget : S.pos / S.queue.length;
  const top = `
    <div class="session-top">
      <button class="icon-btn" data-act="quit" aria-label="Zakończ">${ICON.close}</button>
      ${bar(progress, '', 'thick')}
      ${exam ? `<span class="muted small">${S.pos + 1}/${S.queue.length}</span>` : `<span class="gem-count">${ICON.gem}<b>${S.gems}</b></span>`}
    </div>
    ${exam ? `<div class="exam-banner">${esc(S.exam.name)} — odpowiedzi poznasz na końcu</div>` : ''}`;

  if (type === 'intro') {
    return `${top}
    <section class="card study">
      <div class="badge">Nowe słowo · ${esc(w.topic)}</div>
      ${wordInfo(w)}
      ${w.pos ? `<div class="muted small">${esc(w.pos)}</div>` : ''}
    </section>
    <button class="btn pill wide" data-act="intro-next">Dalej</button>`;
  }

  const prompts = {
    en2pl: ['Co to znaczy?', `<div class="prompt-en">${esc(w.en)} <button class="icon-btn" data-say="${esc(w.en)}">🔊</button></div>`],
    listen2pl: ['Posłuchaj i wybierz znaczenie', `<button class="listen" data-say="${esc(w.en)}" aria-label="Odtwórz">🔊</button>`],
    pl2en: ['Jak to powiesz po angielsku?', `<div class="prompt-pl">${esc(w.pl)}</div>`],
    type: ['Napisz po angielsku', `<div class="prompt-pl">${esc(w.pl)}</div>`],
    dictation: ['Napisz, co słyszysz', `<button class="listen" data-say="${esc(w.en)}" aria-label="Odtwórz">🔊</button><button class="btn small ghost" data-slow="${esc(w.en)}">🐢 wolniej</button>`],
  };
  const [question, prompt] = prompts[type];

  let body = '';
  if (options) {
    body = `<div class="options">${options.map((o, i) => {
      let cls = '';
      if (answered && exam) cls = i === chosen ? 'picked' : 'dim';
      else if (answered) { if (o.id === w.id) cls = 'ok'; else if (i === chosen) cls = 'bad'; else cls = 'dim'; }
      return `<button class="opt ${cls}" data-opt="${i}" ${answered ? 'disabled' : ''}><kbd>${i + 1}</kbd>${esc(o.text)}</button>`;
    }).join('')}</div>`;
  } else {
    const cls = !answered ? '' : exam ? 'picked' : result === 'ok' ? 'ok' : result === 'typo' ? 'typo' : 'bad';
    body = `
      <form class="type-form" data-form="type">
        <input id="typed" class="${cls}" value="${esc(S.cur.typed)}" ${answered ? 'readonly' : ''} autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="en" placeholder="wpisz odpowiedź…">
        ${answered ? '' : `
        <div class="type-actions">
          ${exam ? '' : '<button type="button" class="btn ghost" data-act="hint">Podpowiedź</button>'}
          <button type="button" class="btn ghost" data-act="dunno">Nie wiem</button>
          <button type="submit" class="btn primary">Sprawdź</button>
        </div>`}
      </form>`;
  }

  let feedback = '';
  if (answered && !exam) {
    const last = S.answers[S.answers.length - 1];
    const msg = !last.correct ? '✗ Nie tym razem' : result === 'typo' ? '≈ Prawie — uważaj na pisownię' : last.g === 3 ? '⚡ Błyskawicznie!' : '✓ Dobrze';
    const kind = !last.correct ? 'bad' : result === 'typo' || last.g === 1 ? 'typo' : 'ok';
    feedback = `
      <section class="feedback ${kind}">
        <div class="fb-title">${msg}${S.cur.earned ? ` <span class="gain">+${S.cur.earned} ${ICON.gem}</span>` : ''}</div>
        ${wordInfo(w, { full: !last.correct || type !== 'en2pl' })}
      </section>
      <button class="btn pill wide" data-act="next">Dalej</button>`;
  }

  return `${top}
    <section class="card study">
      <div class="badge">${question}</div>
      ${prompt}
    </section>
    ${body}
    ${feedback}`;
}

function weekStrip(cls = '') {
  const d = new Date();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const todayK = dayKey();
  let out = '';
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    const k = dayKey(x);
    const state = db.days[k]?.frozen ? 'frozen' : counted(k) ? 'done' : k > todayK ? 'future' : 'miss';
    out += `<div class="wday ${state} ${k === todayK ? 'today' : ''}">
      <span class="wd-icon">${state === 'done' ? ICON.flame : state === 'frozen' ? ICON.ice : ''}</span>
      <span>${WEEKDAYS[x.getDay()]}</span></div>`;
  }
  return `<div class="week ${cls}">${out}</div>`;
}

function streakCard() {
  const st = streak();
  const next = BADGES.find((b) => b.days > st);
  return `
  <section class="card streak-card">
    <div class="sc-row">
      <span class="sc-icon">${ICON.flame}</span>
      <div class="sc-text">
        <b>${daysLabel(st)} serii</b>
        <span class="muted small">${next ? `Jeszcze ${daysLabel(next.days - st)} do odznaki „${next.name}”` : 'Masz wszystkie odznaki serii!'}</span>
      </div>
    </div>
    ${weekStrip()}
  </section>`;
}

function viewCelebration() {
  const a = S.answers;
  const ok = a.filter((x) => x.correct).length;
  return `
  <div class="celebrate">
    <div class="confetti">${ART.confetti}</div>
    <button class="icon-btn round-close" data-act="home" aria-label="Zamknij">${ICON.close}</button>
    <div class="cel-art">${ART.chestOpen}</div>
    <h1 class="cel-title">Plan dnia ukończony!</h1>
    <p class="muted center">Wróć jutro, żeby utrzymać serię.</p>
    <div class="cel-reward">${ICON.gem}<b>+${CHEST_BONUS}</b><span>ze skrzyni</span></div>
    ${streakCard()}
    <div class="cel-stats">
      <div><b>${a.length}</b><span>odpowiedzi</span></div>
      <div><b class="ok-text">${a.length ? Math.round((ok / a.length) * 100) : 0}%</b><span>poprawnych</span></div>
      <div><b class="gem-text">+${S.gems}</b><span>diamentów</span></div>
    </div>
    ${S.badge ? `
    <section class="badge-card">
      ${ART.medal}
      <div><span class="overline gold">Nowa odznaka</span><b>${esc(S.badge.name)} · ${daysLabel(S.badge.days)} serii</b></div>
      <span class="gem-pill">+${S.badge.days * 5} ${ICON.gem}</span>
    </section>` : ''}
    <button class="btn pill wide" data-act="home">Dalej</button>
  </div>`;
}

function viewExamResult() {
  const { ok, total, pct: score } = examScore();
  const passed = score >= EXAM_PASS;
  const wrong = S.answers.filter((a) => !a.correct);
  const history = db.exams.filter((e) => e.kind === S.exam.key).slice(-8);
  return `
    ${statusBar()}
    <section class="card result">
      <div class="score-ring ${passed ? 'pass' : 'fail'}" style="--p:${score}"><span>${score}%</span></div>
      <h3 class="card-title">${passed ? 'Zaliczone!' : 'Jeszcze nie tym razem'}</h3>
      <p class="muted">${esc(S.exam.name)} · ${ok} z ${total} poprawnych · próg ${EXAM_PASS}%</p>
      <div class="cel-stats">
        <div><b>${ok}</b><span>dobrze</span></div>
        <div><b>${total - ok}</b><span>błędów</span></div>
        <div><b class="gem-text">+${S.gems}</b><span>diamentów</span></div>
      </div>
    </section>
    ${S.pathAdvanced ? `<section class="banner unlock">${ICON.star}<div><b>Odblokowano: ${esc(pathName(db.path.length))}</b><span>kolejny krok na ścieżce do egzaminu</span></div></section>` : ''}
    ${history.length > 1 ? `
    <section class="card">
      <h2 class="card-title small">Twoje wyniki</h2>
      <div class="forecast">
        ${history.map((e) => `<div class="fc"><b>${e.pct}</b><div class="fc-bar"><i class="${e.pct >= EXAM_PASS ? 'l5' : 'l2'}" style="height:${Math.max(4, e.pct)}%"></i></div><span>${new Date(e.date).getDate()}.${pad(new Date(e.date).getMonth() + 1)}</span></div>`).join('')}
      </div>
    </section>` : ''}
    ${wrong.length ? `
    <section class="card">
      <h2 class="card-title small">Błędy (${wrong.length})</h2>
      ${wrong.map((x) => {
        const w = byId.get(x.id);
        return `<div class="mistake">
          <div><button class="icon-btn" data-say="${esc(w.en)}">🔊</button><b>${esc(w.en)}</b> — ${esc(w.pl)}</div>
          <div class="muted small">Twoja odpowiedź: <s>${esc(x.given || '(brak)')}</s></div>
        </div>`;
      }).join('')}
    </section>
    <button class="btn pill wide" data-act="retry-wrong">Poćwicz błędy</button>` : ''}
    <button class="btn wide" data-act="home">Wróć</button>`;
}

function viewSummary() {
  if (S.mode === 'exam') return viewExamResult();
  if (S.chestOpened) return viewCelebration();
  const a = S.answers;
  const ok = a.filter((x) => x.correct).length;
  const mins = Math.max(1, Math.round((Date.now() - S.start) / 60000));
  const avg = ok ? (a.filter((x) => x.correct).reduce((s, x) => s + x.ms, 0) / ok / 1000).toFixed(1) : '–';
  const wrong = [...S.wrong].map((id) => byId.get(id)).filter(Boolean);
  const c = counts();
  const left = STREAK_MIN - (db.days[dayKey()]?.n || 0);
  return `
    ${statusBar()}
    <section class="card result">
      <div class="plan-art">${ART.rocketBook}</div>
      <h3 class="card-title">Koniec sesji</h3>
      <p class="muted small">${mins} min · średni czas reakcji ${avg} s</p>
      <div class="cel-stats">
        <div><b>${a.length}</b><span>odpowiedzi</span></div>
        <div><b class="ok-text">${a.length ? Math.round((ok / a.length) * 100) : 0}%</b><span>poprawnych</span></div>
        <div><b class="gem-text">+${S.gems}</b><span>diamentów</span></div>
      </div>
    </section>
    ${S.streakUp ? streakCard() : ''}
    ${!counted(dayKey()) ? `<section class="banner">${ICON.flame}<div><b>Jeszcze ${left} ${plural(left, 'odpowiedź', 'odpowiedzi', 'odpowiedzi')}</b><span>i dzisiejszy dzień zaliczy się do serii</span></div></section>` : ''}
    ${wrong.length ? `
    <section class="card">
      <h2 class="card-title small">Do przećwiczenia</h2>
      ${wrong.map((w) => `<div class="mini-word"><button class="icon-btn" data-say="${esc(w.en)}">🔊</button><b>${esc(w.en)}</b><span class="muted">${esc(w.pl)}</span></div>`).join('')}
    </section>` : ''}
    ${collSummaryButtons() || `
    ${c.dueLeft + c.newLeft ? `<button class="btn pill wide" data-act="start">Jeszcze jedna sesja</button>` : ''}
    <button class="btn wide" data-act="home">Wróć</button>`}`;
}

// Po lekcji z pakietu: ucz się dalej w tym pakiecie albo wróć do jego listy.
function collSummaryButtons() {
  const coll = S.coll && collection(S.coll);
  if (!coll) return '';
  const now = Date.now();
  const more = byKind(coll.ws).some((w) => !db.cards[w.id] || db.cards[w.id].due <= now);
  return `
    ${more ? `<button class="btn pill wide" data-act="coll-next">Ucz się dalej: ${esc(coll.name)}</button>` : ''}
    <button class="btn wide" data-act="coll-return">Wróć do pakietu</button>`;
}

function reopenColl(ref) {
  S = null;
  wordsFilter = { q: '', coll: ref, status: '', kind: wordsFilter.kind || '' };
  view = 'words';
}

function dueLabel(c) {
  if (!c) return 'nowe';
  const diff = c.due - Date.now();
  if (diff <= 0) return 'teraz';
  if (diff < 3600000) return `za ${Math.ceil(diff / 60000)} min`;
  if (diff < DAY) return `za ${Math.round(diff / 3600000)} h`;
  return `za ${Math.round(diff / DAY)} d`;
}

function listTags(w) {
  return `
    <div class="list-tags">
      ${db.lists.map((l) => {
        const on = l.ids.includes(w.id);
        return `<button class="chip ${on ? 'on' : ''}" data-listtoggle="${l.id}" data-word="${esc(w.id)}">${on ? '✓' : '+'} ${esc(l.name)}</button>`;
      }).join('')}
      <button class="chip dashed" data-act="new-list" data-word="${esc(w.id)}">+ nowa lista</button>
    </div>`;
}

// Ikona słówka: obrazek z assets/words albo emoji tematu na pastelowym tle.
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';

function wordIcon(w) {
  const img = WORD_IMG[w.id];
  if (img) return `<img class="wr-img" src="assets/words/${img}.png" alt="" loading="lazy" draggable="false">`;
  const topics = topicsList();
  const i = Math.max(0, topics.findIndex((t) => t.name === w.topic));
  return `<span class="wr-emoji" style="background:${TINTS[i % TINTS.length]}">${esc(w.icon || '💬')}</span>`;
}

function wordRow(w) {
  const c = db.cards[w.id];
  const lvl = c ? Math.max(1, c.level) : 0;
  return `
    <div class="word-row">
      <span class="wr-icon">${wordIcon(w)}</span>
      <span class="wr-main">
        <span class="wr-en"><button class="wr-open" data-wopen="${esc(w.id)}" title="Szczegóły słówka"><b>${esc(w.en)}</b></button><button class="wr-say" data-say="${esc(w.en)}" aria-label="Posłuchaj" title="Posłuchaj">${SPEAKER}</button></span>
        <span class="wr-pl">${esc(w.pl)}</span>
      </span>
      ${isKnown(c) ? `<span class="wr-known" title="Wyuczone">${ICON.check}</span>` : `<span class="wr-lvl dots" title="Poziom: ${LEVEL_NAMES[lvl]}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span>`}
      <span class="wr-more" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>`;
}

function viewWords() {
  const q = Answer.norm(wordsFilter.q);
  const coll = collection(wordsFilter.coll);
  const all = coll ? coll.ws : words;
  // rodzaj: same słówka albo same zwroty (przełącznik pokazujemy, gdy zestaw ma jedno i drugie)
  const nPhrases = all.filter(isPhrase).length;
  const mixed = nPhrases > 0 && nPhrases < all.length;
  const kind = mixed ? wordsFilter.kind || '' : '';
  const base = byKind(all);
  const kinds = [['', 'Wszystko', all.length], ['words', 'Słówka', all.length - nPhrases], ['phrases', 'Zwroty', nPhrases]];
  const list = base.filter((w) =>
    (!wordsFilter.status || wordStatus(w) === wordsFilter.status) &&
    (!q || Answer.norm(w.en).includes(q) || w.pl.toLowerCase().includes(wordsFilter.q.toLowerCase())));
  const statusCount = (s) => base.filter((w) => wordStatus(w) === s).length;
  const chips = [['', 'Wszystkie', base.length], ['known', 'Umiem', statusCount('known')], ['learning', 'Uczę się', statusCount('learning')], ['new', 'Nowe', statusCount('new')]];
  const opt = (ref, label) => `<option value="${esc(ref)}" ${wordsFilter.coll === ref ? 'selected' : ''}>${esc(label)}</option>`;

  const options = `
    ${mixed ? `
    <div class="segmented kind-seg" role="radiogroup" aria-label="Rodzaj">
      ${kinds.map(([k, label, n]) => `<button class="seg ${kind === k ? 'on' : ''}" role="radio" aria-checked="${kind === k}" data-kind="${k}">${label} <span>${n}</span></button>`).join('')}
    </div>` : ''}
    <div class="chips">
      ${chips.map(([k, label, n]) => `<button class="chip ${wordsFilter.status === k ? 'on' : ''}" data-status="${k}">${label} <span>${n}</span></button>`).join('')}
    </div>`;
  const rows = list.length ? list.map(wordRow).join('') : '<p class="muted center empty">Brak słówek w tym widoku</p>';

  // Zakładka Słówka: wszystkie słowa z wyborem zestawu
  if (!coll) {
    return `
    ${statusBar()}
    <h2 class="section-title">Słówka</h2>
    <div class="filters">
      <input type="search" id="q" placeholder="Szukaj…" value="${esc(wordsFilter.q)}">
      <select id="coll" aria-label="Zestaw">
        <option value="">Wszystkie słówka</option>
        <optgroup label="Tematy">${topicsList().map((t) => opt('topic:' + t.name, t.name)).join('')}</optgroup>
        <optgroup label="Pakiety">${PACKS.filter((p) => p.key !== 'all').map((p) => opt('pack:' + p.key, p.name)).join('')}</optgroup>
        <optgroup label="Moje listy">${opt('auto:last', 'Z ostatniej lekcji')}${opt('auto:hard', 'Trudne słowa')}${opt('auto:mistakes', 'Błędy z testów')}${db.lists.map((l) => opt('list:' + l.id, l.name)).join('')}</optgroup>
      </select>
    </div>
    ${options}
    <div class="word-list">${rows}</div>`;
  }

  // Ekran pakietu / tematu / listy (jak w WRD): nagłówek, szukaj, lista z ikonami, „Ucz się” na dole
  const learnN = base.length;
  return `
    <header class="cv-top">
      <div class="cv-bar">
        <button class="pk-back" data-view="${collFrom}" aria-label="Wróć">${ICON.back}</button>
        <div class="cv-title"><h2>${esc(coll.name)}</h2><span>${itemsLabel(coll.ws)}${coll.known ? ` · umiesz ${coll.known}` : ''}</span></div>
        <details class="cv-menu">
          <summary class="pk-back" aria-label="Więcej opcji" title="Więcej opcji"><span class="cv-dots"><i></i><i></i><i></i></span></summary>
          <div class="cv-pop">
            <button data-act="coll-player" ${canSpeak && learnN ? '' : 'disabled'}>${ICON.listen}<span>Słuchaj w drodze</span></button>
            <button data-act="coll-review" ${base.some((w) => db.cards[w.id]) ? '' : 'disabled'}>${ICON.refresh}<span>Powtórz poznane</span></button>
            ${coll.list ? `<button data-act="rename-list">${ICON.words}<span>Zmień nazwę</span></button><button class="danger" data-act="delete-list">${ICON.close}<span>Usuń listę</span></button>` : ''}
          </div>
        </details>
      </div>
      <span class="cv-progress" title="Umiesz ${coll.known} z ${coll.total}"><i style="width:${pct(coll.total ? coll.known / coll.total : 0)}"></i></span>
    </header>
    ${coll.desc ? `<p class="cv-desc">${esc(coll.desc)}</p>` : ''}
    <label class="cv-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
      <input type="search" id="q" placeholder="Szukaj" value="${esc(wordsFilter.q)}">
    </label>
    ${options}
    ${coll.list && !coll.total ? '<p class="card muted small">Lista jest pusta. Rozwiń dowolne słówko w zakładce Słówka i kliknij nazwę tej listy.</p>' : ''}
    <div class="word-list cv-list">${rows}</div>
    <div class="cv-cta">
      <button class="cv-learn" data-act="start-coll" ${learnN ? '' : 'disabled'}><span>Ucz się</span></button>
    </div>`;
}

// ---------- słówko: szczegóły, wybór słów do nauki („Nauka”) i wznawianie ----------

const HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/></svg>';
const POS_NAMES = { 'rz.': 'rzeczownik', 'przym.': 'przymiotnik', 'cz.': 'czasownik', zwrot: 'zwrot', 'zaim.': 'zaimek', 'zaim. + być': 'zaimek + być', 'przyim.': 'przyimek', 'przysł.': 'przysłówek' };
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
    <div class="wd-art">${wordArt(w)}</div>
    <h1 class="wd-en">${esc(w.en)}<button class="wd-say" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button></h1>
    ${w.pron ? `<p class="wd-pron">${esc(w.pron)}</p>` : ''}
  </section>
  <section class="wd-body">
    <div class="wd-pl"><b>${esc(w.pl)}</b><span>${esc(POS_NAMES[w.pos] || w.pos || '')}</span></div>
    <div class="wd-chip-row"><button class="wd-topic" data-coll="topic:${esc(w.topic)}">${esc(w.topic)}</button></div>
    ${w.example ? `<div class="wd-block"><h3>Przykład</h3><p class="wd-example"><button class="wr-say" data-say="${esc(w.example)}" aria-label="Posłuchaj zdania">${SPEAKER}</button><i>${esc(w.example)}</i></p></div>` : ''}
    ${w.mnemo ? `<div class="wd-block"><h3>Skojarzenie</h3><p>🧠 ${esc(w.mnemo)}</p></div>` : ''}
    <div class="wd-block">
      <h3>Twój postęp</h3>
      <div class="wd-progress">
        <span class="dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span>
        <b>${LEVEL_NAMES[lvl]}</b>
        <span>${c ? `powtórka ${dueLabel(c)} · powtórzeń ${c.reps} · pomyłek ${c.lapses}` : 'jeszcze nie ćwiczone'}</span>
      </div>
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

// „Ucz się” w pakiecie: najpierw wybierasz nowe słowa (Ucz się / Później / Wiem), potem rusza lekcja.
function startPick(ref) {
  const coll = collection(ref);
  if (!coll) return;
  db.lastColl = ref;
  save();
  const ws = byKind(coll.ws);
  const ids = ws.filter((w) => !db.cards[w.id]).map((w) => w.id);
  if (!ids.length) return startSession({ ids: ws.map((w) => w.id), coll: ref }); // wszystko poznane — powtórka pakietu
  PK = { ref, ids, i: 0, picked: [], known: 0, back: view };
  go('pick');
  speakPick();
}

function speakPick() {
  const w = PK && byId.get(PK.ids[PK.i]);
  if (w && db.settings.autoplay) setTimeout(() => speak(w.en), 250);
}

function pickWord(action) {
  const id = PK.ids[PK.i];
  if (action === 'learn') PK.picked.push(id);
  else if (action === 'known') { markKnown(id); PK.known++; }
  PK.i++;
  if (PK.picked.length >= PICK_BATCH || PK.i >= PK.ids.length) return finishPick();
  render();
  speakPick();
}

function finishPick() {
  const { picked, known, ref, back } = PK;
  PK = null;
  if (picked.length) {
    // wybrane nowe słowa + zaległe powtórki z tego pakietu
    const coll = collection(ref);
    const now = Date.now();
    const due = coll ? byKind(coll.ws).filter((w) => db.cards[w.id] && db.cards[w.id].due <= now).map((w) => w.id) : [];
    return startSession({ ids: [...picked, ...due], coll: ref });
  }
  view = back;
  render();
  toast(known ? `✓ Wyuczone: ${known} — jutro szybkie sprawdzenie` : 'Nie wybrano słówek do nauki');
}

function viewPick() {
  const w = byId.get(PK.ids[PK.i]);
  const goal = Math.min(PICK_BATCH, PK.ids.length);
  return `
  <header class="pick-top">
    <button class="pk-back" data-act="pick-back" aria-label="Wróć">${ICON.back}</button>
    <h2>Nauka</h2>
    <span class="pick-count" title="Wybrane do nauki">${ICON.sparkle}<b>${PK.picked.length}/${goal}</b></span>
  </header>
  <span class="pick-progress"><i style="width:${pct(PK.i / PK.ids.length)}"></i></span>
  <section class="pick-card">
    <p class="pick-label">${isPhrase(w) ? 'Nowy zwrot' : 'Nowe słówko'} <span>${PK.i + 1} z ${PK.ids.length}</span></p>
    <div class="pick-tile" style="--tint:${wordTint(w)}">${wordArt(w)}</div>
    <h1 class="pick-en">${esc(w.en)}<button class="wd-say" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button></h1>
    <p class="pick-pl">${esc(w.pl)}</p>
  </section>
  <div class="pick-actions">
    <button class="pick-go" data-act="pick-learn"><span>Ucz się</span></button>
    <div class="wd-actions"><button class="wd-link" data-act="pick-later">Później</button><span></span><button class="wd-link" data-act="pick-known">Wiem</button></div>
    ${PK.picked.length ? `<button class="pick-start" data-act="pick-start">Zacznij teraz z ${PK.picked.length} ${plural(PK.picked.length, 'słowem', 'słowami', 'słowami')} ›</button>` : ''}
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
  <header class="page-head">
    <button class="icon-round" data-view="home" aria-label="Wróć">${ICON.back}</button>
    <h1>Ustawienia zadań</h1>
    <span class="page-head-spacer"></span>
  </header>

  <section class="plan-preview">
    <span class="overline light">Twój zestaw${L ? ` · ${L.id} ${esc(L.title)}` : ''}</span>
    <div class="pp-stats">
      <div><b>${nParts}</b><span>${plural(nParts, 'część', 'części', 'części')}</span></div>
      <div><b>${total}</b><span>${plural(total, 'zadanie', 'zadania', 'zadań')}</span></div>
      <div><b>${s.taskSource === 'known' ? known : words.length}</b><span>słówek do użycia</span></div>
    </div>
    <p class="pp-forecast">${ICON.target}<span>Zadania układają się tylko z Twoich słówek — żadnych nowych słów. Imiona (Tom, Anna…) to tylko postacie w zdaniach.</span></p>
    ${gen && gen.skipped.length ? `<p class="pp-exam warn">Pominięte: ${gen.skipped.map((p) => `${p.key} — ${esc(p.title)}`).join(', ')} (za mało słówek)</p>` : ''}
  </section>

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

function viewProfile() {
  const c = counts();
  const s = db.settings;
  const st = streak();
  const fc = forecast();
  const fcMax = Math.max(1, ...fc.map((x) => x.n));
  const lvMax = Math.max(1, ...c.levels);
  return `
    ${statusBar()}
    <section class="profile-head">
      <div class="avatar">${ICON.uk}</div>
      <div><h2>Mój profil</h2><p class="muted small">Uczysz się: angielski</p></div>
    </section>

    <div class="stat-grid">
      <div class="stat-tile"><span class="st-icon flame">${ICON.flame}</span><b>${st}</b><span>seria dni</span></div>
      <div class="stat-tile"><span class="st-icon">${ICON.gem}</span><b>${db.gems}</b><span>diamentów</span></div>
      <div class="stat-tile"><span class="st-icon">${ICON.check}</span><b>${c.known}</b><span>umiesz słówek</span></div>
      <div class="stat-tile"><span class="st-icon">${ART.trophy}</span><b>${db.best}</b><span>najdłuższa seria</span></div>
    </div>

    ${streakCard()}

    <section class="card">
      <h2 class="card-title small">Odznaki</h2>
      <div class="badges">
        ${BADGES.map((b) => {
          const got = db.badges[b.days];
          return `<div class="badge-item ${got ? 'got' : ''}" title="${got ? `Zdobyta ${formatDate(got, false)}` : `Seria ${daysLabel(b.days)}`}">${ART.medal}<b>${b.name}</b><span>${daysLabel(b.days)}</span></div>`;
        }).join('')}
      </div>
    </section>

    <section class="card shop">
      <span class="shop-icon">${ICON.ice}</span>
      <div><b>Zamrożenie serii</b><p class="muted small">Chroni serię, gdy opuścisz dzień. Masz ${db.freezes} z ${MAX_FREEZES}.</p></div>
      <button class="btn buy" data-act="buy-freeze" ${db.gems < FREEZE_PRICE || db.freezes >= MAX_FREEZES ? 'disabled' : ''}>${FREEZE_PRICE} ${ICON.gem}</button>
    </section>

    <section class="card">
      <h2 class="card-title small">Jak zdobywać diamenty</h2>
      <ul class="rules">
        <li><span>Dobra odpowiedź</span><b>+1 ${ICON.gem}</b></li>
        <li><span>Błyskawiczna odpowiedź ⚡</span><b>+2 ${ICON.gem}</b></li>
        <li><span>Skrzynia za ukończony plan dnia</span><b>+${CHEST_BONUS} ${ICON.gem}</b></li>
        <li><span>Zaliczony test (≥ ${EXAM_PASS}%)</span><b>+${EXAM_BONUS} ${ICON.gem}</b></li>
        <li><span>Nowa odznaka serii</span><b>+5 ${ICON.gem} × dni</b></li>
      </ul>
    </section>

    <section class="card">
      <h2 class="card-title small">Poziom słówek</h2>
      <div class="levels">
        ${c.levels.map((n, i) => `<div class="lv"><div class="lv-bar"><i class="l${i}" style="height:${(n / lvMax) * 100}%"></i></div><b>${n}</b><span>${LEVEL_NAMES[i]}</span></div>`).join('')}
      </div>
    </section>

    <section class="card">
      <h2 class="card-title small">Powtórki w tym tygodniu</h2>
      <div class="forecast">
        ${fc.map((f) => `<div class="fc"><b>${f.n || ''}</b><div class="fc-bar"><i style="height:${(f.n / fcMax) * 100}%"></i></div><span>${f.label}</span></div>`).join('')}
      </div>
    </section>

    <h2 class="section-title">Ustawienia</h2>
    <button class="card link-card" data-view="plan-settings">
      ${setIcon('sliders', ['#E7E0FF', '#5A3FE0'])}
      <span class="set-text"><b>Ustawienia planu dnia</b><span>${s.newPerDay} nowych słów · cel ${goalMin()} min · kolejność, rozgrzewka, słuch i pisanie</span></span>
      <span class="chev" aria-hidden="true">›</span>
    </button>

    <section class="card form">
      <h3>Mój egzamin</h3>
      <label>Nazwa
        <input type="text" value="${esc(s.examName)}" data-set="examName">
      </label>
      <label>Data
        <input type="date" value="${esc(s.examDate)}" data-set="examDate">
      </label>
    </section>

    <section class="card form">
      <h3>Wymowa</h3>
      ${canSpeak ? '' : '<p class="bad-text small">Ta przeglądarka nie obsługuje syntezy mowy — ćwiczenia ze słuchu są wyłączone.</p>'}
      <label>Akcent
        <select data-set="accent">
          <option value="en-GB" ${s.accent === 'en-GB' ? 'selected' : ''}>brytyjski</option>
          <option value="en-US" ${s.accent === 'en-US' ? 'selected' : ''}>amerykański</option>
        </select>
      </label>
      <label>Głos
        <select data-set="voice">
          <option value="">automatycznie</option>
          ${voices.map((v) => `<option value="${esc(v.name)}" ${s.voice === v.name ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
        </select>
      </label>
      <label>Tempo mowy: <b id="rate-val">${s.rate.toFixed(2)}</b>
        <input type="range" min="0.6" max="1.2" step="0.05" value="${s.rate}" data-set="rate">
      </label>
      <label class="check"><input type="checkbox" data-set="autoplay" ${s.autoplay ? 'checked' : ''}> Czytaj słowa automatycznie</label>
      <button class="btn" data-say="Hello! Nice to meet you.">🔊 Test głosu</button>
    </section>

    <section class="card form">
      <h3>Słówka i kopia zapasowa</h3>
      <p class="muted small">Słówka aktualizują się same przy każdym uruchomieniu <b>start.bat</b> (z pliku slowka.md). Import ręczny przydaje się np. na telefonie.</p>
      <label class="btn file">📥 Importuj slowka.md<input type="file" accept=".md,.txt,text/markdown" data-file="md" hidden></label>
      <button class="btn" data-act="export">💾 Eksportuj postępy</button>
      <p class="muted small">${db.lastBackup ? `Ostatnia kopia: ${formatDate(dayKey(new Date(db.lastBackup)))}` : 'Nie masz jeszcze kopii — zrób ją raz w tygodniu.'}</p>
      <label class="btn file">📂 Wczytaj kopię<input type="file" accept=".json,application/json" data-file="backup" hidden></label>
      <button class="btn danger" data-act="reset">Wyzeruj postępy</button>
    </section>
    <p class="muted center small">Słowik · ${wordsLabel(words.length)}</p>`;
}

// ---------- akcje ----------

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2800);
}

function importMarkdown(text) {
  const parsed = Parser.parseMarkdown(text);
  if (!parsed.length) return toast('Nie znaleziono słówek w pliku');
  const before = new Set(words.map((w) => w.id));
  const extra = new Map(db.extra.map((w) => [w.id, w]));
  for (const w of parsed) extra.set(w.id, w);
  db.extra = [...extra.values()];
  save();
  buildWords();
  const added = parsed.filter((w) => !before.has(w.id)).length;
  toast(`Wczytano ${parsed.length} słówek (${added} nowych)`);
  render();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `slowik-kopia-${dayKey()}.json`;
  a.click();
  db.lastBackup = Date.now();
  save();
  toast('💾 Kopia zapisana w folderze Pobrane');
  render();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { return toast('To nie jest poprawny plik kopii'); }
  if (!d || typeof d.cards !== 'object') return toast('To nie jest poprawny plik kopii');
  if (!(await ask({ title: 'Wczytać kopię?', text: 'Obecne postępy zostaną zastąpione tą kopią.', ok: 'Wczytaj', danger: true }))) return;
  db = normalize(d);
  save();
  buildWords();
  toast('Wczytano kopię');
  render();
}

function go(v) {
  if (v !== 'player') stopPlayer();
  view = v;
  render();
  window.scrollTo(0, 0);
}

function openCollection(ref) {
  if (ref && view !== 'words') collFrom = view === 'packs' ? 'packs' : 'home';
  wordsFilter = { q: '', coll: ref, status: '', kind: '' };
  go('words');
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act],[data-say],[data-slow],[data-opt],[data-view],[data-coll],[data-status],[data-player],[data-exam],[data-listtoggle],[data-setval],[data-toggle],[data-slide],[data-ptab],[data-kind],[data-wopen],[data-taskpart]');
  if (!el || el.disabled) return;
  const ds = el.dataset;
  if (ds.slide !== undefined) {
    const deck = $('#dailyDeck');
    const idx = +ds.slide;
    if (deck) {
      deck.scrollTo({ left: idx * deck.clientWidth, behavior: 'smooth' });
      document.querySelectorAll('#carouselDots .dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    }
    return;
  }
  if (ds.say !== undefined) { e.preventDefault(); speak(ds.say); return; }
  if (ds.wopen) { showWord(ds.wopen); return; }
  if (ds.slow !== undefined) { speak(ds.slow, 0.6); return; }
  if (ds.opt !== undefined) { choose(+ds.opt); return; }
  if (ds.player) { playerControl(ds.player); return; }
  if (ds.exam) { startSession({ exam: ds.exam }); return; }
  if (ds.setval) {
    const [k, v] = ds.setval.split(':');
    db.settings[k] = /^\d+$/.test(v) ? +v : v;
    save();
    render();
    return;
  }
  if (ds.toggle) { db.settings[ds.toggle] = !db.settings[ds.toggle]; save(); render(); return; }
  if (ds.taskpart) {
    const p = db.settings.taskParts;
    const next = p.includes(ds.taskpart) ? p.replace(ds.taskpart, '') : [...p + ds.taskpart].sort().join('');
    if (!next) return toast('Zostaw przynajmniej jedną część');
    db.settings.taskParts = next; save(); render(); return;
  }
  if (ds.status !== undefined) { wordsFilter.status = ds.status; render(); return; }
  if (ds.kind !== undefined) { wordsFilter.kind = ds.kind; wordsFilter.status = ''; render(); return; }
  if (ds.ptab) { packsTab = ds.ptab; render(); return; }
  if (ds.coll !== undefined) { e.preventDefault(); openCollection(ds.coll); return; }
  if (ds.listtoggle) { toggleInList(ds.listtoggle, ds.word); render(); return; }
  if (ds.view) {
    if (ds.view === 'words') wordsFilter = { q: '', coll: '', status: '', kind: '' };
    go(ds.view);
    return;
  }
  const coll = collection(wordsFilter.coll);
  switch (ds.act) {
    case 'start': startSession(); break;
    case 'extra': startSession({ mode: 'extra' }); break;
    case 'start-coll': if (coll) startPick(coll.ref); break;
    case 'resume': collFrom = 'packs'; wordsFilter = { q: '', coll: ds.ref, status: '', kind: '' }; view = 'words'; startPick(ds.ref); break;
    case 'pick-learn': pickWord('learn'); break;
    case 'pick-later': pickWord('later'); break;
    case 'pick-known': pickWord('known'); break;
    case 'pick-start': finishPick(); break;
    case 'pick-back': { const back = PK?.back || 'words'; PK = null; view = back; render(); break; }
    case 'word-back': closeWord(); break;
    case 'word-fav': toggleFav(wordView.id); render(); break;
    case 'word-learn': startSession({ ids: [wordView.id] }); break;
    case 'word-practice': startSession({ ids: [wordView.id], mode: 'drill' }); break;
    case 'word-known': markKnown(wordView.id); toast('✓ Wyuczone — jutro szybkie sprawdzenie'); render(); break;
    case 'word-relearn': relearn(wordView.id); toast('Słowo wróciło do nauki'); startSession({ ids: [wordView.id], mode: 'drill', intro: true }); break;
    case 'retry-wrong': startSession({ ids: S.answers.filter((a) => !a.correct).map((a) => a.id), mode: 'drill' }); break;
    case 'drill-mistakes': startSession({ ids: db.mistakes, mode: 'drill' }); break;
    case 'path-done': toast(ds.msg); break;
    case 'listen-quiz': startSession({ mode: 'listen' }); break;
    case 'player': startPlayer(); break;
    case 'player-quick': startPlayer('__seen'); break;
    case 'player-close': go(P ? P.from : 'listen'); break;
    case 'known': wordsFilter = { q: '', coll: '', status: 'known' }; go('words'); break;
    case 'coll-player': if (coll) startPlayer(byKind(coll.ws).map((w) => w.id)); break;
    case 'coll-review': if (coll) startSession({ ids: byKind(coll.ws).filter((w) => db.cards[w.id]).map((w) => w.id), mode: 'extra' }); break;
    case 'all-words': go('packs'); break;
    case 'new-list':
      createList(ds.word).then((l) => { if (l && !ds.word) openCollection('list:' + l.id); else render(); });
      break;
    case 'rename-list': if (coll?.list) renameList(coll.list); break;
    case 'delete-list': if (coll?.list) deleteList(coll.list); break;
    case 'intro-next': introDone(); break;
    case 'next': advance(); break;
    case 'hint': hint(); break;
    case 'dunno': S.cur.typed = $('#typed')?.value || ''; S.cur.result = 'wrong'; answer(false, false, S.cur.typed); break;
    case 'quit': quitSession(); break;
    case 'home': go('home'); break;
    case 'task-lesson': taskLesson = ds.lesson; render(); break;
    case 'tasks-start': { const L = selectedTaskLesson(); if (L) startTasks(L.id, ds.part || ''); break; }
    case 'task-pick': if (EX && !EX.checked) { EX.values[ds.k] = ds.v; render(); } break;
    case 'tasks-check': checkTasks(); break;
    case 'tasks-new': if (EX) { startTasks(EX.lesson, EX.part); window.scrollTo(0, 0); } break;
    case 'tasks-back':
      if (EX && !EX.checked && Object.keys(EX.values).length) {
        ask({ title: 'Wyjść z zadań?', text: 'Odpowiedzi nie zostaną sprawdzone.', ok: 'Wyjdź', cancel: 'Zostaję' }).then((yes) => { if (yes) { EX = null; go('home'); } });
      } else { EX = null; go('home'); }
      break;
    case 'coll-next': { const ref = S.coll; reopenColl(ref); startPick(ref); break; }
    case 'coll-return': reopenColl(S.coll); go('words'); break;
    case 'buy-freeze': buyFreeze(); break;
    case 'chest-info': toast('🎁 Dzisiejsza skrzynia już otwarta — wróć jutro po kolejną!'); break;
    case 'plan-defaults':
      for (const k of PLAN_KEYS) db.settings[k] = DEFAULT_SETTINGS[k];
      save(); toast('Przywrócono ustawienia domyślne'); render();
      break;
    case 'export': exportBackup(); break;
    case 'backup-later': db.backupSnooze = Date.now() + 3 * DAY; save(); render(); break;
    case 'reset':
      ask({ title: 'Wyzerować wszystko?', text: 'Cały postęp nauki, diamenty, seria, odznaki i listy znikną. Tego nie da się cofnąć.', ok: 'Wyzeruj', danger: true }).then((yes) => {
        if (!yes) return;
        db = normalize({ extra: db.extra, settings: db.settings });
        save(); toast('Postępy wyzerowane'); render();
      });
      break;
  }
});

// Szerokość paska przewijania — sekcja Plan dnia sięga dokładnie do krawędzi okna.
const updateScrollbar = () => document.documentElement.style.setProperty('--sbw', `${innerWidth - document.documentElement.clientWidth}px`);
addEventListener('resize', updateScrollbar);
new ResizeObserver(updateScrollbar).observe(document.body);

// Efekt fali po kliknięciu w przyciski Planu dnia.
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.ph-cta, .ph-task, .pk-card, .cv-learn, .pick-go, .rs-go, .tk-opt, .lk-part');
  if (!el) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const s = document.createElement('span');
  s.className = 'ripple';
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.appendChild(s);
  setTimeout(() => s.remove(), 650);
});

// Pamiętamy rozwinięte słówko, żeby nie zwijało się po zmianie listy.
document.addEventListener('click', (e) => {
  document.querySelectorAll('.cv-menu[open]').forEach((m) => { if (!m.contains(e.target) || e.target.closest('.cv-pop button')) m.open = false; });
}, true);

document.addEventListener('submit', (e) => {
  if (e.target.dataset.form === 'type') { e.preventDefault(); if (S?.cur.answered) advance(); else submitTyped(); }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.task && EX && !EX.checked) {
    EX.values[t.dataset.task] = t.value;
    const btn = $('[data-act="tasks-check"] span');
    const total = EX.sections.reduce((n, s) => n + s.items.length, 0);
    const answered = Object.values(EX.values).filter((v) => String(v).trim()).length;
    if (btn) btn.textContent = `Sprawdź${answered < total ? ` (${answered}/${total})` : ''}`;
    return;
  }
  if (t.id === 'q') { wordsFilter.q = t.value; const pos = t.selectionStart; render(); const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos); }
  if (t.dataset.set === 'rate') { db.settings.rate = +t.value; $('#rate-val').textContent = (+t.value).toFixed(2); save(); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'coll') { wordsFilter.coll = t.value; wordsFilter.status = ''; collFrom = 'words'; render(); }
  if (t.id === 'listen-source') listenSource = t.value;
  const key = t.dataset.set;
  if (key && key !== 'rate') {
    db.settings[key] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Math.max(0, +t.value || 0) : t.value.trim();
    if (key === 'accent') db.settings.voice = '';
    save();
    render();
  }
  if (t.dataset.file && t.files[0]) {
    const kind = t.dataset.file;
    t.files[0].text().then((text) => (kind === 'md' ? importMarkdown(text) : importBackup(text)));
    t.value = '';
  }
});

document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog.ask')) return; // otwarte okienko obsługuje klawisze samo
  if (view === 'tasks' && e.key === 'Enter' && e.target.classList?.contains('tk-input')) {
    e.preventDefault();
    const inputs = [...document.querySelectorAll('.tk-input:not([readonly])')];
    const next = inputs[inputs.indexOf(e.target) + 1];
    if (next) next.focus(); else $('[data-act="tasks-check"]')?.focus();
    return;
  }
  if (view === 'player' && e.key === ' ') { e.preventDefault(); playerControl('toggle'); return; }
  if (view === 'word' && e.key === 'Escape') { closeWord(); return; }
  if (view === 'pick' && PK && e.target.tagName !== 'BUTTON') {
    const act = { Enter: 'learn', ArrowLeft: 'later', ArrowRight: 'known', Escape: 'back' }[e.key];
    if (act === 'back') { const back = PK.back; PK = null; view = back; render(); return; }
    if (act) { e.preventDefault(); pickWord(act); return; }
  }
  if (view !== 'session' || !S) return;
  const inInput = e.target.tagName === 'INPUT';
  if (e.key === 'Enter' && e.target.id === 'typed') {
    e.preventDefault();
    if (S.cur.answered) advance(); else submitTyped();
  } else if (e.key === 'Enter' && !inInput) {
    e.preventDefault();
    if (S.cur.type === 'intro') introDone();
    else if (S.cur.answered) advance();
  } else if (!inInput && /^[1-4]$/.test(e.key) && S.cur.options) {
    choose(+e.key - 1);
  } else if (!inInput && e.key === ' ') {
    e.preventDefault();
    speak(S.cur.w.en);
  } else if (e.key === 'Escape') {
    // okienko otwieramy po zakończeniu tego Esc — inaczej przeglądarka od razu by je zamknęła
    e.preventDefault();
    setTimeout(quitSession, 0);
  }
});

// ---------- start ----------

$('#nav').innerHTML = [
  ['home', 'learn', 'Nauka'],
  ['listen', 'listen', 'Audio'],
  ['words', 'words', 'Słownictwo'],
  ['profile', 'settings', 'Ustawienia'],
].map(([v, icon, label]) => `<button data-view="${v}"><span class="nav-ind"></span>${ICON[icon]}<span>${label}</span></button>`).join('');
buildWords();
applyFreezes();
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
