import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const sizes = JSON.parse(process.argv[2] || '[[1276,636,1.5,0],[1440,900,1,0],[1024,600,1,0],[800,700,1,0],[700,560,1,0],[390,844,2,1],[844,390,2,1],[360,640,2,1]]');
const screens = process.argv[3] ? process.argv[3].split(',') : ['scr-title'];
for (const [w, h, dpr, touch] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: !!touch, isMobile: !!touch });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('qcat:quality', '"low"'); localStorage.setItem('qcat:best', '123456'); localStorage.setItem('qcat:bestWave', '7'); } catch (e) {} });
  await page.goto('file://' + path.join(root, 'harness.html'));
  await page.waitForTimeout(900);
  for (const id of screens) {
    const r = await page.evaluate((id) => {
      if (id === 'scr-over') { QCAT.debug.start(3); QCAT.Game.lives = 1; QCAT.debug.ff(2); const P = QCAT.Player; P.invuln = 0; P.measureHit(P.branches.slice(), 'bullet'); QCAT.debug.ff(4); }
      if (id === 'scr-pause') { QCAT.debug.start(3); QCAT.debug.ff(1); QCAT.UI.pause(); }
      const el = document.getElementById(id);
      const card = el.firstElementChild; const r = card.getBoundingClientRect(); return { id, overflowY: el.scrollHeight - el.clientHeight, overflowX: el.scrollWidth - el.clientWidth, cardRight: Math.round(r.right), vw: innerWidth };
    }, id);
    console.log(`${w}x${h}@${dpr}${touch ? ' touch' : ''}`, JSON.stringify(r));
    await page.screenshot({ path: path.join(root, 'shots', `lay_${id}_${w}x${h}.png`) });
  }
  if (errors.length) console.log('ERR', errors);
  await ctx.close();
}
await browser.close();
