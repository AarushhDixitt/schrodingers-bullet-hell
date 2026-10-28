// ---------- speedrun splits: time per wave, against your personal best and your best ever (gold) ----------
// Saved per mode, difficulty and starting wave. The PB is the run that got furthest, fastest.
const Splits = {
  key() { return `${Game.variant}:${Game.diffId}:${Game.stats.startWave}`; },
  rec() { const S = Save.d.splits, k = this.key(); return S[k] || (S[k] = { gold: {}, pb: {}, waves: 0, total: 0 }); },
  wave(n, t) {
    const st = Game.stats; if (st.waveTimes.some(w => w.n === n)) return;
    const cum = (st.waveTimes.length ? st.waveTimes[st.waveTimes.length - 1].cum : 0) + t, r = Game.counts() ? this.rec() : null;
    const w = { n, t, cum, gold: false, d: null };
    if (r) { if (r.pb[n] !== undefined) w.d = cum - r.pb[n]; if (!r.gold[n] || t < r.gold[n]) { w.gold = !!r.gold[n]; r.gold[n] = t; if (w.gold) Ach.unlock('gold'); } }
    st.waveTimes.push(w);
  },
  // at the end of a run: keep it as the PB if it went further, or as far but faster
  finish() {
    const st = Game.stats, L = st.waveTimes; if (!Game.counts() || !L.length) return false;
    const r = this.rec(), last = L[L.length - 1];
    if (L.length > r.waves || L.length === r.waves && last.cum < r.total) { r.waves = L.length; r.total = last.cum; r.pb = {}; for (const w of L) r.pb[w.n] = w.cum; return true; }
    return false;
  },
  shown() { return Settings.splits && Game.mode === 'arcade' && !!Director.def; },
  // the top edge of the panel (the feed sits above it)
  top(B) { return this.shown() ? B - (Math.min(5, Game.stats.waveTimes.length) + 2) * 17 - 24 : B; },
  draw(c, Rr, B) {
    if (!this.shown()) return;
    const L = Game.stats.waveTimes.slice(-5), w = 200, lh = 17, now = Game.stats.time - (Director.t0 || 0), r = Game.counts() ? this.rec() : null;
    const rows = L.length + 2, y0 = B - rows * lh - 10, x0 = Rr - w;
    c.fillStyle = 'rgba(12,10,24,.6)'; c.fillRect(x0 - 8, y0 - 14, w + 16, rows * lh + 16);
    const row = (i, a, b, d, col) => { const y = y0 + i * lh; txt(c, a, x0, y, fontMono(11, 600), COLS.dim); txt(c, b, x0 + 110, y, fontMono(11, 600), COLS.chalk, 'right'); if (d) txt(c, d, Rr, y, fontMono(11, 700), col, 'right'); };
    const dd = d => d === null ? ['', COLS.dim] : [(d <= 0 ? '−' : '+') + Math.abs(d).toFixed(1), d <= 0 ? '#60ff9c' : '#ff3b55'];
    L.forEach((s, i) => { const [t, col] = dd(s.d); row(i, 'WAVE ' + s.n, fmtSplit(s.t), s.gold ? '★ ' + (t || 'gold') : t, s.gold ? '#ffcf4a' : col); });
    const n = Director.def.n, pbAt = r && r.pb[n] !== undefined ? r.pb[n] : null, cur = (L.length ? L[L.length - 1].cum : 0) + now;
    const [t, col] = dd(pbAt === null || Director.phase === 'clear' ? null : cur - pbAt);
    row(L.length, '▸ WAVE ' + n, fmtSplit(now), t, col);
    row(L.length + 1, 'TOTAL', fmtSplit(Game.stats.time), r && r.total ? 'PB ' + fmtSplit(r.total) : '', COLS.dim);
  },
};
