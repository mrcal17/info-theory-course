/* THE QUIET ARCHIPELAGO — 'forecast' puzzle (The Dune of Surprises).
   Geyser field: camp a collector on one vent each round, WATCH an eruption,
   and bank its surprisal (-log2 p) toward a goal in bits. Teaches surprisal
   and entropy: rare vents pay big but rarely; the field's average surprise IS
   its entropy. Pure logic up top is tested in a scratch script.
   Contract: ../../DESIGN.md · host: ../core/overlay.js (api = complete, fail,
   close, sfx, status, rng). IIFE, no globals; ends in G.puzzles.register. */
(function () {
'use strict';

/* ---------------- pure logic (tested separately) ---------------- */

function surprisal(p) { return -Math.log2(p); }                 // bits if THIS blows
function expectedBitsForVent(p) { return p * surprisal(p); }    // p * (-log2 p)
function entropy(vents) {                                        // H = Sum p*(-log2 p)
  var H = 0;
  for (var i = 0; i < vents.length; i++) {
    var p = vents[i].p;
    if (p > 0) H += p * (-Math.log2(p));
  }
  return H;
}
// pick a vent index from the distribution given a uniform u in [0,1)
function sampleVent(vents, u) {
  var acc = 0;
  for (var i = 0; i < vents.length; i++) {
    acc += vents[i].p;
    if (u < acc) return i;
  }
  return vents.length - 1;
}
function fmt(x) { return (Math.round(x * 100) / 100).toFixed(2); }
function pct(p) { var v = p * 100; return (Math.round(v * 10) / 10) + '%'; }

/* ---------------- styles (prefix fc-) ---------------- */

var STYLE_ID = 'fc-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  var s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent =
    '.fc-wrap{display:flex;flex-direction:column;gap:0.8rem;}' +
    '.fc-flavor{color:var(--muted);font-size:0.86rem;line-height:1.5;}' +
    '.fc-flavor b{color:var(--orange);font-weight:600;}' +
    '.fc-vents{display:grid;gap:0.55rem;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));}' +
    '.fc-vent{position:relative;text-align:left;border:2px solid var(--surface2);' +
      'border-radius:12px;padding:0.7rem 0.75rem;background:var(--surface);color:var(--text);' +
      'cursor:pointer;min-height:84px;transition:border-color .15s,background .15s;overflow:hidden;}' +
    '.fc-vent:hover:not(:disabled){border-color:var(--orange);}' +
    '.fc-vent:disabled{cursor:default;}' +
    '.fc-vent.sel{border-color:var(--orange);background:rgba(251,146,60,0.12);}' +
    '.fc-vent .fc-lab{font-weight:600;font-size:0.95rem;}' +
    '.fc-vent .fc-p{color:var(--muted);font-size:0.8rem;margin-top:0.15rem;}' +
    '.fc-vent .fc-pay{color:var(--yellow);font-size:0.82rem;margin-top:0.35rem;}' +
    '.fc-vent .fc-exp{color:var(--cyan);font-size:0.74rem;margin-top:0.35rem;}' +
    '.fc-vent.blow{animation:fc-blow 0.7s ease-out;}' +
    '.fc-vent .fc-plume{position:absolute;left:50%;bottom:0;width:14px;height:0;' +
      'transform:translateX(-50%);background:linear-gradient(to top,var(--cyan),rgba(34,211,238,0));' +
      'border-radius:7px;pointer-events:none;opacity:0;}' +
    '.fc-vent.blow .fc-plume{animation:fc-plume 0.7s ease-out;}' +
    '@keyframes fc-blow{0%{transform:none;}25%{transform:translateY(-4px);}100%{transform:none;}}' +
    '@keyframes fc-plume{0%{height:0;opacity:0.9;}55%{height:120%;opacity:0.9;}100%{height:140%;opacity:0;}}' +
    '.fc-controls{display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;}' +
    '.fc-controls .btn{min-height:44px;}' +
    '.fc-log{color:var(--muted);font-size:0.84rem;min-height:1.3rem;}' +
    '.fc-log .hit{color:var(--green);font-weight:600;}' +
    '.fc-log .miss{color:var(--dim);}' +
    '.fc-progwrap{display:flex;flex-direction:column;gap:0.3rem;}' +
    '.fc-progtop{display:flex;justify-content:space-between;font-size:0.82rem;color:var(--muted);}' +
    '.fc-progtop b{color:var(--green);}' +
    '.fc-bar{height:14px;}' +
    '.fc-bar .g-bar-fill{background:linear-gradient(90deg,var(--green),var(--cyan));}' +
    '.fc-pop{position:fixed;color:var(--green);font-weight:700;font-size:1.1rem;pointer-events:none;' +
      'z-index:120;text-shadow:0 1px 4px rgba(0,0,0,0.7);animation:fc-pop 0.9s ease-out forwards;}' +
    '@keyframes fc-pop{0%{opacity:0;transform:translateY(0);}15%{opacity:1;}100%{opacity:0;transform:translateY(-32px);}}' +
    '.fc-teach{font-size:0.82rem;}' +
    '.fc-teach .fc-row{display:flex;justify-content:space-between;gap:0.6rem;padding:0.2rem 0;' +
      'border-bottom:1px dashed var(--surface2);}' +
    '.fc-teach .fc-row:last-child{border-bottom:none;}' +
    '.fc-teach .fc-row span:first-child{color:var(--text);}' +
    '.fc-teach .fc-row span:last-child{color:var(--cyan);font-variant-numeric:tabular-nums;}' +
    '.fc-kick{color:var(--orange);font-size:0.82rem;margin-top:0.4rem;line-height:1.45;}' +
    '.fc-lesson{border-color:var(--green);}' +
    '.fc-lesson h3{color:var(--green);font-size:1rem;margin-bottom:0.4rem;}' +
    '.fc-lesson p{font-size:0.88rem;line-height:1.55;color:var(--text);}' +
    '.fc-lesson .fc-eq{color:var(--cyan);font-variant-numeric:tabular-nums;}';
  document.head.appendChild(s);
}

/* ---------------- mechanic ---------------- */

G.puzzles.register('forecast', {
  title: 'The Geyser Field',
  create: function (root, config, api) {
    injectStyle();

    var vents = (config.vents || []).map(function (v) { return { label: v.label, p: v.p }; });
    var goalBits = config.goalBits || 0;
    var rounds = config.rounds || 0;

    var H = entropy(vents);
    var state = { round: 0, banked: 0, sel: 0, watching: false, won: false };

    var wrap = document.createElement('div');
    wrap.className = 'fc-wrap';
    root.appendChild(wrap);

    // flavor
    var flavor = document.createElement('div');
    flavor.className = 'fc-flavor';
    flavor.innerHTML =
      'Sift the fox crouches by the steaming sand. <b>"Set your collector on one ' +
      'vent. The field decides where it blows. Catch a rare one and you catch a lot ' +
      'of surprise."</b> Surprise is counted in <b>bits</b>: a vent worth ' +
      '&minus;log&#8322;p.';
    wrap.appendChild(flavor);

    // progress
    var progWrap = document.createElement('div');
    progWrap.className = 'fc-progwrap';
    var progTop = document.createElement('div');
    progTop.className = 'fc-progtop';
    progTop.innerHTML = '<span>Banked surprise</span><span><b class="fc-banked">0.00</b> / ' +
      fmt(goalBits) + ' bits</span>';
    var bar = document.createElement('div');
    bar.className = 'g-bar fc-bar';
    bar.innerHTML = '<div class="g-bar-fill" style="width:0%"></div>';
    progWrap.appendChild(progTop);
    progWrap.appendChild(bar);
    wrap.appendChild(progWrap);
    var bankedEl = progTop.querySelector('.fc-banked');
    var barFill = bar.querySelector('.g-bar-fill');

    // vent cards
    var ventGrid = document.createElement('div');
    ventGrid.className = 'fc-vents';
    wrap.appendChild(ventGrid);
    var ventEls = vents.map(function (v, i) {
      var b = document.createElement('button');
      b.className = 'fc-vent' + (i === 0 ? ' sel' : '');
      b.type = 'button';
      b.innerHTML =
        '<div class="fc-plume"></div>' +
        '<div class="fc-lab">' + G.util.esc(v.label) + '</div>' +
        '<div class="fc-p">blows ' + pct(v.p) + ' of the time</div>' +
        '<div class="fc-pay">worth &minus;log&#8322;p = ' + fmt(surprisal(v.p)) + ' bits if it blows here</div>' +
        '<div class="fc-exp">expected: ' + fmt(expectedBitsForVent(v.p)) + ' bits/round if you camp here</div>';
      b.addEventListener('click', function () {
        if (state.watching || state.won) return;
        state.sel = i;
        refreshSel();
        api.sfx('select');
      });
      ventGrid.appendChild(b);
      return b;
    });
    function refreshSel() {
      ventEls.forEach(function (el, i) { el.classList.toggle('sel', i === state.sel); });
    }

    // controls + log
    var controls = document.createElement('div');
    controls.className = 'fc-controls';
    var watchBtn = document.createElement('button');
    watchBtn.className = 'btn btn-primary';
    watchBtn.type = 'button';
    watchBtn.textContent = 'WATCH the field';
    var log = document.createElement('div');
    log.className = 'fc-log';
    log.textContent = 'Pick a vent, then watch.';
    controls.appendChild(watchBtn);
    wrap.appendChild(controls);
    wrap.appendChild(log);

    // teaching panel
    var teach = document.createElement('div');
    teach.className = 'g-card fc-teach';
    var rowsHtml = vents.map(function (v) {
      return '<div class="fc-row"><span>' + G.util.esc(v.label) +
        ' &nbsp;<span style="color:var(--muted)">' + pct(v.p) + ' &times; ' +
        fmt(surprisal(v.p)) + '</span></span><span>' +
        fmt(expectedBitsForVent(v.p)) + ' bits/round</span></div>';
    }).join('');
    teach.innerHTML =
      '<div style="font-weight:600;margin-bottom:0.4rem;">Expected bits per round, if you camp each vent</div>' +
      rowsHtml +
      '<div class="fc-kick">Common vents pay little but often; rare vents pay big but rarely. ' +
      'Add up every vent\'s expected pay and you get the field\'s average surprise: ' +
      'the <b>entropy</b> H = ' + fmt(H) + ' bits.</div>';
    wrap.appendChild(teach);

    // ---- status / progress wiring ----
    function setStatus() {
      api.status('round ' + Math.min(state.round + (state.won ? 0 : 1), rounds) +
        '/' + rounds + ' &middot; banked ' + fmt(state.banked) + ' bits');
    }
    function refreshProgress() {
      bankedEl.textContent = fmt(state.banked);
      var frac = goalBits > 0 ? Math.min(1, state.banked / goalBits) : 1;
      barFill.style.width = (frac * 100).toFixed(1) + '%';
    }
    setStatus();
    refreshProgress();

    function floatPop(amount, el) {
      var r = el.getBoundingClientRect();
      var pop = document.createElement('div');
      pop.className = 'fc-pop';
      pop.textContent = '+' + fmt(amount) + ' bits';
      pop.style.left = (r.left + r.width / 2 - 28) + 'px';
      pop.style.top = (r.top + 6) + 'px';
      document.body.appendChild(pop);
      timers.push(setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 950));
    }

    var timers = [];
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function setEnabled(on) {
      ventEls.forEach(function (el) { el.disabled = !on; });
      watchBtn.disabled = !on;
    }

    function resetAttempt() {
      state.round = 0; state.banked = 0; state.watching = false; state.won = false;
      log.innerHTML = 'The wind picks back up. Fresh field, fresh luck.';
      refreshProgress();
      setStatus();
      setEnabled(true);
      watchBtn.textContent = 'WATCH the field';
    }

    function doWatch() {
      if (state.watching || state.won) return;
      if (state.round >= rounds) return;
      state.watching = true;
      setEnabled(false);

      var picked = state.sel;
      var blew = sampleVent(vents, api.rng());
      api.sfx('quake');

      // animate the eruption
      var blowEl = ventEls[blew];
      blowEl.classList.remove('blow');
      void blowEl.offsetWidth; // reflow to restart animation
      blowEl.classList.add('blow');

      timers.push(setTimeout(function () {
        blowEl.classList.remove('blow');
        state.round++;
        var hit = (blew === picked);
        if (hit) {
          var gain = surprisal(vents[blew].p);
          state.banked += gain;
          refreshProgress();
          floatPop(gain, blowEl);
          api.sfx('spark');
          log.innerHTML = '<span class="hit">' + G.util.esc(vents[blew].label) +
            ' blew &mdash; your vent! Banked +' + fmt(gain) + ' bits.</span>';
        } else {
          api.sfx('bump');
          log.innerHTML = '<span class="miss">' + G.util.esc(vents[blew].label) +
            ' blew. Your collector sat quiet. (0 bits)</span>';
        }
        setStatus();

        // resolve outcomes
        if (state.banked >= goalBits && goalBits > 0) {
          win();
          return;
        }
        if (state.round >= rounds) {
          // ran out short of goal: gentle fail + auto-reset
          api.fail('The wind dies down. Try again.');
          timers.push(setTimeout(function () {
            if (!state.won) resetAttempt();
          }, 1100));
          return;
        }
        state.watching = false;
        setEnabled(true);
      }, 720));
    }

    watchBtn.addEventListener('click', doWatch);

    function win() {
      if (state.won) return;
      state.won = true;
      state.watching = false;
      setEnabled(false);
      setStatus();

      var lesson = document.createElement('div');
      lesson.className = 'g-card fc-lesson';
      lesson.innerHTML =
        '<h3>&#10003; Surprise, banked.</h3>' +
        '<p>Surprise is measured in <b>bits</b>: a rare eruption (small p) carries ' +
        'big <span class="fc-eq">&minus;log&#8322;p</span> &mdash; rare means informative. ' +
        'Average the surprise over the whole field and you get its <b>entropy</b>: ' +
        '<span class="fc-eq">H = &Sigma; p&middot;(&minus;log&#8322;p) = ' + fmt(H) + ' bits</span>. ' +
        'Sift tucks your readings into a jar of surprising things.</p>';
      var fileBtn = document.createElement('button');
      fileBtn.className = 'btn btn-primary';
      fileBtn.type = 'button';
      fileBtn.style.minHeight = '44px';
      fileBtn.textContent = 'Leave the field';
      var filed = false;
      fileBtn.addEventListener('click', function () {
        if (filed) return;
        filed = true;
        api.complete();
      });
      lesson.appendChild(fileBtn);
      wrap.appendChild(lesson);
      lesson.scrollIntoView({ block: 'nearest' });
    }

    return {
      destroy: function () {
        clearTimers();
        var pops = document.querySelectorAll('.fc-pop');
        for (var i = 0; i < pops.length; i++) {
          if (pops[i].parentNode) pops[i].parentNode.removeChild(pops[i]);
        }
      }
    };
  }
});

})();
