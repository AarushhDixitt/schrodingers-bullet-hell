// ---------- input: keyboard, mouse, touch sticks, gamepad ----------
// Keyboard actions come from one bindings table (rebindable in Settings); edges are one-shot presses.
const BINDS_DEFAULT = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  split: ['Space', 'KeyE', 'KeyJ'], fold: ['KeyQ', 'KeyK'], focus: ['ShiftLeft', 'ShiftRight'], dash: ['AltLeft', 'AltRight'], pause: ['Escape', 'KeyP'], mute: ['KeyM'],
};
const ACTION_NAMES = { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', split: 'Split Ĥ', fold: 'Fold Ĥ†', focus: 'Focus (hold)', dash: 'Sprint (hold) / dash (tap)', pause: 'Pause', mute: 'Mute' };
// gamepad buttons (standard mapping): action → button indices
const PAD_BINDS = { split: [0, 7], fold: [1, 5], dash: [2], pause: [9] }, PAD_FOCUS = [4, 6], PAD_CODES = { 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight', 1: 'KeyB', 0: 'KeyA', 9: 'Enter' };
const PAD_NAV = { padA: 0, padB: 1, padUp: 12, padDown: 13, padLeft: 14, padRight: 15 };
const Input = {
  down: new Set(), edges: new Set(), capture: false,
  mouse: { x: 0, y: 0, has: false },
  sticks: { move: null, aim: null }, touchMode: false,
  padIndex: -1, padPrev: [], padAim: { x: 1, y: 0 }, padActive: false, padDir: null,
  lastAimDir: { x: 1, y: 0 }, touchFocus: false, touchSprint: false, recent: [],
  binds: null, byCode: new Map(),
  remember(code) { this.recent.push(code); if (this.recent.length > 11) this.recent.shift(); },
  // eight directions among the last few inputs: a face button straight after is part of the same flurry, not a menu press
  flurry() { return this.recent.slice(-11, -1).filter(c => c.startsWith('Arrow')).length >= 8; },
  focus() { return this.held('focus') || this.touchFocus || (this.pad && PAD_FOCUS.some(i => this.pad.buttons[i] && this.pad.buttons[i].pressed)); },
  sprint() { return this.held('dash') || this.touchSprint || !!(this.pad && PAD_BINDS.dash.some(i => this.pad.buttons[i] && this.pad.buttons[i].pressed)); },
  // controller rumble and phone vibration, scaled by the setting
  rumble(strong, ms = 120) {
    if (!Settings.vibrate) return;
    const k = Settings.vibAmt ?? 1;
    try { const a = this.pad && this.pad.vibrationActuator; if (a && a.playEffect && this.padActive) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: clamp(strong * k, 0, 1), weakMagnitude: clamp(strong * k * 0.6, 0, 1) }); } catch (e) { /* no rumble */ }
    try { if (this.touchMode && navigator.vibrate) navigator.vibrate(Math.round(ms * Math.min(1, strong * k + 0.2))); } catch (e) { /* no haptics */ }
  },
  setBinds(b) {
    this.binds = {}; for (const k in BINDS_DEFAULT) this.binds[k] = (b && b[k] ? b[k] : BINDS_DEFAULT[k]).slice();
    this.byCode.clear();
    for (const [act, codes] of Object.entries(this.binds)) for (const c of codes) (this.byCode.get(c) || this.byCode.set(c, []).get(c)).push(act);
  },
  held(act) { for (const c of this.binds[act]) if (this.down.has(c)) return true; return false; },
  isGameKey(code) { return this.byCode.has(code) || code === 'Tab'; },
};

function initInput(stage) {
  Input.setBinds(Settings.keys);
  window.addEventListener('keydown', e => {
    if (Input.capture && Input.isGameKey(e.code)) e.preventDefault();
    if (e.repeat) return;
    Input.down.add(e.code); Input.remember(e.code);
    if (e.code === 'Enter' && Input.flurry()) e.preventDefault();
    for (const act of Input.byCode.get(e.code) || []) Input.edges.add(act);
    Input.edges.add('any');
  }, { passive: false });
  window.addEventListener('keyup', e => { Input.down.delete(e.code); if (Input.capture && (e.code === 'AltLeft' || e.code === 'AltRight')) e.preventDefault(); }, { passive: false });
  window.addEventListener('blur', () => { Input.down.clear(); Input.sticks.move = Input.sticks.aim = null; });

  const mouse = e => { Input.touchMode = false; Input.mouse.x = e.clientX; Input.mouse.y = e.clientY; Input.mouse.has = true; };
  stage.addEventListener('contextmenu', e => e.preventDefault());
  stage.addEventListener('pointerdown', e => {
    Input.edges.add('any');
    if (e.pointerType === 'mouse') { mouse(e); if (e.button === 0) Input.edges.add('split'); if (e.button === 2) Input.edges.add('fold'); return; }
    // touch / pen → floating sticks
    if (!Input.touchMode) { Input.touchMode = true; if (typeof UI !== 'undefined') UI.onTouchDetected(); }
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    const left = Settings.lefty ? e.clientX >= innerWidth * 0.5 : e.clientX < innerWidth * 0.5;
    const s = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0 };
    const S = Input.sticks, want = left ? 'move' : 'aim', other = left ? 'aim' : 'move';
    if (!S[want]) S[want] = s; else if (!S[other]) S[other] = s;
  }, { passive: false });
  stage.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { mouse(e); return; }
    for (const s of Object.values(Input.sticks)) {
      if (!s || s.id !== e.pointerId) continue;
      s.x = e.clientX; s.y = e.clientY; s.moved = Math.max(s.moved, Math.hypot(s.x - s.ox, s.y - s.oy));
      const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy), max = 70; // floating origin follows if dragged far
      if (d > max) { s.ox = s.x - dx / d * max; s.oy = s.y - dy / d * max; }
    }
  }, { passive: true });
  const up = e => {
    for (const k of ['move', 'aim']) {
      const s = Input.sticks[k];
      if (!s || s.id !== e.pointerId) continue;
      if (k === 'aim' && e.timeStamp - s.t < 260 && s.moved < 14) Input.edges.add('split'); // quick tap on the aim side = split
      Input.sticks[k] = null;
    }
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('mouseleave', () => { Input.mouse.has = false; });
  for (const [id, edge] of [['t-split', 'split'], ['t-fold', 'fold'], ['t-dash', 'dash'], ['t-pause', 'pause'], ['b-pausebtn', 'pause']]) {
    const b = $(id); if (b) b.addEventListener('pointerdown', e => { if (TouchLayout.editing) return; e.preventDefault(); e.stopPropagation(); if (e.pointerType !== 'mouse') Input.touchMode = true; Input.edges.add(edge); Input.edges.add('any'); });
  }
  const td = $('t-dash');
  if (td) { td.addEventListener('pointerdown', () => { if (!TouchLayout.editing) Input.touchSprint = true; }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) td.addEventListener(ev, () => { Input.touchSprint = false; }); }
  const tf = $('t-focus');
  if (tf) { tf.addEventListener('pointerdown', e => { if (TouchLayout.editing) return; e.preventDefault(); e.stopPropagation(); Input.touchFocus = true; }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) tf.addEventListener(ev, () => { Input.touchFocus = false; }); }
  window.addEventListener('gamepadconnected', e => { Input.padIndex = e.gamepad.index; });
  window.addEventListener('gamepaddisconnected', e => { if (Input.padIndex === e.gamepad.index) Input.padIndex = -1; });
}

function consumeEdge(name) { const had = Input.edges.has(name); Input.edges.delete(name); return had; }
function clearEdges() { Input.edges.clear(); }

function pollPad() {
  let pad = null;
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    pad = pads[Input.padIndex] || [...pads].find(p => p && p.connected) || null;
    if (pad) Input.padIndex = pad.index;
  } catch (_) { pad = null; }
  if (!pad) { Input.padActive = false; return null; }
  Input.pad = pad;
  const btn = i => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
  const prev = Input.padPrev, edge = i => btn(i) && !prev[i], E = Input.edges;
  for (const [act, bs] of Object.entries(PAD_BINDS)) if (bs.some(edge)) E.add(act);
  if (edge(0) || edge(9)) E.add('padStart');
  for (const [k, i] of Object.entries(PAD_NAV)) if (edge(i)) E.add(k);
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  const d = Math.abs(ax) > 0.6 ? (ax > 0 ? 'padRight' : 'padLeft') : Math.abs(ay) > 0.6 ? (ay > 0 ? 'padDown' : 'padUp') : null;
  if (d && d !== Input.padDir) E.add(d); Input.padDir = d;
  for (let i = 0; i < pad.buttons.length; i++) { if (edge(i)) { E.add('any'); if (PAD_CODES[i] && Game.state !== 'playing') Input.remember(PAD_CODES[i]); } prev[i] = btn(i); }
  const dz = (x, y, z) => { const m = Math.hypot(x, y); if (m < z) return [0, 0]; const s = Math.min(1, (m - z) / (1 - z)) / m; return [x * s, y * s]; };
  const [lx, ly] = dz(ax, ay, 0.18), [rx, ry] = dz(pad.axes[2] || 0, pad.axes[3] || 0, 0.3);
  if (lx || ly || rx || ry) Input.padActive = true;
  if (rx || ry) { const m = Math.hypot(rx, ry); Input.padAim.x = rx / m; Input.padAim.y = ry / m; }
  return { lx, ly, rx, ry };
}

// Returns movement (screen-space, -1..1) and aim intent:
// {mode:'point', x, y} (screen css px) | {mode:'dir', x, y} (screen dir) | {mode:'auto'}
function readInput(autoAim) {
  const h = a => Input.held(a);
  let mx = h('right') - h('left'), my = h('down') - h('up');
  if (mx && my) { mx *= SQRT1_2; my *= SQRT1_2; }
  const pad = pollPad();
  let aim = null;
  if (pad) {
    if (pad.lx || pad.ly) { mx = pad.lx; my = pad.ly; }
    if (pad.rx || pad.ry) aim = { mode: 'dir', x: pad.rx, y: pad.ry };
    else if (Input.padActive && !Input.mouse.has) aim = autoAim ? { mode: 'auto' } : { mode: 'dir', x: Input.padAim.x, y: Input.padAim.y, held: true };
  }
  const st = (s, dead, full) => { if (!s) return null; const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy); return d > dead ? [dx / d, dy / d, Math.min(1, (d - dead) / full)] : [0, 0, 0]; };
  const ms = st(Input.sticks.move, 6, 52);
  if (ms && ms[2]) { mx = ms[0] * ms[2]; my = ms[1] * ms[2]; }
  const as = st(Input.sticks.aim, 10, 1);
  if (as) aim = as[2] ? { mode: 'dir', x: as[0], y: as[1] } : { mode: 'auto' };
  if (!aim) aim = Input.touchMode || autoAim ? { mode: 'auto' } : Input.mouse.has ? { mode: 'point', x: Input.mouse.x, y: Input.mouse.y } : { mode: 'dir', x: Input.lastAimDir.x, y: Input.lastAimDir.y, held: true };
  return { mx, my, aim, focus: Input.focus(), sprint: Input.sprint() };
}
