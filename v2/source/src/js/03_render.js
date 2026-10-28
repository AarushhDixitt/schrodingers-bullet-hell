// ---------- renderer: 2D scene canvas → WebGL post (bloom, lensing, glitch) ----------
const R = {
  view: null, hud: null, scene: null, ctx: null, hctx: null, post: null,
  cssW: 1, cssH: 1, dpr: 1, sw: 1, sh: 1, hw: 1, hh: 1, rs: 1, hs: 1,
  quality: 'auto', dyn: 1, insets: { t: 0, r: 0, b: 0, l: 0 },
  frameMs: 16, slowFrames: 0, fastFrames: 0,
};
const QUALITY_PX = { high: 3.4e6, medium: 1.9e6, low: 0.95e6, auto: 3.4e6 };

const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}';
const FS_DOWN = `precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 tx;uniform float th;uniform float kn;
void main(){vec3 c=texture2D(t,v+tx*vec2(-.5,-.5)).rgb+texture2D(t,v+tx*vec2(.5,-.5)).rgb+texture2D(t,v+tx*vec2(-.5,.5)).rgb+texture2D(t,v+tx*vec2(.5,.5)).rgb;c*=.25;
float br=max(c.r,max(c.g,c.b));float s=clamp(br-th+kn,0.,2.*kn);s=s*s/(4.*kn+1e-4);float k=max(s,br-th)/max(br,1e-4);gl_FragColor=vec4(c*k,1.);}`;
const FS_BLUR = `precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 d;
void main(){vec3 c=texture2D(t,v).rgb*.2270270270;c+=texture2D(t,v+d*1.3846153846).rgb*.3162162162;c+=texture2D(t,v-d*1.3846153846).rgb*.3162162162;
c+=texture2D(t,v+d*3.2307692308).rgb*.0702702703;c+=texture2D(t,v-d*3.2307692308).rgb*.0702702703;gl_FragColor=vec4(c,1.);}`;
const FS_COMP = `precision highp float;varying vec2 v;
uniform sampler2D sc,b1,b2;uniform vec2 res;uniform float asp,time,bloom,ca,glitch,pix,post,inv,vig,grain,scan,sat,rew,flashA;uniform vec3 flashC;
uniform vec4 lens[4];uniform vec4 rip[4];
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec2 uv=v;
 if(rew>0.){float band=step(.965,fract(uv.y*2.3+time*1.7));uv.x+=(sin(uv.y*38.+time*31.)*.0035+band*.03*(h(vec2(floor(time*30.),floor(uv.y*90.)))-.5))*rew;uv.y+=sin(time*13.)*.002*rew;}
 if(glitch>0.){float sl=floor(uv.y*26.);float n=h(vec2(sl,floor(time*20.)));if(n<glitch*.55)uv.x+=(h(vec2(sl,floor(time*37.)))-.5)*.14*glitch;}
 if(pix>1.){vec2 b=pix/res;uv=(floor(uv/b)+.5)*b;}
 vec2 p=vec2(uv.x*asp,uv.y);float hole=0.;
 for(int i=0;i<4;i++){vec4 L=lens[i];if(L.z>0.){vec2 c=vec2(L.x*asp,L.y);vec2 d=p-c;float r2=dot(d,d)+1e-6;if(r2<L.w*L.w)hole=1.;p-=L.z*L.z*d/r2;}}
 for(int i=0;i<4;i++){vec4 Q=rip[i];if(Q.w!=0.){vec2 c=vec2(Q.x*asp,Q.y);vec2 d=p-c;float r=length(d)+1e-5;float x=(r-Q.z)/.055;if(abs(x)<1.)p-=d/r*Q.w*sin(x*3.14159)*(1.-abs(x));}}
 vec2 du=vec2(p.x/asp,p.y);
 vec2 cd=du-.5;float cam=ca+glitch*.01;
 vec3 col;col.r=texture2D(sc,du+cd*cam).r;col.g=texture2D(sc,du).g;col.b=texture2D(sc,du-cd*cam).b;
 col+=(texture2D(b1,du).rgb*.85+texture2D(b2,du).rgb*1.15)*bloom;
 if(hole>.5)col=vec3(0.);
 float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,sat);
 if(post>0.)col=floor(col*post+.15)/post;
 col=mix(col,vec3(1.)-col,inv);
 col+=flashC*flashA;
 vec2 q=v-.5;col*=1.-vig*dot(q,q)*1.5;
 col*=1.-scan*(.5+.5*sin(gl_FragCoord.y*3.14159));
 col+=(h(gl_FragCoord.xy+fract(time)*61.)-.5)*grain;
 gl_FragColor=vec4(col,1.);
}`;

class PostFX {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: !!window.__QCAT_PRESERVE, powerPreference: 'high-performance' });
    if (!gl) throw new Error('no webgl');
    this.gl = gl;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = fs => {
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, info.name); }
      return { p, u };
    };
    this.down = prog(FS_DOWN); this.blur = prog(FS_BLUR); this.comp = prog(FS_COMP);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.sceneTex = this.tex();
    this.t = {};
    this.lensArr = new Float32Array(16); this.ripArr = new Float32Array(16);
    this.w = 0; this.h = 0;
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; }, false);
  }
  tex() {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  target(w, h) {
    const gl = this.gl; const tex = this.tex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, w, h };
  }
  resize(w, h) {
    if (w === this.w && h === this.h) return;
    const gl = this.gl;
    for (const k in this.t) { gl.deleteTexture(this.t[k].tex); gl.deleteFramebuffer(this.t[k].fb); }
    this.w = w; this.h = h;
    const q = (n) => [Math.max(1, Math.ceil(w / n)), Math.max(1, Math.ceil(h / n))];
    this.t.half = this.target(...q(2));
    this.t.qa = this.target(...q(4)); this.t.qb = this.target(...q(4));
    this.t.ea = this.target(...q(8)); this.t.eb = this.target(...q(8));
  }
  pass(prog, src, dst, setU) {
    const gl = this.gl;
    gl.useProgram(prog.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
    gl.viewport(0, 0, dst ? dst.w : gl.drawingBufferWidth, dst ? dst.h : gl.drawingBufferHeight);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src);
    if (prog.u.t) gl.uniform1i(prog.u.t, 0);
    setU && setU(gl, prog.u);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  render(src, P) {
    if (this.lost) return;
    const gl = this.gl;
    const sw = src.width, sh = src.height;
    this.resize(sw, sh);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    const T = this.t;
    this.pass(this.down, this.sceneTex, T.half, (gl, u) => { gl.uniform2f(u.tx, 1 / sw, 1 / sh); gl.uniform1f(u.th, P.thresh); gl.uniform1f(u.kn, 0.25); });
    this.pass(this.down, T.half.tex, T.qa, (gl, u) => { gl.uniform2f(u.tx, 1 / T.half.w, 1 / T.half.h); gl.uniform1f(u.th, 0); gl.uniform1f(u.kn, 0.0001); });
    this.pass(this.blur, T.qa.tex, T.qb, (gl, u) => gl.uniform2f(u.d, 1 / T.qa.w, 0));
    this.pass(this.blur, T.qb.tex, T.qa, (gl, u) => gl.uniform2f(u.d, 0, 1 / T.qa.h));
    this.pass(this.down, T.qa.tex, T.ea, (gl, u) => { gl.uniform2f(u.tx, 1 / T.qa.w, 1 / T.qa.h); gl.uniform1f(u.th, 0); gl.uniform1f(u.kn, 0.0001); });
    this.pass(this.blur, T.ea.tex, T.eb, (gl, u) => gl.uniform2f(u.d, 1.5 / T.ea.w, 0));
    this.pass(this.blur, T.eb.tex, T.ea, (gl, u) => gl.uniform2f(u.d, 0, 1.5 / T.ea.h));
    // composite
    const L = this.lensArr; L.fill(0);
    for (let i = 0; i < Math.min(4, P.lenses.length); i++) {
      const l = P.lenses[i]; L[i * 4] = l.x / sw; L[i * 4 + 1] = 1 - l.y / sh; L[i * 4 + 2] = l.e / sh; L[i * 4 + 3] = l.hz / sh;
    }
    const Q = this.ripArr; Q.fill(0);
    for (let i = 0; i < Math.min(4, P.ripples.length); i++) {
      const r = P.ripples[i]; Q[i * 4] = r.x / sw; Q[i * 4 + 1] = 1 - r.y / sh; Q[i * 4 + 2] = r.r / sh; Q[i * 4 + 3] = r.a;
    }
    const c = this.comp;
    gl.useProgram(c.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sceneTex); gl.uniform1i(c.u.sc, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.qa.tex); gl.uniform1i(c.u.b1, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, T.ea.tex); gl.uniform1i(c.u.b2, 2);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform2f(c.u.res, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(c.u.asp, sw / sh);
    gl.uniform1f(c.u.time, P.time % 1000);
    gl.uniform1f(c.u.bloom, P.bloom); gl.uniform1f(c.u.ca, P.ca); gl.uniform1f(c.u.glitch, P.glitch);
    gl.uniform1f(c.u.pix, P.pixel * (gl.drawingBufferWidth / sw)); gl.uniform1f(c.u.post, P.posterize);
    gl.uniform1f(c.u.inv, P.invert); gl.uniform1f(c.u.vig, P.vignette); gl.uniform1f(c.u.grain, P.grain);
    gl.uniform1f(c.u.scan, P.scan); gl.uniform1f(c.u.sat, P.sat); gl.uniform1f(c.u.rew, P.rewind);
    gl.uniform1f(c.u.flashA, P.flash[3]); gl.uniform3f(c.u.flashC, P.flash[0], P.flash[1], P.flash[2]);
    gl.uniform4fv(c.u.lens, L); gl.uniform4fv(c.u.rip, Q);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

function setupRenderer() {
  R.view = $('view'); R.hud = $('hud');
  R.hctx = R.hud.getContext('2d');
  try {
    R.post = new PostFX(R.view);
    R.scene = makeCanvas(2, 2);
  } catch (e) {
    console.warn('WebGL post-processing unavailable, using plain canvas.', e && e.message);
    R.post = null;
    R.scene = R.view;
  }
  R.ctx = R.scene.getContext('2d', { alpha: false });
  const q = store('quality'); if (q && QUALITY_PX[q]) R.quality = q;
  resizeRenderer();
}

function readInsets() {
  const p = $('probe'); if (!p) return;
  const cs = getComputedStyle(p);
  R.insets = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}

function resizeRenderer() {
  const stage = $('stage');
  R.cssW = Math.max(1, stage.clientWidth || window.innerWidth);
  R.cssH = Math.max(1, stage.clientHeight || window.innerHeight);
  R.dpr = Math.min(window.devicePixelRatio || 1, 3);
  const maxPx = QUALITY_PX[R.quality] || QUALITY_PX.auto;
  let rs = Math.min(R.dpr, 2) * (R.quality === 'auto' ? R.dyn : 1);
  if (R.cssW * R.cssH * rs * rs > maxPx) rs = Math.sqrt(maxPx / (R.cssW * R.cssH));
  rs = Math.max(0.4, rs);
  R.rs = rs;
  R.sw = Math.round(R.cssW * rs); R.sh = Math.round(R.cssH * rs);
  if (R.scene.width !== R.sw || R.scene.height !== R.sh) { R.scene.width = R.sw; R.scene.height = R.sh; }
  if (R.post) {
    const vw = Math.round(R.cssW * Math.min(R.dpr, 2) * Math.min(1, Math.sqrt(4.2e6 / (R.cssW * R.cssH * Math.min(R.dpr, 2) ** 2))));
    const vh = Math.round(vw * R.cssH / R.cssW);
    if (R.view.width !== vw || R.view.height !== vh) { R.view.width = vw; R.view.height = vh; }
  }
  R.hs = Math.min(R.dpr, 2);
  const hw = Math.round(R.cssW * R.hs), hh = Math.round(R.cssH * R.hs);
  if (R.hud.width !== hw || R.hud.height !== hh) { R.hud.width = hw; R.hud.height = hh; }
  R.hw = hw; R.hh = hh;
  readInsets();
  cam.baseZoom = computeBaseZoom();
}

// adaptive resolution in 'auto' quality
function adaptQuality(frameMs) {
  if (R.quality !== 'auto') return;
  R.frameMs = R.frameMs * 0.95 + frameMs * 0.05;
  if (R.frameMs > 21) { R.slowFrames++; R.fastFrames = 0; } else if (R.frameMs < 13) { R.fastFrames++; R.slowFrames = 0; } else { R.slowFrames = 0; R.fastFrames = 0; }
  if (R.slowFrames > 90 && R.dyn > 0.5) { R.dyn = Math.max(0.5, R.dyn * 0.85); R.slowFrames = 0; resizeRenderer(); }
  else if (R.fastFrames > 240 && R.dyn < 1) { R.dyn = Math.min(1, R.dyn * 1.1); R.fastFrames = 0; resizeRenderer(); }
  FX.q = R.quality === 'low' ? 0.5 : R.quality === 'medium' ? 0.75 : clamp(0.35 + R.dyn * 0.65, 0.5, 1);
}

// ---------- camera ----------
const cam = { x: W / 2, y: H / 2, zoom: 1, baseZoom: 1, zoomMul: 1, rot: 0, trauma: 0, shakeX: 0, shakeY: 0, punch: 0, t: 0, free: false };
function computeBaseZoom() {
  const landscape = R.sw >= R.sh;
  const z = landscape ? Math.min(R.sw / 1300, R.sh / 820) : Math.min(R.sw / 680, R.sh / 1150);
  // phones: never let things get smaller than ~2/3 of a CSS pixel per world unit
  const small = Math.min(R.cssW, R.cssH) < 600;
  return small ? Math.max(z, 0.66 * R.rs) : z;
}
function camApply(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(R.sw / 2 + cam.shakeX, R.sh / 2 + cam.shakeY);
  if (cam.rot) ctx.rotate(cam.rot);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
}
function worldToScene(wx, wy) {
  let dx = (wx - cam.x) * cam.zoom, dy = (wy - cam.y) * cam.zoom;
  if (cam.rot) { const c = Math.cos(cam.rot), s = Math.sin(cam.rot); const x = dx * c - dy * s; dy = dx * s + dy * c; dx = x; }
  return [dx + R.sw / 2 + cam.shakeX, dy + R.sh / 2 + cam.shakeY];
}
function worldToCss(wx, wy) { const [x, y] = worldToScene(wx, wy); return [x / R.rs, y / R.rs]; }
function cssToWorld(cx, cy) {
  let dx = cx * R.rs - R.sw / 2 - cam.shakeX, dy = cy * R.rs - R.sh / 2 - cam.shakeY;
  if (cam.rot) { const c = Math.cos(-cam.rot), s = Math.sin(-cam.rot); const x = dx * c - dy * s; dy = dx * s + dy * c; dx = x; }
  return [dx / cam.zoom + cam.x, dy / cam.zoom + cam.y];
}
// screen direction → world direction (undo camera rotation)
function screenDirToWorld(x, y) {
  if (!cam.rot) return [x, y];
  const c = Math.cos(-cam.rot), s = Math.sin(-cam.rot);
  return [x * c - y * s, x * s + y * c];
}
function viewRect(pad = 0) { // world AABB of the visible area
  let hx = R.sw / 2 / cam.zoom, hy = R.sh / 2 / cam.zoom;
  if (cam.rot) { const c = Math.abs(Math.cos(cam.rot)), s = Math.abs(Math.sin(cam.rot)); const a = hx * c + hy * s, b = hx * s + hy * c; hx = a; hy = b; }
  return { x0: cam.x - hx - pad, y0: cam.y - hy - pad, x1: cam.x + hx + pad, y1: cam.y + hy + pad };
}
function addTrauma(t) { cam.trauma = Math.min(1, cam.trauma + t * (Settings.shake ? (Settings.shakeAmt ?? 1) : 0)); }
