import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path'; import fs from 'node:fs';
const root = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(root, 'shots'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +(process.env.VW||1280), height: +(process.env.VH||800) } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack||'').split('\n').slice(1,3).join(' | ')));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.addInitScript(() => { window.__QCAT_PRESERVE = true; localStorage.setItem('qcat:quality', '"high"'); });
await page.goto('file://' + path.join(root, 'harness.html'));
await page.waitForTimeout(1000);
const steps = JSON.parse(process.argv[2]);
for (const s of steps) {
  if (s.js) { const r = await page.evaluate(s.js); if (r !== undefined) console.log('js:', JSON.stringify(r)); }
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.shot) { await page.screenshot({ path: path.join(out, s.shot + '.png') }); console.log('shot', s.shot); }
}
console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 20).join('\n') : 'none');
await browser.close();
