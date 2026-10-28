import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: [] });
const page = await browser.newPage();
await page.goto('file://' + path.join(root, 'harness.html'));
await page.waitForTimeout(800);
const names = ['meow:happy', 'meow:sad', 'meow:big', 'split', 'fold', 'survive', 'death', 'decohere', 'shutter', 'bossShot', 'pickup', 'power', 'clear', 'bossIntro', 'bossDeath', 'roll', 'annihilate', 'gate', 'explode', 'shot', 'hit'];
const res = await page.evaluate(async (names) => {
  const out = {};
  for (const nm of names) {
    const sr = 44100, oc = new OfflineAudioContext(2, sr * 3, sr);
    const A = QCAT.Audio2; A.ctx = null; A.ready = false; A.last = {}; A.init(oc);
    QCAT.Settings.sound = true; A.sfxBus.gain.value = 0.9;
    const [a, b] = nm.split(':');
    if (a === 'meow') A.meow(b); else if (a === 'explode') A.explode(30); else if (a === 'shot') A.shot(4); else if (a === 'hit') A.hit(false); else A.sfx(a, 4);
    const buf = await oc.startRendering(); const d = buf.getChannelData(0);
    let peak = 0, sum = 0, last = 0; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (!isFinite(v)) { peak = NaN; break; } if (v > peak) peak = v; sum += v * v; if (v > 0.01) last = i; }
    out[nm] = { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), dur: +(last / sr).toFixed(2) };
  }
  return out;
}, names);
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(12), JSON.stringify(v));
await browser.close();
