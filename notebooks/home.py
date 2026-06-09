import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(r"""
    # Information Theory — Complete Course

    A self-paced, interactive course from Shannon's entropy to the information theory of modern machine learning.
    Every module is a reactive notebook — read the lectures, run the code, tweak the parameters, build the compressors and codes yourself.

    ---

    ## How to Use This Course

    - **Follow the modules in order within each Part** — the dependency graph below shows what feeds into what
    - **Run the code cells** — don't just read, experiment. Compress real text, corrupt a channel, watch a decoder fight noise
    - **Interactive widgets** (sliders, dropdowns) let you explore concepts in real-time — this is where the intuition forms
    - **Animations** visualize key ideas — the typical set, the rate cliff, water-filling, message passing
    - **References** link to public book pages, author PDFs, arXiv papers, and OpenReview entries for deeper reading
    - **Practice exercises** are at the end of each module — do them

    > **Prerequisite:** a solid grip on probability (random variables, expectation, Bayes, common distributions).
    > This course does **not** re-teach probability — if you want a refresher, revisit random variables, expectation, conditioning, Bayes, and common distributions before starting.

    To open any module, run: `marimo edit notebooks/<filename>.py`
    Or use: `bash launch.sh 1a` (opens Module 1A)

    ---
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 0 — Orientation

    > *One page to set notation and the lay of the land. Not a teaching unit — start here, then go to 1A.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 0A | [Orientation & Notation](/info-theory-course/0a_orientation/) | What information theory is, the bit, log conventions, the three pillars, notation | "20 questions" entropy teaser |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 1 — The Core Measures

    > *Three quantities run the whole field: entropy, relative entropy, mutual information. Build them once, deeply.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 1A | [Entropy & Self-Information](/info-theory-course/1a_entropy/) | Surprise, bits, entropy, joint/conditional entropy, chain rule, binary entropy | Biased-coin entropy slider, 1 animation |
    | 1B | [Relative Entropy & Mutual Information](/info-theory-course/1b_kl_mutual_information/) | KL divergence, mutual information, the I-diagram, data-processing inequality, Jensen | KL explorer, MI heatmap, 1 animation |
    | 1C | [Entropy Rate & the AEP](/info-theory-course/1c_aep/) | Stochastic sources, entropy rate, typical sets, the asymptotic equipartition property | Typical-set sampler, Markov entropy rate, 1 animation |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 2 — Source Coding & Compression

    > *From the source coding theorem straight into compressors you build and run.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 2A | [Source Coding Theorem & Symbol Codes](/info-theory-course/2a_source_coding/) | Kraft inequality, prefix codes, optimal length = entropy, Shannon code | Prefix-tree builder, Kraft budget visualizer |
    | 2B | [Huffman Coding](/info-theory-course/2b_huffman/) | The algorithm, optimality, extended/block Huffman, limits | Live Huffman tree on text, 1 animation |
    | 2C | [Arithmetic & Range Coding](/info-theory-course/2c_arithmetic/) | Stream codes, interval coding, near-optimality, adaptive models | Interval-narrowing visualizer, 1 animation |
    | 2D | [Universal Compression](/info-theory-course/2d_lempel_ziv/) | Lempel-Ziv (LZ77/78/W), dictionary coding, universality, gzip/PNG | Dictionary-growth explorer, compression ratio |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 3 — Channels & Reliable Communication

    > *The crown jewel: you can communicate near-perfectly over a noisy channel, up to a hard limit.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 3A | [Channels & Channel Capacity](/info-theory-course/3a_channel_capacity/) | DMC, BSC, BEC, capacity as max mutual information, Blahut-Arimoto | Capacity-vs-noise sliders, BA solver |
    | 3B | [The Noisy-Channel Coding Theorem](/info-theory-course/3b_channel_coding_theorem/) | Joint typicality, random coding, Fano, the converse, the rate cliff | Error-vs-rate cliff demo, 1 animation |
    | 3C | [Differential Entropy & the Gaussian Channel](/info-theory-course/3c_gaussian_channel/) | Continuous entropy, the Gaussian channel, Shannon-Hartley, water-filling | SNR→capacity slider, water-filling, 1 animation |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 4 — Error-Correcting Codes

    > *The practical-coding pillar: how reliability is actually achieved, from Hamming to polar.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 4A | [Linear & Hamming Codes](/info-theory-course/4a_linear_codes/) | Generator/parity-check matrices, syndrome decoding, Hamming codes & bound, GF(2) | (7,4) encoder/decoder, syndrome demo |
    | 4B | [Finite Fields, Reed-Solomon & BCH](/info-theory-course/4b_reed_solomon/) *(advanced)* | GF(2^m), cyclic codes, RS/BCH, Berlekamp-Massey decoding, real uses | GF arithmetic playground, RS erasure repair |
    | 4C | [Convolutional & Turbo Codes](/info-theory-course/4c_convolutional_turbo/) | Convolutional encoders, the trellis, Viterbi, turbo & iterative decoding | Viterbi trellis decoder, BER-vs-SNR, 1 animation |
    | 4D | [LDPC, Polar & Modern Codes](/info-theory-course/4d_ldpc_polar/) | Tanner/factor graphs, belief propagation, density evolution, EXIT charts; polar; fountain | BP decoder, density-evolution threshold, 1 animation |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 5 — Lossy Compression & Beyond

    > *Rate-distortion, the statistics bridge, and a taste of multi-user information theory.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 5A | [Rate-Distortion Theory](/info-theory-course/5a_rate_distortion/) | The R(D) function, distortion measures, the Gaussian source, reverse water-filling | R(D) curve explorer, 1 animation |
    | 5B | [Information Theory & Statistics](/info-theory-course/5b_it_statistics/) *(advanced)* | Method of types, Sanov, hypothesis testing (Stein), Fisher information & Cramér-Rao | Type-class concentration, error-exponent ROC |
    | 5C | [Network Information Theory](/info-theory-course/5c_network_it/) *(advanced)* | Slepian-Wolf, the multiple-access channel, broadcast | Slepian-Wolf rate-region explorer |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 6 — Information Theory for Machine Learning

    > *Where it all pays off: the information-theoretic spine of modern ML.*

    6A and 6B are the gentle entry points from KL and cross-entropy. 6C uses the rate-distortion viewpoint from 5A, 6D is the estimator capstone, 6E combines 5A with the Gaussian-channel/continuous-entropy ideas from 3C, and 6F is the LLM capstone that ties cross-entropy (6A), arithmetic coding (2C), and neural compression (6E) together.

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 6A | [Cross-Entropy, KL & Maximum Entropy](/info-theory-course/6a_crossentropy_maxent/) | Cross-entropy as loss, MLE = min KL, label smoothing, maxent, softmax-as-maxent | Loss-surface explorer, maxent under constraints |
    | 6B | [MDL & Model Selection](/info-theory-course/6b_mdl/) | Description length, two-part codes, Occam's razor, MDL vs BIC/Bayes | MDL model-order selection (poly fit) |
    | 6C | [The Information Bottleneck](/info-theory-course/6c_information_bottleneck/) | Relevant information, the IB Lagrangian, the information plane, the DL caveat | β-slider, information-plane trajectory, 1 animation |
    | 6D | [Neural Estimation of Mutual Information](/info-theory-course/6d_neural_mi/) | Variational MI bounds (DV/NWJ/InfoNCE), MINE, the log-N ceiling, pitfalls | MINE-vs-InfoNCE bake-off on known-MI Gaussian |
    | 6E | [Rate-Distortion, VAEs & Neural Compression](/info-theory-course/6e_vae_compression/) | ELBO as rate-distortion, β-VAE & the R-D plane, bits-back/BB-ANS, learned compression | β-slider tracing a VAE R-D curve, 1 animation |
    | 6F | [Information Theory in Modern LLMs](/info-theory-course/6f_it_llms/) | LLM loss = cross-entropy, bits-per-byte, perplexity, scaling laws as compression curves, LM-is-compression, sampling temperature, BPE & speculative decoding | n-gram + arithmetic coder on your text, scaling-law sliders, temperature/entropy dial |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 7 — Reference

    | # | Module | Description |
    |---|--------|-------------|
    | 7A | [Algorithm & Theorem Study Guide](/info-theory-course/7a_study_guide/) | Every code, algorithm, and theorem in the course — filterable by part, with statements, intuition, and connections |
    | | [Quiz & Flashcards](/info-theory-course/quiz.html) | Interactive study tool with quizzes and spaced repetition across all modules |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ---

    ## Dependency Graph

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
       ├──────────────→ 6C (Info Bottleneck) → 6D (Neural MI) ──┐
       └──────┐                                      │          │
              └──────────────→ 6E (Rate-Distortion & VAEs) ─────┤
                                                                ▼
    1B (KL & MI) → 6A (CE/KL/MaxEnt) → 6B (MDL)         6F (IT in Modern LLMs)
       │                                                        ▲
       └────────────────────────────────────────────────────-─┘
       (2C Arithmetic Coding also feeds 6F)

    all modules ─────────────────────────────────────────────→ 7A (Study Guide)
    ```

    ---

    ## References

    The course points to public references wherever possible: author-hosted PDFs, arXiv papers, OpenReview pages, publisher pages, and library metadata for paid books.

    | Abbrev | Link | Title | Authors | Access |
    |--------|------|-------|---------|--------|
    | MacKay ⭐ | [PDF](https://www.inference.org.uk/itprnn/book.pdf) | Information Theory, Inference, and Learning Algorithms | David MacKay | Free author PDF |
    | Stone ⭐ | [arXiv PDF](https://arxiv.org/pdf/1802.05968) | Information Theory: A Tutorial Introduction | James Stone | Free CC / arXiv |
    | CT ⭐ | [Wiley](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) | Elements of Information Theory (2e) | Cover, Thomas | Paid / library |
    | PW ⭐ | [PDF](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf) | Information Theory: From Coding to Learning | Polyanskiy, Wu | Free draft |
    | Gallager | [Wiley](https://www.wiley-vch.de/de/fachgebiete/ingenieurwesen/elektrotechnik-und-elektronik-10ee/kommunikationstechnik-10ee2/information-theory-and-reliable-communication-978-0-471-29048-3) | Information Theory and Reliable Communication | Gallager | Paid / library |
    | Ash | [Open Library](https://openlibrary.org/books/OL1884498M/Information_theory) | Information Theory | Ash | Paid / borrow |
    | CK | [Cambridge](https://www.cambridge.org/core/books/information-theory/contents/EE0A80439BEAC23B499A71942AFF7B34) | Coding Theorems for Discrete Memoryless Systems | Csiszár, Körner | Paid / library |
    | Yeung | [PDF](https://iest2.ie.cuhk.edu.hk/~whyeung/post/draft2.pdf) | Information Theory and Network Coding | Yeung | Free draft |
    | LC | [Open Library](https://openlibrary.org/books/OL3301344M/Error_control_coding) | Error Control Coding (2e) | Lin, Costello | Paid / borrow |
    | Roth | [Cambridge](https://www.cambridge.org/core/books/introduction-to-coding-theory/377D24BE73F473B15378776B0AE63CA3) | Introduction to Coding Theory | Roth | Paid / library |
    | RU | [PDF](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) | Modern Coding Theory | Richardson, Urbanke | Free EPFL draft |
    | Moser | [Notes](https://moser-isi.ethz.ch/scripts.html) | Coding and Information Theory notes | Moser | Free notes |
    | Grünwald | [arXiv PDF](https://arxiv.org/pdf/math/0406077) | A Tutorial Introduction to the MDL Principle | Grünwald | Free arXiv |
    | ML papers | [arXiv/OpenReview](https://arxiv.org/) | IB, VIB, MINE, InfoNCE, β-VAE, BB-ANS cluster | various | Free papers |
    """)
    return


if __name__ == "__main__":
    app.run()
