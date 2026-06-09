# SIGNAL LOST — design & contract

A companion game to the Information Theory course. Premise: a deep-space relay
network has gone dark; each station runs on one layer of information theory,
and the player restores it by playing a minigame whose mechanics ARE the math.
Lives at `game/`, copied verbatim to `docs/game/` by `build_site.py` (no build
step). Pure static HTML/CSS/JS — works from `file://` and GitHub Pages.

## File layout

```
game/
  index.html          shell page: loads game.css, engine.js, then each minigame
  game.css            theme + shared utility classes (palette matches quiz.html)
  js/engine.js        screens (title/map/briefing/play/debrief), registry,
                      persistence, unlocks, stars/bits/ranks, sfx, Escape key
  js/games/*.js       one file per minigame, each ends in Game.register({...})
```

## Roster

| file                    | id                  | title                 | part | module | moduleUrl (from docs/game/) |
|-------------------------|---------------------|-----------------------|------|--------|------------------------------|
| 01_entropy_hunt.js      | `entropy-hunt`      | Twenty Bits           | 1    | 1A     | `../1a_entropy/`             |
| 02_kl_detective.js      | `kl-detective`      | The Imposter          | 1    | 1B     | `../1b_kl_mutual_information/` |
| 03_huffman_forge.js     | `huffman-forge`     | The Forge             | 2    | 2B     | `../2b_huffman/`             |
| 04_noisy_uplink.js      | `noisy-uplink`      | Uplink                | 3    | 3A     | `../3a_channel_capacity/`    |
| 05_syndrome.js          | `syndrome`          | Syndrome              | 4    | 4A     | `../4a_linear_codes/`        |
| 06_kelly_casino.js      | `kelly-casino`      | The Growth Game       | 6    | 6A     | `../6a_crossentropy_maxent/` |
| 07_be_the_model.js      | `be-the-model`      | Be the Model          | 6    | 6F     | `../6f_it_llms/`             |
| 08_last_transmission.js | `last-transmission` | The Last Transmission | 7    | —      | `../` (course home)          |

Unlocks (engine handles it): part 1 open from the start; part *p* unlocks when
any game in the previous part has ≥ 1 star; the part-7 boss unlocks at 12 total
stars. Max 24 stars (8 games × 3).

## Registration contract

Each minigame file is a single IIFE that defines NO globals and ends with:

```js
Game.register({
  id: 'huffman-forge',          // kebab-case, matches roster
  title: 'The Forge',
  icon: '🌲',                   // emoji shown on the map node
  part: 2,                      // course part number (see roster)
  module: '2B',                 // module chip; '' for the boss
  moduleTitle: 'Huffman Coding',
  moduleUrl: '../2b_huffman/',  // relative to docs/game/index.html
  tagline: 'One sentence shown on the map node.',
  briefing: `<p>HTML shown on the pre-game briefing screen: the station story
             (1 short paragraph) + how to play (short list).</p>`,
  concept: `<p>HTML shown in the post-game debrief: the actual math, 1–2 short
            paragraphs + the key formula in plain HTML/Unicode
            (e.g. H(X) = −Σ pᵢ log₂ pᵢ). No LaTeX/KaTeX.</p>`,
  create(root, api) {
    // build all DOM under `root` (an empty div the engine owns)
    return { destroy() { /* clear timers + document-level listeners */ } };
  },
});
```

## The `api` object passed to `create`

- `api.complete({stars, bits, headline, detailHTML})` — end the run (once).
  `stars` 0–3 (0 = failed, retry encouraged), `bits` = score currency,
  `headline` short string, `detailHTML` a results breakdown. Engine shows the
  debrief (stars + bits + detail + your `concept` + module link).
- `api.exit()` — abort to the map without recording anything.
- `api.status(html)` — set the HUD status line (live score/round display).
- `api.sfx(name)` — `'click' | 'good' | 'bad' | 'win' | 'lose' | 'tick'`.
- `api.injectStyle(css)` — add the game's stylesheet once (dedup by game id).
- `api.rng()` — alias of Math.random.

## Rules for minigame code

1. Vanilla JS (ES2020), one file, IIFE, **no globals** other than the
   `Game.register` call. No external libraries, no network, no images —
   inline SVG and emoji only. **No `<canvas>`** (untestable in jsdom): use
   DOM + SVG for all visuals.
2. All game math lives in **pure functions** at the top of the IIFE
   (entropy, Huffman construction, syndrome lookup, …) so it can be reviewed
   and unit-tested in isolation.
3. CSS: call `api.injectStyle()` once in `create`; prefix every class with the
   game's short prefix (e.g. `hf-` for huffman-forge) to avoid collisions.
   Reuse the shared palette via CSS vars (`--bg --surface --surface2 --border
   --text --muted --dim --blue --green --red --yellow --purple --pink --orange
   --cyan --gold`) and the shared utility classes in game.css:
   `.btn .btn-primary .btn-ghost .btn-danger .g-card .g-row .g-grid .g-pill
   .g-bar > .g-bar-fill`.
4. Keyboard shortcuts are welcome but **never bind Escape** (engine owns it);
   remove document-level listeners and timers in `destroy()`.
5. A run should last 3–8 minutes, end in `api.complete`, and always be
   finishable (timers add pressure, not hard reflex gates). Mobile-friendly
   down to 360 px wide; touch targets ≥ 40 px.
6. Educational skew is the point: surface the quantity being taught *live*
   (bits gained per question, evidence in bits, L̄ vs H, budget vs the Shannon
   floor, growth rate vs 1 − H₂(p), bits/char), and make the debrief
   `detailHTML` compare the player's play to the information-theoretic optimum.

## Scoring guideline

3★ = near-optimal play ≈ 50 bits · 2★ = solid ≈ 25 · 1★ = completed ≈ 10 ·
0★ = failed ≈ 0–5. Boss values doubled (3★ ≈ 100). Engine keeps the **best**
bits per game (no grinding); ranks by total bits: Static 0 → Noise Intern 25 →
Parity Checker 70 → Code Smith 130 → Channel Rider 200 → Entropy Wrangler 300
→ Maxwell's Demon 420.

## Deploy

`build_site.py` copies `game/` → `docs/game/` (excluding this file). Module
links use `../<slug>/`; course home is `../`; quiz is `../quiz.html`.
