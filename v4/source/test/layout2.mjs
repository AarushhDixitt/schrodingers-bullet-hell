import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const sizes = JSON.parse(process.argv[2] || '[[1276,636,1.5,0],[1440,900,1,0],[1024,600,1,0],[390,844,2,1],[844,390,2,1],[360,640,2,1]]');
const screens = (process.argv[3] || 'scr-title,scr-setup,scr-grants,scr-notebook,scr-settings,scr-choice,scr-pause,scr-over,scr-win,scr-cabinet').split(',');
const shots = process.argv[4] !== '0';
for (const [w, h, dpr, touch] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: !!touch, isMobile: !!touch });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('qcat:quality', '"low"'); } catch (e) {} });
  await page.goto('file://' + path.join(root, 'harness.html'));
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const S = QCAT.Save.d; S.cites = 4321; S.upg = { coh: 2, rate: 1, life: 1 }; S.reached.graduate = 5; S.unlock.endless = true; S.unlock.rush = true;
    S.rec['campaign:graduate'] = { score: 1234567, wave: 18, runs: 7, clears: 0, fastest: 0, kills: 900 };
    S.ach = { first: Date.now() - 1e6, tesseract: Date.now() - 5e5, b_observer: Date.now() - 4e4 };
    for (let k = 0; k < 12; k++) S.hist.push({ d: Date.now() - k * 4e6, v: k % 3 ? 'campaign' : 'endless', df: QCAT.Save.d.last.diff, s: 100000 * k, w: k + 2, t: 300 + k * 40, k: 120, o: k % 4 ? 'bullet' : 'The Observer' });
    QCAT.UI.refreshTitle();
  });
  for (const id of screens) {
    const r = await page.evaluate((id) => {
      const D = QCAT.debug, UI = QCAT.UI, Sc = QCAT.Screens;
      UI.toTitle();
      if (id === 'scr-setup') UI.openSetup('campaign');
      if (id === 'scr-grants') Sc.grants('scr-title');
      if (id === 'scr-notebook') { Sc.notebook('scr-title'); }
      if (id === 'scr-settings') Sc.settings('scr-title');
      if (id === 'scr-cabinet') Sc.cabinet('scr-title');
      if (id === 'scr-choice') { D.start(3); D.ff(1); Sc.school(() => {}, { boss: 'observer', journal: 'Phys. Rev. Lett.', text: QCAT.Game.stats ? 'We report the first experimental evidence that an observer can itself be collapsed. The subject reached 8 simultaneous positions.' : '' }); if (0) Sc.choice('Paper accepted', 'Choose one discovery. It lasts for the rest of this run.', () => {}); }
      if (id === 'scr-pause') { D.start(3); D.ff(1); for (const p of ['rate', 'homing', 'spread', 'fold', 'chain']) QCAT.Mods.take(p); UI.pause(); }
      if (id === 'scr-over') { D.start(3); QCAT.Game.lives = 1; D.ff(2); const P = QCAT.Player; P.invuln = 0; QCAT.Mods.immortal = 0; P.rerolls = 0; P.measureHit(P.branches.slice(), 'bullet'); D.ff(4); }
      if (id === 'scr-win') { D.start(35); D.ff(1); QCAT.Game.stats.time = 1800; QCAT.Game.victory(); }
      const el = document.getElementById(id);
      const card = el.firstElementChild; const rc = card.getBoundingClientRect();
      return { id, vis: !el.hidden, overflowY: el.scrollHeight - el.clientHeight, overflowX: el.scrollWidth - el.clientWidth, cardRight: Math.round(rc.right), vw: innerWidth };
    }, id);
    console.log(`${w}x${h}${touch ? 't' : ''}`, JSON.stringify(r));
    if (shots) await page.screenshot({ path: path.join(root, 'shots', `l2_${id}_${w}x${h}.png`) });
  }
  if (errors.length) console.log('ERR', errors);
  await ctx.close();
}
await browser.close();
