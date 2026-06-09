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
    # 5C: Network Information Theory

    > *"In a network, the right question is not how fast can one link run, but which combinations of rates can all run at once."*
    > — the spirit of multi-user information theory

    *(Optional / advanced module. The course's critical path runs straight from Part 5 into Part 6; this module is a guided tour of the frontier you can take whenever you want to see what happens when more than two people share the wire. Nothing later depends on it.)*

    Every channel and source you have met so far has been **point-to-point**: one sender, one receiver, one wire. That is the world Shannon solved completely in 1948, and it is the world that powers a single modem talking to a single base station. But the moment you have *two* phones uploading to the same cell tower, *two* correlated sensors reporting to the same fusion center, or one router broadcasting to *many* laptops, the questions change shape. A single number — "the capacity" — is no longer enough. You need a **region**: the full set of rate-tuples that can be sustained *simultaneously*.

    This module gives you a taste of three pillars of network information theory. **Slepian–Wolf** shows the astonishing fact that two correlated sources can be compressed *separately*, with no communication between the encoders, yet hit the same total rate as if they were compressed jointly. The **multiple-access channel (MAC)** characterizes exactly which pairs of upload rates two users can share on one channel. And the **broadcast channel** flips it around: one transmitter, many receivers, superimposed messages. Throughout, the recurring object is the **achievable region** — a polygon (or curved body) in rate space — and your job is to learn to read it.

    By the end you will be able to plot a Slepian–Wolf region from a correlation parameter, explain why its corners are achievable, and see the same pentagon shape reappear for the multiple-access channel. This is where information theory stops being about one quantity and becomes about *geometry in rate space*.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Beyond Point-to-Point: Why a Region, Not a Number

    Shannon's single-user theory answers two questions with single numbers. *Source coding:* the fewest bits per symbol to store a source $X$ losslessly is its entropy $H(X)$. *Channel coding:* the most bits per use you can reliably push through a channel is its capacity $C = \max_{p(x)} I(X;Y)$. One source, one number. One channel, one number.

    Now add a second user. Two sources $X$ and $Y$, observed at *separate* locations, must each be compressed and sent to a common decoder. Two senders share one channel and each wants to deliver its own message. In each case there are now **two rates** to choose, $R_1$ and $R_2$, and they trade off against each other. Spending more of a shared resource on user 1 leaves less for user 2. The complete answer is therefore not a point but a **two-dimensional region**

    $$\mathcal{R} \subseteq \{(R_1, R_2) : R_1 \ge 0,\ R_2 \ge 0\},$$

    the set of all rate pairs that are simultaneously *achievable* — meaning there exist codes of those rates with error probability driven to zero as the block length grows. The boundary of $\mathcal{R}$ is the **rate region's frontier**, the Pareto-optimal trade-off curve. Single-user capacity is just the special case where the region is the interval $[0, C]$ on a line.

    Two features make these regions interesting and hard. First, they are typically **convex** — you can always time-share between two operating points by using one code for a fraction $\alpha$ of the block and the other for $1-\alpha$, achieving any convex combination. Second, the achievability proofs use clever new ideas (random binning, superposition coding, successive cancellation) that go well beyond the single-user random-coding argument. We will not prove the theorems, but we will *see* the regions and verify their corner points.

    > [Cover & Thomas Ch 15](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) is the standard textbook treatment of network information theory.
    > [Yeung](https://iest2.ie.cuhk.edu.hk/~whyeung/post/draft2.pdf) develops the same material with a network-coding lens.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Slepian–Wolf: Compressing Correlated Sources Separately

    Here is the headline result, and it is genuinely surprising. Two correlated sources, $X$ and $Y$, are observed at two physically separated encoders. Encoder 1 sees only $X$ and produces $nR_1$ bits; encoder 2 sees only $Y$ and produces $nR_2$ bits. The encoders **cannot talk to each other**. A single decoder receives both bitstreams and must reconstruct *both* $X$ and $Y$ losslessly.

    If you compressed them jointly (one encoder seeing both), you would need $H(X,Y)$ bits per symbol pair — that is just the joint source-coding theorem. The shocking **Slepian–Wolf theorem (1973)** says the *separate* encoders can hit the same total $H(X,Y)$, provided each individual rate covers the conditional uncertainty. The achievable region is

    $$\boxed{\;R_1 \ge H(X \mid Y), \qquad R_2 \ge H(Y \mid X), \qquad R_1 + R_2 \ge H(X, Y).\;}$$

    Read the three constraints geometrically. They carve out an **infinite pentagon** in the $(R_1, R_2)$ plane: a vertical wall at $R_1 = H(X|Y)$, a horizontal wall at $R_2 = H(Y|X)$, and a diagonal wall $R_1 + R_2 = H(X,Y)$ cutting the corner. The two "corner points" of the dominant face are especially meaningful:

    - **Corner A:** $(R_1, R_2) = \big(H(X),\, H(Y\mid X)\big)$. Encoder 1 sends $X$ at its *full* entropy (no help), and encoder 2 sends $Y$ compressed down to only the part the decoder cannot already predict from $X$.
    - **Corner B:** $(R_1, R_2) = \big(H(X\mid Y),\, H(Y)\big)$. The symmetric story with the roles swapped.

    Both corners have total rate $H(X) + H(Y|X) = H(X,Y) = H(Y) + H(X|Y)$ — the chain rule, reappearing as the diagonal facet. The miracle is the *non-corner* operating points: encoder 2 can go *below* $H(Y)$, all the way down to $H(Y|X)$, even though it never sees $X$. The trick is **random binning** — encoder 2 hashes its sequence into one of $2^{nR_2}$ bins, and the decoder uses the received $X$ (which is jointly typical with $Y$) to disambiguate which sequence in the bin was sent. With high probability only one bin member is jointly typical with $X$, so the decode succeeds.

    > [Cover & Thomas Ch 15.4](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) proves Slepian–Wolf via random binning and joint typicality.
    > [Csiszár & Körner Ch 13](https://www.cambridge.org/core/books/information-theory/contents/EE0A80439BEAC23B499A71942AFF7B34) gives the method-of-types proof for the same region.
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

        _joint = np.array([
            [0.30, 0.05],
            [0.10, 0.55],
        ])
        print(f"sum of joint = {_joint.sum():.3f}  (must be 1)")

        _px = _joint.sum(axis=1)
        _py = _joint.sum(axis=0)

        _H_X = _entropy(_px)
        _H_Y = _entropy(_py)
        _H_XY = _entropy(_joint.ravel())
        _H_X_given_Y = _H_XY - _H_Y
        _H_Y_given_X = _H_XY - _H_X

        print("\n=== Slepian-Wolf region constraints (bits/symbol pair) ===")
        print(f"  H(X)        = {_H_X:.4f}")
        print(f"  H(Y)        = {_H_Y:.4f}")
        print(f"  H(X,Y)      = {_H_XY:.4f}   <- total-rate floor R1+R2")
        print(f"  H(X|Y)      = {_H_X_given_Y:.4f}   <- floor on R1")
        print(f"  H(Y|X)      = {_H_Y_given_X:.4f}   <- floor on R2")

        print("\nCorner A = (H(X), H(Y|X)) = "
              f"({_H_X:.4f}, {_H_Y_given_X:.4f}),  total = {_H_X + _H_Y_given_X:.4f}")
        print("Corner B = (H(X|Y), H(Y)) = "
              f"({_H_X_given_Y:.4f}, {_H_Y:.4f}),  total = {_H_X_given_Y + _H_Y:.4f}")
        print(f"Both corner totals equal H(X,Y) = {_H_XY:.4f}  (chain rule = the diagonal facet)")

        _separate_naive = _H_X + _H_Y
        print(f"\nNaive separate (ignore correlation): H(X)+H(Y) = {_separate_naive:.4f} bits")
        print(f"Slepian-Wolf separate (use it):       H(X,Y)    = {_H_XY:.4f} bits")
        print(f"Bits saved by exploiting correlation:           = {_separate_naive - _H_XY:.4f} bits")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Explore the Slepian–Wolf Rate Region

    Time to make the pentagon move. We model two correlated **binary** sources with a symmetric joint distribution controlled by two knobs:

    - **Bias** $p = P(X = 1)$ sets how skewed each marginal is. (We keep $Y$'s marginal matched to $X$'s for a clean symmetric picture.)
    - **Correlation** $\rho$ sets how tightly $Y$ tracks $X$. At $\rho = 0$ the sources are independent ($H(X|Y) = H(X)$, the pentagon degenerates to a rectangle's corner). At $\rho \to 1$ the sources are nearly identical ($H(X|Y) \to 0$, the diagonal facet collapses toward the axes and the *total* rate plummets toward $H(X)$).

    Concretely we build the $2\times 2$ joint $p(x,y)$ so that each marginal is $\mathrm{Bernoulli}(p)$ and the normalized correlation between the two bits equals $\rho$. From that joint we read off all five constraints and shade the achievable region — everything **up and to the right** of the pentagon boundary. Watch the two red corner points slide along the diagonal facet, and watch the whole region shrink toward the origin as $\rho$ rises: more correlation means fewer bits needed.
    """)
    return


@app.cell
def _(mo):
    sw_bias = mo.ui.slider(start=0.05, stop=0.95, step=0.01, value=0.5, label="p = P(X=1)  (marginal bias)")
    sw_bias
    return (sw_bias,)


@app.cell
def _(mo):
    sw_rho = mo.ui.slider(start=0.0, stop=0.95, step=0.01, value=0.6, label="correlation ρ between X and Y")
    sw_rho
    return (sw_rho,)


@app.cell
def _(sw_bias, sw_rho):
    def _run(sw_bias, sw_rho):
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        _p = sw_bias.value
        _rho = sw_rho.value

        _std = np.sqrt(_p * (1 - _p))
        _cov = _rho * _std * _std
        _p11 = _p * _p + _cov
        _p10 = _p - _p11
        _p01 = _p - _p11
        _p00 = 1.0 - _p11 - _p10 - _p01

        _eps = 1e-12
        _joint = np.array([[_p00, _p01], [_p10, _p11]])
        _joint = np.clip(_joint, 0.0, None)
        _joint = _joint / _joint.sum()

        _px = _joint.sum(axis=1)
        _py = _joint.sum(axis=0)
        _H_X = _entropy(_px)
        _H_Y = _entropy(_py)
        _H_XY = _entropy(_joint.ravel())
        _H_X_given_Y = max(_H_XY - _H_Y, 0.0)
        _H_Y_given_X = max(_H_XY - _H_X, 0.0)

        _r1max = max(_H_X * 1.4, 1.2)
        _r2max = max(_H_Y * 1.4, 1.2)

        _fig, _ax = plt.subplots(figsize=(7, 6))

        _verts = [
            (_r1max, _r2max),
            (_r1max, _H_Y_given_X),
            (_H_X, _H_Y_given_X),
            (_H_X_given_Y, _H_Y),
            (_H_X_given_Y, _r2max),
        ]
        _poly = plt.Polygon(_verts, closed=True, facecolor="steelblue",
                            alpha=0.25, edgecolor="steelblue", lw=2, label="achievable region")
        _ax.add_patch(_poly)

        _ax.axvline(_H_X_given_Y, color="gray", ls=":", alpha=0.6)
        _ax.axhline(_H_Y_given_X, color="gray", ls=":", alpha=0.6)
        _dx = np.array([_H_X_given_Y, _H_X])
        _dy = np.array([_H_Y, _H_Y_given_X])
        _ax.plot(_dx, _dy, color="darkorange", lw=2.5,
                 label=f"R1+R2 = H(X,Y) = {_H_XY:.3f}")

        _ax.scatter([_H_X], [_H_Y_given_X], color="red", s=70, zorder=5)
        _ax.annotate("A = (H(X), H(Y|X))", xy=(_H_X, _H_Y_given_X),
                     xytext=(8, 8), textcoords="offset points", color="red", fontsize=9)
        _ax.scatter([_H_X_given_Y], [_H_Y], color="red", s=70, zorder=5)
        _ax.annotate("B = (H(X|Y), H(Y))", xy=(_H_X_given_Y, _H_Y),
                     xytext=(8, 8), textcoords="offset points", color="red", fontsize=9)

        _ax.scatter([_H_X], [_H_Y], color="black", s=40, marker="x", zorder=6)
        _ax.annotate("naive (H(X), H(Y))", xy=(_H_X, _H_Y),
                     xytext=(8, -14), textcoords="offset points", color="black", fontsize=8)

        _ax.set_xlim(0, _r1max)
        _ax.set_ylim(0, _r2max)
        _ax.set_xlabel("R1  (rate for encoder 1, bits/symbol)")
        _ax.set_ylabel("R2  (rate for encoder 2, bits/symbol)")
        _ax.set_title(f"Slepian-Wolf region   p={_p:.2f}, rho={_rho:.2f}   "
                      f"H(X|Y)={_H_X_given_Y:.3f}, H(Y|X)={_H_Y_given_X:.3f}")
        _ax.legend(loc="upper right", fontsize=8)
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    _run(sw_bias, sw_rho)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. A Working Slepian–Wolf Demo: Random Binning

    Talk is cheap; let us actually *do* the impossible-sounding thing. We will compress $Y$ at a rate **below** its own entropy $H(Y)$, with an encoder that never sees $X$, and still decode it perfectly using the side information $X$ at the decoder. The mechanism is **random binning**.

    Setup: $X$ and $Y$ are length-$n$ correlated binary sequences. The decoder already has $X$ (the side-information version of **Slepian–Wolf**). The encoder for $Y$ does *not* see $X$. It assigns every possible $y$-sequence a random **syndrome** (bin label) of $m$ bits via a fixed random linear hash $H y \bmod 2$. It transmits only those $m$ bits — a rate of $m/n$ bits per symbol. The lossy analogue of this side-information problem is **Wyner–Ziv** coding, which 5A's rate-distortion language prepares you for.

    To decode, the receiver lists all $y'$ consistent with the received syndrome ($H y' = s$) and picks the one **closest in Hamming distance to $X$** (the most jointly typical with the side information). Because $X$ and $Y$ differ in only about $H(Y|X)\cdot n$ positions, as long as $m/n > H(Y|X)$ the correct $y$ is, with high probability, the unique near-$X$ member of its bin. We sweep the rate and watch the decoding error fall off a cliff exactly at the conditional entropy.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(7)

        def _h2(q):
            if q <= 0 or q >= 1:
                return 0.0
            return float(-q * np.log2(q) - (1 - q) * np.log2(1 - q))

        _n = 12
        _flip = 0.11
        _H_Y_given_X = _h2(_flip)
        print(f"Side-information Slepian-Wolf (Y given X at decoder)")
        print(f"  block length n = {_n}, crossover P(X!=Y) = {_flip}")
        print(f"  H(Y|X) = h2({_flip}) = {_H_Y_given_X:.4f} bits/symbol  <- the rate floor\n")

        _all = ((np.arange(2 ** _n)[:, None] >> np.arange(_n)[::-1]) & 1).astype(int)

        def _trial_error(m, trials=120):
            _bad = 0
            for _ in range(trials):
                _Hmat = _rng.integers(0, 2, size=(m, _n))
                _x = _rng.integers(0, 2, size=_n)
                _noise = (_rng.random(_n) < _flip).astype(int)
                _y = (_x + _noise) % 2
                _s = (_Hmat @ _y) % 2

                _syn = (_all @ _Hmat.T) % 2
                _match = np.all(_syn == _s, axis=1)
                _cands = _all[_match]
                _dist = np.sum(_cands != _x, axis=1)
                _yhat = _cands[np.argmin(_dist)]
                if not np.array_equal(_yhat, _y):
                    _bad += 1
            return _bad / trials

        print("  rate R=m/n      decode error")
        for _m in range(1, 9):
            _R = _m / _n
            _err = _trial_error(_m)
            _flag = "  <- below H(Y|X): fails" if _R < _H_Y_given_X else ""
            print(f"   m={_m:2d}  R={_R:.3f}    {_err:.3f}{_flag}")

        print(f"\nThe error collapses just above R = H(Y|X) = {_H_Y_given_X:.3f}.")
        print("We compressed Y below H(Y) without the encoder ever seeing X. That is binning.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Multiple-Access Channel (MAC) and Its Capacity Region

    Now flip from sources to channels. Two transmitters, user 1 and user 2, share **one** noisy channel into a single receiver — think of two phones uploading to the same cell tower. Each sends its own independent message; the channel mixes their inputs $X_1, X_2$ into a single output $Y$ via $p(y \mid x_1, x_2)$. What pairs of rates $(R_1, R_2)$ can both be delivered reliably?

    Ahlswede and Liao characterized the **capacity region** of the MAC. For a fixed pair of independent input distributions $p(x_1)p(x_2)$, the achievable rates are exactly the pentagon

    $$R_1 \le I(X_1; Y \mid X_2), \qquad R_2 \le I(X_2; Y \mid X_1), \qquad R_1 + R_2 \le I(X_1, X_2; Y),$$

    and the full capacity region is the convex hull over all input distributions. Notice the **same pentagon shape as Slepian–Wolf**, but with the inequalities flipped (channels are about *upper* bounds on rate; source coding about *lower* bounds on rate). The intuition for each facet:

    - $R_1 \le I(X_1; Y \mid X_2)$ is user 1's rate *if the receiver already knew $X_2$* — i.e. user 2's signal could be subtracted out. It is the best user 1 can hope for.
    - $R_1 + R_2 \le I(X_1, X_2; Y)$ is the **total** information the two inputs jointly convey about the output — a single-user bound on the combined "super-user."
    - The corner where both single-user bounds and the sum bound meet is achieved by **successive cancellation**: decode user 1 first treating user 2 as noise, subtract it, then decode user 2 cleanly. Swapping the decode order gives the other corner; time-sharing fills the segment between.

    A clean concrete case is the **binary erasure MAC** or, even simpler, the **binary adder channel**: $Y = X_1 + X_2 \in \{0,1,2\}$ with no noise. With each $X_i$ uniform Bernoulli, $I(X_1;Y|X_2) = 1$ bit (knowing $X_2$, the output reveals $X_1$ exactly), and the sum bound is $I(X_1,X_2;Y) = H(Y) = 1.5$ bits. So two users can push a *combined* 1.5 bits/use through a binary channel — more than either could alone, less than the 2 bits they would get on separate wires. The demo computes this region for a noisy adder channel.

    > [Cover & Thomas Ch 15.3](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) derives the MAC capacity region and the successive-cancellation corners.
    > [Csiszár & Körner Ch 14](https://www.cambridge.org/core/books/information-theory/contents/EE0A80439BEAC23B499A71942AFF7B34) treats multi-terminal channels via the method of types.
    """)
    return


@app.cell
def _(mo):
    mac_noise = mo.ui.slider(start=0.0, stop=0.45, step=0.01, value=0.0,
                             label="channel noise (output bit-flip probability)")
    mac_noise
    return (mac_noise,)


@app.cell
def _(mac_noise):
    def _run(mac_noise):
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        _eta = mac_noise.value

        _x1 = np.array([0, 1])
        _x2 = np.array([0, 1])
        _ys = np.array([0, 1, 2])

        def _clean_sum(a, b):
            return a + b

        def _channel(a, b):
            _out = np.zeros(3)
            _s = _clean_sum(a, b)
            _out[_s] += 1 - _eta
            if _s == 0:
                _out[1] += _eta
            elif _s == 2:
                _out[1] += _eta
            else:
                _out[0] += _eta / 2
                _out[2] += _eta / 2
            return _out

        _pY_given = {}
        for _a in _x1:
            for _b in _x2:
                _pY_given[(_a, _b)] = _channel(_a, _b)

        _pX1 = 0.5
        _pX2 = 0.5

        _pY = np.zeros(3)
        for _a in _x1:
            for _b in _x2:
                _pY += _pX1 ** (_a) * (1 - _pX1) ** (1 - _a) * \
                       _pX2 ** (_b) * (1 - _pX2) ** (1 - _b) * _pY_given[(_a, _b)]

        def _cond_mi_given_x2():
            _val = 0.0
            for _b in _x2:
                _pyb = np.zeros(3)
                for _a in _x1:
                    _pyb += 0.5 * _pY_given[(_a, _b)]
                _hy = _entropy(_pyb)
                _hcond = 0.0
                for _a in _x1:
                    _hcond += 0.5 * _entropy(_pY_given[(_a, _b)])
                _val += 0.5 * (_hy - _hcond)
            return _val

        _R1_bound = _cond_mi_given_x2()
        _R2_bound = _R1_bound
        _hy_total = _entropy(_pY)
        _hcond_total = 0.0
        for _a in _x1:
            for _b in _x2:
                _hcond_total += 0.25 * _entropy(_pY_given[(_a, _b)])
        _Rsum_bound = _hy_total - _hcond_total

        _fig, _ax = plt.subplots(figsize=(7, 6))

        _cA = (_R1_bound, min(_R2_bound, _Rsum_bound - _R1_bound))
        _cB = (min(_R1_bound, _Rsum_bound - _R2_bound), _R2_bound)
        _verts = [(0, 0), (_R1_bound, 0), _cA, _cB, (0, _R2_bound)]
        _poly = plt.Polygon(_verts, closed=True, facecolor="seagreen",
                            alpha=0.25, edgecolor="seagreen", lw=2, label="capacity region")
        _ax.add_patch(_poly)

        _ax.plot([_cA[0], _cB[0]], [_cA[1], _cB[1]], color="darkorange", lw=2.5,
                 label=f"R1+R2 = I(X1,X2;Y) = {_Rsum_bound:.3f}")
        _ax.scatter([_cA[0], _cB[0]], [_cA[1], _cB[1]], color="red", s=70, zorder=5)
        _ax.annotate("decode 1 then 2", xy=_cA, xytext=(6, -14),
                     textcoords="offset points", color="red", fontsize=8)
        _ax.annotate("decode 2 then 1", xy=_cB, xytext=(6, 6),
                     textcoords="offset points", color="red", fontsize=8)

        _ax.axvline(_R1_bound, color="gray", ls=":", alpha=0.6)
        _ax.axhline(_R2_bound, color="gray", ls=":", alpha=0.6)

        _ax.set_xlim(0, 1.15)
        _ax.set_ylim(0, 1.15)
        _ax.set_xlabel("R1  (user 1 rate, bits/use)")
        _ax.set_ylabel("R2  (user 2 rate, bits/use)")
        _ax.set_title(f"Binary-adder MAC capacity region   noise={_eta:.2f}\n"
                      f"single-user bound={_R1_bound:.3f}, sum bound={_Rsum_bound:.3f}")
        _ax.legend(loc="upper right", fontsize=8)
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    _run(mac_noise)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. A Taste of the Broadcast Channel

    The last pillar reverses the arrows: **one** transmitter, **many** receivers. A WiFi access point sending different movies to different laptops, a cellular base station serving users at different distances, a satellite covering a region of varied signal quality — all are broadcast channels. The sender has a private message for each receiver and one shared antenna; receiver $k$ sees output $Y_k$ through its own channel $p(y_k \mid x)$.

    Broadcast is genuinely harder than the MAC, and the general capacity region is still **open** after fifty years. But the **degraded broadcast channel** — where the receivers can be ordered from "best" to "worst", with the worse ones seeing a noisier version of what the better ones see — was solved by Cover and Bergmans, and its solution introduced one of the most influential ideas in the field: **superposition coding**.

    The idea is to *stack* messages by power and reliability. The transmitter sends a coarse, high-power "cloud center" carrying the weak receiver's message — robust enough that *everyone* can decode it — and superimposes on it a fine, low-power "satellite" cloud carrying the strong receiver's message. The strong receiver first decodes the coarse message, subtracts it, and then resolves the fine detail buried underneath. The weak receiver simply treats the fine layer as noise. For a binary-symmetric broadcast channel with crossover probabilities $p_1 < p_2$ (receiver 1 is the cleaner channel), splitting the input with a parameter $\beta \in [0, \tfrac12]$ gives the achievable region

    $$R_2 \le 1 - H_2(p_2 \star \beta), \qquad R_1 \le H_2(\beta \star p_1) - H_2(p_1),$$

    where $a \star b = a(1-b) + b(1-a)$ is binary convolution and $H_2$ is the binary entropy function. Sweeping $\beta$ traces the trade-off curve: at $\beta \to 0$ all rate goes to the weak user; at $\beta = \tfrac12$ all rate goes to the strong user.

    The deep payoff: superposition coding *beats time-sharing*. You can serve both receivers simultaneously, at rates outside the triangle you would get by simply splitting time between them. The demo below traces the degraded-broadcast region and overlays the time-sharing line so you can see superposition coding strictly win.

    > [Cover & Thomas Ch 15.6](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) covers the degraded broadcast channel and superposition coding.
    > [Yeung](https://iest2.ie.cuhk.edu.hk/~whyeung/post/draft2.pdf) places these regions in the broader multi-terminal landscape.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _h2(q):
            q = np.asarray(q, dtype=float)
            _out = np.zeros_like(q)
            _m = (q > 0) & (q < 1)
            _out[_m] = -q[_m] * np.log2(q[_m]) - (1 - q[_m]) * np.log2(1 - q[_m])
            return _out

        def _star(a, b):
            return a * (1 - b) + b * (1 - a)

        _p1 = 0.05
        _p2 = 0.20
        print(f"Degraded broadcast channel: BSC(p1={_p1}) [strong], BSC(p2={_p2}) [weak]\n")

        _betas = np.linspace(0.0, 0.5, 101)
        print("  beta     R1 (strong)    R2 (weak)     R1+R2")
        _R1s, _R2s = [], []
        for _idx, _b in enumerate(_betas):
            _R2 = float(1 - _h2(np.array([_star(_p2, _b)]))[0])
            _R1 = float(_h2(np.array([_star(_b, _p1)]))[0] - _h2(np.array([_p1]))[0])
            _R1s.append(_R1)
            _R2s.append(_R2)
            if _idx % 25 == 0:
                print(f"  {_b:.3f}    {_R1:.4f}        {_R2:.4f}       {_R1 + _R2:.4f}")

        _R1_solo = float(1 - _h2(np.array([_p1]))[0])
        _R2_solo = float(1 - _h2(np.array([_p2]))[0])
        print(f"\nSingle-user capacities: C1={_R1_solo:.4f} (strong), C2={_R2_solo:.4f} (weak)")

        _R1_arr = np.array(_R1s)
        _R2_arr = np.array(_R2s)
        _ts_R2 = _R2_solo * (1 - _R1_arr / _R1_solo)
        _gain = _R2_arr - _ts_R2
        _interior = _gain[1:-1]
        _best = int(np.argmax(_interior)) + 1
        print(f"\nAt an interior point beta={_betas[_best]:.3f}: superposition gives "
              f"R2={_R2_arr[_best]:.4f} at R1={_R1_arr[_best]:.4f},")
        print(f"  while time-sharing to that same R1 gives only R2={_ts_R2[_best]:.4f}.")
        print(f"  Superposition coding beats time-sharing by {_gain[_best]:.4f} bits at the same R1.")

        _fig, _ax = plt.subplots(figsize=(6.8, 4.4))
        _ax.plot(_R1_arr, _R2_arr, color="steelblue", lw=2.2, label="superposition boundary")
        _ax.plot([0, _R1_solo], [_R2_solo, 0], color="black", ls="--", lw=1.4, label="time-sharing")
        _ax.fill_between(_R1_arr, 0, _R2_arr, color="steelblue", alpha=0.12)
        _ax.scatter([_R1_arr[_best]], [_R2_arr[_best]], color="crimson", s=60, zorder=5)
        _ax.set_xlabel("R1: strong receiver (bits/use)")
        _ax.set_ylabel("R2: weak receiver (bits/use)")
        _ax.set_title("Degraded BSC broadcast region")
        _ax.set_xlim(0, _R1_solo * 1.03)
        _ax.set_ylim(0, _R2_solo * 1.08)
        _ax.grid(True, alpha=0.3)
        _ax.legend(fontsize=8, loc="upper right")
        plt.tight_layout()
        return _fig

    return _run()


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. The Unifying Picture: It Is All the Same Pentagon

    Step back and look at what you have plotted. The Slepian–Wolf region (Section 3) and the multiple-access region (Section 5) are *both pentagons* with a 45-degree diagonal facet, the same shape rotated and reflected. That is not a coincidence — it reflects a deep duality between **distributed source coding** and **multiple-access channels** that runs through all of network information theory.

    The recurring grammar of the field:

    - **Individual constraints** ($R_1 \le \text{something}$ or $R_1 \ge \text{something}$) bound each user's rate as if the others were genuinely known or could be cancelled. These are the vertical and horizontal walls.
    - **Sum constraints** ($R_1 + R_2 \le I(X_1,X_2;Y)$ or $R_1 + R_2 \ge H(X,Y)$) bound the aggregate, treating the users as one super-user. This is the diagonal facet, and it is always governed by a **joint** information quantity.
    - **Corners are achieved by ordering** — successive cancellation (channels) or sequential binning (sources) — and the segment between corners is filled by **time-sharing** (convexity).
    - **Superposition and binning** are the two great achievability techniques that let users share a resource far more efficiently than naive separation suggests.

    Once you see the pentagon, multi-user problems stop looking like a zoo of special cases and start looking like variations on one theme: a convex region in rate space, carved by individual and joint information quantities, with achievability driven by clever overlap rather than partition.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    Network information theory looks like a communications topic, but its ideas keep surfacing in modern ML — usually wherever *several streams of information must be combined or separated*:

    - **Distributed and federated learning.** When many clients each hold correlated data and must compress gradients or activations before sending them to a server, the right rate target is *not* each client's marginal entropy — it is the Slepian–Wolf style conditional entropy that accounts for correlation across clients. Gradient-compression schemes that exploit cross-client redundancy are distributed-source-coding in disguise.
    - **Multi-modal and sensor fusion.** Combining vision + audio + text, or many sensors reporting to one model, is a multi-terminal source-coding problem. The CEO problem and Slepian–Wolf bound how much each modality must contribute, and explain why correlated modalities can be heavily pruned without losing joint information.
    - **The information bottleneck and successive refinement.** Superposition coding (Section 6) is the channel-coding cousin of the *successive refinement* idea behind progressive/scalable neural compression and the layered representations in the information bottleneck (Module 6C): a coarse-to-fine stack where each layer adds detail on top of a robust base.
    - **Multi-access as resource allocation.** Training-time bandwidth between accelerators, attention as a shared channel many tokens contend for, and mixture-of-experts routing all have the flavor of a multiple-access channel — many sources competing for one bottleneck, with a capacity *region* rather than a single throughput.
    - **Side information everywhere.** The binning demo in Section 4 — "compress below entropy because the decoder has correlated side information" — is exactly the principle behind conditional generative models, retrieval-augmented compression, and any scheme where context lets you transmit less.

    With this taste of the multi-user frontier, you have seen information theory's reach extend from one wire to a whole network. Next, **Part 6** brings the entire course home, cashing in entropy, KL, mutual information, rate-distortion, and these multi-terminal ideas as the working machinery of machine learning — beginning with cross-entropy, KL, and maximum entropy in **Module 6A**.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the math-to-code translation for Slepian–Wolf regions, random binning, and the MAC. Work in bits throughout; expected answers are in the trailing comments.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Slepian–Wolf Constraints from a Joint

    Given a joint distribution `joint` (a 2D array, rows = X, cols = Y), compute the five Slepian–Wolf quantities $H(X)$, $H(Y)$, $H(X,Y)$, $H(X\mid Y)$, $H(Y\mid X)$ in bits, and verify that the two corner points $A=(H(X),H(Y\mid X))$ and $B=(H(X\mid Y),H(Y))$ have the same total rate $H(X,Y)$.
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

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        joint = np.array([
            [0.30, 0.05],
            [0.10, 0.55],
        ])

        # TODO: marginals p(x) and p(y) by summing the joint along the right axes
        px = ...
        py = ...

        # TODO: H(X), H(Y), H(X,Y) (flatten the joint for the last one)
        H_X = ...
        H_Y = ...
        H_XY = ...

        # TODO: conditional entropies via the chain rule
        H_X_given_Y = ...      # H(X,Y) - H(Y)
        H_Y_given_X = ...      # H(X,Y) - H(X)

        # print(H_X, H_Y, H_XY, H_X_given_Y, H_Y_given_X)
        # cornerA_total = H_X + H_Y_given_X
        # cornerB_total = H_X_given_Y + H_Y
        # print(np.isclose(cornerA_total, H_XY), np.isclose(cornerB_total, H_XY))
        # expected: both totals == H(X,Y) (~1.544 bits), both isclose -> True

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Bits Saved by Exploiting Correlation

    For the same kind of joint, compare *naive separate* coding (each source at its own marginal entropy, $H(X)+H(Y)$) against *Slepian–Wolf separate* coding (total $H(X,Y)$). Return the savings, and confirm the savings equal the **mutual information** $I(X;Y)$.
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

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        joint = np.array([
            [0.40, 0.10],
            [0.10, 0.40],
        ])

        px = joint.sum(axis=1)
        py = joint.sum(axis=0)

        # TODO: naive total and Slepian-Wolf total
        naive_total = ...        # H(X) + H(Y)
        sw_total = ...           # H(X,Y)

        # TODO: savings, and mutual information I(X;Y) = H(X)+H(Y)-H(X,Y)
        savings = ...
        mutual_info = ...

        # print(naive_total, sw_total, savings, mutual_info)
        # print(np.isclose(savings, mutual_info))
        # expected: savings == I(X;Y) -> True  (here ~0.278 bits)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Build a Correlated Binary Joint

    Write `make_joint(p, rho)` that returns the $2\times2$ joint for two bits with marginal $P(X{=}1)=P(Y{=}1)=p$ and correlation $\rho$. Use $\mathrm{Cov}=\rho\,p(1-p)$ and $P(1,1)=p^2+\mathrm{Cov}$. Verify the marginals come back as $p$, and that $\rho=0$ gives the independent product while $\rho\to1$ drives $H(X\mid Y)\to0$.
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

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        def make_joint(p, rho):
            var = p * (1 - p)
            cov = rho * var
            # TODO: build p11, p10, p01, p00 from p and cov, return 2x2 array [[p00,p01],[p10,p11]]
            p11 = ...
            p10 = ...
            p01 = ...
            p00 = ...
            return np.array([[p00, p01], [p10, p11]])

        # J0 = make_joint(0.5, 0.0)
        # print(J0)                                  # expect all 0.25 (independent)
        # J = make_joint(0.5, 0.8)
        # print(J.sum(axis=1))                       # marginals of X -> [0.5, 0.5]
        # HXgivenY = entropy(J.ravel()) - entropy(J.sum(axis=0))
        # print(HXgivenY)                            # small, shrinking toward 0 as rho->1

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Random-Binning Decoder with Side Information

    Compress one binary sequence `y` (correlated with side info `x` held at the decoder) below $H(Y)$ using a random linear hash. Encode `y` to a syndrome `s = (H @ y) % 2`; decode by listing all `y'` with `(H @ y') % 2 == s` and returning the one nearest in Hamming distance to `x`. Check that you recover `y` when the rate $m/n$ exceeds $H(Y\mid X)$.
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

        rng = np.random.default_rng(3)
        n = 16
        m = 8                       # rate m/n = 0.5 bits/symbol
        flip = 0.10                 # P(x != y); H(Y|X) = h2(0.10) ~ 0.469 < 0.5

        Hmat = rng.integers(0, 2, size=(m, n))
        x = rng.integers(0, 2, size=n)
        y = (x + (rng.random(n) < flip).astype(int)) % 2

        # TODO: syndrome of y under Hmat (mod 2)
        s = ...

        # enumerate all 2^n candidate sequences as rows of a (2^n, n) bit matrix
        allseq = ((np.arange(2 ** n)[:, None] >> np.arange(n)[::-1]) & 1).astype(int)

        # TODO: keep candidates whose syndrome matches s, then pick the one closest to x
        syn = ...                   # (Hmat @ allseq.T) % 2, shape (m, 2^n) or transpose-friendly
        keep = ...                  # boolean mask over candidates
        cands = ...
        yhat = ...                  # argmin Hamming distance to x

        # print("recovered y exactly:", np.array_equal(yhat, y))
        # expected: True (rate 0.5 > H(Y|X) ~ 0.469)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Multiple-Access Pentagon for the Binary Adder Channel

    For the noiseless binary adder channel $Y=X_1+X_2\in\{0,1,2\}$ with each $X_i$ uniform Bernoulli, compute the three MAC bounds $I(X_1;Y\mid X_2)$, $I(X_2;Y\mid X_1)$, and $I(X_1,X_2;Y)=H(Y)$ in bits, then report the pentagon corners. Confirm the single-user bounds are 1 bit and the sum bound is 1.5 bits.

    The very last line of this cell is the module-level run guard — leave it after the `return`.
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

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        # output distribution of Y = X1 + X2 with X1, X2 ~ Bernoulli(1/2)
        # P(Y=0)=1/4, P(Y=1)=1/2, P(Y=2)=1/4
        pY = np.array([0.25, 0.50, 0.25])

        # TODO: sum bound = H(Y) (the channel is noiseless, so H(Y|X1,X2)=0)
        Rsum = ...

        # TODO: single-user bound I(X1;Y|X2). Knowing X2, Y reveals X1 exactly,
        #       so this is H(X1) = 1 bit. Compute it as entropy of Bernoulli(1/2).
        R1 = ...
        R2 = ...

        # print(R1, R2, Rsum)                 # expect 1.0, 1.0, 1.5
        # cornerA = (R1, Rsum - R1)           # (1.0, 0.5)
        # cornerB = (Rsum - R2, R2)           # (0.5, 1.0)
        # print(cornerA, cornerB)
        # expected: R1=R2=1.0, Rsum=1.5, corners (1.0,0.5) and (0.5,1.0)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    # Course navigation cell
    mo.md(
        r"""
    ---

    [&#8593; Course home](../) &nbsp;|&nbsp; &#8592; Prev: [5B: Information Theory & Statistics](../5b_it_statistics/) &nbsp;|&nbsp; Next: [6A: Cross-Entropy, KL & Maximum Entropy](../6a_crossentropy_maxent/) &#8594;
    """
    )
    return


if __name__ == "__main__":
    app.run()
