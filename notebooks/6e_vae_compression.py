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
    # 6E: Rate-Distortion, VAEs & Neural Compression

    > *"The ELBO is a rate-distortion objective in disguise."*
    > — Alexander Alemi et al., *Fixing a Broken ELBO*

    You have arrived at the place where almost every thread of this course braids together. From Part 1 you carry entropy, KL divergence, and mutual information. From Module 5A you carry the rate-distortion function $R(D)$ — the exact price of "good enough." From Module 6C you carry the information bottleneck and the $\beta$-knob that trades compression against relevance. From 6D you carry variational bounds on mutual information. This module takes all of it and points it at one of the most-used objects in modern machine learning: the **variational autoencoder**, and its grown-up cousin, **learned neural compression**.

    Here is the punchline up front, because it is the whole module: the loss you minimize when you train a VAE — the negative **evidence lower bound** (ELBO) — is, term for term, a **rate-distortion objective**. The KL term *is* a rate, measured in bits (or nats); the reconstruction term *is* a distortion. Training a VAE is sliding along a rate-distortion curve, and the $\beta$ in $\beta$-VAE is exactly the knob that says *where* on that curve you want to sit. Once you see this, the famous pathologies — posterior collapse, blurry samples, "a broken ELBO" — stop being mysterious and become points on a curve you can read off.

    You already know rate-distortion theory and the ELBO will feel familiar from any ML course. So I will move fast through the setup and spend our time on the *information-theoretic* reading: the rate-distortion decomposition, the $\beta$ R-D plane, the bits-back argument that explains where the "extra" bits hide, and the transform-coding view of learned image compression. Every demo runs in pure numpy on a toy linear-Gaussian VAE we solve in closed form, so you can verify each claim by hand.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. The VAE in One Page (Just Enough)

    A **latent-variable model** says your data $x$ is generated in two steps: draw a hidden code $z$ from a prior $p(z)$ (we use the standard Gaussian $\mathcal{N}(0, I)$), then draw $x$ from a decoder $p_\theta(x \mid z)$. The marginal likelihood of a datapoint is

    $$p_\theta(x) = \int p_\theta(x \mid z)\, p(z)\, dz,$$

    which is intractable in general — you cannot integrate over all codes. The variational trick introduces an **encoder** $q_\phi(z \mid x)$ that *guesses* the code for a given $x$, and uses it to build a tractable lower bound on $\log p_\theta(x)$. That bound is the **ELBO**:

    $$\log p_\theta(x) \;\ge\; \underbrace{\mathbb{E}_{q_\phi(z\mid x)}\big[\log p_\theta(x\mid z)\big]}_{\text{reconstruction}} \;-\; \underbrace{D_{\mathrm{KL}}\!\big(q_\phi(z\mid x)\,\|\,p(z)\big)}_{\text{regularizer}} \;=\; \mathcal{L}(x).$$

    Training maximizes $\mathcal{L}$ (equivalently minimizes $-\mathcal{L}$) over encoder parameters $\phi$ and decoder parameters $\theta$. The gap between $\log p_\theta(x)$ and the ELBO is exactly $D_{\mathrm{KL}}(q_\phi(z\mid x)\,\|\,p_\theta(z\mid x))$ — how far the encoder's guess is from the true posterior. Tighten the encoder and the bound tightens.

    The two terms already *look* like a trade-off, and that is not an accident. The first term wants $z$ to remember enough about $x$ to reconstruct it. The second term wants $z$ to forget $x$ and look like the prior. Remember-versus-forget is compression. The next sections make that exact.

    > [MacKay Ch 33](https://www.inference.org.uk/itprnn/book.pdf) develops variational free energy — the ELBO is its negative.
    > [Alemi et al., *Fixing a Broken ELBO*](https://arxiv.org/abs/1711.00464) is the rate-distortion reading we build on here.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The ELBO *Is* Rate + Distortion

    Flip the signs so we are minimizing, and rename the two pieces. The per-datapoint VAE loss is

    $$-\mathcal{L}(x) \;=\; \underbrace{D_{\mathrm{KL}}\!\big(q_\phi(z\mid x)\,\|\,p(z)\big)}_{\textbf{Rate } R(x)} \;+\; \underbrace{\mathbb{E}_{q_\phi(z\mid x)}\big[-\log p_\theta(x\mid z)\big]}_{\textbf{Distortion } D(x)}.$$

    Read both terms as a coding scheme.

    - **Rate $R$** is the KL from the encoder's posterior to the prior. In a *bits-back* code (Section 5) this is *exactly* the number of bits, beyond the prior, needed to transmit the latent $z$ for this datapoint. A confident, peaked $q_\phi(z\mid x)$ that pins $z$ far from the prior costs many bits; a posterior equal to the prior costs zero. Rate is "how much the code says about $x$."
    - **Distortion $D$** is the expected negative log-likelihood of $x$ under the decoder given that code. For a Gaussian decoder with fixed variance, $-\log p_\theta(x\mid z) = \frac{1}{2\sigma^2}\|x - \hat{x}(z)\|^2 + \text{const}$ — it is **mean squared reconstruction error** up to scale. Distortion is "how badly the code reconstructs $x$."

    So $-\mathcal{L} = R + D$. Minimizing the VAE loss minimizes rate-plus-distortion at a fixed exchange rate of one nat of rate per one nat of distortion. That single, hard-wired exchange rate is the problem the next section fixes.

    There is also an *aggregate* picture across the whole dataset. Averaging over data, the average rate $\mathbb{E}_x[R(x)]$ upper-bounds the mutual information $I(x; z)$ between data and code under the encoder — this is the same variational MI bound you met in 6D. So the VAE rate is, on average, *information the latent carries about the data*. Compression in the literal coding sense and compression in the information-theoretic sense are the same number here.

    > [Alemi et al., *Fixing a Broken ELBO*](https://arxiv.org/abs/1711.00464) §2 derives this $R + D$ split and the $R \ge I(x;z) \ge \dots$ sandwich.
    > [Cover & Thomas Ch 10](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) for the $R(D)$ object this mirrors.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. A Toy We Can Solve by Hand: the Linear-Gaussian VAE

    To make every number checkable we use a one-dimensional **linear-Gaussian VAE**, which has a fully closed-form solution — no gradient descent, no torch.

    **Generative model.** Latent $z \sim \mathcal{N}(0, 1)$; data $x = g\, z + \varepsilon$ with decoder noise $\varepsilon \sim \mathcal{N}(0, \sigma^2)$. So the data is itself Gaussian, $x \sim \mathcal{N}(0,\, g^2 + \sigma^2)$.

    **Encoder.** A Gaussian posterior $q_\phi(z\mid x) = \mathcal{N}(m\, x,\; s^2)$ with a per-datapoint mean that is linear in $x$ (mean slope $m$) and a shared posterior variance $s^2$.

    For this family every term is elementary. The **rate** for a datapoint $x$ is the KL between two 1-D Gaussians, $q = \mathcal{N}(\mu, s^2)$ and the prior $\mathcal{N}(0,1)$:

    $$R(x) = D_{\mathrm{KL}}\big(\mathcal{N}(\mu, s^2)\,\|\,\mathcal{N}(0,1)\big) = \tfrac{1}{2}\big(s^2 + \mu^2 - 1 - \log s^2\big), \qquad \mu = m\,x,$$

    measured in **nats** (divide by $\ln 2$ for bits). Averaging over the data, $\mu = m x$ has variance $m^2 \mathrm{Var}(x) = m^2(g^2+\sigma^2)$, so the **average rate** is

    $$\bar{R} = \tfrac{1}{2}\big(s^2 + m^2(g^2+\sigma^2) - 1 - \log s^2\big).$$

    The **distortion** is the expected squared error of the Gaussian decoder. Reconstructing with $\hat{x} = g\,z$ for $z \sim q$, the expected per-datapoint squared error decomposes into a bias term and the posterior-variance term, giving an **average distortion**

    $$\bar{D} = \mathbb{E}\big[(x - g\,\mathbb{E}_q[z])^2\big] + g^2 s^2 = (g^2+\sigma^2)(1 - g m)^2 + g^2 s^2,$$

    in squared-error units. Two knobs $(m, s)$, two closed-form curves. That is the whole laboratory. The code cell below implements these formulas and sanity-checks the limiting cases.

    > [Higgins et al., $\beta$-VAE](https://openreview.net/forum?id=Sy2fzU9gl) introduced the $\beta$ knob we sweep next; the linear-Gaussian VAE is the standard pencil-and-paper testbed.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def rate_nats(m, s, g, sigma):
            var_x = g**2 + sigma**2
            mu_var = (m**2) * var_x
            return 0.5 * (s**2 + mu_var - 1.0 - np.log(s**2))

        def distortion(m, s, g, sigma):
            var_x = g**2 + sigma**2
            bias = var_x * (1.0 - g * m) ** 2
            return bias + (g**2) * (s**2)

        _g, _sigma = 1.0, 0.5

        print("=== Linear-Gaussian VAE: closed-form rate & distortion ===")
        print(f"  decoder gain g = {_g},  decoder noise sigma = {_sigma}")
        print(f"  data variance Var(x) = g^2+sigma^2 = {_g**2 + _sigma**2:.4f}\n")

        print("Limit 1: posterior = prior (m=0, s=1)  -> rate should be 0")
        _R = rate_nats(0.0, 1.0, _g, _sigma)
        _D = distortion(0.0, 1.0, _g, _sigma)
        print(f"  R = {_R:.4f} nats,  D = {_D:.4f}   (D = Var(x)+g^2 = best blind guess)\n")

        print("Limit 2: confident encoder (s small, m tuned)  -> low distortion, high rate")
        _m_opt = _g / (_g**2 + _sigma**2)
        _R2 = rate_nats(_m_opt, 0.05, _g, _sigma)
        _D2 = distortion(_m_opt, 0.05, _g, _sigma)
        print(f"  m* = g/Var(x) = {_m_opt:.4f},  s = 0.05")
        print(f"  R = {_R2:.4f} nats = {_R2/np.log(2):.4f} bits,  D = {_D2:.4f}")
        print(f"  -> spending bits buys a smaller reconstruction error, as the trade-off promises.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. $\beta$-VAE and the Rate-Distortion Plane

    The plain ELBO fixes the rate/distortion exchange rate at exactly 1. **$\beta$-VAE** unfreezes it with a single multiplier on the rate term:

    $$\mathcal{L}_\beta(x) \;=\; \underbrace{\mathbb{E}_{q}[-\log p_\theta(x\mid z)]}_{\text{distortion } D} \;+\; \beta\, \underbrace{D_{\mathrm{KL}}(q_\phi(z\mid x)\,\|\,p(z))}_{\text{rate } R}.$$

    This is *literally* the Lagrangian for the constrained problem "minimize distortion subject to a rate budget," and $\beta$ is the Lagrange multiplier — the same role $\beta$ plays in the information bottleneck of 6C and in classic rate-distortion optimization. Sweeping $\beta$ traces out the **rate-distortion frontier** of the model in the $(R, D)$ plane:

    - **Large $\beta$** (rate is expensive): the optimizer drives $R \to 0$. The posterior collapses to the prior, the latent stops carrying information, and reconstructions revert to the unconditional mean. This is **posterior collapse** — high distortion, near-zero rate, the *bottom-right* of the plane.
    - **Small $\beta$** (rate is cheap): the optimizer spends bits freely, $R$ grows and $D$ shrinks toward the decoder's intrinsic noise floor. The *top-left* of the plane.
    - **$\beta = 1$**: ordinary VAE — one specific point on that frontier, not a special one.

    The crucial insight from *Fixing a Broken ELBO*: **many different models achieve the same ELBO value** $-\mathcal{L} = R + D$ but live at wildly different points on the R-D plane. A model with $(R,D) = (0, 10)$ and one with $(R,D) = (10, 0)$ have the same ELBO of $10$, yet one ignores the data entirely and the other memorizes it. The ELBO *alone cannot tell them apart* — that is the "broken" part. You must report $R$ and $D$ separately, i.e. say *where on the curve you are*. The slider below lets you do exactly that for our toy: pick $\beta$, see the optimal $(m, s)$, and watch the point slide along the frontier.
    """)
    return


@app.cell
def _(mo):
    beta_slider = mo.ui.slider(
        start=-3.0, stop=4.0, step=0.1, value=0.0,
        label="log2(beta)  —  rate price (left = cheap bits, right = expensive bits)",
    )
    beta_slider
    return (beta_slider,)


@app.cell
def _(beta_slider):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _g, _sigma = 1.0, 0.5
        _var_x = _g**2 + _sigma**2

        def _rate(m, s):
            return 0.5 * (s**2 + (m**2) * _var_x - 1.0 - np.log(s**2))

        def _dist(m, s):
            return _var_x * (1.0 - _g * m) ** 2 + (_g**2) * (s**2)

        def _solve_beta(beta):
            _ms = np.linspace(-0.2, 1.6, 600)
            _ss = np.linspace(0.02, 1.5, 600)
            _best = None
            _best_obj = np.inf
            for _m in _ms:
                _r = _rate(_m, _ss)
                _d = _dist(_m, _ss)
                _obj = _d + beta * _r
                _j = int(np.argmin(_obj))
                if _obj[_j] < _best_obj:
                    _best_obj = _obj[_j]
                    _best = (_m, _ss[_j], _r[_j], _d[_j])
            return _best

        _ln2 = np.log(2)
        _betas = np.concatenate([np.linspace(0.02, 1, 40), np.linspace(1.05, 30, 80)])
        _Rs, _Ds = [], []
        for _b in _betas:
            _m, _s, _r, _d = _solve_beta(_b)
            _Rs.append(_r / _ln2)
            _Ds.append(_d)
        _Rs, _Ds = np.array(_Rs), np.array(_Ds)

        _beta_cur = 2.0 ** beta_slider.value
        _mc, _sc, _rc, _dc = _solve_beta(_beta_cur)
        _rc_bits = _rc / _ln2

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(11, 4.4))

        _ax1.plot(_Rs, _Ds, lw=2, color="steelblue", label="R-D frontier (sweep beta)")
        _ax1.scatter([_rc_bits], [_dc], color="red", zorder=5, s=70)
        _ax1.annotate(f"beta={_beta_cur:.2f}\nR={_rc_bits:.2f} bits\nD={_dc:.3f}",
                      xy=(_rc_bits, _dc), xytext=(0.45, 0.6),
                      textcoords="axes fraction",
                      arrowprops=dict(arrowstyle="->", color="red", alpha=0.6))
        _ax1.axhline(_sigma**2 * 0 + _g**2 * 0, color="none")
        _ax1.set_xlabel("Rate  R  (bits / datapoint)")
        _ax1.set_ylabel("Distortion  D  (MSE)")
        _ax1.set_title("VAE rate-distortion plane")
        _ax1.grid(True, alpha=0.3)
        _ax1.legend(loc="upper right", fontsize=8)

        _ax2.semilogx([_beta_cur], [_rc_bits], "o", color="red", ms=8)
        _bb = 2.0 ** np.linspace(-3, 4, 120)
        _rr = []
        for _b in _bb:
            _, _, _r, _ = _solve_beta(_b)
            _rr.append(_r / _ln2)
        _ax2.semilogx(_bb, _rr, lw=2, color="darkorange")
        _ax2.set_xlabel("beta  (log scale)")
        _ax2.set_ylabel("optimal rate R (bits)")
        _ax2.set_title("Rate vs beta:  big beta -> posterior collapse (R->0)")
        _ax2.grid(True, alpha=0.3, which="both")

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.image(src="../animations/rendered/BetaVAEPlane.gif")
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _g, _sigma = 1.0, 0.5
        _var_x = _g**2 + _sigma**2
        _ln2 = np.log(2)

        def _rate(m, s):
            return 0.5 * (s**2 + (m**2) * _var_x - 1.0 - np.log(s**2))

        def _dist(m, s):
            return _var_x * (1.0 - _g * m) ** 2 + (_g**2) * (s**2)

        def _solve_beta(beta):
            _ms = np.linspace(-0.2, 1.6, 800)
            _ss = np.linspace(0.02, 1.5, 800)
            _best, _bobj = None, np.inf
            for _m in _ms:
                _obj = _dist(_m, _ss) + beta * _rate(_m, _ss)
                _j = int(np.argmin(_obj))
                if _obj[_j] < _bobj:
                    _bobj = _obj[_j]
                    _best = (_m, _ss[_j], _rate(_m, _ss[_j]), _dist(_m, _ss[_j]))
            return _best

        print("=== Sweeping beta along the VAE rate-distortion frontier ===")
        print(f"{'beta':>7} | {'m*':>7} | {'s*':>6} | {'R(bits)':>8} | {'D(MSE)':>8} | {'ELBO=-R-D':>10}")
        print("-" * 62)
        for _b in [0.05, 0.2, 0.5, 1.0, 2.0, 5.0, 20.0]:
            _m, _s, _r, _d = _solve_beta(_b)
            _Rb = _r / _ln2
            _elbo = -(_r + _d)
            print(f"{_b:7.2f} | {_m:7.3f} | {_s:6.3f} | {_Rb:8.3f} | {_d:8.4f} | {_elbo:10.4f}")

        print("\nObservations:")
        print("  - As beta grows, rate R -> 0 (posterior collapse) and distortion D rises.")
        print("  - As beta shrinks, rate grows and distortion falls toward the decoder noise floor.")
        print(f"  - Decoder-limited distortion floor ~ g^2*s^2 with tiny s -> approaches 0 here,")
        print(f"    while irreducible data noise shows up as the bias term vanishing at m*=g/Var(x).")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Bits-Back Coding: Where the Rate Actually Lives

    The rate term claims that $R(x) = D_{\mathrm{KL}}(q_\phi(z\mid x)\,\|\,p(z))$ bits are "spent" on the latent. But that should bother you. To transmit $x$ via the latent code you would naively send $z$, which costs $-\log p(z)$ bits under the prior, *plus* $x$ given $z$, costing $-\log p_\theta(x\mid z)$ bits. That total is more than the KL rate. Where did the savings go?

    The answer is one of the prettiest ideas in coding theory: **bits back**. Suppose you have other data queued up — a stream of messages you also want to send. To encode $x$:

    1. **Decode** a latent $z$ from the next bits of your message stream *using $q_\phi(z\mid x)$ as the code*. This step does not cost bits — it *consumes* $\sim H(q_\phi)$ bits of your backlog and hands them back to you as the sampled $z$. Those are the "bits back."
    2. **Encode** $x$ with the decoder code $p_\theta(x\mid z)$: costs $-\log p_\theta(x\mid z)$ bits.
    3. **Encode** $z$ with the prior code $p(z)$: costs $-\log p(z)$ bits.

    The receiver runs it in reverse: decode $z$ with the prior, decode $x$ with the decoder, then *re-encode* $z$ with $q_\phi(z\mid x)$ to recover the bits you borrowed in step 1. The **net** cost of $x$ is

    $$\underbrace{-\log p_\theta(x\mid z)}_{\text{step 2}} \;+\; \underbrace{-\log p(z)}_{\text{step 3}} \;-\; \underbrace{(-\log q_\phi(z\mid x))}_{\text{bits back, step 1}} \;=\; -\log p_\theta(x\mid z) + \log\frac{q_\phi(z\mid x)}{p(z)},$$

    and taking the expectation over $z \sim q_\phi$ gives exactly $D + R = -\mathcal{L}(x)$, the negative ELBO. **The ELBO is the true net codelength of a bits-back code.** The KL really is a rate, in honest bits, *provided you have a backlog of other data to lend the entropy of $z$*. This is what makes the ELBO not just a bound but a *codelength*, and it is the foundation of practical neural lossless compressors.

    **BB-ANS** (bits-back with asymmetric numeral systems) is Townsend et al.'s clean realization of this: ANS is a stack-like entropy coder whose "decode-to-sample / encode-to-push" structure makes the bits-back borrow-and-return *automatic*. It turns any trained VAE into a near-ELBO-rate lossless codec. The demo below numerically verifies the bits-back accounting on our toy: the messy three-term ledger collapses to the ELBO.

    > [Townsend et al., *Practical Lossless Compression with Bits-Back Coding (BB-ANS)*](https://arxiv.org/abs/1901.04866) is the modern construction.
    > [MacKay Ch 6](https://www.inference.org.uk/itprnn/book.pdf) explains arithmetic/stream coding and the bits-back idea.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def _log_gauss(x, mu, var):
            return -0.5 * (np.log(2 * np.pi * var) + (x - mu) ** 2 / var)

        _g, _sigma = 1.0, 0.5
        _m, _s = _g / (_g**2 + _sigma**2), 0.4

        _rng = np.random.default_rng(0)
        _xs = _rng.normal(0.0, np.sqrt(_g**2 + _sigma**2), size=200_000)

        _mu_q = _m * _xs
        _z = _rng.normal(_mu_q, _s)

        _logq = _log_gauss(_z, _mu_q, _s**2)
        _logp_z = _log_gauss(_z, 0.0, 1.0)
        _logp_x_given_z = _log_gauss(_xs, _g * _z, _sigma**2)

        _net_nats = (-_logp_x_given_z) + (-_logp_z) - (-_logq)
        _net_bits = _net_nats / np.log(2)

        _rate_nats = _logq - _logp_z
        _dist_nats = -_logp_x_given_z
        _neg_elbo = _rate_nats + _dist_nats

        print("=== Bits-back accounting (Monte Carlo, 200k samples) ===")
        print(f"  encoder: m={_m:.3f}, s={_s:.3f};  decoder: g={_g}, sigma={_sigma}\n")
        print(f"  mean step-2  (-log p(x|z))     = {np.mean(-_logp_x_given_z):.4f} nats")
        print(f"  mean step-3  (-log p(z))       = {np.mean(-_logp_z):.4f} nats")
        print(f"  mean bits-back (-(-log q))     = {np.mean(_logq):.4f} nats  (returned to you)")
        print(f"  --------------------------------------------------")
        print(f"  mean NET codelength            = {np.mean(_net_nats):.4f} nats = {np.mean(_net_bits):.4f} bits")
        print(f"  mean negative ELBO (R + D)     = {np.mean(_neg_elbo):.4f} nats")
        print(f"  match? {np.isclose(np.mean(_net_nats), np.mean(_neg_elbo), atol=1e-3)}")
        print(f"\n  decomposed:  R = {np.mean(_rate_nats):.4f} nats,  D = {np.mean(_dist_nats):.4f} nats")
        print("  The three-term ledger collapses to R+D: the ELBO is the bits-back codelength.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Learned Image Compression as Nonlinear Transform Coding

    Lossy neural compressors (the ones now beating JPEG and even HEVC on rate-distortion) are VAEs wearing a codec's clothes. The framing is **nonlinear transform coding**, the deep-learning generalization of the transform coding (DCT + quantize + entropy-code) that powers JPEG:

    1. **Analysis transform** $y = g_a(x)$ — a neural encoder maps the image to a latent $y$ (the nonlinear analogue of JPEG's DCT).
    2. **Quantize** $\hat{y} = \lfloor y \rceil$ — round the latent to integers so it can be entropy-coded. At training time, rounding is replaced by adding uniform noise $\hat{y} = y + u$, $u \sim \mathcal{U}(-\tfrac12, \tfrac12)$, which is differentiable and is *exactly* a uniform-posterior VAE.
    3. **Entropy-code** $\hat{y}$ under a learned **prior / entropy model** $p(\hat{y})$. The codelength is $-\log_2 p(\hat{y})$ bits — *this is the rate*, and it is again a KL-like cross-entropy term.
    4. **Synthesis transform** $\hat{x} = g_s(\hat{y})$ — a neural decoder reconstructs the image; its error $\|x-\hat{x}\|^2$ is *the distortion*.

    The training loss is, once more, $\textbf{rate} + \lambda \cdot \textbf{distortion}$:

    $$\mathcal{L} = \underbrace{\mathbb{E}\big[-\log_2 p(\hat{y})\big]}_{\text{rate (bits)}} \;+\; \lambda\, \underbrace{\mathbb{E}\big[\,\|x - g_s(\hat{y})\|^2\,\big]}_{\text{distortion}}.$$

    The Lagrange multiplier $\lambda$ here plays the role of $1/\beta$: each trained $\lambda$ gives one point on the codec's R-D curve, and you train a family of models to cover a range of bitrates. The headline architectural advance — **hyperpriors** (Ballé et al.) — makes the entropy model $p(\hat{y})$ itself conditional on side information, which is precisely a *second* latent layer: a hierarchical VAE. Everything you learned about $\beta$, rate, and distortion transfers directly.

    The demo builds a tiny but faithful transform coder: a learned-ish linear transform on toy 1-D "image patches," uniform-noise quantization, a Gaussian entropy model giving an honest bit count, and a $\lambda$-sweep that draws the codec's operational rate-distortion curve.

    > [Higgins et al., $\beta$-VAE](https://openreview.net/forum?id=Sy2fzU9gl) for the $\beta \leftrightarrow \lambda$ knob; the transform-coding view is the Ballé/Theis line of work.
    > [Cover & Thomas Ch 10](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) for the underlying $R(D)$ these codecs chase.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(1)

        _C = np.array([[1.0, 0.8], [0.8, 1.0]])
        _L = np.linalg.cholesky(_C)
        _N = 100_000
        _x = _rng.standard_normal((_N, 2)) @ _L.T

        _evals, _evecs = np.linalg.eigh(_C)
        _W = _evecs.T

        def _rate_distortion(lam):
            _scale = np.sqrt(lam)
            _y = (_x @ _W.T) * _scale
            _yhat = _y + _rng.uniform(-0.5, 0.5, size=_y.shape)
            _var = _yhat.var(axis=0, keepdims=True)
            _bits = 0.5 * np.log2(2 * np.pi * np.e * (_var + 1e-9))
            _rate = float(np.mean(np.sum(_bits, axis=1)))
            _xrec = (_yhat / _scale) @ _W
            _dist = float(np.mean(np.sum((_x - _xrec) ** 2, axis=1)))
            return _rate, _dist

        print("=== Toy nonlinear-transform coder: learned R-D curve ===")
        print(f"  source: correlated 2-D Gaussian patches, Cov =\n   {_C.tolist()}")
        print(f"  transform = PCA rotation (the linear-Gaussian optimum)\n")
        print(f"{'lambda':>8} | {'Rate (bits/patch)':>18} | {'Distortion (MSE)':>17}")
        print("-" * 52)
        for _lam in [0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0]:
            _r, _d = _rate_distortion(_lam)
            print(f"{_lam:8.2f} | {_r:18.3f} | {_d:17.4f}")

        print("\n  Bigger lambda -> finer quantization -> more bits, less error.")
        print("  Each lambda is ONE point on the codec's operational R-D curve,")
        print("  exactly mirroring the beta-sweep of the VAE in Section 4.")

    _run()
    return


@app.cell
def _(mo):
    quant_slider = mo.ui.slider(
        start=0.1, stop=12.0, step=0.1, value=2.0,
        label="lambda  (quantization fineness / rate budget)",
    )
    quant_slider
    return (quant_slider,)


@app.cell
def _(quant_slider):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _rng = np.random.default_rng(1)
        _C = np.array([[1.0, 0.8], [0.8, 1.0]])
        _L = np.linalg.cholesky(_C)
        _N = 60_000
        _x = _rng.standard_normal((_N, 2)) @ _L.T
        _evals, _evecs = np.linalg.eigh(_C)
        _W = _evecs.T

        def _rd(lam):
            _scale = np.sqrt(lam)
            _y = (_x @ _W.T) * _scale
            _yhat = _y + _rng.uniform(-0.5, 0.5, size=_y.shape)
            _var = _yhat.var(axis=0, keepdims=True)
            _bits = 0.5 * np.log2(2 * np.pi * np.e * (_var + 1e-9))
            _rate = float(np.mean(np.sum(_bits, axis=1)))
            _xrec = (_yhat / _scale) @ _W
            _dist = float(np.mean(np.sum((_x - _xrec) ** 2, axis=1)))
            return _rate, _dist

        _lams = np.linspace(0.1, 16.0, 60)
        _Rs = np.array([_rd(_l)[0] for _l in _lams])
        _Ds = np.array([_rd(_l)[1] for _l in _lams])

        _rc, _dc = _rd(quant_slider.value)

        _fig, _ax = plt.subplots(figsize=(7.2, 4.3))
        _ax.plot(_Rs, _Ds, lw=2, color="seagreen", label="operational R-D curve")
        _ax.scatter([_rc], [_dc], color="red", zorder=5, s=70)
        _ax.annotate(f"lambda={quant_slider.value:.1f}\nR={_rc:.2f} bits\nD={_dc:.3f}",
                     xy=(_rc, _dc), xytext=(0.5, 0.55),
                     textcoords="axes fraction",
                     arrowprops=dict(arrowstyle="->", color="red", alpha=0.6))
        _ax.set_xlabel("Rate  R  (bits / patch)")
        _ax.set_ylabel("Distortion  D  (MSE)")
        _ax.set_title("Learned transform coder: rate-distortion trade-off")
        _ax.grid(True, alpha=0.3)
        _ax.legend(loc="upper right", fontsize=8)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    This module is the place rate-distortion theory stops being a result *about* communication and becomes a design principle *for* representation learning. The takeaways generalize far beyond VAEs:

    - **Every reconstruction-plus-regularizer objective is an R-D objective.** VAEs, $\beta$-VAEs, VQ-VAEs, neural codecs, the information bottleneck (6C), and even masked autoencoders all sit on this template: spend bits on a code (rate), pay for the error it leaves (distortion). When you see a KL-to-prior term, read "rate." When you see a reconstruction loss, read "distortion."
    - **Report $R$ and $D$, never just the ELBO.** *Fixing a Broken ELBO* is a methodological warning with teeth: two models with identical ELBO can be useless versus excellent. The same loss value hides opposite behaviors. Whenever you tune a generative model, plot its R-D point — that is the honest summary.
    - **$\beta$ is your representation dial.** Large $\beta$ buys *disentangled, compressed, abstract* codes at the cost of fidelity; small $\beta$ buys faithful reconstruction at the cost of structure. Picking $\beta$ is picking where on the curve your downstream task wants to live — exactly the bottleneck trade-off from 6C, now actionable.
    - **The ELBO is a real codelength.** Bits-back / BB-ANS turns the abstract bound into an operating lossless compressor whose rate *is* the negative ELBO. Information theory does not just describe these models; it gives them their unit of account.
    - **Neural compression is the engineering payoff.** Learned codecs are now competitive with or better than hand-designed standards, and they are R-D-optimized VAEs through and through. The theory you have built across this whole course is what lets you reason about why they work and where their limits are.

    That closes Part 6 and, with it, the information-theoretic spine of machine learning. You began the course measuring the surprise of a single coin flip; you end it reading the rate-distortion plane of a learned image compressor. It was the same idea the whole way down — *information is the resolution of uncertainty, measured in bits* — and now you can wield it on the systems you actually build.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise gives a spec and a skeleton — fill in the missing code. Together they rebuild the whole rate-distortion-VAE picture from scratch in pure numpy.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: KL Between Two Gaussians (the Rate Term)

    Implement the rate term: the KL divergence in **nats** from a diagonal Gaussian posterior $\mathcal{N}(\mu, s^2)$ to the standard normal prior $\mathcal{N}(0,1)$, using the closed form $\tfrac12(s^2 + \mu^2 - 1 - \log s^2)$. Verify that the posterior-equals-prior case ($\mu=0, s=1$) gives exactly $0$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def kl_to_prior(mu, s):
            # TODO: return 0.5*(s^2 + mu^2 - 1 - log s^2)
            _result = ...
            return _result

        # print(kl_to_prior(0.0, 1.0))   # expect 0.0
        # print(kl_to_prior(2.0, 1.0))   # expect 2.0
        # print(kl_to_prior(0.0, 0.5))   # expect ~0.5*(0.25 - 1 - log0.25) = ~0.318

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: The ELBO as Rate + Distortion

    For the linear-Gaussian VAE (latent $z\sim\mathcal N(0,1)$, decoder $x=gz+\varepsilon$, $\varepsilon\sim\mathcal N(0,\sigma^2)$, encoder $q=\mathcal N(mx, s^2)$), compute the **average rate** $\bar R = \tfrac12(s^2 + m^2(g^2+\sigma^2) - 1 - \log s^2)$ and **average distortion** $\bar D = (g^2+\sigma^2)(1-gm)^2 + g^2 s^2$. Return the negative ELBO $\bar R + \bar D$ (in nats).
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def neg_elbo(m, s, g, sigma):
            var_x = g**2 + sigma**2
            # TODO: average rate (nats)
            R = ...
            # TODO: average distortion (MSE)
            D = ...
            return R + D

        # print(neg_elbo(0.0, 1.0, 1.0, 0.5))   # collapse: R=0, D=Var(x)+g^2 = 2.25
        # print(neg_elbo(0.8, 0.4, 1.0, 0.5))   # some interior point, smaller D

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Sweep $\beta$ to Trace the R-D Frontier

    For a grid of encoder parameters $(m, s)$, minimize the $\beta$-VAE objective $D + \beta R$ for each $\beta$, and record the optimal $(R, D)$. Confirm that increasing $\beta$ drives the optimal rate toward $0$ (posterior collapse) and the distortion up.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        g, sigma = 1.0, 0.5
        var_x = g**2 + sigma**2

        def rate(m, s):
            return 0.5 * (s**2 + m**2 * var_x - 1.0 - np.log(s**2))

        def dist(m, s):
            return var_x * (1.0 - g * m) ** 2 + g**2 * s**2

        ms = np.linspace(-0.2, 1.6, 400)
        ss = np.linspace(0.02, 1.5, 400)

        def best_for_beta(beta):
            # TODO: over the (m, s) grid, find (m*, s*) minimizing dist + beta*rate
            # TODO: return the (rate, dist) at that optimum
            best_R = ...
            best_D = ...
            return best_R, best_D

        # for b in [0.1, 1.0, 10.0]:
        #     R, D = best_for_beta(b)
        #     print(f"beta={b:5.1f}  R={R/np.log(2):.3f} bits  D={D:.3f}")
        # expect: rate falls and distortion rises as beta grows

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Verify Bits-Back Numerically

    Sample data and latents from the toy model, then compute the three-term bits-back ledger per sample: step 2 $(-\log p(x\mid z))$ plus step 3 $(-\log p(z))$ minus the bits returned $(-\log q(z\mid x))$. Confirm its mean equals the negative ELBO $\bar R + \bar D$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def log_gauss(x, mu, var):
            return -0.5 * (np.log(2 * np.pi * var) + (x - mu) ** 2 / var)

        g, sigma, m, s = 1.0, 0.5, 0.7, 0.4
        rng = np.random.default_rng(0)
        x = rng.normal(0.0, np.sqrt(g**2 + sigma**2), size=100_000)
        z = rng.normal(m * x, s)

        # TODO: log q(z|x), log p(z), log p(x|z)
        logq = ...
        logp_z = ...
        logp_x_given_z = ...

        # TODO: net bits-back codelength (nats) = (-logp_x_given_z) + (-logp_z) - (-logq)
        net = ...

        # print("mean net codelength (nats):", np.mean(net))
        # rate = logq - logp_z ; dist = -logp_x_given_z ; should match mean(rate+dist)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: A Toy Transform Coder's R-D Curve

    Build a 1-knob transform coder: scale a Gaussian latent by $\sqrt{\lambda}$, add uniform quantization noise on $[-\tfrac12,\tfrac12]$, charge $\tfrac12\log_2(2\pi e\,\mathrm{Var})$ bits per coefficient as the rate, decode by rescaling, and measure MSE distortion. Sweep $\lambda$ and confirm rate rises while distortion falls.

    After your `return`, the file ends with the module-level run guard.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(2)
        x = rng.standard_normal(100_000)

        def code(lam):
            scale = np.sqrt(lam)
            # TODO: y = x*scale ; yhat = y + uniform(-0.5,0.5)
            y = ...
            yhat = ...
            # TODO: rate = 0.5*log2(2*pi*e*Var(yhat)) ; xrec = yhat/scale ; dist = mean((x-xrec)^2)
            rate = ...
            dist = ...
            return rate, dist

        # for lam in [0.5, 2.0, 8.0]:
        #     r, d = code(lam)
        #     print(f"lambda={lam:5.1f}  rate={r:.3f} bits  dist={d:.4f}")
        # expect: rate increases with lambda, distortion decreases

    _run()
    return


if __name__ == "__main__":
    app.run()
