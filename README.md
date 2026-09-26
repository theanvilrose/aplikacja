# Słowik — aplikacja do nauki słówek (w stylu WRD)

Krótkie sesje (2–20 min), adaptacyjne powtórki i ćwiczenia coraz trudniejsze w miarę, jak poznajesz słowo.

## Uruchomienie

Kliknij dwukrotnie **`start.bat`**. Otworzy się przeglądarka z adresem `http://localhost:8765`.
Zawsze uruchamiaj aplikację w ten sam sposób, bo postępy są zapisane w przeglądarce pod tym adresem.

## Ekrany

Zakładka **Nauka**:
1. **Plan dnia** — 3 zadania (powtórki, nowe słowa, minuty), każde z kolorowym paskiem postępu; pasek przy skrzyni pokazuje postęp całego planu. Wszystkie zrobione = skrzynia z +10 💎 i ekran nagrody.
   Ikona suwaków otwiera **Ustawienia planu**: podgląd planu i prognoza (kiedy poznasz wszystkie słówka, czy zdążysz przed egzaminem), **co ćwiczyć** (wszystko / same słówka bez zwrotów / same zwroty — dotyczy nowych słów i powtórek w planie dnia), kolejność nowych słów (jak w lekcjach / najnowsze / losowo), rozgrzewka, najpierw powtórki, ćwiczenia ze słuchu i z pisania (do wyłączenia), nowe słowa dziennie, limit powtórek i dzienny cel.
2. **Pakiety słówek** — Podróże (kraje, pochodzenie; bez przymiotników narodowości), Grzeczności i rozmowa, Rozmówki (wszystkie zwroty), Rzeczowniki, Przymiotniki, Czasowniki. Pakiet z mniej niż 5 słowami się nie pokazuje (`MIN_PACK` w `js/app.js`) — pojawi się sam, gdy dojdą słowa z lekcji.
   Po kliknięciu pakietu, tematu albo listy: ekran jak w WRD — tytuł i liczba słówek, zielony pasek postępu, szukajka, przełącznik Wszystko / Słówka / Zwroty, filtry Umiem / Uczę się / Nowe, lista słówek z ikonami (🔊 odsłuch, ✓ umiesz, ⋯ szczegóły) i przycisk „Ucz się” na dole. Menu ⋯ w nagłówku: Słuchaj w drodze, Powtórz poznane (i zmiana nazwy / usuwanie dla własnych list).
   **Ucz się** w pakiecie otwiera ekran **Nauka**: nowe słowa po kolei — *Ucz się* (dodaj do lekcji), *Później* (pomiń), *Wiem* (od razu wyuczone, ale następnego dnia wraca na szybkie sprawdzenie — pomyłka cofa je do nauki). Po 5 wybranych rusza lekcja (razem z zaległymi powtórkami z pakietu); można też zacząć wcześniej. Po lekcji: „Ucz się dalej” w tym samym pakiecie albo „Wróć do pakietu”. Liczniki pokazują osobno słówka i zwroty (np. „21 słówek · 68 zwrotów”). Klawisze: Enter / ← / →.
   **Wznów** — na górze ekranu Pakietów karta ostatniego pakietu, którego się uczyłeś.
   **Kliknięcie słówka** otwiera jego ekran: grafika, wymowa, tłumaczenie, przykład, skojarzenie, postęp, listy, ❤️ (lista „Ulubione”). Na dole stan: *Ucz się / Wiem* (nowe), *Uczenie* z kółkiem postępu (w trakcie), *✓ Wyuczone* + *Naucz się ponownie* (słowo wraca na początek nauki). W wierszu listy kropki poziomu obok ⋯.
   Ikony słówek: `assets/words/` (na razie flagi krajów; przypisanie w `WORD_IMG` w `js/app.js`), pozostałe słowa mają emoji tematu.
   „Wszystkie ›” otwiera ekran **Pakiety słówek** (jak w WRD): zakładki Wszystkie / Uczę się / Wyuczone, karty pakietów i tematów z ikoną i postępem „✓ umiem X/Y”.
3. **Przygotuj się do egzaminu** — odliczanie do egzaminu (nazwa i data w Profilu), gotowość i **ścieżka testów**: 3 testy tygodnia (10 pytań), potem test miesięczny (25), i tak dalej. Pomarańczowa gwiazda = następny test; zaliczenie (≥ 80%) odblokowuje kolejny. Puchar = egzamin próbny (40 pytań), dostępny zawsze. Odpowiedzi poznajesz na końcu testu.
   **Powtórka błędów** zbiera słowa, w których pomyliłeś się w testach; słowo znika po poprawnej odpowiedzi.
4. **Moje listy** — automatyczne („Z ostatniej lekcji”, „Trudne słowa”) i własne. Słówko dodajesz do listy, rozwijając je na liście słówek.
5. **Audio** — „Słuchaj w drodze” i trening słuchu.
6. **Tematy** — według działów z slowka.md.

Projekt graficzny: płótno „Słowik — sekcja Nauka” (https://claude.ai/artifact/Y53n5dcscAiE4qhAjsv5Sj).

Dolne menu: **Nauka** · **Słuchanie** (trening słuchu i odtwarzacz „słuchaj w drodze”) · **Słówka** (lista z filtrami Umiem / Uczę się / Nowe) · **Profil** (statystyki, sklep, ustawienia).

Górny pasek: ✓ ile słówek umiesz · 💎 diamenty · 🔥 seria dni (szara, dopóki dziś nie zaliczysz dnia).

## Seria i diamenty

- **Seria 🔥**: dzień zalicza się po 5 odpowiedziach. Liczba dni nauki z rzędu.
- **Diamenty 💎**: +1 za dobrą odpowiedź, +2 za błyskawiczną, +10 ze skrzyni za ukończony plan dnia, +20 za zaliczony test.
- **Odznaki 🏅** (Profil): za serię 3 / 7 / 14 / 30 / 50 / 100 / 200 / 365 dni, każda daje jednorazowo +5 💎 × liczba dni.
- **Zamrożenie serii 🧊** (sklep w Profilu, 50 💎, max 2): gdy opuścisz dzień, zamrożenie zużyje się samo i seria przetrwa.
- „Umiem” = słowo zapamiętane co najmniej na 2 dni.

## Jak działa nauka

Każde słowo przechodzi po kolei przez 6 poziomów ćwiczeń:

| poziom | ćwiczenie |
|---|---|
| 0 nowe | karta: słowo, wymowa, tłumaczenie, 🧠 skojarzenie, przykład + audio |
| 1 poznane | EN → wybierz polskie znaczenie |
| 2 słyszę | posłuchaj → wybierz znaczenie |
| 3 pamiętam | PL → wybierz angielskie słowo |
| 4 piszę | PL → wpisz po angielsku |
| 5 umiem | dyktando: posłuchaj → wpisz |

**Algorytm powtórek** (`js/srs.js`) bierze pod uwagę:
- czy odpowiedź była dobra,
- **czas reakcji**: szybka odpowiedź wydłuża przerwę bardziej niż wolna,
- trudność słowa dla Ciebie (rośnie przy pomyłkach),
- literówki i podpowiedzi (liczą się jako „z trudem”).

Pomyłka: słowo wraca jeszcze w tej samej sesji, a potem po 10 minutach i spada o poziom niżej.

Skróty klawiszowe: `1–4` wybór odpowiedzi · `Enter` dalej · `Spacja` odtwórz ponownie · `Esc` koniec sesji.

## Słówka

Słówka pochodzą z `../Angielski/slowka.md` i **aktualizują się same** — `start.bat` przy każdym uruchomieniu wczytuje ten plik (`node tools/import-slowka.js`). Nowe słowa z lekcji trafiają automatycznie do tematów, pakietów, listy „Z ostatniej lekcji” i testów. Postęp nauki zostaje.

Ręcznie (np. na telefonie): **Profil → Importuj slowka.md**.

## Pliki

```
index.html          ekran aplikacji
styles.css          wygląd (tylko jasny motyw; kolory ciemnego czekają pod data-theme="dark")
js/app.js           ekrany, sesja nauki, statystyki, wymowa
plan-hero.css       wygląd sekcji Plan dnia (gradient, karty zadań, efekty przycisków)
assets/             ikony i ilustracja Planu dnia wycięte z design/plan-mockup.jpg
tools/cutter.html   wycina te grafiki (node tools/save-server.js → http://127.0.0.1:8766)
packs.css           ekran Pakiety słówek i ikony pakietów
tools/cut-packs.html wycina ikony pakietów z design/pack-icons.jpg → assets/pk-*.webp (http://127.0.0.1:8766/packs?save=1)
js/icons.js         ikony i ilustracje (SVG)
js/srs.js           algorytm powtórek
js/answer.js        sprawdzanie wpisanych odpowiedzi
js/parser.js        wczytywanie tabel z slowka.md
js/seed-words.js    słówka (generowane)
sw.js, manifest     działanie offline i instalacja jak aplikacja
tests/              testy algorytmu powtórek i sprawdzania odpowiedzi — uruchom: node --test
design/archiwum/    stare porównanie ikon i oryginalne wycinki (nieużywane przez aplikację)
```

## Kopia zapasowa

Postęp jest zapisany tylko w przeglądarce. Raz w tygodniu na stronie głównej pojawia się przypomnienie „Zrób kopię postępów” (✕ = przypomnij za 3 dni). Kopia trafia do folderu Pobrane; wczytujesz ją w Profilu → Wczytaj kopię.

## Historia zmian

Folder jest repozytorium git — każdy zestaw poprawek to osobny zapis (`git log`), który da się cofnąć.
