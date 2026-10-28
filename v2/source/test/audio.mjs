import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path'; import fs from 'node:fs';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.join(root, 'harness.html'));
await page.waitForTimeout(800);
const res = await page.evaluate(async (mode) => {
  const A = QCAT.Audio2, G = QCAT.Game, P = QCAT.Player;
  const secs = 12, sr = 44100;
  const oc = new OfflineAudioContext(2, sr * secs, sr);
  A.ctx = null; A.ready = false; A.init(oc);
  QCAT.Settings.sound = true; QCAT.Settings.music = true;
  A.musicBus.gain.value = 0.55; A.sfxBus.gain.value = 0.9;
  // pretend we're mid-fight with 3 qubits, then boss
  G.state = 'playing'; G.mode = 'arcade'; QCAT.Director.phase = 'fight';
  A.music(mode, 7);
  P.nq = 3;
  let t = 0.1, step = 0;
  while (t < secs - 0.5) { A.playStep(step, t); const spb = 60 / (A.bpm * A.bpmMul) / 4; t += spb; step++; if (step === 64) P.nq = 4; }
  // sprinkle sfx + meows at known times
  const sfxAt = (name, at, arg) => { const save = oc.currentTime; A.ctx = { ...{}, currentTime: at, createOscillator: () => oc.createOscillator(), createGain: () => oc.createGain(), createBiquadFilter: () => oc.createBiquadFilter(), createBufferSource: () => oc.createBufferSource(), sampleRate: sr }; A.sfx(name, arg); A.ctx = oc; void save; };
  const buf = await oc.startRendering();
  const out = [];
  for (let s = 0; s < secs; s++) {
    let peak = 0, sum = 0; const d = buf.getChannelData(0);
    for (let i = s * sr; i < (s + 1) * sr; i++) { const v = d[i]; if (!isFinite(v)) return { nan: true }; peak = Math.max(peak, Math.abs(v)); sum += v * v; }
    out.push({ s, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / sr).toFixed(4) });
  }
  // write a small wav (mono, 16-bit) for spectrogram
  const d = buf.getChannelData(0); const pcm = new Int16Array(d.length); for (let i = 0; i < d.length; i++) pcm[i] = Math.max(-1, Math.min(1, d[i])) * 32767;
  let bin = ''; const u8 = new Uint8Array(pcm.buffer); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { out, steps: step, bpm: A.bpm, pcm: btoa(bin) };
}, process.argv[2] || 'wave');
if (res.nan) { console.log('NaN in output!'); } else {
  console.log('bpm', res.bpm, 'steps', res.steps);
  console.log(res.out.map(o => `${o.s}s peak ${o.peak} rms ${o.rms}`).join('\n'));
  fs.writeFileSync(path.join(root, 'shots', 'music_' + (process.argv[2] || 'wave') + '.pcm'), Buffer.from(res.pcm, 'base64'));
}
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
