import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(700);
for (const [wrap, nq] of [[false, 4], [true, 1], [true, 2], [true, 4]]) {
  const r = await page.evaluate(([wrap, nq]) => {
    const { Game: G, Player: P } = QCAT; QCAT.debug.start(0, 'lab'); QCAT.debug.god(); if (wrap) QCAT.Anom.set(['tunnel']); P.x = 2170; P.y = 700;
    for (let k = 0; k < nq; k++) { P.coh = 100; P.splitCd = 0; P.split(); for (let i = 0; i < 20; i++) G.frame(1 / 60); }
    const t0 = performance.now(); for (let i = 0; i < 10; i++) G.frame(1 / 60); const t1 = performance.now();
    const t2 = performance.now(); for (let i = 0; i < 10; i++) G.render(); const t3 = performance.now();
    return { wrap, nq: P.nq, frame: ((t1 - t0) / 10).toFixed(1), render: ((t3 - t2) / 10).toFixed(1) };
  }, [wrap, nq]);
  console.log(JSON.stringify(r));
}
await browser.close();
