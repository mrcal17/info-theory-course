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
      dialogue: 'br-turtle' },

    /* the harbor scales — a door near the dock; ferry won't sail unbalanced */
    { id: 'br-scales', type: 'door', x: 18, y: 28, sprite: 'gate',
      puzzle: { type: 'scales', config: { coins: 9, odd: 'light', weighings: 2 } },
      flag: 'br.scales.done', sparks: 0, ifNotFlag: 'br.scales.done',
      lockedText: 'The ballast scales. Nine coins, one shaved light.' },
    { id: 'br-sign-scales', type: 'sign', x: 20, y: 27,
      text: ['THE HARBOR SCALES', 'No ferry sails on crooked ballast.'] },

    /* ---------- the village square (middle) ---------- */
    { id: 'br-sign-square', type: 'sign', x: 11, y: 21,
      text: 'COVE SQUARE — post office west, dead letters east.' },

    /* Maren's post office (west building, doorway at x=10,y=18). She stands
       at her counter on the grass just south of the door. */
    { id: 'br-maren', type: 'npc', x: 10, y: 16, sprite: 'maren', name: 'Maren', dir: 's',
      dialogue: [
        { ifFlag: 'game.finished', use: 'br-maren-post' },
        { ifFlag: 'br.lostletter.got', ifNotFlag: 'br.lostletter.done', use: 'br-maren-letter' },
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

    { id: 'br-villager-crab', type: 'npc', x: 31, y: 16, sprite: 'crab', wander: true,
      dialogue: 'br-crab' },

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
      dialogue: 'br-gullsmall' },

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

    /* ---------- Dr. Shannon ---------- */
    'br-shannon-1': [
      { who: 'shannon', text: 'Hoo. A courier. On foot. I had stopped expecting them.' },
      { who: 'pip', text: 'One letter, very soggy, for Dr. Shannon. That would be you?' },
      { who: 'shannon', text: 'It would. Hand it here... ah. The old hand. Thank you, small one.' },
      { actions: [{ set: 'br.letter.delivered' }, { sfx: 'good' }] },
      { who: 'shannon', text: 'You sorted the gate to reach me. You already know the trick, then.' },
      { choice: [
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
    'br-crab': [
      { who: 'crab', text: 'Click! That east door is the dead-letter office. Eight lost names in there.' },
      { who: 'crab', text: 'Crack it and they give you a spark. Three good questions is all it takes.' },
    ],
    'br-gullsmall': [
      { who: 'gullsmall', text: 'You smell like seawater and far-off sand.' },
      { who: 'gullsmall', text: 'The Dunes are next, across the water. Surprising place, they say. You will see.' },
    ],
  },
});

})();
