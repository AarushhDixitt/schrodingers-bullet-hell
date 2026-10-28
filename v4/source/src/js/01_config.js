// ---------- tuning: every number worth balancing lives here ----------
const W = 2200, H = 1400; // arena (world units)
const SIM_DT = 1 / 120;

const CFG = {
  player: {
    speed: 425, focusMul: 0.42, focusSpread: 0.62,
    hitR: 4.6, drawSize: 34,
    fireRate: 11, bulletSpeed: 1180, bulletLife: 0.95, bulletDmg: 1,
    maxQubits: 4, maxBoost: 4, // the Ĥ⁺ boost stacks up to four extra qubits (256 cats)
    invulnAfterHit: 0.35, invulnRespawn: 2.6,
    splitGrace: 0.26, // new cats are intangible while they fly out to their places
  },
  coh: {
    max: 100, regen: 17, regenDelay: 0.55,
    splitCost: 7, minToSplit: 9,
    drainBase: 2.6, drainExp: 0.78,
    envR: 165, envPer: 1.3, envMax: 11,
    hitCost: 9, foldRefund: 2.2,
  },
  // hold to sprint: a small burst, then faster running that drains coherence per second (more with more cats).
  // tap instead for a bigger burst. Moving faster couples you to the environment.
  dash: { dur: 0.08, mul: 2.4, tapDur: 0.11, tapMul: 3.3, tapWin: 0.17, cost: 6, perQ: 0.35, cd: 0.3, soloCd: 0.9, sprintMul: 1.6, drain: 11, soloDrain: 7 },
  fold: {
    dur: 0.2, cd: 0.95, invulnAfter: 0.16, // the fold is a dodge: intangible while it happens and just after
    perfectLook: 0.16, perfectPad: 20, // a bullet this close (or arriving this soon) makes it a perfect fold
    perfectRefund: 24, perfectBlast: 1.5, perfectCd: 1.4,
  },
  meas: { slow: 0.13, dur: 1.05, badDur: 1.25, recentDur: 0.5, recentSlow: 0.4, oddsR: 120 },
  boss: { hp: 0.6, armour: 0.3, window: 2.5, tele: 1.3, firstSlow: 0.4, firstDur: 1.6 }, // armour: damage taken outside the weak window; ×window inside it
  multMax: 16, multStep: 0.04,
  grazeR: 16,
};

// Score values per enemy kind are set in the enemy table (08_enemies.js).

// ---------- difficulty ----------
// hp/fire/bspd/espd scale enemies, boss scales boss health, drain scales decoherence, tele stretches every
// warning (dashed lines, charge-ups), gap widens the holes in bullet walls, hitR scales the cats' hitbox,
// score and cites scale what a run is worth.
const DIFFS = {
  highschool: { name: 'High School', blurb: 'Slow, sparse bullets, long warnings and fifteen lives. For learning how the cat works.', lives: 15, hp: 0.6, fire: 0.5, bspd: 0.74, espd: 0.8, boss: 0.6, drain: 0.65, tele: 1.6, gap: 1.45, hitR: 0.8, score: 0.3, cites: 0.4, col: 'green' },
  undergrad: { name: 'Undergrad', blurb: 'Gentle. Generous warnings and twelve lives.', lives: 12, hp: 0.7, fire: 0.62, bspd: 0.8, espd: 0.85, boss: 0.68, drain: 0.75, tele: 1.35, gap: 1.3, hitR: 0.9, score: 0.5, cites: 0.6, col: 'cyan' },
  graduate: { name: 'Graduate', blurb: 'The experiment as designed. Ten lives.', lives: 10, hp: 0.8, fire: 0.74, bspd: 0.87, espd: 0.9, boss: 0.8, drain: 0.85, tele: 1.15, gap: 1.12, hitR: 1, score: 1, cites: 1, col: 'gold' },
  postdoc: { name: 'Postdoc', blurb: 'Denser patterns, tougher enemies, seven lives. Underpaid and overworked.', lives: 7, hp: 1, fire: 1, bspd: 1, espd: 1, boss: 1, drain: 1, tele: 1, gap: 1, hitR: 1, score: 1.6, cites: 1.5, col: 'pink' },
  reviewer2: { name: 'Reviewer 2', blurb: 'Hates your paper. Five lives, no extra lives from score, and everything hurts.', lives: 5, hp: 1.25, fire: 1.25, bspd: 1.1, espd: 1.08, boss: 1.25, drain: 1.1, tele: 0.9, gap: 0.92, hitR: 1, score: 2.5, cites: 2.2, col: 'red', noExtra: true },
  nobel: { name: 'Nobel Committee', blurb: 'Three lives, short warnings, and they have read every paper you ever wrote.', lives: 3, hp: 1.55, fire: 1.55, bspd: 1.22, espd: 1.16, boss: 1.6, drain: 1.25, tele: 0.8, gap: 0.85, hitR: 1, score: 4, cites: 3.5, col: 'violet', noExtra: true, locked: true },
};
const DIFF_IDS = Object.keys(DIFFS);
const diffRank = id => DIFF_IDS.indexOf(id);
// elites and space weather only turn up from Graduate upwards (the Laboratory can always summon them)
const hardEnough = () => Game.mode !== 'arcade' || diffRank(Game.diffId) >= diffRank('graduate');

// ---------- the campaign: ten chapters (experiments), each three waves of suspended laws and a boss ----------
// each experiment opens with an epigraph: a real line from someone who worked on the idea it is about
const CHAPTERS = [
  { title: 'Measurement', boss: 'observer', epi: ['No elementary phenomenon is a phenomenon until it is a registered (observed) phenomenon.', 'John Archibald Wheeler'] },
  { title: 'Determinism', boss: 'laplace', epi: ['We may regard the present state of the universe as the effect of its past and the cause of its future.', 'Pierre-Simon Laplace, 1814'] },
  { title: 'Thermodynamics', boss: 'maxwell', epi: ['The law that entropy always increases holds, I think, the supreme position among the laws of Nature.', 'Arthur Eddington, 1928'] },
  { title: 'Chance', boss: 'die', epi: ['I, at any rate, am convinced that He does not throw dice.', 'Albert Einstein, letter to Max Born, 1926'] },
  { title: 'Interference', boss: 'slit', epi: ['It has in it the heart of quantum mechanics. In reality, it contains the only mystery.', 'Richard Feynman, on the double slit'] },
  { title: 'Gravitation', boss: 'threebody', epi: ['I have not been able to discover the cause of those properties of gravity from phenomena, and I frame no hypotheses.', 'Isaac Newton, Principia, 1713'] },
  { title: 'Oscillation', boss: 'oscillator', epi: ['The career of a young theoretical physicist consists of treating the harmonic oscillator in ever-increasing levels of abstraction.', 'attributed to Sidney Coleman'] },
  { title: 'Fields', boss: 'cyclotron', epi: ['Nothing is too wonderful to be true, if it be consistent with the laws of nature.', 'Michael Faraday, 1849'] },
  { title: 'Nonlocality', boss: 'bell', epi: ['Physics should represent a reality in time and space, free from spooky actions at a distance.', 'Albert Einstein, letter to Max Born, 1947'] },
  { title: 'The Box', boss: 'apparatus', epi: ['One can even set up quite ridiculous cases. A cat is penned up in a steel chamber…', 'Erwin Schrödinger, 1935'] },
];
const CHAPTER_LEN = 4;
const CAMPAIGN = [
  { anom: [], name: 'The Standard Model' }, { anom: ['tunnel'] }, { anom: ['blackhole'] }, { boss: 'observer' },
  { anom: ['entangle'] }, { anom: ['planck'] }, { anom: ['zeno'] }, { boss: 'laplace' },
  { anom: ['perpetual'] }, { anom: ['godel'] }, { anom: ['zombie'] }, { boss: 'maxwell' },
  { anom: ['gravity'] }, { anom: ['duality'] }, { anom: ['vacuum'] }, { boss: 'die' },
  { anom: ['coulomb'] }, { anom: ['pauli'] }, { anom: ['superpos'] }, { boss: 'slit' },
  { anom: ['propertime'] }, { anom: ['hubble'] }, { anom: ['exclusion'] }, { boss: 'threebody' },
  { anom: ['newton3'] }, { anom: ['uncertainty'] }, { anom: ['wormhole'] }, { boss: 'oscillator' },
  { anom: ['casimir'] }, { anom: ['doppler'] }, { anom: ['blackhole', 'coulomb'] }, { boss: 'cyclotron' },
  { anom: ['entangle', 'tunnel'] }, { anom: ['wormhole', 'entangle'] }, { anom: ['uncertainty', 'superpos'] }, { boss: 'bell' },
  { anom: ['godel', 'gravity'] }, { anom: ['zeno', 'superpos', 'symmetry'] }, { anom: ['slowlight', 'vacuum', 'manyworlds'] }, { boss: 'apparatus' },
];
// each chapter is an experiment: an aim, and a method made from its waves
const EXP_AIMS = [
  'Find out what happens to a cat in several places at once when something looks at it.',
  'Test whether the future is already decided.',
  'Test whether disorder must always grow.',
  'Find out whether God plays dice.',
  'Find out what really goes through the slits.',
  'Predict the motion of three bodies.',
  'Find the lowest energy anything can have.',
  'Measure how fields steer moving charges.',
  'Settle whether the world is both local and real.',
  'Open the box.',
];
const expMethod = ch => { const w = CAMPAIGN.slice((ch - 1) * CHAPTER_LEN, ch * CHAPTER_LEN), laws = w.filter(c => !c.boss).map(c => (c.anom || []).map(a => LAWS[a].name).join(' with ') || 'nothing suspended'), boss = w.find(c => c.boss); return 'Three waves (' + laws.join('; ') + '), then ' + BOSS_DEFS[boss.boss].name + '.'; };
const BOSS_ORDER = CHAPTERS.map(c => c.boss);
const chapterOf = n => clamp(Math.ceil(n / CHAPTER_LEN), 1, CHAPTERS.length);
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
