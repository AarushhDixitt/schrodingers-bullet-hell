// ---------- icons: thin neon line glyphs, drawn for this game (always next to text, never instead of it) ----------
const ICON_PATHS = {
  gate: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M1 12h4M19 12h4M9.5 8.5v7M14.5 8.5v7M9.5 12h5"/>',
  book: '<path d="M12 6c-2-1.6-5-2-8-1.6V18c3-.4 6 0 8 1.6M12 6c2-1.6 5-2 8-1.6V18c-3-.4-6 0-8 1.6M12 6v13.6"/>',
  notes: '<rect x="5" y="3" width="12" height="18" rx="1.5"/><path d="M8.5 3v18M3.5 7h3M3.5 12h3M3.5 17h3"/><path d="M21 6.5l-5.6 9.4-1.7 1 .2-1.9 5.6-9.4z"/>',
  dial: '<circle cx="12" cy="13" r="8"/><path d="M12 13l4-4M12 5v2M4 13h2M18 13h2M6.4 7.4l1.4 1.4M17.6 7.4l-1.4 1.4"/>',
  catbox: '<path d="M3 11h18v9H3z"/><path d="M6.5 11V6.5l3 2.5h5l3-2.5V11"/><path d="M10 9.8v.4M14 9.8v.4"/>',
  rush: '<path d="M7 3L3 12l4 9M17 3l4 9-4 9"/><path d="M8.5 10.5a3.5 3.5 0 017 0c0 1.6-.8 2.5-1.6 3v1.8h-3.8v-1.8c-.8-.5-1.6-1.4-1.6-3z"/><path d="M10.6 10.6v.2M13.4 10.6v.2"/>',
  infinity: '<path d="M12 12c-2-3-4-4.5-6-4.5a4.5 4.5 0 000 9c2 0 4-1.5 6-4.5zm0 0c2 3 4 4.5 6 4.5a4.5 4.5 0 000-9c-2 0-4 1.5-6 4.5z"/>',
  flow: '<rect x="2.5" y="3" width="7" height="5" rx="1"/><rect x="14.5" y="3" width="7" height="5" rx="1"/><rect x="8.5" y="16" width="7" height="5" rx="1"/><path d="M6 8v3.5h12V8M12 11.5V16"/>',
  flask: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.6 1.6 0 005.9 21h12.2a1.6 1.6 0 001.4-2.5L14 9V3"/><path d="M7.4 15h9.2"/>',
  seal: '<path d="M12 2l2 2.2 3-.6.6 3 2.7 1.4-1.2 2.8 1.2 2.8-2.7 1.4-.6 3-3-.6L12 20l-2-2.2-3 .6-.6-3-2.7-1.4 1.2-2.8-1.2-2.8 2.7-1.4.6-3 3 .6z"/><path d="M9.3 8.6v1.8a2.7 2.7 0 005.4 0V8.6M12 8v7.6"/>',
  cite: '<path d="M8 4H5v16h3M16 4h3v16h-3"/><path d="M10.6 9.2L12.6 8v8.5"/>',
  medal: '<path d="M12 2.5l7.5 4.3v8.6L12 19.7l-7.5-4.3V6.8z"/><path d="M12 7.5l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z"/>',
  cap: '<path d="M2 9l10-4 10 4-10 4z"/><path d="M6 10.6V15c3 2 9 2 12 0v-4.4M21 9.5v5"/>',
  console: '<rect x="3" y="4" width="18" height="14" rx="1.5"/><path d="M7 9l3 2.5L7 14M12.5 14h4.5M8 21h8"/>',
  risk: '<path d="M12 3l9.5 16.5h-19z"/><path d="M12 9.5v4.5M12 16.6v.4"/>',
  anomaly: '<circle cx="12" cy="12" r="8.5"/><path d="M12 12c0-3.2 2.2-5.3 5.3-5.3M12 12c0 3.2-2.2 5.3-5.3 5.3"/><circle cx="12" cy="12" r="1.2"/>',
  review: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8.5 13l2.5 2.5 5-5.5"/>',
  conf: '<circle cx="8" cy="8.5" r="3"/><circle cx="16" cy="8.5" r="3"/><path d="M2.5 20c0-3.2 2.4-5.5 5.5-5.5s5.5 2.3 5.5 5.5M10.5 20c0-3.2 2.4-5.5 5.5-5.5s5.5 2.3 5.5 5.5"/>',
  start: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5"/>',
  fund: '<ellipse cx="12" cy="6.5" rx="7" ry="2.8"/><path d="M5 6.5v4c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-4M5 10.5v4c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-4M5 14.5v3c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-3"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7l1.5-3h4l1.5 3"/><circle cx="12" cy="13.5" r="3.6"/>',
  restart: '<path d="M4.5 12a7.5 7.5 0 102.2-5.3"/><path d="M4 4v4.5h4.5"/>',
  exit: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  lineage: '<path d="M12 3v5M12 8l-6 5M12 8l6 5M6 13v4M18 13v4"/><circle cx="12" cy="3.5" r="1.4"/><circle cx="6" cy="18.5" r="1.6"/><circle cx="18" cy="18.5" r="1.6"/>',
};
function icon(name, cls = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', ('ico ' + cls).trim()); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICON_PATHS[name] || '';
  return s;
}
// put an icon in front of an element's text (once)
function withIcon(target, name) { const e = typeof target === 'string' ? $(target) : target; if (!e || e.querySelector(':scope > svg.ico')) return; e.prepend(icon(name)); }

// the same icons on a canvas (the HUD): paths, circles, ellipses and rects from the SVG strings, stroked
const ICON_P2D = {};
function canvasIcon(c, name, x, y, size, col) {
  let parts = ICON_P2D[name];
  if (!parts) {
    parts = ICON_P2D[name] = []; const src = ICON_PATHS[name] || '', num = (t, a) => +((t.match(new RegExp('(?:^|\\s)' + a + '="([-\\d.]+)"')) || [0, 0])[1]);
    for (const m of src.matchAll(/<(path|circle|ellipse|rect)([^>]*)>/g)) {
      const [, tag, t] = m, P = new Path2D();
      if (tag === 'path') P.addPath(new Path2D((t.match(/d="([^"]+)"/) || [0, ''])[1]));
      else if (tag === 'circle') P.arc(num(t, 'cx'), num(t, 'cy'), num(t, 'r'), 0, TAU);
      else if (tag === 'ellipse') P.ellipse(num(t, 'cx'), num(t, 'cy'), num(t, 'rx'), num(t, 'ry'), 0, 0, TAU);
      else P.rect(num(t, 'x'), num(t, 'y'), num(t, 'width'), num(t, 'height'));
      parts.push(P);
    }
  }
  c.save(); c.translate(x, y); c.scale(size / 24, size / 24); c.strokeStyle = col; c.lineWidth = 1.7; c.lineCap = c.lineJoin = 'round';
  for (const P of parts) c.stroke(P);
  c.restore();
}
