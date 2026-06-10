/* THE QUIET ARCHIPELAGO — Island 5: Echo Caverns.
   Teaches compression: repetition = compressibility (LZ dictionaries) and the
   incompressibility of randomness. Lem & Ziv, the sentence-finishing mole twins,
   dig by pattern. Two stamp-carver gates (a repeating gallery, then the
   Patternless Vault), plus three sparks. Dark cave; crystals light the way.
   Flag prefix: ec. */
(function () {
'use strict';

G.islands.register({
  id: 'caverns', name: 'Echo Caverns', order: 5,
  palette: 'cave', music: 'caverns',
  /* 52x35. Flow: dock grotto (NW) --corridor--> [GATE A] --> Great Rotunda
     (relay + echo quest) --S--> dig camp (Lem & Ziv) --> [GATE B -> Patternless
     Vault]; off the rotunda --E--> [GATE DEEP -> Deep Gallery, spark]. Crystals
     '*' light the main route; the dark pocket (SW of camp) is left unlit so the
     hidden spark hides in the dark. '=' bridges span '~' water in the grotto. */
  map: `
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CCC~~~~~~~CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CC~~~=~~~~~CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CC~-%=%%%%-CCCCCC%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCC
CC~-%*%%%*%-CCCC%%%%%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCC
CC~-%%%%%%%-CCC%%%%%%%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCC
CC~-%%%%%%%+%%%%%%%%%%%*%%%%%%%%%%%%CCCCCCCCCCCCCCCC
CC~-%*%%%%%-CCC%%%%%%%%%%%%%%%%%%%%+CCCCCCCCCCCCCCCC
CC~-%%%%%%%-CCC%%%%%%%%%%%%%%%%%%%%CC%%%%%%%%CCCCCCC
CC~~--%%--~CCCC%%%%%%%%%%%%*%%%%%%%CC%%%%%%%%CCCCCCC
CCCC~~~~~~CCCCC%%%%%%%%*%%%%%%%%%%%+%%%*%%%*%CCCCCCC
CCCCCCCCCCCCCCC%%%%%%%%%%%%%%%%%%%%CC%%%%%%%%CCCCCCC
CCCCCCCCCCCCCCCC%%%%%%%%%%%%%%%%%%CCCC%%%%%%%CCCCCCC
CCCCCCCCCCCCCCCCC%%%%%%%%%%%%%%%%CCCCC%%*%%%%CCCCCCC
CCCCCCCCCCCCCCCCCCC%%%%%%%%%%%%CCCCCCCC%%%%%%CCCCCCC
CCCCCCCCCCCCCCCCCCCCCCC%%%%CCCCCCCCCCCCC%%%%CCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCC%%%%CCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCC%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCC%%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCC
CCCCCCCC%%%%%%%C%%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCC
CCCCCCCC%%%%%%%C%%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCC
CCCCCCCC%%%%%%%+%%*%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCC
CCCCCCCC%%%%%%%C%%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCC
CCCCCCCC%%%%%%%C%%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCC
CCCCCCCC%%%%%%%C%%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCC
CCCCCCCCC%%%%%CC%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCC%%%%%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCC%%%%%%%%%%CCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCC%+%CCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCC%%%%%CCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCC%%%%%CCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCC%%%CCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
`,
  spawn: { x: 6, y: 5 },
  entities: [
    /* ---- dock grotto: boat, ferry portals, ferry gull ---- */
    { id: 'ec-boat', type: 'prop', x: 6, y: 8, sprite: 'boat', solid: false },
    { id: 'ec-back-portal', type: 'portal', x: 5, y: 3, to: 'strait', at: { x: 12, y: 6 } },
    { id: 'ec-fwd-portal', type: 'portal', x: 8, y: 3, to: 'spires', at: { x: 6, y: 6 },
      requiresFlag: 'ec.done',
      deniedDialogue: [{ who: 'gull', text: 'No crossing yet — the relay\'s dark. Seal the gallery AND the vault first.' }] },
    { id: 'ec-gull', type: 'npc', x: 7, y: 3, sprite: 'gull', dialogue: 'ec-gull-talk' },

    /* ---- GATE A: First Gallery, the grotto's only exit east ---- */
    { id: 'ec-plaque-1', type: 'sign', x: 15, y: 5,
      text: 'THE LONG HALL OF MOSO MOSO MOSO — see? we only carved it once.' },
    { id: 'ec-gate-a', type: 'door', x: 11, y: 6, sprite: 'runedoor',
      puzzle: { type: 'stamp-carver', config: { pattern: 'mosomosomosokmoso', parCost: 10 } },
      flag: 'ec.gallery1.done', sparks: 0, ifNotFlag: 'ec.gallery1.done',
      lockedText: 'The gallery wall repeats: moso moso moso. Carve the repeat once; press it each time.' },

    /* ---- Great Rotunda: relay + echo side-quest ---- */
    { id: 'ec-relay-off', type: 'prop', x: 22, y: 8, sprite: 'beacon-off', ifNotFlag: 'ec.done' },
    { id: 'ec-relay-on', type: 'prop', x: 22, y: 8, sprite: 'beacon-on', ifFlag: 'ec.done' },
    { id: 'ec-relay-sign', type: 'sign', x: 20, y: 8,
      text: 'CAVERN RELAY. Wakes when the First Gallery and the Patternless Vault are both sealed.' },
    { id: 'ec-echo-keeper', type: 'npc', x: 28, y: 11, sprite: 'turtle',
      dialogue: [
        { ifFlag: 'ec.echo.done', use: 'ec-keeper-done' },
        { ifFlag: 'ec.echo.heard', use: 'ec-keeper-count' },
        { use: 'ec-keeper-ask' },
      ] },
    { id: 'ec-echo-trigger', type: 'trigger', x: 24, y: 9,
      flag: 'ec.echo.heard',
      actions: [{ sfx: 'talk' }, { goto: 'ec-echo-echoes' }] },

    /* ---- SIDE QUEST (ec.sq1.*): the twins' echo survey. Three marked listening
       posts ring the rotunda; the player interacts to "listen". Two chambers
       echo back a repeat (compressible); one — the deep east shelf — answers
       only once (incompressible). Report the silent one to Lem & Ziv. The posts
       are props so interact runs their dialogue (which sets the spot flag). ---- */
    { id: 'ec-survey-sign', type: 'sign', x: 16, y: 7,
      text: ['ECHO SURVEY (Lem & Ziv): listen at all three carved posts.',
             'Two halls hand your call back; one keeps it. Find the hall that does not repeat.'] },
    { id: 'ec-post-north', type: 'prop', x: 28, y: 5, sprite: 'sign',
      dialogue: [
        { ifFlag: 'ec.sq1.done', use: 'ec-post-north-done' },
        { use: 'ec-post-north-listen' },
      ] },
    { id: 'ec-post-west', type: 'prop', x: 19, y: 9, sprite: 'sign',
      dialogue: [
        { ifFlag: 'ec.sq1.done', use: 'ec-post-west-done' },
        { use: 'ec-post-west-listen' },
      ] },
    { id: 'ec-post-east', type: 'prop', x: 31, y: 13, sprite: 'sign',
      dialogue: [
        { ifFlag: 'ec.sq1.done', use: 'ec-post-east-done' },
        { use: 'ec-post-east-listen' },
      ] },

    /* ---- relay-waker: exists only after the VAULT is sealed; its set fires
       only when the GALLERY is also sealed. No once-flag, so it re-fires
       harmlessly until both are true, regardless of completion order. The tile
       (11,6) is the rotunda mouth — the player always crosses it. ---- */
    { id: 'ec-done-trigger', type: 'trigger', x: 12, y: 6, ifFlag: 'ec.vault.done',
      actions: [{ ifFlag: 'ec.gallery1.done', set: 'ec.done' }] },

    /* ---- ambient flavor: glyph fragments, a stamp rack, echo warnings ---- */
    { id: 'ec-glyph-frag', type: 'sign', x: 17, y: 12,
      text: 'A glyph fragment, chiselled then abandoned: "MO— MO— (rest worn away)".' },
    { id: 'ec-stamp-rack', type: 'prop', x: 31, y: 5, sprite: 'stamp', solid: true,
      text: 'A rack of finished stamps, each a hallway carved once. The diggers re-press, never re-carve.' },
    { id: 'ec-echo-warn', type: 'sign', x: 24, y: 13,
      text: 'CAUTION: the rotunda answers thrice. Do not mistake a copy for fresh news.' },

    /* ---- GATE DEEP: mastery door (spark 1), off the rotunda's east wall ---- */
    { id: 'ec-plaque-deep', type: 'sign', x: 33, y: 11,
      text: 'DEEP GALLERY — NANANANANA. one long stamp beats two short ones.' },
    { id: 'ec-gate-deep', type: 'door', x: 34, y: 10, sprite: 'runedoor',
      puzzle: { type: 'stamp-carver', config: { pattern: 'nananananabnananana', parCost: 11 } },
      flag: 'ec.deep.done', sparks: 1, ifNotFlag: 'ec.deep.done',
      lockedText: 'A tighter wall: nananananabnananana. Carve the whole refrain once — press it again and again.' },

    /* ---- Lem & Ziv's dig camp (central lower room) ---- */
    /* Both twins share one selector. Order = most-specific first (first match
       wins). The side-quest branches (ec.sq1.*) sit above the main-progress
       branches but only resolve while the survey is live and unfinished. */
    { id: 'ec-lem', type: 'npc', x: 20, y: 22, sprite: 'lem',
      dialogue: [
        { ifFlag: 'game.finished', use: 'ec-twins-postgame' },
        { ifFlag: 'ec.done', use: 'ec-twins-done' },
        { ifFlag: 'ec.sq1.start', use: 'ec-twins-sq1' },
        { ifFlag: 'ec.deep.done', use: 'ec-twins-deep-done' },
        { ifFlag: 'ec.vault.done', use: 'ec-twins-vault-done' },
        { ifFlag: 'ec.gallery1.done', use: 'ec-twins-vault-set' },
        { ifFlag: 'ec.met-twins', use: 'ec-twins-again' },
        { use: 'ec-twins-meet' },
      ] },
    { id: 'ec-ziv', type: 'npc', x: 22, y: 22, sprite: 'ziv',
      dialogue: [
        { ifFlag: 'game.finished', use: 'ec-twins-postgame' },
        { ifFlag: 'ec.done', use: 'ec-twins-done' },
        { ifFlag: 'ec.sq1.start', use: 'ec-twins-sq1' },
        { ifFlag: 'ec.deep.done', use: 'ec-twins-deep-done' },
        { ifFlag: 'ec.vault.done', use: 'ec-twins-vault-done' },
        { ifFlag: 'ec.gallery1.done', use: 'ec-twins-vault-set' },
        { ifFlag: 'ec.met-twins', use: 'ec-twins-again' },
        { use: 'ec-twins-meet' },
      ] },
    { id: 'ec-camp-sign', type: 'sign', x: 25, y: 22,
      text: ['DIG LOG: corridor 12 = corridor 11 (a stamp, no fresh chisels).',
             'A second copy of a hallway is free. Carve it once; reference it.'] },
    { id: 'ec-crab', type: 'npc', x: 26, y: 24, sprite: 'crab', dialogue: 'ec-crab-talk' },

    /* ---- GATE B: Patternless Vault, the camp's west door ---- */
    { id: 'ec-vault-sign', type: 'sign', x: 18, y: 20,
      text: ['THE PATTERNLESS VAULT — fourteen marks, no two stretches alike.',
             'The final exam: when there is nothing to repeat, do not lie about it.'] },
    { id: 'ec-gate-b', type: 'door', x: 15, y: 21, sprite: 'runedoor',
      puzzle: { type: 'stamp-carver', config: { pattern: 'bqvkfjwzdnxgpm', parCost: 9, incompressible: true } },
      flag: 'ec.vault.done', sparks: 0, ifNotFlag: 'ec.vault.done',
      lockedText: 'Fourteen marks, no repeat anywhere. Carve, fail, then pull the lever.' },

    /* ---- hidden spark in the unlit pocket below camp (NO crystals — dark is the hint) ---- */
    { id: 'ec-dark-sign', type: 'sign', x: 23, y: 27,
      text: 'the cave keeps its plainest pocket unlit.' },
    { id: 'ec-hidden-spark', type: 'item', x: 24, y: 30, gives: 'spark',
      flag: 'ec.darkspark.got', ifNotFlag: 'ec.darkspark.got' },
  ],

  objectives: [
    { flag: 'ec.gallery1.done', hint: 'Open the First Gallery: read the MOSO plaque, then carve the repeat once.' },
    { flag: 'ec.met-twins',     hint: 'Meet the diggers, Lem & Ziv, at the camp below the rotunda.' },
    { flag: 'ec.echo.done',     hint: 'The Echo Keeper wants the rotunda echoes counted.' },
    { flag: 'ec.vault.done',    hint: 'Face the Patternless Vault, west of camp. Some things cannot be compressed.' },
    { flag: 'ec.done',          hint: 'Gallery and vault both sealed — cross the rotunda to wake the relay.' },
  ],

  dialogues: {
    /* ---- onEnter intro (echoes; runs once, sets ec.intro on its last step) ---- */
    'ec-onenter-intro': [
      { who: 'pip', text: '(Pip steps off the boat. A pebble drops — drip… drip… drip.)' },
      { who: 'pip', text: 'Even the cave repeats itself.' },
      { who: 'pip', text: 'Every sound comes back three times down here. Three copies; one message.' },
      { actions: [{ set: 'ec.intro' }] },
    ],

    /* ---- Echo Keeper turtle ---- */
    'ec-echo-echoes': [
      { who: 'turtle', text: '(…count… count… count…) the rotunda answers everything thrice.' },
    ],
    'ec-keeper-ask': [
      { who: 'turtle', text: 'I am the Echo Keeper. Stand in the rotunda; tell me how many echoes return.' },
      { who: 'pip', text: 'Every call comes back three times.' },
      { who: 'turtle', text: 'Then go and hear it, little courier. Then come back and tell me.' },
    ],
    'ec-keeper-count': [
      { who: 'pip', text: 'Three. Every sound returns three times.' },
      { who: 'turtle', text: 'Three. And do the second and third copies tell you anything new?' },
      { who: 'pip', text: 'No — once I have the first, the rest are predictable.' },
      { who: 'turtle', text: 'A repeated signal carries no new information. Take this for knowing it.' },
      { actions: [{ set: 'ec.echo.done' }, { give: 'spark' }, { sfx: 'spark' }] },
    ],
    'ec-keeper-done': [
      { who: 'turtle', text: 'Echo, echo, echo. You already heard all there was to hear the first time.' },
    ],

    /* ---- Lem & Ziv (mole twins; alternating half-lines is their voice) ---- */
    'ec-twins-meet': [
      { who: 'lem', text: '"oh — a courier, down here in the—"' },
      { who: 'ziv', text: '"—dark, yes, mind the tailings, we dig by—"' },
      { who: 'lem', text: '"—pattern. why carve the same hallway—"' },
      { who: 'ziv', text: '"—twice, when once and a stamp will do?"' },
      { who: 'lem', text: '"i\'m Lem. that\'s—"' },
      { who: 'ziv', text: '"—Ziv. you\'ll learn our trick at the galleries up top."' },
      { actions: [{ set: 'ec.met-twins' }, { sfx: 'talk' }] },
    ],
    'ec-twins-again': [
      { who: 'lem', text: '"see a repeat, carve a stamp—"' },
      { who: 'ziv', text: '"—press it each time it comes back. that\'s the whole job."' },
      { ifNotFlag: 'ec.sq1.done', who: 'lem', text: '"oh — do us a favour? we ran an echo survey of the—"' },
      { ifNotFlag: 'ec.sq1.done', who: 'ziv', text: '"—rotunda. three carved posts. listen at each, then tell us which hall did NOT repeat."' },
    ],
    'ec-twins-vault-set': [
      { who: 'lem', text: '"gallery\'s open — good. now the hard one, the—"' },
      { who: 'ziv', text: '"—Patternless Vault, west of camp. fourteen marks, no—"' },
      { who: 'lem', text: '"—repeat anywhere. you\'ll try to stamp it and—"' },
      { who: 'ziv', text: '"—fail, and that failing IS the answer. pull the lever."' },
    ],
    'ec-twins-postgame': [
      { who: 'lem', text: '"network\'s lit again. and we never carved the same beam—"' },
      { who: 'ziv', text: '"—twice. waste not, courier. waste not."' },
    ],

    /* ---- post-completion: gallery AND vault both sealed (ec.done), before the
       finale. Two split-sentence variants so the twins stay in voice. ---- */
    'ec-twins-done': [
      { ifNotFlag: 'ec.deep.done', who: 'lem', text: '"relay\'s lit — felt the hum from down here. you sealed the long hall and the—"' },
      { ifNotFlag: 'ec.deep.done', who: 'ziv', text: '"—Patternless Vault. one repeats, one refuses. you read them both right."' },
      { ifFlag: 'ec.deep.done', who: 'lem', text: '"gallery, vault, AND the deep wall — the whole cavern hums now. you carve like a—"' },
      { ifFlag: 'ec.deep.done', who: 'ziv', text: '"—mole, courier. high praise. now go, the Spires won\'t carve themselves."' },
      { who: 'lem', text: '"remember the rule, wherever the boat takes you—"' },
      { who: 'ziv', text: '"—see a repeat, carve it once. that\'s the whole of it."' },
    ],

    /* ---- mid-progress: vault sealed but the deep gallery still uncarved ---- */
    'ec-twins-vault-done': [
      { who: 'lem', text: '"you sealed the vault. some things are exactly as long—"' },
      { who: 'ziv', text: '"—as themselves. that\'s how you know they\'re full."' },
      { ifNotFlag: 'ec.deep.done', who: 'lem', text: '"one wall left, if you\'re greedy — the Deep Gallery, off the—"' },
      { ifNotFlag: 'ec.deep.done', who: 'ziv', text: '"—rotunda\'s east. NANANANA, a stamp tucked inside a stamp. tighter than tight."' },
    ],
    'ec-twins-deep-done': [
      { who: 'lem', text: '"the deep wall too! a stamp inside a stamp — you found the—"' },
      { who: 'ziv', text: '"—nesting. that\'s the spark you\'re holding. now just wake the relay."' },
    ],

    /* ---- SIDE QUEST dialogues (ec.sq1.*) ---- */
    'ec-twins-sq1': [
      /* not all three heard yet: nudge */
      { ifNotFlag: 'ec.sq1.heardN', who: 'lem', text: '"survey\'s not done — three posts ring the rotunda, you\'ve missed—"' },
      { ifNotFlag: 'ec.sq1.heardN', who: 'ziv', text: '"—the north shelf. stand at the carved post and listen."' },
      { ifFlag: 'ec.sq1.heardN', ifNotFlag: 'ec.sq1.heardW', who: 'lem', text: '"north\'s logged. still need the—"' },
      { ifFlag: 'ec.sq1.heardN', ifNotFlag: 'ec.sq1.heardW', who: 'ziv', text: '"—west post. go on, we\'ll wait."' },
      { ifFlag: 'ec.sq1.heardW', ifNotFlag: 'ec.sq1.heardE', who: 'lem', text: '"two down. the deep east shelf\'s the last—"' },
      { ifFlag: 'ec.sq1.heardW', ifNotFlag: 'ec.sq1.heardE', who: 'ziv', text: '"—post. listen close out there. it\'s a strange one."' },
      /* all three heard: ask which hall did NOT repeat */
      { ifFlag: 'ec.sq1.heardE', who: 'lem', text: '"all three posts logged! so — which hall kept your call—"' },
      { ifFlag: 'ec.sq1.heardE', who: 'ziv', text: '"—instead of handing it back? the one that did NOT repeat."' },
      { ifFlag: 'ec.sq1.heardE', choice: [
        { label: 'The north shelf.', goto: 'ec-sq1-wrong' },
        { label: 'The west post.', goto: 'ec-sq1-wrong' },
        { label: 'The deep east shelf.', goto: 'ec-sq1-right' },
      ] },
    ],
    'ec-sq1-wrong': [
      { who: 'lem', text: '"no — that one came back. you HEARD it twice. think which—"' },
      { who: 'ziv', text: '"—had nothing to give back. listen again if you must."' },
    ],
    'ec-sq1-right': [
      { who: 'lem', text: '"the deep east! right. it answered once and kept the rest—"' },
      { who: 'ziv', text: '"—because there was no pattern in it to echo. nothing to repeat."' },
      { who: 'lem', text: '"a hall with no repeat can\'t be carved short. that\'s the—"' },
      { who: 'ziv', text: '"—incompressible one. like the vault." (Lem rounds on Ziv.) "—which YOU mismarked on the map—"' },
      { who: 'lem', text: '"—I mismarked? you\'re the one who chiselled the post facing the wrong—"' },
      { who: 'ziv', text: '"—wall! ...ahem. take this for settling it, courier."' },
      { actions: [{ set: 'ec.sq1.done' }, { clear: 'ec.sq1.start' }, { sfx: 'spark' }] },
    ],

    /* ---- listening posts (props; interact = "listen"). Two echo, one is silent ---- */
    'ec-post-north-listen': [
      { who: 'sign', text: '(you call into the north shelf) — north shelf… north shelf… north shelf…' },
      { who: 'pip', text: 'It came back. A repeat — I only needed the first.' },
      { actions: [{ set: 'ec.sq1.start' }, { set: 'ec.sq1.heardN' }, { sfx: 'talk' }] },
    ],
    'ec-post-west-listen': [
      { who: 'sign', text: '(you call into the west hall) — west hall… west hall… west hall…' },
      { who: 'pip', text: 'Three copies again. Nothing new after the first.' },
      { actions: [{ set: 'ec.sq1.start' }, { set: 'ec.sq1.heardW' }, { sfx: 'talk' }] },
    ],
    'ec-post-east-listen': [
      { who: 'sign', text: '(you call into the deep east shelf) — …east shelf.' },
      { who: 'pip', text: 'Just once. No echo. This hall keeps everything it is.' },
      { actions: [{ set: 'ec.sq1.start' }, { set: 'ec.sq1.heardE' }, { sfx: 'talk' }] },
    ],
    'ec-post-north-done': [
      { who: 'sign', text: 'north shelf… north shelf… north shelf… (logged: repeats).' },
    ],
    'ec-post-west-done': [
      { who: 'sign', text: 'west hall… west hall… west hall… (logged: repeats).' },
    ],
    'ec-post-east-done': [
      { who: 'sign', text: '…east shelf. (logged: incompressible — the one that does not repeat).' },
    ],

    /* ---- crab miner ---- */
    'ec-crab-talk': [
      { who: 'crab', text: 'Click. I hate that vault. Fourteen marks, nothing to grab onto.' },
      { who: 'pip', text: 'No handhold?' },
      { who: 'crab', text: 'No repeat to lean on. Random is heavy because you carry every bit. Unnatural.' },
    ],

    /* ---- ferry gull at the forward dock ---- */
    'ec-gull-talk': [
      { ifFlag: 'ec.done', who: 'gull', text: 'Relay\'s glowing. The Spires await — hop on when you like.' },
      { ifNotFlag: 'ec.done', who: 'gull', text: 'Seal the galleries and the vault; the relay must glow before I cast off.' },
    ],
  },

  onEnter: [
    { ifNotFlag: 'ec.intro', goto: 'ec-onenter-intro' },
  ],
});

/* ---------------- codex lore (Echo Caverns) ---------------- */

G.codex.register({
  id: 'lore.ec.echo-survey', kind: 'lore', island: 'caverns',
  title: 'The Survey of Three Halls',
  unlock: 'ec.sq1.done',
  body: 'Lem and Ziv had me call into three rotunda halls. Two handed my voice ' +
    'straight back — three copies, no new word after the first; cheap to write ' +
    'down, because a repeat is free. The deep east shelf answered once and kept ' +
    'the rest. <b>A hall with nothing to repeat cannot be carved short.</b> ' +
    '(They are still arguing over who mismarked the map.)',
  hint: 'Run the twins\' echo survey: listen at all three carved posts.',
});

G.codex.register({
  id: 'lore.ec.patternless-vault', kind: 'lore', island: 'caverns',
  title: 'Legend of the Patternless Vault',
  unlock: 'ec.done',
  body: 'The diggers say the Vault wall was struck once by something with no habits ' +
    'at all — fourteen marks, no two stretches alike, no echo anywhere in it. ' +
    'You cannot stamp it, cannot shorten it; <b>it is exactly as long as itself.</b> ' +
    'That is how the moles know a wall is full: when honesty is the only carving left.',
  hint: 'Seal the gallery and the vault, then wake the cavern relay.',
});

G.codex.register({
  id: 'lore.ec.lem-and-ziv', kind: 'lore', island: 'caverns',
  title: 'How the Twins Dig',
  unlock: 'ec.met-twins',
  body: 'Lem starts a sentence and Ziv finishes it — they say a hallway works the ' +
    'same way. See a corridor you have dug before? Do not re-chisel it: carve a ' +
    '<i>stamp</i> once and press it each time the pattern returns. <b>A second copy ' +
    'of anything is free.</b> The whole cavern is dug this way, and that is exactly Lempel and Ziv.',
  hint: 'Meet Lem & Ziv at the dig camp below the rotunda.',
});

})();
