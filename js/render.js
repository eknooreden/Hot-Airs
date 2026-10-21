'use strict';

/* ---------- rendering ---------- */
let side = 1,
  vx0 = 0,
  vy0 = 0,
  shk = [0, 0];
function rays(pos, col, lv) {
  flush();
  attribs(P2);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, G.ft);
  gl.uniform1i(gl.getUniformLocation(P2, 's'), 0);
  gl.uniform2f(gl.getUniformLocation(P2, 'L'), pos[0], pos[1]);
  gl.uniform3f(gl.getUniformLocation(P2, 'C'), col[0], col[1], col[2]);
  gl.uniform1f(gl.getUniformLocation(P2, 'lv'), lv);
  blend(1);
  const q = [
      0, 0, 0, 0, 1000, 0, 1, 0, 1000, 1000, 1, 1, 0, 0, 0, 0, 1000, 1000, 1, 1, 0, 1000, 0,
      1,
    ],
    b = new Float32Array(48);
  for (let i = 0; i < 6; i++) {
    b[i * 8] = q[i * 4];
    b[i * 8 + 1] = q[i * 4 + 1];
    b[i * 8 + 2] = q[i * 4 + 2];
    b[i * 8 + 3] = q[i * 4 + 3];
  }
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, b);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  curT = null;
}
function lightFx(pos, col, k, glow, mug, off, cam) {
  flush();
  gl.bindFramebuffer(gl.FRAMEBUFFER, G.fb);
  gl.viewport(0, 0, 333, 333);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  spr(G.rayLight, pos[0] * S, pos[1] * S, S * 1.1, S * 1.1);
  const bk = [0, 0, 0];
  spr(A.trees, ...treesPos(off, cam), { c: bk });
  for (const b of vines.bars)
    for (const wh of [0, 1]) {
      const g = vgeo(b, wh, cam, vines.time);
      if (g.y + g.h < 0 || g.y > S) continue;
      spr({ t: g.f.t }, g.x + g.w / 2, g.y + g.h / 2, g.w, g.h, { c: bk, f: g.flip });
    }
  if (!mug.dead)
    spr(A.bored, mug.x * S, (mug.y + cam) * S, MUG.w, MUG.h, { c: bk, f: mug.facing != -1 });
  flush();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(vx0 + shk[0], vy0 + shk[1], side, side);
  if (glow)
    for (const l of G.fxLayers) spr(l.t, pos[0] * S, pos[1] * S, l.d, l.d, { b: 1, a: k });
  rays(pos, col, Math.min(1, 0.85 * k) * k);
}
const treesPos = (off, cam) => {
  const w = S * 1.04,
    h = (A.trees.h * w) / A.trees.w;
  return [S / 2 + off[0], S + S * 0.02 + off[1] + cam * S - h / 2, w, h];
};
function drawGame(off, now, mug, dt_) {
  const tint = cyc.tint(),
    ctint = cyc.ctint(),
    cam = mug.cam,
    fade = mug.dead ? Math.max(0, 1 - mug.dt / 0.7) : 1,
    dead = mug.dead;
  const [st, sb] = cyc.sky();
  spr(WT, S / 2, S / 2, S, S, { c: st, c2: sb });
  if (cyc.stv > 0.01) {
    const lv = cyc.stv * 0.9;
    spr(G.nebula, S / 2, S / 2, S, S, { b: 1, c: [lv, lv, lv] });
    for (const s of G.stars) {
      const y = (s.y + cam * 0.04 * s.d) % 1,
        tw_ = 0.7 + 0.3 * Math.sin(now * s.sp + s.ph),
        v = cyc.stv * s.b * tw_;
      spr(
        WT,
        s.x * S + off[0] * 0.2 * s.d + s.sz / 2,
        y * S + off[1] * 0.2 * s.d + s.sz / 2,
        s.sz,
        s.sz,
        { b: 1, c: s.c.map((q) => (q / 255) * v) },
      );
    }
    for (const g of G.glints) {
      const y = (g.y + cam * 0.04 * g.d) % 1,
        v = cyc.stv * Math.pow(0.5 + 0.5 * Math.sin(now * g.sp + g.ph), 1.5);
      if (v < 0.03) continue;
      spr(g.t, g.x * S + off[0] * 0.2 * g.d, y * S + off[1] * 0.2 * g.d, g.sz, g.sz, {
        b: 1,
        c: [v, v, v],
      });
    }
  }
  for (const s of sky.shoot) {
    const p = s.age / s.life,
      br = Math.sin(Math.PI * p),
      sp = Math.hypot(s.vx, s.vy),
      ux = s.vx / sp,
      uy = s.vy / sp,
      tail = 0.16 * S;
    for (let i = 0; i < 10; i++) {
      const f = (i + 0.5) / 10,
        v = (1 - f) * br;
      spr(
        WT,
        s.x * S - ux * tail * f,
        s.y * S - uy * tail * f,
        (tail / 10) * 1.3,
        S * 0.003 * (1 - f) + 1,
        { b: 1, r: Math.atan2(uy, ux), c: [v, v, Math.min(1, v + 0.04)] },
      );
    }
  }
  if (cyc.mv > 0.01) {
    const [mxp, myp] = [cyc.dm[0] * S + off[0] * 0.05, cyc.dm[1] * S + off[1] * 0.05],
      pw = 0.5 - 0.5 * Math.cos(now * 1.15);
    let [sc, bo] = cyc.glow();
    sc = Math.max(sc, 1.18 + 0.78 * pw);
    bo *= 1.18 + 0.62 * pw;
    const tot = cyc.mv * MLIGHT[cyc.ph] * (0.94 + 0.06 * Math.sin(now * 0.9)) * bo;
    if (tot > 0.01) {
      const d = G.mr * 13 * sc;
      const p = Math.max(1, Math.ceil(tot));
      for (let i = 0; i < p; i++)
        spr(G.moonGlow, mxp, myp, d, d, { b: 1, c: [tot / p, tot / p, tot / p] });
    }
    const spri = ((!cyc.full || 0) && moonSpr[MOONS[cyc.ph]]) || G.moonDisc,
      md = G.mr * 2;
    spr(
      spri,
      mxp,
      myp,
      md + (spri == G.moonDisc ? 4 : 0),
      md + (spri == G.moonDisc ? 4 : 0),
      { a: cyc.mv },
    );
    if (cyc.full) {
      for (const g of G.moonGlints) {
        const v = Math.pow(Math.max(0, Math.sin(now * g.sp + g.ph)), 3) * cyc.mv * 0.85;
        if (v < 0.02) continue;
        spr(
          g.t,
          mxp + Math.cos(g.ang) * G.mr * g.dist,
          myp + Math.sin(g.ang) * G.mr * g.dist,
          g.sz,
          g.sz,
          { b: 1, c: [v, v, v] },
        );
      }
    }
  }
  if (cyc.sv > 0.01) {
    const sx = cyc.sp[0] * S,
      sy = cyc.sp[1] * S;
    spr(G.halo, sx, sy, ((S * 0.06 * 2 * 6) / 2) * 1, (S * 0.06 * 2 * 6) / 2, {
      b: 1,
      c: [cyc.sv, cyc.sv, cyc.sv],
    });
    if (cyc.warm > 0.03) {
      const w = Math.min(1, cyc.warm * cyc.sv);
      spr(G.haloW, sx, sy, (S * 0.06 * 9 * 2) / 2, (S * 0.06 * 9 * 2) / 2, {
        b: 1,
        c: [w, w, w],
      });
    }
    spr(G.sunDisc, sx, sy, S * 0.06 * 2 + 4, S * 0.06 * 2 + 4, { a: cyc.sv });
  }
  const cloudDraw = (list) => {
    for (const c of list) {
      const T_ = makeCloud(c.idx),
        w = S * c.w,
        h = ((T_.h * w) / T_.w) * c.sq,
        par = list === sky.fg ? 0.6 : 0.2,
        y = (c.y + cam * c.f) * S + off[1] * par;
      if (y - h / 2 > S || y + h / 2 < 0) continue;
      spr(T_, c.x * S + w / 2 + off[0] * par, y, w, h, { a: c.a / 255, c: ctint, f: c.flip });
    }
  };
  cloudDraw(sky.clouds);
  drawStorm(off);
  const tp = treesPos(off, cam);
  spr(A.trees, ...tp, { c: tint });
  if (!dead) {
    const alt = mug.fy - mug.y,
      f = 1 - alt / 0.45;
    if (f > 0) {
      const w = Math.max(4, MUG.w * (1.15 - 0.45 * (1 - f))),
        h = w * 0.22;
      spr(
        G.shadow,
        mug.x * S + off[0],
        (mug.fy + mug.hh + cam) * S + off[1] + h * 0.15,
        w,
        h,
        { a: (f * 100) / 255 },
      );
    }
  }
  const gb = (alt) => {
    const t = cl(1 - alt / 0.1);
    return t * t * (3 - 2 * t);
  };
  for (const p of mug.puffs) {
    const pr = p.age / p.life,
      r = S * p.size * (1 + 0.9 * pr),
      a = p.alpha * Math.pow(1 - pr, 1.5);
    if (a < 0.004) continue;
    const g = gb(mug.fy - p.y);
    spr(G.dot, p.x * S + off[0] * g, (p.y + cam) * S + off[1] * g, r * 2.6, r * 2.6, {
      a: Math.min(1, a * 1.6),
    });
  }
  for (const b of vines.bars)
    for (const wh of [0, 1]) {
      const g = vgeo(b, wh, cam, vines.time);
      if (g.y + g.h < 0 || g.y > S) continue;
      spr({ t: g.f.t }, g.x + g.w / 2, g.y + g.h / 2, g.w, g.h, {
        c: b.lit ? WH : tint,
        f: g.flip,
      });
      if (b.lit && b.start != null) {
        const gd = PH * S * 1.8,
          gx = wh == 0 ? g.x + g.w - g.h / 2 : g.x + g.h / 2,
          fl = 0.78 + 0.22 * Math.sin(now * 7 + g.y * 0.05),
          lv = Math.min(1, fl * (1 + 0.9 * b.shake));
        spr(G.pumpGlow, gx, g.y + g.h / 2, gd, gd, { b: 1, c: [lv, lv, lv] });
      }
    }
  let mx, my, img, ang;
  shk = [0, 0];
  if (dead) {
    const t = mug.dt;
    spr(WT, S / 2, S / 2, S, S, { c: [0, 0, 0], a: Math.min(1, t / 0.7) });
    const gl_ = Math.min(1, t / 1),
      e = 1 - Math.pow(1 - gl_, 3);
    mx = mug.dx + (0.5 - mug.dx) * e;
    my = mug.dy + (0.27 - mug.dy) * e + Math.sin(t * 2) * 0.012 * e;
    ang = mug.da * (1 - e);
    img = A.dead;
    if (t < 0.6) {
      const am = side * 0.02 * (1 - t / 0.6);
      shk = [Math.round(rr(-am, am)), Math.round(rr(-am, am))];
    }
  } else {
    mx = mug.x;
    my = mug.y + cam;
    img = mug.happy ? A.happy : A.bored;
    ang = mug.angle;
  }
  const mt = tint.map((c) => 1 - (1 - c) * 0.5),
    g = dead ? 0 : gb(mug.fy - mug.y),
    cx = mx * S + off[0] * g,
    cy = my * S + off[1] * g;
  if (!dead && cyc.night > 0.05) {
    const lv = cyc.night * 0.8,
      d = S * 0.34;
    spr(G.mugGlow, cx, cy, d, d, { b: 1, c: [lv, lv, lv] });
  }
  spr(img, cx, cy, MUG.w, MUG.h, { r: (-ang * Math.PI) / 180, c: mt, f: mug.facing != -1 });
  if (!dead) {
    cloudDraw(sky.fg);
    for (const s of sky.streaks)
      spr(
        G.streak,
        s.x * S + (s.l * S) / 2,
        (s.y + cam * 1.3) * S,
        s.l * S,
        Math.max(1, s.th * S),
        { a: (s.a / 255) * 1.4 },
      );
  }
  drawRain();
  const mAmt = (cyc.full ? cyc.mv : 0) * fade * 0.75;
  if (mAmt > 0.03) lightFx(cyc.dm, [175 / 255, 205 / 255, 1], mAmt, false, mug, off, cam);
  const k = cyc.sv * fade;
  if (k > 0.02) {
    lightFx(cyc.sp, WH, k, true, mug, off, cam);
    const sx = cyc.sp[0] * S,
      sy = cyc.sp[1] * S,
      lv = Math.min(1, k);
    for (const g2 of G.ghosts)
      spr(g2.t, sx + (S * 0.5 - sx) * g2.f, sy + (S * 0.55 - sy) * g2.f, g2.d, g2.d, {
        b: 1,
        c: [lv, lv, lv],
      });
    for (const g2 of G.sunGlints) {
      const v = Math.pow(Math.max(0, Math.sin(now * g2.sp + g2.ph)), 3) * k;
      if (v < 0.02) continue;
      spr(
        g2.t,
        sx + Math.cos(g2.ang) * S * 0.06 * g2.dist,
        sy + Math.sin(g2.ang) * S * 0.06 * g2.dist,
        g2.sz,
        g2.sz,
        { b: 1, c: [v, v, v] },
      );
    }
  }
  spr(G.vig, S / 2, S / 2, S, S, { b: 2 });
  return { cx, cy };
}
function hud(mug, mc, story) {
  const mg = S * 0.03,
    gap = S * 0.015,
    so = Math.max(1, S * 0.004),
    txt = String(Math.max(0, Math.floor(mug.score - st.base))),
    sz = S * 0.05;
  if (!story) {
    if (!mug.dead) {
      tx(txt, sz, '#000', mg + so, mg + so + sz * 0.6, 'l', { sc: 1 });
      tx(txt, sz, '#fff', mg, mg + sz * 0.6, 'l', { sc: 1 });
    }
    return;
  }
  const ih = S * 0.06,
    iw = (A.cocoa.w * ih) / A.cocoa.h,
    tw_ = T(txt, sz).w,
    gw = iw + gap + tw_;
  let hx = mg,
    hy = mg;
  if (mug.dead && mc) {
    const t = mug.dt,
      e = 1 - Math.pow(1 - Math.min(1, t / 1), 3),
      fl = Math.sin(t * 2 * 1.3 + 1) * S * 0.008;
    hx = mg + (mc.cx - gw / 2 - mg) * e;
    hy = mg + (mc.cy - (S * MUGH) / 2 - ih - gap * 2 + fl * e - mg) * e;
    const lv = (90 / 255) * Math.min(1, t) * (0.85 + 0.15 * Math.sin(t * 2.5)),
      d = ih * 2.2 * 2;
    spr(G.dot, hx + iw / 2, hy + ih / 2, d, d, { a: lv * 2.5 });
  }
  spr(A.cocoa, hx + iw / 2, hy + ih / 2, iw, ih);
  const x = hx + iw + gap,
    y = hy + ih / 2;
  tx(txt, sz, '#000', x + so, y + so, 'l');
  tx(txt, sz, '#fff', x, y, 'l');
}
function banner(b) {
  if (b.age == null) return;
  const a = Math.min(sm(b.age / 0.5), 1 - sm((b.age - 5 + 0.85) / 0.85));
  if (a <= 0.01) return;
  const txt = 'Checkpoint ' + b.n,
    sz = S * 0.06,
    w = T(txt, sz).w,
    h = T(txt, sz).h,
    cy = S * 0.05 + h / 2,
    px = Math.max(10, S * 0.018),
    py = Math.max(5, S * 0.009);
  rc(
    S / 2 - w / 2 - px,
    cy - h / 2 - py,
    w + px * 2,
    h + py * 2,
    [12 / 255, 16 / 255, 28 / 255],
    0.69 * a,
  );
  tx(txt, sz, '#000', S / 2 + 4, cy + 4, 'c', { a });
  tx(txt, sz, '#fff', S / 2, cy, 'c', { a });
  const gr = 1 - Math.pow(1 - cl((b.age - 0.15) / 1), 3),
    bw = Math.max(2, w * 1.5 * gr),
    bh = Math.max(3, S * 0.009),
    top = cy + h / 2 + py + S * 0.012;
  rc(S / 2 - bw / 2, top - bh, bw, bh * 3, [1, 0.87, 0.59], a * 0.22, 1);
  rc(S / 2 - bw / 2, top, bw, bh, [1, 0.87, 0.59], a, 1);
  if (gr < 0.999) {
    const l = a * (0.4 + 0.6 * (1 - gr)),
      d = S * 0.05;
    for (const sg of [-1, 1])
      spr(G.spark, S / 2 + (sg * bw) / 2, top + bh / 2, d, d, { b: 1, c: [l, l, l] });
  }
}