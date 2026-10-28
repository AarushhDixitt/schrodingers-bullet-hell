// lineage: veterans join, return, die into the memorial, and names pass down with numerals
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(700);
const r = await page.evaluate(() => {
  const { Game: G, Player: P, Lineage: L, Save } = QCAT, out = {};
  Save.d.cats = {};
  G.newRun('arcade', 1, { diff: 'graduate' }); QCAT.Bot.on = false;
  out.player = P.name;
  P.split && P.split(); const names = P.branches.map(b => b.name);
  for (let i = 0; i < 4; i++) L.survived(P.branches, 0.6);
  G.stats.time = 60; const res = G.endRun('quit'); out.records = res && res.records;
  out.reg1 = Object.keys(Save.d.cats);
  // run 2: make every new cat a returning veteran, then collapse one
  G.newRun('arcade', 1, { diff: 'graduate' }); QCAT.Bot.on = false;
  out.vets = [...L.vets];
  const orig = Math.random; Math.random = () => 0.01; const back = L.name(); Math.random = orig; out.back = back;
  L.rec(back); L.died(back, 'laser');
  G.stats.time = 60; const res2 = G.endRun('quit'); out.records2 = res2 && res2.records;
  out.deadEntry = Save.d.cats[back];
  // a new cat with that base name should now get a numeral
  let got = null; for (let i = 0; i < 4000 && !got; i++) { const n = L.name(); if (L.coreOf(n) === L.coreOf(back)) got = n; }
  out.successor = got;
  const box = document.createElement('div'); L.render(box); out.render = box.textContent.slice(0, 400);
  return out;
});
console.log(JSON.stringify(r, null, 1));
console.log('ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
