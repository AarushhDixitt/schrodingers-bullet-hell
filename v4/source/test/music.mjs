// render every track offline: no NaNs, not silent, not clipping
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.join(root, 'harness.html')); await page.waitForTimeout(800);
const ids = await page.evaluate(() => { const S = QCAT.Save.d; for (const k of Object.keys(S.reached)) S.reached[k] = 9; S.reached.graduate = 9; for (const b of ['observer','laplace','die','maxwell','slit','threebody','oscillator','cyclotron','apparatus']) S.tracks[b] = true; return QCAT.Audio2.tracks().map(t => t.id).concat(['over']); });
for (const id of ids) {
  const r = await page.evaluate(async id => {
    const A = QCAT.Audio2, G = QCAT.Game, P = QCAT.Player, secs = 8, sr = 22050;
    const oc = new OfflineAudioContext(2, sr * secs, sr);
    A.ctx = null; A.ready = false; A.init(oc); QCAT.Settings.sound = QCAT.Settings.music = true; A.musicBus.gain.value = 0.55;
    G.state = 'playing'; G.mode = 'arcade'; QCAT.Director.phase = 'fight'; P.nq = 3;
    QCAT.Settings.musicPick = id === 'over' ? 'auto' : id; A.trackId = null; A.music(id === 'over' ? 'over' : 'wave', 7, true);
    let t = 0.05, step = 0; while (t < secs - 0.3) { A.playStep(step, t); t += 60 / (A.bpm * A.bpmMul) / 4; step++; }
    const buf = await oc.startRendering(), d = buf.getChannelData(0); let peak = 0, sum = 0;
    for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) return { id, nan: true }; peak = Math.max(peak, Math.abs(v)); sum += v * v; }
    return { id, track: A.track && A.track.name, bpm: Math.round(A.bpm), peak: +peak.toFixed(2), rms: +Math.sqrt(sum / d.length).toFixed(3) };
  }, id);
  console.log(JSON.stringify(r));
}
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
