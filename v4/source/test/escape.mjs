import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(700);
for (const M of (process.argv[2] ? [+process.argv[2]] : [30, 3000, 5e5])) for (const focus of [false, true]) {
  const r = await page.evaluate(([M, focus]) => {
    const { Game: G, Player: P, Holes: Hs } = QCAT; QCAT.debug.start(0, 'lab'); Hs.clear(); P.x = 1100; P.y = 700;
    const h = Hs.add(P.x - 2.5 * QCAT.holeProps(M).rh, P.y, M, { arrive: 0 }); h.born = 1; h.tvx = h.tvy = 0; h.vx = h.vy = 0;
    QCAT.Input.down.add('KeyD'); if (focus) QCAT.Input.down.add('ShiftLeft');
    const d0 = Math.hypot(P.x - h.x, P.y - h.y); let deaths = 0; const st = G.stats.deaths;
    const t0 = performance.now(); for (let i = 0; i < 60 * 8; i++) { G.frame(1 / 60); if (performance.now() - t0 > 20000) break; }
    QCAT.Input.down.clear();
    return { M, focus, rh: Math.round(h.L.rh), d0: Math.round(d0), d8: Math.round(Math.hypot(P.x - h.x, P.y - h.y)), deaths: G.stats.deaths - st };
  }, [M, focus]);
  console.log(JSON.stringify(r));
}
await browser.close();
