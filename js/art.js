'use strict';

/* ---------- procedural art ---------- */
let G = {};
function buildFx() {
  const r = seed(11),
    pal = [
      [255, 255, 255],
      [205, 222, 255],
      [255, 242, 214],
      [255, 226, 210],
    ];
  G.stars = [];
  for (let i = 0; i < 150; i++)
    G.stars.push({
      x: r(),
      y: r(),
      d: rg(r, 0.2, 1),
      sz: (S / 450) * (r() < 0.8 ? 1 : 2),
      b: rg(r, 0.35, 1),
      sp: rg(r, 0.6, 2.8),
      ph: rg(r, 0, TAU),
      c: pal[(r() * 4) | 0],
    });
  G.glints = [];
  for (let i = 0; i < 9; i++)
    G.glints.push({
      t: starTex(pal[(r() * 4) | 0]),
      sz: S * rg(r, 0.03, 0.055),
      x: r(),
      y: r(),
      d: rg(r, 0.3, 1),
      sp: rg(r, 0.5, 1.4),
      ph: rg(r, 0, TAU),
    });
  const nc = [
      [70, 55, 140],
      [45, 80, 150],
      [110, 60, 140],
      [40, 100, 140],
    ],
    L = [];
  for (let i = 0; i < 16; i++) {
    const f = i / 15,
      d = 256 * rg(r, 0.28, 0.5);
    L.push([
      rad(nc[(r() * 4) | 0], 2, rg(r, 0.25, 0.45)),
      256 * (0.05 + 0.9 * f + rg(r, -0.05, 0.05)),
      256 * (0.85 - 0.7 * f + rg(r, -0.05, 0.05)),
      d,
    ]);
  }
  G.nebula = addCanvas(256, L);
  const mr = S * 0.07;
  G.mr = mr;
  const gl2 = [
    [13, [65, 88, 185], 2.15, 0.58],
    [8, [100, 130, 225], 1.95, 0.62],
    [5, [145, 170, 250], 1.75, 0.68],
    [3.4, [190, 210, 255], 1.55, 0.72],
    [2.45, [225, 235, 255], 1.35, 0.78],
  ];
  G.moonGlow = addCanvas(
    256,
    gl2.map(([f, c, p, pe]) => [rad(c, p, pe), 128, 128, (256 * f) / 13]),
  );
  G.moonGlints = [
    [-0.9, 1.25, 1.7, 1.1, 0],
    [0.6, 1.45, 1.2, 1.6, 2],
    [2.4, 1.3, 1.5, 1.3, 4.1],
    [3.6, 1.55, 1, 1.9, 1.2],
  ].map(([a, d, s, sp, ph]) => ({
    t: starTex([215, 230, 255]),
    ang: a,
    dist: d,
    sz: Math.max(12, mr * s * 1.3),
    sp,
    ph,
  }));
  G.mugGlow = rad([255, 172, 100], 2.4, 0.4);
  G.shadow = (() => {
    const c = cv(64, 64),
      x = c.getContext('2d'),
      g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.35, 'rgba(0,0,0,.85)');
    g.addColorStop(0.7, 'rgba(0,0,0,.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return mk(c);
  })();
  G.dot = (() => {
    const c = cv(64, 64),
      x = c.getContext('2d'),
      g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return mk(c);
  })();
  G.streak = (() => {
    const c = cv(64, 2),
      x = c.getContext('2d'),
      g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 2);
    return mk(c);
  })();
  G.disc = (() => {
    const c = cv(128, 128),
      x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(64, 64, 62, 0, TAU);
    x.fill();
    return mk(c);
  })();
  G.halo = rad([255, 238, 190], 2, 0.5);
  G.haloW = rad([255, 120, 50], 2, 0.55);
  G.rayLight = rad([255, 246, 232], 2.4, 1);
  G.pumpGlow = rad([255, 150, 60], 2, 0.55);
  G.spark = rad([255, 230, 160], 2, 1);
  G.fxLayers = [
    [2.4, [255, 190, 110], 2.6, 0.1],
    [1, [255, 215, 140], 2.2, 0.16],
    [0.38, [255, 236, 190], 1.8, 0.22],
  ].map(([f, c, p, pe]) => ({ t: rad(c, p, pe), d: f * S }));
  G.ghosts = [
    [0.38, 0.07, [255, 170, 90], 0, 0.14],
    [0.62, 0.13, [120, 200, 255], 1, 0.09],
    [0.95, 0.09, [255, 235, 160], 0, 0.12],
    [1.35, 0.2, [150, 255, 200], 1, 0.06],
  ].map(([t, f, c, ring, pe]) => ({
    t: ring
      ? radial(c, (q) => Math.exp(-Math.pow((q - 0.82) / 0.14, 2)) * pe)
      : rad(c, 1.4, pe),
    f: t,
    d: S * f,
  }));
  G.sunGlints = [
    [0.5, 1.5, 0.07, 1.6, 0],
    [1.2, 2.3, 0.05, 2.2, 1.7],
    [2.1, 1.9, 0.09, 1.3, 3.1],
    [2.8, 3.1, 0.06, 1.9, 4.4],
    [0.1, 3.4, 0.05, 2.6, 2.2],
  ].map(([a, d, f, sp, ph]) => ({
    t: starTex([255, 240, 200]),
    ang: a,
    dist: d,
    sz: S * f,
    sp,
    ph,
  }));
  G.sunDisc = radial([255, 250, 215], (r) => 1, 4); // replaced below
  {
    const n = 128,
      c = cv(n, n),
      x = c.getContext('2d'),
      d = x.createImageData(n, n),
      h = n / 2;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const t = Math.hypot(i + 0.5 - h, j + 0.5 - h) / (h - 2),
          o = (j * n + i) * 4;
        if (t > 1) continue;
        const m = Math.pow(t, 1.5),
          a = t < 0.6 ? 1 : Math.pow(1 - (t - 0.6) / 0.4, 1.6);
        d.data[o] = 255;
        d.data[o + 1] = 255 - 10 * m;
        d.data[o + 2] = 255 - 50 * m;
        d.data[o + 3] = 255 * a;
      }
    x.putImageData(d, 0, 0);
    G.sunDisc = mk(c);
  }
  {
    const n = 64,
      c = cv(n, n),
      x = c.getContext('2d'),
      d = x.createImageData(n, n),
      h = n / 2,
      mx = h * 1.5;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = Math.min(1, Math.hypot(i + 0.5 - h, j + 0.5 - h) / mx),
          q = Math.pow(k, 2.4),
          o = (j * n + i) * 4;
        d.data[o] = 255 - 59 * q;
        d.data[o + 1] = 255 - 51 * q;
        d.data[o + 2] = 255 - 29 * q;
        d.data[o + 3] = 255;
      }
    x.putImageData(d, 0, 0);
    G.vig = mk(c);
  }
  G.moonDisc = moonDisc(Math.round(mr));
  const fb = gl.createFramebuffer(),
    ft = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, ft);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 333, 333, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  for (const [p, v] of [
    [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
    [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
  ])
    gl.texParameteri(gl.TEXTURE_2D, p, v);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ft, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  G.fb = fb;
  G.ft = ft;
}
function moonDisc(mr) {
  const n = mr * 2 + 4,
    c = cv(n, n),
    x = c.getContext('2d'),
    d = x.createImageData(n, n),
    r = seed(23),
    cc = mr + 2,
    maria = [],
    craters = [];
  for (let i = 0; i < 7; i++) {
    const a = rg(r, 0, TAU),
      di = rg(r, 0, 0.6);
    maria.push([Math.cos(a) * di, Math.sin(a) * di, rg(r, 0.14, 0.3), rg(r, 0.1, 0.22)]);
  }
  for (let i = 0; i < 10; i++) {
    const a = rg(r, 0, TAU),
      di = rg(r, 0.1, 0.8);
    craters.push([Math.cos(a) * di, Math.sin(a) * di, rg(r, 0.05, 0.11)]);
  }
  let lx = 0.55,
    ly = -0.45,
    lz = 0.7;
  const ln = Math.hypot(lx, ly, lz);
  lx /= ln;
  ly /= ln;
  lz /= ln;
  for (let py = 0; py < n; py++)
    for (let px = 0; px < n; px++) {
      const dx = (px + 0.5 - cc) / mr,
        dy = (py + 0.5 - cc) / mr,
        d2 = dx * dx + dy * dy,
        edge = cl(((1 - Math.sqrt(d2)) * mr) / 1.5);
      if (edge <= 0) continue;
      const nz = Math.sqrt(Math.max(0, 1 - d2));
      let s = 0.66 + 0.34 * Math.max(0, dx * lx + dy * ly + nz * lz);
      for (const [a, b, mrad, st] of maria) {
        const f = 1 - Math.hypot(dx - a, dy - b) / mrad;
        if (f > 0) s *= 1 - st * sm(f);
      }
      for (const [a, b, cr] of craters) {
        const q = Math.hypot(dx - a, dy - b) / cr;
        if (q < 1) s *= 1 - 0.18 * (1 - q) * (1 - q);
        else if (q < 1.25) s *= 1 + 0.07 * (1 - (q - 1) / 0.25);
      }
      const o = (py * n + px) * 4;
      d.data[o] = Math.min(255, 238 * s + 12);
      d.data[o + 1] = Math.min(255, 242 * s + 10);
      d.data[o + 2] = Math.min(255, 252 * s + 6);
      d.data[o + 3] = 255 * edge;
    }
  x.putImageData(d, 0, 0);
  return mk(c);
}
function makeCloud(idx) {
  if (cloudBase[idx]) return cloudBase[idx];
  const r = seed(idx * 7919 + 13),
    W = 512,
    asp = rg(r, 0.26, 0.6),
    H = Math.round(W * asp),
    c = cv(W, H),
    x = c.getContext('2d');
  x.globalCompositeOperation = 'lighter';
  const baseY = H * rg(r, 0.58, 0.68),
    tall = rg(r, 0.15, 0.5),
    u0 = rg(r, 0.08, 0.2),
    u1 = rg(r, 0.8, 0.92),
    cl2 = [];
  for (let i = 0, n = 1 + ((r() * 3) | 0); i < n; i++) cl2.push(rg(r, u0 + 0.1, u1 - 0.1));
  const puff = (cx, cy, rd, pe) => {
    rd = Math.max(4, rd);
    cx = Math.min(Math.max(cx, rd), W - rd);
    cy = Math.min(Math.max(cy, rd), H - rd);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rd);
    for (const [s, a] of [
      [0, 1],
      [0.45, 1],
      [0.6, 0.82],
      [0.75, 0.34],
      [0.9, 0.08],
      [1, 0],
    ])
      g.addColorStop(s, 'rgba(255,255,255,' + (a * pe) / 255 + ')');
    x.fillStyle = g;
    x.fillRect(cx - rd, cy - rd, rd * 2, rd * 2);
  };
  for (let xx = u0 * W; xx < u1 * W;) {
    const rd = W * rg(r, 0.05, 0.085);
    puff(xx, baseY - rd * rg(r, 0, 0.3), rd, rg(r, 150, 220));
    xx += rd * rg(r, 0.6, 0.9);
  }
  for (let i = 0, n = 8 + ((r() * 15) | 0); i < n; i++) {
    const g1 = ((r() + r() + r() - 1.5) / 1.5) * 0.13 * 1.7,
      u = Math.min(u1, Math.max(u0, cl2[(r() * cl2.length) | 0] + g1)),
      lift = Math.max(...cl2.map((q) => Math.exp(-(((u - q) / 0.2) ** 2)))),
      rd = W * rg(r, 0.06, 0.12) * (0.55 + 0.7 * lift),
      rise = Math.min(lift * H * tall * rg(r, 0.1, 1), rd * 0.8);
    puff(u * W, baseY - rd * rg(r, 0.3, 0.9) - rise, rd, rg(r, 150, 230));
  }
  x.globalCompositeOperation = 'source-atop';
  const g = x.createLinearGradient(0, H * 0.35, 0, H * 0.9);
  g.addColorStop(0, '#fff');
  g.addColorStop(1, 'rgb(200,214,236)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return (cloudBase[idx] = mk(c));
}
