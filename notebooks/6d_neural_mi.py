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
    # 6D: Neural Estimation of Mutual Information

    > *"You can't always get what you want — but a good lower bound, optimized hard enough, gets you close."*

    Mutual information $I(X;Y)$ is the quantity you keep reaching for in modern machine learning: it is the objective behind representation learning (InfoMax, CPC, SimCLR), the regularizer in the information bottleneck (6C), the diagnostic for disentanglement, and the thing you wish you could just *measure* between a layer's activations and the label. There is only one problem. In all of these settings you do not have the densities $p(x,y)$, $p(x)$, $p(y)$ — you have **samples**. And estimating mutual information from samples, especially in high dimensions, is genuinely, provably hard.

    This module is about the clever escape hatch that powered a wave of papers around 2018: turn the *estimation* problem into an *optimization* problem. We write $I(X;Y)$ as the supremum of a tractable objective over a class of functions, parameterize that function with a neural network, and let gradient ascent push the bound up toward the truth. That is **MINE** (Mutual Information Neural Estimation) and its cousins **NWJ** and **InfoNCE**.

    You already know KL divergence and mutual information cold from 1B, and you just saw MI used as an objective in the information bottleneck (6C). Here we confront the practical question those modules quietly assumed away: *how do you actually compute $I(X;Y)$ when all you have is a pile of paired samples?* We will derive three variational lower bounds, build a tiny MLP estimator in pure numpy, watch InfoNCE slam into its notorious $\log N$ ceiling, and then — crucially — read the fine print, because Tschannen et al. showed that these estimators often "work" for reasons that have nothing to do with estimating mutual information.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Why Mutual Information Is Hard to Estimate

    Recall the definition from 1B. Mutual information is the KL divergence between the joint and the product of marginals:

    $$I(X;Y) = D_{\mathrm{KL}}\!\big(p(x,y)\,\big\|\,p(x)\,p(y)\big) = \mathbb{E}_{p(x,y)}\!\left[\log \frac{p(x,y)}{p(x)\,p(y)}\right].$$

    If you knew the three densities this would be a one-line integral. You do not. You have $N$ paired samples $\{(x_i, y_i)\}$ drawn from the joint. So why not just estimate the densities and plug in?

    Because **density estimation in high dimensions is a curse**. A histogram with $b$ bins per dimension needs $b^d$ cells; for $d=20$ and $b=10$ that is $10^{20}$ cells and you have, what, a few thousand samples. The bins are almost all empty, the plug-in estimate is dominated by sampling noise, and the bias does not vanish at any rate you can afford. Kernel density estimation and $k$-nearest-neighbor estimators (KSG) do better in low dimensions but degrade sharply as $d$ grows.

    There is also a deeper, distribution-free obstruction. **McAllester & Stratos (2018)** proved that *any* high-confidence lower bound on mutual information that is a function of $N$ samples cannot certify a value much larger than $\log N$ — no matter how clever the estimator. Intuitively: to *confirm* that two variables share $k$ bits of information, you must observe events whose probabilities differ by a factor of $\approx 2^k$, and with $N$ samples you simply do not see events rarer than $\approx 1/N$. This is not a flaw in a particular method; it is a fundamental statistical wall. Keep it in mind — it will reappear as the InfoNCE ceiling in Section 5.

    So the plan is not "estimate the densities." The plan is: **never touch the densities; bound the information instead.**

    > [Belghazi et al., MINE (arXiv:1801.04062)](https://arxiv.org/abs/1801.04062) opens with exactly this motivation.
    > [McAllester & Stratos, "Formal Limitations on the Measurement of Mutual Information" (arXiv:1811.04251)](https://arxiv.org/abs/1811.04251) proves the $\log N$ sample wall.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(0)

        def true_mi_gauss(rho):
            return -0.5 * np.log(1 - rho**2) / np.log(2)

        def plugin_mi_histogram(x, y, bins):
            _c, _, _ = np.histogram2d(x, y, bins=bins)
            _pxy = _c / _c.sum()
            _px = _pxy.sum(axis=1, keepdims=True)
            _py = _pxy.sum(axis=0, keepdims=True)
            _m = _pxy > 0
            _ratio = _pxy[_m] / (_px @ _py)[_m]
            return float(np.sum(_pxy[_m] * np.log2(_ratio)))

        _rho = 0.8
        _truth = true_mi_gauss(_rho)
        print(f"=== Plug-in histogram MI vs truth (rho={_rho}, true MI={_truth:.4f} bits) ===")
        _cov = np.array([[1.0, _rho], [_rho, 1.0]])
        _L = np.linalg.cholesky(_cov)
        for _N in [200, 1000, 5000, 50000]:
            _z = _rng.standard_normal((_N, 2)) @ _L.T
            _est = plugin_mi_histogram(_z[:, 0], _z[:, 1], bins=20)
            print(f"  N={_N:6d}  20x20 histogram MI = {_est:7.4f} bits   "
                  f"(bias {_est - _truth:+.4f})")
        print("\nThe plug-in estimate is badly positively biased at small N:")
        print("empty/under-filled bins manufacture spurious dependence.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The Variational Trick: Bounds Instead of Densities

    The whole field rests on **variational representations of KL divergence** — formulas that write a divergence as a *supremum over functions*. The cleanest is the **Donsker–Varadhan (DV)** representation. For any two distributions $P$ and $Q$,

    $$D_{\mathrm{KL}}(P \| Q) = \sup_{T} \; \mathbb{E}_{P}[T] - \log \mathbb{E}_{Q}\!\big[e^{T}\big],$$

    where the supremum is over all functions $T$ for which the expectations exist. The optimum is attained at $T^\star = \log \frac{dP}{dQ} + \text{const}$, i.e. the log-density-ratio. The key feature: **the bound only ever needs expectations, which we can replace with sample averages.** No densities appear.

    Apply this with $P = p(x,y)$ (the joint) and $Q = p(x)p(y)$ (the product of marginals). Since $I(X;Y) = D_{\mathrm{KL}}(P\|Q)$, we get a **lower bound on mutual information** for *any* "critic" function $T(x,y)$:

    $$I(X;Y) \;\ge\; \mathbb{E}_{p(x,y)}\big[T(x,y)\big] \;-\; \log \mathbb{E}_{p(x)p(y)}\!\big[e^{T(x,y)}\big] \;=:\; I_{\mathrm{DV}}(T).$$

    Now the strategy is obvious. Parameterize $T$ by a neural network $T_\theta$, estimate both expectations from a minibatch (joint samples for the first term, *shuffled* pairs for the second — shuffling $y$ within the batch breaks the dependence and gives you draws from $p(x)p(y)$), and do **gradient ascent on $\theta$**. The bound tightens as $T_\theta$ approaches the true log-ratio. That is MINE.

    The trouble is the $\log \mathbb{E}_Q[e^T]$ term: a log of an expectation of an exponential. It is biased when estimated from a minibatch (because $\mathbb{E}[\log(\widehat{\text{avg}})] \ne \log \mathbb{E}[\text{avg}]$), and its gradient involves a ratio that has high variance. Different fixes to this one term give the different estimators below.

    > [Belghazi et al., MINE (arXiv:1801.04062)](https://arxiv.org/abs/1801.04062) uses the DV bound directly.
    > [Polyanskiy & Wu, *From Coding to Learning*](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf) derives the Donsker–Varadhan variational formula for KL.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Three Bounds: DV / MINE, NWJ, and InfoNCE

    All three estimators are lower bounds on $I(X;Y)$ built from a critic $T_\theta(x,y)$. They differ only in how they handle the normalization. Let $p$ denote joint samples and $q$ the product-of-marginals (shuffled) samples.

    **(a) Donsker–Varadhan / MINE.** The tightest of the three, but biased and high-variance from minibatches:

    $$I_{\mathrm{DV}} = \mathbb{E}_{p}[T] - \log \mathbb{E}_{q}\!\big[e^{T}\big].$$

    MINE in practice replaces the gradient of the log-mean-exp term with an exponential-moving-average correction to reduce bias; we will use a moving average for the normalizer.

    **(b) NWJ (Nguyen–Wainwright–Jordan, a.k.a. $f$-GAN / MINE-$f$).** Replace the troublesome $\log$ with a tangent line, giving an *unbiased* minibatch estimate for a fixed critic:

    $$I_{\mathrm{NWJ}} = \mathbb{E}_{p}[T] - e^{-1}\,\mathbb{E}_{q}\!\big[e^{T}\big].$$

    This is what you get from the variational lower bound on $f$-divergences; the optimal critic is $T^\star = 1 + \log\frac{p(x,y)}{p(x)p(y)}$. It has no $\log$-of-a-mean, so a minibatch estimate is unbiased — but the $e^{T}$ term still has nasty variance.

    **(c) InfoNCE (van den Oord et al., "CPC").** A contrastive, low-variance, but *upper-bounded-by-$\log N$* estimator. With a batch of $N$ paired samples, for each positive pair $(x_i, y_i)$ use the other $N-1$ partners as negatives:

    $$I_{\mathrm{NCE}} = \mathbb{E}\!\left[\frac{1}{N}\sum_{i=1}^{N} \log \frac{e^{T(x_i, y_i)}}{\frac{1}{N}\sum_{j=1}^{N} e^{T(x_i, y_j)}}\right] \;\le\; \log N.$$

    This is just the softmax cross-entropy of "pick the true partner out of $N$ candidates." It is **stable and well-behaved** — which is why SimCLR, CPC, and friends use it — but it can *never report more than $\log N$ bits*, no matter how dependent $X$ and $Y$ are. That is the McAllester–Stratos wall made concrete.

    DV and NWJ are both tight when each is evaluated at its own optimal critic; the NWJ optimum is shifted upward by $+1$ relative to the log-density ratio. InfoNCE is different: it is capped at $\log N$, so when the true MI exceeds that ceiling its under-estimation is at least $I - \log N$.

    > [van den Oord et al., "Representation Learning with Contrastive Predictive Coding" (arXiv:1807.03748)](https://arxiv.org/abs/1807.03748) introduces InfoNCE.
    > [Poole et al., "On Variational Bounds of Mutual Information" (arXiv:1905.06922)](https://arxiv.org/abs/1905.06922) unifies DV, NWJ, and InfoNCE in one framework and analyzes their bias/variance.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(1)

        _rho = 0.9
        _true_mi = -0.5 * np.log(1 - _rho**2) / np.log(2)
        _cov = np.array([[1.0, _rho], [_rho, 1.0]])
        _L = np.linalg.cholesky(_cov)
        _N = 4000
        _z = _rng.standard_normal((_N, 2)) @ _L.T
        _x = _z[:, 0]
        _y = _z[:, 1]

        def _optimal_critic(xx, yy):
            _r = _rho
            _q = (xx**2 + yy**2) * (_r**2) - 2 * _r * xx * yy
            return -0.5 * np.log(1 - _r**2) - _q / (2 * (1 - _r**2))

        _T_joint = _optimal_critic(_x, _y)
        _y_shuf = _rng.permutation(_y)
        _T_prod = _optimal_critic(_x, _y_shuf)

        _dv = (_T_joint.mean() - np.log(np.mean(np.exp(_T_prod)))) / np.log(2)
        _T_nwj_joint = _T_joint + 1.0
        _T_nwj_prod = _T_prod + 1.0
        _nwj = (_T_nwj_joint.mean() - np.exp(-1) * np.mean(np.exp(_T_nwj_prod))) / np.log(2)

        _Tmat = _optimal_critic(_x[:, None], _y[None, :])
        _logits = _Tmat - np.max(_Tmat, axis=1, keepdims=True)
        _lse = np.log(np.sum(np.exp(_logits), axis=1)) + np.max(_Tmat, axis=1)
        _nce = (np.mean(np.diag(_Tmat) - _lse) + np.log(_N)) / np.log(2)

        print(f"=== Bounds with the OPTIMAL critic (rho={_rho}) ===")
        print(f"  true MI            = {_true_mi:.4f} bits")
        print(f"  I_DV   (MINE)      = {_dv:.4f} bits")
        print(f"  I_NWJ              = {_nwj:.4f} bits")
        print(f"  I_NCE  (batch {_N}) = {_nce:.4f} bits   (ceiling log2 N = {np.log2(_N):.4f})")
        print("\nEven with the perfect critic, NCE saturates near the truth here")
        print("because log2(N) is comfortably above the true MI. Push rho up and watch.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. MINE in Pure Numpy: a Tiny MLP Critic

    Time to actually train an estimator. The critic $T_\theta(x,y)$ is a two-layer MLP: it takes the concatenated pair $[x, y]$, runs it through a hidden layer with a $\tanh$ nonlinearity, and outputs one scalar. We train it by **gradient ascent** on the DV/MINE objective using minibatches, getting "product" samples by shuffling $y$ within each batch.

    The forward pass for input $u = [x, y] \in \mathbb{R}^{2}$ is

    $$ h = \tanh(W_1 u + b_1), \qquad T = W_2 h + b_2 \in \mathbb{R}. $$

    The objective we ascend is the DV bound $\mathcal{L} = \overline{T_{\text{joint}}} - \log \overline{e^{T_{\text{prod}}}}$. We backpropagate by hand. The only subtlety is the second term: its gradient w.r.t. each product-sample output $T_j$ is the **softmax weight** $\frac{e^{T_j}}{\sum_k e^{T_k}}$, so rare large-$T$ negatives dominate — exactly the source of MINE's variance. We use an exponential moving average of the denominator to stabilize, as in the MINE paper.

    Everything below is plain numpy: manual forward pass, manual gradients, manual SGD. No autodiff, no torch. This is the entire algorithm — read it, it is shorter than you expect.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(2)

        _rho = 0.8
        _true_mi = -0.5 * np.log(1 - _rho**2) / np.log(2)
        _cov = np.array([[1.0, _rho], [_rho, 1.0]])
        _L = np.linalg.cholesky(_cov)
        _N = 8000
        _data = _rng.standard_normal((_N, 2)) @ _L.T

        _H = 64
        _W1 = _rng.standard_normal((_H, 2)) * 0.3
        _b1 = np.zeros(_H)
        _W2 = _rng.standard_normal((1, _H)) * 0.3
        _b2 = np.zeros(1)

        def _forward(W1, b1, W2, b2, u):
            _pre = u @ W1.T + b1
            _h = np.tanh(_pre)
            _t = _h @ W2.T + b2
            return _t.ravel(), _h, _pre

        _lr = 0.005
        _bs = 256
        _ema = None
        _ema_rate = 0.99
        _history = []

        for _step in range(1500):
            _idx = _rng.integers(0, _N, _bs)
            _xj = _data[_idx]
            _yperm = _data[_rng.permutation(_idx), 1]
            _xp = np.column_stack([_xj[:, 0], _yperm])

            _tj, _hj, _ = _forward(_W1, _b1, _W2, _b2, _xj)
            _tp, _hp, _ = _forward(_W1, _b1, _W2, _b2, _xp)

            _exp_tp = np.exp(_tp - _tp.max())
            _mean_exp = np.mean(np.exp(_tp))
            if _ema is None:
                _ema = _mean_exp
            else:
                _ema = _ema_rate * _ema + (1 - _ema_rate) * _mean_exp

            _mi_nats = _tj.mean() - np.log(_mean_exp)
            _history.append(_mi_nats / np.log(2))

            _dtj = np.ones(_bs) / _bs
            _w = np.exp(_tp) / (_bs * _ema)
            _dtp = -_w

            _dW2 = (_dtj[:, None] * _hj).sum(0, keepdims=True) + (_dtp[:, None] * _hp).sum(0, keepdims=True)
            _db2 = np.array([_dtj.sum() + _dtp.sum()])
            _dhj = _dtj[:, None] * _W2
            _dhp = _dtp[:, None] * _W2
            _dprej = _dhj * (1 - _hj**2)
            _dprep = _dhp * (1 - _hp**2)
            _dW1 = _dprej.T @ _xj + _dprep.T @ _xp
            _db1 = _dprej.sum(0) + _dprep.sum(0)

            _W1 += _lr * _dW1
            _b1 += _lr * _db1
            _W2 += _lr * _dW2
            _b2 += _lr * _db2

        _final = np.mean(_history[-100:])
        print(f"=== MINE (pure-numpy MLP critic), rho={_rho} ===")
        print(f"  true MI               = {_true_mi:.4f} bits")
        print(f"  MINE estimate (avg)   = {_final:.4f} bits")
        print(f"  estimate at step 0    = {_history[0]:.4f} bits  (starts near 0)")
        print(f"  estimate at step 100  = {_history[100]:.4f} bits")
        print(f"  estimate at step 500  = {_history[500]:.4f} bits")
        print("\nThe network learns the log-density-ratio from scratch and the")
        print("bound climbs from ~0 toward the true MI. No torch, no autodiff.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Bake-Off: MINE vs InfoNCE on a Known-MI Gaussian

    Here is the payoff and the required experiment. We use a **2-D correlated Gaussian**, $(X, Y)$ jointly normal with correlation $\rho$, because its mutual information has a clean closed form:

    $$I(X;Y) = -\tfrac{1}{2}\log_2\!\big(1 - \rho^2\big) \quad \text{bits}.$$

    As $\rho \to 1$ the variables become perfectly dependent and the true MI blows up to $\infty$. This is the perfect stress test, because **InfoNCE physically cannot report more than $\log_2 N$ bits**, so as you crank $\rho$ toward 1 you will watch it flatten out against its ceiling while the truth runs away.

    Drag the correlation slider. To isolate the statistical limits from optimization failure, the demo evaluates the **optimal Gaussian log-density-ratio critic** directly; no neural network is trained on slider movement. The dashed line is the closed-form truth and the dotted line is the InfoNCE ceiling $\log_2 N$. Watch three regimes:

    - **Low $\rho$** (true MI small): both estimators sit close to the truth.
    - **Moderate $\rho$**: the DV/MINE estimate tracks the truth; InfoNCE starts to lag as it approaches its ceiling.
    - **High $\rho$** (true MI $> \log_2 N$): InfoNCE pins to the dotted ceiling and *cannot* follow the truth — the bias is exactly the McAllester–Stratos wall, not a bug. The DV/MINE objective is not capped, but its variance grows because the log-density ratio becomes extreme.
    """)
    return


@app.cell
def _(mo):
    rho_slider = mo.ui.slider(start=0.0, stop=0.999, step=0.001, value=0.6,
                              label="correlation rho")
    rho_slider
    return (rho_slider,)


@app.cell
def _(rho_slider):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _rng = np.random.default_rng(7)
        _rho = float(rho_slider.value)
        _rho = min(_rho, 0.999)

        def _true_mi(r):
            return -0.5 * np.log(1 - r**2) / np.log(2)

        def _opt_critic(xx, yy, r):
            _q = (xx**2 + yy**2) * (r**2) - 2 * r * xx * yy
            return -0.5 * np.log(1 - r**2) - _q / (2 * (1 - r**2))

        _N = 16
        _cov = np.array([[1.0, _rho], [_rho, 1.0]])
        _L = np.linalg.cholesky(_cov)
        _data = _rng.standard_normal((_N, 2)) @ _L.T
        _x, _y = _data[:, 0], _data[:, 1]

        _tj = _opt_critic(_x, _y, _rho)
        _tp = _opt_critic(_x, _rng.permutation(_y), _rho)
        _tp_max = np.max(_tp)
        _log_mean_exp = _tp_max + np.log(np.mean(np.exp(_tp - _tp_max)))
        _mine_est = (_tj.mean() - _log_mean_exp) / np.log(2)

        _Tmat = _opt_critic(_x[:, None], _y[None, :], _rho)
        _row_max = _Tmat.max(axis=1, keepdims=True)
        _lse = np.log(np.exp(_Tmat - _row_max).sum(axis=1)) + _row_max.ravel()
        _nce_est = (np.mean(np.diag(_Tmat) - _lse) + np.log(_N)) / np.log(2)

        _truth = _true_mi(_rho)
        _ceiling = np.log2(_N)

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(11, 4.2))

        _rhos = np.linspace(0.0, 0.999, 300)
        _truths = _true_mi(_rhos)
        _ax1.plot(_rhos, _truths, color="black", lw=2, label="true MI")
        _ax1.plot(_rhos, np.minimum(_truths, _ceiling), color="steelblue", lw=2, ls="--",
                  label="ceiling-limited contrastive target")
        _ax1.axhline(_ceiling, color="crimson", ls=":", lw=1.5, label=f"log2 N = {_ceiling:.2f}")
        _ax1.scatter([_rho], [_truth], color="black", s=45, zorder=5)
        _ax1.scatter([_rho], [min(_truth, _ceiling)], color="steelblue", s=45, zorder=5)
        _ax1.set_xlabel("correlation rho")
        _ax1.set_ylabel("MI (bits)")
        _ax1.set_title("Truth vs the InfoNCE ceiling")
        _ax1.legend(fontsize=8, loc="upper left")
        _ax1.grid(True, alpha=0.3)
        _ax1.set_ylim(-0.1, max(_ceiling, _truth) * 1.2 + 0.3)

        _labels = ["true MI", "DV/MINE\n(opt critic)", "InfoNCE\n(opt critic)"]
        _vals = [_truth, _mine_est, _nce_est]
        _colors = ["black", "darkorange", "steelblue"]
        _bars = _ax2.bar(_labels, _vals, color=_colors, alpha=0.8)
        _ax2.axhline(_ceiling, color="crimson", ls=":", lw=1.5)
        _ax2.text(2.4, _ceiling, f"log2 N={_ceiling:.2f}", color="crimson",
                  va="bottom", ha="right", fontsize=8)
        _ax2.set_ylabel("MI (bits)")
        _ax2.set_title(f"Current estimates  (rho={_rho:.3f}, N={_N})")
        _ax2.grid(True, axis="y", alpha=0.3)
        for _b, _v in zip(_bars, _vals):
            _ax2.text(_b.get_x() + _b.get_width() / 2, _v, f"{_v:.2f}",
                      ha="center", va="bottom", fontsize=9)

        plt.tight_layout()
        return _fig

    return _run()


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Bias, Variance, and the Estimator Trade-Off

    No single estimator wins. Each sits at a different point on a **bias–variance–boundedness** triangle:

    | Estimator | Bias | Variance | Ceiling | Use when |
    |-----------|------|----------|---------|----------|
    | **DV / MINE** | low (asymptotically tight) | **high** (grows with true MI) | none | you need a tight estimate and can tolerate noise |
    | **NWJ** | unbiased (for fixed critic) | **very high** ($\propto e^{I}$) | none | theory; rarely best in practice |
    | **InfoNCE** | **biased low** by $\le \log N - I$ | **low** | $\log_2 N$ | representation learning; you want a stable objective |

    The deep result, made precise by **Poole et al. (2019)** and **Song & Ermon (2020)**, is a *variance lower bound*: any estimator that is a tight lower bound on a large mutual information must have variance that grows **exponentially in the number of bits**. You cannot have a low-variance, low-bias, unbounded MI estimator from finite samples. Pick two. InfoNCE buys its stability by accepting the $\log N$ cap; MINE buys tightness by accepting variance that explodes as the truth grows.

    This is why, in practice:

    - For **estimating** a small-to-moderate MI, MINE or NWJ with enough samples is fine.
    - For **optimizing** a representation (the InfoMax / CPC / SimCLR setting), InfoNCE is the workhorse — you do not need the *value* of the MI, only a gradient that increases it, and the bounded, low-variance objective is far easier to train against. The $\log N$ ceiling becomes a *feature*: larger batches raise the ceiling and give a stronger learning signal, which is exactly why contrastive methods love huge batches.

    The demo below sweeps $\rho$ with the *optimal* critic (so we isolate the statistical, not optimization, behavior) and shows MINE's variance ballooning while InfoNCE flattens against its ceiling.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(11)
        _N = 256
        _trials = 40

        def _true_mi(r):
            return -0.5 * np.log(1 - r**2) / np.log(2)

        def _opt_critic(xx, yy, r):
            _q = (xx**2 + yy**2) * (r**2) - 2 * r * xx * yy
            return -0.5 * np.log(1 - r**2) - _q / (2 * (1 - r**2))

        print("=== Sweep with optimal critic (N=256, 40 trials each) ===")
        print(f"{'rho':>5} {'true MI':>9} {'MINE mean':>10} {'MINE std':>9} "
              f"{'NCE mean':>9} {'log2 N':>7}")
        for _rho in [0.3, 0.6, 0.85, 0.95, 0.99, 0.999999]:
            _cov = np.array([[1.0, _rho], [_rho, 1.0]])
            _L = np.linalg.cholesky(_cov)
            _mine_vals = []
            _nce_vals = []
            for _ in range(_trials):
                _z = _rng.standard_normal((_N, 2)) @ _L.T
                _x, _y = _z[:, 0], _z[:, 1]
                _tj = _opt_critic(_x, _y, _rho)
                _ys = _rng.permutation(_y)
                _tp = _opt_critic(_x, _ys, _rho)
                _tp_max = np.max(_tp)
                _log_mean_exp = _tp_max + np.log(np.mean(np.exp(_tp - _tp_max)))
                _mine_vals.append((_tj.mean() - _log_mean_exp) / np.log(2))
                _M = _opt_critic(_x[:, None], _y[None, :], _rho)
                _rm = _M.max(axis=1, keepdims=True)
                _lse = np.log(np.exp(_M - _rm).sum(axis=1)) + _rm.ravel()
                _nce_vals.append((np.mean(np.diag(_M) - _lse) + np.log(_N)) / np.log(2))
            print(f"{_rho:>5.6f} {_true_mi(_rho):>9.3f} {np.mean(_mine_vals):>10.3f} "
                  f"{np.std(_mine_vals):>9.3f} {np.mean(_nce_vals):>9.3f} {np.log2(_N):>7.3f}")
        print("\nMINE std grows with rho (true MI); InfoNCE cannot exceed log2 N=8.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. The Tschannen Critique: "Mutual Information Maximization" Often Is Not

    Here is the twist that reframes the whole enterprise. **Tschannen, Djolonga, Rubenstein, Gelly & Lucic (2019)**, in *"On Mutual Information Maximization for Representation Learning,"* ran a careful set of experiments and reached an uncomfortable conclusion: **the success of InfoMax-style representation learning is largely uncorrelated with how much mutual information is actually estimated or maximized.**

    Their evidence, in plain terms:

    1. **Looser bounds sometimes give better representations.** If maximizing MI were the mechanism, the tightest bound should win. It does not. Methods using *looser* MI estimators sometimes learned *better* downstream features.
    2. **You can maximize a valid MI bound and learn garbage.** Because MI is invariant under any invertible transformation, an encoder can achieve arbitrarily high $I(X; f(X))$ while producing useless, entangled features. High MI does not imply useful structure.
    3. **The critic's *architecture* (the inductive bias) and the *negative-sampling* strategy explain the gains** far better than the MI value does. A bilinear or separable critic that happens to encourage a metric structure is doing the real work; "maximizing MI" is the story we tell afterward.

    The takeaway is not "these methods are bad" — InfoNCE/CPC/SimCLR plainly work. The takeaway is **be honest about the mechanism**. When InfoNCE succeeds at representation learning, credit the contrastive *geometry* and the inductive biases, not a faithful estimate of $I(X;Y)$ — which, per Sections 1 and 5, you probably could not measure anyway when it is large.

    For you as a practitioner this resolves a real confusion. If you reach for a neural MI estimator to *measure* information (e.g., to populate an information plane as in 6C, or audit how much a representation leaks about a sensitive attribute), respect the $\log N$ wall and the variance bounds — treat large reported values with deep suspicion. If you reach for InfoNCE to *learn* a representation, you are using a contrastive objective that happens to be a loose MI bound; tune the critic and the negatives, not the "tightness."

    > [Tschannen et al., "On Mutual Information Maximization for Representation Learning" (arXiv:1907.13625)](https://arxiv.org/abs/1907.13625) is the critique in full.
    > [Poole et al. (arXiv:1905.06922)](https://arxiv.org/abs/1905.06922) and [Song & Ermon, "Understanding the Limitations of Variational MI Estimators" (arXiv:1910.06222)](https://arxiv.org/abs/1910.06222) give the matching theory.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    This module *is* an ML module, so the connections are the point — let us make them explicit.

    - **Contrastive self-supervised learning.** SimCLR, MoCo, CPC, and most modern self-supervised vision/audio pipelines optimize an InfoNCE objective. Understanding it as a $\log N$-bounded MI lower bound explains the field's obsession with **large batch sizes** (more negatives $\Rightarrow$ higher ceiling $\Rightarrow$ stronger gradient) and the choice of **temperature** (it is the inverse scale of the critic $T$).

    - **The information bottleneck, made trainable.** In 6C the IB Lagrangian needed $I(X;Z)$ and $I(Z;Y)$. For deep networks with continuous $Z$, those are exactly the intractable quantities this module estimates. Variational bounds (VIB uses an upper bound for the rate term, MINE/InfoNCE a lower bound for the relevance term) are what turn the IB from theory into a loss you can backprop.

    - **Representation auditing and fairness.** Want to check how much your embedding leaks about a protected attribute? You are estimating MI from samples — and you must respect the $\log N$ wall and the McAllester–Stratos limit, or you will fool yourself with optimistic numbers.

    - **Disentanglement and generative models.** InfoGAN maximizes MI between latent codes and outputs; total-correlation VAEs penalize MI among latent dimensions. Same estimators, same caveats.

    - **A general lesson in honest evaluation.** The Tschannen critique is a model of scientific hygiene: a method can *work* for reasons unrelated to the *story* attached to it. Hold that lesson — it generalizes far beyond mutual information.

    With this, Part 6's information-theoretic spine of ML is nearly complete. **Module 6E** closes it by connecting rate-distortion theory to VAEs and neural compression — where the ELBO turns out to be a rate-distortion objective and the same variational bounds reappear as the tools of learned compression.
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
    ### Exercise 1: Closed-Form Gaussian MI

    Implement `gauss_mi(rho)` returning the mutual information in **bits** of a 2-D standard correlated Gaussian with correlation $\rho$, using $I = -\tfrac12 \log_2(1-\rho^2)$. Check that $\rho=0$ gives 0 bits and that the value blows up as $\rho \to 1$.
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

        def gauss_mi(rho):
            # TODO: return -0.5 * log2(1 - rho**2)
            _result = ...
            return _result

        # print(gauss_mi(0.0))    # expect 0.0
        # print(gauss_mi(0.6))    # expect ~0.322
        # print(gauss_mi(0.95))   # expect ~1.680

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Donsker–Varadhan Bound with a Fixed Critic

    Given joint samples and a critic function $T(x,y)$, estimate the DV lower bound
    $I_{\mathrm{DV}} = \overline{T_{\text{joint}}} - \log\,\overline{e^{T_{\text{prod}}}}$ in bits.
    Get product-of-marginals samples by **shuffling** $y$. Use the supplied near-optimal critic and confirm the bound lands close to the true MI.
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

        _rng = np.random.default_rng(3)
        _rho = 0.7
        _L = np.linalg.cholesky([[1.0, _rho], [_rho, 1.0]])
        _z = _rng.standard_normal((5000, 2)) @ _L.T
        x, y = _z[:, 0], _z[:, 1]

        def critic(xx, yy):
            _q = (xx**2 + yy**2) * (_rho**2) - 2 * _rho * xx * yy
            return -0.5 * np.log(1 - _rho**2) - _q / (2 * (1 - _rho**2))

        # TODO: T on the true (joint) pairs
        T_joint = ...

        # TODO: shuffle y to make product-of-marginals pairs, then T on those
        y_shuffled = ...
        T_prod = ...

        # TODO: DV bound in bits = (mean(T_joint) - log(mean(exp(T_prod)))) / log(2)
        dv_bits = ...

        # print(f"DV estimate = {dv_bits:.4f} bits  (true = {-0.5*np.log2(1-_rho**2):.4f})")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: The InfoNCE Estimate and Its Ceiling

    Build the $N\times N$ critic matrix $T_{ij} = T(x_i, y_j)$ (diagonal = positives, off-diagonal = negatives). Compute the InfoNCE bound
    $I_{\mathrm{NCE}} = \overline{\,T_{ii} - \mathrm{logsumexp}_j\,T_{ij}\,} + \log N$, in bits. Verify it never exceeds $\log_2 N$.
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

        _rng = np.random.default_rng(4)
        _rho = 0.97
        _L = np.linalg.cholesky([[1.0, _rho], [_rho, 1.0]])
        N = 128
        _z = _rng.standard_normal((N, 2)) @ _L.T
        x, y = _z[:, 0], _z[:, 1]

        def critic(xx, yy):
            _q = (xx**2 + yy**2) * (_rho**2) - 2 * _rho * xx * yy
            return -0.5 * np.log(1 - _rho**2) - _q / (2 * (1 - _rho**2))

        # TODO: T[i, j] = critic(x[i], y[j])  (hint: broadcasting x[:,None], y[None,:])
        T = ...

        # TODO: row-wise logsumexp over j (subtract row max for stability)
        row_max = ...
        lse = ...

        # TODO: InfoNCE in bits = (mean(diag(T) - lse) + log(N)) / log(2)
        nce_bits = ...

        # print(f"InfoNCE = {nce_bits:.4f} bits,  ceiling log2(N) = {np.log2(N):.4f}")
        # print("true MI =", -0.5*np.log2(1-_rho**2), "  <- far above the ceiling!")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: One Gradient Step of MINE by Hand

    The MINE objective is $\mathcal{L} = \overline{T_{\text{joint}}} - \log\,\overline{e^{T_{\text{prod}}}}$.
    For a fixed batch of joint outputs `t_joint` and product outputs `t_prod` (treat them as the free variables), derive the gradient of $\mathcal{L}$ with respect to each output. The joint term contributes $1/B$ to each $T_{\text{joint},i}$; the product term contributes the **negative softmax weight** $-e^{T_{\text{prod},j}} / \sum_k e^{T_{\text{prod},k}}$ to each $T_{\text{prod},j}$.
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

        _rng = np.random.default_rng(5)
        B = 8
        t_joint = _rng.normal(1.0, 0.5, B)
        t_prod = _rng.normal(0.0, 0.5, B)

        # TODO: grad of L wrt each joint output (each is +1/B)
        grad_joint = ...

        # TODO: grad of L wrt each product output: -softmax(t_prod)
        grad_prod = ...

        # print("grad_joint:", grad_joint)      # all 1/8 = 0.125
        # print("grad_prod sums to -1:", grad_prod.sum())   # expect -1.0
        # print("most-negative grad at argmax t_prod:", np.argmin(grad_prod) == np.argmax(t_prod))

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Bias of the Plug-In Histogram Estimator

    Demonstrate the small-sample positive bias of the naive plug-in MI estimator — the "just estimate the densities" approach Section 1 warned against. For $\rho = 0.5$ (true MI $= -\tfrac12\log_2(1-0.25) \approx 0.2075$ bits), draw samples, bin them into a 2-D histogram with a *fixed* $16\times16$ grid, and compute the plug-in MI directly from the binned joint.

    Fill in `plugin_mi`: from the raw samples build the 2-D histogram of counts, normalize to a joint probability $p(x,y)$, take the two marginals, and sum $p\log_2\frac{p}{p_x p_y}$ over the nonzero cells. Then run it at $N=200$ and $N=20000$. With few samples most of the $256$ cells are empty or hold a single count, and those under-filled cells *manufacture* apparent dependence — so the small-$N$ estimate should come out biased **high**, well above the truth, while the large-$N$ estimate lands close to it.
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

        _rng = np.random.default_rng(6)
        rho = 0.5
        true_mi = -0.5 * np.log2(1 - rho**2)
        _L = np.linalg.cholesky([[1.0, rho], [rho, 1.0]])

        def plugin_mi(x, y, bins=16):
            # TODO (1): 2-D histogram of counts over the bins x bins grid.
            #   hint: np.histogram2d(x, y, bins=bins) returns (counts, xedges, yedges);
            #   keep only the counts array.
            _c = ...
            # TODO (2): normalize counts to a joint probability table p(x,y) = counts / counts.sum().
            _pxy = ...
            # TODO (3): marginals _px (sum over y, keepdims) and _py (sum over x, keepdims).
            _px = ...
            _py = ...
            # TODO (4): nonzero mask, then return sum over those cells of p*log2(p/(px*py)).
            #   hint: the independent product is (_px @ _py); index it with the same mask.
            _m = ...
            return ...

        # for N in [200, 20000]:
        #     z = _rng.standard_normal((N, 2)) @ _L.T
        #     est = plugin_mi(z[:, 0], z[:, 1])
        #     print(f"N={N:6d}  plug-in MI = {est:.4f}  (true {true_mi:.4f}, bias {est-true_mi:+.4f})")
        # Expected (seed 6): N=200 -> plug-in MI ~ 0.78 bits (bias ~ +0.58, badly HIGH);
        #   N=20000 -> ~ 0.20 bits (bias ~ -0.01, essentially on the truth 0.2075).
        #   The empty/under-filled cells at small N fake dependence -> positive bias.

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    # Course navigation cell
    mo.md(
        r"""
    ---

    [&#8593; Course home](../) &nbsp;|&nbsp; &#8592; Prev: [6C: The Information Bottleneck](../6c_information_bottleneck/) &nbsp;|&nbsp; Next: [6E: Rate-Distortion, VAEs & Neural Compression](../6e_vae_compression/) &#8594;
    """
    )
    return


if __name__ == "__main__":
    app.run()
