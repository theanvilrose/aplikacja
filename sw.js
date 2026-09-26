// Service worker: aplikacja działa offline po pierwszym uruchomieniu.
const CACHE = 'slowik-v21';
const FILES = [
  './', 'index.html', 'styles.css', 'plan-hero.css', 'packs.css', 'tasks.css', 'manifest.webmanifest', 'icon.svg',
  'js/seed-words.js', 'js/seed-lessons.js', 'js/parser.js', 'js/answer.js', 'js/exercises.js', 'js/srs.js', 'js/icons.js', 'js/app.js',
  'assets/plan-rocket.webp', 'assets/stat-check.png', 'assets/stat-gem.png', 'assets/stat-flame.png',
  'assets/task-refresh.png', 'assets/task-star.png', 'assets/task-clock.png', 'assets/task-chest.png',
  'assets/done-check.png', 'assets/gem-small.png',
  'assets/pk-biznes.webp', 'assets/pk-bledy.webp', 'assets/pk-czasowniki.webp', 'assets/pk-grzecznosci.webp', 'assets/pk-kraje.webp', 'assets/pk-ostatnia-lekcja.webp', 'assets/pk-pochodzenie.webp', 'assets/pk-podroze.webp', 'assets/pk-powitania.webp', 'assets/pk-pozegnania.webp', 'assets/pk-przedstawianie.webp', 'assets/pk-przymiotniki.webp', 'assets/pk-reagowanie.webp', 'assets/pk-rozmowki.webp', 'assets/pk-rzeczowniki.webp', 'assets/pk-samopoczucie.webp', 'assets/pk-swiat.webp', 'assets/pk-trudne.webp', 'assets/pk-wszystkie.webp',
  // ikony słówek używane w WORD_IMG (js/app.js); pozostałe z assets/words/ czekają na nowe słowa
  'assets/words/australia.png', 'assets/words/chiny.png', 'assets/words/francja.png', 'assets/words/hiszpania.png', 'assets/words/holandia.png', 'assets/words/indie.png', 'assets/words/kanada.png', 'assets/words/meksyk.png', 'assets/words/niemcy.png', 'assets/words/norwegia.png', 'assets/words/polska.png', 'assets/words/szwecja.png', 'assets/words/turcja.png', 'assets/words/wielka_brytania.png', 'assets/words/wlochy.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Najpierw sieć (świeże pliki), a bez internetu — kopia z pamięci.
// Pliki aplikacji zawsze sprawdzamy na serwerze (bez starej kopii przeglądarki), więc zmiany widać od razu, bez Ctrl+F5.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const own = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    (own ? fetch(e.request.url, { cache: 'no-cache' }) : fetch(e.request))
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
