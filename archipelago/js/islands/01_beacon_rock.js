/* THE QUIET ARCHIPELAGO — ISLAND 1: Beacon Rock.
   The tutorial and tone-setter. A warm harbor island: a sandy cove with a dock
   (south), a village square with Maren's post office, and a switchback path up
   through grass and trees to Dr. Shannon's lighthouse on a stone bluff (north).
   Teaches: a bit = the answer to one yes/no question; a weighing ~= log2(3) bits.
   Mechanics: binary-gate (the mail sorter) and scales (the harbor scales).
   Flag prefix: br.  Sparks: exactly 3. */
(function () {
'use strict';

G.islands.register({
  id: 'beacon-rock',
  name: 'Beacon Rock',
  order: 1,
  palette: 'shore',
  music: 'shore',

  /* 46 wide x 32 tall. Geography reads bottom-to-top:
       cove + dock (south) -> village square (middle) ->
       switchback path (single-file, gated by the sorter) -> stone bluff (north).
     The path is the ONLY way up; the sorter door sits on its one choke tile.
     A dead-letter office (mastery door) is tucked behind the square. */
  map: `
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~^^^^^^^^^^^^^^~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~^^ssssssssssss^^~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~^sssSSSSSSSssss^~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~^sssS!ss!Ssssss^~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~^sssSS++SSsssss^~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~^^ssss,_,sssss^~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~TTTTTTTT_TTTTTTT~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~TTTTTTTTT_TTTTTTTT~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~TTTT;;,,,,_,,,,;TTTT~~~~~~~~~~~~~~~~~
~~~~~~~~~~TTTT;,,,,,,_,,,,,;TTTT~~~~~~~~~~~~~~~~
~~~~~~~~~TTTT;,,,,,,,_,,,,,,;TTTT~~~~~~~~~~~~~~~
~~~~~~~~TTTT;;,,,,,,,_,,,,,,;;TTTT~~~~~~~~~~~~~~
~~~~~~~~,,,,,,,,,,,,,_,,,,,,,,,,,~~~~~~~~~~~~~~~
~~~~~~~~,,,,,,,,,,,,,_,,,,,,,,,,,~~~~~~~~~~~~~~~
~~~~~~~,,,,,,,,,,,,,,_,,,,,,,,,,,,~~~~~~~~~~~~~~
~~~~~~,,,,,,,,,,,,,,,_,,,,,,,,,,,,,~~~~~~~~~~~~~
~~~~~,,,,SSSSS,,,,,,,_,,,,,,,,,,,,,,~~~~~~~~~~~~
~~~~.,,,,S+sS,,,,,,,,_,,,,SSSSS,,,,,.~~~~~~~~~~~
~~~~.,,,,SssS,,,,,,,,_,,,,S+sS,,,,,,.~~~~~~~~~~~
~~~~.,,,,Ssss,,,,,,,,_,,,,SsssS,,,,,.~~~~~~~~~~~
~~~~..,,,,,,,,,,,,,,,_,,,,,,,,,,,,,..~~~~~~~~~~~
~~~~~..,,,,,,,,,,,,,,_,,,,,,,,,,,,..~~~~~~~~~~~~
~~~~~~..,,,,,,,,,,,,,_,,,,,,,,,,,..~~~~~~~~~~~~~
~~~~~~~..,,,,,,,,,,,,_,,,,,,,,,,..~~~~~~~~~~~~~~
~~~~~~~~...,,,,,,,,,,_,,,,,,,,...~~~~~~~~~~~~~~~
~~~~~~~~~~.................,.........~~~~~~~~~~~
~~~~~~~~~~--..................--~~~~~~~~~~~~~~~~
~~~~~~~~~~~-..,..........,...-~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~-...===.....--~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~--===--~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`,

  spawn: { x: 15, y: 28 },

  entities: [
    /* ---------- the dock / cove (south) ---------- */
    { id: 'br-sign-welcome', type: 'sign', x: 13, y: 27,
      text: ['BEACON ROCK', 'Pop. 9 (and one new arrival). Mind the gulls.'] },

    { id: 'br-gull', type: 'npc', x: 16, y: 29, sprite: 'gull', name: 'Ferryman Gull',
      dialogue: [
        { ifFlag: 'br.done', use: 'br-gull-ready' },
        { use: 'br-gull-wait' },
      ] },

    /* the lost letter on the beach — side-quest item (NOT a spark itself) */
    { id: 'br-lostletter', type: 'item', x: 25, y: 28, gives: 'letter',
      flag: 'br.lostletter.got', ifNotFlag: 'br.lostletter.got' },

    { id: 'br-villager-turtle', type: 'npc', x: 12, y: 26, sprite: 'turtle', wander: true,
      dialogue: [
        { ifFlag: 'br.sq1.start', ifNotFlag: 'br.sq1.clue-turtle', use: 'br-turtle-sq1' },
        { ifFlag: 'br.done', use: 'br-turtle-done' },
        { use: 'br-turtle' },
      ] },

    /* the harbor scales — a door near the dock; ferry won't sail unbalanced */
    { id: 'br-scales', type: 'door', x: 18, y: 28, sprite: 'gate',
      puzzle: { type: 'scales', config: { coins: 9, odd: 'light', weighings: 2 } },
      flag: 'br.scales.done', sparks: 0, ifNotFlag: 'br.scales.done',
      lockedText: 'The ballast scales. Nine coins, one shaved light.' },
    { id: 'br-sign-scales', type: 'sign', x: 20, y: 27,
      text: ['THE HARBOR SCALES', 'No ferry sails on crooked ballast.'] },

    /* ---------- ambient flavor (off the main path, walkable margins) ---------- */
    { id: 'br-sign-tides', type: 'sign', x: 11, y: 26,
      text: ['TIDE BOARD', 'High at dawn, low at dusk. Letters ride the low.',
             'Someone has chalked: "still no boats from the south."'] },

    { id: 'br-mailbox-cove', type: 'prop', x: 33, y: 26, sprite: 'mailbox', solid: false,
      ifNotFlag: 'br.done' },
    { id: 'br-sign-mailbox', type: 'sign', x: 13, y: 24,
      text: ['OUTGOING POST', 'Slot empty. The flag is down. It has been down a while.'] },

    /* ---------- the village square (middle) ---------- */
    { id: 'br-sign-square', type: 'sign', x: 11, y: 21,
      text: 'COVE SQUARE — post office west, dead letters east.' },

    /* Maren's post office (west building, doorway at x=10,y=18). She stands
       at her counter on the grass just south of the door. */
    { id: 'br-maren', type: 'npc', x: 10, y: 16, sprite: 'maren', name: 'Maren', dir: 's',
      dialogue: [
        { ifFlag: 'game.finished', use: 'br-maren-post' },
        { ifFlag: 'br.lostletter.got', ifNotFlag: 'br.lostletter.done', use: 'br-maren-letter' },
        /* side quest: the smudged letter. The ACTIVE-quest branches sit highest
           so an in-progress errand stays completable even after the beacon is
           lit; the plain OFFER yields to the post-completion greeting. */
        { ifFlag: 'br.sq1.ready', ifNotFlag: 'br.sq1.done', use: 'br-maren-sq1-clues' },
        { ifFlag: 'br.sq1.start', ifNotFlag: 'br.sq1.done', use: 'br-maren-sq1-ask' },
        /* post-completion: the network is alight again */
        { ifFlag: 'br.done', use: 'br-maren-done' },
        /* offered once Pip has met her and has not yet started the errand */
        { ifFlag: 'br.met-maren', ifNotFlag: 'br.sq1.start', use: 'br-maren-sq1-offer' },
        /* mid-progress: sorter fixed, scales still crooked */
        { ifFlag: 'br.sorter.open', ifNotFlag: 'br.scales.done', use: 'br-maren-mid' },
        { ifFlag: 'br.met-maren', use: 'br-maren-again' },
        { use: 'br-maren-1' },
      ] },
    { id: 'br-mailbox', type: 'prop', x: 8, y: 18, sprite: 'mailbox' },

    /* the dead-letter office — mastery door (east building, doorway at
       x=27,y=19), worth a spark */
    { id: 'br-sorter2', type: 'door', x: 27, y: 19, sprite: 'runedoor',
      puzzle: { type: 'binary-gate', config: {
        items: [
          { name: 'Sift',   traits: { far: true,  windy: true,  sandy: true  } },
          { name: 'Huff',   traits: { far: true,  windy: false, sandy: false } },
          { name: 'Ada',    traits: { far: true,  windy: true,  sandy: false } },
          { name: 'Bea',    traits: { far: true,  windy: false, sandy: true  } },
          { name: 'Lem',    traits: { far: false, windy: false, sandy: false } },
          { name: 'Ziv',    traits: { far: false, windy: true,  sandy: false } },
          { name: 'Warden', traits: { far: false, windy: false, sandy: true  } },
          { name: 'Maren',  traits: { far: false, windy: true,  sandy: true  } },
        ],
        traitLabels: {
          far:   'Is it bound off-island?',
          windy: 'Is the address up high, in the wind?',
          sandy: 'Does the address sit on sand?',
        },
        parQuestions: 3,
      } },
      flag: 'br.sorter2.open', sparks: 1, ifNotFlag: 'br.sorter2.open',
      lockedText: 'THE DEAD LETTER OFFICE — eight names, three good questions.' },
    { id: 'br-sign-deadletter', type: 'sign', x: 29, y: 17,
      text: ['DEAD LETTER OFFICE', 'Eight lost names. Three questions find any one.'] },

    { id: 'br-sign-network', type: 'sign', x: 33, y: 16,
      text: ['NETWORK NOTICE', 'All beacons dark. Service suspended until further light.',
             'Posted by order of nobody, since nobody is left to post it.'] },

    { id: 'br-villager-crab', type: 'npc', x: 31, y: 16, sprite: 'crab', wander: true,
      dialogue: [
        { ifFlag: 'br.sq1.start', ifNotFlag: 'br.sq1.clue-crab', use: 'br-crab-sq1' },
        { ifFlag: 'br.done', use: 'br-crab-done' },
        { use: 'br-crab' },
      ] },

    /* ---------- the path choke + the mail sorter gate ---------- */
    /* The sorter sits on the path's one choke tile (x=21,y=7): the single
       walkable gap in a full tree wall. No way around it until it opens. */
    { id: 'br-sorter', type: 'door', x: 21, y: 7, sprite: 'door',
      puzzle: { type: 'binary-gate', config: {
        items: [
          { name: 'Shannon (lighthouse)', traits: { up: true,  bird: true  } },
          { name: 'Gull (the dock)',      traits: { up: false, bird: true  } },
          { name: 'Maren (post office)',  traits: { up: false, bird: false } },
          { name: 'Sift (the dunes)',     traits: { up: true,  bird: false } },
        ],
        traitLabels: {
          up:   'Does the letter climb the hill?',
          bird: 'Is the addressee a bird?',
        },
        parQuestions: 2,
      } },
      flag: 'br.sorter.open', sparks: 0, ifNotFlag: 'br.sorter.open',
      lockedText: 'THE OLD MAIL SORTER — it only understands yes and no.' },
    { id: 'br-sign-sorter', type: 'sign', x: 17, y: 9,
      text: ['TO THE LIGHTHOUSE', 'The old sorter blocks the path. Ask it well.'] },

    { id: 'br-villager-gull', type: 'npc', x: 22, y: 11, sprite: 'gullsmall', wander: true,
      dialogue: [
        { ifFlag: 'br.done', use: 'br-gullsmall-done' },
        { use: 'br-gullsmall' },
      ] },

    /* ---------- the bluff + lighthouse (north) ---------- */
    { id: 'br-shannon', type: 'npc', x: 16, y: 6, sprite: 'shannon', name: 'Dr. Shannon', dir: 's',
      dialogue: [
        { ifFlag: 'game.finished', use: 'br-shannon-post' },
        { ifFlag: 'br.done', use: 'br-shannon-done' },
        { ifFlag: 'br.scales.done', ifNotFlag: 'br.done', use: 'br-shannon-light' },
        { ifFlag: 'br.letter.delivered', ifNotFlag: 'br.scales.done', use: 'br-shannon-wait' },
        { use: 'br-shannon-1' },
      ] },
    { id: 'br-sign-bluff', type: 'sign', x: 15, y: 6,
      text: 'BEACON ROCK LIGHT — keeper: Dr. Shannon. Hush, he is thinking.' },

    /* the beacon: off until br.done, then on. Sits between the two ! bases. */
    { id: 'br-beacon-off', type: 'prop', x: 19, y: 4, sprite: 'beacon-off', ifNotFlag: 'br.done' },
    { id: 'br-beacon-on',  type: 'prop', x: 19, y: 4, sprite: 'beacon-on',  ifFlag: 'br.done' },

    /* hidden spark tucked in a tree pocket at the foot of the bluff */
    { id: 'br-spark-cove', type: 'item', x: 25, y: 9, gives: 'spark',
      flag: 'br.spark.cove', ifNotFlag: 'br.spark.cove' },
    { id: 'br-sign-trees', type: 'sign', x: 24, y: 11,
      text: 'A scuffed note in the grass: "look where the trees hide a light."' },

    /* ---------- the ferry portal (south, off the dock) ---------- */
    /* gated until br.done; denied dialogue handled by deniedDialogue */
    { id: 'br-dock', type: 'portal', x: 16, y: 31, to: 'dunes',
      requiresFlag: 'br.done',
      deniedDialogue: [
        { who: 'gull', text: 'The ferry waits on the keeper’s light. Patience, courier.' },
      ] },
  ],

  objectives: [
    { flag: 'br.met-maren',        hint: 'Find the postmistress in the cove square.' },
    { flag: 'br.sorter.open',      hint: 'The mail sorter blocks the path. Sort the letter.' },
    { flag: 'br.letter.delivered', hint: 'Deliver the soggy letter to the lighthouse.' },
    { flag: 'br.scales.done',      hint: 'Balance the harbor scales by the dock.' },
    { flag: 'br.done',             hint: 'Return to Dr. Shannon to light the beacon.' },
  ],

  onEnter: [
    { ifNotFlag: 'br.intro', goto: 'br-intro' },
  ],

  dialogues: {
    /* ---------- intro (once) ---------- */
    'br-intro': [
      { who: 'pip', text: '...spppt. Antenna online. Satchel: damp, but sealed.' },
      { who: 'pip', text: 'I washed up on a beach. There is a lighthouse up the hill.' },
      { who: 'pip', text: 'One letter survived. Addressed to: "Dr. Shannon, the lighthouse."' },
      { who: 'pip', text: 'A small crab is waving by the post office. Best say hello.' },
      { actions: [{ set: 'br.intro' }, { sfx: 'save' }] },
    ],

    /* ---------- Maren ---------- */
    'br-maren-1': [
      { who: 'maren', text: 'Oh! A courier. A REAL courier. Click-click, come in, come in.' },
      { who: 'maren', text: 'I am Maren. I sort the mail here, when there is mail to sort.' },
      { who: 'maren', text: 'There has not been, lately. The beacon network went quiet.' },
      { who: 'maren', text: 'One by one the lights went dark. No lights, no letters get through.' },
      { who: 'pip', text: 'I have a letter for Dr. Shannon. At the lighthouse?' },
      { who: 'maren', text: 'Up the hill, dear. But the old sorter guards the path.' },
      { who: 'maren', text: 'It only understands yes and no. One good question cuts the pile in half.' },
      { who: 'maren', text: 'Ask it the right yes/no and the letter sorts itself. Off you go.' },
      { actions: [{ set: 'br.met-maren' }, { sfx: 'talk' }] },
    ],
    'br-maren-again': [
      { who: 'maren', text: 'The sorter, dear — yes or no, and each answer halves the pile.' },
      { who: 'maren', text: 'Up the path when you have sorted it. Mind the bushes.' },
      { choice: [
        { label: 'What did you mean, "halves the pile"?', goto: 'br-maren-half' },
        { label: 'On my way.', end: true },
      ] },
    ],
    'br-maren-half': [
      { who: 'maren', text: 'Four addressees. One good yes/no, and two are gone. Just like that.' },
      { who: 'maren', text: 'Another, and one remains. Two questions, four sorted. Tidy, no?' },
      { who: 'maren', text: 'That "one is gone or stays" — Dr. Shannon calls it a bit. Ask HIM.' },
      { end: true },
    ],
    /* side-quest return: player carries the found beach letter back to Maren */
    'br-maren-letter': [
      { who: 'maren', text: 'Is that... my second-post bag? You found it on the sand!' },
      { who: 'pip', text: 'Tucked under a gull, near the dock. It is a bit chewed.' },
      { who: 'maren', text: 'Bless your gears. I thought that one lost for good. Here — take this.' },
      { who: 'maren', text: 'A spark from the old switchboard. They are worth keeping. Truly.' },
      { actions: [{ give: 'spark' }, { set: 'br.lostletter.done' }, { sfx: 'spark' }] },
    ],
    /* postgame flavor */
    'br-maren-post': [
      { who: 'maren', text: 'The whole network, lit again. I have not sorted this much post in years!' },
      { who: 'maren', text: 'Come back any time, courier. The kettle is always warm.' },
      { end: true },
    ],

    /* mid-progress: sorter fixed, scales still crooked (before br.done) */
    'br-maren-mid': [
      { who: 'maren', text: 'You got the old sorter clicking again! I heard it from here. Lovely sound.' },
      { who: 'maren', text: 'The keeper will have you at the scales next. Nine coins, one light — fiddly.' },
      { who: 'maren', text: 'Weigh true and the ferry sails. Then the light. Then, dare I say it, MAIL.' },
      { end: true },
    ],

    /* post-completion: the beacon is lit (br.done) */
    'br-maren-done': [
      { who: 'maren', text: 'The light is BACK. I saw it sweep the cove and I dropped a whole tray.' },
      { who: 'maren', text: 'You lit it with yes and no, dear. Just questions, asked well. Click-click.' },
      { choice: [
        { label: 'What happens now?', goto: 'br-maren-done2' },
        { label: 'On to the next island.', end: true },
      ] },
    ],
    'br-maren-done2': [
      { who: 'maren', text: 'Now? Now the next dock down the chain can see us. And we can see them.' },
      { who: 'maren', text: 'One light at a time, courier. Go wake the rest of them.' },
      { end: true },
    ],

    /* ---------- SIDE QUEST: the smudged letter (optional) ---------- */
    /* Offered after meeting Maren. Pip must deduce the addressee from clues
       gathered by talking to the crab and turtle, then deliver to Dr. Shannon.
       No spark — the reward is the payoff + an unlocked field note. */
    'br-maren-sq1-offer': [
      { who: 'maren', text: 'Before you climb — one nuisance. A letter the seawater near ruined.' },
      { who: 'maren', text: 'The name ran right off it. All that is left is the WORDS inside.' },
      { who: 'maren', text: '"By your lamp, in your slanted hand — keep the long watch for us all."' },
      { who: 'maren', text: 'I cannot read who it is FOR. But you are a courier. Puzzle it out?' },
      { choice: [
        { label: 'I will find the addressee.', goto: 'br-maren-sq1-take' },
        { label: 'Maybe later.', end: true },
      ] },
    ],
    'br-maren-sq1-take': [
      { who: 'maren', text: 'Bless you. Ask around — the crab and the old turtle know everyone.' },
      { who: 'maren', text: 'Whoever the clues fit, hand it to them. The letter wants its reader.' },
      { actions: [{ set: 'br.sq1.start' }, { sfx: 'talk' }] },
    ],
    /* if Pip re-talks before gathering clues */
    'br-maren-sq1-ask': [
      { who: 'maren', text: 'The smudged letter, dear. "By your lamp, in your slanted hand."' },
      { who: 'maren', text: 'Ask the crab and the turtle who that sounds like. Then deliver it.' },
      { end: true },
    ],
    /* both clues gathered — Maren confirms the deduction */
    'br-maren-sq1-clues': [
      { who: 'maren', text: 'A lamp. A slanted hand. The long watch. Goodness — who else but the keeper?' },
      { who: 'maren', text: 'Take it UP the hill to Dr. Shannon. That letter has been waiting for him.' },
      { end: true },
    ],

    /* ---------- Dr. Shannon ---------- */

    /* ---------- Dr. Shannon ---------- */
    'br-shannon-1': [
      { who: 'shannon', text: 'Hoo. A courier. On foot. I had stopped expecting them.' },
      { who: 'pip', text: 'One letter, very soggy, for Dr. Shannon. That would be you?' },
      { who: 'shannon', text: 'It would. Hand it here... ah. The old hand. Thank you, small one.' },
      { actions: [{ set: 'br.letter.delivered' }, { sfx: 'good' }] },
      { who: 'shannon', text: 'You sorted the gate to reach me. You already know the trick, then.' },
      { choice: [
        { ifFlag: 'br.sq1.ready', ifNotFlag: 'br.sq1.done', label: 'Actually — one more letter.', goto: 'br-shannon-sq1' },
        { label: 'What IS a bit, really?', goto: 'br-shannon-bits' },
        { label: 'Maren said you would explain.', goto: 'br-shannon-bits' },
        { label: 'Just doing my round.', goto: 'br-shannon-task' },
      ] },
    ],
    'br-shannon-bits': [
      { who: 'shannon', text: 'A bit is the answer to one good yes/no question. Nothing grander.' },
      { who: 'shannon', text: 'Four doors, one key. "Left half?" — yes or no — and two doors close.' },
      { who: 'shannon', text: 'Each clean yes/no halves what is left. That halving IS one bit. Hoo.' },
      { goto: 'br-shannon-task' },
    ],
    'br-shannon-task': [
      { who: 'shannon', text: 'Before any ferry sails, the harbor scales must agree the ballast is true.' },
      { who: 'shannon', text: 'Nine coins down by the dock. One was shaved light. Find it.' },
      { who: 'shannon', text: 'A weighing has three answers — left, right, level. More than a bit each.' },
      { who: 'pip', text: 'I will weigh them and come back.' },
      { actions: [{ sfx: 'talk' }] },
    ],
    'br-shannon-wait': [
      { who: 'shannon', text: 'The scales, small one. Nine coins, one light. The ferry waits on them.' },
      { choice: [
        { ifFlag: 'br.sq1.ready', ifNotFlag: 'br.sq1.done', label: 'A nameless letter, first.', goto: 'br-shannon-sq1' },
        { label: 'Why three answers per weighing?', goto: 'br-shannon-scaleshint' },
        { label: 'Going now.', end: true },
      ] },
    ],
    'br-shannon-scaleshint': [
      { who: 'shannon', text: 'Left-heavy, right-heavy, or level. Three outcomes, not two.' },
      { who: 'shannon', text: 'So one weighing tells you more than one yes/no — about a bit and a half.' },
      { who: 'shannon', text: 'Three outcomes, twice: nine coins, sorted. The numbers are kind here.' },
      { end: true },
    ],
    'br-shannon-light': [
      { who: 'shannon', text: 'Balanced. Good. The ferry can be trusted, and so can you.' },
      { who: 'shannon', text: 'Then let us wake the light. Stand back from the base, small one.' },
      { actions: [{ sfx: 'beacon' }, { quake: 500 }, { wait: 300 }, { set: 'br.done' } ] },
      { who: 'shannon', text: 'Hoo. There. The first lamp in the chain, lit by a courier.' },
      { who: 'shannon', text: 'Gull will run you on to the next island now. Go and relight them all.' },
    ],
    'br-shannon-done': [
      { who: 'shannon', text: 'The light holds. Steady as you go, courier. The chain is long.' },
      { choice: [
        { ifFlag: 'br.sq1.ready', ifNotFlag: 'br.sq1.done', label: 'I have a letter with no name.', goto: 'br-shannon-sq1' },
        { label: 'Any advice for the road?', goto: 'br-shannon-advice' },
        { label: 'Goodbye, keeper.', end: true },
      ] },
    ],
    'br-shannon-advice': [
      { who: 'shannon', text: 'Every dark thing out there is a question someone stopped asking.' },
      { who: 'shannon', text: 'Ask the yes/no that halves the most. The lights will follow.' },
      { end: true },
    ],
    'br-shannon-post': [
      { who: 'shannon', text: 'The whole archipelago, alight. I have waited a long time to see this. Hoo.' },
      { who: 'shannon', text: 'You composed the whole lesson to do it. I am... quietly delighted.' },
      { end: true },
    ],

    /* ---------- Ferryman Gull ---------- */
    'br-gull-wait': [
      { who: 'gull', text: 'Boat is here. We do not move till the keeper lights the lamp.' },
      { who: 'gull', text: 'Network rule. Dark dock, no sailing. Talk to Shannon.' },
    ],
    'br-gull-ready': [
      { who: 'gull', text: 'Lamp is lit. Tide is fair. Step on the boards when you are ready.' },
      { who: 'gull', text: 'Next stop, the Dunes. Watch the fox. She keeps the odd things.' },
    ],

    /* ---------- villagers (reward talking) ---------- */
    'br-turtle': [
      { who: 'turtle', text: 'Slow morning. Then again, every morning is, for me.' },
      { who: 'turtle', text: 'See the corner of the screen? That little hint up top tells you what to do next.' },
    ],
    /* side-quest clue from the turtle */
    'br-turtle-sq1': [
      { who: 'turtle', text: 'A letter with no name? Read me the words. ..."keep the long watch."' },
      { who: 'turtle', text: 'Hm. Only one soul here keeps a watch all night, and never sleeps for it.' },
      { who: 'turtle', text: 'The one on the bluff. Always awake, always squinting at the dark.' },
      { actions: [{ set: 'br.sq1.clue-turtle' }, { sfx: 'talk' }] },
      { ifFlag: 'br.sq1.clue-crab', actions: [{ set: 'br.sq1.ready' }] },
    ],
    'br-turtle-done': [
      { who: 'turtle', text: 'The light went round the cove last night. Woke me. I did not mind.' },
      { who: 'turtle', text: 'Slow and steady wins, courier. You are neither, but you won anyway.' },
    ],
    'br-crab': [
      { who: 'crab', text: 'Click! That east door is the dead-letter office. Eight lost names in there.' },
      { who: 'crab', text: 'Crack it and they give you a spark. Three good questions is all it takes.' },
    ],
    /* side-quest clue from the crab */
    'br-crab-sq1': [
      { who: 'crab', text: 'The smudged one? Click. Show me the clues, courier.' },
      { who: 'crab', text: '"By your lamp." "Your slanted hand." That is somebody who WRITES, and reads late.' },
      { who: 'crab', text: 'A lamp-keeper, then. We have exactly one of those, up the hill.' },
      { actions: [{ set: 'br.sq1.clue-crab' }, { sfx: 'talk' }] },
      { ifFlag: 'br.sq1.clue-turtle', actions: [{ set: 'br.sq1.ready' }] },
    ],
    'br-crab-done': [
      { who: 'crab', text: 'Click-click! The dead-letter pile can move again now the light is up.' },
      { who: 'crab', text: 'You ask a fine yes/no, courier. Come crack our door before you sail.' },
    ],
    'br-gullsmall': [
      { who: 'gullsmall', text: 'You smell like seawater and far-off sand.' },
      { who: 'gullsmall', text: 'The Dunes are next, across the water. Surprising place, they say. You will see.' },
    ],
    'br-gullsmall-done': [
      { who: 'gullsmall', text: 'The big lamp is ON! I can see my shadow on the water. Look at me!' },
      { who: 'gullsmall', text: 'Are you sailing now? Bring me back something surprising from the Dunes.' },
    ],

    /* side-quest delivery: handed to Dr. Shannon (reached via a conditional
       choice in his dialogues, only shown when br.sq1.ready and not done) */
    'br-shannon-sq1': [
      { who: 'pip', text: 'One more, keeper. No name on it — only the words inside.' },
      { who: 'shannon', text: '"By your lamp, in your slanted hand... keep the long watch for us all."' },
      { who: 'shannon', text: 'Hoo. That is my own hand. I posted this — to MYSELF — the night the lights died.' },
      { who: 'shannon', text: 'A reminder, in case I forgot why I sit up here. The sea sent it back to me.' },
      { who: 'shannon', text: 'You read a letter that had lost its name, small one. From its words alone.' },
      { who: 'shannon', text: 'That is the whole craft: meaning survives even when the address is washed away.' },
      { actions: [{ set: 'br.sq1.done' }, { sfx: 'solve' }] },
    ],
  },
});

/* ---------------- codex lore (Pip's field notes for Beacon Rock) ----------------
   Registered at load time; codex.js loads before islands. Each is kind:'lore',
   island:'beacon-rock', and unlocks on a br.* flag. */
if (G.codex && G.codex.register) {
  /* unlocked by finding the lost beach bag (existing minor item flag) */
  G.codex.register({
    id: 'lore.br.dead-letters', kind: 'lore', island: 'beacon-rock',
    title: 'The dead-letter office',
    body: 'Maren keeps a back room of letters no one could place — names blurred, ' +
      'islands sunk off the map, readers long gone. She will not burn a single one. ' +
      '"A letter is a question," she says, "and a question deserves an answer, even ' +
      'a late one." The pile only grew once the beacons went dark.',
    unlock: 'br.lostletter.got',
    hint: 'Recover Maren\'s lost second-post bag from the cove beach.',
  });

  /* unlocked by the optional side quest (the smudged, nameless letter) */
  G.codex.register({
    id: 'lore.br.nameless', kind: 'lore', island: 'beacon-rock',
    title: 'The letter that addressed itself',
    body: 'Its name had washed clean away, yet the words inside still pointed home: ' +
      'a lamp, a slanted hand, a long night watch. Only one reader fit them all. ' +
      'A message can carry its own address in its meaning — strip the label and the ' +
      'content still says who it is for, if you read it closely enough.',
    unlock: 'br.sq1.done',
    hint: 'Read the smudged letter\'s clues, then deliver it to whom they fit.',
  });

  /* unlocked when the first beacon is relit (br.done) */
  G.codex.register({
    id: 'lore.br.quiet', kind: 'lore', island: 'beacon-rock',
    title: 'Why the network went quiet',
    body: 'The beacons were never just lamps — each one relayed the next, a chain of ' +
      'signals hopping island to island. When one failed, its neighbor had nothing to ' +
      'repeat, and the silence spread outward like a tide going out. No single light ' +
      'broke; the <i>connections</i> did. Relight them in order and the whole chain ' +
      'remembers how to speak.',
    unlock: 'br.done',
    hint: 'Light the Beacon Rock lamp with Dr. Shannon.',
  });
}

})();
