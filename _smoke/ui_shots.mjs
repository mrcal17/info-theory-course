// Drive ui.js screens in a real Chrome and screenshot title / map / ending.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = pathToFileURL(path.join(here, 'ui_test.html')).href;
const shotsDir = path.join(here, 'shots');
fs.mkdirSync(shotsDir, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 600, deviceScaleFactor: 2 });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(target, { waitUntil: 'networkidle0' });
await wait(700); // let title animations settle

let failures = 0;
const check = (cond, label) => { console.log((cond ? '  ok  ' : '  FAIL ') + label); if (!cond) failures++; };

// --- title ---
const h1 = await page.$eval('.ui-h1', (el) => el.textContent.replace(/\s+/g, '').trim()).catch(() => null);
check(/THEQUIETARCHIPELAGO/.test(h1 || ''), 'title heading renders (' + h1 + ')');
const hasContinue = await page.$$eval('.ui-btn', (bs) => bs.some((b) => /Continue/.test(b.textContent)));
check(hasContinue, 'Continue button present (save exists)');
await page.screenshot({ path: path.join(shotsDir, 'ui_title.png') });

// also grab a 360px-wide title to confirm mobile layout
await page.setViewport({ width: 360, height: 720, deviceScaleFactor: 2 });
await wait(400);
await page.screenshot({ path: path.join(shotsDir, 'ui_title_mobile.png') });
await page.setViewport({ width: 960, height: 600, deviceScaleFactor: 2 });
await wait(200);

// --- map ---
await page.evaluate(() => window.OPEN_MAP());
await wait(500);
const blobCount = await page.$$eval('.ui-chart svg g', (gs) => gs.length).catch(() => 0);
check(blobCount === 7, '7 island blobs on the chart (got ' + blobCount + ')');
await page.screenshot({ path: path.join(shotsDir, 'ui_map.png') });
// close the map
await page.evaluate(() => {
  const dim = document.querySelector('.ui-map');
  if (dim) dim.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
});
await wait(200);

// --- pause menu + settings (visual sanity, not asserted) ---
await page.evaluate(() => window.OPEN_MENU());
await wait(400);
await page.screenshot({ path: path.join(shotsDir, 'ui_menu.png') });
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.ui-menu-screen .ui-btn')];
  const s = btns.find((b) => /Settings/.test(b.textContent));
  if (s) s.click();
});
await wait(400);
await page.screenshot({ path: path.join(shotsDir, 'ui_settings.png') });
await page.evaluate(() => {
  const d = document.querySelector('.ui-settings-screen');
  if (d) d.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  const m = document.querySelector('.ui-menu-screen');
  if (m) m.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
});
await wait(300);

// --- ending ---
await page.evaluate(() => window.OPEN_END());
await wait(9000); // names light up (~7s) then credits begin
const litCount = await page.$$eval('.ui-end-name.lit', (ns) => ns.length).catch(() => 0);
const inCredits = await page.$('.ui-credits');
check(litCount >= 1 || !!inCredits, 'ending progressed (lit names or credits)');
await page.screenshot({ path: path.join(shotsDir, 'ui_ending.png') });

check(errors.length === 0, 'no page errors' + (errors.length ? ' -> ' + errors.join(' | ') : ''));

await browser.close();
console.log(failures === 0 ? '\nUI SHOTS PASS' : '\nUI SHOTS FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
