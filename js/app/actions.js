// Słowik — Akcje (kliknięcia, klawiatura, formularze) i start aplikacji — ładowany jako ostatni.
// Pliki js/app/*.js to jeden program podzielony na części (kolejność w index.html ma znaczenie).
'use strict';

// ---------- akcje ----------

// toast(msg) — krótki komunikat; toast(msg, { undo }) — z przyciskiem „Cofnij” i paskiem odliczania (ok. 5 s)
function toast(msg, { undo, ms } = {}) {
  const t = $('#toast');
  ms = ms || (undo ? 5000 : 2800);
  t.className = 'toast' + (undo ? ' has-undo' : '');
  t.innerHTML = `<span>${esc(msg)}</span>` + (undo ? `<button class="toast-undo" type="button">Cofnij</button><i class="toast-time" style="animation-duration:${ms}ms"></i>` : '');
  if (undo) t.querySelector('.toast-undo').onclick = () => { clearTimeout(toast.timer); t.hidden = true; undo(); };
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, ms);
}

function importMarkdown(text) {
  const parsed = Parser.parseMarkdown(text);
  if (!parsed.length) return toast('Nie znaleziono słówek w pliku');
  const before = new Set(words.map((w) => w.id));
  const extra = new Map(db.extra.map((w) => [w.id, w]));
  for (const w of parsed) extra.set(w.id, w);
  db.extra = [...extra.values()];
  save();
  buildWords();
  const added = parsed.filter((w) => !before.has(w.id)).length;
  toast(`Wczytano ${parsed.length} słówek (${added} nowych)`);
  render();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `slowik-kopia-${dayKey()}.json`;
  a.click();
  db.lastBackup = Date.now();
  save();
  toast('💾 Kopia zapisana w folderze Pobrane');
  render();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { return toast('To nie jest poprawny plik kopii'); }
  if (!d || typeof d.cards !== 'object') return toast('To nie jest poprawny plik kopii');
  if (!(await ask({ title: 'Wczytać kopię?', text: 'Obecne postępy zostaną zastąpione tą kopią.', ok: 'Wczytaj', danger: true }))) return;
  db = normalize(d);
  save();
  buildWords();
  toast('Wczytano kopię');
  render();
}

function go(v) {
  if (v !== 'player') stopPlayer();
  view = v;
  render();
  window.scrollTo(0, 0);
}

function openCollection(ref) {
  if (ref && view !== 'words') collFrom = view === 'packs' ? 'packs' : 'home';
  wordsFilter = { q: '', coll: ref, status: '', kind: '' };
  go('words');
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act],[data-say],[data-slow],[data-opt],[data-view],[data-coll],[data-status],[data-player],[data-exam],[data-listtoggle],[data-setval],[data-toggle],[data-slide],[data-ptab],[data-kind],[data-wopen],[data-taskpart]');
  if (!el || el.disabled) return;
  const ds = el.dataset;
  if (ds.slide !== undefined) {
    const deck = $('#dailyDeck');
    const idx = +ds.slide;
    if (deck) {
      deck.scrollTo({ left: idx * deck.clientWidth, behavior: 'smooth' });
      document.querySelectorAll('#carouselDots .dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    }
    return;
  }
  if (ds.say !== undefined) { e.preventDefault(); speak(ds.say); return; }
  if (ds.wopen) { showWord(ds.wopen); return; }
  if (ds.slow !== undefined) { speak(ds.slow, 0.6); return; }
  if (ds.opt !== undefined) { choose(+ds.opt); return; }
  if (ds.player) { playerControl(ds.player); return; }
  if (ds.exam) { startSession({ exam: ds.exam }); return; }
  if (ds.setval) {
    const [k, v] = ds.setval.split(':');
    db.settings[k] = /^\d+$/.test(v) ? +v : v;
    save();
    render();
    return;
  }
  if (ds.toggle) { db.settings[ds.toggle] = !db.settings[ds.toggle]; save(); render(); return; }
  if (ds.taskpart) {
    const p = db.settings.taskParts;
    const next = p.includes(ds.taskpart) ? p.replace(ds.taskpart, '') : [...p + ds.taskpart].sort().join('');
    if (!next) return toast('Zostaw przynajmniej jedną część');
    db.settings.taskParts = next; save(); render(); return;
  }
  if (ds.status !== undefined) { wordsFilter.status = ds.status; render(); return; }
  if (ds.kind !== undefined) { wordsFilter.kind = ds.kind; wordsFilter.status = ''; render(); return; }
  if (ds.ptab) { packsTab = ds.ptab; render(); return; }
  if (ds.coll !== undefined) { e.preventDefault(); openCollection(ds.coll); return; }
  if (ds.listtoggle) { toggleInList(ds.listtoggle, ds.word); render(); return; }
  if (ds.view) {
    if (ds.view === 'words') wordsFilter = { q: '', coll: '', status: '', kind: '' };
    go(ds.view);
    return;
  }
  const coll = collection(wordsFilter.coll);
  switch (ds.act) {
    case 'start': startSession(); break;
    case 'extra': startSession({ mode: 'extra' }); break;
    case 'start-coll': if (coll) startPick(coll.ref); break;
    case 'resume': collFrom = 'packs'; wordsFilter = { q: '', coll: ds.ref, status: '', kind: '' }; view = 'words'; startPick(ds.ref); break;
    case 'pick-learn': pickWord('learn'); break;
    case 'b-tile': buildTap(+ds.i); break;
    case 'b-back': buildBack(); break;
    case 'p-pick': pairPick(ds.side, ds.id); break;
    case 'sync-connect': syncConnect($('#sync-pin')?.value); break;
    case 'sync-now': syncNow(); break;
    case 'tf-no': chooseTf(false); break;
    case 'tf-yes': chooseTf(true); break;
    case 'intro-later': introSkip(false); break;
    case 'intro-known': introSkip(true); break;
    case 'pick-later': pickWord('later'); break;
    case 'pick-known': pickWord('known'); break;
    case 'pick-start': finishPick(); break;
    case 'pick-back': { const back = PK?.back || 'words'; PK = null; view = back; render(); break; }
    case 'word-back': closeWord(); break;
    case 'word-fav': toggleFav(wordView.id); render(); break;
    case 'word-learn': startSession({ ids: [wordView.id] }); break;
    case 'word-practice': startSession({ ids: [wordView.id], mode: 'drill' }); break;
    case 'word-known': markKnown(wordView.id); toast('✓ Wyuczone — jutro szybkie sprawdzenie'); render(); break;
    case 'word-relearn': relearn(wordView.id); toast('Słowo wróciło do nauki'); startSession({ ids: [wordView.id], mode: 'drill', intro: true }); break;
    case 'retry-wrong': startSession({ ids: S.answers.filter((a) => !a.correct).map((a) => a.id), mode: 'drill' }); break;
    case 'drill-mistakes': startSession({ ids: db.mistakes, mode: 'drill' }); break;
    case 'path-done': toast(ds.msg); break;
    case 'listen-quiz': startSession({ mode: 'listen' }); break;
    case 'player': startPlayer(); break;
    case 'player-quick': startPlayer('__seen'); break;
    case 'player-close': go(P ? P.from : 'listen'); break;
    case 'known': wordsFilter = { q: '', coll: '', status: 'known' }; go('words'); break;
    case 'coll-player': if (coll) startPlayer(byKind(coll.ws).map((w) => w.id)); break;
    case 'coll-review': if (coll) startSession({ ids: byKind(coll.ws).filter((w) => db.cards[w.id]).map((w) => w.id), mode: 'extra' }); break;
    case 'all-words': go('packs'); break;
    case 'new-list':
      createList(ds.word).then((l) => { if (l && !ds.word) openCollection('list:' + l.id); else render(); });
      break;
    case 'rename-list': if (coll?.list) renameList(coll.list); break;
    case 'delete-list': if (coll?.list) deleteList(coll.list); break;
    case 'intro-next': introDone(); break;
    case 'next': advance(); break;
    case 'hint': hint(); break;
    case 'dunno': S.cur.typed = $('#typed')?.value || ''; S.cur.result = 'wrong'; answer(false, false, S.cur.typed); break;
    case 'quit': quitSession(); break;
    case 'home': go('home'); break;
    case 'task-lesson': taskLesson = ds.lesson; render(); break;
    case 'tasks-start': { const L = selectedTaskLesson(); if (L) startTasks(L.id, ds.part || ''); break; }
    case 'task-pick': if (EX && !EX.checked) { EX.values[ds.k] = ds.v; render(); } break;
    case 'tasks-check': checkTasks(); break;
    case 'tasks-new': if (EX) { startTasks(EX.lesson, EX.part); window.scrollTo(0, 0); } break;
    case 'tasks-back':
      if (EX && !EX.checked && Object.keys(EX.values).length) {
        ask({ title: 'Wyjść z zadań?', text: 'Odpowiedzi nie zostaną sprawdzone.', ok: 'Wyjdź', cancel: 'Zostaję' }).then((yes) => { if (yes) { EX = null; go('home'); } });
      } else { EX = null; go('home'); }
      break;
    case 'coll-next': { const ref = S.coll; reopenColl(ref); startPick(ref); break; }
    case 'coll-return': reopenColl(S.coll); go('words'); break;
    case 'buy-freeze': buyFreeze(); break;
    case 'chest-info': toast('🎁 Dzisiejsza skrzynia już otwarta — wróć jutro po kolejną!'); break;
    case 'ex-toggle': {
      const off = new Set(db.settings.exOff || []);
      if (off.has(ds.t)) off.delete(ds.t);
      else if (EX_ORDER.filter((t) => !off.has(t)).length <= 1) { toast('Zostaw włączone przynajmniej jedno ćwiczenie'); break; }
      else off.add(ds.t);
      db.settings.exOff = [...off];
      save(); render();
      break;
    }
    case 'plan-defaults':
      for (const k of PLAN_KEYS) db.settings[k] = DEFAULT_SETTINGS[k];
      save(); toast('Przywrócono ustawienia domyślne'); render();
      break;
    case 'export': exportBackup(); break;
    case 'dev-tab': AUD.tab = ds.tab; render(); break;
    case 'tts-prov': ttsCfg().all.provider = ds.prov; save(); AUD.loadErr = ''; ttsDefaults(); render(); break;
    case 'tts-lang': AUD.lang = ds.lang; AUD.loadErr = ''; ttsDefaults(); render(); break;
    case 'tts-kind': AUD.kind = ds.kind; render(); break;
    case 'tts-sample': {
      const { provider, cur } = ttsCfg(), v = provider !== 'openrouter' && elVoice(cur.voice);
      // ElevenLabs ma darmowe próbki głosów; OpenRouter nagrywa krótkie zdanie (ułamek centa)
      if (v && v.preview && AUD.lang !== 'pl') playAudio(v.preview).play().catch(() => {});
      else ttsGenerate(TTS_LANG[AUD.lang].sample, { sample: true });
      break;
    }
    case 'tts-gen': AUD.lang = ds.lang; ttsGenerate(ds.text); break;
    case 'tts-save': ttsSave(ds.lang, ds.text); break;
    case 'tts-remove': ttsRemove(ds.lang, ds.text); break;
    case 'tts-play': {
      const src = ds.prev ? AUD.preview[audKey(ds.lang, ds.text)] : 'assets/audio/' + ((window.WORD_AUDIO || {})[ds.lang] || {})[audioKey(ds.text)];
      playAudio(src).play().catch(() => toast('Nie da się odtworzyć'));
      break;
    }
    case 'tts-bulk': ttsBulk(); break;
    case 'tts-stop': if (AUD.bulk) { AUD.bulk.stop = true; toast('Zatrzymuję po bieżącym nagraniu…'); } break;
    case 'dev-gen': devGenerate(ds.id); break;
    case 'dev-save': devSave(ds.id); break;
    case 'dev-remove': devRemove(ds.id); break;
    case 'dev-bulk': devBulk(); break;
    case 'dev-stop': if (DEVS.bulk) { DEVS.bulk.stop = true; toast('Zatrzymuję po bieżącej ikonie…'); } break;
    case 'dev-model': DEVS.model = ds.model; render(); break;
    case 'dev-muse': db.settings.devMuse = !db.settings.devMuse; save(); render(); break;
    case 'dev-topic': DEVS.topic = DEVS.topic === ds.topic ? '' : ds.topic; render(); break;
    case 'backup-later': db.backupSnooze = Date.now() + 3 * DAY; save(); render(); break;
    case 'reset':
      ask({ title: 'Wyzerować wszystko?', text: 'Cały postęp nauki, diamenty, seria, odznaki i listy znikną. Tego nie da się cofnąć.', ok: 'Wyzeruj', danger: true }).then((yes) => {
        if (!yes) return;
        db = normalize({ extra: db.extra, settings: db.settings });
        save(); toast('Postępy wyzerowane'); render();
      });
      break;
  }
});

// Szerokość paska przewijania — sekcja Plan dnia sięga dokładnie do krawędzi okna.
const updateScrollbar = () => document.documentElement.style.setProperty('--sbw', `${innerWidth - document.documentElement.clientWidth}px`);
addEventListener('resize', updateScrollbar);
new ResizeObserver(updateScrollbar).observe(document.body);

// Efekt fali po kliknięciu w przyciski Planu dnia.
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.ph-cta, .ph-task, .pk-card, .cv-learn, .pick-go, .rs-go, .tk-opt, .lk-part');
  if (!el) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const s = document.createElement('span');
  s.className = 'ripple';
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.appendChild(s);
  setTimeout(() => s.remove(), 650);
});

// Poziome paski (Pakiety słówek): przeciąganie myszą jak palcem na telefonie; kółko myszy też przewija w bok.
const DRAG_ROWS = '.packs';
let rowDrag = null;
document.addEventListener('pointerdown', (e) => {
  const row = e.pointerType === 'mouse' && e.button === 0 && e.target.closest(DRAG_ROWS);
  if (!row) return;
  rowDrag = { row, x: e.clientX, left: row.scrollLeft, moved: false };
});
document.addEventListener('pointermove', (e) => {
  if (!rowDrag) return;
  const dx = e.clientX - rowDrag.x;
  if (!rowDrag.moved && Math.abs(dx) < 6) return;
  if (!rowDrag.moved) { rowDrag.moved = true; rowDrag.row.classList.add('dragging'); }
  rowDrag.row.scrollLeft = rowDrag.left - dx;
});
const endRowDrag = () => {
  if (!rowDrag) return;
  const { row, moved } = rowDrag;
  rowDrag = null;
  row.classList.remove('dragging');
  // po przeciągnięciu nie otwieraj pakietu, na którym puszczono przycisk
  if (moved) document.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
};
document.addEventListener('pointerup', endRowDrag);
document.addEventListener('pointercancel', endRowDrag);
document.addEventListener('wheel', (e) => {
  const row = e.target.closest(DRAG_ROWS);
  if (!row || Math.abs(e.deltaX) > Math.abs(e.deltaY) || row.scrollWidth <= row.clientWidth) return;
  const max = row.scrollWidth - row.clientWidth;
  if ((e.deltaY < 0 && row.scrollLeft <= 0) || (e.deltaY > 0 && row.scrollLeft >= max - 1)) return; // na końcu — przewijaj stronę
  e.preventDefault();
  row.scrollBy({ left: e.deltaY, behavior: 'smooth' });
}, { passive: false });

// Pamiętamy rozwinięte słówko, żeby nie zwijało się po zmianie listy.
document.addEventListener('click', (e) => {
  document.querySelectorAll('.cv-menu[open]').forEach((m) => { if (!m.contains(e.target) || e.target.closest('.cv-pop button')) m.open = false; });
}, true);

document.addEventListener('submit', (e) => {
  if (e.target.dataset.form === 'type') { e.preventDefault(); if (S?.cur.answered) advance(); else submitTyped(); }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.task && EX && !EX.checked) {
    EX.values[t.dataset.task] = t.value;
    const btn = $('[data-act="tasks-check"] span');
    const total = EX.sections.reduce((n, s) => n + s.items.length, 0);
    const answered = Object.values(EX.values).filter((v) => String(v).trim()).length;
    if (btn) btn.textContent = `Sprawdź${answered < total ? ` (${answered}/${total})` : ''}`;
    return;
  }
  if (t.id === 'q') { wordsFilter.q = t.value; const pos = t.selectionStart; render(); const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos); }
  if (t.dataset.set === 'rate') { db.settings.rate = +t.value; $('#rate-val').textContent = (+t.value).toFixed(2); save(); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'coll') { wordsFilter.coll = t.value; wordsFilter.status = ''; collFrom = 'words'; render(); }
  if (t.id === 'listen-source') listenSource = t.value;
  if (t.id === 'tts-model') { ttsCfg().cur.model = t.value; ttsDefaults(); save(); render(); }
  if (t.id === 'tts-voice') { ttsCfg().cur.voice = t.value; save(); render(); }
  const key = t.dataset.set;
  if (key && key !== 'rate') {
    db.settings[key] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Math.max(0, +t.value || 0) : t.value.trim();
    if (key === 'accent') db.settings.voice = '';
    save();
    render();
  }
  if (t.dataset.file && t.files[0]) {
    const kind = t.dataset.file;
    t.files[0].text().then((text) => (kind === 'md' ? importMarkdown(text) : importBackup(text)));
    t.value = '';
  }
});

document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog.ask')) return; // otwarte okienko obsługuje klawisze samo
  if (view === 'tasks' && e.key === 'Enter' && e.target.classList?.contains('tk-input')) {
    e.preventDefault();
    const inputs = [...document.querySelectorAll('.tk-input:not([readonly])')];
    const next = inputs[inputs.indexOf(e.target) + 1];
    if (next) next.focus(); else $('[data-act="tasks-check"]')?.focus();
    return;
  }
  if (view === 'player' && e.key === ' ') { e.preventDefault(); playerControl('toggle'); return; }
  if (view === 'word' && e.key === 'Escape') { closeWord(); return; }
  if (view === 'pick' && PK && e.target.tagName !== 'BUTTON') {
    const act = { Enter: 'learn', ArrowLeft: 'later', ArrowRight: 'known', Escape: 'back' }[e.key];
    if (act === 'back') { const back = PK.back; PK = null; view = back; render(); return; }
    if (act) { e.preventDefault(); pickWord(act); return; }
  }
  if (view !== 'session' || !S) return;
  // przytrzymany klawisz nie przewija wielu kroków; skróty z Ctrl/Alt zostają przeglądarce
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  // Enter / spacja na przycisku (Później, Wiem, Cofnij…) klikają ten przycisk — nie „Dalej”
  if ((e.key === 'Enter' || e.key === ' ') && e.target.tagName === 'BUTTON') return;
  const inInput = e.target.tagName === 'INPUT';
  if (e.key === 'Enter' && e.target.id === 'typed') {
    e.preventDefault();
    if (S.cur.answered) advance(); else submitTyped();
  } else if (e.key === 'Enter' && !inInput) {
    e.preventDefault();
    if (S.cur.type === 'intro') introDone();
    else if (S.cur.answered) advance();
  } else if (!inInput && S.cur.type === 'truefalse' && ['1', '2', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    chooseTf(e.key === '2' || e.key === 'ArrowRight');
  } else if (!inInput && S.cur.type === 'build' && !S.cur.answered && (e.key === 'Backspace' || /^[a-z]$/i.test(e.key))) {
    e.preventDefault();
    if (e.key === 'Backspace') buildBack(); else buildKey(e.key);
  } else if (!inInput && /^[1-4]$/.test(e.key) && S.cur.options) {
    choose(+e.key - 1);
  } else if (e.key === ' ' && (!inInput || (e.target.id === 'typed' && S.cur.answered))) {
    // spacja: po odpowiedzi (i na ekranie nowego słowa) — „Dalej”; przed odpowiedzią — posłuchaj słowa
    e.preventDefault();
    if (S.cur.type === 'intro') introDone();
    else if (S.cur.answered) advance();
    // przed odpowiedzią — posłuchaj, ale tylko gdy angielskie słowo nie jest tym, o co pytamy
    else if (['en2pl', 'truefalse', 'pic4', 'listen2pl', 'dictation'].includes(S.cur.type) || (S.cur.type === 'build' && S.cur.build.mode !== 'letters+')) speak(S.cur.w.en);
  } else if (e.key === 'Escape') {
    // okienko otwieramy po zakończeniu tego Esc — inaczej przeglądarka od razu by je zamknęła
    e.preventDefault();
    setTimeout(quitSession, 0);
  }
});

// ---------- start ----------

$('#nav').innerHTML = [
  ['home', 'learn', 'Nauka'],
  ['listen', 'listen', 'Audio'],
  ['words', 'words', 'Słownictwo'],
  ['profile', 'settings', 'Ustawienia'],
].map(([v, icon, label]) => `<button data-view="${v}"><span class="nav-ind"></span>${ICON[icon]}<span>${label}</span></button>`).join('');
buildWords();
applyFreezes();
render();
devInit();
syncInit();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  // ikony i nagrania do pracy offline: service worker dociąga brakujące w tle (pobierane tylko raz)
  navigator.serviceWorker.ready.then((reg) => reg.active && reg.active.postMessage('fill-media')).catch(() => {});
}
