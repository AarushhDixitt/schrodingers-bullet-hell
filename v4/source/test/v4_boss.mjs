// force every extra attack on every boss in the lab; check for errors; screenshot a few
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(700);
await page.evaluate(() => { QCAT.debug.start(0, 'lab'); QCAT.debug.god(); });
const shots = new Set(process.argv.slice(2));
const list = await page.evaluate(() => Object.entries(QCAT.BOSS_DEFS).map(([k, D]) => [k, (D.extra || []).map(x => x.id)]));
for (const [boss, extras] of list) {
  for (const id of extras) {
    const r = await page.evaluate(([boss, id]) => {
      const G = QCAT.Game; G.removeBoss(); const b = G.spawnBoss(boss, 0); QCAT.Director.phase = 'boss'; b.phase = 2;
      if (QCAT.BOSS_DEFS[boss].pool) { b.atk = null; b.queue = [id]; }
      else if (boss === 'die') { b.state = 'roll'; b.st = 0.05; } 
      QCAT.debug.ff(boss === 'apparatus' ? 12 : 3.2, false);
      const res = { boss, id, atk: b.atk, eb: QCAT.EB.n, en: G.enemies.length };
      if (boss === 'bell') { const D = QCAT.BOSS_DEFS.bell; for (const [s0, s1] of [[0,0],[0,1],[1,0],[1,1]]) { b.set = [s0, s1]; D.probe(b, 0); D.probe(b, 1); } res.grid = b.grid.join(''); res.viol = b.violT > 0; }
      G.render(); return res;
    }, [boss, id]);
    console.log(JSON.stringify(r));
    if (shots.has(boss + ':' + id) || shots.has('all')) await page.screenshot({ path: path.join(root, 'shots', 'x_' + boss + '_' + id + '.png') });
  }
}
console.log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
