/* THE QUIET ARCHIPELAGO — Pip's Field Notes (the codex).
   A registry of theory cards (one per mechanic, unlocked by the pedagogy
   taught-flags) and island lore pages (registered by islands, unlocked by
   quest flags). Pure view over G.flags — no new save state. Screen opens
   from the pause menu or the N key. Loaded after ui.js, before islands. */
(function () {
'use strict';

var entries = [];   // registration order preserved within groups

/* unlock: flag string, or array of flags (any one unlocks) */
function isUnlocked(e) {
  var u = e.unlock;
  if (!u) return true;
  if (Object.prototype.toString.call(u) === '[object Array]') {
    for (var i = 0; i < u.length; i++) if (G.flags.has(u[i])) return true;
    return false;
  }
  return G.flags.has(u);
}

G.codex = {
  /* {id, kind:'theory'|'lore', title, icon?, body(html), unlock, island?,
      moduleUrl?, moduleTitle?, hint?} */
  register: function (e) {
    if (!e || !e.id || !e.title) return;
    for (var i = 0; i < entries.length; i++) if (entries[i].id === e.id) return;
    entries.push(e);
  },
  entries: function () { return entries.slice(); },
  isUnlocked: isUnlocked,
  count: function () {
    var u = 0;
    for (var i = 0; i < entries.length; i++) if (isUnlocked(entries[i])) u++;
    return { unlocked: u, total: entries.length };
  },
};

/* ---------------- theory cards (one per mechanic) ---------------- */

var M = '../';  // course root relative to /archipelago/

[
  { id: 'th.bits', unlock: 'pz.binary-gate.taught', icon: '✉️',
    title: 'Bits are questions',
    body: 'Pinning one item out of <b>N</b> takes <b>log₂N bits</b> of information, ' +
      'and a yes/no answer carries at most one bit — exactly one when the question ' +
      'splits the candidates in half. That is why the sorting machine needs ' +
      '⌈log₂N⌉ questions, and why lopsided questions waste paper.',
    moduleUrl: M + '1a_entropy/', moduleTitle: 'Entropy & Information',
    hint: 'Sort a letter through the machine on Beacon Rock.' },
  { id: 'th.trits', unlock: 'pz.scales.taught', icon: '⚖️',
    title: 'The beam speaks base three',
    body: 'A weighing has three outcomes — left, right, level — so it answers a ' +
      'three-way question: <b>log₂3 ≈ 1.58 bits</b>. Finding one fake among 9 coins ' +
      'needs log₂9 ≈ 3.17 bits, and 2 × 1.58 ≥ 3.17 — two weighings, never one. ' +
      'Every plan that leaves more suspects than outcomes has already lost.',
    moduleUrl: M + '1a_entropy/', moduleTitle: 'Entropy & Information',
    hint: 'Balance the harbor scales on Beacon Rock.' },
  { id: 'th.surprisal', unlock: 'pz.forecast.taught', icon: '⛲',
    title: 'Surprise is priced in bits',
    body: 'An event of probability <b>p</b> carries <b>−log₂p bits</b> of surprise: ' +
      'halve the chance, add one bit. A field of geysers pays, on average, ' +
      '<b>H = Σ p·log₂(1/p)</b> — the entropy. You watched the running average ' +
      'converge onto the number you assembled by hand.',
    moduleUrl: M + '1a_entropy/', moduleTitle: 'Entropy & Information',
    hint: 'Price the geysers on the Dune of Surprises.' },
  { id: 'th.floor', unlock: 'pz.question-tree.taught', icon: '🌿',
    title: 'Entropy is the floor',
    body: 'Any strategy of yes/no questions is a binary tree, and its expected ' +
      'depth <b>Σ p·depth</b> can never average below <b>H</b>. Depth is code ' +
      'length: the path of answers IS the critter\'s codeword. Cheap interrogations ' +
      'and short codes are the same discovery.',
    moduleUrl: M + '2a_source_coding/', moduleTitle: 'Source Coding',
    hint: 'File Sift\'s critter catalogue in the dunes.' },
  { id: 'th.huffman', unlock: 'pz.tree-planner.taught', icon: '🌲',
    title: 'Huffman\'s greedy is unbeatable',
    body: 'Merge the two <i>quietest</i> trailheads, every time. The total cost ' +
      '<b>Σ daily·depth</b> equals the sum of every junction\'s combined traffic — ' +
      'and the greedy merge provably minimizes it. Busy villages sit shallow; ' +
      'busy symbols get short codes.',
    moduleUrl: M + '2b_huffman/', moduleTitle: 'Huffman Coding',
    hint: 'Replan Huff\'s trails in Huffman Wood.' },
  { id: 'th.kraft', unlock: 'pz.prefix-gate.taught', icon: '🪈',
    title: 'Kraft\'s vessel',
    body: 'Prefix-free codewords occupy disjoint subtrees, so their budget ' +
      '<b>Σ 2^−lenᵢ ≤ 1</b> — a vessel that cannot overflow. A length-1 whistle ' +
      'burns half the tree. Some requests ({1,1,2}) are not hard but <i>impossible</i>, ' +
      'and the vessel proves it.',
    moduleUrl: M + '2a_source_coding/', moduleTitle: 'Source Coding',
    hint: 'Carve the signpost whistles in Huffman Wood.' },
  { id: 'th.parity', unlock: 'pz.parity-charm-detect.taught', icon: '🧿',
    title: 'Parity catches, but cannot find',
    body: 'One extra charm makes the count even, so any single flip screams — but ' +
      'it cannot say <i>which</i> rune flipped, and two flips cancel and slip ' +
      'past unseen. Detection is one bit of protection; correction costs more.',
    moduleUrl: M + '4a_linear_codes/', moduleTitle: 'Linear Codes',
    hint: 'Earn Ada\'s crossing charm in the Static Strait.' },
  { id: 'th.syndrome', unlock: 'pz.parity-charm-correct.taught', icon: '📍',
    title: 'The syndrome names the culprit',
    body: 'Wire three charms over overlapping groups (Hamming\'s 7,4) and the ' +
      'pattern of <i>which checks fail</i> becomes an address: each single flip ' +
      'lights a unique set of rings. Read the pattern, fix the bit — no guessing.',
    moduleUrl: M + '4a_linear_codes/', moduleTitle: 'Linear Codes',
    hint: 'Read Bea\'s syndrome rings in the Static Strait.' },
  { id: 'th.hamming', unlock: 'pz.venn-lock.taught', icon: '🔓',
    title: '8 patterns, 7 positions, 1 clean',
    body: 'Three even/odd checks can show <b>2³ = 8</b> distinct alarm patterns — ' +
      'exactly enough to name 7 possible flip positions plus "all clean". That ' +
      'counting argument IS Hamming(7,4), and it has no slack: two flips forge ' +
      'a valid-looking address and the lock is deceived.',
    moduleUrl: M + '4a_linear_codes/', moduleTitle: 'Linear Codes',
    hint: 'Open the rune lock of the lighthouse.' },
  { id: 'th.noise', unlock: 'pz.noisy-bridge.taught', icon: '🌉',
    title: 'Chains multiply, redundancy votes',
    body: 'Independent failures multiply: five 90% planks cross only ' +
      '0.9⁵ ≈ 59% of the time. Majority-of-3 turns plank chance p of failing into ' +
      'roughly 3p² — repetition buys reliability, but expensively. Smarter codes ' +
      '(the lighthouse\'s 3 charms guarding 4 runes) buy the same safety cheaper. ' +
      'Good codes still fail — rarely. Bad ones fail surely.',
    moduleUrl: M + '3b_channel_coding_theorem/', moduleTitle: 'Channel Coding',
    hint: 'Bridge the storm channel in the Static Strait.' },
  { id: 'th.lz', unlock: 'pz.stamp-carver.taught', icon: '🪨',
    title: 'A stamp is a bet on repetition',
    body: 'Carving a stamp costs its length; using it costs one press. The bet ' +
      'pays when the pattern repeats — <b>uses×(len−1) − len > 0</b> — and that ' +
      'is the whole of LZ compression. A patternless corridor offers no winning ' +
      'bets: most strings simply do not compress.',
    moduleUrl: M + '2d_lempel_ziv/', moduleTitle: 'Lempel–Ziv',
    hint: 'Carve stamps in the Echo Caverns.' },
  { id: 'th.mi', unlock: 'pz.pair-lock.taught', icon: '🗼',
    title: 'Mutual information is paid-for entropy',
    body: 'Watching tower A leaves H(B|A) bits of doubt about tower B; the ' +
      'difference <b>I(X;Y) = H(B) − H(B|A)</b> is what A\'s motion pays for. ' +
      'When every row of the joint grid is the same row, I = 0 — structure in ' +
      'the marginals can still mean nothing passes between the towers.',
    moduleUrl: M + '1b_kl_mutual_information/', moduleTitle: 'KL & Mutual Information',
    hint: 'Tune the twin dials of the Mirror Spires.' },
  { id: 'th.pred', unlock: 'pz.oracle-walk.taught', icon: '🔮',
    title: 'Prediction is compression',
    body: 'Guessing the next glyph costs bits — fewer when you know the prefix. ' +
      'Your average is your <b>cross-entropy</b>, and a predictor that scores k ' +
      'bits/glyph can compress the corridor to k bits per glyph. Language models ' +
      'are graded on exactly this walk.',
    moduleUrl: M + '6f_it_llms/', moduleTitle: 'Information Theory of LLMs',
    hint: 'Walk the Prophecy Corridor in the Mirror Spires.' },
].forEach(function (e) { e.kind = 'theory'; G.codex.register(e); });

/* ---------------- unlock toasts ---------------- */

function watchesFlag(e, f) {
  var u = e.unlock;
  if (!u) return false;
  if (Object.prototype.toString.call(u) === '[object Array]') return u.indexOf(f) >= 0;
  return u === f;
}

G.bus.on('flags-changed', function (f) {
  if (!f) return;
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (watchesFlag(e, f) && isUnlocked(e)) {
      // only toast the first unlocking flag (any-of arrays fire once because
      // isUnlocked was false before this flag and the toast is per-change)
      if (G.ui && G.ui.toast) G.ui.toast('📖 Field note: ' + e.title);
      if (G.audio) G.audio.sfx('spark');
      break;
    }
  }
});

/* ---------------- the screen ---------------- */

function injectStyle() {
  if (document.getElementById('cdx-style')) return;
  var s = document.createElement('style');
  s.id = 'cdx-style';
  s.textContent = [
    '.cdx-list{display:flex;flex-direction:column;gap:.6rem;max-height:min(58vh,520px);overflow-y:auto;',
    '  padding:.2rem .2rem .2rem 0;margin:.6rem 0;}',
    '.cdx-card{border:1px solid var(--surface2);border-radius:12px;padding:.65rem .8rem;background:var(--surface);}',
    '.cdx-card.cdx-locked{opacity:.62;border-style:dashed;}',
    '.cdx-t{display:flex;align-items:baseline;gap:.5rem;font-weight:700;font-size:.95rem;color:var(--text);}',
    '.cdx-t .cdx-icon{flex:0 0 auto;}',
    '.cdx-kind{margin-left:auto;font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);}',
    '.cdx-b{font-size:.86rem;line-height:1.55;color:var(--muted);margin-top:.35rem;}',
    '.cdx-b b{color:var(--cyan);}',
    '.cdx-b i{color:var(--text);}',
    '.cdx-m{display:inline-block;margin-top:.45rem;font-size:.8rem;color:var(--blue);text-decoration:none;}',
    '.cdx-m:hover{text-decoration:underline;}',
    '.cdx-hint{font-size:.82rem;color:var(--dim);margin-top:.3rem;font-style:italic;}',
    '.cdx-sec{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin:.4rem 0 0;}',
  ].join('');
  document.head.appendChild(s);
}

var cdxEl = null, cdxKeys = null, cdxPrevState = 'world';

function closeCodex() {
  if (cdxKeys) { try { cdxKeys.release(); } catch (e) {} cdxKeys = null; }
  if (cdxEl) { cdxEl.remove(); cdxEl = null; }
  G.state = cdxPrevState === 'menu' ? 'world' : cdxPrevState;
  G.paused = false;
  if (G.audio) G.audio.sfx('close');
}

function el(tag, cls, html) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function card(e) {
  var open = isUnlocked(e);
  var c = el('div', 'cdx-card' + (open ? '' : ' cdx-locked'));
  var t = el('div', 'cdx-t');
  t.appendChild(el('span', 'cdx-icon', open ? (e.icon || '📄') : '🔒'));
  t.appendChild(el('span', null, open ? G.util.esc(e.title) : '? ? ?'));
  t.appendChild(el('span', 'cdx-kind', e.kind === 'theory' ? 'theorem' : 'field note'));
  c.appendChild(t);
  if (open) {
    c.appendChild(el('div', 'cdx-b', e.body || ''));
    if (e.moduleUrl) {
      var a = el('a', 'cdx-m', 'Go deeper: ' + G.util.esc(e.moduleTitle || 'course module') + ' →');
      a.href = e.moduleUrl;
      c.appendChild(a);
    }
  } else if (e.hint) {
    c.appendChild(el('div', 'cdx-hint', G.util.esc(e.hint)));
  }
  return c;
}

G.ui = G.ui || {};
G.ui.openCodex = function () {
  injectStyle();
  if (cdxEl) return;
  cdxPrevState = G.state;
  G.state = 'codex';
  G.paused = true;
  if (G.audio) G.audio.sfx('open');

  var dim = el('div', 'ui-dim');
  var panel = el('div', 'ui-panel');
  var n = G.codex.count();
  panel.appendChild(el('div', 'ui-panel-h', 'Pip’s Field Notes'));
  panel.appendChild(el('div', 'ui-panel-sub', n.unlocked + ' of ' + n.total + ' pages filled'));

  var list = el('div', 'cdx-list');
  var theory = entries.filter(function (e) { return e.kind === 'theory'; });
  var lore = entries.filter(function (e) { return e.kind !== 'theory'; });
  if (theory.length) {
    list.appendChild(el('div', 'cdx-sec', 'What the islands taught'));
    theory.forEach(function (e) { list.appendChild(card(e)); });
  }
  if (lore.length) {
    var byIsland = {};
    lore.forEach(function (e) {
      var k = e.island || 'elsewhere';
      (byIsland[k] = byIsland[k] || []).push(e);
    });
    Object.keys(byIsland).forEach(function (k) {
      var name = (G.islands && G.islands.get && G.islands.get(k) && G.islands.get(k).name) || k;
      list.appendChild(el('div', 'cdx-sec', 'Notes — ' + G.util.esc(name)));
      byIsland[k].forEach(function (e) { list.appendChild(card(e)); });
    });
  }
  panel.appendChild(list);

  var back = el('button', 'ui-btn ui-back', 'Close');
  back.addEventListener('click', function () { closeCodex(); });
  panel.appendChild(back);

  dim.appendChild(panel);
  dim.addEventListener('mousedown', function (e) { if (e.target === dim) closeCodex(); });
  document.body.appendChild(dim);
  cdxEl = dim;

  // own key handling (capture; engine ignores state 'codex')
  var onKey = function (e) {
    if (e.key === 'Escape' || e.code === 'KeyN') {
      e.preventDefault(); e.stopPropagation(); closeCodex();
    }
  };
  document.addEventListener('keydown', onKey, true);
  cdxKeys = { release: function () { document.removeEventListener('keydown', onKey, true); } };
};

})();
