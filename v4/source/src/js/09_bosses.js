// ---------- boss kit: one scheduler runs every boss ----------
// A boss lists its attacks as data:
//   atk: { name: { dur, line, every (seconds, divided by phase speed), first, after, fire(b, sp), tick(b, dt, sp), start(b), end(b), draw(b, ctx) } }
//   pool: [[phase I attacks], [phase II], [phase III]] (shuffled, then dealt out)
// move(b, dt) runs first every step; returning false skips the attacks that step (rewinding, erasing, stunned).
const BK = {
  sp(b) { return b.phase >= 3 ? 1.25 : b.phase >= 2 ? 1.12 : 1; },
  update(b, dt, D) {
    if (D.move && D.move(b, dt) === false) return;
    if (!D.atk) return;
    const sp = D.speed ? D.speed(b) : this.sp(b);
    if (!b.atk) this.next(b, D);
    const A = D.atk[b.atk];
    b.at += dt; b.fire -= dt;
    if (A.tick) A.tick(b, dt, sp);
    if (A.every && b.fire <= 0 && b.at >= (A.after || 0)) { b.fire = A.every / sp; A.fire(b, sp); }
    if (b.at >= b.dur) { if (A.end) A.end(b); b.atk = null; }
  },
  next(b, D) {
    if (!b.queue || !b.queue.length) {
      const deck = D.pool[Math.min(b.phase, D.pool.length) - 1].slice();
      for (const x of D.extra || []) if (D.atk[x.id] && b.phase >= (x.phase || 1) && BK.hard(x.diff, b)) deck.push(x.id);
      b.queue = shuffle(deck);
    }
    const A = D.atk[b.atk = b.queue.shift()];
    b.at = 0; b.fire = A.first ?? 0.35; b.dur = A.dur;
    if (A.start) A.start(b);
    this.announce(b, b.atk, A.line);
  },
  // every attack is named on screen; the first time you ever see one, time slows so you can watch it
  announce(b, key, line) {
    const nm = (ATK_NAMES[b.type] || {})[key]; if (!nm) return;
    b.atkName = nm; b.atkNameT = 0; if (line) Game.bossLine(b, line);
    const id = b.type + ':' + key;
    Notes.obs('boss:' + b.type, String(key));
    if ((Game.mode === 'arcade' || Game.mode === 'tutorial') && !Bot.on && Save.d && !Save.d.seenAtk[id]) {
      Save.d.seenAtk[id] = 1; Save.write();
      Game.slowmo(CFG.boss.firstDur, CFG.boss.firstSlow); Game.banner('NEW ATTACK · ' + nm.toUpperCase(), line || '', CFG.boss.firstDur + 0.5);
    }
  },
  drawAtk(b, ctx, D) { const A = b.atk && D.atk && D.atk[b.atk]; if (A && A.draw) A.draw(b, ctx); },
  circle: (b, x, y, r) => (x - b.x) ** 2 + (y - b.y) ** 2 < r * r,
  // drift toward a moving target point
  glide(b, tx, ty, k, dt) { b.x += (tx - b.x) * damp(k, dt); b.y += (ty - b.y) * damp(k, dt); },
};

const ATK_NAMES = {
  observer: { gaze: 'The Gaze', rings: 'Iris Rings', tears: 'Tears', blink: 'Blink', stare: 'Stare' },
  laplace: { predict: 'Prediction', clockwork: 'Clockwork', rose: 'Rose Curve', lissajous: 'Lissajous', chaos: 'Logistic Chaos' },
  die: { 1: 'One · The Orb', 2: 'Two · Double Spiral', 3: 'Three · Laser Trine', 4: 'Four · Walls', 5: 'Five · Mines', 6: 'Six · Streams', crit: 'Natural 20', fumble: 'Natural 1' },
  maxwell: { effuse: 'Effusion', blackbody: 'Black Body', piston: 'Piston', shutter: 'Shutter', convect: 'Convection' },
  slit: { fringes: 'Fringes', huygens: 'Huygens Wavelets', diffract: 'Single Slit', photons: 'One Photon at a Time' },
  threebody: { orbit: 'Orbits', eight: 'Figure-Eight', sling: 'Slingshot', syzygy: 'Syzygy' },
  oscillator: { breathe: 'Breathing Mode', ladder: 'Ladder Operators', wave: 'Travelling Wave', collapse: 'Lowering Operator' },
  cyclotron: { spiral: 'Spiral', reverse: 'Field Reversal', arcs: 'Discharge', drift: 'E×B Drift', synchro: 'Synchrotron Light' },
  apparatus: { gamma: 'Gamma Ray', hammer: 'The Hammer', flask: 'The Flask Breaks', verdict: 'The Verdict' },
};
// ---------- quaternions (for the die) ----------
const Qn = {
  axis(ax, ay, az, ang) { const l = Math.hypot(ax, ay, az) || 1, s = Math.sin(ang / 2); return [Math.cos(ang / 2), ax / l * s, ay / l * s, az / l * s]; },
  mul(a, b) {
    return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  },
  norm(q) { const l = Math.hypot(...q) || 1; return q.map(v => v / l); },
  rot(q, v) {
    const [w, x, y, z] = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
    return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
  },
  fromTo(u, v) {
    const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    return d < -0.99999 ? [0, 1, 0, 0] : Qn.norm([1 + d, u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
  },
  slerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(v => -v); d = -d; }
    if (d > 0.9995) return Qn.norm(a.map((v, i) => v + (b[i] - v) * t));
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return a.map((v, i) => v * wa + b[i] * wb);
  },
};
// d6 geometry: faces with normals & pip layouts (opposite faces sum to 7)
const D6 = [
  { n: [0, 0, 1], v: 1, u: [1, 0, 0], w: [0, 1, 0] }, { n: [0, 0, -1], v: 6, u: [-1, 0, 0], w: [0, 1, 0] },
  { n: [1, 0, 0], v: 3, u: [0, 0, -1], w: [0, 1, 0] }, { n: [-1, 0, 0], v: 4, u: [0, 0, 1], w: [0, 1, 0] },
  { n: [0, 1, 0], v: 2, u: [1, 0, 0], w: [0, 0, -1] }, { n: [0, -1, 0], v: 5, u: [1, 0, 0], w: [0, 0, 1] },
];
const PIPS = { 1: [[0, 0]], 2: [[-.5, -.5], [.5, .5]], 3: [[-.5, -.5], [0, 0], [.5, .5]], 4: [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]], 5: [[-.5, -.5], [.5, -.5], [0, 0], [-.5, .5], [.5, .5]], 6: [[-.5, -.55], [.5, -.55], [-.5, 0], [.5, 0], [-.5, .55], [.5, .55]] };
// d20 geometry: the icosahedron, faces numbered so that opposite faces sum to 21
const D20 = (() => {
  const p = (1 + Math.sqrt(5)) / 2;
  const V = [[0, 1, p], [0, 1, -p], [0, -1, p], [0, -1, -p], [1, p, 0], [1, -p, 0], [-1, p, 0], [-1, -p, 0], [p, 0, 1], [p, 0, -1], [-p, 0, 1], [-p, 0, -1]].map(v => { const l = Math.hypot(...v); return v.map(c => c / l); });
  const e2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2, edge = e2(V[0], V[2]), F = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
    if ([[i, j], [j, k], [i, k]].every(([a, b]) => Math.abs(e2(V[a], V[b]) - edge) < 1e-3)) {
      const c = [0, 1, 2].map(m => (V[i][m] + V[j][m] + V[k][m]) / 3), l = Math.hypot(...c);
      F.push({ idx: [i, j, k], n: c.map(x => x / l), c, v: 0 });
    }
  }
  let next = 1;
  for (const f of F) { if (f.v) continue; const opp = F.find(g => !g.v && g !== f && Math.abs(g.n[0] + f.n[0]) + Math.abs(g.n[1] + f.n[1]) + Math.abs(g.n[2] + f.n[2]) < 1e-3); f.v = next; if (opp) opp.v = 21 - next; next++; }
  return { V, F };
})();

const BOSS_DEFS = {
  observer: {
    name: 'The Observer', sub: 'It cannot look away. Neither can you.', hp: 1450, r: 84, col: 'pink', score: 25000,
    short: 'Keep your cats out of its gaze. It is weak just after it blinks: that is when to hit it, in the pupil if you can.',
    how: 'Its gaze cone collapses any of your cats inside it, and it fires down that line. It also fires rings, cries falling tears, and blinks to summon physicists. It is armoured most of the time; while it cries, and right after it blinks or stares, it can barely see and takes far more damage. The pupil always takes double. It cannot be hurt while its eye is shut.',
    init(b) { b.x = W / 2; b.y = 300; b.open = 1; b.lookA = PI / 2; b.pupX = b.pupY = 0; b.gazeA = PI / 2; b.gazeT = 0; },
    speed: b => (b.phase >= 2 ? 1.3 : 1),
    pool: [['gaze', 'rings', 'tears', 'blink'], ['gaze', 'rings', 'tears', 'stare', 'blink', 'rings']],
    cones: b => (b.phase >= 2 ? [b.gazeA - 0.32, b.gazeA + 0.32] : [b.gazeA]),
    atk: {
      gaze: {
        dur: 5, after: 0.6, every: 0.16,
        tick(b, dt, sp) {
          b.gazeA += clamp(angDiff(b.gazeA, b.want), -0.85 * sp * dt, 0.85 * sp * dt);
          if ((b.gazeT -= dt) > 0 || b.at < 0.6) return;
          b.gazeT = 0.75;
          for (const ca of BOSS_DEFS.observer.cones(b)) Player.measureRegion(br => Math.abs(angDiff(ca, Math.atan2(br.py - b.y, br.px - b.x))) < 0.2, { x: b.x + Math.cos(ca) * 200, y: b.y + Math.sin(ca) * 200 }, 'IN SIGHT');
        },
        fire(b) { for (const ca of BOSS_DEFS.observer.cones(b)) { const a = ca + (Math.random() - 0.5) * 0.24; Bullets.fire(b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 80, Math.cos(a) * 470, Math.sin(a) * 470, { col: PI_.pink, r: 5.5, kind: 1 }); } },
        draw(b, ctx) {
          const k = clamp(b.at / 0.6, 0, 1);
          ctx.globalCompositeOperation = 'lighter';
          for (const ca of BOSS_DEFS.observer.cones(b)) {
            const g = ctx.createRadialGradient(b.x, b.y, 60, b.x, b.y, 1500); g.addColorStop(0, rgba(COL.pink, 0.32 * k)); g.addColorStop(1, rgba(COL.pink, 0));
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, 1500, ca - 0.2, ca + 0.2); ctx.closePath(); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        },
      },
      rings: { dur: 3.8, every: 0.62, fire(b, sp) { const p2 = b.phase >= 2; b.ringK = (b.ringK || 0) + 1; Bullets.ring(b.x, b.y, p2 ? 34 : 26, 150 * sp, { col: b.ringK % 2 ? PI_.red : PI_.pink, r: 7.5 }, b.ringK * 0.11 + b.t); if (p2) Bullets.ring(b.x, b.y, 10, 110, { col: PI_.yellow, r: 9, kind: 2, turn: 0.6 }, -b.t); Audio2.sfx('bossShot'); } },
      tears: { dur: 3.6, every: 0.085, fire(b) { const a = b.lookA + (Math.random() - 0.5) * 1.6; Bullets.fire(b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 50 + 30, rand(-140, 140), rand(-260, -120), { col: PI_.ice, r: rand(6, 10), gy: 300, life: 6, kind: chance(0.3) ? 2 : 0 }); } },
      blink: { dur: 2.2, line: 'It blinks, and summons graduate students. When it opens its eye it is dazzled.', tick(b) { if (b.at > 0.5 && !b.summoned) { b.summoned = true; for (let k = 0; k < (b.phase >= 2 ? 3 : 2); k++) Game.queueSpawn('physicist', b.x + rand(-260, 260), b.y + rand(120, 260), 0.6 + k * 0.2); } }, end(b) { b.summoned = false; b.dazzle = 3.2; Audio2.sfx('window'); } },
      stare: { dur: 4, every: 0.715, line: 'A long stare. Its eye dries out afterwards.', fire(b) { Bullets.aimAt(b.x, b.y, Game.tx, Game.ty, 330, { col: PI_.red, r: 7, kind: 1 }, 5, 0.5); Bullets.ring(b.x, b.y, 16, 120, { col: PI_.pink, r: 6, turn: 0.9 }, b.t * 2); Audio2.sfx('bossShot'); }, end(b) { b.dazzle = 2.4; Audio2.sfx('window'); } },
    },
    move(b, dt) {
      BK.glide(b, W / 2 + Math.sin(b.t * 0.23) * 560, 330 + Math.sin(b.t * 0.37) * 150, 1.2, dt); // a lissajous drift
      b.want = Math.atan2(Game.ty - b.y, Game.tx - b.x);
      b.lookA += angDiff(b.lookA, b.want) * damp(5, dt);
      b.pupX += (Math.cos(b.lookA) * 28 - b.pupX) * damp(8, dt); b.pupY += (Math.sin(b.lookA) * 22.4 - b.pupY) * damp(8, dt);
      b.open += ((b.atk === 'blink' && b.at > 0.15 && b.at < b.dur - 0.25 ? 0 : 1) - b.open) * damp(14, dt);
      b.invuln = b.open < 0.35; b.dazzle = Math.max(0, (b.dazzle || 0) - dt);
    },
    window: b => b.dazzle > 0 ? 'DAZZLED' : b.atk === 'tears' && b.at > 0.4 && 'CRYING',
    hit(b, x, y) {
      if (b.open < 0.35) return 0;
      const dx = x - b.x, dy = y - b.y;
      if ((dx * dx) / (84 * 84) + (dy * dy) / (72 * 72) > 1) return 0;
      return (dx - b.pupX) ** 2 + (dy - b.pupY) ** 2 < 900 ? 2 : 1;
    },
    draw(b, ctx) {
      BK.drawAtk(b, ctx, this);
      const t = b.t, p2 = b.phase >= 2, ry = 72 * Math.max(0.04, b.open);
      halo(ctx, PI_.pink, b.x, b.y, 140, 0.35);
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.beginPath(); ctx.ellipse(0, 0, 86, ry, 0, 0, TAU); ctx.save(); ctx.clip(); // the eye opening
      const sg = ctx.createRadialGradient(-20, -20, 10, 0, 0, 90); sg.addColorStop(0, '#a9a1c9'); sg.addColorStop(0.7, p2 ? '#7a4a63' : '#5d5585'); sg.addColorStop(1, p2 ? '#4a1830' : '#2c2650');
      ctx.fillStyle = sg; ctx.fillRect(-90, -80, 180, 160);
      if (p2) { ctx.strokeStyle = 'rgba(200,20,50,.55)'; ctx.lineWidth = 1.6; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 88, Math.sin(a) * 74); ctx.quadraticCurveTo(Math.cos(a + 0.2) * 60, Math.sin(a + 0.25) * 52, Math.cos(a - 0.1) * 42, Math.sin(a - 0.1) * 36); ctx.stroke(); } }
      const px = b.pupX, py = b.pupY; // the iris shows every phase at once
      for (let k = 0; k < 32; k++) { ctx.fillStyle = PAL_CSS[(k + Math.floor(t * 8)) % 32]; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 36, k / 32 * TAU, (k + 1.08) / 32 * TAU); ctx.closePath(); ctx.fill(); }
      dot(ctx, px, py, 36, 'rgba(12,10,24,.45)'); ctx.strokeStyle = 'rgba(12,10,24,.8)'; ctx.lineWidth = 3; ctx.stroke();
      dot(ctx, px, py, (b.dazzle > 0 ? 7 : 15 + 3 * Math.sin(t * 2.3)) + (b.atk === 'gaze' ? -4 : 0), '#05040b'); dot(ctx, px - 9, py - 10, 4, 'rgba(255,255,255,.8)');
      if (b.dazzle > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.08 * Math.sin(t * 18)})`; ctx.fillRect(-90, -80, 180, 160); ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore();
      ctx.strokeStyle = PAL_CSS[PI_.pink]; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 86, ry, 0, 0, TAU); ctx.stroke(); // lids and lashes
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let k = 0; k < 9; k++) { const a = PI + (k + 1) / 10 * PI, lx = Math.cos(a) * 86, ly = Math.sin(a) * ry; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx * 1.16, ly - 14 - 6 * Math.abs(Math.sin(a))); ctx.stroke(); }
      ctx.restore();
    },
    onDeath(b) { FX.text(b.x, b.y - 110, 'OBSERVER COLLAPSED', PI_.pink, { size: 30, life: 2.4, vy: -20 }); },
  },

  laplace: {
    name: 'Laplace’s Demon', sub: 'Knows every force in the universe. Aims at your expectation value.', hp: 2350, r: 90, col: 'gold', score: 40000,
    short: 'Change direction when the crosshair appears. A missed prediction leaves it confused and weak.',
    how: 'Fires where it predicts you will be (watch the crosshairs) and sweeps clock-hand lasers. It is armoured, but when one of its predictions misses (no cat near the crosshair when the shots arrive) it is confused for a few seconds and takes far more damage. So change direction once the crosshair appears. Below half health it rewinds time and every bullet on screen reverses.',
    init(b) {
      Object.assign(b, { x: W / 2, y: 340, handA: [0, 0, 0], logistic: 0.4123, rewindT: 0, rewindCd: 3, preds: [] });
      b.glyphs = ['F = ma', 'ẍ = −∇V', 'δS = 0', 'L = T − V', 'ṗ = −∂H/∂q', 'x(t + dt)', 'dS/dt ≥ 0', '∂ₜρ + ∇·J = 0', 'ω = dθ/dt', 'q̇ = ∂H/∂p'].map((s, k) => ({ s, a: k / 10 * TAU, r: 150 + (k % 3) * 22 }));
    },
    pool: [['predict', 'clockwork', 'rose', 'lissajous'], ['predict', 'clockwork', 'rose', 'lissajous'], ['predict', 'chaos', 'clockwork', 'rose', 'chaos']],
    // clock hands: [length, half-width, sweep speed]; the long one is double-ended
    hands: [[440, 6, 0.18], [760, 5, 0.55], [1000, 4, 1.3]],
    atk: {
      predict: {
        dur: 4.2, every: 0.75, line: 'I know where you will be.',
        fire(b) { // lead the target: classical extrapolation of ⟨x⟩
          const tt = Math.hypot(Game.tx - b.x, Game.ty - b.y) / 420, px = Game.tx + Player.vx * tt, py = Game.ty + Player.vy * tt, dl = 0.32 * Game.tele(true);
          b.preds.push({ x: px, y: py, t: 0.35, check: dl + tt / Game.bulletSpeedMul });
          for (let k = 0; k < 5; k++) {
            const i = Bullets.fire(b.x, b.y, 0, 0, { col: PI_.gold, r: 7, kind: 1, delay: dl + k * 0.06, life: 6 });
            if (i >= 0) { const a = Math.atan2(py - b.y, px - b.x) + (Math.random() - 0.5) * 0.05, s = (420 + k * 25) * Game.bulletSpeedMul; EB.vx[i] = Math.cos(a) * s; EB.vy[i] = Math.sin(a) * s; }
          }
          Audio2.sfx('bossShot');
        },
      },
      clockwork: {
        dur: 5.5, every: 0.5, after: 1, line: 'Clockwork universe.',
        // only the longest hand is double-ended, and only in the last phase: there is always a safe sector
        beams(b) { const out = []; BOSS_DEFS.laplace.hands.forEach(([L, w], k) => { for (const s of k === 2 && b.phase >= 3 ? [0, PI] : [0]) out.push([b.handA[k] + s, L, w]); }); return out; },
        warn: () => 0.9 * Game.tele(true),
        tick(b) { if (b.at >= this.warn()) for (const [a, L, w] of this.beams(b)) Game.beamHit(b.x, b.y, a, L, w, b); },
        fire(b) { Bullets.ring(b.x, b.y, 10, 130, { col: PI_.amber, r: 6 }, b.t); },
        draw(b, ctx) { for (const [a, L, w] of this.beams(b)) Tele.beam(ctx, b.x, b.y, a, L, w, COL.gold, b.at < this.warn() ? 1 : 2, b.t); },
      },
      rose: {
        dur: 4.6, every: 2.1, line: 'r = cos(kθ)',
        fire(b) {
          const k = pick([3, 4, 5, 7]);
          for (let i = 0; i < 72; i++) { const th = i / 72 * TAU, r = Math.abs(Math.cos(k * th)) * 150 + 18, s = 70 + r * 1.1; Bullets.fire(b.x + Math.cos(th) * r, b.y + Math.sin(th) * r, Math.cos(th) * s, Math.sin(th) * s, { col: i % 2 ? PI_.gold : PI_.amber, r: 6, delay: 0.6, life: 7 }); }
          FX.text(b.x, b.y - 120, 'r = cos(' + k + 'θ)', PI_.gold, { size: 20, font: 'serif', life: 1.4 }); Audio2.sfx('bossShot');
        },
      },
      lissajous: { dur: 4.2, every: 0.05, line: 'Harmonic motion.', fire(b) { const a1 = Math.sin(b.at * 3) * 1.4 + PI / 2, a2 = Math.sin(b.at * 2 + PI / 2) * 1.4 + PI / 2; for (const a of [a1, a2, a1 + PI, a2 + PI]) Bullets.fire(b.x, b.y, Math.cos(a) * 230, Math.sin(a) * 230, { col: PI_.yellow, r: 5.5, kind: 1, life: 7 }); } },
      chaos: { dur: 4.5, every: 0.045, line: 'Logistic map, r = 3.99', fire(b) { b.logistic = 3.99 * b.logistic * (1 - b.logistic); const a = b.logistic * TAU * 2; for (const o of [0, TAU / 3, 2 * TAU / 3]) Bullets.fire(b.x, b.y, Math.cos(a + o) * 210, Math.sin(a + o) * 210, { col: PI_.orange, r: 6, life: 7 }); } },
    },
    move(b, dt) {
      if (b.rewindT > 0) { if ((b.rewindT -= Game.realDt) <= 0) Game.post.rewind = 0; return false; }
      BK.glide(b, W / 2 + Math.sin(b.t * 0.31) * 480, 360 + Math.sin(b.t * 0.62) * 160, 1, dt);
      this.hands.forEach((h, k) => { b.handA[k] += dt * h[2] * (b.atk === 'clockwork' ? 1 : 0.4) * BK.sp(b); });
      for (const g of b.glyphs) g.a += dt * 0.35;
      b.confused = Math.max(0, (b.confused || 0) - dt);
      for (let i = b.preds.length - 1; i >= 0; i--) {
        const p = b.preds[i]; p.t -= dt;
        if (p.check !== undefined && (p.check -= dt) <= 0) { // did the prediction land on a cat?
          p.check = undefined;
          if (!Player.dead && !Player.near(p.x, p.y, 140).length && b.confused <= 0) { b.confused = 2.6; FX.text(b.x, b.y - 120, 'miscalculated', PI_.gold, { size: 20, font: 'serif', life: 1.4 }); Audio2.sfx('window'); }
        }
        if (p.t < -0.4 && p.check === undefined) b.preds.splice(i, 1);
      }
      if (b.phase >= 2 && (b.rewindCd -= dt) <= 0 && b.atk !== 'clockwork') { b.rewindCd = 13; this.rewind(b); return false; }
    },
    rewind(b) {
      b.rewindT = 2.2; Game.post.rewind = 1;
      for (let i = 0; i < EB.n; i++) { EB.vx[i] *= -1.15; EB.vy[i] *= -1.15; EB.life[i] = Math.max(EB.life[i], 4); }
      b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.035);
      Game.banner('◀◀ REWIND', 'Restoring a previous state of the universe', 1.6); Audio2.sfx('rewind');
    },
    hit: (b, x, y) => (BK.circle(b, x, y, 88) ? 1 : 0),
    window: b => b.confused > 0 && b.rewindT <= 0 && 'CONFUSED',
    draw(b, ctx) {
      const x = b.x, y = b.y;
      for (const p of b.preds) { // predicted positions
        const k = clamp(p.t / 0.35, 0, 1), a = 0.25 + 0.5 * (1 - k);
        Tele.line(ctx, x, y, p.x, p.y, COL.gold, a, 1.4, [4, 7]);
        ctx.strokeStyle = rgba(COL.gold, a); ctx.beginPath(); ctx.arc(p.x, p.y, 16 + 10 * k, 0, TAU); ctx.moveTo(p.x - 26, p.y); ctx.lineTo(p.x + 26, p.y); ctx.moveTo(p.x, p.y - 26); ctx.lineTo(p.x, p.y + 26); ctx.stroke();
      }
      BK.drawAtk(b, ctx, this);
      ctx.font = 'italic 400 17px Qtext, Qmath, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = rgba(COL.gold, 0.7);
      for (const g of b.glyphs) ctx.fillText(g.s, x + Math.cos(g.a) * g.r, y + Math.sin(g.a) * g.r * 0.62); // orbiting equations
      halo(ctx, PI_.gold, x, y, 160);
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#2a1f10'; ctx.strokeStyle = PAL_CSS[PI_.gold]; ctx.lineWidth = 3;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 40, -74); ctx.quadraticCurveTo(s * 70, -120, s * 96, -138); ctx.quadraticCurveTo(s * 72, -100, s * 66, -60); ctx.closePath(); ctx.fill(); ctx.stroke(); } // horns
      dot(ctx, 0, 0, 88, '#17120a'); ctx.lineWidth = 5; ctx.stroke(); ctx.lineWidth = 2;
      for (let k = 0; k < 60; k++) { const a = k / 60 * TAU, r0 = k % 5 ? 80 : 72; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * 86, Math.sin(a) * 86); ctx.stroke(); }
      ctx.font = '600 13px Qtext, serif'; ctx.fillStyle = PAL_CSS[PI_.gold];
      ['XII', ...ROMAN.slice(1, 11), 'XI'].forEach((n, k) => { const a = k / 12 * TAU - PI / 2; ctx.fillText(n, Math.cos(a) * 61, Math.sin(a) * 61); });
      ctx.fillStyle = b.confused > 0 ? (Math.sin(b.t * 20) > 0 ? '#fff' : '#9a93c4') : b.rewindT > 0 ? '#4cf2ff' : b.phase >= 3 ? '#ff3b55' : '#ffcf4a';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 26, -18, 14, 4.5, s * 0.3, 0, TAU); ctx.fill(); } // eyes
      ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
      [[34, 5], [52, 3.5], [64, 1.6]].forEach(([l, w], k) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(b.handA[k]) * l, Math.sin(b.handA[k]) * l); ctx.stroke(); });
      dot(ctx, 0, 0, 6, PAL_CSS[PI_.gold]);
      ctx.restore();
      if (b.rewindT > 0) { ctx.font = '700 28px Qmono, monospace'; ctx.fillStyle = '#4cf2ff'; ctx.fillText('◀◀', x, y + 120); }
      if (b.confused > 0) { ctx.font = 'italic 400 26px Qtext, Qmath, serif'; ctx.fillStyle = '#fff'; for (let k = 0; k < 3; k++) ctx.fillText('?', x + Math.cos(b.t * 3 + k * 2.1) * 110, y - 100 + Math.sin(b.t * 5 + k) * 10); }
    },
    onDeath(b) {
      const G = ['∫', '∂', 'Σ', 'π', 'ℏ', 'ψ', '∇', 'λ', 'Δ', 'ω', '∞', '≈', 'θ', 'φ'];
      for (let k = 0; k < 40; k++) { const a = Math.random() * TAU, s = rand(120, 460); FX.text(b.x, b.y, pick(G), pick([PI_.gold, PI_.amber, PI_.white]), { vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rand(16, 34), font: 'serif', life: rand(1.2, 2.2), vr: rand(-6, 6), drag: 1.2 }); }
      FX.text(b.x, b.y - 130, '“But… I computed everything.”', PI_.gold, { size: 22, font: 'serif', life: 2.6, vy: -14 });
    },
  },

  die: {
    name: 'The Celestial Die', sub: 'Einstein said God does not play dice. Nobody told the dice.', hp: 2900, r: 92, col: 'white', score: 60000,
    short: 'Hit it the moment it lands, before the attack gets going. A natural 1 stuns it.',
    how: 'Tumbles around the arena, then attacks according to the number it rolls: 1 one huge orb that bursts, 2 a double spiral, 3 three rotating lasers, 4 walls of bullets with one gap, 5 homing mines, 6 six fast streams. Below 30% health it becomes a d20. It is armoured while it tumbles: hit it as it lands and for a moment afterwards. A natural 1 stuns it, and it stays weak while stunned. A natural 20 fills the screen.',
    init(b) {
      Object.assign(b, { x: W / 2, y: H / 2 - 150, q: Qn.axis(1, 1, 0, 0.6), state: 'roll', st: 1.4, result: 0, vx: rand(-1, 1) * 420, vy: rand(-1, 1) * 420, spinAx: [Math.random(), Math.random(), Math.random()], spin: 9, shape: 'd6', stun: 0, rolls: [] });
    },
    move(b, dt) {
      if (b.phase >= 3 && b.shape === 'd6') { b.shape = 'd20'; Game.banner('CRITICAL PHASE', 'The die has become a d20', 2); FX.ring(b.x, b.y, 30, 400, 0.8, PI_.white, 6); addTrauma(0.6); Audio2.sfx('bossPhase'); }
      if (b.stun > 0) { b.stun -= dt; b.q = Qn.mul(Qn.axis(0, 0, 1, dt * 0.5), b.q); return; }
      b.st -= dt;
      if (b.state === 'roll') {
        b.x += b.vx * dt; b.y += b.vy * dt;
        const hit = (b.x < 120 || b.x > W - 120) ? 'x' : (b.y < 120 || b.y > H - 120) ? 'y' : null;
        if (hit) { b['v' + hit] *= -1; b.x = clamp(b.x, 120, W - 120); b.y = clamp(b.y, 120, H - 120); addTrauma(0.2); Grid.impulse(b.x, b.y, 500, 220); Audio2.sfx('thud'); }
        b.q = Qn.norm(Qn.mul(Qn.axis(...b.spinAx, b.spin * dt), b.q));
        if (b.st <= 0) {
          b.result = 1 + Math.floor(Math.random() * (b.shape === 'd20' ? 20 : 6));
          const f = (b.shape === 'd20' ? D20.F : D6).find(g => g.v === b.result);
          b.qFrom = b.q; b.qTo = Qn.norm(Qn.mul(Qn.fromTo(Qn.rot(b.q, f.n), [0, 0, 1]), b.q));
          b.state = 'land'; b.st = 0.45;
        }
      } else if (b.state === 'land') {
        b.vx *= Math.exp(-6 * dt); b.vy *= Math.exp(-6 * dt); b.x += b.vx * dt; b.y += b.vy * dt;
        b.q = Qn.slerp(b.qFrom, b.qTo, easeOutCubic(1 - b.st / 0.45));
        if (b.st <= 0) this.land(b);
      } else {
        b.at += dt; b.fire -= dt;
        this.P[b.pattern](b, dt, b.shape === 'd20' ? 1.25 : 1, Game.tx, Game.ty);
        if (b.pattern2) { const s = b.shadow; s.x = b.x; s.y = b.y; s.at = b.at; s.fire -= dt; s.phase = b.phase; this.P[b.pattern2](s, dt, 1, Game.tx, Game.ty); }
        if (b.at >= b.dur) {
          const a = Math.random() * TAU, s = rand(380, 560);
          Object.assign(b, { state: 'roll', st: b.explode ? 0.4 : b.phase >= 2 ? 1.0 : 1.4, pattern2: null, explode: false, vx: Math.cos(a) * s, vy: Math.sin(a) * s, spinAx: [rand(-0.5, 0.5), rand(-0.5, 0.5), rand(-0.5, 0.5)], spin: rand(8, 13) });
        }
      }
    },
    land(b) {
      const n = b.result, d20 = b.shape === 'd20', crit = d20 && (n === 20 || n === 1);
      Object.assign(b, { q: b.qTo, state: 'act', at: 0, fire: 0.2, one: false, oneBurst: false, mines: false, dur: crit ? (n === 1 ? 3 : 5) : 3.6, pattern: d20 ? (n === 20 ? 'crit' : n === 1 ? 'fumble' : ((n - 1) % 6) + 1) : n });
      b.rolls.push(n); Game.stats.dieRolls = b.rolls.slice(-12); BK.announce(b, b.pattern); Audio2.sfx('window');
      Game.banner(crit ? (n === 20 ? 'NATURAL 20' : 'NATURAL 1') : 'ROLLED ' + n, crit ? (n === 20 ? 'Critical hit.' : 'Critical fumble. It hurt itself.') : '', 1.2);
      Audio2.sfx('roll', n); FX.ring(b.x, b.y, 40, 200, 0.5, PI_.white, 4);
      if (b.pattern === 'fumble') { b.hp -= b.maxHp * 0.08; b.stun = 3; b.flash = 0.5; addTrauma(0.5); FX.burst(b.x, b.y, 60, 400, [PI_.white, PI_.gold], { life: 0.9 }); }
    },
    // one attack per face (the d20 maps its faces onto these, plus a crit and a fumble)
    P: {
      1(b, dt, mul, tx, ty) {
        if (!b.one) { b.one = true; const a = Math.atan2(ty - b.y, tx - b.x); Bullets.fire(b.x, b.y, Math.cos(a) * 170, Math.sin(a) * 170, { col: PI_.white, r: 34, kind: 2, life: 2.4 }); }
        if (b.at > 2.3 && !b.oneBurst) {
          b.oneBurst = true;
          const i = Bullets.biggest(30); if (i < 0) return;
          const x = EB.x[i], y = EB.y[i]; EB.kill(i);
          Bullets.ring(x, y, Math.round(44 * mul), 170, { col: PI_.white, r: 7 }); Bullets.ring(x, y, 22, 110, { col: PI_.gold, r: 9, kind: 2 }, 0.1);
          FX.ring(x, y, 10, 160, 0.4, PI_.white, 4); addTrauma(0.3); Audio2.sfx('boom');
        }
      },
      2(b, dt, mul) { if (b.fire <= 0) { b.fire = 0.06 / mul; for (const s of [1, -1]) for (const o of [0, PI]) { const a = b.at * 2.6 * s + o; Bullets.fire(b.x, b.y, Math.cos(a) * 200, Math.sin(a) * 200, { col: s > 0 ? PI_.ice : PI_.pink, r: 6 }); } } },
      3(b, dt, mul) {
        b.laserA = (b.laserA || 0) + dt * 0.75 * mul;
        if (b.at < 0.8 * Game.tele(true)) return;
        for (let k = 0; k < 3; k++) Game.beamHit(b.x, b.y, b.laserA + k * TAU / 3, 1500, 9, b);
        if (b.fire <= 0) { b.fire = 0.7; Bullets.ring(b.x, b.y, 9, 130, { col: PI_.white, r: 6 }, b.laserA); }
      },
      4(b, dt, mul) {
        if (b.fire > 0) return;
        b.fire = 0.95 / mul;
        const side = (b.wallK = (b.wallK || 0) + 1) % 4, gap = rand(0.2, 0.8), n = 26, o = { col: PI_.red, r: 8, life: 10 }, gw = 0.09 * Game.D.gap;
        for (let k = 0; k < n; k++) {
          const f = (k + 0.5) / n; if (Math.abs(f - gap) < gw) continue;
          [() => Bullets.fire(f * W, 10, 0, 150, o), () => Bullets.fire(W - 10, f * H, -150, 0, o), () => Bullets.fire(f * W, H - 10, 0, -150, o), () => Bullets.fire(10, f * H, 150, 0, o)][side]();
        }
        Audio2.sfx('bossShot');
      },
      5(b, dt, mul) { if (!b.mines) { b.mines = true; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; Bullets.fire(b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90, Math.cos(a) * 120, Math.sin(a) * 120, { col: PI_.orange, r: 11, kind: 3, life: 4.2 * mul, mine: true }); } Audio2.sfx('bossShot'); } },
      6(b, dt, mul, tx, ty) { if (b.fire <= 0) { b.fire = 0.09 / mul; const base = Math.atan2(ty - b.y, tx - b.x) + Math.sin(b.at * 2) * 0.6; for (let k = 0; k < 6; k++) { const a = base + k * TAU / 6; Bullets.fire(b.x, b.y, Math.cos(a) * 300, Math.sin(a) * 300, { col: PI_.yellow, r: 5.5, kind: 1 }); } } },
      crit(b) {
        if (b.fire > 0) return;
        b.fire = 0.16;
        const gapX = W / 2 + Math.sin(b.at * 0.9) * W * 0.32, gw = 120 * Game.D.gap;
        for (let x = 30; x < W; x += 52) if (Math.abs(x - gapX) >= gw) Bullets.fire(x + rand(-8, 8), 5, rand(-10, 10), 260, { col: PI_.red, r: 7, kind: 1, life: 6 });
        if (Math.floor(b.at / 0.8) !== b.critK) { b.critK = Math.floor(b.at / 0.8); Bullets.ring(b.x, b.y, 30, 150, { col: PI_.white, r: 7 }, b.at); }
      },
      fumble() {},
    },
    hit: (b, x, y) => (BK.circle(b, x, y, 90) ? 1 : 0),
    window: b => b.stun > 0 ? 'STUNNED' : (b.state === 'land' || b.state === 'act' && b.at < 1.1 * Game.tele(true)) && 'LANDED',
    draw(b, ctx) {
      const S = 66, x = b.x, y = b.y;
      if (b.state === 'act' && b.pattern === 3) for (let k = 0; k < 3; k++) Tele.beam(ctx, x, y, b.laserA + k * TAU / 3, 1500, 9, COL.white, b.at < 0.8 * Game.tele(true) ? 1 : 2, b.t);
      halo(ctx, b.stun > 0 ? PI_.red : PI_.violet, x, y, 160, 0.3);
      const proj = v => { const p = Qn.rot(b.q, v), f = 5 / (5 - p[2] * 0.6); return [x + p[0] * S * f, y - p[1] * S * f, p[2]]; };
      const poly = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
      const visible = F => F.map(f => ({ f, n: Qn.rot(b.q, f.n) })).filter(o => o.n[2] > 0.001).sort((a, c) => a.n[2] - c.n[2]);
      if (b.shape === 'd6') {
        for (const { f, n } of visible(D6)) {
          const c = f.n, u = f.u, w = f.w, at = (s, t) => proj([0, 1, 2].map(m => c[m] + u[m] * s + w[m] * t));
          poly([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => at(s, t)));
          const sh = 0.25 + 0.55 * n[2];
          ctx.fillStyle = `rgba(${22 + 30 * sh},${18 + 22 * sh},${44 + 50 * sh},0.97)`; ctx.fill(); ctx.strokeStyle = 'rgba(176,128,255,.9)'; ctx.lineWidth = 3; ctx.stroke();
          for (const [ps, pt] of PIPS[f.v]) { const p = at(ps, pt); dot(ctx, p[0], p[1], (f.v === 1 ? 13 : 8.5) * Math.sqrt(n[2]), f.v === 1 ? PAL_CSS[PI_.red] : '#d9d3f3'); }
        }
      } else {
        for (const { f, n } of visible(D20.F)) {
          poly(f.idx.map(i => proj(D20.V[i].map(c => c * 1.25))));
          const sh = 0.25 + 0.6 * n[2];
          ctx.fillStyle = `rgba(${40 + 60 * sh},${16 + 20 * sh},${50 + 60 * sh},0.97)`; ctx.fill(); ctx.strokeStyle = PAL_CSS[(f.v * 3) % 32]; ctx.lineWidth = 2.5; ctx.stroke();
          if (n[2] > 0.3) { const c = proj(f.c.map(v => v * 1.25)); ctx.font = `700 ${Math.round(22 * n[2])}px Qtext, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = f.v === 20 ? PAL_CSS[PI_.gold] : f.v === 1 ? PAL_CSS[PI_.red] : '#fff'; ctx.fillText(String(f.v), c[0], c[1]); }
        }
      }
      if (b.stun > 0) { ctx.font = '700 18px Qmono, monospace'; ctx.fillStyle = PAL_CSS[PI_.red]; ctx.textAlign = 'center'; ctx.fillText('STUNNED', x, y - 110); }
    },
    onDeath(b) {
      for (let k = 0; k < 60; k++) FX.spawn(b.x + rand(-60, 60), b.y + rand(-60, 60), rand(-400, 400), rand(-400, 400), rand(0.8, 1.6), rand(5, 10), pick([PI_.white, PI_.red, PI_.gold]), 2, 1.5);
      FX.text(b.x, b.y - 130, 'Alea iacta est.', PI_.white, { size: 26, font: 'serif', life: 2.6, vy: -14 });
    },
  },
};
