// ---------- the spring grid (spacetime, roughly) ----------
const Grid = {
  sp: 50, cols: 0, rows: 0, n: 0, kA: 26, kN: 520, damp: 4.2,
  init() {
    this.cols = Math.round(W / this.sp) + 1; this.rows = Math.round(H / this.sp) + 1; this.n = this.cols * this.rows;
    for (const k of ['x', 'y', 'ox', 'oy', 'vx', 'vy', 'ax', 'ay']) this[k] = new Float32Array(this.n);
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) { const k = j * this.cols + i; this.x[k] = this.ox[k] = i * this.sp; this.y[k] = this.oy[k] = j * this.sp; }
  },
  reset() { this.x.set(this.ox); this.y.set(this.oy); this.vx.fill(0); this.vy.fill(0); },
  update(dt) {
    const steps = dt > 1 / 50 ? 2 : 1, h = Math.min(dt, 1 / 20) / steps;
    const { cols, rows, x, y, ox, oy, vx, vy, ax, ay, kA, kN } = this, dmp = Math.exp(-this.damp * h);
    for (let s = 0; s < steps; s++) {
      for (let j = 1; j < rows - 1; j++) for (let i = 1; i < cols - 1; i++) {
        const k = j * cols + i, dx = x[k] - ox[k], dy = y[k] - oy[k], l = k - 1, r = k + 1, u = k - cols, d = k + cols;
        ax[k] = -kA * dx + kN * ((x[l] - ox[l]) + (x[r] - ox[r]) + (x[u] - ox[u]) + (x[d] - ox[d]) - 4 * dx);
        ay[k] = -kA * dy + kN * ((y[l] - oy[l]) + (y[r] - oy[r]) + (y[u] - oy[u]) + (y[d] - oy[d]) - 4 * dy);
      }
      for (let k = 0; k < this.n; k++) {
        vx[k] = (vx[k] + ax[k] * h) * dmp; vy[k] = (vy[k] + ay[k] * h) * dmp;
        x[k] += vx[k] * h; y[k] += vy[k] * h;
        const dx = x[k] - ox[k], dy = y[k] - oy[k], m = dx * dx + dy * dy; // keep displacement sane
        if (m > 3600) { const s2 = 60 / Math.sqrt(m); x[k] = ox[k] + dx * s2; y[k] = oy[k] + dy * s2; vx[k] *= 0.5; vy[k] *= 0.5; }
      }
    }
  },
  // visit interior nodes within radius r of (cx, cy): fn(k, dx, dy, d) with d from the node's current position
  near(cx, cy, r, fn, rest) {
    if (Settings.gridWarp === false) return;
    const sp = this.sp, cols = this.cols, X = rest ? this.ox : this.x, Y = rest ? this.oy : this.y;
    const i0 = Math.max(1, Math.floor((cx - r) / sp)), i1 = Math.min(cols - 2, Math.ceil((cx + r) / sp));
    const j0 = Math.max(1, Math.floor((cy - r) / sp)), j1 = Math.min(this.rows - 2, Math.ceil((cy + r) / sp));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * cols + i, dx = X[k] - cx, dy = Y[k] - cy, d2 = dx * dx + dy * dy;
      if (d2 < r * r && d2 > 1e-3) fn(k, dx, dy, Math.sqrt(d2));
    }
  },
  // + pushes away, - pulls in
  impulse(cx, cy, force, r) { this.near(cx, cy, r, (k, dx, dy, d) => { const f = force * (1 - d / r) ** 2 / d; this.vx[k] += dx * f; this.vy[k] += dy * f; }); },
  attract(cx, cy, strength, r, dt) { this.near(cx, cy, r, (k, dx, dy, d) => { const f = strength * (1 - d / r) / (1 + d * 0.02) * dt / (d + 1); this.vx[k] -= dx * f; this.vy[k] -= dy * f; }, true); },
  wake(cx, cy, vx, vy, r) { this.near(cx, cy, r, (k, dx, dy, d) => { const f = 1 - d / r; this.vx[k] += vx * f; this.vy[k] += vy * f; }); },
  draw(ctx, vr, tint) {
    const { cols, rows, x, y, ox, oy, sp } = this, lw = 1.15 * R.rs / cam.zoom;
    const i0 = Math.max(0, Math.floor(vr.x0 / sp) - 1), i1 = Math.min(cols - 1, Math.ceil(vr.x1 / sp) + 1);
    const j0 = Math.max(0, Math.floor(vr.y0 / sp) - 1), j1 = Math.min(rows - 1, Math.ceil(vr.y1 / sp) + 1);
    if (i0 > i1 || j0 > j1) return;
    const base = tint || Theme.c.grid;
    const lines = major => {
      ctx.beginPath();
      for (let j = j0; j <= j1; j++) if ((j % 5 === 0) === major) { let k = j * cols + i0; ctx.moveTo(x[k], y[k]); for (let i = i0 + 1; i <= i1; i++) { k++; ctx.lineTo(x[k], y[k]); } }
      for (let i = i0; i <= i1; i++) if ((i % 5 === 0) === major) { let k = j0 * cols + i; ctx.moveTo(x[k], y[k]); for (let j = j0 + 1; j <= j1; j++) { k += cols; ctx.lineTo(x[k], y[k]); } }
      ctx.stroke();
    };
    ctx.lineWidth = lw; ctx.strokeStyle = rgba(base, 0.5); lines(false);
    ctx.lineWidth = lw * 1.6; ctx.strokeStyle = rgba(base, 0.85); lines(true);
    // excited segments glow, in three brightness bands
    const prev = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
    const ex = k => (x[k] - ox[k]) ** 2 + (y[k] - oy[k]) ** 2, hot = Theme.c.hot;
    for (let b = 0; b < 3; b++) {
      const lo = [16, 90, 300][b], hi = [90, 300, 1e9][b];
      ctx.strokeStyle = rgba(hot, [0.28, 0.5, 0.85][b]); ctx.lineWidth = lw * [1.4, 1.8, 2.3][b];
      ctx.beginPath(); let any = false;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * cols + i, e = ex(k);
        for (let s = 0; s < 2; s++) {
          if (s ? j >= j1 : i >= i1) continue;
          const k2 = s ? k + cols : k + 1, e2 = Math.max(e, ex(k2));
          if (e2 >= lo && e2 < hi) { ctx.moveTo(x[k], y[k]); ctx.lineTo(x[k2], y[k2]); any = true; }
        }
      }
      if (any) ctx.stroke();
    }
    ctx.globalCompositeOperation = prev;
  },
};
