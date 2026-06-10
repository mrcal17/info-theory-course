/* World state: island loading, entities, the player, movement, wandering,
   triggers/portals/items, interactions, draw + glow lists. */
(function () {
'use strict';

var T = G.TILE;
var DIRV = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

var world = G.world = {
  island: null,
  player: null,
  entities: [],
  focusTile: null,
};

/* ---------------- entity construction ---------------- */

function specVisible(spec) {
  if (spec.ifFlag && !G.flags.has(spec.ifFlag)) return false;
  if (spec.ifNotFlag && G.flags.has(spec.ifNotFlag)) return false;
  return true;
}

function buildEntities(island) {
  var kept = {}; // preserve wander positions across rebuilds
  world.entities.forEach(function (e) { kept[e.id] = e; });
  world.entities = [];
  (island.entities || []).forEach(function (spec, i) {
    if (!specVisible(spec)) return;
    var id = spec.id || (spec.type + '#' + i);
    var prev = kept[id];
    var e = {
      id: id, spec: spec, type: spec.type,
      x: prev && prev.spec === spec ? prev.x : spec.x,
      y: prev && prev.spec === spec ? prev.y : spec.y,
      px: 0, py: 0,
      dir: spec.dir || 's',
      sprite: spec.sprite || defaultSprite(spec),
      solid: spec.solid !== undefined ? !!spec.solid :
             (spec.type === 'npc' || spec.type === 'sign' || spec.type === 'door' || spec.type === 'prop'),
      moving: false, wanderT: 1 + Math.random() * 2,
      home: { x: spec.x, y: spec.y },
    };
    if (prev && prev.spec === spec) { e.px = prev.px; e.py = prev.py; e.dir = prev.dir; }
    else { e.px = e.x * T; e.py = e.y * T; }
    world.entities.push(e);
  });
}

function defaultSprite(spec) {
  switch (spec.type) {
    case 'sign': return 'sign';
    case 'door': return 'door';
    case 'item': return spec.gives === 'spark' ? 'spark' : 'letter';
    case 'portal': return null;
    case 'trigger': return null;
    default: return 'crab';
  }
}

G.bus.on('flags-changed', function () {
  if (world.island) buildEntities(world.island);
});

/* ---------------- island loading ---------------- */

world.load = function (islandId, x, y, opts) {
  var island = G.islands.get(islandId);
  if (!island) { console.warn('no island', islandId); return; }
  world.island = island;
  world.focusTile = null;
  G.map.load(island);
  var sx = x != null ? x : island.spawn.x;
  var sy = y != null ? y : island.spawn.y;
  world.player = {
    x: sx, y: sy, px: sx * T, py: sy * T,
    dir: 's', moving: false, mx: 0, my: 0, prog: 0, stepParity: 0, bumpCD: 0,
  };
  buildEntities(island);
  G.save.setPos(islandId, sx, sy);
  if (G.audio && island.music) G.audio.music(island.music);
  G.render.follow(sx * T + 16, sy * T + 16, true);
  G.bus.emit('island-changed', island);
  if (island.onEnter && G.dialogue) G.dialogue.runActions(island.onEnter, {});
  checkTileEvents(world.player, true); // spawn-tile items/triggers (not portals)
};

world.traveling = false;
world.travel = function (islandId, x, y) {
  if (world.traveling) return; // a crossing is already underway
  if (G._qaFast) { world.load(islandId, x, y); return; }
  world.traveling = true;
  G.render.fadeOut(function () {
    world.load(islandId, x, y);
    world.traveling = false;
    if (G.ui && G.ui.islandToast) G.ui.islandToast(G.islands.get(islandId).name);
    G.render.fadeIn();
  });
};

world.teleport = function (islandId, x, y) {
  if (x == null || y == null) {
    var dest = G.islands.get(islandId);
    if (dest) { x = dest.spawn.x; y = dest.spawn.y; }
  }
  if (world.island && world.island.id === islandId) {
    var p = world.player;
    p.x = x; p.y = y; p.px = x * T; p.py = y * T; p.moving = false;
    G.render.follow(p.px + 16, p.py + 16, true);
    G.save.setPos(islandId, x, y);
  } else {
    world.travel(islandId, x, y);
  }
};

/* ---------------- collision ---------------- */

world.entityAt = function (x, y) {
  for (var i = 0; i < world.entities.length; i++) {
    var e = world.entities[i];
    if (e.x === x && e.y === y) return e;
  }
  return null;
};

function blocked(x, y, self) {
  if (!G.map.tileWalkable(x, y)) return true;
  for (var i = 0; i < world.entities.length; i++) {
    var e = world.entities[i];
    if (e === self || !e.solid) continue;
    if (e.x === x && e.y === y) return true;
  }
  var p = world.player;
  if (p && self && p.x === x && p.y === y) return true;
  return false;
}

/* ---------------- update ---------------- */

var PSPEED = 6.8; // tiles per second
var NSPEED = 2.6;

world.update = function (dt) {
  if (!world.player) return;
  var p = world.player;
  if (p.bumpCD > 0) p.bumpCD -= dt;

  if (!G.paused) {
    if (p.moving) {
      stepMove(p, PSPEED, dt, onPlayerArrive);
    } else if (!world.traveling) {
      var d = G.input.dir();
      if (d) tryMove(p, d);
      if (G.input.takeInteract()) interact();
    }
  }

  // NPC wander
  for (var i = 0; i < world.entities.length; i++) {
    var e = world.entities[i];
    if (e.moving) { stepMove(e, NSPEED, dt, null); continue; }
    if (!e.spec.wander || G.paused) continue;
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.wanderT = 1.4 + Math.random() * 2.4;
      if (Math.random() < 0.55) {
        var dirs = ['n', 's', 'e', 'w'];
        var dd = dirs[Math.floor(Math.random() * 4)];
        var v = DIRV[dd];
        var nx = e.x + v[0], ny = e.y + v[1];
        if (Math.abs(nx - e.home.x) <= 2 && Math.abs(ny - e.home.y) <= 2 &&
            !blocked(nx, ny, e) && !(world.player.x === nx && world.player.y === ny)) {
          e.dir = dd; e.moving = true; e.tx = nx; e.ty = ny; e.prog = 0;
        } else { e.dir = dd; }
      }
    }
  }

  var focus = world.focusTile;
  if (focus) G.render.follow(focus.x * T + 16, focus.y * T + 16, false);
  else G.render.follow(p.px + 16, p.py + 16, false);
};

function tryMove(p, d) {
  p.dir = d;
  var v = DIRV[d];
  var nx = p.x + v[0], ny = p.y + v[1];
  if (blocked(nx, ny, null)) {
    if (p.bumpCD <= 0) { p.bumpCD = 0.35; if (G.audio) G.audio.sfx('bump'); }
    return;
  }
  p.moving = true; p.tx = nx; p.ty = ny; p.prog = 0;
}

function stepMove(e, speed, dt, onArrive) {
  e.prog += speed * dt;
  var done = e.prog >= 1;
  var q = done ? 1 : e.prog;
  var v = DIRV[e.dir];
  e.px = (e.x + v[0] * q) * T;
  e.py = (e.y + v[1] * q) * T;
  if (done) {
    e.x = e.tx; e.y = e.ty;
    e.px = e.x * T; e.py = e.y * T;
    e.moving = false;
    if (onArrive) onArrive(e);
  }
}

function onPlayerArrive(p) {
  p.stepParity ^= 1;
  if (p.stepParity) {
    if (G.audio) G.audio.sfx('step');
    var tile = G.map.tileAt(p.x, p.y);
    if (tile.role === 'shallow') { G.fx.splash(p.px + 16, p.py + 26); if (G.audio) G.audio.sfx('splash'); }
    else G.fx.dust(p.px + 16, p.py + 28);
  }
  G.save.setPos(world.island.id, p.x, p.y);
  checkTileEvents(p, false);
}

function checkTileEvents(p, skipPortals) {
  if (!p) return;
  var here = [];
  for (var i = 0; i < world.entities.length; i++) {
    var e = world.entities[i];
    if (e.x === p.x && e.y === p.y && !e.solid) here.push(e);
  }
  here.forEach(function (e) {
    if (skipPortals && e.type === 'portal') return;
    var s = e.spec;
    if (e.type === 'item') {
      if (s.flag) G.flags.set(s.flag);
      if (s.gives === 'spark') {
        G.sparks.give(1);
        if (G.ui && G.ui.toast) G.ui.toast('✦ Spark! (' + G.sparks.count() + '/21)');
        if (G.audio) G.audio.sfx('spark');
      } else {
        if (G.ui && G.ui.toast) G.ui.toast('Got: ' + (s.gives || 'something'));
        if (G.audio) G.audio.sfx('select');
      }
      G.fx.sparkle(p.px + 16, p.py + 10, '#fbbf24', 12);
    } else if (e.type === 'portal') {
      if (world.traveling) return;
      if (s.requiresFlag && !G.flags.has(s.requiresFlag)) {
        if (s.deniedDialogue) G.dialogue.start(s.deniedDialogue);
        else if (G.ui && G.ui.toast) G.ui.toast('The way is closed.');
        // step back so the player isn't standing on the portal
        return;
      }
      var at = s.at || {};
      world.travel(s.to, at.x != null ? at.x : null, at.y != null ? at.y : null);
    } else if (e.type === 'trigger') {
      if (s.flag && G.flags.has(s.flag)) return;
      if (s.once && !s.flag) s.flag = 'trg.' + world.island.id + '.' + e.id;
      if (s.flag) G.flags.set(s.flag);
      if (s.actions) G.dialogue.runActions(s.actions, { entity: e });
    }
  });
}

/* ---------------- interaction ---------------- */

function interact() {
  var p = world.player;
  var v = DIRV[p.dir];
  var e = world.entityAt(p.x + v[0], p.y + v[1]) || world.entityAt(p.x, p.y);
  if (!e) return;
  var s = e.spec;
  if (e.type === 'npc') {
    // face the player
    if (e.x > p.x) e.dir = 'w'; else if (e.x < p.x) e.dir = 'e';
    else if (e.y > p.y) e.dir = 'n'; else e.dir = 's';
    var dlg = resolveDialogue(s.dialogue);
    if (dlg) G.dialogue.start(dlg, e);
  } else if (e.type === 'sign') {
    G.dialogue.start(Array.isArray(s.text)
      ? s.text.map(function (tx) { return { who: 'sign', text: tx }; })
      : [{ who: 'sign', text: s.text }]);
  } else if (e.type === 'door') {
    if (s.flag && G.flags.has(s.flag)) return; // already open (should be hidden)
    if (s.lockedText && s.requiresFlag && !G.flags.has(s.requiresFlag)) {
      G.dialogue.start([{ who: 'sign', text: s.lockedText }]);
      return;
    }
    G.overlay.open({
      type: s.puzzle.type, config: s.puzzle.config, title: s.puzzle.title,
      flag: s.flag, sparks: s.sparks, onComplete: s.onComplete,
    });
  } else if (e.type === 'prop' && s.dialogue) {
    var dlg2 = resolveDialogue(s.dialogue);
    if (dlg2) G.dialogue.start(dlg2);
  } else if (e.type === 'prop' && s.text) {
    G.dialogue.start([{ who: 'sign', text: s.text }]);
  }
}

function resolveDialogue(ref) {
  if (!ref) return null;
  if (Array.isArray(ref) && ref.length && ref[0] && (ref[0].use || ref[0].ifFlag || ref[0].ifNotFlag)) {
    for (var i = 0; i < ref.length; i++) {
      var r = ref[i];
      if (r.ifFlag && !G.flags.has(r.ifFlag)) continue;
      if (r.ifNotFlag && G.flags.has(r.ifNotFlag)) continue;
      return r.use;
    }
    return null;
  }
  return ref; // plain id string or inline steps array
}

/* ---------------- draw / glow lists ---------------- */

world.drawList = function () {
  var list = [];
  for (var i = 0; i < world.entities.length; i++) {
    var e = world.entities[i];
    if (!e.sprite) continue;
    list.push({ y: e.py + T, sprite: e.sprite, sx: e.px, sy: e.py,
                opts: { dir: e.dir, moving: e.moving } });
  }
  var p = world.player;
  if (p) list.push({ y: p.py + T + 0.1, sprite: 'pip', sx: p.px, sy: p.py,
                     opts: { dir: p.dir, moving: p.moving, hat: G.sparks.hat() } });
  return list;
};

world.glowList = function () {
  var list = [];
  for (var i = 0; i < world.entities.length; i++) {
    var e = world.entities[i];
    if (e.sprite === 'beacon-on') list.push({ x: e.px + 16, y: e.py + 4, r: 90, color: '#fbbf24', a: 0.4 });
    if (e.sprite === 'spark') list.push({ x: e.px + 16, y: e.py + 12, r: 26, color: '#fde68a', a: 0.35 });
  }
  return list;
};

})();
