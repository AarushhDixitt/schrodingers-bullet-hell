// ---------- quaternions (for the die) ----------
const Qn = {
  axis(ax, ay, az, ang) { const l = Math.hypot(ax, ay, az) || 1, s = Math.sin(ang / 2); return [Math.cos(ang / 2), ax / l * s, ay / l * s, az / l * s]; },
  mul(a, b) {
    return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  },
  norm(q) { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; },
  rot(q, v) {
    const [w, x, y, z] = q;
    const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
    return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
  },
  fromTo(u, v) {
    const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    if (d < -0.99999) return [0, 1, 0, 0];
    const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return Qn.norm([1 + d, c[0], c[1], c[2]]);
  },
  slerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
    if (d > 0.9995) return Qn.norm([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]);
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb, a[3] * wa + b[3] * wb];
  },
};
// d6 geometry: faces with normals & pip layouts (opposite faces sum to 7)
const D6 = [
  { n: [0, 0, 1], v: 1, u: [1, 0, 0], w: [0, 1, 0] }, { n: [0, 0, -1], v: 6, u: [-1, 0, 0], w: [0, 1, 0] },
  { n: [1, 0, 0], v: 3, u: [0, 0, -1], w: [0, 1, 0] }, { n: [-1, 0, 0], v: 4, u: [0, 0, 1], w: [0, 1, 0] },
  { n: [0, 1, 0], v: 2, u: [1, 0, 0], w: [0, 0, -1] }, { n: [0, -1, 0], v: 5, u: [1, 0, 0], w: [0, 0, 1] },
];
const PIPS = { 1: [[0, 0]], 2: [[-.5, -.5], [.5, .5]], 3: [[-.5, -.5], [0, 0], [.5, .5]], 4: [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]], 5: [[-.5, -.5], [.5, -.5], [0, 0], [-.5, .5], [.5, .5]], 6: [[-.5, -.55], [.5, -.55], [-.5, 0], [.5, 0], [-.5, .55], [.5, .55]] };
// d20 geometry
const D20 = (() => {
  const p = (1 + Math.sqrt(5)) / 2;
  const V = [[0, 1, p], [0, 1, -p], [0, -1, p], [0, -1, -p], [1, p, 0], [1, -p, 0], [-1, p, 0], [-1, -p, 0], [p, 0, 1], [p, 0, -1], [-p, 0, 1], [-p, 0, -1]]
    .map(v => { const l = Math.hypot(...v); return v.map(c => c / l); });
  const F = [];
  const e2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const edge = e2(V[0], V[2]);
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
    if (Math.abs(e2(V[i], V[j]) - edge) < 1e-3 && Math.abs(e2(V[j], V[k]) - edge) < 1e-3 && Math.abs(e2(V[i], V[k]) - edge) < 1e-3) {
      const c = [(V[i][0] + V[j][0] + V[k][0]) / 3, (V[i][1] + V[j][1] + V[k][1]) / 3, (V[i][2] + V[j][2] + V[k][2]) / 3];
      const l = Math.hypot(...c); F.push({ idx: [i, j, k], n: c.map(x => x / l), c, v: 0 });
    }
  }
  // number faces so that opposite faces sum to 21
  let next = 1;
  for (const f of F) {
    if (f.v) continue;
    const opp = F.find(g => !g.v && g !== f && Math.abs(g.n[0] + f.n[0]) + Math.abs(g.n[1] + f.n[1]) + Math.abs(g.n[2] + f.n[2]) < 1e-3);
    f.v = next; if (opp) opp.v = 21 - next; next++;
  }
  return { V, F };
})();

const BOSS_DEFS = {
  observer: {
    name: 'The Observer', sub: 'It cannot look away. Neither can you.', hp: 1450, r: 84, col: 'pink', score: 25000,
    init(b) {
      b.x = W / 2; b.y = 300; b.open = 1; b.lookA = PI / 2; b.pupX = 0; b.pupY = 0;
      b.queue = []; b.atk = null; b.at = 0; b.gazeA = PI / 2; b.gazeT = 0; b.fire = 0;
    },
    nextAttack(b) {
      const p2 = b.phase >= 2;
      if (!b.queue.length) b.queue = shuffle(p2 ? ['gaze', 'rings', 'tears', 'stare', 'blink', 'rings'] : ['gaze', 'rings', 'tears', 'blink']);
      b.atk = b.queue.shift(); b.at = 0; b.fire = 0.4;
      b.dur = { gaze: 5, rings: 3.8, tears: 3.6, blink: 2.2, stare: 4 }[b.atk];
      if (b.atk === 'blink') { Game.bossLine(b, 'summons graduate students'); }
    },
    update(b, dt) {
      const p2 = b.phase >= 2, sp = p2 ? 1.3 : 1;
      // drift on a lissajous
      const tx = W / 2 + Math.sin(b.t * 0.23) * 560, ty = 330 + Math.sin(b.t * 0.37) * 150;
      b.x += (tx - b.x) * damp(1.2, dt); b.y += (ty - b.y) * damp(1.2, dt);
      // track ⟨x⟩
      const want = Math.atan2(Game.ty - b.y, Game.tx - b.x);
      b.lookA += angDiff(b.lookA, want) * damp(5, dt);
      const pd = 28; b.pupX += (Math.cos(b.lookA) * pd - b.pupX) * damp(8, dt); b.pupY += (Math.sin(b.lookA) * pd * 0.8 - b.pupY) * damp(8, dt);
      if (!b.atk) this.nextAttack(b);
      b.at += dt;
      const blinking = b.atk === 'blink';
      b.open += ((blinking && b.at > 0.15 && b.at < b.dur - 0.25 ? 0 : 1) - b.open) * damp(14, dt);
      b.invuln = b.open < 0.35;
      b.fire -= dt;
      if (b.atk === 'gaze') {
        b.gazeA += clamp(angDiff(b.gazeA, want), -0.85 * sp * dt, 0.85 * sp * dt);
        b.gazeT -= dt;
        const cones = p2 ? [b.gazeA - 0.32, b.gazeA + 0.32] : [b.gazeA];
        if (b.gazeT <= 0 && b.at > 0.6) {
          b.gazeT = 0.75;
          for (const ca of cones) {
            Player.measureRegion(br => { const dx = br.px - b.x, dy = br.py - b.y; return Math.abs(angDiff(ca, Math.atan2(dy, dx))) < 0.2; }, { x: b.x + Math.cos(ca) * 200, y: b.y + Math.sin(ca) * 200 }, 'IN SIGHT');
          }
        }
        if (b.fire <= 0 && b.at > 0.6) {
          b.fire = 0.16 / sp;
          for (const ca of cones) { const a = ca + (Math.random() - 0.5) * 0.24; Bullets.fire(b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 80, Math.cos(a) * 470, Math.sin(a) * 470, { col: PI_.pink, r: 5.5, kind: 1 }); }
        }
      } else if (b.atk === 'rings') {
        if (b.fire <= 0) {
          b.fire = 0.62 / sp; const n = p2 ? 34 : 26; b.ringK = (b.ringK || 0) + 1;
          Bullets.ring(b.x, b.y, n, 150 * sp, { col: b.ringK % 2 ? PI_.red : PI_.pink, r: 7.5 }, b.ringK * 0.11 + b.t);
          if (p2) Bullets.ring(b.x, b.y, 10, 110, { col: PI_.yellow, r: 9, kind: 2, turn: 0.6 }, -b.t);
          Audio2.sfx('bossShot');
        }
      } else if (b.atk === 'tears') {
        if (b.fire <= 0) {
          b.fire = 0.085 / sp;
          const a = b.lookA + (Math.random() - 0.5) * 1.6;
          Bullets.fire(b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 50 + 30, rand(-140, 140), rand(-260, -120), { col: PI_.ice, r: rand(6, 10), gy: 300, life: 6, kind: chance(0.3) ? 2 : 0 });
        }
      } else if (b.atk === 'blink') {
        if (b.at > 0.5 && !b.summoned) {
          b.summoned = true;
          for (let k = 0; k < (p2 ? 3 : 2); k++) Game.queueSpawn('physicist', b.x + rand(-260, 260), b.y + rand(120, 260), 0.6 + k * 0.2);
        }
      } else if (b.atk === 'stare') {
        if (b.fire <= 0) {
          b.fire = 0.55;
          Bullets.aimAt(b.x, b.y, Game.tx, Game.ty, 330, { col: PI_.red, r: 7, kind: 1 }, 5, 0.5);
          Bullets.ring(b.x, b.y, 16, 120, { col: PI_.pink, r: 6, turn: 0.9 }, b.t * 2);
          Audio2.sfx('bossShot');
        }
      }
      if (b.at >= b.dur) { b.atk = null; b.summoned = false; }
    },
    hit(b, x, y) {
      if (b.open < 0.35) return 0;
      const dx = x - b.x, dy = y - b.y;
      if ((dx * dx) / (84 * 84) + (dy * dy) / (72 * 72) > 1) return 0;
      const px = dx - b.pupX, py = dy - b.pupY;
      return px * px + py * py < 30 * 30 ? 2 : 1;
    },
    draw(b, ctx) {
      const x = b.x, y = b.y, t = b.t, open = b.open;
      // gaze cone(s)
      if (b.atk === 'gaze') {
        const cones = b.phase >= 2 ? [b.gazeA - 0.32, b.gazeA + 0.32] : [b.gazeA];
        ctx.globalCompositeOperation = 'lighter';
        for (const ca of cones) {
          const k = clamp(b.at / 0.6, 0, 1);
          const g = ctx.createRadialGradient(x, y, 60, x, y, 1500);
          g.addColorStop(0, rgba(COL.pink, 0.32 * k)); g.addColorStop(1, rgba(COL.pink, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 1500, ca - 0.2, ca + 0.2); ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.save(); ctx.translate(x, y);
      // halo
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
      ctx.drawImage(softSprite(PI_.pink, 128), -140, -140, 280, 280);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // eye opening clip
      const ry = 72 * Math.max(0.04, open);
      ctx.beginPath(); ctx.ellipse(0, 0, 86, ry, 0, 0, TAU);
      ctx.save(); ctx.clip();
      const sg = ctx.createRadialGradient(-20, -20, 10, 0, 0, 90); sg.addColorStop(0, '#a9a1c9'); sg.addColorStop(0.7, b.phase >= 2 ? '#7a4a63' : '#5d5585'); sg.addColorStop(1, b.phase >= 2 ? '#4a1830' : '#2c2650');
      ctx.fillStyle = sg; ctx.fillRect(-90, -80, 180, 160);
      if (b.phase >= 2) {
        ctx.strokeStyle = 'rgba(200,20,50,.55)'; ctx.lineWidth = 1.6;
        for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 88, Math.sin(a) * 74); ctx.quadraticCurveTo(Math.cos(a + 0.2) * 60, Math.sin(a + 0.25) * 52, Math.cos(a - 0.1) * 42, Math.sin(a - 0.1) * 36); ctx.stroke(); }
      }
      // iris: every phase at once
      const ixp = b.pupX, iyp = b.pupY;
      for (let k = 0; k < 32; k++) {
        ctx.fillStyle = PAL_CSS[(k + Math.floor(t * 8)) % 32];
        ctx.beginPath(); ctx.moveTo(ixp, iyp); ctx.arc(ixp, iyp, 36, k / 32 * TAU, (k + 1.08) / 32 * TAU); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(12,10,24,.45)'; ctx.beginPath(); ctx.arc(ixp, iyp, 36, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(12,10,24,.8)'; ctx.lineWidth = 3; ctx.stroke();
      const pr = 15 + 3 * Math.sin(t * 2.3) + (b.atk === 'gaze' ? -4 : 0);
      ctx.fillStyle = '#05040b'; ctx.beginPath(); ctx.arc(ixp, iyp, pr, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(ixp - 9, iyp - 10, 4, 0, TAU); ctx.fill();
      ctx.restore();
      // lids & lashes
      ctx.strokeStyle = PAL_CSS[PI_.pink]; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, 0, 86, ry, 0, 0, TAU); ctx.stroke();
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        const a = PI + (k + 1) / 10 * PI; const lx = Math.cos(a) * 86, ly = Math.sin(a) * ry;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx * 1.16, ly - 14 - 6 * Math.abs(Math.sin(a))); ctx.stroke();
      }
      ctx.restore();
    },
    onDeath(b) { FX.text(b.x, b.y - 110, 'OBSERVER COLLAPSED', PI_.pink, { size: 30, life: 2.4, vy: -20 }); },
  },

  laplace: {
    name: 'Laplace’s Demon', sub: 'Knows every force in the universe. Aims at your expectation value.', hp: 2350, r: 90, col: 'gold', score: 40000,
    init(b) {
      b.x = W / 2; b.y = 340; b.queue = []; b.atk = null; b.at = 0; b.fire = 0; b.handA = [0, 0, 0];
      b.glyphs = []; const G = ['F = ma', 'ẍ = −∇V', 'δS = 0', 'L = T − V', 'ṗ = −∂H/∂q', 'x(t + dt)', 'dS/dt ≥ 0', '∂ₜρ + ∇·J = 0', 'ω = dθ/dt', 'q̇ = ∂H/∂p'];
      for (let k = 0; k < 10; k++) b.glyphs.push({ s: G[k], a: k / 10 * TAU, r: 150 + (k % 3) * 22 });
      b.logistic = 0.4123; b.rewindT = 0; b.rewindCd = 3; b.preds = [];
    },
    nextAttack(b) {
      if (!b.queue.length) b.queue = shuffle(b.phase >= 3 ? ['predict', 'chaos', 'clockwork', 'rose', 'chaos'] : b.phase >= 2 ? ['predict', 'clockwork', 'rose', 'lissajous'] : ['predict', 'clockwork', 'rose', 'lissajous']);
      b.atk = b.queue.shift(); b.at = 0; b.fire = 0.5;
      b.dur = { predict: 4.2, clockwork: 5.5, rose: 4.6, lissajous: 4.2, chaos: 4.5 }[b.atk];
      const lines = { predict: 'I know where you will be.', clockwork: 'Clockwork universe.', rose: 'r = cos(kθ)', lissajous: 'Harmonic motion.', chaos: 'Logistic map, r = 3.99' };
      Game.bossLine(b, lines[b.atk]);
    },
    update(b, dt) {
      const sp = b.phase >= 3 ? 1.25 : b.phase >= 2 ? 1.12 : 1;
      if (b.rewindT > 0) {
        b.rewindT -= Game.realDt;
        if (b.rewindT <= 0) Game.post.rewind = 0;
        return;
      }
      const tx = W / 2 + Math.sin(b.t * 0.31) * 480, ty = 360 + Math.sin(b.t * 0.62) * 160;
      b.x += (tx - b.x) * damp(1.0, dt); b.y += (ty - b.y) * damp(1.0, dt);
      for (let k = 0; k < 3; k++) b.handA[k] += dt * [0.25, 0.9, 2.4][k] * (b.atk === 'clockwork' ? 1 : 0.4) * sp;
      for (const g of b.glyphs) g.a += dt * 0.35;
      if (b.phase >= 2) {
        b.rewindCd -= dt;
        if (b.rewindCd <= 0 && b.atk !== 'clockwork') { b.rewindCd = 13; this.rewind(b); return; }
      }
      if (!b.atk) this.nextAttack(b);
      b.at += dt; b.fire -= dt;
      if (b.atk === 'predict') {
        // lead the target: classical extrapolation of ⟨x⟩
        if (b.fire <= 0) {
          b.fire = 0.75 / sp;
          const [ex, ey] = [Game.tx, Game.ty];
          const d = Math.hypot(ex - b.x, ey - b.y), tt = d / 420;
          const px = ex + Player.vx * tt, py = ey + Player.vy * tt;
          b.preds.push({ x: px, y: py, t: 0.35 });
          for (let k = 0; k < 5; k++) {
            const i = Bullets.fire(b.x, b.y, 0, 0, { col: PI_.gold, r: 7, kind: 1, delay: 0.32 + k * 0.06, life: 6 });
            if (i >= 0) { const a = Math.atan2(py - b.y, px - b.x) + (Math.random() - 0.5) * 0.05, s = (420 + k * 25) * Game.bulletSpeedMul; Bullets.evx[i] = Math.cos(a) * s; Bullets.evy[i] = Math.sin(a) * s; }
          }
          Audio2.sfx('bossShot');
        }
      } else if (b.atk === 'clockwork') {
        for (let k = 0; k < 3; k++) {
          const warn = b.at < 0.9;
          if (!warn) for (const s of [0, PI]) if (k > 0 || s === 0) Game.beamHit(b.x, b.y, b.handA[k] + s, [520, 900, 1300][k], [9, 7, 5][k], b);
        }
        if (b.fire <= 0 && b.at > 1) { b.fire = 0.5; Bullets.ring(b.x, b.y, 12, 140, { col: PI_.amber, r: 6 }, b.t); }
      } else if (b.atk === 'rose') {
        if (b.fire <= 0) {
          b.fire = 2.1 / sp;
          const k = pick([3, 4, 5, 7]), n = 72, R0 = 150;
          for (let i = 0; i < n; i++) {
            const th = i / n * TAU, r = Math.abs(Math.cos(k * th)) * R0 + 18;
            const x = b.x + Math.cos(th) * r, y = b.y + Math.sin(th) * r;
            const s = 70 + r * 1.1;
            Bullets.fire(x, y, Math.cos(th) * s, Math.sin(th) * s, { col: i % 2 ? PI_.gold : PI_.amber, r: 6, delay: 0.6, life: 7 });
          }
          FX.text(b.x, b.y - 120, 'r = cos(' + k + 'θ)', PI_.gold, { size: 20, font: 'serif', life: 1.4 });
          Audio2.sfx('bossShot');
        }
      } else if (b.atk === 'lissajous') {
        if (b.fire <= 0) {
          b.fire = 0.05 / sp;
          const a1 = Math.sin(b.at * 3) * 1.4 + PI / 2, a2 = Math.sin(b.at * 2 + PI / 2) * 1.4 + PI / 2;
          for (const a of [a1, a2, a1 + PI, a2 + PI]) Bullets.fire(b.x, b.y, Math.cos(a) * 230, Math.sin(a) * 230, { col: PI_.yellow, r: 5.5, kind: 1, life: 7 });
        }
      } else if (b.atk === 'chaos') {
        if (b.fire <= 0) {
          b.fire = 0.045 / sp;
          b.logistic = 3.99 * b.logistic * (1 - b.logistic);
          const a = b.logistic * TAU * 2;
          for (const o of [0, TAU / 3, 2 * TAU / 3]) Bullets.fire(b.x, b.y, Math.cos(a + o) * 210, Math.sin(a + o) * 210, { col: PI_.orange, r: 6, life: 7 });
        }
      }
      for (let i = b.preds.length - 1; i >= 0; i--) { b.preds[i].t -= dt; if (b.preds[i].t < -0.4) b.preds.splice(i, 1); }
      if (b.at >= b.dur) b.atk = null;
    },
    rewind(b) {
      b.rewindT = 2.2; Game.post.rewind = 1;
      for (let i = 0; i < Bullets.en; i++) { Bullets.evx[i] *= -1.15; Bullets.evy[i] *= -1.15; Bullets.elife[i] = Math.max(Bullets.elife[i], 4); }
      b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.035);
      Game.banner('◀◀ REWIND', 'Restoring a previous state of the universe', 1.6);
      Audio2.sfx('rewind');
    },
    hit(b, x, y) { const dx = x - b.x, dy = y - b.y; return dx * dx + dy * dy < 88 * 88 ? 1 : 0; },
    draw(b, ctx) {
      const x = b.x, y = b.y, t = b.t;
      // predicted positions
      for (const p of b.preds) {
        const k = clamp(p.t / 0.35, 0, 1);
        ctx.strokeStyle = rgba(COL.gold, 0.25 + 0.5 * (1 - k)); ctx.lineWidth = 1.4; ctx.setLineDash([4, 7]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 16 + 10 * k, 0, TAU); ctx.moveTo(p.x - 26, p.y); ctx.lineTo(p.x + 26, p.y); ctx.moveTo(p.x, p.y - 26); ctx.lineTo(p.x, p.y + 26); ctx.stroke();
      }
      // clock hands as beams
      if (b.atk === 'clockwork') {
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 3; k++) {
          const warn = b.at < 0.9, L = [520, 900, 1300][k], w = [9, 7, 5][k];
          for (const s of [0, PI]) {
            if (k === 0 && s) continue;
            const a = b.handA[k] + s, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
            ctx.strokeStyle = warn ? rgba(COL.gold, 0.3) : rgba(COL.gold, 0.85); ctx.lineWidth = warn ? 1.5 : w * 2;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
            if (!warn) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = w * 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); }
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // orbiting equations
      ctx.font = 'italic 400 17px Qtext, Qmath, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const g of b.glyphs) { ctx.fillStyle = rgba(COL.gold, 0.7); ctx.fillText(g.s, x + Math.cos(g.a) * g.r, y + Math.sin(g.a) * g.r * 0.62); }
      ctx.save(); ctx.translate(x, y);
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(softSprite(PI_.gold, 128), -160, -160, 320, 320); ctx.globalCompositeOperation = 'source-over';
      // horns
      ctx.fillStyle = '#2a1f10'; ctx.strokeStyle = PAL_CSS[PI_.gold]; ctx.lineWidth = 3;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 40, -74); ctx.quadraticCurveTo(s * 70, -120, s * 96, -138); ctx.quadraticCurveTo(s * 72, -100, s * 66, -60); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // face
      ctx.fillStyle = '#17120a'; ctx.beginPath(); ctx.arc(0, 0, 88, 0, TAU); ctx.fill();
      ctx.lineWidth = 5; ctx.stroke();
      ctx.lineWidth = 2;
      for (let k = 0; k < 60; k++) { const a = k / 60 * TAU, r0 = k % 5 ? 80 : 72; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * 86, Math.sin(a) * 86); ctx.stroke(); }
      ctx.font = '600 13px Qtext, serif'; ctx.fillStyle = PAL_CSS[PI_.gold];
      const RN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU - PI / 2; ctx.fillText(RN[k], Math.cos(a) * 61, Math.sin(a) * 61); }
      // eyes
      const glare = b.rewindT > 0 ? '#4cf2ff' : b.phase >= 3 ? '#ff3b55' : '#ffcf4a';
      ctx.fillStyle = glare;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 26, -18, 14, 4.5, s * 0.3, 0, TAU); ctx.fill(); }
      // hands
      ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
      const lens = [34, 52, 64], wid = [5, 3.5, 1.6];
      for (let k = 0; k < 3; k++) { const a = b.handA[k] - PI / 2 * 0; ctx.lineWidth = wid[k]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * lens[k], Math.sin(a) * lens[k]); ctx.stroke(); }
      ctx.fillStyle = PAL_CSS[PI_.gold]; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      ctx.restore();
      if (b.rewindT > 0) { ctx.font = '700 28px Qmono, monospace'; ctx.fillStyle = '#4cf2ff'; ctx.fillText('◀◀', x, y + 120); }
      void t;
    },
    onDeath(b) {
      const G = ['∫', '∂', 'Σ', 'π', 'ℏ', 'ψ', '∇', 'λ', 'Δ', 'ω', '∞', '≈', 'θ', 'φ'];
      for (let k = 0; k < 40; k++) { const a = Math.random() * TAU, s = rand(120, 460); FX.text(b.x, b.y, pick(G), pick([PI_.gold, PI_.amber, PI_.white]), { vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rand(16, 34), font: 'serif', life: rand(1.2, 2.2), vr: rand(-6, 6), drag: 1.2 }); }
      FX.text(b.x, b.y - 130, '“But… I computed everything.”', PI_.gold, { size: 22, font: 'serif', life: 2.6, vy: -14 });
    },
  },

  die: {
    name: 'The Celestial Die', sub: 'Einstein said God does not play dice. Nobody told the dice.', hp: 2900, r: 92, col: 'white', score: 60000,
    init(b) {
      b.x = W / 2; b.y = H / 2 - 150; b.q = Qn.axis(1, 1, 0, 0.6); b.state = 'roll'; b.st = 1.4; b.result = 0; b.qFrom = null; b.qTo = null;
      b.vx = rand(-1, 1) * 420; b.vy = rand(-1, 1) * 420; b.spinAx = [Math.random(), Math.random(), Math.random()]; b.spin = 9;
      b.shape = 'd6'; b.stun = 0; b.acts = 0; b.rolls = [];
    },
    update(b, dt) {
      if (b.phase >= 3 && b.shape === 'd6') { b.shape = 'd20'; Game.banner('CRITICAL PHASE', 'The die has become a d20', 2); FX.ring(b.x, b.y, 30, 400, 0.8, PI_.white, 6); addTrauma(0.6); Audio2.sfx('bossPhase'); }
      if (b.stun > 0) { b.stun -= dt; b.q = Qn.mul(Qn.axis(0, 0, 1, dt * 0.5), b.q); b.invuln = false; return; }
      b.st -= dt;
      if (b.state === 'roll') {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 120 || b.x > W - 120) { b.vx = -b.vx; b.x = clamp(b.x, 120, W - 120); addTrauma(0.2); Grid.impulse(b.x, b.y, 500, 220); Audio2.sfx('thud'); }
        if (b.y < 120 || b.y > H - 120) { b.vy = -b.vy; b.y = clamp(b.y, 120, H - 120); addTrauma(0.2); Grid.impulse(b.x, b.y, 500, 220); Audio2.sfx('thud'); }
        b.q = Qn.norm(Qn.mul(Qn.axis(b.spinAx[0], b.spinAx[1], b.spinAx[2], b.spin * dt), b.q));
        if (b.st <= 0) {
          const faces = b.shape === 'd20' ? 20 : 6;
          b.result = 1 + Math.floor(Math.random() * faces);
          const geo = b.shape === 'd20' ? D20.F : D6;
          const f = geo.find(g => g.v === b.result);
          const cur = Qn.rot(b.q, f.n);
          b.qFrom = b.q; b.qTo = Qn.norm(Qn.mul(Qn.fromTo(cur, [0, 0, 1]), b.q));
          b.state = 'land'; b.st = 0.45;
        }
      } else if (b.state === 'land') {
        b.vx *= Math.exp(-6 * dt); b.vy *= Math.exp(-6 * dt); b.x += b.vx * dt; b.y += b.vy * dt;
        b.q = Qn.slerp(b.qFrom, b.qTo, easeOutCubic(1 - b.st / 0.45));
        if (b.st <= 0) {
          b.q = b.qTo; b.state = 'act'; b.at = 0; b.fire = 0.2; this.reset(b);
          const n = b.result; b.rolls.push(n); Game.stats.dieRolls = b.rolls.slice(-12);
          const crit = b.shape === 'd20' && (n === 20 || n === 1);
          b.dur = crit ? (n === 1 ? 3 : 5) : 3.6;
          b.pattern = b.shape === 'd20' ? (n === 20 ? 'crit' : n === 1 ? 'fumble' : ((n - 1) % 6) + 1) : n;
          Game.banner(n === 20 && b.shape === 'd20' ? 'NATURAL 20' : n === 1 && b.shape === 'd20' ? 'NATURAL 1' : 'ROLLED ' + n, b.shape === 'd20' ? (n === 20 ? 'Critical hit.' : n === 1 ? 'Critical fumble. It hurt itself.' : '') : '', 1.2);
          Audio2.sfx('roll', n);
          FX.ring(b.x, b.y, 40, 200, 0.5, PI_.white, 4);
          if (b.pattern === 'fumble') { b.hp -= b.maxHp * 0.08; b.stun = 3; b.flash = 0.5; addTrauma(0.5); FX.burst(b.x, b.y, 60, 400, [PI_.white, PI_.gold], { life: 0.9 }); }
        }
      } else if (b.state === 'act') {
        b.at += dt; b.fire -= dt;
        this.attack(b, dt, b.pattern, b.shape === 'd20' ? 1.25 : 1);
        if (b.at >= b.dur) {
          b.state = 'roll'; b.st = b.phase >= 2 ? 1.0 : 1.4;
          const a = Math.random() * TAU, s = rand(380, 560); b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s;
          b.spinAx = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]; b.spin = rand(8, 13);
        }
      }
    },
    attack(b, dt, p, mul) {
      const tx = Game.tx, ty = Game.ty;
      if (p === 1) {
        if (!b.one) {
          b.one = true;
          const a = Math.atan2(ty - b.y, tx - b.x);
          Bullets.fire(b.x, b.y, Math.cos(a) * 170, Math.sin(a) * 170, { col: PI_.white, r: 34, kind: 2, life: 2.4 });
        }
        if (b.at > 2.3 && !b.oneBurst) {
          b.oneBurst = true;
          // find the big bullet (largest radius) and burst it
          let best = -1, br = 0; for (let i = 0; i < Bullets.en; i++) if (Bullets.er[i] > br) { br = Bullets.er[i]; best = i; }
          if (best >= 0 && br > 30) { const x = Bullets.ex[best], y = Bullets.ey[best]; Bullets.killE(best); Bullets.ring(x, y, Math.round(44 * mul), 170, { col: PI_.white, r: 7 }); Bullets.ring(x, y, 22, 110, { col: PI_.gold, r: 9, kind: 2 }, 0.1); FX.ring(x, y, 10, 160, 0.4, PI_.white, 4); addTrauma(0.3); Audio2.sfx('boom'); }
        }
      } else if (p === 2) {
        if (b.fire <= 0) { b.fire = 0.06 / mul; for (const s of [1, -1]) { const a = b.at * 2.6 * s; for (const o of [0, PI]) Bullets.fire(b.x, b.y, Math.cos(a + o) * 200, Math.sin(a + o) * 200, { col: s > 0 ? PI_.ice : PI_.pink, r: 6 }); } }
      } else if (p === 3) {
        const warn = b.at < 0.8;
        b.laserA = (b.laserA || 0) + dt * 0.75 * mul;
        if (!warn) for (let k = 0; k < 3; k++) Game.beamHit(b.x, b.y, b.laserA + k * TAU / 3, 1500, 9, b);
        if (b.fire <= 0 && !warn) { b.fire = 0.7; Bullets.ring(b.x, b.y, 9, 130, { col: PI_.white, r: 6 }, b.laserA); }
      } else if (p === 4) {
        if (b.fire <= 0) {
          b.fire = 0.95 / mul;
          const side = (b.wallK = (b.wallK || 0) + 1) % 4; const gap = rand(0.2, 0.8); const n = 26;
          for (let k = 0; k < n; k++) {
            const f = (k + 0.5) / n; if (Math.abs(f - gap) < 0.09) continue;
            const o = { col: PI_.red, r: 8, life: 10 };
            if (side === 0) Bullets.fire(f * W, 10, 0, 150, o); else if (side === 1) Bullets.fire(W - 10, f * H, -150, 0, o);
            else if (side === 2) Bullets.fire(f * W, H - 10, 0, -150, o); else Bullets.fire(10, f * H, 150, 0, o);
          }
          Audio2.sfx('bossShot');
        }
      } else if (p === 5) {
        if (!b.mines) {
          b.mines = true;
          for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; const i = Bullets.fire(b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90, Math.cos(a) * 120, Math.sin(a) * 120, { col: PI_.orange, r: 11, kind: 3, life: 4.2 * mul }); if (i >= 0) Bullets.eflag[i] |= 8; }
          Audio2.sfx('bossShot');
        }
      } else if (p === 6) {
        if (b.fire <= 0) { b.fire = 0.09 / mul; const base = Math.atan2(ty - b.y, tx - b.x) + Math.sin(b.at * 2) * 0.6; for (let k = 0; k < 6; k++) { const a = base + k * TAU / 6; Bullets.fire(b.x, b.y, Math.cos(a) * 300, Math.sin(a) * 300, { col: PI_.yellow, r: 5.5, kind: 1 }); } }
      } else if (p === 'crit') {
        if (b.fire <= 0) {
          b.fire = 0.16;
          const gapX = W / 2 + Math.sin(b.at * 0.9) * W * 0.32;
          for (let x = 30; x < W; x += 52) { if (Math.abs(x - gapX) < 120) continue; Bullets.fire(x + rand(-8, 8), 5, rand(-10, 10), 260, { col: PI_.red, r: 7, kind: 1, life: 6 }); }
          if (Math.floor(b.at / 0.8) !== b.critK) { b.critK = Math.floor(b.at / 0.8); Bullets.ring(b.x, b.y, 30, 150, { col: PI_.white, r: 7 }, b.at); }
        }
      }
    },
    reset(b) { b.one = b.oneBurst = b.mines = false; },
    hit(b, x, y) { const dx = x - b.x, dy = y - b.y; return dx * dx + dy * dy < 90 * 90 ? (b.stun > 0 ? 2 : 1) : 0; },
    draw(b, ctx) {
      const S = 66; const x = b.x, y = b.y;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3; ctx.drawImage(softSprite(b.stun > 0 ? PI_.red : PI_.violet, 128), x - 160, y - 160, 320, 320); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const proj = v => { const p = Qn.rot(b.q, v); const f = 5 / (5 - p[2] * 0.6); return [x + p[0] * S * f, y - p[1] * S * f, p[2]]; };
      if (b.shape === 'd6') {
        const faces = D6.map(f => ({ f, n: Qn.rot(b.q, f.n) })).filter(o => o.n[2] > 0.001).sort((a, c) => a.n[2] - c.n[2]);
        for (const { f, n } of faces) {
          const c = f.n, u = f.u, w = f.w;
          const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => proj([c[0] + u[0] * s + w[0] * t, c[1] + u[1] * s + w[1] * t, c[2] + u[2] * s + w[2] * t]));
          ctx.beginPath(); corners.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
          const shade = 0.25 + 0.55 * n[2];
          ctx.fillStyle = `rgba(${22 + 30 * shade},${18 + 22 * shade},${44 + 50 * shade},0.97)`; ctx.fill();
          ctx.strokeStyle = 'rgba(176,128,255,.9)'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = f.v === 1 ? PAL_CSS[PI_.red] : '#d9d3f3';
          for (const [ps, pt] of PIPS[f.v]) {
            const p = proj([c[0] + u[0] * ps + w[0] * pt, c[1] + u[1] * ps + w[1] * pt, c[2] + u[2] * ps + w[2] * pt]);
            ctx.beginPath(); ctx.arc(p[0], p[1], (f.v === 1 ? 13 : 8.5) * Math.sqrt(n[2]), 0, TAU); ctx.fill();
          }
        }
      } else {
        const faces = D20.F.map(f => ({ f, n: Qn.rot(b.q, f.n) })).filter(o => o.n[2] > 0.001).sort((a, c) => a.n[2] - c.n[2]);
        const R1 = 1.25;
        for (const { f, n } of faces) {
          const pts = f.idx.map(i => proj(D20.V[i].map(c => c * R1)));
          ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
          const shade = 0.25 + 0.6 * n[2];
          ctx.fillStyle = `rgba(${40 + 60 * shade},${16 + 20 * shade},${50 + 60 * shade},0.97)`; ctx.fill();
          ctx.strokeStyle = PAL_CSS[(f.v * 3) % 32]; ctx.lineWidth = 2.5; ctx.stroke();
          if (n[2] > 0.3) {
            const c = proj(f.c.map(v => v * R1));
            ctx.font = `700 ${Math.round(22 * n[2])}px Qtext, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = f.v === 20 ? PAL_CSS[PI_.gold] : f.v === 1 ? PAL_CSS[PI_.red] : '#fff'; ctx.fillText(String(f.v), c[0], c[1]);
          }
        }
      }
      if (b.stun > 0) { ctx.font = '700 18px Qmono, monospace'; ctx.fillStyle = PAL_CSS[PI_.red]; ctx.textAlign = 'center'; ctx.fillText('STUNNED', x, y - 110); }
    },
    onDeath(b) {
      for (let k = 0; k < 60; k++) FX.spawn(b.x + rand(-60, 60), b.y + rand(-60, 60), rand(-400, 400), rand(-400, 400), rand(0.8, 1.6), rand(5, 10), pick([PI_.white, PI_.red, PI_.gold]), 2, 1.5);
      FX.text(b.x, b.y - 130, 'Alea iacta est.', PI_.white, { size: 26, font: 'serif', life: 2.6, vy: -14 });
    },
  },
};
