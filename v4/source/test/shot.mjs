// Headless playtest: load the page, drive scenarios, capture screenshots and errors.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const out = process.env.OUT || path.join(root, 'shots');
import fs from 'node:fs';
fs.mkdirSync(out, { recursive: true });

const scenario = process.argv[2] || 'title';
const W = +(process.env.VW || 1440), H = +(process.env.VH || 900);

const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR || 1), hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await page.addInitScript(() => { window.__QCAT_PRESERVE = true; });
await page.goto('file://' + path.join(root, 'harness.html'));
await page.waitForTimeout(1200);

const snap = async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); console.log('shot', name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

async function runFor(ms) { await page.waitForTimeout(ms); }

if (scenario === 'title') {
  await runFor(2500); await snap('title');
} else if (scenario === 'wave') {
  const wave = +(process.argv[3] || 1);
  const secs = +(process.argv[4] || 8);
  const speed = +(process.env.SPEED || 1);
  await ev(([w, s]) => { QCAT.debug.start(w); QCAT.debug.bot(true); QCAT.debug.god(!!window.__god); QCAT.debug.speed(s); QCAT.debug.fps(true); }, [wave, speed]);
  if (process.env.GOD) await ev(() => QCAT.debug.god(true));
  const n = +(process.env.SHOTS || 3);
  for (let k = 0; k < n; k++) { await runFor(secs * 1000 / n); await snap(`w${wave}_${k}`); }
  const st = await ev(() => ({ wave: QCAT.Game.wave, score: QCAT.Game.score, lives: QCAT.Game.lives, en: QCAT.Game.enemies.length, eb: QCAT.Bullets.en, pb: QCAT.Bullets.pn, state: QCAT.Game.state, phase: QCAT.Director.phase, n: QCAT.Player.n, fx: QCAT.FX.n, frame: QCAT.R.frameMs.toFixed(1), stats: { ...QCAT.Game.stats, anomsSeen: undefined } }));
  console.log(JSON.stringify(st));
} else if (scenario === 'lab') {
  const anoms = (process.argv[3] || '').split(',').filter(Boolean);
  await ev((a) => { QCAT.debug.start(0, 'lab'); QCAT.debug.bot(true); QCAT.debug.anom(a); QCAT.debug.fps(true); }, anoms);
  await runFor(600);
  await ev(() => { for (let k = 0; k < 3; k++) QCAT.Game.queueSpawn(['electron', 'proton', 'turret'][k], 400 + k * 500, 300); });
  const n = +(process.env.SHOTS || 2);
  for (let k = 0; k < n; k++) { await runFor(+(process.env.MS || 2500)); await snap(`lab_${anoms.join('-') || 'none'}_${k}`); }
} else if (scenario === 'boss') {
  const k = process.argv[3] || 'observer';
  const secs = +(process.argv[4] || 10);
  await ev((kk) => { QCAT.debug.start(1, 'lab'); QCAT.debug.bot(true); QCAT.debug.fps(true); QCAT.debug.boss(kk); }, k);
  if (process.env.GOD) await ev(() => QCAT.debug.god(true));
  const n = +(process.env.SHOTS || 3);
  for (let i = 0; i < n; i++) { await runFor(secs * 1000 / n); await snap(`boss_${k}_${i}`); }
  const st = await ev(() => { const b = QCAT.Game.boss; return b ? { hp: b.hp | 0, max: b.maxHp, phase: b.phase, atk: b.atk || b.state, dead: b.dead } : null; });
  console.log(JSON.stringify(st));
} else if (scenario === 'eval') {
  const code = process.argv[3];
  const r = await page.evaluate(code);
  console.log(JSON.stringify(r));
  await runFor(+(process.env.MS || 1500)); await snap('eval');
}
console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 30).join('\n') : 'none');
await browser.close();
