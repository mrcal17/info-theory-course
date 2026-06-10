// Scratch logic test for the 'venn-lock' mechanic (PEDAGOGY.md §4.1).
// Loads the real puzzle file in a bare context and exercises its pure logic:
//   1. encode() leaves every ring even (clean syndrome) for all 16 data words
//   2. every single flip yields a syndrome that names EXACTLY that position
//      (gate predicate: first click must equal positionFromSyndrome)
//   3. table completeness: the 7 single-flip syndromes are distinct and cover
//      every non-empty subset of {A,B,C}  ->  7 + clean = 8 = 2^3
//   4. the PATTERNS decoder rows agree with positionFromSyndrome
//   5. twist: every double flip's syndrome equals the symmetric difference of
//      the two memberships; the indicated rune exists, is unique, and is
//      NEITHER of the actually-flipped runes (the deception is real)
// Run: node pz_test_venn-lock.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'archipelago', 'js', 'puzzles', 'venn_lock.js'), 'utf8');

const G = { puzzles: { defs: {}, register(t, d) { this.defs[t] = d; } }, pz: {} };
vm.runInNewContext(src, { G });
const def = G.puzzles.defs['venn-lock'];
if (!def || !def._logic) { console.error('FAIL: venn-lock did not register with _logic'); process.exit(1); }
const { encode, syndrome, positionFromSyndrome, MEMBER, PATTERNS } = def._logic;

let checks = 0, fails = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.error('FAIL:', msg); } };

const words = [];
for (let i = 0; i < 16; i++) words.push([i & 1, (i >> 1) & 1, (i >> 2) & 1, (i >> 3) & 1]);

// 1. clean encode
for (const d of words) ok(syndrome(encode(d)).length === 0, `encode(${d}) not clean`);

// 2 + 3. single flips: unique, correct, complete
const seen = new Set();
for (const d of words) {
  for (let p = 1; p <= 7; p++) {
    const c = encode(d); c[p] ^= 1;
    const s = syndrome(c);
    ok(s.length > 0, `flip ${p} on ${d}: empty syndrome`);
    ok(positionFromSyndrome(s) === p, `flip ${p} on ${d}: decoded ${positionFromSyndrome(s)}`);
    if (d.every(x => x === 0)) seen.add(s.slice().sort().join(''));
  }
}
ok(seen.size === 7, `expected 7 distinct single-flip syndromes, got ${seen.size}`);
const allSubsets = ['A', 'B', 'C', 'AB', 'AC', 'BC', 'ABC'];
for (const sub of allSubsets) ok(seen.has(sub), `subset ${sub} never appears as a syndrome`);

// 4. decoder table rows agree with the decoder
ok(PATTERNS.length === 8, `PATTERNS has ${PATTERNS.length} rows, want 8 (7 + clean)`);
for (const row of PATTERNS) {
  const odd = row.key.split('').filter(Boolean);
  ok(positionFromSyndrome(odd) === row.pos, `PATTERNS row ${row.key || '(clean)'} -> ${row.pos} disagrees`);
  if (row.pos > 0) ok(MEMBER[row.pos].slice().sort().join('') === row.key, `MEMBER[${row.pos}] != ${row.key}`);
}

// 5. twist double flips: syndrome = symmetric difference; indicated rune is a
//    real third rune (never one of the flipped pair, never clean)
const symdiff = (a, b) => {
  const A = new Set(MEMBER[a]), B = new Set(MEMBER[b]);
  return [...new Set([...MEMBER[a], ...MEMBER[b]])].filter(r => !(A.has(r) && B.has(r))).sort().join('');
};
for (const d of words) {
  for (let a = 1; a <= 7; a++) for (let b = a + 1; b <= 7; b++) {
    const c = encode(d); c[a] ^= 1; c[b] ^= 1;
    const s = syndrome(c).slice().sort().join('');
    ok(s === symdiff(a, b), `2-flip {${a},${b}} on ${d}: syndrome ${s} != symdiff ${symdiff(a, b)}`);
    const ind = positionFromSyndrome(s.split(''));
    ok(ind >= 1 && ind <= 7, `2-flip {${a},${b}}: indicated ${ind} not a rune`);
    ok(ind !== a && ind !== b, `2-flip {${a},${b}}: indicated ${ind} is a flipped rune (no deception)`);
  }
}

console.log(`venn-lock logic: ${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
