// ---------- suspended laws of physics ----------
const GRAV = 520;
const ANOMS = {
  tunnel: {
    name: 'Quantum Tunnelling', eq: 'T ∝ e^(−2κL)', line: 'The walls are now merely a suggestion.',
    start() { World.wrap = true; }, stop() { World.wrap = false; },
  },
  blackhole: {
    name: 'Gravitational Singularity', eq: 'rₛ = 2GM / c²', line: 'Something very heavy has arrived. Do not go near it.',
    start(s) {
      s.holes = [];
      const n = Game.mode === 'lab' ? 1 : (Game.wave >= 20 ? 2 : 1);
      for (let k = 0; k < n; k++) {
        const p = Game.farPoint(420, 260);
        s.holes.push({ x: p.x, y: p.y, vx: rand(-14, 14), vy: rand(-14, 14), M: 3.4e7, rh: 30, disk: [], hawk: 1, born: 0 });
      }
      Audio2.drone(true);
    },
    stop(s) { Audio2.drone(false); s.holes = []; },
    update(s, dt) {
      for (const h of s.holes) {
        h.born = Math.min(1, h.born + dt * 0.8);
        h.x += h.vx * dt; h.y += h.vy * dt;
        if (h.x < 260 || h.x > W - 260) h.vx = -h.vx; if (h.y < 220 || h.y > H - 220) h.vy = -h.vy;
        Grid.attract(h.x, h.y, 9000 * h.born, 460, dt);
        // accretion disk
        if (h.disk.length < 140 && Math.random() < 0.9) h.disk.push({ r: rand(44, 120), a: Math.random() * TAU, life: rand(1.5, 4), t: 0, c: pick([PI_.orange, PI_.amber, PI_.white, PI_.gold]) });
        for (let i = h.disk.length - 1; i >= 0; i--) { const d = h.disk[i]; d.t += dt; d.a += dt * 380 / d.r; d.r -= dt * 9; if (d.t > d.life || d.r < h.rh) h.disk.splice(i, 1); }
        // Hawking radiation
        h.hawk -= dt;
        if (h.hawk <= 0 && Game.mode !== 'lab') { h.hawk = rand(1.2, 2.2); const a = Math.random() * TAU; Bullets.fire(h.x + Math.cos(a) * 52, h.y + Math.sin(a) * 52, Math.cos(a) * 90, Math.sin(a) * 90, { col: PI_.white, r: 5.5, life: 7 }); }
        // horizon vs cat
        if (!Player.dead && Player.invuln <= 0) {
          const hit = Player.branches.filter(b => { const dx = wdx(b.px - h.x), dy = wdy(b.py - h.y); return dx * dx + dy * dy < (h.rh + 6) ** 2; });
          if (hit.length) Player.measureHit(hit, 'spaghettified');
        }
      }
    },
    pull(s, x, y, k) {
      let ax = 0, ay = 0;
      for (const h of s.holes) {
        const dx = wdx(h.x - x), dy = wdy(h.y - y), r2 = dx * dx + dy * dy + 1600, r = Math.sqrt(r2);
        const a = h.M * h.born * k / r2; ax += dx / r * a; ay += dy / r * a;
      }
      return [ax, ay];
    },
    inside(s, x, y, extra = 0) { for (const h of s.holes) { const dx = wdx(h.x - x), dy = wdy(h.y - y); if (dx * dx + dy * dy < (h.rh + extra) ** 2) return h; } return null; },
    drawUnder(s, ctx) {
      const tilt = 0.28;
      for (const h of s.holes) {
        const x = ix(h.x), y = iy(h.y), k = h.born;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.45 * k; ctx.drawImage(softSprite(PI_.orange, 128), x - 150, y - 150, 300, 300); ctx.globalAlpha = 1;
        const disk = (front) => {
          for (const d of h.disk) {
            const sn = Math.sin(d.a); if ((sn > 0) !== front) continue;
            const f = Math.min(1, d.t * 3) * (1 - d.t / d.life) * k;
            const px = x + Math.cos(d.a) * d.r, py = y + sn * d.r * tilt;
            ctx.globalAlpha = f; ctx.drawImage(glowSprite(d.c, 32), px - 5, py - 5, 10, 10);
          }
          ctx.globalAlpha = 1;
        };
        // far side of the disk, lensed up over the top of the shadow
        ctx.strokeStyle = 'rgba(255,190,110,.55)'; ctx.lineWidth = 5 * k;
        ctx.beginPath(); ctx.ellipse(x, y - 4, h.rh * 2.1 * k, h.rh * 1.55 * k, 0, PI, TAU); ctx.stroke();
        disk(false);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, h.rh * 1.1 * k, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,236,200,.95)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y, h.rh * 1.18 * k, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,160,70,.7)'; ctx.lineWidth = 7 * k;
        ctx.beginPath(); ctx.ellipse(x, y, h.rh * 3.6 * k, h.rh * 3.6 * tilt * k, 0, 0, PI); ctx.stroke();
        disk(true);
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    post(s, P) {
      for (const h of s.holes) {
        const [sx, sy] = worldToScene(ix(h.x), iy(h.y));
        P.lenses.push({ x: sx, y: sy, e: 64 * cam.zoom * h.born, hz: h.rh * 1.05 * cam.zoom * h.born });
      }
    },
  },
  entangle: {
    name: 'Entanglement', eq: '|Ψ⟩ = (|01⟩ − |10⟩) / √2', line: 'Enemies arrive in entangled pairs. Hurt one, hurt both.',
    start(s) { s.pending = null; }, stop(s) { s.pending = null; for (const e of Game.enemies) e.partner = null; },
    onAdd(s, e) {
      if (e.boss || e.type === 'quark' || e.type === 'virtual') return;
      if (s.pending && !s.pending.dead) { e.partner = s.pending; s.pending.partner = e; s.pending = null; }
      else s.pending = e;
    },
    drawUnder(s, ctx) {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2;
      for (const e of Game.enemies) {
        const p = e.partner; if (!p || p.dead || e.dead || e.id > p.id || e.spawning || p.spawning) continue;
        const x0 = ix(e.x), y0 = iy(e.y), dx = wdx(p.x - e.x), dy = wdy(p.y - e.y), d = Math.hypot(dx, dy) || 1;
        const fl = Math.max(e.linkFlash || 0, p.linkFlash || 0);
        ctx.strokeStyle = rgba(fl > 0 ? COL.white : COL.gold, 0.3 + fl * 1.5);
        ctx.beginPath();
        const n = Math.max(8, Math.floor(d / 14));
        for (let k = 0; k <= n; k++) { const f = k / n, w = Math.sin(f * TAU * 3 - Game.t * 10) * 5 * Math.sin(f * PI); ctx.lineTo(x0 + dx * f - dy / d * w, y0 + dy * f + dx / d * w); }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  planck: {
    name: 'ℏ = 1', eq: 'ℏ = 1.054571817…×10⁻³⁴ → 1', line: 'Planck’s constant has been set to one. Everything is chunky now.',
    start() { Audio2.crush(true); }, stop() { Audio2.crush(false); },
    speed(s, e) { return (Math.floor((Game.t + e.id * 0.13) * 2.6) % 2) ? 2.2 : 0.05; },
    post(s, P) { P.pixel = Math.max(P.pixel, 7 * R.rs); },
  },
  zeno: {
    name: 'Quantum Zeno Effect', eq: 'P(t) = [1 − (t/Nτ)²]ᴺ → 1', line: 'Anything you look at cannot move. Anything you don’t look at moves faster.',
    half: 0.4,
    inCone(s, x, y) {
      const dx = wdx(x - Player.x), dy = wdy(y - Player.y); if (dx * dx + dy * dy > 1300 * 1300) return false;
      return Math.abs(angDiff(Player.aimA, Math.atan2(dy, dx))) < this.half || dx * dx + dy * dy < 40 * 40;
    },
    drawUnder(s, ctx) {
      if (Player.dead) return;
      const x = ix(Player.x), y = iy(Player.y), a = Player.aimA;
      const g = ctx.createRadialGradient(x, y, 20, x, y, 1300);
      g.addColorStop(0, 'rgba(76,242,255,0.09)'); g.addColorStop(0.6, 'rgba(76,242,255,0.03)'); g.addColorStop(1, 'rgba(76,242,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 1300, a - this.half, a + this.half); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(76,242,255,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 10]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - this.half) * 1300, y + Math.sin(a - this.half) * 1300);
      ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a + this.half) * 1300, y + Math.sin(a + this.half) * 1300); ctx.stroke(); ctx.setLineDash([]);
    },
  },
  godel: {
    name: 'Gödel Universe', eq: 'ds² = a²(dt² − dx² + ½e²ˣdy² − dz² + 2eˣdt dy)', line: 'Kurt Gödel found a solution where the universe rotates. So does this one.',
    start(s) { s.w = 0; s.t = 0; cam.free = true; }, stop(s) { s.unwind = true; },
    update(s, dt) { s.t += dt; s.w = Math.min(0.42, 0.14 + s.t * 0.006); cam.rot += s.w * dt; Audio2.pan(Math.sin(cam.rot)); },
  },
  zombie: {
    name: 'Schrödinger’s Enemies', eq: '|enemy⟩ = (|alive⟩ + |dead⟩) / √2', line: 'Killed enemies go into a box. Look inside, or they might not stay dead.',
    start(s) { s.boxes = []; }, stop(s) { s.boxes = []; },
    onKill(s, e) {
      if (e.boss || e.zombie || e.noBox || e.type === 'virtual' || e.type === 'quark') return;
      s.boxes.push({ x: e.x, y: e.y, t: 0, dur: 2.4, type: e.type, id: uid() });
    },
    update(s, dt) {
      for (let k = s.boxes.length - 1; k >= 0; k--) {
        const b = s.boxes[k]; b.t += dt;
        // observed by a bullet?
        let seen = false;
        for (let i = 0; i < Bullets.pn; i++) { const dx = wdx(Bullets.px[i] - b.x), dy = wdy(Bullets.py[i] - b.y); if (dx * dx + dy * dy < 20 * 20) { Bullets.killP(i); seen = true; break; } }
        if (seen) { s.boxes.splice(k, 1); FX.text(b.x, b.y - 18, 'observed: |dead⟩', PI_.white, { size: 13, font: 'serif' }); Game.addScore(150, b.x, b.y + 14); FX.burst(b.x, b.y, 14, 160, PI_.white, { life: 0.4 }); Audio2.sfx('pop'); continue; }
        if (b.t >= b.dur) {
          s.boxes.splice(k, 1);
          if (Math.random() < 0.5) { FX.text(b.x, b.y - 18, '|dead⟩', PI_.dim, { size: 14, font: 'serif' }); FX.burst(b.x, b.y, 10, 100, PI_.dim, { life: 0.5 }); }
          else {
            const z = Game.addEnemy(b.type, b.x, b.y, { zombie: true });
            if (z) { z.hp = Math.max(1, Math.ceil(z.hp * 0.6)); z.zombie = true; }
            FX.text(b.x, b.y - 18, '|alive⟩!', PI_.green, { size: 16, font: 'serif' }); FX.burst(b.x, b.y, 18, 200, PI_.green, { life: 0.5 }); Audio2.sfx('zombie');
          }
        }
      }
    },
    drawUnder(s, ctx) {
      for (const b of s.boxes) {
        const sh = b.t / b.dur, j = sh * sh * 4;
        const x = ix(b.x) + (Math.random() - 0.5) * j, y = iy(b.y) + (Math.random() - 0.5) * j;
        ctx.fillStyle = '#2a2140'; ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(x - 13, y - 9, 26, 22); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 13, y - 9); ctx.lineTo(x - 6, y - 16); ctx.lineTo(x + 20, y - 16); ctx.lineTo(x + 13, y - 9); ctx.closePath(); ctx.fillStyle = '#3a2f55'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 13, y + 13); ctx.lineTo(x + 20, y + 6); ctx.lineTo(x + 20, y - 16); ctx.stroke();
        ctx.font = '700 14px Qmono, monospace'; ctx.fillStyle = '#ffcf4a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y + 2);
        ctx.strokeStyle = rgba(COL.white, 0.4); ctx.beginPath(); ctx.arc(x, y, 22, -PI / 2, -PI / 2 + TAU * (1 - sh)); ctx.stroke();
      }
    },
  },
  gravity: {
    name: 'Gravity', eq: 'g = 9.81 m/s²', line: 'Gravity has been switched on. This is a top-down game. Nobody can explain this.',
    start() { FX.gAll = GRAV * 0.6; }, stop() { FX.gAll = 0; },
  },
  duality: {
    name: 'Wave–Particle Duality', eq: 'λ = h / p', line: 'Your bullets are now waves. Also particles. It depends who is asking.',
  },
  vacuum: {
    name: 'Vacuum Fluctuations', eq: 'ΔE · Δt ≥ ℏ / 2', line: 'Empty space keeps borrowing energy. It pays it back explosively.',
    start(s) { s.t = 1; }, stop() { for (const e of Game.enemies) if (e.type === 'virtual' && !e.dead) Game.killEnemy(e, 'clear', true); },
    update(s, dt) {
      s.t -= dt;
      if (s.t <= 0) {
        s.t = rand(0.55, 1.05) * (Game.mode === 'lab' ? 1.4 : 1);
        const p = Game.farPoint(200, 120);
        const a = Math.random() * TAU;
        const e1 = Game.addEnemy('virtual', p.x, p.y, { va: a }), e2 = Game.addEnemy('virtual', p.x, p.y, { va: a + PI, anti: true });
        if (e1 && e2) { e1.pair = e2; e2.pair = e1; }
        FX.ring(p.x, p.y, 4, 40, 0.35, PI_.white, 2); Audio2.sfx('pop');
      }
      if (Math.random() < dt * 8) Grid.impulse(rand(0, W), rand(0, H), rand(-120, 120), 90);
    },
  },
  pauli: {
    name: 'Pauli Gates', eq: 'X = |0⟩⟨1| + |1⟩⟨0|', line: 'Every few seconds, someone applies a Pauli gate to the universe.',
    start(s) { s.t = 5; s.k = 0; s.flash = 0; s.gate = 'X'; }, stop() {},
    update(s, dt) {
      s.t -= dt; s.flash = Math.max(0, s.flash - Game.realDt * 3);
      s.gate = ['X', 'Z', 'Y'][s.k % 3];
      if (s.t <= 0) { s.t = 6.2; this.apply(s.gate); s.k++; s.flash = 1; }
    },
    apply(g) {
      if (g === 'X' || g === 'Y') {
        const mx = x => W - x;
        Player.x = mx(Player.x); Player.vx = -Player.vx; for (const b of Player.branches) { b.ox = -b.ox; b.px = mx(b.px); }
        for (const e of Game.enemies) { e.x = mx(e.x); e.vx = -e.vx; if (e.anchor) e.anchor = { x: mx(e.anchor.x), y: e.anchor.y }; if (e.sp) for (const p of e.sp) p.dx = -p.dx; if (e.dx !== undefined && e.type === 'tachyon') e.dx = mx(e.dx); }
        for (const T of Game.triads) { T.x = mx(T.x); T.vx = -T.vx; }
        for (let i = 0; i < Bullets.en; i++) { Bullets.ex[i] = mx(Bullets.ex[i]); Bullets.evx[i] = -Bullets.evx[i]; }
        for (let i = 0; i < Bullets.pn; i++) { Bullets.px[i] = mx(Bullets.px[i]); Bullets.pvx[i] = -Bullets.pvx[i]; }
        for (const p of Game.pickups) p.x = mx(p.x);
        for (const sp of Game.spawns) sp.x = mx(sp.x);
        const bh = Anom.on.blackhole; if (bh) for (const h of bh.holes) h.x = mx(h.x);
        const zb = Anom.on.zombie; if (zb) for (const b of zb.boxes) b.x = mx(b.x);
        cam.x = mx(cam.x);
        Grid.reset();
      }
      if (g === 'Z' || g === 'Y') {
        for (const b of Player.branches) { if (b.bits & 1) { b.re = -b.re; b.im = -b.im; } else { const r = b.re; b.re = -b.im; b.im = r; } }
        for (let i = 0; i < Bullets.en; i++) { Bullets.evx[i] = -Bullets.evx[i]; Bullets.evy[i] = -Bullets.evy[i]; }
      }
      Game.post.invert = 1; Game.post.glitch = 0.9; addTrauma(0.35);
      Game.banner(g + ' GATE', g === 'X' ? 'Bit flip: the universe is mirrored.' : g === 'Z' ? 'Phase flip: every bullet reverses.' : 'Both. Good luck.', 1.1);
      Audio2.sfx('gate');
    },
    hud(s, ctx, x, y) {
      if (s.t < 2.2) {
        const n = Math.ceil(s.t);
        ctx.font = '700 15px Qmono, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = Math.sin(Game.rt * 20) > 0 ? '#ff3b55' : '#ece7ff';
        ctx.fillText(s.gate + ' GATE IN ' + n, x, y);
      }
    },
  },
  propertime: {
    name: 'Proper Time', eq: 'dτ = dt · √(1 − v²/c²)', line: 'The faster you move, the faster everything else moves. Stand still to slow the universe.',
    start(s) { s.g = 1; }, stop() { Audio2.tempo(1); },
    update(s, dt) {
      const v = Math.hypot(Player.vx, Player.vy), c = 410;
      const b = Math.min(0.92, v / c); const g = 1 / Math.sqrt(1 - b * b);
      s.g += (Math.min(2.2, 0.55 + (g - 1) * 1.6) - s.g) * damp(5, Game.realDt);
      Audio2.tempo(clamp(s.g, 0.7, 1.6));
    },
    hud(s, ctx, x, y) { ctx.font = 'italic 400 18px Qtext, Qmath, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ece7ff'; ctx.fillText('γ = ' + s.g.toFixed(2), x, y); },
  },
  superpos: {
    name: 'Superposed Enemies', eq: 'P = |⟨ψ|φ⟩|²', line: 'Enemies are in superposition too. Only one copy of each is real.',
    onAdd(s, e) {
      if (e.boss || e.type === 'quark' || e.type === 'virtual' || e.type === 'turret') return;
      const k = Game.wave >= 20 ? 3 : chance(0.5) ? 3 : 2;
      e.sp = [{ dx: 0, dy: 0, a: 0, r: 0 }];
      for (let i = 1; i < k; i++) { const a = Math.random() * TAU, r = rand(60, 95); e.sp.push({ a, r, dx: Math.cos(a) * r, dy: Math.sin(a) * r }); }
    },
    update(s, dt) {
      for (const e of Game.enemies) if (e.sp) for (const p of e.sp) { if (!p.r) continue; p.a += dt * 0.9; p.dx = Math.cos(p.a) * p.r; p.dy = Math.sin(p.a) * p.r; }
    },
    stop() { for (const e of Game.enemies) if (e.sp) e.sp = null; },
  },
  uncertainty: {
    name: 'Heisenberg Uncertainty', eq: 'Δx · Δp ≥ ℏ / 2', line: 'Move, and you lose track of where they are. Stand still, and you lose track of where they’re going.',
    start(s) { s.dx = 0; s.dp = 0; },
    update(s, dt) {
      const v = Math.hypot(Player.vx, Player.vy) / CFG.player.speed;
      s.dx += (clamp(v, 0, 1) * 75 - s.dx) * damp(4, dt);
      s.dp += ((1 - clamp(v * 1.5, 0, 1)) * 240 - s.dp) * damp(4, dt);
    },
    hud(s, ctx, x, y) { ctx.font = 'italic 400 17px Qtext, Qmath, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ece7ff'; ctx.fillText('Δx = ' + s.dx.toFixed(0) + '   Δp = ' + s.dp.toFixed(0), x, y); },
  },
  manyworlds: {
    name: 'Many-Worlds', eq: '|Ψ⟩ = Σᵢ cᵢ |worldᵢ⟩', line: 'Every branch you lose keeps fighting from a parallel timeline.',
    start() { for (let k = 0; k < 2; k++) Player.ghosts.push({ ox: (k ? 1 : -1) * 70, oy: 40, life: 1e9, max: 1e9, ci: k ? 8 : 24, fireT: 0, perm: true }); },
    stop() { Player.ghosts = Player.ghosts.filter(g => !g.perm); },
  },
};
const ANOM_IDS = Object.keys(ANOMS);
for (const id of ['tunnel', 'pauli']) ANOMS[id].noBoss = true;

// virtual particle pairs (vacuum fluctuations)
ET.virtual = {
  r: 9, hp: 1, score: 30, col: 'white', mass: 0.4,
  init(e, o) { e.va = o.va || 0; e.anti = !!o.anti; e.col = e.anti ? PI_.violet : PI_.white; e.vx = Math.cos(e.va) * 150; e.vy = Math.sin(e.va) * 150; e.noDrop = true; },
  update(e, dt) {
    const p = e.pair;
    if (!p || p.dead) { // the survivor becomes real
      if (!e.real) { e.real = true; e.type = 'electron'; e.def = ET.electron; ET.electron.init(e); e.col = PI_.amber; e.score = 50; FX.text(e.x, e.y - 16, 'now real', PI_.white, { size: 12, font: 'serif' }); }
      return;
    }
    if (e.t > 1.1) {
      const dx = wdx(p.x - e.x), dy = wdy(p.y - e.y), d = Math.sqrt(dx * dx + dy * dy) || 1;
      e.vx += dx / d * 520 * dt; e.vy += dy / d * 520 * dt;
      if (d < 16 && e.id < p.id) {
        Game.annihilate((e.x + p.x) / 2, (e.y + p.y) / 2, 80, 3, true);
        Game.killEnemy(e, 'annihilate', true); Game.killEnemy(p, 'annihilate', true);
        return;
      }
    } else { e.vx *= Math.exp(-1.2 * dt); e.vy *= Math.exp(-1.2 * dt); }
    moveEnemy(e, dt);
  },
  draw(e, ctx, x, y) {
    ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = PAL_CSS[e.col]; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
    if (e.pair && !e.pair.dead && e.id < e.pair.id) {
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wdx(e.pair.x - e.x), y + wdy(e.pair.y - e.y)); ctx.stroke();
    }
  },
};

const Anom = {
  on: {},
  active(id) { return !!this.on[id]; },
  ids() { return Object.keys(this.on); },
  set(ids) {
    for (const id of Object.keys(this.on)) if (!ids.includes(id)) this.stop(id);
    for (const id of ids) if (!this.on[id] && ANOMS[id]) { const s = {}; this.on[id] = s; ANOMS[id].start && ANOMS[id].start(s); }
  },
  toggle(id) { if (this.on[id]) this.stop(id); else { const s = {}; this.on[id] = s; ANOMS[id].start && ANOMS[id].start(s); } },
  stop(id) { const s = this.on[id]; if (!s) return; ANOMS[id].stop && ANOMS[id].stop(s); delete this.on[id]; if (id === 'godel') Anom.unwind = true; },
  clear() { for (const id of Object.keys(this.on)) this.stop(id); },
  update(dt) {
    for (const id in this.on) { const d = ANOMS[id]; d.update && d.update(this.on[id], dt); }
    if (this.unwind && !this.on.godel) {
      const target = Math.round(cam.rot / TAU) * TAU;
      cam.rot += (target - cam.rot) * damp(2.5, Game.realDt);
      if (Math.abs(target - cam.rot) < 0.002) { cam.rot = 0; this.unwind = false; cam.free = false; Audio2.pan(0); }
    }
  },
  // ----- hooks -----
  playerAccel(p) {
    let ax = 0, ay = 0;
    if (this.on.blackhole) { const [a, b] = ANOMS.blackhole.pull(this.on.blackhole, p.x, p.y, 0.5); ax += a; ay += b; }
    for (const id in this.on) { const d = ANOMS[id]; if (d.accel) { const [a, b] = d.accel(this.on[id], p); ax += a; ay += b; } }
    return [ax, ay];
  },
  // how quickly the cat's velocity follows the stick (1 = normal; Newton's first law makes it drift)
  // gravity drags the cat's target velocity down: idle = fall, up = slow climb, down = dive
  sink() { return this.on.gravity ? 250 : 0; },
  moveGrip() { return this.on.newton3 ? 0.16 : 1; },
  onPlayerFire(a, n) { if (this.on.newton3) { const k = 6.2 / Math.sqrt(n); Player.vx -= Math.cos(a) * k; Player.vy -= Math.sin(a) * k; } },
  onFire(B, i) { for (const id in this.on) { const d = ANOMS[id]; d.onFire && d.onFire(this.on[id], B, i); } },
  enemyTimeMul(e) {
    let m = 1;
    if (this.on.zeno) m *= ANOMS.zeno.inCone(this.on.zeno, e.x, e.y) ? (e.boss ? 0.3 : 0) : 1.45;
    return m;
  },
  enemySpeedMul(e) { return this.on.planck ? ANOMS.planck.speed(this.on.planck, e) : 1; },
  triadSpeedMul(T) { return this.on.zeno && ANOMS.zeno.inCone(this.on.zeno, T.x, T.y) ? 0 : 1; },
  enemyForce(e, dt) {
    if (e.boss) return;
    if (this.on.gravity && e.type !== 'quark') { e.vy += GRAV * 0.75 * dt; }
    if (this.on.blackhole) {
      const s = this.on.blackhole; const [ax, ay] = ANOMS.blackhole.pull(s, e.x, e.y, 0.8);
      e.vx += ax * dt; e.vy += ay * dt;
      if (ANOMS.blackhole.inside(s, e.x, e.y, 4)) { FX.text(e.x, e.y - 14, 'spaghettified', PI_.orange, { size: 12, font: 'serif' }); Game.killEnemy(e, 'blackhole'); }
    }
    if (this.on.uncertainty) { const sp = this.on.uncertainty.dp; e.vx += gauss() * sp * dt * 6; e.vy += gauss() * sp * dt * 6; }
    for (const id in this.on) { const d = ANOMS[id]; d.force && d.force(this.on[id], e, dt); }
  },
  bulletForce(B, i, dt, isPlayer) {
    if (this.on.gravity) { if (isPlayer) B.pvy[i] += GRAV * 0.9 * dt; else B.evy[i] += GRAV * 1.2 * dt; }
    if (this.on.blackhole) {
      const s = this.on.blackhole;
      const x = isPlayer ? B.px[i] : B.ex[i], y = isPlayer ? B.py[i] : B.ey[i];
      const [ax, ay] = ANOMS.blackhole.pull(s, x, y, isPlayer ? 2.2 : 1);
      if (isPlayer) { B.pvx[i] += ax * dt; B.pvy[i] += ay * dt; if (ANOMS.blackhole.inside(s, x, y)) B.plife[i] = 0; }
      else { B.evx[i] += ax * dt; B.evy[i] += ay * dt; if (ANOMS.blackhole.inside(s, x, y)) B.elife[i] = 0.01; }
    }
    if (this.on.godel) {
      const w = this.on.godel.w * 0.9; const a = -2 * w * dt; const c = Math.cos(a), sn = Math.sin(a);
      if (isPlayer) { const vx = B.pvx[i]; B.pvx[i] = vx * c - B.pvy[i] * sn; B.pvy[i] = vx * sn + B.pvy[i] * c; }
      else { const vx = B.evx[i]; B.evx[i] = vx * c - B.evy[i] * sn; B.evy[i] = vx * sn + B.evy[i] * c; }
    }
    if (!isPlayer && this.on.uncertainty) { const sp = this.on.uncertainty.dp * 0.004; const a = gauss() * sp * dt * 4; const c = Math.cos(a), sn = Math.sin(a); const vx = B.evx[i]; B.evx[i] = vx * c - B.evy[i] * sn; B.evy[i] = vx * sn + B.evy[i] * c; }
    for (const id in this.on) { const d = ANOMS[id]; d.bullet && d.bullet(this.on[id], B, i, dt, isPlayer); }
    // magnetars bend player bullets (Lorentz force)
    if (isPlayer && Game.magnetars.length) {
      for (const m of Game.magnetars) {
        const dx = wdx(B.px[i] - m.x), dy = wdy(B.py[i] - m.y), d2 = dx * dx + dy * dy;
        if (d2 < 170 * 170) { const w = 9 * (1 - Math.sqrt(d2) / 170) * dt; const c = Math.cos(w), sn = Math.sin(w); const vx = B.pvx[i]; B.pvx[i] = vx * c - B.pvy[i] * sn; B.pvy[i] = vx * sn + B.pvy[i] * c; }
      }
    }
  },
  frozenBullet(B, i) {
    if (!this.on.zeno) return false;
    return ANOMS.zeno.inCone(this.on.zeno, B.ex[i], B.ey[i]);
  },
  firePos(e) { if (e.sp && e.sp.length) { const p = pick(e.sp); return [e.x + p.dx, e.y + p.dy]; } return [e.x, e.y]; },
  drainMul() { return this.on.manyworlds ? 0.6 : 1; },
  spreadMul() { return 1; },
  fireRateMul() { return 1; },
  bulletLifeMul() { return this.on.tunnel ? 1.35 : 1; },
  bounceBullets() { return false; },
  worldTimeScale() { return this.on.propertime ? this.on.propertime.g : 1; },
  onAdd(e) { for (const id in this.on) { const d = ANOMS[id]; d.onAdd && d.onAdd(this.on[id], e); } },
  onKill(e) { for (const id in this.on) { const d = ANOMS[id]; d.onKill && d.onKill(this.on[id], e); } },
  drawUnder(ctx) { for (const id in this.on) { const d = ANOMS[id]; d.drawUnder && d.drawUnder(this.on[id], ctx); } },
  hud(ctx, x, y) { let k = 0; for (const id in this.on) { const d = ANOMS[id]; if (d.hud) { d.hud(this.on[id], ctx, x, y + k * 24); k++; } } },
  post(P) { for (const id in this.on) { const d = ANOMS[id]; d.post && d.post(this.on[id], P); } },
  planck() { return !!this.on.planck; },
};
