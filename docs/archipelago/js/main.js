/* Boot, main loop, HUD, default UI fallbacks, QA hooks. Loaded LAST. */
(function () {
'use strict';

var hud = null, hudIsland = null, hudObjective = null, hudSparks = null;
var toastWrap = null;
var booted = false;

/* ---------------- default UI (ui.js overrides any of these) ---------------- */

G.ui = G.ui || {};
if (!G.ui.toast) G.ui.toast = function (text) {
  if (!toastWrap) return;
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  toastWrap.appendChild(t);
  setTimeout(function () { t.classList.add('out'); }, 2400);
  setTimeout(function () { t.remove(); }, 2900);
};
if (!G.ui.islandToast) G.ui.islandToast = function (name) {
  var el = document.getElementById('island-toast') || document.createElement('div');
  el.id = 'island-toast';
  el.textContent = name;
  document.body.appendChild(el);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
};
if (!G.ui.openTitle) G.ui.openTitle = function () {
  var first = G.islands.list()[0];
  var el = document.createElement('div');
  el.id = 'title-fallback';
  el.innerHTML = '<h1>The Quiet Archipelago</h1>' +
    '<button class="btn btn-primary" id="tf-start">' + (G.save.data.started ? 'Continue' : 'New game') + '</button>';
  document.body.appendChild(el);
  el.querySelector('#tf-start').addEventListener('click', function () {
    el.remove();
    if (G.save.data.started && G.save.data.island) G.game.continueGame();
    else G.game.newGame();
  });
  if (!first) el.querySelector('#tf-start').disabled = true;
};
if (!G.ui.openMenu) G.ui.openMenu = function () { G.ui.toast('…the wind passes. (menu under construction)'); };
if (!G.ui.openMapScreen) G.ui.openMapScreen = function () { G.ui.toast('You picture the archipelago in your head.'); };
if (!G.ui.ending) G.ui.ending = function () { G.ui.toast('THE BEACON IS LIT. (ending under construction)'); };

/* ---------------- game control ---------------- */

G.game = {
  newGame: function () {
    var sound = G.save.data.sound;
    G.save.reset();
    G.save.data.sound = sound;
    G.save.data.started = true;
    G.save.persist();
    G.bus.emit('sparks-changed', 0);
    var first = G.islands.list()[0];
    if (!first) return;
    G.state = 'world';
    G.paused = false;
    G.world.load(first.id);
    G.render.fadeIn();
    if (G.ui.islandToast) G.ui.islandToast(first.name);
    updateHud();
  },
  continueGame: function () {
    var d = G.save.data;
    var island = G.islands.get(d.island) || G.islands.list()[0];
    if (!island) return;
    G.state = 'world';
    G.paused = false;
    G.world.load(island.id, d.island === island.id ? d.x : null, d.island === island.id ? d.y : null);
    G.render.fadeIn();
    updateHud();
  },
};

/* ---------------- HUD ---------------- */

function buildHud() {
  hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML =
    '<div class="hud-left"><div id="hud-island"></div><div id="hud-objective"></div></div>' +
    '<div class="hud-right"><span id="hud-sparks"></span></div>';
  document.body.appendChild(hud);
  hudIsland = hud.querySelector('#hud-island');
  hudObjective = hud.querySelector('#hud-objective');
  hudSparks = hud.querySelector('#hud-sparks');
  toastWrap = document.createElement('div');
  toastWrap.id = 'toasts';
  document.body.appendChild(toastWrap);
}

function updateHud() {
  if (!hud) return;
  var island = G.world.island;
  hud.style.display = (G.state === 'world' || G.state === 'dialogue' || G.state === 'puzzle') && island ? '' : 'none';
  if (!island) return;
  hudIsland.textContent = island.name;
  var hint = '';
  var obs = island.objectives || [];
  for (var i = 0; i < obs.length; i++) {
    if (!G.flags.has(obs[i].flag)) { hint = obs[i].hint; break; }
  }
  hudObjective.textContent = hint;
  hudSparks.textContent = '✦ ' + G.sparks.count();
}

G.bus.on('flags-changed', updateHud);
G.bus.on('island-changed', updateHud);
G.bus.on('sparks-changed', updateHud);

/* ---------------- loop ---------------- */

var last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts;
  G.time += dt;
  if (G.world.island) {
    G.world.update(dt);
    G.render.draw(dt);
  }
  if (G.state === 'world') {
    if (G.input.takeMenu()) G.ui.openMenu();
    if (G.input.takeMap()) G.ui.openMapScreen();
  } else {
    G.input.takeMenu(); G.input.takeMap(); // drain
  }
  updateHudThrottled();
}

var hudT = 0;
function updateHudThrottled() {
  // hud visibility tracks state changes cheaply
  if (G.time - hudT > 0.25) { hudT = G.time; updateHud(); }
}

/* ---------------- QA hooks (used by the test harness) ---------------- */

G.qa = {
  state: function () {
    var p = G.world.player;
    return {
      state: G.state, island: G.world.island && G.world.island.id,
      x: p && p.x, y: p && p.y, sparks: G.sparks.count(), flags: G.flags.all(),
    };
  },
  flags: function () { return G.flags.all(); },
  setFlag: function (f) { G.flags.set(f); },
  teleport: function (island, x, y) { G._qaFast = true; G.world.teleport(island, x, y); G._qaFast = false; },
  newGame: function () { G.game.newGame(); },
  continueGame: function () { G.game.continueGame(); },
  fast: function (v) { G._qaFast = !!v; },
  solveDoor: function (entityId) {
    var island = G.world.island;
    if (!island) return false;
    for (var i = 0; i < (island.entities || []).length; i++) {
      var s = island.entities[i];
      if ((s.id || (s.type + '#' + i)) === entityId && s.type === 'door') {
        if (s.flag) G.flags.set(s.flag);
        if (s.sparks) G.sparks.give(s.sparks);
        return true;
      }
    }
    return false;
  },
};

/* ---------------- boot ---------------- */

function boot() {
  if (booted) return;
  booted = true;
  var canvas = document.getElementById('world');
  if (!canvas) return;
  G.render.init(canvas);
  buildHud();
  G.state = 'title';
  G.ui.openTitle();
  requestAnimationFrame(loop);
}

/* Deferred scripts run before DOMContentLoaded (readyState 'interactive'),
   so wait for the event; extra paths cover late injection. boot is guarded. */
document.addEventListener('DOMContentLoaded', boot);
window.addEventListener('load', boot);
if (document.readyState === 'complete') boot();

})();
