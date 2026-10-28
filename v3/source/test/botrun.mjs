// autopilot runs on several difficulties: how far, how long per boss
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(800);
for (const diff of (process.env.DIFFS || 'highschool,graduate,reviewer2').split(',')) {
  const r = await page.evaluate(d => {
    QCAT.debug.bot(true); QCAT.debug.start(1, 'arcade', { variant: 'campaign', diff: d });
    const bossT = {}; let cur = null, t0 = 0, lastW = 0;
    for (let k = 0; k < 2400; k++) {
      const s = QCAT.debug.ff(1, false);
      const b = QCAT.Game.boss;
      if (b && !b.dead && cur !== b.type) { cur = b.type; t0 = QCAT.Game.stats.time; }
      if (cur && (!b || b.dead)) { bossT[cur] = Math.round(QCAT.Game.stats.time - t0) + 's ' + Math.round(100 * (QCAT.Game.stats.lastWin || 0)) + '%' ; cur = null; }
      if (QCAT.Game.state !== 'playing') break;
    }
    return { diff: d, state: QCAT.Game.state, wave: QCAT.Game.wave, lives: QCAT.Game.lives, time: Math.round(QCAT.Game.stats.time), deaths: QCAT.Game.stats.deaths, bossT, perfect: QCAT.Game.stats.perfect, elites: QCAT.Game.stats.eliteKills };
  }, diff);
  console.log(JSON.stringify(r));
}
console.log('ERRORS:', errors.length ? errors.slice(0, 10).join('\n') : 'none');
await browser.close();
