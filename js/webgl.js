'use strict';

/* ---------- WebGL core: batched sprites, 3 blend modes, radial-blur ray shader ---------- */
const cvs = document.getElementById('c'),
  gl = cvs.getContext('webgl', { alpha: false, antialias: true });
if (!gl) {
  showProblem('WebGL is not available in this browser, so the game cannot start.');
  throw new Error('no WebGL');
}
const sh = (t, s) => {
    const o = gl.createShader(t);
    gl.shaderSource(o, s);
    gl.compileShader(o);
    return o;
  },
  prog = (v, f) => {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, v));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f));
    gl.linkProgram(p);
    return p;
  };
const VS =
  'attribute vec2 p;attribute vec2 u;attribute vec4 c;varying vec2 v;varying vec4 k;void main(){gl_Position=vec4(p.x/500.-1.,1.-p.y/500.,0,1);v=u;k=c;}';
const P1 = prog(
  VS,
  'precision mediump float;varying vec2 v;varying vec4 k;uniform sampler2D s;void main(){vec4 t=texture2D(s,v);gl_FragColor=vec4(t.rgb*k.rgb,t.a)*k.a;}',
);
const P2 = prog(
  VS,
  'precision mediump float;varying vec2 v;uniform sampler2D s;uniform vec2 L;uniform vec3 C;uniform float lv;void main(){vec3 a=vec3(0.);float w=1.,tw=0.;for(int i=0;i<18;i++){float f=1.+float(i)*.06;vec2 q=L+(v-L)/f;a+=texture2D(s,vec2(q.x,1.-q.y)).rgb*w;tw+=w;w*=.95;}a/=tw;float d=length(v-L)/.45;float m=1.-pow(clamp(1.-d,0.,1.),1.2);gl_FragColor=vec4(a*C*lv*m,1.);}',
);
const MQ = 3000,
  buf = new Float32Array(MQ * 48),
  vb = gl.createBuffer();
let nq = 0,
  curT = null,
  curB = -1;
gl.bindBuffer(gl.ARRAY_BUFFER, vb);
gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
gl.enable(gl.BLEND);
function attribs(p) {
  gl.useProgram(p);
  for (const [n, z, o] of [
    ['p', 2, 0],
    ['u', 2, 8],
    ['c', 4, 16],
  ]) {
    const l = gl.getAttribLocation(p, n);
    if (l >= 0) {
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, z, gl.FLOAT, false, 32, o);
    }
  }
}
function flush() {
  if (!nq) return;
  attribs(P1);
  gl.bindTexture(gl.TEXTURE_2D, curT);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.subarray(0, nq * 48));
  gl.drawArrays(gl.TRIANGLES, 0, nq * 6);
  nq = 0;
}
function blend(m) {
  if (m === curB) return;
  flush();
  curB = m;
  m == 0
    ? gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    : m == 1
      ? gl.blendFunc(gl.ONE, gl.ONE)
      : gl.blendFunc(gl.DST_COLOR, gl.ZERO);
}
const cv = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  return c;
};
const mk = (c, near) => {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  const f = near ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { t, w: c.width, h: c.height, c };
};
// spr: center-anchored quad. o: a alpha, c tint (top), c2 tint (bottom, gradients), r rotation(rad), f flipX, b blend(0 normal,1 add,2 mul)
function spr(T, x, y, w, h, o) {
  o = o || {};
  blend(o.b || 0);
  if (T.t !== curT) {
    flush();
    curT = T.t;
  }
  if (nq >= MQ) flush();
  const a = o.a == null ? 1 : o.a,
    c = o.c || WH,
    c2 = o.c2 || c,
    r = o.r || 0,
    co = Math.cos(r),
    si = Math.sin(r),
    u0 = o.f ? 1 : 0,
    u1 = o.f ? 0 : 1,
    hw = w / 2,
    hh = h / 2;
  const P = [
    [-hw, -hh, u0, 0, c],
    [hw, -hh, u1, 0, c],
    [hw, hh, u1, 1, c2],
    [-hw, hh, u0, 1, c2],
  ];
  let i = nq * 48;
  nq++;
  for (const j of [0, 1, 2, 0, 2, 3]) {
    const q = P[j];
    buf[i++] = x + q[0] * co - q[1] * si;
    buf[i++] = y + q[0] * si + q[1] * co;
    buf[i++] = q[2];
    buf[i++] = q[3];
    buf[i++] = q[4][0];
    buf[i++] = q[4][1];
    buf[i++] = q[4][2];
    buf[i++] = a;
  }
}
const WT = mk(
  (() => {
    const c = cv(2, 2),
      x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, 2, 2);
    return c;
  })(),
);
const rc = (x, y, w, h, c, a, b) => spr(WT, x + w / 2, y + h / 2, w, h, { c, a, b });
const bord = (x, y, w, h, t, c) => {
  rc(x, y, w, t, c);
  rc(x, y + h - t, w, t, c);
  rc(x, y, t, h, c);
  rc(x + w - t, y, t, h, c);
};
// procedural glow textures (opaque RGB for additive use)
function radial(col, fn, n) {
  n = n || 96;
  const c = cv(n, n),
    x = c.getContext('2d'),
    d = x.createImageData(n, n),
    h = n / 2;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(i + 0.5 - h, j + 0.5 - h) / h,
        k = r >= 1 ? 0 : fn(r),
        o = (j * n + i) * 4;
      d.data[o] = col[0] * k;
      d.data[o + 1] = col[1] * k;
      d.data[o + 2] = col[2] * k;
      d.data[o + 3] = 255;
    }
  x.putImageData(d, 0, 0);
  return mk(c);
}
const rad = (col, pw, pe, n) => radial(col, (r) => Math.pow(1 - r, pw) * pe, n);
function starTex(col, n) {
  n = n || 64;
  const c = cv(n, n),
    x = c.getContext('2d'),
    d = x.createImageData(n, n),
    h = n / 2;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const dx = Math.abs(i - h),
        dy = Math.abs(j - h);
      let v = 0;
      const f = (t) => Math.pow(Math.max(0, 1 - t / h), 2.4);
      if (dy == 0) v = f(dx);
      else if (dy == 1) v = 0.45 * f(dx);
      if (dx == 0) v = Math.max(v, f(dy));
      else if (dx == 1) v = Math.max(v, 0.45 * f(dy));
      const r = Math.hypot(dx, dy) / (h / 2);
      v += r < 1 ? Math.pow(1 - r, 2) * 0.9 : 0;
      const o = (j * n + i) * 4;
      d.data[o] = Math.min(255, col[0] * v);
      d.data[o + 1] = Math.min(255, col[1] * v);
      d.data[o + 2] = Math.min(255, col[2] * v);
      d.data[o + 3] = 255;
    }
  x.putImageData(d, 0, 0);
  return mk(c);
}
function addCanvas(n, layers) {
  const c = cv(n, n),
    x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, n, n);
  x.globalCompositeOperation = 'lighter';
  for (const [tx, px, py, d] of layers) x.drawImage(tx.c, px - d / 2, py - d / 2, d, d);
  return mk(c);
}
// text -> cached texture
let TK = 1,
  fontOK = false;
const tc = new Map(),
  FONT = 'GF,"Courier New",Courier,monospace',
  mc = cv(4, 4).getContext('2d');
const SFONT = 'SC,GF,"Courier New",Courier,monospace',
  fnt = (px, sc) => (fontOK ? '' : 'bold ') + px + 'px ' + (sc ? SFONT : FONT);
function T(s, sz, col, sc) {
  col = col || '#fff';
  const k = s + '|' + sz + '|' + col + '|' + TK + '|' + (sc ? 1 : 0);
  let o = tc.get(k);
  if (!o) {
    if (tc.size > 500) {
      for (const v of tc.values()) gl.deleteTexture(v.t);
      tc.clear();
    }
    const c = cv(4, 4),
      x = c.getContext('2d');
    x.font = fnt(Math.max(8, sz * TK), sc);
    const w = Math.ceil(x.measureText(s).width) + 2,
      h = Math.ceil(sz * TK * 1.35);
    c.width = w;
    c.height = h;
    x.font = fnt(Math.max(8, sz * TK), sc);
    x.fillStyle = col;
    x.textBaseline = 'middle';
    x.fillText(s, 1, h / 2);
    o = mk(c);
    o.w = w / TK;
    o.h = h / TK;
    tc.set(k, o);
  }
  return o;
}
const tw = (s, sz) => {
  mc.font = fnt(sz);
  return mc.measureText(s).width;
};
function tx(s, sz, col, x, y, al, o) {
  if (!s) return;
  const t = T(s, sz, col, o && o.sc),
    w = t.w * ((o && o.s) || 1),
    h = t.h * ((o && o.s) || 1);
  spr(t, al == 'l' ? x + w / 2 : al == 'r' ? x - w / 2 : x, y, w, h, o);
}
