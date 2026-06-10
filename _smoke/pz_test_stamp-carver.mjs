// Scratch logic test for stamp-carver (node, no browser) — PEDAGOGY.md §4.
// Loads the real puzzle file with a stubbed G and exercises its pure logic
// via the def's _test hooks, against the three FROZEN configs pulled live
// from archipelago/js/islands/05_caverns.js.
// Run: cd _smoke && node pz_test_stamp-carver.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const puzzlePath = path.join(here, '..', 'archipelago', 'js', 'puzzles', 'stamp_carver.js');
const islandPath = path.join(here, '..', 'archipelago', 'js', 'islands', '05_caverns.js');

// minimal G stub — stamp_carver.js touches document/G.pz cards only inside create()
globalThis.G = {
  puzzles: { defs: {}, register(t, d) { this.defs[t] = d; }, get(t) { return this.defs[t]; } },
  pz: { taught: () => false, markTaught() {}, log2: x => Math.log2(x) },
  util: { esc: s => String(s) },
  flags: { has: () => false, set() {} },
};
new Function(fs.readFileSync(puzzlePath, 'utf8'))();
const T = globalThis.G.puzzles.get('stamp-carver')._test;

// the three frozen door configs, parsed straight from the island file
const islandSrc = fs.readFileSync(islandPath, 'utf8');
const configs = [...islandSrc.matchAll(/type:\s*'stamp-carver',\s*config:\s*(\{[^}]*\})/g)]
  .map(m => Function('return ' + m[1])());
const structured = configs.filter(c => !c.incompressible);
const vault = configs.find(c => c.incompressible);

let n = 0, failed = 0;
const check = (name, cond, detail) => {
  n++;
  const line = `  ${cond ? 'ok  ' : 'FAIL'} ${String(n).padStart(2)}  ${name}${detail ? `   [${detail}]` : ''}`;
  cond ? console.log(line) : (failed++, console.error(line));
};
const cost = (pattern, stamps) => T.planCost(stamps, T.greedyTile(pattern, stamps).presses);
const rebuilt = ops => ops.map(o => o.stamp || o.lit).join('');

console.log('stamp-carver logic test');
console.log('configs from 05_caverns.js:', JSON.stringify(configs));

// ---- config sanity -------------------------------------------------------
check('island exposes exactly 3 stamp-carver configs', configs.length === 3);
check('exactly one config is the incompressible vault', !!vault && structured.length === 2);

// ---- greedy tiling -------------------------------------------------------
{
  const r = T.greedyTile('mosomosomosokmoso', ['moso']);
  check('greedy on moso-corridor with "moso": 5 presses', r.presses === 5, `presses=${r.presses}`);
  check('greedy ops re-concatenate to the corridor', rebuilt(r.ops) === 'mosomosomosokmoso');
  check('plan cost = carve 4 + presses 5 = 9', T.planCost(['moso'], r.presses) === 9);
}
{
  const r = T.greedyTile('aaaa', ['a', 'aa']);
  check('greedy prefers the LONGEST matching stamp', r.presses === 2 && r.ops.every(o => o.stamp === 'aa'),
    `presses=${r.presses}`);
}
{
  const r = T.greedyTile('nananananabnananana', ['nana']);
  check('greedy on deep-corridor with "nana": presses 7 (4 stamps + 3 literals)',
    r.presses === 7 && T.literalCount(r.ops) === 3, `presses=${r.presses} lits=${T.literalCount(r.ops)}`);
}

// ---- KILL-SWITCH: all-literals tiling must miss par on every structured config
for (const c of structured) {
  const litCost = cost(c.pattern, []); // no stamps → every glyph one chisel press
  check(`kill-switch "${c.pattern}": all-literals ${litCost} > par ${c.parCost}`,
    litCost === c.pattern.length && litCost > c.parCost,
    `literal=${litCost} par=${c.parCost}`);
}
{
  const litCost = cost(vault.pattern, []);
  check(`vault "${vault.pattern}": all-literals ${litCost} > par ${vault.parCost} (par unreachable by design)`,
    litCost > vault.parCost, `literal=${litCost} par=${vault.parCost}`);
}

// ---- an informed strategy passes every structured gate --------------------
for (const c of structured) {
  const best = T.bestSingleStamp(c.pattern);
  check(`informed pass "${c.pattern}": best stamp "${best.stamp}" costs ${best.cost} ≤ par ${c.parCost}`,
    best.cost <= c.parCost);
}
check('moso best single stamp is "moso" at 9', (() => {
  const b = T.bestSingleStamp('mosomosomosokmoso');
  return b.stamp === 'moso' && b.cost === 9;
})());
check('deep best single stamp is "nana" at exactly par 11', (() => {
  const b = T.bestSingleStamp('nananananabnananana');
  return b.stamp === 'nana' && b.cost === 11;
})());

// ---- hint-2 evidence: longer repeats pay more per press -------------------
check('deep: "na" (short) costs 12 > par 11; "nana" (long) costs 11 ≤ 11',
  cost('nananananabnananana', ['na']) === 12 && cost('nananananabnananana', ['nana']) === 11);

// ---- net savings ----------------------------------------------------------
{
  const r = T.greedyTile('mosomosomosokmoso', ['moso']);
  const u = T.stampUses(r.ops)['moso'];
  check('net savings of "moso" = 4×(4−1) − 4 = +8', u === 4 && T.netSavings(4, u) === 8);
}
check('single-glyph stamps always net −1 (uses×0 − 1)', T.netSavings(1, 7) === -1 && T.netSavings(1, 1) === -1);
// identity: raw − Σ net = total plan cost (drives the meter & debrief equation)
for (const [pat, st] of [
  ['mosomosomosokmoso', ['moso']],
  ['mosomosomosokmoso', ['mosomoso', 'moso', 'k']],
  ['nananananabnananana', ['nana', 'na']],
  ['nananananabnananana', ['nananana']],
  [vault.pattern, ['bq', 'vkf']],
]) {
  const r = T.greedyTile(pat, st);
  const uses = T.stampUses(r.ops);
  const sumNet = st.reduce((a, s) => a + T.netSavings(s.length, uses[s] || 0), 0);
  const total = T.planCost(st, r.presses);
  check(`identity raw − Σnet = total  (${JSON.stringify(st)} on ${pat.slice(0, 8)}…)`,
    pat.length - sumNet === total, `raw=${pat.length} Σnet=${sumNet} total=${total}`);
}

// ---- VAULT: every possible stamp is provably negative ---------------------
{
  const pat = vault.pattern;
  let allNeg = true, count = 0, seen = new Set();
  for (let a = 0; a < pat.length; a++) {
    for (let b = a + 1; b <= pat.length; b++) {
      const s = pat.substring(a, b);
      if (seen.has(s)) continue;
      seen.add(s);
      count++;
      const uses = T.stampUses(T.greedyTile(pat, [s]).ops)[s] || 0;
      if (T.netSavings(s.length, uses) >= 0) { allNeg = false; console.error('    non-negative stamp:', s); }
    }
  }
  check(`vault: ALL ${count} possible stamps run negative (lever-unlock premise holds for any 2 carves)`, allNeg);
  const b = T.bestSingleStamp(pat);
  check(`vault: even the best stamp costs ${b.cost} > raw ${pat.length} — no stamp ever helps`, b.cost > pat.length);
}

console.log(failed ? `\n${failed}/${n} CHECKS FAILED` : `\nall ${n} checks pass`);
process.exit(failed ? 1 : 0);
