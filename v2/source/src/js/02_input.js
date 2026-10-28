// ---------- input: keyboard, mouse, touch sticks, gamepad ----------
const Input = {
  down: new Set(),
  edges: new Set(),
  capture: false, // prevent default on game keys while playing
  mouse: { x: 0, y: 0, has: false, lastMove: -1e9 },
  sticks: { move: null, aim: null },
  touchMode: false,
  padIndex: -1, padPrev: [], padAim: { x: 1, y: 0 }, padActive: false,
  lastAimDir: { x: 1, y: 0 },
};
const KEY_SPLIT = new Set(['Space', 'KeyE', 'KeyJ']);
const KEY_FOLD = new Set(['ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyK']);
const KEY_PAUSE = new Set(['Escape', 'KeyP']);
const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'Tab']);

function initInput(stage) {
  window.addEventListener('keydown', e => {
    if (Input.capture && GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    Input.down.add(e.code);
    if (KEY_SPLIT.has(e.code)) Input.edges.add('split');
    if (KEY_FOLD.has(e.code)) Input.edges.add('fold');
    if (KEY_PAUSE.has(e.code)) Input.edges.add('pause');
    if (e.code === 'KeyM') Input.edges.add('mute');
    if (e.code === 'Backquote') Input.edges.add('debug');
    Input.edges.add('any');
  }, { passive: false });
  window.addEventListener('keyup', e => { Input.down.delete(e.code); });
  window.addEventListener('blur', () => { Input.down.clear(); Input.sticks.move = Input.sticks.aim = null; });

  stage.addEventListener('contextmenu', e => e.preventDefault());
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') {
      Input.touchMode = false;
      Input.mouse.x = e.clientX; Input.mouse.y = e.clientY; Input.mouse.has = true; Input.mouse.lastMove = performance.now();
      if (e.button === 0) Input.edges.add('split');
      if (e.button === 2) Input.edges.add('fold');
      Input.edges.add('any');
      return;
    }
    // touch / pen → floating sticks
    if (!Input.touchMode) { Input.touchMode = true; if (typeof UI !== 'undefined') UI.onTouchDetected(); }
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    const left = Settings.lefty ? e.clientX >= window.innerWidth * 0.5 : e.clientX < window.innerWidth * 0.5;
    const s = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0 };
    if (left && !Input.sticks.move) Input.sticks.move = s;
    else if (!left && !Input.sticks.aim) Input.sticks.aim = s;
    else if (!Input.sticks.move) Input.sticks.move = s;
    else if (!Input.sticks.aim) Input.sticks.aim = s;
    Input.edges.add('any');
  }, { passive: false });
  stage.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') {
      Input.mouse.x = e.clientX; Input.mouse.y = e.clientY; Input.mouse.has = true; Input.mouse.lastMove = performance.now();
      return;
    }
    for (const k of ['move', 'aim']) {
      const s = Input.sticks[k];
      if (s && s.id === e.pointerId) {
        s.x = e.clientX; s.y = e.clientY; s.moved = Math.max(s.moved, Math.hypot(s.x - s.ox, s.y - s.oy));
        // floating origin follows if dragged far
        const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy), max = 70;
        if (d > max) { s.ox = s.x - dx / d * max; s.oy = s.y - dy / d * max; }
      }
    }
  }, { passive: true });
  const up = e => {
    for (const k of ['move', 'aim']) {
      const s = Input.sticks[k];
      if (s && s.id === e.pointerId) {
        // quick tap on aim side = split
        if (k === 'aim' && e.timeStamp - s.t < 260 && s.moved < 14) Input.edges.add('split');
        Input.sticks[k] = null;
      }
    }
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('mouseleave', () => { Input.mouse.has = false; });

  const tb = (id, edge) => {
    const el = $(id); if (!el) return;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Input.touchMode = true; Input.edges.add(edge); Input.edges.add('any'); });
  };
  tb('t-split', 'split'); tb('t-fold', 'fold'); tb('t-pause', 'pause');

  window.addEventListener('gamepadconnected', e => { Input.padIndex = e.gamepad.index; });
  window.addEventListener('gamepaddisconnected', e => { if (Input.padIndex === e.gamepad.index) Input.padIndex = -1; });
}

function consumeEdge(name) { const had = Input.edges.has(name); Input.edges.delete(name); return had; }
function clearEdges() { Input.edges.clear(); }

function pollPad() {
  let pad = null;
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (Input.padIndex >= 0 && pads[Input.padIndex]) pad = pads[Input.padIndex];
    else for (const p of pads) if (p && p.connected) { pad = p; Input.padIndex = p.index; break; }
  } catch (_) { pad = null; }
  if (!pad) { Input.padActive = false; return null; }
  const btn = i => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
  const prev = Input.padPrev;
  const edge = i => btn(i) && !prev[i];
  if (edge(0) || edge(5) || edge(7)) Input.edges.add('split');
  if (edge(1) || edge(4) || edge(6)) Input.edges.add('fold');
  if (edge(9)) Input.edges.add('pause');
  if (edge(0) || edge(9)) Input.edges.add('padStart');
  // menu navigation
  if (edge(0)) Input.edges.add('padA'); if (edge(1)) Input.edges.add('padB');
  if (edge(12)) Input.edges.add('padUp'); if (edge(13)) Input.edges.add('padDown'); if (edge(14)) Input.edges.add('padLeft'); if (edge(15)) Input.edges.add('padRight');
  { const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0, d = Math.abs(ax) > 0.6 ? (ax > 0 ? 'padRight' : 'padLeft') : Math.abs(ay) > 0.6 ? (ay > 0 ? 'padDown' : 'padUp') : null; if (d && d !== Input.padDir) Input.edges.add(d); Input.padDir = d; }
  for (let i = 0; i < pad.buttons.length; i++) { if (edge(i)) Input.edges.add('any'); prev[i] = btn(i); }
  const dz = (x, y, d) => { const m = Math.hypot(x, y); if (m < d) return [0, 0]; const s = Math.min(1, (m - d) / (1 - d)) / m; return [x * s, y * s]; };
  const [lx, ly] = dz(pad.axes[0] || 0, pad.axes[1] || 0, 0.18);
  const [rx, ry] = dz(pad.axes[2] || 0, pad.axes[3] || 0, 0.3);
  if (lx || ly || rx || ry) Input.padActive = true;
  if (rx || ry) { const m = Math.hypot(rx, ry); Input.padAim.x = rx / m; Input.padAim.y = ry / m; }
  return { lx, ly, rx, ry };
}

// Returns movement (screen-space, -1..1) and aim intent.
function readInput(autoAimSetting) {
  const k = Input.down;
  let mx = 0, my = 0;
  if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
  if (k.has('KeyW') || k.has('ArrowUp')) my -= 1;
  if (k.has('KeyS') || k.has('ArrowDown')) my += 1;
  if (mx && my) { mx *= SQRT1_2; my *= SQRT1_2; }

  const pad = pollPad();
  let aim = null; // {mode:'point', x, y} (screen css px) | {mode:'dir', x, y} (screen dir) | {mode:'auto'}
  if (pad) {
    if (pad.lx || pad.ly) { mx = pad.lx; my = pad.ly; }
    if (pad.rx || pad.ry) aim = { mode: 'dir', x: pad.rx, y: pad.ry };
    else if (Input.padActive && !Input.mouse.has) aim = autoAimSetting ? { mode: 'auto' } : { mode: 'dir', x: Input.padAim.x, y: Input.padAim.y, held: true };
  }
  const ms = Input.sticks.move;
  if (ms) {
    const dx = ms.x - ms.ox, dy = ms.y - ms.oy, d = Math.hypot(dx, dy);
    if (d > 6) { const m = Math.min(1, (d - 6) / 52); mx = dx / d * m; my = dy / d * m; }
  }
  const as = Input.sticks.aim;
  if (as) {
    const dx = as.x - as.ox, dy = as.y - as.oy, d = Math.hypot(dx, dy);
    if (d > 10) aim = { mode: 'dir', x: dx / d, y: dy / d };
    else aim = { mode: 'auto' };
  }
  if (!aim) {
    if (Input.touchMode) aim = { mode: 'auto' };
    else if (autoAimSetting) aim = { mode: 'auto' };
    else if (Input.mouse.has) aim = { mode: 'point', x: Input.mouse.x, y: Input.mouse.y };
    else aim = { mode: 'dir', x: Input.lastAimDir.x, y: Input.lastAimDir.y, held: true };
  }
  return { mx, my, aim };
}
