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
    # 2B: Huffman Coding

    > *"The construction is so simple, and the result so optimal, that it is hard to believe it took until 1952 to find."*
    > — paraphrasing the folklore around David Huffman's term-paper algorithm

    In 2A you proved a *limit*: no uniquely-decodable code can beat the entropy $H(X)$ bits per symbol, and the Kraft inequality told you exactly which sets of codeword lengths are even buildable. What 2A did **not** give you is a recipe. Shannon's own code (lengths $\lceil \log_2 1/p_i \rceil$) is fine but provably *not* optimal — it can waste up to a full bit per symbol on a single rounding.

    This module hands you the recipe. **Huffman coding** is the algorithm that, given the symbol probabilities, produces a prefix code with the *minimum possible* expected length among all symbol codes. It is greedy, it is bottom-up, it fits on a napkin, and it is *provably optimal*. You will build it, watch it construct its tree, run it live on text you type, and then meet its one real weakness — the weakness that motivates arithmetic coding in 2C.

    By the end you will be able to take any distribution, hand-build the optimal code, and say precisely how far above the entropy floor you are forced to sit and why.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. The Problem Huffman Solves

    Recall the setup from 2A. We have a source emitting symbols $x \in \mathcal{X}$ with probabilities $p(x)$. We want a **prefix code** — a map from each symbol to a binary string (its codeword) such that no codeword is a prefix of another, so the stream decodes instantly and unambiguously. We measure a code $C$ by its **expected length**:

    $$L(C) = \sum_{x} p(x)\,\ell(x)$$

    where $\ell(x)$ is the number of bits in the codeword for $x$. The source coding theorem (2A) pinned this between two walls:

    $$H(X) \;\le\; L(C^\star) \;<\; H(X) + 1$$

    for the *optimal* code $C^\star$. The lower wall is the entropy; you can never beat it. The question 2B answers is: **how do we actually find $C^\star$?** Not a good code, not a near-optimal code — *the* shortest-expected-length prefix code that exists.

    Two facts about any optimal code guide the search, and Huffman's algorithm is essentially the shortest path that respects both:

    1. **More probable symbols get shorter (or equal) codewords.** If $p(a) > p(b)$ then $\ell(a) \le \ell(b)$ in an optimal code — otherwise swapping their codewords would shorten the average. This is just "spend your short codewords where they pay off."
    2. **The two least-probable symbols are siblings at the deepest level.** In an optimal *binary* tree the two longest codewords differ only in their last bit. If the deepest leaf had no sibling, you could delete its last bit and shorten the code for free.

    Hold onto fact 2 — it is the entire engine of the algorithm.

    > [MacKay Ch 5](https://www.inference.org.uk/itprnn/book.pdf) develops Huffman right after Kraft and the source coding theorem.
    > [Cover & Thomas Ch 5.6–5.8](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) gives the optimality proof in full.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The Greedy Bottom-Up Algorithm

    Huffman's idea is to *build the tree from the leaves up*, repeatedly committing to fact 2 above. Treat each symbol as a node carrying its probability (its "weight"). Then:

    1. **Take the two nodes of smallest weight.** Make them the two children of a new internal node whose weight is the sum of theirs.
    2. **Put that merged node back** into the pool, and forget its two children for the moment.
    3. **Repeat** until a single node remains — the root. Its weight is $1$.

    Now read codewords off the tree: walking from the root, assign $0$ for one branch and $1$ for the other; the codeword for a symbol is the sequence of bits on the path from root to its leaf. Because every symbol is a *leaf*, no codeword is a prefix of another — it is automatically a valid prefix code.

    **Worked example — five symbols.** Take $p = (0.40,\ 0.20,\ 0.15,\ 0.15,\ 0.10)$ for symbols $A,B,C,D,E$.

    - Merge the two smallest, $E(0.10)$ and $D(0.15)$ → node $(DE,\ 0.25)$. Pool: $A\,0.40,\ B\,0.20,\ C\,0.15,\ DE\,0.25$.
    - Merge the two smallest, $C(0.15)$ and $B(0.20)$ → node $(BC,\ 0.35)$. Pool: $A\,0.40,\ DE\,0.25,\ BC\,0.35$.
    - Merge $DE(0.25)$ and $BC(0.35)$ → node $(BCDE,\ 0.60)$. Pool: $A\,0.40,\ BCDE\,0.60$.
    - Merge $A(0.40)$ and $BCDE(0.60)$ → root $(1.0)$. Done.

    Reading bits off (left $=0$, right $=1$) gives, for instance, $A\!\to\!0$, $B\!\to\!100$… one bit for the common symbol, three bits for the rare ones. The expected length lands at $L = 2.20$ bits versus entropy $H = 2.146$ bits — within $0.054$ bits of the floor. The code below builds exactly this tree and prints the table.

    > [MacKay Ch 5.4](https://www.inference.org.uk/itprnn/book.pdf) walks the same construction with a worked example.
    """)
    return


@app.cell
def _():
    def _run():
        import heapq

        def huffman(symbols, probs):
            _counter = 0
            _heap = []
            for _s, _p in zip(symbols, probs):
                heapq.heappush(_heap, (_p, _counter, {"sym": _s}))
                _counter += 1
            if len(_heap) == 1:
                _p, _, _leaf = _heap[0]
                return {"left": _leaf, "right": None, "sym": None}
            while len(_heap) > 1:
                _p1, _, _n1 = heapq.heappop(_heap)
                _p2, _, _n2 = heapq.heappop(_heap)
                _merged = {"sym": None, "left": _n1, "right": _n2}
                heapq.heappush(_heap, (_p1 + _p2, _counter, _merged))
                _counter += 1
            return _heap[0][2]

        def codes_from_tree(node, prefix="", table=None):
            if table is None:
                table = {}
            if node is None:
                return table
            if node.get("sym") is not None:
                table[node["sym"]] = prefix if prefix else "0"
                return table
            codes_from_tree(node.get("left"), prefix + "0", table)
            codes_from_tree(node.get("right"), prefix + "1", table)
            return table

        _syms = ["A", "B", "C", "D", "E"]
        _probs = [0.40, 0.20, 0.15, 0.15, 0.10]
        _tree = huffman(_syms, _probs)
        _codes = codes_from_tree(_tree)

        import numpy as np
        _p = np.array(_probs)
        _H = float(-np.sum(_p * np.log2(_p)))
        _L = sum(_probs[_i] * len(_codes[_syms[_i]]) for _i in range(len(_syms)))

        print("=== Huffman code for p = (0.40, 0.20, 0.15, 0.15, 0.10) ===")
        print(f"  {'symbol':7s}{'prob':>7s}{'codeword':>12s}{'length':>8s}")
        for _i, _s in enumerate(_syms):
            print(f"  {_s:7s}{_probs[_i]:>7.2f}{_codes[_s]:>12s}{len(_codes[_s]):>8d}")
        print(f"\n  Entropy        H = {_H:.4f} bits/symbol")
        print(f"  Expected len   L = {_L:.4f} bits/symbol")
        print(f"  Overhead       L - H = {_L - _H:.4f} bits/symbol  (< 1, as guaranteed)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Why It Is Optimal (Proof Sketch)

    Greedy algorithms are usually *not* optimal — so why is this one? The argument is a clean two-part induction on the alphabet size $m$, and it rests entirely on the two facts from Section 1.

    **The merge is safe.** Suppose $x$ and $y$ are the two least-probable symbols. Fact 2 says *some* optimal code has $x$ and $y$ as deepest siblings. So we lose nothing by *insisting* they be siblings — there is an optimal code consistent with our very first greedy move.

    **The merge reduces the problem.** Replace the sibling pair $\{x, y\}$ by a single merged symbol $z$ with probability $p(x) + p(y)$. This gives an alphabet of size $m-1$. The key identity links the two expected lengths: if $\ell(z)$ is the depth of the merged node, then $x$ and $y$ sit one level deeper, so

    $$L_m \;=\; L_{m-1} \;+\; \big(p(x) + p(y)\big).$$

    The extra term $p(x)+p(y)$ is a **constant** that does not depend on how we code the *rest* of the tree. Therefore minimizing $L_m$ over codes-with-$x,y$-as-siblings is *exactly* the same as minimizing $L_{m-1}$ on the reduced alphabet. By induction, solving the reduced problem optimally (which Huffman does, recursively) and then splitting $z$ back into $x,y$ yields an optimal code for the original.

    **Base case:** a two-symbol alphabet. The optimal code is obviously $\{0, 1\}$, one bit each — which is what one merge produces.

    Chaining the induction: every greedy merge keeps us inside the set of "could-still-be-optimal" codes, and the recursion bottoms out at a provably optimal base. Hence the final code is optimal. The demo verifies this empirically against brute force on small alphabets.

    > [Cover & Thomas Ch 5.8](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) gives this proof rigorously (Lemma 5.8.1 and Theorem 5.8.1).
    """)
    return


@app.cell
def _():
    def _run():
        import heapq
        import itertools
        import numpy as np

        def huffman_lengths(probs):
            _counter = 0
            _heap = []
            for _p in probs:
                heapq.heappush(_heap, (_p, _counter, {"depth_acc": 0, "leaves": [_counter]}))
                _counter += 1
            _depths = {i: 0 for i in range(len(probs))}
            _nodes = {i: [i] for i in range(len(probs))}
            _h2 = [(p, i, [i]) for i, p in enumerate(probs)]
            heapq.heapify(_h2)
            while len(_h2) > 1:
                _p1, _i1, _l1 = heapq.heappop(_h2)
                _p2, _i2, _l2 = heapq.heappop(_h2)
                for _leaf in _l1 + _l2:
                    _depths[_leaf] += 1
                heapq.heappush(_h2, (_p1 + _p2, _counter, _l1 + _l2))
                _counter += 1
            return [_depths[i] for i in range(len(probs))]

        def brute_force_best_L(probs):
            _m = len(probs)
            _best = float("inf")
            for _lengths in itertools.product(range(1, _m + 1), repeat=_m):
                if sum(2.0 ** (-_l) for _l in _lengths) <= 1.0 + 1e-9:
                    _L = sum(probs[_i] * _lengths[_i] for _i in range(_m))
                    _best = min(_best, _L)
            return _best

        _rng = np.random.default_rng(2)
        print("=== Huffman vs brute-force optimum over random alphabets ===")
        print(f"  {'m':>3s}{'Huffman L':>12s}{'brute-force L':>16s}{'match?':>9s}")
        _all_match = True
        for _m in range(2, 7):
            for _ in range(400):
                _p = _rng.random(_m)
                _p = _p / _p.sum()
                _lens = huffman_lengths(_p)
                _Lh = sum(_p[_i] * _lens[_i] for _i in range(_m))
                _Lb = brute_force_best_L(_p)
                if abs(_Lh - _Lb) > 1e-9:
                    _all_match = False
            print(f"  {_m:>3d}{_Lh:>12.4f}{_Lb:>16.4f}{'yes' if abs(_Lh-_Lb)<1e-9 else 'NO':>9s}")
        print(f"\n  Huffman matched the brute-force optimum on every random trial: {_all_match}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. Expected Length vs Entropy

    Optimality does not mean Huffman *hits* the entropy floor. It means it gets as close as any **symbol code** possibly can. The exact guarantee, proved for the optimal code in 2A, therefore applies to Huffman:

    $$H(X) \;\le\; L_{\text{Huffman}} \;<\; H(X) + 1.$$

    Where in that band you land depends on how "dyadic" the distribution is. The slack comes entirely from one source: **every codeword length must be a whole number of bits.** Self-information says symbol $x$ *deserves* $\log_2 1/p(x)$ bits — but if $p(x) = 0.4$ that ideal is $1.32$ bits, and you must round to $1$ or $2$. Huffman rounds optimally *across the whole alphabet at once*, but it cannot escape integers.

    Two regimes make the band concrete:

    - **Dyadic probabilities** ($p_i = 2^{-k_i}$ for integers $k_i$). Then $\log_2 1/p_i = k_i$ is already an integer, so Huffman assigns exactly $\ell_i = k_i$ and $L = H$ *exactly* — zero overhead. Example: $p = (\tfrac12, \tfrac14, \tfrac18, \tfrac18)$ gives $H = L = 1.75$ bits.
    - **A near-deterministic source.** Say $p = (0.99, 0.005, 0.005)$. The entropy is tiny, $H \approx 0.0908$ bits, but Huffman *must* spend at least **one whole bit** on the common symbol — you cannot emit "less than one bit" for a single symbol. So $L = 1.01$ bits, an overhead of over $0.9$ bits, more than $11\times$ the entropy. This is the disaster case, and it is exactly what arithmetic coding (2C) fixes.

    The demo computes $H$, $L$, and the overhead for a spread of distributions so you can see the band breathe.

    > [Cover & Thomas Ch 5.4](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) bounds $L$ between $H$ and $H+1$; [MacKay Ch 5.6](https://www.inference.org.uk/itprnn/book.pdf) discusses the integer-length penalty.
    """)
    return


@app.cell
def _():
    def _run():
        import heapq
        import numpy as np

        def huffman_lengths(probs):
            _counter = len(probs)
            _h = [(p, i, [i]) for i, p in enumerate(probs)]
            heapq.heapify(_h)
            _depths = {i: 0 for i in range(len(probs))}
            if len(_h) == 1:
                _depths[0] = 1
                return [_depths[0]]
            while len(_h) > 1:
                _p1, _i1, _l1 = heapq.heappop(_h)
                _p2, _i2, _l2 = heapq.heappop(_h)
                for _leaf in _l1 + _l2:
                    _depths[_leaf] += 1
                heapq.heappush(_h, (_p1 + _p2, _counter, _l1 + _l2))
                _counter += 1
            return [_depths[i] for i in range(len(probs))]

        def entropy(p):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log2(p)))

        _cases = {
            "dyadic (1/2,1/4,1/8,1/8)": [0.5, 0.25, 0.125, 0.125],
            "uniform over 5": [0.2] * 5,
            "5-symbol skewed": [0.40, 0.20, 0.15, 0.15, 0.10],
            "near-deterministic": [0.99, 0.005, 0.005],
            "Zipf-ish over 8": list(np.array([1 / k for k in range(1, 9)]) / sum(1 / k for k in range(1, 9))),
        }

        print("=== Expected length vs entropy across distributions ===")
        print(f"  {'distribution':28s}{'H':>8s}{'L_Huff':>9s}{'L-H':>8s}{'L/H':>7s}")
        for _name, _p in _cases.items():
            _lens = huffman_lengths(_p)
            _L = sum(_p[_i] * _lens[_i] for _i in range(len(_p)))
            _H = entropy(_p)
            _ratio = _L / _H if _H > 1e-9 else float("inf")
            print(f"  {_name:28s}{_H:>8.4f}{_L:>9.4f}{_L - _H:>8.4f}{_ratio:>7.2f}")
        print("\n  Dyadic -> L = H exactly. Near-deterministic -> overhead near a full bit.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Live Huffman Coder

    Type any text below. The notebook counts character frequencies, builds the Huffman tree on them, shows the full code table, and reports the average bits/character against the entropy floor. Try a repetitive string like `aaaaaab` (low entropy, big overhead), then a varied one like a full sentence, and watch the bits/symbol move.
    """)
    return


@app.cell
def _(mo):
    text_input = mo.ui.text_area(
        value="the quick brown fox jumps over the lazy dog",
        label="Text to Huffman-encode",
        full_width=True,
    )
    text_input
    return (text_input,)


@app.cell
def _(text_input):
    def _run():
        import heapq
        from collections import Counter
        import numpy as np

        _s = text_input.value
        if not _s:
            print("Type some text above to build a Huffman code.")
            return

        _counts = Counter(_s)
        _syms = list(_counts.keys())
        _freqs = np.array([_counts[_c] for _c in _syms], dtype=float)
        _probs = _freqs / _freqs.sum()

        _counter = len(_syms)
        _heap = []
        for _i, _c in enumerate(_syms):
            heapq.heappush(_heap, (_freqs[_i], _counter, {"sym": _c}))
            _counter += 1
        if len(_heap) == 1:
            _root = {"sym": None, "left": _heap[0][2], "right": None}
        else:
            while len(_heap) > 1:
                _w1, _, _n1 = heapq.heappop(_heap)
                _w2, _, _n2 = heapq.heappop(_heap)
                heapq.heappush(_heap, (_w1 + _w2, _counter, {"sym": None, "left": _n1, "right": _n2}))
                _counter += 1
            _root = _heap[0][2]

        _codes = {}

        def walk(node, pre):
            if node is None:
                return
            if node.get("sym") is not None:
                _codes[node["sym"]] = pre if pre else "0"
                return
            walk(node.get("left"), pre + "0")
            walk(node.get("right"), pre + "1")

        walk(_root, "")

        _H = float(-np.sum(_probs * np.log2(_probs)))
        _L = sum(_probs[_i] * len(_codes[_syms[_i]]) for _i in range(len(_syms)))
        _total_bits = sum(_counts[_c] * len(_codes[_c]) for _c in _syms)
        _naive_bits = len(_s) * 8

        def _show(_c):
            return "' '" if _c == " " else ("\\n" if _c == "\n" else f"'{_c}'")

        _order = sorted(range(len(_syms)), key=lambda _i: -_freqs[_i])
        print(f"=== Huffman code for {len(_s)} chars, {len(_syms)} distinct symbols ===")
        print(f"  {'sym':6s}{'count':>7s}{'prob':>8s}{'code':>16s}{'bits':>6s}")
        for _i in _order:
            _c = _syms[_i]
            print(f"  {_show(_c):6s}{int(_freqs[_i]):>7d}{_probs[_i]:>8.3f}{_codes[_c]:>16s}{len(_codes[_c]):>6d}")
        print(f"\n  Entropy        H = {_H:.4f} bits/char")
        print(f"  Huffman avg    L = {_L:.4f} bits/char")
        print(f"  Overhead       L - H = {_L - _H:.4f} bits/char")
        print(f"  Encoded size   {_total_bits} bits  vs  {_naive_bits} bits at 8 bits/char "
              f"({100 * _total_bits / _naive_bits:.0f}%)")

    _run()
    return


@app.cell
def _(text_input):
    def _run():
        import heapq
        from collections import Counter
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _s = text_input.value
        if not _s:
            _fig, _ax = plt.subplots(figsize=(7, 3))
            _ax.text(0.5, 0.5, "type text above", ha="center", va="center")
            _ax.axis("off")
            return _fig

        _counts = Counter(_s)
        _syms = list(_counts.keys())
        _freqs = np.array([_counts[_c] for _c in _syms], dtype=float)

        _counter = len(_syms)
        _heap = []
        for _i, _c in enumerate(_syms):
            heapq.heappush(_heap, (_freqs[_i], _counter, {"sym": _c, "x": None, "y": None}))
            _counter += 1
        _edges = []
        if len(_heap) == 1:
            _root = {"sym": None, "x": None, "y": None,
                     "left": _heap[0][2], "right": None}
        else:
            while len(_heap) > 1:
                _w1, _, _n1 = heapq.heappop(_heap)
                _w2, _, _n2 = heapq.heappop(_heap)
                _node = {"sym": None, "x": None, "y": None, "left": _n1, "right": _n2}
                heapq.heappush(_heap, (_w1 + _w2, _counter, _node))
                _counter += 1
            _root = _heap[0][2]

        _leaf_x = [0.0]

        def layout(node, depth):
            if node is None:
                return 0.0
            if node.get("sym") is not None:
                node["x"] = _leaf_x[0]
                node["y"] = -depth
                _leaf_x[0] += 1.0
                return node["x"]
            lx = layout(node.get("left"), depth + 1)
            rx = layout(node.get("right"), depth + 1)
            node["x"] = (lx + rx) / 2.0
            node["y"] = -depth
            return node["x"]

        layout(_root, 0)

        _fig, _ax = plt.subplots(figsize=(8, 5))

        def draw(node):
            if node is None:
                return
            for child, bit in ((node.get("left"), "0"), (node.get("right"), "1")):
                if child is None:
                    continue
                _ax.plot([node["x"], child["x"]], [node["y"], child["y"]],
                         color="gray", lw=1.2, zorder=1)
                mx, my = (node["x"] + child["x"]) / 2, (node["y"] + child["y"]) / 2
                _ax.text(mx, my, bit, fontsize=9, color="crimson",
                         ha="center", va="center",
                         bbox=dict(boxstyle="round,pad=0.1", fc="white", ec="none"))
                draw(child)
            if node.get("sym") is not None:
                lab = "' '" if node["sym"] == " " else ("\\n" if node["sym"] == "\n" else node["sym"])
                _ax.scatter([node["x"]], [node["y"]], s=420, color="steelblue", zorder=2)
                _ax.text(node["x"], node["y"], lab, color="white", ha="center", va="center",
                         fontsize=9, zorder=3)
            else:
                _ax.scatter([node["x"]], [node["y"]], s=120, color="lightgray",
                            edgecolor="gray", zorder=2)

        draw(_root)
        _ax.set_title("Huffman tree (0 = left, 1 = right; leaves are symbols)")
        _ax.axis("off")
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.image(src="../animations/rendered/HuffmanTree.gif")
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Extended (Block) Huffman: Beating the Penalty

    Section 4 left us with a sting: when entropy is far below one bit, Huffman wastes nearly a whole bit per symbol because it cannot emit fractional bits. There is a beautiful fix that does not require leaving the world of symbol codes — **code blocks of symbols, not single symbols.**

    Group $n$ consecutive source symbols into a single super-symbol. For an i.i.d. source the block $X^n = (X_1, \dots, X_n)$ has entropy $H(X^n) = n\,H(X)$ and a much larger alphabet of size $|\mathcal{X}|^n$. Run Huffman on *that*. The $H \le L < H+1$ guarantee now reads, for the per-block length $L_n$:

    $$n\,H(X) \;\le\; L_n \;<\; n\,H(X) + 1.$$

    Divide by $n$ to get the **per-original-symbol** rate:

    $$H(X) \;\le\; \frac{L_n}{n} \;<\; H(X) + \frac{1}{n}.$$

    The leftover penalty shrinks like $1/n$. Block two symbols and the worst-case waste halves; block ten and it drops to a tenth of a bit; let $n \to \infty$ and you reach the entropy floor exactly. This is, in fact, one constructive proof of the source coding theorem: optimal symbol codes on long blocks *achieve* the entropy rate.

    **Concrete payoff.** Take the near-deterministic source $p = (0.9, 0.1)$, with $H = 0.469$ bits. Single-symbol Huffman is stuck at $L_1 = 1.0$ bit — more than double the entropy. Block $n=2$ and you typically reach $\approx 0.645$ bits/symbol; $n=4$ drops further; the demo traces the staircase down toward $0.469$.

    The cost, of course, is an exponentially growing codebook ($2^n$ entries for a binary source) and the need to buffer $n$ symbols before emitting anything. That tension — vanishing penalty versus exploding tables — is exactly the gap that **arithmetic coding** (2C) closes by abandoning fixed per-symbol codewords entirely.

    > [Cover & Thomas Ch 5.4](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) (Theorem 5.4.2) proves the $1/n$ block bound; [MacKay Ch 5.6](https://www.inference.org.uk/itprnn/book.pdf) motivates moving to stream codes.
    """)
    return


@app.cell
def _(mo):
    block_size = mo.ui.slider(start=1, stop=5, step=1, value=1, label="block length n (source p = 0.9 / 0.1)")
    block_size
    return (block_size,)


@app.cell
def _(block_size):
    def _run():
        import heapq
        import itertools
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        def huffman_lengths(probs):
            _counter = len(probs)
            _h = [(p, i, [i]) for i, p in enumerate(probs)]
            heapq.heapify(_h)
            _depths = {i: 0 for i in range(len(probs))}
            if len(_h) == 1:
                return [1]
            while len(_h) > 1:
                _p1, _i1, _l1 = heapq.heappop(_h)
                _p2, _i2, _l2 = heapq.heappop(_h)
                for _leaf in _l1 + _l2:
                    _depths[_leaf] += 1
                heapq.heappush(_h, (_p1 + _p2, _counter, _l1 + _l2))
                _counter += 1
            return [_depths[i] for i in range(len(probs))]

        _p0, _p1 = 0.9, 0.1
        _H = float(-(_p0 * np.log2(_p0) + _p1 * np.log2(_p1)))

        _ns = list(range(1, 6))
        _rates = []
        for _n in _ns:
            _block_probs = []
            for _combo in itertools.product([_p0, _p1], repeat=_n):
                _prob = 1.0
                for _q in _combo:
                    _prob *= _q
                _block_probs.append(_prob)
            _lens = huffman_lengths(_block_probs)
            _Ln = sum(_block_probs[_i] * _lens[_i] for _i in range(len(_block_probs)))
            _rates.append(_Ln / _n)

        _n_sel = block_size.value
        _rate_sel = _rates[_n_sel - 1]

        _fig, _ax = plt.subplots(figsize=(7, 4))
        _ax.axhline(_H, color="green", ls="--", lw=2, label=f"entropy H = {_H:.3f}")
        _ax.axhline(_H + 1, color="orange", ls=":", lw=1.5, label="H + 1 (per-symbol ceiling)")
        _ax.plot(_ns, _rates, "o-", color="steelblue", lw=2, label="L_n / n  (block Huffman)")
        _ax.scatter([_n_sel], [_rate_sel], color="red", s=120, zorder=5)
        _ax.annotate(f"n={_n_sel}: {_rate_sel:.3f} bits/sym",
                     xy=(_n_sel, _rate_sel), xytext=(0.45, 0.7),
                     textcoords="axes fraction",
                     arrowprops=dict(arrowstyle="->", color="red", alpha=0.6))
        _ax.set_xlabel("block length n")
        _ax.set_ylabel("bits per original symbol")
        _ax.set_title("Block Huffman closes the gap to entropy as 1/n")
        _ax.set_xticks(_ns)
        _ax.grid(True, alpha=0.3)
        _ax.legend(loc="upper right")
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. The Fundamental Limitation

    Step back and name the one weakness precisely, because it shapes everything in 2C and 2D.

    **Huffman is optimal among symbol codes, but symbol codes are themselves a limited class.** A symbol code commits to a fixed integer-length codeword *per symbol*. That commitment costs you in three ways:

    1. **Integer granularity.** No symbol can ever cost less than one bit, even when its self-information is $0.01$ bits. For highly skewed or near-deterministic sources this is the dominant inefficiency — up to $\approx 1$ bit/symbol wasted.
    2. **Blocking is exponential.** The $1/n$ fix from Section 6 works, but the codebook grows as $|\mathcal{X}|^n$. To shave the penalty to $0.01$ bits on a binary source you need $n \approx 100$ and a table of $2^{100}$ entries — utterly impractical.
    3. **Static models adapt poorly.** Classic Huffman needs the probabilities up front, or a two-pass scheme. Adaptive Huffman exists but is fiddly, and re-balancing the tree on every symbol is awkward compared to simply updating a probability estimate.

    **Arithmetic coding (2C)** dissolves all three at once. Instead of one codeword per symbol it encodes the *entire message* as a single number in $[0,1)$, narrowing an interval by a factor of $p(x)$ at each symbol. The cost of a symbol becomes $\log_2 1/p(x)$ bits **exactly — fractional bits and all** — with no rounding until the very end, and the probability model can change every step. It is the natural endpoint of the road Huffman started us on. Huffman remains the right tool when speed and simplicity matter and the distribution is reasonably uniform (JPEG, DEFLATE/zip, PNG, MP3 all use it); arithmetic and range coding take over when you need the last fraction of a bit.

    > [MacKay Ch 6](https://www.inference.org.uk/itprnn/book.pdf) opens the case for stream codes by naming exactly these Huffman limitations; [Cover & Thomas Ch 5.9–5.10](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) covers Shannon-Fano-Elias and the bridge to arithmetic coding.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    Huffman coding looks like a pure-engineering artifact, but the ideas reappear all over modern ML:

    - **Hierarchical / adaptive softmax.** Training a language model with a huge vocabulary, a flat softmax over $V$ words costs $O(V)$ per step. **Hierarchical softmax** replaces it with a binary tree over the vocabulary and predicts a word by its root-to-leaf path — and the standard trick is to use a **Huffman tree** built from word frequencies (this is exactly what word2vec does). Frequent words sit near the root with short paths, so the *expected* number of binary decisions per token is the Huffman expected length — you are minimizing average compute the same way Huffman minimizes average bits.
    - **The integer-bit penalty is the cross-entropy gap you can't model away.** Cross-entropy loss measures bits-per-token your model spends. Huffman shows that even with the *true* distribution, a symbol code overshoots entropy by up to a bit; arithmetic coding removes that gap. Neural compressors (2E, 6E) pair a learned probability model with an arithmetic/range coder precisely so the model's predicted $\log_2 1/p$ is paid *exactly*, not rounded.
    - **Code length = negative log-likelihood.** "Assign short codewords to probable symbols" is literally "assign low loss to likely data." The MDL principle (6B) makes this identity the basis of model selection: the best model is the one that compresses the data most, and Huffman/arithmetic length is the operational meaning of that compression.
    - **Greedy-with-a-proof.** Huffman is a rare greedy algorithm that is provably globally optimal. The exchange-argument style of its proof (Section 3) is the same reasoning behind optimal merging, priority scheduling, and several tree-construction steps inside decision-tree learners.

    Next, **Module 2C (Arithmetic & Range Coding)** delivers on the promise made in Section 7: a coder that pays $\log_2 1/p$ bits per symbol with no integer rounding, adapts its model on the fly, and reaches the entropy floor for real.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. Together they walk you from building the tree to measuring the entropy gap and beating it with blocks.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Build the Huffman Tree

    Implement `huffman(probs)` using a min-heap. Push each symbol as a leaf, then repeatedly pop the two lightest nodes, merge them under a new parent, and push the parent back. Return the root node. Use a tie-breaking counter so the heap never tries to compare two node dicts.
    """)
    return


@app.cell
def _():
    def _run():
        import heapq

        def huffman(probs):
            counter = len(probs)
            heap = [(probs[i], i, {"sym": i, "left": None, "right": None}) for i in range(len(probs))]
            heapq.heapify(heap)
            # TODO: while more than one node remains, pop two lightest, merge, push parent
            # hint: parent = {"sym": None, "left": n1, "right": n2}; weight = w1 + w2
            # hint: use `counter` as the tie-break key, then counter += 1
            ...
            return heap[0][2]

        # _root = huffman([0.4, 0.2, 0.15, 0.15, 0.1])
        # print(_root["sym"] is None)   # expect True (root is internal)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Read Codewords Off the Tree

    Walk the tree from Exercise 1 and produce the `{symbol: codeword}` table. Going left appends `'0'`, going right appends `'1'`; record the accumulated string when you reach a leaf (a node whose `sym` is not `None`).
    """)
    return


@app.cell
def _():
    def _run():
        def codes_from_tree(node, prefix="", table=None):
            if table is None:
                table = {}
            # TODO: if node is a leaf (node["sym"] is not None), store table[node["sym"]] = prefix or "0"
            # TODO: otherwise recurse left with prefix+"0" and right with prefix+"1"
            ...
            return table

        # Build a tiny tree by hand to test:
        # leaf_a = {"sym": "a", "left": None, "right": None}
        # leaf_b = {"sym": "b", "left": None, "right": None}
        # root = {"sym": None, "left": leaf_a, "right": leaf_b}
        # print(codes_from_tree(root))   # expect {'a': '0', 'b': '1'}

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Expected Length and the Entropy Gap

    Given probabilities and the codeword lengths your Huffman code assigns, compute the expected length $L = \sum_i p_i \ell_i$ and the entropy $H$, then report the overhead $L - H$. Confirm it lands in $[0, 1)$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        probs = np.array([0.40, 0.20, 0.15, 0.15, 0.10])
        lengths = np.array([1, 3, 3, 3, 3])  # codeword lengths from a Huffman run

        # TODO: expected length L = sum p_i * len_i
        L = ...

        # TODO: entropy H = -sum p_i log2 p_i  (all p_i > 0 here)
        H = ...

        # print(f"L = {L:.4f}, H = {H:.4f}, overhead = {L - H:.4f}")
        # expect L ~ 2.20, H ~ 2.146, overhead ~ 0.054 (in [0,1))

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Huffman a String

    Put it together. Count character frequencies in a string, build the Huffman code on those counts, and compute the total encoded size in bits. Compare to the naive $8$ bits/char baseline.
    """)
    return


@app.cell
def _():
    def _run():
        import heapq
        from collections import Counter

        def huffman_from_counts(counts):
            counter = len(counts)
            heap = [(c, i, {"sym": s}) for i, (s, c) in enumerate(counts.items())]
            heapq.heapify(heap)
            # TODO: merge until one node remains (same loop as Exercise 1)
            ...
            return heap[0][2]

        def codes_from_tree(node, prefix="", table=None):
            if table is None:
                table = {}
            if node.get("sym") is not None:
                table[node["sym"]] = prefix or "0"
                return table
            codes_from_tree(node["left"], prefix + "0", table)
            codes_from_tree(node["right"], prefix + "1", table)
            return table

        s = "abracadabra"
        counts = Counter(s)

        # TODO: build the tree, read codes, total bits = sum count[c] * len(code[c])
        total_bits = ...

        # print(f"{total_bits} bits  vs  {len(s) * 8} bits naive")
        # expect total_bits = 23 for "abracadabra"

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Block Huffman Shrinks the Penalty

    For the source $p = (0.9, 0.1)$, build the block distribution over all $2^n$ length-$n$ strings (probabilities multiply for an i.i.d. source), run Huffman, and compute the per-symbol rate $L_n / n$. Show it falls toward $H \approx 0.469$ as $n$ grows.
    """)
    return


@app.cell
def _():
    def _run():
        import heapq
        import itertools
        import numpy as np

        def huffman_lengths(probs):
            counter = len(probs)
            h = [(p, i, [i]) for i, p in enumerate(probs)]
            heapq.heapify(h)
            depths = {i: 0 for i in range(len(probs))}
            while len(h) > 1:
                p1, i1, l1 = heapq.heappop(h)
                p2, i2, l2 = heapq.heappop(h)
                for leaf in l1 + l2:
                    depths[leaf] += 1
                heapq.heappush(h, (p1 + p2, counter, l1 + l2))
                counter += 1
            return [depths[i] for i in range(len(probs))]

        p = (0.9, 0.1)

        # TODO: for n in range(1, 5):
        #   block_probs = product of marginals over all length-n strings
        #     hint: itertools.product(p, repeat=n); multiply the tuple's entries
        #   lens = huffman_lengths(block_probs)
        #   rate = (sum block_probs_i * lens_i) / n
        #   print(f"n={n}: {rate:.4f} bits/symbol")
        block_probs = ...
        rate = ...

        # expect the rate to decrease toward 0.469 as n increases
        # n=1: 1.0000, n=2: ~0.645, n=3: ~0.583, n=4: ~0.493 bits/symbol

    _run()
    return


if __name__ == "__main__":
    app.run()
