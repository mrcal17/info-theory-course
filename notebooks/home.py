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
    - **Textbook links** open the relevant PDF pages for deeper reading
    - **Practice exercises** are at the end of each module — do them

    > **Prerequisite:** a solid grip on probability (random variables, expectation, Bayes, common distributions).
    > This course does **not** re-teach probability — if you want a refresher, see Module 0D of the ML course.

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
    | 0A | [Orientation & Notation](./0a_orientation/) | What information theory is, the bit, log conventions, the three pillars, notation | "20 questions" entropy teaser |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 1 — The Core Measures

    > *Three quantities run the whole field: entropy, relative entropy, mutual information. Build them once, deeply.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 1A | [Entropy & Self-Information](./1a_entropy/) | Surprise, bits, entropy, joint/conditional entropy, chain rule, binary entropy | Biased-coin entropy slider, 1 animation |
    | 1B | [Relative Entropy & Mutual Information](./1b_kl_mutual_information/) | KL divergence, mutual information, the I-diagram, data-processing inequality, Jensen | KL explorer, MI heatmap, 1 animation |
    | 1C | [Entropy Rate & the AEP](./1c_aep/) | Stochastic sources, entropy rate, typical sets, the asymptotic equipartition property | Typical-set sampler, Markov entropy rate, 1 animation |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 2 — Source Coding & Compression

    > *From the source coding theorem straight into compressors you build and run.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 2A | [Source Coding Theorem & Symbol Codes](./2a_source_coding/) | Kraft inequality, prefix codes, optimal length = entropy, Shannon code | Prefix-tree builder, Kraft budget visualizer |
    | 2B | [Huffman Coding](./2b_huffman/) | The algorithm, optimality, extended/block Huffman, limits | Live Huffman tree on text, 1 animation |
    | 2C | [Arithmetic & Range Coding](./2c_arithmetic/) | Stream codes, interval coding, near-optimality, adaptive models | Interval-narrowing visualizer, 1 animation |
    | 2D | [Universal Compression](./2d_lempel_ziv/) | Lempel-Ziv (LZ77/78/W), dictionary coding, universality, gzip/PNG | Dictionary-growth explorer, compression ratio |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 3 — Channels & Reliable Communication

    > *The crown jewel: you can communicate near-perfectly over a noisy channel, up to a hard limit.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 3A | [Channels & Channel Capacity](./3a_channel_capacity/) | DMC, BSC, BEC, capacity as max mutual information, Blahut-Arimoto | Capacity-vs-noise sliders, BA solver |
    | 3B | [The Noisy-Channel Coding Theorem](./3b_channel_coding_theorem/) | Joint typicality, random coding, Fano, the converse, the rate cliff | Error-vs-rate cliff demo, 1 animation |
    | 3C | [Differential Entropy & the Gaussian Channel](./3c_gaussian_channel/) | Continuous entropy, the Gaussian channel, Shannon-Hartley, water-filling | SNR→capacity slider, water-filling, 1 animation |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 4 — Error-Correcting Codes

    > *The practical-coding pillar: how reliability is actually achieved, from Hamming to polar.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 4A | [Linear & Hamming Codes](./4a_linear_codes/) | Generator/parity-check matrices, syndrome decoding, Hamming codes & bound, GF(2) | (7,4) encoder/decoder, syndrome demo |
    | 4B | [Finite Fields, Reed-Solomon & BCH](./4b_reed_solomon/) *(advanced)* | GF(2^m), cyclic codes, RS/BCH, Berlekamp-Massey decoding, real uses | GF arithmetic playground, RS erasure repair |
    | 4C | [Convolutional & Turbo Codes](./4c_convolutional_turbo/) | Convolutional encoders, the trellis, Viterbi, turbo & iterative decoding | Viterbi trellis decoder, BER-vs-SNR, 1 animation |
    | 4D | [LDPC, Polar & Modern Codes](./4d_ldpc_polar/) | Tanner/factor graphs, belief propagation, density evolution, EXIT charts; polar; fountain | BP decoder, density-evolution threshold, 1 animation |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 5 — Lossy Compression & Beyond

    > *Rate-distortion, the statistics bridge, and a taste of multi-user information theory.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 5A | [Rate-Distortion Theory](./5a_rate_distortion/) | The R(D) function, distortion measures, the Gaussian source, reverse water-filling | R(D) curve explorer, 1 animation |
    | 5B | [Information Theory & Statistics](./5b_it_statistics/) *(advanced)* | Method of types, Sanov, hypothesis testing (Stein), Fisher information & Cramér-Rao | Type-class concentration, error-exponent ROC |
    | 5C | [Network Information Theory](./5c_network_it/) *(advanced)* | Slepian-Wolf, the multiple-access channel, broadcast | Slepian-Wolf rate-region explorer |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 6 — Information Theory for Machine Learning

    > *Where it all pays off: the information-theoretic spine of modern ML.*

    | # | Module | Topics | Interactive Elements |
    |---|--------|--------|---------------------|
    | 6A | [Cross-Entropy, KL & Maximum Entropy](./6a_crossentropy_maxent/) | Cross-entropy as loss, MLE = min KL, label smoothing, maxent, softmax-as-maxent | Loss-surface explorer, maxent under constraints |
    | 6B | [MDL & Model Selection](./6b_mdl/) | Description length, two-part codes, Occam's razor, MDL vs BIC/Bayes | MDL model-order selection (poly fit) |
    | 6C | [The Information Bottleneck](./6c_information_bottleneck/) | Relevant information, the IB Lagrangian, the information plane, the DL caveat | β-slider, information-plane trajectory, 1 animation |
    | 6D | [Neural Estimation of Mutual Information](./6d_neural_mi/) | Variational MI bounds (DV/NWJ/InfoNCE), MINE, the log-N ceiling, pitfalls | MINE-vs-InfoNCE bake-off on known-MI Gaussian |
    | 6E | [Rate-Distortion, VAEs & Neural Compression](./6e_vae_compression/) | ELBO as rate-distortion, β-VAE & the R-D plane, bits-back/BB-ANS, learned compression | β-slider tracing a VAE R-D curve, 1 animation |
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ## Part 7 — Reference

    | # | Module | Description |
    |---|--------|-------------|
    | 7A | [Algorithm & Theorem Study Guide](./7a_study_guide/) | Every code, algorithm, and theorem in the course — filterable by part, with statements, intuition, and connections |
    | | [Quiz & Flashcards](./quiz.html) | Interactive study tool with quizzes and spaced repetition across all modules |
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
       ▼               ▼                 ▼
    2A (Source Coding Thm)         3A (Channel Capacity)
       │                                 │
    2B (Huffman) → 2C (Arithmetic) → 2D (LZ)   3B (Noisy-Channel Coding Thm)
                                                 │
                                          3C (Gaussian Channel / water-filling)
                                                 │
                    ┌────────────────────────────┼────────────────────┐
                    ▼                             ▼                     ▼
             4A (Linear/Hamming)           5A (Rate-Distortion)   (3B feeds 4*)
                    │                             │
          4B (RS/BCH)  4C (Conv/Turbo)      5B (IT & Statistics)
                    │       │                     │
                    └──→ 4D (LDPC/Polar)     5C (Network IT)
                                                  │
              1B + 5A ────────────────────────────┘
                    │
              6A (CE/KL/MaxEnt) → 6B (MDL)
                    │                │
              6C (Info Bottleneck) → 6D (Neural MI) → 6E (Rate-Distortion & VAEs)
                    │
              all modules ───────────→ 7A (Study Guide)
    ```

    ---

    ## Textbooks

    Textbook PDFs are stored locally at `C:\Users\landa\info-theory-course\textbooks\`.
    Open from there, or run `start textbooks\<filename>.pdf` from the course directory.
    ⭐ marks the primary anchors.

    | Abbrev | Filename | Title | Authors | Free? |
    |--------|----------|-------|---------|-------|
    | MacKay ⭐ | `MacKay.pdf` | Information Theory, Inference, and Learning Algorithms | David MacKay | Free (author) |
    | Stone ⭐ | `Stone.pdf` | Information Theory: A Tutorial Introduction | James Stone | Free (CC, arXiv) |
    | CT ⭐ | `CoverThomas.pdf` | Elements of Information Theory (2e) | Cover, Thomas | Paid / library |
    | PW ⭐ | `PolyanskiyWu.pdf` | Information Theory: From Coding to Learning | Polyanskiy, Wu | Free (draft) |
    | Gallager | `Gallager.pdf` | Information Theory and Reliable Communication | Gallager | Paid; free notes |
    | Ash | `Ash.pdf` | Information Theory | Ash | Paid (Dover) |
    | CK | `CsiszarKorner.pdf` | Coding Theorems for Discrete Memoryless Systems | Csiszár, Körner | Paid / borrow |
    | Yeung | `Yeung.pdf` | Information Theory and Network Coding | Yeung | Free (draft) |
    | LC | `LinCostello.pdf` | Error Control Coding (2e) | Lin, Costello | Paid |
    | Roth | `Roth.pdf` | Introduction to Coding Theory | Roth | Paid / borrow |
    | RU | `RichardsonUrbanke.pdf` | Modern Coding Theory | Richardson, Urbanke | Free (EPFL draft) |
    | Moser | `Moser.pdf` | A Student's Guide to Coding and Information Theory | Moser, Chen | Paid; free notes |
    | Grünwald | `Grunwald-MDL.pdf` | A Tutorial Introduction to the MDL Principle | Grünwald | Free (arXiv) |
    | MLpapers | `mlpapers/` | IT-for-ML paper cluster (IB, VIB, MINE, InfoNCE, β-VAE, BB-ANS) | various | Free (arXiv) |
    """)
    return


if __name__ == "__main__":
    app.run()
