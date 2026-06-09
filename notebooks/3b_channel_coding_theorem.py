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
    # 3B: The Noisy-Channel Coding Theorem

    > *"It is possible to transmit information through a noisy channel at any rate less than channel capacity with an arbitrarily small probability of error."*
    > — Claude Shannon, 1948

    In 3A you learned what a channel's **capacity** $C$ is: the maximum mutual information $\max_{p(x)} I(X;Y)$ between input and output. That number told you the *most information per channel use* you could ever hope to push through the noise. But it left a question hanging — a question so audacious that almost no one before Shannon thought to ask it: can you actually *achieve* that rate, and do so with **vanishing** error?

    The intuitive answer is no. Noise corrupts symbols; corruption causes mistakes; sending faster only makes it worse; so surely reliability demands you slow down toward zero rate. That intuition is **wrong**, and the depth of its wrongness is the most beautiful result in the field. Shannon proved that there is a sharp threshold — the capacity $C$ — below which you can drive the error probability *as close to zero as you like*, and above which reliable communication is *impossible*. There is no gentle trade-off. There is a **cliff**.

    This module is the crown jewel of Part 3. We will build the two halves of the theorem — **achievability** (you *can* get below the cliff, shown by Shannon's gorgeous random-coding argument) and the **converse** (you *cannot* climb above it, shown via **Fano's inequality**) — and you will watch the error probability fall off the cliff at $R = C$ with your own slider.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Block Codes and the Rate $R$

    To communicate over a noisy channel we do not send raw message symbols one at a time. We send **blocks**. The setup, fixed for the whole module:

    - We have $M$ equally likely messages $w \in \{1, 2, \dots, M\}$.
    - To send one, an **encoder** maps it to a **codeword** $x^n = (x_1, \dots, x_n)$ of length $n$ — a sequence of $n$ channel inputs. The set of all $M$ codewords is the **code** $\mathcal{C}$.
    - The channel acts on the codeword symbol by symbol (a *discrete memoryless channel*, DMC), producing an output block $y^n$.
    - A **decoder** maps $y^n$ back to an estimate $\hat{w}$ of the message. An error is the event $\hat{w} \ne w$.

    An $(M, n)$ code carries $\log_2 M$ bits of message in $n$ channel uses. Its **rate** is

    $$R = \frac{\log_2 M}{n} \quad \text{bits per channel use.}$$

    Equivalently $M = 2^{nR}$. A rate-$\tfrac12$ code packs 1 message bit into every 2 channel symbols; a rate-1 code uses one symbol per bit (no redundancy at all).

    **The trade-off, stated precisely.** Higher rate $R$ means more codewords $M = 2^{nR}$ crammed into the same output space — they crowd together, noise pushes one onto another, and errors rise. Lower rate spreads the codewords far apart so noise cannot bridge the gaps. The whole question is: *how far apart can we keep $2^{nR}$ codewords as $n \to \infty$, and what does that buy us?*

    **Worked example.** A $(16, 7)$ code has $M = 16$ messages in blocks of length $n = 7$. Its rate is $R = \log_2 16 / 7 = 4/7 \approx 0.571$ bits/use. (This is exactly the shape of the Hamming (7,4) code you will meet in 4A — 4 message bits in 7 transmitted bits.)

    > [MacKay Ch 9–10](https://www.inference.org.uk/itprnn/book.pdf) sets up block codes and rate; [Cover & Thomas Ch 7.5](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) gives the formal $(M,n)$ definitions.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def rate(M, n):
            return np.log2(float(M)) / n

        print("=== Block codes: rate R = log2(M) / n  (bits per channel use) ===")
        for _name, _M, _n in [
            ("repetition-3 (1 bit)", 2, 3),
            ("Hamming (7,4)", 16, 7),
            ("(16,7) code", 16, 7),
            ("rate-1/2, n=100", 2 ** 50, 100),
            ("uncoded (rate 1)", 2 ** 64, 64),
        ]:
            print(f"  {_name:22s}  M={_M:<22d}  n={_n:<4d}  R = {rate(_M, _n):.4f}")

        print("\nTwo ways to read the same code:")
        _n = 7
        for _R in [0.2, 0.4, 0.571, 0.8]:
            _M = 2 ** (_R * _n)
            print(f"  R = {_R:.3f}  ->  M = 2^(nR) = {_M:7.1f} codewords in blocks of length {_n}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Jointly-Typical Decoding

    To prove anything we need a decoder we can analyze. Nearest-neighbour decoding is hard to reason about; Shannon's trick was a decoder built directly out of the **typical set** machinery from 1C.

    Recall: as $n$ grows, a source's output sequences concentrate on a **typical set** of about $2^{nH}$ sequences, each roughly equiprobable (the AEP). The channel version pairs *inputs with outputs*. The **jointly typical set** $A_\epsilon^{(n)}$ is the set of pairs $(x^n, y^n)$ whose empirical statistics match the true joint distribution $p(x,y)$:

    $$A_\epsilon^{(n)} = \Big\{ (x^n, y^n) : \Big|{-\tfrac1n \log_2 p(x^n)} - H(X)\Big| < \epsilon,\ \Big|{-\tfrac1n \log_2 p(y^n)} - H(Y)\Big| < \epsilon,\ \Big|{-\tfrac1n \log_2 p(x^n,y^n)} - H(X,Y)\Big| < \epsilon \Big\}.$$

    Three facts (the **joint AEP**) make it the perfect decoding tool:

    1. **The truth is typical.** A genuinely transmitted pair $(x^n, y^n)$ lands in $A_\epsilon^{(n)}$ with probability $\to 1$.
    2. **Size.** $|A_\epsilon^{(n)}| \approx 2^{nH(X,Y)}$.
    3. **The key count.** If we draw an $\tilde{x}^n$ and $y^n$ *independently* from their marginals, the chance they look jointly typical is
       $$\Pr\big[(\tilde{x}^n, y^n) \in A_\epsilon^{(n)}\big] \approx 2^{-nI(X;Y)}.$$

    **The decoder.** Given $y^n$, look for the *unique* codeword $x^n(\hat w)$ that is jointly typical with $y^n$. If there is exactly one, decode to it. If there is none, or more than one, declare an error.

    Fact 3 is the whole ballgame. A *wrong* codeword is statistically independent of the received $y^n$, so it accidentally looks jointly typical with probability only $\approx 2^{-nI(X;Y)}$. You have $M - 1 \approx 2^{nR}$ wrong codewords. By the union bound the chance *some* wrong codeword fools the decoder is at most

    $$(2^{nR} - 1)\, 2^{-nI(X;Y)} \le 2^{-n(I(X;Y) - R)}.$$

    If $R < I(X;Y)$ the exponent is negative and this $\to 0$. **That single inequality is the engine of the entire theorem.**

    > [Cover & Thomas Ch 7.6–7.7](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) is the canonical treatment of joint typicality and joint-AEP decoding.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        print("=== The key count: P[wrong codeword looks jointly typical] ~ 2^(-n I) ===")
        print("Union bound on error:  P_err <= 2^(nR) * 2^(-nI) = 2^(-n(I - R))\n")

        _I = 0.6
        print(f"  Channel mutual information I(X;Y) = {_I} bits/use")
        print(f"  {'rate R':>8s} {'n':>5s} {'2^(-n(I-R))':>16s}   verdict")
        for _R in [0.3, 0.55, 0.65]:
            for _n in [50, 200, 1000]:
                _bound = 2.0 ** (-_n * (_I - _R))
                _verdict = "-> 0 (good)" if _R < _I else "blows up"
                print(f"  {_R:8.2f} {_n:5d} {_bound:16.3e}   {_verdict}")
            print()

        print("Below capacity the error bound vanishes exponentially in the block length n.")
        print("Above capacity the same expression explodes — foreshadowing the converse.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. The Random Coding Argument (Achievability)

    Here is Shannon's audacious idea, and it is one of the great moves in all of mathematics. We want to prove a *good* code exists. Instead of *constructing* one — fiendishly hard — Shannon **generates a code at random** and shows the *average* error over all random codes is tiny. If the average is tiny, at least one specific code must be at least as good. The good code is guaranteed to exist even though we never write it down.

    **The construction.** Fix an input distribution $p(x)$. Build the codebook by drawing every symbol of every codeword i.i.d. from $p(x)$:

    $$x_i(w) \sim p(x), \quad i = 1,\dots,n, \quad w = 1,\dots,M.$$

    Send message $w$, receive $y^n$, decode by joint typicality. Average the error probability over the random message *and* the random codebook.

    **The bound.** Two ways the decoder fails:

    - **(A)** the true pair $(x^n(w), y^n)$ is *not* jointly typical — probability $\to 0$ by joint-AEP fact 1;
    - **(B)** some wrong codeword $x^n(w')$ *is* jointly typical with $y^n$ — probability $\le (M-1)\,2^{-n(I(X;Y)-3\epsilon)}$ by fact 3 and the union bound.

    Put $M = 2^{nR}$. The total average error obeys

    $$\bar P_e \;\le\; \epsilon \;+\; 2^{nR}\,2^{-n(I(X;Y)-3\epsilon)} \;=\; \epsilon \;+\; 2^{-n(I(X;Y)-R-3\epsilon)}.$$

    If $R < I(X;Y)$, choose $\epsilon$ small; the exponent is positive and $\bar P_e \to 0$ as $n \to \infty$. Finally **maximize over the input distribution**: the best $p(x)$ gives $I(X;Y) = C$. So **every rate $R < C$ is achievable** with vanishing error. We even get to throw away the worst half of the codewords to convert "average is good" into "*maximal* error is good," costing only a factor of 2 in $M$ (a negligible $\tfrac1n$ in rate).

    **Why this is staggering.** The proof tells you a near-perfect code exists at any $R < C$ — but gives no construction. Closing that gap, building codes that *actually* reach capacity at practical block lengths, took **fifty years** (Turbo codes 1993, LDPC's rediscovery, polar codes 2009 — your Part 4). Shannon told us the treasure was there half a century before anyone could dig it up.

    The demo below *runs* the random-coding argument in miniature: it samples random codebooks over a binary symmetric channel and measures the average decoding error, watching it collapse as $n$ grows when $R < C$.

    > [MacKay Ch 10](https://www.inference.org.uk/itprnn/book.pdf) gives the cleanest narrative of random coding; [Cover & Thomas Ch 7.7](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) and [Gallager Ch 5](https://www.wiley-vch.de/de/fachgebiete/ingenieurwesen/elektrotechnik-und-elektronik-10ee/kommunikationstechnik-10ee2/information-theory-and-reliable-communication-978-0-471-29048-3) give the full proof and the random-coding error exponent.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def bsc_capacity(p):
            if p in (0.0, 1.0):
                return 1.0
            return 1.0 + p * np.log2(p) + (1 - p) * np.log2(1 - p)

        def simulate_random_code(R, n, p_flip, n_trials, rng):
            M = int(round(2 ** (n * R)))
            M = min(max(M, 2), 1024)
            R_eff = np.log2(M) / n
            errors = 0
            for _ in range(n_trials):
                book = rng.integers(0, 2, size=(M, n))
                w = rng.integers(0, M)
                flips = rng.random(n) < p_flip
                y = book[w] ^ flips.astype(int)
                dists = np.sum(book != y, axis=1)
                w_hat = int(np.argmin(dists))
                if w_hat != w:
                    errors += 1
            return errors / n_trials, R_eff

        _rng = np.random.default_rng(0)
        _p = 0.1
        _C = bsc_capacity(_p)
        print(f"=== Random coding over a BSC, flip prob p = {_p}  (capacity C = {_C:.3f} bits/use) ===\n")
        print("Rate R = 0.30  (well BELOW capacity): error should fall as n grows")
        for _n in [6, 10, 14, 18]:
            _pe, _Reff = simulate_random_code(0.30, _n, _p, 200, _rng)
            print(f"   n = {_n:2d}   effective R = {_Reff:.3f}   avg decoding error = {_pe:.3f}")

        print("\nRate R = 0.75  (ABOVE capacity): error stays high, no rescue from large n")
        for _n in [6, 10, 14, 18]:
            _pe, _Reff = simulate_random_code(0.75, _n, _p, 200, _rng)
            print(f"   n = {_n:2d}   effective R = {_Reff:.3f}   avg decoding error = {_pe:.3f}")

        print("\nThe average over random codebooks is small below C => a good code exists (achievability).")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. Fano's Inequality (the Converse Engine)

    Achievability says "$R < C$ works." The **converse** says "$R > C$ *cannot* work — error is bounded away from zero, no matter how clever your code." The tool that delivers it is a small, sharp lemma that stands on its own as one of the most useful inequalities in information theory.

    **Setup.** You want to guess $X$ from an observation $Y$, producing $\hat X = g(Y)$. Let $P_e = \Pr[\hat X \ne X]$ be the error probability. How small can the *remaining uncertainty* $H(X \mid Y)$ be if you make mistakes a fraction $P_e$ of the time? Fano's inequality answers:

    $$H(X \mid Y) \;\le\; H_2(P_e) \;+\; P_e \log_2(|\mathcal{X}| - 1),$$

    where $H_2$ is the binary entropy function. A slightly looser, very memorable form:

    $$P_e \;\ge\; \frac{H(X \mid Y) - 1}{\log_2 |\mathcal{X}|}.$$

    **Read it as a budget.** The residual uncertainty $H(X\mid Y)$ has to be "paid for" by errors. The $H_2(P_e)$ term is the cost of *admitting* you might be wrong; the $P_e \log_2(|\mathcal X|-1)$ term is the cost of *which* wrong answer it is among the alternatives. If $Y$ leaves a lot of uncertainty about $X$, you are *forced* to err often. You cannot be reliable about something you are deeply uncertain of.

    **Worked example.** Guessing one of $|\mathcal{X}| = 8$ symbols from a noisy $Y$ that leaves $H(X\mid Y) = 2$ bits of uncertainty. The loose bound gives $P_e \ge (2 - 1)/\log_2 8 = 1/3$. No decoder, however brilliant, can beat a $33\%$ error rate here.

    Drag the explorer below to see the Fano bound trace out the floor on $P_e$ as the residual uncertainty and alphabet size change.

    > [Cover & Thomas Ch 2.10 & 7.9](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) state and apply Fano; [MacKay Ch 10](https://www.inference.org.uk/itprnn/book.pdf) uses it for the converse.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def h2(p):
            if p <= 0 or p >= 1:
                return 0.0
            return -p * np.log2(p) - (1 - p) * np.log2(1 - p)

        def fano_upper_HXgivenY(pe, card):
            return h2(pe) + pe * np.log2(card - 1)

        def fano_lower_pe_loose(hxy, card):
            return (hxy - 1.0) / np.log2(card)

        def fano_lower_pe_tight(hxy, card):
            _grid = np.linspace(0, 1, 20001)
            _allow = np.array([fano_upper_HXgivenY(_q, card) for _q in _grid])
            _ok = np.flatnonzero(_allow >= hxy)
            return float(_grid[_ok[0]]) if len(_ok) else 1.0

        print("=== Fano's inequality ===")
        print("Tight form: H(X|Y) <= H2(Pe) + Pe*log2(|X|-1)")
        print("Loose  form: Pe >= (H(X|Y) - 1) / log2(|X|)\n")

        _card = 8
        print(f"  {'H(X|Y)':>8s}  {'loose floor':>12s}  {'tight floor':>12s}")
        for _hxy in [0.5, 1.0, 2.0, 2.8]:
            _loose = max(0.0, fano_lower_pe_loose(_hxy, _card))
            _tight = fano_lower_pe_tight(_hxy, _card)
            print(f"  {_hxy:8.2f}  {_loose:12.3f}  {_tight:12.3f}")

        print("\nThe tight bound is at least as strong as the loose one (tight floor >= loose floor).")
        print(f"For |X|=8, H(X|Y)=2.0: no decoder can do better than Pe = {fano_lower_pe_tight(2.0, 8):.3f}.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ### Fano-bound explorer

    Set the residual uncertainty $H(X\mid Y)$ and the alphabet size $|\mathcal X|$. The red region is **forbidden**: every decoder is pinned above the Fano floor on $P_e$.
    """)
    return


@app.cell
def _(mo):
    fano_HXY = mo.ui.slider(start=0.0, stop=4.0, step=0.05, value=2.0, label="residual uncertainty H(X|Y) (bits)")
    fano_card = mo.ui.slider(start=2, stop=32, step=1, value=8, label="alphabet size |X|")
    mo.vstack([fano_HXY, fano_card])
    return fano_HXY, fano_card


@app.cell
def _(fano_HXY, fano_card):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _card = int(fano_card.value)
        _hxy_raw = float(fano_HXY.value)
        _logK = np.log2(_card)
        _hxy = min(_hxy_raw, _logK)

        def _h2(p):
            out = np.zeros_like(p)
            _m = (p > 0) & (p < 1)
            out[_m] = -p[_m] * np.log2(p[_m]) - (1 - p[_m]) * np.log2(1 - p[_m])
            return out

        _pe = np.linspace(0, 1, 501)
        _tight_allow = _h2(_pe) + _pe * np.log2(max(_card - 1, 1))

        _floor_loose = min(1.0, max(0.0, (_hxy - 1.0) / _logK))

        _root = 0.0
        _exceed = np.where(_tight_allow >= _hxy)[0]
        if len(_exceed) > 0:
            _root = _pe[_exceed[0]]

        _fig, _ax = plt.subplots(figsize=(7.5, 4.2))
        _ax.plot(_pe, _tight_allow, lw=2, color="steelblue",
                 label=r"Fano ceiling on $H(X|Y)$: $H_2(P_e)+P_e\log_2(|X|-1)$")
        _label_hxy = f"your H(X|Y) = {_hxy:.2f} bits"
        if _hxy_raw > _logK:
            _label_hxy += f" (clamped from {_hxy_raw:.2f})"
        _ax.axhline(_hxy, color="darkorange", ls="-", lw=2, label=_label_hxy)
        _ax.axvspan(0, _root, color="red", alpha=0.15)
        _ax.axvline(_root, color="red", ls="--", alpha=0.8,
                    label=f"tight Fano floor: Pe >= {_root:.3f}")
        _ax.axvline(_floor_loose, color="green", ls=":", alpha=0.8,
                    label=f"loose floor: Pe >= {_floor_loose:.3f}")
        _ax.set_xlabel(r"error probability $P_e$")
        _ax.set_ylabel("uncertainty (bits)")
        _ax.set_title(f"Fano's inequality   (|X| = {_card}, max feasible H(X|Y) = log2|X| = {_logK:.2f})")
        _ax.set_xlim(0, 1)
        _ax.set_ylim(0, max(_logK, _hxy) * 1.1 + 0.1)
        _ax.legend(fontsize=8, loc="lower right")
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Converse: You Cannot Beat Capacity

    Now we chain Fano with the data-processing logic to prove the hard half. Suppose you use a rate-$R$ code over $n$ uses of a channel of capacity $C$. The message $W$ is uniform over $M = 2^{nR}$ values, so $H(W) = nR$. The decoder produces $\hat W$ from $Y^n$; let $P_e^{(n)} = \Pr[\hat W \ne W]$.

    Start from $H(W) = nR$ and peel it apart. Because $W \to X^n \to Y^n \to \hat W$ form a Markov chain, conditioning on $Y^n$ can only have learned at most $nC$ bits about $W$ — the channel simply cannot deliver more than $C$ bits per use ($I(X^n;Y^n) \le nC$ for a memoryless channel). Whatever uncertainty about $W$ survives in $Y^n$ is $H(W\mid Y^n) \ge H(W) - nC = n(R - C)$. Now apply Fano to that residual uncertainty (alphabet size $M$):

    $$H(W \mid Y^n) \le 1 + P_e^{(n)}\, \log_2 M = 1 + P_e^{(n)}\, nR.$$

    Combine the two and divide by $n$:

    $$n(R - C) \le H(W\mid Y^n) \le 1 + n R\, P_e^{(n)} \quad\Longrightarrow\quad P_e^{(n)} \;\ge\; 1 - \frac{C}{R} - \frac{1}{nR}.$$

    **Read the punchline.** If $R > C$ then $1 - C/R > 0$, and as $n \to \infty$ the $\tfrac{1}{nR}$ term vanishes, leaving

    $$\boxed{\;P_e^{(n)} \;\ge\; 1 - \frac{C}{R} \;>\; 0\;}$$

    The error probability is **bounded away from zero forever**. Bigger blocks do not help; cleverer codes do not help. Above capacity, reliable communication is flatly impossible. This is the *strong* converse's gentler cousin (the strong converse pushes $P_e \to 1$), but it already establishes the cliff.

    **Both halves together — Shannon's theorem.** Achievability ($R<C \Rightarrow$ error $\to 0$) and the converse ($R>C \Rightarrow$ error $\ge 1-C/R$) sandwich the behaviour into a step function. Capacity is not a soft guideline; it is a **wall**.

    **A useful surprise: feedback does not move this wall for a DMC.** If the transmitter sees the channel outputs noiselessly after each use, the capacity of a discrete memoryless channel is still $C$. Feedback can simplify coding, improve error exponents, and matter enormously for channels with memory or interaction, but it cannot raise the single-letter DMC capacity. That is one reason the no-feedback theorem above is already the central limit.

    > [Cover & Thomas Ch 7.9](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) and [Gallager Ch 5](https://www.wiley-vch.de/de/fachgebiete/ingenieurwesen/elektrotechnik-und-elektronik-10ee/kommunikationstechnik-10ee2/information-theory-and-reliable-communication-978-0-471-29048-3) prove the converse and strong converse in full.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        print("=== The converse floor:  Pe(n) >= 1 - C/R - 1/(nR)  for R > C ===\n")
        _C = 0.5
        print(f"Channel capacity C = {_C} bits/use\n")
        print(f"  {'rate R':>8s} {'1 - C/R':>10s}   {'asymptotic Pe floor':>20s}")
        for _R in [0.6, 0.8, 1.0]:
            _floor = 1 - _C / _R
            print(f"  {_R:8.2f} {_floor:10.3f}   {'forced error >= %.3f' % _floor:>20s}")

        print("\nBelow C the converse floor is negative (no constraint) -> achievability takes over:")
        for _R in [0.2, 0.4]:
            print(f"  R = {_R:.2f} < C:  1 - C/R = {1 - _C / _R:.3f}  (vacuous; error can -> 0)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. The Sharp Threshold — The Rate Cliff

    Stack the two results on one axis and the most famous picture in information theory appears:

    - $R < C$: achievability gives $P_e \to 0$.
    - $R > C$: the converse gives $P_e \ge 1 - C/R > 0$.

    For long blocks the error probability as a function of rate is essentially a **step function** with the step at $R = C$. Engineers call it the **rate cliff** or **waterfall**: keep dialing up the rate and the error stays near zero, near zero, near zero — then at $R = C$ it falls off a cliff to near one. There is no graceful degradation. Real capacity-approaching codes (turbo, LDPC) show exactly this waterfall, sharpening as the block length grows.

    The widget below makes the cliff yours to play with. Pick a channel (its noise sets $C$) and a block length $n$, and it **simulates random codes** at a sweep of rates, plotting measured decoding error against $R$. Watch the transition sit right at $C$ and sharpen as you raise $n$ — finite-$n$ codes round the corner; the cliff is the $n\to\infty$ limit.
    """)
    return


@app.cell
def _(mo):
    cliff_pflip = mo.ui.slider(start=0.01, stop=0.5, step=0.01, value=0.11, label="BSC flip probability p (sets capacity C)")
    cliff_n = mo.ui.slider(start=6, stop=20, step=1, value=12, label="block length n")
    mo.vstack([cliff_pflip, cliff_n])
    return cliff_n, cliff_pflip


@app.cell
def _(cliff_n, cliff_pflip):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _bsc_capacity(p):
            if p <= 0 or p >= 1:
                return 1.0 if p in (0.0, 1.0) else 0.0
            return 1.0 + p * np.log2(p) + (1 - p) * np.log2(1 - p)

        def _simulate(R, n, p_flip, n_trials, rng):
            M = int(round(2 ** (n * R)))
            M = min(max(M, 2), 1024)
            R_eff = np.log2(M) / n
            errors = 0
            for _ in range(n_trials):
                book = rng.integers(0, 2, size=(M, n))
                w = rng.integers(0, M)
                flips = (rng.random(n) < p_flip).astype(int)
                y = book[w] ^ flips
                dists = np.sum(book != y, axis=1)
                best = np.flatnonzero(dists == dists.min())
                w_hat = int(rng.choice(best))
                if w_hat != w:
                    errors += 1
            return errors / n_trials, R_eff

        _p = float(cliff_pflip.value)
        _n = int(cliff_n.value)
        _C = _bsc_capacity(_p)
        _rng = np.random.default_rng(7)

        _rates_requested = np.linspace(0.05, 0.98, 14)
        _sim = [_simulate(_R, _n, _p, 150, _rng) for _R in _rates_requested]
        _pe = np.array([_s[0] for _s in _sim])
        _rates = np.array([_s[1] for _s in _sim])

        _fig, _ax = plt.subplots(figsize=(7.5, 4.4))
        _ax.plot(_rates, _pe, "o-", color="crimson", lw=2, ms=5, label=f"random codes, n = {_n}")
        _ax.axvline(_C, color="black", ls="--", lw=2, label=f"capacity C = {_C:.3f}")
        _ax.axvspan(0, _C, color="green", alpha=0.08)
        _ax.axvspan(_C, 1.0, color="red", alpha=0.08)
        _ax.text(_C / 2, 0.92, "achievable\n(error -> 0)", ha="center", fontsize=9, color="green")
        _ax.text((_C + 1) / 2, 0.92, "forbidden\n(error bounded away)", ha="center", fontsize=9, color="darkred")
        _ax.set_xlabel("effective rate R = log2(M)/n (bits per channel use)")
        _ax.set_ylabel("measured decoding error")
        _ax.set_title(f"The rate cliff: BSC(p={_p:.2f}), block length n={_n}  (M capped at 1024)")
        _ax.set_xlim(0, 1)
        _ax.set_ylim(-0.03, 1.03)
        _ax.legend(loc="center left", fontsize=8)
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.vstack([
        mo.Html('<img src="../animations/rendered/ChannelCodingCliff.gif" alt="Animation of decoding error dropping below capacity and rising above the rate cliff" loading="lazy" style="max-width: 100%; height: auto;">'),
        mo.md("*Animation: error probability forms a rate cliff around channel capacity.*"),
    ])
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Why This Matters for Machine Learning

    The noisy-channel coding theorem looks like a communications result, but its fingerprints are all over modern machine learning:

    - **Fano's inequality is the universal lower bound on prediction error.** Whenever you bound how well *any* estimator can recover a label, parameter, or class from data, Fano is the workhorse. The minimax lower bounds in statistical learning theory — "no algorithm can do better than this error given this much information" — are Fano's inequality applied to a cleverly constructed packing of hypotheses. Capacity becomes the information the data carries about the target.
    - **Channel capacity = the rate of reliable learning.** Cast learning as decoding: nature picks a hypothesis (the "message"), the data is the noisy "received signal," the learner is the "decoder." Then the number of samples needed to identify the hypothesis is governed by exactly the $\log M / I$ bookkeeping of this module. The "rate cliff" reappears as **sample-complexity thresholds** — below a critical sample size you cannot learn; above it you can.
    - **The information bottleneck (Module 6C)** literally treats a neural network layer as a channel and asks how much information about the label survives — a direct descendant of capacity and the data-processing inequality you used in the converse.
    - **Random coding ≈ random features / random projections.** Shannon's "a random codebook is almost surely good" is the same phenomenon behind random-feature methods, the Johnson–Lindenstrauss lemma, and why huge randomly-initialized networks work: in high dimensions, random points are spread far apart with overwhelming probability.
    - **Error-correcting codes power reliable ML systems.** Robust distributed training, gradient coding against stragglers, and reliable storage of giant model checkpoints all rest on the achievability promise: redundancy buys reliability up to a hard limit.

    Next, **Module 3C** carries the theorem into the continuous world — differential entropy, the Gaussian channel, the Shannon–Hartley formula $C = \tfrac12\log_2(1 + \mathrm{SNR})$, and water-filling across parallel channels — the version of capacity that actually sizes your WiFi and your cell connection.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the math-to-code translation for block codes, joint typicality, random coding, Fano, and the cliff.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Rate and Codebook Size

    Implement `rate(M, n)` returning bits per channel use, and its inverse `num_codewords(R, n)` returning $M = 2^{nR}$. Test on a Hamming-shaped $(16, 7)$ code (expect $R = 4/7 \approx 0.571$) and confirm the round-trip $M \to R \to M$ recovers $16$.
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

        def rate(M, n):
            # TODO: bits per channel use = log2(M) / n
            return ...

        def num_codewords(R, n):
            # TODO: invert the rate formula, M = 2^(n R)
            return ...

        # print(rate(16, 7))                      # expect ~0.5714
        # print(num_codewords(rate(16, 7), 7))    # expect ~16.0

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: The Joint-Typicality Error Bound

    The probability that *some* wrong codeword fools a joint-typicality decoder is at most $2^{-n(I - R)}$. Implement that bound and confirm it vanishes as $n$ grows when $R < I$, and explodes when $R > I$.
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

        def union_error_bound(I, R, n):
            # TODO: return 2^(-n (I - R))
            return ...

        # for n in [50, 200, 1000]:
        #     print(n, union_error_bound(0.6, 0.3, n))   # -> 0 fast (R < I)
        #     print(n, union_error_bound(0.6, 0.8, n))   # blows up (R > I)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Fano's Floor on Error

    Implement both forms of Fano. The loose floor is $P_e \ge (H(X\mid Y) - 1)/\log_2|\mathcal X|$; the tight ceiling is $H(X\mid Y) \le H_2(P_e) + P_e\log_2(|\mathcal X|-1)$. Use the loose form to find the minimum error when $|\mathcal X| = 8$ and $H(X\mid Y) = 2$ bits (expect $1/3$).
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

        def h2(p):
            if p <= 0 or p >= 1:
                return 0.0
            # TODO: binary entropy -p log2 p - (1-p) log2 (1-p)
            return ...

        def fano_floor_pe(HXgivenY, card):
            # TODO: loose form (HXgivenY - 1) / log2(card), clipped at 0 below
            return ...

        # print(fano_floor_pe(2.0, 8))    # expect ~0.3333

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Simulate a Random Code on the BSC

    Write a Monte-Carlo simulation of joint-typicality-style (nearest-neighbour) decoding of a random codebook over a binary symmetric channel. Confirm that at a rate well below the BSC capacity, the average decoding error shrinks as $n$ grows.
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

        rng = np.random.default_rng(0)

        def simulate(R, n, p_flip, n_trials):
            M = max(int(round(2 ** (n * R))), 2)
            errors = 0
            for _ in range(n_trials):
                # TODO: random codebook of shape (M, n) of bits
                book = ...
                # TODO: pick a random message w, transmit book[w] through the BSC (flip each bit w.p. p_flip)
                w = ...
                y = ...
                # TODO: decode by minimum Hamming distance to y; count an error if argmin != w
                w_hat = ...
                if w_hat != w:
                    errors += 1
            return errors / n_trials

        # for n in [6, 10, 14]:
        #     print(n, simulate(0.3, n, 0.1, 300))   # should trend downward

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Locate the Cliff

    For a BSC with capacity $C$, sweep the rate $R$ and find where the simulated error rises sharply. With short random-code simulations the error may not cross a fixed threshold like $0.5$; a robust diagnostic is the rate whose error is closest to $0.5$, then compare it to $C = 1 - H_2(p)$.

    This is the final exercise; its run guard launches the whole notebook.
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

        def h2(p):
            if p <= 0 or p >= 1:
                return 0.0
            return -p * np.log2(p) - (1 - p) * np.log2(1 - p)

        def bsc_capacity(p):
            # TODO: C = 1 - H2(p)
            return ...

        def simulate(R, n, p_flip, n_trials):
            M = max(int(round(2 ** (n * R))), 2)
            errors = 0
            for _ in range(n_trials):
                book = rng.integers(0, 2, size=(M, n))
                w = int(rng.integers(0, M))
                y = book[w] ^ (rng.random(n) < p_flip).astype(int)
                w_hat = int(np.argmin(np.sum(book != y, axis=1)))
                errors += int(w_hat != w)
            return errors / n_trials

        # p = 0.11; C = bsc_capacity(p)
        # rates = np.linspace(0.1, 0.95, 18)
        # TODO: simulate each rate, then choose the rate whose error is closest to 0.5; compare to C
        cliff_rate = ...

        # print(f"empirical cliff ~ {cliff_rate:.2f}   vs   C = {bsc_capacity(0.11):.3f}")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    # Course navigation cell
    mo.md(
        r"""
    ---

    [&#8593; Course home](../) &nbsp;|&nbsp; &#8592; Prev: [3A: Channels & Channel Capacity](../3a_channel_capacity/) &nbsp;|&nbsp; Next: [3C: Differential Entropy & the Gaussian Channel](../3c_gaussian_channel/) &#8594;
    """
    )
    return


if __name__ == "__main__":
    app.run()
