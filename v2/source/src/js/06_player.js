// ---------- world wrapping helpers ----------
const World = { wrap: false };
const wdx = dx => (World.wrap ? dx - W * Math.round(dx / W) : dx);
const wdy = dy => (World.wrap ? dy - H * Math.round(dy / H) : dy);
const wrapX = x => ((x % W) + W) % W;
const wrapY = y => ((y % H) + H) % H;
// image of a world point nearest the camera (for drawing in wrap mode)
const ix = x => (World.wrap ? cam.x + wdx(x - cam.x) : x);
const iy = y => (World.wrap ? cam.y + wdy(y - cam.y) : y);

// ---------- the quantum cat ----------
const SPREAD = [0, 40, 36, 33, 30, 27, 25];
const CATSCALE = [1, 1, 0.94, 0.86, 0.8, 0.72, 0.66];
const ROT_PLANES = [
  [], [], [[0, 1, 0.55]], [[0, 2, 0.7], [1, 2, 0.43]],
  [[0, 3, 0.55], [1, 2, 0.38], [2, 3, 0.29]],
  [[0, 3, 0.5], [1, 2, 0.36], [2, 4, 0.31], [3, 4, 0.47]],
];

const Player = {
  x: W / 2, y: H / 2, vx: 0, vy: 0,
  aimA: 0, aimX: W / 2 + 100, aimY: H / 2, aimPoint: false,
  branches: [], nq: 0, rotT: 0,
  coh: 100, cohDelay: 0, drain: 0,
  splitCd: 0, foldCd: 0, folding: 0, foldN: 0,
  invuln: 0, dead: false, respawnT: 0,
  lives: CFG.lives,
  boost: 0, pierce: 0, fridge: 0, echo: 0,
  blinkT: 2, happyT: 0,
  ghosts: [],
  meas: null,          // active measurement display
  hitThisStep: null,
  reset(x = W / 2, y = H / 2) {
    this.x = x; this.y = y; this.vx = this.vy = 0;
    this.branches = [this.mkBranch(0, 1, 0)]; this.nq = 0;
    this.coh = CFG.coh.max; this.cohDelay = 0;
    this.splitCd = this.foldCd = this.folding = 0;
    this.invuln = 0; this.dead = false; this.respawnT = 0;
    this.boost = this.pierce = this.fridge = this.echo = 0;
    this.ghosts.length = 0; this.meas = null; this.happyT = 0;
  },
  mkBranch(bits, re, im) {
    return { bits, re, im, ox: 0, oy: 0, tx: 0, ty: 0, depth: 0, sc: 1, px: this.x, py: this.y, fireT: Math.random() / CFG.player.fireRate, flash: 0, id: uid() };
  },
  get n() { return this.branches.length; },
  maxQ() { return this.boost > 0 ? CFG.player.boostQubits : CFG.player.maxQubits; },
  norm() { let s = 0; for (const b of this.branches) s += b.re * b.re + b.im * b.im; return s || 1; },
  prob(b) { return (b.re * b.re + b.im * b.im) / this.norm(); },
  phase(b) { return Math.atan2(b.im, b.re); },
  // expectation value ⟨x⟩ — where classical things think you are
  expect() {
    const nrm = this.norm(); let ex = 0, ey = 0;
    for (const b of this.branches) { const p = (b.re * b.re + b.im * b.im) / nrm; ex += p * wdx(b.px - this.x); ey += p * wdy(b.py - this.y); }
    return [this.x + ex, this.y + ey];
  },

  // ----- unitary operations -----
  split() {
    if (this.dead || this.folding > 0) return false;
    if (this.nq >= this.maxQ()) { Game.toastOnce('maxq', 'Maximum superposition. Fold to release it.'); return false; }
    if (this.splitCd > 0) return false;
    if (this.coh < CFG.coh.minToSplit * Mods.splitCost && this.fridge <= 0) { Game.flashCoh(); Audio2.sfx('deny'); return false; }
    const q = this.nq;
    const ph = PI / Math.pow(2, q); // QFT-style phase per qubit → colours spread around the wheel
    const c = Math.cos(ph), s = Math.sin(ph);
    const out = [];
    for (const b of this.branches) {
      const a0 = this.mkBranch(b.bits, b.re * SQRT1_2, b.im * SQRT1_2);
      const re1 = (b.re * c - b.im * s) * SQRT1_2, im1 = (b.re * s + b.im * c) * SQRT1_2;
      const a1 = this.mkBranch(b.bits | (1 << q), re1, im1);
      for (const a of [a0, a1]) { a.ox = b.ox; a.oy = b.oy; a.px = b.px; a.py = b.py; a.fireT = Math.random() / CFG.player.fireRate; a.flash = 0.35; }
      out.push(a0, a1);
      FX.ring(b.px, b.py, 4, 46, 0.4, phaseIndex(Math.atan2(im1, re1)) , 2.5);
    }
    this.branches = out; this.nq = q + 1;
    if (this.fridge <= 0) this.coh = Math.max(0, this.coh - CFG.coh.splitCost * Mods.splitCost);
    this.splitCd = 0.22 * Mods.splitCd;
    Game.stats.splits++; Game.waveSplits++; Game.stats.maxBranches = Math.max(Game.stats.maxBranches, this.n);
    if (this.n >= 16) Ach.unlock('tesseract');
    if (this.n >= 32) Ach.unlock('penteract');
    if (Game.mode === 'arcade') Game.toastOnce('hint-meas', 'Every cat fires. A bullet touching any cat is a measurement: with N cats you die with probability 1/N, otherwise you just lose that cat.');
    Grid.impulse(this.x, this.y, 260, 180);
    Audio2.sfx('split', this.nq);
    FX.text(this.x, this.y - 46, this.n + ' cats', PI_.chalk, { size: 15, life: 0.8, font: 'mono' });
    const shape = { 4: ['A SQUARE OF CATS', ''], 8: ['A CUBE OF CATS', ''], 16: ['TESSERACT', 'You are now a four-dimensional hypercube of cats.'], 32: ['PENTERACT', 'Five dimensions of cat. This was a mistake.'] }[this.n];
    if (shape && Game.mode !== 'attract' && !Game.stats.shapes.has(this.n)) {
      Game.stats.shapes.add(this.n);
      if (this.n >= 16) { Game.banner(shape[0], shape[1], 1.8); Audio2.say(this.n === 16 ? 'Tesseract.' : 'Penteract.'); }
      else FX.text(this.x, this.y + 52, shape[0].toLowerCase(), PI_.gold, { size: 13, life: 1.2, font: 'serif', vy: 30 });
    }
    addTrauma(0.08);
    return true;
  },
  fold() {
    if (this.dead || this.nq === 0 || this.folding > 0 || this.foldCd > 0) return false;
    this.folding = 0.2; this.foldN = this.n;
    Audio2.sfx('foldStart');
    return true;
  },
  finishFold() {
    const N = this.foldN;
    this.branches = [this.mkBranch(0, 1, 0)]; this.nq = 0;
    this.coh = Math.min(CFG.coh.max, this.coh + CFG.coh.foldRefund * N);
    this.foldCd = 0.55;
    Game.foldBlast(this.x, this.y, N);
    Game.stats.folds++;
  },

  // ----- measurement (non-unitary, ask the dice) -----
  // set of branches touched → "is the cat here?"
  measureHit(hitSet, cause) {
    if (this.invuln > 0 || this.dead || this.meas && this.meas.blocking) return;
    const nrm = this.norm();
    let pHit = 0; for (const b of hitSet) pHit += (b.re * b.re + b.im * b.im) / nrm;
    pHit = clamp(pHit, 0, 1);
    let hit = pHit >= 0.999999 || Math.random() < pHit;
    Game.stats.measurements++; Game.bossHits++;
    if (hit && Mods.immortal > 0 && Game.mode === 'arcade') { // quantum immortality: only the branch where you live is experienced
      Mods.immortal--;
      this.invuln = 1.4; Game.clearBulletsNear(this.x, this.y, 360, false);
      Game.banner('QUANTUM IMMORTALITY', 'You only experience the branch where you survived.' + (Mods.immortal ? ' ' + Mods.immortal + ' left.' : ''), 2);
      Game.post.flash = [0.6, 0.9, 1, 0.6]; Game.slowmo(0.8, 0.15); Audio2.sfx('life'); Ach.unlock('insured');
      FX.ring(this.x, this.y, 10, 260, 0.8, PI_.gold, 5);
      return;
    }
    Game.recordOutcome(hit ? pHit : 1 - pHit);
    const cx = hitSet[0].px, cy = hitSet[0].py;
    if (hit) {
      this.meas = { kind: 'hit', t: 0, dur: pHit >= 0.999 ? 0.5 : 0.85, p: pHit, out: true, x: cx, y: cy, labelYes: 'HIT', labelNo: 'MISSED', blocking: true, cause };
      if (pHit < 0.999) Game.slowmo(0.85, 0.07);
      this.die(cause, cx, cy);
    } else {
      const recent = Game.rt - (Game.lastMeasRT || -99) < 3; Game.lastMeasRT = Game.rt;
      this.meas = { kind: 'hit', t: 0, dur: recent ? 0.6 : 0.85, p: pHit, out: false, x: cx, y: cy, labelYes: 'HIT', labelNo: 'MISSED', cause };
      Game.slowmo(recent ? 0.3 : 0.7, recent ? 0.3 : 0.08);
      const keep = this.branches.filter(b => !hitSet.includes(b));
      for (const b of hitSet) this.branchVanish(b, true);
      this.collapseTo(keep);
      this.invuln = CFG.player.invulnAfterHit;
      if (this.fridge <= 0) this.coh = Math.max(0, this.coh - CFG.coh.hitCost);
      Game.stats.survived++;
      this.happyT = 0.9;
      Audio2.sfx('survive', pHit);
      Audio2.meow('happy');
      FX.text(cx, cy - 30, '|dead⟩ ✗', PI_.red, { size: 18, font: 'serif', life: 1 });
      Game.onSurvive(pHit);
    }
  },
  // projective measurement onto a region (no damage either way)
  measureRegion(pred, who, label) {
    if (this.dead || this.n <= 1 || (this.meas && this.meas.blocking)) return false;
    const inSet = this.branches.filter(pred);
    if (!inSet.length || inSet.length === this.n) {
      // all branches on one side: trivially certain; still collapse if all inside (nothing changes)
      return false;
    }
    const nrm = this.norm(); let pIn = 0; for (const b of inSet) pIn += (b.re * b.re + b.im * b.im) / nrm;
    const yes = Math.random() < pIn;
    Game.recordOutcome(yes ? pIn : 1 - pIn);
    const keep = yes ? inSet : this.branches.filter(b => !inSet.includes(b));
    const gone = yes ? this.branches.filter(b => !inSet.includes(b)) : inSet;
    for (const b of gone) this.branchVanish(b, false);
    this.meas = { kind: 'region', t: 0, dur: 0.6, p: pIn, out: yes, x: who.x, y: who.y, labelYes: label || 'HERE', labelNo: 'NOT HERE' };
    this.collapseTo(keep);
    const recent = Game.rt - (Game.lastMeasRT || -99) < 3; Game.lastMeasRT = Game.rt;
    Game.slowmo(recent ? 0.2 : 0.4, recent ? 0.5 : 0.25);
    Audio2.sfx('shutter');
    Game.stats.observed++;
    return true;
  },
  // full position measurement (decoherence)
  measureFull(reason) {
    if (this.dead || this.n <= 1) return;
    const nrm = this.norm(); let r = Math.random(); let chosen = this.branches[this.n - 1];
    for (const b of this.branches) { r -= (b.re * b.re + b.im * b.im) / nrm; if (r <= 0) { chosen = b; break; } }
    Game.recordOutcome(this.prob(chosen));
    for (const b of this.branches) if (b !== chosen) this.branchVanish(b, false);
    this.meas = { kind: 'full', t: 0, dur: 0.75, p: this.prob(chosen), out: true, x: chosen.px, y: chosen.py, n: this.n, reason, ci: phaseIndex(this.phase(chosen)) };
    this.collapseTo([chosen]);
    Game.slowmo(0.5, 0.2);
    Audio2.sfx('decohere');
    if (reason) FX.text(this.x, this.y - 40, reason, PI_.chalk, { size: 15, font: 'serif', life: 1.3 });
  },
  branchVanish(b, red) {
    const ci = red ? PI_.red : phaseIndex(this.phase(b));
    FX.burst(b.px, b.py, red ? 26 : 12, red ? 260 : 150, red ? [PI_.red, PI_.white, ci] : ci, { life: 0.6, size: 4 });
    FX.ring(b.px, b.py, 6, red ? 60 : 34, 0.45, ci, 2);
    if (Anom.active('manyworlds') || Mods.ghosts) this.ghosts.push({ ox: wdx(b.px - this.x), oy: wdy(b.py - this.y), life: 5, max: 5, ci: phaseIndex(this.phase(b)), fireT: 0 });
  },
  // keep these branches; drop qubits that are no longer in superposition; re-centre
  collapseTo(keep) {
    if (!keep.length) return;
    // centroid of survivors becomes the new centre
    let cx = 0, cy = 0; for (const b of keep) { cx += wdx(b.px - this.x); cy += wdy(b.py - this.y); }
    cx /= keep.length; cy /= keep.length;
    this.x += cx; this.y += cy;
    if (World.wrap) { this.x = wrapX(this.x); this.y = wrapY(this.y); }
    for (const b of keep) { b.ox -= cx; b.oy -= cy; }
    // remove determined qubits
    let nq = this.nq;
    for (let q = nq - 1; q >= 0; q--) {
      const v0 = (keep[0].bits >> q) & 1;
      if (keep.every(b => ((b.bits >> q) & 1) === v0)) {
        for (const b of keep) { const lo = b.bits & ((1 << q) - 1); const hi = b.bits >> (q + 1); b.bits = lo | (hi << q); }
        nq--;
      }
    }
    this.nq = nq;
    if (keep.length === 1) { keep[0].bits = 0; this.nq = 0; }
    // renormalise amplitudes
    let s = 0; for (const b of keep) s += b.re * b.re + b.im * b.im; s = Math.sqrt(s) || 1;
    for (const b of keep) { b.re /= s; b.im /= s; }
    this.branches = keep;
  },
  die(cause, x, y) {
    this.dead = true; this.respawnT = Game.mode === 'lab' ? 1.0 : 1.6;
    Game.onPlayerDeath(cause, x, y);
  },
  respawn() {
    this.dead = false;
    const bx = this.x, by = this.y;
    const keep = { boost: this.boost > 1e6 ? this.boost : 0, pierce: this.pierce > 1e6 ? this.pierce : 0, fridge: this.fridge > 1e6 ? this.fridge : 0 };
    this.reset(clamp(bx, 80, W - 80), clamp(by, 80, H - 80));
    Object.assign(this, keep);
    this.invuln = CFG.player.invulnRespawn;
    this.coh = CFG.coh.max;
    Game.clearBulletsNear(this.x, this.y, 420, true);
    FX.ring(this.x, this.y, 10, 180, 0.7, PI_.cyan, 4);
    Grid.impulse(this.x, this.y, 500, 300);
    Audio2.sfx('respawn');
  },

  // ----- per-step update -----
  update(dt, inp) {
    if (this.meas) { this.meas.t += Game.realDt; if (this.meas.t >= this.meas.dur) this.meas = null; }
    if (this.dead) {
      this.respawnT -= dt;
      if (this.respawnT <= 0 && Game.lives > 0) this.respawn();
      return;
    }
    const pc = CFG.player;
    // movement (input is screen-space; undo camera rotation)
    let [mx, my] = screenDirToWorld(inp.mx, inp.my);
    if (Game.mods.xflip) mx = -mx;
    const tvx = mx * pc.speed, tvy = my * pc.speed + Anom.sink();
    const k = damp((inp.mx || inp.my ? 13 : 9) * Anom.moveGrip(), dt);
    this.vx += (tvx - this.vx) * k; this.vy += (tvy - this.vy) * k;
    // external accelerations from anomalies
    const [ax, ay] = Anom.playerAccel(this);
    this.vx += ax * dt; this.vy += ay * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (World.wrap) { this.x = wrapX(this.x); this.y = wrapY(this.y); }
    else {
      const m = 18, bx = Game.box, x0 = bx ? bx.x0 : 0, x1 = bx ? bx.x1 : W, y0 = bx ? bx.y0 : 0, y1 = bx ? bx.y1 : H;
      if (this.x < x0 + m) { this.x = x0 + m; this.vx = Math.max(0, this.vx); }
      if (this.x > x1 - m) { this.x = x1 - m; this.vx = Math.min(0, this.vx); }
      if (this.y < y0 + m) { this.y = y0 + m; this.vy = Math.max(0, this.vy); }
      if (this.y > y1 - m) { this.y = y1 - m; this.vy = Math.min(0, this.vy); }
    }
    if (Math.abs(this.vx) + Math.abs(this.vy) > 60) Grid.wake(this.x, this.y, this.vx * 0.012, this.vy * 0.012, 70);

    // aim
    const a = inp.aim;
    if (a.mode === 'point') {
      const [wx, wy] = cssToWorld(a.x, a.y);
      this.aimX = wx; this.aimY = wy; this.aimPoint = true;
      this.aimA = Math.atan2(wdy(wy - this.y), wdx(wx - this.x));
      Input.lastAimDir.x = Math.cos(this.aimA); Input.lastAimDir.y = Math.sin(this.aimA);
    } else if (a.mode === 'dir') {
      const [dx, dy] = screenDirToWorld(a.x, a.y);
      const target = Math.atan2(dy, dx);
      this.aimA = a.held ? target : this.aimA + angDiff(this.aimA, target) * damp(30, dt);
      this.aimPoint = false;
    } else {
      const t = Game.autoTarget(this.x, this.y);
      if (t) {
        const target = Math.atan2(wdy(t.y - this.y), wdx(t.x - this.x));
        this.aimA += angDiff(this.aimA, target) * damp(12, dt);
      }
      this.aimPoint = false;
    }
    if (!this.aimPoint) { this.aimX = this.x + Math.cos(this.aimA) * 400; this.aimY = this.y + Math.sin(this.aimA) * 400; }

    // timers
    this.splitCd = Math.max(0, this.splitCd - dt); this.foldCd = Math.max(0, this.foldCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.happyT = Math.max(0, this.happyT - dt);
    if (this.boost > 0) { this.boost -= dt; if (this.boost <= 0 && this.nq > CFG.player.maxQubits) { this.measureFull('Boost expired'); } }
    if (this.pierce > 0) this.pierce -= dt;
    if (this.fridge > 0) this.fridge -= dt;
    if (this.echo > 0) this.echo -= dt;
    this.blinkT -= dt; if (this.blinkT < -0.12) this.blinkT = 1.5 + Math.random() * 3;

    // coherence
    const cc = CFG.coh;
    if (this.nq > 0) {
      let env = 0;
      for (const e of Game.enemies) { if (e.dead || e.spawning) continue; const dx = wdx(e.x - this.x), dy = wdy(e.y - this.y); if (dx * dx + dy * dy < cc.envR * cc.envR) env += cc.envPer; }
      env = Math.min(env, cc.envMax);
      this.drain = (cc.drainBase * Math.pow(this.n, cc.drainExp) + env) * Anom.drainMul() * Mods.drain * (Game.mode === 'arcade' ? DIFFS[Game.diffId].drain : 1);
      if (this.fridge > 0) this.drain = 0;
      this.coh -= this.drain * dt;
      this.cohDelay = cc.regenDelay;
      if (this.coh < 30 && Game.mode === 'arcade') Game.toastOnce('hint-fold', Input.touchMode ? 'Coherence is draining. Tap Ĥ† to fold into a shockwave before it decoheres.' : 'Coherence is draining. Fold (Shift or right-click) into a shockwave before it decoheres.');
      if (this.coh <= 0 && this.folding <= 0) {
        this.coh = 0;
        if (Mods.autoFold && this.fold()) FX.text(this.x, this.y - 40, 'protected fold', PI_.cyan, { size: 14, font: 'serif', life: 1 });
        else { this.measureFull('Decoherence'); Game.stats.decohered++; }
      }
    } else {
      this.drain = 0;
      if (this.cohDelay > 0) this.cohDelay -= dt;
      else this.coh = Math.min(cc.max, this.coh + cc.regen * dt * (this.fridge > 0 ? 3 : 1));
    }

    // formation
    this.rotT += dt * (0.75 + 0.08 * this.nq);
    const folding = this.folding > 0;
    if (folding) { this.folding -= dt; }
    const spread = SPREAD[this.nq] * (1 + 0.06 * Math.sin(this.rotT * 1.7)) * Anom.spreadMul();
    for (const b of this.branches) {
      if (folding) { b.tx = 0; b.ty = 0; b.depth = 0; b.sc = 1; }
      else this.project(b, spread);
      const kk = damp(folding ? 26 : 11, dt);
      b.ox += (b.tx - b.ox) * kk; b.oy += (b.ty - b.oy) * kk;
      b.px = this.x + b.ox; b.py = this.y + b.oy;
      if (World.wrap) { b.px = wrapX(b.px); b.py = wrapY(b.py); }
      b.flash = Math.max(0, b.flash - dt);
    }
    if (folding && this.folding <= 0) this.finishFold();

    // fire
    if (!folding && Game.canFire()) {
      const pc2 = CFG.player; const rate = pc2.fireRate * Anom.fireRateMul() * Mods.fire;
      for (const b of this.branches) {
        b.fireT -= dt;
        if (b.fireT <= 0) { b.fireT += 1 / rate; if (b.fireT < 0) b.fireT = 0; this.fireFrom(b.px, b.py, phaseIndex(this.phase(b))); }
      }
      for (let i = this.ghosts.length - 1; i >= 0; i--) {
        const g = this.ghosts[i]; g.life -= dt; if (g.life <= 0) { this.ghosts.splice(i, 1); continue; }
        g.fireT -= dt; if (g.fireT <= 0) { g.fireT += 1 / rate; this.fireFrom(this.x + g.ox, this.y + g.oy, g.ci, true); }
      }
    }
  },
  project(b, spread) {
    const nq = this.nq;
    if (nq === 0) { b.tx = 0; b.ty = 0; b.depth = 0; b.sc = 1; return; }
    const v = [0, 0, 0, 0, 0, 0];
    for (let q = 0; q < nq; q++) v[q] = ((b.bits >> q) & 1) ? 1 : -1;
    const planes = ROT_PLANES[Math.min(nq, ROT_PLANES.length - 1)];
    for (const [i, j, w] of planes) {
      const a = this.rotT * w; const c = Math.cos(a), s = Math.sin(a);
      const vi = v[i], vj = v[j]; v[i] = vi * c - vj * s; v[j] = vi * s + vj * c;
    }
    let sc = 1, depth = 0;
    const F = 3.2;
    for (let d = nq - 1; d >= 2; d--) {
      const f = F / (F - v[d] * 0.5); sc *= f; depth += v[d];
      for (let k = 0; k < d; k++) v[k] *= f;
    }
    let x = v[0] * spread, y = (nq >= 2 ? v[1] : 0) * spread;
    if (nq === 1) { const a = this.rotT * 0.35; const c = Math.cos(a), s = Math.sin(a); const x2 = x * c; y = x * s; x = x2; }
    b.tx = x; b.ty = y; b.depth = depth; b.sc = sc;
  },
  fireFrom(x, y, ci, ghost) {
    const pc = CFG.player;
    let a;
    if (this.aimPoint) {
      const dx = wdx(this.aimX - x), dy = wdy(this.aimY - y);
      a = (dx * dx + dy * dy > 3600) ? Math.atan2(dy, dx) : this.aimA;
    } else a = this.aimA;
    a += (Math.random() - 0.5) * 0.045;
    const c = Math.cos(a), s = Math.sin(a);
    const sp = pc.bulletSpeed * (0.97 + Math.random() * 0.06), dmg = pc.bulletDmg * Mods.dmg;
    if (Mods.spread) {
      for (let k = -Mods.spread; k <= Mods.spread; k++) { const aa = a + k * 0.11, cc = Math.cos(aa), ss = Math.sin(aa); Bullets.firePlayer(x + cc * 12, y + ss * 12, cc * sp, ss * sp, dmg * (k ? 0.6 : 1), ci, ghost); }
    } else Bullets.firePlayer(x + c * 12, y + s * 12, c * sp, s * sp, dmg, ci, ghost);
    if (!ghost) Anom.onPlayerFire(a, this.n);
    Audio2.shot(this.n);
  },

  draw(ctx) {
    if (this.dead) return;
    const t = Game.rt;
    // entanglement bonds (hypercube edges)
    if (this.n > 1) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.4;
      const bs = this.branches;
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const x = bs[i].bits ^ bs[j].bits; if (x & (x - 1)) continue;
        ctx.strokeStyle = PAL_CSS[phaseIndex(this.phase(bs[i]))];
        ctx.globalAlpha = 0.22;
        ctx.beginPath(); ctx.moveTo(ix(bs[i].px), iy(bs[i].py)); ctx.lineTo(ix(bs[i].px) + wdx(bs[j].px - bs[i].px), iy(bs[i].py) + wdy(bs[j].py - bs[i].py)); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // many-worlds ghosts
    for (const g of this.ghosts) {
      const s = CFG.player.drawSize * 0.9;
      ctx.globalAlpha = 0.28 * Math.min(1, g.life / 1.2);
      ctx.drawImage(catSprite(g.ci, 1), ix(this.x + g.ox) - s / 2, iy(this.y + g.oy) - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    // cats, far to near
    const order = this.branches.slice().sort((a, b) => a.depth - b.depth);
    const base = CFG.player.drawSize * CATSCALE[this.nq];
    const variant = this.happyT > 0 ? 3 : this.blinkT < 0 ? 1 : 0;
    const flick = this.invuln > 0 && !this.meas ? (Math.sin(t * 40) > 0 ? 0.45 : 1) : 1;
    const deco = this.nq > 0 ? clamp(1 - this.coh / 35, 0, 1) : 0;
    for (const b of order) {
      const p = this.prob(b);
      const s = base * b.sc * (1 + b.flash * 0.6);
      let x = ix(b.px), y = iy(b.py);
      if (deco > 0) { x += (Math.random() - 0.5) * 6 * deco; y += (Math.random() - 0.5) * 6 * deco; }
      const ci = phaseIndex(this.phase(b));
      ctx.globalAlpha = flick * (this.n === 1 ? 1 : clamp(0.42 + 0.58 * Math.sqrt(p * this.n) * (0.7 + 0.3 * b.sc), 0.25, 1)) * (deco > 0 && Math.random() < deco * 0.25 ? 0.4 : 1);
      ctx.drawImage(catSprite(ci, variant), x - s / 2, y - s * 0.52, s, s);
    }
    ctx.globalAlpha = 1;
    // hitbox dots
    const big = Settings.bigDots, hr = CFG.player.hitR * (big ? 1 : 0.6);
    if (big) { ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; for (const b of this.branches) { ctx.beginPath(); ctx.arc(ix(b.px), iy(b.py), hr + 1, 0, TAU); ctx.stroke(); } }
    ctx.fillStyle = big ? '#fff36b' : '#fff';
    for (const b of this.branches) { ctx.beginPath(); ctx.arc(ix(b.px), iy(b.py), hr, 0, TAU); ctx.fill(); }
  },
};
