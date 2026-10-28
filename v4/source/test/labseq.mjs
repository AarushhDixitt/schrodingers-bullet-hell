import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 400)); });
page.on('pageerror', e => errs.push('pageerror ' + e.message));
await page.goto('file://' + path.join(root, '..', 'dist', 'schrodinger.html')); await page.waitForTimeout(700);
await page.evaluate(() => { QCAT.Notes.fillAll(); QCAT.Calib.toggle(); QCAT.debug.start(0, 'lab'); QCAT.debug.god(); });
await page.waitForTimeout(500);
const names = await page.$$eval('button', bs => bs.map(b => b.textContent.trim()).filter(t => /^The |Maxwell|Laplace|Three|Schr/.test(t)));
console.log(names.join(' | '));
for (const n of [...names, 'The Local Realist']) {
  await page.evaluate(n => { const b = [...document.querySelectorAll('#lab button')].find(b => b.textContent.trim() === n); b && b.click(); }, n);
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => ({ boss: QCAT.Game.boss && QCAT.Game.boss.type, toast: document.getElementById('toast').textContent.slice(0, 120) }));
  console.log(n, JSON.stringify(st), errs.length ? errs.splice(0).join(' || ') : '');
}
await browser.close();
