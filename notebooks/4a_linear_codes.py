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
    # 4A: Linear & Hamming Codes

    > *"The redundant bits are the price you pay for never having to ask again."*
    > — after Richard Hamming

    Welcome to the practical-coding pillar of the course. In Part 3 you proved the astonishing fact that reliable communication over a noisy channel is *possible* — Shannon's theorem promised that codes exist which drive the error probability to zero at any rate below capacity. But Shannon's proof was non-constructive: it said good codes exist without telling you how to build one. This module is where you build one.

    We will construct codes you can actually encode and decode by hand, with algebra simple enough to fit in your head. The trick is to give the codewords *structure* — specifically, to make the set of codewords a **linear subspace** over the two-element field $\mathrm{GF}(2)$. Linearity buys us three things at once: encoding becomes a matrix multiply, the minimum distance becomes the lightest nonzero codeword, and decoding collapses to a tiny lookup keyed by a quantity called the **syndrome**.

    The crown of the module is the **Hamming (7,4) code** — Hamming's 1950 invention, the first nontrivial error-correcting code ever built, still the cleanest illustration of the whole machinery. By the end you will encode 4 data bits into 7, let an adversary flip *any single bit*, and watch the decoder find and repair the damage every single time. You will also see the **Hamming bound**, which tells you exactly how much redundancy single-error correction *must* cost.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. The Repetition Code: Redundancy, Crudely

    Before any algebra, let us see *why* we need codes at all and what "structure" buys us. Suppose you must send one bit across a binary symmetric channel (BSC) that independently flips each transmitted bit with probability $p = 0.1$. Send the raw bit and you are wrong $10\%$ of the time. Unacceptable for, say, a hard drive.

    The simplest fix is the **repetition code**: send each bit three times. To send $0$ you transmit $000$; to send $1$ you transmit $111$. The receiver takes a **majority vote**. A single flip — $000 \to 010$ — is outvoted and corrected. You only lose if *two or more* of the three bits flip.

    $$P(\text{block error}) = \binom{3}{2}p^2(1-p) + \binom{3}{3}p^3 = 3p^2 - 2p^3$$

    At $p = 0.1$ that is $0.028$ — almost a $4\times$ improvement. The price: you sent 3 bits to carry 1, a **code rate** of $R = 1/3$. Every code is this same bargain — *rate traded for reliability* — and the entire art is getting more reliability per bit of redundancy than the crude repetition code does.

    The repetition code already shows the two ideas we will generalize. First, the four impossible received words like $010$ are "close" to a legal codeword and we snap to the nearest one (**nearest-neighbour decoding**). Second, the two codewords $000$ and $111$ differ in all 3 positions — their **Hamming distance** is 3 — and that gap is exactly what lets us survive one flip. Hold onto distance; it is the hero of this module.

    > [MacKay Ch 1](https://www.inference.org.uk/itprnn/book.pdf) opens with this exact repetition-code story and the $(7,4)$ Hamming code right after.
    > [Moser Ch 3](https://moser-isi.ethz.ch/scripts.html) is the gentlest formal treatment of block codes.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        from math import log2, comb

        def block_error_rep3(p):
            return comb(3, 2) * p**2 * (1 - p) + comb(3, 3) * p**3

        print("=== Repetition code (3x) vs raw transmission over a BSC ===")
        print(f"{'p (flip prob)':>14s}  {'raw error':>10s}  {'rep-3 error':>12s}  {'improvement':>12s}")
        for _p in [0.01, 0.05, 0.1, 0.2, 0.3]:
            _raw = _p
            _rep = block_error_rep3(_p)
            print(f"{_p:>14.2f}  {_raw:>10.4f}  {_rep:>12.4f}  {_raw / _rep:>11.2f}x")

        print("\nMonte-Carlo check at p=0.1 (majority vote of 3 noisy copies):")
        _rng = np.random.default_rng(0)
        _N = 200_000
        _p = 0.1
        _sent = _rng.integers(0, 2, _N)
        _rx = np.stack([_sent ^ (_rng.random(_N) < _p) for _ in range(3)], axis=1)
        _decoded = (_rx.sum(axis=1) >= 2).astype(int)
        print(f"  empirical block error = {np.mean(_decoded != _sent):.4f}   (formula: {block_error_rep3(_p):.4f})")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Arithmetic in $\mathrm{GF}(2)$

    All of coding theory in this module lives in the **binary field** $\mathrm{GF}(2) = \{0, 1\}$, where arithmetic is done *modulo 2*. There are only two operations and they are both things you already know:

    - **Addition** is XOR: $0+0=0$, $0+1=1$, $1+0=1$, $1+1=0$. Note $1+1=0$ — there is no carry. A crucial consequence: every element is its own negative, so **subtraction is the same as addition**, and $a + a = 0$ for any $a$.
    - **Multiplication** is AND: $0\cdot 0 = 0$, $0\cdot 1 = 0$, $1\cdot 1 = 1$.

    That is the whole field. Because these obey all the usual axioms (associativity, distributivity, inverses), we can do **linear algebra** over $\mathrm{GF}(2)$ exactly as over the reals — vectors, matrices, subspaces, row reduction — as long as every "$+$" means XOR. A length-$n$ binary vector is a point in the vector space $\mathrm{GF}(2)^n$, which has exactly $2^n$ elements.

    Two definitions we will use constantly:

    - The **Hamming weight** $w(\mathbf{x})$ is the number of $1$s in $\mathbf{x}$.
    - The **Hamming distance** $d(\mathbf{x}, \mathbf{y})$ is the number of positions where $\mathbf{x}$ and $\mathbf{y}$ differ.

    These two are linked by the field: $d(\mathbf{x}, \mathbf{y}) = w(\mathbf{x} - \mathbf{y}) = w(\mathbf{x} \oplus \mathbf{y})$. Distance is just the weight of the XOR. That tiny identity is why linear codes are so easy to analyze.

    > [Roth Ch 2](https://www.cambridge.org/core/books/introduction-to-coding-theory/377D24BE73F473B15378776B0AE63CA3) builds linear codes over a general field; specialize everything to $q=2$.
    > [Lin & Costello Ch 3](https://openlibrary.org/books/OL3301344M/Error_control_coding) is the standard engineering reference for binary linear block codes.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        print("=== GF(2) addition (XOR) and multiplication (AND) ===")
        print("  +  | 0 1        *  | 0 1")
        for _a in (0, 1):
            _add = "  ".join(str(_a ^ _b) for _b in (0, 1))
            _mul = "  ".join(str(_a & _b) for _b in (0, 1))
            print(f"  {_a}  | {_add}        {_a}  | {_mul}")

        print("\nKey quirk: 1 + 1 = 0, so a + a = 0 (every element is its own inverse).")

        def weight(x):
            return int(np.sum(np.asarray(x) % 2))

        def distance(x, y):
            x = np.asarray(x) % 2
            y = np.asarray(y) % 2
            return int(np.sum(x ^ y))

        _x = np.array([1, 0, 1, 1, 0, 0, 1])
        _y = np.array([1, 1, 1, 0, 0, 1, 1])
        print(f"\nx = {_x}   weight w(x) = {weight(_x)}")
        print(f"y = {_y}   weight w(y) = {weight(_y)}")
        print(f"x XOR y = {_x ^ _y}")
        print(f"distance d(x,y) = {distance(_x, _y)} = weight of (x XOR y) = {weight(_x ^ _y)}  <- the key identity")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Linear Codes, the Generator Matrix $G$

    A **linear code** $\mathcal{C}$ is a set of binary codewords that is closed under XOR: if $\mathbf{c}_1$ and $\mathbf{c}_2$ are codewords, so is $\mathbf{c}_1 \oplus \mathbf{c}_2$. In the language of Section 2, $\mathcal{C}$ is a **subspace** of $\mathrm{GF}(2)^n$. An $[n, k]$ code packs $k$ data bits into $n$ transmitted bits, so it has exactly $2^k$ codewords and a **rate** $R = k/n$.

    Because $\mathcal{C}$ is a $k$-dimensional subspace, we can list a basis of $k$ codewords and stack them as the rows of a $k \times n$ **generator matrix** $G$. Encoding a message $\mathbf{m} \in \mathrm{GF}(2)^k$ is then a single matrix-vector product, mod 2:

    $$\mathbf{c} = \mathbf{m}\,G \pmod 2$$

    The codeword is just an XOR-combination of the rows of $G$ selected by the message bits. Every one of the $2^k$ codewords is reachable this way, and the all-zeros word is always a codeword (take $\mathbf{m} = \mathbf{0}$).

    A generator is in **systematic form** when $G = [\,I_k \mid P\,]$: the first $k$ output bits are a verbatim copy of the message and the last $n-k$ are **parity** bits computed from it. Systematic codes are convenient — you can read the data straight off the codeword — and any linear code can be put in this form by row reduction. The Hamming $(7,4)$ code we build in Section 5 uses exactly this layout: 4 data bits followed by 3 parity bits, rate $R = 4/7 \approx 0.571$.

    > [MacKay Ch 1](https://www.inference.org.uk/itprnn/book.pdf) presents $G$ and $H$ for the $(7,4)$ code with a memorable Venn-diagram picture.
    > [Lin & Costello Ch 3](https://openlibrary.org/books/OL3301344M/Error_control_coding) develops the generator/parity-check pair formally.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        P = np.array([
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
        ])
        G = np.hstack([np.eye(4, dtype=int), P]) % 2
        print("=== Systematic generator matrix G = [ I_4 | P ] for Hamming(7,4) ===")
        print(G)

        def encode(m, G):
            return (np.asarray(m) @ G) % 2

        print("\nEncoding all 16 messages (each codeword = XOR of selected rows of G):")
        print(f"{'message':>10s}   ->   {'codeword':>12s}")
        _words = []
        for _i in range(16):
            _m = np.array([(_i >> _b) & 1 for _b in (3, 2, 1, 0)])
            _c = encode(_m, G)
            _words.append(_c)
            print(f"  {''.join(map(str, _m)):>8s}   ->   {''.join(map(str, _c)):>10s}")

        _words = np.array(_words)
        _check = all(
            any(np.array_equal((_words[_i] ^ _words[_j]), _w) for _w in _words)
            for _i in range(16) for _j in range(16)
        )
        print(f"\nClosed under XOR (linearity)? {_check}   number of codewords = {len(_words)} = 2^4")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. The Parity-Check Matrix $H$ and the Syndrome

    The generator $G$ *creates* codewords; the **parity-check matrix** $H$ *tests* them. For an $[n,k]$ code, $H$ is an $(n-k) \times n$ matrix with the defining property that a vector $\mathbf{c}$ is a codeword **if and only if**

    $$H\,\mathbf{c}^{\mathsf T} = \mathbf{0} \pmod 2 .$$

    Each row of $H$ encodes one parity equation that every legal codeword must satisfy. If $G = [\,I_k \mid P\,]$ is systematic, then $H = [\,P^{\mathsf T} \mid I_{n-k}\,]$ — you can read one matrix straight off the other. The identity $H G^{\mathsf T} = 0$ holds because $P^{\mathsf T} + P^{\mathsf T} = 0$ in $\mathrm{GF}(2)$.

    Now the payoff. Suppose the channel turns the sent codeword $\mathbf{c}$ into $\mathbf{r} = \mathbf{c} \oplus \mathbf{e}$, where $\mathbf{e}$ is the **error pattern** (a $1$ wherever a bit flipped). Apply $H$ to what you received:

    $$\mathbf{s} = H\,\mathbf{r}^{\mathsf T} = H(\mathbf{c} \oplus \mathbf{e})^{\mathsf T} = \underbrace{H\,\mathbf{c}^{\mathsf T}}_{=\,\mathbf 0} \oplus\; H\,\mathbf{e}^{\mathsf T} = H\,\mathbf{e}^{\mathsf T}.$$

    This vector $\mathbf{s}$ is the **syndrome**. Read that line again — it is the whole idea of error correction. The syndrome depends **only on the error**, never on which codeword was sent. If $\mathbf{s} = \mathbf{0}$, no detectable error occurred. If $\mathbf{s} \neq \mathbf{0}$, the syndrome *names* the error: for a single-bit flip in position $j$, $\mathbf{e}$ has a lone $1$ in column $j$, so $H\mathbf{e}^{\mathsf T}$ equals **column $j$ of $H$**. Decoding a single error becomes: compute the syndrome, find which column of $H$ it matches, flip that bit. That is **syndrome decoding**, and it is what makes the next section magical.

    > [MacKay Ch 1](https://www.inference.org.uk/itprnn/book.pdf) derives the syndrome and shows single-error decoding for the $(7,4)$ code.
    > [Roth Ch 2](https://www.cambridge.org/core/books/introduction-to-coding-theory/377D24BE73F473B15378776B0AE63CA3) treats syndrome decoding and standard-array decoding in general.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        P = np.array([
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
        ])
        G = np.hstack([np.eye(4, dtype=int), P]) % 2
        H = np.hstack([P.T, np.eye(3, dtype=int)]) % 2

        print("=== Parity-check matrix H = [ P^T | I_3 ] for Hamming(7,4) ===")
        print(H)

        print(f"\nH * G^T (mod 2) should be all zeros:\n{(H @ G.T) % 2}")

        def encode(m):
            return (np.asarray(m) @ G) % 2

        def syndrome(r):
            return (H @ np.asarray(r)) % 2

        _m = np.array([1, 0, 1, 1])
        _c = encode(_m)
        print(f"\nSend message {_m} -> codeword {_c}")
        print(f"Syndrome of a clean codeword: {syndrome(_c)}   (zero, as it must be)")

        print("\nThe syndrome depends ONLY on the error, not the codeword:")
        _e = np.zeros(7, dtype=int); _e[2] = 1
        for _m2 in ([0, 0, 0, 0], [1, 1, 0, 1], [1, 0, 1, 0]):
            _r = encode(_m2) ^ _e
            print(f"  msg {_m2} flipped at pos 2 -> syndrome {syndrome(_r)} == column 2 of H = {H[:, 2]}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Hamming (7,4) Code and Minimum Distance

    Now we assemble everything. Hamming's brilliant choice for $H$: make its **columns all seven nonzero 3-bit patterns**, each appearing exactly once. With 3 parity bits there are $2^3 - 1 = 7$ nonzero columns available, so the block length is forced to $n = 7$ and the data length to $k = 7 - 3 = 4$. That is where "$(7,4)$" comes from — it is the largest single-error-correcting code you can build with 3 check bits.

    Why is this $H$ so good? Recall the syndrome of a single flip in position $j$ is column $j$ of $H$. Because **every column is distinct and nonzero**, every single-bit error produces a *different, nonzero* syndrome — so the decoder can always tell which bit flipped by matching the syndrome to the corresponding column. In the common textbook column ordering, reading the syndrome as a binary number gives the error position directly; our systematic layout uses a permuted column order so the general "match the column" rule is the one to trust.

    The strength of a code is its **minimum distance** $d_{\min}$ — the smallest Hamming distance between any two distinct codewords. For a *linear* code this simplifies beautifully: since $d(\mathbf{c}_1, \mathbf{c}_2) = w(\mathbf{c}_1 \oplus \mathbf{c}_2)$ and the XOR is itself a codeword, $d_{\min}$ equals the **minimum weight of any nonzero codeword**. There is an even slicker test via $H$: $d_{\min}$ is the smallest number of columns of $H$ that XOR to zero. No single column is zero and no two distinct columns are equal (so no two XOR to zero), but some three columns do — hence $d_{\min} = 3$ for the Hamming code.

    A code with minimum distance $d$ can:

    - **detect** up to $d - 1$ errors (any error pattern of that weight lands on a non-codeword), and
    - **correct** up to $t = \left\lfloor \dfrac{d-1}{2} \right\rfloor$ errors (nearest-neighbour decoding picks the right codeword).

    For Hamming, $d_{\min} = 3$ gives $t = 1$: it corrects **any single-bit error**. As a pure detector it can detect up to two errors, but a decoder configured to correct one error will generally mis-correct a double error rather than safely flagging it. The famous SEC-DED version is the **extended** $(8,4)$ Hamming code, which adds one overall parity bit.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        from itertools import combinations

        P = np.array([
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
        ])
        G = np.hstack([np.eye(4, dtype=int), P]) % 2

        _codewords = []
        for _i in range(16):
            _m = np.array([(_i >> _b) & 1 for _b in (3, 2, 1, 0)])
            _codewords.append((_m @ G) % 2)
        _codewords = np.array(_codewords)

        _weights = _codewords.sum(axis=1)
        _nonzero = _weights[_weights > 0]
        print("=== Minimum distance of Hamming(7,4) ===")
        print(f"Codeword weights (16 total): {sorted(_weights.tolist())}")
        print(f"Minimum NONZERO weight = d_min = {_nonzero.min()}")

        _dmin_pairwise = min(
            int(np.sum(_codewords[_i] ^ _codewords[_j]))
            for _i, _j in combinations(range(16), 2)
        )
        print(f"Minimum pairwise distance (brute force) = {_dmin_pairwise}   (matches min weight, as theory says)")

        _t = (_dmin_pairwise - 1) // 2
        print(f"\nWith d_min = {_dmin_pairwise}:")
        print(f"  detects up to d_min - 1 = {_dmin_pairwise - 1} errors")
        print(f"  corrects up to floor((d_min-1)/2) = {_t} error(s)")
        print("  if you spend the syndrome on correction, double errors are not safely flagged")
        print(f"\nWeight enumerator (how many codewords of each weight):")
        for _w in range(8):
            _cnt = int(np.sum(_weights == _w))
            if _cnt:
                print(f"  weight {_w}: {_cnt} codewords")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Interactive: The (7,4) Encoder / Decoder

    Time to drive the whole pipeline yourself. Set the four **data bits** with the toggles below, then pick a **bit to flip** in the channel (positions 1–7, or "none" for a clean channel). The demo encodes your message with $G$, injects the flip, computes the **syndrome** $\mathbf{s} = H\mathbf{r}^{\mathsf T}$, decodes the error position, repairs it, and recovers your original 4 data bits.

    Watch the syndrome: when you flip position $j$, the syndrome equals column $j$ of $H$, and the decoder repairs the word by matching that syndrome to the column table. Flip nothing and the syndrome is $000$. Try flipping any position: the decoder always lands back on your message. (Flip *two* bits and you can break it — single-error correction is exactly that, single.)
    """)
    return


@app.cell
def _(mo):
    bit0 = mo.ui.checkbox(value=True, label="data bit 1")
    bit1 = mo.ui.checkbox(value=False, label="data bit 2")
    bit2 = mo.ui.checkbox(value=True, label="data bit 3")
    bit3 = mo.ui.checkbox(value=True, label="data bit 4")
    mo.hstack([bit0, bit1, bit2, bit3])
    return bit0, bit1, bit2, bit3


@app.cell
def _(mo):
    flip_pos = mo.ui.dropdown(
        options=["none", "1", "2", "3", "4", "5", "6", "7"],
        value="3",
        label="Channel: flip bit at position",
    )
    flip_pos
    return (flip_pos,)


@app.cell
def _(bit0, bit1, bit2, bit3, flip_pos):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        P = np.array([
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
        ])
        G = np.hstack([np.eye(4, dtype=int), P]) % 2
        H = np.hstack([P.T, np.eye(3, dtype=int)]) % 2

        _m = np.array([int(bit0.value), int(bit1.value), int(bit2.value), int(bit3.value)])
        _c = (_m @ G) % 2

        _r = _c.copy()
        _flip = flip_pos.value
        if _flip != "none":
            _j = int(_flip) - 1
            _r[_j] ^= 1

        _s = (H @ _r) % 2

        _err_pos = -1
        for _col in range(7):
            if np.array_equal(_s, H[:, _col]):
                _err_pos = _col
                break

        _corrected = _r.copy()
        if _err_pos >= 0:
            _corrected[_err_pos] ^= 1
        _decoded_msg = _corrected[:4]
        _success = np.array_equal(_decoded_msg, _m)

        _fig, _axes = plt.subplots(4, 1, figsize=(8, 5.2))

        def _draw(_ax, _bits, _title, _highlight=None, _hcolor="red"):
            for _i, _b in enumerate(_bits):
                _fc = "lightgray" if _b == 0 else "steelblue"
                _ec = "black"
                _lw = 1.0
                if _highlight is not None and _i == _highlight:
                    _ec = _hcolor
                    _lw = 3.0
                _ax.add_patch(plt.Rectangle((_i, 0), 0.9, 0.9, facecolor=_fc, edgecolor=_ec, lw=_lw))
                _ax.text(_i + 0.45, 0.45, str(_b), ha="center", va="center",
                         color="white" if _b else "black", fontsize=13, fontweight="bold")
                _ax.text(_i + 0.45, -0.35, str(_i + 1), ha="center", va="center", fontsize=8, color="gray")
            _ax.set_xlim(-0.3, 7.2)
            _ax.set_ylim(-0.6, 1.0)
            _ax.set_title(_title, fontsize=10, loc="left")
            _ax.axis("off")

        _hflip = (int(_flip) - 1) if _flip != "none" else None
        _draw(_axes[0], _c, f"1. Encoded codeword  c = m G   (message m = {''.join(map(str, _m))})")
        _draw(_axes[1], _r, f"2. Received  r = c XOR e   (channel)", _highlight=_hflip, _hcolor="red")
        _stitle = (f"3. Syndrome  s = H r^T = {''.join(map(str, _s))}"
                   + (f"  ->  matches column {_err_pos + 1} of H" if _err_pos >= 0
                      else "  ->  s = 000, no error detected"))
        _axes[2].text(0.0, 0.5, _stitle, fontsize=10, va="center")
        _axes[2].axis("off")
        _draw(_axes[3], _decoded_msg,
              f"4. Decoded message = {''.join(map(str, _decoded_msg))}   "
              + ("RECOVERED ORIGINAL" if _success else "DECODE FAILED"),
              _highlight=None)
        _axes[3].set_xlim(-0.3, 7.2)

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. The Hamming Bound: How Cheap Can Correction Be?

    The Hamming code feels efficient — but is it *provably* efficient? The **Hamming bound** (a.k.a. the sphere-packing bound) answers exactly how few redundant bits single-error correction can cost.

    The picture is geometric. Think of every length-$n$ binary word as a point in $\mathrm{GF}(2)^n$ — there are $2^n$ of them. Around each of our $2^k$ codewords, draw a **ball of radius $t$**: all words within Hamming distance $t$. To correct $t$ errors, these balls must **not overlap** — every received word may lie in at most one ball, so the decoder can name a unique codeword. A ball of radius $t$ contains

    $$V(n, t) = \sum_{i=0}^{t} \binom{n}{i}$$

    words (the centre, plus all single flips, plus all double flips, up to $t$). Non-overlapping balls must fit inside the whole space, giving the **Hamming bound**:

    $$2^k \cdot \sum_{i=0}^{t} \binom{n}{i} \;\le\; 2^n .$$

    For single-error correction ($t = 1$) this reads $2^k (1 + n) \le 2^n$. A code that meets the bound with **equality** wastes nothing — its balls tile the space exactly — and is called **perfect**. Check Hamming $(7,4)$: $t=1$, so the left side is $2^4 (1 + 7) = 16 \cdot 8 = 128 = 2^7$. Equality! The Hamming codes are perfect: every one of the $2^7$ received words sits in exactly one radius-1 ball, so the decoder is *never* stumped by a single error and never wastes a syndrome. The table below lets you see, for a target redundancy $m = n-k$, how the perfect Hamming code $(2^m-1,\,2^m-1-m)$ packs space exactly while other rates leave slack.

    > [MacKay Ch 13](https://www.inference.org.uk/itprnn/book.pdf) covers the sphere-packing/Hamming bound and perfect codes.
    > [Roth Ch 2](https://www.cambridge.org/core/books/introduction-to-coding-theory/377D24BE73F473B15378776B0AE63CA3) and [Lin & Costello Ch 3](https://openlibrary.org/books/OL3301344M/Error_control_coding) give the bound and the perfect-code classification.
    """)
    return


@app.cell
def _(mo):
    redundancy = mo.ui.slider(
        start=2, stop=8, step=1, value=3,
        label="parity bits m = n - k (Hamming code uses n = 2^m - 1)",
    )
    redundancy
    return (redundancy,)


@app.cell
def _(redundancy):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt
        from math import comb

        _m = int(redundancy.value)
        _n = 2**_m - 1
        _k = _n - _m
        _rate = _k / _n

        _ball = 1 + _n
        _lhs = (2**_k) * _ball
        _rhs = 2**_n
        _perfect = _lhs == _rhs

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(10, 4))

        _ms = np.arange(2, 9)
        _ns = 2**_ms - 1
        _ks = _ns - _ms
        _rates = _ks / _ns
        _ax1.plot(_ms, _rates, "o-", color="steelblue", lw=2)
        _ax1.scatter([_m], [_rate], color="red", s=120, zorder=5)
        _ax1.annotate(f"({_n},{_k})\nR={_rate:.3f}", xy=(_m, _rate),
                      xytext=(8, -8), textcoords="offset points", color="red")
        _ax1.set_xlabel("parity bits  m = n - k")
        _ax1.set_ylabel("code rate  R = k/n")
        _ax1.set_title("Hamming code rate climbs toward 1\nas the block grows")
        _ax1.grid(True, alpha=0.3)
        _ax1.set_ylim(0, 1.0)

        _labels = ["codewords\n2^k balls", "ball volume\n(1+n)", "occupied\n2^k(1+n)", "whole space\n2^n"]
        _log_vals = [_k, log2(_ball), _k + log2(_ball), _n]
        _colors = ["steelblue", "mediumseagreen", "orange", "lightgray"]
        _ax2.bar(range(4), _log_vals, color=_colors, alpha=0.85)
        _ax2.set_xticks(range(4))
        _ax2.set_xticklabels(_labels, fontsize=8)
        _ax2.set_ylabel("log2(count)")
        _ax2.set_title(f"Sphere packing for ({_n},{_k}):  "
                       + ("PERFECT (fills space)" if _perfect else "has slack"))
        _ax2.grid(True, axis="y", alpha=0.3)
        for _i, _v in enumerate(_log_vals):
            _ax2.text(_i, _v + 0.3, f"{_v:.1f}", ha="center", fontsize=9)

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np
        from math import comb

        def ball_volume(n, t):
            return sum(comb(n, i) for i in range(t + 1))

        def hamming_bound_ok(n, k, t):
            return (2**k) * ball_volume(n, t) <= 2**n

        print("=== Code-rate vs minimum-distance table (single-error-correcting Hamming family) ===")
        print(f"{'(n, k)':>10s}  {'rate R':>8s}  {'d_min':>6s}  {'t':>3s}  {'2^k*(1+n)':>12s}  {'2^n':>10s}  {'perfect?':>9s}")
        for _m in range(2, 8):
            _n = 2**_m - 1
            _k = _n - _m
            _t = 1
            _lhs = (2**_k) * ball_volume(_n, _t)
            _rhs = 2**_n
            _R = _k / _n
            print(f"{f'({_n}, {_k})':>10s}  {_R:>8.4f}  {3:>6d}  {_t:>3d}  "
                  f"{_lhs:>12d}  {_rhs:>10d}  {('YES' if _lhs == _rhs else 'no'):>9s}")

        print("\n=== Other classic codes: the rate / distance trade ===")
        print(f"{'code':>22s}  {'(n,k)':>9s}  {'rate':>7s}  {'d_min':>6s}  {'corrects t':>11s}")
        _table = [
            ("repetition (3x)", 3, 1, 3),
            ("repetition (5x)", 5, 1, 5),
            ("single parity (8,7)", 8, 7, 2),
            ("Hamming (7,4)", 7, 4, 3),
            ("Hamming (15,11)", 15, 11, 3),
            ("extended Hamming (8,4)", 8, 4, 4),
            ("Reed-Muller (16,5)", 16, 5, 8),
        ]
        for _name, _n, _k, _d in _table:
            _t = (_d - 1) // 2
            print(f"{_name:>22s}  {f'({_n},{_k})':>9s}  {_k / _n:>7.3f}  {_d:>6d}  {_t:>11d}")
        print("\nHigher rate (less redundancy) trades against larger d_min (more protection).")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 8. Verifying Single-Error Correction Exhaustively

    Claims are cheap; let us *prove* the Hamming code corrects every single-bit error, by brute force. We loop over all $16$ messages and, for each, over all $8$ channel outcomes (no flip, or a flip in any of the 7 positions). That is $16 \times 8 = 128$ cases — every situation the code can face under a single error. The decoder must recover the original message in all of them.

    Then we show the limit: with *two* simultaneous flips the syndrome lies (it equals the XOR of two columns, which is some third column), so the decoder confidently "corrects" the wrong bit and fails. $d_{\min} = 3$ promised exactly this — correct 1, no more.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        from itertools import combinations

        P = np.array([
            [1, 1, 0],
            [1, 0, 1],
            [0, 1, 1],
            [1, 1, 1],
        ])
        G = np.hstack([np.eye(4, dtype=int), P]) % 2
        H = np.hstack([P.T, np.eye(3, dtype=int)]) % 2

        def encode(m):
            return (np.asarray(m) @ G) % 2

        def decode(r):
            s = (H @ np.asarray(r)) % 2
            r2 = np.asarray(r).copy()
            for col in range(7):
                if np.array_equal(s, H[:, col]):
                    r2[col] ^= 1
                    break
            return r2[:4], s

        _all_msgs = [np.array([(_i >> _b) & 1 for _b in (3, 2, 1, 0)]) for _i in range(16)]

        print("=== Exhaustive single-error correction test (16 msgs x 8 channel cases) ===")
        _total = 0
        _ok = 0
        for _m in _all_msgs:
            _c = encode(_m)
            for _flip in [None] + list(range(7)):
                _r = _c.copy()
                if _flip is not None:
                    _r[_flip] ^= 1
                _dec, _s = decode(_r)
                _total += 1
                _ok += int(np.array_equal(_dec, _m))
        print(f"  recovered original in {_ok}/{_total} cases  ->  {'ALL SINGLE ERRORS CORRECTED' if _ok == _total else 'FAILURE'}")

        print("\n=== Two simultaneous flips: the code's breaking point ===")
        _m = np.array([1, 0, 1, 1])
        _c = encode(_m)
        _fail = 0
        _cases = 0
        for _i, _j in combinations(range(7), 2):
            _r = _c.copy()
            _r[_i] ^= 1
            _r[_j] ^= 1
            _dec, _s = decode(_r)
            _cases += 1
            _fail += int(not np.array_equal(_dec, _m))
        print(f"  double-error cases tried: {_cases}")
        print(f"  decoder recovered the original message in {_cases - _fail} of them")
        print(f"  -> single-error-correcting means SINGLE; d_min = 3 forbids correcting 2.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    Error-correcting codes look like a communications topic, but the linear-algebra-over-$\mathrm{GF}(2)$ machinery and the redundancy/reliability bargain show up all over modern ML and data systems:

    - **Robust storage for everything you train on.** Every weight checkpoint, dataset shard, and log you keep on disk or in the cloud is protected by codes descended directly from Hamming — ECC RAM uses an extended Hamming code on every memory word, and RAID / object stores use the Reed-Solomon generalization (Module 4B). Your training run survives a bit-flip in a GPU's memory because of the syndrome trick in Section 4.
    - **Redundancy = reliability is the same bargain as ensembling.** A repetition code votes over noisy copies of a bit; a bagged ensemble votes over noisy estimates of a label. Both spend redundancy to suppress independent errors, and both are governed by how *independent* the copies are — the coding-theoretic view sharpens why decorrelated ensemble members help.
    - **Parity-check matrices are factor graphs.** The matrix $H$ defines a bipartite graph (variables on one side, checks on the other) that is *exactly* a factor graph / probabilistic graphical model. Decoding by belief propagation on that graph (Module 4D, LDPC codes) is the **same sum-product algorithm** used for inference in PGMs. Learning to read $H$ as "which variables participate in which constraint" is learning to read a graphical model.
    - **Structured projections and hashing.** Random $\mathrm{GF}(2)$ matrices appear in locality-sensitive hashing, Bloom-filter variants, and compressed-sensing-style sketches; the rank and minimum-distance intuition you built here governs how many collisions or how much information loss to expect.
    - **The geometry of generalization.** The sphere-packing picture — non-overlapping balls of "confusable" points filling a space — is the same geometry behind margins in classifiers and the packing/covering arguments used in statistical learning theory (Module 5B). "How many well-separated points fit in this space?" is a question both fields ask.

    Next, **Module 4B** generalizes $\mathrm{GF}(2)$ to the larger finite fields $\mathrm{GF}(2^m)$ and builds **Reed-Solomon and BCH codes** — the workhorses of CDs, QR codes, deep-space links, and distributed storage — using the very same generator/parity-check/syndrome skeleton you just mastered.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the math-to-code translation for every concept in this module. Remember: all arithmetic is **mod 2** (use `% 2` or `^`).
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: GF(2) Encoder

    Implement `encode(m, G)` that maps a length-$k$ message to a length-$n$ codeword via $\mathbf{c} = \mathbf{m}G \bmod 2$. Use the systematic generator $G = [\,I_4 \mid P\,]$ for Hamming $(7,4)$. Confirm the message $1011$ produces the codeword $1011010$, then verify a couple of additional messages against the table in Section 3.
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

        P = np.array([[1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]])
        G = np.hstack([np.eye(4, dtype=int), P]) % 2

        def encode(m, G):
            # TODO: matrix-vector product mod 2 (hint: @ then % 2)
            _c = ...
            return _c

        # print(encode([1, 0, 1, 1], G))   # expect [1 0 1 1 0 1 0]
        # print(encode([1, 1, 1, 1], G))   # expect [1 1 1 1 1 1 1]
        # print(encode([0, 0, 0, 0], G))   # expect [0 0 0 0 0 0 0]

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Syndrome Decoder

    Implement `syndrome(r, H)` returning $\mathbf{s} = H\mathbf{r}^{\mathsf T} \bmod 2$, then `decode_one(r, H)` that finds which column of $H$ matches the syndrome, flips that received bit, and returns the corrected 7-bit word. Test it by encoding a message, flipping one bit, and recovering it.
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

        P = np.array([[1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]])
        H = np.hstack([P.T, np.eye(3, dtype=int)]) % 2

        def syndrome(r, H):
            # TODO: H @ r mod 2
            return ...

        def decode_one(r, H):
            _s = syndrome(r, H)
            _r = np.asarray(r).copy()
            # TODO: if s is nonzero, find the column of H equal to s and flip that bit of _r
            ...
            return _r

        # r_clean = np.array([1, 0, 1, 1, 0, 1, 0])
        # r_bad = r_clean.copy(); r_bad[5] ^= 1
        # print("syndrome:", syndrome(r_bad, H))          # expect column 6 of H
        # print("decoded :", decode_one(r_bad, H))        # expect r_clean back

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Minimum Distance from the Codebook

    Generate all $2^4 = 16$ codewords, then compute the minimum distance two ways and check they agree: (a) the minimum Hamming weight over all *nonzero* codewords, and (b) the minimum pairwise Hamming distance over all distinct pairs. Both should give $3$.
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
        from itertools import combinations

        P = np.array([[1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]])
        G = np.hstack([np.eye(4, dtype=int), P]) % 2

        # TODO: build the 16x7 array of all codewords (loop over messages 0..15)
        codewords = ...

        # TODO (a): min nonzero weight
        d_from_weight = ...

        # TODO (b): min distance over all distinct pairs (distance = sum of XOR)
        d_from_pairs = ...

        # print("d_min via weights:", d_from_weight)   # expect 3
        # print("d_min via pairs  :", d_from_pairs)     # expect 3

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: The Hamming Bound

    Write `ball_volume(n, t)` for $V(n,t)=\sum_{i=0}^{t}\binom{n}{i}$ and `is_perfect(n, k, t)` that returns whether $2^k V(n,t) = 2^n$. Check that Hamming $(7,4)$ with $t=1$ is perfect, the $(15,11)$ Hamming code with $t=1$ is perfect, and the single-parity $(8,7)$ code with $t=1$ is *not* (it can only detect, not correct).
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
        from math import comb

        def ball_volume(n, t):
            # TODO: sum of C(n, i) for i = 0..t
            return ...

        def is_perfect(n, k, t):
            # TODO: 2^k * ball_volume(n, t) == 2^n ?
            return ...

        # print(is_perfect(7, 4, 1))    # expect True
        # print(is_perfect(15, 11, 1))  # expect True
        # print(is_perfect(8, 7, 1))    # expect False

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Monte-Carlo BSC Simulation

    Put it all together. Over a BSC with flip probability $p$, send many random 4-bit messages through the Hamming $(7,4)$ pipeline (encode -> add noise -> syndrome-decode) and estimate the **block error rate** (fraction of messages not perfectly recovered). Compare against an uncoded baseline that fails whenever any of its 4 bits flips. For small $p$ the coded scheme should win handily.
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

        P = np.array([[1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]])
        G = np.hstack([np.eye(4, dtype=int), P]) % 2
        H = np.hstack([P.T, np.eye(3, dtype=int)]) % 2

        rng = np.random.default_rng(0)
        p = 0.05
        N = 50_000

        def encode(m):
            return (m @ G) % 2

        def decode_one(r):
            s = (H @ r) % 2
            r = r.copy()
            for col in range(7):
                if np.array_equal(s, H[:, col]):
                    r[col] ^= 1
                    break
            return r[:4]

        n_fail_coded = 0
        n_fail_raw = 0
        for _ in range(N):
            m = rng.integers(0, 2, 4)
            # TODO: encode m, flip each of the 7 bits w.p. p, syndrome-decode, compare to m
            # TODO: also simulate the uncoded baseline: flip each of the 4 message bits w.p. p
            ...

        # print(f"coded block error   ~ {n_fail_coded / N:.4f}")
        # print(f"uncoded block error ~ {n_fail_raw / N:.4f}")   # should be larger for small p

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    # Course navigation cell
    mo.md(
        r"""
    ---

    [&#8593; Course home](../) &nbsp;|&nbsp; &#8592; Prev: [3C: Differential Entropy & the Gaussian Channel](../3c_gaussian_channel/) &nbsp;|&nbsp; Next: [4B: Finite Fields, Reed-Solomon & BCH](../4b_reed_solomon/) &#8594;
    """
    )
    return


if __name__ == "__main__":
    app.run()
