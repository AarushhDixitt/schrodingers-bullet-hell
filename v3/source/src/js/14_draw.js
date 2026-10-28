// ---------- scene rendering ----------
const STARS = Array.from({ length: 190 }, () => ({ x: Math.random(), y: Math.random(), z: rand(0.04, 0.5), s: rand(0.6, 2.2), ci: Math.random() < 0.25 ? randi(0, PHASE_N - 1) : PI_.chalk, tw: Math.random() * TAU }));
const NEBULA = [{ x: 0.2, y: 0.3, s: 0.9 }, { x: 0.75, y: 0.65, s: 1.1 }, { x: 0.55, y: 0.15, s: 0.7 }];
const fontMono = (s, w = 500) => `${w} ${s}px Qmono, Qmath, ui-monospace, monospace`;
const fontSerif = (s, w = 400, it = true) => `${it ? 'italic ' : ''}${w} ${s}px Qtext, Qmath, "Times New Roman", serif`;
function setLS(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
// one call for the HUD's most common thing: a line of text in a font, a colour, an alignment and letter-spacing
function txt(c, s, x, y, font, col, align = 'left', ls = 0) { if (ls) setLS(c, ls); c.font = font; c.fillStyle = col; c.textAlign = align; c.fillText(s, x, y); if (ls) setLS(c, 0); }
function wrapText(ctx, text, maxW) {
  const lines = []; let cur = '';
  for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
// several wrapped lines, top line at y; returns the lines
function para(c, s, x, y, maxW, lh, font, col, align = 'center') { c.font = font; c.fillStyle = col; c.textAlign = align; const L = wrapText(c, s, maxW); L.forEach((l, i) => c.fillText(l, x, y + i * lh)); return L; }

function drawBackdrop(ctx) {
  // laid out in CSS pixels (not render pixels) with parallax from the camera's position only, so a change of
  // resolution, quality or zoom never shuffles the stars; they wrap well outside the screen
  ctx.save(); ctx.translate(R.sw / 2, R.sh / 2); if (cam.rot) ctx.rotate(cam.rot); ctx.scale(R.rs, R.rs);
  const span = Math.hypot(R.cssW, R.cssH) * 1.25, wrapc = v => ((v % span) + span) % span - span / 2, px = cam.x * 0.9, py = cam.y * 0.9;
  ctx.globalCompositeOperation = 'lighter';
  NEBULA.forEach((n, k) => { // cached soft sprites tinted by the theme (no per-frame gradients)
    const x = wrapc(n.x * span - px * 0.05), y = wrapc(n.y * span - py * 0.05), s = span * 0.5 * n.s;
    ctx.drawImage(rgbSprite(Theme.c.neb[k % 3], 0.065, 0.018), x - s / 2, y - s / 2, s, s);
  });
  for (const st of STARS) {
    const s = st.s * 2.2;
    ctx.globalAlpha = clamp(0.25 + 0.3 * Math.sin(Game.rt * 1.3 + st.tw) * Math.sin(Game.rt * 0.7 + st.tw * 2) + st.z * 0.6, 0, 1);
    ctx.drawImage(glowSprite(st.ci, 16), wrapc(st.x * span - px * st.z) - s, wrapc(st.y * span - py * st.z) - s, s * 2, s * 2);
  }
  ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawArena(ctx) {
  const lw = 2.2 * R.rs / cam.zoom, ac = Theme.c.arena;
  ctx.lineWidth = lw;
  if (World.wrap) { ctx.setLineDash([14, 14]); ctx.strokeStyle = rgba(ac, 0.45); for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) ctx.strokeRect(ox, oy, W, H); ctx.setLineDash([]); return; }
  ctx.strokeStyle = rgba(ac, 0.75); ctx.strokeRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(236,231,255,0.8)'; ctx.lineWidth = lw * 1.8; ctx.beginPath(); // corner brackets
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]]) { ctx.moveTo(x + sx * 60, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * 60); }
  ctx.stroke();
  ctx.strokeStyle = rgba(ac, 0.5); ctx.lineWidth = lw * 0.7; ctx.beginPath(); // a ruler every 100 units
  for (let x = 100; x < W; x += 100) { const l = x % 500 ? 8 : 18; ctx.moveTo(x, 0); ctx.lineTo(x, l); ctx.moveTo(x, H); ctx.lineTo(x, H - l); }
  for (let y = 100; y < H; y += 100) { const l = y % 500 ? 8 : 18; ctx.moveTo(0, y); ctx.lineTo(l, y); ctx.moveTo(W, y); ctx.lineTo(W - l, y); }
  ctx.stroke();
}

function drawSpawns(ctx) {
  ctx.lineWidth = 2;
  for (const s of Game.spawns) {
    if (s.t < s.delay) continue;
    const f = clamp((s.t - s.delay) / s.dur, 0, 1), x = ix(s.x), y = iy(s.y), r = lerp(46, 10, easeInCubic(f)), dark = s.type === 'darkmatter';
    ctx.strokeStyle = rgba(dark ? COL.blue : COL.white, (dark ? 0.08 : 0.25) + (dark ? 0.2 : 0.6) * f);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    for (let k = 0; k < 4; k++) { const a = k * PI / 2 + f * 3; ctx.moveTo(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4)); ctx.lineTo(x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12)); }
    ctx.stroke();
  }
}

const PICKUP_GLYPH = { H: 'Ĥ⁺', T: 'T', F: 'mK', E: '∅', S: 'π', C: '+1' };
function drawPickupGlyph(ctx, kind, x, y, t) {
  if (kind === 'cool') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8); ctx.strokeStyle = PAL_CSS[PI_.ice]; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6, bx = Math.cos(a) * 6, by = Math.sin(a) * 6; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); for (const d of [0.9, -0.9]) { ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + d) * 4, by + Math.sin(a + d) * 4); } }
    ctx.stroke(); ctx.restore(); return;
  }
  const s = 15 + Math.sin(t * 6) * 1.5, plain = kind === 'F' || kind === 'C';
  halo(ctx, PI_.gold, x, y, 32);
  ctx.fillStyle = 'rgba(21,17,40,.92)'; ctx.strokeStyle = PAL_CSS[PI_.gold]; ctx.lineWidth = 2;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - s, y - s, s * 2, s * 2, 6); else ctx.rect(x - s, y - s, s * 2, s * 2); ctx.fill(); ctx.stroke();
  ctx.textBaseline = 'middle'; txt(ctx, PICKUP_GLYPH[kind] || '?', x, y + 1, fontSerif(plain ? 15 : 19, 700, !plain), PAL_CSS[PI_.gold], 'center'); ctx.textBaseline = 'alphabetic';
}
function drawPickups(ctx) { for (const p of Game.pickups) if (!(p.life - p.t < 2 && Math.sin(Game.rt * 24) > 0)) drawPickupGlyph(ctx, p.kind, ix(p.x), iy(p.y), Game.rt); }

function drawEnemies(ctx, vr) {
  const unc = Anom.on.uncertainty, sl = Anom.on.slowlight, t = Game.rt;
  for (const T of Game.triads) drawTriad(T, ctx);
  for (const e of Game.enemies) {
    if (e.dead) continue;
    if (e.boss) {
      e.bossDef.draw(e, ctx);
      if (e.flash > 0 && !e.bodies && !e.bossDef.iconDraw) halo(ctx, PI_.white, e.x, e.y, e.r * 1.4, 0.5);
      continue;
    }
    let x = ix(e.x), y = iy(e.y);
    if (sl) { // slow light: draw where the light left it; a faint outline marks the truth
      Tele.ring(ctx, x, y, e.r + 3, COL.chalk, 0.18, [2, 4], 1);
      const p = LAWS.slowlight.seen(sl, e); if (!p) continue;
      x = ix(p[0]); y = iy(p[1]);
    }
    if (x < vr.x0 - 140 || x > vr.x1 + 140 || y < vr.y0 - 140 || y > vr.y1 + 140) continue;
    if (e.sp) {
      for (const p of e.sp) { ctx.globalAlpha = 0.55; e.def.draw(e, ctx, x + p.dx, y + p.dy); ctx.globalAlpha = 0.8; txt(ctx, '1/' + e.sp.length, x + p.dx, y + p.dy - e.r - 8, fontSerif(11), PAL_CSS[PI_.chalk], 'center'); }
      ctx.globalAlpha = 1;
    } else if (unc && unc.dx > 6) {
      const seed = e.id * 7.13 + Math.floor(t * 10), j = (k, a, m) => (Math.sin(seed * (k + a) * 12.9898) * m % 1) * unc.dx * 1.6;
      ctx.globalAlpha = 0.32;
      for (let k = 0; k < 4; k++) e.def.draw(e, ctx, x + (k ? j(k, 1, 43758.5453) : 0), y + (k ? j(k, 3, 12543.123) : 0));
      ctx.globalAlpha = 1;
    } else e.def.draw(e, ctx, x, y);
    if (e.flash > 0) halo(ctx, PI_.white, x, y, e.r * 1.6, Math.min(1, e.flash * 14), glowSprite);
    const mark = (c, w, r, dash) => { ctx.strokeStyle = c; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); if (dash) ctx.setLineDash([]); };
    if (e.frozen) mark('rgba(76,242,255,.75)', 1.5, e.r + 7, [3, 4]);
    if (e.zombie) mark('rgba(96,255,156,.6)', 1.2, e.r + 4);
    if (e.heavy) mark('rgba(255,232,110,.75)', 2.2, e.r + 5);
  }
  if (Game.zaps.length) {
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(200,230,255,.9)'; ctx.lineWidth = 2.5;
    for (const z of Game.zaps) { ctx.globalAlpha = 1 - z.t / 0.22; lightning(ctx, ix(z.x0), iy(z.y0), ix(z.x0) + wdx(z.x1 - z.x0), iy(z.y0) + wdy(z.y1 - z.y0), z.seed, 0.5); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

function drawSpeech(ctx) {
  for (const s of Game.speech) {
    if (s.e && !s.e.dead) { s.x = s.e.x; s.y = s.e.y; }
    const f = s.t / s.dur, [x, sy] = worldToCss(ix(s.x), iy(s.y)), y = sy - 34 * Math.max(0.8, cam.zoom / R.rs);
    ctx.font = fontSerif(15); const w = ctx.measureText(s.text).width + 18;
    ctx.globalAlpha = f < 0.1 ? f / 0.1 : f > 0.85 ? (1 - f) / 0.15 : 1;
    ctx.fillStyle = 'rgba(244,240,255,.95)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - w / 2, y - 14, w, 26, 9); else ctx.rect(x - w / 2, y - 14, w, 26);
    ctx.moveTo(x - 6, y + 11); ctx.lineTo(x + 2, y + 21); ctx.lineTo(x + 6, y + 11); ctx.fill();
    ctx.textBaseline = 'middle'; txt(ctx, s.text, x, y, fontSerif(15), '#1e1838', 'center'); ctx.textBaseline = 'alphabetic';
  }
  ctx.globalAlpha = 1;
}

function buildPost() {
  const P = Game.post, fx = Settings.fx ?? 1;
  const out = { time: Game.rt, thresh: 0.3, bloom: 1.35, ca: 0.0012 + P.ca, glitch: P.glitch, pixel: 0, posterize: 0, invert: P.invert, vignette: 0.6, grain: 0.03, scan: 0.035, sat: 1, rewind: P.rewind, flash: P.flash, lenses: [], ripples: [] };
  for (const r of P.ripples) { const [sx, sy] = worldToScene(ix(r.x), iy(r.y)); out.ripples.push({ x: sx, y: sy, r: r.r * cam.zoom, a: r.a * (1 - r.t / r.life) }); }
  Anom.each('post', out); Holes.post(out); Events.post(out);
  for (const e of Game.enemies) if (e.def.lens && !e.dead) { const [sx, sy] = worldToScene(ix(e.x), iy(e.y)); out.lenses.push({ x: sx, y: sy, e: e.def.lens * cam.zoom, hz: 0 }); }
  out.bloom *= 0.35 + 0.65 * fx; out.ca *= fx; out.grain *= fx; out.scan *= fx; out.vignette *= 0.5 + 0.5 * fx;
  if (!Settings.flashes) { out.flash = [P.flash[0], P.flash[1], P.flash[2], Math.min(0.18, P.flash[3])]; out.glitch = Math.min(out.glitch, 0.2); out.invert = Math.min(out.invert, 0.25); }
  out.sat = Game.state === 'over' || Game.dyingT > 0 ? 0.35 : Game.state === 'paused' ? 0.45 : Player.meas && Player.meas.kind !== 'region' ? 0.7 : 1;
  if (Game.state === 'title') out.vignette = 0.9;
  return out;
}

Game.render = function () {
  const ctx = R.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = Theme.bgCss; ctx.fillRect(0, 0, R.sw, R.sh);
  drawBackdrop(ctx);
  camApply(ctx);
  const vr = viewRect(60), planck = Anom.planck() && Settings.pixelate !== false;
  if (World.wrap) {
    for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
      if (vr.x1 < ox || vr.x0 > ox + W || vr.y1 < oy || vr.y0 > oy + H) continue;
      ctx.translate(ox, oy); Grid.draw(ctx, { x0: vr.x0 - ox, y0: vr.y0 - oy, x1: vr.x1 - ox, y1: vr.y1 - oy }); ctx.translate(-ox, -oy);
    }
  } else Grid.draw(ctx, vr);
  drawArena(ctx);
  Anom.each('drawUnder', ctx); Events.drawUnder(ctx); Holes.drawUnder(ctx);
  drawPickups(ctx); drawSpawns(ctx);
  Bullets.drawPlayer(ctx, vr, planck);
  drawEnemies(ctx, vr);
  FX.draw(ctx, vr, planck);
  Events.drawMid(ctx);
  if (Mods.school === 'pw' && !Player.dead) drawPilot(ctx);
  if (Game.mode === 'tutorial') Tutorial.draw(ctx);
  Player.draw(ctx);
  Bullets.drawEnemy(ctx, vr, planck);
  Calib.drawHits(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (R.post) R.post.render(R.scene, buildPost());
  else { const f = Game.post.flash; if (f[3] > 0) { ctx.fillStyle = `rgba(${f[0] * 255 | 0},${f[1] * 255 | 0},${f[2] * 255 | 0},${f[3] * 0.6})`; ctx.fillRect(0, 0, R.sw, R.sh); } }
  drawHUD();
};

// ---------- HUD ----------
const COLS = { chalk: '#ece7ff', dim: '#9a93c4', gold: '#ffcf4a', cyan: '#4cf2ff', red: '#ff3b55', soft: '#d9d3f3' };
const waveLabel = d => Game.mode === 'tutorial' ? 'ORIENTATION' : Game.variant === 'endless' ? 'ENDLESS · WAVE ' + d.n : Game.variant === 'rush' ? 'BOSS RUSH · ' + ((d.n - 1) % 9 + 1) + ' OF 9' + (d.cycle ? ' · CYCLE ' + (d.cycle + 1) : '') : 'CH. ' + ROMAN[d.chapter || 1] + ' · WAVE ' + d.n + ' OF ' + CAMPAIGN.length;
function drawHUD() {
  const c = R.hctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, R.hw, R.hh); c.setTransform(R.hs, 0, 0, R.hs, 0, 0);
  FX.drawTexts(c); drawSpeech(c); // world-anchored text first (crisp, under the HUD chrome)
  if (Game.state === 'title') { drawTouch(c); return; }
  drawEliteBars(c);
  if (Game.state === 'playing' && Settings.odds !== false) drawDanger(c);
  if (Player.meas) drawMeasurement(c, R.cssW, R.cssH);
  drawTouch(c);
  if (Game.state === 'playing' && Input.mouse.has && !Input.touchMode && !Settings.autoAim) drawReticle(c, Input.mouse.x, Input.mouse.y);
  // the chrome scales with the HUD-size setting
  const S = clamp(Settings.hudScale || 1, 0.6, 1.6); c.setTransform(R.hs * S, 0, 0, R.hs * S, 0, 0);
  const Wc = R.cssW / S, Hc = R.cssH / S, I = R.insets;
  const L = Math.max(16, I.l + 8) / S, Rr = Wc - Math.max(16, I.r + 8) / S, T = Math.max(14, I.t + 8) / S, B = Hc - Math.max(14, I.b + 8) / S;
  c.textBaseline = 'alphabetic';
  const narrow = Wc < 640, short = !narrow && Hc < 520, small = narrow || short, mini = Settings.hudMinimal;
  const RrTop = narrow && !document.body.classList.contains('touchplay') ? Rr : Rr - 50 / S; // the pause button owns the top-right corner
  const arcade = Game.mode === 'arcade', D = Game.D;

  // score
  txt(c, 'SCORE', L, T + 10, fontMono(10, 500), COLS.dim, 'left', 1.8);
  const sc = fmtInt(Game.score), sy = T + (small ? 34 : 40);
  txt(c, sc, L, sy, fontMono(small ? 20 : 26, 700), COLS.chalk);
  txt(c, '×' + Game.mult.toFixed(2), L + c.measureText(sc).width + 10, sy, fontMono(small ? 12 : 15, 600), COLS.gold);
  if (Game.mode === 'lab') txt(c, 'Laboratory · infinite lives', L, T + (small ? 54 : 62), fontSerif(14), COLS.dim);
  else if (Game.mode === 'tutorial') txt(c, 'Orientation', L, T + (small ? 54 : 62), fontSerif(14), COLS.dim);
  else if (arcade && !narrow && !mini && !(short && Game.boss)) txt(c, D.name.toUpperCase() + (Game.variant === 'endless' ? ' · ENDLESS' : Game.variant === 'rush' ? ' · BOSS RUSH' : '') + (Mods.school ? ' · ' + SCHOOLS[Mods.school].name.toUpperCase() : ''), L, T + (short ? 52 : 60), fontMono(9.5, 600), PAL_CSS[PI_[D.col]], 'left', 1.4);

  // lives
  if (arcade) {
    const n = Game.lives, s = narrow ? 13 : short ? 15 : 19;
    for (let k = 0; k < 9; k++) { c.globalAlpha = k < n ? 1 : 0.28; c.drawImage(catSprite(k < n ? 0 : PI_.dim, k < n ? 0 : 2), narrow ? L + k * (s + 2) : RrTop - (k + 1) * (s + 3) + 3, narrow ? T + 44 : T, s, s); }
    c.globalAlpha = 1;
    if (n > 9) { if (narrow) txt(c, '+' + (n - 9), L + 9 * (s + 2) + 4, T + 44 + s - 2, fontMono(11, 600), COLS.chalk); else txt(c, '+' + (n - 9), RrTop - 9 * (s + 3) - 6, T + s - 3, fontMono(11, 600), COLS.chalk, 'right'); }
    if (!small && !mini) txt(c, Game.stats.survived + ' MEASUREMENTS SURVIVED' + (Input.padActive ? ' · 🎮' : ''), RrTop, T + s + 16, fontMono(9.5, 500), COLS.dim, 'right', 1.2);
  }
  Calib.hud(c, RrTop, T + (arcade ? 56 : 14));

  // wave label
  const d = Director.def, boss = Game.boss && !Game.boss.dead ? Game.boss : null;
  if (d && arcade && !Game.card) {
    if (narrow) { txt(c, waveLabel(d), Rr, T + 66, fontMono(10, 600), COLS.gold, 'right', 1.6); if (!d.boss) para(c, d.name, Rr, T + 84, Wc * 0.55, 16, fontSerif(13.5), COLS.chalk, 'right'); }
    else { txt(c, waveLabel(d), Wc / 2, T + 10, fontMono(10.5, 600), COLS.gold, 'center', 2); if (!d.boss) txt(c, d.name, Wc / 2, T + (short ? 29 : 32), fontSerif(short ? 15 : 17), COLS.chalk, 'center'); }
    if (Game.variant === 'rush' && !narrow) drawRushStrip(c, Wc / 2, T + 18, d);
  }
  if (Game.mode === 'lab' && !boss) {
    const ids = Anom.ids(), label = ids.length ? ids.map(a => LAWS[a].name).join(' + ') : 'All laws in force';
    if (narrow) para(c, label, L, T + 78, Wc - 2 * L - 60, 16, fontSerif(13), COLS.chalk, 'left'); else txt(c, label, Wc / 2 - 120, T + 22, fontSerif(15), COLS.chalk, 'center');
  }

  // boss bar, its weak window and the attack it is doing
  const bossY = narrow ? T + 122 : T + 48;
  let readY = narrow ? T + 140 : short ? T + 52 : T + 58;
  if (boss && Director.phase !== 'bossIntro') {
    const bw = Math.min(560, Wc - 2 * L - (narrow ? 0 : 260)), bx = Wc / 2 - bw / 2, by = bossY, win = Game.bossWindow(boss);
    txt(c, boss.bossDef.name, Wc / 2, by - 8, fontSerif(narrow ? 16 : 20, 700), COLS.chalk, 'center');
    c.fillStyle = 'rgba(236,231,255,.12)'; c.fillRect(bx, by, bw, 7);
    const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#ff3fb4'); g.addColorStop(0.5, '#ffcf4a'); g.addColorStop(1, '#4cf2ff');
    c.fillStyle = g; c.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 7);
    c.fillStyle = '#0c0a18'; for (const tk of boss.bossDef.phases || [0.5, 0.25]) c.fillRect(bx + bw * tk - 1, by - 2, 2, 11);
    if (win) { c.strokeStyle = `rgba(96,255,156,${0.6 + 0.4 * Math.sin(Game.rt * 12)})`; c.lineWidth = 2; c.strokeRect(bx - 3, by - 3, bw + 6, 13); }
    txt(c, win ? '◆ WEAK · ' + win : 'ARMOURED', bx, by + 21, fontMono(10, 700), win ? '#60ff9c' : COLS.dim, 'left', 1.4);
    if (boss.atkName) { boss.atkNameT = (boss.atkNameT || 0) + Game.realDt; c.globalAlpha = boss.atkNameT < 2.5 ? 1 : 0.55; txt(c, boss.atkName.toUpperCase(), bx + bw, by + 21, fontMono(10, 700), boss.atkNameT < 2.5 ? COLS.gold : COLS.dim, 'right', 1.4); c.globalAlpha = 1; }
    let subOn = false;
    if (Game.bossSub && !mini) { const a = clamp(3 - (Game.bossSub.t += Game.realDt), 0, 1); if (a > 0) { subOn = true; c.globalAlpha = a; txt(c, Game.bossSub.text, Wc / 2, by + 40, fontSerif(narrow ? 13.5 : 15), COLS.dim, 'center'); c.globalAlpha = 1; } }
    readY = by + (subOn ? 62 : 42);
  }
  // what the suspended law does, in plain words
  if (arcade && d && !Game.card && Director.how && !mini) {
    const fade = clamp(13 - (Game.howT || 0), 0, 1), keep = !small && !boss, alpha = keep ? 0.5 + 0.5 * fade : fade;
    if (alpha > 0.01) {
      const w = boss ? Math.min(560, Wc - 2 * L) : narrow ? Wc - 2 * L : short ? Math.min(520, Wc - 2 * (L + 210)) : Wc >= 1100 ? 560 : Math.min(620, Wc - 2 * L);
      const y0 = boss ? readY : narrow ? T + 132 : short ? T + 48 : Wc >= 1100 ? T + 54 : T + 72;
      c.font = fontSerif(small ? 13 : 14);
      const lines = wrapText(c, Director.how, w);
      c.globalAlpha = alpha * 0.85; c.fillStyle = 'rgba(12,10,24,.55)'; c.fillRect(Wc / 2 - w / 2 - 8, y0 - 14, w + 16, lines.length * 17 + 8);
      c.globalAlpha = alpha; c.fillStyle = '#d4ccf2'; c.textAlign = 'center'; lines.forEach((l, i) => c.fillText(l, Wc / 2, y0 + i * 17)); c.globalAlpha = 1;
      readY = y0 + lines.length * 17 + 18;
    }
  }
  // law readouts (γ, Δx·Δp, gate countdown, gravity), then the boss's own instruments
  Anom.hud(c, Wc / 2, readY);
  if (boss && boss.bossDef.hud && Director.phase !== 'bossIntro' && !short) boss.bossDef.hud(boss, c, Wc / 2, readY + Anom.ids().filter(id => LAWS[id].hud).length * 24 + (narrow ? 4 : 0));

  drawPsiPanel(c, L, B, narrow, short);
  // bottom-right stack: splits, then the feed, both lifted above any touch button parked in that corner
  const BR = Feed.L.length || Splits.shown() ? Math.min(B, (TouchLayout.topRightOf((Rr - 250) * S) - 14) / S) : B;
  Splits.draw(c, Rr, BR);
  Feed.draw(c, Rr, BR, T + (small ? 96 : 116));
  if (Game.state === 'playing') drawOffscreen(c, Wc, Hc);
  if (document.body.classList.contains('touchplay') && Game.touchHintT > 0 && Game.state === 'playing' && !Game.card) drawTouchHint(c, Wc, Hc, L, Rr, short);
  for (const bn of Game.banners) drawBanner(c, bn, Wc, Hc);
  if (Game.card) drawCard(c, Game.card, Wc, Hc);
  if (Game.mode === 'tutorial') Tutorial.hud(c, Wc, Hc, B);
  if (Player.dead && Game.state === 'playing' && Game.dyingT <= 0 && Game.mode !== 'attract') txt(c, 'RE-ENTERING SUPERPOSITION…', Wc / 2, Hc * 0.62, fontMono(12, 600), COLS.chalk, 'center', 2.5);
  if (Game.showFps || Settings.fps) txt(c, (1000 / R.frameMs).toFixed(0) + ' fps · ' + R.sw + '×' + R.sh + ' · ' + EB.n + '/' + PB.n + ' · ' + FX.n, Settings.splits ? L + 260 : Rr, B, fontMono(10), COLS.dim, Settings.splits ? 'left' : 'right');
  c.textAlign = 'left';
}

// Pilot-Wave: you can see where every nearby bullet is going
function drawPilot(ctx) {
  ctx.strokeStyle = 'rgba(140,212,255,.28)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]); ctx.beginPath();
  for (let i = 0; i < EB.n; i++) { const dx = wdx(EB.x[i] - Player.x), dy = wdy(EB.y[i] - Player.y); if (dx * dx + dy * dy > 480 * 480) continue; const x = ix(EB.x[i]), y = iy(EB.y[i]); ctx.moveTo(x, y); ctx.lineTo(x + EB.vx[i] * 0.8, y + EB.vy[i] * 0.8); }
  ctx.stroke(); ctx.setLineDash([]);
}
// the feed: a running log in the bottom-right corner (lost cats, close calls, pick-ups). Newest at the bottom; older lines rise and fade.
const Feed = {
  L: [],
  clear() { this.L.length = 0; },
  add(text, col = 'chalk', sub) {
    if (Game.mode === 'attract') return;
    const last = this.L[this.L.length - 1];
    if (last && last.text === text && last.t < 2.5) { last.n++; last.t = 0; return; } // repeats stack as ×2, ×3…
    this.L.push({ text, sub, col: COLS[col] || PAL_CSS[PI_[col]] || col, t: 0, n: 1, y: null });
    if (this.L.length > 8) this.L.shift();
  },
  draw(c, Rr, B, ceil) {
    const dt = Game.realDt, lh = 25;
    for (let i = this.L.length - 1; i >= 0; i--) if ((this.L[i].t += dt) > 6) this.L.splice(i, 1);
    if (!this.L.length) return;
    // stack over the splits panel; if that leaves no room under the top HUD, sit beside the panel instead
    let base = Splits.top(B) - (Splits.shown() ? 12 : 0);
    if (Splits.shown() && base - ceil < lh * 3) { base = B; Rr -= 226; }
    const fit = Math.max(1, Math.floor((base - ceil) / lh)), L = this.L.slice(-fit); // only what fits under the top HUD
    c.font = fontSerif(14); c.textBaseline = 'middle';
    L.forEach((e, i) => {
      const target = base - (L.length - 1 - i) * lh - 10; e.y = e.y === null ? target : e.y + (target - e.y) * damp(12, dt);
      const a = Math.min(1, e.t / 0.2) * clamp((6 - e.t) / 1, 0, 1) * (0.55 + 0.45 * (i + 1) / L.length), slide = (1 - easeOutCubic(Math.min(1, e.t / 0.25))) * 30;
      const s = e.text + (e.n > 1 ? '  ×' + e.n : ''), w = c.measureText(s).width + (e.sub ? c.measureText(e.sub).width + 12 : 0) + 22, x = Rr + slide;
      c.globalAlpha = a * 0.8; c.fillStyle = 'rgba(12,10,24,.82)'; c.fillRect(x - w, e.y - 11, w, 22);
      c.globalAlpha = a; c.fillStyle = e.col; c.fillRect(x - w, e.y - 11, 2, 22);
      if (e.sub) { c.fillStyle = COLS.dim; c.textAlign = 'right'; c.fillText(e.sub, x - 10, e.y + 1); }
      c.fillStyle = e.col; c.textAlign = 'right'; c.fillText(s, x - 10 - (e.sub ? c.measureText(e.sub).width + 12 : 0), e.y + 1);
    });
    c.globalAlpha = 1; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  },
};
// Boss rush: nine pips, the beaten ones filled
function drawRushStrip(c, x, y, d) {
  const k = (d.n - 1) % 9, w = 15;
  for (let i = 0; i < 9; i++) { const px = x + (i - 4) * w; c.fillStyle = i < k ? '#ffcf4a' : i === k ? (Math.sin(Game.rt * 6) > 0 ? '#ff3fb4' : '#ece7ff') : 'rgba(236,231,255,.2)'; c.fillRect(px - 5, y, 10, 4); }
}

// the odds by your cats when a bullet is close: what a hit right now would cost
function drawDanger(c) {
  const P = Player; if (P.dead || P.danger < 0.05 || P.meas) return;
  const [x, y] = worldToCss(ix(P.x), iy(P.y)), n = P.n, lift = (SPREAD[P.nq] || 0) * cam.zoom / R.rs + 34;
  const p = n === 1 ? 1 : 1 / n, col = p >= 0.5 ? COLS.red : p >= 0.2 ? COLS.gold : COLS.cyan;
  c.globalAlpha = clamp(P.danger * 1.6, 0, 1);
  c.textBaseline = 'middle'; txt(c, n === 1 ? 'HIT = DEAD' : 'P(dead) ' + fmtFrac(p), x, y - lift, fontMono(n === 1 ? 12 : 13, 700), col, 'center', 1.2); c.textBaseline = 'alphabetic';
  c.globalAlpha = 1;
}
function drawTouchHint(c, Wc, Hc, L, Rr, short) {
  const a = clamp(Game.touchHintT, 0, 1), top = Hc * (short ? 0.28 : 0.36), bot = Hc * (short ? 0.74 : 0.72);
  const zone = (x0, x1, title, sub) => {
    c.globalAlpha = a * 0.9; c.fillStyle = 'rgba(12,10,24,.35)'; c.fillRect(x0, top, x1 - x0, bot - top);
    c.setLineDash([6, 8]); c.strokeStyle = 'rgba(236,231,255,.45)'; c.lineWidth = 1.5; c.strokeRect(x0 + 0.5, top + 0.5, x1 - x0 - 1, bot - top - 1); c.setLineDash([]);
    setLS(c, 1.6); const n = para(c, title, (x0 + x1) / 2, (top + bot) / 2 - 6, x1 - x0 - 20, 16, fontMono(11.5, 700), COLS.chalk).length; setLS(c, 0);
    para(c, sub, (x0 + x1) / 2, (top + bot) / 2 + 14 + (n - 1) * 16, x1 - x0 - 20, 16, fontSerif(13), '#b9b1de');
  };
  zone(L, Wc / 2 - 8, 'DRAG HERE TO MOVE', 'Your thumb is the joystick.');
  zone(Wc / 2 + 8, Rr, 'TAP TO SPLIT', 'Drag to aim by hand. Let go and it aims for you.');
  c.globalAlpha = 1;
}

function drawPsiPanel(c, L, B, narrow, short) {
  if (Game.mode === 'attract') return;
  const P = Player, pw = narrow ? (Input.touchMode ? 150 : 180) : short ? 210 : 236, ph = short ? 68 : 96, x = L, y = B - ph;
  c.fillStyle = 'rgba(12,10,24,.55)'; c.fillRect(x - 8, y - 6, pw + 16, ph + 12);
  c.strokeStyle = 'rgba(58,49,102,.9)'; c.lineWidth = 1; c.strokeRect(x - 7.5, y - 5.5, pw + 15, ph + 11);
  txt(c, '|ψ⟩', x, y + 16, fontSerif(19), COLS.chalk);
  const n = P.dead ? 0 : P.n;
  txt(c, P.dead ? (short ? '|dead⟩' : 'collapsed to |dead⟩') : n === 1 ? (short ? '1 cat' : '1 cat · classical') : short ? n + ' cats' : n + ' cats · ' + P.nq + ' qubit' + (P.nq > 1 ? 's' : ''), x + 34, y + 15, fontMono(10.5, 500), COLS.dim);
  // histogram over all 2^nq basis states (a solid strip once there are too many to draw one by one)
  const slots = P.dead ? 1 : 1 << P.nq, hy = y + (short ? 21 : 24), hh = short ? 16 : 30, gap = slots > 16 ? 1 : 2, bw = (pw - gap * (slots - 1)) / slots;
  const byBits = new Map(); let maxA = 0; for (const br of P.branches) { byBits.set(br.bits, br); maxA = Math.max(maxA, Math.hypot(br.re, br.im)); }
  for (let k = 0; k < slots; k++) {
    const br = byBits.get(k), bx = x + k * (bw + gap);
    if (!br || P.dead) { c.fillStyle = 'rgba(236,231,255,.08)'; c.fillRect(bx, hy + hh - 2, bw, 2); continue; }
    const h = Math.max(2, hh * Math.hypot(br.re, br.im) / (maxA || 1));
    c.fillStyle = PAL_CSS[P.ci(br)]; c.fillRect(bx, hy + hh - h, Math.max(bw, 0.6), h);
  }
  const pdText = P.dead ? 'P(dead) = 1' : 'P(dead | hit) = ' + (P.n === 1 ? '1' : fmtFrac(1 / P.n)); // fatality odds
  if (short) txt(c, pdText, x + pw, y + 15, fontSerif(13.5), COLS.soft, 'right'); else txt(c, pdText, x, hy + hh + 17, fontSerif(13.5), COLS.soft);
  const cy = y + ph - 8, f = clamp(P.coh / CFG.coh.max, 0, 1); // coherence
  c.fillStyle = 'rgba(236,231,255,.12)'; c.fillRect(x, cy, pw, 5);
  c.fillStyle = Game.cohFlash > 0 && Math.sin(Game.rt * 40) > 0 ? COLS.red : f > 0.5 ? COLS.cyan : f > 0.22 ? COLS.gold : COLS.red; c.fillRect(x, cy, pw * f, 5);
  if (P.fridge > 0) { c.fillStyle = 'rgba(140,212,255,.6)'; c.fillRect(x, cy - 1, pw, 7); }
  txt(c, 'COHERENCE', x, cy - 4, fontMono(9, 600), COLS.dim, 'left', 1.4);
  txt(c, P.fridge > 0 ? '15 mK · ' + (P.fridge > 1e6 ? '∞' : P.fridge.toFixed(0) + 's') : P.nq > 0 ? 'T₂ ≈ ' + (P.drain > 0 ? P.coh / P.drain : 0).toFixed(1) + ' s' : P.coh < CFG.coh.max ? 'cooling' : 'ready', x + pw, cy - 4, fontMono(10, 500), COLS.chalk, 'right');
  let py = y - 16; // power-ups (and insurance left)
  const line = (s, col) => { txt(c, s, x, py, fontMono(10.5, 600), col); py -= 16; };
  if (Mods.immortal > 0 && Game.mode === 'arcade') line('∞ quantum immortality × ' + Mods.immortal, COLS.gold);
  if (Mods.school === 'qb' && Game.mode === 'arcade') line('ℚ rerolls this wave · ' + P.rerolls, '#8cd4ff');
  if (P.shield) line('⊡ Zeno shield ready', COLS.cyan);
  if (P.foldCd > 0 && P.nq > 0) line('Ĥ† recharging', COLS.dim);
  for (const [k, lab, col] of [['boost', 'Ĥ⁺ ×' + Player.boostQ + ' · up to ' + (1 << Player.maxQ()) + ' cats', COLS.gold], ['pierce', 'T gate · piercing', COLS.gold], ['echo', 'π spin echo · half speed', '#8cd4ff']]) if (P[k] > 0) line(lab + ' · ' + (P[k] > 1e6 ? '∞' : P[k].toFixed(0) + 's'), col);
}

function drawOffscreen(c, Wc, Hc) {
  const m = 22, cx = Wc / 2, cy = Hc / 2;
  for (const e of Game.enemies) {
    if (e.dead || e.hideArrow) continue;
    const [sx, sy] = worldToCss(ix(e.x), iy(e.y));
    if (sx > -10 && sx < Wc + 10 && sy > -10 && sy < Hc + 10) continue;
    const dx = sx - cx, dy = sy - cy, k = Math.min((cx - m) / Math.abs(dx || 1e-6), (cy - m) / Math.abs(dy || 1e-6)), s = e.boss ? 13 : 6;
    c.save(); c.translate(cx + dx * k, cy + dy * k); c.rotate(Math.atan2(dy, dx));
    c.globalAlpha = e.boss ? 0.95 : 0.6; c.fillStyle = PAL_CSS[e.col];
    c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.8, -s * 0.7); c.lineTo(-s * 0.8, s * 0.7); c.closePath(); c.fill(); c.restore();
  }
  c.globalAlpha = 1;
}

// the measurement: the world nearly stops, and the odds appear right next to the cat that was touched
function drawMeasurement(c, Wc, Hc) {
  const m = Player.meas, f = clamp(m.t / m.dur, 0, 1);
  if (m.u === undefined) m.u = m.kind === 'full' ? (randi(0, m.n - 1) + rand(0.25, 0.75)) / m.n : m.out ? 1 - m.p + m.p * rand(0.2, 0.8) : (1 - m.p) * rand(0.15, 0.85);
  const k = clamp(m.t / (m.dur * 0.55), 0, 1), u = clamp(m.u + Math.cos(k * PI * 5.5) * (1 - easeOutCubic(k)) * 0.45, 0, 1); // the needle wobbles, then settles
  const [cx, cy] = worldToCss(ix(m.x), iy(m.y)), bw = Math.min(220, Wc - 40), bh = 10, bad = m.kind === 'hit' && m.p >= 0.5;
  const x = clamp(cx - bw / 2, 16, Wc - bw - 16), y = clamp(cy - 92, 70, Hc - 120);
  c.globalAlpha = f < 0.06 ? f / 0.06 : f > 0.86 ? (1 - f) / 0.14 : 1;
  c.fillStyle = 'rgba(12,10,24,.82)'; c.fillRect(x - 12, y - 44, bw + 24, bh + 78);
  c.strokeStyle = bad ? 'rgba(255,59,85,.9)' : 'rgba(58,49,102,1)'; c.lineWidth = bad ? 2 : 1; c.strokeRect(x - 11.5, y - 43.5, bw + 23, bh + 77);
  const big = m.kind === 'hit' ? fmtFrac(m.p) : m.kind === 'region' ? fmtFrac(m.p) : '1 of ' + m.n;
  txt(c, { hit: 'P(DEAD)', region: 'OBSERVED · P(' + (m.labelYes || 'HERE') + ')', full: 'DECOHERENCE' }[m.kind], x, y - 28, fontMono(9.5, 700), COLS.dim, 'left', 1.6);
  txt(c, big, x + bw, y - 10, fontMono(24, 800), m.kind === 'hit' ? (bad ? COLS.red : m.p >= 0.2 ? COLS.gold : COLS.cyan) : COLS.gold, 'right');
  if (m.kind === 'full') for (let i = 0; i < m.n; i++) { c.fillStyle = PAL_CSS[Math.floor(i / m.n * PHASE_N) % PHASE_N]; c.fillRect(x + i * bw / m.n + 0.5, y, bw / m.n - 1, bh); }
  else { const w0 = bw * (1 - m.p); c.fillStyle = COLS.cyan; c.fillRect(x, y, w0, bh); c.fillStyle = m.kind === 'hit' ? COLS.red : COLS.gold; c.fillRect(x + w0, y, bw - w0, bh); }
  const nx = x + u * bw;
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(nx, y - 2); c.lineTo(nx - 6, y - 9); c.lineTo(nx + 6, y - 9); c.closePath(); c.fill(); c.fillRect(nx - 1, y - 2, 2, bh + 5);
  if (k >= 1) {
    const [s, col] = m.kind === 'hit' ? [m.out ? 'DEAD' : 'ALIVE', m.out ? COLS.red : COLS.cyan] : m.kind === 'region' ? [(m.out ? 'Found ' : 'Not ') + (m.labelYes || '').toLowerCase(), COLS.gold] : ['One cat left', PAL_CSS[m.ci] || COLS.chalk];
    txt(c, s, x + bw / 2, y + bh + 24, fontSerif(20, 700), col, 'center');
  }
  c.strokeStyle = 'rgba(236,231,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(clamp(cx, x, x + bw), y + bh + 34); c.lineTo(cx, cy - 12); c.stroke(); // a leader line to the cat
  c.globalAlpha = 1;
}

function drawBanner(c, bn, Wc, Hc) {
  const f = bn.t / bn.dur, y = Hc * 0.4 + (1 - easeOutCubic(Math.min(1, f / 0.12))) * 12;
  c.globalAlpha = f < 0.12 ? f / 0.12 : f > 0.8 ? (1 - f) / 0.2 : 1;
  c.shadowColor = 'rgba(76,242,255,.6)'; c.shadowBlur = 18; txt(c, bn.title, Wc / 2, y, fontMono(Wc < 640 ? 20 : 30, 700), COLS.chalk, 'center', 4); c.shadowBlur = 0;
  if (bn.sub) para(c, bn.sub, Wc / 2, y + 30, Math.min(620, Wc - 40), 22, fontSerif(Wc < 640 ? 15 : 18), '#c8c1ea');
  c.globalAlpha = 1;
}

function drawCard(c, cd, Wc, Hc) {
  const f = cd.t / cd.dur, a = f < 0.1 ? f / 0.1 : f > 0.82 ? (1 - f) / 0.18 : 1, narrow = Wc < 640, y = Hc * (Hc < 520 ? 0.2 : 0.3), mw = Wc - 48;
  c.globalAlpha = a; c.textAlign = 'center';
  setLS(c, 5); c.font = fontMono(narrow ? 11 : 13, 700); c.fillStyle = cd.boss ? '#ff3fb4' : COLS.gold;
  const tl = wrapText(c, (cd.tag || 'WAVE ' + cd.n) + (cd.boss ? ' · SOMETHING LARGE' : ''), Wc - 40); tl.forEach((l, i) => c.fillText(l, Wc / 2, y - (tl.length - 1 - i) * 16)); setLS(c, 0);
  const size = Math.min(narrow ? 30 : 60, Wc / 15, Hc / 9);
  c.shadowColor = cd.boss ? 'rgba(255,63,180,.55)' : 'rgba(76,242,255,.45)'; c.shadowBlur = 24;
  const nl = para(c, cd.name, Wc / 2, y + size + 6, mw, size * 1.05, fontSerif(size, 700), COLS.chalk); c.shadowBlur = 0;
  let yy = y + size + 6 + (nl.length - 1) * size * 1.05;
  if (cd.eq) yy += 34 + (para(c, cd.eq, Wc / 2, yy + 34, mw, 24, fontSerif(narrow ? 16 : 21, 400, false), COLS.dim).length - 1) * 24;
  if (cd.line) yy += 32 + (para(c, cd.line, Wc / 2, yy + 32, Math.min(640, mw), 23, fontSerif(narrow ? 15 : 17.5), COLS.soft).length - 1) * 23;
  if (cd.how && cd.how !== cd.line) {
    const w = Math.min(600, mw); c.font = fontMono(narrow ? 11.5 : 12.5, 500);
    const n = wrapText(c, cd.how, w).length;
    c.globalAlpha = a * 0.92; c.fillStyle = 'rgba(12,10,24,.6)'; c.fillRect(Wc / 2 - w / 2 - 10, yy + 16, w + 20, n * 18 + 14);
    c.globalAlpha = a; para(c, cd.how, Wc / 2, yy + 34, w, 18, c.font, COLS.chalk);
  }
  c.globalAlpha = 1;
}

function drawReticle(c, x, y) {
  const n = Player.n, t = Game.rt;
  c.lineWidth = 2;
  for (let k = 0; k < Math.min(n, 64); k++) { c.strokeStyle = PAL_CSS[Player.ci(Player.branches[k])]; c.beginPath(); c.arc(x, y, 11, k / n * TAU + t, (k + 1) / n * TAU + t - (n > 1 ? 0.12 : 0)); c.stroke(); }
  c.strokeStyle = 'rgba(236,231,255,.9)'; c.lineWidth = 1.5; c.beginPath();
  for (let k = 0; k < 4; k++) { const a = k * PI / 2; c.moveTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); c.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); }
  c.stroke(); c.fillStyle = '#fff'; c.fillRect(x - 1, y - 1, 2, 2);
}

function drawTouch(c) {
  for (const k of ['move', 'aim']) {
    const s = Input.sticks[k]; if (!s) continue;
    c.strokeStyle = 'rgba(236,231,255,.3)'; c.lineWidth = 1.5; c.beginPath(); c.arc(s.ox, s.oy, 58, 0, TAU); c.stroke();
    const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy), m = Math.min(d, 58);
    dot(c, s.ox + (d ? dx / d * m : 0), s.oy + (d ? dy / d * m : 0), 24, k === 'aim' ? 'rgba(255,207,74,.45)' : 'rgba(76,242,255,.45)');
  }
}
