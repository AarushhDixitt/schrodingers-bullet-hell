// ---------- cat lineage: named cats that survive measurements are remembered; veterans come back; dynasties go on ----------
// A cat counts as a veteran once it has survived three measurements in one run without being collapsed itself.
// Veterans can turn up again in later runs (more likely the more they have survived). When a veteran is finally
// collapsed it goes to the memorial, and its name can pass to a later cat: Mittens II, Mittens III…
// Save.d.cats[name] = { base, gen, runs, meas, coin, first, alive, died: { cause, at, wave }, last }
const CAT_SET = new Set(CAT_FIRST);
const Lineage = {
  run: null, vets: new Set(), returned: new Set(),
  reg() { return Save.d.cats || (Save.d.cats = {}); },
  live() { return Game.mode === 'arcade' && Game.counts(); },
  newRun() { this.run = new Map(); this.returned = new Set(); this.vets = new Set(Object.values(this.reg()).filter(c => c.alive).map(c => c.name)); },
  // the first name a lineage runs through (titles and surnames come and go)
  coreOf(n) { const w = this.baseOf(n).split(' '); return w.find(x => CAT_SET.has(x)) || this.baseOf(n); },
  baseOf(n) { return n.replace(/ (II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/, ''); },
  // a name for a new cat: sometimes a returning veteran, otherwise a fresh one (with a numeral if the name has a dead predecessor)
  name(full) {
    const R = this.reg(), inUse = new Set([Player.name, ...Player.branches.map(b => b.name)]);
    if (Save.d && this.live()) {
      const alive = Object.values(R).filter(c => c.alive && !inUse.has(c.name) && !(this.run && this.run.has(c.name) && this.run.get(c.name).died));
      if (alive.length && Math.random() < Math.min(0.3, 0.04 + 0.025 * alive.length)) {
        const c = weightedPick(alive, v => 1 + v.meas * 0.1 + v.runs);
        if (!this.returned.has(c.name)) { this.returned.add(c.name); Feed.add(c.name + ' returns', 'gold', c.runs + ' run' + (c.runs === 1 ? '' : 's') + ' · ' + c.meas + ' measurements survived'); }
        return c.name;
      }
    }
    for (let tries = 0; tries < 12; tries++) {
      const f = pick(CAT_FIRST), line = Object.values(R).filter(c => this.coreOf(c.name) === f);
      if (line.some(c => c.alive)) continue; // a living veteran owns this name
      const num = line.length ? ' ' + ROMAN[Math.min(12, Math.max(...line.map(c => c.gen)) + 1)] : '';
      const n = (full && chance(0.15) ? pick(CAT_TITLE) + ' ' : '') + f + (full && chance(0.15) ? ' ' + pick(CAT_SUR) : '') + num;
      if (!inUse.has(n)) return n;
    }
    return pick(CAT_FIRST) + ' ' + pick(CAT_SUR);
  },
  rec(name) { if (!this.run) this.newRun(); let r = this.run.get(name); if (!r) this.run.set(name, r = { meas: 0, coin: 0, died: null }); return r; },
  // every cat still standing after a measurement it might have lost
  survived(branches, p) { if (!this.live()) return; for (const b of branches) { const r = this.rec(b.name); r.meas++; if (p >= 0.5) r.coin++; } },
  died(name, cause) { if (!this.live() || !name) return; this.rec(name).died = { cause: cause || 'bullet', at: Date.now(), wave: Game.wave }; },
  // the run is over: survivors join (or rejoin) the lineage, veterans that were collapsed go to the memorial
  endRun(outcome) {
    if (!this.run || !Save.d) return; const R = this.reg(), out = [];
    for (const [name, r] of this.run) {
      let c = R[name];
      if (r.died) { if (c && c.alive) { c.alive = false; c.died = r.died; c.meas += r.meas; c.coin += r.coin; out.push(name + ' died'); } continue; }
      if (r.meas < 3 && !c) continue;
      if (!c) { const base = this.baseOf(name), m = name.match(/ (II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/); c = R[name] = { name, base, gen: m ? ROMAN.indexOf(m[1]) : 1, runs: 0, meas: 0, coin: 0, first: Date.now(), alive: true, died: null }; out.push(name + ' joined the lineage'); }
      c.runs++; c.meas += r.meas; c.coin += r.coin; c.last = Date.now(); c.alive = true;
    }
    this.run = null; Save.write(); return out;
  },
  title(c) { return c.meas >= 100 ? 'the Unkillable' : c.coin >= 5 ? 'the Improbable' : c.meas >= 50 ? 'Survivor of 50 Measurements' : c.meas >= 25 ? 'Survivor of 25 Measurements' : c.runs >= 5 ? 'the Veteran' : ''; },
  // the Lineage page of the lab notes: living veterans, then the memorial
  render(box) {
    const R = Object.values(this.reg()), alive = R.filter(c => c.alive).sort((a, b) => b.meas - a.meas), dead = R.filter(c => !c.alive).sort((a, b) => (b.died ? b.died.at : 0) - (a.died ? a.died.at : 0));
    box.append(el('p', 'nbintro', 'Named cats that survive three measurements in a run join the lineage. Veterans come back in later runs and wear a small gold halo. When a veteran is finally collapsed, its name passes to a successor: Mittens II, Mittens III…'));
    const spread = el('div', 'spread'), lp = el('article', 'npage lp lineage'), rp = el('article', 'npage rp lineage');
    lp.append(el('h5', '', 'Living veterans · ' + alive.length));
    if (!alive.length) lp.append(el('p', 'pending', 'None yet. Keep your cats alive through a few measurements.'));
    for (const c of alive) { const t = this.title(c), p = el('p', 'hand'); p.append(document.createTextNode(c.name + (t ? ', ' + t : '')), el('span', 'lmeta', `${c.runs} run${c.runs === 1 ? '' : 's'} · ${c.meas} measurements survived${c.coin ? ' · ' + c.coin + ' coin flip' + (c.coin === 1 ? '' : 's') + ' won' : ''}`)); lp.append(p); }
    rp.append(el('h5', '', 'Memorial · ' + dead.length));
    if (!dead.length) rp.append(el('p', 'pending', 'Nobody yet.'));
    for (const c of dead) { const p = el('p', 'hand dead'); p.append(document.createTextNode(c.name), el('span', 'lmeta', `${c.runs} run${c.runs === 1 ? '' : 's'}, ${c.meas} measurements · ${CAUSE_TEXT[c.died && c.died.cause] || 'measured'}${c.died && c.died.wave ? ', wave ' + c.died.wave : ''}`)); rp.append(p); }
    // dynasties: names that have passed down
    const lines = {}; for (const c of R) (lines[this.coreOf(c.name)] = lines[this.coreOf(c.name)] || []).push(c);
    const dyn = Object.values(lines).filter(l => l.length > 1);
    if (dyn.length) { rp.append(el('h5', '', 'Dynasties')); for (const l of dyn) rp.append(el('p', 'scrawl', l.sort((a, b) => a.gen - b.gen).map(c => c.name + (c.alive ? '' : ' †')).join(' → '))); }
    spread.append(lp, rp); box.append(spread, el('div', 'pnav'));
  },
};
