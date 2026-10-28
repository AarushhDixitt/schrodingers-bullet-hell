// ---------- settings (defaults; the settings screen is generated from SETTINGS_UI) ----------
const Settings = {
  sound: true, music: true, voice: true, shake: !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches), shakeAmt: 1, autoAim: false,
  vol: 0.85, musicVol: 0.6, sfxVol: 0.9, fx: 1, flashes: true, theme: 'auto', slowmo: true, popups: true, bigDots: false, lefty: false, hints: true, fps: false,
  gridWarp: true, camRotate: true, pixelate: true, bulletOutline: 'off', keys: null, cb: 'off', vibrate: true, vibAmt: 1,
  hudScale: 1, hudMinimal: false, odds: true, splits: false, announcer: 'some', voiceName: '', musicPick: 'auto', aimAssist: 0.6, btnPos: null, btnSize: 1,
};
(() => { const s = store('settings'); if (s) Object.assign(Settings, s); })();
const saveSettings = () => store('settings', Settings);

// ---------- the game ----------
const Game = {
  state: 'boot', mode: 'attract',
  t: 0, rt: 0, realDt: 0, timeScale: 1, slowT: 0, slowScale: 1, hitStop: 0,
  wave: 0, score: 0, mult: 1, lives: 9, nextLife: 75000,
  enemies: [], spawns: [], triads: [], pickups: [], speech: [], banners: [], card: null,
  boss: null, tx: W / 2, ty: H / 2,
  variant: 'campaign', diffId: 'graduate', level: 1, scoreMul: 1, runActive: false,
  wall: null, box: null, zaps: [], bossHits: 0, waveSplits: 0, foldKills: 0, inFold: false, chainDepth: 0,
  enemySpeedMul: 1, fireRateMul: 1, hpMul: 1, bulletSpeedMul: 1,
  stats: null, post: null, toasts: new Set(), cohFlash: 0, dropPity: 0, dyingT: 0,

  // the difficulty, as it stands at the current level: warnings, gaps in bullet walls and coherence drain tighten slowly as you go on
  get D() { const b = DIFFS[this.diffId] || DIFFS.graduate; return this._Dp && this._Dp.base === b ? this._Dp : b; },
  get god() { return Calib.on && Calib.v.god; },
  // how long warnings last (difficulty, and bosses get extra)
  tele(boss) { return (this.mode === 'arcade' ? this.D.tele : 1) * (boss ? CFG.boss.tele : 1); },
  freshStats() { return { shapes: new Set(), kills: 0, splits: 0, folds: 0, perfect: 0, measurements: 0, survived: 0, observed: 0, decohered: 0, deaths: 0, maxBranches: 1, log10p: 0, time: 0, wavesCleared: 0, bossKills: 0, eliteKills: 0, grazes: 0, causes: {}, bestMult: 1, dieRolls: [], lastCause: '', pickups: 0, bosses: [], startWave: 1, catsLost: 0, lost: [], medals: 0, events: 0, mergers: 0, lucky: null, waveTimes: [], bossDmg: 0, windowDmg: 0, papers: [], records: [], killsBy: {}, lawWaves: {}, eventsBy: {}, perks: 0, rerolls: 0 }; },
  freshPost() { return { glitch: 0, invert: 0, rewind: 0, flash: [1, 1, 1, 0], ca: 0, ripples: [] }; },
  init() { this.stats = this.freshStats(); this.post = this.freshPost(); Theme.init(); Grid.init(); },
  resetWorld() {
    if (this.boss && this.boss.bossDef.cleanup) this.boss.bossDef.cleanup(this.boss);
    Object.assign(this, { enemies: [], spawns: [], triads: [], pickups: [], speech: [], banners: [], zaps: [], card: null, boss: null, wall: null, box: null, timeScale: 1, slowT: 0, hitStop: 0, post: this.freshPost() });
    Bullets.clear(); FX.clear(); Grid.reset(); Anom.clear(); Holes.clear(); Events.clear(); World.wrap = false;
    cam.rot = 0; Anom.unwind = false; cam.free = false;
  },
  // a timer that only fires if the same run is still going
  later(ms, fn) { const id = this.runId; setTimeout(() => { if (this.runId === id) fn(); }, ms); },
  newRun(mode, startWave = 1, opts = {}) {
    if (this.runActive) this.endRun('quit');
    this.runId = (this.runId || 0) + 1; UI.toastQ.length = 0;
    this.resetWorld();
    const arcade = mode === 'arcade';
    this.mode = mode; this.state = 'playing';
    this.variant = arcade ? (opts.variant || 'campaign') : 'campaign';
    this.diffId = arcade ? (DIFFS[opts.diff] ? opts.diff : Save.d.last.diff) : 'graduate';
    const D = this.D;
    this.scoreMul = arcade ? D.score : 1;
    Object.assign(this, { score: 0, mult: 1, dropPity: 0, t: 0, dyingT: 0, stats: this.freshStats(), expCh: 0, exp: null });
    this.lives = D.lives + (arcade && Save.d.useUpg ? (Save.d.upg.life || 0) : 0);
    this.nextLife = D.noExtra ? Infinity : 100000;
    this.stats.startWave = startWave;
    Mods.newRun(arcade);
    Player.branches = []; Player.name = ''; Lineage.newRun(); Player.name = Flavour.name(true); Player.ghosts = []; Feed.clear();
    Player.reset(W / 2, H / 2 + 120);
    cam.x = Player.x; cam.y = Player.y;
    Director.def = null; Director.phase = 'idle'; Director.lastBoss = null;
    this.runActive = arcade;
    if (arcade) {
      Save.d.last = { diff: this.diffId, variant: this.variant, chapter: this.variant === 'campaign' ? chapterOf(startWave) : Save.d.last.chapter };
      Save.write();
      if (this.variant === 'programme') Programme.begin(); else Director.start(startWave);
      const skipped = this.variant === 'campaign' ? chapterOf(startWave) - 1 : 0; // starting partway: a school and a discovery for every boss skipped
      const head = () => {
        for (let k = 0; k < skipped; k++) { const o = Mods.offer(1); if (o.length) Mods.take(o[0]); }
        if (skipped) this.later(4200, () => UI.note('Head start', `You begin with ${skipped} discover${skipped === 1 ? 'y' : 'ies'} from earlier papers. The pause menu lists them.`));
        if (Save.d.useUpg && Save.d.upg.start && !Bot.on) UI.showChoice('Prior publication', 'Your grant lets you start with one discovery. Choose it.', () => {});
      };
      if (skipped && !Bot.on) UI.showSchool(head); else { if (skipped) Mods.choose(pick(Object.keys(SCHOOLS))); head(); }
    }
    else if (mode === 'lab') { this.wave = 6; this.setDifficulty(6); Theme.chapter(0, 1.5); Audio2.setKey(0); Audio2.music('wave', 6); this.banner('THE LABORATORY', 'Toggle laws of physics on the right.', 2.2); }
    else if (mode === 'tutorial') { this.wave = 1; this.setDifficulty(1); this.lives = 99; Theme.chapter(0, 1.5); Audio2.music('tutorial', 1); Tutorial.start(); }
    else if (mode === 'attract') { this.wave = 4; this.setDifficulty(3); Attract.reset(); Player.invuln = 1e9; this.state = 'title'; Audio2.setKey(0); }
    UI.onRunStart(mode);
  },
  setDifficulty(L) {
    const D = this.D, k = Math.max(0, L - 1), over = Math.max(0, L - CAMPAIGN.length), ramp = (a, s) => a * (1 - Math.exp(-k / s));
    this.level = L;
    this.enemySpeedMul = D.espd * (1 + ramp(0.55, 24) + 0.006 * over);
    this.fireRateMul = D.fire * (1 + ramp(0.8, 22) + 0.012 * over);
    this.bulletSpeedMul = D.bspd * (1 + ramp(0.35, 26) + 0.004 * over);
    this.hpMul = D.hp * (1 + 0.06 * Math.max(0, L - 5));
    const b = DIFFS[this.diffId] || DIFFS.graduate;
    this._Dp = Object.assign({}, b, { base: b, tele: b.tele * (1 - ramp(0.16, 28)), gap: b.gap * (1 - ramp(0.14, 28)), drain: b.drain * (1 + ramp(0.25, 28) + 0.003 * over) });
  },

  // ----- frame -----
  frame(realDt) {
    this.realDt = realDt; this.rt += realDt;
    const playing = this.state === 'playing' || this.state === 'title', auto = this.mode === 'attract' || Bot.on;
    const inp = auto ? Bot.think(realDt) : readInput(Settings.autoAim);
    if (this.state === 'playing') {
      if (consumeEdge('pause')) UI.pause();
      if (consumeEdge('mute')) UI.toggleSetting('sound');
      if (!auto) { if (consumeEdge('split')) Player.split(); if (consumeEdge('fold')) Player.fold(); if (consumeEdge('dash')) Player.dash(); }
    }
    if (auto) { if (inp.split) Player.split(); if (inp.fold) Player.fold(); }
    if (this.state !== 'playing') { pollPad(); UI.padNav(); }
    Theme.update(realDt);
    if (!playing) { this.renderOnly(); return; }
    // time: slow motion eases in and out; hit-stop freezes briefly
    if (this.slowT > 0) { this.slowT -= realDt; this.timeScale += (this.slowScale - this.timeScale) * damp(18, realDt); }
    else this.timeScale += (1 - this.timeScale) * damp(6, realDt);
    if (this.hitStop > 0) this.hitStop -= realDt;
    const simDt = Math.min(realDt, 1 / 20) * (this.hitStop > 0 ? 0 : this.timeScale * (this.debugSpeed ?? 1));
    const steps = Math.min(16, Math.max(1, Math.ceil(simDt / SIM_DT - 1e-6)));
    if (simDt > 0) for (let s = 0; s < steps; s++) this.step(simDt / steps, inp);
    else if (this.stepReq) this.step(1 / 60, inp);
    this.stepReq = false;
    Grid.update(realDt); this.updateCamera(realDt); this.updatePost(realDt);
    const tick = (L, f) => { for (let i = L.length - 1; i >= 0; i--) if ((L[i].t += realDt) > L[i].dur) L.splice(i, 1); else if (f) f(L[i]); };
    tick(this.banners); tick(this.speech);
    if (this.card && (this.card.t += realDt) > this.card.dur) this.card = null;
    this.cohFlash = Math.max(0, this.cohFlash - realDt);
    this.howT = (this.howT || 0) + realDt;
    if (this.touchHintT > 0 && !this.card) { this.touchHintT -= realDt; if ((Input.sticks.move || Input.sticks.aim) && this.touchHintT > 0.8) this.touchHintT = 0.8; }
    if (this.dyingT > 0 && (this.dyingT -= realDt) <= 0) this.gameOver();
    Audio2.update(realDt);
    clearEdges();
    if (!this.noRender) this.render();
  },
  renderOnly() { Grid.update(this.realDt); this.updatePost(this.realDt); clearEdges(); if (!this.noRender) this.render(); },

  step(dt, inp) {
    this.t += dt;
    if (this.mode !== 'attract') this.stats.time += dt;
    const edt = dt * Anom.mul('worldTime') * (Player.echo > 0 ? 0.5 : 1);
    if (!Player.dead) [this.tx, this.ty] = Player.expect(); // the target: the expectation value ⟨x⟩
    Fields.begin();
    const boss = this.boss && !this.boss.dead ? this.boss : null;
    Player.update(dt, inp);
    if (boss && boss.bossDef.constrain && !Player.dead) boss.bossDef.constrain(boss, Player);
    Anom.update(dt); Holes.update(edt); Events.update(edt); Calib.tick(); Notes.tick(dt);
    if (this.mode === 'arcade') Director.update(dt); else if (this.mode === 'tutorial') Tutorial.update(dt); else if (this.mode === 'attract') Attract.update(dt);
    for (let i = this.spawns.length - 1; i >= 0; i--) { // spawn markers
      const s = this.spawns[i];
      if ((s.t += edt) < s.dur + s.delay) continue;
      this.spawns.splice(i, 1);
      if (s.by && !s.by.dead) this.summonBy = s.by;
      if (s.type[0] === '@') SPECIAL[s.type](s.x, s.y, s.opts); else this.addEnemy(s.type, s.x, s.y, s.opts);
      this.summonBy = null;
      FX.burst(s.x, s.y, 10, 140, PI_.white, { life: 0.35, size: 3 }); Grid.impulse(s.x, s.y, 120, 120);
    }
    const leaps = Anom.planck();
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.flash = Math.max(0, e.flash - dt); if (e.linkFlash) e.linkFlash = Math.max(0, e.linkFlash - dt);
      e.heavy = false;
      const m = Fields.slow.length ? Fields.time(e.x, e.y, K_EN, e) : 1, et = edt * m;
      e.frozen = m === 0;
      if (et > 0) {
        const q = leaps && !e.spawning;
        if (q) { if (e.qx === undefined) { e.qx = e.x; e.qy = e.y; e.qT = e.qGap = 0.2; } else { e.x = e.qx; e.y = e.qy; } } // ħ = 1: think and move from the true position
        e.t += et; if (e.boss) this.summonBy = e; e.def.update ? e.def.update(e, et) : enemyStep(e, et); this.summonBy = null;
        if (q && !e.dead) {
          const sx = e.x, sy = e.y; e.qx = sx; e.qy = sy;
          if ((e.qT -= et) <= 0) { // leap: the visible body jumps to where it really is
            const v = Math.hypot(e.vx, e.vy); e.qT = e.qGap = e.boss ? 0.12 : clamp(36 / Math.max(40, v), 0.16, 0.5) * (e.elite ? 0.6 : 1);
            if (e.lx !== undefined && Game.inView(e.lx, e.ly, 40) && (wdx(e.lx - sx) ** 2 + wdy(e.ly - sy) ** 2 > 64)) FX.ring(e.lx, e.ly, e.r * 0.4, e.r * 1.1, 0.16, e.col, 1.4);
            e.lx = sx; e.ly = sy;
          } else if (e.lx !== undefined) { e.x = e.lx; e.y = e.ly; }
          else { e.lx = sx; e.ly = sy; }
        }
        if (!e.dead && !e.boss) {
          if (Fields.acc.length) { const o = Fields.accel(e.x, e.y, K_EN); e.vx += o[0] * et; e.vy += o[1] * et; }
          if (Fields.sink.length && Fields.swallow(e.x, e.y, K_EN)) {
            if (!e.elite) { FX.text(e.x, e.y - 14, 'spaghettified', PI_.orange, { size: 12, font: 'serif' }); this.killEnemy(e, 'blackhole'); }
            else { // an elite is heavy enough to fight it: tidal forces tear it down over a few seconds
              e.hp -= (e.maxHp || 100) * 0.28 * et; e.flash = Math.max(e.flash || 0, 0.06);
              if (Math.random() < et * 6) FX.spawn(e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), 0, 0, 0.4, 4, PI_.orange);
              if ((e.tideT = (e.tideT || 0) - et) <= 0) { e.tideT = 1.2; FX.text(e.x, e.y - e.r - 12, 'tidal stress', PI_.orange, { size: 12, font: 'serif' }); }
              if (e.hp <= 0) { FX.text(e.x, e.y - 14, 'spaghettified', PI_.orange, { size: 14, font: 'serif' }); this.killEnemy(e, 'blackhole'); }
            }
          }
        }
      }
      if (e.boss && e.phase < 3 && !e.dead && e.hp <= e.maxHp * (e.bossDef.phases || [0.5, 0.25])[e.phase - 1]) this.bossPhase(e);
    }
    for (const T of this.triads) updateTriad(T, edt);
    Bullets.move(PB, dt); Bullets.move(EB, edt);
    EGrid.build(this.enemies);
    this.collidePlayerBullets();
    if (!Player.dead) this.collidePlayer();
    this.updatePickups(dt);
    for (let i = this.zaps.length - 1; i >= 0; i--) if ((this.zaps[i].t += dt) > 0.22) this.zaps.splice(i, 1);
    FX.update(dt);
    if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
    if (this.triads.length) this.triads = this.triads.filter(T => T.members.some(Boolean) || !T.done && T.regen.some(r => r > 0));
  },

  // ----- entities -----
  addEnemy(type, x, y, opts = {}) {
    const def = ET[type]; if (!def) return null;
    const e = { id: uid(), type, def, x, y, vx: 0, vy: 0, r: def.r, hp: Math.ceil(def.hp * this.hpMul), t: 0, flash: 0, dead: false, score: def.score, col: PI_[def.col], mass: def.mass || 1, partner: null, sp: null, zombie: !!opts.zombie, gridR: def.gridR || 0, ph: Math.random() * TAU, hideArrow: def.hideArrow };
    e.maxHp = e.hp;
    if (this.summonBy && !this.summonBy.dead) e.summoner = this.summonBy; // a boss's summons are part of it
    if (def.init) def.init(e, opts);
    if (e.zombie) e.col = PI_.green;
    this.enemies.push(e);
    Anom.each('onAdd', e);
    if (!e.zombie) { Guide.firstSeen('enemy:' + type); Notes.see('enemy:' + type); }
    return e;
  },
  queueSpawn(type, x, y, delay = 0, opts) {
    const bx = this.box, p = { x, y };
    if (World.wrap) { p.x = wrapX(x); p.y = wrapY(y); } else { p.x = clamp(x, (bx ? bx.x0 : 0) + 40, (bx ? bx.x1 : W) - 40); p.y = clamp(y, (bx ? bx.y0 : 0) + 40, (bx ? bx.y1 : H) - 40); }
    const dx = wdx(p.x - Player.x), dy = wdy(p.y - Player.y), d = Math.hypot(dx, dy); // never right on top of the cat
    if (d < 170) { p.x = Player.x + dx / (d || 1) * 170; p.y = Player.y + dy / (d || 1) * 170; if (!World.wrap) { p.x = clamp(p.x, 40, W - 40); p.y = clamp(p.y, 40, H - 40); } }
    this.spawns.push({ type, x: p.x, y: p.y, t: 0, dur: 0.75, delay, opts, by: this.summonBy || null });
  },
  spawnBoss(kind, cycle = 0, hpMul = 1) {
    const def = BOSS_DEFS[kind];
    const b = { id: uid(), type: kind, bossDef: def, boss: true, x: W / 2, y: 300, vx: 0, vy: 0, r: def.r, t: 0, flash: 0, dead: false, score: def.score, col: PI_[def.col], phase: 1, invuln: false, mass: 100, sp: null, queue: [], atk: null, at: 0, fire: 0 };
    b.hp = b.maxHp = Math.round(def.hp * CFG.boss.hp * (this.mode === 'arcade' ? this.D.boss : 1) * (1 + 0.35 * cycle) * hpMul * (this.mode === 'lab' ? 0.7 : 1));
    def.init(b);
    b.def = { update: (e, dt) => BK.update(e, dt, def), draw: (e, ctx) => def.draw(e, ctx), field: def.field };
    this.bossHits = 0;
    this.enemies.push(b); this.boss = b;
    Guide.firstSeen('boss:' + kind); Notes.see('boss:' + kind);
    FX.ring(b.x, b.y, 20, 600, 1.1, b.col, 8); Grid.impulse(b.x, b.y, 900, 600); addTrauma(0.7);
    this.post.flash = [...PAL[b.col].map(c => c / 255), 0.5];
    Audio2.sfx('bossIntro');
    return b;
  },
  removeBoss() {
    const b = this.boss;
    if (b) { b.dead = true; if (b.bossDef.cleanup) b.bossDef.cleanup(b); }
    this.enemies = this.enemies.filter(e => !e.boss); this.boss = null;
  },
  bossPhase(b) {
    b.phase++; Notes.obs('boss:' + b.type, 'phase');
    this.hitStop = 0.12; addTrauma(0.6);
    FX.ring(b.x, b.y, 30, 420, 0.8, b.col, 6); Grid.impulse(b.x, b.y, 800, 500);
    this.clearBulletsNear(b.x, b.y, 2000, true);
    this.banner(b.phase === 2 ? 'PHASE II' : 'PHASE III', b.bossDef.name + ' is getting serious.', 1.6);
    Audio2.sfx('bossPhase'); Audio2.music('boss2', this.wave);
  },
  damageEnemy(e, dmg, x, y, viaLink) {
    if (e.dead || e.spawning) return;
    if (e.boss && (e.invuln || Director.phase === 'bossIntro')) { FX.spawn(x, y, 0, 0, 0.12, 5, PI_.dim); return; }
    if (e.heavy) dmg *= 0.5;
    if (Mods.observe && !viaLink && Math.abs(angDiff(Player.aimA, Math.atan2(wdy(e.y - Player.y), wdx(e.x - Player.x)))) < 0.22) dmg *= 1.35;
    if (e.boss) { // bosses are armoured except while their mechanic's window is open
      const win = this.bossWindow(e);
      dmg *= CFG.boss.armour * (win ? CFG.boss.window : 1) * (e.bossDef.armourMul ? e.bossDef.armourMul(e) : 1);
      this.stats.bossDmg += dmg; if (win) { this.stats.windowDmg += dmg; Notes.obs('boss:' + e.type, 'window'); }
      if (!win && Math.random() < 0.06) FX.text(x, y - 12, 'armoured', PI_.dim, { size: 10, life: 0.4 });
    }
    if (e.def.armour) { dmg = e.def.armour(e, dmg, x, y); if (!dmg) return; }
    e.hp -= dmg; e.flash = 0.07;
    if (!e.boss || Math.random() < 0.35) FX.sparks(x, y, e.boss ? 2 : 3, 260, e.col, Math.atan2(y - e.y, x - e.x), 1.6, 0.3);
    Audio2.hit(e.boss);
    if (e.partner && !viaLink && !e.partner.dead) { e.linkFlash = e.partner.linkFlash = 0.18; this.damageEnemy(e.partner, dmg, e.partner.x, e.partner.y, true); }
    if (e.link && !viaLink && !e.link.dead) {
      const k = e.def.linkKind, p = e.link;
      if (k === 'share') { e.linkFlash = p.linkFlash = 0.18; this.damageEnemy(p, dmg, p.x, p.y, true); Notes.obs('enemy:twin', 'share'); }
      else if (k === 'mirror' && !(p.stunT > 0.3)) { p.stunT = 0.6; e.linkFlash = p.linkFlash = 0.3; Notes.obs('enemy:mirror', 'freeze'); }
    }
    if (e.hp <= 0) this.killEnemy(e, 'shot');
  },
  killEnemy(e, cause, silent) {
    if (e.dead) return;
    e.dead = true;
    if (e.boss) { this.bossDeath(e); return; }
    const x = e.x, y = e.y; if (!e.ghost) this.stats.killsBy[e.type] = (this.stats.killsBy[e.type] || 0) + 1;
    if (e.def.onDeath) e.def.onDeath(e);
    if (!silent) {
      FX.shatter(x, y, e.col, 7 + Math.round(e.r / 3), e.r * 1.1, 200 + e.r * 6);
      FX.burst(x, y, 10 + e.r, 150 + e.r * 9, [e.col, PI_.white], { life: 0.55, size: 3.4 });
      FX.ring(x, y, e.r * 0.5, e.r * 3.2, 0.35, e.col, 2.4);
      if (Math.random() < 0.7) FX.track(x, y, e.r > 15 ? 4 : 2, [e.col, PI_.white, e.col], 200 + e.r * 8);
      Grid.impulse(x, y, 120 + e.r * 9, 90 + e.r * 4); Audio2.explode(e.r); addTrauma(e.r > 20 ? 0.25 : 0.04);
    }
    if (['shot', 'fold', 'blackhole', 'chain'].includes(cause) || cause === 'annihilate' && !silent) {
      this.stats.kills++;
      this.mult = Math.min(CFG.multMax, this.mult + CFG.multStep * (1 + 0.25 * Player.nq));
      this.stats.bestMult = Math.max(this.stats.bestMult, this.mult);
      this.addScore(e.score * (e.zombie ? 1.5 : 1), x, y, e.elite ? e.def.name : null);
      if (!e.zombie) { Notes.obs('enemy:' + e.type, 'kill'); Notes.count('enemy:' + e.type); }
      this.drop(e);
      if (Mods.emission && Player.nq > 0 && Math.random() < Mods.emission) this.spawnPickup('cool', x, y);
      if (e.elite) this.eliteDown(e);
      if (e.summoner && !e.summoner.dead && e.summoner === this.boss) this.summonHurt(e, e.summoner);
      if (this.inFold) this.foldKills++;
      if (this.chainDepth < 4) {
        this.chainDepth++;
        if (Mods.chain && cause !== 'chain') this.chainArc(x, y, 2.5 * Mods.chain);
        if (Mods.anti && cause === 'shot' && Math.random() < Mods.anti) this.annihilate(x, y, 105, 4);
        this.chainDepth--;
      }
    }
    if (e.partner && !e.partner.dead) { const p = e.partner; e.partner = p.partner = null; FX.text(p.x, p.y - 20, 'spooky action', PI_.gold, { size: 12, font: 'serif' }); this.killEnemy(p, 'chain'); }
    if (e.link && !e.link.dead) { // an entangled partner: twins die together; cut an Anchor and what it holds collapses; mirror and Bell partners carry on alone
      const p = e.link, k = e.def.linkKind || p.def.linkKind; e.link = p.link = null;
      if (k === 'share') { FX.text(p.x, p.y - 20, 'spooky action?', PI_.gold, { size: 12, font: 'serif' }); Notes.obs('enemy:twin', 'together'); this.killEnemy(p, 'chain'); }
      else if (k === 'anchor') { FX.text(p.x, p.y - (p.r + 18), 'collapsed', PI_.violet, { size: 16, font: 'serif', life: 1.2 }); FX.ring(p.x, p.y, 10, p.r * 4, 0.5, PI_.violet, 4); Notes.obs('enemy:' + p.type, 'collapse'); Notes.obs('enemy:anchor', 'cut'); this.killEnemy(p, 'chain'); }
    }
    Anom.each('onKill', e);
  },
  // is the boss's weak window open? (a label for the HUD, or false)
  bossWindow(b) { return b.bossDef.window ? b.bossDef.window(b) : false; },
  // a boss's hittable point nearest to (x, y), or the enemy itself
  aimOf(e, x, y) { return e.boss && e.bossDef.aimPoint ? e.bossDef.aimPoint(e, x, y) : e; },
  // nearest hittable point of any enemy within r (bosses count as bossBias² closer); the enemy is left in nearE
  nearestEnemy(x, y, r, bossBias = 0) {
    let best = null, bd = r * r;
    for (const e of this.enemies) {
      if (e.dead || e.spawning || e.ghost || e.type === 'virtual') continue;
      const p = this.aimOf(e, x, y), d = wdx(p.x - x) ** 2 + wdy(p.y - y) ** 2 - (e.boss ? bossBias : 0);
      if (d < bd) { bd = d; best = p; this.nearE = e; }
    }
    return best;
  },
  chainArc(x, y, dmg) {
    const p = this.nearestEnemy(x, y, 270, 60000); if (!p) return;
    this.zaps.push({ x0: x, y0: y, x1: p.x, y1: p.y, t: 0, seed: Math.random() * 99 });
    this.damageEnemy(this.nearE, dmg, p.x, p.y, true);
  },
  bossDeath(b) {
    if (b.bossDef.cleanup) b.bossDef.cleanup(b);
    this.stats.bossKills++; this.stats.bosses.push(b.type);
    if (this.counts()) {
      Notes.obs('boss:' + b.type, 'beaten'); Notes.conclude('boss:' + b.type); Notes.flush();
      const first = !Save.d.beaten[b.type];
      Save.d.beaten[b.type] = (Save.d.beaten[b.type] || 0) + 1;
      if (first) { const n = Save.award(150 * this.D.cites); this.later(1500, () => UI.note('First defeat of ' + b.bossDef.name, '+' + n + ' citations.')); }
      const r = diffRank(this.diffId); for (let k = r; k >= 0; k--) Ach.unlock('b_' + b.type + (k ? '_' + (k + 1) : ''), false, k !== r); // this volume, and every easier one
      if (this.bossHits === 0) { Ach.unlock('flawless'); Save.medal('flawless:' + b.type + ':' + this.diffId, 1, `${b.bossDef.name} beaten without being measured once (${this.D.name}).`); }
      if (this.stats.bossDmg > 0 && this.stats.windowDmg / this.stats.bossDmg > 0.6) Ach.unlock('window');
      if (!Save.d.tracks[b.type]) { Save.d.tracks[b.type] = true; this.later(2600, () => UI.note('Track unlocked', `${b.bossDef.name}’s theme is now in the music player.`)); }
      Save.write();
    }
    this.stats.lastWin = this.stats.windowDmg / Math.max(1e-9, this.stats.bossDmg); this.stats.bossDmg = this.stats.windowDmg = 0;
    const E = this.exp, S = this.stats, res = E && this.variant === 'campaign' ? { ch: E.ch, time: S.time - E.t, surv: S.survived - E.surv, meas: S.measurements - E.meas, lost: S.catsLost - E.lost, log: S.log10p - E.log, win: this.stats.lastWin } : null;
    this.stats.papers.push({ boss: b.type, text: Flavour.abstract(b.type, this.stats), journal: Flavour.journal(), res });
    if (b.bossDef.onDeath) b.bossDef.onDeath(b);
    this.hitStop = 0.25; this.slowmo(1.6, 0.25); addTrauma(1);
    for (let k = 0; k < 6; k++) setTimeout(() => { FX.burst(b.x + rand(-80, 80), b.y + rand(-80, 80), 50, 520, [b.col, PI_.white, PI_.gold], { life: 1, size: 5 }); FX.ring(b.x, b.y, 20, 300 + k * 80, 0.9, b.col, 6); Audio2.explode(60); }, k * 140);
    FX.shatter(b.x, b.y, b.col, 60, 40, 600); FX.track(b.x, b.y, 36, [b.col, PI_.white, PI_.gold, PI_.cyan], 620);
    Grid.impulse(b.x, b.y, 1800, 900);
    this.post.flash = [1, 1, 1, 0.9]; this.post.glitch = 1;
    this.clearBulletsNear(b.x, b.y, 4000, true);
    this.addScore(b.score, b.x, b.y - 40, 'boss down');
    for (let k = 0; k < 5; k++) this.spawnPickup(k === 0 ? pick(['H', 'T', 'F']) : 'cool', b.x + rand(-90, 90), b.y + rand(-60, 60));
    Audio2.sfx('bossDeath'); Audio2.say(b.bossDef.name.replace('’', '') + ' collapsed.', 2); Input.rumble(1, 600);
  },
  // killing something a boss summoned takes a slice of the boss's health, straight through its armour
  summonHurt(e, b) {
    if (b.dead || Director.phase === 'bossIntro') return;
    const k = e.type === 'friend' ? 0.05 : e.type === 'bellpair' ? 0.02 : 0.015, dmg = Math.max(1, b.maxHp * k);
    b.hp = Math.max(0, b.hp - dmg); b.flash = 0.12;
    this.zaps.push({ x0: e.x, y0: e.y, x1: b.x, y1: b.y, t: 0, seed: Math.random() * 99 });
    FX.text(b.x, b.y - (b.r || 60) - 20, '−' + Math.round(k * 100) + '%', PI_.gold, { size: 16, life: 0.9 });
    Notes.obs('boss:' + b.type, 'summon');
    if (b.hp <= 0) this.killEnemy(b, 'shot');
  },
  eliteDown(e) {
    this.stats.eliteKills++; Feed.add(e.def.info[0] + ' defeated', 'gold', 'power-up dropped');
    for (let k = 0; k < Mods.eliteDrops; k++) this.spawnPickup(this.rollPower(), e.x + rand(-30, 30), e.y + rand(-30, 30));
    FX.ring(e.x, e.y, 10, 260, 0.7, PI_.gold, 6); this.hitStop = 0.06; addTrauma(0.4);
    if (!this.counts()) return;
    const L = Save.d.life; L.elites[e.type] = (L.elites[e.type] || 0) + 1;
    Ach.unlock('elite1'); if (ELITE_IDS.every(k => L.elites[k])) Ach.unlock('elites5');
  },
  // Copenhagen: a measurement you survive collapses violently
  collapseWave(x, y) {
    const R = 230 * (Mods.cascade ? 1.5 : 1);
    FX.ring(x, y, 10, R, 0.45, PI_.white, 5); Grid.impulse(x, y, 700, R);
    for (const e of this.enemies) if (!e.dead && !e.spawning && wdx(e.x - x) ** 2 + wdy(e.y - y) ** 2 < (R + e.r) ** 2) this.damageEnemy(e, 10 + 3 * Player.n, e.x, e.y);
    if (Mods.cascade) Bullets.clearNear(x, y, R * 0.8);
  },
  annihilate(x, y, r, dmg, hurtsPlayer) {
    FX.ring(x, y, 6, r, 0.4, PI_.pink, 4); FX.ring(x, y, 4, r * 0.7, 0.3, PI_.white, 3);
    FX.burst(x, y, 24, 320, [PI_.pink, PI_.white], { life: 0.45, size: 4 }); FX.text(x, y - 10, 'γ γ', PI_.white, { size: 16, font: 'serif', life: 0.7 });
    Grid.impulse(x, y, 400, r * 1.6); addTrauma(0.15); Audio2.sfx('annihilate');
    for (const e of this.enemies) if (!e.dead && !e.spawning && wdx(e.x - x) ** 2 + wdy(e.y - y) ** 2 < (r + e.r) ** 2) this.damageEnemy(e, dmg, e.x, e.y);
    if (hurtsPlayer) Player.hit(Player.near(x, y, r), 'annihilation');
  },
  foldBlast(x, y, N, k0 = 1) {
    const R2 = (130 + 70 * Math.log2(Math.max(2, N))) * Mods.foldR * Math.sqrt(k0), dmg = (4 + 2.6 * N) * Mods.foldDmg * k0;
    this.inFold = true; this.foldKills = 0;
    FX.ring(x, y, 10, R2, 0.55, PI_.cyan, 7); FX.ring(x, y, 10, R2 * 0.75, 0.45, PI_.magenta, 4); FX.ring(x, y, 10, R2 * 1.1, 0.7, PI_.gold, 2);
    for (let k = 0; k < 4; k++) FX.burst(x, y, 16, R2 * 2.2, k * 8, { life: 0.55, size: 4 });
    Grid.impulse(x, y, 1100 + N * 40, R2 * 1.4);
    this.post.ripples.push({ x, y, r: 0, max: R2 * 1.3, t: 0, life: 0.6, a: 0.025 });
    addTrauma(0.3 + N * 0.02); this.post.ca = Math.max(this.post.ca, 0.012);
    Audio2.sfx('fold', N); Audio2.meow(N >= 8 ? 'big' : 'happy');
    const absorbed = Bullets.clearNear(x, y, R2, 1);
    if (absorbed) this.addScore(absorbed * 10, x, y - 70, absorbed + ' bullets absorbed');
    for (const e of this.enemies) {
      if (e.dead || e.spawning) continue;
      const dx = wdx(e.x - x), dy = wdy(e.y - y), d = Math.hypot(dx, dy);
      if (d >= R2 + e.r) continue;
      const k = 1 - 0.5 * d / (R2 + e.r);
      if (e.boss) { this.damageEnemy(e, dmg * k, e.x, e.y); continue; }
      e.vx += dx / (d || 1) * 600 / e.mass; e.vy += dy / (d || 1) * 600 / e.mass;
      if (e.elite || e.def.armour) { this.damageEnemy(e, dmg * k, e.x, e.y); continue; }
      e.hp -= dmg * k; e.flash = 0.1;
      if (e.hp <= 0) this.killEnemy(e, 'fold');
    }
    FX.text(x, y - 40, 'Ĥ' + (N > 2 ? '^⊗' + Math.log2(N).toFixed(0) : '') + '  fold ×' + N, PI_.cyan, { size: 16, font: 'serif', life: 0.9 });
    this.inFold = false;
    if (this.foldKills >= 8) Ach.unlock('chain8');
    if (N >= 16) Ach.unlock('fold16');
  },
  beamHit(x, y, a, L, hw, owner, cause) { Player.hit(Player.onLine(x, y, a, L, hw), cause || (owner && owner.boss ? owner.bossDef.name : 'laser')); },

  // ----- collisions -----
  collidePlayerBullets() {
    const B = PB, boss = this.boss && !this.boss.dead ? this.boss : null, cs = EGrid.cell;
    for (let i = 0; i < B.n; i++) {
      const x = B.x[i], y = B.y[i], wave = B.kind[i] === 1, br = wave ? 6 + B.w[i] * 0.8 : 3, keep = B.flag[i] & 2 || wave;
      let consumed = false;
      const struck = e => { if (keep) { B.last[i] = e.id; if (wave && !e.boss) B.dmg[i] *= 0.8; } else consumed = true; };
      if (boss && B.last[i] !== boss.id) {
        const m = boss.bossDef.hit(boss, boss.x + wdx(x - boss.x), boss.y + wdy(y - boss.y));
        if (m > 0) { this.damageEnemy(boss, B.dmg[i] * m * (wave ? 0.7 : 1), x, y); if (m > 1 && Math.random() < 0.3) FX.text(x, y - 10, 'weak point', PI_.white, { size: 11, life: 0.5 }); struck(boss); }
      }
      outer: for (let cj = Math.floor((y - br) / cs); !consumed && cj <= Math.floor((y + br) / cs); cj++) for (let ci = Math.floor((x - br) / cs); ci <= Math.floor((x + br) / cs); ci++) {
        const cell = EGrid.at(ci * cs + 1, cj * cs + 1); if (!cell) continue;
        for (const e of cell) {
          if (e.dead || e.boss || e.ghost || B.last[i] === e.id) continue;
          if (e.def.shield && e.def.shield(e, x, y, B.dmg[i])) { struck(e); break outer; }
          const pts = e.sp || ORIGIN;
          for (let k = 0; k < pts.length; k++) {
            if (wdx(x - (e.x + pts[k].dx)) ** 2 + wdy(y - (e.y + pts[k].dy)) ** 2 >= (e.r + br) ** 2) continue;
            if (e.sp) this.hitSuperposed(e, k, x, y, B.dmg[i]); else this.damageEnemy(e, B.dmg[i] * (wave ? 0.7 : 1), x, y);
            struck(e); break outer;
          }
        }
      }
      if (consumed) B.life[i] = 0;
    }
  },
  // a shot touched copy k of a superposed enemy: was it the real one?
  resolveSuperposed(e, k, x, y) {
    const K = e.sp.length, p = e.sp[k], real = Math.random() < 1 / K;
    this.recordOutcome(real ? 1 / K : 1 - 1 / K);
    if (real) { e.x += p.dx; e.y += p.dy; e.sp = null; return true; }
    e.sp.splice(k, 1);
    if (e.sp.length === 1) { e.x += e.sp[0].dx; e.y += e.sp[0].dy; e.sp = null; }
    FX.text(x, y - 16, 'not real', PI_.dim, { size: 11, font: 'serif', life: 0.6 });
    return false;
  },
  hitSuperposed(e, k, x, y, dmg) {
    const K = e.sp.length;
    if (this.resolveSuperposed(e, k, x, y)) { FX.text(e.x, e.y - 18, 'real (1/' + K + ')', PI_.white, { size: 12, font: 'serif', life: 0.8 }); this.damageEnemy(e, dmg, x, y); }
    else { FX.burst(x, y, 10, 120, e.col, { life: 0.35 }); Audio2.sfx('pop'); }
  },
  collidePlayer() {
    const P = Player, B = EB, hr = this.hitR(), invuln = P.invuln > 0 || P.folding > 0 || this.god, gr = CFG.grazeR * Mods.grazeR, oR = CFG.meas.oddsR;
    let reach = 40; for (const b of P.branches) reach = Math.max(reach, Math.abs(b.ox) + Math.abs(b.oy) + 40);
    const hitSet = new Set(), hitBullets = [], sr = Math.max(reach, oR);
    let danger = 1e9;
    for (let i = 0; i < B.n; i++) {
      if (B.delay[i] > 0 || Math.abs(wdx(B.x[i] - P.x)) > sr || Math.abs(wdy(B.y[i] - P.y)) > sr) continue;
      const r = B.r[i];
      for (const b of P.branches) {
        const dx = wdx(B.x[i] - b.px), dy = wdy(B.y[i] - b.py), d2 = dx * dx + dy * dy;
        if (d2 < danger) danger = d2;
        if (b.grace > 0) continue; // still flying out of a split
        if (d2 < (r * 0.78 + hr) ** 2) { if (!invuln) { hitSet.add(b); hitBullets.push(i); } }
        else if (d2 < (r + gr) ** 2 && !(B.flag[i] & 1)) {
          B.flag[i] |= 1; this.stats.grazes++;
          this.addScore(8 * Mods.graze, b.px, b.py, null, true);
          P.coh = Math.min(CFG.coh.max, P.coh + 0.6 * Mods.graze);
          FX.sparks(b.px + dx * 0.5, b.py + dy * 0.5, 2, 160, PI_.white, Math.atan2(-dy, -dx), 1.2, 0.2); Audio2.sfx('graze');
        }
      }
    }
    if (!invuln) for (const e of this.enemies) { // bodies
      if (e.dead || e.spawning || e.harmless || (e.ghost && !e.boss)) continue;
      if (!e.boss && (Math.abs(wdx(e.x - P.x)) > reach + 110 || Math.abs(wdy(e.y - P.y)) > reach + 110)) continue;
      const touching = (x, y, r) => P.branches.filter(b => b.grace <= 0 && wdx(b.px - x) ** 2 + wdy(b.py - y) ** 2 < (r + hr) ** 2);
      if (e.boss) { const tf = e.bossDef.touch; for (const b of P.branches) if (b.grace <= 0 && (tf ? tf.call(e.bossDef, e, e.x + wdx(b.px - e.x), e.y + wdy(b.py - e.y), hr) : wdx(b.px - e.x) ** 2 + wdy(b.py - e.y) ** 2 < (e.r * 0.85 + hr) ** 2)) hitSet.add(b); continue; }
      if (e.sp) {
        const k = e.sp.findIndex(p => touching(e.x + p.dx, e.y + p.dy, e.r).length); if (k < 0) continue;
        const pts = touching(e.x + e.sp[k].dx, e.y + e.sp[k].dy, e.r);
        if (this.resolveSuperposed(e, k, e.x + e.sp[k].dx, e.y + e.sp[k].dy)) for (const b of pts) hitSet.add(b);
        continue;
      }
      const t = touching(e.x, e.y, e.r * 0.85);
      if (!t.length) continue;
      for (const b of t) hitSet.add(b);
      const dx = wdx(e.x - P.x), dy = wdy(e.y - P.y), d = Math.hypot(dx, dy) || 1;
      e.vx += dx / d * 500 / e.mass; e.vy += dy / d * 500 / e.mass; this.damageEnemy(e, 2, e.x, e.y);
    }
    P.danger = P.n > 1 && !invuln ? clamp(1 - (Math.sqrt(danger) - hr) / (oR - hr), 0, 1) : 0; // how close the nearest bullet is (for the odds by the cats)
    if (!hitSet.size) return;
    for (const i of [...new Set(hitBullets)].sort((a, b) => b - a)) B.kill(i); // the bullets that did the measuring are spent
    if (P.shield && hitBullets.length) { // Zeno guard eats one bullet
      P.shield = false; P.shieldCd = 6; P.invuln = 0.3; FX.ring(P.x, P.y, 10, 70, 0.4, PI_.cyan, 4); Audio2.sfx('glass'); return;
    }
    P.measureHit([...hitSet], 'bullet');
  },
  hitR() { return CFG.player.hitR * (this.mode === 'arcade' ? this.D.hitR : 1); },

  // ----- pickups -----
  drop(e) {
    if (e.noDrop || this.mode === 'attract') return;
    this.dropPity += Mods.drops;
    if (Math.random() < (0.06 + e.r / 260) * (0.8 + 0.2 * Mods.drops)) this.spawnPickup('cool', e.x, e.y);
    if (this.dropPity >= 34 && Math.random() < 0.5) { this.dropPity = 0; this.spawnPickup(this.rollPower(), e.x, e.y); }
  },
  rollPower() { const opts = ['H', 'T', 'F', 'E', 'S'], q = Player.boost > 0 ? Player.boostQ : 0; if (this.mode === 'arcade' && this.lives < 9) opts.push('C'); return weightedPick(opts, k => k === 'C' ? 0.3 : k === 'E' || k === 'S' ? 0.8 : k === 'H' ? (q >= 4 ? 0 : 1 / (1 << q)) : 1); },
  spawnPickup(kind, x, y) { this.pickups.push({ kind, x, y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0, life: kind === 'cool' ? 9 : 14 }); Guide.firstSeen('pickup:' + kind); },
  updatePickups(dt) {
    const mr = 170 * Mods.magnet;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if ((p.t += dt) > p.life) { this.pickups.splice(i, 1); continue; }
      p.vx *= Math.exp(-2 * dt); p.vy *= Math.exp(-2 * dt);
      if (Fields.acc.length) { const o = Fields.accel(p.x, p.y, K_PICK); p.vx += o[0] * dt; p.vy += o[1] * dt; }
      let best = null, bd = 1e9; // magnet: fly to the nearest cat
      for (const b of Player.dead ? [] : Player.branches) { const d = wdx(b.px - p.x) ** 2 + wdy(b.py - p.y) ** 2; if (d < bd) { bd = d; best = b; } }
      if (best && bd < mr * mr) { const d = Math.sqrt(bd) || 1; p.vx += wdx(best.px - p.x) / d * 1400 * dt; p.vy += wdy(best.py - p.y) / d * 1400 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (World.wrap) { p.x = wrapX(p.x); p.y = wrapY(p.y); } else { p.x = clamp(p.x, 10, W - 10); p.y = clamp(p.y, 10, H - 10); }
      if (best && bd < 676) { this.collect(p); this.pickups.splice(i, 1); }
    }
  },
  collect(p) {
    const P = Player, du = Mods.powerDur, s = n => Math.round(n * du);
    this.stats.pickups++;
    const POWER = {
      cool: () => { P.coh = Math.min(CFG.coh.max, P.coh + 14); FX.text(p.x, p.y - 14, '15 mK', PI_.ice, { size: 12 }); return 'pickup'; },
      H: () => { // stacks: every Ĥ⁺ adds a qubit (up to 256 cats) and refreshes the timer
        const was = P.boost > 0 ? P.boostQ : 0; P.boostQ = Math.min(4, was + 1); P.boost = 14 * du;
        const cats = 1 << P.maxQ();
        this.banner(was ? 'Ĥ⁺ STACKED' : 'Ĥ⁺ BOOST', `Another qubit: up to ${cats} cats for ${s(14)} seconds.` + (P.boostQ < 4 ? ' The next one is half as likely.' : ' That is the most physics allows.'), 1.8);
        Audio2.say(was ? cats + ' cats.' : 'Boost.', 1);
      },
      T: () => { P.pierce = 12 * du; this.banner('T GATE', 'Piercing shots for ' + s(12) + ' seconds.', 1.4); },
      F: () => { P.fridge = 9 * du; P.coh = CFG.coh.max; this.banner('DILUTION FRIDGE', 'No decoherence for ' + s(9) + ' seconds. Split freely.', 1.6); },
      E: () => { const n = Bullets.clearNear(P.x, P.y, 1e5); this.post.flash = [0.85, 1, 1, 0.45]; Grid.impulse(P.x, P.y, 900, 900); this.banner('QUANTUM ERASER', 'Which-path information erased. So were ' + n + ' bullets.', 1.6); },
      S: () => { P.echo = 7 * du; this.banner('SPIN ECHO', 'Everything but you runs at half speed for ' + s(7) + ' seconds.', 1.6); },
      C: () => { this.lives = Math.min(99, this.lives + 1); this.banner('ILLEGAL CLONE', 'The no-cloning theorem says this is impossible. One extra life.', 1.8); return 'life'; },
    };
    Audio2.sfx(POWER[p.kind]() || 'power');
    if (p.kind !== 'cool') Feed.add(PICKUP_INFO[p.kind].name, 'gold');
    FX.burst(p.x, p.y, 16, 200, p.kind === 'cool' ? PI_.ice : PI_.gold, { life: 0.5 });
  },

  // ----- scoring & outcomes -----
  counts() { return this.mode === 'arcade' && !Bot.on && !Calib.on; }, // does this run go on the record?
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
    this.post.ca = Math.max(this.post.ca, 0.008); this.post.glitch = Math.max(this.post.glitch, 0.25); addTrauma(0.2);
    if (p >= 0.5) Audio2.say(pick(['Against the odds.', 'The universe blinked.', 'Very unlikely.']), 1); else if (Math.random() < 0.3) Audio2.say(pick(['Alive.', 'Still here.', 'The dice were kind.', 'Not this branch.']), 0);
  },
  onPlayerDeath(cause, x, y) {
    const st = this.stats; st.deaths++; st.lastCause = cause || 'bullet';
    Feed.add(Player.name + ' died', 'red', CAUSE_SHORT[cause] || cause || 'bullet'); st.causes[cause] = (st.causes[cause] || 0) + 1;
    if (this.mode !== 'lab' && this.mode !== 'attract') this.lives--;
    this.mult = 1; this.buzz([70, 40, 140]);
    FX.burst(x, y, 70, 520, [PI_.red, PI_.white, PI_.magenta], { life: 1.1, size: 5 }); FX.shatter(x, y, PI_.red, 18, 18, 420); FX.track(x, y, 10, [PI_.red, PI_.magenta, PI_.white], 420);
    FX.ring(x, y, 10, 260, 0.8, PI_.red, 6); FX.text(x, y - 40, '|dead⟩', PI_.red, { size: 30, font: 'serif', life: 1.8, vy: -20 });
    Grid.impulse(x, y, 1500, 500);
    this.post.flash = [1, 0.2, 0.3, 0.55]; this.post.glitch = 1; this.post.ca = 0.02;
    addTrauma(0.95); this.hitStop = 0.08;
    Bullets.clearNear(x, y, 340);
    Audio2.sfx('death'); Audio2.meow('sad');
    if (this.mode === 'arcade' && this.lives <= 0) { this.dyingT = 2.4; Audio2.say('The cat is dead.', 2); this.slowmo(2.4, 0.2); }
    else if (this.mode === 'arcade') Audio2.say(pick(['Collapsed.', 'Dead, in this timeline.', 'Branch lost.', 'Another life.']), 1);
  },
  clearBulletsNear(x, y, r, toScore) { const n = Bullets.clearNear(x, y, r); if (toScore && n) this.addScore(n * 5, x, y, null, true); return n; },
  slowmo(dur, scale) { if (!Settings.slowmo) { scale = Math.max(scale, 0.75); dur *= 0.5; } this.slowScale = this.slowT > 0 ? Math.min(this.slowScale, scale) : scale; this.slowT = Math.max(this.slowT, dur); },
  gameOver() {
    this.state = 'over';
    Audio2.drone(false); Audio2.crush(false); Audio2.tempo(1); Audio2.pan(0); Audio2.music('over', this.wave);
    UI.showGameOver(this.endRun('dead'));
  },
  beginEnding() {
    Player.invuln = 1e9; Bullets.clearNear(Player.x, Player.y, 1e5, 0);
    Theme.set({ bg: [34, 28, 18], grid: [120, 100, 60], hot: [255, 236, 190], arena: [255, 220, 150], neb: [[255, 236, 190], [255, 207, 74], [255, 255, 255]] }, 3);
    this.banner('THE BOX IS OPEN', 'The cat is alive.', 4);
    this.post.flash = [1, 1, 0.9, 0.9];
    Audio2.sfx('life'); Audio2.say('The box is open. The cat is alive.', 2);
    for (let k = 0; k < 8; k++) setTimeout(() => FX.ring(Player.x, Player.y, 20, 300 + k * 120, 1.2, k % 2 ? PI_.gold : PI_.white, 5), k * 260);
  },
  victory() {
    this.state = 'won';
    if (this.counts() && this.variant === 'campaign') {
      const r = diffRank(this.diffId), S = Save.d, newly = [];
      const was = { e: Save.unlocked('endless'), n: Save.unlocked('nobel') };
      S.cleared[this.diffId] = true;
      if (!was.e && Save.unlocked('endless')) newly.push('Endless and Boss rush');
      if (!was.n && Save.unlocked('nobel')) newly.push('the Nobel Committee difficulty');
      if (newly.length) this.later(3000, () => UI.note('Unlocked', newly.join(' and ') + '.', 6000));
      const A = (c, id) => c && Ach.unlock(id);
      A(r >= diffRank('highschool'), 'matric'); A(r >= diffRank('postdoc'), 'tenure'); A(r >= diffRank('reviewer2'), 'reviewer'); A(r >= diffRank('nobel'), 'laureate');
      if (Mods.school) Ach.unlock('s_' + Mods.school);
      Save.medal('clear:' + this.diffId, 1 + Math.max(0, r - 1), `Campaign finished on ${this.D.name}.`);
    }
    Audio2.music('title', 1);
    UI.showVictory(this.endRun('win'));
  },
  // book-keeping when a run ends (death, victory, or quitting): records, citations, lifetime stats
  endRun(outcome) {
    Notes.flush();
    if (!this.runActive) return null;
    this.runActive = false;
    if (!this.counts()) return null;
    const st = this.stats, S = Save.d, V = this.variant;
    if (outcome === 'quit' && st.time < 15) return null;
    const rec = Save.rec(V, this.diffId);
    const res = { isBest: this.score > rec.score && this.score > 0, bestWave: this.wave > rec.wave, cites: 0, win: outcome === 'win', prevBest: rec.score };
    rec.runs++; rec.score = Math.max(rec.score, this.score); rec.wave = Math.max(rec.wave, this.wave); rec.kills = Math.max(rec.kills, st.kills);
    if (res.win) { rec.clears++; if (!rec.fastest || st.time < rec.fastest) rec.fastest = Math.round(st.time); }
    res.cites = Save.award((8 * Math.sqrt(this.score / 1000) + 6 * st.wavesCleared + 60 * st.bossKills + (res.win ? 400 : 0)) * this.D.cites);
    const L = S.life;
    for (const k of ['kills', 'deaths', 'splits', 'folds', 'perfect', 'survived', 'measurements', 'observed', 'decohered', 'grazes', 'wavesCleared', 'bossKills', 'eliteKills', 'pickups', 'time', 'catsLost', 'dashes', 'sprintT', 'mergers', 'events', 'perks', 'rerolls']) L[k] = (L[k] || 0) + (st[k] || 0);
    L.score = (L.score || 0) + this.score; L.bestScore = Math.max(L.bestScore || 0, this.score); L.bestWave = Math.max(L.bestWave || 0, this.wave); L.longest = Math.max(L.longest || 0, Math.round(st.time));
    // tallies: what was killed, what killed you, which laws you outlasted, which weather you lived through, which interpretation you held
    const T = S.tally, add = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
    for (const [k, n] of Object.entries(st.killsBy)) add(T.kill, k, n);
    for (const [k, n] of Object.entries(st.causes)) add(T.death, k || 'bullet', n);
    for (const [k, n] of Object.entries(st.lawWaves)) { add(T.law, k, n); L.lawWaves = (L.lawWaves || 0) + n; }
    for (const [k, n] of Object.entries(st.eventsBy)) add(T.event, k, n);
    if (Mods.school) add(T.school, Mods.school);
    L.runs++; L.bestMult = Math.max(L.bestMult, st.bestMult);
    S.hist.unshift({ d: Date.now(), v: V, df: this.diffId, s: this.score, w: this.wave, t: Math.round(st.time), k: st.kills, o: outcome === 'win' ? 'win' : outcome === 'quit' ? 'quit' : (st.lastCause || 'bullet') });
    S.hist.length = Math.min(S.hist.length, 30);
    // records beaten, for the post-run report
    const R = res.records = [];
    if (res.isBest && res.prevBest > 0) { R.push('Best score on ' + this.D.name + (V === 'campaign' ? '' : ' ' + V) + ' (was ' + fmtInt(res.prevBest) + ')'); if (this.score >= res.prevBest * 1.1) Save.medal(`pb:${V}:${this.diffId}:${Math.floor(Math.log(this.score) / Math.log(1.5))}`, 1, 'New personal best score.'); }
    if (res.bestWave && rec.runs > 1) R.push('Furthest wave: ' + this.wave);
    if (Splits.finish() && rec.runs > 1) R.push('New personal best splits');
    if (st.maxBranches > L.maxCats) R.push('Most cats at once: ' + st.maxBranches);
    if (st.log10p < L.bestOdds) R.push('Most improbable survival: ' + fmtOddsLog(st.log10p));
    for (const line of Lineage.endRun(outcome) || []) R.push(line);
    const A = (c, id) => c && Ach.unlock(id);
    A(this.score >= 1e6, 'million'); A(st.log10p <= -6, 'improbable'); A(st.log10p <= -15, 'astro'); A(st.grazes >= 100, 'graze100'); A(L.kills >= 5000, 'kills5k');
    A(V === 'endless' && this.wave >= 20, 'endless20'); A(V === 'endless' && this.wave >= 40, 'endless40');
    L.maxCats = Math.max(L.maxCats, st.maxBranches); L.bestOdds = Math.min(L.bestOdds, st.log10p);
    Save.write();
    return res;
  },
  onWaveStart(d) {
    this.waveSplits = 0;
    if (this.counts() && this.variant === 'campaign' && d.chapter > Save.reached(this.diffId)) { Save.d.reached[this.diffId] = d.chapter; Save.write(); }
  },
  onWaveClear(d) {
    if (this.mode !== 'arcade') return;
    if (d.n === 1 && this.variant === 'campaign') Ach.unlock('first');
    if (d.n >= 3 && !d.boss && this.waveSplits === 0) Ach.unlock('classical');
  },

  // ----- helpers -----
  farPoint(minDist = 300, margin = 80) {
    for (let k = 0; k < 40; k++) { const x = rand(margin, W - margin), y = rand(margin, H - margin); if (wdx(x - Player.x) ** 2 + wdy(y - Player.y) ** 2 > minDist * minDist) return { x, y }; }
    return { x: Player.x > W / 2 ? margin * 2 : W - margin * 2, y: Player.y > H / 2 ? margin * 2 : H - margin * 2 };
  },
  // auto-aim: sticks with its target until another is clearly better, and leads moving ones
  autoTarget(x, y) {
    let best = null, bd = 1e12, cur = null, cd = 1e12;
    const score = (e, p) => wdx(p.x - x) ** 2 + wdy(p.y - y) ** 2 - (e.boss ? 200000 : 0) + (e.type === 'darkmatter' ? 160000 : 0) - (e.elite ? 60000 : 0);
    for (const e of this.enemies) {
      if (e.dead || e.spawning || e.ghost) continue;
      const p = this.aimOf(e, x, y), d = score(e, p);
      if (d < bd) { bd = d; best = e; }
      if (e === this.aimLock) { cur = e; cd = d; }
    }
    const keep = 0.25 + 0.6 * (Settings.aimAssist ?? 0.6); // how much closer a rival must be to steal the lock
    const t = cur && cd < 1e12 && (bd > cd * (1 - keep) || cd < 160 * 160) ? cur : best;
    this.aimLock = t; if (!t) return null;
    const p = this.aimOf(t, x, y); if (t.boss || p !== t) return p;
    const v = CFG.player.bulletSpeed, dist = Math.hypot(wdx(t.x - x), wdy(t.y - y)), tt = dist / v; // lead: where it will be when the shot arrives
    return { x: t.x + (t.vx || 0) * tt, y: t.y + (t.vy || 0) * tt };
  },
  inView(x, y, pad = 0) { const v = this._vr || viewRect(0); return ix(x) > v.x0 - pad && ix(x) < v.x1 + pad && iy(y) > v.y0 - pad && iy(y) < v.y1 + pad; },
  canFire() { return (this.state === 'playing' || this.state === 'title') && !Player.dead && this.dyingT <= 0; },
  say(e, text, dur = 1.8, detach) { if (this.mode === 'attract') return; this.speech.push({ e: detach ? null : e, x: e.x, y: e.y, text, t: 0, dur }); if (this.speech.length > 8) this.speech.shift(); },
  bossLine(b, text) { this.bossSub = { text, t: 0 }; },
  banner(title, sub, dur = 1.8) { this.banners.push({ title, sub, t: 0, dur }); if (this.banners.length > 2) this.banners.shift(); },
  waveCard(n, name, eq, line, boss, how, tag, exp) { this.card = { n, name, eq, line, boss, how, tag, exp, t: 0, dur: exp ? (exp.epi ? 7.4 : 6.2) : 3.8 }; this.howT = 0; },
  toastOnce(key, msg) { if (this.toasts.has(key) || !Settings.hints || this.mode === 'attract') return; this.toasts.add(key); UI.note('', msg, 5200); },
  buzz(p) { try { if (Input.touchMode && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no haptics */ } },
  flashCoh() { this.cohFlash = 0.6; },

  updateCamera(dt) {
    const boss = this.boss && !this.boss.dead ? this.boss : null, intro = boss && Director.phase === 'bossIntro';
    let tx = intro ? boss.x : Player.x, ty = intro ? boss.y : Player.y;
    if (!Player.dead && this.state === 'playing') { tx += Math.cos(Player.aimA) * 60; ty += Math.sin(Player.aimA) * 40; } // lead toward the aim
    if (this.mode === 'attract' && R.cssW >= 1180) tx -= (R.sw / cam.zoom) * 0.2;
    const bt = boss && boss.bossDef.camTop && !intro && !Player.dead ? boss.bossDef.camTop(boss) : null; // bosses at the top keep themselves in frame
    if (bt !== null) { const hh = R.sh / 2 / cam.zoom; if (ty > bt + hh) ty = Math.max(bt + hh, Player.y - hh + 90); }
    const z = cam.baseZoom * (boss ? (boss.bossDef.camTop && R.cssH >= 600 ? 0.84 : 0.9) : 1) * (intro ? 1.05 : 1) * (1 - Math.min(0.1, Player.nq * 0.015)) * (Calib.on ? Calib.v.zoom : 1);
    cam.zoom += (z - cam.zoom) * damp(3, dt);
    if (World.wrap) { cam.x = wrapX(cam.x + wdx(tx - cam.x) * damp(5, dt)); cam.y = wrapY(cam.y + wdy(ty - cam.y) * damp(5, dt)); }
    else {
      cam.x += (tx - cam.x) * damp(5, dt); cam.y += (ty - cam.y) * damp(5, dt);
      if (!cam.free && !cam.rot) {
        const hw = R.sw / 2 / cam.zoom, hh = R.sh / 2 / cam.zoom, m = 90;
        cam.x = hw * 2 >= W + 2 * m ? W / 2 : clamp(cam.x, hw - m, W + m - hw);
        cam.y = hh * 2 >= H + 2 * m ? H / 2 : clamp(cam.y, hh - m, H + m - hh);
      }
    }
    cam.trauma = Math.max(0, cam.trauma - dt * 1.4);
    const sh = cam.trauma * cam.trauma * 26 * R.rs;
    cam.t += dt * 22; cam.shakeX = noise1(cam.t) * sh; cam.shakeY = noise1(cam.t + 100) * sh;
    this._vr = viewRect(0);
  },
  updatePost(dt) {
    const P = this.post;
    P.glitch = Math.max(0, P.glitch - dt * 2.2); P.invert = Math.max(0, P.invert - dt * 4); P.ca = Math.max(0, P.ca - dt * 0.03); P.flash[3] = Math.max(0, P.flash[3] - dt * 2.2);
    for (let i = P.ripples.length - 1; i >= 0; i--) { const r = P.ripples[i]; r.t += dt; r.r = r.max * easeOutCubic(r.t / r.life); if (r.t >= r.life) P.ripples.splice(i, 1); }
  },
};
