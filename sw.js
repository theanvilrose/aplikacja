// Service worker: aplikacja działa offline po pierwszym uruchomieniu.
const CACHE = 'slowik-v49';
const FILES = [
  './', 'index.html', 'styles.css', 'plan-hero.css', 'packs.css', 'tasks.css', 'manifest.webmanifest', 'icon.svg',
  'js/seed-words.js', 'js/seed-lessons.js', 'js/parser.js', 'js/answer.js', 'js/exercises.js', 'js/srs.js', 'js/icons.js', 'js/word-icons-extra.js', 'js/word-audio.js', 'js/app.js',
  'assets/plan-rocket.webp', 'assets/stat-check.png', 'assets/stat-gem.png', 'assets/stat-flame.png',
  'assets/task-refresh.png', 'assets/task-star.png', 'assets/task-clock.png', 'assets/task-chest.png',
  'assets/done-check.png', 'assets/gem-small.png',
  'assets/pk-biznes.png', 'assets/pk-bledy.png', 'assets/pk-czasowniki.png', 'assets/pk-grzecznosci.png', 'assets/pk-kraje.png', 'assets/pk-listy.png', 'assets/pk-ostatnia-lekcja.png', 'assets/pk-pochodzenie.png', 'assets/pk-podroze.png', 'assets/pk-powitania.png', 'assets/pk-pozegnania.png', 'assets/pk-przedstawianie.png', 'assets/pk-przymiotniki.png', 'assets/pk-reagowanie.png', 'assets/pk-rozmowki.png', 'assets/pk-rzeczowniki.png', 'assets/pk-samopoczucie.png', 'assets/pk-swiat.png', 'assets/pk-trudne.png', 'assets/pk-wszystkie.png',
  // ikony słówek używane w WORD_IMG (js/app.js); pozostałe z assets/words/ czekają na nowe słowa
  'assets/words/afryka.png', 'assets/words/ameryka_polnocna.png', 'assets/words/ameryka_poludniowa.png', 'assets/words/anglia.png', 'assets/words/arabia_saudyjska.png', 'assets/words/argentyna.png', 'assets/words/australia.png', 'assets/words/austria.png', 'assets/words/azja.png', 'assets/words/belgia.png', 'assets/words/bialorus.png', 'assets/words/brazylia.png', 'assets/words/bulgaria.png', 'assets/words/chile.png', 'assets/words/chiny.png', 'assets/words/chorwacja.png', 'assets/words/czechy.png', 'assets/words/dania.png', 'assets/words/egipt.png', 'assets/words/estonia.png', 'assets/words/europa.png', 'assets/words/filipiny.png', 'assets/words/finlandia.png', 'assets/words/first_name.png', 'assets/words/francja.png', 'assets/words/friend.png', 'assets/words/grecja.png', 'assets/words/gruzja.png', 'assets/words/hiszpania.png', 'assets/words/holandia.png', 'assets/words/im.png', 'assets/words/indie.png', 'assets/words/indonezja.png', 'assets/words/iran.png', 'assets/words/irlandia.png', 'assets/words/islandia.png', 'assets/words/izrael.png', 'assets/words/japonia.png', 'assets/words/kanada.png', 'assets/words/kolumbia.png', 'assets/words/kontynent.png', 'assets/words/korea_poludniowa.png', 'assets/words/kraj.png', 'assets/words/kuba.png', 'assets/words/litwa.png', 'assets/words/lotwa.png', 'assets/words/maroko.png', 'assets/words/meksyk.png', 'assets/words/miasteczko.png', 'assets/words/miasto.png', 'assets/words/mr.png', 'assets/words/mrs.png', 'assets/words/ms.png', 'assets/words/name.png', 'assets/words/narodowosc.png', 'assets/words/niemcy.png', 'assets/words/nigeria.png', 'assets/words/norwegia.png', 'assets/words/nowa_zelandia.png', 'assets/words/pakistan.png', 'assets/words/polska.png', 'assets/words/portugalia.png', 'assets/words/rosja.png', 'assets/words/rpa.png', 'assets/words/rumunia.png', 'assets/words/serbia.png', 'assets/words/slowacja.png', 'assets/words/slowenia.png', 'assets/words/stolica.png', 'assets/words/surname.png', 'assets/words/szkocja.png', 'assets/words/szwajcaria.png', 'assets/words/szwecja.png', 'assets/words/szwecja_drakkar.png', 'assets/words/tajlandia.png', 'assets/words/turcja.png', 'assets/words/ukraina.png', 'assets/words/usa.png', 'assets/words/walia.png', 'assets/words/warszawa.png', 'assets/words/wegry.png', 'assets/words/wielka_brytania_autobus.png', 'assets/words/wies.png', 'assets/words/wietnam.png', 'assets/words/wlochy.png', 'assets/words/you.png', 'assets/words/youre.png', 'assets/words/zea_dubaj.png',
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
  if (new URL(e.request.url).pathname.startsWith('/api/')) return; // panel dewelopera — zawsze prosto z serwera
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
