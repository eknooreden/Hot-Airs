'use strict';

/* ---------- assets ---------- */
const loadImg = (p) =>
  new Promise((r) => {
    const i = new Image();
    i.onload = () => r(i);
    i.onerror = () => {
      missingFiles.push(p);
      console.warn('missing asset:', 'assets/' + p);
      r(null);
    };
    i.src = 'assets/' + p;
  });
const ph = (w, h, col) => {
  const c = cv(w, h),
    x = c.getContext('2d');
  x.fillStyle = col;
  x.beginPath();
  x.roundRect ? x.roundRect(2, 2, w - 4, h - 4, w / 6) : x.rect(2, 2, w - 4, h - 4);
  x.fill();
  return c;
};
const rot = (im, m) => {
  const w = im.width,
    h = im.height;
  if (m == 'ccw') {
    const c = cv(h, w);
    c.getContext('2d').setTransform(0, -1, 1, 0, 0, w);
    c.getContext('2d').drawImage(im, 0, 0);
    return c;
  }
  if (m == 'cw') {
    const c = cv(h, w);
    c.getContext('2d').setTransform(0, 1, -1, 0, h, 0);
    c.getContext('2d').drawImage(im, 0, 0);
    return c;
  }
  const c = cv(w, h);
  c.getContext('2d').setTransform(-1, 0, 0, -1, w, h);
  c.getContext('2d').drawImage(im, 0, 0);
  return c;
};
const A = {},
  snd = {};
let MUG,
  VF = [],
  PK = null,
  VH = 0.2,
  VL = 1,
  PH = 0.2,
  PL = 0,
  cloudBase = {},
  moonSpr = {};
const audio = (f, v, loop) => {
    const a = new Audio('assets/sounds/' + f);
    a.volume = v;
    a.loop = !!loop;
    return a;
  },
  sfx = (a) => {
    if (a) {
      try {
        a.currentTime = 0;
        a.play().catch(() => {});
      } catch (e) {}
    }
  };
async function loadAll() {
  try {
    const f = new FontFace('GF', 'url(assets/game_font.otf)');
    await f.load();
    document.fonts.add(f);
    fontOK = true;
  } catch (e) {}
  try {
    const sf = new FontFace('SC', 'url(assets/score.otf)');
    await sf.load();
    document.fonts.add(sf);
  } catch (e) {}
  const L = async (p, w, h, col) => {
    const i = await loadImg(p);
    return mk(i || ph(w, h, col), 1);
  };
  A.bg = await L('menu/menu_bg.png', 800, 800, '#6fb7e8');
  A.play = await L('menu/play_button.png', 300, 130, '#e9a23b');
  A.up = await L('menu/upgrade_button.png', 300, 130, '#8b5cf6');
  A.bored = await L('mugs/bored_mug.png', 100, 120, '#c9753d');
  A.happy = await L('mugs/happy_mug.png', 100, 120, '#e08a4a');
  A.dead = await L('mugs/dead_mug.png', 100, 120, '#7a4a2a');
  A.trees = await L('bg/trees.png', 1000, 300, '#10301c');
  A.cocoa = await L('cocoa_currency.png', 60, 60, '#6b3a1e');
  const moons = {};
  for (const n of [
    'waxing_crescent',
    'first_quarter',
    'waxing_gibbous',
    'waning_gibbous',
    'third_quarter',
    'waning_crescent',
    'new_moon',
  ]) {
    const i = await loadImg('moon/' + n + '.png');
    if (i) moons[n] = mk(i, 1);
  }
  moonSpr = moons;
  for (let i = 1; i <= 10; i++) {
    const im = await loadImg('vines/vine' + i + '.png');
    if (!im) continue;
    const c = im.height > im.width ? rot(im, 'ccw') : im;
    VF.push({ t: mk(c, 1).t, c, w: c.width, h: c.height, m: {} });
  }
  if (!VF.length) {
    const c = ph(560, 200, '#2f8a3a');
    VF.push({ t: mk(c, 1).t, c, w: 560, h: 200, m: {} });
  }
  for (const [k, p] of [
    ['lit', 'litpumkin'],
    ['unlit', 'unlitpumkin'],
  ]) {
    const im = await loadImg('pumkinrods/' + p + '.png');
    if (!im) {
      PK = null;
      break;
    }
    PK = PK || {};
    const c = rot(im, im.height > im.width ? 'cw' : '180');
    PK[k] = { t: mk(c, 1).t, c, w: c.width, h: c.height, m: {} };
  }
  const a = VF[0].w / VF[0].h;
  VH = Math.max(0.2, 0.55 / a);
  VL = VH * a;
  if (PK) {
    const b = PK.unlit.w / PK.unlit.h;
    PH = Math.max(0.2, 0.55 / b);
    PL = PH * b;
  }
  snd.talk = audio('talking.mp3', 1, true);
  snd.sel = audio('select.mp3', 1);
  snd.click = audio('clicked.mp3', 1);
  snd.death = audio('death.wav', 1);
  snd.hop = audio('hop.mp3', 1);
  snd.wind = audio('wind.mp3', 0, true);
  snd.done = audio('loading_done.mp3', 1);
  MUG = { w: (S * MUGH * A.bored.w) / A.bored.h, h: S * MUGH };
  buildFx();
}
