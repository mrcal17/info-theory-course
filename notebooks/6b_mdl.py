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
    # 6B: MDL & Model Selection

    > *"The best hypothesis to explain a set of data is the one that permits the greatest compression of the data."*
    > — the MDL principle, after Rissanen

    Every model you fit is secretly a *compression scheme*. That is the one idea this module asks you to take seriously, and once you do, the murky art of "choosing the right model" turns into something almost mechanical: **pick the model under which your data is shortest to write down.**

    You already met cross-entropy and KL divergence in 6A as the loss landscape of learning. The **Minimum Description Length** (MDL) principle takes that compression-is-learning equivalence and runs all the way with it. A model that fits well lets you describe the data in few bits — that is its job. But a flexible model costs bits *to specify* in the first place. MDL says: count *both* — the bits to describe the model **and** the bits to describe the data given the model — and minimize the **total**. The model that wins is the one that genuinely captures structure rather than memorizing noise. That is Occam's razor, made quantitative, with information theory supplying the units.

    By the end you will be able to: write a two-part code and read off its length; see exactly why overfitting shows up as a *longer* total code; connect MDL to BIC and to full Bayesian model averaging (they are the same story told at three levels of care); and trace the deep line back to **Kolmogorov complexity** — the ultimate, uncomputable description length. We close with a peek at **bits-back coding**, the trick that turns a posterior's leftover uncertainty back into saved bits, and which reappears as the rate term of a VAE in 6E.

    The interactive demo is the heart of it: fit polynomials of growing degree to noisy data and watch the **total description length** dip to a minimum and then climb again. The valley is your model.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Learning Is Compression

    Here is the slogan, stated bluntly: **any regularity in data can be used to compress it, and any compression of data reveals a regularity.** A model is just a named, reusable regularity.

    Suppose I hand you a sequence of a million bits. If they are the digits of a fair coin, there is nothing to exploit — you cannot beat one bit per symbol, and the shortest description of the data is essentially the data itself. But if the sequence is `0101010101...`, you can write a tiny program — "print `01` half a million times" — and the description collapses to a few dozen bits. The *compressibility* is the regularity. The model "it alternates" is what makes compression possible.

    This is why information theory owns model selection. From 2A we know the shortest possible code for data drawn from a known distribution $P$ has expected length $H(P)$ bits per symbol, and that coding under the *wrong* distribution $Q$ costs an extra $D(P \,\|\, Q)$ bits per symbol — the KL divergence. So if a model proposes a distribution $Q_\theta$, the number of bits it needs to encode your actual data is

    $$L(\text{data} \mid \theta) = -\log_2 Q_\theta(\text{data}) \quad \text{bits},$$

    the **negative log-likelihood in bits**. Minimizing description length over $\theta$ is *exactly* maximum likelihood. Learning, recast as compression, is not a metaphor — it is the same arithmetic.

    But there is a catch that maximum likelihood alone never sees, and it is the whole reason this module exists: a more flexible model can *always* drive $-\log_2 Q_\theta(\text{data})$ lower, right down toward zero, by bending to fit every wiggle. If shorter-is-better were the end of the story, you would always pick the most complex model and overfit catastrophically. The fix is to charge rent for complexity.

    > [Grünwald, *A Tutorial Introduction to the MDL Principle*, §1](file:///C:/Users/landa/info-theory-course/textbooks/Grunwald-MDL.pdf) opens with exactly this "learning = compression" framing.
    > [MacKay Ch 28](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) develops model comparison from the coding viewpoint.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(0)

        def nll_bits(data, p):
            p = np.clip(np.asarray(p, dtype=float), 1e-12, 1.0)
            return float(-np.sum(np.log2(p)))

        _n = 200
        _structured = np.tile([0, 1], _n // 2)
        _random = _rng.integers(0, 2, _n)

        _q_alt = np.where(np.arange(_n) % 2 == 0, 0.999, 0.001)
        _q_alt = np.where(_structured == 1, 1 - _q_alt, _q_alt)
        _q_fair = np.full(_n, 0.5)

        print("=== Description length = negative log-likelihood in bits ===")
        print(f"alternating data, fair-coin model   : {nll_bits(_structured, _q_fair):7.1f} bits")
        print(f"alternating data, 'it alternates'   : {nll_bits(_structured, _q_alt):7.1f} bits  <- the regularity pays off")
        print(f"random data,      fair-coin model   : {nll_bits(_random, _q_fair):7.1f} bits")
        print()
        print("Structure compresses; noise does not. A model is a named regularity.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The Two-Part Code

    Imagine you must transmit your data to a friend over a wire that charges by the bit, and you are allowed to first send a *model* and then send the data *as decoded by that model*. Rissanen's **two-part code** says the total cost is

    $$L(\text{data}) \;=\; \underbrace{L(\theta)}_{\text{describe the model}} \;+\; \underbrace{L(\text{data}\mid\theta)}_{\text{describe the data given the model}}.$$

    You pay first for the *hypothesis* — which model, and its parameter values to some precision — and then for the *residual* — everything in the data the model failed to predict, encoded under the model's distribution. **MDL picks the hypothesis $\hat\theta$ that minimizes this sum.**

    Watch the tension. A null model ("everything is independent noise") has $L(\theta) \approx 0$ but a huge residual — it predicts nothing. A maximally complex model can shrink the residual toward zero, but $L(\theta)$ balloons because you must transmit a long, finely-tuned parameter list. The minimum lives in between. That valley is the quantitative form of **Occam's razor**: *prefer the simplest model that adequately explains the data* — where "simplest" and "adequately" are both measured in the same currency, bits.

    **A worked feel for the numbers.** Suppose you fit a degree-$d$ polynomial to $n$ noisy points. The residual part, under a Gaussian noise model with the maximum-likelihood variance $\hat\sigma^2 = \tfrac1n\sum r_i^2$, costs

    $$L(\text{data}\mid\theta) \;=\; \tfrac{n}{2}\log_2\!\big(2\pi e\,\hat\sigma^2\big) \quad\text{bits},$$

    which *falls* as $d$ grows and the fit tightens. The model part costs roughly

    $$L(\theta) \;\approx\; \tfrac{k}{2}\log_2 n \quad\text{bits},$$

    where $k = d+1$ is the number of free parameters (the $\tfrac12\log_2 n$ per parameter is the number of bits needed to state each one to its statistically meaningful precision $\sim 1/\sqrt n$ — finer precision is wasted, coarser loses fit). This term *rises* with $d$. Their sum dips, then climbs. The slider in Section 3 lets you watch it happen.

    > [Grünwald §2, "Crude two-part MDL"](file:///C:/Users/landa/info-theory-course/textbooks/Grunwald-MDL.pdf) is the canonical derivation of exactly this decomposition.
    > [MacKay Ch 28.1](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) frames it as "Occam's razor falls out of Bayes."
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(1)
        _n = 40
        _x = np.linspace(-1, 1, _n)
        _truth = 1.0 + 0.5 * _x - 2.0 * _x**2
        _y = _truth + _rng.normal(0, 0.25, _n)

        def two_part_bits(x, y, d):
            n = len(x)
            X = np.vander(x, d + 1, increasing=True)
            coef, *_ = np.linalg.lstsq(X, y, rcond=None)
            resid = y - X @ coef
            sigma2 = max(np.mean(resid**2), 1e-12)
            k = d + 1
            data_bits = 0.5 * n * np.log2(2 * np.pi * np.e * sigma2)
            model_bits = 0.5 * k * np.log2(n)
            return data_bits, model_bits

        print("=== Two-part code length vs polynomial degree ===")
        print(f"{'deg':>3} {'model bits':>11} {'data bits':>10} {'TOTAL':>9}")
        _best_d, _best_total = None, np.inf
        for _d in range(0, 12):
            _db, _mb = two_part_bits(_x, _y, _d)
            _tot = _db + _mb
            _mark = ""
            if _tot < _best_total:
                _best_total, _best_d = _tot, _d
            print(f"{_d:>3} {_mb:>11.1f} {_db:>10.1f} {_tot:>9.1f}")
        print(f"\nMDL-optimal degree = {_best_d}  (true model is quadratic, degree 2)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Interactive: MDL Model-Order Selection

    Time to see the razor cut. Below, $n$ noisy points come from a fixed cubic-ish truth. Drag the **degree** slider and read off the three numbers on the plot: **model bits** (rising, the price of complexity), **residual bits** (falling, the price of misfit), and their **total** (the U-shaped curve you actually want to minimize). The MDL-optimal degree — the bottom of the valley — is marked with a star, and the fit at *your* chosen degree is drawn over the data.

    Push the degree too high and watch the fitted curve start chasing individual noise points while the **total** description length climbs back up. That climb *is* overfitting, made visible and measured in bits. The honest model is the one at the bottom of the valley, not the one that hugs the data tightest.
    """)
    return


@app.cell
def _(mo):
    degree = mo.ui.slider(start=0, stop=14, step=1, value=3, label="polynomial degree d")
    degree
    return (degree,)


@app.cell
def _(mo):
    noise_level = mo.ui.slider(start=0.05, stop=0.8, step=0.05, value=0.3, label="noise σ")
    noise_level
    return (noise_level,)


@app.cell
def _(degree, noise_level):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _rng = np.random.default_rng(7)
        _n = 30
        _x = np.linspace(-1, 1, _n)
        _truth = 0.5 + 1.0 * _x - 1.5 * _x**2 + 0.8 * _x**3
        _y = _truth + _rng.normal(0, noise_level.value, _n)

        def _fit_bits(d):
            X = np.vander(_x, d + 1, increasing=True)
            coef, *_ = np.linalg.lstsq(X, _y, rcond=None)
            resid = _y - X @ coef
            sigma2 = max(np.mean(resid**2), 1e-12)
            data_bits = 0.5 * _n * np.log2(2 * np.pi * np.e * sigma2)
            model_bits = 0.5 * (d + 1) * np.log2(_n)
            return coef, data_bits, model_bits

        _degs = np.arange(0, 15)
        _model_b = np.array([_fit_bits(d)[2] for d in _degs])
        _data_b = np.array([_fit_bits(d)[1] for d in _degs])
        _total_b = _model_b + _data_b
        _best = int(_degs[np.argmin(_total_b)])

        _d = degree.value
        _coef = _fit_bits(_d)[0]
        _xx = np.linspace(-1, 1, 300)
        _yy = np.vander(_xx, _d + 1, increasing=True) @ _coef

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(11, 4.2))

        _ax1.scatter(_x, _y, color="black", s=22, zorder=3, label="noisy data")
        _ax1.plot(_xx, _yy, color="crimson", lw=2, label=f"degree-{_d} fit")
        _ax1.plot(_xx, 0.5 + 1.0 * _xx - 1.5 * _xx**2 + 0.8 * _xx**3,
                  color="green", ls="--", lw=1.5, alpha=0.7, label="truth")
        _ax1.set_xlabel("x")
        _ax1.set_ylabel("y")
        _ax1.set_title(f"Fit at degree {_d}")
        _ax1.legend(fontsize=8, loc="upper left")
        _ax1.grid(True, alpha=0.3)
        _ax1.set_ylim(_y.min() - 1, _y.max() + 1)

        _ax2.plot(_degs, _model_b, "o-", color="steelblue", label="model bits L(θ)", ms=4)
        _ax2.plot(_degs, _data_b, "o-", color="darkorange", label="residual bits L(data|θ)", ms=4)
        _ax2.plot(_degs, _total_b, "o-", color="crimson", lw=2.2, label="TOTAL", ms=5)
        _ax2.scatter([_best], [_total_b[_best]], s=220, marker="*",
                     color="gold", edgecolor="black", zorder=6,
                     label=f"MDL min (deg {_best})")
        _ax2.axvline(_d, color="gray", ls=":", alpha=0.7)
        _ax2.set_xlabel("polynomial degree d")
        _ax2.set_ylabel("description length (bits)")
        _ax2.set_title(f"Total = model + residual    (your d = {_d})")
        _ax2.legend(fontsize=8)
        _ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. MDL vs BIC vs Bayes — One Story, Three Levels of Care

    The crude two-part code is honest but slightly wasteful: it spends bits *naming* a specific $\hat\theta$ to some precision, and the choice of precision is a bit ad hoc. The cure is to stop committing to one $\theta$ and instead encode the data under a *mixture* over all parameter settings — a single distribution that already integrates out the parameter. This is the **Bayesian marginal likelihood** (the "evidence"):

    $$P(\text{data} \mid \mathcal{M}) \;=\; \int P(\text{data}\mid\theta)\,P(\theta\mid\mathcal{M})\,d\theta.$$

    Encoding the data with the code whose lengths are $-\log_2 P(\text{data}\mid\mathcal{M})$ is provably **never longer**, and usually shorter, than any two-part code — it is *refined MDL*. So "shortest code under model $\mathcal{M}$" and "highest Bayesian evidence for $\mathcal{M}$" are, up to a sign and a log, the **same number**. Occam's razor was hiding inside Bayes all along: a complex model spreads its prior probability mass thinly over many datasets, so it assigns *less* probability to the one you actually saw. Spreading thin = automatic complexity penalty. No extra penalty term required.

    **BIC is the lazy person's evidence.** Apply Laplace's method (a Gaussian approximation of the integral around $\hat\theta$) to that marginal likelihood for large $n$, keep only the terms that grow with $n$, and you get

    $$-\log_2 P(\text{data}\mid\mathcal{M}) \;\approx\; \underbrace{-\log_2 P(\text{data}\mid\hat\theta)}_{\text{fit}} \;+\; \underbrace{\tfrac{k}{2}\log_2 n}_{\text{complexity}} \;+\; O(1),$$

    which — multiplied by $2\ln 2$ to get the textbook scale — is exactly the **Bayesian Information Criterion**, $\mathrm{BIC} = -2\ln P(\text{data}\mid\hat\theta) + k\ln n$. That $\tfrac{k}{2}\log_2 n$ is *precisely* the model-bits term from our two-part code in Section 2. The three viewpoints line up:

    | Method | What it encodes | Complexity penalty | Care level |
    |---|---|---|---|
    | **Crude two-part MDL** | $\hat\theta$ then residual | $\tfrac k2\log_2 n$ (you choose precision) | basic |
    | **BIC** | Laplace approx of evidence | $\tfrac k2\log_2 n$ (derived, large-$n$) | medium |
    | **Refined MDL / Bayes** | full mixture over $\theta$ | exact, includes $O(1)$ geometry of $\mathcal{M}$ | full |

    For contrast, **AIC** uses a penalty of $k$ (not $\tfrac k2\log_2 n$); it targets predictive accuracy rather than identifying the true model, and penalizes complexity *less*, so it tends to pick larger models than BIC/MDL. The demo below computes the evidence by brute-force grid integration for a tiny model and shows the BIC approximation tracking it.

    > [Grünwald §1.3 & §2.4](file:///C:/Users/landa/info-theory-course/textbooks/Grunwald-MDL.pdf) lays out crude vs refined MDL and the link to Bayes and BIC.
    > [MacKay Ch 28](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) derives the Occam factor and the evidence directly.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(3)
        _n = 60
        _true_mu, _true_sigma = 1.3, 1.0
        _data = _rng.normal(_true_mu, _true_sigma, _n)

        _xbar = np.mean(_data)
        _s2 = np.var(_data)

        def loglik_bits(mu, sigma):
            sigma = max(sigma, 1e-9)
            ll = -0.5 * np.sum((_data - mu) ** 2) / sigma**2
            ll += -_n * np.log(np.sqrt(2 * np.pi) * sigma)
            return ll / np.log(2)

        _mu_max = loglik_bits(_xbar, np.sqrt(_s2))
        _k = 2

        _mu_grid = np.linspace(-3, 5, 400)
        _sig_grid = np.linspace(0.2, 3.0, 400)
        _dmu = _mu_grid[1] - _mu_grid[0]
        _dsig = _sig_grid[1] - _sig_grid[0]
        _prior = 1.0 / ((5 - (-3)) * (3.0 - 0.2))

        _MU, _SIG = np.meshgrid(_mu_grid, _sig_grid)
        _LL = np.array([[loglik_bits(m, s) for m in _mu_grid] for s in _sig_grid])
        _LLnat = _LL * np.log(2)
        _shift = _LLnat.max()
        _evidence = np.sum(np.exp(_LLnat - _shift)) * _dmu * _dsig * _prior
        _log_evidence_bits = (_shift + np.log(_evidence)) / np.log(2)

        _bic_codelen = -_mu_max + 0.5 * _k * np.log2(_n)

        print("=== Marginal likelihood (evidence) vs BIC approximation ===")
        print(f"best-fit code length  -log2 P(data|θ̂) = {-_mu_max:9.2f} bits")
        print(f"exact   -log2 evidence (grid integral) = {-_log_evidence_bits:9.2f} bits")
        print(f"BIC     -log2 P(θ̂) + (k/2)log2 n       = {_bic_codelen:9.2f} bits")
        print(f"complexity penalty (k/2)log2 n         = {0.5 * _k * np.log2(_n):9.2f} bits")
        print()
        print("Evidence and BIC agree to within an O(1) constant — Occam falls out of Bayes.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Link to Kolmogorov Complexity

    MDL is a *practical* shadow of a deeper, more absolute idea. The **Kolmogorov complexity** $K(x)$ of a string $x$ is the length, in bits, of the *shortest computer program* (on a fixed universal machine) that outputs $x$ and halts:

    $$K(x) \;=\; \min_{\,p\,:\;U(p)=x} \; \ell(p).$$

    This is the *ultimate* description length — the limit of compression when your "model class" is **all computable functions**. A string is *random* exactly when $K(x) \approx \ell(x)$: no program shorter than the data itself, nothing to exploit. A string is *structured* when $K(x) \ll \ell(x)$: the first million digits of $\pi$ have huge length but tiny $K$, because a short program generates them. This is the rigorous version of "regularity = compressibility" from Section 1.

    Two facts make $K$ both profound and humbling:

    - **It is uncomputable.** No algorithm can take $x$ and return $K(x)$ — that would let you solve the halting problem. So $K$ is a *gold standard you can never reach*, only approximate. MDL with a fixed, restricted model class (polynomials, Gaussians, neural nets) is precisely that approximation: replace "all programs" with "all hypotheses I am willing to consider," and the shortest description within that class is computable.
    - **It explains why Occam's razor works at all.** Under the *universal prior* $2^{-K(x)}$ (Solomonoff induction), simpler hypotheses — those with shorter programs — automatically get exponentially more prior probability. Preferring simple explanations is not an aesthetic bias; it is what optimal inference *provably* does when "simple" means "short program." MDL inherits this justification on a budget.

    The chain to keep in your head: **Kolmogorov complexity** (ideal, uncomputable) → **refined MDL / Bayes** (ideal within a model class, often computable) → **two-part MDL / BIC** (a cheap, large-$n$ approximation you can run in a loop). Each step trades a little optimality for a lot of tractability, and your polynomial demo lives at the bottom of that ladder.

    > [Grünwald §1.5 & §6](file:///C:/Users/landa/info-theory-course/textbooks/Grunwald-MDL.pdf) discusses the relationship to Kolmogorov complexity and the universal prior.
    > [MacKay Ch 28.3](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) touches on the algorithmic-complexity view of inference.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        import zlib

        def approx_complexity_bits(s):
            raw = s.encode("utf-8")
            comp = zlib.compress(raw, level=9)
            return len(comp) * 8, len(raw) * 8

        _rng = np.random.default_rng(0)
        _structured = "01" * 500
        _pi_like = "".join(str(d) for d in _rng.integers(0, 10, 1000))
        _repeated = "A" * 1000
        _random_bits = "".join(str(b) for b in _rng.integers(0, 2, 1000))

        print("=== Practical proxy for K(x): a real compressor (zlib) ===")
        print(f"{'string':>22} {'raw bits':>9} {'~K(x) bits':>11} {'ratio':>7}")
        for _name, _s in [
            ("'01' x 500", _structured),
            ("'A' x 1000", _repeated),
            ("random digits x1000", _pi_like),
            ("random bits x1000", _random_bits),
        ]:
            _k, _raw = approx_complexity_bits(_s)
            print(f"{_name:>22} {_raw:>9} {_k:>11} {_k / _raw:>7.2f}")
        print()
        print("Structured strings compress (small ~K); random ones do not (ratio ~1).")
        print("A perfect compressor would reach the true K(x) — but K is uncomputable.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. A Bits-Back Preview

    There is one more turn of the screw, and it sets up the VAE in 6E. The two-part code looked wasteful in a *specific* way: once you commit to a single $\hat\theta$, all the *other* parameter settings that fit the data nearly as well are thrown away. Their probability mass is leftover information you paid for but never used. **Bits-back coding** reclaims it.

    The trick (Hinton & van Camp; Wallace): instead of transmitting one fixed $\theta$, sample $\theta$ from the posterior $q(\theta\mid \text{data})$ — but sample it using bits from *some other message* you also need to send. Then:

    1. **Pay** $-\log_2 q(\theta\mid\text{data})$ bits' worth of "randomness" by *decoding* part of your auxiliary message into a sample $\theta \sim q$.
    2. **Send** the model $\theta$ at cost $-\log_2 P(\theta)$ (the prior) and the data given it at cost $-\log_2 P(\text{data}\mid\theta)$.
    3. **Get bits back:** because the receiver can re-derive $q(\theta\mid\text{data})$ after decoding the data, they recover the very bits you spent in step 1 — for free.

    The *net* cost works out to the expected two-part length **minus** the entropy of the posterior:

    $$L_{\text{bits-back}} \;=\; \mathbb{E}_{q}\!\big[-\log_2 P(\theta) - \log_2 P(\text{data}\mid\theta)\big] \;-\; H[q(\theta\mid\text{data})].$$

    Rearrange and that is precisely the **negative ELBO** from variational inference:

    $$L_{\text{bits-back}} \;=\; \underbrace{\mathbb{E}_q[-\log_2 P(\text{data}\mid\theta)]}_{\text{distortion / reconstruction}} \;+\; \underbrace{D_{\mathrm{KL}}\!\big(q(\theta\mid\text{data}) \,\|\, P(\theta)\big)}_{\text{rate / code cost}}.$$

    Read it slowly: the **reconstruction loss** of a VAE is the residual description length, and the **KL term** is the rate you pay to communicate which latent you used, *after* the bits-back refund. A VAE is a learned, amortized MDL code, and bits-back is the bookkeeping that makes its rate honest. We will build exactly this — and the BB-ANS algorithm that implements it for real — in **6E**. For now, just hold the picture: posterior uncertainty is not wasted; it is *recyclable* code length.

    > [MacKay Ch 28.3](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) presents bits-back coding and the description-length view of the posterior.
    > [Grünwald §2.6](file:///C:/Users/landa/info-theory-course/textbooks/Grunwald-MDL.pdf) connects refined MDL to the same mixture-coding idea.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(5)
        _n = 50
        _data = _rng.normal(0.0, 1.0, _n)
        _xbar = float(np.mean(_data))

        _prior_var = 4.0
        _post_var = 1.0 / (1.0 / _prior_var + _n)
        _post_mean = _post_var * (_n * _xbar)

        def codelen_nats(mu):
            return 0.5 * np.sum((_data - mu) ** 2) + 0.5 * _n * np.log(2 * np.pi)

        _two_part = codelen_nats(_post_mean) + 0.5 * _post_mean**2 / _prior_var
        _two_part += 0.5 * np.log(2 * np.pi * _prior_var)

        _ll_term = float(np.mean([codelen_nats(_rng.normal(_post_mean, np.sqrt(_post_var)))
                                  for _ in range(4000)]))
        _kl = 0.5 * (_post_var / _prior_var + _post_mean**2 / _prior_var
                     - 1 + np.log(_prior_var / _post_var))
        _bits_back = _ll_term + _kl

        print("=== Bits-back saves the posterior's entropy (in nats) ===")
        print(f"crude two-part length (commit to θ̂)   : {_two_part:8.2f} nats")
        print(f"bits-back length  = E_q[NLL] + KL(q||p): {_bits_back:8.2f} nats")
        print(f"posterior entropy refunded H[q]        : {0.5 * np.log(2 * np.pi * np.e * _post_var):8.2f} nats")
        print()
        print("Bits-back = negative ELBO: reconstruction (E_q[NLL]) + rate (KL). See 6E.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    MDL is not a niche statistics tool — it is one of the cleanest lenses on *generalization*, the central problem of machine learning:

    - **Regularization is description length.** An $L_2$ penalty is a Gaussian prior on weights, hence a code-length cost $-\log_2 P(\theta)$; an $L_1$ penalty is a Laplace prior that pays fewer bits for sparse weights. "Add a regularizer" and "shorten the model part of a two-part code" are the same move. Weight decay *is* MDL.
    - **Why bigger-isn't-always-better — and the modern twist.** Classical MDL predicts the U-shaped curve you played with: too-complex models pay too many model bits and overfit. Deep nets famously seem to *violate* this (huge models that still generalize), but the resolution is also information-theoretic — what matters is the *effective* description length of the function found by SGD, not the raw parameter count. A flat minimum is one that needs few bits to specify (you can perturb the weights and still decode the data), so it has a short MDL code and generalizes. The razor still cuts; you just measure the right thing.
    - **The compression–generalization bound.** There are PAC-Bayes and MDL theorems that literally bound test error by *training error plus (description length / n)*. If your model compresses the training data well *and* is short to describe, it provably generalizes. This is the rigorous spine under "Occam's razor works."
    - **Model selection in practice.** Choosing the number of clusters in a mixture, the rank of a factorization, the depth of a tree, the latent dimension of a VAE — all are model-order selection problems, and BIC/MDL give you a principled, penalty-with-units answer instead of eyeballing a validation curve.
    - **The bridge to 6C–6E.** Bits-back coding (Section 6) is the conceptual engine of the **information bottleneck** (6C, rate = bits to describe the representation), **neural MI estimation** (6D), and **VAEs / neural compression** (6E, where the ELBO *is* a bits-back description length). MDL is the unifying language for all of Part 6's "learning as optimal coding" story.

    The one-sentence takeaway: **the model that compresses your data the most — counting the model itself — is the model that has learned the most and will generalize the best.** Information theory turns that intuition into a number you can minimize.

    Next up, **Module 6C** makes the rate-side of this story precise with the *information bottleneck*: compress your input as hard as possible while keeping the bits that are *relevant* to the target.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise hands you a problem and a skeleton — fill in the `...` and `TODO`s. Together they walk the full MDL pipeline: residual code length, model code length, the two-part minimum, the BIC comparison, and the compression view of complexity.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Residual Description Length

    Under a Gaussian noise model with the maximum-likelihood variance $\hat\sigma^2 = \tfrac1n\sum_i r_i^2$, the residual code length is $\tfrac{n}{2}\log_2(2\pi e\,\hat\sigma^2)$ bits. Implement it, given an array of residuals. Confirm that tighter fits (smaller residuals) cost fewer bits.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def residual_bits(resid):
            resid = np.asarray(resid, dtype=float)
            n = len(resid)
            # TODO: sigma2 = ML variance = mean of squared residuals (floor it at 1e-12)
            sigma2 = ...
            # TODO: return (n/2) * log2(2*pi*e*sigma2)
            return ...

        # print(residual_bits([0.01, -0.01, 0.02, -0.02]))   # small -> few bits
        # print(residual_bits([1.0, -1.0, 0.8, -0.9]))       # large -> many more bits

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Model Description Length

    The model part of a two-part code charges $\tfrac12\log_2 n$ bits per free parameter. For a degree-$d$ polynomial there are $k = d+1$ parameters. Implement `model_bits(d, n)` and tabulate it for $d = 0\ldots 8$ with $n = 30$. Notice it grows *linearly* in $d$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def model_bits(d, n):
            k = d + 1
            # TODO: return (k/2) * log2(n)
            return ...

        # for d in range(9):
        #     print(f"d={d}: {model_bits(d, 30):.2f} bits")   # 2.45, 4.91, 7.36, ...

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Find the MDL-Optimal Degree

    Put the two parts together. Given noisy data, fit polynomials of degree $0\ldots d_{\max}$, compute the total description length for each, and return the degree that minimizes it. Use `np.vander(x, d+1, increasing=True)` and `np.linalg.lstsq` for the fit. On the data below (true model is quadratic) you should recover a small degree near 2.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(2)
        n = 35
        x = np.linspace(-1, 1, n)
        y = 1.0 - 0.5 * x + 2.0 * x**2 + rng.normal(0, 0.2, n)

        def total_bits(x, y, d):
            X = np.vander(x, d + 1, increasing=True)
            coef, *_ = np.linalg.lstsq(X, y, rcond=None)
            resid = y - X @ coef
            sigma2 = max(np.mean(resid**2), 1e-12)
            # TODO: data_bits = (n/2) log2(2 pi e sigma2); model_bits = ((d+1)/2) log2(n)
            data_bits = ...
            model_bits = ...
            return data_bits + model_bits

        # TODO: loop d over 0..10, find the argmin of total_bits
        best_d = ...
        # print("MDL-optimal degree:", best_d)   # expect a small degree, near 2

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: MDL vs AIC vs BIC on the Same Fit

    Three criteria, three penalties. For a fit with $k$ parameters, max log-likelihood $\hat\ell$ (in nats), and $n$ data points: AIC $= -2\hat\ell + 2k$; BIC $= -2\hat\ell + k\ln n$; and the two-part MDL code length (in bits) $= -\hat\ell/\ln 2 + \tfrac k2\log_2 n$. Compute all three across degrees and compare which degree each selects (AIC usually picks a larger model).
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(4)
        n = 40
        x = np.linspace(-1, 1, n)
        y = 0.3 + x - x**2 + rng.normal(0, 0.25, n)

        def fit_loglik_nats(d):
            X = np.vander(x, d + 1, increasing=True)
            coef, *_ = np.linalg.lstsq(X, y, rcond=None)
            resid = y - X @ coef
            sigma2 = max(np.mean(resid**2), 1e-12)
            ll = -0.5 * n * (np.log(2 * np.pi * sigma2) + 1.0)
            return ll, d + 1

        for d in range(8):
            ll, k = fit_loglik_nats(d)
            # TODO: aic = -2*ll + 2*k
            aic = ...
            # TODO: bic = -2*ll + k*log(n)
            bic = ...
            # TODO: mdl_bits = -ll/log(2) + (k/2)*log2(n)
            mdl_bits = ...
            # print(f"d={d}: AIC={aic:.1f}  BIC={bic:.1f}  MDL={mdl_bits:.1f} bits")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Compression as a Complexity Proxy

    Kolmogorov complexity is uncomputable, but a real compressor approximates it from above. Use `zlib` to estimate the description length (in bits) of several strings, and confirm that structured strings compress (small proxy-$K$) while random strings do not (ratio near 1). This is the practical face of "regularity = compressibility."
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        import zlib

        def proxy_complexity_bits(s):
            raw = s.encode("utf-8")
            # TODO: compress with zlib.compress(raw, level=9), return len(compressed)*8
            return ...

        rng = np.random.default_rng(0)
        structured = "ABAB" * 250
        random_str = "".join(str(b) for b in rng.integers(0, 2, 1000))

        # print("structured:", proxy_complexity_bits(structured), "bits   (small)")
        # print("random:    ", proxy_complexity_bits(random_str), "bits   (~ raw length)")

    _run()
    return


if __name__ == "__main__":
    app.run()
