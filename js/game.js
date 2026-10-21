'use strict';

/* ---------- state machine & loop ---------- */
const st = {
  state: 'menu',
  joy: { id: null, kx: 0, ky: 0 },
  mode: 'story',
  pressed: null,
  lastHover: null,
  lastMH: null,
  last: '',
  fa: 0,
  fi: 0.6,
  fiT: 0.6,
  ft: 'mode',
  dlg: null,
  load: null,
  ln: 'play',
  dn: 'menu',
  intro: false,
  norm: [0, 0],
  m: [-1, -1],
  mug: new Mug(),
  cp: 0,
  cpAlt: 0,
  cpCount: 0,
  cpX: 0.5,
  cpY: 0,
  cpCam: 0,
  cpV: null,
  resume: false,
  retryCP: false,
  hs: { story: 0, score: 0 },
  di: { score: 0, best: 0, new: false },
  grace: 0,
  paused: false,
  pc: 0,
  banner: { n: 0, age: null },
  wind: 0,
  keys: {},
  click: null,
  up: null,
  key: null,
  wasDown: false,
  windOn: false,
  paid: 0, // cocoa already banked from the current story run
  base: 0, // score the current run started from (the HUD counts cocoa earned past it)
};
const ord = (n) =>
  n % 100 >= 10 && n % 100 <= 20
    ? n + 'th'
    : n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
const introLines = () => {
  const d = new Date(),
    h = d.getHours() % 12 || 12;
  return [
    String(d.getFullYear()),
    d.toLocaleDateString('en-US', { month: 'long' }) +
      ' ' +
      ord(d.getDate()) +
      ', a ' +
      d.toLocaleDateString('en-US', { weekday: 'long' }),
    h + ':' + String(d.getMinutes()).padStart(2, '0') + (d.getHours() < 12 ? ' AM' : ' PM'),
  ];
};
class Dialogue {
  constructor(l) {
    this.lines = l;
    this.i = 0;
    this.n = 0;
    this.tm = 0.5;
    this.playing = false;
    this.wr = {};
  }
  get text() {
    return this.lines[this.i];
  }
  get done() {
    return this.n >= this.text.length;
  }
  sync() {
    const ty = this.n > 0 && this.n < this.text.length;
    if (ty && !this.playing) {
      try {
        snd.talk.play().catch(() => {});
      } catch (e) {}
      this.playing = true;
    } else if (!ty && this.playing) {
      snd.talk.pause();
      this.playing = false;
    }
  }
  stop() {
    snd.talk.pause();
    this.playing = false;
  }
  update(dt) {
    if (this.done) return;
    this.tm -= dt;
    while (this.tm <= 0 && !this.done) {
      const c = this.text[this.n++];
      this.tm += 0.05 + (',;:'.includes(c) ? 0.2 : '.!?'.includes(c) ? 0.4 : 0);
    }
    this.sync();
  }
  advance() {
    if (!this.done) {
      this.n = this.text.length;
      this.sync();
      return false;
    }
    this.i++;
    this.n = 0;
    this.tm = 0.35;
    this.sync();
    return this.i >= this.lines.length;
  }
  wrap(w, sz) {
    if (this.wr[this.i]) return this.wr[this.i];
    const t = this.text,
      out = [];
    let s = null,
      e = 0;
    for (const m of t.matchAll(/\S+/g)) {
      if (s == null) {
        s = m.index;
        e = m.index + m[0].length;
      } else if (tw(t.slice(s, m.index + m[0].length), sz) <= w) e = m.index + m[0].length;
      else {
        out.push([s, e]);
        s = m.index;
        e = m.index + m[0].length;
      }
    }
    if (s != null) out.push([s, e]);
    return (this.wr[this.i] = out);
  }
}
class Loading {
  constructor() {
    this.el = 0;
    this.cyc = 2 * 0.2 + 0.35 + 0.25;
    this.total = Math.max(1, Math.round(rr(3, 7) / this.cyc)) * this.cyc;
  }
  get done() {
    return this.el >= this.total;
  }
  update(dt) {
    this.el += dt;
  }
  alpha() {
    return Math.max(
      0,
      Math.min(Math.min(1, this.el / 0.4), Math.min(1, (this.total - this.el) / 0.25)),
    );
  }
  jumps() {
    if (this.done) return [0, 0, 0];
    const ph = this.el % this.cyc;
    return [0, 1, 2].map((i) => {
      const p = (ph - i * 0.2) / 0.35;
      return p >= 0 && p <= 1 ? Math.sin(Math.PI * p) : 0;
    });
  }
}
const R = {
  play: { ax: 350, ay: 800, amp: 12, sp: 2.1, ph: 0, t: 'play' },
  up: { ax: 600, ay: 820, amp: 14, sp: 1.7, ph: 2.4, t: 'up' },
};
const BH = S * 0.13,
  btnW = (n) => (A[n].w * BH) / A[n].h,
  MH = S * 0.24;
const modeRect = {
    story: [(S - 460) / 2, 360, 460, 120],
    score: [(S - 460) / 2, 360 + 120 + 50, 460, 120],
  },
  cpRect = (i) => [80 + (i % 3) * 290, 200 + Math.floor(i / 3) * 130, 260, 100],
  skipR = () => {
    const w = tw('skip all', S * 0.03) + 50,
      h = S * 0.03 * 1.35 + 24;
    return [S - 30 - w, 30, w, h];
  },
  hit = (r, p) => p[0] >= r[0] && p[0] <= r[0] + r[2] && p[1] >= r[1] && p[1] <= r[1] + r[3];
const DP = [S * 0.19, S * 0.62 * 1 - (S * 0.46) / 2 + 0, S * 0.62, S * 0.46];
DP[0] = (S - S * 0.62) / 2;
DP[1] = S * 0.62 - S * 0.23;
const DR = {
  menu: [
    DP[0] + DP[2] / 2 - S * 0.02 - S * 0.25,
    DP[1] + DP[3] - S * 0.05 - S * 0.085,
    S * 0.25,
    S * 0.085,
  ],
  retry: [
    DP[0] + DP[2] / 2 + S * 0.02,
    DP[1] + DP[3] - S * 0.05 - S * 0.085,
    S * 0.25,
    S * 0.085,
  ],
};
// ---- on-screen joystick (always shown) ----
const JOY = { cx: 830, cy: 830, r: 105, kr: 48 }; // bottom-right, the item slots live bottom-left

function setJoy(p) {
  const dx = p[0] - JOY.cx,
    dy = p[1] - JOY.cy,
    d = Math.hypot(dx, dy) || 1,
    k = Math.min(1, JOY.r / d);
  st.joy.kx = dx * k;
  st.joy.ky = dy * k;
}
function releaseJoy() {
  st.joy.id = null;
  st.joy.kx = 0;
  st.joy.ky = 0;
}
// horizontal stick value, -1..1, with a small dead zone
function joyAxis() {
  const v = st.joy.kx / JOY.r;
  return Math.abs(v) > 0.15 ? v : 0;
}
function drawJoy() {
  const on = st.joy.id != null;
  spr(G.disc, JOY.cx, JOY.cy, JOY.r * 2, JOY.r * 2, { a: 0.3 });
  spr(G.disc, JOY.cx, JOY.cy, JOY.r * 2 - 10, JOY.r * 2 - 10, { c: [0, 0, 0], a: 0.3 });
  spr(G.disc, JOY.cx + st.joy.kx, JOY.cy + st.joy.ky, JOY.kr * 2, JOY.kr * 2, {
    a: on ? 0.8 : 0.5,
  });
}

function setState(s) {
  st.state = s;
}
function startPlay() {
  const m = st.mug,
    r = st.resume;
  if (r) {
    st.resume = false;
    st.retryCP = false;
    m.reset();
    m.cause = null;
    m.best = st.cpAlt;
    m.x = st.cpX;
    m.y = st.cpY;
    m.cam = st.cpCam;
    m.started = true;
    st.base = m.score;
    cyc.story = true;
    cyc.reset();
    cyc.update(0, m.score);
    sky.reset(m.cam);
    sky.night = cyc.night;
    if (st.cpV) {
      const v = JSON.parse(JSON.stringify(st.cpV));
      Object.assign(vines, v);
    } else vines.reset(m.fy - st.cpAlt, st.cpCount);
    vines.night = cyc.night;
    st.grace = 3;
    wx.target = weatherTarget(m.score, true);
    weatherReset(true);
    itemReset();
  } else {
    m.reset();
    m.cause = null;
    st.paid = 0;
    st.base = 0;
    sky.reset(m.cam);
    cyc.story = st.mode == 'story';
    cyc.reset();
    cyc.update(0, 0);
    sky.night = cyc.night;
    vines.reset(m.fy);
    vines.night = cyc.night;
    if (st.mode == 'story') {
      st.cp = 0;
      st.retryCP = false;
      st.cpAlt = 0;
      st.cpCount = 0;
      st.cpX = 0.5;
      st.cpY = m.fy;
      st.cpCam = 0;
      st.cpV = null;
    }
    st.grace = 0;
    st.banner.age = null;
    wx.target = 0;
    weatherReset(true);
    itemReset();
  }
}
// start a story run from checkpoint cp (0 = the very beginning)
function beginStory(cp) {
  const m = st.mug,
    alt = (cp * CP) / 5; // altitude that scores cp * CP
  st.mode = 'story';
  st.cp = cp;
  st.cpAlt = alt;
  st.cpX = 0.5;
  st.cpY = m.fy - alt;
  st.cpCam = cp ? CAM - st.cpY : 0;
  st.cpCount = 0;
  st.cpV = null;
  st.paid = cp * CP; // only cocoa earned past the starting point is paid out
  st.resume = cp > 0;
  st.retryCP = false;
  st.ln = cp == 0 && !st.intro ? 'intro' : 'play';
  st.intro = true;
  st.load = new Loading();
  setState('loading');
}
function onDown(p, id) {
  st.m = p;
  const s = st.state;
  if (s == 'intro') {
    if (hit(skipR(), p)) {
      st.dlg.stop();
      sfx(snd.click);
      st.fa = 0;
      setState('intro_fade');
    } else adv();
    return;
  }
  if (s == 'menu') {
    if (upg.open) {
      upgClick(p);
      return;
    }
    if (hit(rectOf('play'), p)) st.pressed = 'play';
    else if (hit(rectOf('up'), p)) st.pressed = 'up';
    return;
  }
  if (s == 'mode') {
    const c = hit(modeRect.story, p) ? 'story' : hit(modeRect.score, p) ? 'score' : null;
    if (!c) return;
    sfx(snd.click);
    st.mode = c;
    if (c == 'story') {
      setState('cpsel');
      return;
    }
    st.resume = false;
    st.ln = 'play';
    st.load = new Loading();
    setState('loading');
    return;
  }
  if (s == 'cpsel') {
    for (let i = 0; i <= 10; i++)
      if (i <= (save.maxCp | 0) && hit(cpRect(i), p)) {
        sfx(snd.click);
        beginStory(i);
        return;
      }
    return;
  }
  if (s == 'play') {
    const m = st.mug;
    if (st.paused) {
      // tap/click to resume (Esc / P also work)
      st.paused = false;
      st.pc = 3;
      return;
    }
    if (st.pc > 0) return;
    // tapping an item slot selects it (tap the selected one again to use it)
    const si = m.dead ? -1 : slotAt(p);
    if (si >= 0) {
      if (ITEMS.sel == si) {
        if (itemUse()) sfx(snd.click);
      } else {
        ITEMS.sel = si;
        sfx(snd.sel);
      }
      return;
    }
    // touching the bottom-right corner grabs the joystick instead of flapping
    if (!m.dead && p[0] > 580 && p[1] > 600) {
      st.joy.id = id;
      setJoy(p);
      return;
    }
    if (m.dead) {
      if (m.dt >= 1.7) {
        if (hit(DR.retry, p)) deathAct('retry');
        else if (hit(DR.menu, p)) deathAct('menu');
      }
    } else if (m.flap()) sfx(snd.hop);
  }
}
function adv() {
  if (st.dlg.advance()) {
    st.dlg.stop();
    st.dlg.i = st.dlg.lines.length - 1;
    st.dlg.n = st.dlg.text.length;
    st.fa = 0;
    setState('intro_fade');
  }
}
function onUp(p) {
  if (st.state == 'menu' && st.pressed) {
    const b = st.pressed;
    if (hit(rectOf(b), p)) {
      sfx(snd.click);
      if (b == 'play') {
        st.ft = 'mode';
        st.fa = 0;
        setState('fade');
      } else if (b == 'up') upgOpen();
    }
    st.pressed = null;
  }
}
function deathAct(a) {
  if (st.state != 'play' || !st.mug.dead || st.dact) return;
  st.dact = a;
}
function onKey(e) {
  const k = e.key,
    s = st.state;
  if (['ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
  if (k == 'Escape' || k == 'p' || k == 'P') {
    if (s == 'play' && !st.mug.dead) {
      if (st.paused) {
        st.paused = false;
        st.pc = 3;
      } else {
        st.paused = true;
        st.pc = 0;
      }
      return;
    }
    if (s == 'menu' && upg.open) {
      upgClose();
      return;
    }
    if (s == 'cpsel') {
      setState('mode');
      st.lastMH = null;
      return;
    }
    if (s == 'mode') {
      setState('menu');
      st.pressed = null;
      st.fi = st.fiT = 0.6;
      return;
    }
    if (s == 'play' && st.mug.dead && st.mug.dt >= 1.7) deathAct('menu');
    return;
  }
  if (s == 'intro') {
    adv();
    return;
  }
  if (s == 'play') {
    const m = st.mug;
    if (st.paused || st.pc > 0) return;
    if (!m.dead) {
      // 1-5 pick an item slot, E uses the selected one
      const dg = /^(Digit|Numpad)([1-5])$/.exec(e.code || '');
      if (dg) {
        ITEMS.sel = +dg[2] - 1;
        sfx(snd.sel);
        return;
      }
      if (e.code == 'KeyE') {
        if (!e.repeat && itemUse()) sfx(snd.click);
        return;
      }
    }
    if (m.dead) {
      if (k == 'Enter' && m.dt >= 1.7) deathAct('retry');
    } else if ([' ', 'ArrowUp', 'w', 'W'].includes(k) && !e.repeat && m.flap()) sfx(snd.hop);
  }
}
function rectOf(n) {
  const r = R[n],
    t = performance.now() / 1e3,
    off = [st.norm[0] * S * 0.02, st.norm[1] * S * 0.02],
    w = btnW(n == 'play' ? 'play' : 'up'),
    cx = r.ax + off[0] * 0.25,
    cy = r.ay + Math.sin(t * r.sp + r.ph) * r.amp + off[1] * 0.25;
  return [cx - w / 2, cy - BH / 2, w, BH, cx, cy];
}
let last = performance.now(),
  tNow = 0;
function frame(nowMs) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (nowMs - last) / 1e3);
  last = nowMs;
  tNow = nowMs / 1e3;
  if (!A.bored) return;
  tick(dt, tNow);
}
function tick(dt, t) {
  const d = devicePixelRatio || 1,
    cw = (innerWidth * d) | 0,
    ch = (innerHeight * d) | 0;
  if (cvs.width != cw || cvs.height != ch) {
    cvs.width = cw;
    cvs.height = ch;
  }
  side = Math.max(200, Math.min(cw, ch));
  vx0 = ((cw - side) / 2) | 0;
  vy0 = ((ch - side) / 2) | 0;
  TK = side / S;
  const s = st,
    m = s.mug;
  if (s.dact && s.state == 'play' && m.dead) {
    const a = s.dact;
    s.dact = null;
    if (a == 'retry') {
      s.resume = s.mode == 'story' && s.cp > 0;
      if (s.mode == 'story') s.retryCP = false;
      s.dn = 'play';
    } else {
      s.resume = false;
      if (s.mode == 'story') s.retryCP = s.cp > 0;
      s.dn = 'menu';
    }
    s.fa = 0;
    setState('death_fade');
  }
  const tgx = -(cl(s.m[0] / S) - 0.5) * 2,
    tgy = -(cl(s.m[1] / S) - 0.5) * 2;
  s.norm[0] += (tgx - s.norm[0]) * 0.08;
  s.norm[1] += (tgy - s.norm[1]) * 0.08;
  const off = [s.norm[0] * S * 0.02, s.norm[1] * S * 0.02];
  if (s.state != 'menu') s.lastHover = null;
  if (s.state != 'play' && s.joy.id != null) releaseJoy();
  if (s.state != 'mode' && s.state != 'cpsel') s.lastMH = null;
  if (s.state == 'play' && s.last != 'play') startPlay();
  s.last = s.state;
  gl.viewport(0, 0, cw, ch);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  let fadeOver = 0,
    shake = false;
  const finish = () => {
    flush();
  };
  // --- update
  if (s.state == 'menu' || s.state == 'fade') {
    upgUpdate(dt, t);
    menuFxUpdate(dt, t, off);
  }
  if (s.state == 'fade') {
    s.fa += dt / 0.9;
    if (s.fa >= 1) {
      s.pressed = null;
      s.fi = s.fiT = 0.6;
      setState('mode');
    }
  } else if (s.state == 'loading') {
    s.load.update(dt);
    if (s.load.done) {
      sfx(snd.done);
      if (s.ln == 'intro') s.dlg = new Dialogue([...introLines(), ...STORY]);
      else if (s.ln == 'menu') s.pressed = null;
      s.fiT = s.ln == 'play' ? 1.2 : 0.6;
      s.fi = s.fiT;
      setState(s.ln);
    }
  } else if (s.state == 'intro') s.dlg.update(dt);
  else if (s.state == 'intro_fade') {
    s.fa += dt / 0.8;
    if (s.fa >= 1) {
      s.fiT = 1.2;
      s.fi = 1.2;
      setState('play');
    }
  } else if (s.state == 'play') {
    const k = s.keys,
      mv = Math.max(
        -1,
        Math.min(1, (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0) + joyAxis()),
      ),
      was = m.dead;
    if (s.paused) {
    } else if (s.pc > 0) {
      s.pc = Math.max(0, s.pc - dt);
      m.vx = m.vy = 0;
    } else if (s.grace > 0 && !m.dead) {
      s.grace = Math.max(0, s.grace - dt);
      m.vx = m.vy = 0;
    } else m.update(dt, mv);
    const run = !s.paused && s.pc <= 0;
    if (run && s.grace <= 0) vines.update(dt, m.cam, m.y + m.cam, m.score);
    if (run && !m.dead && s.grace <= 0 && vineHit(m, vines.time)) m.die();
    if (run) {
      wx.target = weatherTarget(m.score, s.mode == 'story');
      weatherUpdate(dt, m, s.grace <= 0 && !m.dead);
      if (!m.dead) itemsUpdate(dt);
      if (!m.dead && s.grace <= 0 && wx.wet <= 0) {
        m.cause = 'rain'; // soaked!
        m.die();
      }
    }
    if (m.dead && !was) {
      const sc = Math.max(0, Math.floor(m.score)),
        nb = sc > s.hs[s.mode];
      if (nb) s.hs[s.mode] = save.hs[s.mode] = sc;
      s.di = { score: sc, best: s.hs[s.mode], new: nb && sc > 0 };
      if (s.mode == 'story') {
        // bank this run's cocoa (a retry from a checkpoint doesn't pay twice)
        const gain = Math.max(0, sc - s.paid);
        s.paid = Math.max(s.paid, sc);
        save.wallet += gain;
      }
      sfx(snd.death);
    }
    if (run) {
      cyc.update(dt, m.score);
      if (s.banner.age != null) {
        s.banner.age += dt;
        if (s.banner.age >= 5) s.banner.age = null;
      }
    }
    const reach = Math.min(10, Math.floor(m.score / CP));
    if (s.mode == 'story' && reach > s.cp && !m.dead) {
      s.cp = reach;
      save.maxCp = Math.max(save.maxCp, reach);
      s.cpAlt = m.best;
      s.cpX = m.x;
      s.cpY = m.y;
      s.cpCam = m.cam;
      s.cpCount = vines.count;
      s.cpV = JSON.parse(
        JSON.stringify({
          bars: vines.bars,
          time: vines.time,
          count: vines.count,
          score: vines.score,
          lastX: vines.lastX,
          nextY: vines.nextY,
        }),
      );
      s.banner.n = reach;
      s.banner.age = 0;
      sfx(snd.done);
    }
    sky.night = cyc.night;
    vines.night = cyc.night;
    if (run) sky.update(dt, m.cam, !m.dead);
  } else if (s.state == 'death_fade') {
    m.update(dt, 0);
    sky.update(dt, m.cam, false);
    vines.update(dt, m.cam, m.y + m.cam, m.score);
    s.fa += dt / 0.6;
    if (s.fa >= 1) {
      s.load = new Loading();
      s.ln = s.dn;
      setState('loading');
    }
  }
  // wind
  const wt = s.state == 'play' && !m.dead ? 0.22 : 0;
  s.wind += (wt - s.wind) * Math.min(1, 2 * dt);
  if (s.wind > 0.002) {
    if (!s.windOn) {
      try {
        snd.wind.play().catch(() => {});
      } catch (e) {}
      s.windOn = true;
    }
    snd.wind.volume = Math.min(1, s.wind);
  } else if (s.windOn) {
    snd.wind.pause();
    s.windOn = false;
  }
  const rt = (s.state == 'play' || s.state == 'death_fade') && !s.paused ? wx.rain * 0.55 : 0;
  s.rainV = (s.rainV || 0) + (rt - (s.rainV || 0)) * Math.min(1, 3 * dt);
  if (s.rainV > 0.01) {
    if (!s.rainOn) {
      try {
        snd.rain.play().catch(() => {});
      } catch (e) {}
      s.rainOn = true;
    }
    snd.rain.volume = Math.min(1, s.rainV);
  } else if (s.rainOn) {
    snd.rain.pause();
    s.rainOn = false;
  }
  // --- draw
  if (s.state != 'play' && s.state != 'death_fade') shk = [0, 0];
  gl.viewport(vx0 + shk[0], vy0 + shk[1], side, side);
  let mc = null;
  if (s.state == 'menu' || s.state == 'fade') {
    spr(A.bg, S / 2 + off[0], S / 2 + off[1], S * 1.04, S * 1.04);
    fxDraw(fx.mid, t);
    fxDraw(fx.back, t);
    const happy = hit(rectOf('play'), s.m) && s.state == 'menu' && !upg.open;
    const bob = Math.sin(t * 1.5) * S * 0.015,
      mi = happy ? A.happy : A.bored;
    spr(mi, S * 0.88 + off[0] * 0.15, S * 0.8 + bob + off[1] * 0.15, (MH * mi.w) / mi.h, MH);
    let hov = null;
    for (const n of ['play', 'up']) {
      const r = rectOf(n),
        h = s.state == 'menu' && !upg.open && hit(r, s.m),
        p = h && s.pressed == n,
        w = btnW(n == 'play' ? 'play' : 'up'),
        tn = n == 'play' ? A.play : A.up;
      if (h) hov = n;
      spr(tn, r[4], r[5], w * (h ? 1.08 : 1), BH * (h ? 1.08 : 1), {
        c: p ? [0.627, 0.627, 0.627] : h ? [0.843, 0.843, 0.843] : WH,
      });
    }
    fxDraw(fx.top, t);
    if (s.state == 'menu' && hov == 'up') {
      const r = rectOf('up'),
        sz = S * 0.022,
        txt = 'Only applies to Story Mode',
        w = T(txt, sz).w + S * 0.024,
        h = T(txt, sz).h + S * 0.024;
      let bx = Math.max(0, Math.min(S - w, r[4] - w / 2)),
        by = Math.max(0, r[1] - S * 0.012 - h);
      rc(bx, by, w, h, [0, 0, 0]);
      bord(bx, by, w, h, 3, WH);
      tx(txt, sz, '#fff', bx + w / 2, by + h / 2, 'c');
    }
    if (!upg.open) drawWallet(S * 0.03, S * 0.03 + S * 0.03, S * 0.045, '#fff', '#000');
    upgDraw(t);
    if (s.state == 'menu') {
      if (hov && hov != s.lastHover) sfx(snd.sel);
      s.lastHover = hov;
    } else fadeOver = cl(s.fa);
  } else if (s.state == 'mode') {
    const ts = S * 0.018;
    tx(
      'Still In Progress',
      ts,
      '#fff',
      modeRect.story[0] + modeRect.story[2] / 2,
      modeRect.story[1] - S * 0.012 - ts * 0.6,
      'c',
    );
    let hv = null;
    for (const [k, l] of [
      ['story', 'Story Mode'],
      ['score', 'Score'],
    ]) {
      const r = modeRect[k],
        h = hit(r, s.m);
      if (h) hv = k;
      rc(r[0], r[1], r[2], r[3], h ? [225 / 255, 225 / 255, 225 / 255] : WH);
      tx(l, S * 0.05, '#000', r[0] + r[2] / 2, r[1] + r[3] / 2, 'c');
    }
    if (hv && hv != s.lastMH) sfx(snd.sel);
    s.lastMH = hv;
  } else if (s.state == 'cpsel') {
    tx('Select Checkpoint', S * 0.06, '#fff', S / 2, 110, 'c');
    tx('Esc to go back', S * 0.018, '#aaa', S / 2, 160, 'c');
    let hv = null;
    for (let i = 0; i <= 10; i++) {
      const r = cpRect(i),
        open = i <= (save.maxCp | 0),
        h = open && hit(r, s.m);
      if (h) hv = i;
      rc(r[0], r[1], r[2], r[3], !open ? [0.25, 0.25, 0.25] : h ? [225 / 255, 225 / 255, 225 / 255] : WH);
      tx(i ? 'Checkpoint ' + i : 'Start', S * 0.03, open ? '#000' : '#666', r[0] + r[2] / 2, r[1] + r[3] / 2 - 12, 'c');
      tx(open ? i * CP + ' cocoa' : 'Locked', S * 0.018, open ? '#555' : '#666', r[0] + r[2] / 2, r[1] + r[3] / 2 + 26, 'c');
    }
    if (hv != null && hv !== s.lastMH) sfx(snd.sel);
    s.lastMH = hv;
  } else if (s.state == 'loading') {
    const a = s.load.alpha(),
      j = s.load.jumps();
    for (let i = 0; i < 3; i++) {
      const x = S / 2 + (i - 1) * S * 0.09,
        y = S * 0.88 - j[i] * S * 0.06,
        r = S * 0.025;
      spr(G.disc, x, y, r * 2, r * 2, { a });
    }
  } else if (s.state == 'intro' || s.state == 'intro_fade') {
    const bx = 40,
      by = S - 40 - 260,
      bw = S - 80,
      bh = 260,
      pad = S * 0.03,
      sz = S * 0.036,
      dl = s.dlg;
    rc(bx, by, bw, bh, [0, 0, 0]);
    bord(bx, by, bw, bh, 5, WH);
    let y = by + pad + sz * 0.6;
    for (const [a, b] of dl.wrap(bw - 2 * pad, sz)) {
      if (dl.n <= a) break;
      tx(dl.text.slice(a, Math.min(b, dl.n)), sz, '#fff', bx + pad, y, 'l');
      y += sz * 1.25;
    }
    tx(
      'press any button to continue',
      S * 0.022,
      '#fff',
      bx + bw - pad * 0.6,
      by + bh - pad * 0.4 - S * 0.011,
      'r',
    );
    const sr = skipR(),
      h = s.state == 'intro' && hit(sr, s.m);
    rc(sr[0], sr[1], sr[2], sr[3], h ? [215 / 255, 215 / 255, 215 / 255] : WH);
    tx('skip all', S * 0.03, '#000', sr[0] + sr[2] / 2, sr[1] + sr[3] / 2, 'c');
    if (s.state == 'intro_fade') fadeOver = cl(s.fa);
  } else if (s.state == 'play' || s.state == 'death_fade') {
    if (!cyc.dm) cyc.reset();
    mc = drawGame(off, t, m);
    if (!m.dead) banner(s.banner);
    const cd = s.pc > 0 ? s.pc : s.grace;
    if (!m.dead && cd > 0) {
      const lb = 'READY IN ' + Math.max(1, Math.ceil(cd)),
        sz = S * 0.075,
        w = T(lb, sz).w + S * 0.08,
        h = T(lb, sz).h + S * 0.035;
      rc(S / 2 - w / 2, S * 0.22 - h / 2, w, h, [8 / 255, 12 / 255, 28 / 255], 0.69);
      tx(lb, sz, '#fff5d2', S / 2, S * 0.22, 'c');
    }
    hud(m, mc, s.mode == 'story');
    if (!m.dead && !s.paused) {
      drawJoy();
      drawSlots(t);
      drawWetBar(t);
    }
    if (s.paused) {
      rc(0, 0, S, S, [3 / 255, 5 / 255, 16 / 255], 0.69);
      tx('PAUSED', S * 0.1, '#f5f5ff', S / 2, S * 0.43, 'c');
      tx('Press ESC or tap to resume', S * 0.032, '#cdd7f5', S / 2, S * 0.53, 'c');
    }
    if (m.dead) deathPopup(m);
    if (s.state == 'death_fade') fadeOver = cl(s.fa);
    shake = true;
  }
  if (fadeOver > 0) rc(0, 0, S, S, [0, 0, 0], fadeOver);
  if (missingFiles.length) {
    tx(
      'Missing ' + missingFiles.length + ' file(s): ' + missingFiles.slice(0, 3).join(', '),
      S * 0.016,
      '#ff6b6b',
      S / 2,
      S - 14,
      'c',
    );
  }
  if (s.fi > 0) {
    s.fi = Math.max(0, s.fi - dt);
    rc(0, 0, S, S, [0, 0, 0], s.fi / s.fiT);
  }
  flush();
  if (shake && (shk[0] || shk[1])) {
  }
}
function deathPopup(m) {
  const t = m.dt - 1.3;
  if (t < 0) return;
  const p = cl(t / 0.35),
    c1 = 1.70158,
    c3 = c1 + 1,
    e = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2),
    sc = 0.55 + 0.45 * e,
    cx = DP[0] + DP[2] / 2,
    cy = DP[1] + DP[3] / 2,
    a = p < 1 ? cl(p * 2) : 1,
    tf = (x, y) => [cx + (x - cx) * sc, cy + (y - cy) * sc],
    di = st.di;
  const [x0, y0] = tf(DP[0], DP[1]);
  rc(x0, y0, DP[2] * sc, DP[3] * sc, [0, 0, 0], a);
  bord(
    x0,
    y0,
    DP[2] * sc,
    DP[3] * sc,
    5 * sc,
    WH.map((v) => v),
  );
  const tt = (s, sz, col, x, y) => {
    const [px, py] = tf(x, y);
    tx(s, sz * sc, col, px, py, 'c', { a });
  };
  tt(st.mug.cause == 'rain' ? 'Soaked!' : 'You Died!', S * 0.075, '#fff', cx, DP[1] + DP[3] * 0.07 + S * 0.05);
  let y = DP[1] + DP[3] * 0.34 + S * 0.02;
  for (const s of ['Score: ' + di.score, 'Highest Score: ' + di.best]) {
    tt(s, S * 0.036, '#fff', cx, y);
    y += S * 0.036 * 1.35 + DP[3] * 0.04;
  }
  if (di.new) tt('New Best!', S * 0.022, '#ffde96', cx, y + S * 0.01);
  for (const [k, l] of [
    ['menu', 'Menu'],
    ['retry', 'Try Again'],
  ]) {
    const r = DR[k],
      h = hit(r, st.m),
      [px, py] = tf(r[0], r[1]);
    rc(px, py, r[2] * sc, r[3] * sc, h ? [225 / 255, 225 / 255, 225 / 255] : WH, a);
    tt(l, S * 0.036, '#000', r[0] + r[2] / 2, r[1] + r[3] / 2);
  }
}