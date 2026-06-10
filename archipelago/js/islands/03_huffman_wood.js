/* THE QUIET ARCHIPELAGO — ISLAND 3: Huffman Wood
   Teaches SOURCE CODING (optimal trees, prefix-free codes). The map IS the
   lesson: the forest paths form an actual binary tree. A single trunk climbs
   north from the dock up a SPINE (col 22); at each fork a short corridor tees
   off to a leaf-clearing village, alternating west/east, while the spine
   continues as the "quieter" child. Depth from the dock mirrors optimal code
   length, so the busiest village sits shallow and the quietest sits deep:

       fork 1  (row 29, WEST)  Mosswick      21/day   depth 1   code len 1
       fork 2  (row 22, EAST)  Fernholt       9/day   depth 2   code len 2
       fork 3  (row 17, WEST)  Bramblebury    6/day   depth 3   code len 3
       fork 4  (row  8, EAST)  Owl's End      4/day   depth 4   code len 4
       spine top (rows 1-5)    Thistledown    2/day   depth 4   code len 4

   Huffman cost Σ daily·depth = 81 walks/day; total walkers N = 42;
   optimal weighted average L̄ = 81/42 = 1.9286 bits; entropy H = 1.9095.
   prefix-gate maxBits = L̄ + slack = 2.05 (optimal 1.929 passes honestly; the
   balanced {2,2,2,3,3} code at 2.143 fails — so the budget rewards short codes
   on the busy roads). The geography teaches before any puzzle does.

   IIFE; reads/extends G only; flags under `hw.`; tiles only from DESIGN.md. */
(function () {
'use strict';

G.islands.register({
  id: 'huffman-wood',
  name: 'Huffman Wood',
  order: 3,
  palette: 'forest',
  music: 'forest',

  /* 52 cols × 37 rows. 'T' dense forest walls shape the tree; '_' trunk/branch
     paths; ';' dark grass under the canopy; '"' tall grass in the clearings.
     The secret grove (rows 21-25, west) is reached through a subtle ','-grass
     gap in the trees at col 12, rows 19-20. */
  map: `
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTT;;;;;;;;;TTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTT;;""""""""";TTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTT;""""""""""_;;;;TTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTT;;""""""""";;;""";;TTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTT;;;_;;;;TTTTT;"""_;TTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTTTTTTT;;;_;TTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTT;;;;;;;;;TTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_______;;"""""""";TTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTT;""""""""";TTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTT;;"""""""_;TTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTTTT;;;;_;;;TTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTT;;;;;;;;;TTTTTT_TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTT;;"""""""";TTTTT_TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTT;"""""""""_______TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTT;;"""""""";TTTTT_TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTT;;;;;,;;TTTTTTT_TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTT,TTTTTTTTT_TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTT;;;;;;,;;TTTTTTT_TTTTTTTT;;;;;;;;TTTTTTTTTTTTT
TTTTT;;"""""""";TTTTTT_______;;"""""""";TTTTTTTTTTTT
TTTTT;""""""""";TTTTTT_TTTTTT;""""""""";TTTTTTTTTTTT
TTTTT;;"""""""";TTTTTT_TTTTTT;;"""""""_;TTTTTTTTTTTT
TTTTTT;;;;;;;;;TTTTTTT_TTTTTTTT;;;_;;;;TTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTTTTTTT_TTTTTTTTTTTTTTTTT
TTTTTTTTT;;;;;;;;TTTTT_TTTTTTTTTTT_TTTTTTTTTTTTTTTTT
TTTTTTTT;;""""""";TTTT_TTTTTTTTTTT_;;;;;;;TTTTTTTTTT
TTTTTTTT;""""""""______TTTTTTTTTT;;"""""""";TTTTTTTT
TTTTTTTT;;""""""";TTTT_TTTTTTTTTT;""""""""";TTTTTTTT
TTTTTTTTT;;;;;;;TTTTTT_TTTTTTTTTT;;"""""""";TTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTTTTTTT;;;;;;;;TTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT_TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTT;;;;;;;TTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTT;;;;;;;TTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTT;;;=;;;TTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTT
`,

  /* Dock boardwalk at the spine foot (col 22, rows 35-36); spawn on the dark
     grass of the foot clearing just west of the boardwalk, not on a portal. */
  spawn: { x: 20, y: 34 },

  entities: [
    /* -------- Ferry docks (south, at the spine foot) -------- */
    // Forward to the Strait, gated on hw.done (Gull eyes the storm).
    { id: 'hw-gull', type: 'npc', x: 23, y: 35, sprite: 'gull', dir: 'w',
      dialogue: [{ ifFlag: 'hw.done', use: 'hw-gull-go' }, { use: 'hw-gull-wait' }] },
    { id: 'hw-portal-fwd', type: 'portal', x: 22, y: 36, to: 'strait', at: { x: 10, y: 4 },
      requiresFlag: 'hw.done',
      deniedDialogue: [
        { who: 'gull', text: 'Gull squints north. "Static Strait. Hear that hiss? The storm is chewing the wires."' },
        { who: 'gull', text: '"Light the wood’s relay first. I’m not rowing into noise for nothing."' },
      ] },
    // Back to the Dunes, ungated.
    { id: 'hw-portal-back', type: 'portal', x: 22, y: 35, to: 'dunes', at: { x: 10, y: 22 } },
    { id: 'hw-dock-sign', type: 'sign', x: 21, y: 35,
      text: ['The Wood. Trailhead.', 'North: the trunk forks and forks. South: the boats.'] },

    /* -------- Huff at the root junction (the great-stump fork) -------- */
    // The great stump (gate A) blocks the spine at (22,33); Huff stands beside
    // it on the foot clearing, at the very root of the tree.
    { id: 'hw-huff', type: 'npc', x: 23, y: 34, sprite: 'huff', dir: 'w',
      dialogue: [
        { ifFlag: 'game.finished', use: 'hw-huff-post' },
        { ifFlag: 'hw.done', use: 'hw-huff-done' },
        { ifFlag: 'hw.signs.done', use: 'hw-huff-relay' },
        { ifFlag: 'hw.plan.done', use: 'hw-huff-after-plan' },
        { ifFlag: 'hw.met-huff', use: 'hw-huff-again' },
        { use: 'hw-huff-1' },
      ] },

    /* -------- Main gate A: tree-planner at the great stump -------- */
    // Blocks the spine at (22,33) — the only way north into the wood.
    { id: 'hw-stump-door', type: 'door', x: 22, y: 33, sprite: 'door',
      lockedText: 'A great mossy stump blocks the trail. Huff’s old plan is pinned to it, smudged out.',
      puzzle: { type: 'tree-planner', config: {
        villages: [
          { name: 'Mosswick', daily: 21 },
          { name: 'Fernholt', daily: 9 },
          { name: 'Bramblebury', daily: 6 },
          { name: "Owl's End", daily: 4 },
          { name: 'Thistledown', daily: 2 },
        ],
        par: 'optimal',
      } },
      flag: 'hw.plan.done', sparks: 0, ifNotFlag: 'hw.plan.done' },
    // The Huffman plaque — the ONE place the word appears, beside the stump.
    { id: 'hw-plaque', type: 'sign', x: 21, y: 34,
      text: 'A mossy plaque on the great stump: "H. — who joined the quiet trails first."' },

    /* -------- Fork signpost (blank, then carved after signs done) -------- */
    // At the foot of the tree by the stump. Two entities share the tile.
    { id: 'hw-fork-blank', type: 'sign', x: 24, y: 34, ifNotFlag: 'hw.signs.done',
      text: 'The fork signpost has rotted blank. Not a letter left on it.' },
    { id: 'hw-fork-carved', type: 'sign', x: 24, y: 34, ifFlag: 'hw.signs.done',
      text: ['FORK, carved fresh:', 'West ●  Mosswick (busiest).   North ○  …the quieter wood.'] },

    /* -------- Village leaf: Mosswick (busiest, depth 1) -------- */
    // West tee at row 29; clearing rows 27-31, x 8-16.
    { id: 'hw-moss-crab', type: 'npc', x: 12, y: 29, sprite: 'crab', wander: true,
      dialogue: 'hw-moss-crab' },
    { id: 'hw-moss-gull', type: 'npc', x: 14, y: 28, sprite: 'gullsmall', wander: true,
      dialogue: 'hw-moss-gull' },
    { id: 'hw-moss-sign', type: 'sign', x: 11, y: 28,
      text: ['MOSSWICK — busiest trailhead. 21 walkers a day.', 'One fork from the dock. The busy folk earned the short walk.'] },
    // Side-quest delivery trigger: walking into Mosswick carrying the letter.
    { id: 'hw-deliver-trigger', type: 'trigger', x: 16, y: 29, once: true,
      ifFlag: 'hw.whistle.got', ifNotFlag: 'hw.whistle.done',
      actions: [{ goto: 'hw-deliver' }] },

    /* -------- Village leaf: Fernholt (depth 2) -------- */
    // East tee at row 22; clearing rows 21-25, x 28-39.
    { id: 'hw-fern-turtle', type: 'npc', x: 33, y: 23, sprite: 'turtle', wander: true,
      dialogue: 'hw-fern-turtle' },
    { id: 'hw-fern-sign', type: 'sign', x: 31, y: 22,
      text: 'FERNHOLT — 9 a day. Two forks deep. A fair walk for a fair few.' },

    /* -------- Village leaf: Bramblebury (depth 3) -------- */
    // West tee at row 17; clearing rows 15-18, x 6-15.
    { id: 'hw-bramble-crab', type: 'npc', x: 11, y: 16, sprite: 'crab', wander: true,
      dialogue: 'hw-bramble-crab' },
    { id: 'hw-bramble-sign', type: 'sign', x: 9, y: 16,
      text: 'BRAMBLEBURY — 6 a day. Three forks in. Quiet mornings, mostly.' },
    // Hint to the secret grove, on the trail wall by the grass gap.
    { id: 'hw-secret-sign', type: 'sign', x: 11, y: 18, ifNotFlag: 'hw.secret.got',
      text: 'A faint carving low on a trunk: "the wood keeps one short path secret — west, up high."' },

    /* SPARK 2 — hidden spark in the sealed grove (rows 22-24, x 6-13),
       reachable only through the subtle ','-grass gap at col 12 (rows 19-20). */
    { id: 'hw-secret-spark', type: 'item', x: 9, y: 23, gives: 'spark',
      flag: 'hw.secret.got', ifNotFlag: 'hw.secret.got' },
    { id: 'hw-grove-sign', type: 'sign', x: 11, y: 22,
      text: 'A still, hidden grove. Someone left a card: "for the one who looked west, up high."' },

    /* -------- Village leaf: Owl's End (depth 4) -------- */
    // East tee at row 8; clearing rows 7-11, x 28-39.
    { id: 'hw-owl-turtle', type: 'npc', x: 32, y: 9, sprite: 'turtle', dir: 's',
      dialogue: [
        { ifFlag: 'hw.whistle.done', use: 'hw-owl-thanks' },
        { ifFlag: 'hw.whistle.got', use: 'hw-owl-return' },
        { use: 'hw-owl-quest' },
      ] },
    { id: 'hw-owl-sign', type: 'sign', x: 30, y: 9,
      text: "OWL'S END — 4 a day. Four forks deep. The owls like it dim." },
    // The letter the elder turtle gives (appears once the quest is accepted).
    { id: 'hw-owl-letter', type: 'item', x: 35, y: 9, gives: 'letter',
      flag: 'hw.whistle.got', ifFlag: 'hw.whistle.start', ifNotFlag: 'hw.whistle.got' },

    /* -------- Main gate B: prefix-gate at the signpost workshop -------- */
    // The workshop sits in the Owl's End clearing, off the deep east branch.
    { id: 'hw-workshop-door', type: 'door', x: 36, y: 10, sprite: 'gate',
      lockedText: 'The signpost workshop. Five blank boards, a carving knife, and no codes yet.',
      puzzle: { type: 'prefix-gate', config: {
        dests: [
          { name: 'Mosswick', freq: 21 },
          { name: 'Fernholt', freq: 9 },
          { name: 'Bramblebury', freq: 6 },
          { name: "Owl's End", freq: 4 },
          { name: 'Thistledown', freq: 2 },
        ],
        maxBits: 2.05,
      } },
      flag: 'hw.signs.done', sparks: 0, ifNotFlag: 'hw.signs.done' },
    { id: 'hw-workshop-sign', type: 'sign', x: 30, y: 7,
      text: ['Signpost workshop.', 'Travelers whistle a code at night. No whistle may begin another.'] },

    /* -------- Village leaf: Thistledown (quietest, depth 4) — hermit + mastery -------- */
    // Spine top clearing, rows 1-4, x 20-29, with a deep spur east for the
    // mastery stump (rows 3-6, x 31-37).
    { id: 'hw-thistle-hermit', type: 'npc', x: 24, y: 2, sprite: 'turtle', dir: 's',
      dialogue: 'hw-thistle-hermit' },
    { id: 'hw-thistle-sign', type: 'sign', x: 22, y: 2,
      text: ['THISTLEDOWN — quietest. 2 a day. The deepest clearing in the wood.', 'A hand-lettered card: "nobody visits. it’s wonderful."'] },

    /* SPARK 1 — mastery tree-planner door, deep at Thistledown’s spur.
       6 villages with twin equal weights that force tie decisions. */
    { id: 'hw-mastery-door', type: 'door', x: 35, y: 5, sprite: 'runedoor',
      lockedText: 'A second stump, ringed with twin trailheads of equal weight. A harder plan.',
      puzzle: { type: 'tree-planner', config: {
        villages: [
          { name: 'Ashmoor', daily: 8 },
          { name: 'Birchgate', daily: 8 },
          { name: 'Coldfern', daily: 5 },
          { name: 'Dewhollow', daily: 5 },
          { name: 'Elderknot', daily: 3 },
          { name: 'Fogmere', daily: 3 },
        ],
        par: 'optimal',
      } },
      flag: 'hw.mastery.done', sparks: 1, ifNotFlag: 'hw.mastery.done' },

    /* -------- The wood's relay (beacon pair) — wakes when both gates done -------- */
    // In the Fernholt clearing, off to one side; Huff lights it via dialogue.
    { id: 'hw-relay-off', type: 'prop', x: 37, y: 23, sprite: 'beacon-off',
      ifNotFlag: 'hw.done' },
    { id: 'hw-relay-on', type: 'prop', x: 37, y: 23, sprite: 'beacon-on',
      ifFlag: 'hw.done' },
    { id: 'hw-relay-sign', type: 'sign', x: 36, y: 24, ifFlag: 'hw.plan.done',
      text: 'The wood’s relay. Dark until both the plan and the signs are set.' },

    /* -------- Branch signpost (blank, then carved) on the deep east branch -------- */
    { id: 'hw-rfork-blank', type: 'sign', x: 33, y: 31, ifNotFlag: 'hw.signs.done',
      text: 'A deep branch signpost, blank and weathered. The right wood swallows the trail.' },
    { id: 'hw-rfork-carved', type: 'sign', x: 33, y: 31, ifFlag: 'hw.signs.done',
      text: ['DEEP BRANCH, carved:', 'Owl’s End ○○○●    Thistledown ○○○○'] },
  ],

  objectives: [
    { flag: 'hw.met-huff',    hint: 'Talk to Huff the warden at the great stump where the trunk forks.' },
    { flag: 'hw.plan.done',   hint: 'Open the great stump: plan the trails (join the two quietest first).' },
    { flag: 'hw.signs.done',  hint: 'At the workshop deep in the wood, carve prefix-free whistle-codes.' },
    { flag: 'hw.done',        hint: 'Tell Huff the plan and signs are set — wake the wood’s relay.' },
  ],

  onEnter: [
    { ifNotFlag: 'hw.intro', set: 'hw.intro' },
    { ifNotFlag: 'hw.intro', goto: 'hw-intro' },
  ],

  dialogues: {
    /* ----- intro ----- */
    'hw-intro': [
      { who: 'pip', text: 'The wood is so quiet. Every signpost at the first fork has rotted blank.' },
      { who: 'pip', text: 'Not one letter left to read. Which way did the trails ever go?' },
    ],

    /* ----- Huff the beaver, the trail-warden ----- */
    'hw-huff-1': [
      { who: 'huff', text: 'Huff. Trail-warden. *taps clipboard* Twenty-one. Nine. Six. Four. Two.' },
      { who: 'pip', text: 'Those are… numbers?' },
      { who: 'huff', text: 'Walkers. Per day. Each village sends folk down to the dock every morning.' },
      { who: 'huff', text: 'The old trail plan wastes everyone’s morning. The busy folk take the long way round.' },
      { who: 'pip', text: 'How do you fix a trail plan?' },
      { who: 'huff', text: 'Picture it: join the two QUIETEST trailheads first. Then the next two quietest. On and on.' },
      { who: 'huff', text: 'The busy folk deserve the short walk. The quiet ones can afford the long one — few of them.' },
      { who: 'huff', text: 'Do that and the wood plans itself into the cheapest shape there is. Try the great stump.',
        actions: [{ set: 'hw.met-huff' }] },
    ],
    'hw-huff-again': [
      { who: 'huff', text: 'Two quietest first. Every time. Then it’s junctions all the way down to one trunk.' },
      { who: 'pip', text: 'And that’s the cheapest?' },
      { who: 'huff', text: 'Provably. I’ve counted it a hundred mornings. The stump’s waiting.' },
    ],
    'hw-huff-after-plan': [
      { who: 'huff', text: '*marvels* Eighty-one walks a day. That’s the number on the wood’s own shape!' },
      { who: 'huff', text: 'Your plan didn’t just match the trees — it IS the trees. Mosswick one fork in, Thistledown four.' },
      { who: 'huff', text: 'Now the signs. Whistle-codes, at the workshop in the deep east wood. Carve them prefix-free.' },
      { who: 'pip', text: 'Prefix-free?' },
      { who: 'huff', text: 'No whistle may begin another. A whistle that could keep going is a lie — you can’t trust where it ends.' },
    ],
    'hw-huff-relay': [
      { who: 'huff', text: 'Plan set. Signs carved. *grins* The relay should wake now — it reads the wood’s shape.' },
      { who: 'pip', text: 'Both done. What now?' },
      { who: 'huff', text: 'Watch.', actions: [
        { set: 'hw.done' }, { sfx: 'beacon' }, { focus: { x: 37, y: 23 } }, { wait: 500 },
      ] },
      { who: 'huff', text: 'There. Steady light. The wood remembers its trails — short walks for the busy, no lies on the signs.' },
      { who: 'huff', text: 'Gull can take you on to the Strait now. Mind the storm out there.' },
    ],
    'hw-huff-done': [
      { who: 'huff', text: 'Eighty-one walks, five honest signs, one steady light. A good wood.' },
      { who: 'huff', text: 'Average whistle, by the way? Under two bits — nineteen-twenty-nine, near as the trees allow.' },
    ],
    'hw-huff-post': [
      { who: 'huff', text: 'Heard the Grand Beacon’s lit. *taps clipboard, satisfied* Knew the trail plans would hold.' },
      { who: 'huff', text: 'Come back any morning. The two quietest, joined first. It never stops being true.' },
    ],

    /* ----- Mosswick (busy, depth 1) ----- */
    'hw-moss-crab': [
      { who: 'crab', text: 'Click-click! No time, no time — dock’s that way, twenty-one of us going!' },
      { who: 'crab', text: 'One fork and we’re THERE. Best little walk in the wood. Move along, robot!' },
    ],
    'hw-moss-gull': [
      { who: 'gullsmall', text: 'Busy busy! Short path, short whistle. One dot and the night-walkers know it’s us.' },
    ],

    /* ----- Fernholt (depth 2) ----- */
    'hw-fern-turtle': [
      { who: 'turtle', text: 'Fernholt. Nine of us. Two forks down — middling busy, middling walk. Suits me fine.' },
    ],

    /* ----- Bramblebury (depth 3) ----- */
    'hw-bramble-crab': [
      { who: 'crab', text: 'Three forks in. Six of us go down most days. The brambles keep the noise off.' },
    ],

    /* ----- Owl's End (depth 4) — side-quest giver ----- */
    'hw-owl-quest': [
      { who: 'turtle', text: 'Elder turtle, slow as the season. Four forks from the dock — nobody passes through.' },
      { who: 'turtle', text: 'I’ve a message for Mosswick, but my whistling days are done. Would you carry it?' },
      { who: 'pip', text: 'I can carry a letter.' },
      { who: 'turtle', text: 'Take it from the post there. Whistle it at Mosswick — short and bright, the way busy roads get.',
        actions: [{ set: 'hw.whistle.start' }] },
    ],
    'hw-owl-return': [
      { who: 'turtle', text: 'You’ve the letter. Mosswick is one fork off the root — west, the busy clearing.' },
    ],
    'hw-owl-thanks': [
      { who: 'turtle', text: 'They whistled back? *slow smile* Then it carried clean. The short codes always do.' },
    ],

    /* delivery at Mosswick (trigger) — completes the fetch, gives the spark */
    'hw-deliver': [
      { who: 'crab', text: 'A letter from Owl’s End? *whistles it back* Four forks deep and still it carried!' },
      { who: 'pip', text: 'Short and bright, they said.' },
      { who: 'crab', text: 'Here — for the legwork. The wood thanks you.', actions: [
        { set: 'hw.whistle.done' }, { give: 'spark' }, { sfx: 'spark' },
      ] },
    ],

    /* ----- Thistledown (quietest, depth 4) — the secretly-pleased hermit ----- */
    'hw-thistle-hermit': [
      { who: 'turtle', text: 'Thistledown. Two of us. The deepest clearing in the whole wood.' },
      { who: 'pip', text: 'Four forks from the dock. That’s a long morning walk.' },
      { who: 'turtle', text: 'Nobody visits. It’s wonderful. *settles deeper into the moss*' },
      { who: 'turtle', text: 'A long code for a quiet road is a fair trade. Let the busy ones keep their short whistles.' },
      { who: 'turtle', text: 'And the wood keeps one short path secret — west, up high, where the trails first split.' },
    ],

    /* ----- Gull at the forward dock ----- */
    'hw-gull-wait': [
      { who: 'gull', text: 'Not yet. The wood’s relay is dark. Set the plan and the signs, then we talk passage.' },
    ],
    'hw-gull-go': [
      { who: 'gull', text: 'Relay’s lit. *eyes the horizon* Static Strait’s next — and the storm’s in a mood.' },
      { who: 'pip', text: 'I’m ready.' },
      { who: 'gull', text: 'Step aboard, then. Mind the noise.' },
    ],
  },
});

})();
