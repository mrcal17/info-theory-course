/* DEV ONLY — minimal island + puzzle to exercise every engine system.
   Not loaded by index.html; excluded from deploy. */
(function () {
'use strict';

G.puzzles.register('dev-test', {
  title: 'Dev Test Lock',
  create: function (root, config, api) {
    root.innerHTML = '<div class="g-card"><p>A test lock. ' + (config.label || '') + '</p>' +
      '<div class="g-row"><button class="btn btn-primary" id="dev-solve">Solve</button>' +
      '<button class="btn" id="dev-fail">Fail</button></div></div>';
    root.querySelector('#dev-solve').addEventListener('click', function () { api.complete(); });
    root.querySelector('#dev-fail').addEventListener('click', function () { api.fail('Nope.'); });
    api.status('status line works');
    return { destroy: function () {} };
  },
});

G.islands.register({
  id: 'dev-isle', name: 'Dev Isle', order: 1, palette: 'shore', music: 'shore',
  map: `
~~~~~~~~~~~~~~~~~~~~~~~~~~
~~--..,,,,,,,,,,,..--~~~~~
~--..,,,T,,;;,,t,,..--~~~~
~-..,,,,,,;;;;,,,,,..-~~~~
~-..,__________,,",,..-~~~
~-..,_,,,,,,,,_,"",,..-~~~
~-..,_,o,,*,,,_,,",,..-~~~
~-..,_,,,,,,,,_,,,,,..-~~~
~-..,__________,,,,,..-~~~
~-..,,,,,,,,,,,,,,,,..-~~~
~--..,,##########,,..--~~~
~~--..,#ssssssss#,..--~~~~
~~~--.,#s++++++s#,.--~~~~~
~~~~-.,,========,,.-~~~~~~
~~~~-..,,,,,,,,,,..-~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~
`,
  spawn: { x: 8, y: 9 },
  entities: [
    { id: 'dev-npc', type: 'npc', x: 6, y: 5, sprite: 'crab', wander: true, dialogue: 'dev-talk' },
    { id: 'dev-sign', type: 'sign', x: 10, y: 5, text: 'Signs work. This one says so.' },
    { id: 'dev-door', type: 'door', x: 12, y: 12, sprite: 'door',
      puzzle: { type: 'dev-test', config: { label: 'door config ok' } },
      flag: 'dev.door.open', sparks: 1, ifNotFlag: 'dev.door.open' },
    { id: 'dev-spark', type: 'item', x: 14, y: 7, gives: 'spark', flag: 'dev.spark.got', ifNotFlag: 'dev.spark.got' },
    { id: 'dev-portal', type: 'portal', x: 8, y: 13, to: 'dev-isle-2', at: { x: 4, y: 3 },
      requiresFlag: 'dev.door.open', deniedDialogue: [{ who: 'sign', text: 'The boardwalk is roped off. (portal gate works)' }] },
    { id: 'dev-trigger', type: 'trigger', x: 5, y: 9, once: true,
      actions: [{ sfx: 'spark' }, { set: 'dev.trigger.fired' }] },
    { id: 'dev-beacon', type: 'prop', x: 13, y: 2, sprite: 'beacon-off', ifNotFlag: 'dev.door.open' },
    { id: 'dev-beacon-on', type: 'prop', x: 13, y: 2, sprite: 'beacon-on', ifFlag: 'dev.door.open' },
  ],
  objectives: [
    { flag: 'dev.talked', hint: 'Talk to the crab.' },
    { flag: 'dev.door.open', hint: 'Open the stone door.' },
    { flag: 'dev.done', hint: 'Take the boardwalk south.' },
  ],
  dialogues: {
    'dev-talk': [
      { who: 'crab', text: 'Click. I am a test crab. The typewriter types.' },
      { who: 'pip', text: 'And choices?' },
      { choice: [
        { label: 'Set a flag', actions: [{ set: 'dev.talked' }, { sfx: 'good' }] },
        { label: 'Open the test lock', actions: [{ openPuzzle: { type: 'dev-test', config: {}, flag: 'dev.dlg-puzzle.done' } }] },
        { label: 'Goodbye', end: true },
      ] },
      { who: 'crab', text: 'Flag set. Conditional lines work too:' },
      { ifFlag: 'dev.talked', who: 'crab', text: 'You have the dev.talked flag. Verified.' },
    ],
  },
});

G.islands.register({
  id: 'dev-isle-2', name: 'Second Isle', order: 2, palette: 'cave', music: 'caverns',
  map: `
CCCCCCCCCC
C%%%%%%%*C
C%%%%%%%%C
C%%%%%%%%C
C*%%%%%%%C
CCCCC+CCCC
~~~~~=~~~~
`,
  spawn: { x: 4, y: 3 },
  entities: [
    { id: 'dev2-trigger', type: 'trigger', x: 4, y: 3, once: true, actions: [{ set: 'dev.done' }] },
    { id: 'dev2-back', type: 'portal', x: 5, y: 6, to: 'dev-isle', at: { x: 8, y: 12 } },
  ],
  objectives: [],
  dialogues: {},
});

})();
