// Enrichment drive for Beacon Rock (island 1).
// Boots the real game from index.html, starts a new game past the intro, then:
//   - verifies zero pageerrors
//   - walks the br.sq1.* side-quest flag flow (set flags in order, re-resolve
//     each NPC's dialogue selector via G to confirm the right variant wins)
//   - confirms the codex lore unlocks (count rises, toast fires)
//   - screenshots the island, a new dialogue, and the unlocked codex card
// Run from _smoke/:  node enrich_beacon-rock.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'enrich', 'beacon-rock');
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
const log = (...a) => console.log(...a);

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
// dismiss the intro dialogue (press E until in 'world')
for (let i = 0; i < 40; i++) {
  const st = await page.evaluate(() => window.G.qa.state().state);
  if (st === 'world') break;
  await page.keyboard.press('KeyE'); await sleep(140);
}
const onBeacon = await page.evaluate(() => window.G.world.island && window.G.world.island.id);
log('booted on island:', onBeacon, '| state:', await page.evaluate(() => window.G.qa.state().state));
await shot('00-island');

// Helper: resolve which dialogue id an NPC's selector picks, given current flags.
// Mirrors the engine's "first match wins" over [{ifFlag|ifNotFlag, use}].
const resolveNpc = (entId) => page.evaluate((id) => {
  const isl = window.G.world.island;
  const e = (isl.entities || []).find(x => x.id === id);
  if (!e) return { error: 'no entity ' + id };
  const d = e.dialogue;
  if (typeof d === 'string') return { picked: d };
  if (!Array.isArray(d)) return { error: 'not selector' };
  for (const opt of d) {
    if (opt.ifFlag && !window.G.flags.has(opt.ifFlag)) continue;
    if (opt.ifNotFlag && window.G.flags.has(opt.ifNotFlag)) continue;
    return { picked: opt.use };
  }
  return { picked: null };
}, entId);

const setFlag = (f) => page.evaluate(fl => window.G.flags.set(fl), f);
const hasFlag = (f) => page.evaluate(fl => window.G.flags.has(fl), f);
const codexCount = () => page.evaluate(() => window.G.codex.count());

let pass = true;
const expect = (label, got, want) => {
  const ok = got === want;
  if (!ok) pass = false;
  log(`  [${ok ? 'OK ' : 'FAIL'}] ${label}: got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
};

// ---- install a toast spy (codex unlock calls G.ui.toast) ----
await page.evaluate(() => {
  window.__toasts = [];
  const orig = window.G.ui.toast;
  window.G.ui.toast = function (t) { window.__toasts.push(String(t)); return orig && orig.call(this, t); };
});

// ---- baseline codex count ----
const c0 = await codexCount();
log('codex count (fresh):', JSON.stringify(c0));

// ===== walk the side-quest flag flow =====
log('\n--- side quest br.sq1.* flow ---');

// 0) after intro, before meeting Maren: Maren should give br-maren-1
expect('Maren before meeting', (await resolveNpc('br-maren')).picked, 'br-maren-1');

// 1) meet Maren -> offer appears
await setFlag('br.met-maren');
expect('Maren offers side quest', (await resolveNpc('br-maren')).picked, 'br-maren-sq1-offer');

// 2) accept -> ask state
await setFlag('br.sq1.start');
expect('Maren ask (quest active)', (await resolveNpc('br-maren')).picked, 'br-maren-sq1-ask');
expect('Crab gives clue variant', (await resolveNpc('br-villager-crab')).picked, 'br-crab-sq1');
expect('Turtle gives clue variant', (await resolveNpc('br-villager-turtle')).picked, 'br-turtle-sq1');

// 3) gather both clues -> ready. (engine sets br.sq1.ready in the 2nd clue dlg;
//    here we simulate the flag flow directly.)
await setFlag('br.sq1.clue-crab');
await setFlag('br.sq1.clue-turtle');
await setFlag('br.sq1.ready');
expect('Maren confirms deduction', (await resolveNpc('br-maren')).picked, 'br-maren-sq1-clues');

// 4) deliver to Shannon: the conditional choice exists in br-shannon-1's choices.
const shChoice = await page.evaluate(() => {
  const d = window.G.world.island.dialogues['br-shannon-1'];
  const step = d.find(s => s.choice);
  const opt = step && step.choice.find(c =>
    c.goto === 'br-shannon-sq1' &&
    (!c.ifFlag || window.G.flags.has(c.ifFlag)) &&
    (!c.ifNotFlag || !window.G.flags.has(c.ifNotFlag)));
  return !!opt;
});
expect('Shannon sq1 choice visible when ready', shChoice, true);

// run the actual delivery dialogue so its set-action fires the codex unlock + toast
await page.evaluate(() => window.G.dialogue.start('br-shannon-sq1'));
await sleep(300);
await shot('01-dialogue-sq1');
// advance the dialogue to the end (fires the {set:'br.sq1.done'} action)
for (let i = 0; i < 12; i++) { await page.keyboard.press('KeyE'); await sleep(120); }
expect('br.sq1.done set after delivery', await hasFlag('br.sq1.done'), true);

const c1 = await codexCount();
log('codex count (after sq1.done):', JSON.stringify(c1));
expect('codex unlocked count rose by >=1', c1.unlocked > c0.unlocked, true);
const sqToasts = await page.evaluate(() => window.__toasts.slice());
const toastFired = sqToasts.some(t => /Field note/i.test(t));
log('toasts during sq1 delivery:', JSON.stringify(sqToasts));
expect('Field-note toast fired on sq1 unlock', toastFired, true);

// after done: Maren no longer in sq1 branches
expect('Maren leaves sq1 branch after done',
  ['br-maren-sq1-offer','br-maren-sq1-ask','br-maren-sq1-clues'].includes((await resolveNpc('br-maren')).picked),
  false);

// unlock the third br lore via the existing minor item flag, and mark the bag
// returned so Maren is free to show her later variants (mirrors real play:
// Pip carries the bag, hands it back -> br.lostletter.done)
await setFlag('br.lostletter.got');
await setFlag('br.lostletter.done');

// ===== post-completion (br.done) dialogue variants =====
log('\n--- post-completion br.done variants ---');
await setFlag('br.letter.delivered'); // main path precursor (harmless)
await setFlag('br.scales.done');
await setFlag('br.done');
expect('Maren done variant', (await resolveNpc('br-maren')).picked, 'br-maren-done');
expect('Crab done variant', (await resolveNpc('br-villager-crab')).picked, 'br-crab-done');
expect('Turtle done variant', (await resolveNpc('br-villager-turtle')).picked, 'br-turtle-done');
expect('Little gull done variant', (await resolveNpc('br-villager-gull')).picked, 'br-gullsmall-done');
expect('Shannon done variant', (await resolveNpc('br-shannon')).picked, 'br-shannon-done');
expect('Ferryman ready variant', (await resolveNpc('br-gull')).picked, 'br-gull-ready');

// codex: quiet-network note now unlocked too
const c2 = await codexCount();
log('codex count (after br.done):', JSON.stringify(c2));

// screenshot a post-completion dialogue
await page.evaluate(() => window.G.dialogue.start('br-maren-done'));
await sleep(300);
await shot('02-dialogue-done');
await page.keyboard.press('Escape'); await sleep(200);
// close any open dialogue cleanly
await page.evaluate(() => { try { window.G.dialogue.close && window.G.dialogue.close(); } catch(e){} });
await sleep(200);

// ===== open the codex screen and screenshot the unlocked cards =====
log('\n--- codex screen ---');
await page.evaluate(() => window.G.ui.openCodex());
await sleep(400);
await shot('03-codex');
const cardInfo = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.cdx-card')];
  const titles = cards.filter(c => !c.classList.contains('cdx-locked'))
    .map(c => c.querySelector('.cdx-t span:nth-child(2)')?.textContent || '')
    .filter(Boolean);
  return { totalCards: cards.length, unlockedTitles: titles };
});
log('codex cards:', JSON.stringify(cardInfo));
const brLoreUnlocked = cardInfo.unlockedTitles.filter(t =>
  /dead-letter office|addressed itself|network went quiet/i.test(t));
expect('beacon-rock lore titles unlocked (3)', brLoreUnlocked.length, 3);

// ---- mid-progress variant check (separate fresh-ish state via flag clear) ----
log('\n--- mid-progress (sorter open, scales not done) ---');
await page.evaluate(() => {
  // close codex then clear the late-game flags to test the mid branch
  try { window.G.ui.closeCodex && window.G.ui.closeCodex(); } catch(e){}
  ['br.done','br.scales.done'].forEach(f => window.G.flags.clear(f));
  window.G.flags.set('br.sorter.open');
});
await sleep(200);
expect('Maren mid-progress variant', (await resolveNpc('br-maren')).picked, 'br-maren-mid');

// ---- final report ----
log('\n=== pageerrors:', errors.length ? errors : 'none');
log('=== RESULT:', pass && errors.length === 0 ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
await browser.close();
process.exit(pass && errors.length === 0 ? 0 : 1);
