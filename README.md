# Słowik — aplikacja do nauki słówek (w stylu WRD)

Krótkie sesje (2–20 min), adaptacyjne powtórki i ćwiczenia coraz trudniejsze w miarę, jak poznajesz słowo.

## Uruchomienie

Kliknij dwukrotnie **`start.bat`**. Otworzy się przeglądarka z adresem `http://localhost:8765`.
Zawsze uruchamiaj aplikację w ten sam sposób, bo postępy są zapisane w przeglądarce pod tym adresem.

## Ekrany

Zakładka **Nauka**:
1. **Plan dnia** — 3 zadania (powtórki, nowe słowa, minuty), każde z kolorowym paskiem postępu; pasek przy skrzyni pokazuje postęp całego planu. Wszystkie zrobione = skrzynia z +10 💎 i ekran nagrody.
   **Zadania z lekcji** (druga karta, przesuń w bok): arkusz jak z lekcji na czacie — A. wybór (np. he / she / it), B. luki, C. przekształcenia (pytanie, skrót), D. tłumaczenie na angielski. Co kliknięcie „Nowy zestaw” inne zadania, z gramatyki lekcji i Twoich słówek. Domyślnie bieżąca lekcja z `program_A1.md` (📝), pod spodem wybór wcześniejszych. Obsługiwane lekcje: L1–L4 (kolejne dopisuje się w `js/exercises.js`). Wynik zapisuje się na karcie, każda dobra odpowiedź = +1 💎, czas liczy się do celu dnia. Kliknięcie części A–D = tylko ta część. Suwaki na karcie otwierają **Ustawienia zadań**: z jakich słów (wszystkie z lekcji albo tylko poznane w aplikacji), które części, ile zadań w części (Auto / 3 / 5 / 8). Zadania nigdy nie używają słów spoza Twoich słówek — jeśli do jakiejś części brakuje słów, jest pomijana (jedyny dodatek to imiona postaci: Tom, Anna…).
   Ikona suwaków otwiera **Ustawienia planu**: podgląd planu i prognoza (kiedy poznasz wszystkie słówka, czy zdążysz przed egzaminem), **co ćwiczyć** (wszystko / same słówka bez zwrotów / same zwroty — dotyczy nowych słów i powtórek w planie dnia), kolejność nowych słów (jak w lekcjach / najnowsze / losowo), rozgrzewka, najpierw powtórki, ćwiczenia ze słuchu i z pisania (do wyłączenia), nowe słowa dziennie, limit powtórek i dzienny cel.
2. **Pakiety słówek** — Podróże (kraje, pochodzenie; bez przymiotników narodowości), Grzeczności i rozmowa, Rozmówki (wszystkie zwroty), Rzeczowniki, Przymiotniki, Czasowniki. Pakiet z mniej niż 5 słowami się nie pokazuje (`MIN_PACK` w `js/app/core.js`) — pojawi się sam, gdy dojdą słowa z lekcji.
   Po kliknięciu pakietu, tematu albo listy: ekran jak w WRD — tytuł i liczba słówek, zielony pasek postępu, szukajka, przełącznik Wszystko / Słówka / Zwroty, filtry Umiem / Uczę się / Nowe, lista słówek z ikonami (🔊 odsłuch, ✓ umiesz, ⋯ szczegóły) i przycisk „Ucz się” na dole. Menu ⋯ w nagłówku: Słuchaj w drodze, Powtórz poznane (i zmiana nazwy / usuwanie dla własnych list).
   **Ucz się** w pakiecie otwiera ekran **Nauka**: nowe słowa po kolei — *Ucz się* (dodaj do lekcji), *Później* (pomiń), *Wiem* (od razu wyuczone, ale następnego dnia wraca na szybkie sprawdzenie — pomyłka cofa je do nauki). Po 5 wybranych rusza lekcja (razem z zaległymi powtórkami z pakietu); można też zacząć wcześniej. Po lekcji: „Ucz się dalej” w tym samym pakiecie albo „Wróć do pakietu”. Liczniki pokazują osobno słówka i zwroty (np. „21 słówek · 68 zwrotów”). Klawisze: Enter / ← / →.
   **Wznów** — na górze ekranu Pakietów karta ostatniego pakietu, którego się uczyłeś.
   **Kliknięcie słówka** otwiera jego ekran: grafika, wymowa, tłumaczenie, przykład, skojarzenie, postęp, listy, ❤️ (lista „Ulubione”). Na dole stan: *Ucz się / Wiem* (nowe), *Uczenie* z kółkiem postępu (w trakcie), *✓ Wyuczone* + *Naucz się ponownie* (słowo wraca na początek nauki). W wierszu listy kropki poziomu obok ⋯.
   Ikony słówek: `assets/words/` (na razie flagi krajów; przypisanie w `js/word-icons.js`), pozostałe słowa mają emoji tematu.
   „Wszystkie ›” otwiera ekran **Pakiety słówek** (jak w WRD): zakładki Wszystkie / Uczę się / Wyuczone, karty pakietów i tematów z ikoną i postępem „✓ umiem X/Y”.
3. **Przygotuj się do egzaminu** — odliczanie do egzaminu (nazwa i data w Profilu), gotowość i **ścieżka testów**: 3 testy tygodnia (10 pytań), potem test miesięczny (25), i tak dalej. Pomarańczowa gwiazda = następny test; zaliczenie (≥ 80%) odblokowuje kolejny. Puchar = egzamin próbny (40 pytań), dostępny zawsze. Odpowiedzi poznajesz na końcu testu.
   **Powtórka błędów** zbiera słowa, w których pomyliłeś się w testach; słowo znika po poprawnej odpowiedzi.
4. **Moje listy** — automatyczne („Z ostatniej lekcji”, „Trudne słowa”) i własne. Słówko dodajesz do listy, rozwijając je na liście słówek.
5. **Audio** — „Słuchaj w drodze” i trening słuchu.
6. **Tematy** — 200 działów ze `slownik.md` + działy zwrotów i zaimki; słowo z kilku działów jest w każdym z nich.

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

**Ćwiczenia w sesji** (włączasz/wyłączasz w Ustawieniach planu → „Rodzaje ćwiczeń”): Co to znaczy? · Czy to dobre tłumaczenie? (tak/nie) · Dopasuj kartę (4 obrazki) · Dopasuj pary (EN ↔ PL, tylko poznane słowa) · Jak to powiesz po angielsku? · Posłuchaj i wybierz · **Utwórz słowo** · Napisz po angielsku · Dyktando.
„Utwórz słowo” zależy od postępu słowa (`js/builder.js`): *poznane / słyszę* — sylaby przy obrazku i z dźwiękiem, *pamiętam* — litery przy polskim tłumaczeniu, *piszę / umiem* — litery z pułapkami, bez podpowiedzi. Zwroty układa się z wyrazów. Etapy i to, co na nich ćwiczysz, widać na ekranie słowa („Twój postęp”).

Skróty klawiszowe: `1–4` wybór odpowiedzi (w „Czy to prawidłowe tłumaczenie?” `1`/`←` = nie, `2`/`→` = tak) · w „Utwórz słowo” litery z klawiatury i `Backspace` · `Enter` lub `Spacja` dalej (przed odpowiedzią spacja odtwarza słowo, jeśli nie zdradza odpowiedzi) · `Esc` koniec sesji.

## Słówka

Słówka pochodzą z folderu `../Angielski` i **aktualizują się same** — `start.bat` przy każdym uruchomieniu wczytuje (`node tools/import-slowka.js`):

- `slownik.md` — słowa w 200 działach (poziom CEFR, przedimek a/an, część mowy, wymowa, tłumaczenie, uwagi, skojarzenie, przykład),
- `zwroty.md` — zwroty, idiomy i phrasal verbs,
- `czesci_mowy.md` — zaimki i słowa spoza działów słownika.

Gdy tych plików nie ma, importer czyta dawny `slowka.md`. Nowe słowa trafiają automatycznie do tematów, pakietów i testów; postęp nauki zostaje. Nowe słówka w nauce idą od najłatwiejszych (A1 → C1), w każdym poziomie temat po temacie.

Ręcznie (np. na telefonie): **Profil → Importuj słownik (.md)**.

## Pliki

```
index.html          ekran aplikacji
styles.css          wygląd i kolory bazowe (jasne + ciemne zmienne)
dark.css            ciemny motyw — generuje tools/build-dark.js (nie edytuj ręcznie)
js/app/*.js         aplikacja podzielona na części, ładowane po kolei (index.html):
  core.js           dane, zapis, synchronizacja (klient), seria i diamenty, wymowa
  session.js        sesja nauki: dobór ćwiczeń wg postępu, ocena, tryb słuchania
  views.js          ekrany: główny, słownictwo, ustawienia planu, sesja, podsumowania, profil
  word.js           szczegóły słowa, wybór słów, zadania z lekcji
  dev.js            panel dewelopera (ikony i nagrania)
  actions.js        kliknięcia, klawiatura i start — zawsze ostatni
js/word-icons.js    ikony słówek (mapa słowo → assets/words/*.png)
js/builder.js       „Utwórz słowo”: sylaby, litery, pułapki
js/sync.js          łączenie postępu z dwóch urządzeń (przeglądarka i serwer)
sw-assets.js        lista ikon i nagrań do pracy offline — generuje tools/build-assets.js
plan-hero.css       wygląd sekcji Plan dnia (gradient, karty zadań, efekty przycisków)
assets/             ikony i ilustracja Planu dnia wycięte z design/plan-mockup.jpg
tools/cutter.html   wycina te grafiki (node tools/save-server.js → http://127.0.0.1:8766)
packs.css           ekran Pakiety słówek i ikony pakietów
tools/cut-packs.html wycina ikony pakietów z design/pack-icons.jpg → assets/pk-*.webp (http://127.0.0.1:8766/packs?save=1)
js/icons.js         ikony i ilustracje (SVG)
js/srs.js           algorytm powtórek
js/answer.js        sprawdzanie wpisanych odpowiedzi
js/parser.js        wczytywanie tabel ze slownik.md / zwroty.md / czesci_mowy.md (i dawnego slowka.md) oraz planu lekcji z program_A1.md
js/exercises.js     generator zadań z lekcji (szablony gramatyki L1–L4) i sprawdzanie odpowiedzi
js/seed-lessons.js  plan lekcji (generowany przez start.bat z program_A1.md)
tasks.css           karta i arkusz zadań z lekcji
js/seed-words.js    słówka (generowane)
sw.js, manifest     działanie offline (pliki aplikacji + osobna pamięć ikon i nagrań) i instalacja jak aplikacja
tests/              testy (powtórki, zadania, układanie słów, synchronizacja, aktualność plików generowanych) — uruchom: node --test
design/archiwum/    stare porównanie ikon i oryginalne wycinki (nieużywane przez aplikację)
```

## Synchronizacja (komputer ↔ telefon)

Przy uruchomieniu przez `start.bat` postęp zapisuje się też na komputerze (`.data/progress.json`, poza gitem) i łączy między przeglądarkami (`localhost`, `127.0.0.1`).
Telefon w tym samym Wi‑Fi: w `.dev-config.json` ustaw `"lan": true`, uruchom `start.bat` (Windows zapyta o zgodę zapory — zezwól w sieci prywatnej), na telefonie otwórz adres z **Profil → Synchronizacja** i wpisz PIN.
Łączenie (`js/sync.js`): każde słowo osobno (wygrywa nowsza nauka), dni — większe liczniki, reszta — nowsza zmiana. Panel dewelopera działa tylko na komputerze; telefon ma dostęp wyłącznie do synchronizacji (z PIN-em).
Uwaga: przez Wi‑Fi (http) telefon nie ma trybu offline — do nauki bez internetu służy wersja zainstalowana z GitHuba (bez synchronizacji, z kopią zapasową).

## Ciemny motyw i praca offline

- **Profil → Wygląd:** Jasny / Ciemny / Jak w systemie. Ciemne kolory wylicza `node tools/build-dark.js` z jasnych stylów (uruchom po zmianie kolorów; test pilnuje aktualności).
- **Offline:** service worker zapisuje pliki aplikacji oraz — osobno, w tle i tylko raz — wszystkie ikony słówek i nagrania wymowy (`sw-assets.js`, odświeżany automatycznie przez serwer po zmianach w panelu).

## Kopia zapasowa

Postęp jest zapisany tylko w przeglądarce. Raz w tygodniu na stronie głównej pojawia się przypomnienie „Zrób kopię postępów” (✕ = przypomnij za 3 dni). Kopia trafia do folderu Pobrane; wczytujesz ją w Profilu → Wczytaj kopię.

## Historia zmian

Folder jest repozytorium git — każdy zestaw poprawek to osobny zapis (`git log`), który da się cofnąć.

## Panel dewelopera — ikony słówek (OpenRouter)

**Profil / Ustawienia → 🛠️ Panel dewelopera** (widoczny tylko przy uruchomieniu przez `start.bat`).
Lista słówek bez ikony (zwroty nigdy nie mają ikon) — **Generuj** przy słowie albo **Generuj wszystkie brakujące** (domyślnie **Meta Muse Image** ≈ $0,01 za ikonę; do wyboru też Gemini ≈ $0,04–0,08; z Twojego konta OpenRouter). Ikony powstają w stylu obecnych (wzory: friend, Polska, Mrs), aplikacja sama usuwa tło, docina kafelek i zaokrągla rogi. Przy słowie: **Zapisz**, **↻** nowa wersja, **✕** usuń.

- Serwer: `tools/server.js` (zastąpił `python -m http.server`; ten sam adres `http://localhost:8765`, postępy zostają).
- **Klucz nigdy nie trafia do przeglądarki ani do repozytorium.** Serwer czyta go z `OPENROUTER_API_KEY`, z `.env.local` albo z pliku wskazanego w `.dev-config.json` (`keyFile`). Oba pliki są w `.gitignore`.
- Nowe ikony: `assets/words/gen_*.png` + mapa `js/word-icons-extra.js`.
- **Modele:** Meta Muse Image (domyślny, endpoint `/images`, wzory stylu w `input_references`) albo Gemini (`/chat/completions`).
- **Opis przez Muse** (przełącznik): najpierw Meta Muse Spark 1.3 pisze opis sceny, potem wybrany model rysuje. Opis widać pod podglądem; dodatkowo ok. $0,003.

## Panel dewelopera — wymowa (ElevenLabs / OpenRouter)

Zakładka **🔊 Wymowa** w panelu dewelopera: prawdziwy lektor zamiast syntezatora przeglądarki.

- **Źródło:** ElevenLabs (domyślnie, kredyty z Twojego konta) albo modele mowy z OpenRouter (Gemini TTS, MAI-Voice, Kokoro…; lista i ceny pobierane na żywo).
- **Język nagrania:** 🇺🇸 amerykański, 🇬🇧 brytyjski, 🇵🇱 polski. Do każdego osobno wybierasz model i głos (z podpowiedzią akcentu); **▶ Próbka** — odsłuch przed nagrywaniem.
- **Nagraj** przy słowie (odsłuch → Zapisz / ↻) albo **Nagraj brakujące** (koszt liczony z góry). Słówka i zwroty osobno.
- Aplikacja gra nagranie w akcencie z ustawień (brak → drugi akcent → syntezator). Działa w nauce, w liście, w trybie słuchania (także polskie tłumaczenie).
- Pliki: `assets/audio/<język>/*.mp3|wav` + mapa `js/word-audio.js` (klucz = tekst słowa).
- Klucz ElevenLabs: `ELEVENLABS_API_KEY` (środowisko albo `.env.local`) lub plik z `.dev-config.json` → `elevenKeyFile`.
- Plan darmowy ElevenLabs nie pozwala używać przez API głosów z biblioteki (np. polskich lektorów) — panel pokazuje wtedy tylko głosy wbudowane; po polsku mówią przez model Eleven Multilingual v2.
