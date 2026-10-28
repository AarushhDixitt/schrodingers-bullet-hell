// ---------- black holes: four sizes, erratic drift, polar jets, mergers and gravitational waves ----------
// GM is the pull on the cat; enemies, your photons and enemy bullets feel it scaled by K.
const HOLE_LV = [null,
  // drift: cruising speed; every: how often it picks a new heading; grip: how fast it can change course; kick: sudden lurches
  { name: 'micro', rh: 14, GM: 1.6e7, drift: 130, every: [0.6, 1.4], grip: 1.6, kick: 1.5, hawk: [0.45, 0.8] },
  { name: 'stellar', rh: 26, GM: 4.2e7, drift: 70, every: [1.2, 2.6], grip: 1, kick: 0.8, hawk: [1.2, 2.2] },
  { name: 'intermediate', rh: 42, GM: 8e7, drift: 32, every: [3, 5], grip: 0.4, kick: 0, hawk: [2.6, 4], jets: true },
  { name: 'supermassive', rh: 62, GM: 1.4e8, drift: 14, every: [5, 8], grip: 0.2, kick: 0, hawk: [5, 8], jets: true },
];
const Holes = {
  list: [], waves: [], pairs: [], K: [1, 1.6, 4, 2, 0],
  clear() { this.list.length = this.waves.length = this.pairs.length = 0; Audio2.drone(false); },
  add(x, y, lv = 2, o = {}) {
    const h = { x, y, vx: 0, vy: 0, tvx: 0, tvy: 0, lv, L: HOLE_LV[lv], disk: [], hawk: 1, born: 0, arrive: o.arrive ?? 1.6, life: o.life ?? Infinity, tag: o.tag, kickT: 0, jetT: rand(4, 8), jetA: Math.random() * PI, jet: 0, id: uid() };
    this.list.push(h); Audio2.drone(true);
    Game.toastOnce('hint-hole', 'Black holes come in sizes now. Big ones fire jets from their poles (dashed lines first), and two that drift close will merge and send out a gravitational wave. Fold as the wave reaches you.');
    return h;
  },
  // somewhere far from the cat, with a level weighted toward the wave number
  spawn(o = {}) { const p = Game.farPoint(460, 280); return this.add(p.x, p.y, o.lv || weightedPick([1, 2, 3, 4], l => [0, 3, 3, Game.level > 12 ? 2 : 0.5, Game.level > 24 ? 1 : 0][l]), o); },
  evaporate(tag) { for (const h of this.list) if (!tag || h.tag === tag) h.life = Math.min(h.life, 0.8); },
  K_of: (h, k) => Holes.K[k] * h.L.GM * h.born * (k === K_CAT && Game.mode === 'arcade' ? clamp(0.55 + 0.45 * Game.D.bspd, 0.8, 1.1) : 1),
  acc(s, x, y, k, o) { for (const h of this.list) if (h.born > 0) pullTo(o, x, y, h.x, h.y, this.K_of(h, k), (h.L.rh * 1.5) ** 2); },
  sink(s, x, y, k) { const extra = k === K_CAT ? 6 : k === K_EN ? 4 : 0; return this.list.some(h => h.born > 0.5 && wdx(h.x - x) ** 2 + wdy(h.y - y) ** 2 < (h.L.rh + extra) ** 2); },
  threat(P, pad) { // for perfect folds: a wave front or a horizon right on top of a cat
    return this.waves.some(w => P.branches.some(b => Math.abs(Math.hypot(wdx(b.px - w.x), wdy(b.py - w.y)) - w.r) < w.w + w.speed * 0.15 + pad)) || this.list.some(h => P.branches.some(b => Math.hypot(wdx(b.px - h.x), wdy(b.py - h.y)) < h.L.rh + pad + 10));
  },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const h = L[i], D = h.L;
      if (h.arrive > 0) { h.arrive -= dt; if (h.arrive <= 0) { Grid.impulse(h.x, h.y, -900, 400); FX.ring(h.x, h.y, 300, 10, 0.5, PI_.orange, 4); Audio2.sfx('boom'); } continue; }
      h.born = Math.min(1, h.born + dt * 0.8);
      if ((h.life -= dt) <= 0) { // evaporated: one last flash of Hawking radiation
        Bullets.ring(h.x, h.y, 10 + h.lv * 4, 140, { col: PI_.white, r: 5.5, life: 5 }, Math.random() * TAU);
        FX.ring(h.x, h.y, D.rh, D.rh * 8, 0.6, PI_.white, 4); Feed.add('A black hole evaporated');
        L.splice(i, 1); if (!L.length) Audio2.drone(false); continue;
      }
      if (h.inspiral) continue; // the pair moves them
      // erratic drift: a new heading every so often, and sudden kicks; walls turn it round
      if ((h.kickT -= dt) <= 0) {
        h.kickT = rand(...D.every); const a = Math.random() * TAU, s = D.drift * rand(0.4, 1.2); h.tvx = Math.cos(a) * s; h.tvy = Math.sin(a) * s;
        if (D.kick && chance(0.3)) { h.vx += Math.cos(a) * D.drift * D.kick; h.vy += Math.sin(a) * D.drift * D.kick; }
      }
      const m = 120 + D.rh * 3;
      const turn = D.drift * 0.3;
      if (h.x < m) h.tvx = Math.abs(h.tvx) + turn; if (h.x > W - m) h.tvx = -Math.abs(h.tvx) - turn;
      if (h.y < m) h.tvy = Math.abs(h.tvy) + turn; if (h.y > H - m) h.tvy = -Math.abs(h.tvy) - turn;
      h.vx += (h.tvx - h.vx) * damp(D.grip, dt); h.vy += (h.tvy - h.vy) * damp(D.grip, dt); // heavy holes are slow to change course
      h.x += h.vx * dt; h.y += h.vy * dt;
      if (!World.wrap) { h.x = clamp(h.x, 60, W - 60); h.y = clamp(h.y, 60, H - 60); }
      Grid.attract(h.x, h.y, 5000 + D.GM / 6000 * h.born, 260 + D.rh * 7, dt);
      if (h.disk.length < 60 + h.lv * 30 && Math.random() < 0.9) h.disk.push({ r: rand(D.rh * 1.5, D.rh * 4.2), a: Math.random() * TAU, life: rand(1.5, 4), t: 0, c: pick([PI_.orange, PI_.amber, PI_.white, PI_.gold]) }); // accretion disk
      for (let j = h.disk.length - 1; j >= 0; j--) { const d = h.disk[j]; d.t += dt; d.a += dt * 380 / d.r; d.r -= dt * 9; if (d.t > d.life || d.r < D.rh) h.disk.splice(j, 1); }
      if ((h.hawk -= dt) <= 0 && Game.mode !== 'lab') { h.hawk = rand(...D.hawk); const a = Math.random() * TAU; Bullets.fire(h.x + Math.cos(a) * (D.rh + 22), h.y + Math.sin(a) * (D.rh + 22), Math.cos(a) * 90, Math.sin(a) * 90, { col: PI_.white, r: 5.5, life: 7 }); } // Hawking radiation: small holes are hotter
      if (D.jets) this.jets(h, dt);
    }
    this.merge(dt);
    for (let i = this.waves.length - 1; i >= 0; i--) if (this.wave(this.waves[i], dt)) this.waves.splice(i, 1);
  },
  // relativistic jets out of both poles: a dashed warning, then two sweeping beams
  jets(h, dt) {
    const warn = 1.2 * Game.tele(true);
    h.jetA += dt * 0.05;
    if (h.jet === 0 && (h.jetT -= dt) <= 0) { h.jet = 1; h.jetT = warn; Audio2.sfx('charge'); }
    else if (h.jet === 1 && (h.jetT -= dt) <= 0) { h.jet = 2; h.jetT = 1.8; Audio2.sfx('zap'); addTrauma(0.25); }
    else if (h.jet === 2) {
      h.jetA += dt * 0.45 * (h.lv === 4 ? 1.3 : 1);
      for (const s of [0, PI]) Game.beamHit(h.x, h.y, h.jetA + s, 1800, 9 + h.lv * 2, null, 'polar jet');
      if ((h.jetT -= dt) <= 0) { h.jet = 0; h.jetT = rand(6, 10); }
    }
  },
  // two holes that drift close spiral in (the chirp), then merge into a bigger one and release a gravitational wave
  merge(dt) {
    const L = this.list;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      if (a.inspiral || b.inspiral || a.born < 1 || b.born < 1 || Math.hypot(a.x - b.x, a.y - b.y) > (a.L.rh + b.L.rh) * 3.4) continue;
      const pr = { a, b, t: 0, dur: 2.6, ang: Math.atan2(b.y - a.y, b.x - a.x), r0: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      a.inspiral = b.inspiral = pr; this.pairs.push(pr);
      Game.banner('INSPIRAL', 'Two black holes are about to merge. A gravitational wave is coming: fold as it reaches you.', 2);
      Audio2.sfx('chirp');
    }
    for (let i = this.pairs.length - 1; i >= 0; i--) {
      const p = this.pairs[i], f = (p.t += dt) / p.dur, r = p.r0 / 2 * (1 - f * f);
      p.ang += dt * (2 + 14 * f * f);
      for (const [h, s] of [[p.a, 1], [p.b, -1]]) { h.x = p.cx + Math.cos(p.ang) * r * s; h.y = p.cy + Math.sin(p.ang) * r * s; }
      if (Math.random() < 0.3 + f) Grid.impulse(p.cx, p.cy, 200 + 900 * f, 300 + 300 * f);
      if (f < 1) continue;
      this.pairs.splice(i, 1);
      const lv = Math.min(4, Math.max(p.a.lv, p.b.lv) + 1), life = Math.max(p.a.life, p.b.life);
      L.splice(L.indexOf(p.a), 1); L.splice(L.indexOf(p.b), 1);
      const h = this.add(p.cx, p.cy, lv, { arrive: 0, life, tag: p.a.tag }); h.born = 1;
      this.waves.push({ x: p.cx, y: p.cy, r: 30, speed: 640, w: 26, hit: new Set(), shook: false });
      Game.post.ripples.push({ x: p.cx, y: p.cy, r: 0, max: 2600, t: 0, life: 4, a: 0.03 });
      Grid.impulse(p.cx, p.cy, 2600, 1400); addTrauma(0.8); Game.post.flash = [0.8, 0.9, 1, 0.5];
      FX.text(p.cx, p.cy - 70, 'GW' + new Date().toISOString().slice(2, 10).replace(/-/g, ''), PI_.white, { size: 20, life: 2, vy: -20 });
      Audio2.sfx('merger'); Input.rumble(0.8, 400);
      Feed.add('Two black holes merged', 'ice', HOLE_LV[lv].name); Game.stats.mergers = (Game.stats.mergers || 0) + 1; Ach.unlock('merger');
    }
  },
  // a gravitational wave: an expanding ring that shoves and hurts enemies, erases bullets, and measures cats it crosses
  wave(w, dt) {
    w.r += w.speed * dt;
    const inBand = (x, y) => Math.abs(Math.hypot(wdx(x - w.x), wdy(y - w.y)) - w.r) < w.w;
    for (const e of Game.enemies) {
      if (e.dead || e.boss || w.hit.has(e) || !inBand(e.x, e.y)) continue;
      w.hit.add(e); const a = Math.atan2(e.y - w.y, e.x - w.x); e.vx += Math.cos(a) * 500 / e.mass; e.vy += Math.sin(a) * 500 / e.mass; Game.damageEnemy(e, 18, e.x, e.y);
    }
    for (let i = EB.n - 1; i >= 0; i--) if (inBand(EB.x[i], EB.y[i]) && Math.random() < 0.6) { FX.spawn(EB.x[i], EB.y[i], 0, 0, 0.3, 4, EB.col[i]); EB.kill(i); }
    if (!w.hitCat && !Player.dead) {
      const set = Player.branches.filter(b => b.grace <= 0 && inBand(b.px, b.py));
      if (set.length) { w.hitCat = true; if (Player.protected()) { FX.text(Player.x, Player.y - 50, 'surfed the wave', PI_.cyan, { size: 15, font: 'serif' }); Ach.unlock('ripple'); } else Player.measureHit(set, 'gravitational wave'); }
    }
    return w.r > Math.hypot(W, H) + 200;
  },
  drawUnder(ctx) {
    const tilt = 0.28;
    for (const w of this.waves) { // the wave front
      ctx.globalCompositeOperation = 'lighter';
      for (const [d, a, lw] of [[0, 0.75, 4], [-w.w, 0.25, 2], [w.w, 0.25, 2]]) { ctx.strokeStyle = rgba(COL.ice, a); ctx.lineWidth = lw; ring(ctx, ix(w.x), iy(w.y), Math.max(1, w.r + d)); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    for (const p of this.pairs) { const f = p.t / p.dur; for (let k = 0; k < 3; k++) Tele.ring(ctx, ix(p.cx), iy(p.cy), ((Game.rt * 300 + k * 120) % 360) + 40, COL.ice, 0.3 + 0.4 * f, [6, 10]); txt(ctx, 'MERGER IN ' + Math.max(0, p.dur - p.t).toFixed(1), ix(p.cx), iy(p.cy) - 90, fontMono(13, 700), '#cfe9ff', 'center', 2); }
    for (const h of this.list) {
      const x = ix(h.x), y = iy(h.y), R = h.L.rh;
      if (h.arrive > 0) { const f = 1 - h.arrive / 1.6; Tele.ring(ctx, x, y, 260 * (1 - f) + R, COL.orange, 0.3 + 0.5 * f); txt(ctx, 'SOMETHING HEAVY', x, y - 40, fontMono(11, 700), 'rgba(255,170,90,.8)', 'center', 2); continue; }
      const k = h.born, s = R / 30;
      if (h.jet) for (const sd of [0, PI]) Tele.beam(ctx, x, y, h.jetA + sd, 1800, 9 + h.lv * 2, [170, 210, 255], h.jet, Game.rt);
      halo(ctx, PI_.orange, x, y, 150 * s, 0.45 * k);
      const disk = front => { for (const d of h.disk) { const sn = Math.sin(d.a); if ((sn > 0) !== front) continue; ctx.globalAlpha = Math.min(1, d.t * 3) * (1 - d.t / d.life) * k; ctx.drawImage(glowSprite(d.c, 32), x + Math.cos(d.a) * d.r - 5, y + sn * d.r * tilt - 5, 10, 10); } ctx.globalAlpha = 1; };
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,190,110,.55)'; ctx.lineWidth = 5 * k * s; ctx.beginPath(); ctx.ellipse(x, y - 4 * s, R * 2.1 * k, R * 1.55 * k, 0, PI, TAU); ctx.stroke(); // far side, lensed over the top
      disk(false);
      ctx.globalCompositeOperation = 'source-over'; dot(ctx, x, y, R * 1.1 * k, '#000'); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,236,200,.95)'; ctx.lineWidth = 1.8; ring(ctx, x, y, R * 1.18 * k); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,160,70,.7)'; ctx.lineWidth = 7 * k * s; ctx.beginPath(); ctx.ellipse(x, y, R * 3.6 * k, R * 3.6 * tilt * k, 0, 0, PI); ctx.stroke();
      disk(true);
      ctx.globalCompositeOperation = 'source-over';
    }
  },
  post(P) { for (const h of this.list) if (h.born > 0) { const [sx, sy] = worldToScene(ix(h.x), iy(h.y)); P.lenses.push({ x: sx, y: sy, e: 64 * (h.L.rh / 30) * cam.zoom * h.born, hz: h.L.rh * 1.05 * cam.zoom * h.born }); } },
};
