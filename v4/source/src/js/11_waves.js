// ---------- the wave director ----------
// a group: what spawns, how many (number, [min, max] or a function), and how they are laid out:
//   ring r · row dx dy · cloud r · edge (evenly along one side) · stream (scattered along one side)
const GROUPS = {
  electrons: { cost: 3, min: 1, w: L => 3 - Math.min(2, L * 0.1), type: 'electron', n: () => randi(6, 9 + Math.min(4, Game.level >> 2)), at: ['ring', 70], gap: 0.05 },
  protons: { cost: 3, min: 1, w: 1.6, type: 'proton', n: [2, 3], at: ['row', 60, 30], gap: 0.12 },
  muons: { cost: 4, min: 2, w: 1.4, type: 'muon', n: [3, 5], at: ['edge'], gap: 0.08 },
  tachyons: { cost: 4, min: 3, w: 1.2, type: 'tachyon', n: [2, 3], at: ['cloud', 90], gap: 0.15 },
  physicists: { cost: 4, min: 5, w: 1, type: 'physicist', n: () => Game.level >= 12 ? 3 : 2, at: ['row', 50, 20], gap: 0.2 },
  positrons: { cost: 3, min: 6, w: 1.2, type: 'positron', n: [4, 6], at: ['cloud', 60], gap: 0.06 },
  triad: { cost: 4, min: 7, w: 1.1, type: '@triad' },
  neutrinos: { cost: 3, min: 9, w: 1, type: 'neutrino', n: [3, 5], at: ['stream'], gap: 0.3 },
  turret: { cost: 6, min: 9, w: L => Math.min(1.3, 0.4 + L * 0.05), type: 'turret' },
  swarm: { cost: 5, min: 10, w: 1, type: i => i % 3 ? 'electron' : 'positron', n: 8, at: ['cloud', 90], gap: 0.04 },
  neutrons: { cost: 5, min: 11, w: 1, type: 'neutron', n: [1, 2], at: ['row', 60, 30], gap: 0.2 },
  magnetar: { cost: 8, min: 13, w: L => Math.min(1, 0.2 + L * 0.03), type: 'magnetar' },
  alphas: { cost: 5, min: 14, w: 0.9, type: 'alpha', n: [1, 2], at: ['row', 70, 40], gap: 0.3 },
  atom: { cost: 6, min: 17, w: 0.8, type: 'atom' },
  higgs: { cost: 6, min: 21, w: 0.6, type: 'higgs', with: ['proton', 2, 80, 0.3] },
  dark: { cost: 7, min: 25, w: 0.55, type: 'darkmatter' },
  // entangled matter
  twins: { cost: 5, min: 12, w: 1, type: '@twins' },
  shade: { cost: 7, min: 16, w: L => Math.min(0.8, 0.3 + L * 0.02), type: '@shade' },
  mirror: { cost: 6, min: 20, w: 0.8, type: '@mirror' },
  bell: { cost: 7, min: 29, w: 0.75, type: '@bell' },
};
for (const g of Object.values(GROUPS)) g.spawn = p => spawnGroup(g, p || Game.farPoint(330, 90));
function spawnGroup(g, p) {
  const k = typeof g.n === 'function' ? g.n() : Array.isArray(g.n) ? randi(...g.n) : g.n || 1, [lay, a = 0, b = 0] = g.at || [], a0 = Math.random() * TAU, side = randi(0, 3);
  for (let i = 0; i < k; i++) {
    let x = p.x, y = p.y;
    if (lay === 'ring') { x += Math.cos(a0 + i / k * TAU) * a; y += Math.sin(a0 + i / k * TAU) * a; }
    else if (lay === 'row') { x += (i - (k - 1) / 2) * a; y += rand(-b, b); }
    else if (lay === 'cloud') { x += rand(-a, a); y += rand(-a, a); }
    else if (lay) { const f = lay === 'edge' ? (i + 1) / (k + 1) : rand(0.15, 0.85); [x, y] = [[f * W, 50], [W - 50, f * H], [f * W, H - 50], [50, f * H]][side]; }
    Game.queueSpawn(typeof g.type === 'function' ? g.type(i) : g.type, x, y, i * (g.gap || 0));
  }
  if (g.with) { const [t, n, r, d] = g.with; for (let i = 0; i < n; i++) Game.queueSpawn(t, p.x + rand(-r, r), p.y + rand(-r, r), d + i * 0.1); }
}
const GROUP_IDS = Object.keys(GROUPS);

// laws that do not mix
const LAW_CLASH = { casimir: ['tunnel', 'symmetry'], tunnel: ['casimir'], symmetry: ['casimir'] };
function pickLaws(n, forBoss) {
  const pool = shuffle(LAW_IDS.filter(id => !(forBoss && LAWS[id].noBoss))), out = [];
  for (const id of pool) {
    if (out.length >= n) break;
    if (out.some(o => (LAW_CLASH[o] || []).includes(id))) continue;
    if (id === 'manyworlds' && Math.random() < 0.5) continue;
    out.push(id);
  }
  return out;
}

function waveDef(n, variant = Game.variant) {
  if (variant === 'programme') return Programme.waveDef(n);
  if (variant === 'rush') {
    const k = (n - 1) % BOSS_ORDER.length, cycle = Math.floor((n - 1) / BOSS_ORDER.length), boss = BOSS_ORDER[k];
    return { n, anom: pickLaws(1 + cycle, true), boss, name: BOSS_DEFS[boss].name, cycle, chapter: k + 1, level: (k + 1) * CHAPTER_LEN + cycle * CAMPAIGN.length }; // a random law from the very first boss
  }
  if (variant === 'endless') {
    const level = 14 + n * 1.15;
    if (n % 5 === 0) {
      const pool = BOSS_ORDER.filter(b => b !== Director.lastBoss), boss = pick(pool);
      return { n, anom: n >= 15 ? pickLaws(1, true) : [], boss, name: BOSS_DEFS[boss].name, cycle: 0, hpMul: 1 + 0.05 * n, chapter: BOSS_ORDER.indexOf(boss) + 1, level };
    }
    const anom = pickLaws(n < 8 ? 1 : n < 20 ? 2 : n < 40 ? 3 : 4, false);
    return { n, anom, boss: null, name: anom.map(a => LAWS[a].name).join(' + '), cycle: 0, level, endless: true };
  }
  const c = CAMPAIGN[n - 1] || CAMPAIGN[CAMPAIGN.length - 1];
  const anom = c.anom || [];
  return { n, anom, boss: c.boss || null, name: c.boss ? BOSS_DEFS[c.boss].name : (c.name || anom.map(a => LAWS[a].name).join(' + ')), cycle: 0, chapter: chapterOf(n), level: n };
}

const Director = {
  def: null, phase: 'idle', t: 0, budget: 0, spawnT: 0, groups: 0, how: '', lastBoss: null,
  start(n) {
    const d = waveDef(n); this.def = d;
    const V = Game.variant;
    Game.wave = n;
    Game.setDifficulty(d.level);
    this.phase = d.boss ? 'bossIntro' : 'intro'; this.t = 0;
    let budget = d.boss ? 0 : V === 'endless' ? 34 + n * 3.2 : V === 'programme' ? (20 + d.level * 3.3) * (d.budgetMul || 1) : n === 1 ? 14 : 16 + n * 4;
    this.budget = Math.round(budget * (d.anom.includes('vacuum') ? 0.7 : 1));
    this.spawnT = 0.4; this.groups = 0; this.t0 = Game.stats.time;
    d.elites = d.boss || !hardEnough() ? 0 : V === 'programme' ? (d.elites || 0) : V === 'campaign' ? (n >= 6 && n % 4 === 2 ? 1 : n >= 7 && chance(0.25) ? 1 : 0) + (n >= 22 && chance(0.3) ? 1 : 0) : // one in the second wave of every chapter from II, sometimes more n >= 3 ? 1 + (n >= 15 ? 1 : 0) + (n >= 30 ? 1 : 0) : 0;
    Player.rerolls = Mods.rerolls;
    Anom.set(d.anom);
    // the room changes colour with each chapter (every wave in Endless)
    if (V === 'endless') Theme.endless(n); else Theme.chapter((d.chapter || 1) - 1);
    if (V === 'programme') { Programme.onFight(); if (d.weather) Events.next = 1.5; }
    Audio2.setKey(V === 'endless' ? n : (d.chapter || 1) - 1);
    const sub = d.boss ? BOSS_DEFS[d.boss].sub : (d.anom.length ? d.anom.map(a => LAWS[a].line).join(' ') : 'Electrons, protons, and you. Nothing unusual. Yet.');
    const eq = d.anom.length ? d.anom.map(a => LAWS[a].eq).join('    ') : (d.boss ? '' : 'ℒ = −¼F² + iψ̄D̸ψ + |Dφ|² − V(φ)');
    this.how = waveHow(d);
    const tag = V === 'programme' ? Programme.tag(d) : V === 'campaign' ? `EXPERIMENT ${ROMAN[d.chapter]} · ${CHAPTERS[d.chapter - 1].title.toUpperCase()} · WAVE ${n}` : V === 'endless' ? `ENDLESS · WAVE ${n}${d.anom.length > 1 ? ' · ' + d.anom.length + ' LAWS SUSPENDED' : ''}` : `BOSS RUSH · ${(n - 1) % BOSS_ORDER.length + 1} OF ${BOSS_ORDER.length}${d.cycle ? ' · CYCLE ' + (d.cycle + 1) : ''}`;
    const ch = d.chapter || 1, newExp = V === 'campaign' && Game.mode === 'arcade' && (Game.expCh !== ch);
    if (newExp) { // a new experiment: note where it started, and show its aim and method
      const S = Game.stats; Game.expCh = ch; Game.exp = { ch, t: S.time, surv: S.survived, meas: S.measurements, lost: S.catsLost, log: S.log10p };
      Game.waveCard(n, d.name, eq, sub, !!d.boss, this.how, `EXPERIMENT ${ROMAN[ch]} · ${CHAPTERS[ch - 1].title.toUpperCase()} · WAVE ${n}`, { aim: EXP_AIMS[ch - 1], method: expMethod(ch), epi: CHAPTERS[ch - 1].epi });
    } else Game.waveCard(n, d.name, eq, sub, !!d.boss, this.how, tag);
    Audio2.music(d.boss ? 'boss' : 'wave', n);
    if (d.boss) Audio2.say(BOSS_DEFS[d.boss].name.replace('’', '') + '.', 1); else Audio2.say(`Wave ${n}. ${d.name.replace('ℏ = 1', 'h bar equals one').replace(/–/g, ' ')}.`, 0);
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
      if (this.def.elites > 0 && this.groups >= 2 && alive < cap) { this.def.elites--; this.spawnElite(); }
      if (this.budget <= 0 && alive === 0 && this.t > 3) this.clear();
    } else if (this.phase === 'boss') {
      if (Game.boss && Game.boss.dead && this.t > 0) { this.phase = 'bossDead'; this.t = 0; Splits.wave(this.def.n, Game.stats.time - this.t0); }
    } else if (this.phase === 'bossDead') {
      if (this.t > 2.6) this.afterBoss();
    } else if (this.phase === 'ending') {
      if (this.t > 4.2) Game.victory();
    } else if (this.phase === 'clear') {
      if (Game.variant === 'programme') { if (this.t > 2.2) { this.phase = 'map'; Programme.afterRoom(); } }
      else if (this.t > 2.6) this.start(this.def.n + 1);
    }
  },
  afterBoss() {
    const d = this.def, V = Game.variant;
    if (V === 'campaign' && d.boss === BOSS_ORDER[BOSS_ORDER.length - 1]) { this.phase = 'ending'; this.t = 0; Game.beginEnding(); return; }
    if (V === 'rush' && d.n % BOSS_ORDER.length === 0) Ach.unlock('rush');
    this.clear();
    if (V === 'programme') { this.phase = 'map'; Programme.afterBoss(); return; }
    if (Game.mode === 'arcade' && Mods.on) {
      if (Bot.on) { if (!Mods.school) Mods.choose(pick(Object.keys(SCHOOLS))); const o = Mods.offer(1); if (o.length) Mods.take(o[0]); }
      else {
        this.phase = 'choice';
        const paper = Game.stats.papers[Game.stats.papers.length - 1], go = () => UI.showChoice('Paper accepted', 'Choose one discovery. It lasts for the rest of this run.', () => { this.phase = 'clear'; this.t = 1.3; }, paper);
        if (!Mods.school) UI.showSchool(go, paper); else go();
      }
    }
  },
  spawnGroup() {
    const L = Game.level;
    const opts = GROUP_IDS.filter(g => GROUPS[g].min <= L && (L > 1 || g === 'electrons' || g === 'protons'));
    const g = weightedPick(opts, id => typeof GROUPS[id].w === 'function' ? GROUPS[id].w(L) : GROUPS[id].w);
    const p = Game.farPoint(330, 90);
    GROUPS[g].spawn(p);
    this.budget -= GROUPS[g].cost; this.groups++;
  },
  // an elite of a kind this level allows, with a warning
  spawnElite() {
    const ids = ELITE_IDS.filter(k => ET[k].min <= Game.level), k = ids.length ? pick(ids) : 'professor', p = Game.farPoint(420, 160);
    Game.queueSpawn(k, p.x, p.y, 0.6);
    if (chance(0.35)) Game.queueSpawn('assistant', p.x + rand(-60, 60), p.y + rand(40, 80), 0.9); // sometimes it brings help
    Game.banner('ELITE · ' + ET[k].info[0].toUpperCase(), 'It drops a power-up when it falls.', 1.8); Audio2.sfx('bossPhase');
  },
  clear() {
    if (!this.def.boss) Splits.wave(this.def.n, Game.stats.time - this.t0);
    this.phase = 'clear'; this.t = 0;
    const bonus = 1000 * Math.min(this.def.n, 40) * (this.def.boss ? 3 : 1);
    Game.addScore(bonus, Player.x, Player.y - 60, 'wave clear', true);
    Game.banner('WAVE ' + this.def.n + ' CLEAR', '+' + fmtInt(bonus * Game.mult * Game.scoreMul | 0) + ' · laws of physics restored', 2.2);
    if (Game.mode === 'arcade') { for (const id of Anom.ids()) { Notes.count('law:' + id); Game.stats.lawWaves[id] = (Game.stats.lawWaves[id] || 0) + 1; } Notes.flush(); }
    Anom.set([]);
    Game.boss = null;
    Audio2.sfx('clear');
    Game.stats.wavesCleared++;
    Game.onWaveClear(this.def);
  },
};
