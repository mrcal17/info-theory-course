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
    # 1B: Relative Entropy & Mutual Information

    > *"The KL divergence is the most fundamental quantity in information theory; entropy is just a special case."*
    > — folklore, and very nearly true

    In 1A you built **entropy** — the average surprise of a single random variable. That answered "how uncertain am I?" But two questions immediately press in. First: I have a *wrong* model $q$ of reality $p$ — how much does my wrongness cost me? Second: I observe one variable $Y$ — how much does it tell me about another variable $X$?

    Both questions have the same answer, and it is the quantity this module is built around: **relative entropy**, also called the **Kullback–Leibler divergence**, $D(p \,\|\, q)$. It measures the gap between two distributions in *bits*. Mutual information — the amount one variable reveals about another — turns out to be nothing more than a KL divergence in disguise. So is the cross-entropy loss you train every classifier with. Get KL right and an enormous amount of machine learning suddenly reads as one idea.

    We will define KL, prove it is never negative (Gibbs' inequality, via Jensen's inequality), watch it be brutally **asymmetric**, decompose cross-entropy as $H + D$, build **mutual information** three equivalent ways, draw the **I-diagram** that makes it all visual, and finish with the **data-processing inequality** — the theorem that says you cannot create information by post-processing. By the end, KL will feel like the natural ruler for "distance between beliefs."
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Relative Entropy: The Cost of a Wrong Model

    Suppose the world really draws symbols from a distribution $p$, but you — not knowing better — believe it is $q$. You build a code optimized for $q$ (in 1A and 2A we learn the optimal codelength for symbol $x$ under belief $q$ is $\log_2 \tfrac{1}{q(x)}$ bits). How many *extra* bits per symbol do you pay for your mistake?

    Under $q$ you spend $\sum_x p(x)\log_2\tfrac{1}{q(x)}$ bits on average (the **cross-entropy**, Section 3). If you had known the truth $p$ you would have spent only $H(p) = \sum_x p(x)\log_2\tfrac{1}{p(x)}$. The difference is the penalty:

    $$D(p \,\|\, q) \;=\; \sum_x p(x)\,\log_2 \frac{p(x)}{q(x)} \;=\; \mathbb{E}_{x\sim p}\!\left[\log_2 \frac{p(x)}{q(x)}\right]$$

    This is the **relative entropy** or **KL divergence** of $p$ from $q$. Read it as: *the average number of extra bits you waste by coding for $q$ when the truth is $p$.*

    **Conventions.** $0\log\tfrac{0}{q} = 0$, and $p\log\tfrac{p}{0} = +\infty$ — if $p$ puts mass somewhere $q$ calls impossible, the divergence blows up. (Your model swore an event could never happen, and then it happened.)

    **Worked example.** True coin $p = (0.5, 0.5)$, your model $q = (0.25, 0.75)$:

    $$D(p\|q) = 0.5\log_2\frac{0.5}{0.25} + 0.5\log_2\frac{0.5}{0.75} = 0.5(1) + 0.5(-0.585) \approx 0.2075 \text{ bits.}$$

    You waste about a fifth of a bit per flip for believing a fair coin is biased.

    > [Cover & Thomas Ch 2.3](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) defines relative entropy; [MacKay Ch 2 & 8](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) and [Stone Ch 2](file:///C:/Users/landa/info-theory-course/textbooks/Stone.pdf) give the intuition.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def kl(p, q, base=2):
            p = np.asarray(p, dtype=float)
            q = np.asarray(q, dtype=float)
            _m = p > 0
            return float(np.sum(p[_m] * (np.log(p[_m]) - np.log(q[_m])) / np.log(base)))

        _p = np.array([0.5, 0.5])
        _q = np.array([0.25, 0.75])
        print("=== KL divergence D(p||q), in bits ===")
        print(f"  p = {_p}   (the truth)")
        print(f"  q = {_q}   (your model)")
        print(f"  D(p||q) = {kl(_p, _q):.4f} bits   (extra bits wasted per symbol)")
        print(f"  D(q||p) = {kl(_q, _p):.4f} bits   (NOT the same -- KL is asymmetric)")
        print(f"  D(p||p) = {kl(_p, _p):.4f} bits   (zero -- no cost for a correct model)")

        print("\n=== A worse model costs more ===")
        for _qq in ([0.5, 0.5], [0.4, 0.6], [0.25, 0.75], [0.1, 0.9], [0.01, 0.99]):
            print(f"  q={np.array(_qq)}   D(p||q) = {kl(_p, _qq):.4f} bits")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Gibbs' Inequality: KL Is Never Negative (via Jensen)

    The single most-used fact about KL is that it cannot be negative:

    $$D(p \,\|\, q) \;\ge\; 0, \qquad \text{with equality iff } p = q.$$

    This is **Gibbs' inequality**, and it is the engine behind almost every bound in the course. The cleanest proof uses **Jensen's inequality**, which is worth stating on its own because it recurs everywhere.

    **Jensen's inequality.** For a *convex* function $\varphi$ and any random variable $Z$,
    $$\mathbb{E}[\varphi(Z)] \;\ge\; \varphi(\mathbb{E}[Z]).$$
    For a *concave* function the inequality flips. Geometrically: the average of points on a convex curve sits above the curve evaluated at the average. (The function $-\log$ is convex; $\log$ is concave — this is the hinge of the whole subject.)

    **Proof that $D(p\|q)\ge 0$.** Write $-D(p\|q) = \sum_x p(x)\log_2\frac{q(x)}{p(x)} = \mathbb{E}_{x\sim p}\!\left[\log_2 \frac{q(x)}{p(x)}\right]$. Since $\log_2$ is concave, Jensen gives

    $$\mathbb{E}_{p}\!\left[\log_2 \tfrac{q}{p}\right] \;\le\; \log_2 \mathbb{E}_{p}\!\left[\tfrac{q}{p}\right] = \log_2 \sum_x p(x)\frac{q(x)}{p(x)} = \log_2 \sum_x q(x) = \log_2 1 = 0.$$

    So $-D(p\|q) \le 0$, i.e. $D(p\|q) \ge 0$. Equality holds exactly when $q/p$ is constant — that is, when $p = q$. **A correct model wastes zero bits; any wrong model wastes a positive number.** That is the entire content of Gibbs' inequality, and it is why minimizing KL is a sensible thing to do.

    > [Cover & Thomas Ch 2.6](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) proves Jensen and Gibbs together; [MacKay Ch 2.6](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) gives the convexity picture.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def kl(p, q, base=2):
            p = np.asarray(p, dtype=float)
            q = np.asarray(q, dtype=float)
            _m = p > 0
            return float(np.sum(p[_m] * (np.log(p[_m]) - np.log(q[_m])) / np.log(base)))

        _rng = np.random.default_rng(0)
        _n = 5
        _min_seen = np.inf
        _neg_count = 0
        for _ in range(200_000):
            _p = _rng.random(_n); _p /= _p.sum()
            _q = _rng.random(_n); _q /= _q.sum()
            _d = kl(_p, _q)
            _min_seen = min(_min_seen, _d)
            if _d < -1e-12:
                _neg_count += 1
        print("=== Gibbs' inequality, checked over 200,000 random (p, q) pairs ===")
        print(f"  smallest D(p||q) seen : {_min_seen:.3e} bits  (>= 0, as promised)")
        print(f"  times D(p||q) < 0     : {_neg_count}")
        _r = _rng.random(_n); _r /= _r.sum()
        print(f"  D(r||r) for a random r: {kl(_r, _r):.3e} bits  (exactly zero only when p == q)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Cross-Entropy = Entropy + KL

    The **cross-entropy** of $p$ relative to $q$ is the average codelength you pay using a code built for $q$ when the data really comes from $p$:

    $$H(p, q) \;=\; -\sum_x p(x)\,\log_2 q(x) \;=\; \mathbb{E}_{x\sim p}\!\left[\log_2 \tfrac{1}{q(x)}\right].$$

    Now do one line of algebra. Add and subtract $\log_2 p(x)$ inside:

    $$H(p, q) = -\sum_x p(x)\log_2 q(x) = -\sum_x p(x)\log_2 p(x) + \sum_x p(x)\log_2 \frac{p(x)}{q(x)}$$

    which is exactly

    $$\boxed{\,H(p, q) \;=\; H(p) \;+\; D(p \,\|\, q)\,}$$

    This little identity is one of the most important in machine learning. The **cross-entropy loss** you minimize when training a classifier is $H(p, q)$, where $p$ is the (one-hot) true label distribution and $q$ is your model's softmax output. Since $H(p)$ does not depend on your model's parameters, **minimizing cross-entropy is exactly minimizing the KL divergence** $D(p\|q)$ between truth and prediction — i.e. making your model's beliefs as close as possible to reality. And because $D \ge 0$ (Gibbs), cross-entropy bottoms out at $H(p)$: the label entropy is the irreducible floor of the loss. You can never train below it.

    > [MacKay Ch 2](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) and [Cover & Thomas Ch 2.3](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf); we return to this in depth in Module 6A.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float); p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        def kl(p, q, base=2):
            p = np.asarray(p, dtype=float); q = np.asarray(q, dtype=float)
            _m = p > 0
            return float(np.sum(p[_m] * (np.log(p[_m]) - np.log(q[_m])) / np.log(base)))

        def cross_entropy(p, q, base=2):
            p = np.asarray(p, dtype=float); q = np.asarray(q, dtype=float)
            _m = p > 0
            return float(-np.sum(p[_m] * np.log(q[_m])) / np.log(base))

        _p = np.array([0.7, 0.2, 0.1])
        _q = np.array([0.5, 0.3, 0.2])
        _H = entropy(_p)
        _D = kl(_p, _q)
        _CE = cross_entropy(_p, _q)
        print("=== Cross-entropy decomposition  H(p,q) = H(p) + D(p||q) ===")
        print(f"  p (truth)       = {_p}")
        print(f"  q (model)       = {_q}")
        print(f"  H(p)            = {_H:.4f} bits   (the irreducible floor)")
        print(f"  D(p||q)         = {_D:.4f} bits   (the avoidable penalty)")
        print(f"  H(p) + D(p||q)  = {_H + _D:.4f} bits")
        print(f"  H(p,q) direct   = {_CE:.4f} bits   <- matches the sum exactly")
        print(f"\n  Perfect model q = p:  H(p,p) = {cross_entropy(_p, _p):.4f}  ==  H(p) = {_H:.4f}")
        print("  Cross-entropy loss can never beat the label entropy H(p).")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. KL Is Asymmetric — Explore It

    Here is the property that trips everyone up at first and matters enormously in ML: **KL divergence is not a distance.** In general

    $$D(p \,\|\, q) \;\ne\; D(q \,\|\, p).$$

    It does not satisfy symmetry and it does not satisfy the triangle inequality. The order of the arguments encodes *which direction you are paying for*: $D(p\|q)$ is "truth $p$, code $q$"; $D(q\|p)$ is "truth $q$, code $p$." These are different worlds.

    The asymmetry has teeth in machine learning. Minimizing $D(p\|q)$ over $q$ (the cross-entropy / maximum-likelihood direction) is **mean-seeking** / *zero-avoiding*: $q$ is punished hard wherever $p$ has mass but $q$ does not, so $q$ spreads to cover all of $p$. Minimizing $D(q\|p)$ over $q$ (the variational-inference direction, as in VAEs) is **mode-seeking** / *zero-forcing*: $q$ is punished where it has mass but $p$ does not, so $q$ collapses onto a single mode. Same two distributions, opposite behavior — purely from the order.

    Drag the sliders to set two categorical distributions $P$ and $Q$ over three symbols and watch $D(P\|Q)$ and $D(Q\|P)$ diverge.
    """)
    return


@app.cell
def _(mo):
    p0 = mo.ui.slider(start=0.02, stop=0.96, step=0.02, value=0.6, label="P(A)")
    p1 = mo.ui.slider(start=0.02, stop=0.96, step=0.02, value=0.3, label="P(B)  [P(C) is the remainder]")
    q0 = mo.ui.slider(start=0.02, stop=0.96, step=0.02, value=0.2, label="Q(A)")
    q1 = mo.ui.slider(start=0.02, stop=0.96, step=0.02, value=0.2, label="Q(B)  [Q(C) is the remainder]")
    mo.vstack([mo.md("**Distribution P**"), p0, p1, mo.md("**Distribution Q**"), q0, q1])
    return p0, p1, q0, q1


@app.cell
def _(p0, p1, q0, q1):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _normalize_two(a, b):
            _c = max(1e-6, 1.0 - a - b)
            _v = np.array([a, b, _c], dtype=float)
            return _v / _v.sum()

        def kl(p, q, base=2):
            _m = p > 0
            return float(np.sum(p[_m] * (np.log(p[_m]) - np.log(q[_m])) / np.log(base)))

        _P = _normalize_two(p0.value, p1.value)
        _Q = _normalize_two(q0.value, q1.value)
        _dpq = kl(_P, _Q)
        _dqp = kl(_Q, _P)

        _fig, (_axL, _axR) = plt.subplots(1, 2, figsize=(10, 4))
        _x = np.arange(3)
        _w = 0.38
        _axL.bar(_x - _w / 2, _P, _w, label="P", color="steelblue")
        _axL.bar(_x + _w / 2, _Q, _w, label="Q", color="indianred")
        _axL.set_xticks(_x); _axL.set_xticklabels(["A", "B", "C"])
        _axL.set_ylabel("probability"); _axL.set_ylim(0, 1)
        _axL.set_title("Two categorical distributions")
        _axL.legend(); _axL.grid(True, axis="y", alpha=0.3)

        _axR.bar([0, 1], [_dpq, _dqp], color=["steelblue", "indianred"])
        _axR.set_xticks([0, 1]); _axR.set_xticklabels(["D(P||Q)", "D(Q||P)"])
        _axR.set_ylabel("bits")
        _axR.set_title(f"Asymmetry: D(P||Q)={_dpq:.3f}  vs  D(Q||P)={_dqp:.3f}")
        for _i, _v in enumerate([_dpq, _dqp]):
            _axR.text(_i, _v + 0.01 * max(_dpq, _dqp, 1e-3), f"{_v:.3f}",
                      ha="center", va="bottom")
        _axR.grid(True, axis="y", alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Mutual Information: How Much $Y$ Tells You About $X$

    Now the second big question. Two random variables $X, Y$ have a joint distribution $p(x, y)$. How much does observing one reduce your uncertainty about the other? The answer is the **mutual information**

    $$I(X; Y) \;=\; \sum_{x, y} p(x, y)\,\log_2 \frac{p(x, y)}{p(x)\,p(y)} \;=\; D\big(p(x,y)\,\big\|\,p(x)\,p(y)\big).$$

    Stare at the right-hand side: **mutual information is the KL divergence between the true joint and the product of the marginals** — i.e. between "how $X$ and $Y$ actually behave together" and "how they would behave if they were independent." If $X \perp Y$ then $p(x,y) = p(x)p(y)$ and the KL is zero: independent variables share no information. The more dependent they are, the larger $I(X;Y)$. By Gibbs' inequality, $I(X;Y) \ge 0$ **always** — observing $Y$ can never, on average, increase your uncertainty about $X$.

    Three equivalent forms, all worth memorizing:

    $$I(X; Y) = H(X) - H(X \mid Y) = H(Y) - H(Y \mid X) = H(X) + H(Y) - H(X, Y).$$

    The first reads: *mutual information is the drop in uncertainty about $X$ once you learn $Y$.* This is exactly the **information gain** that decision trees maximize at each split. And it finally proves the claim from 1A that "information never hurts": since $I(X;Y) \ge 0$, we get $H(X\mid Y) \le H(X)$ — conditioning never increases entropy *on average*.

    > [Cover & Thomas Ch 2.4](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) is the canonical treatment; [MacKay Ch 8](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) and [Stone Ch 2](file:///C:/Users/landa/info-theory-course/textbooks/Stone.pdf) give the picture.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float); p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        _joint = np.array([
            [1 / 8, 1 / 16, 1 / 16, 1 / 4],
            [1 / 16, 1 / 8, 1 / 16, 0],
            [1 / 32, 1 / 32, 1 / 16, 0],
            [1 / 32, 1 / 32, 1 / 16, 0],
        ])
        _px = _joint.sum(axis=1)
        _py = _joint.sum(axis=0)

        _H_X = entropy(_px)
        _H_Y = entropy(_py)
        _H_XY = entropy(_joint.ravel())

        _indep = np.outer(_px, _py)
        _m = _joint > 0
        _I_kl = float(np.sum(_joint[_m] * np.log2(_joint[_m] / _indep[_m])))
        _I_sub = _H_X + _H_Y - _H_XY

        print("=== Mutual information, three ways (must all agree) ===")
        print(f"  H(X)            = {_H_X:.4f} bits")
        print(f"  H(Y)            = {_H_Y:.4f} bits")
        print(f"  H(X,Y)          = {_H_XY:.4f} bits")
        print(f"  I = H(X)+H(Y)-H(X,Y)        = {_I_sub:.4f} bits")
        print(f"  I = D(p(x,y) || p(x)p(y))   = {_I_kl:.4f} bits   <- KL form, agrees")
        print(f"  I = H(X) - H(X|Y)           = {_H_X - (_H_XY - _H_Y):.4f} bits   <- agrees")
        print(f"\n  Information never hurts: H(X|Y) = {_H_XY - _H_Y:.4f} <= H(X) = {_H_X:.4f}")

        _ip = np.array([0.5, 0.5]); _jp = np.outer(_ip, _ip)
        _mm = _jp > 0
        _I_indep = float(np.sum(_jp[_mm] * np.log2(_jp[_mm] / np.outer(_ip, _ip)[_mm])))
        print(f"  Independent X,Y: I(X;Y) = {_I_indep:.4f} bits  (exactly zero)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. The I-Diagram: Information as Overlap

    The three equivalent forms of $I(X;Y)$ all fall out of one picture. Imagine the uncertainty in $X$ as a set of area $H(X)$, and the uncertainty in $Y$ as a set of area $H(Y)$. Then:

    - their **union** has area $H(X, Y)$ — the total joint uncertainty,
    - the part of $X$ *not* covered by $Y$ is $H(X \mid Y)$,
    - the part of $Y$ *not* covered by $X$ is $H(Y \mid X)$,
    - and their **overlap** is the mutual information $I(X; Y)$.

    This is the **I-diagram** (an information Venn diagram), and it makes the identities self-evident: overlap $=$ size of $X$ plus size of $Y$ minus the union, i.e. $I = H(X) + H(Y) - H(X,Y)$; overlap $=$ size of $X$ minus the $X$-only part, i.e. $I = H(X) - H(X\mid Y)$. Everything in this module is a statement about areas in this picture.

    One honest caveat for later (Module 5C / Yeung): the analogy is exact for *two* variables, but for three or more the "triple overlap" $I(X;Y;Z)$ can be **negative**, so the I-measure is a *signed* measure, not a genuine area. For two variables, though, the Venn picture is rock-solid.

    The widget below builds a $2\times 2$ joint distribution for two binary variables, controlled by a single **correlation** knob $\rho$, and shows the resulting joint heatmap together with $I(X;Y)$ and the full I-diagram decomposition. Slide $\rho$ from $0$ (independent, $I=0$) toward $\pm 1$ (perfectly coupled, $I \to 1$ bit).
    """)
    return


@app.cell
def _(mo):
    rho = mo.ui.slider(start=-0.98, stop=0.98, step=0.02, value=0.6,
                       label="correlation rho between two fair bits X, Y")
    rho
    return (rho,)


@app.cell
def _(rho):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _r = rho.value
        _joint = 0.25 * np.array([
            [1 + _r, 1 - _r],
            [1 - _r, 1 + _r],
        ])
        _joint = np.clip(_joint, 1e-12, None)
        _joint = _joint / _joint.sum()

        _px = _joint.sum(axis=1)
        _py = _joint.sum(axis=0)

        def _H(v):
            v = v[v > 0]
            return float(-np.sum(v * np.log2(v)))

        _H_X = _H(_px)
        _H_Y = _H(_py)
        _H_XY = _H(_joint.ravel())
        _I = _H_X + _H_Y - _H_XY
        _H_X_g_Y = _H_XY - _H_Y
        _H_Y_g_X = _H_XY - _H_X

        _fig, (_axH, _axV) = plt.subplots(1, 2, figsize=(11, 4.2))

        _im = _axH.imshow(_joint, cmap="viridis", vmin=0, vmax=0.5)
        _axH.set_xticks([0, 1]); _axH.set_xticklabels(["Y=0", "Y=1"])
        _axH.set_yticks([0, 1]); _axH.set_yticklabels(["X=0", "X=1"])
        for _i in range(2):
            for _j in range(2):
                _axH.text(_j, _i, f"{_joint[_i, _j]:.3f}", ha="center", va="center",
                          color="white" if _joint[_i, _j] < 0.3 else "black", fontsize=11)
        _axH.set_title(f"Joint p(x,y),  rho = {_r:+.2f}")
        _fig.colorbar(_im, ax=_axH, fraction=0.046, pad=0.04)

        _left = _H_X_g_Y
        _mid = _I
        _right = _H_Y_g_X
        _axV.barh([0], [_left], color="steelblue", label="H(X|Y)")
        _axV.barh([0], [_mid], left=[_left], color="mediumpurple", label="I(X;Y)")
        _axV.barh([0], [_right], left=[_left + _mid], color="indianred", label="H(Y|X)")
        _axV.set_xlim(0, 2.05)
        _axV.set_yticks([])
        _axV.set_xlabel("bits")
        _axV.set_title(f"I-diagram:  I(X;Y) = {_I:.3f} bits  (of H(X,Y) = {_H_XY:.3f})")
        _axV.legend(loc="upper right")
        _axV.text(_left / 2, 0, f"{_left:.2f}", ha="center", va="center", color="white")
        if _mid > 0.06:
            _axV.text(_left + _mid / 2, 0, f"{_mid:.2f}", ha="center", va="center", color="white")
        _axV.text(_left + _mid + _right / 2, 0, f"{_right:.2f}", ha="center", va="center", color="white")
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.image(src="../animations/rendered/MutualInfoDiagram.gif")
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. The Data-Processing Inequality

    Here is a theorem with a slogan you should tattoo somewhere: **you cannot create information by processing.** Formally, if $X \to Y \to Z$ form a **Markov chain** (meaning $Z$ depends on $X$ *only through* $Y$ — once you know $Y$, $X$ tells you nothing more about $Z$), then

    $$I(X; Z) \;\le\; I(X; Y).$$

    No function or randomized transformation $g$ applied to $Y$ can extract more information about $X$ than $Y$ already contained. You can only lose (or, in the best case, preserve) information by post-processing. This is the **data-processing inequality (DPI)**.

    *Proof sketch.* Expand $I(X; Y, Z)$ two ways with the chain rule: $I(X; Y, Z) = I(X; Y) + I(X; Z \mid Y) = I(X; Z) + I(X; Y \mid Z)$. The Markov property forces $I(X; Z \mid Y) = 0$ (given $Y$, $X$ and $Z$ are independent). Since the other conditional MI term $I(X; Y \mid Z) \ge 0$, we get $I(X; Y) \ge I(X; Z)$. $\blacksquare$

    Why this matters: it is the backbone of **converse theorems** (why you *can't* beat channel capacity, Module 3B), it underlies the **information bottleneck** (Module 6C: a representation $T = g(X)$ can never have more information about a label $Y$ than $X$ itself), and it formalizes why feature engineering, quantization, or any deterministic layer can only *throw away* information about the target — the network's job is to throw away the *right* information.

    The demo below builds an explicit Markov chain $X \to Y \to Z$ ($Y$ is $X$ sent through a noisy binary channel, $Z$ is $Y$ sent through another) and verifies $I(X;Z) \le I(X;Y)$ numerically.

    > [Cover & Thomas Ch 2.8](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) states and proves the DPI; [MacKay Ch 8](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) discusses it for channels.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def mutual_information(joint):
            joint = np.asarray(joint, dtype=float)
            _px = joint.sum(axis=1, keepdims=True)
            _py = joint.sum(axis=0, keepdims=True)
            _ind = _px @ _py
            _m = joint > 0
            return float(np.sum(joint[_m] * np.log2(joint[_m] / _ind[_m])))

        def _bsc(flip):
            return np.array([[1 - flip, flip], [flip, 1 - flip]])

        _px = np.array([0.5, 0.5])
        _e1, _e2 = 0.1, 0.2

        _C1 = _bsc(_e1)
        _joint_XY = _px[:, None] * _C1
        _I_XY = mutual_information(_joint_XY)

        _py = _joint_XY.sum(axis=0)
        _C2 = _bsc(_e2)
        _PZgY = _C2
        _joint_XZ = np.zeros((2, 2))
        for _x in range(2):
            for _z in range(2):
                _joint_XZ[_x, _z] = sum(
                    _joint_XY[_x, _y] * _PZgY[_y, _z] for _y in range(2)
                )
        _I_XZ = mutual_information(_joint_XZ)

        print("=== Data-processing inequality:  X -> Y -> Z ===")
        print(f"  X uniform bit; Y = X through BSC(flip={_e1}); Z = Y through BSC(flip={_e2})")
        print(f"  I(X;Y) = {_I_XY:.4f} bits")
        print(f"  I(X;Z) = {_I_XZ:.4f} bits")
        print(f"  DPI holds (I(X;Z) <= I(X;Y))? {_I_XZ <= _I_XY + 1e-12}")
        print("\n  Cascading another noisy channel can only DESTROY information about X.")

        print("\n  Effective end-to-end flip prob:", round(_e1 * (1 - _e2) + (1 - _e1) * _e2, 4))

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    Relative entropy and mutual information are not classical curiosities — they are the load-bearing beams of modern ML:

    - **Every classifier you train.** Cross-entropy loss is $H(p, q) = H(p) + D(p\|q)$. Training minimizes the KL between true labels and predictions; the label entropy $H(p)$ is the loss floor (Section 3). **Label smoothing** is precisely a tweak to the target $p$ that changes this KL.
    - **Maximum likelihood = minimum KL.** Fitting a model by maximizing log-likelihood is, in the large-sample limit, exactly minimizing $D(p_{\text{data}} \| q_\theta)$. The asymmetry direction here is the *mean-seeking* one (Section 4) — which is why MLE models hedge and cover.
    - **Variational inference & VAEs.** The ELBO contains a $D(q_\phi(z\mid x) \| p(z))$ term, and VI minimizes $D(q\|p)$ — the *mode-seeking* direction. Same KL, opposite argument order, opposite behavior. Module 6E builds this out.
    - **Mutual information as an objective.** The **information bottleneck** (6C) maximizes $I(T; Y)$ while minimizing $I(T; X)$ for a representation $T$. **Self-supervised learning** (InfoNCE, contrastive methods) maximizes a lower bound on $I$ between two views. **Feature selection** ranks features by $I(\text{feature}; \text{label})$. **Decision trees** split on information gain $I(Y; \text{split})$.
    - **Estimating MI with neural nets.** When $X, Y$ are high-dimensional you can't sum over a table. **MINE** and friends (Module 6D) turn the KL/MI definition into a variational bound you optimize with a neural network — built directly on the $I(X;Y) = D(p_{xy}\|p_xp_y)$ identity from Section 5.
    - **The data-processing inequality as a guardrail.** Every layer, every quantization, every learned representation can only *lose* information about the target (Section 7). This bounds what any architecture can possibly achieve and motivates the bottleneck view of deep learning.

    With entropy (1A) and now KL and mutual information (1B) in hand, you hold the three core measures of the whole field. Next, **Module 1C** lets time in: the **entropy rate** of a stochastic process and the **asymptotic equipartition property** — the bridge from these single-shot quantities to the coding theorems of Part 2.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise gives a spec and a skeleton — fill in the missing pieces. These cement the math-to-code translation for KL, cross-entropy, and mutual information.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: KL Divergence from Scratch

    Implement `kl(p, q)` returning bits. Handle the $p(x)=0$ convention ($0\log\tfrac{0}{q}=0$) by skipping those terms. Verify it is asymmetric and that $D(p\|p)=0$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def kl(p, q, base=2):
            p = np.asarray(p, dtype=float)
            q = np.asarray(q, dtype=float)
            # TODO: mask out p==0 terms, then sum p*log(p/q)/log(base)
            _result = ...
            return _result

        # print(kl([0.5, 0.5], [0.25, 0.75]))   # expect ~0.2075
        # print(kl([0.25, 0.75], [0.5, 0.5]))   # expect ~0.1887 (different!)
        # print(kl([0.5, 0.5], [0.5, 0.5]))     # expect 0.0

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Cross-Entropy Equals H + KL

    Compute the cross-entropy $H(p,q)=-\sum_x p(x)\log_2 q(x)$ directly, and separately compute $H(p)+D(p\|q)$. Confirm they match for a few $(p,q)$ pairs.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float); p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        def kl(p, q, base=2):
            p = np.asarray(p, dtype=float); q = np.asarray(q, dtype=float)
            _m = p > 0
            return float(np.sum(p[_m] * (np.log(p[_m]) - np.log(q[_m])) / np.log(base)))

        p = np.array([0.7, 0.2, 0.1])
        q = np.array([0.5, 0.3, 0.2])

        # TODO: cross-entropy H(p,q) directly:  -sum p*log2(q)  (skip p==0)
        ce_direct = ...

        # TODO: the decomposition H(p) + D(p||q)
        ce_decomp = ...

        # print(f"direct = {ce_direct:.4f}, H+KL = {ce_decomp:.4f}")
        # print("match:", np.isclose(ce_direct, ce_decomp))

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Mutual Information from a Joint Table

    Given a joint distribution `joint` (rows = X, cols = Y), compute the marginals, then $I(X;Y)$ two ways — as $H(X)+H(Y)-H(X,Y)$ and as $D(p(x,y)\,\|\,p(x)p(y))$ — and confirm they agree.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float); p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        joint = np.array([
            [0.30, 0.05],
            [0.05, 0.60],
        ])  # rows = X, cols = Y, sums to 1

        # TODO: marginals px (sum over Y) and py (sum over X)
        px = ...
        py = ...

        # TODO: I via entropies:  H(X) + H(Y) - H(X,Y)
        I_sub = ...

        # TODO: I via KL:  sum over x,y of joint*log2(joint / (px*py))   (skip zeros)
        I_kl = ...

        # print(f"I_sub = {I_sub:.4f}, I_kl = {I_kl:.4f}, match: {np.isclose(I_sub, I_kl)}")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Information Gain (Decision-Tree Split)

    A decision tree picks the split that maximizes information gain $I(Y;\text{split}) = H(Y) - H(Y\mid \text{split})$. Given the label distribution and how a candidate feature partitions the data, compute the information gain in bits.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float); p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        # 10 samples, labels: 6 positive, 4 negative
        p_parent = np.array([6, 4]) / 10

        # Feature splits into: left = [4 pos, 0 neg] (4 samples), right = [2 pos, 4 neg] (6 samples)
        left_counts = np.array([4, 0])
        right_counts = np.array([2, 4])

        # TODO: H(Y) of the parent
        H_parent = ...

        # TODO: weighted child entropy = (4/10)*H(left) + (6/10)*H(right)
        H_children = ...

        # TODO: information gain = H_parent - H_children
        info_gain = ...

        # print(f"H(Y)={H_parent:.4f}, H(Y|split)={H_children:.4f}, gain={info_gain:.4f}")
        # expect gain ~ 0.2911 bits

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: The Data-Processing Inequality

    Build a Markov chain $X \to Y \to Z$ where $X$ is a uniform bit, $Y = X$ through a binary symmetric channel with flip probability $e_1$, and $Z = Y$ through a second BSC with flip $e_2$. Compute $I(X;Y)$ and $I(X;Z)$ and check that $I(X;Z)\le I(X;Y)$ for several noise levels.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def mutual_information(joint):
            joint = np.asarray(joint, dtype=float)
            _px = joint.sum(axis=1, keepdims=True)
            _py = joint.sum(axis=0, keepdims=True)
            _ind = _px @ _py
            _m = joint > 0
            return float(np.sum(joint[_m] * np.log2(joint[_m] / _ind[_m])))

        def bsc(flip):
            # TODO: return the 2x2 transition matrix of a binary symmetric channel
            return ...

        e1, e2 = 0.1, 0.25
        px = np.array([0.5, 0.5])

        # TODO: joint p(x,y) = px[x] * P(y|x);  hint: px[:,None] * bsc(e1)
        joint_XY = ...

        # TODO: build joint p(x,z) by marginalizing over y through the second channel
        #       joint_XZ[x,z] = sum_y joint_XY[x,y] * bsc(e2)[y,z]
        joint_XZ = ...

        # I_XY = mutual_information(joint_XY)
        # I_XZ = mutual_information(joint_XZ)
        # print(f"I(X;Y)={I_XY:.4f}, I(X;Z)={I_XZ:.4f}, DPI holds: {I_XZ <= I_XY + 1e-12}")

    _run()
    return


if __name__ == "__main__":
    app.run()
