// ---------- the observation log behind the Lab Notes ----------
// Every subject (enemy, elite, boss, law, event, black hole) is written up in stages, permanently, across all runs:
//   sighting (the first time it appears) → observations (one per behaviour or attack, the first time it is seen)
//   → hypothesis (once enough has been seen) → conclusion (bosses: beaten; everything else: a count across runs).
// The text for every subject lives in NOTES (05e_notes_text.js). Here: what has been seen, and when.
// Save.d.obs[id] = { s: first seen (ms), at: where, o: { key: ms }, n: count toward the conclusion, c: concluded (ms), x: exposure seconds }
const Notes = {
  live() { return Game.mode !== 'attract' && !Bot.on && !(typeof Calib !== 'undefined' && Calib.on) && Save.d; },
  rec(id) { const O = Save.d.obs || (Save.d.obs = {}); return O[id] || (O[id] = { s: 0, o: {}, n: 0, c: 0, x: 0 }); },
  get(id) { return Save.d && Save.d.obs ? Save.d.obs[id] : null; },
  def(id) { return NOTES[id] || null; },
  where() {
    if (Game.mode === 'lab') return 'the Laboratory';
    if (Game.mode === 'tutorial') return 'orientation';
    const d = Director.def; if (!d) return '';
    const V = Game.variant;
    return (V === 'campaign' ? 'Experiment ' + ROMAN[d.chapter] + ', wave ' + d.n : V === 'endless' ? 'Endless, wave ' + d.n : V === 'programme' ? 'Research programme, ' + (Programme.label ? Programme.label() : 'room ' + d.n) : 'Boss rush, round ' + d.n) + ' · ' + DIFFS[Game.diffId].name;
  },
  // first sighting
  see(id) {
    const D = NOTES[id]; if (!D || !this.live()) return false;
    const r = this.rec(id); if (r.s) return false;
    r.s = Date.now(); r.at = this.where();
    if (Object.values(Save.d.obs).filter(x => x.s).length >= 50) Ach.unlock('notes50', true);
    for (const [k, o] of Object.entries(D.obs || {})) if (o.on === 'seen') r.o[k] = r.s;
    this.dirty = true;
    if (Game.mode !== 'lab') Feed.add('Lab notes: ' + noteTitle(id), 'cyan', 'first sighting');
    this.check(id);
    return true;
  },
  // an observation: a behaviour or an attack, written the first time it is seen
  obs(id, key) {
    const D = NOTES[id]; if (!D || !D.obs || !D.obs[key] || !this.live()) return false;
    const r = this.rec(id); if (!r.s) this.see(id);
    if (r.o[key]) return false;
    r.o[key] = Date.now(); this.dirty = true;
    if (Game.mode !== 'lab') Feed.add('Lab notes: ' + noteTitle(id), 'cyan', 'new observation');
    this.check(id);
    return true;
  },
  // progress toward a conclusion (kills, waves survived, events lived through…)
  count(id, k = 1) {
    const D = NOTES[id]; if (!D || !this.live()) return;
    const r = this.rec(id); if (!r.s) this.see(id);
    r.n += k; this.dirty = true;
    for (const [key, o] of Object.entries(D.obs || {})) if (o.on === 'n' && r.n >= (o.at || 1) && !r.o[key]) this.obs(id, key);
    this.check(id);
  },
  conclude(id) {
    const D = NOTES[id]; if (!D || !this.live()) return;
    const r = this.rec(id); if (!r.s) this.see(id);
    if (r.c) return;
    r.c = Date.now(); this.dirty = true;
    if (Object.keys(NOTES).every(k => Save.d.obs[k] && Save.d.obs[k].c)) Ach.unlock('notesall', true);
    Feed.add('Conclusion: ' + noteTitle(id), 'gold', 'Lab notes updated');
  },
  // how many observations exist, and how many of them can be seen on this difficulty
  total(id) { const D = NOTES[id]; return D && D.obs ? Object.keys(D.obs).length : 0; },
  seenCount(id) { const r = this.get(id); return r ? Object.keys(r.o).length : 0; },
  hasHyp(id) {
    const D = NOTES[id], r = this.get(id); if (!D || !r || !r.s) return false;
    if (r.c || r.h) return true;
    const base = Object.entries(D.obs || {}).filter(([, o]) => !o.diff).length;
    const need = Math.max(1, Math.min(base, D.hypAt || Math.ceil(base * 0.6)));
    return Object.keys(r.o).filter(k => D.obs[k] && !D.obs[k].diff).length >= need;
  },
  check(id) {
    const D = NOTES[id], r = this.get(id); if (!D || !r) return;
    if (!r.h && this.hasHyp(id)) { r.h = Date.now(); if (Game.mode !== 'lab') Feed.add('Hypothesis: ' + noteTitle(id), 'violet', 'Lab notes updated'); }
    if (!r.c && D.need && r.n >= D.need) this.conclude(id);
  },
  // exposure: how long each subject has been on screen. Some observations only come with time.
  tick(dt) {
    if (!this.live() || Game.state !== 'playing') return;
    if ((this.tT = (this.tT || 0) + dt) < 0.5) return;
    const step = this.tT; this.tT = 0;
    const on = new Set();
    for (const e of Game.enemies) if (!e.dead && !e.spawning && !e.zombie && Game.inView(e.x, e.y, 40)) on.add(e.boss ? 'boss:' + e.type : 'enemy:' + e.type);
    for (const id in Anom.on) on.add('law:' + id);
    for (const v of Events.list) on.add('event:' + v.id);
    for (const h of Holes.list) if (h.born > 0) on.add('hole:' + HOLE_CLASS[h.L.cls].id);
    for (const id of on) {
      const D = NOTES[id]; if (!D) continue;
      const r = this.rec(id); if (!r.s) this.see(id);
      r.x += step;
      for (const [k, o] of Object.entries(D.obs || {})) if (o.on === 'time' && !r.o[k] && r.x >= o.at && this.diffOk(o)) this.obs(id, k);
    }
  },
  // observations that only exist on harder difficulties
  diffOk(o) { return !o.diff || o.diff === 'opt' || Game.mode === 'lab' || diffRank(Game.diffId) >= diffRank(o.diff); },
  // save at calm moments, not every frame
  flush() { if (this.dirty && Save.d) { this.dirty = false; Save.write(); } },
  // progress shown on the notebook tabs
  stats(prefixes) {
    let seen = 0, all = 0, done = 0;
    for (const id of Object.keys(NOTES)) { if (!prefixes.some(p => id.startsWith(p))) continue; all++; const r = this.get(id); if (r && r.s) seen++; if (r && r.c) done++; }
    return { seen, all, done };
  },
  // fill the log from what older saves already prove (first run of v4)
  migrate(d) {
    if (d.obs) return;
    d.obs = {};
    const now = Date.now(), mk = id => d.obs[id] || (d.obs[id] = { s: now, at: 'before these notes were kept', o: {}, n: 0, c: 0, x: 0 });
    const seen = store('seen') || [];
    for (const k of seen) { const [t, id] = k.split(':'); if (t === 'enemy' && NOTES['enemy:' + id]) mk('enemy:' + id); if (t === 'boss' && NOTES['boss:' + id]) mk('boss:' + id); }
    for (const k of Object.keys(d.seenAtk || {})) { const [b, a] = k.split(':'), N = NOTES['boss:' + b]; if (N && N.obs && N.obs[a]) mk('boss:' + b).o[a] = now; }
    for (const [b, n] of Object.entries(d.beaten || {})) if (n && NOTES['boss:' + b]) { const r = mk('boss:' + b); r.c = now; r.h = now; }
    for (const [k, n] of Object.entries((d.life && d.life.elites) || {})) if (NOTES['enemy:' + k]) mk('enemy:' + k).n = n;
    // every law in a chapter already passed has been seen
    const reached = Math.max(1, ...Object.values(d.reached || {}).map(Number));
    CAMPAIGN.forEach((c, i) => { if (chapterOf(i + 1) < reached) for (const a of c.anom || []) if (NOTES['law:' + a]) mk('law:' + a); });
    for (const [id, r] of Object.entries(d.obs)) for (const [k, o] of Object.entries((NOTES[id] || {}).obs || {})) if (o.on === 'seen') r.o[k] = now;
  },
  // master console: write up everything
  fillAll() { for (const [id, D] of Object.entries(NOTES)) { const r = this.rec(id); r.s = r.s || Date.now(); r.at = r.at || 'the master console'; for (const k of Object.keys(D.obs || {})) r.o[k] = r.o[k] || Date.now(); r.h = r.h || Date.now(); r.c = r.c || Date.now(); r.n = Math.max(r.n, D.need || 0); } Save.write(); },
};
