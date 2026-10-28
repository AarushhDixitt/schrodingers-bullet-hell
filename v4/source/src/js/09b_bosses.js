// ---------- bosses II: thermodynamics, interference, gravitation ----------

// ===== Maxwell's Demon: a membrane splits the arena; the demon works the door and heats your side =====
function demonFace(ctx, x, y, s, lookA, dizzy, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#1a0d14'; ctx.strokeStyle = '#ffb08a'; ctx.lineWidth = 2;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 16, -32); ctx.quadraticCurveTo(d * 30, -52, d * 38, -62); ctx.quadraticCurveTo(d * 28, -44, d * 30, -26); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  const g = ctx.createLinearGradient(-40, 0, 40, 0); g.addColorStop(0, '#ff4a3d'); g.addColorStop(0.48, '#7a1f3a'); g.addColorStop(0.52, '#1f3a7a'); g.addColorStop(1, '#4ab0ff');
  dot(ctx, 0, 0, 40, g); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5; ctx.stroke(); // half hot, half cold
  for (const d of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(d * 14, -8, 9, 11, 0, 0, TAU); ctx.fill();
    if (dizzy) { ctx.lineWidth = 2; ctx.strokeStyle = '#12091a'; ctx.beginPath(); for (let k = 0; k < 18; k++) { const a = k * 0.7 + t * 9 * d, r = k * 0.42; ctx.lineTo(d * 14 + Math.cos(a) * r, -8 + Math.sin(a) * r); } ctx.stroke(); }
    else dot(ctx, d * 14 + Math.cos(lookA) * 4, -8 + Math.sin(lookA) * 5, 4.2, '#12091a');
  }
  ctx.strokeStyle = '#12091a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 8, 18, 0.25, PI - 0.25); ctx.stroke();
  ctx.fillStyle = '#fff'; for (let k = -2; k <= 2; k++) { const yy = 20 - Math.abs(k) * 1.6; ctx.beginPath(); ctx.moveTo(k * 6 - 2.5, yy); ctx.lineTo(k * 6 + 2.5, yy); ctx.lineTo(k * 6, yy + 5); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
const MEMORY = 64;
BOSS_DEFS.maxwell = {
  name: 'Maxwell’s Demon', sub: 'Sorts fast molecules from slow ones, and never pays for the information.', hp: 2700, r: 46, col: 'red', score: 80000,
  short: 'Shoot its molecules to fill its memory. When it stops to erase, that is your window.',
  how: 'A membrane splits the arena. The demon rides it, firing fast (red) molecules into your chamber and slow (blue) ones into the other. Molecules bounce off every wall. The door opens every few seconds: slip through to the cooler side. It can slide the wall into your chamber to squeeze it. It is armoured while it works. Every molecule it sorts fills a bit of its memory, and every molecule you shoot down is a bit it has to record too. When the memory is full it must stop for four seconds to erase it (Landauer’s principle), and that is when it is weak.',
  init(b) { Object.assign(b, { wx: W / 2, x: W / 2, y: 420, doorH: 220, open: 0, doorWant: false, doorT: 3.2, bits: 0, tape: '', erase: 0, T: [300, 300], tT: 0, pside: 0, wxT: W / 2, dy: 640 }); },
  pool: [['effuse', 'blackbody', 'piston', 'shutter'], ['effuse', 'blackbody', 'piston', 'shutter', 'convect']],
  side: () => (Player.x >= Game.wall.x ? 1 : -1),
  fy: b => clamp(b.y + rand(-220, 220), 30, H - 30),
  atk: {
    effuse: { dur: 3.4, every: 0.11, line: 'Fast ones to your side.', fire(b) { const D = BOSS_DEFS.maxwell, s = D.side(); D.molecule(b, s, true, D.fy(b)); if (Math.random() < 0.3) D.molecule(b, -s, false, D.fy(b)); } },
    blackbody: {
      dur: 3.2, every: 0.85, line: 'Thermal radiation.',
      fire(b) { for (let k = 0; k < 22; k++) { const a = k / 22 * TAU + b.t, s = rand(120, 270); Bullets.fire(b.x + Math.cos(a) * 44, b.y + Math.sin(a) * 44, Math.cos(a) * s, Math.sin(a) * s, { col: s > 240 ? PI_.white : s > 200 ? PI_.orange : PI_.red, r: 6.5, bounce: 1, life: 7 }); } b.bits += 4; Audio2.sfx('bossShot'); },
    },
    piston: { dur: 5.5, every: 0.2, line: 'Adiabatic compression.', tick(b) { b.wxT = b.at < 3.8 ? W / 2 + BOSS_DEFS.maxwell.side() * (b.phase >= 3 ? 400 : 330) : W / 2; }, fire(b) { const D = BOSS_DEFS.maxwell; D.molecule(b, D.side(), true, D.fy(b), 0.85); }, end(b) { b.wxT = W / 2; } },
    shutter: {
      dur: 3.4, every: 0.12, line: 'Open. Shut. Open.',
      fire(b) {
        if (b.open <= 0.6) { b.fire = 0; return; }
        const s = BOSS_DEFS.maxwell.side(), a = (s > 0 ? 0 : PI) + rand(-0.7, 0.7), v = rand(250, 310);
        Bullets.fire(b.wx + s * 14, rand(Game.wall.d0 + 10, Game.wall.d1 - 10), Math.cos(a) * v, Math.sin(a) * v, { col: PI_.red, r: 6, bounce: 3, life: 7, mol: true }); b.bits++;
      },
    },
    convect: {
      dur: 4.2, every: 0.22, line: 'Convection currents.',
      fire(b) { const cx = b.wx + BOSS_DEFS.maxwell.side() * 380, cy = H / 2 + Math.sin(b.at * 1.3) * 300; for (let k = 0; k < 4; k++) { const a = b.at * 3 + k * PI / 2; Bullets.fire(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, -Math.sin(a) * 210, Math.cos(a) * 210, { col: PI_.orange, r: 6, turn: 1.3, bounce: 3, life: 6.5, mol: true }); } b.bits += 2; },
    },
  },
  syncWall(b) {
    const Wl = Game.wall; if (!Wl) return;
    b.dy = clamp(b.y < H / 2 ? b.y + 200 : b.y - 200, b.doorH / 2 + 30, H - b.doorH / 2 - 30);
    Object.assign(Wl, { x: b.wx, open: b.open > 0.55, d0: b.dy - b.doorH / 2 * b.open, d1: b.dy + b.doorH / 2 * b.open });
  },
  molecule(b, side, hot, y, spMul = 1) {
    const a = (side > 0 ? 0 : PI) + rand(-1.05, 1.05), sp = (hot ? rand(235, 295) : rand(100, 135)) * spMul * (b.phase >= 3 ? 1.12 : 1);
    Bullets.fire(b.wx + side * 16, y, Math.cos(a) * sp, Math.sin(a) * sp, { col: hot ? PI_.red : PI_.ice, r: hot ? 6 : 7, bounce: 4, life: hot ? 7.5 : 9, mol: true });
    b.bits++; b.tape = (b.tape + (hot ? '1' : '0')).slice(-40);
  },
  move(b, dt) {
    if (!Game.wall) Game.wall = { x: b.wx, hw: 8, open: false, d0: 0, d1: 0 };
    b.lookA = Math.atan2(Game.ty - b.y, Game.tx - b.x);
    if ((b.tT -= dt) <= 0) { // temperatures of the two chambers (for the HUD and the tint)
      b.tT = 0.35; const s2 = [0, 0], n = [0, 0];
      for (let i = 0; i < EB.n; i++) if (EB.flag[i] & 128) { const k = EB.x[i] < b.wx ? 0 : 1; s2[k] += EB.vx[i] ** 2 + EB.vy[i] ** 2; n[k]++; }
      for (const k of [0, 1]) b.T[k] += ((n[k] ? 40 + s2[k] / n[k] * 0.0042 : 40) - b.T[k]) * 0.5;
    }
    this.absorb(b);
    if (b.erase > 0) { // Landauer: forgetting costs energy, so it cannot fight while it pays
      b.erase -= dt; b.open += (1 - b.open) * damp(6, dt); this.syncWall(b);
      if (b.erase <= 0) { b.bits = 0; b.tape = ''; Game.bossLine(b, 'Memory clear. Back to work.'); }
      return false;
    }
    b.y += (clamp(Player.y + (b.phase >= 2 ? Math.sin(b.t * 0.9) * 170 : 0), 160, H - 160) - b.y) * damp(b.phase >= 3 ? 1.5 : 1, dt); // ride the wall, following the cat
    if ((b.doorT -= dt) <= 0) { b.doorWant = !b.doorWant; b.doorT = b.doorWant ? 2.6 : rand(3.4, 4.8); if (b.doorWant) Audio2.sfx('door'); }
    b.open += ((b.doorWant || b.atk === 'shutter' && Math.sin(b.at * 8) > 0 ? 1 : 0) - b.open) * damp(9, dt);
    const ox = b.wx; b.wx += (b.wxT - b.wx) * damp(1.6, dt); b.x = b.wx;
    const dx = b.wx - ox;
    if (Math.abs(dx) > 0.01) for (let i = 0; i < EB.n; i++) { // a moving piston shoves molecules ahead of it, and they come off faster
      const x = EB.x[i];
      if ((dx > 0 && x > ox - 10 && x < b.wx + 9) || (dx < 0 && x < ox + 10 && x > b.wx - 9)) { EB.x[i] = b.wx + Math.sign(dx) * 10; EB.vx[i] = Math.sign(dx) * Math.abs(EB.vx[i]) + dx / dt * 1.6; }
    }
    this.syncWall(b);
    if (b.bits >= MEMORY) {
      Object.assign(b, { erase: 4, atk: null, wxT: W / 2 });
      Game.banner('ERASING MEMORY', `Forgetting ${MEMORY} bits costs ${MEMORY} kT ln 2. It cannot fight or defend itself while it pays.`, 2); Audio2.sfx('window');
      FX.text(b.x, b.y - 80, 'kT ln 2', PI_.ice, { size: 22, font: 'serif', life: 1.6 }); Audio2.sfx('erase');
      return false;
    }
  },
  // your shots knock molecules out of the air, and the demon has to write each one down (molecules binned on a grid)
  absorb(b) {
    if (!PB.n) return;
    const cs = 24, bins = b.bins || (b.bins = new Map()); bins.clear(); let n = 0;
    for (let i = 0; i < EB.n; i++) if (EB.flag[i] & 128) { const k = Math.floor(EB.x[i] / cs) * 1000 + Math.floor(EB.y[i] / cs); const a = bins.get(k); if (a) a.push(i); else bins.set(k, [i]); n++; }
    if (!n) return;
    const dead = new Set();
    for (let j = 0; j < PB.n; j++) {
      const cx = Math.floor(PB.x[j] / cs), cy = Math.floor(PB.y[j] / cs);
      for (let ox = -1; ox <= 1 && PB.life[j] > 0; ox++) for (let oy = -1; oy <= 1; oy++) {
        const a = bins.get((cx + ox) * 1000 + cy + oy); if (!a) continue;
        const i = a.find(i => !dead.has(i) && (EB.x[i] - PB.x[j]) ** 2 + (EB.y[i] - PB.y[j]) ** 2 < (EB.r[i] + 4) ** 2);
        if (i === undefined) continue;
        dead.add(i); PB.life[j] = 0; FX.spawn(EB.x[i], EB.y[i], 0, 0, 0.3, 6, EB.col[i]); if (b.erase <= 0) { b.bits++; b.tape = (b.tape + '1').slice(-40); }
        break;
      }
    }
    for (const i of [...dead].sort((x, y) => y - x)) EB.kill(i);
  },
  constrain(b, P) {
    const Wl = Game.wall; if (!Wl) return;
    const m = Wl.hw + 16;
    if (Wl.open && P.y > Wl.d0 + 12 && P.y < Wl.d1 - 12) { b.pside = P.x >= Wl.x ? 1 : -1; return; }
    const sd = b.pside || (P.x >= Wl.x ? 1 : -1);
    if ((P.x - Wl.x) * sd < m) { P.x = Wl.x + sd * m; P.vx = sd > 0 ? Math.max(0, P.vx) : Math.min(0, P.vx); }
    b.pside = sd;
  },
  hit: (b, x, y) => (BK.circle(b, x, y, 46) ? 1 : 0),
  window: b => b.erase > 0 && 'ERASING',
  touch: (b, x, y, hr) => BK.circle(b, x, y, 38 + hr),
  hud(b, c, x, y) {
    const mine = Player.x < b.wx ? 0 : 1;
    c.font = fontSerif(16); c.textAlign = 'center'; c.fillStyle = '#ece7ff';
    c.fillText(`your side ${Math.round(b.T[mine])} K   ·   other side ${Math.round(b.T[1 - mine])} K`, x, y);
    c.font = fontMono(10, 600); c.fillStyle = b.erase > 0 ? '#4cf2ff' : '#9a93c4';
    c.fillText(b.erase > 0 ? 'ERASING MEMORY · WEAK' : `DEMON MEMORY ${Math.min(MEMORY, b.bits)} / ${MEMORY} BITS · SHOOT MOLECULES TO FILL IT`, x, y + 18);
    const w = 260; c.fillStyle = 'rgba(236,231,255,.12)'; c.fillRect(x - w / 2, y + 26, w, 4); c.fillStyle = b.erase > 0 ? '#4cf2ff' : '#ff3b55'; c.fillRect(x - w / 2, y + 26, w * Math.min(1, b.erase > 0 ? b.erase / 4 : b.bits / MEMORY), 4);
  },
  draw(b, ctx) {
    const tL = clamp((b.T[0] - 60) / 500, 0, 1), tR = clamp((b.T[1] - 60) / 500, 0, 1), tc = t => mixRGB(COL.ice, COL.red, t);
    ctx.globalCompositeOperation = 'lighter'; // chamber tints
    for (const [x0, x1, t] of [[0, b.wx, tL], [b.wx, W, tR]]) { const g = ctx.createLinearGradient(b.wx, 0, x0 === 0 ? 0 : W, 0); g.addColorStop(0, rgba(tc(t), 0.13)); g.addColorStop(1, rgba(tc(t), 0.02)); ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, H); }
    ctx.globalCompositeOperation = 'source-over';
    const seg = (y0, y1) => { // the membrane, with its door
      if (y1 <= y0) return;
      const g = ctx.createLinearGradient(b.wx - 9, 0, b.wx + 9, 0); g.addColorStop(0, rgbStr(tc(tL))); g.addColorStop(0.3, '#1b1428'); g.addColorStop(0.7, '#1b1428'); g.addColorStop(1, rgbStr(tc(tR)));
      ctx.fillStyle = g; ctx.fillRect(b.wx - 9, y0, 18, y1 - y0);
      ctx.strokeStyle = 'rgba(236,231,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); for (let y = y0 + 12; y < y1; y += 24) { ctx.moveTo(b.wx - 7, y); ctx.lineTo(b.wx + 7, y - 8); } ctx.stroke();
    };
    const half = b.doorH / 2, op = clamp(b.open, 0, 1), ph = half * (1 - op);
    seg(-20, b.dy - half); seg(b.dy + half, H + 20);
    ctx.fillStyle = '#2b2140'; ctx.strokeStyle = PAL_CSS[PI_.gold]; ctx.lineWidth = 2;
    if (ph > 1) for (const y0 of [b.dy - half, b.dy + half - ph]) { ctx.fillRect(b.wx - 7, y0, 14, ph); ctx.strokeRect(b.wx - 7, y0, 14, ph); } // sliding panels
    if (op > 0.5) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * op; ctx.drawImage(softSprite(PI_.gold, 64), b.wx - 50, b.dy - half, 100, b.doorH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.strokeStyle = '#8f88b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.wx, b.y); ctx.lineTo(b.wx + 30 * (Player.x >= b.wx ? 1 : -1), (b.y + b.dy) / 2); ctx.lineTo(b.wx, b.dy + (b.dy > b.y ? -half : half)); ctx.stroke(); // lever
    ctx.font = fontMono(12, 600); ctx.textAlign = 'center'; // memory tape
    ctx.fillStyle = b.erase > 0 ? (Math.sin(b.t * 30) > 0 ? '#4cf2ff' : 'rgba(76,242,255,.3)') : 'rgba(236,231,255,.7)';
    ctx.fillText(b.erase > 0 ? 'kT ln 2 · kT ln 2 · kT ln 2' : b.tape.slice(-22).padStart(22, '·'), b.x, b.y - 74);
    halo(ctx, b.erase > 0 ? PI_.ice : PI_.red, b.x, b.y, 110, 0.35);
    demonFace(ctx, b.x + (b.erase > 0 ? Math.sin(b.t * 40) * 2 : 0), b.y, 1, b.lookA || 0, b.erase > 0, b.t);
  },
  iconDraw(b, ctx, t) { demonFace(ctx, 0, 6, 1.15, t * 1.3, Math.sin(t * 0.5) > 0.85, t); ctx.font = fontMono(11, 600); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,231,255,.7)'; ctx.fillText('0110100111', 0, -64); },
  cleanup() { Game.wall = null; },
  onDeath(b) {
    Game.wall = null;
    for (let k = 0; k < 50; k++) { const a = Math.random() * TAU, s = rand(100, 480); FX.text(b.x, b.y, Math.random() < 0.5 ? '0' : '1', k % 2 ? PI_.red : PI_.ice, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rand(14, 26), life: rand(1, 2), drag: 1.4 }); }
    FX.text(b.x, b.y - 120, '“Information is physical.”', PI_.ice, { size: 22, font: 'serif', life: 2.6, vy: -14 });
  },
};

// ===== The Double Slit: everything below the barrier is an interference pattern =====
function slitIntensity(th, d, lam, n, a) {
  const s = Math.sin(th), ph = PI * d * s / lam, sn = Math.sin(ph), be = PI * a * s / lam;
  return (Math.abs(sn) < 1e-4 ? 1 : (Math.sin(n * ph) / (n * sn)) ** 2) * (Math.abs(be) < 1e-4 ? 1 : (Math.sin(be) / be) ** 2);
}
function drawGun(ctx, x, y, s, t, hurt) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  halo(ctx, PI_.cyan, 0, 20, 110, 0.45);
  const g = ctx.createLinearGradient(-50, 0, 50, 0); g.addColorStop(0, '#1b2a3a'); g.addColorStop(0.5, '#4d6b86'); g.addColorStop(1, '#1b2a3a');
  ctx.fillStyle = g; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-46, -60, 92, 96, 10); else ctx.rect(-46, -60, 92, 96); ctx.fill();
  ctx.strokeStyle = hurt ? '#ff3b55' : '#4cf2ff'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,207,74,.75)'; ctx.lineWidth = 3; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(0, -44 + k * 15, 50, 5, 0, 0, PI); ctx.stroke(); }
  ctx.fillStyle = '#0b1220'; ctx.beginPath(); ctx.moveTo(-24, 36); ctx.lineTo(24, 36); ctx.lineTo(12, 58); ctx.lineTo(-12, 58); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 12); dot(ctx, 0, 58, 7, '#fff'); ctx.globalAlpha = 1;
  ctx.font = fontSerif(15, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#d6f6ff'; ctx.fillText('e⁻', 0, -8);
  ctx.restore();
}
BOSS_DEFS.slit = {
  name: 'The Double Slit', sub: 'Every bullet goes through both slits. Look straight at a slit and the pattern changes.', hp: 3000, r: 64, col: 'cyan', score: 100000,
  short: 'Stand in the dark lanes. Aim straight at a slit: the pattern collapses and your shots get through to the gun.',
  how: 'A barrier with slits closes off the top of the arena, with an electron gun behind it. Bullets come through as an interference pattern: bright lanes full of bullets and dark lanes that are safe. Aim straight at a slit and you gain which-path information, so the pattern collapses into two simple clumps. The barrier is solid: only shots that pass through a slit can reach the gun, and they hurt most while you are watching a slit. It later becomes a three-slit grating, and in its last phase watching no longer collapses the pattern, but its single-slit attack leaves the way wide open.',
  init(b) { Object.assign(b, { by: 270, byT: 270, cx: W / 2, d: 170, ns: 2, single: false, x: W / 2, y: 130, lam: 64, dots: [], obs: -1 }); },
  pool: [['fringes', 'huygens', 'diffract', 'photons'], ['fringes', 'huygens', 'diffract', 'fringes', 'photons']],
  slits(b) { if (b.single) return [b.cx]; const out = []; for (let k = 0; k < b.ns; k++) out.push(b.cx + (k - (b.ns - 1) / 2) * b.d); return out; },
  mid(b) { const S = this.slits(b); return S.reduce((a, c) => a + c, 0) / S.length; },
  watched(b) { // which slit is the cat aiming straight at?
    if (Player.dead || b.phase >= 3) return -1;
    return this.slits(b).findIndex(sx => Math.abs(angDiff(Player.aimA, Math.atan2(b.by - Player.y, sx - Player.x))) < 0.075);
  },
  atk: {
    fringes: {
      dur: 5.2, every: 0.78, line: 'I = I₀ cos²(πd sinθ / λ)',
      fire(b) {
        const D = BOSS_DEFS.slit, y0 = b.by + 18;
        if (b.obs >= 0) for (const sx of D.slits(b)) for (let k = 0; k < 7; k++) { const a = PI / 2 + gauss() * 0.11; Bullets.fire(sx, y0, Math.cos(a) * 230, Math.sin(a) * 230, { col: PI_.white, r: 6.5, kind: 1, life: 8 }); }
        else for (let j = 0; j < 96; j++) { const th = -1.25 + 2.5 * j / 95; if (slitIntensity(th, b.d, b.lam, b.ns, 46) > 0.55) Bullets.fire(D.mid(b), y0, Math.cos(PI / 2 + th) * 240, Math.sin(PI / 2 + th) * 240, { col: PI_.cyan, r: 6, life: 8 }); }
        Audio2.sfx('bossShot');
      },
    },
    huygens: { dur: 3.8, every: 0.5, line: 'Every point of a wavefront is a new source.', fire(b) { for (const sx of BOSS_DEFS.slit.slits(b)) for (let k = 0; k <= 16; k++) { const a = PI * 0.06 + k / 16 * PI * 0.88; Bullets.fire(sx, b.by + 18, Math.cos(a) * 170, Math.sin(a) * 170, { col: PI_.ice, r: 6.5, life: 8 }); } } },
    diffract: {
      dur: 3.8, every: 0.1, line: 'One slit. Watch the central maximum.', start(b) { b.single = true; }, end(b) { b.single = false; },
      fire(b) { for (let k = 0; k < 3; k++) { let th = 0; for (let n = 0; n < 30; n++) { th = rand(-1.2, 1.2); if (Math.random() < slitIntensity(th, 1, b.lam, 1, 120)) break; } Bullets.fire(b.cx, b.by + 18, Math.cos(PI / 2 + th) * 260, Math.sin(PI / 2 + th) * 260, { col: PI_.cyan, r: 6, life: 8 }); } },
    },
    photons: { dur: 3, every: 0.45, line: 'One photon at a time.', fire(b) { const S = BOSS_DEFS.slit.slits(b), best = S.reduce((a, c) => Math.abs(c - Game.tx) < Math.abs(a - Game.tx) ? c : a); Bullets.aimAt(best, b.by + 18, Game.tx, Game.ty, 330, { col: PI_.white, r: 6.5, kind: 1 }, 3, 0.16); Audio2.sfx('eshot'); } },
  },
  move(b, dt) {
    if (b.phase >= 2 && b.ns === 2) { b.ns = 3; b.d = 150; Game.banner('DIFFRACTION GRATING', 'Three slits now. Narrower bright lanes, and fainter ones in between.', 1.8); }
    if (b.phase >= 3) b.byT = 400;
    b.by += (b.byT - b.by) * damp(0.8, dt);
    b.cx = W / 2 + Math.sin(b.t * (b.phase >= 3 ? 0.42 : 0.28)) * 520; b.x = b.cx; b.y = b.by - 140;
    b.lam = 64 + 18 * Math.sin(b.t * 0.55);
    const obs = this.watched(b);
    if (obs >= 0 && b.obs < 0) { Audio2.sfx('window'); if (!b.toldObs) { b.toldObs = true; Game.bossLine(b, 'You are watching a slit. Which-path information destroys the pattern, and your shots get through.'); } }
    b.obs = obs;
    for (let i = 0; i < EB.n; i++) if (EB.y[i] > H - 30 && !(EB.flag[i] & 4)) { EB.flag[i] |= 4; if (b.dots.length < 900) b.dots.push(EB.x[i], rand(2, 26)); } // the detector screen fills in
  },
  constrain(b, P) { const lim = b.by + 42; if (P.y < lim) { P.y = lim; P.vy = Math.max(0, P.vy); } },
  hit(b, x, y) {
    const dy = y - b.by;
    if (Math.abs(dy) < 16) { if (!this.slits(b).some(sx => Math.abs(x - sx) < 19) && Math.random() < 0.05) FX.text(x, y + 20, 'blocked', PI_.dim, { size: 10, life: 0.4 }); return 0; }
    return dy < -16 && BK.circle(b, x, y, 66) ? 1 : 0;
  },
  window: b => b.obs >= 0 ? 'WATCHED' : b.atk === 'diffract' && b.phase >= 3 && 'SINGLE SLIT',
  touch: () => false,
  camTop: b => b.y - 75,
  aimPoint(b, x) { const S = this.slits(b); return { x: S.reduce((a, c) => Math.abs(c - x) < Math.abs(a - x) ? c : a), y: b.by - 30 }; },
  draw(b, ctx) {
    const S = this.slits(b), mid = this.mid(b), y0 = b.by + 18;
    if (b.atk === 'fringes' || b.atk === 'diffract') { // faint rays: the pattern about to be fired
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 3;
      for (let j = 0; j < 72; j++) {
        const th = -1.25 + 2.5 * j / 71, I = b.atk === 'diffract' ? slitIntensity(th, 1, b.lam, 1, 120) : b.obs >= 0 ? 0 : slitIntensity(th, b.d, b.lam, b.ns, 46);
        if (I < 0.2) continue;
        ctx.strokeStyle = rgba(COL.cyan, 0.07 * I); ctx.beginPath(); ctx.moveTo(b.atk === 'diffract' ? b.cx : mid, y0); ctx.lineTo(mid + Math.cos(PI / 2 + th) * 1500, y0 + Math.sin(PI / 2 + th) * 1500); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = 'rgba(76,242,255,.06)'; ctx.fillRect(0, H - 30, W, 30); // detector screen
    ctx.fillStyle = 'rgba(160,240,255,.75)'; for (let k = 0; k < b.dots.length; k += 2) ctx.fillRect(b.dots[k] - 1.5, H - b.dots[k + 1] - 1.5, 3, 3);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, b.y, 0, b.by); g.addColorStop(0, 'rgba(76,242,255,.18)'); g.addColorStop(1, 'rgba(76,242,255,.02)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b.x - 14, b.y + 56); ctx.lineTo(b.x + 14, b.y + 56); ctx.lineTo(b.cx + 420, b.by); ctx.lineTo(b.cx - 420, b.by); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    drawGun(ctx, b.x, b.y, 1, b.t, b.flash > 0);
    const edges = [-60]; for (const sx of S) edges.push(sx - 19, sx + 19); edges.push(W + 60); // the barrier, cut by the slits
    for (let k = 0; k < edges.length; k += 2) {
      const x0 = edges[k], x1 = edges[k + 1]; if (x1 <= x0) continue;
      const gg = ctx.createLinearGradient(0, b.by - 16, 0, b.by + 16); gg.addColorStop(0, '#2a3a50'); gg.addColorStop(0.5, '#101826'); gg.addColorStop(1, '#2a3a50');
      ctx.fillStyle = gg; ctx.fillRect(x0, b.by - 16, x1 - x0, 32);
      ctx.strokeStyle = 'rgba(76,242,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); for (const yy of [b.by + 16, b.by - 16]) { ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); } ctx.stroke();
    }
    S.forEach((sx, k) => {
      halo(ctx, PI_.cyan, sx, b.by, 30, 0.8, glowSprite);
      if (k === b.obs && !b.single) { ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(sx, b.by, 34, 18, 0, 0, TAU); ctx.stroke(); ctx.font = fontMono(10, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#ffcf4a'; ctx.fillText('WATCHED', sx, b.by + 40); }
    });
  },
  iconDraw(b, ctx, t) {
    drawGun(ctx, 0, -34, 0.62, t, false);
    for (const [x, w] of [[-110, 82], [-12, 24], [28, 82]]) { ctx.fillStyle = '#1a2636'; ctx.fillRect(x, 16, w, 16); ctx.strokeStyle = '#4cf2ff'; ctx.lineWidth = 1.5; ctx.strokeRect(x, 16, w, 16); }
    ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2;
    for (let j = 0; j < 40; j++) { const th = -1.1 + 2.2 * j / 39; ctx.strokeStyle = rgba(COL.cyan, 0.5 * slitIntensity(th, 3, 1, 2, 1)); ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(Math.cos(PI / 2 + th) * 110, 32 + Math.sin(PI / 2 + th) * 110); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
  },
  onDeath(b) {
    for (let k = 0; k < 70; k++) { const a = PI / 2 + rand(-1.3, 1.3), s = rand(200, 700); FX.spawn(b.cx, b.by + 20, Math.cos(a) * s, Math.sin(a) * s, rand(0.8, 1.6), rand(3, 7), pick([PI_.cyan, PI_.white, PI_.ice]), 1, 1.2); }
    FX.text(b.x, b.by + 90, 'It went through both slits. And neither.', PI_.cyan, { size: 22, font: 'serif', life: 2.8, vy: -14 });
  },
};

// ===== The Three-Body Problem: three suns, real Newtonian gravity, no closed-form solution =====
let FIG8 = null;
function fig8At(u) { // the Chenciner–Montgomery figure-eight choreography, integrated once (RK4)
  if (!FIG8) {
    const N = 1200, h = 6.32591398 / N, xs = new Float32Array(N), ys = new Float32Array(N);
    let s = [0.97000436, -0.24308753, 0.466203685, 0.43236573, -0.97000436, 0.24308753, 0.466203685, 0.43236573, 0, 0, -0.93240737, -0.86473146];
    const f = s => { const o = []; for (let i = 0; i < 3; i++) { let ax = 0, ay = 0; for (let j = 0; j < 3; j++) { if (i === j) continue; const dx = s[j * 4] - s[i * 4], dy = s[j * 4 + 1] - s[i * 4 + 1], r3 = Math.pow(dx * dx + dy * dy, 1.5); ax += dx / r3; ay += dy / r3; } o.push(s[i * 4 + 2], s[i * 4 + 3], ax, ay); } return o; };
    const add = (a, k, m) => a.map((v, i) => v + k[i] * m);
    for (let n = 0; n < N; n++) { xs[n] = s[0]; ys[n] = s[1]; const k1 = f(s), k2 = f(add(s, k1, h / 2)), k3 = f(add(s, k2, h / 2)), k4 = f(add(s, k3, h)); s = s.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); }
    FIG8 = { xs, ys, N };
  }
  const F = FIG8, p = (((u % 1) + 1) % 1) * F.N, i = Math.floor(p) % F.N, j = (i + 1) % F.N, fr = p - Math.floor(p);
  return [F.xs[i] + (F.xs[j] - F.xs[i]) * fr, F.ys[i] + (F.ys[j] - F.ys[i]) * fr];
}
const TB_COLS = () => [PI_.gold, PI_.coral, PI_.ice];
const TB_Y = H / 2 - 50;
function drawStar(ctx, x, y, ci, t, s = 1) {
  halo(ctx, ci, x, y, 95 * s, 0.55);
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(PAL[ci], 0.5); ctx.lineWidth = 2 * s; ctx.beginPath();
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + t * 0.4, l = (52 + 10 * Math.sin(t * 3 + k * 1.7)) * s; ctx.moveTo(x + Math.cos(a) * 40 * s, y + Math.sin(a) * 40 * s); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
  ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(x - 10 * s, y - 10 * s, 4 * s, x, y, 40 * s); g.addColorStop(0, '#fff'); g.addColorStop(0.45, PAL_CSS[ci]); g.addColorStop(1, rgbStr(mixRGB(PAL[ci], [0, 0, 0], 0.5)));
  dot(ctx, x, y, 40 * s, g);
}
BOSS_DEFS.threebody = {
  name: 'The Three-Body Problem', sub: 'Three suns, real Newtonian gravity, and no closed-form solution.', hp: 3300, r: 46, col: 'gold', score: 120000,
  short: 'Hit them when two suns pass close together: tidal stress makes them weak.',
  how: 'Three stars under real Newtonian gravity, sharing one health bar. Their gravity bends every bullet, yours included. They orbit chaotically, trace the famous figure-eight solution while dropping bullets, fling one star across the arena along a dashed line (slingshot), and later line up into a rotating beam (syzygy). They are armoured, except when two of them pass close together: tidal stress weakens both, and a dotted line joins them.',
  init(b) {
    Object.assign(b, { x: W / 2, y: TB_Y, mode: 'free', blend: 0, u: 0, sling: -1 });
    b.bodies = [0, 1, 2].map(k => { const a = k * TAU / 3 - PI / 2; return { x: W / 2 + Math.cos(a) * 300, y: TB_Y + Math.sin(a) * 300, vx: -Math.sin(a) * 220, vy: Math.cos(a) * 220, ci: TB_COLS()[k], trail: [], trT: 0, fire: k * 0.5 }; });
  },
  GM: 2e7,
  pool: [['orbit', 'eight', 'sling', 'orbit'], ['orbit', 'eight', 'sling', 'syzygy']],
  atk: {
    orbit: { dur: 5, line: 'F = Gm₁m₂ / r²', tick(b, dt, sp) { for (const o of b.bodies) if ((o.fire -= dt) <= 0) { o.fire = 1.25 / sp; Bullets.ring(o.x, o.y, b.phase >= 3 ? 17 : 14, 160, { col: o.ci, r: 6.5, life: 8 }, Math.random() * TAU); Audio2.sfx('bossShot'); } } },
    eight: {
      dur: 8.5, every: 0.11, line: 'The figure-eight. A rare stable solution.',
      fire(b) { for (const o of b.bodies) { const vx = o.x - o.px, vy = o.y - o.py, l = Math.hypot(vx, vy) || 1, s = chance(0.5) ? 1 : -1; Bullets.fire(o.x, o.y, -vy / l * 55 * s, vx / l * 55 * s, { col: o.ci, r: 6, life: 6 }); } },
      tick(b) { const k = Math.floor(b.at / 1.1); if (k !== b.aimK) { b.aimK = k; for (const o of b.bodies) Bullets.aimAt(o.x, o.y, Game.tx, Game.ty, 260, { col: PI_.white, r: 6.5, kind: 1 }); } },
    },
    sling: {
      dur: 3.6, line: 'Gravitational slingshot.', end(b) { b.sling = -1; },
      tick(b, dt, sp) {
        const B3 = b.bodies;
        if (b.sling < 0) { // the sun farthest from the cat takes aim
          b.sling = B3.reduce((best, o, k) => Math.hypot(o.x - Game.tx, o.y - Game.ty) > Math.hypot(B3[best].x - Game.tx, B3[best].y - Game.ty) ? k : best, 0);
          b.slingA = Math.atan2(Game.ty - B3[b.sling].y, Game.tx - B3[b.sling].x); b.slingT = -0.9 * Game.tele(true); Audio2.sfx('charge');
        }
        const o = B3[b.sling];
        if (b.slingT < 0) {
          b.slingT += dt; o.vx *= 0.9; o.vy *= 0.9; b.slingA += angDiff(b.slingA, Math.atan2(Game.ty - o.y, Game.tx - o.x)) * damp(2, dt);
          if (b.slingT >= 0) { b.slingT = 1.2; o.vx = Math.cos(b.slingA) * 950 * sp; o.vy = Math.sin(b.slingA) * 950 * sp; addTrauma(0.3); Audio2.sfx('tachyonDash'); }
        } else if (b.slingT > 0) {
          b.slingT -= dt; o.x += o.vx * dt; o.y += o.vy * dt;
          if ((b.fire -= dt) <= 0) { b.fire = 0.035; const l = Math.hypot(o.vx, o.vy) || 1; for (const s of [-1, 1]) Bullets.fire(o.x, o.y, -o.vy / l * 95 * s, o.vx / l * 95 * s, { col: o.ci, r: 6, life: 7 }); }
          if (o.x < 90 || o.x > W - 90 || o.y < 90 || o.y > H - 90) { b.slingT = 0; o.x = clamp(o.x, 90, W - 90); o.y = clamp(o.y, 90, H - 90); }
          if (b.slingT <= 0) { o.vx *= 0.3; o.vy *= 0.3; }
        }
      },
      draw(b, ctx) { if (b.sling >= 0 && b.slingT < 0) { const o = b.bodies[b.sling]; Tele.line(ctx, o.x, o.y, o.x + Math.cos(b.slingA) * 1600, o.y + Math.sin(b.slingA) * 1600, PAL[o.ci], 0.6, 2, [10, 10]); } },
    },
    syzygy: {
      dur: 5.6, every: 1.3, line: 'Syzygy: all three in a line.',
      on: b => b.at > 1.1 * Game.tele(true) && b.at < b.dur - 0.4,
      tick(b) { if (this.on(b)) for (const s of [0, PI]) Game.beamHit(W / 2, TB_Y, b.lineA + s, 1500, 11, b); },
      fire(b) { for (const o of b.bodies) Bullets.ring(o.x, o.y, 10, 130, { col: o.ci, r: 6.5 }, b.t); },
      draw(b, ctx) { for (const s of [0, PI]) Tele.beam(ctx, W / 2, TB_Y, (b.lineA || 0) + s, 1500, 11, COL.gold, this.on(b) ? 2 : b.at < b.dur - 0.4 ? 1 : 0, b.t); },
    },
  },
  move(b, dt) {
    const sp = BK.sp(b), GM = this.GM * (b.phase >= 3 ? 1.2 : 1), B3 = b.bodies;
    const target = b.atk === 'eight' ? 'eight' : b.atk === 'syzygy' ? 'line' : 'free';
    if (target !== b.mode) { // leaving a choreography: carry its velocity into free flight
      if (b.mode !== 'free') for (const o of B3) { o.vx = (o.x - (o.px || o.x)) / Math.max(dt, 1e-3); o.vy = (o.y - (o.py || o.y)) / Math.max(dt, 1e-3); const v = Math.hypot(o.vx, o.vy); if (v > 320) { o.vx *= 320 / v; o.vy *= 320 / v; } }
      b.mode = target; b.blend = 0;
    }
    b.blend = Math.min(1, b.blend + dt / 1.2);
    for (const o of B3) { o.px = o.x; o.py = o.y; }
    if (b.mode === 'free') {
      B3.forEach((o, i) => {
        if (i === b.sling && b.slingT > 0) return;
        const a = [-0.35 * (o.x - W / 2), -0.35 * (o.y - (TB_Y + 50))];
        for (const q of B3) if (q !== o) { const dx = q.x - o.x, dy = q.y - o.y, r2 = dx * dx + dy * dy + 3600, g = GM / (r2 * Math.sqrt(r2)); a[0] += dx * g; a[1] += dy * g; }
        o.vx += a[0] * dt; o.vy += a[1] * dt;
        const v = Math.hypot(o.vx, o.vy), vmax = 520 * sp; if (v > vmax) { o.vx *= vmax / v; o.vy *= vmax / v; }
      });
      B3.forEach((o, i) => { o.x += o.vx * dt; o.y += o.vy * dt; if (contain(o, 90, true)) { o.vx *= 0.9; o.vy *= 0.9; if (i === b.sling) b.slingT = 0; } });
    } else if (b.mode === 'eight') {
      b.u += dt / (7.2 / sp);
      B3.forEach((o, k) => { const [fx, fy] = fig8At(b.u + k / 3), f = b.blend < 1 ? damp(4, dt) : 1; o.x += (W / 2 + fx * 430 - o.x) * f; o.y += (TB_Y + fy * 430 - o.y) * f; });
    } else {
      b.lineA = (b.lineA ?? Math.random() * PI) + dt * 0.33 * sp;
      B3.forEach((o, k) => { const off = (k - 1) * 380; o.x += (W / 2 + Math.cos(b.lineA) * off - o.x) * damp(3, dt); o.y += (TB_Y + Math.sin(b.lineA) * off - o.y) * damp(3, dt); });
    }
    b.x = (B3[0].x + B3[1].x + B3[2].x) / 3; b.y = (B3[0].y + B3[1].y + B3[2].y) / 3;
    const was = b.tidal; b.tidal = null; // two suns closer than 260: tidal stress
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (Math.hypot(B3[i].x - B3[j].x, B3[i].y - B3[j].y) < 260) b.tidal = [i, j];
    if (b.tidal && !was) Audio2.sfx('window');
    for (const o of B3) { Grid.attract(o.x, o.y, 6000, 300, dt); if ((o.trT -= dt) <= 0) { o.trT = 0.05; o.trail.push(o.x, o.y); if (o.trail.length > 80) o.trail.splice(0, 2); } }
  },
  // the suns bend every bullet, yours more gently
  field: { acc(b, x, y, k, o) { if (k < K_PB) return; const G = k === K_PB ? 1.4e6 : b.phase >= 2 ? 3.6e6 : 3e6; for (const s of b.bodies) { const r2 = (s.x - x) ** 2 + (s.y - y) ** 2 + 4900; if (r2 < 490000) { const a = G / (r2 * Math.sqrt(r2)); o[0] += (s.x - x) * a; o[1] += (s.y - y) * a; } } } },
  hit: (b, x, y) => (b.bodies.some(o => (x - o.x) ** 2 + (y - o.y) ** 2 < 44 * 44) ? 1 : 0),
  window: b => !!b.tidal && 'TIDAL STRESS',
  touch: (b, x, y, hr) => b.bodies.some(o => (x - o.x) ** 2 + (y - o.y) ** 2 < (36 + hr) ** 2),
  aimPoint: (b, x, y) => b.bodies.reduce((a, o) => ((o.x - x) ** 2 + (o.y - y) ** 2 < (a.x - x) ** 2 + (a.y - y) ** 2 ? o : a)),
  draw(b, ctx) {
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const o of b.bodies) { const tr = o.trail; for (let k = 2; k < tr.length; k += 2) { ctx.strokeStyle = rgba(PAL[o.ci], 0.4 * k / tr.length); ctx.beginPath(); ctx.moveTo(tr[k - 2], tr[k - 1]); ctx.lineTo(tr[k], tr[k + 1]); ctx.stroke(); } }
    BK.drawAtk(b, ctx, this);
    if (b.tidal) { const [p, q] = b.tidal.map(i => b.bodies[i]); Tele.line(ctx, p.x, p.y, q.x, q.y, COL.white, 0.8, 3, [4, 6]); }
    for (const o of b.bodies) drawStar(ctx, o.x, o.y, o.ci, b.t);
  },
  iconDraw(b, ctx, t) { for (let k = 0; k < 3; k++) { const [fx, fy] = fig8At(t / 7 + k / 3); drawStar(ctx, fx * 92, fy * 92, TB_COLS()[k], t, 0.42); } },
  onDeath(b) {
    for (const o of b.bodies) { FX.burst(o.x, o.y, 50, 520, [o.ci, PI_.white], { life: 1, size: 5 }); FX.ring(o.x, o.y, 20, 360, 0.9, o.ci, 6); }
    FX.text(b.x, b.y - 130, 'No closed-form solution exists.', PI_.gold, { size: 22, font: 'serif', life: 2.6, vy: -14 });
  },
};
