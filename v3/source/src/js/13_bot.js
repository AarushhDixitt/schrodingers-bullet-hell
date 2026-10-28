// ---------- attract mode & autopilot ----------
const Attract = {
  t: 0, anomT: 0, spawnT: 0, k: 0,
  list: ['blackhole', 'godel', 'zeno', 'planck', 'entangle', 'gravity', 'vacuum', 'superpos', 'duality', 'tunnel', 'zombie', 'coulomb', 'symmetry', 'hubble', 'perpetual'],
  reset() {
    this.t = 0; this.anomT = 0.2; this.spawnT = 2.5;
    this.k = pick([0, 0, 1, 2, 8]); // open on something dramatic
    for (const g of ['electrons', 'protons', 'tachyons']) GROUPS[g].spawn(Game.farPoint(420, 120));
  },
  update(dt) {
    this.t += dt;
    this.anomT -= dt;
    if (this.anomT <= 0) { this.anomT = 12; Anom.set([this.list[this.k++ % this.list.length]]); if (!Settings.theme || Settings.theme === 'auto') Theme.chapter(this.k, 4); }
    this.spawnT -= dt;
    const alive = Game.enemies.length + Game.spawns.length;
    if (this.spawnT <= 0 && alive < 16) {
      this.spawnT = rand(1.2, 2.2);
      const g = pick(['electrons', 'protons', 'muons', 'tachyons', 'physicists', 'positrons', 'triad', 'turret', 'electrons', 'neutrinos', 'atom', 'alphas', 'neutrons', 'higgs']);
      GROUPS[g].spawn(Game.farPoint(380, 100));
    }
    Player.invuln = 1e9;
  },
};

const Bot = {
  on: false, mx: 0, my: 0, wanderA: Math.random() * TAU,
  think(dt) {
    const P = Player;
    let fx = 0, fy = 0;
    if (!P.dead) {
      for (let i = 0; i < EB.n; i++) {
        const dx = wdx(P.x - EB.x[i]), dy = wdy(P.y - EB.y[i]);
        const d2 = dx * dx + dy * dy; if (d2 > 300 * 300) continue;
        const vx = EB.vx[i], vy = EB.vy[i];
        const approaching = dx * vx + dy * vy > 0;
        if (!approaching && d2 > 70 * 70) continue;
        const sp = Math.hypot(vx, vy) || 1, nx = -vy / sp, ny = vx / sp;
        const side = dx * nx + dy * ny >= 0 ? 1 : -1;
        const w = 9e4 / (d2 + 900), d = Math.sqrt(d2) || 1;
        fx += nx * side * w + dx / d * w * 0.35; fy += ny * side * w + dy / d * w * 0.35;
      }
      for (const e of Game.enemies) {
        if (e.dead || e.ghost) continue;
        const pts = e.bodies || [Game.aimOf(e, P.x, P.y)];
        for (const q of pts) {
          const dx = wdx(P.x - q.x), dy = wdy(P.y - q.y), d2 = dx * dx + dy * dy, Rr = e.boss ? 420 : 240;
          if (d2 > Rr * Rr) continue;
          const w = (e.boss ? 3.5 : 1.5) * 9e4 / (d2 + 900), d = Math.sqrt(d2) || 1;
          fx += dx / d * w; fy += dy / d * w;
        }
      }
      if (Game.boss && Game.boss.gas) for (const g of Game.boss.gas) { const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1; if (d < g.r + 160) { fx += dx / d * 4; fy += dy / d * 4; } }
      for (const h of Holes.list) { const dx = wdx(P.x - h.x), dy = wdy(P.y - h.y), d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1, R = 260 + h.L.rh * 5; if (d < R) { const w = 4e5 * h.L.rh / 30 / (d2 + 100); fx += dx / d * w; fy += dy / d * w; } }
      if (!World.wrap) {
        const m = 260;
        if (P.x < m) fx += (m - P.x) * 0.05; if (P.x > W - m) fx -= (P.x - (W - m)) * 0.05;
        if (P.y < m) fy += (m - P.y) * 0.05; if (P.y > H - m) fy -= (P.y - (H - m)) * 0.05;
      }
      const g = Anom.on.gravity; if (g) { const d = LAWS.gravity.DIRS[g.dir]; fx -= d[0] * 3; fy -= d[1] * 3; }
      // stragglers: when a wave drags on with only a few enemies left, go and get them
      if (Game.mode === 'arcade' && Director.phase === 'fight' && Director.t > 25 && Game.enemies.length <= 6) {
        let best = null, bd = 1e12;
        for (const e of Game.enemies) { if (e.dead || e.ghost) continue; const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (d < bd) { bd = d; best = e; } }
        if (best) { const dx = best.x - P.x, dy = best.y - P.y, d = Math.sqrt(bd) || 1, k = d > 230 ? 2.2 : -1; fx += dx / d * k; fy += dy / d * k; }
      }
      fx += (W / 2 - P.x) * 0.0012; fy += (H / 2 - P.y) * 0.0012;
      this.wanderA += (Math.random() - 0.5) * dt * 3;
      fx += Math.cos(this.wanderA) * 0.5; fy += Math.sin(this.wanderA) * 0.5;
    }
    const m = Math.hypot(fx, fy); let mx = 0, my = 0;
    if (m > 0.2) { mx = fx / m; my = fy / m; }
    this.mx += (mx - this.mx) * damp(9, dt); this.my += (my - this.my) * damp(9, dt);
    let ox = this.mx, oy = this.my;
    if (cam.rot) { const c = Math.cos(cam.rot), s = Math.sin(cam.rot); const x = ox * c - oy * s; oy = ox * s + oy * c; ox = x; }
    let near = 0;
    for (const e of Game.enemies) { if (e.dead) continue; const dx = wdx(e.x - P.x), dy = wdy(e.y - P.y); if (dx * dx + dy * dy < 270 * 270) near++; }
    const split = P.nq < (Game.mode === 'attract' ? 4 : 3) && P.coh > (Game.mode === 'attract' ? 35 : 55) && P.splitCd <= 0 && Math.random() < dt * (Game.mode === 'attract' ? 3 : 1.6);
    const fold = P.nq >= 1 && P.foldCd <= 0 && (P.nq >= 2 && (near >= 6 || P.coh < 14) || Game.mode !== 'attract' && P.threatened()); // fold-dodge when something is about to hit
    return { mx: ox, my: oy, aim: { mode: 'auto' }, split, fold, focus: false };
  },
};
