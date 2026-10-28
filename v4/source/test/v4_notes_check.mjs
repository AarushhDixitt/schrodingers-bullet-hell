import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path'; import fs from 'node:fs';
const root = path.dirname(new URL(import.meta.url).pathname);
const src = fs.readdirSync(path.join(root, '../src/js')).map(f => fs.readFileSync(path.join(root, '../src/js', f), 'utf8')).join('\n');
const browser = await chromium.launch(); const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(600);
const res = await page.evaluate(() => {
  const N = window.QCAT_NOTES || null; return null;
});
// expose via a tiny eval of the bundle's globals is not possible (IIFE); use QCAT if present
const data = await page.evaluate(() => QCAT.NOTES ? Object.entries(QCAT.NOTES).map(([id, d]) => [id, Object.entries(d.obs).map(([k, o]) => [k, o.on])]) : null);
if (!data) { console.log('QCAT.NOTES missing'); process.exit(1); }
let missing = [];
for (const [id, obs] of data) for (const [k, on] of obs) {
  if (on !== 'hook') continue;
  const [kind, key] = id.split(':');
  if (kind === 'boss' && ['window', 'phase', 'beaten'].includes(k)) continue;
  const lit = `Notes.obs('${id}', '${k}')`, dyn = kind === 'boss' ? true : false;
  if (src.includes(lit)) continue;
  if (kind === 'boss') { const has = await page.evaluate(([b, k]) => !!(QCAT.ATK_NAMES[b] && QCAT.ATK_NAMES[b][k]), [key, k]); if (has) continue; }
  if (kind === 'hole' && (src.includes(`Notes.obs('hole:' + HOLE_CLASS[h.L.cls].id, '${k}')`) || src.includes(`'hole:' + HOLE_CLASS[h.L.cls].id, '${k}'`))) continue;
  if (kind === 'enemy' && src.includes(`Notes.obs('enemy:' + e.type, '${k}')`) ) continue;
  if (kind === 'enemy' && src.includes(`Notes.obs('enemy:' + p.type, '${k}')`) ) continue;
  missing.push(id + ' → ' + k);
}
console.log('subjects', data.length, 'missing hooks:', missing.length ? '\n  ' + missing.join('\n  ') : 'none');
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
