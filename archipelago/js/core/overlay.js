/* Puzzle overlay host: instantiates a registered mechanic in a modal over the
   world; on complete sets the door flag, awards sparks, closes. */
(function () {
'use strict';

var ov = null, panel = null, titleEl = null, statusEl = null, body = null;
var instance = null, currentSpec = null, prevState = 'world';

function ensureDom() {
  if (ov) return;
  ov = document.createElement('div');
  ov.id = 'puzzle-ov';
  ov.innerHTML =
    '<div class="pz-panel">' +
      '<div class="pz-head">' +
        '<span class="pz-title"></span>' +
        '<span class="pz-status"></span>' +
        '<button class="pz-close" title="Step away (Esc)">✕</button>' +
      '</div>' +
      '<div class="pz-body"></div>' +
    '</div>';
  document.body.appendChild(ov);
  panel = ov.querySelector('.pz-panel');
  titleEl = ov.querySelector('.pz-title');
  statusEl = ov.querySelector('.pz-status');
  body = ov.querySelector('.pz-body');
  ov.querySelector('.pz-close').addEventListener('click', function () { G.overlay.close(); });
}

G.overlay = {
  isOpen: function () { return !!instance; },

  /* spec: { type, config, flag?, sparks?, title?, onComplete? } */
  open: function (spec) {
    var def = G.puzzles.get(spec.type);
    if (!def) {
      console.warn('unknown puzzle type', spec.type);
      if (G.ui && G.ui.toast) G.ui.toast('(this mechanism is still being built)');
      return;
    }
    ensureDom();
    G.overlay.close(); // tear down anything prior
    currentSpec = spec;
    prevState = G.state;
    G.state = 'puzzle';
    G.paused = true;
    titleEl.textContent = spec.title || def.title || spec.type;
    statusEl.innerHTML = '';
    body.innerHTML = '';
    ov.style.display = '';
    if (G.audio) G.audio.sfx('open');

    var done = false;
    var api = {
      complete: function () {
        if (done) return;
        done = true;
        finishSolved(spec);
      },
      fail: function (msg) {
        if (G.audio) G.audio.sfx('fail');
        if (msg && G.ui && G.ui.toast) G.ui.toast(msg);
      },
      close: function () { G.overlay.close(); },
      sfx: function (n) { if (G.audio) G.audio.sfx(n); },
      status: function (html) { statusEl.innerHTML = html == null ? '' : html; },
      rng: function () { return Math.random(); },
    };
    var root = document.createElement('div');
    root.className = 'pz-root';
    body.appendChild(root);
    try {
      instance = def.create(root, spec.config || {}, api) || {};
    } catch (err) {
      console.error(err);
      root.innerHTML = '<p class="pz-err">⚠ The mechanism jams. (' + G.util.esc(String(err && err.message || err)) + ')</p>';
      instance = {};
    }
  },

  close: function () {
    if (!instance) { if (ov) ov.style.display = 'none'; return; }
    try { if (instance.destroy) instance.destroy(); } catch (e) {}
    instance = null;
    currentSpec = null;
    if (ov) ov.style.display = 'none';
    if (G.state === 'puzzle') { G.state = 'world'; G.paused = false; }
    if (G.audio) G.audio.sfx('close');
  },
};

function finishSolved(spec) {
  var wasFirst = spec.flag && !G.flags.has(spec.flag);
  G.overlay.close();
  if (G.audio) G.audio.sfx('solve');
  var p = G.world.player;
  if (p) G.fx.sparkle(p.px + 16, p.py + 4, '#34d399', 16);
  if (spec.flag) G.flags.set(spec.flag);
  if (spec.sparks && wasFirst) {
    G.sparks.give(spec.sparks);
    if (G.ui && G.ui.toast) G.ui.toast('✦ Spark! (' + G.sparks.count() + '/21)');
    if (G.audio) G.audio.sfx('spark');
  }
  if (spec.onComplete) G.dialogue.runActions(spec.onComplete, {});
}

/* Escape closes the puzzle (engine-owned) */
document.addEventListener('keydown', function (e) {
  if (e.code === 'Escape' && instance) {
    e.stopPropagation();
    G.overlay.close();
  }
}, true);

})();
