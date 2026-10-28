// ---------- photo mode: from the pause menu, the frozen moment with no HUD; move, zoom and turn the camera ----------
const Photo = {
  on: false, saved: null, drag: null, pinch: null, keys: new Set(), raf: 0, last: 0, bare: false,
  init() {
    const b = $('p-photo'); if (b) b.addEventListener('click', () => this.open());
    const on = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', e2 => { e2.stopPropagation(); fn(); }); };
    on('ph-in', () => this.zoom(1.25)); on('ph-out', () => this.zoom(0.8)); on('ph-reset', () => this.reset()); on('ph-hide', () => this.toggleBar()); on('ph-back', () => this.close());
    $('photo-bar').addEventListener('click', e => { if (this.bare) { e.stopPropagation(); e.preventDefault(); this.toggleBar(); } }, true);
    on('ph-left', () => { cam.rot -= PI / 24; }); on('ph-right', () => { cam.rot += PI / 24; });
    window.addEventListener('keydown', e => {
      if (!this.on) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.code === 'Escape' || e.code === 'KeyP') return this.close();
      if (e.code === 'KeyH') return this.toggleBar();
      if (e.code === 'KeyR') return this.reset();
      if (e.code === 'Equal' || e.code === 'NumpadAdd') return this.zoom(1.2);
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') return this.zoom(1 / 1.2);
      this.keys.add(e.code);
    }, true);
    window.addEventListener('keyup', e => { if (this.on) { this.keys.delete(e.code); e.stopImmediatePropagation(); } }, true);
    window.addEventListener('wheel', e => { if (!this.on) return; e.preventDefault(); this.zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false, capture: true });
    const ptrs = new Map();
    window.addEventListener('pointerdown', e => { if (!this.on || e.target.closest('#photo-bar')) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]); e.preventDefault(); e.stopImmediatePropagation(); }, true);
    window.addEventListener('pointermove', e => {
      if (!this.on || !ptrs.has(e.pointerId)) return;
      const [px, py] = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 1) this.pan(e.clientX - px, e.clientY - py);
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (this.pinch) this.zoom(d / this.pinch); this.pinch = d; }
      e.stopImmediatePropagation();
    }, true);
    const up = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) this.pinch = null; if (this.on) e.stopImmediatePropagation(); };
    window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true);
  },
  open() {
    if (Game.state !== 'paused') return;
    this.on = true; this.bare = false; this.keys.clear();
    this.saved = { x: cam.x, y: cam.y, zoom: cam.zoom, rot: cam.rot, free: cam.free };
    cam.free = true; cam.trauma = 0; cam.shakeX = cam.shakeY = 0;
    $('scr-pause').hidden = true; $('photo-bar').hidden = false; $('photo-bar').classList.remove('gone');
    document.body.classList.add('photo'); UI.hushToasts();
    cancelAnimationFrame(this.raf); this.last = 0; this.raf = requestAnimationFrame(t => this.tick(t));
  },
  close() {
    if (!this.on) return;
    this.on = false; Object.assign(cam, this.saved); this.keys.clear();
    $('photo-bar').hidden = true; document.body.classList.remove('photo');
    if (Game.state === 'paused') { $('scr-pause').hidden = false; const r = $('b-resume'); if (r) r.focus(); }
  },
  reset() { if (this.saved) Object.assign(cam, { x: this.saved.x, y: this.saved.y, zoom: this.saved.zoom, rot: this.saved.rot }); },
  toggleBar() { this.bare = !this.bare; $('photo-bar').classList.toggle('gone', this.bare); },
  zoom(k) { cam.zoom = clamp(cam.zoom * k, 0.3, 3.5); },
  // screen pixels to world units, undoing the camera's turn
  pan(dx, dy) { const s = (R.sw / R.cssW) / cam.zoom, c = Math.cos(-cam.rot), n = Math.sin(-cam.rot); cam.x -= (dx * c - dy * n) * s; cam.y -= (dx * n + dy * c) * s; },
  tick(t) {
    if (!this.on) return;
    const dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 0.016; this.last = t;
    const k = this.keys, v = 650 * dt;
    const mx = (k.has('KeyD') || k.has('ArrowRight')) - (k.has('KeyA') || k.has('ArrowLeft')), my = (k.has('KeyS') || k.has('ArrowDown')) - (k.has('KeyW') || k.has('ArrowUp'));
    if (mx || my) this.pan(-mx * v, -my * v);
    if (k.has('KeyQ')) cam.rot -= dt * 0.8; if (k.has('KeyE')) cam.rot += dt * 0.8;
    this.raf = requestAnimationFrame(tt => this.tick(tt));
  },
};
