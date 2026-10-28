// ---------- audio: procedural synthwave, synthesized sfx, a meow, an announcer ----------
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = {
  Am: { n: [57, 60, 64], b: 45 }, F: { n: [57, 60, 65], b: 41 }, C: { n: [55, 60, 64], b: 48 }, G: { n: [55, 59, 62], b: 43 },
  Dm: { n: [57, 62, 65], b: 50 }, E: { n: [56, 59, 64], b: 40 }, Bb: { n: [58, 62, 65], b: 46 }, Em: { n: [55, 59, 64], b: 40 },
  Fm: { n: [56, 60, 65], b: 41 }, Esus: { n: [57, 59, 64], b: 40 },
};
const PROGS = {
  title: ['Am', 'F', 'C', 'G'],
  wave: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'],
  boss: ['Am', 'Bb', 'Am', 'E', 'Am', 'Bb', 'Dm', 'E'],
  boss2: ['Am', 'Bb', 'Fm', 'E', 'Am', 'Bb', 'Dm', 'Esus'],
  wave2: ['Am', 'Em', 'F', 'G', 'Am', 'Em', 'Dm', 'E'],
  wave3: ['Dm', 'F', 'Am', 'G', 'Dm', 'Bb', 'C', 'E'],
  bossB: ['Am', 'Fm', 'Am', 'E', 'Dm', 'Fm', 'Bb', 'E'],
  bossC: ['Am', 'Am', 'Bb', 'Bb', 'Dm', 'Dm', 'E', 'Esus'],
  over: ['Am', 'F', 'Dm', 'E'],
};
const SCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor (A)

const Audio2 = {
  ctx: null, ready: false,
  master: null, comp: null, pre: null, crusher: null, sfxBus: null, musicBus: null, musicLP: null, musicPan: null, reverb: null, revSend: null, delay: null, delSend: null,
  noise: null, last: {}, seqTimer: null,
  mode: 'title', wave: 1, bpm: 112, bpmMul: 1, step: 0, nextT: 0, intensity: 0, lead: [], droneNodes: null, voices: null, key: 0, vari: 0, prog: 'title',
  // each chapter gets its own key and chord progression
  setKey(i) { const K = [0, -2, 3, -4, 5, 1, -3, 2, -5]; this.key = K[((i % 9) + 9) % 9]; this.vari = ((i % 3) + 3) % 3; },

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
    this.musicBus.connect(this.musicLP); this.musicLP.connect(this.musicPan); this.musicPan.connect(this.pre);
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
    const t = this.ctx.currentTime + 0.005, c = this.ctx;
    switch (name) {
      case 'split': {
        const base = [69, 73, 76, 81, 85][Math.min(4, (arg || 1) - 1)];
        for (let k = 0; k < 3; k++) this.osc('square', mtof(base + [0, 4, 7][k] + 12), t + k * 0.035, 0.12, null, 0.07, 0.003, { lp: 4200, rev: 0.4, del: 0.25 });
        this.noiseBurst(t, 0.25, null, 0.05, 'highpass', 2000, 9000);
        break;
      }
      case 'foldStart': this.noiseBurst(t, 0.22, null, 0.12, 'bandpass', 300, 4000, 2); break;
      case 'fold': {
        const N = arg || 2;
        this.osc('sine', 140, t, 0.7, null, 0.5, 0.002, { to: 32 });
        this.noiseBurst(t, 0.5, null, 0.22 + Math.min(0.2, N * 0.01), 'lowpass', 1800, 90);
        for (const m of [69, 73, 76, 81]) this.osc('sawtooth', mtof(m), t, 0.6, null, 0.05, 0.004, { lp: 3000, lpTo: 400, rev: 0.6 });
        break;
      }
      case 'survive': {
        const lift = arg < 0.2 ? 12 : 0;
        for (const [k, m] of [69, 73, 76, 81].entries()) this.osc('triangle', mtof(m + lift), t + k * 0.04, 0.9, null, 0.09, 0.004, { rev: 0.7 });
        this.osc('sine', mtof(93 + lift), t + 0.12, 1.1, null, 0.05, 0.004, { rev: 0.8, del: 0.4 });
        break;
      }
      case 'death': {
        for (const [k, m] of [69, 65, 62, 57, 50].entries()) this.osc('sawtooth', mtof(m), t + k * 0.11, 0.5, null, 0.09, 0.004, { lp: 1600, lpTo: 300, rev: 0.6 });
        this.noiseBurst(t, 1.2, null, 0.35, 'lowpass', 3000, 60);
        this.osc('sine', 90, t, 1.2, null, 0.5, 0.002, { to: 25 });
        this.duck(1.6);
        break;
      }
      case 'decohere': this.osc('triangle', 900, t, 0.55, null, 0.12, 0.01, { to: 160, rev: 0.5 }); break;
      case 'shutter': this.noiseBurst(t, 0.02, null, 0.25, 'highpass', 4000); this.noiseBurst(t + 0.05, 0.03, null, 0.2, 'highpass', 2500); break;
      case 'charge': this.osc('sine', 300, t, 0.8, null, 0.06, 0.05, { to: 1300 }); break;
      case 'eshot': if (this.can('eshot', 70)) this.osc('sawtooth', 640, t, 0.07, null, 0.035, 0.002, { to: 260, lp: 2400 }); break;
      case 'bossShot': if (this.can('bshot', 90)) { this.osc('square', 90, t, 0.22, null, 0.09, 0.003, { to: 50, lp: 700 }); this.noiseBurst(t, 0.12, null, 0.08, 'bandpass', 900); } break;
      case 'graze': if (this.can('graze', 60)) this.osc('sine', 2600 + Math.random() * 400, t, 0.03, null, 0.03, 0.001); break;
      case 'pickup': this.osc('sine', mtof(88), t, 0.15, null, 0.1, 0.003, { rev: 0.5 }); this.osc('sine', mtof(95), t + 0.06, 0.25, null, 0.08, 0.003, { rev: 0.6 }); break;
      case 'power': for (let k = 0; k < 5; k++) this.osc('square', mtof(69 + [0, 4, 7, 12, 16][k]), t + k * 0.05, 0.18, null, 0.06, 0.003, { lp: 5000, rev: 0.5, del: 0.3 }); break;
      case 'life': for (let k = 0; k < 6; k++) this.osc('square', mtof(69 + [0, 4, 7, 12, 7, 12][k] + 12), t + k * 0.08, 0.2, null, 0.06, 0.003, { lp: 6000, rev: 0.5 }); break;
      case 'clear': for (let k = 0; k < 4; k++) this.osc('triangle', mtof(69 + [0, 4, 7, 12][k]), t + k * 0.09, 0.6, null, 0.1, 0.004, { rev: 0.6, del: 0.3 }); break;
      case 'bossIntro': {
        for (const [m, d] of [[33, -12], [45, 9], [40, -5], [33, 14]]) this.osc('sawtooth', mtof(m), t, 2.6, null, 0.09, 0.8, { lp: 180, lpTo: 2200, detune: d, rev: 0.5 });
        this.noiseBurst(t, 2.2, null, 0.06, 'bandpass', 200, 3000, 3);
        break;
      }
      case 'bossPhase': this.osc('square', 55, t, 0.9, null, 0.2, 0.002, { lp: 1200, lpTo: 200 }); this.noiseBurst(t, 0.6, null, 0.25, 'lowpass', 4000, 100); break;
      case 'bossDeath': {
        this.noiseBurst(t, 2.4, null, 0.4, 'lowpass', 5000, 50); this.osc('sine', 70, t, 2.2, null, 0.6, 0.002, { to: 20 });
        for (const [k, m] of [57, 61, 64, 69, 73, 76].entries()) this.osc('triangle', mtof(m + 12), t + 0.4 + k * 0.07, 1.8, null, 0.07, 0.01, { rev: 0.8 });
        break;
      }
      case 'rewind': { const o = this.osc('sawtooth', 200, t, 2.0, null, 0.07, 0.05, { to: 1400, lp: 2600 }); void o; this.noiseBurst(t, 2.0, null, 0.05, 'bandpass', 1200, 4000, 4); break; }
      case 'gate': for (let k = 0; k < 6; k++) this.osc('square', 200 + Math.random() * 1600, t + k * 0.035, 0.04, null, 0.06, 0.001, { lp: 5000 }); this.noiseBurst(t, 0.2, null, 0.1, 'highpass', 1500); break;
      case 'roll': {
        for (let k = 0; k < 7; k++) this.noiseBurst(t + k * 0.045 + Math.random() * 0.02, 0.025, null, 0.16, 'bandpass', 1800 + Math.random() * 1500, null, 2);
        this.osc('sine', 160, t + 0.34, 0.25, null, 0.35, 0.002, { to: 60 });
        this.osc('triangle', mtof(64 + (arg || 1)), t + 0.38, 0.5, null, 0.08, 0.004, { rev: 0.6 });
        break;
      }
      case 'thud': if (this.can('thud', 90)) { this.osc('sine', 120, t, 0.3, null, 0.4, 0.002, { to: 40 }); this.noiseBurst(t, 0.1, null, 0.12, 'lowpass', 800); } break;
      case 'tachyonAim': if (this.can('taim', 120)) this.osc('sine', 1800, t, 0.8, null, 0.025, 0.2, { to: 3200 }); break;
      case 'tachyonDash': if (this.can('tdash', 80)) this.noiseBurst(t, 0.25, null, 0.1, 'bandpass', 4000, 600, 1.5); break;
      case 'annihilate': this.osc('sine', 1100, t, 0.3, null, 0.08, 0.002, { rev: 0.5 }); this.osc('sine', 1320, t + 0.03, 0.3, null, 0.07, 0.002, { rev: 0.5 }); this.noiseBurst(t, 0.15, null, 0.12, 'highpass', 2500); break;
      case 'pop': if (this.can('pop', 50)) this.osc('sine', 700, t, 0.07, null, 0.08, 0.002, { to: 200 }); break;
      case 'zombie': this.osc('sawtooth', 110, t, 0.6, null, 0.08, 0.05, { to: 70, lp: 600, q: 6 }); break;
      case 'respawn': for (let k = 0; k < 6; k++) this.osc('sine', mtof(69 + k * 3), t + k * 0.04, 0.3, null, 0.05, 0.004, { rev: 0.6 }); break;
      case 'deny': if (this.can('deny', 150)) this.osc('square', 110, t, 0.12, null, 0.07, 0.002, { lp: 600 }); break;
      case 'boom': this.explode(50); break;
      case 'door': this.osc('square', 140, t, 0.14, null, 0.08, 0.002, { to: 70, lp: 900 }); this.noiseBurst(t, 0.2, null, 0.1, 'lowpass', 1400, 300); break;
      case 'erase': this.osc('sine', 2200, t, 1.3, null, 0.07, 0.01, { to: 110, rev: 0.6 }); this.noiseBurst(t, 1.2, null, 0.05, 'bandpass', 5000, 300, 3); break;
      case 'ach': for (let k = 0; k < 3; k++) this.osc('triangle', mtof([81, 85, 88][k]), t + k * 0.07, 0.35, null, 0.09, 0.004, { rev: 0.6, del: 0.3 }); break;
      case 'geiger': if (this.can('geiger', 25)) { this.noiseBurst(t, 0.008, null, 0.4, 'highpass', 2600); this.osc('square', 1800, t, 0.006, null, 0.05, 0.0005); } break;
      case 'slam': this.osc('sine', 90, t, 0.5, null, 0.5, 0.002, { to: 28 }); this.noiseBurst(t, 0.35, null, 0.3, 'lowpass', 1800, 120); break;
      case 'zap': if (this.can('zap', 70)) { this.osc('sawtooth', 2400, t, 0.18, null, 0.07, 0.001, { to: 300, lp: 6000 }); this.noiseBurst(t, 0.16, null, 0.12, 'bandpass', 3500, 900, 2); } break;
      case 'glass': for (let k = 0; k < 7; k++) this.osc('sine', 2400 + Math.random() * 3200, t + Math.random() * 0.15, 0.25, null, 0.05, 0.001, { rev: 0.6 }); this.noiseBurst(t, 0.3, null, 0.2, 'highpass', 3000); break;
      case 'choose': this.osc('triangle', mtof(76), t, 0.2, null, 0.08, 0.003, { rev: 0.5 }); this.osc('triangle', mtof(83), t + 0.05, 0.3, null, 0.07, 0.003, { rev: 0.5 }); break;
    }
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
    if (!this.ready) return;
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

  // ----- music -----
  music(mode, wave) {
    this.mode = mode; this.wave = wave || 1;
    this.prog = mode === 'wave' ? ['wave', 'wave2', 'wave3'][this.vari] : mode === 'boss' ? ['boss', 'bossB', 'bossC'][this.vari] : mode;
    this.bpm = mode === 'boss' || mode === 'boss2' ? 128 : mode === 'over' ? 84 : mode === 'title' ? 100 : 112 + Math.min(10, (wave || 1) * 0.5);
    this.lead = this.makeLead();
  },
  makeLead() {
    // a two-bar motif, re-used with variation
    const notes = [];
    let s = (this.wave * 9301 + 49297 + (this.mode.length * 233)) % 233280;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    let deg = 4;
    for (let i = 0; i < 32; i++) {
      const on = (i % 4 === 0 && rnd() < 0.85) || (i % 2 === 0 && rnd() < 0.35) || rnd() < 0.08;
      if (!on) { notes.push(null); continue; }
      deg = clamp(deg + Math.round((rnd() - 0.5) * 4), 0, 9);
      const len = rnd() < 0.3 ? 4 : rnd() < 0.6 ? 2 : 1;
      notes.push({ deg, len });
    }
    return notes;
  },
  degToMidi(deg) { const o = Math.floor(deg / 7), k = ((deg % 7) + 7) % 7; return 69 + o * 12 + SCALE[k]; },
  computeIntensity() {
    if (Game.state === 'title') return 0;
    if (Game.state === 'over') return 0;
    if (Game.state === 'paused') return 0;
    if (this.mode === 'boss' || this.mode === 'boss2') return 4;
    const n = Game.enemies.length;
    if (Director.phase === 'intro' || Director.phase === 'clear') return 1;
    return n > 18 || Player.nq >= 3 ? 3 : 2;
  },
  update(dt) {
    if (!this.ready) return;
    // dip the music during measurement slow-mo
    const dip = Game.timeScale < 0.5;
    if (dip !== !!this.dipped) {
      this.dipped = dip;
      const f = this.musicLP.frequency, t = this.ctx.currentTime;
      f.cancelScheduledValues(t); f.setValueAtTime(Math.max(200, f.value), t); f.setTargetAtTime(dip ? 700 : 18000, t, dip ? 0.05 : 0.25);
    }
  },
  schedule() {
    if (!this.ready || this.ctx.state !== 'running') return;
    const c = this.ctx;
    if (this.nextT < c.currentTime - 0.2) this.nextT = c.currentTime + 0.05;
    while (this.nextT < c.currentTime + 0.13) {
      this.playStep(this.step, this.nextT);
      const spb = 60 / (this.bpm * this.bpmMul) / 4;
      this.nextT += spb; this.step++;
    }
  },
  playStep(step, t) {
    if (!Settings.music || !Settings.sound) return;
    const I = this.intensity = this.computeIntensity();
    const prog = PROGS[this.prog] || PROGS[this.mode] || PROGS.wave, K = this.mode === 'title' || this.mode === 'over' ? 0 : this.key;
    const bar = Math.floor(step / 16), s = step % 16;
    const ch = CHORDS[prog[bar % prog.length]];
    const bus = this.musicBus;
    const spb = 60 / (this.bpm * this.bpmMul) / 4;
    const nq = Game.state === 'title' ? 2 : Player.nq;
    const bright = 900 + nq * 900 + I * 300;
    // pad
    if (s === 0) for (const m of ch.n) for (const d of [-7, 7]) this.osc('sawtooth', mtof(m + K), t, spb * 16 * 0.95, bus, I === 0 ? 0.03 : 0.022, spb * 4, { lp: 900 + I * 150, detune: d, rev: 0.6 });
    // bass
    if (I >= 1) {
      const pat = I >= 3 ? [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1] : I >= 2 ? [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1] : [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
      if (pat[s]) { const oct = (I >= 2 && s % 4 === 2) ? 12 : 0; this.osc('sawtooth', mtof(ch.b + oct + K), t, spb * (I >= 2 ? 0.9 : 6), bus, 0.12, 0.004, { lp: 520 + I * 120, lpTo: 140, q: 3 }); }
    }
    // arp (more qubits → more voices, brighter)
    const tones = [ch.n[0], ch.n[1], ch.n[2], ch.n[0] + 12, ch.n[2], ch.n[1], ch.n[0] + 12, ch.n[1] + 12].map(m => m + K);
    const arpOn = I === 0 ? s % 2 === 0 : true;
    if (arpOn) {
      const m = tones[s % 8] + 12;
      this.osc('square', mtof(m), t, spb * 0.8, bus, 0.032, 0.002, { lp: Math.min(9000, bright), lpTo: 300, del: 0.35 });
      if (nq >= 1 && s % 2 === 1) this.osc('triangle', mtof(m + 12), t, spb * 0.7, bus, 0.022, 0.002, { del: 0.4 });
      if (nq >= 2 && s % 4 === 2) this.osc('square', mtof(m + 7), t, spb * 0.6, bus, 0.018, 0.002, { lp: bright, del: 0.3 });
      if (nq >= 4 && s % 3 === 0) this.osc('sine', mtof(tones[(s * 3) % 8] + 24), t, spb, bus, 0.02, 0.002, { del: 0.5 });
      if (nq >= 5) this.osc('square', mtof(tones[(s * 5) % 8] + 24 + (s % 2) * 7), t, spb * 0.4, bus, 0.012, 0.002, { lp: 8000, del: 0.5 });
    }
    // drums
    if (I >= 2 && s % 4 === 0) this.kick(t, I >= 4 ? 1 : 0.85);
    if (I === 1 && (s === 0 || s === 8) && Game.state === 'playing') this.kick(t, 0.5);
    if (I >= 2 && (s === 4 || s === 12)) this.snare(t, 0.8);
    if (I >= 4 && s === 14 && bar % 2) this.snare(t, 0.35);
    if (I >= 2 && bar % 8 === 7 && s >= 12) this.snare(t, 0.3 + (s - 12) * 0.15);
    if (I >= 1 && s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.5 : 0.28, false);
    if (I >= 3 && s % 2 === 1) this.hat(t, 0.16, false);
    if (I >= 4 && (s === 6 || s === 14)) this.hat(t, 0.35, true);
    // lead
    if (I >= 3) {
      const ln = this.lead[(bar % 2) * 16 + s];
      if (ln) {
        const vary = bar % 4 === 3 ? 2 : 0;
        this.osc('sawtooth', mtof(this.degToMidi(ln.deg + vary) + K), t, spb * ln.len * 0.95, bus, 0.045, 0.01, { lp: 2800, rev: 0.4, del: 0.3, detune: Math.sin(t * 30) * 6 });
      }
    }
  },
  kick(t, v) {
    const c = this.ctx; const o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    const g = c.createGain(); g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.4);
    this.noiseBurst(t, 0.012, this.musicBus, 0.1 * v, 'highpass', 3000);
  },
  snare(t, v) {
    this.noiseBurst(t, 0.17, this.musicBus, 0.3 * v, 'bandpass', 1900, null, 0.7);
    this.osc('triangle', 190, t, 0.09, this.musicBus, 0.18 * v, 0.001, { to: 140 });
  },
  hat(t, v, open) { this.noiseBurst(t, open ? 0.22 : 0.035, this.musicBus, 0.12 * v, 'highpass', 7600); },

  // ----- the announcer -----
  say(text) {
    if (!Settings.voice || !Settings.sound || Game.mode === 'attract') return;
    try {
      if (!('speechSynthesis' in window)) return;
      const sy = window.speechSynthesis;
      if (sy.speaking && this.lastSay && performance.now() - this.lastSay < 1200) return;
      sy.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (!this.voice) {
        const vs = sy.getVoices() || [];
        this.voice = vs.find(v => /en-GB/i.test(v.lang) && /male|daniel|george|arthur/i.test(v.name)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
      }
      if (this.voice) u.voice = this.voice;
      u.rate = 0.98; u.pitch = 0.55; u.volume = 0.9;
      sy.speak(u); this.lastSay = performance.now();
    } catch (e) { /* no voice for us */ }
  },
};
