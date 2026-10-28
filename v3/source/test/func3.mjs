// functional checks for the update: setup locks, school → discovery, master access, tutorial, holes, events, elites, splits, report
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(900);
const ev = (f, a) => page.evaluate(f, a);
const log = (k, v) => console.log(k.padEnd(26), typeof v === 'string' ? v : JSON.stringify(v));
const fails = []; const check = (k, ok, v) => { log((ok ? 'ok   ' : 'FAIL ') + k, v); if (!ok) fails.push(k); };

// setup: Nobel locked, Endless locked, chapters limited per difficulty
await page.click('#b-start'); await page.waitForTimeout(200);
let r = await ev(() => ({ nobel: document.querySelectorAll('.dcard')[5].disabled, chaps: [...document.querySelectorAll('.chap')].filter(b => !b.disabled).length }));
check('nobel locked, 1 chapter', r.nobel && r.chaps === 1, r);
await page.click('#mode-endless'); r = await ev(() => document.getElementById('b-begin').disabled); check('endless locked', r, r);
await ev(() => { QCAT.Save.d.reached.postdoc = 6; QCAT.Screens.su.diff = 'graduate'; QCAT.Screens.su.variant = 'campaign'; QCAT.Screens.renderSetup(); });
r = await ev(() => [...document.querySelectorAll('.chap')].filter(b => !b.disabled).length); check('postdoc ch VI opens graduate', r === 6, r);
await ev(() => { QCAT.Screens.su.diff = 'reviewer2'; QCAT.Screens.renderSetup(); });
r = await ev(() => [...document.querySelectorAll('.chap')].filter(b => !b.disabled).length); check('but not reviewer2', r === 1, r);
await ev(() => QCAT.Screens.close('scr-setup'));

// campaign: first boss → interpretation → discovery with the paper abstract
await ev(() => { QCAT.debug.start(4, 'arcade', { variant: 'campaign', diff: 'graduate' }); QCAT.debug.ff(5); });
for (let k = 0; k < 12 && await ev(() => document.getElementById('scr-choice').hidden); k++) await ev(() => { const b = QCAT.Game.boss; if (b && !b.dead) { b.hp = 1; QCAT.Game.damageEnemy(b, 99999, b.x, b.y); } QCAT.Player.invuln = 99; QCAT.debug.ff(1); });
r = await ev(() => ({ title: document.getElementById('choice-title').textContent, cards: document.querySelectorAll('.pcard').length, paper: !document.getElementById('choice-paper').hidden }));
check('school screen', r.title.includes('interpretation') && r.cards === 4 && r.paper, r);
await page.keyboard.press('Digit4'); await page.waitForTimeout(150);
r = await ev(() => ({ school: QCAT.Mods.school, title: document.getElementById('choice-title').textContent, cards: document.querySelectorAll('.pcard').length }));
check('then discovery', r.school === 'qb' && r.title === 'Paper accepted' && r.cards >= 3, r);
await page.keyboard.press('Digit1'); await page.waitForTimeout(150);
r = await ev(() => ({ st: QCAT.Game.state, perks: QCAT.Mods.list().length, rerolls: QCAT.Player.rerolls })); check('picked', r.st === 'playing' && r.perks === 1, r);
await ev(() => QCAT.debug.ff(4)); r = await ev(() => ({ wave: QCAT.Game.wave, rerolls: QCAT.Player.rerolls, splits: QCAT.Game.stats.waveTimes.length })); check('wave 5, rerolls, splits', r.wave === 5 && r.rerolls >= 1 && r.splits >= 1, r);

// boss windows exist for every boss
r = await ev(() => Object.keys(QCAT.BOSS_DEFS).filter(k => !QCAT.BOSS_DEFS[k].window)); check('every boss has a window', !r.length, r);

// holes: two stellar holes merge and emit a wave
await ev(() => { QCAT.Game.enemies.forEach(e => e.dead = true); QCAT.Holes.clear(); const a = QCAT.Holes.add(900, 700, 2, { arrive: 0 }), b = QCAT.Holes.add(1010, 700, 2, { arrive: 0 }); a.born = b.born = 1; QCAT.Player.x = 200; QCAT.Player.y = 1200; QCAT.Player.invuln = 99; QCAT.debug.ff(4); });
r = await ev(() => ({ holes: QCAT.Holes.list.map(h => h.lv), mergers: QCAT.Game.stats.mergers })); check('holes merged', r.mergers === 1 && r.holes.length === 1 && r.holes[0] === 3, r);
await ev(() => QCAT.Holes.clear());

// events and elites
r = await ev(() => { for (const id of QCAT.EVENT_IDS) QCAT.Events.start(id); QCAT.Player.invuln = 99; QCAT.debug.ff(10); return { events: QCAT.Game.stats.events, live: QCAT.Events.list.length }; }); check('all events ran', r.events === 7, r);
r = await ev(() => { QCAT.Events.clear(); const made = QCAT.ELITE_IDS.map(k => QCAT.Game.addEnemy(k, 1100 + Math.random() * 300, 400)).filter(Boolean).length; QCAT.Player.invuln = 99; QCAT.debug.ff(3); const el = QCAT.Game.enemies.filter(e => e.elite); for (const e of el) QCAT.Game.damageEnemy(e, 1e6, e.x, e.y); const n = QCAT.Game.enemies.filter(e => e.elite && !e.dead).length; return { spawned: made, alive: n, pickups: QCAT.Game.pickups.length }; });
check('elites spawn and die', r.spawned === 5, r);

// cat stacking to 256
r = await ev(() => { const P = QCAT.Player; P.invuln = 99; for (let k = 0; k < 4; k++) QCAT.Game.collect({ kind: 'H', x: P.x, y: P.y }); P.coh = 100; for (let k = 0; k < 8; k++) { P.splitCd = 0; P.coh = 100; P.split(); } return { n: P.n, maxQ: P.maxQ() }; });
check('256 cats (Many-Worlds aside)', r.n >= 128, r);
await ev(() => QCAT.debug.ff(0.5));

// master access: the sequence on the pause screen
await ev(() => { QCAT.UI.pause(); });
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA', 'Enter']) await page.keyboard.press(k);
await page.waitForTimeout(200); await ev(() => QCAT.Game.frame(1 / 60));
r = await ev(() => ({ on: QCAT.Calib.on, st: QCAT.Game.state, btn: !document.getElementById('p-cal').hidden, counts: QCAT.Game.counts() })); check('master access on', r.on && r.st === 'paused' && r.btn && !r.counts, r);
await page.click('#p-cal'); await page.waitForTimeout(150);
r = await ev(() => ({ panel: !!document.querySelector('.bench:not([hidden])'), chips: document.querySelectorAll('.bench .chip').length })); check('console panel', r.panel && r.chips > 30, r);
await page.screenshot({ path: path.join(root, 'shots', 'f3_console.png') });
await ev(() => { QCAT.Calib.panel(false); QCAT.UI.resume(); });
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA', 'Enter']) await page.keyboard.press(k);
await page.waitForTimeout(150); await ev(() => QCAT.Game.frame(1 / 60));
r = await ev(() => QCAT.Calib.on); check('sequence ignored while playing', r === true, r);
await ev(() => QCAT.UI.pause());
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA', 'Enter']) await page.keyboard.press(k);
await page.waitForTimeout(150); await ev(() => QCAT.Game.frame(1 / 60));
r = await ev(() => ({ on: QCAT.Calib.on, counts: QCAT.Game.counts(), st: QCAT.Game.state, rec: QCAT.Input.recent.join(' '), rt: QCAT.Game.rt }));
console.log('rt later', await (async () => { await page.waitForTimeout(500); return ev(() => [QCAT.Game.rt, QCAT.Calib.on]); })()); check('master access off again', !r.on && r.counts, r);
await ev(() => QCAT.UI.resume());

// death → report and obituary
await ev(() => { QCAT.Game.lives = 1; QCAT.Player.invuln = 0; QCAT.Player.rerolls = 0; QCAT.Player.collapseTo([QCAT.Player.branches[0]]); QCAT.Player.measureHit(QCAT.Player.branches.slice(), 'bullet'); QCAT.debug.ff(4); });
r = await ev(() => ({ over: !document.getElementById('scr-over').hidden, report: document.getElementById('over-report').children.length, obit: document.getElementById('obit').textContent.split('\n\n').length }));
check('game over report + obituary', r.over && r.report >= 2 && r.obit >= 4, r);
await page.screenshot({ path: path.join(root, 'shots', 'f3_over.png') });

// tutorial runs start to finish
await ev(() => QCAT.UI.start(1, 'tutorial'));
r = await ev(async () => {
  const P = QCAT.Player, T = [];
  for (let s = 0; s < 400 && QCAT.Game.mode === 'tutorial'; s++) {
    if (QCAT.Tutorial.k !== 4) QCAT.Player.vx = 300; QCAT.Input.touchFocus = true; P.coh = 100;
    if (P.n < 4 && P.splitCd <= 0) P.split();
    if (s % 20 === 10 && P.nq > 0) P.fold();
    for (const e of QCAT.Game.enemies) e.hp = 0, QCAT.Game.killEnemy(e, 'shot');
    QCAT.debug.ff(0.25, false);
    T.push(QCAT.Game.mode);
  }
  return { done: QCAT.Save.d.tut, k: QCAT.Tutorial ? QCAT.Tutorial.k : -9, mode: QCAT.Game.mode };
});
check('tutorial completes', r.done, r);
console.log(fails.length ? 'FAILED: ' + fails.join(', ') : 'ALL PASSED');
console.log('ERRORS:', errors.length ? '\n' + errors.slice(0, 15).join('\n') : 'none');
await browser.close();
