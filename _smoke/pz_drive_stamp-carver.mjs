// Chrome drive for stamp-carver — derived from _smoke/pz_drive.mjs (PEDAGOGY §4).
// Scripts, against the three FROZEN 05_caverns configs:
//   GUIDE  (moso):  hook → NAIVE all-literals run (must be blocked at the par
//                   gate, hints escalate) → INFORMED run (carve "moso", complete,
//                   flag qa.test.stamp-carver, taught flag set)
//   STRIP  (deep):  taught → no hook, no bet preview; ledger after carving;
//                   "nana" completes at exactly par
//   VAULT  (rand):  no hook; lever CHAINED — early pull impossible; 2 negative
//                   stamps unlock it; pull completes
//   420px:  one mobile pass.
// Run: cd _smoke && node pz_drive_stamp-carver.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'stamp-carver';
const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'pz', type);
fs.mkdirSync(shots, { recursive: true });

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=900,1100', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 900, height: 1100 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });

let failures = 0;
const assert = (name, cond, detail) => {
  const line = `  ${cond ? 'ok  ' : 'FAIL'}  ${name}${detail ? `   [${detail}]` : ''}`;
  cond ? console.log(line) : (failures++, console.error(line));
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

// ---- pull the three frozen configs from the island registry ----
const cfgs = await page.evaluate(t => {
  const out = [];
  for (const isl of window.G.islands.list()) {
    for (const e of (isl.entities || [])) {
      if (e.puzzle && e.puzzle.type === t) out.push(e.puzzle.config || {});
    }
  }
  return out;
}, type);
const structured = cfgs.filter(c => !c.incompressible);
const guideCfg = structured[0];  // mosomosomosokmoso par 10
const stripCfg = structured[1];  // nananananabnananana par 11 (hardest non-vault)
const vaultCfg = cfgs.find(c => c.incompressible);
console.log('configs:', JSON.stringify(cfgs));

// ---- helpers ----
const openPz = async (cfg, flag) => {
  await page.evaluate((t, c, f) => window.G.overlay.open({ type: t, config: c, flag: f }), type, cfg, flag);
  await sleep(450);
};
const isOpen = () => page.evaluate(() => window.G.overlay.isOpen());
const hasFlag = f => page.evaluate(f => window.G.flags.has(f), f);
const exists = sel => page.evaluate(s => !!document.querySelector(s), sel);
const text = sel => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
const clickByText = re => page.evaluate(src => {
  const r = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov button')].find(b => r.test(b.textContent));
  if (b && !b.disabled) { b.click(); return b.textContent.trim().slice(0, 60); }
  return null;
}, re.source);
const clickTile = i => page.evaluate(i => {
  document.querySelectorAll('#st-corr .st-tile')[i].click();
}, i);
const carveRange = async (a, b) => {
  await clickTile(a); await sleep(80);
  await clickTile(b); await sleep(80);
  await clickByText(/^Carve "/); await sleep(250);
};

// =====================================================================
console.log('\n--- GUIDE (moso) : NAIVE run — must be blocked at the gate ---');
await openPz(guideCfg, 'qa.test.stamp-carver');
assert('hook card shown on first (untaught) encounter', await exists('#puzzle-ov .pzk-hook'));
assert('hook quotes the actual corridor length (' + guideCfg.pattern.length + ')',
  (await text('#puzzle-ov .pzk-hook')).includes(String(guideCfg.pattern.length) + ' glyphs'));
await shot('10-hook');
// naive prediction: tap the first option (wrong)
await page.evaluate(() => document.querySelector('#puzzle-ov .pzk-opt').click());
await sleep(250);
await shot('11-hook-wrong-reveal');
await clickByText(/find out/);
await sleep(350);
await shot('12-guide-open');
// laziest sequence: no carving at all, mash "Stamp it" (all-literals tiling)
for (let i = 0; i < 3; i++) { await clickByText(/^Stamp it$/); await sleep(350); }
assert('naive all-literals run is BLOCKED (overlay still open)', await isOpen());
assert('naive run sets no flag', !(await hasFlag('qa.test.stamp-carver')));
assert('hint ladder escalated (coach card visible after repeat failures)',
  await exists('#puzzle-ov .st-coach .pzk-coach'));
await shot('13-naive-blocked-hints');
await page.evaluate(() => window.G.overlay.close());
await sleep(300);

// =====================================================================
console.log('\n--- GUIDE (moso) : INFORMED run — must complete ---');
await openPz(guideCfg, 'qa.test.stamp-carver');
await page.evaluate(() => {
  const b = [...document.querySelectorAll('#puzzle-ov .pzk-opt')].find(b => /depends/i.test(b.textContent));
  b.click();
});
await sleep(250);
await shot('20-hook-right');
await clickByText(/find out/);
await sleep(350);
// preview BEFORE carving (guide instrumentation): select "km" → losing bet
await clickTile(12); await clickTile(13); await sleep(150);
const previewTxt = await text('#st-preview');
assert('guide shows the bet PREVIEW before carving', /×/.test(previewTxt || ''), previewTxt);
await shot('21-preview-losing-bet');
await clickByText(/clear selection/);
await sleep(150);
// carve the repeat the player SEES twice: "moso" (tiles 0..3)
await carveRange(0, 3);
assert('carved stamp shows live net savings 4×3−4 = +8',
  /4×3−4 = \+8/.test(await text('#st-rack')), await text('#st-rack'));
assert('coach split-sentence beat ("a stamp is a bet—")',
  /a stamp is a bet/.test(await text('#st-coach')));
await shot('22-carved-bet');
await clickByText(/^Stamp it$/);
await sleep(350);
assert('informed plan opens the debrief', await exists('#puzzle-ov .pzk-debrief'));
assert('debrief shows the phrase table + LZ line',
  /this is LZ/.test(await text('#puzzle-ov .pzk-debrief')));
await shot('23-debrief');
await clickByText(/Seal the corridor/);
await sleep(400);
assert('informed run completed (flag qa.test.stamp-carver)', await hasFlag('qa.test.stamp-carver'));
assert('overlay closed on complete', !(await isOpen()));
assert('markTaught fired (pz.stamp-carver.taught)', await hasFlag('pz.stamp-carver.taught'));

// =====================================================================
console.log('\n--- STRIP (deep, taught) : no hook, no preview, ledger after ---');
await openPz(stripCfg, 'qa.test.stamp-carver-deep');
assert('repeat encounter skips the hook', !(await exists('#puzzle-ov .pzk-hook')));
assert('strip mode has NO bet preview element', !(await exists('#st-preview')));
await shot('30-strip-open');
await carveRange(0, 3); // "nana"
assert('savings label appears only AFTER the carve (ledger in rack)',
  /4×3−4/.test(await text('#st-rack')), await text('#st-rack'));
await shot('31-strip-carved');
await clickByText(/^Stamp it$/);
await sleep(350);
assert('"nana" completes the deep corridor at exactly par', await exists('#puzzle-ov .pzk-debrief'));
await shot('32-strip-debrief');
await clickByText(/Seal the corridor/);
await sleep(400);
assert('strip run completed (flag)', await hasFlag('qa.test.stamp-carver-deep'));

// =====================================================================
console.log('\n--- VAULT (random) : chained lever, earned unlock ---');
await openPz(vaultCfg, 'qa.test.stamp-carver-vault');
assert('vault (taught) skips the hook too', !(await exists('#puzzle-ov .pzk-hook')));
assert('lever rendered CHAINED (disabled) from the start',
  await page.evaluate(() => { const b = document.querySelector('#st-lever-btn'); return !!b && b.disabled; }));
await shot('40-vault-locked');
// kill-switch: pulling early must be impossible (even via forced JS clicks)
await page.evaluate(() => {
  const b = document.querySelector('#st-lever-btn');
  b.click();
  b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await sleep(300);
assert('early pull does nothing (overlay open, no debrief, no flag)',
  (await isOpen()) && !(await exists('#puzzle-ov .pzk-debrief')) && !(await hasFlag('qa.test.stamp-carver-vault')));
await shot('41-early-pull-blocked');
// first bet: "bq" → 1×1−2 = −1, glows red; lever still chained
await carveRange(0, 1);
assert('first vault stamp runs negative (red ledger)', /−|-1|= -1/.test(await text('#st-rack')), await text('#st-rack'));
assert('lever still chained after ONE negative stamp',
  await page.evaluate(() => document.querySelector('#st-lever-btn').disabled));
await shot('42-first-red-bet');
// second bet: "vkf" → 1×2−3 = −1 → both seen negative → unlock
await carveRange(2, 4);
await sleep(250);
assert('lever UNLOCKS after two negative stamps',
  await page.evaluate(() => { const b = document.querySelector('#st-lever-btn'); return !!b && !b.disabled; }));
assert('incompressibility line delivered by the twins',
  /no pattern to bet on/.test(await text('#st-coach')));
await shot('43-unlocked');
await clickByText(/Pull the lever/);
await sleep(350);
assert('lever opens the vault debrief', await exists('#puzzle-ov .pzk-debrief'));
await shot('44-vault-debrief');
await clickByText(/Leave it as it is/);
await sleep(400);
assert('vault completed (flag qa.test.stamp-carver-vault)', await hasFlag('qa.test.stamp-carver-vault'));

// =====================================================================
console.log('\n--- 420px mobile pass ---');
await page.setViewport({ width: 420, height: 900 });
await sleep(300);
await openPz(guideCfg, 'qa.test.stamp-carver-mobile');
await shot('50-mobile-open');
await carveRange(0, 3);
await shot('51-mobile-carved');
await clickByText(/^Stamp it$/);
await sleep(350);
await shot('52-mobile-debrief');
const overflow = await page.evaluate(() => {
  const p = document.querySelector('.pz-panel');
  return p ? p.scrollWidth - p.clientWidth : -1;
});
assert('no horizontal overflow at 420px', overflow <= 0, 'overflowPx=' + overflow);
await page.evaluate(() => window.G.overlay.close());

console.log('\npage errors:', errors.length ? errors : 'none');
if (errors.length) failures++;
console.log(failures ? `\nDRIVE FAILED (${failures})` : '\nDRIVE PASSED');
await browser.close();
process.exit(failures ? 1 : 0);
