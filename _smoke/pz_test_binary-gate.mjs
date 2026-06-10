// Pure-logic test for archipelago/js/puzzles/binary_gate.js (PEDAGOGY §4.1).
// Loads the REAL shipped file with a G stub (register only; create never runs,
// so no DOM is touched) and tests the _test hooks: gate predicates, decoy
// split math, eliminate correctness, optWorst, against BOTH frozen configs.
// Run: cd _smoke && node pz_test_binary-gate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(
  path.join(here, '..', 'archipelago', 'js', 'puzzles', 'binary_gate.js'), 'utf8');

const registry = {};
globalThis.G = { puzzles: { register: (t, def) => { registry[t] = def; } } };
(0, eval)(src);

const def = registry['binary-gate'];
const T = def && def._test;

let n = 0, bad = 0;
const ok = (cond, msg) => {
  n++;
  if (!cond) { bad++; console.error('FAIL', msg); }
  else console.log('  ok', msg);
};
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

ok(!!def, 'registered under type string binary-gate');
ok(def.title === 'The Sorting Machine', 'title preserved');
ok(!!T, '_test hooks exposed');

// ---- the two FROZEN island configs (01_beacon_rock.js:104 and :134) ----
const cfg8 = {
  items: [
    { name: 'Sift',   traits: { far: true,  windy: true,  sandy: true  } },
    { name: 'Huff',   traits: { far: true,  windy: false, sandy: false } },
    { name: 'Ada',    traits: { far: true,  windy: true,  sandy: false } },
    { name: 'Bea',    traits: { far: true,  windy: false, sandy: true  } },
    { name: 'Lem',    traits: { far: false, windy: false, sandy: false } },
    { name: 'Ziv',    traits: { far: false, windy: true,  sandy: false } },
    { name: 'Warden', traits: { far: false, windy: false, sandy: true  } },
    { name: 'Maren',  traits: { far: false, windy: true,  sandy: true  } },
  ],
  keys: ['far', 'windy', 'sandy'], par: 3,
};
const cfg4 = {
  items: [
    { name: 'Shannon (lighthouse)', traits: { up: true,  bird: true  } },
    { name: 'Gull (the dock)',      traits: { up: false, bird: true  } },
    { name: 'Maren (post office)',  traits: { up: false, bird: false } },
    { name: 'Sift (the dunes)',     traits: { up: true,  bird: false } },
  ],
  keys: ['up', 'bird'], par: 2,
};

// ---- ceilLog2 / h2 / halvingChain ----
ok(T.ceilLog2(1) === 0 && T.ceilLog2(2) === 1 && T.ceilLog2(3) === 2, 'ceilLog2 1..3');
ok(T.ceilLog2(4) === 2 && T.ceilLog2(7) === 3 && T.ceilLog2(8) === 3 && T.ceilLog2(9) === 4, 'ceilLog2 4..9');
ok(close(T.h2(0.5), 1), 'h2(1/2) = 1 bit');
ok(close(T.h2(1 / 8), 0.5435644431995964), 'h2(1/8) ≈ 0.5436 (the decoy price)');
ok(T.h2(0) === 0 && T.h2(1) === 0, 'h2 degenerate = 0');
ok(T.halvingChain(8) === '8 → 4 → 2 → 1', 'halvingChain(8)');
ok(T.halvingChain(4) === '4 → 2 → 1', 'halvingChain(4)');

// ---- config traits are perfect splits on the full sets ----
for (const k of cfg8.keys) {
  const sc = T.splitCounts(cfg8.items, k);
  ok(sc.yes === 4 && sc.no === 4 && close(T.splitBits(sc.yes, sc.no), 1),
    `8-cfg trait '${k}' splits 4/4 = 1.00 bit`);
}
for (const k of cfg4.keys) {
  const sc = T.splitCounts(cfg4.items, k);
  ok(sc.yes === 2 && sc.no === 2 && close(T.splitBits(sc.yes, sc.no), 1),
    `4-cfg trait '${k}' splits 2/2 = 1.00 bit`);
}

// ---- decoys: built from items, lopsided 1 vs N−1, listed first by create ----
function augment(cfg) {
  const decoys = T.buildDecoys(cfg.items);
  const items = cfg.items.map((it, i) => {
    const t = { ...it.traits };
    decoys.forEach(d => { t[d.key] = (i === d.idx); });
    return { name: it.name, traits: t };
  });
  return { decoys, items };
}
{
  const { decoys, items } = augment(cfg8);
  ok(decoys.length === 2, '8-cfg: two decoys built');
  ok(decoys[0].idx === 7 && decoys[1].idx === 0, '8-cfg: decoys point at last (Maren) and first (Sift)');
  ok(/Maren, by name/.test(decoys[0].label) && /Sift, by name/.test(decoys[1].label),
    '8-cfg: decoy labels are by-name questions');
  for (const d of decoys) {
    const sc = T.splitCounts(items, d.key);
    ok(sc.yes === 1 && sc.no === 7, `8-cfg decoy ${d.key} splits 1/7`);
    ok(close(T.splitBits(sc.yes, sc.no), T.h2(1 / 8)), `8-cfg decoy ${d.key} worth h2(1/8) ≈ 0.54 bits`);
  }
}
{
  const { decoys, items } = augment(cfg4);
  ok(decoys.length === 2, '4-cfg: two decoys built');
  ok(decoys[0].idx === 3 && decoys[1].idx === 0, '4-cfg: decoys point at last and first');
  ok(decoys[0].short === 'Sift?' && decoys[1].short === 'Shannon?',
    '4-cfg: short heads use first word of name');
  for (const d of decoys) {
    const sc = T.splitCounts(items, d.key);
    ok(sc.yes === 1 && sc.no === 3, `4-cfg decoy ${d.key} splits 1/3`);
  }
}
ok(T.buildDecoys(cfg4.items.slice(0, 3)).length === 0, 'no decoys for N<4 (degenerate guard)');

// ---- eliminate correctness ----
{
  const far = T.eliminate(cfg8.items, 'far', true);
  ok(far.length === 4 && far.every(it => it.traits.far), 'eliminate keeps the 4 far items on YES');
  const { items } = augment(cfg8);
  const noMaren = T.eliminate(items, '_dz1', false);
  ok(noMaren.length === 7 && !noMaren.some(it => it.name === 'Maren'),
    'decoy NO eliminates only the named item');
  // full informed walk: any target isolated by the 3 config traits in 3 asks
  for (let t = 0; t < 8; t++) {
    let alive = cfg8.items.slice();
    for (const k of cfg8.keys) alive = T.eliminate(alive, k, cfg8.items[t].traits[k]);
    ok(alive.length === 1 && alive[0].name === cfg8.items[t].name,
      `8-cfg: 3 config questions isolate target ${cfg8.items[t].name}`);
  }
  for (let t = 0; t < 4; t++) {
    let alive = cfg4.items.slice();
    for (const k of cfg4.keys) alive = T.eliminate(alive, k, cfg4.items[t].traits[k]);
    ok(alive.length === 1 && alive[0].name === cfg4.items[t].name,
      `4-cfg: 2 config questions isolate target ${cfg4.items[t].name}`);
  }
}

// ---- gateFail: gateFail(spent, alive, perLetter, lettersLeft, budgetTotal) ----
// strip 8-cfg, budget 3: the naive first click (a decoy -> 7 alive) is fatal
ok(T.gateFail(1, 7, 3, 0, 3) === true, 'strip 8-cfg: 1 spent, 7 alive -> mis-sorted (1+3>3)');
ok(T.gateFail(1, 4, 3, 0, 3) === false, 'strip 8-cfg: perfect first ask (4 alive) is safe');
ok(T.gateFail(2, 2, 3, 0, 3) === false, 'strip 8-cfg: on track at 2 spent / 2 alive');
ok(T.gateFail(3, 1, 3, 0, 3) === false, 'strip 8-cfg: isolated on budget passes');
ok(T.gateFail(2, 3, 3, 0, 3) === true, 'strip 8-cfg: 2 spent, 3 alive -> dead (2+2>3)');
// strip 4-cfg, budget 2: naive decoy click (3 alive) is fatal
ok(T.gateFail(1, 3, 2, 0, 2) === true, 'strip 4-cfg: decoy first (3 alive) -> mis-sorted (1+2>2)');
ok(T.gateFail(1, 2, 2, 0, 2) === false, 'strip 4-cfg: halving first ask is safe');
ok(T.gateFail(2, 1, 2, 0, 2) === false, 'strip 4-cfg: isolated in 2 passes');
// mastery 8-cfg: 3 letters, purse 9; a single decoy ask is instantly fatal
ok(T.gateFail(1, 7, 3, 2, 9) === true, 'mastery: decoy on letter 1 -> 1+3+6 > 9, instant fail');
ok(T.gateFail(1, 4, 3, 2, 9) === false, 'mastery: perfect ask on letter 1 is safe');
ok(T.gateFail(4, 4, 3, 1, 9) === false, 'mastery: letter 2 on track (4+2+3 = 9)');
ok(T.gateFail(7, 4, 3, 0, 9) === false, 'mastery: letter 3 on track (7+2 = 9)');
ok(T.gateFail(9, 1, 3, 0, 9) === false, 'mastery: 9 questions, all sorted -> pass');
ok(T.gateFail(7, 7, 3, 0, 9) === true, 'mastery: decoy on letter 3 -> 7+3 > 9, fail');
ok(T.gateFail(99, 5, 3, 0, Infinity) === false, 'infinite budget (inseparable fallback) never gate-fails');

// ---- optWorst: both frozen configs achieve ⌈log₂N⌉ with config traits ----
ok(T.optWorst(cfg8.items, cfg8.keys) === 3, '8-cfg optWorst = 3 = ⌈log₂8⌉ (perfect code)');
ok(T.optWorst(cfg4.items, cfg4.keys) === 2, '4-cfg optWorst = 2 = ⌈log₂4⌉ (perfect code)');
{
  const { decoys, items } = augment(cfg8);
  const keys = decoys.map(d => d.key).concat(cfg8.keys);
  ok(T.optWorst(items, keys) === 3, '8-cfg + decoys: optimum unchanged (decoys never help worst-case)');
}
ok(T.optWorst([{ name: 'a', traits: { x: true } }, { name: 'b', traits: { x: true } }], ['x'])
  === Infinity, 'optWorst = Infinity when traits cannot separate');

// ---- the naive (kill-switch) trace, replayed exactly: strip round 8-cfg ----
{
  const { decoys, items } = augment(cfg8);
  const keys = decoys.map(d => d.key).concat(cfg8.keys); // decoys LISTED FIRST
  // target is never a decoy-named item (create excludes them); take Huff (idx 1)
  const target = items[1];
  let alive = items.slice(), spent = 0, failed = false;
  for (const k of keys) {
    const ans = !!target.traits[k];
    alive = T.eliminate(alive, k, ans);
    spent++;
    if (alive.length === 1) break;
    if (T.gateFail(spent, alive.length, 3, 0, 3)) { failed = true; break; }
  }
  ok(failed && spent === 1 && alive.length === 7,
    'kill-switch 8-cfg: first-listed click fails the strip gate immediately');
}
{
  const { decoys, items } = augment(cfg4);
  const keys = decoys.map(d => d.key).concat(cfg4.keys);
  const target = items[1]; // Gull — never a decoy-named item
  let alive = items.slice(), spent = 0, failed = false;
  for (const k of keys) {
    alive = T.eliminate(alive, k, !!target.traits[k]);
    spent++;
    if (alive.length === 1) break;
    if (T.gateFail(spent, alive.length, 2, 0, 2)) { failed = true; break; }
  }
  ok(failed && spent === 1 && alive.length === 3,
    'kill-switch 4-cfg: first-listed click fails the strip gate immediately');
}

console.log(bad ? `\n${bad}/${n} CHECKS FAILED` : `\nall ${n} checks pass`);
process.exit(bad ? 1 : 0);
