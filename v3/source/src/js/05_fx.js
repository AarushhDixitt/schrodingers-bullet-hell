// ---------- particles, rings, text, debris ----------
const FX = {
  P: Pool(6000, 'x y vx vy life ml size drag grav kind:u col:u'),
  rings: [], texts: [], debris: [], tr: [], gx: 0, gy: 0, q: 1,
  _cnt: new Int32Array(64 * 3), _off: new Int32Array(64 * 3), _idx: new Int32Array(6000),
  get n() { return this.P.n; },
  clear() { this.P.n = 0; for (const k of ['rings', 'texts', 'debris', 'tr']) this[k].length = 0; },
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
    const P = this.P;
    if (P.n >= P.max) P.kill((Math.random() * P.max) | 0); // full: recycle a random old one
    const i = P.n++;
    P.x[i] = x; P.y[i] = y; P.vx[i] = vx; P.vy[i] = vy; P.life[i] = P.ml[i] = life; P.size[i] = size; P.col[i] = col; P.kind[i] = kind; P.drag[i] = drag; P.grav[i] = grav;
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
    const P = this.P, gx = this.gx, gy = this.gy;
    for (let i = 0; i < P.n;) {
      if ((P.life[i] -= dt) <= 0) { P.kill(i); continue; }
      const d = Math.exp(-P.drag[i] * dt);
      P.vx[i] = P.vx[i] * d + gx * dt; P.vy[i] = P.vy[i] * d + (P.grav[i] + gy) * dt;
      P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; i++;
    }
    const age = (L, f) => { for (let k = L.length - 1; k >= 0; k--) { const o = L[k]; if ((o.t += dt) >= o.life) L.splice(k, 1); else if (f) f(o); } };
    age(this.rings);
    age(this.tr, q => {
      const a = q.w * dt, c = Math.cos(a), s = Math.sin(a), vx = q.vx, e = Math.exp(-1.1 * dt);
      q.vx = (vx * c - q.vy * s) * e; q.vy = (vx * s + q.vy * c) * e; q.w *= 1 + 1.5 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if ((q.acc += dt) >= 1 / 60) { q.acc = 0; q.pts.push(q.x, q.y); if (q.pts.length > 80) q.pts.splice(0, 2); }
    });
    age(this.texts, t => { const d = Math.exp(-t.drag * dt); t.vx *= d; t.vy *= d; t.x += t.vx * dt; t.y += t.vy * dt; t.rot += t.vr * dt; });
    const dd = Math.exp(-2.2 * dt);
    age(this.debris, b => { b.vx *= dd; b.vy *= dd; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt; });
  },
  draw(ctx, vr, planck) {
    const P = this.P, n = P.n, X = P.x, Y = P.y, L = P.life, M = P.ml, K = P.kind, C = P.col;
    if (!n && !this.rings.length && !this.debris.length && !this.tr.length) return;
    ctx.globalCompositeOperation = 'lighter';
    const wrap = World.wrap, inV = i => X[i] >= vr.x0 && X[i] <= vr.x1 && Y[i] >= vr.y0 && Y[i] <= vr.y1;
    if (wrap) for (let i = 0; i < n; i++) { X[i] = ix(X[i]); Y[i] = iy(Y[i]); }
    // dots, puffs and squares
    for (let i = 0; i < n; i++) {
      const k = K[i]; if (k === 1 || !inV(i)) continue;
      const f = L[i] / M[i], x = X[i], y = Y[i];
      if (planck || k === 2) { const s = P.size[i] * (0.4 + 0.6 * f) * 1.3; ctx.globalAlpha = Math.min(1, f * 1.4); ctx.fillStyle = PAL_CSS[C[i]]; ctx.fillRect(x - s, y - s, s * 2, s * 2); }
      else if (k === 3) { const s = P.size[i] * (1.6 - f * 0.6) * 2.4; ctx.globalAlpha = f * 0.5; ctx.drawImage(softSprite(C[i]), x - s, y - s, s * 2, s * 2); }
      else { const s = P.size[i] * (0.35 + 0.65 * f) * 2.2; ctx.globalAlpha = Math.min(1, f * 1.5); ctx.drawImage(glowSprite(C[i]), x - s, y - s, s * 2, s * 2); }
    }
    // sparks, bucketed by colour × brightness so each bucket is one stroke (counting sort)
    const cnt = this._cnt, off = this._off, idx = this._idx, key = i => C[i] * 3 + (L[i] / M[i] > 0.66 ? 2 : L[i] / M[i] > 0.33 ? 1 : 0);
    cnt.fill(0); let sparks = 0;
    for (let i = 0; i < n; i++) if (K[i] === 1 && inV(i)) { cnt[key(i)]++; sparks++; }
    if (sparks) {
      for (let b = 0, o = 0; b < cnt.length; b++) { off[b] = o; o += cnt[b]; }
      const fill = new Int32Array(cnt.length);
      for (let i = 0; i < n; i++) if (K[i] === 1 && inV(i)) { const kk = key(i); idx[off[kk] + fill[kk]++] = i; }
      ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
      const s = 0.035 * (planck ? 0.5 : 1);
      for (let b = 0; b < cnt.length; b++) {
        if (!cnt[b]) continue;
        ctx.strokeStyle = PAL_CSS[(b - b % 3) / 3]; ctx.globalAlpha = [0.35, 0.7, 1][b % 3];
        ctx.beginPath();
        for (let m = 0; m < cnt[b]; m++) { const i = idx[off[b] + m]; ctx.moveTo(X[i], Y[i]); ctx.lineTo(X[i] - P.vx[i] * s, Y[i] - P.vy[i] * s); }
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
    for (const r of this.rings) {
      const f = r.t / r.life;
      ctx.globalAlpha = (1 - f) * (1 - f); ctx.strokeStyle = PAL_CSS[r.col]; ctx.lineWidth = r.w * (1 - f * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.1, lerp(r.r0, r.r1, easeOutCubic(f))), 0, TAU); ctx.stroke();
    }
    ctx.lineWidth = 2.4;
    for (const b of this.debris) {
      const c = Math.cos(b.a) * b.len * 0.5, s = Math.sin(b.a) * b.len * 0.5;
      ctx.globalAlpha = 1 - b.t / b.life; ctx.strokeStyle = PAL_CSS[b.col];
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

// ---------- telegraphs: every warning in the game is drawn by these three ----------
// (dashed = something is about to happen along here; solid = it is happening)
const Tele = {
  line(ctx, x0, y0, x1, y1, rgb, a = 0.5, w = 1.5, dash = [8, 10]) {
    ctx.setLineDash(dash); ctx.strokeStyle = rgba(rgb, a); ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
  },
  ring(ctx, x, y, r, rgb, a = 0.5, dash = [6, 8], w = 2) {
    ctx.setLineDash(dash); ctx.strokeStyle = rgba(rgb, a); ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  },
  // a beam from (x, y) along angle ang: state 1 = warning, 2 = live (hw = half-width that hurts)
  beam(ctx, x, y, ang, L, hw, rgb, state, t = Game.rt) {
    const ex = x + Math.cos(ang) * L, ey = y + Math.sin(ang) * L, op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    if (state === 1) this.line(ctx, x, y, ex, ey, rgb, 0.35 + 0.2 * Math.sin(t * 30), 1.5);
    else if (state === 2) {
      ctx.lineCap = 'round';
      for (const [c, w] of [[rgba(rgb, 0.85), hw * 2 + Math.sin(t * 50) * 2], ['rgba(255,255,255,.92)', Math.max(2, hw * 0.6)]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); }
    }
    ctx.globalCompositeOperation = op;
  },
};
