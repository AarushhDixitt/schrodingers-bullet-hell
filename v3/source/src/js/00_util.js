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
const len = (x, y) => Math.sqrt(x * x + y * y);
let _uid = 1;
const uid = () => _uid++;
// FNV-1a: small stable string hash (timeline ids, name seeds, save tags)
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
// seeded generator for things that must repeat (lead motifs, names)
function seeded(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// Value noise for camera shake etc.
function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const h = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

// struct-of-arrays pool built from one field list ('x y vx flag:u id:i q:s'); kill() swaps the last one in
function Pool(max, spec) {
  const p = { n: 0, max, A: [] }, T = { u: Uint8Array, i: Int32Array, s: Int8Array };
  for (const f of spec.split(' ')) { const [name, t] = f.split(':'); p[name] = new (T[t] || Float32Array)(max); p.A.push(p[name]); }
  p.kill = i => { const n = --p.n; if (i < n) for (const a of p.A) a[i] = a[n]; };
  return p;
}

// ---------- formatting ----------
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' };
const supNum = n => String(n).split('').map(c => SUP[c] || c).join('');
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
function gcd(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }
function fmtFrac(p) { // nice fraction for powers of 2 etc.
  for (const d of [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 64, 128, 256]) {
    const n = Math.round(p * d);
    if (n > 0 && Math.abs(n / d - p) < 1e-6) { const g = gcd(n, d); return (n / g) + '/' + (d / g); }
  }
  return fmtPct(p);
}
function fmtTime(s) { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); const r = s % 60; return m + ':' + String(r).padStart(2, '0'); }
function fmtSplit(s, sign) { // 1:23.4 / +0.8 / −1:02.3
  const neg = s < 0; s = Math.abs(s);
  const m = Math.floor(s / 60), r = s - m * 60;
  const body = m ? m + ':' + r.toFixed(1).padStart(4, '0') : r.toFixed(1);
  return (sign ? (neg ? '−' : '+') : neg ? '−' : '') + body;
}
const ketBits = (b, n) => n <= 0 ? '|0⟩' : '|' + b.toString(2).padStart(n, '0').split('').reverse().join('') + '⟩';

// ---------- colour ----------
// Domain colouring of the wavefunction phase: arg ψ → hue. Palettes can be swapped (colour-blind modes, cosmetics).
const PHASE_DEFAULT = [[76, 242, 255], [255, 207, 74], [255, 63, 180], [125, 92, 255]];
let PHASE_STOPS = PHASE_DEFAULT.map(c => c.slice());
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
const COL_DEFAULT = {
  white: [255, 255, 255], chalk: [236, 231, 255], dim: [154, 147, 196],
  red: [255, 59, 85], orange: [255, 138, 40], amber: [255, 186, 72], yellow: [255, 232, 110],
  pink: [255, 96, 200], ice: [140, 212, 255], violet: [176, 128, 255], green: [96, 255, 156],
  coral: [255, 112, 92], blue: [90, 140, 255], gold: [255, 207, 74], cyan: [76, 242, 255],
  magenta: [255, 63, 180], grid: [62, 50, 128], gridHot: [150, 128, 255], void: [12, 10, 24],
  black: [0, 0, 0], blood: [200, 20, 50],
};
const COL = {}; for (const k in COL_DEFAULT) COL[k] = COL_DEFAULT[k].slice();
// Colour-vision modes remap the named hazards and the phase wheel. Shapes and outlines carry meaning too.
const CB_MODES = {
  off: null,
  deutan: { phase: [[86, 180, 233], [240, 228, 66], [230, 120, 20], [204, 121, 167]], col: { red: [255, 110, 20], coral: [255, 140, 60], green: [60, 200, 255], orange: [255, 190, 40], pink: [220, 130, 200], magenta: [204, 121, 167], cyan: [86, 180, 233], blood: [230, 90, 0] } },
  protan: { phase: [[86, 180, 233], [240, 228, 66], [255, 150, 30], [180, 140, 255]], col: { red: [255, 170, 0], coral: [255, 200, 80], green: [70, 170, 255], orange: [255, 220, 90], pink: [200, 160, 255], magenta: [180, 140, 255], blood: [255, 150, 0] } },
  tritan: { phase: [[0, 220, 200], [255, 90, 140], [230, 60, 60], [150, 150, 255]], col: { gold: [255, 120, 160], yellow: [255, 150, 170], amber: [255, 110, 120], ice: [0, 210, 190], blue: [0, 170, 160], cyan: [0, 220, 200], violet: [255, 140, 220] } },
  contrast: { phase: [[120, 255, 255], [255, 240, 120], [255, 110, 220], [180, 160, 255]], col: { red: [255, 40, 40], grid: [40, 34, 80], chalk: [255, 255, 255], dim: [200, 196, 230] } },
};
// Palette: [0..PHASE_N) phase hues, then named colours. Rebuilt in place when the palette changes.
const PAL = [], PAL_CSS = [], PI_ = {};
function buildPalette(mode, phaseOverride) {
  const m = CB_MODES[mode] || null;
  PHASE_STOPS = (phaseOverride || (m && m.phase) || PHASE_DEFAULT).map(c => c.slice());
  for (const k in COL_DEFAULT) COL[k] = ((m && m.col && m.col[k]) || COL_DEFAULT[k]).slice();
  PAL.length = 0;
  for (let i = 0; i < PHASE_N; i++) PAL.push(phaseRGB((i / PHASE_N) * TAU));
  for (const k of Object.keys(COL)) { PI_[k] = PAL.length; PAL.push(COL[k]); }
  PAL_CSS.length = 0; for (const c of PAL) PAL_CSS.push(rgbStr(c));
  spriteCache.clear();
}

// ---------- sprites ----------
const spriteCache = new Map();
buildPalette('off');
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
function cached(key, w, h, paint) { let c = spriteCache.get(key); if (c) return c; c = makeCanvas(w, h); paint(c.getContext('2d'), w, h); spriteCache.set(key, c); return c; }
function radial(x, r, stops) { const g = x.createRadialGradient(r, r, 0, r, r, r); for (const [o, c] of stops) g.addColorStop(o, c); x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2); }
const glowSprite = (ci, size = 64) => cached('g' + ci + ':' + size, size, size, (x, s) => { const rgb = PAL[ci]; radial(x, s / 2, [[0, 'rgba(255,255,255,1)'], [0.16, rgba(rgb, 1)], [0.42, rgba(rgb, 0.32)], [1, rgba(rgb, 0)]]); });
const softSprite = (ci, size = 64) => cached('s' + ci + ':' + size, size, size, (x, s) => { const rgb = PAL[ci]; radial(x, s / 2, [[0, rgba(rgb, 0.9)], [0.5, rgba(rgb, 0.25)], [1, rgba(rgb, 0)]]); });
// soft sprite for an arbitrary colour (quantised so slowly changing theme colours do not flood the cache)
function rgbSprite(rgb, a0 = 0.9, a1 = 0.25) {
  const q = rgb.map(v => Math.round(v / 12) * 12);
  return cached('r' + q.join(',') + ':' + a0, 64, 64, (x, s) => radial(x, s / 2, [[0, rgba(q, a0)], [0.5, rgba(q, a1)], [1, rgba(q, 0)]]));
}
// additive glow: the single most repeated drawing pattern in the game
function halo(ctx, ci, x, y, r, a = 1, sprite = softSprite) {
  const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * a;
  ctx.drawImage(sprite(ci, r > 60 ? 128 : 64), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = ga; ctx.globalCompositeOperation = op;
}
// Enemy bullet: halo + coloured ring + white core. Ring radius = 0.23*size. Outline modes for readability.
const EB_RING = 0.23;
function bulletSprite(ci, kind) {
  const ol = (typeof Settings !== 'undefined' && Settings.bulletOutline) || 'off';
  return cached('b' + ci + ':' + kind + ':' + ol, 96, 96, (x, size) => {
    const rgb = PAL[ci], r = size / 2, R0 = size * EB_RING;
    radial(x, r, [[0.15, rgba(rgb, 0.65)], [0.45, rgba(rgb, 0.22)], [1, rgba(rgb, 0)]]);
    x.translate(r, r);
    const body = () => {
      x.beginPath();
      if (kind === 1) x.ellipse(0, 0, R0 * 1.7, R0 * 0.75, 0, 0, TAU);
      else if (kind === 3) { for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = (i % 2 ? 0.72 : 1) * R0 * 1.15; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); }
      else x.arc(0, 0, R0, 0, TAU);
    };
    if (ol !== 'off') { body(); x.lineWidth = size * 0.07; x.strokeStyle = ol === 'dark' ? 'rgba(0,0,0,.95)' : 'rgba(255,255,255,.95)'; x.stroke(); }
    body(); x.fillStyle = rgbStr(rgb); x.fill();
    if (!kind || kind === 2) { x.lineWidth = size * 0.02; x.strokeStyle = 'rgba(255,255,255,.7)'; x.stroke(); }
    x.beginPath();
    if (kind === 1) x.ellipse(0, 0, R0 * 1.7 * 0.58, R0 * 0.75 * 0.58, 0, 0, TAU);
    else x.arc(0, 0, R0 * (kind === 2 ? 0.62 : kind === 3 ? 0.5 : 0.55), 0, TAU);
    x.fillStyle = '#fff'; x.fill();
  });
}

// ---------- the cat (original design: a box-headed cat) ----------
// variant: 0 open eyes, 1 blink, 2 dead (×× eyes), 3 happy (^^). Skins come from the cosmetics cabinet.
let CAT_SKIN = 'classic';
function catSprite(ci, variant, skin = CAT_SKIN) {
  return cached('cat' + ci + ':' + variant + ':' + skin, 192, 192, (x, S) => {
    const rgb = PAL[ci], K = CAT_SKINS[skin] || CAT_SKINS.classic;
    x.translate(S / 2, S / 2); x.scale(S / 100, S / 100); x.translate(-50, -52);
    x.lineJoin = 'round'; x.lineCap = 'round';
    const outline = K.outline || catOutline;
    outline(x); x.strokeStyle = rgba(rgb, 0.16); x.lineWidth = 14; x.stroke();
    outline(x); x.fillStyle = rgba(rgb, K.fill ?? 0.16); x.fill();
    if (K.under) K.under(x, rgb);
    outline(x); x.strokeStyle = rgbStr(rgb); x.lineWidth = 4.2; x.stroke();
    if (!K.noEars) { x.beginPath(); x.moveTo(25, 23); x.lineTo(24, 34); x.lineTo(33, 31); x.closePath(); x.moveTo(75, 23); x.lineTo(76, 34); x.lineTo(67, 31); x.closePath(); x.fillStyle = rgba(rgb, 0.55); x.fill(); }
    x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 3.4;
    if (variant === 0) {
      for (const ex of [37, 63]) {
        x.beginPath(); x.ellipse(ex, 53, 6.2, 8.6, 0, 0, TAU); x.fill();
        x.beginPath(); x.ellipse(ex, 53, 2.1, 6.4, 0, 0, TAU); x.fillStyle = rgbStr(mixRGB(rgb, [0, 0, 0], 0.45)); x.fill(); x.fillStyle = '#fff';
      }
    } else if (variant === 1) { x.beginPath(); x.moveTo(31, 54); x.lineTo(43, 54); x.moveTo(57, 54); x.lineTo(69, 54); x.stroke(); }
    else if (variant === 2) { x.beginPath(); for (const ex of [37, 63]) { x.moveTo(ex - 5.5, 48); x.lineTo(ex + 5.5, 59); x.moveTo(ex + 5.5, 48); x.lineTo(ex - 5.5, 59); } x.stroke(); }
    else { x.beginPath(); for (const ex of [37, 63]) { x.moveTo(ex - 6, 56); x.lineTo(ex, 49); x.lineTo(ex + 6, 56); } x.stroke(); }
    x.beginPath(); x.moveTo(47, 63); x.lineTo(53, 63); x.lineTo(50, 66.5); x.closePath(); x.fillStyle = rgbStr(rgb); x.fill();
    x.beginPath(); x.moveTo(50, 66.5); x.quadraticCurveTo(46, 71, 42.5, 69); x.moveTo(50, 66.5); x.quadraticCurveTo(54, 71, 57.5, 69);
    x.strokeStyle = rgba(rgb, 0.9); x.lineWidth = 2; x.stroke();
    x.beginPath();
    x.moveTo(30, 64); x.lineTo(4, 59); x.moveTo(30, 67); x.lineTo(4, 68); x.moveTo(31, 70); x.lineTo(7, 77);
    x.moveTo(70, 64); x.lineTo(96, 59); x.moveTo(70, 67); x.lineTo(96, 68); x.moveTo(69, 70); x.lineTo(93, 77);
    x.strokeStyle = rgba(rgb, 0.7); x.lineWidth = 1.6; x.stroke();
    if (K.over) K.over(x, rgb, variant);
  });
}
function catOutline(x) {
  x.beginPath(); x.moveTo(24, 82); x.quadraticCurveTo(18, 82, 18, 74); x.lineTo(18, 40); x.lineTo(24, 12); x.lineTo(40, 30); x.lineTo(60, 30);
  x.lineTo(76, 12); x.lineTo(82, 40); x.lineTo(82, 74); x.quadraticCurveTo(82, 82, 74, 82); x.closePath();
}
// cosmetic cat designs (bought with medals). Each only adds paths; the hitbox never changes.
const CAT_SKINS = {
  classic: { name: 'Box cat', desc: 'The original. Mostly box.' },
  round: { name: 'Round cat', desc: 'Smoothed by repeated measurement.', outline: x => { x.beginPath(); x.moveTo(26, 30); x.lineTo(22, 10); x.lineTo(40, 24); x.quadraticCurveTo(50, 21, 60, 24); x.lineTo(78, 10); x.lineTo(74, 30); x.bezierCurveTo(92, 44, 90, 84, 50, 84); x.bezierCurveTo(10, 84, 8, 44, 26, 30); x.closePath(); } },
  loaf: { name: 'Loaf', desc: 'A cat in its lowest energy state.', outline: x => { x.beginPath(); x.moveTo(14, 82); x.quadraticCurveTo(8, 82, 9, 70); x.quadraticCurveTo(10, 44, 26, 38); x.lineTo(26, 22); x.lineTo(40, 34); x.lineTo(60, 34); x.lineTo(74, 22); x.lineTo(74, 38); x.quadraticCurveTo(90, 44, 91, 70); x.quadraticCurveTo(92, 82, 86, 82); x.closePath(); } },
  tabby: { name: 'Tabby', desc: 'Stripes. Possibly interference fringes.', under: (x, rgb) => { x.strokeStyle = rgba(rgb, 0.5); x.lineWidth = 3; x.beginPath(); for (const [a, b, c] of [[30, 34, 42], [50, 30, 40], [70, 34, 42]]) { x.moveTo(a - 4, b); x.lineTo(a, c); x.lineTo(a + 4, b); } x.moveTo(20, 74); x.lineTo(30, 78); x.moveTo(80, 74); x.lineTo(70, 78); x.stroke(); } },
  goggles: { name: 'Lab goggles', desc: 'Safety first. Mostly.', over: (x, rgb, v) => { if (v === 2) return; x.strokeStyle = '#d9d3f3'; x.lineWidth = 2.6; x.fillStyle = 'rgba(76,242,255,.18)'; for (const ex of [37, 63]) { x.beginPath(); x.arc(ex, 53, 10.5, 0, TAU); x.fill(); x.stroke(); } x.beginPath(); x.moveTo(47.5, 53); x.lineTo(52.5, 53); x.moveTo(26.5, 51); x.lineTo(18, 48); x.moveTo(73.5, 51); x.lineTo(82, 48); x.stroke(); } },
  einstein: { name: 'Wild hair', desc: 'Relatively unkempt.', over: (x) => { x.strokeStyle = '#f2efff'; x.lineWidth = 2.4; x.beginPath(); for (let k = 0; k < 11; k++) { const bx = 26 + k * 4.8, a = -PI / 2 + (k - 5) * 0.2; x.moveTo(bx, 31); x.quadraticCurveTo(bx + Math.cos(a) * 9 + 4, 31 + Math.sin(a) * 9, bx + Math.cos(a) * 15, 30 + Math.sin(a) * 15); } x.stroke(); } },
  crown: { name: 'Nobel crown', desc: 'Awarded for services to probability.', over: (x) => { x.fillStyle = '#ffcf4a'; x.strokeStyle = '#7a5410'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(34, 30); x.lineTo(34, 16); x.lineTo(42, 23); x.lineTo(50, 12); x.lineTo(58, 23); x.lineTo(66, 16); x.lineTo(66, 30); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#ff3fb4'; x.beginPath(); x.arc(50, 24, 2.4, 0, TAU); x.fill(); } },
  bowtie: { name: 'Bow tie', desc: 'For the award ceremony.', over: (x) => { x.fillStyle = '#ff3fb4'; x.beginPath(); x.moveTo(50, 80); x.lineTo(38, 74); x.lineTo(38, 88); x.closePath(); x.moveTo(50, 80); x.lineTo(62, 74); x.lineTo(62, 88); x.closePath(); x.fill(); x.fillStyle = '#ffcf4a'; x.beginPath(); x.arc(50, 80, 2.8, 0, TAU); x.fill(); } },
  ghost: { name: 'Ghost', desc: 'A cat from a neighbouring branch.', fill: 0.05, outline: x => { x.beginPath(); x.moveTo(18, 86); x.lineTo(18, 40); x.lineTo(24, 12); x.lineTo(40, 30); x.lineTo(60, 30); x.lineTo(76, 12); x.lineTo(82, 40); x.lineTo(82, 86); for (let k = 0; k < 4; k++) { const bx = 82 - k * 16; x.quadraticCurveTo(bx - 4, 78, bx - 8, 86); x.quadraticCurveTo(bx - 12, 94, bx - 16, 86); } x.closePath(); } },
};

// ---------- tiny DOM helpers ----------
const $ = id => document.getElementById(id);
function store(key, val) {
  try {
    if (val === undefined) { const v = localStorage.getItem('qcat:' + key); return v == null ? null : JSON.parse(v); }
    localStorage.setItem('qcat:' + key, JSON.stringify(val));
  } catch (e) { /* storage may be blocked */ }
  return null;
}
