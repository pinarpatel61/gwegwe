#!/usr/bin/env python3
"""Redesign 2026-10-14 — stage 1 (design system + shell + likes screen).

Splices the new shell into the live SPA without hand-editing the 5k-line app.js:
  python apply_stage1.py "<path to PHP Engine (server)/app>"
Idempotent: every patch checks its own marker before applying.
"""
import re
import sys
from pathlib import Path

APP = Path(sys.argv[1])


def load(name):
    with open(APP.joinpath(name), encoding='utf-8', newline='') as fh:
        raw = fh.read()
    crlf = '\r\n' in raw
    return raw.replace('\r\n', '\n'), crlf


def save(name, text, crlf):
    with open(APP.joinpath(name), 'w', encoding='utf-8', newline='') as fh:
        fh.write(text.replace('\n', '\r\n') if crlf else text)


def replace_fn(src, name, new_text):
    """Replace a top-level `function name(` … closing `\n}\n` block."""
    start = src.find('\nfunction ' + name + '(')
    if start < 0:
        raise SystemExit('function not found: ' + name)
    start += 1
    end = src.find('\n}\n', start)
    if end < 0:
        raise SystemExit('function end not found: ' + name)
    return src[:start] + new_text.rstrip('\n') + src[end + 2:]


def must_replace(src, old, new, label):
    if old not in src:
        raise SystemExit('anchor not found: ' + label)
    return src.replace(old, new, 1)


# --------------------------------------------------------------------- app.js
V4_BLOCK = r"""
/* ===== Redesign 2026-10-14 («Свайп», deliverables/site-prototype-20261014): icons + likes ===== */
var V4_ICONS={
  compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  heart:'<path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/>',
  heartf:'*<path d="M12 21s-8-5-8-10.6A4.6 4.6 0 0 1 12 8a4.6 4.6 0 0 1 8 2.4C20 16 12 21 12 21z"/>',
  chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  wallet:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 15h2"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  back:'<path d="m15 5-7 7 7 7"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  check:'<path d="m5 12 5 5 9-10"/>',
  spark:'*<path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7z"/>',
  gift:'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 14h18M12 9c-2-4-7-4-7-1s5 1 7 1zm0 0c2-4 7-4 7-1s-5 1-7 1z"/>',
  filter:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  chev:'<path d="m9 6 6 6-6 6"/>'
};
function v4Icon(name,cls){var p=V4_ICONS[name]||V4_ICONS.spark,fill=p.charAt(0)==='*';if(fill)p=p.slice(1);return '<svg class="v4-ic i'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true" '+(fill?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')+'>'+p+'</svg>';}
/* Views built with the new markup mark the scroll container so the shell drops its legacy padding. */
function v4Page(html,cls){var body=document.getElementById('vc-main-body');if(!body)return null;body.classList.add('v4-view');body.innerHTML='<div class="v4 v4-page'+(cls?' '+cls:'')+'">'+html+'</div>';return body;}
function v4PageHead(title,sub){return '<div class="topbar left vis-m"><h1>'+h(title)+'</h1></div><div class="vis-d"><div class="row-between"><div><h1 class="page-h">'+h(title)+'</h1>'+(sub?'<p class="page-sub">'+h(sub)+'</p>':'')+'</div></div></div>';}
function v4Empty(icon,title,text,btnLabel,btnRoute){return '<div class="empty"><div class="em">'+v4Icon(icon)+'</div><b>'+h(title)+'</b>'+h(text)+(btnLabel?'<br><button type="button" class="btn btn-primary" data-route="'+h(btnRoute||'/')+'">'+h(btnLabel)+'</button>':'')+'</div>';}
function viewLikes(){
  var title=t('v4_nav_likes','Симпатии');
  var body=v4Page(v4PageHead(title,t('v4_likes_sub','Кому понравилась ваша анкета'))+'<div id="vc-likes-list"><div class="sk" style="height:220px"></div></div>','v4-likes');
  if(!body)return;
  var list=document.getElementById('vc-likes-list');
  api('likes').then(function(r){
    if(!document.getElementById('vc-likes-list'))return;
    var items=(r&&r.ok&&Array.isArray(r.items))?r.items.slice().sort(function(a,b){return (parseInt(b.at,10)||0)-(parseInt(a.at,10)||0);}):[];
    if(!items.length){
      list.innerHTML=v4Empty('heart',t('v4_likes_empty_title','Пока нет симпатий'),t('v4_likes_empty_text','Лайкайте анкеты в поиске — взаимные симпатии появятся здесь'),t('v4_go_search','В поиск'),'/');
    }else{
      list.innerHTML='<div class="grid2">'+items.map(function(n){
        var id=parseInt(n.id||n.user_id,10)||0,name=localizedPersonName(n.name||n.fullname||''),photo=n.photo||'';
        return '<button type="button" class="pcard" data-route="/profile/'+id+'">'+(photo?'<img src="'+h(photo)+'" alt="" loading="lazy">':'')+'<div class="g"></div>'+(n.online?'<span class="st"><i></i>'+h(t('v4_online','В сети'))+'</span>':'')+'<div class="t"><b>'+h(name)+(n.age?', '+h(n.age):'')+'</b>'+(n.city?'<span>'+h(localizedCity(n.city))+'</span>':'')+'</div></button>';
      }).join('')+'</div>';
    }
    $$('[data-route]',list).forEach(function(el){el.addEventListener('click',function(){navigate(el.dataset.route);});});
    if((parseInt(state.me&&state.me.likes_new,10)||0)>0){api('mark_seen',{kind:'likes'}).then(function(res){if(res&&res.ok&&state.me){state.me.likes_new=0;updateChatsBadge();}}).catch(function(){});}
  }).catch(function(){if(list)list.innerHTML=v4Empty('info',t('load_failed','Не удалось загрузить данные'),'');});
}

"""

RENDER_SHELL = r"""/* ===== Layout shell (redesign 2026-10-14: 252px sidebar on desktop, 4 bottom tabs on phones — redesign.css) ===== */
function renderShell(){
  var app = document.getElementById('app');
  if (!app) return;
  if (app.querySelector('#vc-rail')) { return; }
  app.className = 'app v4';
  app.innerHTML =
    '<aside class="sidebar" id="vc-rail">' + railHtml() + '</aside>' +
    '<section class="center" id="vc-center">' +
      '<div class="vc-route-loader" aria-hidden="true"><i></i></div>' +
      '<div class="main-body" id="vc-main-body"></div>' +
    '</section>' +
    '<nav class="bottomnav" id="vc-bottom-nav" aria-label="' + h(t('nav_your_space','Ваше пространство')) + '">' + bottomNavHtml() + '</nav>';
  wireRail();
  wireBottomNav();
}
"""

RAIL_HTML = r"""function railHtml(){
  var me = state.me || {};
  var prof = me.profile || {};
  var selfName=localizedPersonName(prof.fullname || prof.name || (me.uid ? 'User'+me.uid : ''));
  var nm = h(selfName);
  var age = prof.u_age || prof.age || '';
  var av = prof.photo || prof.avatar || '';
  var avHtml = av ? '<img src="'+h(av)+'" alt="">' : h(initials(selfName));
  var avStyle = av ? '' : 'style="background:'+avatarBg(prof.fullname||prof.name||'')+'"';
  var accountLabel=sidebarAccountLabel();
  var activeTheme=state.resolvedTheme||resolvedTheme(state.theme||storedTheme());
  var themeLabel=h(t('theme','Тема'));
  var activeThemeLabel=h(t(activeTheme==='light'?'theme_light':'theme_dark',activeTheme==='light'?'Светлая':'Тёмная'));
  var nextTheme=activeTheme==='light'?'dark':'light';
  var themeSource=state.theme==='system'?h(t('theme_system','Как в системе')):'';
  var themeAccessible=h(themeAccessibleLabel(state.theme||'system',activeTheme));
  function nv(key,route,icon,label,badgeId){return '<div class="nv nav-item" data-key="'+key+'" data-route="'+route+'">'+v4Icon(icon)+'<span>'+h(label)+'</span>'+(badgeId?'<i class="b" id="'+badgeId+'" style="display:none"></i>':'')+'</div>';}
  return '' +
    '<a class="logo" href="#/" aria-label="otkrovenno.online">otkrovenno<em>.online</em></a>' +
    '<nav class="nav desktop-nav" aria-label="' + h(t('nav_your_space','Ваше пространство')) + '">' +
      nv('discover','/','compass',t('nav_discover','Поиск')) +
      nv('likes','/likes','heart',t('v4_nav_likes','Симпатии'),'vc-likes-badge') +
      nv('chats','/chats','chat',t('nav_chats','Чаты'),'vc-chats-badge') +
      nv('notifications','/activity','bell',t('notifications','Уведомления'),'vc-activity-badge') +
      nv('profile','/profile','user',t('nav_profile','Профиль')) +
      '<div class="sep" aria-hidden="true"></div>' +
      nv('store','/store','wallet',t('v4_nav_store','Пакеты и баланс')) +
      nv('settings','/settings','gear',t('nav_settings','Настройки')) +
      nv('support','/support','help',t('v4_nav_support','Поддержка')) +
    '</nav>' +
    '<div class="wallet" role="group" aria-label="'+h(t('account_balance','Баланс аккаунта'))+'">' +
      '<div class="lab">'+h(t('account_balance','Баланс аккаунта'))+'</div>' +
      '<div class="amt" id="vc-rail-balance">'+h(vibeAmount(parseInt(me.balance,10)||0))+'</div>' +
      '<div class="row2"><button type="button" class="btn btn-sm" data-rail-topup>'+h(t('top_up_short','Пополнить'))+'</button><button type="button" class="btn btn-sm o" data-rail-store>'+h(t('v4_packs','Пакеты'))+'</button></div>' +
    '</div>' +
    '<div class="vc-rail-theme" role="group" aria-label="'+themeLabel+'">' +
      '<button type="button" data-rail-theme-toggle role="switch" aria-checked="'+(activeTheme==='dark'?'true':'false')+'" aria-label="'+themeAccessible+'" title="'+themeAccessible+'">'+
        '<span class="vc-rail-theme-current">'+v4Icon(activeTheme==='light'?'sun':'moon')+'</span><span class="vc-rail-theme-copy"><strong>'+activeThemeLabel+'</strong>'+(themeSource?'<small>'+themeSource+'</small>':'')+'</span><span class="vc-rail-theme-track" data-next-theme="'+nextTheme+'" aria-hidden="true"><i></i></span>'+
      '</button>' +
    '</div>' +
    '<div class="me user-mini account" data-route="/profile">' +
      '<div class="avatar navy" '+avStyle+'>'+avHtml+'</div>' +
      '<div><b>'+nm+(age?', '+h(age):'')+'</b><span title="'+h(accountLabel)+'">'+h(accountLabel)+'</span></div>' +
    '</div>';
}
"""

WIRE_RAIL = r"""function wireRail(){
  $$('#vc-rail .nav-item, #vc-rail .user-mini').forEach(function(it){
    bindActivation(it,function(){ if(it.dataset.key==='notifications'){openNotificationCenter();return;} var r = it.dataset.route; if (r) navigate(r); },'link');
  });
  $$('#vc-rail [data-rail-theme-toggle]').forEach(function(button){
    bindActivation(button,function(){applyTheme(nextQuickTheme(),true);toast(t('theme_updated','Тема обновлена'),'success');},'button');
  });
  $$('#vc-rail [data-rail-topup]').forEach(function(button){
    bindActivation(button,function(){openTopUp({source:'rail'});},'button');
  });
  $$('#vc-rail [data-rail-store]').forEach(function(button){
    bindActivation(button,function(){navigate('/store');},'button');
  });
}
"""

BOTTOM_NAV = r"""function bottomNavHtml(){
  function tab(key,route,icon,label,badgeId){return '<div class="bn-item" data-key="'+key+'" data-route="'+route+'">'+v4Icon(icon)+'<span>'+h(label)+'</span>'+(badgeId?'<i class="badge" id="'+badgeId+'" hidden></i>':'')+'</div>';}
  return '' +
    tab('discover','/','compass',t('nav_discover','Поиск')) +
    tab('likes','/likes','heart',t('v4_nav_likes','Симпатии'),'vc-mobile-likes-badge') +
    tab('chats','/chats','chat',t('nav_chats','Чаты'),'vc-mobile-chats-badge') +
    tab('profile','/profile','user',t('nav_profile','Профиль'));
}
"""

SET_ACTIVE_NAV = r"""function setActiveNav(route){
  var items = $$('.nav-item');
  var key = 'discover';
  if (route === '/' || route === '/discover') key = 'discover';
  else if (route === '/likes') key = 'likes';
  else if (route === '/chats' || route.indexOf('/chat/') === 0) key = 'chats';
  else if (route === '/store') key = 'store';
  else if (route === '/profile' || route.indexOf('/profile/') === 0) key = 'profile';
  else if (route === '/activity' || route === '/notifications') key = 'notifications';
  else if (route === '/settings') key = 'settings';
  else if (route === '/support') key = 'support';
  items.forEach(function(it){var active=it.dataset.key===key;it.classList.toggle('active',active);if(active)it.setAttribute('aria-current','page');else it.removeAttribute('aria-current');});
  var bn = $$('.bn-item');
  var bkey = key;
  /* Phones have four tabs; everything secondary lives under Profile (prototype 2026-10-14). */
  if (bkey === 'settings' || bkey === 'store' || bkey === 'support' || bkey === 'notifications') bkey = 'profile';
  bn.forEach(function(it){var active=it.dataset.key===bkey;it.classList.toggle('active',active);if(active)it.setAttribute('aria-current','page');else it.removeAttribute('aria-current');});
}
"""


def patch_app_js():
    src, crlf = load('app.js')
    if 'var V4_ICONS=' in src:
        print('app.js: already patched')
        return
    src = must_replace(src, "\n/* ===== Layout shell (prototype V2) ===== */\nfunction renderShell(){",
                       V4_BLOCK + "function renderShell(){", 'layout shell header')
    src = replace_fn(src, 'renderShell', RENDER_SHELL.split('\n', 1)[1])
    src = must_replace(src, "\nfunction renderShell(){", "\n" + RENDER_SHELL.split('\n', 1)[0] + "\nfunction renderShell(){", 'shell comment')
    src = replace_fn(src, 'railHtml', RAIL_HTML)
    src = replace_fn(src, 'wireRail', WIRE_RAIL)
    src = replace_fn(src, 'bottomNavHtml', BOTTOM_NAV)
    src = replace_fn(src, 'setActiveNav', SET_ACTIVE_NAV)
    src = must_replace(src, "  if (route === '/chats') return viewChats();\n",
                       "  if (route === '/chats') return viewChats();\n  if (route === '/likes') return viewLikes();\n", 'router chats')
    src = must_replace(src, "  renderShell();\n  beginRouteMotion(route);\n",
                       "  renderShell();\n  var v4Body=document.getElementById('vc-main-body');if(v4Body)v4Body.classList.remove('v4-view');\n  beginRouteMotion(route);\n", 'router shell call')
    anchor = "  var mobileActivityBadge=document.getElementById('vc-mobile-activity-badge');"
    i = src.find(anchor)
    if i < 0:
        raise SystemExit('anchor not found: mobile activity badge')
    j = src.find('\n', i)
    likes = ("\n  var likesNew=parseInt(state.me&&state.me.likes_new,10)||0;"
             "\n  var likesBadge=document.getElementById('vc-likes-badge');if(likesBadge){likesBadge.style.display=likesNew?'':'none';likesBadge.textContent=likesNew>99?'99+':likesNew;}"
             "\n  var mobileLikesBadge=document.getElementById('vc-mobile-likes-badge');if(mobileLikesBadge){mobileLikesBadge.hidden=!likesNew;mobileLikesBadge.textContent=likesNew>99?'99+':likesNew;}")
    src = src[:j] + likes + src[j:]
    save('app.js', src, crlf)
    print('app.js: patched')


# ------------------------------------------------------------------ index.php
def patch_index():
    src, crlf = load('index.php')
    if 'redesign.css' in src:
        print('index.php: already patched')
        return
    src = must_replace(src, "$cssV = file_exists(__DIR__.'/app.css') ? filemtime(__DIR__.'/app.css') : '1';\n",
                       "$cssV = file_exists(__DIR__.'/app.css') ? filemtime(__DIR__.'/app.css') : '1';\n"
                       "$redesignV = file_exists(__DIR__.'/redesign.css') ? filemtime(__DIR__.'/redesign.css') : '1';\n", 'cssV')
    src = must_replace(src, '  <link rel="stylesheet" href="/app/app.css?v=<?=htmlspecialchars($cssV)?>">\n',
                       '  <link rel="stylesheet" href="/app/app.css?v=<?=htmlspecialchars($cssV)?>">\n'
                       '  <!-- Redesign 2026-10-14 («Свайп»): tokens, Onest, shell and the .v4 design system -->\n'
                       '  <link rel="stylesheet" href="/app/redesign.css?v=<?=htmlspecialchars($redesignV)?>">\n', 'css link')
    src = must_replace(src, '  <!-- Fonts: local Manrope (redesign 2026-10-02), no third-party font CDN -->\n'
                       '  <link rel="preload" href="/app/assets/fonts/manrope-regular.woff2" as="font" type="font/woff2" crossorigin>\n'
                       '  <link rel="preload" href="/app/assets/fonts/manrope-semibold.woff2" as="font" type="font/woff2" crossorigin>\n',
                       '  <!-- Fonts: local Onest (redesign 2026-10-14), no third-party font CDN -->\n'
                       '  <link rel="preload" href="/app/assets/fonts/onest-cyrillic.woff2" as="font" type="font/woff2" crossorigin>\n'
                       '  <link rel="preload" href="/app/assets/fonts/onest-latin.woff2" as="font" type="font/woff2" crossorigin>\n', 'font preload')
    src = must_replace(src, '<meta name="theme-color" content="#1e211f">', '<meta name="theme-color" content="#F3F3F6">', 'theme-color')
    save('index.php', src, crlf)
    print('index.php: patched')


# --------------------------------------------------------------------- sw.js
def patch_sw():
    src, crlf = load('sw.js')
    if '/app/redesign.css' in src:
        print('sw.js: already patched')
        return
    src = re.sub(r"const VERSION = '[^']+';", "const VERSION = 'v1.10.0-redesign-v4';", src, count=1)
    src = must_replace(src, "  '/app/app.css',\n",
                       "  '/app/app.css',\n  '/app/redesign.css',\n"
                       "  '/app/assets/fonts/onest-cyrillic.woff2',\n"
                       "  '/app/assets/fonts/onest-cyrillic-ext.woff2',\n"
                       "  '/app/assets/fonts/onest-latin.woff2',\n"
                       "  '/app/assets/fonts/onest-latin-ext.woff2',\n", 'sw app.css')
    save('sw.js', src, crlf)
    print('sw.js: patched')


# ------------------------------------------------------------- i18n-extra.js
I18N_BLOCK = r"""
/* Redesign 2026-10-14 (site-prototype-20261014): shell navigation and the likes screen. */
(function(E){
  var D={"ru":{"v4_nav_likes":"Симпатии","v4_nav_store":"Пакеты и баланс","v4_nav_support":"Поддержка","v4_packs":"Пакеты","v4_likes_sub":"Кому понравилась ваша анкета","v4_likes_empty_title":"Пока нет симпатий","v4_likes_empty_text":"Лайкайте анкеты в поиске — взаимные симпатии появятся здесь","v4_go_search":"В поиск","v4_online":"В сети"},
  "uk":{"v4_nav_likes":"Симпатії","v4_nav_store":"Пакети та баланс","v4_nav_support":"Підтримка","v4_packs":"Пакети","v4_likes_sub":"Кому сподобалася ваша анкета","v4_likes_empty_title":"Поки немає симпатій","v4_likes_empty_text":"Лайкайте анкети в пошуку — взаємні симпатії з’являться тут","v4_go_search":"До пошуку","v4_online":"Онлайн"},
  "en":{"v4_nav_likes":"Likes","v4_nav_store":"Packs & balance","v4_nav_support":"Support","v4_packs":"Packs","v4_likes_sub":"People who liked your profile","v4_likes_empty_title":"No likes yet","v4_likes_empty_text":"Like profiles in Discover — mutual likes will show up here","v4_go_search":"Go to Discover","v4_online":"Online"}};
  Object.keys(D).forEach(function(lang){E[lang]=Object.assign(E[lang]||{},D[lang]);});
})(window.VC_I18N_EXTRA);
"""


def patch_i18n():
    src, crlf = load('i18n-extra.js')
    if 'v4_nav_likes' in src:
        print('i18n-extra.js: already patched')
        return
    save('i18n-extra.js', src.rstrip('\n') + '\n' + I18N_BLOCK, crlf)
    print('i18n-extra.js: patched')


# --------------------------------------------------------------------- tests
def patch_tests():
    name = 'tests/headerless_shell_contract.js'
    src, crlf = load(name)
    old = """check((app.match(/data-key="notifications" data-route="\\/activity"/g) || []).length >= 2, 'Notifications section is available in desktop and mobile navigation');"""
    new = """check((app.match(/data-key="notifications" data-route="\\/activity"/g) || []).length >= 1 && (app.match(/data-key="likes" data-route="\\/likes"/g) || []).length >= 2, 'Notifications stay in the sidebar; the Likes tab is available in desktop and mobile navigation (redesign 2026-10-14)');"""
    if new in src:
        print(name + ': already patched')
    else:
        src = must_replace(src, old, new, 'headerless notifications check')
        save(name, src, crlf)
        print(name + ': patched')


NEW_TEST = r"""'use strict';
/* Redesign 2026-10-14 («Свайп», deliverables/site-prototype-20261014) — stage 1 contract:
 * design tokens + Onest, the 252px sidebar / 4-tab shell and the likes screen. */
const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(appDir, f), 'utf8');
const app = read('app.js');
const css = read('redesign.css');
const index = read('index.php');
const sw = read('sw.js');
const i18n = read('i18n-extra.js');
let failures = 0;
function check(value, label) {
  console.log((value ? 'PASS ' : 'FAIL ') + label);
  if (!value) failures++;
}

check(index.indexOf('/app/redesign.css?v=') > index.indexOf('/app/app.css?v='), 'redesign.css loads after app.css so its tokens win the cascade');
check(/@font-face\{font-family:Onest/.test(css) && ['onest-cyrillic', 'onest-latin'].every((f) => fs.existsSync(path.join(appDir, 'assets/fonts', f + '.woff2'))), 'Onest is hosted locally (no font CDN)');
check(css.includes('--coral:#FF4B2B') && css.includes('--navy:#0F1433') && css.includes('--bg:#F3F3F6') && css.includes('html[data-theme="dark"]{'), 'prototype palette is defined for light and dark themes');
check(css.includes('--font:Onest,') && css.includes('--accent:#FF4B2B') && css.includes('--pt-surface:#fff'), 'legacy token aliases map the old screens onto the new palette');
check(css.includes('#app.v4{display:grid;grid-template-columns:252px minmax(0,1fr)') && css.includes('@media (max-width:979px)'), 'shell: 252px sidebar on desktop, one column below 980px');
check((css.match(/\.v4 \.btn\{/g) || []).length === 1 && css.includes('.v4 .card{') && css.includes('.v4 .pcard{') && !/^\.btn\{/m.test(css), 'prototype components are scoped under .v4 and never restyle legacy markup');

const shellStart = app.indexOf('function renderShell()');
const shell = app.slice(shellStart, app.indexOf('function railHtml()', shellStart));
check(shell.includes("app.className = 'app v4'") && shell.includes('class="sidebar" id="vc-rail"') && shell.includes('class="bottomnav" id="vc-bottom-nav"'), 'renderShell mounts the v4 sidebar and bottom tabs');
const bottom = app.slice(app.indexOf('function bottomNavHtml()'), app.indexOf('function wireBottomNav()'));
check(['discover', 'likes', 'chats', 'profile'].every((k) => bottom.includes("tab('" + k + "'")) && !bottom.includes("'notifications'"), 'phone navigation is exactly Поиск · Симпатии · Чаты · Профиль');
const rail = app.slice(app.indexOf('function railHtml()'), app.indexOf('function wireRail()'));
check(['discover', 'likes', 'chats', 'notifications', 'profile', 'store', 'settings', 'support'].every((k) => rail.includes("nv('" + k + "'")) && rail.includes('class="wallet"') && rail.includes('id="vc-rail-balance"') && rail.includes('data-rail-theme-toggle'), 'sidebar lists every section, the wallet card and the theme switch');
check(app.includes("if (route === '/likes') return viewLikes();") && app.includes('function viewLikes()') && app.includes("api('likes')") && app.includes("api('mark_seen',{kind:'likes'})"), 'likes screen is routed, loads api likes and marks them seen');
check(app.includes("getElementById('vc-mobile-likes-badge')") && app.includes("getElementById('vc-likes-badge')") && rail.includes("'vc-likes-badge'") && bottom.includes("'vc-mobile-likes-badge'"), 'likes badges are rendered and refreshed with the other counters');
check(app.includes("if (bkey === 'settings' || bkey === 'store' || bkey === 'support' || bkey === 'notifications') bkey = 'profile';"), 'secondary sections highlight the Profile tab on phones');
check(sw.includes("'/app/redesign.css'") && sw.includes("'/app/assets/fonts/onest-cyrillic.woff2'"), 'service worker pre-caches the new stylesheet and fonts');
check(['ru', 'uk'].every((l) => new RegExp('"' + l + '":\\{"v4_nav_likes"').test(i18n)), 'new copy is translated for ru and uk');

console.log(failures ? `RESULT ${failures} redesign v4 shell checks failed` : 'RESULT redesign v4 shell contract is complete');
process.exit(failures ? 1 : 0);
"""


def add_test():
    p = APP / 'tests' / 'redesign_v4_shell_contract.js'
    if p.exists():
        print('redesign_v4_shell_contract.js: exists')
        return
    p.write_text(NEW_TEST, encoding='utf-8')
    print('redesign_v4_shell_contract.js: added')


if __name__ == '__main__':
    patch_app_js()
    patch_index()
    patch_sw()
    patch_i18n()
    patch_tests()
    add_test()
    print('done')
