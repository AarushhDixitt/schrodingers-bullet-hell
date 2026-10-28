import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1276, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.join(root, 'harness.html'));
await page.waitForTimeout(900);
await page.click('#b-guide');
for (const [tab, frac] of [['beasts', 0.45], ['bosses', 0.35], ['bosses', 0.7]]) {
  await page.click('#tab-' + tab);
  await page.evaluate(([t, f]) => { const el = document.getElementById('tp-' + t); el.scrollTop = el.scrollHeight * f; }, [tab, frac]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(root, 'shots', `guide2_${tab}_${frac}.png`) });
}
console.log('ERR', errors);
await browser.close();
