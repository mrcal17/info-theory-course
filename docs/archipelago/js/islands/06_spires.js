/* THE QUIET ARCHIPELAGO — ISLAND 6: Mirror Spires.
   The penultimate island. Dusk-purple and dreamlike: twin towers on twin crags,
   mirrored across a still tidal channel, humming the same note. The Mirror Warden
   (a silver fox) keeps both towers and speaks in paired sentences — the second
   half mirroring the first — because that is what dependence looks like.
   Teaches: dependence = shared bits (mutual information); prediction = compression.
   Mechanics: pair-lock (the twin dials) and oracle-walk (the prophecy corridor).
   Flag prefix: ms.  Sparks: exactly 3.

   ---- DESIGN NUMBERS (computed, not guessed) ----
   MAIN GATE A — pair-lock, east tower. joint [[12,1,1],[1,12,1],[1,1,12]] (×1/42).
     I(X;Y) = 0.85 bits.  best-rate (argmax of conditional) = 85.71%.
     blind chance-rate = 33.33%.  rounds 9 / goal 6 -> honest argmax wins ~97%.
   MASTERY — pair-lock, west tower attic. joint [[15,9,0],[0,9,15],[9,8,1]] (×1/66).
     MISLEADING MARGINAL: P(B) col totals = [.364,.394,.242] so blind chance picks
     ☀ (col 1) — yet ☀ is NEVER the argmax of any conditional row (row argmaxes are
     ☾,✶,☾ = cols 0,2,0). Only conditioning ever wins. I(X;Y)=0.52, best 59.1%,
     chance 39.4%.  rounds 11 / goal 5 -> honest argmax wins ~89%.
   ORACLE — oracle-walk, prophecy corridor. text 67 chars; engine free prefix = 7,
     so 60 predicted steps. budget = 60 × 1.45 = 87.0 bits. A perfect predictor pays
     60 (1.0/step); the budget grants 27 bits of slack; blind coin-flipping averages
     60×1.58 = 94.8 bits > 87 and fails. Punishes guessing, rewards a reader. */
(function () {
'use strict';

G.islands.register({
  id: 'spires',
  name: 'Mirror Spires',
  order: 6,
  palette: 'spires',
  music: 'spires',

  /* 51 wide x 34 tall. Built with deliberate near-symmetry across column 25:
       twin towers (west cx=13, east cx=37) on twin crags, dusk meadows between,
       the tidal channel + central causeway (=) to the south, and the straight
       PROPHECY CORRIDOR walled in the centre. Each tower has exactly ONE doorway
       (+) — the pair-lock doors sit on those chokes; the corridor has exactly ONE
       south doorway — the oracle door sits there. The map mirrors EXCEPT one stone:
       the east meadow carries a lone boulder (o) at (42,13); its west twin (8,13)
       is open grass where a spark hides. */
  map: `
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~SSSSSSS~~~~~~~~~~~~~~~~~SSSSSSS~~~~~~~~~~
~~~~~~~~~~SsssssS~~~~~~~~~~~~~~~~~SsssssS~~~~~~~~~~
~~~~~~~~~~Ss!s!sS~~~~~~~~~~~~~~~~~Ss!s!sS~~~~~~~~~~
~~~~~~~~~~SsssssS~~~~~~~~~~~~~~~~~SsssssS~~~~~~~~~~
~~~~~~~~~~SsssssS~~~~~~~~~~~~~~~~~SsssssS~~~~~~~~~~
~~~~~~~~,,SsssssS,,,,,,,,,,,,,,,,,SsssssS,,~~~~~~~~
~~~~~~,,,,SSS+SSS,,,,,,,,,,,,,,,,,SSS+SSS,,,,~~~~~~
~~~~~,,,,,sssssss,,,,,,,,,,,,,,,,,sssssss,,,,,~~~~~
~~~~,,,;;,sssssss,,,,,,,,,,,,,,,,,sssssss,;;,,,~~~~
~~~,,,;;;,sssssss,,,,,,,,,,,,,,,,,sssssss,;;;,,,~~~
~~,,,,;;,,sssssss,,,,,,,,,,,,,,,,,sssssss,,;;,,,,~~
~~,,,,,,,,,sssss,,,,,,,sssss,,,,,,,sssss,,,,,,,,,~~
~~,",,,,,,,sssss,,,,,,,sssss,,,,,,,sssss,,o,,,,",~~
~~,,,,,,,,,,sss,,,,,,,,sssss,,,,,,,,sss,,,,,,,,,,~~
~~~,,,,,,,,,,_,,,,,,,,,sssss,,,,,,,,,_,,,,,,,,,,~~~
~~~~,,,,,,,,,_,,,,,,SSSSSSSSSSS,,,,,,_,,,,,,,,,~~~~
~~~~~,,,,,,,,_,,,,,,SsssssssssS,,,,,,_,,,,,,,,~~~~~
~~~~~~,,,,,,,_,,,,,,SsssssssssS,,,,,,_,,,,,,,~~~~~~
~~~~~~~,,,,,,_,,,,,,SsssssssssS,,,,,,_,,,,,,~~~~~~~
~~~~~~~~,,,,,_,,,,,,SsssssssssS,,,,,,_,,,,,~~~~~~~~
~~~~~~~~~,,,,_,,,,,,SsssssssssS,,,,,,_,,,,~~~~~~~~~
~~~~~~~~~~,,,_,,,,,,SSSSS+SSSSS,,,,,,_,,,~~~~~~~~~~
~~~~~~~~~~~,,_,,,,,,,,,,,_,,,,,,,,,,,_,,~~~~~~~~~~~
~~~~~~~~~~~,,____________=____________,,~~~~~~~~~~~
~~~~~~~~~~~~,,,,,,,,,,,,,,,,,,,,,,,,,,,~~~~~~~~~~~~
~~~~~~~~~~~~~,,,,,,,,,,,,,,,,,,,,,,,,,~~~~~~~~~~~~~
~~~~~~~~~~~~~~~..........=..........~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~--.........=.........--~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~-........=........-~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~-......=......-~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~-....=....-~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`,

  /* arrive on the grass at the head of the causeway, between the back-dock and the
     towers — never on a portal. */
  spawn: { x: 25, y: 26 },

  entities: [
    /* ---------- the Mirror Warden, on the causeway ---------- */
    { id: 'ms-warden', type: 'npc', x: 25, y: 24, sprite: 'warden', name: 'Mirror Warden',
      dialogue: [
        { ifFlag: 'game.finished', use: 'ms-warden-post' },
        { ifFlag: 'ms.done', use: 'ms-warden-done' },
        { ifFlag: 'ms.dials.done', use: 'ms-warden-readytune' },
        { ifFlag: 'ms.oracle.done', use: 'ms-warden-readytune' },
        { ifFlag: 'ms.met-warden', use: 'ms-warden-again' },
        { use: 'ms-warden-1' },
      ] },

    /* ---------- signs ---------- */
    { id: 'ms-sign-dock', type: 'sign', x: 23, y: 26,
      text: ['MIRROR SPIRES', 'Two towers. One note. Hush — they are agreeing.'] },
    { id: 'ms-sign-corridor', type: 'sign', x: 27, y: 23,
      text: ['THE PROPHECY CORRIDOR', 'The floor remembers what the voice was going to say.'] },
    { id: 'ms-sign-east', type: 'sign', x: 35, y: 9,
      text: ['EAST TOWER — THE TWIN DIALS', 'Watch the west, and the east owes you no surprise.'] },
    { id: 'ms-sign-break', type: 'sign', x: 44, y: 14,
      text: 'A weathered placard: "The towers differ in one stone only. The keen eye finds the odd one — and its empty twin."' },

    /* ---------- MAIN GATE A: pair-lock at the east tower entrance ---------- */
    /* sits on the east tower's only doorway (37,7); blocks the tower with no bypass. */
    { id: 'ms-dials', type: 'door', x: 37, y: 7, sprite: 'runedoor',
      puzzle: { type: 'pair-lock', config: {
        labels: ['☾', '☀', '✶'],
        joint: [[12, 1, 1], [1, 12, 1], [1, 1, 12]],
        rounds: 9, goal: 6,
      } },
      flag: 'ms.dials.done', sparks: 0, ifNotFlag: 'ms.dials.done',
      lockedText: 'THE TWIN DIALS — tower A turns by itself. Tune tower B to answer it.' },

    /* ---------- MAIN GATE B: oracle-walk at the corridor entrance ---------- */
    /* sits on the corridor's only doorway (25,22); the corridor is a dead-end gallery. */
    { id: 'ms-oracle', type: 'door', x: 25, y: 22, sprite: 'runedoor',
      puzzle: { type: 'oracle-walk', config: {
        text: 'the towers do not echo they answer for the sea between them is thin',
        bitsBudget: 87.0,
      } },
      flag: 'ms.oracle.done', sparks: 0, ifNotFlag: 'ms.oracle.done',
      lockedText: 'THE PROPHECY CORRIDOR — the floor spells ahead. Read it before it lights.' },

    /* ---------- MASTERY: pair-lock at the west tower attic ---------- */
    /* sits on the west tower's only doorway (13,7); the misleading-marginal joint —
       blind chance favours ☀, but ☀ is never any conditional's argmax. */
    { id: 'ms-mastery', type: 'door', x: 13, y: 7, sprite: 'runedoor',
      puzzle: { type: 'pair-lock', config: {
        labels: ['☾', '☀', '✶'],
        joint: [[15, 9, 0], [0, 9, 15], [9, 8, 1]],
        rounds: 11, goal: 5,
      } },
      flag: 'ms.attic.done', sparks: 1, ifNotFlag: 'ms.attic.done',
      lockedText: 'THE WEST ATTIC LOCK — ☀ shines brightest of all, yet never answers. Why?' },
    { id: 'ms-sign-west', type: 'sign', x: 11, y: 9,
      text: ['WEST TOWER — THE BLIND DIAL', 'Trust the marginal and you lose; condition, and you win.'] },

    /* ---------- hidden spark at the symmetry break ---------- */
    /* the east meadow has a lone boulder at (42,13); its WEST twin (8,13) is open
       grass — the spark hides in the empty stone's place. */
    { id: 'ms-spark-break', type: 'item', x: 8, y: 13, gives: 'spark',
      flag: 'ms.spark.break', ifNotFlag: 'ms.spark.break' },

    /* ---------- the reflection side-quest: the gull twins ---------- */
    /* west gull lost her twin's feather; the feather lies on the east crag. */
    { id: 'ms-gull-west', type: 'npc', x: 5, y: 12, sprite: 'gullsmall', name: 'West Gull', wander: true,
      dialogue: [
        { ifFlag: 'ms.feather.done', use: 'ms-gull-west-done' },
        { ifFlag: 'ms.feather.got', use: 'ms-gull-west-return' },
        { use: 'ms-gull-west-1' },
      ] },
    /* the lost feather (item 'letter' reskinned by dialogue), on the east meadow */
    { id: 'ms-feather', type: 'item', x: 45, y: 11, gives: 'letter',
      flag: 'ms.feather.got', ifNotFlag: 'ms.feather.got' },
    { id: 'ms-gull-east', type: 'npc', x: 45, y: 9, sprite: 'gullsmall', name: 'East Gull', wander: true,
      dialogue: 'ms-gull-east' },

    /* ---------- a turtle ferrygull-keeper near the dock for flavor ---------- */
    { id: 'ms-turtle', type: 'npc', x: 21, y: 27, sprite: 'turtle', wander: true,
      dialogue: 'ms-turtle' },

    /* ---------- the two beacons, lit in unison only when ms.done ---------- */
    { id: 'ms-beacon-w-off', type: 'prop', x: 13, y: 3, sprite: 'beacon-off', ifNotFlag: 'ms.done' },
    { id: 'ms-beacon-w-on',  type: 'prop', x: 13, y: 3, sprite: 'beacon-on',  ifFlag: 'ms.done' },
    { id: 'ms-beacon-e-off', type: 'prop', x: 37, y: 3, sprite: 'beacon-off', ifNotFlag: 'ms.done' },
    { id: 'ms-beacon-e-on',  type: 'prop', x: 37, y: 3, sprite: 'beacon-on',  ifFlag: 'ms.done' },

    /* ---------- trigger: both gates done -> the towers sing in unison ----------
       Exists only once the oracle is solved and only until ms.done; NOT `once`, so
       it can never be consumed early. Its dispatcher dialogue checks the other gate
       and sings ms.done only when BOTH are set. The Warden offers the same song as a
       guaranteed second path, so the main quest can never softlock. */
    { id: 'ms-unison', type: 'trigger', x: 25, y: 25,
      ifFlag: 'ms.oracle.done', ifNotFlag: 'ms.done',
      actions: [ { goto: 'ms-unison-dispatch' } ] },

    /* ---------- portals ---------- */
    /* back to the Echo Caverns (ungated) — the west shore landing you arrived at. */
    { id: 'ms-dock-back', type: 'portal', x: 18, y: 27, to: 'caverns', at: { x: 25, y: 26 } },
    /* forward to the Grand Beacon (gated on ms.done) — the causeway's far end. */
    { id: 'ms-dock-forward', type: 'portal', x: 25, y: 32, to: 'grand-beacon',
      requiresFlag: 'ms.done',
      deniedDialogue: [
        { who: 'warden', text: 'The last bridge holds its breath; the last bridge waits for yours.' },
        { who: 'warden', text: 'Lock both towers first, and the channel will quiet; quiet the channel, and you may cross.' },
      ] },
  ],

  objectives: [
    { flag: 'ms.met-warden',  hint: 'Speak with the Mirror Warden on the causeway.' },
    { flag: 'ms.dials.done',  hint: 'Tune the Twin Dials at the east tower.' },
    { flag: 'ms.oracle.done', hint: 'Walk the Prophecy Corridor between the towers.' },
    { flag: 'ms.done',        hint: 'Both towers tuned — let them sing in unison.' },
  ],

  onEnter: [
    { ifNotFlag: 'ms.intro', goto: 'ms-intro' },
  ],

  dialogues: {
    /* ---------- intro (once) ---------- */
    'ms-intro': [
      { who: 'pip', text: '...two towers. Both humming. The exact same note, held forever.' },
      { who: 'pip', text: 'My antenna is twitching. That is not an echo — an echo would lag.' },
      { who: 'pip', text: 'They start together. They stop together. They are not echoing...' },
      { who: 'pip', text: 'They are AGREEING. A fox is watching me from the causeway. Quietly.' },
      { actions: [{ set: 'ms.intro' }, { sfx: 'save' }] },
    ],

    /* ---------- the Mirror Warden (paired-sentence voice) ---------- */
    'ms-warden-1': [
      { who: 'warden', text: 'You hear two towers; I hear one bond. They do not echo; they answer.' },
      { who: 'warden', text: 'Watch the west tower long enough, and the east tower owes you no surprise.' },
      { who: 'warden', text: 'What one knows of the other — that is their bond, measured in bits.' },
      { who: 'pip', text: 'So seeing one... tells me something about the other?' },
      { who: 'warden', text: 'Just so. Two coins flipped apart tell you nothing; two towers tied close tell you much.' },
      { who: 'warden', text: 'East tower, learn how they move together; corridor, learn what the floor will say.' },
      { actions: [{ set: 'ms.met-warden' }, { sfx: 'talk' }] },
    ],
    'ms-warden-again': [
      { who: 'warden', text: 'The dials hold a secret; the corridor holds a sentence. Both are yours to read.' },
      { choice: [
        { label: 'How do the dials work?', goto: 'ms-warden-dials' },
        { label: 'And the corridor?', goto: 'ms-warden-corridor' },
        { label: 'I will go and listen.', end: true },
      ] },
    ],
    'ms-warden-dials': [
      { who: 'warden', text: 'Tower A turns on its own; you tune tower B to answer it.' },
      { who: 'warden', text: 'Guess blind, and you scrape past one time in three; read the heat, and you ring far more.' },
      { who: 'warden', text: 'The grid shows how they move together; the bits show how much that knowing is worth.' },
      { end: true },
    ],
    'ms-warden-corridor': [
      { who: 'warden', text: 'The floor spells a sentence; the dark stones hide its end.' },
      { who: 'warden', text: 'Guess each next glyph well, and you pay near a bit; guess at random, and you pay half again.' },
      { who: 'warden', text: 'A good guesser writes the message short; to predict it well is to compress it.' },
      { end: true },
    ],
    'ms-warden-done': [
      { who: 'warden', text: 'Both towers tuned; both towers true. The note steadies, and so do you.' },
      { who: 'warden', text: 'The ferry will sail when you wish it. The last island asks for everything you carry.' },
      { who: 'pip', text: 'Everything? I have only a few letters left, and three sparks.' },
      { who: 'warden', text: 'Not in your satchel, small courier. What you carry is what you have learned.' },
    ],
    'ms-warden-post': [
      { who: 'warden', text: 'Quiet at last, the whole chain lit — and you the one who tied it together.' },
      { end: true },
    ],

    /* the Warden's branch while one or both gates are tuned but not yet sung.
       The "both done" line only shows when BOTH flags are set; otherwise the player
       gets a precise nudge to the unfinished gate. Either way it routes to the
       dispatcher, which sings only when both are present. */
    'ms-warden-readytune': [
      { ifFlag: 'ms.dials.done', ifNotFlag: 'ms.oracle.done', who: 'warden',
        text: 'The dials are tuned; the corridor is not. Read the floor, then return to me.' },
      { ifFlag: 'ms.oracle.done', ifNotFlag: 'ms.dials.done', who: 'warden',
        text: 'The corridor is walked; the dials are not. Tune the east tower, then return to me.' },
      { ifFlag: 'ms.dials.done', ifNotFlag: 'ms.oracle.done', actions: [{ sfx: 'talk' }] },
      { ifFlag: 'ms.oracle.done', ifNotFlag: 'ms.dials.done', actions: [{ sfx: 'talk' }] },
      { goto: 'ms-unison-dispatch' },
    ],

    /* dispatcher: sings the unison ONLY when BOTH gates are solved; else ends quietly.
       The first step requires both flags before it can route to the song. */
    'ms-unison-dispatch': [
      { ifFlag: 'ms.dials.done', ifNotFlag: 'ms.oracle.done', end: true },
      { ifFlag: 'ms.oracle.done', ifNotFlag: 'ms.dials.done', end: true },
      { ifNotFlag: 'ms.dials.done', end: true },
      { ifNotFlag: 'ms.oracle.done', end: true },
      { goto: 'ms-unison-song' },
    ],

    /* the towers sing in unison once BOTH gates are solved (sets ms.done) */
    'ms-unison-song': [
      { who: 'warden', text: 'You read the dials; you walked the words. Now hear what they were holding for you.' },
      { actions: [{ sfx: 'beacon' }, { quake: 450 }, { wait: 300 }, { set: 'ms.done' }, { focus: { x: 25, y: 4 } } ] },
      { who: 'warden', text: 'Two towers, one chord. The west sings; the east answers; neither is alone.' },
      { who: 'warden', text: 'That chord IS their shared bits, sung aloud. Go — the last beacon waits across the water.' },
    ],

    /* ---------- the gull twins (reflection side-quest) ---------- */
    'ms-gull-west-1': [
      { who: 'gullsmall', text: 'Oh, courier — have you crossed to the east crag? My twin is over there.' },
      { who: 'gullsmall', text: 'We always lose the same feather on the same day. Mirror birds, my mother called us.' },
      { who: 'gullsmall', text: 'Hers fell on the east meadow this time. If you find a pale feather there, bring it back?' },
      { actions: [{ sfx: 'talk' }] },
    ],
    'ms-gull-west-return': [
      { who: 'gullsmall', text: 'That is it! Her feather, pale at the tip — I would know it in the dark.' },
      { who: 'pip', text: 'It was on the east crag, just where you said. Same spot, mirrored across.' },
      { who: 'gullsmall', text: 'Of course it was. Two of a kind: see one, and you already know the other.' },
      { who: 'gullsmall', text: 'Here — a spark from the old west lamp. For a courier who understands twins.' },
      { actions: [{ give: 'spark' }, { set: 'ms.feather.done' }, { sfx: 'spark' }] },
    ],
    'ms-gull-west-done': [
      { who: 'gullsmall', text: 'She has her feather; I have my calm. Thank you, mirror-minder.' },
      { end: true },
    ],
    'ms-gull-east': [
      { who: 'gullsmall', text: 'My sister frets on the far crag. We are never far apart, though — not really.' },
      { who: 'gullsmall', text: 'Tell her I am fine. And mind the pale feather in the grass; it is hers, not mine.' },
    ],

    /* ---------- turtle (dock flavour + a gentle nudge) ---------- */
    'ms-turtle': [
      { who: 'turtle', text: 'Slow water today. The channel between the crags is thin — barely a swim across.' },
      { who: 'turtle', text: 'Thin channel, close towers. The closer two things sit, the more one tells of the other.' },
    ],
  },
});

})();
