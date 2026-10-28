// ---------- fields: everything that pushes, bends, slows or swallows things ----------
// Laws of physics, black holes, dark matter, magnetars, the Higgs field and boss fields all plug in here,
// and act on cats, enemies and both kinds of bullet through the same four optional methods:
//   acc(s, x, y, k, o)  add an acceleration into o      rot(s, x, y, k)  turn the velocity (rad/s)
//   slow(s, x, y, k, e) time multiplier (0 freezes)      sink(s, x, y, k) true if it swallows the thing
const K_CAT = 0, K_EN = 1, K_PB = 2, K_EB = 3, K_PICK = 4;
const Fields = {
  acc: [], rot: [], slow: [], sink: [], o: [0, 0],
  begin() {
    for (const k of ['acc', 'rot', 'slow', 'sink']) this[k].length = 0;
    for (const id in Anom.on) this.add(LAWS[id], Anom.on[id]);
    for (const e of Game.enemies) if (!e.dead && !e.spawning && e.def.field) this.add(e.def.field, e, e.boss);
    if (Holes.list.length) this.add(Holes, Holes);
    for (const v of Events.list) if (v.def.field) this.add(v.def.field, v);
    if (Mods.nonlocal && !Player.dead) this.add(NONLOCAL, Player);
  },
  add(d, s, boss) { for (const k of ['acc', 'rot', 'slow', 'sink']) if (d[k]) this[k].push(d, s, boss); },
  // neutral bullets (photons) ignore boss fields
  accel(x, y, k, neutral) {
    const o = this.o, A = this.acc; o[0] = o[1] = 0;
    for (let i = 0; i < A.length; i += 3) if (!(neutral && A[i + 2])) A[i].acc(A[i + 1], x, y, k, o);
    return o;
  },
  spin(x, y, k, neutral) { let w = 0; const A = this.rot; for (let i = 0; i < A.length; i += 3) if (!(neutral && A[i + 2])) w += A[i].rot(A[i + 1], x, y, k); return w; },
  time(x, y, k, e) { let m = 1; const A = this.slow; for (let i = 0; i < A.length; i += 3) m *= A[i].slow(A[i + 1], x, y, k, e); return m; },
  swallow(x, y, k) { const A = this.sink; for (let i = 0; i < A.length; i += 3) if (A[i].sink(A[i + 1], x, y, k)) return A[i + 1]; return null; },
  // a plain moving body (enemy, cat, pick-up): velocity in place, returns the time multiplier
  push(b, k, dt) {
    if (this.acc.length) { const o = this.accel(b.x, b.y, k); b.vx += o[0] * dt; b.vy += o[1] * dt; }
    if (this.rot.length) { const w = this.spin(b.x, b.y, k) * dt; if (w) rotV(b, w); }
    return this.slow.length ? this.time(b.x, b.y, k, b) : 1;
  },
};
// Pilot-Wave's nonlocal potential: enemy bullets near the cats are slowed
const NONLOCAL = { slow: (P, x, y, k) => k === K_EB && wdx(x - P.x) ** 2 + wdy(y - P.y) ** 2 < 140 * 140 ? 0.7 : 1 };
function rotV(b, w) { const c = Math.cos(w), s = Math.sin(w), vx = b.vx; b.vx = vx * c - b.vy * s; b.vy = vx * s + b.vy * c; }
// inverse-square pull toward (cx, cy) with softening, added into o
function pullTo(o, x, y, cx, cy, GM, soft, rmax) {
  const dx = wdx(cx - x), dy = wdy(cy - y), r2 = dx * dx + dy * dy;
  if (rmax && r2 > rmax * rmax) return;
  const r = Math.sqrt(r2) || 1, a = GM / (r2 + soft);
  o[0] += dx / r * a; o[1] += dy / r * a;
}

// ---------- bullets: two struct-of-arrays pools (see Pool) ----------
// your photons. flag: 1 ghost, 2 pierce, 4 ricochet
const PB = Pool(3000, 'x y vx vy life dmg col:u flag:u last:i kind:u age w');
// enemy bullets. flag: 1 grazed, 2 superposed, 4 marked, 8 mine, 32 spring, 64 neutral, 128 molecule
const EB = Pool(4000, 'x y vx vy r life col:u kind:u acc turn flag:u delay max min age gx gy cx cy k bn:u q:s dop');

const Bullets = {
  clear() { PB.n = EB.n = 0; },
  firePlayer(x, y, vx, vy, dmg, ci, ghost) {
    if (PB.n >= PB.max) return;
    const i = PB.n++;
    PB.x[i] = x; PB.y[i] = y; PB.vx[i] = vx; PB.vy[i] = vy; PB.age[i] = 0; PB.w[i] = 0; PB.last[i] = 0;
    PB.life[i] = CFG.player.bulletLife * Anom.mul('bulletLife'); PB.dmg[i] = dmg * (ghost ? 0.6 : 1); PB.col[i] = ci;
    PB.flag[i] = (ghost ? 1 : 0) | (Player.pierce > 0 || (Mods.pierce && Math.random() < Mods.pierce) ? 2 : 0) | (Mods.ricochet ? 4 : 0);
    PB.kind[i] = Anom.active('duality') ? 1 : 0;
  },
  ringPlayer(x, y, n, ci) { for (let k = 0; k < n; k++) { const a = k / n * TAU, sp = CFG.player.bulletSpeed * 0.7; this.firePlayer(x, y, Math.cos(a) * sp, Math.sin(a) * sp, CFG.player.bulletDmg * Mods.dmg * 0.8, ci); } },
  // o: {r, col, kind, acc, turn, life, delay, max, min, gx, gy, spring:{x,y,k}, bounce, q, neutral, mol, mine}
  fire(x, y, vx, vy, o = {}) {
    if (EB.n >= EB.max) return -1;
    const i = EB.n++, sm = Game.bulletSpeedMul;
    EB.x[i] = x; EB.y[i] = y; EB.vx[i] = vx * sm; EB.vy[i] = vy * sm;
    EB.r[i] = o.r || 7; EB.life[i] = o.life || 9; EB.col[i] = o.col ?? PI_.red; EB.kind[i] = o.kind || 0;
    EB.acc[i] = (o.acc || 0) * sm; EB.turn[i] = o.turn || 0; EB.delay[i] = o.delay || 0;
    EB.max[i] = (o.max || 1e9) * sm; EB.min[i] = (o.min || 0) * sm; EB.age[i] = 0;
    EB.gx[i] = o.gx || 0; EB.gy[i] = o.gy || 0; EB.bn[i] = o.bounce || 0; EB.q[i] = o.q || 0; EB.dop[i] = 0;
    EB.flag[i] = (o.spring ? 32 : 0) | (o.neutral ? 64 : 0) | (o.mol ? 128 : 0) | (o.mine ? 8 : 0);
    if (o.spring) { EB.cx[i] = o.spring.x; EB.cy[i] = o.spring.y; EB.k[i] = o.spring.k; }
    Anom.each('onFire', EB, i);
    return i;
  },
  ring(x, y, n, speed, o, a0 = 0) { for (let k = 0; k < n; k++) { const a = a0 + (k / n) * TAU; this.fire(x, y, Math.cos(a) * speed, Math.sin(a) * speed, o); } },
  fan(x, y, angle, n, spread, speed, o) { for (let k = 0; k < n; k++) { const a = n === 1 ? angle : angle - spread / 2 + (k / (n - 1)) * spread; this.fire(x, y, Math.cos(a) * speed, Math.sin(a) * speed, o); } },
  aimAt(x, y, tx, ty, speed, o, n = 1, spread = 0) { this.fan(x, y, Math.atan2(wdy(ty - y), wdx(tx - x)), n, spread, speed, o); },
  // biggest live bullet (the die's orb)
  biggest(minR) { let best = -1, br = minR; for (let i = 0; i < EB.n; i++) if (EB.r[i] > br) { br = EB.r[i]; best = i; } return best; },

  // one motion routine for both pools
  move(P, dt) {
    const en = P === EB, k = en ? K_EB : K_PB, wrap = World.wrap, Wl = Game.wall, bx = Game.box;
    const x0 = bx ? bx.x0 : 0, y0 = bx ? bx.y0 : 0, x1 = bx ? bx.x1 : W, y1 = bx ? bx.y1 : H, edge = en ? 60 : 20;
    const fa = Fields.acc.length, fr = Fields.rot.length, fs = Fields.slow.length, fk = Fields.sink.length, hooks = Anom.hooks.bullet;
    let i = 0;
    while (i < P.n) {
      if (en && P.delay[i] > 0) { P.delay[i] -= dt; i++; continue; }
      P.age[i] += dt;
      if ((P.life[i] -= dt) <= 0) { this.expire(P, i); continue; }
      const ox = P.x[i], oy = P.y[i], fl = en ? P.flag[i] : 0, neutral = !!(fl & 64);
      const m = fs ? Fields.time(ox, oy, k) : 1;
      let vx = P.vx[i], vy = P.vy[i];
      if (m > 0) {
        if (en) {
          if (fl & 8) { // homing mine: steer toward ⟨x⟩
            const cur = Math.atan2(vy, vx), na = cur + clamp(angDiff(cur, Math.atan2(wdy(Game.ty - oy), wdx(Game.tx - ox))), -1.6 * dt, 1.6 * dt), sp = Math.hypot(vx, vy);
            vx = Math.cos(na) * sp; vy = Math.sin(na) * sp;
          }
          if (fl & 32) { vx -= P.k[i] * (ox - P.cx[i]) * dt; vy -= P.k[i] * (oy - P.cy[i]) * dt; }
          if (P.turn[i]) { const a = P.turn[i] * dt, c = Math.cos(a), s = Math.sin(a), nx = vx * c - vy * s; vy = vx * s + vy * c; vx = nx; }
          if (P.acc[i]) { const sp = Math.hypot(vx, vy) || 1, ns = clamp(sp + P.acc[i] * dt, P.min[i], P.max[i]); vx *= ns / sp; vy *= ns / sp; }
          vx += P.gx[i] * dt; vy += P.gy[i] * dt;
        } else if (Mods.homing && P.age[i] > 0.04) [vx, vy] = this.home(ox, oy, vx, vy, dt);
        if (fa) { const o = Fields.accel(ox, oy, k, neutral); vx += o[0] * dt; vy += o[1] * dt; }
        if (fr) { const a = Fields.spin(ox, oy, k, neutral) * dt; if (a) { const c = Math.cos(a), s = Math.sin(a), nx = vx * c - vy * s; vy = vx * s + vy * c; vx = nx; } }
        P.vx[i] = vx; P.vy[i] = vy;
        for (let h = 0; h < hooks.length; h += 2) hooks[h].bullet(hooks[h + 1], P, i, dt, k);
        vx = P.vx[i]; vy = P.vy[i];
      }
      let x = ox + vx * dt * m, y = oy + vy * dt * m;
      if (fk && Fields.swallow(x, y, k)) { P.kill(i); continue; }
      if (Wl && !wrap && ((ox - Wl.x) * (x - Wl.x) <= 0 || Math.abs(x - Wl.x) < Wl.hw) && !(Wl.open && y > Wl.d0 && y < Wl.d1)) { // Maxwell's membrane
        if (!en) { FX.sparks(Wl.x, y, 2, 140, P.col[i], ox < Wl.x ? PI : 0, 1.4, 0.2); P.kill(i); continue; }
        const side = ox < Wl.x ? -1 : 1; x = Wl.x + side * (Wl.hw + 1); P.vx[i] = Math.abs(P.vx[i]) * side;
      }
      if (wrap) { x = wrapX(x); y = wrapY(y); }
      else if (x < x0 || x > x1 || y < y0 || y > y1) {
        if (en ? P.bn[i] > 0 : P.flag[i] & 4) { // bounce / ricochet
          if (x < x0) { x = 2 * x0 - x; P.vx[i] = Math.abs(P.vx[i]); } else if (x > x1) { x = 2 * x1 - x; P.vx[i] = -Math.abs(P.vx[i]); }
          if (y < y0) { y = 2 * y0 - y; P.vy[i] = Math.abs(P.vy[i]); } else if (y > y1) { y = 2 * y1 - y; P.vy[i] = -Math.abs(P.vy[i]); }
          if (en) P.bn[i]--; else { P.flag[i] &= ~4; P.life[i] = Math.max(P.life[i], 0.45); }
        } else if (x < x0 - edge || x > x1 + edge || y < y0 - edge || y > y1 + edge) {
          if (!en) FX.spawn(clamp(x, x0, x1), clamp(y, y0, y1), 0, 0, 0.15, 4, P.col[i]);
          P.kill(i); continue;
        }
      }
      P.x[i] = x; P.y[i] = y;
      if (!en && P.kind[i] === 1) P.w[i] = Math.min(46, P.w[i] + dt * 120);
      i++;
    }
  },
  expire(P, i) {
    const x = P.x[i], y = P.y[i], c = P.col[i], en = P === EB, mine = en && P.flag[i] & 8, r = en ? P.r[i] : 0;
    P.kill(i);
    if (!en) return;
    if (mine) { this.ring(x, y, 9, 170, { col: c === PI_.gold ? PI_.gold : PI_.orange, r: 6.5 }, Math.random() * TAU); FX.ring(x, y, 6, 70, 0.3, PI_.orange, 3); }
    else FX.spawn(x, y, 0, 0, 0.25, r * 0.9, c);
  },
  // guided photons: turn toward the nearest enemy in range
  home(x, y, vx, vy, dt) {
    const best = Game.nearestEnemy(x, y, 320); if (!best) return [vx, vy];
    const e = Game.nearE, lead = Mods.lead && e && !e.boss ? Math.hypot(wdx(best.x - x), wdy(best.y - y)) / (Math.hypot(vx, vy) || 1) : 0; // the guiding equation: aim where it is going
    const tx = best.x + (e.vx || 0) * lead, ty = best.y + (e.vy || 0) * lead;
    const cur = Math.atan2(vy, vx), lim = 3.4 * Mods.homing * dt, t = clamp(angDiff(cur, Math.atan2(wdy(ty - y), wdx(tx - x))), -lim, lim), c = Math.cos(t), s = Math.sin(t);
    return [vx * c - vy * s, vx * s + vy * c];
  },
  // kill enemy bullets inside a circle; returns how many
  clearNear(x, y, r, fx = 0.5) {
    let n = 0;
    for (let i = EB.n - 1; i >= 0; i--) {
      const dx = wdx(EB.x[i] - x), dy = wdy(EB.y[i] - y);
      if (dx * dx + dy * dy < r * r) { if (Math.random() < fx) FX.spawn(EB.x[i], EB.y[i], dx * 1.5 * fx, dy * 1.5 * fx - 40, 0.45, 4, EB.col[i]); EB.kill(i); n++; }
    }
    return n;
  },

  drawPlayer(ctx, vr, planck) {
    if (!PB.n) return;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = planck ? 'butt' : 'round';
    ctx.lineWidth = 3;
    for (let i = 0; i < PB.n; i++) { // wave arcs (duality)
      if (PB.kind[i] !== 1) continue;
      const x = ix(PB.x[i]), y = iy(PB.y[i]), a = Math.atan2(PB.vy[i], PB.vx[i]), w = 6 + PB.w[i];
      ctx.strokeStyle = PAL_CSS[PB.col[i]]; ctx.globalAlpha = 0.85 * Math.min(1, PB.life[i] * 4);
      ctx.beginPath(); ctx.arc(x - Math.cos(a) * w, y - Math.sin(a) * w, w, a - 0.75, a + 0.75); ctx.stroke();
    }
    // bolts batched per colour: a wide coloured stroke, then a core (the trail style is a cosmetic)
    const style = planck ? 'pixel' : (Save.d && Save.d.cos.trail) || 'bolt', seen = new Uint8Array(PAL.length);
    if (style === 'rainbow' && (Game.rt * 20 | 0) % 2) for (let i = 0; i < PB.n; i++) if (PB.col[i] < PHASE_N) PB.col[i] = (PB.col[i] + 1) % PHASE_N;
    for (let i = 0; i < PB.n; i++) if (PB.kind[i] === 0) seen[PB.col[i]] = 1;
    const tail = style === 'comet' ? 0.05 : 0.02, ink = style === 'quill';
    if (ink) ctx.globalCompositeOperation = 'source-over';
    for (let c = 0; c < seen.length; c++) {
      if (!seen[c]) continue;
      for (let pass = 0; pass < 2; pass++) {
        ctx.lineWidth = pass ? (ink ? 2 : 1.3) : style === 'comet' ? 5 : ink ? 4.5 : 3.6; ctx.globalAlpha = pass ? 0.95 : 0.55;
        ctx.strokeStyle = ctx.fillStyle = pass ? (ink ? '#120d22' : 'rgba(255,255,255,0.9)') : PAL_CSS[c];
        ctx.beginPath();
        for (let i = 0; i < PB.n; i++) {
          if (PB.col[i] !== c || PB.kind[i] !== 0) continue;
          const x = ix(PB.x[i]), y = iy(PB.y[i]);
          if (x < vr.x0 || x > vr.x1 || y < vr.y0 || y > vr.y1) continue;
          const k = Math.min(tail, PB.age[i]) * (PB.flag[i] & 1 ? 0.6 : 1), vx = PB.vx[i] * k, vy = PB.vy[i] * k;
          if (style === 'pixel') { const r = pass ? 1.6 : 3.4; ctx.rect(x - r, y - r, r * 2, r * 2); continue; }
          ctx.moveTo(x, y);
          if (style === 'photon') { const w = Math.sin(PB.age[i] * 70) * 4, l = Math.hypot(vx, vy) || 1; ctx.lineTo(x - vx * 0.5 - vy / l * w, y - vy * 0.5 + vx / l * w); }
          ctx.lineTo(x - vx, y - vy);
        }
        if (style === 'pixel') ctx.fill(); else ctx.stroke();
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  },
  drawEnemy(ctx, vr, planck) {
    if (!EB.n) return;
    const m = ctx.getTransform(), t = Game.rt;
    for (let i = 0; i < EB.n; i++) {
      const x = ix(EB.x[i]), y = iy(EB.y[i]);
      if (x < vr.x0 - 30 || x > vr.x1 + 30 || y < vr.y0 - 30 || y > vr.y1 + 30) continue;
      const r = EB.r[i], kind = EB.kind[i];
      let s = r / EB_RING, alpha = 1;
      if (EB.delay[i] > 0) alpha = 0.35 + 0.3 * Math.sin(t * 30);
      if (EB.flag[i] & 2) alpha *= 0.55; // superposed bullet
      if (EB.life[i] < 0.3) alpha *= EB.life[i] / 0.3;
      ctx.globalAlpha = alpha;
      if (planck) {
        ctx.fillStyle = PAL_CSS[EB.col[i]]; ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - r * 0.6, y - r * 0.6, r * 1.2, r * 1.2);
        continue;
      }
      const spr = bulletSprite(EB.col[i], kind);
      if (kind === 1 || kind === 3) {
        ctx.setTransform(m); ctx.translate(x, y); ctx.rotate(kind === 1 ? Math.atan2(EB.vy[i], EB.vx[i]) : t * 4 + i);
        ctx.drawImage(spr, -s / 2, -s / 2, s, s);
      } else {
        if (kind === 2) s *= 1 + 0.06 * Math.sin(t * 14 + i);
        ctx.drawImage(spr, x - s / 2, y - s / 2, s, s);
      }
    }
    ctx.setTransform(m); ctx.globalAlpha = 1;
  },
};
