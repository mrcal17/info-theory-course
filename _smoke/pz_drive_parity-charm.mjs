// Chrome drive for the reworked 'parity-charm' — derived from pz_drive.mjs.
// PEDAGOGY §4 self-verification:
//   RUN 1  detect  INFORMED : hook -> guided trip -> stripped trips -> two-flip
//                             demo -> debrief -> complete (flag set)
//   RUN 2  correct NAIVE    : 10 random rune clicks -> resets, NEVER completes
//   RUN 3  correct INFORMED : 2 deliberate misses (gate fail + hint ladder),
//                             then syndrome play -> debrief table -> complete
//   RUN 4  420px pass       : detect (hook/rig/declare/demo/debrief) + correct
//                             (rig/declare/debrief) at mobile width
// Run from _smoke/:  node pz_drive_parity-charm.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'parity-charm';
const FLAG = 'qa.test.' + type;
const DETECT_CFG = { dataBits: 6, mode: 'detect', trips: 3 };   // 04_strait.js:82
const CORRECT_CFG = { dataBits: 4, mode: 'correct', trips: 3 }; // 04_strait.js:150

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'pz', type);
fs.mkdirSync(shots, { recursive: true });

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=900,860', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 900, height: 860 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; console.error('ASSERT FAIL:', msg); } else console.log('ok:', msg); };

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

// ---- helpers ----
const uiState = () => page.evaluate(f => {
  const q = s => document.querySelector(s);
  return {
    open: window.G.overlay.isOpen(),
    hook: !!q('#puzzle-ov .pzk-hook'),
    debrief: !!q('#puzzle-ov .pzk-debrief'),
    phase: (q('#puzzle-ov .pc-phase') || {}).textContent || '',
    picks: document.querySelectorAll('#puzzle-ov .pc-chip.pc-pick').length,
    coach: (q('#puzzle-ov .pzk-coach') || {}).textContent || '',
    flag: window.G.flags.has(f),
  };
}, FLAG);
async function waitFor(pred, label, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await uiState();
    if (pred(s)) return s;
    await sleep(120);
  }
  failures++;
  console.error('TIMEOUT waiting for', label, JSON.stringify(await uiState()));
  return null;
}
const clickByText = re => page.evaluate(src => {
  const r = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov button')].find(b => r.test(b.textContent));
  if (b && !b.disabled) { b.click(); return true; }
  return false;
}, re.source);
const openPuzzle = cfg => page.evaluate((t, c, f) =>
  window.G.overlay.open({ type: t, config: c, flag: f }), type, cfg, FLAG);
const clearFlag = f => page.evaluate(x => window.G.flags.clear(x), f);

// detect rig: make the displayed codeword even, then send
async function detectRigAndSend() {
  const odd = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('#puzzle-ov .pc-bits .pc-chip')];
    return chips.filter(c => c.classList.contains('pc-one')).length % 2 === 1;
  });
  if (odd) await page.evaluate(() => document.querySelector('#puzzle-ov .pc-chip.pc-charm').click());
  await clickByText(/Send across/);
}
// detect declare: count lit chips, answer what parity says
async function detectDeclare() {
  const n = await page.evaluate(() =>
    document.querySelectorAll('#puzzle-ov .pc-bits .pc-chip.pc-one').length);
  await clickByText(n % 2 ? /^\s*CORRUPTED\s*$/ : /^\s*CLEAN\s*$/);
}
// correct rig: toggle every frowning sister's charm, then send
async function correctRigAndSend() {
  for (let i = 0; i < 4; i++) {
    const done = await page.evaluate(() => {
      const bad = document.querySelector('#puzzle-ov .pc-charmcard.pc-bad .btn');
      if (bad) { bad.click(); return false; }
      return true;
    });
    if (done) break;
  }
  await clickByText(/Send across/);
}
// correct declare: read the rings -> the named position (0 = clean)
const readAns = () => page.evaluate(() => {
  const odd = [...document.querySelectorAll('#puzzle-ov .pc-ring.pc-rred')]
    .map(p => ({ A: 'A', B: 'B', C: 'C' })[p.textContent.trim()[0] === 'A' ? 'A'
      : p.textContent.trim().startsWith('Bea') ? 'B' : 'C']);
  return window.G.puzzles.get('parity-charm')._test.positionFromSyndrome(odd);
});
const clickChip = idx1 => page.evaluate(i =>
  document.querySelectorAll('#puzzle-ov .pc-chip.pc-pick')[i - 1].click(), idx1);

/* ================= RUN 1 — detect, INFORMED ================= */
console.log('--- RUN 1: detect informed ---');
await openPuzzle(DETECT_CFG);
let s = await waitFor(x => x.open && x.hook, 'hook card');
await shot('01-hook');
await page.evaluate(() => document.querySelectorAll('#puzzle-ov .pzk-opt')[1].click()); // the right prediction
await sleep(250);
await shot('02-hook-reveal');
await clickByText(/find out/);
let shotsTaken = { rigG: false, declG: false, declS: false, cross: false };
for (let trip = 0; trip < 12; trip++) {
  s = await waitFor(x => /Rig the charm/.test(x.phase) || /Demonstration/.test(x.phase), 'rig or demo');
  if (!s) break;
  if (/Demonstration/.test(s.phase)) break;
  if (!shotsTaken.rigG) { await shot('03-rig-guided'); shotsTaken.rigG = true; }
  await detectRigAndSend();
  if (!shotsTaken.cross) { await sleep(550); await shot('04-crossing'); shotsTaken.cross = true; }
  s = await waitFor(x => /Arrival/.test(x.phase), 'declare');
  if (!s) break;
  if (/crossing 1/.test(s.phase) && !shotsTaken.declG) { await shot('05-declare-guided'); shotsTaken.declG = true; }
  else if (!shotsTaken.declS) { await shot('06-declare-stripped'); shotsTaken.declS = true; }
  await detectDeclare();
  await sleep(300);
}
s = await waitFor(x => /Demonstration/.test(x.phase), 'two-flip demo intro');
await shot('07-demo-intro');
await clickByText(/Watch the crossing/);
await sleep(750);
await shot('08-demo-crossing');
s = await waitFor(x => /two flips/.test(x.phase), 'demo arrival');
await shot('09-demo-twoflip');
await clickByText(/^\s*Continue/);
s = await waitFor(x => x.debrief, 'detect debrief');
await shot('10-debrief-detect');
await clickByText(/wave you on/);
await sleep(400);
s = await uiState();
assert(!s.open && s.flag, 'RUN1 detect informed completed, flag set');
assert(await page.evaluate(() => window.G.flags.has('pz.parity-charm-detect.taught')), 'detect taught flag set');
assert(!(await page.evaluate(() => window.G.flags.has('pz.parity-charm-correct.taught'))), 'correct taught flag still unset');

/* ================= RUN 2 — correct, NAIVE (random rune clicks) ================= */
console.log('--- RUN 2: correct naive ---');
await clearFlag(FLAG);
await openPuzzle(CORRECT_CFG);
let naiveShots = { guide: false, reset: false, hint: false };
for (let click = 0; click < 10; click++) {
  s = await waitFor(x => /Rig the charm/.test(x.phase), 'naive rig ' + click);
  if (!s) break;
  await correctRigAndSend();
  s = await waitFor(x => /Arrival/.test(x.phase) && x.picks === 7, 'naive declare ' + click);
  if (!s) break;
  if (!naiveShots.guide) { await shot('11-correct-guided-syndrome'); naiveShots.guide = true; }
  if (!naiveShots.hint && await page.evaluate(() => !!document.querySelector('#puzzle-ov .pzk-coach'))
      && click >= 2) { await shot('13-correct-hint-ladder'); naiveShots.hint = true; }
  await page.evaluate(() => {
    const picks = [...document.querySelectorAll('#puzzle-ov .pc-chip.pc-pick')];
    picks[Math.floor(Math.random() * picks.length)].click();
  });
  if (!naiveShots.reset) { await sleep(250); await shot('12-naive-reset'); naiveShots.reset = true; }
  await sleep(300);
}
s = await uiState();
assert(s.open && !s.flag, 'RUN2 naive (10 random rune clicks) never completed');
const naiveStreak = await page.evaluate(() =>
  (document.querySelector('#puzzle-ov .pz-status') || {}).textContent || '');
console.log('naive end status:', naiveStreak.trim());
await page.evaluate(() => window.G.overlay.close());
await sleep(300);

/* ================= RUN 3 — correct, INFORMED (with 2 scripted misses) ================= */
console.log('--- RUN 3: correct informed ---');
await clearFlag(FLAG);
await openPuzzle(CORRECT_CFG);
// two deliberate wrong first-clicks -> gate-fail feedback + hint ladder level 1
for (let miss = 0; miss < 2; miss++) {
  s = await waitFor(x => /Rig the charm/.test(x.phase), 'miss rig ' + miss);
  await correctRigAndSend();
  s = await waitFor(x => /Arrival/.test(x.phase) && x.picks === 7, 'miss declare ' + miss);
  const ans = await readAns();
  await clickChip(ans === 0 ? 1 : (ans % 7) + 1);   // guaranteed wrong
  if (miss === 0) { await sleep(250); await shot('14-gate-fail'); }
  await sleep(300);
}
s = await waitFor(x => /Rig the charm/.test(x.phase), 'post-miss rig', 10000);
await correctRigAndSend();
s = await waitFor(x => /Arrival/.test(x.phase) && x.picks === 7, 'post-miss declare', 10000);
assert(s && /ALL of them and NONE/.test(s.coach),
  'hint ladder (h1) visible after 2 consecutive failures');
await shot('15-hint1');
// now play it straight until the debrief
for (let trip = 0; trip < 16; trip++) {
  s = await uiState();
  if (s.debrief) break;
  if (/Arrival/.test(s.phase) && s.picks === 7) {
    const ans = await readAns();
    if (ans === 0) await clickByText(/All clean/);
    else await clickChip(ans);
    await sleep(350);
  } else if (/Rig the charm/.test(s.phase)) {
    await correctRigAndSend();
    await waitFor(x => (/Arrival/.test(x.phase) && x.picks === 7) || x.debrief, 'informed declare ' + trip);
  } else {
    await sleep(250);
  }
}
s = await waitFor(x => x.debrief, 'correct debrief');
await shot('16-debrief-syndrome-table');
await clickByText(/wave you on/);
await sleep(400);
s = await uiState();
assert(!s.open && s.flag, 'RUN3 correct informed completed, flag set');
assert(await page.evaluate(() => window.G.flags.has('pz.parity-charm-correct.taught')), 'correct taught flag set');

/* ================= RUN 4 — 420px pass ================= */
console.log('--- RUN 4: 420px ---');
await page.setViewport({ width: 420, height: 860 });
await page.evaluate(() => {
  window.G.flags.clear('pz.parity-charm-detect.taught');
  window.G.flags.clear('pz.parity-charm-correct.taught');
  window.G.flags.clear('qa.test.parity-charm');
});
await openPuzzle(DETECT_CFG);
s = await waitFor(x => x.open && x.hook, '420 hook');
await shot('20-420-hook');
await page.evaluate(() => document.querySelectorAll('#puzzle-ov .pzk-opt')[1].click());
await sleep(250);
await clickByText(/find out/);
for (let trip = 0; trip < 12; trip++) {
  s = await waitFor(x => /Rig the charm/.test(x.phase) || /Demonstration/.test(x.phase), '420 rig/demo');
  if (!s || /Demonstration/.test(s.phase)) break;
  if (trip === 0) await shot('21-420-rig');
  await detectRigAndSend();
  s = await waitFor(x => /Arrival/.test(x.phase), '420 declare');
  if (!s) break;
  if (trip === 0) await shot('22-420-declare');
  await detectDeclare();
  await sleep(300);
}
s = await waitFor(x => /Demonstration/.test(x.phase), '420 demo');
await clickByText(/Watch the crossing/);
s = await waitFor(x => /two flips/.test(x.phase), '420 demo arrival');
await shot('23-420-demo-twoflip');
await clickByText(/^\s*Continue/);
s = await waitFor(x => x.debrief, '420 detect debrief');
await shot('24-420-debrief-detect');
await clickByText(/wave you on/);
await sleep(400);
// correct mode at 420 (untaught again -> guided round + table debrief)
await clearFlag(FLAG);
await openPuzzle(CORRECT_CFG);
for (let trip = 0; trip < 16; trip++) {
  s = await uiState();
  if (s.debrief) break;
  if (/Rig the charm/.test(s.phase)) {
    if (trip === 0) await shot('25-420-correct-rig');
    await correctRigAndSend();
    s = await waitFor(x => (/Arrival/.test(x.phase) && x.picks === 7) || x.debrief, '420 correct declare');
    if (s && /Arrival/.test(s.phase) && trip === 0) await shot('26-420-correct-declare');
  } else if (/Arrival/.test(s.phase) && s.picks === 7) {
    const ans = await readAns();
    if (ans === 0) await clickByText(/All clean/);
    else await clickChip(ans);
    await sleep(350);
  } else {
    await sleep(250);
  }
}
s = await waitFor(x => x.debrief, '420 correct debrief');
await shot('27-420-debrief-table');
await clickByText(/wave you on/);
await sleep(400);
s = await uiState();
assert(!s.open && s.flag, 'RUN4 420px correct informed completed');

console.log('errors:', errors.length ? errors : 'none');
console.log(failures === 0 ? 'DRIVE: all assertions pass' : `DRIVE: ${failures} FAILURES`);
await browser.close();
process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
