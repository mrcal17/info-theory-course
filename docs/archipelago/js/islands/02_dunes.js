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

    /* ---------- SIDE QUEST 'dn.sq1.*': the Mirage-moth field survey ----------
       Offered by Sift once the geyser gate is passed (ifFlag dn.forecast.done,
       routed inside dn-sift-needs-tree / -tree-done / -done). Three observation
       spots appear once dn.sq1.start is set; each is an interactable prop that
       sets one dn.sq1.obs* flag. Report back to Sift to set dn.sq1.done. No
       sparks — purely a naturalist's catalogue, frozen budget. The spots chain:
       only the next un-logged spot glows, so the player visits all three. */
    { id: 'dn-sq-track1', type: 'prop', x: 20, y: 8, sprite: 'sign',
      dialogue: 'dn-sq-obs1',
      ifFlag: 'dn.sq1.start', ifNotFlag: 'dn.sq1.obs1' },
    { id: 'dn-sq-track2', type: 'prop', x: 33, y: 22, sprite: 'sign',
      dialogue: 'dn-sq-obs2',
      ifFlag: 'dn.sq1.obs1', ifNotFlag: 'dn.sq1.obs2' },
    { id: 'dn-sq-track3', type: 'prop', x: 8, y: 21, sprite: 'sign',
      dialogue: 'dn-sq-obs3',
      ifFlag: 'dn.sq1.obs2', ifNotFlag: 'dn.sq1.obs3' },

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

    /* ---------- Ambient desert flavor (signs + a marker post) ---------- */
    { id: 'dn-sign-warn', type: 'sign', x: 24, y: 24, text: [
        'GEYSER COUNTRY — WALK, DO NOT DAWDLE.',
        'A scalded gull once stood ON a vent to be sure it would blow. It did. ' +
        'A vent you are certain of has nothing left to tell you. Stand beside, not atop.',
      ] },
    { id: 'dn-sign-tracks', type: 'sign', x: 26, y: 6, text: [
        'FIELD NOTE, nailed to a post:',
        'Tracks here belong to nobody on Sift\'s list. Forked, light, here and gone. ' +
        'If you see the maker — TELL SIFT. An unknown beast is worth more than a known one.',
      ] },
    { id: 'dn-sign-cabinet', type: 'sign', x: 19, y: 27, text: [
        'SIFT\'S CABINET OF CURIOSITIES (overflow drawer).',
        'Labels: "a sneeze, dated." "the third-quietest hour." "one perfectly ordinary pebble." ' +
        'The rarest drawer is the one marked NOTHING TO REPORT — it is almost always empty.',
      ] },
    { id: 'dn-prop-cairn', type: 'prop', x: 31, y: 28, sprite: 'sign',
      dialogue: [{ who: 'sign', text:
        'A leaning cairn of glassy sand-fused stones, scorched at the base. ' +
        'Someone has scratched: "vent blew here — once — and never again."' }] },

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
      /* side-quest routing: report-in once all three sightings are logged, else
         the in-progress nudge, else (first time here) the offer. */
      { ifFlag: 'dn.sq1.obs3', ifNotFlag: 'dn.sq1.done', goto: 'dn-sq-report' },
      { ifFlag: 'dn.sq1.start', ifNotFlag: 'dn.sq1.obs3', goto: 'dn-sq-progress' },
      { who: 'sift', text: 'The jar glows! Surprise, bottled. I knew you had the patience for it.' },
      { who: 'pip', text: 'The dish still sleeps, though.' },
      { who: 'sift', text: 'It wants a charge AND an address book — every dune critter, sorted, so it knows who is who. ' +
        'Go to the dish on the high dune, north-east.' },
      { who: 'sift', text: 'Sort them by yes/no questions — cheapest set of questions wins. Peel off the likeliest first; ' +
        'split the rest where the odds are evenest. Ask wrong ones and you will pay for it.' },
      { ifFlag: 'dn.sq1.start', end: true },
      { who: 'sift', text: 'Oh — while you are out there. *lowers voice* I have a private trouble.' },
      { goto: 'dn-sq-offer' },
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

    /* ===== Sift: all done (post-completion variants) ===== */
    'dn-sift-done': [
      { ifFlag: 'dn.pebble.got', ifNotFlag: 'dn.pebble.done', goto: 'dn-pebble-handin' },
      /* survey still open after the main quest? let the player wrap it up */
      { ifFlag: 'dn.sq1.obs3', ifNotFlag: 'dn.sq1.done', goto: 'dn-sq-report' },
      { ifFlag: 'dn.sq1.start', ifNotFlag: 'dn.sq1.obs3', goto: 'dn-sq-progress' },
      { who: 'sift', text: 'The relay caught up on a whole season of letters. " ...the most surprising thing is how little ' +
        'surprise we hold onto." Pretty, no?' },
      /* post-completion variant: the survey changes how Sift signs off */
      { ifFlag: 'dn.sq1.done', who: 'sift', text: 'And the Mirage-moth has its own page now — three bits of questions, ' +
        'pinned and dated. My proudest column. You found a thing the dune was hiding.' },
      { ifNotFlag: 'dn.sq1.start', who: 'sift', text: 'If you ever want one more puzzle before the ferry — there are tracks ' +
        'on this dune I cannot name. Ask me about them. Otherwise: go.' },
      { who: 'sift', text: 'Off to Huffman Wood with you. Tell Huff the fennec says hello — and that her trails ' +
        'are just my question-trees with leaves on.' },
      { ifNotFlag: 'dn.sq1.start', goto: 'dn-sift-done-offer' },
    ],

    /* offer-the-survey tail for the done state (only if never started) */
    'dn-sift-done-offer': [
      { choice: [
        { label: 'Tell me about those tracks.', goto: 'dn-sq-offer' },
        { label: 'Maybe later.', end: true },
      ] },
    ],

    /* ===== Sift: postgame ===== */
    'dn-sift-postgame': [
      { ifFlag: 'dn.sq1.obs3', ifNotFlag: 'dn.sq1.done', goto: 'dn-sq-report' },
      { who: 'sift', text: 'The whole network sings now, and my jar of surprises has never been so full. ' +
        'Funny — a quiet archipelago turned out to be the most surprising find of all.' },
      { ifFlag: 'dn.sq1.done', who: 'sift', text: 'Visitors keep asking after the Mirage-moth. I tell them: three yes/no ' +
        'questions and you have it — no more, no less. The dune kept it a secret for a season; a robot caught it in an afternoon.' },
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

    /* ============================================================= */
    /* ===== SIDE QUEST 'dn.sq1.*': the Mirage-moth field survey ==== */
    /* ============================================================= */

    /* offer (reached via goto from Sift's states; sets dn.sq1.start) */
    'dn-sq-offer': [
      { who: 'sift', text: 'There is a moth on this dune that is not in my book. A Mirage-moth, the gulls call it — ' +
        'nobody has pinned it down. Three sightings, all different. I cannot tell which is real.' },
      { who: 'pip', text: 'What do you need me to do?' },
      { who: 'sift', text: 'Find the three spots where it has been seen and LOOK. One sighting each. ' +
        'I have left field-posts at the tracks. Then come back and we will name it properly.' },
      { who: 'sift', text: 'A post north past the camp, one by the dried oasis, one out in the far field west. ' +
        'Bring me what you observe.' },
      { who: 'pip', text: '*Three marked spots. Logging the sightings, one at a time.*' },
      { actions: [{ set: 'dn.sq1.start' }, { sfx: 'select' }, { focus: { x: 20, y: 8 } }] },
    ],

    /* in-progress nudge (started, fewer than three sightings logged) */
    'dn-sq-progress': [
      { ifNotFlag: 'dn.sq1.obs1', who: 'sift', text: 'No sightings yet? Start at the post north of camp — ' +
        'the tracks are freshest there. One look at each of the three.' },
      { ifFlag: 'dn.sq1.obs1', ifNotFlag: 'dn.sq1.obs2', who: 'sift', text: 'One sighting down! Colour logged. ' +
        'Two posts to go — the oasis next, then the far field. Keep looking.' },
      { ifFlag: 'dn.sq1.obs2', ifNotFlag: 'dn.sq1.obs3', who: 'sift', text: 'Two of three! The wingbeat too. ' +
        'One post left, out west in the far field. Then hurry back.' },
    ],

    /* observation 1 — north post: COLOUR (narrows the field) */
    'dn-sq-obs1': [
      { who: 'pip', text: '*A field-post, a scuff of light forked tracks. A moth lifts off as you near — ' +
        'pale gold, the exact colour of the sand. It is gone before you can blink.* ' },
      { who: 'pip', text: '*Sighting one: SAND-GOLD, not the bright copper Sift guessed. Logged.*' },
      { actions: [{ set: 'dn.sq1.obs1' }, { sfx: 'select' }, { focus: { x: 33, y: 22 } }] },
    ],

    /* observation 2 — oasis post: WINGBEAT (narrows further) */
    'dn-sq-obs2': [
      { who: 'pip', text: '*By the dry oasis, the moth hangs over a boulder. Its wings barely move — ' +
        'a slow, silent beat, nothing like the buzz of the dune-beetles.*' },
      { who: 'pip', text: '*Sighting two: SLOW, SILENT wingbeat. Logged.*' },
      { actions: [{ set: 'dn.sq1.obs2' }, { sfx: 'select' }, { focus: { x: 8, y: 21 } }] },
    ],

    /* observation 3 — far field post: ROOST (last trait) */
    'dn-sq-obs3': [
      { who: 'pip', text: '*Far out west, the moth settles — not on a plant, but DOWN a cracked geyser vent, ' +
        'into the warm dark. It roosts where it is hot.*' },
      { who: 'pip', text: '*Sighting three: roosts in WARM VENTS. Three traits logged. Back to Sift.*' },
      { actions: [{ set: 'dn.sq1.obs3' }, { sfx: 'spark' }, { focus: { x: 23, y: 16 } }] },
    ],

    /* report-in — Sift catalogues it and prices the catalogue in bits */
    'dn-sq-report': [
      { who: 'sift', text: 'You saw it! Tell me everything. *quill poised*' },
      { who: 'pip', text: 'Sand-gold. Slow, silent wings. And it roosts down warm vents.' },
      { who: 'sift', text: 'Sand-gold... silent... heat-roosting... *scribbles furiously* Oh, marvellous. ' +
        'It is none of the eight moths I had guessed at. It is its OWN thing.' },
      { who: 'pip', text: 'How many questions to file it for good?' },
      { who: 'sift', text: 'Picture eight look-alikes I might confuse it for. One yes/no question halves the field: ' +
        'eight to four, four to two, two to one. log-two of eight is THREE. Three bits, and it is named.' },
      { who: 'sift', text: 'Colour, wingbeat, roost — three clean questions, three bits, and the Mirage-moth has its page. ' +
        'A whole new species, courier, and you spent exactly the surprise it was worth.' },
      { who: 'sift', text: 'Here — no spark, those go to the relay. But your name is in the margin, under mine. Forever.' },
      { actions: [{ set: 'dn.sq1.done' }, { sfx: 'beacon' }, { focus: { x: 23, y: 16 } }] },
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

/* ---------------- Codex lore pages (island 'dunes', prefix dn.) ----------------
   Registered after the island; codex.js loads before islands so G.codex exists.
   Each unlocks on a quest flag and is written in Pip's / Sift's in-world voice. */
G.codex.register({
  id: 'lore.dn.surprise-jar', kind: 'lore', island: 'dunes',
  title: 'The Surprise-Jar', unlock: 'dn.forecast.done',
  body: 'Sift’s jar fills not with steam but with <b>bits of surprise</b>. Camp a vent that ' +
    'blows with chance <i>p</i> and each hit pays you −log₂<i>p</i> — a rare puff is worth far more ' +
    'than a steady one. I banked the most by sitting where the <i>expected</i> pay was best, not where ' +
    'the flashiest blew. The honest, patient seat wins the field.',
  hint: 'Charge the surprise-jar at the geyser gate.',
});
G.codex.register({
  id: 'lore.dn.mirage-moth', kind: 'lore', island: 'dunes',
  title: 'The Mirage-Moth', unlock: 'dn.sq1.done',
  body: 'A new species, sand-gold and silent, that roosts down warm vents — named on the day I logged ' +
    'three sightings for Sift. He could have mistaken it for any of <b>eight</b> look-alikes, so naming it ' +
    'cost exactly <b>log₂ 8 = 3 bits</b>: colour, wingbeat, roost, three clean yes/no questions. ' +
    '<i>Surprise, paid out in the precise coin it was worth.</i> My name is in the margin, under his.',
  hint: 'Survey the Mirage-moth for Sift (talk to him after the geyser gate).',
});
G.codex.register({
  id: 'lore.dn.going-rate', kind: 'lore', island: 'dunes',
  title: 'The Going Rate', unlock: 'dn.done',
  body: 'When the relay woke, Sift told me the secret of the dune: average the surprise across every vent, ' +
    'weighted by its chance, and you get the field’s <b>going rate</b> — <b>H = Σ p·log₂(1/p)</b>, ' +
    'the quantity the old keepers called <b>entropy</b>. It is a floor: no clever game of questions can ' +
    'average below it. The dish runs on exactly that, and now it speaks again.',
  hint: 'Wake the relay dish — finish Sift’s two tasks.',
});

})();
