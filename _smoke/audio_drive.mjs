import puppeteer from 'puppeteer-core';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(join(__dirname, 'audio_test.html')).href;

const pageErrors = [];
let consoleErrors = [];

const browser = await puppeteer.launch({
  channel: 'chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('error', (err) => pageErrors.push('crash: ' + String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(pageUrl, { waitUntil: 'load' });

  // Run long enough to finish: 18 sfx * 150ms (~2.7s) + 9 music * 1.5s (~13.5s)
  // + the final music(null)/DONE step. ~17.5s covers it with margin.
  await new Promise((r) => setTimeout(r, 17500));

  const title = await page.title();
  const logText = await page.$eval('#log', (el) => el.textContent).catch(() => '');
  const lastLines = logText.trim().split('\n').slice(-6).join('\n');

  console.log('--- page title:', title);
  console.log('--- last log lines:\n' + lastLines);
  console.log('--- pageErrors:', pageErrors.length);
  pageErrors.forEach((e) => console.log('    ' + e));
  console.log('--- consoleErrors:', consoleErrors.length);
  consoleErrors.forEach((e) => console.log('    ' + e));

  const titleOk = !/^ERROR/.test(title);
  const sawDone = /DONE/.test(logText);
  const ok = pageErrors.length === 0 && titleOk && sawDone;

  if (ok) {
    console.log('\nRESULT: PASS (zero pageerrors, title clean, sequence completed)');
    process.exit(0);
  } else {
    console.log('\nRESULT: FAIL');
    if (!titleOk) console.log('  reason: document.title indicates an error');
    if (!sawDone) console.log('  reason: sequence did not reach DONE');
    if (pageErrors.length) console.log('  reason: pageerrors present');
    process.exit(1);
  }
} finally {
  await browser.close();
}
