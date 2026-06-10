/* THE QUIET ARCHIPELAGO — ISLAND 2: The Dune of Surprises.
   Teaches surprisal (-log2 p) and entropy (expected surprise) by image, through
   Sift the fennec fox's camp of collected oddities. Two mechanics:
     - 'forecast'      : bank surprisal by camping a geyser vent (the gate + a mastery door)
     - 'question-tree' : build the cheapest yes/no interrogation of the dune critters
   Geography: dock south, camp center, geyser field west (behind the forecast
   gate), relay dune NE (behind the question-tree door), oasis east, far field SW.
   Contract: ../../DESIGN.md. IIFE; one G.islands.register call; flags under dn.* */
(function () {
'use strict';

G.islands.register({
  id: 'dunes', name: 'The Dune of Surprises', order: 2,
  palette: 'dunes', music: 'dunes',
  map: `
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^..........^~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^..........^~~~~~
~~~~~~~~~~~~~~~~~..............^....!.....^~~~~~
~~~~~~~~~~~~~~~~~..............^..........^~~~~~
~~~~~~~~~~~~~~~~~..............^..........^~~~~~
~~~~~~~~~~~~~~~~~..,........,..^..........^~~~~~
~~~~~~~~~~~~~~~~~......,.......^..........^~~~~~
~~~~~~-........#..........,....^^^^^.^^^^^^~~~~~
~~~~~~-."""....#.........,................-~~~~~
~~~~~~-.""""...#...............,..........-~~~~~
~~~~~~-.."""...#....___________...........-~~~~~
~~~~~~-."""""..#...._,,,,,,,,,_...........-~~~~~
~~~~~~-.."""........_,,,,,,,,,_...........-~~~~~
~~~~~~-.""""...#...._,,,,o,,,,_...........-~~~~~
~~~~~~-..""""..#...._,,,,,,,,,_...........-~~~~~
~~~~~~-."""....#...,_,,,,,,,,,_...........-~~~~~
~~~~~~-.""""...#...._,,,,,,,,,_...........-~~~~~
~~~~~~-.."""...#....___________...........-~~~~~
~~~~~~-..""....#........................o.-~~~~~
~~~~~~-........#...................,...o..-~~~~~
~~~~~~-~~.~~~~~~~...................---.o.-~~~~~
~~~~~~-......~~~~.....,............,---o..-~~~~~
~~~~~~-."""..~~~~.............,.....---.o.-~~~~~
~~~~~~-.""...~~~~............,.........o..-~~~~~
~~~~~~-......~~~~...,.....................-~~~~~
~~~~~~-......~~~~.........................-~~~~~
~~~~~~~~~~~~~~~~~.................---------~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~===~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`,
  spawn: { x: 25, y: 29 },

  entities: [
    /* ---------- Sift the fennec, at the camp center ---------- */
    { id: 'dn-sift', type: 'npc', x: 23, y: 16, sprite: 'sift', name: 'Sift', dir: 's',
      dialogue: [
        { ifFlag: 'game.finished', use: 'dn-sift-postgame' },
        { ifFlag: 'dn.done', use: 'dn-sift-done' },
        { ifFlag: 'dn.tree.done', use: 'dn-sift-tree-done' },
        { ifFlag: 'dn.forecast.done', use: 'dn-sift-needs-tree' },
        { ifFlag: 'dn.met-sift', use: 'dn-sift-needs-charge' },
        { use: 'dn-sift-intro' },
      ] },

    /* ---------- The pebble-collector side-quest hand-in (Sift reacts to it) ---------- */
    /* handled inside Sift's dialogues via the pebble flags */

    /* ---------- Villagers ---------- */
    { id: 'dn-turtle', type: 'npc', x: 35, y: 25, sprite: 'turtle', name: 'Old Wadi', dir: 'w',
      dialogue: 'dn-turtle' },
    { id: 'dn-gull', type: 'npc', x: 18, y: 11, sprite: 'gullsmall', name: 'Squall', dir: 's',
      wander: true, dialogue: 'dn-gull' },

    /* ---------- Signs ---------- */
    { id: 'dn-sign-field', type: 'sign', x: 16, y: 17, text: [
        'THE GEYSER FIELD — mind the vents.',
        'HUFF the Steady blows better than half the time (it tells you almost nothing). ' +
        'COUGH and SPUTTER, middling. SHY only blows one time in twenty — when SHE goes, that is news.',
      ] },
    { id: 'dn-sign-dock', type: 'sign', x: 23, y: 29, text:
        'DUNE DOCK. Ferry to Huffman Wood once the relay sings again. Camp: north. Geysers: west.' },
    { id: 'dn-sign-oasis', type: 'sign', x: 34, y: 23, text: [
        'THE DRIED OASIS.',
        'Water went away. Old Wadi did not. Mind the boulders.',
      ] },
    { id: 'dn-sign-relay', type: 'sign', x: 34, y: 13, text:
        'RELAY DUNE. The dish needs a charge of surprise AND every critter in its address book.' },

    /* ---------- The geyser-field GATE: forecast (charge the surprise-jar) ---------- */
    { id: 'dn-gate', type: 'door', x: 15, y: 16, sprite: 'gate',
      lockedText: 'A surprise-jar sits in the wind, empty. Camp a vent and catch some.',
      puzzle: { type: 'forecast', config: {
        vents: [
          { label: 'HUFF the Steady', p: 0.55 },
          { label: 'Cough',          p: 0.25 },
          { label: 'Sputter',        p: 0.15 },
          { label: 'Shy',            p: 0.05 },
        ],
        goalBits: 5.5, rounds: 18,
      } },
      flag: 'dn.forecast.done', sparks: 0, ifNotFlag: 'dn.forecast.done' },

    /* ---------- The relay-dune GATE: question-tree (catalogue the critters) ---------- */
    { id: 'dn-tree', type: 'door', x: 36, y: 11, sprite: 'runedoor',
      lockedText: 'The dune\'s address book is blank. Sort every critter by yes/no questions first.',
      puzzle: { type: 'question-tree', config: {
        critters: [
          { name: 'Sandmouse',   p: 0.40, key: 'mouse' },
          { name: 'Dune-beetle', p: 0.25, key: 'beetle' },
          { name: 'Glasswing',   p: 0.15, key: 'glass' },
          { name: 'Geckotail',   p: 0.10, key: 'gecko' },
          { name: 'Scarab',      p: 0.06, key: 'scarab' },
          { name: 'Antlion',     p: 0.04, key: 'antlion' },
        ],
        parAvg: 2.30,
      } },
      flag: 'dn.tree.done', sparks: 0, ifNotFlag: 'dn.tree.done' },

    /* ---------- MASTERY forecast door, deep in the far field ---------- */
    { id: 'dn-mastery', type: 'door', x: 9, y: 27, sprite: 'door',
      lockedText: 'A taller, wilder jar. Five vents now — one almost never blows. Worth it if it does.',
      puzzle: { type: 'forecast', config: {
        vents: [
          { label: 'Bluster',  p: 0.50 },
          { label: 'Hiss',     p: 0.27 },
          { label: 'Spit',     p: 0.14 },
          { label: 'Whisper',  p: 0.06 },
          { label: 'Jackpot',  p: 0.03 },
        ],
        goalBits: 5.5, rounds: 17,
      } },
      flag: 'dn.mastery.done', sparks: 1, ifNotFlag: 'dn.mastery.done' },

    /* ---------- The relay dish (off until both quests done, then on) ---------- */
    { id: 'dn-dish-off', type: 'prop', x: 36, y: 7, sprite: 'beacon-off', ifNotFlag: 'dn.done' },
    { id: 'dn-dish-on',  type: 'prop', x: 36, y: 7, sprite: 'beacon-on',  ifFlag: 'dn.done' },

    /* ---------- Sparks: oasis hidden item + the ordinary pebble item ---------- */
    { id: 'dn-spark-oasis', type: 'item', x: 37, y: 23, gives: 'spark',
      flag: 'dn.spark.oasis', ifNotFlag: 'dn.spark.oasis' },
    { id: 'dn-pebble', type: 'item', x: 28, y: 9, gives: 'letter',
      flag: 'dn.pebble.got', ifNotFlag: 'dn.pebble.got' },

    /* ---------- Portals at the dock ---------- */
    { id: 'dn-portal-fwd', type: 'portal', x: 26, y: 30, to: 'huffman-wood', at: { x: 10, y: 6 },
      requiresFlag: 'dn.done',
      deniedDialogue: [
        { who: 'gull', text: 'Ferryman Gull tips his cap. "Relay\'s still hushed, friend. I\'ll not row you on ' +
          'till the dune sings. Finish with Sift first."' },
      ] },
    { id: 'dn-portal-back', type: 'portal', x: 24, y: 30, to: 'beacon-rock', at: { x: 10, y: 22 } },

    /* ---------- Intro trigger (fires once on arrival near the dock) ---------- */
    { id: 'dn-intro-trigger', type: 'trigger', x: 25, y: 28, once: true,
      actions: [{ goto: 'dn-intro' }] },
  ],

  objectives: [
    { flag: 'dn.met-sift',       hint: 'Find Sift the fennec at the camp in the dunes.' },
    { flag: 'dn.forecast.done',  hint: 'Charge the surprise-jar: camp the geyser vents west of camp.' },
    { flag: 'dn.tree.done',      hint: 'Catalogue the dune critters at the relay dish (north-east).' },
    { flag: 'dn.done',           hint: 'Tell Sift the relay is charged and the book is full.' },
  ],

  dialogues: {
    /* ===== onEnter intro ===== */
    'dn-intro': [
      { who: 'pip', text: '*The wind never stops here. Sand hisses. Somewhere, vents breathe steam.*' },
      { who: 'pip', text: 'My log says the dune relay went quiet mid-sentence. " ...and the most surprising thing of all is—" ' +
        'Then nothing.' },
      { ifNotFlag: 'dn.intro', actions: [{ set: 'dn.intro' }, { sfx: 'talk' }, { focus: { x: 23, y: 16 } }] },
      { who: 'pip', text: 'A camp, north. Somebody collects things out here. Best ask them.' },
    ],

    /* ===== Sift: first meeting (teach surprisal by image) ===== */
    'dn-sift-intro': [
      { who: 'sift', text: 'A robot! Tidy. Round. Not on my list yet. *scribbles* Welcome to the camp, courier.' },
      { who: 'pip', text: 'You collect... things?' },
      { who: 'sift', text: 'Surprising things, only. A jar of "oh!" A drawer of "well I never." Catalogued, dated, weighed.' },
      { who: 'sift', text: 'See that field of vents, west? HUFF the Steady blows more than half the time. ' +
        'A vent that always blows tells you nothing — you knew it would.' },
      { who: 'sift', text: 'But SHY? She sulks. One time in twenty. The day SHE goes off — *that* is news. ' +
        'Rare things carry more. That is the whole trick.' },
      { choice: [
        { label: 'How do you measure "more"?', goto: 'dn-sift-bits' },
        { label: 'What do you need?', goto: 'dn-sift-quest' },
      ] },
    ],
    'dn-sift-bits': [
      { who: 'sift', text: 'In bits, naturally. A thing that blows with chance p is worth minus-log-two of p. ' +
        'Common p, small worth. Tiny p, big worth.' },
      { who: 'sift', text: 'Coin-flip rare (half) = one bit. One-in-four = two bits. One-in-twenty = better than four. ' +
        'Surprise adds up in bits.' },
      { goto: 'dn-sift-quest' },
    ],
    'dn-sift-quest': [
      { who: 'sift', text: 'Here is my trouble. The relay dish on the high dune went dark. It runs on collected surprise, ' +
        'and the jar by the gate is bone empty.' },
      { who: 'sift', text: 'Take the surprise-jar to the geyser field. Camp ONE vent, watch, and bank the bits it pays you. ' +
        'Fill the jar and the gate opens.' },
      { who: 'pip', text: 'Camp the rare one for the big payout?' },
      { who: 'sift', text: 'Tempting! But she barely blows. Camp where the *expected* pay is best — chance times worth. ' +
        'The middling vents earn steadiest. You will feel it.' },
      { actions: [{ set: 'dn.met-sift' }, { sfx: 'talk' }] },
    ],

    /* ===== Sift: after meeting, before the jar is filled ===== */
    'dn-sift-needs-charge': [
      { ifFlag: 'dn.pebble.got', ifNotFlag: 'dn.pebble.done', goto: 'dn-pebble-handin' },
      { who: 'sift', text: 'The surprise-jar is still light. West, past the wall — camp a vent, watch the field, ' +
        'bank the bits. Steady wins it.' },
      { who: 'sift', text: 'Camp the vent with the best expected pay, not the flashiest. Patience, courier.' },
    ],

    /* ===== Sift: jar filled (forecast done), needs the critter catalogue ===== */
    'dn-sift-needs-tree': [
      { ifFlag: 'dn.pebble.got', ifNotFlag: 'dn.pebble.done', goto: 'dn-pebble-handin' },
      { who: 'sift', text: 'The jar glows! Surprise, bottled. I knew you had the patience for it.' },
      { who: 'pip', text: 'The dish still sleeps, though.' },
      { who: 'sift', text: 'It wants a charge AND an address book — every dune critter, sorted, so it knows who is who. ' +
        'Go to the dish on the high dune, north-east.' },
      { who: 'sift', text: 'Sort them by yes/no questions — cheapest set of questions wins. Peel off the likeliest first; ' +
        'split the rest where the odds are evenest. Ask wrong ones and you will pay for it.' },
    ],

    /* ===== Sift: catalogue done (tree.done) — the ONE awe line, "entropy" ===== */
    'dn-sift-tree-done': [
      { ifFlag: 'dn.pebble.got', ifNotFlag: 'dn.pebble.done', goto: 'dn-pebble-handin' },
      { who: 'sift', text: 'Both done! Listen — the dish is humming. The relay can speak again.' },
      { who: 'sift', text: 'You know, when you averaged the surprise over the whole field — every vent, weighted by its chance — ' +
        'you found the field’s going rate.' },
      { who: 'sift', text: 'The old keepers called that average surprise *entropy*. *pauses, almost reverent* ' +
        'I just call it the going rate. It is the floor: no question-game beats it.' },
      { who: 'pip', text: 'So the relay is charged and addressed. It can finish its sentence?' },
      { who: 'sift', text: 'Go listen at the dish. Then come tell me what it said. The dock ferry will run once it sings.' },
      { actions: [{ set: 'dn.done' }, { sfx: 'beacon' }, { focus: { x: 36, y: 7 } }, { music: 'dunes' }] },
    ],

    /* ===== Sift: all done ===== */
    'dn-sift-done': [
      { ifFlag: 'dn.pebble.got', ifNotFlag: 'dn.pebble.done', goto: 'dn-pebble-handin' },
      { who: 'sift', text: 'The relay caught up on a whole season of letters. " ...the most surprising thing is how little ' +
        'surprise we hold onto." Pretty, no?' },
      { who: 'sift', text: 'Off to Huffman Wood with you. Tell Huff the fennec says hello — and that her trails ' +
        'are just my question-trees with leaves on.' },
    ],

    /* ===== Sift: postgame ===== */
    'dn-sift-postgame': [
      { who: 'sift', text: 'The whole network sings now, and my jar of surprises has never been so full. ' +
        'Funny — a quiet archipelago turned out to be the most surprising find of all.' },
    ],

    /* ===== The ordinary-pebble hand-in (entropy-zero joke) ===== */
    'dn-pebble-handin': [
      { who: 'sift', text: 'You found something! Hand it here, hand it here — *unwraps it* ...' },
      { who: 'sift', text: 'A pebble. A perfectly ordinary pebble. Grey. Round. Utterly expected in every particular.' },
      { who: 'pip', text: '...Should I not have?' },
      { who: 'sift', text: 'No — it is *perfect*. The most surprising find is the one that surprises nobody at all. ' +
        'Surprise zero. Entropy zero. A flawless specimen of Nothing-To-Report.' },
      { who: 'sift', text: 'Into the cabinet of curiosities it goes, labelled "the going rate of an ordinary day." ' +
        'Here — a spark for your trouble, collector.' },
      { actions: [{ set: 'dn.pebble.done' }, { give: 'spark' }, { sfx: 'spark' } ] },
    ],

    /* ===== Turtle hermit at the oasis ===== */
    'dn-turtle': [
      { ifFlag: 'dn.done', who: 'turtle', text: 'Wadi here. Relay’s talking again, I hear. About time. ' +
        'Took you less than a tide. Surprising.' },
      { who: 'turtle', text: 'Old Wadi. I have sat by this oasis since it had water. Now it is mostly... memory and boulders.' },
      { who: 'turtle', text: 'Sift will tell you the rare things matter most. True enough. But mind: an ordinary day ' +
        'is worth keeping too. Just do not expect it to make the news.' },
    ],

    /* ===== Gullsmall who keeps predicting the geysers wrong (comic) ===== */
    'dn-gull': [
      { who: 'gullsmall', text: 'Squall, weather-gull, at your service. Watch — HUFF the Steady is about to blow. ' +
        'Any second. Aaaany... no. Hm.' },
      { who: 'gullsmall', text: 'SHY, then! She is overdue. I can FEEL it. *long pause* ...She is not, is she.' },
      { who: 'pip', text: 'She blows about one time in twenty. You will be wrong most days.' },
      { who: 'gullsmall', text: 'Which is why I never bank on it! When I AM right about Shy, oh, it is the talk of the dune. ' +
        'Worth four bits of bragging, easy.' },
    ],
  },

  onEnter: [
    { ifNotFlag: 'dn.intro', music: 'dunes' },
  ],
});

})();
