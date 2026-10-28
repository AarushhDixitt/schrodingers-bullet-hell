import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(700);
const r = await page.evaluate(() => {
  const { Game: G, Director } = QCAT, out = {};
  QCAT.UI.start(1, 'arcade', { diff: 'undergrad' }); QCAT.debug.god();
  G.removeBoss(); const b = G.spawnBoss('observer', 0); Director.phase = 'boss';
  const BKh = (d) => QCAT.BOSS_DEFS.observer.extra.map(x => x.diff);
  out.diffs = BKh();
  QCAT.debug.ff(5, false);
  // a summoned enemy killed
  const hp0 = b.hp; const e = G.addEnemy('electron', b.x + 100, b.y); e.summoner = b; G.killEnemy(e, 'shot'); out.summonHurt = +(1 - b.hp / hp0).toFixed(4);
  b.t = 1000; QCAT.debug.ff(20, false); out.feed = QCAT.Feed.L.map(l => l.text); out.learnt = !!b.learnt;
  return out;
});
console.log(JSON.stringify(r)); console.log('ERRORS:', errors.join('\n') || 'none'); await browser.close();
