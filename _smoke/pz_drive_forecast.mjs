// Chrome drive for the reworked 'forecast' puzzle — derived from pz_drive.mjs
// (PEDAGOGY.md §4). Scripts:
//   NAIVE A — price every eruption "1 bit": must be blocked at the GUIDE gate.
//   NAIVE B — taught + rigged luck, camp the RAREST vent: must miss the
//             MASTERY goal (no completion).
//   INFORMED — full teach loop on dune config 1 (hook→guide→strip→mastery→
//              debrief) completes; then dune config 2 opens straight into
//              mastery (taught skip) and completes too.
//   420px    — phase screenshots at mobile width.
// Run from _smoke/: node pz_drive_forecast.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'forecast';
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
const check = (cond, label) => {
  if (cond) { pass++; console.log('  ok  ', label); }
  else { fail++; console.error('  FAIL', label); }
};

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

// ---- gather BOTH dune forecast configs from the real island data ----
const cfgs = await page.evaluate(() => {
  const out = [];
  for (const isl of window.G.islands.list()) {
    for (const e of (isl.entities || [])) {
      if (e.puzzle && e.puzzle.type === 'forecast') out.push(e.puzzle.config);
    }
  }
  return out;
});
check(cfgs.length === 2, `found ${cfgs.length} forecast configs in island data (want 2)`);

// ---- helpers ----
const openPz = cfg => page.evaluate((t, c) =>
  window.G.overlay.open({ type: t, config: c, flag: 'qa.test.' + t }), type, cfg);
const closePz = () => page.evaluate(() => window.G.overlay.close());
const clickByText = re => page.evaluate(src => {
  const r = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov button')].find(b => r.test(b.textContent) && !b.disabled);
  if (b) { b.click(); return b.textContent.trim().slice(0, 60); }
  return null;
}, re.source ?? String(re));
const completed = () => page.evaluate(t =>
  !window.G.overlay.isOpen() && window.G.flags.has('qa.test.' + t), type);
const overlayOpen = () => page.evaluate(() => window.G.overlay.isOpen());
const clearTestFlags = () => page.evaluate(t => {
  window.G.flags.clear('pz.' + t + '.taught');
  window.G.flags.clear('qa.test.' + t);
}, type);
const waitFor = async (fn, timeout = 15000, step = 120) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await fn()) return true;
    await sleep(step);
  }
  return false;
};
const chipReady = () => page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov .fc-chip')].some(c => !c.disabled));
// price the current eruption correctly by reading "1 in N" off the prompt
const priceCorrectly = () => page.evaluate(() => {
  const prompt = document.querySelector('#puzzle-ov .fc-prompt');
  const m = prompt && prompt.textContent.match(/1 in (\d+)/);
  if (!m) return null;
  const bits = Math.round(Math.log2(+m[1]));
  const chip = [...document.querySelectorAll('#puzzle-ov .fc-chip')]
    .find(c => !c.disabled && c.textContent.trim().startsWith(String(bits)));
  if (chip) { chip.click(); return bits; }
  return null;
});
const priceAs = bits => page.evaluate(b => {
  const chip = [...document.querySelectorAll('#puzzle-ov .fc-chip')]
    .find(c => !c.disabled && c.textContent.trim().startsWith(String(b)));
  if (chip) { chip.click(); return true; }
  return false;
}, bits);
const watchReady = () => page.evaluate(() => {
  const b = [...document.querySelectorAll('#puzzle-ov button')].find(b => /WATCH the field/.test(b.textContent));
  return !!b && !b.disabled;
});
const debriefUp = () => page.evaluate(() => !!document.querySelector('#puzzle-ov .pzk-debrief'));
const campVent = label => page.evaluate(l => {
  const b = [...document.querySelectorAll('#puzzle-ov .fc-vent')].find(b => b.textContent.includes(l) && !b.disabled);
  if (b) { b.click(); return true; }
  return false;
}, label);

// drive one full pricing pass (6 eruptions) with a strategy fn; returns count clicked
async function pricingPass(strategy) {
  let clicked = 0;
  for (let i = 0; i < 6; i++) {
    const ready = await waitFor(chipReady, 8000);
    if (!ready) break;
    const r = await strategy();
    if (r != null && r !== false) clicked++;
    await sleep(300);
  }
  return clicked;
}

/* ============== NAIVE A — all "1 bit" pricing, blocked at GUIDE ============== */
console.log('\nNAIVE A: price everything as 1 bit (guide gate must block)');
await clearTestFlags();
await openPz(cfgs[0]);
await sleep(500);
check(await overlayOpen(), 'overlay open (config 1)');
await shot('01-hook');
await clickByText(/^1 and 16/);          // lazy wrong prediction
await sleep(300);
await shot('02-hook-revealed');
await clickByText(/find out/);
await sleep(400);
await shot('03-guide');
let n1 = await pricingPass(() => priceAs(1));
check(n1 === 6, `naive priced ${n1}/6 eruptions as 1 bit`);
await sleep(1600);                        // gate evaluation + reset
await shot('04-guide-fail');
check(await overlayOpen(), 'still open after guide fail #1');
n1 = await pricingPass(() => priceAs(1)); // second identical attempt → hint ladder
await sleep(1600);
await shot('05-guide-hint');
const hintShown = await page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov .pzk-coach')].some(c => /halving|card|chip/i.test(c.textContent)));
check(hintShown, 'hint ladder coach line visible after 2nd failure');
check(await overlayOpen() && !(await completed()), 'NAIVE A blocked: overlay open, flag unset');
await closePz();
await sleep(300);

/* ============== NAIVE B — taught + rigged luck, camp the rarest ============== */
console.log('\nNAIVE B: camp the rarest vent in mastery (must miss the goal)');
await page.evaluate(t => window.G.flags.set('pz.' + t + '.taught'), type);
// rig luck: the commonest vent always blows → a rarest-vent camper never hits
await page.evaluate(() => { window.__origRandom = Math.random; Math.random = () => 0.0; });
await openPz(cfgs[1]);
await sleep(500);
const noHook = await page.evaluate(() => !document.querySelector('#puzzle-ov .pzk-hook'));
check(noHook, 'taught: opens straight into mastery (no hook)');
await shot('06-mastery-naive');
const rarestLabel = cfgs[1].vents.reduce((a, b) => (a.p < b.p ? a : b)).label;
check(await campVent(rarestLabel), `camped rarest vent (${rarestLabel})`);
for (let r = 0; r < cfgs[1].rounds; r++) {
  await waitFor(watchReady, 6000);
  await clickByText(/WATCH the field/);
  await sleep(820);
}
await sleep(1400); // fail toast + auto-reset
await shot('07-mastery-fail');
check(await overlayOpen() && !(await completed()), 'NAIVE B blocked: rounds exhausted, no completion');
await page.evaluate(() => { Math.random = window.__origRandom; });
await closePz();
await sleep(300);

/* ============== INFORMED — full loop on config 1 ============== */
console.log('\nINFORMED: full teach loop on config 1');
await clearTestFlags();
await openPz(cfgs[0]);
await sleep(500);
await clickByText(/^1 and 4/);            // correct prediction
await sleep(300);
await clickByText(/find out/);
await sleep(400);
// consult the formula card once (screenshot the halving chain)
await page.evaluate(() => {
  const c = [...document.querySelectorAll('#puzzle-ov .fc-odd')].find(c => /1 in 8/.test(c.textContent));
  if (c) c.click();
});
const nRight = await pricingPass(priceCorrectly);
check(nRight === 6, `informed priced ${nRight}/6 correctly`);
const nextUp = () => page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov button')].some(b => /going rate/.test(b.textContent)));
check(await waitFor(nextUp, 8000), 'guide gate passed → next button up');
await shot('08-guide-informed');
check((await clickByText(/going rate/)) != null, 'clicked through to STRIP');
await sleep(400);
await shot('09-strip');
// assemble H: every teach vent exactly once
for (const v of ['Drowse', 'Puff', 'Growl', 'Howl', 'Wink']) {
  check(await campVent(v), `tile added: ${v}`);
  await sleep(120);
}
await shot('10-strip-tray');
await clickByText(/Commit the estimate/);
await sleep(700);
const ffDone = await waitFor(() => page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov button')].some(b => /wild field/.test(b.textContent))), 12000);
check(ffDone, 'fast-forward converged (next button up)');
await shot('11-strip-converge');
await clickByText(/wild field/);
await sleep(400);
await shot('12-mastery');
// camp the analytically best vent and play until the debrief (retries allowed)
const bestLabel = await page.evaluate(c => {
  const L = window.G.puzzles.get('forecast').logic;
  return c.vents[L.bestVentIndex(c.vents, c.goalBits, c.rounds)].label;
}, cfgs[0]);
console.log('  camping best vent:', bestLabel);
await campVent(bestLabel);
let gateFails = 0;
for (let clicks = 0; clicks < 160; clicks++) {
  if (await debriefUp()) break;
  const ready = await waitFor(async () => (await watchReady()) || (await debriefUp()), 6000);
  if (!ready) { gateFails++; continue; }
  if (await debriefUp()) break;
  await clickByText(/WATCH the field/);
  await sleep(800);
}
check(await debriefUp(), 'mastery goal reached → debrief card up');
await shot('13-debrief');
await clickByText(/Leave the field/);
await sleep(500);
check(await completed(), 'INFORMED config 1 completed (flag qa.test.forecast set)');
const taughtNow = await page.evaluate(t => window.G.flags.has('pz.' + t + '.taught'), type);
check(taughtNow, 'markTaught fired on first completion');

/* ============== INFORMED — config 2, taught skip ============== */
console.log('\nINFORMED: config 2 (second dune door — must NOT re-teach)');
await page.evaluate(t => window.G.flags.clear('qa.test.' + t), type);
await openPz(cfgs[1]);
await sleep(500);
check(await page.evaluate(() => !document.querySelector('#puzzle-ov .pzk-hook')),
  'no hook on repeat encounter');
check(await page.evaluate(() => !!document.querySelector('#puzzle-ov .fc-progwrap')),
  'mastery jar visible immediately');
await shot('14-mastery2');
const best2 = await page.evaluate(c => {
  const L = window.G.puzzles.get('forecast').logic;
  return c.vents[L.bestVentIndex(c.vents, c.goalBits, c.rounds)].label;
}, cfgs[1]);
console.log('  camping best vent:', best2);
await campVent(best2);
for (let clicks = 0; clicks < 160; clicks++) {
  if (await debriefUp()) break;
  const ready = await waitFor(async () => (await watchReady()) || (await debriefUp()), 6000);
  if (!ready) continue;
  if (await debriefUp()) break;
  await clickByText(/WATCH the field/);
  await sleep(800);
}
check(await debriefUp(), 'config 2 mastery reached debrief');
await shot('15-debrief2');
await clickByText(/Leave the field/);
await sleep(500);
check(await completed(), 'INFORMED config 2 completed');

/* ============== 420px visual pass ============== */
console.log('\n420px pass');
await page.setViewport({ width: 420, height: 800 });
await clearTestFlags();
await openPz(cfgs[0]);
await sleep(500);
await shot('16-420-hook');
await clickByText(/^1 and 4/);
await sleep(250);
await clickByText(/find out/);
await sleep(400);
await waitFor(chipReady, 8000);
await shot('17-420-guide');
const n420 = await pricingPass(priceCorrectly);
check(n420 === 6, `420px: priced ${n420}/6 correctly`);
check(await waitFor(() => page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov button')].some(b => /going rate/.test(b.textContent))), 8000),
  '420px: guide gate passed');
await clickByText(/going rate/);
check(await waitFor(() => page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov button')].some(b => /Commit the estimate/.test(b.textContent))), 6000),
  '420px: strip tray up');
for (const v of ['Drowse', 'Puff', 'Growl']) { await campVent(v); await sleep(80); }
await shot('18-420-strip');
await closePz();
await page.evaluate(t => window.G.flags.set('pz.' + t + '.taught'), type);
await openPz(cfgs[1]);
await sleep(500);
await shot('19-420-mastery');
await closePz();

console.log('\nerrors:', errors.length ? errors : 'none');
console.log(`\n${pass} checks passed, ${fail} failed`);
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
