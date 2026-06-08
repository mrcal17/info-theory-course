import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    # 1C: Entropy Rate & the AEP

    > *"In probability theory the most important thing is the law of large numbers; in information theory it is the AEP."*
    > — paraphrasing Cover & Thomas

    So far we have measured the information in a *single* random variable. But the sources you actually care about — text, audio, sensor streams, DNA, the tokens a language model emits — are not single draws. They are **sequences**, often with deep memory: the letter after `q` is almost surely `u`, today's weather predicts tomorrow's. To compress or transmit a stream we need the right per-symbol cost, and that cost is no longer plain entropy. It is the **entropy rate**.

    Then comes the single most powerful idea in the whole subject. Out of the $2^n$ possible binary strings of length $n$, almost all the probability piles up on a vanishingly small subset — the **typical set** — and inside that set every sequence is *roughly equally likely*, with probability about $2^{-nH}$. This is the **Asymptotic Equipartition Property (AEP)**. It is information theory's law of large numbers, and it is the engine behind the source coding theorem (2A), the channel coding theorem (3B), and rate-distortion (5A). Almost every "you can do X up to rate $R$" result is really a statement about typical sets.

    You built entropy in 1A and KL/mutual information in 1B. Here we let $n \to \infty$ and watch order emerge from randomness. By the end you will have *seen* the typical set form in a live histogram, and you will know exactly why $2^{nH}$ is the magic number that runs the field.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. From One Symbol to a Stochastic Process

    A **stochastic process** $\{X_i\}$ is just a sequence of random variables — possibly dependent — indexed by time. Write $X^n = (X_1, X_2, \dots, X_n)$ for the first $n$ symbols and $x^n = (x_1, \dots, x_n)$ for a particular realization.

    Two special cases anchor everything:

    - **i.i.d. source.** The symbols are independent and identically distributed: $p(x^n) = \prod_{i=1}^n p(x_i)$. A sequence of fair coin flips, or letters drawn one at a time from a fixed frequency table with no memory.
    - **Stationary process.** The statistics do not drift with time: the joint law of $(X_1,\dots,X_k)$ equals that of $(X_{1+t},\dots,X_{k+t})$ for every shift $t$. Real language is (approximately) stationary but very much *not* i.i.d. — it has memory.

    The question that organizes the module: **how much information, on average, does each new symbol of the stream carry once you have seen all the ones before it?** For an i.i.d. source the answer is obviously $H(X)$ — past symbols tell you nothing about the next. For a source *with* memory, knowing the past shrinks your surprise about the future, so the per-symbol information must be *lower*. We need a definition that captures this.

    > [Cover & Thomas Ch 4.1](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) sets up stochastic processes and stationarity; [Ash Ch 6](https://openlibrary.org/books/OL1884498M/Information_theory) develops the ergodic-source picture.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Entropy Rate: Information Per Symbol

    There are two natural ways to ask "how many bits per symbol does this source produce in the long run," and the beautiful fact is that for a stationary process **they agree**.

    **Per-symbol entropy (the average rate).** Take the entropy of a whole block and divide by its length:

    $$H(\mathcal{X}) = \lim_{n \to \infty} \frac{1}{n} H(X_1, X_2, \dots, X_n)$$

    **Conditional entropy rate (the marginal rate).** Ask how much fresh uncertainty the *next* symbol adds, given the entire past:

    $$H'(\mathcal{X}) = \lim_{n \to \infty} H(X_n \mid X_1, X_2, \dots, X_{n-1})$$

    For any stationary stochastic process both limits exist and are **equal**: $H(\mathcal{X}) = H'(\mathcal{X})$. This is exactly the chain-rule intuition from 1A taken to the limit — the average of a converging sequence of conditional entropies converges to the same place as the conditionals themselves (a Cesàro mean).

    **i.i.d. case.** With no memory, $H(X_n \mid X_1,\dots,X_{n-1}) = H(X_n) = H(X)$, so $H(\mathcal{X}) = H(X)$. The entropy rate is just the ordinary entropy. Nothing new.

    **Why this matters.** The entropy rate is the *true* cost of the source. It is the floor on lossless compression for a stream (2A), exactly as $H(X)$ was the floor for a single symbol. Memory is what lets compressors beat the per-symbol entropy: English is about $H \approx 4.1$ bits/letter symbol-by-symbol, but its entropy rate — accounting for all the structure across letters — is only around **1.0–1.3 bits/letter**. That enormous gap is the redundancy of language, and it is why text files shrink so dramatically.

    > [Cover & Thomas Ch 4.2](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) proves the two limits coincide; [MacKay Ch 4](https://www.inference.org.uk/itprnn/book.pdf) frames entropy rate as the per-symbol information content of a source.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. The Entropy Rate of a Markov Chain

    The cleanest source *with* memory is a **first-order Markov chain**: the next symbol depends only on the current one, $p(x_{n} \mid x_1,\dots,x_{n-1}) = p(x_n \mid x_{n-1})$. It is specified by a transition matrix $P$ with entries $P_{ij} = p(\,X_{n}=j \mid X_{n-1}=i\,)$, each row summing to 1.

    Run it long enough and the chain forgets where it started: it settles into a **stationary distribution** $\mu$, the row vector satisfying $\mu P = \mu$ (the left eigenvector of $P$ with eigenvalue 1, normalized to sum to 1). In steady state, symbol $i$ occurs a fraction $\mu_i$ of the time.

    Because the dependence reaches back only one step, the conditional entropy rate collapses to a single conditional entropy, and the limit has a clean closed form:

    $$H(\mathcal{X}) = H(X_2 \mid X_1) = -\sum_{i} \mu_i \sum_{j} P_{ij} \log_2 P_{ij} = \sum_i \mu_i \, H(\text{row } i)$$

    Read it as: *for each state $i$, compute the entropy of its outgoing transition distribution (the surprise of the next symbol given you are in $i$); then average those over how often the chain visits each state.*

    **Worked example.** Take the two-state chain
    $$P = \begin{pmatrix} 0.9 & 0.1 \\ 0.5 & 0.5 \end{pmatrix}.$$
    Solving $\mu P = \mu$ gives $\mu = (5/6,\, 1/6) \approx (0.833,\,0.167)$. The row entropies are $H_2(0.1)\approx 0.469$ bits and $H_2(0.5)=1.0$ bit, so
    $$H(\mathcal{X}) = 0.833 \cdot 0.469 + 0.167 \cdot 1.0 \approx 0.558 \text{ bits/symbol}.$$
    Compare that to the entropy of the marginal alone, $H_2(0.833) \approx 0.650$ bits. The chain's memory has bought us $0.650 - 0.558 \approx 0.09$ bits/symbol of predictability. The slider explorer below lets you feel this tradeoff directly.

    > [Cover & Thomas Ch 4.2–4.3](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) derives the Markov entropy rate and the stationary distribution; [Ash Ch 6](https://openlibrary.org/books/OL1884498M/Information_theory) treats Markov sources in detail.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def stationary(P):
            _vals, _vecs = np.linalg.eig(P.T)
            _idx = int(np.argmin(np.abs(_vals - 1.0)))
            _mu = np.real(_vecs[:, _idx])
            _mu = _mu / _mu.sum()
            return _mu

        def row_entropy(row):
            row = row[row > 0]
            return float(-np.sum(row * np.log2(row)))

        def markov_entropy_rate(P):
            _mu = stationary(P)
            return float(sum(_mu[i] * row_entropy(P[i]) for i in range(len(P)))), _mu

        P = np.array([[0.9, 0.1],
                      [0.5, 0.5]])
        _rate, _mu = markov_entropy_rate(P)

        print("=== Two-state Markov chain ===")
        print(f"transition matrix P =\n{P}")
        print(f"\nstationary distribution mu = {np.round(_mu, 4)}   (check mu @ P = {np.round(_mu @ P, 4)})")
        print(f"row entropies: H(row 0)={row_entropy(P[0]):.4f}, H(row 1)={row_entropy(P[1]):.4f}")
        print(f"\nentropy RATE  H(X) = {_rate:.4f} bits/symbol")

        def h2(p):
            return 0.0 if p in (0.0, 1.0) else float(-p * np.log2(p) - (1 - p) * np.log2(1 - p))

        print(f"marginal entropy H_2(mu_0) = {h2(_mu[0]):.4f} bits  (memoryless would cost this much)")
        print(f"predictability gained by memory ~ {h2(_mu[0]) - _rate:.4f} bits/symbol")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ### Explore: the Markov entropy-rate landscape

    Set the two transition probabilities $a = P(0 \to 1)$ and $b = P(1 \to 0)$. The widget solves for the stationary distribution and shows the entropy rate, the per-row entropies, and the marginal entropy side by side. Push both sliders to $0.5$ and you recover a memoryless fair source ($H = 1$ bit); push them toward the corners and watch the rate plunge as the chain becomes predictable.
    """)
    return


@app.cell
def _(mo):
    p01 = mo.ui.slider(start=0.01, stop=0.99, step=0.01, value=0.1,
                       label="P(0 → 1):  leave state 0")
    p10 = mo.ui.slider(start=0.01, stop=0.99, step=0.01, value=0.5,
                       label="P(1 → 0):  leave state 1")
    mo.vstack([p01, p10])
    return p01, p10


@app.cell
def _(p01, p10):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _a = p01.value
        _b = p10.value
        P = np.array([[1 - _a, _a],
                      [_b, 1 - _b]])

        _mu = np.array([_b, _a]) / (_a + _b)

        def _rowH(r):
            r = r[r > 0]
            return float(-np.sum(r * np.log2(r)))

        _Hrows = np.array([_rowH(P[0]), _rowH(P[1])])
        _rate = float(_mu @ _Hrows)

        def _h2(p):
            return 0.0 if p in (0.0, 1.0) else float(-p * np.log2(p) - (1 - p) * np.log2(1 - p))
        _marginal = _h2(_mu[0])

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(11, 4))

        _ax1.bar([0, 1], _mu, color="seagreen", alpha=0.8)
        _ax1.set_xticks([0, 1])
        _ax1.set_xlabel("state")
        _ax1.set_ylabel("stationary probability")
        _ax1.set_ylim(0, 1)
        _ax1.set_title(f"stationary mu = ({_mu[0]:.3f}, {_mu[1]:.3f})")
        _ax1.grid(True, axis="y", alpha=0.3)

        _labels = ["H(row 0)", "H(row 1)", "entropy\nRATE", "marginal\nH2(mu0)"]
        _vals = [_Hrows[0], _Hrows[1], _rate, _marginal]
        _colors = ["lightsteelblue", "lightsteelblue", "crimson", "gray"]
        _ax2.bar(_labels, _vals, color=_colors, alpha=0.85)
        _ax2.set_ylabel("bits / symbol")
        _ax2.set_ylim(0, 1.05)
        _ax2.axhline(1.0, color="k", ls=":", alpha=0.4)
        _ax2.set_title(f"entropy rate = {_rate:.4f} bits/symbol")
        for _i, _v in enumerate(_vals):
            _ax2.text(_i, _v + 0.02, f"{_v:.3f}", ha="center", fontsize=9)
        _ax2.grid(True, axis="y", alpha=0.3)

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. The Asymptotic Equipartition Property (AEP)

    Now the centerpiece. Take an i.i.d. source and look at the **sample entropy** of a length-$n$ draw — the per-symbol surprisal of the *actual* sequence you got:

    $$-\frac{1}{n}\log_2 p(X^n) = -\frac{1}{n}\sum_{i=1}^n \log_2 p(X_i).$$

    The right-hand side is an average of $n$ i.i.d. terms $-\log_2 p(X_i)$, each with mean $\mathbb{E}[-\log_2 p(X)] = H(X)$. So by the **law of large numbers** this average converges to its expectation. That single observation is the **AEP**:

    $$-\frac{1}{n}\log_2 p(X_1, X_2, \dots, X_n) \;\xrightarrow[n\to\infty]{}\; H(X) \quad \text{(in probability).}$$

    Stare at what this says. The *probability* of the sequence you drew satisfies, with overwhelming likelihood for large $n$,

    $$p(X^n) \approx 2^{-nH}.$$

    Almost every long sequence the source emits has **nearly the same probability** $2^{-nH}$ — hence "equipartition," an equal partition of probability. A wildly biased coin with $P(\text{heads})=0.9$ does *not* usually produce all-heads (the single most probable string!); it produces strings with about $90\%$ heads, and there are astronomically many of those, each individually rare but collectively carrying all the probability.

    For ergodic sources with memory the AEP still holds with $H$ replaced by the **entropy rate** $H(\mathcal{X})$ — this is the Shannon–McMillan–Breiman theorem. The i.i.d. version is all we need to build the intuition, and it is what the sampler below makes you watch.

    > [Cover & Thomas Ch 3](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) is the canonical AEP chapter; [MacKay Ch 4](https://www.inference.org.uk/itprnn/book.pdf) calls this the "Shannon information content" concentrating; [Ash Ch 6](https://openlibrary.org/books/OL1884498M/Information_theory) gives the measure-theoretic statement.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(0)
        _p = np.array([0.9, 0.1])
        _H = float(-np.sum(_p * np.log2(_p)))
        _symbols = np.arange(len(_p))

        print(f"Biased coin: P = {_p},   entropy H = {_H:.4f} bits/symbol\n")
        print(f"{'n':>7} | {'mean -1/n log2 p(x^n)':>24} | {'spread (std)':>12}")
        print("-" * 50)
        for _n in [1, 5, 20, 100, 1000, 10000]:
            _draws = _rng.choice(_symbols, size=(400, _n), p=_p)
            _logp = np.log2(_p)[_draws].sum(axis=1)
            _sample_entropy = -_logp / _n
            print(f"{_n:>7} | {_sample_entropy.mean():>24.4f} | {_sample_entropy.std():>12.4f}")
        print(f"\nAs n grows the sample entropy concentrates at H = {_H:.4f}, and the spread -> 0.")
        print("That concentration IS the AEP (law of large numbers for -log p).")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ### Watch it happen: the typical-set sampler

    Drag $n$ and watch the histogram of the sample entropy $-\tfrac1n\log_2 p(x^n)$ over many random draws. At small $n$ it is wide and lumpy. As $n$ grows it **collapses onto a spike at $H$** — the red line. This collapse is the AEP made visible: nearly all the probability mass migrates to sequences whose per-symbol surprisal is essentially $H$. Those are exactly the **typical sequences**.
    """)
    return


@app.cell
def _(mo):
    n_slider = mo.ui.slider(start=1, stop=400, step=1, value=10,
                            label="block length n")
    bias_slider = mo.ui.slider(start=0.05, stop=0.95, step=0.05, value=0.8,
                               label="P(heads)")
    mo.vstack([n_slider, bias_slider])
    return bias_slider, n_slider


@app.cell
def _(bias_slider, n_slider):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _ph = bias_slider.value
        _p = np.array([_ph, 1 - _ph])
        _H = float(-np.sum(_p[_p > 0] * np.log2(_p[_p > 0])))
        _n = n_slider.value

        _rng = np.random.default_rng(1)
        _trials = 4000
        _draws = _rng.choice([0, 1], size=(_trials, _n), p=_p)
        _logp_per_symbol = np.log2(_p)
        _sample_entropy = -_logp_per_symbol[_draws].sum(axis=1) / _n

        _fig, _ax = plt.subplots(figsize=(8, 4.2))
        _xmax = max(1.0, float(_sample_entropy.max()) * 1.05)
        _bins = np.linspace(0, _xmax, 41)
        _ax.hist(_sample_entropy, bins=_bins, color="steelblue", alpha=0.8,
                 density=True, edgecolor="white", linewidth=0.3)
        _ax.axvline(_H, color="red", lw=2.5, label=f"H = {_H:.3f} bits")
        _ax.axvline(_sample_entropy.mean(), color="black", ls="--", lw=1.5,
                    label=f"sample mean = {_sample_entropy.mean():.3f}")
        _ax.set_xlim(0, _xmax)
        _ax.set_xlabel(r"sample entropy   $-\frac{1}{n}\log_2 p(x^n)$   (bits/symbol)")
        _ax.set_ylabel("density")
        _ax.set_title(f"n = {_n}:  std = {_sample_entropy.std():.4f}   "
                      f"(shrinks like 1/sqrt(n) toward the spike at H)")
        _ax.legend(loc="upper left")
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.vstack([
        mo.Html('<img src="../animations/rendered/TypicalSet.gif" alt="Animation of probability mass concentrating into the typical set as block length grows" loading="lazy" style="max-width: 100%; height: auto;">'),
        mo.md("*Animation: as block length grows, probability mass concentrates on the typical set.*"),
    ])
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Typical Set and Its Size $\approx 2^{nH}$

    The AEP partitions the $|\mathcal{X}|^n$ possible sequences into two camps. Fix a tolerance $\epsilon > 0$. The **typical set** $A_\epsilon^{(n)}$ is the collection of sequences whose sample entropy is within $\epsilon$ of $H$:

    $$A_\epsilon^{(n)} = \Big\{\, x^n : \Big| -\tfrac{1}{n}\log_2 p(x^n) - H \Big| \le \epsilon \,\Big\} = \Big\{\, x^n : 2^{-n(H+\epsilon)} \le p(x^n) \le 2^{-n(H-\epsilon)} \,\Big\}.$$

    Three facts follow directly from the AEP, and together they are the workhorse of the entire field:

    1. **It is almost certain.** $\Pr\!\big(X^n \in A_\epsilon^{(n)}\big) \to 1$ as $n \to \infty$. The source essentially *only* emits typical sequences.
    2. **Its members are nearly equiprobable**, each with $p(x^n) \approx 2^{-nH}$.
    3. **Its size is about $2^{nH}$.** Precisely $(1-\epsilon)\,2^{n(H-\epsilon)} \le \big|A_\epsilon^{(n)}\big| \le 2^{n(H+\epsilon)}$ for large $n$.

    **The punchline.** There are $2^{n\log_2|\mathcal{X}|}$ sequences in total, but only $\approx 2^{nH}$ typical ones. When $H < \log_2|\mathcal{X}|$ — i.e. whenever the source is not uniform — the typical set is an **exponentially tiny sliver** of all sequences, yet it holds essentially all the probability. For the $P(\text{heads})=0.9$ coin, $H \approx 0.469$, so of the $2^{100}\approx 1.3\times10^{30}$ length-100 strings, only about $2^{46.9}\approx 1.3\times10^{14}$ are typical — a factor of $10^{16}$ smaller, carrying $\approx$ all the mass.

    **Weak vs. strong typicality.** This module uses **weak** (entropy) typicality: the average surprisal is close to $H$. In finite-alphabet network and rate-distortion proofs, authors often use **strong** typicality instead: the empirical frequency of each symbol (or pair of symbols) is close to its true probability. Strong typicality gives convenient counting and Markov-lemma tools; weak typicality is broader and cleaner for the first pass. When 5A and 5C invoke typicality later, read that as the stronger empirical-frequency version unless stated otherwise.

    This is *exactly* why compression works: assign short codewords (about $nH$ bits, one per typical sequence) to the typical set and throw a flag bit at everything else. You will lose data only with probability $\to 0$, and you will hit the entropy floor. That argument, made rigorous, is the **source coding theorem** of Module 2A. The same typical-set machinery — applied to *jointly* typical input/output pairs — proves the channel coding theorem in 3B. Learn it once here; reuse it everywhere.

    > [Cover & Thomas Ch 3.1–3.2](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) states and proves the three typical-set properties; [MacKay Ch 4.4](https://www.inference.org.uk/itprnn/book.pdf) draws the "typical set inside the space of all strings" picture.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(2)
        _p = np.array([0.9, 0.1])
        _H = float(-np.sum(_p * np.log2(_p)))
        _logp = np.log2(_p)
        _n = 100
        _eps = 0.1

        _trials = 200000
        _draws = _rng.choice([0, 1], size=(_trials, _n), p=_p)
        _sample_entropy = -_logp[_draws].sum(axis=1) / _n
        _is_typical = np.abs(_sample_entropy - _H) <= _eps
        _frac_typical = _is_typical.mean()

        _total_strings = 2.0 ** _n
        _typ_size_est = 2.0 ** (_n * _H)

        print(f"=== Typical set for the P(heads)=0.9 coin,  n={_n},  eps={_eps} ===")
        print(f"entropy H = {_H:.4f} bits/symbol\n")
        print(f"P(X^n is typical), empirical over {_trials} draws : {_frac_typical:.4f}")
        print("(already near 1 at n=100 — and it -> 1 as n grows)\n")
        print(f"total # of length-{_n} binary strings  = 2^{_n}      = {_total_strings:.3e}")
        print(f"approx # of TYPICAL strings            ~ 2^(nH)={_n * _H:.1f} = {_typ_size_est:.3e}")
        print(f"typical set is a fraction ~ {_typ_size_est / _total_strings:.3e} of all strings")
        print(f"   ...yet it carries ~{100 * _frac_typical:.1f}% of the probability.")
        print("\nThe most probable single string (all heads) has p = 0.9^100 =",
              f"{0.9 ** _n:.3e},")
        print(f"   but its sample entropy is {-_logp[0]:.4f} != H, so it is ATYPICAL.")
        print("Typicality is about being representative, not about being most probable.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Typical vs. Most-Probable: a Crucial Distinction

    A trap worth disarming explicitly. The single **most probable** sequence from a biased source is the constant one (all heads for a heads-biased coin). Yet that sequence is **atypical** — its sample entropy is $0$, not $H$. How can the most likely outcome be untypical?

    Because typicality is a property of the *set*, not the individual. Any one specific string with $\approx 90\%$ heads is *less* probable than all-heads, but there are *combinatorially many* such strings — about $\binom{n}{0.1n} \approx 2^{nH_2(0.1)} = 2^{nH}$ of them — and their probabilities sum to nearly 1. The mode is a lonely peak; the typical set is a vast plateau that contains all the volume.

    This is the same phenomenon as a high-dimensional Gaussian, where almost all the probability mass sits in a thin shell *away* from the (most-dense) center. It is the discrete cousin of "concentration of measure," and it will reappear constantly in machine learning: the samples your model actually sees live on a typical-set-like manifold, not at the mode of the data distribution. The demo below counts how often the literal most-probable string shows up versus how often a *typical* one does — the mode essentially never appears.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(3)
        _p = np.array([0.9, 0.1])
        _H = float(-np.sum(_p * np.log2(_p)))
        _logp = np.log2(_p)
        _n = 50
        _eps = 0.1
        _trials = 100000

        _draws = _rng.choice([0, 1], size=(_trials, _n), p=_p)
        _num_heads = (_draws == 0).sum(axis=1)
        _sample_entropy = -_logp[_draws].sum(axis=1) / _n

        _all_heads = (_num_heads == _n).mean()
        _typical = (np.abs(_sample_entropy - _H) <= _eps).mean()

        print(f"=== Mode vs. typical set, n={_n}, P(heads)=0.9 ===\n")
        print(f"theoretical p(all heads) = 0.9^{_n} = {0.9 ** _n:.4e}  (the single MOST probable string)")
        print(f"observed fraction of draws that were all-heads : {_all_heads:.5f}")
        print(f"observed fraction of draws that were TYPICAL   : {_typical:.5f}\n")
        print(f"average # of heads per draw : {_num_heads.mean():.2f}  (expected {0.9 * _n:.1f})")
        print("The source overwhelmingly emits sequences near 90% heads — the typical region —")
        print("and essentially never the most-probable all-heads string. Volume beats peak height.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    The entropy rate and the AEP are not classical curiosities — they are load-bearing in modern ML:

    - **Language models and perplexity.** A language model is exactly an estimator of the entropy rate of text. Its **perplexity**, $2^{\text{cross-entropy}}$, is the model's estimate of the effective branching factor per token — its claim about the source's entropy rate. Lower perplexity = a model that has captured more of the sequence's memory. The cross-entropy training loss is the AEP quantity $-\tfrac1n\log_2 p(x^n)$ averaged over data, with $p$ supplied by the model.
    - **Why generative samples look "average."** Sampling from a high-dimensional model lands you in its typical set, not at its mode. This is why naive maximum-likelihood decoding of a language model produces degenerate, repetitive text (the mode is atypical!), and why **temperature** and nucleus/top-$p$ sampling exist — to steer generation toward the typical region instead of the lonely peak.
    - **Compression = density modeling.** Because optimal code length is $-\log_2 p(x)$ and the achievable rate is the entropy rate, *any* good probabilistic model of a stream is a compressor, and any compressor is implicitly a model. This equivalence powers neural compression (6E) and the MDL view of learning (6B).
    - **Concentration of measure.** The "typical set is a thin shell" intuition is the discrete face of the high-dimensional concentration phenomena behind generalization bounds, the curse of dimensionality, and why training data lives on a low-entropy manifold.
    - **Ergodicity and estimation.** Estimating $H(\mathcal{X})$ from a single long trajectory (rather than many independent runs) only works because of ergodicity — the same assumption that lets us train on one long corpus.

    Next, **Part 2** cashes the AEP in: Module 2A turns "the typical set has size $2^{nH}$" into the **source coding theorem** and the first real compressors, and 2B–2D build Huffman, arithmetic, and Lempel–Ziv codes that approach the entropy-rate floor on actual data.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise gives a spec and a skeleton — fill in the `...` and `TODO` blanks. These cement the loop from definitions to working numpy for every idea in the module.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Sample Entropy of a Draw

    Write `sample_entropy(seq, p)` that takes a sequence of symbol indices `seq` and a probability vector `p`, and returns the per-symbol surprisal $-\tfrac1n\log_2 p(x^n) = -\tfrac1n\sum_i \log_2 p(x_i)$. Then draw a long sequence from a biased coin and confirm the value lands near $H$.
    """)
    return
@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    <details>
    <summary><strong>Show solution / self-check</strong></summary>

    Try the next code cell first. Then compare your filled-in cell with the commented `print(...)` checks and expected values in that cell. If the exercise is qualitative or simulation-based, the solution should run without errors and satisfy the invariant named in the prompt.

    </details>
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def sample_entropy(seq, p):
            seq = np.asarray(seq)
            p = np.asarray(p, dtype=float)
            # TODO: look up log2 p for each symbol in seq, sum, divide by -n
            _result = ...
            return _result

        # rng = np.random.default_rng(0)
        # p = np.array([0.8, 0.2])
        # H = -np.sum(p * np.log2(p))
        # seq = rng.choice([0, 1], size=5000, p=p)
        # print(sample_entropy(seq, p), "vs H =", H)   # expect both ~0.722

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: The AEP Concentration

    Confirm the AEP empirically. For a fixed biased source, draw many length-$n$ sequences for several values of $n$, compute the sample entropy of each, and report the mean and standard deviation. The mean should sit at $H$ for all $n$; the std should shrink toward 0 as $n$ grows (it falls like $1/\sqrt{n}$).
    """)
    return
@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    <details>
    <summary><strong>Show solution / self-check</strong></summary>

    Try the next code cell first. Then compare your filled-in cell with the commented `print(...)` checks and expected values in that cell. If the exercise is qualitative or simulation-based, the solution should run without errors and satisfy the invariant named in the prompt.

    </details>
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(1)
        p = np.array([0.7, 0.3])
        H = float(-np.sum(p * np.log2(p)))
        logp = np.log2(p)

        for n in [10, 100, 1000, 10000]:
            # TODO: draw 500 sequences of length n; compute sample entropy of each
            # hint: draws = rng.choice([0, 1], size=(500, n), p=p)
            draws = ...
            sample_ent = ...   # shape (500,)
            # print(f"n={n:6d}  mean={sample_ent.mean():.4f} (H={H:.4f})  std={sample_ent.std():.4f}")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Building the Typical Set

    For $n=20$ and a biased coin, enumerate (or sample) sequences and classify each as typical (sample entropy within $\epsilon$ of $H$) or not. Estimate (a) the probability mass on the typical set and (b) its size, and compare the size to the prediction $2^{nH}$.
    """)
    return
@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    <details>
    <summary><strong>Show solution / self-check</strong></summary>

    Try the next code cell first. Then compare your filled-in cell with the commented `print(...)` checks and expected values in that cell. If the exercise is qualitative or simulation-based, the solution should run without errors and satisfy the invariant named in the prompt.

    </details>
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(2)
        p = np.array([0.75, 0.25])
        H = float(-np.sum(p * np.log2(p)))
        logp = np.log2(p)
        n = 20
        eps = 0.15

        draws = rng.choice([0, 1], size=(50000, n), p=p)
        sample_ent = -logp[draws].sum(axis=1) / n

        # TODO: boolean mask of which draws are typical (|sample_ent - H| <= eps)
        is_typical = ...

        # TODO: estimate P(typical) as the fraction of draws that are typical
        prob_typical = ...

        # print(f"H={H:.4f}, P(typical)~{prob_typical:.4f}")
        # print(f"predicted typical-set size ~ 2^(nH) = {2.0**(n*H):.3e} of 2^{n} total")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Markov Stationary Distribution & Entropy Rate

    Given a 2x2 transition matrix `P`, compute the stationary distribution $\mu$ (left eigenvector of $P$ for eigenvalue 1, normalized) and then the entropy rate $H(\mathcal{X}) = \sum_i \mu_i H(\text{row } i)$. Verify on the chain with rows $(0.9, 0.1)$ and $(0.5, 0.5)$ (expect rate $\approx 0.558$).
    """)
    return
@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    <details>
    <summary><strong>Show solution / self-check</strong></summary>

    Try the next code cell first. Then compare your filled-in cell with the commented `print(...)` checks and expected values in that cell. If the exercise is qualitative or simulation-based, the solution should run without errors and satisfy the invariant named in the prompt.

    </details>
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def row_entropy(row):
            row = np.asarray(row, dtype=float)
            row = row[row > 0]
            return float(-np.sum(row * np.log2(row)))

        def entropy_rate(P):
            P = np.asarray(P, dtype=float)
            # TODO: stationary mu = left eigenvector of P (= eigenvector of P.T) with eigenvalue 1
            # hint: vals, vecs = np.linalg.eig(P.T); pick the eigenvalue nearest 1; take real part; normalize
            mu = ...
            # TODO: rate = sum_i mu[i] * row_entropy(P[i])
            rate = ...
            return rate, mu

        P = np.array([[0.9, 0.1],
                      [0.5, 0.5]])
        # rate, mu = entropy_rate(P)
        # print(f"mu = {mu},  rate = {rate:.4f}")   # expect mu~[0.833,0.167], rate~0.558

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Entropy Rate by Simulation

    Don't trust the closed form — earn it. Simulate a long trajectory of the Markov chain from Exercise 4, then estimate its entropy rate two ways: (a) empirically as $-\tfrac1n\log_2 p(x^n)$ along the trajectory using the true transition probabilities, and (b) compare to the closed-form $\sum_i \mu_i H(\text{row } i)$. They should match.

    This is the very last code cell — it carries the module-level `app.run()` guard at the end of the file.
    """)
    return
@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    <details>
    <summary><strong>Show solution / self-check</strong></summary>

    Try the next code cell first. Then compare your filled-in cell with the commented `print(...)` checks and expected values in that cell. If the exercise is qualitative or simulation-based, the solution should run without errors and satisfy the invariant named in the prompt.

    </details>
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(7)
        P = np.array([[0.9, 0.1],
                      [0.5, 0.5]])
        N = 200000

        # simulate the chain
        states = np.empty(N, dtype=int)
        states[0] = 0
        for t in range(1, N):
            states[t] = rng.choice([0, 1], p=P[states[t - 1]])

        # TODO: empirical rate = -(1/(N-1)) * sum_t log2 P[ states[t-1], states[t] ]
        # (this is the sample entropy of the trajectory under the true transition law)
        trans_logp = ...      # array of log2 P[prev, next] over the trajectory
        emp_rate = ...

        def row_entropy(row):
            row = row[row > 0]
            return float(-np.sum(row * np.log2(row)))

        # TODO: stationary distribution mu (reuse your Exercise 4 solution), then the closed form
        mu = ...              # expect ~ [0.833, 0.167]
        closed_form = ...     # sum_i mu[i] * row_entropy(P[i])

        # print(f"empirical rate = {emp_rate:.4f},  closed form = {closed_form:.4f}")
        # both should be ~0.558

    _run()
    return


if __name__ == "__main__":
    app.run()
