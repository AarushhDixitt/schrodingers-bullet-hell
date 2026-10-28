// ---------- the tutorial: an interactive orientation, one idea at a time ----------
// Each step: title, what to do (by input type), an optional setup, and a test that says when it is done.
const tutKey = act => (Input.binds && Input.binds[act] || []).slice(0, 2).map(keyName).join(' or ');
const tutHow = (kb, pad, touch) => Input.touchMode ? touch : Input.padActive ? pad : kb;
const TUT = [
  { t: 'Move', d: () => tutHow(Settings.keys ? `Move with ${['up', 'left', 'down', 'right'].map(a => Input.binds[a][0] ? keyName(Input.binds[a][0]) : '?').join(' ')}.` : 'Move with WASD or the arrow keys.', 'Move with the left stick.', 'Drag anywhere on the left half of the screen.'), done: s => s.moved > 700 },
  { t: 'Focus', d: () => tutHow(`Hold ${tutKey('focus')} to focus: you move slowly, your cats pull in tight, and the white dots (your real hitboxes) light up. Move around while holding it.`, 'Hold LB or LT to focus: slow, tight, hitboxes shown. Move while holding it.', 'Hold the ◎ button to focus: slow, tight, hitboxes shown. Move while holding it.'), done: s => s.focus > 1.4 },
  { t: 'Shoot', d: () => tutHow('You fire all the time at the mouse. Destroy the electrons.', 'You fire all the time where the right stick points (or at the nearest enemy). Destroy the electrons.', 'You fire automatically at the nearest enemy. Destroy the electrons.'), setup: () => GROUPS.electrons.spawn(Game.farPoint(380, 200)), done: () => !Game.enemies.length && !Game.spawns.length },
  { t: 'Split', d: () => tutHow(`Press ${tutKey('split')} or left-click to split into two cats. Every cat fires. Split again to make four.`, 'Press A or RT to split into two cats. Every cat fires. Split again to make four.', 'Tap the right half of the screen (or Ĥ) to split into two cats. Every cat fires. Split again to make four.'), setup: () => { Player.coh = CFG.coh.max; }, done: () => Player.n >= 4 },
  { t: 'Measurement', d: () => 'A bullet touching any cat is a measurement. With N cats you die with chance 1/N; otherwise only the touched cat vanishes. Let one of the slow bullets touch a cat. (In the tutorial you always survive.)', setup: s => { s.shots = 0; }, tick(s, dt) { if (Player.n < 2) { Player.splitCd = 0; Player.coh = CFG.coh.max; Player.split(); } if ((s.shots -= dt) <= 0) { s.shots = 1.2; const a = Math.atan2(H / 2 - Player.y, W / 2 - Player.x) + rand(-0.5, 0.5); Bullets.aimAt(Player.x + Math.cos(a) * 380, Player.y + Math.sin(a) * 380, Player.x, Player.y, 150, { col: PI_.coral, r: 9 }); } }, done: s => Game.stats.survived > s.surv0 },
  { t: 'Coherence and folding', d: () => tutHow(`Staying split drains coherence (the bar bottom left). Fold with ${tutKey('fold')} or right-click: all your cats merge into one and release a shockwave. Split, then fold next to the enemies.`, 'Staying split drains coherence (bottom left). Fold with B or RB: your cats merge into one and release a shockwave. Split, then fold next to the enemies.', 'Staying split drains coherence (bottom left). Tap Ĥ† to fold: your cats merge into one and release a shockwave. Split, then fold next to the enemies.'), setup: () => { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; Game.queueSpawn('electron', Player.x + Math.cos(a) * 260, Player.y + Math.sin(a) * 260, k * 0.05); } }, done: s => Game.stats.folds > s.folds0 },
  { t: 'The fold is a dodge', d: () => 'A fold collapses you onto the cat furthest in the direction you are steering, and nothing can touch you while it happens. Split, then fold sideways just before the wall of bullets reaches you. Fold at the last moment for a perfect fold.', setup: s => { s.wall = 0; }, tick(s, dt) { if ((s.wall -= dt) <= 0) { s.wall = 3.2; const gap = rand(0.2, 0.8); for (let k = 0; k < 22; k++) { const f = (k + 0.5) / 22; if (Math.abs(f - gap) < 0.06) continue; Bullets.fire(Player.x - 700 + f * 1400, Player.y - 560, 0, 210, { col: PI_.red, r: 8, life: 7 }); } } }, done: s => Game.stats.perfect > s.perf0 || Game.stats.folds > s.folds0 + 1 },
  { t: '⟨x⟩, the expectation value', d: () => 'Enemies aim at ⟨x⟩: the average position of your cats (the dashed ring). Split and spread out, and the average can be empty space. Watch the protons miss.', setup: () => { for (let k = 0; k < 3; k++) { const p = Game.farPoint(420, 160); Game.queueSpawn('proton', p.x, p.y, k * 0.2); } }, done: s => s.t > 9 },
  { t: 'Bosses and windows', d: () => 'Every fourth wave is a boss. Bosses are armoured: they only take full damage while their weak window is open (the boss bar says WEAK and turns green). Each boss has its own window, and the bar tells you which. That is everything. The field guide has the rest.', done: s => s.t > 7 },
];

const Tutorial = {
  k: 0, s: null,
  start() { this.k = -1; Game.lives = 99; this.next(); },
  next() {
    this.k++;
    const st = TUT[this.k];
    if (!st) { this.finish(); return; }
    this.s = { t: 0, moved: 0, focus: 0, surv0: Game.stats.survived, folds0: Game.stats.folds, perf0: Game.stats.perfect, done: 0 };
    if (st.setup) st.setup(this.s);
    Game.banner((this.k + 1) + ' · ' + st.t.toUpperCase(), '', 1.4); Audio2.sfx('choose');
  },
  finish() {
    Save.d.tut = true; Ach.unlock('tutorial', true); Save.write();
    Game.banner('ORIENTATION COMPLETE', 'Open the box when you are ready.', 3); Audio2.sfx('clear');
    Game.later(3600, () => { UI.toTitle(); UI.note('Tutorial done', 'Start with High School or Undergrad if you are new to bullet hells.'); });
    this.k = TUT.length;
  },
  update(dt) {
    const st = TUT[this.k], s = this.s; if (!st) return;
    Game.lives = 99; s.t += dt;
    s.moved += Math.hypot(Player.vx, Player.vy) * dt; if (Player.focusing && Math.hypot(Player.vx, Player.vy) > 40) s.focus += dt;
    if (st.tick) st.tick(s, dt);
    if (s.done > 0) { if ((s.done -= dt) <= 0) this.next(); return; }
    if (st.done(s)) { s.done = 1.1; Audio2.sfx('pickup'); FX.text(Player.x, Player.y - 60, '✓', PI_.green, { size: 30, life: 1 }); }
  },
  draw(ctx) { if (this.k >= 7 && !Player.dead) Tele.ring(ctx, ix(Game.tx), iy(Game.ty), 16 + 3 * Math.sin(Game.rt * 6), COL.gold, 0.9, [3, 4], 2); },
  hud(c, Wc, Hc, B) {
    const st = TUT[this.k]; if (!st) return;
    const w = Math.min(560, Wc - 40), x = Wc / 2 - w / 2, y = Math.max(Hc * 0.62, Hc - 220);
    c.font = fontSerif(16); const lines = wrapText(c, st.d(), w - 28);
    const h = 54 + lines.length * 21;
    c.fillStyle = 'rgba(12,10,24,.8)'; c.fillRect(x, y, w, h); c.strokeStyle = this.s.done > 0 ? '#60ff9c' : 'rgba(76,242,255,.6)'; c.lineWidth = 1.5; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    txt(c, `STEP ${this.k + 1} OF ${TUT.length} · ${st.t.toUpperCase()}`, x + 14, y + 22, fontMono(10.5, 700), this.s.done > 0 ? '#60ff9c' : COLS.cyan, 'left', 1.6);
    lines.forEach((l, i) => txt(c, l, x + 14, y + 46 + i * 21, fontSerif(16), COLS.chalk));
    c.fillStyle = 'rgba(236,231,255,.12)'; c.fillRect(x, y + h - 3, w, 3); c.fillStyle = COLS.cyan; c.fillRect(x, y + h - 3, w * (this.k + (this.s.done > 0 ? 1 : 0)) / TUT.length, 3);
  },
};
