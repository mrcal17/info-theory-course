// Chrome drive for the Static Strait enrichment (island 04_strait.js).
// Derived from pz_drive.mjs boot pattern. Verifies, with zero page errors:
//   1. boot -> new game past intro -> qa.teleport('strait') -> dismiss dialogue
//   2. the NEW side-quest (st.sq1.*) selectors resolve at each stage and the
//      lamp riddle completes -> st.sq1.done -> codex 'lore.st.lamps' unlocks
//   3. the existing door/dialogue puzzle flow still works: a sister's dialogue
//      action opens a real puzzle overlay (proves nothing was broken)
//   4. the st.done postgame variants resolve and 'lore.st.sisters' unlocks
//   5. screenshots: island, a new dialogue, a codex card -> reviewed by hand
// Run from _smoke/:  node enrich_strait.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'enrich-strait');
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
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; console.error('ASSERT FAIL:', msg); } else console.log('ok:', msg); };

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

// ---- helpers ----
const setFlag = f => page.evaluate(x => window.G.qa.setFlag(x), f);
const clearFlag = f => page.evaluate(x => window.G.flags.clear(x), f);
const hasFlag = f => page.evaluate(x => window.G.flags.has(x), f);
const codexCount = () => page.evaluate(() => window.G.codex.count());
const codexUnlocked = id => page.evaluate(i => {
  const e = window.G.codex.entries().find(e => e.id === i);
  return e ? window.G.codex.isUnlocked(e) : null;
}, id);
// replicate the engine's resolveDialogue (entities.js) against the strait entity
const resolveDlg = entId => page.evaluate(id => {
  const isl = window.G.islands.get('strait');
  const ent = isl.entities.find(e => e.id === id);
  const ref = ent && ent.dialogue;
  if (Array.isArray(ref) && ref.length && ref[0] && (ref[0].use || ref[0].ifFlag || ref[0].ifNotFlag)) {
    for (const r of ref) {
      if (r.ifFlag && !window.G.flags.has(r.ifFlag)) continue;
      if (r.ifNotFlag && window.G.flags.has(r.ifNotFlag)) continue;
      return { id: r.use, exists: !!isl.dialogues[r.use] };
    }
    return { id: null, exists: false };
  }
  return { id: ref, exists: typeof ref === 'string' ? !!isl.dialogues[ref] : false };
}, entId);
// run a named dialogue and step through it via keyboard, picking a given choice index
const startDlg = id => page.evaluate(i => window.G.dialogue.start(i), id);
const dlgActive = () => page.evaluate(() => window.G.dialogue.active());
const overlayOpen = () => page.evaluate(() => window.G.overlay.isOpen());
async function clearDialogue(max = 30) {
  for (let i = 0; i < max; i++) {
    if (!(await dlgActive())) return true;
    // if there is a choice, pick the first option, else advance
    const hasChoice = await page.evaluate(() => {
      const c = document.querySelector('#dlgbox .dlg-choices');
      return c && c.style.display !== 'none' && c.children.length > 0;
    });
    if (hasChoice) {
      await page.evaluate(() => document.querySelector('#dlgbox .dlg-choices button').click());
    } else {
      await page.keyboard.press('KeyE');
    }
    await sleep(120);
  }
  return !(await dlgActive());
}
const choicesVisible = () => page.evaluate(() => {
  const c = document.querySelector('#dlgbox .dlg-choices');
  return !!(c && c.style.display !== 'none' && c.children.length > 0);
});
// advance spoken lines (clearing the typewriter) until the choice buttons show
async function advanceToChoice(max = 20) {
  for (let i = 0; i < max; i++) {
    if (await choicesVisible()) return true;
    if (!(await dlgActive())) return false;
    await page.keyboard.press('KeyE'); // finishes typing, then advances
    await sleep(90);
  }
  return await choicesVisible();
}
// pick a choice button by matching text (advances to the choice step first)
async function pickChoice(re) {
  await advanceToChoice();
  return page.evaluate(src => {
    const r = new RegExp(src, 'i');
    const b = [...document.querySelectorAll('#dlgbox .dlg-choices button')].find(b => r.test(b.textContent));
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
  }, re.source ?? String(re));
}

// ---- 1. teleport to the strait, dismiss the intro ----
await page.evaluate(() => window.G.qa.teleport('strait', 20, 36));
await sleep(500);
await clearDialogue();              // st-intro fires onEnter
const islandId = await page.evaluate(() => window.G.qa.state().island);
assert(islandId === 'strait', 'arrived on the strait (island=' + islandId + ')');
await sleep(300);
await shot('01-island');

const baseCodex = await codexCount();
console.log('codex at arrival:', JSON.stringify(baseCodex));

// ---- 2. side-quest selector progression (st.sq1.*) ----
// Pre-state: gate flags as if main puzzles are progressing so the right
// selector entries are live. Bea's lamp branch needs bridge.done & !sq1.start.
await setFlag('st.charm1.done');
await setFlag('st.bridge.done');

let r = await resolveDlg('st-bea');
assert(r.id === 'st-bea-lamp' && r.exists, 'Bea selector -> st-bea-lamp (got ' + JSON.stringify(r) + ')');

// play Bea's lamp dialogue (sets st.sq1.start)
await startDlg('st-bea-lamp');
await clearDialogue();
assert(await hasFlag('st.sq1.start'), 'st-bea-lamp set st.sq1.start');

r = await resolveDlg('st-ada');
assert(r.id === 'st-ada-lamp' && r.exists, 'Ada selector -> st-ada-lamp (got ' + JSON.stringify(r) + ')');
await startDlg('st-ada-lamp');
await clearDialogue();
assert(await hasFlag('st.sq1.clue'), 'st-ada-lamp set st.sq1.clue');

// Cee should now offer the board
r = await resolveDlg('st-cee');
// note: st-cee selector requires charm2.done/lock.done to be the LAST gates;
// the lamp branch sits after them, so set those too to reach it.
await setFlag('st.charm2.done');
await setFlag('st.lock.done');
r = await resolveDlg('st-cee');
assert(r.id === 'st-cee-lamp' && r.exists, 'Cee selector -> st-cee-lamp (got ' + JSON.stringify(r) + ')');

// open Cee's board, capture the opening line, take a WRONG choice first
// (no flag), then the right one
await startDlg('st-cee-lamp');
await sleep(900);   // let the first line type out for a clean capture
await shot('02-dialogue-cee-lamp');
await advanceToChoice();
let picked = await pickChoice(/only Ada/i);
console.log('wrong pick:', picked);
await clearDialogue();
assert(!(await hasFlag('st.sq1.done')), 'wrong lamp choice did NOT set st.sq1.done');

// right choice
await startDlg('st-cee-lamp');
await sleep(200);
picked = await pickChoice(/BOTH/i);
console.log('right pick:', picked);
await clearDialogue();
assert(await hasFlag('st.sq1.done'), 'correct lamp choice set st.sq1.done');

const lampLore = await codexUnlocked('lore.st.lamps');
assert(lampLore === true, "codex 'lore.st.lamps' unlocked on st.sq1.done");
const afterSq = await codexCount();
assert(afterSq.unlocked >= baseCodex.unlocked, 'codex unlocked count did not drop (' + baseCodex.unlocked + ' -> ' + afterSq.unlocked + ')');

// ---- 3. prove the EXISTING door/dialogue puzzle flow still works ----
// Reset the strait's relay flags, then open the relay puzzle via Cee's charm
// dialogue action (the same openPuzzle the real door uses).
await clearFlag('st.charm2.done');
await clearFlag('st.lock.done');
r = await resolveDlg('st-cee');
assert(r.id === 'st-cee-charm' && r.exists, 'Cee selector falls back to st-cee-charm when charm2 cleared (got ' + JSON.stringify(r) + ')');
await startDlg('st-cee-charm');
await sleep(250);
// take the "Wire all three charms." choice -> openPuzzle parity-charm correct
picked = await pickChoice(/Wire all three/i);
console.log('relay puzzle opener:', picked);
await sleep(500);
assert(await overlayOpen(), 'existing dialogue action opened the relay parity-charm overlay');
const pzType = await page.evaluate(() => {
  const ov = document.querySelector('#puzzle-ov');
  return ov ? (ov.textContent.match(/parity|charm|syndrome/i) || [''])[0] : '';
});
console.log('overlay text hint:', pzType);
await shot('03-relay-puzzle');
await page.evaluate(() => { if (window.G.overlay.isOpen()) window.G.overlay.close(); });
await sleep(200);
assert(!(await overlayOpen()), 'overlay closed cleanly (no softlock)');
assert(!(await hasFlag('st.charm2.done')), 'backing out of relay puzzle did NOT set st.charm2.done');

// ---- 4. st.done postgame variants + lore.st.sisters ----
await setFlag('st.done');
r = await resolveDlg('st-ada');
assert(r.id === 'st-ada-done2' && r.exists, 'Ada (st.done + sq1.done) -> st-ada-done2 (got ' + JSON.stringify(r) + ')');
r = await resolveDlg('st-bea');
assert(r.id === 'st-bea-done2' && r.exists, 'Bea (st.done + sq1.done) -> st-bea-done2 (got ' + JSON.stringify(r) + ')');
// Cee needs charm2/lock set again to pass her puzzle gates and reach done2
await setFlag('st.charm2.done');
await setFlag('st.lock.done');
r = await resolveDlg('st-cee');
assert(r.id === 'st-cee-done2' && r.exists, 'Cee (st.done + sq1.done) -> st-cee-done2 (got ' + JSON.stringify(r) + ')');

const sistersLore = await codexUnlocked('lore.st.sisters');
assert(sistersLore === true, "codex 'lore.st.sisters' unlocked on st.done");
const eatLore = await codexUnlocked('lore.st.eatswords');
assert(eatLore === true, "codex 'lore.st.eatswords' unlocked on st.charm1.done");

// open the codex screen and screenshot a card
await page.evaluate(() => window.G.ui.openCodex());
await sleep(450);
const codexHasLore = await page.evaluate(() =>
  /Three sisters, one parity check/.test(document.body.textContent) &&
  /Notes — The Static Strait/.test(document.body.textContent));
assert(codexHasLore, 'codex screen renders the strait lore section + a new card');
// scroll the list so the strait lore cards are in view for the screenshot
await page.evaluate(() => {
  const sec = [...document.querySelectorAll('.cdx-sec')].find(s => /Static Strait/.test(s.textContent));
  if (sec) sec.scrollIntoView({ block: 'start' });
});
await sleep(300);
await shot('04-codex');
await page.evaluate(() => { const b = [...document.querySelectorAll('.ui-back')].find(b => /close/i.test(b.textContent)); if (b) b.click(); });

// ---- report ----
console.log('--- enrich_strait drive ---');
console.log('pageerrors:', errors.length ? errors : 'none');
console.log('assert failures:', failures);
await browser.close();
process.exit(errors.length === 0 && failures === 0 ? 0 : 1);
