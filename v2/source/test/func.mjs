import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1276, height: 636 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const url = 'file://' + path.join(root, 'harness.html');
await page.goto(url); await page.waitForTimeout(900);
const ev = (f, a) => page.evaluate(f, a);
const log = (k, v) => console.log(k.padEnd(28), typeof v === 'string' ? v : JSON.stringify(v));
// 1. Open the box -> setup -> pick Postdoc, begin with Enter
await page.click('#b-start'); await page.waitForTimeout(200);
log('setup visible', await ev(() => !document.getElementById('scr-setup').hidden));
await page.click('.dcard:nth-child(3)'); await page.waitForTimeout(100);
await page.keyboard.press('Enter'); await page.waitForTimeout(300);
log('run started', await ev(() => ({ st: QCAT.Game.state, mode: QCAT.Game.mode, diff: QCAT.Game.diffId, lives: QCAT.Game.lives, wave: QCAT.Game.wave })));
// 2. jump to the first boss and kill it to get a discovery choice
await ev(() => { QCAT.Director.start(4); QCAT.debug.god(true); QCAT.debug.ff(5); const b = QCAT.Game.boss; if (b) b.hp = 1; QCAT.debug.ff(1); });
await ev(() => { QCAT.Player.fireFrom(QCAT.Game.boss ? QCAT.Game.boss.x : 0, 0, 0); });
for (let k = 0; k < 10 && !(await ev(() => !document.getElementById('scr-choice').hidden)); k++) await ev(() => { const b = QCAT.Game.boss; if (b && !b.dead) QCAT.Game.damageEnemy(b, 9999, b.x, b.y); QCAT.debug.ff(1); });
log('choice shown', await ev(() => ({ shown: !document.getElementById('scr-choice').hidden, st: QCAT.Game.state, cards: document.querySelectorAll('.pcard').length })));
await page.screenshot({ path: path.join(root, 'shots', 'func_choice.png') });
await page.keyboard.press('Digit2'); await page.waitForTimeout(200);
log('after pick', await ev(() => ({ st: QCAT.Game.state, perks: QCAT.Mods.list().map(o => o.p.id), ph: QCAT.Director.phase })));
await ev(() => QCAT.debug.ff(3));
log('next wave', await ev(() => ({ wave: QCAT.Game.wave, ph: QCAT.Director.phase, theme: QCAT.Theme.c.bg.map(Math.round) })));
// 3. pause -> settings -> toggle hitbox + slider -> Esc back to pause -> Esc resume
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
log('paused', await ev(() => ({ st: QCAT.Game.state, perks: document.getElementById('pause-perks').textContent })));
await page.click('#p-settings'); await page.waitForTimeout(150);
const togs = await page.$$('#set-body .tog'); log('toggles', togs.length);
await ev(() => { const r = [...document.querySelectorAll('#set-body .srow')].find(x => x.textContent.includes('Large hitbox')); r.querySelector('.tog').click(); });
await ev(() => { const i = document.querySelector('#set-body input[type=range]'); i.value = 40; i.dispatchEvent(new Event('input')); });
await ev(() => { const s = document.querySelector('#set-body select'); s.value = 'ember'; s.dispatchEvent(new Event('change')); });
log('settings applied', await ev(() => ({ big: QCAT.Settings.bigDots, vol: QCAT.Settings.vol, theme: QCAT.Settings.theme, stored: JSON.parse(localStorage.getItem('qcat:settings')).bigDots })));
await page.screenshot({ path: path.join(root, 'shots', 'func_settings.png') });
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
log('back to pause', await ev(() => ({ pause: !document.getElementById('scr-pause').hidden, set: !document.getElementById('scr-settings').hidden })));
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
log('resumed', await ev(() => QCAT.Game.state));
// 4. die for real -> game over records citations
await ev(() => { QCAT.debug.god(false); QCAT.Game.stats.time = 120; QCAT.Game.score = 250000; QCAT.Game.lives = 1; QCAT.Mods.immortal = 0; const P = QCAT.Player; P.invuln = 0; P.measureHit(P.branches.slice(), 'bullet'); QCAT.debug.ff(4); });
log('game over', await ev(() => ({ st: QCAT.Game.state, earn: document.getElementById('over-earn').textContent, cites: QCAT.Save.d.cites, rec: QCAT.Save.d.rec['campaign:postdoc'], hist: QCAT.Save.d.hist.length, beaten: QCAT.Save.d.beaten, ach: Object.keys(QCAT.Save.d.ach) })));
await page.screenshot({ path: path.join(root, 'shots', 'func_over.png') });
// 5. grant office: buy something
await page.click('#b-over-grants'); await page.waitForTimeout(150);
const before = await ev(() => QCAT.Save.d.cites);
await page.click('.ucard:nth-child(6) .buy'); await page.waitForTimeout(100);
log('bought magnet', await ev(() => ({ cites: QCAT.Save.d.cites, upg: QCAT.Save.d.upg })), before);
log('cites before', before);
// 6. reload: everything persists
const code = await ev(() => QCAT.Save.exportCode());
await page.reload(); await page.waitForTimeout(900);
log('after reload', await ev(() => ({ cites: QCAT.Save.d.cites, upg: QCAT.Save.d.upg, best: document.getElementById('best').textContent, big: QCAT.Settings.bigDots, pill: document.getElementById('cites-pill').textContent })));
// 7. erase then import the code back
await ev(() => QCAT.Save.reset());
log('after reset', await ev(() => QCAT.Save.d.cites));
log('import ok', await ev(c => QCAT.Save.importCode(c), code));
log('after import', await ev(() => ({ cites: QCAT.Save.d.cites, upg: QCAT.Save.d.upg })));
// 8. notebook renders every tab
await ev(() => QCAT.UI.refreshTitle());
await page.click('#b-notebook'); for (const t of ['records', 'life', 'runs', 'pubs']) { await page.click('#nbt-' + t); await page.waitForTimeout(80); }
log('notebook runs rows', await ev(() => { QCAT.Screens.nbTab = 'runs'; QCAT.Screens.renderNotebook(); return document.querySelectorAll('#nb-runs tbody tr').length; }));
await page.keyboard.press('Escape'); await page.waitForTimeout(100);
log('title back', await ev(() => !document.getElementById('scr-title').hidden));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
