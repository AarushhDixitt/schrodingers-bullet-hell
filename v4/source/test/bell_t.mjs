import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
page.on('console', m => { if (m.type() === 'error') console.log('console: ' + m.text().slice(0, 300)); });
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(700);
const v = process.argv[2] || 'plain';
await page.evaluate((v) => { const { Game: G } = QCAT; QCAT.Notes.fillAll(); QCAT.debug.start(0, 'lab'); QCAT.debug.bot(true); QCAT.debug.god();
  if (v === 'swap') { G.spawnBoss('observer', 0); QCAT.Director.phase = 'boss'; for (let i = 0; i < 300; i++) G.frame(1 / 60); }
  if (v === 'mortal') QCAT.debug.god(false);
  if (v === 'calib') { QCAT.Calib.toggle(); QCAT.Calib.v.boss = true; G.removeBoss(); G.spawnBoss('bell', 0); QCAT.Director.phase = 'boss'; }
  else { const btn = [...document.querySelectorAll('button')].find(b => /Local Realist/.test(b.textContent)); btn.click(); }
  if (v === 'laws') QCAT.Anom.set(['entangle', 'tunnel', 'wormhole', 'planck']);
  if (v === 'split') for (let k = 0; k < 3; k++) G.collect({ kind: 'H', x: QCAT.Player.x, y: QCAT.Player.y }); }, v);
for (let s = 0; s < (+process.argv[3] || 60); s++) {
  const r = await page.evaluate(() => { const G = QCAT.Game, t0 = performance.now(); let err = null; try { for (let n = 0; n < 60; n++) { G.frame(1 / 60); if (n % 30 === 0 && QCAT.Player.nq < 4) { QCAT.Player.coh = 100; QCAT.Player.splitCd = 0; QCAT.Player.split(); } } } catch (e) { err = e.message + ' @ ' + e.stack.split('\n').slice(1, 4).join(' | '); } return { ms: Math.round(performance.now() - t0), err, atk: G.boss && G.boss.atk, t: G.boss && +G.boss.t.toFixed(1), en: G.enemies.length, eb: QCAT.EB.n }; });
  if (true) console.log(JSON.stringify(r)); if (r.err) break;
}
await browser.close();
