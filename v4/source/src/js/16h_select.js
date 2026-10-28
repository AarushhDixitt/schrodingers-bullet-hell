// ---------- dropdowns and sliders in the game's own style ----------
// Every <select> gets a neon button and list in place of the browser's own (the select stays underneath and still fires 'change').
// Every range slider gets a filled track, kept in step through a CSS variable.
const Dropdowns = {
  list: null, sel: null, btn: null, hi: 0,
  init() {
    const scan = root => { for (const s of root.querySelectorAll ? root.querySelectorAll('select') : []) this.enhance(s); for (const r of root.querySelectorAll ? root.querySelectorAll('input[type=range]') : []) fillRange(r); };
    scan(document);
    new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.tagName === 'SELECT') this.enhance(n); else if (n.tagName === 'INPUT' && n.type === 'range') fillRange(n); else scan(n); } }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('input', e => { if (e.target.type === 'range') fillRange(e.target); }, true);
    document.addEventListener('pointerdown', e => { if (this.list && !this.list.contains(e.target) && e.target !== this.btn) this.close(); }, true);
    window.addEventListener('resize', () => this.close());
    document.addEventListener('scroll', e => { if (this.list && !this.list.contains(e.target)) this.close(); }, true);
  },
  enhance(sel) {
    if (sel.dataset.dd) return; sel.dataset.dd = '1';
    const wrap = document.createElement('span'); wrap.className = 'dd';
    sel.parentNode.insertBefore(wrap, sel); wrap.append(sel); sel.classList.add('dd-native'); sel.tabIndex = -1;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dd-btn'; btn.setAttribute('aria-haspopup', 'listbox');
    if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
    wrap.append(btn);
    const label = () => { const o = sel.options[sel.selectedIndex]; btn.textContent = o ? o.textContent : '—'; btn.disabled = sel.disabled; };
    label(); sel.addEventListener('change', label);
    new MutationObserver(label).observe(sel, { childList: true, subtree: true, attributes: true });
    btn.addEventListener('click', e => { e.stopPropagation(); if (this.sel === sel) this.close(); else { label(); this.open(sel, btn); } });
    btn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (this.sel !== sel) this.open(sel, btn); else this.move(e.key === 'ArrowDown' ? 1 : -1); } });
  },
  open(sel, btn) {
    this.close(); this.sel = sel; this.btn = btn; this.hi = Math.max(0, sel.selectedIndex);
    const ul = document.createElement('ul'); ul.className = 'dd-list'; ul.setAttribute('role', 'listbox');
    [...sel.options].forEach((o, i) => {
      const li = document.createElement('li'); li.textContent = o.textContent; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sel.selectedIndex));
      if (o.disabled) li.className = 'off'; li.addEventListener('pointerenter', () => this.mark(i)); li.addEventListener('click', e => { e.stopPropagation(); if (!o.disabled) this.pick(i); });
      ul.append(li);
    });
    document.body.append(ul); this.list = ul; btn.classList.add('open');
    const r = btn.getBoundingClientRect(), h = Math.min(ul.scrollHeight, 320), below = innerHeight - r.bottom - 8;
    Object.assign(ul.style, { left: Math.min(r.left, innerWidth - Math.max(r.width, ul.offsetWidth) - 8) + 'px', minWidth: r.width + 'px', maxHeight: '320px', top: (below >= h || below > r.top ? r.bottom + 4 : Math.max(8, r.top - h - 4)) + 'px' });
    this.mark(this.hi); ul.children[this.hi] && ul.children[this.hi].scrollIntoView({ block: 'nearest' });
    this.keys = e => {
      if (!this.list) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); this.move(e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.pick(this.hi); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.close(); btn.focus(); }
      else if (e.key === 'Tab') this.close();
    };
    window.addEventListener('keydown', this.keys, true);
  },
  mark(i) { this.hi = i; if (!this.list) return; [...this.list.children].forEach((li, j) => li.classList.toggle('hi', j === i)); },
  move(d) { if (!this.list) return; const n = this.list.children.length; this.mark((this.hi + d + n) % n); this.list.children[this.hi].scrollIntoView({ block: 'nearest' }); },
  pick(i) {
    if (this.sel && this.sel.options[i] && this.sel.options[i].disabled) return;
    const sel = this.sel, btn = this.btn; this.close(); if (!sel) return;
    if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    btn.focus();
  },
  close() {
    if (this.list) this.list.remove(); if (this.btn) this.btn.classList.remove('open');
    if (this.keys) window.removeEventListener('keydown', this.keys, true);
    this.list = this.sel = this.keys = null;
  },
};
// the filled part of a slider's track, as a CSS variable
function fillRange(r) { const lo = +r.min || 0, hi = r.max === '' ? 100 : +r.max, f = hi > lo ? ((+r.value - lo) / (hi - lo)) * 100 : 0; r.style.setProperty('--fill', f.toFixed(1) + '%'); }
