'use strict';

/* ---------- game logic ---------- */
const cyc = {
  story: true,
  score: 0,
  show: 0,
  reset() {
    this.score = 0;
    this.show = 0;
    this.refresh();
    this.dm = [...this.mp];
  },
  refresh() {
    const a = START + (TAU * this.score) / CYC,
      s = Math.sin(a),
      c = Math.cos(a);
    this.sp = [0.5 - 0.45 * c, 0.9 - 0.84 * s];
    this.mp = [0.5 + 0.45 * c, 0.9 + 0.84 * s];
    const day = sm((s + 0.3) / 0.62);
    this.night = 1 - day;
    this.warm = Math.exp(-((s / 0.22) ** 2));
    this.sv = sm((s + 0.1) / 0.25);
    this.mv = sm((0.1 - s) / 0.25) * (0.2 + 0.8 * this.night);
    this.stv = sm((this.night - 0.3) / 0.7);
    const k = Math.max(0, Math.floor((a - Math.PI) / TAU));
    this.ph = k % 8;
    this.full = this.ph == 4 || (this.story && this.score >= CP * 9);
    this.showA = this.ph == 4 && ((a - Math.PI - TAU * k) / TAU) * CYC >= 6;
  },
  update(dt, sc) {
    this.score = sc;
    this.refresh();
    const e = 1 - Math.exp(-3.5 * Math.max(0, dt));
    this.dm = [
      this.dm[0] + (this.mp[0] - this.dm[0]) * e,
      this.dm[1] + (this.mp[1] - this.dm[1]) * e,
    ];
    this.show = this.showA ? this.show + dt : 0;
  },
  glow() {
    if (!this.showA) return [1, 1];
    const a = this.show;
    if (a < 4.5) return [1 + 1.2 * Math.sin(((a / 4.5) * Math.PI) / 2), 1 + sm(a)];
    if (a < 11.5) {
      const e = 0.5 + 0.5 * Math.cos(((a - 4.5) / 7) * Math.PI);
      return [1.2 + e, 1.15 + 0.85 * e];
    }
    return [1.2, 1.15];
  },
  sky() {
    let t = mixc(SKY, NT, this.night),
      b = mixc(SKY, NB, this.night);
    return [mixc(t, DT, this.warm * 0.7), mixc(b, DB, this.warm * 0.85)];
  },
  tint() {
    return mixc(mixc(WH, NTI, this.night), DTI, this.warm * 0.45);
  },
  ctint() {
    return mixc(mixc(WH, NCT, this.night), DCT, this.warm * 0.6);
  },
};
class Mug {
  constructor() {
    this.reset();
  }
  get fy() {
    return 1 - GP - MUGH / 2;
  }
  get hw() {
    return MUG.w / S / 2;
  }
  get hh() {
    return MUGH / 2;
  }
  get score() {
    return this.best * 5;
  }
  reset() {
    Object.assign(this, {
      x: 0.5,
      y: this.fy,
      vx: 0,
      vy: 0,
      angle: 0,
      av: 0,
      facing: 1,
      happy: false,
      started: false,
      dead: false,
      dt: 0,
      dx: 0.5,
      dy: this.fy,
      da: 0,
      best: 0,
      cam: 0,
      puffs: [],
    });
  }
  flap() {
    if (this.dead) return false;
    for (let i = 0; i < 6; i++)
      this.puffs.push({
        x: this.x + rr(-this.hw, this.hw) * 0.7,
        y: this.y + this.hh * rr(0.5, 0.9),
        vx: rr(-0.06, 0.06),
        vy: rr(0.02, 0.09),
        age: 0,
        life: rr(0.45, 0.8),
        size: rr(0.01, 0.02),
        alpha: (rr(0.6, 1) * 95) / 255,
      });
    this.vy = -FLAP;
    this.av += SPIN * this.facing;
    this.happy = true;
    return true;
  }
  die() {
    this.dead = true;
    this.dt = 0;
    this.dx = this.x;
    this.dy = this.y + this.cam;
    this.da = this.angle;
  }
  update(dt, mv) {
    for (const p of this.puffs) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
    }
    this.puffs = this.puffs.filter((p) => p.age < p.life);
    if (this.dead) {
      this.dt += dt;
      return;
    }
    if (mv > 0) this.facing = 1;
    else if (mv < 0) this.facing = -1;
    if (mv) this.happy = true;
    this.vx += (mv * MOVE - this.vx) * Math.min(1, SMOOTHM * dt);
    this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const tt = -this.vx * TILTX - this.vy * TILTY * this.facing;
    this.av += (SPRING * (tt - this.angle) - DAMP * this.av) * dt;
    this.angle = Math.max(-MAXTILT, Math.min(MAXTILT, this.angle + this.av * dt));
    if (this.x < this.hw) {
      this.x = this.hw;
      this.vx = 0;
    } else if (this.x > 1 - this.hw) {
      this.x = 1 - this.hw;
      this.vx = 0;
    }
    const fl = this.fy - this.cam;
    if (this.y >= fl) {
      this.y = fl;
      this.vy = 0;
      if (this.started) this.die();
    } else this.started = true;
    if (!this.dead && this.y + this.cam < CAM) this.cam = CAM - this.y;
    this.best = Math.max(this.best, this.fy - this.y);
  }
}
const sky = {
  reset(cam) {
    this.clouds = [];
    this.fg = [];
    this.fgT = rr(2, 5);
    this.streaks = [];
    this.cT = rr(1.5, 3.5);
    this.sT = rr(0.2, 0.8);
    this.night = 0;
    this.shoot = [];
    this.shT = rr(5, 12);
    for (let i = 0, n = 2 + ((Math.random() * 2) | 0); i < n; i++) this.spawn(cam, true);
    this.spawn(cam, true, true);
  },
  spawn(cam, any, fgd) {
    if (fgd) {
      const f = rr(1.15, 1.5),
        w = rr(0.55, 1.1);
      this.fg.push({
        idx: (Math.random() * 12) | 0,
        flip: Math.random() < 0.5,
        sq: pk([0.8, 1, 1.25]),
        f,
        w,
        a: pk([45, 60, 75]),
        sp: rr(0.05, 0.11),
        x: any ? rr(0, 0.8) : -w,
        y: rr(0.1, 0.85) - cam * f,
      });
      return;
    }
    const f = rr(0.35, 0.8),
      ro = Math.random(),
      w = ro < 0.35 ? rr(0.12, 0.25) : ro < 0.75 ? rr(0.25, 0.5) : rr(0.55, 1);
    this.clouds.push({
      idx: (Math.random() * 12) | 0,
      flip: Math.random() < 0.5,
      sq: pk([0.8, 1, 1, 1.25]),
      f,
      w,
      a: pk([150, 180, 215]),
      sp: rr(0.012, 0.055),
      x: any ? rr(0.05, 0.9) : -w,
      y: rr(0.04, 0.7) - cam * f,
    });
  },
  update(dt, cam, spn) {
    for (const c of this.clouds) c.x += c.sp * dt;
    this.clouds = this.clouds.filter((c) => c.x < 1.05 && c.y + cam * c.f < 1.2);
    if ((this.cT -= dt) <= 0) {
      this.cT = rr(2.5, 6);
      if (spn && this.clouds.length < 6) this.spawn(cam);
    }
    for (const c of this.fg) c.x += c.sp * dt;
    this.fg = this.fg.filter((c) => c.x < 1.1 && c.y + cam * c.f < 1.3);
    if ((this.fgT -= dt) <= 0) {
      this.fgT = rr(5, 10);
      if (spn && this.fg.length < 3) this.spawn(cam, false, true);
    }
    for (const s of this.streaks) s.x += s.sp * dt;
    this.streaks = this.streaks.filter((s) => s.x < 1.05 && s.y + cam * 1.3 < 1.05);
    if ((this.sT -= dt) <= 0) {
      this.sT = rr(0.5, 1.5);
      if (spn && this.streaks.length < 6) {
        const l = pk([0.1, 0.16, 0.24]);
        this.streaks.push({
          l,
          th: pk([0.002, 0.003]),
          a: pk([35, 55, 75]),
          sp: rr(0.9, 1.6),
          x: -l,
          y: rr(0.05, 0.92) - cam * 1.3,
        });
      }
    }
    for (const s of this.shoot) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.shoot = this.shoot.filter((s) => s.age < s.life);
    if ((this.shT -= dt) <= 0) {
      this.shT = rr(5, 12);
      if (spn && this.night > 0.8 && this.shoot.length < 2)
        this.shoot.push({
          x: rr(0.2, 0.8),
          y: rr(0.04, 0.35),
          vx: pk([-1, 1]) * rr(0.45, 0.75),
          vy: rr(0.18, 0.32),
          age: 0,
          life: rr(0.55, 0.9),
        });
    }
  },
};
const ph_ = (sc) => Math.min(9, Math.max(0, Math.floor(Math.max(0, sc) / 65)));
const vines = {
  bars: [],
  reset(fy, cnt) {
    this.bars = [];
    this.time = 0;
    this.count = cnt || 0;
    this.score = 0;
    this.lastX = 0.5;
    this.nextY = fy - 0.85;
    this.night = 0;
  },
  spawn(y) {
    const pi = ph_(this.score),
      p = PROF[pi],
      pump = PK && pi % 2 == 1 && this.night > 0.25,
      kind = pump ? 'pumpkin' : 'vine',
      len = pump ? PL : VL,
      gap = p[0] * rr(0.97, 1.03);
    let lo = Math.max(gap / 2 + 0.03, 1 - len - gap / 2 + 0.02),
      hi = Math.min(1 - gap / 2 - 0.03, len + gap / 2 - 0.02);
    if (lo > hi) lo = hi = 0.5;
    let amp = 0;
    if (kind == 'vine' && p[1] > 0 && Math.random() < p[1]) {
      amp = Math.min(rr(p[2], p[3]), Math.max(0, (hi - lo - 0.1) / 2));
      lo += amp;
      hi -= amp;
    }
    const shift = Math.random() < 0.75 ? rr(0.12, 0.32) : rr(0.04, 0.1),
      dir = pk([-1, 1]);
    let c = this.lastX + dir * shift;
    if (!(lo <= c && c <= hi)) c = this.lastX - dir * shift;
    c = Math.min(Math.max(c, lo), hi);
    let tg = c,
      lit = false;
    if (kind == 'pumpkin' && Math.random() < p[6]) {
      const mv = p[7];
      tg = c - lo > hi - c ? rr(lo, Math.max(lo, c - mv)) : rr(Math.min(hi, c + mv), hi);
      lit = Math.abs(tg - c) > 0.12;
      if (!lit) tg = c;
    }
    this.lastX = tg;
    this.count++;
    this.bars.push({
      y,
      kind,
      lit,
      tg,
      trig: null,
      shake: 0,
      c,
      half: gap / 2,
      gl: c - gap / 2,
      gr: c + gap / 2,
      amp,
      sp: pi >= 8 ? rr(2, 2.8) : rr(1.3, 2.3),
      sw: rr(0, TAU),
      start: null,
    });
  },
  update(dt, cam, ref, score) {
    this.time += dt;
    this.score = Math.max(0, score);
    const p = PROF[ph_(this.score)];
    while (this.nextY > -cam - 1) {
      this.spawn(this.nextY);
      this.nextY -= rr(p[4], p[5]);
    }
    for (const b of this.bars) {
      if (b.amp > 0) {
        const s = b.amp * Math.sin(this.time * b.sp + b.sw);
        b.gl = b.c + s - b.half;
        b.gr = b.c + s + b.half;
      }
      const ah = b.kind == 'pumpkin' ? 0.3 : 0.12;
      if (b.start == null && b.y + cam > -ah) b.start = this.time;
      b.shake = 0;
      if (b.lit && b.start != null) {
        if (b.trig == null && this.time - b.start >= 0.45 && ref - (b.y + cam) < 0.72)
          b.trig = this.time;
        if (b.trig != null) {
          const s = this.time - b.trig;
          if (s < 0.18) b.shake = Math.sin((Math.PI * s) / 0.18);
          const q = sm((s - 0.18) / 0.26),
            c = b.c + (b.tg - b.c) * q;
          b.gl = c - b.half;
          b.gr = c + b.half;
        }
      }
    }
    this.bars = this.bars.filter((b) => b.y + cam < 1.4);
  },
};
function vgeo(b, wh, cam, vt) {
  let f,
    th,
    e = 0;
  if (b.kind == 'pumpkin') {
    f = PK[b.lit ? 'lit' : 'unlit'];
    th = S * PH;
    const len = (f.w * th) / f.h,
      fin = wh == 0 ? b.gl * S - len : b.gr * S,
      org = wh == 0 ? -len : S;
    if (b.start != null) {
      const p = cl((vt - b.start) / 0.45);
      e = 1 - Math.pow(1 - p, 3);
    }
    return {
      x: org + (fin - org) * e + Math.sin(vt * 90) * b.shake * S * 0.006,
      y: (b.y + cam) * S - th / 2,
      w: len,
      h: th,
      f,
      flip: wh == 0,
    };
  }
  f = VF[b.start == null ? 0 : Math.min(VF.length - 1, Math.floor((vt - b.start) * 14))];
  th = S * VH;
  const len = (f.w * th) / f.h;
  return {
    x: wh == 0 ? b.gl * S - len : b.gr * S,
    y: (b.y + cam) * S - th / 2,
    w: len,
    h: th,
    f,
    flip: wh == 0,
  };
}
function maskOf(g) {
  const k = Math.round(g.w) + 'x' + Math.round(g.h);
  let m = g.f.m[k];
  if (!m) {
    const w = Math.max(2, Math.round(g.w)),
      h = Math.max(2, Math.round(g.h)),
      c = cv(w, h),
      x = c.getContext('2d');
    x.drawImage(g.f.c, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data,
      a = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] > 127;
    m = g.f.m[k] = { a, w, h };
  }
  return m;
}
function vineHit(mug, vt) {
  const mw = MUG.w * 0.7,
    mh = MUG.h * 0.7,
    x0 = Math.round(mug.x * S - mw / 2),
    y0 = Math.round((mug.y + mug.cam) * S - mh / 2);
  for (const b of vines.bars)
    for (const wh of [0, 1]) {
      const g = vgeo(b, wh, mug.cam, vt),
        gx = Math.round(g.x),
        gy = Math.round(g.y);
      const ax = Math.max(x0, gx),
        ay = Math.max(y0, gy),
        bx = Math.min(x0 + mw, gx + g.w),
        by = Math.min(y0 + mh, gy + g.h);
      if (bx <= ax || by <= ay) continue;
      const m = maskOf(g);
      for (let yy = ay | 0; yy < by; yy++)
        for (let xx = ax | 0; xx < bx; xx++) {
          let mx = xx - gx;
          const my = yy - gy;
          if (g.flip) mx = m.w - 1 - mx;
          if (mx >= 0 && my >= 0 && mx < m.w && my < m.h && m.a[my * m.w + mx]) return true;
        }
    }
  return false;
}
