/* THE QUIET ARCHIPELAGO — island 4: The Static Strait.
   A chain of three rocky islets joined by long boardwalks over churning water,
   each crowned by a small lighthouse: the Parity Sisters Ada (red, south, dock),
   Bea (green, middle) and Cee (blue, north), one cormorant per lighthouse. It
   rains here always. The island teaches noise & error correction: the single
   parity charm (detect), redundancy under budget (noisy-bridge), and syndrome
   decoding / Hamming(7,4) (correct + venn-lock). Contract: ../../DESIGN.md.
   One register call. All flags under `st.`. */
(function () {
'use strict';

/* Map 44x40 (tall). North = top. The boardwalk spine ('=') runs straight down
   column 20; deep water ('~') everywhere else so the boardwalk doors have NO
   bypass. South to north: ADA's islet (dock + spawn) -> boardwalk 1 (Door A,
   parity-charm) -> BEA's islet -> boardwalk 2 (Door B, noisy-bridge) -> CEE's
   islet, whose stone relay has two doors in series (relay-charm then venn-lock)
   leading to the innermost beacon room. A wave-cut shallow ledge east of Ada's
   light holds the hidden spark. The ruined 'old lock' sits in Ada's west corner. */
var MAP = `
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#################~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#SSSSSSS!SSSSSSS#~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#SsssssssssssssS#~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#Ss%sssssssssssS#~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#SSSSSSS+SSSSSSS#~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#SsssssssssssssS#~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#SSSSSSS+SSSSSSS#~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#SsssssssssssssS#~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#SsssssssssssssS#~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~#SSSSSSSsSSSSSSS#~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~########+########~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~^^=^^~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~######,######~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~#,,;;,,,;,,,#~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~#,,,,,!,,,,,#~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~#,t,,,,,,,t,#~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~#,,t,,,,,t,,#~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~#,,,,,,,,,,,#~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~######,######~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~^^=^^~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~^^=^^~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~########,##########~~~~~~~~~~~~~~~
~~~~~~~~~~~~#,,,,,,,;,,,,,,,,,#~~~~~~~~~~~~~~~
~~~~~~~~~~~~#,,t;;;;;;;;;t,,,,#~~~~~~~~~~~~~~~
~~~~~~~~~~~~#,,,;;;;!;;;;,,,,,--~~~~~~~~~~~~~~
~~~~~~~~~~~~#,,,;;;;;;;;--------#~~~~~~~~~~~~~
~~~~~~~~~~~~#,t,;;S;s;S;;,t,,,#~~~~~~~~~~~~~~~
~~~~~~~~~~~~#,,,_________,,,,,#~~~~~~~~~~~~~~~
~~~~~~~~~~~~#,,t_________t,,,,#~~~~~~~~~~~~~~~
~~~~~~~~~~~~#,,,_________,,,,,#~~~~~~~~~~~~~~~
~~~~~~~~~~~~####_________######~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~,,,,,,,,,,,~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~_____~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~=-=~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`;

G.islands.register({
  id: 'strait', name: 'The Static Strait', order: 4,
  palette: 'strait', music: 'strait',
  map: MAP,
  spawn: { x: 20, y: 36 },          // dock path, just north of the ferry stubs

  entities: [
    /* ================= ADA — south islet (red scarf), the dock ================= */
    { id: 'st-ada', type: 'npc', x: 20, y: 29, sprite: 'ada', dir: 's',
      dialogue: [
        { ifNotFlag: 'st.charm1.done', use: 'st-ada-charm' },
        { ifFlag: 'st.done', use: 'st-ada-done' },
        { use: 'st-ada-after' },
      ] },
    { id: 'st-ada-bird', type: 'prop', x: 22, y: 29, sprite: 'gullsmall', solid: false,
      text: 'Ada’s cormorant shakes off the rain and stares down the strait, unimpressed.' },
    { id: 'st-beacon-a-off', type: 'prop', x: 18, y: 29, sprite: 'beacon-off', ifNotFlag: 'st.done' },
    { id: 'st-beacon-a-on',  type: 'prop', x: 18, y: 29, sprite: 'beacon-on',  ifFlag: 'st.done' },

    /* Door A — parity-charm (detect, 6 data bits): blocks the FIRST boardwalk. */
    { id: 'st-door-a', type: 'door', x: 20, y: 23, sprite: 'gate',
      puzzle: { type: 'parity-charm', config: { dataBits: 6, mode: 'detect', trips: 3 } },
      flag: 'st.charm1.done', sparks: 0, ifNotFlag: 'st.charm1.done',
      lockedText: 'A charm-rail bars the boardwalk. Ada must teach you the charm before it lifts.' },

    /* The smashed bottle (side-quest item) near spawn. */
    { id: 'st-bottle', type: 'item', x: 17, y: 33, gives: 'letter',
      flag: 'st.bottle.got', ifNotFlag: 'st.bottle.got' },

    /* Mastery venn-lock door — "the old lock nobody needed" — in Ada's west corner.
       It is OFF the required path, so it never blocks progress. */
    { id: 'st-ruin-lock', type: 'door', x: 14, y: 32, sprite: 'runedoor',
      puzzle: { type: 'venn-lock', config: { rounds: 8, twist: true } },
      flag: 'st.oldlock.done', sparks: 1, ifNotFlag: 'st.oldlock.done',
      lockedText: 'A mossy three-ring lock set in a ruined wall. It guards nothing at all — never did.' },

    /* A soaked villager clinging to a dock post. */
    { id: 'st-soaked', type: 'npc', x: 22, y: 33, sprite: 'gullsmall', dir: 'w',
      dialogue: 'st-soaked-talk' },

    /* Signs on Ada's islet. */
    { id: 'st-sign-warn', type: 'sign', x: 24, y: 33,
      text: ['STORM WARNING. The strait eats words — flips a letter here, a letter',
             'there. Send nothing across naked. — Harbour of the Three Lights'] },
    { id: 'st-sign-dock', type: 'sign', x: 17, y: 35,
      text: 'Dock of the Three Lights. South to Huffman Wood. North, the lighthouses — if they ever relight.' },

    /* Hidden spark on the wave-cut shallow ledge east of Ada's light. */
    { id: 'st-spark-ledge', type: 'item', x: 31, y: 28, gives: 'spark',
      flag: 'st.spark.got', ifNotFlag: 'st.spark.got' },

    /* ================= BEA — middle islet (green) ================= */
    { id: 'st-bea', type: 'npc', x: 20, y: 18, sprite: 'bea', dir: 's',
      dialogue: [
        { ifFlag: 'st.bottle.got', ifNotFlag: 'st.bottle.done', use: 'st-bea-bottle' },
        { ifNotFlag: 'st.bridge.done', use: 'st-bea-bridge' },
        { ifFlag: 'st.done', use: 'st-bea-done' },
        { use: 'st-bea-after' },
      ] },
    { id: 'st-bea-bird', type: 'prop', x: 16, y: 16, sprite: 'gullsmall', solid: false,
      text: 'Bea’s cormorant preens under the lighthouse eaves, dry and smug.' },
    { id: 'st-beacon-b-off', type: 'prop', x: 24, y: 16, sprite: 'beacon-off', ifNotFlag: 'st.done' },
    { id: 'st-beacon-b-on',  type: 'prop', x: 24, y: 16, sprite: 'beacon-on',  ifFlag: 'st.done' },

    /* Door B — noisy-bridge (p=0.25, 5 segments, budget 19): blocks the SECOND boardwalk. */
    { id: 'st-door-b', type: 'door', x: 20, y: 12, sprite: 'gate',
      puzzle: { type: 'noisy-bridge', config: { p: 0.25, segments: 5, budget: 19 } },
      flag: 'st.bridge.done', sparks: 0, ifNotFlag: 'st.bridge.done',
      lockedText: 'The boardwalk to Cee has rotted to splinters. Bea won’t let you cross it bare.' },

    { id: 'st-sign-safety', type: 'sign', x: 23, y: 19,
      text: ['BOARDWALK SAFETY: never trust a single plank. Lay three; if two of',
             'the three hold, the deck holds. When in doubt, lay five. — Sister Bea'] },

    /* ================= CEE — north islet (blue), the stone relay ================= */
    { id: 'st-cee', type: 'npc', x: 20, y: 9, sprite: 'cee', dir: 'n',
      dialogue: [
        { ifNotFlag: 'st.charm2.done', use: 'st-cee-charm' },
        { ifNotFlag: 'st.lock.done', use: 'st-cee-lock' },
        { ifFlag: 'st.done', use: 'st-cee-done' },
        { use: 'st-cee-after' },
      ] },
    { id: 'st-cee-bird', type: 'prop', x: 22, y: 9, sprite: 'gullsmall', solid: false,
      text: 'Cee’s cormorant sits dead still on the rail, watching every bit go by.' },
    { id: 'st-beacon-c-off', type: 'prop', x: 17, y: 3, sprite: 'beacon-off', ifNotFlag: 'st.done' },
    { id: 'st-beacon-c-on',  type: 'prop', x: 17, y: 3, sprite: 'beacon-on',  ifFlag: 'st.done' },

    /* Relay door 1 — parity-charm (correct, Hamming(7,4)): gates the vestibule. */
    { id: 'st-relay-charm', type: 'door', x: 20, y: 7, sprite: 'gate',
      puzzle: { type: 'parity-charm', config: { dataBits: 4, mode: 'correct', trips: 3 } },
      flag: 'st.charm2.done', sparks: 0, ifNotFlag: 'st.charm2.done',
      lockedText: 'Three charm-rails, one per sister. The relay won’t read until all three watch their bits.' },
    /* Relay door 2 — the master venn-lock: gates the innermost beacon room. */
    { id: 'st-relay-lock', type: 'door', x: 20, y: 5, sprite: 'runedoor',
      puzzle: { type: 'venn-lock', config: { rounds: 6, twist: true } },
      flag: 'st.lock.done', sparks: 0, ifNotFlag: 'st.lock.done',
      requiresFlag: 'st.charm2.done',
      lockedText: 'The master lock. Wire the three sisters’ charms first, then it will turn.' },

    { id: 'st-sign-relay', type: 'sign', x: 18, y: 9,
      text: 'THE RELAY: four words go in, three charms guard them, the storm flips but one. Read the rings.' },

    /* Beacon-lighting trigger in the innermost sanctum (fires once both relay
       doors are open but before the lights are lit). */
    { id: 'st-light-trigger', type: 'trigger', x: 20, y: 3,
      ifFlag: 'st.lock.done', ifNotFlag: 'st.done',
      actions: [{ goto: 'st-lighting' }] },

    /* ================= portals (the dock, far south) ================= */
    { id: 'st-portal-fwd', type: 'portal', x: 21, y: 37, to: 'caverns', at: { x: 8, y: 4 },
      requiresFlag: 'st.done',
      deniedDialogue: [{ who: 'gull', text: 'Ferryman Gull: "Lights still dark, friend. I’ll not row you on until the strait sings again."' }] },
    { id: 'st-portal-back', type: 'portal', x: 19, y: 37, to: 'huffman-wood', at: { x: 10, y: 6 } },
  ],

  objectives: [
    { flag: 'st.charm1.done', hint: 'Ada (south light): learn the single parity charm and cross the first boardwalk.' },
    { flag: 'st.bridge.done', hint: 'Bea (middle light): lay enough planks to cross the rotted boardwalk.' },
    { flag: 'st.charm2.done', hint: 'Cee (north light): wire all three sisters’ charms at the relay.' },
    { flag: 'st.lock.done',   hint: 'Cee’s relay: turn the master three-ring lock.' },
    { flag: 'st.done',        hint: 'Step into the relay room and relight the three lighthouses.' },
  ],

  dialogues: {
    /* ====================== onEnter intro ====================== */
    'st-intro': [
      { who: 'pip', text: 'Rain. A lot of rain. Three dark lighthouses on three rocks, strung together on boardwalks.' },
      { who: 'sign', text: 'A message bottle smashes on the rocks at Pip’s feet — half its letters scrambled to nonsense.' },
      { who: 'gullsmall', text: '"The strait eats words," a soaked gull mutters from a post. "Eats ’em right out of the bottle."' },
      { who: 'pip', text: 'Then I’ll need a way to send words it can’t digest.' },
      { actions: [{ set: 'st.intro' }] },
    ],

    /* ====================== ADA ====================== */
    'st-ada-charm': [
      { who: 'ada', text: 'Eldest sister. Ada. Red scarf, since you’ll ask. The strait flips one bit a crossing, sometimes.' },
      { who: 'pip', text: 'One flipped bit can ruin a whole word.' },
      { who: 'ada', text: 'So we cheat. Every message gets one extra chip — a charm — set so the count of lit chips comes out even.' },
      { who: 'ada', text: 'Even goes out. If it arrives odd, a bit flipped. Parity, dear. One bit of insurance.' },
      { who: 'pip', text: 'And if it arrives even?' },
      { who: 'ada', text: 'Then nothing flipped… or two flipped and cancelled. Two flips fool one charm. Remember that.' },
      { choice: [
        { label: 'Set the charm and cross.',
          actions: [{ openPuzzle: { type: 'parity-charm', config: { dataBits: 6, mode: 'detect', trips: 3 }, flag: 'st.charm1.done' } }] },
        { label: '“Two flips fool one charm”?', goto: 'st-ada-twoflip' },
        { label: 'Later.', end: true },
      ] },
    ],
    'st-ada-twoflip': [
      { who: 'ada', text: 'Flip one chip: even turns odd, you catch it. Flip a second: odd turns even again — invisible.' },
      { who: 'ada', text: 'One charm SEES one flip. It can’t LOCATE it, and it’s blind to flips in pairs. Bea mends the first gap; Cee, the second.' },
      { who: 'ada', text: 'Go on. The charm-rail won’t lift itself.' },
      { choice: [
        { label: 'Rig the charm and cross.',
          actions: [{ openPuzzle: { type: 'parity-charm', config: { dataBits: 6, mode: 'detect', trips: 3 }, flag: 'st.charm1.done' } }] },
        { label: 'Later.', end: true },
      ] },
    ],
    'st-ada-after': [
      { who: 'ada', text: 'One charm, one flip caught. Bea’s up the boardwalk — she does it with lumber instead of cleverness.' },
      { who: 'ada', text: 'And mind the ledge east of my light. The tide leaves things on it.' },
    ],
    'st-ada-done': [
      { who: 'ada', text: 'My ring matters most, of course. Mine carries the message itself. Bea and Cee only guard it.' },
      { who: 'ada', text: 'Don’t tell them I said so. Actually — do. It’ll make a lovely argument.' },
    ],

    'st-soaked-talk': [
      { who: 'gullsmall', text: 'Soaked to the feathers. Don’t mind me — I just cling to the post and watch the sisters bicker.' },
      { who: 'gullsmall', text: 'Heard Bea once: "more copies, more truth, more lumber." Never forgot it. Mostly the lumber part.' },
    ],

    /* ====================== BEA ====================== */
    'st-bea-bridge': [
      { who: 'bea', text: 'Middle sister. Green. The boardwalk up to Cee rotted through. You’ll go in the water bare.' },
      { who: 'pip', text: 'So I patch it.' },
      { who: 'bea', text: 'You make it redundant. One plank a gap and the storm snaps it, you swim. Lay three — if two hold, the deck holds.' },
      { who: 'bea', text: 'Five if a gap scares you. More copies, more truth, more lumber. But driftwood’s finite — spend it where the storm bites hardest.' },
      { choice: [
        { label: 'Lay the planks and cross.',
          actions: [{ openPuzzle: { type: 'noisy-bridge', config: { p: 0.25, segments: 5, budget: 19 }, flag: 'st.bridge.done' } }] },
        { label: 'Why does a majority help?', goto: 'st-bea-majority' },
        { label: 'Later.', end: true },
      ] },
    ],
    'st-bea-majority': [
      { who: 'bea', text: 'A single plank is a coin-flip with the storm. With three, the storm must snap two of the three to drop you.' },
      { who: 'bea', text: 'Far less likely. It’s a vote — the deck believes whatever most planks say. Same as sending a bit three times and trusting the majority.' },
      { who: 'bea', text: 'It costs bandwidth: more planks, more lumber, to buy reliability. That trade never goes away.' },
      { choice: [
        { label: 'Lay the planks and cross.',
          actions: [{ openPuzzle: { type: 'noisy-bridge', config: { p: 0.25, segments: 5, budget: 19 }, flag: 'st.bridge.done' } }] },
        { label: 'Later.', end: true },
      ] },
    ],
    'st-bea-bottle': [
      { who: 'bea', text: 'That bottle! Ada’s been moaning about it for a week. Hand it here — half the letters are scrambled.' },
      { who: 'pip', text: 'Can you read it at all?' },
      { who: 'bea', text: 'The sender wrote it with a charm, bless them. The count came in odd — so a letter flipped in the strait.' },
      { who: 'bea', text: 'Parity says a flip happened; the words around it say WHERE. There: "Come home. The lights are coming back." Mended.' },
      { who: 'bea', text: 'Take a spark for the legwork. And tell Ada her precious message survived on a charm she didn’t set.' },
      { actions: [{ set: 'st.bottle.done' }, { give: 'spark' }, { sfx: 'spark' }] },
    ],
    'st-bea-after': [
      { who: 'bea', text: 'Three planks held? Good. Cee’s at the top doing the clever version — she finds the flip AND fixes it.' },
      { who: 'bea', text: 'Two flips still beat me, mind. A whole deck can vote wrong if the storm snaps the majority. Cee’ll show you where even that breaks.' },
    ],
    'st-bea-done': [
      { who: 'bea', text: 'MY ring matters most. Ada’s message would drown without copies; Cee’s cleverness is just bookkeeping atop mine.' },
      { who: 'bea', text: 'She’ll say the opposite. She’s wrong — but say hello.' },
    ],

    /* ====================== CEE ====================== */
    'st-cee-charm': [
      { who: 'cee', text: 'Youngest. Blue. Ada catches a flip; Bea drowns it in copies. I find it and fix it — with one charm each.' },
      { who: 'pip', text: 'Three charms instead of one?' },
      { who: 'cee', text: 'Three overlapping charms. I watch some bits, Ada watches some, Bea watches some — each our own little parity.' },
      { who: 'cee', text: 'When a bit flips it sits in some rings and not others. The pattern of who-frowns names the exact bit. A syndrome.' },
      { who: 'cee', text: 'If Ada and Bea both frown but I don’t — the lie sits where their lights overlap and mine doesn’t. One bit. Found.' },
      { choice: [
        { label: 'Wire all three charms.',
          actions: [{ openPuzzle: { type: 'parity-charm', config: { dataBits: 4, mode: 'correct', trips: 3 }, flag: 'st.charm2.done' } }] },
        { label: 'How many bits can three charms find?', goto: 'st-cee-count' },
        { label: 'Later.', end: true },
      ] },
    ],
    'st-cee-count': [
      { who: 'cee', text: 'Three charms, three yes/no frowns — 2³ = 8 patterns. One says "all clean." The other seven each name one chip.' },
      { who: 'cee', text: 'Four message bits, three charms guarding them, seven chips: that’s Hamming(7,4). Every single flip, located and undone.' },
      { who: 'pip', text: 'And two flips?' },
      { who: 'cee', text: 'Ah. Two flips fool one charm — and fool all three together too. The frowns point confidently at the wrong chip. Hold that for the lock.' },
      { choice: [
        { label: 'Wire the charms.',
          actions: [{ openPuzzle: { type: 'parity-charm', config: { dataBits: 4, mode: 'correct', trips: 3 }, flag: 'st.charm2.done' } }] },
        { label: 'Later.', end: true },
      ] },
    ],
    'st-cee-lock': [
      { who: 'cee', text: 'Charms wired, all three watching. Now the master lock — same three rings as runes. Click the flipped one each round.' },
      { who: 'cee', text: 'Six rounds. The last is older than the lighthouse, and it cheats: it flips two runes at once.' },
      { who: 'pip', text: 'Two flips fool one charm…' },
      { who: 'cee', text: 'And the lock decodes anyway — confidently, wrongly. Set it as it was DESIGNED to read. That’s the lesson, not the trap.' },
      { choice: [
        { label: 'Turn the master lock.',
          actions: [{ openPuzzle: { type: 'venn-lock', config: { rounds: 6, twist: true }, flag: 'st.lock.done' } }] },
        { label: 'Later.', end: true },
      ] },
    ],
    'st-cee-after': [
      { who: 'cee', text: 'The relay reads clean now. Step into the room — the three lights should answer the moment the lock settles.' },
    ],
    'st-cee-done': [
      { who: 'cee', text: 'MY ring matters most, naturally. Anyone can shout a message twice. I tell you exactly which letter the storm lied about.' },
      { who: 'cee', text: 'Ada says the message, Bea says the copies. I say: a single charm is cheap, and three of them are a miracle.' },
    ],

    /* ====================== beacon-lighting sequence ====================== */
    'st-lighting': [
      { who: 'ada', text: 'Ada, over the wind: "The relay’s reading clean. Hold still."' },
      { actions: [{ focus: { x: 20, y: 2 } }, { quake: 350 }, { sfx: 'beacon' }, { wait: 500 }] },
      { who: 'cee', text: 'Cee’s blue light catches first — north, over the relay. The rain turns silver in the beam.' },
      { actions: [{ focus: { x: 20, y: 16 } }, { quake: 350 }, { sfx: 'beacon' }, { wait: 500 }] },
      { who: 'bea', text: 'Bea’s green light answers from the middle rock. "There. Told you the planks would hold."' },
      { actions: [{ focus: { x: 20, y: 28 } }, { quake: 450 }, { sfx: 'beacon' }, { wait: 500 }] },
      { who: 'ada', text: 'Ada’s red light blazes last, by the dock. Three beams sweep the strait in turn — even, odd, even, clean.' },
      { actions: [{ set: 'st.done' }, { sfx: 'solve' }, { focus: { x: 20, y: 29 } }, { wait: 300 }] },
      { who: 'pip', text: 'The strait stops eating words. Bottles will cross whole now.' },
      { who: 'ada', text: 'Tell the Ferryman the lights are lit. He’ll row you on to the caverns.' },
    ],

    /* ====================== postgame banter ====================== */
    'st-postgame': [
      { who: 'ada', text: 'Ada, the network whole again: "Settle it, then. The message ring is the only one that carries anything. Mine."' },
      { who: 'bea', text: 'Bea, two rocks down: "Without copies your message drowns in the first gust, sister!"' },
      { who: 'cee', text: 'Cee, fainter still: "And without me you never know WHICH word drowned! Honestly."' },
      { who: 'pip', text: 'They’ll be at this all night. The lights, at least, agree.' },
    ],
  },

  onEnter: [
    { ifNotFlag: 'st.intro', goto: 'st-intro' },
    { ifFlag: 'game.finished', goto: 'st-postgame' },
  ],
});

})();
