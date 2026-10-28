// ---------- audio: synthesized sfx, ten procedural chapter tracks with boss variants, your own music, a meow, an announcer ----------
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], lydian: [0, 2, 4, 6, 7, 9, 11] };
// A track is data for one step sequencer. prog: chord roots as scale degrees, bars per chord.
// bass/drum patterns are 16 steps: x root, o octave, 5 fifth, 3 third, = held, - rest | x hit, o open hat.
// arp p: chord tones (0-7 climb through octaves), - rest; div: steps per note; arp2 can have another length so the two phase.
// perc: tick (measurement), clock (determinism), geiger (the box). fill: chance of a random extra hit each step.
const TRACKS = {
  menu: { name: 'Superposition (menu)', bpm: 92, root: 45, scale: 'minor', prog: [0, 5, 2, 6], bars: 2, pad: { w: 'sawtooth', lp: 1100, a: 0.04 }, bass: { p: '=-------x-------', w: 'triangle', lp: 400 }, arp: { p: '01231232', div: 2, w: 'triangle', o: 24, a: 0.048 }, arp2: { p: '0-2-1-3-2', div: 2, w: 'sine', o: 36, a: 0.02 } },
  ch1: { name: 'I · Measurement', bpm: 96, root: 40, scale: 'phrygian', prog: [0, 1, 0, 6], bars: 2, perc: 'tick', pad: { w: 'triangle', lp: 900, a: 0.03 }, bass: { p: 'x-------x--x----', w: 'triangle', lp: 420 }, arp: { p: '0--2--1-3--1-2--', div: 1, w: 'sine', o: 24, a: 0.045 }, drums: { k: 'x.......x.......', s: '....x.......x...' } },
  ch2: { name: 'II · Determinism', bpm: 120, root: 45, scale: 'harm', prog: [0, 3, 6, 4], bars: 1, perc: 'clock', pad: { w: 'square', lp: 800, a: 0.016 }, bass: { p: 'x---x---x---x---', w: 'square', lp: 520 }, arp: { p: '01210121', div: 1, w: 'square', o: 12, a: 0.026 }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
  ch3: { name: 'III · Thermodynamics', bpm: 76, root: 38, scale: 'dorian', prog: [0, 3, 0, 4], bars: 2, pad: { w: 'sawtooth', lp: 900, a: 0.034, sweep: true }, bass: { p: '=---------------', w: 'sine', lp: 300 }, arp: { p: '0---2---1---3---', div: 1, w: 'triangle', o: 24, a: 0.028 }, drums: { k: 'x...............', h: '..x...x...x...x.' } },
  ch4: { name: 'IV · Chance', bpm: 132, root: 43, scale: 'minor', prog: [0, 5, 3, 4], bars: 1, pad: { w: 'square', lp: 700, a: 0.014 }, bass: { p: 'x--x--x---x-x-o-', w: 'sawtooth', lp: 600 }, arp: { p: '0123', div: 1, w: 'square', o: 12, a: 0.024, rnd: true }, drums: { k: 'x..x..x...x..x..', s: '....x..x....x...', h: 'xxxxxxxxxxxxxxxx', fill: 0.14 } },
  ch5: { name: 'V · Interference', bpm: 108, root: 48, scale: 'lydian', prog: [0, 1, 0, 4], bars: 2, pad: { w: 'triangle', lp: 1400, a: 0.03 }, bass: { p: 'x-------5-------', w: 'sine', lp: 380 }, arp: { p: '0123', div: 2, w: 'triangle', o: 24, a: 0.032 }, arp2: { p: '0242130', div: 2, w: 'sine', o: 36, a: 0.022 }, drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' } },
  ch6: { name: 'VI · Gravitation', bpm: 84, root: 36, scale: 'minor', prog: [0, 5, 6, 4], bars: 2, pad: { w: 'sawtooth', lp: 700, a: 0.034 }, bass: { p: 'x-----o-x-------', w: 'sawtooth', lp: 260 }, arp: { p: '0---1---2---1---', div: 1, w: 'triangle', o: 24, a: 0.03 }, drums: { k: 'x.......x.x.....', s: '........x.......', h: 'x...x...x...x...' } },
  ch7: { name: 'VII · Oscillation', bpm: 124, root: 50, scale: 'dorian', prog: [0, 3, 4, 3], bars: 1, swing: 0.12, pad: { w: 'triangle', lp: 1200, a: 0.022 }, bass: { p: 'x-o-x-o-x-o-x-o-', w: 'square', lp: 480 }, arp: { p: '01232101', div: 1, w: 'square', o: 12, a: 0.024 }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '.x.x.x.x.x.x.x.x' } },
  ch8: { name: 'VIII · Fields', bpm: 140, root: 42, scale: 'harm', prog: [0, 5, 4, 0], bars: 1, pad: { w: 'sawtooth', lp: 900, a: 0.018 }, bass: { p: 'x-x-x-x-x-x-x-xo', w: 'sawtooth', lp: 640 }, arp: { p: '0123456701234567', div: 1, w: 'sawtooth', o: 12, a: 0.02 }, arp2: { p: '76543', div: 2, w: 'square', o: 24, a: 0.014 }, drums: { k: 'x...x...x...x...', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx' } },
  ch9: { name: 'IX · Nonlocality', bpm: 112, root: 47, scale: 'lydian', prog: [0, 4, 1, 4], bars: 2, pad: { w: 'triangle', lp: 1300, a: 0.03 }, bass: { p: 'x---o---x---o---', w: 'sine', lp: 360 }, arp: { p: '0-4-2-6-0-4-2-6-', div: 1, w: 'triangle', o: 24, a: 0.045 }, drums: { k: 'x.......x.......', s: '....x.......x...' } },
  ch10: { name: 'X · The Box', bpm: 100, root: 44, scale: 'phrygian', prog: [0, 1, 5, 1], bars: 2, perc: 'geiger', pad: { w: 'sine', lp: 800, a: 0.04 }, bass: { p: '=-------x-------', w: 'sine', lp: 300 }, arp: { p: '0-----2-----1---', div: 1, w: 'sine', o: 24, a: 0.04 }, drums: { k: 'x.......x...x...', s: '........x.......' } },
  over: { name: 'Decoherence', bpm: 70, root: 45, scale: 'minor', prog: [0, 5, 3, 4], bars: 2, pad: { w: 'triangle', lp: 900, a: 0.045 }, arp: { p: '0-1-2---', div: 2, w: 'sine', o: 24, a: 0.05 } },
};
const CH_TRACK = n => 'ch' + clamp(n | 0, 1, CHAPTERS.length);
// ---------- sound effects as data ----------
// a part is ['o', wave, Hz | 'mNN' (MIDI note), at, dur, peak, attack, {to, glide, lp, lpTo, q, rev, del, detune}]
//        or ['n', at, dur, peak, filter, Hz, toHz, Q] (filtered noise). A leading number throttles (ms).
const arp = (wave, notes, step, dur, peak, o) => notes.map((m, k) => ['o', wave, 'm' + m, k * step, dur, peak, 0.003, o]);
const SFX = {
  split: n => [...arp('square', [0, 4, 7].map(d => [69, 73, 76, 81, 85][Math.min(4, (n || 1) - 1)] + d + 12), 0.035, 0.12, 0.07, { lp: 4200, rev: 0.4, del: 0.25 }), ['n', 0, 0.25, 0.05, 'highpass', 2000, 9000]],
  foldStart: [['n', 0, 0.22, 0.12, 'bandpass', 300, 4000, 2]],
  fold: N => [['o', 'sine', 140, 0, 0.7, 0.5, 0.002, { to: 32 }], ['n', 0, 0.5, 0.22 + Math.min(0.2, (N || 2) * 0.01), 'lowpass', 1800, 90], ...[69, 73, 76, 81].map(m => ['o', 'sawtooth', 'm' + m, 0, 0.6, 0.05, 0.004, { lp: 3000, lpTo: 400, rev: 0.6 }])],
  survive: p => { const l = p < 0.2 ? 12 : 0; return [...arp('triangle', [69, 73, 76, 81].map(m => m + l), 0.04, 0.9, 0.09, { rev: 0.7 }), ['o', 'sine', 'm' + (93 + l), 0.12, 1.1, 0.05, 0.004, { rev: 0.8, del: 0.4 }]]; },
  death: [...arp('sawtooth', [69, 65, 62, 57, 50], 0.11, 0.5, 0.09, { lp: 1600, lpTo: 300, rev: 0.6 }), ['n', 0, 1.2, 0.35, 'lowpass', 3000, 60], ['o', 'sine', 90, 0, 1.2, 0.5, 0.002, { to: 25 }]],
  decohere: [['o', 'triangle', 900, 0, 0.55, 0.12, 0.01, { to: 160, rev: 0.5 }]],
  shutter: [['n', 0, 0.02, 0.25, 'highpass', 4000], ['n', 0.05, 0.03, 0.2, 'highpass', 2500]],
  charge: [['o', 'sine', 300, 0, 0.8, 0.06, 0.05, { to: 1300 }]],
  eshot: [70, ['o', 'sawtooth', 640, 0, 0.07, 0.035, 0.002, { to: 260, lp: 2400 }]],
  bossShot: [90, ['o', 'square', 90, 0, 0.22, 0.09, 0.003, { to: 50, lp: 700 }], ['n', 0, 0.12, 0.08, 'bandpass', 900]],
  graze: () => [60, ['o', 'sine', 2600 + Math.random() * 400, 0, 0.03, 0.03, 0.001]],
  pickup: [['o', 'sine', 'm88', 0, 0.15, 0.1, 0.003, { rev: 0.5 }], ['o', 'sine', 'm95', 0.06, 0.25, 0.08, 0.003, { rev: 0.6 }]],
  power: arp('square', [69, 73, 76, 81, 85], 0.05, 0.18, 0.06, { lp: 5000, rev: 0.5, del: 0.3 }),
  life: arp('square', [81, 85, 88, 93, 88, 93], 0.08, 0.2, 0.06, { lp: 6000, rev: 0.5 }),
  clear: arp('triangle', [69, 73, 76, 81], 0.09, 0.6, 0.1, { rev: 0.6, del: 0.3 }),
  bossIntro: [...[[33, -12], [45, 9], [40, -5], [33, 14]].map(([m, d]) => ['o', 'sawtooth', 'm' + m, 0, 2.6, 0.09, 0.8, { lp: 180, lpTo: 2200, detune: d, rev: 0.5 }]), ['n', 0, 2.2, 0.06, 'bandpass', 200, 3000, 3]],
  bossPhase: [['o', 'square', 55, 0, 0.9, 0.2, 0.002, { lp: 1200, lpTo: 200 }], ['n', 0, 0.6, 0.25, 'lowpass', 4000, 100]],
  bossDeath: [['n', 0, 2.4, 0.4, 'lowpass', 5000, 50], ['o', 'sine', 70, 0, 2.2, 0.6, 0.002, { to: 20 }], ...arp('triangle', [69, 73, 76, 81, 85, 88], 0.07, 1.8, 0.07, { rev: 0.8 }).map(p => (p[3] += 0.4, p))],
  rewind: [['o', 'sawtooth', 200, 0, 2.0, 0.07, 0.05, { to: 1400, lp: 2600 }], ['n', 0, 2.0, 0.05, 'bandpass', 1200, 4000, 4]],
  gate: () => [...Array.from({ length: 6 }, (_, k) => ['o', 'square', 200 + Math.random() * 1600, k * 0.035, 0.04, 0.06, 0.001, { lp: 5000 }]), ['n', 0, 0.2, 0.1, 'highpass', 1500]],
  roll: n => [...Array.from({ length: 7 }, (_, k) => ['n', k * 0.045 + Math.random() * 0.02, 0.025, 0.16, 'bandpass', 1800 + Math.random() * 1500, null, 2]), ['o', 'sine', 160, 0.34, 0.25, 0.35, 0.002, { to: 60 }], ['o', 'triangle', 'm' + (64 + (n || 1)), 0.38, 0.5, 0.08, 0.004, { rev: 0.6 }]],
  thud: [90, ['o', 'sine', 120, 0, 0.3, 0.4, 0.002, { to: 40 }], ['n', 0, 0.1, 0.12, 'lowpass', 800]],
  tachyonAim: [120, ['o', 'sine', 1800, 0, 0.8, 0.025, 0.2, { to: 3200 }]],
  tachyonDash: [80, ['n', 0, 0.25, 0.1, 'bandpass', 4000, 600, 1.5]],
  dash: [60, ['n', 0, 0.2, 0.13, 'bandpass', 700, 3800, 1.4], ['o', 'sine', 220, 0, 0.16, 0.06, 0.003, { to: 660 }]],
  annihilate: [['o', 'sine', 1100, 0, 0.3, 0.08, 0.002, { rev: 0.5 }], ['o', 'sine', 1320, 0.03, 0.3, 0.07, 0.002, { rev: 0.5 }], ['n', 0, 0.15, 0.12, 'highpass', 2500]],
  pop: [50, ['o', 'sine', 700, 0, 0.07, 0.08, 0.002, { to: 200 }]],
  zombie: [['o', 'sawtooth', 110, 0, 0.6, 0.08, 0.05, { to: 70, lp: 600, q: 6 }]],
  respawn: arp('sine', [69, 72, 75, 78, 81, 84], 0.04, 0.3, 0.05, { rev: 0.6 }),
  deny: [150, ['o', 'square', 110, 0, 0.12, 0.07, 0.002, { lp: 600 }]],
  boom: [22, ['n', 0, 0.6, 0.3, 'lowpass', 3500, 120], ['o', 'sine', 120, 0, 0.5, 0.45, 0.002, { to: 38 }]],
  door: [['o', 'square', 140, 0, 0.14, 0.08, 0.002, { to: 70, lp: 900 }], ['n', 0, 0.2, 0.1, 'lowpass', 1400, 300]],
  erase: [['o', 'sine', 2200, 0, 1.3, 0.07, 0.01, { to: 110, rev: 0.6 }], ['n', 0, 1.2, 0.05, 'bandpass', 5000, 300, 3]],
  ach: arp('triangle', [81, 85, 88], 0.07, 0.35, 0.09, { rev: 0.6, del: 0.3 }),
  geiger: [25, ['n', 0, 0.008, 0.4, 'highpass', 2600], ['o', 'square', 1800, 0, 0.006, 0.05, 0.0005]],
  slam: [['o', 'sine', 90, 0, 0.5, 0.5, 0.002, { to: 28 }], ['n', 0, 0.35, 0.3, 'lowpass', 1800, 120]],
  zap: [70, ['o', 'sawtooth', 2400, 0, 0.18, 0.07, 0.001, { to: 300, lp: 6000 }], ['n', 0, 0.16, 0.12, 'bandpass', 3500, 900, 2]],
  glass: () => [...Array.from({ length: 7 }, () => ['o', 'sine', 2400 + Math.random() * 3200, Math.random() * 0.15, 0.25, 0.05, 0.001, { rev: 0.6 }]), ['n', 0, 0.3, 0.2, 'highpass', 3000]],
  choose: [['o', 'triangle', 'm76', 0, 0.2, 0.08, 0.003, { rev: 0.5 }], ['o', 'triangle', 'm83', 0.05, 0.3, 0.07, 0.003, { rev: 0.5 }]],
  perfect: [...arp('sine', [88, 95, 100], 0.03, 0.4, 0.09, { rev: 0.7, del: 0.3 }), ['n', 0, 0.3, 0.15, 'highpass', 6000, 2000]],
  medal: arp('triangle', [84, 88, 91, 96], 0.06, 0.5, 0.08, { rev: 0.7 }),
  chirp: [['o', 'sine', 40, 0, 2.6, 0.2, 0.3, { to: 900, glide: 2.6 }], ['o', 'triangle', 80, 0, 2.6, 0.06, 0.3, { to: 1800, glide: 2.6 }]],
  merger: [['n', 0, 3, 0.45, 'lowpass', 2000, 40], ['o', 'sine', 900, 0, 0.25, 0.3, 0.002, { to: 60 }], ['o', 'sine', 50, 0.1, 2.5, 0.6, 0.01, { to: 22 }]],
  window: [80, ['o', 'triangle', 'm81', 0, 0.25, 0.08, 0.003, { rev: 0.4 }], ['o', 'triangle', 'm88', 0.07, 0.35, 0.08, 0.003, { rev: 0.5 }]],
  master: arp('square', [57, 64, 69, 76, 81, 88, 93], 0.05, 0.3, 0.06, { lp: 5000, rev: 0.6, del: 0.4 }),
  tick: [40, ['o', 'square', 'm93', 0, 0.025, 0.04, 0.001, { lp: 6000 }]],
  meas: p => [['o', 'sine', 'm' + (p > 0.5 ? 57 : p > 0.2 ? 64 : 76), 0, 0.9, 0.12, 0.004, { rev: 0.8 }], ['o', 'sine', 'm' + (p > 0.5 ? 60 : p > 0.2 ? 69 : 81), 0.02, 0.9, 0.08, 0.004, { rev: 0.8 }]],
  event: [['o', 'sawtooth', 'm45', 0, 1.2, 0.08, 0.2, { lp: 300, lpTo: 2400, rev: 0.6 }], ['o', 'sawtooth', 'm52', 0.1, 1.1, 0.06, 0.2, { lp: 300, lpTo: 2400, rev: 0.6 }]],
};

const Audio2 = {
  ctx: null, ready: false, paused: false,
  master: null, comp: null, pre: null, crusher: null, sfxBus: null, musicBus: null, musicLP: null, musicPan: null, damp: null, reverb: null, revSend: null, delay: null, delSend: null,
  noise: null, last: {}, seqTimer: null,
  mode: 'title', wave: 1, bpm: 92, bpmMul: 1, step: 0, nextT: 0, intensity: 0, lead: [], droneNodes: null, voice: null, track: null, trackId: null, isBoss: false, seed: 1, chapter: 0,
  init(offline) {
    if (this.ctx && !offline) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC && !offline) return;
    if (offline) this.ctx = offline;
    else try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.95 * (Settings.vol ?? 0.85); this.master.connect(c.destination);
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.knee.value = 10; this.comp.ratio.value = 4; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
    this.comp.connect(this.master);
    this.crusher = c.createWaveShaper(); this.crusher.connect(this.comp);
    this.pre = c.createGain(); this.pre.connect(this.crusher);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = Settings.sound ? (Settings.sfxVol ?? 0.9) : 0; this.sfxBus.connect(this.pre);
    this.musicBus = c.createGain(); this.musicBus.gain.value = Settings.music && Settings.sound ? 0.9 * (Settings.musicVol ?? 0.6) : 0;
    this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 18000; this.musicLP.Q.value = 0.7;
    this.musicPan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    this.damp = c.createGain(); this.musicBus.connect(this.musicLP); this.musicLP.connect(this.damp); this.damp.connect(this.musicPan); this.musicPan.connect(this.pre);
    // reverb
    this.reverb = c.createConvolver(); this.reverb.buffer = this.impulse(2.6, 2.4);
    this.revSend = c.createGain(); this.revSend.gain.value = 0.32; this.revSend.connect(this.reverb); this.reverb.connect(this.pre);
    // delay
    this.delay = c.createDelay(1.5); const fb = c.createGain(); fb.gain.value = 0.38; const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    this.delay.connect(dlp); dlp.connect(fb); fb.connect(this.delay); this.delSend = c.createGain(); this.delSend.gain.value = 0.3; this.delSend.connect(this.delay); dlp.connect(this.pre);
    // noise
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = nb;
    this.ready = true;
    if (this.paused) this.setPaused(true);
    this.nextT = c.currentTime + 0.1;
    if (offline) return;
    this.seqTimer = setInterval(() => this.schedule(), 25);
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend().catch(() => {}); else if (Settings.sound) this.ctx.resume().catch(() => {}); });
  },
  impulse(sec, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  },
  applySettings() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(0.95 * (Settings.vol ?? 0.85), t, 0.05);
    this.sfxBus.gain.setTargetAtTime(Settings.sound ? (Settings.sfxVol ?? 0.9) : 0, t, 0.05);
    this.musicBus.gain.setTargetAtTime(Settings.sound && Settings.music ? 0.9 * (Settings.musicVol ?? 0.6) : 0, t, 0.1);
    if (!Settings.voice) try { speechSynthesis.cancel(); } catch (e) {}
  },
  can(name, gap) { const now = performance.now(); if (this.last[name] && now - this.last[name] < gap) return false; this.last[name] = now; return true; },

  // ----- building blocks -----
  env(g, t, a, peak, d, sus = 0) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus || 0.0001), t + a + d); },
  osc(type, f, t, dur, dest, peak = 0.3, a = 0.005, opts = {}) {
    const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t + (opts.glide || dur));
    if (opts.detune) o.detune.value = opts.detune;
    const g = c.createGain(); this.env(g, t, a, peak, dur);
    let node = o;
    if (opts.lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(opts.lp, t); if (opts.lpTo) f2.frequency.exponentialRampToValueAtTime(opts.lpTo, t + dur); f2.Q.value = opts.q || 1; o.connect(f2); node = f2; }
    node.connect(g); g.connect(dest || this.sfxBus);
    if (opts.rev) { const s = c.createGain(); s.gain.value = opts.rev; g.connect(s); s.connect(this.revSend); }
    if (opts.del) { const s = c.createGain(); s.gain.value = opts.del; g.connect(s); s.connect(this.delSend); }
    o.start(t); o.stop(t + a + dur + 0.05);
    return o;
  },
  noiseBurst(t, dur, dest, peak = 0.3, type = 'lowpass', f = 2000, fTo, q = 0.8) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (fTo) fl.frequency.exponentialRampToValueAtTime(fTo, t + dur); fl.Q.value = q;
    const g = c.createGain(); this.env(g, t, 0.003, peak, dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.sfxBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return g;
  },

  // ----- sfx -----
  shot(n) {
    if (!this.ready || !Settings.sound || !this.can('shot', n > 8 ? 38 : 55)) return;
    const t = this.ctx.currentTime;
    this.osc('triangle', 1500 + Math.random() * 300 - n * 18, t, 0.035, null, 0.045, 0.002, { to: 600 });
  },
  hit(boss) {
    if (!this.ready || !Settings.sound || !this.can('hit', 28)) return;
    const t = this.ctx.currentTime;
    this.noiseBurst(t, 0.035, null, boss ? 0.09 : 0.06, 'highpass', 3000);
    if (boss) this.osc('square', 180 + Math.random() * 40, t, 0.04, null, 0.03, 0.002, { lp: 900 });
  },
  explode(r) {
    if (!this.ready || !Settings.sound || !this.can('explode', 22)) return;
    const t = this.ctx.currentTime, big = clamp(r / 40, 0.2, 1.5);
    this.noiseBurst(t, 0.18 + big * 0.35, null, 0.16 + big * 0.12, 'lowpass', 2600 + big * 600, 120);
    this.osc('sine', 110 + Math.random() * 30, t, 0.2 + big * 0.3, null, 0.25 * big + 0.08, 0.002, { to: 38 });
  },
  sfx(name, arg) {
    if (!this.ready || !Settings.sound) return;
    let e = SFX[name]; if (!e) return;
    if (typeof e === 'function') e = e(arg);
    if (typeof e[0] === 'number') { if (!this.can(name, e[0])) return; e = e.slice(1); }
    const t = this.ctx.currentTime + 0.005, f = v => typeof v === 'string' ? mtof(+v.slice(1)) : v;
    for (const p of e) {
      if (p[0] === 'o') this.osc(p[1], f(p[2]), t + p[3], p[4], null, p[5], p[6], p[7] ? { ...p[7], to: p[7].to && f(p[7].to) } : {});
      else this.noiseBurst(t + p[1], p[2], null, p[3], p[4], p[5], p[6], p[7]);
    }
    if (name === 'death') this.duck(1.6);
  },
  // A synthesized meow: a sawtooth through three moving formant filters.
  meow(kind = 'happy') {
    if (!this.ready || !Settings.sound || !this.can('meow', 350)) return;
    const c = this.ctx, t = c.currentTime + 0.01;
    const dur = kind === 'sad' ? 0.85 : kind === 'big' ? 0.7 : 0.5;
    const shift = rand(-0.06, 0.06);
    const o = c.createOscillator(); o.type = 'sawtooth';
    const f = o.frequency, P = x => x * (1 + shift);
    if (kind === 'sad') { f.setValueAtTime(P(560), t); f.linearRampToValueAtTime(P(640), t + 0.1); f.exponentialRampToValueAtTime(P(330), t + dur); }
    else if (kind === 'big') { f.setValueAtTime(P(330), t); f.linearRampToValueAtTime(P(560), t + 0.16); f.exponentialRampToValueAtTime(P(300), t + dur); }
    else { f.setValueAtTime(P(500), t); f.linearRampToValueAtTime(P(820), t + 0.11); f.linearRampToValueAtTime(P(740), t + 0.24); f.exponentialRampToValueAtTime(P(520), t + dur); }
    const lfo = c.createOscillator(); lfo.frequency.value = 6.2; const lg = c.createGain(); lg.gain.value = 14; lfo.connect(lg); lg.connect(f);
    const out = c.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(0.32, t + 0.04); out.gain.setValueAtTime(0.32, t + dur * 0.7); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const F = [
      [[350, 0], [420, 0.06], [950, 0.2], [620, 0.7], [380, 1]],
      [[1150, 0], [2300, 0.06], [1500, 0.2], [1000, 0.7], [760, 1]],
      [[2700, 0], [2900, 0.1], [2600, 0.5], [2500, 1]],
    ];
    const gains = [1.0, 0.65, 0.25];
    F.forEach((pts, i) => {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = i === 0 ? 7 : 10;
      pts.forEach(([hz, at], k) => { if (k === 0) bp.frequency.setValueAtTime(hz, t); else bp.frequency.linearRampToValueAtTime(hz, t + at * dur); });
      const g = c.createGain(); g.gain.value = gains[i] * 3.2;
      o.connect(bp); bp.connect(g); g.connect(out);
    });
    // the 'm': a nasal lowpass at the start
    out.connect(this.sfxBus);
    const rs = c.createGain(); rs.gain.value = 0.35; out.connect(rs); rs.connect(this.revSend);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  },
  duck(sec) {
    if (!this.ready || this.paused) return;
    const t = this.ctx.currentTime, f = this.musicLP.frequency;
    f.cancelScheduledValues(t); f.setValueAtTime(f.value, t); f.exponentialRampToValueAtTime(500, t + 0.08); f.exponentialRampToValueAtTime(18000, t + sec);
  },
  crush(on) {
    if (!this.ready) return;
    if (!on) { this.crusher.curve = null; return; }
    const n = 2048, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.round(x * 5) / 5; }
    this.crusher.curve = cv;
  },
  pan(x) { if (this.ready && this.musicPan.pan) this.musicPan.pan.setTargetAtTime(clamp(x, -1, 1) * 0.85, this.ctx.currentTime, 0.1); },
  tempo(m) { this.bpmMul = m; },
  drone(on) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    if (on && !this.droneNodes) {
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 2); g.connect(this.sfxBus);
      const o1 = c.createOscillator(); o1.frequency.value = 41; const o2 = c.createOscillator(); o2.frequency.value = 61.7; o2.type = 'triangle';
      const lfo = c.createOscillator(); lfo.frequency.value = 0.21; const lg = c.createGain(); lg.gain.value = 0.06; lfo.connect(lg); lg.connect(g.gain);
      o1.connect(g); o2.connect(g); o1.start(); o2.start(); lfo.start();
      this.droneNodes = { g, o: [o1, o2, lfo] };
    } else if (!on && this.droneNodes) {
      const d = this.droneNodes; this.droneNodes = null;
      d.g.gain.setTargetAtTime(0.0001, t, 0.4); d.o.forEach(o => o.stop(t + 2));
    }
  },

  // ----- music: picking a track -----
  // every track the player can choose: the menu, a track per chapter reached, a theme per boss beaten
  tracks() {
    const out = [{ id: 'menu', name: TRACKS.menu.name }], reached = Save.d ? Save.maxReached() : 1, S = Save.d ? Save.d.tracks : {};
    for (let n = 1; n <= CHAPTERS.length; n++) out.push({ id: 'ch' + n, name: TRACKS['ch' + n].name, locked: n > reached && !S['ch' + n] });
    for (const b of BOSS_ORDER) out.push({ id: 'boss:' + b, name: BOSS_DEFS[b].name + ' (boss theme)', locked: !S[b] });
    return out;
  },
  setKey(i) { this.chapter = i; }, // kept for callers; tracks carry their own keys now
  music(mode, wave, force) {
    const prev = this.trackId; this.mode = mode; this.wave = wave || 1;
    const P = Settings.musicPick || 'auto', open = this.tracks().filter(t => !t.locked).map(t => t.id);
    let id;
    if (P.startsWith('file:') && this.custom.some(t => 'file:' + t.id === P)) id = P;
    else if (P === 'shuffle') id = !force && prev && open.includes(prev) && mode === this.lastMode ? prev : pick(open);
    else if (P !== 'auto' && open.includes(P)) id = P;
    else if (mode === 'title' || mode === 'tutorial') id = 'menu';
    else if (mode === 'over') id = 'over';
    else {
      const d = Director.def;
      if (mode.startsWith('boss') && d && d.boss) id = 'boss:' + d.boss;
      else id = CH_TRACK(Game.variant === 'endless' ? (Game.wave - 1) % CHAPTERS.length + 1 : d ? d.chapter || 1 : 1); // Endless walks through the playlist as the waves go up
    }
    this.lastMode = mode;
    if (id === prev && !force) return;
    this.trackId = id;
    if (id.startsWith('file:')) { this.playFile(+id.slice(5)); return; }
    this.stopFile();
    const boss = id.startsWith('boss:'), base = boss ? TRACKS[CH_TRACK(BOSS_ORDER.indexOf(id.slice(5)) + 1)] : TRACKS[id] || TRACKS.menu;
    this.track = base; this.isBoss = boss; this.bpm = base.bpm * (boss ? 1.1 : 1);
    this.seed = fnv(id); this.lead = this.makeLead();
  },
  makeLead() { // a two-bar motif in the track's scale, re-used with variation
    const notes = [], rnd = seeded(this.seed);
    let deg = 4;
    for (let i = 0; i < 32; i++) {
      const on = (i % 4 === 0 && rnd() < 0.85) || (i % 2 === 0 && rnd() < 0.35) || rnd() < 0.08;
      if (!on) { notes.push(null); continue; }
      deg = clamp(deg + Math.round((rnd() - 0.5) * 4), 0, 9);
      notes.push({ deg, len: rnd() < 0.3 ? 4 : rnd() < 0.6 ? 2 : 1 });
    }
    return notes;
  },
  computeIntensity() {
    if (['title', 'over', 'paused'].includes(Game.state)) return 0;
    if (this.isBoss) return 4;
    if (Director.phase === 'intro' || Director.phase === 'clear' || Game.mode === 'tutorial') return 1;
    return Game.enemies.length > 18 || Player.nq >= 3 ? 3 : 2;
  },
  update(dt) {
    if (!this.ready) return;
    const dip = Game.timeScale < 0.5; // dip the music during measurement slow motion
    if (dip !== !!this.dipped && !this.paused && Game.state === 'playing') {
      this.dipped = dip;
      const f = this.musicLP.frequency, t = this.ctx.currentTime;
      f.cancelScheduledValues(t); f.setValueAtTime(Math.max(200, f.value), t); f.setTargetAtTime(dip ? 700 : 18000, t, dip ? 0.05 : 0.25);
    }
  },
  // pausing muffles and lowers the music
  setPaused(on) {
    this.paused = on; if (!this.ready) return;
    const t = this.ctx.currentTime, f = this.musicLP.frequency, g = this.damp.gain;
    for (const p of [f, g]) { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); } // a death duck or slow-motion dip still queued would undo this
    f.setTargetAtTime(on ? 520 : 18000, t, 0.12); g.setTargetAtTime(on ? 0.3 : 1, t, 0.12); this.dipped = false;
  },
  schedule() {
    if (!this.ready || this.ctx.state !== 'running') return;
    const c = this.ctx;
    if (this.nextT < c.currentTime - 0.2) this.nextT = c.currentTime + 0.05;
    while (this.nextT < c.currentTime + 0.13) {
      this.playStep(this.step, this.nextT);
      this.nextT += 60 / (this.bpm * this.bpmMul * this.phaseMul()) / 4; this.step++;
    }
  },
  phaseMul() { const b = this.isBoss && Game.boss && !Game.boss.dead ? Game.boss.phase : 1; return b >= 3 ? 1.08 : 1; },
  playStep(step, t) {
    const T = this.track; if (!T || this.fileEl || !Settings.music || !Settings.sound) return;
    const I = this.intensity = this.computeIntensity(), boss = this.isBoss, ph = boss && Game.boss && !Game.boss.dead ? Game.boss.phase : 1;
    const bar = Math.floor(step / 16), s = step % 16, sc = SCALES[T.scale], bus = this.musicBus, bars = T.bars || 1;
    const spb = 60 / (this.bpm * this.bpmMul * this.phaseMul()) / 4;
    if (s % 2 && T.swing) t += spb * T.swing;
    const deg = T.prog[Math.floor(bar / bars) % T.prog.length];
    const note = d => T.root + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const tone = k => note(deg + [0, 2, 4][k % 3] + 7 * Math.floor(k / 3)); // chord tones climbing through octaves
    const nq = Game.state === 'title' ? 2 : Player.nq, bright = 900 + nq * 700 + I * 300;
    // pad: one chord per change
    if (s === 0 && bar % bars === 0) {
      const lp = T.pad.sweep ? 450 + 1500 * (0.5 + 0.5 * Math.sin(bar * 0.35)) : T.pad.lp + I * 120;
      for (let k = 0; k < 3; k++) for (const d of [-7, 7]) this.osc(T.pad.w, mtof(tone(k) + 24), t, spb * 16 * bars * 0.95, bus, (I === 0 ? 1.15 : 1) * T.pad.a, spb * 4, { lp, detune: d, rev: 0.6 });
    }
    // bass
    const bc = T.bass && T.bass.p[s];
    if (bc && bc !== '-' && (I >= 1 || bc === '=')) {
      const m = bc === 'o' ? tone(0) + 12 : bc === '5' ? note(deg + 4) : bc === '3' ? tone(1) : tone(0);
      this.osc(boss ? 'sawtooth' : T.bass.w, mtof(m), t, bc === '=' ? spb * 14 : spb * (boss || I >= 3 ? 0.9 : 1.6), bus, 0.12 * (bc === '=' && I === 0 ? 0.6 : 1), 0.004, { lp: T.bass.lp * (boss ? 1.8 : 1) + I * 60, lpTo: 140, q: 3 });
    }
    // arpeggios (two of different lengths drift in and out of phase)
    for (const A of [T.arp, T.arp2]) {
      if (!A || s % (A.div || 1) || (A === T.arp2 && I < 2)) continue;
      const k = Math.floor(step / (A.div || 1)) % A.p.length, ch = A.p[k]; if (ch === '-') continue;
      const r = A.rnd ? fnv(this.seed + ':' + step) / 4294967296 : 0, idx = A.rnd ? Math.floor(r * 6) : +ch;
      const m = tone(idx) + (A.o || 12) + (A.rnd && r > 0.8 ? 12 : 0) + (boss && ph >= 2 ? 12 : 0);
      this.osc(A.w, mtof(m), t, spb * (A.div || 1) * 0.8, bus, A.a * (I === 0 ? 0.8 : 1), 0.002, { lp: Math.min(9000, bright * (A.w === 'sine' ? 2 : 1)), lpTo: 300, del: 0.32 });
    }
    // more qubits, more voices
    if (nq >= 2 && s % 4 === 2) this.osc('triangle', mtof(tone(s % 3) + 36), t, spb * 0.6, bus, 0.012, 0.002, { del: 0.4 });
    if (nq >= 5 && s % 2) this.osc('square', mtof(tone((s * 5) % 6) + 36), t, spb * 0.4, bus, 0.008, 0.002, { lp: 8000, del: 0.5 });
    // drums
    const D = T.drums || {}, hit = p => p && p[s] === 'x';
    if (I >= 2 && (hit(D.k) || boss && s % 4 === 0)) this.kick(t, I >= 4 ? 1 : 0.85);
    if (I === 1 && s === 0 && Game.state === 'playing') this.kick(t, 0.5);
    if (I >= 2 && (hit(D.s) || boss && (s === 4 || s === 12))) this.snare(t, 0.8);
    if (boss && ph >= 2 && bar % 2 && s >= 12) this.snare(t, 0.3 + (s - 12) * 0.15);
    const hc = D.h && D.h[s];
    if (I >= 1 && (hc === 'x' || hc === 'o')) this.hat(t, s % 4 === 2 ? 0.5 : 0.28, hc === 'o');
    if ((boss && ph >= 3 || I >= 4 && !D.h) && s % 2) this.hat(t, 0.16, false);
    if (D.fill && I >= 2 && fnv(this.seed + '/' + step) / 4294967296 < D.fill) (step & 1 ? this.hat(t, 0.35, false) : this.snare(t, 0.35));
    // signature percussion
    if (T.perc === 'tick' && I >= 1 && s % 2 === 0) this.osc('square', s % 4 ? 2400 : 3000, t, 0.012, bus, s % 4 ? 0.025 : 0.04, 0.0005, { lp: 6000 });
    if (T.perc === 'clock' && I >= 1 && s % 4 === 0) this.osc('triangle', s % 8 ? 1500 : 1900, t, 0.03, bus, 0.05, 0.0005);
    if (T.perc === 'geiger' && Math.random() < 0.06 + 0.06 * I + (Director.def ? 0.02 * ((Director.def.n - 1) % 4) : 0)) this.noiseBurst(t + Math.random() * spb, 0.006, bus, 0.25, 'highpass', 2600);
    // lead on top when things get busy
    if (I >= 3) {
      const ln = this.lead[(bar % 2) * 16 + s];
      if (ln) this.osc('sawtooth', mtof(note(ln.deg + (bar % 4 === 3 ? 2 : 0)) + 24 + (boss && ph >= 2 ? 12 : 0)), t, spb * ln.len * 0.95, bus, 0.04, 0.01, { lp: 2800, rev: 0.4, del: 0.3, detune: Math.sin(t * 30) * 6 });
    }
  },
  kick(t, v) {
    const c = this.ctx, o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    const g = c.createGain(); g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.4);
    this.noiseBurst(t, 0.012, this.musicBus, 0.1 * v, 'highpass', 3000);
  },
  snare(t, v) { this.noiseBurst(t, 0.17, this.musicBus, 0.3 * v, 'bandpass', 1900, null, 0.7); this.osc('triangle', 190, t, 0.09, this.musicBus, 0.18 * v, 0.001, { to: 140 }); },
  hat(t, v, open) { this.noiseBurst(t, open ? 0.22 : 0.035, this.musicBus, 0.12 * v, 'highpass', 7600); },

  // ----- your own music: files kept in this browser (IndexedDB), never in the game file -----
  custom: [], fileEl: null,
  idb(mode, fn) {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('qcat-music', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('t', { keyPath: 'id' });
        r.onsuccess = () => { const tx = r.result.transaction('t', mode), q = fn(tx.objectStore('t')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async loadFiles() { try { const all = await this.idb('readonly', st => st.getAll()); this.custom = (all || []).map(({ id, name }) => ({ id, name })); } catch (e) { this.custom = []; } },
  async addFiles(list) {
    let n = 0;
    for (const f of [...list]) { if (!/^audio\//.test(f.type) && !/\.(mp3|ogg|wav|m4a|aac|flac|opus)$/i.test(f.name)) continue; try { await this.idb('readwrite', st => st.put({ id: Date.now() + n, name: f.name.replace(/\.[^.]+$/, ''), blob: f })); n++; } catch (e) { /* storage full or blocked */ } }
    await this.loadFiles(); return n;
  },
  async clearFiles() { this.stopFile(); try { await this.idb('readwrite', st => st.clear()); } catch (e) { /* nothing stored */ } this.custom = []; },
  async playFile(id) {
    this.stopFile();
    try {
      const rec = await this.idb('readonly', st => st.get(id)); if (!rec || this.trackId !== 'file:' + id) return;
      const a = new Audio(URL.createObjectURL(rec.blob)); a.loop = true;
      if (this.ready) { const src = this.ctx.createMediaElementSource(a); src.connect(this.musicBus); }
      this.fileEl = a; await a.play();
    } catch (e) { this.fileEl = null; this.trackId = null; Settings.musicPick = 'auto'; this.music(this.mode, this.wave, true); }
  },
  stopFile() { if (this.fileEl) { this.fileEl.pause(); URL.revokeObjectURL(this.fileEl.src); this.fileEl = null; } },

  // ----- the announcer: says less, picks the best voice on the device -----
  voices() { try { return (speechSynthesis.getVoices() || []).filter(v => /^en/i.test(v.lang)); } catch (e) { return []; } },
  bestVoice() {
    const vs = this.voices(), want = Settings.voiceName;
    if (want) { const v = vs.find(v => v.name === want); if (v) return v; }
    const score = v => (/natural|neural|online|premium|enhanced/i.test(v.name) ? 6 : 0) + (/en-GB/i.test(v.lang) ? 3 : 0) + (/google uk english male|daniel|george|arthur|ryan|thomas|oliver/i.test(v.name) ? 3 : 0) + (v.localService ? 0 : 1)
      - (/compact|novelty|whisper|bells|bad news|boing|bubbles|cellos|zarvox|trinoids|albert|fred|jester|organ|superstar|wobble|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i.test(v.name) ? 8 : 0);
    return vs.sort((a, b) => score(b) - score(a))[0] || null;
  },
  // prio: 0 chatter (only when chatty), 1 normal, 2 big moments
  say(text, prio = 1, force) {
    const lv = { off: 9, some: 1, all: 0 }[Settings.announcer] ?? 1;
    if (!force && (!Settings.voice || !Settings.sound || Game.mode === 'attract' || prio < lv)) return;
    try {
      if (!('speechSynthesis' in window)) return;
      const sy = window.speechSynthesis, now = performance.now(), gap = Settings.announcer === 'all' ? 1200 : 3500;
      if (!force && prio < 2 && this.lastSay && now - this.lastSay < gap) return;
      sy.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (!this.voice) this.voice = this.bestVoice();
      if (this.voice) u.voice = this.voice;
      u.rate = 1.02; u.pitch = 0.82; u.volume = 0.9;
      sy.speak(u); this.lastSay = now;
    } catch (e) { /* no voice for us */ }
  },
};
