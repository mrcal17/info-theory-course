// Chrome drive for the prefix-gate rework — derived from pz_drive.mjs
// (PEDAGOGY.md §4.2). Two scripted runs against the REAL island config:
//   NAIVE   (900px) — wrong hook answer; futile carving in the impossible
//             round never advances it; then 50 seeded-random 0/1 taps in the
//             main round with periodic "Carve" clicks — the gate must NEVER
//             open (kill-switch).
//   INFORMED (420px, mobile check) — right hook answer; tries the {1,1,2}
//             job, sees the overflow, refuses; builds the canonical Huffman
//             code 0/10/110/1110/1111; stages one gate failure (hint ladder);
//             completes; flag qa.test.prefix-gate + taught flag set; reopen
//             skips hook + impossible round.
// Run from _smoke/: node pz_drive_prefix-gate.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'prefix-gate';
const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'pz', type);
fs.mkdirSync(shots, { recursive: true });

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=900,900', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 900, height: 860 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });

let failures = 0;
const assert = (name, cond) => {
  if (cond) console.log('  ok  ', name);
  else { failures++; console.error('  FAIL', name); }
};

// ---- boot to world state (fresh save) ----
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

// ---- the real island config for this type ----
async function islandConfig() {
  return page.evaluate(t => {
    for (const isl of window.G.islands.list()) {
      for (const e of (isl.entities || [])) {
        if (e.puzzle && e.puzzle.type === t) return e.puzzle.config || {};
      }
    }
    return {};
  }, type);
}

const openOverlay = cfg => page.evaluate(
  (t, c) => window.G.overlay.open({ type: t, config: c, flag: 'qa.test.' + t }), type, cfg);
const overlayOpen = () => page.evaluate(() => window.G.overlay.isOpen());
const flagSet = f => page.evaluate(fl => window.G.flags.has(fl), f);

const clickByText = re => page.evaluate(src => {
  const r = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov button')].find(b => r.test(b.textContent));
  if (b && !b.disabled) { b.click(); return b.textContent.trim().slice(0, 60); }
  return null;
}, re.source ?? String(re));

const clickHookOption = idx => page.evaluate(i => {
  const b = document.querySelectorAll('#puzzle-ov .pzk-opt')[i];
  if (b && !b.disabled) { b.click(); return true; }
  return false;
}, idx);

// row = .pg-row index; btn: 0 = ● (0), 1 = ◯ (1), 2 = backspace
const tapRow = (row, btn) => page.evaluate((r, b) => {
  const rows = document.querySelectorAll('#puzzle-ov .pg-row');
  if (!rows[r]) return false;
  const minis = rows[r].querySelectorAll('.pg-mini');
  if (!minis[b] || minis[b].disabled) return false;
  minis[b].click(); return true;
}, row, btn);

const scrollTo = sel => page.evaluate(s => {
  const el = document.querySelector('#puzzle-ov ' + s);
  if (el) el.scrollIntoView({ block: 'center' });
}, sel);

const footStatus = () => page.evaluate(() => {
  const s = document.querySelector('#puzzle-ov .pg-foot .pg-len');
  return s ? s.textContent : '';
});
const hasHook = () => page.evaluate(() => !!document.querySelector('#puzzle-ov .pzk-hook'));
const hasRefuse = () => page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov button')].some(b => /can’t be done|can't be done/i.test(b.textContent)));

// seeded LCG for reproducible "random" tapping
let seed = 0xBADC0DE;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;

/* ================================ NAIVE ================================ */
console.log('=== NAIVE run (900px) — laziest clicks must never complete ===');
await boot();
const cfg = await islandConfig();
console.log('config:', JSON.stringify(cfg).slice(0, 120));
await openOverlay(cfg);
await sleep(400);
assert('overlay open', await overlayOpen());
assert('hook shown on first encounter', await hasHook());
await shot('naive-00-hook');

await clickHookOption(1); // wrong answer ("No") — welcomed, never punished
await sleep(250);
await shot('naive-01-hook-wrong');
await clickByText(/find out/);
await sleep(300);

assert('impossible round reached (refusal button present)', await hasRefuse());
await clickByText(/^Carve the signs/); // carve with blanks — futile
await sleep(200);
// accept the job and try: 0 / 1 / 00 — overflow + clash
await tapRow(0, 0); await sleep(80);
await tapRow(1, 1); await sleep(80);
await tapRow(2, 0); await sleep(80);
await tapRow(2, 0); await sleep(120);
for (let i = 0; i < 3; i++) { await clickByText(/^Carve the signs/); await sleep(150); }
assert('futile carving never completes the impossible round', await hasRefuse());
assert('overlay still open after futile attempts', await overlayOpen());
assert('flag not set', !(await flagSet('qa.test.' + type)));
await shot('naive-02-imp-futile');

await clickByText(/can.t be done/); // the refusal IS the round's gate
await sleep(250);
await shot('naive-03-imp-refused');
await clickByText(/On to the signposts/);
await sleep(300);

// main round: 50 seeded-random taps; gate must never open
let everValid = false;
for (let k = 0; k < 50; k++) {
  await tapRow(Math.floor(rnd() * 5), Math.floor(rnd() * 3));
  const st = await footStatus();
  if (/looks valid/.test(st)) everValid = true;
  if (k % 10 === 9) {
    await clickByText(/^Carve the signs/);
    await sleep(120);
    if (await flagSet('qa.test.' + type)) everValid = true;
  }
  if (k === 24) await shot('naive-04-main-random');
}
assert('50 random taps: rules never all green', !everValid);
assert('gate never opened (overlay still up)', await overlayOpen());
assert('flag still not set', !(await flagSet('qa.test.' + type)));
await shot('naive-05-main-final');
await page.evaluate(() => window.G.overlay.close());
await sleep(200);

/* =============================== INFORMED =============================== */
console.log('=== INFORMED run (420px) — sensible code must complete ===');
await page.setViewport({ width: 420, height: 860 });
await boot();
await openOverlay(cfg);
await sleep(400);
assert('overlay open at 420px', await overlayOpen());
assert('hook shown (fresh save)', await hasHook());
await shot('inf-00-hook-420');

await clickHookOption(0); // "Yes" — correct
await sleep(250);
await shot('inf-01-hook-reveal-420');
await clickByText(/find out/);
await sleep(300);
await shot('inf-02-impossible-420');

// try the job first: 0 / 1 / 00 — watch the vessel overflow + tree burn
await tapRow(0, 0); await tapRow(1, 1); await sleep(150);
await shot('inf-03-imp-tree-burnt-420'); // two depth-1 signs: whole tree ash
await tapRow(2, 0); await tapRow(2, 0); await sleep(200);
await shot('inf-04-imp-overflow-420');
await scrollTo('.pg-gauges'); await sleep(200);
await shot('inf-04b-imp-vessel-420'); // overflowing vessel + coach line in frame
await clickByText(/^Carve the signs/);
await sleep(3000); // let the failure toast fade
await clickByText(/can.t be done/);
await sleep(250);
await shot('inf-05-imp-refused-420');
await clickByText(/On to the signposts/);
await sleep(300);
await shot('inf-06-main-empty-420');
await scrollTo('.pzk-coach'); await sleep(200);
await shot('inf-06b-main-samefact-420'); // "same fact twice" coach line
assert('same-fact coach line present on first main round', await page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov .pzk-ctext')].some(e => /same fact/i.test(e.textContent))));

// stage one gate failure for the hint ladder screenshot: two clashing codes
await tapRow(0, 0); await tapRow(1, 0); await tapRow(1, 0); await sleep(150);
await clickByText(/^Carve the signs/); await sleep(150);
await clickByText(/^Carve the signs/); await sleep(200); // 2nd consecutive fail → hint 1
await shot('inf-07-main-fail-hint-420');
assert('hint coach card appears after 2 fails', await page.evaluate(() =>
  document.querySelectorAll('#puzzle-ov .pzk-coach').length >= 1));
await sleep(3000); // let the failure toasts fade

// clear row 1 and build the canonical Huffman code: 0,10,110,1110,1111
await tapRow(1, 2); await tapRow(1, 2); await sleep(100);
const plan = ['0', '10', '110', '1110', '1111'];
for (let i = 0; i < plan.length; i++) {
  // row 0 already has '0'
  const want = plan[i];
  const have = i === 0 ? '0' : '';
  for (let k = have.length; k < want.length; k++) {
    await tapRow(i, want[k] === '0' ? 0 : 1);
    await sleep(40);
  }
  if (i === 2) {
    await scrollTo('.pg-tree'); await sleep(200);
    await shot('inf-08-main-partial-420'); // burn-tree mid-build, in frame
  }
}
await sleep(250);
const st = await footStatus();
assert('rules all green before carving (' + st + ')', /looks valid/.test(st));
await shot('inf-09-main-valid-420');
await scrollTo('.pg-tree'); await sleep(200);
await shot('inf-09b-main-tree-420'); // finished burn-tree at 420px
await scrollTo('.pg-foot'); await sleep(200);

await clickByText(/^Carve the signs/);
await sleep(300);
await shot('inf-10-debrief-420');
assert('debrief card shown', await page.evaluate(() =>
  !!document.querySelector('#puzzle-ov .pzk-debrief')));
await clickByText(/Carve the signs/); // debrief button → api.complete()
await sleep(400);
assert('overlay closed after complete', !(await overlayOpen()));
assert('flag qa.test.prefix-gate set', await flagSet('qa.test.' + type));
assert('taught flag set', await flagSet('pz.' + type + '.taught'));

// repeat encounter: hook + impossible round must be skipped
await openOverlay(cfg);
await sleep(400);
assert('reopen: overlay open', await overlayOpen());
assert('reopen: hook skipped', !(await hasHook()));
assert('reopen: impossible round skipped (no refusal button)', !(await hasRefuse()));
assert('reopen: main build shown (code rows present)', await page.evaluate(() =>
  document.querySelectorAll('#puzzle-ov .pg-row').length === 5));
await shot('inf-11-taught-reopen-420');
await page.evaluate(() => window.G.overlay.close());

console.log('page errors:', errors.length ? errors : 'none');
if (errors.length) failures += errors.length;
console.log(failures ? `\nDRIVE FAILED — ${failures} problem(s)` : '\nDRIVE PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
