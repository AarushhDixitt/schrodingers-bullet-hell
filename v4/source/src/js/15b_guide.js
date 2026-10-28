// ---------- the field guide & first-encounter notes ----------
const PICKUP_INFO = {
  cool: { name: 'Coolant', desc: 'The snowflake. Restores 14 coherence. Enemies drop it often.' },
  H: { name: 'Ĥ⁺ boost', desc: 'An extra qubit for 14 seconds: up to 32 cats. They stack (64, 128, even 256 cats), but each one you hold makes the next half as likely to drop.' },
  T: { name: 'T gate', desc: 'Your shots pierce through enemies for 12 seconds.' },
  F: { name: 'Dilution fridge', desc: 'Coherence stops draining for 9 seconds. Split as much as you like.' },
  E: { name: 'Quantum eraser', desc: 'The ∅ box. Erases every enemy bullet on the screen.' },
  S: { name: 'Spin echo', desc: 'The π box. For seven seconds everything except you runs at half speed.' },
  C: { name: 'Illegal clone', desc: 'The +1 box. One extra life. The no-cloning theorem forbids it, which is why it is rare.' },
};
function waveHow(d) {
  if (!d) return '';
  if (d.boss) return BOSS_DEFS[d.boss].short + (d.anom.length ? ' Also: ' + LAWS[d.anom[0]].short : '');
  if (!d.anom.length) return 'Nothing is broken yet. Split, shoot, and see how hits work.';
  return d.anom.length === 1 ? LAWS[d.anom[0]].how : d.anom.map(a => LAWS[a].short).join('  ·  ');
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
  'Hold focus (Shift) to thread a gap: you slow down, your cats pull in tight and their hitboxes light up.',
  'A fold is a dodge. Steer away from the danger and fold: you land on the cat furthest that way, and nothing can hit you mid-fold.',
  'Bosses are armoured. Learn each one’s weak window (the boss bar says WEAK) and save your damage for it.',
  'The interpretation you choose after the first boss decides which discoveries you are offered. Pick for your play style.',
  'You can start from any chapter you have reached on that difficulty or a harder one. You get an interpretation and a free discovery for each boss you skip.',
  'Endless and Boss rush unlock when you finish the campaign on Undergrad or harder. Nobel Committee unlocks on Reviewer 2.',
];
const GUIDE_TABS = ['idea', 'screen', 'controls', 'pickups', 'modes', 'tips'];
const GUIDE_ENEMIES = ['electron', 'proton', 'muon', 'tachyon', 'quark', 'physicist', 'positron', 'neutrino', 'turret', 'neutron', 'magnetar', 'alpha', 'atom', 'higgs', 'darkmatter', 'virtual'];

// pick a column count the cards fill: no row with a single card hanging off the end
function balanceGrid(g, min = 260) {
  const n = g.children.length, fit = () => { const w = g.clientWidth || 860, max = Math.max(1, Math.min(3, Math.floor((w + 10) / (min + 10)))); let c = max; for (; c > 1; c--) if (n % c === 0 || n % c >= c - 1) break; g.style.gridTemplateColumns = `repeat(${c}, minmax(0, 1fr))`; };
  fit(); if (!g.dataset.bal) { g.dataset.bal = 1; new ResizeObserver(fit).observe(g); }
}
const Guide = {
  built: false, from: null, raf: 0, last: 0, mocks: new Map(), seen: null,
  build() {
    if (this.built) return; this.built = true;
    for (const k of ['cool', 'H', 'T', 'F', 'E', 'S', 'C']) this.card('g-pickups', 'pickup:' + k, PICKUP_INFO[k].name, '', PICKUP_INFO[k].desc);
    for (const [k, S] of Object.entries(SCHOOLS)) this.card('g-schools', null, S.icon + ' ' + S.name, '', [S.sig, 'Cost: ' + S.cost, 'Only offered to this school: ' + PERKS.filter(p => p.school === k).map(p => p.name).join(', ') + '.'], { eq: S.motto });
    for (const g of document.querySelectorAll('#scr-guide .cards:not(.one)')) balanceGrid(g);
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
    for (const t of [].concat(text)) { const p = document.createElement('p'); p.textContent = t; body.append(p); }
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
    for (const cv of panel.querySelectorAll('canvas[data-icon]')) try { this.drawIcon(cv, cv.dataset.icon, dt); } catch (e) { cv.dataset.icon = ''; console.warn('guide icon', e); } // one broken picture must not blank the rest
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
      const mk = (x, y) => ({ id: uid(), type: id, def, x, y, vx: 1, vy: 0.2, r: def.r, t: Math.random() * 3, col: PI_[def.col], state: id === 'physicist' || id === 'professor' ? 'walk' : 'rest', st: 1, face: 1, spin: 1, arms: 3, ang: 0, life: 5, life0: 7, ph: Math.random() * TAU, beamState: 0, beamA: 0.4, dx: 0, dy: 0, sp: null, pair: null, trail: [], sh: Array(8).fill(4), a: 0, hitT: [-9, -9], mT: 0, jet: 0, jetA: 0.5, R: 0, st0: 1, hp: 1, maxHp: 1 });
      if (id === 'quark') { m = { kind: 'triad', q: [0, 1, 2].map(s => { const e = mk(0, 0); e.col = [PI_.red, PI_.green, PI_.blue][s]; return e; }), t: 0 }; }
      else if (id === 'virtual') { const a = mk(-14, 0), b = mk(14, 0); b.col = PI_.violet; a.col = PI_.white; a.pair = b; b.pair = a; if (a.id > b.id) { const tmp = a.id; a.id = b.id; b.id = tmp; } m = { kind: 'pair', a, b, t: 0 }; }
      else { m = { kind: 'enemy', e: mk(0, 0) }; if (['neutrino', 'neutron', 'alpha', 'atom', 'higgs', 'darkmatter'].includes(id)) { if (def.init) def.init(m.e, { a: 0.4 }); m.e.trail = []; m.e.x = 0; m.e.y = 0; } }
    } else if (type === 'boss') {
      const def = BOSS_DEFS[id]; const b = { id: uid(), def, bossDef: def, x: 0, y: 0, vx: 0, vy: 0, t: 0, phase: 1, hp: 1, maxHp: 1, flash: 0, r: def.r };
      def.init(b); b.x = 0; b.y = 0; if (b.glyphs) b.glyphs = []; b.vx = 0; b.vy = 0;
      m = { kind: 'boss', b, id };
    } else if (type === 'hole') m = { kind: 'hole', id, t: Math.random() * 9 };
    else m = { kind: 'pickup', id, t: 0 };
    this.mocks.set(kind, m); return m;
  },
  drawIcon(cv, kind, dt) {
    const f = this.fit(cv); if (!f) return; const [c, w, h] = f;
    const m = this.mock(kind);
    c.save(); c.translate(w / 2, h / 2);
    if (m.kind === 'enemy') {
      const e = m.e; e.t += dt;
      if (e.type === 'turret') e.ang += dt * 1.7;
      if (e.type === 'muon') { e.life -= dt; if (e.life < 0) e.life = e.life0; }
      if (e.type === 'magnetar') { e.beamA += dt * 0.6; e.beamState = (e.t % 3) < 1 ? 1 : (e.t % 3) < 2 ? 2 : 0; }
      if (e.type === 'tachyon') { e.vx = Math.cos(e.t * 0.8); e.vy = Math.sin(e.t * 0.8); }
      if (e.type === 'neutrino') { e.flavor = Math.floor(e.t * 0.8) % 3; e.ghost = e.flavor !== 0; e.col = NU_COL()[e.flavor]; }
      if (e.type === 'atom') { e.a += dt * 2.3; e.spin += dt * 0.4; }
      if (e.type === 'alpha') e.spin += dt * 1.4;
      if (e.type === 'darkmatter') e.flash = 0.1;
      if (e.type === 'lead' || e.type === 'quasar') e.a = (e.a || 0) + dt * 1.2;
      if (e.type === 'cooper') e.spin = (e.spin || 0) + dt * 1.1;
      if (e.type === 'quasar') e.jetA += dt * 0.4;
      const s = (w * 0.3) / Math.max(e.def.iconR || e.r, 11);
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
    } else if (m.kind === 'boss' && m.b.bossDef.iconDraw) {
      const b = m.b; b.t += dt; const s = w / 250; c.scale(s, s); b.bossDef.iconDraw(b, c, b.t);
    } else if (m.kind === 'boss') {
      const b = m.b; b.t += dt;
      if (m.id === 'observer') { b.pupX = Math.cos(b.t * 0.9) * 22; b.pupY = Math.sin(b.t * 1.3) * 14; b.open = 0.55 + 0.45 * Math.min(1, Math.abs(Math.sin(b.t * 0.45)) * 4); }
      if (m.id === 'laplace') { b.handA[0] += dt * 0.25; b.handA[1] += dt * 0.9; b.handA[2] += dt * 2.4; }
      if (m.id === 'die') b.q = Qn.norm(Qn.mul(Qn.axis(0.8, 1, 0.3, dt * 0.9), b.q));
      const s = w / (m.id === 'laplace' ? 300 : 250); c.scale(s, s); if (m.id === 'laplace') c.translate(0, 26);
      b.bossDef.draw(b, c);
    } else if (m.kind === 'hole') {
      m.t += dt; const s = w / 120; c.scale(s, s);
      const one = (x, y, R, hot, k) => {
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 * k; c.drawImage(softSprite(hot ? PI_.ice : PI_.orange, 64), x - R * 3.2, y - R * 3.2, R * 6.4, R * 6.4); c.globalAlpha = 1;
        c.strokeStyle = hot ? 'rgba(150,220,255,.75)' : 'rgba(255,160,70,.8)'; c.lineWidth = R * 0.35; c.beginPath(); c.ellipse(x, y, R * 2.6, R * 0.75, 0, 0, TAU); c.stroke();
        c.globalCompositeOperation = 'source-over'; dot(c, x, y, R * 1.1, '#000'); c.strokeStyle = 'rgba(255,236,200,.95)'; c.lineWidth = 1.4; ring(c, x, y, R * 1.18); c.stroke();
      };
      if (m.id === 'merger') { const a = m.t * 2.2, d = 18 + 6 * Math.sin(m.t * 0.7); one(Math.cos(a) * d, Math.sin(a) * d * 0.6, 9, false, 1); one(-Math.cos(a) * d, -Math.sin(a) * d * 0.6, 7, false, 1); c.strokeStyle = 'rgba(140,212,255,.35)'; c.lineWidth = 1.5; for (let k = 0; k < 3; k++) { ring(c, 0, 0, ((m.t * 40 + k * 18) % 54) + 6); c.stroke(); } }
      else { const R = { primordial: 7, stellar: 11, intermediate: 15, supermassive: 19 }[m.id] || 11; one(0, 0, R, m.id === 'primordial', 1); if (m.id !== 'primordial' && m.id !== 'stellar') { c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(170,210,255,.5)'; c.lineWidth = 2; const ja = m.t * 0.4; for (const sd of [0, PI]) { c.beginPath(); c.moveTo(Math.cos(ja + sd) * R, Math.sin(ja + sd) * R); c.lineTo(Math.cos(ja + sd) * 58, Math.sin(ja + sd) * 58); c.stroke(); } c.globalCompositeOperation = 'source-over'; } }
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
    if (key.startsWith('enemy:') && ELITE_IDS.includes(key.slice(6))) return; // elites get their own banner
    if (!this.seen) this.seen = new Set(store('seen') || []);
    if (this.seen.has(key)) return;
    this.seen.add(key); store('seen', [...this.seen]);
    const [type, id] = key.split(':');
    const info = type === 'enemy' ? { name: ET[id].info[0], desc: ET[id].info[1] } : type === 'pickup' ? PICKUP_INFO[id] : type === 'boss' ? { name: BOSS_DEFS[id].name, desc: BOSS_DEFS[id].short } : null;
    if (info) UI.note('New: ' + info.name, info.desc);
  },
};
