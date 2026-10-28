// ---------- progress that survives closing the box ----------
// Everything lives in this browser's storage (one JSON document), with export/import codes for other devices.

// Permanent upgrades, bought with citations in the grant office. [id, name, icon, levels, costs, per-level text, current text]
const UPGRADES = [
  ['coh', 'Better cryostat', 'T₂', [120, 260, 450, 700, 1000], 'Coherence drains 8% slower per level.', l => `Coherence drains ${8 * l}% slower.`],
  ['rate', 'Faster electronics', 'ν', [120, 260, 450, 700, 1000], 'Cats fire 5% faster per level.', l => `Every cat fires ${5 * l}% faster.`],
  ['dmg', 'Higher beam energy', 'E', [150, 300, 500, 780, 1100], 'Shots deal 6% more damage per level.', l => `Shots deal ${6 * l}% more damage.`],
  ['life', 'Spare timelines', '+1', [300, 700, 1300], 'One extra life at the start of every run, per level.', l => `Start every run with ${l} extra ${l === 1 ? 'life' : 'lives'}.`],
  ['fold', 'Shaped charge', 'Ĥ†', [140, 300, 520, 800], 'Fold shockwaves 10% bigger and stronger per level.', l => `Fold shockwaves are ${10 * l}% bigger and stronger.`],
  ['foldcd', 'Fast recombination', '↺', [180, 380, 650], 'Folds recharge 12% faster per level.', l => `Folds recharge ${12 * l}% faster.`],
  ['perfect', 'Precision timing', '◎', [220, 520], 'The perfect-fold window is 25% wider per level.', l => `The perfect-fold window is ${25 * l}% wider.`],
  ['grace', 'Smooth Hadamard', 'Ĥ', [260], 'New cats stay intangible a little longer after a split.', () => 'New cats stay intangible a little longer after a split.'],
  ['magnet', 'Stronger magnet', '∇', [90, 200, 380], 'Pick-ups are pulled in from 25% farther per level.', l => `Pick-ups fly to you from ${25 * l}% farther away.`],
  ['drops', 'Grant funding', '§', [160, 340, 600], 'Power-ups 20% more common and 15% longer per level.', l => `Power-ups drop ${20 * l}% more often and last ${15 * l}% longer.`],
  ['elite', 'Elite contracts', '★', [400], 'Elites drop a second power-up.', () => 'Elites drop a second power-up.'],
  ['luck', 'Quantum insurance', '∞', [900, 2200], 'One free reroll of a fatal measurement per run, per level.', l => `${l === 1 ? 'Once' : 'Twice'} per run, a measurement that would kill you is rolled again in your favour.`],
  ['start', 'Prior publication', '✶', [1500], 'Start every run by choosing one discovery.', () => 'Start every run by choosing one discovery.'],
].map(([id, name, icon, cost, step, desc]) => ({ id, name, icon, cost, max: cost.length, step, desc }));

// The four interpretations of quantum mechanics: chosen once per run, after the first boss.
const SCHOOLS = {
  cph: { name: 'Copenhagen', icon: 'Ⓒ', motto: 'Shut up and calculate.', sig: 'Every time you survive a hit, a shockwave bursts out from where it happened and hurts every enemy nearby.', cost: 'No downside. It is the textbook answer.' },
  mw: { name: 'Many-Worlds', icon: 'Ψ', motto: 'Every outcome happens. You only see one.', sig: 'Cats you lose become ghost drones that orbit you and keep firing for the rest of the run (up to six at once).', cost: 'One fewer qubit: 8 cats at most, 16 with Ĥ⁺.' },
  pw: { name: 'Pilot-Wave', icon: '〰', motto: 'The particle surfs a real wave.', sig: 'You can see where every nearby bullet is going: a dotted line shows its path.', cost: 'Splitting is slower and costs more coherence.' },
  qb: { name: 'QBism', icon: 'ℚ', motto: 'The wavefunction is just your belief.', sig: 'Once per wave, a hit that would kill you is rolled again. You simply change your mind about what happened.', cost: 'You score 25% less.' },
};
// Discoveries: picked after each boss, kept for the rest of the run. school = only offered to that interpretation.
const PERKS = [
  ['rate', 'Faster readout', 'ν', 3, 'Every cat fires 15% faster.', M => { M.fire *= 1.15; }],
  ['dmg', 'Higher-energy photons', 'E', 3, 'Shots deal 20% more damage.', M => { M.dmg *= 1.2; }],
  ['drain', 'Better shielding', 'T₂', 2, 'Coherence drains 20% slower.', M => { M.drain *= 0.8; }],
  ['spread', 'Beam splitter', '⋔', 2, 'Every cat fires an extra shot at a slight angle.', M => { M.spread++; }],
  ['homing', 'Guided photons', '↝', 2, 'Your shots curve toward the nearest enemy.', M => { M.homing++; }],
  ['ricochet', 'Mirror box', '⟲', 1, 'Your shots bounce off the arena walls once instead of leaving.', M => { M.ricochet = true; }],
  ['pierce', 'Tunnelling rounds', 'T', 2, 'A third of your shots pass straight through enemies.', M => { M.pierce += 0.33; }],
  ['split', 'Fast Hadamard', 'Ĥ', 1, 'Splitting costs half as much coherence and recharges twice as fast.', M => { M.splitCost *= 0.5; M.splitCd *= 0.5; }],
  ['graze', 'Near-miss physics', '≈', 1, 'Grazing a bullet gives three times the coherence and points.', M => { M.graze *= 3; }],
  ['chain', 'Spooky action', '⌁', 2, 'Every kill sends an arc of damage to a nearby enemy.', M => { M.chain++; }],
  ['anti', 'Antimatter rounds', '⊖', 2, 'Kills have a 20% chance to annihilate and hurt everything nearby.', M => { M.anti += 0.2; }],
  ['autofold', 'Decoherence protection', '⌀', 1, 'When coherence runs out you fold, shockwave and all, instead of collapsing at random.', M => { M.autoFold = true; }],
  ['subspace', 'Decoherence-free subspace', '◇', 1, 'While you hold focus, coherence does not drain at all.', M => { M.subspace = true; }],
  ['zeno', 'Zeno guard', '⊡', 1, 'Stand still for half a second and a shield forms that absorbs one bullet. It recharges in six seconds.', M => { M.zeno = true; }],
  ['perCat', 'Entangled targeting', '⋈', 1, 'Each cat aims at the enemy nearest to it instead of all firing the same way.', M => { M.perCat = true; }],
  ['dense', 'Superdense coding', '✺', 1, 'Every split fires a ring of eight bullets from each new cat.', M => { M.dense = true; }],
  ['echoFold', 'Spin-echo fold', '↯', 1, 'Folding leaves an echo of your cats behind that keeps firing for four seconds.', M => { M.echoFold = true; }],
  ['kickback', 'Phase kickback', '⚡', 1, 'A perfect fold resets your split instantly and doubles your fire rate for three seconds.', M => { M.kickback = true; }],
  ['emission', 'Spontaneous emission', '❄', 1, 'Kills while you are split have a one-in-five chance to drop coolant.', M => { M.emission = 0.2; }],
  ['teleport', 'Quantum teleportation', '⇥', 1, 'A fold jumps you further: past the cat you chose, in the direction you steer.', M => { M.teleport = 90; }],
  ['clone', 'Illegal clone', '+2', 6, 'The no-cloning theorem is more of a guideline. Two extra lives, right now.', () => { Game.lives = Math.min(99, Game.lives + 2); }, { w: 0.45, once: true }],
  ['immortal', 'Quantum immortality', '∞', 3, 'The next time a measurement would kill you, the universe rolls again.', () => { Mods.immortal++; }, { w: 0.6, once: true }],
  ['cascade', 'Collapse cascade', '✹', 1, 'Your Copenhagen shockwave (when you survive a hit) reaches 50% further and also wipes out enemy bullets.', M => { M.cascade = true; }, { school: 'cph' }],
  ['observe', 'Observer effect', '◉', 1, 'Enemies right where you are aiming take 35% more damage. Looking at something changes it.', M => { M.observe = true; }, { school: 'cph' }],
  ['complement', 'Complementarity', '◐', 1, 'While you are a single cat, your shots do double damage.', M => { M.complement = true; }, { school: 'cph' }],
  ['backup', 'Branch backup', '⧉', 1, 'You can keep up to ten ghost drones instead of six.', M => { M.ghostMax += 4; }, { school: 'mw' }],
  ['harvest', 'Decoherence harvest', '♻', 1, 'Each ghost drone makes your coherence drain 6% slower (up to 40%).', M => { M.harvest = true; }, { school: 'mw' }],
  ['merge', 'Worldline merge', '⨁', 1, 'Each ghost drone makes your fold blast 15% stronger.', M => { M.merge = true; }, { school: 'mw' }],
  ['guide', 'Guiding equation', '⤳', 1, 'Your shots curve toward where enemies are about to be.', M => { M.homing++; M.lead = true; }, { school: 'pw' }],
  ['hidden', 'Hidden variables', '⁇', 1, 'Near misses count from twice as far away, and each one gives three times the coherence.', M => { M.grazeR *= 2; M.graze *= 3; }, { school: 'pw' }],
  ['nonlocal', 'Nonlocal potential', '∿', 1, 'Enemy bullets close to your cats move 30% slower.', M => { M.nonlocal = true; }, { school: 'pw' }],
  ['dutch', 'Dutch book', '⚖', 1, 'Each hit you survive adds 0.5 to your score multiplier.', M => { M.dutch = true; }, { school: 'qb' }],
  ['prior', 'Prior update', '⟳', 1, 'Two rerolls per wave instead of one.', M => { M.rerolls = 2; }, { school: 'qb' }],
  ['personal', 'Personalist', '☉', 1, 'After each boss you choose from four discoveries instead of three.', M => { M.choices = 4; }, { school: 'qb' }],
].map(([id, name, icon, max, desc, apply, o = {}]) => ({ id, name, icon, max, desc, apply, ...o }));
const PERK = Object.fromEntries(PERKS.map(p => [p.id, p]));

// Publications (achievements). Each one pays citations once.
const ACH = [
  ['first', 'First light', 'Clear wave 1.', 20], ['tesseract', 'Hypercube', 'Be sixteen cats at once.', 60], ['penteract', 'Penteract', 'Be thirty-two cats at once.', 120],
  ['hexeract', 'Hexeract', 'Be sixty-four cats at once.', 200], ['hepteract', 'Hepteract', 'Be 128 cats at once.', 350], ['octeract', 'Octeract', 'Be 256 cats at once. Nobody believes you.', 600],
  ['coin', 'Coin flip', 'Survive a measurement you had a 50% chance of failing.', 40], ['odds', 'Against the odds', 'Survive a measurement you had at least a 75% chance of failing.', 100],
  ['improbable', 'Improbable', 'Live through a timeline with odds worse than 1 in a million.', 80], ['astro', 'Astronomically improbable', 'Live through a timeline with odds worse than 1 in 10¹⁵.', 200],
  ['b_observer', 'Peer reviewed', 'Defeat The Observer.', 60], ['b_laplace', 'Free will', 'Defeat Laplace’s Demon.', 80], ['b_maxwell', 'Information is physical', 'Defeat Maxwell’s Demon.', 100],
  ['b_die', 'God plays dice', 'Defeat The Celestial Die.', 120], ['b_slit', 'Which path?', 'Defeat The Double Slit.', 140], ['b_threebody', 'No closed form', 'Defeat The Three-Body Problem.', 160],
  ['b_oscillator', 'Zero-point energy', 'Defeat The Harmonic Oscillator.', 180], ['b_cyclotron', 'Lorentz forced', 'Defeat The Cyclotron.', 200], ['b_bell', 'Loophole-free', 'Defeat The Local Realist.', 260], ['b_apparatus', 'Out of the box', 'Defeat The Apparatus and finish the campaign.', 400],
  ['matric', 'Matriculated', 'Finish the campaign on High School.', 60], ['tenure', 'Tenure', 'Finish the campaign on Postdoc or harder.', 500], ['reviewer', 'Accepted without revisions', 'Finish the campaign on Reviewer 2.', 1000],
  ['laureate', 'Laureate', 'Finish the campaign on Nobel Committee.', 2500],
  ['endless20', 'Heat death', 'Reach wave 20 in Endless.', 250], ['endless40', 'Big rip', 'Reach wave 40 in Endless.', 600], ['rush', 'Conference season', 'Defeat every boss in Boss rush.', 400],
  ['flawless', 'Untouchable', 'Defeat a boss without being measured once.', 150], ['classical', 'Classical limit', 'Clear wave 3 or later without splitting.', 60],
  ['fold16', 'Big bang', 'Fold sixteen or more cats at once.', 80], ['chain8', 'Chain reaction', 'Kill eight enemies with a single fold.', 80],
  ['perfect1', 'Clean collapse', 'Make a perfect fold: fold just before a bullet hits.', 40], ['perfect25', 'Fold master', 'Make 25 perfect folds in one run.', 200],
  ['graze100', 'Grazing rights', 'Graze 100 bullets in one run.', 60], ['million', 'Seven figures', 'Score 1,000,000 points in one run.', 150], ['kills5k', 'Particle accelerator', 'Destroy 5,000 particles in total.', 200],
  ['insured', 'Claim approved', 'Be saved by quantum immortality.', 50], ['maxed', 'Fully funded', 'Max out any grant.', 50],
  ['elite1', 'Tenure track', 'Defeat an elite.', 60], ['elites5', 'Faculty meeting', 'Defeat every kind of elite.', 300],
  ['merger', 'LIGO would be proud', 'Witness two black holes merge.', 80], ['ripple', 'Surfing spacetime', 'Survive a gravitational wave passing through you.', 120],
  ['window', 'Read the manual', 'Deal most of a boss’s damage while its weak window is open.', 150],
  ['s_cph', 'The Copenhagen school', 'Finish the campaign as a Copenhagenist.', 300], ['s_mw', 'In some branch, anyway', 'Finish the campaign as a Many-Worlder.', 300],
  ['s_pw', 'Surfing the wave', 'Finish the campaign as a Bohmian.', 300], ['s_qb', 'It was all in my head', 'Finish the campaign as a QBist.', 300],
  ['tutorial', 'Orientation', 'Finish the tutorial.', 30], ['names', 'Survived by many', 'Lose 50 named cats in one run.', 80], ['weather', 'Space weather', 'Live through ten random events in one run.', 150],
  ['gold', 'Gold split', 'Set your fastest ever time on a wave.', 40], ['decorated', 'Decorated', 'Earn ten medals.', 120],
  ['published', 'Published', 'Finish a research programme.', 400], ['tenured', 'Tenured', 'Survive two cycles of Tenure track.', 600],
  ['notes50', 'Field notes', 'Observe fifty different subjects.', 150], ['notesall', 'Complete works', 'Write a conclusion for every subject in the lab notes.', 1200],
].map(([id, name, desc, cites]) => ({ id, name, desc, cites }));
// boss papers come in volumes: I for beating it on High School, up to VI on Nobel Committee (volume I keeps the old id)
{
  const first = ACH.findIndex(a => a.id.startsWith('b_')), boss = ACH.filter(a => a.id.startsWith('b_'));
  ACH.splice(first, boss.length, ...boss.flatMap(a => DIFF_IDS.map((d, k) => ({ id: a.id + (k ? '_' + (k + 1) : ''), name: a.name + ' ' + ROMAN[k + 1], desc: a.desc.replace(/\.$/, '') + ' on ' + DIFFS[d].name + (k < DIFF_IDS.length - 1 ? ' or harder.' : '.'), cites: Math.round(a.cites * (0.5 + 0.4 * k)) }))));
}
const ACH_BY = Object.fromEntries(ACH.map(a => [a.id, a]));

// Cosmetics, bought with medals (earned only through mastery). Colour palettes recolour the wavefunction wheel.
const PALETTES = {
  default: { name: 'Domain colouring', stops: null, cost: 0 },
  viridis: { name: 'Viridis', stops: [[68, 1, 84], [59, 82, 139], [33, 145, 140], [253, 231, 37]].map(c => c.map(v => Math.min(255, v + 30))), cost: 4 },
  sunset: { name: 'Sunset', stops: [[255, 94, 77], [255, 174, 66], [255, 220, 140], [210, 80, 160]], cost: 4 },
  mono: { name: 'Chalk', stops: [[236, 231, 255], [170, 165, 210], [255, 255, 255], [130, 124, 180]], cost: 3 },
  aurora: { name: 'Aurora', stops: [[60, 255, 170], [80, 200, 255], [180, 120, 255], [60, 255, 230]], cost: 6 },
  neon: { name: 'Neon', stops: [[255, 0, 160], [0, 255, 240], [255, 240, 0], [120, 0, 255]], cost: 6 },
  ember: { name: 'Ember', stops: [[255, 60, 40], [255, 150, 40], [255, 230, 120], [200, 40, 90]], cost: 5 },
  ocean: { name: 'Deep sea', stops: [[30, 90, 255], [40, 210, 255], [120, 255, 220], [70, 60, 220]], cost: 5 },
  candy: { name: 'Candy', stops: [[255, 150, 210], [170, 230, 255], [255, 240, 160], [200, 170, 255]], cost: 5 },
  forest: { name: 'Forest', stops: [[60, 220, 110], [190, 240, 90], [255, 200, 90], [40, 170, 150]], cost: 5 },
  ice: { name: 'Ice', stops: [[220, 245, 255], [130, 200, 255], [255, 255, 255], [90, 150, 255]], cost: 4 },
  infrared: { name: 'Infrared', stops: [[90, 20, 160], [230, 30, 100], [255, 140, 0], [255, 250, 180]], cost: 7 },
};
const TRAILS = { bolt: { name: 'Bolts', cost: 0 }, photon: { name: 'Photons', cost: 3 }, comet: { name: 'Comets', cost: 4 }, pixel: { name: 'Pixels', cost: 3 }, rainbow: { name: 'Prism', cost: 8 }, quill: { name: 'Ink', cost: 5 } };
const SKIN_COST = { classic: 0, round: 3, loaf: 3, tabby: 4, bowtie: 4, tux: 4, scarf: 4, calico: 5, headphones: 5, goggles: 5, einstein: 6, robot: 7, ghost: 8, wizard: 8, astronaut: 10, crown: 12 };

// ---------- run modifiers: grants + discoveries + interpretation, folded into one set of numbers ----------
const MOD_BASE = { speed: 1, fire: 1, dmg: 1, drain: 1, splitCost: 1, splitCd: 1, foldR: 1, foldDmg: 1, foldCd: 1, perfectW: 1, grace: 1, magnet: 1, drops: 1, powerDur: 1, graze: 1, grazeR: 1, score: 1, eliteDrops: 1, spread: 0, homing: 0, pierce: 0, chain: 0, anti: 0, emission: 0, teleport: 0, ghostMax: 6, rerolls: 0, choices: 3, ricochet: false, autoFold: false, subspace: false, zeno: false, perCat: false, dense: false, echoFold: false, kickback: false, cascade: false, observe: false, complement: false, harvest: false, merge: false, lead: false, nonlocal: false, dutch: false };
const Mods = {
  perks: {}, immortal: 0, school: null, on: false, // off in the lab and the attract screen
  newRun(on) { this.perks = {}; this.school = null; this.on = on; this.immortal = on && Save.d.useUpg ? (Save.d.upg.luck || 0) : 0; this.compute(); },
  compute() {
    Object.assign(this, MOD_BASE); Calib.tune(this);
    if (!this.on) return;
    if (Save.d.useUpg) {
      const l = k => Save.d.upg[k] || 0;
      this.drain *= 1 - 0.08 * l('coh'); this.fire *= 1 + 0.05 * l('rate'); this.dmg *= 1 + 0.06 * l('dmg');
      this.foldR *= 1 + 0.1 * l('fold'); this.foldDmg *= 1 + 0.1 * l('fold'); this.foldCd *= 1 - 0.12 * l('foldcd'); this.perfectW *= 1 + 0.25 * l('perfect');
      this.grace *= 1 + 0.5 * l('grace'); this.magnet *= 1 + 0.25 * l('magnet'); this.drops *= 1 + 0.2 * l('drops'); this.powerDur *= 1 + 0.15 * l('drops'); this.eliteDrops += l('elite');
    }
    if (this.school === 'pw') { this.splitCd *= 2.2; this.splitCost *= 1.25; }
    if (this.school === 'qb') { this.score *= 0.75; this.rerolls = 1; }
    for (const p of PERKS) if (!p.once) for (let k = this.perks[p.id] || 0; k > 0; k--) p.apply(this);
  },
  take(id) { const p = PERK[id]; if (!p) return; this.perks[id] = (this.perks[id] || 0) + 1; if (Game.stats) Game.stats.perks = (Game.stats.perks || 0) + 1; if (p.once) p.apply(this); this.compute(); },
  choose(school) { this.school = school; this.compute(); },
  offer(n = this.choices) {
    const pool = PERKS.filter(p => (this.perks[p.id] || 0) < p.max && (!p.school || p.school === this.school)), out = [];
    while (out.length < n && pool.length) { const p = weightedPick(pool, q => (q.w || 1) * (q.school ? 1.6 : 1)); out.push(p.id); pool.splice(pool.indexOf(p), 1); }
    return out;
  },
  list() { return PERKS.filter(p => this.perks[p.id]).map(p => ({ p, n: this.perks[p.id] })); },
};

const LIFE_KEYS = ['runs', 'time', 'kills', 'deaths', 'splits', 'folds', 'perfect', 'survived', 'measurements', 'observed', 'decohered', 'grazes', 'wavesCleared', 'bossKills', 'eliteKills', 'pickups', 'citesEarned', 'medalsEarned', 'catsLost', 'dashes', 'sprintT', 'mergers', 'events', 'score', 'perks', 'lawWaves', 'rerolls'];
const Save = {
  d: null,
  fresh() {
    const life = { maxCats: 1, bestMult: 1, bestOdds: 0, elites: {}, bestWave: 0, longest: 0, bestScore: 0 }; for (const k of LIFE_KEYS) life[k] = 0;
    return { v: 3, cites: 0, medals: 0, upg: {}, useUpg: true, unlock: { endless: false, rush: false, nobel: false }, cleared: {}, reached: {}, beaten: {}, rec: {}, life, hist: [], ach: {}, last: { diff: 'graduate', variant: 'campaign', chapter: 1 }, seenAtk: {}, splits: {}, cos: { skin: 'classic', trail: 'bolt', pal: 'default', own: {} }, medalKeys: {}, tut: false, tracks: {}, tally: { kill: {}, death: {}, law: {}, event: {}, school: {} }, updated: 0 };
  },
  load() {
    let d = store('save');
    const f = this.fresh();
    if (!d || typeof d !== 'object' || !(d.v >= 2)) d = f;
    for (const k of Object.keys(f)) if (d[k] === undefined || d[k] === null) d[k] = f[k];
    for (const k of Object.keys(f.life)) if (d.life[k] === undefined) d.life[k] = f.life[k];
    d.tally = Object.assign({}, f.tally, d.tally);
    d.last = Object.assign({}, f.last, d.last); d.unlock = Object.assign({}, f.unlock, d.unlock); d.cos = Object.assign({}, f.cos, d.cos);
    if (!DIFFS[d.last.diff]) d.last.diff = 'graduate';
    Notes.migrate(d);
    d.v = 4; this.d = d;
  },
  write() { if (!this.d) return; this.d.updated = Date.now(); store('save', this.d); },
  rec(variant, diff) { const k = variant + ':' + diff; return this.d.rec[k] || (this.d.rec[k] = { score: 0, wave: 0, runs: 0, clears: 0, fastest: 0, kills: 0 }); },
  reached(diff) { return this.d.reached[diff] || 1; },
  // beating a harder difficulty opens the easier ones up to the same chapter
  reachedFor(diff) { let m = 1; for (const k of DIFF_IDS) if (diffRank(k) >= diffRank(diff)) m = Math.max(m, this.reached(k)); return m; },
  clearedFor(diff) { return DIFF_IDS.some(k => diffRank(k) >= diffRank(diff) && this.d.cleared[k]); },
  maxReached() { return Math.max(...DIFF_IDS.map(k => this.reached(k))); },
  unlocked(what) { const u = this.d.unlock; return what === 'nobel' ? u.nobel || this.clearedFor('reviewer2') : what === 'programme' ? u.programme || u.endless || Object.keys(this.d.beaten).length > 0 || this.clearedFor('undergrad') : u[what] || this.clearedFor('undergrad'); },
  diffLocked(id) { return !!DIFFS[id].locked && !this.unlocked('nobel'); },
  bestScore() { let m = 0; for (const k in this.d.rec) m = Math.max(m, this.d.rec[k].score || 0); return m; },
  award(n) { n = Math.max(0, Math.round(n)); this.d.cites += n; this.d.life.citesEarned += n; return n; },
  // medals: only for mastery, and each reason pays once (key)
  medal(key, n, why) {
    if (!Game.counts() || this.d.medalKeys[key]) return 0;
    this.d.medalKeys[key] = Date.now(); this.d.medals += n; this.d.life.medalsEarned += n;
    Game.stats.medals = (Game.stats.medals || 0) + n;
    UI.note('Medal' + (n > 1 ? ' ×' + n : ''), why);
    Audio2.sfx('medal');
    if (this.d.life.medalsEarned >= 10) Ach.unlock('decorated');
    this.write(); return n;
  },
  achCount() { return Object.keys(this.d.ach).filter(k => ACH_BY[k]).length; },
  exportCode() { const b = new TextEncoder().encode(JSON.stringify(this.d)); let s = ''; for (const c of b) s += String.fromCharCode(c); return 'QCAT4-' + btoa(s); },
  importCode(code) {
    try {
      const bin = atob(String(code || '').trim().replace(/^QCAT\d-/, '').replace(/\s+/g, '')), d = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
      if (!d || !(d.v >= 2) || typeof d.cites !== 'number' || typeof d.rec !== 'object') return false;
      store('save', d); this.load(); applyLook(); return true;
    } catch (e) { return false; }
  },
  reset() { this.d = this.fresh(); this.write(); applyLook(); },
};

// the cosmetic look (skin, palette) and colour-blind mode, applied to the sprite caches
function applyLook() {
  const c = Save.d ? Save.d.cos : { skin: 'classic', pal: 'default' }, P = PALETTES[c.pal];
  CAT_SKIN = CAT_SKINS[c.skin] ? c.skin : 'classic';
  buildPalette(Settings.cb || 'off', Settings.cb && Settings.cb !== 'off' ? null : P && P.stops);
}

const Ach = {
  has(id) { return !!(Save.d && Save.d.ach[id]); },
  unlock(id, anyMode, quiet) {
    const a = ACH_BY[id]; if (!a || !Save.d || Save.d.ach[id]) return false;
    if (!anyMode && !Game.counts()) return false;
    Save.d.ach[id] = Date.now();
    const n = Save.award(a.cites); Save.write();
    if (quiet) return true;
    UI.note('Published: ' + a.name, a.desc + ' +' + n + ' citations.', 4200);
    Audio2.sfx('ach');
    return true;
  },
};
