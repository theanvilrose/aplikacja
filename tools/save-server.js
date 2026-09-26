// Pomocniczy serwer do wycinania grafik z projektu (design/plan-mockup.jpg).
// Użycie: node tools/save-server.js, potem otwórz http://127.0.0.1:8766/
// Strona tools/cutter.html wycina ikony i ilustrację, a serwer zapisuje je do assets/.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets');
fs.mkdirSync(OUT, { recursive: true });

const STATIC = {
  '/': ['tools/cutter.html', 'text/html; charset=utf-8'],
  '/mockup.jpg': ['design/plan-mockup.jpg', 'image/jpeg'],
  '/packs': ['tools/cut-packs.html', 'text/html; charset=utf-8'],
  '/sheet.jpg': ['design/pack-icons.jpg', 'image/jpeg'],
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && STATIC[url.pathname]) {
    const [file, type] = STATIC[url.pathname];
    res.setHeader('Content-Type', type);
    return res.end(fs.readFileSync(path.join(ROOT, file)));
  }
  const name = url.searchParams.get('name') || '';
  if (req.method !== 'POST' || url.pathname !== '/save' || !/^[a-z0-9-]+\.(png|webp)$/.test(name)) {
    res.statusCode = 404;
    return res.end('not found');
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const buf = Buffer.concat(chunks);
    fs.writeFileSync(path.join(OUT, name), buf);
    res.end(`${name} (${buf.length} B)`);
  });
}).listen(8766, '127.0.0.1', () => console.log('save-server na http://127.0.0.1:8766'));
