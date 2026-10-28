import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.type() + ': ' + m.text().slice(0, 600)); });
page.on('pageerror', e => errs.push('pageerror ' + e.message));
await page.goto('file://' + path.join(root, '..', 'dist', 'schrodinger.html')); await page.waitForTimeout(700);
await page.mouse.click(400, 250);
console.log(await page.evaluate(() => { QCAT.Audio2.init(); QCAT.Settings.music = true; QCAT.Settings.sound = true; QCAT.Settings.voice = true; QCAT.Notes.fillAll(); QCAT.Calib.toggle(); QCAT.debug.start(0, 'lab'); return JSON.stringify({ ready: QCAT.Audio2.ready, st: QCAT.Audio2.ctx && QCAT.Audio2.ctx.state }); }));
await page.waitForTimeout(800);
await page.evaluate(() => { const b = [...document.querySelectorAll('#lab button')].find(b => /Local Realist/.test(b.textContent)); b.click(); for (let k = 0; k < 3; k++) QCAT.Game.collect({ kind: 'H', x: QCAT.Player.x, y: QCAT.Player.y }); });
for (let i = 0; i < 8; i++) { await page.waitForTimeout(2000); const st = await page.evaluate(() => ({ t: QCAT.Game.boss && +QCAT.Game.boss.t.toFixed(1), atk: QCAT.Game.boss && QCAT.Game.boss.atk, track: QCAT.Audio2.trackId, toast: document.getElementById('toast').textContent.slice(0, 160) })); console.log(JSON.stringify(st), errs.splice(0).join(' || ')); }
await browser.close();
