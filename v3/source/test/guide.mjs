import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h, dpr, touch] of JSON.parse(process.argv[2] || '[[1276,636,1.5,0],[390,780,2,1]]')) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: !!touch, isMobile: !!touch });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.addInitScript(() => { try { localStorage.setItem('qcat:quality', '"low"'); } catch (e) {} });
  await page.goto('file://' + path.join(root, 'harness.html'));
  await page.waitForTimeout(900);
  await page.click('#b-guide');
  for (const tab of ['idea', 'screen', 'beasts', 'laws', 'bosses', 'meta']) {
    await page.click('#tab-' + tab);
    await page.waitForTimeout(tab === 'beasts' || tab === 'bosses' ? 1400 : 700);
    const m = await page.evaluate((t) => { const el = document.getElementById('tp-' + t); return { scrollH: el.scrollHeight, clientH: el.clientHeight }; }, tab);
    console.log(`${w}x${h} tab ${tab}`, JSON.stringify(m));
    await page.screenshot({ path: path.join(root, 'shots', `guide_${tab}_${w}.png`) });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  console.log('after Esc, title visible:', await page.evaluate(() => !document.getElementById('scr-title').hidden && document.getElementById('scr-guide').hidden));
  if (errors.length) console.log('ERR', errors);
  await ctx.close();
}
await browser.close();
