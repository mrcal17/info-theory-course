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
    # 3A: Channels & Channel Capacity

    > *"The fundamental problem of communication is that of reproducing at one point either exactly or approximately a message selected at another point."*
    > — Claude Shannon, 1948

    Welcome to Part 3 — the crown jewel of the whole field. So far we have measured uncertainty (Part 1) and squeezed it out of sources (Part 2). Now we confront the real world: every wire, every radio link, every cell in flash memory, every strand of DNA being copied is a **noisy channel**. You put a symbol in; something *possibly different* comes out. The terrifying-sounding question is: can you ever communicate *reliably* over an unreliable medium?

    Shannon's answer is one of the most surprising results in all of science: **yes** — and there is a precise, finite number, the **channel capacity** $C$, such that you can push information through at any rate *below* $C$ with arbitrarily small error, and no rate *above* $C$ is achievable at all. There is a hard cliff, and we can compute exactly where it is.

    This module builds the machinery. You already own the key tool — mutual information $I(X;Y)$ from 1B — so we are mostly assembling pieces you have. We will define a channel formally, meet the two channels you must know cold (the **binary symmetric channel** and the **binary erasure channel**), derive their capacities by hand, and then build the **Blahut–Arimoto algorithm**, a beautiful little iteration that computes the capacity of *any* discrete channel numerically. Module 3B will prove the coding theorem that makes $C$ achievable; here we learn what $C$ *is*.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. What Is a Channel?

    A **discrete memoryless channel** (DMC) is the simplest honest model of noise. It has an input alphabet $\mathcal{X}$, an output alphabet $\mathcal{Y}$, and a conditional probability law

    $$p(y \mid x) = \Pr[\,Y = y \mid X = x\,].$$

    You feed in a symbol $x$; the channel emits $y$ drawn from $p(\cdot \mid x)$. Two words in the name carry the assumptions:

    - **Discrete** — both alphabets are finite (we handle continuous channels in 3C).
    - **Memoryless** — each use of the channel is independent of the others. The noise on symbol $n$ does not depend on what happened to symbols $1, \dots, n-1$. Formally, for a block of $n$ uses, $p(y_1\dots y_n \mid x_1\dots x_n) = \prod_{i=1}^n p(y_i \mid x_i)$.

    Everything about a DMC lives in its **channel matrix** $Q$, a $|\mathcal{X}| \times |\mathcal{Y}|$ matrix with

    $$Q_{xy} = p(y \mid x).$$

    Each **row** is a probability distribution (the channel must output *something*), so every row sums to 1. Columns need not sum to anything in particular. The channel matrix is a *property of the hardware* — it is fixed. What *we* control is the **input distribution** $p(x)$: how often we choose to send each symbol. That freedom is exactly what we will optimize.

    Given an input distribution $p(x)$ and the channel $Q$, the joint law is $p(x, y) = p(x)\,Q_{xy}$, the output marginal is $p(y) = \sum_x p(x)\,Q_{xy}$, and we can compute $I(X;Y)$ — the information the output carries about the input. *That* number is the whole game.

    > [MacKay Ch 9](https://www.inference.org.uk/itprnn/book.pdf) introduces channels and capacity with exactly this matrix picture.
    > [Cover & Thomas Ch 7](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) is the rigorous reference for the DMC and capacity.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def mutual_information(px, Q, base=2):
            px = np.asarray(px, dtype=float)
            Q = np.asarray(Q, dtype=float)
            pxy = px[:, None] * Q
            py = pxy.sum(axis=0)
            _m = pxy > 0
            _ratio = np.zeros_like(pxy)
            _ratio[_m] = pxy[_m] / (px[:, None] * py[None, :])[_m]
            return float(np.sum(pxy[_m] * np.log(_ratio[_m])) / np.log(base))

        print("=== A discrete memoryless channel (the channel matrix Q) ===")
        _Q = np.array([
            [0.7, 0.2, 0.1],
            [0.1, 0.8, 0.1],
            [0.0, 0.3, 0.7],
        ])
        print("Q (rows = input x, cols = output y):")
        print(_Q)
        print(f"\nEach row sums to 1?  {np.allclose(_Q.sum(axis=1), 1.0)}")

        _px = np.array([1 / 3, 1 / 3, 1 / 3])
        print(f"\nWith uniform input px = {_px}:")
        print(f"  output marginal p(y) = {(_px[:, None] * _Q).sum(axis=0)}")
        print(f"  I(X;Y) = {mutual_information(_px, _Q):.4f} bits per channel use")

        _px2 = np.array([0.5, 0.0, 0.5])
        print(f"\nWith a different input px = {_px2}:")
        print(f"  I(X;Y) = {mutual_information(_px2, _Q):.4f} bits per channel use")
        print("\nDifferent inputs give different I(X;Y). Capacity is the BEST we can do.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Capacity: The Best the Channel Can Do

    The mutual information $I(X;Y)$ depends on *two* things: the fixed channel $Q$, and the input distribution $p(x)$ that *we* get to choose. Since reliable communication rate is governed by $I(X;Y)$, and the channel is out of our hands, the natural definition of how good the channel is takes the best input we can muster:

    $$\boxed{\,C = \max_{p(x)} \; I(X;Y)\,}$$

    This is the **channel capacity**, measured in **bits per channel use**. It is the single most important quantity in communication theory. Three facts make it well-behaved:

    1. **It is a real maximization, not a supremum that runs off to infinity.** $I(X;Y)$ is a *concave* function of $p(x)$ for a fixed channel, and the set of input distributions is a closed bounded simplex. A continuous concave function on a compact convex set attains its maximum — so $C$ exists and is finite.
    2. **$0 \le C \le \min(\log|\mathcal{X}|, \log|\mathcal{Y}|)$.** You can never extract more bits than $\log$ of either alphabet size. A noiseless channel with $|\mathcal{X}| = |\mathcal{Y}| = N$ and $Q = I$ achieves the ceiling $C = \log_2 N$.
    3. **The optimal input is generally *not* uniform.** Symmetric channels happen to be maximized by the uniform input, which is why the BSC and BEC are so clean. For a lopsided channel the optimizer tilts toward inputs that are "more distinguishable" at the output.

    The operational meaning — proven next module — is the **noisy-channel coding theorem**: for any rate $R < C$ there exist codes with vanishing error probability as the block length grows, and for any $R > C$ the error probability is bounded away from zero. $C$ is a *sharp threshold*, a cliff. For now, treat that as a promise and focus on *computing* $C$.

    > [Cover & Thomas §7.1–7.3](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) defines capacity and proves concavity in $p(x)$.
    > [Stone Ch 4](https://arxiv.org/pdf/1802.05968) gives the gentle, picture-first version.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def mutual_information(px, Q, base=2):
            px = np.asarray(px, dtype=float)
            Q = np.asarray(Q, dtype=float)
            pxy = px[:, None] * Q
            py = pxy.sum(axis=0)
            _m = pxy > 0
            _ratio = np.zeros_like(pxy)
            _ratio[_m] = pxy[_m] / (px[:, None] * py[None, :])[_m]
            return float(np.sum(pxy[_m] * np.log(_ratio[_m])) / np.log(base))

        _Q = np.array([
            [0.7, 0.2, 0.1],
            [0.1, 0.8, 0.1],
            [0.0, 0.3, 0.7],
        ])

        _rng = np.random.default_rng(0)
        _best = 0.0
        _best_px = None
        for _ in range(300_000):
            _px = _rng.random(3)
            _px = _px / _px.sum()
            _I = mutual_information(_px, _Q)
            if _I > _best:
                _best = _I
                _best_px = _px

        print("=== Brute-force search for capacity (300,000 random inputs) ===")
        print(f"uniform input  I(X;Y) = {mutual_information([1/3, 1/3, 1/3], _Q):.4f} bits")
        print(f"best found     I(X;Y) = {_best:.4f} bits  <- this approximates C")
        print(f"best input px  ~ {np.round(_best_px, 3)}")
        print("\nNotice: the capacity-achieving input is NOT uniform for this lopsided channel.")
        print("Brute force is hopeless for big alphabets — Section 6 builds the real algorithm.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. The Binary Symmetric Channel (BSC)

    The BSC is the channel everyone learns first, and for good reason: it is the cleanest model of a bit getting corrupted. Input and output are both $\{0, 1\}$. With **crossover probability** $p$, each bit is flipped independently:

    $$Q_{\text{BSC}} = \begin{pmatrix} 1-p & p \\ p & 1-p \end{pmatrix}, \qquad p(y\neq x) = p.$$

    Let us derive its capacity. By symmetry the best input is uniform, $p(0) = p(1) = \tfrac12$, which makes the output uniform too, so $H(Y) = 1$ bit. The conditional entropy is the same for every input row: given $x$, the output is "$x$ with prob $1-p$, flipped with prob $p$," whose entropy is the binary entropy function $H_2(p) = -p\log_2 p - (1-p)\log_2(1-p)$. Therefore

    $$\boxed{\,C_{\text{BSC}} = 1 - H_2(p)\,} = 1 + p\log_2 p + (1-p)\log_2(1-p).$$

    Read it as: *one bit per use, minus the bits the noise steals*. Sanity checks, all of which the slider below confirms:

    - $p = 0$: perfect channel, $H_2(0) = 0$, so $C = 1$ bit. Of course.
    - $p = \tfrac12$: $H_2(\tfrac12) = 1$, so $C = 0$. A coin-flip channel is **useless** — the output is independent of the input.
    - $p = 1$: $C = 1$ again! A channel that *always* flips is perfectly reliable — just invert the output. Noise you can predict is not noise.
    - The curve is symmetric about $p = \tfrac12$, dipping to zero there and rising to 1 at both ends.

    > [MacKay §9.6](https://www.inference.org.uk/itprnn/book.pdf) and [Cover & Thomas §7.1.4](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) derive $C_{\text{BSC}} = 1 - H_2(p)$.
    """)
    return


@app.cell
def _(mo):
    bsc_p = mo.ui.slider(start=0.0, stop=1.0, step=0.01, value=0.1, label="BSC crossover probability p")
    bsc_p
    return (bsc_p,)


@app.cell
def _(bsc_p):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _h2(p):
            p = np.asarray(p, dtype=float)
            out = np.zeros_like(p)
            _m = (p > 0) & (p < 1)
            out[_m] = -p[_m] * np.log2(p[_m]) - (1 - p[_m]) * np.log2(1 - p[_m])
            return out

        _p = bsc_p.value
        _ps = np.linspace(0, 1, 501)
        _cap = 1 - _h2(_ps)
        _h2p = 0.0 if _p in (0.0, 1.0) else float(-_p * np.log2(_p) - (1 - _p) * np.log2(1 - _p))
        _Cp = 1 - _h2p

        _fig, _ax = plt.subplots(figsize=(7, 4))
        _ax.plot(_ps, _cap, lw=2, color="steelblue", label="$C = 1 - H_2(p)$")
        _ax.scatter([_p], [_Cp], color="red", zorder=5, s=70)
        _ax.axvline(_p, color="red", ls="--", alpha=0.4)
        _ax.annotate(f"C({_p:.2f}) = {_Cp:.3f} bits", xy=(_p, _Cp),
                     xytext=(0.45, 0.75), textcoords="axes fraction",
                     arrowprops=dict(arrowstyle="->", color="red", alpha=0.6))
        _ax.set_xlabel("crossover probability p")
        _ax.set_ylabel("capacity (bits per use)")
        _ax.set_title("Binary Symmetric Channel capacity")
        _ax.grid(True, alpha=0.3)
        _ax.set_ylim(-0.02, 1.05)
        _ax.legend(loc="lower center")
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def mutual_information(px, Q, base=2):
            px = np.asarray(px, dtype=float)
            Q = np.asarray(Q, dtype=float)
            pxy = px[:, None] * Q
            py = pxy.sum(axis=0)
            _m = pxy > 0
            _ratio = np.zeros_like(pxy)
            _ratio[_m] = pxy[_m] / (px[:, None] * py[None, :])[_m]
            return float(np.sum(pxy[_m] * np.log(_ratio[_m])) / np.log(base))

        def _h2(p):
            if p in (0.0, 1.0):
                return 0.0
            return float(-p * np.log2(p) - (1 - p) * np.log2(1 - p))

        print("=== BSC: closed form vs. direct I(X;Y) at uniform input ===")
        print(f"{'p':>6} {'1 - H2(p)':>12} {'I(X;Y) uniform':>16}")
        for _p in [0.0, 0.01, 0.1, 0.25, 0.5, 0.9, 1.0]:
            _Q = np.array([[1 - _p, _p], [_p, 1 - _p]])
            _formula = 1 - _h2(_p)
            _direct = mutual_information([0.5, 0.5], _Q)
            print(f"{_p:>6.2f} {_formula:>12.4f} {_direct:>16.4f}")
        print("\nThe closed form and the direct MI agree exactly — uniform input is optimal here.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. The Binary Erasure Channel (BEC)

    The BEC models a different kind of damage: bits are not *flipped*, they are *lost*. The input is $\{0, 1\}$, but the output alphabet has a third symbol — the **erasure** $\mathsf{e}$, meaning "I know I received something, but I cannot tell what." With **erasure probability** $\varepsilon$:

    $$Q_{\text{BEC}} = \begin{pmatrix} 1-\varepsilon & 0 & \varepsilon \\ 0 & 1-\varepsilon & \varepsilon \end{pmatrix}, \qquad \text{cols} = (0, 1, \mathsf{e}).$$

    The crucial difference from the BSC: when a bit *does* get through, you know it is correct, and when it is erased, **you know it was erased**. There is no silent corruption. That extra knowledge makes the BEC strictly friendlier.

    The capacity has a beautifully simple form. Intuitively, a fraction $1-\varepsilon$ of your symbols arrive perfectly and the rest are simply gone, so you should expect to get $1-\varepsilon$ bits per use:

    $$\boxed{\,C_{\text{BEC}} = 1 - \varepsilon\,}$$

    Here is the clean derivation. Take uniform input. Introduce an indicator $E$ that is 1 when the symbol is erased. The receiver can *see* $E$ (erasure is observable), and $H(E) $ tells us nothing extra about $X$ beyond $Y$. Working it through, $I(X;Y) = H(X) - H(X\mid Y) = 1 - \varepsilon\cdot 1 - (1-\varepsilon)\cdot 0 = 1 - \varepsilon$: when erased ($\varepsilon$ of the time) all 1 bit of uncertainty about $X$ remains, when received none does. Checks:

    - $\varepsilon = 0$: $C = 1$ bit — perfect channel.
    - $\varepsilon = 1$: $C = 0$ — every symbol vanishes, nothing gets through.
    - **The BEC beats the BSC at the same noise level.** Compare $\varepsilon = 0.1$ (gives $C = 0.9$) against a BSC with $p = 0.1$ (gives $C = 1 - H_2(0.1) \approx 0.531$). Knowing *where* the errors are is worth a lot — this is why erasure coding underlies RAID, distributed storage, and packet-loss recovery on the internet.

    > [MacKay §9.5](https://www.inference.org.uk/itprnn/book.pdf) and [Cover & Thomas §7.1.5](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) cover the BEC and $C = 1 - \varepsilon$.
    """)
    return


@app.cell
def _(mo):
    bec_eps = mo.ui.slider(start=0.0, stop=1.0, step=0.01, value=0.1, label="BEC erasure probability ε")
    bec_eps
    return (bec_eps,)


@app.cell
def _(bec_eps):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _h2(p):
            p = np.asarray(p, dtype=float)
            out = np.zeros_like(p)
            _m = (p > 0) & (p < 1)
            out[_m] = -p[_m] * np.log2(p[_m]) - (1 - p[_m]) * np.log2(1 - p[_m])
            return out

        _e = bec_eps.value
        _es = np.linspace(0, 1, 501)
        _bec = 1 - _es
        _bsc = 1 - _h2(_es)

        _fig, _ax = plt.subplots(figsize=(7, 4))
        _ax.plot(_es, _bec, lw=2, color="seagreen", label=r"BEC: $C = 1 - \varepsilon$")
        _ax.plot(_es, _bsc, lw=2, color="steelblue", ls="--", alpha=0.8,
                 label=r"BSC: $C = 1 - H_2(p)$ (for comparison)")
        _ax.scatter([_e], [1 - _e], color="red", zorder=5, s=70)
        _ax.axvline(_e, color="red", ls="--", alpha=0.4)
        _ax.annotate(f"C({_e:.2f}) = {1 - _e:.3f} bits", xy=(_e, 1 - _e),
                     xytext=(0.42, 0.78), textcoords="axes fraction",
                     arrowprops=dict(arrowstyle="->", color="red", alpha=0.6))
        _ax.set_xlabel("noise level (ε for BEC, p for BSC)")
        _ax.set_ylabel("capacity (bits per use)")
        _ax.set_title("BEC capacity — and why erasures beat flips")
        _ax.grid(True, alpha=0.3)
        _ax.set_ylim(-0.02, 1.05)
        _ax.legend(loc="upper right")
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def mutual_information(px, Q, base=2):
            px = np.asarray(px, dtype=float)
            Q = np.asarray(Q, dtype=float)
            pxy = px[:, None] * Q
            py = pxy.sum(axis=0)
            _m = pxy > 0
            _ratio = np.zeros_like(pxy)
            _ratio[_m] = pxy[_m] / (px[:, None] * py[None, :])[_m]
            return float(np.sum(pxy[_m] * np.log(_ratio[_m])) / np.log(base))

        print("=== BEC: closed form 1 - eps vs. direct I(X;Y), and BEC vs BSC ===")
        print(f"{'noise':>7} {'BEC 1-e':>10} {'I direct':>10} {'BSC 1-H2':>10}")
        for _e in [0.0, 0.05, 0.1, 0.25, 0.5, 0.9]:
            _Q = np.array([[1 - _e, 0.0, _e], [0.0, 1 - _e, _e]])
            _direct = mutual_information([0.5, 0.5], _Q)
            _bsc = 1 - (0.0 if _e in (0.0, 1.0) else -_e * np.log2(_e) - (1 - _e) * np.log2(1 - _e))
            print(f"{_e:>7.2f} {1 - _e:>10.4f} {_direct:>10.4f} {_bsc:>10.4f}")
        print("\nBEC capacity = 1 - eps exactly, and at every noise level BEC >= BSC.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The General Problem and Why It Needs an Algorithm

    The BSC and BEC are *symmetric*, so we could guess the optimal input (uniform) and read off $C$ in closed form. The general DMC is not so kind. Suppose you are handed an arbitrary channel matrix $Q$ — an asymmetric channel, a typewriter channel, a Z-channel where only one input gets corrupted. There is no formula. You must actually solve

    $$C = \max_{p(x)} \; I(X;Y), \qquad \text{subject to } p(x) \ge 0,\ \sum_x p(x) = 1.$$

    This is a constrained optimization over the probability simplex. The good news from Section 2 is that $I(X;Y)$ is **concave** in $p(x)$, so there are no false summits — any local max is the global max, and the problem is genuinely tractable. The bad news is that brute force (Section 2) scales catastrophically and gives only crude accuracy.

    We need a real algorithm. We could throw projected gradient ascent at it, but there is something far more elegant and tailored to this exact problem: the **Blahut–Arimoto algorithm**, discovered independently by Richard Blahut and Suguru Arimoto in 1972. It exploits a clever reformulation of mutual information as a *double* maximization, then alternates between the two arguments — each step has a clean closed form, and the whole thing is guaranteed to converge monotonically up to $C$. That is the centerpiece of this module, and we build it next.

    > [Cover & Thomas §10.8](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) presents Blahut–Arimoto (and its rate-distortion twin).
    > [MacKay Ch 9](https://www.inference.org.uk/itprnn/book.pdf) discusses computing capacity for general channels.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. The Blahut–Arimoto Algorithm

    The trick is to view the channel "in reverse." Alongside the input distribution $p(x)$, introduce a **guessed reverse channel** $\Phi_{x \mid y} = \Pr[X=x \mid Y=y]$ — a free variable we also optimize. Mutual information can be written as a *maximization* over that reverse channel:

    $$I(X;Y) = \max_{\Phi} \; \sum_{x,y} p(x)\,Q_{xy}\,\log_2 \frac{\Phi_{x\mid y}}{p(x)},$$

    where the inner max over $\Phi$ is attained exactly when $\Phi$ is the *true* posterior. Now capacity is a **double maximization** over $p(x)$ and $\Phi$ — and maximizing one at a time, with the other held fixed, each has a closed-form solution. That is Blahut–Arimoto. The two alternating updates are:

    **Step A — fix $p(x)$, optimize $\Phi$ (Bayes' rule).** The best reverse channel is just the posterior:

    $$\Phi_{x\mid y} = \frac{p(x)\,Q_{xy}}{\sum_{x'} p(x')\,Q_{x'y}}.$$

    **Step B — fix $\Phi$, optimize $p(x)$.** Define for each input $x$ the quantity

    $$\log_2 r_x = \sum_y Q_{xy}\,\log_2 \Phi_{x\mid y}, \qquad\text{then}\qquad p(x) \leftarrow \frac{r_x}{\sum_{x'} r_{x'}}.$$

    Equivalently $r_x = \exp\!\big(\sum_y Q_{xy}\ln \Phi_{x\mid y}\big)$, normalized. Each $r_x$ rewards inputs whose output rows are easy to tell apart from the rest — those get more probability mass.

    Iterate A, B, A, B, …. The mutual information increases (weakly) every round and converges to $C$. There is even a free **convergence certificate**: after each update compute, for every $x$,

    $$d_x = \sum_y Q_{xy}\,\log_2 \frac{\Phi_{x\mid y}}{p(x)}.$$

    Then $\max_x d_x \ge C \ge \sum_x p(x)\, d_x = I(X;Y)$. The certificate gap is $\max_x d_x - \sum_x p(x)d_x$; at the optimum all supported inputs have the same $d_x=C$, so the upper and lower bounds meet. The solver below implements all of this and prints the squeeze.

    > [Cover & Thomas §10.8](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) proves the convergence; Arimoto (1972) and Blahut (1972) are the originals.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def blahut_arimoto(Q, max_iter=1000, tol=1e-12, base=2):
            Q = np.asarray(Q, dtype=float)
            n_in = Q.shape[0]
            px = np.ones(n_in) / n_in
            _log = np.log
            for _ in range(max_iter):
                py = px @ Q
                _safe = py > 0
                Phi = np.zeros_like(Q)
                Phi[:, _safe] = (px[:, None] * Q[:, _safe]) / py[None, _safe]

                _logr = np.zeros(n_in)
                for _x in range(n_in):
                    _m = (Q[_x] > 0) & (Phi[_x] > 0)
                    _logr[_x] = np.sum(Q[_x, _m] * _log(Phi[_x, _m]))
                _r = np.exp(_logr - _logr.max())
                _new_px = _r / _r.sum()

                if np.max(np.abs(_new_px - px)) < tol:
                    px = _new_px
                    break
                px = _new_px

            _m = (Q > 0) & (Phi > 0) & (px[:, None] > 0)
            d = np.zeros(n_in)
            for _x in range(n_in):
                _mm = (Q[_x] > 0) & (Phi[_x] > 0) & (px[_x] > 0)
                d[_x] = np.sum(Q[_x, _mm] * _log(Phi[_x, _mm] / px[_x])) / _log(base)
            _support = px > 1e-9
            C_lower = float(np.sum(px * d))
            C_upper = float(np.max(d))
            return px, C_lower, C_upper, d

        print("=== Blahut-Arimoto sanity checks against the closed forms ===")
        _p = 0.1
        _bsc = np.array([[1 - _p, _p], [_p, 1 - _p]])
        _px, _lo, _hi, _ = blahut_arimoto(_bsc)
        print(f"BSC p=0.1:  BA C = {_lo:.5f}   closed form 1-H2 = {1 + _p*np.log2(_p) + (1-_p)*np.log2(1-_p):.5f}")
        print(f"            optimal input = {np.round(_px, 4)}  (should be ~uniform)")

        _e = 0.1
        _bec = np.array([[1 - _e, 0.0, _e], [0.0, 1 - _e, _e]])
        _px, _lo, _hi, _ = blahut_arimoto(_bec)
        print(f"BEC e=0.1:  BA C = {_lo:.5f}   closed form 1-eps = {1 - _e:.5f}")
        print(f"            optimal input = {np.round(_px, 4)}  (should be ~uniform)")

        _noiseless = np.eye(3)
        _px, _lo, _hi, _ = blahut_arimoto(_noiseless)
        print(f"Noiseless 3x3:  BA C = {_lo:.5f}   should be log2(3) = {np.log2(3):.5f}")

        _z = np.array([[1.0, 0.0], [0.3, 0.7]])
        _px, _lo, _hi, _ = blahut_arimoto(_z)
        print(f"Z-channel:  BA C = {_lo:.5f}   optimal input = {np.round(_px, 4)} (NOT uniform!)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Interactive: Solve Any Channel's Capacity

    Now make it yours. Enter a channel matrix below — one row per input symbol, comma-separated probabilities per row, rows separated by semicolons. Each row will be auto-normalized to sum to 1 (so you can type raw weights if you like). Pick the number of inputs/outputs implicitly from what you type. The solver runs Blahut–Arimoto and reports the capacity, the upper/lower convergence bounds, and the **optimal input distribution** as a bar chart.

    Try these:

    - `0.9, 0.1; 0.1, 0.9` — a BSC with $p = 0.1$ (capacity $\approx 0.531$, uniform input).
    - `1, 0; 0.3, 0.7` — a **Z-channel**: input 0 is safe, input 1 sometimes flips. The optimizer sends 0 a bit *more* than half the time.
    - `1, 0, 0; 0, 1, 0; 0, 0, 1` — a noiseless 3-symbol channel ($C = \log_2 3 \approx 1.585$).
    - `0.5, 0.5, 0, 0; 0, 0, 0.5, 0.5` — a clean channel: two inputs map to disjoint output pairs, $C = 1$ bit.
    """)
    return


@app.cell
def _(mo):
    channel_text = mo.ui.text_area(
        value="1, 0; 0.3, 0.7",
        label="Channel matrix Q (rows = inputs; commas within a row, semicolons between rows)",
        full_width=True,
    )
    channel_text
    return (channel_text,)


@app.cell
def _(channel_text):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _parse(s):
            _rows = [r.strip() for r in s.split(";") if r.strip()]
            _mat = []
            _width = None
            for _r in _rows:
                _vals = [float(v) for v in _r.replace(",", " ").split()]
                if _width is None:
                    _width = len(_vals)
                if len(_vals) != _width:
                    return None
                _mat.append(_vals)
            if not _mat:
                return None
            _Q = np.array(_mat, dtype=float)
            _sums = _Q.sum(axis=1, keepdims=True)
            if np.any(_sums <= 0):
                return None
            return _Q / _sums

        def blahut_arimoto(Q, max_iter=2000, tol=1e-13, base=2):
            Q = np.asarray(Q, dtype=float)
            n_in = Q.shape[0]
            px = np.ones(n_in) / n_in
            Phi = np.zeros_like(Q)
            for _ in range(max_iter):
                py = px @ Q
                _safe = py > 0
                Phi = np.zeros_like(Q)
                Phi[:, _safe] = (px[:, None] * Q[:, _safe]) / py[None, _safe]
                _logr = np.zeros(n_in)
                for _x in range(n_in):
                    _m = (Q[_x] > 0) & (Phi[_x] > 0)
                    _logr[_x] = np.sum(Q[_x, _m] * np.log(Phi[_x, _m]))
                _r = np.exp(_logr - _logr.max())
                _new = _r / _r.sum()
                if np.max(np.abs(_new - px)) < tol:
                    px = _new
                    break
                px = _new
            d = np.zeros(n_in)
            for _x in range(n_in):
                _mm = (Q[_x] > 0) & (Phi[_x] > 0) & (px[_x] > 0)
                d[_x] = np.sum(Q[_x, _mm] * np.log(Phi[_x, _mm] / px[_x])) / np.log(base)
            return px, float(np.sum(px * d)), float(np.max(d))

        _Q = _parse(channel_text.value)
        _fig, (_a0, _a1) = plt.subplots(1, 2, figsize=(11, 4))
        if _Q is None:
            _a0.text(0.5, 0.5, "Could not parse matrix.\nUse: r1c1, r1c2; r2c1, r2c2\n(equal columns per row)",
                     ha="center", va="center", fontsize=11, color="firebrick")
            _a0.axis("off")
            _a1.axis("off")
            plt.tight_layout()
            return _fig

        _px, _lo, _hi = blahut_arimoto(_Q)
        _n_in, _n_out = _Q.shape

        _im = _a0.imshow(_Q, cmap="Blues", vmin=0, vmax=1, aspect="auto")
        _a0.set_title("Channel matrix $Q_{xy} = p(y|x)$")
        _a0.set_xlabel("output y")
        _a0.set_ylabel("input x")
        _a0.set_xticks(range(_n_out))
        _a0.set_yticks(range(_n_in))
        for _i in range(_n_in):
            for _j in range(_n_out):
                _a0.text(_j, _i, f"{_Q[_i, _j]:.2f}", ha="center", va="center",
                         color="white" if _Q[_i, _j] > 0.5 else "black", fontsize=9)

        _a1.bar(np.arange(_n_in), _px, color="seagreen", alpha=0.85)
        _a1.set_title(f"Optimal input p*(x)\nC = {_lo:.4f} bits/use   (bounds: {_lo:.4f} - {_hi:.4f})")
        _a1.set_xlabel("input x")
        _a1.set_ylabel("probability")
        _a1.set_xticks(range(_n_in))
        _a1.set_ylim(0, 1.0)
        _a1.grid(True, axis="y", alpha=0.3)
        for _i, _v in enumerate(_px):
            _a1.text(_i, _v + 0.02, f"{_v:.3f}", ha="center", fontsize=9)

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 8. Why This Matters for Machine Learning

    Channel capacity is not just for radios. The "noisy channel" is one of the most reusable abstractions in all of ML:

    - **Mutual information as a learning objective.** Capacity is $\max_{p(x)} I(X;Y)$ — an *information-maximizing* design of the input. The same idea drives **InfoMax** representation learning, the **information bottleneck** (6C), and contrastive objectives like **InfoNCE** (6D), which all maximize or constrain $I$ between variables. Blahut–Arimoto is the clean, exact ancestor of those noisy variational estimators.
    - **The channel view of a neural network.** A layer maps a representation $X$ to $Y$ through stochasticity (dropout, quantization, sampling in a VAE). How much information survives is literally a channel-capacity question, and the **information plane** in 6C tracks exactly this.
    - **Erasures are missing data.** The BEC is the model of *known* missing entries — you know *which* features are absent. Erasure codes (RAID, Reed–Solomon over packets, fountain codes in 4D) are the engineering payoff of $C = 1 - \varepsilon$, and "known-missing" is also why imputation under MCAR is easier than under silent corruption.
    - **The noisy-channel model in NLP.** Classical machine translation, spelling correction, and speech recognition were built on Shannon's source–channel decomposition $\arg\max_x p(x)\,p(y\mid x)$ — the channel $p(y\mid x)$ is exactly the $Q$ of this module.
    - **Alternating optimization.** Blahut–Arimoto is a coordinate-ascent on a cleverly lifted objective — the *same* algorithmic shape as **EM**, as the rate-distortion solver (5A), and as the alternating updates in many variational methods. Recognizing "I can split this into two closed-form maximizations" is a transferable superpower.

    Next, **Module 3B** turns the number $C$ into an operational promise: the **noisy-channel coding theorem**. We will see *why* you can communicate reliably at any rate below $C$ — via random coding and joint typicality — and watch the error probability fall off a cliff exactly at $R = C$.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise gives a spec and a skeleton — fill in the `TODO`s and `...` blanks. These cement the channel-matrix-to-capacity pipeline that the whole of Part 3 rests on.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Mutual Information from a Channel

    Given an input distribution `px` and a channel matrix `Q`, compute $I(X;Y)$ in bits. Build the joint $p(x,y) = p(x)\,Q_{xy}$, the output marginal $p(y)$, and sum $p(x,y)\log_2\frac{p(x,y)}{p(x)p(y)}$ over the nonzero entries. Test on a noiseless 2x2 channel with uniform input (expect 1.0).
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

        def mutual_information(px, Q, base=2):
            px = np.asarray(px, dtype=float)
            Q = np.asarray(Q, dtype=float)
            # TODO: joint pxy = px[:, None] * Q
            pxy = ...
            # TODO: output marginal py = sum over x
            py = ...
            # TODO: sum pxy * log(pxy / (px*py)) over nonzero entries, divide by log(base)
            _result = ...
            return _result

        # print(mutual_information([0.5, 0.5], np.eye(2)))   # expect 1.0
        # print(mutual_information([0.5, 0.5], [[0.9, 0.1], [0.1, 0.9]]))  # expect ~0.531

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: BSC Capacity in Closed Form

    Implement `bsc_capacity(p)` returning $1 - H_2(p)$ in bits, handling $p\in\{0,1\}$ where $H_2 = 0$. Verify it is symmetric ($C(p) = C(1-p)$), equals 1 at $p=0$, and equals 0 at $p=\tfrac12$.
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

        def bsc_capacity(p):
            # TODO: if p is 0 or 1, H2 = 0; else H2 = -p log2 p - (1-p) log2(1-p)
            _h2 = ...
            return ...

        # print(bsc_capacity(0.0))   # expect 1.0
        # print(bsc_capacity(0.5))   # expect 0.0
        # print(bsc_capacity(0.1), bsc_capacity(0.9))   # expect equal, ~0.531

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: BEC Capacity by Direct Mutual Information

    Build the BEC channel matrix for erasure probability $\varepsilon$ (rows = inputs 0,1; cols = outputs 0,1,e), then compute its capacity by maximizing $I(X;Y)$ over inputs — but here just use the uniform input, which is optimal by symmetry. Confirm you get $1 - \varepsilon$.
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

        def mutual_information(px, Q, base=2):
            px = np.asarray(px, dtype=float)
            Q = np.asarray(Q, dtype=float)
            pxy = px[:, None] * Q
            py = pxy.sum(axis=0)
            _m = pxy > 0
            _ratio = np.zeros_like(pxy)
            _ratio[_m] = pxy[_m] / (px[:, None] * py[None, :])[_m]
            return float(np.sum(pxy[_m] * np.log(_ratio[_m])) / np.log(base))

        eps = 0.2
        # TODO: build the 2x3 BEC matrix [[1-eps, 0, eps], [0, 1-eps, eps]]
        Q = ...
        # TODO: mutual information at uniform input
        C = ...

        # print(f"BEC capacity = {C:.4f}, should equal 1 - eps = {1 - eps:.4f}")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: One Step of Blahut–Arimoto

    Implement a single Blahut–Arimoto iteration. Given the current input `px` and channel `Q`: (A) form the posterior $\Phi_{x\mid y} = p(x)Q_{xy} / p(y)$, then (B) compute $\log r_x = \sum_y Q_{xy}\log\Phi_{x\mid y}$ and return the new normalized $p(x) \propto r_x$. Run it a few times on a Z-channel and watch `px` drift away from uniform.
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

        def ba_step(px, Q):
            px = np.asarray(px, dtype=float)
            Q = np.asarray(Q, dtype=float)
            py = px @ Q
            # TODO: posterior Phi[x,y] = px[x]*Q[x,y] / py[y]  (guard py>0)
            Phi = ...
            # TODO: log r_x = sum_y Q[x,y] * log Phi[x,y] over entries where Q>0 and Phi>0
            log_r = ...
            # TODO: r = exp(log_r - max), new_px = r / sum(r)
            new_px = ...
            return new_px

        Z = np.array([[1.0, 0.0], [0.3, 0.7]])
        px = np.array([0.5, 0.5])
        # for _ in range(20):
        #     px = ba_step(px, Z)
        # print("converged input ~", np.round(px, 4))   # NOT [0.5, 0.5]

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Full Capacity Solver with Convergence Bounds

    Wrap the step from Exercise 4 into a loop that iterates to convergence, then compute the two-sided certificate $d_x = \sum_y Q_{xy}\log_2\frac{\Phi_{x\mid y}}{p(x)}$ with $C_{\text{lower}} = \sum_x p(x) d_x$ and $C_{\text{upper}} = \max_x d_x$. When the gap is tiny, both equal $C$. Test on a BSC ($p=0.1$, expect $\approx 0.531$) and a noiseless 3x3 (expect $\log_2 3 \approx 1.585$).
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

        def capacity(Q, max_iter=1000, tol=1e-12):
            Q = np.asarray(Q, dtype=float)
            n_in = Q.shape[0]
            px = np.ones(n_in) / n_in
            Phi = np.zeros_like(Q)
            for _ in range(max_iter):
                py = px @ Q
                # TODO: posterior Phi (guard py>0); new px via the r_x rule; break when change < tol
                ...
            # TODO: d_x = sum_y Q[x,y] * log2(Phi[x,y]/px[x]) over valid entries
            d = ...
            C_lower = ...   # sum_x px[x]*d[x]
            C_upper = ...   # max_x d[x]
            return px, C_lower, C_upper

        # px, lo, hi = capacity([[0.9, 0.1], [0.1, 0.9]])
        # print(f"BSC: C in [{lo:.4f}, {hi:.4f}]")       # ~0.531
        # px, lo, hi = capacity(np.eye(3))
        # print(f"noiseless 3x3: C in [{lo:.4f}, {hi:.4f}]")  # ~1.585

    _run()
    return


if __name__ == "__main__":
    app.run()
