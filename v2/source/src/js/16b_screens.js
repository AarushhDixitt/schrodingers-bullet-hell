// ---------- menus: new experiment, grant office, lab notebook, settings, discoveries ----------
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const VARIANT_NAME = { campaign: 'Campaign', endless: 'Endless', rush: 'Boss rush' };
function relDate(ms) {
  const s = (Date.now() - ms) / 1000;
  if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago';
  const d = new Date(ms); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
const Screens = {
  fromMap: {}, su: null, choiceOpts: [], choiceDone: null, nbTab: 'records', confirmT: 0,
  init() {
    const on = (id, fn) => $(id).addEventListener('click', fn);
    on('b-setup-back', () => this.close('scr-setup'));
    on('b-grants-back', () => this.close('scr-grants'));
    on('b-nb-back', () => this.close('scr-notebook'));
    on('b-set-back', () => this.close('scr-settings'));
    on('b-begin', () => this.begin());
    for (const v of ['campaign', 'endless', 'rush']) on('mode-' + v, () => { this.su.variant = v; this.renderSetup(); });
    $('use-upg').addEventListener('change', e => { Save.d.useUpg = e.target.checked; Save.write(); });
    $('use-upg2').addEventListener('change', e => { Save.d.useUpg = e.target.checked; Save.write(); });
    on('b-refund', () => this.refund());
    for (const t of ['records', 'life', 'runs', 'pubs']) on('nbt-' + t, () => { this.nbTab = t; this.renderNotebook(); });
  },
  open(id, from) {
    this.fromMap[id] = from || null;
    if (from) $(from).hidden = true;
    $(id).hidden = false;
  },
  close(id) {
    $(id).hidden = true;
    const f = this.fromMap[id]; this.fromMap[id] = null;
    if (f) { $(f).hidden = false; const p = $(f).querySelector('.btn-primary'); if (p) p.focus(); }
    if (f === 'scr-title' || !f) UI.refreshTitle();
  },
  // ----- new experiment -----
  setup(variant, from) {
    const last = Save.d.last;
    this.su = { variant, diff: DIFFS[last.diff] ? last.diff : 'graduate', chapter: clamp(last.chapter || 1, 1, Save.maxReached()) };
    this.open('scr-setup', from);
    this.renderSetup();
    $('b-begin').focus();
  },
  locked(v) { return v === 'endless' ? !Save.d.unlock.endless : v === 'rush' ? !Save.d.unlock.rush : false; },
  renderSetup() {
    const su = this.su, S = Save.d, locked = this.locked(su.variant);
    for (const v of ['campaign', 'endless', 'rush']) { const t = $('mode-' + v); t.setAttribute('aria-selected', String(v === su.variant)); t.textContent = VARIANT_NAME[v] + (this.locked(v) ? ' · locked' : ''); }
    $('mode-note').textContent = su.variant === 'campaign'
      ? 'Nine chapters of four waves: three suspended laws of physics, then a boss. Beat a boss and you choose a discovery for the rest of the run.'
      : locked ? `Finish the campaign on any difficulty to unlock ${VARIANT_NAME[su.variant]}. You have reached chapter ${ROMAN[Save.maxReached()]} of IX so far.`
        : su.variant === 'endless' ? 'The waves never stop. Laws combine at random, a random boss arrives every fifth wave, and every wave is harder than the last. The background changes colour as you go.'
          : 'All nine bosses back to back, with a discovery after each. Then around again, tougher, with a law of physics suspended.';
    $('setup-body').hidden = locked; $('b-begin').disabled = locked;
    const dw = $('diffs'); dw.innerHTML = '';
    for (const id of DIFF_IDS) {
      const D = DIFFS[id], b = el('button', 'dcard'); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(id === su.diff));
      b.style.setProperty('--dc', PAL_CSS[PI_[D.col]]);
      const r = Save.rec(su.variant, id);
      b.append(el('b', '', D.name), el('span', '', D.blurb), el('small', '', `${D.lives} lives · score ×${D.score}${S.cleared[id] ? ' · box opened' : ''}${r.score ? ' · best ' + fmtInt(r.score) : ''}`));
      b.addEventListener('click', () => { su.diff = id; this.renderSetup(); });
      dw.append(b);
    }
    $('chap-wrap').hidden = su.variant !== 'campaign';
    const cw = $('chaps'); cw.innerHTML = '';
    const max = Save.maxReached();
    CHAPTERS.forEach((c, i) => {
      const n = i + 1, b = el('button', 'chap'); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(n === su.chapter)); b.disabled = n > max;
      const sm = el('small', '', 'Ch. ' + ROMAN[n]); sm.append(el('i', '', ' · wave ' + (i * CHAPTER_LEN + 1)));
      b.append(sm, el('span', '', n > max ? '???' : c.title));
      if (n <= max) b.title = 'Ends with ' + BOSS_DEFS[c.boss].name;
      b.addEventListener('click', () => { su.chapter = n; this.renderSetup(); });
      cw.append(b);
    });
    const r = Save.rec(su.variant, su.diff), rl = $('rec-line'); rl.innerHTML = '';
    if (r.runs) {
      rl.append(document.createTextNode('Best on this setting: '), el('b', '', fmtInt(r.score)), document.createTextNode(' · furthest wave '), el('b', '', String(r.wave)), document.createTextNode(' · ' + r.runs + ' run' + (r.runs === 1 ? '' : 's')));
      if (r.clears) rl.append(document.createTextNode(' · finished ' + r.clears + '×' + (r.fastest ? ', fastest ' + fmtTime(r.fastest) : '')));
    } else rl.textContent = 'No runs on this setting yet.';
    if (su.variant === 'campaign' && su.chapter > 1) rl.append(document.createTextNode(' Starting at chapter ' + ROMAN[su.chapter] + ' gives you ' + (su.chapter - 1) + ' free discover' + (su.chapter === 2 ? 'y.' : 'ies.')));
    $('use-upg').checked = S.useUpg;
  },
  begin() {
    const su = this.su; if (!su || this.locked(su.variant)) return;
    const wave = su.variant === 'campaign' ? (su.chapter - 1) * CHAPTER_LEN + 1 : 1;
    this.fromMap['scr-setup'] = null;
    UI.start(wave, 'arcade', { variant: su.variant, diff: su.diff });
  },
  // ----- grant office -----
  grants(from) { this.open('scr-grants', from); this.renderGrants(); $('b-grants-back').focus(); },
  renderGrants() {
    const S = Save.d; $('cites-bal').textContent = fmtInt(S.cites); $('use-upg2').checked = S.useUpg;
    const w = $('upgs'); w.innerHTML = '';
    for (const u of UPGRADES) {
      const l = S.upg[u.id] || 0, maxed = l >= u.max, cost = maxed ? 0 : u.cost[l];
      const c = el('div', 'ucard'), ic = el('div', 'ic', u.icon), h = el('h4', '', u.name), p = el('p', '', l ? u.desc(l) : u.step);
      const row = el('div', 'row'), pips = el('div', 'pips');
      for (let k = 0; k < u.max; k++) pips.append(el('i', k < l ? 'on' : ''));
      const b = el('button', 'buy', maxed ? 'Fully funded' : 'Fund · ' + fmtInt(cost));
      b.disabled = maxed || S.cites < cost;
      b.addEventListener('click', () => this.buy(u));
      row.append(pips, b); c.append(ic, h, p, row); w.append(c);
    }
    $('b-refund').textContent = 'Refund everything';
  },
  buy(u) {
    const S = Save.d, l = S.upg[u.id] || 0; if (l >= u.max) return;
    const cost = u.cost[l]; if (S.cites < cost) return;
    S.cites -= cost; S.upg[u.id] = l + 1; Save.write();
    Audio2.init(); Audio2.sfx('power');
    if (l + 1 >= u.max) Ach.unlock('maxed', true);
    this.renderGrants(); UI.refreshTitle();
  },
  refund() {
    const now = performance.now();
    if (now - this.confirmT > 4000) { this.confirmT = now; $('b-refund').textContent = 'Click again to refund'; return; }
    this.confirmT = 0;
    const S = Save.d; let back = 0;
    for (const u of UPGRADES) { const l = S.upg[u.id] || 0; for (let k = 0; k < l; k++) back += u.cost[k]; }
    S.cites += back; S.upg = {}; Save.write();
    UI.toast('Refunded ' + fmtInt(back) + ' citations.'); this.renderGrants(); UI.refreshTitle();
  },
  // ----- lab notebook -----
  notebook(from) { this.open('scr-notebook', from); this.renderNotebook(); $('b-nb-back').focus(); },
  renderNotebook() {
    const S = Save.d, L = S.life;
    $('nb-sub').textContent = `${fmtInt(L.runs)} runs · ${fmtTime(L.time)} in the box · ${Save.achCount()} of ${ACH.length} publications · ${fmtInt(S.cites)} citations to spend`;
    for (const t of ['records', 'life', 'runs', 'pubs']) { $('nbt-' + t).setAttribute('aria-selected', String(t === this.nbTab)); $('nb-' + t).hidden = t !== this.nbTab; }
    const box = $('nb-' + this.nbTab); box.innerHTML = ''; box.scrollTop = 0;
    const table = (head, rows) => {
      const wrap = el('div', 'tscroll'), t = el('table', 'ctable'), th = el('thead'), tr = el('tr');
      for (const h of head) tr.append(el('th', '', h)); th.append(tr); t.append(th);
      const tb = el('tbody'); for (const r of rows) { const row = el('tr'); for (const c of r) row.append(el('td', '', c)); tb.append(row); } t.append(tb);
      wrap.append(t); return wrap;
    };
    if (this.nbTab === 'records') {
      for (const v of ['campaign', 'endless', 'rush']) {
        const rows = DIFF_IDS.map(id => { const r = Save.rec(v, id); return [DIFFS[id].name, r.runs ? fmtInt(r.score) : '—', r.runs ? String(r.wave) : '—', String(r.runs), v === 'endless' ? '—' : String(r.clears), r.fastest ? fmtTime(r.fastest) : '—']; });
        if (v !== 'campaign' && this.locked(v) && rows.every(r => r[3] === '0')) continue;
        box.append(el('h3', '', VARIANT_NAME[v]), table(['Difficulty', 'Best score', 'Best wave', 'Runs', 'Finished', 'Fastest'], rows));
      }
      box.append(el('h3', '', 'Bosses defeated'));
      const br = el('div', 'bossrow');
      for (const k of BOSS_ORDER) { const d = el('div'); d.append(el('span', '', BOSS_DEFS[k].name), el('b', '', S.beaten[k] ? '×' + S.beaten[k] : '—')); br.append(d); }
      box.append(br);
      box.append(el('h3', '', 'Furthest chapter'));
      const cr = el('div', 'bossrow');
      for (const id of DIFF_IDS) { const d = el('div'); d.append(el('span', '', DIFFS[id].name), el('b', '', S.cleared[id] ? 'box opened' : 'chapter ' + ROMAN[Save.reached(id)])); cr.append(d); }
      box.append(cr);
    } else if (this.nbTab === 'life') {
      const st = el('div', 'stats');
      UI.renderStats(st, [
        ['Runs', fmtInt(L.runs)], ['Time in the box', fmtTime(L.time)], ['Particles destroyed', fmtInt(L.kills)], ['Bosses defeated', fmtInt(L.bossKills)],
        ['Waves cleared', fmtInt(L.wavesCleared)], ['Lives lost', fmtInt(L.deaths)], ['Splits', fmtInt(L.splits)], ['Folds', fmtInt(L.folds)],
        ['Measurements', fmtInt(L.measurements)], ['Measurements survived', fmtInt(L.survived)], ['Observed by physicists', fmtInt(L.observed)], ['Decoherence events', fmtInt(L.decohered)],
        ['Grazes', fmtInt(L.grazes)], ['Power-ups collected', fmtInt(L.pickups)], ['Most cats at once', String(L.maxCats)], ['Best multiplier', '×' + (L.bestMult || 1).toFixed(2)],
        ['Least likely timeline', L.bestOdds < 0 ? fmtOddsLog(L.bestOdds) : '—'], ['Citations earned', fmtInt(L.citesEarned)],
      ]);
      box.append(el('h3', '', 'Across every run'), st);
    } else if (this.nbTab === 'runs') {
      if (!S.hist.length) { box.append(el('p', '', 'No finished runs yet. They show up here once a run ends.')); return; }
      const out = o => o === 'win' ? 'opened the box' : o === 'quit' ? 'quit' : (CAUSE_TEXT[o] || 'measured by ' + o);
      box.append(el('h3', '', 'The last ' + S.hist.length + ' runs'), table(['When', 'Mode', 'Difficulty', 'Score', 'Wave', 'Time', 'Outcome'],
        S.hist.map(h => [relDate(h.d), VARIANT_NAME[h.v] || h.v, (DIFFS[h.df] || DIFFS.graduate).name, fmtInt(h.s), String(h.w), fmtTime(h.t), out(h.o)])));
    } else {
      const head = el('div', 'nb-h'); head.append(el('h3', '', Save.achCount() + ' of ' + ACH.length + ' published'));
      box.append(head);
      const g = el('div', 'pubs');
      for (const a of ACH) {
        const got = S.ach[a.id], c = el('div', 'pub' + (got ? '' : ' locked'));
        c.append(el('h4', '', a.name), el('p', '', a.desc), el('small', '', (got ? 'Published ' + relDate(got) + ' · ' : '') + '+' + a.cites + ' citations'));
        g.append(c);
      }
      box.append(g);
    }
  },
  // ----- settings -----
  settings(from) { this.open('scr-settings', from); this.renderSettings(); $('b-set-back').focus(); },
  applySetting(k) {
    saveSettings();
    if (['vol', 'musicVol', 'sfxVol', 'sound', 'music', 'voice'].includes(k)) { Audio2.init(); Audio2.applySettings(); }
    if (k === 'theme') { const d = Director.def; if (Game.mode === 'arcade' && d) { if (Game.variant === 'endless') Theme.endless(Game.wave, 1); else Theme.chapter((d.chapter || 1) - 1, 1); } else Theme.chapter(0, 1); }
    if (k === 'lefty') document.body.classList.toggle('lefty', !!Settings.lefty);
    UI.syncSettings();
  },
  renderSettings() {
    const box = $('set-body'); box.innerHTML = '';
    const row = (label, help, ctrl) => { const r = el('div', 'srow'), l = el('div', 'lab', label); if (help) l.append(el('small', '', help)); r.append(l, ctrl); box.append(r); };
    const tog = (k, label, help, after) => {
      const b = el('button', 'tog'); b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', String(!!Settings[k])); b.setAttribute('aria-label', label);
      b.addEventListener('click', () => { Settings[k] = !Settings[k]; b.setAttribute('aria-checked', String(!!Settings[k])); this.applySetting(k); after && after(); });
      row(label, help, b);
    };
    const range = (k, label, help) => {
      const i = el('input'); i.type = 'range'; i.min = 0; i.max = 100; i.value = Math.round((Settings[k] ?? 1) * 100); i.setAttribute('aria-label', label);
      i.addEventListener('input', () => { Settings[k] = i.value / 100; this.applySetting(k); });
      row(label, help, i);
    };
    const seg = (label, help, opts, cur, set) => {
      const s = el('div', 'seg'); s.setAttribute('role', 'group'); s.setAttribute('aria-label', label);
      for (const [v, t] of opts) { const b = el('button', '', t); b.setAttribute('aria-pressed', String(v === cur())); b.addEventListener('click', () => { set(v); for (const x of s.children) x.setAttribute('aria-pressed', String(x === b)); }); s.append(b); }
      row(label, help, s);
    };
    box.append(el('h3', '', 'Sound'));
    tog('sound', 'Sound', 'Everything audible. M toggles it during play.');
    range('vol', 'Master volume'); range('musicVol', 'Music volume'); range('sfxVol', 'Effects volume');
    tog('music', 'Music'); tog('voice', 'Announcer voice', 'Uses your device’s speech voice.');
    box.append(el('h3', '', 'Display'));
    const sel = el('select'); sel.setAttribute('aria-label', 'Background colour');
    for (const [v, t] of [['auto', 'Changes as you play'], ...THEMES.map(t => [t.id, t.name])]) { const o = el('option', '', t); o.value = v; if (v === (Settings.theme || 'auto')) o.selected = true; sel.append(o); }
    sel.addEventListener('change', () => { Settings.theme = sel.value; this.applySetting('theme'); });
    row('Background colour', 'Each chapter has its own colour, and Endless shifts every wave. Or pin one.', sel);
    range('fx', 'Glow and film effects', 'Bloom, chromatic fringing, grain and scanlines.');
    seg('Screen shake', null, [['off', 'Off'], ['low', 'Low'], ['full', 'Full']], () => !Settings.shake ? 'off' : (Settings.shakeAmt ?? 1) < 0.75 ? 'low' : 'full', v => { Settings.shake = v !== 'off'; Settings.shakeAmt = v === 'low' ? 0.5 : 1; this.applySetting('shake'); });
    tog('flashes', 'Screen flashes', 'Turn off to soften bright flashes, inversions and glitches.');
    seg('Quality', 'Auto lowers resolution when frames drop.', [['auto', 'Auto'], ['high', 'High'], ['medium', 'Med'], ['low', 'Low']], () => R.quality, v => { R.quality = v; R.dyn = 1; store('quality', v); resizeRenderer(); });
    tog('popups', 'Score pop-ups'); tog('fps', 'Show frame rate');
    box.append(el('h3', '', 'Play'));
    tog('autoAim', 'Auto-aim', 'Aim at the nearest enemy automatically. Touch screens do this whenever you are not aiming.');
    tog('slowmo', 'Slow motion on measurements', 'Time slows while a hit is being decided. Off makes it brief.');
    tog('bigDots', 'Large hitbox markers', 'Bigger yellow dots on each cat’s real hitbox.');
    tog('lefty', 'Left-handed touch controls', 'Move with your right thumb. Split and fold buttons move to the left.');
    tog('hints', 'First-time hints', 'Short notes the first time you meet each enemy, power-up and boss.');
    box.append(el('h3', '', 'Your data'));
    box.append(el('p', '', 'Progress is saved in this browser automatically. To carry it to another device or browser, copy an export code and paste it into Import there.'));
    const area = el('textarea', 'code'); area.hidden = true; area.setAttribute('aria-label', 'Save code'); area.spellcheck = false;
    const btns = el('div', 'btnrow');
    const mk = (t, fn) => { const b = el('button', 'btn', t); b.addEventListener('click', () => fn(b)); btns.append(b); return b; };
    mk('Export save', () => {
      area.hidden = false; area.value = Save.exportCode(); area.focus(); area.select();
      try { navigator.clipboard.writeText(area.value).then(() => UI.toast('Save code copied.'), () => UI.toast('Select the code and copy it.')); } catch (e) { UI.toast('Select the code and copy it.'); }
    });
    mk('Import save', b => {
      if (area.hidden || b.dataset.ready !== '1') { area.hidden = false; area.value = ''; area.placeholder = 'Paste a save code here, then press Import save again.'; area.focus(); b.dataset.ready = '1'; return; }
      if (Save.importCode(area.value)) { UI.toast('Save loaded.'); b.dataset.ready = ''; area.hidden = true; UI.refreshTitle(); this.renderSettings(); }
      else UI.toast('That code did not work. Check it was copied completely.');
    });
    mk('Show first-time hints again', () => { Guide.seen = new Set(); store('seen', []); Game.toasts.clear(); UI.toast('First-time hints will show again.'); });
    mk('Erase all progress', b => {
      const now = performance.now();
      if (now - this.confirmT > 4000) { this.confirmT = now; b.textContent = 'Click again to erase everything'; return; }
      this.confirmT = 0; Save.reset(); UI.toast('All progress erased.'); UI.refreshTitle(); this.renderSettings();
    });
    box.append(btns, area);
  },
  // ----- discoveries -----
  choice(title, sub, done) {
    const opts = Mods.offer(3);
    if (!opts.length) { if (done) done(); return; }
    this.choiceOpts = opts; this.choiceDone = done;
    Game.state = 'choice'; Input.capture = false;
    $('choice-title').textContent = title; $('choice-sub').textContent = sub;
    const w = $('perks'); w.innerHTML = '';
    opts.forEach((id, k) => {
      const p = PERK[id], n = Mods.perks[id] || 0, b = el('button', 'pcard');
      b.append(el('div', 'ic', p.icon), el('small', '', n ? 'Level ' + (n + 1) + ' of ' + p.max : p.once ? 'Single use' : 'New'), el('h4', '', p.name), el('p', '', p.desc), el('span', 'k', String(k + 1)));
      b.addEventListener('click', () => this.pickIndex(k));
      w.append(b);
    });
    $('scr-choice').hidden = false;
    setTimeout(() => { if (!$('scr-choice').hidden && w.firstChild) w.firstChild.focus(); }, 60);
    Audio2.sfx('choose');
  },
  pickIndex(k) {
    if ($('scr-choice').hidden) return;
    const id = this.choiceOpts[k]; if (!id) return;
    Mods.take(id);
    $('scr-choice').hidden = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    Game.state = 'playing'; Input.capture = true; clearEdges();
    FX.text(Player.x, Player.y - 64, PERK[id].name, PI_.gold, { size: 17, font: 'serif', life: 1.8, vy: -24 });
    Audio2.sfx('power');
    const d = this.choiceDone; this.choiceDone = null; if (d) d();
  },
};
