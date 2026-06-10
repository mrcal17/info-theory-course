// Scratch logic test for tree-planner (PEDAGOGY §4.1) — node, no browser.
// Loads the real puzzle file with a stub G and checks the pure functions:
// huffmanCost vs biggest-first cost on all three frozen island configs
// (must be STRICTLY greater), the Σ daily·depth identity, the gate predicate,
// par resolution, and the hint-3 merge walk.
// Run from _smoke/: node pz_test_tree-planner.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

globalThis.G = {
  puzzles: { _r: {}, register(t, d) { this._r[t] = d; }, get(t) { return this._r[t]; } },
  util: { esc: s => String(s) },
  flags: { _f: new Set(), has(f) { return this._f.has(f); }, set(f) { this._f.add(f); } },
  pz: { taught: () => false, markTaught: () => {}, hintLadder: () => ({ fail: () => null, reset: () => {} }) },
};
vm.runInThisContext(
  fs.readFileSync(path.join(here, '..', 'archipelago', 'js', 'puzzles', 'tree_planner.js'), 'utf8'),
  { filename: 'tree_planner.js' });
const L = G.puzzles.get('tree-planner').logic;

let n = 0, bad = 0;
const check = (name, cond, detail) => {
  n++;
  console.log((cond ? 'ok   ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
  if (!cond) bad++;
};

// The three frozen configs (03_huffman_wood.js:114, :217; 07_grand_beacon.js:125)
const configs = [
  ['huffman-wood stump (03:114)', [21, 9, 6, 4, 2]],
  ['huffman-wood mastery (03:217)', [8, 8, 5, 5, 3, 3]],
  ['grand-beacon gate1 (07:125)', [11, 7, 5, 3, 2, 1]],
];

// simulate a full play with a strategy, building real tree nodes
function play(ws, pickMin) {
  let piles = ws.map(w => ({ daily: w }));
  let committed = 0;
  while (piles.length > 1) {
    piles.sort((a, b) => pickMin ? a.daily - b.daily : b.daily - a.daily);
    const a = piles.shift(), b = piles.shift();
    const j = { kids: [a, b], daily: a.daily + b.daily };
    committed += j.daily;
    piles.push(j);
  }
  return { root: piles[0], committed };
}

for (const [name, ws] of configs) {
  const opt = L.huffmanCost(ws);
  const naive = L.greedyMaxCost(ws);
  console.log(`\n${name}: huffman(optimal) = ${opt}, biggest-first = ${naive}`);
  check('biggest-first strictly worse than huffman', naive > opt, `${naive} > ${opt}`);
  const pMin = play(ws, true), pMax = play(ws, false);
  check('identity: Σ daily·depth == Σ junction sums (quietest-first play)',
    L.treeCost(pMin.root) === pMin.committed && pMin.committed === opt,
    `treeCost=${L.treeCost(pMin.root)} committed=${pMin.committed}`);
  check('identity: Σ daily·depth == Σ junction sums (busiest-first play)',
    L.treeCost(pMax.root) === pMax.committed && pMax.committed === naive,
    `treeCost=${L.treeCost(pMax.root)} committed=${pMax.committed}`);
  const par = L.resolvePar({ par: 'optimal' }, opt);
  check('gate passes optimal play', L.gatePass(opt, par, 0));
  check('gate blocks the kill-switch (busiest-first throughout)', !L.gatePass(naive, par, 0),
    `${naive} > ${par}`);
  check('leafDepths covers every village', L.leafDepths(pMin.root).length === ws.length);
}

console.log('');
check('par "optimal" resolves to optimum', L.resolvePar({ par: 'optimal' }, 81) === 81);
check('numeric par above optimum kept', L.resolvePar({ par: 90 }, 81) === 90);
check('numeric par below optimum clamps up', L.resolvePar({ par: 50 }, 81) === 81);
check('missing par defaults to optimum', L.resolvePar({}, 81) === 81);
check('tolerance loosens the gate', L.gatePass(83, 81, 2) && !L.gatePass(84, 81, 2));

// hint-3 walk for the stump config
const walk = L.mergeWalk([
  { name: 'Mosswick', daily: 21 }, { name: 'Fernholt', daily: 9 },
  { name: 'Bramblebury', daily: 6 }, { name: "Owl's End", daily: 4 },
  { name: 'Thistledown', daily: 2 }]);
console.log('\nh3 walk (stump):', walk.join('; then '));
check('walk has n-1 steps', walk.length === 4);
check('walk starts with the two quietest villages',
  /Thistledown \(2\) \+ Owl's End \(4\)/.test(walk[0]), walk[0]);
check('walk ends at the total weight 42', / 42$/.test(walk[walk.length - 1]));

console.log(`\n${n} checks, ${bad} failure${bad === 1 ? '' : 's'}`);
process.exit(bad ? 1 : 0);
