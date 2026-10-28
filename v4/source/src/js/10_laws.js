// ---------- suspended laws of physics: one table holds what each law does and how it is explained ----------
// Every hook is optional. Field hooks (acc, rot, slow, sink) act through Fields; the rest are called by Anom:
//   start/stop/update(s, dt)  drawUnder(s, ctx)  hud(s, ctx, x, y)  post(s, P)  onAdd/onKill(s, e)
//   onFire(s, EB, i)  onPlayerFire(s, a, n)  bullet(s, pool, i, dt, k)
//   and multipliers (number or function): grip, drain, bulletLife, espd, worldTime
const GRAV = 520;
const LAWS = {
  tunnel: {
    name: 'Quantum Tunnelling', eq: 'T ∝ e^(−2κL)', line: 'The walls are now merely a suggestion.', noBoss: true,
    how: 'The arena edges wrap around. Leave one side and you come back on the opposite side, and so does everything else.', short: 'Edges wrap around.',
    start() { World.wrap = true; }, stop() { World.wrap = false; }, bulletLife: 1.35,
  },
  blackhole: {
    name: 'Gravitational Singularity', eq: 'rₛ = 2GM / c²', line: 'Something very heavy has arrived. Do not go near it.',
    how: 'Black holes pull you, enemies and bullets in. Touching a dark centre counts as a hit, and enemies that fall in die (and feed the hole). Each has a mass: small ones are hot and evaporate, heavy ones are slow and fire jets from their poles. Two that drift together merge into a heavier one and send out a gravitational wave: fold as it reaches you.', short: 'Black holes pull everything. Avoid the centres; fold through waves.',
    // early on, one stellar hole; later, more of them and heavier ones
    start() {
      const w = Game.mode === 'lab' ? 10 : Game.wave, ms = w < 12 ? [10 ** rand(0.9, 1.8)] : w < 24 ? [10 ** rand(2.3, 3.6), 10 ** rand(0.25, 0.42)] : [10 ** rand(3.8, 4.9), 10 ** rand(1, 1.9), 10 ** rand(0.25, 0.42)];
      ms.forEach((M, k) => Holes.spawn({ M, tag: 'law', arrive: 1.6 + k * 1.5 }));
    },
    stop() { Holes.evaporate('law'); },
  },
  entangle: {
    name: 'Entanglement', eq: '|Ψ⟩ = (|01⟩ − |10⟩) / √2', line: 'Enemies arrive in entangled pairs. Hurt one, hurt both.',
    how: 'Enemies arrive in linked pairs. Damage to one also hits its partner, and killing one kills both.', short: 'Linked pairs share damage.',
    start(s) { s.pending = null; }, stop(s) { s.pending = null; for (const e of Game.enemies) e.partner = null; },
    onAdd(s, e) {
      if (e.boss || e.type === 'quark' || e.type === 'virtual' || e.def.linkKind || e.harmless) return;
      if (s.pending && !s.pending.dead) { e.partner = s.pending; s.pending.partner = e; s.pending = null; } else s.pending = e;
    },
    drawUnder(s, ctx) {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2;
      for (const e of Game.enemies) {
        const p = e.partner; if (!p || p.dead || e.dead || e.id > p.id || e.spawning || p.spawning) continue;
        const x0 = ix(e.x), y0 = iy(e.y), dx = wdx(p.x - e.x), dy = wdy(p.y - e.y), d = Math.hypot(dx, dy) || 1, fl = Math.max(e.linkFlash || 0, p.linkFlash || 0), n = Math.max(8, Math.floor(d / 14));
        ctx.strokeStyle = rgba(fl > 0 ? COL.white : COL.gold, 0.3 + fl * 1.5); ctx.beginPath();
        for (let k = 0; k <= n; k++) { const f = k / n, w = Math.sin(f * TAU * 3 - Game.t * 10) * 5 * Math.sin(f * PI); ctx.lineTo(x0 + dx * f - dy / d * w, y0 + dy * f + dx / d * w); }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  planck: {
    name: 'ℏ = 1', eq: 'ℏ = 1.054571817…×10⁻³⁴ → 1', line: 'Planck’s constant has been set to one. Everything is chunky now.',
    how: 'Everything is pixelated, and enemies move in quantum leaps: they freeze, then reappear further along. Same average speed. A faint ring marks where one near you is about to land.', short: 'Pixelated. Enemies move in jumps.',
    start() { Audio2.crush(true); }, stop() { Audio2.crush(false); for (const e of Game.enemies) { if (e.qx !== undefined) { e.x = e.qx; e.y = e.qy; } e.qx = e.lx = undefined; } },
    post(s, P) { if (Settings.pixelate !== false) P.pixel = Math.max(P.pixel, 7 * R.rs); },
    // the leap is telegraphed: a dashed ghost where an enemy close to your cats will land
    drawUnder(s, ctx) {
      for (const e of Game.enemies) {
        if (e.dead || e.qx === undefined || e.qGap <= 0) continue;
        const f = 1 - e.qT / e.qGap; if (f < 0.45) continue;
        const d = Math.hypot(wdx(e.qx - Game.tx), wdy(e.qy - Game.ty)); if (d > 300) continue;
        Tele.ring(ctx, ix(e.qx), iy(e.qy), Math.max(8, e.r), PAL[e.col] || COL.white, 0.2 + 0.5 * (f - 0.45) / 0.55, [3, 4], 1.5);
      }
    },
  },
  zeno: {
    name: 'Quantum Zeno Effect', eq: 'P(t) = [1 − (t/Nτ)²]ᴺ → 1', line: 'Anything you look at cannot move. Anything you don’t look at moves faster.',
    how: 'Everything inside your aim cone is frozen, bullets included. Everything outside it moves 60% faster.', short: 'What you aim at freezes. The rest speeds up.',
    half: 0.4,
    inCone(x, y) { const dx = wdx(x - Player.x), dy = wdy(y - Player.y), d2 = dx * dx + dy * dy; return d2 <= 1300 * 1300 && (d2 < 1600 || Math.abs(angDiff(Player.aimA, Math.atan2(dy, dx))) < this.half); },
    slow(s, x, y, k, e) { if (k === K_EB) return this.inCone(x, y) ? 0 : 1; if (k !== K_EN) return 1; return this.inCone(x, y) ? (e.boss ? 0.3 : 0) : 1.6; },
    drawUnder(s, ctx) {
      if (Player.dead) return;
      const x = ix(Player.x), y = iy(Player.y), a = Player.aimA, h = this.half;
      const g = ctx.createRadialGradient(x, y, 20, x, y, 1300); g.addColorStop(0, 'rgba(76,242,255,0.09)'); g.addColorStop(0.6, 'rgba(76,242,255,0.03)'); g.addColorStop(1, 'rgba(76,242,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 1300, a - h, a + h); ctx.closePath(); ctx.fill();
      for (const s2 of [-h, h]) Tele.line(ctx, x, y, x + Math.cos(a + s2) * 1300, y + Math.sin(a + s2) * 1300, COL.cyan, 0.35, 1.5, [6, 10]);
    },
  },
  godel: {
    name: 'Gödel Universe', eq: 'ds² = a²(dt² − dx² + ½e²ˣdy² − dz² + 2eˣdt dy)', line: 'Kurt Gödel found a solution where the universe rotates. So does this one.',
    how: 'The camera slowly rotates and bullets curve. Your controls stay relative to the screen.', short: 'The screen rotates. Bullets curve.',
    start(s) { s.w = 0; s.t = 0; cam.free = true; },
    update(s, dt) { s.t += dt; s.w = Math.min(0.42, 0.14 + s.t * 0.006); if (Settings.camRotate !== false) cam.rot += s.w * dt; Audio2.pan(Math.sin(cam.rot)); },
    rot: (s, x, y, k) => (k === K_PB || k === K_EB ? -1.8 * s.w : 0),
  },
  zombie: {
    name: 'Schrödinger’s Enemies', eq: '|enemy⟩ = (|alive⟩ + |dead⟩) / √2', line: 'Killed enemies go into a box. Look inside, or they might not stay dead.',
    how: 'Each killed enemy leaves a box. Shoot the box to confirm the death, or it may come back as a zombie.', short: 'Shoot the boxes or the dead come back.',
    start(s) { s.boxes = []; }, stop(s) { s.boxes = []; },
    onKill(s, e) { if (!(e.boss || e.zombie || e.noBox || e.type === 'virtual' || e.type === 'quark')) s.boxes.push({ x: e.x, y: e.y, t: 0, dur: 2.4, type: e.type }); },
    update(s, dt) {
      for (let k = s.boxes.length - 1; k >= 0; k--) {
        const b = s.boxes[k]; b.t += dt;
        let seen = -1; // observed by a bullet?
        for (let i = 0; i < PB.n; i++) if (wdx(PB.x[i] - b.x) ** 2 + wdy(PB.y[i] - b.y) ** 2 < 400) { seen = i; break; }
        if (seen >= 0) { PB.kill(seen); s.boxes.splice(k, 1); FX.text(b.x, b.y - 18, 'observed: |dead⟩', PI_.white, { size: 13, font: 'serif' }); Game.addScore(150, b.x, b.y + 14); FX.burst(b.x, b.y, 14, 160, PI_.white, { life: 0.4 }); Audio2.sfx('pop'); continue; }
        if (b.t < b.dur) continue;
        s.boxes.splice(k, 1);
        if (Math.random() < 0.5) { FX.text(b.x, b.y - 18, '|dead⟩', PI_.dim, { size: 14, font: 'serif' }); FX.burst(b.x, b.y, 10, 100, PI_.dim, { life: 0.5 }); continue; }
        const z = Game.addEnemy(b.type, b.x, b.y, { zombie: true }); if (z) z.hp = Math.max(1, Math.ceil(z.hp * 0.6));
        FX.text(b.x, b.y - 18, '|alive⟩!', PI_.green, { size: 16, font: 'serif' }); FX.burst(b.x, b.y, 18, 200, PI_.green, { life: 0.5 }); Audio2.sfx('zombie');
      }
    },
    drawUnder(s, ctx) {
      for (const b of s.boxes) {
        const sh = b.t / b.dur, j = sh * sh * 4, x = ix(b.x) + (Math.random() - 0.5) * j, y = iy(b.y) + (Math.random() - 0.5) * j;
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
    name: 'Gravity', eq: 'g = 9.81 m/s²', line: 'Gravity has been switched on. This is a top-down game. Nobody can explain this. Also, the floor moves.',
    how: 'Everything falls toward the glowing floor: let go and you drop, climbing takes effort. Every ten seconds the floor turns 90°, with an arrow two seconds before. Enemy bullets fall in arcs and bounce once off the floor.', short: 'Everything falls. The floor turns every ten seconds.',
    DIRS: [[0, 1], [-1, 0], [0, -1], [1, 0]], NAMES: ['DOWN', 'LEFT', 'UP', 'RIGHT'],
    G: [2600, GRAV * 0.75, GRAV * 0.9, GRAV * 1.3, GRAV * 0.6],
    start(s) { s.dir = 0; s.t = 10; s.next = -1; this.fx(s); },
    stop() { FX.gx = FX.gy = 0; },
    fx(s) { const d = this.DIRS[s.dir]; FX.gx = d[0] * GRAV * 0.6; FX.gy = d[1] * GRAV * 0.6; },
    update(s, dt) {
      s.t -= dt;
      if (s.t < 2 && s.next < 0) { s.next = (s.dir + (chance(0.5) ? 1 : 3)) % 4; Audio2.sfx('charge'); }
      if (s.t > 0) return;
      s.dir = s.next; s.next = -1; s.t = Game.mode === 'lab' ? 12 : 10; this.fx(s);
      Game.banner('GRAVITY ' + this.NAMES[s.dir], 'The floor has moved.', 1); addTrauma(0.3); Audio2.sfx('slam'); Input.rumble(0.4, 160);
    },
    acc(s, x, y, k, o) { const g = this.G[k], d = this.DIRS[s.dir]; o[0] += d[0] * g; o[1] += d[1] * g; },
    onFire(s, B, i) { if (B.bn[i] < 1) B.bn[i] = 1; },
    // the floor glows; an arrow warns where it is going next
    drawUnder(s, ctx) {
      const d = this.DIRS[s.dir], hot = s.next >= 0 && Math.sin(Game.rt * 18) > 0;
      const edge = (dir, col, a, lw) => { const [dx, dy] = this.DIRS[dir]; ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw; ctx.beginPath(); if (dy) { const y = dy > 0 ? H : 0; ctx.moveTo(0, y); ctx.lineTo(W, y); } else { const x = dx > 0 ? W : 0; ctx.moveTo(x, 0); ctx.lineTo(x, H); } ctx.stroke(); };
      if (World.wrap) return;
      edge(s.dir, COL.amber, 0.9, 10);
      if (s.next >= 0) edge(s.next, COL.red, hot ? 0.9 : 0.4, 8);
      if (Player.dead) return;
      const n = s.next >= 0 ? this.DIRS[s.next] : d, x = ix(Player.x), y = iy(Player.y) - 70, a = Math.atan2(n[1], n[0]);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = s.next >= 0 ? (hot ? 1 : 0.6) : 0.35;
      ctx.fillStyle = s.next >= 0 ? '#ff3b55' : '#ffba48'; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(4, -12); ctx.lineTo(4, -5); ctx.lineTo(-18, -5); ctx.lineTo(-18, 5); ctx.lineTo(4, 5); ctx.lineTo(4, 12); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    },
    hud(s, ctx, x, y) { txt(ctx, s.next >= 0 ? 'FLOOR TURNS ' + this.NAMES[s.next] + ' IN ' + Math.ceil(s.t) : 'g ↓ ' + this.NAMES[s.dir].toLowerCase() + ' · turns in ' + Math.ceil(s.t), x, y, fontMono(13, 700), s.next >= 0 ? '#ff3b55' : '#ece7ff', 'center'); },
  },
  duality: {
    name: 'Wave–Particle Duality', eq: 'λ = h / p', line: 'Your bullets are now waves. Also particles. It depends who is asking.',
    how: 'Your bullets become spreading waves that pass through enemies and hit several of them.', short: 'Your shots are piercing waves.',
  },
  vacuum: {
    name: 'Vacuum Fluctuations', eq: 'ΔE · Δt ≥ ℏ / 2', line: 'Empty space keeps borrowing energy. It pays it back explosively.',
    how: 'Particle pairs pop out of nothing, fly apart, then explode when they meet again. Kill one and the other becomes real.', short: 'Pairs pop in and explode when they meet.',
    start(s) { s.t = 1; }, stop() { for (const e of Game.enemies) if (e.type === 'virtual' && !e.dead) Game.killEnemy(e, 'clear', true); },
    update(s, dt) {
      if ((s.t -= dt) <= 0) {
        s.t = rand(0.55, 1.05) * (Game.mode === 'lab' ? 1.4 : 1);
        const p = Game.farPoint(200, 120), a = Math.random() * TAU, e1 = Game.addEnemy('virtual', p.x, p.y, { va: a }), e2 = Game.addEnemy('virtual', p.x, p.y, { va: a + PI, anti: true });
        if (e1 && e2) { e1.pair = e2; e2.pair = e1; }
        FX.ring(p.x, p.y, 4, 40, 0.35, PI_.white, 2); Audio2.sfx('pop');
      }
      if (Math.random() < dt * 8) Grid.impulse(rand(0, W), rand(0, H), rand(-120, 120), 90);
    },
  },
  pauli: {
    name: 'Pauli Gates', eq: 'X = |0⟩⟨1| + |1⟩⟨0|', line: 'Every few seconds, someone applies a Pauli gate to the universe.', noBoss: true,
    how: 'Every few seconds a gate hits the universe. X mirrors the arena, Z reverses every bullet, Y does both. Watch the countdown.', short: 'Mirror and reversal gates every few seconds.',
    start(s) { s.t = 5; s.k = 0; s.gate = 'X'; },
    update(s, dt) { s.gate = 'XZY'[s.k % 3]; if ((s.t -= dt) <= 0) { s.t = 6.2; this.apply(s.gate); s.k++; } },
    apply(g) {
      if (g !== 'Z') { // X: mirror the whole universe left to right
        const mx = x => W - x, flip = o => { o.x = mx(o.x); if (o.vx !== undefined) o.vx = -o.vx; };
        flip(Player); for (const b of Player.branches) { b.ox = -b.ox; b.px = mx(b.px); }
        for (const e of Game.enemies) { flip(e); if (e.anchor) e.anchor = { x: mx(e.anchor.x), y: e.anchor.y }; if (e.sp) for (const p of e.sp) p.dx = -p.dx; if (e.type === 'tachyon') e.dx = mx(e.dx); }
        for (const L of [Game.triads, Game.pickups, Game.spawns, Holes.list, Anom.on.zombie ? Anom.on.zombie.boxes : []]) for (const o of L) flip(o);
        for (const P of [EB, PB]) for (let i = 0; i < P.n; i++) { P.x[i] = mx(P.x[i]); P.vx[i] = -P.vx[i]; }
        cam.x = mx(cam.x); Grid.reset();
      }
      if (g !== 'X') { // Z: flip every phase, reverse every bullet
        for (const b of Player.branches) { if (b.bits & 1) { b.re = -b.re; b.im = -b.im; } else { const r = b.re; b.re = -b.im; b.im = r; } }
        for (let i = 0; i < EB.n; i++) { EB.vx[i] = -EB.vx[i]; EB.vy[i] = -EB.vy[i]; }
      }
      Game.post.invert = 1; Game.post.glitch = 0.9; addTrauma(0.35);
      Game.banner(g + ' GATE', { X: 'Bit flip: the universe is mirrored.', Z: 'Phase flip: every bullet reverses.', Y: 'Both. Good luck.' }[g], 1.1);
      Audio2.sfx('gate');
    },
    hud(s, ctx, x, y) { if (s.t < 2.2) { ctx.font = '700 15px Qmono, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = Math.sin(Game.rt * 20) > 0 ? '#ff3b55' : '#ece7ff'; ctx.fillText(s.gate + ' GATE IN ' + Math.ceil(s.t), x, y); } },
  },
  propertime: {
    name: 'Proper Time', eq: 'dτ = dt · √(1 − v²/c²)', line: 'The faster you move, the faster everything else moves. Stand still to slow the universe.',
    how: 'The faster you move, the faster enemies and their bullets move. Stand still to slow the world down. γ shows the factor.', short: 'Moving speeds up the world.',
    start(s) { s.g = 1; }, stop() { Audio2.tempo(1); },
    update(s) { const b = Math.min(0.92, Math.hypot(Player.vx, Player.vy) / 410), g = 1 / Math.sqrt(1 - b * b); s.g += (Math.min(2.2, 0.55 + (g - 1) * 1.6) - s.g) * damp(5, Game.realDt); Audio2.tempo(clamp(s.g, 0.7, 1.6)); },
    worldTime: s => s.g,
    hud(s, ctx, x, y) { ctx.font = 'italic 400 18px Qtext, Qmath, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ece7ff'; ctx.fillText('γ = ' + s.g.toFixed(2), x, y); },
  },
  superpos: {
    name: 'Superposed Enemies', eq: 'P = |⟨ψ|φ⟩|²', line: 'Enemies are in superposition too. Only one copy of each is real.',
    how: 'Each enemy has two or three copies and only one is real. Shooting a copy reveals whether it was the real one.', short: 'Only one copy of each enemy is real.',
    onAdd(s, e) {
      if (e.boss || ['quark', 'virtual', 'turret'].includes(e.type)) return;
      e.sp = [{ dx: 0, dy: 0, a: 0, r: 0 }];
      for (let i = 1; i < (Game.wave >= 20 || chance(0.5) ? 3 : 2); i++) { const a = Math.random() * TAU, r = rand(60, 95); e.sp.push({ a, r, dx: Math.cos(a) * r, dy: Math.sin(a) * r }); }
    },
    update(s, dt) { for (const e of Game.enemies) if (e.sp) for (const p of e.sp) if (p.r) { p.a += dt * 0.9; p.dx = Math.cos(p.a) * p.r; p.dy = Math.sin(p.a) * p.r; } },
    stop() { for (const e of Game.enemies) e.sp = null; },
  },
  uncertainty: {
    name: 'Heisenberg Uncertainty', eq: 'Δx · Δp ≥ ℏ / 2', line: 'Move, and you lose track of where they are. Stand still, and you lose track of where they’re going.',
    how: 'Moving blurs where enemies are. Standing still makes where they are going unpredictable.', short: 'Moving blurs enemies. Standing still makes them erratic.',
    start(s) { s.dx = 0; s.dp = 0; },
    update(s, dt) { const v = Math.hypot(Player.vx, Player.vy) / CFG.player.speed; s.dx += (clamp(v, 0, 1) * 75 - s.dx) * damp(4, dt); s.dp += ((1 - clamp(v * 1.5, 0, 1)) * 240 - s.dp) * damp(4, dt); },
    acc(s, x, y, k, o) { if (k === K_EN) { o[0] += gauss() * s.dp * 6; o[1] += gauss() * s.dp * 6; } },
    rot: (s, x, y, k) => (k === K_EB ? gauss() * s.dp * 0.016 : 0),
    hud(s, ctx, x, y) { ctx.font = 'italic 400 17px Qtext, Qmath, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ece7ff'; ctx.fillText('Δx = ' + s.dx.toFixed(0) + '   Δp = ' + s.dp.toFixed(0), x, y); },
  },
  manyworlds: {
    name: 'Many-Worlds', eq: '|Ψ⟩ = Σᵢ cᵢ |worldᵢ⟩', line: 'Every branch you lose keeps fighting from a parallel timeline.',
    how: 'Cats you lose keep firing for a few seconds from a parallel timeline, and two ghost cats fight beside you.', short: 'Lost cats keep fighting for a while.',
    start() { for (let k = 0; k < 2; k++) Player.ghosts.push({ ox: (k ? 1 : -1) * 70, oy: 40, life: 1e9, max: 1e9, ci: k ? 8 : 24, fireT: 0, perm: true }); },
    stop() { Player.ghosts = Player.ghosts.filter(g => !g.perm); },
    drain: 0.6,
  },
  perpetual: {
    name: 'Perpetual Motion', eq: 'dS/dt = 0', line: 'The second law of thermodynamics is off. Nothing runs down, and every bullet bounces off the walls.', noBoss: true,
    how: 'Enemy bullets bounce off the arena walls twice instead of leaving, so they stay in play much longer. The arena fills up.', short: 'Bullets bounce off the walls.',
    onFire(s, B, i) { if (B.bn[i] < 2) B.bn[i] = 2; B.life[i] = Math.min(B.life[i], 7); },
    drawUnder(s, ctx) {
      if (World.wrap) return;
      const b = Game.box || { x0: 0, y0: 0, x1: W, y1: H };
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(Theme.c.hot, 0.18 + 0.1 * Math.sin(Game.rt * 3)); ctx.lineWidth = 10;
      ctx.strokeRect(b.x0 + 5, b.y0 + 5, b.x1 - b.x0 - 10, b.y1 - b.y0 - 10); ctx.globalCompositeOperation = 'source-over';
    },
  },
  coulomb: {
    name: 'Coulomb’s Law', eq: 'F = k q₁q₂ / r²', line: 'Your cats carry a positive charge. Red bullets are pushed away from you. Blue ones are pulled in.',
    how: 'Every enemy bullet is charged. Red ones are pushed away from your cats, blue ones are pulled toward them. Watch for blue bullets curving in.', short: 'Red bullets repel you, blue ones attract.',
    onFire(s, B, i) { if (!B.q[i] && !(B.flag[i] & 64)) { B.q[i] = Math.random() < 0.55 ? 1 : -1; B.col[i] = B.q[i] > 0 ? PI_.red : PI_.ice; } },
    bullet(s, B, i, dt, k) {
      if (k !== K_EB || !B.q[i] || Player.dead) return;
      const dx = wdx(B.x[i] - Player.x), dy = wdy(B.y[i] - Player.y), d2 = dx * dx + dy * dy;
      if (d2 > 430 * 430) return;
      const d = Math.sqrt(d2) || 1, a = 3.4e6 * B.q[i] / (d2 + 3000);
      B.vx[i] += dx / d * a * dt; B.vy[i] += dy / d * a * dt;
    },
    drawUnder(s, ctx) {
      if (Player.dead) return;
      const x = ix(Player.x), y = iy(Player.y);
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,90,110,.22)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 9]); ctx.beginPath();
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + Game.rt * 0.2; ctx.moveTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40); ctx.lineTo(x + Math.cos(a) * 170, y + Math.sin(a) * 170); }
      ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255,90,110,.35)'; ring(ctx, x, y, 430); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    },
  },
  hubble: {
    name: 'Cosmic Expansion', eq: 'v = H₀ d', line: 'Space is expanding. The longer a bullet travels, the faster it goes.',
    how: 'Enemy bullets keep speeding up the longer they fly. Shots from close by are slow; shots from across the arena arrive fast.', short: 'Bullets speed up as they fly.',
    start(s) { s.t = 0; }, update(s, dt) { s.t += dt; },
    bullet(s, B, i, dt, k) { if (k === K_EB && B.vx[i] ** 2 + B.vy[i] ** 2 < 1000 * 1000) { B.vx[i] *= 1 + 0.6 * dt; B.vy[i] *= 1 + 0.6 * dt; } },
    drawUnder(s, ctx) { ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { const f = (s.t * 0.12 + k / 4) % 1; ctx.strokeStyle = rgba(Theme.c.hot, 0.16 * (1 - f)); ring(ctx, W / 2, H / 2, 60 + f * f * 1500); ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; },
  },
  slowlight: {
    name: 'Slow Light', eq: 'c = 299 792 458 m/s → 650', line: 'Light takes time to reach you now. You see every enemy where it was, not where it is.', noBoss: true,
    how: 'You see each enemy where it was when its light left it, so far-away enemies show up late and lag behind. A faint dotted ring marks where each one really is.', short: 'You see enemies late.',
    C: 650,
    start(s) { s.t = 0; s.acc = 0; }, stop() { for (const e of Game.enemies) e.hist = null; },
    update(s, dt) {
      s.t += dt; if ((s.acc += dt) < 1 / 30) return; s.acc = 0;
      for (const e of Game.enemies) { if (e.boss || e.dead) continue; const h = e.hist || (e.hist = []); h.push(s.t, e.x, e.y); if (h.length > 270) h.splice(0, 3); }
    },
    // where the light reaching the cat right now left this enemy (null: it has not arrived yet)
    seen(s, e) {
      const h = e.hist; if (!h || !h.length) return null;
      const target = s.t - Math.hypot(wdx(e.x - Player.x), wdy(e.y - Player.y)) / this.C;
      if (target < h[0]) return h.length >= 270 ? [h[1], h[2]] : null;
      for (let k = h.length - 3; k >= 0; k -= 3) if (h[k] <= target) return [h[k + 1], h[k + 2]];
      return [h[1], h[2]];
    },
  },
  newton3: {
    name: 'Newton’s Third Law', eq: 'F₁₂ = −F₂₁', line: 'Every shot pushes you backwards, and nothing slows you down. Steer like a spaceship.',
    how: 'Every shot pushes you backwards and nothing slows you down. Steer in short bursts. The arrow shows your momentum.', short: 'Shots push you back. No friction.',
    grip: 0.16,
    onPlayerFire(s, a, n) { const k = 6.2 / Math.sqrt(n); Player.vx -= Math.cos(a) * k; Player.vy -= Math.sin(a) * k; },
    drawUnder(s, ctx) {
      if (Player.dead) return;
      const x = ix(Player.x), y = iy(Player.y), vx = Player.vx * 0.45, vy = Player.vy * 0.45, a = Math.atan2(vy, vx);
      if (Math.hypot(vx, vy) < 12) return;
      ctx.strokeStyle = ctx.fillStyle = 'rgba(255,207,74,.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + vx, y + vy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + vx, y + vy); for (const d of [-0.4, 0.4]) ctx.lineTo(x + vx - Math.cos(a + d) * 12, y + vy - Math.sin(a + d) * 12); ctx.closePath(); ctx.fill();
      ctx.font = fontSerif(16); ctx.textAlign = 'center'; ctx.fillText('p', x + vx + Math.cos(a) * 14, y + vy + Math.sin(a) * 14 + 5);
    },
  },
  symmetry: {
    name: 'Spontaneous Symmetry Breaking', eq: 'V(φ) = −μ²|φ|² + λ|φ|⁴', line: 'The vacuum is a ring now. Everything rolls down into the trough, then drifts around it.', noBoss: true,
    how: 'Everything is pulled toward a ring around the centre of the arena and drifts along it. Moving against the pull takes effort.', short: 'Everything rolls into a ring.',
    R: 480, P: [[2.4, 620, 150], [1.6, 420, 90], null, [0.7, 260, 0], null], // [stiffness, cap, swirl] for cat, enemy, -, enemy bullet
    acc(s, x, y, k, o) {
      const p = this.P[k]; if (!p) return;
      const dx = x - W / 2, dy = y - H / 2, r = Math.hypot(dx, dy) || 1, f = clamp(-p[0] * (r - this.R), -p[1], p[1]), g = Math.abs(r - this.R) < 160 ? p[2] : 0;
      o[0] += dx / r * f - dy / r * g; o[1] += dy / r * f + dx / r * g;
    },
    drawUnder(s, ctx) {
      const cx = W / 2, cy = H / 2, R = this.R, hot = Theme.c.hot;
      const g = ctx.createRadialGradient(cx, cy, R - 170, cx, cy, R + 170); g.addColorStop(0, rgba(hot, 0)); g.addColorStop(0.5, rgba(hot, 0.13)); g.addColorStop(1, rgba(hot, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 170, 0, TAU); ctx.arc(cx, cy, Math.max(1, R - 170), 0, TAU, true); ctx.fill();
      ctx.lineDashOffset = -Game.rt * 30; Tele.ring(ctx, cx, cy, R, hot, 0.4, [10, 12]); ctx.lineDashOffset = 0;
      ctx.strokeStyle = rgba(hot, 0.16); ctx.lineWidth = 1.2; for (const r of [90, 200, 640, 760]) { ring(ctx, cx, cy, r); ctx.stroke(); }
      ctx.font = fontSerif(15); ctx.textAlign = 'center'; ctx.fillStyle = rgba(hot, 0.55); ctx.fillText('φ = 0 is unstable', cx, cy + 5);
    },
  },
  casimir: {
    name: 'The Casimir Effect', eq: 'F / A = −π²ℏc / 240a⁴', line: 'Two metal plates squeeze in from the sides. Bullets bounce off them, and they push you along.', noBoss: true,
    how: 'Metal plates close in from the left and right every few seconds, squeezing the arena. Bullets bounce off them, and they push you along. When fully closed they shed sheets of bullets.', short: 'Plates squeeze in from the sides.',
    PMAX: 600,
    start(s) { s.t = 0; s.p = 0; s.emit = 1.5; Game.box = { x0: 0, y0: 0, x1: W, y1: H }; }, stop() { Game.box = null; },
    onFire(s, B, i) { if (B.bn[i] < 1) B.bn[i] = 1; },
    update(s, dt) {
      const c = (s.t += dt) % 14, k = c < 2.5 ? 0 : c < 5.5 ? easeInOutCubic((c - 2.5) / 3) : c < 10 ? 1 : c < 13 ? 1 - easeInOutCubic((c - 10) / 3) : 0;
      const b = Game.box || (Game.box = { x0: 0, y0: 0, x1: W, y1: H });
      s.p = k * this.PMAX * (Game.mode === 'lab' ? 0.8 : 1); b.x0 = s.p; b.x1 = W - s.p;
      if (k <= 0.98 || Game.mode === 'attract' || (s.emit -= dt) > 0) return;
      s.emit = 1.7 / Game.fireRateMul;
      const gap = rand(0.2, 0.8);
      for (let j = 0; j < 8; j++) { const f = (j + 0.5) / 8; if (Math.abs(f - gap) < 0.1 * Game.D.gap) continue; Bullets.fire(b.x0 + 8, f * H, 130, 0, { col: PI_.ice, r: 6.5, life: 8 }); Bullets.fire(b.x1 - 8, (1 - f) * H, -130, 0, { col: PI_.ice, r: 6.5, life: 8 }); }
    },
    drawUnder(s, ctx) {
      const b = Game.box; if (!b) return;
      const hot = Theme.c.hot;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.2;
      for (let m = 1; m <= 4; m++) { ctx.strokeStyle = rgba(hot, 0.07); ctx.beginPath(); for (let x = b.x0; x <= b.x1 + 1; x += 20) ctx.lineTo(x, H / 2 + Math.sin((x - b.x0) / Math.max(1, b.x1 - b.x0) * PI * m) * Math.cos(Game.rt * (1 + m * 0.7)) * 220); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
      for (const [x, dir] of [[b.x0, -1], [b.x1, 1]]) {
        const g = ctx.createLinearGradient(x, 0, x + dir * 40, 0); g.addColorStop(0, '#cfd6e6'); g.addColorStop(0.3, '#6f7894'); g.addColorStop(1, '#262b3a');
        ctx.fillStyle = g; ctx.fillRect(dir < 0 ? x - 40 : x, -20, 40, H + 40);
        ctx.strokeStyle = rgba(hot, 0.9); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x, H + 20); ctx.stroke();
      }
    },
  },
  // ----- three new laws -----
  exclusion: {
    name: 'Pauli Exclusion', eq: 'ψ(x₁, x₂) = −ψ(x₂, x₁)', line: 'No two enemy bullets may share a state. They shove each other into crystals. Your cats are bosons and do not care.',
    how: 'Enemy bullets push each other apart, so streams spread out into lattices with gaps between them. Enemies of the same kind refuse to overlap too. Read the crystal and slip through its holes.', short: 'Bullets repel each other into lattices.',
    R: 46,
    start(s) { s.cell = new Map(); s.bonds = []; },
    update(s, dt) {
      const B = EB, R = this.R, M = s.cell, F = 2400 * dt, bonds = s.bonds; M.clear(); bonds.length = 0;
      for (let i = 0; i < B.n; i++) { if (B.delay[i] > 0) continue; const key = (Math.floor(B.x[i] / R) + 64) * 4096 + Math.floor(B.y[i] / R) + 64; const a = M.get(key); if (a) a.push(i); else M.set(key, [i]); }
      for (const [key, a] of M) {
        const cx = Math.floor(key / 4096), cy = key % 4096;
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const b = M.get((cx + ox) * 4096 + cy + oy); if (!b) continue;
          for (const i of a) for (const j of b) {
            if (j <= i) continue;
            const dx = B.x[j] - B.x[i], dy = B.y[j] - B.y[i], d2 = dx * dx + dy * dy;
            if (d2 >= R * R || d2 < 1e-4) continue;
            const d = Math.sqrt(d2), f = F * (1 - d / R) / d;
            B.vx[i] -= dx * f; B.vy[i] -= dy * f; B.vx[j] += dx * f; B.vy[j] += dy * f;
            if (bonds.length < 1600) bonds.push(i, j);
          }
        }
      }
      const E = Game.enemies;
      for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
        const a = E[i], b = E[j]; if (a.type !== b.type || a.boss || a.dead || b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, m = a.r + b.r + 24, d2 = dx * dx + dy * dy;
        if (d2 >= m * m || d2 < 1e-3) continue;
        const d = Math.sqrt(d2), f = 900 * (1 - d / m) * dt / d; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
      }
    },
    drawUnder(s, ctx) { // faint bonds of the bullet crystal
      const B = s.bonds; if (!B.length) return;
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(176,128,255,.22)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 0; k < B.length; k += 2) { const i = B[k], j = B[k + 1]; if (i >= EB.n || j >= EB.n) continue; ctx.moveTo(ix(EB.x[i]), iy(EB.y[i])); ctx.lineTo(ix(EB.x[i]) + EB.x[j] - EB.x[i], iy(EB.y[i]) + EB.y[j] - EB.y[i]); }
      ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    },
  },
  wormhole: {
    name: 'Einstein–Rosen Bridges', eq: 'ds² = −dt² + dl² + (b₀² + l²) dΩ²', line: 'Two pairs of wormholes have opened. Whatever goes into one comes out of its twin.', noBoss: true,
    how: 'Wormholes come in pairs of the same colour. You, enemies and every bullet that enters one comes out of its twin, still moving the same way. They jump to new places every fifteen seconds (dashed circles show where).', short: 'Linked portals: in one, out of its twin.',
    R: 42, COLS: ['orange', 'cyan'],
    start(s) { s.cd = 0; s.pairs = []; this.place(s); },
    spot(s) { for (let k = 0; k < 30; k++) { const p = Game.farPoint(260, 220); if (s.pairs.every(q => [q.a, q.b].every(e => !e || Math.hypot(e.x - p.x, e.y - p.y) > 380))) return p; } return Game.farPoint(200, 220); },
    place(s) {
      s.pairs = []; s.next = null; s.move = Game.mode === 'lab' ? 20 : 15;
      for (let k = 0; k < 2; k++) { const q = { c: PI_[this.COLS[k]], a: null, b: null }; s.pairs.push(q); q.a = this.spot(s); q.b = this.spot(s); }
    },
    update(s, dt) {
      if ((s.move -= dt) < 2 && !s.next) s.next = s.pairs.map(() => [this.spot(s), this.spot(s)]);
      if (s.move <= 0) { const nx = s.next; s.pairs.forEach((q, k) => { FX.ring(q.a.x, q.a.y, this.R, 6, 0.4, q.c, 3); FX.ring(q.b.x, q.b.y, this.R, 6, 0.4, q.c, 3); [q.a, q.b] = nx[k]; }); s.next = null; s.move = Game.mode === 'lab' ? 20 : 15; Audio2.sfx('door'); }
      const R2 = this.R * this.R, jump = (o, cd) => {
        for (const q of s.pairs) for (const [p, t] of [[q.a, q.b], [q.b, q.a]]) {
          if (wdx(o.x - p.x) ** 2 + wdy(o.y - p.y) ** 2 > R2) continue;
          const v = Math.hypot(o.vx, o.vy), ux = v > 20 ? o.vx / v : wdx(o.x - p.x) || 1, uy = v > 20 ? o.vy / v : wdy(o.y - p.y), u = Math.hypot(ux, uy) || 1;
          o.x = t.x + ux / u * (this.R + 30); o.y = t.y + uy / u * (this.R + 30);
          FX.ring(p.x, p.y, 8, this.R * 1.6, 0.35, q.c, 3); FX.ring(t.x, t.y, this.R * 1.6, 8, 0.35, q.c, 3); Grid.impulse(t.x, t.y, 300, 160);
          return cd;
        }
        return 0;
      };
      if ((s.cd -= dt) <= 0 && !Player.dead && Player.folding <= 0 && (s.cd = jump(Player, 0.7))) { contain(Player, 18); Audio2.sfx('foldStart'); }
      for (const e of Game.enemies) if (!e.boss && !e.dead && (e.wcd = (e.wcd || 0) - dt) <= 0) e.wcd = jump(e, 1);
    },
    bullet(s, B, i) {
      const R2 = this.R * this.R;
      for (const q of s.pairs) for (const [p, t] of [[q.a, q.b], [q.b, q.a]]) {
        if (wdx(B.x[i] - p.x) ** 2 + wdy(B.y[i] - p.y) ** 2 > R2) continue;
        const v = Math.hypot(B.vx[i], B.vy[i]) || 1; B.x[i] = t.x + B.vx[i] / v * (this.R + 4); B.y[i] = t.y + B.vy[i] / v * (this.R + 4); return;
      }
    },
    drawUnder(s, ctx) {
      const R = this.R, t = Game.rt;
      s.pairs.forEach((q, k) => {
        const c = PAL[q.c];
        Tele.line(ctx, ix(q.a.x), iy(q.a.y), ix(q.a.x) + wdx(q.b.x - q.a.x), iy(q.a.y) + wdy(q.b.y - q.a.y), c, 0.08, 1, [3, 14]);
        for (const p of [q.a, q.b]) {
          const x = ix(p.x), y = iy(p.y);
          halo(ctx, q.c, x, y, R * 2.6, 0.5);
          ctx.globalCompositeOperation = 'lighter';
          for (let j = 0; j < 4; j++) { ctx.strokeStyle = rgba(c, 0.5 - j * 0.1); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, R * (0.35 + j * 0.2), t * (2 + j) * (k ? -1 : 1) + j, t * (2 + j) * (k ? -1 : 1) + j + 4); ctx.stroke(); }
          ctx.globalCompositeOperation = 'source-over'; dot(ctx, x, y, R * 0.3, '#05030c');
        }
        if (s.next) for (const p of s.next[k]) Tele.ring(ctx, ix(p.x), iy(p.y), R, c, 0.5 + 0.3 * Math.sin(t * 16));
      });
    },
    post(s, P) { for (const q of s.pairs) for (const p of [q.a, q.b]) { const [sx, sy] = worldToScene(ix(p.x), iy(p.y)); P.lenses.push({ x: sx, y: sy, e: 26 * cam.zoom, hz: 0 }); } },
  },
  doppler: {
    name: 'Relativistic Doppler Effect', eq: 'f′ = f √((1 + β) / (1 − β))', line: 'Light is slow enough to notice now. Bullets coming at you are blue-shifted and fast; bullets heading away are red and lazy.',
    how: 'Enemy bullets heading at your cats speed up and turn blue. Bullets moving away slow down and turn red. Step sideways and a blue bullet reddens and slows.', short: 'Bullets aimed at you are fast and blue.',
    bullet(s, B, i, dt, k) {
      if (k !== K_EB || Player.dead) return;
      const vx = B.vx[i], vy = B.vy[i], sp = Math.hypot(vx, vy) || 1;
      let v0 = B.dop[i]; if (!v0) v0 = B.dop[i] = sp; else if (B.acc[i]) v0 = B.dop[i] = clamp(v0 + B.acc[i] * dt, B.min[i], B.max[i]);
      const dx = wdx(Player.x - B.x[i]), dy = wdy(Player.y - B.y[i]), c = (vx * dx + vy * dy) / (sp * (Math.hypot(dx, dy) || 1)), ns = v0 * (c > 0 ? 1 + 0.6 * c : 1 + 0.5 * c);
      B.vx[i] = vx / sp * ns; B.vy[i] = vy / sp * ns;
      if (!(B.flag[i] & 64)) B.col[i] = c > 0.35 ? PI_.ice : c < -0.35 ? PI_.red : PI_.violet;
    },
  },
};
const LAW_IDS = Object.keys(LAWS);

const Anom = {
  on: {}, hooks: { bullet: [] }, unwind: false,
  active(id) { return !!this.on[id]; },
  ids() { return Object.keys(this.on); },
  start(id) { const s = {}; this.on[id] = s; if (LAWS[id].start) LAWS[id].start(s); this.rehook(); Notes.see('law:' + id); },
  stop(id) { const s = this.on[id]; if (!s) return; if (LAWS[id].stop) LAWS[id].stop(s); delete this.on[id]; if (id === 'godel') this.unwind = true; this.rehook(); },
  set(ids) { for (const id of this.ids()) if (!ids.includes(id)) this.stop(id); for (const id of ids) if (!this.on[id] && LAWS[id]) this.start(id); },
  toggle(id) { if (this.on[id]) this.stop(id); else this.start(id); },
  clear() { for (const id of this.ids()) this.stop(id); },
  rehook() { const b = this.hooks.bullet = []; for (const id in this.on) if (LAWS[id].bullet) b.push(LAWS[id], this.on[id]); },
  // call a hook on every active law
  each(name, ...a) { for (const id in this.on) { const d = LAWS[id]; if (d[name]) d[name](this.on[id], ...a); } },
  // multiply a factor over every active law (a number, or a function of the law's state)
  mul(name, ...a) { let m = 1; for (const id in this.on) { const v = LAWS[id][name]; if (v !== undefined) m *= typeof v === 'function' ? v(this.on[id], ...a) : v; } return m; },
  update(dt) {
    this.each('update', dt);
    if (this.unwind && !this.on.godel) { // let the camera spin back upright
      const target = Math.round(cam.rot / TAU) * TAU;
      cam.rot += (target - cam.rot) * damp(2.5, Game.realDt);
      if (Math.abs(target - cam.rot) < 0.002) { cam.rot = 0; this.unwind = false; cam.free = false; Audio2.pan(0); }
    }
  },
  firePos(e) { if (e.sp && e.sp.length) { const p = pick(e.sp); return [e.x + p.dx, e.y + p.dy]; } return [e.x, e.y]; },
  hud(ctx, x, y) { let k = 0; for (const id in this.on) if (LAWS[id].hud) LAWS[id].hud(this.on[id], ctx, x, y + 24 * k++); },
  planck() { return !!this.on.planck; },
};
