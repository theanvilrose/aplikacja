// Service worker: aplikacja działa offline po pierwszym uruchomieniu.
const CACHE = 'slowik-v24';
const FILES = [
  './', 'index.html', 'styles.css', 'plan-hero.css', 'packs.css', 'tasks.css', 'manifest.webmanifest', 'icon.svg',
  'js/seed-words.js', 'js/seed-lessons.js', 'js/parser.js', 'js/answer.js', 'js/exercises.js', 'js/srs.js', 'js/icons.js', 'js/app.js',
  'assets/plan-rocket.webp', 'assets/stat-check.png', 'assets/stat-gem.png', 'assets/stat-flame.png',
  'assets/task-refresh.png', 'assets/task-star.png', 'assets/task-clock.png', 'assets/task-chest.png',
  'assets/done-check.png', 'assets/gem-small.png',
  'assets/pk-biznes.webp', 'assets/pk-bledy.webp', 'assets/pk-czasowniki.webp', 'assets/pk-grzecznosci.webp', 'assets/pk-kraje.webp', 'assets/pk-ostatnia-lekcja.webp', 'assets/pk-pochodzenie.webp', 'assets/pk-podroze.webp', 'assets/pk-powitania.webp', 'assets/pk-pozegnania.webp', 'assets/pk-przedstawianie.webp', 'assets/pk-przymiotniki.webp', 'assets/pk-reagowanie.webp', 'assets/pk-rozmowki.webp', 'assets/pk-rzeczowniki.webp', 'assets/pk-samopoczucie.webp', 'assets/pk-swiat.webp', 'assets/pk-trudne.webp', 'assets/pk-wszystkie.webp',
  // ikony słówek używane w WORD_IMG (js/app.js); pozostałe z assets/words/ czekają na nowe słowa
  'assets/words/afryka.png', 'assets/words/ameryka_polnocna.png', 'assets/words/ameryka_poludniowa.png', 'assets/words/anglia.png', 'assets/words/arabia_saudyjska.png', 'assets/words/argentyna.png', 'assets/words/australia.png', 'assets/words/austria.png', 'assets/words/azja.png', 'assets/words/belgia.png', 'assets/words/bialorus.png', 'assets/words/brazylia.png', 'assets/words/bulgaria.png', 'assets/words/chile.png', 'assets/words/chiny.png', 'assets/words/chorwacja.png', 'assets/words/czechy.png', 'assets/words/dania.png', 'assets/words/egipt.png', 'assets/words/estonia.png', 'assets/words/europa.png', 'assets/words/filipiny.png', 'assets/words/finlandia.png', 'assets/words/francja.png', 'assets/words/grecja.png', 'assets/words/gruzja.png', 'assets/words/hiszpania.png', 'assets/words/holandia.png', 'assets/words/indie.png', 'assets/words/indonezja.png', 'assets/words/iran.png', 'assets/words/irlandia.png', 'assets/words/islandia.png', 'assets/words/izrael.png', 'assets/words/japonia.png', 'assets/words/kanada.png', 'assets/words/kolumbia.png', 'assets/words/kontynent.png', 'assets/words/korea_poludniowa.png', 'assets/words/kraj.png', 'assets/words/kuba.png', 'assets/words/litwa.png', 'assets/words/lotwa.png', 'assets/words/maroko.png', 'assets/words/meksyk.png', 'assets/words/miasteczko.png', 'assets/words/miasto.png', 'assets/words/narodowosc.png', 'assets/words/niemcy.png', 'assets/words/nigeria.png', 'assets/words/norwegia.png', 'assets/words/nowa_zelandia.png', 'assets/words/pakistan.png', 'assets/words/polska.png', 'assets/words/portugalia.png', 'assets/words/rosja.png', 'assets/words/rpa.png', 'assets/words/rumunia.png', 'assets/words/serbia.png', 'assets/words/slowacja.png', 'assets/words/slowenia.png', 'assets/words/stolica.png', 'assets/words/szkocja.png', 'assets/words/szwajcaria.png', 'assets/words/szwecja.png', 'assets/words/szwecja_drakkar.png', 'assets/words/tajlandia.png', 'assets/words/turcja.png', 'assets/words/ukraina.png', 'assets/words/usa.png', 'assets/words/walia.png', 'assets/words/warszawa.png', 'assets/words/wegry.png', 'assets/words/wielka_brytania_autobus.png', 'assets/words/wies.png', 'assets/words/wietnam.png', 'assets/words/wlochy.png', 'assets/words/zea_dubaj.png',
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
