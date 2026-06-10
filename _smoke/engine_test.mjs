// Engine battle-test for The Quiet Archipelago: drives dev.html in real Chrome.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'dev.html')).href;
const shots = path.join(here, 'shots');
fs.mkdirSync(shots, { recursive: true });

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=1280,800'], defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (cond, label) => { console.log((cond ? '  ok  ' : '  FAIL ') + label); if (!cond) failures++; };
const state = () => page.evaluate(() => window.G.qa.state());
async function key(code, holdMs = 80) {
  await page.keyboard.down(code);
  await sleep(holdMs);
  await page.keyboard.up(code);
}
const shot = name => page.screenshot({ path: path.join(shots, name + '.png') });
const hasChoice = () => page.evaluate(() => {
  const c = document.querySelector('.dlg-choices');
  return !!(c && c.style.display !== 'none' && c.children.length > 0);
});

// press E until dialogue ends or a choice menu appears; returns 'world'|'choice'|'stuck'
async function advanceDialogue(max = 25) {
  for (let i = 0; i < max; i++) {
    const st = (await state()).state;
    if (st === 'world') return 'world';
    if (st === 'dialogue' && await hasChoice()) return 'choice';
    await page.keyboard.press('KeyE');
    await sleep(170);
  }
  return 'stuck';
}

await page.goto(url, { waitUntil: 'networkidle0' });
await sleep(400);
await shot('00-title');
check(await page.$('#tf-start') !== null, 'fallback title shows');

await page.evaluate(() => { localStorage.removeItem('quiet-archipelago-v1'); location.reload(); });
await sleep(600);
await page.click('#tf-start');
await sleep(700);
let s = await state();
check(s.state === 'world' && s.island === 'dev-isle', 'new game loads dev isle');
check(s.x === 8 && s.y === 9, 'spawn at 8,9 (got ' + s.x + ',' + s.y + ')');
await shot('01-world');

await key('ArrowRight', 400);
await sleep(300);
s = await state();
check(s.x > 8, 'player walked east (x=' + s.x + ')');

await key('ArrowLeft', 900);
await sleep(400);
s = await state();
check(s.flags.includes('dev.trigger.fired'), 'walk-over trigger fired');

// sign
await page.evaluate(() => window.G.qa.teleport('dev-isle', 10, 6));
await sleep(150);
await key('ArrowUp', 60);
await sleep(120);
await page.keyboard.press('KeyE');
await sleep(500);
check((await state()).state === 'dialogue', 'sign dialogue opens');
await shot('02-sign');
check(await advanceDialogue() === 'world', 'sign dialogue closes');
// step away so stray E presses cannot re-open it
await page.evaluate(() => window.G.qa.teleport('dev-isle', 8, 9));
await sleep(120);

// crab with choices
const crab = await page.evaluate(() => {
  const e = window.G.world.entities.find(e => e.id === 'dev-npc');
  return { x: e.x, y: e.y };
});
await page.evaluate((c) => window.G.qa.teleport('dev-isle', c.x, c.y + 1), crab);
await sleep(150);
await key('ArrowUp', 60);
await page.keyboard.press('KeyE');
await sleep(400);
const r1 = await advanceDialogue();
check(r1 === 'choice', 'reached the choice menu (' + r1 + ')');
await shot('03-choices');
const nChoices = await page.evaluate(() => document.querySelectorAll('.dlg-choice').length);
check(nChoices === 3, 'choice menu renders 3 options (got ' + nChoices + ')');
await page.keyboard.press('Enter'); // pick "Set a flag"
await sleep(350);
s = await state();
check(s.flags.includes('dev.talked'), 'choice action set flag');
check(await advanceDialogue() === 'world', 'crab dialogue closed (incl. conditional line)');
await page.evaluate(() => window.G.qa.teleport('dev-isle', 8, 9));
await sleep(120);

// door puzzle
await page.evaluate(() => window.G.qa.teleport('dev-isle', 12, 13));
await sleep(150);
await key('ArrowUp', 60);
await page.keyboard.press('KeyE');
await sleep(500);
check(await page.evaluate(() => {
  const o = document.querySelector('#puzzle-ov');
  return !!(o && o.style.display !== 'none');
}), 'puzzle overlay opens');
await shot('04-puzzle');
await page.click('#dev-solve');
await sleep(500);
s = await state();
check(s.flags.includes('dev.door.open'), 'puzzle solve sets door flag');
check(s.sparks === 1, 'door sparks awarded (got ' + s.sparks + ')');
check(await page.evaluate(() => !window.G.world.entities.some(e => e.id === 'dev-door')), 'door entity removed (rebuild on flag)');
check(await page.evaluate(() => window.G.world.entities.some(e => e.id === 'dev-beacon-on')), 'conditional beacon-on appeared');

// spark item
await page.evaluate(() => window.G.qa.teleport('dev-isle', 14, 8));
await sleep(120);
await key('ArrowUp', 200);
await sleep(400);
s = await state();
check(s.sparks === 2 && s.flags.includes('dev.spark.got'), 'spark item picked up (sparks=' + s.sparks + ')');

// portal (gated, now satisfied)
await page.evaluate(() => window.G.qa.teleport('dev-isle', 8, 12));
await sleep(120);
await key('ArrowDown', 200);
await sleep(2000);
s = await state();
check(s.island === 'dev-isle-2', 'portal travels to second island (got ' + s.island + ')');
check(s.flags.includes('dev.done'), 'arrival trigger fired on island 2');
await shot('05-island2');

// save/continue
await page.evaluate(() => location.reload());
await sleep(700);
await page.click('#tf-start');
await sleep(700);
s = await state();
check(s.island === 'dev-isle-2' && s.sparks === 2, 'continue restores island + sparks');

check(errors.length === 0, 'no page errors' + (errors.length ? ' → ' + errors.slice(0, 4).join(' | ') : ''));
await browser.close();
console.log(failures === 0 ? '\nENGINE PASS' : '\nENGINE FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
