/* Shared pedagogy kit for puzzle mechanics — see PEDAGOGY.md.
   Loaded after overlay.js, before js/puzzles/*. Provides G.pz: shared math,
   the hook/coach/banner/debrief cards, the hint ladder, and taught-flags.
   All returned values are plain elements the puzzle appends into its own
   wrap (puzzles own their render cycle; the kit owns no state but styles). */
(function () {
'use strict';

/* ---------------- one-time style ---------------- */

function injectStyle() {
  if (document.getElementById('pzk-style')) return;
  var s = document.createElement('style');
  s.id = 'pzk-style';
  s.textContent = [
    '.pzk-hook{border:1px solid var(--purple);border-radius:12px;padding:0.8rem 0.9rem;',
    '  background:rgba(167,139,250,0.07);display:flex;flex-direction:column;gap:0.6rem;}',
    '.pzk-hook .pzk-q{font-size:0.95rem;line-height:1.5;color:var(--text);font-weight:600;}',
    '.pzk-opts{display:flex;gap:0.5rem;flex-wrap:wrap;}',
    '.pzk-opt{flex:1 1 100px;min-height:44px;border:2px solid var(--surface2);border-radius:10px;',
    '  background:var(--surface);color:var(--text);font-size:0.9rem;cursor:pointer;padding:0.4rem 0.6rem;',
    '  transition:border-color .15s,background .15s;}',
    '.pzk-opt:hover:not(:disabled){border-color:var(--purple);}',
    '.pzk-opt:disabled{cursor:default;opacity:0.55;}',
    '.pzk-opt.pzk-right{border-color:var(--green);color:var(--green);opacity:1;background:rgba(52,211,153,0.1);}',
    '.pzk-opt.pzk-wrong{border-color:var(--red);color:var(--red);opacity:1;background:rgba(248,113,113,0.08);}',
    '.pzk-opt .pzk-note{display:block;font-size:0.72rem;color:var(--muted);margin-top:0.15rem;}',
    '.pzk-reveal{font-size:0.88rem;line-height:1.55;color:var(--muted);}',
    '.pzk-reveal b{color:var(--text);}',
    '.pzk-hook .btn{align-self:flex-start;min-height:44px;}',
    '.pzk-coach{display:flex;gap:0.65rem;align-items:flex-start;border:1px solid var(--surface2);',
    '  border-radius:12px;padding:0.55rem 0.7rem;background:var(--surface);}',
    '.pzk-coach canvas{width:48px;height:48px;border-radius:10px;flex:0 0 auto;image-rendering:auto;}',
    '.pzk-coach .pzk-cwho{font-size:0.72rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--gold);margin-bottom:0.15rem;}',
    '.pzk-coach .pzk-ctext{font-size:0.88rem;line-height:1.5;color:var(--text);}',
    '.pzk-coach .pzk-ctext b{color:var(--cyan);}',
    '.pzk-banner{display:flex;align-items:baseline;gap:0.6rem;padding:0.15rem 0.1rem;}',
    '.pzk-banner .pzk-bn{font-size:0.74rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);font-weight:700;}',
    '.pzk-banner .pzk-bl{font-size:0.86rem;color:var(--muted);}',
    '.pzk-debrief{border:1px solid var(--surface2);border-radius:12px;padding:0.85rem 0.95rem;',
    '  background:var(--surface);display:flex;flex-direction:column;gap:0.6rem;}',
    '.pzk-debrief.pzk-win{border-color:var(--green);}',
    '.pzk-debrief h3{font-size:0.98rem;margin:0;color:var(--green);}',
    '.pzk-debrief.pzk-info h3{color:var(--cyan);}',
    '.pzk-debrief .pzk-dbody{font-size:0.89rem;line-height:1.55;color:var(--text);}',
    '.pzk-debrief .pzk-dbody .pzk-eq{color:var(--cyan);font-variant-numeric:tabular-nums;}',
    '.pzk-debrief .pzk-dbody b{color:var(--gold);}',
    '.pzk-debrief .btn{align-self:flex-start;min-height:44px;}'
  ].join('');
  document.head.appendChild(s);
}

/* ---------------- shared math ---------------- */

function log2(x) { return Math.log(x) / Math.LN2; }
function h2(p) {
  if (p <= 0 || p >= 1) return 0;
  return -(p * log2(p) + (1 - p) * log2(1 - p));
}
function entropy(ps) {
  var H = 0;
  for (var i = 0; i < ps.length; i++) if (ps[i] > 0) H += ps[i] * -log2(ps[i]);
  return H;
}
function surprisal(p) { return -log2(p); }
function fmt(x, d) {
  d = (d == null) ? 2 : d;
  return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
}

/* ---------------- coach names ---------------- */

var NAMES = {
  pip: 'Pip', shannon: 'Dr. Shannon', maren: 'Maren', sift: 'Sift',
  huff: 'Huff', gull: 'Ferryman Gull', gullsmall: 'Little Gull',
  warden: 'The Mirror Warden', ada: 'Ada', bea: 'Bea', cee: 'Cee',
  lem: 'Lem', ziv: 'Ziv', crab: 'Crab', turtle: 'Old Turtle',
};

/* ---------------- cards ---------------- */

function el(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

/* Predict-then-reveal card. opts: {question, options:[{label, note?}],
   correct, reveal, doneLabel?, onDone(pickedIdx, wasRight)} */
function hookCard(opts) {
  injectStyle();
  var card = el('div', 'pzk-hook');
  card.appendChild(el('div', 'pzk-q', opts.question));
  var row = el('div', 'pzk-opts');
  var btns = [];
  (opts.options || []).forEach(function (o, idx) {
    var b = el('button', 'pzk-opt',
      G.util.esc(o.label) + (o.note ? '<span class="pzk-note">' + G.util.esc(o.note) + '</span>' : ''));
    b.type = 'button';
    b.addEventListener('click', function () { pick(idx); });
    btns.push(b);
    row.appendChild(b);
  });
  card.appendChild(row);

  function pick(idx) {
    var right = idx === opts.correct;
    btns.forEach(function (b, i) {
      b.disabled = true;
      if (i === opts.correct) b.classList.add('pzk-right');
      else if (i === idx) b.classList.add('pzk-wrong');
    });
    if (G.audio) G.audio.sfx(right ? 'select' : 'bump');
    if (opts.reveal) card.appendChild(el('div', 'pzk-reveal', opts.reveal));
    var go = el('button', 'btn btn-primary', opts.doneLabel || 'Let’s find out');
    go.type = 'button';
    go.addEventListener('click', function () {
      if (opts.onDone) opts.onDone(idx, right);
    });
    card.appendChild(go);
  }
  return card;
}

/* Coach interjection: portrait + name + line. */
function coachCard(who, html) {
  injectStyle();
  var card = el('div', 'pzk-coach');
  var src = G.sprites && G.sprites.portrait && G.sprites.portrait(who);
  if (src) {
    var c = document.createElement('canvas');
    c.width = 96; c.height = 96;
    c.getContext('2d').drawImage(src, 0, 0);
    card.appendChild(c);
  }
  var body = el('div', null);
  body.appendChild(el('div', 'pzk-cwho', G.util.esc(NAMES[who] || who)));
  body.appendChild(el('div', 'pzk-ctext', html));
  card.appendChild(body);
  return card;
}

function roundBanner(n, total, label) {
  injectStyle();
  var b = el('div', 'pzk-banner');
  b.appendChild(el('span', 'pzk-bn', 'Round ' + n + ' / ' + total));
  if (label) b.appendChild(el('span', 'pzk-bl', G.util.esc(label)));
  return b;
}

/* End card. opts: {title, html, buttonLabel, onButton, tone:'win'|'info'} */
function debriefCard(opts) {
  injectStyle();
  var tone = opts.tone === 'info' ? 'pzk-info' : 'pzk-win';
  var card = el('div', 'pzk-debrief ' + tone);
  if (opts.title) card.appendChild(el('h3', null, G.util.esc(opts.title)));
  if (opts.html) card.appendChild(el('div', 'pzk-dbody', opts.html));
  if (opts.buttonLabel) {
    var b = el('button', 'btn btn-primary', G.util.esc(opts.buttonLabel));
    b.type = 'button';
    b.addEventListener('click', function () { if (opts.onButton) opts.onButton(); });
    card.appendChild(b);
  }
  return card;
}

/* Escalating hints after consecutive failures: null, h[0], h[1], ... capped. */
function hintLadder(hints) {
  var fails = 0;
  return {
    fail: function () {
      fails++;
      if (fails < 2) return null;
      return hints[Math.min(fails - 2, hints.length - 1)] || null;
    },
    reset: function () { fails = 0; },
    count: function () { return fails; },
  };
}

/* ---------------- taught flags (persisted in the save) ---------------- */

function taught(type) { return G.flags.has('pz.' + type + '.taught'); }
function markTaught(type) { G.flags.set('pz.' + type + '.taught'); }

G.pz = {
  log2: log2, h2: h2, entropy: entropy, surprisal: surprisal, fmt: fmt,
  hookCard: hookCard, coachCard: coachCard, roundBanner: roundBanner,
  debriefCard: debriefCard, hintLadder: hintLadder,
  taught: taught, markTaught: markTaught,
};

})();
