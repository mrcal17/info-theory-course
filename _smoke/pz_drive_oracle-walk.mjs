// Chrome drive for oracle-walk — derived from pz_drive.mjs (PEDAGOGY.md §4.2).
// Scripts: (a) NAIVE run — always tap the LAST candidate; must blow the par
// budget twice (fail + retry loop + hint ladder), never completing;
// (b) INFORMED run — frequency-aware guesses in the veiled stage, word-reading
// in the revealed stage; must complete (flag qa.test.oracle-walk).
// Also verifies taught-mode repeat (no hook, no veiled stage) and a 420px pass.
// Run from _smoke/: node pz_drive_oracle-walk.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'oracle-walk';
const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'archipelago', 'index.html')).href;
const shots = path.join(here, 'shots', 'pz', type);
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
  console.log((cond ? '  ok  ' : '  FAIL ') + name + (detail ? '  [' + detail + ']' : ''));
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

// ---- the frozen 06_spires config ----
const cfg = await page.evaluate(t => {
  for (const isl of window.G.islands.list()) {
    for (const e of (isl.entities || [])) {
      if (e.puzzle && e.puzzle.type === t) return e.puzzle.config || {};
    }
  }
  return {};
}, type);
const text = String(cfg.text || '').toLowerCase().replace(/[^a-z ]/g, '');
const ORDER = ' etaoinshrdlcumwfgypbvkjxqz';
const glyph = ch => ch === ' ' ? '␣' : ch;
console.log('config:', JSON.stringify(cfg).slice(0, 110), '| text len', text.length);

// ---- in-page helpers ----
const ui = () => page.evaluate(() => {
  const q = s => document.querySelector('#puzzle-ov ' + s);
  const cands = [...document.querySelectorAll('#puzzle-ov .ow-cand')]
    .map(b => ({ ch: b.textContent.trim(), disabled: !!b.disabled }));
  return {
    open: window.G.overlay.isOpen(),
    flag: window.G.flags.has('qa.test.oracle-walk'),
    cands, enabled: cands.filter(c => !c.disabled).length,
    spent: q('#ow-spent') ? parseFloat(q('#ow-spent').textContent) : null,
    head: q('.ow-meterhead') ? q('.ow-meterhead').textContent : '',
    prompt: q('#ow-prompt') ? q('#ow-prompt').textContent : '',
    coach: q('#ow-coach') ? q('#ow-coach').textContent.trim() : '',
    hook: !!document.querySelector('#puzzle-ov .pzk-hook'),
    debrief: !!document.querySelector('#puzzle-ov .pzk-debrief'),
    freeTiles: document.querySelectorAll('#puzzle-ov .ow-tile.ow-free').length,
  };
});
const clickCand = ch => page.evaluate(g => {
  const b = [...document.querySelectorAll('#puzzle-ov .ow-cand')]
    .find(b => !b.disabled && b.textContent.trim() === g);
  if (b) { b.click(); return true; } return false;
}, glyph(ch));
const clickLastCand = () => page.evaluate(() => {
  const bs = [...document.querySelectorAll('#puzzle-ov .ow-cand')].filter(b => !b.disabled);
  const b = bs[bs.length - 1];
  if (b) { b.click(); return true; } return false;
});
const clickHookOption = idx => page.evaluate(i => {
  const bs = [...document.querySelectorAll('#puzzle-ov .pzk-opt')];
  if (bs[i] && !bs[i].disabled) { bs[i].click(); return true; } return false;
}, idx);
const clickHookGo = () => page.evaluate(() => {
  const b = document.querySelector('#puzzle-ov .pzk-hook .btn');
  if (b) { b.click(); return true; } return false;
});
const clickDebrief = () => page.evaluate(() => {
  const b = document.querySelector('#puzzle-ov .pzk-debrief .btn');
  if (b) { b.click(); return true; } return false;
});
const openOverlay = (flag = 'qa.test.' + type) =>
  page.evaluate((t, c, f) => window.G.overlay.open({ type: t, config: c, flag: f }), type, cfg, flag);
const closeOverlay = () => page.evaluate(() => window.G.overlay.close());

// wait for a fresh step (3 enabled candidates with a new prompt), debrief, or close
async function waitNewStep(lastPrompt, timeout = 7000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await ui();
    if (!s.open || s.debrief) return s;
    if (s.enabled === 3 && s.prompt !== lastPrompt) return s;
    await sleep(90);
  }
  return await ui();
}
// tap buttons (via picker) until the step's correct pick registers
async function playStep(picker) {
  for (let i = 0; i < 4; i++) {
    if (!(await picker())) break;
    await sleep(55);
    const s = await ui();
    if (s.enabled === 0 || !s.open || s.debrief) return;
  }
}

/* ================= NAIVE RUN: always tap the LAST candidate ================= */
console.log('\n--- NAIVE run (lazy: always the last candidate) ---');
await openOverlay();
await sleep(500);
let s = await ui();
expect('overlay open with hook card', s.open && s.hook);
await shot('01-hook');
await clickHookOption(0); // naive prediction: "1 bit" (wrong) — welcomed, not punished
await sleep(300);
await shot('02-hook-revealed');
await clickHookGo();
await sleep(600);

let lastPrompt = '', prevSpent = 0, fails = 0, steps = 0, blowupAt = 0;
while (fails < 2 && steps < 300) {
  s = await waitNewStep(lastPrompt);
  if (!s.open || s.debrief) break;
  lastPrompt = s.prompt;
  if (s.spent != null && s.spent < prevSpent - 5) {
    fails++;
    blowupAt = prevSpent;
    console.log(`  budget blown #${fails} at ${prevSpent.toFixed(2)} bits (cap in header: "${s.head.trim().slice(0, 80)}")`);
    await shot(fails === 1 ? '04-naive-fail1-reset' : '05-naive-fail2-hint');
    if (fails === 2) break;
    prevSpent = 0;
  } else if (s.spent != null) prevSpent = Math.max(prevSpent, s.spent);
  await playStep(clickLastCand);
  steps++;
  if (steps === 6) await shot('03-naive-veiled');
}
s = await ui();
expect('naive: blew the budget twice', fails === 2, `blowups=${fails}, last at ${blowupAt.toFixed(1)} bits`);
expect('naive: hint ladder fired (coach shows h1)', /common glyphs/i.test(s.coach), s.coach.slice(0, 60));
expect('naive: NOT completed', s.open && !s.flag);
await closeOverlay();
await sleep(400);

/* ============ INFORMED RUN: frequency-aware blind, word-reading after ============ */
console.log('\n--- INFORMED run (frequency-aware + reading the words) ---');
await openOverlay();
await sleep(500);
s = await ui();
expect('hook shown again (still untaught)', s.hook);
await clickHookOption(1); // correct: log2(3) ~ 1.58
await sleep(300);
await clickHookGo();
await sleep(600);

let idx = 0; lastPrompt = '';
let seamSeen = false, sawVeil = 0;
while (idx < text.length + 5) {
  s = await waitNewStep(lastPrompt);
  if (!s.open || s.debrief) break;
  lastPrompt = s.prompt;
  if (/veiled stone/i.test(s.prompt)) sawVeil++;
  if (idx < 8) {
    // frequency-aware order over the offered candidates
    const order = s.cands.map(c => c.ch === '␣' ? ' ' : c.ch)
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    let oi = 0;
    await playStep(() => clickCand(order[Math.min(oi++, order.length - 1)]));
  } else {
    const want = text[idx];
    let first = true;
    await playStep(() => { const r = first ? clickCand(want) : clickLastCand(); first = false; return r; });
  }
  idx++;
  if (idx === 5) await shot('06-blind-meter-hugs');
  if (idx === 8) { await sleep(1000); await shot('07-seam'); const c = (await ui()).coach; seamSeen = /KNOW/i.test(c); }
  if (idx === 34) await shot('08-context-meter-drop');
}
s = await ui();
expect('informed: walked all ' + text.length + ' tiles', idx >= text.length, 'idx=' + idx);
expect('informed: veiled prompts seen for stage 1', sawVeil >= 7, String(sawVeil));
expect('informed: seam coach line shown ("…what you KNOW")', seamSeen);
expect('informed: debrief card shown', s.debrief);
expect('informed: spent under cap', s.spent != null && s.spent < 89.2519, String(s.spent));
console.log(`  informed total: ${s.spent} bits vs cap 89.25`);
await shot('09-debrief');
await clickDebrief();
await sleep(600);
s = await ui();
expect('informed: completed (flag qa.test.oracle-walk, overlay closed)', !s.open && s.flag);
await shot('10-complete-world');

/* ================= TAUGHT REPEAT: no hook, no veiled stage ================= */
console.log('\n--- TAUGHT repeat ---');
const taughtFlag = await page.evaluate(() => window.G.flags.has('pz.oracle-walk.taught'));
expect('markTaught persisted', taughtFlag);
await openOverlay('qa.test.ow-repeat');
await sleep(500);
s = await ui();
expect('taught: no hook', !s.hook);
expect('taught: lit free prefix (7 tiles)', s.freeTiles === 7, String(s.freeTiles));
expect('taught: original config par 87.00 in header', /87\.00/.test(s.head), s.head.trim().slice(0, 70));
expect('taught: contextful prompt (no veiled stones)', /tile 8 of/i.test(s.prompt), s.prompt.slice(0, 50));
await shot('11-taught-repeat');
await closeOverlay();
await sleep(300);

/* ================= 420px PASS (first-time layout) ================= */
console.log('\n--- 420px pass ---');
await page.evaluate(() => window.G.flags.clear('pz.oracle-walk.taught'));
await page.setViewport({ width: 420, height: 860 });
await sleep(300);
await openOverlay('qa.test.ow-mobile');
await sleep(500);
await shot('12-mobile-hook');
await clickHookOption(1); await sleep(250); await clickHookGo(); await sleep(600);
lastPrompt = '';
for (let k = 0; k < 3; k++) {
  s = await waitNewStep(lastPrompt);
  if (!s.open) break;
  lastPrompt = s.prompt;
  const order = s.cands.map(c => c.ch === '␣' ? ' ' : c.ch)
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  let oi = 0;
  await playStep(() => clickCand(order[Math.min(oi++, order.length - 1)]));
}
await sleep(300);
await shot('13-mobile-walk');
await closeOverlay();

console.log('\nerrors:', errors.length ? errors : 'none');
expect('no page errors', errors.length === 0);
console.log(ok ? '\nDRIVE PASS' : '\nDRIVE FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
