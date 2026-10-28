// ---------- world wrapping helpers ----------
const World = { wrap: false };
const wdx = dx => (World.wrap ? dx - W * Math.round(dx / W) : dx);
const wdy = dy => (World.wrap ? dy - H * Math.round(dy / H) : dy);
const wrapX = x => ((x % W) + W) % W;
const wrapY = y => ((y % H) + H) % H;
// image of a world point nearest the camera (for drawing in wrap mode)
const ix = x => (World.wrap ? cam.x + wdx(x - cam.x) : x);
const iy = y => (World.wrap ? cam.y + wdy(y - cam.y) : y);
// keep a body inside the arena (or the shrinking box); returns true if it touched a wall
function contain(b, m, bounce) {
  if (World.wrap) { b.x = wrapX(b.x); b.y = wrapY(b.y); return false; }
  const B = Game.box, x0 = (B ? B.x0 : 0) + m, x1 = (B ? B.x1 : W) - m, y0 = (B ? B.y0 : 0) + m, y1 = (B ? B.y1 : H) - m;
  let hit = false;
  if (b.x < x0) { b.x = x0; b.vx = bounce ? Math.abs(b.vx) : Math.max(0, b.vx); hit = true; }
  if (b.x > x1) { b.x = x1; b.vx = bounce ? -Math.abs(b.vx) : Math.min(0, b.vx); hit = true; }
  if (b.y < y0) { b.y = y0; b.vy = bounce ? Math.abs(b.vy) : Math.max(0, b.vy); hit = true; }
  if (b.y > y1) { b.y = y1; b.vy = bounce ? -Math.abs(b.vy) : Math.min(0, b.vy); hit = true; }
  return hit;
}

// ---------- the quantum cat ----------
// formation spread, cat size and 4D+ rotation planes per qubit count (up to eight qubits: 256 cats)
const SPREAD = [0, 40, 36, 33, 30, 27, 25, 23, 21];
const CATSCALE = [1, 1, 0.94, 0.86, 0.8, 0.72, 0.66, 0.6, 0.55];
const ROT_PLANES = [[], [], [[0, 1, 0.55]], [[0, 2, 0.7], [1, 2, 0.43]], [[0, 3, 0.55], [1, 2, 0.38], [2, 3, 0.29]], [[0, 3, 0.5], [1, 2, 0.36], [2, 4, 0.31], [3, 4, 0.47]]];
for (let n = 6; n <= 8; n++) ROT_PLANES.push([[0, n - 1, 0.5], ...Array.from({ length: n - 2 }, (_, k) => [k + 1, k + 2, 0.25 + 0.06 * k])]);
const SHAPES = { 4: ['A SQUARE OF CATS'], 8: ['A CUBE OF CATS'], 16: ['TESSERACT', 'You are now a four-dimensional hypercube of cats.', 'tesseract'], 32: ['PENTERACT', 'Five dimensions of cat. This was a mistake.', 'penteract'], 64: ['HEXERACT', 'Six dimensions. The box is getting crowded.', 'hexeract'], 128: ['HEPTERACT', 'Seven dimensions of cat. Physics has filed a complaint.', 'hepteract'], 256: ['OCTERACT', 'Two hundred and fifty-six cats. You are a crowd.', 'octeract'] };
const amp2 = b => b.re * b.re + b.im * b.im;
const V8 = new Float64Array(8);

const Player = {
  x: W / 2, y: H / 2, vx: 0, vy: 0, steer: [0, 0],
  aimA: 0, aimX: W / 2 + 100, aimY: H / 2, aimPoint: false,
  branches: [], nq: 0, rotT: 0, focusK: 0, focusing: false,
  coh: 100, cohDelay: 0, drain: 0,
  splitCd: 0, foldCd: 0, folding: 0, foldN: 0, foldTo: { x: 0, y: 0 }, perfect: false, lastPerfect: -99,
  invuln: 0, dead: false, respawnT: 0, danger: 0, dashT: 0, dashCd: 0, dashDir: [1, 0],
  boost: 0, boostQ: 0, pierce: 0, fridge: 0, echo: 0, kick: 0, still: 0, shield: false, shieldCd: 0, rerolls: 0,
  blinkT: 2, happyT: 0, ghosts: [], meas: null, name: 'Mittens',
  reset(x = W / 2, y = H / 2) {
    Object.assign(this, { dashT: 0, dashCd: 0, dashHold: null, sprinting: false, sprintK: 0, x, y, vx: 0, vy: 0, nq: 0, coh: CFG.coh.max, cohDelay: 0, splitCd: 0, foldCd: 0, folding: 0, invuln: 0, dead: false, respawnT: 0, boost: 0, boostQ: 0, pierce: 0, fridge: 0, echo: 0, kick: 0, still: 0, shield: false, shieldCd: 0, meas: null, happyT: 0, danger: 0 });
    this.branches = [this.mkBranch(0, 1, 0, this.name)]; this.ghosts = this.ghosts.filter(g => g.drone);
  },
  mkBranch(bits, re, im, name) { return { bits, re, im, ox: 0, oy: 0, tx: 0, ty: 0, depth: 0, sc: 1, px: this.x, py: this.y, fireT: Math.random() / CFG.player.fireRate, flash: 0, grace: 0, id: uid(), name: name || Flavour.name() }; },
  get n() { return this.branches.length; },
  maxQ() { return CFG.player.maxQubits + (this.boost > 0 ? this.boostQ : 0) - (Mods.school === 'mw' ? 1 : 0); },
  norm() { let s = 0; for (const b of this.branches) s += amp2(b); return s || 1; },
  prob(b) { return amp2(b) / this.norm(); },
  probOf(set) { const n = this.norm(); let p = 0; for (const b of set) p += amp2(b) / n; return clamp(p, 0, 1); },
  phase(b) { return Math.atan2(b.im, b.re); },
  ci(b) { return phaseIndex(this.phase(b)); },
  // cats inside a circle / on a beam (for every kind of hazard); cats still flying out after a split don't count
  near(x, y, r) { return this.dead ? [] : this.branches.filter(b => b.grace <= 0 && wdx(b.px - x) ** 2 + wdy(b.py - y) ** 2 < r * r); },
  onLine(x, y, a, L, hw) {
    if (this.dead) return [];
    const c = Math.cos(a), s = Math.sin(a), R = hw + CFG.player.hitR;
    return this.branches.filter(b => { if (b.grace > 0) return false; const dx = wdx(b.px - x), dy = wdy(b.py - y), t = dx * c + dy * s; return t >= 0 && t <= L && Math.abs(dx * s - dy * c) < R; });
  },
  protected() { return this.dead || this.invuln > 0 || this.folding > 0 || Game.god; },
  // measure the cats in a set, if any, unless protected
  hit(set, cause) { if (set.length && !this.protected()) { this.measureHit(set, cause); return true; } return false; },
  // expectation value ⟨x⟩: where classical things think you are
  expect() {
    const nrm = this.norm(); let ex = 0, ey = 0;
    for (const b of this.branches) { const p = amp2(b) / nrm; ex += p * wdx(b.px - this.x); ey += p * wdy(b.py - this.y); }
    return [this.x + ex, this.y + ey];
  },

  // ----- unitary operations -----
  split() {
    if (this.dead || this.folding > 0) return false;
    if (this.nq >= this.maxQ()) { Game.toastOnce('maxq', 'Maximum superposition. Fold to release it.'); return false; }
    if (this.splitCd > 0) return false;
    if (this.coh < CFG.coh.minToSplit * Mods.splitCost && this.fridge <= 0) { Game.flashCoh(); Audio2.sfx('deny'); return false; }
    const q = this.nq, ph = PI / Math.pow(2, q), c = Math.cos(ph), s = Math.sin(ph); // QFT-style phase per qubit spreads the colours
    const out = [], grace = CFG.player.splitGrace * Mods.grace;
    for (const b of this.branches) {
      const re1 = (b.re * c - b.im * s) * SQRT1_2, im1 = (b.re * s + b.im * c) * SQRT1_2;
      const a0 = this.mkBranch(b.bits, b.re * SQRT1_2, b.im * SQRT1_2, b.name), a1 = this.mkBranch(b.bits | (1 << q), re1, im1);
      for (const a of [a0, a1]) { Object.assign(a, { ox: b.ox, oy: b.oy, px: b.px, py: b.py, flash: 0.35, grace }); out.push(a); }
      if (this.branches.length < 64) FX.ring(b.px, b.py, 4, 46, 0.4, phaseIndex(Math.atan2(im1, re1)), 2.5);
      if (Mods.dense) Bullets.ringPlayer(b.px, b.py, 8, this.ci(a1));
    }
    this.branches = out; this.nq = q + 1;
    if (this.fridge <= 0) this.coh = Math.max(0, this.coh - CFG.coh.splitCost * Mods.splitCost);
    this.splitCd = 0.22 * Mods.splitCd;
    const st = Game.stats; st.splits++; Game.waveSplits++; st.maxBranches = Math.max(st.maxBranches, this.n);
    if (Game.mode === 'arcade') Game.toastOnce('hint-meas', 'Every cat fires. A bullet touching any cat is a measurement: with N cats you die with probability 1/N, otherwise you just lose that cat.');
    Grid.impulse(this.x, this.y, 260, 180);
    Audio2.sfx('split', Math.min(5, this.nq));
    const sh = SHAPES[this.n];
    if (sh && sh[2]) Ach.unlock(sh[2]);
    if (sh && Game.mode !== 'attract' && !st.shapes.has(this.n)) {
      st.shapes.add(this.n);
      if (this.n >= 16) { Game.banner(sh[0], sh[1], 1.8); Audio2.say(sh[0].charAt(0) + sh[0].slice(1).toLowerCase() + '.', 1); }
      else Feed.add(this.n + ' cats', 'gold', sh[0].toLowerCase());
    }
    addTrauma(0.08); Input.rumble(0.15, 60);
    return true;
  },
  // Sprint / dash. Pressing gives a small burst; keep holding and the cat sprints (faster, the opposite of focus) while coherence drains;
  // let go quickly and the burst becomes a bigger dash. No invulnerability either way. Coherence cost grows with the number of cats.
  dashCost(k = 1) { return CFG.dash.cost * (1 + CFG.dash.perQ * this.nq) * k * (this.nq ? 1 : 0.5); },
  dash() {
    if (this.dead || this.folding > 0 || this.dashCd > 0 || this.dashT > 0) return false;
    const D = CFG.dash, cost = this.dashCost(0.4);
    if (this.coh < cost && this.fridge <= 0) { Game.flashCoh(); Audio2.sfx('deny'); return false; }
    this.burst(D.dur, D.mul, cost);
    this.dashHold = { t: 0 };
    Game.stats.dashes = (Game.stats.dashes || 0) + 1;
    if (Game.mode === 'arcade') Game.toastOnce('hint-dash', 'Hold to sprint: faster, but it drains coherence (more with more cats). Tap for a quick dash. No invulnerability either way.');
    return true;
  },
  burst(dur, mul, cost) {
    let [mx, my] = this.steer || [0, 0], m = Math.hypot(mx, my);
    if (m < 0.2) { mx = Math.cos(this.aimA || 0); my = Math.sin(this.aimA || 0); m = 1; }
    this.dashDir = [mx / m, my / m]; this.dashT = dur; this.dashMul = mul;
    if (cost && this.fridge <= 0) { this.coh = Math.max(0, this.coh - cost); this.cohDelay = Math.max(this.cohDelay, CFG.coh.regenDelay); }
    for (const b of this.branches.length > 24 ? this.branches.slice(0, 24) : this.branches) FX.spawn(b.px, b.py, -this.dashDir[0] * 120, -this.dashDir[1] * 120, 0.3, 10, this.ci(b));
    Grid.wake(this.x, this.y, this.dashDir[0] * 14 * mul / 3, this.dashDir[1] * 14 * mul / 3, 120);
    Audio2.sfx('dash'); Input.rumble(0.2, 50);
  },
  // called every step with whether the button is still held
  sprintTick(held, dt) {
    const D = CFG.dash, h = this.dashHold;
    if (h) {
      h.t += dt;
      if (!held) { // a tap: the bigger dash
        this.dashHold = null;
        if (h.t < D.tapWin) { this.burst(D.tapDur, D.tapMul, this.dashCost(0.6)); this.dashCd = this.nq ? D.cd : D.soloCd; }
        else this.dashCd = 0.2;
      } else if (h.t >= D.tapWin) { this.dashHold = null; this.sprinting = true; Game.toastOnce('hint-sprint', 'Sprinting: the coherence bar drains while you hold it. Let go before it runs out.'); }
    }
    if (this.sprinting) {
      if (!held || this.dead || this.folding > 0) { this.sprinting = false; this.dashCd = 0.2; return; }
      if (this.fridge <= 0) {
        this.coh -= (this.nq ? D.drain * (1 + D.perQ * this.nq) : D.soloDrain) * dt; this.cohDelay = Math.max(this.cohDelay, 0.5);
        if (this.coh <= 0) { this.coh = 0; this.sprinting = false; this.dashCd = 0.6; Game.flashCoh(); Audio2.sfx('deny'); return; }
      }
      Game.stats.sprintT = (Game.stats.sprintT || 0) + dt;
      if (Math.random() < 0.5) { const b = pick(this.branches); FX.spawn(b.px, b.py, -this.vx * 0.3, -this.vy * 0.3, 0.25, 6, this.ci(b)); }
    }
  },
  // Fold: collapse onto the cat furthest in the direction you steer (or the middle), intangible while it happens.
  // Folding just before something would have hit you is a perfect fold.
  fold() {
    if (this.dead || this.nq === 0 || this.folding > 0 || this.foldCd > 0) return false;
    const [mx, my] = this.steer, m = Math.hypot(mx, my);
    let to = { x: 0, y: 0 };
    if (m > 0.3) {
      let best = -1e9; for (const b of this.branches) { const d = b.ox * mx + b.oy * my; if (d > best) { best = d; to = { x: b.ox, y: b.oy }; } }
      if (Mods.teleport) { to.x += mx / m * Mods.teleport; to.y += my / m * Mods.teleport; }
    }
    Object.assign(this, { folding: CFG.fold.dur, foldN: this.n, foldTo: to, perfect: this.threatened(), foldFrom: [this.x, this.y] });
    Audio2.sfx('foldStart');
    return true;
  },
  // is something about to hit one of the cats? (a bullet's closest approach within the perfect-fold window, or a body or ring right here)
  threatened() {
    const T = CFG.fold.perfectLook * Mods.perfectW, pad = CFG.fold.perfectPad * Mods.perfectW, hr = CFG.player.hitR;
    for (let i = 0; i < EB.n; i++) {
      if (EB.delay[i] > 0 || Math.abs(wdx(EB.x[i] - this.x)) > 400 || Math.abs(wdy(EB.y[i] - this.y)) > 400) continue;
      const vx = EB.vx[i] - this.vx, vy = EB.vy[i] - this.vy, v2 = vx * vx + vy * vy + 1e-6, R = EB.r[i] + hr + pad;
      for (const b of this.branches) {
        const dx = wdx(EB.x[i] - b.px), dy = wdy(EB.y[i] - b.py), t = clamp(-(dx * vx + dy * vy) / v2, 0, T);
        if ((dx + vx * t) ** 2 + (dy + vy * t) ** 2 < R * R) return true;
      }
    }
    for (const e of Game.enemies) if (!e.dead && !e.boss && !e.ghost && this.branches.some(b => wdx(b.px - e.x) ** 2 + wdy(b.py - e.y) ** 2 < (e.r + pad + 10) ** 2)) return true;
    return Holes.threat(this, pad) || !!(Game.boss && Game.boss.bossDef.threat && Game.boss.bossDef.threat(Game.boss, this));
  },
  finishFold() {
    const N = this.foldN, F = CFG.fold, now = Game.rt;
    this.x += this.foldTo.x; this.y += this.foldTo.y; contain(this, 18);
    this.branches = [this.mkBranch(0, 1, 0, this.name)]; this.nq = 0;
    this.coh = Math.min(CFG.coh.max, this.coh + CFG.coh.foldRefund * N);
    this.foldCd = F.cd * Mods.foldCd; this.invuln = Math.max(this.invuln, F.invulnAfter);
    let k = 1;
    if (this.perfect && Game.mode !== 'attract') {
      Game.stats.perfect++;
      Feed.add('Perfect fold', 'cyan', N + ' cats'); FX.ring(this.x, this.y, 20, 140, 0.4, PI_.cyan, 5);
      Audio2.sfx('perfect'); Input.rumble(0.45, 140); Game.slowmo(0.32, 0.35);
      this.invuln = Math.max(this.invuln, 0.35);
      if (now - this.lastPerfect > F.perfectCd) { k = F.perfectBlast; this.coh = Math.min(CFG.coh.max, this.coh + F.perfectRefund); if (Mods.kickback) { this.splitCd = 0; this.kick = 3; } }
      this.lastPerfect = now;
      Ach.unlock('perfect1'); if (Game.stats.perfect >= 25) Ach.unlock('perfect25');
      Game.toastOnce('hint-perfect', 'Perfect fold: you folded just as something was about to hit. Bigger blast, coherence back.');
    }
    if (Mods.echoFold) for (let j = 0; j < Math.min(4, N); j++) { const a = j / 4 * TAU; this.ghosts.push({ ox: this.foldFrom[0] - this.x + Math.cos(a) * 30, oy: this.foldFrom[1] - this.y + Math.sin(a) * 30, life: 4, max: 4, ci: (j * 8) % 32, fireT: 0 }); }
    Game.foldBlast(this.x, this.y, N, k * (Mods.merge ? 1 + 0.15 * this.drones() : 1));
    Game.stats.folds++;
  },
  drones() { return this.ghosts.filter(g => g.drone).length; },

  // ----- measurement (non-unitary: ask the dice) -----
  measureHit(hitSet, cause) {
    if (this.protected() || this.meas && this.meas.blocking) return;
    const pHit = this.probOf(hitSet), st = Game.stats;
    let hit = Game.mode !== 'tutorial' && (pHit >= 0.999999 || Math.random() < pHit); // the tutorial never kills
    st.measurements++; Game.bossHits++;
    if (hit && this.rerolls > 0 && Game.mode === 'arcade') { // QBism: update your beliefs and roll again
      this.rerolls--; Game.stats.rerolls = (Game.stats.rerolls || 0) + 1; hit = pHit >= 0.999999 ? false : Math.random() < pHit;
      Game.banner('BELIEFS UPDATED', 'You decline that outcome. ' + (this.rerolls ? this.rerolls + ' reroll left this wave.' : 'No rerolls left this wave.'), 1.6);
      if (pHit >= 0.999999) { this.invuln = 1; Bullets.clearNear(this.x, this.y, 200, 0); return; }
    }
    if (hit && Mods.immortal > 0 && Game.mode === 'arcade') { // quantum immortality: only the branch where you live is experienced
      Mods.immortal--;
      this.invuln = 1.4; Bullets.clearNear(this.x, this.y, 360, 0);
      Game.banner('QUANTUM IMMORTALITY', 'You only experience the branch where you survived.' + (Mods.immortal ? ' ' + Mods.immortal + ' left.' : ''), 2);
      Game.post.flash = [0.6, 0.9, 1, 0.6]; Game.slowmo(0.8, 0.15); Audio2.sfx('life'); Ach.unlock('insured');
      FX.ring(this.x, this.y, 10, 260, 0.8, PI_.gold, 5);
      return;
    }
    Game.recordOutcome(hit ? pHit : 1 - pHit);
    const M = CFG.meas, b0 = hitSet[0], recent = Game.rt - (Game.lastMeasRT || -99) < 2.5;
    this.meas = { kind: 'hit', t: 0, p: pHit, out: hit, b: b0, x: b0.px, y: b0.py, labelYes: 'DEAD', labelNo: 'ALIVE', cause, n: this.n };
    Game.lastMeasRT = Game.rt;
    if (hit) {
      Object.assign(this.meas, { dur: pHit >= 0.999 ? 0.6 : M.badDur, blocking: true });
      if (pHit < 0.999) Game.slowmo(M.badDur, M.slow);
      Lineage.died(b0.name, cause); this.die(cause, b0.px, b0.py);
      return;
    }
    // survived: the world nearly stops while the universe decides, then the touched cats are gone
    this.meas.dur = recent ? M.recentDur : M.dur;
    Game.slowmo(this.meas.dur, recent ? M.recentSlow : M.slow);
    for (const b of hitSet) this.branchVanish(b, true, cause);
    this.collapseTo(this.branches.filter(b => !hitSet.includes(b)));
    this.invuln = CFG.player.invulnAfterHit;
    if (this.fridge <= 0) this.coh = Math.max(0, this.coh - CFG.coh.hitCost);
    st.survived++; this.happyT = 0.9; Lineage.survived(this.branches, pHit);
    Feed.add('Survived', 'cyan', 'P(dead) was ' + fmtFrac(pHit));
    if (!st.lucky || pHit > st.lucky.p) st.lucky = { p: pHit, wave: Game.wave, cause, n: this.meas.n, name: this.name };
    Audio2.sfx('meas', pHit); Audio2.sfx('survive', pHit); Audio2.meow('happy'); Input.rumble(0.35, 90);
    if (Mods.school === 'cph') Game.collapseWave(b0.px, b0.py);
    if (Mods.dutch) Game.mult = Math.min(CFG.multMax + 4, Game.mult + 0.5);
    Game.onSurvive(pHit);
  },
  // projective measurement onto a region (no damage either way)
  measureRegion(pred, who, label) {
    if (this.dead || this.n <= 1 || (this.meas && this.meas.blocking)) return false;
    const inSet = this.branches.filter(pred);
    if (!inSet.length || inSet.length === this.n) return false; // all on one side: nothing to learn
    const pIn = this.probOf(inSet), yes = Math.random() < pIn;
    Game.recordOutcome(yes ? pIn : 1 - pIn);
    const out = this.branches.filter(b => !inSet.includes(b)), keep = yes ? inSet : out;
    for (const b of yes ? out : inSet) this.branchVanish(b, false);
    this.meas = { kind: 'region', t: 0, dur: 0.6, p: pIn, out: yes, x: who.x, y: who.y, labelYes: label || 'HERE', labelNo: 'NOT HERE' };
    this.collapseTo(keep);
    const recent = Game.rt - (Game.lastMeasRT || -99) < 3; Game.lastMeasRT = Game.rt;
    Game.slowmo(recent ? 0.2 : 0.4, recent ? 0.5 : 0.25);
    Audio2.sfx('shutter'); Game.stats.observed++;
    return true;
  },
  // full position measurement (decoherence)
  measureFull(reason) {
    if (this.dead || this.n <= 1) return;
    const nrm = this.norm(); let r = Math.random(), chosen = this.branches[this.n - 1];
    for (const b of this.branches) { r -= amp2(b) / nrm; if (r <= 0) { chosen = b; break; } }
    Game.recordOutcome(this.prob(chosen));
    for (const b of this.branches) if (b !== chosen) this.branchVanish(b, false);
    this.meas = { kind: 'full', t: 0, dur: 0.75, p: this.prob(chosen), out: true, x: chosen.px, y: chosen.py, n: this.n, reason, ci: this.ci(chosen) };
    this.collapseTo([chosen]);
    Game.slowmo(0.5, 0.2); Audio2.sfx('decohere');
    if (reason) Feed.add(reason, 'chalk', 'collapsed to one cat');
  },
  // a branch stops being real. Hit ones are mourned by name; Many-Worlds keeps them as drones.
  branchVanish(b, red, cause) {
    const ci = red ? PI_.red : this.ci(b), many = this.n > 32;
    if (!many || red) { FX.burst(b.px, b.py, red ? 26 : 12, red ? 260 : 150, red ? [PI_.red, PI_.white, ci] : ci, { life: 0.6, size: 4 }); FX.ring(b.px, b.py, 6, red ? 60 : 34, 0.45, ci, 2); }
    const ghost = { ox: wdx(b.px - this.x), oy: wdy(b.py - this.y), life: 5, max: 5, ci: this.ci(b), fireT: 0, name: b.name };
    if (Mods.school === 'mw' && Game.mode === 'arcade' && this.drones() < Mods.ghostMax) Object.assign(ghost, { life: 1e9, max: 1e9, drone: true, a: Math.random() * TAU });
    if (ghost.drone || Anom.active('manyworlds') || Mods.ghosts) this.ghosts.push(ghost);
    if (!red) return;
    const st = Game.stats; st.catsLost++;
    if (st.lost.length < 300) st.lost.push({ name: b.name, wave: Game.wave, cause: cause || 'bullet' });
    if (st.catsLost >= 50) Ach.unlock('names');
    Lineage.died(b.name, cause);
    Feed.add(b.name + ' collapsed', 'red', CAUSE_SHORT[cause] || cause);
  },
  // keep these branches; drop qubits that are no longer in superposition; re-centre on the survivors
  collapseTo(keep) {
    if (!keep.length) return;
    let cx = 0, cy = 0; for (const b of keep) { cx += wdx(b.px - this.x); cy += wdy(b.py - this.y); }
    cx /= keep.length; cy /= keep.length;
    this.x += cx; this.y += cy;
    if (World.wrap) { this.x = wrapX(this.x); this.y = wrapY(this.y); }
    for (const b of keep) { b.ox -= cx; b.oy -= cy; }
    let nq = this.nq;
    for (let q = nq - 1; q >= 0; q--) {
      const v0 = (keep[0].bits >> q) & 1;
      if (keep.every(b => ((b.bits >> q) & 1) === v0)) { for (const b of keep) b.bits = (b.bits & ((1 << q) - 1)) | ((b.bits >> (q + 1)) << q); nq--; }
    }
    this.nq = keep.length === 1 ? 0 : nq;
    if (keep.length === 1) keep[0].bits = 0;
    const s = Math.sqrt(keep.reduce((a, b) => a + amp2(b), 0)) || 1;
    for (const b of keep) { b.re /= s; b.im /= s; }
    this.branches = keep;
  },
  die(cause, x, y) { this.dead = true; this.respawnT = Game.mode === 'arcade' ? 1.6 : 1.0; Input.rumble(1, 380); Game.onPlayerDeath(cause, x, y); },
  // where to come back: here, unless a black hole or a boss is close, then the nearest clear point
  safeSpot() {
    const ok = (x, y) => Holes.list.every(h => wdx(x - h.x) ** 2 + wdy(y - h.y) ** 2 > (h.L.rh * 5 + 160) ** 2) && !(Game.boss && wdx(x - Game.boss.x) ** 2 + wdy(y - Game.boss.y) ** 2 < 260 ** 2);
    let x = clamp(this.x, 80, W - 80), y = clamp(this.y, 80, H - 80);
    if (ok(x, y)) return { x, y };
    for (let r = 200; r <= 1600; r += 120) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, px = clamp(x + Math.cos(a) * r, 80, W - 80), py = clamp(y + Math.sin(a) * r, 80, H - 80); if (ok(px, py)) return { x: px, y: py }; }
    return { x: W / 2, y: H / 2 };
  },
  respawn() {
    const keep = {}; for (const k of ['boost', 'pierce', 'fridge']) keep[k] = this[k] > 1e6 ? this[k] : 0; // lab cheats survive death
    keep.boostQ = keep.boost ? this.boostQ : 0;
    const p = this.safeSpot(); this.reset(p.x, p.y);
    Object.assign(this, keep, { invuln: CFG.player.invulnRespawn });
    Game.addScore(Bullets.clearNear(this.x, this.y, 420) * 5, this.x, this.y, null, true);
    FX.ring(this.x, this.y, 10, 180, 0.7, PI_.cyan, 4); Grid.impulse(this.x, this.y, 500, 300); Audio2.sfx('respawn');
  },

  // ----- per-step update -----
  update(dt, inp) {
    if (this.meas) { this.meas.t += Game.realDt; if (this.meas.t >= this.meas.dur) this.meas = null; }
    if (this.dead) { this.respawnT -= dt; if (this.respawnT <= 0 && Game.lives > 0) this.respawn(); return; }
    const pc = CFG.player;
    this.focusing = !!inp.focus; this.focusK += ((this.focusing ? 1 : 0) - this.focusK) * damp(14, dt);
    // movement (input is screen-space; undo camera rotation), then every field acting on the cat
    const [mx, my] = screenDirToWorld(inp.mx, inp.my); this.steer = [mx, my];
    const zeno = this.zenoT > 0 ? 0.4 : 1; this.zenoT = Math.max(0, (this.zenoT || 0) - dt);
    if (!this.dead) this.sprintTick(!!inp.sprint, dt);
    this.sprintK = (this.sprintK || 0) + ((this.sprinting && !this.focusing ? 1 : 0) - (this.sprintK || 0)) * damp(10, dt);
    const sp = pc.speed * Mods.speed * lerp(1, pc.focusMul, this.focusK) * lerp(1, CFG.dash.sprintMul, this.sprintK) * (this.kick > 0 ? 1.05 : 1) * zeno, k = damp((mx || my ? 13 : 9) * Anom.mul('grip'), dt);
    this.vx += (mx * sp - this.vx) * k; this.vy += (my * sp - this.vy) * k;
    if (this.dashT > 0) { const ds = pc.speed * Mods.speed * (this.dashMul || CFG.dash.mul); this.vx = this.dashDir[0] * ds; this.vy = this.dashDir[1] * ds; this.dashT -= dt; if (this.dashT <= 0) { this.vx *= 0.45; this.vy *= 0.45; } }
    // every field acting on the cat, capped below what the cat can run against: you can always crawl out of a pull
    if (Fields.acc.length) { const o = Fields.accel(this.x, this.y, K_CAT), a = Math.hypot(o[0], o[1]), cap = sp * 10.5, f = a > cap ? cap / a : 1; this.vx += o[0] * f * dt; this.vy += o[1] * f * dt; }
    if (Fields.rot.length) { const w = Fields.spin(this.x, this.y, K_CAT) * dt; if (w) rotV(this, w); }
    this.x += this.vx * dt; this.y += this.vy * dt;
    contain(this, 18);
    if (Fields.sink.length) { const s = this.branches.filter(b => b.grace <= 0 && Fields.swallow(b.px, b.py, K_CAT)); if (s.length) this.hit(s, 'spaghettified'); if (this.dead) return; }
    if (Math.abs(this.vx) + Math.abs(this.vy) > 60) Grid.wake(this.x, this.y, this.vx * 0.012, this.vy * 0.012, 70);
    this.aim(inp.aim, dt);
    // timers
    this.splitCd = Math.max(0, this.splitCd - dt); this.foldCd = Math.max(0, this.foldCd - dt); this.dashCd = Math.max(0, this.dashCd - dt);
    this.invuln = Math.max(0, this.invuln - dt); this.happyT = Math.max(0, this.happyT - dt);
    if (this.boost > 0 && (this.boost -= dt) <= 0) { if (this.nq > this.maxQ()) this.measureFull('Boost expired'); this.boostQ = 0; }
    for (const t of ['pierce', 'fridge', 'echo', 'kick', 'shieldCd']) if (this[t] > 0) this[t] -= dt;
    if (Mods.zeno) { this.still = mx || my ? 0 : this.still + dt; if (!this.shield && this.still > 0.5 && this.shieldCd <= 0) { this.shield = true; FX.ring(this.x, this.y, 10, 40, 0.4, PI_.cyan, 2); Audio2.sfx('pickup'); } }
    this.blinkT -= dt; if (this.blinkT < -0.12) this.blinkT = 1.5 + Math.random() * 3;
    this.coherence(dt);
    // formation (focus pulls the cats in tight)
    this.rotT += dt * (0.75 + 0.08 * Math.min(this.nq, 5));
    const folding = this.folding > 0;
    if (folding) this.folding -= dt;
    const spread = SPREAD[this.nq] * (1 + 0.06 * Math.sin(this.rotT * 1.7)) * lerp(1, pc.focusSpread, this.focusK), kk = damp(folding ? 26 : 11, dt);
    for (const b of this.branches) {
      if (folding) { b.tx = this.foldTo.x; b.ty = this.foldTo.y; b.depth = 0; b.sc = 1; } else this.project(b, spread);
      b.ox += (b.tx - b.ox) * kk; b.oy += (b.ty - b.oy) * kk;
      b.px = this.x + b.ox; b.py = this.y + b.oy;
      if (World.wrap) { b.px = wrapX(b.px); b.py = wrapY(b.py); }
      b.flash = Math.max(0, b.flash - dt); if (b.grace > 0) b.grace -= dt;
    }
    if (folding && this.folding <= 0) this.finishFold();
    if (!folding && Game.canFire()) this.shoot(dt);
    for (const g of this.ghosts) if (g.drone) { g.a += dt * 0.8; const r = 64 + 10 * Math.sin(g.a * 1.7); g.ox += (Math.cos(g.a) * r - g.ox) * damp(3, dt); g.oy += (Math.sin(g.a) * r - g.oy) * damp(3, dt); } // Many-Worlds drones orbit you
  },
  aim(a, dt) {
    if (a.mode === 'point') {
      const [wx, wy] = cssToWorld(a.x, a.y);
      this.aimX = wx; this.aimY = wy; this.aimPoint = true;
      this.aimA = Math.atan2(wdy(wy - this.y), wdx(wx - this.x));
      Input.lastAimDir.x = Math.cos(this.aimA); Input.lastAimDir.y = Math.sin(this.aimA);
      return;
    }
    this.aimPoint = false;
    if (a.mode === 'dir') { const [dx, dy] = screenDirToWorld(a.x, a.y), t = Math.atan2(dy, dx); this.aimA = a.held ? t : this.aimA + angDiff(this.aimA, t) * damp(30, dt); }
    else { const t = Game.autoTarget(this.x, this.y); if (t) this.aimA += angDiff(this.aimA, Math.atan2(wdy(t.y - this.y), wdx(t.x - this.x))) * damp(20, dt); }
    this.aimX = this.x + Math.cos(this.aimA) * 400; this.aimY = this.y + Math.sin(this.aimA) * 400;
  },
  coherence(dt) {
    const cc = CFG.coh;
    if (this.nq === 0) {
      this.drain = 0;
      if (this.cohDelay > 0) this.cohDelay -= dt; else this.coh = Math.min(cc.max, this.coh + cc.regen * dt * (this.fridge > 0 ? 3 : 1));
      return;
    }
    let env = 0;
    let hot = 1;
    for (const e of Game.enemies) {
      if (e.dead || e.spawning) continue;
      const d2 = wdx(e.x - this.x) ** 2 + wdy(e.y - this.y) ** 2;
      if (d2 < cc.envR * cc.envR) env += cc.envPer;
      if (e.def.aura && d2 < e.def.aura * e.def.aura) { hot = 3.5; if ((this.hotT = (this.hotT || 0) + dt) > 1) Notes.obs('enemy:' + e.type, 'drain'); } // a decoherer's haze: the environment is hot here
    }
    const harvest = Mods.harvest ? 1 - Math.min(0.4, 0.06 * this.drones()) : 1;
    this.drain = this.fridge > 0 || Mods.subspace && this.focusing ? 0 : (cc.drainBase * Math.pow(this.n, cc.drainExp) + Math.min(env, cc.envMax)) * Anom.mul('drain') * Mods.drain * harvest * hot * (Game.mode === 'arcade' ? Game.D.drain : 1);
    this.coh -= this.drain * dt; this.cohDelay = cc.regenDelay;
    if (this.coh < 30 && Game.mode === 'arcade') Game.toastOnce('hint-fold', Input.touchMode ? 'Coherence is draining. Tap Ĥ† to fold into a shockwave before it decoheres.' : 'Coherence is draining. Fold (Q or right-click) into a shockwave before it decoheres.');
    if (this.coh <= 0 && this.folding <= 0) {
      this.coh = 0;
      if (Mods.autoFold && this.fold()) Feed.add('Protected fold', 'cyan', 'coherence ran out');
      else { this.measureFull('Decoherence'); Game.stats.decohered++; }
    }
  },
  shoot(dt) {
    const rate = CFG.player.fireRate * Mods.fire * (this.kick > 0 ? 2 : 1) * Math.min(1, Math.sqrt(32 / this.n)); // above 32 cats each fires a little slower
    for (const b of this.branches) { if ((b.fireT -= dt) <= 0) { b.fireT = Math.max(0, b.fireT + 1 / rate); this.fireFrom(b.px, b.py, this.ci(b)); } }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i]; if ((g.life -= dt) <= 0) { this.ghosts.splice(i, 1); continue; }
      if ((g.fireT -= dt) <= 0) { g.fireT += (g.drone ? 2 : 1) / rate; this.fireFrom(this.x + g.ox, this.y + g.oy, g.ci, true); }
    }
  },
  project(b, spread) {
    const nq = this.nq;
    if (nq === 0) { b.tx = b.ty = b.depth = 0; b.sc = 1; return; }
    const v = V8; v.fill(0);
    for (let q = 0; q < nq; q++) v[q] = ((b.bits >> q) & 1) ? 1 : -1;
    for (const [i, j, w] of ROT_PLANES[nq]) { const a = this.rotT * w, c = Math.cos(a), s = Math.sin(a), vi = v[i], vj = v[j]; v[i] = vi * c - vj * s; v[j] = vi * s + vj * c; }
    let sc = 1, depth = 0;
    for (let d = nq - 1; d >= 2; d--) { const f = 3.2 / (3.2 - v[d] * 0.5); sc *= f; depth += v[d]; for (let k = 0; k < d; k++) v[k] *= f; } // perspective, one dimension at a time
    let x = v[0] * spread, y = (nq >= 2 ? v[1] : 0) * spread;
    if (nq === 1) { const a = this.rotT * 0.35; y = x * Math.sin(a); x *= Math.cos(a); }
    if (nq > 5) { x /= Math.pow(sc, 0.5); y /= Math.pow(sc, 0.5); sc = Math.pow(sc, 0.4); } // keep very high dimensions on screen
    b.tx = x; b.ty = y; b.depth = depth; b.sc = sc;
  },
  fireFrom(x, y, ci, ghost) {
    let a = this.aimA;
    if (this.aimPoint) { const dx = wdx(this.aimX - x), dy = wdy(this.aimY - y); if (dx * dx + dy * dy > 3600) a = Math.atan2(dy, dx); }
    if (Mods.perCat && !ghost) { const t = Game.nearestEnemy(x, y, 700); if (t) a = Math.atan2(wdy(t.y - y), wdx(t.x - x)); }
    a += (Math.random() - 0.5) * 0.045;
    const sp = CFG.player.bulletSpeed * (0.97 + Math.random() * 0.06), dmg = CFG.player.bulletDmg * Mods.dmg * (Mods.complement && this.n === 1 ? 2 : 1);
    for (let k = -Mods.spread; k <= Mods.spread; k++) { const aa = a + k * 0.11, c = Math.cos(aa), s = Math.sin(aa); Bullets.firePlayer(x + c * 12, y + s * 12, c * sp, s * sp, dmg * (k ? 0.6 : 1), ci, ghost); }
    if (!ghost) Anom.each('onPlayerFire', a, this.n);
    Audio2.shot(this.n);
  },

  draw(ctx) {
    if (this.dead) return;
    const bs = this.branches, many = bs.length > 64;
    if (this.n > 1) { // entanglement bonds (hypercube edges)
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = many ? 0.8 : 1.4; ctx.globalAlpha = many ? 0.12 : 0.22;
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const x = bs[i].bits ^ bs[j].bits; if (x & (x - 1)) continue;
        ctx.strokeStyle = PAL_CSS[this.ci(bs[i])];
        ctx.beginPath(); ctx.moveTo(ix(bs[i].px), iy(bs[i].py)); ctx.lineTo(ix(bs[i].px) + wdx(bs[j].px - bs[i].px), iy(bs[i].py) + wdy(bs[j].py - bs[i].py)); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    const s0 = CFG.player.drawSize;
    for (const g of this.ghosts) { ctx.globalAlpha = (g.drone ? 0.4 : 0.28) * Math.min(1, g.life / 1.2); ctx.drawImage(catSprite(g.ci, 1), ix(this.x + g.ox) - s0 * 0.45, iy(this.y + g.oy) - s0 * 0.45, s0 * 0.9, s0 * 0.9); }
    ctx.globalAlpha = 1;
    // cats, far to near
    const base = s0 * CATSCALE[this.nq], variant = this.happyT > 0 ? 3 : this.blinkT < 0 ? 1 : 0;
    const flick = this.invuln > 0 && !this.meas && this.folding <= 0 ? (Math.sin(Game.rt * 40) > 0 ? 0.45 : 1) : 1, deco = this.nq > 0 ? clamp(1 - this.coh / 35, 0, 1) : 0;
    for (const b of many ? bs : bs.slice().sort((a, c) => a.depth - c.depth)) {
      const s = base * b.sc * (1 + b.flash * 0.6);
      let x = ix(b.px), y = iy(b.py);
      if (deco > 0) { x += (Math.random() - 0.5) * 6 * deco; y += (Math.random() - 0.5) * 6 * deco; }
      ctx.globalAlpha = flick * (b.grace > 0 ? 0.45 : 1) * (this.n === 1 ? 1 : clamp(0.42 + 0.58 * Math.sqrt(this.prob(b) * this.n) * (0.7 + 0.3 * b.sc), 0.25, 1)) * (deco > 0 && Math.random() < deco * 0.25 ? 0.4 : 1);
      ctx.drawImage(catSprite(this.ci(b), variant), x - s / 2, y - s * 0.52, s, s);
      if (!many && Lineage.vets.has(b.name)) { // a veteran of earlier runs: a small gold halo
        ctx.strokeStyle = PAL_CSS[PI_.gold]; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(x, y - s * 0.62, s * 0.24, s * 0.07, 0, 0, TAU); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // hitbox dots (brighter and ringed while focusing)
    const big = Settings.bigDots || this.focusK > 0.5, hr = CFG.player.hitR * (big ? 1 : 0.6) * (Game.mode === 'arcade' ? Game.D.hitR : 1);
    if (big) { ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; for (const b of bs) { ctx.beginPath(); ctx.arc(ix(b.px), iy(b.py), hr + 1, 0, TAU); ctx.stroke(); } }
    ctx.fillStyle = big ? '#fff36b' : '#fff';
    for (const b of bs) { if (b.grace > 0) continue; ctx.beginPath(); ctx.arc(ix(b.px), iy(b.py), hr, 0, TAU); ctx.fill(); }
    if (this.focusK > 0.05) { ctx.globalAlpha = 0.5 * this.focusK; Tele.ring(ctx, ix(this.x), iy(this.y), SPREAD[this.nq] * CFG.player.focusSpread + 22, COL.cyan, 0.5, [3, 5], 1.2); ctx.globalAlpha = 1; }
    if (this.shield) { halo(ctx, PI_.cyan, ix(this.x), iy(this.y), 46, 0.35); Tele.ring(ctx, ix(this.x), iy(this.y), 30, COL.cyan, 0.7, [], 2); }
  },
};
