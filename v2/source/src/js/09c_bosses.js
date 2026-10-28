// ---------- bosses V: oscillation, fields, and the box itself ----------

// ===== The Harmonic Oscillator: springs, and bullets that always come back =====
const HO_K = (TAU / 5.6) ** 2; // spring bullets return to where they were fired every 2.8 s
function zigzag(ctx, x0, y0, x1, y1, coils, amp) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  const n = coils * 2;
  for (let k = 1; k < n; k++) { const f = k / n, s = (k % 2 ? 1 : -1) * amp; ctx.lineTo(x0 + dx * f + nx * s, y0 + dy * f + ny * s); }
  ctx.lineTo(x1, y1); ctx.stroke();
}
function drawOrb(ctx, x, y, n, t, s = 1, hurt) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5; ctx.drawImage(softSprite(PI_.magenta, 128), x - 110 * s, y - 110 * s, 220 * s, 220 * s); ctx.globalAlpha = 1;
  for (let k = 0; k <= n; k++) { // |ψₙ|² has n+1 bright lobes: draw them as shells
    const r = (40 + 22 * Math.sqrt(2 * k + 1)) * s * (1 + 0.04 * Math.sin(t * 3 + k));
    ctx.strokeStyle = rgba(COL.pink, 0.5 - k * 0.06); ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(x - 10 * s, y - 10 * s, 3 * s, x, y, 34 * s); g.addColorStop(0, '#fff'); g.addColorStop(0.5, hurt ? '#ff8ab0' : '#ff3fb4'); g.addColorStop(1, '#5a0f45');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 34 * s, 0, TAU); ctx.fill();
  ctx.font = fontSerif(17 * s, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('|' + n + '⟩', x, y + 6 * s);
}
BOSS_DEFS.oscillator = {
  name: 'The Harmonic Oscillator', sub: 'Every problem in physics is one of these, if you squint hard enough.', hp: 3500, r: 50, col: 'magenta', score: 140000,
  init(b) { b.x = W / 2; b.y = 600; b.A = 300; b.ph = 0; b.axis = 0.15; b.lv = 2; b.queue = []; b.atk = null; b.at = 0; b.fire = 0; b.lastS = 1; },
  update(b, dt) {
    const sp = b.phase >= 3 ? 1.25 : b.phase >= 2 ? 1.12 : 1;
    b.A += ((b.phase >= 3 ? 520 : b.phase >= 2 ? 420 : 330) - b.A) * damp(0.4, dt);
    b.ph += dt * 0.62 * sp; b.axis += dt * 0.11;
    const s = Math.cos(b.ph), c = Math.cos(b.axis), sn = Math.sin(b.axis);
    let x = W / 2 + c * s * b.A, y = 640 + sn * s * b.A * 0.7;
    if (b.phase >= 3) y += Math.sin(2 * b.ph) * 170;
    b.x = x + Math.sin(b.t * 23) * 2.5; b.y = y + Math.cos(b.t * 19) * 2.5; // zero-point jitter: it never quite rests
    // driven at resonance: fire as it whips through the middle
    if (b.phase >= 2 && Math.sign(s) !== Math.sign(b.lastS)) Bullets.aimAt(b.x, b.y, Game.tx, Game.ty, 300, { col: PI_.white, r: 6.5, kind: 1 }, 5, 0.5);
    b.lastS = s;
    if (!b.atk) nextAtk(b, b.phase >= 2 ? ['breathe', 'ladder', 'wave', 'collapse', 'ladder'] : ['breathe', 'ladder', 'wave', 'collapse'],
      { breathe: 4.6, ladder: 5.2, wave: 5.4, collapse: 4.2 },
      { breathe: 'x(t) = A cos ωt. Everything comes back.', ladder: 'a†|n⟩ = √(n+1) |n+1⟩', wave: 'Coupled oscillators: a travelling wave.', collapse: 'a|n⟩ = √n |n−1⟩' });
    b.at += dt; b.fire -= dt;
    if (b.atk === 'breathe' && b.fire <= 0) {
      b.fire = 0.8 / sp; const k = Math.floor(b.at / 0.8);
      for (let j = 0; j < 20; j++) { const a = j / 20 * TAU + k * 0.16, v = j % 2 ? 200 : 300; Bullets.fire(b.x, b.y, Math.cos(a) * v, Math.sin(a) * v, { col: j % 2 ? PI_.pink : PI_.magenta, r: 6.5, life: 8.4, spring: { x: b.x, y: b.y, k: HO_K } }); }
      Audio2.sfx('bossShot');
    } else if (b.atk === 'ladder' && b.fire <= 0) {
      b.fire = 2.3 / sp;
      b.lv = Math.min(b.phase >= 3 ? 6 : 5, b.lv + 1);
      for (let n = 0; n <= b.lv; n++) { const v = 92 * Math.sqrt(2 * n + 1), m = 10 + n * 2; for (let j = 0; j < m; j++) { const a = j / m * TAU + n * 0.4; Bullets.fire(b.x, b.y, Math.cos(a) * v, Math.sin(a) * v, { col: n % 2 ? PI_.violet : PI_.pink, r: 6, life: 7, spring: { x: b.x, y: b.y, k: HO_K } }); } }
      FX.text(b.x, b.y - 110, 'E = (' + b.lv + ' + ½) ℏω', PI_.pink, { size: 18, font: 'serif', life: 1.4 });
      Audio2.sfx('bossShot');
    } else if (b.atk === 'wave' && b.fire <= 0) {
      b.fire = 2.6 / sp;
      const K2 = (TAU / 2.4) ** 2, w = Math.sqrt(K2), kx = TAU / 520, A = 115;
      for (const off of [-235, 235]) {
        const yl = clamp(Player.y + off, 90, H - 90);
        for (let x = 50; x < W - 40; x += 66) {
          const d = -kx * x + b.at;
          Bullets.fire(x, yl + A * Math.sin(d), 0, A * w * Math.cos(d), { col: PI_.violet, r: 6.5, life: 6.5, delay: 0.55, spring: { x, y: yl, k: K2 } });
        }
      }
      Audio2.sfx('charge');
    } else if (b.atk === 'collapse' && b.fire <= 0) {
      b.fire = 1.3 / sp;
      const R0 = 300 + Math.floor(b.at / 1.3) % 3 * 80;
      for (let j = 0; j < 24; j++) { const a = j / 24 * TAU; Bullets.fire(b.x + Math.cos(a) * R0, b.y + Math.sin(a) * R0, 0, 0, { col: PI_.pink, r: 6.5, life: 5.5, delay: 0.5, spring: { x: b.x, y: b.y, k: HO_K * 0.8 } }); }
    }
    if (b.at >= b.dur) b.atk = null;
  },
  hit(b, x, y) { const dx = x - b.x, dy = y - b.y; return dx * dx + dy * dy < 50 * 50 ? 1 : 0; },
  draw(b, ctx) {
    const c = Math.cos(b.axis), sn = Math.sin(b.axis), L = b.A + 260;
    const a1 = [W / 2 - c * L, 640 - sn * L * 0.7], a2 = [W / 2 + c * L, 640 + sn * L * 0.7];
    // the potential well this thing lives in
    ctx.strokeStyle = 'rgba(255,96,200,.16)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let k = -30; k <= 30; k++) { const s = k / 30 * L, v = (s / L) ** 2 * 260; ctx.lineTo(W / 2 + c * s + sn * (v - 140), 640 + sn * s * 0.7 - c * (v - 140)); }
    ctx.stroke();
    for (let n = 0; n <= 5; n++) { const v = (n + 0.5) / 6 * 260, s = Math.sqrt(v / 260) * L; ctx.strokeStyle = n === Math.min(5, b.lv) ? 'rgba(255,96,200,.55)' : 'rgba(255,96,200,.12)'; ctx.beginPath(); ctx.moveTo(W / 2 - c * s + sn * (v - 140), 640 - sn * s * 0.7 - c * (v - 140)); ctx.lineTo(W / 2 + c * s + sn * (v - 140), 640 + sn * s * 0.7 - c * (v - 140)); ctx.stroke(); }
    // springs to the anchors
    ctx.strokeStyle = 'rgba(236,231,255,.7)'; ctx.lineWidth = 2.5;
    zigzag(ctx, a1[0], a1[1], b.x, b.y, 14, 12); zigzag(ctx, b.x, b.y, a2[0], a2[1], 14, 12);
    for (const [x, y] of [a1, a2]) { ctx.fillStyle = '#2a2140'; ctx.strokeStyle = PAL_CSS[PI_.pink]; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); ctx.stroke(); }
    drawOrb(ctx, b.x, b.y, b.lv, b.t, 1, b.flash > 0);
  },
  iconDraw(b, ctx, t) {
    const x = Math.cos(t * 1.4) * 40;
    ctx.strokeStyle = 'rgba(236,231,255,.7)'; ctx.lineWidth = 2; zigzag(ctx, -118, 0, x, 0, 8, 7); zigzag(ctx, x, 0, 118, 0, 8, 7);
    drawOrb(ctx, x, 0, 2, t, 0.62);
  },
  onDeath(b) {
    for (let k = 0; k < 6; k++) FX.ring(b.x, b.y, 10, 120 + k * 70, 0.8 + k * 0.1, k % 2 ? PI_.pink : PI_.violet, 4);
    FX.text(b.x, b.y - 120, 'Ground state reached. Permanently.', PI_.pink, { size: 22, font: 'serif', life: 2.6, vy: -14 });
  },
};

// ===== The Cyclotron: a magnetic field bends every charged bullet into circles =====
function drawDees(ctx, x, y, rot, t, s = 1, hurt) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.drawImage(softSprite(PI_.ice, 128), -130, -130, 260, 260); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const pol = Math.sin(t * 7) > 0;
  for (const sd of [-1, 1]) {
    const g = ctx.createLinearGradient(sd * 70, -60, 0, 60); g.addColorStop(0, '#3b4a66'); g.addColorStop(1, '#141c2c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sd * 9, 0, 66, sd < 0 ? PI / 2 : -PI / 2, sd < 0 ? PI * 1.5 : PI / 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = (sd > 0) === pol ? '#ff3b55' : '#5a8cff'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.fillStyle = hurt ? '#ffd0d8' : '#e6f6ff'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
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
  init(b) { b.x = W / 2; b.y = 620; b.B = 1; b.Bt = 1; b.rot = 0; b.queue = []; b.atk = null; b.at = 0; b.fire = 0; b.arcs = []; b.orbitA = -PI / 2; b.E = 0; b.Ea = 0; },
  update(b, dt) {
    const sp = b.phase >= 3 ? 1.25 : b.phase >= 2 ? 1.12 : 1;
    b.B += (b.Bt * (b.phase >= 2 ? 1.25 : 1) - b.B) * damp(2.4, dt);
    b.rot += dt * 0.7 * (b.B >= 0 ? 1 : -1);
    let tx, ty;
    if (b.phase >= 3) { b.orbitA += dt * 0.4; tx = W / 2 + Math.cos(b.orbitA) * 440; ty = 640 + Math.sin(b.orbitA) * 300; }
    else { tx = W / 2 + Math.sin(b.t * 0.21) * 220; ty = 620 + Math.cos(b.t * 0.17) * 110; }
    b.x += (tx - b.x) * damp(1.3, dt); b.y += (ty - b.y) * damp(1.3, dt);
    if (!b.atk) nextAtk(b, b.phase >= 3 ? ['spiral', 'arcs', 'drift', 'synchro', 'reverse'] : b.phase >= 2 ? ['spiral', 'arcs', 'drift', 'reverse'] : ['spiral', 'arcs', 'reverse', 'spiral'],
      { spiral: 5, arcs: 4.2, drift: 5.2, synchro: 5, reverse: 2.6 },
      { spiral: 'r = mv / qB. Faster means wider.', arcs: 'Discharge.', drift: 'E × B drift.', synchro: 'Synchrotron light ignores the field.', reverse: 'B → −B' });
    b.at += dt; b.fire -= dt;
    if (b.atk === 'spiral' && b.fire <= 0) {
      b.fire = 0.075 / sp;
      for (const s of [0, PI]) { const a = b.rot + s; Bullets.fire(b.x + Math.cos(a) * 12, b.y + Math.sin(a) * 12, Math.cos(a) * 70, Math.sin(a) * 70, { col: s ? PI_.ice : PI_.blue, r: 6, acc: 80, max: 330, life: 7 }); }
    } else if (b.atk === 'reverse') {
      if (!b.flipped) { b.flipped = true; b.Bt = -b.Bt; Game.banner('B → −B', 'The field reversed. Every orbit now turns the other way.', 1.3); Audio2.sfx('gate'); Bullets.ring(b.x, b.y, 26, 170, { col: PI_.ice, r: 6.5, life: 7 }, b.t); }
    } else if (b.atk === 'arcs' && b.fire <= 0) {
      b.fire = 1.15 / sp;
      for (let k = 0; k < (b.phase >= 2 ? 4 : 3); k++) { const a = Math.random() * TAU, d = rand(30, 170); b.arcs.push({ x1: Game.tx + Math.cos(a) * d, y1: Game.ty + Math.sin(a) * d, t: 0, seed: Math.random() * 100 }); }
      Audio2.sfx('charge');
    } else if (b.atk === 'drift') {
      b.Ea += dt * 0.5; b.E = 150;
      if (b.fire <= 0) { b.fire = 0.85 / sp; Bullets.ring(b.x, b.y, 18, 150, { col: PI_.blue, r: 6.5, life: 7 }, b.t); }
    } else if (b.atk === 'synchro' && b.fire <= 0) {
      b.fire = 0.1 / sp;
      const ta = b.orbitA + PI / 2; for (const s of [-0.15, 0, 0.15]) Bullets.fire(b.x, b.y, Math.cos(ta + s) * 420, Math.sin(ta + s) * 420, { col: PI_.white, r: 6, kind: 1, neutral: true, life: 5 });
    }
    if (b.atk !== 'drift') b.E = 0;
    for (let i = b.arcs.length - 1; i >= 0; i--) {
      const a = b.arcs[i]; a.t += dt;
      if (a.t > 0.75 && a.t < 1.1) { const ang = Math.atan2(a.y1 - b.y, a.x1 - b.x); Game.beamHit(b.x, b.y, ang, Math.hypot(a.x1 - b.x, a.y1 - b.y), 9, b); if (!a.zap) { a.zap = true; Audio2.sfx('zap'); addTrauma(0.12); } }
      if (a.t > 1.1) b.arcs.splice(i, 1);
    }
    if (b.at >= b.dur) { b.atk = null; b.flipped = false; }
  },
  bulletForce(b, B, i, dt, isPlayer) {
    const w = (isPlayer ? -0.5 : 1.25) * b.B * dt, c = Math.cos(w), s = Math.sin(w);
    if (isPlayer) { const vx = B.pvx[i]; B.pvx[i] = vx * c - B.pvy[i] * s; B.pvy[i] = vx * s + B.pvy[i] * c; }
    else {
      const vx = B.evx[i]; B.evx[i] = vx * c - B.evy[i] * s; B.evy[i] = vx * s + B.evy[i] * c;
      if (b.E) { B.evx[i] += Math.cos(b.Ea) * b.E * dt; B.evy[i] += Math.sin(b.Ea) * b.E * dt; }
    }
  },
  hit(b, x, y) { const dx = x - b.x, dy = y - b.y, d2 = dx * dx + dy * dy; return d2 < 24 * 24 ? 2 : d2 < 68 * 68 ? 1 : 0; },
  draw(b, ctx) {
    // field markers: ⊙ out of the screen, ⊗ into it
    const vr = Game._vr || viewRect(0), a = clamp(Math.abs(b.B) * 0.22, 0, 0.3);
    ctx.strokeStyle = rgba(Theme.c.hot, a); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = Math.floor(vr.x0 / 160) * 160 + 80; x < vr.x1; x += 160) for (let y = Math.floor(vr.y0 / 160) * 160 + 80; y < vr.y1; y += 160) {
      ctx.moveTo(x + 9, y); ctx.arc(x, y, 9, 0, TAU);
      if (b.B < 0) { ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); }
    }
    ctx.stroke();
    if (b.B >= 0) { ctx.fillStyle = rgba(Theme.c.hot, a); ctx.beginPath(); for (let x = Math.floor(vr.x0 / 160) * 160 + 80; x < vr.x1; x += 160) for (let y = Math.floor(vr.y0 / 160) * 160 + 80; y < vr.y1; y += 160) { ctx.moveTo(x + 2.5, y); ctx.arc(x, y, 2.5, 0, TAU); } ctx.fill(); }
    if (b.E) { ctx.strokeStyle = 'rgba(255,207,74,.6)'; ctx.lineWidth = 3; const ex = b.x + Math.cos(b.Ea) * 140, ey = b.y + Math.sin(b.Ea) * 140; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(b.Ea) * 80, b.y + Math.sin(b.Ea) * 80); ctx.lineTo(ex, ey); ctx.lineTo(ex - Math.cos(b.Ea - 0.4) * 16, ey - Math.sin(b.Ea - 0.4) * 16); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(b.Ea + 0.4) * 16, ey - Math.sin(b.Ea + 0.4) * 16); ctx.stroke(); ctx.font = fontSerif(18, 700); ctx.fillStyle = '#ffcf4a'; ctx.textAlign = 'center'; ctx.fillText('E', ex + Math.cos(b.Ea) * 18, ey + Math.sin(b.Ea) * 18 + 6); }
    // discharges
    ctx.globalCompositeOperation = 'lighter';
    for (const a of b.arcs) {
      const on = a.t > 0.75;
      ctx.strokeStyle = on ? 'rgba(200,240,255,.95)' : 'rgba(140,212,255,.35)'; ctx.lineWidth = on ? 4 : 1.5;
      if (!on) ctx.setLineDash([6, 8]);
      lightning(ctx, b.x, b.y, a.x1, a.y1, on ? a.seed + Math.floor(Game.rt * 30) : a.seed, on ? 1 : 0.3);
      ctx.setLineDash([]);
      if (on) { ctx.strokeStyle = 'rgba(90,140,255,.5)'; ctx.lineWidth = 10; lightning(ctx, b.x, b.y, a.x1, a.y1, a.seed + Math.floor(Game.rt * 30), 1); }
    }
    ctx.globalCompositeOperation = 'source-over';
    drawDees(ctx, b.x, b.y, b.rot, b.t, 1, b.flash > 0);
    ctx.font = fontMono(11, 600); ctx.textAlign = 'center'; ctx.fillStyle = '#cfe9ff'; ctx.fillText('B = ' + b.B.toFixed(2) + ' T', b.x, b.y + 92);
  },
  iconDraw(b, ctx, t) { drawDees(ctx, 0, 0, t * 0.6, t, 0.95); ctx.strokeStyle = 'rgba(140,212,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 160; k++) { const a = k * 0.16 + t * 2, r = 6 + k * 0.62; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); },
  onDeath(b) {
    for (let k = 0; k < 8; k++) { const a = Math.random() * TAU; b.arcs.push({ x1: b.x + Math.cos(a) * 500, y1: b.y + Math.sin(a) * 500, t: 0.8, seed: k }); }
    FX.text(b.x, b.y - 120, 'Field collapsed.', PI_.ice, { size: 24, font: 'serif', life: 2.6, vy: -14 });
  },
};

// ===== The Apparatus: Geiger counter, radioactive source, hammer, flask of poison. The box itself. =====
function drawApparatus(ctx, b, s = 1) {
  const x = b.x, y = b.y, t = b.t;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // shelf
  ctx.fillStyle = '#5a3f22'; ctx.fillRect(-270, 62, 540, 16); ctx.fillStyle = '#7b5a33'; ctx.fillRect(-270, 62, 540, 4);
  // radioactive source
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.3 * (b.flashSrc || 0); ctx.drawImage(softSprite(PI_.green, 128), -240, -40, 140, 140); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#3d5a1e'; ctx.beginPath(); ctx.ellipse(-170, 34, 30, 26, 0.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b6ff7a'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#e8ff8a'; for (let k = 0; k < 3; k++) { const a = -PI / 2 + k * TAU / 3 + t * 0.3; ctx.beginPath(); ctx.moveTo(-170 + Math.cos(a) * 5, 34 + Math.sin(a) * 5); ctx.arc(-170, 34, 18, a - 0.5, a + 0.5); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#3d5a1e'; ctx.beginPath(); ctx.arc(-170, 34, 4, 0, TAU); ctx.fill();
  // Geiger tube and counter
  const tg = ctx.createLinearGradient(0, 18, 0, 46); tg.addColorStop(0, '#d9dce6'); tg.addColorStop(1, '#6a7184');
  ctx.fillStyle = tg; ctx.fillRect(-125, 20, 78, 24); ctx.beginPath(); ctx.arc(-125, 32, 12, PI / 2, PI * 1.5); ctx.fill();
  ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-47, 32); ctx.quadraticCurveTo(-30, 52, -18, 30); ctx.stroke();
  ctx.fillStyle = '#2b2448'; ctx.fillRect(-20, -22, 76, 84); ctx.strokeStyle = '#9a93c4'; ctx.strokeRect(-20, -22, 76, 84);
  ctx.fillStyle = '#e9e3c8'; ctx.beginPath(); ctx.arc(18, 12, 26, PI, TAU); ctx.fill();
  const na = PI + 0.25 + (b.needle || 0) * 2.6; ctx.strokeStyle = '#c0182a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18, 12); ctx.lineTo(18 + Math.cos(na) * 22, 12 + Math.sin(na) * 22); ctx.stroke();
  ctx.font = fontMono(11, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#8cffb0'; ctx.fillText(String(b.count || 0).padStart(4, '0'), 18, 44);
  // hammer
  const ha = b.hamA ?? -0.9;
  ctx.save(); ctx.translate(100, -30); ctx.rotate(ha);
  ctx.fillStyle = '#7b5a33'; ctx.fillRect(0, -5, 110, 10);
  ctx.fillStyle = '#9aa3b8'; ctx.fillRect(96, -24, 34, 48); ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 2; ctx.strokeRect(96, -24, 34, 48);
  ctx.restore();
  ctx.fillStyle = '#2a2140'; ctx.beginPath(); ctx.arc(100, -30, 8, 0, TAU); ctx.fill();
  // flask of poison
  ctx.save(); ctx.translate(200, 22);
  if (!b.broken) {
    ctx.fillStyle = 'rgba(96,255,140,.5)'; ctx.beginPath(); ctx.arc(0, 8, 30, 0.15 + Math.sin(t * 2) * 0.08, PI - 0.15 + Math.sin(t * 2) * 0.08); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(220,240,255,.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 8, 32, -PI / 2 + 0.32, -PI / 2 - 0.32 + TAU); ctx.lineTo(-10, -50); ctx.lineTo(10, -50); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#c9a36b'; ctx.fillRect(-11, -58, 22, 9);
    for (let k = 0; k < 3; k++) { const by = 26 - ((t * 30 + k * 13) % 30); ctx.fillStyle = 'rgba(180,255,190,.7)'; ctx.beginPath(); ctx.arc(-10 + k * 9, by, 2.5, 0, TAU); ctx.fill(); }
    ctx.font = fontMono(9, 700); ctx.fillStyle = '#d9ffe0'; ctx.fillText('HCN', 0, 2);
  } else {
    ctx.strokeStyle = 'rgba(220,240,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, 30); ctx.lineTo(-22, 4); ctx.lineTo(-12, 18); ctx.lineTo(-4, -6); ctx.lineTo(6, 14); ctx.lineTo(16, 0); ctx.lineTo(30, 30); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}
BOSS_DEFS.apparatus = {
  name: 'The Apparatus', sub: 'A Geiger counter, a radioactive atom, a hammer and a flask of poison. The box is awake.', hp: 5400, r: 90, col: 'green', score: 250000, phases: [0.66, 0.33],
  init(b) { b.x = W / 2; b.y = 170; b.queue = []; b.atk = null; b.at = 0; b.fire = 0; b.decayT = 1; b.count = 0; b.needle = 0; b.gammas = []; b.slams = []; b.gas = []; b.gasT = 1; b.hamA = -0.9; b.broken = false; b.box = null; b.poisonT = 0; b.spike = 0; },
  decay(b) {
    const sx = b.x - 170, sy = b.y + 34, base = Math.atan2(Game.ty - sy, Game.tx - sx), r = Math.random();
    b.count++; b.needle = 1; b.flashSrc = 1; Audio2.sfx('geiger');
    if (r < 0.35) { const a = base + rand(-0.5, 0.5); const i = Bullets.fire(sx, sy, Math.cos(a) * 150, Math.sin(a) * 150, { col: PI_.gold, r: 13, kind: 2, life: 1.7 }); if (i >= 0) Bullets.eflag[i] |= 8; FX.text(sx, sy - 30, 'α', PI_.gold, { size: 18, font: 'serif', life: 0.7 }); }
    else if (r < 0.8) { Bullets.fan(sx, sy, base + rand(-0.25, 0.25), 5, 0.3, 320, { col: PI_.amber, r: 6, kind: 1 }); FX.text(sx, sy - 30, 'β⁻', PI_.amber, { size: 16, font: 'serif', life: 0.7 }); }
    else { b.gammas.push({ a: base, t: 0 }); FX.text(sx, sy - 30, 'γ', PI_.white, { size: 18, font: 'serif', life: 0.7 }); }
  },
  update(b, dt) {
    const sp = b.phase >= 3 ? 1.2 : b.phase >= 2 ? 1.1 : 1;
    b.x += (W / 2 + Math.sin(b.t * 0.24) * 430 - b.x) * damp(1, dt);
    b.needle = Math.max(0, b.needle - dt * 3); b.flashSrc = Math.max(0, (b.flashSrc || 0) - dt * 4);
    // radioactive decay: a Poisson process whose rate keeps climbing
    const rate = (b.phase >= 3 ? 1.3 : b.phase >= 2 ? 1.1 : 1.5 + Math.min(1.1, b.t * 0.02)) * sp * (b.spike > 0 ? 4 : 1);
    b.spike = Math.max(0, b.spike - dt);
    b.decayT -= dt; if (b.decayT <= 0) { b.decayT = -Math.log(1 - Math.random() * 0.98) / rate; this.decay(b); }
    if (Math.floor(b.t / 9) !== b.spikeK && b.t > 4) { b.spikeK = Math.floor(b.t / 9); b.spike = 1.1; Game.bossLine(b, 'Activity spike.'); }
    for (let i = b.gammas.length - 1; i >= 0; i--) { const g = b.gammas[i]; g.t += dt; if (g.t > 0.6 && g.t < 0.85) Game.beamHit(b.x - 170, b.y + 34, g.a, 1600, 8, b); if (g.t > 0.85) b.gammas.splice(i, 1); }
    // phase II: the hammer
    if (b.phase >= 2) {
      b.hamT = (b.hamT ?? 1.2) - dt;
      if (b.hamT <= 0) { b.hamT = (b.phase >= 3 ? 3.6 : 2.6) / sp; b.slams.push({ x: Game.tx + rand(-30, 30), y: Game.ty + rand(-30, 30), t: 0 }); Audio2.sfx('charge'); }
    }
    b.hamA += ((b.slams.some(s => s.t > 0.7) ? 0.9 : -0.9) - b.hamA) * damp(10, dt);
    for (let i = b.slams.length - 1; i >= 0; i--) {
      const s = b.slams[i]; s.t += dt;
      if (s.t >= 1.0 && !s.done) {
        s.done = true;
        const hit = Player.dead ? [] : Player.branches.filter(br => Math.hypot(br.px - s.x, br.py - s.y) < 115);
        if (hit.length && Player.invuln <= 0) Player.measureHit(hit, 'The Apparatus');
        Bullets.ring(s.x, s.y, 20, 190, { col: PI_.chalk, r: 7 }, Math.random() * TAU);
        FX.ring(s.x, s.y, 20, 180, 0.5, PI_.white, 6); FX.burst(s.x, s.y, 30, 300, [PI_.chalk, PI_.amber], { life: 0.6 });
        Grid.impulse(s.x, s.y, 900, 300); addTrauma(0.45); Audio2.sfx('slam');
      }
      if (s.t > 1.4) b.slams.splice(i, 1);
    }
    // phase III: the flask breaks and the box closes in
    if (b.phase >= 3) {
      if (!b.broken) {
        b.broken = true; b.box = Game.box = { x0: 0, y0: 0, x1: W, y1: H };
        Game.banner('THE FLASK IS BROKEN', 'Poison is spreading and the walls of the box are closing in.', 2.2);
        FX.burst(b.x + 200, b.y + 22, 60, 300, [PI_.green, PI_.white], { life: 1 }); Audio2.sfx('glass');
      }
      const k = clamp((b.t - (b.brokeAt ?? (b.brokeAt = b.t))) / 24, 0, 1);
      b.box.x0 = 240 * k; b.box.x1 = W - 240 * k; b.box.y1 = H - 190 * k;
      b.gasT -= dt;
      if (b.gasT <= 0 && b.gas.length < 9) { b.gasT = 1.7; const a = PI / 2 + rand(-1.1, 1.1); b.gas.push({ x: b.x + 200, y: b.y + 40, vx: Math.cos(a) * rand(40, 75), vy: Math.sin(a) * rand(40, 75), r: 26, t: 0 }); }
      for (const g of b.gas) {
        g.t += dt; g.r = Math.min(150, g.r + dt * 22); g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= Math.exp(-0.12 * dt); g.vy *= Math.exp(-0.12 * dt);
        const B0 = b.box; if (g.x < B0.x0 + g.r * 0.5 || g.x > B0.x1 - g.r * 0.5) g.vx = -g.vx; if (g.y > B0.y1 - g.r * 0.5 || g.y < 260) g.vy = -g.vy;
      }
      const inGas = Player.dead ? [] : Player.branches.filter(br => b.gas.some(g => (br.px - g.x) ** 2 + (br.py - g.y) ** 2 < (g.r * 0.8) ** 2));
      if (inGas.length) { b.poisonT += dt; if (b.poisonT > 1.1 && Player.invuln <= 0) { b.poisonT = 0; Player.measureHit(inGas, 'poison'); } } else b.poisonT = Math.max(0, b.poisonT - dt);
    }
  },
  hit(b, x, y) {
    const rx = x - b.x, ry = y - b.y;
    if ((rx + 170) ** 2 + (ry - 34) ** 2 < 32 * 32) return 2;
    return Math.abs(rx) < 255 && ry > -60 && ry < 80 ? 1 : 0;
  },
  touch(b, x, y, hr) { const rx = x - b.x, ry = y - b.y; return Math.abs(rx) < 240 + hr && ry > -50 - hr && ry < 75 + hr; },
  aimPoint(b) { return { x: b.x - 170, y: b.y + 34 }; },
  camTop(b) { return b.y - 80; },
  hud(b, c, x, y) { c.font = fontMono(10, 600); c.textAlign = 'center'; c.fillStyle = '#9a93c4'; c.fillText('GEIGER COUNT ' + (b.count || 0), x, y); },
  draw(b, ctx) {
    // the walls of the box
    if (b.box) {
      const B0 = b.box; ctx.fillStyle = 'rgba(58,42,24,.92)';
      ctx.fillRect(-200, -200, B0.x0 + 200, H + 400); ctx.fillRect(B0.x1, -200, W - B0.x1 + 200, H + 400); ctx.fillRect(-200, B0.y1, W + 400, H - B0.y1 + 200);
      ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(B0.x0, -20); ctx.lineTo(B0.x0, B0.y1); ctx.lineTo(B0.x1, B0.y1); ctx.lineTo(B0.x1, -20); ctx.stroke();
      ctx.strokeStyle = 'rgba(201,163,107,.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let y = 40; y < B0.y1; y += 60) { ctx.moveTo(B0.x0 - 30, y); ctx.lineTo(B0.x0 - 6, y + 12); ctx.moveTo(B0.x1 + 30, y); ctx.lineTo(B0.x1 + 6, y + 12); }
      ctx.stroke();
    }
    // poison gas
    for (const g of b.gas) {
      const gr = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
      gr.addColorStop(0, 'rgba(96,255,140,.28)'); gr.addColorStop(0.7, 'rgba(60,200,100,.16)'); gr.addColorStop(1, 'rgba(60,200,100,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(150,255,170,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 0.8, g.t, g.t + 2); ctx.stroke();
    }
    // gamma rays
    ctx.globalCompositeOperation = 'lighter';
    for (const g of b.gammas) {
      const sx = b.x - 170, sy = b.y + 34, ex = sx + Math.cos(g.a) * 1600, ey = sy + Math.sin(g.a) * 1600;
      if (g.t < 0.6) { ctx.setLineDash([8, 10]); ctx.strokeStyle = 'rgba(200,255,200,.45)'; ctx.lineWidth = 1.5; } else { ctx.strokeStyle = 'rgba(220,255,220,.9)'; ctx.lineWidth = 12; }
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = 'source-over';
    // hammer strikes: a shadow, then the head comes down
    for (const s of b.slams) {
      const f = clamp(s.t / 1.0, 0, 1);
      ctx.strokeStyle = 'rgba(255,90,110,.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(s.x, s.y, 115, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.35 * f})`; ctx.beginPath(); ctx.ellipse(s.x, s.y + 8, 60 * f + 20, 22 * f + 8, 0, 0, TAU); ctx.fill();
      if (s.t < 1.15) { const hy = s.y - (1 - easeInCubic(f)) * 700; ctx.fillStyle = '#9aa3b8'; ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 3; ctx.fillRect(s.x - 60, hy - 40, 120, 70); ctx.strokeRect(s.x - 60, hy - 40, 120, 70); ctx.fillStyle = '#7b5a33'; ctx.fillRect(s.x - 8, hy - 260, 16, 220); }
    }
    drawApparatus(ctx, b, 1);
    if (b.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16; ctx.drawImage(softSprite(PI_.white, 64), b.x - 240, b.y - 40, 480, 130); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  },
  iconDraw(b, ctx, t) { b.t = t; b.needle = Math.abs(Math.sin(t * 3)); b.count = Math.floor(t * 3) % 10000; ctx.translate(0, -10); drawApparatus(ctx, { ...b, x: 0, y: 0 }, 0.4); },
  cleanup() { Game.box = null; },
  onDeath(b) {
    Game.box = null; b.gas = [];
    for (let k = 0; k < 80; k++) FX.spawn(b.x + rand(-250, 250), b.y + rand(-40, 80), rand(-500, 500), rand(-300, 500), rand(1, 2), rand(4, 9), pick([PI_.green, PI_.gold, PI_.white, PI_.amber]), 2, 1.2);
    FX.text(b.x, b.y + 140, 'THE BOX IS OPEN', PI_.white, { size: 34, life: 3, vy: -12 });
  },
};
