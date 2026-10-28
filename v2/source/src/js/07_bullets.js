// ---------- bullets (struct-of-arrays pools) ----------
const PB_MAX = 3000, EB_MAX = 4000;
const Bullets = {
  // player
  pn: 0,
  px: new Float32Array(PB_MAX), py: new Float32Array(PB_MAX), pvx: new Float32Array(PB_MAX), pvy: new Float32Array(PB_MAX),
  plife: new Float32Array(PB_MAX), pdmg: new Float32Array(PB_MAX), pcol: new Uint8Array(PB_MAX), pflag: new Uint8Array(PB_MAX),
  plast: new Int32Array(PB_MAX), pkind: new Uint8Array(PB_MAX), page: new Float32Array(PB_MAX), pw: new Float32Array(PB_MAX),
  // enemy
  en: 0,
  ex: new Float32Array(EB_MAX), ey: new Float32Array(EB_MAX), evx: new Float32Array(EB_MAX), evy: new Float32Array(EB_MAX),
  er: new Float32Array(EB_MAX), elife: new Float32Array(EB_MAX), ecol: new Uint8Array(EB_MAX), ekind: new Uint8Array(EB_MAX),
  eacc: new Float32Array(EB_MAX), eturn: new Float32Array(EB_MAX), eflag: new Uint8Array(EB_MAX), edelay: new Float32Array(EB_MAX),
  emax: new Float32Array(EB_MAX), emin: new Float32Array(EB_MAX), eage: new Float32Array(EB_MAX), egx: new Float32Array(EB_MAX), egy: new Float32Array(EB_MAX),
  // springs (flag 32): pulled toward (ecx, ecy) with ω² = ek; ebn = wall bounces left; eq = charge
  ecx: new Float32Array(EB_MAX), ecy: new Float32Array(EB_MAX), ek: new Float32Array(EB_MAX), ebn: new Uint8Array(EB_MAX), eq: new Int8Array(EB_MAX),
  _m: null,

  clear() { this.pn = 0; this.en = 0; },
  firePlayer(x, y, vx, vy, dmg, ci, ghost) {
    if (this.pn >= PB_MAX) return;
    const i = this.pn++;
    this.px[i] = x; this.py[i] = y; this.pvx[i] = vx; this.pvy[i] = vy;
    this.plife[i] = CFG.player.bulletLife * Anom.bulletLifeMul(); this.pdmg[i] = dmg * (ghost ? 0.6 : 1); this.pcol[i] = ci;
    let f = 0; if (ghost) f |= 1; if (Player.pierce > 0 || (Mods.pierce && Math.random() < Mods.pierce)) f |= 2; if (Anom.bounceBullets() || Mods.ricochet) f |= 4;
    this.pflag[i] = f; this.plast[i] = 0; this.page[i] = 0;
    this.pkind[i] = Anom.active('duality') ? 1 : 0; this.pw[i] = 0;
  },
  _pcopy(a, b) {
    this.px[b] = this.px[a]; this.py[b] = this.py[a]; this.pvx[b] = this.pvx[a]; this.pvy[b] = this.pvy[a];
    this.plife[b] = this.plife[a]; this.pdmg[b] = this.pdmg[a]; this.pcol[b] = this.pcol[a]; this.pflag[b] = this.pflag[a];
    this.plast[b] = this.plast[a]; this.pkind[b] = this.pkind[a]; this.page[b] = this.page[a]; this.pw[b] = this.pw[a];
  },
  killP(i) { this.pn--; if (i < this.pn) this._pcopy(this.pn, i); },

  // o: {r, col, kind, acc, turn, life, delay, max, min, flag, gx, gy, spring:{x,y,k}, bounce, q, neutral, mol}
  fire(x, y, vx, vy, o = {}) {
    if (this.en >= EB_MAX) return -1;
    const i = this.en++;
    const sm = Game.bulletSpeedMul;
    this.ex[i] = x; this.ey[i] = y; this.evx[i] = vx * sm; this.evy[i] = vy * sm;
    this.er[i] = o.r || 7; this.elife[i] = o.life || 9; this.ecol[i] = o.col ?? PI_.red; this.ekind[i] = o.kind || 0;
    this.eacc[i] = (o.acc || 0) * sm; this.eturn[i] = o.turn || 0; this.eflag[i] = o.flag || 0; this.edelay[i] = o.delay || 0;
    this.emax[i] = (o.max || 1e9) * sm; this.emin[i] = (o.min || 0) * sm; this.eage[i] = 0;
    this.egx[i] = o.gx || 0; this.egy[i] = o.gy || 0;
    this.ebn[i] = o.bounce || 0; this.eq[i] = o.q || 0;
    if (o.spring) { this.eflag[i] |= 32; this.ecx[i] = o.spring.x; this.ecy[i] = o.spring.y; this.ek[i] = o.spring.k; }
    if (o.neutral) this.eflag[i] |= 64;
    if (o.mol) this.eflag[i] |= 128;
    Anom.onFire(this, i);
    return i;
  },
  _ecopy(a, b) {
    this.ex[b] = this.ex[a]; this.ey[b] = this.ey[a]; this.evx[b] = this.evx[a]; this.evy[b] = this.evy[a];
    this.er[b] = this.er[a]; this.elife[b] = this.elife[a]; this.ecol[b] = this.ecol[a]; this.ekind[b] = this.ekind[a];
    this.eacc[b] = this.eacc[a]; this.eturn[b] = this.eturn[a]; this.eflag[b] = this.eflag[a]; this.edelay[b] = this.edelay[a];
    this.emax[b] = this.emax[a]; this.emin[b] = this.emin[a]; this.eage[b] = this.eage[a]; this.egx[b] = this.egx[a]; this.egy[b] = this.egy[a];
    this.ecx[b] = this.ecx[a]; this.ecy[b] = this.ecy[a]; this.ek[b] = this.ek[a]; this.ebn[b] = this.ebn[a]; this.eq[b] = this.eq[a];
  },
  killE(i) { this.en--; if (i < this.en) this._ecopy(this.en, i); },

  // pattern helpers
  ring(x, y, n, speed, o = {}, a0 = 0) {
    for (let k = 0; k < n; k++) { const a = a0 + (k / n) * TAU; this.fire(x, y, Math.cos(a) * speed, Math.sin(a) * speed, o); }
  },
  fan(x, y, angle, n, spread, speed, o = {}) {
    for (let k = 0; k < n; k++) { const a = n === 1 ? angle : angle - spread / 2 + (k / (n - 1)) * spread; this.fire(x, y, Math.cos(a) * speed, Math.sin(a) * speed, o); }
  },
  aimAt(x, y, tx, ty, speed, o = {}, n = 1, spread = 0) {
    const a = Math.atan2(wdy(ty - y), wdx(tx - x)); this.fan(x, y, a, n, spread, speed, o);
  },

  updatePlayer(dt) {
    const wrap = World.wrap, Wl = Game.wall, box = Game.box, boss = Game.bossBF, dark = Game.dark;
    const x0 = box ? box.x0 : 0, y0 = box ? box.y0 : 0, x1 = box ? box.x1 : W, y1 = box ? box.y1 : H;
    let i = 0;
    while (i < this.pn) {
      this.plife[i] -= dt; this.page[i] += dt;
      if (this.plife[i] <= 0) { this.killP(i); continue; }
      Anom.bulletForce(this, i, dt, true);
      if (boss) boss.bossDef.bulletForce(boss, this, i, dt, true);
      if (dark.length) this.darkPull(i, dt, true);
      if (Mods.homing && this.page[i] > 0.04) this.home(i, dt);
      const ox = this.px[i];
      let x = ox + this.pvx[i] * dt, y = this.py[i] + this.pvy[i] * dt;
      if (Wl && !wrap && ((ox - Wl.x) * (x - Wl.x) <= 0 || Math.abs(x - Wl.x) < Wl.hw) && !(Wl.open && y > Wl.d0 && y < Wl.d1)) {
        FX.sparks(Wl.x, y, 2, 140, this.pcol[i], ox < Wl.x ? PI : 0, 1.4, 0.2); this.killP(i); continue;
      }
      if (wrap) { x = wrapX(x); y = wrapY(y); }
      else if (x < x0 - 20 || x > x1 + 20 || y < y0 - 20 || y > y1 + 20) {
        if (this.pflag[i] & 4) { // ricochet
          if (x < x0 || x > x1) { this.pvx[i] = -this.pvx[i]; x = clamp(x, x0, x1); }
          if (y < y0 || y > y1) { this.pvy[i] = -this.pvy[i]; y = clamp(y, y0, y1); }
          this.pflag[i] &= ~4; this.plife[i] = Math.max(this.plife[i], 0.45);
        } else { FX.spawn(clamp(x, x0, x1), clamp(y, y0, y1), 0, 0, 0.15, 4, this.pcol[i]); this.killP(i); continue; }
      }
      this.px[i] = x; this.py[i] = y;
      if (this.pkind[i] === 1) this.pw[i] = Math.min(46, this.pw[i] + dt * 120);
      i++;
    }
  },
  // guided photons: turn toward the nearest enemy in range
  home(i, dt) {
    const x = this.px[i], y = this.py[i]; let best = null, bd = 320 * 320;
    for (const e of Game.enemies) {
      if (e.dead || e.ghost || e.spawning || e.type === 'virtual') continue;
      const p = e.boss && e.bossDef.aimPoint ? e.bossDef.aimPoint(e, x, y) : e;
      const dx = wdx(p.x - x), dy = wdy(p.y - y), d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = p; }
    }
    if (!best) return;
    const vx = this.pvx[i], vy = this.pvy[i], cur = Math.atan2(vy, vx), want = Math.atan2(wdy(best.y - y), wdx(best.x - x));
    const turn = clamp(angDiff(cur, want), -3.4 * Mods.homing * dt, 3.4 * Mods.homing * dt), c = Math.cos(turn), s = Math.sin(turn);
    this.pvx[i] = vx * c - vy * s; this.pvy[i] = vx * s + vy * c;
  },
  // dark matter: invisible mass that bends every trajectory
  darkPull(i, dt, isPlayer) {
    const x = isPlayer ? this.px[i] : this.ex[i], y = isPlayer ? this.py[i] : this.ey[i];
    for (const m of Game.dark) {
      const dx = wdx(m.x - x), dy = wdy(m.y - y), d2 = dx * dx + dy * dy;
      if (d2 > 300 * 300) continue;
      const d = Math.sqrt(d2) || 1, a = (isPlayer ? 4.4e6 : 2.2e6) / (d2 + 3600);
      if (isPlayer) { this.pvx[i] += dx / d * a * dt; this.pvy[i] += dy / d * a * dt; } else { this.evx[i] += dx / d * a * dt; this.evy[i] += dy / d * a * dt; }
    }
  },
  updateEnemy(dt) {
    const wrap = World.wrap, Wl = Game.wall, box = Game.box, boss = Game.bossBF, dark = Game.dark, hig = Game.higgs;
    const x0 = box ? box.x0 : 0, y0 = box ? box.y0 : 0, x1 = box ? box.x1 : W, y1 = box ? box.y1 : H;
    let i = 0;
    while (i < this.en) {
      if (this.edelay[i] > 0) { this.edelay[i] -= dt; i++; continue; }
      this.eage[i] += dt; this.elife[i] -= dt;
      if (this.elife[i] <= 0) {
        if (this.eflag[i] & 8) { // mine: burst
          const x = this.ex[i], y = this.ey[i], c = this.ecol[i];
          this.killE(i);
          this.ring(x, y, 9, 170, { col: c === PI_.gold ? PI_.gold : PI_.orange, r: 6.5 }, Math.random() * TAU);
          FX.ring(x, y, 6, 70, 0.3, PI_.orange, 3);
          continue;
        }
        FX.spawn(this.ex[i], this.ey[i], 0, 0, 0.25, this.er[i] * 0.9, this.ecol[i]); this.killE(i); continue;
      }
      if (Anom.frozenBullet(this, i)) { i++; continue; }
      let vx = this.evx[i], vy = this.evy[i];
      const fl = this.eflag[i];
      if (fl & 8) { // homing mine: steer toward ⟨x⟩
        const want = Math.atan2(wdy(Game.ty - this.ey[i]), wdx(Game.tx - this.ex[i])), cur = Math.atan2(vy, vx);
        const na = cur + clamp(angDiff(cur, want), -1.6 * dt, 1.6 * dt); const sp = Math.sqrt(vx * vx + vy * vy);
        vx = Math.cos(na) * sp; vy = Math.sin(na) * sp;
      }
      if (fl & 32) { const k = this.ek[i]; vx -= k * (this.ex[i] - this.ecx[i]) * dt; vy -= k * (this.ey[i] - this.ecy[i]) * dt; }
      if (this.eturn[i]) { const a = this.eturn[i] * dt, c = Math.cos(a), s = Math.sin(a); const nx = vx * c - vy * s; vy = vx * s + vy * c; vx = nx; }
      if (this.eacc[i]) {
        const sp = Math.sqrt(vx * vx + vy * vy) || 1; const ns = clamp(sp + this.eacc[i] * dt, this.emin[i], this.emax[i]);
        vx *= ns / sp; vy *= ns / sp;
      }
      if (this.egx[i] || this.egy[i]) { vx += this.egx[i] * dt; vy += this.egy[i] * dt; }
      this.evx[i] = vx; this.evy[i] = vy;
      Anom.bulletForce(this, i, dt, false);
      if (boss && !(fl & 64)) boss.bossDef.bulletForce(boss, this, i, dt, false);
      if (dark.length) this.darkPull(i, dt, false);
      let sl = 1;
      if (hig.length) for (const h of hig) { const dx = wdx(this.ex[i] - h.x), dy = wdy(this.ey[i] - h.y); if (dx * dx + dy * dy < h.aura * h.aura) { sl = 0.5; break; } }
      const ox = this.ex[i];
      let x = ox + this.evx[i] * dt * sl, y = this.ey[i] + this.evy[i] * dt * sl;
      if (Wl && !wrap && ((ox - Wl.x) * (x - Wl.x) <= 0 || Math.abs(x - Wl.x) < Wl.hw) && !(Wl.open && y > Wl.d0 && y < Wl.d1)) {
        const side = ox < Wl.x ? -1 : 1; x = Wl.x + side * (Wl.hw + 1); this.evx[i] = Math.abs(this.evx[i]) * side;
      }
      if (wrap) { x = wrapX(x); y = wrapY(y); }
      else if (this.ebn[i] > 0 && (x < x0 || x > x1 || y < y0 || y > y1)) {
        if (x < x0) { x = 2 * x0 - x; this.evx[i] = Math.abs(this.evx[i]); } else if (x > x1) { x = 2 * x1 - x; this.evx[i] = -Math.abs(this.evx[i]); }
        if (y < y0) { y = 2 * y0 - y; this.evy[i] = Math.abs(this.evy[i]); } else if (y > y1) { y = 2 * y1 - y; this.evy[i] = -Math.abs(this.evy[i]); }
        this.ebn[i]--;
      }
      else if (x < x0 - 60 || x > x1 + 60 || y < y0 - 60 || y > y1 + 60) { this.killE(i); continue; }
      this.ex[i] = x; this.ey[i] = y;
      i++;
    }
  },
  drawPlayer(ctx, vr, planck) {
    if (!this.pn) return;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = planck ? 'butt' : 'round';
    // wave arcs (duality)
    let anyArc = false;
    for (let i = 0; i < this.pn; i++) if (this.pkind[i] === 1) { anyArc = true; break; }
    if (anyArc) {
      ctx.lineWidth = 3;
      for (let i = 0; i < this.pn; i++) {
        if (this.pkind[i] !== 1) continue;
        const x = ix(this.px[i]), y = iy(this.py[i]);
        const a = Math.atan2(this.pvy[i], this.pvx[i]); const w = 6 + this.pw[i];
        ctx.strokeStyle = PAL_CSS[this.pcol[i]]; ctx.globalAlpha = 0.85 * Math.min(1, this.plife[i] * 4);
        ctx.beginPath(); ctx.arc(x - Math.cos(a) * w, y - Math.sin(a) * w, w, a - 0.75, a + 0.75); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // bolts batched per colour
    const seen = new Uint8Array(PAL.length);
    for (let i = 0; i < this.pn; i++) if (this.pkind[i] === 0) seen[this.pcol[i]] = 1;
    for (let c = 0; c < seen.length; c++) {
      if (!seen[c]) continue;
      ctx.strokeStyle = PAL_CSS[c];
      for (let pass = 0; pass < 2; pass++) {
        ctx.lineWidth = pass ? 1.3 : 3.6; ctx.globalAlpha = pass ? 0.95 : 0.55;
        if (pass) ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        for (let i = 0; i < this.pn; i++) {
          if (this.pcol[i] !== c || this.pkind[i] !== 0) continue;
          const x = ix(this.px[i]), y = iy(this.py[i]);
          if (x < vr.x0 || x > vr.x1 || y < vr.y0 || y > vr.y1) continue;
          const k = Math.min(0.02, this.page[i]) * (this.pflag[i] & 1 ? 0.6 : 1);
          ctx.moveTo(x, y); ctx.lineTo(x - this.pvx[i] * k, y - this.pvy[i] * k);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  },
  drawEnemy(ctx, vr, planck) {
    if (!this.en) return;
    const m = ctx.getTransform();
    const t = Game.rt;
    for (let i = 0; i < this.en; i++) {
      const x = ix(this.ex[i]), y = iy(this.ey[i]);
      if (x < vr.x0 - 30 || x > vr.x1 + 30 || y < vr.y0 - 30 || y > vr.y1 + 30) continue;
      const r = this.er[i]; const kind = this.ekind[i];
      let s = r / EB_RING;
      let alpha = 1;
      if (this.edelay[i] > 0) { alpha = 0.35 + 0.3 * Math.sin(t * 30); }
      if (this.eflag[i] & 2) alpha *= 0.55; // superposed bullet
      if (this.elife[i] < 0.3) alpha *= this.elife[i] / 0.3;
      ctx.globalAlpha = alpha;
      if (planck) {
        ctx.fillStyle = PAL_CSS[this.ecol[i]]; ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - r * 0.6, y - r * 0.6, r * 1.2, r * 1.2);
        continue;
      }
      const spr = bulletSprite(this.ecol[i], kind);
      if (kind === 1 || kind === 3) {
        const a = kind === 1 ? Math.atan2(this.evy[i], this.evx[i]) : t * 4 + i;
        ctx.setTransform(m); ctx.translate(x, y); ctx.rotate(a);
        ctx.drawImage(spr, -s / 2, -s / 2, s, s);
      } else {
        if (kind === 2) s *= 1 + 0.06 * Math.sin(t * 14 + i);
        ctx.drawImage(spr, x - s / 2, y - s / 2, s, s);
      }
    }
    ctx.setTransform(m);
    ctx.globalAlpha = 1;
  },
};
