// ---------- progress that survives closing the box ----------
// Everything lives in this browser's storage (one JSON document), with export/import codes
// for carrying it to another device.

// Permanent upgrades, bought with citations in the grant office.
const UPGRADES = [
  { id: 'coh', name: 'Better cryostat', icon: 'T₂', max: 5, cost: [120, 260, 450, 700, 1000], desc: l => `Coherence drains ${8 * l}% slower.`, step: 'Coherence drains 8% slower per level.' },
  { id: 'rate', name: 'Faster electronics', icon: 'ν', max: 5, cost: [120, 260, 450, 700, 1000], desc: l => `Every cat fires ${5 * l}% faster.`, step: 'Cats fire 5% faster per level.' },
  { id: 'dmg', name: 'Higher beam energy', icon: 'E', max: 5, cost: [150, 300, 500, 780, 1100], desc: l => `Shots deal ${6 * l}% more damage.`, step: 'Shots deal 6% more damage per level.' },
  { id: 'life', name: 'Spare timelines', icon: '+1', max: 3, cost: [300, 700, 1300], desc: l => `Start every run with ${l} extra ${l === 1 ? 'life' : 'lives'}.`, step: 'One extra life at the start of every run, per level.' },
  { id: 'fold', name: 'Shaped charge', icon: 'Ĥ†', max: 4, cost: [140, 300, 520, 800], desc: l => `Fold shockwaves are ${10 * l}% bigger and stronger.`, step: 'Fold shockwaves 10% bigger and stronger per level.' },
  { id: 'magnet', name: 'Stronger magnet', icon: '∇', max: 3, cost: [90, 200, 380], desc: l => `Pick-ups fly to you from ${25 * l}% farther away.`, step: 'Pick-ups are pulled in from 25% farther per level.' },
  { id: 'drops', name: 'Grant funding', icon: '§', max: 3, cost: [160, 340, 600], desc: l => `Power-ups drop ${20 * l}% more often and last ${15 * l}% longer.`, step: 'Power-ups 20% more common and 15% longer per level.' },
  { id: 'luck', name: 'Quantum insurance', icon: '∞', max: 2, cost: [900, 2200], desc: l => `${l === 1 ? 'Once' : 'Twice'} per run, a measurement that would kill you is rolled again in your favour.`, step: 'One free reroll of a fatal measurement per run, per level.' },
  { id: 'start', name: 'Prior publication', icon: '✶', max: 1, cost: [1500], desc: () => 'Start every run by choosing one discovery.', step: 'Start every run by choosing one discovery.' },
];

// Discoveries: picked one at a time after each boss, kept for the rest of the run.
const PERKS = [
  { id: 'rate', name: 'Faster readout', icon: 'ν', max: 3, desc: 'Every cat fires 15% faster.', apply: M => { M.fire *= 1.15; } },
  { id: 'dmg', name: 'Higher-energy photons', icon: 'E', max: 3, desc: 'Shots deal 20% more damage.', apply: M => { M.dmg *= 1.2; } },
  { id: 'spread', name: 'Beam splitter', icon: '⋔', max: 2, desc: 'Every cat fires an extra shot at a slight angle.', apply: M => { M.spread++; } },
  { id: 'homing', name: 'Guided photons', icon: '↝', max: 2, desc: 'Your shots curve toward the nearest enemy.', apply: M => { M.homing++; } },
  { id: 'ricochet', name: 'Mirror box', icon: '⟲', max: 1, desc: 'Your shots bounce off the arena walls once instead of leaving.', apply: M => { M.ricochet = true; } },
  { id: 'pierce', name: 'Tunnelling rounds', icon: 'T', max: 2, desc: 'A third of your shots pass straight through enemies.', apply: M => { M.pierce += 0.33; } },
  { id: 'drain', name: 'Better shielding', icon: 'T₂', max: 3, desc: 'Coherence drains 20% slower.', apply: M => { M.drain *= 0.8; } },
  { id: 'split', name: 'Fast Hadamard', icon: 'Ĥ', max: 1, desc: 'Splitting costs half as much coherence and recharges twice as fast.', apply: M => { M.splitCost *= 0.5; M.splitCd *= 0.5; } },
  { id: 'fold', name: 'Bigger bang', icon: '✶', max: 2, desc: 'Fold shockwaves are 35% bigger and hit harder.', apply: M => { M.foldR *= 1.35; M.foldDmg *= 1.35; } },
  { id: 'graze', name: 'Near-miss physics', icon: '≈', max: 1, desc: 'Grazing a bullet gives three times the coherence and points.', apply: M => { M.graze *= 3; } },
  { id: 'chain', name: 'Spooky action', icon: '⌁', max: 2, desc: 'Every kill sends an arc of damage to a nearby enemy.', apply: M => { M.chain++; } },
  { id: 'anti', name: 'Antimatter rounds', icon: '⊖', max: 2, desc: 'Kills have a 20% chance to annihilate and hurt everything nearby.', apply: M => { M.anti += 0.2; } },
  { id: 'autofold', name: 'Decoherence protection', icon: '⌀', max: 1, desc: 'When coherence runs out you fold, shockwave and all, instead of collapsing at random.', apply: M => { M.autoFold = true; } },
  { id: 'ghosts', name: 'Many-worlds backup', icon: 'Ψ', max: 1, desc: 'Cats you lose keep firing from a parallel timeline for five seconds.', apply: M => { M.ghosts = 5; } },
  { id: 'magnet', name: 'Field gradient', icon: '∇', max: 1, desc: 'Pick-ups fly to you from twice as far away.', apply: M => { M.magnet *= 2; } },
  { id: 'drops', name: 'Lucky detector', icon: '⚄', max: 1, desc: 'Power-ups drop twice as often.', apply: M => { M.drops *= 2; } },
  { id: 'clone', name: 'Illegal clone', icon: '+2', max: 6, w: 0.45, once: true, desc: 'The no-cloning theorem is more of a guideline. Two extra lives, right now.', apply: () => { Game.lives = Math.min(99, Game.lives + 2); } },
  { id: 'immortal', name: 'Quantum immortality', icon: '∞', max: 3, w: 0.6, once: true, desc: 'The next time a measurement would kill you, the universe rolls again.', apply: () => { Mods.immortal++; } },
];
const PERK = Object.fromEntries(PERKS.map(p => [p.id, p]));

// Publications (achievements). Each one pays citations once.
const ACH = [
  { id: 'first', name: 'First light', desc: 'Clear wave 1.', cites: 20 },
  { id: 'tesseract', name: 'Hypercube', desc: 'Be sixteen cats at once.', cites: 60 },
  { id: 'penteract', name: 'Penteract', desc: 'Be thirty-two cats at once.', cites: 120 },
  { id: 'coin', name: 'Coin flip', desc: 'Survive a measurement you had a 50% chance of failing.', cites: 40 },
  { id: 'odds', name: 'Against the odds', desc: 'Survive a measurement you had at least a 75% chance of failing.', cites: 100 },
  { id: 'improbable', name: 'Improbable', desc: 'Live through a timeline with odds worse than 1 in a million.', cites: 80 },
  { id: 'astro', name: 'Astronomically improbable', desc: 'Live through a timeline with odds worse than 1 in 10¹⁵.', cites: 200 },
  { id: 'b_observer', name: 'Peer reviewed', desc: 'Defeat The Observer.', cites: 60 },
  { id: 'b_laplace', name: 'Free will', desc: 'Defeat Laplace’s Demon.', cites: 80 },
  { id: 'b_maxwell', name: 'Information is physical', desc: 'Defeat Maxwell’s Demon.', cites: 100 },
  { id: 'b_die', name: 'God plays dice', desc: 'Defeat The Celestial Die.', cites: 120 },
  { id: 'b_slit', name: 'Which path?', desc: 'Defeat The Double Slit.', cites: 140 },
  { id: 'b_threebody', name: 'No closed form', desc: 'Defeat The Three-Body Problem.', cites: 160 },
  { id: 'b_oscillator', name: 'Zero-point energy', desc: 'Defeat The Harmonic Oscillator.', cites: 180 },
  { id: 'b_cyclotron', name: 'Lorentz forced', desc: 'Defeat The Cyclotron.', cites: 200 },
  { id: 'b_apparatus', name: 'Out of the box', desc: 'Defeat The Apparatus and finish the campaign.', cites: 400 },
  { id: 'tenure', name: 'Tenure', desc: 'Finish the campaign on Postdoc or harder.', cites: 500 },
  { id: 'reviewer', name: 'Accepted without revisions', desc: 'Finish the campaign on Reviewer 2.', cites: 1000 },
  { id: 'endless20', name: 'Heat death', desc: 'Reach wave 20 in Endless.', cites: 250 },
  { id: 'endless40', name: 'Big rip', desc: 'Reach wave 40 in Endless.', cites: 600 },
  { id: 'rush', name: 'Conference season', desc: 'Defeat all nine bosses in Boss rush.', cites: 400 },
  { id: 'flawless', name: 'Untouchable', desc: 'Defeat a boss without being measured once.', cites: 150 },
  { id: 'classical', name: 'Classical limit', desc: 'Clear wave 3 or later without splitting.', cites: 60 },
  { id: 'fold16', name: 'Big bang', desc: 'Fold sixteen or more cats at once.', cites: 80 },
  { id: 'chain8', name: 'Chain reaction', desc: 'Kill eight enemies with a single fold.', cites: 80 },
  { id: 'graze100', name: 'Grazing rights', desc: 'Graze 100 bullets in one run.', cites: 60 },
  { id: 'million', name: 'Seven figures', desc: 'Score 1,000,000 points in one run.', cites: 150 },
  { id: 'kills5k', name: 'Particle accelerator', desc: 'Destroy 5,000 particles in total.', cites: 200 },
  { id: 'insured', name: 'Claim approved', desc: 'Be saved by quantum immortality.', cites: 50 },
  { id: 'maxed', name: 'Fully funded', desc: 'Max out any grant.', cites: 50 },
];
const ACH_BY = Object.fromEntries(ACH.map(a => [a.id, a]));

// ---------- run modifiers: grants + discoveries, folded into one set of numbers ----------
const Mods = {
  perks: {}, immortal: 0,
  fire: 1, dmg: 1, drain: 1, splitCost: 1, splitCd: 1, foldR: 1, foldDmg: 1, magnet: 1, drops: 1, powerDur: 1, graze: 1,
  spread: 0, homing: 0, ricochet: false, pierce: 0, chain: 0, anti: 0, autoFold: false, ghosts: 0,
  on: false, // false in the lab and the attract screen
  newRun(on) {
    this.perks = {}; this.on = on;
    this.immortal = on && Save.d.useUpg ? (Save.d.upg.luck || 0) : 0;
    this.compute();
  },
  compute() {
    Object.assign(this, { fire: 1, dmg: 1, drain: 1, splitCost: 1, splitCd: 1, foldR: 1, foldDmg: 1, magnet: 1, drops: 1, powerDur: 1, graze: 1, spread: 0, homing: 0, ricochet: false, pierce: 0, chain: 0, anti: 0, autoFold: false, ghosts: 0 });
    if (!this.on) return;
    if (Save.d.useUpg) {
      const u = Save.d.upg, l = k => u[k] || 0;
      this.drain *= 1 - 0.08 * l('coh'); this.fire *= 1 + 0.05 * l('rate'); this.dmg *= 1 + 0.06 * l('dmg');
      this.foldR *= 1 + 0.1 * l('fold'); this.foldDmg *= 1 + 0.1 * l('fold'); this.magnet *= 1 + 0.25 * l('magnet');
      this.drops *= 1 + 0.2 * l('drops'); this.powerDur *= 1 + 0.15 * l('drops');
    }
    for (const p of PERKS) { const s = this.perks[p.id] || 0; if (s && !p.once) for (let k = 0; k < s; k++) p.apply(this); }
  },
  take(id) {
    const p = PERK[id]; if (!p) return;
    this.perks[id] = (this.perks[id] || 0) + 1;
    if (p.once) p.apply(this);
    this.compute();
  },
  offer(n = 3) {
    const pool = PERKS.filter(p => (this.perks[p.id] || 0) < p.max);
    const out = [];
    while (out.length < n && pool.length) { const p = weightedPick(pool, q => q.w || 1); out.push(p.id); pool.splice(pool.indexOf(p), 1); }
    return out;
  },
  list() { return PERKS.filter(p => this.perks[p.id]).map(p => ({ p, n: this.perks[p.id] })); },
};

const LIFE_KEYS = ['runs', 'time', 'kills', 'deaths', 'splits', 'folds', 'survived', 'measurements', 'observed', 'decohered', 'grazes', 'wavesCleared', 'bossKills', 'pickups', 'citesEarned'];
const Save = {
  d: null,
  fresh() {
    const life = {}; for (const k of LIFE_KEYS) life[k] = 0;
    Object.assign(life, { maxCats: 1, bestMult: 1, bestOdds: 0 });
    return { v: 2, cites: 0, upg: {}, useUpg: true, unlock: { endless: false, rush: false }, cleared: {}, reached: {}, beaten: {}, rec: {}, life, hist: [], ach: {}, last: { diff: 'graduate', variant: 'campaign', chapter: 1 }, updated: 0 };
  },
  load() {
    let d = store('save');
    const f = this.fresh();
    if (!d || typeof d !== 'object' || d.v !== 2) {
      d = f;
      // carry over the two numbers the first version kept
      const best = store('best'), bw = store('bestWave');
      if (best) this.recInto(d, 'campaign', 'graduate').score = best;
      if (bw) { const ch = clamp(Math.ceil(bw / 5), 1, 9); d.reached.graduate = ch; this.recInto(d, 'campaign', 'graduate').wave = Math.min(36, (ch - 1) * CHAPTER_LEN + 1); }
    }
    for (const k of Object.keys(f)) if (d[k] === undefined || d[k] === null) d[k] = f[k];
    for (const k of Object.keys(f.life)) if (typeof d.life[k] !== 'number') d.life[k] = f.life[k];
    d.last = Object.assign({}, f.last, d.last); d.unlock = Object.assign({}, f.unlock, d.unlock);
    if (!DIFFS[d.last.diff]) d.last.diff = 'graduate';
    this.d = d;
  },
  write() { if (!this.d) return; this.d.updated = Date.now(); store('save', this.d); },
  recInto(d, variant, diff) { const k = variant + ':' + diff; return d.rec[k] || (d.rec[k] = { score: 0, wave: 0, runs: 0, clears: 0, fastest: 0, kills: 0 }); },
  rec(variant, diff) { return this.recInto(this.d, variant, diff); },
  reached(diff) { return this.d.reached[diff] || 1; },
  maxReached() { let m = 1; for (const k of DIFF_IDS) m = Math.max(m, this.reached(k)); return m; },
  bestScore() { let m = 0; for (const k in this.d.rec) m = Math.max(m, this.d.rec[k].score || 0); return m; },
  award(n) { n = Math.max(0, Math.round(n)); this.d.cites += n; this.d.life.citesEarned += n; return n; },
  achCount() { return Object.keys(this.d.ach).filter(k => ACH_BY[k]).length; },
  // export as a copyable code; import validates before replacing anything
  exportCode() {
    const json = JSON.stringify(this.d);
    const bytes = new TextEncoder().encode(json); let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'QCAT2-' + btoa(bin);
  },
  importCode(code) {
    try {
      const s = String(code || '').trim().replace(/^QCAT2-/, '').replace(/\s+/g, '');
      const bin = atob(s); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const d = JSON.parse(new TextDecoder().decode(bytes));
      if (!d || d.v !== 2 || typeof d.cites !== 'number' || typeof d.rec !== 'object') return false;
      store('save', d); this.load(); return true;
    } catch (e) { return false; }
  },
  reset() { this.d = this.fresh(); this.write(); try { localStorage.removeItem('qcat:best'); localStorage.removeItem('qcat:bestWave'); } catch (e) { /* storage blocked */ } },
};

const Ach = {
  has(id) { return !!(Save.d && Save.d.ach[id]); },
  unlock(id, anyMode) {
    const a = ACH_BY[id]; if (!a || !Save.d || Save.d.ach[id]) return false;
    if (!anyMode && (Game.mode !== 'arcade' || Bot.on)) return false;
    Save.d.ach[id] = Date.now();
    const n = Save.award(a.cites); Save.write();
    UI.note('Published: ' + a.name, a.desc + ' +' + n + ' citations.', 4200);
    Audio2.sfx('ach');
    return true;
  },
};
