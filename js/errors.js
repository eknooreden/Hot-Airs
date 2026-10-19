'use strict';

// Prints problems on the game screen so you don't need the browser console (handy on itch.io).
const missingFiles = [];
function showProblem(msg) {
  let d = document.getElementById('problems');
  if (!d) {
    d = document.createElement('pre');
    d.id = 'problems';
    d.style.cssText =
      'position:fixed;left:8px;bottom:8px;right:8px;margin:0;color:#ff6b6b;' +
      'font:12px monospace;white-space:pre-wrap;z-index:9;pointer-events:none';
    document.body.appendChild(d);
  }
  d.textContent += msg + '\n';
}
// script files that failed to download (capture phase, because load errors don't bubble)
window.addEventListener(
  'error',
  (e) => {
    if (e.target && e.target.src && e.target.tagName == 'SCRIPT')
      showProblem('Could not load ' + e.target.src.split('/').slice(-2).join('/'));
  },
  true,
);
window.addEventListener('error', (e) => {
  if (e.message) showProblem('Error: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')');
});
window.addEventListener('unhandledrejection', (e) =>
  showProblem('Error: ' + ((e.reason && e.reason.message) || e.reason)),
);
