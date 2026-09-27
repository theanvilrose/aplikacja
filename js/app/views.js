// Słowik — Widoki: ekran główny, słuchanie, słownictwo, profil, pakiety, ustawienia planu, sesja, podsumowania.
// Pliki js/app/*.js to jeden program podzielony na części (kolejność w index.html ma znaczenie).
'use strict';

// ---------- widoki ----------

function render() {
  applyTheme();
  const views = { lists: viewLists, home: viewHome, listen: viewListen, words: viewWords, profile: viewProfile, session: viewSession, summary: viewSummary, player: viewPlayer, 'plan-settings': viewPlanSettings, packs: viewPacks, word: viewWord, pick: viewPick, tasks: viewTasks, 'task-settings': viewTaskSettings, dev: viewDev };
  $('#app').innerHTML = views[view]();
  const navHidden = view === 'session' || view === 'player' || view === 'pick' || view === 'word' || view === 'tasks' || (view === 'summary' && !!S?.chestOpened);
  $('#nav').hidden = navHidden;
  document.body.classList.toggle('no-nav', navHidden);
  const tab = view === 'words' && wordsFilter.coll && collFrom !== 'words' ? 'home' : view === 'summary' || view === 'plan-settings' || view === 'task-settings' || view === 'packs' ? 'home' : view === 'dev' ? 'profile' : view;
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === tab));

  const deck = $('#dailyDeck');
  if (deck) {
    deck.addEventListener('scroll', () => {
      const idx = Math.round(deck.scrollLeft / (deck.clientWidth || 1));
      document.querySelectorAll('#carouselDots .dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    }, { passive: true });
  }
}

const gemIcon = (cls = '') => `<span class="gem-i ${cls}">${ICON.gem}</span>`;
// Grafiki wycięte z projektu (tools/cutter.html → assets/)
const IMG = (name, cls = '', alt = '') => `<img class="${cls}" src="assets/${name}" alt="${alt}" draggable="false">`;

function statusBar() {
  const c = counts();
  const hot = counted(dayKey());
  return `
  <header class="statusbar">
    <button class="pill-stat stat-known" data-act="known" aria-label="Umiesz ${wordsLabel(c.known)}">${IMG('stat-check.png', 'stat-img')}<b>${c.known}</b></button>
    <button class="pill-stat stat-gems" data-view="profile" aria-label="${db.gems} diamentów">${IMG('stat-gem.png', 'stat-img')}<b>${db.gems}</b></button>
    <button class="pill-stat flame ${hot ? 'hot' : ''}" data-view="profile" aria-label="Seria: ${daysLabel(streak())}" title="${hot ? 'Dzisiejszy dzień zaliczony' : `Zrób ${STREAK_MIN} odpowiedzi, żeby przedłużyć serię`}">${IMG('stat-flame.png', 'stat-img')}<b>${streak()}</b></button>
    <button class="flag" data-view="profile" aria-label="Profil — uczysz się angielskiego">${ICON.uk}</button>
  </header>`;
}

// ---------- sekcja na gradiencie (jak Plan dnia) — zakładki Audio, Słownictwo, Profil ----------

// ikonka jak assets/task-*.png: błyszczący kolorowy kwadrat z białym symbolem
const sqIcon = (glyph, from, to) => `<span class="ph-icon ph-sq" style="--g1:${from};--g2:${to}">${glyph}</span>`;

// wiersz jak zadanie Planu dnia: ikonka, tytuł (+ opis), pasek, liczba po prawej
function heroRow({ icon, label, sub = '', right = '', fill = null, tint = '97, 67, 255', ink = '#6143ff', attrs = '', i = 0, sel = false }) {
  const tag = attrs ? 'button' : 'div';
  return `
    <${tag} class="ph-task ${attrs ? '' : 'static'} ${fill > 0 ? 'going' : ''} ${sel ? 'sel' : ''}" ${attrs} style="--fill:${pct(fill || 0)};--tint:${tint};--ink:${ink};--i:${i}">
      ${icon}
      <span class="ph-body"><span class="ph-label">${label}</span>${sub ? `<span class="ph-sub">${sub}</span>` : ''}${fill !== null ? '<span class="ph-bar"><i></i></span>' : ''}</span>
      ${right}
    </${tag}>`;
}

function pageHero({ title, badge = '', head = '', art, rows }) {
  return `
  <section class="hero">
    <div class="hero-inner">
      ${statusBar()}
      <section class="plan-hero page-hero">
        <div class="ph-head"><h2 class="ph-title">${title}${badge}</h2>${head}</div>
        <div class="ph-grid">${art}<div class="ph-tasks">${rows}</div></div>
      </section>
    </div>
  </section>`;
}
// podstrona: ta sama sekcja na gradiencie, z przyciskiem powrotu zamiast paska statystyk
function subHero({ title, sub = '', back = 'data-view="home"', head = '', art, rows }) {
  return `
  <section class="hero sub-hero">
    <div class="hero-inner">
      <section class="plan-hero page-hero">
        <div class="ph-head">
          <div class="sh-title"><button class="ph-settings sh-back" ${back} aria-label="Wróć">${ICON.back}</button><h2 class="ph-title">${title}</h2></div>
          ${head}
        </div>
        ${sub ? `<p class="sh-sub">${sub}</p>` : ''}
        <div class="ph-grid">${art}<div class="ph-tasks">${rows}</div></div>
      </section>
    </div>
  </section>`;
}
const heroArt = (file) => `<div class="ph-art">${IMG(file, '', '')}</div>`;

const heroNum = (n, of) => `<span class="ph-num"><b>${n}</b>${of !== undefined ? '/' + of : ''}</span>`;

function sectionHead(title, action = '') {
  return `<div class="section-head"><h2 class="section-title">${title}</h2>${action}</div>`;
}

function bar(value, color, cls = '') {
  return `<span class="bar ${cls}"><i style="width:${pct(value)};${color ? `background:${color}` : ''}"></i></span>`;
}

// Karuzela na górze strony głównej: 1. Nauka (następne nowe słowo), 2. Powtórka (plan dnia), 3. Zadania z lekcji
function planCard() {
  const c = counts();
  const plan = dayPlan();
  return `
  <div class="daily-carousel">
    <div class="daily-deck" id="dailyDeck">
      ${learnSlide(c, plan)}
      ${reviewSlide(c, plan)}
      ${lessonTasksCard()}
    </div>
    <div class="carousel-dots" id="carouselDots">
      <button class="dot active" data-slide="0" aria-label="Nauka"></button>
      <button class="dot" data-slide="1" aria-label="Powtórka"></button>
      <button class="dot" data-slide="2" aria-label="Zadania z lekcji"></button>
    </div>
  </div>`;
}

// zadanie planu dnia: ikonka, nazwa, pasek, licznik (albo ptaszek)
function planRow(t, icon, tint, ink, act, i) {
  const [have, need] = t.text.split('/');
  return `
    <button class="ph-task ${t.done ? 'done' : t.value > 0 ? 'going' : ''}" data-act="${act}" style="--fill:${pct(t.value)};--tint:${tint};--ink:${ink};--i:${i}">
      ${IMG(icon, 'ph-icon')}
      <span class="ph-body">
        <span class="ph-label">${esc(t.label)}</span>
        <span class="ph-bar"><i></i></span>
      </span>
      ${t.done ? IMG('done-check.png', 'ph-done', 'Zrobione') : `<span class="ph-num"><b>${have}</b>/${need}</span>`}
    </button>`;
}

function planHead(title) {
  const mode = db.settings.content !== 'all' ? `<button class="ph-mode" data-view="plan-settings" title="Zmień w ustawieniach planu">${db.settings.content === 'phrases' ? 'Tylko zwroty' : 'Tylko słówka'}</button>` : '';
  return `
    <div class="ph-head">
      <h2 class="ph-title">${title}${mode}</h2>
      <button class="ph-settings" data-view="plan-settings" aria-label="Ustawienia planu dnia" title="Ustawienia planu">${ICON.sliders}</button>
    </div>`;
}

// Karta 1: Nauka — jak „Plan dzienny” w WRD: następne nowe słowo w dużym kafelku i jeden przycisk „Ucz się”
function learnSlide(c, plan) {
  const w = freshWords()[0];
  if (!w) {
    return `
      <section class="plan-hero daily-slide learn-hero">
        ${planHead('Nauka')}
        <div class="ph-grid ln-grid">
          <div class="ln-art"><span class="ln-tile done">${IMG('ui/trophy.png', 'ln-trophy')}</span></div>
          <div class="ph-tasks ln-info">
            <div class="ln-word"><h3 class="ln-en">Wszystko poznane!</h3><p class="ln-pl">Nowe ${db.settings.content === 'phrases' ? 'zwroty' : 'słowa'} z planu już znasz — czas na powtórkę.</p></div>
            ${c.seen ? `<button class="ph-cta" data-act="review"><span>Powtórz</span></button>` : ''}
          </div>
        </div>
      </section>`;
  }
  const t = plan.tasks[1];
  const art = isPhrase(w) ? '<span class="wa-emoji">💬</span>' : wordArt(w);
  return `
    <section class="plan-hero daily-slide learn-hero">
      ${planHead('Nauka')}
      <div class="ph-grid ln-grid">
        <div class="ln-art">
          <button class="ln-tile" data-wopen="${esc(w.id)}" style="--tint:${wordTint(w)}" title="Szczegóły słówka" aria-label="${esc(w.en)} — szczegóły">
            ${art}
            <span class="ln-new">${ICON.sparkle}${isPhrase(w) ? 'Nowy zwrot' : 'Nowe słowo'}</span>
          </button>
        </div>
        <div class="ph-tasks ln-info">
          <div class="ln-word">
            <p class="ln-chips">${w.level ? `<span class="ln-cefr" title="Poziom CEFR">${esc(w.level)}</span>` : ''}<span class="ln-topic">${esc(w.icon || '📘')} ${esc(w.topic)}</span></p>
            <h3 class="ln-en"><span>${esc(w.en)}</span><button class="ln-say" data-say="${esc(w.en)}" aria-label="Posłuchaj" title="Posłuchaj">${SPEAKER}</button></h3>
            <p class="ln-pl">${esc(w.pl)}</p>
          </div>
          ${planRow(t, 'task-star.png', '255, 194, 26', '#e09a00', 'learn-new', 0)}
          <button class="ph-cta" data-act="learn-new"><span>${c.newLeft ? 'Ucz się' : 'Ucz się dalej'}</span></button>
        </div>
      </div>
    </section>`;
}

// Karta 2: Powtórka — dawny Plan dnia (powtórki, czas nauki, skrzynia za cały plan)
function reviewSlide(c, plan) {
  const act = c.dueLeft ? 'review' : c.seen ? 'extra' : 'learn-new';
  // pasek skrzyni = postęp całego planu (razem z nowymi słowami z karty Nauka)
  const total = plan.claimed ? 1 : plan.tasks.reduce((s, t) => s + Math.min(1, t.value), 0) / plan.tasks.length;
  return `
    <section class="plan-hero daily-slide">
      ${planHead('Powtórka')}
      <div class="ph-grid">
        <div class="ph-art ${plan.complete ? 'launched' : ''}">${IMG('plan-rocket.webp')}</div>
        <div class="ph-tasks">
          ${planRow(plan.tasks[0], 'task-refresh.png', '52, 192, 106', '#1fa45a', act, 0)}
          ${planRow(plan.tasks[2], 'task-clock.png', '59, 142, 240', '#2f7fe6', act, 1)}
          <button class="ph-task reward ${plan.claimed ? 'done' : total > 0 ? 'going' : ''}" data-act="${plan.claimed ? 'chest-info' : act}" style="--fill:${pct(total)};--tint:255, 122, 0;--ink:#f07800;--i:2">
            ${IMG('task-chest.png', 'ph-icon')}
            <span class="ph-body">
              <span class="ph-label">${plan.claimed ? 'Skrzynia otwarta — wracaj jutro!' : 'Ukończ naukę i powtórkę'}</span>
              <span class="ph-bar"><i></i></span>
            </span>
            <span class="ph-gems">${plan.claimed ? '✓' : `+${CHEST_BONUS}`}${IMG('gem-small.png', 'ph-gem')}</span>
          </button>
          ${c.seen ? `<button class="ph-cta" data-act="${c.dueLeft ? 'review' : 'extra'}"><span>${c.dueLeft ? 'Powtórz' : 'Powtórz więcej'}</span></button>` : ''}
        </div>
      </div>
    </section>`;
}

function packCard(c) {
  const textColor = c.textColor || (c.bg === '#FFD84D' ? '#1E1B33' : '#FFFFFF');
  return `
    <button class="pack" style="background:${c.bg};color:${textColor}" data-coll="${esc(c.ref)}">
      <span class="pack-art">${c.img ? IMG(c.img, 'pack-img') : c.art}</span>
      <b style="color:${textColor}">${esc(c.name)}</b>
    </button>`;
}

function examHeader() {
  const s = db.settings;
  const c = counts();
  const readiness = words.length ? c.known / words.length : 0;
  let left = null;
  if (s.examDate) {
    const [y, m, d] = s.examDate.split('-').map(Number);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    left = Math.round((new Date(y, m - 1, d) - start) / DAY);
  }
  return `
  <section class="card exam-head">
    <div class="eh-row">
      <span class="eh-icon">${ART.gradCap}</span>
      <div class="eh-text">
        <span class="overline">Przygotuj się do egzaminu</span>
        <b>${esc(s.examName || 'Mój egzamin')}</b>
        <span class="muted small">${s.examDate ? formatDate(s.examDate) : 'ustaw datę w Profilu'}</span>
      </div>
      ${left !== null ? `<div class="countdown"><b>${left > 0 ? left : 0}</b><span>${left > 0 ? plural(left, 'dzień', 'dni', 'dni') : left === 0 ? 'dziś!' : 'minął'}</span></div>` : ''}
    </div>
    <div class="eh-bar"><span class="muted small">Gotowość</span>${bar(readiness, '#22C55E', 'thick')}<b>${pct(readiness)}</b></div>
  </section>`;
}

function examPath() {
  const done = db.path;
  const k = done.length;
  const shown = done.slice(-3);
  const firstDone = 3 - shown.length;
  const startSlot = k < 3 ? firstDone - 1 : -1;
  const firstVisible = Math.max(0, startSlot);
  const at = ([x, y]) => `left:${(x / 390) * 100}%;top:${(y / 470) * 100}%`;

  let segs = '';
  for (let s = firstVisible; s < PATH_SEGS.length; s++) {
    segs += `<path d="${PATH_SEGS[s]}" fill="none" stroke="${s < 3 ? SEG_COLORS[s] : '#DCD8EA'}" stroke-width="12" stroke-linecap="round"/>`;
  }
  const dots = PATH_SEGS.slice(firstVisible).join(' ');

  let nodes = '';
  PATH_PTS.forEach((pt, i) => {
    if (i < startSlot) return;
    if (i === startSlot) {
      nodes += `<span class="pnode start" style="${at(pt)}" role="img" aria-label="Start">${ICON.flag}</span>`;
      if (i < 3) nodes += `<span class="pchip" style="${at(CHIP_POS[i])}">Start</span>`;
      return;
    }
    if (i < 3) {
      const idx = k - shown.length + (i - firstDone);
      const r = shown[i - firstDone];
      nodes += `<button class="pnode done" style="${at(pt)}" data-act="path-done" data-msg="${esc(`${pathName(idx)}: zaliczony (${r.pct}%)`)}" aria-label="${esc(pathName(idx))} — zaliczony, ${r.pct}%">${ICON.tick}</button>`;
      nodes += `<span class="pchip ok" style="${at(CHIP_POS[i])}">${r.pct}%</span>`;
      return;
    }
    if (i === 3) {
      const ex = examDef(pathKind(k));
      nodes += `<span class="pglow" style="${at(pt)}"></span>`;
      nodes += `<button class="pnode current" style="${at(pt)}" data-exam="${ex.key}" aria-label="${esc(pathName(k))} — zacznij">${ICON.star}</button>`;
      nodes += `<span class="plabel below" style="${at(pt)}"><b>${esc(pathName(k))}</b><span>${Math.min(ex.n, words.length)} pytań · +${EXAM_BONUS} ${ICON.gem}</span></span>`;
      return;
    }
    nodes += `<button class="pnode locked" style="${at(pt)}" data-act="path-done" data-msg="${esc(`Najpierw zalicz: ${pathName(k)}`)}" aria-label="${esc(pathName(k + i - 3))} — zablokowany">${ICON.lock}</button>`;
  });

  const mock = [...db.exams].reverse().find((e) => e.kind === 'mock');
  nodes += `<button class="pnode trophy" style="${at(PATH_TROPHY)}" data-exam="mock" aria-label="Egzamin próbny — zacznij">${ART.trophy}</button>`;
  nodes += `<span class="plabel left" style="${at(PATH_TROPHY)}"><b>Egzamin próbny</b><span>${mock ? `ostatnio ${mock.pct}%` : `${Math.min(40, words.length)} pytań`}</span></span>`;

  const stickers = [['globe', 318, 32], ['cup', 48, 136], ['suitcase', 330, 306], ['book', 52, 424]]
    .map(([n, x, y]) => `<span class="sticker" style="${at([x, y])}">${ART[n]}</span>`).join('');

  return `
  <div class="path">
    <svg class="path-line" viewBox="0 0 390 470" preserveAspectRatio="none" aria-hidden="true">
      ${segs}
      <path d="${dots}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 11"/>
    </svg>
    ${stickers}
    ${nodes}
  </div>`;
}

function mistakesCard() {
  const n = db.mistakes.filter((id) => byId.has(id)).length;
  if (!n) return '';
  return `
  <section class="card float-card">
    <span class="fc-icon">${ICON.refresh}</span>
    <div class="fc-text"><b>Powtórka błędów</b><span class="muted small">${wordsLabel(n)} z testów</span></div>
    <button class="btn pill small-pill" data-act="drill-mistakes">Zacznij</button>
  </section>`;
}

// Przypomnienie o kopii: postęp żyje tylko w tej przeglądarce — raz w tygodniu prosimy o eksport.
function backupNag() {
  const now = Date.now();
  if (counts().seen < 10 || now - db.lastBackup < 7 * DAY || now < db.backupSnooze) return '';
  const days = db.lastBackup ? Math.floor((now - db.lastBackup) / DAY) : 0;
  return `
  <section class="backup-nag">
    <span class="bn-icon" aria-hidden="true">💾</span>
    <div class="bn-text"><b>Zrób kopię postępów</b><span>${days ? `Ostatnia ${days} dni temu — ` : ''}postęp jest tylko w tej przeglądarce.</span></div>
    <button class="bn-go" data-act="export">Zapisz</button>
    <button class="bn-close" data-act="backup-later" aria-label="Przypomnij za 3 dni" title="Przypomnij za 3 dni">${ICON.close}</button>
  </section>`;
}

const HOME_TOPICS = 12;

function viewHome() {
  const packs = PACKS.map((p) => collection('pack:' + p.key)).filter((x) => x && x.total >= MIN_PACK);
  const lists = [...['auto:last', 'auto:hard'].map(collection).filter((x) => x && x.total), ...db.lists.map((l) => collection('list:' + l.id))];
  // tematów jest ok. 200 — na stronie głównej tylko kilka (najpierw te, których się uczysz), reszta w Pakietach
  const allTopics = topicsList().map((tp) => collection('topic:' + tp.name)).filter((t) => t && t.total);
  const going = allTopics.filter((t) => collStage(t) === 'learning');
  const topics = [...going, ...allTopics.filter((t) => !going.includes(t))].slice(0, HOME_TOPICS);
  const seen = counts().seen;

  return `
  <section class="hero">
    <div class="hero-inner">
      ${statusBar()}
      ${planCard()}
    </div>
  </section>
  ${backupNag()}

  ${sectionHead('Pakiety słówek', '<button class="link" data-act="all-words">Wszystkie ›</button>')}
  <div class="packs">${packs.map(packCard).join('')}</div>

  ${sectionHead('Przygotuj się do egzaminu')}
  ${examHeader()}
  ${examPath()}
  ${mistakesCard()}


  <section class="lists-card" style="margin-top: 24px">
    <div class="lc-text"><h3>Moje listy</h3><span>Twoje zestawy do powtórek</span></div>
    <span class="lc-art">${ART.cardStack}</span>
    <div class="lc-chips">
      ${lists.map((l) => `<button class="lc-chip" data-coll="${esc(l.ref)}">${esc(l.name)} <b>${l.total}</b></button>`).join('')}
      <button class="lc-chip new" data-act="new-list">+ Nowa</button>
    </div>
  </section>

  ${DEV && devMissing().length ? `
  <button class="dv-home" data-view="dev">
    <span class="dv-home-icon" aria-hidden="true">🛠️</span>
    <span class="dv-home-text"><b>Panel dewelopera</b><span>Brakuje ikon: ${devMissing().length} — wygeneruj jednym kliknięciem</span></span>
    <span class="dv-home-go" aria-hidden="true">›</span>
  </button>` : ''}

  ${sectionHead('Audio', '<button class="link" data-view="listen">Więcej ›</button>')}
  <div class="audio-row">
    <section class="audio-card yellow">
      <span class="ac-top">${ICON.play}</span>
      <h3>Słuchaj w drodze</h3>
      ${ART.listenGirl}
      <button class="white-pill" data-act="player-quick" ${canSpeak ? '' : 'disabled'}>Odtwórz</button>
    </section>
    <section class="audio-card blue">
      <span class="ac-top">${ICON.listen}</span>
      <h3>Trening słuchu</h3>
      ${ART.ear}
      <button class="white-pill" data-act="listen-quiz" ${seen >= 4 && canSpeak ? '' : 'disabled'}>${seen >= 4 ? 'Ćwicz słuch' : 'Poznaj 4 słowa'}</button>
    </section>
  </div>

  ${sectionHead('Tematy', allTopics.length > topics.length ? `<button class="link" data-act="all-words">Wszystkie (${allTopics.length}) ›</button>` : '')}
  <div class="topic-grid">
    ${topics.map((tp) => `
      <button class="topic-tile" data-coll="${esc(tp.ref)}">
        ${tp.img ? IMG(tp.img, 'tt-icon tt-img') : `<span class="tt-icon" style="background:${tp.bg}">${tp.art}</span>`}
        <span class="tt-main">
          <b>${esc(tp.name)}</b>
          <span class="muted small">${tp.known} z ${tp.total}</span>
          ${bar(tp.known / tp.total, '#22C55E')}
        </span>
      </button>`).join('')}
  </div>`;
}

// ---------- ekran „Pakiety słówek” (Wszystkie / Uczę się / Wyuczone) ----------

let packsTab = 'all';
const PACK_TABS = [['all', 'Wszystkie'], ['learning', 'Uczę się'], ['known', 'Wyuczone']];

// Etap zestawu: wyuczony (wszystko umiesz), w trakcie (coś już poznane) albo nowy.
function collStage(c) {
  if (c.total && c.known === c.total) return 'known';
  return c.ws.some((w) => db.cards[w.id]) ? 'learning' : 'new';
}

function pkCard(c) {
  return `
    <button class="pk-card" data-coll="${esc(c.ref)}" style="--tint:${c.tint};--pill:${c.pill}">
      <span class="pk-text">
        <b class="pk-name">${esc(c.name)} <span class="pk-chev">›</span></b>
        <span class="pk-count">${itemsLabel(c.ws)}</span>
        <span class="pk-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>${c.known}/${c.total}</span>
      </span>
      ${c.img ? IMG(c.img, 'pk-img') : `<span class="pk-img svg">${c.art}</span>`}
    </button>`;
}

function viewPacks() {
  const show = (c) => c && c.total && (packsTab === 'all' || collStage(c) === packsTab);
  const groups = [
    ['Pakiety', PACKS.filter((p) => p.key !== 'all').map((p) => collection('pack:' + p.key)).filter((c) => show(c) && c.total >= MIN_PACK)],
    ['Tematy', topicsList().map((t) => collection('topic:' + t.name)).filter(show)],
  ].filter(([, cs]) => cs.length);
  const empty = { learning: 'Jeszcze nic nie zacząłeś — wybierz pakiet w zakładce Wszystkie.', known: 'Jeszcze nic nie wyuczone — ucz się dalej! 💪' };

  return `
    ${(() => {
      const all = [...PACKS.filter((p) => p.key !== 'all').map((p) => collection('pack:' + p.key)).filter((c) => c && c.total >= MIN_PACK), ...topicsList().map((t) => collection('topic:' + t.name))].filter((c) => c && c.total);
      const n = (k) => (k === 'all' ? all.length : all.filter((c) => collStage(c) === k).length);
      const look = { all: ['stat-check.png', '97, 67, 255', '#6143ff', 'pakiety i tematy'], learning: ['task-refresh.png', '59, 142, 240', '#2f7fe6', 'zaczęte, jeszcze nie opanowane'], known: ['task-star.png', '255, 194, 26', '#e09a00', 'umiesz wszystkie słowa'] };
      return subHero({
        title: 'Pakiety słówek',
        art: heroArt('hero-packs.png'),
        rows: PACK_TABS.map(([k, label], i) => heroRow({
          icon: k === 'all' ? sqIcon(ICON.words, '#b39dff', '#6143ff') : IMG(look[k][0], 'ph-icon'), label, sub: look[k][3],
          fill: k === 'all' ? null : n(k) / Math.max(1, n('all')), right: heroNum(n(k)),
          tint: look[k][1], ink: look[k][2], i, attrs: `data-ptab="${k}"`, sel: packsTab === k,
        })).join(''),
      });
    })()}
    ${packsTab !== 'known' ? resumeCard() : ''}
    ${groups.length ? groups.map(([title, cs]) => `
      <h3 class="pk-group">${title}</h3>
      <div class="pk-list">${cs.map(pkCard).join('')}</div>`).join('') : `<p class="pk-empty">${empty[packsTab] || ''}</p>`}`;
}

// ---------- ustawienia planu dnia ----------

const PLAN_KEYS = ['content', 'newOrder', 'warmup', 'reviewsFirst', 'listening', 'typing', 'autoNext', 'exOff', 'newPerDay', 'reviewCap', 'minutes'];

const PLAN_ORDERS = [
  ['lesson', 'Od najłatwiejszych', 'Najpierw poziom A1, potem A2, B1… — w każdym poziomie temat po temacie.'],
  ['recent', 'Najnowsze', 'Najpierw słowa z ostatniej lekcji — świeży materiał od razu trafia do nauki.'],
  ['random', 'Losowo', 'Każda sesja przynosi inną mieszankę słów.'],
];

const PLAN_CONTENT = [
  ['all', 'Wszystko', (n) => `Słówka i zwroty razem — ${wordsLabel(n)} w planie.`],
  ['words', 'Słówka', (n) => `Same pojedyncze słowa (rzeczowniki, przymiotniki…) bez zwrotów — ${wordsLabel(n)}.`],
  ['phrases', 'Zwroty', (n) => `Same zwroty i wyrażenia, np. „Nice to meet you” — ${n} ${plural(n, 'zwrot', 'zwroty', 'zwrotów')}.`],
];

const PLAN_TOGGLES = [
  { key: 'warmup', icon: 'warm', tone: ['#FFE8D2', '#A5460A'], title: 'Rozgrzewka', desc: 'Sesja zaczyna się od 2 słów, które już znasz — łatwy start i szybkie diamenty.' },
  { key: 'reviewsFirst', icon: 'refresh', tone: ['#D4F3EC', '#0F7466'], title: 'Najpierw powtórki', desc: 'Zaległe powtórki przed nowymi słowami. Wyłączone: nowe słowa przeplatane z powtórkami.' },
  { key: 'listening', icon: 'listen', tone: ['#DDEFFF', '#1F5FA8'], title: 'Ćwiczenia ze słuchu', desc: 'Rozpoznawanie ze słuchu i dyktanda. Wyłącz, gdy nie możesz używać dźwięku — np. w autobusie.' },
  { key: 'autoNext', icon: 'sparkle', tone: ['#E7E0FF', '#5A3FE0'], title: 'Automatycznie dalej', desc: 'Po dobrej odpowiedzi następne pytanie pojawia się samo. Wyłączone: masz czas, żeby się przyjrzeć i posłuchać — dalej przechodzisz przyciskiem „Dalej” albo Enterem.' },
  { key: 'typing', icon: 'keyboard', tone: ['#FFE6DF', '#B4260F'], title: 'Ćwiczenia z pisania', desc: 'Wpisywanie słów z klawiatury. Wyłącz na telefonie — zostaną wybory z 4 odpowiedzi.' },
];

const PLAN_STEPS = {
  newPerDay: {
    title: 'Nowe słowa dziennie', icon: 'sparkle', tone: ['#E7E0FF', '#5A3FE0'],
    options: [[5, '5'], [10, '10'], [15, '15'], [20, '20']],
    hints: { 5: 'Spokojne tempo — dobre na start.', 10: 'Normalne tempo — zalecane.', 15: 'Intensywnie — więcej powtórek w kolejnych dniach.', 20: 'Ekspresowo — licz się z dłuższymi sesjami.' },
  },
  reviewCap: {
    title: 'Limit powtórek dziennie', icon: 'refresh', tone: ['#D4F3EC', '#0F7466'],
    options: [[20, '20'], [50, '50'], [100, '100'], [0, '∞']],
    hints: { 20: 'Krótkie sesje — nadmiar powtórek przejdzie na kolejne dni.', 50: 'Rozsądny limit na zabiegane dni.', 100: 'Wysoki limit — prawie wszystko na czas.', 0: 'Bez limitu — algorytm powtarza każde słowo dokładnie na czas (zalecane).' },
  },
  minutes: {
    title: 'Dzienny cel i długość sesji', icon: 'clock', tone: ['#FFE8D2', '#A5460A'],
    options: [[2, '2 min'], [5, '5 min'], [10, '10 min'], [20, '20 min']],
    hints: { 2: 'Minimum, żeby nie wypaść z rytmu.', 5: 'Krótko, ale codziennie — najlepszy nawyk.', 10: 'Solidna porcja nauki.', 20: 'Pełny trening.' },
  },
};

function levelBars(level, n) {
  let out = '';
  for (let i = 1; i <= n; i++) out += `<i class="${i <= level ? 'on' : ''}" style="height:${3 + i * 3}px"></i>`;
  return `<span class="lvl-bars" aria-hidden="true">${out}</span>`;
}

// ikonka ustawień: błyszczący kwadrat z białym symbolem, jak ikonki zadań Planu dnia (kolor = drugi odcień z pary)
// przygaszone kolory z dawnych pastelowych ikonek → żywe barwy ikonek Planu dnia
const VIVID = { '#A5460A': '#f07800', '#0F7466': '#1fa45a', '#1F5FA8': '#2f7fe6', '#B4260F': '#e8590c', '#5A3FE0': '#6a4cff' };
function setIcon(icon, [, fg]) {
  return `<span class="set-icon glossy" style="--c:${VIVID[fg] || fg}">${ICON[icon]}</span>`;
}

function stepper(key) {
  const def = PLAN_STEPS[key];
  const cur = key === 'minutes' ? goalMin() : db.settings[key];
  const n = def.options.length;
  const idx = def.options.findIndex(([v]) => v === cur);
  return `
  <section class="card set-card">
    <div class="set-head">${setIcon(def.icon, def.tone)}<b>${def.title}</b></div>
    <div class="stepper" role="radiogroup" aria-label="${def.title}" style="--n:${n}">
      <span class="st-track"><i style="width:${idx < 0 ? 0 : (idx / (n - 1)) * 100}%"></i></span>
      ${def.options.map(([v, label], i) => `
        <button class="st-stop ${i === idx ? 'on' : ''} ${idx >= 0 && i <= idx ? 'past' : ''}" role="radio" aria-checked="${i === idx}" data-setval="${key}:${v}">
          <span class="st-dot"></span>
          <span class="st-label">${levelBars(i + 1, n)}${label}</span>
        </button>`).join('')}
    </div>
    <p class="set-hint">${def.hints[cur] || ''}</p>
  </section>`;
}

function planPreview() {
  const s = db.settings;
  const c = counts();
  const unseen = c.planUnseen;
  const newN = Math.min(s.newPerDay, unseen);
  const revN = c.dueLeft;
  const estMin = Math.max(1, Math.round(newN * 0.6 + revN * 0.15)); // ~36 s na nowe słowo, ~9 s na powtórkę
  let forecastLine = s.content === 'all' ? `Znasz już wszystkie słówka z lekcji — nowe pojawią się po kolejnej lekcji.` : `Wszystkie wybrane już poznane — zmień „Co ćwiczyć” albo poczekaj na kolejną lekcję.`;
  let examLine = '';
  if (unseen > 0 && s.newPerDay > 0) {
    const days = Math.ceil(unseen / s.newPerDay);
    const end = new Date();
    end.setDate(end.getDate() + days - 1);
    forecastLine = `${s.content === 'all' ? 'Obecne' : 'Wybrane'} ${s.content === 'phrases' ? `${c.planTotal} ${plural(c.planTotal, 'zwrot', 'zwroty', 'zwrotów')}` : wordsLabel(c.planTotal)} poznasz do <b>${formatDate(dayKey(end), false)}</b>`;
    if (s.examDate) {
      const [y, m, d] = s.examDate.split('-').map(Number);
      const ok = end <= new Date(y, m - 1, d);
      examLine = `<p class="pp-exam ${ok ? 'ok' : 'warn'}">${ok ? `✓ Zdążysz spokojnie przed egzaminem (${formatDate(s.examDate, false)})` : `Przy tym tempie nie zdążysz przed egzaminem — zwiększ liczbę nowych słów`}</p>`;
    }
  } else if (unseen > 0) {
    forecastLine = 'Nowe słowa są wyłączone — ustaw ich liczbę niżej.';
  }
  return subHero({
    title: 'Ustawienia planu',
    sub: 'Twój plan na dziś',
    art: heroArt('hero-plan.png'),
    rows: `
      ${heroRow({ icon: IMG('task-star.png', 'ph-icon'), label: plural(newN, 'Nowe słowo', 'Nowe słowa', 'Nowe słowa'), sub: 'poznasz dziś', right: heroNum(newN), tint: '255, 194, 26', ink: '#e09a00', i: 0 })}
      ${heroRow({ icon: IMG('task-refresh.png', 'ph-icon'), label: 'Powtórki', sub: 'słowa, którym mija termin', right: heroNum(revN), tint: '52, 192, 106', ink: '#1fa45a', i: 1 })}
      ${heroRow({ icon: IMG('task-clock.png', 'ph-icon'), label: 'Czas nauki', sub: 'mniej więcej', right: `<span class="ph-num"><b>~${estMin}</b> min</span>`, tint: '59, 142, 240', ink: '#2f7fe6', i: 2 })}
      ${heroRow({ icon: sqIcon(ICON.target, '#b39dff', '#6143ff'), label: forecastLine, sub: examLine.replace(/<[^>]+>/g, ''), tint: '97, 67, 255', ink: '#6143ff', i: 3 })}`,
  });
}

function viewPlanSettings() {
  const s = db.settings;
  const order = PLAN_ORDERS.find(([v]) => v === s.newOrder) || PLAN_ORDERS[0];
  const content = PLAN_CONTENT.find(([v]) => v === s.content) || PLAN_CONTENT[0];
  return `
  ${planPreview()}

  <h2 class="section-title">Dobór słów</h2>
  <section class="card set-card">
    <div class="set-head">${setIcon('words', ['#E7E0FF', '#5A3FE0'])}<b>Co ćwiczyć</b></div>
    <div class="segmented" role="radiogroup" aria-label="Co ćwiczyć">
      ${PLAN_CONTENT.map(([v, label]) => `<button class="seg ${content[0] === v ? 'on' : ''}" role="radio" aria-checked="${content[0] === v}" data-setval="content:${v}">${label}</button>`).join('')}
    </div>
    <p class="set-hint">${content[2](counts().planTotal)} Dotyczy nowych słów i powtórek w planie dnia; pakiety, tematy i testy zostają bez zmian.</p>
  </section>

  <section class="card set-card">
    <div class="set-head">${setIcon('order', ['#DDEFFF', '#1F5FA8'])}<b>Kolejność nowych słów</b></div>
    <div class="segmented" role="radiogroup" aria-label="Kolejność nowych słów">
      ${PLAN_ORDERS.map(([v, label]) => `<button class="seg ${order[0] === v ? 'on' : ''}" role="radio" aria-checked="${order[0] === v}" data-setval="newOrder:${v}">${label}</button>`).join('')}
    </div>
    <p class="set-hint">${order[2]}</p>
  </section>

  <section class="card set-list">
    ${PLAN_TOGGLES.map((t) => {
      const on = !!s[t.key];
      return `
      <div class="set-row">
        ${setIcon(t.icon, t.tone)}
        <div class="set-text"><b>${t.title}</b><span>${t.desc}</span></div>
        <button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${t.title}" data-toggle="${t.key}"><span></span></button>
      </div>`;
    }).join('')}
  </section>

  <h2 class="section-title">Rodzaje ćwiczeń</h2>
  <section class="card set-card">
    <p class="set-hint ex-hint">Dotknij, żeby włączyć lub wyłączyć. Wyłączone ćwiczenie zastąpi najbliższe podobne.</p>
    <div class="ex-grid">
      ${EX_TYPES.map(([t, icon, name, desc]) => {
        const on = !(s.exOff || []).includes(t);
        const blocked = (SRS.isListening(t) && !s.listening) || (SRS.isTyping(t) && !s.typing);
        return `<button class="ex-chip ${on && !blocked ? 'on' : ''}" data-act="ex-toggle" data-t="${t}" aria-pressed="${on}" ${blocked ? 'title="Wyłączone przełącznikiem powyżej"' : ''}>
          <span class="ex-ic">${IMG(`ui/ex-${t}.png`, "ex-img")}</span><span class="ex-tx"><b>${name}</b><small>${blocked ? 'wyłączone wyżej' : desc}</small></span><i class="ex-check" aria-hidden="true"></i></button>`;
      }).join('')}
    </div>
  </section>

  <h2 class="section-title">Tempo</h2>
  ${stepper('newPerDay')}
  ${stepper('reviewCap')}
  ${stepper('minutes')}

  <button class="btn wide ghost-line" data-act="plan-defaults">Przywróć ustawienia domyślne</button>`;
}

function viewListen() {
  const seen = words.filter((w) => db.cards[w.id]).length;
  const topics = topicsList();
  const plMissing = canSpeak && !plVoice();
  const srcN = listenSource === '__seen' ? seen : listenSource === '__all' ? words.length : words.filter((w) => inTopic(w, listenSource)).length;
  const A = window.WORD_AUDIO || {}, acc = db.settings.accent === 'en-US' ? 'en-US' : 'en-GB', other = acc === 'en-US' ? 'en-GB' : 'en-US';
  const recN = (l) => words.filter((w) => (A[l] || {})[audioKey(w.en)]).length;
  const quiz = seen >= 4 && canSpeak;
  return `
  ${pageHero({
    title: 'Słuchanie',
    art: `<div class="ph-art">${IMG('hero-audio.png', '', '')}</div>`,
    rows: `
      ${heroRow({ icon: sqIcon(ICON.play, '#8aa2ff', '#4f63f0'), label: 'Słuchaj w drodze', sub: 'słowo, tłumaczenie i przykład — bez patrzenia', right: heroNum(srcN), attrs: `data-act="player" ${canSpeak ? '' : 'disabled'}`, tint: '79, 99, 240', ink: '#4f63f0', i: 0 })}
      <label class="hero-select"><span>Co odtwarzać</span>
        <select id="listen-source" aria-label="Co odtwarzać">
          <option value="__seen" ${listenSource === '__seen' ? 'selected' : ''}>Poznane słówka (${seen})</option>
          <option value="__all" ${listenSource === '__all' ? 'selected' : ''}>Wszystkie słówka (${words.length})</option>
          ${topics.map((t) => `<option value="${esc(t.name)}" ${listenSource === t.name ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
        </select>
      </label>
      ${heroRow({ icon: sqIcon(ICON.listen, '#4fd8cf', '#12a39c'), label: 'Trening słuchu', sub: quiz ? 'rozpoznaj ze słuchu i zapisz, co słyszysz' : 'najpierw poznaj 4 słówka w zakładce Nauka', right: heroNum(Math.min(seen, 15)), attrs: quiz ? 'data-act="listen-quiz"' : 'disabled', tint: '18, 163, 156', ink: '#12a39c', i: 1 })}
      <button class="ph-cta" data-act="player" ${canSpeak ? '' : 'disabled'}><span>Odtwarzaj</span></button>`,
  })}
  ${canSpeak ? '' : '<p class="card bad-text small">Ta przeglądarka nie obsługuje czytania na głos.</p>'}
  <section class="card set-card">
    <div class="set-head">${setIcon('listen', ['#E7E0FF', '#5A3FE0'])}<b>Głos lektora</b></div>
    <div class="segmented two" role="radiogroup" aria-label="Akcent">
      <button class="seg ${acc === 'en-US' ? 'on' : ''}" role="radio" aria-checked="${acc === 'en-US'}" data-setval="accent:en-US">Amerykański</button>
      <button class="seg ${acc === 'en-GB' ? 'on' : ''}" role="radio" aria-checked="${acc === 'en-GB'}" data-setval="accent:en-GB">Brytyjski</button>
    </div>
    <p class="set-hint">Nagrania lektora w tym akcencie: <b>${recN(acc)} z ${words.length}</b>${recN(acc) < words.length ? ` · brakujące czyta ${recN(other) ? `lektor ${other === 'en-US' ? 'amerykański' : 'brytyjski'} (${recN(other)}) albo ` : ''}głos przeglądarki` : ''}.${plMissing ? ' Brak polskiego głosu w systemie — tłumaczenie pojawi się tylko na ekranie.' : ''}</p>
  </section>`;
}

function viewPlayer() {
  const w = byId.get(P.ids[P.i]);
  return `
  <div class="session-top">
    <button class="icon-btn" data-act="player-close" aria-label="Zamknij">${ICON.close}</button>
    ${bar((P.i + (P.done ? 1 : 0)) / P.ids.length, '', 'thick')}
    <span class="muted small">${P.i + 1}/${P.ids.length}</span>
  </div>
  <section class="card study player">
    <div class="badge">${esc(w.topic)}</div>
    <div class="word-en">${esc(w.en)}</div>
    ${w.pron ? `<div class="pron">${esc(w.pron)}</div>` : ''}
    <div class="reveal ${P.phase ? 'on' : ''}">
      <div class="word-pl">${esc(w.pl)}</div>
      ${w.example ? `<div class="example center"><i>${esc(w.example)}</i></div>` : ''}
    </div>
  </section>
  ${P.done ? '<p class="muted center">Koniec listy</p>' : ''}
  <div class="player-controls">
    <button class="round" data-player="prev" aria-label="Poprzednie">${ICON.prev}</button>
    <button class="round main" data-player="toggle" aria-label="${P.playing ? 'Pauza' : 'Odtwarzaj'}">${P.playing ? ICON.pause : ICON.play}</button>
    <button class="round" data-player="next" aria-label="Następne">${ICON.next}</button>
  </div>`;
}

function wordInfo(w, { full = true } = {}) {
  return `
    <div class="word-en">${esc(w.en)} <button class="icon-btn" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button><button class="icon-btn slow-btn" data-slow="${esc(w.en)}" aria-label="Posłuchaj wolniej" title="Wolniej">${TURTLE}</button></div>
    ${w.pron ? `<div class="pron">${esc(w.pron)}</div>` : ''}
    <div class="word-pl">${esc(w.pl)}</div>
    ${full && w.mnemo ? `<div class="mnemo">🧠 ${esc(w.mnemo)}</div>` : ''}
    ${full && w.example ? `<div class="example"><button class="icon-btn" data-say="${esc(w.example)}" aria-label="Posłuchaj zdania">${SPEAKER}</button> <i>${esc(w.example)}</i></div>` : ''}`;
}

// „Utwórz słowo”: co widać nad polami — im dalszy etap, tym mniej podpowiedzi
function buildPrompt(w, mode) {
  const say = `<button class="icon-btn" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button><button class="icon-btn slow-btn" data-slow="${esc(w.en)}" aria-label="Posłuchaj wolniej" title="Wolniej">${TURTLE}</button>`;
  if (mode === 'syll') {
    const pic = !isPhrase(w) && WORD_IMG[w.id];
    return pic
      ? `<div class="pick-tile bw-pic" style="--tint:${wordTint(w)}">${wordArt(w)}</div><div class="bw-say">${say}</div>`
      : `<div class="prompt-pl">${esc(w.pl)}</div><div class="bw-say">${say}</div>`;
  }
  return `<div class="prompt-pl">${esc(w.pl)}</div>${mode === 'letters' ? `<div class="bw-say">${say}</div>` : '<p class="bw-level">Bez podpowiedzi — umiesz już to słowo</p>'}`;
}

function buildBody(B, answered, result) {
  const T = B.task;
  const texts = B.placed.map((i) => T.tiles.find((t) => t.id === i).text);
  const state = answered ? (S.answers[S.answers.length - 1]?.correct ? ' ok' : ' bad') : '';
  let slots;
  if (T.kind === 'words') {
    slots = T.template.map((word, i) => (texts[i]
      ? `<span class="bw-word on">${esc(texts[i])}</span>`
      : `<span class="bw-word" style="min-width:${Math.max(3, word.length) * 0.62}em"></span>`)).join('');
  } else {
    const letters = texts.join('');
    let k = 0;
    slots = T.template.map((ch) => {
      if (Builder.isLetter(ch)) {
        const got = letters[k++] || '';
        return `<span class="bw-slot ${got ? 'on' : ''}">${esc(ch === ch.toUpperCase() ? got.toUpperCase() : got)}</span>`;
      }
      return ch === ' ' ? '<span class="bw-sp"></span>' : `<span class="bw-fix">${esc(ch)}</span>`;
    }).join('');
  }
  return `
    <div class="bw-slots${state}${T.kind === 'chars' && T.template.length > 8 ? ' long' : ''}">${slots}</div>
    <div class="bw-tiles">
      ${T.tiles.map((t) => `<button class="bw-tile ${B.placed.includes(t.id) ? 'used' : ''}" data-act="b-tile" data-i="${t.id}" ${answered || B.placed.includes(t.id) ? 'disabled' : ''}>${esc(t.text)}</button>`).join('')}
      <button class="bw-back" data-act="b-back" aria-label="Cofnij ostatni kafelek" title="Cofnij (Backspace)" ${answered || !B.placed.length ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z"/><path d="m12.5 9.5 5 5m0-5-5 5"/></svg></button>
    </div>`;
}

function viewSession() {
  const { w, type, answered, options, chosen, result } = S.cur;
  const exam = S.mode === 'exam';
  // pasek tylko rośnie: po błędzie dochodzą pytania (dłuższa kolejka), wtedy chwilę stoi zamiast się cofać
  const raw = S.budget ? (Date.now() - S.start) / S.budget : S.pos / S.queue.length;
  const progress = S.shownProgress = Math.min(1, Math.max(S.shownProgress || 0, raw));
  const top = `
    <div class="session-top">
      <button class="icon-btn" data-act="quit" aria-label="Zakończ">${ICON.close}</button>
      ${bar(progress, '', 'thick')}
      ${exam ? `<span class="muted small">${S.pos + 1}/${S.queue.length}</span>` : `<span class="gem-count">${ICON.gem}<b>${S.gems}</b></span>`}
    </div>
    ${exam ? `<div class="exam-banner">${esc(S.exam.name)} — odpowiedzi poznasz na końcu</div>` : ''}`;

  if (type === 'intro') {
    return `${top}
    <section class="card study">
      <div class="badge">Nowe słowo · ${esc(w.topic)}</div>
      ${isPhrase(w) ? '' : `<div class="pick-tile intro-tile" style="--tint:${wordTint(w)}">${wordArt(w)}</div>`}
      ${wordInfo(w)}
      ${w.pos ? `<div class="muted small">${esc(w.pos)}</div>` : ''}
    </section>
    <button class="btn pill wide" data-act="intro-next">Naucz się</button>
    <div class="wd-actions intro-actions"><button class="wd-link" data-act="intro-later" title="Słowo wróci w kolejnej sesji">Później</button><span></span><button class="wd-link" data-act="intro-known" title="Oznacz jako wyuczone — wróci jutro na szybkie sprawdzenie">Wiem</button></div>`;
  }

  const prompts = {
    en2pl: ['Co to znaczy?', `<div class="prompt-en">${esc(w.en)} <button class="icon-btn" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button><button class="icon-btn slow-btn" data-slow="${esc(w.en)}" aria-label="Posłuchaj wolniej" title="Wolniej">${TURTLE}</button></div>`],
    listen2pl: ['Posłuchaj i wybierz znaczenie', `<div class="listen-row"><button class="listen" data-say="${esc(w.en)}" aria-label="Odtwórz"><img class="listen-img" src="assets/ui/speaker.png" alt="" draggable="false"></button><button class="listen-slow" data-slow="${esc(w.en)}" aria-label="Odtwórz wolniej" title="Wolniej">${TURTLE}<span>wolniej</span></button></div>`],
    pl2en: ['Jak to powiesz po angielsku?', `<div class="prompt-pl">${esc(w.pl)}</div>`],
    type: ['Napisz po angielsku', `<div class="prompt-pl">${esc(w.pl)}</div>`],
    truefalse: ['Czy to jest prawidłowe tłumaczenie?', S.cur.tf ? `
      <div class="tf-tile">
        ${!isPhrase(w) && WORD_IMG[w.id] ? `<div class="tf-img">${wordArt(w)}</div>` : `<svg class="tf-art" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="8" width="44" height="12" rx="6" fill="#cbc6f5"/><rect x="10" y="26" width="44" height="12" rx="6" fill="#6cb944"/><circle cx="17" cy="32" r="4.4" fill="#fff"/><path d="m14.8 32 1.6 1.6 3-3.2" fill="none" stroke="#6cb944" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="10" y="44" width="44" height="12" rx="6" fill="#cbc6f5"/></svg>`}
        <div class="tf-pl">${esc(S.cur.tf.text)}</div>
        <div class="tf-en">${esc(w.en)} <button class="icon-btn" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button><button class="icon-btn slow-btn" data-slow="${esc(w.en)}" aria-label="Posłuchaj wolniej" title="Wolniej">${TURTLE}</button></div>
      </div>` : ''],
    pic4: ['Dopasuj znaczenie z odpowiednią kartą', `<div class="prompt-en">${esc(w.en)} <button class="icon-btn" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button><button class="icon-btn slow-btn" data-slow="${esc(w.en)}" aria-label="Posłuchaj wolniej" title="Wolniej">${TURTLE}</button></div>`],
    build: ['Utwórz prawidłowe słowo', S.cur.build ? buildPrompt(w, S.cur.build.mode) : ''],
    pairs: ['Dopasuj dwa słowa o tym samym znaczeniu', '<p class="pr-hint">Dotknij słowa, a potem jego tłumaczenia</p>'],
    dictation: ['Napisz, co słyszysz', `<div class="listen-row"><button class="listen" data-say="${esc(w.en)}" aria-label="Odtwórz"><img class="listen-img" src="assets/ui/speaker.png" alt="" draggable="false"></button><button class="listen-slow" data-slow="${esc(w.en)}" aria-label="Odtwórz wolniej" title="Wolniej">${TURTLE}<span>wolniej</span></button></div>`],
  };
  const [question, prompt] = prompts[type];

  let body = '';
  if (type === 'build' && S.cur.build) {
    body = buildBody(S.cur.build, answered, result);
  } else if (type === 'pairs' && S.cur.pairs) {
    const P = S.cur.pairs;
    const btn = (side, id) => {
      const x = byId.get(id), done = P.done.includes(id);
      const cls = done ? 'done' : P.sel && P.sel.side === side && P.sel.id === id ? 'sel' : P.bad && P.bad[side] === id ? 'bad' : '';
      return `<button class="pr-btn ${cls}" data-act="p-pick" data-side="${side}" data-id="${esc(id)}" ${done || answered ? 'disabled' : ''}>${esc(side === 'en' ? x.en : x.pl)}</button>`;
    };
    body = `<div class="pr-wrap"><div class="pr-col">${P.en.map((id) => btn('en', id)).join('')}</div><div class="pr-col">${P.pl.map((id) => btn('pl', id)).join('')}</div></div>`;
  } else if (type === 'truefalse') {
    const cls = (yes) => (!answered ? '' : exam ? (chosen === yes ? 'picked' : 'dim') : yes === S.cur.tf.ok ? 'ok' : chosen === yes ? 'bad' : 'dim');
    body = `<div class="tf-btns">
      <button class="tf-btn no ${cls(false)}" data-act="tf-no" ${answered ? 'disabled' : ''} aria-label="Nie, to złe tłumaczenie" title="Nie (1 lub ←)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <button class="tf-btn yes ${cls(true)}" data-act="tf-yes" ${answered ? 'disabled' : ''} aria-label="Tak, to dobre tłumaczenie" title="Tak (2 lub →)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg></button>
    </div>`;
  } else if (type === 'pic4' && options) {
    body = `<div class="pic-grid">${options.map((o, i) => {
      let cls = '';
      if (answered && exam) cls = i === chosen ? 'picked' : 'dim';
      else if (answered) { if (o.id === w.id) cls = 'ok'; else if (i === chosen) cls = 'bad'; else cls = 'dim'; }
      const ow = byId.get(o.id);
      return `<button class="pic-card ${cls}" data-opt="${i}" ${answered ? 'disabled' : ''} aria-label="Karta ${i + 1}${answered ? ': ' + esc(o.text) : ''}" style="--tint:${wordTint(ow)}"><img src="assets/words/${WORD_IMG[o.id]}.png" alt="" draggable="false"><kbd>${i + 1}</kbd>${answered ? `<span class="pic-label">${esc(o.text)}</span>` : ''}</button>`;
    }).join('')}</div>`;
  } else if (options) {
    // obrazki słówek przy odpowiedziach po polsku (słuchanie, „co to znaczy?”) — przy pl→en zdradzałyby odpowiedź
    const pics = type === 'listen2pl' || type === 'en2pl';
    body = `<div class="options">${options.map((o, i) => {
      let cls = '';
      if (answered && exam) cls = i === chosen ? 'picked' : 'dim';
      else if (answered) { if (o.id === w.id) cls = 'ok'; else if (i === chosen) cls = 'bad'; else cls = 'dim'; }
      const ow = pics && byId.get(o.id), pic = ow && !isPhrase(ow) ? `<span class="opt-pic">${wordIcon(ow)}</span>` : '';
      return `<button class="opt ${cls}${pic ? ' has-pic' : ''}" data-opt="${i}" ${answered ? 'disabled' : ''}><kbd>${i + 1}</kbd>${pic}<span>${esc(o.text)}</span></button>`;
    }).join('')}</div>`;
  } else {
    const cls = !answered ? '' : exam ? 'picked' : result === 'ok' ? 'ok' : result === 'typo' ? 'typo' : 'bad';
    body = `
      <form class="type-form" data-form="type">
        <input id="typed" class="${cls}" value="${esc(S.cur.typed)}" ${answered ? 'readonly' : ''} autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="en" placeholder="wpisz odpowiedź…">
        ${answered ? '' : `
        <div class="type-actions">
          ${exam ? '' : '<button type="button" class="btn ghost" data-act="hint">Podpowiedź</button>'}
          <button type="button" class="btn ghost" data-act="dunno">Nie wiem</button>
          <button type="submit" class="btn primary">Sprawdź</button>
        </div>`}
      </form>`;
  }

  let feedback = '';
  if (answered && !exam) {
    const last = S.answers[S.answers.length - 1];
    const msg = !last.correct ? '✗ Nie tym razem' : result === 'typo' ? '≈ Prawie — uważaj na pisownię' : last.g === 3 ? '⚡ Błyskawicznie!' : '✓ Dobrze';
    const kind = !last.correct ? 'bad' : result === 'typo' || last.g === 1 ? 'typo' : 'ok';
    feedback = `
      <section class="feedback ${kind}">
        <div class="fb-title">${msg}${S.cur.earned ? ` <span class="gain">+${S.cur.earned} ${ICON.gem}</span>` : ''}</div>
        ${wordInfo(w, { full: !last.correct || type !== 'en2pl' })}
      </section>
      <button class="btn pill wide" data-act="next">Dalej</button>`;
  }

  return `${top}
    <section class="card study">
      <div class="badge">${question}</div>
      ${prompt}
    </section>
    ${body}
    ${feedback}`;
}

function weekStrip(cls = '') {
  const d = new Date();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const todayK = dayKey();
  let out = '';
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    const k = dayKey(x);
    const state = db.days[k]?.frozen ? 'frozen' : counted(k) ? 'done' : k > todayK ? 'future' : 'miss';
    out += `<div class="wday ${state} ${k === todayK ? 'today' : ''}">
      <span class="wd-icon">${state === 'done' ? ICON.flame : state === 'frozen' ? ICON.ice : ''}</span>
      <span>${WEEKDAYS[x.getDay()]}</span></div>`;
  }
  return `<div class="week ${cls}">${out}</div>`;
}

function streakCard() {
  const st = streak();
  const next = BADGES.find((b) => b.days > st);
  return `
  <section class="card streak-card">
    <div class="sc-row">
      <span class="sc-icon">${ICON.flame}</span>
      <div class="sc-text">
        <b>${daysLabel(st)} serii</b>
        <span class="muted small">${next ? `Jeszcze ${daysLabel(next.days - st)} do odznaki „${next.name}”` : 'Masz wszystkie odznaki serii!'}</span>
      </div>
    </div>
    ${weekStrip()}
  </section>`;
}

function viewCelebration() {
  const a = S.answers;
  const ok = a.filter((x) => x.correct).length;
  return `
  <div class="celebrate">
    <div class="confetti">${ART.confetti}</div>
    <button class="icon-btn round-close" data-act="home" aria-label="Zamknij">${ICON.close}</button>
    <div class="cel-art">${ART.chestOpen}</div>
    <h1 class="cel-title">Plan dnia ukończony!</h1>
    <p class="muted center">Wróć jutro, żeby utrzymać serię.</p>
    <div class="cel-reward">${ICON.gem}<b>+${CHEST_BONUS}</b><span>ze skrzyni</span></div>
    ${streakCard()}
    <div class="cel-stats">
      <div><b>${a.length}</b><span>odpowiedzi</span></div>
      <div><b class="ok-text">${a.length ? Math.round((ok / a.length) * 100) : 0}%</b><span>poprawnych</span></div>
      <div><b class="gem-text">+${S.gems}</b><span>diamentów</span></div>
    </div>
    ${S.badge ? `
    <section class="badge-card">
      ${ART.medal}
      <div><span class="overline gold">Nowa odznaka</span><b>${esc(S.badge.name)} · ${daysLabel(S.badge.days)} serii</b></div>
      <span class="gem-pill">+${S.badge.days * 5} ${ICON.gem}</span>
    </section>` : ''}
    <button class="btn pill wide" data-act="home">Dalej</button>
  </div>`;
}

function viewExamResult() {
  const { ok, total, pct: score } = examScore();
  const passed = score >= EXAM_PASS;
  const wrong = S.answers.filter((a) => !a.correct);
  const history = db.exams.filter((e) => e.kind === S.exam.key).slice(-8);
  return `
    ${statusBar()}
    <section class="card result">
      <div class="score-ring ${passed ? 'pass' : 'fail'}" style="--p:${score}"><span>${score}%</span></div>
      <h3 class="card-title">${passed ? 'Zaliczone!' : 'Jeszcze nie tym razem'}</h3>
      <p class="muted">${esc(S.exam.name)} · ${ok} z ${total} poprawnych · próg ${EXAM_PASS}%</p>
      <div class="cel-stats">
        <div><b>${ok}</b><span>dobrze</span></div>
        <div><b>${total - ok}</b><span>błędów</span></div>
        <div><b class="gem-text">+${S.gems}</b><span>diamentów</span></div>
      </div>
    </section>
    ${S.pathAdvanced ? `<section class="banner unlock">${ICON.star}<div><b>Odblokowano: ${esc(pathName(db.path.length))}</b><span>kolejny krok na ścieżce do egzaminu</span></div></section>` : ''}
    ${history.length > 1 ? `
    <section class="card">
      <h2 class="card-title small">Twoje wyniki</h2>
      <div class="forecast">
        ${history.map((e) => `<div class="fc"><b>${e.pct}</b><div class="fc-bar"><i class="${e.pct >= EXAM_PASS ? 'l5' : 'l2'}" style="height:${Math.max(4, e.pct)}%"></i></div><span>${new Date(e.date).getDate()}.${pad(new Date(e.date).getMonth() + 1)}</span></div>`).join('')}
      </div>
    </section>` : ''}
    ${wrong.length ? `
    <section class="card">
      <h2 class="card-title small">Błędy (${wrong.length})</h2>
      ${wrong.map((x) => {
        const w = byId.get(x.id);
        if (!w) return '';
        return `<div class="mistake">
          <div><button class="icon-btn" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button><b>${esc(w.en)}</b> — ${esc(w.pl)}</div>
          <div class="muted small">Twoja odpowiedź: <s>${esc(x.given || '(brak)')}</s></div>
        </div>`;
      }).join('')}
    </section>
    <button class="btn pill wide" data-act="retry-wrong">Poćwicz błędy</button>` : ''}
    <button class="btn wide" data-act="home">Wróć</button>`;
}

function viewSummary() {
  if (S.mode === 'exam') return viewExamResult();
  if (S.chestOpened) return viewCelebration();
  const a = S.answers;
  const ok = a.filter((x) => x.correct).length;
  const mins = Math.max(1, Math.round((Date.now() - S.start) / 60000));
  const avg = ok ? (a.filter((x) => x.correct).reduce((s, x) => s + x.ms, 0) / ok / 1000).toFixed(1) : '–';
  const wrong = [...S.wrong].map((id) => byId.get(id)).filter(Boolean);
  const c = counts();
  const left = STREAK_MIN - (db.days[dayKey()]?.n || 0);
  return `
    ${(() => {
      const rate = a.length ? ok / a.length : 0;
      return subHero({
        title: 'Koniec sesji',
        sub: `${mins} min · średni czas reakcji ${avg} s`,
        art: `<div class="ph-art launched">${IMG('plan-rocket.webp', '', '')}</div>`,
        rows: `
          ${heroRow({ icon: IMG('task-star.png', 'ph-icon'), label: 'Odpowiedzi', right: heroNum(a.length), tint: '255, 194, 26', ink: '#e09a00', i: 0 })}
          ${heroRow({ icon: IMG('stat-check.png', 'ph-icon'), label: 'Poprawne', fill: rate, right: `<span class="ph-num"><b>${Math.round(rate * 100)}</b>%</span>`, tint: '34, 197, 94', ink: '#1fa45a', i: 1 })}
          ${heroRow({ icon: IMG('stat-gem.png', 'ph-icon'), label: 'Diamenty', right: `<span class="ph-gems">+${S.gems}${IMG('gem-small.png', 'ph-gem')}</span>`, tint: '144, 97, 227', ink: '#9061e3', i: 2 })}`,
      });
    })()}
    ${S.streakUp ? streakCard() : ''}
    ${!counted(dayKey()) ? `<section class="banner">${ICON.flame}<div><b>Jeszcze ${left} ${plural(left, 'odpowiedź', 'odpowiedzi', 'odpowiedzi')}</b><span>i dzisiejszy dzień zaliczy się do serii</span></div></section>` : ''}
    ${wrong.length ? `
    <section class="card">
      <h2 class="card-title small">Do przećwiczenia</h2>
      ${wrong.map((w) => `<div class="mini-word"><button class="icon-btn" data-say="${esc(w.en)}" aria-label="Posłuchaj">${SPEAKER}</button><b>${esc(w.en)}</b><span class="muted">${esc(w.pl)}</span></div>`).join('')}
    </section>` : ''}
    ${collSummaryButtons() || `
    ${againButton(c)}
    <button class="btn wide" data-act="home">Wróć</button>`}`;
}

// „jeszcze raz” w tym samym trybie: po Nauce kolejne nowe słowa, po Powtórce kolejne powtórki
function againButton(c) {
  if (S.mode === 'new') return freshWords().length ? '<button class="btn pill wide" data-act="learn-new">Ucz się dalej</button>' : '';
  if (S.mode === 'review') return c.dueLeft ? '<button class="btn pill wide" data-act="review">Powtórz dalej</button>' : c.newLeft ? '<button class="btn pill wide" data-act="learn-new">Poznaj nowe słowa</button>' : '';
  return c.dueLeft + c.newLeft ? '<button class="btn pill wide" data-act="start">Jeszcze jedna sesja</button>' : '';
}

// Po lekcji z pakietu: ucz się dalej w tym pakiecie albo wróć do jego listy.
function collSummaryButtons() {
  const coll = S.coll && collection(S.coll);
  if (!coll) return '';
  const now = Date.now();
  const more = byKind(coll.ws).some((w) => !db.cards[w.id] || db.cards[w.id].due <= now);
  return `
    ${more ? `<button class="btn pill wide" data-act="coll-next">Ucz się dalej: ${esc(coll.name)}</button>` : ''}
    <button class="btn wide" data-act="coll-return">Wróć do pakietu</button>`;
}

function reopenColl(ref) {
  S = null;
  wordsFilter = { q: '', coll: ref, status: '', kind: wordsFilter.kind || '' };
  view = 'words';
}

function dueLabel(c) {
  if (!c) return 'nowe';
  const diff = c.due - Date.now();
  if (diff <= 0) return 'teraz';
  if (diff < 3600000) return `za ${Math.ceil(diff / 60000)} min`;
  if (diff < DAY) return `za ${Math.round(diff / 3600000)} h`;
  return `za ${Math.round(diff / DAY)} d`;
}

function listTags(w) {
  return `
    <div class="list-tags">
      ${db.lists.map((l) => {
        const on = l.ids.includes(w.id);
        return `<button class="chip ${on ? 'on' : ''}" data-listtoggle="${l.id}" data-word="${esc(w.id)}">${on ? '✓' : '+'} ${esc(l.name)}</button>`;
      }).join('')}
      <button class="chip dashed" data-act="new-list" data-word="${esc(w.id)}">+ nowa lista</button>
    </div>`;
}

// Ikona słówka: obrazek z assets/words albo emoji tematu na pastelowym tle.
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
// żółw „wolniej” — SVG zamiast emoji, żeby 🔊 i 🐢 miały ten sam rozmiar i linię na każdym systemie
const TURTLE = '<img class="turtle-img" src="assets/ui/turtle.png" alt="" draggable="false">'; // żółw 3D (Muse)

// Ikony tylko przy słówkach — zwroty (wyrażenia) są bez ikony.
function wordIcon(w) {
  if (isPhrase(w)) return '';
  const img = WORD_IMG[w.id];
  if (img) return `<img class="wr-img" src="assets/words/${img}.png" alt="" loading="lazy" draggable="false">`;
  const topics = topicsList();
  const i = Math.max(0, topics.findIndex((t) => t.name === w.topic));
  return `<span class="wr-emoji" style="background:${TINTS[i % TINTS.length]}">${esc(w.icon || '💬')}</span>`;
}

function wordRow(w) {
  const c = db.cards[w.id];
  const lvl = c ? Math.max(1, c.level) : 0;
  return `
    <div class="word-row">
      ${isPhrase(w) ? '' : `<span class="wr-icon">${wordIcon(w)}</span>`}
      <span class="wr-main">
        <span class="wr-en"><button class="wr-open" data-wopen="${esc(w.id)}" title="Szczegóły słówka"><b>${esc(w.en)}</b></button><button class="wr-say" data-say="${esc(w.en)}" aria-label="Posłuchaj" title="Posłuchaj">${SPEAKER}</button></span>
        <span class="wr-pl">${esc(w.pl)}</span>
      </span>
      ${posBadge(w)}
      ${isKnown(c) ? `<span class="wr-known" title="Wyuczone">${ICON.check}</span>` : `<span class="wr-lvl dots" title="Poziom: ${LEVEL_NAMES[lvl]}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span>`}
      <span class="wr-more" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>`;
}

const PROMOS = [
  ['install', 'Dodaj na ekran główny', 'Słowik jak zwykła aplikacja — jedno dotknięcie', 'Jak dodać', '#efeaff', '#6a4cff'],
  ['listen', 'Słuchaj w drodze', 'Słówka czytane na głos — w autobusie, w aucie', 'Jak używać', '#e3f1ff', '#2f7fe6'],
  ['sync', 'Telefon i komputer', 'Wspólny postęp przez domowe Wi‑Fi', 'Jak połączyć', '#dcf6ee', '#0f9a8c'],
  ['backup', 'Kopia zapasowa', 'Zapisz postęp w pliku na wszelki wypadek', 'Zrób kopię', '#fff3d6', '#d98a00'],
];

function viewVocab() {
  const seen = words.filter((w) => db.cards[w.id]).length;
  const st = (k) => words.filter((w) => wordStatus(w) === k).length;
  const total = words.length || 1, ready = counts().dueLeft + counts().newLeft;
  const fav = db.lists.find((l) => l.id === FAV_ID);
  const hard = collection('auto:hard');
  const promos = PROMOS.filter(([k]) => !(db.settings.promoOff || []).includes(k));
  const menu = [
    ['auto:new', 'Słówka do nauczenia', 'voc-learn', total - seen],
    ['auto:hard', 'Pomyłki', 'voc-mistakes', hard ? hard.total : 0, true],
    ['auto:seen', 'Moje słówka', 'voc-mine', seen],
    ['pack:all', 'Wszystkie słówka', 'voc-all', words.length],
    ['view:lists', 'Moje listy', 'voc-lists', db.lists.filter((l) => l.id !== FAV_ID).length],
    ['view:packs', 'Tematy', 'voc-topics', topicsList().length],
    ['list:' + FAV_ID, 'Ulubione', 'voc-fav', fav ? fav.ids.length : 0],
  ];
  const statRow = (key, label, img, tint, ink, i) => heroRow({
    icon: IMG(img, 'ph-icon'), label, fill: st(key) / total, tint, ink, i, right: heroNum(st(key)), attrs: `data-coll="auto:${key === 'new' ? 'new' : key}"`,
  });
  return `
    ${pageHero({
      title: 'Słownictwo',
      badge: `<span class="ph-mode static">${itemsLabel(words)}</span>`,
      art: `<div class="ph-art">${IMG('hero-words.png', '', '')}</div>`,
      rows: `
        ${statRow('known', 'Umiem', 'stat-check.png', '34, 197, 94', '#1fa45a', 0)}
        ${statRow('learning', 'Uczę się', 'task-refresh.png', '59, 142, 240', '#2f7fe6', 1)}
        ${statRow('new', 'Nowe', 'task-star.png', '255, 194, 26', '#e09a00', 2)}
        <button class="ph-cta" data-act="${ready ? 'start' : 'extra'}"><span>${ready ? 'Ucz się' : 'Powtórz więcej'}</span></button>`,
    })}
    ${promos.length ? `
    <div class="promos">${promos.map(([k, title, text, link, bg, ink]) => `
      <section class="promo" style="--bg:${bg};--ink:${ink}">
        <button class="promo-x" data-act="promo-off" data-p="${k}" aria-label="Ukryj">${ICON.close}</button>
        ${IMG(`ui/promo-${k}.png`, 'promo-img')}
        <b>${title}</b>
        <span>${text}</span>
        <button class="promo-go" data-act="promo" data-p="${k}">${link} ›</button>
      </section>`).join('')}
    </div>` : ''}
    <section class="voc-menu">
      ${menu.map(([ref, label, icon, n, alert]) => {
        const [kind, key] = ref.split(':');
        const attrs = kind === 'view' ? `data-view="${key}"` : `data-coll="${esc(ref)}"`;
        return `<button class="voc-row" ${attrs}>${IMG(`ui/${icon}.png`, 'voc-ic')}<b>${label}</b><span class="voc-n ${alert && n ? 'alert' : ''}">${n}</span><span class="voc-chev" aria-hidden="true">›</span></button>`;
      }).join('')}
    </section>`;
}

// Moje listy: własne zestawy słówek (Ulubione są osobno w Słownictwie)
function viewLists() {
  const lists = db.lists.filter((l) => l.id !== FAV_ID).map((l) => collection('list:' + l.id)).filter(Boolean);
  return `
    ${subHero({
      title: 'Moje listy',
      back: 'data-view="words"',
      sub: lists.length ? `${lists.length} ${plural(lists.length, 'lista', 'listy', 'list')}` : 'Twoje zestawy do powtórek',
      art: `<div class="ph-art">${IMG('ui/cards.png', '', '')}</div>`,
      rows: `
        ${lists.map((l, i) => heroRow({ icon: sqIcon(ICON.words, '#8fb7ff', '#2f7fe6'), label: esc(l.name), sub: `umiesz ${l.known} z ${l.total}`, fill: l.total ? l.known / l.total : 0, right: heroNum(l.total), attrs: `data-coll="${esc(l.ref)}"`, tint: '59, 142, 240', ink: '#2f7fe6', i })).join('')}
        ${lists.length ? '' : '<p class="sh-empty">Nie masz jeszcze list. Utwórz pierwszą albo dodawaj słówka serduszkiem do Ulubionych.</p>'}
        <button class="ph-cta" data-act="new-list"><span>+ Nowa lista</span></button>`,
    })}`;
}

const WORDS_PAGE = 150;

function viewWords() {
  const q = Answer.norm(wordsFilter.q);
  const coll = collection(wordsFilter.coll);
  const all = coll ? coll.ws : words;
  // rodzaj: same słówka albo same zwroty (przełącznik pokazujemy, gdy zestaw ma jedno i drugie)
  const nPhrases = all.filter(isPhrase).length;
  const mixed = nPhrases > 0 && nPhrases < all.length;
  const kind = mixed ? wordsFilter.kind || '' : '';
  const base = byKind(all);
  const kinds = [['', 'Wszystko', all.length], ['words', 'Słówka', all.length - nPhrases], ['phrases', 'Zwroty', nPhrases]];
  const list = base.filter((w) =>
    (!wordsFilter.status || wordStatus(w) === wordsFilter.status) &&
    (!q || Answer.norm(w.en).includes(q) || w.pl.toLowerCase().includes(wordsFilter.q.toLowerCase())));
  const statusCount = (s) => base.filter((w) => wordStatus(w) === s).length;
  const chips = [['', 'Wszystkie', base.length], ['known', 'Umiem', statusCount('known')], ['learning', 'Uczę się', statusCount('learning')], ['new', 'Nowe', statusCount('new')]];
  const opt = (ref, label) => `<option value="${esc(ref)}" ${wordsFilter.coll === ref ? 'selected' : ''}>${esc(label)}</option>`;

  const options = `
    ${mixed ? `
    <div class="segmented kind-seg" role="radiogroup" aria-label="Rodzaj">
      ${kinds.map(([k, label, n]) => `<button class="seg ${kind === k ? 'on' : ''}" role="radio" aria-checked="${kind === k}" data-kind="${k}">${label} <span>${n}</span></button>`).join('')}
    </div>` : ''}
    <div class="chips">
      ${chips.map(([k, label, n]) => `<button class="chip ${wordsFilter.status === k ? 'on' : ''}" data-status="${k}">${label} <span>${n}</span></button>`).join('')}
    </div>`;
  // długie zestawy (np. Wszystkie słówka — kilka tysięcy) rysujemy partiami, żeby lista i szukanie działały płynnie
  const shown = wordsFilter.more ? list : list.slice(0, WORDS_PAGE);
  const rows = list.length ? shown.map(wordRow).join('') + (shown.length < list.length ? `<button class="btn ghost words-more" data-act="words-more">Pokaż wszystkie (${list.length})</button>` : '') : '<p class="muted center empty">Brak słówek w tym widoku</p>';

  // Zakładka Słownictwo: postęp, karty podpowiedzi i działy (jak w WRD, w stylu aplikacji)
  if (!coll) return viewVocab();
  // Ekran pakietu / tematu / listy (jak w WRD): nagłówek, szukaj, lista z ikonami, „Ucz się” na dole
  const learnN = base.length;
  return `
    <header class="cv-top">
      <div class="cv-bar">
        <button class="pk-back" data-view="${collFrom}" aria-label="Wróć">${ICON.back}</button>
        <div class="cv-title"><h2>${esc(coll.name)}</h2><span>${itemsLabel(coll.ws)}${coll.known ? ` · umiesz ${coll.known}` : ''}</span></div>
        <details class="cv-menu">
          <summary class="pk-back" aria-label="Więcej opcji" title="Więcej opcji"><span class="cv-dots"><i></i><i></i><i></i></span></summary>
          <div class="cv-pop">
            <button data-act="coll-player" ${canSpeak && learnN ? '' : 'disabled'}>${ICON.listen}<span>Słuchaj w drodze</span></button>
            <button data-act="coll-review" ${base.some((w) => db.cards[w.id]) ? '' : 'disabled'}>${ICON.refresh}<span>Powtórz poznane</span></button>
            ${coll.list ? `<button data-act="rename-list">${ICON.words}<span>Zmień nazwę</span></button><button class="danger" data-act="delete-list">${ICON.close}<span>Usuń listę</span></button>` : ''}
          </div>
        </details>
      </div>
      <span class="cv-progress" title="Umiesz ${coll.known} z ${coll.total}"><i style="width:${pct(coll.total ? coll.known / coll.total : 0)}"></i></span>
    </header>
    ${coll.desc ? `<p class="cv-desc">${esc(coll.desc)}</p>` : ''}
    <label class="cv-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
      <input type="search" id="q" placeholder="Szukaj" value="${esc(wordsFilter.q)}">
    </label>
    ${options}
    ${coll.list && !coll.total ? '<p class="card muted small">Lista jest pusta. Rozwiń dowolne słówko w zakładce Słówka i kliknij nazwę tej listy.</p>' : ''}
    <div class="word-list cv-list">${rows}</div>
    <div class="cv-cta">
      <button class="cv-learn" data-act="start-coll" ${learnN ? '' : 'disabled'}><span>Ucz się</span></button>
    </div>`;
}

// ---------- profil ----------

function viewProfile() {
  const c = counts();
  const s = db.settings;
  const st = streak();
  const fc = forecast();
  const fcMax = Math.max(1, ...fc.map((x) => x.n));
  const lvMax = Math.max(1, ...c.levels);
  const next = BADGES.find((b) => b.days > st) || BADGES[BADGES.length - 1];
  const totalW = words.length || 1;
  return `
    ${pageHero({
      title: 'Mój profil',
      badge: '<span class="ph-mode static">angielski</span>',
      head: `<button class="ph-settings" data-view="plan-settings" aria-label="Ustawienia planu dnia" title="Ustawienia planu">${ICON.sliders}</button>`,
      art: `<div class="ph-art">${IMG('hero-profile.png', '', '')}</div>`,
      rows: `
        ${heroRow({ icon: IMG('stat-flame.png', 'ph-icon'), label: 'Seria dni', sub: st >= next.days ? 'wszystkie odznaki zdobyte!' : `do odznaki „${next.name}”: ${daysLabel(next.days - st)}`, fill: Math.min(1, st / next.days), right: heroNum(st), tint: '255, 138, 31', ink: '#ed7a18', i: 0 })}
        ${heroRow({ icon: IMG('stat-gem.png', 'ph-icon'), label: 'Diamenty', sub: `zamrożenie serii: ${FREEZE_PRICE} 💎 · masz ${db.freezes} z ${MAX_FREEZES}`, right: heroNum(db.gems), tint: '144, 97, 227', ink: '#9061e3', i: 1 })}
        ${heroRow({ icon: IMG('stat-check.png', 'ph-icon'), label: 'Umiesz słówek', fill: c.known / totalW, right: heroNum(c.known, words.length), tint: '39, 173, 179', ink: '#27adb3', i: 2 })}
        ${heroRow({ icon: `<span class="ph-icon ph-art-icon">${ART.trophy}</span>`, label: 'Najdłuższa seria', right: heroNum(db.best), tint: '255, 194, 26', ink: '#e09a00', i: 3 })}`,
    })}

    ${streakCard()}

    <section class="card">
      <h2 class="card-title small">Odznaki</h2>
      <div class="badges">
        ${BADGES.map((b) => {
          const got = db.badges[b.days];
          return `<div class="badge-item ${got ? 'got' : ''}" title="${got ? `Zdobyta ${formatDate(got, false)}` : `Seria ${daysLabel(b.days)}`}">${ART.medal}<b>${b.name}</b><span>${daysLabel(b.days)}</span></div>`;
        }).join('')}
      </div>
    </section>

    <section class="card shop">
      <span class="shop-icon">${ICON.ice}</span>
      <div><b>Zamrożenie serii</b><p class="muted small">Chroni serię, gdy opuścisz dzień. Masz ${db.freezes} z ${MAX_FREEZES}.</p></div>
      <button class="btn buy" data-act="buy-freeze" ${db.gems < FREEZE_PRICE || db.freezes >= MAX_FREEZES ? 'disabled' : ''}>${FREEZE_PRICE} ${ICON.gem}</button>
    </section>

    <section class="card">
      <h2 class="card-title small">Jak zdobywać diamenty</h2>
      <ul class="rules">
        <li><span>Dobra odpowiedź</span><b>+1 ${ICON.gem}</b></li>
        <li><span>Błyskawiczna odpowiedź ⚡</span><b>+2 ${ICON.gem}</b></li>
        <li><span>Skrzynia za ukończony plan dnia</span><b>+${CHEST_BONUS} ${ICON.gem}</b></li>
        <li><span>Zaliczony test (≥ ${EXAM_PASS}%)</span><b>+${EXAM_BONUS} ${ICON.gem}</b></li>
        <li><span>Nowa odznaka serii</span><b>+5 ${ICON.gem} × dni</b></li>
      </ul>
    </section>

    <section class="card">
      <h2 class="card-title small">Poziom słówek</h2>
      <div class="levels">
        ${c.levels.map((n, i) => `<div class="lv"><div class="lv-bar"><i class="l${i}" style="height:${(n / lvMax) * 100}%"></i></div><b>${n}</b><span>${LEVEL_NAMES[i]}</span></div>`).join('')}
      </div>
    </section>

    <section class="card">
      <h2 class="card-title small">Powtórki w tym tygodniu</h2>
      <div class="forecast">
        ${fc.map((f) => `<div class="fc"><b>${f.n || ''}</b><div class="fc-bar"><i style="height:${(f.n / fcMax) * 100}%"></i></div><span>${f.label}</span></div>`).join('')}
      </div>
    </section>

    <h2 class="section-title">Ustawienia</h2>
    <section class="card set-card">
      <div class="set-head">${setIcon('sparkle', ['#E7E0FF', '#5A3FE0'])}<b>Wygląd</b></div>
      <div class="segmented" role="radiogroup" aria-label="Motyw">
        ${[['light', '☀️ Jasny'], ['dark', '🌙 Ciemny'], ['auto', '⚙️ Jak w systemie']].map(([v, l]) => `<button class="seg ${s.theme === v ? 'on' : ''}" role="radio" aria-checked="${s.theme === v}" data-setval="theme:${v}">${l}</button>`).join('')}
      </div>
    </section>
    ${syncCard()}
    <button class="card link-card" data-view="plan-settings">
      ${setIcon('sliders', ['#E7E0FF', '#5A3FE0'])}
      <span class="set-text"><b>Ustawienia planu dnia</b><span>${s.newPerDay} nowych słów · cel ${goalMin()} min · kolejność, rozgrzewka, słuch i pisanie</span></span>
      <span class="chev" aria-hidden="true">›</span>
    </button>

    <section class="card form">
      <h3>Mój egzamin</h3>
      <label>Nazwa
        <input type="text" value="${esc(s.examName)}" data-set="examName">
      </label>
      <label>Data
        <input type="date" value="${esc(s.examDate)}" data-set="examDate">
      </label>
    </section>

    <section class="card form">
      <h3>Wymowa</h3>
      ${canSpeak ? '' : '<p class="bad-text small">Ta przeglądarka nie obsługuje syntezy mowy — ćwiczenia ze słuchu są wyłączone.</p>'}
      <label>Akcent
        <select data-set="accent">
          <option value="en-GB" ${s.accent === 'en-GB' ? 'selected' : ''}>brytyjski</option>
          <option value="en-US" ${s.accent === 'en-US' ? 'selected' : ''}>amerykański</option>
        </select>
      </label>
      <label>Głos
        <select data-set="voice">
          <option value="">automatycznie</option>
          ${voices.map((v) => `<option value="${esc(v.name)}" ${s.voice === v.name ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
        </select>
      </label>
      <label>Tempo mowy: <b id="rate-val">${s.rate.toFixed(2)}</b>
        <input type="range" min="0.6" max="1.2" step="0.05" value="${s.rate}" data-set="rate">
      </label>
      <label class="check"><input type="checkbox" data-set="autoplay" ${s.autoplay ? 'checked' : ''}> Czytaj słowa automatycznie</label>
      <button class="btn" data-say="Hello! Nice to meet you.">🔊 Test głosu</button>
    </section>

    ${DEV ? `
    <section class="card dv-entry">
      <div><h3>🛠️ Panel dewelopera</h3><p class="muted small">Ikony do słówek jednym kliknięciem (OpenRouter). Bez ikony: ${devMissing().length}.</p></div>
      <button class="btn pill" data-view="dev">Otwórz</button>
    </section>` : ''}

    <section class="card form">
      <h3>Słówka i kopia zapasowa</h3>
      <p class="muted small">Słówka aktualizują się same przy każdym uruchomieniu <b>start.bat</b> (z pliku slowka.md). Import ręczny przydaje się np. na telefonie.</p>
      <label class="btn file">📥 Importuj słownik (.md)<input type="file" accept=".md,.txt,text/markdown" data-file="md" hidden></label>
      <button class="btn" data-act="export">💾 Eksportuj postępy</button>
      <p class="muted small">${db.lastBackup ? `Ostatnia kopia: ${formatDate(dayKey(new Date(db.lastBackup)))}` : 'Nie masz jeszcze kopii — zrób ją raz w tygodniu.'}</p>
      <label class="btn file">📂 Wczytaj kopię<input type="file" accept=".json,application/json" data-file="backup" hidden></label>
      <button class="btn danger" data-act="reset">Wyzeruj postępy</button>
    </section>
    <p class="muted center small">Słowik · ${wordsLabel(words.length)}</p>`;
}
