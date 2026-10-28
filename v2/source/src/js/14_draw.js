// ---------- scene rendering ----------
const STARS = Array.from({ length: 190 }, () => ({ x: Math.random(), y: Math.random(), z: rand(0.04, 0.5), s: rand(0.6, 2.2), ci: Math.random() < 0.25 ? randi(0, PHASE_N - 1) : PI_.chalk, tw: Math.random() * TAU }));
const NEBULA = [{ x: 0.2, y: 0.3, ci: 26, s: 0.9 }, { x: 0.75, y: 0.65, ci: 18, s: 1.1 }, { x: 0.55, y: 0.15, ci: 2, s: 0.7 }];
const fontMono = (s, w = 500) => `${w} ${s}px Qmono, Qmath, ui-monospace, monospace`;
const fontSerif = (s, w = 400, it = true) => `${it ? 'italic ' : ''}${w} ${s}px Qtext, Qmath, "Times New Roman", serif`;
function setLS(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
function wrapText(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

function drawBackdrop(ctx) {
  ctx.save();
  ctx.translate(R.sw / 2, R.sh / 2); if (cam.rot) ctx.rotate(cam.rot);
  const span = Math.hypot(R.sw, R.sh);
  ctx.globalCompositeOperation = 'lighter';
  NEBULA.forEach((n, k) => {
    const x = ((n.x * span - cam.x * cam.zoom * 0.05) % span + span) % span - span / 2;
    const y = ((n.y * span - cam.y * cam.zoom * 0.05) % span + span) % span - span / 2;
    const s = span * 0.55 * n.s, rgb = Theme.c.neb[k % 3];
    const g = ctx.createRadialGradient(x, y, 0, x, y, s / 2);
    g.addColorStop(0, rgba(rgb, 0.065)); g.addColorStop(0.5, rgba(rgb, 0.018)); g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g; ctx.fillRect(x - s / 2, y - s / 2, s, s);
  });
  ctx.globalAlpha = 1;
  for (const st of STARS) {
    const x = ((st.x * span - cam.x * cam.zoom * st.z) % span + span) % span - span / 2;
    const y = ((st.y * span - cam.y * cam.zoom * st.z) % span + span) % span - span / 2;
    const s = st.s * R.rs * 2.2;
    ctx.globalAlpha = 0.25 + 0.3 * Math.sin(Game.rt * 1.3 + st.tw) * Math.sin(Game.rt * 0.7 + st.tw * 2) + st.z * 0.6;
    ctx.drawImage(glowSprite(st.ci, 16), x - s, y - s, s * 2, s * 2);
  }
  ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawArena(ctx) {
  const lw = 2.2 * R.rs / cam.zoom;
  ctx.lineWidth = lw;
  const ac = Theme.c.arena;
  if (World.wrap) {
    ctx.setLineDash([14, 14]); ctx.strokeStyle = rgba(ac, 0.45);
    for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) ctx.strokeRect(ox, oy, W, H);
    ctx.setLineDash([]);
    return;
  }
  ctx.strokeStyle = rgba(ac, 0.75);
  ctx.strokeRect(0, 0, W, H);
  // corner brackets
  ctx.strokeStyle = 'rgba(236,231,255,0.8)'; ctx.lineWidth = lw * 1.8;
  const c = 60;
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]]) { ctx.moveTo(x + sx * c, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * c); }
  ctx.stroke();
  if (Anom.active('gravity')) { ctx.strokeStyle = 'rgba(255,186,72,.9)'; ctx.lineWidth = lw * 3; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.stroke(); }
  // axis ticks every 100 units: the box has a ruler
  ctx.strokeStyle = rgba(ac, 0.5); ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  for (let x = 100; x < W; x += 100) { const l = x % 500 ? 8 : 18; ctx.moveTo(x, 0); ctx.lineTo(x, l); ctx.moveTo(x, H); ctx.lineTo(x, H - l); }
  for (let y = 100; y < H; y += 100) { const l = y % 500 ? 8 : 18; ctx.moveTo(0, y); ctx.lineTo(l, y); ctx.moveTo(W, y); ctx.lineTo(W - l, y); }
  ctx.stroke();
}

function drawSpawns(ctx) {
  for (const s of Game.spawns) {
    const f = clamp((s.t - s.delay) / s.dur, 0, 1); if (s.t < s.delay) continue;
    const x = ix(s.x), y = iy(s.y), r = lerp(46, 10, easeInCubic(f));
    ctx.strokeStyle = rgba(COL.white, 0.25 + 0.6 * f); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.beginPath();
    for (let k = 0; k < 4; k++) { const a = k * PI / 2 + f * 3; ctx.moveTo(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4)); ctx.lineTo(x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12)); }
    ctx.stroke();
  }
}

const PICKUP_GLYPH = { H: 'Ĥ⁺', T: 'T', F: 'mK', E: '∅', S: 'π', C: '+1' };
function drawPickupGlyph(ctx, kind, x, y, t) {
  if (kind === 'cool') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8);
    ctx.strokeStyle = PAL_CSS[PI_.ice]; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); const bx = Math.cos(a) * 6, by = Math.sin(a) * 6; ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 0.9) * 4, by + Math.sin(a + 0.9) * 4); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a - 0.9) * 4, by + Math.sin(a - 0.9) * 4); }
    ctx.stroke(); ctx.restore();
    return;
  }
  const s = 15 + Math.sin(t * 6) * 1.5;
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(softSprite(PI_.gold, 64), x - 32, y - 32, 64, 64); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(21,17,40,.92)'; ctx.strokeStyle = PAL_CSS[PI_.gold]; ctx.lineWidth = 2;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - s, y - s, s * 2, s * 2, 6); else ctx.rect(x - s, y - s, s * 2, s * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL_CSS[PI_.gold]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = fontSerif(kind === 'F' || kind === 'C' ? 15 : 19, 700, kind !== 'F' && kind !== 'C');
  ctx.fillText(PICKUP_GLYPH[kind] || '?', x, y + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawPickups(ctx) {
  const t = Game.rt;
  for (const p of Game.pickups) {
    if (p.life - p.t < 2 && Math.sin(t * 24) > 0) continue;
    drawPickupGlyph(ctx, p.kind, ix(p.x), iy(p.y), t);
  }
}

function drawEnemies(ctx, vr) {
  const unc = Anom.on.uncertainty, sl = Anom.on.slowlight;
  const t = Game.rt;
  for (const T of Game.triads) drawTriad(T, ctx);
  for (const e of Game.enemies) {
    if (e.dead) continue;
    if (e.boss) {
      e.bossDef.draw(e, ctx);
      const multi = e.bodies || e.bossDef.iconDraw && (e.type === 'slit' || e.type === 'apparatus' || e.type === 'maxwell');
      if (e.flash > 0 && !multi) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(softSprite(PI_.white, 128), e.x - e.r * 1.4, e.y - e.r * 1.4, e.r * 2.8, e.r * 2.8); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      continue;
    }
    let x = ix(e.x), y = iy(e.y);
    if (sl) { // slow light: draw where the light left it; a faint outline marks the truth
      ctx.strokeStyle = 'rgba(236,231,255,.18)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(x, y, e.r + 3, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      const p = ANOMS.slowlight.seen(sl, e); if (!p) continue;
      x = ix(p[0]); y = iy(p[1]);
    }
    if (x < vr.x0 - 140 || x > vr.x1 + 140 || y < vr.y0 - 140 || y > vr.y1 + 140) continue;
    if (e.sp) {
      const K = e.sp.length;
      for (const p of e.sp) {
        ctx.globalAlpha = 0.55; e.def.draw(e, ctx, x + p.dx, y + p.dy);
        ctx.globalAlpha = 0.8; ctx.font = fontSerif(11); ctx.fillStyle = PAL_CSS[PI_.chalk]; ctx.textAlign = 'center'; ctx.fillText('1/' + K, x + p.dx, y + p.dy - e.r - 8);
      }
      ctx.globalAlpha = 1;
    } else if (unc && unc.dx > 6) {
      const s = unc.dx;
      const seed = e.id * 7.13 + Math.floor(t * 10);
      for (let k = 0; k < 4; k++) {
        const ox = k === 0 ? 0 : (Math.sin(seed * (k + 1) * 12.9898) * 43758.5453 % 1) * s * 1.6;
        const oy = k === 0 ? 0 : (Math.sin(seed * (k + 3) * 78.233) * 12543.123 % 1) * s * 1.6;
        ctx.globalAlpha = 0.32; e.def.draw(e, ctx, x + ox, y + oy);
      }
      ctx.globalAlpha = 1;
    } else e.def.draw(e, ctx, x, y);
    if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, e.flash * 14); ctx.drawImage(glowSprite(PI_.white, 64), x - e.r * 1.6, y - e.r * 1.6, e.r * 3.2, e.r * 3.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    if (e.frozen) { ctx.strokeStyle = 'rgba(76,242,255,.75)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(x, y, e.r + 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    if (e.zombie) { ctx.strokeStyle = 'rgba(96,255,156,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x + (Math.random() - 0.5) * 3, y, e.r + 4, 0, TAU); ctx.stroke(); }
    if (e.heavy) { ctx.strokeStyle = 'rgba(255,232,110,.75)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, e.r + 5, 0, TAU); ctx.stroke(); }
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
    const f = s.t / s.dur, a = f < 0.1 ? f / 0.1 : f > 0.85 ? (1 - f) / 0.15 : 1;
    const [sx, sy] = worldToCss(ix(s.x), iy(s.y));
    const x = sx, y = sy - 34 * Math.max(0.8, cam.zoom / R.rs);
    ctx.font = fontSerif(15); const w = ctx.measureText(s.text).width + 18;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(244,240,255,.95)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - w / 2, y - 14, w, 26, 9); else ctx.rect(x - w / 2, y - 14, w, 26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 6, y + 11); ctx.lineTo(x + 2, y + 21); ctx.lineTo(x + 6, y + 11); ctx.fill();
    ctx.fillStyle = '#1e1838'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.text, x, y);
  }
  ctx.globalAlpha = 1;
}

function buildPost() {
  const P = Game.post;
  const out = { time: Game.rt, thresh: 0.3, bloom: 1.35, ca: 0.0012 + P.ca, glitch: P.glitch, pixel: 0, posterize: 0, invert: P.invert, vignette: 0.6, grain: 0.03, scan: 0.035, sat: 1, rewind: P.rewind, flash: P.flash, lenses: [], ripples: [] };
  for (const r of P.ripples) { const [sx, sy] = worldToScene(ix(r.x), iy(r.y)); out.ripples.push({ x: sx, y: sy, r: r.r * cam.zoom, a: r.a * (1 - r.t / r.life) }); }
  Anom.post(out);
  for (const e of Game.dark) { const [sx, sy] = worldToScene(ix(e.x), iy(e.y)); out.lenses.push({ x: sx, y: sy, e: 34 * cam.zoom, hz: 0 }); }
  const fx = Settings.fx ?? 1;
  out.bloom *= 0.35 + 0.65 * fx; out.ca *= fx; out.grain *= fx; out.scan *= fx; out.vignette *= 0.5 + 0.5 * fx;
  if (!Settings.flashes) { out.flash = [P.flash[0], P.flash[1], P.flash[2], Math.min(0.18, P.flash[3])]; out.glitch = Math.min(out.glitch, 0.2); out.invert = Math.min(out.invert, 0.25); }
  if (Player.meas && Player.meas.kind !== 'region') out.sat = 0.7;
  if (Game.state === 'over' || Game.dyingT > 0) out.sat = 0.35;
  else if (Game.state === 'paused') out.sat = 0.45;
  if (Game.state === 'title') { out.vignette = 0.9; }
  return out;
}

Game.render = function () {
  const ctx = R.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = Theme.bgCss; ctx.fillRect(0, 0, R.sw, R.sh);
  drawBackdrop(ctx);
  camApply(ctx);
  const vr = viewRect(60);
  const planck = Anom.planck();
  if (World.wrap) {
    for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
      if (vr.x1 < ox || vr.x0 > ox + W || vr.y1 < oy || vr.y0 > oy + H) continue;
      ctx.translate(ox, oy);
      Grid.draw(ctx, { x0: vr.x0 - ox, y0: vr.y0 - oy, x1: vr.x1 - ox, y1: vr.y1 - oy });
      ctx.translate(-ox, -oy);
    }
  } else Grid.draw(ctx, vr);
  drawArena(ctx);
  Anom.drawUnder(ctx);
  drawPickups(ctx);
  drawSpawns(ctx);
  Bullets.drawPlayer(ctx, vr, planck);
  drawEnemies(ctx, vr);
  FX.draw(ctx, vr, planck);
  Player.draw(ctx);
  Bullets.drawEnemy(ctx, vr, planck);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (R.post) R.post.render(R.scene, buildPost());
  else {
    const f = Game.post.flash; if (f[3] > 0) { ctx.fillStyle = `rgba(${f[0] * 255 | 0},${f[1] * 255 | 0},${f[2] * 255 | 0},${f[3] * 0.6})`; ctx.fillRect(0, 0, R.sw, R.sh); }
  }
  drawHUD();
};

// ---------- HUD ----------
const waveLabel = d => Game.variant === 'endless' ? 'ENDLESS · WAVE ' + d.n : Game.variant === 'rush' ? 'BOSS RUSH · ' + ((d.n - 1) % 9 + 1) + ' OF 9' : 'CH. ' + ROMAN[d.chapter || 1] + ' · WAVE ' + d.n + ' OF ' + CAMPAIGN.length;
function drawHUD() {
  const c = R.hctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, R.hw, R.hh);
  c.setTransform(R.hs, 0, 0, R.hs, 0, 0);
  const Wc = R.cssW, Hc = R.cssH, I = R.insets;
  const L = Math.max(16, I.l + 8), Rr = Wc - Math.max(16, I.r + 8), T = Math.max(14, I.t + 8), B = Hc - Math.max(14, I.b + 8);
  // world-anchored text first (crisp, under the HUD chrome)
  FX.drawTexts(c);
  drawSpeech(c);
  if (Game.state === 'title') { drawTouch(c); return; }
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const narrow = Wc < 640, short = !narrow && Hc < 520;
  const touchUI = document.body.classList.contains('touchplay');
  const RrTop = touchUI && !narrow ? Rr - 54 : Rr; // the touch pause button owns the top-right corner

  // score
  setLS(c, 1.8); c.font = fontMono(10, 500); c.fillStyle = '#9a93c4'; c.fillText('SCORE', L, T + 10);
  setLS(c, 0); c.font = fontMono(narrow || short ? 20 : 26, 700); c.fillStyle = '#ece7ff';
  const sc = fmtInt(Game.score); c.fillText(sc, L, T + (narrow || short ? 34 : 40));
  const sw = c.measureText(sc).width;
  c.font = fontMono(narrow || short ? 12 : 15, 600); c.fillStyle = '#ffcf4a'; c.fillText('×' + Game.mult.toFixed(2), L + sw + 10, T + (narrow || short ? 34 : 40));
  if (Game.mode === 'lab') { c.font = fontSerif(14); c.fillStyle = '#9a93c4'; c.fillText('Laboratory · infinite lives', L, T + (narrow || short ? 54 : 62)); }
  else if (Game.mode === 'arcade' && !narrow) {
    setLS(c, 1.4); c.font = fontMono(9.5, 600); c.fillStyle = PAL_CSS[PI_[DIFFS[Game.diffId].col]];
    c.fillText(DIFFS[Game.diffId].name.toUpperCase() + (Game.variant === 'endless' ? ' · ENDLESS' : Game.variant === 'rush' ? ' · BOSS RUSH' : ''), L, T + (short ? 52 : 60)); setLS(c, 0);
  }

  // lives: top-right on wide screens, a second row on phones
  if (Game.mode === 'arcade') {
    const n = Game.lives, show = Math.min(9, Math.max(n, 0)), s = narrow ? 13 : short ? 15 : 19;
    for (let k = 0; k < 9; k++) {
      const alive = k < show;
      const x = narrow ? L + k * (s + 2) : RrTop - (k + 1) * (s + 3) + 3, y = narrow ? T + 44 : T;
      c.globalAlpha = alive ? 1 : 0.28;
      c.drawImage(catSprite(alive ? 0 : PI_.dim, alive ? 0 : 2), x, y, s, s);
    }
    c.globalAlpha = 1;
    if (n > 9) { c.font = fontMono(11, 600); c.fillStyle = '#ece7ff'; if (narrow) c.fillText('+' + (n - 9), L + 9 * (s + 2) + 4, T + 44 + s - 2); else { c.textAlign = 'right'; c.fillText('+' + (n - 9), RrTop - 9 * (s + 3) - 6, T + s - 3); } }
    if (!narrow && !short) {
      c.textAlign = 'right'; setLS(c, 1.2); c.font = fontMono(9.5, 500); c.fillStyle = '#9a93c4';
      c.fillText(Game.stats.survived + ' MEASUREMENTS SURVIVED', RrTop, T + s + 16); setLS(c, 0);
    }
    c.textAlign = 'left';
  }

  // wave label: top centre (wide) or right-aligned under the pause button (phones)
  const d = Director.def;
  const boss = Game.boss && !Game.boss.dead ? Game.boss : null;
  if (d && Game.mode === 'arcade' && !Game.card) {
    if (narrow) {
      c.textAlign = 'right'; setLS(c, 1.6); c.font = fontMono(10, 600); c.fillStyle = '#ffcf4a';
      c.fillText(waveLabel(d), Rr, T + 66); setLS(c, 0);
      if (!d.boss) { c.font = fontSerif(13.5); c.fillStyle = '#ece7ff'; const nm = wrapText(c, d.name, Wc * 0.55); nm.forEach((l, i) => c.fillText(l, Rr, T + 84 + i * 16)); }
    } else {
      c.textAlign = 'center'; setLS(c, 2); c.font = fontMono(10.5, 600); c.fillStyle = '#ffcf4a';
      c.fillText(waveLabel(d), Wc / 2, T + 10); setLS(c, 0);
      if (!d.boss) { c.font = fontSerif(short ? 15 : 17); c.fillStyle = '#ece7ff'; c.fillText(d.name, Wc / 2, T + (short ? 29 : 32)); }
    }
    c.textAlign = 'left';
  }
  if (Game.mode === 'lab' && !boss) {
    const ids = Anom.ids(); c.textAlign = narrow ? 'left' : 'center'; c.font = fontSerif(narrow ? 13 : 15); c.fillStyle = '#ece7ff';
    const label = ids.length ? ids.map(a => ANOMS[a].name).join(' + ') : 'All laws in force';
    if (narrow) wrapText(c, label, Wc - 2 * L - 60).forEach((l, i) => c.fillText(l, L, T + 78 + i * 16));
    else c.fillText(label, Wc / 2 - 120, T + 22);
    c.textAlign = 'left';
  }

  // boss bar
  const bossY = narrow ? T + 122 : T + 48;
  let readY = narrow ? T + 140 : short ? T + 52 : T + 58;
  if (boss && Director.phase !== 'bossIntro') {
    const bw = Math.min(560, Wc - 2 * L - (narrow ? 0 : 260)), bx = Wc / 2 - bw / 2, by = bossY;
    c.textAlign = 'center'; c.font = fontSerif(narrow ? 16 : 20, 700); c.fillStyle = '#ece7ff'; c.fillText(boss.bossDef.name, Wc / 2, by - 8);
    c.fillStyle = 'rgba(236,231,255,.12)'; c.fillRect(bx, by, bw, 7);
    const f = clamp(boss.hp / boss.maxHp, 0, 1);
    const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#ff3fb4'); g.addColorStop(0.5, '#ffcf4a'); g.addColorStop(1, '#4cf2ff');
    c.fillStyle = g; c.fillRect(bx, by, bw * f, 7);
    c.fillStyle = '#0c0a18'; for (const tk of [0.5, 0.25]) c.fillRect(bx + bw * tk - 1, by - 2, 2, 11);
    let subOn = false;
    if (Game.bossSub) { Game.bossSub.t += Game.realDt; const a = clamp(3 - Game.bossSub.t, 0, 1); if (a > 0) { subOn = true; c.globalAlpha = a; c.font = fontSerif(narrow ? 13.5 : 15); c.fillStyle = '#9a93c4'; c.fillText(Game.bossSub.text, Wc / 2, by + 26); c.globalAlpha = 1; } }
    c.textAlign = 'left';
    readY = by + (subOn ? 48 : 30);
  }
  // what the suspended law does, in plain words
  if (Game.mode === 'arcade' && d && !Game.card && Director.how) {
    const ht = Game.howT || 0, fade = clamp(13 - ht, 0, 1);
    const keep = !narrow && !short && !boss; // wide screens keep it, dimmed
    const alpha = keep ? 0.5 + 0.5 * fade : fade;
    if (alpha > 0.01) {
      const w = boss ? Math.min(560, Wc - 2 * L) : narrow ? Wc - 2 * L : short ? Math.min(520, Wc - 2 * (L + 210)) : Wc >= 1100 ? 560 : Math.min(620, Wc - 2 * L);
      const y0 = boss ? readY : narrow ? T + 132 : short ? T + 48 : (Wc >= 1100 ? T + 54 : T + 72);
      c.font = fontSerif(narrow || short ? 13 : 14); c.textAlign = 'center';
      const lines = wrapText(c, Director.how, w);
      if (fade > 0.01 || keep) {
        c.globalAlpha = alpha * 0.85; c.fillStyle = 'rgba(12,10,24,.55)';
        const bh = lines.length * 17 + 8; c.fillRect(Wc / 2 - w / 2 - 8, y0 - 14, w + 16, bh);
        c.globalAlpha = alpha; c.fillStyle = '#d4ccf2';
        lines.forEach((l, i) => c.fillText(l, Wc / 2, y0 + i * 17));
        c.globalAlpha = 1;
        readY = y0 + lines.length * 17 + 18;
      }
      c.textAlign = 'left';
    }
  }
  // anomaly readouts (γ, Δx·Δp, gate countdown), then the boss's own instruments
  Anom.hud(c, Wc / 2, readY);
  if (boss && boss.bossDef.hud && Director.phase !== 'bossIntro' && !short) boss.bossDef.hud(boss, c, Wc / 2, readY + Anom.ids().filter(id => ANOMS[id].hud).length * 24 + (narrow ? 4 : 0));

  // wavefunction panel (bottom-left)
  drawPsiPanel(c, L, B, narrow, short);

  // off-screen arrows
  if (Game.state === 'playing') drawOffscreen(c, Wc, Hc);

  // first-touch control overlay
  if (touchUI && Game.touchHintT > 0 && Game.state === 'playing' && !Game.card) drawTouchHint(c, Wc, Hc, L, Rr, T, B, short);

  // measurement overlay
  if (Player.meas) drawMeasurement(c, Wc, Hc, T);

  // banners & card
  for (const bn of Game.banners) drawBanner(c, bn, Wc, Hc);
  if (Game.card) drawCard(c, Game.card, Wc, Hc);

  if (Player.dead && Game.state === 'playing' && Game.dyingT <= 0 && Game.mode !== 'attract') {
    c.textAlign = 'center'; setLS(c, 2.5); c.font = fontMono(12, 600); c.fillStyle = '#ece7ff';
    c.fillText('RE-ENTERING SUPERPOSITION…', Wc / 2, Hc * 0.62); setLS(c, 0); c.textAlign = 'left';
  }
  // reticle
  if (Game.state === 'playing' && Input.mouse.has && !Input.touchMode && !Settings.autoAim) drawReticle(c, Input.mouse.x, Input.mouse.y);
  drawTouch(c);
  if (Game.showFps || Settings.fps) { c.font = fontMono(10); c.fillStyle = '#9a93c4'; c.textAlign = 'right'; c.fillText((1000 / R.frameMs).toFixed(0) + ' fps · ' + R.sw + '×' + R.sh + ' · ' + Bullets.en + '/' + Bullets.pn + ' · ' + FX.n, Rr, B); c.textAlign = 'left'; }
}

function drawTouchHint(c, Wc, Hc, L, Rr, T, B, short) {
  const a = clamp(Game.touchHintT, 0, 1);
  const top = short ? Hc * 0.28 : Hc * 0.36, bot = short ? Hc * 0.74 : Hc * 0.72;
  const zone = (x0, x1, title, sub) => {
    c.globalAlpha = a * 0.9;
    c.fillStyle = 'rgba(12,10,24,.35)'; c.fillRect(x0, top, x1 - x0, bot - top);
    c.setLineDash([6, 8]); c.strokeStyle = 'rgba(236,231,255,.45)'; c.lineWidth = 1.5; c.strokeRect(x0 + 0.5, top + 0.5, x1 - x0 - 1, bot - top - 1); c.setLineDash([]);
    c.textAlign = 'center'; setLS(c, 1.6); c.font = fontMono(11.5, 700); c.fillStyle = '#ece7ff';
    const lines = wrapText(c, title, x1 - x0 - 20); lines.forEach((l, i) => c.fillText(l, (x0 + x1) / 2, (top + bot) / 2 - 6 + i * 16));
    setLS(c, 0); c.font = fontSerif(13); c.fillStyle = '#b9b1de';
    wrapText(c, sub, x1 - x0 - 20).forEach((l, i) => c.fillText(l, (x0 + x1) / 2, (top + bot) / 2 + 14 + lines.length * 16 - 16 + i * 16));
  };
  zone(L, Wc / 2 - 8, 'DRAG HERE TO MOVE', 'Your thumb is the joystick.');
  zone(Wc / 2 + 8, Rr, 'TAP TO SPLIT', 'Drag to aim by hand. Let go and it aims for you.');
  c.globalAlpha = 1; c.textAlign = 'left';
}

function drawPsiPanel(c, L, B, narrow, short) {
  if (Game.mode === 'attract') return;
  const P = Player;
  const pw = narrow ? (Input.touchMode ? 150 : 180) : short ? 210 : 236, ph = short ? 68 : 96, x = L, y = B - ph;
  c.fillStyle = 'rgba(12,10,24,.55)'; c.fillRect(x - 8, y - 6, pw + 16, ph + 12);
  c.strokeStyle = 'rgba(58,49,102,.9)'; c.lineWidth = 1; c.strokeRect(x - 8 + 0.5, y - 6 + 0.5, pw + 15, ph + 11);
  c.textAlign = 'left';
  c.font = fontSerif(19); c.fillStyle = '#ece7ff'; c.fillText('|ψ⟩', x, y + 16);
  c.font = fontMono(10.5, 500); c.fillStyle = '#9a93c4';
  const n = P.dead ? 0 : P.n;
  c.fillText(P.dead ? (short ? '|dead⟩' : 'collapsed to |dead⟩') : n === 1 ? (short ? '1 cat' : '1 cat · classical') : short ? n + ' cats' : n + ' cats · ' + P.nq + ' qubit' + (P.nq > 1 ? 's' : ''), x + 34, y + 15);
  // histogram over all 2^nq basis states
  const slots = P.dead ? 1 : Math.pow(2, P.nq);
  const hx = x, hy = y + (short ? 21 : 24), hw = pw, hh = short ? 16 : 30;
  const gap = slots > 16 ? 1 : 2, bw = (hw - gap * (slots - 1)) / slots;
  let maxA = 0; for (const br of P.branches) maxA = Math.max(maxA, Math.hypot(br.re, br.im));
  const byBits = new Map(); for (const br of P.branches) byBits.set(br.bits, br);
  for (let k = 0; k < slots; k++) {
    const br = byBits.get(k); const bx = hx + k * (bw + gap);
    if (!br || P.dead) { c.fillStyle = 'rgba(236,231,255,.08)'; c.fillRect(bx, hy + hh - 2, bw, 2); continue; }
    const a = Math.hypot(br.re, br.im) / (maxA || 1); const h = Math.max(2, hh * a);
    c.fillStyle = PAL_CSS[phaseIndex(P.phase(br))]; c.fillRect(bx, hy + hh - h, bw, h);
  }
  // fatality odds
  c.font = fontSerif(13.5); c.fillStyle = '#d9d3f3';
  const pd = P.dead ? 1 : 1 / P.n;
  const pdText = P.dead ? 'P(dead) = 1' : 'P(dead | hit) = ' + (P.n === 1 ? '1' : fmtFrac(pd));
  if (short) { c.textAlign = 'right'; c.fillText(pdText, hx + hw, y + 15); c.textAlign = 'left'; }
  else c.fillText(pdText, hx, hy + hh + 17);
  // coherence
  const cy = y + ph - 8;
  const f = clamp(P.coh / CFG.coh.max, 0, 1);
  const flash = Game.cohFlash > 0 && Math.sin(Game.rt * 40) > 0;
  c.fillStyle = 'rgba(236,231,255,.12)'; c.fillRect(hx, cy, hw, 5);
  c.fillStyle = flash ? '#ff3b55' : f > 0.5 ? '#4cf2ff' : f > 0.22 ? '#ffcf4a' : '#ff3b55';
  c.fillRect(hx, cy, hw * f, 5);
  if (P.fridge > 0) { c.fillStyle = 'rgba(140,212,255,.6)'; c.fillRect(hx, cy - 1, hw, 7); }
  setLS(c, 1.4); c.font = fontMono(9, 600); c.fillStyle = '#9a93c4'; c.fillText('COHERENCE', hx, cy - 4); setLS(c, 0);
  c.textAlign = 'right'; c.font = fontMono(10, 500); c.fillStyle = '#ece7ff';
  const t2 = P.drain > 0 ? P.coh / P.drain : 0;
  c.fillText(P.fridge > 0 ? '15 mK · ' + (P.fridge > 1e6 ? '∞' : P.fridge.toFixed(0) + 's') : P.nq > 0 ? 'T₂ ≈ ' + t2.toFixed(1) + ' s' : P.coh < CFG.coh.max ? 'cooling' : 'ready', hx + hw, cy - 4);
  c.textAlign = 'left';
  // power-ups (and insurance left)
  let py = y - 16;
  if (Mods.immortal > 0 && Game.mode === 'arcade') { c.font = fontMono(10.5, 600); c.fillStyle = '#ffcf4a'; c.fillText('∞ quantum immortality × ' + Mods.immortal, x, py); py -= 16; }
  for (const [k, lab, col] of [['boost', 'Ĥ⁺ 5th qubit', '#ffcf4a'], ['pierce', 'T gate · piercing', '#ffcf4a'], ['echo', 'π spin echo · half speed', '#8cd4ff']]) {
    if (P[k] > 0) { c.font = fontMono(10.5, 600); c.fillStyle = col; c.fillText(lab + ' · ' + (P[k] > 1e6 ? '∞' : P[k].toFixed(0) + 's'), x, py); py -= 16; }
  }
}

function drawOffscreen(c, Wc, Hc) {
  const m = 22;
  for (const e of Game.enemies) {
    if (e.dead || e.hideArrow) continue;
    const [sx, sy] = worldToCss(ix(e.x), iy(e.y));
    if (sx > -10 && sx < Wc + 10 && sy > -10 && sy < Hc + 10) continue;
    const cx = Wc / 2, cy = Hc / 2, dx = sx - cx, dy = sy - cy;
    const k = Math.min((Wc / 2 - m) / Math.abs(dx || 1e-6), (Hc / 2 - m) / Math.abs(dy || 1e-6));
    const x = cx + dx * k, y = cy + dy * k, a = Math.atan2(dy, dx), s = e.boss ? 13 : 6;
    c.save(); c.translate(x, y); c.rotate(a);
    c.globalAlpha = e.boss ? 0.95 : 0.6; c.fillStyle = PAL_CSS[e.col];
    c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.8, -s * 0.7); c.lineTo(-s * 0.8, s * 0.7); c.closePath(); c.fill();
    c.restore();
  }
  c.globalAlpha = 1;
}

function drawMeasurement(c, Wc, Hc, T = 14) {
  const m = Player.meas; const t = m.t, f = clamp(t / m.dur, 0, 1);
  if (m.u === undefined) {
    if (m.kind === 'full') { m.k = randi(0, m.n - 1); m.u = (m.k + rand(0.25, 0.75)) / m.n; }
    else { const p = m.p; m.u = m.out ? 1 - p + p * rand(0.2, 0.8) : (1 - p) * rand(0.15, 0.85); }
  }
  const settle = 0.55;
  const k = clamp(t / (m.dur * settle), 0, 1);
  const osc = Math.cos(k * PI * 5.5) * (1 - easeOutCubic(k));
  let u = clamp(m.u + osc * 0.45, 0, 1);
  const a = f < 0.08 ? f / 0.08 : f > 0.86 ? (1 - f) / 0.14 : 1;
  const bw = Math.min(460, Wc - 64), bh = 14, x = Wc / 2 - bw / 2, y = Math.max(Hc * 0.24, T + 72);
  c.globalAlpha = a;
  c.fillStyle = 'rgba(12,10,24,.78)'; c.fillRect(x - 14, y - 34, bw + 28, bh + 74);
  c.strokeStyle = 'rgba(58,49,102,1)'; c.strokeRect(x - 14 + 0.5, y - 34 + 0.5, bw + 27, bh + 73);
  c.textAlign = 'center'; setLS(c, 2.2); c.font = fontMono(10.5, 600); c.fillStyle = '#9a93c4';
  c.fillText(m.kind === 'hit' ? 'MEASUREMENT · IS THE CAT HIT?' : m.kind === 'region' ? 'MEASUREMENT · OBSERVED' : 'DECOHERENCE · POSITION MEASURED', Wc / 2, y - 14);
  setLS(c, 0);
  if (m.kind === 'full') {
    for (let i = 0; i < m.n; i++) { c.fillStyle = PAL_CSS[Math.floor(i / m.n * PHASE_N) % PHASE_N]; c.fillRect(x + i * bw / m.n + 0.5, y, bw / m.n - 1, bh); }
  } else {
    const p = m.p, w0 = bw * (1 - p);
    c.fillStyle = '#4cf2ff'; c.fillRect(x, y, w0, bh);
    c.fillStyle = m.kind === 'hit' ? '#ff3b55' : '#ffcf4a'; c.fillRect(x + w0, y, bw - w0, bh);
    c.font = fontMono(10.5, 700); c.fillStyle = '#0c0a18';
    if (w0 > 90) { c.textAlign = 'left'; c.fillText(m.labelNo + ' ' + fmtFrac(1 - p), x + 6, y + 11); }
    if (bw - w0 > 70) { c.textAlign = 'right'; c.fillText(m.labelYes + ' ' + fmtFrac(p), x + bw - 6, y + 11); }
  }
  // needle
  const nx = x + u * bw;
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(nx, y - 2); c.lineTo(nx - 7, y - 11); c.lineTo(nx + 7, y - 11); c.closePath(); c.fill();
  c.fillRect(nx - 1, y - 2, 2, bh + 6);
  // verdict
  if (k >= 1) {
    c.textAlign = 'center'; c.font = fontSerif(24, 700);
    let txt, col;
    if (m.kind === 'hit') { txt = m.out ? 'DEAD' : 'ALIVE'; col = m.out ? '#ff3b55' : '#4cf2ff'; }
    else if (m.kind === 'region') { txt = m.out ? 'Found ' + (m.labelYes || '').toLowerCase() : 'Not ' + (m.labelYes || '').toLowerCase(); col = '#ffcf4a'; }
    else { txt = 'Collapsed to one cat'; col = PAL_CSS[m.ci] || '#ece7ff'; }
    c.fillStyle = col; c.fillText(txt, Wc / 2, y + bh + 30);
  }
  c.globalAlpha = 1; c.textAlign = 'left';
}

function drawBanner(c, bn, Wc, Hc) {
  const f = bn.t / bn.dur; const a = f < 0.12 ? f / 0.12 : f > 0.8 ? (1 - f) / 0.2 : 1;
  const y = Hc * 0.4 + (1 - easeOutCubic(Math.min(1, f / 0.12))) * 12;
  c.globalAlpha = a; c.textAlign = 'center';
  setLS(c, 4); c.font = fontMono(Wc < 640 ? 20 : 30, 700); c.fillStyle = '#ece7ff';
  c.shadowColor = 'rgba(76,242,255,.6)'; c.shadowBlur = 18;
  c.fillText(bn.title, Wc / 2, y); c.shadowBlur = 0; setLS(c, 0);
  if (bn.sub) { c.font = fontSerif(Wc < 640 ? 15 : 18); c.fillStyle = '#c8c1ea'; const lines = wrapText(c, bn.sub, Math.min(620, Wc - 40)); lines.forEach((l, i) => c.fillText(l, Wc / 2, y + 30 + i * 22)); }
  c.globalAlpha = 1; c.textAlign = 'left';
}

function drawCard(c, cd, Wc, Hc) {
  const f = cd.t / cd.dur; const a = f < 0.1 ? f / 0.1 : f > 0.82 ? (1 - f) / 0.18 : 1;
  const narrow = Wc < 640, short = Hc < 520;
  const y = short ? Hc * 0.2 : Hc * 0.3;
  c.globalAlpha = a; c.textAlign = 'center';
  setLS(c, 5); c.font = fontMono(narrow ? 11 : 13, 700); c.fillStyle = cd.boss ? '#ff3fb4' : '#ffcf4a';
  const tagLines = wrapText(c, (cd.tag || 'WAVE ' + cd.n) + (cd.boss ? ' · SOMETHING LARGE' : ''), Wc - 40);
  tagLines.forEach((l, i) => c.fillText(l, Wc / 2, y - (tagLines.length - 1 - i) * 16));
  setLS(c, 0);
  const size = Math.min(narrow ? 30 : 60, Wc / 15, Hc / 9);
  c.font = fontSerif(size, 700); c.fillStyle = '#ece7ff';
  c.shadowColor = cd.boss ? 'rgba(255,63,180,.55)' : 'rgba(76,242,255,.45)'; c.shadowBlur = 24;
  const nameLines = wrapText(c, cd.name, Wc - 48);
  nameLines.forEach((l, i) => c.fillText(l, Wc / 2, y + size + 6 + i * size * 1.05));
  c.shadowBlur = 0;
  let yy = y + size + 6 + (nameLines.length - 1) * size * 1.05;
  if (cd.eq) { c.font = fontSerif(narrow ? 16 : 21, 400, false); c.fillStyle = '#9a93c4'; const el = wrapText(c, cd.eq, Wc - 48); el.forEach((l, i) => c.fillText(l, Wc / 2, yy + 34 + i * 24)); yy += 34 + (el.length - 1) * 24; }
  if (cd.line) { c.font = fontSerif(narrow ? 15 : 17.5); c.fillStyle = '#d9d3f3'; const ll = wrapText(c, cd.line, Math.min(640, Wc - 48)); ll.forEach((l, i) => c.fillText(l, Wc / 2, yy + 32 + i * 23)); yy += 32 + (ll.length - 1) * 23; }
  if (cd.how && cd.how !== cd.line) {
    c.font = fontMono(narrow ? 11.5 : 12.5, 500); c.fillStyle = '#ece7ff';
    const hl = wrapText(c, cd.how, Math.min(600, Wc - 48));
    c.globalAlpha = a * 0.92; c.fillStyle = 'rgba(12,10,24,.6)'; c.fillRect(Wc / 2 - Math.min(600, Wc - 48) / 2 - 10, yy + 16, Math.min(600, Wc - 48) + 20, hl.length * 18 + 14);
    c.globalAlpha = a; c.fillStyle = '#ece7ff';
    hl.forEach((l, i) => c.fillText(l, Wc / 2, yy + 34 + i * 18));
  }
  c.globalAlpha = 1; c.textAlign = 'left';
}

function drawReticle(c, x, y) {
  const n = Player.n, r = 11, t = Game.rt;
  c.lineWidth = 2;
  for (let k = 0; k < n; k++) {
    const b = Player.branches[k]; if (!b) break;
    c.strokeStyle = PAL_CSS[phaseIndex(Player.phase(b))];
    const a0 = k / n * TAU + t, a1 = (k + 1) / n * TAU + t - (n > 1 ? 0.12 : 0);
    c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke();
  }
  c.strokeStyle = 'rgba(236,231,255,.9)'; c.lineWidth = 1.5;
  c.beginPath();
  for (let k = 0; k < 4; k++) { const a = k * PI / 2; c.moveTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); c.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 21); }
  c.stroke();
  c.fillStyle = '#fff'; c.fillRect(x - 1, y - 1, 2, 2);
}

function drawTouch(c) {
  for (const k of ['move', 'aim']) {
    const s = Input.sticks[k]; if (!s) continue;
    c.strokeStyle = 'rgba(236,231,255,.3)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(s.ox, s.oy, 58, 0, TAU); c.stroke();
    const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy), m = Math.min(d, 58);
    const kx = s.ox + (d ? dx / d * m : 0), ky = s.oy + (d ? dy / d * m : 0);
    c.fillStyle = k === 'aim' ? 'rgba(255,207,74,.45)' : 'rgba(76,242,255,.45)';
    c.beginPath(); c.arc(kx, ky, 24, 0, TAU); c.fill();
  }
}
