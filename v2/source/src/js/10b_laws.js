// ---------- more suspended laws ----------
Object.assign(ANOMS, {
  perpetual: {
    name: 'Perpetual Motion', eq: 'dS/dt = 0', line: 'The second law of thermodynamics is off. Nothing runs down, and every bullet bounces off the walls.', noBoss: true,
    onFire(s, B, i) { if (B.ebn[i] < 1) B.ebn[i] = 1; B.elife[i] = Math.min(B.elife[i], 6.5); },
    drawUnder(s, ctx) {
      if (World.wrap) return;
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(Theme.c.hot, 0.18 + 0.1 * Math.sin(Game.rt * 3)); ctx.lineWidth = 10;
      const b = Game.box || { x0: 0, y0: 0, x1: W, y1: H }; ctx.strokeRect(b.x0 + 5, b.y0 + 5, b.x1 - b.x0 - 10, b.y1 - b.y0 - 10);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  coulomb: {
    name: 'Coulomb’s Law', eq: 'F = k q₁q₂ / r²', line: 'Your cats carry a positive charge. Red bullets are pushed away from you. Blue ones are pulled in.',
    onFire(s, B, i) { if (!B.eq[i] && !(B.eflag[i] & 64)) { B.eq[i] = Math.random() < 0.55 ? 1 : -1; B.ecol[i] = B.eq[i] > 0 ? PI_.red : PI_.ice; } },
    bullet(s, B, i, dt, isPlayer) {
      if (isPlayer || !B.eq[i] || Player.dead) return;
      const dx = wdx(B.ex[i] - Player.x), dy = wdy(B.ey[i] - Player.y), d2 = dx * dx + dy * dy;
      if (d2 > 430 * 430) return;
      const d = Math.sqrt(d2) || 1, a = 2.6e6 * B.eq[i] / (d2 + 3000);
      B.evx[i] += dx / d * a * dt; B.evy[i] += dy / d * a * dt;
    },
    drawUnder(s, ctx) {
      if (Player.dead) return;
      const x = ix(Player.x), y = iy(Player.y);
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,90,110,.22)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 9]);
      ctx.beginPath();
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + Game.rt * 0.2; ctx.moveTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40); ctx.lineTo(x + Math.cos(a) * 170, y + Math.sin(a) * 170); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,90,110,.35)'; ctx.beginPath(); ctx.arc(x, y, 430, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  hubble: {
    name: 'Cosmic Expansion', eq: 'v = H₀ d', line: 'Space is expanding. The longer a bullet travels, the faster it goes.',
    start(s) { s.t = 0; },
    update(s, dt) { s.t += dt; },
    bullet(s, B, i, dt, isPlayer) {
      if (isPlayer) return;
      const vx = B.evx[i], vy = B.evy[i];
      if (vx * vx + vy * vy < 880 * 880) { const k = 1 + 0.5 * dt; B.evx[i] = vx * k; B.evy[i] = vy * k; }
    },
    drawUnder(s, ctx) {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const f = ((s.t * 0.12 + k / 4) % 1), r = 60 + f * f * 1500;
        ctx.strokeStyle = rgba(Theme.c.hot, 0.16 * (1 - f)); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, TAU); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  slowlight: {
    name: 'Slow Light', eq: 'c = 299 792 458 m/s → 650', line: 'Light takes time to reach you now. You see every enemy where it was, not where it is.', noBoss: true,
    C: 650,
    start(s) { s.t = 0; s.acc = 0; },
    stop() { for (const e of Game.enemies) e.hist = null; },
    update(s, dt) {
      s.t += dt; s.acc += dt;
      if (s.acc < 1 / 30) return;
      s.acc = 0;
      for (const e of Game.enemies) {
        if (e.boss || e.dead) continue;
        const h = e.hist || (e.hist = []);
        h.push(s.t, e.x, e.y); if (h.length > 270) h.splice(0, 3);
      }
    },
    // where the light reaching the cat right now left this enemy (null: it has not arrived yet)
    seen(s, e) {
      const h = e.hist; if (!h || !h.length) return null;
      const d = Math.hypot(wdx(e.x - Player.x), wdy(e.y - Player.y)), target = s.t - d / this.C;
      if (target < h[0]) return h.length >= 270 ? [h[1], h[2]] : null;
      for (let k = h.length - 3; k >= 0; k -= 3) if (h[k] <= target) return [h[k + 1], h[k + 2]];
      return [h[1], h[2]];
    },
  },
  newton3: {
    name: 'Newton’s Third Law', eq: 'F₁₂ = −F₂₁', line: 'Every shot pushes you backwards, and nothing slows you down. Steer like a spaceship.',
    drawUnder(s, ctx) {
      if (Player.dead) return;
      const x = ix(Player.x), y = iy(Player.y), vx = Player.vx * 0.45, vy = Player.vy * 0.45, l = Math.hypot(vx, vy);
      if (l < 12) return;
      ctx.strokeStyle = 'rgba(255,207,74,.75)'; ctx.fillStyle = 'rgba(255,207,74,.75)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + vx, y + vy); ctx.stroke();
      const a = Math.atan2(vy, vx); ctx.beginPath(); ctx.moveTo(x + vx, y + vy); ctx.lineTo(x + vx - Math.cos(a - 0.4) * 12, y + vy - Math.sin(a - 0.4) * 12); ctx.lineTo(x + vx - Math.cos(a + 0.4) * 12, y + vy - Math.sin(a + 0.4) * 12); ctx.closePath(); ctx.fill();
      ctx.font = fontSerif(16); ctx.textAlign = 'center'; ctx.fillText('p', x + vx + Math.cos(a) * 14, y + vy + Math.sin(a) * 14 + 5);
    },
  },
  symmetry: {
    name: 'Spontaneous Symmetry Breaking', eq: 'V(φ) = −μ²|φ|² + λ|φ|⁴', line: 'The vacuum is a ring now. Everything rolls down into the trough, then drifts around it.', noBoss: true,
    R: 430,
    radial(x, y, k, cap, tang) {
      const dx = x - W / 2, dy = y - H / 2, r = Math.hypot(dx, dy) || 1, f = clamp(-k * (r - this.R), -cap, cap);
      const g = Math.abs(r - this.R) < 160 ? tang : 0;
      return [dx / r * f - dy / r * g, dy / r * f + dx / r * g];
    },
    accel(s, p) { return this.radial(p.x, p.y, 2.4, 620, 150); },
    force(s, e, dt) { if (e.boss || e.type === 'quark') return; const [ax, ay] = this.radial(e.x, e.y, 1.6, 420, 90); e.vx += ax * dt; e.vy += ay * dt; },
    bullet(s, B, i, dt, isPlayer) { if (isPlayer) return; const [ax, ay] = this.radial(B.ex[i], B.ey[i], 0.7, 260, 0); B.evx[i] += ax * dt; B.evy[i] += ay * dt; },
    drawUnder(s, ctx) {
      const cx = W / 2, cy = H / 2, R = this.R, hot = Theme.c.hot;
      const g = ctx.createRadialGradient(cx, cy, R - 170, cx, cy, R + 170);
      g.addColorStop(0, rgba(hot, 0)); g.addColorStop(0.5, rgba(hot, 0.13)); g.addColorStop(1, rgba(hot, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 170, 0, TAU); ctx.arc(cx, cy, Math.max(1, R - 170), 0, TAU, true); ctx.fill();
      ctx.strokeStyle = rgba(hot, 0.4); ctx.lineWidth = 2; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -Game.rt * 30;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      ctx.strokeStyle = rgba(hot, 0.16); ctx.lineWidth = 1.2;
      for (const r of [90, 200, 640, 760]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }
      ctx.font = fontSerif(15); ctx.textAlign = 'center'; ctx.fillStyle = rgba(hot, 0.55); ctx.fillText('φ = 0 is unstable', cx, cy + 5);
    },
  },
  casimir: {
    name: 'The Casimir Effect', eq: 'F / A = −π²ℏc / 240a⁴', line: 'Two metal plates squeeze in from the sides. Bullets bounce off them, and they push you along.', noBoss: true,
    PMAX: 520,
    start(s) { s.t = 0; s.p = 0; s.emit = 1.5; Game.box = { x0: 0, y0: 0, x1: W, y1: H }; },
    stop() { Game.box = null; },
    onFire(s, B, i) { if (B.ebn[i] < 1) B.ebn[i] = 1; },
    update(s, dt) {
      s.t += dt;
      const c = s.t % 14;
      const k = c < 2.5 ? 0 : c < 5.5 ? easeInOutCubic((c - 2.5) / 3) : c < 10 ? 1 : c < 13 ? 1 - easeInOutCubic((c - 10) / 3) : 0;
      s.p = k * this.PMAX * (Game.mode === 'lab' ? 0.8 : 1);
      const b = Game.box || (Game.box = { x0: 0, y0: 0, x1: W, y1: H });
      b.x0 = s.p; b.x1 = W - s.p;
      if (k > 0.98 && Game.mode !== 'attract') {
        s.emit -= dt;
        if (s.emit <= 0) {
          s.emit = 1.7 / Game.fireRateMul; const gap = rand(0.2, 0.8);
          for (let j = 0; j < 8; j++) {
            const f = (j + 0.5) / 8; if (Math.abs(f - gap) < 0.1) continue;
            Bullets.fire(b.x0 + 8, f * H, 130, 0, { col: PI_.ice, r: 6.5, life: 8 }); Bullets.fire(b.x1 - 8, (1 - f) * H, -130, 0, { col: PI_.ice, r: 6.5, life: 8 });
          }
        }
      }
    },
    drawUnder(s, ctx) {
      const b = Game.box; if (!b) return;
      const hot = Theme.c.hot;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.2;
      for (let m = 1; m <= 4; m++) {
        ctx.strokeStyle = rgba(hot, 0.07); ctx.beginPath();
        for (let x = b.x0; x <= b.x1 + 1; x += 20) { const f = (x - b.x0) / Math.max(1, b.x1 - b.x0); ctx.lineTo(x, H / 2 + Math.sin(f * PI * m) * Math.cos(Game.rt * (1 + m * 0.7)) * 220); }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const [x, dir] of [[b.x0, -1], [b.x1, 1]]) {
        const g = ctx.createLinearGradient(x, 0, x + dir * 40, 0); g.addColorStop(0, '#cfd6e6'); g.addColorStop(0.3, '#6f7894'); g.addColorStop(1, '#262b3a');
        ctx.fillStyle = g; ctx.fillRect(dir < 0 ? x - 40 : x, -20, 40, H + 40);
        ctx.strokeStyle = rgba(hot, 0.9); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x, H + 20); ctx.stroke();
      }
    },
  },
});
for (const id of ['perpetual', 'coulomb', 'hubble', 'slowlight', 'newton3', 'symmetry', 'casimir']) if (!ANOM_IDS.includes(id)) ANOM_IDS.push(id);
