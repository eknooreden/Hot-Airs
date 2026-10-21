'use strict';

/* ---------- weather: rain from day 2 until day 3 (storm clouds, rain, soaked meter) ---------- */
const RAIN = {
  drainSeconds: 5, // time in the rain (no umbrella) before you're soaked
  ramp: 0.25, // how fast the weather fades in/out (per second)
  slant: -0.3, // sideways speed of a drop compared to its fall speed
  clouds: 22, // size of the storm cloud deck
};
const RAIN_SKY_T = K3(96, 106, 120),
  RAIN_SKY_B = K3(165, 172, 182);
const STORM_TOP = K3(88, 98, 114),
  STORM_BOT = K3(150, 160, 172);

const wx = {
  rain: 0, // current strength 0..1 (eases toward target)
  target: 0,
  wet: 1, // 1 = dry, 0 = soaked
  storm: [],
  drops: [],
  splash: [],
  flash: 0,
  flashT: 8,
  spawnT: 0,
  acc: 0,
};

// rain starts as the second day dawns and clears when the third day begins (story mode only)
const RAIN_FROM = TAU - 0.12,
  RAIN_TO = 2 * TAU - 0.12;
function weatherTarget(score, story) {
  const a = START + (TAU * score) / CYC;
  return story && a >= RAIN_FROM && a < RAIN_TO ? 1 : 0;
}

function spawnStorm(inPlace) {
  const front = wx.storm.length % 2 == 0,
    w = rr(0.5, 1.0) * (front ? 1.15 : 1);
  wx.storm.push({
    idx: (Math.random() * 12) | 0,
    flip: Math.random() < 0.5,
    sq: rr(1.1, 1.5),
    w,
    front,
    x: inPlace ? rr(-0.15, 1) : -w - rr(0, 0.25), // new clouds start off-screen and drift in
    y: front ? rr(-0.05, 0.4) : rr(-0.12, 0.28),
    sp: rr(0.07, 0.16),
    a: front ? 235 : 215,
    col: front ? [0.38, 0.41, 0.47] : [0.62, 0.66, 0.72],
  });
}

function weatherReset(immediate) {
  wx.drops = [];
  wx.splash = [];
  wx.storm = [];
  wx.wet = 1;
  wx.flash = 0;
  wx.acc = 0;
  wx.rain = immediate ? wx.target : 0;
  if (immediate && wx.target > 0) for (let i = 0; i < RAIN.clouds; i++) spawnStorm(true);
}

function splashAt(x, y, n, fromX) {
  for (let i = 0; i < n; i++) {
    const side = fromX == null ? rr(-1, 1) : Math.sign(x - fromX) || 1;
    wx.splash.push({
      x,
      y,
      vx: side * rr(40, 170) + rr(-40, 40),
      vy: -rr(120, 300),
      age: 0,
      life: rr(0.25, 0.5),
      size: rr(3, 6),
    });
  }
}

function weatherUpdate(dt, mug, live) {
  // ease the strength toward the target
  const step = RAIN.ramp * dt;
  wx.rain =
    wx.rain < wx.target ? Math.min(wx.target, wx.rain + step) : Math.max(wx.target, wx.rain - step);

  // storm clouds slide in from the left, then keep drifting across
  if (wx.target > 0 && wx.storm.length < RAIN.clouds && (wx.spawnT -= dt) <= 0) {
    spawnStorm(false);
    wx.spawnT = 0.12;
  }
  for (const c of wx.storm) {
    c.x += c.sp * dt;
    if (c.x > 1.15) {
      if (wx.target > 0) c.x = -c.w - rr(0, 0.2);
      else c.dead = true;
    }
  }
  if (wx.storm.some((c) => c.dead)) wx.storm = wx.storm.filter((c) => !c.dead);

  // rain drops
  if (wx.rain > 0.02) {
    wx.acc += wx.rain * 640 * dt;
    while (wx.acc >= 1 && wx.drops.length < 1100) {
      wx.acc--;
      const z = rr(0.55, 1.1),
        vy = rr(1000, 1400) * z;
      wx.drops.push({
        x: rr(0, 1.45 * S),
        y: -60,
        vy,
        vx: vy * RAIN.slant,
        len: rr(26, 46) * z,
        th: 2.4 * z,
        a: rr(0.35, 0.7) * (0.5 + 0.5 * z),
      });
    }
    wx.acc %= 1;
  }
  const geo = um.active ? umbrellaGeo(mug) : null,
    mugX = mug.x * S,
    mugY = (mug.y + mug.cam) * S;
  for (const d of wx.drops) {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (geo) {
      const nx = (d.x - geo.x) / geo.rx,
        ny = (d.y - geo.y) / geo.ry;
      if (nx * nx + ny * ny < 1) {
        d.dead = true; // the umbrella catches it
        continue;
      }
    } else if (!mug.dead && Math.abs(d.x - mugX) < MUG.w * 0.4 && Math.abs(d.y - mugY) < MUG.h * 0.4) {
      d.dead = true;
      splashAt(d.x, d.y, 2, mugX);
      continue;
    }
    if (d.y > S - 8) {
      d.dead = true;
      if (Math.random() < 0.35) splashAt(d.x, S - 8, 2);
    }
  }
  wx.drops = wx.drops.filter((d) => !d.dead && d.x > -80);

  for (const p of wx.splash) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 900 * dt;
  }
  wx.splash = wx.splash.filter((p) => p.age < p.life);
  if (wx.splash.length > 300) wx.splash.length = 300;

  // lightning flashes
  if (wx.rain > 0.8 && live) {
    wx.flashT -= dt;
    if (wx.flashT <= 0) {
      wx.flash = 1;
      wx.flashT = rr(7, 14);
    }
  }
  wx.flash = Math.max(0, wx.flash - dt * 3);

  // soaked meter: drains in the rain unless the umbrella is up, refills otherwise
  const safe = um.active || wx.rain < 0.6;
  if (live) wx.wet = safe ? Math.min(1, wx.wet + dt * 0.35) : Math.max(0, wx.wet - dt / RAIN.drainSeconds);
}

/* ---------- drawing ---------- */
function stormGeo(c, off) {
  const T_ = makeCloud(c.idx),
    w = S * c.w,
    h = ((T_.h * w) / T_.w) * c.sq;
  return {
    T: T_,
    x: c.x * S + w / 2 + off[0] * 0.25,
    y: c.y * S + off[1] * 0.25,
    w,
    h,
    a: (c.a / 255) * cl(wx.rain * 2.2),
  };
}
function drawStorm(off) {
  for (const front of [false, true])
    for (const c of wx.storm) {
      if (c.front != front) continue;
      const g = stormGeo(c, off);
      if (g.a < 0.01 || g.x - g.w / 2 > S || g.x + g.w / 2 < 0) continue;
      spr(g.T, g.x, g.y, g.w, g.h, { a: g.a, c: c.col, f: c.flip });
    }
}
function drawRain() {
  const k = cl(wx.rain * 1.5);
  // grey, damp veil over the whole scene (darker at night)
  rc(0, 0, S, S, mixc([0.5, 0.55, 0.62], [0.04, 0.05, 0.09], cyc.night), 0.3 * cl(wx.rain));
  for (const d of wx.drops)
    spr(WT, d.x, d.y, d.len, d.th, {
      r: Math.atan2(d.vy, d.vx),
      c: [0.74, 0.84, 0.96],
      a: d.a * k,
    });
  for (const p of wx.splash) {
    const f = p.age / p.life;
    spr(G.dot, p.x, p.y, p.size * 2.4, p.size * 2.4, { c: [0.8, 0.9, 1], a: (1 - f) * 0.8 });
  }
  if (wx.flash > 0.01) rc(0, 0, S, S, [1, 1, 1], wx.flash * 0.42);
}

// bar at the top that drains while you stand in the rain without an umbrella
function drawWetBar(now) {
  const a = cl(wx.rain * 1.6);
  if (a < 0.02) return;
  const w = 340,
    h = 22,
    x = S / 2 - w / 2,
    y = 15,
    f = wx.wet,
    safe = um.active;
  const col = safe
    ? [0.45, 0.85, 1]
    : f > 0.5
      ? mixc([1, 0.85, 0.3], [0.35, 0.75, 1], (f - 0.5) * 2)
      : mixc([1, 0.25, 0.2], [1, 0.85, 0.3], f * 2);
  const pulse = !safe && f < 0.3 ? 0.65 + 0.35 * Math.sin(now * 12) : 1;
  rc(x - 5, y - 5, w + 10, h + 10, BRN.dark, 0.92 * a);
  rc(x, y, w, h, [0.1, 0.07, 0.06], a);
  rc(x, y, w * f, h, col, a * pulse);
  rc(x, y, w * f, h * 0.4, [1, 1, 1], a * 0.22);
  // little water drop icon
  const ix = x - 30,
    iy = y + h / 2;
  spr(WT, ix, iy - 4, 11, 11, { r: Math.PI / 4, c: [0.55, 0.8, 1], a });
  spr(G.disc, ix, iy + 3, 14, 14, { c: [0.55, 0.8, 1], a });
  if (safe) tx('SHELTERED', 15, '#e8f6ff', x + w + 14, iy, 'l', { a });
}