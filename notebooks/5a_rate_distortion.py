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
    # 5A: Rate-Distortion Theory

    > *"We are not interested in the exact reproduction of the message, but only in a reproduction good enough to satisfy our needs."*
    > — Claude Shannon, paraphrased from *A Mathematical Theory of Communication*

    Everything you have built so far in this course was about preserving information *perfectly*. The source coding theorem (Module 2A) told you that you can compress a source down to its entropy $H(X)$ bits per symbol and not one bit further — if you insist on perfect, lossless reconstruction. But in the real world you almost never insist on that. A photograph compressed by JPEG is not bit-for-bit the original. An MP3 throws away sound you cannot hear. A neural network's latent code is a deliberately lossy summary of its input. The moment you allow yourself to be *approximately* right, an entirely new and richer trade-off opens up.

    This module is about that trade-off, made exact. The central object is the **rate-distortion function** $R(D)$: the minimum number of bits per symbol you must spend to reconstruct a source within an allowed average distortion $D$. It is the lossy counterpart of entropy, and it is one of the most beautiful results in the whole field — a single curve that tells you the *exact* price of "good enough."

    You already know mutual information cold from Module 1B, so I will build directly on it. By the end you will have a formula, two fully worked closed-form cases (a coin and a Gaussian), the gorgeous "reverse water-filling" picture for many parallel sources, and a working solver you can drive yourself. And you will see why this is not a museum piece: $R(D)$ is the theoretical skeleton underneath every lossy codec and, as Part 6 will show, underneath the VAE itself.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Lossy vs Lossless: Why We Need a New Theory

    Recall the deal from source coding. A source $X$ with entropy $H(X)$ can be compressed to $H(X)$ bits per symbol on average, and below that you *will* lose information — perfect reconstruction becomes impossible. That is a hard floor, and it is *the* floor as long as you demand the decoder output the original exactly.

    But suppose you relax the demand. You build an encoder that maps the source $X$ to some compressed description, and a decoder that produces a reconstruction $\hat{X}$ that is *allowed to differ* from $X$, as long as the difference is small on average. Now two numbers compete:

    - **Rate** $R$ — bits per symbol you spend on the description. Lower is cheaper.
    - **Distortion** $D$ — how far $\hat{X}$ strays from $X$ on average. Lower is more faithful.

    These pull against each other. Spend more bits, get a better reconstruction. Spend fewer, accept more error. The question rate-distortion theory answers is the *exact* shape of that trade-off: **for a given budget of distortion $D$, what is the smallest rate $R$ that can possibly achieve it?** That minimum is the function $R(D)$.

    Two sanity checks frame the whole curve. At $D = 0$ (no error allowed) you are back to lossless coding, so $R(0) = H(X)$ for a discrete source — the entropy reappears as the left endpoint. And once $D$ is large enough that you may as well not transmit at all (just guess the best constant), the rate drops to $R = 0$. Everything interesting happens between those two extremes.

    > [Cover & Thomas Ch 10.1](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) opens rate-distortion exactly here.
    > [Gallager Ch 9](https://www.wiley-vch.de/de/fachgebiete/ingenieurwesen/elektrotechnik-und-elektronik-10ee/kommunikationstechnik-10ee2/information-theory-and-reliable-communication-978-0-471-29048-3) gives the classical source-coding-with-fidelity-criterion treatment.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Distortion Measures: How We Score a Mistake

    Before we can minimize distortion we must *define* it. A **distortion measure** is a function $d(x, \hat{x}) \ge 0$ that says how bad it is to reconstruct the symbol $x$ as $\hat{x}$. The overall distortion of a scheme is the *expected* per-symbol distortion,

    $$D = \mathbb{E}\big[d(X, \hat{X})\big] = \sum_{x, \hat{x}} p(x)\, p(\hat{x}\mid x)\, d(x, \hat{x}),$$

    where $p(\hat{x}\mid x)$ is the (possibly random) channel from source to reconstruction that the encoder–decoder pair induces. Two distortion measures dominate the theory and the applications:

    - **Hamming distortion** (for discrete sources): $d(x, \hat{x}) = 0$ if $x = \hat{x}$ and $1$ otherwise. Then $D = \Pr[\hat{X} \ne X]$ is simply the *symbol error probability*. This is the natural measure for bits, labels, and categorical data.
    - **Squared-error distortion** (for continuous sources): $d(x, \hat{x}) = (x - \hat{x})^2$. Then $D = \mathbb{E}[(X - \hat{X})^2]$ is the familiar **mean squared error (MSE)** — the workhorse of signal processing and the default reconstruction loss in regression and autoencoders.

    The choice of $d$ is a modeling decision: it encodes what "good enough" *means* for your problem. Perceptual codecs replace MSE with measures that track human vision or hearing; that is engineering on top of the same theory. For this module we use the two canonical measures, because they give clean closed-form answers we can verify by hand.

    > [Cover & Thomas Ch 10.2](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) formalizes distortion measures and distortion-typical sequences.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. The Rate-Distortion Function $R(D)$

    Here is the definition, and it is gorgeous in its economy. Fix the source distribution $p(x)$ and the distortion measure $d$. Consider **all** conditional distributions $p(\hat{x}\mid x)$ — every possible (stochastic) way of producing a reconstruction — whose *expected* distortion is at most $D$. Among those, find the one with the **smallest mutual information** between source and reconstruction:

    $$\boxed{\,R(D) = \min_{\substack{p(\hat{x}\mid x)\,:\\ \mathbb{E}[d(X,\hat X)]\,\le\,D}} I(X; \hat{X})\,}$$

    Why mutual information? Because $I(X; \hat{X})$ is exactly the number of bits the reconstruction $\hat{X}$ must carry *about* the source $X$. Minimizing it means finding the cheapest description that still meets the fidelity bar. Shannon's **rate-distortion theorem** then promises that this information-theoretic quantity is *operationally achievable*: with long enough blocks you can build codes at rate arbitrarily close to $R(D)$ and distortion arbitrarily close to $D$, and you cannot do better. The single curve $R(D)$ is simultaneously a definition (a minimization) and a hard operational limit.

    Three structural facts hold for *every* source and distortion measure, and they shape every $R(D)$ curve you will ever draw:

    1. **$R(D)$ is non-increasing.** More allowed distortion can never require more bits.
    2. **$R(D)$ is convex.** The trade-off has diminishing returns — the curve bends the "good" way, which is what makes time-sharing between two schemes never beat the curve.
    3. **It hits the axes predictably.** $R(0) = H(X)$ for a discrete source, and $R(D) = 0$ for all $D \ge D_{\max}$, where $D_{\max} = \min_{\hat{x}} \mathbb{E}[d(X, \hat{x})]$ is the distortion of the best single constant reconstruction.

    The next two sections solve this minimization *in closed form* for the two canonical cases. After that, a slider explorer and a numerical solver let you play with the curve directly.

    > [Cover & Thomas Ch 10.2–10.4](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) states and proves the rate-distortion theorem; [Polyanskiy & Wu](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf) gives the modern one-shot and converse viewpoint.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. The Bernoulli Source under Hamming Distortion

    Take the simplest interesting source: a single bit $X \sim \text{Bernoulli}(p)$ with $p \le \tfrac12$, scored by Hamming distortion. The reconstruction $\hat{X}$ is also a bit, and $D = \Pr[\hat{X} \ne X]$ is the bit-flip probability you are willing to tolerate. Solving the minimization gives a strikingly clean answer:

    $$R(D) = \begin{cases} H_2(p) - H_2(D), & 0 \le D \le \min(p,\, 1-p),\\[4pt] 0, & D > \min(p,\, 1-p),\end{cases}$$

    where $H_2(\cdot)$ is the binary entropy function from Module 1A. Read it slowly, because every piece is meaningful:

    - At $D = 0$: $R = H_2(p) - H_2(0) = H_2(p) = H(X)$. The lossless floor reappears, exactly as promised.
    - As $D$ grows, you *subtract off* $H_2(D)$ — the entropy of the errors you are permitting. Allowing errors is allowing the decoder to be uncertain, and that uncertainty is worth $H_2(D)$ bits you no longer have to pay for.
    - At $D = p$ (taking $p \le \tfrac12$): $R = H_2(p) - H_2(p) = 0$. Once you tolerate as much error as the source's own bias, you can transmit *nothing* — just output the constant $\hat{X} = 0$, which is wrong exactly a fraction $p$ of the time. That is $D_{\max} = p$.

    **Worked number.** Let $p = 0.5$ (a fair bit, $H(X) = 1$). Allowing $D = 0.1$ gives
    $R(0.1) = 1 - H_2(0.1) = 1 - 0.469 = 0.531$ bits. So tolerating a 10% bit-error rate cuts your rate roughly in half. Tolerate $D = 0.25$ and you get $R = 1 - H_2(0.25) = 1 - 0.811 = 0.189$ bits — a fair coin squeezed under a fifth of a bit, at the cost of being wrong a quarter of the time.

    The code below verifies the formula and its endpoints.

    > [Cover & Thomas Ch 10.3.1](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) derives the binary $R(D)$ in full.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def h2(x):
            x = np.asarray(x, dtype=float)
            out = np.zeros_like(x)
            m = (x > 0) & (x < 1)
            out[m] = -x[m] * np.log2(x[m]) - (1 - x[m]) * np.log2(1 - x[m])
            return out

        def R_bernoulli(p, D):
            Dmax = min(p, 1 - p)
            if D >= Dmax:
                return 0.0
            return float(h2(np.array(p)) - h2(np.array(D)))

        print("=== Bernoulli(p) source, Hamming distortion ===")
        _p = 0.5
        print(f"source p = {_p},  H(X) = H2(p) = {float(h2(np.array(_p))):.4f} bits")
        for _D in [0.0, 0.05, 0.10, 0.25, 0.50]:
            print(f"  D = {_D:.2f}   R(D) = {R_bernoulli(_p, _D):.4f} bits")

        print("\nEndpoint checks:")
        print(f"  R(0)    = {R_bernoulli(_p, 0.0):.4f}  should equal H(X) = {float(h2(np.array(_p))):.4f}")
        print(f"  R(Dmax) = {R_bernoulli(_p, _p):.4f}  should equal 0")

        print("\nBiased source p = 0.2:")
        _p = 0.2
        print(f"  H(X) = {float(h2(np.array(_p))):.4f} bits,  Dmax = {min(_p, 1-_p):.2f}")
        for _D in [0.0, 0.05, 0.10, 0.20]:
            print(f"  D = {_D:.2f}   R(D) = {R_bernoulli(_p, _D):.4f} bits")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Gaussian Source under Squared Error

    Now the continuous flagship: a source $X \sim \mathcal{N}(0, \sigma^2)$ scored by squared error $d(x, \hat{x}) = (x - \hat{x})^2$. This is the single most important rate-distortion result in practice, because Gaussian-with-MSE models speech, images, sensor noise, and the latent codes of generative models. The closed form is again beautiful:

    $$R(D) = \begin{cases} \dfrac{1}{2} \log_2 \dfrac{\sigma^2}{D}, & 0 \le D \le \sigma^2,\\[8pt] 0, & D > \sigma^2.\end{cases}$$

    Every factor has meaning:

    - **The $\tfrac12 \log_2$** is the differential-entropy signature of a Gaussian (Module 3C) — each *halving* of the allowed MSE costs exactly $\tfrac12 \log_2 2 = \tfrac12$ bit.
    - **The ratio $\sigma^2 / D$** is a signal-to-distortion ratio. Demanding MSE ten times smaller than the source variance costs $\tfrac12 \log_2 10 \approx 1.66$ bits.
    - **At $D = \sigma^2$**, the rate is $0$: you may as well reconstruct $\hat{X} = 0$ (the mean), which incurs exactly MSE $= \sigma^2$. That is $D_{\max} = \sigma^2$.

    Inverting gives the **distortion-rate function** $D(R) = \sigma^2\, 2^{-2R}$: each extra bit of rate cuts the MSE by a factor of 4 (i.e. 6 dB per bit — the famous "6 dB per bit" rule of quantization). The Gaussian is also the *hardest* source to compress at a given variance: among all sources with variance $\sigma^2$, the Gaussian has the largest $R(D)$. So this curve is a worst-case guarantee — if your data is less Gaussian, you can only do better.

    The demo verifies the formula, the inversion, and the 6 dB-per-bit rule.

    > [Cover & Thomas Ch 10.3.2](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) derives the Gaussian $R(D)$ and the converse.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def R_gaussian(sigma2, D):
            if D >= sigma2:
                return 0.0
            return float(0.5 * np.log2(sigma2 / D))

        def D_gaussian(sigma2, R):
            return float(sigma2 * 2.0 ** (-2.0 * R))

        _sig2 = 1.0
        print("=== Gaussian(0, sigma^2) source, squared-error distortion ===")
        print(f"sigma^2 = {_sig2},  Dmax = sigma^2 = {_sig2}")
        for _D in [1.0, 0.5, 0.25, 0.1, 0.01]:
            print(f"  D = {_D:5.2f}   R(D) = {R_gaussian(_sig2, _D):.4f} bits")

        print("\nDistortion-rate D(R) = sigma^2 * 2^(-2R):")
        for _R in [0, 1, 2, 3]:
            _D = D_gaussian(_sig2, _R)
            print(f"  R = {_R} bits  ->  D = {_D:.5f}   (each bit divides MSE by 4)")

        print("\n6 dB-per-bit rule (SNR gain in dB per added bit):")
        _d0 = D_gaussian(_sig2, 2)
        _d1 = D_gaussian(_sig2, 3)
        _gain_db = 10 * np.log10(_d0 / _d1)
        print(f"  going from R=2 to R=3 bits improves SDR by {_gain_db:.2f} dB  (~6.02 dB)")

        print("\nRound-trip check R(D(R)) == R:")
        for _R in [0.5, 1.5, 2.5]:
            _back = R_gaussian(_sig2, D_gaussian(_sig2, _R))
            print(f"  R={_R}  ->  D={D_gaussian(_sig2, _R):.4f}  ->  R(D)={_back:.4f}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. The $R(D)$ Curve Explorer

    Time to see both curves live. Pick the source type, set its parameter, and slide the allowed distortion $D$. The plot draws the full $R(D)$ curve, marks your operating point, and reports the rate and the bits saved versus lossless. Watch the three structural facts in action: the curve starts at the entropy floor on the left, falls convexly, and flattens to $0$ once $D$ reaches $D_{\max}$.
    """)
    return


@app.cell
def _(mo):
    rd_source = mo.ui.dropdown(
        options=["Bernoulli (Hamming)", "Gaussian (squared error)"],
        value="Bernoulli (Hamming)",
        label="Source / distortion",
    )
    rd_source
    return (rd_source,)


@app.cell
def _(mo):
    rd_param = mo.ui.slider(
        start=0.05, stop=2.0, step=0.05, value=0.5,
        label="source parameter (p for Bernoulli, sigma^2 for Gaussian)",
    )
    rd_param
    return (rd_param,)


@app.cell
def _(mo):
    rd_distortion = mo.ui.slider(
        start=0.0, stop=1.0, step=0.01, value=0.1,
        label="allowed distortion D (fraction of D_max)",
    )
    rd_distortion
    return (rd_distortion,)


@app.cell
def _(rd_distortion, rd_param, rd_source):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def h2(x):
            x = np.asarray(x, dtype=float)
            out = np.zeros_like(x)
            m = (x > 0) & (x < 1)
            out[m] = -x[m] * np.log2(x[m]) - (1 - x[m]) * np.log2(1 - x[m])
            return out

        _kind = rd_source.value
        _frac = rd_distortion.value

        if _kind.startswith("Bernoulli"):
            _p = min(max(rd_param.value, 0.01), 0.99)
            if _p > 0.5:
                _p = 1 - _p
            _Dmax = _p
            _Hx = float(h2(np.array(_p)))
            _D = _frac * _Dmax
            _Ds = np.linspace(0.0, _Dmax, 400)
            _Rs = h2(np.array(_p)) - h2(_Ds)
            _Rs = np.clip(_Rs, 0.0, None)
            _Rop = max(_Hx - float(h2(np.array(min(_D, _Dmax)))), 0.0)
            _xlabel = "distortion D = P(error)"
            _title = f"Bernoulli R(D),  p = {_p:.2f},  H(X) = {_Hx:.3f} bits"
        else:
            _sig2 = max(rd_param.value, 0.05)
            _Dmax = _sig2
            _Hx = float("inf")
            _D = _frac * _Dmax
            _Ds = np.linspace(0.001 * _sig2, _Dmax, 400)
            _Rs = 0.5 * np.log2(_sig2 / _Ds)
            _Rs = np.clip(_Rs, 0.0, None)
            _Dop = max(min(_D, _Dmax), 1e-6)
            _Rop = max(0.5 * np.log2(_sig2 / _Dop), 0.0)
            _xlabel = "distortion D = MSE"
            _title = f"Gaussian R(D),  sigma^2 = {_sig2:.2f},  Dmax = {_Dmax:.2f}"

        _fig, _ax = plt.subplots(figsize=(7.2, 4.4))
        _ax.plot(_Ds, _Rs, lw=2.4, color="steelblue", label="R(D)")
        _ax.scatter([min(_D, _Dmax)], [_Rop], color="red", zorder=6, s=70)
        _ax.axvline(min(_D, _Dmax), color="red", ls="--", alpha=0.35)
        _ax.axhline(_Rop, color="red", ls="--", alpha=0.35)
        _saved = None if not np.isfinite(_Hx) else max(_Hx - _Rop, 0.0)
        _saved_line = "lossless rate infinite" if _saved is None else f"saved = {_saved:.3f} bits/sym"
        _ax.annotate(
            f"D = {min(_D, _Dmax):.3f}\nR = {_Rop:.3f} bits\n{_saved_line}",
            xy=(min(_D, _Dmax), _Rop),
            xytext=(0.55, 0.6), textcoords="axes fraction",
            arrowprops=dict(arrowstyle="->", color="red", alpha=0.7),
        )
        _ax.set_xlabel(_xlabel)
        _ax.set_ylabel("rate R (bits / symbol)")
        _ax.set_title(_title)
        _ax.grid(True, alpha=0.3)
        _ax.set_ylim(bottom=-0.02)
        _ax.legend(loc="upper right")
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.vstack([
        mo.image(src="../animations/rendered/RateDistortionCurve.gif", alt="Animation of a rate-distortion curve trading reconstruction error for bitrate"),
        mo.md("*Animation: the rate-distortion curve trades bitrate against reconstruction error.*"),
    ])
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Reverse Water-Filling: Many Sources at Once

    The single-Gaussian result becomes genuinely powerful when you have *many* independent Gaussian sources to encode at once — think of the coefficients of an image after a transform, where each coefficient is roughly an independent Gaussian with its own variance $\sigma_i^2$. You have a total distortion budget to spend across them. How should you allocate bits?

    The answer is **reverse water-filling**, the rate-distortion mirror of the channel water-filling you met in Module 3C. The optimal per-source distortion is

    $$D_i = \min(\lambda,\ \sigma_i^2), \qquad \text{choose } \lambda \text{ so that } \sum_i D_i = D_{\text{total}},$$

    and the total rate is $R = \sum_i \tfrac12 \log_2^{+}\!\big(\sigma_i^2 / \lambda\big)$, where $\log^{+} = \max(\log, 0)$. Picture a single water level $\lambda$:

    - **Low-variance sources** ($\sigma_i^2 \le \lambda$) are submerged below the level. You spend *zero* bits on them and simply let their full variance become distortion ($D_i = \sigma_i^2$, i.e. reconstruct them as $0$). They are too quiet to be worth describing.
    - **High-variance sources** ($\sigma_i^2 > \lambda$) poke above the level. Each is compressed down to the *same* floor distortion $D_i = \lambda$, spending $\tfrac12 \log_2(\sigma_i^2/\lambda)$ bits.

    The slogan: **equalize the distortion across the components you bother to encode, and drop the components too small to matter.** It is the reverse of channel water-filling — there you poured *power* into the best channels; here you pour *distortion* into the weakest sources. The demo finds $\lambda$ by bisection for a bank of sources and shows the classic "water poured up to level $\lambda$" picture.

    > [Cover & Thomas Ch 10.3.3](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) derives reverse water-filling for parallel Gaussian sources.
    """)
    return


@app.cell
def _(mo):
    rwf_budget = mo.ui.slider(
        start=0.1, stop=8.0, step=0.1, value=2.0,
        label="total distortion budget D_total",
    )
    rwf_budget
    return (rwf_budget,)


@app.cell
def _(rwf_budget):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _variances = np.array([4.0, 3.0, 2.2, 1.5, 1.0, 0.6, 0.3, 0.15])
        _Dtot = min(rwf_budget.value, float(_variances.sum()) - 1e-6)

        def total_D(lmbda):
            return float(np.sum(np.minimum(lmbda, _variances)))

        _lo, _hi = 0.0, float(_variances.max())
        for _ in range(100):
            _mid = 0.5 * (_lo + _hi)
            if total_D(_mid) < _Dtot:
                _lo = _mid
            else:
                _hi = _mid
        _lam = 0.5 * (_lo + _hi)

        _D = np.minimum(_lam, _variances)
        _R = np.where(_variances > _lam, 0.5 * np.log2(_variances / _lam), 0.0)

        _idx = np.arange(len(_variances))
        _fig, _ax = plt.subplots(figsize=(7.6, 4.4))
        _ax.bar(_idx, _variances, color="lightgray", edgecolor="gray",
                label="source variance sigma_i^2")
        _ax.bar(_idx, _D, color="steelblue", alpha=0.85,
                label="distortion D_i (kept as error)")
        _ax.axhline(_lam, color="red", ls="--", lw=2,
                    label=f"water level lambda = {_lam:.3f}")
        for _i in _idx:
            if _variances[_i] > _lam:
                _ax.text(_i, _variances[_i] + 0.06, f"{_R[_i]:.2f}b",
                         ha="center", fontsize=8, color="darkblue")
        _ax.set_xlabel("source index i")
        _ax.set_ylabel("variance / distortion")
        _ax.set_title(
            f"Reverse water-filling   D_total = {_D.sum():.2f}   R_total = {_R.sum():.3f} bits"
        )
        _ax.legend(loc="upper right", fontsize=8)
        _ax.grid(True, axis="y", alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _variances = np.array([4.0, 3.0, 2.2, 1.5, 1.0, 0.6, 0.3, 0.15])
        _Dtot = 2.0

        def total_D(lmbda):
            return float(np.sum(np.minimum(lmbda, _variances)))

        _lo, _hi = 0.0, float(_variances.max())
        for _ in range(100):
            _mid = 0.5 * (_lo + _hi)
            if total_D(_mid) < _Dtot:
                _lo = _mid
            else:
                _hi = _mid
        _lam = 0.5 * (_lo + _hi)

        _D = np.minimum(_lam, _variances)
        _R = np.where(_variances > _lam, 0.5 * np.log2(_variances / _lam), 0.0)

        print("=== Reverse water-filling over 8 Gaussian sources ===")
        print(f"variances    : {_variances}")
        print(f"D_total budget: {_Dtot}")
        print(f"water level lambda = {_lam:.4f}")
        print()
        print(f"{'i':>2} {'var':>6} {'D_i':>7} {'bits':>7}  status")
        for _i in range(len(_variances)):
            _status = "encoded" if _variances[_i] > _lam else "dropped (submerged)"
            print(f"{_i:>2} {_variances[_i]:>6.2f} {_D[_i]:>7.3f} {_R[_i]:>7.3f}  {_status}")
        print()
        print(f"sum D_i = {_D.sum():.4f}  (matches budget {_Dtot})")
        print(f"sum R_i = {_R.sum():.4f} bits total")
        print("Note: every ENCODED source ends at the SAME distortion lambda.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 8. Computing $R(D)$ for Any Discrete Source: Blahut–Arimoto

    The Bernoulli and Gaussian curves are closed-form gifts. For a *general* discrete source there is usually no formula, but there is a clean iterative algorithm — the **Blahut–Arimoto algorithm**, the same machine that computes channel capacity in Module 3A, run in its rate-distortion mode.

    The trick is the Lagrangian. Instead of fixing $D$ and minimizing $I(X;\hat X)$, introduce a slope parameter $\beta \ge 0$ and minimize $I(X;\hat X) + \beta\, \mathbb{E}[d]$ over both the test channel $p(\hat x \mid x)$ and the output marginal $q(\hat x)$. Sweeping $\beta$ from $0$ to $\infty$ traces out the entire $R(D)$ curve, where $\beta = -\,dR/dD$ is the local slope. The update alternates two closed-form steps:

    $$q(\hat x) \leftarrow \sum_x p(x)\, p(\hat x \mid x), \qquad p(\hat x \mid x) \leftarrow \frac{q(\hat x)\, e^{-\beta\, d(x,\hat x)}}{\sum_{\hat x'} q(\hat x')\, e^{-\beta\, d(x, \hat x')}}.$$

    Each step strictly decreases the Lagrangian, and the iteration provably converges to the true $R(D)$ point for that $\beta$. The demo runs pure-numpy Blahut–Arimoto on a 4-symbol source with Hamming distortion and prints the $(D, R)$ pairs it traces — a curve no closed form gave us, computed from the definition itself.

    > [Cover & Thomas Ch 10.8](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) and [Gallager Ch 9](https://www.wiley-vch.de/de/fachgebiete/ingenieurwesen/elektrotechnik-und-elektronik-10ee/kommunikationstechnik-10ee2/information-theory-and-reliable-communication-978-0-471-29048-3) present the Blahut–Arimoto iteration and its convergence.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def blahut_arimoto_rd(px, dist, beta, iters=400):
            n_x, n_xhat = dist.shape
            q = np.ones(n_xhat) / n_xhat
            for _ in range(iters):
                w = q[None, :] * np.exp(-beta * dist)
                w = w / w.sum(axis=1, keepdims=True)
                q = px @ w
            joint = px[:, None] * w
            with np.errstate(divide="ignore", invalid="ignore"):
                ratio = w / q[None, :]
                logr = np.where(joint > 0, np.log2(ratio), 0.0)
            I = float(np.sum(joint * logr))
            D = float(np.sum(joint * dist))
            return max(I, 0.0), D

        _px = np.array([0.4, 0.3, 0.2, 0.1])
        _n = len(_px)
        _dist = 1.0 - np.eye(_n)

        _H = float(-np.sum(_px[_px > 0] * np.log2(_px[_px > 0])))
        print("=== Blahut-Arimoto: R(D) for a 4-symbol source (Hamming) ===")
        print(f"source p = {_px},  H(X) = {_H:.4f} bits")
        print(f"\n{'beta':>6} {'D':>8} {'R (bits)':>10}")
        for _beta in [0.0, 0.5, 1.0, 2.0, 4.0, 8.0, 20.0]:
            _R, _D = blahut_arimoto_rd(_px, _dist, _beta)
            print(f"{_beta:>6.1f} {_D:>8.4f} {_R:>10.4f}")

        _Rhi, _Dhi = blahut_arimoto_rd(_px, _dist, 60.0)
        print(f"\nLarge beta -> D -> 0, R -> H(X): R = {_Rhi:.4f} vs H(X) = {_H:.4f}")
        _Rlo, _Dlo = blahut_arimoto_rd(_px, _dist, 0.0)
        _Dmax = 1 - _px.max()
        print(f"beta = 0  -> R = {_Rlo:.4f} (zero rate), D = {_Dlo:.4f}")
        print(f"  This beta=0 initialization uses a uniform reconstruction distribution.")
        print(f"  The true zero-rate Hamming floor is Dmax = 1 - max p = {_Dmax:.4f}.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 9. Why This Matters for Machine Learning

    Rate-distortion is not a side topic for ML — it is one of the load-bearing beams, and it shows up the moment you stop demanding perfect reconstruction:

    - **Autoencoders are rate-distortion machines.** An autoencoder's bottleneck *is* the rate (how many bits the latent code carries) and its reconstruction loss *is* the distortion (typically MSE, i.e. the Gaussian case from Section 5). Training trades one against the other; the achievable frontier is exactly an $R(D)$ curve. Module 6E makes this precise.
    - **The $\beta$-VAE is reverse water-filling in disguise.** The ELBO decomposes into a rate term (the KL to the prior) and a distortion term (the reconstruction likelihood), and the $\beta$ knob is *precisely* the Lagrange multiplier $\beta = -dR/dD$ from Section 8. Sweeping $\beta$ traces the model's R-D curve; high $\beta$ submerges latent dimensions (zero rate) exactly like a quiet Gaussian source in water-filling, which is the famous "posterior collapse."
    - **Lossy neural compression** (learned image and video codecs) optimizes a literal $R + \lambda D$ objective, with an entropy model estimating the rate of the quantized latents. The whole field is applied rate-distortion theory.
    - **The Information Bottleneck** (Module 6C) is a cousin: minimize $I(X; T) - \beta\, I(T; Y)$, the same "pay bits, gain fidelity" structure with relevance to the label playing the role of $-$distortion.
    - **The MSE-Gaussian bound as a yardstick.** Because the Gaussian is the worst case at fixed variance, $\tfrac12\log_2(\sigma^2/D)$ is a clean lower bound on the bits any MSE-based representation must carry — a sanity check on how compressible your features really are.

    The throughline for the rest of the course: every time a model *summarizes* rather than *memorizes* — a latent code, a quantized weight, a compressed activation — it is operating somewhere on an $R(D)$ curve, and this module is the theory that says where the frontier lies. Next, Module 5B turns the information lens onto statistics (types, hypothesis testing, Fisher information); and Part 6 cashes in rate-distortion directly when it builds the VAE.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the math-to-code translation for every concept in this module.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Bernoulli $R(D)$ from the Formula

    Implement `R_bernoulli(p, D)` returning the rate in bits for a Bernoulli($p$) source under Hamming distortion. Use $R = H_2(p) - H_2(D)$ inside the valid range, and clamp to $0$ once $D \ge \min(p, 1-p)$. Verify $R(0) = H_2(p)$ and $R(D_{\max}) = 0$.
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

        def h2(x):
            x = float(x)
            if x <= 0 or x >= 1:
                return 0.0
            return -x * np.log2(x) - (1 - x) * np.log2(1 - x)

        def R_bernoulli(p, D):
            Dmax = min(p, 1 - p)
            # TODO: if D >= Dmax return 0.0, else return h2(p) - h2(D)
            _result = ...
            return _result

        # print(R_bernoulli(0.5, 0.0))    # expect 1.0  (= H2(0.5))
        # print(R_bernoulli(0.5, 0.1))    # expect ~0.531
        # print(R_bernoulli(0.5, 0.5))    # expect 0.0

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Gaussian $R(D)$ and Its Inverse

    Implement the Gaussian rate-distortion function $R(D) = \tfrac12\log_2(\sigma^2/D)$ (clamped to $0$ for $D \ge \sigma^2$) and its inverse, the distortion-rate function $D(R) = \sigma^2\,2^{-2R}$. Check that they are inverses and that adding one bit divides the MSE by 4.
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

        def R_gaussian(sigma2, D):
            # TODO: if D >= sigma2 return 0.0, else 0.5*log2(sigma2/D)
            _result = ...
            return _result

        def D_gaussian(sigma2, R):
            # TODO: return sigma2 * 2**(-2R)
            _result = ...
            return _result

        # print(R_gaussian(1.0, 0.25))            # expect 1.0
        # print(D_gaussian(1.0, 1.0))             # expect 0.25
        # print(D_gaussian(1.0, 2) / D_gaussian(1.0, 3))   # expect 4.0

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Distortion of a Test Channel

    Given a source distribution `px`, a test channel `p_xhat_given_x` (rows = $x$, cols = $\hat x$, each row sums to 1), and a distortion matrix `dist`, compute the expected distortion $D = \sum_{x,\hat x} p(x)\,p(\hat x\mid x)\,d(x,\hat x)$. This is the quantity the $R(D)$ constraint bounds.
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

        px = np.array([0.5, 0.5])
        p_xhat_given_x = np.array([[0.9, 0.1],
                                   [0.1, 0.9]])
        dist = 1.0 - np.eye(2)   # Hamming

        # TODO: form the joint p(x, xhat) = px[:, None] * p_xhat_given_x
        joint = ...

        # TODO: expected distortion = sum(joint * dist)
        D = ...

        # print(f"expected distortion D = {D:.3f}")   # expect 0.100

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Reverse Water-Filling

    Given an array of source variances and a total distortion budget `Dtot`, find the water level $\lambda$ by bisection so that $\sum_i \min(\lambda, \sigma_i^2) = D_{\text{tot}}$, then compute each source's distortion $D_i = \min(\lambda, \sigma_i^2)$ and rate $R_i = \tfrac12\log_2^{+}(\sigma_i^2/\lambda)$. Confirm the kept sources all share the same distortion $\lambda$.
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

        variances = np.array([4.0, 2.0, 1.0, 0.25])
        Dtot = 1.5

        def total_D(lmbda):
            return np.sum(np.minimum(lmbda, variances))

        lo, hi = 0.0, float(variances.max())
        for _ in range(100):
            mid = 0.5 * (lo + hi)
            # TODO: if total_D(mid) < Dtot move lo up, else move hi down
            ...
        lam = 0.5 * (lo + hi)

        # TODO: per-source distortion and rate
        D_i = ...
        R_i = ...

        # print("lambda =", round(lam, 4))
        # print("D_i =", np.round(D_i, 4), " sum =", round(float(D_i.sum()), 4))  # sum ~ 1.5
        # print("R_i =", np.round(R_i, 4), " total =", round(float(R_i.sum()), 4))

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Blahut–Arimoto for $R(D)$

    Complete the Blahut–Arimoto iteration for a discrete source. Given `px`, a distortion matrix `dist`, and a slope `beta`, alternate (1) updating the test channel $w(\hat x\mid x) \propto q(\hat x)\,e^{-\beta d(x,\hat x)}$ (normalize each row) and (2) updating the output marginal $q(\hat x) = \sum_x p(x)\,w(\hat x\mid x)$. Then return $R = I(X;\hat X)$ and $D = \mathbb{E}[d]$. Sweeping `beta` should trace the curve from $R=0$ (small $\beta$) up to $R=H(X)$ (large $\beta$).
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

        def blahut_arimoto_rd(px, dist, beta, iters=400):
            n_x, n_xhat = dist.shape
            q = np.ones(n_xhat) / n_xhat
            for _ in range(iters):
                # TODO: w[x, xhat] = q[xhat] * exp(-beta * dist[x, xhat]), then normalize each ROW
                w = ...
                w = ...
                # TODO: q = px @ w
                q = ...
            joint = px[:, None] * w
            with np.errstate(divide="ignore", invalid="ignore"):
                logr = np.where(joint > 0, np.log2(w / q[None, :]), 0.0)
            # TODO: I = sum(joint * logr),  D = sum(joint * dist)
            I = ...
            D = ...
            return max(I, 0.0), D

        # px = np.array([0.4, 0.3, 0.2, 0.1])
        # dist = 1.0 - np.eye(4)
        # print(blahut_arimoto_rd(px, dist, 0.0))    # ~ (0.0, 0.75) with uniform q at beta=0
        # true zero-rate Hamming floor is 1 - max(px) = 0.6
        # print(blahut_arimoto_rd(px, dist, 60.0))   # ~ (H(X), 0.0) lossless floor

    _run()
    return


if __name__ == "__main__":
    app.run()
