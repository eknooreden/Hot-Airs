'use strict';

/* ---------- input & boot ---------- */
const lp = (e) => {
  const d = devicePixelRatio || 1;
  return [((e.clientX * d - vx0) / side) * S, ((e.clientY * d - vy0) / side) * S];
};
cvs.addEventListener('pointermove', (e) => {
  st.m = lp(e);
  if (e.pointerId === st.joy.id) setJoy(st.m);
});
cvs.tabIndex = 0;
cvs.style.outline = 'none';
cvs.addEventListener('pointerdown', (e) => {
  window.focus();
  cvs.focus();
  onDown(lp(e), e.pointerId);
  if (e.pointerId === st.joy.id) cvs.setPointerCapture(e.pointerId);
});
addEventListener('pointerup', (e) => {
  if (e.pointerId === st.joy.id) releaseJoy();
  else onUp(lp(e));
});
addEventListener('pointercancel', (e) => {
  if (e.pointerId === st.joy.id) releaseJoy();
});
addEventListener('keydown', (e) => {
  st.keys[e.key] = true;
  st.keys[e.code] = true;
  onKey(e);
});
addEventListener('keyup', (e) => {
  st.keys[e.key] = false;
  st.keys[e.code] = false;
});
addEventListener('blur', () => {
  st.keys = {};
  if (st.state == 'play' && !st.mug.dead && !st.paused) {
    st.paused = true;
  }
});
window.focus();
loadSave();
loadAll().then(() => {
  cyc.reset();
  sky.reset(0);
  vines.reset(st.mug.fy);
  st.last = 'menu';
  requestAnimationFrame(frame);
});