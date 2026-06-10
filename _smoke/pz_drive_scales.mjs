// Drive for the reworked 'scales' puzzle — derived from pz_drive.mjs (PEDAGOGY.md §4).
// NAIVE run: hook -> 4v4 weighing (expect the Shannon certainty-interrupt) ->
//   guess accusations + junk weighing (expect resets; must NEVER complete).
// INFORMED run: hook -> guide 3v3 -> 1v1 -> forced accusation -> mastery (no
//   suspect display; pencil marks; one guess to confirm the reset) -> 3v3 ->
//   1v1 -> forced accusation -> debrief tree -> complete (flag qa.test.scales).
// Then: taught reopen skips hook+guide; finally a 420px-width pass.
// Run from _smoke/:  node pz_drive_scales.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'scales';
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
const assert = (cond, name) => { if (cond) console.log('  ok  -', name); else { failures++; console.log('  FAIL-', name); } };

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

// ---- island config (frozen: {coins:9, odd:'light', weighings:2}) ----
const cfg = await page.evaluate(t => {
  for (const isl of window.G.islands.list()) {
    for (const e of (isl.entities || [])) {
      if (e.puzzle && e.puzzle.type === t) return e.puzzle.config || {};
    }
  }
  return {};
}, type);

// ---- in-page helpers ----
const openPz = flag => page.evaluate((t, c, f) =>
  window.G.overlay.open({ type: t, config: c, flag: f }), type, cfg, flag);
const phaseOf = () => page.evaluate(() => {
  const w = document.querySelector('#puzzle-ov [data-sc-phase]');
  return w ? w.getAttribute('data-sc-phase') + '/' + w.getAttribute('data-sc-round') : '(none)';
});
const tiltOf = () => page.evaluate(() => {
  const r = document.querySelector('#puzzle-ov [data-sc-tilt]');
  return r ? r.getAttribute('data-sc-tilt') : null;
});
const ovText = () => page.evaluate(() => {
  const o = document.querySelector('#puzzle-ov');
  return o ? o.textContent : '';
});
const click = sel => page.evaluate(s => {
  const b = document.querySelector('#puzzle-ov ' + s);
  if (b && !b.disabled) { b.click(); return true; }
  return false;
}, sel);
const tapChip = c => click(`[data-sc-chip="${c}"]`);
const placeCoin = async (c, where) => {            // bench -> left -> right
  await tapChip(c);
  if (where === 'right') await tapChip(c);
};
const weigh = () => click('[data-sc-act="weigh"]');
const cont = () => click('[data-sc-act="continue"]');
const accuse = async c => {
  await click(`[data-sc-coin="${c}"]`);
  await click('[data-sc-act="accuse"]');
};
const hookPick = i => page.evaluate(idx => {
  const o = document.querySelectorAll('#puzzle-ov .pzk-opt')[idx];
  if (o && !o.disabled) { o.click(); return true; }
  return false;
}, i);
const hookGo = () => click('.pzk-hook .btn');
const flagged = f => page.evaluate(f2 => window.G.flags.has(f2), f);
const overlayOpen = () => page.evaluate(() => window.G.overlay.isOpen());

// guide/mastery solver: 3v3 then 1v1, reading only what a player sees (the tilt)
const groups3 = t => t === 'balance' ? [6, 7, 8] : (t === 'left' ? [3, 4, 5] : [0, 1, 2]); // odd:'light'
async function solveRound() {
  for (const c of [0, 1, 2]) await placeCoin(c, 'left');
  for (const c of [3, 4, 5]) await placeCoin(c, 'right');
  await weigh(); await sleep(120);
  const t1 = await tiltOf();
  const g = groups3(t1);
  await placeCoin(g[0], 'left'); await placeCoin(g[1], 'right');
  await weigh(); await sleep(120);
  const t2 = await tiltOf();
  const fake = t2 === 'balance' ? g[2] : (t2 === 'left' ? g[1] : g[0]);
  await accuse(fake); await sleep(150);
  return { t1, t2, fake };
}

/* ================= NAIVE RUN — must never complete ================= */
console.log('--- NAIVE run');
await openPz('qa.test.' + type); await sleep(400);
assert(await overlayOpen(), 'overlay open');
assert((await phaseOf()) === 'hook/guide', 'opens on the hook');
await shot('01-hook');

await hookPick(2); await sleep(150);                       // wrong prediction ("4")
assert(/three|3-way/i.test(await ovText()), 'hook reveal shows the three-outcomes argument');
await shot('02-hook-reveal');
await hookGo(); await sleep(150);
assert((await phaseOf()) === 'play/guide', 'guide round starts');
await shot('03-guide');

// the lazy weighing: 4 v 4
for (const c of [0, 1, 2, 3]) await placeCoin(c, 'left');
for (const c of [4, 5, 6, 7]) await placeCoin(c, 'right');
await weigh(); await sleep(150);
assert((await phaseOf()) === 'pause/guide', '4v4 -> Shannon interrupts before weighing 2');
assert(/certainty/i.test(await ovText()) && /3|three/i.test(await ovText()),
  'interrupt states the counting argument');
await shot('04-interrupt');
await cont(); await sleep(150);
assert((await phaseOf()) === 'play/guide', 'interrupt resets the round');

// guess accusations: reset every time, never complete
for (const [i, c] of [[1, 0], [2, 4], [3, 8]]) {
  await accuse(c); await sleep(120);
  assert((await phaseOf()) === 'pause/guide', `guess accusation #${i} -> reset card`);
  if (i === 1) { assert(/guess/i.test(await ovText()), 'guess card names the guess'); await shot('05-guess-reset'); }
  if (i === 2) await shot('06-hint-h1');                   // 3rd consecutive fail -> hint visible after continue
  await cont(); await sleep(120);
}
await shot('07-guide-hint');                                // hint ladder card in play phase
assert(/Hint\./.test(await ovText()), 'hint ladder engaged after repeated failures');

// junk weighing (1v1 from 9) -> interrupted too
await placeCoin(0, 'left'); await placeCoin(1, 'right');
await weigh(); await sleep(150);
assert((await phaseOf()) === 'pause/guide', 'junk 1v1 weighing -> interrupted');
await cont(); await sleep(120);
assert(await overlayOpen(), 'overlay still open after all naive attempts');
assert(!(await flagged('qa.test.' + type)), 'NAIVE RUN NEVER COMPLETES');
await page.evaluate(() => window.G.overlay.close()); await sleep(200);

/* ================= INFORMED RUN — must complete ================= */
console.log('--- INFORMED run');
await openPz('qa.test.' + type); await sleep(400);
assert((await phaseOf()) === 'hook/guide', 'fresh open: hook again (not yet taught)');
await hookPick(0); await sleep(120);                       // correct prediction ("2")
await hookGo(); await sleep(120);

// guide: 3v3 -> narration, then 1v1 -> forced accusation
for (const c of [0, 1, 2]) await placeCoin(c, 'left');
for (const c of [3, 4, 5]) await placeCoin(c, 'right');
await weigh(); await sleep(150);
assert((await phaseOf()) === 'play/guide', '3v3 passes the certainty check');
assert(/suspect/i.test(await ovText()), 'guide narrates the elimination (ledger visible)');
await shot('08-guide-w1-narration');
const t1 = await tiltOf();
const g = groups3(t1);
await placeCoin(g[0], 'left'); await placeCoin(g[1], 'right');
await weigh(); await sleep(150);
const t2 = await tiltOf();
const fake1 = t2 === 'balance' ? g[2] : (t2 === 'left' ? g[1] : g[0]);
await shot('09-guide-w2-forced');
await accuse(fake1); await sleep(180);
assert((await phaseOf()) === 'pause/guide', 'guide gate passed -> round 2 card');
await shot('10-guide-complete');
await cont(); await sleep(180);

// mastery: no suspect display
assert((await phaseOf()) === 'play/mastery', 'mastery round starts');
const mText = await ovText();
assert(!/still suspect/i.test(mText) && !/suspects:/i.test(mText), 'NO suspect display in mastery');
await shot('11-mastery');

// kill-switch spot-checks inside mastery: guess -> reset; 4v4 -> interrupt
await accuse(3); await sleep(120);
assert((await phaseOf()) === 'pause/mastery', 'mastery guess accusation -> reset');
await shot('12-mastery-guess');
await cont(); await sleep(120);
for (const c of [0, 1, 2, 3]) await placeCoin(c, 'left');
for (const c of [4, 5, 6, 7]) await placeCoin(c, 'right');
await weigh(); await sleep(120);
assert((await phaseOf()) === 'pause/mastery', 'mastery 4v4 -> interrupted too');
await cont(); await sleep(120);

// pencil marks: tap a coin twice (choose, then mark ✓), another thrice (mark ?)
await click('[data-sc-coin="6"]'); await click('[data-sc-coin="6"]');
await click('[data-sc-coin="7"]'); await click('[data-sc-coin="7"]'); await click('[data-sc-coin="7"]');
await sleep(100);
assert(await page.evaluate(() => document.querySelectorAll('#puzzle-ov .sc-mk').length >= 2),
  'pencil marks render on coins');
await shot('13-mastery-marks');
await click('[data-sc-coin="7"]'); await click('[data-sc-coin="6"]'); await click('[data-sc-coin="6"]');
await click('[data-sc-coin="6"]'); await sleep(80);        // clear both marks + selection

// the informed solve
const r = await solveRound();
assert((await phaseOf()) === 'debrief/mastery', 'mastery gate passed -> debrief');
assert(/Weighing 1/.test(await ovText()) && /Weighing 2/.test(await ovText()), 'debrief draws the outcome tree');
assert(/1\.58/.test(await ovText()) && /3\.17/.test(await ovText()), 'debrief shows the bits identity');
await shot('14-debrief');
await click('.pzk-debrief .btn'); await sleep(300);
assert(!(await overlayOpen()), 'overlay closed after debrief button');
assert(await flagged('qa.test.' + type), 'INFORMED RUN COMPLETES (flag qa.test.scales)');
assert(await flagged('pz.scales.taught'), 'markTaught persisted');
console.log('  informed weighings:', r.t1, '->', r.t2, '-> accused #' + (r.fake + 1));

/* ================= taught reopen: skip hook + guide ================= */
console.log('--- taught reopen');
await openPz('qa.test2.' + type); await sleep(300);
assert((await phaseOf()) === 'play/mastery', 'repeat encounter opens straight in mastery');
await shot('15-taught-reopen');
await page.evaluate(() => window.G.overlay.close()); await sleep(200);

/* ================= 420px-width pass ================= */
console.log('--- 420px pass');
await page.setViewport({ width: 420, height: 860 });
await page.evaluate(() => window.G.flags.clear('pz.scales.taught'));
await openPz('qa.test420.' + type); await sleep(400);
assert((await phaseOf()) === 'hook/guide', '420: hook shows');
await shot('m420-01-hook');
await hookPick(0); await sleep(120); await hookGo(); await sleep(120);
await shot('m420-02-guide');
await solveRound(); await sleep(120);                       // guide
await shot('m420-03-round2-card');
await cont(); await sleep(150);
await shot('m420-04-mastery');
await solveRound(); await sleep(150);                       // mastery
assert((await phaseOf()) === 'debrief/mastery', '420: debrief reached');
await shot('m420-05-debrief');
await click('.pzk-debrief .btn'); await sleep(250);
assert(await flagged('qa.test420.' + type), '420: completes');

console.log('errors:', errors.length ? errors : 'none');
console.log(failures ? `RESULT: ${failures} assertion(s) FAILED` : 'RESULT: all assertions passed');
await browser.close();
process.exit(failures ? 1 : 0);
