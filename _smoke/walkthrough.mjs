// Full-game integration test for The Quiet Archipelago (real index.html).
// Boots the title, starts a new game, visits every island, opens EVERY door's
// puzzle (create-time config validation), walks every ferry link, opens the
// map screen and the ending. Screenshots throughout for visual review.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'game');
fs.mkdirSync(shots, { recursive: true });

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=1280,800', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => {
  // resource-load failures are reported (with URLs) by requestfailed below
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text());
});
page.on('requestfailed', r => { if (!r.url().endsWith('favicon.ico')) errors.push('request failed: ' + r.url()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (cond, label) => { console.log((cond ? '  ok  ' : '  FAIL ') + label); if (!cond) failures++; };
const state = () => page.evaluate(() => window.G.qa.state());
const shot = name => page.screenshot({ path: path.join(shots, name + '.png') });

await page.goto(url, { waitUntil: 'networkidle0' });
await sleep(700);
await shot('00-title');

// fresh save then start
await page.evaluate(() => { localStorage.removeItem('quiet-archipelago-v1'); location.reload(); });
await sleep(900);
const clicked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(b => /new game/i.test(b.textContent));
  if (b) { b.click(); return true; }
  return false;
});
check(clicked, 'title has a New game button');
await sleep(1200);
let s = await state();
check(s.island === 'beacon-rock', 'new game lands on Beacon Rock (' + s.island + ')');

// the intro dialogue should be running (onEnter)
await sleep(400);
s = await state();
check(s.state === 'dialogue', 'intro dialogue auto-starts');
await shot('01-intro');
for (let i = 0; i < 30 && (await state()).state !== 'world'; i++) { await page.keyboard.press('KeyE'); await sleep(150); }
check((await state()).state === 'world', 'intro dialogue completes');

// registry checks
const reg = await page.evaluate(() => {
  const isl = window.G.islands.list().map(i => i.id);
  const portals = [];
  for (const i of window.G.islands.list()) {
    (i.entities || []).forEach(e => { if (e.type === 'portal') portals.push([i.id, e.to]); });
  }
  return { isl, portals };
});
check(reg.isl.length === 7, '7 islands registered: ' + reg.isl.join(','));
const badPortals = reg.portals.filter(([, to]) => !reg.isl.includes(to));
check(badPortals.length === 0, 'all portal targets exist' + (badPortals.length ? ' BAD: ' + JSON.stringify(badPortals) : ''));

// visit each island, screenshot, open every door's puzzle
const islands = reg.isl;
for (const id of islands) {
  await page.evaluate(i => window.G.qa.teleport(i, null, null), id);
  await sleep(700);
  // dismiss any onEnter dialogue
  for (let i = 0; i < 30 && (await state()).state === 'dialogue'; i++) { await page.keyboard.press('KeyE'); await sleep(140); }
  s = await state();
  check(s.island === id, 'arrived at ' + id);
  await sleep(400);
  await shot('10-' + id);

  const doors = await page.evaluate(() => window.G.world.entities
    .filter(e => e.type === 'door')
    .map(e => ({ id: e.id, x: e.x, y: e.y, type: e.spec.puzzle && e.spec.puzzle.type,
                 requiresFlag: e.spec.requiresFlag || null })));
  for (const d of doors) {
    if (d.requiresFlag) await page.evaluate(f => window.G.qa.setFlag(f), d.requiresFlag);
    // find a walkable neighbor to stand on
    const spotDir = await page.evaluate(dd => {
      const dirs = [[0, 1, 'n'], [0, -1, 's'], [1, 0, 'w'], [-1, 0, 'e']];
      for (const [dx, dy, dir] of dirs) {
        if (window.G.map.tileWalkable(dd.x + dx, dd.y + dy)) return { x: dd.x + dx, y: dd.y + dy, dir };
      }
      return null;
    }, d);
    if (!spotDir) { failures++; console.log('  FAIL no stand spot for door ' + d.id + ' on ' + id); continue; }
    await page.evaluate((sp) => {
      window.G.qa.teleport(window.G.world.island.id, sp.x, sp.y);
      window.G.world.player.dir = sp.dir;
    }, spotDir);
    await sleep(150);
    await page.keyboard.press('KeyE');
    await sleep(650);
    const open = await page.evaluate(() => {
      const o = document.querySelector('#puzzle-ov');
      return !!(o && o.style.display !== 'none' && !o.querySelector('.pz-err'));
    });
    check(open, id + ' door "' + d.id + '" (' + d.type + ') opens cleanly');
    if (open) await shot('20-puzzle-' + d.type + '-' + d.id);
    await page.keyboard.press('Escape');
    await sleep(300);
  }
}

// ferry chain: set each done flag and walk the forward portal
const chain = ['beacon-rock', 'dunes', 'huffman-wood', 'strait', 'caverns', 'spires', 'grand-beacon'];
const prefixes = { 'beacon-rock': 'br', 'dunes': 'dn', 'huffman-wood': 'hw', 'strait': 'st', 'caverns': 'ec', 'spires': 'ms', 'grand-beacon': 'gb' };
for (let i = 0; i < chain.length - 1; i++) {
  const from = chain[i], to = chain[i + 1];
  await page.evaluate((f, p) => { window.G.qa.teleport(f, null, null); window.G.qa.setFlag(p + '.done'); }, from, prefixes[from]);
  await sleep(600);
  for (let k = 0; k < 30 && (await state()).state === 'dialogue'; k++) { await page.keyboard.press('KeyE'); await sleep(120); }
  // find the forward portal and step onto it
  const portal = await page.evaluate(t => {
    const e = window.G.world.entities.find(e => e.type === 'portal' && e.spec.to === t);
    return e ? { x: e.x, y: e.y } : null;
  }, to);
  if (!portal) { failures++; console.log('  FAIL no portal ' + from + ' -> ' + to); continue; }
  // stand next to it then walk on
  const approach = await page.evaluate(p => {
    const dirs = [[0, 1, 'ArrowUp'], [0, -1, 'ArrowDown'], [1, 0, 'ArrowLeft'], [-1, 0, 'ArrowRight']];
    for (const [dx, dy, keyName] of dirs) {
      if (window.G.map.tileWalkable(p.x + dx, p.y + dy)) return { x: p.x + dx, y: p.y + dy, keyName };
    }
    return null;
  }, portal);
  if (!approach) { failures++; console.log('  FAIL no approach for portal ' + from + ' -> ' + to); continue; }
  await page.evaluate(a => window.G.qa.teleport(window.G.world.island.id, a.x, a.y), approach);
  await sleep(200);
  await page.keyboard.down(approach.keyName); await sleep(220); await page.keyboard.up(approach.keyName);
  await sleep(2200);
  for (let k = 0; k < 30 && (await state()).state === 'dialogue'; k++) { await page.keyboard.press('KeyE'); await sleep(120); }
  s = await state();
  check(s.island === to, 'ferry ' + from + ' -> ' + to + ' (got ' + s.island + ')');
}

// map screen
await page.keyboard.press('KeyM');
await sleep(800);
await shot('30-map');
check((await state()).state === 'map', 'map screen opens with M');
await page.keyboard.press('Escape');
await sleep(500);

// pause menu
await page.keyboard.press('Escape');
await sleep(600);
await shot('31-menu');
check((await state()).state === 'menu', 'pause menu opens with Escape');
await page.keyboard.press('Escape');
await sleep(500);

// ending
await page.evaluate(() => window.G.ui.ending());
await sleep(9000);
await shot('40-ending');
const endingShown = await page.evaluate(() => !!document.querySelector('[class*="ui-"]'));
check(endingShown, 'ending screen renders');

check(errors.length === 0, 'no page errors' + (errors.length ? ' → ' + errors.slice(0, 6).join(' | ') : ''));
await browser.close();
console.log(failures === 0 ? '\nWALKTHROUGH PASS' : '\nWALKTHROUGH FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
