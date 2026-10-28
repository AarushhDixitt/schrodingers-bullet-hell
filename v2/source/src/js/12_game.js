// ---------- settings ----------
const Settings = {
  sound: true, music: true, voice: true, shake: !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches), shakeAmt: 1, autoAim: false,
  vol: 0.85, musicVol: 0.6, sfxVol: 0.9, fx: 1, flashes: true, theme: 'auto', slowmo: true, popups: true, bigDots: false, lefty: false, hints: true, fps: false,
};
(() => { const s = store('settings'); if (s) Object.assign(Settings, s); })();
const saveSettings = () => store('settings', Settings);

// ---------- the game ----------
const Game = {
  state: 'boot', mode: 'attract',
  t: 0, rt: 0, realDt: 0, timeScale: 1, slowT: 0, slowScale: 1, hitStop: 0,
  wave: 0, score: 0, mult: 1, lives: CFG.lives, nextLife: 75000,
  enemies: [], spawns: [], triads: [], pickups: [], magnetars: [], speech: [], banners: [], card: null,
  boss: null, tx: W / 2, ty: H / 2,
  variant: 'campaign', diffId: 'graduate', level: 1, scoreMul: 1, runActive: false,
  wall: null, box: null, dark: [], higgs: [], bossBF: null, zaps: [], bossHits: 0, waveSplits: 0, foldKills: 0, inFold: false, chainDepth: 0,
  enemySpeedMul: 1, fireRateMul: 1, hpMul: 1, bulletSpeedMul: 1,
  stats: null, post: null, toasts: new Set(), lastToast: 0, cohFlash: 0, kickIn: 0, dropPity: 0,
  mods: { xflip: false },
  dyingT: 0,

  freshStats() {
    return { shapes: new Set(), kills: 0, splits: 0, folds: 0, measurements: 0, survived: 0, observed: 0, decohered: 0, deaths: 0, maxBranches: 1, log10p: 0, time: 0, wavesCleared: 0, bossKills: 0, grazes: 0, causes: {}, bestMult: 1, dieRolls: [], lastCause: '', anomsSeen: new Set(), pickups: 0, bosses: [], startWave: 1 };
  },
  freshPost() { return { glitch: 0, invert: 0, rewind: 0, flash: [1, 1, 1, 0], ca: 0, ripples: [] }; },

  init() {
    this.stats = this.freshStats(); this.post = this.freshPost();
    Theme.init();
    Grid.init();
  },
  resetWorld() {
    if (this.boss && this.boss.bossDef && this.boss.bossDef.cleanup) this.boss.bossDef.cleanup(this.boss);
    this.enemies = []; this.spawns = []; this.triads = []; this.pickups = []; this.magnetars = []; this.speech = []; this.banners = []; this.card = null;
    this.boss = null; Bullets.clear(); FX.clear(); Grid.reset(); Anom.clear(); World.wrap = false;
    this.wall = null; this.box = null; this.bossBF = null; this.dark = []; this.higgs = []; this.zaps = [];
    cam.rot = 0; Anom.unwind = false; cam.free = false;
    this.timeScale = 1; this.slowT = 0; this.hitStop = 0; this.post = this.freshPost();
  },
  // a timer that only fires if the same run is still going
  later(ms, fn) { const id = this.runId; setTimeout(() => { if (this.runId === id) fn(); }, ms); },
  newRun(mode, startWave = 1, opts = {}) {
    if (this.runActive) this.endRun('quit');
    this.runId = (this.runId || 0) + 1; UI.toastQ.length = 0;
    this.resetWorld();
    this.mode = mode; this.state = 'playing';
    this.variant = mode === 'arcade' ? (opts.variant || 'campaign') : 'campaign';
    this.diffId = mode === 'arcade' && DIFFS[opts.diff] ? opts.diff : mode === 'arcade' ? Save.d.last.diff : 'graduate';
    const D = DIFFS[this.diffId];
    this.scoreMul = mode === 'arcade' ? D.score : 1;
    this.score = 0; this.mult = 1; this.dropPity = 0;
    this.lives = D.lives + (mode === 'arcade' && Save.d.useUpg ? (Save.d.upg.life || 0) : 0);
    this.nextLife = D.noExtra ? Infinity : 100000;
    this.stats = this.freshStats(); this.stats.startWave = startWave; this.t = 0; this.dyingT = 0;
    Mods.newRun(mode === 'arcade');
    Player.reset(W / 2, H / 2 + 120);
    cam.x = Player.x; cam.y = Player.y;
    Director.def = null; Director.phase = 'idle'; Director.lastBoss = null;
    this.runActive = mode === 'arcade';
    if (mode === 'arcade') {
      Save.d.last = { diff: this.diffId, variant: this.variant, chapter: this.variant === 'campaign' ? chapterOf(startWave) : Save.d.last.chapter };
      Save.write();
      Director.start(startWave);
      // starting partway through: bring along a discovery for every boss skipped
      const skipped = this.variant === 'campaign' ? chapterOf(startWave) - 1 : 0;
      for (let k = 0; k < skipped; k++) { const o = Mods.offer(1); if (o.length) Mods.take(o[0]); }
      if (skipped) this.later(4200, () => UI.note('Head start', `You begin with ${skipped} discover${skipped === 1 ? 'y' : 'ies'} from earlier papers. The pause menu lists them.`));
      if (Save.d.useUpg && Save.d.upg.start && !Bot.on) UI.showChoice('Prior publication', 'Your grant lets you start with one discovery. Choose it.', () => {});
    }
    else if (mode === 'lab') { this.wave = 6; this.setDifficulty(6); Theme.chapter(0, 1.5); Audio2.setKey(0); Audio2.music('wave', 6); this.banner('THE LABORATORY', 'Toggle laws of physics on the right.', 2.2); }
    else if (mode === 'attract') { this.wave = 4; this.setDifficulty(3); Attract.reset(); Player.invuln = 1e9; this.state = 'title'; Audio2.setKey(0); }
    UI.onRunStart(mode);
  },
  setDifficulty(L) {
    const D = DIFFS[this.diffId] || DIFFS.graduate, k = Math.max(0, L - 1), over = Math.max(0, L - 36);
    this.level = L;
    this.enemySpeedMul = D.espd * (1 + 0.55 * (1 - Math.exp(-k / 24)) + 0.006 * over);
    this.fireRateMul = D.fire * (1 + 0.8 * (1 - Math.exp(-k / 22)) + 0.012 * over);
    this.bulletSpeedMul = D.bspd * (1 + 0.35 * (1 - Math.exp(-k / 26)) + 0.004 * over);
    this.hpMul = D.hp * (1 + 0.06 * Math.max(0, L - 5));
  },

  // ----- frame -----
  frame(realDt) {
    this.realDt = realDt; this.rt += realDt;
    const playing = this.state === 'playing' || this.state === 'title';
    // input → actions
    let inp;
    if (this.mode === 'attract' || Bot.on) inp = Bot.think(realDt);
    else inp = readInput(Settings.autoAim);
    if (this.state === 'playing') {
      if (consumeEdge('pause')) { UI.pause(); }
      if (consumeEdge('mute')) { UI.toggleSetting('sound'); }
      if (this.mode !== 'attract' && !Bot.on) {
        if (consumeEdge('split')) Player.split();
        if (consumeEdge('fold')) Player.fold();
      }
    }
    if (Bot.on || this.mode === 'attract') { if (inp.split) Player.split(); if (inp.fold) Player.fold(); }
    if (this.state !== 'playing') { pollPad(); UI.padNav(); }
    Theme.update(realDt);
    if (!playing) { this.renderOnly(); return; }

    // time
    if (this.slowT > 0) { this.slowT -= realDt; this.timeScale += (this.slowScale - this.timeScale) * damp(18, realDt); }
    else this.timeScale += (1 - this.timeScale) * damp(6, realDt);
    if (this.hitStop > 0) { this.hitStop -= realDt; }
    const ts = this.hitStop > 0 ? 0 : this.timeScale * (this.debugSpeed || 1);
    let simDt = Math.min(realDt, 1 / 20) * ts;
    const steps = Math.min(16, Math.max(1, Math.ceil(simDt / SIM_DT - 1e-6)));
    const h = simDt / steps;
    if (simDt > 0) for (let s = 0; s < steps; s++) this.step(h, inp);
    // per-frame things
    Grid.update(realDt);
    this.updateCamera(realDt);
    this.updatePost(realDt);
    for (let i = this.banners.length - 1; i >= 0; i--) { const b = this.banners[i]; b.t += realDt; if (b.t > b.dur) this.banners.splice(i, 1); }
    if (this.card) { this.card.t += realDt; if (this.card.t > this.card.dur) this.card = null; }
    for (let i = this.speech.length - 1; i >= 0; i--) { const s = this.speech[i]; s.t += realDt; if (s.t > s.dur) this.speech.splice(i, 1); }
    this.cohFlash = Math.max(0, this.cohFlash - realDt);
    this.howT = (this.howT || 0) + realDt;
    if (this.touchHintT > 0 && !this.card && this.state === 'playing') { this.touchHintT -= realDt; if ((Input.sticks.move || Input.sticks.aim) && this.touchHintT > 0.8) this.touchHintT = 0.8; }
    if (this.state === 'playing' && this.dyingT > 0) { this.dyingT -= realDt; if (this.dyingT <= 0) this.gameOver(); }
    Audio2.update(realDt);
    clearEdges();
    if (!this.noRender) this.render();
  },
  renderOnly() { Grid.update(this.realDt); this.updatePost(this.realDt); clearEdges(); if (!this.noRender) this.render(); },

  step(dt, inp) {
    this.t += dt;
    if (this.mode !== 'attract') this.stats.time += dt;
    const ws = Anom.worldTimeScale() * (Player.echo > 0 ? 0.5 : 1);
    const edt = dt * ws;
    // target: the expectation value ⟨x⟩
    if (!Player.dead) { const [ex, ey] = Player.expect(); this.tx = ex; this.ty = ey; }
    // things that bend the world around them
    this.higgs.length = 0; this.dark.length = 0;
    for (const e of this.enemies) { if (e.dead || e.spawning) continue; if (e.type === 'higgs') this.higgs.push(e); else if (e.type === 'darkmatter') this.dark.push(e); }
    const boss = this.boss && !this.boss.dead ? this.boss : null;
    this.bossBF = boss && boss.bossDef.bulletForce ? boss : null;
    Player.update(dt, inp);
    if (boss && boss.bossDef.constrain && !Player.dead) boss.bossDef.constrain(boss, Player);
    Anom.update(dt);
    if (this.mode === 'arcade') Director.update(dt);
    else if (this.mode === 'attract') Attract.update(dt);
    // spawn markers
    for (let i = this.spawns.length - 1; i >= 0; i--) {
      const s = this.spawns[i]; s.t += edt;
      if (s.t >= s.dur + s.delay) {
        this.spawns.splice(i, 1);
        if (s.type === '@triad') spawnTriad(s.x, s.y); else this.addEnemy(s.type, s.x, s.y, s.opts);
        FX.burst(s.x, s.y, 10, 140, PI_.white, { life: 0.35, size: 3 });
        Grid.impulse(s.x, s.y, 120, 120);
      }
    }
    // enemies
    this.magnetars.length = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt); if (e.linkFlash) e.linkFlash = Math.max(0, e.linkFlash - dt);
      e.heavy = false;
      if (this.higgs.length && !e.boss && e.type !== 'higgs') for (const h of this.higgs) { const dx = wdx(e.x - h.x), dy = wdy(e.y - h.y); if (dx * dx + dy * dy < h.aura * h.aura) { e.heavy = true; break; } }
      const m = Anom.enemyTimeMul(e) * (e.heavy ? 0.6 : 1); const et = edt * m;
      e.frozen = m === 0;
      if (et > 0) { e.t += et; e.def.update(e, et); if (!e.dead) Anom.enemyForce(e, et); }
      if (e.type === 'magnetar') this.magnetars.push(e);
      if (e.boss && e.phase < 3 && !e.dead) { const th = e.bossDef.phases || [0.5, 0.25]; if (e.hp <= e.maxHp * th[e.phase - 1]) this.bossPhase(e); }
    }
    for (const T of this.triads) updateTriad(T, edt * Anom.triadSpeedMul(T));
    // bullets
    Bullets.updatePlayer(dt);
    Bullets.updateEnemy(edt);
    // collisions
    EGrid.build(this.enemies);
    this.collidePlayerBullets();
    if (!Player.dead) this.collidePlayer(dt);
    this.updatePickups(dt);
    for (let i = this.zaps.length - 1; i >= 0; i--) { this.zaps[i].t += dt; if (this.zaps[i].t > 0.22) this.zaps.splice(i, 1); }
    FX.update(dt);
    // cleanup
    if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
    if (this.triads.length) this.triads = this.triads.filter(T => !(T.done && T.members.every(m => !m)) && !(T.members.every(m => !m) && T.regen.every(r => r <= 0)));
  },

  // ----- entities -----
  addEnemy(type, x, y, opts = {}) {
    const def = ET[type]; if (!def) return null;
    const e = { id: uid(), type, def, x, y, vx: 0, vy: 0, r: def.r, hp: Math.ceil(def.hp * this.hpMul), t: 0, flash: 0, dead: false, score: def.score, col: PI_[def.col], mass: def.mass || 1, partner: null, sp: null, zombie: !!opts.zombie, gridR: def.gridR || 0 };
    e.maxHp = e.hp;
    def.init && def.init(e, opts);
    if (e.zombie) e.col = PI_.green;
    this.enemies.push(e);
    Anom.onAdd(e);
    if (!e.zombie) Guide.firstSeen('enemy:' + type);
    return e;
  },
  queueSpawn(type, x, y, delay = 0, opts) {
    const bx = this.box, x0 = bx ? bx.x0 : 0, x1 = bx ? bx.x1 : W, y0 = bx ? bx.y0 : 0, y1 = bx ? bx.y1 : H;
    if (!World.wrap) { x = clamp(x, x0 + 40, x1 - 40); y = clamp(y, y0 + 40, y1 - 40); } else { x = wrapX(x); y = wrapY(y); }
    // never right on top of the cat
    const dx = wdx(x - Player.x), dy = wdy(y - Player.y);
    if (dx * dx + dy * dy < 170 * 170) { const d = Math.sqrt(dx * dx + dy * dy) || 1; x = Player.x + dx / d * 170; y = Player.y + dy / d * 170; if (!World.wrap) { x = clamp(x, 40, W - 40); y = clamp(y, 40, H - 40); } }
    this.spawns.push({ type, x, y, t: 0, dur: 0.75, delay, opts });
  },
  spawnBoss(kind, cycle = 0, hpMul = 1) {
    const def = BOSS_DEFS[kind];
    const D = DIFFS[this.diffId] || DIFFS.graduate;
    const b = { id: uid(), type: kind, def, boss: true, x: W / 2, y: 300, vx: 0, vy: 0, r: def.r, hp: Math.round(def.hp * (this.mode === 'arcade' ? D.boss : 1) * (1 + 0.35 * cycle) * hpMul * (this.mode === 'lab' ? 0.7 : 1)), t: 0, flash: 0, dead: false, score: def.score, col: PI_[def.col], phase: 1, invuln: false, mass: 100, sp: null };
    this.bossHits = 0;
    b.maxHp = b.hp;
    def.init(b);
    b.def = { ...def, update: (e, dt) => def.update(e, dt), draw: (e, ctx) => def.draw(e, ctx) };
    b.bossDef = def;
    this.enemies.push(b); this.boss = b; this.bossSub = null;
    Guide.firstSeen('boss:' + kind);
    FX.ring(b.x, b.y, 20, 600, 1.1, b.col, 8); Grid.impulse(b.x, b.y, 900, 600); addTrauma(0.7);
    this.post.flash = [...PAL[b.col].map(c => c / 255), 0.5];
    Audio2.sfx('bossIntro');
    return b;
  },
  removeBoss() {
    const b = this.boss;
    if (b) { b.dead = true; if (b.bossDef.cleanup) b.bossDef.cleanup(b); }
    this.enemies = this.enemies.filter(e => !e.boss); this.boss = null; this.bossBF = null;
  },
  bossPhase(b) {
    b.phase++;
    if (b.bossDef.onPhase) b.bossDef.onPhase(b);
    this.hitStop = 0.12; addTrauma(0.6);
    FX.ring(b.x, b.y, 30, 420, 0.8, b.col, 6); Grid.impulse(b.x, b.y, 800, 500);
    this.clearBulletsNear(b.x, b.y, 2000, true);
    this.banner(b.phase === 2 ? 'PHASE II' : 'PHASE III', b.bossDef.name + ' is getting serious.', 1.6);
    Audio2.sfx('bossPhase');
    Audio2.music('boss2', this.wave);
  },
  damageEnemy(e, dmg, x, y, viaLink) {
    if (e.dead || e.spawning) return;
    if (e.boss && (e.invuln || Director.phase === 'bossIntro')) { FX.spawn(x, y, 0, 0, 0.12, 5, PI_.dim); return; }
    if (e.heavy) dmg *= 0.5;
    e.hp -= dmg; e.flash = 0.07;
    if (!e.boss || Math.random() < 0.35) FX.sparks(x, y, e.boss ? 2 : 3, 260, e.col, Math.atan2(y - e.y, x - e.x), 1.6, 0.3);
    Audio2.hit(e.boss);
    if (e.partner && !viaLink && !e.partner.dead) { e.linkFlash = e.partner.linkFlash = 0.18; this.damageEnemy(e.partner, dmg, e.partner.x, e.partner.y, true); }
    if (e.hp <= 0) this.killEnemy(e, 'shot');
  },
  killEnemy(e, cause, silent) {
    if (e.dead) return;
    e.dead = true;
    const x = e.x, y = e.y;
    if (e.boss) { this.bossDeath(e); return; }
    e.def.onDeath && e.def.onDeath(e);
    if (!silent) {
      FX.shatter(x, y, e.col, 7 + Math.round(e.r / 3), e.r * 1.1, 200 + e.r * 6);
      FX.burst(x, y, 10 + e.r, 150 + e.r * 9, [e.col, PI_.white], { life: 0.55, size: 3.4 });
      FX.ring(x, y, e.r * 0.5, e.r * 3.2, 0.35, e.col, 2.4);
      if (Math.random() < 0.7) FX.track(x, y, e.r > 15 ? 4 : 2, [e.col, PI_.white, e.col], 200 + e.r * 8);
      Grid.impulse(x, y, 120 + e.r * 9, 90 + e.r * 4);
      Audio2.explode(e.r);
      addTrauma(e.r > 20 ? 0.25 : 0.04);
    }
    if (cause === 'shot' || cause === 'fold' || cause === 'blackhole' || cause === 'annihilate' && !silent || cause === 'chain') {
      this.stats.kills++;
      this.mult = Math.min(CFG.multMax, this.mult + CFG.multStep * (1 + 0.25 * Player.nq));
      this.stats.bestMult = Math.max(this.stats.bestMult, this.mult);
      this.addScore(e.score * (e.zombie ? 1.5 : 1), x, y);
      this.drop(e);
      if (this.inFold) this.foldKills++;
      if (this.chainDepth < 4) {
        this.chainDepth++;
        if (Mods.chain && cause !== 'chain') this.chainArc(x, y, 2.5 * Mods.chain);
        if (Mods.anti && cause === 'shot' && Math.random() < Mods.anti) this.annihilate(x, y, 105, 4);
        this.chainDepth--;
      }
    }
    if (e.partner && !e.partner.dead) { const p = e.partner; e.partner = null; p.partner = null; FX.text(p.x, p.y - 20, 'spooky action', PI_.gold, { size: 12, font: 'serif' }); this.killEnemy(p, 'chain'); }
    Anom.onKill(e);
  },
  chainArc(x, y, dmg) {
    let best = null, bd = 270 * 270;
    for (const e of this.enemies) { if (e.dead || e.spawning || e.ghost || e.type === 'virtual') continue; const p = e.boss && e.bossDef.aimPoint ? e.bossDef.aimPoint(e, x, y) : e; const dx = wdx(p.x - x), dy = wdy(p.y - y), d = dx * dx + dy * dy - (e.boss ? 60000 : 0); if (d < bd && d > 4) { bd = d; best = e; } }
    if (!best) return;
    const p = best.boss && best.bossDef.aimPoint ? best.bossDef.aimPoint(best, x, y) : best;
    this.zaps.push({ x0: x, y0: y, x1: p.x, y1: p.y, t: 0, seed: Math.random() * 99 });
    this.damageEnemy(best, dmg, p.x, p.y, true);
  },
  bossDeath(b) {
    if (b.bossDef.cleanup) b.bossDef.cleanup(b);
    this.bossBF = null;
    this.stats.bossKills++; this.stats.bosses.push(b.type);
    if (this.mode === 'arcade' && !Bot.on) {
      const first = !Save.d.beaten[b.type];
      Save.d.beaten[b.type] = (Save.d.beaten[b.type] || 0) + 1;
      if (first) { const n = Save.award(150 * DIFFS[this.diffId].cites); this.later(1500, () => UI.note('First defeat of ' + b.bossDef.name, '+' + n + ' citations.')); }
      Ach.unlock('b_' + b.type);
      if (this.bossHits === 0) Ach.unlock('flawless');
      Save.write();
    }
    b.bossDef.onDeath && b.bossDef.onDeath(b);
    this.hitStop = 0.25; this.slowmo(1.6, 0.25);
    addTrauma(1);
    for (let k = 0; k < 6; k++) setTimeout(() => { FX.burst(b.x + rand(-80, 80), b.y + rand(-80, 80), 50, 520, [b.col, PI_.white, PI_.gold], { life: 1, size: 5 }); FX.ring(b.x, b.y, 20, 300 + k * 80, 0.9, b.col, 6); Audio2.explode(60); }, k * 140);
    FX.shatter(b.x, b.y, b.col, 60, 40, 600);
    FX.track(b.x, b.y, 36, [b.col, PI_.white, PI_.gold, PI_.cyan], 620);
    Grid.impulse(b.x, b.y, 1800, 900);
    this.post.flash = [1, 1, 1, 0.9]; this.post.glitch = 1;
    this.clearBulletsNear(b.x, b.y, 4000, true);
    this.addScore(b.score, b.x, b.y - 40, 'boss down');
    for (let k = 0; k < 5; k++) this.spawnPickup(k === 0 ? pick(['H', 'T', 'F']) : 'cool', b.x + rand(-90, 90), b.y + rand(-60, 60));
    Audio2.sfx('bossDeath');
    Audio2.say(b.bossDef.name.replace('’', '') + ' collapsed.');
  },
  annihilate(x, y, r, dmg, hurtsPlayer) {
    FX.ring(x, y, 6, r, 0.4, PI_.pink, 4); FX.ring(x, y, 4, r * 0.7, 0.3, PI_.white, 3);
    FX.burst(x, y, 24, 320, [PI_.pink, PI_.white], { life: 0.45, size: 4 });
    FX.text(x, y - 10, 'γ γ', PI_.white, { size: 16, font: 'serif', life: 0.7 });
    Grid.impulse(x, y, 400, r * 1.6); addTrauma(0.15); Audio2.sfx('annihilate');
    for (const e of this.enemies) {
      if (e.dead || e.spawning) continue;
      const dx = wdx(e.x - x), dy = wdy(e.y - y);
      if (dx * dx + dy * dy < (r + e.r) ** 2) this.damageEnemy(e, dmg, e.x, e.y);
    }
    if (hurtsPlayer && !Player.dead) {
      const hit = Player.branches.filter(b => { const dx = wdx(b.px - x), dy = wdy(b.py - y); return dx * dx + dy * dy < r * r; });
      if (hit.length) Player.measureHit(hit, 'annihilation');
    }
  },
  foldBlast(x, y, N) {
    const R2 = (130 + 70 * Math.log2(Math.max(2, N))) * Mods.foldR, dmg = (4 + 2.6 * N) * Mods.foldDmg;
    this.inFold = true; this.foldKills = 0;
    FX.ring(x, y, 10, R2, 0.55, PI_.cyan, 7); FX.ring(x, y, 10, R2 * 0.75, 0.45, PI_.magenta, 4); FX.ring(x, y, 10, R2 * 1.1, 0.7, PI_.gold, 2);
    for (let k = 0; k < 4; k++) FX.burst(x, y, 16, R2 * 2.2, k * 8, { life: 0.55, size: 4 });
    Grid.impulse(x, y, 1100 + N * 40, R2 * 1.4);
    this.post.ripples.push({ x, y, r: 0, max: R2 * 1.3, t: 0, life: 0.6, a: 0.025 });
    addTrauma(0.3 + N * 0.02); this.post.ca = Math.max(this.post.ca, 0.012);
    Audio2.sfx('fold', N); Audio2.meow(N >= 8 ? 'big' : 'happy');
    let absorbed = 0;
    for (let i = Bullets.en - 1; i >= 0; i--) {
      const dx = wdx(Bullets.ex[i] - x), dy = wdy(Bullets.ey[i] - y);
      if (dx * dx + dy * dy < R2 * R2) { FX.spawn(Bullets.ex[i], Bullets.ey[i], dx * 1.5, dy * 1.5, 0.4, 4, Bullets.ecol[i]); Bullets.killE(i); absorbed++; }
    }
    if (absorbed) this.addScore(absorbed * 10, x, y - 70, absorbed + ' bullets absorbed');
    for (const e of this.enemies) {
      if (e.dead || e.spawning) continue;
      const dx = wdx(e.x - x), dy = wdy(e.y - y), d = Math.sqrt(dx * dx + dy * dy);
      if (d < R2 + e.r) {
        const k = 1 - 0.5 * d / (R2 + e.r);
        if (!e.boss) { e.vx += dx / (d || 1) * 600 / e.mass; e.vy += dy / (d || 1) * 600 / e.mass; }
        if (e.boss) this.damageEnemy(e, dmg * k, e.x, e.y); else { e.hp -= dmg * k; e.flash = 0.1; if (e.hp <= 0) this.killEnemy(e, 'fold'); }
      }
    }
    FX.text(x, y - 40, 'Ĥ' + (N > 2 ? '^⊗' + Math.log2(N).toFixed(0) : '') + '  fold ×' + N, PI_.cyan, { size: 16, font: 'serif', life: 0.9 });
    this.inFold = false;
    if (this.foldKills >= 8) Ach.unlock('chain8');
    if (N >= 16) Ach.unlock('fold16');
  },
  beamHit(x, y, a, L, hw, owner) {
    if (Player.dead || Player.invuln > 0) return;
    const c = Math.cos(a), s = Math.sin(a);
    const hit = Player.branches.filter(b => {
      const dx = wdx(b.px - x), dy = wdy(b.py - y); const t = dx * c + dy * s; if (t < 0 || t > L) return false;
      return Math.abs(dx * s - dy * c) < hw + CFG.player.hitR;
    });
    if (hit.length) Player.measureHit(hit, owner && owner.boss ? owner.bossDef.name : 'laser');
  },

  // ----- collisions -----
  collidePlayerBullets() {
    const B = Bullets; const boss = this.boss && !this.boss.dead ? this.boss : null;
    for (let i = 0; i < B.pn; i++) {
      const x = B.px[i], y = B.py[i];
      const wave = B.pkind[i] === 1; const br = wave ? 6 + B.pw[i] * 0.8 : 3;
      let consumed = false;
      if (boss) {
        const m = boss.bossDef.hit(boss, boss.x + wdx(x - boss.x), boss.y + wdy(y - boss.y));
        if (m > 0 && B.plast[i] !== boss.id) {
          this.damageEnemy(boss, B.pdmg[i] * m * (wave ? 0.7 : 1), x, y);
          if (m > 1 && Math.random() < 0.3) FX.text(x, y - 10, 'weak point', PI_.white, { size: 11, life: 0.5 });
          if (B.pflag[i] & 2 || wave) B.plast[i] = boss.id; else consumed = true;
        }
      }
      if (!consumed) {
        const cs = EGrid.cell;
        const i0 = Math.floor((x - br) / cs), i1 = Math.floor((x + br) / cs), j0 = Math.floor((y - br) / cs), j1 = Math.floor((y + br) / cs);
        outer:
        for (let cj = j0; cj <= j1; cj++) for (let ci = i0; ci <= i1; ci++) {
          const cell = EGrid.at(ci * cs + 1, cj * cs + 1); if (!cell) continue;
          for (const e of cell) {
            if (e.dead || e.boss || e.ghost || B.plast[i] === e.id) continue;
            if (e.def.shield && e.def.shield(e, x, y)) { if (B.pflag[i] & 2 || wave) B.plast[i] = e.id; else consumed = true; break outer; }
            const pts = e.sp || null;
            if (pts) {
              for (let k = 0; k < pts.length; k++) {
                const dx = wdx(x - (e.x + pts[k].dx)), dy = wdy(y - (e.y + pts[k].dy));
                if (dx * dx + dy * dy < (e.r + br) ** 2) { this.hitSuperposed(e, k, x, y, B.pdmg[i]); consumed = !(B.pflag[i] & 2 || wave); if (!consumed) B.plast[i] = e.id; break outer; }
              }
            } else {
              const dx = wdx(x - e.x), dy = wdy(y - e.y);
              if (dx * dx + dy * dy < (e.r + br) ** 2) {
                this.damageEnemy(e, B.pdmg[i] * (wave ? 0.7 : 1), x, y);
                if (B.pflag[i] & 2 || wave) { B.plast[i] = e.id; if (wave) B.pdmg[i] *= 0.8; } else consumed = true;
                break outer;
              }
            }
          }
        }
      }
      if (consumed) { B.plife[i] = 0; }
    }
  },
  hitSuperposed(e, k, x, y, dmg) {
    const K = e.sp.length;
    if (Math.random() < 1 / K) {
      const p = e.sp[k]; e.x += p.dx; e.y += p.dy; e.sp = null;
      FX.text(e.x, e.y - 18, 'real (1/' + K + ')', PI_.white, { size: 12, font: 'serif', life: 0.8 });
      this.recordOutcome(1 / K);
      this.damageEnemy(e, dmg, x, y);
    } else {
      const p = e.sp[k];
      FX.burst(e.x + p.dx, e.y + p.dy, 10, 120, e.col, { life: 0.35 });
      FX.text(e.x + p.dx, e.y + p.dy - 16, 'not here', PI_.dim, { size: 11, font: 'serif', life: 0.6 });
      e.sp.splice(k, 1);
      if (e.sp.length === 1) { const q = e.sp[0]; e.x += q.dx; e.y += q.dy; e.sp = null; }
      Audio2.sfx('pop');
    }
  },
  collidePlayer(dt) {
    const P = Player, B = Bullets, hr = CFG.player.hitR;
    let maxOff = 0; for (const b of P.branches) maxOff = Math.max(maxOff, Math.abs(b.ox) + Math.abs(b.oy));
    const reach = maxOff + 40;
    const invuln = P.invuln > 0 || P.folding > 0;
    let hitSet = null; const hitBullets = [];
    for (let i = 0; i < B.en; i++) {
      if (B.edelay[i] > 0) continue;
      const dxc = wdx(B.ex[i] - P.x), dyc = wdy(B.ey[i] - P.y);
      if (Math.abs(dxc) > reach || Math.abs(dyc) > reach) continue;
      const r = B.er[i];
      for (const b of P.branches) {
        const dx = wdx(B.ex[i] - b.px), dy = wdy(B.ey[i] - b.py), d2 = dx * dx + dy * dy;
        if (d2 < (r * 0.78 + hr) ** 2) {
          if (!invuln) { (hitSet || (hitSet = [])).includes(b) || hitSet.push(b); hitBullets.push(i); }
        } else if (d2 < (r + CFG.grazeR) ** 2 && !(B.eflag[i] & 1)) {
          B.eflag[i] |= 1; this.stats.grazes++;
          this.addScore(8 * Mods.graze, b.px, b.py, null, true);
          P.coh = Math.min(CFG.coh.max, P.coh + 0.6 * Mods.graze);
          FX.sparks(b.px + dx * 0.5, b.py + dy * 0.5, 2, 160, PI_.white, Math.atan2(-dy, -dx), 1.2, 0.2);
          Audio2.sfx('graze');
        }
      }
    }
    // enemy bodies
    if (!invuln) {
      for (const e of this.enemies) {
        if (e.dead || e.spawning) continue;
        if (e.boss) {
          const tf = e.bossDef.touch;
          for (const b of P.branches) {
            const dx = wdx(b.px - e.x), dy = wdy(b.py - e.y);
            if (tf ? tf(e, e.x + dx, e.y + dy, hr) : dx * dx + dy * dy < (e.r * 0.85 + hr) ** 2) { (hitSet || (hitSet = [])).includes(b) || hitSet.push(b); }
          }
          continue;
        }
        if (e.ghost) continue;
        const dxc = wdx(e.x - P.x), dyc = wdy(e.y - P.y);
        if (Math.abs(dxc) > reach + 110 || Math.abs(dyc) > reach + 110) continue;
        if (e.sp) {
          for (let k = 0; k < e.sp.length; k++) {
            const ex = e.x + e.sp[k].dx, ey = e.y + e.sp[k].dy;
            const touch = P.branches.filter(b => { const dx = wdx(b.px - ex), dy = wdy(b.py - ey); return dx * dx + dy * dy < (e.r + hr) ** 2; });
            if (touch.length) {
              const K = e.sp.length;
              if (Math.random() < 1 / K) { e.x = ex; e.y = ey; e.sp = null; this.recordOutcome(1 / K); for (const b of touch) (hitSet || (hitSet = [])).includes(b) || hitSet.push(b); }
              else { this.recordOutcome(1 - 1 / K); e.sp.splice(k, 1); if (e.sp.length === 1) { e.x += e.sp[0].dx; e.y += e.sp[0].dy; e.sp = null; } FX.text(ex, ey - 16, 'not real', PI_.dim, { size: 11, font: 'serif', life: 0.6 }); }
              break;
            }
          }
          continue;
        }
        let touched = false;
        for (const b of P.branches) {
          const dx = wdx(b.px - e.x), dy = wdy(b.py - e.y);
          if (dx * dx + dy * dy < (e.r * 0.85 + hr) ** 2) { (hitSet || (hitSet = [])).includes(b) || hitSet.push(b); touched = true; }
        }
        if (touched) { const d = Math.hypot(dxc, dyc) || 1; e.vx += dxc / d * 500 / e.mass; e.vy += dyc / d * 500 / e.mass; this.damageEnemy(e, 2, e.x, e.y); }
      }
    }
    if (hitSet && hitSet.length) {
      // remove the bullets that did the measuring
      hitBullets.sort((a, b) => b - a);
      let last = -1; for (const i of hitBullets) { if (i === last) continue; last = i; B.killE(i); }
      P.measureHit(hitSet, 'bullet');
    }
  },

  // ----- pickups -----
  drop(e) {
    if (e.noDrop || this.mode === 'attract') return;
    this.dropPity += Mods.drops;
    if (Math.random() < (0.06 + e.r / 260) * (0.8 + 0.2 * Mods.drops)) this.spawnPickup('cool', e.x, e.y);
    if (this.dropPity >= 34 && Math.random() < 0.5) { this.dropPity = 0; this.spawnPickup(this.rollPower(), e.x, e.y); }
  },
  rollPower() {
    const opts = ['H', 'T', 'F', 'E', 'S']; if (this.mode === 'arcade' && this.lives < 9) opts.push('C');
    return weightedPick(opts, k => k === 'C' ? 0.3 : k === 'E' || k === 'S' ? 0.8 : 1);
  },
  spawnPickup(kind, x, y) { this.pickups.push({ kind, x, y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0, life: kind === 'cool' ? 9 : 14 }); Guide.firstSeen('pickup:' + kind); },
  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]; p.t += dt;
      if (p.t > p.life) { this.pickups.splice(i, 1); continue; }
      p.vx *= Math.exp(-2 * dt); p.vy *= Math.exp(-2 * dt);
      if (Anom.active('gravity')) p.vy += GRAV * 0.3 * dt;
      // magnet
      let best = null, bd = 1e9;
      if (!Player.dead) for (const b of Player.branches) { const dx = wdx(b.px - p.x), dy = wdy(b.py - p.y), d = dx * dx + dy * dy; if (d < bd) { bd = d; best = b; } }
      const mr = 170 * Mods.magnet;
      if (best && bd < mr * mr) { const d = Math.sqrt(bd) || 1; p.vx += wdx(best.px - p.x) / d * 1400 * dt; p.vy += wdy(best.py - p.y) / d * 1400 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (World.wrap) { p.x = wrapX(p.x); p.y = wrapY(p.y); } else { p.x = clamp(p.x, 10, W - 10); p.y = clamp(p.y, 10, H - 10); }
      if (best && bd < 26 * 26) { this.collect(p); this.pickups.splice(i, 1); }
    }
  },
  collect(p) {
    const P = Player, du = Mods.powerDur;
    this.stats.pickups++;
    if (p.kind === 'cool') { P.coh = Math.min(CFG.coh.max, P.coh + 14); FX.text(p.x, p.y - 14, '15 mK', PI_.ice, { size: 12 }); Audio2.sfx('pickup'); }
    else if (p.kind === 'H') { P.boost = 14 * du; this.banner('Ĥ⁺ BOOST', 'A fifth qubit. Up to 32 cats for ' + Math.round(14 * du) + ' seconds.', 1.6); Audio2.sfx('power'); Audio2.say('Thirty two cats.'); }
    else if (p.kind === 'T') { P.pierce = 12 * du; this.banner('T GATE', 'Piercing shots for ' + Math.round(12 * du) + ' seconds.', 1.4); Audio2.sfx('power'); }
    else if (p.kind === 'F') { P.fridge = 9 * du; P.coh = CFG.coh.max; this.banner('DILUTION FRIDGE', 'No decoherence for ' + Math.round(9 * du) + ' seconds. Split freely.', 1.6); Audio2.sfx('power'); }
    else if (p.kind === 'E') {
      const n = this.clearBulletsNear(Player.x, Player.y, 1e5, true);
      this.post.flash = [0.85, 1, 1, 0.45]; Grid.impulse(Player.x, Player.y, 900, 900);
      this.banner('QUANTUM ERASER', 'Which-path information erased. So were ' + n + ' bullets.', 1.6); Audio2.sfx('power');
    }
    else if (p.kind === 'S') { P.echo = 7 * du; this.banner('SPIN ECHO', 'Everything but you runs at half speed for ' + Math.round(7 * du) + ' seconds.', 1.6); Audio2.sfx('power'); }
    else if (p.kind === 'C') { this.lives = Math.min(99, this.lives + 1); this.banner('ILLEGAL CLONE', 'The no-cloning theorem says this is impossible. One extra life.', 1.8); Audio2.sfx('life'); }
    FX.burst(p.x, p.y, 16, 200, p.kind === 'cool' ? PI_.ice : PI_.gold, { life: 0.5 });
  },

  // ----- scoring & outcomes -----
  addScore(base, x, y, label, quiet) {
    const pts = Math.round(base * this.mult * this.scoreMul);
    if (this.mode === 'attract') return pts;
    this.score += pts;
    if (!quiet && x !== undefined && (Settings.popups || label)) FX.text(x, y - 8, label ? label + '  +' + fmtInt(pts) : '+' + fmtInt(pts), label ? PI_.gold : PI_.chalk, { size: label ? 14 : 11, life: label ? 1.3 : 0.7, vy: -50 });
    if (this.mode === 'arcade' && this.score >= this.nextLife) {
      this.nextLife = this.nextLife < 250000 ? 250000 : this.nextLife < 500000 ? 500000 : this.nextLife * 2; if (this.lives < 99) this.lives++;
      this.banner('EXTRA TIMELINE', 'Another life, from a branch where things went better.', 1.8); Audio2.sfx('life'); Audio2.meow('happy');
    }
    return pts;
  },
  recordOutcome(p) { if (p > 0 && p < 1) this.stats.log10p += Math.log10(p); },
  onSurvive(p) {
    this.buzz(25);
    if (p >= 0.5 - 1e-9) Ach.unlock('coin');
    if (p >= 0.75 - 1e-9) Ach.unlock('odds');
    this.post.ca = Math.max(this.post.ca, 0.008); this.post.glitch = Math.max(this.post.glitch, 0.25);
    addTrauma(0.2);
    if (Math.random() < 0.35) Audio2.say(pick(['Alive.', 'Still alive.', 'Not this time.', 'The universe chose you.']));
  },
  onPlayerDeath(cause, x, y) {
    this.stats.deaths++; this.stats.lastCause = cause || 'bullet';
    this.stats.causes[cause] = (this.stats.causes[cause] || 0) + 1;
    if (this.mode !== 'lab' && this.mode !== 'attract') this.lives--;
    this.mult = 1;
    this.buzz([70, 40, 140]);
    FX.burst(x, y, 70, 520, [PI_.red, PI_.white, PI_.magenta], { life: 1.1, size: 5 });
    FX.shatter(x, y, PI_.red, 18, 18, 420);
    FX.track(x, y, 10, [PI_.red, PI_.magenta, PI_.white], 420);
    FX.ring(x, y, 10, 260, 0.8, PI_.red, 6);
    FX.text(x, y - 40, '|dead⟩', PI_.red, { size: 30, font: 'serif', life: 1.8, vy: -20 });
    Grid.impulse(x, y, 1500, 500);
    this.post.flash = [1, 0.2, 0.3, 0.55]; this.post.glitch = 1; this.post.ca = 0.02;
    addTrauma(0.95); this.hitStop = 0.08;
    this.clearBulletsNear(x, y, 340, false);
    Audio2.sfx('death'); Audio2.meow('sad');
    if (this.mode === 'arcade' && this.lives <= 0) { this.dyingT = 2.4; Audio2.say('The cat is dead.'); this.slowmo(2.4, 0.2); }
    else if (this.mode === 'arcade') Audio2.say(pick(['The cat is dead.', 'Dead. In this timeline.', 'Collapse confirmed.']));
  },
  clearBulletsNear(x, y, r, toScore) {
    let n = 0;
    for (let i = Bullets.en - 1; i >= 0; i--) {
      const dx = wdx(Bullets.ex[i] - x), dy = wdy(Bullets.ey[i] - y);
      if (dx * dx + dy * dy < r * r) { if (Math.random() < 0.5) FX.spawn(Bullets.ex[i], Bullets.ey[i], 0, -40, 0.5, 4, Bullets.ecol[i]); Bullets.killE(i); n++; }
    }
    if (toScore && n) this.addScore(n * 5, x, y, null, true);
    return n;
  },
  slowmo(dur, scale) { if (!Settings.slowmo) { scale = Math.max(scale, 0.75); dur *= 0.5; } this.slowScale = this.slowT > 0 ? Math.min(this.slowScale, scale) : scale; this.slowT = Math.max(this.slowT, dur); },
  gameOver() {
    this.state = 'over';
    Audio2.drone(false); Audio2.crush(false); Audio2.tempo(1); Audio2.pan(0);
    Audio2.music('over', this.wave);
    UI.showGameOver(this.endRun('dead'));
  },
  beginEnding() {
    Player.invuln = 1e9; this.clearBulletsNear(Player.x, Player.y, 1e5, false);
    Theme.set({ bg: [34, 28, 18], grid: [120, 100, 60], hot: [255, 236, 190], arena: [255, 220, 150], neb: [[255, 236, 190], [255, 207, 74], [255, 255, 255]] }, 3);
    this.banner('THE BOX IS OPEN', 'The cat is alive.', 4);
    this.post.flash = [1, 1, 0.9, 0.9];
    Audio2.sfx('life'); Audio2.say('The box is open. The cat is alive.');
    for (let k = 0; k < 8; k++) setTimeout(() => FX.ring(Player.x, Player.y, 20, 300 + k * 120, 1.2, k % 2 ? PI_.gold : PI_.white, 5), k * 260);
  },
  victory() {
    this.state = 'won';
    if (this.mode === 'arcade' && !Bot.on) {
      Save.d.unlock.endless = true; Save.d.unlock.rush = true; Save.d.cleared[this.diffId] = true;
      if (this.diffId === 'postdoc' || this.diffId === 'reviewer2') Ach.unlock('tenure');
      if (this.diffId === 'reviewer2') Ach.unlock('reviewer');
    }
    Audio2.music('title', 1);
    UI.showVictory(this.endRun('win'));
  },
  // book-keeping when a run ends (death, victory, or quitting): records, citations, lifetime stats
  endRun(outcome) {
    if (!this.runActive) return null;
    this.runActive = false;
    if (Bot.on || this.mode !== 'arcade') return null;
    const st = this.stats, S = Save.d, D = DIFFS[this.diffId], V = this.variant;
    if (outcome === 'quit' && st.time < 15) return null;
    const rec = Save.rec(V, this.diffId);
    const res = { isBest: this.score > rec.score && this.score > 0, bestWave: this.wave > rec.wave, cites: 0, win: outcome === 'win', prevBest: rec.score };
    rec.runs++; rec.score = Math.max(rec.score, this.score); rec.wave = Math.max(rec.wave, this.wave); rec.kills = Math.max(rec.kills, st.kills);
    if (res.win) { rec.clears++; if (!rec.fastest || st.time < rec.fastest) rec.fastest = Math.round(st.time); }
    res.cites = Save.award((8 * Math.sqrt(this.score / 1000) + 6 * st.wavesCleared + 60 * st.bossKills + (res.win ? 400 : 0)) * D.cites);
    const L = S.life;
    L.runs++; L.time += st.time; L.kills += st.kills; L.deaths += st.deaths; L.splits += st.splits; L.folds += st.folds; L.survived += st.survived;
    L.measurements += st.measurements; L.observed += st.observed; L.decohered += st.decohered; L.grazes += st.grazes; L.wavesCleared += st.wavesCleared;
    L.bossKills += st.bossKills; L.pickups += st.pickups;
    L.maxCats = Math.max(L.maxCats, st.maxBranches); L.bestMult = Math.max(L.bestMult, st.bestMult); L.bestOdds = Math.min(L.bestOdds, st.log10p);
    S.hist.unshift({ d: Date.now(), v: V, df: this.diffId, s: this.score, w: this.wave, t: Math.round(st.time), k: st.kills, o: outcome === 'win' ? 'win' : outcome === 'quit' ? 'quit' : (st.lastCause || 'bullet') });
    if (S.hist.length > 30) S.hist.length = 30;
    if (this.score >= 1e6) Ach.unlock('million');
    if (st.log10p <= -6) Ach.unlock('improbable');
    if (st.log10p <= -15) Ach.unlock('astro');
    if (st.grazes >= 100) Ach.unlock('graze100');
    if (L.kills >= 5000) Ach.unlock('kills5k');
    if (V === 'endless' && this.wave >= 20) Ach.unlock('endless20');
    if (V === 'endless' && this.wave >= 40) Ach.unlock('endless40');
    Save.write();
    return res;
  },
  onWaveStart(d) {
    this.waveSplits = 0;
    if (this.mode === 'arcade' && this.variant === 'campaign' && !Bot.on && d.chapter > Save.reached(this.diffId)) { Save.d.reached[this.diffId] = d.chapter; Save.write(); }
  },
  onWaveClear(d) {
    if (this.mode !== 'arcade') return;
    if (d.n === 1 && this.variant === 'campaign') Ach.unlock('first');
    if (d.n >= 3 && !d.boss && this.waveSplits === 0) Ach.unlock('classical');
  },

  // ----- helpers -----
  farPoint(minDist = 300, margin = 80) {
    for (let k = 0; k < 40; k++) {
      const x = rand(margin, W - margin), y = rand(margin, H - margin);
      const dx = wdx(x - Player.x), dy = wdy(y - Player.y);
      if (dx * dx + dy * dy > minDist * minDist) return { x, y };
    }
    return { x: Player.x > W / 2 ? margin * 2 : W - margin * 2, y: Player.y > H / 2 ? margin * 2 : H - margin * 2 };
  },
  autoTarget(x, y) {
    let best = null, bd = 1e12;
    for (const e of this.enemies) {
      if (e.dead || e.spawning) continue;
      if (e.ghost) continue;
      const p = e.boss && e.bossDef.aimPoint ? e.bossDef.aimPoint(e, x, y) : e;
      const dx = wdx(p.x - x), dy = wdy(p.y - y), d = dx * dx + dy * dy - (e.boss ? 200000 : 0) + (e.type === 'darkmatter' ? 160000 : 0);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  },
  inView(x, y, pad = 0) { const v = this._vr || viewRect(0); return ix(x) > v.x0 - pad && ix(x) < v.x1 + pad && iy(y) > v.y0 - pad && iy(y) < v.y1 + pad; },
  canFire() { return (this.state === 'playing' || this.state === 'title') && !Player.dead && this.dyingT <= 0; },
  say(e, text, dur = 1.8, detach) { this.speech.push({ e: detach ? null : e, x: e.x, y: e.y, text, t: 0, dur }); if (this.speech.length > 8) this.speech.shift(); },
  bossLine(b, text) { this.bossSub = { text, t: 0 }; },
  banner(title, sub, dur = 1.8) { this.banners.push({ title, sub, t: 0, dur }); if (this.banners.length > 2) this.banners.shift(); },
  waveCard(n, name, eq, line, boss, how, tag) { this.card = { n, name, eq, line, boss, how, tag, t: 0, dur: 3.8 }; this.howT = 0; },
  toast(msg) { UI.toast(msg); },
  toastOnce(key, msg) { if (this.toasts.has(key) || !Settings.hints) return; this.toasts.add(key); UI.note('', msg, 5200); },
  buzz(p) { try { if (Input.touchMode && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no haptics */ } },
  flashCoh() { this.cohFlash = 0.6; },

  updateCamera(dt) {
    let tx = Player.x, ty = Player.y;
    if (this.boss && !this.boss.dead && Director.phase === 'bossIntro') { tx = this.boss.x; ty = this.boss.y; }
    // lead toward the aim a little
    if (!Player.dead && this.state === 'playing') { tx += Math.cos(Player.aimA) * 60; ty += Math.sin(Player.aimA) * 40; }
    if (this.mode === 'attract' && R.cssW >= 1180) tx -= (R.sw / cam.zoom) * 0.2;
    // bosses that live at the top of the arena keep themselves in frame (the cat always wins)
    const bt = this.boss && !this.boss.dead && this.boss.bossDef.camTop && Director.phase !== 'bossIntro' && !Player.dead ? this.boss.bossDef.camTop(this.boss) : null;
    if (bt !== null) { const hh = R.sh / 2 / cam.zoom; if (ty > bt + hh) ty = Math.max(bt + hh, Player.y - hh + 90); }
    const bz = this.boss && !this.boss.dead && this.boss.bossDef.camTop && R.cssH >= 600 ? 0.9 : 1;
    const z = cam.baseZoom * bz * (this.boss && Director.phase === 'bossIntro' ? 1.05 : 1) * (1 - Math.min(0.08, Player.nq * 0.015));
    cam.zoom += (z - cam.zoom) * damp(3, dt);
    if (World.wrap) {
      cam.x += wdx(tx - cam.x) * damp(5, dt); cam.y += wdy(ty - cam.y) * damp(5, dt);
      cam.x = wrapX(cam.x); cam.y = wrapY(cam.y);
    } else {
      cam.x += (tx - cam.x) * damp(5, dt); cam.y += (ty - cam.y) * damp(5, dt);
      if (!cam.free && !cam.rot) {
        const hw = R.sw / 2 / cam.zoom, hh = R.sh / 2 / cam.zoom, m = 90;
        cam.x = hw * 2 >= W + 2 * m ? W / 2 : clamp(cam.x, hw - m, W + m - hw);
        cam.y = hh * 2 >= H + 2 * m ? H / 2 : clamp(cam.y, hh - m, H + m - hh);
      }
    }
    cam.trauma = Math.max(0, cam.trauma - dt * 1.4);
    const sh = cam.trauma * cam.trauma * 26 * R.rs;
    cam.t += dt * 22;
    cam.shakeX = noise1(cam.t) * sh; cam.shakeY = noise1(cam.t + 100) * sh;
    this._vr = viewRect(0);
  },
  updatePost(dt) {
    const P = this.post;
    P.glitch = Math.max(0, P.glitch - dt * 2.2);
    P.invert = Math.max(0, P.invert - dt * 4);
    P.ca = Math.max(0, P.ca - dt * 0.03);
    P.flash[3] = Math.max(0, P.flash[3] - dt * 2.2);
    for (let i = P.ripples.length - 1; i >= 0; i--) { const r = P.ripples[i]; r.t += dt; r.r = r.max * easeOutCubic(r.t / r.life); if (r.t >= r.life) P.ripples.splice(i, 1); }
  },
};
