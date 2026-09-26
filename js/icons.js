// Ikony i ilustracje SVG (styl: pastelowe wypełnienia + ciemny kontur).
(function (root) {
  'use strict';

  const INK = '#2A2150';
  const line = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const art = (w, h, vb, body) => `<svg width="${w}" height="${h}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
  const o = (sw = 3) => `stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"`;

  const FLAME_PATH = 'M12.5 2c.6 3.6 5.5 5.8 5.5 11.5A6 6 0 0 1 6 13.5c0-2.6 1.4-4.4 2.8-5.6-.1 2.3.9 3.6 2.2 3.8-.4-3.8.3-6.9 1.5-9.7z';
  const GEM_PATH = 'M7 3h10l5 6.5L12 22 2 9.5z';

  const ICON = {
    learn: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>',
    listen: line('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>', 2.2),
    words: line('<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>', 2.2),
    profile: line('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    settings: line('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>', 2),
    close: line('<path d="M18 6 6 18M6 6l12 12"/>', 2.4),
    refresh: line('<path d="M20 11a8 8 0 0 0-14.9-3"/><path d="M4 13a8 8 0 0 0 14.9 3"/><path d="M4 4v4h4"/><path d="M20 20v-4h-4"/>', 2.2),
    sparkle: line('<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>', 2.2),
    clock: line('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 2.2),
    lock: line('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 2.6),
    flag: line('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>', 2.4),
    sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="4" x2="8" y2="20"/><line x1="16" y1="4" x2="16" y2="20"/><circle cx="8" cy="15" r="2.6" fill="currentColor"/><circle cx="16" cy="9" r="2.6" fill="currentColor"/></svg>',
    back: line('<path d="M15 18l-6-6 6-6"/>', 2.6),
    order: line('<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5l1.5-1v5M3.5 13.5c0-1 .8-1.5 1.5-1.5s1.5.5 1.5 1.3c0 1.2-3 2.2-3 3.7h3"/>', 2),
    warm: line('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 2.2),
    keyboard: line('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8"/>', 2.2),
    target: line('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>', 2.2),
    tick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
    prev: line('<path d="M19 20 9 12l10-8z"/><path d="M5 19V5"/>'),
    next: line('<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>'),
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#22c55e"/><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gem: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${GEM_PATH}" fill="#8b5cf6"/><path d="M2 9.5h20M12 22 8 9.5 12 3l4 6.5z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
    flame: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${FLAME_PATH}" fill="currentColor"/><path d="M12 21a3.2 3.2 0 0 1-3.2-3.2c0-2 1.6-3 2.4-4.6.9 2 4 2.6 4 4.6A3.2 3.2 0 0 1 12 21z" fill="#ffd43b"/></svg>`,
    ice: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17M9 4l3 2 3-2M9 20l3-2 3 2" fill="none" stroke="#4dabf7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    uk: '<svg viewBox="0 0 60 60" aria-hidden="true"><rect width="60" height="60" fill="#012169"/><path d="M0 0l60 60M60 0 0 60" stroke="#fff" stroke-width="12"/><path d="M0 0l60 60M60 0 0 60" stroke="#C8102E" stroke-width="4"/><path d="M30 0v60M0 30h60" stroke="#fff" stroke-width="16"/><path d="M30 0v60M0 30h60" stroke="#C8102E" stroke-width="9"/></svg>',
  };

  const ART = {
    // Plan dnia: rakieta startująca z książki
    rocketBook: art(172, 120, '0 0 200 140', `
      <ellipse cx="100" cy="131" rx="80" ry="6" fill="#DCD3FF"/>
      <path d="M30 28 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#FFC53D"/>
      <path d="M168 18 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#5AB4F5"/>
      <circle cx="156" cy="54" r="3.5" fill="#FF7A6B"/><circle cx="46" cy="64" r="3" fill="#6B4EFF"/>
      <path d="M18 94 L100 110 L182 94 L182 118 L100 134 L18 118 Z" fill="#6B4EFF" ${o()}/>
      <path d="M24 86 C52 78 80 82 100 100 L100 128 C80 112 52 108 24 114 Z" fill="#fff" ${o()}/>
      <path d="M176 86 C148 78 120 82 100 100 L100 128 C120 112 148 108 176 114 Z" fill="#fff" ${o()}/>
      <path d="M36 96 C54 92 70 94 84 102 M36 106 C54 102 70 104 84 112 M164 96 C146 92 130 94 116 102 M164 106 C146 102 130 104 116 112" fill="none" stroke="#C9C1EE" stroke-width="2.5" stroke-linecap="round"/>
      <g class="rocket">
        <path d="M91 62 L100 86 L109 62 Z" fill="#FF9F43"/><path d="M95 62 L100 76 L105 62 Z" fill="#FFD25E"/>
        <path d="M88 46 L76 62 L89 60 Z" fill="#FF7A6B" ${o()}/><path d="M112 46 L124 62 L111 60 Z" fill="#FF7A6B" ${o()}/>
        <path d="M100 2 C114 14 116 40 112 64 L88 64 C84 40 86 14 100 2 Z" fill="#fff" ${o()}/>
        <path d="M100 2 C106 7 110 14 112.5 22 L87.5 22 C90 14 94 7 100 2 Z" fill="#FF7A6B" ${o()}/>
        <circle cx="100" cy="40" r="7" fill="#8DCBFF" ${o()}/>
      </g>
      <path d="M72 106 a12 12 0 0 1 14 -14 a15 15 0 0 1 28 0 a12 12 0 0 1 14 14 z" fill="#fff" ${o()}/>`),

    chest: art(38, 32, '0 0 40 34', `
      <path d="M4 14 C4 6 10 3 20 3 C30 3 36 6 36 14 Z" fill="#FFA552" ${o(2.6)}/>
      <rect x="4" y="14" width="32" height="17" rx="3" fill="#FFB866" ${o(2.6)}/>
      <rect x="16" y="11" width="8" height="10" rx="2" fill="#FFD25E" ${o(2.2)}/>
      <circle cx="20" cy="16" r="1.5" fill="${INK}"/>
    `),

    chestOpen: art(170, 140, '0 0 170 140', `
      <g stroke="#FFC53D" stroke-width="6" stroke-linecap="round"><path d="M85 4v16"/><path d="M38 18l10 12"/><path d="M132 18l-10 12"/><path d="M14 56h16"/><path d="M140 56h16"/></g>
      <ellipse cx="85" cy="130" rx="62" ry="7" fill="#E4DEFA"/>
      <path d="M36 60 L44 32 C46 26 52 22 58 22 L112 22 C118 22 124 26 126 32 L134 60 Z" fill="#FF9F43" ${o(3.5)}/>
      <path d="M58 66 l10 -14 h14 l10 14 -17 20z" fill="#8B5CF6" ${o()}/>
      <path d="M90 62 l8 -11 h11 l8 11 -13.5 16z" fill="#38C6B4" ${o()}/>
      <circle cx="50" cy="60" r="8" fill="#FFD25E" ${o()}/><circle cx="122" cy="60" r="7" fill="#FFD25E" ${o()}/>
      <rect x="30" y="64" width="110" height="60" rx="8" fill="#FFB866" ${o(3.5)}/>
      <path d="M30 82 H140" stroke="${INK}" stroke-width="3"/>
      <rect x="74" y="72" width="22" height="24" rx="4" fill="#FFD25E" ${o()}/><circle cx="85" cy="83" r="3" fill="${INK}"/>`),

    confetti: art(390, 250, '0 0 390 250', `
      <rect x="40" y="40" width="10" height="16" rx="2" fill="#FF7A6B" transform="rotate(-20 45 48)"/>
      <rect x="92" y="96" width="8" height="14" rx="2" fill="#5AB4F5" transform="rotate(30 96 103)"/>
      <rect x="310" y="54" width="10" height="16" rx="2" fill="#FFC53D" transform="rotate(25 315 62)"/>
      <rect x="344" y="140" width="8" height="14" rx="2" fill="#6B4EFF" transform="rotate(-35 348 147)"/>
      <rect x="30" y="170" width="8" height="14" rx="2" fill="#38C6B4" transform="rotate(15 34 177)"/>
      <rect x="270" y="18" width="8" height="12" rx="2" fill="#FF7A6B" transform="rotate(-10 274 24)"/>
      <circle cx="120" cy="30" r="5" fill="#FFC53D"/><circle cx="360" cy="96" r="4" fill="#FF7A6B"/>
      <circle cx="64" cy="128" r="4" fill="#6B4EFF"/><circle cx="296" cy="200" r="5" fill="#5AB4F5"/><circle cx="230" cy="40" r="3.5" fill="#38C6B4"/>
      <path d="M150 18 q6 -8 12 0 t12 0" fill="none" stroke="#6B4EFF" stroke-width="3" stroke-linecap="round"/>
      <path d="M322 180 q6 -8 12 0 t12 0" fill="none" stroke="#FFC53D" stroke-width="3" stroke-linecap="round"/>
      <path d="M18 92 q6 -8 12 0 t12 0" fill="none" stroke="#FF7A6B" stroke-width="3" stroke-linecap="round"/>`),

    medal: art(44, 48, '0 0 52 56', `<path d="M14 2 L24 22 L18 26 L6 6 Z" fill="#5AB4F5" ${o(2.5)}/><path d="M38 2 L28 22 L34 26 L46 6 Z" fill="#FF7A6B" ${o(2.5)}/><circle cx="26" cy="36" r="16" fill="#FFD25E" ${o()}/><path d="M26 27l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#fff" ${o(2)}/>`),

    trophy: art(32, 32, '0 0 32 32', `<path d="M9 4 H23 V12 C23 16 20 19 16 19 C12 19 9 16 9 12 Z" fill="#FFB020" ${o(2.4)}/><path d="M9 7 H5 C5 11 7 13 9.5 13 M23 7 H27 C27 11 25 13 22.5 13" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M16 19 V24 M11 28 H21 L20 24 H12 Z" fill="#FFB020" ${o(2.4)}/>`),

    gradCap: line('<path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11.5V17c3.5 2.5 8.5 2.5 12 0v-5.5"/><path d="M22 9v5"/>'),

    // Audio
    listenGirl: art(120, 84, '0 0 120 84', `
      <path d="M20 30 C14 38 14 46 20 54 M11 24 C1 36 1 48 11 60" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M100 30 C106 38 106 46 100 54 M109 24 C119 36 119 48 109 60" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M34 86 C34 68 46 60 60 60 C74 60 86 68 86 86 Z" fill="#FF7A6B" ${o()}/>
      <circle cx="60" cy="38" r="20" fill="#F7CFAE" ${o()}/>
      <path d="M40 38 C40 22 50 16 60 16 C72 16 80 24 80 36 C74 30 66 28 58 30 C52 32 46 34 40 38 Z" fill="#3B2A4F"/>
      <path d="M38 40 C38 18 82 18 82 40" fill="none" stroke="#6B4EFF" stroke-width="5" stroke-linecap="round"/>
      <rect x="32" y="34" width="11" height="17" rx="4" fill="#6B4EFF" ${o(2.5)}/><rect x="77" y="34" width="11" height="17" rx="4" fill="#6B4EFF" ${o(2.5)}/>
      <circle cx="53" cy="39" r="2.2" fill="${INK}"/><circle cx="67" cy="39" r="2.2" fill="${INK}"/>
      <path d="M54 46 C57 49 63 49 66 46" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`),
    ear: art(120, 84, '0 0 120 84', `
      <path d="M16 42 C16 22 30 10 46 10 C62 10 74 22 74 38 C74 50 66 54 62 60 C58 66 60 76 50 80 C42 83 34 78 34 70 Z" fill="#F7CFAE" ${o()}/>
      <path d="M30 42 C30 30 38 24 46 24 C54 24 60 30 60 38 C60 44 54 46 50 50" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M42 44 C42 38 46 36 49 38" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M84 34 v16 M92 24 v36 M100 36 v12 M108 28 v28 M116 38 v8" stroke="#1E1B33" stroke-width="4.5" stroke-linecap="round"/>`),

    cardStack: art(110, 84, '0 0 110 84', `
      <rect x="22" y="14" width="64" height="58" rx="10" fill="#FFD25E" ${o()} transform="rotate(-12 54 43)"/>
      <rect x="30" y="12" width="64" height="58" rx="10" fill="#8EE3B5" ${o()} transform="rotate(9 62 41)"/>
      <rect x="24" y="16" width="64" height="58" rx="10" fill="#fff" ${o()}/>
      <path d="M34 32 l4 4 7 -8 M34 48 l4 4 7 -8" fill="none" stroke="#6B4EFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M52 32 H78 M52 48 H74 M34 63 H70" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`),

    // Naklejki przy ścieżce egzaminu
    globe: art(52, 52, '0 0 52 52', `<circle cx="26" cy="26" r="22" fill="#8DCBFF" ${o()}/><path d="M12 18 C18 14 22 20 20 26 C18 30 12 30 10 28 Z M30 10 C36 12 40 18 36 22 C32 24 28 20 30 10 Z M28 34 C34 32 40 36 36 42 C32 44 28 40 28 34 Z" fill="#8EE3B5" ${o(2.5)}/>`),
    cup: art(52, 52, '0 0 52 52', `<path d="M10 20 H38 V34 C38 41 32 46 24 46 C16 46 10 41 10 34 Z" fill="#FF9C8A" ${o()}/><path d="M38 24 C46 24 46 36 38 36" fill="none" stroke="${INK}" stroke-width="3"/><path d="M18 6 C16 10 20 12 18 16 M26 6 C24 10 28 12 26 16" fill="none" stroke="#B9B2D6" stroke-width="3" stroke-linecap="round"/>`),
    suitcase: art(52, 52, '0 0 52 52', `<rect x="6" y="16" width="40" height="28" rx="5" fill="#FFD25E" ${o()}/><path d="M19 16 V10 C19 8 20 7 22 7 H30 C32 7 33 8 33 10 V16" fill="none" stroke="${INK}" stroke-width="3"/><path d="M16 16 V44 M36 16 V44" stroke="${INK}" stroke-width="3"/>`),
    book: art(52, 52, '0 0 52 52', `<path d="M8 12 C16 10 22 12 26 16 V44 C22 40 16 38 8 40 Z" fill="#fff" ${o()}/><path d="M44 12 C36 10 30 12 26 16 V44 C30 40 36 38 44 40 Z" fill="#B7A6FF" ${o()}/>`),
  };

  // Ilustracje pakietów słówek (według rodzaju słowa i tematyki)
  const PACK_ART = {
    podroze: `
      <rect x="14" y="20" width="56" height="40" rx="8" fill="#F7C85B" ${o(3)}/>
      <path d="M32 20 V12 C32 9 34 8 37 8 H47 C50 8 52 9 52 12 V20" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M28 20 V60 M56 20 V60" stroke="${INK}" stroke-width="3.5"/>
      <rect x="32" y="32" width="16" height="16" rx="3" fill="#fff" ${o(2.5)} transform="rotate(-10 40 40)"/>
    `,
    biznes: `
      <rect x="14" y="22" width="56" height="38" rx="8" fill="#A86A45" ${o(3)}/>
      <path d="M14 22 L42 42 L70 22" fill="#8E5432" ${o(3)}/>
      <path d="M33 22 V14 C33 11 35 10 38 10 H46 C49 10 51 11 51 14 V22" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="38" y="38" width="8" height="8" rx="2" fill="#FFD25E" ${o(2)}/>
    `,
    all: `<rect x="10" y="44" width="64" height="16" rx="3" fill="#6B4EFF" ${o()}/><rect x="16" y="28" width="56" height="16" rx="3" fill="#FF9C8A" ${o()}/><rect x="12" y="12" width="60" height="16" rx="3" fill="#8EE3B5" ${o()}/><path d="M22 20 h30 M26 36 h24 M20 52 h36" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    phrases: `<path d="M8 10 h44 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h-26 l-10 9 v-9 h-8 a8 8 0 0 1 -8 -8 v-18 a8 8 0 0 1 8 -8 z" fill="#fff" ${o()}/><circle cx="20" cy="27" r="3.5" fill="#6B4EFF"/><circle cx="30" cy="27" r="3.5" fill="#6B4EFF"/><circle cx="40" cy="27" r="3.5" fill="#6B4EFF"/><path d="M50 30 h22 a7 7 0 0 1 7 7 v12 a7 7 0 0 1 -7 7 h-3 v8 l-9 -8 h-10 a7 7 0 0 1 -7 -7 v-12 a7 7 0 0 1 7 -7 z" fill="#8EE3B5" ${o()}/><path d="M52 43 h16" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    nouns: `<path d="M14 24 L42 12 L70 24 L42 36 Z" fill="#F6C27A" ${o()}/><path d="M14 24 L14 54 L42 66 L42 36 Z" fill="#E9A35B" ${o()}/><path d="M70 24 L70 54 L42 66 L42 36 Z" fill="#D98B42" ${o()}/><path d="M28 18 L56 30 L56 58" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    adj: `<path d="M42 6 C20 6 6 20 6 36 C6 52 20 62 36 62 C44 62 46 56 42 50 C38 44 42 40 48 40 L58 40 C70 40 78 32 78 24 C78 12 62 6 42 6 Z" fill="#FDE2B8" ${o()}/><circle cx="24" cy="26" r="6" fill="#FF5A4A"/><circle cx="40" cy="17" r="6" fill="#FFC53D"/><circle cx="58" cy="21" r="6" fill="#38C6B4"/><circle cx="22" cy="44" r="6" fill="#6B4EFF"/><path d="M62 60 L80 38" stroke="#8B5A2B" stroke-width="6" stroke-linecap="round"/><path d="M62 60 L56 66" stroke="#6B4EFF" stroke-width="7" stroke-linecap="round"/>`,
    verbs: `<path d="M2 30 h10 M0 38 h8" stroke="#FF7A6B" stroke-width="3" stroke-linecap="round"/><path d="M14 40 C14 30 20 22 28 22 L36 22 C40 30 48 32 56 32 L66 34 C76 36 82 42 82 50 L82 54 L14 54 Z" fill="#fff" ${o()}/><path d="M14 54 L82 54 L82 58 C82 60 80 62 78 62 L18 62 C16 62 14 60 14 58 Z" fill="#6B4EFF" ${o()}/><path d="M40 30 l6 -4 M46 33 l6 -4" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
    small: `<path d="M16 22 h14 a7 7 0 1 1 14 0 h14 v14 a7 7 0 1 1 0 14 v14 h-42 z" fill="#B7A6FF" ${o()}/><circle cx="30" cy="44" r="3" fill="${INK}"/><circle cx="44" cy="44" r="3" fill="${INK}"/>`,
  };
  const packArt = (key) => art(80, 64, '-3 -3 90 74', PACK_ART[key] || PACK_ART.all);

  // Ikony tematów rozpoznawane po nazwie działu z slowka.md
  const TOPIC_ART = [
    [/powita/i, `<path d="M6 4 h28 a4 4 0 0 1 4 4 v14 a4 4 0 0 1 -4 4 h-16 l-7 7 v-7 h-5 a4 4 0 0 1 -4 -4 v-14 a4 4 0 0 1 4 -4 z" fill="#FFD25E" ${o(2.5)}/><text x="20" y="21" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="700" font-size="13" fill="${INK}">Hi!</text>`],
    [/przedstaw/i, `<rect x="3" y="5" width="34" height="26" rx="5" fill="#fff" ${o(2.5)}/><circle cx="13" cy="15" r="4" fill="#FF9C8A" ${o(2)}/><path d="M7 25 C8 21 18 21 19 25" fill="#FF9C8A" ${o(2)}/><path d="M23 14 H32 M23 20 H30" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`],
    [/samopocz|uczuc|emocj|nastr/i, `<circle cx="20" cy="18" r="15" fill="#FFD25E" ${o(2.5)}/><circle cx="15" cy="15" r="2" fill="${INK}"/><circle cx="25" cy="15" r="2" fill="${INK}"/><path d="M13 21 C16 26 24 26 27 21" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><circle cx="11.5" cy="20" r="2" fill="#FF9C8A"/><circle cx="28.5" cy="20" r="2" fill="#FF9C8A"/>`],
    [/grzeczn|uprzejm/i, `<path d="M20 32 C8 24 4 18 4 12 C4 7 8 4 12 4 C15.5 4 18.5 6 20 9 C21.5 6 24.5 4 28 4 C32 4 36 7 36 12 C36 18 32 24 20 32 Z" fill="#FF7A6B" ${o(2.5)}/><path d="M11 11 C11 9 12.5 8 14 8" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/>`],
    [/pożegn/i, `<rect x="8" y="3" width="20" height="30" rx="2" fill="#B7A6FF" ${o(2.5)}/><circle cx="23" cy="19" r="1.8" fill="${INK}"/><path d="M24 18 H37 M32 13 l5 5 -5 5" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`],
    [/kraj|narodow|państw/i, `<g transform="translate(1 -1) scale(.73)"><circle cx="26" cy="26" r="22" fill="#8DCBFF" ${o()}/><path d="M12 18 C18 14 22 20 20 26 C18 30 12 30 10 28 Z M30 10 C36 12 40 18 36 22 C32 24 28 20 30 10 Z M28 34 C34 32 40 36 36 42 C32 44 28 40 28 34 Z" fill="#8EE3B5" ${o(2.5)}/></g>`],
    [/pochodz|zamieszk|dom|miast|mieszk/i, `<path d="M5 17 L20 5 L35 17" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 15 V32 H31 V15 L20 7 Z" fill="#FF9C8A" ${o(2.5)}/><rect x="16" y="21" width="8" height="11" rx="1.5" fill="#FFD25E" ${o(2)}/>`],
    [/reagow|rozmow|dialog/i, `<path d="M4 6 h20 a3 3 0 0 1 3 3 v9 a3 3 0 0 1 -3 3 h-12 l-5 5 v-5 h-3 a3 3 0 0 1 -3 -3 v-9 a3 3 0 0 1 3 -3 z" fill="#fff" ${o(2.5)}/><path d="M20 14 h13 a3 3 0 0 1 3 3 v8 a3 3 0 0 1 -3 3 h-2 v5 l-5 -5 h-6 a3 3 0 0 1 -3 -3 v-8 a3 3 0 0 1 3 -3 z" fill="#8EE3B5" ${o(2.5)}/><text x="27" y="26" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="700" font-size="10" fill="${INK}">!?</text>`],
    [/jedzen|restaur|posił|kuchn|kawiar/i, `<g transform="translate(-4 -4) scale(.9)">${'<path d="M10 20 H38 V34 C38 41 32 46 24 46 C16 46 10 41 10 34 Z" fill="#FF9C8A" ' + o() + '/><path d="M38 24 C46 24 46 36 38 36" fill="none" stroke="' + INK + '" stroke-width="3"/>'}</g>`],
    [/podróż|wakac|lotnis|hotel/i, `<g transform="translate(-4 -4) scale(.9)"><rect x="6" y="16" width="40" height="28" rx="5" fill="#FFD25E" ${o()}/><path d="M19 16 V10 C19 8 20 7 22 7 H30 C32 7 33 8 33 10 V16" fill="none" stroke="${INK}" stroke-width="3"/></g>`],
  ];
  function topicArt(name) {
    const hit = TOPIC_ART.find(([re]) => re.test(name));
    return art(40, 36, '0 0 40 36', hit ? hit[1] : `<path d="M4 6 C11 4 16 6 20 10 V32 C16 28 11 27 4 29 Z" fill="#fff" ${o(2.5)}/><path d="M36 6 C29 4 24 6 20 10 V32 C24 28 29 27 36 29 Z" fill="#B7A6FF" ${o(2.5)}/>`);
  }

  root.ICON = ICON;
  root.ART = ART;
  root.packArt = packArt;
  root.topicArt = topicArt;
})(window);
