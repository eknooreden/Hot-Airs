'use strict';

/* ---------- save data, upgrade shop, item slots, menu particles ---------- */
const UMB = { cost: 350, time: 10, cooldown: 3 };
const save = { wallet: 0, maxCp: 0, owned: {}, hs: { story: 0, score: 0 } };

// nothing is stored between sessions: cocoa, high scores and checkpoints reset when the game is closed
function loadSave() {
  try {
    localStorage.removeItem('hotairs_save_v1'); // wipe saves left by older versions
  } catch (e) {}
  // handy for testing: open index.html?cocoa=1000 to start with 1000 cocoa
  const m = /[?&]cocoa=(\d+)/.exec(location.search);
  if (m) save.wallet = +m[1];
}

// brown theme used by the shop and the item slots
const BRN = {
  dark: K3(61, 29, 16),
  deep: K3(92, 46, 26),
  rim: K3(130, 57, 26),
  face: K3(156, 90, 60),
  light: K3(189, 106, 74),
  pale: K3(222, 160, 118),
  text: K3(240, 205, 165),
};
const css = (c) => 'rgb(' + c.map((v) => Math.round(v * 255)).join(',') + ')';
const easeCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* ---------- particles (menu, shop) ---------- */
const fx = { back: [], mid: [], top: [], panel: [] };
const fxAcc = {};
const due = (k, perSec, dt) => {
  fxAcc[k] = (fxAcc[k] || 0) + perSec * dt;
  const n = Math.floor(fxAcc[k]);
  fxAcc[k] -= n;
  return n;
};
function fxAdd(list, p) {
  p.age = 0;
  if (list.length < 500) list.push(p);
}
function fxStep(list, dt, now) {
  for (const p of list) {
    p.age += dt;
    p.vy += (p.g || 0) * dt;
    if (p.drag) {
      const f = Math.exp(-p.drag * dt);
      p.vx *= f;
      p.vy *= f;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind == 'mote') p.x += Math.sin(now * p.sp + p.ph) * 9 * dt;
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].age >= list[i].life) list.splice(i, 1);
}
function fxDraw(list, now) {
  for (const p of list) {
    const k = p.age / p.life,
      fade = Math.sin(Math.PI * k);
    switch (p.kind) {
      case 'mote': {
        const v = p.v * fade * (0.55 + 0.45 * Math.sin(now * p.sp * 2 + p.ph));
        spr(G.dot, p.x, p.y, p.size, p.size, { b: 1, c: [v * p.c[0], v * p.c[1], v * p.c[2]] });
        break;
      }
      case 'star': {
        const v = fade * p.v;
        spr(p.tex, p.x, p.y, p.size, p.size, { b: 1, c: [v, v, v] });
        break;
      }
      case 'streak':
        spr(G.streak, p.x, p.y, p.len, p.th, { a: p.a * fade });
        break;
      case 'steam': {
        const r = p.size * (1 + 1.4 * k);
        spr(G.dot, p.x, p.y, r, r, { a: p.a * Math.pow(1 - k, 1.5) });
        break;
      }
      case 'spark': {
        const v = Math.pow(1 - k, 1.5) * p.v;
        spr(G.spark, p.x, p.y, p.size, p.size, {
          b: 1,
          c: [v * p.c[0], v * p.c[1], v * p.c[2]],
        });
        break;
      }
      case 'dust': {
        const r = p.size * (1 + 0.8 * k);
        spr(G.dot, p.x, p.y, r, r, { c: p.c, a: p.a * (1 - k) });
        break;
      }
      case 'cocoa': {
        const h = p.size * (1 - 0.3 * k),
          w = (h * A.cocoa.w) / A.cocoa.h;
        spr(A.cocoa, p.x, p.y, w, h, { a: 1 - k * k, r: p.rot + p.vr * p.age });
        break;
      }
    }
  }
}
function burst(list, x, y, n, o) {
  o = o || {};
  for (let i = 0; i < n; i++) {
    const a = rr(0, TAU),
      sp = rr(o.min || 120, o.max || 420);
    fxAdd(list, {
      kind: o.kind || 'spark',
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (o.up || 0),
      g: o.g || 0,
      drag: o.drag == null ? 2.2 : o.drag,
      size: rr(o.s0 || 14, o.s1 || 30),
      life: rr(0.5, 1.0),
      v: 1,
      c: pk(o.cols || [[1, 0.88, 0.55], [1, 1, 0.85], [0.8, 0.92, 1]]),
      rot: rr(-3, 3),
      vr: rr(-6, 6),
    });
  }
}

// ambient menu effects: drifting motes, wind streaks, twinkles, steam off the mug, hover sparks
function menuFxUpdate(dt, t, off) {
  const cols = [[1, 0.95, 0.78], [0.78, 0.9, 1], [1, 0.86, 0.7]];
  for (let i = due('mote', 8, dt); i--; )
    fxAdd(fx.mid, {
      kind: 'mote',
      x: rr(0, S),
      y: rr(S * 0.35, S + 30),
      vx: rr(-6, 12),
      vy: -rr(14, 38),
      size: rr(12, 30),
      life: rr(5, 9),
      v: rr(0.45, 0.95),
      c: pk(cols),
      sp: rr(1, 3),
      ph: rr(0, TAU),
    });
  for (let i = due('streak', 1.1, dt); i--; ) {
    const vx = rr(380, 700);
    fxAdd(fx.mid, {
      kind: 'streak',
      x: -320,
      y: rr(70, S - 70),
      vx,
      vy: 0,
      len: rr(160, 340),
      th: rr(2, 4),
      a: rr(0.2, 0.4),
      life: (S + 700) / vx,
    });
  }
  for (let i = due('star', 2.2, dt); i--; )
    fxAdd(fx.mid, {
      kind: 'star',
      tex: pk(G.sunGlints).t,
      x: rr(30, S - 30),
      y: rr(20, S * 0.7),
      vx: 0,
      vy: -4,
      size: rr(18, 40),
      life: rr(0.9, 1.9),
      v: rr(0.6, 1),
    });
  const mx = S * 0.88 + off[0] * 0.15,
    my = S * 0.8 + Math.sin(t * 1.5) * S * 0.015 + off[1] * 0.15 - MH / 2 + 14;
  for (let i = due('steam', 7, dt); i--; )
    fxAdd(fx.back, {
      kind: 'steam',
      x: mx + rr(-22, 22),
      y: my,
      vx: rr(-8, 10),
      vy: -rr(28, 55),
      size: rr(30, 52),
      a: rr(0.2, 0.34),
      life: rr(1.3, 2.1),
      drag: 0.2,
    });
  for (const k of ['back', 'mid', 'top', 'panel']) fxStep(fx[k], dt, t);
}

/* ---------- the upgrades panel ---------- */
const upg = { open: false, closing: false, p: 0, x: 0, c: 0, shake: 0, flash: 0, landed: false, cardIn: false };
const PANEL = [90, 120, 820, 780];

function upgOpen() {
  if (upg.open) return;
  Object.assign(upg, { open: true, closing: false, p: 0, x: 0, c: 0, landed: false, cardIn: false });
}
function upgClose() {
  if (upg.open && !upg.closing) {
    upg.closing = true;
    sfx(snd.click);
  }
}
function upgRects() {
  const pe = easeCubic(cl(upg.p)),
    xe = easeBack(cl(upg.x)),
    ce = easeBack(cl(upg.c)),
    py = S + 20 + (PANEL[1] - S - 20) * pe,
    card = [-740 + (150 + 740) * ce, py + 190, 700, 210];
  return {
    panel: [PANEL[0], py, PANEL[2], PANEL[3]],
    xb: [S - 128, -110 + (28 + 110) * xe, 84, 84],
    card,
    buy: [card[0] + 700 - 245, card[1] + 61, 220, 88],
    card2: [-740 + (150 + 740) * easeBack(cl(upg.c - 0.12)), py + 430, 700, 150],
  };
}
function upgUpdate(dt, now) {
  if (!upg.open) return;
  if (!upg.closing) {
    upg.p = Math.min(1, upg.p + dt / 0.55);
    if (upg.p >= 1) upg.x = Math.min(1, upg.x + dt / 0.4); // the X comes down after the box lands
    if (upg.x >= 0.55) upg.c = Math.min(1, upg.c + dt / 0.6); // then the card slides in from the left
  } else {
    upg.c = Math.max(0, upg.c - dt / 0.25);
    upg.x = Math.max(0, upg.x - dt / 0.25);
    if (upg.c < 0.4 && upg.x < 0.4) upg.p = Math.max(0, upg.p - dt / 0.4);
    if (upg.p <= 0 && upg.c <= 0 && upg.x <= 0) {
      upg.open = false;
      upg.closing = false;
    }
  }
  upg.shake = Math.max(0, upg.shake - dt * 2.5);
  upg.flash = Math.max(0, upg.flash - dt * 3);
  if (!upg.landed && upg.p >= 1) {
    upg.landed = true; // dust kicks up when the box lands
    for (let i = 0; i < 26; i++)
      fxAdd(fx.panel, {
        kind: 'dust',
        x: rr(PANEL[0], PANEL[0] + PANEL[2]),
        y: PANEL[1] + 6,
        vx: rr(-70, 70),
        vy: -rr(20, 110),
        size: rr(40, 90),
        a: 0.5,
        c: [0.85, 0.65, 0.5],
        life: rr(0.6, 1.1),
        drag: 1.5,
      });
  }
  if (!upg.cardIn && upg.c >= 0.98) {
    upg.cardIn = true;
    const r = upgRects().card;
    burst(fx.panel, r[0] + r[2] / 2, r[1] + r[3] / 2, 16, { min: 80, max: 260, s0: 12, s1: 26 });
  }
  if (upg.p >= 1 && !upg.closing)
    for (let i = due('upgmote', 10, dt); i--; )
      fxAdd(fx.panel, {
        kind: 'mote',
        x: rr(PANEL[0] + 10, PANEL[0] + PANEL[2] - 10),
        y: rr(PANEL[1] + 100, PANEL[1] + PANEL[3] - 10),
        vx: 0,
        vy: -rr(10, 30),
        size: rr(10, 24),
        life: rr(2.5, 5),
        v: rr(0.4, 0.8),
        c: [1, 0.9, 0.7],
        sp: rr(1, 3),
        ph: rr(0, TAU),
      });
}
function upgBuy() {
  if (save.owned.umbrella) {
    upg.shake = 1;
    return;
  }
  const b = upgRects().buy;
  if (save.wallet >= UMB.cost) {
    save.wallet -= UMB.cost;
    save.owned.umbrella = true;
    sfx(snd.done);
    const x = b[0] + b[2] / 2,
      y = b[1] + b[3] / 2;
    burst(fx.panel, x, y, 26, { min: 140, max: 520, s0: 16, s1: 34 });
    burst(fx.panel, x, y, 14, { kind: 'cocoa', min: 120, max: 380, up: 220, g: 700, drag: 0.4, s0: 34, s1: 54 });
  } else {
    upg.shake = 1; // can't afford it
    upg.flash = 1;
    sfx(snd.sel);
  }
}
function upgClick(p) {
  if (upg.closing || upg.p < 1) return;
  const R = upgRects();
  if (hit(R.xb, p)) return upgClose();
  if (upg.c > 0.9 && hit(R.buy, p)) return upgBuy();
  if (!hit(R.panel, p) && !hit(R.xb, p)) upgClose();
}

function drawWallet(x, y, sz, col, shadow) {
  const ih = sz * 1.2,
    iw = (A.cocoa.w * ih) / A.cocoa.h,
    txt = String(save.wallet);
  spr(A.cocoa, x + iw / 2, y, iw, ih);
  const tx0 = x + iw + sz * 0.3;
  if (shadow) tx(txt, sz, shadow, tx0 + 3, y + 3, 'l');
  tx(txt, sz, col, tx0, y, 'l');
}
function upgDraw(now) {
  if (!upg.open) return;
  const R = upgRects(),
    dim = Math.min(1, upg.p * 2.2),
    [px, py, pw, ph] = R.panel;
  rc(0, 0, S, S, [0, 0, 0], 0.55 * dim);
  // big brown box
  rc(px + 10, py + 14, pw, ph, [0, 0, 0], 0.35);
  rc(px, py, pw, ph, BRN.dark);
  rc(px + 8, py + 8, pw - 16, ph - 16, BRN.face);
  rc(px + 8, py + 8, pw - 16, 16, BRN.light);
  rc(px + pw - 30, py + 8, 22, ph - 16, BRN.rim, 0.7);
  rc(px + 8, py + ph - 30, pw - 16, 22, BRN.rim, 0.55);
  bord(px + 18, py + 18, pw - 36, ph - 36, 4, BRN.deep);
  tx('UPGRADES', S * 0.062, css(BRN.dark), px + pw / 2 + 4, py + 84, 'c');
  tx('UPGRADES', S * 0.062, css(BRN.text), px + pw / 2, py + 80, 'c');
  drawWallet(px + 46, py + 80, S * 0.04, css(BRN.text), css(BRN.dark));
  tx('Upgrades only apply to Story Mode', S * 0.02, css(BRN.deep), px + pw / 2, py + ph - 48, 'c');

  // card sliding in from the left (darker shading on its right side)
  const [cx0, cy0, cw, ch] = R.card;
  rc(cx0 + 8, cy0 + 10, cw, ch, [0, 0, 0], 0.25);
  rc(cx0, cy0, cw, ch, BRN.deep);
  rc(cx0 + 5, cy0 + 5, cw - 10, ch - 10, BRN.light);
  rc(cx0 + cw - 31, cy0 + 5, 26, ch - 10, BRN.rim);
  rc(cx0 + cw - 41, cy0 + 5, 10, ch - 10, mixc(BRN.light, BRN.rim, 0.5));
  const ccx = cx0 + 108,
    ccy = cy0 + ch / 2,
    r = 74;
  spr(G.disc, ccx, ccy, (r + 9) * 2, (r + 9) * 2, { c: BRN.deep }); // brown outline circle
  spr(G.disc, ccx, ccy, r * 2, r * 2, { c: BRN.pale });
  if (A.umbrella) {
    const k = Math.min((r * 1.45) / A.umbrella.w, (r * 1.45) / A.umbrella.h);
    spr(A.umbrella, ccx, ccy, A.umbrella.w * k, A.umbrella.h * k, { r: Math.sin(now * 1.6) * 0.06 });
  }
  tx('Umbrella', S * 0.04, css(BRN.dark), cx0 + 206, cy0 + 72, 'l');
  tx('Blocks the rain', S * 0.021, css(BRN.deep), cx0 + 206, cy0 + 112, 'l');
  tx('10s use, 3s cooldown', S * 0.021, css(BRN.deep), cx0 + 206, cy0 + 138, 'l');

  // buy button (darker brown)
  const owned = !!save.owned.umbrella,
    can = save.wallet >= UMB.cost,
    bh = hit(R.buy, st.m) && upg.c > 0.9 && !owned,
    sx = Math.sin(now * 60) * 9 * upg.shake;
  const bx = R.buy[0] + sx,
    by = R.buy[1],
    bw = R.buy[2],
    bhh = R.buy[3];
  let fill = owned ? [0.5, 0.36, 0.28] : bh ? mixc(BRN.deep, BRN.rim, 0.5) : BRN.deep;
  fill = mixc(fill, [0.78, 0.18, 0.12], upg.flash * 0.7);
  rc(bx + 5, by + 7, bw, bhh, [0, 0, 0], 0.3);
  rc(bx, by, bw, bhh, BRN.dark);
  rc(bx + 5, by + 5, bw - 10, bhh - 10, fill);
  rc(bx + 5, by + 5, bw - 10, 8, [1, 1, 1], 0.1);
  const fs = S * 0.042,
    ty = by + bhh / 2;
  if (owned) tx('OWNED', fs, css(BRN.pale), bx + bw / 2, ty, 'c');
  else {
    const label = String(UMB.cost),
      lw = T(label, fs).w,
      ih = fs * 1.1,
      iw = (A.cocoa.w * ih) / A.cocoa.h,
      x0 = bx + bw / 2 - (lw + 10 + iw) / 2;
    tx(label, fs, css(can ? BRN.text : mixc(BRN.text, [0.9, 0.3, 0.25], 0.5)), x0, ty, 'l');
    spr(A.cocoa, x0 + lw + 10 + iw / 2, ty, iw, ih);
  }

  // a locked slot waiting for the next upgrade
  const [dx, dy, dw, dh] = R.card2;
  rc(dx, dy, dw, dh, BRN.deep, 0.55);
  bord(dx, dy, dw, dh, 4, BRN.dark);
  spr(G.disc, dx + 108, dy + dh / 2, 120, 120, { c: BRN.dark, a: 0.5 });
  tx('?', S * 0.06, css(BRN.rim), dx + 108, dy + dh / 2, 'c');
  tx('Coming soon...', S * 0.03, css(BRN.rim), dx + 220, dy + dh / 2, 'l');

  // X button: darker brown box with a lighter brown X
  const [xx, xy, xw, xh] = R.xb,
    xhov = hit(R.xb, st.m);
  rc(xx + 4, xy + 6, xw, xh, [0, 0, 0], 0.3);
  rc(xx, xy, xw, xh, BRN.dark);
  rc(xx + 5, xy + 5, xw - 10, xh - 10, xhov ? mixc(BRN.deep, BRN.rim, 0.5) : BRN.deep);
  tx('X', S * 0.05, css(xhov ? BRN.text : BRN.pale), xx + xw / 2, xy + xh / 2 + 2, 'c');

  fxDraw(fx.panel, now);
}

/* ---------- items: umbrella + hotbar slots ---------- */
const ITEMS = { count: 5, sel: 0 };
const um = { active: false, t: 0, cd: 0, pop: 0 };
function itemReset() {
  um.active = false;
  um.t = um.cd = um.pop = 0;
  ITEMS.sel = 0;
}
// what's in each slot (the other slots are empty for now)
function slotItem(i) {
  return i == 0 && save.owned.umbrella && st.mode == 'story' ? 'umbrella' : null;
}
function itemUse() {
  if (slotItem(ITEMS.sel) != 'umbrella' || um.active || um.cd > 0) return false;
  um.active = true;
  um.t = UMB.time;
  um.pop = 0;
  return true;
}
function itemsUpdate(dt) {
  if (um.active) {
    um.t -= dt;
    um.pop = Math.min(1, um.pop + dt / 0.28);
    if (um.t <= 0) {
      um.active = false;
      um.cd = UMB.cooldown;
    }
  } else um.cd = Math.max(0, um.cd - dt);
}
function umbrellaGeo(mug) {
  const w = MUG.w * 2.1,
    h = (w * A.umbrella.h) / A.umbrella.w,
    yb = (mug.y + mug.cam) * S - MUG.h * 0.5,
    y = yb - h * 0.42;
  return { x: mug.x * S, y: y - h * 0.06, w, h, rx: w * 0.5, ry: h * 0.36 };
}
function drawUmbrella(cx, cy, ang, tint, now) {
  if (!um.active || !A.umbrella) return;
  const pop = easeBack(Math.min(1, um.pop)),
    w = MUG.w * 2.1 * pop,
    h = (w * A.umbrella.h) / A.umbrella.w,
    blink = um.t < 1.6 ? (Math.sin(now * 22) > 0 ? 1 : 0.35) : 1,
    ux = cx + Math.sin((-ang * Math.PI) / 180) * MUG.h * 0.25,
    uy = cy - MUG.h * 0.5 - h * 0.42 + Math.sin(now * 3) * 3;
  if (um.pop < 1) {
    const g = (1 - um.pop) * 0.9; // little glow when it opens
    spr(G.dot, ux, uy, w * 1.7, w * 1.7, { b: 1, c: [0.45 * g, 0.7 * g, g] });
  }
  spr(A.umbrella, ux, uy, w, h, { r: ((-ang * Math.PI) / 180) * 0.6, c: tint, a: blink });
}

const slotPos = (i) => [78 + i * 98, 922],
  SLOT_R = 40;
function slotAt(p) {
  if (st.mode != 'story') return -1;
  for (let i = 0; i < ITEMS.count; i++) {
    const [x, y] = slotPos(i);
    if (Math.hypot(p[0] - x, p[1] - y) <= SLOT_R + 10) return i;
  }
  return -1;
}
// draws part of a ring, starting at the top and going clockwise (f = 0..1 of the circle)
function arcRing(cx, cy, r, th, f, col, a) {
  const n = Math.max(2, Math.ceil(72 * f)),
    seg = (TAU * f) / n;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + seg * (i + 0.5);
    spr(WT, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, r * seg * 1.25, th, {
      r: ang + Math.PI / 2,
      c: col,
      a,
    });
  }
}
function drawSlots(now) {
  if (st.mode != 'story') return;
  for (let i = 0; i < ITEMS.count; i++) {
    const [x, y] = slotPos(i),
      sel = i == ITEMS.sel,
      it = slotItem(i),
      r = SLOT_R * (sel ? 1.14 : 1),
      cooling = it && um.cd > 0 && !um.active;
    spr(G.disc, x, y + 5, (r + 8) * 2, (r + 8) * 2, { c: [0, 0, 0], a: 0.28 });
    spr(G.disc, x, y, (r + 6) * 2, (r + 6) * 2, { c: sel ? BRN.pale : BRN.rim, a: 0.95 });
    spr(G.disc, x, y, r * 2, r * 2, { c: BRN.deep, a: 0.9 });
    if (it == 'umbrella' && A.umbrella) {
      const k = Math.min((r * 1.35) / A.umbrella.w, (r * 1.35) / A.umbrella.h),
        dimc = cooling ? 0.5 : 1;
      spr(A.umbrella, x, y, A.umbrella.w * k, A.umbrella.h * k, { c: [dimc, dimc, dimc] });
      // cooldown ring (grows back to full) or time-left ring (drains) around the slot
      arcRing(x, y, r + 13, 6, 1, [0, 0, 0], 0.35);
      if (um.active) arcRing(x, y, r + 13, 6, Math.max(0.01, um.t / UMB.time), [0.45, 0.85, 1], 0.95);
      else if (um.cd > 0)
        arcRing(x, y, r + 13, 6, Math.max(0.01, 1 - um.cd / UMB.cooldown), [0.9, 0.75, 0.55], 0.9);
      else {
        const p = 0.6 + 0.4 * Math.sin(now * 4);
        arcRing(x, y, r + 13, 6, 1, [1, 0.85, 0.45], 0.7 * p);
        if (sel) spr(G.dot, x, y, r * 3.2, r * 3.2, { b: 1, c: [0.35 * p, 0.28 * p, 0.12 * p] });
      }
      if (um.active) tx(String(Math.ceil(um.t)), 22, '#e8f6ff', x, y + r - 6, 'c');
      else if (cooling) tx(String(Math.ceil(um.cd)), 24, '#fff', x, y, 'c');
    }
    tx(String(i + 1), 17, css(BRN.text), x - r + 2, y - r + 6, 'l');
    if (sel && it && !um.active && um.cd <= 0) tx('E', 20, css(BRN.text), x, y - r - 28, 'c');
  }
}