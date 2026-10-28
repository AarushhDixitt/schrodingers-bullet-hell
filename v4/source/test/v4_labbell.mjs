import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('file://' + path.join(root, '..', 'dist', 'schrodinger.html')); await page.waitForTimeout(1500);
await page.evaluate(() => { QCAT.Notes.fillAll(); QCAT.debug.start(0, 'lab'); QCAT.debug.bot(true); });
await page.waitForTimeout(800);
// click the Local Realist button in the lab panel
const btns = await page.$$eval('button', bs => bs.map(b => b.textContent.trim()).filter(t => /Realist|Observer/.test(t)));
console.log('buttons', btns);
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /Local Realist/.test(b.textContent)); b && b.click(); });
for (let i = 0; i < 14; i++) { await page.waitForTimeout(2500); const s = await page.evaluate(() => ({ boss: QCAT.Game.boss && QCAT.Game.boss.type, atk: QCAT.Game.boss && QCAT.Game.boss.atk, t: QCAT.Game.boss && +QCAT.Game.boss.t.toFixed(1), toast: document.getElementById('toast') && document.getElementById('toast').textContent })); console.log(JSON.stringify(s)); }
await page.screenshot({ path: path.join(root, 'shots', 'labbell.png') });
console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 8).join('\n') : 'none');
await browser.close();
