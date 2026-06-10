// Generic puzzle driver for The Quiet Archipelago — see archipelago/PEDAGOGY.md §4.
// Boots the real game, starts fresh, opens ONE puzzle overlay with a chosen
// config, screenshots it. Rework agents: copy this to pz_drive_<type>.mjs and
// script (a) a NAIVE run that must NOT complete and (b) an INFORMED run that
// must complete. Run from _smoke/: node pz_drive.mjs <type> ['<configJSON>']
//
// In-page helpers available to your evaluate() calls:
//   G.overlay.isOpen()                       — still open? (complete() closes it)
//   G.qa.state().flags                       — flag set after completion
//   document.querySelector('#puzzle-ov')     — the overlay; .pz-body holds the UI
// Clicking: prefer page.evaluate with querySelector + .click() on buttons found
// by their textContent — the puzzles are plain DOM, no canvas hit-testing.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = process.argv[2];
const config = process.argv[3] ? JSON.parse(process.argv[3]) : null;
if (!type) { console.error('usage: node pz_drive.mjs <puzzle-type> [configJSON]'); process.exit(1); }

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
export const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });

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

// ---- find a real island config for this type if none given ----
const cfg = config || await page.evaluate(t => {
  for (const isl of window.G.islands.list()) {
    for (const e of (isl.entities || [])) {
      if (e.puzzle && e.puzzle.type === t) return e.puzzle.config || {};
    }
  }
  return {};
}, type);

// ---- open the overlay ----
await page.evaluate((t, c) => window.G.overlay.open({ type: t, config: c, flag: 'qa.test.' + t }), type, cfg);
await sleep(500);
const open = await page.evaluate(() => window.G.overlay.isOpen());
console.log('overlay open:', open, '| config:', JSON.stringify(cfg).slice(0, 120));
await shot('00-open');

// ---- agents: script naive + informed runs below (this template just peeks) ----
// Example interaction helpers:
const clickByText = async (re) => page.evaluate(src => {
  const r = new RegExp(src, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov button')].find(b => r.test(b.textContent));
  if (b && !b.disabled) { b.click(); return b.textContent.trim().slice(0, 60); }
  return null;
}, re.source ?? String(re));
const completed = async () => page.evaluate(t => !window.G.overlay.isOpen() && window.G.flags.has('qa.test.' + t), type);

void clickByText; void completed; // template exports for copies

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
