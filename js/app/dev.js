// Słowik — Panel dewelopera (tylko z lokalnym serwerem tools/server.js): ikony i nagrania wymowy.
// Pliki js/app/*.js to jeden program podzielony na części (kolejność w index.html ma znaczenie).
'use strict';

// ---------- panel dewelopera: ikony słówek z OpenRouter (tylko przy lokalnym serwerze tools/server.js) ----------

let DEV = null; // status z /api/dev/status; null = panel niedostępny (np. inna przeglądarka, telefon, GitHub)
const DEVS = { model: '', busy: {}, preview: {}, errors: {}, briefs: {}, spent: 0, bulk: null, topic: '' }; // topic: temat w sekcji „Twoje ikony”
// ≈ $ za ikonę wg modelu — tylko do podglądu kosztu (Muse Image ok. $0,01, Gemini ok. $0,04)
const MODEL_PRICE = { 'meta/muse-image': 0.01, 'recraft/recraft-v4.1': 0.035, 'inclusionai/ming-image-0.1-design': 0, 'google/gemini-2.5-flash-image': 0.04, 'google/gemini-3.1-flash-lite-image': 0.04, 'google/gemini-3.1-flash-image': 0.08 };
const MODEL_LABEL = { 'meta/muse-image': 'Muse Image', 'recraft/recraft-v4.1': 'Recraft V4.1', 'inclusionai/ming-image-0.1-design': 'Ming (darmowy)', 'google/gemini-2.5-flash-image': 'gemini-2.5-flash', 'google/gemini-3.1-flash-lite-image': 'gemini-3.1-lite', 'google/gemini-3.1-flash-image': 'gemini-3.1-flash' };
const iconPrice = () => MODEL_PRICE[DEVS.model] ?? 0.04;

async function devInit() {
  try {
    const r = await fetch('/api/dev/status', { cache: 'no-store' });
    if (!r.ok) return;
    DEV = await r.json();
    DEVS.model = DEVS.model || DEV.model;
    Object.assign(WORD_IMG, DEV.extra || {});
    if (DEV.audio) window.WORD_AUDIO = DEV.audio;
    if (view === 'profile' || view === 'dev') render();
  } catch (e) { /* bez lokalnego serwera — panelu nie ma */ }
}

// słówka bez ikony (zwroty nigdy nie mają ikon)
const devMissing = () => words.filter((w) => !isPhrase(w) && !WORD_IMG[w.id]);

// Obróbka wygenerowanego obrazka: białe/szare tło od brzegów → przezroczyste, kafelek na cały kwadrat 128 px, zaokrąglone rogi.
function devProcess(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, w, h).data, N = w * h;
      const neutral = (p) => { const o = p * 4, r = d[o], g = d[o + 1], b = d[o + 2]; return d[o + 3] < 20 || (Math.max(r, g, b) - Math.min(r, g, b) <= 12 && Math.min(r, g, b) >= 200); };
      const bg = new Uint8Array(N), st = [];
      for (let i = 0; i < w; i++) st.push(i, (h - 1) * w + i);
      for (let j = 0; j < h; j++) st.push(j * w, j * w + w - 1);
      for (const p of st.splice(0)) if (!bg[p] && neutral(p)) { bg[p] = 1; st.push(p); }
      while (st.length) {
        const p = st.pop(), px = p % w, py = (p / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx; if (!bg[q] && neutral(q)) { bg[q] = 1; st.push(q); }
        }
      }
      // obrys kafelka: wiersze i kolumny, w których kafelek zajmuje ponad połowę
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      const rows = new Array(h).fill(0), cols = new Array(w).fill(0);
      for (let p = 0; p < N; p++) if (!bg[p]) { rows[(p / w) | 0]++; cols[p % w]++; }
      rows.forEach((n, y) => { if (n > w * 0.5) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
      cols.forEach((n, c) => { if (n > h * 0.5) { x0 = Math.min(x0, c); x1 = Math.max(x1, c); } });
      if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
      const inset = Math.round(Math.min(w, h) * 0.012) + 1;
      x0 += inset; y0 += inset; x1 -= inset; y1 -= inset;
      const side = Math.min(x1 - x0 + 1, y1 - y0 + 1), sx = x0 + (x1 - x0 + 1 - side) / 2, sy = y0 + (y1 - y0 + 1 - side) / 2;
      const OUT = 128, out = document.createElement('canvas'); out.width = out.height = OUT;
      const o = out.getContext('2d');
      o.imageSmoothingQuality = 'high';
      const R = OUT * 0.22;
      o.beginPath(); o.roundRect(0, 0, OUT, OUT, R); o.clip();
      o.drawImage(img, sx, sy, side, side, 0, 0, OUT, OUT);
      resolve(out.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Nie da się odczytać obrazka'));
    img.src = src;
  });
}

async function devGenerate(id, { autoSave = false } = {}) {
  const w = byId.get(id);
  if (!w) return;
  DEVS.busy[id] = true; delete DEVS.errors[id];
  if (view === 'dev') render();
  try {
    const r = await fetch('/api/dev/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: DEVS.model, muse: !!db.settings.devMuse, word: { id: w.id, en: w.en, pl: w.pl, pos: POS_NAMES[w.pos] || w.pos, topic: w.topic } }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Błąd generowania');
    DEVS.spent += j.cost || iconPrice();
    if (j.brief) DEVS.briefs[id] = j.brief; else delete DEVS.briefs[id];
    DEVS.preview[id] = await devProcess(j.image);
    if (autoSave) await devSave(id, { quiet: true });
  } catch (e) {
    DEVS.errors[id] = e.message;
  }
  delete DEVS.busy[id];
  if (view === 'dev') render();
}

async function devSave(id, { quiet = false } = {}) {
  const png = DEVS.preview[id];
  if (!png) return;
  const r = await fetch('/api/dev/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, png }) });
  const j = await r.json();
  if (!r.ok) { DEVS.errors[id] = j.error || 'Nie zapisano'; return; }
  WORD_IMG[id] = j.file;
  if (DEV) DEV.extra = { ...(DEV.extra || {}), [id]: j.file };
  delete DEVS.preview[id];
  if (!quiet) { toast(`✓ Ikona „${byId.get(id)?.en}” zapisana`); render(); }
}

async function devRemove(id) {
  const base = BASE_WORD_IMG[id];
  if (!(await ask(base
    ? { title: `Przywrócić oryginalną ikonę „${byId.get(id)?.en || id}”?`, text: 'Wygenerowana wersja zostanie usunięta, wróci Twoja ikona.', ok: 'Przywróć' }
    : { title: `Usunąć ikonę „${byId.get(id)?.en || id}”?`, text: 'Słowo znowu będzie bez ikony — możesz wygenerować nową.', ok: 'Usuń', danger: true }))) return;
  await fetch('/api/dev/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  if (base) WORD_IMG[id] = base; else delete WORD_IMG[id];
  if (DEV && DEV.extra) delete DEV.extra[id];
  render();
}

async function devBulk() {
  const ids = devMissing().map((w) => w.id).filter((id) => !DEVS.preview[id]);
  if (!ids.length) return;
  const ok = await ask({
    title: `Wygenerować ${ids.length} ${plural(ids.length, 'ikonę', 'ikony', 'ikon')}?`,
    text: `Koszt ok. $${(ids.length * iconPrice()).toFixed(2)} z Twojego konta OpenRouter${DEV.credits != null ? ` (zostało $${DEV.credits})` : ''}. Ikony zapiszą się same — każdą możesz potem usunąć albo wygenerować od nowa.`,
    ok: 'Generuj',
  });
  if (!ok) return;
  DEVS.bulk = { done: 0, total: ids.length, stop: false };
  for (const id of ids) {
    if (DEVS.bulk.stop) break;
    await devGenerate(id, { autoSave: true });
    DEVS.bulk.done++;
    if (view === 'dev') render();
  }
  const done = DEVS.bulk.done;
  DEVS.bulk = null;
  toast(`Gotowe: ${done} ${plural(done, 'ikona', 'ikony', 'ikon')}`);
  devInit();
}

function devRow(w) {
  const busy = DEVS.busy[w.id], prev = DEVS.preview[w.id], err = DEVS.errors[w.id], own = DEV.extra && DEV.extra[w.id];
  const img = prev ? `<img class="dv-img" src="${prev}" alt="">` : WORD_IMG[w.id] ? `<img class="dv-img" src="assets/words/${WORD_IMG[w.id]}.png" alt="">` : `<span class="dv-img empty">${busy ? '<i class="dv-spin"></i>' : '?'}</span>`;
  return `
    <div class="dv-row">
      ${img}
      <div class="dv-text"><b>${esc(w.en)}</b><span>${esc(w.pl)}</span>${prev && DEVS.briefs[w.id] ? `<small class="dv-brief">🧠 Muse: ${esc(DEVS.briefs[w.id])}</small>` : ''}${err ? `<em>${esc(err)}</em>` : ''}</div>
      <div class="dv-actions">
        ${busy ? '<span class="dv-busy">Generuję…</span>'
          : prev ? `<button class="dv-btn ok" data-act="dev-save" data-id="${esc(w.id)}">Zapisz</button><button class="dv-btn" data-act="dev-gen" data-id="${esc(w.id)}" title="Jeszcze raz">↻</button>`
          : own ? `<button class="dv-btn" data-act="dev-gen" data-id="${esc(w.id)}" title="Nowa wersja">↻</button><button class="dv-btn danger" data-act="dev-remove" data-id="${esc(w.id)}" title="${BASE_WORD_IMG[w.id] ? 'Przywróć oryginalną ikonę' : 'Usuń ikonę'}">${BASE_WORD_IMG[w.id] ? '↺' : '✕'}</button>`
          : WORD_IMG[w.id] ? `<button class="dv-btn" data-act="dev-gen" data-id="${esc(w.id)}" title="Wygeneruj nową wersję (oryginał zostaje do przywrócenia)" ${DEVS.bulk ? 'disabled' : ''}>↻ Nowa wersja</button>`
          : `<button class="dv-btn go" data-act="dev-gen" data-id="${esc(w.id)}" ${DEVS.bulk ? 'disabled' : ''}>Generuj</button>`}
      </div>
    </div>`;
}

const devHead = () => `
    <header class="page-head">
      <button class="icon-round" data-view="profile" aria-label="Wróć">${ICON.back}</button>
      <h1>Panel dewelopera</h1>
      <span class="page-head-spacer"></span>
    </header>
    <div class="segmented two dv-tabs" role="tablist">
      <button class="seg ${AUD.tab !== 'audio' ? 'on' : ''}" data-act="dev-tab" data-tab="icons">🖼 Ikony</button>
      <button class="seg ${AUD.tab === 'audio' ? 'on' : ''}" data-act="dev-tab" data-tab="audio">🔊 Wymowa</button>
    </div>`;

// ---------- panel dewelopera: wymowa (ElevenLabs albo modele mowy z OpenRouter) ----------

const TTS_LANG = {
  'en-US': { flag: '🇺🇸', name: 'Amerykański', sample: 'Hello! Nice to meet you. Where are you from?' },
  'en-GB': { flag: '🇬🇧', name: 'Brytyjski', sample: 'Hello! Nice to meet you. Where are you from?' },
  pl: { flag: '🇵🇱', name: 'Polski', sample: 'Cześć! Miło cię poznać. Skąd jesteś?' },
};
const AUD = { tab: 'icons', lang: 'en-US', kind: 'words', el: null, or: null, shared: {}, loading: false, busy: {}, preview: {}, errors: {}, credits: 0, usd: 0, bulk: null };
const ttsText = (w, lang) => (lang === 'pl' ? w.pl : w.en);
const ttsSpoken = (t) => String(t).replace(/\s+\/\s+/g, ', ');
const audKey = (lang, t) => lang + '|' + audioKey(t);
const hasAudio = (lang, t) => !!((window.WORD_AUDIO || {})[lang] || {})[audioKey(t)];

function ttsCfg() {
  const all = db.settings.devTts || (db.settings.devTts = { provider: 'eleven' });
  const c = all[AUD.lang] || (all[AUD.lang] = {});
  const k = all.provider === 'openrouter' ? 'or' : 'el';
  return { provider: all.provider, cur: c[k] || (c[k] = {}), all };
}

// OpenRouter: czy głos pasuje do języka (Kokoro a*/b* = US/UK, Aura -en, Azure en-US-…); Kokoro, Aura itp. nie mówią po polsku
const OR_NO_PL = /kokoro|aura-2|orpheus|csm-1b|flux-tts/;
function orVoiceFits(v, lang, model) {
  if (lang === 'pl' && OR_NO_PL.test(model)) return false;
  if (/^[a-z][fm]_/.test(v)) return lang === 'en-US' ? v[0] === 'a' : lang === 'en-GB' ? v[0] === 'b' : false;
  if (/^aura-2-/.test(v)) return lang !== 'pl' && /-en$/.test(v);
  const m = v.match(/^([a-z]{2})-[A-Z]{2}-/);
  if (m) return lang === 'pl' ? true : m[1] === 'en';
  return true;
}
// ElevenLabs: czy Twój głos ma ten akcent/język
function elVoiceFits(v, lang) {
  // główny język i akcent głosu (lista „verified languages” to języki, którymi też umie mówić — z obcym akcentem)
  const l = (v.language || '').toLowerCase(), a = (v.accent || '').toLowerCase();
  if (lang === 'pl') return l === 'pl' || a === 'polish';
  if (lang === 'en-GB') return (l === 'en' || !l) && /british|english/.test(a);
  return (l === 'en' || !l) && /american/.test(a);
}

async function ttsLoad() {
  if (AUD.loading) return;
  AUD.loading = true;
  try {
    const { provider } = ttsCfg();
    if (provider === 'openrouter' && !AUD.or) {
      const j = await (await fetch('/api/dev/tts-models')).json();
      if (j.error) throw new Error(j.error);
      AUD.or = j.models || [];
    }
    if (provider !== 'openrouter') {
      if (!AUD.el) {
        const j = await (await fetch('/api/dev/eleven')).json();
        if (j.error) throw new Error(j.error);
        AUD.el = j;
      }
      if (AUD.el.hasKey && !AUD.shared[AUD.lang]) {
        const j = await (await fetch('/api/dev/eleven-shared?lang=' + AUD.lang)).json();
        AUD.shared[AUD.lang] = j.voices || [];
      }
    }
    AUD.loadErr = '';
  } catch (e) { AUD.loadErr = e.message; }
  AUD.loading = false;
  ttsDefaults();
  if (view === 'dev') render();
}

// domyślny model i głos dla języka, gdy jeszcze nic nie wybrano
function ttsDefaults() {
  const { provider, cur } = ttsCfg(), lang = AUD.lang;
  if (provider === 'openrouter') {
    if (!AUD.or || !AUD.or.length) return;
    if (!AUD.or.find((m) => m.id === cur.model)) cur.model = (AUD.or.find((m) => m.id === 'google/gemini-3.8-flash-tts') || AUD.or[0]).id;
    const m = AUD.or.find((x) => x.id === cur.model), vs = m.voices.filter((v) => orVoiceFits(v, lang, m.id));
    if (m.voices.length && !vs.includes(cur.voice)) cur.voice = m.id.includes('gemini') ? (lang === 'en-GB' ? 'Charon' : 'Kore') : vs[0] || '';
    if (!m.voices.length) cur.voice = '';
  } else {
    const el = AUD.el;
    if (!el || !el.hasKey) return;
    if (!el.models.find((m) => m.id === cur.model)) cur.model = (el.models.find((m) => m.id === 'eleven_multilingual_v2') || el.models[0] || {}).id;
    const ok = elVoices().flatMap((g) => g.voices).map((v) => v.id);
    if (!ok.includes(cur.voice)) {
      const g = elVoices(); cur.voice = (g[0] && g[0].voices[0] && g[0].voices[0].id) || '';
    }
  }
  save();
}

// głosy ElevenLabs w grupach: pasujące Twoje, rodzimi lektorzy z biblioteki, pozostałe Twoje (wielojęzyczne)
function elVoices() {
  const el = AUD.el; if (!el || !el.hasKey) return [];
  // darmowy plan: przez API tylko głosy wbudowane i własne — głosów z biblioteki ElevenLabs nie wolno
  const free = el.sub && el.sub.tier === 'free';
  const own = (el.voices || []).filter((v) => !free || ['premade', 'cloned', 'generated'].includes(v.category)), fit = own.filter((v) => elVoiceFits(v, AUD.lang)), ownIds = new Set(own.map((v) => v.id));
  const shared = free ? [] : (AUD.shared[AUD.lang] || []).filter((v) => !ownIds.has(v.id));
  return [
    { label: `Twoje — ${TTS_LANG[AUD.lang].name.toLowerCase()}`, voices: fit },
    { label: 'Biblioteka ElevenLabs — rodzimi lektorzy', voices: shared.map((v) => ({ ...v, shared: true })) },
    { label: 'Twoje — pozostałe (mówią każdym językiem)', voices: own.filter((v) => !fit.includes(v)) },
  ].filter((g) => g.voices.length);
}
const elVoice = (id) => elVoices().flatMap((g) => g.voices).find((v) => v.id === id);

// koszt jednego nagrania: ElevenLabs w kredytach (znakach), OpenRouter w $
function ttsCost(text) {
  const { provider, cur } = ttsCfg();
  if (provider === 'openrouter') { const m = (AUD.or || []).find((x) => x.id === cur.model); return m ? m.prompt * text.length + m.completion * 50 : 0; }
  const m = ((AUD.el && AUD.el.models) || []).find((x) => x.id === cur.model);
  return Math.ceil(text.length * ((m && m.mult) || 1));
}
const ttsCostLabel = (n) => (ttsCfg().provider === 'openrouter' ? `$${n < 0.01 ? n.toFixed(4) : n.toFixed(2)}` : `${Math.round(n)} ${plural(Math.round(n), 'kredyt', 'kredyty', 'kredytów')}`);

function ttsItems() {
  return words.filter((w) => (AUD.kind === 'phrases') === isPhrase(w) && ttsText(w, AUD.lang));
}

async function ttsGenerate(text, { autoSave = false, sample = false } = {}) {
  const lang = AUD.lang, k = sample ? 'sample' : audKey(lang, text), { provider, cur } = ttsCfg();
  AUD.busy[k] = true; delete AUD.errors[k];
  if (view === 'dev') render();
  try {
    const v = provider === 'openrouter' ? null : elVoice(cur.voice);
    const r = await fetch('/api/dev/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, lang, text: ttsSpoken(text), model: cur.model, voice: cur.voice, voiceName: v && v.name, owner: v && v.shared ? v.owner : undefined }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Błąd nagrania');
    if (provider === 'openrouter') AUD.usd += j.cost || 0; else AUD.credits += j.credits || 0;
    // głos z biblioteki został dodany do konta — odśwież listę przy następnym wejściu
    if (v && v.shared && j.voiceId) { cur.voice = j.voiceId; AUD.el = null; AUD.shared = {}; save(); ttsLoad(); }
    if (sample) playAudio(j.audio).play().catch(() => {});
    else {
      AUD.preview[k] = j.audio;
      if (autoSave) await ttsSave(lang, text, { quiet: true });
      else playAudio(j.audio).play().catch(() => {});
    }
  } catch (e) { AUD.errors[k] = e.message; if (sample) toast(e.message); }
  delete AUD.busy[k];
  if (view === 'dev') render();
}

async function ttsSave(lang, text, { quiet = false } = {}) {
  const k = audKey(lang, text), audio = AUD.preview[k];
  if (!audio) return;
  const r = await fetch('/api/dev/tts-save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang, text, audio }) });
  const j = await r.json();
  if (!r.ok) { AUD.errors[k] = j.error || 'Nie zapisano'; return; }
  const A = window.WORD_AUDIO = window.WORD_AUDIO || {};
  (A[lang] = A[lang] || {})[audioKey(text)] = j.file;
  delete AUD.preview[k];
  if (!quiet) { toast(`✓ Nagranie „${text}” zapisane`); render(); }
}

async function ttsRemove(lang, text) {
  if (!(await ask({ title: `Usunąć nagranie „${text}”?`, text: 'Aplikacja wróci do głosu syntezatora — możesz nagrać od nowa.', ok: 'Usuń', danger: true }))) return;
  await fetch('/api/dev/tts-remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang, text }) });
  const A = (window.WORD_AUDIO || {})[lang]; if (A) delete A[audioKey(text)];
  render();
}

async function ttsBulk() {
  const lang = AUD.lang, list = ttsItems().map((w) => ttsText(w, lang)).filter((t) => !hasAudio(lang, t) && !AUD.preview[audKey(lang, t)]);
  if (!list.length) return;
  const cost = list.reduce((a, t) => a + ttsCost(ttsSpoken(t)), 0), el = ttsCfg().provider !== 'openrouter';
  const left = el && AUD.el && AUD.el.sub ? AUD.el.sub.limit - AUD.el.sub.used : null;
  const ok = await ask({
    title: `Nagrać ${list.length} ${plural(list.length, 'nagranie', 'nagrania', 'nagrań')}?`,
    text: `${TTS_LANG[lang].flag} ${TTS_LANG[lang].name}. Koszt ok. ${ttsCostLabel(cost)}${left != null ? ` (zostało ${left} kredytów ElevenLabs)` : !el && DEV.credits != null ? ` (zostało $${DEV.credits})` : ''}. Nagrania zapiszą się same — każde możesz odsłuchać, nagrać od nowa albo usunąć.`,
    ok: 'Nagrywaj',
  });
  if (!ok) return;
  AUD.bulk = { done: 0, total: list.length, stop: false };
  for (const t of list) {
    if (AUD.bulk.stop) break;
    await ttsGenerate(t, { autoSave: true });
    AUD.bulk.done++;
    if (view === 'dev') render();
  }
  const done = AUD.bulk.done;
  AUD.bulk = null;
  toast(`Gotowe: ${done} ${plural(done, 'nagranie', 'nagrania', 'nagrań')}`);
  if (el) { AUD.el = null; ttsLoad(); } else devInit();
}

function ttsRow(w) {
  const lang = AUD.lang, t = ttsText(w, lang), k = audKey(lang, t);
  const busy = AUD.busy[k], prev = AUD.preview[k], err = AUD.errors[k], file = ((window.WORD_AUDIO || {})[lang] || {})[audioKey(t)];
  const d = `data-lang="${lang}" data-text="${esc(t)}"`;
  return `
    <div class="dv-row">
      <span class="dv-snd ${file ? 'on' : prev ? 'new' : ''}">${busy ? '<i class="dv-spin"></i>' : file ? '🔊' : prev ? '🆕' : '·'}</span>
      <div class="dv-text"><b>${esc(t)}</b><span>${esc(lang === 'pl' ? w.en : w.pl)}</span>${err ? `<em>${esc(err)}</em>` : ''}</div>
      <div class="dv-actions">
        ${busy ? '<span class="dv-busy">Nagrywam…</span>'
          : prev ? `<button class="dv-btn" data-act="tts-play" ${d} data-prev="1" title="Odsłuchaj">▶</button><button class="dv-btn ok" data-act="tts-save" ${d}>Zapisz</button><button class="dv-btn" data-act="tts-gen" ${d} title="Jeszcze raz">↻</button>`
          : file ? `<button class="dv-btn" data-act="tts-play" ${d} title="Odsłuchaj">▶</button><button class="dv-btn" data-act="tts-gen" ${d} title="Nagraj od nowa" ${AUD.bulk ? 'disabled' : ''}>↻</button><button class="dv-btn danger" data-act="tts-remove" ${d} title="Usuń nagranie">✕</button>`
          : `<button class="dv-btn go" data-act="tts-gen" ${d} ${AUD.bulk ? 'disabled' : ''}>Nagraj</button>`}
      </div>
    </div>`;
}

function viewDevAudio() {
  const { provider, cur } = ttsCfg(), lang = AUD.lang, L = TTS_LANG[lang], or = provider === 'openrouter';
  const needLoad = or ? !AUD.or : !AUD.el || (AUD.el.hasKey && !AUD.shared[lang]);
  if (needLoad && !AUD.loading && !AUD.loadErr) setTimeout(ttsLoad);
  const A = window.WORD_AUDIO || {}, n = (l) => Object.keys(A[l] || {}).length;
  const items = ttsItems(), missing = items.filter((w) => !hasAudio(lang, ttsText(w, lang)));
  const nPhr = words.filter(isPhrase).length;
  const sub = !or && AUD.el && AUD.el.sub;
  const ready = or ? AUD.or && AUD.or.length && DEV.hasKey : AUD.el && AUD.el.hasKey;
  const groups = {};
  for (const w of items) (groups[w.topic] = groups[w.topic] || []).push(w);
  const b = AUD.bulk;
  const bulkCost = missing.reduce((a, w) => a + ttsCost(ttsSpoken(ttsText(w, lang))), 0);

  let modelSel = '', voiceSel = '', hint = '';
  if (ready && or) {
    const m = AUD.or.find((x) => x.id === cur.model) || AUD.or[0];
    const vs = m.voices.filter((v) => orVoiceFits(v, lang, m.id));
    modelSel = `<select id="tts-model" class="dv-select">${AUD.or.map((x) => `<option value="${esc(x.id)}" ${x.id === m.id ? 'selected' : ''} ${lang === 'pl' && OR_NO_PL.test(x.id) ? 'disabled' : ''}>${esc(x.name)} · ≈$${((x.prompt * 8 + x.completion * 50) * 100).toFixed(3)} / 100 słów</option>`).join('')}</select>`;
    voiceSel = m.voices.length
      ? `<select id="tts-voice" class="dv-select">${(vs.length ? vs : m.voices).map((v) => `<option value="${esc(v)}" ${v === cur.voice ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`
      : '<p class="set-hint">Ten model ma jeden domyślny głos.</p>';
    hint = /gemini|mai-voice/.test(m.id) ? 'Akcent i język ustawia instrukcja dla modelu — posłuchaj próbki.' : /kokoro/.test(m.id) ? 'Kokoro: głosy a… = amerykańskie, b… = brytyjskie. Nie mówi po polsku.' : '';
  } else if (ready) {
    const el = AUD.el, m = el.models.find((x) => x.id === cur.model) || el.models[0];
    modelSel = `<select id="tts-model" class="dv-select">${el.models.map((x) => `<option value="${esc(x.id)}" ${m && x.id === m.id ? 'selected' : ''} ${lang === 'pl' && x.langs.length && !x.langs.includes('pl') ? 'disabled' : ''}>${esc(x.name)} · ${x.mult} kr./znak</option>`).join('')}</select>`;
    voiceSel = `<select id="tts-voice" class="dv-select">${elVoices().map((g) => `<optgroup label="${esc(g.label)}">${g.voices.map((v) => `<option value="${esc(v.id)}" ${v.id === cur.voice ? 'selected' : ''}>${esc(v.name)}${[v.gender, v.accent, v.desc].filter(Boolean).length ? ' — ' + esc([v.gender, v.accent, v.desc].filter(Boolean).join(', ')) : ''}</option>`).join('')}</optgroup>`).join('')}</select>`;
    const v = elVoice(cur.voice);
    hint = v && v.shared ? 'Głos z biblioteki — przy pierwszym nagraniu doda się do Twojego konta ElevenLabs.'
      : el.sub && el.sub.tier === 'free' && lang === 'pl' ? 'Plan darmowy nie pozwala na polskich lektorów z biblioteki — wbudowany głos mówi po polsku przez Eleven Multilingual v2 (albo przełącz źródło na OpenRouter → Gemini).'
      : 'Eleven Multilingual v2 — najlepsza jakość, dobry polski. Flash/Turbo — o połowę mniej kredytów.';
  }

  return `
    <section class="plan-preview">
      <span class="overline light">Wymowa słówek · ${or ? 'OpenRouter' : 'ElevenLabs'}</span>
      <div class="pp-stats four">
        <div><b>${n('en-US')}</b><span>🇺🇸 US</span></div>
        <div><b>${n('en-GB')}</b><span>🇬🇧 UK</span></div>
        <div><b>${n('pl')}</b><span>🇵🇱 PL</span></div>
        <div><b>${or ? (DEV.credits != null ? '$' + DEV.credits : '—') : sub ? (sub.limit - sub.used).toLocaleString('pl-PL') : '—'}</b><span>${or ? 'na koncie' : 'kredytów'}</span></div>
      </div>
      <p class="pp-forecast">${ICON.target}<span>Prawdziwy lektor zamiast głosu przeglądarki. Aplikacja gra nagranie w akcencie z ustawień (${db.settings.accent === 'en-US' ? 'amerykański' : 'brytyjski'}), a gdy go brak — w drugim.${AUD.credits || AUD.usd ? ` W tej sesji: ${AUD.credits ? AUD.credits + ' kredytów' : ''}${AUD.credits && AUD.usd ? ' · ' : ''}${AUD.usd ? '$' + AUD.usd.toFixed(3) : ''}.` : ''}</span></p>
    </section>

    <section class="card set-card">
      <div class="set-head">${setIcon('sparkle', ['#E7E0FF', '#5A3FE0'])}<b>Źródło głosu</b></div>
      <div class="segmented two">
        <button class="seg ${!or ? 'on' : ''}" data-act="tts-prov" data-prov="eleven">ElevenLabs</button>
        <button class="seg ${or ? 'on' : ''}" data-act="tts-prov" data-prov="openrouter">OpenRouter</button>
      </div>
      <div class="set-head dv-sub"><b>Język nagrania</b></div>
      <div class="segmented">${Object.entries(TTS_LANG).map(([k, x]) => `<button class="seg ${k === lang ? 'on' : ''}" data-act="tts-lang" data-lang="${k}">${x.flag} ${x.name}</button>`).join('')}</div>
      ${AUD.loadErr ? `<p class="dv-err">${esc(AUD.loadErr)}</p>` : ''}
      ${!or && AUD.el && !AUD.el.hasKey ? '<p class="dv-err">Brak klucza ElevenLabs. Zapisz klucz API (elevenlabs.io → Developers → API Keys) w pliku <b>kod eleven.txt</b> na pulpicie i uruchom ponownie start.bat.</p>' : ''}
      ${ready ? `
      <div class="set-head dv-sub"><b>Model</b></div>${modelSel}
      <div class="set-head dv-sub"><b>Głos</b></div>
      <div class="dv-voice">${voiceSel}<button class="dv-btn" data-act="tts-sample" ${AUD.busy.sample ? 'disabled' : ''} title="Posłuchaj próbki">${AUD.busy.sample ? '<i class="dv-spin"></i>' : '▶ Próbka'}</button></div>
      ${hint ? `<p class="set-hint">${hint}</p>` : ''}` : needLoad && !AUD.loadErr ? '<p class="set-hint">Wczytuję modele i głosy…</p>' : ''}
    </section>

    ${ready ? `
    <div class="segmented two kind-seg">
      <button class="seg ${AUD.kind === 'words' ? 'on' : ''}" data-act="tts-kind" data-kind="words">Słówka<span>${words.length - nPhr}</span></button>
      <button class="seg ${AUD.kind === 'phrases' ? 'on' : ''}" data-act="tts-kind" data-kind="phrases">Zwroty<span>${nPhr}</span></button>
    </div>
    ${missing.length ? `
    <button class="cv-learn dv-bulk" data-act="${b ? 'tts-stop' : 'tts-bulk'}"><span>${b ? `Nagrywam ${b.done}/${b.total}… (zatrzymaj)` : `${L.flag} Nagraj brakujące (${missing.length}) · ≈ ${ttsCostLabel(bulkCost)}`}</span></button>` : `<p class="card muted center">Wszystko ma nagranie ${L.flag} 🎉</p>`}
    ${Object.entries(groups).map(([t, ws]) => `
      <h2 class="section-title">${esc(t)} <span class="dv-count">${ws.filter((w) => hasAudio(lang, ttsText(w, lang))).length}/${ws.length}</span></h2>
      <section class="card dv-list">${ws.map(ttsRow).join('')}</section>`).join('')}` : ''}`;
}

function viewDev() {
  if (DEV && AUD.tab === 'audio') return devHead() + viewDevAudio();
  if (!DEV) {
    return `
    <header class="page-head"><button class="icon-round" data-view="profile" aria-label="Wróć">${ICON.back}</button><h1>Panel dewelopera</h1><span class="page-head-spacer"></span></header>
    <p class="card muted">Panel działa tylko przy uruchomieniu przez <b>start.bat</b> (lokalny serwer z kluczem OpenRouter).</p>`;
  }
  const missing = devMissing();
  const own = Object.keys(DEV.extra || {}).map((id) => byId.get(id)).filter(Boolean);
  // Twoje ikony (oryginały, jeszcze bez nowej wersji z panelu) — wg tematów
  const base = words.filter((w) => !isPhrase(w) && BASE_WORD_IMG[w.id] && !(DEV.extra || {})[w.id]);
  const baseTopics = [...new Set(base.map((w) => w.topic))];
  const baseTopic = baseTopics.includes(DEVS.topic) ? DEVS.topic : '';
  const groups = {};
  for (const w of missing) (groups[w.topic] = groups[w.topic] || []).push(w);
  const b = DEVS.bulk;
  return `${devHead()}

    <section class="plan-preview">
      <span class="overline light">Ikony słówek · OpenRouter</span>
      <div class="pp-stats">
        <div><b>${missing.length}</b><span>bez ikony</span></div>
        <div><b>${own.length}</b><span>z panelu</span></div>
        <div><b>${DEV.credits != null ? '$' + DEV.credits : '—'}</b><span>na koncie</span></div>
      </div>
      <p class="pp-forecast">${ICON.target}<span>${DEV.hasKey ? `Rysuje ${esc(MODEL_LABEL[DEVS.model] || DEVS.model)}${/recraft|ming/.test(DEVS.model) ? ' (bez wzorów — styl z opisu)' : ' w stylu Twoich ikon (wzory: friend, Polska, Mrs)'}. Tylko słówka — zwroty są bez ikon. ${iconPrice() ? `Ok. $${+iconPrice().toFixed(3)} za ikonę` : 'Za darmo'}${DEVS.spent ? ` · w tej sesji: $${DEVS.spent.toFixed(2)}` : ''}.` : 'Brak klucza OpenRouter — zobacz .dev-config.json / .env.local (tools/server.js).'}</span></p>
    </section>

    ${DEV.hasKey ? `
    <section class="card set-card">
      <div class="set-head">${setIcon('sparkle', ['#E7E0FF', '#5A3FE0'])}<b>Model</b></div>
      <div class="segmented" role="radiogroup" aria-label="Model">
        ${DEV.models.map((m) => `<button class="seg ${DEVS.model === m ? 'on' : ''}" data-act="dev-model" data-model="${esc(m)}">${esc(MODEL_LABEL[m] || m)}</button>`).join('')}
      </div>
      <p class="set-hint">Muse Image (Meta) — domyślny (ok. $0,01), rysuje na podstawie Twoich wzorów. Recraft V4.1 — ładne ikony 3D (ok. $0,035, bez wzorów). Ming — darmowy, bez wzorów. Gemini — do porównania (ok. $0,04–0,08).</p>
      <div class="set-row dv-muse">
        ${setIcon('sparkle', ['#FFE8D2', '#A5460A'])}
        <div class="set-text"><b>Opis przez Muse</b><span>Najpierw Muse Spark 1.3 pisze opis sceny (co narysować), potem wybrany model rysuje. Przydaje się przy trudnych słowach (he, it, what). Dodatkowo ok. $0,003.</span></div>
        <button class="switch ${db.settings.devMuse ? 'on' : ''}" role="switch" aria-checked="${!!db.settings.devMuse}" aria-label="Opis przez Muse" data-act="dev-muse"><span></span></button>
      </div>
    </section>

    ${missing.length ? `
    <button class="cv-learn dv-bulk" data-act="${b ? 'dev-stop' : 'dev-bulk'}"><span>${b ? `Generuję ${b.done}/${b.total}… (zatrzymaj)` : `Generuj wszystkie brakujące (${missing.length})${iconPrice() ? ` · ≈ $${(missing.length * iconPrice()).toFixed(2)}` : " · za darmo"}`}</span></button>` : '<p class="card muted center">Wszystkie słówka mają ikony 🎉</p>'}

    ${Object.entries(groups).map(([t, ws]) => `
      <h2 class="section-title">${esc(t)} <span class="dv-count">${ws.length}</span></h2>
      <section class="card dv-list">${ws.map(devRow).join('')}</section>`).join('')}

    ${own.length ? `
      <h2 class="section-title">Dodane w panelu <span class="dv-count">${own.length}</span></h2>
      <section class="card dv-list">${own.map(devRow).join('')}</section>` : ''}

    ${base.length ? `
      <h2 class="section-title">Twoje ikony — nowa wersja <span class="dv-count">${base.length}</span></h2>
      <p class="dv-hint">Wybierz temat i kliknij „↻ Nowa wersja”. Oryginał nie znika — przy nowej ikonie jest ↺, które go przywraca.</p>
      <div class="dv-topics">${baseTopics.map((t) => `<button class="lk-chip ${t === baseTopic ? 'on' : ''}" data-act="dev-topic" data-topic="${esc(t)}">${esc(t)} · ${base.filter((w) => w.topic === t).length}</button>`).join('')}</div>
      ${baseTopic ? `<section class="card dv-list">${base.filter((w) => w.topic === baseTopic).map(devRow).join('')}</section>` : ''}` : ''}` : ''}`;
}
