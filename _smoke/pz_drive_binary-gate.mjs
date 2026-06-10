// Chrome drive for the reworked 'binary-gate' — derived from pz_drive.mjs.
// Scripts (a) a NAIVE run (click the first-listed question every time): must
// fail the strip-round gate, show a coach correction + fresh-letter button,
// and never reach api.complete; (b) an INFORMED run (config questions only):
// must complete (flag qa.test.binary-gate). Also re-opens after completion to
// verify taught mode (no hook, no guide), and repeats the informed flow at a
// 420px viewport for mobile screenshots.
// Run from _smoke/:
//   node pz_drive_binary-gate.mjs                  -> 8-item island config
//   node pz_drive_binary-gate.mjs '<configJSON>'   -> e.g. the 4-item config
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'binary-gate';
const argCfg = process.argv[2] ? JSON.parse(process.argv[2]) : null;

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
let failures = 0;
const assert = (cond, msg) => {
  if (!cond) { failures++; console.error('  ASSERT FAIL:', msg); }
  else console.log('  ok:', msg);
};

// ---- boot to world state (fresh save -> taught flag cleared) ----
async function freshBoot() {
  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(500);
  await page.evaluate(() => { localStorage.removeItem('quiet-archipelago-v1'); location.reload(); });
  await sleep(900);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /new game/i.test(b.textContent));
    if (b) b.click();
  });
  await sleep(1000);
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => window.G.qa.state().state);
    if (st === 'world') break;
    await page.keyboard.press('KeyE'); await sleep(140);
  }
}

await freshBoot();

// ---- config: argv JSON or first binary-gate config on the islands ----
const cfg = argCfg || await page.evaluate(t => {
  for (const isl of window.G.islands.list()) {
    for (const e of (isl.entities || [])) {
      if (e.puzzle && e.puzzle.type === t) return e.puzzle.config || {};
    }
  }
  return {};
}, type);
const N = cfg.items.length;
const tag = 'n' + N;
const labels = Object.values(cfg.traitLabels || {});
const hasMastery = N >= 6;
console.log(`config: ${N} items, traits [${Object.keys(cfg.traitLabels)}], mastery=${hasMastery}`);

const shot = n => page.screenshot({ path: path.join(shots, `${tag}-${n}.png`) });

// ---- in-page helpers ----
const openOverlay = () => page.evaluate((t, c) =>
  window.G.overlay.open({ type: t, config: c, flag: 'qa.test.' + t }), type, cfg);
const q = sel => page.evaluate(s => !!document.querySelector('#puzzle-ov ' + s), sel);
const bodyText = () => page.evaluate(() => document.querySelector('#puzzle-ov .pz-body').textContent);
const clickSel = sel => page.evaluate(s => {
  const b = document.querySelector('#puzzle-ov ' + s);
  if (b && !b.disabled) { b.click(); return true; } return false;
}, sel);
const clickFirstQuestion = () => page.evaluate(() => {
  const b = document.querySelector('#puzzle-ov .bg-qlist .bg-q');
  if (b) { const t = b.textContent.trim(); b.click(); return t; } return null;
});
const clickQuestionByText = txt => page.evaluate(t => {
  const b = [...document.querySelectorAll('#puzzle-ov .bg-q')]
    .find(x => x.textContent.includes(t));
  if (b) { b.click(); return true; } return false;
}, txt);
const completed = () => page.evaluate(t =>
  !window.G.overlay.isOpen() && window.G.flags.has('qa.test.' + t), type);

async function answerHook(correctly) {
  // options are [perfect-1, perfect, N-1]; index 1 is correct
  await page.evaluate(i => {
    const os = [...document.querySelectorAll('#puzzle-ov .pzk-opt')];
    (os[i] || os[0]).click();
  }, correctly ? 1 : 0);
  await sleep(200);
}
const hookContinue = () => clickSel('.pzk-hook .btn');

/* ================= NAIVE RUN — must NOT complete ================= */
console.log('\n--- NAIVE run (first-listed question every time) ---');
await openOverlay();
await sleep(400);
assert(await page.evaluate(() => window.G.overlay.isOpen()), 'overlay open');
assert(await q('.pzk-hook'), 'hook card shown first');
await shot('01-hook');
await answerHook(false);            // naive guesses wrong; welcomed, not punished
await shot('01b-hook-reveal');
await hookContinue();
await sleep(250);

// GUIDE: instrumentation visible; naive clicks still win (by design)
assert((await bodyText()).includes('Round 1'), 'guide round banner');
assert(await q('.bg-qbits'), 'guide: bits labels visible');
await shot('02-guide');
for (let i = 0; i < 8; i++) {
  if (await q('.bg-winp')) break;
  await clickFirstQuestion(); await sleep(180);
  if (i === 0) await shot('02b-guide-mid');   // coach moment + ledger
}
assert(await q('.bg-winp'), 'guide passed (config questions are all perfect splits)');
await clickSel('.bg-next');
await sleep(250);

// STRIP: decoys listed first, no bits; first click must blow the gate
assert(!(await q('.bg-qbits')), 'strip: bits labels hidden');
assert(await q('.bg-table'), 'strip: raw trait table shown');
const firstQ = await page.evaluate(() =>
  document.querySelector('#puzzle-ov .bg-qlist .bg-q .bg-qtext').textContent);
assert(/by name/.test(firstQ), `strip: decoy listed first ("${firstQ}")`);
await shot('03-strip');
for (let attempt = 1; attempt <= 3; attempt++) {
  await clickFirstQuestion(); await sleep(220);
  assert(await q('.bg-fail'), `strip naive attempt ${attempt}: gate failed`);
  assert(await q('.bg-fail .pzk-coach'), `strip attempt ${attempt}: coach correction shown`);
  if (attempt === 1) {
    const t = await bodyText();
    assert(/by name.*split the pile|split the pile/.test(t), 'correction names the lopsided split');
    await shot('04-gate-fail');
  }
  if (attempt === 2) {
    assert((await bodyText()).includes('Hint:'), 'hint ladder engaged on 2nd consecutive failure');
    await shot('04b-gate-fail-hint');
  }
  assert(await q('.bg-retry'), `strip attempt ${attempt}: fresh-letter button offered`);
  await clickSel('.bg-retry'); await sleep(200);
}
assert(!(await completed()), 'NAIVE RUN BLOCKED: flag never set, overlay still open');
await page.evaluate(() => window.G.overlay.close());
await sleep(300);

/* ================= INFORMED RUN — must complete ================= */
console.log('\n--- INFORMED run (config questions only) ---');
await freshBoot();                   // clears the taught flag with the save
await openOverlay();
await sleep(400);
assert(await q('.pzk-hook'), 'informed: hook shown (untaught)');
await answerHook(true);
await hookContinue();
await sleep(250);

async function sortOneLetter() {
  for (const l of labels) {
    await clickQuestionByText(l);
    await sleep(150);
  }
}
await sortOneLetter();               // GUIDE
assert(await q('.bg-winp'), 'informed: guide passed');
await clickSel('.bg-next'); await sleep(250);
await sortOneLetter();               // STRIP
if (hasMastery) {
  assert(await q('.bg-winp'), 'informed: strip passed within budget');
  await clickSel('.bg-next'); await sleep(250);
  assert((await bodyText()).includes('morning batch'), 'mastery round reached');
  await shot('05-mastery');
  // robustness: one decoy click must fail the whole batch immediately…
  await clickFirstQuestion(); await sleep(220);
  assert(await q('.bg-fail'), 'mastery: a single decoy ask fails the batch (1+3+6 > 9)');
  await shot('05b-mastery-fail');
  await clickSel('.bg-retry'); await sleep(200);
  // …then sort the 3 letters cleanly: 9 questions for 9 bits
  for (let letter = 0; letter < 3; letter++) { await sortOneLetter(); await sleep(120); }
}
assert(await q('.pzk-debrief'), 'debrief card reached');
assert((await bodyText()).includes('log₂'), 'debrief states the theorem with their numbers');
await shot('06-debrief');
await clickSel('.pzk-debrief .btn');
await sleep(400);
assert(await completed(), 'INFORMED RUN COMPLETED: qa.test.binary-gate set');

/* ============ TAUGHT MODE — reopen skips hook + guide ============ */
console.log('\n--- TAUGHT re-open ---');
await openOverlay();
await sleep(400);
assert(!(await q('.pzk-hook')), 'taught: no hook');
const banner = await page.evaluate(() =>
  document.querySelector('#puzzle-ov .pzk-banner').textContent);
assert(/Round 1 \/ \d/.test(banner) && (await bodyText()).includes('machine goes quiet'),
  `taught: opens directly in strip/mastery ("${banner.trim()}")`);
await shot('07-taught');
await page.evaluate(() => window.G.overlay.close());
await sleep(200);

/* ============ 420px MOBILE PASS (screens only, quick informed) ============ */
console.log('\n--- 420px viewport pass ---');
await page.setViewport({ width: 420, height: 860 });
await freshBoot();
await openOverlay();
await sleep(400);
const mshot = n => page.screenshot({ path: path.join(shots, `${tag}-420-${n}.png`) });
await mshot('01-hook');
await answerHook(true); await mshot('01b-hook-reveal');
await hookContinue(); await sleep(250);
await mshot('02-guide');
await sortOneLetter();
await clickSel('.bg-next'); await sleep(250);
await mshot('03-strip');
// capture a fail at 420 too
await clickFirstQuestion(); await sleep(220);
await mshot('04-gate-fail');
await clickSel('.bg-retry'); await sleep(200);
await sortOneLetter();
if (hasMastery) {
  await clickSel('.bg-next'); await sleep(250);
  await mshot('05-mastery');
  for (let letter = 0; letter < 3; letter++) { await sortOneLetter(); await sleep(120); }
}
await mshot('06-debrief');
await clickSel('.pzk-debrief .btn'); await sleep(400);
assert(await completed(), '420px informed run completed');

console.log('\nerrors:', errors.length ? errors : 'none');
console.log(failures ? `DRIVE FAILED (${failures} assertion[s])` : 'DRIVE PASSED');
await browser.close();
process.exit(failures || errors.length ? 1 : 0);
