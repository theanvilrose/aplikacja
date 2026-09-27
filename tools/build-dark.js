// Tworzy dark.css — ciemny motyw wyliczony z jasnych stylów (styles.css, plan-hero.css, packs.css, tasks.css).
// Jasne tła → ciemne w tym samym odcieniu, ciemny tekst → jasny; kolory marki (fiolet, zieleń przycisków) zostają.
// Uruchom po zmianie kolorów w CSS:  node tools/build-dark.js   (test sprawdza, czy dark.css jest aktualny)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCES = ['styles.css', 'plan-hero.css', 'packs.css', 'tasks.css'];
const OUT = path.join(ROOT, 'dark.css');
const DARK = ':root[data-theme="dark"]';

// ---------- kolory ----------
function parseColor(s) {
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4];
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return null;
}
function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
function fromHsl({ h, s, l }) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return { r: f(0), g: f(8), b: f(4) };
}
const fmt = ({ r, g, b }, a) => (a < 1 ? `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})` : `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`);

// kind: 'bg' (tła, obramowania, cienie) albo 'text'
function darken(c, kind) {
  const { h, s, l } = toHsl(c);
  if (kind === 'text') {
    if (l <= 0.35) return fromHsl({ h, s: s * 0.4, l: 0.93 - l * 0.35 }); // ciemny tekst → jasny
    if (l < 0.62 && s < 0.35) return fromHsl({ h, s, l: Math.min(0.78, l + 0.2) }); // szary opis → jaśniejszy szary
    return null;
  }
  // jasne tło → ciemne w tym odcieniu; biel i szarości → fioletowa ciemność jak w palecie (--surface)
  if (l >= 0.78) return s < 0.08 ? fromHsl({ h: 252, s: 0.18, l: 0.14 + (1 - l) * 0.5 }) : fromHsl({ h, s: s * 0.55, l: 0.14 + (1 - l) * 0.5 });
  return null;
}

function mapValue(value, kind) {
  let changed = false;
  const out = value.replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi, (m) => {
    const c = parseColor(m);
    if (!c) return m;
    // cienie z czerni zostają; półprzezroczysta biel (szkło) → ciemne szkło
    const d = darken(c, kind);
    if (!d) return m;
    changed = true;
    return fmt(d, c.a);
  });
  return changed ? out : null;
}

const PROPS = {
  color: 'text', fill: 'text', stroke: 'text', 'caret-color': 'text',
  background: 'bg', 'background-color': 'bg', 'background-image': 'bg',
  border: 'bg', 'border-color': 'bg', 'border-top': 'bg', 'border-bottom': 'bg', 'border-left': 'bg', 'border-right': 'bg',
  'border-top-color': 'bg', 'border-bottom-color': 'bg', 'outline': 'bg', 'outline-color': 'bg',
  'box-shadow': 'bg', 'text-shadow': 'bg',
};

// ---------- prosty parser CSS (reguły, @media; @keyframes pomijamy) ----------
function parseBlocks(css) {
  const blocks = [];
  let i = 0;
  const skipWs = () => { while (i < css.length && /\s/.test(css[i])) i++; };
  while (i < css.length) {
    skipWs();
    if (css.startsWith('/*', i)) { i = css.indexOf('*/', i) + 2; continue; }
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    if (head.startsWith('@media')) blocks.push({ media: head, rules: parseBlocks(body) });
    else if (!head.startsWith('@')) blocks.push({ sel: head, body });
    i = j;
  }
  return blocks;
}

function darkSelector(sel) {
  return sel.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
    if (x.startsWith(':root')) return x.replace(':root', DARK);
    if (/^(html|body)\b/.test(x)) return `${DARK} ${x}`.replace(`${DARK} html`, `${DARK}`);
    return `${DARK} ${x}`;
  }).join(', ');
}

function convertRule(r) {
  if (/data-theme/.test(r.sel)) return ''; // ręczne reguły ciemne zostają w źródłach
  const decls = [];
  for (const d of r.body.replace(/\/\*[\s\S]*?\*\//g, '').split(';')) {
    const k = d.indexOf(':');
    if (k < 0) continue;
    const prop = d.slice(0, k).trim().toLowerCase(), value = d.slice(k + 1).trim();
    const kind = PROPS[prop];
    if (!kind || /var\(/.test(value)) continue;
    const v = mapValue(value, kind);
    if (v) decls.push(`${prop}: ${v}`);
  }
  return decls.length ? `${darkSelector(r.sel)} { ${decls.join('; ')}; }` : '';
}

function render() {
  const parts = ['/* Wygenerowane przez tools/build-dark.js — nie edytuj ręcznie. Ciemny motyw: <html data-theme="dark">. */'];
  for (const file of SOURCES) {
    const blocks = parseBlocks(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    const lines = [];
    for (const b of blocks) {
      if (b.media) {
        const inner = b.rules.filter((r) => r.sel).map(convertRule).filter(Boolean);
        if (inner.length) lines.push(`${b.media} {\n  ${inner.join('\n  ')}\n}`);
      } else {
        const x = convertRule(b);
        if (x) lines.push(x);
      }
    }
    if (lines.length) parts.push(`\n/* ${file} */\n${lines.join('\n')}`);
  }
  return parts.join('\n') + '\n';
}

function build() {
  const text = render();
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (old !== text) fs.writeFileSync(OUT, text);
  return old !== text;
}

module.exports = { render, build, darken, parseColor };
if (require.main === module) {
  const changed = build();
  console.log(`dark.css: ${render().split('\n').filter((l) => l.includes('{')).length} reguł${changed ? ' (zaktualizowano)' : ''}`);
}
