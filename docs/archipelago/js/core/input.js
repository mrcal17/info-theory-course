/* Keyboard + touch d-pad. Movement is polled; interact/menu are edge events
   consumed via G.input.takeInteract() etc. */
(function () {
'use strict';

var down = {};
var dirStack = [];          // most-recently-pressed direction wins
var interactQueued = false;
var menuQueued = false;
var mapQueued = false;

var DIRS = {
  ArrowUp: 'n', KeyW: 'n',
  ArrowDown: 's', KeyS: 's',
  ArrowLeft: 'w', KeyA: 'w',
  ArrowRight: 'e', KeyD: 'e',
};

function pushDir(d) {
  var i = dirStack.indexOf(d);
  if (i >= 0) dirStack.splice(i, 1);
  dirStack.push(d);
}
function popDir(d) {
  var i = dirStack.indexOf(d);
  if (i >= 0) dirStack.splice(i, 1);
}

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  var d = DIRS[e.code];
  if (d) {
    if (!down[e.code]) { down[e.code] = true; pushDir(d); }
    if (G.state === 'world') e.preventDefault();
    return;
  }
  if (e.repeat) return;
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
    if (G.state === 'world') { interactQueued = true; e.preventDefault(); }
  } else if (e.code === 'Escape') {
    menuQueued = true;
  } else if (e.code === 'KeyM') {
    if (G.state === 'world') mapQueued = true;
  }
});

document.addEventListener('keyup', function (e) {
  var d = DIRS[e.code];
  if (d) { down[e.code] = false; popDir(d); }
});

window.addEventListener('blur', function () {
  down = {}; dirStack = [];
});

G.input = {
  dir: function () {
    // a direction is active if any key mapped to it is down; prefer newest
    for (var i = dirStack.length - 1; i >= 0; i--) {
      var d = dirStack[i];
      for (var code in DIRS) if (DIRS[code] === d && down[code]) return d;
    }
    return null;
  },
  takeInteract: function () { var v = interactQueued; interactQueued = false; return v; },
  takeMenu: function () { var v = menuQueued; menuQueued = false; return v; },
  takeMap: function () { var v = mapQueued; mapQueued = false; return v; },
  pressDir: pushDir,     // used by the d-pad
  releaseDir: popDir,
  queueInteract: function () { interactQueued = true; },
  queueMenu: function () { menuQueued = true; },
};

/* ---------------- touch d-pad ---------------- */

function makeDpad() {
  if (document.getElementById('dpad')) return;
  var wrap = document.createElement('div');
  wrap.id = 'dpad';
  wrap.innerHTML =
    '<div class="dp-grid">' +
      '<button class="dp" data-d="n" style="grid-area:u">▲</button>' +
      '<button class="dp" data-d="w" style="grid-area:l">◀</button>' +
      '<button class="dp" data-d="e" style="grid-area:r">▶</button>' +
      '<button class="dp" data-d="s" style="grid-area:d">▼</button>' +
    '</div>' +
    '<button class="dp dp-act" id="dpadAct">●</button>';
  document.body.appendChild(wrap);
  var held = {};
  wrap.querySelectorAll('.dp[data-d]').forEach(function (btn) {
    var d = btn.getAttribute('data-d');
    function start(e) { e.preventDefault(); if (!held[d]) { held[d] = true; pushDir(d); } }
    function stop(e) { e.preventDefault(); if (held[d]) { held[d] = false; popDir(d); } }
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', stop, { passive: false });
    btn.addEventListener('touchcancel', stop, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);
  });
  var act = wrap.querySelector('#dpadAct');
  act.addEventListener('touchstart', function (e) { e.preventDefault(); interactQueued = true; }, { passive: false });
  act.addEventListener('mousedown', function (e) { e.preventDefault(); interactQueued = true; });
}

G.input.updateDpad = function () {
  var mode = G.save.data.dpad; // 'auto' | 'on' | 'off'
  var want = mode === 'on' || (mode === 'auto' && ('ontouchstart' in window));
  if (want) makeDpad();
  var el = document.getElementById('dpad');
  if (el) el.style.display = want ? '' : 'none';
};

document.addEventListener('DOMContentLoaded', function () { G.input.updateDpad(); });

})();
