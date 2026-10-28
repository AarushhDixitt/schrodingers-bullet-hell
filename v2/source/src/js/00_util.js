// ---------- math & random ----------
const TAU = Math.PI * 2;
const PI = Math.PI;
const SQRT1_2 = Math.SQRT1_2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const easeOutCubic = t => 1 - (1 - t) * (1 - t) * (1 - t);
const easeInCubic = t => t * t * t;
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOutElastic = t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1);
function angDiff(a, b) { let d = (b - a) % TAU; if (d > PI) d -= TAU; else if (d < -PI) d += TAU; return d; }
const rand = (a, b) => (b === undefined ? Math.random() * (a === undefined ? 1 : a) : a + Math.random() * (b - a));
const randi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const chance = p => Math.random() < p;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function gauss() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function weightedPick(items, w) {
  let total = 0; for (const it of items) total += Math.max(0, w(it));
  let r = Math.random() * total;
  for (const it of items) { r -= Math.max(0, w(it)); if (r <= 0) return it; }
  return items[items.length - 1];
}
const len2 = (x, y) => x * x + y * y;
const len = (x, y) => Math.sqrt(x * x + y * y);
function norm(x, y) { const l = Math.sqrt(x * x + y * y) || 1; return [x / l, y / l]; }
let _uid = 1;
const uid = () => _uid++;

// Value noise for camera shake etc.
function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const h = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

// ---------- formatting ----------
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' };
const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
const supNum = n => String(n).split('').map(c => SUP[c] || c).join('');
const subNum = n => String(n).split('').map(c => SUB[c] || c).join('');
const fmtInt = n => Math.floor(n).toLocaleString('en-US');
// odds from log10(probability) (<= 0)
function fmtOddsLog(log10p) {
  const e = -log10p;
  if (e < 0.0001) return 'certain';
  if (e < 6) { const v = Math.pow(10, e); return '1 in ' + (v < 10 ? v.toFixed(1) : fmtInt(Math.round(v))); }
  const ex = Math.floor(e); const m = Math.pow(10, e - ex);
  return '1 in ' + m.toFixed(1) + '×10' + supNum(ex);
}
function fmtPct(p) {
  if (p >= 0.995) return (p * 100).toFixed(0) + '%';
  if (p >= 0.1) return (p * 100).toFixed(1) + '%';
  if (p >= 0.001) return (p * 100).toFixed(2) + '%';
  return (p * 100).toExponential(1) + '%';
}
function fmtFrac(p) {
  // nice fraction for powers of 2 etc.
  for (const d of [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32]) {
    const n = Math.round(p * d);
    if (n > 0 && Math.abs(n / d - p) < 1e-6) {
      const g = gcd(n, d); return (n / g) + '/' + (d / g);
    }
  }
  return fmtPct(p);
}
function gcd(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }
function fmtTime(s) { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); const r = s % 60; return m + ':' + String(r).padStart(2, '0'); }
const ketBits = (b, n) => n <= 0 ? '|0⟩' : '|' + b.toString(2).padStart(n, '0').split('').reverse().join('') + '⟩';

// ---------- colour ----------
// Domain colouring of the wavefunction phase: arg ψ → hue.
const PHASE_STOPS = [[76, 242, 255], [255, 207, 74], [255, 63, 180], [125, 92, 255]];
function phaseRGB(phi) {
  const t = ((((phi % TAU) + TAU) % TAU) / TAU) * 4;
  const i = Math.floor(t) % 4, f = t - Math.floor(t);
  const a = PHASE_STOPS[i], b = PHASE_STOPS[(i + 1) % 4];
  const s = f * f * (3 - 2 * f);
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
}
const PHASE_N = 32;
const phaseIndex = phi => Math.round(((((phi % TAU) + TAU) % TAU) / TAU) * PHASE_N) % PHASE_N;
const rgbStr = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Named colours (classical matter is warm; the wavefunction owns the rainbow).
const COL = {
  white: [255, 255, 255], chalk: [236, 231, 255], dim: [154, 147, 196],
  red: [255, 59, 85], orange: [255, 138, 40], amber: [255, 186, 72], yellow: [255, 232, 110],
  pink: [255, 96, 200], ice: [140, 212, 255], violet: [176, 128, 255], green: [96, 255, 156],
  coral: [255, 112, 92], blue: [90, 140, 255], gold: [255, 207, 74], cyan: [76, 242, 255],
  magenta: [255, 63, 180], grid: [62, 50, 128], gridHot: [150, 128, 255], void: [12, 10, 24],
  black: [0, 0, 0], blood: [200, 20, 50],
};
// Palette: [0..PHASE_N) phase hues, then named colours.
const PAL = [];
for (let i = 0; i < PHASE_N; i++) PAL.push(phaseRGB((i / PHASE_N) * TAU));
const PI_ = {}; // palette index of named colours
for (const k of Object.keys(COL)) { PI_[k] = PAL.length; PAL.push(COL[k]); }
const PAL_CSS = PAL.map(rgbStr);

// ---------- sprites ----------
const spriteCache = new Map();
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
function glowSprite(ci, size = 64) {
  const key = 'g' + ci + ':' + size;
  let c = spriteCache.get(key); if (c) return c;
  const rgb = PAL[ci];
  c = makeCanvas(size, size); const x = c.getContext('2d'); const r = size / 2;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.16, rgba(rgb, 1));
  g.addColorStop(0.42, rgba(rgb, 0.32));
  g.addColorStop(1, rgba(rgb, 0));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  spriteCache.set(key, c); return c;
}
function softSprite(ci, size = 64) { // no white core: fog/halo
  const key = 's' + ci + ':' + size;
  let c = spriteCache.get(key); if (c) return c;
  const rgb = PAL[ci];
  c = makeCanvas(size, size); const x = c.getContext('2d'); const r = size / 2;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, rgba(rgb, 0.9)); g.addColorStop(0.5, rgba(rgb, 0.25)); g.addColorStop(1, rgba(rgb, 0));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  spriteCache.set(key, c); return c;
}
// Enemy bullet: halo + coloured ring + white core. Ring radius = 0.23*size.
const EB_RING = 0.23;
function bulletSprite(ci, kind) {
  const key = 'b' + ci + ':' + kind;
  let c = spriteCache.get(key); if (c) return c;
  const rgb = PAL[ci];
  const size = 96; c = makeCanvas(size, size); const x = c.getContext('2d'); const r = size / 2;
  const g = x.createRadialGradient(r, r, r * 0.15, r, r, r);
  g.addColorStop(0, rgba(rgb, 0.65)); g.addColorStop(0.45, rgba(rgb, 0.22)); g.addColorStop(1, rgba(rgb, 0));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  if (kind === 1) { // rice / oval, pointing +x
    x.save(); x.translate(r, r); x.scale(1.7, 0.75);
    x.beginPath(); x.arc(0, 0, size * EB_RING, 0, TAU); x.fillStyle = rgbStr(rgb); x.fill();
    x.beginPath(); x.arc(0, 0, size * EB_RING * 0.58, 0, TAU); x.fillStyle = '#fff'; x.fill();
    x.restore();
  } else if (kind === 3) { // mine: spiky
    x.save(); x.translate(r, r);
    x.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; const rr = (i % 2 ? 0.72 : 1) * size * EB_RING * 1.15; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    x.closePath(); x.fillStyle = rgbStr(rgb); x.fill();
    x.beginPath(); x.arc(0, 0, size * EB_RING * 0.5, 0, TAU); x.fillStyle = '#fff'; x.fill();
    x.restore();
  } else {
    x.beginPath(); x.arc(r, r, size * EB_RING, 0, TAU); x.fillStyle = rgbStr(rgb); x.fill();
    x.lineWidth = size * 0.02; x.strokeStyle = 'rgba(255,255,255,.7)'; x.stroke();
    x.beginPath(); x.arc(r, r, size * EB_RING * (kind === 2 ? 0.62 : 0.55), 0, TAU); x.fillStyle = '#fff'; x.fill();
  }
  spriteCache.set(key, c); return c;
}

// ---------- the cat (original design: a box-headed cat) ----------
// variant: 0 open eyes, 1 blink, 2 dead (×× eyes), 3 happy (^^)
function catSprite(ci, variant) {
  const key = 'cat' + ci + ':' + variant;
  let c = spriteCache.get(key); if (c) return c;
  const rgb = PAL[ci];
  const S = 128; c = makeCanvas(S, S); const x = c.getContext('2d');
  x.translate(S / 2, S / 2); x.scale(S / 100, S / 100); x.translate(-50, -52);
  const outline = () => {
    x.beginPath();
    x.moveTo(24, 82);
    x.quadraticCurveTo(18, 82, 18, 74);
    x.lineTo(18, 40);
    x.lineTo(24, 12);           // left ear tip
    x.lineTo(40, 30);
    x.lineTo(60, 30);
    x.lineTo(76, 12);           // right ear tip
    x.lineTo(82, 40);
    x.lineTo(82, 74);
    x.quadraticCurveTo(82, 82, 74, 82);
    x.closePath();
  };
  x.lineJoin = 'round'; x.lineCap = 'round';
  // glow
  outline(); x.strokeStyle = rgba(rgb, 0.16); x.lineWidth = 14; x.stroke();
  outline(); x.fillStyle = rgba(rgb, 0.16); x.fill();
  outline(); x.strokeStyle = rgbStr(rgb); x.lineWidth = 4.2; x.stroke();
  // inner ear
  x.beginPath(); x.moveTo(25, 23); x.lineTo(24, 34); x.lineTo(33, 31); x.closePath();
  x.moveTo(75, 23); x.lineTo(76, 34); x.lineTo(67, 31); x.closePath();
  x.fillStyle = rgba(rgb, 0.55); x.fill();
  // eyes
  x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 3.4;
  if (variant === 0) {
    for (const ex of [37, 63]) {
      x.beginPath(); x.ellipse(ex, 53, 6.2, 8.6, 0, 0, TAU); x.fill();
      x.beginPath(); x.ellipse(ex, 53, 2.1, 6.4, 0, 0, TAU); x.fillStyle = rgbStr(mixRGB(rgb, [0, 0, 0], 0.45)); x.fill(); x.fillStyle = '#fff';
    }
  } else if (variant === 1) {
    x.beginPath(); x.moveTo(31, 54); x.lineTo(43, 54); x.moveTo(57, 54); x.lineTo(69, 54); x.stroke();
  } else if (variant === 2) {
    x.beginPath();
    for (const ex of [37, 63]) { x.moveTo(ex - 5.5, 48); x.lineTo(ex + 5.5, 59); x.moveTo(ex + 5.5, 48); x.lineTo(ex - 5.5, 59); }
    x.stroke();
  } else {
    x.beginPath();
    for (const ex of [37, 63]) { x.moveTo(ex - 6, 56); x.lineTo(ex, 49); x.lineTo(ex + 6, 56); }
    x.stroke();
  }
  // nose + mouth
  x.beginPath(); x.moveTo(47, 63); x.lineTo(53, 63); x.lineTo(50, 66.5); x.closePath(); x.fillStyle = rgbStr(rgb); x.fill();
  x.beginPath(); x.moveTo(50, 66.5); x.quadraticCurveTo(46, 71, 42.5, 69); x.moveTo(50, 66.5); x.quadraticCurveTo(54, 71, 57.5, 69);
  x.strokeStyle = rgba(rgb, 0.9); x.lineWidth = 2; x.stroke();
  // whiskers
  x.beginPath();
  x.moveTo(30, 64); x.lineTo(4, 59); x.moveTo(30, 67); x.lineTo(4, 68); x.moveTo(31, 70); x.lineTo(7, 77);
  x.moveTo(70, 64); x.lineTo(96, 59); x.moveTo(70, 67); x.lineTo(96, 68); x.moveTo(69, 70); x.lineTo(93, 77);
  x.strokeStyle = rgba(rgb, 0.7); x.lineWidth = 1.6; x.stroke();
  spriteCache.set(key, c); return c;
}

// ---------- tiny DOM helpers ----------
const $ = id => document.getElementById(id);
function store(key, val) {
  try {
    if (val === undefined) { const v = localStorage.getItem('qcat:' + key); return v == null ? null : JSON.parse(v); }
    localStorage.setItem('qcat:' + key, JSON.stringify(val));
  } catch (e) { /* storage may be blocked */ }
  return null;
}
