# PEDAGOGY.md — the teaching contract for puzzle mechanics

> Player feedback that triggered this rework: **"the minigames are trivial and
> not very informative. The goal of the game is to be educational moreso than a
> basic knowledge test."**
>
> Diagnosis across the original 12 mechanics: the math was *displayed* but
> never *consequential*. binary-gate could be beaten by clicking anything;
> scales tracked the suspect set FOR the player; forecast printed the expected
> value next to each choice. A puzzle teaches only if the player must use the
> idea to get through, and the idea is built up inside the puzzle — not
> assumed from the course.

This file extends `DESIGN.md`. Where they conflict, DESIGN.md's *interface*
contracts (overlay host API, config schemas, registration) still win; this
file governs the *content* of each mechanic.

---

## 1. The Teaching Loop (mandatory for every mechanic)

Every puzzle is structured as **HOOK → GUIDE → STRIP → GATE → DEBRIEF**, with
a **coach voice** and a **hint ladder** throughout.

1. **HOOK (predict-then-find-out).** Before play, pose ONE concrete question
   with 2–4 tappable answers ("9 coins, one light. How many weighings to be
   *certain*?"). The player commits, then gets a one-line reveal that frames
   the round ("Let's find out" — never a lecture). Use `G.pz.hookCard`.
   Wrong predictions are welcomed, never punished.

2. **GUIDE (the instrumented round).** Round 1 shows full instrumentation —
   live bits readouts, candidate counts, split previews — and the coach
   comments at the exact moment a principle bites ("the beam tilted: 4 coins
   still possible, but one weighing can only answer a 3-way question — you
   can't finish"). The player WINS round 1 almost regardless, but sees the
   machinery.

3. **STRIP (training wheels off).** Later rounds remove the displayed
   answers. Whatever quantity the original puzzle computed *for* the player
   (suspect lists, expected values, best-split labels) becomes the player's
   job. Keep the *tools* (a formula card, the raw probabilities); hide the
   *conclusions*.

4. **GATE (mastery, not completion).** `api.complete()` fires ONLY after the
   player demonstrates the concept within a stated, generous tolerance:
   an efficiency bound (≤ optimum + slack), an exact resource count, a
   no-guessing rule (first click must be right), or a correct refusal
   ("this can't be done — and here's why"). **The kill-switch test:** write
   down the laziest click-sequence a bored player would try; it must fail
   the gate. Failure = instant, cheap reset with FRESH randomness (so
   memorizing the answer doesn't transfer) — never a long animation, never
   lost progress on earlier rounds.

5. **DEBRIEF (derive with their numbers).** The end card plugs the player's
   actual run into the theorem: "your 2 weighings × log₂3 = 3.17 bits ≥
   log₂9 = 3.17 bits needed — exactly enough, which is why 1 weighing was
   never possible." Also show the counterfactual: what the naive strategy
   would have cost. One short paragraph + the equation, not an essay.

6. **COACH.** Each puzzle has an assigned island character (below) who
   speaks 1–2 line interjections via `G.pz.coachCard` at: the hook reveal,
   the first principle-moment in GUIDE, after a gate failure (via the hint
   ladder), and in the debrief. Diegetic, specific, short. Never more than
   2 visible coach cards at once.

7. **HINT LADDER.** Use `G.pz.hintLadder([...])`. After 2 consecutive gate
   failures show hint 1; after 3, hint 2; the final hint essentially walks
   the player through (frustration cap). Reset the ladder on success.

8. **REPEAT ENCOUNTERS.** Most types appear on several islands (venn-lock
   and parity-charm return in the Grand Beacon finale). On first completion
   call `G.pz.markTaught(type)`. When `G.pz.taught(type)` is true, SKIP the
   hook and the guided round: open directly in mastery mode (instrumentation
   per the STRIP rules, coach trimmed to failure hints + debrief). A player
   replaying a door they already passed also counts as taught.

## 2. Difficulty calibration

The gate must require the *idea*, not arithmetic stamina or luck:
- tolerances generous (e.g. avg questions ≤ H + 0.35, not ≤ H + ε);
- anything random re-rolls on retry, and a *correct strategy* must succeed
  ≥ ~90% of the time — if the concept itself is about residual failure
  (noisy-bridge), give an explicit "good engineering still rarely fails"
  free retry rather than punishing a correct player;
- mental arithmetic capped at one-digit sums and halvings; the formula card
  does the log₂ for them (tappable values), the INSIGHT is the player's job;
- a stuck player must always have the hint ladder path to completion.

## 3. Shared kit — `G.pz` (js/core/pzkit.js, loaded before puzzles)

```js
G.pz.log2(x); G.pz.h2(p); G.pz.entropy([p...]); G.pz.surprisal(p);
G.pz.fmt(x, d=2)               // tabular number formatting

G.pz.hookCard({question, options:[{label, note?}...], correct, reveal, onDone})
  // -> element. Player taps an option; it locks, marks right/wrong vs
  // `correct` (index), shows `reveal` (html) + a continue button; then
  // onDone(pickedIdx, wasRight). Append it yourself; remove it yourself.

G.pz.coachCard(who, html)      // -> element. Portrait + name + line.
G.pz.roundBanner(n, total, label)  // -> element. "ROUND n/total — label"
G.pz.debriefCard({title, html, buttonLabel, onButton, tone:'win'|'info'})
  // -> element with a primary button (call api.complete() in onButton).

G.pz.hintLadder([h1, h2, h3])  // -> {fail():string|null, reset()}
  // fail() returns null on the 1st consecutive failure, h1 on the 2nd,
  // h2 on the 3rd, h3 (capped) after. reset() on success/new round.

G.pz.taught(type); G.pz.markTaught(type)   // persisted via G.flags
```

All elements use injected `pzk-` styles consistent with the game palette;
puzzles append them inside their own wrap and keep their own render cycle.

## 4. Hard rules for rework agents

- **Touch ONLY your own `js/puzzles/<name>.js`.** Island files, core files,
  css, index.html are frozen. Read anything; write one file.
- **Config compatibility is absolute.** Every existing island config (listed
  in your directive) must work unchanged and parameterize the MASTERY round.
  Teach rounds are derived internally (you may ship internal round data —
  names, distributions — inside your file). New config keys: optional only.
- Existing interface contract still holds: IIFE, no globals, register under
  the same type string, `create(root, config, api)`, complete() exactly
  once, never bind Esc, `destroy()` clears timers, styles under your prefix,
  44px touch targets, must look right at 420px width (mobile).
- The walkthrough harness force-opens every door's puzzle once to validate
  create-time behavior, then solves via flags — your create() must not throw
  on any island config and must not auto-complete.
- **Self-verification (all three required before you report):**
  1. *Scratch logic test* (node, no browser) for your pure functions —
     especially the gate predicate and any optimum you compare against.
  2. *Chrome drive* derived from `_smoke/pz_drive.mjs`: script BOTH a naive
     run (laziest clicks — must NOT reach api.complete) and an informed run
     (must complete). Run with `cd _smoke && node <your_drive>.mjs`.
  3. *Screenshot review*: your drive screenshots every phase (hook, guide,
     strip, gate fail, debrief); LOOK at the images; fix layout/contrast
     problems you see. You can read PNGs.
- Report: what you changed, the kill-switch sequence and how it now fails,
  drive output, and any config you wish an island would add (do NOT add it).

## 5. Coach assignments

| puzzle | coach | | puzzle | coach |
|---|---|---|---|---|
| binary-gate | maren | | parity-charm | ada (detect), bea (correct) |
| scales | shannon | | venn-lock | cee |
| forecast | sift | | noisy-bridge | bea |
| question-tree | sift | | stamp-carver | lem & ziv (alternate lines) |
| tree-planner | huff | | pair-lock | warden |
| prefix-gate | huff | | oracle-walk | warden |

(ada/bea/cee/lem/ziv have fallback portraits — that is fine and already true
in dialogue.)

---

## 6. Per-puzzle directives

### 6.1 binary-gate — DEEP REWORK
Configs: 01_beacon_rock.js:104 (7 items, 3 traits), :134 (4 items, 2 traits).
Current failure: no gate — any question order eventually isolates the target.
- HOOK: "N addressees. How many yes/no questions ALWAYS suffice?" options
  around ⌈log₂N⌉. Reveal: each answer halves at best.
- GUIDE (round 1): current instrumentation (split preview, bits labels,
  ledger) + gate: sort the letter in ≤ ⌈log₂N⌉ questions. Over budget = the
  letter is mis-sorted; fresh letter (new target), coach explains which
  question wasted information (show its lopsided split).
- STRIP (round 2): same items, but bits labels and split previews HIDDEN —
  show only the raw trait table (who is far/windy/sandy). The player must
  choose halving questions from the table. Gate: ≤ ⌈log₂N⌉ again.
- MASTERY (round 3, only when the config has ≥ 6 items; else 2 rounds):
  a BATCH of 4 letters; gate = total questions ≤ 4·⌈log₂N⌉ − 1 (forces
  consistent halving, allows one slip). Running "questions vs information"
  meter: Σ bits needed = 4·log₂N.
- DEBRIEF: their ledger summed: "you bought log₂N bits with N questions —
  every yes/no answer is at most 1 bit. That number — bits to pin one item
  out of N — is the whole currency of this archipelago."
- Kill-switch: clicking questions top-to-bottom must blow the budget on at
  least one round (ensure trait tables make the first-listed question
  lopsided in rounds 2+; reorder/augment internal trait data if needed —
  items/names from config are frozen but you may add internal decoy traits
  for teach rounds only if the config's traits are insufficient; mastery
  round must use config data as-is).

### 6.2 scales — DEEP REWORK
Config: 01_beacon_rock.js:80 {coins:9, odd:'light', weighings:2}.
Current failure: the puzzle prints "still suspect: …" — deduction done for
the player; gentle accuse-reset invites brute force.
- HOOK: "How many weighings to be CERTAIN?" [2 / 3 / 4]. Reveal: a weighing
  has THREE outcomes (left/right/balance) — it answers a 3-way question;
  3 × 3 = 9.
- GUIDE (round 1): keep the suspect display. After each weighing the coach
  narrates the elimination. KEY BEAT: if the player's first weighing leaves
  > 3 candidates in the worst case (e.g. 4v4), Shannon interrupts BEFORE the
  second weighing: "4 suspects, one weighing left, three outcomes — 4 > 3.
  Certainty is already gone. Start over." (That interruption IS the lesson:
  outcomes must split candidates ≤ 3/3/3.) Gate: catch the fake in ≤ 2
  weighings, accusation must be forced (suspect set of size 1) or it counts
  as a guess and resets.
- STRIP (round 2 = mastery): fresh coins, NO suspect display (player tracks
  it; paper-and-pencil feel: let them tap coins to mark notes — optional
  nicety). Gate: 2 weighings + correct forced accusation. Wrong accusation
  or 3rd weighing → reset with new fake.
- DEBRIEF: draw their two weighings as a ternary tree with the 9 coins at
  the leaves; 3² = 9. One line: "the scales speak base 3: log₂3 ≈ 1.58 bits
  per weighing; 2 × 1.58 ≥ log₂9 = 3.17."
- Kill-switch: weigh-anything-then-accuse-survivors must fail (guess
  accusations reset with a re-randomized fake).

### 6.3 forecast — DEEP REWORK
Configs: 02_dunes.js:92 and :122 (vents with p's, goal bits, rounds).
Current failure: "expected bits/round" printed per vent — tap the max.
- HOOK: "Two vents: one blows 1-in-2, one 1-in-16. A 1-in-16 eruption is
  worth how much more surprise?" [2× / 4× / 16×]. Reveal: surprise is
  −log₂p — rarity is priced in bits, and halving p adds ONE bit.
- GUIDE (round 1, pricing): vents show p as odds ("1 in 8"). Eruptions
  fire one at a time; the player PRICES each before banking it: pick its
  surprisal from tappable bit-values (a formula card shows −log₂p for
  tapped odds). Gate: price 4 of 6 correctly. Mispriced = coach shows the
  halving chain ("1 in 8 = half of half of half = 3 bits").
- STRIP (round 2, the wager): "what does this field pay ON AVERAGE?" The
  player assembles H term-by-term: tap each vent to add its p·(−log₂p)
  tile into a sum tray (tiles show the arithmetic; the player chooses which
  go in and sees the total build). Commit the estimate, then fast-forward
  ~40 eruptions and watch the running average converge onto (or expose) the
  estimate. Gate: assembled H correct (all vents included exactly once) —
  the convergence is the payoff, not the test.
- MASTERY (round 3, camping — uses config goal/rounds): camp the collector;
  expected-value labels GONE, only p shown. To hit the banked-bits goal
  within the round budget the player must camp high-p·surprisal vents —
  the coach prompts the comparison once ("the rare vent pays 4 bits…
  when it pays").
- DEBRIEF: "average surprise IS entropy: H = Σ p·log₂(1/p) = <their H>.
  You watched the field converge to it — that's the source coding floor."
- Kill-switch: camping the rarest vent (big payout label thinking) must
  reliably miss the goal; tapping max printed numbers is impossible
  (numbers no longer printed).

### 6.4 question-tree — POLISH
Config: 02_dunes.js:106 (critters with p, parAvg). Core mechanic is sound
(build the tree, beat par vs the H floor). Add the loop around it:
- HOOK: "Can ANY question strategy average fewer than H bits?" [yes/no].
- GUIDE: first split gets a coach overlay reading the split-info preview
  aloud once ("48% YES — nearly a coin flip, nearly a whole bit").
- NEW: label each finished leaf with its codeword (the YES/NO path as
  1/0 string) — depth IS code length; show "avg questions = avg code
  length" in the meter.
- STRIP/GATE: unchanged (par gate already good). Add: after filing, a
  second SKEWED round only if the config's distribution is near-uniform —
  if config parAvg already forces probability-mass splits, keep one round.
- DEBRIEF: existing lesson + "these trees grow in a wood west of here —
  the trails ARE the codes" (foreshadow Huffman Wood).
- Kill-switch: balanced-by-COUNT splits must miss par when mass is skewed
  (verify against the actual config; if par doesn't force it, tighten
  nothing — report it instead).

### 6.5 tree-planner — POLISH
Configs: 03_huffman_wood.js:114, :217, 07_grand_beacon.js:125.
Greedy-merge mechanic and optimal-par gate are sound. Add:
- HOOK: "Cheapest plan: merge the two BUSIEST trailheads first, or the two
  quietest?" — then round 1 FORCES busiest-first (the wrong thing): the UI
  only allows the two biggest for 2 merges, cost ticker runs hot; coach:
  "feel that? every walker on a merged trail pays for every junction above
  it." Then unlock free play on the same villages; gate = beat the forced
  cost, then (final) hit optimal.
- Show on completion each village's resulting depth and the identity
  cost = Σ daily·depth — "depth is code length; busy villages sit shallow."
- DEBRIEF: "two quietest first, every time — that greedy IS Huffman's
  algorithm, and it is provably unbeatable. Sift's catalogue built codes by
  hand; Huff grows them."
- Kill-switch: merging biggest-first throughout must miss the optimal gate
  (it already does — keep par:'optimal' semantics).

### 6.6 prefix-gate — POLISH
Config: 03_huffman_wood.js:191 (dests with freq, maxBits).
Rules engine (prefix-free, Kraft vessel, avg length) is sound. Add:
- HOOK: "Three whistle-codes of lengths 1, 2, 2 — can they coexist
  prefix-free?" [yes/no]. Reveal: ½+¼+¼ = 1 — exactly full vessel.
- NEW VISUAL (the teach): a small binary tree where assigning a codeword
  BURNS its subtree (greys out every extension). The Kraft vessel and the
  burn-tree are the same fact shown twice; one coach line says so.
- NEW ROUND (impossible request): before the main construction, a traveler
  asks for code lengths violating Kraft (e.g. {1,1,2}); the correct move is
  the "It can't be done" button (with the vessel overflowing as evidence).
  Accepting the job and trying must dead-end visibly.
- GATE: existing (all three rules green) — unchanged.
- DEBRIEF: Kraft sum + avg length vs entropy of the freq distribution.
- Kill-switch: random 0/1 tapping must trip prefix violations or overflow
  the vessel and never reach all-green within the attempt budget — already
  true; verify and report.

### 6.7 parity-charm — POLISH
Configs: 04_strait.js:82, :150, dialogue-opened at :204, :215, :282, :294;
07_grand_beacon.js:144. Detect/correct modes are sound. Add:
- HOOK (detect): "The storm flips at most one rune. One extra charm —
  can you always CATCH the flip? Can you always FIND it?" (catch yes,
  find no — that gap drives the whole island).
- NEW BEAT (detect mode, after the gate): a demonstration trip where the
  storm flips TWO bits — parity passes, message wrong, Ada reveals it:
  "even errors slip past an even-counter. Remember the feeling." (Pure
  demonstration; one tap to continue, no fail state.)
- GUIDE (correct mode): first round keeps the syndrome spelled out in
  ring-words; later rounds just light the rings.
- GATE: add a no-guessing rule in correct mode: first click must be the
  flipped bit (the syndrome names it uniquely); a wrong click resets the
  round with a fresh flip. Trips/gate semantics from config unchanged.
- DEBRIEF: the syndrome table (ring pattern → position) the player has
  been using, completed; "3 checks, 8 patterns: 7 positions + clean."
- Kill-switch: clicking bits at random in correct mode must reset (no
  guess-until-right).

### 6.8 venn-lock — POLISH (lightest touch)
Configs: 04_strait.js:93, :155, dialogue :305; 07_grand_beacon.js:103, :163.
Rounds + twist already strong. Add:
- HOOK: "Three rings, each only says EVEN or ODD. How many distinct alarm
  patterns can they show?" [4/7/8] — reveal 2³ = 8 = 7 positions + 'all
  clean'. That counting argument IS Hamming(7,4); say so at the debrief.
- NEW: a decoder-table card that FILLS IN as rounds pass (pattern → rune);
  by the last round the player reads their own table.
- Twist round: after the deception, one extra beat: "how many flips can a
  code catch-and-fix? It needs spare patterns. 8 was exactly enough for
  one." Keep everything else.
- GATE: add the same no-guessing rule (first click) if not already strict.
- Kill-switch: random rune clicking resets the round.

### 6.9 noisy-bridge — DEEP REWORK
Configs: 04_strait.js:127, dialogue :241, :252; 07_grand_beacon.js:153.
Current failures: survival % computed live (optimizer does the thinking);
final crossing is luck either way.
- HOOK: "One plank holds 9 times in 10. Five segments in a row — how often
  do you cross?" [~90% / ~75% / ~59%] — independence multiplies; chains are
  weaker than their links.
- GUIDE (round 1): keep live per-segment and whole-bridge percentages;
  coach walks the product once. Gate: reach the config threshold under
  budget (teaches majority-of-k buys nonlinear reliability).
- STRIP (round 2 = mastery): give segments DIFFERENT exposure (internal
  data: sheltered/exposed multipliers on the config p — visibly stormier
  water under some segments). Whole-bridge % HIDDEN; per-segment %
  available only via a limited "inspect" (3 inspections). Player must
  reinforce the weakest links (equalize) rather than spread evenly. Gate:
  declared crossing with internal P ≥ threshold; if the dice still kill a
  correct bridge, Bea rebuilds it free with the line "good codes still
  fail — rarely. Bad ones fail surely." (Failure of an under-threshold
  bridge costs the round.)
- DEBRIEF: their allocation vs even-spread vs lopsided, with the three
  products computed; then the moral: "repetition is the dumbest code —
  3× the planks for one vote. The lighthouse charms got the same safety
  from 3 charms on 4 runes. Smarter redundancy beats more redundancy" —
  the bridge to channel coding.
- Kill-switch: even-spread on heterogeneous segments must miss threshold;
  all-planks-on-one-segment must miss it; the displayed-percentage-climbing
  strategy is gone (numbers hidden in mastery).

### 6.10 stamp-carver — POLISH
Configs: 05_caverns.js:69, :99, :130 (one is the incompressible vault).
Cost model + par gate sound; lever round exists. Add:
- HOOK: "This corridor is 24 glyphs. What's the cheapest it could be?"
  options incl. "depends on the pattern" (correct).
- NEW: per-stamp NET SAVINGS shown live in the dictionary: uses×(len−1) −
  len, color-coded (a stamp that doesn't pay for itself glows red). One
  coach line: "a stamp is a bet that the pattern repeats."
- STRIP: on the mastery corridor, savings labels appear only AFTER carving
  (commit first, see the ledger after).
- VAULT (random corridor): the lever must UNLOCK only after the player has
  carved 2 stamps and seen both run negative — incompressibility is
  experienced, then named: "most strings have no pattern to bet on; that's
  why they don't compress."
- GATE: existing par-cost gate; verify naive all-literals tiling misses
  par on the structured corridors (report if any config lets it pass).
- DEBRIEF: their dictionary as a phrase table; "this is LZ — your zip files
  carve these exact stamps."

### 6.11 pair-lock — DEEP REWORK
Configs: 06_spires.js:107, :129. Current failure: read the heat grid, tap
the brightest row cell — argmax without understanding; rounds identical.
- HOOK: "Tower A turns. Can watching it EVER tell you nothing about B?"
- GUIDE (round 1, high-I joint from config): teach reading P(B|A=a) — when
  A spins to a, that ROW lights; coach: "ignore the rest of the grid; you
  live in one row now." Gate: existing resonance count.
- NEW ROUND (independence): an internal joint with I = 0 whose marginals
  are NOT flat (so the grid still looks structured). After a few spins the
  real gate is the QUESTION: "can any strategy here beat always-guessing
  the commonest B?" [yes/no] — correct answer NO unlocks; the I readout
  flips to 0.00 bits with the line "the rows are all the SAME row — that
  sameness is zero mutual information."
- MASTERY (round 3, config joint): hit-rate gate tightened to within one
  hit of the best-possible rate over the config's round count (they must
  exploit every row fully). Show "you vs best possible vs blind" after.
- DEBRIEF: I(X;Y) = H(B) − H(B|A) with their numbers; "I is how many bits
  of B's entropy tower A pays for."
- Kill-switch: tapping the globally-commonest B every round must miss the
  mastery gate on the config joint (verify with the actual config; if the
  config joint is too deterministic for that, tighten via the round-count,
  not the config).

### 6.12 oracle-walk — POLISH
Config: 06_spires.js:118 (text, par bits). Rank-cost mechanic is sound. Add:
- HOOK: "You'll guess the corridor's next letter, over and over. What's the
  WORST your average can be (3 candidates)?" — log₂3 ≈ 1.58, the blind line.
- NEW STRUCTURE: stage 1 walks ~8 steps with the context HIDDEN (only
  candidate letters): the running bits/step meter hugs ~1.58. Stage 2
  reveals the walked prefix: same meter visibly drops as context kicks in.
  The two-stage contrast (same player, same corridor, only context changed)
  IS the lesson; coach line at the seam: "nothing changed but what you
  KNOW."
- GATE: existing par-bits budget over the full corridor (config unchanged);
  ensure par accounts for the blind stage (scale: blind steps budgeted at
  1.58 each — derive from config par so existing config still passes a
  good player).
- DEBRIEF: "your score is cross-entropy. A language model is graded on
  exactly this walk — and a model that guesses in fewer bits can compress
  this corridor into exactly that many. Prediction IS compression."
- Kill-switch: random candidate tapping must blow the par budget (verify).

---

## 7. Report format (each agent)

```
PUZZLE: <type>
GATES: <each round's pass predicate, stated as math>
KILL-SWITCH: <the lazy sequence> -> <how it fails now>
LOGIC TEST: <file> — <n> checks, all pass
DRIVE: naive run blocked at <where>; informed run completed; <n> screenshots reviewed
NOTES: <config wishes, risks, anything the integrator must know>
```
