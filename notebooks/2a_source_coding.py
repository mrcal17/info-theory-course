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
    # 2A: Source Coding Theorem & Symbol Codes

    > *"We have shown that for a single random variable, the entropy is a lower bound on the average length of the shortest description."*
    > — Cover & Thomas

    In Part 1 you learned what entropy *is*. Now you get to learn what it is *for*. Entropy was introduced as the average surprise of a random variable — but Shannon's first great theorem promises something far more concrete: the entropy $H(X)$ is the exact, unbeatable floor on how many bits you need, on average, to write down outcomes of $X$. Not approximately. The floor.

    This module is where information theory stops being a measurement and starts being engineering. We will build **codes** — rules that map symbols to strings of bits — and we will ask which codes are usable (you can actually decode them) and which are good (they are short). The answer to "usable" is a single, beautiful inequality due to Kraft. The answer to "good" is the entropy you already know.

    You will leave with two facts wired together so tightly they feel like one. First, the **Kraft inequality**: a set of codeword lengths is achievable by a decodable code if and only if $\sum_i 2^{-\ell_i} \le 1$. Second, the **source coding bound**: any decodable code has expected length $L \ge H(X)$, and a simple construction gets within one bit, $H(X) \le L < H(X) + 1$. Together they say compression has a hard limit, and that limit is entropy. Modules 2B–2D then build the compressors that chase it.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. What Is a Code?

    A **source code** $C$ for a random variable $X$ is a map from each symbol $x$ in the alphabet to a finite string of bits, the **codeword** $C(x)$. The length of that string is $\ell(x)$. If $X$ takes values with probabilities $p(x)$, the quantity we care about is the **expected length**

    $$L(C) = \sum_x p(x)\,\ell(x),$$

    the average number of bits per symbol when we encode a long stream drawn from $X$. Our entire goal is to make $L$ small — but not so small that we can no longer recover the message.

    Here is the tension in one example. Suppose $X \in \{a, b, c, d\}$. The lazy fixed-length code uses 2 bits each: $a\!\to\!00,\ b\!\to\!01,\ c\!\to\!10,\ d\!\to\!11$. That always costs exactly 2 bits. But if $a$ is very common and $d$ very rare, we are wasting bits on $a$ and could do better by giving $a$ a *short* codeword and $d$ a long one. That is the whole game of source coding: spend few bits on likely symbols, many bits on unlikely ones. The catch is that **variable-length codes can become ambiguous**, and avoiding that ambiguity is what the rest of this module is about.

    > [MacKay Ch 5](https://www.inference.org.uk/itprnn/book.pdf) introduces symbol codes and expected length with exactly this trade-off.
    > [Cover & Thomas Ch 5.1](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) gives the formal definition of a code and its expected length.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _probs = {"a": 0.5, "b": 0.25, "c": 0.125, "d": 0.125}

        _fixed = {"a": "00", "b": "01", "c": "10", "d": "11"}
        _variable = {"a": "0", "b": "10", "c": "110", "d": "111"}

        def expected_length(code, probs):
            return sum(probs[_s] * len(code[_s]) for _s in probs)

        print("=== Two codes for the same source ===")
        print(f"{'symbol':8s}{'p(x)':>8s}{'fixed':>10s}{'variable':>12s}")
        for _s in _probs:
            print(f"{_s:8s}{_probs[_s]:>8.3f}{_fixed[_s]:>10s}{_variable[_s]:>12s}")

        _Lf = expected_length(_fixed, _probs)
        _Lv = expected_length(_variable, _probs)
        _p = np.array(list(_probs.values()))
        _H = float(-np.sum(_p * np.log2(_p)))

        print(f"\nfixed-length    L = {_Lf:.3f} bits/symbol")
        print(f"variable-length L = {_Lv:.3f} bits/symbol")
        print(f"entropy         H = {_H:.3f} bits/symbol")
        print("\nThe variable code matches H exactly here — short words for likely symbols pay off.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. A Hierarchy of Codes: Nonsingular, Uniquely Decodable, Prefix

    Not every map from symbols to bitstrings is usable. There is a nested hierarchy of "how decodable" a code is, and you should know exactly where the line of usefulness sits.

    **1. Nonsingular.** A code is *nonsingular* if different symbols get different codewords: $x \ne x' \Rightarrow C(x) \ne C(x')$. This is the bare minimum — you can decode a *single* symbol. But it says nothing about decoding a *sequence*.

    **2. Uniquely decodable.** A code is *uniquely decodable* (UD) if its extension to sequences is nonsingular — that is, no two different source sequences ever produce the same bitstring. This is what you actually need: a long message must have exactly one valid interpretation. The trouble is that a code can be UD yet require you to read far ahead before you can commit to the first symbol.

    **3. Prefix (a.k.a. instantaneous).** A code is a *prefix code* if no codeword is a prefix of any other codeword. This is the gold standard. With a prefix code you can decode **instantaneously**: read bits left to right, and the moment the bits you have seen form a codeword, emit that symbol and start fresh. No looking ahead, ever.

    The containment is strict: every prefix code is UD, every UD code is nonsingular, and there are codes at each level that are not in the next. The remarkable payoff — proved in Section 4 — is that *restricting yourself to prefix codes costs you nothing*: any expected length achievable by a UD code is also achievable by a prefix code. So we lose no compression by insisting on the convenient class.

    **Worked counterexample.** Consider $a\!\to\!0,\ b\!\to\!01,\ c\!\to\!11$. It is nonsingular (all different) and even uniquely decodable. But it is *not* prefix: $0$ is a prefix of $01$. Decode `0011`: is the first symbol $a$ (then `011` = ...?) — you have to read ahead to resolve it. Compare the prefix code $a\!\to\!0,\ b\!\to\!10,\ c\!\to\!11$: `01011` parses instantly as $a, b, c$ with no backtracking.

    > [Cover & Thomas Ch 5.1](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) lays out this exact hierarchy with a clean table of examples.
    > [Ash Ch 2](https://openlibrary.org/books/OL1884498M/Information_theory) and [MacKay Ch 5](https://www.inference.org.uk/itprnn/book.pdf) treat prefix (instantaneous) codes and the prefix-free condition.
    """)
    return


@app.cell
def _():
    def _run():
        def is_prefix_code(codewords):
            _cw = list(codewords)
            for _i, _a in enumerate(_cw):
                for _j, _b in enumerate(_cw):
                    if _i != _j and _b.startswith(_a):
                        return False
            return True

        def decode_prefix(bits, code):
            _inv = {_v: _k for _k, _v in code.items()}
            _out, _buf = [], ""
            for _bit in bits:
                _buf += _bit
                if _buf in _inv:
                    _out.append(_inv[_buf])
                    _buf = ""
            return "".join(_out), _buf

        _ud_not_prefix = {"a": "0", "b": "01", "c": "11"}
        _prefix = {"a": "0", "b": "10", "c": "11"}

        print("=== Is it a prefix code? ===")
        print(f"  a=0,  b=01, c=11  -> prefix? {is_prefix_code(_ud_not_prefix.values())}  (0 prefixes 01)")
        print(f"  a=0,  b=10, c=11  -> prefix? {is_prefix_code(_prefix.values())}")

        _msg, _leftover = decode_prefix("01011", _prefix)
        print(f"\nInstantaneous decode of '01011' with the prefix code: {_msg}  (leftover '{_leftover}')")
        print("Each codeword is recognized the instant its last bit arrives — no look-ahead.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Prefix Codes Are Trees

    Here is the picture that makes prefix codes intuitive, and it is the picture the first widget below lets you build. Read a binary codeword as a path down a binary tree: start at the root, go **left for 0** and **right for 1**, one step per bit. The codeword ends at some node. The prefix condition has a clean geometric meaning:

    > A code is a prefix code **iff every codeword sits on a leaf** of the tree — no codeword is an interior node on the path to another.

    If codeword $A$ were a prefix of codeword $B$, then the node for $A$ would lie *on the way down* to $B$, i.e. $A$ would be an interior node, not a leaf. Forbidding prefixes is exactly forbidding codewords at interior nodes. This is why decoding is instantaneous: you walk down the tree as bits arrive, and the instant you hit a leaf you have a complete symbol; then you jump back to the root.

    A codeword at depth $\ell$ "claims" its leaf and **everything below it** — that entire subtree becomes unavailable to other codewords. A short codeword is greedy: it claims a big subtree. A node at depth $\ell$ owns a fraction $2^{-\ell}$ of the leaves of any deeper full tree. That fraction is the **cost** of using length $\ell$, and the total cost cannot exceed the whole tree. That single sentence is the Kraft inequality, which we make exact next.

    Use the **prefix-tree builder** below: type codeword lengths and watch the tree get carved up. When a new codeword would have to live under a codeword you already placed, the builder flags the prefix violation.

    > [MacKay Ch 5](https://www.inference.org.uk/itprnn/book.pdf) draws the codeword-tree picture and the "claimed subtree" intuition that motivates Kraft.
    """)
    return


@app.cell
def _(mo):
    tree_lengths = mo.ui.text(
        value="1, 2, 3, 3",
        label="Codeword lengths (comma-separated, depth in the binary tree)",
        full_width=True,
    )
    tree_lengths
    return (tree_lengths,)


@app.cell
def _(tree_lengths):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _parse(s):
            _out = []
            for _tok in s.replace(";", ",").split(","):
                _tok = _tok.strip()
                if _tok:
                    try:
                        _v = int(round(float(_tok)))
                        if _v >= 1:
                            _out.append(_v)
                    except ValueError:
                        pass
            return _out

        _lengths = _parse(tree_lengths.value) or [1]
        _depth = max(_lengths)

        _assigned = []
        _used = set()
        _ok_flags = []
        for _L in _lengths:
            _placed = None
            for _code in range(2 ** _L):
                _bits = format(_code, f"0{_L}b")
                _bad = False
                for _u in _used:
                    if _bits.startswith(_u) or _u.startswith(_bits):
                        _bad = True
                        break
                if not _bad:
                    _placed = _bits
                    break
            if _placed is None:
                _assigned.append(None)
                _ok_flags.append(False)
            else:
                _assigned.append(_placed)
                _used.add(_placed)
                _ok_flags.append(True)

        def _node_x(bits, depth):
            _lo, _hi = 0.0, 1.0
            for _b in bits:
                _mid = (_lo + _hi) / 2
                if _b == "0":
                    _hi = _mid
                else:
                    _lo = _mid
            return (_lo + _hi) / 2

        _fig, _ax = plt.subplots(figsize=(8, 4.6))

        _stack = [""]
        while _stack:
            _bits = _stack.pop()
            if len(_bits) == _depth:
                continue
            _x0 = _node_x(_bits, _depth)
            _y0 = -len(_bits)
            for _b in ("0", "1"):
                _child = _bits + _b
                _x1 = _node_x(_child, _depth)
                _y1 = -len(_child)
                _ax.plot([_x0, _x1], [_y0, _y1], color="lightgray", lw=1, zorder=1)
                _stack.append(_child)

        for _bits, _ok in zip(_assigned, _ok_flags):
            if _bits is None:
                continue
            _x = _node_x(_bits, _depth)
            _y = -len(_bits)
            _ax.scatter([_x], [_y], s=320, color="steelblue", zorder=3, edgecolor="white")
            _ax.text(_x, _y, _bits, ha="center", va="center", color="white",
                     fontsize=9, zorder=4)

        _kraft = sum(2.0 ** (-_L) for _L, _ok in zip(_lengths, _ok_flags) if _ok)
        _all_ok = all(_ok_flags)
        _status = "valid prefix code" if _all_ok else "PREFIX VIOLATION (a length could not be placed)"
        _ax.set_title(f"lengths = {_lengths}      Kraft sum = {_kraft:.4f}      {_status}")
        _ax.set_xlim(-0.05, 1.05)
        _ax.set_ylim(-_depth - 0.4, 0.4)
        _ax.axis("off")
        _ax.text(0.0, 0.25, "root", fontsize=9, color="gray")
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. The Kraft Inequality

    Now the central theorem of the module, and it comes in two directions.

    **Kraft inequality (existence).** A prefix code over a binary alphabet with codeword lengths $\ell_1, \ell_2, \dots, \ell_m$ exists **if and only if**

    $$\sum_{i=1}^{m} 2^{-\ell_i} \le 1.$$

    Think of it as a budget. Each codeword of length $\ell$ spends $2^{-\ell}$ of a total budget of $1$ — the fraction of the tree it claims. You can spend the whole budget but never overspend. A short codeword (small $\ell$) is expensive; a long one is cheap. The "only if" direction is the tree argument from Section 3: disjoint subtrees can claim at most the whole tree. The "if" direction is a construction: sort the lengths, and greedily assign each codeword the next available leaf — the budget condition guarantees you never run out.

    **McMillan's theorem (the surprise).** The *same* inequality $\sum_i 2^{-\ell_i} \le 1$ is also necessary for any **uniquely decodable** code, not just prefix codes. This is the punchline that justifies our whole strategy: a UD code can have no shorter set of lengths than some prefix code with the identical lengths. **Insisting on prefix codes costs nothing.** Whatever a clever look-ahead UD code can achieve, a clean instantaneous prefix code matches.

    **Worked examples.**

    - Lengths $\{1, 2, 3, 3\}$: $\tfrac12 + \tfrac14 + \tfrac18 + \tfrac18 = 1$. Exactly on budget — a *complete* code (every leaf used). Example: $0, 10, 110, 111$.
    - Lengths $\{2, 2, 2, 2\}$: $4 \times \tfrac14 = 1$. The fixed-length code; also complete.
    - Lengths $\{1, 2, 2\}$: $\tfrac12 + \tfrac14 + \tfrac14 = 1$. Fine. But $\{1, 1, 2\}$: $\tfrac12 + \tfrac12 + \tfrac14 = 1.25 > 1$ — **impossible**, no prefix (or UD) code has these lengths.

    The **Kraft-budget visualizer** below lets you set lengths and watch $\sum 2^{-\ell_i}$ fill (or overflow) the budget of 1.

    > [Cover & Thomas Ch 5.2–5.5](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) proves Kraft and McMillan in full.
    > [MacKay Ch 5](https://www.inference.org.uk/itprnn/book.pdf) gives the budget intuition; [Ash Ch 2](https://openlibrary.org/books/OL1884498M/Information_theory) has the classic tree proof.
    """)
    return


@app.cell
def _(mo):
    kraft_lengths = mo.ui.text(
        value="1, 2, 3, 3",
        label="Codeword lengths for the Kraft budget (comma-separated)",
        full_width=True,
    )
    kraft_lengths
    return (kraft_lengths,)


@app.cell
def _(kraft_lengths):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def _parse(s):
            _out = []
            for _tok in s.replace(";", ",").split(","):
                _tok = _tok.strip()
                if _tok:
                    try:
                        _v = int(round(float(_tok)))
                        if _v >= 1:
                            _out.append(_v)
                    except ValueError:
                        pass
            return _out

        _lengths = _parse(kraft_lengths.value) or [1]
        _contrib = [2.0 ** (-_L) for _L in _lengths]
        _total = sum(_contrib)

        _fig, _ax = plt.subplots(figsize=(8, 2.8))

        _left = 0.0
        _cmap = plt.cm.viridis
        for _i, (_L, _c) in enumerate(zip(_lengths, _contrib)):
            _color = _cmap(0.15 + 0.7 * (_i / max(1, len(_lengths) - 1)))
            _ax.barh(0, _c, left=_left, height=0.6, color=_color, edgecolor="white")
            if _c > 0.03:
                _ax.text(_left + _c / 2, 0, f"$2^{{-{_L}}}$", ha="center", va="center",
                         color="white", fontsize=9)
            _left += _c

        _ax.axvline(1.0, color="red", lw=2, ls="--")
        _ax.text(1.0, 0.45, "budget = 1", color="red", ha="center", fontsize=10)

        if _total > 1.0 + 1e-12:
            _verdict = f"OVER budget by {_total - 1:.4f} — NO prefix/UD code exists"
            _tcolor = "red"
        elif abs(_total - 1.0) < 1e-9:
            _verdict = "exactly 1 — complete prefix code (every leaf used)"
            _tcolor = "darkgreen"
        else:
            _verdict = f"under budget ({1 - _total:.4f} to spare) — prefix code exists, room left"
            _tcolor = "steelblue"

        _ax.set_xlim(0, max(1.15, _total * 1.05))
        _ax.set_ylim(-0.6, 0.7)
        _ax.set_yticks([])
        _ax.set_xlabel("cumulative Kraft sum  $\\sum_i 2^{-\\ell_i}$")
        _ax.set_title(f"lengths = {_lengths}      sum = {_total:.4f}\n{_verdict}", color=_tcolor)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        def kraft_sum(lengths):
            return sum(2.0 ** (-_L) for _L in lengths)

        def prefix_exists(lengths):
            return kraft_sum(lengths) <= 1.0 + 1e-12

        print("=== Kraft inequality check ===")
        for _lengths in [[1, 2, 3, 3], [2, 2, 2, 2], [1, 2, 2], [1, 1, 2], [2, 2, 3, 3, 3, 3]]:
            _s = kraft_sum(_lengths)
            _ok = "YES" if prefix_exists(_lengths) else "NO (overspent)"
            print(f"  lengths={str(_lengths):20s} sum={_s:6.4f}  prefix code exists? {_ok}")

        print("\nVerify the 'if' direction by actually constructing a code for {1,2,3,3}:")

        def construct_prefix(lengths):
            _order = sorted(range(len(lengths)), key=lambda k: lengths[k])
            _used = set()
            _result = {}
            for _idx in _order:
                _Lk = lengths[_idx]
                for _code in range(2 ** _Lk):
                    _bits = format(_code, f"0{_Lk}b")
                    if not any(_bits.startswith(_u) or _u.startswith(_bits) for _u in _used):
                        _used.add(_bits)
                        _result[_idx] = _bits
                        break
            return _result

        _target = [1, 2, 3, 3]
        _built = construct_prefix(_target)
        for _idx in sorted(_built):
            print(f"    symbol {_idx} (len {_target[_idx]}): {_built[_idx]}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Source Coding Theorem: $L \ge H(X)$

    We can now prove the headline result. Among all uniquely decodable codes, the expected length is bounded below by the entropy:

    $$L(C) = \sum_x p(x)\,\ell(x) \;\ge\; H(X),$$

    with equality **iff** $\ell(x) = \log_2 \tfrac{1}{p(x)}$ for every $x$ — that is, iff every "ideal length" happens to be an integer (a *dyadic* distribution, all $p(x) = 2^{-k}$).

    **The proof in three moves.** Look at the gap $L - H$ and rearrange:

    $$L - H = \sum_x p(x)\,\ell(x) + \sum_x p(x)\log_2 p(x) = \sum_x p(x)\,\log_2\frac{p(x)}{2^{-\ell(x)}}.$$

    Define $q(x) = 2^{-\ell(x)} / S$ where $S = \sum_x 2^{-\ell(x)} \le 1$ by Kraft. Substituting,

    $$L - H = \sum_x p(x)\log_2\frac{p(x)}{q(x)} \;-\; \log_2 S \;=\; D(p \,\|\, q) - \log_2 S.$$

    Now both pieces are non-negative: the KL divergence $D(p\|q) \ge 0$ (Gibbs' inequality, from 1B), and $-\log_2 S \ge 0$ because $S \le 1$. Therefore $L - H \ge 0$. Done. The two sources of slack are crystal clear: you pay for using a $q$ that mismatches $p$ (the divergence term), and you pay for not spending your whole Kraft budget (the $-\log_2 S$ term).

    This is the formal statement of the floor we promised in Module 1A. The entropy is not just the average surprise — it is, to the bit, the cost of the best possible code. Compression has a hard limit, and you are now staring at its proof.

    > [Cover & Thomas Ch 5.3](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) gives this KL-divergence proof verbatim.
    > [MacKay Ch 5](https://www.inference.org.uk/itprnn/book.pdf) frames it via the "implicit probabilities" $q(x) = 2^{-\ell(x)}$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def entropy(p):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log2(p)))

        def expected_length(probs, lengths):
            return float(np.sum(np.asarray(probs) * np.asarray(lengths)))

        def kl(p, q):
            p = np.asarray(p, float)
            q = np.asarray(q, float)
            _m = p > 0
            return float(np.sum(p[_m] * np.log2(p[_m] / q[_m])))

        _p = np.array([0.5, 0.25, 0.125, 0.125])
        print("=== Dyadic source: code can hit the floor exactly ===")
        _lengths = np.array([1, 2, 3, 3])
        _H = entropy(_p)
        _L = expected_length(_p, _lengths)
        print(f"  H(X) = {_H:.4f} bits,  L = {_L:.4f} bits  ->  L == H? {np.isclose(_L, _H)}")

        print("\n=== Non-dyadic source: there is always a gap ===")
        _p2 = np.array([0.4, 0.3, 0.2, 0.1])
        _lengths2 = np.array([2, 2, 2, 2])
        _H2 = entropy(_p2)
        _L2 = expected_length(_p2, _lengths2)
        _S = float(np.sum(2.0 ** (-_lengths2)))
        _q = 2.0 ** (-_lengths2) / _S
        print(f"  H(X) = {_H2:.4f},  L = {_L2:.4f},  gap = {_L2 - _H2:.4f} bits")
        print(f"  decomposition: D(p||q) - log2(S) = {kl(_p2, _q):.4f} - {np.log2(_S):.4f} "
              f"= {kl(_p2, _q) - np.log2(_S):.4f}")
        print(f"  matches the gap L - H? {np.isclose(kl(_p2, _q) - np.log2(_S), _L2 - _H2)}")
        print("\nBoth slack terms are non-negative, so L >= H always.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Shannon Codes and the Bound $H \le L < H + 1$

    The floor $L \ge H$ would be cold comfort if we could not get close to it. We can, and the recipe could not be simpler. The **ideal codeword length** for symbol $x$ is $\log_2 \tfrac{1}{p(x)}$ — exactly the self-information from Module 1A. The catch: lengths must be integers. So round *up*. The **Shannon code** uses

    $$\ell(x) = \left\lceil \log_2 \frac{1}{p(x)} \right\rceil.$$

    These lengths are always achievable, because they satisfy Kraft:

    $$\sum_x 2^{-\lceil \log_2 (1/p(x)) \rceil} \le \sum_x 2^{-\log_2 (1/p(x))} = \sum_x p(x) = 1.$$

    (Rounding the length *up* only makes each term *smaller*, so the sum stays $\le 1$.) And the expected length is sandwiched neatly. Since $\log_2\tfrac1{p(x)} \le \ell(x) < \log_2\tfrac1{p(x)} + 1$, take expectations:

    $$\boxed{\,H(X) \;\le\; L \;<\; H(X) + 1\,}$$

    The "+1" is the price of integer codewords — at worst one extra bit per symbol, the round-up overhead. **Worked example.** For $p = (0.4, 0.3, 0.2, 0.1)$: ideal lengths $(1.32, 1.74, 2.32, 3.32)$, Shannon lengths $\lceil\cdot\rceil = (2, 2, 3, 4)$, giving $L = 2.4$ bits against $H = 1.846$ bits — inside $[H, H+1)$ as promised.

    **Killing the +1 with blocks.** That one wasted bit is amortized away by coding *blocks* of $n$ symbols at once. The per-symbol overhead drops to $1/n$:

    $$\frac{H(X^n)}{n} \le L_n < \frac{H(X^n)}{n} + \frac{1}{n} \quad\Longrightarrow\quad H(X) \le L_n^{\text{(per symbol)}} < H(X) + \frac{1}{n} \xrightarrow{\;n\to\infty\;} H(X).$$

    So in the limit of long blocks the average length converges to the entropy exactly. That is Shannon's source coding theorem in full: **$H(X)$ is the achievable optimum, and it is approachable to any precision.** Huffman coding (2B) gets the *optimal* integer code for a given block; arithmetic coding (2C) sidesteps integers entirely and rides right along the entropy.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def entropy(p):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log2(p)))

        def shannon_lengths(p):
            p = np.asarray(p, dtype=float)
            return np.ceil(-np.log2(p)).astype(int)

        _p = np.array([0.4, 0.3, 0.2, 0.1])
        _ideal = -np.log2(_p)
        _ell = shannon_lengths(_p)
        _H = entropy(_p)
        _L = float(np.sum(_p * _ell))
        _kraft = float(np.sum(2.0 ** (-_ell)))

        print("=== Shannon code for p = (0.4, 0.3, 0.2, 0.1) ===")
        print(f"{'p':>8s}{'ideal log2(1/p)':>18s}{'ceil':>8s}")
        for _pi, _id, _li in zip(_p, _ideal, _ell):
            print(f"{_pi:>8.2f}{_id:>18.3f}{_li:>8d}")
        print(f"\n  H(X) = {_H:.4f} bits")
        print(f"  L    = {_L:.4f} bits   (Kraft sum = {_kraft:.4f} <= 1)")
        print(f"  bound H <= L < H+1:  {_H:.4f} <= {_L:.4f} < {_H + 1:.4f}   -> {_H <= _L < _H + 1}")

        print("\n=== Blocking drives the per-symbol overhead to 0 ===")
        for _n in [1, 2, 3, 4]:
            _joint = _p.copy()
            for _ in range(_n - 1):
                _joint = np.outer(_joint, _p).ravel()
            _ell_n = np.ceil(-np.log2(_joint)).astype(int)
            _Ln = float(np.sum(_joint * _ell_n)) / _n
            print(f"  block size n={_n}:  L_n/n = {_Ln:.4f} bits/symbol   (H = {_H:.4f}, gap {_Ln - _H:.4f})")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Putting It Together: Compare Codes on One Source

    Let us see the whole story in one view. Pick a source, and the figure compares the entropy floor against three real code families: fixed-length, the Shannon code, and the Huffman code. Every bar respects $L \ge H$; the Shannon code always lands in $[H, H+1)$; Huffman is the best prefix code for this symbol alphabet; and how close either gets depends on how *dyadic* the distribution is.

    Watch what happens as you move from a uniform source (where fixed-length is already optimal) to a highly skewed one (where variable-length codes pull far ahead of fixed-length, and the entropy floor drops well below $\log_2 N$). That widening gap between fixed-length and entropy is precisely the compressibility of the source — the room every compressor in Part 2 is built to exploit.
    """)
    return


@app.cell
def _(mo):
    source_choice = mo.ui.dropdown(
        options=["Uniform (4)", "Dyadic (1/2,1/4,1/8,1/8)", "Skewed (0.6,0.2,0.1,0.1)",
                 "Very skewed (0.85,0.07,0.05,0.03)", "Eight symbols, peaked"],
        value="Skewed (0.6,0.2,0.1,0.1)",
        label="Source distribution",
    )
    source_choice
    return (source_choice,)


@app.cell
def _(source_choice):
    def _run():
        import numpy as np
        import heapq
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _choice = source_choice.value
        if _choice == "Uniform (4)":
            _p = np.array([0.25, 0.25, 0.25, 0.25])
        elif _choice == "Dyadic (1/2,1/4,1/8,1/8)":
            _p = np.array([0.5, 0.25, 0.125, 0.125])
        elif _choice == "Skewed (0.6,0.2,0.1,0.1)":
            _p = np.array([0.6, 0.2, 0.1, 0.1])
        elif _choice == "Very skewed (0.85,0.07,0.05,0.03)":
            _p = np.array([0.85, 0.07, 0.05, 0.03])
        else:
            _p = np.array([0.4, 0.2, 0.12, 0.1, 0.08, 0.05, 0.03, 0.02])
        _p = _p / _p.sum()
        _n = len(_p)

        _H = float(-np.sum(_p * np.log2(_p)))
        _fixed_len = int(np.ceil(np.log2(_n)))
        _L_fixed = float(_fixed_len)
        _shannon = np.ceil(-np.log2(_p)).astype(int)
        _L_shannon = float(np.sum(_p * _shannon))

        def _huffman_lengths(probs):
            if len(probs) == 1:
                return np.array([1], dtype=int)
            _lengths = np.zeros(len(probs), dtype=int)
            _heap = []
            _counter = 0
            for _i, _prob in enumerate(probs):
                heapq.heappush(_heap, (float(_prob), _counter, [_i]))
                _counter += 1
            while len(_heap) > 1:
                _p1, _, _leaves1 = heapq.heappop(_heap)
                _p2, _, _leaves2 = heapq.heappop(_heap)
                for _i in _leaves1 + _leaves2:
                    _lengths[_i] += 1
                heapq.heappush(_heap, (_p1 + _p2, _counter, _leaves1 + _leaves2))
                _counter += 1
            return _lengths

        _huff = _huffman_lengths(_p)
        _L_huff = float(np.sum(_p * _huff))

        _ceiling = np.log2(_n)

        _labels = ["entropy\nH (floor)", "Shannon\ncode", "Huffman\ncode", "fixed\nlength"]
        _vals = [_H, _L_shannon, _L_huff, _L_fixed]
        _colors = ["seagreen", "steelblue", "mediumpurple", "indianred"]

        _fig, _ax = plt.subplots(figsize=(7.5, 4.3))
        _bars = _ax.bar(_labels, _vals, color=_colors, alpha=0.85)
        for _b, _v in zip(_bars, _vals):
            _ax.text(_b.get_x() + _b.get_width() / 2, _v + 0.03, f"{_v:.3f}",
                     ha="center", fontsize=9)
        _ax.axhline(_H, color="seagreen", ls="--", alpha=0.6)
        _ax.axhline(_H + 1, color="gray", ls=":", alpha=0.6)
        _ax.text(3.4, _H + 1, "H + 1", color="gray", fontsize=8, va="bottom")
        _ax.axhline(_ceiling, color="indianred", ls=":", alpha=0.4)
        _ax.set_ylabel("expected length L (bits/symbol)")
        _ax.set_title(f"{_choice}      H = {_H:.3f},   log2(N) = {_ceiling:.3f}")
        _ax.set_ylim(0, max(_vals) * 1.2)
        _ax.grid(True, axis="y", alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    The source coding theorem is not just the foundation of compression — it is the bridge that turns "predicting a distribution" into "spending bits," and that bridge is walked constantly in modern ML:

    - **Cross-entropy is a coding cost.** When you train a model $q$ and evaluate it by cross-entropy $\sum_x p(x)\log_2\tfrac1{q(x)}$, you are computing the *expected codeword length* of a Shannon code built for $q$ but paid for by the true source $p$. The proof in Section 5 showed $L - H = D(p\|q) - \log_2 S$ — so minimizing cross-entropy loss is literally minimizing the number of bits your model would waste compressing the data. A perfect model codes at the entropy; a wrong model pays the KL penalty in extra bits.
    - **Bits-per-character / perplexity.** Language models are benchmarked in *bits per character* or *bits per byte* — directly the $L$ of this module — and perplexity is just $2^{L}$. A model that compresses text to fewer bits is, by the source coding theorem, a model that has captured more of the structure. "Better predictor" and "better compressor" are the same statement.
    - **The MDL principle (Module 6B).** Minimum Description Length picks the model that, together with the data it fails to explain, yields the shortest total codeword. Every term in an MDL score is a Kraft-legal length $\lceil\log_2 1/p\rceil$ from this module. Occam's razor becomes a Kraft budget.
    - **Latent codes and VAEs (Module 6E).** The "rate" term of a VAE's ELBO is the number of bits needed to transmit the latent code under the prior — a source-coding cost. Bits-back coding and neural compressors are the source coding theorem made operational on learned distributions.

    The thread is simple and worth memorizing: **a probability model is a code, and the bits it spends are its loss.** Everything from logistic regression to GPT is, viewed through this module, a competition to compress.

    Next, **Module 2B (Huffman coding)** gives the algorithm that finds the *provably optimal* integer-length prefix code for any source — closing the gap to entropy as tightly as integer lengths allow, and doing it bottom-up on the very trees you built here.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the math-to-code translation for every concept in this module: codes, the Kraft test, the entropy floor, Shannon lengths, and the bound.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Is It a Prefix Code?

    Write `is_prefix(codewords)` that returns `True` iff no codeword in the list is a prefix of another. Test it on a prefix code ($0, 10, 110, 111$ → True) and on a non-prefix code ($0, 01, 11$ → False, since $0$ prefixes $01$).
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
        def is_prefix(codewords):
            # TODO: for every ordered pair (a, b) with a != b, check b.startswith(a)
            # return False if any codeword is a prefix of another, else True
            ...

        # print(is_prefix(["0", "10", "110", "111"]))   # expect True
        # print(is_prefix(["0", "01", "11"]))           # expect False

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: The Kraft Sum

    Implement `kraft_sum(lengths)` $= \sum_i 2^{-\ell_i}$ and `prefix_possible(lengths)` returning `True` iff the sum is $\le 1$. Verify: $\{1,2,3,3\}$ sums to $1.0$ (possible), and $\{1,1,2\}$ sums to $1.25$ (impossible).
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
        def kraft_sum(lengths):
            # TODO: return sum of 2**(-L) over the lengths
            ...

        def prefix_possible(lengths):
            # TODO: True iff kraft_sum(lengths) <= 1 (allow a tiny tolerance)
            ...

        # print(kraft_sum([1, 2, 3, 3]))        # expect 1.0
        # print(prefix_possible([1, 2, 3, 3]))  # expect True
        # print(kraft_sum([1, 1, 2]))           # expect 1.25
        # print(prefix_possible([1, 1, 2]))     # expect False

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Shannon Code Lengths and the Bound

    Build `shannon_code(p)` returning the lengths $\lceil \log_2 1/p(x)\rceil$, then compute the entropy $H$ and expected length $L$, and confirm $H \le L < H+1$. Try it on $p = (0.4, 0.3, 0.2, 0.1)$ (expect $H \approx 1.846$, $L = 2.4$).
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

        def shannon_code(p):
            p = np.asarray(p, dtype=float)
            # TODO: return ceil(-log2(p)) as integer lengths
            ...

        def entropy(p):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            # TODO: -sum p*log2(p)
            ...

        p = np.array([0.4, 0.3, 0.2, 0.1])
        # lengths = shannon_code(p)
        # H = entropy(p)
        # L = float(np.sum(p * lengths))
        # print(f"lengths={lengths}, H={H:.3f}, L={L:.3f}, bound holds: {H <= L < H + 1}")
        # expect lengths=[2 2 3 4], H~1.846, L=2.400

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: The $L - H$ Decomposition

    Confirm the proof from Section 5 numerically. For a source $p$ and code lengths, set $q(x) = 2^{-\ell(x)}/S$ with $S = \sum 2^{-\ell}$, then verify $L - H = D(p\|q) - \log_2 S$, with both terms $\ge 0$. Use $p=(0.4,0.3,0.2,0.1)$ and lengths $(2,2,2,2)$.
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

        p = np.array([0.4, 0.3, 0.2, 0.1])
        lengths = np.array([2, 2, 2, 2])

        # TODO: H = entropy, L = sum p*lengths
        H = ...
        L = ...

        # TODO: S = sum 2**(-lengths); q = 2**(-lengths)/S
        S = ...
        q = ...

        # TODO: D = sum p*log2(p/q)  (over p>0)
        D = ...

        # print(f"L - H        = {L - H:.4f}")
        # print(f"D(p||q) - log2 S = {D - np.log2(S):.4f}")   # should match
        # print(f"both terms >= 0: D={D:.4f}, -log2 S={-np.log2(S):.4f}")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Blocking Beats the +1

    Show empirically that coding blocks of $n$ i.i.d. symbols drives the per-symbol Shannon length down toward $H$. For $p=(0.7,0.3)$, build the joint distribution of $n$ symbols (an outer-product / Kronecker expansion), Shannon-code it, and print $L_n/n$ for $n=1,2,3,4,6$. It should approach $H \approx 0.881$.
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

        p = np.array([0.7, 0.3])
        H = float(-np.sum(p * np.log2(p)))

        def block_dist(p, n):
            # TODO: probability vector over all 2**n length-n sequences
            # hint: start with joint = p, repeatedly do np.outer(joint, p).ravel()
            ...

        for n in [1, 2, 3, 4, 6]:
            # joint = block_dist(p, n)
            # lengths = np.ceil(-np.log2(joint)).astype(int)
            # Ln_per = float(np.sum(joint * lengths)) / n
            # print(f"n={n}: L_n/n = {Ln_per:.4f}  (H = {H:.4f})")
            ...
        # per-symbol length should fall toward H = 0.881 as n grows

    _run()
    return


if __name__ == "__main__":
    app.run()
