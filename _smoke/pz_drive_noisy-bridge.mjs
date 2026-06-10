// Chrome drive for the reworked noisy-bridge puzzle (PEDAGOGY §6.9).
// Derived from _smoke/pz_drive.mjs. Drives BOTH frozen configs (strait door,
// grand-beacon gate 3) through:
//   NAIVE-guide   — even spread, click Cross -> blocked at the contract line
//   NAIVE-mastery — (taught) even spread, Declare -> storm takes it, round lost
//   INFORMED      — hook answered, guide built to the line and crossed
//                   (free rebuilds on snaps), mastery: inspect stormiest water,
//                   reinforce-the-weakest, declare; rigged rng forces one snap
//                   to capture the free-rebuild line; completes with flag
//                   qa.test.noisy-bridge.
// Plus a 420px-wide mobile pass. Screenshots -> _smoke/shots/pz/noisy-bridge/.
// Run: cd _smoke && node pz_drive_noisy-bridge.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'noisy-bridge';
const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'pz', type);
fs.mkdirSync(shots, { recursive: true });

const CONFIGS = {
  st: { p: 0.25, segments: 5, budget: 19 },   // 04_strait.js:127 (+ dialogue :241 :252)
  gb: { p: 0.3, segments: 6, budget: 26 },    // 07_grand_beacon.js:153
};

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=900,1000', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 900, height: 1000 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });
let pass = 0, fail = 0;
const assert = (cond, label) => {
  if (cond) { pass++; console.log('  ok:', label); }
  else { fail++; console.error('  FAIL:', label); }
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

// ---- in-page helpers ----
const clickByText = (re) => page.evaluate(src => {
  const r = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov button')].find(b => r.test(b.textContent));
  if (b && !b.disabled) { b.click(); return b.textContent.trim().slice(0, 60); }
  return null;
}, re.source);
const buttonExists = (re) => page.evaluate(src => {
  const r = new RegExp(src, 'i');
  return !!([...document.querySelectorAll('#puzzle-ov button')].find(b => r.test(b.textContent) && !b.disabled));
}, re.source);
const waitForButton = async (re, tries = 40, gap = 400) => {
  for (let i = 0; i < tries; i++) { if (await buttonExists(re)) return true; await sleep(gap); }
  return false;
};
const overlayOpen = () => page.evaluate(() => window.G.overlay.isOpen());
const flagSet = () => page.evaluate(t => window.G.flags.has('qa.test.' + t), type);
const openPuzzle = (cfg) => page.evaluate((t, c) => window.G.overlay.open({ type: t, config: c, flag: 'qa.test.' + t }), type, cfg);
const closePuzzle = () => page.evaluate(() => window.G.overlay.close());
const setTaught = (on) => page.evaluate(on => {
  if (on) window.G.flags.set('pz.noisy-bridge.taught'); else window.G.flags.clear('pz.noisy-bridge.taught');
}, on);
// set per-segment plank counts by clicking the +/- buttons (minus pass first)
const setAlloc = (target) => page.evaluate(target => {
  const segs = [...document.querySelectorAll('#puzzle-ov .nb-seg')];
  const cur = s => parseInt(s.querySelector('.nb-kcount').textContent, 10);
  for (let i = 0; i < segs.length; i++) {
    let guard = 8;
    while (cur(segs[i]) > target[i] && guard--) segs[i].querySelector('.nb-minus').click();
  }
  for (let i = 0; i < segs.length; i++) {
    let guard = 8;
    while (cur(segs[i]) < target[i] && guard--) segs[i].querySelector('.nb-plus').click();
  }
  return segs.map(cur);
}, target);
const getTiers = () => page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov .nb-seg')].map(s => parseInt(s.dataset.tier, 10)));
// recompute the puzzle's own derivations in-page (deterministic, same code)
const derive = (cfg) => page.evaluate(c => {
  const L = window.G.puzzles.get('noisy-bridge')._logic;
  const T = L.deriveThreshold(c.p, c.segments, c.budget);
  const tune = L.chooseMults(c.p, c.segments, c.budget, T);
  const uni = L.uniformBest(c.p, c.segments, c.budget);
  // expand uniform best counts [a 1s, b 3s, c 5s] into an allocation array
  const guideAlloc = [];
  for (let i = 0; i < uni.counts[2]; i++) guideAlloc.push(5);
  for (let i = 0; i < uni.counts[1]; i++) guideAlloc.push(3);
  for (let i = 0; i < uni.counts[0]; i++) guideAlloc.push(1);
  const tierP = [tune.ps[0], Math.max(0.02, Math.min(0.9, c.p)), tune.ps[tune.ps.length - 1]];
  return { T, tierP, guideAlloc, budget: c.budget };
}, cfg);
const greedyFor = (tiers, tierP, budget) => page.evaluate((tiers, tierP, budget) => {
  const L = window.G.puzzles.get('noisy-bridge')._logic;
  return L.greedyAlloc(tiers.map(t => tierP[t]), budget);
}, tiers, tierP, budget);
const coachText = () => page.evaluate(() => {
  const c = document.querySelector('#puzzle-ov #nb-coach');
  return c ? c.textContent : '';
});
const rigRng = (on) => page.evaluate(on => {
  if (on) { window.__origRandom = window.__origRandom || Math.random; Math.random = () => 0; }
  else if (window.__origRandom) { Math.random = window.__origRandom; }
}, on);

// run the cross/rebuild loop until `doneRe` button appears; click rebuilds
const crossLoop = async (crossRe, doneRe, maxAttempts = 15) => {
  await clickByText(crossRe);
  for (let a = 0; a < maxAttempts; a++) {
    for (let i = 0; i < 40; i++) {
      if (await buttonExists(doneRe)) return true;
      if (await buttonExists(/cross again — rebuilt free/i)) break;
      await sleep(400);
    }
    if (await buttonExists(doneRe)) return true;
    await clickByText(/cross again — rebuilt free/i);
  }
  return buttonExists(doneRe);
};

for (const key of ['st', 'gb']) {
  const cfg = CONFIGS[key];
  const d = await derive(cfg);
  console.log(`\n=== ${key} config ${JSON.stringify(cfg)} -> T=${(d.T * 100).toFixed(0)}% guideAlloc=[${d.guideAlloc}] ===`);

  // ---------- NAIVE (guide): even spread, Cross -> blocked ----------
  console.log('-- NAIVE guide --');
  await setTaught(false);
  await openPuzzle(cfg);
  await sleep(400);
  assert(await overlayOpen(), 'overlay open');
  if (key === 'st') await shot('st-00-hook');
  await page.evaluate(() => document.querySelectorAll('#puzzle-ov .pzk-opt')[0].click()); // lazy guess ~90%
  await sleep(300);
  if (key === 'st') await shot('st-01-hook-reveal');
  await clickByText(/find out/i);
  await sleep(400);
  if (key === 'st') await shot('st-02-guide-plan');
  await setAlloc(Array(cfg.segments).fill(3)); // even spread
  await sleep(200);
  await clickByText(/^cross the bridge/i);
  await sleep(600);
  const blocked = /contract line|sign manifests/i.test(await coachText());
  assert(blocked, 'naive even spread is BLOCKED at the contract line');
  await shot(key + '-03-naive-guide-blocked');
  assert(await overlayOpen() && !(await flagSet()), 'naive guide run did not complete');
  await closePuzzle(); await sleep(300);

  // ---------- NAIVE (mastery, taught): even spread, Declare -> round lost ----------
  console.log('-- NAIVE mastery --');
  await setTaught(true);
  await openPuzzle(cfg);
  await sleep(400);
  await shot(key + '-04-mastery-storm');
  const tiersN = await getTiers();
  assert(new Set(tiersN).size >= 2, `mastery water tiers differ visibly (tiers=[${tiersN}])`);
  await setAlloc(Array(cfg.segments).fill(3)); // even spread
  await sleep(200);
  await clickByText(/declare the crossing/i);
  const lost = await waitForButton(/fresh storm/i);
  assert(lost, 'naive even-spread declaration FAILS the round (storm takes it)');
  await shot(key + '-05-naive-mastery-lost');
  assert(await overlayOpen() && !(await flagSet()), 'naive mastery run did not complete');
  // verify the reset gives fresh exposures + restored inspections
  await clickByText(/fresh storm/i);
  await sleep(400);
  const insp = await page.evaluate(() => document.querySelector('#puzzle-ov #nb-inspect').textContent);
  assert(/3 left/.test(insp), 'round reset restores 3 inspections');
  await closePuzzle(); await sleep(300);

  // ---------- INFORMED ----------
  console.log('-- INFORMED --');
  await setTaught(false);
  await openPuzzle(cfg);
  await sleep(400);
  await page.evaluate(() => document.querySelectorAll('#puzzle-ov .pzk-opt')[2].click()); // ~59%
  await sleep(250);
  await clickByText(/find out/i);
  await sleep(400);
  await setAlloc(d.guideAlloc);
  await sleep(200);
  if (key === 'st') await shot('st-06-guide-built');
  const guideDone = await crossLoop(/^cross the bridge/i, /worst stretch/i);
  assert(guideDone, 'informed guide build crosses (free rebuilds on snaps)');
  if (key === 'st') await shot('st-07-guide-crossed');
  await clickByText(/worst stretch/i);
  await sleep(400);

  // inspect the 3 stormiest segments (wild first, then open)
  const tiers = await getTiers();
  const order = tiers.map((t, i) => ({ t, i })).sort((a, b) => b.t - a.t).slice(0, 3).map(x => x.i);
  for (let k = 0; k < order.length; k++) {
    await clickByText(/inspect water/i);
    await sleep(150);
    await page.evaluate(i => {
      document.querySelectorAll('#puzzle-ov .nb-seg')[i].querySelector('.nb-pp').click();
    }, order[k]);
    await sleep(150);
    if (k === 0 && key === 'st') await shot('st-08-mastery-inspect');
  }
  const inspLeft = await page.evaluate(() => document.querySelector('#puzzle-ov #nb-inspect').textContent);
  assert(/0 left/.test(inspLeft), 'three inspections consumed');

  // reinforce the weakest within budget
  const greedy = await greedyFor(tiers, d.tierP, d.budget);
  await setAlloc(greedy);
  await sleep(200);
  await shot(key + '-09-mastery-built');

  // rig the dice so the certified bridge snaps once -> free-rebuild line
  await rigRng(true);
  await clickByText(/declare the crossing/i);
  const rebuilt = await waitForButton(/cross again — rebuilt free/i);
  assert(rebuilt, 'certified bridge that snaps gets the FREE rebuild');
  const line = await coachText();
  assert(/Good codes still fail — rarely/i.test(line), 'Bea says the §6.9 line');
  await shot(key + '-10-rebuild-free');
  await rigRng(false);

  const debrief = await crossLoop(/cross again — rebuilt free/i, /far stones/i);
  assert(debrief, 'informed mastery crossing reaches the debrief');
  await shot(key + '-11-debrief');
  const vs = await page.evaluate(() => {
    const d = document.querySelector('#puzzle-ov .pzk-debrief');
    return d ? d.textContent : '';
  });
  assert(/your build/i.test(vs) && /even spread/i.test(vs) && /one span/i.test(vs),
    'debrief shows player vs even-spread vs lopsided P values');
  await clickByText(/far stones/i);
  await sleep(500);
  assert(!(await overlayOpen()) && (await flagSet()), 'INFORMED run completed -> qa.test.noisy-bridge set');
  await page.evaluate(t => window.G.flags.clear('qa.test.' + t), type);
}

// ---------- 420px mobile pass ----------
console.log('\n-- 420px pass --');
await page.setViewport({ width: 420, height: 860 });
await setTaught(false);
await openPuzzle(CONFIGS.st);
await sleep(400);
await shot('m420-00-hook');
await page.evaluate(() => document.querySelectorAll('#puzzle-ov .pzk-opt')[2].click());
await sleep(250);
await clickByText(/find out/i);
await sleep(400);
await shot('m420-01-guide');
await closePuzzle(); await sleep(200);
await setTaught(true);
await openPuzzle(CONFIGS.gb);
await sleep(400);
await shot('m420-02-mastery-6seg');
const fits = await page.evaluate(() => {
  const tr = document.querySelector('#puzzle-ov .nb-track');
  const body = document.querySelector('#puzzle-ov .pz-body');
  return tr.scrollWidth <= body.clientWidth + 4;
});
assert(fits, '6-segment track fits at 420px (no horizontal overflow)');
await closePuzzle();

console.log('\nerrors:', errors.length ? errors : 'none');
console.log(`\n${pass} ok, ${fail} failed`);
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
