# Information Theory — Course Segmentation

The plan that drives notebook construction. Mirrors the structure/conventions of the ML course
(`mrcal17/ml-course`): marimo reactive notebooks → WASM HTML on GitHub Pages, Manim animations,
per-module "Code It" exercises, a syllabus `home.py`, and a local `textbooks/` folder.

**Owner decisions baked in:** (1) no probability foundations unit — opens directly on entropy;
(2) intuition + code first (MacKay/Stone flavor), proofs sketched or pushed to optional callouts;
(3) three pillars — Classical Core + Practical Coding + IT-for-ML — all covered.

---

## 1. Textbook Reference Table

⭐ = primary anchor. Filenames are the suggested local names under `textbooks/`.

| Abbrev | Filename | Title | Authors | Level | Free? (legal) |
|--------|----------|-------|---------|-------|---------------|
| **MacKay** ⭐ | `MacKay.pdf` | Information Theory, Inference, and Learning Algorithms | David J. C. MacKay | Mixed | **Free** (author, view-only) — [inference.org.uk/itprnn/book.pdf](https://www.inference.org.uk/itprnn/book.pdf) |
| **Stone** ⭐ | `Stone.pdf` | Information Theory: A Tutorial Introduction | James V. Stone | Gentle | **Free** (CC BY-NC-SA) — [arXiv:1802.05968](https://arxiv.org/pdf/1802.05968) |
| **CT** ⭐ | `CoverThomas.pdf` | Elements of Information Theory (2e) | Cover & Thomas | Advanced | Paid (library/Wiley); errata free |
| **PW** ⭐ | `PolyanskiyWu.pdf` | Information Theory: From Coding to Learning | Polyanskiy & Wu | Advanced | **Free** draft — [people.lids.mit.edu/…/itbook-export.pdf](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf) |
| Gallager | `Gallager.pdf` | Information Theory and Reliable Communication | R. G. Gallager | Advanced | Paid; free LDPC monograph + [MIT OCW 6.441](https://ocw.mit.edu/courses/6-441-information-theory-spring-2010/) |
| Ash | `Ash.pdf` | Information Theory | Robert B. Ash | Advanced | Paid (Dover ~$15) / archive.org borrow |
| CK | `CsiszarKorner.pdf` | Coding Theorems for Discrete Memoryless Systems | Csiszár & Körner | Advanced | Paid / archive.org borrow |
| Yeung | `Yeung.pdf` | Information Theory and Network Coding | R. W. Yeung | Advanced | Author draft — [iest2.ie.cuhk.edu.hk/…/draft2.pdf](https://iest2.ie.cuhk.edu.hk/~whyeung/post/draft2.pdf) |
| MacKay (again) | — | (anchors practical coding too) | — | — | — |
| LC | `LinCostello.pdf` | Error Control Coding (2e) | Lin & Costello | Advanced | Paid / archive.org (1st ed.) |
| Roth | `Roth.pdf` | Introduction to Coding Theory | Ron M. Roth | Advanced | Paid / archive.org borrow |
| RU | `RichardsonUrbanke.pdf` | Modern Coding Theory | Richardson & Urbanke | Advanced | **Free** draft — [EPFL mct-new.pdf](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) |
| Moser | `Moser.pdf` | A Student's Guide to Coding and IT | Moser & Chen | Gentle | Paid; free [ETH lecture notes](https://moser-isi.ethz.ch/scripts.html) |
| Grünwald | `Grunwald-MDL.pdf` | A Tutorial Introduction to the MDL Principle | Peter Grünwald | Advanced | **Free** — [arXiv:math/0406077](https://arxiv.org/pdf/math/0406077) |
| MLpapers | `mlpapers/` | IT-for-ML paper cluster (IB, VIB, MINE, InfoNCE, β-VAE, BB-ANS, generalization) | various | Advanced | **Free** (arXiv) — see §5 |

**The four anchors do most of the work:** MacKay sets the tone and carries source coding + practical
coding + the ML bridge; Stone is the gentlest on-ramp for early classical modules; Cover & Thomas is the
rigor/citation backstop (AEP, rate-distortion, differential entropy, network IT, maxent, method of types);
Polyanskiy–Wu bridges classical IT to statistical learning. Everything else is a per-module reference.

---

## 2. Course Syllabus

25 content modules across 6 teaching parts + a reference part. No probability unit.

### Part 0 — Orientation
> *One page. What information theory is, the bit, and how to use this course. Not a teaching unit.*

| # | Module | Topics | Interactive Elements |
|---|--------|--------|----------------------|
| 0A | Orientation & Notation | What IT is, the bit, log conventions, the three pillars, notation refresher (links to ML 0D) | "20 questions" entropy teaser |

### Part 1 — The Core Measures
> *Three quantities run the whole field: entropy, relative entropy, mutual information. Build them once, deeply.*

| # | Module | Topics | Interactive Elements |
|---|--------|--------|----------------------|
| 1A | Entropy & Self-Information | Surprise, bits, entropy, joint/conditional entropy, chain rule, binary entropy fn | Biased-coin entropy slider, 1 animation |
| 1B | Relative Entropy & Mutual Information | KL divergence, MI, the I-diagram, data-processing inequality, Jensen | KL explorer, MI heatmap, 1 animation |
| 1C | Entropy Rate & the AEP | Stochastic sources, entropy rate, typical sets, the AEP | Typical-set sampler, Markov entropy rate, 1 animation |

### Part 2 — Source Coding & Compression
> *From the source coding theorem straight into compressors you build and run.*

| # | Module | Topics | Interactive Elements |
|---|--------|--------|----------------------|
| 2A | Source Coding Theorem & Symbol Codes | Kraft inequality, prefix/uniquely-decodable codes, optimal length = entropy, Shannon code | Prefix-tree builder, Kraft budget visualizer |
| 2B | Huffman Coding | The algorithm, optimality, extended/block Huffman, limits | Live Huffman tree on text, 1 animation |
| 2C | Arithmetic & Range Coding | Stream codes, interval coding, near-optimality, adaptive models | Interval-narrowing visualizer, 1 animation |
| 2D | Universal Compression | Lempel-Ziv (LZ77/78/W), dictionary coding, universality, gzip/PNG | LZ dictionary growth, compression-ratio explorer |

### Part 3 — Channels & Reliable Communication
> *The crown jewel: you can communicate near-perfectly over a noisy channel, up to a hard limit.*

| # | Module | Topics | Interactive Elements |
|---|--------|--------|----------------------|
| 3A | Channels & Channel Capacity | DMC, BSC, BEC, capacity as max MI, Blahut-Arimoto | Capacity-vs-noise sliders, BA capacity solver |
| 3B | The Noisy-Channel Coding Theorem | Joint typicality, random coding, Fano, the converse, the rate cliff | Error-vs-rate cliff demo, 1 animation |
| 3C | Differential Entropy & the Gaussian Channel | Continuous entropy, Gaussian channel, Shannon-Hartley, water-filling | SNR→capacity slider, water-filling allocator, 1 animation |

### Part 4 — Error-Correcting Codes
> *The practical-coding pillar: how reliability is actually achieved, from Hamming to polar.*

| # | Module | Topics | Interactive Elements |
|---|--------|--------|----------------------|
| 4A | Linear & Hamming Codes | Generator/parity-check matrices, syndrome decoding, Hamming codes & bound, GF(2) | (7,4) encoder/decoder, flip-a-bit syndrome demo |
| 4B | Finite Fields, Reed-Solomon & BCH *(advanced)* | GF(2^m), cyclic codes, RS/BCH construction & Berlekamp-Massey decoding, real uses | GF arithmetic playground, RS erasure-repair demo |
| 4C | Convolutional & Turbo Codes | Convolutional encoders, the trellis, Viterbi, turbo & iterative decoding | Viterbi trellis decoder, BER-vs-SNR, 1 animation |
| 4D | LDPC, Polar & Modern Codes | Tanner/factor graphs, belief propagation, density evolution, EXIT charts; polar codes; fountain codes | BP decoder, density-evolution threshold, 1 animation |

### Part 5 — Lossy Compression & Beyond
> *Rate-distortion, the statistics bridge, and a taste of multi-user IT.*

| # | Module | Topics | Interactive Elements |
|---|--------|--------|----------------------|
| 5A | Rate-Distortion Theory | The R(D) function, distortion measures, Gaussian source, reverse water-filling | R(D) curve explorer, 1 animation |
| 5B | Information Theory & Statistics | Method of types, Sanov, hypothesis testing (Stein), Fisher info & Cramér-Rao | Type-class concentration, error-exponent ROC |
| 5C | Network Information Theory (a taste) *(advanced)* | Slepian-Wolf, the multiple-access channel, broadcast | Slepian-Wolf rate-region explorer |

### Part 6 — Information Theory for Machine Learning
> *Where it all pays off for you: the info-theoretic spine of modern ML.*

| # | Module | Topics | Interactive Elements |
|---|--------|--------|----------------------|
| 6A | Cross-Entropy, KL & Maximum Entropy | Cross-entropy as loss, MLE = min KL, label smoothing, maxent & exponential families, softmax-as-maxent | CE loss surface, maxent-under-constraints |
| 6B | MDL & Model Selection | Description length, two-part codes, Occam's razor, MDL vs BIC/Bayes | MDL model-order selection (poly fit) |
| 6C | The Information Bottleneck | Relevant information, the IB Lagrangian, the information plane, the DL caveat (Saxe) | β-slider on a toy joint, information-plane trajectory, 1 animation |
| 6D | Neural Estimation of Mutual Information | Variational MI bounds (DV/NWJ/InfoNCE), MINE, the log-N ceiling, pitfalls (Tschannen) | MINE-vs-InfoNCE bake-off on known-MI Gaussian |
| 6E | Rate-Distortion, VAEs & Neural Compression | ELBO as rate-distortion, β-VAE & the R-D plane, bits-back/BB-ANS, learned compression | β-slider tracing a VAE R-D curve, 1 animation |
| 6F | Information Theory in Modern LLMs | LLM loss = cross-entropy, bits-per-byte, perplexity = branching factor, scaling laws as compression curves, language-modeling-is-compression, sampling temperature as entropy control, BPE & speculative decoding | n-gram + arithmetic coder on user text, scaling-law sliders, temperature/entropy dial |

### Part 7 — Reference

| # | Module | Description |
|---|--------|-------------|
| 7A | Algorithm & Theorem Study Guide | Every code, algorithm, and theorem — filterable by part, with statements, intuition, and connections |
| | Quiz & Flashcards | Interactive study tool across all modules (`quiz.html`) |

---

## 3. Per-Module Source Map

| Module | Primary source(s) + chapters | Animation idea |
|--------|------------------------------|----------------|
| 0A | Stone Ch1; MacKay Ch1; PW Ch1 (notation) | — |
| 1A | Stone Ch1-2; MacKay Ch2; CT Ch2 | Surprise → entropy as expected surprise |
| 1B | CT Ch2; MacKay Ch8; Stone Ch2 | MI as overlap / KL asymmetry (I-diagram) |
| 1C | CT Ch3-4; MacKay Ch4; Ash Ch6 | Typical set concentrating as n grows |
| 2A | MacKay Ch4-5; CT Ch5; Ash Ch2 | — (Kraft tree widget instead) |
| 2B | MacKay Ch5; CT Ch5 | Huffman tree merging bottom-up |
| 2C | MacKay Ch6 | Arithmetic interval subdivision |
| 2D | MacKay Ch6; CT Ch13 | — (dictionary-growth widget) |
| 3A | MacKay Ch9; CT Ch7; Stone Ch4 | — (capacity sliders) |
| 3B | MacKay Ch10; CT Ch7; Gallager Ch5 | Jointly-typical decoding + the rate cliff |
| 3C | CT Ch8-9; Stone Ch5-7; MacKay Ch11 | Water-filling over parallel channels |
| 4A | MacKay Ch1,13; Moser Ch3; Roth Ch2; LC Ch3 | — (syndrome widget) |
| 4B | Roth Ch3-6; LC Ch6-7 | — (GF playground) |
| 4C | MacKay Ch48; LC Ch11-12,16; RU Ch6 | Viterbi best-path through the trellis |
| 4D | MacKay Ch47-50; RU Ch2-4; Arıkan (polar paper) | Message passing on a Tanner graph |
| 5A | CT Ch10; Gallager Ch9; PW (rate-distortion) | The R(D) tradeoff curve |
| 5B | CT Ch11; PW; CK Ch2 | — (type-class widget) |
| 5C | CT Ch15; Yeung; CK Ch13-14 | — (Slepian-Wolf rate region) |
| 6A | CT Ch12; MacKay; PW | — (loss-surface widget) |
| 6B | Grünwald tutorial; MacKay Ch28; Hinton-van Camp | — (MDL curve) |
| 6C | Tishby IB; Shwartz-Ziv; Saxe (caveat); Alemi VIB | Information plane: fitting → compression |
| 6D | Belghazi MINE; van den Oord InfoNCE; Poole bounds; Tschannen | — (estimator bake-off) |
| 6E | Alemi "Fixing a Broken ELBO"; Higgins β-VAE; Townsend BB-ANS; MacKay | β tracing the VAE R-D plane |
| 6F | Delétang "Language Modeling Is Compression" (2309.10668); Kaplan scaling laws (2001.08361); Hoffmann "Chinchilla" (2203.15556); MacKay; Shannon 1951 | — (n-gram+arithmetic-coder widget; scaling-law & temperature sliders) |

---

## 4. Dependency Graph

```
0A (Orientation)
   │
1A (Entropy) → 1B (KL & MI) → 1C (Entropy Rate / AEP)
   │               │                 │
   ▼               │                 ▼
2A (Source Coding) │          3A (Channel Capacity) → 3B (Coding Thm) → 3C (Gaussian)
   │               │                  │                    │                 │
2B (Huffman) → 2C (Arithmetic) → 2D (LZ)                   │                 │
                  │                                       │                 │
                  ├────────────→ 4A (Linear/Hamming) → 4C (Conv/Turbo) ────┐
                  │                         │                              │
                  │                  4B (RS/BCH, optional)                 │
                  │                                                        ▼
                  └──────────────────────────────────────────────→ 4D (LDPC/Polar)

5A (Rate-Distortion) → 5B (IT & Statistics, advanced) → 5C (Network IT, advanced)
   │                         │
   ├──────────────→ 6C (Information Bottleneck) → 6D (Neural MI) ──┐
   └──────┐                                      │                │
          └──────────────→ 6E (Rate-Distortion & VAEs) ───────────┤
                                                                  ▼
1B (KL & MI) → 6A (Cross-Entropy/KL/MaxEnt) → 6B (MDL)   6F (IT in Modern LLMs)
   │                                                              ▲
2C (Arithmetic Coding) ───────────────────────────────────────-─┘

all modules ─────────────────────────────────────────────→ 7A (Study Guide)
```

---

## 5. Build Notes

**Manim animations (~12, one `animations/src/*.py` per topic cluster):**
`EntropySurprise` (1A), `MutualInfoDiagram` (1B), `TypicalSet` (1C), `HuffmanTree` (2B),
`ArithmeticInterval` (2C), `ChannelCodingCliff` (3B), `WaterFilling` (3C), `ViterbiTrellis` (4C),
`MessagePassing` (4D), `RateDistortionCurve` (5A), `InformationPlane` (6C), `BetaVAEPlane` (6E).

**Heaviest interactive-widget modules** (budget extra build time): 2B (live Huffman on user text),
2C (arithmetic coder), 3A (Blahut-Arimoto solver), 4A (syndrome decoder), 4C (Viterbi),
4D (belief-propagation decoder + density evolution), 6D (MINE/InfoNCE bake-off), 6E (VAE R-D slider).

**Ship as optional / advanced** (mark in the module + skip in the critical path):
4B (Reed-Solomon/BCH — algebra-heavy), 5B (IT & Statistics), 5C (Network IT).

**Extra dependencies beyond the ML course's `requirements.txt`** (add as needed per module):
`galois` (finite-field arithmetic for 4A/4B) — optional; everything else covered by
numpy/scipy/torch already present.

**Construction order** (fastest path to a visible, valuable spine):
1A → 1B → 2A → 2B → 1C → 3A → 3B → then branch into 2C/2D, 3C, the coding part (4*),
the rate-distortion/stats part (5*), and finally the IT-for-ML part (6*), with 7A last.
