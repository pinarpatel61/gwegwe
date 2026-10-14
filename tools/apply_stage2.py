#!/usr/bin/env python3
"""Redesign 2026-10-14 — stage 2: every screen on the prototype design.

  python apply_stage2.py "<path to PHP Engine (server)/app>"
Requires stage 1. Idempotent (marker: `function v4DeckPanelHtml(`).
"""
import sys
from pathlib import Path

APP = Path(sys.argv[1])


def load(name):
    with open(APP.joinpath(name), encoding='utf-8', newline='') as fh:
        raw = fh.read()
    return raw.replace('\r\n', '\n'), '\r\n' in raw


def save(name, text, crlf):
    with open(APP.joinpath(name), 'w', encoding='utf-8', newline='') as fh:
        fh.write(text.replace('\n', '\r\n') if crlf else text)


def replace_fn(src, name, new_text):
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


DECK_CARD = r"""function vcDeckCardHtml(card){
  var name=localizedPersonName(card.name||card.fullname||'')||'',age=parseInt(card.age||card.u_age,10)||0;
  var photos=deckPhotosFor(card),photo=photos[0]||card.photo||card.avatar||'';
  var city=vcDynamicProfileCity(String(card.city||card.location||'').split(',')[0]);
  var online=!!card.online,bio=String(card.bio||'');
  var ints=(card.interests||card.tags||[]).slice(0,4),chips='';
  var myInts=((state.me&&state.me.profile&&state.me.profile.interests)||[]);
  for(var i=0;i<ints.length;i++){
    var isShared=false;for(var j=0;j<myInts.length;j++){if(String(myInts[j]).toLowerCase()===String(ints[i]).toLowerCase()){isShared=true;break;}}
    chips+='<span class="chip glass'+(isShared?' match':'')+'">'+h(localizedInterest(ints[i]))+'</span>';
  }
  var verified=card.verified?'<span class="verified" aria-label="'+h(t('verified_badge','анкета проверена'))+'">'+vcIcon('verified')+'</span>':'';
  var segs=photos.length>1?'<div class="photo-segments" id="vc-photo-segments" aria-hidden="true">'+photos.map(function(u,pi){return '<i'+(pi===0?' class="on is-on"':'')+'></i>';}).join('')+'</div>':'';
  var taps=photos.length>1?'<button type="button" class="photo-tap photo-tap-prev" data-photo-step="-1" aria-label="'+h(t('prev_photo','Предыдущее фото'))+'">'+glassIcon('back','vc-photo-nav-icon')+'</button><button type="button" class="photo-tap photo-tap-next" data-photo-step="1" aria-label="'+h(t('next_photo','Следующее фото'))+'">'+glassIcon('back','vc-photo-nav-icon vc-flip-horizontal')+'</button>':'';
  return '<article class="dcard profile-card" id="vc-glass-card" aria-label="'+h(name+(age?', '+age:''))+'">'+
    '<div class="profile-photo">'+
      (photo?'<img class="ph"'+vcCardSrc(photo)+' alt="" fetchpriority="high" id="vc-card-photo">':'<div class="ph" id="vc-card-photo" style="background:'+avatarBg(name||'?')+'"></div>')+
      '<div class="grad-t"></div><div class="grad-b"></div>'+segs+taps+
      '<span class="state'+(online?'':' off')+'"><i></i>'+h(online?t('online_now','Сейчас онлайн'):t('offline_short','не в сети'))+'</span>'+
      '<button type="button" class="info" id="vc-full-profile" data-act="profile" aria-label="'+h(t('all_profile','Вся анкета'))+'" title="'+h(t('all_profile','Вся анкета'))+'">'+v4Icon('info')+'</button>'+
      '<div class="dinfo"><div class="nm">'+h(name)+(age?', '+age:'')+verified+'</div>'+(city?'<div class="loc">'+v4Icon('pin')+h(city)+'</div>':'')+(chips?'<div class="chips">'+chips+'</div>':'')+'<p class="bio" id="vc-card-bio"'+(bio?'':' data-pending="1"')+'>'+h(bio)+'</p></div>'+
      '<div class="stamp like" aria-hidden="true">'+h(t('disc_like','Нравится'))+'</div><div class="stamp nope" aria-hidden="true">'+h(t('disc_nope','Пропустить'))+'</div>'+
    '</div></article>';
}
"""

VIEW_DISCOVER = r"""function viewDiscover(){
  var body = document.getElementById('vc-main-body');
  if (!body) return;
  stopStoryTimer();
  if(state.deckSwipeCleanup){state.deckSwipeCleanup();state.deckSwipeCleanup=null;}
  var cards = state.deck || [];
  var filterDock=discoverFilterDockHtml();
  var filterBtn='<button type="button" class="ibtn" data-v4-filters aria-label="'+h(t('v4_filters','Фильтры'))+'" title="'+h(t('v4_filters','Фильтры'))+'">'+v4Icon('filter')+'</button>';
  var counter=(cards.length&&state.deckIdx<cards.length)?(state.deckIdx+1)+' / '+cards.length:'';
  function dhead(filterDock){return '<div class="dhead row-between"><div class="dtitle"><a class="logo vis-m" href="#/" aria-label="otkrovenno.online">otkrovenno<em>.online</em></a><div class="vis-d"><h1 class="page-h" id="page-title" tabindex="-1">'+h(t('nav_discover','Поиск'))+'</h1><p class="page-sub vc-deck-counter" id="profile-counter">'+h(counter)+'</p></div></div><div class="dtools">'+v4BalancePill()+filterDock+filterBtn+'</div></div>';}
  if (!cards.length || state.deckIdx >= cards.length){
    var onlineActive=!!(state.discoverFilter&&state.discoverFilter.online),onlineLoading=onlineActive&&state.onlineDeckLoading,onlineError=onlineActive&&state.onlineDeckError;
    var onlineZero=onlineActive&&!onlineLoading&&!onlineError&&Array.isArray(state.onlineDeck)&&state.onlineDeck.length===0;
    var anyError=onlineActive?onlineError:state.deckLoadError,filteredEmpty=!anyError&&!onlineLoading&&discoverFilterActive()&&((state.deckAll||[]).length>0||onlineZero)&&!cards.length,fparts=filteredEmpty?discoverFilterParts():[],fchips='';
    if(filteredEmpty){for(var fp=0;fp<fparts.length;fp++)fchips+='<button type="button" class="vc-empty-remove" data-remove-filter="'+h(fparts[fp].key)+'" aria-label="'+h(t('filter_remove','Убрать')+': '+fparts[fp].label)+'"><span>'+h(fparts[fp].label)+'</span><b aria-hidden="true">×</b></button>';}
    var emptyTitle=anyError?t('network_error','Ошибка сети'):(onlineLoading?t('online_filter_checking','Проверяем, кто сейчас в сети…'):(onlineZero?t('online_filter_empty','Сейчас никто не в сети'):(filteredEmpty?t('disc_empty_filtered','По вашим фильтрам анкет нет'):t('disc_empty','Анкеты закончились'))));
    var emptySub=anyError?t('check_connection','Проверьте соединение и попробуйте снова'):(onlineLoading?'':(onlineZero?t('online_filter_empty_sub','Отключите фильтр — покажем остальные анкеты.'):(filteredEmpty?t('disc_empty_filtered_sub','Уберите одно из ограничений — остальные сохранятся.'):t('disc_empty_sub','Новые анкеты появятся немного позже'))));
    v4Page('<div class="disc"><div class="dcol">'+dhead(filterDock)+'<div class="deckwrap"><div class="deck"><div class="deck-end" role="status"><div class="em">'+v4Icon(anyError?'info':(onlineLoading?'clock':'compass'))+'</div><b>'+h(emptyTitle)+'</b>'+(emptySub?'<p>'+h(emptySub)+'</p>':'')+(fchips?'<div class="chips vc-empty-chips">'+fchips+'</div>':'')+(anyError?'<button type="button" class="btn btn-primary" id="vc-empty-retry">'+h(t('retry','Повторить'))+'</button>':'')+(filteredEmpty?'<div class="row2"><button type="button" class="btn btn-light btn-sm" id="vc-empty-reset">'+h(t('filters_reset_all','Сбросить все'))+'</button><button type="button" class="btn btn-dark btn-sm" id="vc-empty-filters">'+h(t('filters_edit','Изменить фильтры'))+'</button></div>':'')+'</div></div></div></div></div>','disc-page');
    $$('[data-remove-filter]',body).forEach(function(b){b.addEventListener('click',function(){discoverFilterRemove(b.dataset.removeFilter);});});
    var emptyReset=document.getElementById('vc-empty-reset');if(emptyReset)emptyReset.addEventListener('click',function(){state.discoverFilter=discoverFilterDefaults();cancelDiscoverOnlineRequest();applyDiscoverFilter(true);vcPersistDiscoverFilter();renderTopbar();viewDiscover();});
    wireDiscoverFilterDock(body);
    $$('[data-v4-filters]',body).forEach(function(b){b.addEventListener('click',openDiscoverFilters);});
    if(state.deckScroll>0){try{body.scrollTop=state.deckScroll;}catch(e){}state.deckScroll=0;}
    var emptyFilters=document.getElementById('vc-empty-filters');if(emptyFilters)emptyFilters.addEventListener('click',openDiscoverFilters);
    var emptyRetry=document.getElementById('vc-empty-retry');if(emptyRetry)emptyRetry.addEventListener('click',function(){if(onlineActive){refreshDiscoverOnline(true);}else{state.deckLoadError=false;loadMoreDeck();viewDiscover();}});
    if (cards.length && state.deckIdx >= cards.length && !onlineActive) loadMoreDeck();
    return;
  }
  var card = cards[state.deckIdx],next=cards[state.deckIdx+1]||null;
  var rewindEmpty = !(state.deckSwiped && state.deckSwiped.length);
  var nextPhotos=next?deckPhotosFor(next):[],nextPhoto=nextPhotos[0]||(next?(next.photo||next.avatar||''):'');
  var back='<div class="dcard back" aria-hidden="true">'+(nextPhoto?'<img class="ph"'+vcCardSrc(nextPhoto)+' alt="">':'')+'<div class="grad-b"></div></div>';
  var rewindLabel=rewindEmpty?t('disc_rewind_none','Пока нечего возвращать'):t('disc_rewind','Вернуть анкету');
  v4Page('<div class="disc"><div class="dcol">'+dhead(filterDock)+vcCoachHtml()+
    '<div class="deckwrap"><div class="deck" id="vc-card-back-wrap">'+back+vcDeckCardHtml(card)+'</div>'+
    '<div class="actions" id="vc-actions" role="group" aria-label="'+h(t('profile_actions','Действия с анкетой'))+'">'+
      '<button type="button" class="act undo back-button" data-act="rewind" title="'+h(rewindLabel)+'" aria-label="'+h(t('disc_rewind','Вернуть анкету'))+'"'+(rewindEmpty?' disabled':'')+'>'+v4Icon('undo')+'</button>'+
      '<button type="button" class="act nope skip-button" data-act="pass" title="'+h(t('disc_nope','Пропустить'))+'" aria-label="'+h(t('disc_nope','Пропустить'))+'">'+v4Icon('x')+'</button>'+
      '<button type="button" class="act l like-button" data-act="like" title="'+h(t('like','Нравится'))+'" aria-label="'+h(t('like','Нравится'))+'">'+v4Icon('heartf')+'</button>'+
      '<button type="button" class="act msg message-button" id="vc-write-cta" title="'+h(t('send_message','Написать'))+'" aria-label="'+h(t('send_message','Написать'))+'">'+v4Icon('chat')+'</button>'+
    '</div></div>'+
    '<p class="khint deck-kbd-hint" aria-hidden="true">'+h(t('deck_kbd_hint','← пропустить · → лайк · Enter — анкета · Backspace — вернуть'))+'</p>'+
    '<span id="profile-status" class="sr-only" role="status"></span>'+
    '</div><aside class="panel vis-d" id="vc-deck-panel">'+v4DeckPanelHtml(card)+discoverMoreHtml()+'</aside></div>','disc-page');
  var statusEl=document.getElementById('profile-status');
  if (statusEl) statusEl.textContent=localizedPersonName(card.name||card.fullname||'')+(card.age||card.u_age?', '+String(card.age||card.u_age):'');
  $$('#vc-actions [data-act]').forEach(function(btn){ btn.addEventListener('click', function(e){ e.stopPropagation(); handleDeckAction(btn.dataset.act); }); });
  $$('[data-panel-act]',body).forEach(function(btn){btn.addEventListener('click',function(e){e.stopPropagation();handleDeckAction(btn.dataset.panelAct);});});
  $$('[data-panel-photo]',body).forEach(function(btn){btn.addEventListener('click',function(){v4DeckShowPhoto(card,parseInt(btn.dataset.panelPhoto,10)||0);});});
  wireDiscoverMore();
  var writeCta=document.getElementById('vc-write-cta');if(writeCta)writeCta.addEventListener('click',function(e){e.stopPropagation();handleDeckAction('message');});
  var fullProfile=document.getElementById('vc-full-profile');if(fullProfile)fullProfile.addEventListener('click',function(e){e.stopPropagation();handleDeckAction('profile');});
  wireDiscoverFilterDock(body);
  $$('[data-v4-filters]',body).forEach(function(b){b.addEventListener('click',openDiscoverFilters);});
  if(state.deckScroll>0){try{body.scrollTop=state.deckScroll;}catch(e){}state.deckScroll=0;}
  wireSwipe();
  wireDeckPhotos(card);
  if(!state.deckKeysBound){state.deckKeysBound=true;document.addEventListener('keydown',vcDeckKeys);}
  maybeShowSwipeCoach();
  /* Lazy-load bio; refresh the card and the panel copy in place when it arrives. */
  if (card.id){
    authApi('get_bio', {id: card.id}).then(function(r){
      if (!r || !r.ok || !r.bio) return;
      card.bio = r.bio;
      var bioEl = document.getElementById('vc-card-bio');
      if (bioEl && bioEl.getAttribute('data-pending')) { bioEl.textContent = r.bio; bioEl.removeAttribute('data-pending'); }
      var panelBio=document.getElementById('vc-panel-bio');if(panelBio&&panelBio.getAttribute('data-pending')){panelBio.textContent=r.bio;panelBio.removeAttribute('data-pending');}
    }).catch(function(e){ console.error('get_bio error:', e); });
  }
  if (!(state.discoverFilter&&state.discoverFilter.online) && state.deck.length - state.deckIdx < 4) loadMoreDeck();
}
"""

V4_EXTRA = r"""
/* ===== Redesign 2026-10-14 stage 2: deck panel, chats layout, settings nav, profile links ===== */
function v4BalancePill(){return '<a class="vibes" href="#/store" aria-label="'+h(t('account_balance','Баланс аккаунта'))+'">'+v4Icon('wallet')+'<b>'+h(vibeAmount(parseInt((state.me||{}).balance,10)||0))+'</b></a>';}
function v4DeckPanelHtml(card){
  var name=localizedPersonName(card.name||card.fullname||'')||'',age=parseInt(card.age||card.u_age,10)||0,photos=deckPhotosFor(card);
  var city=vcDynamicProfileCity(String(card.city||card.location||'').split(',')[0]),online=!!card.online,bio=String(card.bio||card.about||'');
  var ints=card.interests||card.tags||[],myInts=((state.me&&state.me.profile&&state.me.profile.interests)||[]),chips='';
  for(var i=0;i<ints.length&&i<8;i++){var shared=false;for(var j=0;j<myInts.length;j++){if(String(myInts[j]).toLowerCase()===String(ints[i]).toLowerCase()){shared=true;break;}}chips+='<span class="chip'+(shared?' match':'')+'">'+h(localizedInterest(ints[i]))+'</span>';}
  var facts=[];
  var zod=card.zodiac||null,zodName=zod?profileZodiacText(zod,zod&&zod.id):'';if(zodName)facts.push([t('v4_zodiac','Знак'),zodName]);
  var st=card.daily_status||null,stTitle=st?profileDailyStatusText(st,st&&st.id):'';if(stTitle)facts.push([t('v4_status','Статус'),stTitle]);
  var mood=card.mood||null;if(mood&&mood.title)facts.push([t('v4_mood','Настроение'),((mood.emoji&&!/^[?\uFFFD\s]+$/.test(mood.emoji))?mood.emoji+' ':'')+localizedProfileValue(mood.title)]);
  var job=localizedProfileValue(card.job||card.occupation||'');if(job)facts.push([t('v4_occupation','Занятие'),job]);
  if(card.distance)facts.push([t('v4_distance','Расстояние'),card.distance+' '+t('km','км')]);
  var thumbs=photos.length>1?'<div class="thumbs">'+photos.slice(0,8).map(function(u,pi){return '<button type="button"'+(pi===0?' class="on"':'')+' data-panel-photo="'+pi+'" aria-label="'+h(t('v4_photo','Фото'))+' '+(pi+1)+'"><img'+vcThumbSrc(u)+' alt="" loading="lazy"></button>';}).join('')+'</div>':'';
  return '<div class="pbody" id="vc-deck-panel-body">'+
    '<div class="row-between"><div><h2 class="pname">'+h(name)+(age?', '+age:'')+'</h2><p class="muted small">'+(city?h(city)+' · ':'')+h(online?t('online_now','Сейчас онлайн'):t('offline_short','не в сети'))+'</p></div><span class="pill '+(online?'green':'')+'">'+(online?'<i class="online-dot"></i>':'')+h(online?t('v4_online','В сети'):t('offline_short','не в сети'))+'</span></div>'+thumbs+
    '<h2 class="sec">'+h(t('about_her','О себе'))+'</h2><p class="bio" id="vc-panel-bio"'+(bio?'':' data-pending="1"')+'>'+h(bio)+'</p>'+
    (facts.length?'<div class="facts mt12">'+facts.map(function(f){return '<div><span>'+h(f[0])+'</span><b>'+h(f[1])+'</b></div>';}).join('')+'</div>':'')+
    (chips?'<h2 class="sec">'+h(t('her_interests','Интересы'))+'</h2><div class="chips">'+chips+'</div>':'')+
    '<div class="pactions mt16"><button type="button" class="btn btn-primary" data-panel-act="message">'+v4Icon('chat')+h(t('send_message','Написать'))+'</button><button type="button" class="btn btn-light" data-panel-act="like">'+v4Icon('heart')+h(t('like','Нравится'))+'</button><button type="button" class="btn btn-light" data-panel-act="profile">'+h(t('all_profile','Вся анкета'))+'</button></div></div>';
}
function v4DeckShowPhoto(card,n){
  var photos=deckPhotosFor(card),img=document.getElementById('vc-card-photo');
  if(!img||img.tagName!=='IMG'||!photos[n])return;
  vcSwapCardPhoto(img,photos[n]);
  $$('#vc-photo-segments i').forEach(function(b,i){b.classList.toggle('on',i===n);b.classList.toggle('is-on',i===n);b.classList.toggle('is-done',i<n);});
  $$('[data-panel-photo]').forEach(function(b){b.classList.toggle('on',(parseInt(b.dataset.panelPhoto,10)||0)===n);});
}
function v4ChatRowHtml(c,activePid){
  var displayChatName=localizedPersonName(c.name||c.fullname||''),nm=h(displayChatName),pid=parseInt(c.peer_id||c.id,10)||0;
  var draftRow=chatRowDraftPreview(c),msg=draftRow?('<span class="chat-row-draft" aria-hidden="true">\u270E</span><span class="chat-row-draft-label">'+h(t('chat_draft','Черновик'))+'</span>'+(draftRow.sticker?' '+h(t('sticker','Стикер')):' '+h(draftRow.text))):h(chatInboxPreview(c));
  var tm=h(fmtTime(c.last_at||c.last_ts||c.ts)),unreadCount=parseInt(c.unread,10)||0;
  var av=c.photo||c.avatar||'',avHtml=av?'<img'+vcThumbSrc(av)+' alt="" loading="lazy" decoding="async">':h(initials(displayChatName||'?')),avStyle=av?'':' style="background:'+avatarBg(c.name||c.fullname||'?')+'"';
  return '<div class="crow chat-row'+(unreadCount?' has-unread':'')+(draftRow?' has-draft':'')+(pid===activePid?' on':'')+'" role="button" tabindex="0" data-pid="'+pid+'" data-online="'+(c.online?1:0)+'" data-last-at="'+chatLastActivity(c)+'" data-search="'+h((String(c.name||c.fullname||'')+' '+displayChatName).toLocaleLowerCase())+'">'+
    '<div class="av"'+avStyle+'>'+avHtml+(c.online?'<span class="dot"></span>':'')+'</div>'+
    '<div class="cinfo"><div class="cnm"><b>'+nm+'</b><small class="chat-row-presence'+(c.online?' is-online':'')+'">'+h(chatPresenceText(c))+'</small></div><div class="cmsg">'+msg+'</div></div>'+
    '<div class="cmeta"><span class="ctm">'+tm+'</span>'+(unreadCount?'<span class="unread">'+(unreadCount>99?'99+':unreadCount)+'</span>':'')+'</div></div>';
}
function v4ChatLayout(peerId){
  var body=document.getElementById('vc-main-body');if(!body)return;
  if(String(state.route||'').indexOf('/chat/')!==0)return;
  var view=null;for(var i=0;i<body.children.length;i++){if(body.children[i].classList&&body.children[i].classList.contains('chat-view')){view=body.children[i];break;}}
  if(!view)return;
  body.classList.add('v4-view');
  if(!window.matchMedia('(min-width:980px)').matches)return;
  var chats=sortChatsForInbox(state.chats||(state.me?state.me.inbox:[])||[]),rows='',found=false;
  for(i=0;i<chats.length;i++){var pid=parseInt(chats[i].peer_id||chats[i].id,10)||0;if(pid===peerId)found=true;rows+=v4ChatRowHtml(chats[i],peerId);}
  var nameEl=document.getElementById('vc-chat-name'),avImg=document.querySelector('#vc-chat-avatar img'),presEl=document.getElementById('vc-chat-presence');
  var peerName=nameEl?nameEl.textContent.trim():'',peerPhoto=avImg?(avImg.getAttribute('data-full')||avImg.getAttribute('src')||''):'',peerPres=presEl?presEl.textContent.trim():'';
  if(!found)rows='<div class="crow chat-row on" role="button" tabindex="0" data-pid="'+peerId+'"><div class="av"'+(peerPhoto?' style="background-image:url('+h(peerPhoto)+')"':'')+'></div><div class="cinfo"><div class="cnm"><b>'+h(peerName)+'</b></div><div class="cmsg">'+h(peerPres)+'</div></div></div>'+rows;
  var wrap=document.createElement('div');wrap.className='v4 chats is-thread';wrap.id='vc-chats-layout';
  wrap.innerHTML='<div class="clist"><div class="hd"><div class="row-between"><h1 class="page-h">'+h(t('nav_chats','Чаты'))+'</h1>'+v4BalancePill()+'</div></div><div class="sc"><div class="list clist-rows">'+rows+'</div></div></div><div class="cthread"></div>'+
    '<aside class="cinfo">'+(peerPhoto?'<img class="big" src="'+h(peerPhoto)+'" alt="">':'<div class="big">'+h(initials(peerName||'?'))+'</div>')+'<h2 class="sec">'+h(peerName)+'</h2><p class="muted small">'+h(peerPres)+'</p>'+
    '<div class="stack mt16"><button type="button" class="btn btn-light btn-block" data-cinfo="profile">'+v4Icon('user')+h(t('v4_open_profile','Анкета'))+'</button><button type="button" class="btn btn-soft btn-block" data-cinfo="gift">'+v4Icon('gift')+h(t('v4_gift','Подарок'))+'</button><button type="button" class="btn btn-ghost btn-block" data-cinfo="more">'+v4Icon('more')+h(t('v4_more','Ещё'))+'</button></div></aside>';
  body.insertBefore(wrap,view);wrap.querySelector('.cthread').appendChild(view);
  $$('.chat-row',wrap).forEach(function(r){bindActivation(r,function(){var pid=parseInt(r.dataset.pid,10);if(pid&&pid!==peerId)navigate('/chat/'+pid);},'link');});
  $$('[data-cinfo]',wrap).forEach(function(b){b.addEventListener('click',function(){var k=b.dataset.cinfo;if(k==='profile'){openProfile(peerId);}else if(k==='gift'){var g=document.getElementById('vc-chat-floating-gift');if(g)g.click();}else{var m=document.getElementById('vc-chat-block');if(m)m.click();}});});
}
function v4ObserveChat(peerId){
  var body=document.getElementById('vc-main-body');if(!body)return;
  if(state.v4ChatObserver){state.v4ChatObserver.disconnect();state.v4ChatObserver=null;}
  v4ChatLayout(peerId);
  if(!window.MutationObserver)return;
  var obs=new MutationObserver(function(){if(String(state.route||'').indexOf('/chat/')!==0){obs.disconnect();if(state.v4ChatObserver===obs)state.v4ChatObserver=null;return;}v4ChatLayout(peerId);});
  obs.observe(body,{childList:true});state.v4ChatObserver=obs;
}
function v4AfterRender(fn){
  var body=document.getElementById('vc-main-body');if(!body)return;
  fn();
  if(!window.MutationObserver)return;
  if(state.v4RenderObserver){state.v4RenderObserver.disconnect();state.v4RenderObserver=null;}
  var route=state.route,obs=new MutationObserver(function(){if(state.route!==route){obs.disconnect();if(state.v4RenderObserver===obs)state.v4RenderObserver=null;return;}fn();});
  obs.observe(body,{childList:true,subtree:true});state.v4RenderObserver=obs;
  setTimeout(function(){if(state.v4RenderObserver===obs){obs.disconnect();state.v4RenderObserver=null;}},5000);
}
function v4SettingsIcon(label){
  var s=String(label||'').toLowerCase();
  if(/вход|вхід|email|доступ|пароль/.test(s))return 'lock';
  if(/уведом|сповіщ/.test(s))return 'bell';
  if(/приват|безопас|безпек/.test(s))return 'shield';
  if(/помощ|поддерж|допомог|підтрим/.test(s))return 'help';
  if(/установ|приложен|встанов|застосун/.test(s))return 'monitor';
  if(/оформл|тема|язык|мова/.test(s))return 'sun';
  if(/удал|выход|видал|вихід/.test(s))return 'trash';
  if(/кто вы|хто ви|профил|профіл/.test(s))return 'user';
  return 'gear';
}
function v4SettingsNav(){
  var body=document.getElementById('vc-main-body'),view=body&&body.querySelector('.settings-view');
  if(!view||document.getElementById('vc-v4-setnav'))return;
  var sections=$$('.set-section',view).filter(function(s){return !s.hidden&&s.querySelector('.set-h');});
  if(sections.length<2)return;
  body.classList.add('v4-view');
  var wrap=document.createElement('div');wrap.className='v4 v4-page sets-page';wrap.id='vc-v4-sets';
  wrap.innerHTML='<div class="sets"><nav class="setnav" id="vc-v4-setnav" aria-label="'+h(t('nav_settings','Настройки'))+'"><div class="list"></div></nav><div class="setbody"></div></div>';
  var list=wrap.querySelector('.setnav .list');
  sections.forEach(function(s,i){
    var label=s.querySelector('.set-h').textContent.trim();if(!s.id)s.id='vc-set-sec-'+i;
    var b=document.createElement('button');b.type='button';b.className='row'+(i===0?' on':'');
    b.innerHTML='<span class="ic'+(i===0?' coral':'')+'">'+v4Icon(v4SettingsIcon(label))+'</span><span class="tx"><b>'+h(label)+'</b></span>'+v4Icon('chev','chev');
    b.addEventListener('click',function(){$$('.row',list).forEach(function(x){x.classList.toggle('on',x===b);x.querySelector('.ic').classList.toggle('coral',x===b);});try{s.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){s.scrollIntoView();}});
    list.appendChild(b);
  });
  body.insertBefore(wrap,view);wrap.querySelector('.setbody').appendChild(view);
}
function v4ProfileExtras(){
  var body=document.getElementById('vc-main-body'),panels=body&&body.querySelector('.own-profile-panels');
  if(!panels||document.getElementById('vc-v4-profile-links'))return;
  function row(icon,cls,label,route){return '<button type="button" class="row" data-route="'+route+'"><span class="ic '+cls+'">'+v4Icon(icon)+'</span><span class="tx"><b>'+h(label)+'</b></span>'+v4Icon('chev','chev')+'</button>';}
  var list=document.createElement('div');list.className='v4';list.id='vc-v4-profile-links';
  list.innerHTML='<h2 class="sec">'+h(t('v4_account_section','Аккаунт'))+'</h2><div class="list">'+row('wallet','navy',t('v4_nav_store','Пакеты и баланс'),'/store')+row('heart','coral',t('v4_nav_likes','Симпатии'),'/likes')+row('bell','amber',t('notifications','Уведомления'),'/activity')+row('gear','',t('nav_settings','Настройки'),'/settings')+row('help','green',t('v4_nav_support','Поддержка'),'/support')+'</div>';
  panels.appendChild(list);
  $$('[data-route]',list).forEach(function(b){b.addEventListener('click',function(){navigate(b.dataset.route);});});
}
"""

VIEW_CHATS = r"""function viewChats(){
  var body = document.getElementById('vc-main-body');
  if (!body) return;
  var chats = sortChatsForInbox(state.chats || (state.me ? state.me.inbox : []) || []),unreadN=0,onlineN=0,i;
  for(i=0;i<chats.length;i++){if((parseInt(chats[i].unread,10)||0)>0)unreadN++;if(chats[i].online)onlineN++;}
  var hd='<div class="hd"><div class="row-between"><h1 class="page-h">'+h(t('nav_chats','Чаты'))+'</h1>'+v4BalancePill()+'</div>'+
    (chats.length?'<label class="input-wrap mt12">'+v4Icon('search')+'<input class="input" id="vc-chat-search" type="search" aria-label="'+h(t('search_chats','Поиск по чатам'))+'" placeholder="'+h(t('search_chats','Поиск по чатам'))+'"></label>'+
    '<div class="tabs" id="vc-chat-tabs"><button type="button" class="tab on" data-chat-tab="all">'+h(t('v4_tab_all','Все'))+'</button><button type="button" class="tab" data-chat-tab="unread">'+h(t('v4_tab_unread','Непрочитанные'))+(unreadN?'<span class="n">'+unreadN+'</span>':'')+'</button><button type="button" class="tab" data-chat-tab="online"><span class="dot"></span>'+h(t('v4_online','В сети'))+(onlineN?'<span class="n">'+onlineN+'</span>':'')+'</button></div>':'')+'</div>';
  var strip='';
  if(chats.length){
    strip='<div class="chat-match-scroller"><div class="faces" id="vc-chat-match-strip" tabindex="0" aria-label="'+h(t('nav_chats','Чаты'))+'">';
    for(var si=0;si<chats.length&&si<18;si++){
      var sm=chats[si],sav=sm.photo||sm.avatar||'',sn=localizedPersonName(sm.name||sm.fullname||''),stripUnread=parseInt(sm.unread,10)||0;
      strip+='<button type="button" class="face'+(stripUnread?' has-unread':'')+'" data-match-chat="'+(sm.peer_id||sm.id||0)+'" aria-label="'+h(sn)+'"><span class="chat-match-avatar avatar'+(sm.online?' ring':'')+'" style="background:'+(sav?'url('+h(sav)+') center/cover,':'')+avatarBg(sn)+'">'+(sav?'':h(initials(sn)))+(stripUnread?'<b class="chat-match-unread">'+(stripUnread>99?'99+':stripUnread)+'</b>':'')+'</span><small>'+h(sn)+'</small></button>';
    }
    strip+='</div><button type="button" class="chat-match-next ibtn" id="vc-chat-match-next" aria-label="'+h(t('next','Дальше'))+'">'+glassIcon('back','vc-chat-next-icon vc-flip-horizontal')+'</button></div>';
  }
  var rows='';for(i=0;i<chats.length;i++)rows+=v4ChatRowHtml(chats[i],0);
  var listHtml=chats.length?'<div class="list chat-list" id="vc-chat-list">'+rows+'</div><div class="empty" id="vc-chat-search-empty" hidden><b>'+h(t('no_search_results','Ничего не найдено'))+'</b></div>':contextCtaHtml({tone:'purple',centered:true,icon:'chats',title:t('chats_context_title','Здесь появятся ваши переписки'),copy:t('chats_context_copy','Выберите анкету и напишите сообщение — диалог начнётся сразу.'),primary:{label:t('go_discover','К поиску'),route:'/'}});
  v4Page('<div class="chats" id="vc-chats-layout"><div class="clist">'+hd+'<div class="sc">'+strip+listHtml+'</div></div><div class="cthread vis-d"><div class="chat-empty"><div class="em">'+v4Icon('chat')+'</div><b>'+h(t('v4_select_chat','Выберите чат'))+'</b>'+h(t('v4_select_chat_sub','Переписка откроется здесь'))+'</div></div></div>','chats-page');
  if(!chats.length)wireContextCtas(body);
  var chatListPage=body.querySelector('.chats .sc'),chatListSurface=body.querySelector('.chat-list');
  if(chatListPage&&chatListSurface)chatListSurface.addEventListener('wheel',function(e){
    if(e.ctrlKey||Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;
    var factor=e.deltaMode===1?16:(e.deltaMode===2?chatListPage.clientHeight:1),before=chatListPage.scrollTop;
    chatListPage.scrollTop+=e.deltaY*factor;
    if(chatListPage.scrollTop!==before)e.preventDefault();
  },{passive:false});
  $$('#vc-main-body .chat-row').forEach(function(r){
    bindActivation(r,function(){ var pid = parseInt(r.dataset.pid,10); if (pid) navigate('/chat/'+pid); },'link');
  });
  $$('[data-match-chat]',body).forEach(function(btn){btn.addEventListener('click',function(){navigate('/chat/'+parseInt(btn.dataset.matchChat,10));});});
  var matchStrip=document.getElementById('vc-chat-match-strip'),matchNext=document.getElementById('vc-chat-match-next');
  function syncMatchNext(){if(!matchStrip||!matchNext)return;var overflow=matchStrip.scrollWidth-matchStrip.clientWidth>4;matchNext.hidden=!overflow;matchNext.disabled=!overflow||matchStrip.scrollLeft>=matchStrip.scrollWidth-matchStrip.clientWidth-4;}
  if(matchStrip){matchStrip.addEventListener('scroll',syncMatchNext,{passive:true});matchStrip.addEventListener('wheel',function(e){if(e.ctrlKey||Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;var before=matchStrip.scrollLeft;matchStrip.scrollLeft+=e.deltaY;if(matchStrip.scrollLeft!==before)e.preventDefault();},{passive:false});requestAnimationFrame(syncMatchNext);}
  if(matchNext)matchNext.addEventListener('click',function(){matchStrip.scrollBy({left:Math.max(180,matchStrip.clientWidth*.72),behavior:'smooth'});});
  var chatSearch=document.getElementById('vc-chat-search'),tab='all';
  function applyChatFilter(){var q=chatSearch?chatSearch.value.trim().toLocaleLowerCase():'',visible=0;$$('.chat-row',body).forEach(function(row){var hide=(!!q&&String(row.dataset.search||'').indexOf(q)<0)||(tab==='unread'&&!row.classList.contains('has-unread'))||(tab==='online'&&row.dataset.online!=='1');row.hidden=hide;if(!hide)visible++;});var empty=document.getElementById('vc-chat-search-empty');if(empty)empty.hidden=!!visible;}
  if(chatSearch)chatSearch.addEventListener('input',applyChatFilter);
  $$('[data-chat-tab]',body).forEach(function(b){b.addEventListener('click',function(){tab=b.dataset.chatTab;$$('[data-chat-tab]',body).forEach(function(x){x.classList.toggle('on',x===b);});applyChatFilter();});});
  updateChatsBadge();
}
"""

ICONS_EXTRA = (
    "  pin:'<path d=\"M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/>',\n"
    "  undo:'<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h9a7 7 0 0 1 0 14h-1\"/>',\n"
    "  more:'<circle cx=\"5\" cy=\"12\" r=\"1.6\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\"/><circle cx=\"19\" cy=\"12\" r=\"1.6\"/>',\n"
    "  star:'<path d=\"m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z\"/>',\n"
    "  shield:'<path d=\"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z\"/><path d=\"m9 12 2 2 4-4\"/>',\n"
    "  mail:'<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"m3 8 9 6 9-6\"/>',\n"
    "  lock:'<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 0 1 8 0v3\"/>',\n"
    "  edit:'<path d=\"M4 20h4L19 9l-4-4L4 16z\"/>',\n"
    "  logout:'<path d=\"M10 4H5v16h5M14 8l4 4-4 4M18 12H9\"/>',\n"
    "  image:'<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"m21 17-6-6-9 9\"/>',\n"
    "  send:'<path d=\"M21 3 10 14M21 3l-7 18-4-7-7-4z\"/>',\n"
    "  eye:'<path d=\"M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>',\n"
    "  clock:'<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>',\n"
    "  card:'<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"M3 10h18M7 15h4\"/>',\n"
    "  globe:'<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18\"/>',\n"
    "  trash:'<path d=\"M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13\"/>',\n"
    "  flag:'<path d=\"M5 21V4h12l-2 4 2 4H5\"/>',\n"
    "  block:'<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m6 6 12 12\"/>',\n"
    "  share:'<path d=\"M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M8 7l4-4 4 4\"/>',\n"
    "  chevd:'<path d=\"m6 9 6 6 6-6\"/>',\n"
    "  users:'<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2 20a7 7 0 0 1 14 0M16 4a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-5-6.7\"/>',\n"
    "  history:'<path d=\"M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5M12 8v4l3 2\"/>',\n"
    "  sparkles:'<path d=\"M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2\"/>',\n"
    "  monitor:'<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 20h8M12 16v4\"/>',\n"
    "  camera:'<path d=\"M4 8h3l2-3h6l2 3h3v11H4z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/>',\n"
    "  mic:'<rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/>',\n"
    "  smile:'<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 14.5a4.5 4.5 0 0 0 7 0M9 10h.01M15 10h.01\"/>',\n"
    "  zap:'<path d=\"M13 2 4 14h7l-1 8 9-12h-7z\"/>',\n"
    "  key:'<circle cx=\"8\" cy=\"14\" r=\"4\"/><path d=\"M11 11 20 2M16 6l2 2M13 9l2 2\"/>',\n"
    "  refresh:'<path d=\"M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5\"/>',\n"
)

I18N_BLOCK = r"""
/* Redesign 2026-10-14 stage 2: discover panel, chats layout, profile links. */
(function(E){
  var D={"ru":{"v4_filters":"Фильтры","v4_zodiac":"Знак","v4_status":"Статус","v4_mood":"Настроение","v4_occupation":"Занятие","v4_distance":"Расстояние","v4_photo":"Фото","v4_tab_all":"Все","v4_tab_unread":"Непрочитанные","v4_select_chat":"Выберите чат","v4_select_chat_sub":"Переписка откроется здесь","v4_open_profile":"Анкета","v4_gift":"Подарок","v4_more":"Ещё","v4_account_section":"Аккаунт"},
  "uk":{"v4_filters":"Фільтри","v4_zodiac":"Знак","v4_status":"Статус","v4_mood":"Настрій","v4_occupation":"Заняття","v4_distance":"Відстань","v4_photo":"Фото","v4_tab_all":"Усі","v4_tab_unread":"Непрочитані","v4_select_chat":"Оберіть чат","v4_select_chat_sub":"Листування відкриється тут","v4_open_profile":"Анкета","v4_gift":"Подарунок","v4_more":"Ще","v4_account_section":"Обліковий запис"},
  "en":{"v4_filters":"Filters","v4_zodiac":"Sign","v4_status":"Status","v4_mood":"Mood","v4_occupation":"Occupation","v4_distance":"Distance","v4_photo":"Photo","v4_tab_all":"All","v4_tab_unread":"Unread","v4_select_chat":"Pick a chat","v4_select_chat_sub":"The conversation opens here","v4_open_profile":"Profile","v4_gift":"Gift","v4_more":"More","v4_account_section":"Account"}};
  Object.keys(D).forEach(function(lang){E[lang]=Object.assign(E[lang]||{},D[lang]);});
})(window.VC_I18N_EXTRA);
"""

NEW_TEST = r"""'use strict';
/* Redesign 2026-10-14 stage 2 contract: every screen uses the prototype design system. */
const fs = require('fs');
const path = require('path');
const appDir = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(appDir, f), 'utf8');
const app = read('app.js');
const css = read('redesign.css');
let failures = 0;
function check(value, label) { console.log((value ? 'PASS ' : 'FAIL ') + label); if (!value) failures++; }
const deck = app.slice(app.indexOf('function vcDeckCardHtml('), app.indexOf('function viewDiscover('));
check(deck.includes('class="dcard profile-card" id="vc-glass-card"') && deck.includes('id="vc-card-photo"') && deck.includes('id="vc-photo-segments"') && deck.includes('data-photo-step="-1"') && deck.includes('id="vc-card-bio"') && deck.includes('class="stamp like"'), 'deck card uses the prototype swipe card markup while keeping the legacy hooks (photo, segments, taps, bio)');
const disc = app.slice(app.indexOf('function viewDiscover('), app.indexOf('function discoverFilterDockHtml('));
check(disc.includes("v4Page('<div class=\"disc\"><div class=\"dcol\">") && disc.includes('id="vc-deck-panel"') && disc.includes('v4DeckPanelHtml(card)') && disc.includes('discoverMoreHtml()') && disc.includes('class="act l like-button" data-act="like"') && disc.includes('id="vc-write-cta"'), 'discover renders deck + profile panel on desktop with the four floating actions');
check(disc.includes('[data-v4-filters]') && disc.includes('wireDiscoverFilterDock(body)') && disc.includes('wireSwipe();') && disc.includes('wireDeckPhotos(card);') && disc.includes("authApi('get_bio'") && disc.includes("getElementById('vc-panel-bio')"), 'discover keeps filters, swipe, photo taps, keys and the lazy bio for both card and panel');
check(app.includes('function v4DeckPanelHtml(card)') && app.includes('data-panel-act="message"') && app.includes('data-panel-photo='), 'the deck panel shows facts, interests, thumbnails and actions for the current card');
const chats = app.slice(app.indexOf('function viewChats('), app.indexOf('function syncChatListRows('));
check(chats.includes('class="chats" id="vc-chats-layout"') && chats.includes('class="clist"') && chats.includes('class="cthread vis-d"') && chats.includes('data-chat-tab="unread"') && chats.includes('id="vc-chat-search"') && chats.includes('class="list chat-list" id="vc-chat-list"'), 'chat list is the master column with search, tabs and an empty detail pane');
check(app.includes('function v4ChatRowHtml(c,activePid)') && app.includes('class="crow chat-row') && app.includes('class="cmsg"') && app.includes('class="ctm"') && app.includes('class="chat-row-presence'), 'chat rows keep the hooks syncChatListRows updates in place');
check(app.includes('function v4ChatLayout(peerId)') && app.includes("wrap.className='v4 chats is-thread'") && app.includes('<aside class="cinfo">') && app.includes("wrap.querySelector('.cthread').appendChild(view)") && app.includes('viewChat(id);v4ObserveChat(id);'), 'open chat is wrapped into list + thread + partner card on desktop');
check(app.includes('function v4SettingsNav()') && app.includes("viewSettings();v4AfterRender(v4SettingsNav);") && app.includes('id="vc-v4-setnav"'), 'settings get a section navigation column on desktop');
check(app.includes('function v4ProfileExtras()') && app.includes("viewProfile();v4AfterRender(v4ProfileExtras);") && app.includes("row('wallet','navy'"), 'own profile links to packs, likes, notifications, settings and support');
['.v4 .dcard{', '#app.v4 .v4 .disc{display:grid;grid-template-columns:440px', '#app.v4 .v4 .chats{display:grid;grid-template-columns:380px', '#app.v4 .v4 .chats.is-thread{grid-template-columns:340px minmax(0,1fr) 320px}', '#app.v4 .chat-compact-view .bub.me{', '#app.v4 .pp-hero{', '#app.v4 .store-hero{', '#app.v4 .own-profile-avatar{', '#app.v4 .set-section{', '#app.v4 .vcn-chip{', '.app.auth-screen .auth-card{', '.vc-modal-card{'].forEach((sel) => {
  check(css.includes(sel), 'redesign.css styles ' + sel.replace(/\{.*$/, ''));
});
console.log(failures ? `RESULT ${failures} redesign v4 screens checks failed` : 'RESULT redesign v4 screens contract is complete');
process.exit(failures ? 1 : 0);
"""


def patch_app_js():
    src, crlf = load('app.js')
    if 'function v4DeckPanelHtml(' in src:
        print('app.js: already patched')
        return
    src = must_replace(src, "  chevd:'<path d=\"m6 9 6 6 6-6\"/>',\n", '', 'icons dedupe') if "  chevd:'<path d=\"m6 9 6 6 6-6\"/>',\n" in src else src
    src = must_replace(src, "  chev:'<path d=\"m9 6 6 6-6 6\"/>'\n};", "  chev:'<path d=\"m9 6 6 6-6 6\"/>',\n" + ICONS_EXTRA.rstrip(',\n') + "\n};", 'icons')
    src = replace_fn(src, 'vcDeckCardHtml', DECK_CARD)
    src = replace_fn(src, 'viewDiscover', VIEW_DISCOVER)
    src = replace_fn(src, 'viewChats', VIEW_CHATS)
    src = must_replace(src, '\nfunction viewLikes(){', V4_EXTRA + '\nfunction viewLikes(){', 'v4 extra block')
    src = must_replace(src, "  if (route.indexOf('/chat/') === 0){ var id = parseInt(route.split('/')[2],10);if(!id){navigate('/chats');return;}return viewChat(id); }",
                       "  if (route.indexOf('/chat/') === 0){ var id = parseInt(route.split('/')[2],10);if(!id){navigate('/chats');return;}viewChat(id);v4ObserveChat(id);return; }", 'router chat')
    src = must_replace(src, "  if (route === '/profile') return viewProfile();", "  if (route === '/profile'){ viewProfile();v4AfterRender(v4ProfileExtras);return; }", 'router profile')
    src = must_replace(src, "  if (route === '/settings') return viewSettings();", "  if (route === '/settings'){ viewSettings();v4AfterRender(v4SettingsNav);return; }", 'router settings')
    save('app.js', src, crlf)
    print('app.js: patched')


def patch_i18n():
    src, crlf = load('i18n-extra.js')
    if 'v4_select_chat' in src:
        print('i18n-extra.js: already patched')
        return
    save('i18n-extra.js', src.rstrip('\n') + '\n' + I18N_BLOCK, crlf)
    print('i18n-extra.js: patched')


def patch_sw():
    src, crlf = load('sw.js')
    if 'v1.10.1-redesign-v4' in src:
        print('sw.js: already patched')
        return
    src = must_replace(src, "const VERSION = 'v1.10.0-redesign-v4';", "const VERSION = 'v1.10.1-redesign-v4';", 'sw version')
    save('sw.js', src, crlf)
    print('sw.js: patched')


def add_test():
    p = APP / 'tests' / 'redesign_v4_screens_contract.js'
    p.write_text(NEW_TEST, encoding='utf-8')
    print('redesign_v4_screens_contract.js: written')


if __name__ == '__main__':
    patch_app_js()
    patch_i18n()
    patch_sw()
    add_test()
    print('done')
