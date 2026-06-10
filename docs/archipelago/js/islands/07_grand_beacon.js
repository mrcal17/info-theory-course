/* THE QUIET ARCHIPELAGO — ISLAND 7: The Grand Beacon (FINALE).
   A storm-lashed crag at night, rain hissing on stone. Pip docks at the base
   (south) and climbs a single-file SPIRAL of stairs and boardwalk switchbacks
   up the crag to the great dark beacon at the summit. The ascent IS the whole
   pipeline of the Last Message: COMPRESS it, PROTECT it, SEND it, VERIFY it.
   Four gates punctuate the climb — one per stage — and the only path runs
   through each in turn (water and cliff everywhere else; no bypass).

   Teaches: source–channel separation — the whole curriculum, composed.
   Mechanics (in ascent order): tree-planner -> parity-charm -> noisy-bridge ->
   venn-lock. Flag prefix: gb.  Sparks: exactly 3 (cellar mastery lock, a hidden
   storm-ledge spark, and Shannon's gift after the beacon is lit).

   The emotional core: Pip has been the message all along; the network is people. */
(function () {
'use strict';

G.islands.register({
  id: 'grand-beacon',
  name: 'The Grand Beacon',
  order: 7,
  palette: 'beacon',
  music: 'beacon',

  /* 38 wide x 40 tall. Read bottom-to-top:
       dock pool at the base (south) -> Shannon's first landing (the wide stone
       shelf, row 36) -> a SPIRAL of switchback shelves: single-tile stone runs
       ('s') joined by one-wide boardwalk links ('=') that alternate left/right
       so the climb winds up the crag (cliffs '^' wall every shelf; deep water
       '~' the rest) -> the great beacon ('!') on the summit platform (north).
       Glow crystals ('*') mark the path sparsely. Each boardwalk LINK is one
       tile wide, so the four gate doors sit on true chokes — the only way up:
         GATE 1 COMPRESS (14,34)  GATE 2 PROTECT (25,30)
         GATE 3 SEND     (14,26)  GATE 4 VERIFY  (25,22)
       The summit trigger (19,4) sits PAST gate 4 — unreachable until lit.
       A cellar mastery lock hides behind the base doorway ('+', 19,36); a hidden
       storm-ledge spark waits in the west stub (8,12) — seen from the dock,
       reached only by coming down off the top shelf. Verified single-file:
       blocking any gate cuts the summit and every gate above it. */
  map: `
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~^~~~^~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~^s!!!s^~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~^ss!!!^~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~^sssss^~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~^sssssss^~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~^sssssssss^~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~^sssssssss^~~~~~~~~~~~~~~~
~~~~~~~~~^^^^^^^sssssss^^^^~~~~~~~~~~~~~
~~~~~~~~^sssss=ssssssssssss^~~~~~~~~~~~~
~~~~~~~~^s^^^^=^^^^^^^^^^^^~~~~~~~~~~~~~
~~~~~~~^ss^~~^=^~~~~~~~~~~*~~~~~~~~~~~~~
~~~~~~~^s^~~~^=^^^^^^^^^^^^~~~~~~~~~~~~~
~~~~~~~~^~~~^s=ssssssssss=s^~~~~~~~~~~~~
~~~~~~~~~~~~~^^^^^^^^^^^^=^~~~~~~~~~~~~~
~~~~~~~~~~~~~*~~~~~~~~~~^=^~~~~~~~~~~~~~
~~~~~~~~~~~~~^^^^^^^^^^^^=^~~~~~~~~~~~~~
~~~~~~~~~~~~^s=ssssssssss=s^~~~~~~~~~~~~
~~~~~~~~~~~~~^=^^^^^^^^^^^^~~~~~~~~~~~~~
~~~~~~~~~~~~~^=^~~~~~~~~~~*~~~~~~~~~~~~~
~~~~~~~~~~~~~^=^^^^^^^^^^^^~~~~~~~~~~~~~
~~~~~~~~~~~~^s=ssssssssss=s^~~~~~~~~~~~~
~~~~~~~~~~~~~^^^^^^^^^^^^=^~~~~~~~~~~~~~
~~~~~~~~~~~~~*~~~~~~~~~~^=^~~~~~~~~~~~~~
~~~~~~~~~~~~~^^^^^^^^^^^^=^~~~~~~~~~~~~~
~~~~~~~~~~~~^s=ssssssssss=s^~~~~~~~~~~~~
~~~~~~~~~~~~~^=^^^^^^^^^^^^~~~~~~~~~~~~~
~~~~~~~~~~~~~^=^~~~~~~~~~~*~~~~~~~~~~~~~
~~~~~~~~~~~~~^=^^^^^^^^^^^^~~~~~~~~~~~~~
~~~~~~~~~~~~^s=ssssssssss=s^~~~~~~~~~~~~
~~~~~~~~~~~~~^^^^^^^^^^^^=^~~~~~~~~~~~~~
~~~~~~~~~~~~~*~~~~~~~~~~^=^~~~~~~~~~~~~~
~~~~~~~~~~~~~^^^^^^^^^^^^=^~~~~~~~~~~~~~
~~~~~~~~~~~~^s=ssssssssss=s^~~~~~~~~~~~~
~~~~~~~~~~~~~^=^^^^^^^^^^^^~~~~~~~~~~~~~
~~~~~~~~~~~~~^=^^^sssss^^^~~~~~~~~~~~~~~
~~~~~~~~~~~~~^=sssss+sssss^~~~~~~~~~~~~~
~~~~~~~~~~~~~~^^........^^~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~^^-==-^^~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~^====^~~~~~~~~~~~~~~~~~
`,

  spawn: { x: 18, y: 38 },

  entities: [
    /* ================= THE BASE / DOCK (south) ================= */
    { id: 'gb-sign-dock', type: 'sign', x: 21, y: 38,
      text: ['THE GRAND BEACON', 'Last light in the chain. Mind the stair; mind the storm.'] },

    /* ungated way back to the Spires (no forward portal — this is the end) */
    { id: 'gb-dock', type: 'portal', x: 19, y: 39, to: 'spires', at: { x: 20, y: 6 } },
    { id: 'gb-gull', type: 'npc', x: 22, y: 36, sprite: 'gull', name: 'Ferryman Gull',
      dialogue: [
        { ifFlag: 'gb.done', use: 'gb-gull-after' },
        { use: 'gb-gull-wait' },
      ] },

    /* the cellar mastery lock — the keeper's practice lock, behind the base.
       The base doorway gap ('+', 19,36) leads up to the cellar shelf (row 35). */
    { id: 'gb-sign-cellar', type: 'sign', x: 21, y: 35,
      text: ['THE KEEPER’S CELLAR', 'A practice lock, harder than the door above. For the steady-handed.'] },
    { id: 'gb-cellar', type: 'door', x: 19, y: 35, sprite: 'runedoor',
      puzzle: { type: 'venn-lock', config: { rounds: 8, twist: true } },
      flag: 'gb.cellar.done', sparks: 1, ifNotFlag: 'gb.cellar.done',
      lockedText: 'The keeper’s practice lock. Eight rings, and the last one lies.' },

    /* Dr. Shannon waits at the first landing (he sailed ahead) */
    { id: 'gb-shannon', type: 'npc', x: 17, y: 36, sprite: 'shannon', name: 'Dr. Shannon',
      dialogue: [
        { ifFlag: 'game.finished', ifNotFlag: 'gb.gift.done', use: 'gb-shannon-gift' },
        { ifFlag: 'game.finished', use: 'gb-shannon-post' },
        { ifFlag: 'gb.verify.done', use: 'gb-shannon-summit' },
        { ifFlag: 'gb.send.done', use: 'gb-shannon-verify' },
        { ifFlag: 'gb.protect.done', use: 'gb-shannon-send' },
        { ifFlag: 'gb.compress.done', use: 'gb-shannon-protect' },
        { use: 'gb-shannon-compress' },
      ] },

    /* ================= GATE 1 — COMPRESS (tree-planner) ================= */
    /* choke on the base->A boardwalk link (14,34) — the only way off the landing
       and up the crag; cliffs wall it, deep water everywhere else. */
    { id: 'gb-sign-g1', type: 'sign', x: 16, y: 36,
      text: ['GATE I · COMPRESS', 'The storm charges by the syllable. Send the Last Message short.'] },
    { id: 'gb-gate1', type: 'door', x: 14, y: 34, sprite: 'gate',
      puzzle: { type: 'tree-planner', config: {
        villages: [
          { name: '"come home"', daily: 11 },
          { name: '"we are well"', daily: 7 },
          { name: '"the lights hold"', daily: 5 },
          { name: '"send the boats"', daily: 3 },
          { name: '"thank you"', daily: 2 },
          { name: '"we remember"', daily: 1 },
        ],
        par: 'optimal',
      } },
      flag: 'gb.compress.done', sparks: 0, ifNotFlag: 'gb.compress.done',
      lockedText: 'The words of every island, pooled. Merge the two quietest first — Huff’s stump knew the trick.' },

    /* ================= GATE 2 — PROTECT (parity-charm) ================= */
    /* choke on the A->B boardwalk link (25,30), right side of the switchback */
    { id: 'gb-sign-g2', type: 'sign', x: 23, y: 29,
      text: ['GATE II · PROTECT', 'Rig the rings yourself now. A flip in the dark must not pass.'] },
    { id: 'gb-gate2', type: 'door', x: 25, y: 30, sprite: 'gate',
      puzzle: { type: 'parity-charm', config: { dataBits: 4, mode: 'correct', trips: 4 } },
      flag: 'gb.protect.done', sparks: 0, ifNotFlag: 'gb.protect.done',
      lockedText: 'The sisters’ charms — their rings, your hands. Set each group even; name the flip.' },

    /* ================= GATE 3 — SEND (noisy-bridge) ================= */
    /* choke on the B->C boardwalk link (14,26), left side, in the worst stretch */
    { id: 'gb-sign-g3', type: 'sign', x: 15, y: 25,
      text: ['GATE III · SEND', 'The last boardwalk, in the worst of it. Spend your planks; cross whole.'] },
    { id: 'gb-gate3', type: 'door', x: 14, y: 26, sprite: 'gate',
      puzzle: { type: 'noisy-bridge', config: { p: 0.3, segments: 6, budget: 26 } },
      flag: 'gb.send.done', sparks: 0, ifNotFlag: 'gb.send.done',
      lockedText: 'Six spans, the storm at thirty hundredths. Redundancy is how a message survives noise.' },

    /* ================= GATE 4 — VERIFY (venn-lock) ================= */
    /* choke on the C->D boardwalk link (25,22) — the beacon's own lock; the
       twist round is the storm's last trick before the summit. */
    { id: 'gb-sign-g4', type: 'sign', x: 23, y: 21,
      text: ['GATE IV · VERIFY', 'The beacon’s own lock. The last ring lies once — read it as designed.'] },
    { id: 'gb-gate4', type: 'door', x: 25, y: 22, sprite: 'runedoor',
      puzzle: { type: 'venn-lock', config: { rounds: 5, twist: true } },
      flag: 'gb.verify.done', sparks: 0, ifNotFlag: 'gb.verify.done',
      lockedText: 'Three rings, sworn even — the twins’ stamps taught you to read them. Mind the last.' },

    /* ================= THE SUMMIT ================= */
    /* the summit trigger sits on the platform stair PAST gate 4; reaching it
       requires all four gate flags (the path physically passes each gate). */
    { id: 'gb-summit-trigger', type: 'trigger', x: 19, y: 4, once: true,
      flag: 'gb.lit.fired',
      actions: [{ goto: 'gb-finale' }] },

    /* the hidden storm-ledge spark: in the west stub off the top shelf (8,12) —
       a glint seen from the dock below, reached only by stepping down off the
       summit shelf into the dead-end pocket. */
    { id: 'gb-spark-ledge', type: 'item', x: 8, y: 12, gives: 'spark',
      flag: 'gb.spark.ledge', ifNotFlag: 'gb.spark.ledge' },
    { id: 'gb-sign-ledge', type: 'sign', x: 9, y: 9,
      text: 'A glint on the west ledge, low on the crag. Seen from the dock; reached only from above.' },

    /* the great beacon: dark until lit, then blazing (stays lit forever after) */
    { id: 'gb-beacon-off', type: 'prop', x: 18, y: 2, sprite: 'beacon-off', ifNotFlag: 'gb.done' },
    { id: 'gb-beacon-on',  type: 'prop', x: 18, y: 2, sprite: 'beacon-on',  ifFlag: 'gb.done' },

    /* a small companion at the summit rail, post-finale, to sit with the light */
    { id: 'gb-turtle', type: 'npc', x: 20, y: 5, sprite: 'turtle', ifFlag: 'gb.done',
      dialogue: 'gb-turtle' },
  ],

  objectives: [
    { flag: 'gb.compress.done', hint: 'GATE I: compress the Last Message. Send it short.' },
    { flag: 'gb.protect.done',  hint: 'GATE II: protect it. Rig the parity rings yourself.' },
    { flag: 'gb.send.done',     hint: 'GATE III: send it across the storm boardwalk.' },
    { flag: 'gb.verify.done',   hint: 'GATE IV: verify it at the beacon’s own lock.' },
    { flag: 'gb.done',          hint: 'Climb to the summit and light the Grand Beacon.' },
  ],

  onEnter: [
    { ifNotFlag: 'gb.intro', goto: 'gb-intro' },
  ],

  dialogues: {
    /* ---------------- intro (once) ---------------- */
    'gb-intro': [
      { who: 'pip', text: 'Thunder. The whole chain behind me, lit — and this one still dark.' },
      { who: 'shannon', text: 'Hoo. You climbed the whole archipelago to get here. Of course you did.' },
      { who: 'shannon', text: 'I sailed ahead. I wanted to be at the bottom when you reached the top.' },
      { who: 'shannon', text: 'This is the last light. And we carry the Last Message up to it.' },
      { who: 'pip', text: 'The Last Message?' },
      { who: 'shannon', text: 'Every island gave a line. The dunes, the wood, the strait, the caves, the spires.' },
      { who: 'shannon', text: 'Pooled into one. We will send it ONCE, and it must arrive whole.' },
      { actions: [{ set: 'gb.intro' }, { sfx: 'save' }] },
    ],

    /* ---------------- Shannon, gate by gate ---------------- */
    'gb-shannon-compress': [
      { who: 'shannon', text: 'Up you go, then. Four gates, four things we learned. Take them in order.' },
      { who: 'shannon', text: 'GATE ONE. Six lines, some sent far more than others. The plan you found in Huff’s wood:' },
      { who: 'shannon', text: 'merge the two quietest, again and again. Shortest plan, cheapest send.' },
      { who: 'pip', text: 'Compress first. Before anything else.' },
      { who: 'shannon', text: 'Always first. You never armor what you have not yet made small. Go.' },
    ],
    'gb-shannon-protect': [
      { who: 'shannon', text: 'Hoo — compressed and clean. Now GATE TWO: protect it before the storm.' },
      { who: 'shannon', text: 'The sisters’ charms. But they are not here. You rig the rings alone tonight.' },
      { who: 'pip', text: 'Alone?' },
      { who: 'shannon', text: 'They taught you; now the rings are yours. Set each group even. A single flip cannot hide.' },
    ],
    'gb-shannon-send': [
      { who: 'shannon', text: 'Armored. Good. GATE THREE is the worst stretch — the open boardwalk, full storm.' },
      { who: 'shannon', text: 'Six spans, every plank snapping at thirty in a hundred. Spend your driftwood well.' },
      { who: 'pip', text: 'More copies where the noise is loudest.' },
      { who: 'shannon', text: 'That is the whole secret of crossing a thing that wants you to fall. Go carefully.' },
    ],
    'gb-shannon-verify': [
      { who: 'shannon', text: 'Across. You are nearly to the lamp. GATE FOUR is the beacon’s own lock.' },
      { who: 'shannon', text: 'Three rings. It mends one error every time — but tonight the storm tries the old trick.' },
      { who: 'pip', text: 'Two flips, wearing the mask of one.' },
      { who: 'shannon', text: 'Read it as it was designed to read. Trust the rings, even when they are fooled.' },
    ],
    'gb-shannon-summit': [
      { who: 'shannon', text: 'Compressed, protected, sent, verified. The Last Message is whole, small one.' },
      { who: 'shannon', text: 'The lamp is at the top of the stair. I will wait here. Go and light it.' },
    ],

    /* ---------------- THE LIGHTING (finale, short) ---------------- */
    'gb-finale': [
      { who: 'shannon', text: 'There. The Last Message, at the top of the stair. Lift it to the lamp.' },
      { who: 'pip', text: 'It is so light. After all that — it weighs nothing at all.' },
      { who: 'shannon', text: 'It never weighed much. Hoo. It only ever needed to arrive.' },
      { actions: [{ sfx: 'beacon' }, { quake: 700 }, { set: 'gb.done' }, { wait: 900 }] },
      { who: 'shannon', text: '...' },
      { who: 'pip', text: 'Beacon Rock answers. The Dunes. The Wood. The Strait, the Caves, the Spires.' },
      { who: 'shannon', text: 'Every light on the horizon, lit by the one we just sent up the stair.' },
      { who: 'pip', text: 'It was never just a letter. It was all of them. It was everyone.' },
      { who: 'shannon', text: 'It was you, courier. You were the message all along. The network is people.' },
      { actions: [{ wait: 700 }, { music: 'ending' }, { endGame: true }] },
    ],

    /* ---------------- post-ending (calmer weather, dialogues change) ---------------- */
    'gb-shannon-post': [
      { who: 'shannon', text: 'Quieter tonight. The storm spent itself the moment the lamp caught.' },
      { who: 'shannon', text: 'Some lights you climbed past too fast — sparks still waiting on the old islands.' },
      { who: 'shannon', text: 'Go back when you like. The ferry runs both ways now. Nothing is dark anymore.' },
      { choice: [
        { label: 'Which did I miss?', goto: 'gb-shannon-sparks' },
        { label: 'I’ll wander a while.', end: true },
      ] },
    ],
    'gb-shannon-sparks': [
      { who: 'shannon', text: 'A mastery door here and there. A glint on a ledge. The keeper’s cellar, just below us.' },
      { who: 'shannon', text: 'Twenty-one in all, if you want them. But you have already lit the thing that mattered.' },
      { end: true },
    ],

    /* Shannon's gift — after the beacon is lit, one-time, ANY answer is right */
    'gb-shannon-gift': [
      { who: 'shannon', text: 'Sit with me a moment, before you go. Indulge an old owl one question.' },
      { who: 'shannon', text: 'After all of it — every island, every lock — what did you actually learn?' },
      { choice: [
        { label: 'That a bit is one good yes/no question.', goto: 'gb-gift-give' },
        { label: 'That you compress first, then protect, then send.', goto: 'gb-gift-give' },
        { label: 'That a message is only ever the people behind it.', goto: 'gb-gift-give' },
      ] },
    ],
    'gb-gift-give': [
      { who: 'shannon', text: 'Hoo. Yes. That is exactly the right answer — they all were.' },
      { who: 'shannon', text: 'Here. The first spark from the network, the night it woke. Keep it.' },
      { actions: [{ give: 'spark' }, { set: 'gb.gift.done' }, { sfx: 'spark' }] },
      { who: 'shannon', text: 'Now go and see the lights you lit. All of them are waiting.' },
    ],

    /* ---------------- Ferryman Gull ---------------- */
    'gb-gull-wait': [
      { who: 'gull', text: 'Far as I sail, courier. This last climb is yours alone.' },
      { who: 'gull', text: 'Four gates up. The keeper’s at the landing. Mind the rail in this wind.' },
    ],
    'gb-gull-after': [
      { who: 'gull', text: 'Look at it. The whole horizon, burning gold. We did that. YOU did that.' },
      { who: 'gull', text: 'Say the word and I’ll run you back to any island you like. The water’s calm now.' },
    ],

    /* ---------------- summit companion (post-finale) ---------------- */
    'gb-turtle': [
      { who: 'turtle', text: 'I climbed up after the storm broke. Took me a while. Worth every stair.' },
      { who: 'turtle', text: 'You can see all seven lights from here. Sit a minute. They are not going dark again.' },
    ],
  },
});

})();
