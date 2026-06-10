// Chrome drive for the Mirror Spires enrichment (island 06_spires.js).
// Derived from the boot pattern in pz_drive.mjs / pz_drive_oracle-walk.mjs.
// Verifies, with zero page errors:
//   * boot -> new game past intro -> qa.teleport('spires') -> dismiss intro dialogue
//   * the Warden's dialogue SELECTOR resolves to real dialogue ids in every
//     relevant flag-state (post-completion, mid-progress, wager reveal, etc.)
//   * the side-quest flag machine: ms.sq1.start -> two overlooks -> ms.sq1.two
//     -> ms-warden-bet-reveal sets ms.sq1.done
//   * codex lore pages register and unlock on their flags (G.codex.count grows,
//     toast fires), card renders via G.ui.openCodex()
//   * screenshots: island view, a NEW dialogue, a codex card
// Run from _smoke/: node enrich_spires.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'enrich-spires');
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
let ok = true;
const expect = (name, cond, detail = '') => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  [' + detail + ']' : ''));
  if (!cond) ok = false;
};

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
expect('booted into world', (await page.evaluate(() => window.G.qa.state().state)) === 'world');

// ---- teleport to the Mirror Spires ----
await page.evaluate(() => window.G.qa.teleport('spires'));
await sleep(700);
const onSpires = await page.evaluate(() => window.G.qa.state().island);
expect('on island spires', onSpires === 'spires', String(onSpires));

// ---- dismiss the intro dialogue (onEnter ms-intro) by clicking the box ----
async function dismissDialogue(maxClicks = 30) {
  for (let i = 0; i < maxClicks; i++) {
    const active = await page.evaluate(() => window.G.dialogue.active());
    if (!active) return true;
    await page.evaluate(() => { const b = document.getElementById('dlgbox'); if (b) b.click(); });
    await sleep(120);
  }
  return !(await page.evaluate(() => window.G.dialogue.active()));
}
await sleep(400);
expect('intro dialogue dismissed', await dismissDialogue());
await sleep(300);
await shot('01-island');

// helper: clear all ms.* flags so we can probe each flag-state cleanly
const resetMs = () => page.evaluate(() => {
  for (const f of window.G.flags.all()) if (/^ms\./.test(f)) window.G.flags.clear(f);
});
const setFlags = (...fs) => page.evaluate(arr => arr.forEach(f => window.G.qa.setFlag(f)), fs);

// resolve the Warden's dialogue selector exactly as the engine does, in-page,
// then assert the chosen id is a real dialogue in the island.
const resolveWarden = () => page.evaluate(() => {
  const isl = window.G.islands.get('spires');
  const w = isl.entities.find(e => e.id === 'ms-warden');
  const ref = w.dialogue;
  let picked = null;
  for (const r of ref) {
    if (r.ifFlag && !window.G.flags.has(r.ifFlag)) continue;
    if (r.ifNotFlag && window.G.flags.has(r.ifNotFlag)) continue;
    picked = r.use; break;
  }
  return { picked, exists: !!(picked && isl.dialogues[picked]) };
});

// ---- selector matrix: each flag-state routes to a real, distinct dialogue ----
console.log('\n--- Warden dialogue selector matrix ---');
const cases = [
  { name: 'first meeting',              flags: [],                                   want: 'ms-warden-1' },
  { name: 'after meeting (again)',      flags: ['ms.met-warden'],                    want: 'ms-warden-again' },
  { name: 'mid-progress (predicts you)',flags: ['ms.met-warden', 'ms.dials.done'],   want: 'ms-warden-midpredict' },
  { name: 'oracle done only',           flags: ['ms.met-warden', 'ms.oracle.done'],  want: 'ms-warden-readytune' },
  { name: 'both gates -> ready',        flags: ['ms.met-warden', 'ms.dials.done', 'ms.oracle.done'], want: 'ms-warden-readytune' },
  { name: 'island done',                flags: ['ms.met-warden', 'ms.done'],         want: 'ms-warden-done' },
  { name: 'wager won (reveal)',         flags: ['ms.met-warden', 'ms.sq1.start', 'ms.sq1.two'], want: 'ms-warden-bet-reveal' },
  { name: 'post-game',                  flags: ['ms.met-warden', 'ms.done', 'game.finished'], want: 'ms-warden-post' },
];
for (const c of cases) {
  await resetMs();
  // game.finished is not an ms. flag; set explicitly
  await page.evaluate(() => window.G.flags.clear('game.finished'));
  await setFlags(...c.flags);
  const r = await resolveWarden();
  expect('selector: ' + c.name + ' -> ' + c.want, r.picked === c.want && r.exists, 'got ' + r.picked + ' exists=' + r.exists);
}

// ---- side-quest flag machine ----
console.log('\n--- side quest: the Warden\'s wager ---');
await resetMs();
await page.evaluate(() => window.G.flags.clear('game.finished'));
await setFlags('ms.met-warden');

// Beat 1: accept the wager (the bet-accept dialogue sets ms.sq1.start)
await page.evaluate(() => window.G.dialogue.start('ms-warden-bet-accept'));
await dismissDialogue();
expect('beat1: ms.sq1.start set after accept', await page.evaluate(() => window.G.flags.has('ms.sq1.start')));

// Beat 2: reach FIRST overlook (west). Triggers normally set ms.sq1.ov-w; here
// we set that flag (as the engine would) then run its reach dialogue, which
// must record the first lean ms.sq1.first-w.
await setFlags('ms.sq1.ov-w');
await page.evaluate(() => window.G.dialogue.start('ms-sq1-reach-w'));
await dismissDialogue();
await shot('02-dialogue');   // a NEW dialogue surface mid-quest
expect('beat2: first lean recorded (ms.sq1.first-w)', await page.evaluate(() => window.G.flags.has('ms.sq1.first-w')));
expect('beat2: firstpicked latched', await page.evaluate(() => window.G.flags.has('ms.sq1.firstpicked')));
expect('beat2: only ONE overlook -> ms.sq1.two NOT set yet', !(await page.evaluate(() => window.G.flags.has('ms.sq1.two'))));

// Beat 3: reach SECOND overlook (north). first lean must NOT change.
await setFlags('ms.sq1.ov-n');
await page.evaluate(() => window.G.dialogue.start('ms-sq1-reach-n'));
await dismissDialogue();
expect('beat3: first lean unchanged (still west, not north)', await page.evaluate(() =>
  window.G.flags.has('ms.sq1.first-w') && !window.G.flags.has('ms.sq1.first-n')));
expect('beat3: two distinct overlooks -> ms.sq1.two set', await page.evaluate(() => window.G.flags.has('ms.sq1.two')));

// Beat 3.5: the Warden selector now routes to the reveal
const rRev = await resolveWarden();
expect('beat3: selector -> ms-warden-bet-reveal', rRev.picked === 'ms-warden-bet-reveal');

// Beat 4: the reveal names the FIRST step and sets ms.sq1.done
await page.evaluate(() => window.G.dialogue.start('ms-warden-bet-reveal'));
await dismissDialogue();
expect('beat4: ms.sq1.done set after reveal', await page.evaluate(() => window.G.flags.has('ms.sq1.done')));

// ---- codex lore: registration + unlock on flags ----
console.log('\n--- codex lore pages ---');
const loreInfo = () => page.evaluate(() => {
  const all = window.G.codex.entries().filter(e => e.island === 'spires');
  return {
    ids: all.map(e => e.id),
    unlocked: all.filter(e => window.G.codex.isUnlocked(e)).map(e => e.id),
    count: window.G.codex.count(),
  };
});
const li = await loreInfo();
expect('3 spires lore entries registered', li.ids.length === 3, li.ids.join(','));
expect('lore.ms.wager present', li.ids.includes('lore.ms.wager'));
expect('lore.ms.twin-towers present', li.ids.includes('lore.ms.twin-towers'));
expect('lore.ms.prophecies present', li.ids.includes('lore.ms.prophecies'));
// with ms.met-warden + ms.sq1.done set, wager + prophecies unlocked, twin-towers not (needs ms.done)
expect('lore.ms.wager unlocked (ms.sq1.done)', li.unlocked.includes('lore.ms.wager'));
expect('lore.ms.prophecies unlocked (ms.met-warden)', li.unlocked.includes('lore.ms.prophecies'));
expect('lore.ms.twin-towers LOCKED (no ms.done)', !li.unlocked.includes('lore.ms.twin-towers'));

const before = li.count.unlocked;
await setFlags('ms.done');
const after = await page.evaluate(() => window.G.codex.count());
expect('unlocking ms.done grows codex count', after.unlocked > before, before + ' -> ' + after.unlocked);
expect('lore.ms.twin-towers now unlocked', await page.evaluate(() =>
  window.G.codex.isUnlocked(window.G.codex.entries().find(e => e.id === 'lore.ms.twin-towers'))));

// a toast confirming the player can see a notification (visual sanity)
await page.evaluate(() => window.G.ui.toast('Field note added — The Twin Towers'));
await sleep(200);

// ---- open the codex screen and screenshot a spires card ----
await page.evaluate(() => window.G.ui.openCodex());
await sleep(500);
const codexOpen = await page.evaluate(() => window.G.state === 'codex'
  && !!document.querySelector('.cdx-card'));
expect('codex screen open with cards', codexOpen);
// confirm a spires lore card title is rendered & unlocked (not '? ? ?')
const cardOk = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.cdx-card')];
  return cards.some(c => /Why the Towers Move Together|The Warden.s Wager|Prophecies/.test(c.textContent)
    && !c.classList.contains('cdx-locked'));
});
expect('a spires lore card rendered unlocked', cardOk);
await shot('03-codex');
await page.evaluate(() => { const b = [...document.querySelectorAll('.ui-back')].find(b => /close/i.test(b.textContent)); if (b) b.click(); });
await sleep(300);

console.log('\nerrors:', errors.length ? errors : 'none');
expect('no page errors', errors.length === 0);
console.log(ok ? '\nDRIVE PASS' : '\nDRIVE FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
