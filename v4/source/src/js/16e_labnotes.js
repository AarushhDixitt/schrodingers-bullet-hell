// ---------- the Lab Notes: volume I, observations (subjects page by page); volume II, records (results, tallies, lineage, logbook, papers) ----------
const LAW_GLYPH = { tunnel: '⇥', blackhole: '●', entangle: '⋈', planck: 'ℏ', zeno: '◉', godel: '↻', zombie: '☐', gravity: '↓', duality: '∿', vacuum: '∅', pauli: 'X', propertime: 'γ', superpos: '½', uncertainty: 'Δ', manyworlds: 'Ψ', perpetual: '∞', coulomb: '±', hubble: 'H₀', slowlight: 'c', newton3: '⇄', symmetry: '⊙', casimir: '‖', exclusion: '⊗', wormhole: '⊚', doppler: 'ν' };
const EVENT_GLYPH = { meteors: '☄', eclipse: '◐', hole: '●', gflip: '⤓', flare: '☀', supernova: '✶', rays: '⟋' };
const MATTER_IDS = ['electron', 'proton', 'muon', 'tachyon', 'quark', 'physicist', 'positron', 'turret', 'magnetar', 'neutrino', 'neutron', 'alpha', 'atom', 'higgs', 'darkmatter', 'virtual', 'twin', 'mirror', 'shade', 'anchor', 'bellpair', 'assistant', 'friend'];
// the order laws are met in the campaign, then any the campaign never suspends alone
const LAW_ORDER = (() => { const out = []; for (const c of CAMPAIGN) for (const a of c.anom || []) if (!out.includes(a)) out.push(a); for (const a of LAW_IDS) if (!out.includes(a)) out.push(a); return out; })();
// two volumes: what you have observed, and what you have done
const NB_VOLS = [
  { id: 'obs', name: 'Observations', no: 'I', col: '--psi-0' },
  { id: 'rec', name: 'Records', no: 'II', col: '--psi-1' },
];
const NB_SECTIONS = [
  { id: 'matter', vol: 'obs', name: 'Matter', no: 'I', col: '--psi-0', ids: () => MATTER_IDS.map(k => 'enemy:' + k), hint: 'Every particle, pair and person you meet.' },
  { id: 'elites', vol: 'obs', name: 'Elites', no: 'II', col: '--psi-1', ids: () => ELITE_IDS.map(k => 'enemy:' + k), hint: 'Elites turn up from Graduate difficulty upward.' },
  { id: 'bosses', vol: 'obs', name: 'Bosses', no: 'III', col: '--psi-2', ids: () => BOSS_ORDER.map(k => 'boss:' + k), hint: 'One at the end of each experiment. Every attack you see is written down; harder difficulties add more.' },
  { id: 'laws', vol: 'obs', name: 'Laws', no: 'IV', col: '--psi-3', ids: () => LAW_ORDER.map(k => 'law:' + k), hint: 'Every law of physics the experiments suspend.' },
  { id: 'weather', vol: 'obs', name: 'Weather', no: 'V', col: '--hazard', ids: () => EVENT_IDS.map(k => 'event:' + k), hint: 'Space weather happens in Endless, Boss rush and the Research programme, from Graduate upward.' },
  { id: 'holes', vol: 'obs', name: 'Black holes', no: 'VI', col: '--chalk', ids: () => ['hole:primordial', 'hole:stellar', 'hole:intermediate', 'hole:supermassive', 'hole:merger'], hint: 'Each class, and what happens when two meet. Supermassive ones only form by merging.' },
  { id: 'results', vol: 'rec', name: 'Results', no: 'I', col: '--psi-1', hint: 'Best results for every mode and difficulty.' },
  { id: 'tallies', vol: 'rec', name: 'Tallies', no: 'II', col: '--psi-2', hint: 'Counted across every run: what you destroyed, what got you, what you outlasted.' },
  { id: 'life', vol: 'rec', name: 'Lifetime', no: 'III', col: '--psi-0', hint: '' },
  { id: 'lineage', vol: 'rec', name: 'Lineage', no: 'IV', col: '--psi-1', hint: '' },
  { id: 'runs', vol: 'rec', name: 'Logbook', no: 'V', col: '--psi-3', hint: 'The most recent runs, newest first.' },
  { id: 'pubs', vol: 'rec', name: 'Papers', no: 'VI', col: '--psi-2', hint: 'Achievements, written up as papers.' },
];
// a long duration, the way you would write it down: 2 h 13 min, 4 min 05 s
const fmtDur = t => { t = Math.round(t || 0); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60; return h ? h + ' h ' + m + ' min' : m ? m + ' min ' + String(sec).padStart(2, '0') + ' s' : sec + ' s'; };
const LabNotes = {
  vol: 'obs', sec: 'matter', last: {}, cur: {}, raf: 0, lastT: 0,
  open(from, sec, id) {
    if (sec) { this.sec = sec; this.vol = this.section(sec).vol; } if (id) this.cur[this.sec] = id;
    Screens.open('scr-notebook', from); this.render(); $('b-nb-back').focus();
    cancelAnimationFrame(this.raf); this.lastT = 0; this.raf = requestAnimationFrame(t => this.loop(t));
  },
  get isOpen() { return !$('scr-notebook').hidden; },
  section(id) { return NB_SECTIONS.find(s => s.id === id); },
  state(id) { const r = Notes.get(id); return !r || !r.s ? 0 : r.c ? 3 : Notes.hasHyp(id) ? 2 : 1; },
  setVol(v) { if (v === this.vol) return; this.last[this.vol] = this.sec; this.vol = v; this.sec = this.last[v] || NB_SECTIONS.find(s => s.vol === v).id; this.render(); },
  render() {
    const S = Save.d, L = S.life, all = Notes.stats(['enemy:', 'boss:', 'law:', 'event:', 'hole:']);
    $('nb-sub').textContent = `${all.seen} of ${all.all} subjects observed · ${all.done} concluded · ${fmtInt(L.runs)} runs · ${Save.achCount()} of ${ACH.length} papers`;
    const vol = NB_VOLS.find(v => v.id === this.vol), vols = $('nb-vols'); vols.innerHTML = '';
    for (const v of NB_VOLS) {
      const b = el('button', 'vol'); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(v.id === this.vol)); b.style.setProperty('--tc', 'var(' + v.col + ')');
      b.append(el('span', 'tno', v.no), document.createTextNode(v.name)); b.addEventListener('click', () => this.setVol(v.id)); vols.append(b);
    }
    $('nb-cover').closest('.nb').style.setProperty('--vc', 'var(' + vol.col + ')');
    const tabs = $('nb-tabs'); tabs.innerHTML = '';
    for (const s of NB_SECTIONS) {
      if (s.vol !== this.vol) continue;
      const b = el('button', 'tab'); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(s.id === this.sec)); b.style.setProperty('--tc', 'var(' + s.col + ')');
      b.append(el('span', 'tno', s.no), document.createTextNode(s.name));
      if (s.ids) { const ids = s.ids(), seen = ids.filter(i => this.state(i)).length; b.append(el('span', 'tc', seen + '/' + ids.length)); }
      b.addEventListener('click', () => { this.sec = s.id; this.render(); });
      tabs.append(b);
    }
    const on = tabs.querySelector('[aria-selected="true"]'); if (on) setTimeout(() => on.scrollIntoView({ block: 'nearest', inline: 'nearest' }), 0);
    const pane = $('nb-pane'); pane.innerHTML = ''; pane.scrollTop = 0;
    const s = this.section(this.sec);
    if (s.ids) this.subjects(pane, s); else this.records(pane, s);
    this.fit();
  },
  // no scroll bars on a big screen: write smaller (tighter ruling, smaller hand) until both pages fit, the same on both
  fit() {
    const pages = [...$('nb-pane').querySelectorAll('.spread > .npage')], tabs = $('nb-pane').querySelector('.stabs');
    const set = k => { for (const p of pages) { p.style.setProperty('--k', k); p.style.setProperty('--lh', Math.round(28 * k) + 'px'); } };
    set(1); if (tabs) tabs.classList.remove('tight', 'tighter', 'icons');
    if (innerWidth <= 900 || !pages.length) return;
    const over = () => pages.some(p => p.scrollHeight > p.clientHeight + 1);
    for (let k = 0.98; over() && k >= 0.58; k -= 0.02) set(+k.toFixed(2));
    if (tabs && tabs.scrollHeight > tabs.clientHeight + 1) { tabs.classList.add('tight'); if (tabs.scrollHeight > tabs.clientHeight + 1) tabs.classList.add('tighter'); if (tabs.scrollHeight > tabs.clientHeight + 1) tabs.classList.add('icons'); }
  },
  // an open spread: the left page, the right page, and a tab for every entry sticking out of the right edge
  subjects(pane, s) {
    const ids = s.ids(), spread = el('div', 'spread'), tabs = el('div', 'stabs'), tc = 'var(' + s.col + ')';
    let id = this.cur[s.id]; if (!ids.includes(id)) id = ids.find(i => this.state(i)) || ids[0]; this.cur[s.id] = id;
    tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', s.name);
    for (const k of ids) {
      const st = this.state(k), b = el('button', 'stab' + (st ? '' : ' unk')); b.style.setProperty('--tc', tc); b.setAttribute('aria-current', String(k === id)); b.title = st ? noteTitle(k) : 'Not yet observed';
      b.append(st ? this.icon(k, 22) : el('span', 'gl', '?'), el('span', 'nm', st ? noteTitle(k) : 'Unknown'), el('span', 'st' + (st === 3 ? ' c' : st === 2 ? ' h' : ''), ['', '·', '◐', '★'][st]));
      b.addEventListener('click', () => { this.cur[s.id] = k; this.render(); });
      tabs.append(b);
    }
    const i = ids.indexOf(id);
    spread.append(...this.page(id, i, ids.length, s), tabs); pane.append(el('p', 'nbintro', s.hint), spread);
    const cur = tabs.querySelector('[aria-current="true"]'); if (cur) setTimeout(() => cur.scrollIntoView({ block: 'nearest', inline: 'nearest' }), 0);
    const nav = el('div', 'pnav'), go = d => { this.cur[s.id] = ids[i + d]; this.render(); };
    const prev = el('button', '', '‹ previous'), next = el('button', '', 'next ›');
    prev.disabled = i <= 0; next.disabled = i >= ids.length - 1; prev.addEventListener('click', () => go(-1)); next.addEventListener('click', () => go(1));
    nav.append(prev, el('span', '', 'pp. ' + (2 * i + 1) + '–' + (2 * i + 2) + ' of ' + 2 * ids.length), next); pane.append(nav);
  },
  // a sketch for the page and the index: the real enemy or boss, animated; a glyph for laws and weather
  icon(id, size) {
    const [kind, k] = id.split(':');
    if (kind === 'law' || kind === 'event') return el('span', 'gl', (kind === 'law' ? LAW_GLYPH : EVENT_GLYPH)[k] || '·');
    const cv = el('canvas'); cv.dataset.icon = id; cv.setAttribute('aria-hidden', 'true'); cv.style.width = cv.style.height = size + 'px'; return cv;
  },
  page(id, i, n, sec) {
    const D = NOTES[id], r = Notes.get(id), st = this.state(id); let art = el('article', 'npage lp');
    const kindName = { enemy: ELITE_IDS.includes(D.key) ? 'Elite' : 'Matter', boss: 'Boss', law: 'Suspended law', event: 'Space weather', hole: 'Black hole' }[D.kind];
    if (!st) {
      const u = el('div', 'unknown'); u.append(el('div', 'q', '?'), el('p', 'pending', 'Not yet observed.'), el('p', 'nbintro', sec.hint)); art.append(u); art.className = 'npage one'; return [art];
    }
    const head = el('div', 'phead'), left = el('div');
    left.append(el('p', 'pkind', kindName + ' · No. ' + (i + 1)), el('h3', 'ptitle', noteTitle(id)));
    if (D.kind === 'law') left.append(el('p', 'eqn', LAWS[D.key].eq));
    if (D.kind === 'boss') left.append(el('p', 'eqn', BOSS_DEFS[D.key].sub));
    left.append(el('p', 'seen', 'first seen ' + relDate(r.s) + (r.at ? ' · ' + r.at : '')));
    const fig = el('figure'); fig.append(this.icon(id, 92), el('figcaption', '', 'fig. ' + (i + 1)));
    head.append(left, fig); art.append(head);
    art.append(el('h5', '', 'First sighting'), el('p', 'hand', D.first));
    // observations: seen ones in handwriting, the rest as blanks (some only exist on harder difficulties)
    art.append(el('h5', '', 'Observations · ' + Notes.seenCount(id) + ' of ' + Notes.total(id)));
    const ul = el('ul', 'obs hand');
    for (const [k, o] of Object.entries(D.obs)) {
      const li = el('li');
      if (r.o[k]) { li.textContent = o.t; if (o.diff) li.className = 'hard'; }
      else { li.className = 'blank'; li.textContent = o.diff === 'opt' ? 'not yet observed (only on easier difficulties, in a very long fight)' : o.diff ? 'not yet observed (' + DIFFS[o.diff].name + ' or harder, or a very long fight)' : 'not yet observed'; }
      ul.append(li);
    }
    art.append(ul);
    const rp = el('article', 'npage rp'), lpage = art; art = rp; // the right-hand page
    art.append(el('h5', '', 'Hypothesis'));
    if (st >= 2) {
      const h = el('p', 'hand' + (st === 3 && D.wrong ? ' struck' : ''), D.hyp); art.append(h);
      if (st === 3 && D.wrong) art.append(el('p', 'scrawl', 'Rejected: ' + D.wrong));
    } else art.append(el('p', 'pending', 'Not enough data yet. Keep observing.'));
    const ch = el('h5', '', 'Conclusion'); art.append(ch);
    if (st === 3) {
      ch.append(el('span', 'cstamp', 'CONFIRMED'));
      art.append(el('p', 'concl', D.concl));
      const f = el('p', 'foot'); f.append(el('sup', '', '1'), el('b', '', 'Further reading. '), document.createTextNode(D.foot)); art.append(f);
    } else art.append(el('p', 'pending', this.pending(id, D, r)));
    return [lpage, rp];
  },
  // what is still needed for a conclusion
  pending(id, D, r) {
    const n = r.n || 0, need = D.need;
    if (D.kind === 'boss') return 'Conclusion pending: defeat it in a run.';
    if (D.kind === 'law') return `Conclusion pending: survive ${need} waves with this law suspended (${Math.min(n, need)} so far).`;
    if (D.kind === 'event') return `Conclusion pending: live through it ${need} times (${Math.min(n, need)} so far).`;
    if (id === 'hole:primordial') return `Conclusion pending: watch ${need} evaporate (${Math.min(n, need)} so far).`;
    if (id === 'hole:merger') return `Conclusion pending: witness ${need} mergers (${Math.min(n, need)} so far).`;
    if (id === 'hole:supermassive') return 'Conclusion pending: see one form.';
    if (D.kind === 'hole') return `Conclusion pending: encounter ${need} (${Math.min(n, need)} so far).`;
    return `Conclusion pending: defeat ${need} (${Math.min(n, need)} so far).`;
  },
  // ----- the records volume: tables on ruled pages, split across the spread -----
  // blocks are [title, node, weight]; they are dealt onto the left and right pages to keep the two about even
  spreadOf(pane, s, blocks, note) {
    if (Calib.on && Calib.L) pane.append(el('p', 'master-note', Calib.L.note));
    if (s.hint) pane.append(el('p', 'nbintro', s.hint));
    const spread = el('div', 'spread'), lp = el('article', 'npage lp'), rp = el('article', 'npage rp');
    const total = blocks.reduce((a, b) => a + b[2], 0); let left = 0;
    for (const [title, node, w] of blocks) { const pg = left < total / 2 ? lp : rp; if (pg === lp) left += w; if (title) pg.append(el('h5', '', title)); pg.append(node); }
    if (note) rp.append(el('p', 'rec-note', note));
    if (!rp.childNodes.length) { lp.className = 'npage one'; spread.append(lp); } else spread.append(lp, rp);
    pane.append(spread);
  },
  // a ruled-page table. cols: [{h, n (numeric, right-aligned, handwritten)}]; rows: arrays of cells (strings, or [text, cls])
  ntable(cols, rows, o = {}) {
    const t = el('table', 'ntable'), th = el('tr');
    for (const c of cols) th.append(el('th', c.n ? 'n' : '', c.h)); const hd = el('thead'); hd.append(th); t.append(hd);
    const tb = el('tbody');
    rows.forEach((r, i) => {
      const tr = el('tr', o.top && i === 0 ? 'top' : '');
      r.forEach((v, j) => { const [txt, cls] = Array.isArray(v) ? v : [v, '']; const td = el('td', (cols[j] && cols[j].n ? 'n ' : '') + (cls || '')); if (txt instanceof Node) td.append(txt); else td.textContent = txt; tr.append(td); });
      tb.append(tr);
    });
    t.append(tb); return t;
  },
  bar(n, max, col) { const b = el('span', 'bar'); b.style.width = Math.max(3, Math.round(70 * n / Math.max(1, max))) + 'px'; if (col) b.style.setProperty('--tc', col); return b; },
  records(pane, s) {
    const S = Save.d, L = S.life, T = S.tally || {}, I = fmtInt, blocks = [], pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '—';
    if (s.id === 'lineage') { if (Calib.on && Calib.L) pane.append(el('p', 'master-note', Calib.L.note)); Lineage.render(pane); return; }
    if (s.id === 'results') {
      for (const v of ['campaign', 'programme', 'endless', 'rush']) {
        const rows = DIFF_IDS.map(id => { const r = Save.rec(v, id); return r.runs ? [DIFFS[id].name, I(r.score), String(r.wave), String(r.runs), v === 'endless' ? '—' : String(r.clears), r.fastest ? fmtTime(r.fastest) : '—'] : [[DIFFS[id].name, 'dim'], '—', '—', '0', '—', '—']; });
        if (v !== 'campaign' && rows.every(r => r[3] === '0')) continue;
        blocks.push([VARIANT_NAME[v], this.ntable([{ h: 'Difficulty' }, { h: 'Best', n: 1 }, { h: v === 'programme' ? 'Rooms' : 'Wave', n: 1 }, { h: 'Runs', n: 1 }, { h: 'Done', n: 1 }, { h: 'Fastest', n: 1 }], rows), rows.length + 1]);
      }
      blocks.push(['Bosses defeated', this.ntable([{ h: 'Boss' }, { h: 'Times', n: 1 }], BOSS_ORDER.map(k => [BOSS_DEFS[k].name, S.beaten[k] ? '×' + S.beaten[k] : '—'])), BOSS_ORDER.length + 1]);
      blocks.push(['Furthest experiment', this.ntable([{ h: 'Difficulty' }, { h: 'Reached', n: 1 }], DIFF_IDS.map(id => [DIFFS[id].name, S.cleared[id] ? 'box opened' : 'exp. ' + ROMAN[Save.reached(id)]])), DIFF_IDS.length + 1]);
      return this.spreadOf(pane, s, blocks);
    }
    if (s.id === 'tallies') {
      const kills = Object.entries(T.kill || {}).sort((a, b) => b[1] - a[1]), kmax = kills.length ? kills[0][1] : 1;
      const name = k => NOTES['enemy:' + k] ? noteTitle('enemy:' + k) : (ET[k] ? ET[k].info[0] : k.replace(/^./, c => c.toUpperCase()));
      blocks.push(['Destroyed, by kind', kills.length ? this.ntable([{ h: 'Subject' }, { h: 'Destroyed', n: 1 }], kills.map(([k, n]) => { const c = el('span'); c.append(document.createTextNode(I(n)), this.bar(n, kmax, ELITE_IDS.includes(k) ? 'var(--psi-1)' : 'var(--psi-0)')); return [name(k), c]; }), { top: 1 }) : el('p', 'pending', 'Nothing destroyed in a counted run yet.'), Math.max(2, kills.length + 1)]);
      const deaths = Object.entries(T.death || {}).sort((a, b) => b[1] - a[1]);
      blocks.push(['What got you', deaths.length ? this.ntable([{ h: 'Cause' }, { h: 'Lives', n: 1 }], deaths.map(([k, n]) => [(CAUSE_TEXT[k] || k).replace(/^./, c => c.toUpperCase()), I(n)]), { top: 1 }) : el('p', 'pending', 'No lives lost yet.'), Math.max(2, deaths.length + 1)]);
      const laws = Object.entries(T.law || {}).sort((a, b) => b[1] - a[1]);
      blocks.push(['Laws outlasted (waves)', laws.length ? this.ntable([{ h: 'Suspended law' }, { h: 'Waves', n: 1 }], laws.map(([k, n]) => [LAWS[k] ? LAWS[k].name : k, I(n)])) : el('p', 'pending', 'Clear a wave with a law suspended.'), Math.max(2, laws.length + 1)]);
      const ev = Object.entries(T.event || {}).sort((a, b) => b[1] - a[1]);
      blocks.push(['Space weather lived through', ev.length ? this.ntable([{ h: 'Event' }, { h: 'Times', n: 1 }], ev.map(([k, n]) => [EVENTS[k] ? EVENTS[k].name : k, I(n)])) : el('p', 'pending', 'None yet (Graduate and up).'), Math.max(2, ev.length + 1)]);
      const sc = Object.entries(T.school || {}).sort((a, b) => b[1] - a[1]);
      if (sc.length) blocks.push(['Interpretations held', this.ntable([{ h: 'Interpretation' }, { h: 'Runs', n: 1 }], sc.map(([k, n]) => [SCHOOLS[k] ? SCHOOLS[k].name : k, I(n)])), sc.length + 1]);
      return this.spreadOf(pane, s, blocks);
    }
    if (s.id === 'life') {
      const grp = (title, rows) => blocks.push([title, this.ntable([{ h: '' }, { h: '', n: 1 }], rows), rows.length]);
      const lin = Object.values(S.cats || {});
      grp('Runs and time', [['Runs', I(L.runs)], ['Time in the box', fmtDur(L.time)], ['Longest run', L.longest ? fmtDur(L.longest) : '—'], ['Furthest wave', String(L.bestWave || 0)], ['Total score', I(L.score || 0)], ['Best score', I(L.bestScore || 0)], ['Waves cleared', I(L.wavesCleared)]]);
      grp('The cat', [['Splits', I(L.splits)], ['Folds', I(L.folds)], ['Perfect folds', I(L.perfect)], ['Dashes and sprints', I(L.dashes || 0)], ['Time spent sprinting', fmtDur(L.sprintT || 0)], ['Most cats at once', String(L.maxCats)], ['Decoherence events', I(L.decohered)]]);
      grp('Measurement', [['Measurements', I(L.measurements)], ['Survived', I(L.survived)], ['Survival rate', pct(L.survived, L.measurements)], ['Least likely timeline', L.bestOdds < 0 ? fmtOddsLog(L.bestOdds) : '—'], ['Observed by physicists', I(L.observed)]]);
      grp('Fighting', [['Particles destroyed', I(L.kills)], ['Elites defeated', I(L.eliteKills)], ['Bosses defeated', I(L.bossKills)], ['Grazes', I(L.grazes)], ['Power-ups collected', I(L.pickups)], ['Best multiplier', '×' + (L.bestMult || 1).toFixed(2)], ['Lives lost', I(L.deaths)]]);
      grp('Discovery', [['Discoveries taken', I(L.perks || 0)], ['Outcomes rerolled', I(L.rerolls || 0)], ['Waves under suspended laws', I(L.lawWaves || 0)], ['Space weather events', I(L.events || 0)], ['Black hole mergers', I(L.mergers || 0)], ['Subjects concluded', String(Notes.stats(['enemy:', 'boss:', 'law:', 'event:', 'hole:']).done)], ['Papers published', String(Save.achCount())], ['Citations earned', I(L.citesEarned)], ['Medals earned', I(L.medalsEarned)]]);
      grp('Cats', [['Named cats lost', I(L.catsLost)], ['Veterans alive', String(lin.filter(c => c.alive).length)], ['In the memorial', String(lin.filter(c => !c.alive).length)]]);
      return this.spreadOf(pane, s, blocks, L.runs ? '' : 'Nothing here yet: finished runs are added up as they end.');
    }
    if (s.id === 'runs') {
      if (!S.hist.length) return this.spreadOf(pane, s, [['', el('p', 'pending', 'No finished runs yet. They are written here when a run ends.'), 1]]);
      const out = o => o === 'win' ? 'opened the box' : o === 'quit' ? 'quit' : (CAUSE_TEXT[o] || 'measured by ' + o);
      const rows = S.hist.map(h => [relDate(h.d), (VARIANT_NAME[h.v] || h.v) + ' · ' + (DIFFS[h.df] || DIFFS.graduate).name, I(h.s), String(h.w), fmtTime(h.t), [out(h.o), 'h']]);
      const half = Math.ceil(rows.length / 2), cols = [{ h: 'When' }, { h: 'Run' }, { h: 'Score', n: 1 }, { h: 'Wave', n: 1 }, { h: 'Time', n: 1 }, { h: 'Outcome' }];
      return this.spreadOf(pane, s, [['', this.ntable(cols, rows.slice(0, half)), half], ['', this.ntable(cols, rows.slice(half)), rows.length - half]]);
    }
    // papers
    const g = el('div', 'pubs');
    for (const a of ACH) {
      const got = S.ach[a.id], c = el('div', 'pub' + (got ? '' : ' locked'));
      { const sm = el('small', '', (got ? 'Published ' + relDate(got) + ' · ' : '') + '+' + a.cites + ' citations'); sm.prepend(icon('cite')); c.append(el('h4', '', a.name), el('p', '', a.desc), sm); }
      g.append(c);
    }
    pane.append(el('p', 'nbintro', Save.achCount() + ' of ' + ACH.length + ' published.'));
    const page = el('article', 'npage one'); page.append(g); const sp = el('div', 'spread'); sp.append(page); pane.append(sp, el('div', 'pnav'));
  },
  // animate the sketches while the notes are open
  loop(t) {
    if (!this.isOpen) return;
    const dt = this.lastT ? Math.min(0.05, (t - this.lastT) / 1000) : 0.016; this.lastT = t;
    for (const cv of $('nb-pane').querySelectorAll('canvas[data-icon]')) try { Guide.drawIcon(cv, cv.dataset.icon, dt); } catch (e) { cv.dataset.icon = ''; console.warn('notes icon', e); }
    this.raf = requestAnimationFrame(tt => this.loop(tt));
  },
};
