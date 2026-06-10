// Scratch logic test for archipelago/js/puzzles/parity_charm.js — PEDAGOGY §4.
// Loads the REAL shipped file (vm sandbox, stub G) and tests the pure logic
// exposed under the registered def's _test: detect parity, Hamming(7,4)
// syndrome uniqueness, two-flip symmetric difference, and the no-guessing
// gate predicates (random clicking cannot converge).
// Run: node pz_test_parity-charm.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'archipelago', 'js', 'puzzles', 'parity_charm.js'), 'utf8');

const defs = {};
const G = { puzzles: { register: (t, d) => { defs[t] = d; } } };
vm.runInNewContext(src, { G });

const T = defs['parity-charm'] && defs['parity-charm']._test;
if (!T) { console.error('FAIL: parity-charm def or _test missing'); process.exit(1); }

let checks = 0, fails = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.error('FAIL:', msg); } };
const setKey = a => a.slice().sort().join('');
// deterministic LCG so the run is reproducible
let seed = 42;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/* ---------- 1. detect: the charm makes every codeword even ---------- */
for (let k = 1; k <= 8; k++) {
  for (let r = 0; r < 50; r++) {
    const data = Array.from({ length: k }, () => (rng() < 0.5 ? 0 : 1));
    const code = data.concat([T.detectCharm(data)]);
    ok(T.isEven(code), `detect rig k=${k} not even: ${code}`);
  }
}

/* ---------- 2. detect catches EVERY single flip (k=6 exhaustive) ---------- */
{
  const k = 6;
  for (let w = 0; w < (1 << k); w++) {
    const data = Array.from({ length: k }, (_, i) => (w >> i) & 1);
    const code = data.concat([T.detectCharm(data)]);
    for (let p = 0; p <= k; p++) {
      const c = code.slice(); c[p] ^= 1;
      ok(!T.isEven(c), `single flip not caught w=${w} p=${p}`);
    }
  }
}

/* ---------- 3. detect misses EVERY double flip (k=6 exhaustive) ---------- */
{
  const k = 6;
  for (let w = 0; w < (1 << k); w++) {
    const data = Array.from({ length: k }, (_, i) => (w >> i) & 1);
    const code = data.concat([T.detectCharm(data)]);
    for (let i = 0; i <= k; i++) for (let j = i + 1; j <= k; j++) {
      const c = code.slice(); c[i] ^= 1; c[j] ^= 1;
      ok(T.isEven(c), `double flip caught (should slip) w=${w} ${i},${j}`);
    }
  }
}

/* ---------- 4. Hamming rig: all 16 data words -> empty syndrome ---------- */
const rig = d => {
  const code = [0, d[0], d[1], d[2], d[3], 0, 0, 0];
  code[5] = T.hammingCharm(code, 'A');
  code[6] = T.hammingCharm(code, 'B');
  code[7] = T.hammingCharm(code, 'C');
  return code;
};
for (let w = 0; w < 16; w++) {
  const d = [w & 1, (w >> 1) & 1, (w >> 2) & 1, (w >> 3) & 1];
  ok(T.syndrome(rig(d)).length === 0, `rigged word ${w} has nonzero syndrome`);
}

/* ---------- 5. single flips: unique syndrome, decoded exactly ---------- */
for (let w = 0; w < 16; w++) {
  const d = [w & 1, (w >> 1) & 1, (w >> 2) & 1, (w >> 3) & 1];
  const code = rig(d);
  const seen = new Set();
  for (let p = 1; p <= 7; p++) {
    const c = code.slice(); c[p] ^= 1;
    const syn = T.syndrome(c);
    ok(syn.length > 0, `flip ${p} word ${w}: empty syndrome`);
    ok(setKey(syn) === setKey(T.MEMBER[p]), `flip ${p} word ${w}: syndrome != membership`);
    ok(T.positionFromSyndrome(syn) === p, `flip ${p} word ${w}: decoded wrong`);
    seen.add(setKey(syn));
  }
  ok(seen.size === 7, `word ${w}: syndromes not unique (${seen.size})`);
}

/* ---------- 6. syndrome <-> position is a bijection over all 8 patterns ---------- */
{
  const subsets = [[], ['A'], ['B'], ['C'], ['A', 'B'], ['A', 'C'], ['B', 'C'], ['A', 'B', 'C']];
  const out = subsets.map(s => T.positionFromSyndrome(s));
  ok(new Set(out).size === 8, `pattern->position not a bijection: ${out}`);
  ok(out.every(p => p >= 0 && p <= 7), `pattern decodes out of range: ${out}`);
  ok(T.positionFromSyndrome([]) === 0, 'empty pattern must mean clean');
}

/* ---------- 7. two flips = symmetric difference -> confident WRONG chip ---------- */
const symdiff = (a, b) => {
  const s = new Set(a);
  for (const x of b) s.has(x) ? s.delete(x) : s.add(x);
  return [...s];
};
for (let w = 0; w < 16; w++) {
  const d = [w & 1, (w >> 1) & 1, (w >> 2) & 1, (w >> 3) & 1];
  const code = rig(d);
  for (let i = 1; i <= 7; i++) for (let j = i + 1; j <= 7; j++) {
    const c = code.slice(); c[i] ^= 1; c[j] ^= 1;
    const syn = T.syndrome(c);
    ok(setKey(syn) === setKey(symdiff(T.MEMBER[i], T.MEMBER[j])),
      `pair ${i},${j} word ${w}: syndrome != symmetric difference`);
    const dec = T.positionFromSyndrome(syn);
    ok(dec !== 0, `pair ${i},${j}: decoded clean (two flips must NOT pass)`);
    ok(dec !== i && dec !== j, `pair ${i},${j}: decoded to a flipped chip (should be a third)`);
  }
}

/* ---------- 8. no-guessing gate predicates ---------- */
for (let ans = 1; ans <= 7; ans++) for (let pos = 1; pos <= 7; pos++) {
  ok(T.pickOutcome(ans, pos) === (ans === pos ? 'win' : 'reset'), `pickOutcome ${ans},${pos}`);
}
for (let pos = 1; pos <= 7; pos++) ok(T.pickOutcome(0, pos) === 'reset', `pickOutcome clean,${pos} must reset`);
ok(T.cleanOutcome(0) === 'win', 'cleanOutcome(0)');
for (let ans = 1; ans <= 7; ans++) ok(T.cleanOutcome(ans) === 'reset', `cleanOutcome(${ans})`);
ok(T.declareOutcome(true, true) === 'win' && T.declareOutcome(false, false) === 'win', 'declare match wins');
ok(T.declareOutcome(true, false) === 'reset' && T.declareOutcome(false, true) === 'reset', 'declare mismatch resets');
ok(T.streakAfter(2, true) === 3 && T.streakAfter(2, false) === 0, 'streakAfter');

/* ---------- 9. schedule: trip 0 flips; exactly one clean at index>=1 ---------- */
for (let t = 1; t <= 6; t++) {
  for (let r = 0; r < 500; r++) {
    const s = T.makeSchedule(t, rng);
    ok(s.length === t, `schedule length t=${t}`);
    ok(s[0] === true, `schedule t=${t}: trip 0 must flip`);
    const cleans = s.filter(x => !x).length;
    ok(cleans === (t >= 2 ? 1 : 0), `schedule t=${t}: ${cleans} cleans`);
  }
}

/* ---------- 10. kill-switch simulations (correct mode, trips=3) ---------- */
// (a) rune-only random clicker, 10 clicks: can NEVER complete — every window
//     contains a guaranteed clean trip that only 'All clean' passes.
// (b) all-clean spam: dies on the guaranteed flips. (c) constant detect spam.
{
  const t = 3;
  let completions = 0;
  for (let run = 0; run < 20000; run++) {
    let streak = 0, sched = T.makeSchedule(t, rng);
    for (let click = 0; click < 10; click++) {
      const flip = sched[streak];
      const ans = flip ? 1 + Math.floor(rng() * 7) : 0;
      const pos = 1 + Math.floor(rng() * 7);                 // naive: always taps a rune
      const won = T.pickOutcome(ans, pos) === 'win';
      streak = T.streakAfter(streak, won);
      if (!won) sched = T.makeSchedule(t, rng);
      if (streak >= t) { completions++; break; }
    }
  }
  ok(completions === 0, `naive rune clicker completed ${completions}/20000 (must be 0)`);
}
{
  const t = 3;
  let completions = 0;
  for (let run = 0; run < 20000; run++) {
    let streak = 0, sched = T.makeSchedule(t, rng);
    for (let click = 0; click < 50; click++) {
      const flip = sched[streak];
      const ans = flip ? 1 + Math.floor(rng() * 7) : 0;
      const won = T.cleanOutcome(ans) === 'win';             // spam 'All clean'
      streak = T.streakAfter(streak, won);
      if (!won) sched = T.makeSchedule(t, rng);
      if (streak >= t) { completions++; break; }
    }
  }
  ok(completions === 0, `all-clean spam completed ${completions}/20000 (must be 0)`);
}
{
  // detect: spam a constant declaration (CLEAN or CORRUPTED) forever
  for (const says of [false, true]) {
    const t = 3;
    let completions = 0;
    for (let run = 0; run < 20000; run++) {
      let streak = 0, sched = T.makeSchedule(t, rng);
      for (let click = 0; click < 50; click++) {
        const truth = sched[streak];
        const won = T.declareOutcome(truth, says) === 'win';
        streak = T.streakAfter(streak, won);
        if (!won) sched = T.makeSchedule(t, rng);
        if (streak >= t) { completions++; break; }
      }
    }
    ok(completions === 0, `detect constant-${says ? 'CORRUPTED' : 'CLEAN'} spam completed ${completions}/20000`);
  }
}

/* ---------- 11. informed strategies always win every trip ---------- */
{
  // correct: read the syndrome, tap exactly the named chip / All clean
  for (let r = 0; r < 2000; r++) {
    const d = Array.from({ length: 4 }, () => (rng() < 0.5 ? 0 : 1));
    const code = rig(d);
    const flip = rng() < 0.7 ? 1 + Math.floor(rng() * 7) : 0;
    const c = code.slice();
    if (flip) c[flip] ^= 1;
    const ans = T.positionFromSyndrome(T.syndrome(c));
    const won = flip ? T.pickOutcome(ans, ans) === 'win' && ans === flip
                     : T.cleanOutcome(ans) === 'win';
    ok(won, `informed correct-mode lost: flip=${flip} ans=${ans}`);
  }
  // detect: declare exactly what parity says (rig guaranteed even)
  for (let r = 0; r < 2000; r++) {
    const data = Array.from({ length: 6 }, () => (rng() < 0.5 ? 0 : 1));
    const code = data.concat([T.detectCharm(data)]);
    const flip = rng() < 0.7 ? Math.floor(rng() * 7) : -1;
    const c = code.slice();
    if (flip >= 0) c[flip] ^= 1;
    const saysCorrupt = !T.isEven(c);
    ok(T.declareOutcome(flip >= 0, saysCorrupt) === 'win', `informed detect lost: flip=${flip}`);
  }
}

console.log(fails === 0
  ? `pz_test_parity-charm: ${checks} checks, all pass`
  : `pz_test_parity-charm: ${fails}/${checks} FAILED`);
process.exit(fails === 0 ? 0 : 1);
