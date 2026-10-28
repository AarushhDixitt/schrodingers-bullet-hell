// ---------- more particles ----------
const NU_COL = () => [PI_.green, PI_.orange, PI_.violet];
const NU_NAME = ['νₑ', 'ν_μ', 'ν_τ'];

Object.assign(ET, {
  // flies straight through the arena, oscillating between flavours; only the electron flavour is solid
  neutrino: {
    r: 9, hp: 2, score: 180, col: 'green', mass: 0.3,
    init(e, o) {
      e.ph = Math.random() * 3; e.trail = []; e.trT = 0; e.hideArrow = true;
      const a = o && o.a !== undefined ? o.a : Math.atan2(Game.ty - e.y, Game.tx - e.x) + rand(-0.12, 0.12);
      e.sp0 = 420; e.vx = Math.cos(a) * e.sp0; e.vy = Math.sin(a) * e.sp0;
    },
    update(e, dt) {
      const fl = Math.floor((e.t * 0.85 + e.ph) % 3);
      e.flavor = fl; e.ghost = fl !== 0; e.col = NU_COL()[fl];
      const k = Game.enemySpeedMul * Anom.enemySpeedMul(e);
      e.x += e.vx * dt * k; e.y += e.vy * dt * k;
      e.trT -= dt; if (e.trT <= 0) { e.trT = 0.03; e.trail.push(e.x, e.y); if (e.trail.length > 20) e.trail.splice(0, 2); }
      if (World.wrap) { e.x = wrapX(e.x); e.y = wrapY(e.y); if (e.t > 7) { e.noBox = true; Game.killEnemy(e, 'escape', true); } return; }
      if (e.x < -80 || e.x > W + 80 || e.y < -80 || e.y > H + 80) { e.noBox = true; Game.killEnemy(e, 'escape', true); }
    },
    draw(e, ctx, x, y) {
      const real = !e.ghost, c = PAL_CSS[e.col];
      if (e.trail && e.trail.length > 2 && !World.wrap) {
        ctx.strokeStyle = c; ctx.lineWidth = real ? 2.4 : 1.4; ctx.globalAlpha *= 0.5;
        ctx.beginPath(); ctx.moveTo(e.trail[0] + x - e.x, e.trail[1] + y - e.y);
        for (let k = 2; k < e.trail.length; k += 2) ctx.lineTo(e.trail[k] + x - e.x, e.trail[k + 1] + y - e.y);
        ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha /= 0.5;
      }
      if (real) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
      } else {
        const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * 0.55;
        ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = a0;
      }
      ctx.font = fontSerif(12); ctx.textAlign = 'center'; ctx.fillStyle = c; ctx.fillText(NU_NAME[e.flavor || 0], x, y - 14);
    },
  },
  // slow and sturdy; falls apart into a proton and an electron when shot or when it decays
  neutron: {
    r: 16, hp: 8, score: 240, col: 'chalk', mass: 2.2,
    init(e) { e.life = rand(14, 18); e.life0 = e.life; },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      steer(e, tx, ty, 72 * Game.enemySpeedMul * Anom.enemySpeedMul(e), 1.2, dt);
      moveEnemy(e, dt);
      e.life -= dt;
      if (e.life <= 0) { ET.neutron.decay(e); Game.killEnemy(e, 'decay', true); }
    },
    decay(e) {
      if (e.decayed) return; e.decayed = true;
      FX.text(e.x, e.y - 24, 'n → p e⁻ ν̄', PI_.chalk, { size: 13, font: 'serif', life: 1 });
      const a = Math.random() * TAU;
      const p = Game.addEnemy('proton', e.x + Math.cos(a) * 16, e.y + Math.sin(a) * 16);
      const el = Game.addEnemy('electron', e.x - Math.cos(a) * 16, e.y - Math.sin(a) * 16);
      if (p) { p.vx = Math.cos(a) * 170; p.vy = Math.sin(a) * 170; p.hp = Math.ceil(p.hp * 0.6); }
      if (el) { el.vx = -Math.cos(a) * 260; el.vy = -Math.sin(a) * 260; }
      FX.burst(e.x, e.y, 16, 200, [PI_.chalk, PI_.coral, PI_.amber], { life: 0.45 });
    },
    onDeath(e) { ET.neutron.decay(e); },
    draw(e, ctx, x, y) {
      const g = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, 16);
      g.addColorStop(0, 'rgba(236,231,255,.55)'); g.addColorStop(1, 'rgba(120,114,160,.18)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#cfcbe6'; ctx.lineWidth = 2.2; ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const a = -e.t * 1.6 + k * TAU / 3;
        ctx.fillStyle = PAL_CSS[[PI_.blue, PI_.green, PI_.red][k]];
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * 6.5, y + Math.sin(a) * 6.5, 3.2, 0, TAU); ctx.fill();
      }
      if (e.life !== undefined && e.life < 5) { ctx.strokeStyle = Math.sin(e.t * 26) > 0 ? '#fff' : PAL_CSS[PI_.dim]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 21, -PI / 2, -PI / 2 + TAU * clamp(e.life / 5, 0, 1)); ctx.stroke(); }
    },
  },
  // a helium nucleus that tunnels: a ghost marks where it will reappear, then it fires a burst
  alpha: {
    r: 17, hp: 10, score: 320, col: 'gold', mass: 3,
    init(e) { e.state = 'idle'; e.st = rand(1.2, 2); e.dx2 = e.x; e.dy2 = e.y; e.spin = Math.random() * TAU; },
    update(e, dt) {
      e.st -= dt; e.spin += dt * 1.4;
      if (e.state === 'idle') {
        const [tx, ty] = enemyAimAt(e);
        steer(e, tx, ty, 58 * Game.enemySpeedMul * Anom.enemySpeedMul(e), 1, dt); moveEnemy(e, dt);
        if (e.st <= 0) {
          const a = Math.random() * TAU, d = rand(230, 330);
          let nx = tx + Math.cos(a) * d, ny = ty + Math.sin(a) * d;
          if (World.wrap) { nx = wrapX(nx); ny = wrapY(ny); } else { const b = Game.box; nx = clamp(nx, (b ? b.x0 : 0) + 60, (b ? b.x1 : W) - 60); ny = clamp(ny, 60, H - 60); }
          e.dx2 = nx; e.dy2 = ny; e.state = 'warn'; e.st = e.st0 = 0.8 / Math.sqrt(Game.fireRateMul);
          Audio2.sfx('tachyonAim');
        }
      } else if (e.state === 'warn') {
        e.vx *= 0.9; e.vy *= 0.9; moveEnemy(e, dt);
        if (e.st <= 0) {
          FX.burst(e.x, e.y, 14, 160, PI_.gold, { life: 0.35 });
          e.x = e.dx2; e.y = e.dy2; e.vx = e.vy = 0; e.flash = 0.1;
          FX.ring(e.x, e.y, 6, 70, 0.35, PI_.gold, 3); FX.text(e.x, e.y - 28, 'tunnelled', PI_.gold, { size: 11, font: 'serif', life: 0.7 });
          const [fx, fy] = Anom.firePos(e);
          Bullets.ring(fx, fy, 8, 150, { col: PI_.gold, r: 6.5 }, Math.random() * TAU);
          Bullets.aimAt(fx, fy, Game.tx, Game.ty, 250, { col: PI_.amber, r: 7, kind: 1 });
          Audio2.sfx('eshot');
          e.state = 'idle'; e.st = rand(2.2, 3.2) / Game.fireRateMul;
        }
      }
    },
    draw(e, ctx, x, y) {
      if (e.state === 'warn') {
        const k = 1 - clamp(e.st / (e.st0 || 1), 0, 1), gx = x + wdx(e.dx2 - e.x), gy = y + wdy(e.dy2 - e.y);
        ctx.setLineDash([5, 8]); ctx.strokeStyle = rgba(COL.gold, 0.45); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(gx, gy); ctx.stroke();
        ctx.beginPath(); ctx.arc(gx, gy, 18, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = rgba(COL.gold, 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy, 40 - 22 * k, 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = rgba(COL.gold, 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = e.spin + k * PI / 2;
        ctx.fillStyle = k % 2 ? '#cfcbe6' : PAL_CSS[PI_.coral];
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 6, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x - 3, y - 3, 2, 0, TAU); ctx.fill();
    },
  },
  // a Bohr-style atom: three orbiting electrons soak up your shots until they are knocked loose
  atom: {
    r: 19, hp: 12, score: 450, col: 'violet', mass: 4, gridR: 54,
    init(e) { e.sh = [3, 3, 3]; e.a = Math.random() * TAU; e.spin = Math.random() * TAU; e.fire = rand(1.8, 2.8); },
    orbit(e, k) {
      const th = e.a * (1 + 0.18 * k) + k * 2.1, ph = e.spin + k * PI / 3;
      const lx = Math.cos(th) * 42, ly = Math.sin(th) * 15;
      return [lx * Math.cos(ph) - ly * Math.sin(ph), lx * Math.sin(ph) + ly * Math.cos(ph)];
    },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      const dx = wdx(tx - e.x), dy = wdy(ty - e.y), d = Math.hypot(dx, dy) || 1;
      const want = d > 330 ? 1 : d < 240 ? -1 : 0, sp = 80 * Game.enemySpeedMul * Anom.enemySpeedMul(e);
      const vx = (dx / d * want - dy / d * 0.6) * sp, vy = (dy / d * want + dx / d * 0.6) * sp;
      e.vx += (vx - e.vx) * Math.min(1, 1.5 * dt); e.vy += (vy - e.vy) * Math.min(1, 1.5 * dt);
      moveEnemy(e, dt);
      e.a += dt * 2.3; e.spin += dt * 0.4;
      e.fire -= dt;
      if (e.fire <= 0 && Game.inView(e.x, e.y, 40)) {
        e.fire = rand(2.3, 3.1) / Game.fireRateMul;
        const ci = pick([PI_.red, PI_.cyan, PI_.violet, PI_.green]);
        const [fx, fy] = Anom.firePos(e);
        Bullets.aimAt(fx, fy, tx, ty, 270, { col: ci, r: 6.5, kind: 1 }, 3, 0.22);
        FX.text(e.x, e.y - 30, 'hν', ci, { size: 13, font: 'serif', life: 0.7 });
        Audio2.sfx('eshot');
      }
    },
    // returns true when a shot at (x, y) is caught by an orbiting electron
    shield(e, x, y) {
      for (let k = 0; k < 3; k++) {
        if (e.sh[k] <= 0) continue;
        const [ox, oy] = this.orbit(e, k), dx = wdx(x - (e.x + ox)), dy = wdy(y - (e.y + oy));
        if (dx * dx + dy * dy < 11 * 11) {
          e.sh[k]--; FX.sparks(e.x + ox, e.y + oy, 3, 160, PI_.amber, Math.atan2(dy, dx), 1.4, 0.25);
          if (e.sh[k] <= 0) {
            const el = Game.addEnemy('electron', e.x + ox, e.y + oy);
            if (el) { el.vx = ox * 5; el.vy = oy * 5; }
            FX.text(e.x + ox, e.y + oy - 14, 'ionised', PI_.amber, { size: 11, font: 'serif', life: 0.7 });
          }
          return true;
        }
      }
      return false;
    },
    draw(e, ctx, x, y) {
      for (let k = 0; k < 3; k++) {
        const ph = e.spin + k * PI / 3;
        ctx.strokeStyle = rgba(COL.violet, e.sh[k] > 0 ? 0.55 : 0.18); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(x, y, 42, 15, ph, 0, TAU); ctx.stroke();
      }
      for (let k = 0; k < 5; k++) {
        const a = k * TAU / 5 + e.t * 0.8, r = k === 4 ? 0 : 6;
        ctx.fillStyle = k % 2 ? '#cfcbe6' : PAL_CSS[PI_.coral];
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 5, 0, TAU); ctx.fill();
      }
      for (let k = 0; k < 3; k++) {
        if (e.sh[k] <= 0) continue;
        const [ox, oy] = ET.atom.orbit(e, k);
        ctx.fillStyle = PAL_CSS[PI_.amber]; ctx.beginPath(); ctx.arc(x + ox, y + oy, 4.6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + ox, y + oy, 1.8, 0, TAU); ctx.fill();
      }
    },
  },
  // the Higgs boson: everything inside its field gets heavy (slower, and half damage)
  higgs: {
    r: 15, hp: 7, score: 420, col: 'yellow', mass: 5,
    init(e) { e.life = rand(18, 22); e.aura = 230; e.orb = Math.random() < 0.5 ? 1 : -1; },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      const dx = wdx(tx - e.x), dy = wdy(ty - e.y), d = Math.hypot(dx, dy) || 1;
      const want = d > 420 ? 1 : d < 330 ? -1 : 0, sp = 60 * Game.enemySpeedMul;
      const vx = (dx / d * want - dy / d * 0.5 * e.orb) * sp, vy = (dy / d * want + dx / d * 0.5 * e.orb) * sp;
      e.vx += (vx - e.vx) * Math.min(1, dt); e.vy += (vy - e.vy) * Math.min(1, dt);
      moveEnemy(e, dt);
      e.life -= dt;
      if (e.life <= 0) {
        const a = Math.atan2(dy, dx) + rand(-0.3, 0.3);
        for (const s of [0, PI]) Bullets.fire(e.x, e.y, Math.cos(a + s) * 520, Math.sin(a + s) * 520, { col: PI_.white, r: 7, kind: 1, neutral: true });
        FX.text(e.x, e.y - 26, 'H → γγ', PI_.yellow, { size: 14, font: 'serif', life: 1 });
        FX.ring(e.x, e.y, 10, e.aura, 0.5, PI_.yellow, 3);
        Audio2.sfx('annihilate');
        Game.killEnemy(e, 'decay', true);
      }
    },
    draw(e, ctx, x, y) {
      const A = e.aura || 230;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 20, x, y, A);
      g.addColorStop(0, 'rgba(255,232,110,.13)'); g.addColorStop(0.75, 'rgba(255,207,74,.06)'); g.addColorStop(1, 'rgba(255,207,74,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, A, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,232,110,.35)'; ctx.lineWidth = 1.3; ctx.setLineDash([2, 7]);
      ctx.beginPath(); ctx.arc(x, y, A, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for (let k = 0; k < 2; k++) { const f = ((e.t * 0.5 + k * 0.5) % 1); ctx.strokeStyle = rgba(COL.yellow, 0.25 * (1 - f)); ctx.beginPath(); ctx.arc(x, y, 20 + f * (A - 20), 0, TAU); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = PAL_CSS[PI_.yellow]; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2208'; ctx.font = fontSerif(17, 700, false); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', x, y + 1);
      ctx.textBaseline = 'alphabetic';
    },
  },
  // dark matter: you only see it by the way it bends light (and bullets) around it
  darkmatter: {
    r: 20, hp: 22, score: 520, col: 'blue', mass: 12,
    init(e) { e.hideArrow = true; },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      steer(e, tx, ty, 46 * Game.enemySpeedMul * Anom.enemySpeedMul(e), 0.6, dt);
      moveEnemy(e, dt);
      Grid.attract(e.x, e.y, 2600, 260, dt);
    },
    draw(e, ctx, x, y) {
      let near = 1e9;
      if (!Player.dead) for (const b of Player.branches) near = Math.min(near, Math.hypot(wdx(b.px - e.x), wdy(b.py - e.y)));
      const a = clamp(1 - (near - 110) / 230, 0, 1) * 0.6 + Math.min(1, e.flash * 10) * 0.6 + (Game.mode === 'title' || Game.state === 'title' ? 0.3 : 0.06);
      const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * clamp(a, 0, 1);
      ctx.strokeStyle = PAL_CSS[PI_.blue]; ctx.lineWidth = 1.6; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for (let k = 0; k < 6; k++) { const an = e.t * 0.7 + k * TAU / 6; ctx.fillStyle = 'rgba(140,170,255,.8)'; ctx.beginPath(); ctx.arc(x + Math.cos(an) * 34, y + Math.sin(an) * 34, 1.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(30,40,90,.8)'; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
      ctx.globalAlpha = a0;
    },
  },
});
