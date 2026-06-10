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
        // post-completion: oak side quest done — Huff's warmest, fullest variant
        { ifFlag: 'hw.sq1.done', use: 'hw-huff-done-oak' },
        // post-completion: side-quest accepted, turns to gather / oak not yet found
        { ifFlag: 'hw.sq1.start', use: 'hw-huff-oak-nag' },
        // post-completion: main quest done — Huff offers the oak side quest
        { ifFlag: 'hw.done', use: 'hw-huff-done' },
        { ifFlag: 'hw.signs.done', use: 'hw-huff-relay' },
        // mid-progress: plan carved, heading for the workshop to carve the signs
        { ifFlag: 'hw.plan.heard', use: 'hw-huff-mid-workshop' },
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
      dialogue: [
        // side-quest: Mosswick keeps the FIRST turn of the way to the old Oak
        { ifFlag: 'hw.sq1.t1', use: 'hw-moss-crab-told' },
        { ifFlag: 'hw.sq1.start', use: 'hw-moss-crab-turn' },
        { use: 'hw-moss-crab' },
      ] },
    { id: 'hw-moss-gull', type: 'npc', x: 14, y: 28, sprite: 'gullsmall', wander: true,
      dialogue: 'hw-moss-gull' },
    { id: 'hw-moss-sign', type: 'sign', x: 11, y: 28,
      text: ['MOSSWICK — busiest trailhead. 21 walkers a day.', 'One fork from the dock. The busy folk earned the short walk.'] },
    // Side-quest delivery trigger: walking into Mosswick carrying the letter.
    { id: 'hw-deliver-trigger', type: 'trigger', x: 16, y: 29, once: true,
      ifFlag: 'hw.whistle.got', ifNotFlag: 'hw.whistle.done',
      actions: [{ goto: 'hw-deliver' }] },

    /* -------- Oak side-quest: the decoded grove in Mosswick's quiet corner -------- */
    // The remembered code "● ○" (west off the root, then on up) reads out to the
    // hushed northwest corner of the busiest clearing. No spark — lore only.
    { id: 'hw-oak-trigger', type: 'trigger', x: 10, y: 27, once: true,
      ifFlag: 'hw.sq1.t2', ifNotFlag: 'hw.sq1.done',
      actions: [{ set: 'hw.sq1.done' }, { goto: 'hw-oak-found' }] },
    // The unearthed grove marker — appears only after the Oak is found.
    { id: 'hw-oak-grove', type: 'prop', x: 9, y: 27, sprite: 'chest', ifFlag: 'hw.sq1.done' },
    { id: 'hw-oak-sign', type: 'sign', x: 10, y: 30, ifFlag: 'hw.sq1.done',
      text: ['THE FIRST-FORK OAK — grove rediscovered.', 'Read west-then-up (● ○), the way every village half-remembered.'] },

    /* -------- Village leaf: Fernholt (depth 2) -------- */
    // East tee at row 22; clearing rows 21-25, x 28-39.
    { id: 'hw-fern-turtle', type: 'npc', x: 33, y: 23, sprite: 'turtle', wander: true,
      dialogue: 'hw-fern-turtle' },
    { id: 'hw-fern-sign', type: 'sign', x: 31, y: 22,
      text: 'FERNHOLT — 9 a day. Two forks deep. A fair walk for a fair few.' },

    /* -------- Village leaf: Bramblebury (depth 3) -------- */
    // West tee at row 17; clearing rows 15-18, x 6-15.
    { id: 'hw-bramble-crab', type: 'npc', x: 11, y: 16, sprite: 'crab', wander: true,
      dialogue: [
        // side-quest: Bramblebury keeps the SECOND turn (only after Mosswick's)
        { ifFlag: 'hw.sq1.t2', use: 'hw-bramble-crab-told' },
        { ifFlag: 'hw.sq1.t1', use: 'hw-bramble-crab-turn' },
        { ifFlag: 'hw.sq1.start', use: 'hw-bramble-crab-wait' },
        { use: 'hw-bramble-crab' },
      ] },
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

    /* -------- Ambient flavor: trail markers (0/1 carvings) and depth posts -------- */
    // At the root fork, a low marker teaching the carving convention.
    { id: 'hw-mark-root', type: 'sign', x: 25, y: 34,
      text: ['A weathered trail marker, freshly recut:', '●  = turn west (a 0).   ○  = stay on the trunk (a 1).'] },
    // Mosswick is one fork in — depth post by the busy clearing.
    { id: 'hw-depth-moss', type: 'sign', x: 13, y: 15,
      text: 'DEPTH POST: ●●● — three turns to Bramblebury. The deeper the post, the longer the code.' },
    // A depth post in the Fernholt clearing, near the relay.
    { id: 'hw-depth-fern', type: 'sign', x: 35, y: 24,
      text: 'DEPTH POST: ○●  — Fernholt, two turns deep. Short post, short walk, short whistle.' },
    // A trail marker on the deep east branch counting the deepest leaves.
    { id: 'hw-mark-deep', type: 'sign', x: 39, y: 28,
      text: ['Deep-branch tally, knife-cut into the bark:', 'four marks to the leaves down here. Quiet roads pay in length.'] },
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
      { who: 'huff', text: 'No whistle may begin another. A whistle that could keep going is a lie — you can’t trust where it ends.',
        actions: [{ set: 'hw.plan.heard' }] },
    ],
    /* mid-progress: said between the stump door and the workshop (plan done,
       signs not yet carved) — Huff points the way without re-explaining. */
    'hw-huff-mid-workshop': [
      { who: 'huff', text: 'Plan’s holding. *jerks a thumb northeast* The workshop’s the deep east branch — Owl’s End way.' },
      { who: 'pip', text: 'And the whistles must be prefix-free.' },
      { who: 'huff', text: 'No whistle starts another. Five boards, five clean codes. Then the relay can read the wood.' },
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
      { who: 'huff', text: '*flips to the back of the clipboard* …Long as you’re standing about. There’s an old riddle in the wood.' },
      { who: 'huff', text: 'The First-Fork Oak. The very tree the trails grew from. Nobody’s walked to its grove in years.' },
      { choice: [
        { label: 'Tell me about the Oak.', goto: 'hw-oak-brief' },
        { label: 'Maybe later.', end: true },
      ] },
    ],
    /* ----- post-completion: the oldest-tree side quest (Huff's register) ----- */
    'hw-oak-brief': [
      { who: 'huff', text: 'The Oak’s grove was never marked — the way to it lived only in the villages’ memory.' },
      { who: 'huff', text: 'Each clearing kept ONE turn of the walk. String the turns together and the path spells itself.' },
      { who: 'pip', text: 'A path that’s also a code.' },
      { who: 'huff', text: 'Same thing here, always. Ask Mosswick for the first turn, then Bramblebury for the next.' },
      { who: 'huff', text: 'A dot is west, a circle is on up the trunk — read them in order, like a whistle. Off you go.',
        actions: [{ set: 'hw.sq1.start' }] },
    ],
    'hw-huff-oak-nag': [
      { who: 'huff', text: 'Still after the Oak? *taps clipboard* Mosswick keeps the first turn, Bramblebury the second.' },
      { ifNotFlag: 'hw.sq1.t1', who: 'huff', text: 'You’ve not asked Mosswick yet. The busy folk remember the short, bright start.' },
      { ifFlag: 'hw.sq1.t1', ifNotFlag: 'hw.sq1.t2', who: 'huff',
        text: 'One turn down. Bramblebury, three forks in, holds the rest of it.' },
      { ifFlag: 'hw.sq1.t2', who: 'huff',
        text: 'Both turns in hand? Then walk them — dot, then circle. The grove’s where the reading ends.' },
    ],
    'hw-huff-done-oak': [
      { who: 'huff', text: 'You FOUND it. *thumps the clipboard down* The First-Fork Oak. I’d half stopped believing in it.' },
      { who: 'pip', text: 'The remembered turns spelled the path exactly.' },
      { who: 'huff', text: 'Course they did. A village never forgets its own turn — it just forgets it’s a code.' },
      { who: 'huff', text: 'Eighty-one walks, five honest signs, one steady light, and now the old root’s on the map again.' },
      { who: 'huff', text: 'A whole wood, written down. *quietly pleased* Best morning I’ve had in years.' },
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

    /* ----- oak side-quest: the two remembered turns ----- */
    // Mosswick (busy, depth 1) keeps the FIRST turn: a dot — west, off the root.
    'hw-moss-crab-turn': [
      { who: 'crab', text: 'The OLD Oak? *clicks* Hah — everyone forgets, but Mosswick remembers the first turn.' },
      { who: 'crab', text: 'Off the very root you go WEST. One dot — ● — same as our short whistle. Busy roads, bright starts!' },
      { who: 'pip', text: 'West. A dot. I’ll keep it.' },
      { who: 'crab', text: 'Bramblebury keeps the next turn. Three forks in — go ask the quiet crab there.',
        actions: [{ set: 'hw.sq1.t1' }] },
    ],
    'hw-moss-crab-told': [
      { who: 'crab', text: 'First turn’s a dot — west! Bramblebury’s got the rest. Move along now, twenty-one of us!' },
    ],
    // Bramblebury (depth 3) keeps the SECOND turn: a circle — on up the trunk.
    'hw-bramble-crab-wait': [
      { who: 'crab', text: 'A turn for the Oak? *peers* I keep the SECOND one. Get Mosswick’s first — it comes before mine.' },
    ],
    'hw-bramble-crab-turn': [
      { who: 'crab', text: 'So you’ve the dot from Mosswick. *nods slow* Then here’s the second turn of the old way.' },
      { who: 'crab', text: 'After the dot, you keep ON up the trunk. A circle — ○ — the quieter child. Don’t branch off.' },
      { who: 'pip', text: 'Dot, then circle. West, then straight on up.' },
      { who: 'crab', text: 'Walk it where the trails first split, and the reading ends at the Oak’s own grove.',
        actions: [{ set: 'hw.sq1.t2' }] },
    ],
    'hw-bramble-crab-told': [
      { who: 'crab', text: 'Dot then circle. West, then on up the trunk. The Oak’s where the reading runs out.' },
    ],
    // discovery: walking onto the decoded grove tile with both turns in hand.
    'hw-oak-found': [
      { who: 'pip', text: '…Dot, then circle. West off the root, then on up. This is where the turns run out.' },
      { who: 'pip', text: 'A great old stump, broader than the gate-stump — rings on rings. The First-Fork Oak.' },
      { who: 'pip', text: 'The whole wood is its children. Every trail a branch; every village a leaf. *files it away*',
        actions: [{ sfx: 'spark' }] },
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

/* ---------------- Codex lore (Pip's field notes for Huffman Wood) ----------------
   Registered after the island; codex.js loads before islands and exposes
   G.codex.register. Each page unlocks on an hw.* flag and toasts on unlock. */
if (G.codex && G.codex.register) {
  // Unlocks when the wood's relay is lit (main quest done): the geography lesson.
  G.codex.register({
    id: 'lore.hw.tree-shaped', kind: 'lore', island: 'huffman-wood',
    title: 'Why the wood grew tree-shaped',
    body: 'The trails were never planned on paper — they grew the way Huff plans them: ' +
      'join the two quietest first, then the next two, until one trunk reaches the dock. ' +
      'So the map <i>is</i> a Huffman tree. Busy Mosswick sits one fork in; quiet Thistledown ' +
      'four. Depth is code length, and the wood already minimised it before anyone could read.',
    unlock: 'hw.done',
    hint: 'Light the wood’s relay — set Huff’s plan and the signpost whistles.',
  });
  // Unlocks when the oldest-tree side quest completes.
  G.codex.register({
    id: 'lore.hw.first-fork-oak', kind: 'lore', island: 'huffman-wood',
    title: 'The First-Fork Oak',
    body: 'No one wrote down the way to the wood’s oldest tree — each village simply kept ' +
      'one turn of it. Mosswick remembered a dot (west, a 0); Bramblebury a circle (on up the ' +
      'trunk, a 1). Read in order, the remembered turns <b>are a codeword</b>, and walking that ' +
      'codeword ends exactly at the Oak’s grove. A path through a tree and a string of bits are the same thing.',
    unlock: 'hw.sq1.done',
    hint: 'Gather the remembered turns from Mosswick and Bramblebury, then walk them out.',
  });
  // Unlocks on the hidden grove spark — the prefix-free idea, found early.
  G.codex.register({
    id: 'lore.hw.secret-short-path', kind: 'lore', island: 'huffman-wood',
    title: 'The one short path kept secret',
    body: 'The grove west-up-high holds a spark and a card: “for the one who looked west, up high.” ' +
      'A short path spent on a quiet place is a small extravagance — the mirror of giving a long ' +
      'whistle to a busy road. The wood teaches it both ways: short codes belong to the busy, and ' +
      'every short code you spend is a short code some other traveller can no longer have.',
    unlock: 'hw.secret.got',
    hint: 'Find the sealed grove through the grass gap, west of Bramblebury.',
  });
}

})();
