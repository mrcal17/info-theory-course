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
    # 4D: LDPC, Polar & Modern Codes

    > *"The decoding problem is a problem of inference on a graph."*
    > — the message-passing credo, after Pearl, Gallager, and MacKay

    Welcome to the codes that actually run your world. The bits on your 5G phone, your Wi-Fi link, the hard drive in your laptop, the photographs beamed back from deep space — almost all of them are protected by the two families we build in this module: **low-density parity-check (LDPC) codes** and **polar codes**. Both come within a hair's breadth of the Shannon limit you proved was the ceiling in Module 3B, and both decode in (near) linear time. For forty years that combination seemed impossible. This is the module where it stops being impossible.

    The trick is to stop thinking of a code as an algebraic object and start thinking of it as a *graph*. A parity-check matrix becomes a **Tanner graph**; decoding becomes **belief propagation** — local messages, passed back and forth, that converge on the right answer. You already met the trellis and the Viterbi algorithm in 4C; this is the same idea (inference on a graph) pushed to its limit, on graphs sparse enough that the local computations stay cheap even for codes of length 100,000.

    We will build a belief-propagation decoder you can poke bit by bit, watch **density evolution** predict the exact noise level where decoding tips from "works" to "fails" (the **threshold**), then change tack entirely and watch a channel *polarize* — Arıkan's astonishing 2009 idea that turns the noisy-channel coding theorem into an explicit, provably capacity-achieving construction. We close with **fountain codes**, the rateless trick behind reliable multicast. By the end you will understand not just *that* modern codes reach capacity, but *how* — and why it all reduces to passing little messages around a graph.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Tanner Graphs: A Code Is a Bipartite Graph

    In Module 4A you learned that a binary linear code is the null space of a **parity-check matrix** $H$: a codeword $\mathbf{x} \in \{0,1\}^n$ is exactly a vector with $H\mathbf{x} = \mathbf{0}$ over GF(2). Every row of $H$ is one parity-check equation — "these particular bits must XOR to zero."

    A **Tanner graph** draws that matrix as a bipartite graph with two kinds of node:

    - **Variable nodes** $v_1, \dots, v_n$ — one per codeword bit (the columns of $H$).
    - **Check nodes** $c_1, \dots, c_m$ — one per parity equation (the rows of $H$).

    We connect $v_j$ to $c_i$ **iff** $H_{ij} = 1$, i.e. bit $j$ participates in check $i$. The whole code is *defined* by which wires exist. Take the $(7,4)$ Hamming code's parity-check matrix:

    $$H = \begin{pmatrix} 1&1&1&0&1&0&0 \\ 1&1&0&1&0&1&0 \\ 1&0&1&1&0&0&1 \end{pmatrix}$$

    Check $c_1$ touches bits $\{1,2,3,5\}$; the constraint is $x_1 \oplus x_2 \oplus x_3 \oplus x_5 = 0$. Three checks, seven bits, and the codewords are precisely the bit-assignments satisfying all three.

    The word **low-density** in *LDPC* is the whole game: $H$ is **sparse** — each check touches only a handful of bits ($d_c$ of them), each bit only a handful of checks ($d_v$). A *regular* $(d_v, d_c)$ LDPC code has those degrees constant. Sparsity is what makes the local message updates cheap and, crucially, what makes the graph *locally tree-like*, which is the property the whole convergence theory leans on.

    > [MacKay Ch 47](https://www.inference.org.uk/itprnn/book.pdf) introduces LDPC codes and Tanner graphs — MacKay co-rediscovered these codes in the 1990s.
    > [Richardson & Urbanke Ch 2-3](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) is the definitive modern treatment of graphs, ensembles, and message passing.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _H = np.array([
            [1, 1, 1, 0, 1, 0, 0],
            [1, 1, 0, 1, 0, 1, 0],
            [1, 0, 1, 1, 0, 0, 1],
        ])
        _m, _n = _H.shape
        print("=== (7,4) Hamming code as a Tanner graph ===")
        print(f"  {_n} variable nodes, {_m} check nodes")
        print(f"  density of H = {_H.mean():.3f}  (fraction of 1s)\n")

        for _i in range(_m):
            _bits = [f"x{j+1}" for j in range(_n) if _H[_i, j]]
            print(f"  check c{_i+1}:  {' XOR '.join(_bits)} = 0   (touches {len(_bits)} bits)")

        print("\nVariable-node degrees (checks per bit):")
        print("  ", _H.sum(axis=0))
        print("Check-node degrees (bits per check):")
        print("  ", _H.sum(axis=1))

        _x = np.array([1, 0, 1, 0, 0, 1, 1])
        _syndrome = (_H @ _x) % 2
        print(f"\nIs x = {_x} a codeword?  syndrome H x = {_syndrome}  ->  "
              f"{'YES' if not _syndrome.any() else 'NO'}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Belief Propagation: Decoding as Inference on the Graph

    Given a received word, decoding asks: *what is the most likely codeword (or the most likely value of each bit)?* On a general graph that is NP-hard. But on a **tree** it is easy — and a sparse Tanner graph is *locally* a tree, so we run the tree algorithm anyway and it works astonishingly well. That algorithm is **belief propagation (BP)**, also called the **sum-product algorithm**: nodes exchange messages encoding their current beliefs, each node combines incoming messages, and after a few rounds the beliefs settle.

    Two message types flow along every edge:

    - **Variable → check** ($q_{j \to i}$): "Here is my belief about my own value, *excluding* what you (check $i$) already told me."
    - **Check → variable** ($r_{i \to j}$): "Given everyone else on my check, here is what I think *your* value must be to satisfy parity."

    The "excluding what you told me" — the **extrinsic** rule — is the heart of BP. A node must never feed a neighbour's own message back to it; that would be double-counting evidence and BP would convince itself of nonsense. Each outgoing message on an edge is built from *all incoming messages except the one on that same edge*.

    **Working in log-likelihoods.** It is numerically far nicer to pass **log-likelihood ratios (LLRs)**:

    $$L(x) = \log \frac{P(x = 0)}{P(x = 1)}.$$

    A large positive LLR means "almost surely 0," large negative means "almost surely 1," and zero means "no idea." Then the two updates become:

    - **Variable node** (degree $d_v$): just *add* the incoming LLRs (independent evidence adds in log-space),
      $$L_{j \to i} = L_j^{\text{ch}} + \sum_{i' \ne i} L_{i' \to j},$$
      where $L_j^{\text{ch}}$ is the channel's own LLR for bit $j$.
    - **Check node** (degree $d_c$): the parity constraint mixes signs and magnitudes via the *tanh rule*,
      $$\tanh\!\frac{L_{i \to j}}{2} = \prod_{j' \ne j} \tanh\!\frac{L_{j' \to i}}{2}.$$

    After enough iterations, the **posterior LLR** for each bit is the sum of its channel LLR and *all* incoming check messages; threshold the sign to decode. For codes whose graphs are big and sparse, this converges to near-ML performance in a handful of iterations — that is the miracle.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. BP on the Binary Erasure Channel — Peeling

    The cleanest place to *see* BP work is the **binary erasure channel (BEC)** from Module 3A: each bit is either received perfectly or erased (turned into "?") with probability $\epsilon$. There is no wrong information, only missing information — so the LLRs collapse to three states ($+\infty$ = known 0, $-\infty$ = known 1, $0$ = erased), and the whole tanh machinery degenerates into one dead-simple rule:

    > **A check can recover an erased bit iff it is the check's *only* erased neighbour.** Then that bit equals the XOR of the check's known bits.

    This is **iterative erasure decoding**, a.k.a. the **peeling decoder**. Repeat: find any check with exactly one remaining erasure, solve it, mark that bit known; loop until no such check exists. If every erasure gets peeled, you have decoded; if you get **stuck** (every unresolved check has $\ge 2$ erasures), the survivors form a **stopping set** and BP fails — even though an ML decoder might still succeed.

    The widget below is a live peeling decoder on the $(7,4)$ Hamming Tanner graph. Toggle which bits are erased and step the decoder; watch erasures get resolved one check at a time, or watch it jam on a stopping set.

    > [MacKay Ch 47.3](https://www.inference.org.uk/itprnn/book.pdf) walks through erasure decoding on the BEC.
    > [Richardson & Urbanke Ch 3.2](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) formalises stopping sets and the peeling decoder.
    """)
    return


@app.cell
def _(mo):
    bp_erasures = mo.ui.multiselect(
        options={f"bit {j+1}": j for j in range(7)},
        value=["bit 1", "bit 3", "bit 5"],
        label="Erased bits (the rest are received correctly)",
    )
    bp_steps = mo.ui.slider(start=0, stop=7, step=1, value=7, label="Peeling iterations to run")
    mo.vstack([bp_erasures, bp_steps])
    return bp_erasures, bp_steps


@app.cell
def _(bp_erasures, bp_steps):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _H = np.array([
            [1, 1, 1, 0, 1, 0, 0],
            [1, 1, 0, 1, 0, 1, 0],
            [1, 0, 1, 1, 0, 0, 1],
        ])
        _m, _n = _H.shape

        _true = np.array([1, 0, 1, 1, 0, 0, 1])
        _erased = np.zeros(_n, dtype=bool)
        for _j in bp_erasures.value:
            _erased[_j] = True

        _val = _true.copy()
        _known = ~_erased
        _resolved_order = np.full(_n, -1)

        _it = 0
        while _it < bp_steps.value:
            _progress = False
            for _i in range(_m):
                _nbrs = np.where(_H[_i] == 1)[0]
                _unk = [j for j in _nbrs if not _known[j]]
                if len(_unk) == 1:
                    _j = _unk[0]
                    _val[_j] = int(np.bitwise_xor.reduce(
                        [_val[k] for k in _nbrs if k != _j])) if len(_nbrs) > 1 else 0
                    _known[_j] = True
                    _resolved_order[_j] = _it
                    _progress = True
            _it += 1
            if not _progress:
                break

        _still = (~_known).sum()
        _pos_v = {j: (j, 1.0) for j in range(_n)}
        _pos_c = {i: (1.0 + 1.5 * i, 0.0) for i in range(_m)}
        for _j in range(_n):
            _pos_v[_j] = (0.6 * _j, 1.4)

        _fig, _ax = plt.subplots(figsize=(8.5, 4.2))
        for _i in range(_m):
            for _j in np.where(_H[_i] == 1)[0]:
                _ax.plot([_pos_v[_j][0], _pos_c[_i][0]],
                         [_pos_v[_j][1], _pos_c[_i][1]],
                         color="0.75", lw=1, zorder=1)

        for _j in range(_n):
            if _erased[_j] and not _known[_j]:
                _col, _lab = "crimson", "?"
            elif _erased[_j] and _known[_j]:
                _col, _lab = "mediumseagreen", str(_val[_j])
            else:
                _col, _lab = "steelblue", str(_val[_j])
            _ax.scatter(*_pos_v[_j], s=620, color=_col, zorder=3, edgecolors="k")
            _ax.text(*_pos_v[_j], _lab, ha="center", va="center",
                     color="white", fontweight="bold", zorder=4)
            _ax.text(_pos_v[_j][0], _pos_v[_j][1] + 0.22, f"v{_j+1}",
                     ha="center", fontsize=8)

        for _i in range(_m):
            _ax.scatter(*_pos_c[_i], s=620, marker="s", color="dimgray",
                        zorder=3, edgecolors="k")
            _ax.text(*_pos_c[_i], "+", ha="center", va="center",
                     color="white", fontweight="bold", fontsize=14, zorder=4)
            _ax.text(_pos_c[_i][0], _pos_c[_i][1] - 0.28, f"c{_i+1}",
                     ha="center", fontsize=8)

        _status = ("DECODED — all erasures peeled" if _still == 0
                   else f"STUCK on a stopping set — {_still} bit(s) unresolved")
        _ax.set_title(f"Peeling decoder on the (7,4) Hamming Tanner graph\n{_status}")
        _ax.axis("off")
        _ax.set_ylim(-0.6, 1.9)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.vstack([
        mo.Html('<img src="../animations/rendered/MessagePassing.gif" alt="Animation of belief-propagation messages moving between variable and check nodes" loading="lazy" style="max-width: 100%; height: auto;">'),
        mo.md("*Animation: belief-propagation messages move between variable nodes and check nodes.*"),
    ])
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. Density Evolution & the Decoding Threshold

    A single short code is anecdote; we want the *law*. **Density evolution** tracks how the probability distribution of the BP messages evolves from iteration to iteration, averaged over a whole random ensemble of $(d_v, d_c)$ codes. On the BEC it is breathtakingly simple, because a message is just "erased" or "known," so a single number — the erasure probability — suffices.

    Let $x_\ell$ be the probability that a variable-to-check message is still erased at iteration $\ell$, starting from $x_0 = \epsilon$ (the channel erasure rate). For a regular $(d_v, d_c)$ code:

    - **Check node:** the check-to-variable message is *known* only if **all** $d_c - 1$ other incoming messages are known. So the probability it is *erased* is $1 - (1 - x_\ell)^{\,d_c - 1}$.
    - **Variable node:** a variable-to-check message is *erased* only if the channel erased it **and** all $d_v - 1$ other incoming check messages are erased.

    Composing the two gives the **density-evolution recursion**:

    $$x_{\ell+1} = \epsilon \,\Big[\, 1 - (1 - x_\ell)^{\,d_c - 1} \,\Big]^{\,d_v - 1}.$$

    Iterate from $x_0 = \epsilon$. If $x_\ell \to 0$, decoding succeeds (in the infinite-blocklength limit); if it sticks at a positive fixed point, it fails. The **threshold** $\epsilon^\*$ is the largest channel erasure rate for which $x_\ell \to 0$ — a sharp phase transition. Below $\epsilon^\*$: works. Above: fails. There is essentially nothing in between.

    The threshold is the headline number for an LDPC ensemble — its practical "capacity." For a good irregular ensemble it can sit within a thousandth of the Shannon limit $\epsilon^\* \to 1 - R$ (capacity of the BEC is $1-\epsilon$, so a rate-$R$ code can hope for $\epsilon^\* \le 1-R$). The widget lets you pick $(d_v, d_c)$ and an $\epsilon$ and watch the recursion either crash to zero or jam at a fixed point.

    > [Richardson & Urbanke Ch 3-4](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) is the home of density evolution, thresholds, and EXIT charts.
    > [MacKay Ch 47](https://www.inference.org.uk/itprnn/book.pdf) gives the intuition for thresholds via the same recursion.
    """)
    return


@app.cell
def _(mo):
    de_dv = mo.ui.slider(start=2, stop=6, step=1, value=3, label="variable degree d_v")
    de_dc = mo.ui.slider(start=3, stop=12, step=1, value=6, label="check degree d_c")
    de_eps = mo.ui.slider(start=0.0, stop=0.7, step=0.005, value=0.40, label="channel erasure rate ε")
    mo.vstack([de_dv, de_dc, de_eps])
    return de_dc, de_dv, de_eps


@app.cell
def _(de_dc, de_dv, de_eps):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _dv, _dc = de_dv.value, de_dc.value
        _eps = de_eps.value

        def _step(x, eps):
            return eps * (1.0 - (1.0 - x) ** (_dc - 1)) ** (_dv - 1)

        def _converges(eps, iters=2000, tol=1e-12):
            _x = eps
            for _ in range(iters):
                _xn = _step(_x, eps)
                if _xn < tol:
                    return True, _xn
                if abs(_xn - _x) < 1e-15:
                    return False, _xn
                _x = _xn
            return _x < tol, _x

        _grid = np.linspace(0.001, 0.999, 999)
        _thresh = 0.0
        for _e in _grid:
            _ok, _ = _converges(_e)
            if _ok:
                _thresh = _e
            else:
                break

        _rate = 1.0 - _dv / _dc
        _shannon = 1.0 - _rate

        _traj = [_eps]
        for _ in range(40):
            _traj.append(_step(_traj[-1], _eps))
        _traj = np.array(_traj)
        _final = _traj[-1]

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(11, 4.2))

        _xs = np.linspace(0, 1, 400)
        _ax1.plot(_xs, _step(_xs, _eps), color="steelblue", lw=2, label=r"$f(x)=\epsilon[1-(1-x)^{d_c-1}]^{d_v-1}$")
        _ax1.plot(_xs, _xs, color="0.6", ls="--", label="x = x")
        for _k in range(min(12, len(_traj) - 1)):
            _ax1.plot([_traj[_k], _traj[_k]], [_traj[_k], _traj[_k + 1]], color="crimson", lw=0.9)
            _ax1.plot([_traj[_k], _traj[_k + 1]], [_traj[_k + 1], _traj[_k + 1]], color="crimson", lw=0.9)
        _ax1.set_xlabel("erasure prob. x (iteration ℓ)")
        _ax1.set_ylabel("x (iteration ℓ+1)")
        _ax1.set_title(f"Density-evolution cobweb at ε = {_eps:.3f}")
        _ax1.legend(fontsize=7, loc="upper left")
        _ax1.set_xlim(0, 1)
        _ax1.set_ylim(0, 1)
        _ax1.grid(True, alpha=0.3)

        _ax2.plot(_traj, marker="o", ms=3, color="crimson")
        _ax2.axhline(0, color="0.7", lw=1)
        _verdict = "CONVERGES → decode succeeds" if _final < 1e-6 else f"STUCK at x* = {_final:.3f} → fails"
        _ax2.set_xlabel("iteration ℓ")
        _ax2.set_ylabel("erasure probability xℓ")
        _ax2.set_title(f"({_dv},{_dc}) code, rate R={_rate:.3f}\n{_verdict}")
        _ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        print(f"=== ({_dv},{_dc}) regular LDPC ensemble ===")
        print(f"  design rate  R = 1 - dv/dc = {_rate:.4f}")
        print(f"  DE threshold ε* ≈ {_thresh:.4f}")
        print(f"  Shannon limit  1 - R = {_shannon:.4f}   (BEC capacity bound)")
        print(f"  gap to capacity ≈ {_shannon - _thresh:.4f}")
        print(f"  at ε = {_eps:.3f}: {'BELOW threshold (works)' if _eps < _thresh else 'ABOVE threshold (fails)'}")
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. EXIT Charts: Reading the Threshold off Two Curves

    Density evolution gives the threshold as a number; an **EXtrinsic Information Transfer (EXIT) chart** gives it as a *picture* — and it is the tool engineers actually use to design irregular codes. The idea (ten Brink): treat each component decoder — the variable nodes and the check nodes — as a box that takes in some amount of *a priori* information and emits some amount of *extrinsic* information, both measured as a mutual-information value in $[0,1]$.

    Plot the variable-node transfer curve $I_E^{(v)}$ vs. its input, and the check-node curve $I_E^{(c)}$ — *with axes swapped* — on the same square. Iterative decoding is then a staircase bouncing between the two curves: variable nodes hand information to check nodes, which hand more back, and so on. The decoder succeeds **iff a clear tunnel stays open** between the two curves all the way to the top-right corner $(1,1)$. The threshold is the channel quality at which the tunnel just barely pinches shut.

    On the BEC the EXIT functions are exactly the density-evolution maps in disguise (extrinsic information $= 1 -$ erasure probability), so we can draw a faithful chart from the same recursion. Watch the tunnel: open and wide below threshold, pinched shut above it. Designing a great LDPC code is literally **curve-fitting** — choosing a *mixture* of variable and check degrees so the two curves hug each other with a hair-thin tunnel, squeezing the threshold up against capacity.

    > [Richardson & Urbanke Ch 4](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) develops EXIT charts and the matching condition for capacity-achieving design.
    """)
    return


@app.cell
def _(mo):
    exit_dv = mo.ui.slider(start=2, stop=6, step=1, value=3, label="variable degree d_v")
    exit_dc = mo.ui.slider(start=3, stop=12, step=1, value=6, label="check degree d_c")
    exit_eps = mo.ui.slider(start=0.0, stop=0.7, step=0.005, value=0.42, label="channel erasure rate ε")
    mo.vstack([exit_dv, exit_dc, exit_eps])
    return exit_dc, exit_dv, exit_eps


@app.cell
def _(exit_dc, exit_dv, exit_eps):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _dv, _dc, _eps = exit_dv.value, exit_dc.value, exit_eps.value

        _IA = np.linspace(0, 1, 400)

        def _var_out(IA):
            _x = 1.0 - IA
            return 1.0 - _eps * _x ** (_dv - 1)

        def _chk_out(IA):
            _x = 1.0 - IA
            return 1.0 - (1.0 - (1.0 - _x) ** (_dc - 1))

        _Ev = _var_out(_IA)
        _Ec = _chk_out(_IA)

        _ia = 0.0
        _stairs_x, _stairs_y = [_ia], [_ia]
        for _ in range(40):
            _out_v = _var_out(_ia)
            _stairs_x.append(_ia)
            _stairs_y.append(_out_v)
            _next = _chk_out(_out_v)
            _stairs_x.append(_next)
            _stairs_y.append(_out_v)
            if abs(_next - _ia) < 1e-9:
                break
            _ia = _next
        if _ia > 0.999:
            _stairs_x.append(1.0)
            _stairs_y.append(1.0)

        _converged = _ia > 0.999

        _fig, _ax = plt.subplots(figsize=(6.2, 5.6))
        _ax.plot(_IA, _Ev, color="steelblue", lw=2.2, label="variable-node EXIT")
        _ax.plot(_Ec, _IA, color="darkorange", lw=2.2, label="check-node EXIT (swapped axes)")
        _ax.plot(_stairs_x, _stairs_y, color="crimson", lw=1.0, alpha=0.8, label="decoding trajectory")
        _ax.plot([0, 1], [0, 1], color="0.85", ls=":", lw=1)
        _ax.set_xlabel(r"$I_A$ (a priori) for variable node")
        _ax.set_ylabel(r"$I_E$ (extrinsic) from variable node")
        _tunnel = "OPEN tunnel → converges to (1,1)" if _converged else "tunnel PINCHED → stalls"
        _ax.set_title(f"EXIT chart, ({_dv},{_dc}) on BEC(ε={_eps:.3f})\n{_tunnel}")
        _ax.set_xlim(0, 1)
        _ax.set_ylim(0, 1)
        _ax.legend(fontsize=8, loc="lower right")
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()

        print("Read the chart: if the blue curve stays ABOVE the orange one")
        print("everywhere, a tunnel is open and BP marches to perfect decoding.")
        print(f"  ({_dv},{_dc}) on BEC(ε={_eps:.3f}): {'OPEN — succeeds' if _converged else 'CLOSED — fails'}")
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Channel Polarization & Polar Codes

    LDPC codes *approach* capacity empirically. In 2009 Erdal Arıkan did something different: he gave the first codes **provably** achieving capacity with an explicit construction and $O(n \log n)$ decoding. The idea is **channel polarization**, and it is one of the most beautiful constructions in the field.

    Start with $n = 2$ copies of a channel $W$ (capacity $I(W)$). Combine them with a single XOR:

    $$u_1, u_2 \;\longmapsto\; x_1 = u_1 \oplus u_2,\quad x_2 = u_2,$$

    send $x_1, x_2$ through two copies of $W$, and ask how good the two *synthetic* channels seen by $u_1$ and $u_2$ are. The chain rule of mutual information says the **total capacity is conserved**: $I(W^-) + I(W^+) = 2\,I(W)$. But it gets *redistributed*. The channel for $u_1$ (decoded first, with $u_2$ unknown) becomes **worse**: $I(W^-) \le I(W)$. The channel for $u_2$ (decoded with $u_1$ already known) becomes **better**: $I(W^+) \ge I(W)$.

    Now recurse. Apply the same $2\times 2$ transform across blocks, $\log_2 n$ times, to $n$ channels. As $n \to \infty$ the synthetic channels **polarize**: a fraction $I(W)$ of them become *perfect* (capacity $\to 1$) and the rest become *useless* (capacity $\to 0$). Almost nothing is left in between. That is the polarization theorem.

    The **polar code** then writes itself: transmit your real information bits on the perfect channels (the **good** indices), and **freeze** the useless ones to known values (zeros). The fraction of good channels tends to exactly $I(W)$ — so the rate tends to capacity. Decoding is **successive cancellation**: decode $u_1$, use it to help decode $u_2$, and so on up the recursion, each step a tiny LLR combine. You can view the recursion as message passing on the polar (butterfly) graph, but plain SC is a particular scheduled decoder, not generic loopy BP.

    For the BEC the recursion on the *erasure* parameters is exact and elementary: a channel of erasure $z$ splits into

    $$z^- = 1 - (1-z)^2 = 2z - z^2 \quad(\text{worse}),\qquad z^+ = z^2 \quad(\text{better}).$$

    The widget grows the **polarization tree** to a depth you choose and shows the synthetic erasure parameters fanning out toward 0 (perfect) and 1 (useless) — the polarization happening before your eyes.

    > [Arıkan's polar-codes paper](https://arxiv.org/abs/0807.3917) (2009) is the original; the recursive $z^\pm$ map is its BEC special case.
    > [MacKay Ch 48-50](https://www.inference.org.uk/itprnn/book.pdf) predates polar codes but gives the broader capacity-approaching-code landscape (turbo, LDPC, fountain).
    """)
    return


@app.cell
def _(mo):
    pol_depth = mo.ui.slider(start=1, stop=6, step=1, value=4, label="polarization depth n  (N = 2^n channels)")
    pol_z = mo.ui.slider(start=0.05, stop=0.95, step=0.01, value=0.5, label="base channel erasure z")
    mo.vstack([pol_depth, pol_z])
    return pol_depth, pol_z


@app.cell
def _(pol_depth, pol_z):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _depth = pol_depth.value
        _z0 = pol_z.value

        _levels = [np.array([_z0])]
        for _ in range(_depth):
            _cur = _levels[-1]
            _zm = 2 * _cur - _cur ** 2
            _zp = _cur ** 2
            _nxt = np.empty(2 * _cur.size)
            _nxt[0::2] = _zm
            _nxt[1::2] = _zp
            _levels.append(_nxt)

        _final = _levels[-1]
        _N = _final.size
        _capacities = 1.0 - _final
        _good = np.sum(_final < 0.01)
        _bad = np.sum(_final > 0.99)
        _mid = _N - _good - _bad
        _avg_cap = _capacities.mean()

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(11, 4.4))

        for _l, _zs in enumerate(_levels):
            _xs = np.linspace(0, 1, _zs.size + 2)[1:-1]
            _ax1.scatter(_xs, np.full_like(_xs, _l), c=_zs, cmap="coolwarm",
                         vmin=0, vmax=1, s=140 / (1 + 0.4 * _l), edgecolors="k", linewidths=0.3, zorder=3)
            if _l > 0:
                _prev = _levels[_l - 1]
                _pxs = np.linspace(0, 1, _prev.size + 2)[1:-1]
                for _k in range(_prev.size):
                    _ax1.plot([_pxs[_k], _xs[2 * _k]], [_l - 1, _l], color="0.8", lw=0.6, zorder=1)
                    _ax1.plot([_pxs[_k], _xs[2 * _k + 1]], [_l - 1, _l], color="0.8", lw=0.6, zorder=1)
        _ax1.set_yticks(range(_depth + 1))
        _ax1.set_ylabel("recursion depth")
        _ax1.set_xticks([])
        _ax1.set_title(f"Polarization tree (z0 = {_z0:.2f})\nblue = good (z→0), red = useless (z→1)")
        _ax1.invert_yaxis()

        _sorted = np.sort(_final)
        _ax2.plot(_sorted, marker=".", ls="-", color="purple")
        _ax2.axhline(0.5, color="0.7", ls="--", lw=1)
        _ax2.set_xlabel("synthetic channel (sorted)")
        _ax2.set_ylabel("erasure parameter z")
        _ax2.set_title(f"N = {_N} synthetic channels\nmost are near 0 or 1 — polarized")
        _ax2.set_ylim(-0.03, 1.03)
        _ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        print(f"=== Channel polarization, base z = {_z0:.2f}, depth {_depth} ===")
        print(f"  N = {_N} synthetic channels")
        print(f"  near-perfect (z<0.01):  {_good:3d}   ({100*_good/_N:.0f}%)")
        print(f"  near-useless (z>0.99):  {_bad:3d}   ({100*_bad/_N:.0f}%)")
        print(f"  still in the middle:    {_mid:3d}   ({100*_mid/_N:.0f}%)  <- shrinks as depth grows")
        print(f"  average capacity (1-z): {_avg_cap:.4f}   ==  1 - z0 = {1-_z0:.4f}  (conserved!)")
        print(f"  -> a polar code puts info on the {_good} good channels, freezes the rest")
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Fountain & LT Codes: Rateless Coding

    Everything so far fixes a rate $R = k/n$ up front. **Fountain codes** throw that away. Imagine a fountain spraying an *endless* stream of encoded droplets; a receiver catches droplets until it has *slightly more than $k$* of them, then reconstructs the $k$ source symbols — and it does not matter *which* droplets it caught or how many were lost. This is exactly what you want for **multicast** (one server, many receivers with different loss rates) and for the BEC in general: no feedback, no retransmission, no fixed rate.

    The first practical fountain codes are Luby's **LT codes**. Each output droplet is built by:

    1. sample a **degree** $d$ from a carefully chosen distribution $\rho(d)$ (the *Robust Soliton*),
    2. pick $d$ source symbols uniformly at random,
    3. XOR them together; that XOR (plus the list of which symbols) is the droplet.

    Decoding is — once again — **peeling on a graph**, exactly as in Section 3. A degree-1 droplet immediately reveals its single source symbol; substitute it everywhere, which may create new degree-1 droplets, and cascade. The whole art is in the degree distribution: too many high-degree droplets and you waste bits; too few degree-1 droplets and the cascade never starts. The Robust Soliton distribution threads this needle so that catching $k(1+\delta)$ droplets suffices with high probability; for small teaching-size $k$, the overhead can still be chunky, and it shrinks only in the large-block regime with tuned parameters. **Raptor codes** add a pre-code to make decoding truly linear-time and drive the overhead to almost nothing — they are in the 3GPP and DVB standards.

    The demo below runs an LT encoder/decoder over the BEC and measures the **overhead**: how many droplets beyond $k$ you actually needed.

    > [MacKay Ch 50](https://www.inference.org.uk/itprnn/book.pdf) introduces fountain codes and the LT degree distribution — MacKay championed them early.
    > [Richardson & Urbanke Ch 3-4](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) covers the peeling analysis that LT decoding shares with the BEC erasure decoder.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def _robust_soliton(k, c=0.1, delta=0.5):
            _rho = np.zeros(k + 1)
            _rho[1] = 1.0 / k
            for _d in range(2, k + 1):
                _rho[_d] = 1.0 / (_d * (_d - 1))
            _R = c * np.log(k / delta) * np.sqrt(k)
            _tau = np.zeros(k + 1)
            _kr = int(round(k / _R))
            for _d in range(1, max(_kr, 1)):
                _tau[_d] = _R / (_d * k)
            if 1 <= _kr <= k:
                _tau[_kr] = _R * np.log(_R / delta) / k
            _mu = _rho + _tau
            _mu /= _mu.sum()
            return _mu

        def _lt_trial(k, overhead_cap=3.0, seed=0):
            _rng = np.random.default_rng(seed)
            _mu = _robust_soliton(k)
            _degs = np.arange(_mu.size)
            _source = _rng.integers(0, 2, size=k)

            _droplets = []
            _max_drops = int(overhead_cap * k) + 5
            for _ in range(_max_drops):
                _d = int(_rng.choice(_degs, p=_mu))
                _d = max(1, min(_d, k))
                _idx = _rng.choice(k, size=_d, replace=False)
                _val = int(np.bitwise_xor.reduce(_source[_idx]))
                _droplets.append([set(_idx.tolist()), _val])

            _recovered = np.full(k, -1)
            _n_used = 0
            for _t in range(len(_droplets)):
                _n_used = _t + 1
                _active = [[set(s), v] for s, v in _droplets[:_n_used]]
                _changed = True
                _recovered = np.full(k, -1)
                while _changed:
                    _changed = False
                    for _drop in _active:
                        _s, _v = _drop
                        _unknown = [i for i in _s if _recovered[i] == -1]
                        if len(_unknown) == 1:
                            _i = _unknown[0]
                            _known_xor = 0
                            for _j in _s:
                                if _j != _i:
                                    _known_xor ^= int(_recovered[_j])
                            _recovered[_i] = _v ^ _known_xor
                            _changed = True
                if np.all(_recovered != -1):
                    break

            _ok = np.array_equal(_recovered, _source)
            return _n_used, _ok

        print("=== LT fountain code over the BEC (peeling decoder) ===")
        print(f"{'k':>5} {'droplets needed':>16} {'overhead':>10} {'correct?':>9}")
        for _k in [20, 40, 60]:
            _best = None
            for _seed in range(5):
                _n_used, _ok = _lt_trial(_k, seed=_seed)
                if _ok:
                    _best = _n_used
                    break
            if _best is None:
                _best, _ok = _lt_trial(_k, overhead_cap=4.0, seed=99)
            _ovh = _best / _k - 1.0
            print(f"{_k:>5} {_best:>16} {_ovh:>9.2%} {'YES' if _ok else 'no':>9}")
        print("\nKey point: it never mattered WHICH droplets arrived — only how many.")
        print("For small k the overhead is visibly chunky; large tuned LT/Raptor codes make it small.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    The thread that runs through this entire module — **inference by passing local messages on a graph** — is one of the load-bearing ideas of probabilistic machine learning, not just coding theory.

    - **Belief propagation IS sum-product on a factor graph.** The variable/check messages you built are the *exact* algorithm used for inference in probabilistic graphical models (Bayesian networks, Markov random fields, CRFs). A parity check is just a hard factor; swap in soft factors and the same updates do MAP/marginal inference. Pearl's BP, Gallager's LDPC decoder, and the forward-backward / Viterbi algorithms from 4C are *one algorithm* on different graphs.
    - **Loopy BP and variational inference.** Tanner graphs have cycles, so BP is technically "loopy" — yet it works. Understanding *why* (the Bethe free energy, fixed-point analysis) led directly to the variational-inference toolbox (mean-field, expectation propagation) that powers modern approximate Bayesian deep learning.
    - **Density evolution = analyzing a learning dynamics.** Tracking a distribution of messages through iterations, finding a sharp threshold, is the same style of analysis now used for **phase transitions in learning** — when does SGD recover a planted signal, when does a model generalize. The "it works below threshold, fails above" picture recurs everywhere.
    - **Polarization and structured transforms.** The recursive butterfly transform of polar codes is a fast, structured linear map — kin to the FFT and to the structured/butterfly layers used to make neural networks cheaper. Successive cancellation is an autoregressive decoder: decode token $i$ given tokens $< i$. That is precisely how a language model generates.
    - **Fountain codes and randomized sketches.** Rateless XOR-of-random-subsets coding is the same recipe as random sketching, LSH, and compressed sensing — recover a signal from a flexible number of random linear measurements.

    You have now closed the loop on Part 4: from algebraic Hamming codes (4A) through finite-field RS/BCH (4B) and the trellis codes of 4C, to the graph-based capacity-approaching codes that actually fill the airwaves. Part 5 turns to **lossy** compression and the rate-distortion frontier; Part 6 then shows that nearly every quantity you have built — entropy, KL, mutual information, and yes, message passing — is sitting quietly inside the machine-learning systems you use every day.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the graph-and-message view of decoding from every section of this module.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Build a Tanner Graph and Check a Codeword

    Given a parity-check matrix $H$, (a) list the bits in each check, and (b) write `is_codeword(H, x)` that returns `True` iff $H\mathbf{x} = \mathbf{0}$ over GF(2). Test it on a valid and an invalid word for the $(7,4)$ Hamming code.
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

        H = np.array([
            [1, 1, 1, 0, 1, 0, 0],
            [1, 1, 0, 1, 0, 1, 0],
            [1, 0, 1, 1, 0, 0, 1],
        ])

        def is_codeword(H, x):
            # TODO: compute the syndrome (H @ x) mod 2 and test it is all zeros
            _syndrome = ...
            return ...

        # print(is_codeword(H, np.array([1,1,0,1,0,0,1])))   # expect False
        # print(is_codeword(H, np.array([1,1,1,1,1,1,1])))   # expect True

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Peeling Decoder on the BEC

    Implement the erasure peeling rule: repeatedly find a check with exactly one erased neighbour, solve that bit as the XOR of the check's known bits, and repeat until stuck. Return the recovered word and whether decoding finished. (Use `-1` to mark an erased/unknown bit.)
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

        H = np.array([
            [1, 1, 1, 0, 1, 0, 0],
            [1, 1, 0, 1, 0, 1, 0],
            [1, 0, 1, 1, 0, 0, 1],
        ])
        received = np.array([1, -1, 1, 1, -1, 0, 1])  # -1 = erased

        def peel(H, received):
            x = received.copy()
            _m = H.shape[0]
            _progress = True
            while _progress:
                _progress = False
                for _i in range(_m):
                    _nbrs = np.where(H[_i] == 1)[0]
                    _unknown = [j for j in _nbrs if x[j] == -1]
                    # TODO: if exactly one unknown, set it to the XOR of the known neighbours
                    if len(_unknown) == 1:
                        ...
                        _progress = True
            return x, np.all(x != -1)

        # print(peel(H, received))   # expect a fully-recovered codeword, True

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Density-Evolution Threshold Finder

    For a regular $(d_v, d_c)$ LDPC ensemble on the BEC, implement the recursion $x_{\ell+1} = \epsilon\,[1-(1-x_\ell)^{d_c-1}]^{d_v-1}$ and `threshold(dv, dc)` that finds the largest $\epsilon$ for which $x_\ell \to 0$. Check the $(3,6)$ code: threshold should be $\approx 0.4294$, comfortably below the Shannon limit $1-R = 0.5$.
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

        def de_converges(eps, dv, dc, iters=300, tol=1e-9):
            x = eps
            for _ in range(iters):
                # TODO: apply the density-evolution step
                x = ...
                if x < tol:
                    return True
            return x < tol

        def threshold(dv, dc, grid=None):
            if grid is None:
                grid = np.linspace(0.001, 0.999, 999)
            # TODO: return the largest eps in grid for which de_converges is True
            _best = 0.0
            ...
            return _best

        # print(threshold(3, 6))   # expect ~0.4294
        # print(threshold(2, 4))   # expect ~0.3333

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Channel Polarization on the BEC

    Implement one level of the polar recursion on erasure parameters: a channel with erasure $z$ splits into $z^- = 2z - z^2$ (worse) and $z^+ = z^2$ (better). Recurse $n$ times from a base $z_0$, then count how many of the $2^n$ synthetic channels are "good" ($z < 0.01$). Verify the average erasure stays $z_0$ (capacity is conserved).
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

        def polarize(z0, n):
            zs = np.array([z0], dtype=float)
            for _ in range(n):
                # TODO: build z_minus = 2z - z^2 and z_plus = z^2, then interleave them
                _zm = ...
                _zp = ...
                _new = np.empty(2 * zs.size)
                _new[0::2] = _zm
                _new[1::2] = _zp
                zs = _new
            return zs

        # zs = polarize(0.5, 8)
        # print("good channels:", np.sum(zs < 0.01), "of", zs.size)     # ~ half are good
        # print("avg erasure:", zs.mean(), " vs z0 =", 0.5)             # ~equal (conserved)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: LT Fountain Encoder/Decoder

    Build a tiny LT code. Encode: each droplet picks a random degree $d$, chooses $d$ of the $k$ source bits, and XORs them. Decode by peeling (degree-1 droplets reveal a bit; substitute and cascade). Measure the *overhead* — how many droplets past $k$ you needed — and confirm it never depended on *which* droplets arrived.
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
        k = 30
        source = rng.integers(0, 2, size=k)

        def make_droplet(rng, source):
            _k = source.size
            d = rng.integers(1, _k + 1)
            idx = rng.choice(_k, size=d, replace=False)
            # TODO: value = XOR of source[idx]; return (set(idx), value)
            val = ...
            return set(idx.tolist()), int(val)

        def decode(droplets, k):
            recovered = np.full(k, -1)
            _changed = True
            while _changed:
                _changed = False
                for _s, _v in droplets:
                    _unknown = [i for i in _s if recovered[i] == -1]
                    # TODO: if exactly one unknown, solve it = _v XOR (known neighbours)
                    if len(_unknown) == 1:
                        ...
                        _changed = True
            return recovered

        # droplets = [make_droplet(rng, source) for _ in range(3 * k)]
        # rec = decode(droplets, k)
        # print("recovered all?", np.array_equal(rec, source))

    _run()
    return


if __name__ == "__main__":
    app.run()
