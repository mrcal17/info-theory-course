// Enrichment drive for Echo Caverns (island 5). Boots the real game, starts a
// fresh save, teleports to 'caverns', then exercises the new content:
//   - dismisses the onEnter intro
//   - walks the side quest (ec.sq1.*) flag by flag, confirms selectors resolve
//   - confirms the report dialogue's correct choice sets ec.sq1.done
//   - confirms codex lore pages unlock (G.codex.count + toast) on the flags
//   - shoots the island, a new twin dialogue, and a codex card
// Run from _smoke/:  node enrich_caverns.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'enrich-caverns');
fs.mkdirSync(shots, { recursive: true });

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=900,860', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 900, height: 860 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });
const ok = (label, cond) => console.log((cond ? 'PASS ' : 'FAIL ') + label);

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
for (let i = 0; i < 40; i++) {
  const st = await page.evaluate(() => window.G.qa.state().state);
  if (st === 'world') break;
  await page.keyboard.press('KeyE'); await sleep(140);
}

// ---- teleport to caverns; dismiss onEnter intro ----
await page.evaluate(() => window.G.qa.teleport('caverns', 6, 5));
await sleep(700);
for (let i = 0; i < 12; i++) {
  const st = await page.evaluate(() => window.G.qa.state().state);
  if (st === 'world') break;
  await page.keyboard.press('KeyE'); await sleep(160);
}
const onIsland = await page.evaluate(() => window.G.qa.state().island);
ok('on island = caverns', onIsland === 'caverns');
const introSet = await page.evaluate(() => window.G.flags.has('ec.intro'));
ok('intro ran (ec.intro set)', introSet);
await sleep(200);
await shot('01-island');

// ---- helper: start a dialogue id and read the first visible line ----
const startDlg = async (id) => page.evaluate((did) => {
  window.G.dialogue.start(did);
  const open = window.G.dialogue.active();
  const name = document.querySelector('#dialogue, .dlg, #dlg') ? null : null;
  const t = document.querySelector('.dlg-text, #dlg-text, [class*="dlg"] [class*="text"]');
  return { open, text: t ? t.textContent.trim().slice(0, 80) : null };
}, id);
const closeDlg = async () => { await page.evaluate(() => window.G.dialogue.close()); await sleep(120); };

// confirm the two main NEW twin variants resolve to real steps (non-empty)
const resolves = async (id) => {
  const r = await page.evaluate((did) => {
    const isl = window.G.world.island;
    const d = isl && isl.dialogues && isl.dialogues[did];
    return Array.isArray(d) && d.length > 0;
  }, id);
  return r;
};
for (const id of ['ec-twins-done', 'ec-twins-deep-done', 'ec-twins-sq1',
                   'ec-sq1-right', 'ec-sq1-wrong', 'ec-post-north-listen',
                   'ec-post-west-listen', 'ec-post-east-listen']) {
  ok('dialogue defined: ' + id, await resolves(id));
}

// ---- side quest: listen at the three posts via their prop dialogues ----
// (drive the flags exactly as the post dialogues' actions would)
const setF = async (f) => { await page.evaluate(fl => window.G.flags.set(fl), f); await sleep(60); };

// 1) listen north (also starts the survey)
await page.evaluate(() => window.G.dialogue.start('ec-post-north-listen'));
await sleep(150);
for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyE'); await sleep(130); }
let f = await page.evaluate(() => window.G.qa.state().flags);
ok('post-north listen set ec.sq1.start', f.includes('ec.sq1.start'));
ok('post-north listen set ec.sq1.heardN', f.includes('ec.sq1.heardN'));

// 2) + 3) west & east (drive via dialogue too)
for (const [id, flag] of [['ec-post-west-listen','ec.sq1.heardW'], ['ec-post-east-listen','ec.sq1.heardE']]) {
  await page.evaluate(did => window.G.dialogue.start(did), id);
  await sleep(120);
  for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyE'); await sleep(120); }
  f = await page.evaluate(() => window.G.qa.state().flags);
  ok(id + ' set ' + flag, f.includes(flag));
}

// twin selector should now resolve to the side-quest report branch
const twinSel = await page.evaluate(() => {
  const isl = window.G.world.island;
  const lem = (isl.entities || []).find(e => e.id === 'ec-lem');
  const sel = lem.dialogue;
  for (const r of sel) {
    if (r.use && !r.ifFlag && !r.ifNotFlag) return r.use;
    if (r.ifFlag && window.G.flags.has(r.ifFlag)) return r.use;
    if (r.ifNotFlag && !window.G.flags.has(r.ifNotFlag)) return r.use;
  }
  return null;
});
ok('twin selector -> ec-twins-sq1 (survey ready)', twinSel === 'ec-twins-sq1');

// open the report dialogue. Advance (E completes typing / steps lines) ONLY
// while no choice is showing; stop as soon as the choice buttons appear.
await page.evaluate(() => window.G.dialogue.start('ec-twins-sq1'));
await sleep(180);
const choiceShowing = () => page.evaluate(() =>
  [...document.querySelectorAll('.dlg-choice')].length > 0);
for (let i = 0; i < 12; i++) {
  if (await choiceShowing()) break;
  await page.keyboard.press('KeyE');
  await sleep(140);
}
ok('survey report reached the choice', await choiceShowing());
await shot('02-dialogue-survey');

// pick the CORRECT choice (deep east shelf) by clicking the matching button
const picked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.dlg-choice')];
  const b = btns.find(x => /east/i.test(x.textContent));
  if (b) { b.click(); return b.textContent.trim(); }
  return null;
});
ok('clicked correct choice (east)', /east/i.test(picked || ''));
await sleep(200);
// advance through the argument + reward (these are plain lines, E steps them;
// the final actions step runs on its own once reached and closes the box)
for (let i = 0; i < 30; i++) {
  const stillOpen = await page.evaluate(() => window.G.dialogue.active());
  if (!stillOpen) break;
  await page.keyboard.press('KeyE'); await sleep(140);
}
f = await page.evaluate(() => window.G.qa.state().flags);
ok('correct report set ec.sq1.done', f.includes('ec.sq1.done'));
ok('report cleared ec.sq1.start', !f.includes('ec.sq1.start'));

// after done, twin selector must NOT stick on the survey branch
const twinSel2 = await page.evaluate(() => {
  const isl = window.G.world.island;
  const lem = (isl.entities || []).find(e => e.id === 'ec-lem');
  for (const r of lem.dialogue) {
    if (r.use && !r.ifFlag && !r.ifNotFlag) return r.use;
    if (r.ifFlag && window.G.flags.has(r.ifFlag)) return r.use;
    if (r.ifNotFlag && !window.G.flags.has(r.ifNotFlag)) return r.use;
  }
  return null;
});
ok('post-survey twin selector left the survey branch', twinSel2 !== 'ec-twins-sq1');

// ---- codex: count before/after the two milestone flags ----
const countBefore = await page.evaluate(() => window.G.codex.count());
// ec.sq1.done already set -> lore.ec.echo-survey unlocked; ec.met-twins from meeting? set it
await setF('ec.met-twins');     // unlocks lore.ec.lem-and-ziv
await setF('ec.vault.done');
await setF('ec.gallery1.done'); // these two -> ec.done via trigger normally; set directly
await setF('ec.done');          // unlocks lore.ec.patternless-vault
await sleep(200);
const countAfter = await page.evaluate(() => window.G.codex.count());
console.log('codex count before:', JSON.stringify(countBefore), 'after:', JSON.stringify(countAfter));
const loreUnlocked = await page.evaluate(() => {
  const want = ['lore.ec.echo-survey','lore.ec.patternless-vault','lore.ec.lem-and-ziv'];
  return window.G.codex.entries().filter(e => want.includes(e.id))
    .map(e => ({ id: e.id, open: window.G.codex.isUnlocked(e) }));
});
console.log('caverns lore pages:', JSON.stringify(loreUnlocked));
ok('all 3 caverns lore pages unlocked', loreUnlocked.length === 3 && loreUnlocked.every(e => e.open));
ok('codex unlocked count rose', countAfter.unlocked > countBefore.unlocked);

// ---- open the codex screen and screenshot a caverns card ----
await page.evaluate(() => { if (window.G.dialogue.active()) window.G.dialogue.close(); });
await sleep(120);
await page.evaluate(() => window.G.ui.openCodex());
await sleep(300);
// scroll the unlocked patternless-vault card into view by matching its title text
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.cdx-card')];
  const c = cards.find(x => /Patternless Vault/i.test(x.textContent));
  if (c) c.scrollIntoView({ block: 'center' });
});
await sleep(200);
await shot('03-codex');
const codexCardVisible = await page.evaluate(() => {
  return [...document.querySelectorAll('.cdx-card')].some(x => /Survey of Three Halls|Patternless Vault|How the Twins Dig/.test(x.textContent));
});
ok('codex screen shows a caverns lore card', codexCardVisible);

console.log('pageerrors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
