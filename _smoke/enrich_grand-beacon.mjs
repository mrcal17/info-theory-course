// Enrichment drive for THE GRAND BEACON (island 7, finale).
// Boots the real game, starts fresh past the Beacon Rock intro, teleports to
// grand-beacon, dismisses the onEnter intro, then:
//   1. steps the side-quest (gb.sq1.page1/2/3 -> gb.sq1.done) via real prop
//      interaction + Shannon hand-in, confirming selectors resolve & codex unlocks;
//   2. CRITICALLY re-verifies the finale: sets the four gate flags in order,
//      walks the summit trigger, confirms gb-finale runs and the ending renders.
// Run from _smoke/: node enrich_grand-beacon.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'enrich', 'grand-beacon');
fs.mkdirSync(shots, { recursive: true });

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=1100,900', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1100, height: 900 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });
const state = () => page.evaluate(() => window.G.qa.state());
let failures = 0;
const check = (cond, label) => { console.log((cond ? '  ok  ' : '  FAIL ') + label); if (!cond) failures++; };

// ---- boot to world ----
await page.goto(url, { waitUntil: 'networkidle0' });
await sleep(600);
await page.evaluate(() => { localStorage.removeItem('quiet-archipelago-v1'); location.reload(); });
await sleep(900);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(b => /new game/i.test(b.textContent));
  if (b) b.click();
});
await sleep(1100);
// dismiss Beacon Rock intro
for (let i = 0; i < 40 && (await state()).state !== 'world'; i++) { await page.keyboard.press('KeyE'); await sleep(130); }
check((await state()).state === 'world', 'new game reaches world (past intro)');

// ---- teleport to grand-beacon, dismiss onEnter intro ----
await page.evaluate(() => window.G.qa.teleport('grand-beacon', null, null));
await sleep(700);
for (let i = 0; i < 40 && (await state()).state === 'dialogue'; i++) { await page.keyboard.press('KeyE'); await sleep(130); }
let s = await state();
check(s.island === 'grand-beacon', 'arrived at grand-beacon (' + s.island + ')');
check(s.state === 'world', 'intro dialogue dismissed');
await sleep(300);
await shot('01-island');

// ---- helper: walk player onto a tile, interact toward an entity ----
const standAndTalk = async (entId) => page.evaluate((id) => {
  const e = window.G.world.entities.find(e => e.id === id);
  if (!e) return { ok: false, why: 'entity not present: ' + id };
  // find a walkable neighbor to stand on, or stand on the tile itself if passable
  const dirs = [[0, 1, 'n'], [0, -1, 's'], [1, 0, 'w'], [-1, 0, 'e']];
  for (const [dx, dy, dir] of dirs) {
    if (window.G.map.tileWalkable(e.x + dx, e.y + dy)) {
      window.G.qa.teleport(window.G.world.island.id, e.x + dx, e.y + dy);
      window.G.world.player.dir = dir;
      return { ok: true, x: e.x + dx, y: e.y + dy, dir };
    }
  }
  return { ok: false, why: 'no stand spot for ' + id };
}, entId);

const entityPresent = (id) => page.evaluate((i) => !!window.G.world.entities.find(e => e.id === i), id);
const hasFlag = (f) => page.evaluate((x) => window.G.flags.has(x), f);
const codexCount = () => page.evaluate(() => window.G.codex.count());
const codexUnlocked = (id) => page.evaluate((cid) => {
  const e = window.G.codex.entries().find(e => e.id === cid);
  return e ? window.G.codex.isUnlocked(e) : null;
}, id);

// ---- baseline codex count ----
const c0 = await codexCount();
console.log('codex baseline:', JSON.stringify(c0));

// ============ SIDE QUEST: the first keeper's logbook ============
// page 1 is present from the start (only ifNotFlag gb.sq1.page1)
check(await entityPresent('gb-log-p1'), 'log page 1 prop present at start');
check(!(await entityPresent('gb-log-p2')), 'log page 2 hidden until page 1 found');

// interact page 1 (a solid:false prop with dialogue)
let sp = await standAndTalk('gb-log-p1');
check(sp.ok, 'stand spot for page 1 ' + JSON.stringify(sp));
await sleep(150); await page.keyboard.press('KeyE'); await sleep(350);
check((await state()).state === 'dialogue', 'reading page 1 opens a dialogue');
await shot('02-dialogue-page1');
for (let i = 0; i < 20 && (await state()).state === 'dialogue'; i++) { await page.keyboard.press('KeyE'); await sleep(130); }
check(await hasFlag('gb.sq1.page1'), 'gb.sq1.page1 set after reading');
check(await entityPresent('gb-log-p2'), 'log page 2 now revealed (ifFlag chain)');

// page 2
sp = await standAndTalk('gb-log-p2');
check(sp.ok, 'stand spot for page 2');
await sleep(150); await page.keyboard.press('KeyE'); await sleep(300);
for (let i = 0; i < 20 && (await state()).state === 'dialogue'; i++) { await page.keyboard.press('KeyE'); await sleep(130); }
check(await hasFlag('gb.sq1.page2'), 'gb.sq1.page2 set');
check(await entityPresent('gb-log-p3'), 'log page 3 revealed');

// page 3
sp = await standAndTalk('gb-log-p3');
check(sp.ok, 'stand spot for page 3');
await sleep(150); await page.keyboard.press('KeyE'); await sleep(300);
for (let i = 0; i < 20 && (await state()).state === 'dialogue'; i++) { await page.keyboard.press('KeyE'); await sleep(130); }
check(await hasFlag('gb.sq1.page3'), 'gb.sq1.page3 set (all pages held)');

// hand-in: talk to Shannon — his gate selector resolves to a gate dialogue whose
// first line ifFlag gb.sq1.page3 / ifNotFlag gb.sq1.done jumps to gb-shannon-log.
sp = await standAndTalk('gb-shannon');
check(sp.ok, 'stand spot for Shannon');
await sleep(150); await page.keyboard.press('KeyE'); await sleep(350);
check((await state()).state === 'dialogue', 'Shannon hand-in dialogue opens');
// confirm the active dialogue is the keeper-log read (the routed branch)
const handInText = await page.evaluate(() => {
  const t = document.querySelector('#dlg-text, .dlg-text, [class*="dlg-text"]');
  return t ? t.textContent : (document.body.textContent || '');
});
await shot('03-dialogue-shannon-log');
for (let i = 0; i < 25 && (await state()).state === 'dialogue'; i++) { await page.keyboard.press('KeyE'); await sleep(130); }
check(await hasFlag('gb.sq1.done'), 'gb.sq1.done set after hand-in');

// codex: keeper-log lore should now be unlocked and count up by 1+
check((await codexUnlocked('lore.gb.keeper-log')) === true, 'lore.gb.keeper-log unlocked on gb.sq1.done');
const c1 = await codexCount();
check(c1.unlocked > c0.unlocked, 'codex unlocked count rose (' + c0.unlocked + ' -> ' + c1.unlocked + ')');

// open the codex screen and scroll to the unlocked grand-beacon lore card
await page.keyboard.press('KeyN');
await sleep(600);
check((await state()).state !== 'world', 'codex screen opens (N)');
// scroll the list to the "Notes — The Grand Beacon" section so the new card shows
const scrolled = await page.evaluate(() => {
  const list = document.querySelector('.cdx-list');
  if (!list) return false;
  const secs = [...list.querySelectorAll('.cdx-sec')];
  const target = secs.find(s => /Grand Beacon/i.test(s.textContent));
  if (target) { target.scrollIntoView({ block: 'start' }); return true; }
  list.scrollTop = list.scrollHeight;
  return true;
});
check(scrolled, 'scrolled codex to Grand Beacon notes');
await sleep(400);
await shot('04-codex');
await page.keyboard.press('Escape');
await sleep(400);

// ============ FINALE INTEGRITY: gate chain -> summit -> ending ============
// set the four gate flags IN ORDER exactly as the gate chain expects
for (const f of ['gb.compress.done', 'gb.protect.done', 'gb.send.done', 'gb.verify.done']) {
  await page.evaluate(x => window.G.qa.setFlag(x), f);
  await sleep(120);
}
check(await codexUnlocked('lore.gb.first-light'), 'lore.gb.first-light unlocked on gb.compress.done');

// walk onto the summit trigger (19,4): stand just below and step up
const trig = await page.evaluate(() => {
  const e = window.G.world.entities.find(e => e.id === 'gb-summit-trigger');
  return e ? { x: e.x, y: e.y } : null;
});
check(!!trig, 'summit trigger present');
// stand on a walkable neighbor then walk onto it
const appr = await page.evaluate(t => {
  const dirs = [[0, 1, 'ArrowUp'], [0, -1, 'ArrowDown'], [1, 0, 'ArrowLeft'], [-1, 0, 'ArrowRight']];
  for (const [dx, dy, key] of dirs) {
    if (window.G.map.tileWalkable(t.x + dx, t.y + dy)) return { x: t.x + dx, y: t.y + dy, key };
  }
  return null;
}, trig);
check(!!appr, 'approach tile for summit trigger ' + JSON.stringify(appr));
await page.evaluate(a => window.G.qa.teleport(window.G.world.island.id, a.x, a.y), appr);
await sleep(250);
await page.keyboard.down(appr.key); await sleep(260); await page.keyboard.up(appr.key);
await sleep(700);
// the finale dialogue (gb-finale) should now be running
let st = await state();
check(st.state === 'dialogue', 'summit trigger fired the finale dialogue (state=' + st.state + ')');
// advance through gb-finale; it sets gb.done mid-way and ends with endGame -> ui.ending
for (let i = 0; i < 40; i++) {
  st = await state();
  const ending = await page.evaluate(() => !!document.querySelector('.ui-end, .ui-screen'));
  if (ending) break;
  await page.keyboard.press('KeyE');
  await sleep(180);
}
check(await hasFlag('gb.done'), 'gb.done set during finale');
check(await codexUnlocked('lore.gb.network'), 'lore.gb.network unlocked on gb.done');
await sleep(1500);
const endingShown = await page.evaluate(() => !!document.querySelector('.ui-end, .ui-screen'));
check(endingShown, 'ENDING screen renders (finale intact)');
await sleep(1200);
await shot('05-ending');

check(errors.length === 0, 'no page errors' + (errors.length ? ' -> ' + errors.slice(0, 6).join(' | ') : ''));
console.log('codex final:', JSON.stringify(await codexCount()));
console.log('hand-in text sample:', (handInText || '').slice(0, 80));
await browser.close();
console.log(failures === 0 ? '\nENRICH PASS' : '\nENRICH FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
