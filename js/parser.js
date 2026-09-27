// Parser tabel ze słówkami w formacie slowka.md (działa w przeglądarce i w Node).
(function (root) {
  'use strict';

  const HEADERS = {
    en: /słowo|zwrot|word/i,
    pos: /część mowy/i,
    pron: /wymowa/i,
    pl: /tłumaczenie/i,
    level: /^poziom$/i,
    article: /przedrostek/i,
    notes: /^uwagi$/i,
    mnemo: /skojarzenie/i,
    example: /przykład/i,
    where: /dział w słowniku/i,
    added: /^data$/i,
  };
  // część mowy z nazwy działu (czesci_mowy.md: „🟪 5. Zaimki (Pronouns) – 76 zaimków”)
  const SECTION_POS = [[/^rzeczown/i, 'rz.'], [/^czasown/i, 'cz.'], [/^przymiotn/i, 'przym.'], [/^przysłów/i, 'przysł.'], [/^zaim/i, 'zaim.'], [/^przyim/i, 'przyim.'], [/^spójn/i, 'spój.'], [/^liczebn/i, 'liczeb.'], [/^zwrot/i, 'zwrot']];

  function splitRow(line) {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
  }

  function wordId(en) {
    return en.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // „👋 1. Przedstawianie się, Powitania (Introducing Yourself) – 44 zwroty” → { icon: 👋, name: Przedstawianie się, Powitania }
  function cleanTopic(t) {
    return t.replace(/\s*\(\d+\)\s*$/, '').replace(/\s+[–—]\s+.*$/, '').replace(/^\d+\.\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  }
  function parseTopic(title) {
    const m = title.trim().match(/^(\S+)\s+(.*)$/);
    if (m && !/[\p{L}\d]/u.test(m[1])) return { icon: m[1], name: cleanTopic(m[2]) };
    return { icon: '📘', name: cleanTopic(title) };
  }

  // Wczytuje tabele słówek z jednego albo kilku plików (slownik.md, zwroty.md, czesci_mowy.md; dawniej slowka.md).
  // To samo słowo w kilku działach → jeden wpis: topic = pierwszy dział, topics = wszystkie.
  function parseMarkdown(md) {
    const out = [];
    const seen = new Map();
    let topic = { icon: '📘', name: 'Inne' };
    let secPos = '';
    const icons = new Map(); // ikona działu z nagłówka — dla słów, których dział podano tylko z nazwy
    let cols = null; // null = czekamy na nagłówek tabeli, false = tabela bez słówek

    for (const line of (Array.isArray(md) ? md.join('\n') : md).split(/\r?\n/)) {
      const h = line.match(/^##\s+(.+?)\s*$/);
      if (h) {
        topic = parseTopic(h[1]);
        if (topic.icon !== '📘') icons.set(topic.name, topic.icon);
        secPos = (SECTION_POS.find(([re]) => re.test(topic.name)) || [])[1] || '';
        cols = null;
        continue;
      }
      if (!line.trim().startsWith('|')) {
        cols = null;
        continue;
      }
      const cells = splitRow(line);
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;

      if (cols === null) {
        cols = {};
        cells.forEach((c, i) => {
          for (const k in HEADERS) if (cols[k] === undefined && HEADERS[k].test(c)) cols[k] = i;
        });
        if (cols.en === undefined || cols.pl === undefined) cols = false;
        // tabela zwrotów (kolumna „Zwrot / Wyrażenie”) nie ma części mowy
        else if (cols.pos === undefined && /zwrot/i.test(cells[cols.en])) cols.phrase = true;
        continue;
      }
      if (cols === false) continue;

      const get = (k) => (cols[k] === undefined ? '' : (cells[cols[k]] || '').replace(/\*/g, '').trim());
      const opt = (k) => { const v = get(k); return v === '—' || v === '-' ? '' : v; };
      const en = get('en');
      const pl = get('pl');
      if (!en || !pl) continue;
      // czesci_mowy.md: dział ze słownika w kolumnie „Dział w słowniku” (pierwszy = główny)
      const where = opt('where').split(/,\s*(?=\S*\s*\d+\.)/).map((t) => parseTopic(t)).filter((t) => t.name);
      const tp = where[0] ? { name: where[0].name, icon: icons.get(where[0].name) || where[0].icon } : topic;
      const id = wordId(en);
      const prev = seen.get(id);
      if (prev) {
        for (const t of cols.where !== undefined ? where : [topic]) if (prev.topic !== t.name && !(prev.topics || []).includes(t.name)) (prev.topics ||= [prev.topic]).push(t.name);
        continue;
      }
      const w = {
        id,
        en,
        pl,
        pron: get('pron'),
        pos: cols.phrase ? 'zwrot' : get('pos').replace(/^[^\p{L}]+/u, '') || secPos,
        topic: tp.name,
        icon: tp.icon,
        level: /^[ABC][12]$/.test(get('level')) ? get('level') : '',
        article: opt('article'),
        notes: opt('notes'),
        mnemo: opt('mnemo'),
        example: get('example'),
        added: /^\d{4}-\d{2}-\d{2}$/.test(get('added')) ? get('added') : '',
      };
      if (where.length > 1) w.topics = where.map((t) => t.name);
      for (const k of ['level', 'article', 'notes', 'added']) if (!w[k]) delete w[k];
      seen.set(id, w);
      out.push(w);
    }
    // dodatkowe działy tylko spośród prawdziwych tematów (bez nagłówków rejestru części mowy)
    const real = new Set(out.map((w) => w.topic));
    for (const w of out) if (w.topics) { w.topics = w.topics.filter((t) => real.has(t)); if (w.topics.length < 2) delete w.topics; }
    return out;
  }

  // Plan kursu z program_A1.md: tabela „Kolejność lekcji” (lekcja | rozdział | gramatyka | temat | status)
  // i tabela tematów (temat | rozdziały | kluczowe słowa).
  function parseProgram(md) {
    const lessons = [];
    const themes = {};
    let kind = null; // 'lessons' | 'themes' | null
    let cols = null;
    const status = (s) => (/✅/.test(s) ? 'done' : /📝/.test(s) ? 'progress' : 'todo');

    for (const line of md.split(/\r?\n/)) {
      if (!line.trim().startsWith('|')) { kind = null; cols = null; continue; }
      const cells = splitRow(line);
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      if (!cols) {
        const find = (re) => cells.findIndex((c) => re.test(c));
        cols = { lesson: find(/^lekcja$/i), chapter: find(/rozdział/i), grammar: find(/gramatyka/i), theme: find(/^temat/i), status: find(/status/i), words: find(/kluczowe/i) };
        kind = cols.lesson >= 0 && cols.grammar >= 0 && cols.status >= 0 ? 'lessons' : cols.theme >= 0 && cols.words >= 0 ? 'themes' : 'other';
        continue;
      }
      if (kind === 'lessons') {
        const id = cells[cols.lesson];
        const m = id.match(/^L(\d+)$/i);
        if (!m) continue;
        const chapter = cells[cols.chapter] || '';
        lessons.push({
          id: 'L' + m[1],
          n: +m[1],
          title: chapter.replace(/^R\d+\s*/i, '').trim(),
          grammar: cells[cols.grammar] || '',
          theme: (cells[cols.theme] || '').trim(),
          status: status(cells[cols.status] || ''),
        });
      } else if (kind === 'themes') {
        const m = (cells[cols.theme] || '').match(/^(T\d+)\s+(.*)$/);
        if (!m) continue;
        themes[m[1]] = {
          name: m[2].trim(),
          words: (cells[cols.words] || '').split(',').map((w) => w.replace(/✅/g, '').trim()).filter(Boolean),
        };
      }
    }
    return { lessons, themes };
  }

  const api = { parseMarkdown, parseProgram, wordId };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Parser = api;
})(typeof window !== 'undefined' ? window : globalThis);
