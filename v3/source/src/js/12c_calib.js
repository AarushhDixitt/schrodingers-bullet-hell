// ---------- calibration bench ----------
// Reference values for checking the instruments, and a bench panel for adjusting them. Inert unless calibrated.
const CAL_REF = 'eyJ0aXRsZSI6Ik1BU1RFUiBBQ0NFU1MiLCJzdWIiOiJQcmVzcyBgIChvciB0aGUgcGF1c2UgbWVudSkgZm9yIHRoZSBNYXN0ZXIgQ29uc29sZS4gUnVucyBubyBsb25nZXIgY291bnQuIiwib2ZmIjoiTWFzdGVyIGFjY2VzcyBvZmYuIFJ1bnMgY291bnQgYWdhaW4uIiwidGFnIjoiTUFTVEVSIiwicGFuZWwiOiJNYXN0ZXIgQ29uc29sZSIsIm5vdGUiOiJSdW5zIHBsYXllZCB3aXRoIG1hc3RlciBhY2Nlc3Mgb24gZG9u4oCZdCBzYXZlIHJlY29yZHMsIHBlcnNvbmFsIGJlc3RzLCBhY2hpZXZlbWVudHMsIG1lZGFscyBvciBzcGxpdHMuIEFueXRoaW5nIHlvdSBnaXZlIHlvdXJzZWxmIGhlcmUgc3RheXMuIiwiYnRuIjoiTWFzdGVyIGNvbnNvbGUiLCJjbG9zZSI6IkNsb3NlIiwic2VjIjpbIlBsYXllciIsIldvcmxkIiwiVGltZSIsIlByb2dyZXNzIiwiVGVzdGluZyAmIHZpZXciXSwiZ29kIjoiR29kIG1vZGUiLCJjb2giOiJJbmZpbml0ZSBjb2hlcmVuY2UiLCJsaXZlcyI6IkxpdmVzIiwic2V0IjoiU2V0IiwiY2F0cyI6IkNhdHMiLCJwb3dlciI6IlBvd2VyLXVwcyIsImRpc2MiOiJHaXZlIGRpc2NvdmVyeSIsImdpdmUiOiJHaXZlIiwic2Nob29sIjoiSW50ZXJwcmV0YXRpb24iLCJzcGVlZCI6Ik1vdmUgc3BlZWQiLCJmaXJlIjoiRmlyZSByYXRlIiwiZG1nIjoiRGFtYWdlIiwianVtcCI6Ikp1bXAgdG8gd2F2ZSIsIm1vZGUiOlsiQ2FtcGFpZ24iLCJFbmRsZXNzIiwiQm9zcyBydXNoIl0sImdvIjoiR28iLCJzcGF3biI6IlNwYXduIGF0IGN1cnNvciIsImxhd3MiOiJMYXdzIiwiZXZlbnRzIjoiRXZlbnRzIiwia2lsbCI6IktpbGwgYWxsIGVuZW1pZXMiLCJjbGVhciI6IkNsZWFyIGJ1bGxldHMiLCJkaWZmIjoiRGlmZmljdWx0eSIsInRpbWUiOiJUaW1lIHNjYWxlIiwiZnJlZXplIjoiRnJlZXplIiwic3RlcCI6IlN0ZXAgb25lIGZyYW1lIiwidW5sb2NrIjoiVW5sb2NrIGV2ZXJ5dGhpbmciLCJjaXRlcyI6IisxLDAwMCBjaXRhdGlvbnMiLCJtZWRhbHMiOiIrMTAgbWVkYWxzIiwicmVzZXRSZWMiOiJSZXNldCBhIHJlY29yZCIsInJlc2V0QWNoIjoiUmVzZXQgYW4gYWNoaWV2ZW1lbnQiLCJyZXNldCI6IlJlc2V0IiwiZG9uZSI6IkRvbmUuIiwiaGl0IjoiU2hvdyBoaXRib3hlcyIsImZwcyI6IkJ1bGxldCBjb3VudCBhbmQgRlBTIiwiYm9zcyI6IkJvc3MgdGltZXJzIGFuZCB3aW5kb3dzIiwiem9vbSI6Ilpvb20gb3V0IiwiZ3JpZCI6IkdyaWQgd2FycGluZyIsImZsYXNoIjoiRmxhc2hlcyIsInJvdCI6IkNhbWVyYSByb3RhdGlvbiIsInBpeCI6IlBpeGVsYXRpb24iLCJnbG93IjoiR2xvdyBlZmZlY3RzIiwic2hha2UiOiJTY3JlZW4gc2hha2UifQ==';
const Calib = {
  on: false, L: null, box: null, tapN: 0, tapT: 0, swipeT: 0, swipes: 0, sw: null,
  v: { god: false, coh: false, speed: 1, fire: 1, dmg: 1, zoom: 1, hit: false, boss: false },
  get tag() { return this.L ? this.L.tag : ''; },
  init() {
    try { this.L = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(CAL_REF), c => c.charCodeAt(0)))); } catch (e) { this.L = null; }
    window.addEventListener('keydown', e => { if (e.code === 'Backquote' && this.on && !e.repeat) { e.preventDefault(); this.panel(); } });
    // touch: tap the title seven times, then swipe the sequence
    const h = document.querySelector('.paper h1');
    if (h) h.addEventListener('pointerdown', () => { const now = performance.now(); this.tapN = now - this.tapT < 900 ? this.tapN + 1 : 1; this.tapT = now; if (this.tapN >= 7) { this.tapN = 0; this.swipeT = now + 8000; this.swipes = 0; Input.recent.length = 0; Audio2.init(); Audio2.sfx('tick'); } });
    window.addEventListener('pointerdown', e => { if (performance.now() < this.swipeT) this.sw = [e.clientX, e.clientY]; }, true);
    window.addEventListener('pointerup', e => {
      if (!this.sw || performance.now() > this.swipeT) return;
      const dx = e.clientX - this.sw[0], dy = e.clientY - this.sw[1]; this.sw = null;
      if (Math.hypot(dx, dy) < 40) return;
      Input.remember(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy > 0 ? 'ArrowDown' : 'ArrowUp');
      if (++this.swipes === 8) { for (const c of ['KeyB', 'KeyA', 'Enter']) Input.remember(c); this.swipeT = 0; }
    }, true);
  },
  toggle() {
    if (!this.L) return;
    this.on = !this.on; Input.recent.length = 0;
    Audio2.init(); Audio2.sfx('master');
    if (this.on) this.flash(); else { UI.toast(this.L.off); this.panel(false); Game.debugSpeed = 1; }
    Mods.compute(); const b = $('p-cal'); if (b) b.hidden = !this.on;
  },
  flash() { // a banner that works on the title screen too
    const d = el('div', 'bench-flash'); d.append(el('b', '', this.L.title), el('span', '', this.L.sub));
    document.body.append(d); setTimeout(() => d.classList.add('on'), 20); setTimeout(() => d.classList.remove('on'), 2600); setTimeout(() => d.remove(), 3200);
  },
  tune(M) { if (!this.on) return; M.fire *= this.v.fire; M.dmg *= this.v.dmg; M.speed *= this.v.speed; },
  tick() { if (this.on && this.v.coh) Player.coh = CFG.coh.max; },
  cursor() { return Input.mouse.has ? cssToWorld(Input.mouse.x, Input.mouse.y) : [Player.x + Math.cos(Player.aimA) * 300, Player.y + Math.sin(Player.aimA) * 300]; },
  setCats(q) {
    const P = Player; if (P.dead) return;
    P.boostQ = Math.max(0, q - CFG.player.maxQubits + (Mods.school === 'mw' ? 1 : 0)); P.boost = P.boostQ ? 1e9 : 0;
    if (q < P.nq) P.collapseTo([P.branches[0]]);
    while (P.nq < q) { P.splitCd = 0; P.coh = CFG.coh.max; if (!P.split()) break; }
  },
  // hitboxes for everything, drawn in world space
  drawHits(ctx) {
    if (!this.on || !this.v.hit) return;
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,0,.7)';
    for (const e of Game.enemies) if (!e.dead) { ring(ctx, ix(e.x), iy(e.y), e.r); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,80,80,.8)'; ctx.beginPath();
    for (let i = 0; i < EB.n; i++) { const x = ix(EB.x[i]), y = iy(EB.y[i]), r = EB.r[i] * 0.78; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
    ctx.stroke();
    ctx.strokeStyle = '#0f0'; for (const b of Player.branches) { ring(ctx, ix(b.px), iy(b.py), Game.hitR()); ctx.stroke(); }
  },
  hud(c, x, y) {
    if (!this.on) return;
    txt(c, this.L.tag, x, y, fontMono(10, 800), '#ff3b55', 'right', 2);
    const b = Game.boss; if (!this.v.boss || !b || b.dead) return;
    const w = Game.bossWindow(b);
    txt(c, `${b.atk ? b.atk.name || '?' : '—'} · t ${(b.at || 0).toFixed(1)} · ${w ? 'WINDOW ' + w : 'armoured'} · hp ${Math.ceil(b.hp)}/${b.maxHp}`, x, y + 16, fontMono(10, 600), w ? '#60ff9c' : '#ece7ff', 'right');
  },
  // the panel
  panel(force) {
    const open = force ?? !(this.box && !this.box.hidden);
    if (!open) { if (this.box) this.box.hidden = true; return; }
    if (!this.on || !this.L) return;
    if (!this.box) { this.box = el('aside', 'bench'); document.body.append(this.box); }
    this.build(); this.box.hidden = false;
  },
  build() {
    const L = this.L, B = this.box, V = this.v; B.innerHTML = '';
    const top = el('div', 'lab-top'), h = el('h3', '', L.panel), x = el('button', 'icon-btn', L.close);
    x.addEventListener('click', () => this.panel(false)); top.append(h, x); B.append(top, el('p', '', L.note));
    let sec;
    const head = t => { B.append(el('div', 'lab-h', t)); sec = el('div', 'chips'); B.append(sec); };
    const chip = (t, fn, get) => { const b = el('button', 'chip' + (get ? '' : ' sel'), t); const sync = () => get && b.setAttribute('aria-pressed', String(!!get())); sync(); b.addEventListener('click', () => { fn(); sync(); b.blur(); }); sec.append(b); return b; };
    const tog = (t, k, obj = V, after) => chip(t, () => { obj[k] = !obj[k]; if (after) after(); }, () => obj[k]);
    const slider = (t, min, max, step, get, set) => { const w = el('label', 'bench-row'), i = el('input'), o = el('b', '', String(get())); Object.assign(i, { type: 'range', min, max, step, value: get() }); i.addEventListener('input', () => { set(+i.value); o.textContent = (+i.value).toFixed(2); }); w.append(el('span', '', t), i, o); sec.append(w); };
    const select = (opts, cur) => { const s = el('select'); for (const [v, t] of opts) { const o = el('option', '', t); o.value = v; o.selected = v === cur; s.append(o); } return s; };
    const row = (t, ...kids) => { const w = el('div', 'bench-row'); if (t) w.append(el('span', '', t)); w.append(...kids); sec.append(w); return w; };
    const btn = (t, fn) => { const b = el('button', 'icon-btn', t); b.addEventListener('click', () => { fn(); b.blur(); }); return b; };
    const num = (v, min, max) => { const i = el('input'); Object.assign(i, { type: 'number', min, max, value: v }); return i; };
    const remod = () => Mods.compute();
    // player
    head(L.sec[0]);
    tog(L.god, 'god'); tog(L.coh, 'coh');
    const lv = num(Game.lives, 0, 99); row(L.lives, lv, btn(L.set, () => { Game.lives = clamp(+lv.value | 0, 0, 99); }));
    const cs = select([1, 2, 3, 4, 5, 6, 7, 8].map(q => [q, String(1 << q)]), Player.nq || 1); row(L.cats, cs, btn(L.set, () => this.setCats(+cs.value)));
    for (const k of ['H', 'T', 'F', 'E', 'S', 'C']) chip(PICKUP_GLYPH[k], () => Game.collect({ kind: k, x: Player.x, y: Player.y }));
    const ps = select(PERKS.map(p => [p.id, p.name])); row(L.disc, ps, btn(L.give, () => { Mods.take(ps.value); UI.toast(PERK[ps.value].name); }));
    const ss = select(Object.entries(SCHOOLS).map(([k, s]) => [k, s.name]), Mods.school); row(L.school, ss, btn(L.set, () => { Mods.on = true; Mods.choose(ss.value); }));
    slider(L.speed, 0.5, 3, 0.05, () => V.speed, v => { V.speed = v; remod(); });
    slider(L.fire, 0.5, 5, 0.1, () => V.fire, v => { V.fire = v; remod(); });
    slider(L.dmg, 0.5, 10, 0.1, () => V.dmg, v => { V.dmg = v; remod(); });
    // world
    head(L.sec[1]);
    const wv = num(Game.wave || 1, 1, 200), md = select([['campaign', L.mode[0]], ['endless', L.mode[1]], ['rush', L.mode[2]]], Game.variant);
    row(L.jump, wv, md, btn(L.go, () => {
      const n = clamp(+wv.value | 0, 1, 200);
      if (Game.mode === 'arcade' && Game.variant === md.value) { Game.removeBoss(); for (const e of Game.enemies) e.dead = true; Game.enemies = []; Game.spawns = []; EB.n = 0; Director.start(n); UI.resume(); }
      else UI.start(n, 'arcade', { variant: md.value, diff: Game.diffId });
      this.panel(false);
    }));
    const kinds = [...Object.keys(ET).filter(k => !['quark', 'virtual'].includes(k)).map(k => [k, ET[k].info[0]]), ['@triad', 'Quark triad'], ...BOSS_ORDER.map(k => ['boss:' + k, BOSS_DEFS[k].name])];
    const sp = select(kinds); row(L.spawn, sp, btn(L.go, () => {
      const v = sp.value, [cx, cy] = this.cursor();
      if (v.startsWith('boss:')) { Game.removeBoss(); Game.spawnBoss(v.slice(5), 0); Director.phase = 'boss'; } else Game.queueSpawn(v, cx, cy);
    }));
    const ds = select(DIFF_IDS.map(k => [k, DIFFS[k].name]), Game.diffId); row(L.diff, ds, btn(L.set, () => { Game.diffId = ds.value; Game.setDifficulty(Game.level); }));
    chip(L.kill, () => { for (const e of Game.enemies) if (!e.dead) { if (e.boss) e.hp = 0; Game.killEnemy(e, 'shot'); } });
    chip(L.clear, () => { EB.n = 0; });
    head(L.laws); for (const id of LAW_IDS) chip(LAWS[id].name, () => Anom.toggle(id), () => Anom.active(id));
    head(L.events); for (const id of EVENT_IDS) chip(EVENTS[id].name, () => Events.start(id));
    // time
    head(L.sec[2]);
    slider(L.time, 0.1, 4, 0.05, () => Game.debugSpeed ?? 1, v => { Game.debugSpeed = v; });
    chip(L.freeze, () => { Game.debugSpeed = Game.debugSpeed === 0 ? 1 : 0; }, () => Game.debugSpeed === 0);
    chip(L.step, () => { Game.stepReq = true; });
    // progress
    head(L.sec[3]);
    chip(L.unlock, () => {
      const S = Save.d; Object.assign(S.unlock, { endless: true, rush: true, nobel: true }); for (const k of DIFF_IDS) S.reached[k] = CHAPTERS.length;
      for (const k of BOSS_ORDER) S.tracks[k] = true;
      for (const [g, T] of [['skin', SKIN_COST], ['trail', TRAILS], ['pal', PALETTES]]) for (const k in T) S.cos.own[g + ':' + k] = true;
      Save.write(); UI.toast(L.done);
    });
    chip(L.cites, () => { Save.d.cites += 1000; Save.write(); UI.toast(L.done); });
    chip(L.medals, () => { Save.d.medals += 10; Save.write(); UI.toast(L.done); });
    const rk = Object.keys(Save.d.rec); if (rk.length) { const rs = select(rk.map(k => [k, k])); row(L.resetRec, rs, btn(L.reset, () => { delete Save.d.rec[rs.value]; Save.write(); UI.toast(L.done); this.build(); })); }
    const ak = ACH.filter(a => Save.d.ach[a.id]); if (ak.length) { const as = select(ak.map(a => [a.id, a.name])); row(L.resetAch, as, btn(L.reset, () => { delete Save.d.ach[as.value]; Save.write(); UI.toast(L.done); this.build(); })); }
    // testing and view
    head(L.sec[4]);
    tog(L.hit, 'hit'); tog(L.fps, 'fps', Settings); tog(L.boss, 'boss');
    slider(L.zoom, 0.35, 1.2, 0.05, () => V.zoom, v => { V.zoom = v; cam.free = v < 0.99; });
    for (const [t, k] of [[L.grid, 'gridWarp'], [L.flash, 'flashes'], [L.rot, 'camRotate'], [L.pix, 'pixelate'], [L.shake, 'shake']]) tog(t, k, Settings, saveSettings);
    chip(L.glow, () => { Settings.fx = Settings.fx > 0 ? 0 : 1; saveSettings(); }, () => Settings.fx > 0);
  },
};
