// ---------- DOM screens ----------
const CAUSE_TEXT = {
  bullet: 'measured by a passing bullet', laser: 'observed by a laser', spaghettified: 'spaghettified by a black hole',
  annihilation: 'annihilated by stray antimatter', poison: 'poisoned, exactly as Schrödinger described',
  'The Observer': 'stared at by The Observer for too long', 'Laplace’s Demon': 'predicted, precisely, by Laplace’s Demon',
  'The Celestial Die': 'rolled over by The Celestial Die', 'Maxwell’s Demon': 'sorted into the wrong chamber by Maxwell’s Demon',
  'The Double Slit': 'caught in a bright fringe of The Double Slit', 'The Three-Body Problem': 'lost in the chaos of The Three-Body Problem',
  'The Harmonic Oscillator': 'brought back around by The Harmonic Oscillator', 'The Cyclotron': 'accelerated to death by The Cyclotron',
  'The Apparatus': 'flattened by the hammer of The Apparatus', 'polar jet': 'cut in half by a relativistic jet', 'gravitational wave': 'stretched and squeezed by a gravitational wave',
  verdict: 'judged, and found wanting, by The Apparatus', 'solar flare': 'caught out in a solar flare', 'cosmic ray': 'struck by a cosmic ray', pulsar: 'swept by a pulsar beam', 'quasar jet': 'vaporised by a quasar',
};
const OVERLAYS = ['scr-guide', 'scr-settings', 'scr-notebook', 'scr-grants', 'scr-setup', 'scr-cabinet'];
const UI = {
  sample: null, toastT: 0, toastQ: [], toastOn: false, lastCfg: { wave: 1, mode: 'arcade', opts: {} },
  init() {
    // date-stamped preprint id
    const d = new Date();
    const yymm = String(d.getFullYear() % 100).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');
    const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
    const id = String((doy * 1373 + 20415) % 100000).padStart(5, '0');
    const mon = d.toLocaleString('en-GB', { month: 'short' });
    $('stamp').textContent = `arXiv:${yymm}.${id}v2  [quant-ph]  ${d.getDate()} ${mon} ${d.getFullYear()}`;
    // flickering ket
    setInterval(() => {
      if (Game.state !== 'title') return;
      const a = $('ket-a'), b = $('ket-b'); const alive = Math.random() < 0.5;
      a.style.color = alive ? 'var(--psi-0)' : ''; b.style.color = alive ? '' : 'var(--psi-2)';
    }, 900);
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('b-start', () => this.openSetup('campaign'));
    on('b-endless', () => this.openSetup('endless'));
    on('b-guide', () => Guide.show('scr-title'));
    on('b-tutorial', () => this.start(1, 'tutorial'));
    on('b-cabinet', () => Screens.cabinet('scr-title'));
    on('p-cal', () => Calib.panel(true));
    on('b-grants', () => Screens.grants('scr-title'));
    on('b-notebook', () => Screens.notebook('scr-title'));
    on('b-settings', () => Screens.settings('scr-title'));
    on('b-lab', () => this.start(0, 'lab'));
    on('b-resume', () => this.resume());
    on('b-restart', () => this.restart());
    on('b-quit', () => this.toTitle());
    on('p-guide', () => Guide.show('scr-pause'));
    on('p-settings', () => Screens.settings('scr-pause'));
    on('b-again', () => this.restart());
    on('b-title', () => this.toTitle());
    on('b-over-grants', () => Screens.grants('scr-over'));
    on('b-obit', () => this.claudeObit());
    on('b-copy', () => this.copyResult());
    on('b-win-title', () => this.toTitle());
    on('b-win-copy', () => this.copyResult(true));
    on('b-win-endless', () => { this.toTitle(); this.openSetup('endless'); });
    // quick setting chips (title + pause share state)
    for (const k of ['sound', 'music', 'voice', 'aim']) for (const pre of ['s-', 'p-']) on(pre + k, () => this.toggleSetting(k === 'aim' ? 'autoAim' : k));
    on('s-full', () => this.fullscreen());
    if (!document.documentElement.requestFullscreen && !document.documentElement.webkitRequestFullscreen) $('s-full').hidden = true;
    this.syncSettings();
    this.buildLab();
    Screens.init();
    // keyboard in menus
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      if (!$('scr-choice').hidden) { const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code]; if (k !== undefined) { e.preventDefault(); Screens.pickIndex(k); } return; }
      if (e.code === 'Escape') { const top = OVERLAYS.find(id => !$(id).hidden); if (top) { e.preventDefault(); if (top === 'scr-guide') Guide.hide(); else Screens.close(top); return; } }
      if (!$('scr-setup').hidden && e.code === 'Enter' && document.activeElement === document.body) { e.preventDefault(); Screens.begin(); return; }
      if (Game.state === 'paused' && (e.code === 'Escape' || e.code === 'KeyP') && OVERLAYS.every(id => $(id).hidden)) { e.preventDefault(); this.resume(); }
      else if (Game.state === 'title' && e.code === 'Enter' && !$('scr-title').hidden && document.activeElement === document.body && !Input.flurry()) { this.openSetup('campaign'); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && Game.state === 'playing' && Game.mode !== 'attract') this.pause(); });
    window.addEventListener('blur', () => { if (Game.state === 'playing' && Game.mode === 'arcade') this.pause(); });
    // Claude obituary capability (only inside a Claude viewer)
    try {
      if (window.claude && typeof window.claude.use === 'function') window.claude.use('sample').then(s => { this.sample = s || null; }).catch(() => {});
    } catch (e) { /* not in a viewer */ }
    document.body.classList.toggle('lefty', !!Settings.lefty);
    TouchLayout.init();
    this.refreshTitle();
  },
  refreshTitle() {
    const S = Save.d, best = Save.bestScore(), el = $('best');
    const ch = Save.maxReached(), cleared = Object.keys(S.cleared).length > 0;
    if (best || ch > 1) { el.hidden = false; el.innerHTML = 'Best timeline <b>' + fmtInt(best) + '</b> · ' + (cleared ? '<b>box opened</b>' : 'reached chapter <b>' + ROMAN[ch] + '</b>') + ' · <b>' + Save.achCount() + '</b> of ' + ACH.length + ' publications'; }
    else el.hidden = true;
    const open = Save.unlocked('endless'), eb = $('b-endless'); eb.classList.toggle('locked', !open); eb.textContent = open ? 'Endless' : 'Endless · locked';
    $('cites-pill').textContent = S.cites > 0 ? fmtInt(S.cites) : ''; $('medal-pill').textContent = S.medals > 0 ? String(S.medals) : '';
    $('b-tutorial').classList.toggle('guide-btn', !S.tut);
  },
  syncSettings() {
    const map = { sound: 'sound', music: 'music', voice: 'voice', aim: 'autoAim' };
    for (const [k, s] of Object.entries(map)) for (const pre of ['s-', 'p-']) { const el = $(pre + k); if (el) el.setAttribute('aria-pressed', String(!!Settings[s])); }
  },
  toggleSetting(k) {
    Settings[k] = !Settings[k]; saveSettings(); this.syncSettings();
    if (k === 'sound' || k === 'music' || k === 'voice') { Audio2.init(); Audio2.applySettings(); }
    if (k === 'sound') this.toast(Settings.sound ? 'Sound on' : 'Sound off');
  },
  hideAll() { for (const id of ['scr-title', 'scr-pause', 'scr-over', 'scr-win', 'scr-choice', ...OVERLAYS]) $(id).hidden = true; Calib.panel(false); },
  renderStats(el, rows) {
    el.innerHTML = '';
    for (const [k, v, big] of rows) {
      const row = document.createElement('div'); row.className = 'st' + (big ? ' big' : '');
      const a = document.createElement('span'); a.textContent = k; const b = document.createElement('b'); b.textContent = v;
      row.append(a, b); el.append(row);
    }
  },
  openSetup(variant) { Screens.setup(variant, 'scr-title'); },
  // gamepad in menus: D-pad or stick moves focus, A presses, B goes back
  padNav() {
    const E = Input.edges, any = ['padA', 'padB', 'padUp', 'padDown', 'padLeft', 'padRight', 'padStart'].some(k => E.has(k));
    if (!any || Input.flurry() && ['padA', 'padB', 'padStart'].some(k => E.has(k))) return;
    const scr = [...document.querySelectorAll('.screen')].reverse().find(s => !s.hidden);
    if (!scr) return;
    if (scr.id === 'scr-pause' && E.has('padStart') && !E.has('padA')) { this.resume(); return; }
    if (E.has('padB')) { if (scr.id === 'scr-guide') Guide.hide(); else if (OVERLAYS.includes(scr.id)) Screens.close(scr.id); else if (scr.id === 'scr-pause') this.resume(); return; }
    const items = [...scr.querySelectorAll('button:not([disabled]), input, select')].filter(b => b.offsetParent !== null);
    if (!items.length) return;
    let i = items.indexOf(document.activeElement);
    if (E.has('padA')) { if (i >= 0) items[i].click(); else items[0].focus(); return; }
    i = i < 0 ? 0 : (i + (E.has('padDown') || E.has('padRight') ? 1 : -1) + items.length) % items.length;
    items[i].focus(); if (items[i].scrollIntoView) items[i].scrollIntoView({ block: 'nearest' });
  },
  start(wave, mode = 'arcade', opts = {}) {
    Audio2.init(); Audio2.applySettings();
    this.hideAll();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (mode !== 'attract') this.lastCfg = { wave: wave || 1, mode, opts };
    Game.newRun(mode, wave || 1, opts);
  },
  restart() { const c = this.lastCfg; this.hideAll(); this.start(c.wave, c.mode, c.opts); },
  onRunStart(mode) {
    const playing = mode !== 'attract';
    document.body.classList.toggle('playing', playing);
    Input.capture = playing;
    $('lab').hidden = mode !== 'lab';
    this.syncLab();
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (coarse && playing) Input.touchMode = true;
    const touchUI = playing && (Input.touchMode || coarse);
    $('touch').hidden = !touchUI;
    document.body.classList.toggle('touchplay', touchUI);
    Game.touchHintT = touchUI && mode === 'arcade' && Game.wave <= 1 ? 6 : 0;
    if (mode === 'lab') { const small = R.cssW < 760 || R.cssH < 560; $('lab').classList.toggle('min', small); $('lab-min').textContent = small ? 'Show' : 'Hide'; }
    if (!playing) { $('scr-title').hidden = false; Audio2.music('title', 1); this.refreshTitle(); }
  },
  onTouchDetected() {
    if (Game.state !== 'playing' || Game.mode === 'attract' || !$('touch').hidden) return;
    $('touch').hidden = false; document.body.classList.add('touchplay');
    if (Game.mode === 'arcade' && Game.wave <= 1) Game.touchHintT = 5;
  },
  pause() {
    if (Game.state !== 'playing' || Game.mode === 'attract') return;
    Game.state = 'paused'; Input.capture = false; Audio2.setPaused(true); Input.recent.length = 0;
    $('p-cal').hidden = !Calib.on;
    try { speechSynthesis.cancel(); } catch (e) {}
    const st = Game.stats, d = Director.def;
    const rows = [['Score', fmtInt(Game.score)], ['Wave', String(Game.wave) + (Game.variant === 'campaign' && d ? ' · chapter ' + ROMAN[d.chapter || 1] : '')], ['Measurements survived', String(st.survived)], ['Odds of this timeline', fmtOddsLog(st.log10p)]];
    if (Game.mode === 'arcade') rows.push(['Difficulty', DIFFS[Game.diffId].name + (Game.variant === 'endless' ? ' · Endless' : Game.variant === 'rush' ? ' · Boss rush' : '')]);
    this.renderStats($('pause-stats'), rows);
    const pl = $('pause-perks'); pl.innerHTML = '';
    for (const { p, n } of Mods.list()) { const s = document.createElement('span'); const i = document.createElement('i'); i.textContent = p.icon; s.append(i, document.createTextNode(p.name + (n > 1 ? ' ×' + n : ''))); s.title = p.desc; pl.append(s); }
    $('pause-sub').textContent = pick(['The wavefunction is holding its breath.', 'Time is frozen. Mostly.', 'The cat is in a superposition of paused and unpaused.', 'Nobody is looking. Anything could happen.']);
    $('scr-pause').hidden = false;
    $('b-resume').focus();
  },
  resume() {
    if (Game.state !== 'paused') return;
    for (const id of OVERLAYS) $(id).hidden = true;
    $('scr-pause').hidden = true; Game.state = 'playing'; Input.capture = true; clearEdges(); Audio2.setPaused(false); Calib.panel(false);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },
  toTitle() {
    this.hideAll(); Audio2.setPaused(false); $('lab').hidden = true; $('touch').hidden = true; document.body.classList.remove('touchplay');
    Game.newRun('attract');
    this.refreshTitle();
    $('scr-title').hidden = false;
  },
  earnLine(el, res) {
    el.innerHTML = '';
    if (!res) { el.hidden = true; return; }
    el.hidden = false;
    const add = (txt, tag) => { const n = document.createElement(tag || 'span'); n.textContent = txt; el.append(n); };
    add('+' + fmtInt(res.cites), 'b'); add(' citations. You have ' + fmtInt(Save.d.cites) + ' to spend in the grant office.');
    if (res.isBest) { add(' '); add('New best score for ' + DIFFS[Game.diffId].name + (Game.variant !== 'campaign' ? ' ' + (Game.variant === 'endless' ? 'Endless' : 'Boss rush') : '') + '.', 'em'); }
  },
  // the post-run report: what killed you most, your best combo, the records you beat
  report(box, res, outcome) {
    const st = Game.stats, rows = [];
    box.innerHTML = '';
    const top = Object.entries(st.causes).sort((a, b) => b[1] - a[1])[0];
    rows.push(['Paper', '“' + (st.paperTitle || (st.paperTitle = Flavour.title(st, outcome, Game.wave, st.lastCause))) + '”']);
    if (top) rows.push(['Most common death', (CAUSE_TEXT[top[0]] || 'measured by ' + top[0]) + (top[1] > 1 ? ' (' + top[1] + '×)' : '')]);
    const combo = Mods.list().sort((a, b) => b.n - a.n).slice(0, 3).map(o => o.p.name + (o.n > 1 ? ' ×' + o.n : ''));
    if (Mods.school || combo.length) rows.push(['Best combination', [Mods.school ? SCHOOLS[Mods.school].name : null, ...combo].filter(Boolean).join(' + ')]);
    if (st.perfect) rows.push(['Perfect folds', String(st.perfect)]);
    if (st.eliteKills) rows.push(['Elites defeated', String(st.eliteKills)]);
    if (st.events) rows.push(['Space weather survived', String(st.events)]);
    if (st.medals) rows.push(['Medals earned', String(st.medals)]);
    if (res && res.records && res.records.length) rows.push(['Records beaten', res.records.join(' · ')]);
    for (const [k, v] of rows) { const d = el('div'); d.append(el('span', '', k), el('b', '', v)); box.append(d); }
  },
  endScreen(res) { document.body.classList.remove('playing', 'touchplay'); Input.capture = false; $('touch').hidden = true; Audio2.setPaused(false); },
  showGameOver(res) {
    this.endScreen(res);
    const st = Game.stats;
    const rows = [
      ['Score', fmtInt(Game.score) + (res && res.isBest ? '  · new best' : ''), true], ['Wave reached', String(Game.wave)], ['Time in the box', fmtTime(st.time)],
      ['Kills', fmtInt(st.kills)], ['Measurements survived', String(st.survived)], ['Most cats at once', String(st.maxBranches)],
      ['Bosses defeated', String(st.bossKills)], ['Cats lost', String(st.catsLost)], ['Grazes', fmtInt(st.grazes)],
    ];
    this.renderStats($('over-stats'), rows);
    this.earnLine($('over-earn'), res);
    $('over-odds').innerHTML = '';
    $('over-odds').append(document.createTextNode('The probability of this exact timeline was '), el('b', '', fmtOddsLog(st.log10p)), document.createTextNode('. Every other version of you is somewhere else, doing better or worse.'));
    this.report($('over-report'), res, 'dead');
    $('obit').textContent = this.obituary();
    $('obit-row').hidden = !this.sample; $('obit-note').textContent = this.sample ? 'Uses your Claude usage.' : '';
    $('b-obit').disabled = false; $('share-text').hidden = true;
    $('b-over-grants').hidden = !res;
    $('scr-over').hidden = false;
    $('b-again').focus();
  },
  showVictory(res) {
    this.endScreen(res);
    const st = Game.stats;
    this.renderStats($('win-stats'), [
      ['Score', fmtInt(Game.score) + (res && res.isBest ? '  · new best' : ''), true], ['Difficulty', DIFFS[Game.diffId].name], ['Time in the box', fmtTime(st.time)],
      ['Kills', fmtInt(st.kills)], ['Bosses defeated', String(st.bossKills)], ['Measurements survived', String(st.survived)], ['Most cats at once', String(st.maxBranches)],
    ]);
    this.earnLine($('win-earn'), res);
    const w = $('win-odds'); w.innerHTML = '';
    w.append(document.createTextNode(`${Player.name} is alive. Out of every timeline that opened this box, yours had odds of `), el('b', '', fmtOddsLog(st.log10p)), document.createTextNode(Save.unlocked('endless') ? '. Endless and Boss rush are open.' : '. Finish on Undergrad or harder to open Endless and Boss rush.'));
    this.report($('win-report'), res, 'win');
    $('scr-win').hidden = false; $('b-win-endless').focus();
  },
  causeText(c = Game.stats.lastCause || 'bullet') { return CAUSE_TEXT[c] || ('measured by ' + c); },
  // a few short paragraphs, built from what actually happened
  obituary() {
    const st = Game.stats, d = Director.def, name = Player.name;
    const tl = '0x' + Math.floor(Math.abs(st.log10p * 1e5 + Game.score) % 0xffffff).toString(16).toUpperCase().padStart(6, '0');
    const waveName = d ? (d.boss ? BOSS_DEFS[d.boss].name : d.name) : 'the laboratory', P = [];
    P.push(`${name} (timeline ${tl}) died in wave ${Game.wave}, ${waveName}, after ${fmtTime(st.time)} in the box. They were ${this.causeText()}.`);
    const lost = st.lost.filter(c => c.name !== name);
    if (lost.length) {
      const few = lost.slice(-4).reverse().map(c => `${c.name} (${this.causeText(c.cause).replace(/^measured by /, '')}, wave ${c.wave})`);
      P.push(`${name} was predeceased by ${lost.length} of their own branches: ${few.join(', ')}${lost.length > 4 ? ', and ' + (lost.length - 4) + ' others whose names the universe did not keep' : ''}. They are survived by ${st.maxBranches > 1 ? st.maxBranches - 1 : 'no'} versions of themselves in neighbouring timelines, none of whom return calls.`);
    } else P.push(st.maxBranches > 1 ? `${name} split into as many as ${st.maxBranches} cats and lost none of them, which the committee finds suspicious.` : `${name} never once entered superposition, which the committee finds baffling.`);
    if (st.lucky) P.push(`Their luckiest moment came in wave ${st.lucky.wave}: ${st.lucky.cause === 'bullet' ? 'a bullet' : 'the ' + st.lucky.cause} touched them while they were ${st.lucky.n} cats, with a ${Math.round(st.lucky.p * 100)}% chance of death, and they walked away.`);
    const disc = Mods.list().map(o => o.p.name), paper = st.papers[st.papers.length - 1];
    const school = Mods.school ? `A committed ${{ cph: 'Copenhagenist', mw: 'Many-Worlder', pw: 'Bohmian', qb: 'QBist' }[Mods.school]}` : 'Never one to pick an interpretation';
    P.push(`${school}, ${name} ${disc.length ? 'made ' + disc.length + ' discover' + (disc.length === 1 ? 'y' : 'ies') + ' (' + disc.slice(0, 4).join(', ') + (disc.length > 4 ? ', …' : '') + ')' : 'made no discoveries'}${paper ? ` and is best remembered for a paper in ${paper.journal} on ${BOSS_DEFS[paper.boss].name}` : ''}.`);
    P.push(pick(['In lieu of flowers, please do not open the box.', 'The family asks that you stop observing them.', 'A memorial will be held in every timeline except this one.', 'They are not dead, merely very improbable.', 'Their final words were a superposition of two different sentences.']));
    return P.join('\n\n');
  },
  async claudeObit() {
    if (!this.sample) return;
    const btn = $('b-obit'), out = $('obit'), note = $('obit-note');
    btn.disabled = true; note.textContent = 'Thinking…';
    const st = Game.stats, d = Director.def;
    const facts = {
      catName: Player.name, wave: Game.wave, waveName: d ? (d.boss ? BOSS_DEFS[d.boss].name : d.name) : 'the laboratory', difficulty: DIFFS[Game.diffId].name, score: Game.score, timeInBox: fmtTime(st.time),
      kills: st.kills, bossesDefeated: st.bosses.map(k => BOSS_DEFS[k].name), measurementsSurvived: st.survived, oddsOfThisTimeline: fmtOddsLog(st.log10p), mostCatsAtOnce: st.maxBranches,
      causeOfDeath: this.causeText(), interpretation: Mods.school ? SCHOOLS[Mods.school].name : 'none', discoveries: Mods.list().map(o => o.p.name),
      branchesLost: st.catsLost, someLostBranches: st.lost.slice(-8).map(c => ({ name: c.name, wave: c.wave, takenBy: this.causeText(c.cause) })),
      luckiestMoment: st.lucky ? { wave: st.lucky.wave, chanceOfDeath: Math.round(st.lucky.p * 100) + '%', catsAtTheTime: st.lucky.n, cause: st.lucky.cause } : null,
      papersPublished: st.papers.map(p => ({ journal: p.journal, abstract: p.text })), perfectFolds: st.perfect, elitesDefeated: st.eliteKills,
    };
    const prompt = 'Write a funny obituary (130 to 180 words, plain text in two or three short paragraphs, no title, no markdown) for a cat from a quantum bullet-hell game about Schrödinger’s cat. Write it in the voice of a deadpan physics journal publishing a retraction notice that slowly turns into a eulogy. Mention the cat by name, a few of the lost branches by name, and the luckiest moment. Use these facts exactly and invent nothing that contradicts them:\n' + JSON.stringify(facts, null, 1);
    try {
      const { text } = await this.sample(prompt, { onText: ({ text }) => { out.textContent = text; note.textContent = ''; } });
      out.textContent = text; note.textContent = 'Written by Claude.';
    } catch (e) {
      const code = e && e.code;
      if (code === 'not_granted' || code === 'sampling_disabled' || code === 'not_declared' || code === 'capability_disabled' || code === 'capability_removed') { $('obit-row').hidden = true; this.sample = null; return; }
      if (e && e.text) out.textContent = e.text;
      note.textContent = code === 'rate_limited' ? 'Claude is busy. Try again in a bit.' : code === 'refused' ? 'Claude declined that one.' : 'Could not reach Claude. Try again.';
      btn.disabled = false;
    }
  },
  fullscreen() {
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else { const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (p && p.catch) p.catch(() => this.toast('Fullscreen is not available here.')); }
    } catch (e) { this.toast('Fullscreen is not available here.'); }
  },
  copyResult(win) {
    const st = Game.stats, D = DIFFS[Game.diffId].name;
    const text = win
      ? `Schrödinger’s Bullet Hell: ${Player.name} opened the box on ${D}. ${fmtInt(Game.score)} points in ${fmtTime(st.time)}, all nine bosses down, ${st.survived} measurements survived, and the odds of my timeline were ${fmtOddsLog(st.log10p)}. The cat is alive.`
      : `Schrödinger’s Bullet Hell (${D}${Game.variant !== 'campaign' ? ', ' + (Game.variant === 'endless' ? 'Endless' : 'Boss rush') : ''}): ${Player.name} reached wave ${Game.wave} with ${fmtInt(Game.score)} points. Survived ${st.survived} measurement${st.survived === 1 ? '' : 's'}, ${st.maxBranches > 1 ? 'was ' + st.maxBranches + ' cats at once' : 'never split'}, and the odds of my timeline were ${fmtOddsLog(st.log10p)}. The cat is dead (in this timeline).`;
    const done = () => this.toast('Result copied');
    try { navigator.clipboard.writeText(text).then(done, () => this.copyFallback(text)); } catch (e) { this.copyFallback(text); }
  },
  copyFallback(text) {
    const o = $('share-text'); o.textContent = text; o.hidden = false;
    const r = document.createRange(); r.selectNodeContents(o); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    this.toast('Selected. Copy it with your keyboard or the share menu.');
  },
  // immediate feedback (replaces whatever is showing)
  toast(msg, ms = 2400) { this.showToast({ title: '', desc: msg, ms }); },
  // explanations queue up behind each other
  note(title, desc, ms = 5200) { this.toastQ.push({ title, desc, ms }); if (this.toastQ.length > 6) this.toastQ.shift(); if (!this.toastOn) this.nextToast(); },
  showToast(item) {
    const el = $('toast'); el.textContent = '';
    if (item.title) { const b = document.createElement('b'); b.textContent = item.title + '. '; el.append(b); }
    el.append(document.createTextNode(item.desc));
    el.classList.add('on'); this.toastOn = true;
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => { el.classList.remove('on'); this.toastOn = false; this.toastT = setTimeout(() => this.nextToast(), 380); }, item.ms);
  },
  nextToast() {
    if (this.toastOn || !this.toastQ.length) return;
    if (!$('scr-choice').hidden) { clearTimeout(this.toastT); this.toastT = setTimeout(() => this.nextToast(), 700); return; } // notes wait until you have chosen
    this.showToast(this.toastQ.shift());
  },
  showChoice(title, sub, done, paper) { Screens.choice(title, sub, done, paper); },
  showSchool(done, paper) { Screens.school(done, paper); },
  // ----- laboratory -----
  buildLab() {
    const mk = (parent, label, onClick, pressed) => {
      const b = document.createElement('button'); b.className = 'chip' + (pressed === undefined ? ' sel' : ''); b.textContent = label;
      if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed));
      b.addEventListener('click', () => { onClick(b); b.blur(); });
      $(parent).append(b); return b;
    };
    this.labAnom = {};
    for (const id of LAW_IDS) this.labAnom[id] = mk('lab-anoms', LAWS[id].name, () => { Anom.toggle(id); this.syncLab(); }, false);
    const sp = (type, n = 1) => () => { for (let k = 0; k < n; k++) { const p = Game.farPoint(300, 100); if (type === '@triad') Game.queueSpawn('@triad', p.x, p.y); else Game.queueSpawn(type, p.x + rand(-40, 40), p.y + rand(-40, 40), k * 0.05); } };
    mk('lab-spawn', 'Electrons ×8', sp('electron', 8)); mk('lab-spawn', 'Protons ×3', sp('proton', 3)); mk('lab-spawn', 'Muons ×4', sp('muon', 4));
    mk('lab-spawn', 'Tachyons ×2', sp('tachyon', 2)); mk('lab-spawn', 'Quark triad', sp('@triad')); mk('lab-spawn', 'Physicists ×2', sp('physicist', 2));
    mk('lab-spawn', 'Positrons ×5', sp('positron', 5)); mk('lab-spawn', 'Spin turret', sp('turret')); mk('lab-spawn', 'Magnetar', sp('magnetar'));
    mk('lab-spawn', 'Neutrinos ×4', () => GROUPS.neutrinos.spawn()); mk('lab-spawn', 'Neutrons ×2', sp('neutron', 2)); mk('lab-spawn', 'Alpha ×2', sp('alpha', 2));
    mk('lab-spawn', 'Atom', sp('atom')); mk('lab-spawn', 'Higgs boson', sp('higgs')); mk('lab-spawn', 'Dark matter', sp('darkmatter'));
    for (const k of ELITE_IDS) mk('lab-elite', ET[k].info[0], sp(k));
    HOLE_LV.forEach((L, lv) => L && mk('lab-holes', L.name[0].toUpperCase() + L.name.slice(1), () => { const p = Game.farPoint(380, 220); Holes.add(p.x, p.y, lv, { tag: 'lab' }); }));
    mk('lab-holes', 'Two that merge', () => { const p = Game.farPoint(500, 300); for (const s of [-1, 1]) { const h = Holes.add(p.x + s * 70, p.y, 2, { arrive: 0, tag: 'lab' }); h.born = 1; } });
    mk('lab-holes', 'Remove holes', () => Holes.clear());
    for (const id of EVENT_IDS) mk('lab-events', EVENTS[id].name, () => Events.start(id));
    for (const k of BOSS_ORDER) mk('lab-boss', BOSS_DEFS[k].name, () => { Game.removeBoss(); Game.spawnBoss(k, 0); Director.phase = 'boss'; });
    this.labCheat = {
      boost: mk('lab-cheats', '32 cats', () => { Player.boost = Player.boost > 1e6 ? 0 : 1e9; Player.boostQ = Player.boost ? 1 : 0; this.syncLab(); }, false),
      fridge: mk('lab-cheats', 'Absolute zero', () => { Player.fridge = Player.fridge > 1e6 ? 0 : 1e9; this.syncLab(); }, false),
      pierce: mk('lab-cheats', 'Piercing shots', () => { Player.pierce = Player.pierce > 1e6 ? 0 : 1e9; this.syncLab(); }, false),
      slow: mk('lab-cheats', 'Bullet time', () => { Game.debugSpeed = Game.debugSpeed === 0.4 ? 1 : 0.4; this.syncLab(); }, false),
    };
    // each section folds away; the lab remembers which ones you left open
    const open = new Set(store('labOpen') || []);
    for (const d of document.querySelectorAll('#lab .lab-sec')) { d.open = open.has(d.dataset.k); d.addEventListener('toggle', () => { if (d.open) open.add(d.dataset.k); else open.delete(d.dataset.k); store('labOpen', [...open]); }); }
    $('lab-clear').addEventListener('click', () => { Game.removeBoss(); Holes.clear(); Events.clear(); for (const e of Game.enemies) e.dead = true; Game.enemies = []; Game.triads = []; Game.spawns = []; EB.n = 0; });
    $('lab-exit').addEventListener('click', () => this.toTitle());
    $('lab-min').addEventListener('click', () => { const l = $('lab'); l.classList.toggle('min'); $('lab-min').textContent = l.classList.contains('min') ? 'Show' : 'Hide'; });
  },
  syncLab() {
    if (!this.labAnom) return;
    for (const id of LAW_IDS) this.labAnom[id].setAttribute('aria-pressed', String(Anom.active(id)));
    if (this.labCheat) {
      this.labCheat.boost.setAttribute('aria-pressed', String(Player.boost > 1e6));
      this.labCheat.fridge.setAttribute('aria-pressed', String(Player.fridge > 1e6));
      this.labCheat.pierce.setAttribute('aria-pressed', String(Player.pierce > 1e6));
      this.labCheat.slow.setAttribute('aria-pressed', String(Game.debugSpeed === 0.4));
    }
  },
};
