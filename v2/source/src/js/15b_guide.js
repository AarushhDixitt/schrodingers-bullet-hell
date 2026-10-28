// ---------- the field guide & first-encounter notes ----------
const ENEMY_INFO = {
  electron: { name: 'Electron', hp: '1 hit', desc: 'Swarms toward you on a wobbling path. Weak, but there are a lot of them.' },
  proton: { name: 'Proton', hp: '5 hits', desc: 'Slow and sturdy. Fires single aimed shots.' },
  muon: { name: 'Muon', hp: '3 hits', desc: 'A fast chaser that decays after a few seconds into a ring of eight bullets. The arc around it is its countdown.' },
  tachyon: { name: 'Tachyon', hp: '3 hits', desc: 'Draws a dashed line to where it is going, then dashes along it. Step off the line.' },
  quark: { name: 'Quark triad', hp: '3 hits each', desc: 'Three quarks on gluon strings. Kill all three within about three seconds, or the dead ones grow back.' },
  physicist: { name: 'Physicist', hp: '4 hits', desc: 'Walks up and takes a measurement: your cats inside its dashed ring either all survive or all collapse. When you are a single cat it throws photons instead.' },
  positron: { name: 'Positron', hp: '2 hits', desc: 'Antimatter. When it dies it annihilates and damages every enemy nearby, so chain reactions are common.' },
  turret: { name: 'Spin-½ turret', hp: '28 hits', desc: 'Parks somewhere and sprays spiral streams of bullets. Its spin flips every few seconds.' },
  magnetar: { name: 'Magnetar', hp: '46 hits', desc: 'Sweeps two pulsar beams: a dashed warning line first, then a solid beam. Its magnetic field bends your bullets around it.' },
  neutrino: { name: 'Neutrino', hp: '2 hits', desc: 'Streaks straight across the arena, cycling through three flavours. Only the solid green (electron) flavour can hit you or be hit. The dotted flavours pass through everything.' },
  neutron: { name: 'Neutron', hp: '8 hits', desc: 'Slow and tough. When it dies, or decays after about fifteen seconds, it splits into a proton and an electron.' },
  alpha: { name: 'Alpha particle', hp: '10 hits', desc: 'Tunnels. A dashed ghost shows where it will reappear, then it pops out there and fires a ring of bullets.' },
  atom: { name: 'Atom', hp: '12 hits', desc: 'Three orbiting electrons catch your shots. Knock each one loose (three hits) and it flies off as a free electron. Fires spectral lines (hν).' },
  higgs: { name: 'Higgs boson', hp: '7 hits', desc: 'Gives mass to everything in its golden field: enemies inside are slower but take half damage, and bullets inside slow down. Decays into two photons after about twenty seconds.' },
  darkmatter: { name: 'Dark matter', hp: '22 hits', desc: 'Invisible. You only see it by how it bends light, the grid and bullets around it. It shows faintly when your cats get close.' },
  virtual: { name: 'Virtual pair', hp: '1 hit', desc: 'Only during Vacuum Fluctuations. Two particles pop out of nothing, fly apart, then annihilate when they meet. Kill one and the other becomes a real electron.' },
};
const PICKUP_INFO = {
  cool: { name: 'Coolant', desc: 'The snowflake. Restores 14 coherence. Enemies drop it often.' },
  H: { name: 'Ĥ⁺ boost', desc: 'A fifth qubit for 14 seconds, so you can split up to 32 cats.' },
  T: { name: 'T gate', desc: 'Your shots pierce through enemies for 12 seconds.' },
  F: { name: 'Dilution fridge', desc: 'Coherence stops draining for 9 seconds. Split as much as you like.' },
  E: { name: 'Quantum eraser', desc: 'The ∅ box. Erases every enemy bullet on the screen.' },
  S: { name: 'Spin echo', desc: 'The π box. For seven seconds everything except you runs at half speed.' },
  C: { name: 'Illegal clone', desc: 'The +1 box. One extra life. The no-cloning theorem forbids it, which is why it is rare.' },
};
const ANOM_HOW = {
  tunnel: 'The arena edges wrap around. Leave one side and you come back on the opposite side, and so does everything else.',
  blackhole: 'A black hole pulls you, enemies and bullets toward it. Touching its dark centre counts as a hit. Enemies that fall in die.',
  entangle: 'Enemies arrive in linked pairs. Damage to one also hits its partner, and killing one kills both.',
  planck: 'Everything is pixelated, and enemies move in quantum leaps: they freeze, then jump forward.',
  zeno: 'Everything inside your aim cone is frozen, bullets included. Everything outside it moves 45% faster.',
  godel: 'The camera slowly rotates and bullets curve. Your controls stay relative to the screen.',
  zombie: 'Each killed enemy leaves a box. Shoot the box to confirm the death, or it may come back as a zombie.',
  gravity: 'Everything falls toward the bottom of the arena. Hold up to stay in the air. Your shots arc.',
  duality: 'Your bullets become spreading waves that pass through enemies and hit several of them.',
  vacuum: 'Particle pairs pop out of nothing, fly apart, then explode when they meet again. Kill one and the other becomes real.',
  pauli: 'Every few seconds a gate hits the universe. X mirrors the arena, Z reverses every bullet, Y does both. Watch the countdown.',
  propertime: 'The faster you move, the faster enemies and their bullets move. Stand still to slow the world down. γ shows the factor.',
  superpos: 'Each enemy has two or three copies and only one is real. Shooting a copy reveals whether it was the real one.',
  uncertainty: 'Moving blurs where enemies are. Standing still makes where they are going unpredictable.',
  manyworlds: 'Cats you lose keep firing for a few seconds from a parallel timeline, and two ghost cats fight beside you.',
  perpetual: 'Enemy bullets bounce off the arena walls once instead of leaving, so they stay in play much longer. The arena fills up.',
  coulomb: 'Every enemy bullet is charged. Red ones are pushed away from your cats, blue ones are pulled toward them. Watch for blue bullets curving in.',
  hubble: 'Enemy bullets keep speeding up the longer they fly. Shots from close by are slow; shots from across the arena arrive fast.',
  slowlight: 'You see each enemy where it was when its light left it, so far-away enemies show up late and lag behind. A faint dotted ring marks where each one really is.',
  newton3: 'Every shot pushes you backwards and nothing slows you down. Steer in short bursts. The arrow shows your momentum.',
  symmetry: 'Everything is pulled toward a ring around the centre of the arena and drifts along it. Moving against the pull takes effort.',
  casimir: 'Metal plates close in from the left and right every few seconds, squeezing the arena. Bullets bounce off them, and they push you along. When fully closed they shed sheets of bullets.',
};
const ANOM_SHORT = {
  tunnel: 'Edges wrap around.', blackhole: 'A black hole pulls everything. Avoid the centre.', entangle: 'Linked pairs share damage.',
  planck: 'Pixelated. Enemies move in jumps.', zeno: 'What you aim at freezes. The rest speeds up.', godel: 'The screen rotates. Bullets curve.',
  zombie: 'Shoot the boxes or the dead come back.', gravity: 'Everything falls. Hold up.', duality: 'Your shots are piercing waves.',
  vacuum: 'Pairs pop in and explode when they meet.', pauli: 'Mirror and reversal gates every few seconds.', propertime: 'Moving speeds up the world.',
  superpos: 'Only one copy of each enemy is real.', uncertainty: 'Moving blurs enemies. Standing still makes them erratic.', manyworlds: 'Lost cats keep fighting for a while.',
  perpetual: 'Bullets bounce off the walls.', coulomb: 'Red bullets repel you, blue ones attract.', hubble: 'Bullets speed up as they fly.', slowlight: 'You see enemies late.',
  newton3: 'Shots push you back. No friction.', symmetry: 'Everything rolls into a ring.', casimir: 'Plates squeeze in from the sides.',
};
const BOSS_HOW = {
  observer: { short: 'Keep your cats out of its gaze. Shoot the pupil for double damage.', text: 'Its gaze cone collapses any of your cats inside it, and it fires down that line. It also fires rings, cries falling tears, and blinks to summon physicists. Shoot the pupil for double damage. It cannot be hurt while its eye is shut.' },
  laplace: { short: 'Watch the crosshairs and dashed lines. Spread out to fool its aim.', text: 'Fires where it predicts you will be (watch the crosshairs) and sweeps clock-hand lasers. Below half health it rewinds time and every bullet on screen reverses. It aims at the average of your cats, so spreading out confuses it.' },
  maxwell: { short: 'Shoot the demon on the wall. Slip through the door to the cooler side. Hit it while it erases its memory.', text: 'A membrane splits the arena. The demon rides it, firing fast (red) molecules into your chamber and slow (blue) ones into the other. Molecules bounce off every wall. The door opens every few seconds: slip through to the cooler side. It can slide the wall into your chamber to squeeze it. Every molecule fills a bit of its memory, and when the memory is full it must stop to erase it (Landauer’s principle): double damage while it does.' },
  die: { short: 'Every number it rolls is a different attack. A natural 1 stuns it.', text: 'Tumbles around the arena, then attacks according to the number it rolls: 1 one huge orb that bursts, 2 a double spiral, 3 three rotating lasers, 4 walls of bullets with one gap, 5 homing mines, 6 six fast streams. Below 30% health it becomes a d20. A natural 1 stuns it and doubles your damage. A natural 20 fills the screen.' },
  slit: { short: 'Stand in the dark lanes between bright fringes. Aim straight at a slit to collapse the pattern.', text: 'A barrier with slits closes off the top of the arena, with an electron gun behind it. Bullets come through as an interference pattern: bright lanes full of bullets and dark lanes that are safe. Aim straight at a slit and you gain which-path information, so the pattern collapses into two simple clumps. Shots that hit the barrier do a little damage; shots that pass through a slit and hit the gun do double. It later becomes a three-slit grating, and in its last phase watching no longer helps.' },
  threebody: { short: 'Three suns bend every bullet. Watch for the slingshot line and the alignment beam.', text: 'Three stars under real Newtonian gravity, sharing one health bar. Their gravity bends every bullet, yours included. They orbit chaotically, trace the famous figure-eight solution while dropping bullets, fling one star across the arena along a dashed line (slingshot), and later line up into a rotating beam (syzygy).' },
  oscillator: { short: 'Its bullets always come back to where they were fired. Stay off those centres.', text: 'An orb on two springs, swinging back and forth. Every bullet it fires is on a spring too: it flies out, stops, and comes back through the point it was fired from, all at the same moment, because that is what harmonic means. Ladder attacks fire shells at the quantum energy levels, wave attacks ripple two strings of bullets past you, and collapse attacks pull a ring inward. Later it is driven at resonance and fires every time it whips through the middle.' },
  cyclotron: { short: 'A magnetic field curls every bullet into circles. Your shots curve a little too.', text: 'A particle accelerator. Its magnetic field (⊙ out of the screen, ⊗ into it) bends charged bullets into circles and bends your shots slightly the other way. It fires accelerating particles that spiral outward, flips the field so every orbit reverses, and sends lightning toward you after a dashed warning. Later an electric field makes every circle drift sideways (E×B drift), and in its last phase it circles the arena firing straight synchrotron light that ignores the field.' },
  apparatus: { short: 'Avoid γ-ray lines, hammer shadows and poison clouds. Shoot the glowing source for double damage.', text: 'The thought experiment itself: a radioactive source, a Geiger counter, a hammer and a flask of poison, on a shelf at the top of the box. Every decay is random: α particles drift and burst, β electrons come fast, γ rays are lines that flash after a dashed warning. In its second phase the hammer comes down on shadows that follow you. In the last phase the flask breaks: poison clouds measure any cat inside them, and the walls of the box close in. Shoot the glowing source for double damage.' },
};
function waveHow(d) {
  if (!d) return '';
  if (d.boss) return BOSS_HOW[d.boss].short + (d.anom.length ? ' Also: ' + ANOM_SHORT[d.anom[0]] : '');
  if (!d.anom.length) return 'Nothing is broken yet. Split, shoot, and see how hits work.';
  if (d.anom.length === 1) return ANOM_HOW[d.anom[0]];
  return d.anom.map(a => ANOM_SHORT[a]).join('  ·  ');
}
const TIPS = [
  'Split early, fold before coherence runs out. The fold shockwave clears bullets around you, so it doubles as a panic button.',
  'One cat has a tiny hitbox and is easy to steer through gaps. Sixteen cats can absorb several hits. Switch between the two.',
  'Each split costs a little coherence and every hit you survive costs more. Coolant snowflakes refill it.',
  'Kills while you are split raise the score multiplier faster. Dying resets it.',
  'Grazing a bullet (passing very close without touching) gives points and a little coherence.',
  'Lasers, beams and tachyons always show a dashed line first. Get off the line.',
  'Physicists only measure cats inside their dashed ring. Fold or move away before the flash.',
  'Each boss you beat publishes a paper: choose one discovery that lasts for the rest of the run.',
  'Every run earns citations, even a short one. Spend them in the grant office on permanent upgrades.',
  'You can start from any chapter you have reached. You get a free discovery for each boss you skip.',
  'Endless and Boss rush unlock when you finish the campaign on any difficulty.',
];
const GUIDE_TABS = ['idea', 'screen', 'beasts', 'laws', 'bosses', 'meta'];
const GUIDE_ENEMIES = ['electron', 'proton', 'muon', 'tachyon', 'quark', 'physicist', 'positron', 'neutrino', 'turret', 'neutron', 'magnetar', 'alpha', 'atom', 'higgs', 'darkmatter', 'virtual'];

const b0 = m => m.b;
const Guide = {
  built: false, from: null, raf: 0, last: 0, mocks: new Map(), seen: null,
  build() {
    if (this.built) return; this.built = true;
    for (const k of GUIDE_ENEMIES) {
      const I = ENEMY_INFO[k]; const first = Object.entries(GROUPS).find(([, g]) => g.spawn.toString().includes("'" + k + "'"));
      this.card('g-beasts', 'enemy:' + k, I.name, I.hp + (first && GROUPS[first[0]].min > 1 ? ' · from wave ' + GROUPS[first[0]].min : ''), I.desc);
    }
    for (const k of ['cool', 'H', 'T', 'F', 'E', 'S', 'C']) this.card('g-pickups', 'pickup:' + k, PICKUP_INFO[k].name, '', PICKUP_INFO[k].desc);
    const seenLaw = new Set();
    CAMPAIGN.forEach((c, i) => { const id = c.anom && c.anom.length === 1 ? c.anom[0] : null; if (id && !seenLaw.has(id)) { seenLaw.add(id); this.card('g-laws', null, ANOMS[id].name, 'Wave ' + (i + 1) + ' · Chapter ' + ROMAN[chapterOf(i + 1)], ANOM_HOW[id], { eq: ANOMS[id].eq }); } });
    BOSS_ORDER.forEach((k, i) => this.card('g-bosses', 'boss:' + k, BOSS_DEFS[k].name, 'Wave ' + (i + 1) * CHAPTER_LEN + ' · Chapter ' + ROMAN[i + 1] + ' · ' + CHAPTERS[i].title, BOSS_HOW[k].text, { wide: true }));
    const tl = $('g-tips'); for (const t of TIPS) { const li = document.createElement('li'); const s = document.createElement('span'); s.textContent = t; li.append(s); tl.append(li); }
    for (const id of GUIDE_TABS) $('tab-' + id).addEventListener('click', () => this.select(id));
    $('tab-idea').parentElement.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const ids = GUIDE_TABS; const cur = ids.indexOf(this.tab);
      const nx = ids[(cur + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length]; this.select(nx); $('tab-' + nx).focus(); e.preventDefault();
    });
    $('b-guide-close').addEventListener('click', () => this.hide());
    $('b-hints-reset').addEventListener('click', () => { this.seen = new Set(); store('seen', []); Game.toasts.clear(); UI.toast('First-time hints will show again.'); });
  },
  card(parent, icon, title, tag, text, o = {}) {
    const el = document.createElement('div'); el.className = 'card' + (o.wide ? ' wide' : '');
    if (icon) { const cv = document.createElement('canvas'); cv.dataset.icon = icon; cv.setAttribute('aria-hidden', 'true'); el.append(cv); }
    else el.style.gridTemplateColumns = '1fr';
    const body = document.createElement('div'); body.style.minWidth = '0';
    if (tag) { const t = document.createElement('p'); t.className = 'tag'; t.textContent = tag; body.append(t); }
    const h = document.createElement('h4'); h.textContent = title; body.append(h);
    if (o.eq) { const q = document.createElement('p'); q.className = 'eq'; q.textContent = o.eq; body.append(q); }
    const p = document.createElement('p'); p.textContent = text; body.append(p);
    el.append(body); $(parent).append(el);
  },
  show(from) {
    this.build();
    this.from = from;
    if (from) $(from).hidden = true;
    $('scr-guide').hidden = false;
    this.select(this.tab || 'idea');
    $('b-guide-close').focus();
    cancelAnimationFrame(this.raf); this.last = 0;
    this.raf = requestAnimationFrame(t => this.loop(t));
  },
  hide() {
    $('scr-guide').hidden = true;
    cancelAnimationFrame(this.raf); this.raf = 0;
    if (this.from) { $(this.from).hidden = false; const f = $(this.from).querySelector('.btn-primary'); if (f) f.focus(); }
    this.from = null;
  },
  get open() { return !$('scr-guide').hidden; },
  select(id) {
    this.tab = id;
    for (const k of GUIDE_TABS) {
      const on = k === id; $('tab-' + k).setAttribute('aria-selected', String(on)); $('tab-' + k).tabIndex = on ? 0 : -1; $('tp-' + k).hidden = !on;
    }
    $('tp-' + id).scrollTop = 0;
  },
  loop(t) {
    if (!this.open) return;
    const dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 0.016; this.last = t;
    const panel = $('tp-' + this.tab);
    if (this.tab === 'idea') this.drawDiagram($('g-diagram'), t / 1000);
    for (const cv of panel.querySelectorAll('canvas[data-icon]')) this.drawIcon(cv, cv.dataset.icon, dt);
    this.raf = requestAnimationFrame(tt => this.loop(tt));
  },
  fit(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return null;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    return [c, w, h];
  },
  // the split diagram: 1 → 2 → 4 → 8 cats, the same projection the game uses
  drawDiagram(cv, t) {
    const f = this.fit(cv); if (!f) return; const [c, w, h] = f;
    const groups = w < 430 ? [0, 1, 2] : [0, 1, 2, 3];
    const gw = w / groups.length;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    groups.forEach((nq, gi) => {
      const cx = gw * (gi + 0.5), cy = h * 0.42;
      const kx = gw * (nq >= 3 ? 0.13 : 0.16), ky = h * (nq >= 3 ? 0.15 : 0.2);
      const pts = [];
      for (let b = 0; b < (1 << nq); b++) {
        const v = [0, 0, 0, 0]; let ph = 0;
        for (let q = 0; q < nq; q++) { const bit = (b >> q) & 1; v[q] = bit ? 1 : -1; if (bit) ph += PI / Math.pow(2, q); }
        for (const [i, j, wv] of ROT_PLANES[nq] || []) { const a = t * wv; const cs = Math.cos(a), sn = Math.sin(a); const vi = v[i], vj = v[j]; v[i] = vi * cs - vj * sn; v[j] = vi * sn + vj * cs; }
        let sc = 1, depth = 0; for (let d = nq - 1; d >= 2; d--) { const k = 3.2 / (3.2 - v[d] * 0.5); sc *= k; depth += v[d]; for (let m = 0; m < d; m++) v[m] *= k; }
        let x = v[0], y = nq >= 2 ? v[1] : 0;
        if (nq === 1) { const a = t * 0.35; y = x * Math.sin(a); x = x * Math.cos(a); }
        pts.push({ x: cx + x * kx, y: cy + y * ky, sc, depth, ci: phaseIndex(ph) });
      }
      // hypercube edges
      c.globalAlpha = 0.3; c.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const x = i ^ j; if (x & (x - 1)) continue; c.strokeStyle = PAL_CSS[pts[i].ci]; c.beginPath(); c.moveTo(pts[i].x, pts[i].y); c.lineTo(pts[j].x, pts[j].y); c.stroke(); }
      c.globalAlpha = 1;
      pts.sort((a, b) => a.depth - b.depth);
      const s0 = Math.min(30, h * 0.24) * (nq >= 3 ? 0.85 : 1);
      for (const p of pts) { const s = s0 * p.sc; c.drawImage(catSprite(p.ci, 0), p.x - s / 2, p.y - s * 0.52, s, s); }
      c.font = fontMono(10.5, 600); c.fillStyle = '#9a93c4';
      c.fillText((1 << nq) + (nq ? ' cats' : ' cat'), cx, h - 10);
      if (gi < groups.length - 1) {
        const ax = gw * (gi + 1); c.strokeStyle = 'rgba(236,231,255,.45)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(ax - 12, cy); c.lineTo(ax + 10, cy); c.lineTo(ax + 4, cy - 5); c.moveTo(ax + 10, cy); c.lineTo(ax + 4, cy + 5); c.stroke();
        c.font = fontSerif(15); c.fillStyle = '#4cf2ff'; c.fillText('Ĥ', ax, cy - 16);
      }
    });
  },
  mock(kind) {
    let m = this.mocks.get(kind); if (m) return m;
    const [type, id] = kind.split(':');
    if (type === 'enemy') {
      const def = ET[id] || ET.electron;
      const mk = (x, y) => ({ id: uid(), type: id, def, x, y, vx: 1, vy: 0.2, r: def.r, t: Math.random() * 3, col: PI_[def.col], state: id === 'physicist' ? 'walk' : 'rest', st: 1, face: 1, spin: 1, arms: 3, ang: 0, decay: 5, decay0: 7, ph: Math.random() * TAU, beamState: 0, beamA: 0.4, dx: 0, dy: 0, sp: null, pair: null });
      if (id === 'quark') { m = { kind: 'triad', q: [0, 1, 2].map(s => { const e = mk(0, 0); e.col = [PI_.red, PI_.green, PI_.blue][s]; return e; }), t: 0 }; }
      else if (id === 'virtual') { const a = mk(-14, 0), b = mk(14, 0); b.col = PI_.violet; a.col = PI_.white; a.pair = b; b.pair = a; if (a.id > b.id) { const tmp = a.id; a.id = b.id; b.id = tmp; } m = { kind: 'pair', a, b, t: 0 }; }
      else { m = { kind: 'enemy', e: mk(0, 0) }; if (['neutrino', 'neutron', 'alpha', 'atom', 'higgs', 'darkmatter'].includes(id)) { def.init(m.e, { a: 0.4 }); m.e.trail = []; m.e.x = 0; m.e.y = 0; } }
    } else if (type === 'boss') {
      const def = BOSS_DEFS[id]; const b = { id: uid(), def, bossDef: def, x: 0, y: 0, vx: 0, vy: 0, t: 0, phase: 1, hp: 1, maxHp: 1, flash: 0, r: def.r };
      def.init(b); b.x = 0; b.y = 0; if (b.glyphs) b.glyphs = []; b.vx = 0; b.vy = 0;
      m = { kind: 'boss', b, id };
    } else m = { kind: 'pickup', id, t: 0 };
    this.mocks.set(kind, m); return m;
  },
  drawIcon(cv, kind, dt) {
    const f = this.fit(cv); if (!f) return; const [c, w, h] = f;
    const m = this.mock(kind);
    c.save(); c.translate(w / 2, h / 2);
    if (m.kind === 'enemy') {
      const e = m.e; e.t += dt;
      if (e.type === 'turret') e.ang += dt * 1.7;
      if (e.type === 'muon') { e.decay -= dt; if (e.decay < 0) e.decay = e.decay0; }
      if (e.type === 'magnetar') { e.beamA += dt * 0.6; e.beamState = (e.t % 3) < 1 ? 1 : (e.t % 3) < 2 ? 2 : 0; }
      if (e.type === 'tachyon') { e.vx = Math.cos(e.t * 0.8); e.vy = Math.sin(e.t * 0.8); }
      if (e.type === 'neutrino') { e.flavor = Math.floor(e.t * 0.8) % 3; e.ghost = e.flavor !== 0; e.col = NU_COL()[e.flavor]; }
      if (e.type === 'atom') { e.a += dt * 2.3; e.spin += dt * 0.4; }
      if (e.type === 'alpha') e.spin += dt * 1.4;
      if (e.type === 'darkmatter') e.flash = 0.1;
      const s = (w * 0.3) / Math.max(e.r, 11);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35; c.drawImage(softSprite(e.col, 64), -w * 0.45, -h * 0.45, w * 0.9, h * 0.9); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.scale(s, s); e.def.draw(e, c, 0, e.type === 'physicist' ? 3 : 0);
    } else if (m.kind === 'triad') {
      m.t += dt; const s = w / 120; c.scale(s, s);
      const pos = m.q.map((e, k) => { const a = m.t * 1.3 + k * TAU / 3; e.x = Math.cos(a) * 30; e.y = Math.sin(a) * 30; e.t += dt; return e; });
      c.globalCompositeOperation = 'lighter'; c.lineWidth = 2; c.strokeStyle = rgba(COL.yellow, 0.6);
      for (let i = 0; i < 3; i++) { const a = pos[i], b = pos[(i + 1) % 3]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; c.beginPath(); for (let k = 0; k <= 14; k++) { const ff = k / 14, wv = Math.sin(ff * PI * 5 + m.t * 14) * 3.5; c.lineTo(a.x + dx * ff - dy / d * wv, a.y + dy * ff + dx / d * wv); } c.stroke(); }
      c.globalCompositeOperation = 'source-over';
      for (const e of pos) ET.quark.draw(e, c, e.x, e.y);
    } else if (m.kind === 'pair') {
      m.t += dt; const sep = 10 + Math.abs(Math.sin(m.t * 1.4)) * 14; const s = w / 70; c.scale(s, s);
      m.a.x = -sep; m.b.x = sep; m.a.t += dt; m.b.t += dt;
      ET.virtual.draw(m.a, c, m.a.x, 0); ET.virtual.draw(m.b, c, m.b.x, 0);
    } else if (m.kind === 'boss' && b0(m).bossDef.iconDraw) {
      const b = m.b; b.t += dt; const s = w / 250; c.scale(s, s); b.bossDef.iconDraw(b, c, b.t);
    } else if (m.kind === 'boss') {
      const b = m.b; b.t += dt;
      if (m.id === 'observer') { b.pupX = Math.cos(b.t * 0.9) * 22; b.pupY = Math.sin(b.t * 1.3) * 14; b.open = 0.55 + 0.45 * Math.min(1, Math.abs(Math.sin(b.t * 0.45)) * 4); }
      if (m.id === 'laplace') { b.handA[0] += dt * 0.25; b.handA[1] += dt * 0.9; b.handA[2] += dt * 2.4; }
      if (m.id === 'die') b.q = Qn.norm(Qn.mul(Qn.axis(0.8, 1, 0.3, dt * 0.9), b.q));
      const s = w / (m.id === 'laplace' ? 300 : 250); c.scale(s, s); if (m.id === 'laplace') c.translate(0, 26);
      b.bossDef.draw(b, c);
    } else {
      m.t += dt; const s = w / 46; c.scale(s, s);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.3; c.drawImage(softSprite(m.id === 'cool' ? PI_.ice : PI_.gold, 64), -22, -22, 44, 44); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      drawPickupGlyph(c, m.id, 0, 0, m.t);
    }
    c.restore();
  },
  // in-game: explain each enemy / pickup the first time it shows up
  firstSeen(key) {
    if (Game.mode !== 'arcade' || !Settings.hints || Bot.on) return;
    if (!this.seen) this.seen = new Set(store('seen') || []);
    if (this.seen.has(key)) return;
    this.seen.add(key); store('seen', [...this.seen]);
    const [type, id] = key.split(':');
    const info = type === 'enemy' ? ENEMY_INFO[id] : type === 'pickup' ? PICKUP_INFO[id] : type === 'boss' ? { name: BOSS_DEFS[id].name, desc: BOSS_HOW[id].short } : null;
    if (info) UI.note('New: ' + info.name, info.desc);
  },
};
