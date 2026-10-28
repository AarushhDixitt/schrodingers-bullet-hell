// ---------- bosses IV: the Local Realist (a Bell test you fight), and harder movesets for every boss ----------

// ===== The Local Realist: two detectors, four settings, and an inequality no classical world can break =====
// Each detector has a dial with two settings. Hit both detectors within a second of each other (a coincidence):
// that tests one pair of settings. Test all four pairs and the CHSH inequality is violated: its armour falls.
const BELL_COL = [['cyan', 'gold'], ['pink', 'violet']]; // left A / A′, right B / B′
const BELL_SET = [['A', 'A′'], ['B', 'B′']];
BOSS_DEFS.bell = {
  name: 'The Local Realist', sub: 'It insists every outcome was decided in advance. Two detectors, four settings: prove it wrong.', hp: 4200, r: 60, col: 'pink', score: 200000,
  short: 'Hit both detectors close together, once for each of the four colour pairs. Fill the grid and its armour falls away.',
  how: 'A core with a detector on each long arm. Each detector has a dial that flips between two settings (two colours each). Both detectors fire at the same instant in mirror-image patterns, so one side tells you what the other is about to do. Its armour only breaks when you test it: hit both detectors within about a second of each other (a coincidence), once for each of the four combinations of settings. The grid by its health bar fills in. Fill all four and the inequality is violated: its hidden variables fail and it takes heavy damage for a few seconds. Then it resets, and its dials flip faster.',
  init(b) { Object.assign(b, { x: W / 2, y: 360, L: 420, set: [0, 0], flipT: [rand(1, 2), rand(1.2, 2.4)], hitT: [-9, -9], hitS: [0, 0], grid: [0, 0, 0, 0], violT: 0, level: 0, glow: [0, 0], hv: [], sweep: 0, steerT: [0, 0] }); },
  pool: [['pairs', 'singlet', 'hidden', 'pairs'], ['pairs', 'singlet', 'hidden', 'loophole', 'pairs'], ['pairs', 'loophole', 'singlet', 'hidden', 'loophole']],
  extra: [{ id: 'freedom', diff: 'postdoc', phase: 1 }, { id: 'steer', diff: 'reviewer2', phase: 2 }],
  det(b, k) { return [b.x + (k ? 1 : -1) * b.L, b.y + 40 + Math.sin(b.t * 1.3 + k * PI) * 30]; },
  combo: b => b.set[0] * 2 + b.set[1],
  // both detectors fire the pattern that belongs to the current pair of settings, as mirror images
  pairFire(b, sp) {
    const D = BOSS_DEFS.bell, c = D.combo(b), tw = rand(-0.5, 0.5);
    for (const k of [0, 1]) {
      const [x, y] = D.det(b, k), m = k ? -1 : 1, col = PI_[BELL_COL[k][b.set[k]]], o = { col, r: 6.5, life: 8 };
      if (c === 0) Bullets.aimAt(x, y, Game.tx, Game.ty, 240 * sp, o, 5, 0.5);
      else if (c === 1) Bullets.ring(x, y, Math.round(14 / Game.D.gap), 170 * sp, o, tw * m);
      else if (c === 2) for (let j = 0; j < 3; j++) { const a = PI / 2 + m * (0.3 + j * 0.28 + tw * 0.2); Bullets.fire(x, y, Math.cos(a) * 260 * sp, Math.sin(a) * 260 * sp, { ...o, turn: -m * 0.6 }); }
      else { const gap = 0.5 + tw * 0.5 * m; for (let j = 0; j < 9; j++) { const f = j / 8; if (Math.abs(f - gap) < 0.12 * Game.D.gap) continue; Bullets.fire(x + (f - 0.5) * 360, y + 20, 0, 190 * sp, o); } }
      b.glow[k] = 0.35;
    }
    Audio2.sfx('bossShot'); Notes.obs('boss:bell', 'mirror');
  },
  atk: {
    pairs: { dur: 5.2, every: 0.95, line: 'Every outcome was fixed in advance. Watch.', fire(b, sp) { BOSS_DEFS.bell.pairFire(b, sp); } },
    singlet: {
      dur: 5, line: 'Perfect anticorrelation.',
      warn: () => 0.9 * Game.tele(true),
      tick(b, dt, sp) { b.sweep += dt * 0.5 * sp; if (b.at < this.warn()) return; for (const k of [0, 1]) { const [x, y] = BOSS_DEFS.bell.det(b, k); Game.beamHit(x, y, this.ang(b, k), 1600, 9, b); } },
      ang: (b, k) => { const a = PI / 2 + 0.75 * Math.sin(b.sweep); return k ? PI - a : a; },
      every: 1.2, fire(b) { for (const k of [0, 1]) { const [x, y] = BOSS_DEFS.bell.det(b, k); Bullets.ring(x, y, 8, 140, { col: PI_[BELL_COL[k][b.set[k]]], r: 6 }, b.t * (k ? -1 : 1)); } },
      draw(b, ctx) { for (const k of [0, 1]) { const [x, y] = BOSS_DEFS.bell.det(b, k); Tele.beam(ctx, x, y, this.ang(b, k), 1600, 9, COL[BELL_COL[k][b.set[k]]], b.at < this.warn() ? 1 : 2, b.t); } },
    },
    hidden: {
      dur: 4.4, every: 1.4, line: 'Hidden variables: decided before you looked.',
      fire(b) { // bullets laid out with their directions already chosen and shown, then all released at once
        const dl = 1.25 * Game.tele(true);
        for (let j = 0; j < 16; j++) { const a = rand(0, TAU), r = rand(90, 260), x = b.x + Math.cos(a) * r, y = b.y + 60 + Math.sin(a) * r * 0.6, d = Math.atan2(Game.ty - y, Game.tx - x) + rand(-0.9, 0.9); Bullets.fire(x, y, Math.cos(d) * 250, Math.sin(d) * 250, { col: PI_.white, r: 6.5, delay: dl, life: 6 }); b.hv.push({ x, y, a: d, t: dl }); }
        Audio2.sfx('charge');
      },
      draw(b, ctx) { for (const h of b.hv) { const f = clamp(1 - h.t / 1.4, 0, 1); ctx.strokeStyle = rgba(COL.white, 0.25 + 0.55 * f); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + Math.cos(h.a) * 34, h.y + Math.sin(h.a) * 34); ctx.stroke(); } },
    },
    loophole: {
      dur: 4.6, every: 0.75, line: 'Closing the locality loophole: the detectors move apart.',
      start(b) { b.Lt = 760; }, end(b) { b.Lt = null; },
      tick(b, dt) { for (const k of [0, 1]) if ((b.flipT[k] -= dt * 1.5) <= 0) BOSS_DEFS.bell.flip(b, k); },
      fire(b, sp) { BOSS_DEFS.bell.pairFire(b, sp * 1.1); },
    },
    freedom: {
      dur: 4, line: 'Freedom of choice? Someone else picks your settings now.',
      start(b) { if (Game.enemies.filter(e => e.type === 'bellpair' && !e.dead).length < 2) { const a = Math.random() * TAU; linkPair(...[0, 1].map(k => Game.addEnemy('bellpair', Game.tx + Math.cos(a + k * PI) * 430, Game.ty + Math.sin(a + k * PI) * 430, { slot: k, ang: a + k * PI }))); } },
      every: 1.1, fire(b, sp) { BOSS_DEFS.bell.pairFire(b, sp); },
    },
    steer: { dur: 5.2, every: 1.3, line: 'EPR steering: touch one side and the other answers.', fire(b, sp) { BOSS_DEFS.bell.pairFire(b, sp); } },
  },
  flip(b, k) {
    b.set[k] ^= 1; const f = [[1.4, 2.4], [1.0, 1.8], [0.75, 1.35]][Math.min(2, b.phase - 1)];
    b.flipT[k] = rand(...f) * Math.pow(0.88, b.level);
    const [x, y] = BOSS_DEFS.bell.det(b, k); FX.ring(x, y, 10, 48, 0.25, PI_[BELL_COL[k][b.set[k]]], 2);
  },
  move(b, dt) {
    BK.glide(b, W / 2 + Math.sin(b.t * 0.23) * 300, 340 + Math.sin(b.t * 0.41) * 70, 1, dt);
    const Lw = b.Lt || (b.phase >= 3 ? 640 : b.phase >= 2 ? 540 : 430); b.L += (Lw - b.L) * damp(1.2, dt);
    for (const k of [0, 1]) { b.glow[k] = Math.max(0, b.glow[k] - dt); if (b.violT <= 0 && (b.flipT[k] -= dt) <= 0) this.flip(b, k); }
    for (let i = b.hv.length - 1; i >= 0; i--) if ((b.hv[i].t -= dt) <= 0) b.hv.splice(i, 1);
    if (b.violT > 0 && (b.violT -= dt) <= 0) { b.grid = [0, 0, 0, 0]; b.level++; Game.bossLine(b, 'Hidden variables restored. Again.'); }
  },
  // register a hit on a detector; a coincidence (both within a second) tests one pair of settings
  probe(b, k) {
    b.hitT[k] = b.t; b.hitS[k] = b.set[k];
    if (b.atk === 'steer' && (b.steerT[k] || 0) < b.t) { b.steerT[k] = b.t + 0.35; const [x, y] = BOSS_DEFS.bell.det(b, 1 - k); Bullets.aimAt(x, y, Game.tx, Game.ty, 300, { col: PI_.pink, r: 6.5, kind: 1 }, 3, 0.25); Notes.obs('boss:bell', 'steered'); }
    if (b.violT > 0 || b.t - b.hitT[1 - k] > 1.0) return;
    const c = b.hitS[0] * 2 + b.hitS[1];
    if (b.grid[c]) return;
    b.grid[c] = 1; Notes.obs('boss:bell', 'coincidence');
    FX.text(b.x, b.y - 100, BELL_SET[0][b.hitS[0]] + ' · ' + BELL_SET[1][b.hitS[1]] + ' tested', PI_.white, { size: 16, font: 'serif', life: 1.1 }); Audio2.sfx('window');
    if (b.grid.every(Boolean)) {
      b.violT = 5.5; Notes.obs('boss:bell', 'violated');
      Game.banner('INEQUALITY VIOLATED', 'S = 2√2 > 2. No local hidden variables: its armour is gone for a few seconds.', 2);
      FX.ring(b.x, b.y, 20, 420, 0.8, PI_.white, 6); Game.post.flash = [1, 0.8, 1, 0.5]; addTrauma(0.5); Audio2.sfx('bossPhase');
    }
  },
  hit(b, x, y) {
    if (BK.circle(b, x, y, 58)) return 1;
    for (const k of [0, 1]) { const [dx, dy] = BOSS_DEFS.bell.det(b, k); if ((x - dx) ** 2 + (y - dy) ** 2 < 34 * 34) { BOSS_DEFS.bell.probe(b, k); return 0.35; } }
    return 0;
  },
  window: b => b.violT > 0 && 'VIOLATED',
  camTop: b => b.y - 85,
  touch(b, x, y, hr) { if (BK.circle(b, x, y, 50 + hr)) return true; for (const k of [0, 1]) { const [dx, dy] = BOSS_DEFS.bell.det(b, k); if ((x - dx) ** 2 + (y - dy) ** 2 < (26 + hr) ** 2) return true; } return false; },
  aimPoint(b, x, y) { const pts = [{ x: b.x, y: b.y }, ...[0, 1].map(k => { const [px, py] = BOSS_DEFS.bell.det(b, k); return { x: px, y: py }; })]; return pts.reduce((a, p) => ((p.x - x) ** 2 + (p.y - y) ** 2 < (a.x - x) ** 2 + (a.y - y) ** 2 ? p : a)); },
  hud(b, c, x, y) {
    c.font = fontMono(10, 600); c.textAlign = 'center'; c.fillStyle = b.violT > 0 ? '#60ff9c' : '#9a93c4';
    c.fillText(b.violT > 0 ? 'S = 2√2 > 2 · VIOLATED' : 'BELL TEST · HIT BOTH DETECTORS TOGETHER', x, y);
    const s = 13, x0 = x - s - 2, y0 = y + 6;
    for (let i = 0; i < 4; i++) { const cx = x0 + (i & 1) * (s + 4), cy = y0 + (i >> 1) * (s + 4); c.fillStyle = b.grid[i] ? '#ece7ff' : 'rgba(236,231,255,.12)'; c.fillRect(cx, cy, s, s); c.fillStyle = b.grid[i] ? '#0c0a18' : '#9a93c4'; c.font = fontMono(7.5, 700); c.fillText(BELL_SET[0][i >> 1] + BELL_SET[1][i & 1], cx + s / 2, cy + s / 2 + 3); }
  },
  drawDet(ctx, b, k, x, y) {
    const s = b.set[k], col = COL[BELL_COL[k][s]], lit = b.t - b.hitT[k] < 0.25;
    halo(ctx, PI_[BELL_COL[k][s]], x, y, 70, 0.35 + 1.2 * b.glow[k] + (lit ? 0.4 : 0));
    dot(ctx, x, y, 26, '#160f2a'); ctx.strokeStyle = rgba(col, 0.95); ctx.lineWidth = 3; ring(ctx, x, y, 26); ctx.stroke();
    // the dial: two coloured halves, the needle on the current setting
    for (const j of [0, 1]) { ctx.strokeStyle = rgba(COL[BELL_COL[k][j]], j === s ? 0.95 : 0.25); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 18, PI + j * PI / 2, PI + (j + 1) * PI / 2); ctx.stroke(); }
    const na = PI + (s + 0.5) * PI / 2; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(na) * 16, y + Math.sin(na) * 16); ctx.stroke();
    ctx.textBaseline = 'middle'; txt(ctx, BELL_SET[k][s], x, y + 10, fontSerif(12, 700, true), '#fff', 'center'); ctx.textBaseline = 'alphabetic';
  },
  draw(b, ctx) {
    BK.drawAtk(b, ctx, this);
    const v = b.violT > 0;
    for (const k of [0, 1]) { const [x, y] = BOSS_DEFS.bell.det(b, k); ctx.strokeStyle = rgba(v ? COL.white : COL.pink, 0.35); ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]); BOSS_DEFS.bell.drawDet(ctx, b, k, x, y); }
    this.drawCore(ctx, b, b.x, b.y, 1);
  },
  drawCore(ctx, b, x, y, s) {
    const v = b.violT > 0;
    halo(ctx, v ? PI_.white : PI_.pink, x, y, 150 * s, 0.4 + (v ? 0.3 * Math.sin(b.t * 12) : 0));
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#1d1233'; ctx.strokeStyle = v ? '#fff' : PAL_CSS[PI_.pink]; ctx.lineWidth = 3;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-52, -40, 104, 84, 14); else ctx.rect(-52, -40, 104, 84); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -40, 26, PI, 0); ctx.stroke(); // a padlock: local, real, locked in advance
    ctx.textBaseline = 'middle'; txt(ctx, v ? 'S > 2' : 'S ≤ 2', 0, 0, fontSerif(24, 700, true), v ? '#fff' : '#ffb0e6', 'center'); ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < 4; i++) { ctx.fillStyle = b.grid[i] ? '#fff' : 'rgba(255,255,255,.14)'; ctx.fillRect(-30 + i * 16, 24, 12, 8); }
    ctx.restore();
  },
  iconDraw(b, ctx) {
    b.set = [Math.floor(b.t / 1.3) % 2, Math.floor(b.t / 1.7) % 2]; b.glow = [0, 0]; b.hitT = [-9, -9];
    BOSS_DEFS.bell.drawDet(ctx, b, 0, -95, 30); BOSS_DEFS.bell.drawDet(ctx, b, 1, 95, 30);
    ctx.strokeStyle = 'rgba(255,96,200,.35)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(-70, 30); ctx.lineTo(70, 30); ctx.stroke(); ctx.setLineDash([]);
    this.drawCore(ctx, b, 0, -10, 0.8);
  },
  onDeath(b) { FX.text(b.x, b.y - 110, 'LOCAL REALISM FALSIFIED', PI_.pink, { size: 26, life: 2.4, vy: -20 }); },
};
ATK_NAMES.bell = { pairs: 'Correlated Pairs', singlet: 'Singlet Beams', hidden: 'Hidden Variables', loophole: 'Closing the Loophole', freedom: 'Freedom of Choice', steer: 'EPR Steering' };

// ===== harder movesets: one more attack from Postdoc, another from Reviewer 2 =====
// on easier difficulties a boss still learns its harder moves if the fight drags on (two minutes per step of difficulty)
// or the run has gone on a long time (twelve minutes per step)
BK.hard = (diff, b) => {
  if (Game.mode === 'lab') return true;
  if (Game.mode !== 'arcade') return false;
  const gap = diffRank(diff) - diffRank(Game.diffId); if (gap <= 0) return true;
  if (!b || (b.t < 120 * gap && Game.stats.time < 720 * gap)) return false;
  if (!b.learnt) { b.learnt = true; Feed.add(b.bossDef.name + ' is adapting', 'red', 'new moves'); Game.bossLine(b, 'The fight has gone on long enough for it to learn something new.'); Notes.obs('boss:' + b.type, 'adapt'); }
  return true;
};
const EXTRA_ATK = new Set();
function addExtra(boss, list, atks, names) {
  const D = BOSS_DEFS[boss];
  D.extra = (D.extra || []).concat(list);
  Object.assign(D.atk, atks); Object.assign(ATK_NAMES[boss], names);
  for (const k of Object.keys(atks)) EXTRA_ATK.add(boss + ':' + k);
}
// bosses whose own draw does not draw their current attack: draw the new ones on top
for (const k of ['maxwell', 'slit', 'oscillator', 'cyclotron']) { const D = BOSS_DEFS[k], d0 = D.draw; D.draw = function (b, ctx) { d0.call(this, b, ctx); if (b.atk && EXTRA_ATK.has(k + ':' + b.atk)) BK.drawAtk(b, ctx, this); }; }
const coneDraw = (b, ctx, angs, w, col, k) => {
  ctx.globalCompositeOperation = 'lighter';
  for (const ca of angs) { const g = ctx.createRadialGradient(b.x, b.y, 60, b.x, b.y, 1500); g.addColorStop(0, rgba(col, 0.32 * k)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, 1500, ca - w, ca + w); ctx.closePath(); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
};

addExtra('observer', [{ id: 'doubletake', diff: 'postdoc', phase: 1 }, { id: 'zeno', diff: 'reviewer2', phase: 2 }], {
  doubletake: {
    dur: 4.6, after: 0.6, every: 0.22, line: 'It looks twice, from both sides at once.',
    start(b) { b.dtA = [PI * 0.12, PI * 0.88]; b.dtT = 0; },
    tick(b, dt, sp) {
      b.dtA[0] += dt * 0.42 * sp; b.dtA[1] -= dt * 0.42 * sp;
      if ((b.dtT -= dt) > 0 || b.at < 0.6) return; b.dtT = 0.7;
      for (const ca of b.dtA) Player.measureRegion(br => Math.abs(angDiff(ca, Math.atan2(br.py - b.y, br.px - b.x))) < 0.16, { x: b.x + Math.cos(ca) * 200, y: b.y + Math.sin(ca) * 200 }, 'IN SIGHT');
    },
    fire(b) { for (const ca of b.dtA) { const a = ca + (Math.random() - 0.5) * 0.2; Bullets.fire(b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 80, Math.cos(a) * 440, Math.sin(a) * 440, { col: PI_.pink, r: 5.5, kind: 1 }); } },
    draw(b, ctx) { coneDraw(b, ctx, b.dtA || [], 0.16, COL.pink, clamp(b.at / 0.6, 0, 1)); },
  },
  zeno: {
    dur: 4.4, after: 0.7, every: 0.6, line: 'A watched cat never moves. It is watching.',
    tick(b, dt) { b.gazeA += clamp(angDiff(b.gazeA, b.want), -0.55 * dt, 0.55 * dt); if (b.at < 0.7) return; if (Player.branches.some(br => Math.abs(angDiff(b.gazeA, Math.atan2(br.py - b.y, br.px - b.x))) < 0.42)) { Player.zenoT = 0.15; Notes.obs('boss:observer', 'zenoslow'); } },
    fire(b) { Bullets.aimAt(b.x, b.y, Game.tx, Game.ty, 250, { col: PI_.pink, r: 7, kind: 1 }, 3, 0.35); Bullets.ring(b.x, b.y, 12, 110, { col: PI_.red, r: 6 }, b.t); Audio2.sfx('bossShot'); },
    draw(b, ctx) { coneDraw(b, ctx, [b.gazeA], 0.42, COL.white, clamp(b.at / 0.7, 0, 1) * 0.7); },
  },
}, { doubletake: 'Double Take', zeno: 'Watched Pot' });

addExtra('laplace', [{ id: 'twofold', diff: 'postdoc', phase: 1 }, { id: 'initial', diff: 'reviewer2', phase: 2 }], {
  twofold: {
    dur: 4.4, every: 0.95, line: 'Two futures. I have computed both.',
    fire(b) { // where you go if you carry on, and where you go if you turn back
      const tt = Math.hypot(Game.tx - b.x, Game.ty - b.y) / 420, dl = 0.34 * Game.tele(true);
      [[1, true], [-1, false]].forEach(([s, check]) => {
        const px = Game.tx + Player.vx * tt * s, py = Game.ty + Player.vy * tt * s;
        b.preds.push(check ? { x: px, y: py, t: 0.35, check: dl + tt / Game.bulletSpeedMul } : { x: px, y: py, t: 0.35 });
        for (let k = 0; k < 4; k++) { const i = Bullets.fire(b.x, b.y, 0, 0, { col: s > 0 ? PI_.gold : PI_.amber, r: 7, kind: 1, delay: dl + k * 0.06, life: 6 }); if (i >= 0) { const a = Math.atan2(py - b.y, px - b.x) + (Math.random() - 0.5) * 0.05, v = (420 + k * 25) * Game.bulletSpeedMul; EB.vx[i] = Math.cos(a) * v; EB.vy[i] = Math.sin(a) * v; } }
      });
      Audio2.sfx('bossShot');
    },
  },
  initial: {
    dur: 4.8, line: 'Given the initial conditions, everything that follows is certain.',
    start(b) { // a lattice of shots, every one already aimed at where you will be
      const dl = 1.35 * Game.tele(true), px = Game.tx + Player.vx * dl * 0.8, py = Game.ty + Player.vy * dl * 0.8;
      b.preds.push({ x: px, y: py, t: dl + 0.3 });
      for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) {
        const x = clamp(Game.tx + i * 260, 40, W - 40), y = clamp(Game.ty + j * 230, 40, H - 40); if (Math.hypot(x - Game.tx, y - Game.ty) < 170) continue;
        const a = Math.atan2(py - y, px - x); Bullets.fire(x, y, Math.cos(a) * 300, Math.sin(a) * 300, { col: PI_.gold, r: 7, delay: dl, life: 6 });
      }
      Audio2.sfx('charge');
    },
    every: 1.6, fire(b) { Bullets.ring(b.x, b.y, 12, 140, { col: PI_.amber, r: 6 }, b.t); },
  },
}, { twofold: 'Two Futures', initial: 'Initial Conditions' });

addExtra('maxwell', [{ id: 'szilard', diff: 'postdoc', phase: 1 }, { id: 'landauer', diff: 'reviewer2', phase: 2 }], {
  szilard: {
    dur: 4.8, every: 0.13, line: 'One molecule, one partition, one bit.',
    start(b) { // a partition of slow shot across your chamber, then heat poured into whichever half you are in
      const s = BOSS_DEFS.maxwell.side(), x0 = s > 0 ? b.wx + 30 : 30, x1 = s > 0 ? W - 30 : b.wx - 30; b.szY = clamp(Player.y + (Player.y > H / 2 ? -150 : 150), 260, H - 260);
      for (let x = x0; x <= x1; x += 34) Bullets.fire(x, b.szY, 0, 0, { col: PI_.white, r: 6, life: 4.6, delay: 0.5 * Game.tele(true) });
      Audio2.sfx('door');
    },
    fire(b) { if (b.at < 1.1) return; const D = BOSS_DEFS.maxwell, up = Player.y < b.szY; D.molecule(b, D.side(), true, up ? rand(50, b.szY - 30) : rand(b.szY + 30, H - 50)); },
  },
  landauer: {
    dur: 4.4, every: 1.15, line: 'Information is physical. So is the bill.',
    start(b) { b.marks = []; },
    fire(b) { const dur = 1.05 * Game.tele(true); for (const br of Player.branches.slice(0, 8)) b.marks.push({ x: br.px, y: br.py, t: 0, dur }); Audio2.sfx('shutter'); },
    tick(b, dt) {
      for (let i = (b.marks || []).length - 1; i >= 0; i--) { const m = b.marks[i]; if ((m.t += dt) < m.dur) continue; b.marks.splice(i, 1); Bullets.ring(m.x, m.y, 10, 170, { col: PI_.red, r: 6.5 }, Math.random() * TAU); Player.hit(Player.near(m.x, m.y, 34), 'Maxwell’s Demon'); FX.ring(m.x, m.y, 5, 60, 0.3, PI_.red, 3); }
    },
    draw(b, ctx) { for (const m of b.marks || []) { const f = m.t / m.dur; Tele.ring(ctx, m.x, m.y, 34 + 40 * (1 - f), COL.red, 0.3 + 0.6 * f, [4, 5], 2); txt(ctx, '1', m.x, m.y + 5, fontMono(13, 700), rgba(COL.red, 0.8), 'center'); } },
  },
}, { szilard: 'Szilárd Engine', landauer: 'Landauer’s Bill' });

addExtra('slit', [{ id: 'pairs', diff: 'postdoc', phase: 1 }, { id: 'eraser', diff: 'reviewer2', phase: 2 }], {
  pairs: {
    dur: 4.2, every: 0.5, line: 'Entangled photons: one through each slit.',
    start(b) { if (Game.enemies.filter(e => e.type === 'bellpair' && !e.dead).length < 2) { const S = BOSS_DEFS.slit.slits(b), a = Math.atan2(b.by + 80 - Game.ty, S[0] - Game.tx); linkPair(...[0, 1].map(k => Game.addEnemy('bellpair', S[k ? S.length - 1 : 0], b.by + 80, { slot: k, ang: a + k * PI }))); } },
    fire(b) { const S = BOSS_DEFS.slit.slits(b); for (const sx of [S[0], S[S.length - 1]]) Bullets.aimAt(sx, b.by + 18, Game.tx, Game.ty, 300, { col: PI_.pink, r: 6.5, kind: 1 }); },
  },
  eraser: {
    dur: 5, line: 'Delayed choice: it decides what the light was after it has gone through.',
    start(b) { b.choice = chance(0.5) ? 'wave' : 'particle'; b.decided = false; },
    tick(b) { if (!b.decided && b.at > 1.4 * Game.tele(true)) { b.decided = true; Game.bossLine(b, b.choice === 'wave' ? 'It chose: a wave.' : 'It chose: particles.'); Audio2.sfx('window'); } },
    every: 0.75, fire(b) {
      if (!b.decided) return;
      const D = BOSS_DEFS.slit, y0 = b.by + 18;
      if (b.choice === 'particle') for (const sx of D.slits(b)) for (let k = 0; k < 7; k++) { const a = PI / 2 + gauss() * 0.1; Bullets.fire(sx, y0, Math.cos(a) * 240, Math.sin(a) * 240, { col: PI_.white, r: 6.5, kind: 1, life: 8 }); }
      else for (let j = 0; j < 96; j++) { const th = -1.25 + 2.5 * j / 95; if (slitIntensity(th, b.d, b.lam, b.ns, 46) > 0.55) Bullets.fire(D.mid(b), y0, Math.cos(PI / 2 + th) * 245, Math.sin(PI / 2 + th) * 245, { col: PI_.ice, r: 6, life: 8 }); }
      Audio2.sfx('bossShot');
    },
    draw(b, ctx) { // until it decides, both possible patterns are shown
      const D = BOSS_DEFS.slit, y0 = b.by + 18, mid = D.mid(b), show = k => !b.decided || b.choice === k;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 3;
      if (show('wave')) for (let j = 0; j < 72; j++) { const th = -1.25 + 2.5 * j / 71, I = slitIntensity(th, b.d, b.lam, b.ns, 46); if (I < 0.3) continue; ctx.strokeStyle = rgba(COL.ice, 0.06 * I); ctx.beginPath(); ctx.moveTo(mid, y0); ctx.lineTo(mid + Math.cos(PI / 2 + th) * 1500, y0 + Math.sin(PI / 2 + th) * 1500); ctx.stroke(); }
      if (show('particle')) for (const sx of D.slits(b)) { ctx.strokeStyle = rgba(COL.white, 0.12); ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx, H); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
    },
  },
}, { pairs: 'Entangled Photons', eraser: 'Delayed Choice' });

addExtra('threebody', [{ id: 'comet', diff: 'postdoc', phase: 1 }, { id: 'eject', diff: 'reviewer2', phase: 2 }], {
  comet: {
    dur: 5.5, line: 'A fourth body falls in from outside.',
    start(b) { const side = randi(0, 3), f = rand(0.2, 0.8), [x, y] = [[f * W, 30], [W - 30, f * H], [f * W, H - 30], [30, f * H]][side], a = Math.atan2(b.y - y, b.x - x) + rand(-0.3, 0.3); b.comet = { x, y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, trT: 0, trail: [] }; Audio2.sfx('charge'); },
    end(b) { b.comet = null; },
    tick(b, dt) {
      const c = b.comet; if (!c) return;
      for (const o of b.bodies) { const dx = o.x - c.x, dy = o.y - c.y, r2 = dx * dx + dy * dy + 4900, g = BOSS_DEFS.threebody.GM * 1.6 / (r2 * Math.sqrt(r2)); c.vx += dx * g * dt; c.vy += dy * g * dt; }
      const v = Math.hypot(c.vx, c.vy); if (v > 700) { c.vx *= 700 / v; c.vy *= 700 / v; }
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x < 20 || c.x > W - 20) c.vx *= -1; if (c.y < 20 || c.y > H - 20) c.vy *= -1; c.x = clamp(c.x, 20, W - 20); c.y = clamp(c.y, 20, H - 20);
      if ((c.trT -= dt) <= 0) { c.trT = 0.06; const l = v || 1; for (const s of [-1, 1]) Bullets.fire(c.x, c.y, -c.vy / l * 60 * s, c.vx / l * 60 * s, { col: PI_.ice, r: 5.5, life: 5 }); c.trail.push(c.x, c.y); if (c.trail.length > 60) c.trail.splice(0, 2); }
      Player.hit(Player.near(c.x, c.y, 22), 'The Three-Body Problem');
    },
    draw(b, ctx) { const c = b.comet; if (!c) return; ctx.lineWidth = 2; for (let k = 2; k < c.trail.length; k += 2) { ctx.strokeStyle = rgba(COL.ice, 0.5 * k / c.trail.length); ctx.beginPath(); ctx.moveTo(c.trail[k - 2], c.trail[k - 1]); ctx.lineTo(c.trail[k], c.trail[k + 1]); ctx.stroke(); } halo(ctx, PI_.ice, c.x, c.y, 60, 0.6); dot(ctx, c.x, c.y, 13, '#e8f6ff'); },
  },
  eject: {
    dur: 4.2, line: 'Chaos: one of them is thrown out of the system.',
    tick(b, dt, sp) {
      const B3 = b.bodies;
      if (b.ej === undefined) { b.ej = randi(0, 2); const o = B3[b.ej]; b.ejA = Math.atan2(o.y - b.y, o.x - b.x); b.ejT = -0.8 * Game.tele(true); b.ejN = 0; Audio2.sfx('charge'); }
      const o = B3[b.ej];
      if (b.ejT < 0) { b.ejT += dt; o.vx *= 0.9; o.vy *= 0.9; if (b.ejT >= 0) { o.vx = Math.cos(b.ejA) * 1100 * sp; o.vy = Math.sin(b.ejA) * 1100 * sp; addTrauma(0.35); Audio2.sfx('tachyonDash'); } return; }
      if (b.ejN < 3 && (o.x < 95 || o.x > W - 95 || o.y < 95 || o.y > H - 95)) { b.ejN++; Bullets.ring(o.x, o.y, Math.round(18 / Game.D.gap), 190, { col: o.ci, r: 7 }, Math.random() * TAU); FX.ring(o.x, o.y, 10, 160, 0.4, o.ci, 4); addTrauma(0.2); Audio2.sfx('thud'); }
    },
    end(b) { b.ej = undefined; },
    draw(b, ctx) { if (b.ej === undefined || b.ejT >= 0) return; const o = b.bodies[b.ej]; Tele.line(ctx, o.x, o.y, o.x + Math.cos(b.ejA) * 1600, o.y + Math.sin(b.ejA) * 1600, PAL[o.ci], 0.6, 2, [10, 10]); },
  },
}, { comet: 'A Fourth Body', eject: 'Ejection' });

addExtra('oscillator', [{ id: 'coherent', diff: 'postdoc', phase: 1 }, { id: 'anharmonic', diff: 'reviewer2', phase: 2 }], {
  coherent: {
    dur: 5.4, every: 2.4, line: 'A coherent state: a wave packet that swings without spreading.',
    fire(b) { // every shot on the same spring, so the packet keeps its shape and swings through the orb to the far side
      const a = Math.atan2(Game.ty - b.y, Game.tx - b.x), R = 330, cx = b.x + Math.cos(a) * R, cy = b.y + Math.sin(a) * R;
      for (let j = 0; j < 26; j++) Bullets.fire(cx + gauss() * 34, cy + gauss() * 34, 0, 0, { col: j % 2 ? PI_.pink : PI_.white, r: 6.5, life: 8, delay: 0.5 * Game.tele(true), spring: spring(b.x, b.y) });
      FX.text(b.x, b.y - 110, '|α⟩', PI_.pink, { size: 22, font: 'serif', life: 1.2 }); Audio2.sfx('charge');
    },
  },
  anharmonic: {
    dur: 5, every: 2.2, line: 'Anharmonic: the levels crowd together, and the top one breaks free.',
    fire(b) {
      for (let n = 0; n <= 4; n++) { const v = 150 * Math.sqrt(1 - Math.pow(1 - (n + 1) / 6, 2)) + 40, m = 12 + n * 2, free = n === 4; for (let j = 0; j < m; j++) { const a = j / m * TAU + n * 0.5; Bullets.fire(b.x, b.y, Math.cos(a) * v * (free ? 1.6 : 1), Math.sin(a) * v * (free ? 1.6 : 1), { col: free ? PI_.white : n % 2 ? PI_.violet : PI_.pink, r: 6, life: 7, spring: free ? undefined : spring(b.x, b.y) }); } }
      Audio2.sfx('bossShot');
    },
  },
}, { coherent: 'Coherent State', anharmonic: 'Anharmonicity' });

addExtra('cyclotron', [{ id: 'brems', diff: 'postdoc', phase: 1 }, { id: 'bottle', diff: 'reviewer2', phase: 2 }], {
  brems: {
    dur: 4.4, every: 0.09, line: 'Bremsstrahlung: braking radiation.',
    fire(b) { const a = Math.atan2(Game.ty - b.y, Game.tx - b.x) + Math.sin(b.at * 5) * 0.5; Bullets.fire(b.x, b.y, Math.cos(a) * 520, Math.sin(a) * 520, { col: PI_.white, r: 6, acc: -420, min: 45, life: 6 }); },
  },
  bottle: {
    dur: 5.2, every: 0.5, line: 'A magnetic bottle: trapped charges bounce between the mirrors.',
    start(b) { b.bx = Game.tx; b.by2 = Game.ty; },
    fire(b) { for (let j = 0; j < 6; j++) { const a = j / 6 * TAU + b.at, x = b.bx + Math.cos(a) * 60, y = b.by2 + Math.sin(a) * 60; Bullets.fire(x, y, Math.cos(a + PI / 2) * 160, Math.sin(a + PI / 2) * 160, { col: PI_.blue, r: 6, life: 6, turn: 2.2, spring: spring(b.bx, b.by2, (TAU / 3) ** 2) }); } },
    draw(b, ctx) { for (const s of [-1, 1]) Tele.ring(ctx, b.bx + s * 240, b.by2, 70, COL.ice, 0.35, [6, 6], 2); },
  },
}, { brems: 'Bremsstrahlung', bottle: 'Magnetic Bottle' });

// the Celestial Die: a loaded die plays a face and its opposite at once; an exploding six rolls again straight away
ATK_NAMES.die.loaded = 'Loaded Die'; ATK_NAMES.die.explode = 'Exploding Six';
BOSS_DEFS.die.extra = [{ id: 'loaded', diff: 'postdoc' }, { id: 'explode', diff: 'reviewer2' }];
{
  const D = BOSS_DEFS.die, land0 = D.land;
  D.land = function (b) {
    land0.call(this, b);
    b.pattern2 = null; b.explode = false;
    if (typeof b.pattern !== 'number') return;
    if (BK.hard('postdoc', b) && chance(0.3)) { b.pattern2 = 7 - ((b.pattern - 1) % 6 + 1); b.shadow = { phase: b.phase, one: false, oneBurst: false, mines: false, fire: 0.2 }; BK.announce(b, 'loaded', 'Opposite faces of a die add up to seven.'); Game.banner('LOADED: ' + b.pattern + ' AND ' + b.pattern2, 'It plays both faces at once.', 1.2); }
    if (b.pattern === 6 && BK.hard('reviewer2', b)) { b.explode = true; BK.announce(b, 'explode', 'Roll a six and it rolls again.'); }
  };
}
// the Apparatus: Wigner's friend shares its fate (kill the friend to open its armour); half-lives decide when nuclei burst
ATK_NAMES.apparatus.friend = 'Wigner’s Friend'; ATK_NAMES.apparatus.halflife = 'Half-Life';
BOSS_DEFS.apparatus.extra = [{ id: 'friend', diff: 'postdoc' }, { id: 'halflife', diff: 'reviewer2' }];
{
  const D = BOSS_DEFS.apparatus, move0 = D.move;
  D.move = function (b, dt) {
    const r = move0.call(this, b, dt);
    if (b.phase >= 2 && BK.hard('postdoc', b) && !(b.friend && !b.friend.dead) && (b.friendT = (b.friendT ?? 4) - dt) <= 0) {
      b.friendT = 26; const p = Game.farPoint(520, 160), f = Game.addEnemy('friend', p.x, p.y); if (f) { f.boss_ = b; b.friend = f; }
      BK.announce(b, 'friend', 'Its friend is measuring too. While the friend lives, the box barely feels your shots.');
    }
    if (BK.hard('reviewer2', b) && (b.hlT = (b.hlT ?? 7) - dt) <= 0) {
      b.hlT = rand(8, 11); const [sx, sy] = this.src(b); BK.announce(b, 'halflife', 'Unstable nuclei. Each bursts at a random moment: only the half-life is certain.');
      for (let k = 0; k < 9; k++) { const a = Math.atan2(Game.ty - sy, Game.tx - sx) + rand(-0.8, 0.8), v = rand(80, 150); Bullets.fire(sx, sy, Math.cos(a) * v, Math.sin(a) * v, { col: PI_.green, r: 11, kind: 2, life: 0.4 - Math.log(1 - Math.random() * 0.97) * 1.4, pop: true }); }
    }
    return r;
  };
  D.armourMul = b => (b.friend && !b.friend.dead ? 0.3 : 1);
}
// Wigner's friend: a physicist in a little box of its own, tethered to the Apparatus
ET.friend = {
  r: 16, hp: 26, score: 900, col: 'green', mass: 2, arrow: 'green', info: ['Wigner’s friend', 'A physicist in a box of their own, measuring the same experiment. While the friend lives, the Apparatus shrugs off most of your shots. Follow the thread.', '26 hits'],
  init(e) { e.face = 1; e.hideArrow = false; Game.say(e, pick(['I measured it already.', 'From in here, it is decided.', 'Ask me what I saw.']), 2.2); },
  move: { keep: [520, 380], speed: 120, strafe: 0.6, acc: 1.6 },
  draw(e, ctx, x, y) {
    const B = e.boss_; if (B && !B.dead) { ctx.strokeStyle = rgba(COL.green, 0.35); ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wdx(B.x - e.x), y + wdy(B.y - e.y)); ctx.stroke(); ctx.setLineDash([]); }
    ctx.strokeStyle = rgba(COL.green, 0.8); ctx.lineWidth = 2; ctx.strokeRect(x - 20, y - 26, 40, 46);
    ctx.save(); ctx.translate(x, y + 2); ctx.scale(0.8, 0.8); ET.physicist.draw(e, ctx, 0, 0); ctx.restore();
  },
  onDeath(e) { const B = e.boss_; if (B && !B.dead) { FX.text(B.x, B.y - 100, 'the friend is gone', PI_.green, { size: 18, font: 'serif', life: 1.4 }); Audio2.sfx('window'); Notes.obs('boss:apparatus', 'friendgone'); } },
};
