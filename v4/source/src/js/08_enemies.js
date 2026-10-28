// ---------- classical matter: one engine; most enemies are just numbers ----------
// move:  {chase: speed, acc, wob: [amp, freq], zig: [amp, freq]}  or  {keep: [far, near], speed, strafe, acc}
// fire:  {every: [a, b], first: [a, b], pat: 'aim' | 'ring', n, spread, speed, b: bullet options, text}
// tick:  anything else, every step.   info: [name, field-guide text]
const PHYS_HELLO = ['Hold still.', 'For science!', 'I need this for my thesis.', 'Smile, kitty.', 'Peer review incoming.', 'Collapse, darn you.', 'My grant depends on this.', 'Reviewer 2 sent me.', 'Is it alive? Let me look.', 'Copenhagen says hi.'];
const PHYS_CLICK = ['*click*', 'Observed!', 'Got it.', 'Data!', 'Measured.', 'Gotcha.'];
const PHYS_BYE = ['My funding!', 'Tenure denied.', 'Inconclusive…', 'p > 0.05', 'Retracted!', 'Not reproducible.', 'Ow, my h-index.'];
const NU_COL = () => [PI_.green, PI_.orange, PI_.violet];
const NU_NAME = ['νₑ', 'ν_μ', 'ν_τ'];

const espd = e => Game.enemySpeedMul * Anom.mul('espd', e);
const toCat = e => { const dx = wdx(Game.tx - e.x), dy = wdy(Game.ty - e.y), d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d, d]; };
function steer(e, tx, ty, speed, accel, dt) {
  const dx = wdx(tx - e.x), dy = wdy(ty - e.y), d = Math.hypot(dx, dy) || 1, k = Math.min(1, accel * dt);
  e.vx += (dx / d * speed - e.vx) * k; e.vy += (dy / d * speed - e.vy) * k;
}
function moveEnemy(e, dt, bounce = true) {
  e.x += e.vx * dt; e.y += e.vy * dt;
  contain(e, e.r, bounce);
  const Wl = Game.wall;
  if (Wl && !World.wrap && Math.abs(e.x - Wl.x) < Wl.hw + e.r && !(Wl.open && e.y > Wl.d0 && e.y < Wl.d1)) { const sd = e.x < Wl.x ? -1 : 1; e.x = Wl.x + sd * (Wl.hw + e.r); e.vx = Math.abs(e.vx) * sd; }
}
const MOVES = {
  chase(e, m, dt) {
    steer(e, Game.tx, Game.ty, (e.spd || m.chase) * espd(e), m.acc, dt);
    const side = m.wob ? Math.sin(e.t * m.wob[1] + e.ph) * m.wob[0] : m.zig ? (Math.sin(e.t * m.zig[1] + e.ph) > 0 ? 1 : -1) * m.zig[0] : 0;
    if (side) { const [ux, uy] = toCat(e); e.x -= uy * side * dt; e.y += ux * side * dt; }
    moveEnemy(e, dt);
  },
  keep(e, m, dt) { // hold a distance band and circle
    const [ux, uy, d] = toCat(e), want = d > m.keep[0] ? 1 : d < m.keep[1] ? -1 : 0, sp = m.speed * espd(e), st = m.strafe * (e.orb || 1);
    e.vx += ((ux * want - uy * st) * sp - e.vx) * Math.min(1, m.acc * dt); e.vy += ((uy * want + ux * st) * sp - e.vy) * Math.min(1, m.acc * dt);
    moveEnemy(e, dt);
  },
};
function enemyFire(e, f, dt) {
  if (e.fire === undefined) e.fire = rand(...f.first);
  if ((e.fire -= dt) > 0 || !Game.inView(e.x, e.y, f.view ?? 40)) return;
  e.fire = rand(...f.every) / Game.fireRateMul;
  const [fx, fy] = Anom.firePos(e), b = { ...f.b, col: f.col ? f.col() : PI_[f.b.col] };
  if (f.pat === 'ring') Bullets.ring(fx, fy, f.n, f.speed, b, Math.random() * TAU);
  else Bullets.aimAt(fx, fy, Game.tx, Game.ty, f.speed, b, f.n || 1, f.spread || 0);
  if (f.text) FX.text(e.x, e.y - 30, f.text, b.col, { size: 13, font: 'serif', life: 0.7 });
  Audio2.sfx('eshot');
}
function enemyStep(e, dt) {
  const d = e.def;
  if (d.move) MOVES[d.move.keep ? 'keep' : 'chase'](e, d.move, dt);
  if (d.fire) enemyFire(e, d.fire, dt);
  if (d.tick) d.tick(e, dt);
}
// a timed self-destruct (muons, neutrons, the Higgs): counts e.life down, then runs fn and dies quietly
function decays(e, dt, fn) { if ((e.life -= dt) <= 0) { fn(e); Game.killEnemy(e, 'decay', true); } }
const ring = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };
const dot = (ctx, x, y, r, c) => { ctx.fillStyle = c; ring(ctx, x, y, r); ctx.fill(); };

// ---------- people: every kind of scientist dresses differently, and no two physicists look quite alike ----------
const SKINS_TONE = ['#f4d7c2', '#e8b896', '#c98e62', '#a8693f', '#7a4a2a', '#f2c9a8'];
const HAIR_COL = ['#ece7ff', '#b9b4cc', '#2a2238', '#5a3a22', '#c0562c', '#e8c46a', '#8a8496'];
const SCI_LOOK = {
  physicist: { coat: '#e9e6f7', trim: '#8f88b8', legs: '#3a3166', glasses: 'goggles' },              // white lab coat, safety goggles
  professor: { coat: '#8a5a3a', trim: '#5e3a22', legs: '#2a2030', glasses: 'round', hair: 'bald', beard: true, tie: '#ff3b55' }, // tweed, beard, bow tie
  postdoc: { coat: '#4b3a8a', trim: '#2c2160', legs: '#2a2a3a', glasses: 'square', hair: 'messy', hood: true, bags: true },   // hoodie, no sleep
  assistant: { coat: '#3fae7a', trim: '#24704c', legs: '#24704c', glasses: null, hair: 'ponytail', cap: '#3fae7a' },           // green scrubs and cap
  friend: { coat: '#3a6ccf', trim: '#203f86', legs: '#1e2a55', glasses: 'round', hair: 'beanie', beanie: '#ffcf4a' },          // blue overalls, yellow beanie
};
function sciTraits(e) { // fixed per person: skin, hair colour, hair style
  if (!e.sci) { let h = 2166136261; for (const ch of String(e.id || 0)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; e.sci = { skin: SKINS_TONE[h % SKINS_TONE.length], hair: HAIR_COL[(h >>> 4) % HAIR_COL.length], style: ['curly', 'spiky', 'bun', 'bald', 'long'][(h >>> 9) % 5] }; }
  return e.sci;
}
function drawScientist(ctx, e, item) {
  const L = SCI_LOOK[e.type] || SCI_LOOK.physicist, T = sciTraits(e), style = L.hair || T.style;
  // body: coat or hoodie, with a seam
  ctx.fillStyle = L.coat; ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(8, -2); ctx.lineTo(11, 15); ctx.lineTo(-11, 15); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = L.trim; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 15); ctx.stroke();
  if (e.type === 'physicist' || !L.hood) { ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(0, 4); ctx.lineTo(3, -2); ctx.stroke(); } // lapels
  if (L.tie) { ctx.fillStyle = L.tie; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3.5, -2.5); ctx.lineTo(-3.5, 2.5); ctx.closePath(); ctx.moveTo(0, 0); ctx.lineTo(3.5, -2.5); ctx.lineTo(3.5, 2.5); ctx.closePath(); ctx.fill(); }
  const sw = Math.sin(e.t * 9) * 3; ctx.strokeStyle = L.legs; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-4, 15); ctx.lineTo(-4 + sw, 21); ctx.moveTo(4, 15); ctx.lineTo(4 - sw, 21); ctx.stroke();
  if (L.hood) { ctx.fillStyle = L.coat; ctx.beginPath(); ctx.arc(0, -10, 10, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); }
  dot(ctx, 0, -10, 7.5, T.skin);
  // hair, by style (or the role's own headwear)
  ctx.fillStyle = T.hair;
  if (style === 'curly') { ctx.beginPath(); ctx.arc(-3, -17, 4, 0, TAU); ctx.arc(2, -18, 4.5, 0, TAU); ctx.arc(6, -15, 3.5, 0, TAU); ctx.arc(-6.5, -14, 3, 0, TAU); ctx.fill(); }
  else if (style === 'spiky') { ctx.beginPath(); ctx.moveTo(-7, -13); for (let k = 0; k < 5; k++) { ctx.lineTo(-6 + k * 3.2, -21 - (k % 2) * 3); ctx.lineTo(-4.4 + k * 3.2, -15); } ctx.lineTo(7, -13); ctx.closePath(); ctx.fill(); }
  else if (style === 'bun') { ctx.beginPath(); ctx.arc(0, -15, 7, Math.PI, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-1, -21, 3.6, 0, TAU); ctx.fill(); }
  else if (style === 'long') { ctx.beginPath(); ctx.arc(0, -13, 8, Math.PI, TAU); ctx.fill(); ctx.fillRect(-8, -13, 3.5, 11); }
  else if (style === 'bald') { ctx.beginPath(); ctx.arc(-6.5, -11, 2.6, 0, TAU); ctx.arc(-5.5, -7, 2.2, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-1, -15, 2, 0, TAU); ctx.fill(); }
  else if (style === 'messy') { ctx.fillStyle = T.hair === '#ece7ff' ? '#2a2238' : T.hair; ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-9, -19); ctx.lineTo(-4, -16); ctx.lineTo(-2, -22); ctx.lineTo(1, -16); ctx.lineTo(5, -21); ctx.lineTo(6, -15); ctx.lineTo(9, -16); ctx.lineTo(7, -11); ctx.closePath(); ctx.fill(); }
  else if (style === 'ponytail') { ctx.fillStyle = T.hair; ctx.beginPath(); ctx.arc(-8, -11, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = L.cap; ctx.beginPath(); ctx.arc(0, -13, 8, Math.PI, TAU); ctx.fill(); ctx.fillRect(-8, -14, 16, 2.5); }
  else if (style === 'beanie') { ctx.fillStyle = L.beanie; ctx.beginPath(); ctx.arc(0, -13, 8.2, Math.PI, TAU); ctx.fill(); ctx.fillRect(-8.5, -14, 17, 3); dot(ctx, 0, -22, 2.4, '#fff'); }
  if (L.beard) { ctx.fillStyle = '#cfc8e0'; ctx.beginPath(); ctx.arc(1.5, -5.5, 6, 0.1, Math.PI - 0.1); ctx.fill(); }
  // eyes / glasses
  ctx.strokeStyle = '#1e1838'; ctx.lineWidth = 1.6;
  if (L.glasses === 'goggles') { ctx.fillStyle = 'rgba(76,242,255,.75)'; ctx.beginPath(); ctx.arc(1.5, -10, 2.8, 0, TAU); ctx.arc(7, -10, 2.8, 0, TAU); ctx.fill(); ctx.stroke(); }
  else if (L.glasses === 'round') { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(1.5, -10, 2.6, 0, TAU); ctx.moveTo(9.2, -10); ctx.arc(6.8, -10, 2.4, 0, TAU); ctx.fill(); ctx.stroke(); }
  else if (L.glasses === 'square') { ctx.strokeRect(-1.2, -12.2, 4.6, 4); ctx.strokeRect(4.6, -12.2, 4.6, 4); }
  else { ctx.fillStyle = '#1e1838'; ctx.fillRect(1, -11, 2, 2.2); ctx.fillRect(6, -11, 2, 2.2); }
  if (L.bags) { ctx.strokeStyle = 'rgba(120,90,160,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(1.2, -6.8, 2, 0.2, Math.PI - 0.2); ctx.arc(6.8, -6.8, 2, 0.2, Math.PI - 0.2); ctx.stroke(); }
  // what they carry
  if (item === 'camera') { ctx.fillStyle = '#2b2448'; ctx.fillRect(8, -6, 10, 7); dot(ctx, 14, -2.5, 2.2, '#fff'); }
  else if (item === 'clipboard') { ctx.fillStyle = '#c9a36b'; ctx.fillRect(6, 2, 7, 9); ctx.fillStyle = '#fff'; ctx.fillRect(7, 4, 5, 6); }
}
const ET = {
  electron: {
    r: 10, hp: 1, score: 50, col: 'amber', mass: 0.6, info: ['Electron', 'Swarms toward you on a wobbling path. Weak, but there are a lot of them.'],
    init(e) { e.spd = rand(150, 185); }, move: { chase: 160, acc: 2.4, wob: [90, 5] },
    draw(e, ctx, x, y) {
      const c = PAL_CSS[e.col];
      ctx.save(); ctx.translate(x, y); ctx.rotate(e.t * 2 + e.ph);
      ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.globalAlpha *= 0.75; ctx.beginPath(); ctx.ellipse(0, 0, 13, 5.5, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha /= 0.75;
      dot(ctx, Math.cos(e.t * 9) * 13, Math.sin(e.t * 9) * 5.5, 2.2, '#fff');
      ctx.restore(); dot(ctx, x, y, 5.5, c);
    },
  },
  proton: {
    r: 17, hp: 5, score: 150, col: 'coral', mass: 2, info: ['Proton', 'Slow and sturdy. Fires single aimed shots.'],
    move: { chase: 85, acc: 1.5 }, fire: { first: [1.2, 2.2], every: [2.1, 2.8], speed: 235, b: { col: 'coral', r: 7 } },
    draw(e, ctx, x, y) {
      ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 2.6; ring(ctx, x, y, 15); ctx.stroke();
      ctx.globalAlpha *= 0.18; ctx.fillStyle = PAL_CSS[e.col]; ctx.fill(); ctx.globalAlpha /= 0.18;
      for (let k = 0; k < 3; k++) { const a = e.t * 2.2 + k * TAU / 3; dot(ctx, x + Math.cos(a) * 7, y + Math.sin(a) * 7, 3.6, PAL_CSS[k === 2 ? PI_.violet : PI_.orange]); }
    },
  },
  muon: {
    r: 12, hp: 3, score: 120, col: 'orange', mass: 0.9, info: ['Muon', 'A fast chaser that decays after a few seconds into a ring of eight bullets. The arc around it is its countdown.'],
    init(e) { e.life = e.life0 = rand(5.5, 7.5); }, move: { chase: 255, acc: 1.6 },
    tick(e, dt) { decays(e, dt, () => { Notes.obs('enemy:muon', 'decay'); Bullets.ring(e.x, e.y, 8, 190, { col: PI_.orange, r: 6.5 }, Math.random() * TAU); FX.text(e.x, e.y - 18, 'μ⁻ → e⁻ ν̄ ν', PI_.orange, { size: 12, font: 'serif', life: 0.9 }); }); },
    draw(e, ctx, x, y) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(e.vy, e.vx));
      ctx.fillStyle = PAL_CSS[e.col]; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(0, 7); ctx.lineTo(-10, 0); ctx.lineTo(0, -7); ctx.closePath(); ctx.fill();
      ctx.restore();
      const f = clamp(e.life / e.life0, 0, 1);
      ctx.strokeStyle = f < 0.3 && Math.sin(e.t * 30) > 0 ? '#fff' : PAL_CSS[PI_.yellow]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 17, -PI / 2, -PI / 2 + f * TAU); ctx.stroke();
    },
  },
  tachyon: {
    r: 12, hp: 3, score: 160, col: 'pink', mass: 0.8, info: ['Tachyon', 'Draws a dashed line to where it is going, then dashes along it. Step off the line.'],
    init(e) { e.state = 'rest'; e.st = rand(0.4, 1.2); e.dx = e.dy = 0; },
    update(e, dt) {
      e.st -= dt;
      if (e.state === 'rest') {
        e.vx *= Math.exp(-3 * dt); e.vy *= Math.exp(-3 * dt); moveEnemy(e, dt);
        if (e.st > 0) return;
        const [ux, uy, d] = toCat(e), go = Math.min(d + 260, 900);
        e.dx = e.x + ux * go; e.dy = e.y + uy * go;
        if (!World.wrap) { e.dx = clamp(e.dx, 20, W - 20); e.dy = clamp(e.dy, 20, H - 20); }
        e.state = 'aim'; e.st = 0.95 * Game.tele() / Game.fireRateMul; Audio2.sfx('tachyonAim');
      } else if (e.state === 'aim') {
        e.vx *= 0.9; e.vy *= 0.9;
        if (e.st <= 0) { e.state = 'dash'; e.st = 0.75; Audio2.sfx('tachyonDash'); if (Game.inView(e.x, e.y, 0)) Notes.obs('enemy:tachyon', 'dash'); }
      } else {
        const dx = wdx(e.dx - e.x), dy = wdy(e.dy - e.y), d = Math.hypot(dx, dy), sp = 1350 * Anom.mul('espd', e);
        if (d < sp * dt || e.st <= 0) { e.state = 'rest'; e.st = rand(0.7, 1.3); e.vx = dx / (d || 1) * 120; e.vy = dy / (d || 1) * 120; }
        else { e.vx = dx / d * sp; e.vy = dy / d * sp; moveEnemy(e, dt, false); if (Math.random() < 0.8) FX.spawn(e.x, e.y, 0, 0, 0.35, 6, e.col); }
      }
    },
    draw(e, ctx, x, y) {
      const tx = x + wdx(e.dx - e.x), ty = y + wdy(e.dy - e.y);
      if (e.state === 'aim') {
        Tele.line(ctx, x, y, tx, ty, COL.pink, 0.55);
        ctx.globalAlpha *= 0.35 + 0.25 * Math.sin(e.t * 25); ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 2; ring(ctx, tx, ty, 13); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(e.state === 'rest' ? Math.atan2(e.vy, e.vx) : Math.atan2(ty - y, tx - x));
      ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(8, 0); ctx.lineTo(-10, 10); ctx.moveTo(-2, -10); ctx.lineTo(14, 0); ctx.lineTo(-2, 10); ctx.stroke();
      ctx.restore();
    },
  },
  quark: {
    r: 10, hp: 3, score: 100, col: 'red', mass: 0.7, info: ['Quark triad', 'Three quarks on gluon strings. Kill all three within about three seconds, or the dead ones grow back.', '3 hits each'],
    init(e, o) { e.triad = o.triad; e.slot = o.slot; e.col = [PI_.red, PI_.green, PI_.blue][o.slot]; },
    update(e, dt) {
      const T = e.triad; if (!T) { moveEnemy(e, dt); return; }
      const a = T.a + e.slot * TAU / 3, rr = 34 + 6 * Math.sin(Game.t * 3 + e.slot), nx = T.x + Math.cos(a) * rr, ny = T.y + Math.sin(a) * rr;
      e.vx = wdx(nx - e.x) / Math.max(dt, 1e-4); e.vy = wdy(ny - e.y) / Math.max(dt, 1e-4);
      e.x = World.wrap ? wrapX(nx) : nx; e.y = World.wrap ? wrapY(ny) : ny;
    },
    draw(e, ctx, x, y) { dot(ctx, x, y, 8.5, PAL_CSS[e.col]); dot(ctx, x - 2.5, y - 2.5, 2.6, 'rgba(255,255,255,.85)'); },
    onDeath(e) {
      const T = e.triad; if (!T) return;
      T.members[e.slot] = null; T.regen[e.slot] = 2.8;
      if (T.members.every(m => !m)) { if (T.regen.every(r => r > 0)) Game.addScore(300, T.x, T.y - 20, 'colour neutral'); T.done = true; }
    },
  },
  physicist: {
    r: 14, hp: 4, score: 200, col: 'chalk', mass: 1, info: ['Physicist', 'Walks up and takes a measurement: your cats inside its dashed ring either all survive or all collapse. When you are a single cat it throws photons instead.'],
    init(e) { e.state = 'walk'; e.st = 0; e.face = 1; e.R = 215; e.shoot = rand(1.5, 3); Game.say(e, pick(PHYS_HELLO), 2.2); if (Game.mode === 'arcade') Game.toastOnce('hint-phys', 'Physicists measure anything near them. Keep your cats away, or lose the superposition.'); },
    update(e, dt) {
      const [ux, , d] = toCat(e);
      e.face = ux >= 0 ? 1 : -1; e.st -= dt;
      if (e.state === 'walk') {
        steer(e, Game.tx, Game.ty, 96 * espd(e), 2, dt); moveEnemy(e, dt);
        if (d < 200 && Player.n > 1 && e.st <= 0) { e.state = 'charge'; e.st = e.st0 = 0.85 * Game.tele(); Audio2.sfx('charge'); }
        if (Player.n === 1 && (e.shoot -= dt) <= 0 && Game.inView(e.x, e.y, 0)) { e.shoot = rand(2.4, 3.2) / Game.fireRateMul; Bullets.aimAt(e.x, e.y - 6, Game.tx, Game.ty, 210, { col: PI_.ice, r: 6.5, kind: 1 }); Audio2.sfx('eshot'); Notes.obs('enemy:physicist', 'photons'); }
      } else {
        e.vx *= 0.85; e.vy *= 0.85; moveEnemy(e, dt);
        if (e.st > 0) return;
        if (Player.measureRegion(b => Math.hypot(wdx(b.px - e.x), wdy(b.py - e.y)) < e.R, e, 'NEAR PHYSICIST')) { Game.say(e, pick(PHYS_CLICK), 1.2); Notes.obs('enemy:physicist', 'measure'); }
        FX.ring(e.x, e.y, 10, e.R, 0.45, PI_.white, 3); FX.burst(e.x, e.y - 8, 14, 260, PI_.white, { life: 0.3, size: 5 });
        e.state = 'walk'; e.st = 3.6;
      }
    },
    draw(e, ctx, x, y) {
      ctx.save(); ctx.translate(x, y + Math.sin(e.t * 9) * 1.2); ctx.scale(e.face, 1);
      drawScientist(ctx, e, e.type === 'physicist' ? (e.state === 'charge' ? 'camera' : 'clipboard') : null);
      ctx.restore();
      if (e.state === 'charge') Tele.ring(ctx, x, y, e.R * (0.6 + 0.4 * (1 - e.st / e.st0)), COL.white, 0.25 + 0.5 * (1 - e.st / e.st0));
    },
    onDeath(e) { Game.say(e, pick(PHYS_BYE), 1.6, true); },
  },
  positron: {
    r: 11, hp: 2, score: 100, col: 'pink', mass: 0.7, info: ['Positron', 'Antimatter. When it dies it annihilates and damages every enemy nearby, so chain reactions are common.'],
    move: { chase: 140, acc: 2, zig: [140, 3.2] },
    draw(e, ctx, x, y) {
      ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 2.4; ring(ctx, x, y, 10 * (1 + 0.12 * Math.sin(e.t * 12))); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke();
    },
    onDeath(e) { Game.annihilate(e.x, e.y, 120, 5); Notes.obs('enemy:positron', 'annihilate'); },
  },
  turret: {
    r: 22, hp: 28, score: 500, col: 'violet', mass: 6, info: ['Spin-½ turret', 'Parks somewhere and sprays spiral streams of bullets. Its spin flips every few seconds.'],
    init(e) { e.anchor = null; e.ang = Math.random() * TAU; e.spin = chance(0.5) ? 1 : -1; e.flip = 4.5; e.fire = 0; e.reloc = 14; e.arms = Game.wave >= 9 ? 3 : 2; },
    update(e, dt) {
      if (!e.anchor) e.anchor = Game.farPoint(320);
      const d = Math.hypot(wdx(e.anchor.x - e.x), wdy(e.anchor.y - e.y));
      if (d > 8) { steer(e, e.anchor.x, e.anchor.y, 125, 2, dt); moveEnemy(e, dt); } else { e.vx *= 0.9; e.vy *= 0.9; }
      if ((e.reloc -= dt) <= 0) { e.anchor = null; e.reloc = 14; }
      if ((e.flip -= dt) <= 0) { e.flip = 4.5; e.spin = -e.spin; if (Game.inView(e.x, e.y, 0)) Notes.obs('enemy:turret', 'flip'); FX.text(e.x, e.y - 30, e.spin > 0 ? 'spin ↑' : 'spin ↓', PI_.violet, { size: 12, font: 'serif' }); }
      e.ang += e.spin * 1.7 * dt;
      if ((e.fire -= dt) <= 0 && d < 40) {
        e.fire = 0.13 / Game.fireRateMul;
        const [fx, fy] = Anom.firePos(e);
        for (let k = 0; k < e.arms; k++) { const a = e.ang + k * TAU / e.arms; Bullets.fire(fx + Math.cos(a) * 20, fy + Math.sin(a) * 20, Math.cos(a) * 165, Math.sin(a) * 165, { col: k % 2 ? PI_.ice : PI_.violet, r: 6.5, life: 8 }); }
      }
    },
    draw(e, ctx, x, y) {
      ctx.strokeStyle = PAL_CSS[e.col]; ctx.lineWidth = 3; ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + PI / 6; ctx.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); }
      ctx.closePath(); ctx.stroke(); ctx.globalAlpha *= 0.16; ctx.fillStyle = PAL_CSS[e.col]; ctx.fill(); ctx.globalAlpha /= 0.16;
      for (let k = 0; k < e.arms; k++) { const a = e.ang + k * TAU / e.arms; dot(ctx, x + Math.cos(a) * 21, y + Math.sin(a) * 21, 3.5, '#fff'); }
      const s = e.spin; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y + 8 * s); ctx.lineTo(x, y - 8 * s); ctx.moveTo(x - 5, y - 3 * s); ctx.lineTo(x, y - 8 * s); ctx.lineTo(x + 5, y - 3 * s); ctx.stroke();
    },
  },
  magnetar: {
    r: 25, hp: 46, score: 800, col: 'ice', mass: 10, info: ['Magnetar', 'Sweeps two pulsar beams: a dashed warning line first, then a solid beam. Its magnetic field bends your bullets around it.'],
    init(e) { e.beamA = Math.random() * TAU; e.cycle = 0; }, move: { chase: 48, acc: 0.8 },
    tick(e, dt) {
      e.beamA += 0.55 * dt * Game.fireRateMul;
      const warn = 0.9 * Game.tele(); e.cycle = (e.cycle + dt) % (warn + 3.3);
      e.beamState = e.cycle < warn ? 1 : e.cycle < warn + 1.7 ? 2 : 0;
      if (e.beamState === 2) { for (const s of [0, PI]) Game.beamHit(e.x, e.y, e.beamA + s, 1400, 9, e); if (Game.inView(e.x, e.y, 200)) Notes.obs('enemy:magnetar', 'beam'); }
    },
    field: { rot(s, x, y, k) { if (k !== K_PB) return 0; const d = Math.hypot(wdx(x - s.x), wdy(y - s.y)); return d < 170 ? 9 * (1 - d / 170) : 0; } }, // Lorentz force on your photons
    draw(e, ctx, x, y) {
      if (e.beamState) for (const s of [0, PI]) Tele.beam(ctx, x, y, e.beamA + s, 1400, 7, COL.ice, e.beamState, e.t);
      ctx.fillStyle = PAL_CSS[e.col]; ctx.beginPath();
      for (let k = 0; k < 16; k++) { const a = k * TAU / 16 + e.t * 0.6, rr = k % 2 ? 12 : 25; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); dot(ctx, x, y, 7, '#fff');
      ctx.strokeStyle = rgba(COL.ice, 0.22); ctx.lineWidth = 1.2; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * 40, y, 40, 22, 0, 0, TAU); ctx.stroke(); }
    },
  },
  // flies straight through the arena, oscillating between flavours; only the electron flavour is solid
  neutrino: {
    r: 9, hp: 2, score: 180, col: 'green', mass: 0.3, hideArrow: true, info: ['Neutrino', 'Streaks straight across the arena, cycling through three flavours. Only the solid green (electron) flavour can hit you or be hit. The dotted flavours pass through everything.'],
    init(e, o) { e.ph = Math.random() * 3; e.trail = []; e.trT = 0; const a = o && o.a !== undefined ? o.a : Math.atan2(Game.ty - e.y, Game.tx - e.x) + rand(-0.12, 0.12); e.vx = Math.cos(a) * 420; e.vy = Math.sin(a) * 420; },
    update(e, dt) {
      e.flavor = Math.floor((e.t * 0.85 + e.ph) % 3); e.ghost = e.flavor !== 0; e.col = NU_COL()[e.flavor];
      const k = espd(e); e.x += e.vx * dt * k; e.y += e.vy * dt * k;
      if ((e.trT -= dt) <= 0) { e.trT = 0.03; e.trail.push(e.x, e.y); if (e.trail.length > 20) e.trail.splice(0, 2); }
      if (World.wrap) { e.x = wrapX(e.x); e.y = wrapY(e.y); }
      if (World.wrap ? e.t > 7 : e.x < -80 || e.x > W + 80 || e.y < -80 || e.y > H + 80) { e.noBox = true; Game.killEnemy(e, 'escape', true); }
    },
    draw(e, ctx, x, y) {
      const real = !e.ghost, c = PAL_CSS[e.col];
      if (e.trail.length > 2 && !World.wrap) {
        ctx.strokeStyle = c; ctx.lineWidth = real ? 2.4 : 1.4; ctx.globalAlpha *= 0.5;
        ctx.beginPath(); ctx.moveTo(e.trail[0] + x - e.x, e.trail[1] + y - e.y); for (let k = 2; k < e.trail.length; k += 2) ctx.lineTo(e.trail[k] + x - e.x, e.trail[k + 1] + y - e.y);
        ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha /= 0.5;
      }
      if (real) { dot(ctx, x, y, 7, c); dot(ctx, x, y, 3, '#fff'); }
      else { ctx.globalAlpha *= 0.55; ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]); ring(ctx, x, y, 8); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha /= 0.55; }
      ctx.font = fontSerif(12); ctx.textAlign = 'center'; ctx.fillStyle = c; ctx.fillText(NU_NAME[e.flavor || 0], x, y - 14);
    },
  },
  // slow and sturdy; falls apart into a proton and an electron when shot or when it decays
  neutron: {
    r: 16, hp: 8, score: 240, col: 'chalk', mass: 2.2, info: ['Neutron', 'Slow and tough. When it dies, or decays after about fifteen seconds, it splits into a proton and an electron.'],
    init(e) { e.life = rand(14, 18); }, move: { chase: 72, acc: 1.2 },
    tick(e, dt) { decays(e, dt, ET.neutron.onDeath); },
    onDeath(e) {
      if (e.decayed) return; e.decayed = true;
      FX.text(e.x, e.y - 24, 'n → p e⁻ ν̄', PI_.chalk, { size: 13, font: 'serif', life: 1 }); Notes.obs('enemy:neutron', 'decay');
      const a = Math.random() * TAU, c = Math.cos(a), s = Math.sin(a);
      const p = Game.addEnemy('proton', e.x + c * 16, e.y + s * 16), el = Game.addEnemy('electron', e.x - c * 16, e.y - s * 16);
      if (p) { p.vx = c * 170; p.vy = s * 170; p.hp = Math.ceil(p.hp * 0.6); }
      if (el) { el.vx = -c * 260; el.vy = -s * 260; }
      FX.burst(e.x, e.y, 16, 200, [PI_.chalk, PI_.coral, PI_.amber], { life: 0.45 });
    },
    draw(e, ctx, x, y) {
      ctx.drawImage(cached('neutron', 40, 40, (c, w) => { radial(c, w / 2, [[0, 'rgba(236,231,255,.55)'], [1, 'rgba(120,114,160,.18)']]); }), x - 15, y - 15, 30, 30);
      ctx.strokeStyle = '#cfcbe6'; ctx.lineWidth = 2.2; ring(ctx, x, y, 15); ctx.stroke();
      for (let k = 0; k < 3; k++) { const a = -e.t * 1.6 + k * TAU / 3; dot(ctx, x + Math.cos(a) * 6.5, y + Math.sin(a) * 6.5, 3.2, PAL_CSS[[PI_.blue, PI_.green, PI_.red][k]]); }
      if (e.life < 5) { ctx.strokeStyle = Math.sin(e.t * 26) > 0 ? '#fff' : PAL_CSS[PI_.dim]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 21, -PI / 2, -PI / 2 + TAU * clamp(e.life / 5, 0, 1)); ctx.stroke(); }
    },
  },
  // a helium nucleus that tunnels: a ghost marks where it will reappear, then it fires a burst
  alpha: {
    r: 17, hp: 10, score: 320, col: 'gold', mass: 3, info: ['Alpha particle', 'Tunnels. A dashed ghost shows where it will reappear, then it pops out there and fires a ring of bullets.'],
    init(e) { e.state = 'idle'; e.st = rand(1.2, 2); e.dx2 = e.x; e.dy2 = e.y; e.spin = Math.random() * TAU; },
    update(e, dt) {
      e.st -= dt; e.spin += dt * 1.4;
      if (e.state === 'idle') {
        steer(e, Game.tx, Game.ty, 58 * espd(e), 1, dt); moveEnemy(e, dt);
        if (e.st > 0) return;
        const a = Math.random() * TAU, d = rand(230, 330), b = Game.box;
        let nx = Game.tx + Math.cos(a) * d, ny = Game.ty + Math.sin(a) * d;
        if (World.wrap) { nx = wrapX(nx); ny = wrapY(ny); } else { nx = clamp(nx, (b ? b.x0 : 0) + 60, (b ? b.x1 : W) - 60); ny = clamp(ny, 60, H - 60); }
        e.dx2 = nx; e.dy2 = ny; e.state = 'warn'; e.st = e.st0 = 0.8 * Game.tele() / Math.sqrt(Game.fireRateMul);
        Audio2.sfx('tachyonAim');
      } else {
        e.vx *= 0.9; e.vy *= 0.9; moveEnemy(e, dt);
        if (e.st > 0) return;
        FX.burst(e.x, e.y, 14, 160, PI_.gold, { life: 0.35 });
        e.x = e.dx2; e.y = e.dy2; e.vx = e.vy = 0; e.flash = 0.1;
        FX.ring(e.x, e.y, 6, 70, 0.35, PI_.gold, 3); FX.text(e.x, e.y - 28, 'tunnelled', PI_.gold, { size: 11, font: 'serif', life: 0.7 }); Notes.obs('enemy:alpha', 'tunnel');
        const [fx, fy] = Anom.firePos(e);
        Bullets.ring(fx, fy, 8, 150, { col: PI_.gold, r: 6.5 }, Math.random() * TAU);
        Bullets.aimAt(fx, fy, Game.tx, Game.ty, 250, { col: PI_.amber, r: 7, kind: 1 });
        Audio2.sfx('eshot'); e.state = 'idle'; e.st = rand(2.2, 3.2) / Game.fireRateMul;
      }
    },
    draw(e, ctx, x, y) {
      if (e.state === 'warn') {
        const k = 1 - clamp(e.st / e.st0, 0, 1), gx = x + wdx(e.dx2 - e.x), gy = y + wdy(e.dy2 - e.y);
        Tele.line(ctx, x, y, gx, gy, COL.gold, 0.45); Tele.ring(ctx, gx, gy, 18, COL.gold, 0.45);
        ctx.strokeStyle = rgba(COL.gold, 0.9); ctx.lineWidth = 2; ring(ctx, gx, gy, 40 - 22 * k); ctx.stroke();
      }
      ctx.strokeStyle = rgba(COL.gold, 0.5); ctx.lineWidth = 1.5; ring(ctx, x, y, 17); ctx.stroke();
      for (let k = 0; k < 4; k++) { const a = e.spin + k * PI / 2; dot(ctx, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 6, k % 2 ? '#cfcbe6' : PAL_CSS[PI_.coral]); }
      dot(ctx, x - 3, y - 3, 2, 'rgba(255,255,255,.75)');
    },
  },
  // a Bohr-style atom: three orbiting electrons soak up your shots until they are knocked loose
  atom: {
    r: 19, hp: 12, score: 450, col: 'violet', mass: 4, gridR: 54, info: ['Atom', 'Three orbiting electrons catch your shots. Knock each one loose (three hits) and it flies off as a free electron. Fires spectral lines (hν).'],
    init(e) { e.sh = [3, 3, 3]; e.a = Math.random() * TAU; e.spin = Math.random() * TAU; },
    move: { keep: [330, 240], speed: 80, strafe: 0.6, acc: 1.5 },
    fire: { first: [1.8, 2.8], every: [2.3, 3.1], speed: 270, n: 3, spread: 0.22, b: { r: 6.5, kind: 1 }, col: () => pick([PI_.red, PI_.cyan, PI_.violet, PI_.green]), text: 'hν' },
    tick(e, dt) { e.a += dt * 2.3; e.spin += dt * 0.4; },
    orbit(e, k) { const th = e.a * (1 + 0.18 * k) + k * 2.1, ph = e.spin + k * PI / 3, lx = Math.cos(th) * 42, ly = Math.sin(th) * 15; return [lx * Math.cos(ph) - ly * Math.sin(ph), lx * Math.sin(ph) + ly * Math.cos(ph)]; },
    // true when a shot at (x, y) is caught by an orbiting electron
    shield(e, x, y) {
      for (let k = 0; k < 3; k++) {
        if (e.sh[k] <= 0) continue;
        const [ox, oy] = this.orbit(e, k), dx = wdx(x - (e.x + ox)), dy = wdy(y - (e.y + oy));
        if (dx * dx + dy * dy >= 121) continue;
        FX.sparks(e.x + ox, e.y + oy, 3, 160, PI_.amber, Math.atan2(dy, dx), 1.4, 0.25);
        if (--e.sh[k] <= 0) { const el = Game.addEnemy('electron', e.x + ox, e.y + oy); if (el) { el.vx = ox * 5; el.vy = oy * 5; } FX.text(e.x + ox, e.y + oy - 14, 'ionised', PI_.amber, { size: 11, font: 'serif', life: 0.7 }); Notes.obs('enemy:atom', 'ionise'); }
        return true;
      }
      return false;
    },
    draw(e, ctx, x, y) {
      for (let k = 0; k < 3; k++) { ctx.strokeStyle = rgba(COL.violet, e.sh[k] > 0 ? 0.55 : 0.18); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, y, 42, 15, e.spin + k * PI / 3, 0, TAU); ctx.stroke(); }
      for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + e.t * 0.8, r = k === 4 ? 0 : 6; dot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 5, k % 2 ? '#cfcbe6' : PAL_CSS[PI_.coral]); }
      for (let k = 0; k < 3; k++) { if (e.sh[k] <= 0) continue; const [ox, oy] = this.orbit(e, k); dot(ctx, x + ox, y + oy, 4.6, PAL_CSS[PI_.amber]); dot(ctx, x + ox, y + oy, 1.8, '#fff'); }
    },
  },
  // the Higgs boson: everything inside its field gets heavy (slower, and half damage)
  higgs: {
    r: 15, hp: 7, score: 420, col: 'yellow', mass: 5, info: ['Higgs boson', 'Gives mass to everything in its golden field: enemies inside are slower but take half damage, and bullets inside slow down. Decays into two photons after about twenty seconds.'],
    init(e) { e.life = rand(18, 22); e.aura = 230; e.orb = chance(0.5) ? 1 : -1; },
    move: { keep: [420, 330], speed: 60, strafe: 0.5, acc: 1 },
    tick(e, dt) {
      decays(e, dt, () => { Notes.obs('enemy:higgs', 'decay');
        const a = Math.atan2(Game.ty - e.y, Game.tx - e.x) + rand(-0.3, 0.3);
        for (const s of [0, PI]) Bullets.fire(e.x, e.y, Math.cos(a + s) * 520, Math.sin(a + s) * 520, { col: PI_.white, r: 7, kind: 1, neutral: true });
        FX.text(e.x, e.y - 26, 'H → γγ', PI_.yellow, { size: 14, font: 'serif', life: 1 }); FX.ring(e.x, e.y, 10, e.aura, 0.5, PI_.yellow, 3); Audio2.sfx('annihilate');
      });
    },
    field: {
      slow(s, x, y, k, e) {
        if (k !== K_EN && k !== K_EB || (wdx(x - s.x) ** 2 + wdy(y - s.y) ** 2) > s.aura * s.aura) return 1;
        if (k === K_EB) return 0.5;
        if (e.boss || e.type === 'higgs') return 1;
        e.heavy = true; return 0.6;
      },
    },
    draw(e, ctx, x, y) {
      const A = e.aura || 230;
      halo(ctx, PI_.yellow, x, y, A, 0.16);
      ctx.globalCompositeOperation = 'lighter';
      Tele.ring(ctx, x, y, A, COL.yellow, 0.35, [2, 7]);
      for (let k = 0; k < 2; k++) { const f = (e.t * 0.5 + k * 0.5) % 1; ctx.strokeStyle = rgba(COL.yellow, 0.25 * (1 - f)); ring(ctx, x, y, 20 + f * (A - 20)); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
      dot(ctx, x, y, 14, PAL_CSS[PI_.yellow]);
      ctx.fillStyle = '#2a2208'; ctx.font = fontSerif(17, 700, false); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', x, y + 1); ctx.textBaseline = 'alphabetic';
    },
  },
  // dark matter: you only see it by the way it bends light (and bullets) around it
  darkmatter: {
    r: 20, hp: 22, score: 520, col: 'blue', mass: 12, hideArrow: true, info: ['Dark matter', 'Invisible. You only see it by how it bends light, the grid and bullets around it. It shows faintly when your cats get close.'],
    move: { chase: 46, acc: 0.6 },
    tick(e, dt) { Grid.attract(e.x, e.y, 2600, 260, dt); },
    field: { acc(s, x, y, k, o) { if (k === K_PB || k === K_EB) pullTo(o, x, y, s.x, s.y, k === K_PB ? 4.4e6 : 2.2e6, 3600, 300); } },
    lens: 34,
    draw(e, ctx, x, y) {
      let near = 1e9;
      for (const b of Player.dead ? [] : Player.branches) near = Math.min(near, Math.hypot(wdx(b.px - e.x), wdy(b.py - e.y)));
      const a0 = ctx.globalAlpha;
      ctx.globalCompositeOperation = 'lighter'; // a faint shimmer, always: you can tell something is there without seeing it
      for (let k = 0; k < 6; k++) { const a = e.t * 0.8 + k * 1.05 + e.ph, r = 16 + 12 * Math.sin(e.t * 1.6 + k * 1.9); ctx.globalAlpha = a0 * Math.max(0, 0.1 + 0.09 * Math.sin(e.t * 4.3 + k * 2.2)); dot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 2, '#b8c8ff'); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a0 * clamp(clamp(1 - (near - 110) / 230, 0, 1) * 0.6 + Math.min(1, e.flash * 10) * 0.6 + (Game.state === 'title' ? 0.3 : 0.06), 0, 1);
      Tele.ring(ctx, x, y, 22, COL.blue, 1, [2, 5]);
      for (let k = 0; k < 6; k++) { const an = e.t * 0.7 + k * TAU / 6; dot(ctx, x + Math.cos(an) * 34, y + Math.sin(an) * 34, 1.6, 'rgba(140,170,255,.8)'); }
      dot(ctx, x, y, 12, 'rgba(30,40,90,.8)');
      ctx.globalAlpha = a0;
    },
  },
  // virtual particle pairs (vacuum fluctuations)
  virtual: {
    r: 9, hp: 1, score: 30, col: 'white', mass: 0.4, info: ['Virtual pair', 'Only during Vacuum Fluctuations. Two particles pop out of nothing, fly apart, then annihilate when they meet. Kill one and the other becomes a real electron.'],
    init(e, o) { e.anti = !!o.anti; e.col = e.anti ? PI_.violet : PI_.white; e.vx = Math.cos(o.va || 0) * 150; e.vy = Math.sin(o.va || 0) * 150; e.noDrop = true; },
    update(e, dt) {
      const p = e.pair;
      if (!p || p.dead) { // the survivor becomes real
        Object.assign(e, { type: 'electron', def: ET.electron, col: PI_.amber, score: 50 }); ET.electron.init(e);
        FX.text(e.x, e.y - 16, 'now real', PI_.white, { size: 12, font: 'serif' }); Notes.obs('enemy:virtual', 'real');
        return;
      }
      if (e.t > 1.1) {
        const dx = wdx(p.x - e.x), dy = wdy(p.y - e.y), d = Math.hypot(dx, dy) || 1;
        e.vx += dx / d * 520 * dt; e.vy += dy / d * 520 * dt;
        if (d < 16 && e.id < p.id) { Game.annihilate((e.x + p.x) / 2, (e.y + p.y) / 2, 80, 3, true); Game.killEnemy(e, 'annihilate', true); Game.killEnemy(p, 'annihilate', true); return; }
      } else { e.vx *= Math.exp(-1.2 * dt); e.vy *= Math.exp(-1.2 * dt); }
      moveEnemy(e, dt);
    },
    draw(e, ctx, x, y) {
      Tele.ring(ctx, x, y, 8, PAL[e.col], 1, [3, 3]); dot(ctx, x, y, 3.5, PAL_CSS[e.col]);
      if (e.pair && !e.pair.dead && e.id < e.pair.id) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wdx(e.pair.x - e.x), y + wdy(e.pair.y - e.y)); ctx.stroke(); }
    },
  },
};

// spatial hash for enemies
const ORIGIN = [{ dx: 0, dy: 0 }];
const EGrid = {
  cell: 100, cols: Math.ceil(W / 100), rows: Math.ceil(H / 100), cells: null,
  idx(i, j) {
    if (World.wrap) { i = ((i % this.cols) + this.cols) % this.cols; j = ((j % this.rows) + this.rows) % this.rows; }
    else if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return -1;
    return j * this.cols + i;
  },
  build(list) {
    if (!this.cells) this.cells = Array.from({ length: this.cols * this.rows }, () => []);
    for (const c of this.cells) c.length = 0;
    for (const e of list) {
      if (e.dead || e.spawning || e.ghost) continue;
      const r = (e.gridR || e.r) + 4;
      for (const p of e.sp || ORIGIN) {
        const px = e.x + p.dx, py = e.y + p.dy;
        for (let j = Math.floor((py - r) / this.cell); j <= Math.floor((py + r) / this.cell); j++) for (let i = Math.floor((px - r) / this.cell); i <= Math.floor((px + r) / this.cell); i++) {
          const k = this.idx(i, j); if (k < 0) continue;
          const cell = this.cells[k]; if (cell[cell.length - 1] !== e) cell.push(e);
        }
      }
    }
  },
  at(x, y) { const k = this.idx(Math.floor(x / this.cell), Math.floor(y / this.cell)); return k < 0 ? null : this.cells[k]; },
};

// quark triads
function spawnTriad(x, y) {
  const T = { x, y, vx: 0, vy: 0, a: Math.random() * TAU, members: [null, null, null], regen: [0, 0, 0], done: false };
  for (let s = 0; s < 3; s++) { const a = T.a + s * TAU / 3; T.members[s] = Game.addEnemy('quark', x + Math.cos(a) * 34, y + Math.sin(a) * 34, { triad: T, slot: s }); }
  Game.triads.push(T);
  return T;
}
function updateTriad(T, dt) {
  const live = T.members.filter(Boolean).length;
  steer(T, Game.tx, Game.ty, (95 + (3 - live) * 25) * Game.enemySpeedMul, 1.5, dt);
  const m = Fields.time(T.x, T.y, K_EN, T);
  T.x += T.vx * dt * m; T.y += T.vy * dt * m;
  if (World.wrap) { T.x = wrapX(T.x); T.y = wrapY(T.y); } else { T.x = clamp(T.x, 50, W - 50); T.y = clamp(T.y, 50, H - 50); }
  T.a += dt * (1.3 + (3 - live) * 0.8);
  if (T.done) return;
  for (let s = 0; s < 3; s++) {
    if (T.members[s] || T.regen[s] <= 0 || (T.regen[s] -= dt) > 0) continue;
    const a = T.a + s * TAU / 3, x = T.x + Math.cos(a) * 34, y = T.y + Math.sin(a) * 34;
    T.members[s] = Game.addEnemy('quark', x, y, { triad: T, slot: s });
    FX.text(T.x, T.y - 26, 'confinement', PI_.white, { size: 11, font: 'serif', life: 0.8 }); Notes.obs('enemy:quark', 'confine'); FX.burst(x, y, 10, 120, T.members[s].col, { life: 0.4 });
  }
}
function gluon(ctx, x0, y0, dx, dy, t) { // a wiggly string between two points
  const d = Math.hypot(dx, dy) || 1; ctx.beginPath();
  for (let k = 0; k <= 14; k++) { const f = k / 14, w = Math.sin(f * PI * 5 + t * 14) * 3.5; ctx.lineTo(x0 + dx * f - dy / d * w, y0 + dy * f + dx / d * w); }
  ctx.stroke();
}
function drawTriad(T, ctx) {
  const ms = T.members.filter(Boolean); if (ms.length < 2) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2; ctx.strokeStyle = rgba(COL.yellow, 0.55);
  for (let i = 0; i < (ms.length === 2 ? 1 : ms.length); i++) { const a = ms[i], b = ms[(i + 1) % ms.length]; gluon(ctx, ix(a.x), iy(a.y), wdx(b.x - a.x), wdy(b.y - a.y), Game.t); }
  ctx.globalCompositeOperation = 'source-over';
}
