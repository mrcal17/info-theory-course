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
    # 6C: The Information Bottleneck

    > *"The goal is to extract a compact representation of the variable $X$ that is as informative as possible about another variable $Y$."*
    > — Tishby, Pereira & Bialek, 1999

    You spent Part 1 learning that mutual information $I(X;Y)$ measures how much one variable tells you about another, and 6A/6B taught you to read learning itself through an information-theoretic lens. Now we ask the question that turns all of that into a *principle of representation learning*: when you build a feature, an embedding, a hidden layer — a compressed stand-in $T$ for your raw input $X$ — what exactly should it keep, and what should it throw away?

    The naive answer "keep everything" is wrong, and not just for efficiency. A representation that memorizes $X$ perfectly has learned the noise along with the signal; it cannot generalize. The **Information Bottleneck** (IB) makes the right answer precise. It says: squeeze $X$ through a bottleneck $T$ that is *minimal* — small $I(X;T)$, so it forgets irrelevant detail — while staying *sufficient* — large $I(T;Y)$, so it keeps everything about the thing you actually care about, $Y$. One scalar knob, $\beta$, trades the two off, and sweeping it traces an optimal frontier called the **information curve**.

    This is one of the most beautiful bridges in the course: it is rate-distortion theory (5A) with the distortion measure *learned from data*, it is the clean theoretical ancestor of the variational objectives in 6D and 6E, and it produced a genuinely controversial story about what deep networks do during training. We will build the IB from its Lagrangian, derive and *run* its self-consistent equations in pure numpy, drive the information curve with a $\beta$-slider, watch a network's trajectory through the **information plane**, and confront the Shwartz-Ziv–Tishby "compression phase" claim together with Saxe et al.'s sharp rebuttal. We finish with the deep variational IB (VIB), the trick that made IB trainable at scale.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. The Relevant-Information Problem

    Classical lossy compression (rate-distortion, 5A) needs you to *hand it a distortion measure* — you must declare, in advance, which reconstructions of $X$ are "close enough." For images you might pick mean-squared error; for audio a perceptual metric. But that choice is exactly the hard part. Who is to say two configurations of pixels are similar? Similar **for what purpose**?

    The Information Bottleneck reframes compression around purpose. Suppose alongside $X$ you have a second, *relevance* variable $Y$ — the label, the future, the thing your representation will be judged against — with a known (or estimable) joint distribution $p(x, y)$. Now "what to keep about $X$" has a principled answer: **keep exactly what $X$ says about $Y$, and nothing else.**

    Concretely, we look for a (possibly stochastic) map $X \to T$, described by an encoder $p(t \mid x)$, that produces a new variable $T$ obeying the **Markov chain**

    $$Y \;\leftrightarrow\; X \;\leftrightarrow\; T,$$

    meaning $T$ is built *only* from $X$ (it sees $Y$ solely through $X$). Under this constraint two desiderata pull against each other:

    - **Compression:** make $I(X;T)$ **small.** $I(X;T)$ is the number of bits $T$ retains about the raw input — the "rate" of the bottleneck. Small rate = $T$ forgets most of $X$.
    - **Relevance / sufficiency:** make $I(T;Y)$ **large.** This is how much of the relevant information survives the squeeze.

    The data-processing inequality (1B) guarantees a ceiling: because $Y \leftrightarrow X \leftrightarrow T$, no representation can know more about $Y$ than $X$ itself does,

    $$I(T;Y) \;\le\; I(X;Y).$$

    So the *best possible* relevance is $I(X;Y)$, and the only question is how many bits of $X$ you must pay to approach it. That trade-off — relevance versus rate — is the entire subject.

    > [Tishby, Pereira & Bialek (1999), *The Information Bottleneck Method*](https://arxiv.org/abs/physics/0004057) is the founding paper; the rate-distortion connection in [Cover & Thomas Ch 10](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) is the right backdrop.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def _mi(joint, base=2):
            joint = np.asarray(joint, dtype=float)
            joint = joint / joint.sum()
            px = joint.sum(axis=1, keepdims=True)
            py = joint.sum(axis=0, keepdims=True)
            _ind = px @ py
            _mask = joint > 0
            return float(np.sum(joint[_mask] * np.log(joint[_mask] / _ind[_mask])) / np.log(base))

        _pxy = np.array([
            [0.30, 0.05],
            [0.05, 0.10],
            [0.02, 0.18],
            [0.18, 0.12],
        ])
        _pxy = _pxy / _pxy.sum()
        _ixy = _mi(_pxy)

        print("=== The relevance ceiling I(X;Y) ===")
        print(f"  Toy joint p(x,y) over 4 inputs x 2 relevance values")
        print(f"  I(X;Y) = {_ixy:.4f} bits   <- the MOST any representation T can keep about Y")
        print()
        print("  A trivial encoder T = X keeps all of it but pays I(X;T) = H(X):")
        _hx = float(-np.sum((s := _pxy.sum(axis=1))[s > 0] * np.log2(s[s > 0])))
        print(f"    I(X;T=X) = H(X) = {_hx:.4f} bits  (expensive!)")
        print("  A trivial encoder T = const keeps nothing: I(X;T)=0, I(T;Y)=0 (useless).")
        print("  The IB asks for everything in between, optimally.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The IB Lagrangian

    We have a constrained problem: minimize the rate $I(X;T)$ subject to keeping the relevance $I(T;Y)$ above some level. As always, we fold the constraint into the objective with a Lagrange multiplier. The **Information Bottleneck functional** is

    $$\mathcal{L}_{\text{IB}}[\,p(t\mid x)\,] \;=\; I(X;T)\;-\;\beta\,I(T;Y),$$

    and we **minimize** it over all encoders $p(t \mid x)$. Read the two terms as forces:

    - $I(X;T)$ is a cost we *pay* — every bit $T$ keeps about $X$ adds to it. Minimizing alone wants $T$ to collapse to a constant.
    - $-\beta\, I(T;Y)$ is a reward — keeping relevant bits *lowers* $\mathcal{L}$. Maximizing alone wants $T = X$.

    The multiplier $\beta \ge 0$ sets the exchange rate, in *relevant bits per compression bit*:

    - $\beta \to 0$: compression dominates. The optimum is the trivial $T = \text{const}$: $I(X;T) = 0$, $I(T;Y) = 0$. Maximal squeeze, zero relevance.
    - $\beta \to \infty$: relevance dominates. $T$ keeps everything predictive of $Y$; it becomes a **minimal sufficient statistic** of $X$ for $Y$. You approach $I(T;Y) = I(X;Y)$.
    - **Intermediate $\beta$:** the interesting regime — partial, *purposeful* compression.

    Sweeping $\beta$ from $0$ to $\infty$ traces a curve in the $\big(I(X;T),\, I(T;Y)\big)$ plane: the **information curve** (or information *plane*). It is concave and monotone, it lies under the line $I(T;Y) = I(X;T)$ (you cannot keep more relevant bits than total bits) and under the ceiling $I(T;Y) = I(X;Y)$, and **$\beta$ is exactly the slope of this curve** at each point — the marginal relevant-bits-per-bit you buy by loosening the bottleneck. This is the precise analogue of the rate-distortion curve $R(D)$ from 5A, with $\beta$ playing the role of the inverse temperature $1/T$ and $-I(T;Y)$ playing the role of distortion.

    > [Tishby et al. (1999)](https://arxiv.org/abs/physics/0004057) derives the functional; compare the $R(D)$ Lagrangian in [Cover & Thomas §10.3–10.4](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X).
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. The Self-Consistent Equations

    Minimizing $\mathcal{L}_{\text{IB}}$ by setting its functional derivative to zero (subject to normalization of $p(t\mid x)$) gives a system of three coupled equations that the optimal encoder must satisfy. These are the **IB self-consistent equations** — the direct cousins of the Blahut–Arimoto updates you built for channel capacity in 3A:

    $$p(t \mid x) \;=\; \frac{p(t)}{Z(x,\beta)}\,\exp\!\Big(-\beta\, D_{\mathrm{KL}}\!\big[\,p(y\mid x)\,\big\|\,p(y\mid t)\,\big]\Big),$$

    $$p(t) \;=\; \sum_x p(x)\,p(t\mid x), \qquad p(y\mid t) \;=\; \frac{1}{p(t)}\sum_x p(x,y)\,p(t\mid x).$$

    Stare at the first equation — it is the heart of the method. The probability that input $x$ is assigned to cluster $t$ is a **softmax** (a Boltzmann distribution) whose "energy" is the KL divergence between *what $x$ predicts about $Y$*, $p(y\mid x)$, and *what cluster $t$ predicts about $Y$*, $p(y\mid t)$. Inputs get routed to whichever bottleneck state already agrees with them about $Y$; $\beta$ is the inverse temperature sharpening that assignment. The distortion measure is **not handed to us** — it is the KL divergence in *prediction space*, emergent from $p(x,y)$ itself. That is the whole magic: the IB *learns* its own notion of "similar enough."

    The algorithm just iterates these three equations to a fixed point (this is the **IB / Blahut–Arimoto iteration**):

    1. Start from a random soft assignment $p(t\mid x)$.
    2. Update the marginals $p(t)$ and the cluster predictions $p(y\mid t)$.
    3. Recompute every $\mathrm{KL}[p(y\mid x)\,\|\,p(y\mid t)]$ and re-form the softmax encoder.
    4. Repeat until $\mathcal{L}_{\text{IB}}$ stops decreasing.

    Like Blahut–Arimoto it is alternating minimization of a single convex-in-each-block functional, so each step cannot increase $\mathcal{L}_{\text{IB}}$. (Unlike capacity, the full IB objective is *not* jointly convex, so different inits can land in different local optima — but for small problems it is very well behaved.) The cell below implements it from scratch and verifies the limiting behavior in $\beta$.

    > [Tishby et al. (1999)](https://arxiv.org/abs/physics/0004057) §IV derives these; the Blahut–Arimoto parallel is in [Cover & Thomas §10.8](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X).
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def _entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        def _mi_from_joint(joint, base=2):
            joint = np.asarray(joint, dtype=float)
            joint = joint / joint.sum()
            px = joint.sum(axis=1, keepdims=True)
            py = joint.sum(axis=0, keepdims=True)
            ind = px @ py
            m = joint > 0
            return float(np.sum(joint[m] * np.log(joint[m] / ind[m])) / np.log(base))

        def ib(pxy, beta, n_t, n_iter=500, seed=0, tol=1e-10):
            rng = np.random.default_rng(seed)
            pxy = np.asarray(pxy, dtype=float)
            pxy = pxy / pxy.sum()
            n_x, n_y = pxy.shape
            px = pxy.sum(axis=1)
            py_given_x = pxy / px[:, None]

            p_t_given_x = rng.random((n_x, n_t)) + 1e-3
            p_t_given_x /= p_t_given_x.sum(axis=1, keepdims=True)

            _prev = np.inf
            for _ in range(n_iter):
                p_t = px @ p_t_given_x
                p_t = np.maximum(p_t, 1e-12)
                p_xt = px[:, None] * p_t_given_x
                py_given_t = (p_xt.T @ py_given_x) / p_t[:, None]
                py_given_t = np.maximum(py_given_t, 1e-12)
                py_given_t /= py_given_t.sum(axis=1, keepdims=True)

                logr = py_given_x @ np.log(py_given_t.T)
                logpx_y = np.sum(py_given_x * np.log(py_given_x + (py_given_x == 0)), axis=1)
                kl = logpx_y[:, None] - logr

                logits = np.log(p_t)[None, :] - beta * kl
                logits -= logits.max(axis=1, keepdims=True)
                p_t_given_x = np.exp(logits)
                p_t_given_x /= p_t_given_x.sum(axis=1, keepdims=True)

                joint_xt = px[:, None] * p_t_given_x
                i_xt = _mi_from_joint(joint_xt)
                joint_ty = (joint_xt.T @ py_given_x)
                i_ty = _mi_from_joint(joint_ty)
                _L = i_xt - beta * i_ty
                if abs(_prev - _L) < tol:
                    break
                _prev = _L

            joint_xt = px[:, None] * p_t_given_x
            i_xt = _mi_from_joint(joint_xt)
            i_ty = _mi_from_joint((joint_xt.T @ py_given_x))
            return i_xt, i_ty, p_t_given_x

        _pxy = np.array([
            [0.30, 0.05],
            [0.05, 0.10],
            [0.02, 0.18],
            [0.18, 0.12],
        ])
        _pxy = _pxy / _pxy.sum()
        _ceiling = _mi_from_joint(_pxy)
        _hx = _entropy(_pxy.sum(axis=1))

        print("=== IB self-consistent iteration: limiting behavior in beta ===")
        print(f"  relevance ceiling  I(X;Y) = {_ceiling:.4f} bits")
        print(f"  input entropy      H(X)   = {_hx:.4f} bits")
        print()
        print(f"  {'beta':>8} {'I(X;T)':>10} {'I(T;Y)':>10}")
        for _b in [0.01, 0.5, 1.0, 2.0, 5.0, 20.0, 100.0]:
            _ixt, _ity, _ = ib(_pxy, _b, n_t=4)
            print(f"  {_b:>8.2f} {_ixt:>10.4f} {_ity:>10.4f}")
        print()
        print("  beta->0 : I(X;T)->0 and I(T;Y)->0   (trivial constant T)")
        print("  beta->inf: I(T;Y) -> I(X;Y)         (minimal sufficient statistic)")
        print("  I(T;Y) <= I(X;Y) always (data-processing inequality) -- verified above.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. The Information Curve (Interactive)

    Time to feel the trade-off in your hands. Below is a fixed toy joint $p(x,y)$ over 5 inputs and 3 relevance values. Drag $\beta$ and watch the solver place its operating point on the **information curve** — the full frontier traced by sweeping $\beta$ from $0$ to large.

    Three things to verify with your own eyes as you move the slider:

    - At **small $\beta$** you sit near the origin: heavy compression, little relevance.
    - As **$\beta$ grows** the point climbs the curve toward the ceiling $I(X;Y)$ (the dashed horizontal line).
    - The point always stays **below the diagonal** $I(T;Y) = I(X;T)$ (you cannot extract more relevant bits than total bits) and **below the ceiling**. The slope of the curve at your point *is* your current $\beta$.
    """)
    return


@app.cell
def _(mo):
    ib_beta = mo.ui.slider(start=0.1, stop=15.0, step=0.1, value=2.0, label="β (relevance pressure)")
    ib_beta
    return (ib_beta,)


@app.cell
def _(mo):
    ib_n_t = mo.ui.slider(start=2, stop=6, step=1, value=4, label="|T| (bottleneck size)")
    ib_n_t
    return (ib_n_t,)


@app.cell
def _(ib_beta, ib_n_t):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _mi(joint, base=2):
            joint = np.asarray(joint, dtype=float)
            joint = joint / joint.sum()
            px = joint.sum(axis=1, keepdims=True)
            py = joint.sum(axis=0, keepdims=True)
            ind = px @ py
            m = joint > 0
            return float(np.sum(joint[m] * np.log(joint[m] / ind[m])) / np.log(base))

        def _ib(pxy, beta, n_t, n_iter=400, seed=0):
            rng = np.random.default_rng(seed)
            pxy = pxy / pxy.sum()
            n_x, _ = pxy.shape
            px = pxy.sum(axis=1)
            pygx = pxy / px[:, None]
            ptgx = rng.random((n_x, n_t)) + 1e-3
            ptgx /= ptgx.sum(axis=1, keepdims=True)
            logpx_y = np.sum(pygx * np.log(pygx + (pygx == 0)), axis=1)
            for _ in range(n_iter):
                pt = np.maximum(px @ ptgx, 1e-12)
                pxt = px[:, None] * ptgx
                pygt = (pxt.T @ pygx) / pt[:, None]
                pygt = np.maximum(pygt, 1e-12)
                pygt /= pygt.sum(axis=1, keepdims=True)
                kl = logpx_y[:, None] - pygx @ np.log(pygt.T)
                logits = np.log(pt)[None, :] - beta * kl
                logits -= logits.max(axis=1, keepdims=True)
                ptgx = np.exp(logits)
                ptgx /= ptgx.sum(axis=1, keepdims=True)
            jxt = px[:, None] * ptgx
            return _mi(jxt), _mi(jxt.T @ pygx)

        _pxy = np.array([
            [0.20, 0.02, 0.02],
            [0.02, 0.16, 0.02],
            [0.02, 0.02, 0.14],
            [0.10, 0.04, 0.02],
            [0.02, 0.08, 0.04],
        ])
        _pxy = _pxy / _pxy.sum()
        _ceiling = _mi(_pxy)
        _hx = float(-np.sum((s := _pxy.sum(axis=1))[s > 0] * np.log2(s[s > 0])))

        _n_t = int(ib_n_t.value)
        _betas = np.concatenate([np.linspace(0.05, 3, 40), np.linspace(3.2, 15, 30)])
        _curve_x, _curve_y = [], []
        for _b in _betas:
            _ix, _iy = _ib(_pxy, _b, _n_t)
            _curve_x.append(_ix)
            _curve_y.append(_iy)

        _bx, _by = _ib(_pxy, float(ib_beta.value), _n_t)

        _fig, _ax = plt.subplots(figsize=(7, 4.6))
        _ax.plot(_curve_x, _curve_y, "-", color="steelblue", lw=2, label="information curve (sweep β)")
        _xmax = _hx
        _ax.plot([0, _xmax], [0, _xmax], "--", color="gray", alpha=0.6, label="diagonal I(T;Y)=I(X;T)")
        _ax.axhline(_ceiling, color="crimson", ls=":", lw=1.5, label=f"ceiling I(X;Y)={_ceiling:.3f}")
        _ax.scatter([_bx], [_by], color="red", s=110, zorder=5,
                    label=f"β={ib_beta.value:.1f}: ({_bx:.3f}, {_by:.3f})")
        _ax.set_xlabel("I(X;T)  — bits kept about input (rate)")
        _ax.set_ylabel("I(T;Y)  — relevant bits kept")
        _ax.set_title(f"Information curve   (|T|={_n_t})")
        _ax.set_xlim(-0.02, _xmax + 0.05)
        _ax.set_ylim(-0.02, _ceiling + 0.1)
        _ax.legend(loc="lower right", fontsize=8)
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Information Plane & Deep Learning

    Tishby and collaborators made a bold leap: what if a *trained neural network* is, layer by layer, walking along (or toward) the information curve? Treat the input as $X$, the label as $Y$, and each hidden layer's activations as a representation $T$. Plot every layer at every training epoch as a point in the **information plane** $\big(I(X;T),\, I(T;Y)\big)$ and watch it move.

    **Shwartz-Ziv & Tishby (2017)** reported a striking two-phase story for each layer's trajectory:

    1. **Fitting / drift phase (short).** Early in training, both $I(X;T)$ and $I(T;Y)$ *rise* — the layer rapidly soaks up information about both input and label as it learns to fit. The point moves up and to the right.
    2. **Compression / diffusion phase (long).** Then a slow phase: $I(T;Y)$ stays roughly flat (the layer keeps the label information) while $I(X;T)$ *falls* — the layer is *forgetting* irrelevant detail about $X$. The point drifts left. They argued this compression is where generalization comes from, driven by the noise in stochastic gradient descent, and that the layers settle near the IB optimal curve.

    It is a gorgeous narrative: SGD as an entropy-driven compressor, generalization as bottlenecking. The toy below mimics the qualitative shape — a fast rise followed by a leftward compression drift — so you can see what "two phases in the information plane" looks like as a trajectory.

    > [Shwartz-Ziv & Tishby (2017), *Opening the Black Box of DNNs via Information*](https://arxiv.org/abs/1703.00810) is the trajectory paper; [Tishby & Zaslavsky (2015), *Deep Learning and the IB Principle*](https://arxiv.org/abs/1503.02406) sets it up.
    """)
    return


@app.cell
def _(mo):
    plane_epoch = mo.ui.slider(start=0, stop=100, step=1, value=100, label="training epoch (scrub the trajectory)")
    plane_epoch
    return (plane_epoch,)


@app.cell
def _(plane_epoch):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _n_layers = 4
        _T = 100
        _t = np.linspace(0, 1, _T + 1)

        _rng = np.random.default_rng(1)
        _i_xy = 1.0
        _layer_traj = []
        for _l in range(_n_layers):
            _ceil = _i_xy * (1.0 - 0.12 * _l)
            _fit = _ceil * (1 - np.exp(-_t / 0.06))
            _ity = _fit
            _rise = (3.0 + 0.5 * _l) * (1 - np.exp(-_t / 0.05))
            _drift = (1.2 + 0.35 * _l) * (1 - np.exp(-(np.maximum(_t - 0.12, 0)) / 0.5))
            _ixt = _rise - _drift
            _ixt = np.clip(_ixt, 0.02, None)
            _layer_traj.append((_ixt, _ity))

        _e = int(plane_epoch.value)
        _cmap = plt.get_cmap("viridis")

        _fig, _ax = plt.subplots(figsize=(7, 4.8))
        for _l, (_ixt, _ity) in enumerate(_layer_traj):
            _col = _cmap(_l / max(1, _n_layers - 1))
            _ax.plot(_ixt[: _e + 1], _ity[: _e + 1], "-", color=_col, alpha=0.7, lw=1.6)
            _ax.scatter([_ixt[_e]], [_ity[_e]], color=_col, s=90, zorder=5,
                        edgecolor="k", linewidth=0.5, label=f"layer {_l + 1}")
        _ax.axhline(_i_xy, color="crimson", ls=":", lw=1.3, label="I(X;Y) ceiling")
        _ax.set_xlabel("I(X;T)  — info about input")
        _ax.set_ylabel("I(T;Y)  — info about label")
        _ax.set_title(f"Information-plane trajectory   (epoch {_e}/{_T})\n"
                      f"fast rise (fitting) → leftward drift (compression)")
        _ax.set_xlim(0, 4.5)
        _ax.set_ylim(0, _i_xy + 0.12)
        _ax.legend(loc="lower right", fontsize=8)
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.image(src="../animations/rendered/InformationPlane.gif")
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. The Caveat: Saxe et al.

    A principle this clean invites scrutiny — and **Saxe et al. (2018), *On the Information Bottleneck Theory of Deep Learning*** delivered a careful rebuttal that you must know if you cite this story. Their findings:

    1. **The compression phase is not universal — it is an artifact of the nonlinearity.** Networks with **double-sided saturating** nonlinearities (like $\tanh$) do compress, but networks with **ReLU** (which does not saturate on the positive side) often show *no* compression phase: $I(X;T)$ keeps rising or plateaus, yet they generalize fine. So compression is not necessary for generalization.

    2. **Measuring $I(X;T)$ for a deterministic, continuous network is treacherous.** For an invertible deterministic map, $I(X;T)$ is formally *infinite* (or equals $H(X)$ for discrete $X$) — it can never truly decrease. The apparent "compression" in the original plots came largely from **binning** the activations to estimate MI: as $\tanh$ units saturate, points pile into the same bins and the *estimator* reports a drop. Change the bin count and the curve changes. The effect can be a measurement artifact, not a property of the representation.

    3. **Compression and generalization are not tightly coupled.** They exhibited networks that compress without generalizing better and that generalize without compressing.

    The honest summary: **the IB is a beautiful, correct optimization principle for designing representations, and a genuinely useful objective to train against** (Section 7). Whether ordinary SGD *spontaneously* implements IB compression, and whether that compression *causes* generalization, remains contested and is sensitive to architecture and to how you estimate mutual information in high dimensions. Hold both ideas at once: the IB as a *design principle* is solid; the IB as a *descriptive theory of what SGD does* is debated.

    > [Saxe et al. (2018)](https://openreview.net/forum?id=ry_WPG-A-) is the rebuttal; read it alongside [Shwartz-Ziv & Tishby (2017)](https://arxiv.org/abs/1703.00810) and judge for yourself.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def _binned_mi_xt(activations, x_ids, n_bins, base=2):
            edges = np.linspace(activations.min() - 1e-9, activations.max() + 1e-9, n_bins + 1)
            t_ids = np.clip(np.digitize(activations, edges) - 1, 0, n_bins - 1)
            n = len(x_ids)
            n_x = x_ids.max() + 1
            joint = np.zeros((n_x, n_bins))
            for _xi, _ti in zip(x_ids, t_ids):
                joint[_xi, _ti] += 1
            joint /= n
            px = joint.sum(axis=1, keepdims=True)
            pt = joint.sum(axis=0, keepdims=True)
            ind = px @ pt
            m = joint > 0
            return float(np.sum(joint[m] * np.log(joint[m] / ind[m])) / np.log(base))

        _rng = np.random.default_rng(3)
        _n = 2000
        _x_ids = _rng.integers(0, 50, size=_n)
        _raw = _x_ids / 49.0 + 0.02 * _rng.standard_normal(_n)
        _tanh_act = np.tanh(6.0 * (_raw - 0.5))

        print("=== Why 'compression' can be a binning artifact (Saxe's point) ===")
        print("Same deterministic tanh layer; only the MI ESTIMATOR's bin count changes:")
        print(f"  {'n_bins':>8} {'estimated I(X;T)':>18}")
        for _nb in [4, 8, 16, 30, 60, 120, 256]:
            _est = _binned_mi_xt(_tanh_act, _x_ids, _nb)
            print(f"  {_nb:>8} {_est:>18.4f} bits")
        print()
        print("The layer never changed -- but coarse bins report far less information.")
        print("As tanh units saturate during training, activations crowd into fewer")
        print("effective bins, so the ESTIMATE drops. That is the 'compression' the")
        print("original plots showed; it is partly the measurement, not the map.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. The Deep Variational Information Bottleneck (VIB)

    The exact IB iteration in Section 3 needs the full joint $p(x,y)$ and a discrete, tabular $T$. That is hopeless for images or text. **Alemi et al. (2017), *Deep Variational Information Bottleneck*** made IB trainable with neural networks and SGD by doing to the IB exactly what the VAE does to the evidence — replacing the intractable terms with **variational bounds**.

    Set up a stochastic encoder $p_\theta(t \mid x)$ (a neural net outputting, say, a Gaussian over the latent $T$) and minimize $I(X;T) - \beta\,I(T;Y)$. Both MI terms are intractable, so bound each:

    - **Relevance, lower bound.** Introduce a variational decoder / classifier $q_\phi(y \mid t)$. Then

      $$I(T;Y) \;\ge\; \mathbb{E}_{p(x,y)}\,\mathbb{E}_{p_\theta(t\mid x)}\big[\log q_\phi(y \mid t)\big] + H(Y).$$

      Maximizing $I(T;Y)$ becomes **minimizing the cross-entropy** of a classifier that reads only the bottleneck code $t$ (the $H(Y)$ term is constant). This is exactly the prediction loss you already train.

    - **Rate, upper bound.** Introduce a variational marginal $r(t)$ (e.g. a unit Gaussian prior). Because KL is non-negative,

      $$I(X;T) \;\le\; \mathbb{E}_{p(x)}\big[\,D_{\mathrm{KL}}\!\big(p_\theta(t\mid x)\,\|\,r(t)\big)\big].$$

      This caps the rate by a KL-to-prior term — *identical in form to the VAE's KL regularizer*.

    Putting them together, you **minimize** the VIB loss

    $$\mathcal{L}_{\text{VIB}}(\theta,\phi) \;=\; \underbrace{\mathbb{E}_{p(x,y)}\,\mathbb{E}_{p_\theta(t\mid x)}\big[-\log q_\phi(y\mid t)\big]}_{\text{prediction (relevance)}} \;+\; \beta\,\underbrace{\mathbb{E}_{p(x)}\big[D_{\mathrm{KL}}(p_\theta(t\mid x)\,\|\,r(t))\big]}_{\text{rate (compression)}},$$

    trained end-to-end with the **reparameterization trick** (sample $t = \mu_\theta(x) + \sigma_\theta(x)\odot\epsilon$, $\epsilon\sim\mathcal N(0,I)$, so gradients flow). Notice the shape: this is the $\beta$-VAE objective (6E) with the reconstruction term swapped for a *supervised* prediction term. Alemi et al. showed VIB-trained classifiers are markedly **more robust to adversarial examples** and better calibrated — squeezing the bottleneck genuinely throws away the brittle, attackable detail.

    The numpy cell below builds a tiny self-contained VIB on a 2-class toy problem: a linear stochastic Gaussian encoder, a linear softmax classifier head, reparameterized sampling, and the analytic Gaussian-to-unit-Gaussian KL — trained by manual gradient descent. Watch the prediction loss and the rate (KL) both reported, and watch test accuracy as you would in any classifier.

    > [Alemi, Fischer, Dillon & Murphy (2017), *Deep Variational Information Bottleneck*](https://arxiv.org/abs/1612.00410); the variational-bound machinery mirrors the VAE ELBO of [MacKay Ch 33](https://www.inference.org.uk/itprnn/book.pdf).
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(0)

        def make_data(n):
            y = rng.integers(0, 2, size=n)
            centers = np.array([[-2.0, 0.0], [2.0, 0.0]])
            x = centers[y] + 0.9 * rng.standard_normal((n, 2))
            x = np.concatenate([x, 0.5 * rng.standard_normal((n, 6))], axis=1)
            return x, y

        x_tr, y_tr = make_data(800)
        x_te, y_te = make_data(800)
        d_in, d_z, n_cls = x_tr.shape[1], 2, 2

        W_mu = 0.1 * rng.standard_normal((d_in, d_z))
        b_mu = np.zeros(d_z)
        W_ls = 0.1 * rng.standard_normal((d_in, d_z))
        b_ls = np.zeros(d_z)
        W_cls = 0.1 * rng.standard_normal((d_z, n_cls))
        b_cls = np.zeros(n_cls)

        beta = 0.01
        lr = 0.05
        n_epochs = 400

        def softmax(z):
            z = z - z.max(axis=1, keepdims=True)
            e = np.exp(z)
            return e / e.sum(axis=1, keepdims=True)

        for _ep in range(n_epochs):
            mu = x_tr @ W_mu + b_mu
            logvar = x_tr @ W_ls + b_ls
            std = np.exp(0.5 * logvar)
            eps = rng.standard_normal(mu.shape)
            z = mu + std * eps

            logits = z @ W_cls + b_cls
            probs = softmax(logits)
            onehot = np.eye(n_cls)[y_tr]
            n = x_tr.shape[0]

            ce = -np.mean(np.sum(onehot * np.log(probs + 1e-12), axis=1))
            kl_per = 0.5 * np.sum(np.exp(logvar) + mu**2 - 1.0 - logvar, axis=1)
            kl = np.mean(kl_per)

            dlogits = (probs - onehot) / n
            gW_cls = z.T @ dlogits
            gb_cls = dlogits.sum(axis=0)
            dz = dlogits @ W_cls.T

            dmu_ce = dz
            dstd_ce = dz * eps
            dlogvar_ce = dstd_ce * 0.5 * std

            dmu_kl = (mu / n) * beta
            dlogvar_kl = (0.5 * (np.exp(logvar) - 1.0) / n) * beta

            dmu = dmu_ce + dmu_kl
            dlogvar = dlogvar_ce + dlogvar_kl

            gW_mu = x_tr.T @ dmu
            gb_mu = dmu.sum(axis=0)
            gW_ls = x_tr.T @ dlogvar
            gb_ls = dlogvar.sum(axis=0)

            W_cls -= lr * gW_cls
            b_cls -= lr * gb_cls
            W_mu -= lr * gW_mu
            b_mu -= lr * gb_mu
            W_ls -= lr * gW_ls
            b_ls -= lr * gb_ls

        mu_te = x_te @ W_mu + b_mu
        pred = softmax(mu_te @ W_cls + b_cls).argmax(axis=1)
        acc = float(np.mean(pred == y_te))

        print("=== A tiny VIB trained from scratch (pure numpy) ===")
        print(f"  input dim = {d_in} (2 signal + 6 noise),  bottleneck dim |T| = {d_z},  beta = {beta}")
        print(f"  final prediction loss (cross-entropy) = {ce:.4f}")
        print(f"  final rate  E[KL(p(t|x) || N(0,I))]   = {kl:.4f} nats  <- the squeezed bits")
        print(f"  VIB total objective  CE + beta*KL      = {ce + beta * kl:.4f}")
        print(f"  test accuracy (using the mean code mu) = {100 * acc:.1f}%")
        print()
        print("  The KL term is the rate I(X;T) upper bound; cross-entropy is the")
        print("  relevance I(T;Y) lower bound. Raising beta squeezes the code harder,")
        print("  dropping the 6 noise dimensions and keeping the 2 that predict y.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    The Information Bottleneck is not a side-show — it is one of the load-bearing ideas connecting information theory to modern representation learning:

    - **A definition of a good representation.** "Minimal and sufficient" — small $I(X;T)$, large $I(T;Y)$ — is arguably *the* information-theoretic statement of what a feature, embedding, or hidden layer should be. It formalizes the intuition that good features discard nuisance and keep signal.
    - **The unifying objective behind variational methods.** VIB (Section 7), the $\beta$-VAE and its rate-distortion view (6E), and contrastive objectives like InfoNCE (6D) are all *rate-vs-relevance* trade-offs with a $\beta$ knob. Recognize $I(X;T) - \beta\,I(T;Y)$ and you recognize half of self-supervised learning.
    - **Robustness and generalization, by design.** VIB classifiers are more adversarially robust and better calibrated precisely because the bottleneck deletes brittle, attackable detail. Whether SGD compresses *on its own* is debated (Saxe), but training *with* an explicit bottleneck term reliably helps.
    - **A bridge to rate-distortion (5A).** The IB *is* rate-distortion with a distortion that is learned — the emergent KL-in-prediction-space measure. This is the cleanest example in the course of one theory being a special case of another.
    - **The information plane as a diagnostic.** Even granting Saxe's caveats, plotting $\big(I(X;T), I(T;Y)\big)$ per layer is a genuinely useful lens for *thinking about* what each layer keeps and forgets — provided you remember how slippery high-dimensional MI estimation is, which is exactly the subject of **6D**.

    Next up, **Module 6D** confronts that estimation problem head-on: when $X$ and $T$ are high-dimensional and continuous, how do you actually *estimate* $I(X;T)$? We build neural MI estimators (MINE, InfoNCE, the DV/NWJ bounds), meet the $\log N$ ceiling, and see the pitfalls — the missing tool that the whole IB-for-deep-learning story quietly depends on.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These build the Information Bottleneck from its pieces, exactly as the lecture did.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Mutual Information from a Joint

    Implement `mutual_information(joint)` in bits, taking a 2-D array $p(x,y)$ (it need not be normalized — normalize it first). Use $I(X;Y) = \sum_{x,y} p(x,y)\log_2\frac{p(x,y)}{p(x)p(y)}$ and skip zero entries. This is the workhorse for every later exercise.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def mutual_information(joint, base=2):
            joint = np.asarray(joint, dtype=float)
            joint = joint / joint.sum()
            # TODO: marginals px (sum over y, keepdims), py (sum over x, keepdims)
            px = ...
            py = ...
            # TODO: independent product px @ py, then sum p*log(p/ind) over nonzero entries
            _result = ...
            return _result

        # _j = np.array([[0.30, 0.05], [0.05, 0.10], [0.02, 0.18], [0.18, 0.12]])
        # print(mutual_information(_j))   # expect ~0.21 bits

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: The Relevance Ceiling

    Confirm the data-processing bound. For the toy joint below, compute $I(X;Y)$ — the *most* any representation $T$ built from $X$ alone can ever tell you about $Y$. Then form a degraded representation by *merging inputs 0 and 1 into one symbol* (a deterministic $X\to T$ map) and verify $I(T;Y) \le I(X;Y)$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def mutual_information(joint, base=2):
            joint = np.asarray(joint, dtype=float)
            joint = joint / joint.sum()
            px = joint.sum(axis=1, keepdims=True)
            py = joint.sum(axis=0, keepdims=True)
            ind = px @ py
            m = joint > 0
            return float(np.sum(joint[m] * np.log(joint[m] / ind[m])) / np.log(base))

        pxy = np.array([[0.20, 0.05], [0.05, 0.15], [0.10, 0.20], [0.15, 0.10]])
        pxy = pxy / pxy.sum()

        i_xy = mutual_information(pxy)

        # TODO: build p(t,y) by summing rows 0 and 1 of pxy into one row (rows 2,3 unchanged)
        # hint: np.vstack([pxy[0] + pxy[1], pxy[2], pxy[3]])
        pty = ...
        i_ty = ...

        # print(f"I(X;Y)={i_xy:.4f}, I(T;Y)={i_ty:.4f}, DPI holds: {i_ty <= i_xy + 1e-12}")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: One IB Update Step

    Implement a single sweep of the self-consistent equations. Given current encoder `p_t_given_x` (shape $n_x \times n_t$), the input marginal `px`, and `py_given_x`: (A) compute $p(t)$ and $p(y\mid t)$, (B) form $\mathrm{KL}[p(y\mid x)\,\|\,p(y\mid t)]$ for every $(x,t)$, then (C) return the new softmax encoder $p(t\mid x) \propto p(t)\exp(-\beta\,\mathrm{KL})$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def ib_step(p_t_given_x, px, py_given_x, beta):
            # TODO (A): p_t = px @ p_t_given_x ; p_xt = px[:,None]*p_t_given_x
            p_t = ...
            p_xt = ...
            # TODO: py_given_t = (p_xt.T @ py_given_x) / p_t[:,None]  (then renormalize rows)
            py_given_t = ...

            # TODO (B): kl[x,t] = sum_y py_given_x[x,y]*log(py_given_x[x,y]/py_given_t[t,y])
            # hint: logpx_y = sum_y p log p (per x); kl = logpx_y[:,None] - py_given_x @ log(py_given_t.T)
            kl = ...

            # TODO (C): logits = log(p_t)[None,:] - beta*kl ; softmax over t (subtract row max first)
            new = ...
            return new

        # _px = np.array([0.4, 0.3, 0.3])
        # _pygx = np.array([[0.9, 0.1], [0.5, 0.5], [0.2, 0.8]])
        # _enc = np.full((3, 2), 0.5)
        # for _ in range(50): _enc = ib_step(_enc, _px, _pygx, beta=5.0)
        # print(np.round(_enc, 3))   # rows should sharpen toward distinct clusters

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Trace the Information Curve

    Use your `ib_step` (or the full solver) to sweep $\beta$ over a range and collect $\big(I(X;T), I(T;Y)\big)$ at each value. You should find the points trace a concave, monotone curve from the origin (small $\beta$) up toward the ceiling $I(X;Y)$ (large $\beta$). Confirm every point obeys $I(T;Y) \le I(X;T)$ and $I(T;Y) \le I(X;Y)$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def mutual_information(joint, base=2):
            joint = np.asarray(joint, dtype=float)
            joint = joint / joint.sum()
            px = joint.sum(axis=1, keepdims=True)
            py = joint.sum(axis=0, keepdims=True)
            ind = px @ py
            m = joint > 0
            return float(np.sum(joint[m] * np.log(joint[m] / ind[m])) / np.log(base))

        rng = np.random.default_rng(0)
        pxy = np.array([[0.25, 0.02, 0.02], [0.02, 0.20, 0.02],
                        [0.02, 0.02, 0.18], [0.08, 0.05, 0.10]])
        pxy = pxy / pxy.sum()
        px = pxy.sum(axis=1)
        pygx = pxy / px[:, None]
        n_x, n_t = pxy.shape[0], 4

        def solve(beta, n_iter=300):
            enc = rng.random((n_x, n_t)) + 1e-3
            enc /= enc.sum(axis=1, keepdims=True)
            logpx_y = np.sum(pygx * np.log(pygx + (pygx == 0)), axis=1)
            for _ in range(n_iter):
                pt = np.maximum(px @ enc, 1e-12)
                pxt = px[:, None] * enc
                pygt = (pxt.T @ pygx) / pt[:, None]
                pygt = np.maximum(pygt, 1e-12)
                pygt /= pygt.sum(axis=1, keepdims=True)
                kl = logpx_y[:, None] - pygx @ np.log(pygt.T)
                logits = np.log(pt)[None, :] - beta * kl
                logits -= logits.max(axis=1, keepdims=True)
                enc = np.exp(logits)
                enc /= enc.sum(axis=1, keepdims=True)
            jxt = px[:, None] * enc
            return mutual_information(jxt), mutual_information(jxt.T @ pygx)

        # TODO: sweep betas (e.g. np.linspace(0.1, 12, 20)) and collect (I(X;T), I(T;Y))
        # hint: curve = [solve(b) for b in betas]
        betas = ...
        curve = ...

        # for b,(ix,iy) in zip(betas, curve):
        #     print(f"beta={b:5.2f}  I(X;T)={ix:.3f}  I(T;Y)={iy:.3f}")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: The Binning Artifact (Saxe's Point)

    Reproduce the core of Saxe et al.'s estimator critique. Take a *fixed* deterministic $\tanh$ "layer" mapping $50$ distinct inputs to scalar activations, then estimate $I(X;T)$ by binning the activations into `n_bins` cells. Show that the *same* layer reports very different $I(X;T)$ as you change `n_bins` — so an apparent "compression" can be an artifact of the estimator, not a change in the map.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(3)
        n = 2000
        x_ids = rng.integers(0, 50, size=n)
        raw = x_ids / 49.0 + 0.02 * rng.standard_normal(n)
        act = np.tanh(6.0 * (raw - 0.5))

        def binned_mi(activations, x_ids, n_bins, base=2):
            edges = np.linspace(activations.min() - 1e-9, activations.max() + 1e-9, n_bins + 1)
            t_ids = np.clip(np.digitize(activations, edges) - 1, 0, n_bins - 1)
            n_x = x_ids.max() + 1
            # TODO: build the n_x by n_bins joint count matrix, normalize to a probability
            joint = ...
            # TODO: return mutual information of `joint` in bits
            return ...

        # for nb in [4, 8, 16, 32, 64, 128, 256]:
        #     print(f"n_bins={nb:4d}  I_hat(X;T)={binned_mi(act, x_ids, nb):.4f} bits")
        # Same layer, wildly different estimates -> 'compression' can be a measurement artifact.

    _run()
    return


if __name__ == "__main__":
    app.run()
