// ---------- the wave director ----------
const edgePoint = (side, f) => side === 0 ? [f * W, 50] : side === 1 ? [W - 50, f * H] : side === 2 ? [f * W, H - 50] : [50, f * H];
const GROUPS = {
  electrons: { cost: 3, min: 1, w: n => 3 - Math.min(2, n * 0.1), spawn(p) { const k = randi(6, 9 + Math.min(4, Game.level >> 2)); const a0 = Math.random() * TAU; for (let i = 0; i < k; i++) { const a = a0 + i / k * TAU; Game.queueSpawn('electron', p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70, i * 0.05); } } },
  protons: { cost: 3, min: 1, w: () => 1.6, spawn(p) { const k = randi(2, 3); for (let i = 0; i < k; i++) Game.queueSpawn('proton', p.x + (i - 1) * 60, p.y + rand(-30, 30), i * 0.12); } },
  muons: { cost: 4, min: 2, w: () => 1.4, spawn() { const side = randi(0, 3), k = randi(3, 5); for (let i = 0; i < k; i++) { const [x, y] = edgePoint(side, (i + 1) / (k + 1)); Game.queueSpawn('muon', x, y, i * 0.08); } } },
  tachyons: { cost: 4, min: 3, w: () => 1.2, spawn(p) { const k = randi(2, 3); for (let i = 0; i < k; i++) Game.queueSpawn('tachyon', p.x + rand(-90, 90), p.y + rand(-90, 90), i * 0.15); } },
  physicists: { cost: 4, min: 5, w: () => 1.0, spawn(p) { const k = Game.level >= 12 ? 3 : 2; for (let i = 0; i < k; i++) Game.queueSpawn('physicist', p.x + i * 50 - 25, p.y + rand(-20, 20), i * 0.2); } },
  positrons: { cost: 3, min: 6, w: () => 1.2, spawn(p) { const k = randi(4, 6); for (let i = 0; i < k; i++) Game.queueSpawn('positron', p.x + rand(-60, 60), p.y + rand(-60, 60), i * 0.06); } },
  triad: { cost: 4, min: 7, w: () => 1.1, spawn(p) { Game.queueSpawn('@triad', p.x, p.y, 0); } },
  neutrinos: { cost: 3, min: 9, w: () => 1.0, spawn() { const side = randi(0, 3), k = randi(3, 5); for (let i = 0; i < k; i++) { const [x, y] = edgePoint(side, rand(0.15, 0.85)); Game.queueSpawn('neutrino', x, y, i * 0.3); } } },
  turret: { cost: 6, min: 9, w: n => Math.min(1.3, 0.4 + n * 0.05), spawn(p) { Game.queueSpawn('turret', p.x, p.y, 0); } },
  swarm: { cost: 5, min: 10, w: () => 1, spawn(p) { for (let i = 0; i < 8; i++) Game.queueSpawn(i % 3 ? 'electron' : 'positron', p.x + rand(-90, 90), p.y + rand(-90, 90), i * 0.04); } },
  neutrons: { cost: 5, min: 11, w: () => 1.0, spawn(p) { const k = randi(1, 2); for (let i = 0; i < k; i++) Game.queueSpawn('neutron', p.x + i * 60 - 30, p.y + rand(-30, 30), i * 0.2); } },
  magnetar: { cost: 8, min: 13, w: n => Math.min(1, 0.2 + n * 0.03), spawn(p) { Game.queueSpawn('magnetar', p.x, p.y, 0); } },
  alphas: { cost: 5, min: 14, w: () => 0.9, spawn(p) { const k = randi(1, 2); for (let i = 0; i < k; i++) Game.queueSpawn('alpha', p.x + i * 70 - 35, p.y + rand(-40, 40), i * 0.3); } },
  atom: { cost: 6, min: 17, w: () => 0.8, spawn(p) { Game.queueSpawn('atom', p.x, p.y, 0); } },
  higgs: { cost: 6, min: 21, w: () => 0.6, spawn(p) { Game.queueSpawn('higgs', p.x, p.y, 0); for (let i = 0; i < 2; i++) Game.queueSpawn('proton', p.x + rand(-80, 80), p.y + rand(-80, 80), 0.3 + i * 0.1); } },
  dark: { cost: 7, min: 25, w: () => 0.55, spawn(p) { Game.queueSpawn('darkmatter', p.x, p.y, 0); } },
};
const GROUP_IDS = Object.keys(GROUPS);

// laws that do not mix
const LAW_CLASH = { casimir: ['tunnel', 'symmetry'], tunnel: ['casimir'], symmetry: ['casimir'] };
function pickLaws(n, forBoss) {
  const pool = shuffle(ANOM_IDS.filter(id => !(forBoss && ANOMS[id].noBoss))), out = [];
  for (const id of pool) {
    if (out.length >= n) break;
    if (out.some(o => (LAW_CLASH[o] || []).includes(id))) continue;
    if (id === 'manyworlds' && Math.random() < 0.5) continue;
    out.push(id);
  }
  return out;
}

function waveDef(n, variant = Game.variant) {
  if (variant === 'rush') {
    const k = (n - 1) % BOSS_ORDER.length, cycle = Math.floor((n - 1) / BOSS_ORDER.length), boss = BOSS_ORDER[k];
    return { n, anom: cycle ? pickLaws(1, true) : [], boss, name: BOSS_DEFS[boss].name, cycle, chapter: k + 1, level: (k + 1) * CHAPTER_LEN + cycle * 36 };
  }
  if (variant === 'endless') {
    const level = 14 + n * 1.15;
    if (n % 5 === 0) {
      const pool = BOSS_ORDER.filter(b => b !== Director.lastBoss), boss = pick(pool);
      return { n, anom: n >= 15 ? pickLaws(1, true) : [], boss, name: BOSS_DEFS[boss].name, cycle: 0, hpMul: 0.6 + 0.035 * n, chapter: BOSS_ORDER.indexOf(boss) + 1, level };
    }
    const anom = pickLaws(n < 8 ? 1 : n < 20 ? 2 : n < 40 ? 3 : 4, false);
    return { n, anom, boss: null, name: anom.map(a => ANOMS[a].name).join(' + '), cycle: 0, level, endless: true };
  }
  const c = CAMPAIGN[n - 1] || CAMPAIGN[CAMPAIGN.length - 1];
  const anom = c.anom || [];
  return { n, anom, boss: c.boss || null, name: c.boss ? BOSS_DEFS[c.boss].name : (c.name || anom.map(a => ANOMS[a].name).join(' + ')), cycle: 0, chapter: chapterOf(n), level: n };
}

const Director = {
  def: null, phase: 'idle', t: 0, budget: 0, spawnT: 0, groups: 0, how: '', lastBoss: null,
  start(n) {
    const d = waveDef(n); this.def = d;
    const V = Game.variant;
    Game.wave = n;
    Game.setDifficulty(d.level);
    this.phase = d.boss ? 'bossIntro' : 'intro'; this.t = 0;
    let budget = d.boss ? 0 : V === 'endless' ? 34 + n * 3.2 : n === 1 ? 14 : 16 + n * 4;
    this.budget = Math.round(budget * (d.anom.includes('vacuum') ? 0.7 : 1));
    this.spawnT = 0.4; this.groups = 0;
    Anom.set(d.anom);
    // the room changes colour with each chapter (every wave in Endless)
    if (V === 'endless') Theme.endless(n); else Theme.chapter((d.chapter || 1) - 1);
    Audio2.setKey(V === 'endless' ? n : (d.chapter || 1) - 1);
    const sub = d.boss ? BOSS_DEFS[d.boss].sub : (d.anom.length ? d.anom.map(a => ANOMS[a].line).join(' ') : 'Electrons, protons, and you. Nothing unusual. Yet.');
    const eq = d.anom.length ? d.anom.map(a => ANOMS[a].eq).join('    ') : (d.boss ? '' : 'ℒ = −¼F² + iψ̄D̸ψ + |Dφ|² − V(φ)');
    this.how = waveHow(d);
    const tag = V === 'campaign' ? `CHAPTER ${ROMAN[d.chapter]} · ${CHAPTERS[d.chapter - 1].title.toUpperCase()} · WAVE ${n}` : V === 'endless' ? `ENDLESS · WAVE ${n}${d.anom.length > 1 ? ' · ' + d.anom.length + ' LAWS SUSPENDED' : ''}` : `BOSS RUSH · ${(n - 1) % 9 + 1} OF 9${d.cycle ? ' · CYCLE ' + (d.cycle + 1) : ''}`;
    Game.waveCard(n, d.name, eq, sub, !!d.boss, this.how, tag);
    Audio2.music(d.boss ? 'boss' : 'wave', n);
    Audio2.say(d.boss ? `Wave ${n}. ${BOSS_DEFS[d.boss].name.replace('’', '')}.` : `Wave ${n}. ${d.name.replace('ℏ = 1', 'h bar equals one').replace('–', ' ')}.`);
    if (d.boss) this.lastBoss = d.boss;
    Game.onWaveStart(d);
    if (n === 1 && Game.mode === 'arcade' && V === 'campaign') Game.later(2600, () => Game.toastOnce('hint-split', Input.touchMode ? 'Tap the right half of the screen to split into two cats.' : 'Press Space or left-click to split into two cats.'));
    if (d.boss && Game.mode === 'arcade') Game.later(5200, () => Game.toastOnce('hint-expect', 'Bosses aim at your expectation value ⟨x⟩, the average of your cats. Spread out and nobody is there.'));
  },
  update(dt) {
    const d = this.def; if (!d) return;
    this.t += dt;
    if (this.phase === 'intro') {
      if (this.t > 2.4) { this.phase = 'fight'; this.t = 0; }
    } else if (this.phase === 'bossIntro') {
      if (this.t > 2.6 && !Game.boss) { Game.spawnBoss(d.boss, d.cycle, d.hpMul || 1); }
      if (this.t > 3.4) { this.phase = 'boss'; this.t = 0; }
    } else if (this.phase === 'fight') {
      this.spawnT -= dt;
      const alive = Game.enemies.filter(e => !e.dead && e.type !== 'virtual').length + Game.spawns.length;
      const L = Game.level, cap = Math.min(64, 22 + L * 1.2);
      if (this.budget > 0 && this.spawnT <= 0 && alive < cap) {
        this.spawnGroup();
        this.spawnT = Math.max(Game.variant === 'endless' ? 0.75 : 1.0, 3.0 - L * 0.1) * rand(0.8, 1.2);
        if (this.groups <= 2) this.spawnT *= 0.6;
      }
      if (this.budget <= 0 && alive === 0 && this.t > 3) this.clear();
    } else if (this.phase === 'boss') {
      if (Game.boss && Game.boss.dead && this.t > 0) { this.phase = 'bossDead'; this.t = 0; }
    } else if (this.phase === 'bossDead') {
      if (this.t > 2.6) this.afterBoss();
    } else if (this.phase === 'ending') {
      if (this.t > 4.2) Game.victory();
    } else if (this.phase === 'clear') {
      if (this.t > 2.6) this.start(this.def.n + 1);
    }
  },
  afterBoss() {
    const d = this.def, V = Game.variant;
    if (V === 'campaign' && d.boss === BOSS_ORDER[BOSS_ORDER.length - 1]) { this.phase = 'ending'; this.t = 0; Game.beginEnding(); return; }
    if (V === 'rush' && d.n % BOSS_ORDER.length === 0) Ach.unlock('rush');
    this.clear();
    if (Game.mode === 'arcade' && Mods.on) {
      if (Bot.on) { const o = Mods.offer(1); if (o.length) Mods.take(o[0]); }
      else { this.phase = 'choice'; UI.showChoice('Paper accepted', 'Choose one discovery. It lasts for the rest of this run.', () => { this.phase = 'clear'; this.t = 1.3; }); }
    }
  },
  spawnGroup() {
    const L = Game.level;
    const opts = GROUP_IDS.filter(g => GROUPS[g].min <= L && (L > 1 || g === 'electrons' || g === 'protons'));
    const g = weightedPick(opts, id => GROUPS[id].w(L));
    const p = Game.farPoint(330, 90);
    GROUPS[g].spawn(p);
    this.budget -= GROUPS[g].cost; this.groups++;
  },
  clear() {
    this.phase = 'clear'; this.t = 0;
    const bonus = 1000 * Math.min(this.def.n, 40) * (this.def.boss ? 3 : 1);
    Game.addScore(bonus, Player.x, Player.y - 60, 'wave clear', true);
    Game.banner('WAVE ' + this.def.n + ' CLEAR', '+' + fmtInt(bonus * Game.mult * Game.scoreMul | 0) + ' · laws of physics restored', 2.2);
    Anom.set([]);
    Game.boss = null;
    Audio2.sfx('clear');
    Game.stats.wavesCleared++;
    Game.onWaveClear(this.def);
  },
};
