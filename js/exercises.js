// Generator zadań z lekcji (jak w arkuszu z czatu): A. wybór, B. luki, C. przekształcenia, D. tłumaczenie.
// Każda lekcja ma własne szablony pod swoją gramatykę (program_A1.md); słowa biorą się z Twoich słówek
// (slowka.md), a imiona, przedmioty i zawody do ćwiczeń gramatyki — z list poniżej (tematy T2/T4 z programu).
// Działa w przeglądarce i w Node (testy).
(function (root) {
  'use strict';

  const Answer = root.Answer || (typeof require !== 'undefined' ? require('./answer.js') : null);

  // ---------- słowniczek do ćwiczeń gramatyki ----------

  const MEN = [
    { en: 'Tom', pl: 'Tom' }, { en: 'Adam', pl: 'Adam' }, { en: 'Jack', pl: 'Jack' },
    { en: 'David', pl: 'David' }, { en: 'Mr Smith', pl: 'pan Smith' }, { en: 'Mr Brown', pl: 'pan Brown' },
  ];
  const WOMEN = [
    { en: 'Anna', pl: 'Anna' }, { en: 'Kate', pl: 'Kate' }, { en: 'Emma', pl: 'Emma' },
    { en: 'Sarah', pl: 'Sarah' }, { en: 'Mrs Brown', pl: 'pani Brown' }, { en: 'Ms Taylor', pl: 'pani Taylor' },
  ];
  // przedmioty (T2 biuro, T4 rzeczy osobiste, T13) — pl w mianowniku
  const THINGS = [
    { en: 'laptop', pl: 'laptop' }, { en: 'desk', pl: 'biurko' }, { en: 'office', pl: 'biuro' },
    { en: 'chair', pl: 'krzesło' }, { en: 'computer', pl: 'komputer' }, { en: 'phone', pl: 'telefon' },
    { en: 'bag', pl: 'torba' }, { en: 'wallet', pl: 'portfel' }, { en: 'umbrella', pl: 'parasol' },
  ];
  // zawody (T2) — ins = narzędnik („On jest kierownikiem”); g = kto może być podmiotem w zdaniu PL
  const JOBS = [
    { en: 'manager', ins: 'kierownikiem', g: 'm' }, { en: 'engineer', ins: 'inżynierem', g: 'm' },
    { en: 'mechanic', ins: 'mechanikiem', g: 'm' }, { en: 'boss', ins: 'szefem', g: 'm' },
    { en: 'teacher', ins: 'nauczycielem', g: 'm' }, { en: 'teacher', ins: 'nauczycielką', g: 'f' },
    { en: 'nurse', ins: 'pielęgniarką', g: 'f' },
  ];
  // kraj → dopełniacz („z Hiszpanii”) i narodowość (id słówek z tematu Kraje i narodowości)
  const COUNTRY = {
    poland: ['Polski', 'polish'], spain: ['Hiszpanii', 'spanish'], germany: ['Niemiec', 'german'],
    france: ['Francji', 'french'], italy: ['Włoch', 'italian'], england: ['Anglii', 'english'],
    canada: ['Kanady', 'canadian'], china: ['Chin', 'chinese'], india: ['Indii', 'indian'],
    japan: ['Japonii', 'japanese'], mexico: ['Meksyku', 'mexican'], turkey: ['Turcji', 'turkish'],
    sweden: ['Szwecji', 'swedish'], norway: ['Norwegii', 'norwegian'], 'the netherlands': ['Holandii', 'dutch'],
    greece: ['Grecji', 'greek'], ireland: ['Irlandii', 'irish'], portugal: ['Portugalii', 'portuguese'],
    scotland: ['Szkocji', 'scottish'], ukraine: ['Ukrainy', 'ukrainian'], 'the usa': ['USA', 'american'],
    'the uk': ['Wielkiej Brytanii', 'british'], 'the czech republic': ['Czech', 'czech'], australia: ['Australii', 'australian'],
  };
  // gdy w słówkach nie ma jeszcze krajów / przymiotników samopoczucia
  const FALLBACK_COUNTRIES = [
    { en: 'Poland', gen: 'Polski', nat: 'Polish' }, { en: 'Spain', gen: 'Hiszpanii', nat: 'Spanish' },
    { en: 'Germany', gen: 'Niemiec', nat: 'German' }, { en: 'Italy', gen: 'Włoch', nat: 'Italian' },
    { en: 'France', gen: 'Francji', nat: 'French' }, { en: 'England', gen: 'Anglii', nat: 'English' },
  ];
  const FALLBACK_MOODS = [
    { en: 'tired', pl: 'zmęczony' }, { en: 'happy', pl: 'szczęśliwy' }, { en: 'sad', pl: 'smutny' },
    { en: 'hungry', pl: 'głodny' }, { en: 'cold', pl: 'zmarznięty' },
  ];

  const art = (en) => (/^[aeiou]/i.test(en) ? 'an ' : 'a ') + en;
  const zPL = (gen) => (/^S[zk]/.test(gen) ? 'ze ' : 'z ') + gen;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const first = (s) => String(s).split(/\s*[\/(;,]\s*/)[0].trim();

  function tools(rand) {
    const shuffle = (a) => {
      a = a.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    };
    return { shuffle, pick: (a) => a[Math.floor(rand() * a.length)], sample: (a, n) => shuffle(a).slice(0, n) };
  }

  // kraje z Twoich słówek (z narodowością, jeśli też ją masz)
  function countries(words) {
    const byId = new Map(words.map((w) => [w.id, w]));
    const out = [];
    for (const [id, [gen, natId]] of Object.entries(COUNTRY)) {
      const c = byId.get(id);
      if (!c) continue;
      const n = byId.get(natId);
      out.push({ en: first(c.en), gen, nat: n ? cap(first(n.en)) : null });
    }
    return out.length >= 4 ? out : FALLBACK_COUNTRIES;
  }

  // przymiotniki, które pasują do „I'm …” / „Jestem …” (bez fine, great, OK — to nie nastroje w tej formie)
  const MOOD_WORDS = ['tired', 'happy', 'sad', 'busy', 'hungry', 'thirsty', 'cold', 'hot', 'bored', 'angry', 'sick', 'ill'];
  function moods(words) {
    const list = words.filter((w) => w.topic === 'Samopoczucie' && /^przym/i.test(w.pos || ''))
      .map((w) => ({ en: first(w.en).toLowerCase(), pl: first(w.pl).toLowerCase() }))
      .filter((m) => MOOD_WORDS.includes(m.en));
    // zawsze co najmniej 5 — brakujące z listy zapasowej
    for (const f of FALLBACK_MOODS) if (list.length < 5 && !list.some((m) => m.en === f.en)) list.push(f);
    return list;
  }

  // zwroty z tematów lekcji do tłumaczenia PL → EN; „(= And you?)” w tłumaczeniu to druga dobra odpowiedź, nie podpowiedź
  function phrases(words, topics, skip = []) {
    return words.filter((w) => topics.includes(w.topic) && /zwrot/i.test(w.pos || '') && w.en.length <= 40)
      .map((w) => {
        const alt = [...w.pl.matchAll(/\(\s*=\s*([^)]+)\)/g)].map((m) => m[1].trim());
        return { pl: w.pl.replace(/\s*\(\s*=[^)]*\)/g, '').trim(), answers: [w.en, ...alt] };
      })
      .filter((p) => p.pl && !skip.includes(p.pl))
      // to samo polskie zdanie w kilku słówkach („A ty?” = And you? / What about you?) → jedno zadanie, każda odpowiedź dobra
      .reduce((out, p) => {
        const same = out.find((x) => x.pl === p.pl);
        if (same) same.answers.push(...p.answers); else out.push(p);
        return out;
      }, []);
  }

  // ---------- rodzaje pozycji ----------
  const choice = (prompt, options, answer, rand) => ({ kind: 'choice', prompt, options: tools(rand).shuffle(options), answer });
  const text = (prompt, answers, mode = 'loose', tag = '') => ({ kind: 'text', prompt, answers: [].concat(answers), mode, tag });

  // ---------- lekcje ----------

  const GEN = {
    // L1 Przedstawianie się: Hello / Hi, I'm…, What's your name?, Nice to meet you, Goodbye
    L1(words, rand) {
      const { pick, shuffle, sample } = tools(rand);
      const [n1, n2, n3] = sample([...MEN, ...WOMEN].filter((p) => !/ /.test(p.en)), 3);
      const replies = [
        ["What's your name?", `I'm ${n1.en}.`], ['Hello!', 'Hi!'], ['Nice to meet you.', 'Nice to meet you too.'],
        ['Goodbye!', 'Bye! See you!'], [`Hi, I'm ${n2.en}.`, `Hello, ${n2.en}! I'm ${n3.en}.`],
      ];
      const A = shuffle(replies).map(([q, a]) => choice(`${q} → ___`, [a, ...sample(replies.filter((r) => r[1] !== a).map((r) => r[1]), 2)], a, rand));
      const B = shuffle([
        choice(`I ___ ${n1.en}.`, ['am', 'is', 'are'], 'am', rand),
        choice('What ___ your name?', ['is', 'am', 'are'], 'is', rand),
        choice(`My ___ is ${n2.en}.`, ['name', 'meet', 'hello'], 'name', rand),
        choice('Nice to ___ you.', ['meet', 'name', 'is'], 'meet', rand),
        choice(`___, I'm ${n3.en}.`, ['Hi', 'Goodbye', 'Name'], 'Hi', rand),
        choice('___! See you tomorrow.', ['Goodbye', 'Hello', 'Nice'], 'Goodbye', rand),
      ]);
      const C = [
        text(`I am ${n1.en}.`, `I'm ${n1.en}.`, 'contraction', 'skrót'),
        text('What is your name?', "What's your name?", 'contraction', 'skrót'),
        text(`I am ${n2.en}. Nice to meet you.`, `I'm ${n2.en}. Nice to meet you.`, 'contraction', 'skrót'),
      ];
      const D = [
        text('Jak masz na imię?', "What's your name?"),
        text(`Mam na imię ${n3.pl}.`, [`My name is ${n3.en}.`, `I'm ${n3.en}.`]),
        text('Miło cię poznać.', 'Nice to meet you.'),
        ...sample(phrases(words, ['Powitania', 'Przedstawianie się', 'Pożegnania'], ['Jak masz na imię?', 'Miło cię poznać.']), 3).map((p) => text(p.pl, p.answers)),
      ];
      return sections(A, 'Wybierz dobrą odpowiedź', B, 'Uzupełnij luki', C, 'Napisz w formie skróconej', D);
    },

    // L2 Powitania: How are you? — I'm fine, thanks; I / you
    L2(words, rand) {
      const { shuffle, sample } = tools(rand);
      const m = sample(moods(words), 5);
      const A = shuffle([
        choice('___ am fine, thanks.', ['I', 'you'], 'I', rand),
        choice('How are ___?', ['I', 'you'], 'you', rand),
        choice(`___'m ${m[0].en}.`, ['I', 'you'], 'I', rand),
        choice(`Are ___ ${m[1].en}?`, ['I', 'you'], 'you', rand),
        choice("I'm fine. And ___?", ['I', 'you'], 'you', rand),
        choice(`___ am ${m[2].en} today.`, ['I', 'you'], 'I', rand),
      ]);
      const B = shuffle([
        choice(`I ___ ${m[0].en}.`, ['am', 'are'], 'am', rand),
        choice('How ___ you?', ['am', 'are'], 'are', rand),
        choice(`You ___ ${m[1].en}.`, ['am', 'are'], 'are', rand),
        choice("I ___ fine, thanks.", ['am', 'are'], 'am', rand),
        choice(`You ___ very ${m[3].en}.`, ['am', 'are'], 'are', rand),
        choice(`I ___ not ${m[4].en}.`, ['am', 'are'], 'am', rand),
      ]);
      const C = [
        text(`I am ${m[0].en}.`, `I'm ${m[0].en}.`, 'contraction', 'skrót'),
        text(`You are ${m[1].en}.`, `You're ${m[1].en}.`, 'contraction', 'skrót'),
        text(`You are ${m[2].en}.`, `Are you ${m[2].en}?`, 'loose', 'pytanie'),
        text(`You are ${m[3].en}.`, `Are you ${m[3].en}?`, 'loose', 'pytanie'),
      ];
      const D = [
        text('Jak się masz?', 'How are you?'),
        text(`Jestem ${m[0].pl}.`, [`I'm ${m[0].en}.`]),
        text(`Czy jesteś ${m[1].pl}?`, [`Are you ${m[1].en}?`]),
        ...sample(phrases(words, ['Powitania', 'Samopoczucie'], ['Jak się masz?']), 3).map((p) => text(p.pl, p.answers)),
      ];
      return sections(A, 'Wpisz I albo you', B, 'Uzupełnij am albo are', C, 'Przekształć zdania', D);
    },

    // L3 Mówienie o sobie: Where are you from? — I'm from…; am / are; narodowości
    L3(words, rand) {
      const { shuffle, sample } = tools(rand);
      const cs = countries(words);
      const withNat = cs.filter((c) => c.nat);
      const [c1, c2, c3, c4, c5] = sample(cs, 5);
      const natPool = withNat.length >= 3 ? withNat : FALLBACK_COUNTRIES;
      const A = sample(natPool, 6).map((c) => choice(`${c.en} → ___`, [c.nat, ...sample(natPool.filter((x) => x.nat !== c.nat).map((x) => x.nat), 2)], c.nat, rand));
      const nat = (c) => c.nat || 'Polish';
      const B = shuffle([
        choice(`I ___ from ${c1.en}.`, ['am', 'are', 'from'], 'am', rand),
        choice('Where ___ you from?', ['am', 'are', 'from'], 'are', rand),
        choice(`I'm ___ ${c2.en}.`, ['am', 'are', 'from'], 'from', rand),
        choice(`You ___ ${nat(c3)}.`, ['am', 'are', 'from'], 'are', rand),
        choice(`I ___ ${nat(c4)}.`, ['am', 'are', 'from'], 'am', rand),
        choice(`Are you ___ ${c5.en}?`, ['am', 'are', 'from'], 'from', rand),
      ]);
      const C = [
        text(`You are from ${c1.en}.`, `Are you from ${c1.en}?`, 'loose', 'pytanie'),
        text(`You are ${nat(c2)}.`, `Are you ${nat(c2)}?`, 'loose', 'pytanie'),
        text(`I am from ${c3.en}.`, `I'm from ${c3.en}.`, 'contraction', 'skrót'),
        text(`You are ${nat(c4)}.`, `You're ${nat(c4)}.`, 'contraction', 'skrót'),
      ];
      const D = [
        text('Skąd jesteś?', 'Where are you from?'),
        text(`Jestem ${zPL(c1.gen)}.`, [`I'm from ${c1.en}.`]),
        text(`Czy jesteś ${zPL(c2.gen)}?`, [`Are you from ${c2.en}?`]),
        ...sample(phrases(words, ['Pochodzenie i miejsce zamieszkania', 'Kraje i narodowości'], ['Skąd jesteś?']), 3).map((p) => text(p.pl, p.answers)),
      ];
      return sections(A, 'Wybierz narodowość', B, 'Uzupełnij am, are albo from', C, 'Przekształć zdania', D);
    },

    // L4 Ludzie i rzeczy: Who / What is this?; he / she / it is; a + przedmioty w biurze
    L4(words, rand) {
      const { pick, shuffle, sample } = tools(rand);
      const cs = countries(words);
      const [c1, c2, c3] = sample(cs, 3);
      const [m1, m2, m3] = sample(MEN, 3);
      const [w1, w2, w3] = sample(WOMEN, 3);
      const things = sample(THINGS, THINGS.length);
      const vowel = things.find((t) => /^[aeiou]/.test(t.en));
      const cons = things.filter((t) => !/^[aeiou]/.test(t.en));
      const man = pick(JOBS.filter((j) => j.g === 'm'));
      const woman = pick(JOBS.filter((j) => j.g === 'f'));
      const nat = (c) => c.nat || 'Polish';

      const A = shuffle([
        choice(`${m1.en} → ___`, ['he', 'she', 'it'], 'he', rand),
        choice(`${w1.en} → ___`, ['he', 'she', 'it'], 'she', rand),
        choice(`${art(cons[0].en)} → ___`, ['he', 'she', 'it'], 'it', rand),
        choice(`${w2.en} → ___`, ['he', 'she', 'it'], 'she', rand),
        choice(`${art(cons[1].en)} → ___`, ['he', 'she', 'it'], 'it', rand),
        choice(`${m2.en} → ___`, ['he', 'she', 'it'], 'he', rand),
      ]);
      const OPTS = ['is', 'a', 'an', 'Who', 'What'];
      const B = shuffle([
        choice(`She ___ from ${c1.en}.`, OPTS, 'is', rand),
        choice(`It's ___ ${cons[2].en}.`, OPTS, 'a', rand),
        choice(`It's ___ ${vowel.en}.`, OPTS, 'an', rand),
        choice(`___ is this? — This is ${m3.en}.`, OPTS, 'Who', rand),
        choice(`___ is this? — It's ${art(cons[3].en)}.`, OPTS, 'What', rand),
        choice(`He ___ ${art(man.en)}.`, OPTS, 'is', rand),
      ]);
      const C = [
        text(`He is ${nat(c2)}.`, `Is he ${nat(c2)}?`, 'loose', 'pytanie'),
        text(`She is ${art(woman.en)}.`, `Is she ${art(woman.en)}?`, 'loose', 'pytanie'),
        text(`It is ${art(cons[4].en)}.`, `Is it ${art(cons[4].en)}?`, 'loose', 'pytanie'),
        text(`She is from ${c3.en}.`, `She's from ${c3.en}.`, 'contraction', 'skrót'),
        text(`It is ${art(cons[5].en)}.`, `It's ${art(cons[5].en)}.`, 'contraction', 'skrót'),
      ];
      const thing = (t) => [`This is ${art(t.en)}.`, `It's ${art(t.en)}.`, `That is ${art(t.en)}.`];
      const D = [
        text('Kto to jest?', ['Who is this?', 'Who is it?', 'Who is that?']),
        text(`To jest ${w3.pl}. Ona jest ${zPL(c1.gen)}.`, `This is ${w3.en}. She is from ${c1.en}.`),
        text('Co to jest?', ['What is this?', 'What is it?', 'What is that?']),
        text(`To jest ${cons[6].pl}.`, thing(cons[6])),
        text(`On jest ${man.ins}.`, `He is ${art(man.en)}.`),
        text(`Czy ona jest ${zPL(c2.gen)}?`, `Is she from ${c2.en}?`),
        text('Tak, jest. (odpowiedź na 6)', 'Yes, she is.'),
        text(`To jest ${vowel.pl}.`, thing(vowel)),
      ];
      return sections(A, 'Wpisz he, she albo it', B, 'Uzupełnij luki: is, a, an, Who albo What', C, 'Przekształć zdania', D);
    },
  };

  function sections(A, tA, B, tB, C, tC, D) {
    return [
      { key: 'A', title: tA, items: A },
      { key: 'B', title: tB, items: B },
      { key: 'C', title: tC, items: C },
      { key: 'D', title: 'Przetłumacz na angielski', items: D },
    ].filter((s) => s.items.length);
  }

  function generate(lessonId, words = [], rand = Math.random) {
    const g = GEN[lessonId];
    return g ? { lesson: lessonId, sections: g(words, rand) } : null;
  }

  // ---------- sprawdzanie: 'ok' | 'typo' | 'wrong' ----------

  const keepApos = (s) => String(s).toLowerCase().replace(/[‘’`´]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();

  function check(item, value) {
    const v = String(value ?? '').trim();
    if (!v) return 'wrong';
    if (item.kind === 'choice') return v === item.answer ? 'ok' : 'wrong';
    let best = 'wrong';
    for (const a of item.answers) {
      if (item.mode === 'contraction') {
        // skrót musi być napisany skrótem (pełna forma to nie to zadanie)
        if (keepApos(v) === keepApos(a)) return 'ok';
        const noApos = (s) => keepApos(s).replace(/'/g, '');
        if (noApos(v) === noApos(a)) best = 'typo'; // „Im tired” — skrót dobry, zgubiony apostrof
        else if (v.includes("'") && Answer.check(v, a) !== 'wrong') best = 'typo';
        continue;
      }
      const r = Answer.check(v, a);
      if (r === 'ok') return 'ok';
      if (r === 'typo') best = 'typo';
    }
    return best;
  }

  const api = { generate, check, supported: (id) => !!GEN[id], SUPPORTED: Object.keys(GEN) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Exercises = api;
})(typeof window !== 'undefined' ? window : globalThis);
