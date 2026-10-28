// ---------- background palettes: each chapter of the campaign lives in its own colour ----------
const THEMES = [
  { id: 'violet', name: 'Violet', bg: [12, 10, 24], grid: [62, 50, 128], hot: [150, 128, 255], arena: [125, 92, 255], neb: [[255, 63, 180], [125, 92, 255], [76, 242, 255]] },
  { id: 'teal', name: 'Teal', bg: [5, 17, 21], grid: [26, 86, 96], hot: [96, 224, 232], arena: [60, 200, 210], neb: [[255, 207, 74], [40, 180, 200], [90, 140, 255]] },
  { id: 'ember', name: 'Ember', bg: [21, 9, 8], grid: [106, 42, 34], hot: [255, 140, 96], arena: [255, 110, 80], neb: [[255, 80, 60], [255, 160, 60], [90, 140, 255]] },
  { id: 'midnight', name: 'Midnight', bg: [7, 10, 29], grid: [40, 56, 142], hot: [130, 160, 255], arena: [110, 130, 255], neb: [[90, 140, 255], [176, 128, 255], [255, 207, 74]] },
  { id: 'emerald', name: 'Emerald', bg: [4, 18, 14], grid: [24, 94, 68], hot: [100, 255, 190], arena: [70, 230, 170], neb: [[76, 242, 255], [96, 255, 156], [200, 255, 240]] },
  { id: 'amber', name: 'Amber', bg: [13, 9, 5], grid: [98, 72, 30], hot: [255, 196, 100], arena: [255, 170, 70], neb: [[255, 138, 40], [255, 207, 74], [140, 90, 255]] },
  { id: 'magenta', name: 'Magenta', bg: [19, 6, 23], grid: [106, 30, 106], hot: [255, 120, 240], arena: [240, 90, 220], neb: [[255, 63, 180], [176, 128, 255], [76, 242, 255]] },
  { id: 'electric', name: 'Electric', bg: [3, 14, 25], grid: [20, 76, 126], hot: [90, 200, 255], arena: [76, 190, 255], neb: [[76, 242, 255], [90, 140, 255], [255, 255, 190]] },
  { id: 'box', name: 'Cardboard', bg: [15, 12, 8], grid: [86, 72, 46], hot: [232, 200, 130], arena: [205, 172, 112], neb: [[150, 255, 120], [255, 207, 74], [205, 172, 112]] },
];
const THEME_BY = Object.fromEntries(THEMES.map(t => [t.id, t]));
const cloneTheme = t => ({ id: t.id, bg: t.bg.slice(), grid: t.grid.slice(), hot: t.hot.slice(), arena: t.arena.slice(), neb: t.neb.map(c => c.slice()) });
// rotate a colour's hue in YIQ space (cheap and good enough for palettes)
function hueRotate(rgb, deg) {
  const [r, g, b] = rgb, a = deg * PI / 180, c = Math.cos(a), s = Math.sin(a);
  const y = 0.299 * r + 0.587 * g + 0.114 * b, i = 0.596 * r - 0.274 * g - 0.322 * b, q = 0.211 * r - 0.523 * g + 0.312 * b;
  const i2 = i * c - q * s, q2 = i * s + q * c;
  return [clamp(y + 0.956 * i2 + 0.621 * q2, 0, 255), clamp(y - 0.272 * i2 - 0.647 * q2, 0, 255), clamp(y - 1.106 * i2 + 1.703 * q2, 0, 255)];
}
function rotateTheme(t, deg) {
  if (!deg) return cloneTheme(t);
  const o = cloneTheme(t);
  for (const k of ['bg', 'grid', 'hot', 'arena']) o[k] = hueRotate(t[k], deg);
  o.neb = t.neb.map(c => hueRotate(c, deg));
  return o;
}

const Theme = {
  c: null, from: null, to: null, t: 1, dur: 3, bgCss: 'rgb(12,10,24)',
  init() { this.c = cloneTheme(THEMES[0]); this.bgCss = rgbStr(this.c.bg); },
  set(spec, dur = 3) {
    if (!this.c) this.init();
    this.from = cloneTheme(this.c); this.to = cloneTheme(spec); this.t = 0; this.dur = Math.max(0.01, dur);
  },
  // the palette for a chapter (0-based) unless the player pinned one in settings
  pick(i, deg = 0) {
    const pin = Settings.theme && Settings.theme !== 'auto' ? THEME_BY[Settings.theme] : null;
    if (pin) return cloneTheme(pin);
    return rotateTheme(THEMES[((i % THEMES.length) + THEMES.length) % THEMES.length], deg);
  },
  chapter(i, dur = 3.5) { this.set(this.pick(i), dur); },
  endless(n, dur = 3) { this.set(this.pick(n - 1, Math.floor((n - 1) / THEMES.length) * 41), dur); },
  update(dt) {
    if (!this.c) this.init();
    if (this.t >= 1 || !this.to) return;
    this.t = Math.min(1, this.t + dt / this.dur);
    const k = smoothstep(0, 1, this.t), f = this.from, to = this.to, c = this.c;
    for (const key of ['bg', 'grid', 'hot', 'arena']) for (let j = 0; j < 3; j++) c[key][j] = f[key][j] + (to[key][j] - f[key][j]) * k;
    for (let n = 0; n < 3; n++) for (let j = 0; j < 3; j++) c.neb[n][j] = f.neb[n][j] + (to.neb[n][j] - f.neb[n][j]) * k;
    this.bgCss = rgbStr(c.bg);
  },
};
