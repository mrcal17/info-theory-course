// Island validator for The Quiet Archipelago.
// Usage: node validate_island.mjs <island-file.js> <expected-id> <flag-prefix> [--sparks=3] [--allow-types=a,b]
// Loads the real engine tile/map code in a stubbed environment, registers the
// island, and runs structural checks. Exit 0 = clean (warnings allowed).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arch = path.join(here, '..', 'archipelago');
const [file, expectId, prefix] = process.argv.slice(2);
const sparkTarget = Number((process.argv.find(a => a.startsWith('--sparks=')) || '--sparks=3').split('=')[1]);
const allowTypes = ((process.argv.find(a => a.startsWith('--allow-types=')) || '').split('=')[1] || '').split(',').filter(Boolean);
if (!file || !expectId || !prefix) { console.error('usage: node validate_island.mjs <file> <id> <prefix>'); process.exit(2); }

const errors = [], warns = [];
const err = m => errors.push(m);
const warn = m => warns.push(m);

// ---- stubbed engine environment ----
global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = undefined;
const load = f => { (0, eval)(fs.readFileSync(path.join(arch, f), 'utf8')); };
load('js/core/g.js');
const G = global.G = global.window.G;
load('js/core/tiles.js');
load('js/core/map.js');

// real registered puzzle types from the puzzles dir
const puzzleTypes = new Set(allowTypes);
for (const f of fs.readdirSync(path.join(arch, 'js', 'puzzles'))) {
  const m = fs.readFileSync(path.join(arch, 'js', 'puzzles', f), 'utf8').match(/G\.puzzles\.register\('([^']+)'/);
  if (m) puzzleTypes.add(m[1]);
}

const MUSIC = new Set(['title', 'shore', 'dunes', 'forest', 'strait', 'caverns', 'spires', 'beacon', 'ending']);
const SPRITES = new Set(['pip','shannon','gull','maren','sift','huff','ada','bea','cee','lem','ziv','warden','crab','turtle','gullsmall','mailbox','boat','beacon-off','beacon-on','chest','sign','door','gate','runedoor','letter','spark','geyser','stamp','dial','lever']);
const WHO = new Set([...SPRITES, 'pip', 'sign']);
const ACTIONS = new Set(['set','clear','give','openPuzzle','goto','teleport','sfx','music','quake','wait','focus','endGame','ifFlag','ifNotFlag']);

// ---- load the island file ----
(0, eval)(fs.readFileSync(file, 'utf8'));
const island = G.islands.get(expectId);
if (!island) { console.error('FAIL: island "' + expectId + '" not registered (got: ' + G.islands.list().map(i => i.id) + ')'); process.exit(1); }

for (const f of ['name', 'order', 'palette', 'music', 'map', 'spawn']) if (island[f] == null) err('missing field: ' + f);
if (!G.PALETTES[island.palette]) err('unknown palette ' + island.palette);
if (!MUSIC.has(island.music)) err('unknown music ' + island.music);

// map
const m = G.map.load(island);
if (m.w < 24 || m.w > 80 || m.h < 16 || m.h > 60) warn('unusual map size ' + m.w + 'x' + m.h);
const badChars = new Set();
for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
  const ch = G.map.charAt(x, y);
  if (!G.TILES[ch]) badChars.add(ch);
}
if (badChars.size) err('unknown tile chars: ' + JSON.stringify([...badChars]));

const inb = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
const walk = (x, y) => G.map.tileWalkable(x, y);

// spawn
if (!inb(island.spawn.x, island.spawn.y)) err('spawn out of bounds');
else if (!walk(island.spawn.x, island.spawn.y)) err('spawn not walkable');

// entities
const ents = island.entities || [];
const ids = new Set();
let sparks = 0;
const dialogRefs = [];
const TYPES = new Set(['npc','sign','door','item','portal','trigger','prop']);
ents.forEach((e, i) => {
  const tag = (e.id || e.type + '#' + i);
  if (e.id) { if (ids.has(e.id)) err('duplicate entity id ' + e.id); ids.add(e.id); }
  if (!TYPES.has(e.type)) err(tag + ': unknown type ' + e.type);
  if (!inb(e.x, e.y)) { err(tag + ': out of bounds'); return; }
  if (!walk(e.x, e.y)) err(tag + ': placed on non-walkable tile (' + G.map.charAt(e.x, e.y) + ')');
  if (e.sprite && !SPRITES.has(e.sprite)) warn(tag + ': unknown sprite ' + e.sprite);
  if (e.type === 'npc') {
    if (!e.dialogue) err(tag + ': npc without dialogue');
    else dialogRefs.push([tag, e.dialogue]);
  }
  if (e.type === 'sign' && !e.text) err(tag + ': sign without text');
  if (e.type === 'door') {
    if (!e.puzzle || !e.puzzle.type) err(tag + ': door without puzzle');
    else if (!puzzleTypes.has(e.puzzle.type)) err(tag + ': unknown puzzle type ' + e.puzzle.type);
    if (!e.flag) err(tag + ': door without flag');
    else {
      if (!e.flag.startsWith(prefix + '.')) warn(tag + ': door flag ' + e.flag + ' not under prefix ' + prefix);
      if (e.ifNotFlag !== e.flag) warn(tag + ': door should have ifNotFlag === flag so it disappears when opened');
    }
    if (e.sparks) sparks += e.sparks;
  }
  if (e.type === 'item') {
    if (!e.flag) err(tag + ': item without flag (would respawn forever)');
    if (e.ifNotFlag !== e.flag) warn(tag + ': item should have ifNotFlag === its flag');
    if (e.gives === 'spark') sparks += 1;
  }
  if (e.type === 'portal' && !e.to) err(tag + ': portal without target');
  if (e.type === 'portal' && e.x === island.spawn.x && e.y === island.spawn.y) err(tag + ': portal ON the spawn tile');
  if (e.type === 'trigger' && !e.actions) warn(tag + ': trigger without actions');
  // solid entities need an adjacent walkable tile to interact from
  if (['npc','sign','door','prop'].includes(e.type)) {
    const adj = [[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => inb(e.x+dx, e.y+dy) && walk(e.x+dx, e.y+dy));
    if (!adj) err(tag + ': no walkable neighbor — cannot be interacted with');
  }
});

// dialogue refs from triggers/onEnter choices etc: scan actions recursively
function checkActions(list, where) {
  (list || []).forEach(a => {
    Object.keys(a).forEach(k => { if (!ACTIONS.has(k)) warn(where + ': unknown action key "' + k + '"'); });
    if (a.openPuzzle) {
      if (!puzzleTypes.has(a.openPuzzle.type)) err(where + ': openPuzzle unknown type ' + a.openPuzzle.type);
      if (a.openPuzzle.sparks) sparks += a.openPuzzle.sparks;
    }
    if (a.give === 'spark') sparks += 1;
    if (a.goto) dialogRefs.push([where, a.goto]);
  });
}
checkActions(island.onEnter, 'onEnter');
ents.forEach((e, i) => { if (e.actions) checkActions(e.actions, e.id || e.type + '#' + i); });

// dialogues
const dlgs = island.dialogues || {};
function checkSteps(name, steps) {
  if (!Array.isArray(steps)) { err('dialogue ' + name + ' is not an array'); return; }
  steps.forEach((s, i) => {
    const where = name + '[' + i + ']';
    if (s.who && !WHO.has(s.who)) warn(where + ': unknown who "' + s.who + '"');
    if (s.text && s.text.length > 200) warn(where + ': very long line (' + s.text.length + ' chars)');
    if (s.goto) dialogRefs.push([where, s.goto]);
    if (s.actions) checkActions(s.actions, where);
    if (s.choice) s.choice.forEach((c, j) => {
      if (!c.label) err(where + ' choice[' + j + ']: no label');
      if (c.goto) dialogRefs.push([where, c.goto]);
      if (c.actions) checkActions(c.actions, where + ' choice');
    });
  });
}
Object.entries(dlgs).forEach(([k, v]) => checkSteps(k, v));

// resolve dialogue refs (string ids and conditional arrays)
dialogRefs.forEach(([who, ref]) => {
  if (typeof ref === 'string') {
    if (!dlgs[ref]) err(who + ': dialogue id "' + ref + '" not found');
  } else if (Array.isArray(ref) && ref.length && ref[0] && (ref[0].use || ref[0].ifFlag || ref[0].ifNotFlag)) {
    ref.forEach(r => { if (r.use && typeof r.use === 'string' && !dlgs[r.use]) err(who + ': dialogue id "' + r.use + '" not found'); });
  } else if (Array.isArray(ref)) {
    checkSteps(who + ':inline', ref);
  }
});

// objectives
(island.objectives || []).forEach((o, i) => {
  if (!o.flag || !o.hint) err('objective[' + i + '] missing flag/hint');
});
const doneFlagUsed = JSON.stringify(island).includes('"' + prefix + '.done"') || fs.readFileSync(file, 'utf8').includes(prefix + '.done');
if (!doneFlagUsed) err('island never references its done flag ' + prefix + '.done');

// sparks budget
if (sparks !== sparkTarget) err('sparks awarded = ' + sparks + ', expected ' + sparkTarget);

// reachability: BFS from spawn over walkable tiles (entities passable)
const seen = new Set([island.spawn.x + ',' + island.spawn.y]);
const q = [[island.spawn.x, island.spawn.y]];
while (q.length) {
  const [x, y] = q.shift();
  for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
    if (!seen.has(k) && inb(nx, ny) && walk(nx, ny)) { seen.add(k); q.push([nx, ny]); }
  }
}
ents.forEach((e, i) => {
  if (!inb(e.x, e.y)) return;
  const tag = e.id || e.type + '#' + i;
  const reach = seen.has(e.x + ',' + e.y) ||
    [[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => seen.has((e.x+dx) + ',' + (e.y+dy)));
  if (!reach) err(tag + ': not reachable from spawn');
});

console.log('--- validate ' + expectId + ' ---');
warns.forEach(w => console.log('  warn: ' + w));
errors.forEach(e2 => console.log('  ERROR: ' + e2));
console.log(errors.length === 0 ? 'CLEAN (' + warns.length + ' warnings)' : 'FAILED (' + errors.length + ' errors)');
process.exit(errors.length === 0 ? 0 : 1);
