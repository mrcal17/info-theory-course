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
    # 3C: Differential Entropy & the Gaussian Channel

    > *"The fundamental problem of communication is that of reproducing at one point either exactly or approximately a message selected at another point."*
    > — Claude Shannon, 1948

    So far our random variables have been discrete: coins, dice, letters, symbols off a finite alphabet. But the world is analog. A voltage on a wire, the air pressure at a microphone, the field strength at an antenna — these are *continuous* signals corrupted by *continuous* noise. To say anything quantitative about real channels — Wi-Fi, fiber, deep-space links, your phone — we need information theory for continuous random variables.

    That is what this module builds. We start by extending entropy to densities (the **differential entropy** $h(X)$), discover that it behaves *almost* like its discrete cousin but with one famous twist, and prove the single most useful fact about it: among all distributions of a fixed variance, the **Gaussian** has the most entropy. That one theorem hands us the capacity of the most important channel in all of engineering — the **additive white Gaussian noise (AWGN) channel** — in the form of the celebrated $\tfrac12\log_2(1+\mathrm{SNR})$ and its bandwidth-aware sibling, the **Shannon–Hartley** law.

    Then we go one level up. Real systems do not have a single channel; they have many parallel ones — frequency sub-bands, antenna modes, sub-carriers in OFDM. Given a fixed power budget, how should you spread your power across channels of differing noise? The answer is one of the most elegant results in the field: **water-filling**. By the end you will have a slider that turns SNR into capacity and a live allocator that pours power into parallel channels exactly as the theory prescribes.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Differential Entropy: Entropy for Densities

    A continuous random variable $X$ has a probability *density* $f(x)$ rather than a probability mass. The natural analogue of entropy replaces the sum with an integral:

    $$h(X) = -\int_{-\infty}^{\infty} f(x)\,\log_2 f(x)\,dx$$

    This is the **differential entropy**, written with a lowercase $h$ to distinguish it from the discrete $H$. It is the average of the "surprisal density" $-\log_2 f(x)$, weighted by $f$.

    **A worked example — the uniform density.** Let $X$ be uniform on $[0, a]$, so $f(x) = 1/a$ on that interval. Then

    $$h(X) = -\int_0^a \frac{1}{a}\,\log_2\frac{1}{a}\,dx = \log_2 a.$$

    Stare at that. If $a = 1$, then $h(X) = 0$. If $a < 1$ — a density squeezed into a narrow interval where $f(x) > 1$ — then $\log_2 a < 0$ and **the differential entropy is negative.** That can never happen for discrete entropy, where $H \ge 0$ always. This is the famous twist: $h(X)$ is *not* a measure of absolute uncertainty in bits, and it can be negative, zero, or positive.

    **Why the difference?** A discrete entropy counts the average bits to *exactly* identify an outcome. A continuous outcome has infinite precision, so identifying it exactly takes infinitely many bits. If you quantize $X$ into bins of width $\Delta$, the discrete entropy of the quantized variable is approximately $h(X) - \log_2 \Delta$ — it blows up as $\Delta \to 0$. Differential entropy is what is *left over* after you subtract that infinite $-\log_2\Delta$ baseline. It measures uncertainty **relative to a unit of measurement**, which is exactly why it can go negative and why it shifts when you rescale $X$.

    > [Cover & Thomas Ch 8.1](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) defines differential entropy and works the quantization argument carefully.
    > [Stone Ch 5](file:///C:/Users/landa/info-theory-course/textbooks/Stone.pdf) gives the gentle continuous-entropy picture.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        from scipy.integrate import trapezoid

        def differential_entropy_numeric(f, lo, hi, n=200000, base=2):
            x = np.linspace(lo, hi, n)
            fx = f(x)
            safe = np.where(fx > 0, fx, 1.0)
            integrand = np.where(fx > 0, -fx * np.log(safe), 0.0)
            return float(trapezoid(integrand, x) / np.log(base))

        def uniform_pdf(x, a):
            return np.where((x >= 0) & (x <= a), 1.0 / a, 0.0)

        def gaussian_pdf(x, sigma):
            return np.exp(-x**2 / (2 * sigma**2)) / np.sqrt(2 * np.pi * sigma**2)

        print("=== Differential entropy h(X), in bits ===")

        for a in [0.5, 1.0, 2.0, 4.0]:
            h_num = differential_entropy_numeric(lambda x, a=a: uniform_pdf(x, a), -1.0, a + 1.0)
            h_exact = np.log2(a)
            print(f"  Uniform[0,{a:>3}]   h = {h_num:+7.4f} bits   (exact log2 a = {h_exact:+7.4f})")

        print("\nNote: a < 1 gives NEGATIVE differential entropy --- impossible for discrete H.")

        sigma = 1.0
        h_gauss_num = differential_entropy_numeric(lambda x, s=sigma: gaussian_pdf(x, s), -12.0, 12.0)
        h_gauss_exact = 0.5 * np.log2(2 * np.pi * np.e * sigma**2)
        print(f"\n  Gaussian(0,1)    h = {h_gauss_num:+7.4f} bits   (exact 1/2 log2(2 pi e) = {h_gauss_exact:+7.4f})")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The Gaussian Has the Most Entropy

    Here is the keystone theorem of the whole module:

    > **Among all continuous random variables with a fixed variance $\sigma^2$, the Gaussian maximizes differential entropy.**

    For $X \sim \mathcal{N}(\mu, \sigma^2)$ the differential entropy is

    $$h(X) = \tfrac12\log_2\!\big(2\pi e\,\sigma^2\big) \quad\text{bits.}$$

    And for *any* density $f$ with variance $\sigma^2$, $h(f) \le \tfrac12\log_2(2\pi e\,\sigma^2)$, with equality **iff** $f$ is that Gaussian.

    **Why it is true (the one-line idea).** Let $\phi$ be the Gaussian with variance $\sigma^2$ and let $f$ be any other density with the same variance. Relative entropy is non-negative: $D(f \,\|\, \phi) \ge 0$. Expand it:

    $$0 \le D(f\,\|\,\phi) = -h(f) - \int f(x)\,\log_2 \phi(x)\,dx.$$

    Because $\log_2\phi(x)$ is a quadratic in $x$, the integral $\int f \log_2\phi$ depends on $f$ **only through its mean and variance** — which match $\phi$'s. So that integral equals $\int \phi\log_2\phi = -h(\phi)$. Substituting gives $0 \le -h(f) + h(\phi)$, i.e. $h(f) \le h(\phi)$. Done. The Gaussian wins because it is the maximum-entropy distribution under a second-moment (energy) constraint — a fact you will meet again in Module 6A.

    **Why this is the crux.** Two consequences fall out immediately:

    - On the *transmit* side: with a power (variance) budget, the input that packs in the most information is Gaussian. So optimal codewords look like Gaussian noise.
    - On the *receive* side: Gaussian noise is the *worst* noise for a given power — it destroys the most information. Nature being adversarial in exactly this way is what makes "$\tfrac12\log_2(1+\mathrm{SNR})$" both a hard ceiling and an achievable one.

    > [Cover & Thomas Ch 8.6](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) proves the maximum-entropy property; [Stone Ch 6](file:///C:/Users/landa/info-theory-course/textbooks/Stone.pdf) motivates it for the Gaussian channel.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def diff_entropy_samples_hist(samples, bins=400, base=2):
            _hist, _edges = np.histogram(samples, bins=bins, density=True)
            _w = _edges[1] - _edges[0]
            _p = _hist[_hist > 0]
            return float(-np.sum(_p * np.log(_p) * _w) / np.log(base))

        _rng = np.random.default_rng(0)
        _sigma2 = 1.0
        _n = 4_000_000
        _gauss_ceiling = 0.5 * np.log2(2 * np.pi * np.e * _sigma2)

        print(f"Target variance sigma^2 = {_sigma2}")
        print(f"Gaussian ceiling 1/2 log2(2 pi e sigma^2) = {_gauss_ceiling:.4f} bits\n")
        print("Differential entropy of several densities, ALL rescaled to variance 1:")

        _samp = _rng.normal(0, 1, _n)
        print(f"  Gaussian        h = {diff_entropy_samples_hist(_samp):+.4f} bits   <- maximal")

        _u = _rng.uniform(-1, 1, _n)
        _u = _u / _u.std()
        print(f"  Uniform         h = {diff_entropy_samples_hist(_u):+.4f} bits")

        _lap = _rng.laplace(0, 1, _n)
        _lap = _lap / _lap.std()
        print(f"  Laplace         h = {diff_entropy_samples_hist(_lap):+.4f} bits")

        _tri = _rng.triangular(-1, 0, 1, _n)
        _tri = _tri / _tri.std()
        print(f"  Triangular      h = {diff_entropy_samples_hist(_tri):+.4f} bits")

        print("\nEvery non-Gaussian density falls below the Gaussian ceiling, as the theorem promises.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. The AWGN Channel and Its Capacity

    Now we build the most important channel in engineering. The **additive white Gaussian noise (AWGN)** channel takes an input $X$, adds independent Gaussian noise $Z \sim \mathcal{N}(0, N)$, and delivers

    $$Y = X + Z.$$

    The transmitter is power-limited: the average transmit energy obeys $\mathbb{E}[X^2] \le P$. The capacity is the maximum mutual information over all input distributions satisfying that constraint:

    $$C = \max_{f_X:\ \mathbb{E}[X^2]\le P} I(X; Y).$$

    **Deriving it.** Mutual information for continuous variables mirrors the discrete case:

    $$I(X; Y) = h(Y) - h(Y \mid X) = h(Y) - h(Z),$$

    where the second step uses $h(Y\mid X) = h(X + Z \mid X) = h(Z)$ — once $X$ is known, all that is left in $Y$ is the noise. Now $h(Z) = \tfrac12\log_2(2\pi e N)$ is fixed. To maximize $I$ we must maximize $h(Y)$. The received signal $Y$ has variance $\mathbb{E}[X^2] + N \le P + N$, and by the theorem in Section 2, the most entropy a variable of that variance can have is achieved when $Y$ is Gaussian — which happens when $X$ itself is Gaussian. Then $h(Y) = \tfrac12\log_2(2\pi e (P+N))$, and

    $$C = \tfrac12\log_2\!\big(2\pi e(P+N)\big) - \tfrac12\log_2\!\big(2\pi e N\big) = \boxed{\;\tfrac12\log_2\!\Big(1 + \tfrac{P}{N}\Big)\;}$$

    bits **per channel use**. The ratio $\mathrm{SNR} = P/N$ is the **signal-to-noise ratio**. This is the cleanest formula in information theory: capacity grows only *logarithmically* with power, so doubling SNR adds a fixed half-bit's worth at high SNR — you cannot buy your way past noise cheaply.

    **A worked number.** At $\mathrm{SNR} = 7$ (about $8.5$ dB): $C = \tfrac12\log_2(8) = \tfrac12\cdot 3 = 1.5$ bits per use. At $\mathrm{SNR} = 1$ (signal equals noise, $0$ dB): $C = \tfrac12\log_2 2 = 0.5$ bits per use.

    > [Cover & Thomas Ch 9.1](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) is the canonical derivation; [MacKay Ch 11](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) ties it to real modems and the Gaussian channel intuition.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def awgn_capacity_per_use(snr):
            return 0.5 * np.log2(1.0 + snr)

        print("=== AWGN capacity  C = 1/2 log2(1 + SNR)  [bits per channel use] ===")
        print(f"{'SNR (linear)':>14} {'SNR (dB)':>10} {'C (bits/use)':>14}")
        for _snr in [0.0, 0.1, 0.5, 1.0, 3.0, 7.0, 15.0, 100.0, 1000.0]:
            _snr_db = 10 * np.log10(_snr) if _snr > 0 else float("-inf")
            print(f"{_snr:>14.2f} {_snr_db:>10.2f} {awgn_capacity_per_use(_snr):>14.4f}")

        print("\nCheck the worked numbers:")
        print(f"  SNR=1  ->  C = {awgn_capacity_per_use(1.0):.4f}  (expect 0.5)")
        print(f"  SNR=7  ->  C = {awgn_capacity_per_use(7.0):.4f}  (expect 1.5)")
        print("\nDiminishing returns: each doubling of SNR at high SNR adds only ~0.5 bit/use.")
        for _snr in [128.0, 256.0, 512.0, 1024.0]:
            print(f"  SNR={_snr:>7.0f} -> C = {awgn_capacity_per_use(_snr):.4f}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. Shannon–Hartley: Capacity in Bits per Second

    Capacity "per channel use" is clean but abstract. Engineers want **bits per second**. The bridge is the Nyquist sampling fact: a channel of bandwidth $W$ hertz supports $2W$ independent uses (samples) per second. Multiply capacity-per-use by $2W$ and express the SNR in terms of *spectral* quantities and you get the **Shannon–Hartley theorem**:

    $$C = W\,\log_2\!\Big(1 + \frac{P}{N_0 W}\Big) \quad\text{bits per second,}$$

    where $W$ is bandwidth (Hz), $P$ is signal power (watts), and $N_0$ is the noise power spectral density (watts/Hz), so total noise power in the band is $N = N_0 W$. This single equation governs every modem, Wi-Fi link, and cellular standard on Earth.

    **Two regimes worth knowing.**

    - **Bandwidth-limited** (high SNR): $C \approx W\log_2(\mathrm{SNR})$ — capacity scales *linearly* with bandwidth but only *logarithmically* with power. More spectrum is the cheap lever.
    - **Power-limited** (low SNR, $W \to \infty$): the capacity does **not** go to infinity. Using $\log_2(1+x)\approx x/\ln 2$ for small $x$,

      $$C_\infty = \lim_{W\to\infty} C = \frac{P}{N_0}\,\log_2 e = \frac{P}{N_0 \ln 2}.$$

      This is the deep-space / spread-spectrum regime: you have all the bandwidth you want but almost no power, and the best you can ever do is set by $P/N_0$ alone. It is also where the famous minimum energy-per-bit, $E_b/N_0 = \ln 2 \approx -1.59$ dB, comes from.

    Drag the slider below to set SNR (in dB) and watch the capacity ride up the $\tfrac12\log_2(1+\mathrm{SNR})$ curve. This is your first required widget.

    > [Stone Ch 7](file:///C:/Users/landa/info-theory-course/textbooks/Stone.pdf) develops Shannon–Hartley and the bandwidth/power tradeoff intuitively; [Cover & Thomas Ch 9.3](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) covers the band-limited channel.
    """)
    return


@app.cell
def _(mo):
    snr_db = mo.ui.slider(start=-10.0, stop=40.0, step=0.5, value=10.0, label="SNR (dB)")
    snr_db
    return (snr_db,)


@app.cell
def _(snr_db):
    def _run():
        import numpy as np
        import matplotlib.pyplot as plt

        _snr_db = snr_db.value
        _snr_lin = 10 ** (_snr_db / 10.0)
        _C = 0.5 * np.log2(1.0 + _snr_lin)

        _db_axis = np.linspace(-10, 40, 600)
        _lin_axis = 10 ** (_db_axis / 10.0)
        _C_axis = 0.5 * np.log2(1.0 + _lin_axis)

        _fig, _ax = plt.subplots(figsize=(7.5, 4.2))
        _ax.plot(_db_axis, _C_axis, lw=2, color="steelblue", label=r"$C=\frac{1}{2}\log_2(1+\mathrm{SNR})$")
        _ax.scatter([_snr_db], [_C], color="red", zorder=5, s=70)
        _ax.axvline(_snr_db, color="red", ls="--", alpha=0.4)
        _ax.annotate(
            f"SNR = {_snr_db:.1f} dB ({_snr_lin:.2f}x)\nC = {_C:.3f} bits/use",
            xy=(_snr_db, _C),
            xytext=(0.05, 0.75),
            textcoords="axes fraction",
            arrowprops=dict(arrowstyle="->", color="red", alpha=0.6),
        )
        _ax.set_xlabel("SNR (dB)")
        _ax.set_ylabel("capacity (bits per channel use)")
        _ax.set_title("AWGN capacity vs SNR  (Shannon-Hartley, per use)")
        _ax.grid(True, alpha=0.3)
        _ax.legend(loc="lower right")
        plt.tight_layout()
        _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Parallel Gaussian Channels & Water-Filling

    Real wideband systems are not one channel — they are *many* parallel ones. Split the spectrum into $k$ narrow sub-bands; each behaves like an independent AWGN channel with its own noise level $N_i$. You have a **total power budget** $P$ to divide among them: choose powers $P_1, \dots, P_k$ with $\sum_i P_i = P$. Each sub-channel then contributes $\tfrac12\log_2(1 + P_i/N_i)$, so the total capacity is

    $$C = \max_{\sum_i P_i = P}\ \sum_{i=1}^{k} \tfrac12\log_2\!\Big(1 + \frac{P_i}{N_i}\Big).$$

    This is a concave maximization under a linear constraint — a textbook Lagrangian. Form $\mathcal{L} = \sum_i \tfrac12\log_2(1+P_i/N_i) - \lambda\big(\sum_i P_i - P\big)$, set $\partial\mathcal{L}/\partial P_i = 0$, and the **Karush–Kuhn–Tucker** conditions give the optimal allocation:

    $$\boxed{\;P_i = \big(\mu - N_i\big)^{+}\;}\qquad\text{where }(t)^+ = \max(t, 0),$$

    and the constant $\mu$ (the "water level") is chosen so that $\sum_i (\mu - N_i)^+ = P$.

    **The picture that names the result.** Imagine the noise levels $N_i$ as the floor of a vessel — a row of bins of differing heights. You pour a volume $P$ of water in; it settles to a flat surface at height $\mu$. The water depth above bin $i$ is exactly the power $P_i$ you allocate there. Quiet channels (low $N_i$) sit deep below the surface and get lots of power; noisy channels (high $N_i$) poke above the water and get **none at all**. You invest your power where it pays off — pour into the calm channels, abandon the loud ones. That is **water-filling**.

    **A worked example.** Two channels, $N = (1, 3)$, budget $P = 4$. If both are active, the water level satisfies $(\mu-1) + (\mu-3) = 4 \Rightarrow \mu = 4$. Both stay non-negative, so $P_1 = 3$, $P_2 = 1$ — the quieter channel gets three times the power, and capacity is $\tfrac12\log_2(1+3/1) + \tfrac12\log_2(1+1/3) = 1.0 + 0.2075 = 1.2075$ bits/use.

    > [Cover & Thomas Ch 9.4](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) derives water-filling via the KKT conditions; [MacKay Ch 11](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) and [Stone Ch 7](file:///C:/Users/landa/info-theory-course/textbooks/Stone.pdf) give the parallel-channel picture.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def water_fill(noise, power):
            _noise = np.asarray(noise, dtype=float)
            _order = np.argsort(_noise)
            _sorted = _noise[_order]
            _k = len(_sorted)
            _level = None
            for _m in range(_k, 0, -1):
                _active = _sorted[:_m]
                _cand = (power + _active.sum()) / _m
                if _cand > _active[-1] or _m == 1:
                    _level = _cand
                    break
            _alloc_sorted = np.maximum(_level - _sorted, 0.0)
            _alloc = np.empty(_k)
            _alloc[_order] = _alloc_sorted
            return _alloc, _level

        def capacity(noise, alloc):
            _noise = np.asarray(noise, dtype=float)
            return float(np.sum(0.5 * np.log2(1.0 + alloc / _noise)))

        print("=== Water-filling over parallel Gaussian channels ===\n")

        _noise = np.array([1.0, 3.0])
        _P = 4.0
        _alloc, _mu = water_fill(_noise, _P)
        print(f"Two channels  N = {_noise.tolist()},  budget P = {_P}")
        print(f"  water level mu = {_mu:.4f}")
        print(f"  allocation P_i = {np.round(_alloc, 4).tolist()}  (sum = {_alloc.sum():.4f})")
        print(f"  capacity       = {capacity(_noise, _alloc):.4f} bits/use   (expect 1.2075)\n")

        _noise = np.array([0.1, 0.3, 0.8, 1.5, 4.0])
        _P = 2.0
        _alloc, _mu = water_fill(_noise, _P)
        print(f"Five channels  N = {_noise.tolist()},  budget P = {_P}")
        print(f"  water level mu = {_mu:.4f}")
        print(f"  allocation P_i = {np.round(_alloc, 4).tolist()}  (sum = {_alloc.sum():.4f})")
        _off = np.where(_alloc <= 1e-12)[0]
        print(f"  channels left dry (too noisy): indices {_off.tolist()}")
        print(f"  capacity       = {capacity(_noise, _alloc):.4f} bits/use")

        print("\nSanity: uniform (equal) power is suboptimal --")
        _uniform = np.full_like(_noise, _P / len(_noise))
        print(f"  equal-power capacity = {capacity(_noise, _uniform):.4f} bits/use  <=  water-fill above")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ### The water-filling allocator

    Set a total power budget and the noise level of each of five parallel sub-channels. The bars show each channel's noise floor (gray) with the allocated power (blue) stacked on top; the dashed line is the water level $\mu$. Watch noisy channels go dry when the budget is tight, and watch the surface rise to flood them in as you add power. This is your second required widget.
    """)
    return


@app.cell
def _(mo):
    wf_power = mo.ui.slider(start=0.5, stop=12.0, step=0.5, value=4.0, label="total power budget P")
    wf_n0 = mo.ui.slider(start=0.1, stop=5.0, step=0.1, value=0.4, label="noise N1")
    wf_n1 = mo.ui.slider(start=0.1, stop=5.0, step=0.1, value=0.9, label="noise N2")
    wf_n2 = mo.ui.slider(start=0.1, stop=5.0, step=0.1, value=1.6, label="noise N3")
    wf_n3 = mo.ui.slider(start=0.1, stop=5.0, step=0.1, value=2.6, label="noise N4")
    wf_n4 = mo.ui.slider(start=0.1, stop=5.0, step=0.1, value=4.2, label="noise N5")
    mo.vstack([wf_power, wf_n0, wf_n1, wf_n2, wf_n3, wf_n4])
    return wf_n0, wf_n1, wf_n2, wf_n3, wf_n4, wf_power


@app.cell
def _(wf_n0, wf_n1, wf_n2, wf_n3, wf_n4, wf_power):
    def _run():
        import numpy as np
        import matplotlib.pyplot as plt

        _noise = np.array([wf_n0.value, wf_n1.value, wf_n2.value, wf_n3.value, wf_n4.value])
        _P = wf_power.value

        def _water_fill(noise, power):
            _order = np.argsort(noise)
            _sorted = noise[_order]
            _k = len(_sorted)
            _level = None
            for _m in range(_k, 0, -1):
                _active = _sorted[:_m]
                _cand = (power + _active.sum()) / _m
                if _cand > _active[-1] or _m == 1:
                    _level = _cand
                    break
            _a_sorted = np.maximum(_level - _sorted, 0.0)
            _a = np.empty(_k)
            _a[_order] = _a_sorted
            return _a, _level

        _alloc, _mu = _water_fill(_noise, _P)
        _cap_each = 0.5 * np.log2(1.0 + _alloc / _noise)
        _C = float(_cap_each.sum())

        _idx = np.arange(len(_noise))
        _fig, _ax = plt.subplots(figsize=(8, 4.6))
        _ax.bar(_idx, _noise, color="0.6", label="noise floor $N_i$", edgecolor="black", linewidth=0.6)
        _ax.bar(_idx, _alloc, bottom=_noise, color="steelblue", label="allocated power $P_i$",
                edgecolor="black", linewidth=0.6)
        _ax.axhline(_mu, color="red", ls="--", lw=1.6, label=f"water level $\\mu$ = {_mu:.2f}")

        for _i in _idx:
            if _alloc[_i] > 1e-9:
                _ax.text(_i, _noise[_i] + _alloc[_i] + 0.08, f"{_alloc[_i]:.2f}",
                         ha="center", va="bottom", fontsize=9, color="steelblue")
            else:
                _ax.text(_i, _noise[_i] + 0.08, "dry", ha="center", va="bottom",
                         fontsize=9, color="dimgray", style="italic")

        _ax.set_xticks(_idx)
        _ax.set_xticklabels([f"ch {i+1}" for i in _idx])
        _ax.set_ylabel("power / noise")
        _ax.set_title(f"Water-filling:  P = {_P:.1f},  total capacity C = {_C:.4f} bits/use")
        _ax.legend(loc="upper left", fontsize=9)
        _ax.grid(True, axis="y", alpha=0.3)
        plt.tight_layout()
        _fig

    _run()
    return


@app.cell
def _(mo):
    mo.image(src="../animations/rendered/WaterFilling.gif")
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Why This Matters for Machine Learning

    The continuous-channel machinery in this module is not just for radios — it is woven straight into modern probabilistic ML:

    - **The Gaussian as the maximum-entropy prior.** Section 2's theorem is *why* the Gaussian shows up everywhere: it is the least-committal (highest-entropy) distribution once you fix the variance. Gaussian priors, Gaussian initializations, and Gaussian latent spaces in VAEs are all "assume the least, subject to a variance budget" — pure maximum entropy (Module 6A).

    - **The reparameterization trick is a Gaussian channel.** A VAE encoder emits $X$ and adds noise $Z \sim \mathcal{N}(0, N)$ to form the latent $Y = X + Z$. That is *literally* the AWGN channel of Section 3, and the KL term in the ELBO is the rate $I(X; Y)$ you are paying to push information through it. We make this exact in Module 6E.

    - **The information bottleneck and water-filling.** When you compress a representation under a rate budget, allocating "bits" across latent dimensions of differing relevance is a water-filling problem in disguise — pour capacity into the informative directions, leave the noise directions dry (Module 6C, and reverse water-filling in rate-distortion, Module 5A).

    - **Differential entropy in density estimation.** Entropy and mutual-information *estimators* (MINE, InfoNCE in Module 6D) are estimating continuous $h$ and $I$ from samples — exactly the histogram-and-integrate quantities you computed in Sections 1–2.

    - **Diffusion models climb the same SNR curve.** A diffusion model adds Gaussian noise in steps, walking *down* an SNR schedule, then learns to walk back up. The amount of information recoverable at each step is governed by the very $\tfrac12\log_2(1+\mathrm{SNR})$ relationship from Section 3.

    With Part 3 complete you have the full channel picture — discrete (3A), the coding theorem (3B), and now the continuous Gaussian world (3C). Next, Part 4 turns "capacity exists" into machines that *achieve* it: the error-correcting codes — Hamming, Reed–Solomon, convolutional/Viterbi, and the modern LDPC and polar codes — that let real systems ride right up to the limits you just derived.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the continuous-entropy and channel-capacity machinery from this module.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Differential Entropy of a Gaussian

    Implement `gaussian_diff_entropy(sigma2)` returning the differential entropy $h = \tfrac12\log_2(2\pi e\,\sigma^2)$ in bits. Confirm that it is $0$ when $2\pi e\,\sigma^2 = 1$ (i.e. $\sigma^2 = 1/(2\pi e)$) and that it can be negative for smaller variances.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def gaussian_diff_entropy(sigma2):
            # TODO: return 1/2 * log2(2 * pi * e * sigma2)
            _result = ...
            return _result

        # print(gaussian_diff_entropy(1.0))              # expect ~2.047
        # print(gaussian_diff_entropy(1 / (2 * np.pi * np.e)))  # expect ~0.0
        # print(gaussian_diff_entropy(0.01))             # expect negative

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: AWGN Capacity and the dB Conversion

    Write `awgn_capacity(snr_db)` that takes the SNR in **decibels**, converts to a linear ratio ($\mathrm{SNR}_{\text{lin}} = 10^{\,\mathrm{dB}/10}$), and returns the capacity $\tfrac12\log_2(1+\mathrm{SNR}_{\text{lin}})$ in bits per use. Verify $0$ dB gives $0.5$ bits and about $8.45$ dB (SNR $=7$) gives $1.5$ bits.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def awgn_capacity(snr_db):
            # TODO: convert dB to linear, then return 1/2 log2(1 + snr_lin)
            _snr_lin = ...
            _C = ...
            return _C

        # print(awgn_capacity(0.0))    # expect 0.5
        # print(awgn_capacity(10 * np.log10(7)))  # expect 1.5

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Verify the Maximum-Entropy Property

    Sample from a non-Gaussian density (say a Laplace), rescale it to variance $1$, and estimate its differential entropy from a histogram. Confirm it falls *below* the Gaussian ceiling $\tfrac12\log_2(2\pi e)$ for variance $1$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(0)

        def hist_diff_entropy(samples, bins=400, base=2):
            # TODO: density histogram, bin width, then -sum p*log(p)*width over p>0
            _hist, _edges = np.histogram(samples, bins=bins, density=True)
            _w = ...
            _p = ...
            return ...

        ceiling = 0.5 * np.log2(2 * np.pi * np.e)  # variance-1 Gaussian ceiling

        # TODO: draw many Laplace samples, normalize to unit variance, estimate h
        x = ...
        h_laplace = ...

        # print(f"h(Laplace) = {h_laplace:.4f}  <  ceiling {ceiling:.4f}?")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Water-Filling Allocator

    Implement `water_fill(noise, power)` returning the optimal power allocation $P_i = (\mu - N_i)^+$ and the water level $\mu$. A robust approach: sort the noise, then for each candidate number of active channels $m$ compute $\mu = (P + \sum_{i<m} N_i)/m$ and accept the largest $m$ for which all active channels stay non-negative. Test it on $N=(1,3)$, $P=4$ (expect allocation $(3,1)$, $\mu=4$).
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def water_fill(noise, power):
            noise = np.asarray(noise, dtype=float)
            order = np.argsort(noise)
            s = noise[order]
            k = len(s)
            level = None
            for m in range(k, 0, -1):
                # TODO: candidate level using the m quietest channels
                cand = ...
                if cand > s[m - 1] or m == 1:
                    level = cand
                    break
            # TODO: allocation (level - noise)^+, un-sorted back to original order
            alloc = ...
            return alloc, level

        # alloc, mu = water_fill([1.0, 3.0], 4.0)
        # print(alloc, mu)     # expect [3., 1.] and 4.0

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Water-Filling Beats Equal Power

    Using your `water_fill` from Exercise 4, compare the total capacity $\sum_i \tfrac12\log_2(1+P_i/N_i)$ of the water-filling allocation against splitting the budget *equally* across channels. Confirm water-filling is at least as good (and strictly better when the noise levels differ). Use $N=(0.1, 0.3, 0.8, 1.5, 4.0)$ and $P=2$.

    When you are done, run this notebook from the command line with `marimo run` to interact with both widgets live.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def water_fill(noise, power):
            noise = np.asarray(noise, dtype=float)
            order = np.argsort(noise)
            s = noise[order]
            k = len(s)
            level = None
            for m in range(k, 0, -1):
                cand = (power + s[:m].sum()) / m
                if cand > s[m - 1] or m == 1:
                    level = cand
                    break
            a_sorted = np.maximum(level - s, 0.0)
            a = np.empty(k)
            a[order] = a_sorted
            return a, level

        def capacity(noise, alloc):
            noise = np.asarray(noise, dtype=float)
            # TODO: sum of 1/2 log2(1 + alloc/noise)
            return ...

        N = np.array([0.1, 0.3, 0.8, 1.5, 4.0])
        P = 2.0

        # TODO: water-filling allocation + its capacity
        wf_alloc = ...
        C_wf = ...

        # TODO: equal-power allocation + its capacity
        eq_alloc = ...
        C_eq = ...

        # print(f"water-fill C = {C_wf:.4f},  equal-power C = {C_eq:.4f},  wf >= eq? {C_wf >= C_eq}")

    _run()
    return


if __name__ == "__main__":
    app.run()
