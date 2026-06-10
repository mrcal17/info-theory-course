/* THE QUIET ARCHIPELAGO — namespace, registries, flags, save, utils.
   Contract: ../DESIGN.md. Loaded first; everything else extends G. */
(function () {
'use strict';

var SAVE_KEY = 'quiet-archipelago-v1';

var G = window.G = {
  TILE: 32,
  time: 0,            // seconds since boot (render clock)
  state: 'boot',      // 'title' | 'world' | 'dialogue' | 'puzzle' | 'menu' | 'map' | 'ending'
  paused: false,      // true while any overlay owns input
};

/* ---------------- event bus ---------------- */

var listeners = {};
G.bus = {
  on: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
  emit: function (ev, data) {
    (listeners[ev] || []).forEach(function (fn) {
      try { fn(data); } catch (e) { if (window.console) console.error('bus:' + ev, e); }
    });
  },
};

/* ---------------- registries ---------------- */

var islands = {};
var islandOrder = [];
G.islands = {
  register: function (def) {
    if (!def || !def.id || !def.map) { console.warn('bad island', def); return; }
    islands[def.id] = def;
    islandOrder.push(def.id);
    islandOrder.sort(function (a, b) { return (islands[a].order || 99) - (islands[b].order || 99); });
  },
  get: function (id) { return islands[id]; },
  list: function () { return islandOrder.map(function (id) { return islands[id]; }); },
};

var puzzles = {};
G.puzzles = {
  register: function (type, def) { puzzles[type] = def; },
  get: function (type) { return puzzles[type]; },
};

/* ---------------- save + flags ---------------- */

var save = load();

function blank() {
  return { flags: [], sparks: 0, island: null, x: 0, y: 0, started: false,
           sound: true, dpad: 'auto' };
}
function load() {
  try {
    var raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (raw && typeof raw === 'object' && Array.isArray(raw.flags)) {
      var b = blank();
      for (var k in b) if (raw[k] !== undefined) b[k] = raw[k];
      return b;
    }
  } catch (e) { /* fresh */ }
  return blank();
}

var saveTimer = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(function () {
    saveTimer = null;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }, 120);
}

var flagSet = {};
save.flags.forEach(function (f) { flagSet[f] = true; });

G.save = {
  data: save,
  persist: persist,
  reset: function () {
    save = blank();
    flagSet = {};
    G.save.data = save;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  },
  setPos: function (island, x, y) {
    save.island = island; save.x = x; save.y = y; persist();
  },
};

G.flags = {
  has: function (f) { return !!flagSet[f]; },
  set: function (f) {
    if (!f || flagSet[f]) return;
    flagSet[f] = true;
    save.flags.push(f);
    persist();
    G.bus.emit('flags-changed', f);
  },
  clear: function (f) {
    if (!flagSet[f]) return;
    delete flagSet[f];
    var i = save.flags.indexOf(f);
    if (i >= 0) save.flags.splice(i, 1);
    persist();
    G.bus.emit('flags-changed', f);
  },
  all: function () { return save.flags.slice(); },
};

G.sparks = {
  count: function () { return save.sparks; },
  give: function (n) {
    save.sparks += (n || 1);
    persist();
    G.bus.emit('sparks-changed', save.sparks);
  },
  hat: function () {
    if (save.sparks >= 21) return 'crown';
    if (save.sparks >= 14) return 'sunhat';
    if (save.sparks >= 7) return 'cap';
    return null;
  },
  unlockedHats: function () {
    var u = [];
    if (save.sparks >= 7) u.push('cap');
    if (save.sparks >= 14) u.push('sunhat');
    if (save.sparks >= 21) u.push('crown');
    return u;
  },
  /* what Pip actually wears: explicit wardrobe choice if unlocked, else the
     earned hat ('auto'); 'none' bares the antenna. */
  wornHat: function () {
    var c = save.hatChoice;
    if (c === 'none') return null;
    if (c && c !== 'auto' && G.sparks.unlockedHats().indexOf(c) >= 0) return c;
    return G.sparks.hat();
  },
  setHatChoice: function (c) { save.hatChoice = c; persist(); },
  hatChoice: function () { return save.hatChoice || 'auto'; },
};

/* ---------------- utils ---------------- */

G.util = {
  clamp: function (x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); },
  lerp: function (a, b, t) { return a + (b - a) * t; },
  // deterministic 2D hash -> [0,1): stable per-tile decor
  hash: function (x, y, seed) {
    var h = (x * 374761393 + y * 668265263 + (seed || 0) * 1442695041) | 0;
    h = (h ^ (h >> 13)) | 0;
    h = (h * 1274126177) | 0;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  },
  choice: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  esc: function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },
};

})();
