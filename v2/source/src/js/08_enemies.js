// ---------- classical matter ----------
const PHYS_HELLO = ['Hold still.', 'For science!', 'I need this for my thesis.', 'Smile, kitty.', 'Peer review incoming.', 'Collapse, darn you.', 'My grant depends on this.', 'Reviewer 2 sent me.', 'Is it alive? Let me look.', 'Copenhagen says hi.'];
const PHYS_CLICK = ['*click*', 'Observed!', 'Got it.', 'Data!', 'Measured.', 'Gotcha.'];
const PHYS_BYE = ['My funding!', 'Tenure denied.', 'Inconclusive…', 'p > 0.05', 'Retracted!', 'Not reproducible.', 'Ow, my h-index.'];

function steer(e, tx, ty, speed, accel, dt) {
  const dx = wdx(tx - e.x), dy = wdy(ty - e.y); const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const k = Math.min(1, accel * dt);
  e.vx += (dx / d * speed - e.vx) * k; e.vy += (dy / d * speed - e.vy) * k;
}
function moveEnemy(e, dt, bounce = true) {
  e.x += e.vx * dt; e.y += e.vy * dt;
  if (World.wrap) { e.x = wrapX(e.x); e.y = wrapY(e.y); return; }
  const r = e.r, b = Game.box, x0 = b ? b.x0 : 0, y0 = b ? b.y0 : 0, x1 = b ? b.x1 : W, y1 = b ? b.y1 : H;
  if (e.x < x0 + r) { e.x = x0 + r; if (bounce) e.vx = Math.abs(e.vx); }
  if (e.x > x1 - r) { e.x = x1 - r; if (bounce) e.vx = -Math.abs(e.vx); }
  if (e.y < y0 + r) { e.y = y0 + r; if (bounce) e.vy = Math.abs(e.vy); }
  if (e.y > y1 - r) { e.y = y1 - r; if (bounce) e.vy = -Math.abs(e.vy); }
  const Wl = Game.wall;
  if (Wl && Math.abs(e.x - Wl.x) < Wl.hw + r && !(Wl.open && e.y > Wl.d0 && e.y < Wl.d1)) { const sd = e.x < Wl.x ? -1 : 1; e.x = Wl.x + sd * (Wl.hw + r); e.vx = Math.abs(e.vx) * sd; }
}
function enemyAimAt(e) { return [Game.tx, Game.ty]; } // classical things aim at ⟨x⟩

const ET = {
  electron: {
    r: 10, hp: 1, score: 50, col: 'amber', mass: 0.6,
    init(e) { e.ph = Math.random() * TAU; e.spd = rand(150, 185); },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      steer(e, tx, ty, e.spd * Game.enemySpeedMul * Anom.enemySpeedMul(e), 2.4, dt);
      const dx = wdx(tx - e.x), dy = wdy(ty - e.y), d = Math.sqrt(dx * dx + dy * dy) || 1;
      const w = Math.sin(e.t * 5 + e.ph) * 90;
      e.x += -dy / d * w * dt; e.y += dx / d * w * dt;
      moveEnemy(e, dt);
    },
    draw(e, ctx, x, y) {
      const c = PAL_CSS[e.col];
      ctx.save(); ctx.translate(x, y); ctx.rotate(e.t * 2 + e.ph);
      ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 5.5, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      const a = e.t * 9; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Math.cos(a) * 13, Math.sin(a) * 5.5, 2.2, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, TAU); ctx.fill();
    },
  },
  proton: {
    r: 17, hp: 5, score: 150, col: 'coral', mass: 2,
    init(e) { e.fire = rand(1.2, 2.2); },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      steer(e, tx, ty, 85 * Game.enemySpeedMul * Anom.enemySpeedMul(e), 1.5, dt);
      moveEnemy(e, dt);
      e.fire -= dt;
      if (e.fire <= 0 && Game.inView(e.x, e.y, 40)) {
        e.fire = rand(2.1, 2.8) / Game.fireRateMul;
        const [fx, fy] = Anom.firePos(e);
        Bullets.aimAt(fx, fy, tx, ty, 235, { col: PI_.coral, r: 7 });
        Audio2.sfx('eshot');
      }
    },
    draw(e, ctx, x, y) {
      ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.18; ctx.fillStyle = PAL_CSS[e.col]; ctx.fill(); ctx.globalAlpha = 1;
      for (let k = 0; k < 3; k++) {
        const a = e.t * 2.2 + k * TAU / 3;
        ctx.fillStyle = k === 2 ? PAL_CSS[PI_.violet] : PAL_CSS[PI_.orange];
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 3.6, 0, TAU); ctx.fill();
      }
    },
  },
  muon: {
    r: 12, hp: 3, score: 120, col: 'orange', mass: 0.9,
    init(e) { e.decay = rand(5.5, 7.5); e.decay0 = e.decay; },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      steer(e, tx, ty, 255 * Game.enemySpeedMul * Anom.enemySpeedMul(e), 1.6, dt);
      moveEnemy(e, dt);
      e.decay -= dt;
      if (e.decay <= 0) {
        Bullets.ring(e.x, e.y, 8, 190, { col: PI_.orange, r: 6.5 }, Math.random() * TAU);
        FX.text(e.x, e.y - 18, 'μ⁻ → e⁻ ν̄ ν', PI_.orange, { size: 12, font: 'serif', life: 0.9 });
        Game.killEnemy(e, 'decay', true);
      }
    },
    draw(e, ctx, x, y) {
      const a = Math.atan2(e.vy, e.vx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = PAL_CSS[e.col];
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(0, 7); ctx.lineTo(-10, 0); ctx.lineTo(0, -7); ctx.closePath(); ctx.fill();
      ctx.restore();
      const f = clamp(e.decay / e.decay0, 0, 1);
      ctx.strokeStyle = f < 0.3 && Math.sin(e.t * 30) > 0 ? '#fff' : PAL_CSS[PI_.yellow]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 17, -PI / 2, -PI / 2 + f * TAU); ctx.stroke();
    },
  },
  tachyon: {
    r: 12, hp: 3, score: 160, col: 'pink', mass: 0.8,
    init(e) { e.state = 'rest'; e.st = rand(0.4, 1.2); e.dx = 0; e.dy = 0; },
    update(e, dt) {
      e.st -= dt;
      if (e.state === 'rest') {
        e.vx *= Math.exp(-3 * dt); e.vy *= Math.exp(-3 * dt);
        moveEnemy(e, dt);
        if (e.st <= 0) {
          const [tx, ty] = enemyAimAt(e);
          const dx = wdx(tx - e.x), dy = wdy(ty - e.y), d = Math.sqrt(dx * dx + dy * dy) || 1;
          const go = Math.min(d + 260, 900);
          e.dx = e.x + dx / d * go; e.dy = e.y + dy / d * go;
          if (!World.wrap) { e.dx = clamp(e.dx, 20, W - 20); e.dy = clamp(e.dy, 20, H - 20); }
          e.state = 'aim'; e.st = 0.95 / Game.fireRateMul;
          Audio2.sfx('tachyonAim');
        }
      } else if (e.state === 'aim') {
        e.vx *= 0.9; e.vy *= 0.9;
        if (e.st <= 0) { e.state = 'dash'; e.st = 0.75; Audio2.sfx('tachyonDash'); }
      } else if (e.state === 'dash') {
        const dx = wdx(e.dx - e.x), dy = wdy(e.dy - e.y), d = Math.sqrt(dx * dx + dy * dy);
        const sp = 1350 * Anom.enemySpeedMul(e);
        if (d < sp * dt || e.st <= 0) { e.state = 'rest'; e.st = rand(0.7, 1.3); e.vx = dx / (d || 1) * 120; e.vy = dy / (d || 1) * 120; }
        else { e.vx = dx / d * sp; e.vy = dy / d * sp; moveEnemy(e, dt, false); if (Math.random() < 0.8) FX.spawn(e.x, e.y, 0, 0, 0.35, 6, e.col, 0); }
      }
    },
    draw(e, ctx, x, y) {
      if (e.state === 'aim') {
        const tx = ix(e.dx), ty = iy(e.dy);
        ctx.setLineDash([8, 10]); ctx.strokeStyle = rgba(COL.pink, 0.55); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wdx(e.dx - e.x), y + wdy(e.dy - e.y)); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(e.t * 25);
        ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x + wdx(e.dx - e.x), y + wdy(e.dy - e.y), 13, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        void tx; void ty;
      }
      const a = e.state === 'aim' || e.state === 'dash' ? Math.atan2(wdy(e.dy - e.y), wdx(e.dx - e.x)) : Math.atan2(e.vy, e.vx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(8, 0); ctx.lineTo(-10, 10); ctx.moveTo(-2, -10); ctx.lineTo(14, 0); ctx.lineTo(-2, 10); ctx.stroke();
      ctx.restore();
    },
  },
  quark: {
    r: 10, hp: 3, score: 100, col: 'red', mass: 0.7,
    init(e, o) { e.triad = o.triad; e.slot = o.slot; e.col = [PI_.red, PI_.green, PI_.blue][o.slot]; },
    update(e, dt) {
      const T = e.triad; if (!T) { moveEnemy(e, dt); return; }
      const a = T.a + e.slot * TAU / 3, rr = 34 + 6 * Math.sin(Game.t * 3 + e.slot);
      const nx = T.x + Math.cos(a) * rr, ny = T.y + Math.sin(a) * rr;
      e.vx = wdx(nx - e.x) / Math.max(dt, 1e-4); e.vy = wdy(ny - e.y) / Math.max(dt, 1e-4);
      e.x = World.wrap ? wrapX(nx) : nx; e.y = World.wrap ? wrapY(ny) : ny;
    },
    draw(e, ctx, x, y) {
      ctx.fillStyle = PAL_CSS[e.col]; ctx.beginPath(); ctx.arc(x, y, 8.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x - 2.5, y - 2.5, 2.6, 0, TAU); ctx.fill();
    },
    onDeath(e) {
      const T = e.triad; if (!T) return;
      T.members[e.slot] = null; T.regen[e.slot] = 2.8;
      if (T.members.every(m => !m)) {
        if (T.regen.every(r => r > 0)) { Game.addScore(300, T.x, T.y - 20, 'colour neutral'); }
        T.done = true;
      }
    },
  },
  physicist: {
    r: 14, hp: 4, score: 200, col: 'chalk', mass: 1,
    init(e) { e.state = 'walk'; e.st = 0; e.face = 1; Game.say(e, pick(PHYS_HELLO), 2.2); e.shoot = rand(1.5, 3); if (Game.mode === 'arcade') Game.toastOnce('hint-phys', 'Physicists measure anything near them. Keep your cats away, or lose the superposition.'); },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      const dx = wdx(tx - e.x), dy = wdy(ty - e.y), d = Math.sqrt(dx * dx + dy * dy) || 1;
      e.face = dx >= 0 ? 1 : -1;
      if (e.state === 'walk') {
        steer(e, tx, ty, 78 * Game.enemySpeedMul * Anom.enemySpeedMul(e), 2, dt);
        moveEnemy(e, dt);
        e.st -= dt;
        if (d < 200 && Player.n > 1 && e.st <= 0) { e.state = 'charge'; e.st = 0.85; Audio2.sfx('charge'); }
        e.shoot -= dt;
        if (Player.n === 1 && e.shoot <= 0 && Game.inView(e.x, e.y, 0)) {
          e.shoot = rand(2.4, 3.2) / Game.fireRateMul;
          Bullets.aimAt(e.x, e.y - 6, tx, ty, 210, { col: PI_.ice, r: 6.5, kind: 1 });
          Audio2.sfx('eshot');
        }
      } else if (e.state === 'charge') {
        e.vx *= 0.85; e.vy *= 0.85; moveEnemy(e, dt);
        e.st -= dt;
        if (e.st <= 0) {
          const R2 = 215 * 215;
          const did = Player.measureRegion(b => { const ax = wdx(b.px - e.x), ay = wdy(b.py - e.y); return ax * ax + ay * ay < R2; }, e, 'NEAR ' + 'PHYSICIST');
          FX.ring(e.x, e.y, 10, 215, 0.45, PI_.white, 3);
          FX.burst(e.x, e.y - 8, 14, 260, PI_.white, { life: 0.3, size: 5 });
          if (did) Game.say(e, pick(PHYS_CLICK), 1.2);
          e.state = 'walk'; e.st = 3.6;
        }
      }
    },
    draw(e, ctx, x, y) {
      const f = e.face, bob = Math.sin(e.t * 9) * 1.2;
      ctx.save(); ctx.translate(x, y + bob); ctx.scale(f, 1);
      // coat
      ctx.fillStyle = '#e9e6f7'; ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(8, -2); ctx.lineTo(11, 15); ctx.lineTo(-11, 15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8f88b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 15); ctx.stroke();
      // legs
      ctx.strokeStyle = '#3a3166'; ctx.lineWidth = 2.6; const sw = Math.sin(e.t * 9) * 3;
      ctx.beginPath(); ctx.moveTo(-4, 15); ctx.lineTo(-4 + sw, 21); ctx.moveTo(4, 15); ctx.lineTo(4 - sw, 21); ctx.stroke();
      // head
      ctx.fillStyle = '#f4d7c2'; ctx.beginPath(); ctx.arc(0, -10, 7.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ece7ff'; ctx.beginPath(); ctx.arc(-3, -17, 4, 0, TAU); ctx.arc(2, -18, 4.5, 0, TAU); ctx.arc(6, -15, 3.5, 0, TAU); ctx.fill();
      // goggles
      ctx.strokeStyle = '#1e1838'; ctx.lineWidth = 1.6; ctx.fillStyle = 'rgba(76,242,255,.75)';
      ctx.beginPath(); ctx.arc(1.5, -10, 2.8, 0, TAU); ctx.arc(7, -10, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
      // clipboard / camera
      if (e.state === 'charge') {
        ctx.fillStyle = '#2b2448'; ctx.fillRect(8, -6, 10, 7); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(14, -2.5, 2.2, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = '#c9a36b'; ctx.fillRect(6, 2, 7, 9); ctx.fillStyle = '#fff'; ctx.fillRect(7, 4, 5, 6);
      }
      ctx.restore();
      if (e.state === 'charge') {
        const k = 1 - e.st / 0.85;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgba(COL.white, 0.25 + 0.5 * k); ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(x, y, 215 * (0.6 + 0.4 * k), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    onDeath(e) { Game.say(e, pick(PHYS_BYE), 1.6, true); },
  },
  positron: {
    r: 11, hp: 2, score: 100, col: 'pink', mass: 0.7,
    init(e) { e.ph = Math.random() * TAU; },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      steer(e, tx, ty, 140 * Game.enemySpeedMul * Anom.enemySpeedMul(e), 2, dt);
      const dx = wdx(tx - e.x), dy = wdy(ty - e.y), d = Math.sqrt(dx * dx + dy * dy) || 1;
      const zig = (Math.sin(e.t * 3.2 + e.ph) > 0 ? 1 : -1) * 140;
      e.x += -dy / d * zig * dt; e.y += dx / d * zig * dt;
      moveEnemy(e, dt);
    },
    draw(e, ctx, x, y) {
      const p = 1 + 0.12 * Math.sin(e.t * 12);
      ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x, y, 10 * p, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke();
    },
    onDeath(e) { Game.annihilate(e.x, e.y, 120, 5); },
  },
  turret: {
    r: 22, hp: 28, score: 500, col: 'violet', mass: 6,
    init(e) { e.anchor = null; e.ang = Math.random() * TAU; e.spin = chance(0.5) ? 1 : -1; e.flip = 4.5; e.fire = 0; e.reloc = 14; e.arms = Game.wave >= 9 ? 3 : 2; },
    update(e, dt) {
      if (!e.anchor) e.anchor = Game.farPoint(320);
      const d = Math.hypot(wdx(e.anchor.x - e.x), wdy(e.anchor.y - e.y));
      if (d > 8) { steer(e, e.anchor.x, e.anchor.y, 125, 2, dt); moveEnemy(e, dt); }
      else { e.vx *= 0.9; e.vy *= 0.9; }
      e.reloc -= dt; if (e.reloc <= 0) { e.anchor = null; e.reloc = 14; }
      e.flip -= dt;
      if (e.flip <= 0) { e.flip = 4.5; e.spin = -e.spin; FX.text(e.x, e.y - 30, e.spin > 0 ? 'spin ↑' : 'spin ↓', PI_.violet, { size: 12, font: 'serif' }); }
      e.ang += e.spin * 1.7 * dt;
      e.fire -= dt;
      if (e.fire <= 0 && d < 40) {
        e.fire = 0.13 / Game.fireRateMul;
        for (let k = 0; k < e.arms; k++) {
          const a = e.ang + k * TAU / e.arms;
          const [fx, fy] = Anom.firePos(e);
          Bullets.fire(fx + Math.cos(a) * 20, fy + Math.sin(a) * 20, Math.cos(a) * 165, Math.sin(a) * 165, { col: k % 2 ? PI_.ice : PI_.violet, r: 6.5, life: 8 });
        }
      }
    },
    draw(e, ctx, x, y) {
      ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + PI / 6; ctx.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); }
      ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = 0.16; ctx.fillStyle = PAL_CSS[e.col]; ctx.fill(); ctx.globalAlpha = 1;
      for (let k = 0; k < e.arms; k++) {
        const a = e.ang + k * TAU / e.arms;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 21, y + Math.sin(a) * 21, 3.5, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; const s = e.spin;
      ctx.beginPath(); ctx.moveTo(x, y + 8 * s); ctx.lineTo(x, y - 8 * s); ctx.moveTo(x - 5, y - 3 * s); ctx.lineTo(x, y - 8 * s); ctx.lineTo(x + 5, y - 3 * s); ctx.stroke();
    },
  },
  magnetar: {
    r: 25, hp: 46, score: 800, col: 'ice', mass: 10,
    init(e) { e.beamA = Math.random() * TAU; e.cycle = 0; e.beams = []; },
    update(e, dt) {
      const [tx, ty] = enemyAimAt(e);
      steer(e, tx, ty, 48 * Game.enemySpeedMul * Anom.enemySpeedMul(e), 0.8, dt);
      moveEnemy(e, dt);
      e.beamA += 0.55 * dt * Game.fireRateMul;
      e.cycle = (e.cycle + dt) % 4.2;
      const warn = e.cycle < 0.9, on = e.cycle >= 0.9 && e.cycle < 2.6;
      e.beamState = warn ? 1 : on ? 2 : 0;
      if (on) {
        for (const s of [0, PI]) Game.beamHit(e.x, e.y, e.beamA + s, 1400, 9, e);
      }
    },
    draw(e, ctx, x, y) {
      if (e.beamState) {
        ctx.globalCompositeOperation = 'lighter';
        for (const s of [0, PI]) {
          const a = e.beamA + s, ex = x + Math.cos(a) * 1400, ey = y + Math.sin(a) * 1400;
          if (e.beamState === 1) { ctx.strokeStyle = rgba(COL.ice, 0.35 + 0.2 * Math.sin(e.t * 30)); ctx.lineWidth = 1.5; ctx.setLineDash([10, 10]); }
          else { ctx.strokeStyle = rgba(COL.ice, 0.85); ctx.lineWidth = 14 + Math.sin(e.t * 50) * 2; ctx.setLineDash([]); }
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
          if (e.beamState === 2) { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); }
        }
        ctx.setLineDash([]); ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = PAL_CSS[e.col];
      ctx.beginPath();
      for (let k = 0; k < 16; k++) { const a = k * TAU / 16 + e.t * 0.6; const rr = k % 2 ? 12 : 25; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
      // field lines
      ctx.strokeStyle = rgba(COL.ice, 0.22); ctx.lineWidth = 1.2;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 40, y, 40, 22, 0, 0, TAU); ctx.stroke(); }
    },
  },
};
const ENEMY_KINDS = Object.keys(ET);

// spatial hash for enemies
const EGrid = {
  cell: 100, cols: Math.ceil(W / 100), rows: Math.ceil(H / 100), cells: null,
  build(list) {
    if (!this.cells) { this.cells = []; for (let i = 0; i < this.cols * this.rows; i++) this.cells.push([]); }
    for (const c of this.cells) c.length = 0;
    for (const e of list) {
      if (e.dead || e.spawning || e.ghost) continue;
      const pts = e.sp ? e.sp.map(p => [e.x + p.dx, e.y + p.dy]) : [[e.x, e.y]];
      for (const [px, py] of pts) {
        const r = (e.gridR || e.r) + 4;
        const i0 = Math.floor((px - r) / this.cell), i1 = Math.floor((px + r) / this.cell);
        const j0 = Math.floor((py - r) / this.cell), j1 = Math.floor((py + r) / this.cell);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          let ii = i, jj = j;
          if (World.wrap) { ii = ((i % this.cols) + this.cols) % this.cols; jj = ((j % this.rows) + this.rows) % this.rows; }
          else if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) continue;
          const cell = this.cells[jj * this.cols + ii];
          if (cell[cell.length - 1] !== e) cell.push(e);
        }
      }
    }
  },
  at(x, y) {
    let i = Math.floor(x / this.cell), j = Math.floor(y / this.cell);
    if (World.wrap) { i = ((i % this.cols) + this.cols) % this.cols; j = ((j % this.rows) + this.rows) % this.rows; }
    else if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return null;
    return this.cells[j * this.cols + i];
  },
};

// quark triads
function spawnTriad(x, y) {
  const T = { x, y, vx: 0, vy: 0, a: Math.random() * TAU, members: [null, null, null], regen: [0, 0, 0], done: false };
  for (let s = 0; s < 3; s++) {
    const a = T.a + s * TAU / 3;
    T.members[s] = Game.addEnemy('quark', x + Math.cos(a) * 34, y + Math.sin(a) * 34, { triad: T, slot: s });
  }
  Game.triads.push(T);
  return T;
}
function updateTriad(T, dt) {
  const [tx, ty] = [Game.tx, Game.ty];
  const live = T.members.filter(Boolean).length;
  const sp = (95 + (3 - live) * 25) * Game.enemySpeedMul;
  const dx = wdx(tx - T.x), dy = wdy(ty - T.y), d = Math.sqrt(dx * dx + dy * dy) || 1;
  const k = Math.min(1, 1.5 * dt);
  T.vx += (dx / d * sp - T.vx) * k; T.vy += (dy / d * sp - T.vy) * k;
  const m = Anom.triadSpeedMul(T);
  T.x += T.vx * dt * m; T.y += T.vy * dt * m;
  if (World.wrap) { T.x = wrapX(T.x); T.y = wrapY(T.y); } else { T.x = clamp(T.x, 50, W - 50); T.y = clamp(T.y, 50, H - 50); }
  T.a += dt * (1.3 + (3 - live) * 0.8);
  if (T.done) return;
  for (let s = 0; s < 3; s++) {
    if (T.members[s] || T.regen[s] <= 0) continue;
    T.regen[s] -= dt;
    if (T.regen[s] <= 0) {
      const a = T.a + s * TAU / 3;
      T.members[s] = Game.addEnemy('quark', T.x + Math.cos(a) * 34, T.y + Math.sin(a) * 34, { triad: T, slot: s });
      FX.text(T.x, T.y - 26, 'confinement', PI_.white, { size: 11, font: 'serif', life: 0.8 });
      FX.burst(T.x + Math.cos(a) * 34, T.y + Math.sin(a) * 34, 10, 120, T.members[s].col, { life: 0.4 });
    }
  }
}
function drawTriad(T, ctx) {
  const ms = T.members.filter(Boolean); if (ms.length < 2) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2; ctx.strokeStyle = rgba(COL.yellow, 0.55);
  for (let i = 0; i < ms.length; i++) {
    const a = ms[i], b = ms[(i + 1) % ms.length]; if (ms.length === 2 && i === 1) break;
    const x0 = ix(a.x), y0 = iy(a.y), dx = wdx(b.x - a.x), dy = wdy(b.y - a.y), d = Math.hypot(dx, dy) || 1;
    ctx.beginPath();
    for (let k = 0; k <= 14; k++) { const f = k / 14; const w = Math.sin(f * PI * 5 + Game.t * 14) * 3.5; ctx.lineTo(x0 + dx * f - dy / d * w, y0 + dy * f + dx / d * w); }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}
