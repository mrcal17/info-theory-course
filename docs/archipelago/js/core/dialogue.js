/* Dialogue runner: typewriter, portraits, choices, conditional lines, and the
   action vocabulary (set/clear/give/openPuzzle/goto/teleport/sfx/music/quake/
   wait/focus/endGame). Also exposes runActions for triggers + onEnter. */
(function () {
'use strict';

var box = null, portraitC = null, nameEl = null, textEl = null, choicesEl = null, hintEl = null;
var steps = [], idx = 0, typing = false, typeTimer = null, fullText = '';
var active = false;
var choiceIdx = 0;
var prevState = 'world';

function ensureDom() {
  if (box) return;
  box = document.createElement('div');
  box.id = 'dlgbox';
  box.innerHTML =
    '<div class="dlg-portrait"><canvas width="96" height="96"></canvas></div>' +
    '<div class="dlg-main">' +
      '<div class="dlg-name"></div>' +
      '<div class="dlg-text"></div>' +
      '<div class="dlg-choices"></div>' +
      '<div class="dlg-hint">▼</div>' +
    '</div>';
  document.body.appendChild(box);
  portraitC = box.querySelector('canvas');
  nameEl = box.querySelector('.dlg-name');
  textEl = box.querySelector('.dlg-text');
  choicesEl = box.querySelector('.dlg-choices');
  hintEl = box.querySelector('.dlg-hint');
  box.addEventListener('click', function () { advance(); });
}

var NAMES = {
  pip: 'Pip', shannon: 'Dr. Shannon', gull: 'Ferryman Gull', maren: 'Maren',
  sift: 'Sift', huff: 'Huff', ada: 'Ada', bea: 'Bea', cee: 'Cee',
  lem: 'Lem', ziv: 'Ziv', warden: 'Mirror Warden', sign: '', crab: 'Crab',
  turtle: 'Turtle', gullsmall: 'Gull',
};

function drawPortrait(who) {
  var pctx = portraitC.getContext('2d');
  pctx.clearRect(0, 0, 96, 96);
  if (who === 'sign') { box.classList.add('no-portrait'); return; }
  box.classList.remove('no-portrait');
  if (G.sprites && G.sprites.portrait) {
    var c = G.sprites.portrait(who);
    if (c) { pctx.drawImage(c, 0, 0, 96, 96); return; }
  }
  // fallback blob
  pctx.fillStyle = '#94a3b8';
  pctx.beginPath(); pctx.arc(48, 52, 30, 0, 7); pctx.fill();
  pctx.fillStyle = '#0f172a';
  pctx.beginPath(); pctx.arc(38, 46, 5, 0, 7); pctx.arc(58, 46, 5, 0, 7); pctx.fill();
}

/* ---------------- dialogue flow ---------------- */

G.dialogue = {
  active: function () { return active; },

  start: function (ref, npc) {
    var resolved = resolveSteps(ref);
    if (!resolved) return;
    ensureDom();
    steps = resolved; idx = 0;
    active = true;
    prevState = G.state === 'dialogue' ? prevState : G.state;
    G.state = 'dialogue';
    G.paused = true;
    box.style.display = '';
    showStep();
  },

  close: close,
  runActions: runActions,
};

function resolveSteps(ref) {
  if (Array.isArray(ref)) return ref.slice();
  if (typeof ref === 'string') {
    var island = G.world.island;
    var d = island && island.dialogues && island.dialogues[ref];
    if (!d) { console.warn('missing dialogue', ref); return null; }
    return d.slice();
  }
  return null;
}

function close() {
  if (!active) return;
  active = false;
  if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  if (box) box.style.display = 'none';
  G.state = 'world';
  G.paused = false;
  G.world.focusTile = null;
}

function stepOk(s) {
  if (!s) return false;
  if (s.ifFlag && !G.flags.has(s.ifFlag)) return false;
  if (s.ifNotFlag && G.flags.has(s.ifNotFlag)) return false;
  return true;
}

function showStep() {
  while (idx < steps.length && !stepOk(steps[idx])) idx++;
  if (idx >= steps.length) { close(); return; }
  var s = steps[idx];

  if (s.actions) {
    idx++;
    runActions(s.actions, { thenContinue: true });
    return;
  }
  if (s.goto) {
    var next = resolveSteps(s.goto);
    if (next) { steps = next; idx = 0; showStep(); } else close();
    return;
  }
  if (s.end) { close(); return; }

  choicesEl.innerHTML = '';
  choicesEl.style.display = 'none';

  if (s.choice) {
    nameEl.textContent = '';
    textEl.innerHTML = '';
    drawPortrait('pip');
    nameEl.textContent = 'Pip';
    choicesEl.style.display = '';
    hintEl.style.display = 'none';
    var opts = s.choice.filter(stepOk);
    choiceIdx = 0;
    opts.forEach(function (o, i) {
      var b = document.createElement('button');
      b.className = 'dlg-choice' + (i === 0 ? ' sel' : '');
      b.textContent = o.label;
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        pickChoice(o);
      });
      choicesEl.appendChild(b);
    });
    choicesEl._opts = opts;
    return;
  }

  // a spoken line
  var who = s.who || 'sign';
  drawPortrait(who);
  nameEl.textContent = s.name || NAMES[who] || who;
  fullText = s.text || '';
  textEl.innerHTML = '';
  hintEl.style.display = 'none';
  if (typeTimer) clearInterval(typeTimer);
  var speed = (G.save && G.save.data && G.save.data.textSpeed) || 'normal';
  if (speed === 'instant') {
    textEl.textContent = fullText;
    typing = false;
    hintEl.style.display = '';
    if (G.audio) G.audio.sfx('talk');
    return;
  }
  typing = true;
  var i = 0;
  typeTimer = setInterval(function () {
    i++;
    textEl.textContent = fullText.slice(0, i);
    if (i % 3 === 0 && G.audio) G.audio.sfx('talk');
    if (i >= fullText.length) {
      clearInterval(typeTimer); typeTimer = null;
      typing = false;
      hintEl.style.display = '';
    }
  }, speed === 'fast' ? 8 : 17);
}

function pickChoice(o) {
  if (G.audio) G.audio.sfx('choice');
  if (o.actions) { idx++; runActions(o.actions, { thenContinue: true }); return; }
  if (o.goto) {
    var next = resolveSteps(o.goto);
    if (next) { steps = next; idx = 0; showStep(); } else close();
    return;
  }
  if (o.end) { close(); return; }
  idx++;
  showStep();
}

function advance() {
  if (!active) return;
  var s = steps[idx];
  if (s && s.choice) return; // must click/select a choice
  if (typing) {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    textEl.textContent = fullText;
    typing = false;
    hintEl.style.display = '';
    return;
  }
  idx++;
  showStep();
}

/* keyboard: advance / choose */
document.addEventListener('keydown', function (e) {
  if (!active) return;
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
    e.preventDefault();
    var s = steps[idx];
    if (s && s.choice && choicesEl._opts) {
      pickChoice(choicesEl._opts[choiceIdx]);
    } else advance();
  } else if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'KeyW' || e.code === 'KeyS') {
    var s2 = steps[idx];
    if (s2 && s2.choice && choicesEl._opts) {
      e.preventDefault();
      var n = choicesEl._opts.length;
      choiceIdx = (choiceIdx + ((e.code === 'ArrowDown' || e.code === 'KeyS') ? 1 : n - 1)) % n;
      Array.prototype.forEach.call(choicesEl.children, function (c, i) {
        c.classList.toggle('sel', i === choiceIdx);
      });
      if (G.audio) G.audio.sfx('select');
    }
  }
});

/* ---------------- actions ---------------- */

function runActions(actions, ctx) {
  var list = (actions || []).slice();
  var thenContinue = ctx && ctx.thenContinue;

  function next() {
    if (!list.length) {
      if (thenContinue && active) showStep();
      return;
    }
    var a = list.shift();
    if (!stepOk(a) && (a.ifFlag || a.ifNotFlag)) { next(); return; }

    if (a.set) { G.flags.set(a.set); next(); }
    else if (a.clear) { G.flags.clear(a.clear); next(); }
    else if (a.give) {
      if (a.give === 'spark') {
        G.sparks.give(1);
        if (G.ui && G.ui.toast) G.ui.toast('✦ Spark! (' + G.sparks.count() + '/21)');
        if (G.audio) G.audio.sfx('spark');
        var p = G.world.player;
        if (p) G.fx.sparkle(p.px + 16, p.py + 8, '#fbbf24', 14);
      } else if (G.ui && G.ui.toast) G.ui.toast('Got: ' + a.give);
      next();
    }
    else if (a.openPuzzle) {
      close();
      G.overlay.open(a.openPuzzle);
      // remaining actions are dropped by design: the puzzle takes over
    }
    else if (a.goto) {
      var stepsNext = resolveSteps(a.goto);
      if (stepsNext && active) { steps = stepsNext; idx = 0; showStep(); }
      else if (stepsNext) { G.dialogue.start(stepsNext); }
    }
    else if (a.teleport) { close(); G.world.teleport(a.teleport.island, a.teleport.x, a.teleport.y); }
    else if (a.sfx) { if (G.audio) G.audio.sfx(a.sfx); next(); }
    else if (a.music) { if (G.audio) G.audio.music(a.music); next(); }
    else if (a.quake) { G.render.quake(a.quake); next(); }
    else if (a.wait) { setTimeout(next, a.wait); }
    else if (a.focus) {
      G.world.focusTile = (a.focus.x != null) ? { x: a.focus.x, y: a.focus.y } : null;
      next();
    }
    else if (a.endGame) { close(); if (G.ui && G.ui.ending) G.ui.ending(); }
    else next();
  }
  next();
}

})();
