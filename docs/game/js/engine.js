/* SIGNAL LOST — engine. Screens, registry, persistence, unlocks, sfx.
   Contract for minigames lives in ../DESIGN.md. */
(function () {
'use strict';

var STORE_KEY = 'signal-lost-v1';
var BOSS_PART = 7;
var BOSS_STARS_REQUIRED = 12;

var PART_INFO = {
  1: { name: 'Part 1 · Entropy & Information', color: 'var(--blue)' },
  2: { name: 'Part 2 · Source Coding', color: 'var(--purple)' },
  3: { name: 'Part 3 · The Noisy Channel', color: 'var(--pink)' },
  4: { name: 'Part 4 · Error-Correcting Codes', color: 'var(--orange)' },
  6: { name: 'Part 6 · Learning & Prediction', color: 'var(--cyan)' },
  7: { name: 'Finale', color: 'var(--gold)' },
};

var RANKS = [
  [0, 'Static'],
  [25, 'Noise Intern'],
  [70, 'Parity Checker'],
  [130, 'Code Smith'],
  [200, 'Channel Rider'],
  [300, 'Entropy Wrangler'],
  [420, "Maxwell's Demon"],
];

var games = [];
var state = load();
var screen = null;
var screenName = 'title';
var current = null;     // { def, instance } while a minigame is mounted
var runActive = false;  // guards double api.complete
var booted = false;

/* ---------------- persistence ---------------- */

function load() {
  var base = { stars: {}, bits: {}, muted: false };
  try {
    var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    if (raw && typeof raw === 'object') {
      if (raw.stars && typeof raw.stars === 'object') base.stars = raw.stars;
      if (raw.bits && typeof raw.bits === 'object') base.bits = raw.bits;
      base.muted = !!raw.muted;
    }
  } catch (e) { /* fresh start */ }
  return base;
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

function starsOf(id) { return state.stars[id] || 0; }
function totalStars() {
  return games.reduce(function (a, g) { return a + starsOf(g.id); }, 0);
}
function totalBits() {
  return games.reduce(function (a, g) { return a + (state.bits[g.id] || 0); }, 0);
}
function rankName() {
  var r = RANKS[0][1], b = totalBits();
  for (var i = 0; i < RANKS.length; i++) if (b >= RANKS[i][0]) r = RANKS[i][1];
  return r;
}
function hasProgress() { return totalStars() > 0 || totalBits() > 0; }

/* ---------------- unlocks ---------------- */

function partList() {
  var seen = {};
  var parts = [];
  games.forEach(function (g) { if (!seen[g.part]) { seen[g.part] = true; parts.push(g.part); } });
  return parts.sort(function (a, b) { return a - b; });
}

function partHasStar(p) {
  return games.some(function (g) { return g.part === p && starsOf(g.id) >= 1; });
}

function isUnlocked(def) {
  if (def.part === BOSS_PART) return totalStars() >= BOSS_STARS_REQUIRED;
  var parts = partList().filter(function (p) { return p !== BOSS_PART; });
  var idx = parts.indexOf(def.part);
  if (idx <= 0) return true;
  return partHasStar(parts[idx - 1]);
}

function lockReason(def) {
  if (def.part === BOSS_PART) {
    return 'Requires ' + BOSS_STARS_REQUIRED + ' ★ across the network — you have ' + totalStars() + '.';
  }
  var parts = partList().filter(function (p) { return p !== BOSS_PART; });
  var idx = parts.indexOf(def.part);
  var prev = PART_INFO[parts[idx - 1]];
  return 'Earn a star in ' + (prev ? prev.name.split(' · ')[0] : 'the previous part') + ' first.';
}

function unlockedIds() {
  return games.filter(isUnlocked).map(function (g) { return g.id; });
}

/* ---------------- audio ---------------- */

var actx = null;

function tone(freq, dur, delay, type, gain) {
  var t = actx.currentTime + (delay || 0);
  var o = actx.createOscillator();
  var g = actx.createGain();
  o.type = type || 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain || 0.04, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function sfx(name) {
  if (state.muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    switch (name) {
      case 'click': tone(660, 0.05); break;
      case 'tick': tone(990, 0.03, 0, 'sine', 0.025); break;
      case 'good': tone(880, 0.07); tone(1320, 0.09, 0.07); break;
      case 'bad': tone(220, 0.16, 0, 'sawtooth', 0.05); break;
      case 'win': [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.12, i * 0.09); }); break;
      case 'lose': [392, 330, 262].forEach(function (f, i) { tone(f, 0.14, i * 0.11, 'sawtooth', 0.045); }); break;
    }
  } catch (e) { /* no audio: fine */ }
}

/* ---------------- dom helpers ---------------- */

function el(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function starsHtml(n, max) {
  max = max || 3;
  var out = '';
  for (var i = 0; i < max; i++) out += i < n ? '★' : '<span class="off">★</span>';
  return out;
}

function teardownInstance() {
  if (current) {
    try { if (current.instance && current.instance.destroy) current.instance.destroy(); }
    catch (e) { /* a broken destroy must not brick navigation */ }
    current = null;
  }
  runActive = false;
}

function setScreen(name, node) {
  teardownInstance();
  screenName = name;
  screen.replaceChildren(node);
  window.scrollTo(0, 0);
}

/* ---------------- title screen ---------------- */

function showTitle() {
  var wrap = el('div', 'title-screen');
  wrap.appendChild(el('div', 'title-pre', 'relay network &middot; status: dark'));
  wrap.appendChild(el('h1', 'title-main', 'SIGNAL LOST'));
  wrap.appendChild(el('p', 'title-sub', 'An information theory game. Eight stations. Every mechanic is a theorem.'));
  wrap.appendChild(el('p', 'title-story',
    'The relay network that carries every message in the sector has gone dark. ' +
    'Each station runs on one layer of information theory — ask the right questions, build the right codes, ' +
    'outsmart the noise, and bring home the last transmission.'));

  var start = el('button', 'btn btn-primary', hasProgress() ? '▶ &nbsp;Continue' : '▶ &nbsp;Enter the network');
  start.addEventListener('click', function () { sfx('good'); showMap(); });
  wrap.appendChild(start);

  var links = el('div', 'title-links');
  var mute = el('span', null, muteLabel());
  mute.addEventListener('click', function () { toggleMute(); mute.innerHTML = muteLabel(); });
  links.appendChild(mute);
  var home = el('a', null, '⌂ Course home');
  home.href = '../';
  links.appendChild(home);
  if (hasProgress()) {
    var reset = el('span', null, '⟲ Reset progress');
    reset.addEventListener('click', function () { if (resetProgress()) showTitle(); });
    links.appendChild(reset);
  }
  wrap.appendChild(links);
  wrap.appendChild(el('div', 'title-foot', 'Companion game to the Information Theory course — every station links back to its module.'));
  setScreen('title', wrap);
}

function muteLabel() { return state.muted ? '🔇 Sound off' : '🔊 Sound on'; }
function toggleMute() { state.muted = !state.muted; save(); if (!state.muted) sfx('click'); }

function resetProgress() {
  if (!window.confirm('Wipe all stars and bits? This cannot be undone.')) return false;
  state = { stars: {}, bits: {}, muted: state.muted };
  save();
  return true;
}

/* ---------------- map ---------------- */

function showMap() {
  var wrap = el('div', 'map');

  var head = el('div', 'map-head');
  var h1 = el('h1', null, 'SIGNAL LOST');
  h1.title = 'Back to title';
  h1.addEventListener('click', function () { showTitle(); });
  head.appendChild(h1);
  var stats = el('div', 'map-stats',
    '<span class="rank-chip">' + escapeHtml(rankName()) + '</span>' +
    '<span><b>' + totalBits() + '</b> bits</span>' +
    '<span class="stars">' + starsHtml(totalStars(), 0) + (totalStars() ? ' ' : '') + totalStars() + '/' + (games.length * 3) + ' ★</span>');
  head.appendChild(stats);
  wrap.appendChild(head);

  partList().forEach(function (p) {
    var info = PART_INFO[p] || { name: 'Part ' + p, color: 'var(--blue)' };
    var section = el('div', 'part-section');
    var label = el('div', 'part-label', escapeHtml(info.name));
    label.style.color = info.color;
    section.appendChild(label);
    var grid = el('div', 'node-grid');
    games.filter(function (g) { return g.part === p; }).forEach(function (g) {
      grid.appendChild(buildNode(g, info));
    });
    section.appendChild(grid);
    wrap.appendChild(section);
  });

  var foot = el('div', 'map-foot');
  var mute = el('span', null, muteLabel());
  mute.addEventListener('click', function () { toggleMute(); mute.innerHTML = muteLabel(); });
  foot.appendChild(mute);
  var home = el('a', null, '⌂ Course home'); home.href = '../';
  foot.appendChild(home);
  var quiz = el('a', null, '🃏 Quiz & flashcards'); quiz.href = '../quiz.html';
  foot.appendChild(quiz);
  var reset = el('span', null, '⟲ Reset progress');
  reset.addEventListener('click', function () { if (resetProgress()) showMap(); });
  foot.appendChild(reset);
  wrap.appendChild(foot);

  setScreen('map', wrap);
}

function buildNode(def, info) {
  var unlocked = isUnlocked(def);
  var node = el('div', 'node' + (def.part === BOSS_PART ? ' boss' : '') + (unlocked ? '' : ' locked'));
  node.style.setProperty('--accent', info.color);

  var body = el('div', null);
  body.appendChild(el('div', 'n-title', escapeHtml(def.title)));
  body.appendChild(el('div', 'n-tagline', escapeHtml(def.tagline || '')));
  var meta = el('div', 'n-meta');
  if (def.module) meta.appendChild(el('span', 'n-module', escapeHtml(def.module)));
  meta.appendChild(el('span', 'stars', starsHtml(starsOf(def.id))));
  if (state.bits[def.id]) meta.appendChild(el('span', 'g-pill', state.bits[def.id] + ' bits'));
  body.appendChild(meta);
  if (!unlocked) body.appendChild(el('div', 'n-lock', '🔒 ' + escapeHtml(lockReason(def))));

  node.appendChild(el('div', 'n-icon', def.icon || '📡'));
  node.appendChild(body);

  node.addEventListener('click', function () {
    if (!isUnlocked(def)) {
      sfx('bad');
      node.classList.remove('shake');
      void node.offsetWidth; // restart the animation
      node.classList.add('shake');
      return;
    }
    sfx('click');
    showBriefing(def);
  });
  return node;
}

/* ---------------- briefing ---------------- */

function showBriefing(def) {
  var wrap = el('div', 'briefing');
  wrap.appendChild(el('div', 'b-icon', def.icon || '📡'));
  wrap.appendChild(el('h1', null, escapeHtml(def.title)));

  var meta = el('div', 'b-meta');
  if (def.module) {
    var chip = el('span', 'n-module', escapeHtml(def.module));
    meta.appendChild(chip);
    var learn = el('a', null, 'Read the module first: ' + escapeHtml(def.moduleTitle || def.module) + ' →');
    learn.href = def.moduleUrl || '../';
    meta.appendChild(learn);
  }
  wrap.appendChild(meta);

  wrap.appendChild(el('div', 'b-body', def.briefing || ''));

  var best = starsOf(def.id);
  if (best > 0 || state.bits[def.id]) {
    wrap.appendChild(el('div', 'b-best',
      'Best: <span class="stars">' + starsHtml(best) + '</span> &nbsp;·&nbsp; ' + (state.bits[def.id] || 0) + ' bits'));
  }

  var actions = el('div', 'b-actions');
  var begin = el('button', 'btn btn-primary', '▶ &nbsp;Begin');
  begin.addEventListener('click', function () { sfx('good'); startGame(def); });
  actions.appendChild(begin);
  var back = el('button', 'btn btn-ghost', '← Network map');
  back.addEventListener('click', function () { sfx('click'); showMap(); });
  actions.appendChild(back);
  wrap.appendChild(actions);

  setScreen('briefing', wrap);
}

/* ---------------- play ---------------- */

function startGame(def) {
  var wrap = el('div', 'playwrap');

  var hud = el('div', 'hud');
  var abort = el('button', 'h-btn', '✕');
  abort.title = 'Abort to map (Esc)';
  abort.addEventListener('click', function () { sfx('click'); showMap(); });
  hud.appendChild(abort);
  hud.appendChild(el('span', 'h-title', (def.icon || '') + ' ' + escapeHtml(def.title)));
  if (def.module) hud.appendChild(el('span', 'h-module', escapeHtml(def.module)));
  var status = el('span', null, '');
  status.id = 'hud-status';
  hud.appendChild(status);
  var bitsBadge = el('span', 'g-pill', totalBits() + ' bits');
  hud.appendChild(bitsBadge);
  var mute = el('button', 'h-btn', state.muted ? '🔇' : '🔊');
  mute.title = 'Toggle sound';
  mute.addEventListener('click', function () { toggleMute(); mute.innerHTML = state.muted ? '🔇' : '🔊'; });
  hud.appendChild(mute);
  wrap.appendChild(hud);

  var stage = el('div', 'stage');
  var root = el('div', 'game-root');
  stage.appendChild(root);
  wrap.appendChild(stage);

  setScreen('play', wrap);
  runActive = true;

  var api = makeApi(def);
  var instance = null;
  try {
    instance = def.create(root, api) || {};
  } catch (err) {
    runActive = false;
    root.replaceChildren(el('div', 'g-card crash-note',
      '<b>⚠ Station fault.</b> This minigame crashed on startup:<br><code>' +
      escapeHtml(String(err && err.message || err)) + '</code><br><br>' +
      '<button class="btn">← Network map</button>'));
    root.querySelector('button').addEventListener('click', function () { showMap(); });
    instance = {};
  }
  current = { def: def, instance: instance };
}

function makeApi(def) {
  return {
    rng: function () { return Math.random(); },
    sfx: sfx,
    status: function (html) {
      var s = document.getElementById('hud-status');
      if (s) s.innerHTML = html == null ? '' : html;
    },
    injectStyle: function (css) {
      if (document.getElementById('gstyle-' + def.id)) return;
      var st = el('style');
      st.id = 'gstyle-' + def.id;
      st.textContent = css;
      document.head.appendChild(st);
    },
    exit: function () { sfx('click'); showMap(); },
    complete: function (result) {
      if (!runActive) return;
      runActive = false;
      finishRun(def, result || {});
    },
  };
}

/* ---------------- debrief ---------------- */

function finishRun(def, result) {
  var stars = Math.max(0, Math.min(3, Math.floor(Number(result.stars) || 0)));
  var bits = Math.max(0, Math.round(Number(result.bits) || 0));

  var beforeUnlocked = unlockedIds();
  var prevBest = state.bits[def.id] || 0;
  var newBestBits = bits > prevBest;
  if (stars > starsOf(def.id)) state.stars[def.id] = stars;
  if (newBestBits) state.bits[def.id] = bits;
  save();
  var afterUnlocked = unlockedIds();

  var newlyUnlocked = games.filter(function (g) {
    return afterUnlocked.indexOf(g.id) >= 0 && beforeUnlocked.indexOf(g.id) < 0;
  });

  sfx(stars > 0 ? 'win' : 'lose');

  var ov = el('div', 'overlay');
  var modal = el('div', 'debrief');
  modal.appendChild(el('div', 'd-stars', starsHtml(stars)));
  modal.appendChild(el('div', 'd-headline', escapeHtml(result.headline || (stars > 0 ? 'Station restored' : 'Transmission failed'))));
  modal.appendChild(el('div', 'd-bits',
    '+' + bits + ' bits' + (newBestBits && prevBest > 0 ? ' <span class="nb">new best!</span>' : '') +
    (bits > 0 && !newBestBits ? ' (best: ' + prevBest + ')' : '')));
  if (result.detailHTML) modal.appendChild(el('div', 'd-detail', result.detailHTML));
  if (def.concept) {
    var box = el('div', 'concept-box', def.concept);
    box.insertBefore(el('div', 'c-label', 'The idea'), box.firstChild);
    modal.appendChild(box);
  }
  if (def.moduleUrl) {
    var learn = el('a', 'd-learn', 'Go deeper: ' + escapeHtml(def.moduleTitle || def.module || 'course home') + ' →');
    learn.href = def.moduleUrl;
    modal.appendChild(learn);
  }
  newlyUnlocked.forEach(function (g) {
    modal.appendChild(el('div', 'd-unlock', '🔓 Unlocked: ' + escapeHtml(g.title)));
  });
  if (def.part !== BOSS_PART && totalStars() < BOSS_STARS_REQUIRED) {
    modal.appendChild(el('div', 'd-unlock',
      '★ ' + totalStars() + '/' + BOSS_STARS_REQUIRED + ' toward The Last Transmission'));
  }

  var actions = el('div', 'd-actions');
  var replay = el('button', 'btn', '↻ Replay');
  replay.addEventListener('click', function () { sfx('click'); startGame(def); });
  actions.appendChild(replay);
  var toMap = el('button', 'btn btn-primary', 'Network map');
  toMap.addEventListener('click', function () { sfx('click'); showMap(); });
  actions.appendChild(toMap);
  modal.appendChild(actions);

  ov.appendChild(modal);
  screen.appendChild(ov); // inside #screen so any navigation clears it
}

/* ---------------- global keys ---------------- */

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var ov = screen && screen.querySelector('.overlay');
  if (ov) { ov.remove(); showMap(); return; }
  if (screenName === 'play' || screenName === 'briefing') { showMap(); return; }
  if (screenName === 'map') { showTitle(); }
});

/* ---------------- boot ---------------- */

function boot() {
  if (booted) return;
  booted = true;
  screen = document.getElementById('screen');
  if (!screen) return;
  if (!games.length) {
    screen.appendChild(el('div', 'title-screen', '<p class="title-sub">No stations registered — check the script tags in index.html.</p>'));
    return;
  }
  games.sort(function (a, b) { return a.part - b.part || a._seq - b._seq; });
  showTitle();
}

window.Game = {
  register: function (def) {
    if (!def || !def.id || !def.title || !def.part || typeof def.create !== 'function') {
      if (window.console) console.warn('Game.register: bad definition', def);
      return;
    }
    def._seq = games.length;
    games.push(def);
  },
  boot: boot,
};

/* Deferred scripts run while readyState is already 'interactive', before
   DOMContentLoaded — so booting on "not loading" would fire before any game
   registers. Wait for DOMContentLoaded; boot() is idempotent, so the extra
   load-event and readyState paths only cover late/dynamic injection. */
document.addEventListener('DOMContentLoaded', boot);
window.addEventListener('load', boot);
if (document.readyState === 'complete') boot();

})();
