// Real-browser check (installed Chrome via puppeteer-core): loads the game with
// genuine <script defer> semantics — the thing jsdom can't reproduce faithfully.
// Usage: node browser.mjs [url]   (default: the local game/index.html)
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] || pathToFileURL(path.join(here, '..', 'game', 'index.html')).href;

const browser = await puppeteer.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('requestfailed', r => {
  // favicon lives at the docs root; absent when run against the raw repo tree
  if (!r.url().endsWith('favicon.ico')) errors.push('request failed: ' + r.url());
});

await page.goto(target, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 400));

let failures = 0;
const check = (cond, label) => { console.log((cond ? '  ok  ' : '  FAIL ') + label); if (!cond) failures++; };

const title = await page.$eval('.title-main', el => el.textContent).catch(() => null);
check(title === 'SIGNAL LOST', 'title screen renders (' + title + ')');

await page.click('.title-screen .btn-primary');
await new Promise(r => setTimeout(r, 200));
const nodes = await page.$$eval('.node', ns => ns.length).catch(() => 0);
check(nodes === 8, '8 station nodes on the map (got ' + nodes + ')');

// open the first unlocked station and make sure a game actually mounts
await page.click('.node:not(.locked)');
await new Promise(r => setTimeout(r, 150));
await page.click('.b-actions .btn-primary');
await new Promise(r => setTimeout(r, 500));
const mounted = await page.evaluate(() => {
  const root = document.querySelector('.game-root');
  return !!root && root.children.length > 0 && !document.querySelector('.crash-note');
});
check(mounted, 'first game mounts in a real browser');
check(errors.length === 0, 'no page errors' + (errors.length ? ' → ' + errors.join(' | ') : ''));

await browser.close();
console.log(failures === 0 ? '\nBROWSER PASS (' + target + ')' : '\nBROWSER FAIL');
process.exit(failures === 0 ? 0 : 1);
