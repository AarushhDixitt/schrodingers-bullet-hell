// ---------- random events: space weather for Endless and Boss rush ----------
// Each event: name, line (shown when it starts), dur, and optional start/update/stop/drawUnder/drawMid/post.
// drawMid draws over enemies but under the cats and enemy bullets (the eclipse hides enemies, never bullets).
const sweepWarn = (v, dt, fire) => { for (let i = v.warn.length - 1; i >= 0; i--) { const w = v.warn[i]; if ((w.t -= dt) <= 0) { v.warn.splice(i, 1); fire(w); } } };
const EVENTS = {
  meteors: {
    name: 'Meteor shower', line: 'Rocks from the sky. Each one is announced by a dashed line.', dur: 12,
    start(v) { v.warn = []; v.next = 0.4; v.side = randi(0, 3); },
    update(v, dt) {
      if (v.t < v.dur - 1.5 && (v.next -= dt) <= 0) {
        v.next = rand(0.3, 0.6) / Math.sqrt(Game.fireRateMul);
        const f = rand(0.05, 0.95), tilt = rand(-0.35, 0.35), [x, y, a] = [[f * W, -40, PI / 2], [W + 40, f * H, PI], [f * W, H + 40, -PI / 2], [-40, f * H, 0]][v.side];
        v.warn.push({ x, y, a: a + tilt, t: Game.tele() * 1.1, max: Game.tele() * 1.1 });
      }
      sweepWarn(v, dt, w => { Bullets.fire(w.x, w.y, Math.cos(w.a) * 620, Math.sin(w.a) * 620, { col: PI_.orange, r: 15, life: 6, kind: 2 }); Audio2.sfx('boom'); });
    },
    drawUnder(v, ctx) { for (const w of v.warn) Tele.line(ctx, w.x, w.y, w.x + Math.cos(w.a) * 2800, w.y + Math.sin(w.a) * 2800, COL.orange, 0.25 + 0.5 * (1 - w.t / w.max), 3, [14, 10]); },
  },
  eclipse: {
    name: 'Eclipse', line: 'The lights are out. Enemies hide in the dark; their bullets still glow.', dur: 15,
    drawMid(v, ctx) {
      if (Player.dead) return;
      const a = 0.88 * clamp(Math.min(v.t, v.dur - v.t) / 1.2, 0, 1), x = ix(Player.x), y = iy(Player.y), r = 330;
      const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
      g.addColorStop(0, 'rgba(4,3,10,0)'); g.addColorStop(1, `rgba(4,3,10,${a})`);
      const vr = viewRect(200); ctx.fillStyle = g; ctx.fillRect(vr.x0, vr.y0, vr.x1 - vr.x0, vr.y1 - vr.y0);
    },
  },
  hole: {
    name: 'A black hole arrives', line: 'Something heavy is falling into the arena. It will evaporate in half a minute.', dur: 0.5,
    start() { Holes.spawn({ tag: 'event', life: 28, lv: weightedPick([1, 2, 3, 4], l => [0, 2, 3, Game.level > 20 ? 2 : 1, Game.level > 34 ? 1 : 0][l]) }); },
  },
  gflip: {
    name: 'Gravity flip', line: 'Gravity switches on for twenty seconds. The floor will turn.', dur: 20,
    start(v) { if (!Anom.on.gravity) { Anom.start('gravity'); Anom.on.gravity.t = 6; v.own = true; } },
    stop(v) { if (v.own) Anom.stop('gravity'); },
  },
  flare: {
    name: 'Solar flare', line: 'A wall of plasma sweeps the arena. Find the gap.', dur: 9,
    start(v) { v.dir = chance(0.5) ? 1 : -1; v.gy = rand(0.25, 0.75) * H; v.gh = 270 * Game.D.gap; v.x = v.dir > 0 ? -200 : W + 200; v.go = Game.tele() * 2; },
    update(v, dt) {
      v.gy = clamp(v.gy + Math.sin(v.t * 0.9) * 60 * dt, 200, H - 200);
      if ((v.go -= dt) > 0) return;
      v.x += v.dir * (W + 400) / (v.dur - 2.2) * dt;
      const inBand = (x, y) => Math.abs(x - v.x) < 70 && Math.abs(y - v.gy) > v.gh / 2;
      for (let i = EB.n - 1; i >= 0; i--) if (inBand(EB.x[i], EB.y[i])) EB.kill(i);
      Player.hit(Player.branches.filter(b => b.grace <= 0 && inBand(b.px, b.py)), 'solar flare');
      for (const e of Game.enemies) if (!e.dead && !e.boss && inBand(e.x, e.y)) Game.damageEnemy(e, 30 * dt, e.x, e.y);
    },
    drawUnder(v, ctx) {
      const warn = v.go > 0, x = warn ? (v.dir > 0 ? 40 : W - 40) : v.x, top = v.gy - v.gh / 2, bot = v.gy + v.gh / 2;
      ctx.globalCompositeOperation = 'lighter';
      for (const [y0, y1] of [[-50, top], [bot, H + 50]]) {
        if (warn) { ctx.fillStyle = `rgba(255,186,72,${0.12 + 0.12 * Math.sin(Game.rt * 14)})`; ctx.fillRect(x - 70, y0, 140, y1 - y0); continue; }
        const g = ctx.createLinearGradient(x - 90, 0, x + 90, 0); g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(0.5, 'rgba(255,230,160,.85)'); g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, y0, 180, y1 - y0);
      }
      ctx.globalCompositeOperation = 'source-over';
      Tele.line(ctx, x - 80, top, x + 80, top, COL.cyan, 0.8, 2, []); Tele.line(ctx, x - 80, bot, x + 80, bot, COL.cyan, 0.8, 2, []);
      if (warn) txt(ctx, 'FLARE IN ' + v.go.toFixed(1), x, top - 18, fontMono(14, 700), '#ffba48', 'center');
    },
  },
  supernova: {
    name: 'Supernova', line: 'A star is about to explode. Get to a gap in its shell when it goes.', dur: 7,
    start(v) { const p = Game.farPoint(420, 260); v.x = p.x; v.y = p.y; v.fuse = Game.tele() * 3; v.boom = false; },
    update(v, dt) {
      if (v.boom || (v.fuse -= dt) > 0) return;
      v.boom = true; const n = 64, gaps = [randi(0, n - 1), randi(0, n - 1), randi(0, n - 1)], a0 = Math.random() * TAU, gw = Math.round(2 * Game.D.gap);
      for (let k = 0; k < n; k++) { if (gaps.some(g => Math.abs(((k - g + n + n / 2) % n) - n / 2) <= gw)) continue; const a = a0 + k / n * TAU; for (const sp of [230, 300]) Bullets.fire(v.x, v.y, Math.cos(a) * sp, Math.sin(a) * sp, { col: PI_.gold, r: 8, life: 9 }); }
      FX.ring(v.x, v.y, 20, 900, 1.2, PI_.gold, 10); FX.burst(v.x, v.y, 80, 700, [PI_.gold, PI_.white, PI_.orange], { life: 1.2, size: 6 });
      Grid.impulse(v.x, v.y, 2000, 900); addTrauma(0.8); Game.post.flash = [1, 0.9, 0.6, 0.6]; Audio2.sfx('bossDeath'); Input.rumble(0.9, 500);
      for (const e of Game.enemies) if (!e.dead && wdx(e.x - v.x) ** 2 + wdy(e.y - v.y) ** 2 < 320 * 320) Game.damageEnemy(e, 40, e.x, e.y);
    },
    drawUnder(v, ctx) {
      if (v.boom) return;
      const f = 1 - v.fuse / (Game.tele() * 3), x = ix(v.x), y = iy(v.y), r = 14 + 26 * f + Math.sin(Game.rt * (10 + 30 * f)) * 4 * f;
      halo(ctx, PI_.gold, x, y, r * 5, 0.5 + 0.5 * f); dot(ctx, x, y, r, '#fff6d8');
      Tele.ring(ctx, x, y, 60 + 300 * (1 - f), COL.gold, 0.3 + 0.5 * f);
      txt(ctx, v.fuse.toFixed(1), x, y - r - 14, fontMono(14, 700), '#ffcf4a', 'center');
    },
    post(v, P) { if (!v.boom) { const [sx, sy] = worldToScene(ix(v.x), iy(v.y)); P.lenses.push({ x: sx, y: sy, e: 20 * cam.zoom, hz: 0 }); } },
  },
  rays: {
    name: 'Cosmic rays', line: 'High-energy particles streak through. Each line flashes before it fires.', dur: 10,
    start(v) { v.warn = []; v.next = 0.5; v.zap = []; },
    update(v, dt) {
      if (v.t < v.dur - 1 && (v.next -= dt) <= 0) {
        v.next = rand(0.35, 0.7) / Math.sqrt(Game.fireRateMul);
        const a = Math.random() * PI, b = Player.dead ? Player : pick(Player.branches), tx = (b.px ?? b.x) + rand(-90, 90), ty = (b.py ?? b.y) + rand(-90, 90); // aimed near one of your cats
        for (const da of chance(0.35) ? [0, rand(0.5, 1.1)] : [0]) v.warn.push({ x: tx - Math.cos(a + da) * 2600, y: ty - Math.sin(a + da) * 2600, a: a + da, t: Game.tele() * 0.8, max: Game.tele() * 0.8 }); // sometimes two cross at your position
      }
      sweepWarn(v, dt, w => { v.zap.push({ ...w, t: 0.3 }); Audio2.sfx('zap'); });
      for (let i = v.zap.length - 1; i >= 0; i--) { const z = v.zap[i]; Game.beamHit(z.x, z.y, z.a, 5200, 10, null, 'cosmic ray'); if ((z.t -= dt) <= 0) v.zap.splice(i, 1); } // it burns for a moment, not a single frame
    },
    drawUnder(v, ctx) {
      for (const w of v.warn) Tele.line(ctx, w.x, w.y, w.x + Math.cos(w.a) * 5200, w.y + Math.sin(w.a) * 5200, COL.ice, 0.2 + 0.5 * (1 - w.t / w.max), 1.5, [6, 8]);
      for (const z of v.zap) Tele.beam(ctx, z.x, z.y, z.a, 5200, 10, COL.ice, 2, Game.rt);
    },
  },
};
const EVENT_IDS = Object.keys(EVENTS);

const Events = {
  list: [], next: 0,
  clear() { for (const v of this.list) if (v.def.stop) v.def.stop(v); this.list.length = 0; this.next = 14; },
  // automatic in Endless and Boss rush (any mode, from the master console)
  auto() { return Game.mode === 'arcade' && Game.variant !== 'campaign' && !Bot.on; },
  max() { const d = Director.def; return !d ? 1 : Game.variant === 'rush' ? 1 + d.cycle : Math.min(3, 1 + Math.floor(d.n / 10)); },
  start(id) {
    const def = EVENTS[id]; if (!def) return;
    const v = { id, def, t: 0, dur: def.dur }; this.list.push(v);
    if (def.start) def.start(v);
    Game.banner(def.name.toUpperCase(), def.line, 2.2); Audio2.sfx('event'); Audio2.say(def.name + '.', 1);
    Game.stats.events++; if (Game.stats.events >= 10) Ach.unlock('weather');
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) { const v = this.list[i]; v.t += dt; if (v.def.update) v.def.update(v, dt); if (v.t >= v.dur) { if (v.def.stop) v.def.stop(v); this.list.splice(i, 1); } }
    if (!this.auto() || !['fight', 'boss'].includes(Director.phase) || Game.state !== 'playing') return;
    const d = Director.def; if (Game.variant === 'endless' && d.n < 3) return;
    if ((this.next -= dt) > 0 || this.list.length >= this.max()) return;
    const n = d.n, pool = EVENT_IDS.filter(id => !this.list.some(v => v.id === id) && !(id === 'gflip' && Anom.on.gravity) && !(id === 'eclipse' && Game.boss));
    this.next = Game.variant === 'rush' ? rand(18, 26) : Math.max(11, 28 - n * 0.4) * rand(0.85, 1.2);
    if (pool.length) this.start(pick(pool));
  },
  drawUnder(ctx) { for (const v of this.list) if (v.def.drawUnder) v.def.drawUnder(v, ctx); },
  drawMid(ctx) { for (const v of this.list) if (v.def.drawMid) v.def.drawMid(v, ctx); },
  post(P) { for (const v of this.list) if (v.def.post) v.def.post(v, P); },
};
