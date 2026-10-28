// ---------- tuning ----------
const W = 2000, H = 1300; // arena (world units)
const SIM_DT = 1 / 120;

const CFG = {
  player: {
    speed: 340, accel: 3200, decel: 2400,
    hitR: 4.6, drawSize: 34,
    fireRate: 11, bulletSpeed: 1180, bulletLife: 0.95, bulletDmg: 1,
    spreadBase: 30, spreadPerQ: 7, maxQubits: 4, boostQubits: 5,
    invulnAfterHit: 0.35, invulnRespawn: 2.6,
  },
  coh: {
    max: 100, regen: 17, regenDelay: 0.55,
    splitCost: 7, minToSplit: 9,
    drainBase: 2.6, drainExp: 0.78,
    envR: 165, envPer: 1.3, envMax: 11,
    hitCost: 9, foldRefund: 2.2,
  },
  lives: 9,
  multMax: 16, multStep: 0.04,
  grazeR: 16,
};

// Score values per enemy kind are set in the enemy table (08_enemies.js).

// ---------- difficulty ----------
// hp/fire/bspd/espd scale enemies, boss scales boss health, drain scales decoherence,
// score and cites scale what a run is worth.
const DIFFS = {
  undergrad: { name: 'Undergrad', blurb: 'Slower, sparser bullets and twelve lives. For learning how the cat works.', lives: 12, hp: 0.8, fire: 0.72, bspd: 0.86, espd: 0.9, boss: 0.78, drain: 0.85, score: 0.5, cites: 0.6, col: 'cyan' },
  graduate: { name: 'Graduate', blurb: 'The experiment as designed. Nine lives.', lives: 9, hp: 1, fire: 1, bspd: 1, espd: 1, boss: 1, drain: 1, score: 1, cites: 1, col: 'gold' },
  postdoc: { name: 'Postdoc', blurb: 'Denser patterns, tougher enemies, six lives. Underpaid and overworked.', lives: 6, hp: 1.25, fire: 1.25, bspd: 1.1, espd: 1.08, boss: 1.25, drain: 1.1, score: 1.6, cites: 1.5, col: 'pink' },
  reviewer2: { name: 'Reviewer 2', blurb: 'Hates your paper. Three lives, no extra lives from score, and everything hurts.', lives: 3, hp: 1.5, fire: 1.5, bspd: 1.2, espd: 1.15, boss: 1.5, drain: 1.2, score: 2.5, cites: 2.2, col: 'red', noExtra: true },
};
const DIFF_IDS = Object.keys(DIFFS);

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
  { anom: ['propertime'] }, { anom: ['hubble'] }, { anom: ['slowlight'] }, { boss: 'threebody' },
  { anom: ['newton3'] }, { anom: ['uncertainty'] }, { anom: ['symmetry'] }, { boss: 'oscillator' },
  { anom: ['casimir'] }, { anom: ['manyworlds'] }, { anom: ['blackhole', 'coulomb'] }, { boss: 'cyclotron' },
  { anom: ['godel', 'gravity'] }, { anom: ['zeno', 'superpos'] }, { anom: ['slowlight', 'vacuum', 'tunnel'] }, { boss: 'apparatus' },
];
const BOSS_ORDER = CHAPTERS.map(c => c.boss);
const chapterOf = n => clamp(Math.ceil(n / CHAPTER_LEN), 1, CHAPTERS.length);
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
