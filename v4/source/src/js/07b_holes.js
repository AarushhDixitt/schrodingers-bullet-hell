// ---------- black holes: one continuous mass; size, pull, speed, temperature, jets and mergers all follow from it ----------
// Masses are in solar masses (M☉) on a log scale. Classes are just labels over ranges:
//   primordial < 3 (hot, and they evaporate) · stellar · intermediate ≥ 100 (polar jets) · supermassive ≥ 100,000 (never spawns: built by mergers)
const HOLE_CLASS = [
  { id: 'primordial', name: 'primordial', min: 0 },
  { id: 'stellar', name: 'stellar', min: 3 },
  { id: 'intermediate', name: 'intermediate-mass', min: 100 },
  { id: 'supermassive', name: 'supermassive', min: 1e5 },
];
const HOLE_MAX = 4.3e6; // as heavy as Sagittarius A*, the one at the centre of our galaxy
const HAWKING_K = 0.2;  // evaporation: dM/dt = −k / M², so a hole of mass M lasts M³ / 3k seconds (only primordial ones run out)
const holeClass = M => (M >= 1e5 ? 3 : M >= 100 ? 2 : M >= 3 ? 1 : 0);
function fmtMass(M) {
  if (M < 10) return M.toFixed(1);
  if (M < 1e4) return String(Math.round(M));
  const e = Math.floor(Math.log10(M)), m = M / 10 ** e;
  return m.toFixed(1) + '×10' + String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('');
}
// everything about a hole follows from its mass. The radius is softened (real horizons grow linearly with M).
function holeProps(M) {
  const lm = Math.log10(Math.max(0.1, M)), rh = clamp(12 + 10 * lm, 8, 74), f = rh / 14;
  return {
    rh, GM: 2.2e5 * rh ** 1.6,
    drift: 130 * f ** -1.4 * clamp(1 - (lm - 3) / 2.6, 0.04, 1), every: [0.6 * f ** 1.1, 1.4 * f ** 1.1], grip: clamp(1.6 * f ** -1.3, 0.15, 1.8), kick: M < 3 ? 1.5 : M < 30 ? 0.8 : 0,
    hawk: 0.45 * f ** 1.8, // Hawking temperature ∝ 1/M: small holes are hot and radiate fast
    jets: M >= 100, jetW: 9 + Math.max(0, rh - 38) * 0.4,
    cls: holeClass(M),
  };
}
// a log-uniform mass in a class, the heavier end opening up as the game goes on
function sampleMass(level = Game.level, cls) {
  const L = level, top = 2 + Math.min(2.95, 0.6 + L / 36 * 2.6);
  if (cls === undefined) cls = weightedPick([0, 1, 2], c => [2.2, 3, L > 10 ? 2 : 0.6][c]);
  const [lo, hi] = [[0.17, 0.46], [0.5, 1.98], [2, top], [5, 6.3]][cls];
  return 10 ** rand(lo, hi);
}
const Holes = {
  list: [], waves: [], pairs: [], K: [1, 1.6, 4, 2, 0],
  clear() { this.list.length = this.waves.length = this.pairs.length = 0; Audio2.drone(false); },
  add(x, y, M = 20, o = {}) {
    M = clamp(M, 0.3, HOLE_MAX);
    const h = { x, y, vx: 0, vy: 0, tvx: 0, tvy: 0, M, L: holeProps(M), disk: [], hawk: 1, born: 0, arrive: o.arrive ?? 1.6, life: o.life ?? Infinity, tag: o.tag, kickT: 0, jetT: rand(4, 8), jetA: Math.random() * PI, jet: 0, id: uid(), fade: 0 };
    this.list.push(h); Audio2.drone(true);
    Game.toastOnce('hint-hole', 'Every black hole has a mass (in suns). Small ones are hot and evaporate; big ones are slow, pull harder and fire jets from their poles. Two that drift close spiral in and merge: fold as the gravitational wave reaches you.');
    return h;
  },
  setMass(h, M) { const c0 = h.L.cls; h.M = clamp(M, 0.05, HOLE_MAX); h.L = holeProps(h.M); return h.L.cls !== c0; },
  // somewhere far from the cat
  spawn(o = {}) { const p = Game.farPoint(460, 280); return this.add(p.x, p.y, o.M || sampleMass(Game.level, o.cls), o); },
  evaporate(tag) { for (const h of this.list) if (!tag || h.tag === tag) h.life = Math.min(h.life, 0.8); },
  K_of: (h, k) => Holes.K[k] * h.L.GM * h.born * (1 - h.fade) * (k === K_CAT && Game.mode === 'arcade' ? clamp(0.55 + 0.45 * Game.D.bspd, 0.8, 1.1) : 1),
  acc(s, x, y, k, o) { for (const h of this.list) if (h.born > 0) pullTo(o, x, y, h.x, h.y, this.K_of(h, k), (h.L.rh * 1.5) ** 2); },
  // swallowing feeds the hole (accretion): an enemy adds a little mass, a bullet much less
  sink(s, x, y, k) {
    const extra = k === K_CAT ? 6 : k === K_EN ? 4 : 0;
    for (const h of this.list) {
      if (h.born <= 0.5 || h.fade > 0.3 || wdx(h.x - x) ** 2 + wdy(h.y - y) ** 2 >= (h.L.rh + extra) ** 2) continue;
      const dm = k === K_EN ? 0.6 : k === K_EB ? 0.025 : k === K_PB ? 0.01 : 0;
      if (dm) { h.fed = (h.fed || 0) + dm; if (k === K_EN) Notes.obs('hole:' + HOLE_CLASS[h.L.cls].id, 'feed'); }
      return true;
    }
    return false;
  },
  threat(P, pad) { // for perfect folds: a wave front or a horizon right on top of a cat
    return this.waves.some(w => w.hurts && P.branches.some(b => Math.abs(Math.hypot(wdx(b.px - w.x), wdy(b.py - w.y)) - w.r) < w.w + w.speed * 0.15 + pad)) || this.list.some(h => P.branches.some(b => Math.hypot(wdx(b.px - h.x), wdy(b.py - h.y)) < h.L.rh + pad + 10));
  },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const h = L[i];
      if (h.arrive > 0) { h.arrive -= dt; if (h.arrive <= 0) { Grid.impulse(h.x, h.y, -900, 400); FX.ring(h.x, h.y, 300, 10, 0.5, PI_.orange, 4); Audio2.sfx('boom'); Notes.see('hole:' + HOLE_CLASS[h.L.cls].id); if (h.L.cls > 0) Notes.count('hole:' + HOLE_CLASS[h.L.cls].id); } continue; }
      h.born = Math.min(1, h.born + dt * 0.8);
      if (h.fed) { const grew = this.setMass(h, h.M + h.fed); h.fed = 0; if (grew) this.classUp(h); }
      // Hawking evaporation: only primordial holes lose mass fast enough to notice, and they speed up as they shrink
      if (h.M < 3 && !h.inspiral) {
        this.setMass(h, h.M - HAWKING_K / (h.M * h.M) * dt);
        if (h.M < 0.6) Notes.obs('hole:primordial', 'shrink');
        if (h.M <= 0.25) { this.pop(h, true); L.splice(i, 1); if (!L.length) Audio2.drone(false); continue; }
      }
      if ((h.life -= dt) <= 0 && !h.fade) h.fade = 0.001; // an event hole that has outstayed its welcome drifts away
      if (h.fade) { h.fade += dt / 1.2; if (h.fade >= 1) { L.splice(i, 1); if (!L.length) Audio2.drone(false); Feed.add('A black hole drifted away'); continue; } }
      if (h.inspiral) continue; // the pair moves them
      const D = h.L;
      // erratic drift: a new heading every so often, and sudden kicks; walls turn it round
      if ((h.kickT -= dt) <= 0) {
        h.kickT = rand(...D.every); const a = Math.random() * TAU, s = D.drift * rand(0.4, 1.2); h.tvx = Math.cos(a) * s; h.tvy = Math.sin(a) * s;
        if (D.kick && chance(0.3)) { h.vx += Math.cos(a) * D.drift * D.kick; h.vy += Math.sin(a) * D.drift * D.kick; }
      }
      const m = 120 + D.rh * 3, turn = D.drift * 0.3;
      if (h.x < m) h.tvx = Math.abs(h.tvx) + turn; if (h.x > W - m) h.tvx = -Math.abs(h.tvx) - turn;
      if (h.y < m) h.tvy = Math.abs(h.tvy) + turn; if (h.y > H - m) h.tvy = -Math.abs(h.tvy) - turn;
      const grip = h.recoilT > 0 ? D.grip * 0.25 : D.grip; if (h.recoilT > 0) h.recoilT -= dt;
      h.vx += (h.tvx - h.vx) * damp(grip, dt); h.vy += (h.tvy - h.vy) * damp(grip, dt); // heavy holes are slow to change course
      h.x += h.vx * dt; h.y += h.vy * dt;
      if (!World.wrap) { if (h.x < 60 || h.x > W - 60) h.vx *= -0.5; if (h.y < 60 || h.y > H - 60) h.vy *= -0.5; h.x = clamp(h.x, 60, W - 60); h.y = clamp(h.y, 60, H - 60); }
      Grid.attract(h.x, h.y, 5000 + D.GM / 6000 * h.born, 260 + D.rh * 7, dt);
      if (h.disk.length < 50 + D.rh * 2 && Math.random() < 0.9) h.disk.push({ r: rand(D.rh * 1.5, D.rh * 4.2), a: Math.random() * TAU, life: rand(1.5, 4), t: 0, c: pick(h.M < 3 ? [PI_.white, PI_.ice, PI_.cyan] : [PI_.orange, PI_.amber, PI_.white, PI_.gold]) }); // accretion disk
      for (let j = h.disk.length - 1; j >= 0; j--) { const d = h.disk[j]; d.t += dt; d.a += dt * 380 / d.r; d.r -= dt * 9; if (d.t > d.life || d.r < D.rh) h.disk.splice(j, 1); }
      if ((h.hawk -= dt) <= 0) {
        h.hawk = D.hawk * rand(0.8, 1.25);
        if (Game.mode !== 'lab' && h.fade <= 0) { const a = Math.random() * TAU; Bullets.fire(h.x + Math.cos(a) * (D.rh + 22), h.y + Math.sin(a) * (D.rh + 22), Math.cos(a) * 90, Math.sin(a) * 90, { col: h.M < 3 ? PI_.ice : PI_.white, r: 5.5, life: 7 }); }
        if (h.M < 3) Notes.obs('hole:primordial', 'hawking');
      }
      if (D.jets && h.fade <= 0) this.jets(h, dt);
    }
    this.mutual(dt);
    this.merge(dt);
    for (let i = this.waves.length - 1; i >= 0; i--) if (this.wave(this.waves[i], dt)) this.waves.splice(i, 1);
  },
  // the last of a primordial hole: one bright flash of Hawking radiation
  pop(h, evap) {
    Bullets.ring(h.x, h.y, 14, 150, { col: PI_.ice, r: 5.5, life: 5 }, Math.random() * TAU);
    FX.ring(h.x, h.y, h.L.rh, 160, 0.6, PI_.white, 5); FX.burst(h.x, h.y, 40, 380, [PI_.white, PI_.ice, PI_.cyan], { life: 0.7, size: 4 });
    Game.post.flash = [0.85, 0.95, 1, 0.35]; Audio2.sfx('pop');
    if (evap) { Feed.add('A black hole evaporated', 'ice', 'Hawking radiation'); Notes.obs('hole:primordial', 'evaporate'); Notes.count('hole:primordial'); }
  },
  classUp(h) {
    const c = HOLE_CLASS[h.L.cls];
    Feed.add('Now ' + (c.id === 'intermediate' ? 'an ' : 'a ') + c.name + ' black hole', 'gold', fmtMass(h.M) + ' M☉');
    Notes.see('hole:' + c.id); if (c.id === 'supermassive') Notes.obs('hole:supermassive', 'formed');
  },
  // relativistic jets out of both poles: a dashed warning, then two sweeping beams, stronger for heavier holes
  jets(h, dt) {
    const warn = 1.2 * Game.tele(true), sweep = 0.45 * (h.L.cls >= 3 ? 1.3 : 1);
    h.jetA += dt * 0.05;
    if (h.jet === 0 && (h.jetT -= dt) <= 0) { h.jet = 1; h.jetT = warn; Audio2.sfx('charge'); }
    else if (h.jet === 1 && (h.jetT -= dt) <= 0) { h.jet = 2; h.jetT = 1.4 + h.L.rh * 0.012; Audio2.sfx('zap'); addTrauma(0.25); Notes.obs('hole:' + HOLE_CLASS[h.L.cls].id, 'jets'); }
    else if (h.jet === 2) {
      h.jetA += dt * sweep;
      for (const s of [0, PI]) Game.beamHit(h.x, h.y, h.jetA + s, 1800, h.L.jetW, null, 'polar jet');
      if ((h.jetT -= dt) <= 0) { h.jet = 0; h.jetT = rand(6, 10) * clamp(1.4 - h.L.rh / 100, 0.7, 1.2); }
    }
  },
  // holes pull on each other: the lighter one falls toward the heavier, so neighbours curve together and merge
  mutual(dt) {
    const L = this.list;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      if (a.inspiral || b.inspiral || a.arrive > 0 || b.arrive > 0 || a.fade || b.fade) continue;
      const dx = wdx(b.x - a.x), dy = wdy(b.y - a.y), d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1;
      if (d > 1000) continue;
      const soft = (a.L.rh + b.L.rh) ** 2 * 2, k = 0.4 * a.born * b.born;
      const ga = k * b.L.GM / (d2 + soft), gb = k * a.L.GM / (d2 + soft); // each feels the other's mass
      a.vx += dx / d * ga * dt; a.vy += dy / d * ga * dt; b.vx -= dx / d * gb * dt; b.vy -= dy / d * gb * dt;
      // steer the drift toward each other too, so a hole does not just bounce back to its old heading
      a.tvx += dx / d * ga * dt * 0.5; a.tvy += dy / d * ga * dt * 0.5; b.tvx -= dx / d * gb * dt * 0.5; b.tvy -= dy / d * gb * dt * 0.5;
      if (d < 520 && !a.toldPull) { a.toldPull = b.toldPull = true; Notes.obs('hole:merger', 'attract'); }
    }
  },
  // two holes that drift close spiral in (the chirp), then merge. The result is what real mergers give:
  // a hole slightly lighter than the two together (the rest leaves as gravitational waves), a wave as strong as
  // the masses make it, and a recoil kick when the masses are unequal.
  merge(dt) {
    const L = this.list;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      if (a.inspiral || b.inspiral || a.born < 1 || b.born < 1 || a.fade || b.fade || Math.hypot(a.x - b.x, a.y - b.y) > (a.L.rh + b.L.rh) * 3.4) continue;
      const pr = { a, b, t: 0, dur: 2.6, ang: Math.atan2(b.y - a.y, b.x - a.x), r0: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      a.inspiral = b.inspiral = pr; this.pairs.push(pr);
      const big = Math.max(a.M, b.M), small = Math.min(a.M, b.M);
      Game.banner('INSPIRAL · ' + fmtMass(big) + ' + ' + fmtMass(small) + ' M☉', small / big > 0.08 ? 'Two black holes are about to merge. A gravitational wave is coming: fold as it reaches you.' : 'A small black hole is falling into a much bigger one. The wave will be weak.', 2.2);
      Audio2.sfx('chirp'); Notes.obs('hole:merger', 'inspiral');
    }
    for (let i = this.pairs.length - 1; i >= 0; i--) {
      const p = this.pairs[i], f = (p.t += dt) / p.dur, r = p.r0 / 2 * (1 - f * f), wa = p.a.M / (p.a.M + p.b.M);
      p.ang += dt * (2 + 14 * f * f);
      // both orbit the centre of mass: the heavier one barely moves
      p.a.x = p.cx + Math.cos(p.ang) * r * 2 * (1 - wa); p.a.y = p.cy + Math.sin(p.ang) * r * 2 * (1 - wa);
      p.b.x = p.cx - Math.cos(p.ang) * r * 2 * wa; p.b.y = p.cy - Math.sin(p.ang) * r * 2 * wa;
      if (Math.random() < 0.3 + f) Grid.impulse(p.cx, p.cy, 200 + 900 * f, 300 + 300 * f);
      if (f < 1) continue;
      this.pairs.splice(i, 1);
      this.coalesce(p);
    }
  },
  coalesce(p) {
    const L = this.list, m1 = Math.max(p.a.M, p.b.M), m2 = Math.min(p.a.M, p.b.M), Mt = m1 + m2, nu = m1 * m2 / (Mt * Mt);
    const frac = 0.0572 * nu + 0.498 * nu * nu;          // fraction of the mass radiated as gravitational waves (≈4.8% for equal masses)
    const Mf = Math.min(HOLE_MAX, Mt * (1 - frac)), Erad = Mt * frac;
    const Mc = (m1 * m2) ** 0.6 / Mt ** 0.2;               // chirp mass: what sets how loud the wave is
    const vk = 12000 * nu * nu * Math.sqrt(Math.max(0, 1 - 4 * nu)) * (1 - 0.93 * nu); // recoil, km/s (zero for equal masses, ≈175 at most)
    const c0 = Math.max(p.a.L.cls, p.b.L.cls), life = Math.max(p.a.life, p.b.life), tag = p.a.tag;
    L.splice(L.indexOf(p.a), 1); L.splice(L.indexOf(p.b), 1);
    // the centre of mass, where the merged hole forms
    const cx = (p.a.x * p.a.M + p.b.x * p.b.M) / Mt, cy = (p.a.y * p.a.M + p.b.y * p.b.M) / Mt;
    const h = this.add(cx, cy, Mf, { arrive: 0, life, tag }); h.born = 1;
    if (vk > 8) { const a = Math.random() * TAU, v = 560 * vk / 175; h.vx = Math.cos(a) * v; h.vy = Math.sin(a) * v; h.tvx = h.vx * 0.2; h.tvy = h.vy * 0.2; h.recoilT = 1.6; h.kickT = 1.6; FX.text(cx, cy + 70, 'recoil ' + Math.round(vk) + ' km/s', PI_.ice, { size: 13, font: 'serif', life: 1.6 }); Notes.obs('hole:merger', 'recoil'); }
    const s = clamp(Math.log10(Mc) / 4, 0.04, 1.2), loud = s >= 0.2;
    this.waves.push({ x: cx, y: cy, r: 30, speed: 640, w: 12 + 22 * s, s, hurts: loud, dmg: 6 + 26 * s, hit: new Set(), shook: false });
    Game.post.ripples.push({ x: cx, y: cy, r: 0, max: 2600, t: 0, life: 2 + 2 * s, a: 0.008 + 0.025 * s });
    Grid.impulse(cx, cy, 600 + 2000 * s, 600 + 800 * s); addTrauma(0.2 + 0.6 * Math.min(1, s)); if (loud) Game.post.flash = [0.8, 0.9, 1, 0.2 + 0.3 * Math.min(1, s)];
    FX.text(cx, cy - 70, 'GW' + new Date().toISOString().slice(2, 10).replace(/-/g, ''), PI_.white, { size: 14 + 8 * Math.min(1, s), life: 2, vy: -20 });
    Audio2.sfx('merger'); Input.rumble(0.3 + 0.5 * Math.min(1, s), 400);
    Feed.add(fmtMass(m1) + ' + ' + fmtMass(m2) + ' → ' + fmtMass(Mf) + ' M☉', 'ice', fmtMass(Erad) + ' M☉ radiated');
    Game.stats.mergers = (Game.stats.mergers || 0) + 1; Ach.unlock('merger');
    Notes.obs('hole:merger', 'merger'); Notes.obs('hole:merger', 'massloss'); if (!loud) Notes.obs('hole:merger', 'quiet'); Notes.count('hole:merger');
    if (h.L.cls > c0) { const c = HOLE_CLASS[h.L.cls]; Game.banner(c.name.toUpperCase() + ' BLACK HOLE', 'Two lighter holes merged into a ' + c.name + ' one: ' + fmtMass(Mf) + ' suns.', 2.2); Notes.see('hole:' + c.id); if (c.id === 'supermassive') Notes.obs('hole:supermassive', 'formed'); }
  },
  // a gravitational wave: an expanding ring that shoves and hurts enemies, erases bullets, and measures cats it crosses (if it is loud enough)
  wave(w, dt) {
    w.r += w.speed * dt;
    const inBand = (x, y) => Math.abs(Math.hypot(wdx(x - w.x), wdy(y - w.y)) - w.r) < w.w;
    for (const e of Game.enemies) {
      if (e.dead || e.boss || w.hit.has(e) || !inBand(e.x, e.y)) continue;
      w.hit.add(e); const a = Math.atan2(e.y - w.y, e.x - w.x); e.vx += Math.cos(a) * 500 * w.s / e.mass; e.vy += Math.sin(a) * 500 * w.s / e.mass; if (w.hurts) Game.damageEnemy(e, w.dmg, e.x, e.y);
    }
    for (let i = EB.n - 1; i >= 0; i--) if (inBand(EB.x[i], EB.y[i]) && Math.random() < 0.6 * Math.min(1, w.s * 2)) { FX.spawn(EB.x[i], EB.y[i], 0, 0, 0.3, 4, EB.col[i]); EB.kill(i); }
    if (w.hurts && !w.hitCat && !Player.dead) {
      const set = Player.branches.filter(b => b.grace <= 0 && inBand(b.px, b.py));
      if (set.length) { w.hitCat = true; if (Player.protected()) { FX.text(Player.x, Player.y - 50, 'surfed the wave', PI_.cyan, { size: 15, font: 'serif' }); Ach.unlock('ripple'); Notes.obs('hole:merger', 'surf'); } else Player.measureHit(set, 'gravitational wave'); }
    }
    return w.r > Math.hypot(W, H) + 200;
  },
  drawUnder(ctx) {
    const tilt = 0.28;
    for (const w of this.waves) { // the wave front
      ctx.globalCompositeOperation = 'lighter';
      const k = clamp(0.25 + w.s, 0.25, 1);
      for (const [d, a, lw] of [[0, 0.75, 4], [-w.w, 0.25, 2], [w.w, 0.25, 2]]) { ctx.strokeStyle = rgba(COL.ice, a * k); ctx.lineWidth = lw * (0.5 + 0.5 * k); ring(ctx, ix(w.x), iy(w.y), Math.max(1, w.r + d)); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    for (const p of this.pairs) { const f = p.t / p.dur; for (let k = 0; k < 3; k++) Tele.ring(ctx, ix(p.cx), iy(p.cy), ((Game.rt * 300 + k * 120) % 360) + 40, COL.ice, 0.3 + 0.4 * f, [6, 10]); txt(ctx, 'MERGER IN ' + Math.max(0, p.dur - p.t).toFixed(1), ix(p.cx), iy(p.cy) - 90, fontMono(13, 700), '#cfe9ff', 'center', 2); }
    for (const h of this.list) {
      const x = ix(h.x), y = iy(h.y), R = h.L.rh, hot = h.M < 3;
      if (h.arrive > 0) { const f = 1 - h.arrive / 1.6; Tele.ring(ctx, x, y, 260 * (1 - f) + R, COL.orange, 0.3 + 0.5 * f); txt(ctx, 'SOMETHING HEAVY', x, y - 40, fontMono(11, 700), 'rgba(255,170,90,.8)', 'center', 2); continue; }
      const k = h.born * (1 - h.fade), s = R / 30;
      if (h.jet) for (const sd of [0, PI]) Tele.beam(ctx, x, y, h.jetA + sd, 1800, h.L.jetW, [170, 210, 255], h.jet, Game.rt);
      halo(ctx, hot ? PI_.ice : PI_.orange, x, y, 150 * s, (hot ? 0.6 : 0.45) * k);
      if (hot) halo(ctx, PI_.white, x, y, 70 * s, clamp(0.9 / h.M, 0.2, 1) * k); // Hawking glow: hotter as it shrinks
      const disk = front => { for (const d of h.disk) { const sn = Math.sin(d.a); if ((sn > 0) !== front) continue; ctx.globalAlpha = Math.min(1, d.t * 3) * (1 - d.t / d.life) * k; ctx.drawImage(glowSprite(d.c, 32), x + Math.cos(d.a) * d.r - 5, y + sn * d.r * tilt - 5, 10, 10); } ctx.globalAlpha = 1; };
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hot ? 'rgba(200,235,255,.55)' : 'rgba(255,190,110,.55)'; ctx.lineWidth = 5 * k * s; ctx.beginPath(); ctx.ellipse(x, y - 4 * s, R * 2.1 * k, R * 1.55 * k, 0, PI, TAU); ctx.stroke(); // far side, lensed over the top
      disk(false);
      ctx.globalCompositeOperation = 'source-over'; dot(ctx, x, y, R * 1.1 * k, '#000'); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,236,200,.95)'; ctx.lineWidth = 1.8; ring(ctx, x, y, R * 1.18 * k); ctx.stroke();
      ctx.strokeStyle = hot ? 'rgba(150,220,255,.7)' : 'rgba(255,160,70,.7)'; ctx.lineWidth = 7 * k * s; ctx.beginPath(); ctx.ellipse(x, y, R * 3.6 * k, R * 3.6 * tilt * k, 0, 0, PI); ctx.stroke();
      disk(true);
      ctx.globalCompositeOperation = 'source-over';
    }
  },
  // the mass under each hole, on the HUD so the lensing never bends it
  labels(c) {
    for (const h of this.list) {
      const k = h.born * (1 - h.fade); if (h.arrive > 0 || k < 0.4) continue;
      const [x, y] = worldToCss(ix(h.x), iy(h.y)), dy = h.L.rh * 1.9 * cam.zoom / R.rs + 16;
      if (x < -60 || x > R.cssW + 60 || y < -60 || y > R.cssH + 60) continue;
      c.globalAlpha = 0.7 * k; txt(c, fmtMass(h.M) + ' M☉', x, y + dy, fontMono(10, 600), h.M < 3 ? '#cfe9ff' : '#ffd9a8', 'center', 1); c.globalAlpha = 1;
    }
  },
  post(P) { for (const h of this.list) if (h.born > 0) { const k = h.born * (1 - h.fade), [sx, sy] = worldToScene(ix(h.x), iy(h.y)); P.lenses.push({ x: sx, y: sy, e: 64 * (h.L.rh / 30) * cam.zoom * k, hz: h.L.rh * 1.05 * cam.zoom * k }); } },
};
