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

    /* ---- relay-waker: exists only after the VAULT is sealed; its set fires
       only when the GALLERY is also sealed. No once-flag, so it re-fires
       harmlessly until both are true, regardless of completion order. The tile
       (11,6) is the rotunda mouth — the player always crosses it. ---- */
    { id: 'ec-done-trigger', type: 'trigger', x: 12, y: 6, ifFlag: 'ec.vault.done',
      actions: [{ ifFlag: 'ec.gallery1.done', set: 'ec.done' }] },

    /* ---- GATE DEEP: mastery door (spark 1), off the rotunda's east wall ---- */
    { id: 'ec-plaque-deep', type: 'sign', x: 33, y: 11,
      text: 'DEEP GALLERY — NANANANANA. nest the stamp inside the stamp.' },
    { id: 'ec-gate-deep', type: 'door', x: 34, y: 10, sprite: 'runedoor',
      puzzle: { type: 'stamp-carver', config: { pattern: 'nananananabnananana', parCost: 11 } },
      flag: 'ec.deep.done', sparks: 1, ifNotFlag: 'ec.deep.done',
      lockedText: 'A tighter wall: nananananabnananana. The repeat repeats — a stamp can live inside a stamp.' },

    /* ---- Lem & Ziv's dig camp (central lower room) ---- */
    { id: 'ec-lem', type: 'npc', x: 20, y: 22, sprite: 'lem',
      dialogue: [
        { ifFlag: 'game.finished', use: 'ec-twins-postgame' },
        { ifFlag: 'ec.vault.done', use: 'ec-twins-vault-done' },
        { ifFlag: 'ec.gallery1.done', use: 'ec-twins-vault-set' },
        { ifFlag: 'ec.met-twins', use: 'ec-twins-again' },
        { use: 'ec-twins-meet' },
      ] },
    { id: 'ec-ziv', type: 'npc', x: 22, y: 22, sprite: 'ziv',
      dialogue: [
        { ifFlag: 'game.finished', use: 'ec-twins-postgame' },
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
    ],
    'ec-twins-vault-set': [
      { who: 'lem', text: '"gallery\'s open — good. now the hard one, the—"' },
      { who: 'ziv', text: '"—Patternless Vault, west of camp. fourteen marks, no—"' },
      { who: 'lem', text: '"—repeat anywhere. you\'ll try to stamp it and—"' },
      { who: 'ziv', text: '"—fail, and that failing IS the answer. pull the lever."' },
    ],
    'ec-twins-vault-done': [
      { who: 'lem', text: '"you sealed the vault. some things are exactly as long—"' },
      { who: 'ziv', text: '"—as themselves. that\'s how you know they\'re full."' },
    ],
    'ec-twins-postgame': [
      { who: 'lem', text: '"network\'s lit again. and we never carved the same beam—"' },
      { who: 'ziv', text: '"—twice. waste not, courier. waste not."' },
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

})();
