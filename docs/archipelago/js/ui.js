/* THE QUIET ARCHIPELAGO — title screen, pause menu, archipelago map chart,
   settings, ending/credits, toasts. Pure DOM (no canvas). One IIFE; sets
   G.ui.* (loaded BEFORE main.js, so every key is defined here). All CSS lives
   in one injected <style>, every class prefixed `ui-`. Screens remove their
   own DOM + listeners on close — no leaks, re-openable. See ../DESIGN.md. */
(function () {
'use strict';

/* ui.js loads BEFORE main.js; main.js only fills in missing G.ui keys. Create
   the namespace here so our assignments land. */
var G = window.G;
G.ui = G.ui || {};

/* island flag prefixes (DESIGN.md) — id -> prefix used for '<prefix>.done' */
var PREFIX = {
  'beacon-rock': 'br', 'dunes': 'dn', 'huffman-wood': 'hw', 'strait': 'st',
  'caverns': 'ec', 'spires': 'ms', 'grand-beacon': 'gb',
};

/* the eight things the player learns, shown slowly in the credits */
var LEARNED = [
  'bits & questions',
  'surprisal & entropy',
  'prefix codes & Huffman trees',
  'noisy channels & redundancy',
  'parity & syndromes',
  'compression & repetition',
  'mutual information',
  'prediction',
];

/* ---------------- one-time stylesheet ---------------- */

var STYLE = [
'.ui-screen{position:fixed;inset:0;z-index:100;color:var(--text);',
'  font-family:"Segoe UI",system-ui,sans-serif;overflow:hidden;}',
'.ui-fadein{animation:ui-fade .5s ease both;}',
'@keyframes ui-fade{from{opacity:0}to{opacity:1}}',

/* ===== title seascape ===== */
'.ui-title{display:flex;flex-direction:column;align-items:center;',
'  justify-content:center;background:linear-gradient(180deg,#0a1326 0%,#0d1b34 38%,#102544 68%,#0c1e3a 100%);}',
'.ui-sky{position:absolute;inset:0;overflow:hidden;}',
'.ui-glow{position:absolute;left:50%;top:24%;width:140vmax;height:80vmax;',
'  transform:translate(-50%,-50%);pointer-events:none;',
'  background:radial-gradient(ellipse at center,rgba(56,103,170,.35),rgba(10,19,38,0) 60%);}',
/* parallax wave bands — layered rolling crests across the lower screen */
'.ui-wave{position:absolute;left:-25%;width:150%;height:40vmax;',
'  border-radius:42% 58% 0 0/100% 100% 0 0;will-change:transform;}',
'.ui-wave1{bottom:0;height:22vmax;background:linear-gradient(180deg,#1a497f,#0f2c52);',
'  box-shadow:0 -2px 0 rgba(120,185,255,.18);animation:ui-drift1 17s ease-in-out infinite;opacity:.96;}',
'.ui-wave2{bottom:7vmax;height:26vmax;background:linear-gradient(180deg,#143a68,#0c2444);',
'  box-shadow:0 -2px 0 rgba(110,170,240,.15);animation:ui-drift2 25s ease-in-out infinite;opacity:.9;}',
'.ui-wave3{bottom:13vmax;height:30vmax;background:linear-gradient(180deg,#102d54,#0a1d38);',
'  box-shadow:0 -2px 0 rgba(90,150,220,.12);animation:ui-drift1 33s ease-in-out infinite reverse;opacity:.82;}',
'@keyframes ui-drift1{0%,100%{transform:translateX(-3%) translateY(0)}50%{transform:translateX(3%) translateY(-1.2vmax)}}',
'@keyframes ui-drift2{0%,100%{transform:translateX(2.5%) translateY(0)}50%{transform:translateX(-2.5%) translateY(1vmax)}}',
/* distant lighthouse silhouette on a little headland + pulsing light */
'.ui-lh{position:absolute;right:11%;bottom:15vmax;width:46px;height:140px;z-index:3;',
'  filter:drop-shadow(0 8px 14px rgba(0,0,0,.55));}',
'.ui-lh .ui-lh-rock{position:absolute;left:50%;bottom:0;width:78px;height:30px;margin-left:-39px;',
'  background:#0a1322;border-radius:50% 50% 0 0/100% 100% 0 0;}',
'.ui-lh .ui-lh-body{position:absolute;left:50%;bottom:24px;width:30px;height:92px;margin-left:-15px;',
'  background:linear-gradient(90deg,#0c1730,#26365c 48%,#0c1730);',
'  clip-path:polygon(22% 100%,78% 100%,66% 0,34% 0);}',
'.ui-lh .ui-lh-stripe{position:absolute;left:50%;bottom:60px;width:24px;height:14px;margin-left:-12px;',
'  background:rgba(251,191,36,.22);clip-path:polygon(8% 100%,92% 100%,86% 0,14% 0);}',
'.ui-lh .ui-lh-cap{position:absolute;left:50%;bottom:116px;width:34px;height:16px;margin-left:-17px;',
'  background:#0a1322;border-radius:7px 7px 0 0;}',
'.ui-lh .ui-lh-cap:after{content:"";position:absolute;left:50%;top:-9px;width:5px;height:9px;',
'  margin-left:-2.5px;background:#0a1322;}',
'.ui-lh .ui-lh-room{position:absolute;left:50%;bottom:106px;width:22px;height:14px;margin-left:-11px;',
'  background:linear-gradient(180deg,#5a4316,#2a1f0a);border-radius:3px;}',
'.ui-lh .ui-lh-lamp{position:absolute;left:50%;bottom:109px;width:12px;height:10px;margin-left:-6px;',
'  border-radius:50%;background:var(--gold);box-shadow:0 0 12px 5px rgba(251,191,36,.9);',
'  animation:ui-pulse 3.6s ease-in-out infinite;z-index:1;}',
'.ui-lh .ui-lh-beam{position:absolute;left:50%;bottom:104px;width:0;height:0;margin-left:-2px;',
'  border-left:200px solid rgba(251,191,36,.09);border-top:30px solid transparent;',
'  border-bottom:30px solid transparent;transform-origin:left center;',
'  animation:ui-sweep 7.2s ease-in-out infinite;}',
'@keyframes ui-pulse{0%,100%{opacity:.45;box-shadow:0 0 6px 2px rgba(251,191,36,.5)}',
'  50%{opacity:1;box-shadow:0 0 16px 7px rgba(251,191,36,1)}}',
'@keyframes ui-sweep{0%,100%{opacity:0;transform:rotate(14deg)}45%{opacity:.7}55%{opacity:.7;transform:rotate(-30deg)}}',
/* floating specks */
'.ui-speck{position:absolute;color:var(--gold);font-size:12px;opacity:.0;pointer-events:none;',
'  text-shadow:0 0 6px rgba(251,191,36,.8);animation:ui-float linear infinite;}',
'@keyframes ui-float{0%{transform:translateY(8vh) scale(.6);opacity:0}',
'  12%{opacity:.9}88%{opacity:.7}100%{transform:translateY(-96vh) scale(1);opacity:0}}',

/* title text + menu */
'.ui-title-inner{position:relative;z-index:5;display:flex;flex-direction:column;align-items:center;',
'  text-align:center;padding:1rem;max-width:540px;}',
'.ui-h1{font-size:clamp(1.7rem,7vw,3.1rem);font-weight:800;letter-spacing:.16em;line-height:1.05;',
'  background:linear-gradient(180deg,#fff,#cfe3ff 55%,#8fb6e8);-webkit-background-clip:text;background-clip:text;',
'  -webkit-text-fill-color:transparent;text-shadow:0 4px 30px rgba(40,90,160,.5);}',
'.ui-sub{margin-top:.7rem;color:var(--blue);letter-spacing:.34em;text-transform:uppercase;',
'  font-size:clamp(.62rem,2.6vw,.8rem);opacity:.92;}',
'.ui-menu{display:flex;flex-direction:column;gap:.7rem;margin-top:2rem;width:min(280px,82vw);}',
'.ui-btn{display:block;width:100%;min-height:48px;padding:.7rem 1.2rem;border-radius:11px;cursor:pointer;',
'  font-size:1rem;font-family:inherit;transition:transform .12s,border-color .15s,color .15s,background .15s;',
'  border:2px solid var(--surface2);background:rgba(20,32,58,.72);color:var(--text);}',
'.ui-btn:hover:not(:disabled){border-color:var(--blue);color:var(--blue);transform:translateY(-1px);}',
'.ui-btn:disabled{opacity:.35;cursor:default;}',
'.ui-btn-primary{background:var(--blue);border-color:var(--blue);color:#08111f;font-weight:700;}',
'.ui-btn-primary:hover:not(:disabled){background:#54c8fb;color:#08111f;border-color:#54c8fb;}',
'.ui-btn-danger{border-color:var(--red);color:var(--red);background:transparent;}',
'.ui-btn-danger:hover{background:rgba(248,113,113,.12);}',
'.ui-foot{margin-top:1.8rem;z-index:5;position:relative;}',
'.ui-foot a{color:var(--dim);font-size:.78rem;text-decoration:none;border-bottom:1px dotted var(--dim);}',
'.ui-foot a:hover{color:var(--blue);border-color:var(--blue);}',

/* ===== overlay panels (menu / settings / map) ===== */
'.ui-dim{position:fixed;inset:0;z-index:100;background:rgba(5,9,20,.62);backdrop-filter:blur(2px);',
'  display:flex;align-items:center;justify-content:center;padding:1rem;animation:ui-fade .2s ease both;}',
'.ui-panel{width:min(420px,100%);max-height:92vh;overflow:auto;background:linear-gradient(180deg,#12203c,#0e1830);',
'  border:2px solid var(--surface2);border-radius:16px;padding:1.4rem;box-shadow:0 18px 60px rgba(0,0,0,.6);',
'  animation:ui-pop .22s cubic-bezier(.2,.9,.3,1.2) both;}',
'@keyframes ui-pop{from{opacity:0;transform:scale(.94) translateY(10px)}to{opacity:1;transform:none}}',
'.ui-panel-h{font-size:.74rem;letter-spacing:.22em;text-transform:uppercase;color:var(--blue);',
'  text-align:center;margin-bottom:.3rem;}',
'.ui-panel-sub{text-align:center;color:var(--muted);font-size:.85rem;margin-bottom:1.1rem;}',
'.ui-panel .ui-menu{margin-top:0;width:100%;}',
'.ui-stat{display:flex;justify-content:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;}',
'.ui-chip{background:rgba(10,15,30,.6);border:1px solid rgba(251,191,36,.28);color:var(--gold);',
'  padding:.3rem .8rem;border-radius:99px;font-size:.9rem;}',
'.ui-chip.ui-hat{border-color:rgba(167,139,250,.4);color:var(--purple);}',

/* settings rows */
'.ui-set-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem;',
'  padding:.55rem 0;border-bottom:1px solid rgba(71,85,105,.35);}',
'.ui-set-row:last-of-type{border-bottom:none;}',
'.ui-set-label{font-size:.92rem;}',
'.ui-seg{display:flex;border:1px solid var(--surface2);border-radius:9px;overflow:hidden;}',
'.ui-seg button{min-height:40px;min-width:48px;padding:.3rem .7rem;border:none;cursor:pointer;',
'  background:transparent;color:var(--muted);font-family:inherit;font-size:.85rem;}',
'.ui-seg button.on{background:var(--blue);color:#08111f;font-weight:700;}',
'.ui-back{margin-top:1.1rem;}',
'.ui-slider{flex:1 1 120px;max-width:190px;accent-color:var(--blue);min-height:40px;cursor:pointer;}',

/* wardrobe */
'.ui-ward{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin:.2rem 0 .7rem;}',
'.ui-ward .ui-set-label{margin-right:.2rem;}',
'.ui-ward-b{min-height:36px;padding:.25rem .6rem;border:1px solid var(--surface2);border-radius:9px;',
'  background:transparent;color:var(--muted);font-family:inherit;font-size:.82rem;cursor:pointer;}',
'.ui-ward-b.on{border-color:var(--purple);color:var(--purple);font-weight:700;}',

/* ===== map chart ===== */
'.ui-map .ui-panel{width:min(560px,100%);}',
'.ui-chart{position:relative;width:100%;border-radius:12px;padding:.4rem;margin:.4rem 0 1rem;',
'  background:radial-gradient(ellipse at 50% 35%,#3a3826,#2a2718 60%,#221f12);',
'  border:1px solid #5c5436;box-shadow:inset 0 0 60px rgba(0,0,0,.45),inset 0 0 0 1px rgba(120,100,60,.2);}',
'.ui-chart svg{display:block;width:100%;height:auto;}',
'.ui-leg{display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;color:var(--muted);font-size:.78rem;}',

/* ===== ending ===== */
'.ui-end{background:#04070f;display:flex;flex-direction:column;align-items:center;justify-content:center;',
'  text-align:center;padding:1.4rem;}',
'.ui-end-names{display:flex;flex-direction:column;gap:.55rem;align-items:center;margin-bottom:1.6rem;}',
'.ui-end-name{font-size:clamp(1rem,4.4vw,1.5rem);letter-spacing:.14em;color:#33425c;opacity:.25;',
'  transition:color 1s,opacity 1s,text-shadow 1s;}',
'.ui-end-name.lit{color:#fff;opacity:1;text-shadow:0 0 18px rgba(251,191,36,.9);}',
'.ui-end-name .ui-ping{color:var(--gold);margin-left:.5rem;opacity:0;}',
'.ui-end-name.lit .ui-ping{animation:ui-ping 1s ease both;}',
'@keyframes ui-ping{0%{opacity:0;transform:scale(.3)}40%{opacity:1;transform:scale(1.4)}100%{opacity:1;transform:scale(1)}}',
'.ui-end-tag{font-size:clamp(1rem,4.6vw,1.5rem);letter-spacing:.2em;color:var(--gold);opacity:0;',
'  text-shadow:0 0 24px rgba(251,191,36,.6);transition:opacity 1.4s;}',
'.ui-end-tag.show{opacity:1;}',
/* credits */
'.ui-credits{position:relative;width:min(540px,92vw);overflow:hidden;}',
'.ui-credits-scroll{display:flex;flex-direction:column;align-items:center;gap:1.4rem;}',
'.ui-cr-title{font-size:clamp(1.3rem,6vw,2rem);font-weight:800;letter-spacing:.14em;',
'  background:linear-gradient(180deg,#fff,#9fc1ee);-webkit-background-clip:text;background-clip:text;',
'  -webkit-text-fill-color:transparent;}',
'.ui-cr-line{color:var(--muted);font-size:.95rem;}',
'.ui-cr-sec{color:var(--blue);letter-spacing:.26em;text-transform:uppercase;font-size:.78rem;margin-top:1rem;}',
'.ui-cr-item{color:var(--text);font-size:1rem;opacity:0;transform:translateY(6px);',
'  transition:opacity .6s,transform .6s;}',
'.ui-cr-item.show{opacity:1;transform:none;}',
'.ui-cr-item .ui-dot{color:var(--gold);margin-right:.5rem;}',
'.ui-end-final{font-size:clamp(1.05rem,4.6vw,1.4rem);color:#fff;margin:1.4rem 0 .4rem;',
'  text-shadow:0 0 20px rgba(56,189,248,.4);}',
'.ui-skip{position:fixed;right:1rem;bottom:1rem;z-index:120;color:var(--dim);font-size:.78rem;',
'  opacity:0;transition:opacity .5s;}',
'.ui-skip.show{opacity:.8;}',

/* mobile tightening */
'@media (max-width:420px){.ui-panel{padding:1.1rem;}.ui-h1{letter-spacing:.1em;}.ui-sub{letter-spacing:.24em;}}',
].join('\n');

function ensureStyle() {
  if (document.getElementById('ui-style')) return;
  var s = document.createElement('style');
  s.id = 'ui-style';
  s.textContent = STYLE;
  (document.head || document.documentElement).appendChild(s);
}

/* ---------------- small helpers ---------------- */

function el(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function btn(label, cls, onClick) {
  var b = el('button', 'ui-btn' + (cls ? ' ' + cls : ''));
  b.textContent = label;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}
function hasSave() {
  return !!(G.save && G.save.data && G.save.data.started);
}
function sfx(name) { try { if (G.audio && G.audio.sfx) G.audio.sfx(name); } catch (e) {} }

/* a keydown listener that's auto-removed when the owning screen closes */
function keyScope() {
  var fn = null;
  return {
    bind: function (handler) {
      fn = handler;
      document.addEventListener('keydown', fn, true);
    },
    release: function () {
      if (fn) document.removeEventListener('keydown', fn, true);
      fn = null;
    },
  };
}

/* ============================================================ TITLE */

var titleEl = null, titleKeys = null;

function closeTitle() {
  if (titleKeys) { titleKeys.release(); titleKeys = null; }
  if (titleEl) { titleEl.remove(); titleEl = null; }
}

G.ui.openTitle = function () {
  ensureStyle();
  closeTitle();
  G.state = 'title';

  var screen = el('div', 'ui-screen ui-title ui-fadein');

  /* animated seascape (pure CSS/DOM) */
  var sky = el('div', 'ui-sky');
  sky.appendChild(el('div', 'ui-glow'));
  sky.appendChild(el('div', 'ui-wave ui-wave1'));
  sky.appendChild(el('div', 'ui-wave ui-wave2'));
  sky.appendChild(el('div', 'ui-wave ui-wave3'));
  var lh = el('div', 'ui-lh',
    '<div class="ui-lh-beam"></div><div class="ui-lh-rock"></div>' +
    '<div class="ui-lh-body"></div><div class="ui-lh-stripe"></div>' +
    '<div class="ui-lh-room"></div><div class="ui-lh-cap"></div>' +
    '<div class="ui-lh-lamp"></div>');
  sky.appendChild(lh);
  for (var i = 0; i < 14; i++) {
    var sp = el('div', 'ui-speck', '✦');
    var dur = 9 + (i % 5) * 3;
    sp.style.left = (4 + (i * 6.7) % 92) + '%';
    sp.style.bottom = '-12px';
    sp.style.fontSize = (8 + (i % 4) * 3) + 'px';
    sp.style.animationDuration = dur + 's';
    sp.style.animationDelay = (-(i * 1.3) % dur) + 's';
    sky.appendChild(sp);
  }
  screen.appendChild(sky);

  /* title + menu */
  var inner = el('div', 'ui-title-inner');
  inner.appendChild(el('div', 'ui-h1', 'THE QUIET<br>ARCHIPELAGO'));
  inner.appendChild(el('div', 'ui-sub', 'an information theory adventure'));

  var menu = el('div', 'ui-menu');
  var firstBtn = null;

  if (hasSave()) {
    var bCont = btn('Continue', 'ui-btn-primary', function () {
      sfx('select'); closeTitle();
      if (G.game && G.game.continueGame) G.game.continueGame();
    });
    menu.appendChild(bCont);
    firstBtn = bCont;
  }

  var bNew = btn('New game', hasSave() ? '' : 'ui-btn-primary', function () {
    sfx('select');
    if (hasSave() && !window.confirm('Start a new game? Your current journey will be overwritten.')) return;
    closeTitle();
    if (G.game && G.game.newGame) G.game.newGame();
  });
  menu.appendChild(bNew);
  if (!firstBtn) firstBtn = bNew;
  if (!(G.islands && G.islands.list && G.islands.list()[0])) {
    bNew.disabled = true;
    if (firstBtn === bNew && hasSave()) { /* keep continue */ }
  }

  menu.appendChild(btn('Settings', '', function () {
    sfx('select'); openSettings('title');
  }));
  inner.appendChild(menu);
  screen.appendChild(inner);

  var foot = el('div', 'ui-foot',
    '<a href="../">from the Information Theory course</a>');
  screen.appendChild(foot);

  document.body.appendChild(screen);
  titleEl = screen;

  /* Enter triggers the first button */
  titleKeys = keyScope();
  titleKeys.bind(function (e) {
    if (e.key === 'Enter' && firstBtn && !firstBtn.disabled) {
      e.preventDefault(); e.stopPropagation();
      firstBtn.click();
    }
  });
};

/* ============================================================ PAUSE MENU */

var menuEl = null, menuKeys = null;

function closeMenu() {
  if (menuKeys) { menuKeys.release(); menuKeys = null; }
  if (menuEl) { menuEl.remove(); menuEl = null; }
}
function resumeFromMenu() {
  sfx('close');
  closeMenu();
  G.state = 'world';
  G.paused = false;
}

G.ui.openMenu = function () {
  ensureStyle();
  if (menuEl) return;
  closeAnyTransientOverlay();
  G.state = 'menu';
  G.paused = true;
  sfx('open');

  var dim = el('div', 'ui-dim ui-menu-screen');
  dim.addEventListener('mousedown', function (e) { if (e.target === dim) resumeFromMenu(); });

  var panel = el('div', 'ui-panel');
  panel.appendChild(el('div', 'ui-panel-h', 'Paused'));

  var stat = el('div', 'ui-stat');
  stat.appendChild(el('span', 'ui-chip', '✦ ' + sparkCount() + '/21'));
  var hat = G.sparks && G.sparks.wornHat ? G.sparks.wornHat() : null;
  if (hat) stat.appendChild(el('span', 'ui-chip ui-hat', hatLabel(hat)));
  panel.appendChild(stat);

  /* wardrobe: pick any earned hat (appears once the first hat is earned) */
  var earned = (G.sparks && G.sparks.unlockedHats) ? G.sparks.unlockedHats() : [];
  if (earned.length) {
    var ward = el('div', 'ui-ward');
    ward.appendChild(el('span', 'ui-set-label', 'Wardrobe'));
    var opts = [{ id: 'auto', label: 'Auto' }, { id: 'none', label: 'None' }]
      .concat(earned.map(function (h) { return { id: h, label: hatLabel(h) }; }));
    var cur = G.sparks.hatChoice();
    opts.forEach(function (o) {
      var b = el('button', 'ui-ward-b' + (cur === o.id ? ' on' : ''), o.label);
      b.addEventListener('click', function () {
        sfx('select');
        G.sparks.setHatChoice(o.id);
        Array.prototype.forEach.call(ward.querySelectorAll('.ui-ward-b'), function (c) { c.classList.remove('on'); });
        b.classList.add('on');
        var worn = G.sparks.wornHat();
        var chips = stat.querySelector('.ui-hat');
        if (chips) chips.remove();
        if (worn) stat.appendChild(el('span', 'ui-chip ui-hat', hatLabel(worn)));
      });
      ward.appendChild(b);
    });
    panel.appendChild(ward);
  }

  var menu = el('div', 'ui-menu');
  menu.appendChild(btn('Resume', 'ui-btn-primary', resumeFromMenu));
  menu.appendChild(btn('Archipelago map', '', function () {
    closeMenu(); G.ui.openMapScreen(); // map manages its own state
  }));
  if (G.ui.openCodex) {
    var cdxCount = (G.codex && G.codex.count) ? G.codex.count() : null;
    menu.appendChild(btn('Field notes' + (cdxCount ? ' · ' + cdxCount.unlocked + '/' + cdxCount.total : ''), '', function () {
      closeMenu(); G.ui.openCodex();
    }));
  }
  menu.appendChild(btn('Settings', '', function () { openSettings('menu'); }));
  menu.appendChild(btn('Save & quit to title', '', function () {
    sfx('select'); closeMenu();
    G.paused = false;
    G.ui.openTitle(); // autosave is continuous; just show the title
  }));
  panel.appendChild(menu);

  dim.appendChild(panel);
  document.body.appendChild(dim);
  menuEl = dim;

  /* our own Escape listener (engine's Escape won't fire: G.state==='menu') */
  menuKeys = keyScope();
  menuKeys.bind(function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); resumeFromMenu(); }
  });
};

/* ============================================================ SETTINGS */

var settingsEl = null, settingsKeys = null, settingsReturn = null;

function closeSettings() {
  if (settingsKeys) { settingsKeys.release(); settingsKeys = null; }
  if (settingsEl) { settingsEl.remove(); settingsEl = null; }
}

/* origin: 'title' | 'menu' — controls where Back returns */
function openSettings(origin) {
  ensureStyle();
  closeSettings();
  settingsReturn = origin;
  sfx('open');

  var dim = el('div', 'ui-dim ui-settings-screen');
  var panel = el('div', 'ui-panel');
  panel.appendChild(el('div', 'ui-panel-h', 'Settings'));

  /* sound */
  var sndOn = !(G.audio && G.audio.enabled && G.audio.enabled() === false);
  panel.appendChild(toggleRow('Sound', [
    { label: 'On', on: sndOn, click: function () { setSound(true); } },
    { label: 'Off', on: !sndOn, click: function () { setSound(false); } },
  ]));

  /* volumes (only meaningful while sound is on) */
  panel.appendChild(sliderRow('Music volume', G.audio && G.audio.getVolume ? G.audio.getVolume('music') : 1,
    function (v) { if (G.audio && G.audio.setVolume) G.audio.setVolume('music', v); }));
  panel.appendChild(sliderRow('Effects volume', G.audio && G.audio.getVolume ? G.audio.getVolume('sfx') : 1,
    function (v) { if (G.audio && G.audio.setVolume) G.audio.setVolume('sfx', v); sfx('select'); }));

  /* text speed */
  var tspeed = (G.save && G.save.data && G.save.data.textSpeed) || 'normal';
  panel.appendChild(toggleRow('Text speed', [
    { label: 'Normal', on: tspeed === 'normal', click: function () { setTextSpeed('normal'); } },
    { label: 'Fast', on: tspeed === 'fast', click: function () { setTextSpeed('fast'); } },
    { label: 'Instant', on: tspeed === 'instant', click: function () { setTextSpeed('instant'); } },
  ]));

  /* d-pad */
  var dmode = (G.save && G.save.data && G.save.data.dpad) || 'auto';
  panel.appendChild(toggleRow('On-screen pad', [
    { label: 'Auto', on: dmode === 'auto', click: function () { setDpad('auto'); } },
    { label: 'On', on: dmode === 'on', click: function () { setDpad('on'); } },
    { label: 'Off', on: dmode === 'off', click: function () { setDpad('off'); } },
  ]));

  /* reset (double confirm) */
  var resetRow = el('div', 'ui-set-row');
  resetRow.appendChild(el('span', 'ui-set-label', 'Save'));
  var rb = btn('Reset save', 'ui-btn-danger', function () {
    if (!window.confirm('Reset your save? All progress is lost.')) return;
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    try { if (G.save && G.save.reset) G.save.reset(); } catch (e) {}
    location.reload();
  });
  rb.style.width = 'auto';
  rb.style.minHeight = '40px';
  resetRow.appendChild(rb);
  panel.appendChild(resetRow);

  var back = btn('Back', 'ui-back', function () {
    sfx('close'); closeSettings();
    // origin already onscreen behind us; nothing to reopen
  });
  panel.appendChild(back);

  dim.appendChild(panel);
  dim.addEventListener('mousedown', function (e) { if (e.target === dim) { sfx('close'); closeSettings(); } });
  document.body.appendChild(dim);
  settingsEl = dim;

  settingsKeys = keyScope();
  settingsKeys.bind(function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); sfx('close'); closeSettings(); }
  });
}

function toggleRow(label, opts) {
  var row = el('div', 'ui-set-row');
  row.appendChild(el('span', 'ui-set-label', label));
  var seg = el('div', 'ui-seg');
  opts.forEach(function (o) {
    var b = el('button', o.on ? 'on' : '');
    b.textContent = o.label;
    b.addEventListener('click', function () {
      sfx('select');
      Array.prototype.forEach.call(seg.children, function (c) { c.classList.remove('on'); });
      b.classList.add('on');
      o.click();
    });
    seg.appendChild(b);
  });
  row.appendChild(seg);
  return row;
}

function sliderRow(label, value, onInput) {
  var row = el('div', 'ui-set-row');
  row.appendChild(el('span', 'ui-set-label', label));
  var s = el('input', 'ui-slider');
  s.type = 'range';
  s.min = 0; s.max = 100; s.step = 5;
  s.value = Math.round((value == null ? 1 : value) * 100);
  s.setAttribute('aria-label', label);
  s.addEventListener('input', function () { onInput(s.value / 100); });
  row.appendChild(s);
  return row;
}

function setTextSpeed(v) {
  try {
    if (G.save && G.save.data) G.save.data.textSpeed = v;
    if (G.save && G.save.persist) G.save.persist();
  } catch (e) {}
}

function setSound(on) {
  try { if (G.audio && G.audio.setEnabled) G.audio.setEnabled(on); } catch (e) {}
}
function setDpad(mode) {
  try {
    if (G.save && G.save.data) G.save.data.dpad = mode;
    if (G.save && G.save.persist) G.save.persist();
    if (G.input && G.input.updateDpad) G.input.updateDpad();
  } catch (e) {}
}

/* ============================================================ MAP CHART */

var mapEl = null, mapKeys = null;

function closeMapScreen() {
  if (mapKeys) { mapKeys.release(); mapKeys = null; }
  if (mapEl) { mapEl.remove(); mapEl = null; }
  // returning to the world (map is reachable in-world via M and from the menu)
  G.state = 'world';
  G.paused = false;
}

G.ui.openMapScreen = function () {
  ensureStyle();
  if (mapEl) return;
  closeAnyTransientOverlay();
  G.state = 'map';
  G.paused = true;
  sfx('open');

  var dim = el('div', 'ui-dim ui-map');
  var panel = el('div', 'ui-panel');
  panel.appendChild(el('div', 'ui-panel-h', 'The Archipelago'));
  panel.appendChild(el('div', 'ui-panel-sub', '✦ ' + sparkCount() + ' of 21 sparks gathered'));

  panel.appendChild(buildChart());

  panel.appendChild(el('div', 'ui-leg',
    '<span>✅ done</span><span>📍 here</span>' +
    '<span>⚪ open</span><span>🔒 locked</span>'));

  panel.appendChild(btn('Close', 'ui-back', function () { sfx('close'); closeMapScreen(); }));

  dim.appendChild(panel);
  dim.addEventListener('mousedown', function (e) { if (e.target === dim) { sfx('close'); closeMapScreen(); } });
  document.body.appendChild(dim);
  mapEl = dim;

  mapKeys = keyScope();
  mapKeys.bind(function (e) {
    if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
      e.preventDefault(); e.stopPropagation(); sfx('close'); closeMapScreen();
    }
  });
};

function islandStatus(isl, index, list) {
  var pre = PREFIX[isl.id];
  var done = pre && G.flags && G.flags.has(pre + '.done');
  var here = G.world && G.world.island && G.world.island.id === isl.id;
  if (here) return 'here';
  if (done) return 'done';
  // locked if the previous island isn't done yet (first is always reachable)
  if (index > 0) {
    var prev = list[index - 1];
    var prevPre = PREFIX[prev.id];
    var prevDone = prevPre && G.flags && G.flags.has(prevPre + '.done');
    if (!prevDone) return 'locked';
  }
  return 'open';
}

function buildChart() {
  var wrap = el('div', 'ui-chart');
  var list = (G.islands && G.islands.list && G.islands.list()) || [];
  if (!list.length) list = fakeIslands();

  var W = 520, H = 360, n = list.length;
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'img');

  // winding route: alternate up/down along x, wide vertical swing so each
  // island's label clears its neighbours' blobs
  var pts = [];
  for (var i = 0; i < n; i++) {
    var x = 52 + (W - 104) * (n === 1 ? 0.5 : i / (n - 1));
    var y = H / 2 + Math.sin(i * 1.25 + 0.4) * (H * 0.3);
    pts.push({ x: x, y: y });
  }

  // dotted route path
  var d = 'M ' + pts[0].x + ' ' + pts[0].y;
  for (var j = 1; j < n; j++) {
    var a = pts[j - 1], b = pts[j];
    var mx = (a.x + b.x) / 2;
    d += ' Q ' + mx + ' ' + (a.y) + ' ' + b.x + ' ' + b.y;
  }
  var route = document.createElementNS(svgNS, 'path');
  route.setAttribute('d', d);
  route.setAttribute('fill', 'none');
  route.setAttribute('stroke', '#caa86a');
  route.setAttribute('stroke-width', '2.5');
  route.setAttribute('stroke-dasharray', '2 7');
  route.setAttribute('stroke-linecap', 'round');
  route.setAttribute('opacity', '0.8');
  svg.appendChild(route);

  var BLOB = { done: '#5b8a3a', here: '#fbbf24', open: '#7c8aa0', locked: '#3a4356' };
  var ICON = { done: '✅', here: '📍', open: '⚪', locked: '🔒' };

  for (var k = 0; k < n; k++) {
    var p = pts[k], isl = list[k];
    var st = islandStatus(isl, k, list);
    var g = document.createElementNS(svgNS, 'g');

    // cute blob: a wobbly rounded shape
    var rr = 21;
    var blob = document.createElementNS(svgNS, 'path');
    blob.setAttribute('d', blobPath(p.x, p.y, rr));
    blob.setAttribute('fill', BLOB[st]);
    blob.setAttribute('stroke', st === 'here' ? '#fff7da' : '#0c1422');
    blob.setAttribute('stroke-width', st === 'here' ? '3' : '2');
    if (st === 'locked') blob.setAttribute('opacity', '0.6');
    g.appendChild(blob);

    // little palm / dot decor on top of blob
    var dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y - 4);
    dot.setAttribute('r', '4'); dot.setAttribute('fill', 'rgba(255,255,255,.55)');
    g.appendChild(dot);

    // status icon
    var icon = document.createElementNS(svgNS, 'text');
    icon.setAttribute('x', p.x + 18); icon.setAttribute('y', p.y - 16);
    icon.setAttribute('font-size', '15'); icon.setAttribute('text-anchor', 'middle');
    icon.textContent = ICON[st];
    g.appendChild(icon);

    // number badge
    var num = document.createElementNS(svgNS, 'text');
    num.setAttribute('x', p.x); num.setAttribute('y', p.y + 5);
    num.setAttribute('font-size', '13'); num.setAttribute('font-weight', '700');
    num.setAttribute('text-anchor', 'middle');
    num.setAttribute('fill', st === 'locked' ? '#7e8aa0' : '#0c1422');
    num.textContent = (k + 1);
    g.appendChild(num);

    // name label (above/below depending on row)
    var label = document.createElementNS(svgNS, 'text');
    var below = p.y < H / 2;
    label.setAttribute('x', p.x);
    label.setAttribute('y', p.y + (below ? rr + 18 : -rr - 10));
    label.setAttribute('font-size', '12');
    label.setAttribute('font-weight', '600');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', st === 'locked' ? '#7a6e4a' : '#f1e6c4');
    label.setAttribute('stroke', '#1a1608');
    label.setAttribute('stroke-width', '0.5');
    label.setAttribute('paint-order', 'stroke');
    label.setAttribute('font-family', 'Segoe UI, system-ui, sans-serif');
    label.textContent = isl.name || isl.id;
    g.appendChild(label);

    svg.appendChild(g);
  }

  wrap.appendChild(svg);
  return wrap;
}

function blobPath(cx, cy, r) {
  // an 8-point slightly irregular rounded blob for a hand-drawn island feel
  var pts = [1.0, 0.92, 1.06, 0.9, 1.02, 0.95, 1.04, 0.9];
  var s = '';
  var coords = [];
  for (var i = 0; i < 8; i++) {
    var ang = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    var rad = r * pts[i];
    coords.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad * 0.92 });
  }
  s = 'M ' + coords[0].x.toFixed(1) + ' ' + coords[0].y.toFixed(1);
  for (var k = 0; k < 8; k++) {
    var cur = coords[k], next = coords[(k + 1) % 8];
    var mx = (cur.x + next.x) / 2, my = (cur.y + next.y) / 2;
    s += ' Q ' + cur.x.toFixed(1) + ' ' + cur.y.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
  }
  return s + ' Z';
}

/* ============================================================ ENDING */

var endEl = null, endKeys = null, endTimers = [], endDone = false;

function clearEndTimers() {
  endTimers.forEach(function (t) { clearTimeout(t); });
  endTimers = [];
}
function later(fn, ms) { var t = setTimeout(fn, ms); endTimers.push(t); return t; }

function closeEnding() {
  clearEndTimers();
  if (endKeys) { endKeys.release(); endKeys = null; }
  if (endEl) { endEl.remove(); endEl = null; }
}

G.ui.ending = function () {
  ensureStyle();
  closeEnding();
  endDone = false;
  G.state = 'ending';
  G.paused = true;

  var screen = el('div', 'ui-screen ui-end ui-fadein');
  document.body.appendChild(screen);
  endEl = screen;

  /* skip hint appears after 3s */
  var skip = el('div', 'ui-skip', 'hold on…  Esc to skip');
  document.body.appendChild(skip);
  later(function () { if (skip.parentNode) skip.classList.add('show'); }, 3000);

  endKeys = keyScope();
  endKeys.bind(function (e) {
    if (e.key === 'Escape' && endEl) {
      // only skippable after 3s (when the hint is showing)
      if (!skip.classList.contains('show')) return;
      e.preventDefault(); e.stopPropagation();
      if (skip.parentNode) skip.remove();
      runFinale(); // jump to the final panel
    }
  });

  /* (a) island names light up one by one */
  var list = (G.islands && G.islands.list && G.islands.list()) || fakeIslands();
  var names = el('div', 'ui-end-names');
  var nameEls = [];
  list.forEach(function (isl) {
    var n = el('div', 'ui-end-name');
    n.innerHTML = (isl.name || isl.id) + '<span class="ui-ping">✦</span>';
    names.appendChild(n);
    nameEls.push(n);
  });
  screen.appendChild(names);

  var tag = el('div', 'ui-end-tag', 'the network is awake');
  screen.appendChild(tag);

  nameEls.forEach(function (n, i) {
    later(function () {
      if (!endEl) return;
      n.classList.add('lit');
      sfx('beacon');
    }, 800 + i * 1000);
  });
  var afterNames = 800 + nameEls.length * 1000;
  later(function () { if (endEl) tag.classList.add('show'); }, afterNames);

  /* (b) credits */
  later(function () { if (endEl) showCredits(screen, names, tag); }, afterNames + 1800);
};

function showCredits(screen, names, tag) {
  if (!endEl) return;
  names.style.transition = 'opacity 1s';
  tag.style.transition = 'opacity 1s';
  names.style.opacity = '0';
  tag.style.opacity = '0';

  var creditsWrap = el('div', 'ui-credits');
  var scroll = el('div', 'ui-credits-scroll');
  scroll.appendChild(el('div', 'ui-cr-title', 'THE QUIET ARCHIPELAGO'));
  scroll.appendChild(el('div', 'ui-cr-line', 'made with the Information Theory course'));
  scroll.appendChild(el('div', 'ui-cr-sec', 'What you learned'));

  var items = [];
  LEARNED.forEach(function (txt) {
    var it = el('div', 'ui-cr-item', '<span class="ui-dot">✦</span>' + txt);
    scroll.appendChild(it);
    items.push(it);
  });
  creditsWrap.appendChild(scroll);

  later(function () {
    if (!endEl) return;
    names.remove(); tag.remove();
    screen.appendChild(creditsWrap);
    creditsWrap.classList.add('ui-fadein');
    items.forEach(function (it, i) {
      later(function () { if (endEl) it.classList.add('show'); }, 400 + i * 650);
    });
    var afterItems = 400 + items.length * 650 + 900;
    later(function () { if (endEl) runFinale(); }, afterItems);
  }, 1000);
}

function runFinale() {
  if (!endEl || endDone) return;
  endDone = true;
  clearEndTimers();
  var skip = document.querySelector('.ui-skip');
  if (skip) skip.remove();

  // clear current content, show the final beat
  endEl.innerHTML = '';
  endEl.classList.add('ui-fadein');
  var final = el('div', 'ui-end-final', 'Pip will keep delivering.');
  endEl.appendChild(final);

  var menu = el('div', 'ui-menu');
  menu.style.marginTop = '1.4rem';
  menu.appendChild(btn('Keep wandering', 'ui-btn-primary', function () {
    sfx('select');
    try { if (G.flags && G.flags.set) G.flags.set('game.finished'); } catch (e) {}
    closeEnding();
    G.state = 'world';
    G.paused = false;
  }));
  menu.appendChild(btn('Title', '', function () {
    sfx('select');
    try { if (G.flags && G.flags.set) G.flags.set('game.finished'); } catch (e) {}
    closeEnding();
    G.paused = false;
    G.ui.openTitle();
  }));
  endEl.appendChild(menu);
}

/* ============================================================ TOASTS */

var toastWrap = null;

function ensureToastWrap() {
  toastWrap = document.getElementById('ui-toasts');
  if (toastWrap) return toastWrap;
  // reuse the engine's wrap if present so positioning matches
  var existing = document.getElementById('toasts');
  if (existing) { toastWrap = existing; return toastWrap; }
  toastWrap = el('div', '');
  toastWrap.id = 'ui-toasts';
  toastWrap.style.cssText = 'position:fixed;bottom:7.5rem;left:50%;transform:translateX(-50%);' +
    'z-index:90;display:flex;flex-direction:column;gap:.4rem;align-items:center;pointer-events:none;';
  document.body.appendChild(toastWrap);
  return toastWrap;
}

G.ui.toast = function (text) {
  ensureStyle();
  var wrap = ensureToastWrap();
  // rapid repeated fails (puzzle gates) must not pile up: drop same-text
  // toasts still on screen, and cap the stack at 3.
  for (var i = wrap.children.length - 1; i >= 0; i--) {
    if (wrap.children[i].textContent === text) wrap.children[i].remove();
  }
  while (wrap.children.length >= 3) wrap.firstChild.remove();
  var t = el('div', 'toast'); // reuse style.css .toast look
  t.textContent = text;
  wrap.appendChild(t);
  setTimeout(function () { t.classList.add('out'); }, 2400);
  setTimeout(function () { t.remove(); }, 2900);
};

G.ui.islandToast = function (name) {
  ensureStyle();
  var elt = document.getElementById('island-toast');
  if (!elt) {
    elt = el('div', '');
    elt.id = 'island-toast';
    document.body.appendChild(elt);
  }
  elt.textContent = name;
  elt.classList.remove('show');
  void elt.offsetWidth; // reflow to restart the animation
  elt.classList.add('show');
};

/* ============================================================ shared utils */

function sparkCount() {
  try { return (G.sparks && G.sparks.count) ? G.sparks.count() : 0; } catch (e) { return 0; }
}
function hatLabel(hat) {
  if (hat === 'crown') return '👑 Crown';
  if (hat === 'sunhat') return '👒 Sun hat';
  if (hat === 'cap') return '🧢 Cap';
  return '';
}

/* If a transient overlay (menu/map/settings) is open when another opens,
   tear down its DOM + listeners (no state side-effects — the opener sets
   G.state itself). Only one panel lives at a time. */
function closeAnyTransientOverlay() {
  if (menuKeys) { menuKeys.release(); menuKeys = null; }
  if (menuEl) { menuEl.remove(); menuEl = null; }
  if (mapKeys) { mapKeys.release(); mapKeys = null; }
  if (mapEl) { mapEl.remove(); mapEl = null; }
  closeSettings();
}

/* fallback island list for harnesses where no islands are registered */
function fakeIslands() {
  return [
    { id: 'beacon-rock', name: 'Beacon Rock' },
    { id: 'dunes', name: 'The Dune of Surprises' },
    { id: 'huffman-wood', name: 'Huffman Wood' },
    { id: 'strait', name: 'The Static Strait' },
    { id: 'caverns', name: 'Echo Caverns' },
    { id: 'spires', name: 'Mirror Spires' },
    { id: 'grand-beacon', name: 'The Grand Beacon' },
  ];
}

})();
