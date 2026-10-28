// ---------- bosses III: oscillation, fields, and the box itself ----------

// ===== The Harmonic Oscillator: springs, and bullets that always come back =====
const HO_K = (TAU / 5.6) ** 2; // spring bullets return to where they were fired every 2.8 s
const HO_Y = H / 2;
function zigzag(ctx, x0, y0, x1, y1, coils, amp) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, n = coils * 2;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let k = 1; k < n; k++) { const f = k / n, s = (k % 2 ? 1 : -1) * amp; ctx.lineTo(x0 + dx * f + nx * s, y0 + dy * f + ny * s); }
  ctx.lineTo(x1, y1); ctx.stroke();
}
function drawOrb(ctx, x, y, n, t, s = 1, hurt) {
  halo(ctx, PI_.magenta, x, y, 110 * s, 0.5);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.2 * s;
  for (let k = 0; k <= n; k++) { ctx.strokeStyle = rgba(COL.pink, 0.5 - k * 0.06); ring(ctx, x, y, (40 + 22 * Math.sqrt(2 * k + 1)) * s * (1 + 0.04 * Math.sin(t * 3 + k))); ctx.stroke(); } // |ψₙ|² has n+1 bright lobes
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(x - 10 * s, y - 10 * s, 3 * s, x, y, 34 * s); g.addColorStop(0, '#fff'); g.addColorStop(0.5, hurt ? '#ff8ab0' : '#ff3fb4'); g.addColorStop(1, '#5a0f45');
  dot(ctx, x, y, 34 * s, g);
  ctx.font = fontSerif(17 * s, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('|' + n + '⟩', x, y + 6 * s);
}
const spring = (x, y, k = HO_K) => ({ x, y, k });
BOSS_DEFS.oscillator = {
  name: 'The Harmonic Oscillator', sub: 'Every problem in physics is one of these, if you squint hard enough.', hp: 3500, r: 50, col: 'magenta', score: 140000,
  short: 'Its bullets come back to where they were fired. Hit it at the ends of its swing, where it stops.',
  how: 'An orb on two springs, swinging back and forth. Every bullet it fires is on a spring too: it flies out, stops, and comes back through the point it was fired from, all at the same moment, because that is what harmonic means. Ladder attacks fire shells at the quantum energy levels, wave attacks ripple two strings of bullets past you, and collapse attacks pull a ring inward. Later it is driven at resonance and fires every time it whips through the middle. It is armoured while it moves fast: hit it at the turning points at either end of its swing (marked), where it almost stops.',
  init(b) { Object.assign(b, { x: W / 2, y: HO_Y, A: 300, ph: 0, axis: 0.15, lv: 2, lastS: 1 }); },
  pool: [['breathe', 'ladder', 'wave', 'collapse'], ['breathe', 'ladder', 'wave', 'collapse', 'ladder']],
  atk: {
    breathe: { dur: 4.6, every: 0.8, line: 'x(t) = A cos ωt. Everything comes back.', fire(b) { const k = Math.floor(b.at / 0.8); for (let j = 0; j < 20; j++) { const a = j / 20 * TAU + k * 0.16, v = j % 2 ? 200 : 300; Bullets.fire(b.x, b.y, Math.cos(a) * v, Math.sin(a) * v, { col: j % 2 ? PI_.pink : PI_.magenta, r: 6.5, life: 8.4, spring: spring(b.x, b.y) }); } Audio2.sfx('bossShot'); } },
    ladder: {
      dur: 5.2, every: 2.3, line: 'a†|n⟩ = √(n+1) |n+1⟩',
      fire(b) {
        b.lv = Math.min(b.phase >= 3 ? 6 : 5, b.lv + 1);
        for (let n = 0; n <= b.lv; n++) { const v = 92 * Math.sqrt(2 * n + 1), m = 10 + n * 2; for (let j = 0; j < m; j++) { const a = j / m * TAU + n * 0.4; Bullets.fire(b.x, b.y, Math.cos(a) * v, Math.sin(a) * v, { col: n % 2 ? PI_.violet : PI_.pink, r: 6, life: 7, spring: spring(b.x, b.y) }); } }
        FX.text(b.x, b.y - 110, 'E = (' + b.lv + ' + ½) ℏω', PI_.pink, { size: 18, font: 'serif', life: 1.4 }); Audio2.sfx('bossShot');
      },
    },
    wave: {
      dur: 5.4, every: 2.6, line: 'Coupled oscillators: a travelling wave.',
      fire(b) {
        const K2 = (TAU / 2.4) ** 2, w = Math.sqrt(K2), kx = TAU / 520, A = 115;
        for (const off of [-235, 235]) { const yl = clamp(Player.y + off, 90, H - 90); for (let x = 50; x < W - 40; x += 66) { const d = -kx * x + b.at; Bullets.fire(x, yl + A * Math.sin(d), 0, A * w * Math.cos(d), { col: PI_.violet, r: 6.5, life: 6.5, delay: 0.55 * Game.tele(true), spring: spring(x, yl, K2) }); } }
        Audio2.sfx('charge');
      },
    },
    collapse: { dur: 4.2, every: 1.3, line: 'a|n⟩ = √n |n−1⟩', fire(b) { const R0 = 300 + Math.floor(b.at / 1.3) % 3 * 80; for (let j = 0; j < 24; j++) { const a = j / 24 * TAU; Bullets.fire(b.x + Math.cos(a) * R0, b.y + Math.sin(a) * R0, 0, 0, { col: PI_.pink, r: 6.5, life: 5.5, delay: 0.5 * Game.tele(true), spring: spring(b.x, b.y, HO_K * 0.8) }); } } },
  },
  move(b, dt) {
    const sp = BK.sp(b);
    b.A += ((b.phase >= 3 ? 520 : b.phase >= 2 ? 420 : 330) - b.A) * damp(0.4, dt);
    b.ph += dt * 0.62 * sp; b.axis += dt * 0.11;
    const s = Math.cos(b.ph);
    b.x = W / 2 + Math.cos(b.axis) * s * b.A + Math.sin(b.t * 23) * 2.5; // zero-point jitter: it never quite rests
    b.y = HO_Y + Math.sin(b.axis) * s * b.A * 0.7 + (b.phase >= 3 ? Math.sin(2 * b.ph) * 170 : 0) + Math.cos(b.t * 19) * 2.5;
    if (b.phase >= 2 && Math.sign(s) !== Math.sign(b.lastS)) Bullets.aimAt(b.x, b.y, Game.tx, Game.ty, 300, { col: PI_.white, r: 6.5, kind: 1 }, 5, 0.5); // driven at resonance
    b.lastS = s;
  },
  hit: (b, x, y) => (BK.circle(b, x, y, 50) ? 1 : 0),
  window: b => Math.abs(Math.cos(b.ph)) > 0.88 && 'TURNING POINT',
  draw(b, ctx) {
    const c = Math.cos(b.axis), sn = Math.sin(b.axis), L = b.A + 260, at = (s, v) => [W / 2 + c * s + sn * (v - 140), HO_Y + sn * s * 0.7 - c * (v - 140)];
    ctx.strokeStyle = 'rgba(255,96,200,.16)'; ctx.lineWidth = 2; ctx.beginPath(); // the potential well it lives in
    for (let k = -30; k <= 30; k++) { const s = k / 30 * L, [x, y] = at(s, (s / L) ** 2 * 260); ctx.lineTo(x, y); }
    ctx.stroke();
    for (let n = 0; n <= 5; n++) { const v = (n + 0.5) / 6 * 260, s = Math.sqrt(v / 260) * L, p = at(-s, v), q = at(s, v); ctx.strokeStyle = n === Math.min(5, b.lv) ? 'rgba(255,96,200,.55)' : 'rgba(255,96,200,.12)'; ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke(); }
    const a1 = [W / 2 - c * L, HO_Y - sn * L * 0.7], a2 = [W / 2 + c * L, HO_Y + sn * L * 0.7];
    ctx.strokeStyle = 'rgba(236,231,255,.7)'; ctx.lineWidth = 2.5; zigzag(ctx, ...a1, b.x, b.y, 14, 12); zigzag(ctx, b.x, b.y, ...a2, 14, 12);
    for (const [x, y] of [a1, a2]) { dot(ctx, x, y, 12, '#2a2140'); ctx.strokeStyle = PAL_CSS[PI_.pink]; ctx.stroke(); }
    for (const sd of [-1, 1]) { const tx = W / 2 + c * sd * b.A, ty = HO_Y + sn * sd * b.A * 0.7; Tele.ring(ctx, tx, ty, 62, COL.white, Math.abs(Math.cos(b.ph)) > 0.88 && Math.sign(Math.cos(b.ph)) === sd ? 0.9 : 0.25, [5, 7], 2); } // turning points
    drawOrb(ctx, b.x, b.y, b.lv, b.t, 1, b.flash > 0);
    if (Math.abs(Math.cos(b.ph)) > 0.88) halo(ctx, PI_.white, b.x, b.y, 90, 0.5);
  },
  iconDraw(b, ctx, t) { const x = Math.cos(t * 1.4) * 40; ctx.strokeStyle = 'rgba(236,231,255,.7)'; ctx.lineWidth = 2; zigzag(ctx, -118, 0, x, 0, 8, 7); zigzag(ctx, x, 0, 118, 0, 8, 7); drawOrb(ctx, x, 0, 2, t, 0.62); },
  onDeath(b) {
    for (let k = 0; k < 6; k++) FX.ring(b.x, b.y, 10, 120 + k * 70, 0.8 + k * 0.1, k % 2 ? PI_.pink : PI_.violet, 4);
    FX.text(b.x, b.y - 120, 'Ground state reached. Permanently.', PI_.pink, { size: 22, font: 'serif', life: 2.6, vy: -14 });
  },
};

// ===== The Cyclotron: a magnetic field bends every charged bullet into circles =====
function drawDees(ctx, x, y, rot, t, s = 1, hurt) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  halo(ctx, PI_.ice, 0, 0, 130, 0.4);
  const pol = Math.sin(t * 7) > 0;
  for (const sd of [-1, 1]) {
    const g = ctx.createLinearGradient(sd * 70, -60, 0, 60); g.addColorStop(0, '#3b4a66'); g.addColorStop(1, '#141c2c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sd * 9, 0, 66, sd < 0 ? PI / 2 : -PI / 2, sd < 0 ? PI * 1.5 : PI / 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = (sd > 0) === pol ? '#ff3b55' : '#5a8cff'; ctx.lineWidth = 3; ctx.stroke();
  }
  dot(ctx, 0, 0, 9, hurt ? '#ffd0d8' : '#e6f6ff');
  ctx.restore();
}
function lightning(ctx, x0, y0, x1, y1, seed, w) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, n = Math.max(6, Math.floor(l / 40));
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let k = 1; k < n; k++) { const f = k / n, j = (Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453 % 1) * 2 - 1; ctx.lineTo(x0 + dx * f + nx * j * 26 * w, y0 + dy * f + ny * j * 26 * w); }
  ctx.lineTo(x1, y1); ctx.stroke();
}
BOSS_DEFS.cyclotron = {
  name: 'The Cyclotron', sub: 'In a magnetic field every charge travels in circles. Yours too, a little.', hp: 3800, r: 66, col: 'ice', score: 160000,
  short: 'When it reverses its field the magnets quench for a few seconds. Hit it then.',
  how: 'A particle accelerator. Its magnetic field (⊙ out of the screen, ⊗ into it) bends charged bullets into circles and bends your shots slightly the other way. It fires accelerating particles that spiral outward, flips the field so every orbit reverses, and sends lightning toward you after a dashed warning. Later an electric field makes every circle drift sideways (E×B drift), and in its last phase it circles the arena firing straight synchrotron light that ignores the field. It is armoured, but every field reversal quenches its superconducting magnets for four seconds: the field drops to zero and it is weak.',
  init(b) { Object.assign(b, { x: W / 2, y: H / 2, B: 1, Bt: 1, rot: 0, arcs: [], orbitA: -PI / 2, E: 0, Ea: 0 }); },
  pool: [['spiral', 'reverse', 'arcs', 'reverse'], ['spiral', 'arcs', 'reverse', 'drift', 'reverse'], ['spiral', 'arcs', 'drift', 'reverse', 'synchro', 'reverse']],
  atk: {
    spiral: { dur: 5, every: 0.075, line: 'r = mv / qB. Faster means wider.', fire(b) { for (const s of [0, PI]) { const a = b.rot + s; Bullets.fire(b.x + Math.cos(a) * 12, b.y + Math.sin(a) * 12, Math.cos(a) * 70, Math.sin(a) * 70, { col: s ? PI_.ice : PI_.blue, r: 6, acc: 80, max: 330, life: 7 }); } } },
    reverse: { dur: 3.2, line: 'B → −B. The magnets quench.', start(b) { b.Bt = -b.Bt; b.quench = 4; Game.banner('QUENCH', 'The field is reversing and the magnets have quenched. It is weak for four seconds.', 1.3); Audio2.sfx('gate'); Audio2.sfx('window'); Bullets.ring(b.x, b.y, 26, 170, { col: PI_.ice, r: 6.5, life: 7 }, b.t); } },
    arcs: { dur: 4.2, every: 1.15, line: 'Discharge.', fire(b) { for (let k = 0; k < (b.phase >= 2 ? 4 : 3); k++) { const a = Math.random() * TAU, d = rand(30, 170); b.arcs.push({ x1: Game.tx + Math.cos(a) * d, y1: Game.ty + Math.sin(a) * d, t: 0, seed: Math.random() * 100 }); } Audio2.sfx('charge'); } },
    drift: { dur: 5.2, every: 0.85, line: 'E × B drift.', tick(b, dt) { b.Ea += dt * 0.5; b.E = 150; }, fire(b) { Bullets.ring(b.x, b.y, 18, 150, { col: PI_.blue, r: 6.5, life: 7 }, b.t); }, end(b) { b.E = 0; } },
    synchro: { dur: 5, every: 0.1, line: 'Synchrotron light ignores the field.', fire(b) { const ta = b.orbitA + PI / 2; for (const s of [-0.15, 0, 0.15]) Bullets.fire(b.x, b.y, Math.cos(ta + s) * 420, Math.sin(ta + s) * 420, { col: PI_.white, r: 6, kind: 1, neutral: true, life: 5 }); } },
  },
  move(b, dt) {
    b.quench = Math.max(0, (b.quench || 0) - dt);
    b.B += ((b.quench > 0 ? 0 : b.Bt * (b.phase >= 2 ? 1.25 : 1)) - b.B) * damp(b.quench > 0 ? 5 : 2.4, dt);
    b.rot += dt * 0.7 * Math.sign(b.B || 1);
    if (b.phase >= 3) { b.orbitA += dt * 0.4; BK.glide(b, W / 2 + Math.cos(b.orbitA) * 440, H / 2 + Math.sin(b.orbitA) * 300, 1.3, dt); }
    else BK.glide(b, W / 2 + Math.sin(b.t * 0.21) * 220, H / 2 + Math.cos(b.t * 0.17) * 110, 1.3, dt);
    const warn = 0.75 * Game.tele(true);
    for (let i = b.arcs.length - 1; i >= 0; i--) {
      const a = b.arcs[i]; a.t += dt; a.on = a.t > warn;
      if (a.on && a.t < warn + 0.35) { Game.beamHit(b.x, b.y, Math.atan2(a.y1 - b.y, a.x1 - b.x), Math.hypot(a.x1 - b.x, a.y1 - b.y), 9, b); if (!a.zap) { a.zap = true; Audio2.sfx('zap'); addTrauma(0.12); } }
      if (a.t > warn + 0.35) b.arcs.splice(i, 1);
    }
  },
  field: {
    rot: (b, x, y, k) => (k === K_PB ? -0.5 : k === K_EB ? 1.25 : 0) * b.B,
    acc(b, x, y, k, o) { if (k === K_EB && b.E) { o[0] += Math.cos(b.Ea) * b.E; o[1] += Math.sin(b.Ea) * b.E; } },
  },
  hit(b, x, y) { const d2 = (x - b.x) ** 2 + (y - b.y) ** 2; return d2 < 576 ? 1.5 : d2 < 4624 ? 1 : 0; },
  window: b => b.quench > 0 && 'QUENCHED',
  draw(b, ctx) {
    const vr = Game._vr || viewRect(0), a = clamp(Math.abs(b.B) * 0.22, 0, 0.3), grid = fn => { for (let x = Math.floor(vr.x0 / 160) * 160 + 80; x < vr.x1; x += 160) for (let y = Math.floor(vr.y0 / 160) * 160 + 80; y < vr.y1; y += 160) fn(x, y); };
    ctx.strokeStyle = ctx.fillStyle = rgba(Theme.c.hot, a); ctx.lineWidth = 1.5; // field markers: ⊙ out of the screen, ⊗ into it
    ctx.beginPath(); grid((x, y) => { ctx.moveTo(x + 9, y); ctx.arc(x, y, 9, 0, TAU); if (b.B < 0) { ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); } }); ctx.stroke();
    if (b.B >= 0) { ctx.beginPath(); grid((x, y) => { ctx.moveTo(x + 2.5, y); ctx.arc(x, y, 2.5, 0, TAU); }); ctx.fill(); }
    if (b.E) {
      const c = Math.cos(b.Ea), s = Math.sin(b.Ea), ex = b.x + c * 140, ey = b.y + s * 140;
      ctx.strokeStyle = 'rgba(255,207,74,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x + c * 80, b.y + s * 80); ctx.lineTo(ex, ey);
      for (const d of [-0.4, 0.4]) { ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(b.Ea + d) * 16, ey - Math.sin(b.Ea + d) * 16); }
      ctx.stroke(); ctx.font = fontSerif(18, 700); ctx.fillStyle = '#ffcf4a'; ctx.textAlign = 'center'; ctx.fillText('E', ex + c * 18, ey + s * 18 + 6);
    }
    ctx.globalCompositeOperation = 'lighter'; // discharges: dashed warning, then the bolt
    for (const a of b.arcs) {
      const seed = a.on ? a.seed + Math.floor(Game.rt * 30) : a.seed;
      ctx.strokeStyle = a.on ? 'rgba(200,240,255,.95)' : 'rgba(140,212,255,.35)'; ctx.lineWidth = a.on ? 4 : 1.5;
      if (!a.on) ctx.setLineDash([6, 8]); lightning(ctx, b.x, b.y, a.x1, a.y1, seed, a.on ? 1 : 0.3); ctx.setLineDash([]);
      if (a.on) { ctx.strokeStyle = 'rgba(90,140,255,.5)'; ctx.lineWidth = 10; lightning(ctx, b.x, b.y, a.x1, a.y1, seed, 1); }
    }
    ctx.globalCompositeOperation = 'source-over';
    drawDees(ctx, b.x, b.y, b.rot, b.t, 1, b.flash > 0);
    if (b.quench > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(b.t * 30); ctx.drawImage(softSprite(PI_.white, 64), b.x - 90, b.y - 90, 180, 180); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.font = fontMono(11, 600); ctx.textAlign = 'center'; ctx.fillStyle = '#cfe9ff'; ctx.fillText('B = ' + b.B.toFixed(2) + ' T', b.x, b.y + 92);
  },
  iconDraw(b, ctx, t) { drawDees(ctx, 0, 0, t * 0.6, t, 0.95); ctx.strokeStyle = 'rgba(140,212,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 160; k++) { const a = k * 0.16 + t * 2, r = 6 + k * 0.62; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); },
  onDeath(b) {
    for (let k = 0; k < 8; k++) { const a = Math.random() * TAU; b.arcs.push({ x1: b.x + Math.cos(a) * 500, y1: b.y + Math.sin(a) * 500, t: 0.8, seed: k, on: true }); }
    FX.text(b.x, b.y - 120, 'Field collapsed.', PI_.ice, { size: 24, font: 'serif', life: 2.6, vy: -14 });
  },
};

// ===== The Apparatus: Geiger counter, radioactive source, hammer, flask of poison. The box itself. =====
function drawApparatus(ctx, b, s = 1) {
  const t = b.t;
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(s, s);
  ctx.fillStyle = '#5a3f22'; ctx.fillRect(-270, 62, 540, 16); ctx.fillStyle = '#7b5a33'; ctx.fillRect(-270, 62, 540, 4); // shelf
  halo(ctx, PI_.green, -170, 30, 70, 0.55 + 0.3 * (b.flashSrc || 0)); // radioactive source
  ctx.fillStyle = '#3d5a1e'; ctx.beginPath(); ctx.ellipse(-170, 34, 30, 26, 0.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b6ff7a'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#e8ff8a'; for (let k = 0; k < 3; k++) { const a = -PI / 2 + k * TAU / 3 + t * 0.3; ctx.beginPath(); ctx.moveTo(-170 + Math.cos(a) * 5, 34 + Math.sin(a) * 5); ctx.arc(-170, 34, 18, a - 0.5, a + 0.5); ctx.closePath(); ctx.fill(); }
  dot(ctx, -170, 34, 4, '#3d5a1e');
  const tg = ctx.createLinearGradient(0, 18, 0, 46); tg.addColorStop(0, '#d9dce6'); tg.addColorStop(1, '#6a7184'); // Geiger tube and counter
  ctx.fillStyle = tg; ctx.fillRect(-125, 20, 78, 24); ctx.beginPath(); ctx.arc(-125, 32, 12, PI / 2, PI * 1.5); ctx.fill();
  ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-47, 32); ctx.quadraticCurveTo(-30, 52, -18, 30); ctx.stroke();
  ctx.fillStyle = '#2b2448'; ctx.fillRect(-20, -22, 76, 84); ctx.strokeStyle = '#9a93c4'; ctx.strokeRect(-20, -22, 76, 84);
  ctx.fillStyle = '#e9e3c8'; ctx.beginPath(); ctx.arc(18, 12, 26, PI, TAU); ctx.fill();
  const na = PI + 0.25 + (b.needle || 0) * 2.6; ctx.strokeStyle = '#c0182a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18, 12); ctx.lineTo(18 + Math.cos(na) * 22, 12 + Math.sin(na) * 22); ctx.stroke();
  ctx.font = fontMono(11, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#8cffb0'; ctx.fillText(String(b.count || 0).padStart(4, '0'), 18, 44);
  ctx.save(); ctx.translate(100, -30); ctx.rotate(b.hamA ?? -0.9); // hammer
  ctx.fillStyle = '#7b5a33'; ctx.fillRect(0, -5, 110, 10); ctx.fillStyle = '#9aa3b8'; ctx.fillRect(96, -24, 34, 48); ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 2; ctx.strokeRect(96, -24, 34, 48);
  ctx.restore(); dot(ctx, 100, -30, 8, '#2a2140');
  ctx.save(); ctx.translate(200, 22); // flask of poison
  if (!b.broken) {
    ctx.fillStyle = 'rgba(96,255,140,.5)'; ctx.beginPath(); ctx.arc(0, 8, 30, 0.15 + Math.sin(t * 2) * 0.08, PI - 0.15 + Math.sin(t * 2) * 0.08); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(220,240,255,.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 8, 32, -PI / 2 + 0.32, -PI / 2 - 0.32 + TAU); ctx.lineTo(-10, -50); ctx.lineTo(10, -50); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#c9a36b'; ctx.fillRect(-11, -58, 22, 9);
    for (let k = 0; k < 3; k++) dot(ctx, -10 + k * 9, 26 - ((t * 30 + k * 13) % 30), 2.5, 'rgba(180,255,190,.7)');
    ctx.font = fontMono(9, 700); ctx.fillStyle = '#d9ffe0'; ctx.fillText('HCN', 0, 2);
  } else { ctx.strokeStyle = 'rgba(220,240,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); [[-30, 30], [-22, 4], [-12, 18], [-4, -6], [6, 14], [16, 0], [30, 30]].forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
  ctx.restore(); ctx.restore();
}
BOSS_DEFS.apparatus = {
  name: 'The Apparatus', sub: 'A Geiger counter, a radioactive atom, a hammer and a flask of poison. The box is awake.', hp: 5400, r: 90, col: 'green', score: 250000, phases: [0.66, 0.33],
  short: 'After an activity spike the counter goes dead for a moment: hit it then. For the Verdict, have cats on both sides, or fold away.',
  how: 'The thought experiment itself: a radioactive source, a Geiger counter, a hammer and a flask of poison, on a shelf at the top of the box. Every decay is random: α particles drift and burst, β electrons come fast, γ rays are lines that flash after a dashed warning. In its second phase the hammer comes down on shadows that follow you. In the last phase the flask breaks: poison clouds measure any cat inside them, and the walls of the box close in. It is armoured except during the counter’s dead time just after an activity spike (the source glows double damage then). From its second phase it passes the Verdict: half of the box glows red, and when the countdown ends every cat in that half is measured. Keep cats on both sides, or fold onto a cat in the safe half.',
  init(b) { Object.assign(b, { x: W / 2, y: 170, decayT: 1, count: 0, needle: 0, gammas: [], slams: [], gas: [], gasT: 1, hamA: -0.9, broken: false, box: null, poisonT: 0, spike: 0, deadT: 0, verdictT: 9, verdict: null }); },
  src: b => [b.x - 170, b.y + 34],
  decay(b) {
    const [sx, sy] = this.src(b), base = Math.atan2(Game.ty - sy, Game.tx - sx), r = Math.random();
    b.count++; b.needle = 1; b.flashSrc = 1; Audio2.sfx('geiger');
    const lab = (s, c, z) => FX.text(sx, sy - 30, s, c, { size: z, font: 'serif', life: 0.7 });
    if (r < 0.35) { const a = base + rand(-0.5, 0.5); Bullets.fire(sx, sy, Math.cos(a) * 150, Math.sin(a) * 150, { col: PI_.gold, r: 13, kind: 2, life: 1.7, mine: true }); lab('α', PI_.gold, 18); }
    else if (r < 0.8) { Bullets.fan(sx, sy, base + rand(-0.25, 0.25), 5, 0.3, 320, { col: PI_.amber, r: 6, kind: 1 }); lab('β⁻', PI_.amber, 16); }
    else { b.gammas.push({ a: base, t: 0 }); lab('γ', PI_.white, 18); if (!b.toldG) { b.toldG = 1; BK.announce(b, 'gamma', 'γ rays flash along the dashed line.'); } }
  },
  move(b, dt) {
    const sp = BK.sp(b), warn = 0.6 * Game.tele(true), [sx, sy] = this.src(b);
    b.x += (W / 2 + Math.sin(b.t * 0.24) * 430 - b.x) * damp(1, dt);
    b.needle = Math.max(0, b.needle - dt * 3); b.flashSrc = Math.max(0, (b.flashSrc || 0) - dt * 4);
    // radioactive decay: a Poisson process whose rate keeps climbing, with periodic activity spikes
    const rate = (b.phase >= 3 ? 1.3 : b.phase >= 2 ? 1.1 : 1.5 + Math.min(1.1, b.t * 0.02)) * sp * (b.spike > 0 ? 4 : 1);
    if (b.spike > 0 && (b.spike -= dt) <= 0) { b.deadT = 2.8; FX.text(b.x - 170, b.y - 30, 'dead time', PI_.green, { size: 18, font: 'serif', life: 1.4 }); Audio2.sfx('window'); } // a saturated counter goes dead
    b.deadT = Math.max(0, b.deadT - dt);
    if (b.deadT <= 0 && (b.decayT -= dt) <= 0) { b.decayT = -Math.log(1 - Math.random() * 0.98) / rate; this.decay(b); }
    this.judge(b, dt);
    if (Math.floor(b.t / 9) !== b.spikeK && b.t > 4) { b.spikeK = Math.floor(b.t / 9); b.spike = 1.1; Game.bossLine(b, 'Activity spike.'); }
    for (let i = b.gammas.length - 1; i >= 0; i--) { const g = b.gammas[i]; g.t += dt; if (g.t > warn && g.t < warn + 0.25) Game.beamHit(sx, sy, g.a, 1600, 8, b); if (g.t > warn + 0.25) b.gammas.splice(i, 1); }
    if (b.phase >= 2 && (b.hamT = (b.hamT ?? 1.2) - dt) <= 0) { b.hamT = (b.phase >= 3 ? 3.6 : 2.6) / sp; b.slams.push({ x: Game.tx + rand(-30, 30), y: Game.ty + rand(-30, 30), t: 0, dur: Game.tele(true) * 0.8 }); Audio2.sfx('charge'); if (!b.toldH) { b.toldH = 1; BK.announce(b, 'hammer', 'The hammer falls on the shadow.'); } } // phase II: the hammer
    b.hamA += ((b.slams.some(s => s.t > s.dur * 0.7) ? 0.9 : -0.9) - b.hamA) * damp(10, dt);
    for (let i = b.slams.length - 1; i >= 0; i--) {
      const s = b.slams[i]; s.t += dt;
      if (s.t >= s.dur && !s.done) {
        s.done = true; Player.hit(Player.near(s.x, s.y, 115), 'The Apparatus');
        Bullets.ring(s.x, s.y, 20, 190, { col: PI_.chalk, r: 7 }, Math.random() * TAU);
        FX.ring(s.x, s.y, 20, 180, 0.5, PI_.white, 6); FX.burst(s.x, s.y, 30, 300, [PI_.chalk, PI_.amber], { life: 0.6 }); Grid.impulse(s.x, s.y, 900, 300); addTrauma(0.45); Audio2.sfx('slam');
      }
      if (s.t > s.dur + 0.4) b.slams.splice(i, 1);
    }
    if (b.phase < 3) return; // phase III: the flask breaks and the box closes in
    if (!b.broken) {
      b.broken = true; b.box = Game.box = { x0: 0, y0: 0, x1: W, y1: H }; b.brokeAt = b.t;
      Game.banner('THE FLASK IS BROKEN', 'Poison is spreading and the walls of the box are closing in.', 2.2); BK.announce(b, 'flask');
      FX.burst(b.x + 200, b.y + 22, 60, 300, [PI_.green, PI_.white], { life: 1 }); Audio2.sfx('glass');
    }
    const k = clamp((b.t - b.brokeAt) / 24, 0, 1), B0 = b.box;
    B0.x0 = 240 * k; B0.x1 = W - 240 * k; B0.y1 = H - 190 * k;
    if ((b.gasT -= dt) <= 0 && b.gas.length < 9) { b.gasT = 1.7; const a = PI / 2 + rand(-1.1, 1.1), v = rand(40, 75); b.gas.push({ x: b.x + 200, y: b.y + 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 26, t: 0 }); }
    for (const g of b.gas) {
      g.t += dt; g.r = Math.min(150, g.r + dt * 22); g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= Math.exp(-0.12 * dt); g.vy *= Math.exp(-0.12 * dt);
      if (g.x < B0.x0 + g.r * 0.5 || g.x > B0.x1 - g.r * 0.5) g.vx = -g.vx; if (g.y > B0.y1 - g.r * 0.5 || g.y < 260) g.vy = -g.vy;
    }
    const inGas = Player.dead ? [] : Player.branches.filter(br => b.gas.some(g => (br.px - g.x) ** 2 + (br.py - g.y) ** 2 < (g.r * 0.8) ** 2));
    if (!inGas.length) b.poisonT = Math.max(0, b.poisonT - dt);
    else if ((b.poisonT += dt) > 1.1 && Player.invuln <= 0) { b.poisonT = 0; Player.hit(inGas, 'poison'); }
  },
  // the Verdict: half the box glows, then every cat in that half is measured (spread across both halves, or fold away)
  judge(b, dt) {
    if (b.phase < 2 && !(Game.mode === 'lab')) return;
    const V = b.verdict;
    if (!V) { if ((b.verdictT -= dt) <= 0) { b.verdict = { side: randi(0, 3), t: 0, dur: 2.4 * Game.tele(true) }; BK.announce(b, 'verdict', 'Half the box will be measured. Keep a cat on each side, or fold away.'); Audio2.sfx('charge'); } return; }
    if ((V.t += dt) < V.dur) return;
    const inside = this.verdictIn(b, V);
    Player.hit(Player.branches.filter(br => br.grace <= 0 && inside(br.px, br.py)), 'verdict');
    FX.ring(Player.x, Player.y, 10, 200, 0.5, PI_.red, 5); Game.post.flash = [1, 0.3, 0.3, 0.35]; addTrauma(0.4); Audio2.sfx('slam');
    b.verdict = null; b.verdictT = (b.phase >= 3 ? 11 : 15) * rand(0.9, 1.15);
  },
  verdictIn(b, V) { const B0 = Game.box || { x0: 0, x1: W, y1: H }, mx = (B0.x0 + B0.x1) / 2, my = (260 + B0.y1) / 2; return [(x, y) => x < mx, (x, y) => x >= mx, (x, y) => y < my, (x, y) => y >= my][V.side]; },
  hit(b, x, y) { const rx = x - b.x, ry = y - b.y; return (rx + 170) ** 2 + (ry - 34) ** 2 < 1024 ? 2 : Math.abs(rx) < 255 && ry > -60 && ry < 80 ? 1 : 0; },
  window: b => b.deadT > 0 && 'DEAD TIME',
  touch(b, x, y, hr) { const rx = x - b.x, ry = y - b.y; return Math.abs(rx) < 240 + hr && ry > -50 - hr && ry < 75 + hr; },
  aimPoint: b => ({ x: b.x - 170, y: b.y + 34 }),
  camTop: b => b.y - 80,
  hud(b, c, x, y) { c.font = fontMono(10, 600); c.textAlign = 'center'; c.fillStyle = b.deadT > 0 ? '#60ff9c' : '#9a93c4'; c.fillText(b.deadT > 0 ? 'COUNTER DEAD · WEAK' : b.spike > 0 ? 'ACTIVITY SPIKE · DEAD TIME NEXT' : 'GEIGER COUNT ' + (b.count || 0), x, y); },
  draw(b, ctx) {
    if (b.box) { // the walls of the box
      const B0 = b.box; ctx.fillStyle = 'rgba(58,42,24,.92)';
      ctx.fillRect(-200, -200, B0.x0 + 200, H + 400); ctx.fillRect(B0.x1, -200, W - B0.x1 + 200, H + 400); ctx.fillRect(-200, B0.y1, W + 400, H - B0.y1 + 200);
      ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(B0.x0, -20); ctx.lineTo(B0.x0, B0.y1); ctx.lineTo(B0.x1, B0.y1); ctx.lineTo(B0.x1, -20); ctx.stroke();
      ctx.strokeStyle = 'rgba(201,163,107,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let y = 40; y < B0.y1; y += 60) { ctx.moveTo(B0.x0 - 30, y); ctx.lineTo(B0.x0 - 6, y + 12); ctx.moveTo(B0.x1 + 30, y); ctx.lineTo(B0.x1 + 6, y + 12); } ctx.stroke();
    }
    for (const g of b.gas) { // poison gas
      ctx.drawImage(cached('gas', 64, 64, (c, w) => radial(c, w / 2, [[0, 'rgba(96,255,140,.28)'], [0.7, 'rgba(60,200,100,.16)'], [1, 'rgba(60,200,100,0)']])), g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
      ctx.strokeStyle = 'rgba(150,255,170,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 0.8, g.t, g.t + 2); ctx.stroke();
    }
    const [sx, sy] = this.src(b), warn = 0.6 * Game.tele(true);
    if (b.verdict) { // the half that will be judged
      const V = b.verdict, B0 = Game.box || { x0: 0, x1: W, y1: H }, mx = (B0.x0 + B0.x1) / 2, my = (260 + B0.y1) / 2, f = V.t / V.dur;
      const r = [[B0.x0, 0, mx - B0.x0, B0.y1], [mx, 0, B0.x1 - mx, B0.y1], [B0.x0, 0, B0.x1 - B0.x0, my], [B0.x0, my, B0.x1 - B0.x0, B0.y1 - my]][V.side];
      ctx.fillStyle = `rgba(255,59,85,${0.08 + 0.18 * f + 0.06 * Math.sin(b.t * (8 + 20 * f))})`; ctx.fillRect(...r);
      ctx.strokeStyle = 'rgba(255,59,85,.8)'; ctx.lineWidth = 4; ctx.setLineDash([16, 12]); ctx.strokeRect(...r); ctx.setLineDash([]);
      txt(ctx, 'VERDICT IN ' + Math.max(0, V.dur - V.t).toFixed(1), r[0] + r[2] / 2, r[1] + r[3] / 2, fontMono(26, 700), '#ff3b55', 'center', 3);
    }
    for (const g of b.gammas) Tele.beam(ctx, sx, sy, g.a, 1600, 6, [210, 255, 210], g.t < warn ? 1 : 2, b.t);
    for (const s of b.slams) { // hammer strikes: a shadow, then the head comes down
      const f = clamp(s.t / s.dur, 0, 1);
      Tele.ring(ctx, s.x, s.y, 115, [255, 90, 110], 0.7);
      ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.35 * f})`; ctx.beginPath(); ctx.ellipse(s.x, s.y + 8, 60 * f + 20, 22 * f + 8, 0, 0, TAU); ctx.fill();
      if (s.t < s.dur + 0.15) { const hy = s.y - (1 - easeInCubic(f)) * 700; ctx.fillStyle = '#9aa3b8'; ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 3; ctx.fillRect(s.x - 60, hy - 40, 120, 70); ctx.strokeRect(s.x - 60, hy - 40, 120, 70); ctx.fillStyle = '#7b5a33'; ctx.fillRect(s.x - 8, hy - 260, 16, 220); }
    }
    drawApparatus(ctx, b, 1);
    if (b.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16; ctx.drawImage(softSprite(PI_.white, 64), b.x - 240, b.y - 40, 480, 130); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  },
  iconDraw(b, ctx, t) { ctx.translate(0, -10); drawApparatus(ctx, { ...b, t, x: 0, y: 0, needle: Math.abs(Math.sin(t * 3)), count: Math.floor(t * 3) % 10000 }, 0.4); },
  cleanup() { Game.box = null; },
  onDeath(b) {
    Game.box = null; b.gas = [];
    for (let k = 0; k < 80; k++) FX.spawn(b.x + rand(-250, 250), b.y + rand(-40, 80), rand(-500, 500), rand(-300, 500), rand(1, 2), rand(4, 9), pick([PI_.green, PI_.gold, PI_.white, PI_.amber]), 2, 1.2);
    FX.text(b.x, b.y + 140, 'THE BOX IS OPEN', PI_.white, { size: 34, life: 3, vy: -12 });
  },
};
