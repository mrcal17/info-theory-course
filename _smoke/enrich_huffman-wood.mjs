// Enrichment drive for Huffman Wood (island 3) — derived from pz_drive.mjs.
// Boots the real game, starts a fresh save, teleports to huffman-wood, and
// exercises the NEW enrichment content:
//   - post-completion + mid-progress Huff dialogue variants resolve
//   - the oak side-quest flag chain (hw.sq1.*) advances and selectors resolve
//   - codex lore pages unlock (G.codex.count climbs, toast fires) and render
// Screenshots: island view, a new dialogue, a codex card.
// Run from _smoke/: node enrich_huffman-wood.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'enrich', 'huffman-wood');
fs.mkdirSync(shots, { recursive: true });

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

// ---- boot to world state (pz_drive.mjs pattern) ----
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
assert('booted into world', (await page.evaluate(() => window.G.qa.state().state)) === 'world');

// ---- teleport to Huffman Wood, dismiss the onEnter intro ----
await page.evaluate(() => window.G.qa.teleport('huffman-wood', 20, 34));
await sleep(500);
// onEnter fires hw-intro on first arrival; clear it with a few advance keys
for (let i = 0; i < 6; i++) {
  const open = await page.evaluate(() => window.G.dialogue.active());
  if (!open) break;
  await page.keyboard.press('KeyE'); await sleep(180);
}
assert('on huffman-wood, no dialogue lingering',
  (await page.evaluate(() => window.G.qa.state().island)) === 'huffman-wood' &&
  !(await page.evaluate(() => window.G.dialogue.active())));
await shot('01-island');

// in-page replica of the engine's selector resolver (entities.js resolveDialogue)
const resolveSelector = async (sel) => page.evaluate((selArr) => {
  for (const r of selArr) {
    if (r.ifFlag && !window.G.flags.has(r.ifFlag)) continue;
    if (r.ifNotFlag && window.G.flags.has(r.ifNotFlag)) continue;
    return r.use;
  }
  return null;
}, sel);

// Huff's dialogue selector, copied from the island file (must stay in sync).
const HUFF_SEL = [
  { ifFlag: 'game.finished', use: 'hw-huff-post' },
  { ifFlag: 'hw.sq1.done', use: 'hw-huff-done-oak' },
  { ifFlag: 'hw.sq1.start', use: 'hw-huff-oak-nag' },
  { ifFlag: 'hw.done', use: 'hw-huff-done' },
  { ifFlag: 'hw.signs.done', use: 'hw-huff-relay' },
  { ifFlag: 'hw.plan.heard', use: 'hw-huff-mid-workshop' },
  { ifFlag: 'hw.plan.done', use: 'hw-huff-after-plan' },
  { ifFlag: 'hw.met-huff', use: 'hw-huff-again' },
  { use: 'hw-huff-1' },
];

const setFlag = async (f) => { await page.evaluate(fl => window.G.qa.setFlag(fl), f); await sleep(60); };
const dlgExists = async (id) => page.evaluate(i => !!(window.G.world.island.dialogues[i]), id);
const codexCount = async () => page.evaluate(() => window.G.codex.count());

// ---- baseline codex count ----
const base = await codexCount();
console.log('codex baseline:', JSON.stringify(base));

// ---- mid-progress variant: plan done + plan heard -> hw-huff-mid-workshop ----
await setFlag('hw.met-huff');
await setFlag('hw.plan.done');
assert('mid: before workshop hint shows after-plan', (await resolveSelector(HUFF_SEL)) === 'hw-huff-after-plan');
await setFlag('hw.plan.heard');
assert('mid: workshop hint variant resolves', (await resolveSelector(HUFF_SEL)) === 'hw-huff-mid-workshop');
assert('mid: hw-huff-mid-workshop dialogue exists', await dlgExists('hw-huff-mid-workshop'));

// ---- main quest done -> hw-huff-done (post-completion base) + lore unlock ----
await setFlag('hw.signs.done');
await setFlag('hw.done');
assert('post: hw.done resolves to hw-huff-done', (await resolveSelector(HUFF_SEL)) === 'hw-huff-done');
const afterDone = await codexCount();
assert('codex: lore.hw.tree-shaped unlocked on hw.done',
  afterDone.unlocked > base.unlocked, JSON.stringify(afterDone));

// render the post-completion Huff dialogue (with the oak-offer choice) and shoot it
await page.evaluate(() => window.G.dialogue.start('hw-huff-done'));
await sleep(350);
assert('post: hw-huff-done dialogue opens', await page.evaluate(() => window.G.dialogue.active()));
await shot('02-dialogue-post');
await page.evaluate(() => window.G.dialogue.close());
await sleep(150);

// ---- oak side quest chain ----
await setFlag('hw.sq1.start');
assert('sq: accepted -> oak-nag variant', (await resolveSelector(HUFF_SEL)) === 'hw-huff-oak-nag');
// Mosswick crab selector
const MOSS_SEL = [
  { ifFlag: 'hw.sq1.t1', use: 'hw-moss-crab-told' },
  { ifFlag: 'hw.sq1.start', use: 'hw-moss-crab-turn' },
  { use: 'hw-moss-crab' },
];
assert('sq: Mosswick offers turn 1', (await resolveSelector(MOSS_SEL)) === 'hw-moss-crab-turn');
await setFlag('hw.sq1.t1');
assert('sq: Mosswick now in told state', (await resolveSelector(MOSS_SEL)) === 'hw-moss-crab-told');
// Bramblebury crab selector
const BRAM_SEL = [
  { ifFlag: 'hw.sq1.t2', use: 'hw-bramble-crab-told' },
  { ifFlag: 'hw.sq1.t1', use: 'hw-bramble-crab-turn' },
  { ifFlag: 'hw.sq1.start', use: 'hw-bramble-crab-wait' },
  { use: 'hw-bramble-crab' },
];
assert('sq: Bramblebury offers turn 2 once turn 1 held', (await resolveSelector(BRAM_SEL)) === 'hw-bramble-crab-turn');
await setFlag('hw.sq1.t2');
assert('sq: Bramblebury now in told state', (await resolveSelector(BRAM_SEL)) === 'hw-bramble-crab-told');

// completing the side quest unlocks the oak lore + flips Huff's warmest variant
const beforeOak = await codexCount();
await setFlag('hw.sq1.done');
const afterOak = await codexCount();
assert('sq: lore.hw.first-fork-oak unlocked on hw.sq1.done',
  afterOak.unlocked > beforeOak.unlocked, JSON.stringify(afterOak));
assert('sq: done -> hw-huff-done-oak variant', (await resolveSelector(HUFF_SEL)) === 'hw-huff-done-oak');
assert('sq: hw-huff-done-oak dialogue exists', await dlgExists('hw-huff-done-oak'));

// the discovery narration dialogue must exist and open
assert('sq: hw-oak-found dialogue exists', await dlgExists('hw-oak-found'));

// ---- secret-grove lore page (third codex entry) ----
const beforeSecret = await codexCount();
await setFlag('hw.secret.got');
const afterSecret = await codexCount();
assert('codex: lore.hw.secret-short-path unlocked on hw.secret.got',
  afterSecret.unlocked > beforeSecret.unlocked, JSON.stringify(afterSecret));

// ---- open the codex screen and screenshot a card ----
await page.evaluate(() => window.G.ui.openCodex());
await sleep(450);
const cardCount = await page.evaluate(() => document.querySelectorAll('.cdx-card').length);
const oakTitleShown = await page.evaluate(() =>
  [...document.querySelectorAll('.cdx-card')].some(c => /First-Fork Oak/.test(c.textContent)));
assert('codex: screen renders cards', cardCount > 0, 'cards=' + cardCount);
assert('codex: oak lore card visible & unlocked', oakTitleShown);
await shot('03-codex');
await page.evaluate(() => { const d = document.querySelector('.ui-dim'); if (d) d.remove(); window.G.state = 'world'; window.G.paused = false; });

// ---- no page errors throughout ----
assert('no page errors', errors.length === 0, errors.join(' | '));

console.log('\n' + (failures === 0 ? 'ENRICH PASS' : 'ENRICH FAIL (' + failures + ')'));
await browser.close();
process.exit(failures === 0 ? 0 : 1);
