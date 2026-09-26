// Lokalny serwer Słowika: pliki aplikacji + panel dewelopera (generowanie ikon słówek przez OpenRouter).
// Uruchamia go start.bat. Adres http://localhost:8765 (tylko ten komputer).
//
// Klucz OpenRouter NIGDY nie trafia do przeglądarki ani do repozytorium. Serwer szuka go kolejno w:
//   1. zmiennej środowiskowej OPENROUTER_API_KEY,
//   2. pliku .env.local w folderze aplikacji (linia OPENROUTER_API_KEY=...),
//   3. pliku wskazanym w .dev-config.json → { "keyFile": "C:\\...\\klucz.txt" }.
// .env.local i .dev-config.json są w .gitignore.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = +process.env.PORT || 8765; // inny port tylko do testów
const WORDS_DIR = path.join(ROOT, 'assets', 'words');
const EXTRA_FILE = path.join(ROOT, 'js', 'word-icons-extra.js');
const DEFAULT_MODEL = 'google/gemini-2.5-flash-image';
const MODELS = ['google/gemini-2.5-flash-image', 'google/gemini-3.1-flash-lite-image', 'google/gemini-3.1-flash-image'];
// ikony-wzory stylu wysyłane do modelu razem z opisem słowa
const STYLE_REFS = ['friend.png', 'polska.png', 'mrs.png'];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8',
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

async function generate(w, model, useMuse) {
  const refs = STYLE_REFS.filter((f) => fs.existsSync(path.join(WORDS_DIR, f))).map((f) => ({ type: 'image_url', image_url: { url: dataUrl(f) } }));
  let brief = '', museCost = 0;
  if (useMuse) ({ brief, cost: museCost } = await museBrief(w, refs));
  const content = [
    { type: 'text', text: prompt(w) + (brief ? ` Scene to draw: ${brief}` : '') },
    ...refs,
  ];
  const res = await openrouter('POST', '/chat/completions', {
    model: MODELS.includes(model) ? model : DEFAULT_MODEL,
    modalities: ['image', 'text'],
    messages: [{ role: 'user', content }],
    usage: { include: true },
  });
  const msg = res.choices && res.choices[0] && res.choices[0].message;
  const img = msg && msg.images && msg.images[0] && msg.images[0].image_url && msg.images[0].image_url.url;
  if (!img) throw new Error('Model nie zwrócił obrazka' + (msg && msg.content ? `: ${String(msg.content).slice(0, 120)}` : ''));
  return { image: img, cost: ((res.usage && res.usage.cost) || 0) + museCost, brief };
}

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
      return json(res, 200, { ok: true, hasKey, credits, models: MODELS, model: DEFAULT_MODEL, muse: MUSE_MODEL, extra: readExtra() });
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
  console.log(`Słowik: http://localhost:${PORT}  (panel dewelopera: ${readKey() ? 'klucz OpenRouter znaleziony' : 'brak klucza — generowanie ikon wyłączone'})`);
});
