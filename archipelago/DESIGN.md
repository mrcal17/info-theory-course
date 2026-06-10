# THE QUIET ARCHIPELAGO — design bible & build contract

A standalone top-down adventure game (Vim-Adventures-style: one continuous
world, skills gate progress, everything taught diegetically) where the player
learns information theory by *doing it*. Pure static vanilla JS + Canvas 2D,
no dependencies, no build step. Lives in `archipelago/`, copied verbatim to
`docs/archipelago/` by `build_site.py`.

## Story

The archipelago's beacon network has gone quiet. Pip, a small postal robot
with a satchel of undelivered letters, washes ashore at Beacon Rock. Island by
island, Pip restores the network: every broken thing in the world is an
information failure, and every repair teaches the idea that fixes it. The
finale relights the Grand Beacon by composing the whole curriculum: compress
the Last Message, protect it, send it through the storm, decode it.

Tone: gentle, dry, warm. Earthbound-ish dialogue. Short lines. The world is
quiet, not grim. NPCs are animals and small machines.

## Cast (canonical names — use exactly)

- **Pip** — the player. Round white-and-blue postal robot, one antenna, satchel.
- **Dr. Shannon** — owl, keeper of the Beacon Rock lighthouse. The mentor.
- **Ferryman Gull** — a pelican with a tiny boat. Runs all inter-island travel.
- **Maren** — hermit crab postmistress of Beacon Rock.
- **Sift** — a fennec fox on the Dunes who collects surprising things.
- **Huff** — beaver trail-planner of Huffman Wood.
- **The Parity Sisters** — three lighthouse-keeper cormorants on the Strait:
  **Ada**, **Bea**, **Cee** (one per parity ring).
- **Lem & Ziv** — mole twins who dig the Echo Caverns. Finish each other's sentences.
- **Mirror Warden** — a quiet fox oracle of the Spires.
- Minor villagers: crabs, turtles, gulls (sprites `crab`, `turtle`, `gull`).

## The seven islands (order, ids, palettes, curriculum)

| # | id | Name | Palette | Music | Teaches | Mechanics used |
|---|----|------|---------|-------|---------|----------------|
| 1 | `beacon-rock` | Beacon Rock | `shore` | `shore` | a bit = one yes/no question; 2^n counting; weighing = log₂3 bits | `binary-gate`, `scales` |
| 2 | `dunes` | The Dune of Surprises | `dunes` | `dunes` | surprisal −log₂p; entropy = expected surprise; good questions split mass | `forecast`, `question-tree` |
| 3 | `huffman-wood` | Huffman Wood | `forest` | `forest` | codes = paths in trees; prefix-free; optimal merging; L̄ ≥ H | `tree-planner`, `prefix-gate` |
| 4 | `strait` | The Static Strait | `strait` | `strait` | redundancy, parity, syndrome decoding, noise vs budget | `parity-charm`, `venn-lock`, `noisy-bridge` |
| 5 | `caverns` | Echo Caverns | `cave` | `caverns` | repetition = compressibility; dictionaries (LZ); incompressibility of randomness | `stamp-carver` |
| 6 | `spires` | Mirror Spires | `spires` | `spires` | dependence = shared bits (MI); prediction = compression | `pair-lock`, `oracle-walk` |
| 7 | `grand-beacon` | The Grand Beacon | `beacon` | `beacon` | source–channel separation: the whole pipeline | composite: `tree-planner`→`parity-charm`→`noisy-bridge`→`venn-lock` |

Progression: island N+1's dock is openable once flag `<prefix>.done` of island N
is set (the Ferryman refuses otherwise). Flag prefixes: `br`, `dn`, `hw`, `st`,
`ec`, `ms`, `gb`. Each island sets `<prefix>.done` when its main quest finishes.

**Sparks** ✦: 21 collectible sparks, 3 per island (mastery rewards on optional
doors/quests). Hats for Pip at 7 (`cap`), 14 (`sunhat`), 21 (`crown`) — engine
swaps the player sprite variant automatically.

## File layout & script order (index.html loads in EXACTLY this order)

```
archipelago/
  index.html
  css/style.css           UI chrome: HUD, dialogue, overlays, d-pad, title DOM
  js/core/g.js             namespace, registries, save, flags, bus, utils
  js/core/input.js         keyboard + touch d-pad
  js/core/tiles.js         tile legend + palettes
  js/core/map.js           ASCII map parse + collision
  js/core/render.js        camera, tile/entity/particle rendering, fades
  js/core/entities.js      entity specs, player controller, NPC wander, triggers
  js/core/dialogue.js      dialogue runner (typewriter, portraits, choices, actions)
  js/core/overlay.js       puzzle overlay host
  js/core/audio.js         G.audio: sfx + music   [AUDIO AGENT owns this file]
  js/sprites.js            G.sprites: all character/prop draw fns  [SPRITES AGENT]
  js/ui.js                 title screen, pause menu, archipelago map, ending/credits  [UI AGENT]
  js/puzzles/*.js          one file per mechanic  [PUZZLE AGENTS]
  js/islands/01_beacon_rock.js … 07_grand_beacon.js  [ISLAND AGENTS]
  js/main.js               boot, state machine, HUD, island switching, QA hooks
```

Everything is plain `<script defer>` (NO ES modules — file:// must work). One
global namespace `G` defined in g.js. Every other file is an IIFE that only
reads/extends `G`. No other globals.

## Tile legend (FROZEN — island maps may only use these chars)

Walkable: `.` sand · `,` grass · `;` dark grass · `"` tall grass · `_` path ·
`=` boardwalk/bridge · `s` stone floor · `%` cave floor · `+` doorway/gap ·
`-` shallow water (walkable, slows nothing, splash particles)

Blocking: `~` deep water · `#` rock wall · `^` cliff · `T` tree · `t` bush ·
`o` boulder · `S` stone wall · `C` cave wall · `*` glow crystal (emits light) ·
`!` beacon base · ` ` (space) void

Maps are template-literal ASCII blocks; all rows are padded to equal length.
Coordinates are `x` = column, `y` = row, 0-based, matching the ASCII grid.
Tile size is 32 logical px. Maps should be roughly 40–64 cols × 28–44 rows.

Palettes (defined in tiles.js): `shore`, `dunes`, `forest`, `strait` (rainy,
darker), `cave` (dark, crystals glow), `spires` (dusk purple), `beacon`
(night, gold accents). The renderer adds per-tile deterministic decor
(speckles, grass blades, water shimmer) — authors just place chars.

## Island registration (FROZEN schema)

```js
G.islands.register({
  id: 'beacon-rock', name: 'Beacon Rock', order: 1,
  palette: 'shore', music: 'shore',
  map: `...ASCII...`,
  spawn: { x: 10, y: 22 },          // default arrival point (the dock)
  entities: [ /* see entity spec */ ],
  objectives: [                      // HUD shows hint of FIRST unmet flag
    { flag: 'br.met-shannon', hint: 'Find the lighthouse keeper.' },
    { flag: 'br.done',        hint: 'Deliver the letter to Maren.' },
  ],
  dialogues: { 'br-shannon-1': [ /* see dialogue spec */ ], ... },
  onEnter: [ /* actions run on each arrival; use ifFlag/ifNotFlag for once */ ],
});
```

## Entity spec (FROZEN)

Common fields: `{ id, type, x, y, sprite, name?, dir?: 'n'|'s'|'e'|'w',
ifFlag?, ifNotFlag? }` — `ifFlag`/`ifNotFlag` control existence (re-evaluated
on flag changes; use for opened doors, moved NPCs, granted items).

- `type:'npc'` + `dialogue:'dlgId'` (+ `wander:true` for 1-tile shuffling).
  Blocking. Talk via interact. `dialogue` may also be
  `[{ifFlag|ifNotFlag, use:'dlgId'}, ..., {use:'fallbackId'}]` — first match wins.
- `type:'sign'` + `text:'...'` (short, can be array of pages). Blocking.
- `type:'door'` + `{ flag:'xx.y.open', puzzle:{type, config}, sparks?:0|1,
  lockedText?:'...', sprite:'door'|'gate'|'runedoor' }` — interacting opens the
  puzzle overlay; on `complete` the flag is set (door entity should have
  `ifNotFlag` = same flag so it disappears), sparks awarded once.
- `type:'item'` + `{ gives:'spark'|'letter'|..., flag:'xx.item.got' }` —
  pickup on touch, sets flag, disappears (engine handles via flag).
- `type:'portal'` + `{ to:'island-id', at:{x,y}, requiresFlag?, deniedDialogue? }`
  — walk-on travel with fade. Ferry docks are portals guarded by Gull NPCs.
- `type:'trigger'` + `{ actions:[...], once?:true, flag? }` — invisible,
  fires actions on walk-over.
- `type:'prop'` + sprite (e.g. `beacon-off`/`beacon-on`, `mailbox`, `boat`,
  `chest`). Blocking unless `solid:false`.

## Dialogue spec (FROZEN)

A dialogue is an array of steps:

```js
[
  { who:'shannon', text:"Hoo. A courier. It has been a long time." },
  { who:'pip', text:"One letter, very soggy, for Dr. Shannon?" },
  { ifNotFlag:'br.scales.done', who:'shannon', text:"The bridge scale is broken, mind." },
  { choice:[ {label:'What is a bit?', goto:'br-shannon-bits'},
             {label:'Goodbye.', end:true} ] },
  { actions:[ {set:'br.met-shannon'}, {sfx:'spark'}, {openPuzzle:{type:'scales', config:{...}, flag:'br.scales.done', sparks:1}},
              {goto:'other-dlg'}, {teleport:{island:'dunes', x:3, y:4}}, {give:'spark'},
              {quake:400}, {wait:600}, {focus:{x:10,y:5}}, {music:'beacon'}, {endGame:true} ] },
]
```

`who` values = sprite names (portrait drawn via `G.sprites.portrait`). `pip`
is the player. Steps run in order; `ifFlag`/`ifNotFlag` skip lines. `goto`
jumps to another dialogue id. `end:true` closes. Action vocabulary is exactly:
`set, clear, give ('spark' adds one), openPuzzle, goto, teleport, sfx, music,
quake, wait, focus, endGame`. Nothing else exists.

Writing rules: lines ≤ 90 chars, max ~6 steps before player input, teach by
showing. Every concept gets: (1) an NPC explanation in plain words, (2) a safe
practice puzzle, (3) a gate that requires it, (4) an optional mastery door
worth a spark.

## Puzzle mechanic API (FROZEN — same pattern as the Signal Lost engine)

```js
G.puzzles.register('scales', {
  title: 'The Harbor Scales',
  create(root, config, api) {  // root = empty div in the overlay
    return { destroy(){} };
  }
});
// api: { complete(), fail(msg?), close(), sfx(name), status(html), rng() }
```

`complete()` = puzzle solved → engine sets the door's flag, awards sparks,
closes overlay, plays 'solve'. `close()` = player backs out (no flag). Style:
inject a `<style>` once per mechanic, class prefix = mechanic abbreviation.
DOM + inline SVG only, palette CSS vars from style.css (same slate/neon family
as the course: `--bg --surface --surface2 --border --text --muted --dim --blue
--green --red --yellow --purple --pink --orange --cyan --gold`). Every puzzle
shows its information quantity LIVE (bits per question, surprisal banked,
L̄ vs H, …) and ends with a one-line lesson. Touch-friendly (≥40px), works at
360px. Puzzles must always be completable and never softlock; `close()` is
always available (door stays shut).

### Mechanic config schemas (FROZEN — islands rely on these exactly)

1. `binary-gate` — route a letter by yes/no questions. Config:
   `{ items:[{name, traits:{key:bool,...}},...], traitLabels:{key:'Is it …?'},
      parQuestions:n }`. Player picks questions; each shows the split it makes
   and bits gained (H₂ of the split). Solve = isolate the addressee.
2. `scales` — find the odd coin. Config: `{ coins:n, odd:'light'|'heavy',
   weighings:k }`. Balance UI; counter shows weighings left and "a weighing
   tells you at most log₂3 ≈ 1.58 bits"; solve = select the odd coin in ≤ k.
3. `forecast` — bank surprisal. Config: `{ vents:[{label, p},...], goalBits:g,
   rounds:r }`. Each round: place the collector on one vent; an eruption is
   sampled from p; if it hits your vent you bank −log₂p bits. Solve = bank g
   within r rounds (tune so the honest strategy succeeds reliably).
4. `question-tree` — build the cheapest interrogation. Config:
   `{ critters:[{name, p, key},...], parAvg:x }`. Player assembles a yes/no
   tree (any binary splits over the critter set); score = expected questions
   Σp·depth vs entropy H and par. Solve = reach ≤ parAvg.
5. `tree-planner` — Huffman as trail planning. Config:
   `{ villages:[{name, daily}], par:'optimal' }`. Merge trailheads two at a
   time into junctions; cost = Σ daily·depth; live total vs the optimal
   (computed internally). Solve = within `tolerance` (default exactly optimal
   when `par:'optimal'`).
6. `prefix-gate` — signpost codes. Config: `{ dests:[{name, freq}], maxBits:n }`.
   Assign each destination a binary code (editable chips); constraints checked
   live: prefix-free (Kraft ≤ 1) and weighted length ≤ maxBits. Solve = valid.
7. `parity-charm` — protect a crossing. Config: `{ dataBits:k,
   mode:'detect'|'correct', trips:t }`. Player appends parity charm(s) to a
   k-bit message; the storm flips ≤1 bit per trip; in `detect` mode declare
   "clean/corrupted", in `correct` mode also point at the flipped bit
   (player designs WHERE the parity bits look — guided). Solve = t clean trips.
8. `venn-lock` — Hamming(7,4) three-ring lock. Config: `{ rounds:r, twist:bool }`.
   Same logic as the proven Syndrome game (rings = parity checks; click the
   flipped rune; twist round = two flips fool the lock).
9. `noisy-bridge` — redundancy under budget. Config: `{ p, segments:n,
   budget:b }`. Each segment gets 1/3/5 planks (majority must hold; each plank
   independently fails with p); live failure probabilities shown; then the
   crossing resolves with real randomness. Solve = cross; failure = re-spend
   remaining budget on broken segments (never softlocks: budget refunds on
   total failure and retry resets).
10. `stamp-carver` — LZ compression. Config: `{ pattern:'abcabcabd…',
    parCost:n, incompressible?:bool }`. Carve substrings as stamps, then tile
    the corridor with stamp refs + literals; cost = Σ stamp lengths + refs +
    literals (engine shows the arithmetic). Solve = cost ≤ parCost. If
    `incompressible:true` the pattern is random and par is impossible: the
    solve condition becomes pressing the "It cannot be compressed" lever after
    a failed attempt — the lesson IS the answer.
11. `pair-lock` — mutual information dials. Config:
    `{ joint:[[p11,p12],[p21,p22]], rounds:r, goal:g }` (2×2 or labeled NxN).
    Each round dial A is sampled from the joint's marginal and SHOWN; player
    sets dial B; a hit = the joint pair occurs given A (use conditional). Bank
    hits; live readout shows your hit rate vs best-possible (argmax of
    conditional) vs chance, and I(X;Y) in bits. Solve = g hits in r rounds.
12. `oracle-walk` — prediction corridor. Config: `{ text:'lowercase a-z and
    spaces', bitsBudget:b }`. Predict each next letter from 3 offered
    candidates (1 correct + 2 plausible decoys chosen by the puzzle); cost
    1 bit if right on first pick, 1.58 if second, 2.58 if third (log₂ of
    rank among 3, +1); corridor lights as you go. Solve = finish the text
    within the bits budget.

## Engine APIs available to all files (read core/*.js for exact signatures)

- `G.flags.has(f) / set(f) / clear(f)` — flags are the only world state; every
  set triggers autosave + entity recheck + objective HUD update.
- `G.save` — autosaves to localStorage key `quiet-archipelago-v1`.
- `G.audio.sfx(name)`, `G.audio.music(trackId)` — see audio contract below.
- `G.sprites.draw(ctx, name, x, y, t, opts)` and `G.sprites.portrait(name)`.
- `G.world.teleport(islandId, x, y)`, `G.world.player`, `G.world.island`.
- `G.dialogue.start(idOrSteps)`.
- `G.ui.toast(text)`, `G.ui.openTitle()`, `G.ui.openMapScreen()`, `G.ui.ending()`.
- `G.qa` — QA hooks (teleport, setFlag, state, solveDoor) used by the test
  harness; always present, undocumented in-game.

## Sprite contract (sprites.js — SPRITES AGENT)

`G.sprites.draw(ctx, name, px, py, t, opts)` draws a ~28×28 character centered
on the tile bottom (px,py = tile top-left in screen px; 32px tiles), `t` =
seconds for idle animation (gentle 2-frame bob/blink), `opts = { dir, moving,
hat?: 'cap'|'sunhat'|'crown' }` (hat only used by `pip`). Canvas primitives
only, soft rounded shapes, dark outline, two big eyes where applicable —
the art style is "cute round things with eyes". Include a small drop shadow.
Names needed: `pip, shannon, gull, maren, sift, huff, ada, bea, cee, lem, ziv,
warden, crab, turtle, gullsmall, mailbox, boat, beacon-off, beacon-on, chest,
sign, door, gate, runedoor, letter, spark, geyser, stamp, dial, lever`.
`G.sprites.portrait(name)` returns a 96×96 canvas (cached) for dialogue.
Unknown names must fall back to a gray blob with eyes (never throw).

## Audio contract (core/audio.js — AUDIO AGENT)

WebAudio, all synthesized, master mute respected (`G.audio.setEnabled`).
SFX names: `step, bump, talk, choice, open, close, solve, fail, spark,
door, splash, sail, zap, quake, beacon, hat, save, select`.
Music: `G.audio.music(id)` crossfades looping chiptune tracks:
`title, shore, dunes, forest, strait, caverns, spires, beacon, ending` —
short (8–16 bar) loops, square/triangle/noise voices, each island distinct in
key/mood (shore=bright, dunes=lydian airy, forest=folk waltz, strait=minor
rain, caverns=sparse echo, spires=dreamy, beacon=noble, ending=warm).
Keep CPU light; start audio context lazily on first input.

## QA / testing

- `node --check` every file.
- `G.qa = { state(), teleport(island,x,y), setFlag(f), flags(), solveDoor(entityId) }`.
- Puppeteer harness drives a real Chrome: new game → walkthrough per island
  using arrow-key movement + QA teleports + DOM clicks inside puzzle overlays;
  screenshots are taken for visual review. Game must boot from `file://`.

## Performance & misc

Draw only visible tiles; no per-frame allocations in hot loops; the world
pauses while dialogue/puzzle/menu overlays are open. Mobile: on-screen d-pad +
interact button (auto-shown on touch devices). Settings: sound toggle, d-pad
toggle, reset save. Single autosave slot; title screen offers Continue.
