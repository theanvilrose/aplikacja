// Service worker: aplikacja działa offline po pierwszym uruchomieniu.
// Pliki aplikacji → pamięć CACHE (nowa przy każdej wersji). Ikony słówek i nagrania → osobna pamięć MEDIA
// (lista w sw-assets.js, tworzy ją tools/build-assets.js) — pobierane raz, w tle, bez blokowania instalacji.
importScripts('sw-assets.js');
const MEDIA = 'slowik-media';
const isMedia = (p) => p.includes('/assets/words/') || p.includes('/assets/audio/');
const CACHE = 'slowik-v80';
const FILES = [
  './', 'index.html', 'sw-assets.js', 'styles.css', 'plan-hero.css', 'packs.css', 'tasks.css', 'dark.css', 'manifest.webmanifest', 'icon.svg',
  'js/seed-words.js', 'js/seed-lessons.js', 'js/parser.js', 'js/answer.js', 'js/builder.js', 'js/sync.js', 'js/exercises.js', 'js/srs.js', 'js/icons.js', 'js/word-icons.js', 'js/word-icons-extra.js', 'js/word-audio.js',
  'js/app/core.js', 'js/app/session.js', 'js/app/views.js', 'js/app/word.js', 'js/app/dev.js', 'js/app/actions.js',
  'assets/plan-rocket.webp', 'assets/hero-audio.png', 'assets/hero-words.png', 'assets/hero-profile.png', 'assets/hero-plan.png', 'assets/hero-tasks.png', 'assets/hero-packs.png',
  'assets/ui/gradcap.png', 'assets/ui/trophy.png', 'assets/ui/globe.png', 'assets/ui/cup.png', 'assets/ui/suitcase.png', 'assets/ui/book.png', 'assets/ui/medal.png', 'assets/ui/cards.png', 'assets/ui/girl.png', 'assets/ui/ear.png', 'assets/ui/chest.png', 'assets/ui/speaker.png', 'assets/ui/voc-learn.png', 'assets/ui/voc-mistakes.png', 'assets/ui/voc-mine.png', 'assets/ui/voc-all.png', 'assets/ui/voc-lists.png', 'assets/ui/voc-topics.png', 'assets/ui/voc-fav.png', 'assets/ui/promo-install.png', 'assets/ui/promo-listen.png', 'assets/ui/promo-sync.png', 'assets/ui/promo-backup.png', 'assets/ui/turtle.png',
  'assets/ui/ex-en2pl.png', 'assets/ui/ex-truefalse.png', 'assets/ui/ex-pic4.png', 'assets/ui/ex-pairs.png', 'assets/ui/ex-pl2en.png', 'assets/ui/ex-listen2pl.png', 'assets/ui/ex-build.png', 'assets/ui/ex-type.png', 'assets/ui/ex-dictation.png', 'assets/stat-check.png', 'assets/stat-gem.png', 'assets/stat-flame.png',
  'assets/task-refresh.png', 'assets/task-star.png', 'assets/task-clock.png', 'assets/task-chest.png',
  'assets/done-check.png', 'assets/gem-small.png',
  'assets/pk-biznes.png', 'assets/pk-bledy.png', 'assets/pk-czasowniki.png', 'assets/pk-grzecznosci.png', 'assets/pk-kraje.png', 'assets/pk-listy.png', 'assets/pk-ostatnia-lekcja.png', 'assets/pk-pochodzenie.png', 'assets/pk-podroze.png', 'assets/pk-powitania.png', 'assets/pk-pozegnania.png', 'assets/pk-przedstawianie.png', 'assets/pk-przymiotniki.png', 'assets/pk-reagowanie.png', 'assets/pk-rozmowki.png', 'assets/pk-rzeczowniki.png', 'assets/pk-samopoczucie.png', 'assets/pk-swiat.png', 'assets/pk-trudne.png', 'assets/pk-wszystkie.png',
];

// brakujące ikony i nagrania — po kilka naraz; pojedynczy błąd (np. brak sieci) nie psuje instalacji
async function fillMedia() {
  const cache = await caches.open(MEDIA);
  const todo = [];
  for (const f of self.ASSET_FILES || []) if (!(await cache.match(f))) todo.push(f);
  const next = async () => {
    for (let f = todo.shift(); f; f = todo.shift()) {
      try { const res = await fetch(f, { cache: 'no-cache' }); if (res.ok) await cache.put(f, res); } catch (e) { /* spróbujemy przy następnej wersji */ }
    }
  };
  await Promise.all(Array.from({ length: 6 }, next));
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      // porządki: z pamięci MEDIA znikają pliki, których nie ma już na liście; brakujące dociągamy w tle
      .then(async () => {
        const keep = new Set((self.ASSET_FILES || []).map((f) => new URL(f, self.registration.scope).href));
        const cache = await caches.open(MEDIA);
        for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
      })
  );
  fillMedia();
});

// strona przy każdym starcie prosi o dociągnięcie brakujących plików (np. przerwane pobieranie, nowe nagrania)
self.addEventListener('message', (e) => {
  if (e.data === 'fill-media') e.waitUntil(fillMedia());
});

// strona przy każdym starcie prosi o dociągnięcie brakujących plików (np. przerwane pobieranie, nowe nagrania)
self.addEventListener('message', (e) => {
  if (e.data === 'fill-media') e.waitUntil(fillMedia());
});

// Najpierw sieć (świeże pliki), a bez internetu — kopia z pamięci.
// Pliki aplikacji zawsze sprawdzamy na serwerze (bez starej kopii przeglądarki), więc zmiany widać od razu, bez Ctrl+F5.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.startsWith('/api/')) return; // panel dewelopera — zawsze prosto z serwera
  const own = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    (own ? fetch(e.request.url, { cache: 'no-cache' }) : fetch(e.request))
      .then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(own && isMedia(new URL(e.request.url).pathname) ? MEDIA : CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
