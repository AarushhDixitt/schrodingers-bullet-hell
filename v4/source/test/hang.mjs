import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(700);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Debugger.enable');
cdp.on('Debugger.paused', async ev => {
  console.log('PAUSED at:'); for (const f of ev.callFrames.slice(0, 12)) console.log('  ', f.functionName || '(anon)', 'line', f.location.lineNumber + 1, 'col', f.location.columnNumber);
  // evaluate some locals in top frame
  for (const f of ev.callFrames.slice(0, 3)) for (const sc of f.scopeChain.slice(0, 1)) { const p = await cdp.send('Runtime.getProperties', { objectId: sc.object.objectId, ownProperties: true }); console.log('   scope', f.functionName, p.result.slice(0, 14).map(x => x.name + '=' + (x.value && (x.value.value ?? x.value.description))).join(', ')); }
  process.exit(0);
});
const run = page.evaluate(() => { const { Game: G } = QCAT; QCAT.Notes.fillAll(); QCAT.debug.start(0, 'lab'); QCAT.debug.bot(true); QCAT.debug.god();
  const btn = [...document.querySelectorAll('button')].find(b => /Local Realist/.test(b.textContent)); btn.click();
  for (let n = 0; n < 60 * 40; n++) { G.frame(1 / 60); if (n % 30 === 0 && QCAT.Player.nq < 4) { QCAT.Player.coh = 100; QCAT.Player.splitCd = 0; QCAT.Player.split(); } }
  return 'finished'; }).then(r => { console.log(r); process.exit(0); });
await new Promise(r => setTimeout(r, 75000));
console.log('pausing'); await cdp.send('Debugger.pause');
await new Promise(r => setTimeout(r, 15000)); console.log('no pause event'); process.exit(1);
