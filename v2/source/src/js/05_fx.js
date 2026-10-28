// ---------- particles, rings, text, debris ----------
const FX = {
  max: 6000, n: 0,
  x: new Float32Array(6000), y: new Float32Array(6000), vx: new Float32Array(6000), vy: new Float32Array(6000),
  life: new Float32Array(6000), ml: new Float32Array(6000), size: new Float32Array(6000), drag: new Float32Array(6000),
  grav: new Float32Array(6000), kind: new Uint8Array(6000), col: new Uint8Array(6000),
  rings: [], texts: [], debris: [], tr: [], gAll: 0, q: 1,
  _cnt: new Int32Array(PAL.length * 3), _off: new Int32Array(PAL.length * 3), _idx: new Int32Array(6000),
  clear() { this.n = 0; this.rings.length = 0; this.texts.length = 0; this.debris.length = 0; this.tr.length = 0; },
  // bubble-chamber tracks: charged debris curling ever tighter in a magnetic field as it loses energy
  track(x, y, n, cols, speed = 280) {
    n = Math.max(1, Math.round(n * this.q));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * (0.45 + Math.random() * 0.8);
      this.tr.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, w: (Math.random() < 0.5 ? -1 : 1) * rand(1.2, 3.6), t: 0, life: rand(0.8, 1.5), col: Array.isArray(cols) ? pick(cols) : cols, pts: [x, y], acc: 0 });
    }
    if (this.tr.length > 180) this.tr.splice(0, this.tr.length - 180);
  },
  spawn(x, y, vx, vy, life, size, col, kind = 0, drag = 2.5, grav = 0) {
    if (this.n >= this.max) { // recycle a random old one
      const k = (Math.random() * this.max) | 0; this.n--; this._copy(this.n, k);
    }
    const i = this.n++;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.life[i] = life; this.ml[i] = life;
    this.size[i] = size; this.col[i] = col; this.kind[i] = kind; this.drag[i] = drag; this.grav[i] = grav;
  },
  _copy(from, to) {
    this.x[to] = this.x[from]; this.y[to] = this.y[from]; this.vx[to] = this.vx[from]; this.vy[to] = this.vy[from];
    this.life[to] = this.life[from]; this.ml[to] = this.ml[from]; this.size[to] = this.size[from]; this.col[to] = this.col[from];
    this.kind[to] = this.kind[from]; this.drag[to] = this.drag[from]; this.grav[to] = this.grav[from];
  },
  burst(x, y, count, speed, col, o = {}) {
    count = Math.max(1, Math.round(count * this.q));
    const life = o.life || 0.7, size = o.size || 5, kind = o.kind || 0, drag = o.drag ?? 2.6;
    const a0 = o.angle ?? 0, spread = o.spread ?? TAU;
    for (let i = 0; i < count; i++) {
      const a = a0 + (Math.random() - 0.5) * spread; const s = speed * (0.25 + Math.random() * 0.9);
      const c = Array.isArray(col) ? pick(col) : col;
      this.spawn(x + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0), y + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0),
        Math.cos(a) * s + (o.vx || 0), Math.sin(a) * s + (o.vy || 0), life * (0.5 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.8), c, kind, drag, o.grav || 0);
    }
  },
  sparks(x, y, count, speed, col, angle, spread = TAU, life = 0.45) {
    this.burst(x, y, count, speed, col, { angle: angle ?? 0, spread, kind: 1, life, size: 2.2, drag: 3.5 });
  },
  ring(x, y, r0, r1, life, col, w = 3) { this.rings.push({ x, y, r0, r1, t: 0, life, col, w }); if (this.rings.length > 80) this.rings.shift(); },
  text(x, y, str, col, o = {}) {
    this.texts.push({ x, y, vx: o.vx || 0, vy: o.vy ?? -40, str, col, size: o.size || 16, life: o.life || 1.1, t: 0, font: o.font || 'mono', weight: o.weight || 600, rot: o.rot || 0, vr: o.vr || 0, pop: o.pop ?? true, drag: o.drag ?? 1.5 });
    if (this.texts.length > 60) this.texts.shift();
  },
  shatter(x, y, col, count = 8, size = 14, speed = 220) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, s = speed * (0.3 + Math.random());
      this.debris.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, a: Math.random() * TAU, va: (Math.random() - 0.5) * 18, len: size * (0.4 + Math.random() * 0.8), life: 0.6 + Math.random() * 0.6, t: 0, col });
    }
    if (this.debris.length > 400) this.debris.splice(0, this.debris.length - 400);
  },
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.n--; if (i < this.n) this._copy(this.n, i); continue; }
      const d = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= d; this.vy[i] = this.vy[i] * d + (this.grav[i] + this.gAll) * dt;
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
      i++;
    }
    for (let k = this.rings.length - 1; k >= 0; k--) { const r = this.rings[k]; r.t += dt; if (r.t >= r.life) this.rings.splice(k, 1); }
    for (let k = this.tr.length - 1; k >= 0; k--) {
      const q = this.tr[k]; q.t += dt;
      if (q.t >= q.life) { this.tr.splice(k, 1); continue; }
      const a = q.w * dt, c = Math.cos(a), s = Math.sin(a), vx = q.vx;
      q.vx = (vx * c - q.vy * s) * Math.exp(-1.1 * dt); q.vy = (vx * s + q.vy * c) * Math.exp(-1.1 * dt);
      q.w *= 1 + 1.5 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      q.acc += dt; if (q.acc >= 1 / 60) { q.acc = 0; q.pts.push(q.x, q.y); if (q.pts.length > 80) q.pts.splice(0, 2); }
    }
    for (let k = this.texts.length - 1; k >= 0; k--) {
      const t = this.texts[k]; t.t += dt; const d = Math.exp(-t.drag * dt);
      t.vx *= d; t.vy *= d; t.x += t.vx * dt; t.y += t.vy * dt; t.rot += t.vr * dt;
      if (t.t >= t.life) this.texts.splice(k, 1);
    }
    for (let k = this.debris.length - 1; k >= 0; k--) {
      const b = this.debris[k]; b.t += dt; const d = Math.exp(-2.2 * dt);
      b.vx *= d; b.vy *= d; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
      if (b.t >= b.life) this.debris.splice(k, 1);
    }
  },
  draw(ctx, vr, planck) {
    const n = this.n; if (!n && !this.rings.length && !this.debris.length && !this.tr.length) return;
    ctx.globalCompositeOperation = 'lighter';
    const wrap = World.wrap;
    if (wrap) for (let i = 0; i < n; i++) { this.x[i] = ix(this.x[i]); this.y[i] = iy(this.y[i]); }
    // dots / puffs / squares
    for (let i = 0; i < n; i++) {
      const k = this.kind[i]; if (k === 1) continue;
      const x = this.x[i], y = this.y[i];
      if (x < vr.x0 || x > vr.x1 || y < vr.y0 || y > vr.y1) continue;
      const f = this.life[i] / this.ml[i];
      if (planck || k === 2) {
        const s = this.size[i] * (0.4 + 0.6 * f) * 1.3;
        ctx.globalAlpha = Math.min(1, f * 1.4); ctx.fillStyle = PAL_CSS[this.col[i]];
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
      } else if (k === 3) {
        const s = this.size[i] * (1.6 - f * 0.6) * 2.4;
        ctx.globalAlpha = f * 0.5; ctx.drawImage(softSprite(this.col[i]), x - s, y - s, s * 2, s * 2);
      } else {
        const s = this.size[i] * (0.35 + 0.65 * f) * 2.2;
        ctx.globalAlpha = Math.min(1, f * 1.5); ctx.drawImage(glowSprite(this.col[i]), x - s, y - s, s * 2, s * 2);
      }
    }
    // sparks bucketed by colour × alpha (counting sort)
    const cnt = this._cnt, off = this._off, idx = this._idx; cnt.fill(0);
    let sparks = 0;
    for (let i = 0; i < n; i++) {
      if (this.kind[i] !== 1) continue;
      const x = this.x[i], y = this.y[i]; if (x < vr.x0 || x > vr.x1 || y < vr.y0 || y > vr.y1) continue;
      const f = this.life[i] / this.ml[i]; const b = f > 0.66 ? 2 : f > 0.33 ? 1 : 0;
      cnt[this.col[i] * 3 + b]++; sparks++;
    }
    if (sparks) {
      let o = 0; for (let b = 0; b < cnt.length; b++) { off[b] = o; o += cnt[b]; }
      const fill = new Int32Array(cnt.length); // positions
      for (let i = 0; i < n; i++) {
        if (this.kind[i] !== 1) continue;
        const x = this.x[i], y = this.y[i]; if (x < vr.x0 || x > vr.x1 || y < vr.y0 || y > vr.y1) continue;
        const f = this.life[i] / this.ml[i]; const b = f > 0.66 ? 2 : f > 0.33 ? 1 : 0; const key = this.col[i] * 3 + b;
        idx[off[key] + fill[key]++] = i;
      }
      ctx.globalAlpha = 1; ctx.lineCap = 'round';
      for (let key = 0; key < cnt.length; key++) {
        const c = cnt[key]; if (!c) continue;
        const b = key % 3, col = (key - b) / 3;
        ctx.strokeStyle = PAL_CSS[col]; ctx.globalAlpha = [0.35, 0.7, 1][b];
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let m = 0; m < c; m++) {
          const i = idx[off[key] + m]; const x = this.x[i], y = this.y[i];
          const s = 0.035 * (planck ? 0.5 : 1);
          ctx.moveTo(x, y); ctx.lineTo(x - this.vx[i] * s, y - this.vy[i] * s);
        }
        ctx.stroke();
      }
    }
    // bubble-chamber tracks
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (const q of this.tr) {
      const p = q.pts; if (p.length < 4) continue;
      const ox = wrap ? ix(q.x) - q.x : 0, oy = wrap ? iy(q.y) - q.y : 0;
      ctx.globalAlpha = 0.75 * (1 - q.t / q.life); ctx.strokeStyle = PAL_CSS[q.col];
      ctx.beginPath(); ctx.moveTo(p[0] + ox, p[1] + oy); for (let k = 2; k < p.length; k += 2) ctx.lineTo(p[k] + ox, p[k + 1] + oy); ctx.stroke();
    }
    // rings
    for (const r of this.rings) {
      const f = r.t / r.life; const rad = lerp(r.r0, r.r1, easeOutCubic(f));
      ctx.globalAlpha = (1 - f) * (1 - f);
      ctx.strokeStyle = PAL_CSS[r.col]; ctx.lineWidth = r.w * (1 - f * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.1, rad), 0, TAU); ctx.stroke();
    }
    // debris
    ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (const b of this.debris) {
      const f = 1 - b.t / b.life; ctx.globalAlpha = f; ctx.strokeStyle = PAL_CSS[b.col];
      const c = Math.cos(b.a) * b.len * 0.5, s = Math.sin(b.a) * b.len * 0.5;
      ctx.beginPath(); ctx.moveTo(b.x - c, b.y - s); ctx.lineTo(b.x + c, b.y + s); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  },
  // drawn on the HUD layer (crisp, no bloom), positioned from world space
  drawTexts(ctx) {
    if (!this.texts.length) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const k = Math.max(0.75, cam.zoom / R.rs);
    for (const t of this.texts) {
      const f = t.t / t.life;
      const sc = (t.pop ? (f < 0.15 ? easeOutBack(f / 0.15) : 1) : 1) * k;
      const a = f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1;
      const [sx, sy] = worldToCss(ix(t.x), iy(t.y));
      if (sx < -200 || sy < -100 || sx > R.cssW + 200 || sy > R.cssH + 100) continue;
      ctx.save(); ctx.translate(sx, sy); if (t.rot) ctx.rotate(t.rot); ctx.scale(sc, sc);
      ctx.globalAlpha = a;
      ctx.font = (t.font === 'serif' ? `italic ${t.weight} ${t.size}px Qtext, Qmath, serif` : `${t.weight} ${t.size}px Qmono, Qmath, monospace`);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(t.str, 1.5, 2);
      ctx.fillStyle = typeof t.col === 'number' ? PAL_CSS[t.col] : t.col; ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
};
