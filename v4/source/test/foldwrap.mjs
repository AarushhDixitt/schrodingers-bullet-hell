import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
page.on('console', m => { if (m.type() === 'error') console.log('console: ' + m.text().slice(0, 300)); });
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(700);

const step = async (js) => page.evaluate(js);
await step(() => { const { Game: G, Player: P } = QCAT; QCAT.debug.start(0, 'lab'); QCAT.debug.god(); QCAT.Anom.set(['tunnel']); P.x = 2185; P.y = 700; for (let i = 0; i < 20; i++) G.frame(1 / 60); for (let k = 0; k < 4; k++) { P.coh = 100; P.splitCd = 0; P.split(); for (let i = 0; i < 40; i++) G.frame(1 / 60); } });
const r = await step(() => { const { Game: G, Player: P } = QCAT; const out = { before: [Math.round(P.x), Math.round(P.y)], br: P.branches.map(b => [Math.round(b.ox), Math.round(b.px)]).sort((a,b)=>b[0]-a[0]).slice(0,4) };
  P.steer = [1, 0]; P.foldCd = 0; out.ok = P.fold(); out.to = P.foldTo;
  for (let i = 0; i < 30; i++) { P.steer = [1, 0]; G.frame(1 / 60); }
  out.after = [Math.round(P.x), Math.round(P.y)]; out.cam = [Math.round(QCAT.cam.x), Math.round(QCAT.cam.y)]; return out; });
console.log(JSON.stringify(r));
await browser.close();
