// Lokalny serwer Słowika: pliki aplikacji + panel dewelopera (ikony i nagrania wymowy słówek przez OpenRouter).
// Uruchamia go start.bat. Adres http://localhost:8765 (tylko ten komputer).
//
// Klucz OpenRouter NIGDY nie trafia do przeglądarki ani do repozytorium. Serwer szuka go kolejno w:
//   1. zmiennej środowiskowej OPENROUTER_API_KEY,
//   2. pliku .env.local w folderze aplikacji (linia OPENROUTER_API_KEY=...),
//   3. pliku wskazanym w .dev-config.json → { "keyFile": "C:\\...\\klucz.txt" }.
// Klucz ElevenLabs (nagrania wymowy) — analogicznie: ELEVENLABS_API_KEY w środowisku albo w .env.local,
// albo plik wskazany w .dev-config.json → { "elevenKeyFile": "C:\\...\\kod eleven.txt" }.
// .env.local i .dev-config.json są w .gitignore.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PORT = +process.env.PORT || 8765; // inny port tylko do testów
const WORDS_DIR = path.join(ROOT, 'assets', 'words');
const EXTRA_FILE = path.join(ROOT, 'js', 'word-icons-extra.js');
const DEFAULT_MODEL = 'meta/muse-image';
// Meta Muse Image (domyślny) — generuje obrazki z tekstu i obrazków-wzorów; Gemini do porównania
const MODELS = ['meta/muse-image', 'google/gemini-2.5-flash-image', 'google/gemini-3.1-flash-lite-image', 'google/gemini-3.1-flash-image'];
// ikony-wzory stylu wysyłane do modelu razem z opisem słowa
const STYLE_REFS = ['friend.png', 'polska.png', 'mrs.png'];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.md': 'text/markdown; charset=utf-8',
};

function readKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
    const m = env.match(/^\s*OPENROUTER_API_KEY\s*=\s*(\S+)/m);
    if (m) return m[1].trim();
  } catch (e) { /* brak pliku */ }
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.dev-config.json'), 'utf8'));
    if (cfg.keyFile) return fs.readFileSync(cfg.keyFile, 'utf8').trim();
  } catch (e) { /* brak pliku */ }
  return '';
}

// surowe zapytanie — zwraca { status, type, headers, buf } (dźwięk przychodzi jako bajty, nie JSON)
function openrouterRaw(method, apiPath, body) {
  const key = readKey();
  if (!key) return Promise.reject(new Error('Brak klucza OpenRouter — zobacz komentarz na górze tools/server.js'));
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      host: 'openrouter.ai', path: '/api/v1' + apiPath, method,
      headers: {
        Authorization: 'Bearer ' + key, 'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:8765', 'X-Title': 'Slowik',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 120000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', headers: res.headers, buf: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => req.destroy(new Error('OpenRouter nie odpowiada (limit 2 min)')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function readElevenKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  try {
    const m = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^\s*ELEVENLABS_API_KEY\s*=\s*(\S+)/m);
    if (m) return m[1].trim();
  } catch (e) { /* brak pliku */ }
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.dev-config.json'), 'utf8'));
    if (cfg.elevenKeyFile) return fs.readFileSync(cfg.elevenKeyFile, 'utf8').trim();
  } catch (e) { /* brak pliku */ }
  return '';
}

// ElevenLabs — zwraca { status, type, headers, buf, json }
function eleven(method, apiPath, body) {
  const key = readElevenKey();
  if (!key) return Promise.reject(new Error('Brak klucza ElevenLabs — zapisz go w pliku „kod eleven.txt” na pulpicie'));
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      host: 'api.elevenlabs.io', path: apiPath, method,
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
      timeout: 120000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks), type = res.headers['content-type'] || '';
        let json = null;
        if (/json/.test(type)) try { json = JSON.parse(buf.toString('utf8')); } catch (e) { /* nie-JSON */ }
        resolve({ status: res.statusCode, type, headers: res.headers, buf, json });
      });
    });
    req.on('timeout', () => req.destroy(new Error('ElevenLabs nie odpowiada (limit 2 min)')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
const elevenErr = (r) => {
  const d = r.json && r.json.detail;
  return new Error('ElevenLabs ' + r.status + ': ' + ((d && (d.message || d.status)) || (typeof d === 'string' ? d : '') || r.buf.toString('utf8').slice(0, 160)));
};
async function elevenJson(method, apiPath, body) {
  const r = await eleven(method, apiPath, body);
  if (r.status >= 400 || !r.json) throw elevenErr(r);
  return r.json;
}

// lista modeli, Twoich głosów i stan kredytów
async function elevenInfo() {
  const [models, voices, sub] = await Promise.all([
    elevenJson('GET', '/v1/models'),
    elevenJson('GET', '/v2/voices?page_size=100'),
    elevenJson('GET', '/v1/user/subscription').catch(() => null),
  ]);
  return {
    models: models.filter((m) => m.can_do_text_to_speech).map((m) => ({
      id: m.model_id, name: m.name, langs: (m.languages || []).map((l) => l.language_id),
      mult: (m.model_rates && m.model_rates.character_cost_multiplier) || 1,
    })),
    voices: (voices.voices || []).map((v) => ({
      id: v.voice_id, name: v.name, category: v.category,
      accent: (v.labels && v.labels.accent) || '', gender: (v.labels && v.labels.gender) || '', language: (v.labels && v.labels.language) || '',
      langs: (v.verified_languages || []).map((l) => [l.language, l.accent || ''].join(':')),
      preview: v.preview_url || '',
    })),
    sub: sub && { used: sub.character_count, limit: sub.character_limit, tier: sub.tier },
  };
}

// głosy z publicznej biblioteki ElevenLabs — rodzimi lektorzy danego języka / akcentu
async function elevenShared(lang) {
  const q = lang === 'pl' ? 'language=pl' : 'language=en&accent=' + (lang === 'en-GB' ? 'british' : 'american');
  const r = await elevenJson('GET', '/v1/shared-voices?page_size=40&sort=trending&' + q);
  return (r.voices || []).map((v) => ({
    id: v.voice_id, owner: v.public_owner_id, name: v.name, accent: v.accent || '', gender: v.gender || '',
    desc: v.descriptive || v.use_case || '', preview: v.preview_url || '',
  }));
}

async function elevenTts({ text, model, voice, voiceName, owner, lang }) {
  if (!voice) throw new Error('Wybierz głos');
  let id = voice;
  // głos z biblioteki trzeba najpierw dodać do swojego konta (raz)
  if (owner) {
    const mine = await elevenJson('GET', '/v2/voices?page_size=100');
    const has = (mine.voices || []).find((v) => v.voice_id === voice || (v.sharing && v.sharing.original_voice_id === voice));
    if (has) id = has.voice_id;
    else id = (await elevenJson('POST', `/v1/voices/add/${owner}/${voice}`, { new_name: String(voiceName || 'Slowik voice').slice(0, 40) })).voice_id;
  }
  const req = { text: String(text).slice(0, 300), model_id: model || 'eleven_multilingual_v2', language_code: lang === 'pl' ? 'pl' : 'en' };
  let r = await eleven('POST', `/v1/text-to-speech/${id}?output_format=mp3_44100_128`, req);
  // nie każdy model przyjmuje language_code — wtedy bez niego
  if (r.status === 400 || r.status === 422) { delete req.language_code; r = await eleven('POST', `/v1/text-to-speech/${id}?output_format=mp3_44100_128`, req); }
  if (r.status >= 400 || !/audio/.test(r.type)) throw elevenErr(r);
  const chars = +(r.headers['character-cost'] || r.headers['x-character-count'] || String(text).length);
  return { audio: 'data:audio/mpeg;base64,' + r.buf.toString('base64'), ext: 'mp3', credits: chars, voiceId: id };
}

function openrouter(method, apiPath, body) {
  const key = readKey();
  if (!key) return Promise.reject(new Error('Brak klucza OpenRouter — zobacz komentarz na górze tools/server.js'));
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      host: 'openrouter.ai', path: '/api/v1' + apiPath, method,
      headers: {
        Authorization: 'Bearer ' + key, 'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:8765', 'X-Title': 'Slowik',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 120000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (e) { /* nie-JSON */ }
        if (res.statusCode >= 400 || !json) return reject(new Error((json && json.error && json.error.message) || `OpenRouter ${res.statusCode}`));
        resolve(json);
      });
    });
    req.on('timeout', () => req.destroy(new Error('OpenRouter nie odpowiada (limit 2 min)')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const dataUrl = (file) => 'data:image/png;base64,' + fs.readFileSync(path.join(WORDS_DIR, file)).toString('base64');

function prompt(w) {
  return [
    `Create ONE app icon for the English vocabulary word "${w.en}" (Polish meaning: "${w.pl}"${w.pos ? `, part of speech: ${w.pos}` : ''}${w.topic ? `, topic: ${w.topic}` : ''}).`,
    'Match the style of the reference icons EXACTLY: a rounded-square app tile filling almost the whole image,',
    'flat cartoon illustration with soft shading and clean dark outlines, one bright colorful tile background,',
    'a single clear subject in the center that shows the meaning, friendly and simple, like an app for learners.',
    'If the word is abstract (a pronoun, adjective, feeling or small word), show a person, gesture or emoji-like face that clearly illustrates it.',
    'Absolutely no text, letters, numbers or words in the picture. Outside the tile use a plain pure white background (no checkerboard, no shadow).',
    'Square image.',
  ].join(' ');
}

// Meta Muse (tylko tekst) — ogląda wzory i słowo, pisze krótki opis sceny, który potem rysuje model obrazkowy.
const MUSE_MODEL = 'meta/muse-spark-1.3';
async function museBrief(w, refs) {
  const res = await openrouter('POST', '/chat/completions', {
    model: MUSE_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: [
          `You design app icons for an English-learning app for Polish A1 learners. Word: "${w.en}" (Polish: "${w.pl}"${w.pos ? `, ${w.pos}` : ''}${w.topic ? `, topic: ${w.topic}` : ''}).`,
          'Look at the attached reference icons (the app style). Write ONE short illustration brief (max 50 words) for a new icon in exactly that style:',
          'what single subject or scene to draw so a learner instantly understands the meaning, the pose/gesture or objects, and one bright tile background color that differs from the references.',
          'No text or letters in the picture. Reply with the brief only.',
        ].join(' ') },
        ...refs,
      ],
    }],
    // Muse najpierw „myśli” — bez zapasu tokenów zwraca pustą odpowiedź
    max_tokens: 1200,
    reasoning: { effort: 'low', exclude: true },
    usage: { include: true },
  });
  const text = res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content;
  if (!text) throw new Error('Muse nie zwrócił opisu');
  return { brief: String(text).trim().replace(/^["']|["']$/g, '').slice(0, 600), cost: (res.usage && res.usage.cost) || 0 };
}

// gdyby model zwrócił link zamiast danych — pobieramy obrazek i oddajemy jako data URL
function fetchAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(`data:${res.headers['content-type'] || 'image/png'};base64,` + Buffer.concat(chunks).toString('base64')));
    }).on('error', reject);
  });
}

async function generate(w, model, useMuse) {
  const refs = STYLE_REFS.filter((f) => fs.existsSync(path.join(WORDS_DIR, f))).map((f) => ({ type: 'image_url', image_url: { url: dataUrl(f) } }));
  let brief = '', museCost = 0;
  if (useMuse) ({ brief, cost: museCost } = await museBrief(w, refs));
  const content = [
    { type: 'text', text: prompt(w) + (brief ? ` Scene to draw: ${brief}` : '') },
    ...refs,
  ];
  const m = MODELS.includes(model) ? model : DEFAULT_MODEL;
  if (m === 'meta/muse-image') {
    // Meta Muse Image: osobny endpoint /images; wzory stylu w input_references
    const r = await openrouter('POST', '/images', {
      model: m,
      prompt: prompt(w) + (brief ? ` Scene to draw: ${brief}` : ''),
      input_references: refs,
      aspect_ratio: '1:1',
      output_format: 'png',
      n: 1,
    });
    const d = (r.data && r.data[0]) || (r.images && r.images[0]) || {};
    const b64 = d.b64_json || d.base64 || (d.image && d.image.b64_json);
    const url = d.url || (d.image_url && d.image_url.url) || (typeof d === 'string' ? d : '');
    const image = b64 ? `data:image/png;base64,${b64}` : url.startsWith('data:') ? url : url ? await fetchAsDataUrl(url) : '';
    if (!image) throw new Error('Muse Image nie zwrócił obrazka: ' + JSON.stringify(r).slice(0, 200));
    return { image, cost: ((r.usage && r.usage.cost) || 0) + museCost, brief };
  }
  const res = await openrouter('POST', '/chat/completions', {
    model: m,
    // Muse Image zwraca wyłącznie obrazek
    modalities: m === 'meta/muse-image' ? ['image'] : ['image', 'text'],
    messages: [{ role: 'user', content }],
    usage: { include: true },
  });
  const msg = res.choices && res.choices[0] && res.choices[0].message;
  const img = msg && msg.images && msg.images[0] && msg.images[0].image_url && msg.images[0].image_url.url;
  if (!img) throw new Error('Model nie zwrócił obrazka' + (msg && msg.content ? `: ${String(msg.content).slice(0, 120)}` : ''));
  return { image: img, cost: ((res.usage && res.usage.cost) || 0) + museCost, brief };
}

// ---------- wymowa: nagrania słówek (modele „speech” z OpenRouter) ----------
// Nagrania: assets/audio/<język>/<nazwa>.mp3|wav, spis w js/word-audio.js
// (window.WORD_AUDIO = { 'en-US': { tekst: plik }, 'en-GB': {…}, pl: {…} }).
const AUDIO_DIR = path.join(ROOT, 'assets', 'audio');
const AUDIO_FILE = path.join(ROOT, 'js', 'word-audio.js');
const TTS_LANGS = ['en-US', 'en-GB', 'pl'];
// akcent i język idą do modelu jako instrukcja (nie jest czytana na głos)
const TTS_INSTR = {
  'en-US': 'Speak with a natural General American English accent, like a native speaker from the USA. Clear, calm, slightly slow — a pronunciation example for learners.',
  'en-GB': 'Speak with a natural British English accent (Received Pronunciation), like a native speaker from London. Clear, calm, slightly slow — a pronunciation example for learners.',
  pl: 'Speak natural native Polish, like a Polish voice-over artist. Clear, calm, slightly slow.',
};
// polecane na górze listy; reszta w kolejności OpenRouter
const TTS_TOP = ['google/gemini-3.8-flash-tts', 'google/gemini-3.8-flash-lite-tts', 'microsoft/mai-voice-2', 'hexgrad/kokoro-82m', 'fish-audio/s2.1-pro', 'deepgram/aura-2'];
let ttsCache = null;
async function ttsModels() {
  if (ttsCache && Date.now() - ttsCache.at < 3600e3) return ttsCache.list;
  const r = await openrouter('GET', '/models?output_modalities=speech');
  const list = (r.data || []).map((m) => ({
    id: m.id,
    name: String(m.name || m.id).replace(/^[^:]+:\s*/, ''),
    prompt: +((m.pricing && m.pricing.prompt) || 0),
    completion: +((m.pricing && m.pricing.completion) || 0),
    voices: m.supported_voices || [],
  })).sort((a, b) => ((TTS_TOP.indexOf(a.id) + 1) || 99) - ((TTS_TOP.indexOf(b.id) + 1) || 99));
  ttsCache = { at: Date.now(), list };
  return list;
}

// surowe PCM (16 bit, mono) → WAV; przy okazji ucinamy ciszę na początku i końcu
function pcmToWav(pcm, rate) {
  const n = pcm.length >> 1, thr = 500, pad = Math.round(rate * 0.08);
  let a = 0, b = n - 1;
  while (a < n && Math.abs(pcm.readInt16LE(a * 2)) < thr) a++;
  while (b > a && Math.abs(pcm.readInt16LE(b * 2)) < thr) b--;
  const data = a >= b ? pcm.subarray(0, n * 2) : pcm.subarray(Math.max(0, a - pad) * 2, Math.min(n, b + pad + 1) * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

async function tts({ text, model, voice, lang }) {
  const models = await ttsModels();
  const m = models.find((x) => x.id === model) || models[0];
  if (!m) throw new Error('OpenRouter nie ma modeli mowy');
  const pcm = /gemini/i.test(m.id); // Gemini TTS oddaje tylko surowe PCM
  const req = { model: m.id, input: String(text).slice(0, 300), response_format: pcm ? 'pcm' : 'mp3', instructions: TTS_INSTR[lang] || TTS_INSTR['en-US'] };
  if (voice) req.voice = voice; else if (m.voices.length) req.voice = m.voices[0];
  let r = await openrouterRaw('POST', '/audio/speech', req);
  // część dostawców nie przyjmuje instrukcji — wtedy jeszcze raz bez nich
  if (r.status === 400) { delete req.instructions; r = await openrouterRaw('POST', '/audio/speech', req); }
  if (r.status >= 400 || /json/.test(r.type)) {
    let msg = `OpenRouter ${r.status}`;
    try { msg = JSON.parse(r.buf.toString('utf8')).error.message || msg; } catch (e) { /* nie-JSON */ }
    if (/Provider returned 4/.test(msg)) msg += ' — ten model nie obsługuje tego głosu albo języka';
    throw new Error(msg);
  }
  let buf = r.buf, ext = 'mp3', mime = 'audio/mpeg';
  if (/pcm/.test(r.type) || pcm) {
    const rate = +((r.type.match(/rate=(\d+)/) || [])[1] || 24000);
    buf = pcmToWav(buf, rate); ext = 'wav'; mime = 'audio/wav';
  } else if (/wav/.test(r.type)) { ext = 'wav'; mime = 'audio/wav'; }
  // koszt: szacunek z cennika (dokładny koszt OpenRouter wylicza dopiero po chwili)
  const cost = m.prompt * String(text).length + m.completion * 50;
  return { audio: `data:${mime};base64,` + buf.toString('base64'), ext, cost };
}

function readAudio() {
  try {
    const m = fs.readFileSync(AUDIO_FILE, 'utf8').match(/window\.WORD_AUDIO\s*=\s*(\{[\s\S]*\});/);
    return m ? JSON.parse(m[1]) : {};
  } catch (e) { return {}; }
}
function writeAudio(map) {
  const out = {};
  for (const l of TTS_LANGS) out[l] = Object.fromEntries(Object.entries(map[l] || {}).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(AUDIO_FILE, '// Nagrania wymowy dodane w panelu dewelopera (tools/server.js) — nie edytuj ręcznie.\n' +
    'window.WORD_AUDIO = ' + JSON.stringify(out, null, 1) + ';\n');
}
const audioKey = (t) => String(t || '').trim().toLowerCase();
const audioName = (t) => (audioKey(t).normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'x') +
  '_' + crypto.createHash('md5').update(audioKey(t)).digest('hex').slice(0, 6);

// Ikony dodane z panelu: js/word-icons-extra.js (window.EXTRA_WORD_IMG) — aplikacja dokłada je do WORD_IMG.
function readExtra() {
  try {
    const m = fs.readFileSync(EXTRA_FILE, 'utf8').match(/window\.EXTRA_WORD_IMG\s*=\s*(\{[\s\S]*\});/);
    return m ? JSON.parse(m[1]) : {};
  } catch (e) { return {}; }
}
function writeExtra(map) {
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(EXTRA_FILE, '// Ikony słówek dodane w panelu dewelopera (tools/server.js) — nie edytuj ręcznie.\n' +
    'window.EXTRA_WORD_IMG = ' + JSON.stringify(sorted, null, 1) + ';\n');
}
const slug = (id) => 'gen_' + id.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

function body(req, limit = 4e6) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('Za duże dane')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

async function api(req, res, url) {
  // tylko z tego komputera i tylko z samej aplikacji (bez obcych stron)
  const origin = req.headers.origin;
  if (origin && origin !== `http://localhost:${PORT}` && origin !== `http://127.0.0.1:${PORT}`) return json(res, 403, { error: 'Niedozwolone źródło' });
  try {
    if (url.pathname === '/api/dev/status' && req.method === 'GET') {
      const hasKey = !!readKey();
      let credits = null;
      if (hasKey) {
        try { const c = await openrouter('GET', '/credits'); credits = c.data ? +(c.data.total_credits - c.data.total_usage).toFixed(2) : null; } catch (e) { /* bez salda */ }
      }
      return json(res, 200, { ok: true, hasKey, credits, models: MODELS, model: DEFAULT_MODEL, muse: MUSE_MODEL, extra: readExtra(), audio: readAudio() });
    }
    if (url.pathname === '/api/dev/eleven' && req.method === 'GET') {
      if (!readElevenKey()) return json(res, 200, { hasKey: false });
      return json(res, 200, { hasKey: true, ...(await elevenInfo()) });
    }
    if (url.pathname === '/api/dev/eleven-shared' && req.method === 'GET') {
      return json(res, 200, { voices: await elevenShared(url.searchParams.get('lang')) });
    }
    if (url.pathname === '/api/dev/tts-models' && req.method === 'GET') {
      return json(res, 200, { models: await ttsModels() });
    }
    if (url.pathname === '/api/dev/tts' && req.method === 'POST') {
      const q = JSON.parse((await body(req)).toString('utf8'));
      if (!q.text || !TTS_LANGS.includes(q.lang)) return json(res, 400, { error: 'Brak tekstu albo języka' });
      return json(res, 200, q.provider === 'eleven' ? await elevenTts(q) : await tts(q));
    }
    if (url.pathname === '/api/dev/tts-save' && req.method === 'POST') {
      const { lang, text, audio } = JSON.parse((await body(req, 8e6)).toString('utf8'));
      const m = String(audio || '').match(/^data:audio\/(mpeg|wav);base64,([A-Za-z0-9+/=]+)$/);
      if (!TTS_LANGS.includes(lang) || !audioKey(text) || !m) return json(res, 400, { error: 'Złe nagranie' });
      const map = readAudio(); map[lang] = map[lang] || {};
      const old = map[lang][audioKey(text)];
      if (old) { const f = path.join(AUDIO_DIR, old); if (fs.existsSync(f)) fs.unlinkSync(f); }
      const file = `${lang}/${audioName(text)}.${m[1] === 'wav' ? 'wav' : 'mp3'}`;
      fs.mkdirSync(path.join(AUDIO_DIR, lang), { recursive: true });
      fs.writeFileSync(path.join(AUDIO_DIR, file), Buffer.from(m[2], 'base64'));
      map[lang][audioKey(text)] = file; writeAudio(map);
      return json(res, 200, { ok: true, file });
    }
    if (url.pathname === '/api/dev/tts-remove' && req.method === 'POST') {
      const { lang, text } = JSON.parse((await body(req)).toString('utf8'));
      const map = readAudio(), file = map[lang] && map[lang][audioKey(text)];
      if (file) { const f = path.join(AUDIO_DIR, file); if (fs.existsSync(f)) fs.unlinkSync(f); delete map[lang][audioKey(text)]; writeAudio(map); }
      return json(res, 200, { ok: true });
    }
    if (url.pathname === '/api/dev/generate' && req.method === 'POST') {
      const { word, model, muse } = JSON.parse((await body(req)).toString('utf8'));
      if (!word || !word.id || !word.en) return json(res, 400, { error: 'Brak słowa' });
      return json(res, 200, await generate(word, model, !!muse));
    }
    if (url.pathname === '/api/dev/save' && req.method === 'POST') {
      const { id, png } = JSON.parse((await body(req, 3e6)).toString('utf8'));
      const m = String(png || '').match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
      if (!id || !m) return json(res, 400, { error: 'Zły obrazek' });
      const name = slug(id);
      fs.writeFileSync(path.join(WORDS_DIR, name + '.png'), Buffer.from(m[1], 'base64'));
      const map = readExtra(); map[id] = name; writeExtra(map);
      return json(res, 200, { ok: true, file: name });
    }
    if (url.pathname === '/api/dev/remove' && req.method === 'POST') {
      const { id } = JSON.parse((await body(req)).toString('utf8'));
      const map = readExtra();
      if (map[id]) { const f = path.join(WORDS_DIR, map[id] + '.png'); if (fs.existsSync(f)) fs.unlinkSync(f); delete map[id]; writeExtra(map); }
      return json(res, 200, { ok: true });
    }
    json(res, 404, { error: 'Nie ma takiego polecenia' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  // nic spoza folderu aplikacji i żadnych ukrytych plików (.env.local, .dev-config.json, .git)
  if (!file.startsWith(ROOT + path.sep) || /[\\/]\./.test(file.slice(ROOT.length))) { res.writeHead(403); return res.end('Brak dostępu'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Nie znaleziono'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res, url);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Słowik: http://localhost:${PORT}  (panel dewelopera: ${readKey() ? 'klucz OpenRouter znaleziony' : 'brak klucza OpenRouter'}, ${readElevenKey() ? 'klucz ElevenLabs znaleziony' : 'brak klucza ElevenLabs'})`);
});
