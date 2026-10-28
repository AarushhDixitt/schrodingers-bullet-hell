// ---------- the spring grid (spacetime, roughly) ----------
const Grid = {
  sp: 50, cols: 0, rows: 0, n: 0,
  x: null, y: null, ox: null, oy: null, vx: null, vy: null, ax: null, ay: null,
  kA: 26, kN: 520, damp: 4.2,
  init() {
    this.cols = Math.round(W / this.sp) + 1; this.rows = Math.round(H / this.sp) + 1;
    this.n = this.cols * this.rows;
    const F = () => new Float32Array(this.n);
    this.x = F(); this.y = F(); this.ox = F(); this.oy = F(); this.vx = F(); this.vy = F(); this.ax = F(); this.ay = F();
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
      const k = j * this.cols + i; this.x[k] = this.ox[k] = i * this.sp; this.y[k] = this.oy[k] = j * this.sp;
    }
  },
  reset() { for (let k = 0; k < this.n; k++) { this.x[k] = this.ox[k]; this.y[k] = this.oy[k]; this.vx[k] = this.vy[k] = 0; } },
  update(dt) {
    const steps = dt > 1 / 50 ? 2 : 1; const h = Math.min(dt, 1 / 20) / steps;
    const { cols, rows, x, y, ox, oy, vx, vy, ax, ay, kA, kN } = this;
    const dmp = Math.exp(-this.damp * h);
    for (let s = 0; s < steps; s++) {
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          if (i === 0 || j === 0 || i === cols - 1 || j === rows - 1) { ax[k] = ay[k] = 0; continue; }
          const dx = x[k] - ox[k], dy = y[k] - oy[k];
          const l = k - 1, r = k + 1, u = k - cols, d = k + cols;
          const lx = (x[l] - ox[l]) + (x[r] - ox[r]) + (x[u] - ox[u]) + (x[d] - ox[d]) - 4 * dx;
          const ly = (y[l] - oy[l]) + (y[r] - oy[r]) + (y[u] - oy[u]) + (y[d] - oy[d]) - 4 * dy;
          ax[k] = -kA * dx + kN * lx; ay[k] = -kA * dy + kN * ly;
        }
      }
      for (let k = 0; k < this.n; k++) {
        vx[k] = (vx[k] + ax[k] * h) * dmp; vy[k] = (vy[k] + ay[k] * h) * dmp;
        x[k] += vx[k] * h; y[k] += vy[k] * h;
        // keep displacement sane
        const dx = x[k] - ox[k], dy = y[k] - oy[k], m = dx * dx + dy * dy;
        if (m > 3600) { const s2 = 60 / Math.sqrt(m); x[k] = ox[k] + dx * s2; y[k] = oy[k] + dy * s2; vx[k] *= 0.5; vy[k] *= 0.5; }
      }
    }
  },
  // impulse: + pushes away, - pulls in
  impulse(cx, cy, force, radius) {
    const sp = this.sp, cols = this.cols, rows = this.rows;
    const i0 = Math.max(1, Math.floor((cx - radius) / sp)), i1 = Math.min(cols - 2, Math.ceil((cx + radius) / sp));
    const j0 = Math.max(1, Math.floor((cy - radius) / sp)), j1 = Math.min(rows - 2, Math.ceil((cy + radius) / sp));
    const r2 = radius * radius;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * cols + i; const dx = this.x[k] - cx, dy = this.y[k] - cy; const d2 = dx * dx + dy * dy;
      if (d2 > r2 || d2 < 1e-3) continue;
      const d = Math.sqrt(d2); const f = force * (1 - d / radius) * (1 - d / radius);
      this.vx[k] += dx / d * f; this.vy[k] += dy / d * f;
    }
  },
  // continuous pull (accel) toward a point
  attract(cx, cy, strength, radius, dt) {
    const sp = this.sp, cols = this.cols, rows = this.rows;
    const i0 = Math.max(1, Math.floor((cx - radius) / sp)), i1 = Math.min(cols - 2, Math.ceil((cx + radius) / sp));
    const j0 = Math.max(1, Math.floor((cy - radius) / sp)), j1 = Math.min(rows - 2, Math.ceil((cy + radius) / sp));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * cols + i; const dx = cx - this.ox[k], dy = cy - this.oy[k]; const d = Math.sqrt(dx * dx + dy * dy) + 1;
      if (d > radius) continue;
      const f = strength * (1 - d / radius) / (1 + d * 0.02);
      this.vx[k] += dx / d * f * dt; this.vy[k] += dy / d * f * dt;
    }
  },
  wake(cx, cy, vx, vy, radius) { // directional push (movement trails)
    const sp = this.sp, cols = this.cols, rows = this.rows;
    const i0 = Math.max(1, Math.floor((cx - radius) / sp)), i1 = Math.min(cols - 2, Math.ceil((cx + radius) / sp));
    const j0 = Math.max(1, Math.floor((cy - radius) / sp)), j1 = Math.min(rows - 2, Math.ceil((cy + radius) / sp));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * cols + i; const dx = this.x[k] - cx, dy = this.y[k] - cy; const d2 = dx * dx + dy * dy;
      if (d2 > radius * radius) continue;
      const f = (1 - Math.sqrt(d2) / radius);
      this.vx[k] += vx * f; this.vy[k] += vy * f;
    }
  },
  draw(ctx, vr, tint) {
    const { cols, rows, x, y, ox, oy, sp } = this;
    const lw = 1.15 * R.rs / cam.zoom;
    const i0 = Math.max(0, Math.floor(vr.x0 / sp) - 1), i1 = Math.min(cols - 1, Math.ceil(vr.x1 / sp) + 1);
    const j0 = Math.max(0, Math.floor(vr.y0 / sp) - 1), j1 = Math.min(rows - 1, Math.ceil(vr.y1 / sp) + 1);
    if (i0 > i1 || j0 > j1) return;
    const base = tint || Theme.c.grid;
    // minor lines
    ctx.lineWidth = lw;
    ctx.strokeStyle = rgba(base, 0.5);
    ctx.beginPath();
    for (let j = j0; j <= j1; j++) {
      if (j % 5 === 0) continue;
      let k = j * cols + i0; ctx.moveTo(x[k], y[k]);
      for (let i = i0 + 1; i <= i1; i++) { k++; ctx.lineTo(x[k], y[k]); }
    }
    for (let i = i0; i <= i1; i++) {
      if (i % 5 === 0) continue;
      let k = j0 * cols + i; ctx.moveTo(x[k], y[k]);
      for (let j = j0 + 1; j <= j1; j++) { k += cols; ctx.lineTo(x[k], y[k]); }
    }
    ctx.stroke();
    // major lines
    ctx.lineWidth = lw * 1.6;
    ctx.strokeStyle = rgba(base, 0.85);
    ctx.beginPath();
    for (let j = j0; j <= j1; j++) {
      if (j % 5 !== 0) continue;
      let k = j * cols + i0; ctx.moveTo(x[k], y[k]);
      for (let i = i0 + 1; i <= i1; i++) { k++; ctx.lineTo(x[k], y[k]); }
    }
    for (let i = i0; i <= i1; i++) {
      if (i % 5 !== 0) continue;
      let k = j0 * cols + i; ctx.moveTo(x[k], y[k]);
      for (let j = j0 + 1; j <= j1; j++) { k += cols; ctx.lineTo(x[k], y[k]); }
    }
    ctx.stroke();
    // excited segments glow
    const prev = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
    const hot = Theme.c.hot;
    const ex = k => { const dx = x[k] - ox[k], dy = y[k] - oy[k]; return dx * dx + dy * dy; };
    for (let b = 0; b < 3; b++) {
      const lo = [16, 90, 300][b], hi = [90, 300, 1e9][b];
      ctx.strokeStyle = rgba(hot, [0.28, 0.5, 0.85][b]);
      ctx.lineWidth = lw * [1.4, 1.8, 2.3][b];
      ctx.beginPath();
      let any = false;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * cols + i; const e = ex(k);
        if (i < i1) { const e2 = Math.max(e, ex(k + 1)); if (e2 >= lo && e2 < hi) { ctx.moveTo(x[k], y[k]); ctx.lineTo(x[k + 1], y[k + 1]); any = true; } }
        if (j < j1) { const e2 = Math.max(e, ex(k + cols)); if (e2 >= lo && e2 < hi) { ctx.moveTo(x[k], y[k]); ctx.lineTo(x[k + cols], y[k + cols]); any = true; } }
      }
      if (any) ctx.stroke();
    }
    ctx.globalCompositeOperation = prev;
  },
};
