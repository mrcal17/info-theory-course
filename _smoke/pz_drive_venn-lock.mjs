// Chrome drive for the reworked 'venn-lock' (copy of pz_drive.mjs, PEDAGOGY §4.2).
// Scenarios:
//   A NAIVE   (strait relay config {rounds:6,twist:true}, fresh save): lazy hook
//             pick, then always click chip d1 — must reset every miss and NEVER
//             complete within the attempt budget.
//   B INFORMED (same config, still untaught): answer the hook, read the odd
//             rings each round, click the indicated rune, take the twist beat,
//             finish the debrief — must complete and set qa.test.venn-lock.
//   C TAUGHT  (grand-beacon gate-4 config {rounds:5,twist:true}, markTaught
//             pre-set): hook must be SKIPPED, decoder table still present,
//             informed run completes.
//   D 420px   board render — rings must not clip.
// Run from _smoke/:  node pz_drive_venn-lock.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'venn-lock';
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
let pass = 0, fail = 0;
const check = (cond, msg) => { cond ? pass++ : fail++; console.log((cond ? 'ok  ' : 'FAIL') + ' ' + msg); };

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
const openLock = (cfg) => page.evaluate((t, c) => {
  window.G.flags.clear('qa.test.' + t);
  window.G.overlay.open({ type: t, config: c, flag: 'qa.test.' + t });
}, type, cfg);

const completed = () => page.evaluate(t => !window.G.overlay.isOpen() && window.G.flags.has('qa.test.' + t), type);

// snapshot of where the puzzle is right now (no clicking)
const getState = () => page.evaluate(() => {
  if (!window.G.overlay.isOpen()) return { st: 'closed' };
  const ov = document.querySelector('#puzzle-ov');
  const btns = [...ov.querySelectorAll('button')];
  if (btns.some(b => /swings open/i.test(b.textContent))) return { st: 'debrief' };
  if (btns.some(b => /hold that thought/i.test(b.textContent))) return { st: 'beat' };
  if (btns.some(b => b.classList.contains('pzk-opt') && !b.disabled)) return { st: 'hook' };
  if (btns.some(b => /to the lock/i.test(b.textContent))) return { st: 'hook-revealed' };
  const chip = ov.querySelector('.vl-chip:not(.vl-locked)');
  if (chip) {
    const banner = ov.querySelector('.pzk-bn');
    const odd = [...ov.querySelectorAll('.vl-circle.vl-odd')].map(c => c.dataset.ring).sort().join('');
    const tableKnown = [...ov.querySelectorAll('.vl-trow')].filter(r => !r.textContent.includes('?')).length;
    // a HINT card (not the round-1 guide line): match the ladder's actual texts
    const coach = ov.querySelector('.pzk-coach .pzk-ctext');
    const hint = coach ? /guessing resets|calm rings speak|read it off/i.test(coach.textContent) : false;
    return { st: 'round', odd, banner: banner ? banner.textContent.trim() : '', tableKnown, hint };
  }
  return { st: 'busy' };
});

const clickHookOption = (label) => page.evaluate(l => {
  const b = [...document.querySelectorAll('#puzzle-ov .pzk-opt')].find(b => b.textContent.trim() === l && !b.disabled);
  if (b) { b.click(); return true; } return false;
}, label);
const clickByText = (src) => page.evaluate(s => {
  const r = new RegExp(s, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov button')].find(b => r.test(b.textContent) && !b.disabled);
  if (b) { b.click(); return true; } return false;
}, src);
const clickChip = (pos) => page.evaluate(p => {
  const g = document.querySelector('#puzzle-ov .vl-chip[data-pos="' + p + '"]');
  if (g && !g.classList.contains('vl-locked')) {
    g.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true;
  } return false;
}, pos);
const MAP = { A: 5, B: 6, C: 7, AB: 1, AC: 2, BC: 3, ABC: 4 };

const STRAIT = { rounds: 6, twist: true };       // 04_strait.js:155 / dialogue :305
const GBEACON = { rounds: 5, twist: true };      // 07_grand_beacon.js:163

/* ================= A — NAIVE (must NOT complete) ================= */
console.log('--- A: naive run (strait config) ---');
await openLock(STRAIT);
await sleep(500);
let st = await getState();
check(st.st === 'hook', 'A: first encounter opens on the hook (got ' + st.st + ')');
await shot('a1-hook');
await clickHookOption('4');                       // lazy wrong prediction — welcomed, not punished
await sleep(300);
await shot('a2-hook-revealed');
await clickByText('to the lock');
await sleep(600);

let resets = 0, luckyAdvances = 0, sawHint = false, lastBanner = '';
for (let i = 0; i < 12; i++) {
  // wait for a clickable round
  for (let w = 0; w < 20; w++) { st = await getState(); if (st.st !== 'busy') break; await sleep(200); }
  if (st.st !== 'round') break;
  if (st.hint && !sawHint) { sawHint = true; await shot('a4-naive-hint'); }
  lastBanner = st.banner;
  await clickChip(1);                              // the laziest sequence: always d1
  await sleep(250);
  if (i === 0) await shot('a3-naive-first-click');
  const fb = await page.evaluate(() => {
    const f = document.querySelector('#puzzle-ov .vl-fb');
    return f ? f.className : '';
  });
  if (/vl-bad/.test(fb)) resets++; else luckyAdvances++;
  await sleep(1700);                               // outlive the 1400ms reset timer
}
st = await getState();
check(!(await completed()), 'A: naive run did NOT complete (' + resets + ' resets, ' + luckyAdvances + ' lucky hits)');
check(resets >= 5, 'A: wrong clicks reset the round with a fresh flip (' + resets + ' resets observed)');
check(st.st !== 'closed', 'A: overlay still open after naive budget (at "' + lastBanner + '")');
check(sawHint, 'A: hint ladder fired after consecutive failures');
await shot('a5-naive-still-open');
await page.evaluate(() => window.G.overlay.close());
await sleep(400);

/* ================= B — INFORMED (must complete) ================= */
console.log('--- B: informed run (strait config) ---');
const taughtBefore = await page.evaluate(() => window.G.pz.taught('venn-lock'));
check(!taughtBefore, 'B: still untaught after naive failure');
await openLock(STRAIT);
await sleep(500);
st = await getState();
check(st.st === 'hook', 'B: hook shown again (still untaught)');
await clickHookOption('8');
await sleep(300);
await shot('b1-hook-reveal');
await clickByText('to the lock');
await sleep(600);

let shotsTaken = { round1: false, mid: false, twist: false };
for (let step = 0; step < 80; step++) {
  for (let w = 0; w < 24; w++) { st = await getState(); if (st.st !== 'busy') break; await sleep(200); }
  if (st.st === 'closed') break;
  if (st.st === 'debrief') { await shot('b6-debrief'); await clickByText('swings open'); await sleep(500); continue; }
  if (st.st === 'beat') { await shot('b5-twist-beat'); await clickByText('hold that thought'); await sleep(400); continue; }
  if (st.st === 'round') {
    const isTwist = st.banner.includes('Round ' + STRAIT.rounds);
    if (!shotsTaken.round1) { await shot('b2-round1-guide'); shotsTaken.round1 = true; }
    else if (!shotsTaken.mid && st.tableKnown >= 4) { await shot('b3-mid-table-filling'); shotsTaken.mid = true; }
    if (isTwist && !shotsTaken.twist) { await shot('b4-twist-round'); shotsTaken.twist = true; }
    const pos = MAP[st.odd];
    check2log('B round "' + st.banner + '" odd=' + st.odd + ' -> click ' + pos);
    await clickChip(pos);
    await sleep(1300);                             // outlive the 950ms advance timer
    continue;
  }
  await sleep(300);
}
check(await completed(), 'B: informed run completed + flag qa.test.venn-lock set');
check(await page.evaluate(() => window.G.pz.taught('venn-lock')), 'B: markTaught persisted on completion');
check(shotsTaken.twist, 'B: twist round reached and screenshotted');

function check2log(s) { console.log('     ' + s); }

/* ================= C — TAUGHT repeat (grand-beacon, hook skipped) ================= */
console.log('--- C: taught repeat (grand-beacon config) ---');
await page.evaluate(() => window.G.pz.markTaught('venn-lock'));  // pre-set explicitly per directive
await openLock(GBEACON);
await sleep(500);
st = await getState();
check(st.st === 'round', 'C: opens directly on a round — hook skipped (got ' + st.st + ')');
const hasHook = await page.evaluate(() => !!document.querySelector('#puzzle-ov .pzk-hook'));
check(!hasHook, 'C: no hook card in DOM');
const hasTable = await page.evaluate(() => !!document.querySelector('#puzzle-ov .vl-table'));
check(hasTable, 'C: decoder table still present (working tool, not tutorial)');
const guided = await page.evaluate(() => {
  const s = document.querySelector('#puzzle-ov .vl-syn');
  return s ? s.textContent.includes('→') : false;
});
check(!guided, 'C: guided syndrome read-out suppressed in mastery mode');
await shot('c1-taught-skip-board');
for (let step = 0; step < 60; step++) {
  for (let w = 0; w < 24; w++) { st = await getState(); if (st.st !== 'busy') break; await sleep(200); }
  if (st.st === 'closed') break;
  if (st.st === 'debrief') { await shot('c2-debrief'); await clickByText('swings open'); await sleep(500); continue; }
  if (st.st === 'beat') { await clickByText('hold that thought'); await sleep(400); continue; }
  if (st.st === 'round') { await clickChip(MAP[st.odd]); await sleep(1300); continue; }
  await sleep(300);
}
check(await completed(), 'C: taught repeat completed');

/* ================= D — 420px pass ================= */
console.log('--- D: 420px ---');
await page.setViewport({ width: 420, height: 860 });
await openLock(GBEACON);
await sleep(600);
const geom = await page.evaluate(() => {
  const svg = document.querySelector('#puzzle-ov .vl-svg');
  const body = document.querySelector('#puzzle-ov .pz-body');
  if (!svg || !body) return null;
  const r = svg.getBoundingClientRect(), b = body.getBoundingClientRect();
  return { svgL: r.left, svgR: r.right, bodyL: b.left, bodyR: b.right, vw: window.innerWidth,
           overflowX: body.scrollWidth > body.clientWidth };
});
check(geom && geom.svgL >= 0 && geom.svgR <= geom.vw, 'D: rings fit in 420px viewport ' + JSON.stringify(geom));
check(geom && !geom.overflowX, 'D: no horizontal overflow in puzzle body');
await shot('d1-420-board');
// scroll the decoder table into view at 420 (it stacks under the rings)
await page.evaluate(() => { const t = document.querySelector('#puzzle-ov .vl-table'); if (t) t.scrollIntoView(); });
await sleep(300);
await shot('d2-420-table');
await page.evaluate(() => window.G.overlay.close());

console.log('errors:', errors.length ? errors : 'none');
console.log(`RESULT: ${pass} ok, ${fail} fail`);
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
