// ---------- elites: between an enemy and a boss. A health bar, a signature move, a guaranteed power-up ----------
const eliteInit = (e, line) => { e.elite = true; Game.say(e, line, 2.4); };
Object.assign(ET, {
  professor: {
    r: 30, hp: 220, score: 2500, col: 'chalk', mass: 8, min: 6, iconR: 34, info: ['Tenured Professor', 'Takes slow, enormous measurements (the big dashed ring) and summons graduate students to do the rest. Throws papers.'],
    init(e) { eliteInit(e, pick(['Office hours are over.', 'You will be my next paper.', 'I have tenure. You have nine lives.'])); e.state = 'walk'; e.st = 2; e.R = 380; e.summon = 4; e.papers = 2.5; e.face = 1; },
    update(e, dt) {
      const [ux, , d] = toCat(e); e.face = ux >= 0 ? 1 : -1; e.st -= dt;
      if (e.state === 'walk') {
        steer(e, Game.tx, Game.ty, 55 * espd(e), 1.5, dt); moveEnemy(e, dt);
        if (d < 360 && Player.n > 1 && e.st <= 0) { e.state = 'charge'; e.st = e.st0 = 1.5 * Game.tele(); Audio2.sfx('charge'); Game.say(e, 'Hold still for the camera.', 1.4); }
        if ((e.summon -= dt) <= 0) {
          e.summon = 9 / Math.sqrt(Game.fireRateMul);
          if (Game.enemies.filter(o => o.type === 'physicist' && !o.dead).length < 4) { for (const s of [-1, 1]) Game.queueSpawn('physicist', e.x + s * 60, e.y + 30); Game.say(e, 'Students! Measure that cat.', 1.6); Notes.obs('enemy:professor', 'summon'); }
        }
        if ((e.papers -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.papers = rand(2.6, 3.4) / Game.fireRateMul; Bullets.aimAt(e.x, e.y, Game.tx, Game.ty, 210, { col: PI_.chalk, r: 8, kind: 3 }, 5, 0.7); Audio2.sfx('eshot'); }
      } else {
        e.vx *= 0.85; e.vy *= 0.85; moveEnemy(e, dt);
        if (e.st > 0) return;
        Player.measureRegion(b => Math.hypot(wdx(b.px - e.x), wdy(b.py - e.y)) < e.R, e, 'NEAR THE PROFESSOR'); Notes.obs('enemy:professor', 'measure');
        FX.ring(e.x, e.y, 10, e.R, 0.55, PI_.white, 4); addTrauma(0.2);
        e.state = 'walk'; e.st = 5;
      }
    },
    draw(e, ctx, x, y) {
      ctx.save(); ctx.translate(x, y); ctx.scale(2.1, 2.1); ET.physicist.draw(e, ctx, 0, 0);
      ctx.fillStyle = '#1e1838'; ctx.fillRect(-10 * e.face - 2, -27, 16, 4); ctx.fillRect(-3, -31, 6, 4); ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(5, -27); ctx.lineTo(9, -18); ctx.stroke(); // mortarboard
      ctx.restore();
      if (e.state === 'charge') Tele.ring(ctx, x, y, e.R * (0.5 + 0.5 * (1 - e.st / e.st0)), COL.white, 0.3 + 0.55 * (1 - e.st / e.st0), [10, 8], 2.5);
      else Tele.ring(ctx, x, y, e.R, COL.white, 0.08, [4, 14]);
    },
  },
  neutronstar: {
    r: 34, hp: 280, score: 3000, col: 'ice', mass: 30, min: 13, iconR: 66, info: ['Neutron Star', 'Its gravity drags you and your shots in. Sweeps two pulsar beams (dashed warning first) and pulses rings of bullets.'],
    init(e) { eliteInit(e, '…'); e.beamA = Math.random() * TAU; e.cycle = 0; e.pulse = 2; }, move: { chase: 35, acc: 0.6 },
    tick(e, dt) {
      e.beamA += 0.7 * dt; const warn = 1.1 * Game.tele(); e.cycle = (e.cycle + dt) % (warn + 4);
      e.beamState = e.cycle < warn ? 1 : e.cycle < warn + 2.2 ? 2 : 0;
      if (e.beamState === 2) { for (const s of [0, PI]) Game.beamHit(e.x, e.y, e.beamA + s, 1500, 8, e, 'pulsar'); Notes.obs('enemy:neutronstar', 'beam'); }
      if ((e.pulse -= dt) <= 0) { e.pulse = 2.6 / Game.fireRateMul; Bullets.ring(e.x, e.y, Math.round(18 / Game.D.gap), 170, { col: PI_.ice, r: 6.5 }, Math.random() * TAU); FX.ring(e.x, e.y, 20, 120, 0.3, PI_.ice, 3); Audio2.sfx('eshot'); }
      Grid.attract(e.x, e.y, 6000, 420, dt);
    },
    field: { acc(s, x, y, k, o) { if (k === K_CAT || k === K_PB) pullTo(o, x, y, s.x, s.y, k === K_CAT ? 2.4e7 : 6e7, 2500, 760); } },
    lens: 40,
    draw(e, ctx, x, y) {
      if (e.beamState) for (const s of [0, PI]) Tele.beam(ctx, x, y, e.beamA + s, 1500, 8, COL.ice, e.beamState, e.t);
      Tele.ring(ctx, x, y, 760, COL.ice, 0.1, [3, 12]);
      halo(ctx, PI_.ice, x, y, 160, 0.6); dot(ctx, x, y, 26, '#e8f6ff'); dot(ctx, x, y, 13, '#fff');
      ctx.strokeStyle = rgba(COL.ice, 0.4); ctx.lineWidth = 1.4; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 66, y, 66, 34, 0, 0, TAU); ctx.stroke(); }
    },
  },
  quasar: {
    r: 32, hp: 260, score: 3000, col: 'orange', mass: 20, min: 18, iconR: 74, info: ['Quasar', 'A black-hole fragment with a blazing disk. Keeps its distance and fires relativistic jets from both poles after a dashed warning. The jets sweep.'],
    init(e) { eliteInit(e, '…'); e.jetA = Math.random() * TAU; e.jet = 0; e.jt = 2; e.hawk = 1; }, move: { keep: [520, 380], speed: 70, strafe: 0.4, acc: 1 },
    tick(e, dt) {
      const warn = 1.2 * Game.tele();
      if (e.jet === 0) { e.jetA = Math.atan2(Game.ty - e.y, Game.tx - e.x) + PI / 2 + rand(-0.6, 0.6); if ((e.jt -= dt) <= 0) { e.jet = 1; e.jt = warn; Audio2.sfx('charge'); } }
      else if (e.jet === 1) { if ((e.jt -= dt) <= 0) { e.jet = 2; e.jt = 2.4; Audio2.sfx('zap'); addTrauma(0.2); Notes.obs('enemy:quasar', 'jets'); } }
      else { e.jetA += dt * 0.55 * (e.orb || 1); for (const s of [0, PI]) Game.beamHit(e.x, e.y, e.jetA + s, 1600, 12, e, 'quasar jet'); if ((e.jt -= dt) <= 0) { e.jet = 0; e.jt = rand(2.2, 3.4) / Game.fireRateMul; } }
      if ((e.hawk -= dt) <= 0) { e.hawk = 0.9 / Game.fireRateMul; Bullets.aimAt(e.x, e.y, Game.tx, Game.ty, 240, { col: PI_.amber, r: 6.5 }, 3, 0.4); }
    },
    draw(e, ctx, x, y) {
      if (e.jet) for (const s of [0, PI]) Tele.beam(ctx, x, y, e.jetA + s, 1600, 12, [255, 200, 140], e.jet, e.t);
      halo(ctx, PI_.orange, x, y, 200, 0.55);
      ctx.strokeStyle = 'rgba(255,170,80,.85)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(x, y, 66, 18, e.jetA + PI / 2, 0, TAU); ctx.stroke();
      dot(ctx, x, y, 22, '#000'); ctx.strokeStyle = '#fff1d6'; ctx.lineWidth = 2.5; ring(ctx, x, y, 23); ctx.stroke();
    },
  },
  lead: {
    r: 36, hp: 300, score: 3200, col: 'violet', mass: 25, gridR: 110, min: 9, iconR: 94, info: ['Lead Nucleus', 'Eighty-two protons and a cloud of orbiting electrons that catch your shots. Knock the shell loose, then hit the nucleus. The shell grows back.'],
    init(e) { eliteInit(e, '…'); e.sh = Array(8).fill(4); e.a = 0; e.regen = 4; e.burst = 2; e.bn = 0; }, move: { keep: [420, 300], speed: 60, strafe: 0.5, acc: 1 },
    tick(e, dt) {
      e.a += dt * 1.2;
      if ((e.regen -= dt) <= 0) { e.regen = 4; const k = e.sh.indexOf(0); if (k >= 0) { e.sh[k] = 4; FX.text(e.x, e.y - 50, 'e⁻ captured', PI_.violet, { size: 11, font: 'serif', life: 0.6 }); } }
      if ((e.burst -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.bn++; e.burst = e.bn % 3 ? 0.22 : rand(2, 2.8) / Game.fireRateMul; Bullets.aimAt(e.x, e.y, Game.tx, Game.ty, 200, { col: PI_.violet, r: 11 }); Audio2.sfx('bossShot'); }
    },
    orbit(e, k) { const a = e.a * (k % 2 ? -1 : 1) + k * TAU / 8, r = k % 2 ? 88 : 66; return [Math.cos(a) * r, Math.sin(a) * r]; },
    shield(e, x, y) {
      for (let k = 0; k < 8; k++) {
        if (e.sh[k] <= 0) continue;
        const [ox, oy] = this.orbit(e, k); if (wdx(x - e.x - ox) ** 2 + wdy(y - e.y - oy) ** 2 >= 324) continue;
        FX.sparks(e.x + ox, e.y + oy, 3, 160, PI_.amber, 0, TAU, 0.25);
        if (--e.sh[k] <= 0) { FX.text(e.x + ox, e.y + oy - 14, 'ionised', PI_.amber, { size: 11, font: 'serif', life: 0.7 }); Audio2.sfx('pop'); Notes.obs('enemy:lead', 'ionise'); }
        return true;
      }
      return false;
    },
    draw(e, ctx, x, y) {
      for (const r of [66, 88]) { ctx.strokeStyle = rgba(COL.violet, 0.3); ctx.lineWidth = 1.2; ring(ctx, x, y, r); ctx.stroke(); }
      for (let k = 0; k < 12; k++) { const a = k * 2.4 + e.t * 0.3, rr = k ? 9 + (k % 3) * 7 : 0; dot(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 8.5, k % 2 ? '#cfcbe6' : PAL_CSS[PI_.coral]); }
      for (let k = 0; k < 8; k++) { if (e.sh[k] <= 0) continue; const [ox, oy] = this.orbit(e, k); dot(ctx, x + ox, y + oy, 7.5, PAL_CSS[PI_.amber]); dot(ctx, x + ox, y + oy, 2.8, '#fff'); }
    },
  },
  cooper: {
    r: 20, hp: 200, score: 3000, col: 'cyan', mass: 15, gridR: 100, min: 22, iconR: 100, info: ['Superconductor', 'A Cooper pair: two electrons bound together. A shot on one half does nothing unless the other half is hit within a third of a second. Spread your cats to hit both. Sometimes it expels your shots (the Meissner effect).'],
    init(e) { eliteInit(e, '…'); e.hitT = [-9, -9]; e.spin = 0; e.fire = 1.5; e.side = 0; e.meiss = 6; e.mT = 0; }, move: { chase: 60, acc: 0.8 },
    half(e, k) { const a = e.spin + k * PI; return [e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80]; },
    tick(e, dt) {
      e.spin += dt * 1.1;
      if ((e.fire -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.fire = 0.75 / Game.fireRateMul; e.side ^= 1; const [hx, hy] = this.half(e, e.side); Bullets.aimAt(hx, hy, Game.tx, Game.ty, 230, { col: e.side ? PI_.cyan : PI_.ice, r: 7 }, 2, 0.25); }
      if ((e.meiss -= dt) <= 0) { e.mT = 2.2; e.meiss = rand(7, 9); Game.say(e, 'Meissner effect.', 1.2); Notes.obs('enemy:cooper', 'meissner'); }
      e.mT = Math.max(0, e.mT - dt);
    },
    field: { acc(s, x, y, k, o) { if (k !== K_PB || s.mT <= 0) return; const dx = wdx(x - s.x), dy = wdy(y - s.y), d = Math.hypot(dx, dy); if (d < 190) { o[0] += dx / d * 26000; o[1] += dy / d * 26000; } } },
    shield(e, x, y, dmg) {
      for (let k = 0; k < 2; k++) {
        const [hx, hy] = this.half(e, k); if (wdx(x - hx) ** 2 + wdy(y - hy) ** 2 >= 30 * 30) continue;
        e.hitT[k] = Game.t;
        if (Game.t - e.hitT[1 - k] < 0.35) { Game.damageEnemy(e, dmg * 2, x, y); Notes.obs('enemy:cooper', 'pair'); if (Math.random() < 0.15) FX.text(x, y - 14, 'pair broken', PI_.cyan, { size: 11, font: 'serif', life: 0.5 }); }
        else { FX.sparks(x, y, 2, 140, PI_.cyan, 0, TAU, 0.2); if (Math.random() < 0.08) FX.text(x, y - 14, 'zero resistance', PI_.dim, { size: 10, font: 'serif', life: 0.5 }); }
        return true;
      }
      return false;
    },
    draw(e, ctx, x, y) {
      const [ax, ay] = this.half(e, 0), [bx, by] = this.half(e, 1), ox = x - e.x, oy = y - e.y, now = Game.t;
      ctx.strokeStyle = rgba(COL.cyan, 0.6); ctx.lineWidth = 2; gluon(ctx, ax + ox, ay + oy, bx - ax, by - ay, e.t);
      for (const [k, hx, hy] of [[0, ax, ay], [1, bx, by]]) { const lit = now - e.hitT[k] < 0.35; halo(ctx, PI_.cyan, hx + ox, hy + oy, 72, lit ? 0.9 : 0.35); dot(ctx, hx + ox, hy + oy, 19, lit ? '#fff' : PAL_CSS[PI_.cyan]); txt(ctx, k ? '↓' : '↑', hx + ox, hy + oy + 7, fontMono(18, 700), '#0c0a18', 'center'); }
      if (e.mT > 0) Tele.ring(ctx, x, y, 190, COL.cyan, 0.6, [4, 6], 2);
    },
  },
});
const ELITE_IDS = ['professor', 'lead', 'neutronstar', 'quasar', 'cooper'];
// HP bars and names above elites, drawn on the HUD so lensing and shake never bend them
function drawEliteBars(c) {
  for (const e of Game.enemies) {
    if (!e.elite || e.dead) continue;
    const [x, y] = worldToCss(ix(e.x), iy(e.y)), lift = (e.gridR || e.r) * cam.zoom / R.rs + 22, w = 110, by = y - lift;
    if (x < -80 || x > R.cssW + 80 || by < -40 || by > R.cssH + 40) continue;
    c.fillStyle = 'rgba(12,10,24,.8)'; c.fillRect(x - w / 2 - 2, by - 2, w + 4, 9);
    c.fillStyle = PAL_CSS[PI_.gold]; c.fillRect(x - w / 2, by, w * clamp(e.hp / e.maxHp, 0, 1), 5);
    txt(c, e.def.info[0].toUpperCase(), x, by - 7, fontMono(10.5, 700), '#ffcf4a', 'center', 1.2);
  }
}
