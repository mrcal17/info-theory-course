// Smoke test: boot Signal Lost in jsdom, open every station, render every game.
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(here, '..', 'game', 'index.html');

const ALL_IDS = ['entropy-hunt','kl-detective','huffman-forge','noisy-uplink',
  'syndrome','kelly-casino','be-the-model','last-transmission'];

function tick(ms = 60) { return new Promise(r => setTimeout(r, ms)); }

let failures = 0;
function check(cond, label) {
  if (cond) { console.log('  ok  ' + label); }
  else { failures++; console.log('  FAIL ' + label); }
}

import fs from 'node:fs';

function buildInlineHtml() {
  const gameDir = path.join(here, '..', 'game');
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(/<script defer src="([^"]+)"><\/script>/g, (m, src) => {
    const js = fs.readFileSync(path.join(gameDir, src), 'utf8');
    if (js.includes('</script')) throw new Error('script-closing tag inside ' + src);
    return '<script>\n' + js + '\n</script>';
  });
  if (html.includes('script defer')) throw new Error('unreplaced script tag');
  return html;
}

async function boot(seedStars) {
  const errors = [];
  const dom = new JSDOM(buildInlineHtml(), {
    url: 'https://localhost/game/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.confirm = () => true;
      if (seedStars) {
        try {
          const stars = {}, bits = {};
          for (const id of ALL_IDS) { stars[id] = 3; bits[id] = 50; }
          window.localStorage.setItem('signal-lost-v1', JSON.stringify({ stars, bits, muted: true }));
        } catch (e) { errors.push('localStorage seed failed: ' + e); }
      } else {
        try { window.localStorage.clear(); } catch (e) {}
      }
      window.addEventListener('error', ev => errors.push(String(ev.error || ev.message)));
    },
  });
  await new Promise(r => dom.window.addEventListener('load', r));
  await tick(150);
  return { dom, errors };
}

function pressEscape(window) {
  window.document.dispatchEvent(new window.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

console.log('--- fresh state: title, map, locking ---');
{
  const { dom, errors } = await boot(false);
  const { window } = dom;
  const doc = window.document;
  check(doc.querySelector('.title-main')?.textContent === 'SIGNAL LOST', 'title screen renders');
  doc.querySelector('.title-screen .btn-primary').click();
  await tick();
  const nodes = doc.querySelectorAll('.node');
  check(nodes.length === 8, '8 station nodes on the map (got ' + nodes.length + ')');
  const locked = doc.querySelectorAll('.node.locked');
  check(locked.length === 6, '6 locked with fresh save (got ' + locked.length + ')');
  // first node opens briefing → begin renders the game
  doc.querySelector('.node:not(.locked)').click();
  await tick();
  check(!!doc.querySelector('.briefing'), 'briefing opens for unlocked node');
  doc.querySelector('.b-actions .btn-primary').click();
  await tick(200);
  check(!!doc.querySelector('.game-root') && doc.querySelector('.game-root').children.length > 0
    && !doc.querySelector('.crash-note'), 'first game renders without crash');
  pressEscape(window);
  await tick();
  check(!!doc.querySelector('.map'), 'Escape returns to map');
  check(errors.length === 0, 'no page errors (' + errors.join(' | ') + ')');
  window.close();
}

console.log('--- seeded state: all 8 games mount and tear down ---');
{
  const { dom, errors } = await boot(true);
  const { window } = dom;
  const doc = window.document;
  doc.querySelector('.title-screen .btn-primary').click();
  await tick();
  check(doc.querySelectorAll('.node.locked').length === 0, 'all stations unlocked with seeded save');
  const titles = [...doc.querySelectorAll('.node .n-title')].map(n => n.textContent);
  for (let i = 0; i < 8; i++) {
    const node = [...doc.querySelectorAll('.node')][i];
    const title = titles[i];
    node.click();
    await tick();
    const begin = doc.querySelector('.b-actions .btn-primary');
    if (!begin) { failures++; console.log('  FAIL briefing missing for ' + title); continue; }
    begin.click();
    await tick(350); // let any intro timers fire
    const root = doc.querySelector('.game-root');
    const crashed = doc.querySelector('.crash-note');
    check(root && root.children.length > 0 && !crashed,
      'mounts: ' + title + (crashed ? ' [CRASH: ' + crashed.textContent.slice(0, 160) + ']' : ''));
    pressEscape(window); // exits play → destroy() runs
    await tick(120);
    check(!!doc.querySelector('.map'), 'unmounts cleanly: ' + title);
  }
  await tick(800); // any stray game timers firing post-destroy would throw here
  check(errors.length === 0, 'no page errors across all mounts' + (errors.length ? ' → ' + errors.join(' | ').slice(0, 400) : ''));
  window.close();
}

console.log(failures === 0 ? '\nSMOKE PASS' : '\nSMOKE FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
