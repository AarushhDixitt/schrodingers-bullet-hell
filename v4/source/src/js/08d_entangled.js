// ---------- entangled matter: pairs whose fates are linked, the lab assistant, and three more elites ----------
// e.link joins two enemies. The kind of link (def.linkKind) decides what it does:
//   share: damage to one is felt by both, and they die together   anchor: kill the Anchor and its partner collapses
//   mirror: a hit on one freezes the other                         bell: they fire at the same instant, in mirror image
// In the game, killing one partner really does destroy the other. Real entanglement does not work like that
// (it correlates measurement outcomes; it never carries an influence), and the Lab Notes say so.
const LINK_COL = { share: 'gold', anchor: 'violet', mirror: 'cyan', bell: 'pink' };
function linkPair(a, b) { if (a && b) { a.link = b; b.link = a; } return [a, b]; }
// every link is drawn as a thin double helix, so a partner is always findable
function drawLinks(ctx) {
  ctx.globalCompositeOperation = 'lighter';
  for (const e of Game.enemies) {
    const p = e.link; if (!p || p.dead || e.dead || e.id > p.id || e.spawning || p.spawning) continue;
    const kind = e.def.linkKind || p.def.linkKind, col = COL[LINK_COL[kind] || 'gold'];
    const x0 = ix(e.x), y0 = iy(e.y), dx = wdx(p.x - e.x), dy = wdy(p.y - e.y), d = Math.hypot(dx, dy) || 1, n = Math.max(10, Math.min(120, Math.floor(d / 12))), fl = Math.max(e.linkFlash || 0, p.linkFlash || 0);
    for (const s of [1, -1]) {
      ctx.strokeStyle = rgba(fl > 0 ? COL.white : col, Math.min(1, (0.3 + fl * 1.5) * (s > 0 ? 1 : 0.55))); ctx.lineWidth = s > 0 ? 2 : 1.3; ctx.beginPath();
      for (let k = 0; k <= n; k++) { const f = k / n, w = s * Math.sin(f * d / 24 - Game.t * 6) * 6 * Math.sqrt(Math.sin(f * PI)); ctx.lineTo(x0 + dx * f - dy / d * w, y0 + dy * f + dx / d * w); }
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
// special spawns (a group that arrives together)
const SPECIAL = {
  '@triad': (x, y) => spawnTriad(x, y),
  '@twins': (x, y) => { const a = Math.random() * TAU, c = Math.cos(a) * 55, s = Math.sin(a) * 55; linkPair(Game.addEnemy('twin', x - c, y - s, { side: 1 }), Game.addEnemy('twin', x + c, y + s, { side: -1 })); },
  '@shade': (x, y) => { const sh = Game.addEnemy('shade', x, y), p = Game.farPoint(520, 120); linkPair(sh, Game.addEnemy('anchor', p.x, p.y)); },
  '@mirror': (x, y) => { const M = { x, y, vx: 0, vy: 0, a: Math.random() * TAU }; linkPair(Game.addEnemy('mirror', x + 150, y, { M, slot: 0 }), Game.addEnemy('mirror', x - 150, y, { M, slot: 1 })); },
  '@bell': (x, y) => { const a = Math.atan2(y - Game.ty, x - Game.tx), R = 420, mk = (k) => Game.addEnemy('bellpair', Game.tx + Math.cos(a + k * PI) * R, Game.ty + Math.sin(a + k * PI) * R, { slot: k, ang: a + k * PI }); linkPair(mk(0), mk(1)); },
};
// one shared pattern for a Bell pair: the setting (fan or ring) and the twist are the same for both, mirrored
function bellFire(e, set, twist) {
  const sp = 210, b = { col: PI_.pink, r: 6.5 };
  if (set === 'fan') { const a = Math.atan2(wdy(Game.ty - e.y), wdx(Game.tx - e.x)) + twist * 0.35; for (let k = -2; k <= 2; k++) Bullets.fire(e.x, e.y, Math.cos(a + k * 0.16) * sp, Math.sin(a + k * 0.16) * sp, b); }
  else Bullets.ring(e.x, e.y, Math.round(12 / Game.D.gap), sp * 0.8, { ...b, col: PI_.magenta }, twist * 2);
  e.glow = 0.3; FX.ring(e.x, e.y, 8, 40, 0.25, PI_.pink, 2);
}
const ASSIST_HELLO = ['Right behind you, Professor.', 'Pipette ready.', 'I brought the samples.', 'Hold still, this might sting.'];
const ASSIST_BYE = ['Not my experiment!', 'I quit!', 'This is above my pay grade.', 'I was never here.'];

Object.assign(ET, {
  twin: {
    r: 13, hp: 9, score: 220, col: 'gold', mass: 1.2, linkKind: 'share', info: ['Bound pair', 'Two particles joined by a shimmering thread. Damage to either is felt by both, and they die together.', 'shared health'],
    init(e, o) { e.spd = rand(95, 115); e.side = o.side || 1; e.fire = rand(1.4, 2.8); },
    update(e, dt) {
      steer(e, Game.tx, Game.ty, e.spd * espd(e), 1.8, dt);
      const p = e.link;
      if (p && !p.dead) { const dx = wdx(e.x - p.x), dy = wdy(e.y - p.y), d = Math.hypot(dx, dy) || 1, k = (110 - d) * 2.4; e.vx += dx / d * k * dt; e.vy += dy / d * k * dt; }
      moveEnemy(e, dt);
      if ((e.fire -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.fire = rand(2.2, 3) / Game.fireRateMul; Bullets.aimAt(e.x, e.y, Game.tx, Game.ty, 220, { col: PI_.gold, r: 6.5 }); Audio2.sfx('eshot'); }
    },
    draw(e, ctx, x, y) {
      const c = PAL_CSS[e.col], s = e.side || 1;
      ctx.strokeStyle = c; ctx.lineWidth = 2.4; ring(ctx, x, y, 12); ctx.stroke();
      ctx.globalAlpha *= 0.22; ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha /= 0.22;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(e.t * 3) * 0.25); // its spin: one up, one down (a singlet)
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 7 * s); ctx.lineTo(0, -7 * s); ctx.moveTo(-4, -3 * s); ctx.lineTo(0, -7 * s); ctx.lineTo(4, -3 * s); ctx.stroke();
      ctx.restore();
    },
  },
  shade: {
    r: 30, hp: 99, score: 600, col: 'violet', mass: 6, linkKind: 'anchor', gridR: 34, info: ['Shade', 'Large, relentless, and impossible to hurt. A thread runs from it to a small, fast Anchor that keeps its distance. Destroy the Anchor and the Shade goes with it.', 'cannot be hurt'],
    init(e) { e.pulse = rand(2, 3); }, move: { chase: 62, acc: 0.8 },
    armour(e, dmg, x, y) { FX.sparks(x, y, 2, 120, PI_.violet, 0, TAU, 0.2); if (Math.random() < 0.05) FX.text(x, y - 16, 'unharmed', PI_.dim, { size: 11, font: 'serif', life: 0.6 }); Notes.obs('enemy:shade', 'immune'); return 0; },
    tick(e, dt) { if ((e.pulse -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.pulse = rand(2.6, 3.4) / Game.fireRateMul; Bullets.ring(e.x, e.y, Math.round(10 / Game.D.gap), 150, { col: PI_.violet, r: 7 }, Math.random() * TAU); Audio2.sfx('eshot'); } },
    draw(e, ctx, x, y) {
      halo(ctx, PI_.violet, x, y, 90, 0.4);
      dot(ctx, x, y, 27, '#140c26');
      ctx.strokeStyle = rgba(COL.violet, 0.85); ctx.lineWidth = 2.5; ring(ctx, x, y, 28); ctx.stroke();
      ctx.lineWidth = 2; for (let k = 0; k < 6; k++) { const a = e.t * 0.9 + k * TAU / 6; ctx.strokeStyle = rgba(COL.violet, 0.5); ctx.beginPath(); ctx.arc(x, y, 34 + 4 * Math.sin(e.t * 3 + k), a, a + 0.6); ctx.stroke(); }
      const [ux, uy] = toCat(e); for (const s of [-1, 1]) dot(ctx, x + ux * 9 - uy * 8 * s, y + uy * 9 + ux * 8 * s, 3.4, '#e6d8ff');
    },
  },
  anchor: {
    r: 11, hp: 7, score: 400, col: 'gold', mass: 0.8, linkKind: 'anchor', arrow: 'gold', info: ['Anchor', 'Small, fast and harmless on its own: it keeps its distance and never fires. Its thread leads to something big that cannot be hurt while the Anchor lives.', '7 hits'],
    move: { keep: [520, 380], speed: 190, strafe: 0.8, acc: 2.2 },
    init(e, o) { if (o.tough) { e.hp = e.maxHp = Math.ceil(e.maxHp * 3.4); e.tough = true; } },
    draw(e, ctx, x, y) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(e.t * 2.2);
      ctx.fillStyle = PAL_CSS[e.col]; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 0); ctx.lineTo(0, 12); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = rgba(COL.gold, 0.4 + 0.3 * Math.sin(e.t * 6)); ctx.lineWidth = 1.5; ring(ctx, x, y, e.tough ? 20 : 16); ctx.stroke();
      if (e.tough) { ctx.strokeStyle = rgba(COL.violet, 0.6); ring(ctx, x, y, 24); ctx.stroke(); }
    },
  },
  mirror: {
    r: 14, hp: 7, score: 300, col: 'cyan', mass: 1, linkKind: 'mirror', info: ['Mirror pair', 'Two particles that always sit exactly opposite each other around a drifting centre: a perfectly anti-correlated pair. Hit one and its partner freezes for a moment.', '7 hits each'],
    init(e, o) { e.M = o.M; e.slot = o.slot || 0; e.fire = rand(1.2, 2) + e.slot * 0.9; },
    update(e, dt) {
      if (e.stunT > 0) { e.stunT -= dt; e.vx = e.vy = 0; return; }
      const M = e.M, p = e.link;
      if (!M || !p || p.dead) { // decorrelated: alone, it is just a fast chaser
        if (!e.free) { e.free = true; FX.text(e.x, e.y - 22, 'decorrelated', PI_.cyan, { size: 12, font: 'serif' }); Notes.obs('enemy:mirror', 'alone'); }
        MOVES.chase(e, { chase: 165, acc: 2 }, dt);
      } else {
        if (e.slot === 0 || p.stunT > 0) { steer(M, Game.tx, Game.ty, 72 * espd(e), 1.2, dt); M.x = clamp(M.x + M.vx * dt, 160, W - 160); M.y = clamp(M.y + M.vy * dt, 160, H - 160); M.a += dt * 1.1; }
        const a = M.a + e.slot * PI, nx = M.x + Math.cos(a) * 150, ny = M.y + Math.sin(a) * 150, k = damp(10, dt), ox = e.x, oy = e.y;
        e.x += (nx - e.x) * k; e.y += (ny - e.y) * k; e.vx = (e.x - ox) / Math.max(dt, 1e-4); e.vy = (e.y - oy) / Math.max(dt, 1e-4);
      }
      if ((e.fire -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.fire = rand(2, 2.6) / Game.fireRateMul; Bullets.aimAt(e.x, e.y, Game.tx, Game.ty, 230, { col: PI_.cyan, r: 6.5 }, 2, 0.2); Audio2.sfx('eshot'); }
    },
    draw(e, ctx, x, y) {
      const a = (e.M ? e.M.a : e.t) + (e.slot ? PI : 0), c = PAL_CSS[e.col];
      ctx.strokeStyle = c; ctx.lineWidth = 2.2; ring(ctx, x, y, 13); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 13, a - PI / 2, a + PI / 2); ctx.closePath(); ctx.fill(); // the two halves mirror each other
      if (e.stunT > 0) Tele.ring(ctx, x, y, 19, COL.cyan, 0.8, [3, 3], 1.5);
    },
  },
  bellpair: {
    r: 15, hp: 10, score: 450, col: 'pink', mass: 1.4, linkKind: 'bell', info: ['Bell pair', 'Two emitters that circle you on opposite sides and fire at the same instant, in mirror-image patterns. Learn one and you know what the other will do.', '10 hits each'],
    init(e, o) { e.slot = o.slot || 0; e.ang = o.ang || 0; e.cyc = 2.2; e.glow = 0; },
    update(e, dt) {
      const p = e.link && !e.link.dead ? e.link : null;
      if (e.slot === 0 || !p) e.ang += dt * 0.35; else e.ang = p.ang + PI;
      steer(e, Game.tx + Math.cos(e.ang) * 420, Game.ty + Math.sin(e.ang) * 420, 260 * espd(e), 2.4, dt); moveEnemy(e, dt);
      e.glow = Math.max(0, e.glow - dt);
      if ((e.slot === 0 || !p) && (e.cyc -= dt) <= 0) {
        e.cyc = 2.6 / Game.fireRateMul;
        const set = chance(0.5) ? 'fan' : 'ring', tw = rand(-0.6, 0.6);
        bellFire(e, set, tw); if (p) { bellFire(p, set, -tw); Notes.obs('enemy:bellpair', 'sync'); }
        Audio2.sfx('bossShot');
      }
    },
    draw(e, ctx, x, y) {
      const lead = e.slot === 0 || !e.link || e.link.dead ? e : e.link, warn = lead.cyc < 0.5 ? 1 - lead.cyc / 0.5 : 0;
      halo(ctx, PI_.pink, x, y, 50, 0.3 + 0.5 * Math.max(warn, e.glow * 3));
      ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 2.4; ring(ctx, x, y, 14); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(e.t * (e.slot ? -1 : 1) * 1.5);
      for (let k = 0; k < 3; k++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(13, 0); ctx.stroke(); }
      ctx.restore(); dot(ctx, x, y, 4, '#fff');
      if (warn) Tele.ring(ctx, x, y, 14 + 26 * (1 - warn), COL.pink, 0.3 + 0.6 * warn, [4, 4], 2);
    },
  },
  assistant: {
    r: 11, hp: 5, score: 150, col: 'green', mass: 0.6, info: ['Lab assistant', 'Sometimes arrives with an elite. It hides behind its elite and heals it with a beam, and only that elite. Fragile: shoot it first. If its elite falls first, it panics and runs.', '5 hits'],
    init(e) { e.harmless = true; e.face = 1; e.of = Game.enemies.filter(o => o.elite && !o.dead && !o.assisted).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0] || null; if (e.of) { e.of.assisted = e; Game.say(e, pick(ASSIST_HELLO), 2); } },
    update(e, dt) {
      const B = e.of;
      e.healing = false;
      if (!B || B.dead) { // its elite is gone: it panics and runs for the edge
        if (e.flee === undefined) { e.flee = 6; Game.say(e, pick(ASSIST_BYE), 1.6, true); Notes.obs('enemy:assistant', 'flee'); }
        const [ux, uy] = toCat(e); e.vx += (-ux * 250 - e.vx) * damp(4, dt); e.vy += (-uy * 250 - e.vy) * damp(4, dt); moveEnemy(e, dt);
        e.face = e.vx >= 0 ? 1 : -1;
        if ((e.flee -= dt) <= 0) { FX.text(e.x, e.y - 20, 'escaped', PI_.green, { size: 12, font: 'serif' }); Game.killEnemy(e, 'escape', true); }
        return;
      }
      const [ux, uy] = toCat(B), tx = B.x - ux * ((B.gridR || B.r) + 70), ty = B.y - uy * ((B.gridR || B.r) + 70); // hide behind it
      steer(e, tx, ty, 240 * espd(e), 3, dt); moveEnemy(e, dt); e.face = ux >= 0 ? 1 : -1;
      const d = Math.hypot(wdx(B.x - e.x), wdy(B.y - e.y));
      if (d < 280 && B.hp < B.maxHp) { e.healing = true; B.hp = Math.min(B.maxHp, B.hp + B.maxHp * 0.02 * dt); if ((e.healT = (e.healT || 0) + dt) > 2) Notes.obs('enemy:assistant', 'heal'); }
    },
    draw(e, ctx, x, y) {
      const B = e.of;
      if (e.healing && B && !B.dead) { // a healing beam with little crosses
        const bx = x + wdx(B.x - e.x), by = y + wdy(B.y - e.y);
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(COL.green, 0.55); ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -Game.t * 40; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
        for (let k = 0; k < 3; k++) { const f = ((Game.t * 0.8 + k / 3) % 1), px = x + (bx - x) * f, py = y + (by - y) * f; ctx.fillStyle = rgba(COL.green, 0.9); ctx.fillRect(px - 4, py - 1, 8, 2); ctx.fillRect(px - 1, py - 4, 2, 8); }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.save(); ctx.translate(x, y + 2); ctx.scale(0.78, 0.78); ET.physicist.draw(e, ctx, 0, 0); ctx.restore();
      ctx.fillStyle = PAL_CSS[PI_.green]; ctx.fillRect(x - 6, y - 1, 12, 3); ctx.fillRect(x - 1.5, y - 5.5, 3, 12); // a green cross on the coat
    },
    onDeath(e) { if (e.flee !== undefined && e.flee > 0) { Game.addScore(500, e.x, e.y - 20, 'caught'); Notes.obs('enemy:assistant', 'caught'); } if (e.of) e.of.assisted = null; },
  },
});
// three more elites
Object.assign(ET, {
  postdoc: {
    r: 24, hp: 170, score: 2600, col: 'chalk', mass: 6, min: 11, iconR: 34, info: ['Postdoc', 'Overworked, underpaid and very productive: fires drafts in fans and publishes rings of papers. When it falls it splits into two junior copies of itself, the way your cats do.'],
    init(e, o) {
      e.face = 1; e.state = 'walk'; e.fire = 1.6; e.pub = 5;
      if (o.gen) { e.gen = 1; e.r = 16; e.hp = e.maxHp = Math.max(6, Math.ceil(e.maxHp * 0.2)); e.score = 400; }
      else { e.gen = 0; eliteInit(e, pick(['I will be done by Friday.', 'Just one more experiment.', 'My contract ends next month.'])); }
    },
    move: { chase: 70, acc: 1.2 },
    tick(e, dt) {
      e.face = wdx(Game.tx - e.x) >= 0 ? 1 : -1;
      if ((e.fire -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.fire = rand(1.5, 2.1) / Game.fireRateMul; Bullets.aimAt(e.x, e.y, Game.tx, Game.ty, 230, { col: PI_.chalk, r: 7, kind: 3 }, e.gen ? 2 : 4, e.gen ? 0.3 : 0.55); Audio2.sfx('eshot'); }
      if (!e.gen && (e.pub -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.pub = rand(5.5, 6.5) / Game.fireRateMul; Bullets.ring(e.x, e.y, Math.round(16 / Game.D.gap), 140, { col: PI_.ice, r: 8, kind: 3 }, Math.random() * TAU); Game.say(e, pick(['Published!', 'Preprint out.', 'Submitted.']), 1.2); Notes.obs('enemy:postdoc', 'publish'); }
    },
    onDeath(e) {
      if (e.gen) return;
      for (const s of [-1, 1]) { const c = Game.addEnemy('postdoc', e.x + s * 34, e.y, { gen: 1 }); if (c) { c.vx = s * 240; c.vy = rand(-80, 80); } }
      FX.text(e.x, e.y - 40, 'two junior copies', PI_.chalk, { size: 14, font: 'serif', life: 1.4 }); Notes.obs('enemy:postdoc', 'split');
    },
    draw(e, ctx, x, y) {
      const s = e.gen ? 1.15 : 1.75;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ET.physicist.draw(e, ctx, 0, 0);
      ctx.fillStyle = '#3a3166'; ctx.fillRect(-14 * e.face - 4, 2, 9, 6); ctx.fillStyle = 'rgba(76,242,255,.8)'; ctx.fillRect(-14 * e.face - 3, 3, 7, 4); // a laptop
      ctx.fillStyle = '#c98b4a'; ctx.fillRect(10 * e.face - 2, -2, 4, 5); // coffee
      ctx.restore();
    },
  },
  decoherer: {
    r: 30, hp: 240, score: 3000, col: 'amber', mass: 12, min: 16, iconR: 60, aura: 290, info: ['Decoherer', 'A hot, noisy lump of environment. Inside its haze your coherence drains several times faster, and it sprays thermal photons in every direction. Fight it as one cat, or from outside the haze.'],
    init(e) { eliteInit(e, '…'); e.spray = 0.5; e.burst = 4; e.dots = Array.from({ length: 70 }, () => [Math.random() * TAU, Math.sqrt(Math.random()), Math.random()]); },
    move: { chase: 45, acc: 0.7 },
    tick(e, dt) {
      if ((e.spray -= dt) <= 0 && Game.inView(e.x, e.y, 60)) { e.spray = 0.16 / Game.fireRateMul; const a = Math.random() * TAU; Bullets.fire(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, Math.cos(a) * rand(110, 190), Math.sin(a) * rand(110, 190), { col: pick([PI_.amber, PI_.orange, PI_.white]), r: 5.5, life: 5 }); }
      if ((e.burst -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.burst = rand(4.5, 5.5) / Game.fireRateMul; Bullets.ring(e.x, e.y, Math.round(20 / Game.D.gap), 170, { col: PI_.orange, r: 7 }, Math.random() * TAU); FX.ring(e.x, e.y, 30, 200, 0.4, PI_.amber, 3); Audio2.sfx('eshot'); }
    },
    draw(e, ctx, x, y) {
      const R = e.def.aura;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 20, x, y, R); g.addColorStop(0, 'rgba(255,170,70,.18)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      for (const [a, r, ph] of e.dots) { const on = Math.sin(e.t * 9 + ph * 40) > 0.3; if (!on) continue; const aa = a + e.t * 0.2, rr = r * R; ctx.fillStyle = 'rgba(255,220,170,.5)'; ctx.fillRect(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr, 2, 2); } // thermal noise
      ctx.globalCompositeOperation = 'source-over';
      Tele.ring(ctx, x, y, R, COL.amber, 0.25, [2, 10], 1.5);
      ctx.save(); ctx.translate(x, y); ctx.rotate(e.t * 0.6); ctx.fillStyle = '#ffd59a'; ctx.beginPath();
      for (let k = 0; k <= 14; k++) { const a = k / 14 * TAU, r = 24 + 6 * Math.sin(k * 3.7 + e.t * 7); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.restore(); dot(ctx, x, y, 11, '#fff');
    },
  },
  titan: {
    r: 40, hp: 340, score: 3500, col: 'violet', mass: 30, min: 26, iconR: 64, gridR: 44, linkKind: 'anchor', info: ['Entangled Titan', 'A huge elite with its own Anchor somewhere in the arena (follow the thread). While the Anchor lives, the Titan shrugs off three quarters of every hit. Wear it down, or cut the thread and it collapses.'],
    init(e) { eliteInit(e, pick(['We are one.', 'Find my other half. I dare you.', '…'])); e.spin = 0; e.slam = 4; e.fire = 1; e.made = false; },
    move: { chase: 50, acc: 0.7 },
    armour(e, dmg, x, y) { if (e.link && !e.link.dead) { if (Math.random() < 0.04) FX.text(x, y - 16, 'anchored', PI_.violet, { size: 11, font: 'serif', life: 0.6 }); return dmg * 0.25; } return dmg; },
    tick(e, dt) {
      if (!e.made) { e.made = true; const p = Game.farPoint(560, 120), a = Game.addEnemy('anchor', p.x, p.y, { tough: true }); linkPair(e, a); }
      e.spin += dt * 0.9;
      if ((e.fire -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.fire = 0.13 / Game.fireRateMul; for (const s of [0, PI]) { const a = e.spin + s; Bullets.fire(e.x + Math.cos(a) * 44, e.y + Math.sin(a) * 44, Math.cos(a) * 190, Math.sin(a) * 190, { col: s ? PI_.violet : PI_.gold, r: 6.5 }); } }
      if ((e.slam -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.slam = rand(4.5, 5.5) / Game.fireRateMul; Bullets.ring(e.x, e.y, Math.round(24 / Game.D.gap), 150, { col: PI_.violet, r: 8 }, Math.random() * TAU); FX.ring(e.x, e.y, 30, 260, 0.5, PI_.violet, 4); addTrauma(0.15); Audio2.sfx('bossShot'); }
    },
    draw(e, ctx, x, y) {
      const anchored = e.link && !e.link.dead;
      halo(ctx, PI_.violet, x, y, 150, 0.45);
      for (const s of [0, PI]) { const a = e.spin + s; dot(ctx, x + Math.cos(a) * 44, y + Math.sin(a) * 44, 12, s ? PAL_CSS[PI_.violet] : PAL_CSS[PI_.gold]); }
      dot(ctx, x, y, 34, '#2a1850'); ctx.strokeStyle = PAL_CSS[PI_.violet]; ctx.lineWidth = 3; ring(ctx, x, y, 34); ctx.stroke();
      ctx.textBaseline = 'middle'; txt(ctx, 'Ψ', x, y + 1, fontSerif(34, 700, true), '#e6d8ff', 'center'); ctx.textBaseline = 'alphabetic';
      if (anchored) { ctx.strokeStyle = rgba(COL.violet, 0.35 + 0.2 * Math.sin(e.t * 5)); ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ring(ctx, x, y, 52); ctx.stroke(); ctx.setLineDash([]); }
    },
  },
});
ELITE_IDS.push('postdoc', 'decoherer', 'titan');
