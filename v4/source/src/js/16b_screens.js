// ---------- menus: new experiment, grant office, lab notebook, settings, discoveries ----------
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const keyName = c => ({ Space: 'Space', Escape: 'Esc', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', Enter: 'Enter', Tab: 'Tab', Backquote: '`' }[c] || c.replace(/^Key|^Digit/, '').replace(/^Arrow(.*)/, '$1 arrow').replace(/^Numpad/, 'Num '));
const VARIANT_NAME = { campaign: 'Campaign', programme: 'Research programme', endless: 'Endless', rush: 'Boss rush' };
function relDate(ms) {
  const s = (Date.now() - ms) / 1000;
  if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago';
  const d = new Date(ms); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
// the settings screen, as data: [section, [[control, key, label, help, options]]] or [section, render(box)]
const SETTINGS_UI = [
  ['Sound', [
    ['tog', 'sound', 'Sound', 'Everything audible. M toggles it during play.'], ['range', 'vol', 'Master volume'], ['range', 'musicVol', 'Music volume'], ['range', 'sfxVol', 'Effects volume'],
    ['tog', 'music', 'Music'],
    ['seg', 'announcer', 'Announcer', 'How often the announcer speaks. It uses your device’s own speech voice.', { opts: [['off', 'Off'], ['some', 'Key moments'], ['all', 'Chatty']], set: v => { Settings.announcer = v; Settings.voice = v !== 'off'; Screens.applySetting('voice'); } }],
    ['select', 'voiceName', 'Announcer voice', 'Voices come from your device. Pick one and press Test.', { opts: () => [['', 'Best available'], ...Audio2.voices().map(v => [v.name, v.name + ' (' + v.lang + ')'])], extra: () => { const b = el('button', 'icon-btn', 'Test'); b.addEventListener('click', () => { Audio2.voice = null; Audio2.say('The cat is alive. In this timeline.', 3, true); }); return b; } }],
  ]],
  ['Music', box => Screens.musicPlayer(box)],
  ['Controls', box => Screens.controls(box)],
  ['Display', [
    ['select', 'theme', 'Background colour', 'Each chapter has its own colour, and Endless shifts every wave. Or pin one.', { opts: () => [['auto', 'Changes as you play'], ...THEMES.map(t => [t.id, t.name])] }],
    ['range', 'hudScale', 'HUD size', 'Scales the score, wavefunction panel and other readouts.', { min: 0.75, max: 1.5 }],
    ['tog', 'hudMinimal', 'Minimal HUD', 'Hides the law explanation line and secondary readouts during play.'],
    ['tog', 'odds', 'Death odds by your cats', 'Shows 1/N next to your cats when a bullet gets close.'],
    ['tog', 'splits', 'Speedrun splits', 'Time per wave against your personal best, bottom right.'],
    ['range', 'fx', 'Glow and film effects', 'Bloom, chromatic fringing, grain and scanlines.'],
    ['seg', 'shake', 'Screen shake', null, { opts: [['off', 'Off'], ['low', 'Low'], ['full', 'Full']], get: () => !Settings.shake ? 'off' : (Settings.shakeAmt ?? 1) < 0.75 ? 'low' : 'full', set: v => { Settings.shake = v !== 'off'; Settings.shakeAmt = v === 'low' ? 0.5 : 1; Screens.applySetting('shake'); } }],
    ['tog', 'flashes', 'Screen flashes', 'Turn off to soften bright flashes, inversions and glitches.'],
    ['seg', 'quality', 'Quality', 'Auto lowers resolution when frames drop.', { opts: [['auto', 'Auto'], ['high', 'High'], ['medium', 'Med'], ['low', 'Low']], get: () => R.quality, set: v => { R.quality = v; R.dyn = 1; store('quality', v); resizeRenderer(); } }],
    ['tog', 'popups', 'Score pop-ups'], ['tog', 'fps', 'Show frame rate'],
  ]],
  ['Accessibility', [
    ['select', 'cb', 'Colour-blind mode', 'Changes the phase colours and the danger colours so they stay apart.', { opts: () => [['off', 'Off'], ['deutan', 'Deuteranopia (red–green)'], ['protan', 'Protanopia (red–green)'], ['tritan', 'Tritanopia (blue–yellow)'], ['contrast', 'High contrast']] }],
    ['seg', 'bulletOutline', 'Bullet outlines', 'A dark or light rim around every enemy bullet, for contrast.', { opts: [['off', 'Off'], ['dark', 'Dark'], ['light', 'Light']] }],
    ['tog', 'gridWarp', 'Grid warping', 'The background grid bends around things. Off keeps it flat.'],
    ['tog', 'camRotate', 'Camera rotation', 'The Gödel universe rotates the screen. Off keeps it upright (bullets still curve).'],
    ['tog', 'pixelate', 'Pixelation', 'ℏ = 1 makes everything chunky. Off keeps it sharp.'],
    ['tog', 'slowmo', 'Slow motion on measurements', 'Time slows while a hit is being decided. Off makes it brief.'],
    ['tog', 'bigDots', 'Large hitbox markers', 'Bigger yellow dots on each cat’s real hitbox (focus always shows them).'],
  ]],
  ['Play', [
    ['tog', 'autoAim', 'Auto-aim', 'Aim automatically. It leads moving targets and sticks to one until another is clearly better. Touch screens do this whenever you are not aiming.'],
    ['range', 'aimAssist', 'Auto-aim stickiness', 'How strongly auto-aim holds on to its current target.'],
    ['tog', 'vibrate', 'Vibration', 'Controller rumble and phone vibration on hits, folds and big moments.'],
    ['range', 'vibAmt', 'Vibration strength'],
    ['tog', 'lefty', 'Left-handed touch controls', 'Move with your right thumb. Split, fold and focus buttons swap sides.'],
    ['btn', 'btnLayout', 'Touch button layout', 'Drag the split, fold and focus buttons anywhere and resize them.', { text: 'Arrange', fn: () => TouchLayout.open('scr-settings') }],
    ['tog', 'hints', 'First-time hints', 'Short notes the first time you meet each enemy, power-up and boss.'],
  ]],
];
// the controller diagram: [x, y, label, button index] on a 520×250 pad
const PAD_MAP = [[118, 64, 'LB · LT focus', 4], [402, 64, 'RB fold · RT split', 5], [392, 150, 'A split', 0], [432, 112, 'B fold', 1], [278, 112, 'Start pause', 9], [140, 150, 'Left stick: move', 10], [330, 200, 'Right stick: aim', 11], [190, 205, 'D-pad: menus', 12]];
const Screens = {
  fromMap: {}, su: null, choiceOpts: [], choiceDone: null, nbTab: 'records', confirmT: 0,
  init() {
    const on = (id, fn) => $(id).addEventListener('click', fn);
    on('b-setup-back', () => this.close('scr-setup'));
    on('b-grants-back', () => this.close('scr-grants'));
    on('b-nb-back', () => this.close('scr-notebook'));
    on('b-set-back', () => this.close('scr-settings'));
    on('b-cab-back', () => this.close('scr-cabinet'));
    on('b-begin', () => this.begin());
    for (const v of ['campaign', 'programme', 'endless', 'rush']) on('mode-' + v, () => { this.su.variant = v; this.renderSetup(); });
    $('use-upg').addEventListener('change', e => { Save.d.useUpg = e.target.checked; Save.write(); });
    $('use-upg2').addEventListener('change', e => { Save.d.useUpg = e.target.checked; Save.write(); });
    on('b-refund', () => this.refund());
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
    const diff = DIFFS[last.diff] && !Save.diffLocked(last.diff) ? last.diff : 'graduate';
    this.su = { variant, diff, chapter: clamp(last.chapter || 1, 1, Save.reachedFor(diff)) };
    this.open('scr-setup', from);
    this.renderSetup();
    $('b-begin').focus();
  },
  locked(v) { return v !== 'campaign' && !Save.unlocked(v); },
  renderSetup() {
    const su = this.su, S = Save.d, locked = this.locked(su.variant);
    for (const v of ['campaign', 'programme', 'endless', 'rush']) { const t = $('mode-' + v); t.setAttribute('aria-selected', String(v === su.variant)); t.textContent = VARIANT_NAME[v] + (this.locked(v) ? ' · locked' : ''); }
    $('mode-note').textContent = su.variant === 'campaign'
      ? 'Ten experiments of four waves: three with laws of physics suspended, then a boss. Beat a boss and you choose a discovery for the rest of the run.'
      : locked ? (su.variant === 'programme' ? 'Beat any boss on Graduate or harder to unlock the Research programme.' : `Finish the campaign on Undergrad or harder to unlock ${VARIANT_NAME[su.variant]}. You have reached experiment ${ROMAN[Save.maxReached()]} of ${ROMAN[CHAPTERS.length]} so far.`)
        : su.variant === 'programme' ? 'A new map every run. Three grant cycles of branching rooms: experiments, risky experiments, anomalies, a grant office, peer review and conferences, each cycle ending in a boss. Funding is earned and spent inside the run. Beat the third boss and your paper is published; Tenure track goes on for as long as you last.'
        : su.variant === 'endless' ? 'The waves never stop. Laws combine at random, a random boss arrives every fifth wave, and every wave is harder than the last. The background changes colour as you go.'
          : 'Every boss back to back, each with a law of physics suspended and a discovery after it. Then around again, tougher. Space weather turns up as you go.';
    if (su.variant === 'endless' && !locked) $('mode-note').textContent += ' Elites and space weather (meteor showers, eclipses, black holes) turn up more and more often.';
    $('setup-body').hidden = locked; $('b-begin').disabled = locked;
    const dw = $('diffs'); dw.innerHTML = '';
    for (const id of DIFF_IDS) {
      const D = DIFFS[id], b = el('button', 'dcard'), lk = Save.diffLocked(id); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(id === su.diff));
      b.style.setProperty('--dc', PAL_CSS[PI_[D.col]]); b.disabled = lk;
      const r = Save.rec(su.variant, id);
      b.append(el('b', '', D.name + (lk ? ' · locked' : '')), el('span', '', lk ? 'Finish the campaign on Reviewer 2 to be considered.' : D.blurb), el('small', '', `${D.lives} lives · score ×${D.score}${S.cleared[id] ? ' · box opened' : su.variant === 'campaign' && Save.reached(id) > 1 ? ' · ch. ' + ROMAN[Save.reached(id)] : ''}${r.score ? ' · best ' + fmtInt(r.score) : ''}`));
      b.addEventListener('click', () => { if (lk) return; su.diff = id; su.chapter = Math.min(su.chapter, Save.reachedFor(id)); this.renderSetup(); });
      dw.append(b);
    }
    $('chap-wrap').hidden = su.variant !== 'campaign';
    const cw = $('chaps'); cw.innerHTML = '';
    const max = Save.reachedFor(su.diff);
    CHAPTERS.forEach((c, i) => {
      const n = i + 1, b = el('button', 'chap'); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(n === su.chapter)); b.disabled = n > max;
      const sm = el('small', '', 'Ch. ' + ROMAN[n]); sm.append(el('i', '', ' · wave ' + (i * CHAPTER_LEN + 1)));
      b.append(sm, el('span', '', n > max ? '???' : c.title));
      b.title = n <= max ? 'Ends with ' + BOSS_DEFS[c.boss].name : 'Reach this chapter on ' + DIFFS[su.diff].name + ' or harder first.';
      b.addEventListener('click', () => { su.chapter = n; this.renderSetup(); });
      cw.append(b);
    });
    const r = Save.rec(su.variant, su.diff), rl = $('rec-line'); rl.innerHTML = '';
    if (r.runs) {
      rl.append(document.createTextNode('Best on this setting: '), el('b', '', fmtInt(r.score)), document.createTextNode(' · furthest wave '), el('b', '', String(r.wave)), document.createTextNode(' · ' + r.runs + ' run' + (r.runs === 1 ? '' : 's')));
      if (r.clears) rl.append(document.createTextNode(' · finished ' + r.clears + '×' + (r.fastest ? ', fastest ' + fmtTime(r.fastest) : '')));
    } else rl.textContent = 'No runs on this setting yet.';
    if (su.variant === 'campaign' && su.chapter > 1) rl.append(document.createTextNode(' Starting at chapter ' + ROMAN[su.chapter] + ' gives you an interpretation and ' + (su.chapter - 1) + ' free discover' + (su.chapter === 2 ? 'y.' : 'ies.')));
    if (su.variant === 'campaign') rl.append(document.createTextNode(' Chapters open per difficulty: reaching one on a harder setting opens it on the easier ones too.'));
    $('use-upg').checked = S.useUpg;
  },
  begin() {
    const su = this.su; if (!su || this.locked(su.variant) || Save.diffLocked(su.diff)) return;
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
      const b = el('button', 'buy', maxed ? 'Fully funded' : 'Fund · ' + fmtInt(cost)); if (!maxed) b.prepend(icon('cite'));
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
  notebook(from) { LabNotes.open(from); },
  // ----- settings -----
  settings(from) { this.open('scr-settings', from); this.renderSettings(); $('b-set-back').focus(); },
  applySetting(k) {
    saveSettings();
    if (['vol', 'musicVol', 'sfxVol', 'sound', 'music', 'voice'].includes(k)) { Audio2.init(); Audio2.applySettings(); }
    if (k === 'theme') { const d = Director.def; if (Game.mode === 'arcade' && d) { if (Game.variant === 'endless') Theme.endless(Game.wave, 1); else Theme.chapter((d.chapter || 1) - 1, 1); } else Theme.chapter(0, 1); }
    if (k === 'lefty') { document.body.classList.toggle('lefty', !!Settings.lefty); TouchLayout.apply(); }
    if (k === 'cb') { applyLook(); Guide.drawn = false; }
    if (k === 'bulletOutline') spriteCache.clear();
    if (k === 'voiceName') Audio2.voice = null;
    UI.syncSettings();
  },
  renderSettings() {
    const box = $('set-body'); box.innerHTML = '';
    const row = (label, help, ctrl, extra) => { const r = el('div', 'srow'), l = el('div', 'lab', label); if (help) l.append(el('small', '', help)); const c = el('div', 'player'); c.append(ctrl); if (extra) c.append(extra); r.append(l, c); box.append(r); };
    const make = {
      tog: (k, label) => { const b = el('button', 'tog'); b.setAttribute('role', 'switch'); b.setAttribute('aria-label', label); const sync = () => b.setAttribute('aria-checked', String(!!Settings[k])); sync(); b.addEventListener('click', () => { Settings[k] = !Settings[k]; sync(); this.applySetting(k); }); return b; },
      range: (k, label, o) => { const lo = o.min ?? 0, hi = o.max ?? 1, i = el('input'); Object.assign(i, { type: 'range', min: 0, max: 100, value: Math.round(((Settings[k] ?? 1) - lo) / (hi - lo) * 100) }); i.setAttribute('aria-label', label); i.addEventListener('input', () => { Settings[k] = lo + (hi - lo) * i.value / 100; this.applySetting(k); }); return i; },
      seg: (k, label, o) => { const s = el('div', 'seg'); s.setAttribute('role', 'group'); s.setAttribute('aria-label', label); for (const [v, t] of o.opts) { const b = el('button', '', t); b.setAttribute('aria-pressed', String(v === (o.get ? o.get() : Settings[k]))); b.addEventListener('click', () => { if (o.set) o.set(v); else { Settings[k] = v; this.applySetting(k); } for (const x of s.children) x.setAttribute('aria-pressed', String(x === b)); }); s.append(b); } return s; },
      btn: (k, label, o) => { const b = el('button', 'btn', o.text); b.setAttribute('aria-label', label); b.addEventListener('click', o.fn); return b; },
      select: (k, label, o) => { const sel = el('select'), opts = o.opts(); sel.setAttribute('aria-label', label); for (const [v, t] of opts) { const op = el('option', '', t); op.value = v; op.selected = v === (Settings[k] ?? opts[0][0]); sel.append(op); } sel.addEventListener('change', () => { Settings[k] = sel.value; this.applySetting(k); }); return sel; },
    };
    for (const [head, rows] of SETTINGS_UI) {
      box.append(el('h3', '', head));
      if (typeof rows === 'function') { rows(box); continue; }
      for (const [type, k, label, help, o = {}] of rows) row(label, help, make[type](k, label, o), o.extra && o.extra());
    }
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
  // ----- music player -----
  musicPlayer(box) {
    const wrap = el('div', 'srow'), lab = el('div', 'lab', 'Music player');
    lab.append(el('small', '', 'Every chapter has its own track and every boss its own theme (beat a boss to unlock it). Let the game choose, pick one, shuffle, or play your own files.'));
    const ctl = el('div', 'player'), sel = el('select');
    const add = (v, t) => { const o = el('option', '', t); o.value = v; o.selected = v === Settings.musicPick; sel.append(o); };
    add('auto', 'Let the game choose'); add('shuffle', 'Shuffle everything unlocked');
    for (const t of Audio2.tracks()) add(t.id, t.name + (t.locked ? ' (locked)' : ''));
    for (const t of Audio2.custom) add('file:' + t.id, '♪ ' + t.name);
    for (const o of sel.options) if (o.textContent.endsWith('(locked)')) o.disabled = true;
    sel.addEventListener('change', () => { Settings.musicPick = sel.value; saveSettings(); Audio2.init(); Audio2.music(Audio2.mode, Audio2.wave, true); });
    const file = el('input'); Object.assign(file, { type: 'file', accept: 'audio/*', multiple: true }); file.hidden = true;
    file.addEventListener('change', async () => { const n = await Audio2.addFiles(file.files); UI.toast(n ? `Added ${n} track${n === 1 ? '' : 's'}. They are saved in this browser.` : 'Those files could not be read.'); this.renderSettings(); });
    const load = el('button', 'icon-btn', 'Add your own…'); load.addEventListener('click', () => file.click());
    ctl.append(sel, load, file);
    if (Audio2.custom.length) { const c = el('button', 'icon-btn', 'Remove your files'); c.addEventListener('click', async () => { await Audio2.clearFiles(); if (Settings.musicPick.startsWith('file:')) Settings.musicPick = 'auto'; saveSettings(); this.renderSettings(); }); ctl.append(c); }
    wrap.append(lab, ctl); box.append(wrap);
  },
  // ----- controls: rebindable keys and the controller diagram -----
  controls(box) {
    const intro = el('p', '', 'Click a key to rebind it, then press the new key (Esc cancels). Each action can have two keys. The mouse always splits (left button) and folds (right button).');
    const grid = el('div', 'keys'), binds = Input.binds;
    for (const act of Object.keys(BINDS_DEFAULT)) {
      grid.append(el('span', '', ACTION_NAMES[act]));
      for (let k = 0; k < 2; k++) {
        const code = binds[act][k], b = el('button', 'kb', code ? keyName(code) : '—');
        b.addEventListener('click', () => this.rebind(b, act, k)); grid.append(b);
      }
    }
    const reset = el('button', 'icon-btn', 'Reset keys'); reset.addEventListener('click', () => { Settings.keys = null; saveSettings(); Input.setBinds(null); this.renderSettings(); });
    const pad = el('canvas', 'pad'), st = el('p', 'pad-state');
    box.append(intro, grid, el('div', 'btnrow'), reset, el('h3', '', 'Controller'), st, pad);
    this.padDiagram(pad, st);
  },
  rebind(b, act, k) {
    b.classList.add('wait'); b.textContent = 'press a key';
    const h = e => {
      e.preventDefault(); e.stopPropagation(); window.removeEventListener('keydown', h, true);
      if (e.code !== 'Escape') {
        const keys = {}; for (const a in Input.binds) keys[a] = Input.binds[a].filter(c => c !== e.code); // a key does one thing
        keys[act][k] = e.code; keys[act] = keys[act].filter(Boolean).slice(0, 3);
        Settings.keys = keys; saveSettings(); Input.setBinds(keys);
        $('quick-keys').hidden = true; // the title's key summary describes the defaults
      }
      this.renderSettings();
    };
    window.addEventListener('keydown', h, true);
  },
  padDiagram(cv, st) {
    const W2 = 520, H2 = 250, d = Math.min(2, devicePixelRatio || 1); cv.width = W2 * d; cv.height = H2 * d;
    const c = cv.getContext('2d'); c.scale(d, d);
    const draw = () => {
      if (!cv.isConnected) return;
      const pad = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find(p => p && p.connected);
      st.innerHTML = ''; st.append(pad ? el('b', '', '● Controller detected: ') : document.createTextNode('No controller detected. Plug one in and press a button.'), document.createTextNode(pad ? pad.id.replace(/\(.*?\)/g, '').trim().slice(0, 48) : ''));
      c.clearRect(0, 0, W2, H2);
      c.fillStyle = '#1e1838'; c.strokeStyle = '#5f5890'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(120, 70); c.bezierCurveTo(60, 70, 30, 200, 70, 230); c.bezierCurveTo(110, 250, 150, 190, 200, 180); c.lineTo(320, 180); c.bezierCurveTo(370, 190, 410, 250, 450, 230); c.bezierCurveTo(490, 200, 460, 70, 400, 70); c.closePath(); c.fill(); c.stroke();
      const press = i => pad && pad.buttons[i] && pad.buttons[i].pressed;
      for (const [x, y, label, i] of PAD_MAP) {
        const on = i >= 10 ? pad && (i === 10 ? Math.hypot(pad.axes[0], pad.axes[1]) : Math.hypot(pad.axes[2] || 0, pad.axes[3] || 0)) > 0.3 : press(i) || (i === 4 && press(6)) || (i === 5 && press(7));
        c.fillStyle = on ? '#4cf2ff' : '#2b2448'; c.beginPath(); c.arc(x, y, i >= 10 ? 16 : 11, 0, TAU); c.fill(); c.strokeStyle = '#9a93c4'; c.stroke();
        c.fillStyle = '#ece7ff'; c.font = '11px Qmono, monospace'; c.textAlign = x > 260 ? 'left' : 'right';
        c.fillText(label, x + (x > 260 ? 22 : -22), y + 4);
      }
      requestAnimationFrame(draw);
    };
    draw();
  },
  // ----- cabinet: medals buy cat designs, bullet trails and colour palettes -----
  cabinet(from) { this.open('scr-cabinet', from); this.renderCabinet(); $('b-cab-back').focus(); },
  renderCabinet() {
    const S = Save.d, C = S.cos, box = $('cab-body'); box.innerHTML = ''; $('medal-bal').textContent = String(S.medals);
    const owned = (g, k, cost) => !cost || C.own[g + ':' + k];
    const section = (title, g, items, preview) => {
      box.append(el('h3', '', title)); const w = el('div', 'cosm');
      for (const [k, name, cost] of items) {
        const have = owned(g, k, cost), b = el('button', 'cos' + (have ? '' : ' locked')), cv = el('canvas');
        cv.width = cv.height = 128; preview(cv.getContext('2d'), k); b.setAttribute('aria-pressed', String(C[g] === k));
        b.append(cv, el('span', '', name), (() => { const sm = el('small', '', have ? (C[g] === k ? 'In use' : 'Owned') : cost + ' medal' + (cost === 1 ? '' : 's')); if (!have) sm.prepend(icon('medal')); return sm; })());
        b.addEventListener('click', () => {
          if (!have) { if (S.medals < cost) { UI.toast(`You need ${cost - S.medals} more medal${cost - S.medals === 1 ? '' : 's'}. Medals come from mastery: flawless bosses, harder difficulties, new bests.`); return; } S.medals -= cost; C.own[g + ':' + k] = true; Audio2.sfx('medal'); }
          C[g] = k; Save.write(); applyLook(); this.renderCabinet(); UI.refreshTitle();
        });
        w.append(b);
      }
      box.append(w);
    };
    section('Cat designs', 'skin', Object.entries(CAT_SKINS).map(([k, v]) => [k, v.name, SKIN_COST[k] || 0]), (c, k) => c.drawImage(catSprite(0, 0, k), 2, 2, 124, 124));
    section('Bullet trails', 'trail', Object.entries(TRAILS).map(([k, v]) => [k, v.name, v.cost]), (c, k) => {
      c.lineCap = 'round';
      for (let j = 0; j < 3; j++) { const y = 34 + j * 30, col = PAL_CSS[j * 8 % PHASE_N];
        if (k === 'pixel') { c.fillStyle = col; for (let x = 20; x < 110; x += 14) c.fillRect(x, y - 3, 7, 7); continue; }
        c.strokeStyle = k === 'quill' ? '#120d22' : col; c.lineWidth = k === 'comet' ? 7 : 4; c.beginPath(); c.moveTo(18, y);
        for (let x = 18; x < 110; x += 4) c.lineTo(x, y + (k === 'photon' ? Math.sin(x * 0.25) * 5 : 0)); c.stroke();
        if (k === 'rainbow') { for (let x = 18; x < 110; x += 12) { c.strokeStyle = PAL_CSS[(x + j * 9) % PHASE_N]; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10, y); c.stroke(); } }
        if (k === 'quill') { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(18, y); c.lineTo(110, y); c.stroke(); }
      }
    });
    section('Colour palettes', 'pal', Object.entries(PALETTES).map(([k, v]) => [k, v.name, v.cost]), (c, k) => {
      const stops = PALETTES[k].stops || PHASE_DEFAULT;
      for (let a = 0; a < 64; a++) { const f = a / 64 * stops.length, i = Math.floor(f), t = f - i, A = stops[i % stops.length], B = stops[(i + 1) % stops.length]; c.fillStyle = `rgb(${A.map((v, j) => Math.round(v + (B[j] - v) * t)).join(',')})`; c.beginPath(); c.moveTo(64, 64); c.arc(64, 64, 52, a / 64 * TAU, (a + 1.2) / 64 * TAU); c.fill(); }
      c.fillStyle = '#0c0a18'; c.beginPath(); c.arc(64, 64, 26, 0, TAU); c.fill();
    });
    if (Settings.cb && Settings.cb !== 'off') box.append(el('p', '', 'A colour-blind mode is on, so palettes are paused until you switch it off in Settings.'));
  },
  // ----- discoveries (and the paper that earned them) -----
  paper(p) {
    const box = $('choice-paper'); box.innerHTML = ''; box.hidden = !p;
    if (p) box.append(el('small', '', p.journal + ' · ' + BOSS_DEFS[p.boss].name), el('p', '', p.text));
    if (p && p.res) {
      const r = p.res, N = NOTES['boss:' + p.boss];
      box.append(el('h5', 'res-h', 'Results · Experiment ' + ROMAN[r.ch] + ': ' + CHAPTERS[r.ch - 1].title));
      box.append(el('p', 'res', [fmtTime(r.time) + ' in the box', r.surv + ' of ' + r.meas + ' measurements survived', r.lost + ' cat' + (r.lost === 1 ? '' : 's') + ' lost', r.win !== undefined ? Math.round(r.win * 100) + '% of the boss damage in its weak window' : '', 'odds of this timeline ' + fmtOddsLog(r.log)].filter(Boolean).join(' · ')));
      if (N) box.append(el('p', 'res concl-line', 'Conclusion, written up in your lab notes: ' + N.concl));
    }
  },
  choice(title, sub, done, paper) {
    const opts = Mods.offer();
    if (!opts.length) { if (done) done(); return; }
    this.choiceOpts = opts.map(id => () => { Mods.take(id); return PERK[id].name; }); this.choiceDone = done;
    Game.state = 'choice'; Input.capture = false;
    $('choice-title').textContent = title; $('choice-sub').textContent = sub; this.paper(paper);
    this.cards(opts.map(id => { const p = PERK[id], n = Mods.perks[id] || 0; return [p.icon, n ? 'Level ' + (n + 1) + ' of ' + p.max : p.once ? 'Single use' : p.school ? SCHOOLS[p.school].name + ' only' : 'New', p.name, p.desc]; }));
  },
  // the interpretation: once per run, after the first boss (or at the start when skipping chapters)
  school(done, paper) {
    const ids = Object.keys(SCHOOLS); this.choiceDone = done;
    this.choiceOpts = ids.map(id => () => { Mods.choose(id); Player.rerolls = Mods.rerolls; if (Mods.school === 'mw' && Player.nq > Player.maxQ()) Player.measureFull('Many-Worlds'); return SCHOOLS[id].name; });
    Game.state = 'choice'; Input.capture = false;
    $('choice-title').textContent = 'Choose an interpretation'; this.paper(paper);
    $('choice-sub').textContent = 'How you read quantum mechanics shapes the rest of this run: a signature ability, a cost, and discoveries only your school is offered.';
    this.cards(ids.map(id => { const S = SCHOOLS[id]; return [S.icon, 'Interpretation', S.name, S.sig, 'Cost: ' + S.cost, S.motto]; }));
  },
  cards(list) {
    const w = $('perks'); w.innerHTML = '';
    list.forEach(([ic, tag, name, desc, cost, motto], k) => { const b = el('button', 'pcard'); b.append(el('div', 'ic', ic), el('small', '', tag), el('h4', '', name)); if (motto) b.append(el('em', 'motto', '“' + motto + '”')); b.append(el('p', '', desc)); if (cost) b.append(el('p', 'cost', cost)); b.append(el('span', 'k', String(k + 1))); b.addEventListener('click', () => this.pickIndex(k)); w.append(b); });
    balanceGrid(w, 190);
    $('choice-note').textContent = 'Press ' + list.map((_, k) => k + 1).join(', ').replace(/, (\d)$/, ' or $1') + ', or click a card.';
    $('scr-choice').hidden = false;
    setTimeout(() => { if (!$('scr-choice').hidden && w.firstChild) w.firstChild.focus(); }, 60);
    Audio2.sfx('choose');
  },
  pickIndex(k) {
    if ($('scr-choice').hidden) return;
    const f = this.choiceOpts[k]; if (!f) return;
    const name = f();
    $('scr-choice').hidden = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    Game.state = 'playing'; Input.capture = true; clearEdges();
    Feed.add(name, 'gold', 'chosen');
    Audio2.sfx('power');
    const d = this.choiceDone; this.choiceDone = null; if (d) d();
    UI.nextToast();
  },
};
