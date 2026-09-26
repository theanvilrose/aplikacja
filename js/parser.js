// Parser tabel ze słówkami w formacie slowka.md (działa w przeglądarce i w Node).
(function (root) {
  'use strict';

  const HEADERS = {
    en: /słowo|zwrot|word/i,
    pos: /część mowy/i,
    pron: /wymowa/i,
    pl: /tłumaczenie/i,
    mnemo: /skojarzenie/i,
    example: /przykład/i,
    added: /^data$/i,
  };

  function splitRow(line) {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
  }

  function wordId(en) {
    return en.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function parseTopic(title) {
    const t = title.replace(/\s*\(\d+\)\s*$/, '').trim();
    const m = t.match(/^(\S+)\s+(.*)$/);
    if (m && !/\p{L}/u.test(m[1])) return { icon: m[1], name: m[2] };
    return { icon: '📘', name: t };
  }

  function parseMarkdown(md) {
    const out = [];
    const seen = new Set();
    let topic = { icon: '📘', name: 'Inne' };
    let cols = null; // null = czekamy na nagłówek tabeli, false = tabela bez słówek

    for (const line of md.split(/\r?\n/)) {
      const h = line.match(/^##\s+(.+?)\s*$/);
      if (h) {
        topic = parseTopic(h[1]);
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
        continue;
      }
      if (cols === false) continue;

      const get = (k) => (cols[k] === undefined ? '' : (cells[cols[k]] || '').replace(/\*/g, '').trim());
      const en = get('en');
      const pl = get('pl');
      if (!en || !pl) continue;
      const id = wordId(en);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        en,
        pl,
        pron: get('pron'),
        pos: get('pos').replace(/^[^\p{L}]+/u, ''),
        topic: topic.name,
        icon: topic.icon,
        mnemo: get('mnemo'),
        example: get('example'),
        added: /^\d{4}-\d{2}-\d{2}$/.test(get('added')) ? get('added') : '',
      });
    }
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
