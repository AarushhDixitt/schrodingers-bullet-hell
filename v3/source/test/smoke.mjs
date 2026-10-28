// Smoke test: every campaign wave, every law, every boss, some endless and rush, under the autopilot.
// Usage: node test/smoke.mjs [quick]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const quick = process.argv[2] === 'quick';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.addInitScript(() => { window.__QCAT_PRESERVE = true; try { localStorage.setItem('qcat:quality', '"low"'); } catch (e) {} });
await page.goto('file://' + path.join(root, 'harness.html'));
await page.waitForTimeout(900);
const ev = (f, a) => page.evaluate(f, a);
const t0 = Date.now();
const res = {};
// campaign waves
const waves = quick ? [1, 3, 4, 8, 12, 16, 20, 24, 28, 32, 35, 36] : Array.from({ length: 36 }, (_, i) => i + 1);
for (const n of waves) {
  const r = await ev(n => { const Q = QCAT; Q.debug.start(n, 'arcade', { variant: 'campaign', diff: 'graduate' }); Q.debug.bot(true); Q.debug.god(true); const out = Q.debug.ff(n % 4 === 0 ? 30 : 22, false); out.boss = Q.Game.boss ? Math.round(100 * Q.Game.boss.hp / Q.Game.boss.maxHp) : null; return out; }, n);
  res['w' + n] = `${r.phase} en=${r.en} eb=${r.eb} n=${r.n}${r.boss !== null ? ' boss%=' + r.boss : ''} ${r.ms}ms`;
}
// every law in the lab with a mixed crowd
const laws = await ev(() => QCAT.Anom && Object.keys(QCAT.ANOMS));
for (const id of laws) {
  const r = await ev(id => { const Q = QCAT; Q.debug.start(0, 'lab'); Q.debug.bot(true); Q.debug.god(true); Q.Anom.set([id]); for (const g of ['electrons', 'protons', 'tachyons', 'turret', 'atom', 'physicists']) { const G = Q.GROUPS[g]; G && G.spawn(Q.Game.farPoint(300, 100)); } return Q.debug.ff(8, false); }, id);
  res['law ' + id] = `en=${r.en} eb=${r.eb} ${r.ms}ms`;
}
// every boss, all phases
const bosses = await ev(() => Object.keys(QCAT.BOSS_DEFS));
for (const k of bosses) {
  const r = await ev(k => { const Q = QCAT; Q.debug.start(0, 'lab'); Q.debug.bot(true); Q.debug.god(true); Q.debug.boss(k); const b = Q.Game.boss; const a = Q.debug.ff(12, false); b.hp = b.maxHp * 0.45; const c = Q.debug.ff(10, false); b.hp = b.maxHp * 0.2; const d = Q.debug.ff(12, false); return { ph: b.phase, eb: d.eb, ms: a.ms + c.ms + d.ms }; }, k);
  res['boss ' + k] = JSON.stringify(r);
}
// endless and rush samples
for (const [v, n] of [['endless', 1], ['endless', 5], ['endless', 12], ['endless', 25], ['endless', 40], ['rush', 1], ['rush', 10]]) {
  const r = await ev(([v, n]) => { const Q = QCAT; Q.debug.start(1, 'arcade', { variant: v, diff: 'graduate' }); Q.Director.start(n); Q.debug.bot(true); Q.debug.god(true); return Q.debug.ff(20, false); }, [v, n]);
  res[v + n] = `${r.phase} wave=${r.wave} en=${r.en} eb=${r.eb} ${r.ms}ms`;
}
// render one frame of each screen state
await ev(() => { QCAT.debug.god(false); QCAT.debug.bot(false); QCAT.UI.toTitle(); QCAT.debug.ff(1); });
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(22), v);
console.log('total', ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log('ERRORS:', errors.length ? '\n' + [...new Set(errors)].slice(0, 30).join('\n') : 'none');
await browser.close();
