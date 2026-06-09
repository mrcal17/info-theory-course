// End-to-end playthrough of "Be the Model": brute-force the key grid until
// both passages finish, then verify the ENGINE debrief renders and persists.
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const gameDir = path.join(here, '..', 'game');

let html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
html = html.replace(/<script defer src="([^"]+)"><\/script>/g, (m, src) =>
  '<script>\n' + fs.readFileSync(path.join(gameDir, src), 'utf8') + '\n</script>');

const errors = [];
const dom = new JSDOM(html, {
  url: 'https://localhost/game/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.confirm = () => true;
    const stars = {}, bits = {};
    for (const id of ['entropy-hunt','kl-detective','huffman-forge','noisy-uplink','syndrome','kelly-casino','be-the-model','last-transmission']) { stars[id] = 1; bits[id] = 10; }
    window.localStorage.setItem('signal-lost-v1', JSON.stringify({ stars, bits, muted: true }));
    window.addEventListener('error', ev => errors.push(String(ev.error || ev.message)));
  },
});
const { window } = dom;
const doc = window.document;
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));

await new Promise(r => window.addEventListener('load', r));
await tick(150);

doc.querySelector('.title-screen .btn-primary').click();
await tick();
const node = [...doc.querySelectorAll('.node')].find(n => n.querySelector('.n-title').textContent === 'Be the Model');
node.click();
await tick();
doc.querySelector('.b-actions .btn-primary').click();
await tick(300);

let clicks = 0;
for (let step = 0; step < 4000 && !doc.querySelector('.overlay'); step++) {
  const keys = [...doc.querySelectorAll('.bm-key')].filter(k => !k.classList.contains('bm-dead') && !k.disabled);
  if (!keys.length) { // between-passage button or pending timer
    const btn = [...doc.querySelectorAll('.game-root button')].find(b => !b.disabled && !b.classList.contains('bm-key'));
    if (btn) btn.click();
    await tick(200);
    continue;
  }
  // frequency-ordered guessing, space first (decent simulated player)
  const order = ' etaoinsrhldcumfpgwybvkxjqz';
  keys.sort((a, b) => order.indexOf(a.textContent === '␣' ? ' ' : a.textContent.toLowerCase()) - order.indexOf(b.textContent === '␣' ? ' ' : b.textContent.toLowerCase()));
  keys[0].click();
  clicks++;
  await tick(15);
}

const ov = doc.querySelector('.overlay');
console.log('clicks made:', clicks);
console.log('debrief shown:', !!ov);
if (ov) {
  console.log('stars row:', ov.querySelector('.d-stars')?.textContent);
  console.log('headline:', ov.querySelector('.d-headline')?.textContent);
  console.log('bits line:', ov.querySelector('.d-bits')?.textContent.trim());
  console.log('concept box:', !!ov.querySelector('.concept-box'));
  console.log('learn link:', ov.querySelector('.d-learn')?.getAttribute('href'));
  // replay seam: click Replay → fresh mount
  [...ov.querySelectorAll('button')].find(b => b.textContent.includes('Replay')).click();
  await tick(250);
  console.log('replay remounts game:', !!doc.querySelector('.game-root') && doc.querySelector('.game-root').children.length > 0 && !doc.querySelector('.overlay'));
  // persistence: best bits recorded
  const saved = JSON.parse(window.localStorage.getItem('signal-lost-v1'));
  console.log('saved be-the-model:', JSON.stringify({ stars: saved.stars['be-the-model'], bits: saved.bits['be-the-model'] }));
}
console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
window.close();
process.exit(ov && errors.length === 0 ? 0 : 1);
