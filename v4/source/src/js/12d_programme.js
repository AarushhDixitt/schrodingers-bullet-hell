// ---------- the Research programme: three grant cycles of branching rooms, each ending in a boss ----------
// A map per cycle: six layers of rooms you choose between, then a boss. Funding is earned and spent inside the run.
// Beat the third boss and the run is published; Tenure track carries on, harder, for as long as you last.
const ROOM_KINDS = {
  exp: { short: 'Experiment', name: 'Experiment', icon: 'flask', blurb: 'A fight with a law of physics suspended.', fund: 40 },
  risk: { short: 'Risky', name: 'Risky experiment', icon: 'risk', blurb: 'Two laws, an elite, and twice the funding.', fund: 90 },
  anom: { short: 'Anomaly', name: 'Anomaly', icon: 'anomaly', blurb: 'Several laws at once, or space weather all the way through.', fund: 70 },
  shop: { short: 'Grants', name: 'Grant office', icon: 'seal', blurb: 'Spend funding on discoveries, lives and supplies.' },
  review: { short: 'Review', name: 'Peer review', icon: 'review', blurb: 'A choice with a cost. Reviewer 2 is waiting.' },
  conf: { short: 'Conference', name: 'Conference', icon: 'conf', blurb: 'Rest, change your interpretation, or improve a discovery.' },
  boss: { short: 'Boss', name: 'Boss', icon: 'rush', blurb: 'The end of this grant cycle.', fund: 150 },
};
const PROG_ACTS = 3, PROG_LAYERS = 6;
const REVIEWS = [
  { t: 'Reviewer 2 demands you remove a discovery.', a: 'Comply: lose a random discovery, gain a life.', b: 'Refuse: lose 40 funding.', ok: () => Mods.list().length > 0,
    A() { const L = Mods.list(); const p = pick(L).p; Mods.perks[p.id]--; if (!Mods.perks[p.id]) delete Mods.perks[p.id]; Mods.compute(); Game.lives++; return 'Removed ' + p.name + '. +1 life.'; }, B() { Programme.spend(Math.min(40, Programme.fund)); return 'Refused. −40 funding.'; } },
  { t: 'Major revisions: the reviewers want a harder experiment.', a: 'Accept: the next fight has an extra law; gain 120 funding.', b: 'Decline politely.',
    A() { Programme.harder = true; Programme.earn(120); return 'Next fight is harder. +120 funding.'; }, B() { return 'Nothing changes.'; } },
  { t: 'A conflict of interest has been declared.', a: 'Settle: give up half your funding for a discovery.', b: 'Contest it: lose a life, keep the money.', ok: () => Game.lives > 1,
    A() { Programme.spend(Math.floor(Programme.fund / 2)); return Programme.offerDiscovery('Settled. Choose a discovery.'); }, B() { Game.lives--; return 'Contested. −1 life.'; } },
  { t: 'Replication crisis: nobody can reproduce your results.', a: 'Redo everything: every discovery is replaced by a random one.', b: 'Stand by your data: lose 30 funding.', ok: () => Mods.list().length > 0,
    A() { const n = Mods.list().reduce((s, x) => s + x.n, 0); Mods.perks = {}; Mods.compute(); for (let k = 0; k < n; k++) { const o = Mods.offer(1); if (o.length) Mods.take(o[0]); } return 'Replaced ' + n + ' discover' + (n === 1 ? 'y' : 'ies') + '.'; }, B() { Programme.spend(Math.min(30, Programme.fund)); return 'Stood firm. −30 funding.'; } },
  { t: 'The journal charges an open-access fee.', a: 'Pay 60 funding: +2 lives.', b: 'Publish behind a paywall: +30 funding.', ok: () => Programme.fund >= 60,
    A() { Programme.spend(60); Game.lives += 2; return '+2 lives.'; }, B() { Programme.earn(30); return '+30 funding.'; } },
  { t: 'A rival group has scooped your result.', a: 'Race them: the next fight has an elite, +1 discovery after it.', b: 'Let it go: +1 life.',
    A() { Programme.race = true; return 'The race is on.'; }, B() { Game.lives++; return '+1 life.'; } },
];
const Programme = {
  act: 1, layer: 0, node: null, map: null, fund: 0, rooms: 0, bossesUsed: [], harder: false, race: false, tenure: false, published: false, room: null,
  label() { return (this.act > PROG_ACTS ? 'Tenure track ' + (this.act - PROG_ACTS) : 'Grant cycle ' + ROMAN[this.act]) + ', room ' + Math.max(1, this.rooms); },
  begin() {
    Object.assign(this, { act: 1, layer: 0, node: null, fund: 60, rooms: 0, bossesUsed: [], harder: false, race: false, tenure: false, published: false, room: null, boost: 0, fridge: 0 });
    this.newMap(); this.showMap();
  },
  earn(n) { n = Math.round(n); this.fund += n; return n; },
  spend(n) { this.fund = Math.max(0, this.fund - n); },
  // ----- the map -----
  newMap() {
    const rnd = Math.random, layers = [];
    for (let l = 1; l <= PROG_LAYERS; l++) {
      const w = l === 1 ? 2 : randi(2, 3), row = [];
      for (let i = 0; i < w; i++) {
        let k;
        if (l === 1) k = 'exp';
        else if (l === PROG_LAYERS && i === 0) k = 'conf';
        else k = weightedPick(['exp', 'risk', 'anom', 'shop', 'review', 'conf'], q => ({ exp: 4.5, risk: l >= 3 ? 1.8 : 0.6, anom: l >= 2 ? 1.2 : 0, shop: l >= 3 ? 1 : 0.3, review: 0.8, conf: l >= 4 ? 0.6 : 0 })[q]);
        row.push({ l, i, k, to: [] });
      }
      layers.push(row);
    }
    if (!layers.slice(2, 5).some(r => r.some(n => n.k === 'shop'))) layers[randi(2, 4)][0].k = 'shop'; // a grant office somewhere in the middle
    for (let l = 0; l < layers.length - 1; l++) { // edges to the nearest one or two rooms in the next layer; everything reachable
      const A = layers[l], B = layers[l + 1];
      for (const n of A) { const f = A.length > 1 ? n.i / (A.length - 1) : 0.5, j = Math.round(f * (B.length - 1)); n.to = [j]; if (rnd() < 0.5) { const k = clamp(j + (rnd() < 0.5 ? -1 : 1), 0, B.length - 1); if (!n.to.includes(k)) n.to.push(k); } }
      B.forEach((m, j) => { if (!A.some(n => n.to.includes(j))) { const n = A.reduce((a, b) => Math.abs(b.i / Math.max(1, A.length - 1) - j / Math.max(1, B.length - 1)) < Math.abs(a.i / Math.max(1, A.length - 1) - j / Math.max(1, B.length - 1)) ? b : a); n.to.push(j); } });
    }
    layers.push([{ l: PROG_LAYERS + 1, i: 0, k: 'boss', to: [] }]);
    for (const n of layers[PROG_LAYERS - 1]) n.to = [0];
    this.map = layers; this.layer = 0; this.node = null; this.pickBoss();
  },
  reachable() { if (this.layer === 0) return this.map[0]; const n = this.node; return n ? n.to.map(j => this.map[this.layer][j]) : []; },
  showMap() {
    if (!Game.runActive && Game.mode === 'arcade' && Game.state === 'over') return;
    if (Bot.on) { // the test bot just takes the first door
      Anom.set([]); Bullets.clear(); const n = this.reachable()[0]; if (n) this.enter(n); return;
    }
    Game.state = 'map'; Input.capture = false; Director.phase = 'map';
    Anom.set([]); Bullets.clear(); Holes.clear(); Events.clear(); Game.spawns = []; for (const e of Game.enemies) e.dead = true; Game.enemies = []; Game.boss = null;
    $('scr-map').hidden = false; this.renderMap();
    Audio2.music('wave', 1);
  },
  renderMap() {
    const act = this.act, A = act > PROG_ACTS;
    $('map-title').textContent = A ? 'Tenure track · cycle ' + (act - PROG_ACTS) : 'Grant cycle ' + ROMAN[act] + ' of ' + ROMAN[PROG_ACTS];
    $('map-sub').textContent = this.layer === 0 ? 'Choose your first experiment. Every path ends at the boss.' : 'Choose where to go next.';
    const stats = $('map-stats'); stats.innerHTML = '';
    const stat = (ic, t) => { const s = el('span', 'mstat'); s.append(icon(ic), document.createTextNode(t)); stats.append(s); };
    stat('fund', fmtInt(this.fund) + ' funding'); stat('gate', Game.lives + ' li' + (Game.lives === 1 ? 'fe' : 'ves')); stat('notes', Mods.list().length + ' discover' + (Mods.list().length === 1 ? 'y' : 'ies')); stat('cite', fmtInt(Game.score) + ' points');
    const svg = $('map-svg'), wide = svg.clientWidth > svg.clientHeight * 1.15 || innerWidth > innerHeight;
    const L = this.map, NL = L.length, Wv = wide ? 1000 : 520, Hv = wide ? 420 : 900;
    svg.setAttribute('viewBox', `0 0 ${Wv} ${Hv}`); svg.innerHTML = '';
    const pos = n => { const rowN = L[n.l - 1].length, f = (n.i + 1) / (rowN + 1), g = (n.l - 1) / (NL - 1); return wide ? [100 + g * (Wv - 200), Hv * f] : [Wv * f, Hv - 50 - g * (Hv - 100)]; };
    const NS = 'http://www.w3.org/2000/svg', mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const reach = new Set(this.reachable());
    for (const row of L) for (const n of row) for (const j of n.to) { const m = L[n.l][j], [x1, y1] = pos(n), [x2, y2] = pos(m), on = this.node === n && reach.has(m), done = n.done && m.done; svg.append(mk('line', { x1, y1, x2, y2, class: 'medge' + (on ? ' on' : done ? ' done' : '') })); }
    for (const row of L) for (const n of row) {
      const [x, y] = pos(n), R = ROOM_KINDS[n.k], can = reach.has(n), g = mk('g', { class: 'mnode ' + n.k + (can ? ' can' : '') + (n.done ? ' done' : '') + (this.node === n ? ' here' : ''), transform: `translate(${x},${y})`, tabindex: can ? 0 : -1, role: can ? 'button' : 'img', 'aria-label': R.name });
      g.append(mk('circle', { r: n.k === 'boss' ? 30 : 23 }));
      const ic = mk('g', { transform: `translate(${n.k === 'boss' ? -14 : -11},${n.k === 'boss' ? -14 : -11}) scale(${n.k === 'boss' ? 1.17 : 0.92})`, class: 'mico' }); ic.innerHTML = ICON_PATHS[R.icon]; g.append(ic);
      const lab = mk('text', { y: n.k === 'boss' ? 48 : 40, class: 'mlab' });
      if (n.k === 'boss') { // a boss's name can be long: break it over two lines rather than run off the map
        const nm = this.nextBoss ? BOSS_DEFS[this.nextBoss].name : 'Boss', w = nm.split(' ');
        let cut = 0, best = 1e9; for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < best) { best = d; cut = i; } }
        const lines = nm.length > 14 && cut ? [w.slice(0, cut).join(' '), w.slice(cut).join(' ')] : [nm];
        lines.forEach((t, i) => { const ts = mk('tspan', { x: 0, dy: i ? 14 : 0 }); ts.textContent = t; lab.append(ts); });
      } else lab.textContent = R.short;
      g.append(lab);
      if (can) { const go = () => this.enter(n); g.addEventListener('click', go); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); }
      svg.append(g);
    }
    const legend = $('map-legend'); legend.innerHTML = '';
    for (const k of ['exp', 'risk', 'anom', 'shop', 'review', 'conf', 'boss']) { const s = el('span', 'mkey'); s.append(icon(ROOM_KINDS[k].icon), el('b', '', ROOM_KINDS[k].name), el('span', '', ROOM_KINDS[k].blurb)); legend.append(s); }
    setTimeout(() => { const f = svg.querySelector('.mnode.can'); if (f && !$('scr-map').hidden) f.focus(); }, 50);
  },
  enter(n) {
    this.node = n; this.layer = n.l; n.done = true;
    $('scr-map').hidden = true;
    if (n.k === 'shop' || n.k === 'review' || n.k === 'conf') { this.openRoom(n.k); return; }
    this.rooms++;
    if (n.k === 'boss') { if (!this.nextBoss) this.pickBoss(); }
    this.room = n.k;
    Game.state = 'playing'; Input.capture = true; clearEdges();
    Director.start(this.rooms);
  },
  pickBoss() { const pool = BOSS_ORDER.filter(b => !this.bossesUsed.includes(b)); this.nextBoss = pick(pool.length ? pool : BOSS_ORDER); },
  level() { return 3 + (this.act - 1) * 12 + this.layer * 1.6; },
  // the wave definition for the room just entered
  waveDef(n) {
    const k = this.room || 'exp', level = this.level(), hard = diffRank(Game.diffId) >= diffRank('graduate');
    if (k === 'boss') { const boss = this.nextBoss || pick(BOSS_ORDER); return { n, anom: this.act >= 2 ? pickLaws(Math.min(2, this.act - 1), true) : [], boss, name: BOSS_DEFS[boss].name, cycle: 0, hpMul: 1 + 0.12 * Math.max(0, this.act - 1), chapter: BOSS_ORDER.indexOf(boss) + 1, level, room: k }; }
    let laws = k === 'risk' ? 2 : k === 'anom' ? (hard ? 1 : 3) : 1;
    if (this.harder) { laws++; this.harder = false; }
    const anom = pickLaws(laws, false);
    return { n, anom, boss: null, name: anom.map(a => LAWS[a].name).join(' + '), cycle: 0, level, room: k, weather: k === 'anom' && hard, budgetMul: k === 'risk' ? 1.3 : k === 'anom' ? 1.15 : 1, elites: (k === 'risk' || this.race) && hard ? 1 : 0, chapter: Math.min(CHAPTERS.length, this.act * 3) };
  },
  tag(d) { return (this.act > PROG_ACTS ? 'TENURE TRACK ' + (this.act - PROG_ACTS) : 'GRANT CYCLE ' + ROMAN[this.act]) + ' · ' + ROOM_KINDS[d.room || 'exp'].name.toUpperCase() + ' · ROOM ' + d.n; },
  hudLine() { return fmtInt(this.fund) + ' funding · ' + (this.act > PROG_ACTS ? 'tenure ' + (this.act - PROG_ACTS) : 'cycle ' + ROMAN[this.act]); },
  // a fight is over: pay out, then back to the map
  afterRoom() {
    const k = this.room, got = this.earn((ROOM_KINDS[k].fund || 40) * (1 + 0.15 * (this.act - 1)));
    Feed.add('+' + got + ' funding', 'gold', ROOM_KINDS[k].name.toLowerCase());
    if (this.race) { this.race = false; this.offerDiscovery('You beat the rival group. Choose a discovery.', () => this.showMap()); return; }
    this.showMap();
  },
  afterBoss() {
    const d = Director.def; this.bossesUsed.push(d.boss); this.nextBoss = null;
    this.earn(ROOM_KINDS.boss.fund * (1 + 0.15 * (this.act - 1)));
    const next = () => {
      if (this.act === PROG_ACTS && !this.published) { this.publish(); return; }
      this.act++; this.newMap(); Game.banner(this.act > PROG_ACTS ? 'TENURE TRACK' : 'GRANT CYCLE ' + ROMAN[this.act], this.act > PROG_ACTS ? 'No end in sight. Every cycle is harder.' : 'New funding, new rooms, a harder boss.', 2); this.showMap();
    };
    if (Mods.on && !Bot.on) {
      const paper = Game.stats.papers[Game.stats.papers.length - 1], go = () => UI.showChoice('Paper accepted', 'Choose one discovery. It lasts for the rest of this run.', next, paper);
      if (!Mods.school) UI.showSchool(go, paper); else go();
    } else next();
    if (this.act - PROG_ACTS >= 2 && Game.counts()) Ach.unlock('tenured');
  },
  // after the third boss the run is published; Tenure track is optional
  publish() {
    this.published = true; Game.state = 'choice'; Input.capture = false;
    if (Game.counts()) { const r = Save.rec('programme', Game.diffId); r.clears++; Ach.unlock('published'); Save.medal('programme:' + Game.diffId, 1, 'Research programme published on ' + Game.D.name + '.'); Save.write(); }
    $('room-title').textContent = 'Published.'; $('room-sub').textContent = 'Three grant cycles, three bosses, and the paper is out. The run counts as finished. You can stop here, or go on into Tenure track: endless cycles, each harder than the last.';
    this.roomCards([
      ['seal', 'Tenure track', 'Keep going', 'More cycles, harder every time, for as long as you last. Your score keeps counting.', () => { this.tenure = true; this.act++; this.newMap(); this.closeRoom(); this.showMap(); }],
      ['book', 'Stop here', 'Retire with the paper', 'End the run now, published.', () => { this.closeRoom(); Game.victory(); }],
    ], true);
  },
  // ----- rooms without a fight -----
  openRoom(k) {
    if (Bot.on) { if (k === 'conf') Game.lives++; this.showMap(); return; }
    Game.state = 'choice'; Input.capture = false; this.roomKind = k;
    if (k === 'shop') this.shop();
    else if (k === 'review') this.review();
    else this.conference();
  },
  closeRoom() { $('scr-room').hidden = true; },
  leave() { this.closeRoom(); this.showMap(); },
  roomCards(list, noLeave) {
    const w = $('room-cards'); w.innerHTML = '';
    for (const [ic, tag, name, desc, fn, dis] of list) {
      const b = el('button', 'pcard'); b.disabled = !!dis;
      const i = el('div', 'ic'); i.append(icon(ic)); const sm = el('small', '', tag); if (/ funding$/.test(tag)) sm.prepend(icon('fund')); b.append(i, sm, el('h4', '', name), el('p', '', desc));
      b.addEventListener('click', () => { Audio2.sfx('choose'); fn(); });
      w.append(b);
    }
    balanceGrid(w, 190);
    $('room-leave').hidden = !!noLeave;
    $('scr-room').hidden = false; setTimeout(() => { const f = w.querySelector('.pcard:not([disabled])'); if (f) f.focus(); }, 60);
  },
  shop() {
    const price = { disc: 120, life: 90, fridge: 45, insure: 150, boost: 55 }, f = this.fund;
    $('room-title').textContent = 'Grant office'; $('room-sub').textContent = ''; $('room-sub').append(icon('fund'), document.createTextNode('You have ' + fmtInt(f) + ' funding. Buy as much as you can afford, then leave.'));
    const buy = (n, fn) => () => { if (this.fund < n) return; this.spend(n); const msg = fn(); if (msg) Feed.add(msg, 'gold', '−' + n + ' funding'); if (!$('scr-choice').hidden) return; this.shop(); };
    this.roomCards([
      ['notes', price.disc + ' funding', 'A discovery', 'Choose one of three. It lasts for the rest of the run.', buy(price.disc, () => { this.closeRoom(); this.offerDiscovery('Grant awarded. Choose a discovery.', () => this.openRoom('shop')); return 'Discovery funded'; }), f < price.disc],
      ['gate', price.life + ' funding', 'A spare timeline', 'One extra life.', buy(price.life, () => { Game.lives++; return '+1 life'; }), f < price.life],
      ['dial', price.fridge + ' funding', 'Dilution fridge', 'Your next fight starts with twenty seconds of coherence that never drains.', buy(price.fridge, () => { this.fridge = 20; return 'Fridge booked'; }), f < price.fridge],
      ['seal', price.boost + ' funding', 'Ĥ⁺ voucher', 'Your next fight starts with an extra qubit for thirty seconds.', buy(price.boost, () => { this.boost = 30; return 'Voucher bought'; }), f < price.boost],
      ['medal', price.insure + ' funding', 'Quantum insurance', 'The next measurement that would kill you is rolled again.', buy(price.insure, () => { Mods.immortal++; return 'Insured'; }), f < price.insure],
    ]);
  },
  review() {
    const pool = REVIEWS.filter(r => !r.ok || r.ok()), R = pick(pool);
    $('room-title').textContent = 'Peer review'; $('room-sub').textContent = R.t;
    const done = m => { Feed.add(m, 'violet', 'peer review'); this.leave(); };
    this.roomCards([['review', 'Option A', 'Accept', R.a, () => { const m = R.A(); if (!$('scr-choice').hidden) { this.closeRoom(); return; } done(m); }], ['risk', 'Option B', 'Decline', R.b, () => done(R.B())]], true);
  },
  conference() {
    $('room-title').textContent = 'Conference'; $('room-sub').textContent = 'A few days away from the lab. Choose one.';
    const owned = Mods.list().filter(x => x.n < x.p.max);
    this.roomCards([
      ['conf', 'Rest', 'Recover', 'One extra life.', () => { Game.lives++; Feed.add('+1 life', 'cyan', 'conference'); this.leave(); }],
      ['book', 'Interpretation', 'Change your mind', Mods.school ? 'Switch to another interpretation of quantum mechanics.' : 'Choose your interpretation now.', () => { this.closeRoom(); UI.showSchool(() => this.showMap()); }],
      ['notes', 'Discovery', 'Present your work', owned.length ? 'Improve one of your discoveries by a level.' : 'You have nothing to improve yet.', () => { const x = pick(owned); Mods.take(x.p.id); Feed.add(x.p.name + ' improved', 'gold', 'conference'); this.leave(); }, !owned.length],
    ], true);
  },
  offerDiscovery(title, after) {
    const back = after || (() => this.showMap());
    if (!Mods.on || Bot.on) { back(); return ''; }
    this.closeRoom(); Game.state = 'choice';
    UI.showChoice(title, 'It lasts for the rest of this run.', back);
    return '';
  },
  // buffs bought in the shop apply when the next fight starts
  onFight() {
    if (this.fridge > 0) { Player.fridge = this.fridge; this.fridge = 0; Feed.add('Dilution fridge on', 'cyan', '20 s'); }
    if (this.boost > 0) { Player.boost = this.boost; Player.boostQ = Math.max(1, Player.boostQ); this.boost = 0; Feed.add('Ĥ⁺ voucher used', 'gold', '30 s'); }
  },
};
