// Render sprites_test.html in real Chrome and screenshot to shots/sprites.png.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = pathToFileURL(path.join(here, 'sprites_test.html')).href;
const out = path.join(here, 'shots', 'sprites.png');

const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(target, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__SPRITES_DONE__ === true', { timeout: 5000 }).catch(() => {});
await new Promise(r => setTimeout(r, 250));

const el = await page.$('#sheet');
await el.screenshot({ path: out });

await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('wrote ' + out);
