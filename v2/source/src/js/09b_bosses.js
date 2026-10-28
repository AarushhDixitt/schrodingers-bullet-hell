// ---------- bosses IV: thermodynamics, interference, gravitation ----------
const nextAtk = (b, pool, durs, lines) => {
  if (!b.queue.length) b.queue = shuffle(pool.slice());
  b.atk = b.queue.shift(); b.at = 0; b.fire = 0.35; b.dur = durs[b.atk] || 4;
  if (lines && lines[b.atk]) Game.bossLine(b, lines[b.atk]);
};

// ===== Maxwell's Demon: a membrane splits the arena; the demon works the door and heats your side =====
function demonFace(ctx, x, y, s, lookA, dizzy, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // horns
  ctx.fillStyle = '#1a0d14'; ctx.strokeStyle = '#ffb08a'; ctx.lineWidth = 2;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 16, -32); ctx.quadraticCurveTo(d * 30, -52, d * 38, -62); ctx.quadraticCurveTo(d * 28, -44, d * 30, -26); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // body: half hot, half cold
  const g = ctx.createLinearGradient(-40, 0, 40, 0); g.addColorStop(0, '#ff4a3d'); g.addColorStop(0.48, '#7a1f3a'); g.addColorStop(0.52, '#1f3a7a'); g.addColorStop(1, '#4ab0ff');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5; ctx.stroke();
  // eyes
  for (const d of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(d * 14, -8, 9, 11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#12091a';
    if (dizzy) { ctx.lineWidth = 2; ctx.strokeStyle = '#12091a'; ctx.beginPath(); for (let k = 0; k < 18; k++) { const a = k * 0.7 + t * 9 * d, r = k * 0.42; ctx.lineTo(d * 14 + Math.cos(a) * r, -8 + Math.sin(a) * r); } ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(d * 14 + Math.cos(lookA) * 4, -8 + Math.sin(lookA) * 5, 4.2, 0, TAU); ctx.fill(); }
  }
  // grin
  ctx.strokeStyle = '#12091a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 8, 18, 0.25, PI - 0.25); ctx.stroke();
  ctx.fillStyle = '#fff'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 6 - 2.5, 20 - Math.abs(k) * 1.6); ctx.lineTo(k * 6 + 2.5, 20 - Math.abs(k) * 1.6); ctx.lineTo(k * 6, 25 - Math.abs(k) * 1.6); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

BOSS_DEFS.maxwell = {
  name: 'Maxwell’s Demon', sub: 'Sorts fast molecules from slow ones, and never pays for the information.', hp: 2700, r: 46, col: 'red', score: 80000,
  init(b) {
    b.wx = W / 2; b.x = W / 2; b.y = 420; b.doorH = 220; b.open = 0; b.doorWant = false; b.doorT = 3.2; b.queue = []; b.atk = null; b.at = 0; b.fire = 0;
    b.bits = 0; b.tape = ''; b.erase = 0; b.T = [300, 300]; b.tT = 0; b.pside = 0; b.wxT = W / 2; b.dy = 640;
  },
  syncWall(b) {
    const Wl = Game.wall; if (!Wl) return;
    b.dy = clamp(b.y < H / 2 ? b.y + 200 : b.y - 200, b.doorH / 2 + 30, H - b.doorH / 2 - 30);
    Wl.x = b.wx; Wl.open = b.open > 0.55; Wl.d0 = b.dy - b.doorH / 2 * b.open; Wl.d1 = b.dy + b.doorH / 2 * b.open;
  },
  molecule(b, side, hot, y, spMul = 1) {
    const a = (side > 0 ? 0 : PI) + rand(-1.05, 1.05), sp = (hot ? rand(235, 295) : rand(100, 135)) * spMul * (b.phase >= 3 ? 1.12 : 1);
    Bullets.fire(b.wx + side * 16, y, Math.cos(a) * sp, Math.sin(a) * sp, { col: hot ? PI_.red : PI_.ice, r: hot ? 6 : 7, bounce: 4, life: hot ? 7.5 : 9, mol: true });
    b.bits++; if (b.tape.length > 40) b.tape = b.tape.slice(-40); b.tape += hot ? '1' : '0';
  },
  update(b, dt) {
    if (!Game.wall) Game.wall = { x: b.wx, hw: 8, open: false, d0: 0, d1: 0 };
    const P = Player, side = (P.x >= b.wx ? 1 : -1), sp = b.phase >= 3 ? 1.25 : b.phase >= 2 ? 1.12 : 1;
    b.lookA = Math.atan2(Game.ty - b.y, Game.tx - b.x);
    // temperatures (for the HUD and the tint)
    b.tT -= dt;
    if (b.tT <= 0) {
      b.tT = 0.35; const s2 = [0, 0], n = [0, 0];
      for (let i = 0; i < Bullets.en; i++) { if (!(Bullets.eflag[i] & 128)) continue; const k = Bullets.ex[i] < b.wx ? 0 : 1; s2[k] += Bullets.evx[i] ** 2 + Bullets.evy[i] ** 2; n[k]++; }
      for (const k of [0, 1]) b.T[k] += ((n[k] ? 40 + s2[k] / n[k] * 0.0042 : 40) - b.T[k]) * 0.5;
    }
    if (b.erase > 0) { // Landauer: forgetting costs energy, so it cannot fight while it pays
      b.erase -= dt; b.open += (1 - b.open) * damp(6, dt); this.syncWall(b);
      if (b.erase <= 0) { b.bits = 0; b.tape = ''; Game.bossLine(b, 'Memory clear. Back to work.'); }
      return;
    }
    // ride the wall, following the cat
    const ty = clamp(P.y + (b.phase >= 2 ? Math.sin(b.t * 0.9) * 170 : 0), 160, H - 160);
    b.y += (ty - b.y) * damp(b.phase >= 3 ? 1.5 : 1.0, dt);
    // the door opens on a timer
    b.doorT -= dt;
    if (b.doorT <= 0) { b.doorWant = !b.doorWant; b.doorT = b.doorWant ? 2.6 : rand(3.4, 4.8); if (b.doorWant) Audio2.sfx('door'); }
    b.open += ((b.doorWant || b.atk === 'shutter' && Math.sin(b.at * 8) > 0 ? 1 : 0) - b.open) * damp(9, dt);
    // the wall itself (moved by the piston attack)
    const ox = b.wx; b.wx += (b.wxT - b.wx) * damp(1.6, dt); b.x = b.wx;
    const dx = b.wx - ox;
    if (Math.abs(dx) > 0.01) { // a moving piston pushes molecules ahead of it, and they come off faster
      for (let i = 0; i < Bullets.en; i++) {
        const x = Bullets.ex[i];
        if ((dx > 0 && x > ox - 10 && x < b.wx + 9) || (dx < 0 && x < ox + 10 && x > b.wx - 9)) {
          Bullets.ex[i] = b.wx + Math.sign(dx) * 10; Bullets.evx[i] = Math.sign(dx) * Math.abs(Bullets.evx[i]) + dx / dt * 1.6;
        }
      }
    }
    this.syncWall(b);
    // attacks
    if (!b.atk) nextAtk(b, b.phase >= 2 ? ['effuse', 'blackbody', 'piston', 'shutter', 'convect'] : ['effuse', 'blackbody', 'piston', 'shutter'],
      { effuse: 3.4, blackbody: 3.2, piston: 5.5, shutter: 3.4, convect: 4.2 },
      { effuse: 'Fast ones to your side.', blackbody: 'Thermal radiation.', piston: 'Adiabatic compression.', shutter: 'Open. Shut. Open.', convect: 'Convection currents.' });
    b.at += dt; b.fire -= dt;
    const fy = () => clamp(b.y + rand(-220, 220), 30, H - 30);
    if (b.atk === 'effuse') {
      if (b.fire <= 0) { b.fire = 0.11 / sp; this.molecule(b, side, true, fy()); if (Math.random() < 0.3) this.molecule(b, -side, false, fy()); }
    } else if (b.atk === 'blackbody') {
      if (b.fire <= 0) {
        b.fire = 0.85 / sp;
        for (let k = 0; k < 22; k++) {
          const a = k / 22 * TAU + b.t, s = rand(120, 270), hot = s > 200;
          Bullets.fire(b.x + Math.cos(a) * 44, b.y + Math.sin(a) * 44, Math.cos(a) * s, Math.sin(a) * s, { col: s > 240 ? PI_.white : hot ? PI_.orange : PI_.red, r: 6.5, bounce: 1, life: 7 });
        }
        b.bits += 4; Audio2.sfx('bossShot');
      }
    } else if (b.atk === 'piston') {
      b.wxT = b.at < 3.8 ? W / 2 + side * (b.phase >= 3 ? 400 : 330) : W / 2;
      if (b.fire <= 0) { b.fire = 0.2 / sp; this.molecule(b, side, true, fy(), 0.85); }
    } else if (b.atk === 'shutter') {
      if (b.open > 0.6 && b.fire <= 0) {
        b.fire = 0.12 / sp;
        const a = (side > 0 ? 0 : PI) + rand(-0.7, 0.7), s = rand(250, 310), y = rand(Game.wall.d0 + 10, Game.wall.d1 - 10);
        Bullets.fire(b.wx + side * 14, y, Math.cos(a) * s, Math.sin(a) * s, { col: PI_.red, r: 6, bounce: 3, life: 7, mol: true }); b.bits++;
      }
    } else if (b.atk === 'convect') {
      if (b.fire <= 0) {
        b.fire = 0.22 / sp;
        const cx = b.wx + side * 380, cy = H / 2 + Math.sin(b.at * 1.3) * 300;
        for (let k = 0; k < 4; k++) { const a = b.at * 3 + k * PI / 2; Bullets.fire(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, -Math.sin(a) * 210, Math.cos(a) * 210, { col: PI_.orange, r: 6, turn: 1.3, bounce: 3, life: 6.5, mol: true }); }
        b.bits += 2;
      }
    }
    if (b.at >= b.dur) { b.atk = null; b.wxT = W / 2; }
    if (b.bits >= 96) {
      b.erase = 3.4; b.atk = null; b.wxT = W / 2;
      Game.banner('ERASING MEMORY', 'Forgetting 96 bits costs 96 kT ln 2. It cannot fight while it pays. Double damage.', 2);
      FX.text(b.x, b.y - 80, 'kT ln 2', PI_.ice, { size: 22, font: 'serif', life: 1.6 });
      Audio2.sfx('erase');
    }
  },
  constrain(b, P) {
    const Wl = Game.wall; if (!Wl) return;
    const m = Wl.hw + 16, inDoor = Wl.open && P.y > Wl.d0 + 12 && P.y < Wl.d1 - 12;
    if (inDoor) { b.pside = P.x >= Wl.x ? 1 : -1; return; }
    const sd = b.pside || (P.x >= Wl.x ? 1 : -1);
    if ((P.x - Wl.x) * sd < m) { P.x = Wl.x + sd * m; P.vx = sd > 0 ? Math.max(0, P.vx) : Math.min(0, P.vx); }
    b.pside = sd;
  },
  hit(b, x, y) { const dx = x - b.x, dy = y - b.y; return dx * dx + dy * dy < 46 * 46 ? (b.erase > 0 ? 2 : 1) : 0; },
  touch(b, x, y, hr) { const dx = x - b.x, dy = y - b.y; return dx * dx + dy * dy < (38 + hr) ** 2; },
  hud(b, c, x, y) {
    const mine = Player.x < b.wx ? 0 : 1;
    c.font = fontSerif(16); c.textAlign = 'center';
    c.fillStyle = '#ece7ff';
    c.fillText(`your side ${Math.round(b.T[mine])} K   ·   other side ${Math.round(b.T[1 - mine])} K`, x, y);
    c.font = fontMono(10, 600); c.fillStyle = b.erase > 0 ? '#4cf2ff' : '#9a93c4';
    c.fillText(b.erase > 0 ? 'ERASING MEMORY · DOUBLE DAMAGE' : 'DEMON MEMORY ' + Math.min(96, b.bits) + ' / 96 BITS', x, y + 18);
  },
  draw(b, ctx) {
    const Wl = Game.wall || { x: b.wx, d0: b.dy, d1: b.dy, open: false };
    const tL = clamp((b.T[0] - 60) / 500, 0, 1), tR = clamp((b.T[1] - 60) / 500, 0, 1);
    // chamber tints
    ctx.globalCompositeOperation = 'lighter';
    for (const [x0, x1, t] of [[0, b.wx, tL], [b.wx, W, tR]]) {
      const g = ctx.createLinearGradient(b.wx, 0, x0 === 0 ? 0 : W, 0);
      const c = mixRGB(COL.ice, COL.red, t);
      g.addColorStop(0, rgba(c, 0.13)); g.addColorStop(1, rgba(c, 0.02));
      ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, H);
    }
    ctx.globalCompositeOperation = 'source-over';
    // the membrane, with its door
    const seg = (y0, y1) => {
      if (y1 <= y0) return;
      const g = ctx.createLinearGradient(b.wx - 9, 0, b.wx + 9, 0); g.addColorStop(0, rgbStr(mixRGB(COL.ice, COL.red, tL))); g.addColorStop(0.3, '#1b1428'); g.addColorStop(0.7, '#1b1428'); g.addColorStop(1, rgbStr(mixRGB(COL.ice, COL.red, tR)));
      ctx.fillStyle = g; ctx.fillRect(b.wx - 9, y0, 18, y1 - y0);
      ctx.strokeStyle = 'rgba(236,231,255,.25)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let y = y0 + 12; y < y1; y += 24) { ctx.moveTo(b.wx - 7, y); ctx.lineTo(b.wx + 7, y - 8); }
      ctx.stroke();
    };
    const half = b.doorH / 2, op = clamp(b.open, 0, 1);
    seg(-20, b.dy - half); seg(b.dy + half, H + 20);
    // sliding door panels
    ctx.fillStyle = '#2b2140'; ctx.strokeStyle = PAL_CSS[PI_.gold]; ctx.lineWidth = 2;
    const ph = half * (1 - op);
    if (ph > 1) { ctx.fillRect(b.wx - 7, b.dy - half, 14, ph); ctx.strokeRect(b.wx - 7, b.dy - half, 14, ph); ctx.fillRect(b.wx - 7, b.dy + half - ph, 14, ph); ctx.strokeRect(b.wx - 7, b.dy + half - ph, 14, ph); }
    if (op > 0.5) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * op; ctx.drawImage(softSprite(PI_.gold, 64), b.wx - 50, b.dy - half, 100, b.doorH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    // lever from demon to door
    ctx.strokeStyle = '#8f88b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.wx, b.y); ctx.lineTo(b.wx + 30 * (Player.x >= b.wx ? 1 : -1), (b.y + b.dy) / 2); ctx.lineTo(b.wx, b.dy + (b.dy > b.y ? -half : half)); ctx.stroke();
    // memory tape
    ctx.font = fontMono(12, 600); ctx.textAlign = 'center';
    const tape = b.tape.slice(-22).padStart(22, '·');
    ctx.fillStyle = b.erase > 0 ? (Math.sin(b.t * 30) > 0 ? '#4cf2ff' : 'rgba(76,242,255,.3)') : 'rgba(236,231,255,.7)';
    ctx.fillText(b.erase > 0 ? 'kT ln 2 · kT ln 2 · kT ln 2' : tape, b.x, b.y - 74);
    // halo + demon
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.drawImage(softSprite(b.erase > 0 ? PI_.ice : PI_.red, 128), b.x - 110, b.y - 110, 220, 220); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
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
  const s = Math.sin(th), ph = PI * d * s / lam;
  const sn = Math.sin(ph);
  const multi = Math.abs(sn) < 1e-4 ? 1 : (Math.sin(n * ph) / (n * sn)) ** 2;
  const be = PI * a * s / lam, env = Math.abs(be) < 1e-4 ? 1 : (Math.sin(be) / be) ** 2;
  return multi * env;
}
function drawGun(ctx, x, y, s, t, hurt) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(softSprite(PI_.cyan, 128), -110, -90, 220, 220); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createLinearGradient(-50, 0, 50, 0); g.addColorStop(0, '#1b2a3a'); g.addColorStop(0.5, '#4d6b86'); g.addColorStop(1, '#1b2a3a');
  ctx.fillStyle = g; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-46, -60, 92, 96, 10); else ctx.rect(-46, -60, 92, 96); ctx.fill();
  ctx.strokeStyle = hurt ? '#ff3b55' : '#4cf2ff'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,207,74,.75)'; ctx.lineWidth = 3;
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(0, -44 + k * 15, 50, 5, 0, 0, PI); ctx.stroke(); }
  ctx.fillStyle = '#0b1220'; ctx.beginPath(); ctx.moveTo(-24, 36); ctx.lineTo(24, 36); ctx.lineTo(12, 58); ctx.lineTo(-12, 58); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 12); ctx.beginPath(); ctx.arc(0, 58, 7, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.font = fontSerif(15, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#d6f6ff'; ctx.fillText('e⁻', 0, -8);
  ctx.restore();
}
BOSS_DEFS.slit = {
  name: 'The Double Slit', sub: 'Every bullet goes through both slits. Look straight at a slit and the pattern changes.', hp: 3000, r: 64, col: 'cyan', score: 100000,
  init(b) { b.by = 270; b.byT = 270; b.cx = W / 2; b.d = 170; b.ns = 2; b.single = false; b.x = W / 2; b.y = 130; b.lam = 64; b.queue = []; b.atk = null; b.at = 0; b.fire = 0; b.dots = []; b.obs = -1; },
  slits(b) { if (b.single) return [b.cx]; const out = []; for (let k = 0; k < b.ns; k++) out.push(b.cx + (k - (b.ns - 1) / 2) * b.d); return out; },
  watched(b) { // which slit is the cat aiming straight at?
    if (Player.dead || b.phase >= 3) return -1;
    const S = this.slits(b);
    for (let k = 0; k < S.length; k++) { const a = Math.atan2(b.by - Player.y, S[k] - Player.x); if (Math.abs(angDiff(Player.aimA, a)) < 0.075) return k; }
    return -1;
  },
  update(b, dt) {
    const sp = b.phase >= 3 ? 1.25 : b.phase >= 2 ? 1.1 : 1;
    if (b.phase >= 2 && b.ns === 2) { b.ns = 3; b.d = 150; Game.banner('DIFFRACTION GRATING', 'Three slits now. Narrower bright lanes, and fainter ones in between.', 1.8); }
    if (b.phase >= 3) b.byT = 400;
    b.by += (b.byT - b.by) * damp(0.8, dt);
    b.cx = W / 2 + Math.sin(b.t * (b.phase >= 3 ? 0.42 : 0.28)) * 520;
    b.x = b.cx; b.y = b.by - 140;
    b.lam = 64 + 18 * Math.sin(b.t * 0.55);
    const obs = this.watched(b);
    if (obs >= 0 && b.obs < 0 && !b.toldObs) { b.toldObs = true; Game.bossLine(b, 'You are watching a slit. Which-path information destroys the pattern.'); }
    b.obs = obs;
    if (!b.atk) nextAtk(b, b.phase >= 2 ? ['fringes', 'huygens', 'diffract', 'fringes', 'photons'] : ['fringes', 'huygens', 'diffract', 'photons'],
      { fringes: 5.2, huygens: 3.8, diffract: 3.8, photons: 3 },
      { fringes: 'I = I₀ cos²(πd sinθ / λ)', huygens: 'Every point of a wavefront is a new source.', diffract: 'One slit. Watch the central maximum.', photons: 'One photon at a time.' });
    b.single = b.atk === 'diffract';
    b.at += dt; b.fire -= dt;
    const S = this.slits(b), y0 = b.by + 18, mid = S.reduce((a, c) => a + c, 0) / S.length;
    if (b.atk === 'fringes' && b.fire <= 0) {
      b.fire = 0.78 / sp;
      if (b.obs >= 0) {
        for (const sx of S) for (let k = 0; k < 7; k++) { const a = PI / 2 + gauss() * 0.11; Bullets.fire(sx, y0, Math.cos(a) * 230, Math.sin(a) * 230, { col: PI_.white, r: 6.5, kind: 1, life: 8 }); }
      } else {
        for (let j = 0; j < 96; j++) {
          const th = -1.25 + 2.5 * j / 95;
          if (slitIntensity(th, b.d, b.lam, b.ns, 46) > 0.55) Bullets.fire(mid, y0, Math.cos(PI / 2 + th) * 240, Math.sin(PI / 2 + th) * 240, { col: PI_.cyan, r: 6, life: 8 });
        }
      }
      Audio2.sfx('bossShot');
    } else if (b.atk === 'huygens' && b.fire <= 0) {
      b.fire = 0.5 / sp;
      for (const sx of S) for (let k = 0; k <= 16; k++) { const a = PI * 0.06 + k / 16 * PI * 0.88; Bullets.fire(sx, y0, Math.cos(a) * 170, Math.sin(a) * 170, { col: PI_.ice, r: 6.5, life: 8 }); }
    } else if (b.atk === 'diffract' && b.fire <= 0) {
      b.fire = 0.1 / sp;
      for (let k = 0; k < 3; k++) {
        let th = 0; for (let tries = 0; tries < 30; tries++) { th = rand(-1.2, 1.2); if (Math.random() < slitIntensity(th, 1, b.lam, 1, 120)) break; }
        Bullets.fire(b.cx, y0, Math.cos(PI / 2 + th) * 260, Math.sin(PI / 2 + th) * 260, { col: PI_.cyan, r: 6, life: 8 });
      }
    } else if (b.atk === 'photons' && b.fire <= 0) {
      b.fire = 0.45 / sp;
      let best = S[0]; for (const sx of S) if (Math.abs(sx - Game.tx) < Math.abs(best - Game.tx)) best = sx;
      Bullets.aimAt(best, y0, Game.tx, Game.ty, 330, { col: PI_.white, r: 6.5, kind: 1 }, 3, 0.16);
      Audio2.sfx('eshot');
    }
    if (b.at >= b.dur) b.atk = null;
    // the detector screen at the bottom builds up the pattern, one hit at a time
    for (let i = 0; i < Bullets.en; i++) if (Bullets.ey[i] > H - 30 && !(Bullets.eflag[i] & 4)) { Bullets.eflag[i] |= 4; if (b.dots.length < 900) b.dots.push(Bullets.ex[i], rand(2, 26)); }
  },
  constrain(b, P) { const lim = b.by + 16 + 26; if (P.y < lim) { P.y = lim; P.vy = Math.max(0, P.vy); } },
  hit(b, x, y) {
    const dy = y - b.by;
    if (Math.abs(dy) < 16) { for (const sx of this.slits(b)) if (Math.abs(x - sx) < 19) return 0; return 0.35; }
    if (dy < -16) { const dx = x - b.x, ey = y - b.y; if (dx * dx + ey * ey < 66 * 66) return 2; }
    return 0;
  },
  touch() { return false; },
  camTop(b) { return b.y - 75; },
  aimPoint(b, x) { let best = this.slits(b)[0]; for (const sx of this.slits(b)) if (Math.abs(sx - x) < Math.abs(best - x)) best = sx; return { x: best, y: b.by - 30 }; },
  draw(b, ctx) {
    const S = this.slits(b), mid = S.reduce((a, c) => a + c, 0) / S.length, y0 = b.by + 18;
    // faint rays: the pattern that is about to be fired
    if (b.atk === 'fringes' || b.atk === 'diffract') {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 3;
      for (let j = 0; j < 72; j++) {
        const th = -1.25 + 2.5 * j / 71;
        let I = b.atk === 'diffract' ? slitIntensity(th, 1, b.lam, 1, 120) : slitIntensity(th, b.d, b.lam, b.ns, 46);
        if (b.atk === 'fringes' && b.obs >= 0) I = 0;
        if (I < 0.2) continue;
        ctx.strokeStyle = rgba(COL.cyan, 0.07 * I);
        ctx.beginPath(); ctx.moveTo(b.atk === 'diffract' ? b.cx : mid, y0); ctx.lineTo(mid + Math.cos(PI / 2 + th) * 1500, y0 + Math.sin(PI / 2 + th) * 1500); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // detector screen
    ctx.fillStyle = 'rgba(76,242,255,.06)'; ctx.fillRect(0, H - 30, W, 30);
    ctx.fillStyle = 'rgba(160,240,255,.75)';
    for (let k = 0; k < b.dots.length; k += 2) ctx.fillRect(b.dots[k] - 1.5, H - b.dots[k + 1] - 1.5, 3, 3);
    // the gun behind the barrier, and its light
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, b.y, 0, b.by); g.addColorStop(0, 'rgba(76,242,255,.18)'); g.addColorStop(1, 'rgba(76,242,255,.02)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b.x - 14, b.y + 56); ctx.lineTo(b.x + 14, b.y + 56); ctx.lineTo(b.cx + 420, b.by); ctx.lineTo(b.cx - 420, b.by); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    drawGun(ctx, b.x, b.y, 1, b.t, b.flash > 0);
    // the barrier, cut by the slits
    const edges = [-60]; for (const sx of S) edges.push(sx - 19, sx + 19); edges.push(W + 60);
    for (let k = 0; k < edges.length; k += 2) {
      const x0 = edges[k], x1 = edges[k + 1]; if (x1 <= x0) continue;
      const gg = ctx.createLinearGradient(0, b.by - 16, 0, b.by + 16); gg.addColorStop(0, '#2a3a50'); gg.addColorStop(0.5, '#101826'); gg.addColorStop(1, '#2a3a50');
      ctx.fillStyle = gg; ctx.fillRect(x0, b.by - 16, x1 - x0, 32);
      ctx.strokeStyle = 'rgba(76,242,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, b.by + 16); ctx.lineTo(x1, b.by + 16); ctx.moveTo(x0, b.by - 16); ctx.lineTo(x1, b.by - 16); ctx.stroke();
    }
    S.forEach((sx, k) => {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8; ctx.drawImage(glowSprite(PI_.cyan, 64), sx - 30, b.by - 30, 60, 60); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (k === b.obs && !b.single) {
        ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(sx, b.by, 34, 18, 0, 0, TAU); ctx.stroke();
        ctx.font = fontMono(10, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#ffcf4a'; ctx.fillText('WATCHED', sx, b.by + 40);
      }
    });
  },
  iconDraw(b, ctx, t) {
    drawGun(ctx, 0, -34, 0.62, t, false);
    ctx.fillStyle = '#1a2636'; ctx.fillRect(-110, 16, 82, 16); ctx.fillRect(-12, 16, 24, 16); ctx.fillRect(28, 16, 82, 16);
    ctx.strokeStyle = '#4cf2ff'; ctx.lineWidth = 1.5; ctx.strokeRect(-110, 16, 82, 16); ctx.strokeRect(-12, 16, 24, 16); ctx.strokeRect(28, 16, 82, 16);
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 40; j++) { const th = -1.1 + 2.2 * j / 39, I = slitIntensity(th, 3, 1, 2, 1); ctx.strokeStyle = rgba(COL.cyan, 0.5 * I); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(Math.cos(PI / 2 + th) * 110, 32 + Math.sin(PI / 2 + th) * 110); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
  },
  onDeath(b) {
    for (let k = 0; k < 70; k++) { const a = PI / 2 + rand(-1.3, 1.3); FX.spawn(b.cx, b.by + 20, Math.cos(a) * rand(200, 700), Math.sin(a) * rand(200, 700), rand(0.8, 1.6), rand(3, 7), pick([PI_.cyan, PI_.white, PI_.ice]), 1, 1.2); }
    FX.text(b.x, b.by + 90, 'It went through both slits. And neither.', PI_.cyan, { size: 22, font: 'serif', life: 2.8, vy: -14 });
  },
};

// ===== The Three-Body Problem: three suns, real Newtonian gravity, no closed-form solution =====
let FIG8 = null;
function fig8() { // the Chenciner–Montgomery figure-eight choreography, integrated once
  if (FIG8) return FIG8;
  const N = 1200, T = 6.32591398, h = T / N;
  let s = [0.97000436, -0.24308753, 0.466203685, 0.43236573, -0.97000436, 0.24308753, 0.466203685, 0.43236573, 0, 0, -0.93240737, -0.86473146];
  const f = s => {
    const o = new Array(12);
    for (let i = 0; i < 3; i++) {
      let ax = 0, ay = 0;
      for (let j = 0; j < 3; j++) { if (i === j) continue; const dx = s[j * 4] - s[i * 4], dy = s[j * 4 + 1] - s[i * 4 + 1], r3 = Math.pow(dx * dx + dy * dy, 1.5); ax += dx / r3; ay += dy / r3; }
      o[i * 4] = s[i * 4 + 2]; o[i * 4 + 1] = s[i * 4 + 3]; o[i * 4 + 2] = ax; o[i * 4 + 3] = ay;
    }
    return o;
  };
  const xs = new Float32Array(N), ys = new Float32Array(N);
  const add = (a, k, m) => a.map((v, i) => v + k[i] * m);
  for (let n = 0; n < N; n++) {
    xs[n] = s[0]; ys[n] = s[1];
    const k1 = f(s), k2 = f(add(s, k1, h / 2)), k3 = f(add(s, k2, h / 2)), k4 = f(add(s, k3, h));
    s = s.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  return (FIG8 = { xs, ys, N });
}
function fig8At(u) { const F = fig8(), p = (((u % 1) + 1) % 1) * F.N, i = Math.floor(p) % F.N, j = (i + 1) % F.N, f = p - Math.floor(p); return [F.xs[i] + (F.xs[j] - F.xs[i]) * f, F.ys[i] + (F.ys[j] - F.ys[i]) * f]; }
const TB_COLS = () => [PI_.gold, PI_.coral, PI_.ice];
function drawStar(ctx, x, y, ci, t, s = 1) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55; ctx.drawImage(softSprite(ci, 128), x - 95 * s, y - 95 * s, 190 * s, 190 * s); ctx.globalAlpha = 1;
  ctx.strokeStyle = rgba(PAL[ci], 0.5); ctx.lineWidth = 2 * s; ctx.beginPath();
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + t * 0.4, l = (52 + 10 * Math.sin(t * 3 + k * 1.7)) * s; ctx.moveTo(x + Math.cos(a) * 40 * s, y + Math.sin(a) * 40 * s); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(x - 10 * s, y - 10 * s, 4 * s, x, y, 40 * s); g.addColorStop(0, '#fff'); g.addColorStop(0.45, PAL_CSS[ci]); g.addColorStop(1, rgba(mixRGB(PAL[ci], [0, 0, 0], 0.5), 1));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 40 * s, 0, TAU); ctx.fill();
}
BOSS_DEFS.threebody = {
  name: 'The Three-Body Problem', sub: 'Three suns, real Newtonian gravity, and no closed-form solution.', hp: 3300, r: 46, col: 'gold', score: 120000,
  init(b) {
    b.x = W / 2; b.y = 560; b.queue = []; b.atk = null; b.at = 0; b.fire = 0; b.mode = 'free'; b.blend = 0; b.u = 0; b.sling = -1;
    b.bodies = [0, 1, 2].map(k => { const a = k * TAU / 3 - PI / 2; return { x: W / 2 + Math.cos(a) * 300, y: 560 + Math.sin(a) * 300, vx: -Math.sin(a) * 220, vy: Math.cos(a) * 220, ci: TB_COLS()[k], trail: [], trT: 0, fire: k * 0.5 }; });
  },
  GM: 2e7,
  update(b, dt) {
    const sp = b.phase >= 3 ? 1.25 : b.phase >= 2 ? 1.12 : 1, GM = this.GM * (b.phase >= 3 ? 1.2 : 1), B3 = b.bodies;
    if (!b.atk) nextAtk(b, b.phase >= 2 ? ['orbit', 'eight', 'sling', 'syzygy'] : ['orbit', 'eight', 'sling', 'orbit'],
      { orbit: 5, eight: 8.5, sling: 3.6, syzygy: 5.6 },
      { orbit: 'F = Gm₁m₂ / r²', eight: 'The figure-eight. A rare stable solution.', sling: 'Gravitational slingshot.', syzygy: 'Syzygy: all three in a line.' });
    b.at += dt; b.fire -= dt;
    const target = b.atk === 'eight' ? 'eight' : b.atk === 'syzygy' ? 'line' : 'free';
    if (target !== b.mode) {
      if (b.mode !== 'free' && target === 'free') for (const o of B3) { o.vx = (o.x - (o.px || o.x)) / Math.max(dt, 1e-3); o.vy = (o.y - (o.py || o.y)) / Math.max(dt, 1e-3); const v = Math.hypot(o.vx, o.vy); if (v > 320) { o.vx *= 320 / v; o.vy *= 320 / v; } }
      b.mode = target; b.blend = 0;
    }
    b.blend = Math.min(1, b.blend + dt / 1.2);
    for (const o of B3) { o.px = o.x; o.py = o.y; }
    if (b.mode === 'free') {
      for (let i = 0; i < 3; i++) {
        const o = B3[i]; if (i === b.sling && b.slingT > 0) continue;
        let ax = -0.35 * (o.x - W / 2), ay = -0.35 * (o.y - 600);
        for (let j = 0; j < 3; j++) { if (i === j) continue; const q = B3[j], dx = q.x - o.x, dy = q.y - o.y, r2 = dx * dx + dy * dy + 3600, a = GM / (r2 * Math.sqrt(r2)); ax += dx * a; ay += dy * a; }
        o.vx += ax * dt; o.vy += ay * dt;
        const v = Math.hypot(o.vx, o.vy), vmax = 520 * sp; if (v > vmax) { o.vx *= vmax / v; o.vy *= vmax / v; }
      }
      for (let i = 0; i < 3; i++) {
        const o = B3[i]; o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < 90 || o.x > W - 90) { o.vx = -o.vx * 0.9; o.x = clamp(o.x, 90, W - 90); if (i === b.sling) b.slingT = 0; }
        if (o.y < 90 || o.y > H - 90) { o.vy = -o.vy * 0.9; o.y = clamp(o.y, 90, H - 90); if (i === b.sling) b.slingT = 0; }
      }
    } else if (b.mode === 'eight') {
      b.u += dt / (7.2 / sp);
      for (let k = 0; k < 3; k++) { const [fx, fy] = fig8At(b.u + k / 3), tx = W / 2 + fx * 430, ty = 600 + fy * 430, o = B3[k]; o.x += (tx - o.x) * (b.blend < 1 ? damp(4, dt) : 1); o.y += (ty - o.y) * (b.blend < 1 ? damp(4, dt) : 1); }
    } else { // syzygy
      b.lineA = (b.lineA ?? Math.random() * PI) + dt * 0.33 * sp;
      for (let k = 0; k < 3; k++) { const o = B3[k], off = (k - 1) * 380, tx = W / 2 + Math.cos(b.lineA) * off, ty = 600 + Math.sin(b.lineA) * off; o.x += (tx - o.x) * damp(3, dt); o.y += (ty - o.y) * damp(3, dt); }
    }
    b.x = (B3[0].x + B3[1].x + B3[2].x) / 3; b.y = (B3[0].y + B3[1].y + B3[2].y) / 3;
    for (const o of B3) {
      Grid.attract(o.x, o.y, 6000, 300, dt);
      o.trT -= dt; if (o.trT <= 0) { o.trT = 0.05; o.trail.push(o.x, o.y); if (o.trail.length > 80) o.trail.splice(0, 2); }
    }
    // attacks
    if (b.atk === 'orbit') {
      for (const o of B3) { o.fire -= dt; if (o.fire <= 0) { o.fire = 1.25 / sp; Bullets.ring(o.x, o.y, b.phase >= 3 ? 17 : 14, 160, { col: o.ci, r: 6.5, life: 8 }, Math.random() * TAU); Audio2.sfx('bossShot'); } }
    } else if (b.atk === 'eight') {
      if (b.fire <= 0) {
        b.fire = 0.11 / sp;
        for (const o of B3) { const vx = o.x - o.px, vy = o.y - o.py, l = Math.hypot(vx, vy) || 1, s = Math.random() < 0.5 ? 1 : -1; Bullets.fire(o.x, o.y, -vy / l * 55 * s, vx / l * 55 * s, { col: o.ci, r: 6, life: 6 }); }
      }
      if (Math.floor(b.at / 1.1) !== b.aimK) { b.aimK = Math.floor(b.at / 1.1); for (const o of B3) Bullets.aimAt(o.x, o.y, Game.tx, Game.ty, 260, { col: PI_.white, r: 6.5, kind: 1 }); }
    } else if (b.atk === 'sling') {
      if (b.sling < 0) { // pick the sun farthest from the cat and aim it
        let best = 0, bd = -1; B3.forEach((o, k) => { const d = Math.hypot(o.x - Game.tx, o.y - Game.ty); if (d > bd) { bd = d; best = k; } });
        b.sling = best; b.slingA = Math.atan2(Game.ty - B3[best].y, Game.tx - B3[best].x); b.slingT = -0.9;
        Audio2.sfx('charge');
      }
      const o = B3[b.sling];
      if (b.slingT < 0) { b.slingT += dt; o.vx *= 0.9; o.vy *= 0.9; b.slingA += angDiff(b.slingA, Math.atan2(Game.ty - o.y, Game.tx - o.x)) * damp(2, dt); if (b.slingT >= 0) { b.slingT = 1.2; o.vx = Math.cos(b.slingA) * 950 * sp; o.vy = Math.sin(b.slingA) * 950 * sp; addTrauma(0.3); Audio2.sfx('tachyonDash'); } }
      else if (b.slingT > 0) {
        b.slingT -= dt; o.x += o.vx * dt; o.y += o.vy * dt;
        if (b.fire <= 0) { b.fire = 0.035; const l = Math.hypot(o.vx, o.vy) || 1; for (const s of [-1, 1]) Bullets.fire(o.x, o.y, -o.vy / l * 95 * s, o.vx / l * 95 * s, { col: o.ci, r: 6, life: 7 }); }
        if (o.x < 90 || o.x > W - 90 || o.y < 90 || o.y > H - 90) { b.slingT = 0; o.x = clamp(o.x, 90, W - 90); o.y = clamp(o.y, 90, H - 90); }
        if (b.slingT <= 0) { o.vx *= 0.3; o.vy *= 0.3; }
      }
    } else if (b.atk === 'syzygy') {
      b.beamOn = b.at > 1.1 && b.at < b.dur - 0.4;
      if (b.beamOn) { Game.beamHit(W / 2, 600, b.lineA, 1500, 11, b); Game.beamHit(W / 2, 600, b.lineA + PI, 1500, 11, b); }
      if (b.fire <= 0) { b.fire = 1.3 / sp; for (const o of B3) Bullets.ring(o.x, o.y, 10, 130, { col: o.ci, r: 6.5 }, b.t); }
    }
    if (b.at >= b.dur) { b.atk = null; b.sling = -1; b.beamOn = false; }
  },
  bulletForce(b, B, i, dt, isPlayer) {
    const x = isPlayer ? B.px[i] : B.ex[i], y = isPlayer ? B.py[i] : B.ey[i], G = isPlayer ? 1.4e6 : (b.phase >= 2 ? 3.6e6 : 3e6);
    let ax = 0, ay = 0;
    for (const o of b.bodies) { const dx = o.x - x, dy = o.y - y, r2 = dx * dx + dy * dy + 4900; if (r2 > 700 * 700) continue; const a = G / (r2 * Math.sqrt(r2)); ax += dx * a; ay += dy * a; }
    if (isPlayer) { B.pvx[i] += ax * dt; B.pvy[i] += ay * dt; } else { B.evx[i] += ax * dt; B.evy[i] += ay * dt; }
  },
  hit(b, x, y) { for (const o of b.bodies) { const dx = x - o.x, dy = y - o.y; if (dx * dx + dy * dy < 44 * 44) return 1; } return 0; },
  touch(b, x, y, hr) { for (const o of b.bodies) { const dx = x - o.x, dy = y - o.y; if (dx * dx + dy * dy < (36 + hr) ** 2) return true; } return false; },
  aimPoint(b, x, y) { let best = b.bodies[0], bd = 1e12; for (const o of b.bodies) { const d = (o.x - x) ** 2 + (o.y - y) ** 2; if (d < bd) { bd = d; best = o; } } return best; },
  draw(b, ctx) {
    const B3 = b.bodies;
    for (const o of B3) {
      const tr = o.trail; if (tr.length < 4) continue;
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let k = 2; k < tr.length; k += 2) { ctx.strokeStyle = rgba(PAL[o.ci], 0.4 * k / tr.length); ctx.beginPath(); ctx.moveTo(tr[k - 2], tr[k - 1]); ctx.lineTo(tr[k], tr[k + 1]); ctx.stroke(); }
    }
    if (b.atk === 'syzygy') {
      const a = b.lineA || 0, c = Math.cos(a), s = Math.sin(a);
      ctx.globalCompositeOperation = 'lighter';
      if (b.beamOn) { ctx.strokeStyle = 'rgba(255,207,74,.8)'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(W / 2 - c * 1500, 600 - s * 1500); ctx.lineTo(W / 2 + c * 1500, 600 + s * 1500); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.stroke(); }
      else { ctx.setLineDash([12, 12]); ctx.strokeStyle = 'rgba(255,207,74,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - c * 1500, 600 - s * 1500); ctx.lineTo(W / 2 + c * 1500, 600 + s * 1500); ctx.stroke(); ctx.setLineDash([]); }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (b.atk === 'sling' && b.sling >= 0 && b.slingT < 0) {
      const o = B3[b.sling]; ctx.setLineDash([10, 10]); ctx.strokeStyle = rgba(PAL[o.ci], 0.6); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + Math.cos(b.slingA) * 1600, o.y + Math.sin(b.slingA) * 1600); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const o of B3) drawStar(ctx, o.x, o.y, o.ci, b.t);
  },
  iconDraw(b, ctx, t) {
    for (let k = 0; k < 3; k++) { const [fx, fy] = fig8At(t / 7 + k / 3); drawStar(ctx, fx * 92, fy * 92, TB_COLS()[k], t, 0.42); }
  },
  onDeath(b) {
    for (const o of b.bodies) { FX.burst(o.x, o.y, 50, 520, [o.ci, PI_.white], { life: 1, size: 5 }); FX.ring(o.x, o.y, 20, 360, 0.9, o.ci, 6); }
    FX.text(b.x, b.y - 130, 'No closed-form solution exists.', PI_.gold, { size: 22, font: 'serif', life: 2.6, vy: -14 });
  },
};
