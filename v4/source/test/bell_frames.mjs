import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(700);
const variants = process.argv.slice(2).length ? process.argv.slice(2) : ['plain', 'split', 'laws', 'swap', 'kill'];
for (const v of variants) {
  const r = await page.evaluate((v) => {
    const { Game: G, Director } = QCAT; QCAT.Notes.fillAll();
    QCAT.debug.start(0, 'lab'); QCAT.debug.bot(true); QCAT.debug.god();
    if (v === 'swap') { G.spawnBoss('observer', 0); for (let i = 0; i < 120; i++) G.frame(1 / 60); }
    const btn = [...document.querySelectorAll('button')].find(b => /Local Realist/.test(b.textContent)); btn.click();
    if (v === 'split') { for (const k of ['H', 'H', 'H']) G.collect({ kind: k, x: QCAT.Player.x, y: QCAT.Player.y }); }
    if (v === 'laws') QCAT.Anom.set(['entangle', 'tunnel', 'wormhole']);
    let err = null, n = 0;
    try { for (n = 0; n < 60 * 90; n++) { G.frame(1 / 60); if (v === 'split' && n % 60 === 0) { QCAT.Player.coh = 100; QCAT.Player.splitCd = 0; QCAT.Player.split(); } if (v === 'kill' && n === 600) { G.boss.hp = 1; } } }
    catch (e) { err = e.message + ' @ ' + e.stack.split('\n').slice(1, 5).join(' | '); }
    return { v, n, err, boss: G.boss && G.boss.type, atk: G.boss && G.boss.atk, grid: G.boss && G.boss.grid && G.boss.grid.join('') };
  }, v);
  console.log(JSON.stringify(r));
}
await browser.close();
