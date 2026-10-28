// ---------- touch button layout: players drag Ĥ, Ĥ† and ◎ wherever their thumbs want them ----------
// Positions are stored as fractions of the screen (button centres), mirrored for left-handed play,
// and clamped on screen so a rotated phone never loses a button.
const TB_IDS = ['t-split', 't-fold', 't-focus', 't-dash'];
const TouchLayout = {
  editing: false, drag: null, wasHidden: true, from: null,
  init() {
    window.addEventListener('resize', () => this.apply());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.apply());
    for (const id of TB_IDS) {
      const b = $(id);
      b.addEventListener('pointerdown', e => this.down(e, b), true);
      b.addEventListener('pointermove', e => this.move(e));
      b.addEventListener('pointerup', e => this.up(e));
      b.addEventListener('pointercancel', e => this.up(e));
    }
    $('be-done').addEventListener('click', () => this.close());
    $('be-reset').addEventListener('click', () => { Settings.btnPos = null; Settings.btnSize = 1; $('be-size').value = 50; saveSettings(); this.apply(); });
    $('be-size').addEventListener('input', e => { Settings.btnSize = 0.7 + 0.7 * e.target.value / 100; this.apply(); });
    this.apply();
  },
  size() { return clamp(Settings.btnSize || 1, 0.7, 1.4); },
  apply() {
    const W = innerWidth, H = innerHeight, s = this.size();
    for (const id of TB_IDS) {
      const b = $(id), p = Settings.btnPos && Settings.btnPos[id];
      if (!p) { b.style.left = b.style.top = b.style.right = b.style.bottom = ''; b.style.transform = s !== 1 ? 'scale(' + s + ')' : ''; continue; }
      const r = (id === 't-focus' || id === 't-dash' ? 29 : 38) * s + 6, fx = Settings.lefty ? 1 - p[0] : p[0];
      const x = clamp(fx * W, r, W - r), y = clamp(p[1] * H, r + 50, H - r - 14); // keep clear of the pause button row and the edges
      Object.assign(b.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto', transform: 'translate(-50%,-50%) scale(' + s + ')' });
    }
  },
  open(from) {
    this.editing = true; this.from = from || null;
    if (from) $(from).hidden = true;
    this.wasHidden = $('touch').hidden; $('touch').hidden = false;
    document.body.classList.add('btnedit'); $('btn-edit').hidden = false;
    $('be-size').value = Math.round((this.size() - 0.7) / 0.7 * 100);
    this.apply();
  },
  close() {
    this.editing = false; this.drag = null;
    document.body.classList.remove('btnedit'); $('btn-edit').hidden = true;
    $('touch').hidden = this.wasHidden; saveSettings(); clearEdges(); Input.touchFocus = false;
    if (this.from) { $(this.from).hidden = false; this.from = null; }
  },
  down(e, b) {
    if (!this.editing) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    const rc = b.getBoundingClientRect();
    this.drag = { b, id: e.pointerId, dx: e.clientX - (rc.left + rc.width / 2), dy: e.clientY - (rc.top + rc.height / 2) };
    // the first drag turns the default layout into a custom one, so every button keeps its place
    if (!Settings.btnPos) {
      Settings.btnPos = {};
      for (const id of TB_IDS) { const q = $(id).getBoundingClientRect(), cx = (q.left + q.width / 2) / innerWidth; Settings.btnPos[id] = [Settings.lefty ? 1 - cx : cx, (q.top + q.height / 2) / innerHeight]; }
    }
  },
  move(e) {
    const d = this.drag; if (!d || d.id !== e.pointerId) return;
    const cx = (e.clientX - d.dx) / innerWidth, cy = (e.clientY - d.dy) / innerHeight;
    Settings.btnPos[d.b.id] = [Settings.lefty ? 1 - cx : cx, cy];
    this.apply();
  },
  up(e) {
    const d = this.drag; if (!d || d.id !== e.pointerId) return;
    this.drag = null; saveSettings();
  },
  // top edge (CSS px) of the highest button that reaches into the strip right of x — the feed stacks above it
  topRightOf(x) {
    let top = Infinity;
    if (!$('touch').hidden) for (const id of TB_IDS) { const q = $(id).getBoundingClientRect(); if (q.width && q.right > x && q.top < top) top = q.top; }
    const t = $('toast'); // a hint card on a narrow screen spans the corner too
    if (t.classList.contains('on')) { const q = t.getBoundingClientRect(); if (q.right > x && q.top < top) top = q.top; }
    return top;
  },
};
