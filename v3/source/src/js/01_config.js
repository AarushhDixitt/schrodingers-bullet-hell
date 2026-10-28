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

// ---------- the campaign: nine chapters, each three suspended laws and a boss ----------
const CHAPTERS = [
  { title: 'Measurement', boss: 'observer' },
  { title: 'Determinism', boss: 'laplace' },
  { title: 'Thermodynamics', boss: 'maxwell' },
  { title: 'Chance', boss: 'die' },
  { title: 'Interference', boss: 'slit' },
  { title: 'Gravitation', boss: 'threebody' },
  { title: 'Oscillation', boss: 'oscillator' },
  { title: 'Fields', boss: 'cyclotron' },
  { title: 'The Box', boss: 'apparatus' },
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
  { anom: ['godel', 'gravity'] }, { anom: ['zeno', 'superpos', 'symmetry'] }, { anom: ['slowlight', 'vacuum', 'manyworlds'] }, { boss: 'apparatus' },
];
const BOSS_ORDER = CHAPTERS.map(c => c.boss);
const chapterOf = n => clamp(Math.ceil(n / CHAPTER_LEN), 1, CHAPTERS.length);
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
