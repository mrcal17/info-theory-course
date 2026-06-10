// Drive for tree-planner — derived from pz_drive.mjs (PEDAGOGY §4.2).
// PASS A — first encounter on the Huffman Wood stump config: hook, forced-wrong
//          round (busiest-first locked), NAIVE free play (always merge the two
//          biggest -> must NOT complete; hint ladder climbs h1/h2/h3), then
//          INFORMED run (quietest-first -> completes, flag set, taught set).
// PASS B — taught skip: Grand Beacon config with pz.tree-planner.taught pre-set
//          via G.pz.markTaught — no hook, no forced round, straight free play;
//          informed run completes. Plus the mastery (ties) config.
// PASS C — 420px visual pass (fresh save) over hook/forced/free/win.
// Run from _smoke/: node pz_drive_tree-planner.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'tree-planner';
const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'pz', type);
fs.mkdirSync(shots, { recursive: true });

// frozen configs driven explicitly (07_grand_beacon.js:125 and 03_huffman_wood.js:217)
const GB_CFG = { villages: [
  { name: '"come home"', daily: 11 }, { name: '"we are well"', daily: 7 },
  { name: '"the lights hold"', daily: 5 }, { name: '"send the boats"', daily: 3 },
  { name: '"thank you"', daily: 2 }, { name: '"we remember"', daily: 1 },
], par: 'optimal' };
const MASTERY_CFG = { villages: [
  { name: 'Ashmoor', daily: 8 }, { name: 'Birchgate', daily: 8 },
  { name: 'Coldfern', daily: 5 }, { name: 'Dewhollow', daily: 5 },
  { name: 'Elderknot', daily: 3 }, { name: 'Fogmere', daily: 3 },
], par: 'optimal' };

let failures = 0;
const assert = (name, cond, detail = '') => {
  console.log((cond ? 'ok   ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
  if (!cond) failures++;
};

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=900,860', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 900, height: 860 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });

async function boot() {
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
}

const clickByText = async (re) => page.evaluate(src => {
  const r = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov button')].find(b => r.test(b.textContent));
  if (b && !b.disabled) { b.click(); return b.textContent.trim().slice(0, 60); }
  return null;
}, re.source);
const overlayOpen = () => page.evaluate(() => window.G.overlay.isOpen());
const hasFlag = f => page.evaluate(f => window.G.flags.has(f), f);
const rootCount = () => page.evaluate(() => document.querySelectorAll('#puzzle-ov .tp-rootcard').length);
const bodyText = () => page.evaluate(() => {
  const o = document.querySelector('#puzzle-ov'); return o ? o.innerText : '';
});
const openPz = (cfg, flag) => page.evaluate((t, c, f) =>
  window.G.overlay.open({ type: t, config: c, flag: f }), type, cfg, flag);

// select the two extreme piles ('min' = quietest pair, 'max' = busiest pair)
async function pickPair(mode) {
  const idxs = await page.evaluate(mode => {
    const cards = [...document.querySelectorAll('#puzzle-ov .tp-rootcard')]
      .map(c => ({ i: +c.dataset.idx, d: +c.dataset.daily }));
    cards.sort((a, b) => a.d - b.d);
    if (cards.length < 2) return null;
    return mode === 'min' ? [cards[0].i, cards[1].i]
      : [cards[cards.length - 1].i, cards[cards.length - 2].i];
  }, mode);
  if (!idxs) return false;
  for (const i of idxs) {
    await page.evaluate(i => {
      const c = [...document.querySelectorAll('#puzzle-ov .tp-rootcard')]
        .find(c => +c.dataset.idx === i);
      if (c) c.click();
    }, i);
    await sleep(50);
  }
  return true;
}

async function mergeAll(mode) { // play free play to the end with a strategy
  for (let guard = 0; guard < 12; guard++) {
    if (await rootCount() <= 1) break;
    await pickPair(mode);
    await clickByText(/join trails/);
    await sleep(90);
  }
}

/* ===================== PASS A: first encounter (HW stump) ===================== */
console.log('=== PASS A: first encounter — Huffman Wood stump config ===');
await boot();
const cfg = await page.evaluate(t => {
  for (const isl of window.G.islands.list())
    for (const e of (isl.entities || []))
      if (e.puzzle && e.puzzle.type === t) return e.puzzle.config;
  return null;
}, type);
assert('found stump config (Mosswick first)',
  cfg && cfg.villages && cfg.villages[0].name === 'Mosswick',
  JSON.stringify(cfg).slice(0, 90));

await openPz(cfg, 'qa.test.' + type);
await sleep(400);
assert('overlay open', await overlayOpen());
assert('HOOK card shown first', await page.evaluate(() => !!document.querySelector('#puzzle-ov .pzk-hook')));
await shot('a01-hook');

// predict "busiest" (the wrong answer — wrong predictions welcomed)
await page.evaluate(() => document.querySelectorAll('#puzzle-ov .pzk-opt')[0].click());
await sleep(200);
await shot('a02-hook-reveal');
await clickByText(/run the old plan/);
await sleep(250);
await shot('a03-forced-start');

// forced round: quiet piles must be locked out
const quietLocked = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#puzzle-ov .tp-rootcard')];
  cards.sort((a, b) => +a.dataset.daily - +b.dataset.daily);
  cards[0].click(); // quietest — must be a disabled button
  return cards[0].disabled && !document.querySelector('#puzzle-ov .tp-sel');
});
assert('FORCED round locks the quiet piles', quietLocked);

// the two forced busiest-first merges
await pickPair('max'); await clickByText(/join trails/); await sleep(140);
await pickPair('max'); await clickByText(/join trails/); await sleep(180);
await shot('a04-forced-2merges');
assert('coach drops the "every walker pays" line', /every walker pays/i.test(await bodyText()));

await clickByText(/let the old plan finish/);
await sleep(2600); // auto playout
await shot('a05-forced-end');
assert('old plan finishes at 148 (cost-to-beat shown)', /148/.test(await bodyText()));
assert('Huff scraps the plan', /scrap/i.test(await bodyText()));

await clickByText(/replant/);
await sleep(250);
await shot('a06-free-start');
assert('free play shows old-plan cost-to-beat (148)', /148/.test(await bodyText()));
assert('quietest-highlight crutch removed', !/highlight quietest/i.test(await bodyText()));

// NAIVE free runs ×4 — always merge two biggest; must fail, ladder climbs
await mergeAll('max'); await sleep(150);
assert('naive run 1: lose card shown', await page.evaluate(() => !!document.querySelector('#puzzle-ov .tp-end.tp-lose')));
assert('naive run 1: no hint yet (ladder fail #1 -> null)', !/two smallest/i.test(await bodyText()));
await shot('a07-naive-fail');
await clickByText(/replant/); await mergeAll('max'); await sleep(150);
assert('naive run 2: hint 1 — two smallest, always', /two smallest/i.test(await bodyText()));
await shot('a08-hint1');
await clickByText(/replant/); await mergeAll('max'); await sleep(150);
assert('naive run 3: hint 2 — merged pile competes by its SUM', /competes by its sum/i.test(await bodyText()));
await shot('a09-hint2');
await clickByText(/replant/); await mergeAll('max'); await sleep(150);
assert('naive run 4: hint 3 — full merge walk', /dictates the whole plan/i.test(await bodyText()));
await shot('a10-hint3');
assert('NAIVE runs never complete: overlay still open', await overlayOpen());
assert('NAIVE runs never complete: flag NOT set', !(await hasFlag('qa.test.' + type)));

// INFORMED run — greedy quietest-first
await clickByText(/replant/); await sleep(120);
await mergeAll('min'); await sleep(250);
assert('informed run: win view', await page.evaluate(() => !!document.querySelector('#puzzle-ov .tp-end.tp-win')));
assert('informed run: optimal total 81', /\b81\b/.test(await bodyText()));
assert('informed run: per-village depth table', await page.evaluate(() => !!document.querySelector('#puzzle-ov .tp-table')));
assert('informed run: identity + shallow-busy line', /busy\s+villages sit shallow/i.test(await bodyText()));
assert('informed run: debrief card (Huffman / Sift tie-in)', /IS Huffman/i.test(await bodyText()) && /Sift/.test(await bodyText()));
await shot('a11-win-debrief');
await clickByText(/open the path/);
await sleep(350);
assert('INFORMED run completed: flag qa.test.tree-planner set', await hasFlag('qa.test.' + type));
assert('overlay closed after complete', !(await overlayOpen()));
assert('markTaught fired on completion', await hasFlag('pz.tree-planner.taught'));

/* ===================== PASS B: taught skip (Grand Beacon) ===================== */
console.log('=== PASS B: taught skip — Grand Beacon config ===');
await page.evaluate(() => window.G.pz.markTaught('tree-planner')); // explicit pre-set
await openPz(GB_CFG, 'qa.gb.' + type);
await sleep(350);
assert('taught: NO hook card', await page.evaluate(() => !document.querySelector('#puzzle-ov .pzk-hook')));
assert('taught: NO forced round (no locked piles)',
  await page.evaluate(() => ![...document.querySelectorAll('#puzzle-ov .tp-rootcard')].some(c => c.disabled)));
assert('taught: straight to free play (Join trails present)', /join trails/i.test(await bodyText()));
await shot('b01-taught-open');
await mergeAll('min'); await sleep(250);
assert('GB informed run: win view (optimal 67)', /\b67\b/.test(await bodyText()));
await shot('b02-taught-win');
await clickByText(/open the path/); await sleep(300);
assert('GB informed run completed', await hasFlag('qa.gb.' + type));

// mastery (ties) config, still taught — exercises equal-weight tie merging
await openPz(MASTERY_CFG, 'qa.hw2.' + type);
await sleep(300);
await mergeAll('min'); await sleep(250);
assert('mastery ties config: win view (optimal 80)', /\b80\b/.test(await bodyText()));
await shot('b03-mastery-win');
await clickByText(/open the path/); await sleep(300);
assert('mastery ties config informed run completed', await hasFlag('qa.hw2.' + type));

/* ===================== PASS C: 420px visual pass (fresh save) ===================== */
console.log('=== PASS C: 420px pass — fresh save, full first-encounter flow ===');
await page.setViewport({ width: 420, height: 860 });
await boot();
await openPz(cfg, 'qa.m.' + type);
await sleep(350);
await shot('c01-420-hook');
await page.evaluate(() => document.querySelectorAll('#puzzle-ov .pzk-opt')[1].click()); // correct pick this time
await sleep(150);
await clickByText(/run the old plan/); await sleep(250);
await shot('c02-420-forced');
await pickPair('max'); await clickByText(/join trails/); await sleep(120);
await pickPair('max'); await clickByText(/join trails/); await sleep(150);
await clickByText(/let the old plan finish/); await sleep(2600);
await shot('c03-420-forced-end');
await clickByText(/replant/); await sleep(200);
await shot('c04-420-free');
await mergeAll('min'); await sleep(250);
await shot('c05-420-win');
assert('420px informed run reaches win view', await page.evaluate(() => !!document.querySelector('#puzzle-ov .tp-end.tp-win')));

console.log('page errors:', errors.length ? errors : 'none');
assert('no page errors', errors.length === 0, errors.join(' | '));
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
await browser.close();
process.exit(failures ? 1 : 0);
