// Enrichment drive for THE DUNE OF SURPRISES (island 'dunes').
// Boots the real game, starts a fresh save, teleports to the dunes, dismisses
// the onEnter intro, then steps the dn.sq1.* side-quest flags and confirms:
//   - Sift's dialogue selector resolves to the right id at each stage
//   - the side-quest observation + report dialogues render
//   - the codex pages unlock (G.codex.count climbs; field-note toasts fire)
//   - zero pageerrors throughout
// Screenshots: island, a new (post-completion) dialogue, the codex screen.
// Run from _smoke/:  node enrich_dunes.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'enrich-dunes');
fs.mkdirSync(shots, { recursive: true });

const browser = await puppeteer.launch({ channel: 'chrome', headless: true,
  args: ['--window-size=900,860', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 900, height: 860 } });
const page = await browser.newPage();
const errors = [], toasts = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error' && !/Failed to load resource/.test(t)) errors.push('console: ' + t);
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });
const flags = () => page.evaluate(() => window.G.qa.state().flags);
const setFlag = f => page.evaluate(ff => window.G.qa.setFlag(ff), f);
const codexCount = () => page.evaluate(() => window.G.codex.count());
// resolve Sift's dialogue selector exactly the way entities.js does
const resolveSift = () => page.evaluate(() => {
  const isl = window.G.world.island;
  const sift = (isl.entities || []).find(e => e.id === 'dn-sift');
  const ref = sift.dialogue;
  for (const r of ref) {
    if (r.ifFlag && !window.G.flags.has(r.ifFlag)) continue;
    if (r.ifNotFlag && window.G.flags.has(r.ifNotFlag)) continue;
    return r.use;
  }
  return null;
});
// run a dialogue to completion by clicking the box; record the lines shown
const playDialogue = async (id, maxSteps = 40) => {
  await page.evaluate(i => window.G.dialogue.start(i), id);
  await sleep(120);
  const lines = [];
  for (let i = 0; i < maxSteps; i++) {
    const st = await page.evaluate(() => {
      if (!window.G.dialogue.active()) return { done: true };
      const box = document.getElementById('dlgbox');
      return {
        done: false,
        name: box.querySelector('.dlg-name').textContent,
        text: box.querySelector('.dlg-text').textContent,
        choice: box.querySelector('.dlg-choices').style.display !== 'none',
      };
    });
    if (st.done) return { lines, completed: true };
    if (st.text) lines.push((st.name ? st.name + ': ' : '') + st.text);
    if (st.choice) {
      // pick the first choice (the side-quest "yes" branch)
      await page.evaluate(() => document.querySelector('.dlg-choice').click());
    } else {
      await page.evaluate(() => document.getElementById('dlgbox').click());
    }
    await sleep(90);
  }
  return { lines, completed: false };
};

// ---- boot to a fresh world ----
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
// instant text so the typewriter never blocks our reads
await page.evaluate(() => { window.G.save.data.textSpeed = 'instant'; });

// ---- teleport to the dunes, dismiss the onEnter intro ----
await page.evaluate(() => window.G.qa.teleport('dunes', 25, 29));
await sleep(700);
// the intro trigger fires near the dock; dismiss whatever dialogue is up
for (let i = 0; i < 25; i++) {
  const active = await page.evaluate(() => window.G.dialogue && window.G.dialogue.active());
  if (!active) break;
  await page.evaluate(() => { const b = document.getElementById('dlgbox'); if (b) b.click(); });
  await sleep(120);
}
await sleep(300);
const islandState = await page.evaluate(() => window.G.qa.state());
console.log('on island:', islandState.island, '| state:', islandState.state);
await shot('01-island');

// ---- baseline codex count ----
const cdx0 = await codexCount();
console.log('codex baseline:', JSON.stringify(cdx0));

// ============ step the side quest ============
console.log('\n--- selector at fresh arrival ---');
console.log('  Sift ->', await resolveSift(), '(expect dn-sift-intro)');

// pass the geyser gate (main-path flag) -> unlocks lore.dn.surprise-jar + offer
await setFlag('dn.met-sift');
await setFlag('dn.forecast.done');
await sleep(200);
console.log('after forecast.done: Sift ->', await resolveSift(), '(expect dn-sift-needs-tree)');
const cdxA = await codexCount();
console.log('  codex now:', JSON.stringify(cdxA), '(surprise-jar should unlock)');

// talk to Sift in the needs-tree state -> should offer the survey, set dn.sq1.start
const offer = await playDialogue('dn-sift-needs-tree');
console.log('  needs-tree dialogue lines:', offer.lines.length, '| completed:', offer.completed);
let fl = await flags();
console.log('  dn.sq1.start set:', fl.includes('dn.sq1.start'));

// observation spots chain via ifFlag: obs1 -> obs2 -> obs3
const o1 = await playDialogue('dn-sq-obs1');
const o2 = await playDialogue('dn-sq-obs2');
const o3 = await playDialogue('dn-sq-obs3');
fl = await flags();
console.log('  observations:', ['dn.sq1.obs1','dn.sq1.obs2','dn.sq1.obs3'].map(f => f + '=' + fl.includes(f)).join(' '));
console.log('  obs1 sample:', o1.lines[0]);

// the report-in should be the resolved selector now (obs3 set, sq1.done not)
console.log('  Sift -> ', await resolveSift(), '(still needs-tree; report routes inside)');
const report = await playDialogue('dn-sq-report');
console.log('  report lines:', report.lines.length, '| last:', report.lines[report.lines.length - 1]);
fl = await flags();
console.log('  dn.sq1.done set:', fl.includes('dn.sq1.done'));
const cdxB = await codexCount();
console.log('  codex now:', JSON.stringify(cdxB), '(mirage-moth should unlock)');

// ---- finish the main quest -> dn.done -> lore.dn.going-rate + post-completion lines ----
await setFlag('dn.tree.done');
await setFlag('dn.done');
await sleep(200);
console.log('\nafter dn.done: Sift ->', await resolveSift(), '(expect dn-sift-done)');
const done = await playDialogue('dn-sift-done');
console.log('  post-completion lines:', done.lines.length);
done.lines.forEach(l => console.log('    | ' + l.slice(0, 96)));
const cdxC = await codexCount();
console.log('  codex final:', JSON.stringify(cdxC));

// screenshot a post-completion dialogue (re-open and capture mid-line)
await page.evaluate(() => window.G.dialogue.start('dn-sift-done'));
await sleep(250);
await shot('02-dialogue');
await page.evaluate(() => { while (window.G.dialogue.active()) document.getElementById('dlgbox').click(); });
await sleep(150);

// ---- open the codex and screenshot the dunes cards ----
await page.evaluate(() => window.G.ui.openCodex());
await sleep(400);
await shot('03-codex');
// scroll the "Notes — The Dune of Surprises" section header into view
await page.evaluate(() => {
  const secs = [...document.querySelectorAll('.cdx-sec')];
  const dune = secs.find(s => /dune/i.test(s.textContent));
  if (dune) dune.scrollIntoView({ block: 'start' });
});
await sleep(300);
await shot('04-codex-lore');
const cardTitles = await page.evaluate(() =>
  [...document.querySelectorAll('.cdx-card:not(.cdx-locked) .cdx-t span:nth-child(2)')]
    .map(s => s.textContent).filter(t => /jar|moth|rate/i.test(t)));
console.log('\nunlocked dune cards visible:', cardTitles);

// ---- post-game variant check (separate state) ----
await page.evaluate(() => { window.G.ui.openCodex; });
await setFlag('game.finished');
await sleep(150);
console.log('after game.finished: Sift ->', await resolveSift(), '(expect dn-sift-postgame)');

console.log('\n=== RESULT ===');
console.log('pageerrors:', errors.length ? errors : 'NONE');
console.log('codex went', cdx0.unlocked, '->', cdxC.unlocked, 'of', cdxC.total);
await browser.close();
process.exit(errors.length ? 1 : 0);
