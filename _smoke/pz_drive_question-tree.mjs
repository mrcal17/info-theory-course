// Chrome drive for the 'question-tree' puzzle — derived from pz_drive.mjs.
// Scripts (a) a NAIVE run: count-balanced splits in listed order, which must
// NOT reach api.complete (the par gate blocks it; repeated failures climb the
// hint ladder), and (b) an INFORMED run: peel-the-likeliest mass-aware splits,
// which must complete and set flag qa.test.question-tree. Also verifies the
// taught-skip on reopen and a 420px-width pass (tree scrolls, page doesn't).
// Run: cd _smoke && node pz_drive_question-tree.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const type = 'question-tree';
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

const fails = [];
const expect = (name, cond, detail) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail != null ? '  [' + detail + ']' : ''}`);
  if (!cond) fails.push(name);
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

// ---- the REAL island config ----
const cfg = await page.evaluate(t => {
  for (const isl of window.G.islands.list()) {
    for (const e of (isl.entities || [])) {
      if (e.puzzle && e.puzzle.type === t) return e.puzzle.config || {};
    }
  }
  return {};
}, type);
console.log('config:', JSON.stringify(cfg));

// ---- helpers ----
const openPuzzle = () => page.evaluate((t, c) =>
  window.G.overlay.open({ type: t, config: c, flag: 'qa.test.' + t }), type, cfg);
const clickExact = txt => page.evaluate(t => {
  const b = [...document.querySelectorAll('#puzzle-ov button')]
    .find(b => b.textContent.trim() === t && !b.disabled);
  if (b) { b.click(); return true; } return false;
}, txt);
const clickRe = src => page.evaluate(s => {
  const r = new RegExp(s, 'i');
  const b = [...document.querySelectorAll('#puzzle-ov button')]
    .find(b => r.test(b.textContent) && !b.disabled);
  if (b) { b.click(); return true; } return false;
}, src);
const has = sel => page.evaluate(s => !!document.querySelector('#puzzle-ov ' + s), sel);
const count = sel => page.evaluate(s => document.querySelectorAll('#puzzle-ov ' + s).length, sel);
const text = sel => page.evaluate(s => {
  const e = document.querySelector('#puzzle-ov ' + s); return e ? e.textContent : '';
}, sel);
const overlayOpen = () => page.evaluate(() => window.G.overlay.isOpen());
const flagSet = f => page.evaluate(x => window.G.flags.has(x), f);

// NAIVE: split every pile into equal head-count halves, critters in listed order.
async function naiveBuild() {
  for (let guard = 0; guard < 12; guard++) {
    const opened = await page.evaluate(() => {
      const l = document.querySelector('#puzzle-ov .qt-leaf.multi');
      if (!l) return false; l.click(); return true;
    });
    if (!opened) break;
    await sleep(140);
    await page.evaluate(() => {
      const picks = [...document.querySelectorAll('#puzzle-ov .qt-pick')];
      for (let i = 0; i < Math.ceil(picks.length / 2); i++) picks[i].click();
    });
    await sleep(140);
    await clickExact('Split');
    await sleep(180);
  }
}

// INFORMED: peel the likeliest critter off each remaining pile.
async function peelBuild() {
  for (const name of ['Sandmouse', 'Dune-beetle', 'Glasswing', 'Geckotail', 'Scarab']) {
    await page.evaluate(() => {
      const l = document.querySelector('#puzzle-ov .qt-leaf.multi');
      if (l) l.click();
    });
    await sleep(140);
    await page.evaluate(nm => {
      const p = [...document.querySelectorAll('#puzzle-ov .qt-pick')]
        .find(b => b.textContent.includes(nm));
      if (p) p.click();
    }, name);
    await sleep(120);
    await clickExact('Split');
    await sleep(180);
  }
}

/* ================= NAIVE RUN (must NOT complete) ================= */
console.log('\n--- NAIVE RUN (count-balanced splits) ---');
await openPuzzle();
await sleep(500);
expect('overlay opened', await overlayOpen());
expect('hook shown on first encounter', await has('.pzk-hook'));
await shot('01-hook');

await clickExact('Yes'); // the wrong prediction — welcomed, not punished
await sleep(250);
expect('hook marks the wrong pick and reveals', await has('.pzk-opt.pzk-wrong') && await has('.pzk-reveal'));
await shot('02-hook-reveal');
await clickRe('find out');
await sleep(300);
expect('round starts after hook (tree visible)', await has('.qt-leaf.multi'));
await shot('03-round-start');

// first picker: tick half, Sift should read the preview aloud (once per session)
await page.evaluate(() => document.querySelector('#puzzle-ov .qt-leaf.multi').click());
await sleep(150);
await page.evaluate(() => {
  const picks = [...document.querySelectorAll('#puzzle-ov .qt-pick')];
  for (let i = 0; i < Math.ceil(picks.length / 2); i++) picks[i].click();
});
await sleep(200);
expect('coach reads the split preview aloud in first picker', await has('.qt-picker .pzk-coach'));
const coachLine = await text('.qt-picker .pzk-ctext');
expect('read-aloud quotes the % YES preview', /% YES/.test(coachLine), coachLine.trim().slice(0, 80));
await shot('04-picker-coach');
await clickExact('Split');
await sleep(180);
await naiveBuild(); // finish the count-balanced tree

const meterTxt1 = await text('.qt-meter');
expect('naive tree complete and over par (2.81)', /2\.81/.test(meterTxt1) && /Above target/.test(meterTxt1));
expect('GATE BLOCKS: no "File the catalogue" button', !(await page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov button')].some(b => /file the catalogue/i.test(b.textContent)))));
expect('overlay still open, flag NOT set', (await overlayOpen()) && !(await flagSet('qa.test.' + type)));
expect('no hint yet after 1st failure', (await count('.qt-wrap > .pzk-coach')) === 0);
expect('codewords shown on all 6 leaves', (await count('.qt-code')) === 6);
await shot('05-naive-gate-fail');

// failure 2 -> hint 1 (mass, not head-count)
await clickExact('Clear'); await sleep(200);
await naiveBuild();
const hint1 = await text('.qt-wrap > .pzk-coach .pzk-ctext');
expect('hint 1 after 2nd failure: mass not head-count', /MASS/.test(hint1) && /head-count/.test(hint1), hint1.trim().slice(0, 70));
await shot('06-hint1');

// failure 3 -> hint 2 (peel the likeliest)
await clickExact('Clear'); await sleep(200);
await naiveBuild();
const hint2 = await text('.qt-wrap > .pzk-coach .pzk-ctext');
expect('hint 2 after 3rd failure: peel the likeliest', /peeling/i.test(hint2) && /Sandmouse/.test(hint2), hint2.trim().slice(0, 70));
await shot('07-hint2');

// failure 4 -> hint 3 (near-walkthrough)
await clickExact('Clear'); await sleep(200);
await naiveBuild();
const hint3 = await text('.qt-wrap > .pzk-coach .pzk-ctext');
expect('hint 3 after 4th failure: walkthrough with peel order', /Walk it with me/i.test(hint3) && /2\.25/.test(hint3), hint3.trim().slice(0, 70));
await shot('08-hint3');

/* ================= INFORMED RUN (must complete) ================= */
console.log('\n--- INFORMED RUN (mass-aware peel splits) ---');
await page.evaluate(() => window.G.overlay.close());
await sleep(300);
await openPuzzle();
await sleep(400);
expect('hook again (not yet taught)', await has('.pzk-hook'));
await clickExact('No'); // the right prediction
await sleep(250);
expect('right pick marked green', await has('.pzk-opt.pzk-right'));
await clickRe('find out');
await sleep(300);

// peel Sandmouse first, then screenshot the codeword appearing
await page.evaluate(() => document.querySelector('#puzzle-ov .qt-leaf.multi').click());
await sleep(150);
await page.evaluate(() => {
  const p = [...document.querySelectorAll('#puzzle-ov .qt-pick')].find(b => b.textContent.includes('Sandmouse'));
  if (p) p.click();
});
await sleep(150);
expect('coach read-aloud NOT repeated (once per session)', !(await has('.qt-picker .pzk-coach')));
await clickExact('Split');
await sleep(200);
expect('Sandmouse leaf wears codeword "1"', await page.evaluate(() =>
  [...document.querySelectorAll('#puzzle-ov .qt-leaf.single')].some(l =>
    l.textContent.includes('Sandmouse') && l.querySelector('.qt-code') && l.querySelector('.qt-code').textContent === '1')));
await shot('09-informed-first-codeword');

for (const name of ['Dune-beetle', 'Glasswing', 'Geckotail', 'Scarab']) {
  await page.evaluate(() => document.querySelector('#puzzle-ov .qt-leaf.multi').click());
  await sleep(140);
  await page.evaluate(nm => {
    const p = [...document.querySelectorAll('#puzzle-ov .qt-pick')].find(b => b.textContent.includes(nm));
    if (p) p.click();
  }, name);
  await sleep(120);
  await clickExact('Split');
  await sleep(180);
}

const meterTxt2 = await text('.qt-meter');
expect('informed tree at 2.25, under par', /2\.25/.test(meterTxt2) && /beat par/i.test(meterTxt2));
expect('meter shows avg questions = avg code length', /avg code length/.test(meterTxt2));
expect('all 6 codewords on leaves', (await count('.qt-code')) === 6);
expect('debrief card shown', await has('.pzk-debrief'));
const debriefTxt = await text('.pzk-debrief');
expect('debrief has the Huffman Wood foreshadow', /wood west of/i.test(debriefTxt) && /trails ARE the codes/.test(debriefTxt));
expect('debrief shows the head-count counterfactual (2.35)', /2\.35/.test(debriefTxt));
await shot('10-debrief');

await clickRe('^File the catalogue$');
await sleep(400);
expect('COMPLETED: overlay closed', !(await overlayOpen()));
expect('flag qa.test.question-tree set', await flagSet('qa.test.' + type));
expect('taught flag persisted', await flagSet('pz.question-tree.taught'));

/* ================= REOPEN (taught skip) ================= */
console.log('\n--- REOPEN (taught) ---');
await openPuzzle();
await sleep(400);
expect('taught reopen: hook SKIPPED, straight to the round', !(await has('.pzk-hook')) && (await has('.qt-leaf.multi')));
await page.evaluate(() => document.querySelector('#puzzle-ov .qt-leaf.multi').click());
await sleep(150);
await page.evaluate(() => document.querySelector('#puzzle-ov .qt-pick').click());
await sleep(150);
expect('taught reopen: no coach read-aloud in picker', !(await has('.qt-picker .pzk-coach')));
await shot('11-taught-reopen');
await page.evaluate(() => window.G.overlay.close());
await sleep(200);

/* ================= 420px MOBILE PASS ================= */
console.log('\n--- 420px PASS ---');
await page.setViewport({ width: 420, height: 860 });
await sleep(300);
await openPuzzle();
await sleep(400);
await peelBuild();
const fit = await page.evaluate(() => {
  const p = document.querySelector('#puzzle-ov .pz-panel').getBoundingClientRect();
  const t = document.querySelector('#puzzle-ov .qt-treebox');
  return { panelRight: Math.round(p.right), panelW: Math.round(p.width),
    docW: document.documentElement.scrollWidth, vw: innerWidth,
    treeScrollW: t.scrollWidth, treeClientW: t.clientWidth };
});
expect('420px: panel fits the viewport', fit.panelRight <= fit.vw + 1 && fit.docW <= fit.vw + 1, JSON.stringify(fit));
expect('420px: tree scrolls inside its box (no overflow)', fit.treeScrollW >= fit.treeClientW);
expect('420px: informed run still completes (debrief up)', await has('.pzk-debrief'));
await shot('12-420-complete');
await page.evaluate(() => document.querySelector('#puzzle-ov .qt-treebox').scrollTo({ left: 9999 }));
await sleep(150);
await shot('13-420-tree-scrolled');

console.log('\nerrors:', errors.length ? errors : 'none');
console.log(fails.length ? `\n${fails.length} EXPECTATION(S) FAILED:\n- ` + fails.join('\n- ') : '\nall drive expectations pass');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
