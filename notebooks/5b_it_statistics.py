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
    # 5B: Information Theory & Statistics

    > *"The empirical distribution is the sufficient statistic. Everything else is bookkeeping."*
    > — paraphrasing the method of types

    *(Optional / advanced module. The course's critical path runs straight through 5A into Part 6; this module is a deep, beautiful side-quest you can take whenever you want to see why information theory and statistics are the same subject wearing two hats.)*

    Up to now entropy and KL divergence have been *descriptive* — they told us about compression, channels, and codes. This module shows that they are also the **native language of statistics**: the exponents that govern how fast estimation errors shrink, how fast hypothesis-test errors shrink, and how much a sample can possibly tell you about a parameter are *all* relative-entropy and Fisher-information quantities.

    The engine that makes this work is the **method of types** — the observation that for a sequence drawn i.i.d. from a finite alphabet, the only thing that matters is the *empirical histogram* (the "type"), and the probability of seeing a given histogram decays exponentially with rate equal to a KL divergence. From this one idea fall the AEP, Sanov's theorem (the theory of rare events), Stein's lemma (the optimal hypothesis test), and — in the smooth limit — Fisher information and the Cramér–Rao bound.

    By the end you will be able to predict the *exponential rate* at which a statistical procedure succeeds or fails, just by computing a divergence. That is the kind of superpower that, once seen, you cannot un-see.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. The Method of Types

    Draw a sequence $x^n = (x_1, \dots, x_n)$ i.i.d. from a distribution $Q$ over a finite alphabet $\mathcal{X}$ of size $|\mathcal{X}| = a$. The **type** (empirical distribution) of the sequence is just its normalized histogram:

    $$P_{x^n}(x) = \frac{1}{n} \, N(x \mid x^n), \qquad x \in \mathcal{X},$$

    where $N(x \mid x^n)$ counts how many times symbol $x$ appears. The type is a probability vector; the set of *all* types of length-$n$ sequences is $\mathcal{P}_n$.

    The first miracle is a **counting** fact. The number of possible types is small — it grows only *polynomially* in $n$:

    $$|\mathcal{P}_n| = \binom{n + a - 1}{a - 1} \le (n+1)^a.$$

    There are exponentially many sequences ($a^n$ of them) but only polynomially many *types*. So on average, an enormous number of sequences share each type. This polynomial-vs-exponential gap is the lever behind every theorem in this module.

    The second miracle is that the probability $Q$ assigns to a sequence depends **only on its type** — and is governed by entropy and KL divergence. If $x^n$ has type $P$, then

    $$Q^n(x^n) = \prod_x Q(x)^{n P(x)} = 2^{-n\,(H(P) + D(P \,\|\, Q))}.$$

    The cross-entropy $H(P) + D(P\|Q)$ controls the per-sequence probability. When $P = Q$ this is just $2^{-nH(Q)}$ — the familiar AEP statement, recovered as a special case.

    > [Cover & Thomas Ch 11.1](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) is the canonical treatment of types.
    > [Csiszár & Körner Ch 2](file:///C:/Users/landa/info-theory-course/textbooks/CsiszarKorner.pdf) is the deep source — the "method of types" is essentially their invention.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        from math import comb

        _a = 4
        print("=== Types grow polynomially, sequences exponentially ===")
        print(f"alphabet size a = {_a}\n")
        print(f"{'n':>5} | {'# sequences a^n':>22} | {'# types':>12} | {'bound (n+1)^a':>14}")
        print("-" * 62)
        for _n in [2, 5, 10, 50, 100]:
            _n_seq = _a ** _n
            _n_types = comb(_n + _a - 1, _a - 1)
            _bound = (_n + 1) ** _a
            print(f"{_n:>5} | {_n_seq:>22.3e} | {_n_types:>12} | {_bound:>14}")

        print("\n=== Q^n(x^n) depends only on the type ===")
        _rng = np.random.default_rng(0)
        _Q = np.array([0.5, 0.25, 0.15, 0.10])
        _n = 12
        _x = _rng.choice(_a, size=_n, p=_Q)
        _counts = np.bincount(_x, minlength=_a)
        _P = _counts / _n

        _logprob_direct = np.sum(np.log2(_Q[_x]))
        _H = -np.sum(_P[_P > 0] * np.log2(_P[_P > 0]))
        _D = np.sum(_P[_P > 0] * np.log2(_P[_P > 0] / _Q[_P > 0]))
        _logprob_type = -_n * (_H + _D)

        print(f"sampled type P = {np.round(_P, 3)}")
        print(f"H(P) = {_H:.4f},  D(P||Q) = {_D:.4f} bits")
        print(f"log2 Q^n(x^n) directly        = {_logprob_direct:.4f}")
        print(f"log2 Q^n(x^n) via -n(H+D)     = {_logprob_type:.4f}   (must match)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Type Classes and Their Sizes

    The **type class** $T(P)$ is the set of all length-$n$ sequences with type exactly $P$:

    $$T(P) = \{\, x^n \in \mathcal{X}^n : P_{x^n} = P \,\}.$$

    Its size is a multinomial coefficient, $|T(P)| = \binom{n}{nP(x_1), \dots, nP(x_a)}$. Stirling's approximation turns that factorial into an *entropy*, giving the central size estimate of the whole theory:

    $$\frac{1}{(n+1)^a}\, 2^{nH(P)} \;\le\; |T(P)| \;\le\; 2^{nH(P)}.$$

    A type class holds roughly $2^{nH(P)}$ sequences — the higher the entropy of the type, the more ways to arrange it. Combine this with the per-sequence probability from Section 1 and you get the probability that an i.i.d.-$Q$ sample lands in the type class $T(P)$:

    $$Q^n(T(P)) = |T(P)| \cdot 2^{-n(H(P)+D(P\|Q))} \;\doteq\; 2^{-n\,D(P\|Q)}.$$

    Read that twice. **The probability of observing the empirical distribution $P$ when the truth is $Q$ decays exponentially with rate $D(P\|Q)$.** The most probable type is $P = Q$ (rate zero), and every other histogram is exponentially suppressed by exactly its KL distance from the truth. KL divergence is *literally* the rate function for how surprised you should be by an empirical histogram.

    The $\doteq$ symbol means "equal to first order in the exponent": $a_n \doteq b_n$ iff $\frac1n \log \frac{a_n}{b_n} \to 0$. The polynomial $(n+1)^a$ factors are exactly the terms that vanish under $\frac1n\log(\cdot)$, which is why they never appear in the final exponents.

    > [Cover & Thomas Ch 11.1–11.2](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) proves the size bounds and the $Q^n(T(P)) \doteq 2^{-nD(P\|Q)}$ estimate.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        from math import comb, lgamma

        def _log2_multinomial(counts):
            _n = sum(counts)
            _lg = lgamma(_n + 1) - sum(lgamma(c + 1) for c in counts)
            return _lg / np.log(2)

        _a = 3
        _n = 60
        _Q = np.array([0.6, 0.3, 0.1])

        print("=== Type-class size vs 2^{nH(P)} (a=3, n=60) ===\n")
        print(f"{'type P':>22} | {'log2|T(P)|':>11} | {'nH(P)':>8} | {'Q^n(T(P))':>11} | {'2^-nD':>10}")
        print("-" * 76)
        for _counts in [(20, 20, 20), (36, 18, 6), (50, 8, 2), (58, 1, 1)]:
            _P = np.array(_counts) / _n
            _log_size = _log2_multinomial(_counts)
            _H = -np.sum(_P[_P > 0] * np.log2(_P[_P > 0]))
            _D = np.sum(_P[_P > 0] * np.log2(_P[_P > 0] / _Q[_P > 0]))
            _logQ = _log_size - _n * (_H + _D)
            _approx = -_n * _D
            print(f"{str(np.round(_P,2)):>22} | {_log_size:>11.2f} | {_n*_H:>8.2f} | "
                  f"{_logQ:>11.2f} | {_approx:>10.2f}")

        print("\nNote: log2|T(P)| tracks nH(P) (gap < a*log2(n+1)).")
        print("And the true type P=Q=(0.6,0.3,0.1) has the LARGEST Q^n(T(P)) (closest to 0).")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Interactive: Type-Class Concentration

    Here is the AEP and the method of types made visible. Fix a true distribution $Q$ and draw many i.i.d. samples of length $n$. For each sample, measure the KL divergence $D(P_{x^n}\|Q)$ between its empirical type and the truth. As $n$ grows, **the empirical type collapses onto $Q$** — almost all the probability mass concentrates in types with tiny KL divergence, exactly as $Q^n(T(P)) \doteq 2^{-nD(P\|Q)}$ predicts.

    Drag $n$ and watch the histogram of $D(P_{x^n}\|Q)$ slam toward zero. This concentration is *the* reason large-sample statistics works: the histogram you observe is a faithful, exponentially-reliable picture of the truth.
    """)
    return


@app.cell
def _(mo):
    type_n = mo.ui.slider(start=5, stop=500, step=5, value=20, label="n = sample length")
    type_n
    return (type_n,)


@app.cell
def _(type_n):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _rng = np.random.default_rng(7)
        _Q = np.array([0.5, 0.3, 0.2])
        _a = len(_Q)
        _n = type_n.value
        _trials = 4000

        _draws = _rng.choice(_a, size=(_trials, _n), p=_Q)
        _D = np.empty(_trials)
        for _t in range(_trials):
            _counts = np.bincount(_draws[_t], minlength=_a)
            _P = _counts / _n
            _m = _P > 0
            _D[_t] = np.sum(_P[_m] * np.log2(_P[_m] / _Q[_m]))

        _mean_D = _D.mean()
        _expected = (_a - 1) / (2 * _n * np.log(2))

        _fig, _ax = plt.subplots(figsize=(7, 4))
        _ax.hist(_D, bins=40, color="steelblue", alpha=0.8, density=True)
        _ax.axvline(_mean_D, color="red", ls="--", lw=2,
                    label=f"mean D = {_mean_D:.4f} bits")
        _ax.set_xlabel("D(empirical type || Q)   (bits)")
        _ax.set_ylabel("density over samples")
        _ax.set_xlim(0, max(0.5, 1.2 * np.quantile(_D, 0.99)))
        _ax.set_title(f"Type concentration: n = {_n}    "
                      f"E[D] approx (a-1)/(2n ln2) = {_expected:.4f}")
        _ax.legend()
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. Sanov's Theorem — The Theory of Rare Events

    Section 2 told us the probability of *one* type. Sanov's theorem aggregates over a whole **set** $E$ of distributions and asks: what is the probability that the empirical type lands in $E$ when the truth is $Q$? Since each type $P \in E$ contributes $\doteq 2^{-nD(P\|Q)}$ and there are only polynomially many types, the sum is dominated by its single largest term — the type in $E$ *closest to $Q$ in KL*:

    $$Q^n(P_{x^n} \in E) \;\doteq\; 2^{-n\,D(P^\star \,\|\, Q)}, \qquad P^\star = \arg\min_{P \in E} D(P\|Q).$$

    This is a **large-deviations** statement: rare events happen, but their probability decays exponentially at a rate set by the *cheapest* way to make them happen. $P^\star$ is the **information projection** of $Q$ onto $E$ — the most likely "explanation" for the rare event, the path of least KL resistance.

    **Worked example (the unfair-average problem).** Roll a fair die ($Q$ uniform on $\{1,\dots,6\}$, so $\mathbb{E}=3.5$) $n$ times. What is the probability the sample *average* is at least $4$? The constraint set is $E = \{P : \sum_i i\,P(i) \ge 4\}$. Sanov says the exponent is $D(P^\star\|Q)$ where $P^\star$ is the maximum-entropy (closest-to-uniform) distribution with mean exactly $4$ — a tilted (exponential-family) distribution $P^\star(i) \propto e^{\lambda i}$. We solve for $\lambda$ and read off the rate below.

    The punchline for statistics: **the probability of being fooled by data decays exponentially, and the rate is a KL divergence to the boundary of the "fooling" set.** Confidence levels, $p$-values, and false-alarm rates are all secretly large-deviation exponents.

    > [Cover & Thomas Ch 11.4–11.6](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) for Sanov + the conditional-limit / I-projection theorems.
    > [Polyanskiy & Wu](file:///C:/Users/landa/info-theory-course/textbooks/PolyanskiyWu.pdf) gives the modern large-deviations framing.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _faces = np.arange(1, 7)
        _Q = np.full(6, 1 / 6)
        _target_mean = 4.0

        def _tilt(lam):
            _w = np.exp(lam * _faces)
            _P = _w / _w.sum()
            return _P, float(np.dot(_faces, _P))

        _lo, _hi = 0.0, 5.0
        for _ in range(80):
            _mid = 0.5 * (_lo + _hi)
            _, _m = _tilt(_mid)
            if _m < _target_mean:
                _lo = _mid
            else:
                _hi = _mid
        _lam = 0.5 * (_lo + _hi)
        _Pstar, _mean = _tilt(_lam)
        _D = np.sum(_Pstar * np.log2(_Pstar / _Q))

        print("=== Sanov: P(sample mean of a fair die >= 4) ===")
        print(f"tilting parameter lambda = {_lam:.4f}")
        print(f"I-projection P* = {np.round(_Pstar, 4)}   (mean = {_mean:.4f})")
        print(f"exponent D(P*||Q) = {_D:.4f} bits/roll\n")

        _rng = np.random.default_rng(3)
        print(f"{'n':>4} | {'Sanov 2^-nD':>14} | {'Monte Carlo':>14}")
        print("-" * 40)
        for _n in [10, 20, 40, 80]:
            _pred = 2.0 ** (-_n * _D)
            _trials = 400_000
            _rolls = _rng.integers(1, 7, size=(_trials, _n))
            _emp = float(np.mean(_rolls.mean(axis=1) >= _target_mean))
            print(f"{_n:>4} | {_pred:>14.3e} | {_emp:>14.3e}")
        print("\nSame exponential slope; the polynomial prefactor explains the constant gap.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Binary Hypothesis Testing & Stein's Lemma

    Now the central application. You observe $x^n$ and must decide between two competing explanations:

    $$H_0: x^n \sim P_0^n \qquad\text{vs.}\qquad H_1: x^n \sim P_1^n.$$

    Two error types: a **type-I error** (false alarm) rejects $H_0$ when it is true, with probability $\alpha_n$; a **type-II error** (miss) accepts $H_0$ when $H_1$ is true, with probability $\beta_n$. The **Neyman–Pearson lemma** says the optimal test — for any fixed $\alpha$ — thresholds the **log-likelihood ratio**:

    $$\text{decide } H_1 \iff \frac{1}{n}\log_2 \frac{P_1^n(x^n)}{P_0^n(x^n)} \;>\; \tau.$$

    By the method of types, both error probabilities are again governed by KL divergences. Holding the false-alarm rate fixed at $\alpha_n \le \epsilon$, the best possible miss rate decays as

    $$\boxed{\;\beta_n \;\doteq\; 2^{-n\,D(P_0 \,\|\, P_1)}\;}$$

    This is **Stein's lemma**: the best achievable type-II error exponent equals $D(P_0\|P_1)$, *independent of the fixed type-I constraint*. KL divergence is exactly the statistical *distinguishability* of two distributions — the asymptotic rate at which evidence piles up against the wrong hypothesis. Two distributions with large KL separate after few samples; with small KL you need many.

    If instead you minimize a Bayesian average of the two errors, the symmetric **Chernoff exponent** governs the decay:

    $$\text{rate} = -\min_{0\le s\le 1}\log_2 \sum_x P_0(x)^{1-s} P_1(x)^{s},$$

    which is the largest "Rényi-tilted" gap and is symmetric in the two hypotheses, unlike Stein's asymmetric $D(P_0\|P_1)$.

    > [Cover & Thomas Ch 11.7–11.9](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) — Neyman–Pearson, Stein, Chernoff.
    > [Polyanskiy & Wu](file:///C:/Users/landa/info-theory-course/textbooks/PolyanskiyWu.pdf) develops binary hypothesis testing as the foundation for channel converses.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _P0 = np.array([0.5, 0.3, 0.2])
        _P1 = np.array([0.2, 0.3, 0.5])

        _D01 = np.sum(_P0 * np.log2(_P0 / _P1))
        _D10 = np.sum(_P1 * np.log2(_P1 / _P0))
        print("=== Stein's lemma: beta_n decays at rate D(P0||P1) ===")
        print(f"D(P0||P1) = {_D01:.4f} bits   (Stein exponent for beta)")
        print(f"D(P1||P0) = {_D10:.4f} bits   (asymmetric! KL is not a metric)\n")

        _rng = np.random.default_rng(11)
        _trials = 200_000
        _eps = 0.05
        _llr_per = np.log2(_P1 / _P0)

        print(f"{'n':>4} | {'threshold tau':>13} | {'alpha (<=eps)':>13} | "
              f"{'beta empirical':>15} | {'2^-nD01':>12}")
        print("-" * 70)
        for _n in [10, 20, 40, 80]:
            _x0 = _rng.choice(3, size=(_trials, _n), p=_P0)
            _x1 = _rng.choice(3, size=(_trials, _n), p=_P1)
            _llr0 = _llr_per[_x0].mean(axis=1)
            _llr1 = _llr_per[_x1].mean(axis=1)
            _tau = float(np.quantile(_llr0, 1 - _eps))
            _alpha = float(np.mean(_llr0 > _tau))
            _beta = float(np.mean(_llr1 <= _tau))
            _pred = 2.0 ** (-_n * _D01)
            print(f"{_n:>4} | {_tau:>13.4f} | {_alpha:>13.4f} | "
                  f"{_beta:>15.3e} | {_pred:>12.3e}")
        print("\nbeta shrinks ~ geometrically with slope -D(P0||P1), as Stein predicts.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Interactive: Error-Exponent / ROC Explorer

    A binary test trades false alarms against misses. The **ROC curve** plots the detection probability $1-\beta$ (true positives) against the false-alarm probability $\alpha$ as you sweep the Neyman–Pearson threshold $\tau$. A perfect test hugs the top-left corner; a useless test sits on the diagonal.

    Two knobs:

    - **KL separation** between $P_0$ and $P_1$ — how distinguishable the hypotheses are. Larger separation bows the ROC toward the corner.
    - **Sample size $n$** — more data sharpens the test. By Stein's lemma, the area between the ROC and the diagonal grows as the errors decay at rate $D$.

    Watch the ROC inflate toward the perfect corner as you raise either knob, and watch the side panel report the Stein exponent $D(P_0\|P_1)$ governing how fast $\beta$ collapses.
    """)
    return


@app.cell
def _(mo):
    roc_sep = mo.ui.slider(start=0.0, stop=0.45, step=0.01, value=0.2,
                           label="separation s  (P0=[.5+s,.5-s], P1=[.5-s,.5+s])")
    roc_n = mo.ui.slider(start=1, stop=60, step=1, value=10, label="n = sample length")
    mo.vstack([roc_sep, roc_n])
    return roc_n, roc_sep


@app.cell
def _(roc_n, roc_sep):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _s = roc_sep.value
        _n = roc_n.value
        _P0 = np.array([0.5 + _s, 0.5 - _s])
        _P1 = np.array([0.5 - _s, 0.5 + _s])
        _P0 = np.clip(_P0, 1e-9, 1)
        _P1 = np.clip(_P1, 1e-9, 1)

        _D01 = float(np.sum(_P0 * np.log2(_P0 / _P1)))

        _k = np.arange(_n + 1)
        from math import comb
        _binom = np.array([comb(_n, int(_kk)) for _kk in _k], dtype=float)
        _pmf0 = _binom * _P0[1] ** _k * _P0[0] ** (_n - _k)
        _pmf1 = _binom * _P1[1] ** _k * _P1[0] ** (_n - _k)

        _order = np.argsort(-(_P1[1] / _P0[1]) ** _k * (_P1[0] / _P0[0]) ** (_n - _k))
        _alpha = np.concatenate([[0.0], np.cumsum(_pmf0[_order])])
        _detect = np.concatenate([[0.0], np.cumsum(_pmf1[_order])])

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(10, 4.2))

        _ax1.plot(_alpha, _detect, "-o", color="steelblue", ms=3, lw=1.8)
        _ax1.plot([0, 1], [0, 1], "k--", alpha=0.4, label="useless (chance)")
        _ax1.fill_between(_alpha, _alpha, _detect, alpha=0.15, color="steelblue")
        _ax1.set_xlabel("false alarm  alpha = P(decide H1 | H0)")
        _ax1.set_ylabel("detection  1 - beta")
        _ax1.set_title(f"ROC   (n={_n},  D(P0||P1)={_D01:.3f} bits)")
        _ax1.set_xlim(-0.02, 1.02)
        _ax1.set_ylim(-0.02, 1.02)
        _ax1.legend(loc="lower right")
        _ax1.grid(True, alpha=0.3)

        _ns = np.arange(1, 61)
        _beta = 2.0 ** (-_ns * _D01)
        _ax2.semilogy(_ns, _beta, color="darkorange", lw=2)
        _ax2.axvline(_n, color="red", ls="--", alpha=0.6, label=f"current n={_n}")
        _ax2.set_xlabel("n = sample length")
        _ax2.set_ylabel("Stein bound on beta  (log scale)")
        _ax2.set_title("Type-II error exponent  2^(-n D)")
        _ax2.legend()
        _ax2.grid(True, alpha=0.3, which="both")

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Fisher Information & the Cramér–Rao Bound

    Everything so far was about *discrete* alphabets and *fixed* alternatives. Statistics also asks a smooth question: given a parametric family $\{p_\theta\}$, how precisely can we estimate the parameter $\theta$ from data? The bridge from KL divergence to this question is a Taylor expansion.

    For two nearby parameters, KL divergence is *locally quadratic*, and the curvature is the **Fisher information**:

    $$D(p_\theta \,\|\, p_{\theta + d\theta}) \;=\; \tfrac12 \, I(\theta)\, d\theta^2 + o(d\theta^2), \qquad I(\theta) = \mathbb{E}_\theta\!\left[\left(\frac{\partial}{\partial\theta}\log p_\theta(X)\right)^{\!2}\right].$$

    So Fisher information is *the local Riemannian metric that KL divergence induces on parameter space*. Two parameter values are statistically far apart exactly when the distributions they index have large KL — and locally that distance is measured by $\sqrt{I(\theta)}\,|d\theta|$.

    From this curvature comes a hard floor on estimation. The **Cramér–Rao bound** says any unbiased estimator $\hat\theta$ of $\theta$ from $n$ i.i.d. samples has variance at least the inverse Fisher information:

    $$\mathrm{Var}(\hat\theta) \;\ge\; \frac{1}{n\, I(\theta)}.$$

    You cannot estimate a parameter more precisely than its Fisher information allows — high curvature (sharp, distinguishable distributions) means easy estimation; flat curvature means the data barely move the likelihood and estimation is hard. The maximum-likelihood estimator achieves this bound asymptotically, which is why MLE is the gold standard.

    **Worked example (Bernoulli).** For $X \sim \text{Bernoulli}(\theta)$, the score is $\partial_\theta \log p = (x-\theta)/(\theta(1-\theta))$, giving $I(\theta) = 1/(\theta(1-\theta))$. The Cramér–Rao floor for the sample mean is $\theta(1-\theta)/n$ — which is *exactly* the variance of the sample mean. The obvious estimator is already optimal, and information theory told us so.

    > [Cover & Thomas Ch 11.10](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) — Fisher information and Cramér–Rao via the method of types.
    > [Polyanskiy & Wu](file:///C:/Users/landa/info-theory-course/textbooks/PolyanskiyWu.pdf) — KL as the local metric and information geometry.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def _kl_bernoulli(t0, t1):
            _terms = 0.0
            for _p0, _p1 in [(t0, t1), (1 - t0, 1 - t1)]:
                if _p0 > 0:
                    _terms += _p0 * np.log(_p0 / _p1)
            return _terms

        print("=== Fisher info = curvature of KL (Bernoulli) ===")
        _theta = 0.3
        _I_analytic = 1.0 / (_theta * (1 - _theta))
        print(f"theta = {_theta},  analytic I(theta) = 1/(t(1-t)) = {_I_analytic:.4f} nats\n")

        print(f"{'d_theta':>10} | {'KL(p_t||p_t+d)':>16} | {'(1/2)I d^2':>12} | {'ratio':>7}")
        print("-" * 54)
        for _d in [0.05, 0.02, 0.01, 0.005, 0.002]:
            _kl = _kl_bernoulli(_theta, _theta + _d)
            _quad = 0.5 * _I_analytic * _d ** 2
            print(f"{_d:>10.3f} | {_kl:>16.3e} | {_quad:>12.3e} | {_kl/_quad:>7.4f}")
        print("ratio -> 1: KL is locally (1/2) I dtheta^2.\n")

        print("=== Cramer-Rao: sample-mean variance hits the floor ===")
        _rng = np.random.default_rng(5)
        _n = 200
        _trials = 50_000
        _samples = (_rng.random((_trials, _n)) < _theta).astype(float)
        _est = _samples.mean(axis=1)
        _emp_var = float(_est.var())
        _cr_floor = 1.0 / (_n * _I_analytic)
        print(f"n = {_n}")
        print(f"empirical Var(theta_hat) = {_emp_var:.6f}")
        print(f"Cramer-Rao floor 1/(nI)  = {_cr_floor:.6f}   (theta(1-theta)/n)")
        print(f"efficiency = floor/empirical = {_cr_floor/_emp_var:.4f}  (≈1 => optimal)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 8. KL as the Expected Log-Likelihood Ratio

    Let us close the loop and name the thread running through every section. The relative entropy

    $$D(P_0 \,\|\, P_1) = \mathbb{E}_{P_0}\!\left[\log_2 \frac{P_0(X)}{P_1(X)}\right]$$

    is the **expected per-sample log-likelihood ratio** when the truth is $P_0$. That single reading explains everything:

    - **Why evidence accumulates.** Under $H_0$, each observation adds on average $D(P_0\|P_1)$ bits to the cumulative log-likelihood ratio. After $n$ samples the LLR drifts to $\approx nD(P_0\|P_1)$ — a wall of evidence against $H_1$ that grows *linearly*, which is exactly why the miss probability $\beta_n$ *falls* exponentially (Stein). The drift rate and the error exponent are the same number.
    - **Why $D \ge 0$ (Gibbs' inequality).** On average the data favor the true hypothesis: the expected LLR points the right way, with equality iff $P_0 = P_1$. A correct model is, on average, never out-predicted by a wrong one.
    - **Why MLE = min-KL.** Maximizing the likelihood of i.i.d. data is, by the law of large numbers, the same as minimizing $D(\hat P_{\text{data}} \| p_\theta)$ — fitting a model *is* finding the family member of least KL divergence from the empirical distribution. (We make this the centerpiece of Module 6A.)
    - **Why Fisher info is its curvature.** The LLR's mean is $D$; its variance per sample, in the local limit, is the Fisher information — the same quantity, viewed as a metric (Section 7).

    Mean of the LLR $\Rightarrow$ Stein exponent. Set $E$ in distribution space $\Rightarrow$ Sanov exponent. Curvature of $D$ $\Rightarrow$ Fisher information. Min over a model family $\Rightarrow$ maximum likelihood. **Information theory and statistics are not analogous — they are the same theory, and KL divergence is the dictionary.**
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _P0 = np.array([0.5, 0.3, 0.2])
        _P1 = np.array([0.2, 0.3, 0.5])
        _D01 = float(np.sum(_P0 * np.log2(_P0 / _P1)))

        print("=== KL = expected per-sample log-likelihood ratio ===")
        print(f"D(P0||P1) = {_D01:.4f} bits/sample (expected LLR under P0)\n")

        _rng = np.random.default_rng(21)
        _n = 50
        _trials = 20_000
        _llr_per = np.log2(_P0 / _P1)
        _x = _rng.choice(3, size=(_trials, _n), p=_P0)
        _cum_llr = _llr_per[_x].sum(axis=1)

        print(f"after n={_n} samples (truth = P0):")
        print(f"  mean cumulative LLR  = {_cum_llr.mean():.4f} bits")
        print(f"  predicted n*D(P0||P1) = {_n * _D01:.4f} bits   (match)")
        print(f"  P(LLR > 0, favors P0) = {np.mean(_cum_llr > 0):.4f}   "
              f"(evidence points to the truth)\n")

        print("Gibbs check: D(P||Q) >= 0 for random P, Q")
        _bad = 0
        for _ in range(100_000):
            _p = _rng.random(4); _p /= _p.sum()
            _q = _rng.random(4); _q /= _q.sum()
            if np.sum(_p * np.log2(_p / _q)) < -1e-12:
                _bad += 1
        print(f"  violations of D>=0 over 100,000 random pairs: {_bad}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    This module is the hidden backbone of statistical machine learning — almost every training objective and theoretical guarantee is one of these quantities in disguise:

    - **Maximum likelihood = minimum KL.** Fitting any probabilistic model — logistic regression, a Gaussian mixture, an autoregressive language model — minimizes $D(\hat P_{\text{data}} \| p_\theta)$. Cross-entropy loss *is* this KL (up to the constant label entropy), the connection we formalize in Module 6A.
    - **Asymptotic efficiency of MLE.** The reason MLE is the default estimator is the Cramér–Rao / Fisher-information story of Section 7: MLE attains the minimum-variance floor asymptotically. Fisher information also drives **natural-gradient** methods and the **Laplace approximation** to Bayesian posteriors.
    - **Generalization as hypothesis testing.** PAC-Bayes and many generalization bounds are large-deviation statements — Sanov-style exponents controlling the probability that empirical risk strays far from true risk. The "how much data do I need" question is an error-exponent question.
    - **Detection, anomaly detection, A/B testing.** Neyman–Pearson and Stein's lemma *are* the theory of classifiers-as-detectors and sequential testing. ROC curves and AUC — the everyday evaluation tools of Section 6 — are exactly the objects here, and their achievable shape is set by the KL between the class-conditional distributions.
    - **Model selection.** Information criteria (AIC penalizes by parameter count via Fisher geometry; the MDL principle of Module 6B is a coding-length version) all descend from the type-and-divergence machinery of this module.

    You now hold the bridge between Parts 1–5 (information as compression and communication) and Part 6 (information as the engine of learning). Next, **Module 5C** takes a taste of *network* information theory (Slepian–Wolf, multiple-access), and then **Part 6** cashes in everything you have built — starting with cross-entropy, KL, and maximum entropy in **6A**.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the math-to-code translation for the method of types, Sanov, Stein, and Fisher information. Work in nats or bits consistently; the expected answers below assume bits unless noted.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: The Type of a Sequence

    Given an integer sequence over an alphabet of size `a`, compute its type (empirical distribution) and verify the per-sequence probability identity $Q^n(x^n) = 2^{-n(H(P)+D(P\|Q))}$ against the direct product $\prod_i Q(x_i)$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(0)
        Q = np.array([0.5, 0.25, 0.15, 0.10])
        a = len(Q)
        n = 20
        x = rng.choice(a, size=n, p=Q)

        # TODO: type P = normalized histogram of x over the a symbols (hint: np.bincount)
        P = ...

        # TODO: H(P) and D(P||Q) in bits (mask out zero entries)
        H = ...
        D = ...

        # TODO: log2 Q^n(x^n) two ways and compare
        logp_direct = ...                  # sum of log2 Q[x_i]
        logp_type = ...                    # -n*(H + D)

        # print(P, H, D)
        # print(logp_direct, logp_type)    # expect these to match
        # expected: logp_direct == logp_type (up to float error)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Type-Class Size via Stirling

    Implement `log2_type_class_size(counts)` returning $\log_2 |T(P)|$ for integer counts summing to $n$ (use `math.lgamma` for the log-multinomial coefficient). Confirm it lies between $nH(P) - a\log_2(n+1)$ and $nH(P)$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        from math import lgamma

        def log2_type_class_size(counts):
            counts = np.asarray(counts, dtype=int)
            n = int(counts.sum())
            # TODO: log2 of n! / prod(counts!) using lgamma, divided by ln 2
            return ...

        counts = np.array([30, 18, 12])     # n = 60, a = 3
        # n = counts.sum(); a = len(counts)
        # P = counts / n
        # H = -np.sum(P[P>0]*np.log2(P[P>0]))
        # size = log2_type_class_size(counts)
        # print(size, n*H)                  # expect size <= nH and size >= nH - a*log2(n+1)
        # expected: ~ slightly below nH(P)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Sanov Exponent by I-Projection

    Estimate the exponent for the event "sample mean of a fair die $\ge$ 4.5". Find the tilted distribution $P^\star(i) \propto e^{\lambda i}$ whose mean equals 4.5 (solve for $\lambda$ by bisection), then return $D(P^\star\|Q)$ in bits. Sanity-check the exponent against a Monte-Carlo estimate of the rare-event probability.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        faces = np.arange(1, 7)
        Q = np.full(6, 1 / 6)
        target = 4.5

        def tilt_mean(lam):
            w = np.exp(lam * faces)
            P = w / w.sum()
            return P, float(np.dot(faces, P))

        # TODO: bisection on lam in [0, 5] so that tilt_mean(lam) has mean ~ target
        lam = ...

        # TODO: once lam is real, get the I-projection and its KL to Q (in bits)
        # Pstar, m = tilt_mean(lam)
        # D = np.sum(Pstar * np.log2(Pstar / Q))

        # print(lam, np.round(Pstar, 4), m, D)
        # rng = np.random.default_rng(0)
        # for nn in (20, 40):
        #     rolls = rng.integers(1, 7, (300_000, nn))
        #     emp = np.mean(rolls.mean(1) >= target)
        #     print(nn, 2.0**(-nn*D), emp)   # same exponential slope
        # expected: D ~ 0.19 bits/roll

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Stein's Lemma by Simulation

    For two distributions `P0`, `P1` over 3 symbols, run the Neyman–Pearson test on length-$n$ samples (threshold the empirical log-likelihood ratio at the $1-\epsilon$ quantile under $H_0$). Show the type-II error $\beta_n$ decays at rate $D(P_0\|P_1)$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(0)
        P0 = np.array([0.6, 0.3, 0.1])
        P1 = np.array([0.1, 0.3, 0.6])
        eps = 0.05

        # TODO: per-symbol LLR weights for "evidence toward H1": log2(P1/P0)
        llr_per = ...

        # TODO: D(P0||P1) in bits (the Stein exponent)
        D01 = ...

        for n in (10, 20, 40):
            x0 = rng.choice(3, size=(100_000, n), p=P0)
            x1 = rng.choice(3, size=(100_000, n), p=P1)
            # TODO: mean LLR per trial under each hypothesis
            s0 = ...
            s1 = ...
            # TODO: threshold tau = (1-eps) quantile of s0; beta = P(s1 <= tau)
            tau = ...
            beta = ...
            # print(n, beta, 2.0**(-n*D01))   # comparable exponential decay
        # expected: beta ~ 2^{-n D(P0||P1)}

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Fisher Information as KL Curvature

    For a Gaussian family $\mathcal{N}(\mu, 1)$ with unknown mean, the KL divergence is $D(p_\mu \| p_{\mu+d}) = d^2/2$ (in nats), so the Fisher information is $I(\mu) = 1$. Verify numerically that $D / (\tfrac12 d^2) \to 1$ as $d \to 0$, and confirm the Cramér–Rao floor $1/(nI) = 1/n$ matches the variance of the sample mean.

    The very last line of this cell is the module-level run guard — leave it after the `return`.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def kl_gaussian(mu0, mu1, var=1.0):
            # TODO: KL between N(mu0,var) and N(mu1,var) in nats = (mu0-mu1)^2/(2 var)
            return ...

        I = 1.0  # Fisher info for N(mu,1) w.r.t. mu
        for d in (0.1, 0.05, 0.01):
            kl = kl_gaussian(0.0, d)
            # print(d, kl, 0.5 * I * d**2, kl / (0.5 * I * d**2))   # ratio -> 1

        rng = np.random.default_rng(0)
        n = 100
        # TODO: sample 20000 trials of n draws from N(0,1); estimate mean; compare Var to 1/(nI)
        est = ...
        # print(np.var(est), 1.0 / (n * I))   # expect both ~ 1/n = 0.01

    _run()
    return


if __name__ == "__main__":
    app.run()
