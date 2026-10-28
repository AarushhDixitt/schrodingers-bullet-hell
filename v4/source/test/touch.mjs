import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => { try { localStorage.setItem('qcat:quality', '"low"'); } catch (e) {} });
await page.goto('file://' + path.join(root, 'harness.html'));
await page.waitForTimeout(1000);
await page.tap('#b-start');
await page.waitForTimeout(500);
const s0 = await page.evaluate(() => ({ state: QCAT.Game.state, touch: QCAT.Input.touchMode, touchUI: !document.getElementById('touch').hidden, x: QCAT.Player.x | 0, n: QCAT.Player.n }));
console.log('after start:', JSON.stringify(s0));
// drag on the left half using CDP touch events
const cdp = await ctx.newCDPSession(page);
const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
await touch('touchStart', [{ x: 100, y: 600, id: 1 }]);
for (let k = 1; k <= 8; k++) { await touch('touchMove', [{ x: 100 + k * 8, y: 600, id: 1 }]); await page.waitForTimeout(60); }
await page.waitForTimeout(1200);
const s1 = await page.evaluate(() => ({ x: QCAT.Player.x | 0, vx: QCAT.Player.vx | 0, stick: !!QCAT.Input.sticks.move }));
console.log('while dragging right:', JSON.stringify(s1));
await touch('touchEnd', []);
// quick tap on the right half = split
const before = await page.evaluate(() => JSON.stringify({ move: QCAT.Input.sticks.move, aim: QCAT.Input.sticks.aim }));
console.log('sticks before tap:', before);
await page.evaluate(() => { window.__ev = []; const st = document.getElementById('stage'); for (const t of ['pointerdown', 'pointerup', 'pointercancel']) st.addEventListener(t, e => window.__ev.push([t, e.pointerId, e.pointerType, Math.round(e.timeStamp), e.clientX | 0])); });
await touch('touchStart', [{ x: 300, y: 500, id: 2 }]);
await page.waitForTimeout(40);
await touch('touchEnd', []);
await page.waitForTimeout(200);
console.log('events:', await page.evaluate(() => JSON.stringify(window.__ev)), 'edges:', await page.evaluate(() => JSON.stringify([...QCAT.Input.edges])));
await page.waitForTimeout(1500);
const s2 = await page.evaluate(() => ({ n: QCAT.Player.n, nq: QCAT.Player.nq }));
console.log('after right-half tap:', JSON.stringify(s2));
// Ĥ† button = fold
await page.tap('#t-fold');
await page.waitForTimeout(1500);
const s3 = await page.evaluate(() => ({ n: QCAT.Player.n, folds: QCAT.Game.stats.folds }));
console.log('after fold button:', JSON.stringify(s3));
await page.tap('#t-pause');
await page.waitForTimeout(1500);
console.log('paused:', await page.evaluate(() => QCAT.Game.state));
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
