// Generator zadań z lekcji (jak w arkuszu z czatu): A. wybór, B. luki, C. przekształcenia, D. tłumaczenie.
// Każda lekcja ma szablony pod swoją gramatykę (program_A1.md). Słowa biorą się WYŁĄCZNIE z przekazanej listy
// (Twoje słówka — wszystkie z lekcji albo tylko poznane): przedmiot, zawód, kraj czy nastrój, którego na niej nie ma,
// po prostu się nie pojawi, a zadanie, którego nie da się z nich ułożyć, jest pomijane. Jedyny dodatek to imiona
// (Tom, Anna, Mr Smith…) — to nie słówka, tylko postacie do zdań. Działa w przeglądarce i w Node (testy).
(function (root) {
  'use strict';

  const Answer = root.Answer || (typeof require !== 'undefined' ? require('./answer.js') : null);

  // ---------- imiona (nie słówka) ----------
  const MEN = [
    { en: 'Tom', pl: 'Tom' }, { en: 'Adam', pl: 'Adam' }, { en: 'Jack', pl: 'Jack' },
    { en: 'David', pl: 'David' }, { en: 'Mr Smith', pl: 'pan Smith' }, { en: 'Mr Brown', pl: 'pan Brown' },
  ];
  const WOMEN = [
    { en: 'Anna', pl: 'Anna' }, { en: 'Kate', pl: 'Kate' }, { en: 'Emma', pl: 'Emma' },
    { en: 'Sarah', pl: 'Sarah' }, { en: 'Mrs Brown', pl: 'pani Brown' }, { en: 'Ms Taylor', pl: 'pani Taylor' },
  ];

  // ---------- gramatyka polskich form (używane tylko, gdy słowo JEST w Twoich słówkach) ----------
  // przedmioty, które mogą się pojawić w L4 (T2 biuro, T4 rzeczy osobiste) — tłumaczenie bierzemy z Twoich słówek
  const THING_IDS = ['laptop', 'desk', 'office', 'chair', 'computer', 'phone', 'bag', 'wallet', 'umbrella', 'keys', 'glasses', 'purse', 'book', 'pen', 'table'];
  // zawody: narzędnik do zdań „On jest kierownikiem”; g = kto może być podmiotem
  const JOB_FORMS = {
    manager: [['m', 'kierownikiem'], ['f', 'kierowniczką']], engineer: [['m', 'inżynierem']], mechanic: [['m', 'mechanikiem']],
    boss: [['m', 'szefem']], teacher: [['m', 'nauczycielem'], ['f', 'nauczycielką']], nurse: [['f', 'pielęgniarką']],
    doctor: [['m', 'lekarzem'], ['f', 'lekarką']], student: [['m', 'studentem'], ['f', 'studentką']],
  };
  // kraj → dopełniacz („z Hiszpanii”) i id narodowości
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
  // przymiotniki pasujące do „I'm …” / „Jestem …”
  const MOOD_WORDS = ['tired', 'happy', 'sad', 'busy', 'hungry', 'thirsty', 'cold', 'hot', 'bored', 'angry', 'sick', 'ill'];

  const art = (en) => (/^[aeiou]/i.test(en) ? 'an ' : 'a ') + en;
  const zPL = (gen) => (/^S[zk]/.test(gen) ? 'ze ' : 'z ') + gen;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const first = (s) => String(s).split(/\s*[\/(;,]\s*/)[0].trim();

  // ---------- zasoby z Twoich słówek ----------
  function pool(words, rand) {
    const shuffle = (a) => {
      a = a.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    };
    const pick = (a) => (a.length ? a[Math.floor(rand() * a.length)] : null);
    const byId = new Map(words.map((w) => [w.id, w]));
    const byEn = new Map(words.map((w) => [first(w.en).toLowerCase(), w]));
    const has = (en) => byId.get(en) || byEn.get(en);

    const countries = [];
    for (const [id, [gen, natId]] of Object.entries(COUNTRY)) {
      const c = byId.get(id);
      if (!c) continue;
      const n = byId.get(natId);
      countries.push({ en: first(c.en), gen, nat: n ? cap(first(n.en)) : null });
    }
    const things = THING_IDS.map((id) => ({ id, w: has(id) })).filter((t) => t.w)
      .map((t) => ({ en: t.id, pl: first(t.w.pl).toLowerCase() }));
    const jobs = [];
    for (const [id, forms] of Object.entries(JOB_FORMS)) if (has(id)) for (const [g, ins] of forms) jobs.push({ en: id, g, ins });
    const moods = words.filter((w) => /^przym/i.test(w.pos || '') && MOOD_WORDS.includes(first(w.en).toLowerCase()))
      .map((w) => ({ en: first(w.en).toLowerCase(), pl: first(w.pl).toLowerCase() }));

    // zwroty z tematów lekcji do tłumaczenia; „(= And you?)” w tłumaczeniu to druga dobra odpowiedź
    const phrases = (topics, skip = []) => words
      .filter((w) => topics.includes(w.topic) && /zwrot/i.test(w.pos || '') && w.en.length <= 40)
      .map((w) => {
        const alt = [...w.pl.matchAll(/\(\s*=\s*([^)]+)\)/g)].map((m) => m[1].trim());
        return { pl: w.pl.replace(/\s*\(\s*=[^)]*\)/g, '').trim(), answers: [w.en, ...alt] };
      })
      .filter((p) => p.pl && !skip.includes(p.pl))
      .reduce((out, p) => {
        const same = out.find((x) => x.pl === p.pl);
        if (same) same.answers.push(...p.answers); else out.push(p);
        return out;
      }, []);

    return {
      rand, shuffle, pick, has,
      men: MEN, women: WOMEN, names: [...MEN, ...WOMEN].filter((p) => !/ /.test(p.en)),
      countries, nats: countries.filter((c) => c.nat), things, jobs, moods, phrases,
    };
  }

  // ---------- rodzaje zadań ----------
  const choice = (x, prompt, options, answer) => ({ kind: 'choice', prompt, options: x.shuffle(options), answer });
  const text = (prompt, answers, mode = 'loose', tag = '') => ({ kind: 'text', prompt, answers: [].concat(answers), mode, tag });
  const need = (...xs) => xs.every((v) => v && (!Array.isArray(v) || v.length));

  // Szablony: funkcja (x) → zadanie albo null, gdy brakuje słów. Każda sekcja: [klucz, tytuł, domyślnie ile, szablony].
  const LESSONS = {
    // L1 Przedstawianie się: Hello / Hi, I'm…, What's your name?, Nice to meet you, Goodbye
    L1: [
      ['A', 'Wybierz dobrą odpowiedź', 5, [
        (x) => { const n = x.pick(x.names); return choice(x, "What's your name? → ___", [`I'm ${n.en}.`, 'Nice to meet you too.', 'Bye! See you!'], `I'm ${n.en}.`); },
        (x) => choice(x, 'Hello! → ___', ['Hi!', 'Bye! See you!', 'Nice to meet you too.'], 'Hi!'),
        (x) => choice(x, 'Nice to meet you. → ___', ['Nice to meet you too.', 'Hi!', 'Bye! See you!'], 'Nice to meet you too.'),
        (x) => choice(x, 'Goodbye! → ___', ['Bye! See you!', 'Nice to meet you too.', 'Hello!'], 'Bye! See you!'),
        (x) => { const [a, b] = x.shuffle(x.names); return choice(x, `Hi, I'm ${a.en}. → ___`, [`Hello, ${a.en}! I'm ${b.en}.`, 'Bye! See you!', `What's your name?`], `Hello, ${a.en}! I'm ${b.en}.`); },
      ]],
      ['B', 'Uzupełnij luki', 6, [
        (x) => choice(x, `I ___ ${x.pick(x.names).en}.`, ['am', 'is', 'are'], 'am'),
        (x) => choice(x, 'What ___ your name?', ['is', 'am', 'are'], 'is'),
        (x) => choice(x, `My ___ is ${x.pick(x.names).en}.`, ['name', 'meet', 'hello'], 'name'),
        (x) => choice(x, 'Nice to ___ you.', ['meet', 'name', 'is'], 'meet'),
        (x) => choice(x, `___, I'm ${x.pick(x.names).en}.`, ['Hi', 'Goodbye', 'Name'], 'Hi'),
        (x) => choice(x, '___! See you!', ['Goodbye', 'Hello', 'Nice'], 'Goodbye'),
      ]],
      ['C', 'Napisz w formie skróconej', 3, [
        (x) => { const n = x.pick(x.names); return text(`I am ${n.en}.`, `I'm ${n.en}.`, 'contraction', 'skrót'); },
        () => text('What is your name?', "What's your name?", 'contraction', 'skrót'),
        (x) => { const n = x.pick(x.names); return text(`I am ${n.en}. Nice to meet you.`, `I'm ${n.en}. Nice to meet you.`, 'contraction', 'skrót'); },
      ]],
      ['D', 'Przetłumacz na angielski', 6, [
        () => text('Jak masz na imię?', "What's your name?"),
        (x) => { const n = x.pick(x.names); return text(`Mam na imię ${n.pl}.`, [`My name is ${n.en}.`, `I'm ${n.en}.`]); },
        () => text('Miło cię poznać.', 'Nice to meet you.'),
        (x) => { const p = x.pick(x.phrases(['Powitania', 'Przedstawianie się', 'Pożegnania'], ['Jak masz na imię?', 'Miło cię poznać.'])); return p && text(p.pl, p.answers); },
      ]],
    ],

    // L2 Powitania: How are you? — I'm fine, thanks; I / you
    L2: [
      ['A', 'Wpisz I albo you', 6, [
        (x) => choice(x, '___ am fine, thanks.', ['I', 'you'], 'I'),
        (x) => choice(x, 'How are ___?', ['I', 'you'], 'you'),
        (x) => choice(x, "I'm fine. And ___?", ['I', 'you'], 'you'),
        (x) => { const m = x.pick(x.moods); return m && choice(x, `___'m ${m.en}.`, ['I', 'you'], 'I'); },
        (x) => { const m = x.pick(x.moods); return m && choice(x, `Are ___ ${m.en}?`, ['I', 'you'], 'you'); },
        (x) => { const m = x.pick(x.moods); return m && choice(x, `___ am ${m.en}.`, ['I', 'you'], 'I'); },
      ]],
      ['B', 'Uzupełnij am albo are', 6, [
        (x) => choice(x, 'How ___ you?', ['am', 'are'], 'are'),
        (x) => choice(x, 'I ___ fine, thanks.', ['am', 'are'], 'am'),
        (x) => { const m = x.pick(x.moods); return m && choice(x, `I ___ ${m.en}.`, ['am', 'are'], 'am'); },
        (x) => { const m = x.pick(x.moods); return m && choice(x, `You ___ ${m.en}.`, ['am', 'are'], 'are'); },
        (x) => { const m = x.pick(x.moods); return m && choice(x, `___ you ${m.en}?`, ['Am', 'Are'], 'Are'); },
      ]],
      ['C', 'Przekształć zdania', 4, [
        (x) => { const m = x.pick(x.moods); return m && text(`I am ${m.en}.`, `I'm ${m.en}.`, 'contraction', 'skrót'); },
        (x) => { const m = x.pick(x.moods); return m && text(`You are ${m.en}.`, `You're ${m.en}.`, 'contraction', 'skrót'); },
        (x) => { const m = x.pick(x.moods); return m && text(`You are ${m.en}.`, `Are you ${m.en}?`, 'loose', 'pytanie'); },
        () => text('I am fine, thanks.', "I'm fine, thanks.", 'contraction', 'skrót'),
      ]],
      ['D', 'Przetłumacz na angielski', 6, [
        () => text('Jak się masz?', 'How are you?'),
        (x) => { const m = x.pick(x.moods); return m && text(`Jestem ${m.pl}.`, `I'm ${m.en}.`); },
        (x) => { const m = x.pick(x.moods); return m && text(`Czy jesteś ${m.pl}?`, `Are you ${m.en}?`); },
        (x) => { const p = x.pick(x.phrases(['Powitania', 'Samopoczucie'], ['Jak się masz?'])); return p && text(p.pl, p.answers); },
      ]],
    ],

    // L3 Mówienie o sobie: Where are you from? — I'm from…; am / are; narodowości
    L3: [
      ['A', 'Wybierz narodowość', 6, [
        (x) => {
          if (x.nats.length < 3) return null;
          const [c, ...rest] = x.shuffle(x.nats);
          return choice(x, `${c.en} → ___`, [c.nat, ...rest.slice(0, 2).map((r) => r.nat)], c.nat);
        },
      ]],
      ['B', 'Uzupełnij am, are albo from', 6, [
        (x) => choice(x, 'Where ___ you from?', ['am', 'are', 'from'], 'are'),
        (x) => { const c = x.pick(x.countries); return c && choice(x, `I ___ from ${c.en}.`, ['am', 'are', 'from'], 'am'); },
        (x) => { const c = x.pick(x.countries); return c && choice(x, `I'm ___ ${c.en}.`, ['am', 'are', 'from'], 'from'); },
        (x) => { const c = x.pick(x.countries); return c && choice(x, `Are you ___ ${c.en}?`, ['am', 'are', 'from'], 'from'); },
        (x) => { const c = x.pick(x.nats); return c && choice(x, `You ___ ${c.nat}.`, ['am', 'are', 'from'], 'are'); },
        (x) => { const c = x.pick(x.nats); return c && choice(x, `I ___ ${c.nat}.`, ['am', 'are', 'from'], 'am'); },
      ]],
      ['C', 'Przekształć zdania', 4, [
        (x) => { const c = x.pick(x.countries); return c && text(`You are from ${c.en}.`, `Are you from ${c.en}?`, 'loose', 'pytanie'); },
        (x) => { const c = x.pick(x.nats); return c && text(`You are ${c.nat}.`, `Are you ${c.nat}?`, 'loose', 'pytanie'); },
        (x) => { const c = x.pick(x.countries); return c && text(`I am from ${c.en}.`, `I'm from ${c.en}.`, 'contraction', 'skrót'); },
        (x) => { const c = x.pick(x.nats); return c && text(`You are ${c.nat}.`, `You're ${c.nat}.`, 'contraction', 'skrót'); },
      ]],
      ['D', 'Przetłumacz na angielski', 6, [
        () => text('Skąd jesteś?', 'Where are you from?'),
        (x) => { const c = x.pick(x.countries); return c && text(`Jestem ${zPL(c.gen)}.`, `I'm from ${c.en}.`); },
        (x) => { const c = x.pick(x.countries); return c && text(`Czy jesteś ${zPL(c.gen)}?`, `Are you from ${c.en}?`); },
        (x) => { const p = x.pick(x.phrases(['Pochodzenie i miejsce zamieszkania', 'Kraje i narodowości'], ['Skąd jesteś?'])); return p && text(p.pl, p.answers); },
      ]],
    ],

    // L4 Ludzie i rzeczy: Who / What is this?; he / she / it is; a + przedmioty w biurze
    L4: [
      ['A', 'Wpisz he, she albo it', 6, [
        (x) => choice(x, `${x.pick(x.men).en} → ___`, ['he', 'she', 'it'], 'he'),
        (x) => choice(x, `${x.pick(x.women).en} → ___`, ['he', 'she', 'it'], 'she'),
        (x) => { const t = x.pick(x.things); return t && choice(x, `${art(t.en)} → ___`, ['he', 'she', 'it'], 'it'); },
        (x) => { const c = x.pick(x.countries); return c && choice(x, `${c.en} → ___`, ['he', 'she', 'it'], 'it'); },
      ]],
      ['B', 'Uzupełnij luki: is, a, an, Who albo What', 6, [
        (x) => { const c = x.pick(x.countries); return c && choice(x, `She ___ from ${c.en}.`, ['is', 'a', 'an', 'Who', 'What'], 'is'); },
        (x) => { const c = x.pick(x.nats); return c && choice(x, `He ___ ${c.nat}.`, ['is', 'a', 'an', 'Who', 'What'], 'is'); },
        (x) => choice(x, `___ is this? — This is ${x.pick(x.names).en}.`, ['is', 'a', 'an', 'Who', 'What'], 'Who'),
        (x) => { const t = x.pick(x.things); return t && choice(x, `It's ___ ${t.en}.`, ['is', 'a', 'an', 'Who', 'What'], /^[aeiou]/.test(t.en) ? 'an' : 'a'); },
        (x) => { const t = x.pick(x.things); return t && choice(x, `___ is this? — It's ${art(t.en)}.`, ['is', 'a', 'an', 'Who', 'What'], 'What'); },
        (x) => { const j = x.pick(x.jobs.filter((j) => j.g === 'm')); return j && choice(x, `He ___ ${art(j.en)}.`, ['is', 'a', 'an', 'Who', 'What'], 'is'); },
      ]],
      ['C', 'Przekształć zdania', 5, [
        (x) => { const c = x.pick(x.nats); return c && text(`He is ${c.nat}.`, `Is he ${c.nat}?`, 'loose', 'pytanie'); },
        (x) => { const c = x.pick(x.countries); return c && text(`She is from ${c.en}.`, `Is she from ${c.en}?`, 'loose', 'pytanie'); },
        (x) => { const j = x.pick(x.jobs.filter((j) => j.g === 'f')); return j && text(`She is ${art(j.en)}.`, `Is she ${art(j.en)}?`, 'loose', 'pytanie'); },
        (x) => { const t = x.pick(x.things); return t && text(`It is ${art(t.en)}.`, `Is it ${art(t.en)}?`, 'loose', 'pytanie'); },
        (x) => { const c = x.pick(x.countries); return c && text(`She is from ${c.en}.`, `She's from ${c.en}.`, 'contraction', 'skrót'); },
        (x) => { const c = x.pick(x.nats); return c && text(`He is ${c.nat}.`, `He's ${c.nat}.`, 'contraction', 'skrót'); },
        (x) => { const t = x.pick(x.things); return t && text(`It is ${art(t.en)}.`, `It's ${art(t.en)}.`, 'contraction', 'skrót'); },
      ]],
      ['D', 'Przetłumacz na angielski', 8, [
        () => text('Kto to jest?', ['Who is this?', 'Who is it?', 'Who is that?']),
        () => text('Co to jest?', ['What is this?', 'What is it?', 'What is that?']),
        (x) => { const w = x.pick(x.women); const c = x.pick(x.countries); return c && text(`To jest ${w.pl}. Ona jest ${zPL(c.gen)}.`, `This is ${w.en}. She is from ${c.en}.`); },
        (x) => { const m = x.pick(x.men); const c = x.pick(x.countries); return c && text(`To jest ${m.pl}. On jest ${zPL(c.gen)}.`, `This is ${m.en}. He is from ${c.en}.`); },
        (x) => { const c = x.pick(x.countries); return c && text(`Czy ona jest ${zPL(c.gen)}? — Tak.`, [`Is she from ${c.en}? Yes, she is.`, `Is she from ${c.en}? Yes.`]); },
        (x) => { const t = x.pick(x.things); return t && text(`To jest ${t.pl}.`, [`This is ${art(t.en)}.`, `It's ${art(t.en)}.`, `That is ${art(t.en)}.`]); },
        (x) => { const j = x.pick(x.jobs.filter((j) => j.g === 'm')); return j && text(`On jest ${j.ins}.`, `He is ${art(j.en)}.`); },
        (x) => { const j = x.pick(x.jobs.filter((j) => j.g === 'f')); return j && text(`Ona jest ${j.ins}.`, `She is ${art(j.en)}.`); },
      ]],
    ],
  };

  // Zbiera n różnych zadań: szablony po kolei (w losowej kolejności), każdy z innymi słowami.
  function build(templates, n, x) {
    const out = [];
    const seen = new Set();
    let order = x.shuffle(templates);
    for (let i = 0; out.length < n && i < n * 30; i++) {
      if (i && i % order.length === 0) order = x.shuffle(templates);
      const it = order[i % order.length](x);
      const key = it && it.prompt + '|' + (it.tag || '');
      if (!it || seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  }

  // opts.count — ile zadań w każdej części (domyślnie jak w lekcji); opts.parts — np. 'ABD'
  function generate(lessonId, words = [], rand = Math.random, opts = {}) {
    const def = LESSONS[lessonId];
    if (!def) return null;
    const x = pool(words, rand);
    const parts = opts.parts || 'ABCD';
    const sections = [];
    const skipped = [];
    for (const [key, title, size, templates] of def) {
      if (!parts.includes(key)) continue;
      const items = build(templates, opts.count || size, x);
      if (items.length) sections.push({ key, title, items });
      else skipped.push({ key, title });
    }
    return { lesson: lessonId, sections, skipped };
  }

  // Tytuły części lekcji (np. do ustawień) bez losowania.
  function parts(lessonId) {
    return (LESSONS[lessonId] || []).map(([key, title, size]) => ({ key, title, size }));
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

  const api = { generate, check, parts, supported: (id) => !!LESSONS[id], SUPPORTED: Object.keys(LESSONS) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Exercises = api;
})(typeof window !== 'undefined' ? window : globalThis);
