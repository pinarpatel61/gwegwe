/* otkrovenno.online — кликабельный прототип. Один код, два лейаута (мобильный / ПК). Без сборки и зависимостей. */
(function () {
  'use strict';
  var D = window.PROTO_DATA, C = window.PROTO_CONTENT;
  var PROFILES = D.profiles.filter(function (p) { return p.id !== 999895; });
  var byId = {}; PROFILES.forEach(function (p) { byId[p.id] = p; });

  /* ---------- состояние ---------- */
  var S = {
    me: JSON.parse(JSON.stringify(C.me)),
    guest: false,
    liked: {}, passed: {}, sparked: {},
    deckTab: 'all', deckIdx: 0, deckPhoto: {},
    filters: { ageMin: 18, ageMax: 35, city: 'Все', dist: 'Везде', online: false, photo: true, fresh: false },
    chats: JSON.parse(JSON.stringify(C.chats)),
    notifs: JSON.parse(JSON.stringify(C.notifications)),
    likes: JSON.parse(JSON.stringify(C.likes)),
    purchases: JSON.parse(JSON.stringify(C.purchases)),
    tickets: JSON.parse(JSON.stringify(C.tickets)),
    blocked: JSON.parse(JSON.stringify(C.blocked)),
    settings: { push: false, ev: { msg: true, like: true, view: true, follow: true, promo: false }, sound: true, quiet: false, qFrom: '23:00', qTo: '08:00', lang: 'ru', theme: 'light' },
    follow: {}, stickerPacks: { flirt: true, mood: true, prem: false },
    draft: {}, checkout: {}, signup: { step: 1, name: '', age: '', city: '', sex: 'm', look: 'f', email: '', consent: false },
    chatsTab: 'all', likesTab: 'in', notifTab: 'all', support: { cat: 'Общий вопрос' }, faqOpen: 0, settingsPage: 'account'
  };
  C.likes.outgoing.forEach(function (id) { S.liked[id] = 1; });
  var hist = [];

  /* ---------- утилиты ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function go(h) { if (location.hash === h) { render(); } else { location.hash = h; } }
  function back(fallback) { if (hist.length > 1) { hist.pop(); go(hist.pop()); } else { go(fallback || '#/'); } }
  function isDesktop() { return window.matchMedia('(min-width:980px)').matches; }
  function plural(n, a, b, c) { n = Math.abs(n) % 100; var n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; }
  function eur(n) { return '€' + (Math.round(n * 100) / 100).toString().replace('.', ','); }
  var toastT; function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 2200); }
  /* Склонение женских имён на -а/-я/-ия: дат. (кому), твор. (с кем), вин. (кого). */
  function decl(name, c) { var n = name; if (/ия$/.test(n)) return n.slice(0, -1) + (c === 'd' ? 'и' : c === 't' ? 'ей' : 'ю'); if (/[жшчщ]а$/.test(n)) return n.slice(0, -1) + (c === 'd' ? 'е' : c === 't' ? 'ей' : 'у'); if (/а$/.test(n)) return n.slice(0, -1) + (c === 'd' ? 'е' : c === 't' ? 'ой' : 'у'); if (/я$/.test(n)) return n.slice(0, -1) + (c === 'd' ? 'е' : c === 't' ? 'ей' : 'ю'); return n; }
  function zodiacName(z) { return C.zodiac[z] || ''; }
  function question(p) { return C.questions[p.id] || 'Что сегодня сделало ваш день?'; }
  function pairText(p) { return C.pairs[((p.zodiac || 1) * 7 + (S.me.zodiac || 5)) % C.pairs.length]; }
  function common(p) { return p.interests.filter(function (i) { return S.me.interests.indexOf(i) >= 0; }); }
  function compatAvg(p) { return Math.round((p.compat.love + p.compat.passion + p.compat.friend) / 3); }
  function presence(p) { return p.online ? 'В сети' : (p.seen.charAt(0).toUpperCase() + p.seen.slice(1)); }
  function chatFor(pid) { for (var i = 0; i < S.chats.length; i++) if (S.chats[i].pid === pid) return S.chats[i]; return null; }
  function unreadChats() { return S.chats.reduce(function (n, c) { return n + (c.unread ? 1 : 0); }, 0); }
  function unreadNotifs() { return S.notifs.filter(function (n) { return n.unread; }).length; }
  function incomingLikes() { return S.likes.incoming.length; }

  /* ---------- иконки ---------- */
  var I = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    heart: '<path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/>',
    heartf: '*<path d="M12 21s-8-5-8-10.6A4.6 4.6 0 0 1 12 8a4.6 4.6 0 0 1 8 2.4C20 16 12 21 12 21z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 15h2"/>',
    filter: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 14h18M12 9c-2-4-7-4-7-1s5 1 7 1zm0 0c2-4 7-4 7-1s-5 1-7 1z"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 10h.01M15 10h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    pin: '<path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11z"/><circle cx="12" cy="10" r="2.5"/>',
    spark: '*<path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7z"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    flag: '<path d="M5 21V4h12l-2 4 2 4H5"/>',
    block: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M8 7l4-4 4 4"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    chevd: '<path d="m6 9 6 6 6-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
    logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 17-6-6-9 9"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h9a7 7 0 0 1 0 14h-1"/>',
    play: '*<path d="M7 5v14l12-7z"/>',
    pause: '*<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 8 9 6 9-6"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="M11 11 20 2M16 6l2 2M13 9l2 2"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-1 9z"/>',
    wifioff: '<path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0M12 19h.01M3 3l18 18"/>',
    sparkles: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/>',
    cake: '<path d="M4 20h16M5 20v-6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6M12 11V7M12 7a1.5 1.5 0 1 0-1.5-1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 4a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-5-6.7"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5M12 8v4l3 2"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5A3 3 0 0 0 12 8a3 3 0 0 0 0 6 3 3 0 0 1 0 6 3 3 0 0 1-2.5-1.5M12 6v2M12 18v2"/>',
    cup: '<path d="M4 8h12v6a5 5 0 0 1-10 0zM16 9h2a2 2 0 0 1 0 4h-2M6 20h8"/>',
    chef: '<path d="M8 20h8v-5H8zM7 15V9a5 5 0 0 1 10 0v6"/>',
    leaf: '<path d="M4 20c0-8 6-14 16-16 0 10-6 16-14 16"/><path d="M4 20c4-4 8-6 12-8"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    wave: '<path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 6c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/>',
    dance: '<circle cx="12" cy="4" r="2"/><path d="M12 6v6l-4 8M12 12l4 8M8 9l4 3 4-3"/>',
    paw: '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="9" r="2"/><path d="M8 18c0-3 2-5 4-5s4 2 4 5a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"/>',
    run: '<circle cx="15" cy="4" r="2"/><path d="m5 20 4-6 3 2 2-5-3-2-4 3M14 13l3 2 2 5"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2a2 2 0 0 1 2-2h2a3 3 0 0 0 3-3 11 11 0 0 0-9-11z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
    lotus: '<path d="M12 20c-5 0-8-3-9-7 3 0 5 1 6 2-1-3 0-7 3-10 3 3 4 7 3 10 1-1 3-2 6-2-1 4-4 7-9 7z"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
    gamepad: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 12h4M9 10v4M16 11h.01M18 13h.01"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h3V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-3V4z"/>'
  };
  var INT_ICON = { 'Кулинария': 'chef', 'Природа': 'leaf', 'Путешествия': 'globe', 'Искусство': 'palette', 'Музыка': 'music', 'Книги': 'book', 'Море': 'wave', 'Танцы': 'dance', 'Животные': 'paw', 'Спорт': 'run', 'Фото': 'camera', 'Йога': 'lotus', 'Кофе': 'cup', 'Кино': 'film', 'Игры': 'gamepad', 'Психология': 'brain' };
  function ic(name, cls) {
    var p = I[name] || I.spark, fill = p.charAt(0) === '*'; if (fill) p = p.slice(1);
    return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" ' + (fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + '>' + p + '</svg>';
  }
  function intIcon(t) { return ic(INT_ICON[t] || 'spark'); }

  /* ---------- общие фрагменты ---------- */
  function avatar(p, cls, online) {
    if (!p) return '<div class="avatar navy ' + (cls || '') + '">' + esc(S.me.name.charAt(0)) + '</div>';
    return '<div class="avatar ' + (cls || '') + '" style="background-image:url(' + p.thumb + ')">' + ((online == null ? p.online : online) ? '<i class="on"></i>' : '') + '</div>';
  }
  function logo() { return '<div class="logo">otkrovenno<em>.online</em></div>'; }
  function balancePill() { return '<a class="vibes" href="#/store" aria-label="Баланс и пакеты">' + ic('chat') + '<b>' + S.me.chatsLeft + '</b><small>' + plural(S.me.chatsLeft, 'чат', 'чата', 'чатов') + '</small> · <b>' + eur(S.me.balance) + '</b></a>'; }
  function tbBack(title, right, fallback, left) {
    return '<div class="topbar' + (left ? ' left' : '') + '"><button class="ibtn" data-back="' + (fallback || '#/') + '" aria-label="Назад">' + ic('back') + '</button><h1>' + esc(title) + '</h1>' + (right || '<span class="sp"></span>') + '</div>';
  }
  function tbRoot(title, right) { return '<div class="topbar left"><h1>' + esc(title) + '</h1>' + (right || '') + '</div>'; }
  function pageHead(title, sub, actions) { return '<div class="vis-d"><div class="row-between"><div><h1 class="page-h">' + esc(title) + '</h1>' + (sub ? '<p class="page-sub">' + sub + '</p>' : '') + '</div>' + (actions || '') + '</div></div>'; }
  function empty(icon, title, text, btn) { return '<div class="empty"><div class="em">' + ic(icon) + '</div><b>' + esc(title) + '</b><div>' + text + '</div>' + (btn || '') + '</div>'; }
  function toggle(on, attr) { return '<button class="toggle' + (on ? ' on' : '') + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" ' + attr + '></button>'; }
  function ring(v, label) { var r = 24, c = 2 * Math.PI * r; return '<div><div class="ring"><svg viewBox="0 0 56 56"><circle class="bg" cx="28" cy="28" r="' + r + '"/><circle class="fg" cx="28" cy="28" r="' + r + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - v / 100)) + '"/></svg>' + v + '%</div><span>' + label + '</span></div>'; }
  function compatHtml(p) { return '<div class="compat">' + ring(p.compat.love, 'Любовь') + ring(p.compat.passion, 'Страсть') + ring(p.compat.friend, 'Дружба') + '</div>'; }
  function navHtml(active) {
    var items = [['#/', 'compass', 'Поиск', 0], ['#/likes', 'heart', 'Симпатии', incomingLikes()], ['#/chats', 'chat', 'Чаты', unreadChats()], ['#/me', 'user', 'Профиль', 0]];
    return '<nav class="bottomnav">' + items.map(function (it) { return '<a href="' + it[0] + '" class="' + (active === it[0] ? 'on' : '') + '">' + ic(it[1]) + '<span>' + it[2] + '</span>' + (it[3] ? '<i class="badge">' + it[3] + '</i>' : '') + '</a>'; }).join('') + '</nav>';
  }
  function sidebarHtml(active) {
    function nv(h, i, t, n) { return '<a class="nv' + (active === h ? ' on' : '') + '" href="' + h + '">' + ic(i) + t + (n ? '<i class="b">' + n + '</i>' : '') + '</a>'; }
    return '<aside class="sidebar">' + '<a href="#/">' + logo() + '</a>' +
      nv('#/', 'compass', 'Поиск') + nv('#/likes', 'heart', 'Симпатии', incomingLikes()) + nv('#/chats', 'chat', 'Чаты', unreadChats()) + nv('#/notifications', 'bell', 'Уведомления', unreadNotifs()) + nv('#/me', 'user', 'Профиль') +
      '<div class="sep"></div>' + nv('#/store', 'wallet', 'Пакеты и баланс') + nv('#/settings', 'gear', 'Настройки') + nv('#/support', 'help', 'Поддержка') +
      '<div class="wallet"><div class="lab">Чаты в пакете</div><div class="amt">' + S.me.chatsLeft + ' ' + plural(S.me.chatsLeft, 'чат', 'чата', 'чатов') + '</div><div class="sub"><div><b>' + eur(S.me.balance) + '</b><span>баланс</span></div><div><b>' + S.me.sparks + '</b><span>' + plural(S.me.sparks, 'искра', 'искры', 'искр') + '</span></div></div><a class="btn btn-block" href="#/store">Пополнить</a></div>' +
      '<a class="me" href="#/me">' + avatar(null, 'sm') + '<div><b>' + esc(S.me.name) + ', ' + S.me.age + '</b><span>' + esc(S.me.city) + ' · ' + zodiacName(S.me.zodiac) + '</span></div></a></aside>';
  }

  /* ---------- модальные окна ---------- */
  function openSheet(opts) {
    closeSheet();
    var b = document.createElement('div'); b.className = 'backdrop'; b.id = 'sheet';
    b.innerHTML = '<div class="sheet ' + (opts.cls || '') + '" role="dialog" aria-modal="true"><div class="grab"></div>' +
      (opts.title !== false ? '<div class="sh"><h3>' + esc(opts.title || '') + '</h3><button class="ibtn ghost" data-close aria-label="Закрыть">' + ic('x') + '</button></div>' : '') +
      '<div class="sb">' + opts.body + '</div>' + (opts.footer ? '<div class="sf">' + opts.footer + '</div>' : '') + '</div>';
    document.getElementById('modal-root').appendChild(b);
    b.addEventListener('click', function (e) { if (e.target === b || e.target.closest('[data-close]')) closeSheet(); });
    b._esc = function (e) { if (e.key === 'Escape') closeSheet(); }; document.addEventListener('keydown', b._esc);
    if (opts.after) opts.after(b);
    return b;
  }
  function closeSheet() { var b = $('#sheet'); if (b) { document.removeEventListener('keydown', b._esc); b.remove(); } }
  function confirmDlg(title, text, okLabel, onOk, danger) {
    openSheet({ cls: 'center dialog', title: title, body: '<p class="muted">' + text + '</p>', footer: '<button class="btn btn-light" data-close>Отмена</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-dark') + '" data-ok>' + esc(okLabel) + '</button>',
      after: function (b) { $('[data-ok]', b).onclick = function () { closeSheet(); onOk(); }; } });
  }
  function menuSheet(items) {
    openSheet({ title: false, body: '<div class="menu">' + items.map(function (it, i) { return '<button data-mi="' + i + '" class="' + (it.danger ? 'danger' : '') + '">' + ic(it.icon) + esc(it.label) + '</button>'; }).join('') + '</div>',
      after: function (b) { $$('[data-mi]', b).forEach(function (el) { el.onclick = function () { closeSheet(); items[+el.dataset.mi].fn(); }; }); } });
  }

  /* ---------- экономика: открыть чат / продлить ---------- */
  function openChatWith(p, then) {
    var ch = chatFor(p.id);
    if (ch) { go('#/chat/' + ch.id); return; }
    if (S.guest) { guestGate(function () { openChatWith(p, then); }); return; }
    var has = S.me.chatsLeft > 0;
    openSheet({ title: 'Открыть чат с ' + decl(p.name, 't') + '?', body:
      '<div class="row" style="padding:0 0 14px;background:none">' + avatar(p) + '<div class="tx"><b>' + esc(p.name) + ', ' + p.age + '</b><span>' + esc(presence(p)) + ' · ' + esc(p.city) + '</span></div></div>' +
      (has ? '<div class="note green">' + ic('check') + '<div>Спишется <b>1 чат из пакета</b>. Останется ' + (S.me.chatsLeft - 1) + ' ' + plural(S.me.chatsLeft - 1, 'чат', 'чата', 'чатов') + '. В чате — ' + C.economy.msgsPerChat + ' ваших сообщений, ответы не считаются.</div></div>'
           : '<div class="note amber">' + ic('info') + '<div>В пакете нет чатов. Один чат — <b>€7</b>, пакет «3 чата» — €18 (по €6). Оплата USDT или Binance Pay, зачисление автоматическое.</div></div>') +
      '<div class="qcard mt12"><small>Первое сообщение</small><p>«' + esc(question(p)) + '»</p><div class="pair">' + esc(pairText(p)) + '</div></div>',
      footer: has ? '<button class="btn btn-light" data-close>Позже</button><button class="btn btn-primary" data-ok>Открыть чат</button>' : '<button class="btn btn-light" data-close>Позже</button><a class="btn btn-primary" href="#/store?for=' + p.id + '" data-close>Выбрать пакет</a>',
      after: function (b) { var ok = $('[data-ok]', b); if (ok) ok.onclick = function () { closeSheet(); S.me.chatsLeft--; var c = { id: 'c' + (S.chats.length + 1), pid: p.id, unread: 0, used: 0, limit: C.economy.msgsPerChat, messages: [{ from: 'sys', text: 'Чат открыт из пакета · осталось ' + S.me.chatsLeft + ' ' + plural(S.me.chatsLeft, 'чат', 'чата', 'чатов'), day: 'Сегодня' }] }; S.chats.unshift(c); toast('Чат открыт · осталось ' + S.me.chatsLeft + ' ' + plural(S.me.chatsLeft, 'чат', 'чата', 'чатов')); go('#/chat/' + c.id); }; } });
  }
  function extendChat(ch) {
    var p = byId[ch.pid], has = S.me.chatsLeft > 0;
    openSheet({ title: 'Продлить чат с ' + decl(p.name, 't'), body:
      (has ? '<div class="note green">' + ic('check') + '<div>Продление — <b>1 чат из пакета</b>: ещё ' + C.economy.msgsPerChat + ' сообщений. Останется ' + (S.me.chatsLeft - 1) + '.</div></div>' : '<div class="note amber">' + ic('info') + '<div>В пакете нет чатов. Купите пакет — и продолжите с того же места, история сохранится.</div></div>') +
      '<div class="mt12 muted small">Собеседница увидит, что переписка продолжается, уведомлений о продлении она не получает.</div>',
      footer: has ? '<button class="btn btn-light" data-close>Позже</button><button class="btn btn-primary" data-ok>Продлить</button>' : '<button class="btn btn-light" data-close>Позже</button><a class="btn btn-primary" href="#/store?for=' + p.id + '" data-close>Выбрать пакет</a>',
      after: function (b) { var ok = $('[data-ok]', b); if (ok) ok.onclick = function () { closeSheet(); S.me.chatsLeft--; ch.limit += C.economy.msgsPerChat; ch.messages.push({ from: 'sys', text: 'Чат продлён · +' + C.economy.msgsPerChat + ' сообщений', day: 'Сегодня' }); toast('Чат продлён'); render(); }; } });
  }
  function guestGate(then) {
    openSheet({ title: 'Представьтесь', body: '<p class="muted small" style="margin-bottom:14px">Чтобы отправлять симпатии и писать, нужен профиль: имя, возраст и одно фото. Это займёт минуту.</p>' +
      '<label class="field"><span>Имя</span><input class="input" placeholder="Как к вам обращаться"></label><label class="field"><span>Возраст</span><input class="input" type="number" inputmode="numeric" placeholder="18–80"></label>' +
      '<div class="photo-drop">' + ic('camera') + 'Добавить фото<br><small>без фото анкета видна реже</small></div>',
      footer: '<button class="btn btn-light" data-close>Позже</button><button class="btn btn-primary" data-ok>Сохранить</button>',
      after: function (b) { $('[data-ok]', b).onclick = function () { closeSheet(); S.guest = false; toast('Профиль создан'); then && then(); }; } });
  }
  function giftPicker(p, onSend) {
    var sel = null;
    openSheet({ title: 'Подарок для ' + decl(p.name, 'd'), body: '<p class="muted small" style="margin-bottom:12px">Подарок появится в чате и в её анкете. Оплата с баланса (' + eur(S.me.balance) + ').</p><div class="gift-grid">' +
      C.gifts.map(function (g) { return '<button data-g="' + g.id + '"><img src="' + C.giftUrl(g.id) + '" alt="">' + esc(g.name) + '<span>' + eur(g.eur) + '</span></button>'; }).join('') + '</div><label class="field mt16"><span>Сообщение к подарку (необязательно)</span><input class="input" id="gift-msg" placeholder="Например: к какао"></label>',
      footer: '<button class="btn btn-light" data-close>Отмена</button><button class="btn btn-primary" data-ok disabled>Подарить</button>',
      after: function (b) {
        var ok = $('[data-ok]', b);
        $$('[data-g]', b).forEach(function (el) { el.onclick = function () { $$('[data-g]', b).forEach(function (x) { x.classList.remove('on'); }); el.classList.add('on'); sel = C.gifts.filter(function (g) { return g.id === +el.dataset.g; })[0]; ok.disabled = false; ok.textContent = 'Подарить за ' + eur(sel.eur); }; });
        ok.onclick = function () { if (!sel) return; if (S.me.balance < sel.eur) { closeSheet(); openTopup(sel.eur - S.me.balance); return; } S.me.balance -= sel.eur; var m = $('#gift-msg', b).value; closeSheet(); toast(sel.name + ' отправлен'); onSend(sel, m); };
      } });
  }
  function openTopup(need) {
    openSheet({ title: 'Пополнить баланс', body: (need ? '<div class="note amber">' + ic('info') + '<div>Не хватает ' + eur(need) + '. Баланс нужен для подарков и искр — чаты оплачиваются пакетами.</div></div>' : '<p class="muted small">Баланс нужен для подарков, искр и функций профиля.</p>') +
      '<div class="amts mt12">' + C.economy.topups.map(function (a, i) { return '<button data-a="' + a + '" class="' + (i === 1 ? 'on' : '') + '">€' + a + '</button>'; }).join('') + '</div><label class="field mt12"><span>Своя сумма</span><input class="input" id="tu-custom" inputmode="numeric" placeholder="€ ' + C.economy.customMin + '–' + C.economy.customMax + '"></label>',
      footer: '<button class="btn btn-light" data-close>Отмена</button><a class="btn btn-primary" href="#/checkout/topup:20" data-close id="tu-go">Пополнить на €20</a>',
      after: function (b) { var g = $('#tu-go', b); $$('[data-a]', b).forEach(function (el) { el.onclick = function () { $$('[data-a]', b).forEach(function (x) { x.classList.remove('on'); }); el.classList.add('on'); g.textContent = 'Пополнить на €' + el.dataset.a; g.href = '#/checkout/topup:' + el.dataset.a; }; });
        $('#tu-custom', b).oninput = function () { var v = Math.min(C.economy.customMax, Math.max(0, +this.value || 0)); $$('[data-a]', b).forEach(function (x) { x.classList.remove('on'); }); if (v >= C.economy.customMin) { g.textContent = 'Пополнить на €' + v; g.href = '#/checkout/topup:' + v; } }; } });
  }
  function reportSheet(p) {
    menuSheet([
      { icon: 'bell', label: S.follow[p.id] ? 'Не сообщать, когда онлайн' : 'Сообщить, когда онлайн', fn: function () { S.follow[p.id] = !S.follow[p.id]; toast(S.follow[p.id] ? 'Сообщим, когда ' + p.name + ' появится в сети' : 'Больше не следим'); } },
      { icon: 'share', label: 'Поделиться анкетой', fn: function () { toast('Ссылка скопирована'); } },
      { icon: 'flag', label: 'Пожаловаться', fn: function () { openSheet({ title: 'Пожаловаться', body: '<div class="menu">' + ['Спам или реклама', 'Оскорбления', 'Чужие фото', 'Мошенничество', 'Другое'].map(function (r) { return '<button data-r>' + ic('flag') + r + '</button>'; }).join('') + '</div>', after: function (b) { $$('[data-r]', b).forEach(function (el) { el.onclick = function () { closeSheet(); toast('Жалоба отправлена, спасибо'); }; }); } }); } },
      { icon: 'block', label: 'Заблокировать', danger: true, fn: function () { confirmDlg('Заблокировать ' + decl(p.name, 'a') + '?', 'Анкета исчезнет из поиска и чатов. Разблокировать можно в настройках.', 'Заблокировать', function () { S.blocked.push({ name: p.name + ', ' + p.age, date: 'Сегодня' }); S.passed[p.id] = 1; toast('Анкета заблокирована'); go('#/'); }, true); } }
    ]);
  }
  function doLike(p, silent) {
    if (S.guest) { guestGate(function () { doLike(p); }); return false; }
    S.liked[p.id] = 1;
    if (S.likes.incoming.indexOf(p.id) >= 0 && S.likes.mutual.indexOf(p.id) < 0) { S.likes.mutual.push(p.id); if (!silent) toast('Взаимная симпатия с ' + p.name + '!'); }
    else if (!silent) toast('Симпатия отправлена · ' + p.name);
    return true;
  }
  function doSpark(p) {
    if (S.me.sparks <= 0) { openSheet({ title: 'Искра', body: '<div class="note coral">' + ic('spark') + '<div><b>Искра</b> — анкета увидит вас первой в своих симпатиях и получит уведомление. Стоимость — ' + eur(C.economy.sparkPrice) + ' с баланса.</div></div><div class="mt12 muted small">Баланс: ' + eur(S.me.balance) + '</div>', footer: '<button class="btn btn-light" data-close>Отмена</button><button class="btn btn-primary" data-ok>Купить искру за ' + eur(C.economy.sparkPrice) + '</button>', after: function (b) { $('[data-ok]', b).onclick = function () { closeSheet(); if (S.me.balance < C.economy.sparkPrice) { openTopup(C.economy.sparkPrice - S.me.balance); return; } S.me.balance -= C.economy.sparkPrice; S.me.sparks++; toast('Искра куплена'); render(); }; } }); return false; }
    S.me.sparks--; S.sparked[p.id] = 1; S.liked[p.id] = 1; toast('Искра отправлена: ' + p.name + ' увидит вас первым'); return true;
  }

  /* ---------- колода ---------- */
  function deckList() {
    var f = S.filters, t = S.deckTab;
    var list = PROFILES.filter(function (p) { return !S.passed[p.id] && !S.liked[p.id] || t !== 'all' && !S.passed[p.id]; });
    list = PROFILES.filter(function (p) { if (S.passed[p.id]) return false; if (p.age < f.ageMin || p.age > f.ageMax) return false; if (f.city !== 'Все' && p.city !== f.city) return false; if (f.dist !== 'Везде' && p.dist > parseInt(f.dist, 10)) return false; if (f.online && !p.online) return false; if (f.fresh && !p.isNew) return false; return true; });
    if (t === 'online') list = list.filter(function (p) { return p.online; });
    if (t === 'new') list = list.filter(function (p) { return p.isNew; });
    if (t === 'near') list = list.slice().sort(function (a, b) { return a.dist - b.dist; });
    return list;
  }
  function filterCount() { var t = S.deckTab; S.deckTab = 'all'; var n = deckList().length; S.deckTab = t; return n; }
  function activeFilters() { var f = S.filters, n = 0; if (f.ageMin !== 18 || f.ageMax !== 35) n++; if (f.city !== 'Все') n++; if (f.dist !== 'Везде') n++; if (f.online) n++; if (f.fresh) n++; if (!f.photo) n++; return n; }
  function deckCardHtml(p, back) {
    var ph = S.deckPhoto[p.id] || 0;
    return '<article class="dcard' + (back ? ' back' : '') + '" data-id="' + p.id + '">' +
      '<img class="ph" src="' + p.photos[ph] + '" alt="' + esc(p.name) + '" draggable="false"><div class="grad-t"></div><div class="grad-b"></div>' +
      '<div class="segs">' + p.photos.map(function (_, i) { return '<i class="' + (i === ph ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="state' + (p.online ? '' : ' off') + '"><i></i>' + esc(presence(p)) + '</div>' +
      '<button class="info" data-info aria-label="Вся анкета">' + ic('info') + '</button>' +
      '<div class="stamp like">Да</div><div class="stamp nope">Нет</div>' +
      '<div class="dinfo"><div class="nm">' + esc(p.name) + ', ' + p.age + '</div><div class="loc">' + ic('pin') + esc(p.city) + ' · ' + p.dist + ' км от вас</div>' +
      '<div class="chips">' + p.interests.slice(0, 2).map(function (i) { return '<span class="chip glass">' + intIcon(i) + esc(i) + '</span>'; }).join('') + '<span class="chip glass">' + C.zodiacGlyph[p.zodiac] + ' ' + zodiacName(p.zodiac) + '</span></div></div></article>';
  }
  function deckHtml() {
    var list = deckList(), p = list[0], n = list[1];
    var tabs = [['all', 'Для вас'], ['online', 'Онлайн'], ['near', 'Рядом'], ['new', 'Новые']];
    var onlineN = PROFILES.filter(function (x) { return x.online && !S.passed[x.id]; }).length;
    return '<div class="tabs">' + tabs.map(function (t) { return '<button class="tab' + (S.deckTab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + (t[0] === 'online' ? '<i class="dot"></i>' : '') + t[1] + (t[0] === 'online' ? ' <span class="n">' + onlineN + '</span>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="deckwrap"><div class="deck" id="deck">' + (p ? (n ? deckCardHtml(n, true) : '') + deckCardHtml(p) :
        '<div class="deck-end"><div class="em">' + ic('sparkles') + '</div><b>Анкеты закончились</b><p>' + (activeFilters() ? 'Попробуйте расширить фильтры — так анкет будет больше.' : 'Вы посмотрели всех на сегодня. Новые анкеты появляются каждый день.') + '</p>' + (activeFilters() ? '<button class="btn btn-dark" data-reset-filters>Сбросить фильтры</button>' : '<button class="btn btn-dark" data-undo-all>Показать заново</button>') + '</div>') + '</div>' +
      (p ? '<div class="actions"><button class="act nope" data-act="nope" aria-label="Пропустить">' + ic('x') + '</button><button class="act spark" data-act="spark" aria-label="Искра">' + ic('spark') + '<i class="cnt" style="' + (S.me.sparks ? '' : 'visibility:hidden') + '">' + S.me.sparks + '</i></button><button class="act l" data-act="like" aria-label="Нравится">' + ic('heartf') + '</button><button class="act msg" data-act="msg" aria-label="Написать">' + ic('chat') + '</button></div>' : '') +
      '</div><div class="khint">← пропустить · → нравится · ↑ искра · Enter — написать · Backspace — вернуть</div>';
  }
  function profileBody(p, compact) {
    var cm = common(p), ph = S.deckPhoto[p.id] || 0;
    var facts = [['Цель', p.goal], ['Рост', p.height ? p.height + ' см' : '—'], ['Курение', p.smoke || 'Не указано'], ['Знак', C.zodiacGlyph[p.zodiac] + ' ' + zodiacName(p.zodiac)]];
    return (compact ? '<div class="row-between"><div><div style="font-size:26px;font-weight:800;letter-spacing:-.03em">' + esc(p.name) + ', ' + p.age + '</div><div class="muted small" style="display:flex;gap:6px;align-items:center;margin-top:4px">' + (p.online ? '<i class="online-dot"></i> В сети' : esc(presence(p))) + ' · ' + esc(p.city) + ' · ' + p.dist + ' км</div></div><button class="ibtn" data-more="' + p.id + '" aria-label="Ещё">' + ic('more') + '</button></div><div class="thumbs mt12">' + p.photos.map(function (s, i) { return '<button data-th="' + i + '" class="' + (i === ph ? 'on' : '') + '"><img src="' + s.replace('/800/', '/240/') + '" alt=""><span class="lk">' + ic('heartf') + (40 + i * 37 % 90) + '</span></button>'; }).join('') + '</div>' : '') +
      '<h2 class="sec">О себе</h2><p>' + esc(p.bio) + '</p>' +
      '<h2 class="sec">Коротко</h2><div class="facts">' + facts.map(function (f) { return '<div><span>' + f[0] + '</span><b>' + esc(f[1]) + '</b></div>'; }).join('') + '</div>' +
      '<h2 class="sec">Интересы' + (cm.length ? ' <span class="pill coral">' + cm.length + ' ' + plural(cm.length, 'общий', 'общих', 'общих') + '</span>' : '') + '</h2><div class="chips">' + p.interests.map(function (i) { return '<span class="chip' + (cm.indexOf(i) >= 0 ? ' match' : '') + '">' + intIcon(i) + esc(i) + '</span>'; }).join('') + '</div>' +
      '<h2 class="sec">Совместимость <span class="muted small" style="font-weight:600">' + compatAvg(p) + '% в среднем</span></h2>' + compatHtml(p) + '<p class="muted small mt8">' + esc(pairText(p)) + '</p>' +
      '<h2 class="sec">С чего начать</h2><div class="qcard"><small>Вопрос по её анкете</small><p>«' + esc(question(p)) + '»</p><button class="btn btn-block" data-ask="' + p.id + '">' + ic('send') + 'Отправить этот вопрос</button></div>' +
      '<h2 class="sec">Подарки</h2>' + (chatFor(p.id) && chatFor(p.id).messages.some(function (m) { return m.type === 'gift'; }) ? '<div class="giftstrip">' + chatFor(p.id).messages.filter(function (m) { return m.type === 'gift'; }).map(function (m) { var g = C.gifts.filter(function (x) { return x.id === m.gift; })[0]; return '<div><img src="' + C.giftUrl(g.id) + '" alt="">' + esc(g.name) + '</div>'; }).join('') + '</div>' : '<div class="note">' + ic('gift') + '<div>Подарков пока нет. Подарок виден в её анкете — к нему можно добавить сообщение.</div></div>') +
      '<div class="safety">Анкета приватна: распространение материалов и публикация переписки без согласия запрещены. Часть анкет ведут виртуальные собеседницы — подробнее в <a href="#/legal" style="text-decoration:underline">правилах</a>.</div>';
  }
  function wireProfileBody(root, p) {
    $$('[data-th]', root).forEach(function (el) { el.onclick = function () { S.deckPhoto[p.id] = +el.dataset.th; render(); }; });
    var mo = $('[data-more]', root); if (mo) mo.onclick = function () { reportSheet(p); };
    var ask = $('[data-ask]', root); if (ask) ask.onclick = function () { S.draft[p.id] = question(p); openChatWith(p); };
  }
  function wireDeck(root) {
    $$('[data-tab]', root).forEach(function (el) { el.onclick = function () { S.deckTab = el.dataset.tab; render(); }; });
    var rf = $('[data-reset-filters]', root); if (rf) rf.onclick = function () { S.filters = { ageMin: 18, ageMax: 35, city: 'Все', dist: 'Везде', online: false, photo: true, fresh: false }; S.deckTab = 'all'; render(); };
    var ua = $('[data-undo-all]', root); if (ua) ua.onclick = function () { S.passed = {}; render(); };
    var deck = $('#deck', root), top = $('.dcard:not(.back)', deck); if (!top) return;
    var p = byId[+top.dataset.id], backCard = $('.dcard.back', deck);
    function advance(dir) {
      top.classList.add(dir === 'nope' ? 'out-l' : 'out-r'); if (backCard) backCard.classList.add('rise');
      var ok = true;
      if (dir === 'like') ok = doLike(p); else if (dir === 'spark') ok = doSpark(p); else S.passed[p.id] = 1;
      if (!ok) { top.classList.remove('out-l', 'out-r'); if (backCard) backCard.classList.remove('rise'); return; }
      if (dir === 'like' || dir === 'spark') S.passed[p.id] = 1;
      hist.last = p.id; setTimeout(render, 320);
    }
    $$('[data-act]', root).forEach(function (el) { el.onclick = function () { var a = el.dataset.act; if (a === 'msg') { openChatWith(p); return; } advance(a); }; });
    $('[data-info]', top).onclick = function (e) { e.stopPropagation(); if (isDesktop()) { $('.disc .panel') && $('.disc .panel').scrollTo({ top: 0, behavior: 'smooth' }); } else go('#/profile/' + p.id); };
    function setPhoto(i) { var n = p.photos.length; i = (i + n) % n; S.deckPhoto[p.id] = i; $('img.ph', top).src = p.photos[i]; $$('.segs i', top).forEach(function (s, k) { s.classList.toggle('on', k === i); }); if (isDesktop()) { $$('.panel [data-th]').forEach(function (t, k) { t.classList.toggle('on', k === i); }); } }
    var sx = 0, sy = 0, dx = 0, dy = 0, drag = false, moved = false, sl = $('.stamp.like', top), sn = $('.stamp.nope', top);
    top.addEventListener('pointerdown', function (e) { if (e.target.closest('[data-info]')) return; drag = true; moved = false; sx = e.clientX; sy = e.clientY; dx = dy = 0; top.classList.add('drag'); top.setPointerCapture(e.pointerId); });
    top.addEventListener('pointermove', function (e) { if (!drag) return; dx = e.clientX - sx; dy = e.clientY - sy; if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true; top.style.transform = 'translate(' + dx + 'px,' + (dy * .2) + 'px) rotate(' + (dx / 16) + 'deg)'; sl.style.opacity = Math.max(0, Math.min(1, dx / 90)); sn.style.opacity = Math.max(0, Math.min(1, -dx / 90)); });
    function release(e) {
      if (!drag) return; drag = false; top.classList.remove('drag');
      if (!moved) { var r = top.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; top.style.transform = ''; if (y > .62) { if (!isDesktop()) go('#/profile/' + p.id); } else setPhoto((S.deckPhoto[p.id] || 0) + (x < .4 ? -1 : 1)); return; }
      if (Math.abs(dx) > 100) { advance(dx > 0 ? 'like' : 'nope'); } else { top.style.transform = ''; sl.style.opacity = 0; sn.style.opacity = 0; }
    }
    top.addEventListener('pointerup', release); top.addEventListener('pointercancel', release);
    document.onkeydown = function (e) { if ($('#sheet') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowLeft') advance('nope'); else if (e.key === 'ArrowRight') advance('like'); else if (e.key === 'ArrowUp') advance('spark'); else if (e.key === 'Enter') openChatWith(p); else if (e.key === 'Backspace' && hist.last) { delete S.passed[hist.last]; delete S.liked[hist.last]; hist.last = null; render(); } };
  }
  function filtersSheet() {
    var f = JSON.parse(JSON.stringify(S.filters));
    function body() {
      return '<label class="field"><span>Возраст: ' + f.ageMin + '–' + f.ageMax + '</span><div class="range-wrap"><input type="range" min="18" max="60" value="' + f.ageMin + '" data-f="ageMin"><input type="range" min="18" max="60" value="' + f.ageMax + '" data-f="ageMax"></div></label>' +
        '<div class="field"><span>Город</span><div class="chips">' + ['Все'].concat(C.cities.slice(1, 6)).map(function (c) { return '<button class="chip' + (f.city === c ? ' on' : '') + '" data-city="' + c + '">' + c + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><span>Расстояние</span><div class="chips">' + ['5 км', '25 км', '100 км', 'Везде'].map(function (c) { return '<button class="chip' + (f.dist === c ? ' on' : '') + '" data-dist="' + c + '">' + c + '</button>'; }).join('') + '</div></div>' +
        '<div class="setgroup"><div class="setrow"><div class="tx"><b>Только в сети</b><span>Ответят быстрее</span></div>' + toggle(f.online, 'data-t="online"') + '</div><div class="setrow"><div class="tx"><b>Только с фото</b></div>' + toggle(f.photo, 'data-t="photo"') + '</div><div class="setrow"><div class="tx"><b>Новые анкеты</b><span>Появились за последние 3 дня</span></div>' + toggle(f.fresh, 'data-t="fresh"') + '</div></div>';
    }
    function count() { var s = S.filters; S.filters = f; var t = S.deckTab; S.deckTab = 'all'; var n = deckList().length; S.deckTab = t; S.filters = s; return n; }
    var b = openSheet({ title: 'Фильтры', body: body(), footer: '<button class="btn btn-light" data-reset>Сбросить</button><button class="btn btn-dark" data-apply>Показать ' + count() + ' ' + plural(count(), 'анкету', 'анкеты', 'анкет') + '</button>', after: wire });
    function wire(b) {
      function refresh() { $('.sb', b).innerHTML = body(); wireInner(); var n = count(); $('[data-apply]', b).textContent = 'Показать ' + n + ' ' + plural(n, 'анкету', 'анкеты', 'анкет'); }
      function wireInner() {
        $$('[data-f]', b).forEach(function (el) { el.oninput = function () { f[el.dataset.f] = +el.value; if (f.ageMin > f.ageMax) { if (el.dataset.f === 'ageMin') f.ageMax = f.ageMin; else f.ageMin = f.ageMax; } $('.field span', b).textContent = 'Возраст: ' + f.ageMin + '–' + f.ageMax; var n = count(); $('[data-apply]', b).textContent = 'Показать ' + n + ' ' + plural(n, 'анкету', 'анкеты', 'анкет'); }; });
        $$('[data-city]', b).forEach(function (el) { el.onclick = function () { f.city = el.dataset.city; refresh(); }; });
        $$('[data-dist]', b).forEach(function (el) { el.onclick = function () { f.dist = el.dataset.dist; refresh(); }; });
        $$('[data-t]', b).forEach(function (el) { el.onclick = function () { f[el.dataset.t] = !f[el.dataset.t]; refresh(); }; });
      }
      wireInner();
      $('[data-reset]', b).onclick = function () { f = { ageMin: 18, ageMax: 35, city: 'Все', dist: 'Везде', online: false, photo: true, fresh: false }; refresh(); };
      $('[data-apply]', b).onclick = function () { S.filters = f; closeSheet(); render(); };
    }
  }

  /* ---------- views ---------- */
  var V = {};
  V.discover = function () {
    var p = deckList()[0];
    var right = '<button class="ibtn" data-filters aria-label="Фильтры">' + ic('filter') + (activeFilters() ? '<i class="dot"></i>' : '') + '</button>';
    return { nav: '#/', cls: 'fill flush', topbar: '<div class="topbar">' + logo() + balancePill() + right + '</div>',
      body: '<div class="disc"><div class="dcol"><div class="vis-d row-between" style="margin-bottom:12px"><div class="muted small">' + deckList().length + ' ' + plural(deckList().length, 'анкета', 'анкеты', 'анкет') + ' по вашим фильтрам</div><button class="btn btn-light btn-sm" data-filters>' + ic('filter') + 'Фильтры' + (activeFilters() ? ' · ' + activeFilters() : '') + '</button></div>' + deckHtml() + '</div>' +
        '<div class="panel vis-d">' + (p ? '<div class="pbody" id="panel-body">' + profileBody(p, true) + '<div class="stickybar"><button class="hrt' + (S.liked[p.id] ? ' on' : '') + '" data-plike aria-label="Нравится">' + ic('heartf') + '</button><button class="btn btn-primary btn-lg cta" data-pmsg>' + ic('chat') + 'Написать' + (chatFor(p.id) ? '' : ' · 1 чат') + '</button><button class="ibtn" style="width:56px;height:56px" data-pgift aria-label="Подарок">' + ic('gift') + '</button></div></div>' : '<div class="chat-empty"><div class="em">' + ic('sparkles') + '</div><b>Анкеты закончились</b>Расширьте фильтры или загляните позже.</div>') + '</div></div>',
      after: function (root) {
        wireDeck(root); $$('[data-filters]', root).forEach(function (el) { el.onclick = filtersSheet; });
        if (p) { var pb = $('#panel-body', root); if (pb) { wireProfileBody(pb, p); $('[data-plike]', pb).onclick = function () { if (doLike(p)) { this.classList.add('on', 'pop'); } }; $('[data-pmsg]', pb).onclick = function () { openChatWith(p); }; $('[data-pgift]', pb).onclick = function () { giftPicker(p, function (g, m) { var ch = chatFor(p.id); if (!ch) { openChatWith(p); return; } ch.messages.push({ from: 'me', type: 'gift', gift: g.id, text: m, t: now(), day: 'Сегодня' }); }); }; } }
      } };
  };
  V.profile = function (id) {
    var p = byId[+id]; if (!p) return V.notfound();
    var ph = S.deckPhoto[p.id] || 0;
    var gal = '<div class="gal" id="gal"><img src="' + p.photos[ph] + '" alt="' + esc(p.name) + '"><div class="grad-t"></div><div class="grad-b"></div><div class="segs">' + p.photos.map(function (_, i) { return '<i class="' + (i === ph ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="bar"><button class="ibtn" data-back="#/" aria-label="Назад">' + ic('back') + '</button><span class="sp"></span><button class="ibtn" data-share aria-label="Поделиться">' + ic('share') + '</button><button class="ibtn" data-more="' + p.id + '" aria-label="Ещё">' + ic('more') + '</button></div>' +
      '<div class="tapzones"><button data-pv aria-label="Предыдущее фото"></button><button data-nx aria-label="Следующее фото"></button></div>' +
      '<div class="state' + (p.online ? '' : ' off') + '"><i></i>' + esc(presence(p)) + '</div><div class="nm"><b>' + esc(p.name) + ', ' + p.age + '</b><span>' + ic('pin') + esc(p.city) + ' · ' + p.dist + ' км от вас · ' + (ph + 1) + '/' + p.photos.length + '</span></div></div>';
    var sticky = '<div class="stickybar"><button class="hrt' + (S.liked[p.id] ? ' on' : '') + '" data-plike aria-label="Нравится">' + ic('heartf') + '</button><button class="btn btn-primary btn-lg cta" data-pmsg>' + ic('chat') + (chatFor(p.id) ? 'Открыть чат' : 'Написать · 1 чат') + '</button><button class="ibtn" style="width:56px;height:56px" data-pgift aria-label="Подарок">' + ic('gift') + '</button></div>';
    return { nav: null, cls: 'flush no-nav', topbar: '', body: '<div class="prof">' + gal + '<div class="pbody" id="pbody"><div class="vis-d"><div class="row-between"><div><div style="font-size:30px;font-weight:800;letter-spacing:-.03em">' + esc(p.name) + ', ' + p.age + '</div><div class="muted" style="display:flex;gap:6px;align-items:center;margin-top:4px">' + (p.online ? '<i class="online-dot"></i> В сети' : esc(presence(p))) + ' · ' + esc(p.city) + ' · ' + p.dist + ' км от вас</div></div></div><div class="thumbs mt16">' + p.photos.map(function (s, i) { return '<button data-th="' + i + '" class="' + (i === ph ? 'on' : '') + '"><img src="' + s.replace('/800/', '/240/') + '" alt=""><span class="lk">' + ic('heartf') + (40 + i * 37 % 90) + '</span></button>'; }).join('') + '</div>' + sticky + '</div>' + profileBody(p, false) + '</div></div>' + '<div class="vis-m">' + sticky + '</div>',
      after: function (root) {
        wireProfileBody(root, p);
        function setPhoto(i) { var n = p.photos.length; S.deckPhoto[p.id] = (i + n) % n; render(); }
        $('[data-pv]', root).onclick = function () { setPhoto(ph - 1); }; $('[data-nx]', root).onclick = function () { setPhoto(ph + 1); };
        $$('[data-plike]', root).forEach(function (el) { el.onclick = function () { if (doLike(p)) { $$('[data-plike]', root).forEach(function (x) { x.classList.add('on', 'pop'); }); } }; });
        $$('[data-pmsg]', root).forEach(function (el) { el.onclick = function () { openChatWith(p); }; });
        $$('[data-pgift]', root).forEach(function (el) { el.onclick = function () { giftPicker(p, function (g, m) { var ch = chatFor(p.id); if (ch) ch.messages.push({ from: 'me', type: 'gift', gift: g.id, text: m, t: now(), day: 'Сегодня' }); }); }; });
        $('[data-share]', root).onclick = function () { toast('Ссылка на анкету скопирована'); };
        var g = $('#gal', root), x0 = 0; g.addEventListener('pointerdown', function (e) { x0 = e.clientX; }); g.addEventListener('pointerup', function (e) { var d = e.clientX - x0; if (Math.abs(d) > 50) setPhoto(ph + (d < 0 ? 1 : -1)); });
      } };
  };
  V.likes = function () {
    var tabs = [['in', 'Вам понравились', S.likes.incoming.length], ['out', 'Ваши лайки', Object.keys(S.liked).length], ['mutual', 'Взаимно', S.likes.mutual.length]];
    var ids = S.likesTab === 'in' ? S.likes.incoming : S.likesTab === 'out' ? Object.keys(S.liked).map(Number) : S.likes.mutual;
    var list = ids.map(function (i) { return byId[i]; }).filter(Boolean);
    var cards = list.map(function (p) { var mutual = S.likes.mutual.indexOf(p.id) >= 0; return '<a class="pcard" href="#/profile/' + p.id + '"><img src="' + p.photos[0] + '" alt=""><div class="g"></div>' + (p.online ? '<span class="st"><i></i>в сети</span>' : '') + (mutual ? '<span class="tag">Взаимно</span>' : S.sparked[p.id] ? '<span class="tag navy">Искра</span>' : '') + '<div class="t"><b>' + esc(p.name) + ', ' + p.age + '</b><span>' + esc(p.city) + ' · ' + compatAvg(p) + '% совместимость</span></div><button class="act2" data-quick="' + p.id + '" aria-label="Написать">' + ic('chat') + '</button></a>'; }).join('');
    var emptyTxt = { in: ['Пока никто не поставил лайк', 'Заполните профиль и добавьте фото — анкеты с фото получают в 3 раза больше симпатий.', '<a class="btn btn-dark" href="#/me/edit">Заполнить профиль</a>'], out: ['Вы ещё никому не поставили лайк', 'Листайте анкеты в поиске — лайк бесплатный.', '<a class="btn btn-dark" href="#/">К анкетам</a>'], mutual: ['Взаимных симпатий пока нет', 'Ответьте на входящие лайки — при взаимности откроется чат.', '<button class="btn btn-dark" data-lt="in">Входящие лайки</button>'] }[S.likesTab];
    return { nav: '#/likes', topbar: tbRoot('Симпатии', balancePill()), body: '<div class="wrap">' + pageHead('Симпатии', 'Кто вам понравился и кому понравились вы') +
      '<div class="tabs">' + tabs.map(function (t) { return '<button class="tab' + (S.likesTab === t[0] ? ' on' : '') + '" data-lt="' + t[0] + '">' + t[1] + (t[2] ? ' <span class="n">' + t[2] + '</span>' : '') + '</button>'; }).join('') + '</div>' +
      (S.likesTab === 'in' && list.length ? '<div class="note coral" style="margin-bottom:12px">' + ic('heartf') + '<div>Ответьте взаимностью — чат с такой анкетой открывается как обычно, из пакета, но она уже ждёт вашего сообщения.</div></div>' : '') +
      (list.length ? '<div class="grid2">' + cards + '</div>' : empty('heart', emptyTxt[0], emptyTxt[1], emptyTxt[2])) + '</div>',
      after: function (root) { $$('[data-lt]', root).forEach(function (el) { el.onclick = function () { S.likesTab = el.dataset.lt; render(); }; }); $$('[data-quick]', root).forEach(function (el) { el.onclick = function (e) { e.preventDefault(); openChatWith(byId[+el.dataset.quick]); }; }); } };
  };
  function now() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function lastMsg(ch) { var m = ch.messages[ch.messages.length - 1]; if (!m) return ''; if (m.from === 'sys') return m.text; var pre = m.from === 'me' ? 'Вы: ' : ''; return pre + (m.type === 'photo' ? '📷 Фото' : m.type === 'voice' ? '🎤 Голосовое · 0:' + ('0' + m.dur).slice(-2) : m.type === 'sticker' ? 'Стикер ' + m.text : m.type === 'gift' ? '🎁 Подарок' : m.text); }
  function chatListHtml(activeId) {
    var list = S.chats.slice(); if (S.chatsTab === 'unread') list = list.filter(function (c) { return c.unread; }); if (S.chatsTab === 'online') list = list.filter(function (c) { return byId[c.pid].online; });
    var suggestions = PROFILES.filter(function (p) { return p.online && !chatFor(p.id); });
    return '<div class="tabs">' + [['all', 'Все'], ['unread', 'Непрочитанные'], ['online', 'В сети']].map(function (t) { return '<button class="tab' + (S.chatsTab === t[0] ? ' on' : '') + '" data-ct="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (list.length ? '<div class="list">' + list.map(function (c) { var p = byId[c.pid], m = c.messages[c.messages.length - 1]; return '<a class="chatrow' + (c.unread ? ' unread' : '') + (c.id === activeId ? ' on' : '') + '" href="#/chat/' + c.id + '">' + avatar(p) + '<div class="tx"><div class="l1"><b>' + esc(p.name) + ', ' + p.age + '</b><span>' + (m.day === 'Сегодня' ? m.t || '' : m.day) + '</span></div><div class="l2"><p>' + esc(lastMsg(c)) + '</p>' + (c.unread ? '<span class="n">' + c.unread + '</span>' : c.used >= c.limit ? '<span class="ex">лимит</span>' : '') + '</div></div></a>'; }).join('') + '</div>' : empty('chat', 'Здесь пусто', S.chatsTab === 'all' ? 'Напишите кому-нибудь из поиска — первый чат откроется из пакета.' : 'Нет чатов в этом фильтре.', '<a class="btn btn-dark" href="#/">К анкетам</a>')) +
      (suggestions.length ? '<h2 class="sec">Сейчас в сети <a href="#/?tab=online">Все</a></h2><div class="faces">' + suggestions.map(function (p) { return '<button data-sug="' + p.id + '">' + avatar(p, 'ring') + esc(p.name) + '</button>'; }).join('') + '</div>' : '');
  }
  function wireChatList(root) { $$('[data-ct]', root).forEach(function (el) { el.onclick = function () { S.chatsTab = el.dataset.ct; render(); }; }); $$('[data-sug]', root).forEach(function (el) { el.onclick = function () { openChatWith(byId[+el.dataset.sug]); }; }); }
  V.chats = function () {
    if (isDesktop()) { var first = S.chats[0]; return V.chat(first ? first.id : null, true); }
    return { nav: '#/chats', topbar: tbRoot('Чаты', '<a class="ibtn" href="#/search" aria-label="Поиск">' + ic('search') + '</a>'), body: chatListHtml(), after: wireChatList };
  };
  function msgHtml(m, p) {
    if (m.from === 'sys') return '<div class="sys">' + esc(m.text) + '</div>';
    var cls = 'msg ' + (m.from === 'me' ? 'me' : 'her') + (m.pending ? ' pending' : '');
    if (m.type === 'photo') return '<div class="' + cls + ' photo"><img src="' + (m.from === 'me' ? m.src : p.photos[m.src] || p.photos[0]) + '" data-view alt="">' + (m.text ? '<p>' + esc(m.text) + '</p>' : '') + '<span class="t" style="padding:0 10px 4px">' + m.t + '</span></div>';
    if (m.type === 'sticker') return '<div class="' + cls + ' sticker">' + m.text + '</div>';
    if (m.type === 'voice') { var bars = ''; for (var i = 0; i < 28; i++) bars += '<i style="height:' + (20 + Math.round(Math.abs(Math.sin(i * 1.7 + m.dur)) * 80)) + '%"></i>'; return '<div class="' + cls + ' voice"><button class="pl" data-play aria-label="Слушать">' + ic('play') + '</button><div class="wave">' + bars + '</div><span class="dur">0:' + ('0' + m.dur).slice(-2) + '</span></div>'; }
    if (m.type === 'gift') { var g = C.gifts.filter(function (x) { return x.id === m.gift; })[0]; return '<div class="' + cls + ' gift"><img src="' + C.giftUrl(g.id) + '" alt=""><div><b>' + esc(g.name) + '</b><small>' + (m.text ? esc(m.text) : 'Подарок') + ' · ' + m.t + '</small></div></div>'; }
    return '<div class="' + cls + '">' + esc(m.text) + '<span class="t">' + m.t + (m.from === 'me' ? ' ✓✓' : '') + '</span></div>';
  }
  function threadHtml(ch) {
    var p = byId[ch.pid], day = null, out = '';
    ch.messages.forEach(function (m) { if (m.day !== day) { day = m.day; out += '<div class="dsep">' + esc(day) + '</div>'; } out += msgHtml(m, p); });
    var left = ch.limit - ch.used, warn = left <= 3;
    var hints = C.hints[p.id] || ['Расскажи, как прошёл день?', 'Что бы ты делала в идеальный выходной?'];
    var composer = left > 0 ?
      '<div class="hints"><span class="lab">' + ic('sparkles') + 'Подсказки</span>' + hints.map(function (h) { return '<button class="h" data-hint="' + esc(h) + '">' + esc(h) + '</button>'; }).join('') + '</div>' +
      '<div class="attach hide" id="attach"><button data-at="photo">' + ic('camera') + 'Фото</button><button data-at="voice">' + ic('mic') + 'Голосовое</button><button data-at="gift">' + ic('gift') + 'Подарок</button><button data-at="sticker">' + ic('smile') + 'Стикер</button></div>' +
      '<div class="composer" id="composer"><button class="ibtn" data-plus aria-label="Вложение">' + ic('plus') + '</button><div class="inp"><textarea id="ta" rows="1" placeholder="Сообщение…">' + esc(S.draft[p.id] || '') + '</textarea><button class="ibtn ghost" data-at="sticker" aria-label="Стикеры">' + ic('smile') + '</button></div><button class="send" id="send" aria-label="Отправить" ' + (S.draft[p.id] ? '' : 'disabled') + '>' + ic('send') + '</button></div>' :
      '<div class="paywall"><div class="row-between"><div><b>Сообщения в этом чате закончились</b><div class="muted small">Продлите чат — +' + C.economy.msgsPerChat + ' сообщений, история сохранится.</div></div></div><button class="btn btn-primary btn-block mt12" data-extend>Продлить чат' + (S.me.chatsLeft ? ' · 1 из пакета (' + S.me.chatsLeft + ')' : ' · от €7') + '</button></div>';
    return '<div class="chat"><div class="chat-head"><button class="ibtn ghost vis-m" data-back="#/chats" aria-label="Назад">' + ic('back') + '</button><a class="who" href="#/profile/' + p.id + '">' + avatar(p, 'sm') + '<div><b>' + esc(p.name) + ', ' + p.age + '</b><span class="' + (p.online ? 'on' : '') + '">' + esc(presence(p)) + '</span></div></a><button class="ibtn ghost" data-cgift aria-label="Подарок">' + ic('gift') + '</button><button class="ibtn ghost" data-cmore aria-label="Ещё">' + ic('more') + '</button></div>' +
      '<div class="meter' + (warn ? ' warn' : '') + '"><span>Ваши сообщения: <b>' + ch.used + ' из ' + ch.limit + '</b></span><div class="progress ' + (warn ? '' : 'navy') + '"><i style="width:' + Math.min(100, ch.used / ch.limit * 100) + '%"></i></div><button data-extend>Продлить</button></div>' +
      '<div class="msgs" id="msgs">' + out + '</div>' + composer + '</div>';
  }
  function wireThread(root, ch) {
    var p = byId[ch.pid]; ch.unread = 0; S.openChat = ch.id;
    var msgs = $('#msgs', root); if (msgs) msgs.scrollTop = msgs.scrollHeight;
    $$('[data-extend]', root).forEach(function (el) { el.onclick = function () { extendChat(ch); }; });
    $('[data-cgift]', root).onclick = function () { giftPicker(p, function (g, m) { ch.messages.push({ from: 'me', type: 'gift', gift: g.id, text: m, t: now(), day: 'Сегодня' }); render(); reply(ch, 'Ой, спасибо! ' + (m ? '«' + m + '» — ' : '') + 'приятно 🥰'); }); };
    $('[data-cmore]', root).onclick = function () { menuSheet([{ icon: 'user', label: 'Открыть анкету', fn: function () { go('#/profile/' + p.id); } }, { icon: 'bell', label: 'Отключить уведомления', fn: function () { toast('Уведомления от ' + p.name + ' отключены'); } }, { icon: 'flag', label: 'Пожаловаться', fn: function () { toast('Жалоба отправлена'); } }, { icon: 'block', label: 'Заблокировать', danger: true, fn: function () { confirmDlg('Заблокировать ' + decl(p.name, 'a') + '?', 'Чат будет скрыт, анкета исчезнет из поиска.', 'Заблокировать', function () { S.chats = S.chats.filter(function (c) { return c !== ch; }); S.blocked.push({ name: p.name + ', ' + p.age, date: 'Сегодня' }); toast('Заблокировано'); go('#/chats'); }, true); } }]); };
    $$('[data-play]', root).forEach(function (el) { el.onclick = function () { el.innerHTML = ic('pause'); setTimeout(function () { el.innerHTML = ic('play'); }, 1500); }; });
    $$('[data-view]', root).forEach(function (el) { el.onclick = function () { var v = document.createElement('div'); v.className = 'viewer'; v.innerHTML = '<img src="' + el.src + '" alt=""><div class="vb"><span></span><button class="ibtn" aria-label="Закрыть">' + ic('x') + '</button></div>'; v.onclick = function () { v.remove(); }; document.body.appendChild(v); }; });
    var ta = $('#ta', root), send = $('#send', root); if (!ta) return;
    function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; send.disabled = !ta.value.trim(); }
    ta.oninput = grow; grow();
    ta.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && isDesktop()) { e.preventDefault(); doSend(); } };
    function doSend() { var t = ta.value.trim(); if (!t) return; delete S.draft[p.id]; ch.messages.push({ from: 'me', type: 'text', text: t, t: now(), day: 'Сегодня' }); ch.used++; render(); reply(ch); }
    send.onclick = doSend;
    $$('[data-hint]', root).forEach(function (el) { el.onclick = function () { ta.value = el.dataset.hint; grow(); ta.focus(); }; });
    $('[data-plus]', root).onclick = function () { $('#attach', root).classList.toggle('hide'); };
    $$('[data-at]', root).forEach(function (el) { el.onclick = function () {
      var a = el.dataset.at;
      if (a === 'sticker') stickerSheet(function (s) { ch.messages.push({ from: 'me', type: 'sticker', text: s, t: now(), day: 'Сегодня' }); ch.used++; render(); reply(ch, ['😏', '🥰', '😘'][ch.used % 3]); });
      if (a === 'gift') giftPicker(p, function (g, m) { ch.messages.push({ from: 'me', type: 'gift', gift: g.id, text: m, t: now(), day: 'Сегодня' }); render(); reply(ch, 'Спасибо за подарок! 🥰'); });
      if (a === 'photo') { confirmDlg('Отправить фото?', 'Фото из галереи увидит только собеседница. Отправка фото считается как одно сообщение.', 'Отправить', function () { ch.messages.push({ from: 'me', type: 'photo', src: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FF7A3D"/><stop offset="1" stop-color="#0F1433"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/><text x="200" y="260" font-family="sans-serif" font-size="28" fill="#fff" text-anchor="middle">Ваше фото</text></svg>'), text: 'Обещанное ризотто', t: now(), day: 'Сегодня' }); ch.used++; render(); reply(ch, 'Выглядит вкусно. Засчитано 😏'); }); }
      if (a === 'voice') { var c = $('#composer', root); c.innerHTML = '<div class="rec">' + ic('mic') + '</div><div class="inp" style="padding:0 14px"><span id="rec-t" style="font-variant-numeric:tabular-nums;font-weight:700">0:00</span><span class="muted small" style="margin-left:10px">Запись… отпустите, чтобы отправить</span></div><button class="ibtn" data-rec-cancel aria-label="Отмена">' + ic('x') + '</button><button class="send" data-rec-send aria-label="Отправить">' + ic('send') + '</button>'; var s = 0, iv = setInterval(function () { s++; $('#rec-t', c).textContent = '0:' + ('0' + s).slice(-2); }, 1000); $('[data-rec-cancel]', c).onclick = function () { clearInterval(iv); render(); }; $('[data-rec-send]', c).onclick = function () { clearInterval(iv); ch.messages.push({ from: 'me', type: 'voice', dur: Math.max(1, s), t: now(), day: 'Сегодня' }); ch.used++; render(); reply(ch, 'Голос приятный. Продолжай 😊'); }; }
    }; });
  }
  var replies = ['Хм, интересно. А дальше?', 'Мне нравится, как ты пишешь', 'Ты меня заинтриговал', 'Ладно, засчитано 😏', 'Расскажи подробнее — я никуда не тороплюсь'];
  function reply(ch, text) { setTimeout(function () { var m = { from: 'her', type: 'text', text: text || replies[ch.messages.length % replies.length], t: now(), day: 'Сегодня' }; ch.messages.push(m); var msgs = $('#msgs'); if (msgs && S.openChat === ch.id) { msgs.insertAdjacentHTML('beforeend', msgHtml(m, byId[ch.pid])); msgs.scrollTop = msgs.scrollHeight; } else { ch.unread++; toast(byId[ch.pid].name + ': ' + m.text); if (!$('[data-rec-send]')) render(); } }, 1600); }
  function stickerSheet(onPick) {
    openSheet({ title: 'Стикеры', body: C.stickers.map(function (pk) { var unlocked = S.stickerPacks[pk.id]; return '<h2 class="sec" style="margin-top:8px">' + pk.name + (pk.locked && !unlocked ? ' <span class="pill amber">' + eur(pk.eur) + '</span>' : '') + '</h2><div class="' + (pk.locked && !unlocked ? 'stk-lock' : '') + '"><div class="stk-grid">' + pk.items.map(function (s) { return '<button data-s="' + s + '">' + s + '</button>'; }).join('') + '</div>' + (pk.locked && !unlocked ? '<div class="ov"><button class="btn btn-dark btn-sm" data-unlock="' + pk.id + '">' + ic('lock') + 'Открыть пак за ' + eur(pk.eur) + '</button></div>' : '') + '</div>'; }).join(''),
      after: function (b) { $$('[data-s]', b).forEach(function (el) { el.onclick = function () { closeSheet(); onPick(el.dataset.s); }; }); $$('[data-unlock]', b).forEach(function (el) { el.onclick = function () { var pk = C.stickers.filter(function (x) { return x.id === el.dataset.unlock; })[0]; if (S.me.balance < pk.eur) { closeSheet(); openTopup(pk.eur - S.me.balance); return; } S.me.balance -= pk.eur; S.stickerPacks[pk.id] = true; toast('Пак открыт'); stickerSheet(onPick); }; }); } });
  }
  V.chat = function (id, fromList) {
    var ch = null; S.chats.forEach(function (c) { if (c.id === id) ch = c; });
    if (!ch && !fromList) return V.notfound();
    var p = ch ? byId[ch.pid] : null;
    if (isDesktop()) {
      var info = ch ? '<div class="cinfo"><img class="big" src="' + p.photos[0] + '" alt=""><div style="font-size:20px;font-weight:800;margin-top:12px">' + esc(p.name) + ', ' + p.age + '</div><div class="muted small">' + esc(p.city) + ' · ' + presence(p) + '</div><p class="small mt12">' + esc(p.bio) + '</p><div class="chips mt12">' + p.interests.map(function (i) { return '<span class="chip' + (common(p).indexOf(i) >= 0 ? ' match' : '') + '">' + intIcon(i) + esc(i) + '</span>'; }).join('') + '</div><div class="mt16">' + compatHtml(p) + '</div><a class="btn btn-light btn-block mt16" href="#/profile/' + p.id + '">Вся анкета</a></div>' : '<div class="cinfo"></div>';
      return { nav: '#/chats', cls: 'fill flush', topbar: '', body: '<div class="chats"><div class="clist"><div class="hd"><div class="row-between"><h1 class="page-h" style="margin:0">Чаты</h1><a class="ibtn" href="#/search" aria-label="Поиск">' + ic('search') + '</a></div></div><div class="sc" style="padding:0 20px 20px">' + chatListHtml(ch && ch.id) + '</div></div><div class="cthread">' + (ch ? threadHtml(ch) : '<div class="chat-empty"><div class="em">' + ic('chat') + '</div><b>Выберите чат</b>Или напишите кому-нибудь из поиска.</div>') + '</div>' + info + '</div>',
        after: function (root) { wireChatList(root); if (ch) wireThread(root, ch); } };
    }
    return { nav: null, cls: 'fill flush no-nav', topbar: '', body: threadHtml(ch), after: function (root) { wireThread(root, ch); } };
  };
  V.notifications = function () {
    var kinds = [['all', 'Все'], ['msg', 'Сообщения'], ['like', 'Лайки'], ['view', 'Гости'], ['online', 'В сети']];
    var list = S.notifs.filter(function (n) { return S.notifTab === 'all' || n.kind === S.notifTab; });
    var day = null, out = '';
    list.forEach(function (n) { var p = n.pid ? byId[n.pid] : null; if (n.day !== day) { day = n.day; out += '<h2 class="sec">' + day + '</h2><div class="list">'; } var kic = { like: 'heartf', msg: 'chat', view: 'eye', online: 'zap', promo: 'star' }[n.kind]; out += '<a class="nrow' + (n.unread ? ' unread' : '') + '" href="' + (n.kind === 'msg' ? '#/chat/' + (chatFor(n.pid) || { id: '' }).id : n.kind === 'promo' ? '#/store' : '#/profile/' + n.pid) + '">' + (p ? '<div class="avatar" style="background-image:url(' + p.thumb + ')"><i class="k ' + n.kind + '">' + ic(kic) + '</i></div>' : '<div class="avatar navy">' + ic('star') + '</div>') + '<div class="tx"><b>' + esc(n.text) + '</b><p>' + esc(n.sub) + '</p></div><span class="tm">' + n.time + '</span></a>'; });
    if (out) out += '</div>'; var fixed = out.replace(/<\/div><h2 class="sec">/g, '</div><h2 class="sec">');
    return { nav: null, side: '#/notifications', topbar: tbBack('Уведомления', '<button class="ibtn" data-readall aria-label="Прочитать все">' + ic('check') + '</button>', '#/me'), body: '<div class="wrap">' + pageHead('Уведомления', 'Сообщения, лайки, гости и выход в сеть тех, за кем вы следите', '<button class="btn btn-light btn-sm" data-readall>' + ic('check') + 'Прочитать все</button>') +
      '<div class="tabs">' + kinds.map(function (k) { return '<button class="tab' + (S.notifTab === k[0] ? ' on' : '') + '" data-nt="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>' + (list.length ? fixed : empty('bell', 'Новых уведомлений нет', 'Здесь появятся сообщения, лайки, гости профиля и выход в сеть анкет, за которыми вы следите.')) +
      '<div class="note mt24">' + ic('gear') + '<div>Какие уведомления получать и когда — в <a href="#/settings/notifications" style="text-decoration:underline">настройках</a>. Тихие часы: ' + (S.settings.quiet ? S.settings.qFrom + '–' + S.settings.qTo : 'выключены') + '.</div></div></div>',
      after: function (root) { $$('[data-nt]', root).forEach(function (el) { el.onclick = function () { S.notifTab = el.dataset.nt; render(); }; }); $$('[data-readall]', root).forEach(function (el) { el.onclick = function () { S.notifs.forEach(function (n) { n.unread = false; }); toast('Все прочитано'); render(); }; }); } };
  };
  V.search = function (q) {
    q = (q || '').trim().toLowerCase();
    var res = q ? PROFILES.filter(function (p) { return (p.name + ' ' + p.city + ' ' + p.interests.join(' ')).toLowerCase().indexOf(q) >= 0; }) : [];
    return { nav: null, side: '#/', topbar: tbBack('Поиск', null, '#/'), body: '<div class="wrap">' + pageHead('Поиск по имени, городу или интересу') + '<div class="input-wrap">' + ic('search') + '<input class="input" id="q" placeholder="Имя, город или интерес" value="' + esc(q) + '" autofocus></div>' +
      (q ? (res.length ? '<h2 class="sec">Найдено ' + res.length + '</h2><div class="grid2">' + res.map(function (p) { return '<a class="pcard" href="#/profile/' + p.id + '"><img src="' + p.photos[0] + '" alt=""><div class="g"></div>' + (p.online ? '<span class="st"><i></i>в сети</span>' : '') + '<div class="t"><b>' + esc(p.name) + ', ' + p.age + '</b><span>' + esc(p.city) + ' · ' + esc(p.interests.join(', ')) + '</span></div></a>'; }).join('') + '</div>' : empty('search', 'Ничего не нашли', 'Попробуйте другой город или интерес.')) :
        '<h2 class="sec">Города</h2><div class="chips">' + C.cities.slice(1, 6).map(function (c) { return '<button class="chip" data-q="' + c + '">' + ic('pin') + c + '</button>'; }).join('') + '</div><h2 class="sec">Интересы</h2><div class="chips">' + C.interests.map(function (c) { return '<button class="chip" data-q="' + c + '">' + intIcon(c) + c + '</button>'; }).join('') + '</div><h2 class="sec">Сейчас в сети</h2><div class="faces">' + PROFILES.filter(function (p) { return p.online; }).map(function (p) { return '<a href="#/profile/' + p.id + '" style="flex:none;width:64px;text-align:center;font-size:12px;font-weight:600">' + avatar(p, 'ring') + esc(p.name) + '</a>'; }).join('') + '</div>') + '</div>',
      after: function (root) { var inp = $('#q', root); inp.oninput = function () { clearTimeout(inp._t); inp._t = setTimeout(function () { history.replaceState(null, '', '#/search?q=' + encodeURIComponent(inp.value)); render(); var i2 = $('#q'); i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); }, 350); }; $$('[data-q]', root).forEach(function (el) { el.onclick = function () { go('#/search?q=' + encodeURIComponent(el.dataset.q)); }; }); } };
  };
  function completeness() { var m = S.me, n = 0, miss = []; if (m.photos.length) n += 30; else miss.push('фото'); if (m.about) n += 20; else miss.push('о себе'); if (m.interests.length >= 3) n += 20; else miss.push('интересы'); if (m.city) n += 10; if (m.age) n += 10; if (m.status) n += 10; return { pct: n, miss: miss }; }
  V.me = function () {
    var c = completeness();
    return { nav: '#/me', topbar: tbRoot('Профиль', '<a class="ibtn" href="#/notifications" aria-label="Уведомления">' + ic('bell') + (unreadNotifs() ? '<i class="dot"></i>' : '') + '</a><a class="ibtn" href="#/settings" aria-label="Настройки">' + ic('gear') + '</a>'),
      body: '<div class="wrap">' + pageHead('Профиль', 'Так вас видят другие', '<a class="btn btn-light" href="#/me/edit">' + ic('edit') + 'Редактировать</a>') + '<div class="cols">' + '<div>' +
        '<div class="card pad-lg"><div class="mehead">' + avatar(null, 'xl') + '<div class="tx"><b>' + esc(S.me.name) + ', ' + S.me.age + '</b><span>' + esc(S.me.city) + ' · ' + C.zodiacGlyph[S.me.zodiac] + ' ' + zodiacName(S.me.zodiac) + '</span><span class="pill navy mt8">' + esc(S.me.status) + '</span></div></div>' +
        '<div class="kpi mt16"><div><b>' + S.me.likes + '</b><span>лайков</span></div><div><b>' + S.me.guests + '</b><span>гостей</span></div><div><b>' + S.chats.length + '</b><span>' + plural(S.chats.length, 'чат', 'чата', 'чатов') + '</span></div></div>' +
        '<a class="btn btn-light btn-block mt16 vis-m" href="#/me/edit">' + ic('edit') + 'Редактировать профиль</a></div>' +
        (c.pct < 100 ? '<div class="card amber"><div class="row-between"><b>Профиль заполнен на ' + c.pct + '%</b><a href="#/me/edit" class="b small" style="color:#B57A00">Дополнить</a></div><div class="progress mt8"><i style="width:' + c.pct + '%"></i></div><div class="small mt8" style="color:#8A5B00">Добавьте ' + c.miss.join(', ') + ' — такие анкеты получают больше ответов.</div></div>' : '') +
        '<h2 class="sec">Фото <a href="#/me/edit">Изменить</a></h2><div class="photogrid">' + (S.me.photos.length ? S.me.photos.map(function (s, i) { return '<div><img src="' + s + '" alt="">' + (i === 0 ? '<span class="main">Главное</span>' : '') + '</div>'; }).join('') : '') + '<a class="add" href="#/me/edit">' + ic('camera') + 'Добавить фото</a>' + (S.me.photos.length ? '' : '<div>Фото 2</div><div>Фото 3</div>') + '</div>' +
        '<h2 class="sec">О себе</h2><div class="card"><p>' + (S.me.about ? esc(S.me.about) : '<span class="muted">Расскажите о себе — пару честных строк работают лучше списка достоинств.</span>') + '</p><div class="chips mt12">' + S.me.interests.map(function (i) { return '<span class="chip">' + intIcon(i) + esc(i) + '</span>'; }).join('') + '</div></div></div>' +
        '<div>' + '<div class="wallet"><div class="lab">Чаты в пакете</div><div class="amt">' + S.me.chatsLeft + ' ' + plural(S.me.chatsLeft, 'чат', 'чата', 'чатов') + '</div><div class="sub"><div><b>' + eur(S.me.balance) + '</b><span>баланс</span></div><div><b>' + S.me.sparks + '</b><span>' + plural(S.me.sparks, 'искра', 'искры', 'искр') + '</span></div></div><div class="row2"><a class="btn" href="#/store">Пакеты чатов</a><a class="btn o" href="#/purchases">Покупки</a></div></div>' +
        '<div class="list mt12"><a class="row" href="#/notifications"><span class="ic coral">' + ic('bell') + '</span><div class="tx"><b>Уведомления</b><span>' + (unreadNotifs() ? unreadNotifs() + ' новых' : 'Нет новых') + '</span></div>' + ic('chev', 'chev') + '</a><a class="row" href="#/settings"><span class="ic navy">' + ic('gear') + '</span><div class="tx"><b>Настройки</b><span>Вход, уведомления, тема, язык</span></div>' + ic('chev', 'chev') + '</a><a class="row" href="#/settings/account"><span class="ic amber">' + ic('lock') + '</span><div class="tx"><b>Защита аккаунта</b><span>' + (S.me.email ? 'Email и пароль заданы' : 'Добавьте email, чтобы не потерять профиль') + '</span></div>' + ic('chev', 'chev') + '</a><a class="row" href="#/support"><span class="ic green">' + ic('help') + '</span><div class="tx"><b>Поддержка</b><span>Ответим в течение часа</span></div>' + ic('chev', 'chev') + '</a><a class="row" href="#/legal"><span class="ic">' + ic('shield') + '</span><div class="tx"><b>Правила и безопасность</b><span>Условия, конфиденциальность</span></div>' + ic('chev', 'chev') + '</a></div></div></div></div>' };
  };
  V.meEdit = function () {
    var m = S.me;
    return { nav: null, side: '#/me', topbar: tbBack('Редактировать', '<button class="btn btn-sm btn-dark" data-save>Сохранить</button>', '#/me'), body: '<div class="wrap">' + pageHead('Редактировать профиль', 'Изменения видны сразу', '<button class="btn btn-dark" data-save>Сохранить</button>') + '<div class="cols narrow"><div>' +
      '<h2 class="sec">Фото <span class="muted small" style="font-weight:600">до 6</span></h2><div class="photogrid">' + [0, 1, 2, 3, 4, 5].map(function (i) { return m.photos[i] ? '<div><img src="' + m.photos[i] + '" alt="">' + (i === 0 ? '<span class="main">Главное</span>' : '') + '</div>' : '<button class="add" data-addphoto>' + ic('plus') + (i === 0 ? 'Главное фото' : 'Добавить') + '</button>'; }).join('') + '</div><div class="hint">JPG, PNG или HEIC до 10 МБ. Лицо должно быть видно — такие анкеты смотрят чаще.</div>' +
      '<h2 class="sec">Основное</h2><div class="card"><label class="field"><span>Имя</span><input class="input" id="f-name" value="' + esc(m.name) + '"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="field"><span>Возраст</span><input class="input" id="f-age" type="number" min="18" max="80" value="' + m.age + '"></label><label class="field"><span>Город</span><select class="select" id="f-city">' + C.cities.map(function (c) { return '<option' + (c === m.city ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="field"><span>Статус на сегодня</span><select class="select" id="f-status">' + C.statuses.map(function (c) { return '<option' + (c === m.status ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label><label class="field" style="margin:0"><span>Знак зодиака</span><select class="select" id="f-z">' + C.zodiac.slice(1).map(function (z, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === m.zodiac ? ' selected' : '') + '>' + C.zodiacGlyph[i + 1] + ' ' + z + '</option>'; }).join('') + '</select></label></div>' +
      '<h2 class="sec">О себе</h2><div class="card"><textarea class="textarea" id="f-about" maxlength="300" placeholder="Пара честных строк: чем живёте, что цените, с чего начать разговор">' + esc(m.about) + '</textarea><div class="hint" id="f-cnt">' + m.about.length + ' / 300</div></div></div><div>' +
      '<h2 class="sec">Интересы <span class="muted small" style="font-weight:600">выберите 3–6</span></h2><div class="card"><div class="chips">' + C.interests.map(function (i) { return '<button class="chip' + (m.interests.indexOf(i) >= 0 ? ' on' : '') + '" data-int="' + i + '">' + intIcon(i) + i + '</button>'; }).join('') + '</div></div>' +
      '<h2 class="sec">Кого ищете</h2><div class="card"><div class="sexpick"><button class="on">Девушку</button><button>Парня</button></div><label class="field mt12" style="margin-bottom:0"><span>Цель</span><select class="select">' + C.goals.map(function (g) { return '<option>' + g + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="note mt16">' + ic('eye') + '<div>Всё, что вы заполняете, видят собеседницы. Email и телефон никогда не показываются.</div></div></div></div></div>',
      after: function (root) {
        $$('[data-int]', root).forEach(function (el) { el.onclick = function () { el.classList.toggle('on'); }; });
        $('#f-about', root).oninput = function () { $('#f-cnt', root).textContent = this.value.length + ' / 300'; };
        $$('[data-addphoto]', root).forEach(function (el) { el.onclick = function () { toast('В прототипе загрузка не работает'); }; });
        $$('[data-save]', root).forEach(function (el) { el.onclick = function () { m.name = $('#f-name', root).value || m.name; m.age = +$('#f-age', root).value || m.age; m.city = $('#f-city', root).value; m.status = $('#f-status', root).value; m.zodiac = +$('#f-z', root).value; m.about = $('#f-about', root).value; m.interests = $$('[data-int].on', root).map(function (x) { return x.dataset.int; }); toast('Сохранено'); go('#/me'); }; });
      } };
  };
  V.store = function (q) {
    var forId = q && q.get('for'), fp = forId ? byId[+forId] : null, e = C.economy;
    return { nav: '#/me', side: '#/store', topbar: tbBack('Пакеты и баланс', '<a class="ibtn" href="#/purchases" aria-label="История">' + ic('history') + '</a>', '#/me'), body: '<div class="wrap">' + pageHead('Пакеты и баланс', 'Чаты оплачиваются пакетами, подарки и искры — с баланса', '<a class="btn btn-light" href="#/purchases">' + ic('history') + 'История покупок</a>') +
      (fp ? '<div class="note coral" style="margin-bottom:14px">' + ic('chat') + '<div>Чтобы написать <b>' + esc(decl(fp.name, 'd')) + '</b>, нужен пакет чатов. После оплаты чат откроется автоматически.</div></div>' : '') +
      '<div class="cols"><div>' +
      '<div class="wallet"><div class="lab">Сейчас у вас</div><div class="amt">' + S.me.chatsLeft + ' ' + plural(S.me.chatsLeft, 'чат', 'чата', 'чатов') + '</div><div class="sub"><div><b>' + eur(S.me.balance) + '</b><span>баланс</span></div><div><b>' + S.me.sparks + '</b><span>' + plural(S.me.sparks, 'искра', 'искры', 'искр') + '</span></div><div><b>' + e.msgsPerChat + '</b><span>сообщений в чате</span></div></div></div>' +
      '<h2 class="sec">Пакеты чатов</h2>' + e.packages.map(function (p) { return '<a class="pack' + (p.best ? ' best' : '') + '" href="#/checkout/pack:' + p.id + (fp ? '&for=' + fp.id : '') + '">' + (p.best ? '<span class="tag">Выгодно</span>' : '') + '<span class="n">' + p.chats + '</span><div class="tx"><b>' + p.chats + ' ' + plural(p.chats, 'чат', 'чата', 'чатов') + '</b><span>' + e.msgsPerChat + ' сообщений в каждом · ' + eur(p.eur / p.chats) + ' за чат</span></div><div class="pr"><b>' + eur(p.eur) + '</b><span>' + p.usdt + ' USDT</span></div></a>'; }).join('') +
      '<div class="note mt12">' + ic('info') + '<div>Пакет не сгорает. Один чат — одна анкета, ' + e.msgsPerChat + ' ваших сообщений; ответы собеседницы не расходуют лимит. Продление чата — тоже 1 чат из пакета.</div></div>' +
      '<h2 class="sec">Пополнить баланс</h2><div class="card"><p class="muted small" style="margin-bottom:12px">Для подарков, искр и функций профиля. Чаты с баланса не оплачиваются.</p><div class="amts">' + e.topups.map(function (a) { return '<a href="#/checkout/topup:' + a + '">€' + a + '</a>'; }).join('') + '</div><div class="row-between mt12"><input class="input" id="st-custom" inputmode="numeric" placeholder="Своя сумма, € ' + e.customMin + '–' + e.customMax + '"><a class="btn btn-dark" id="st-go" href="#/checkout/topup:20">Далее</a></div></div></div>' +
      '<div class="side-sticky"><div class="card"><b>Способы оплаты</b><div class="method mt12" style="box-shadow:none;padding:8px 0"><span class="ic">₮</span><div class="tx"><b>USDT</b><span>TRC20 · BEP20 · Solana · TON. Зачисление 1–15 минут</span></div></div><div class="method" style="box-shadow:none;padding:8px 0"><span class="ic">BP</span><div class="tx"><b>Binance Pay</b><span>Без комиссии сети</span></div></div><div class="method off" style="box-shadow:none;padding:8px 0"><span class="ic">' + ic('card') + '</span><div class="tx"><b>Банковская карта</b><span>Скоро · от €' + e.cardMin + '</span></div><span class="pill">Скоро</span></div><div class="brands mt8"><span>VISA</span><span>MC</span><span>МИР</span><span>UnionPay</span></div></div>' +
      '<div class="card mt12 green"><b>Почему пакеты, а не поминутно</b><p class="small mt8" style="color:#128A4C">Вы заранее знаете, сколько переписок у вас есть, и ничего не списывается незаметно. Цена видна до каждого действия.</p></div>' +
      '<div class="card mt12"><b>Нужна помощь с оплатой?</b><p class="muted small mt8">Платёж не пришёл или ошиблись сетью — напишите, разберёмся за час.</p><a class="btn btn-light btn-sm mt12" href="#/support/new?cat=Оплата">Написать в поддержку</a></div></div></div></div>',
      after: function (root) { var inp = $('#st-custom', root), g = $('#st-go', root); inp.oninput = function () { var v = Math.min(e.customMax, Math.max(0, +inp.value || 0)); g.href = '#/checkout/topup:' + (v >= e.customMin ? v : 20); }; } };
  };
  V.checkout = function (item, q) {
    var e = C.economy, parts = (item || '').split(':'), kind = parts[0], val = parts[1], forId = q && q.get('for');
    var pack = kind === 'pack' ? e.packages.filter(function (p) { return p.id === val; })[0] : null, amount = kind === 'topup' ? +val : (pack ? pack.eur : 0);
    if (!pack && kind !== 'topup') return V.notfound();
    var st = S.checkout; if (st.item !== item) { st.item = item; st.step = 1; st.method = 'trc20'; } if (q && q.get('step') && !st.demoStep) { st.step = +q.get('step'); st.demoStep = true; }
    var title = pack ? 'Пакет «' + pack.chats + ' ' + plural(pack.chats, 'чат', 'чата', 'чатов') + '»' : 'Пополнение баланса';
    var summary = '<div class="card"><div class="sum"><span>' + title + '</span><b>' + eur(amount) + '</b></div><div class="sum"><span>К оплате в USDT</span><b>' + amount + ' USDT</b></div>' + (pack ? '<div class="sum"><span>Сообщений</span><b>' + pack.chats * e.msgsPerChat + '</b></div>' : '') + '</div>';
    var body;
    if (st.step === 1) body = summary + '<h2 class="sec">Способ оплаты</h2>' + e.networks.map(function (n) { return '<button class="method' + (st.method === n.id ? ' on' : '') + '" data-m="' + n.id + '"><span class="ic">' + (n.id === 'binance' ? 'BP' : '₮') + '</span><div class="tx"><b>' + n.name + '</b><span>' + n.sub + '</span></div><span class="radio"></span></button>'; }).join('') + '<div class="method off"><span class="ic">' + ic('card') + '</span><div class="tx"><b>Банковская карта</b><span>Подключаем. Минимальный пакет — €' + e.cardMin + '</span></div><span class="pill">Скоро</span></div>' +
      '<div class="note mt12">' + ic('shield') + '<div>Сумма фиксируется на 30 минут. Отправьте ровно указанную сумму в выбранной сети — зачисление автоматическое.</div></div>' + '<button class="btn btn-primary btn-lg btn-block mt16" data-next>Перейти к оплате</button>';
    else if (st.step === 2) { var n = e.networks.filter(function (x) { return x.id === st.method; })[0]; body = '<div class="card" style="text-align:center"><div class="muted small">Оплатите</div><div style="font-size:30px;font-weight:800;letter-spacing:-.03em">' + amount + ' USDT</div><div class="muted small">' + n.name + ' · ' + eur(amount) + '</div><div class="qr mt16"></div><div class="addr mt16"><span>' + (st.method === 'binance' ? 'Binance Pay ID: 384 921 077' : 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE') + '</span><button data-copy>' + ic('copy') + '</button></div><div class="mt16"><span class="muted small">Счёт действителен</span><div class="timer" id="timer">29:59</div></div></div>' +
      '<div class="card mt12 amber"><div class="row-between"><div><b>Ожидаем перевод</b><div class="small" style="color:#8A5B00">Обычно 1–15 минут. Страницу можно закрыть — пакет зачислится сам.</div></div></div></div>' +
      '<button class="btn btn-dark btn-lg btn-block mt16" data-paid>Я оплатил — проверить</button><button class="btn btn-ghost btn-block mt8" data-prev>Изменить способ оплаты</button>'; }
    else body = '<div class="success"><div class="em">' + ic('check') + '</div><b>Оплачено</b><p>' + (pack ? 'Пакет активирован: +' + pack.chats + ' ' + plural(pack.chats, 'чат', 'чата', 'чатов') + '. Теперь у вас ' + S.me.chatsLeft + '.' : 'Баланс пополнен на ' + eur(amount) + '. Теперь ' + eur(S.me.balance) + '.') + '</p></div>' + summary + (forId && byId[+forId] ? '<button class="btn btn-primary btn-lg btn-block mt16" data-openchat="' + forId + '">Открыть чат с ' + esc(decl(byId[+forId].name, 't')) + '</button>' : '<a class="btn btn-primary btn-lg btn-block mt16" href="#/">К анкетам</a>') + '<a class="btn btn-light btn-block mt8" href="#/purchases">История покупок</a>';
    return { nav: null, side: '#/store', cls: 'no-nav', topbar: tbBack(st.step === 3 ? 'Готово' : 'Оплата', null, '#/store'), body: '<div class="wrap"><div class="authcard" style="max-width:560px;margin:0 auto">' + pageHead(st.step === 3 ? 'Готово' : 'Оплата') + '<div class="steps"><i class="on"></i><i class="' + (st.step >= 2 ? 'on' : '') + '"></i><i class="' + (st.step >= 3 ? 'on' : '') + '"></i></div>' + body + '</div></div>',
      after: function (root) {
        $$('[data-m]', root).forEach(function (el) { el.onclick = function () { st.method = el.dataset.m; render(); }; });
        var nx = $('[data-next]', root); if (nx) nx.onclick = function () { st.step = 2; render(); };
        var pv = $('[data-prev]', root); if (pv) pv.onclick = function () { st.step = 1; render(); };
        var cp = $('[data-copy]', root); if (cp) cp.onclick = function () { toast('Скопировано'); };
        var tm = $('#timer', root); if (tm) { var s = 1799; root._iv = setInterval(function () { s--; if (!document.body.contains(tm)) { clearInterval(root._iv); return; } tm.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }, 1000); }
        var pd = $('[data-paid]', root); if (pd) pd.onclick = function () { pd.disabled = true; pd.textContent = 'Проверяем…'; setTimeout(function () { if (pack) S.me.chatsLeft += pack.chats; else S.me.balance += amount; S.purchases.unshift({ id: '#' + (48400 + S.purchases.length), title: title, eur: amount, pay: amount + ' USDT', method: e.networks.filter(function (x) { return x.id === st.method; })[0].name, date: 'Сегодня, ' + now(), status: 'paid' }); st.step = 3; render(); }, 1400); };
        var oc = $('[data-openchat]', root); if (oc) oc.onclick = function () { openChatWith(byId[+oc.dataset.openchat]); };
      } };
  };
  V.purchases = function () {
    var st = { paid: ['green', 'Оплачено'], pending: ['amber', 'Ожидает'], failed: ['danger', 'Отменено'] };
    return { nav: null, side: '#/store', topbar: tbBack('Покупки', null, '#/store'), body: '<div class="wrap">' + pageHead('История покупок', 'Пакеты, пополнения и их статусы') + '<div class="cols narrow"><div>' + (S.purchases.length ? '<div class="list">' + S.purchases.map(function (p) { return '<div class="row"><span class="ic ' + (p.title.indexOf('Пакет') === 0 ? 'navy' : 'coral') + '">' + ic(p.title.indexOf('Пакет') === 0 ? 'chat' : 'wallet') + '</span><div class="tx"><b>' + esc(p.title) + '</b><span>' + p.date + ' · ' + p.method + ' · ' + p.id + '</span></div><div style="text-align:right"><b>' + eur(p.eur) + '</b><div><span class="pill ' + st[p.status][0] + '">' + st[p.status][1] + '</span></div></div></div>'; }).join('') + '</div>' : empty('history', 'Покупок пока нет', 'Здесь появятся пакеты чатов и пополнения баланса.', '<a class="btn btn-dark" href="#/store">К пакетам</a>')) +
      '<div class="note mt16">' + ic('info') + '<div>Статус «Ожидает» — платёж виден в сети, но ещё не подтверждён. Если прошло больше 30 минут, напишите в поддержку с номером заказа.</div></div></div><div><div class="card"><b>Проблема с оплатой?</b><p class="muted small mt8">Укажите номер заказа — мы проверим платёж в сети вручную.</p><a class="btn btn-light btn-sm mt12" href="#/support/new?cat=Оплата">В поддержку</a></div></div></div></div>' };
  };
  var SETS = [['account', 'lock', 'Вход и защита', 'Email, пароль, выход'], ['notifications', 'bell', 'Уведомления', 'Push, события, звуки, тихие часы'], ['appearance', 'sun', 'Оформление и язык', 'Тема, русский / украинский'], ['privacy', 'shield', 'Приватность', 'Заблокированные, правила, условия'], ['app', 'download', 'Приложение', 'Установить на главный экран'], ['danger', 'trash', 'Удаление аккаунта', 'Деактивация с возвратом 30 дней']];
  function setPage(id, root) {
    var s = S.settings;
    if (id === 'account') return '<div class="setgroup"><div class="setrow"><div class="tx"><b>Email</b><span>' + esc(S.me.email) + '</span></div><button class="btn btn-light btn-sm" data-chg="email">Изменить</button></div><div class="setrow"><div class="tx"><b>Пароль</b><span>Изменён 12 сентября</span></div><button class="btn btn-light btn-sm" data-chg="pass">Изменить</button></div><div class="setrow"><div class="tx"><b>Вход по ссылке</b><span>Отправим ссылку на email вместо пароля</span></div>' + toggle(true, 'data-noop') + '</div></div>' +
      '<div class="card green mt12"><div class="row-between"><div><b>Аккаунт защищён</b><div class="small" style="color:#128A4C">Профиль и переписки привязаны к email — их не потерять.</div></div>' + ic('shield') + '</div></div><button class="btn btn-light btn-block mt16" data-logout>' + ic('logout') + 'Выйти из аккаунта</button>';
    if (id === 'notifications') return '<div class="setgroup"><div class="setrow"><div class="tx"><b>Push-уведомления</b><span>' + (s.push ? 'Включены в этом браузере' : 'Разрешите, чтобы узнавать об ответах') + '</span></div>' + toggle(s.push, 'data-st="push"') + '</div></div><h2 class="sec">События</h2><div class="setgroup">' + [['msg', 'Сообщения', 'Ответы и новые чаты'], ['like', 'Лайки', 'Кому вы понравились'], ['view', 'Гости профиля', 'Кто смотрел анкету'], ['follow', 'Выход в сеть', 'Анкеты, за которыми вы следите'], ['promo', 'Баланс и акции', 'Скидки на пакеты']].map(function (e) { return '<div class="setrow"><div class="tx"><b>' + e[1] + '</b><span>' + e[2] + '</span></div>' + toggle(s.ev[e[0]], 'data-ev="' + e[0] + '"') + '</div>'; }).join('') + '</div>' +
      '<h2 class="sec">Звуки и тишина</h2><div class="setgroup"><div class="setrow"><div class="tx"><b>Звук уведомлений</b></div>' + toggle(s.sound, 'data-st="sound"') + '</div><div class="setrow"><div class="tx"><b>Тихие часы</b><span>' + (s.quiet ? 'С ' + s.qFrom + ' до ' + s.qTo + ' — без звука и push' : 'Выключены') + '</span></div>' + toggle(s.quiet, 'data-st="quiet"') + '</div>' + (s.quiet ? '<div class="setrow"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1"><label class="field" style="margin:0"><span>С</span><input class="input" type="time" value="' + s.qFrom + '" data-q="qFrom"></label><label class="field" style="margin:0"><span>До</span><input class="input" type="time" value="' + s.qTo + '" data-q="qTo"></label></div></div>' : '') + '</div>';
    if (id === 'appearance') return '<h2 class="sec" style="margin-top:0">Тема</h2><div class="themes">' + [['light', 'sun', 'Светлая'], ['dark', 'moon', 'Тёмная'], ['system', 'monitor', 'Как в системе']].map(function (t) { return '<button class="' + (s.theme === t[0] ? 'on' : '') + '" data-settheme="' + t[0] + '">' + ic(t[1]) + t[2] + '</button>'; }).join('') + '</div><div class="hint">Системная тема следует настройкам устройства.</div><h2 class="sec">Язык</h2><div class="seg"><button class="' + (s.lang === 'ru' ? 'on' : '') + '" data-lang="ru">Русский</button><button class="' + (s.lang === 'uk' ? 'on' : '') + '" data-lang="uk">Українська</button></div><div class="hint">В прототипе переключение языка не переводит интерфейс.</div>';
    if (id === 'privacy') return '<div class="setgroup"><div class="setrow"><div class="tx"><b>Показывать меня в поиске</b><span>Выключите, чтобы анкету видели только те, с кем вы общаетесь</span></div>' + toggle(true, 'data-noop') + '</div><div class="setrow"><div class="tx"><b>Показывать «в сети»</b></div>' + toggle(true, 'data-noop') + '</div></div><h2 class="sec">Заблокированные <span class="muted small" style="font-weight:600">' + S.blocked.length + '</span></h2>' + (S.blocked.length ? '<div class="list">' + S.blocked.map(function (b, i) { return '<div class="row"><span class="ic">' + ic('block') + '</span><div class="tx"><b>' + esc(b.name) + '</b><span>Заблокирован ' + b.date + '</span></div><button class="btn btn-light btn-sm" data-unblock="' + i + '">Разблокировать</button></div>'; }).join('') + '</div>' : '<div class="note">' + ic('block') + '<div>Заблокированных нет.</div></div>') +
      '<h2 class="sec">Документы</h2><div class="list"><a class="row" href="#/legal"><div class="tx"><b>Правила сообщества</b></div>' + ic('chev', 'chev') + '</a><a class="row" href="#/legal"><div class="tx"><b>Условия использования</b><span>Приняты 12 сентября 2026</span></div>' + ic('chev', 'chev') + '</a><a class="row" href="#/legal"><div class="tx"><b>Конфиденциальность и GDPR</b></div>' + ic('chev', 'chev') + '</a></div>';
    if (id === 'app') return '<div class="card"><div class="row-between"><div><b>Установить приложение</b><div class="muted small">Иконка на главном экране, уведомления и работа офлайн — без магазина приложений.</div></div></div><button class="btn btn-dark mt12" data-install>' + ic('download') + 'Установить</button></div><div class="note mt12">' + ic('info') + '<div>На iPhone: «Поделиться» → «На экран „Домой“». На Android кнопка установки появится сразу.</div></div>';
    if (id === 'danger') return '<div class="card"><b>Деактивировать аккаунт</b><p class="muted small mt8">Профиль скроется из поиска, чаты — на паузе. В течение 30 дней достаточно войти, чтобы всё вернуть. Потом данные удаляются навсегда, покупки не возвращаются.</p><button class="btn btn-danger mt12" data-deact>' + ic('trash') + 'Деактивировать</button></div>';
    return '';
  }
  function wireSets(root) {
    var s = S.settings;
    $$('[data-st]', root).forEach(function (el) { el.onclick = function () { s[el.dataset.st] = !s[el.dataset.st]; if (el.dataset.st === 'push' && s.push) toast('Push включены'); render(); }; });
    $$('[data-ev]', root).forEach(function (el) { el.onclick = function () { s.ev[el.dataset.ev] = !s.ev[el.dataset.ev]; render(); }; });
    $$('[data-noop]', root).forEach(function (el) { el.onclick = function () { el.classList.toggle('on'); }; });
    $$('[data-q]', root).forEach(function (el) { el.onchange = function () { s[el.dataset.q] = el.value; }; });
    $$('[data-settheme]', root).forEach(function (el) { el.onclick = function () { s.theme = el.dataset.settheme; applyTheme(); render(); }; });
    $$('[data-lang]', root).forEach(function (el) { el.onclick = function () { s.lang = el.dataset.lang; render(); }; });
    $$('[data-unblock]', root).forEach(function (el) { el.onclick = function () { S.blocked.splice(+el.dataset.unblock, 1); toast('Разблокировано'); render(); }; });
    $$('[data-chg]', root).forEach(function (el) { el.onclick = function () { var isE = el.dataset.chg === 'email'; openSheet({ title: isE ? 'Изменить email' : 'Изменить пароль', body: isE ? '<label class="field"><span>Новый email</span><input class="input" type="email" placeholder="name@example.com"></label><label class="field"><span>Текущий пароль</span><input class="input" type="password"></label>' : '<label class="field"><span>Текущий пароль</span><input class="input" type="password"></label><label class="field"><span>Новый пароль</span><input class="input" type="password" placeholder="Минимум 8 символов"></label>', footer: '<button class="btn btn-light" data-close>Отмена</button><button class="btn btn-dark" data-ok>Сохранить</button>', after: function (b) { $('[data-ok]', b).onclick = function () { closeSheet(); toast(isE ? 'Отправили подтверждение на новый email' : 'Пароль изменён'); }; } }); }; });
    var lo = $('[data-logout]', root); if (lo) lo.onclick = function () { confirmDlg('Выйти из аккаунта?', 'Чаты и покупки сохранятся — войдите снова по email.', 'Выйти', function () { go('#/welcome'); }); };
    var de = $('[data-deact]', root); if (de) de.onclick = function () { confirmDlg('Деактивировать аккаунт?', 'Профиль скроется, чаты поставятся на паузу. 30 дней на возврат, затем удаление без возможности восстановить.', 'Деактивировать', function () { toast('Аккаунт деактивирован. Для возврата просто войдите.'); go('#/welcome'); }, true); };
    var ins = $('[data-install]', root); if (ins) ins.onclick = function () { toast('Диалог установки покажет браузер'); };
  }
  V.settings = function (sub) {
    var id = sub || (isDesktop() ? S.settingsPage : null); if (sub) S.settingsPage = sub;
    var meta = SETS.filter(function (s) { return s[0] === id; })[0];
    var list = '<div class="list">' + SETS.map(function (s) { return '<a class="row' + (s[0] === id ? ' on' : '') + '" href="#/settings/' + s[0] + '"><span class="ic ' + (s[0] === 'danger' ? '' : 'navy') + '">' + ic(s[1]) + '</span><div class="tx"><b>' + s[2] + '</b><span>' + s[3] + '</span></div>' + ic('chev', 'chev') + '</a>'; }).join('') + '</div><div class="muted small" style="text-align:center;padding:16px">otkrovenno.online · версия прототипа 1.0</div>';
    if (!id) return { nav: '#/me', side: '#/settings', topbar: tbBack('Настройки', null, '#/me'), body: '<div class="wrap">' + pageHead('Настройки') + list + '</div>' };
    return { nav: '#/me', side: '#/settings', topbar: tbBack(meta ? meta[2] : 'Настройки', null, '#/settings'), body: '<div class="wrap">' + pageHead('Настройки', 'Вход, уведомления, оформление, приватность') + '<div class="sets"><div class="setnav vis-d">' + list + '</div><div><h2 class="sec vis-d" style="margin-top:0">' + (meta ? meta[2] : '') + '</h2>' + setPage(id) + '</div></div></div>', after: wireSets };
  };
  V.support = function (sub, q) {
    var stt = { answered: ['green', 'Есть ответ'], open: ['amber', 'В работе'], closed: ['', 'Закрыта'] };
    if (sub === 'new') {
      var cats = ['Общий вопрос', 'Оплата', 'Профиль', 'Чат', 'Ошибка', 'Другое'], cat = (q && q.get('cat')) || S.support.cat;
      return { nav: null, side: '#/support', topbar: tbBack('Новая заявка', null, '#/support'), body: '<div class="wrap"><div class="authcard" style="max-width:640px;margin:0 auto">' + pageHead('Новая заявка', 'Ответим в течение часа, обычно быстрее') + '<div class="field"><span>Тема</span><div class="chips">' + cats.map(function (c) { return '<button class="chip' + (c === cat ? ' on' : '') + '" data-cat="' + c + '">' + c + '</button>'; }).join('') + '</div></div>' + (cat === 'Оплата' ? '<label class="field"><span>Номер заказа</span><select class="select">' + S.purchases.map(function (p) { return '<option>' + p.id + ' · ' + p.title + ' · ' + p.date + '</option>'; }).join('') + '<option>Другой</option></select></label>' : '') + '<label class="field"><span>Что случилось</span><textarea class="textarea" id="sup-text" placeholder="Опишите по шагам: что делали, что ожидали, что произошло"></textarea></label><label class="check on" id="sup-tech"><span class="box">' + ic('check') + '</span><span>Приложить технические данные (браузер, версия приложения). Переписки и пароли не передаются.</span></label><button class="btn btn-primary btn-lg btn-block mt24" data-send>Отправить</button></div></div>',
        after: function (root) { $$('[data-cat]', root).forEach(function (el) { el.onclick = function () { S.support.cat = el.dataset.cat; go('#/support/new?cat=' + encodeURIComponent(el.dataset.cat)); }; }); $('#sup-tech', root).onclick = function () { this.classList.toggle('on'); }; $('[data-send]', root).onclick = function () { var t = $('#sup-text', root).value.trim(); if (!t) { toast('Опишите проблему'); return; } var id = 'T-' + (1043 + S.tickets.length); S.tickets.unshift({ id: id, cat: cat, title: t.slice(0, 48), status: 'open', date: 'Сегодня, ' + now(), messages: [{ from: 'me', text: t, t: now() }] }); toast('Заявка ' + id + ' создана'); go('#/support/' + id); }; } };
    }
    if (sub) {
      var tk = S.tickets.filter(function (t) { return t.id === sub; })[0]; if (!tk) return V.notfound();
      return { nav: null, side: '#/support', topbar: tbBack(tk.id, null, '#/support'), body: '<div class="wrap"><div class="authcard" style="max-width:640px;margin:0 auto">' + pageHead(tk.title, tk.cat + ' · ' + tk.date) + '<div class="row-between vis-m" style="margin-bottom:12px"><b>' + esc(tk.title) + '</b><span class="pill ' + stt[tk.status][0] + '">' + stt[tk.status][1] + '</span></div><div class="stack">' + tk.messages.map(function (m) { return '<div class="tmsg' + (m.from === 'support' ? ' sup' : '') + '"><small>' + (m.from === 'support' ? 'Поддержка' : 'Вы') + ' · ' + m.t + '</small>' + esc(m.text) + '</div>'; }).join('') + '</div>' + (tk.status !== 'closed' ? '<div class="composer mt16" style="border:0;padding:0;background:none"><div class="inp"><textarea id="tk-ta" rows="1" placeholder="Ответить…"></textarea></div><button class="send" data-tk-send>' + ic('send') + '</button></div>' : '<div class="note mt16">' + ic('check') + '<div>Заявка закрыта. Если проблема повторилась — создайте новую.</div></div>') + '</div></div>',
        after: function (root) { var b = $('[data-tk-send]', root); if (b) b.onclick = function () { var t = $('#tk-ta', root).value.trim(); if (!t) return; tk.messages.push({ from: 'me', text: t, t: now() }); tk.status = 'open'; render(); }; } };
    }
    return { nav: '#/me', side: '#/support', topbar: tbBack('Поддержка', null, '#/me'), body: '<div class="wrap">' + pageHead('Поддержка', 'Частые вопросы и ваши заявки', '<a class="btn btn-dark" href="#/support/new">' + ic('plus') + 'Новая заявка</a>') + '<div class="cols"><div><h2 class="sec" style="margin-top:0">Частые вопросы</h2><div class="list">' + C.faq.map(function (f, i) { return '<div class="faq"><button class="faq-q' + (S.faqOpen === i ? ' on' : '') + '" data-faq="' + i + '">' + esc(f.q) + ic('chevd') + '</button><div class="faq-a' + (S.faqOpen === i ? ' on' : '') + '">' + esc(f.a) + '</div></div>'; }).join('') + '</div></div>' +
      '<div><h2 class="sec" style="margin-top:0">Ваши заявки</h2>' + (S.tickets.length ? '<div class="list">' + S.tickets.map(function (t) { return '<a class="row" href="#/support/' + t.id + '"><div class="tx"><b>' + esc(t.title) + '</b><span>' + t.id + ' · ' + t.cat + ' · ' + t.date + '</span></div><span class="pill ' + stt[t.status][0] + '">' + stt[t.status][1] + '</span></a>'; }).join('') + '</div>' : '<div class="note">' + ic('help') + '<div>Заявок нет.</div></div>') + '<a class="btn btn-primary btn-block mt16 vis-m" href="#/support/new">' + ic('plus') + 'Новая заявка</a><div class="note mt16">' + ic('clock') + '<div>Отвечаем с 9:00 до 23:00 по Киеву, обычно в течение часа. Тексты переписок к заявке не прикладываются.</div></div></div></div></div>',
      after: function (root) { $$('[data-faq]', root).forEach(function (el) { el.onclick = function () { S.faqOpen = S.faqOpen === +el.dataset.faq ? -1 : +el.dataset.faq; render(); }; }); } };
  };
  V.legal = function () {
    return { nav: null, side: '#/me', topbar: tbBack('Правила', null, '#/me'), body: '<div class="wrap"><div class="authcard" style="max-width:720px;margin:0 auto">' + pageHead('Правила и документы') + '<div class="tabs"><button class="tab on">Правила сообщества</button><button class="tab">Условия</button><button class="tab">Конфиденциальность</button><button class="tab">GDPR</button></div>' +
      '<div class="card"><h2 class="sec" style="margin-top:0">Что это за сервис</h2><p>otkrovenno.online — сервис общения. Часть анкет ведут виртуальные собеседницы: за ними стоят операторы и AI-ассистент. Мы говорим об этом открыто, чтобы вы понимали, за что платите: за внимание и разговор, а не за обещание встречи.</p><h2 class="sec">Оплата</h2><p>Чаты оплачиваются пакетами, цена видна до каждого действия. Ничего не списывается без вашего подтверждения. Покупки не возвращаются после использования.</p><h2 class="sec">Безопасность</h2><p>Запрещены оскорбления, спам, чужие фото и публикация переписок. Нарушителей блокируем. Никогда не переводите деньги собеседницам напрямую и не делитесь документами.</p><h2 class="sec">Возраст</h2><p>Сервис только для совершеннолетних (18+). Возраст указывается при регистрации и может быть проверен.</p></div></div></div>' };
  };
  V.welcome = function () {
    var ph = [byId[999896], byId[999894], byId[999903]];
    return { bare: true, nav: null, cls: 'flush no-nav', topbar: '', body: '<div class="auth"><div><div class="top">' + logo() + '<a class="btn btn-light btn-sm" href="#/login">Войти</a></div><h1>Честные разговоры с теми, кто рядом</h1><p class="lead">Анкеты девушек из вашего города. Пишите, дарите, флиртуйте — цена каждого действия видна заранее.</p>' +
      '<div class="vals"><div><span class="ic">' + ic('zap') + '</span>Сейчас в сети ' + PROFILES.filter(function (p) { return p.online; }).length + ' девушки — отвечают за минуты</div><div><span class="ic">' + ic('eye') + '</span>Лайки и просмотр анкет бесплатны</div><div><span class="ic">' + ic('shield') + '</span>Чаты пакетами: вы знаете, сколько переписок осталось</div></div>' +
      '<div class="foot"><button class="btn btn-primary btn-lg btn-block" data-guest>Смотреть анкеты</button><a class="btn btn-light btn-lg btn-block mt8" href="#/signup">Создать профиль</a><p class="legal">Продолжая, вы подтверждаете, что вам есть 18, и принимаете <a href="#/legal">условия</a>. Часть анкет ведут виртуальные собеседницы — <a href="#/legal">подробнее</a>.</p></div></div>' +
      '<div class="collage">' + ph.map(function (p) { return '<img src="' + p.photos[0] + '" alt="">'; }).join('') + '<span class="on"><i class="online-dot"></i>' + esc(ph[0].name) + ', ' + esc(ph[1].name) + ' и ещё 1 в сети</span></div></div>',
      after: function (root) { $('[data-guest]', root).onclick = function () { S.guest = true; toast('Вы смотрите как гость — профиль попросим перед первым лайком'); go('#/'); }; } };
  };
  V.signup = function () {
    var sg = S.signup, step = sg.step;
    var b1 = '<label class="field"><span>Имя</span><input class="input" id="sg-name" placeholder="Как к вам обращаться" value="' + esc(sg.name) + '"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="field"><span>Возраст</span><input class="input" id="sg-age" type="number" inputmode="numeric" min="18" max="80" placeholder="18–80" value="' + esc(sg.age) + '"></label><label class="field"><span>Город</span><select class="select" id="sg-city"><option value="">Выберите</option>' + C.cities.map(function (c) { return '<option' + (c === sg.city ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label></div><div class="field"><span>Я</span><div class="sexpick"><button class="' + (sg.sex === 'm' ? 'on' : '') + '" data-sex="m">Мужчина</button><button class="' + (sg.sex === 'f' ? 'on' : '') + '" data-sex="f">Женщина</button></div></div><div class="hint" id="sg-err"></div>';
    var b2 = '<div class="photo-drop">' + ic('camera') + 'Добавить фото<br><small>Можно пропустить — но с фото отвечают в 3 раза чаще</small></div><div class="hint">JPG, PNG, HEIC до 10 МБ. Лицо должно быть видно.</div>';
    var b3 = '<label class="field"><span>Email</span><input class="input" id="sg-email" type="email" placeholder="name@example.com" value="' + esc(sg.email) + '"></label><label class="field"><span>Пароль</span><div class="input-wrap"><input class="input" id="sg-pass" type="password" placeholder="Минимум 8 символов" style="padding-left:16px"><button class="btn btn-ghost btn-sm suffix" data-showpass>Показать</button></div></label><label class="check' + (sg.consent ? ' on' : '') + '" id="sg-consent"><span class="box">' + ic('check') + '</span><span>Мне есть 18 лет, я принимаю <a href="#/legal">условия</a> и понимаю, что часть анкет ведут виртуальные собеседницы.</span></label><div class="hint" id="sg-err"></div>';
    var titles = [['Давайте знакомиться', 'Имя и возраст увидят собеседницы, email — никто.'], ['Добавьте фото', 'Главное фото показывается в поиске и чатах.'], ['Защитите профиль', 'Email и пароль, чтобы не потерять переписки и покупки.']];
    return { bare: true, nav: null, cls: 'flush no-nav', topbar: '', body: '<div class="auth single"><div class="authcard"><div class="top"><button class="ibtn" data-sg-back aria-label="Назад">' + ic('back') + '</button><span class="muted small">Шаг ' + step + ' из 3</span><a class="btn btn-ghost btn-sm" href="#/login">Войти</a></div><div class="steps"><i class="on"></i><i class="' + (step >= 2 ? 'on' : '') + '"></i><i class="' + (step >= 3 ? 'on' : '') + '"></i></div><h1 style="font-size:26px">' + titles[step - 1][0] + '</h1><p class="lead" style="margin-bottom:20px">' + titles[step - 1][1] + '</p>' + (step === 1 ? b1 : step === 2 ? b2 : b3) + '<div class="foot"><button class="btn btn-primary btn-lg btn-block" data-sg-next>' + (step === 3 ? 'Создать профиль' : 'Продолжить') + '</button>' + (step === 2 ? '<button class="btn btn-ghost btn-block mt8" data-sg-skip>Пропустить</button>' : '') + '</div></div></div>',
      after: function (root) {
        $$('[data-sex]', root).forEach(function (el) { el.onclick = function () { sg.sex = el.dataset.sex; render(); }; });
        var cs = $('#sg-consent', root); if (cs) cs.onclick = function (e) { if (e.target.tagName === 'A') return; sg.consent = !sg.consent; cs.classList.toggle('on', sg.consent); };
        var sp = $('[data-showpass]', root); if (sp) sp.onclick = function () { var i = $('#sg-pass', root); i.type = i.type === 'password' ? 'text' : 'password'; sp.textContent = i.type === 'password' ? 'Показать' : 'Скрыть'; };
        $('[data-sg-back]', root).onclick = function () { if (step > 1) { sg.step--; render(); } else go('#/welcome'); };
        var sk = $('[data-sg-skip]', root); if (sk) sk.onclick = function () { sg.step = 3; render(); };
        $('[data-sg-next]', root).onclick = function () {
          var err = $('#sg-err', root);
          if (step === 1) { sg.name = $('#sg-name', root).value.trim(); sg.age = $('#sg-age', root).value; sg.city = $('#sg-city', root).value; if (!sg.name) { err.textContent = 'Укажите имя'; err.className = 'hint err'; return; } if (!(+sg.age >= 18 && +sg.age <= 80)) { err.textContent = 'Возраст — число от 18 до 80'; err.className = 'hint err'; return; } sg.step = 2; render(); }
          else if (step === 2) { sg.step = 3; render(); }
          else { sg.email = $('#sg-email', root).value.trim(); var pw = $('#sg-pass', root).value; if (!/^[^@]+@[^@]+\.[^@]+$/.test(sg.email)) { err.textContent = 'Проверьте email'; err.className = 'hint err'; return; } if (pw.length < 8) { err.textContent = 'Пароль — минимум 8 символов'; err.className = 'hint err'; return; } if (!sg.consent) { err.textContent = 'Нужно подтвердить возраст и принять условия'; err.className = 'hint err'; return; } S.guest = false; S.me.name = sg.name; S.me.age = +sg.age; S.me.city = sg.city || S.me.city; S.me.email = sg.email; toast('Добро пожаловать, ' + sg.name + '!'); go('#/'); }
        };
      } };
  };
  V.login = function () {
    return { bare: true, nav: null, cls: 'flush no-nav', topbar: '', body: '<div class="auth single"><div class="authcard"><div class="top"><a class="ibtn" href="#/welcome" aria-label="Назад">' + ic('back') + '</a>' + logo() + '<span class="sp"></span></div><h1 style="font-size:26px">С возвращением</h1><p class="lead" style="margin-bottom:20px">Войдите по email и паролю или получите ссылку для входа.</p><label class="field"><span>Email</span><input class="input" id="lg-email" type="email" placeholder="name@example.com"></label><label class="field"><span>Пароль</span><input class="input" id="lg-pass" type="password" placeholder="Ваш пароль"></label><div class="row-between"><a class="small b" href="#/recover" style="color:var(--coral)">Забыли пароль?</a></div><div class="hint err" id="lg-err"></div><div class="foot"><button class="btn btn-primary btn-lg btn-block" data-login>Войти</button><button class="btn btn-light btn-lg btn-block mt8" data-magic>' + ic('mail') + 'Войти по ссылке на email</button><p class="legal">Нет профиля? <a href="#/signup">Создать</a></p></div></div></div>',
      after: function (root) { $('[data-login]', root).onclick = function () { var e = $('#lg-email', root).value, p = $('#lg-pass', root).value; if (!e || !p) { $('#lg-err', root).textContent = 'Введите email и пароль'; return; } S.guest = false; toast('С возвращением, ' + S.me.name); go('#/'); }; $('[data-magic]', root).onclick = function () { var e = $('#lg-email', root).value; if (!e) { $('#lg-err', root).textContent = 'Введите email — пришлём ссылку'; return; } openSheet({ cls: 'center dialog', title: 'Проверьте почту', body: '<p class="muted">Отправили ссылку для входа на <b>' + esc(e) + '</b>. Она действует 15 минут.</p>', footer: '<button class="btn btn-dark btn-block" data-close>Понятно</button>' }); }; } };
  };
  V.recover = function () {
    return { bare: true, nav: null, cls: 'flush no-nav', topbar: '', body: '<div class="auth single"><div class="authcard"><div class="top"><a class="ibtn" href="#/login" aria-label="Назад">' + ic('back') + '</a>' + logo() + '<span class="sp"></span></div><h1 style="font-size:26px">Восстановить доступ</h1><p class="lead" style="margin-bottom:20px">Пришлём ссылку для смены пароля. Профиль, чаты и покупки сохранятся.</p><label class="field"><span>Email</span><input class="input" id="rc-email" type="email" placeholder="name@example.com"></label><div class="foot"><button class="btn btn-primary btn-lg btn-block" data-rc>Отправить ссылку</button><p class="legal">Нет доступа к почте? <a href="#/support/new">Напишите в поддержку</a></p></div></div></div>',
      after: function (root) { $('[data-rc]', root).onclick = function () { var e = $('#rc-email', root).value; if (!e) { toast('Введите email'); return; } $('.authcard', root).innerHTML = '<div class="success"><div class="em">' + ic('mail') + '</div><b>Письмо отправлено</b><p>Проверьте <b>' + esc(e) + '</b>. Ссылка действует 30 минут.</p></div><a class="btn btn-dark btn-block" href="#/login">Вернуться ко входу</a>'; }; } };
  };
  V.states = function () {
    return { nav: null, side: '#/me', topbar: tbBack('Состояния интерфейса', null, '#/me'), body: '<div class="wrap">' + pageHead('Состояния интерфейса', 'Загрузка, пустые экраны, ошибки, офлайн — чтобы разработчикам не додумывать') + '<div class="cols eq"><div>' +
      '<h2 class="sec" style="margin-top:0">Загрузка (скелет)</h2><div class="card"><div style="display:flex;gap:12px;align-items:center"><div class="sk" style="width:54px;height:54px;border-radius:50%"></div><div style="flex:1"><div class="sk" style="height:14px;width:50%"></div><div class="sk mt8" style="height:12px;width:80%"></div></div></div><div class="sk mt16" style="height:220px;border-radius:20px"></div></div>' +
      '<h2 class="sec">Пустой экран</h2><div class="card">' + empty('chat', 'Здесь пусто', 'Напишите кому-нибудь из поиска — первый чат откроется из пакета.', '<a class="btn btn-dark" href="#/">К анкетам</a>') + '</div>' +
      '<h2 class="sec">Ошибка загрузки</h2><div class="card">' + empty('refresh', 'Не удалось загрузить', 'Проверьте соединение и попробуйте ещё раз.', '<button class="btn btn-light">Повторить</button>') + '</div></div><div>' +
      '<h2 class="sec" style="margin-top:0">Офлайн и сессия</h2><div class="card" style="padding:0;overflow:hidden"><div class="offline show">' + ic('wifioff') + 'Нет соединения — показываем сохранённое, отправка подождёт</div><div style="padding:16px"><div class="note amber">' + ic('clock') + '<div><b>Сессия истекла</b> — войдите снова, черновики сообщений сохранены.</div></div></div></div>' +
      '<h2 class="sec">Диалоги и сообщения</h2><div class="card"><div class="chips"><button class="chip" data-demo="toast">Тост</button><button class="chip" data-demo="confirm">Подтверждение</button><button class="chip" data-demo="gate">Гостевой гейт</button><button class="chip" data-demo="pay">Открытие чата</button><button class="chip" data-demo="topup">Пополнение</button><button class="chip" data-demo="gift">Подарок</button><button class="chip" data-demo="menu">Меню «ещё»</button></div></div>' +
      '<h2 class="sec">Уведомление-карточка (в приложении)</h2><div class="list"><a class="nrow unread" href="#/chat/c1"><div class="avatar" style="background-image:url(' + byId[999896].thumb + ')"><i class="k k-msg">' + ic('chat') + '</i></div><div class="tx"><b>Ульяна ответила</b><p>Так что, покажешь, что готовишь ты?</p><span class="btn btn-sm btn-soft">Ответить</span></div><span class="tm">сейчас</span></a></div>' +
      '<h2 class="sec">Бейджи и статусы</h2><div class="card"><div class="chips"><span class="pill green">В сети</span><span class="pill">Была 2 ч назад</span><span class="pill coral">Взаимно</span><span class="pill navy">Искра</span><span class="pill amber">Ожидает</span><span class="pill danger">Отменено</span><span class="pill">Лимит</span></div></div></div></div></div>',
      after: function (root) { $$('[data-demo]', root).forEach(function (el) { el.onclick = function () { var d = el.dataset.demo, p = byId[999896]; if (d === 'toast') toast('Симпатия отправлена · Ульяна'); if (d === 'confirm') confirmDlg('Заблокировать Ульяну?', 'Анкета исчезнет из поиска и чатов.', 'Заблокировать', function () { toast('Это демо'); }, true); if (d === 'gate') guestGate(function () { }); if (d === 'pay') { var c = chatFor(p.id); if (c) { S.chats = S.chats.filter(function (x) { return x !== c; }); openChatWith(p); S.chats.unshift(c); } else openChatWith(p); } if (d === 'topup') openTopup(3); if (d === 'gift') giftPicker(p, function () { }); if (d === 'menu') reportSheet(p); }; }); } };
  };
  V.notfound = function () { return { nav: null, topbar: tbBack('Не найдено'), body: '<div class="wrap">' + empty('search', 'Страница не найдена', 'Возможно, анкета скрыта или ссылка устарела.', '<a class="btn btn-dark" href="#/">На главную</a>') + '</div>' }; };

  /* ---------- тема ---------- */
  function applyTheme() { var t = S.settings.theme; if (t === 'system') t = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); }

  /* ---------- роутер ---------- */
  function route() {
    var h = location.hash || '#/'; var qi = h.indexOf('?'); var q = qi >= 0 ? new URLSearchParams(h.slice(qi + 1)) : new URLSearchParams(); if (qi >= 0) h = h.slice(0, qi);
    var parts = h.replace(/^#\/?/, '').split('/').filter(Boolean), r = parts[0] || '';
    if (q.get('tab') && !r) S.deckTab = q.get('tab');
    S.openDemo = q.get('open'); S.routeQ = q; S.routeParts = parts;
    if (!r) return V.discover();
    if (r === 'profile') return V.profile(parts[1]);
    if (r === 'likes') return V.likes();
    if (r === 'chats') return V.chats();
    if (r === 'chat') return V.chat(parts[1]);
    if (r === 'notifications') return V.notifications();
    if (r === 'search') return V.search(q.get('q'));
    if (r === 'me') return parts[1] === 'edit' ? V.meEdit() : V.me();
    if (r === 'store') return V.store(q);
    if (r === 'checkout') return V.checkout(parts[1], q);
    if (r === 'purchases') return V.purchases();
    if (r === 'settings') return V.settings(parts[1]);
    if (r === 'support') return V.support(parts[1], q);
    if (r === 'legal') return V.legal();
    if (r === 'welcome') return V.welcome();
    if (r === 'signup') return V.signup();
    if (r === 'login') return V.login();
    if (r === 'recover') return V.recover();
    if (r === 'states') return V.states();
    return V.notfound();
  }
  function render() {
    closeSheet(); document.onkeydown = null; S.openChat = null;
    var v = route(), app = document.getElementById('app');
    var cls = 'view ' + (v.cls || '') + (v.nav ? '' : ' no-nav');
    app.innerHTML = '<div class="shell' + (v.bare ? ' bare' : '') + '">' + (v.bare ? '' : sidebarHtml(v.side || v.nav)) + '<div class="main">' + (v.topbar == null ? '' : v.topbar) + '<div class="' + cls + '" id="view">' + v.body + '</div>' + (v.nav ? navHtml(v.nav) : '') + '</div></div>';
    $$('[data-back]', app).forEach(function (el) { el.onclick = function () { back(el.dataset.back); }; });
    if (v.after) v.after(app);
    if (S.openDemo) { var od = S.openDemo, pid = +(S.routeQ.get('pid') || (S.routeParts[0] === 'profile' ? S.routeParts[1] : 0)), pp = byId[pid] || deckList()[0], cc = null; S.chats.forEach(function (c) { if (c.id === S.routeParts[1]) cc = c; }); if (cc) pp = byId[cc.pid]; S.openDemo = null; history.replaceState(null, '', location.hash.replace(/[?&]open=[^&]*/, ''));
      setTimeout(function () { if (od === 'filters') filtersSheet(); else if (od === 'chat' && pp) { var ex = chatFor(pp.id); if (ex) S.chats = S.chats.filter(function (c) { return c !== ex; }); openChatWith(pp); if (ex) S.chats.unshift(ex); } else if (od === 'gift' && pp) giftPicker(pp, function () { }); else if (od === 'gate') guestGate(function () { }); else if (od === 'extend' && cc) extendChat(cc); else if (od === 'menu' && pp) reportSheet(pp); else if (od === 'stickers') stickerSheet(function () { }); else if (od === 'topup') openTopup(0); }, 60); }
    var vw = $('#view'); if (vw && !v.cls) vw.scrollTop = 0;
    document.title = (v.title || 'otkrovenno.online') + ' — прототип';
  }
  window.addEventListener('hashchange', function () { var h = location.hash.split('?')[0]; if (hist[hist.length - 1] !== h) hist.push(h); render(); });
  var mq = window.matchMedia('(min-width:980px)'); (mq.addEventListener ? mq.addEventListener('change', render) : mq.addListener(render));
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', applyTheme);
  var sp = new URLSearchParams(location.search); if (sp.get('theme')) S.settings.theme = sp.get('theme'); if (sp.get('guest')) S.guest = true;
  applyTheme(); hist.push((location.hash || '#/').split('?')[0]); render();
  window.PROTO_STATE = S;
})();
