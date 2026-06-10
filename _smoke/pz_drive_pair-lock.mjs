// Chrome drive for the pair-lock rework (derived from pz_drive.mjs — do not edit that file).
// Scripts, against the REAL game:
//   RUN 1 (east config, naive): blind play fails the GUIDE gate once (reset+ladder),
//          then informed guide, YES at the independence question (re-teach loop),
//          then NO, then always-commonest-B at MASTERY twice -> blocked, never completes.
//   RUN 2 (east config, informed): hook -> row-argmax guide -> NO -> row-argmax mastery
//          -> debrief -> complete; flag qa.test.pair-lock set.
//   RUN 3 (west attic config, taught): window.G.pz.markTaught('pair-lock') pre-set ->
//          opens straight in mastery; row-argmax -> completes; flag qa.test2.pair-lock.
//   420px pass: hook + guide grid at 420 width, clip check.
// Run: cd _smoke && node pz_drive_pair-lock.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'pz', 'pair-lock');
fs.mkdirSync(shots, { recursive: true });

// ---- the two frozen spires configs (06_spires.js:107 and :129) ----
const CFG1 = { labels: ['☾', '☀', '✶'], joint: [[12, 1, 1], [1, 12, 1], [1, 1, 12]], rounds: 9, goal: 6 };
const CFG2 = { labels: ['☾', '☀', '✶'], joint: [[15, 9, 0], [0, 9, 15], [9, 8, 1]], rounds: 11, goal: 5 };
const argmax = a => a.reduce((bi, v, i) => (v > a[bi] ? i : bi), 0);
const rowPick = (cfg, aLabel) => { // row-argmax (the informed strategy)
  const a = cfg.labels.indexOf(aLabel);
  return cfg.labels[argmax(cfg.joint[a])];
};
const blindPick = cfg => { // globally-commonest B (the lazy strategy)
  const cols = cfg.labels.map((_, j) => cfg.joint.reduce((s, r) => s + r[j], 0));
  return cfg.labels[argmax(cols)];
};

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=900,1000', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 900, height: 1000 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let shotN = 0;
const shot = async n => { await page.screenshot({ path: path.join(shots, String(shotN++).padStart(2, '0') + '-' + n + '.png') }); };
const fails = [];
const assert = (cond, label) => { console.log((cond ? 'ok   ' : 'FAIL '), label); if (!cond) fails.push(label); };

// ---- boot to world state ----
await page.goto(url, { waitUntil: 'networkidle0' });
await sleep(600);
await page.evaluate(() => { localStorage.removeItem('quiet-archipelago-v1'); location.reload(); });
await sleep(900);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(b => /new game/i.test(b.textContent));
  if (b) b.click();
});
await sleep(1100);
for (let i = 0; i < 30; i++) {
  const st = await page.evaluate(() => window.G.qa.state().state);
  if (st === 'world') break;
  await page.keyboard.press('KeyE'); await sleep(140);
}

/* ---------------- in-page helpers ---------------- */
const ui = () => page.evaluate(() => ({
  open: window.G.overlay.isOpen(),
  hook: !!document.querySelector('#puzzle-ov .pzk-hook'),
  question: !!document.querySelector('#puzzle-ov .pl-q'),
  debrief: !!document.querySelector('#puzzle-ov .pzk-debrief'),
  spinEnabled: !!document.querySelector('#pl-spin') && !document.querySelector('#pl-spin').disabled,
  banner: (document.querySelector('#puzzle-ov .pzk-banner') || {}).textContent || '',
  status: (document.querySelector('#puzzle-ov .pz-status') || {}).textContent || '',
  mi: (document.querySelector('#pl-mi') || {}).textContent || '',
  coach: [...document.querySelectorAll('#puzzle-ov .pzk-ctext')].map(c => c.textContent).join(' | '),
}));
async function waitState(maxMs = 6000) { // 'spin'|'question'|'debrief'|'hook'|'closed'|'timeout'
  for (let t = 0; t < maxMs; t += 150) {
    const s = await ui();
    if (!s.open) return 'closed';
    if (s.debrief) return 'debrief';
    if (s.question) return 'question';
    if (s.hook) return 'hook';
    if (s.spinEnabled) return 'spin';
    await sleep(150);
  }
  return 'timeout';
}
async function playSpin(pickLabelFn, beforePick) {
  const st = await waitState();
  if (st !== 'spin') throw new Error('expected spin-ready, got ' + st);
  await page.evaluate(() => document.querySelector('#pl-spin').click());
  await sleep(220);
  const aLabel = await page.evaluate(() => document.querySelector('#pl-A').textContent);
  if (beforePick) await beforePick(aLabel);
  const bLabel = pickLabelFn(aLabel);
  await page.evaluate(l => {
    const b = [...document.querySelectorAll('#puzzle-ov .pl-bbtn')].find(x => x.textContent === l);
    if (b && !b.disabled) b.click();
  }, bLabel);
  await sleep(1100); // reveal 480ms + advance 420ms + buffer
}
const clickOpt = async (sel, re) => page.evaluate((sel, src) => {
  const r = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov ' + sel)].find(b => r.test(b.textContent));
  if (b && !b.disabled) { b.click(); return true; }
  return false;
}, sel, re);
const openPz = (cfg, flag) => page.evaluate((c, f) =>
  window.G.overlay.open({ type: 'pair-lock', config: c, flag: f }), cfg, flag);
const hasFlag = f => page.evaluate(f => window.G.flags.has(f), f);
async function answerHook() {
  await clickOpt('.pzk-opt', '^Yes');
  await sleep(250);
  await clickOpt('.pzk-hook .btn', 'find out');
  await sleep(350);
}
async function indepQuestion(answer /* 'yes'|'no' */) {
  const st = await waitState();
  assert(st === 'question', 'independence question card appeared');
  if (answer === 'yes') {
    await clickOpt('.pl-qopt', '^Yes');
  } else {
    await clickOpt('.pl-qopt', '^No');
  }
  await sleep(400);
}

/* ================= RUN 1 — NAIVE (east config) ================= */
console.log('\n=== RUN 1: NAIVE on east config (must NOT complete) ===');
await openPz(CFG1, 'qa.naive.pair-lock');
await sleep(500);
let s = await ui();
assert(s.open && s.hook, 'overlay open at HOOK phase');
await shot('hook');
await clickOpt('.pzk-opt', '^No'); // naive player predicts "watching always helps"
await sleep(300);
await shot('hook-reveal');
await clickOpt('.pzk-hook .btn', 'find out');
await sleep(400);
s = await ui();
assert(/Round 1/i.test(s.banner), 'GUIDE banner shown: ' + s.banner.trim());

// -- guide, attempt 1: blind (lazy) play -> must FAIL the config resonance gate
let firstSpinShot = false;
for (let i = 0; i < CFG1.rounds; i++) {
  await playSpin(() => blindPick(CFG1), async () => {
    if (!firstSpinShot) { firstSpinShot = true; await sleep(150); await shot('guide-row-dim'); }
  });
}
await sleep(300);
await shot('guide-blind-fail');
s = await ui();
assert(s.open && /Round 1/i.test(s.banner), 'blind play failed GUIDE; round reset (still round 1)');
assert(!(await hasFlag('qa.naive.pair-lock')), 'no completion after guide fail');

// -- guide, attempt 2: informed -> goal 6 hits (all-diagonal deck: 6 spins)
for (let i = 0; i < CFG1.goal; i++) await playSpin(a => rowPick(CFG1, a));
await sleep(500);
await shot('guide-win');
let st2 = await waitState(8000);
assert(st2 === 'spin', 'advanced after guide win');
s = await ui();
assert(/Round 2/i.test(s.banner), 'INDEPENDENCE round banner: ' + s.banner.trim());
await shot('indep-grid');

// -- independence: 4 spins guessing the commonest B of the stranger towers (futile)
for (let i = 0; i < 4; i++) await playSpin(() => '☀');
await shot('indep-question');
await indepQuestion('yes'); // naive: "some row must beat it"
await shot('indep-yes-reteach');
s = await ui();
assert(/same shape/i.test(s.coach + (await page.evaluate(() => document.body.textContent))), 're-teach line shown after YES');
await clickOpt('.pl-q .btn', 'spin again');
await sleep(300);
for (let i = 0; i < 2; i++) await playSpin(() => '☀'); // two more spins
await indepQuestion('no');
s = await ui();
assert(/0\.00/.test(s.mi), 'I readout flipped to 0.00 bits: "' + s.mi.trim().slice(0, 60) + '"');
await shot('indep-zero-mi');
await clickOpt('.pl-q .btn', 'real lock');
await sleep(400);
s = await ui();
assert(/Round 3/i.test(s.banner), 'MASTERY banner: ' + s.banner.trim());
await shot('mastery-start');

// -- mastery: the kill-switch sequence — always the globally-commonest B (twice)
const blind1 = blindPick(CFG1);
console.log('  kill-switch: tapping', blind1, 'every spin, mastery rounds = 10');
for (let r = 0; r < 2; r++) {
  for (let i = 0; i < 10; i++) await playSpin(() => blind1);
  await sleep(400);
  s = await ui();
  assert(s.open && !s.debrief, `mastery blind attempt ${r + 1} blocked (no debrief)`);
  await shot('mastery-blind-fail-' + (r + 1));
}
s = await ui();
assert(s.coach.length > 0, 'hint ladder fired a coach hint: "' + s.coach.slice(0, 70) + '"');
assert(!(await hasFlag('qa.naive.pair-lock')), 'NAIVE run never completed');
await page.evaluate(() => window.G.overlay.close());
await sleep(400);

/* ================= RUN 2 — INFORMED (east config) ================= */
console.log('\n=== RUN 2: INFORMED on east config (must complete) ===');
await openPz(CFG1, 'qa.test.pair-lock');
await sleep(500);
await answerHook();
for (let i = 0; i < CFG1.goal; i++) await playSpin(a => rowPick(CFG1, a)); // guide
await waitState(8000);
for (let i = 0; i < 4; i++) await playSpin(a => rowPick(CFG1, a));         // independence spins
await indepQuestion('no');
await clickOpt('.pl-q .btn', 'real lock');
await sleep(400);
for (let i = 0; i < 10; i++) await playSpin(a => rowPick(CFG1, a));        // mastery (R=10)
const stDeb = await waitState();
assert(stDeb === 'debrief', 'informed mastery reached the DEBRIEF');
await shot('debrief-east');
s = await ui();
assert(/0\.85/.test(await page.evaluate(() => document.querySelector('.pzk-debrief').textContent)),
  'debrief shows I = 0.85 bits with their numbers');
await clickOpt('.pzk-debrief .btn', 'open the lock');
await sleep(600);
assert(!(await ui()).open, 'overlay closed after complete()');
assert(await hasFlag('qa.test.pair-lock'), 'flag qa.test.pair-lock set');
assert(await page.evaluate(() => window.G.pz.taught('pair-lock')), 'pair-lock marked taught');

/* ================= RUN 3 — TAUGHT SKIP (west attic config) ================= */
console.log('\n=== RUN 3: TAUGHT on west attic config (skip to mastery, complete) ===');
await page.evaluate(() => window.G.pz.markTaught('pair-lock')); // pre-set per directive
await openPz(CFG2, 'qa.test2.pair-lock');
await sleep(500);
s = await ui();
assert(s.open && !s.hook && !s.question, 'no hook/guide/independence — straight to mastery');
assert(/mastery/i.test(s.banner), 'mastery banner: ' + s.banner.trim());
await shot('taught-skip-mastery');
for (let i = 0; i < 16; i++) await playSpin(a => rowPick(CFG2, a)); // widened mastery R=16
const stDeb2 = await waitState();
assert(stDeb2 === 'debrief', 'west attic mastery reached the DEBRIEF');
await shot('debrief-west');
assert(/0\.52/.test(await page.evaluate(() => document.querySelector('.pzk-debrief').textContent)),
  'west debrief shows I = 0.52 bits');
await clickOpt('.pzk-debrief .btn', 'open the lock');
await sleep(600);
assert(await hasFlag('qa.test2.pair-lock'), 'flag qa.test2.pair-lock set');

/* ================= 420px pass ================= */
console.log('\n=== 420px pass ===');
await page.setViewport({ width: 420, height: 860 });
await page.evaluate(() => window.G.flags.clear('pz.pair-lock.taught')); // untaught: hook visible
await openPz(CFG1, 'qa.m.pair-lock');
await sleep(500);
await shot('m420-hook');
await answerHook();
await page.evaluate(() => document.querySelector('#pl-spin').click());
await sleep(400);
await shot('m420-guide-row');
const clip = await page.evaluate(() => {
  const heat = document.querySelector('.pl-heat');
  const body = document.querySelector('#puzzle-ov .pz-body');
  const panel = document.querySelector('#puzzle-ov .pz-panel');
  return { heatW: heat.scrollWidth, bodyW: body.clientWidth,
    panelW: panel.getBoundingClientRect().width, winW: window.innerWidth,
    hOverflow: body.scrollWidth > body.clientWidth + 1 };
});
console.log('  420px geometry:', JSON.stringify(clip));
assert(!clip.hOverflow && clip.panelW <= clip.winW, 'no horizontal clipping at 420px');
await page.evaluate(() => window.G.overlay.close());

console.log('\nerrors:', errors.length ? errors : 'none');
console.log(fails.length ? `\nDRIVE FAILED: ${fails.length} assertion(s)` : '\nDRIVE PASSED');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
