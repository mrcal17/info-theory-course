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
    # 4B: Finite Fields, Reed-Solomon & BCH

    > *"The polynomial is the most powerful tool in coding theory; finite fields are where it lives."*
    > — paraphrasing Ron M. Roth

    **This module is optional and advanced.** It is the algebra-heavy corner of the course. If you are racing along the critical path, you can skip it and lose nothing you need for the channel-coding theorem or the modern codes in 4C/4D. But if you want to understand the codes that actually protect your QR codes, your CDs and DVDs, your DSL line, your deep-space probes, and the RAID array under your filesystem — this is where they come from, and the ideas are genuinely beautiful.

    In 4A you met *linear codes over $\mathrm{GF}(2)$*: codewords are vectors of bits, encoding is a matrix multiply, and decoding is syndrome lookup. Hamming codes there correct a single bit error. That is lovely but limited. Real channels produce **bursts** of errors (a scratch on a disc, a smudge on a QR code) and sometimes tell you *where* the damage is (an **erasure**). To handle many errors at once we need a richer alphabet and a sharper tool.

    The richer alphabet is a **finite field $\mathrm{GF}(2^m)$** — a self-contained number system with exactly $2^m$ elements in which you can add, subtract, multiply, and *divide*, all while staying inside the set. The sharper tool is the **polynomial**. Reed-Solomon and BCH codes are built by treating data as the coefficients (or the values) of a polynomial over a finite field, and the deep theorem of the module is almost a slogan: *a degree-$(k-1)$ polynomial is pinned down by any $k$ of its values, so if you ship more values than you need, you can lose some and recover the rest.* That single idea powers erasure repair, error correction, and the whole edifice.

    We will build $\mathrm{GF}(2^m)$ from scratch in numpy, watch its addition and multiplication tables come alive, construct Reed-Solomon codes as polynomial-evaluation codes, see BCH as their binary cousins, sketch how Berlekamp-Massey finds errors when you do *not* know where they are, and run a live erasure-repair demo. Let us go build a number system.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Why $\mathrm{GF}(2)$ Is Not Enough

    A code is a set of *codewords*: long strings we send so that even after the channel mangles a few symbols, the receiver can still recover the original. In 4A the symbols were bits and the codewords lived in $\mathrm{GF}(2)^n$. Two limitations push us further.

    **Limitation 1 — symbols, not bits.** Storage and communication errors are bursty. A scratch on a DVD does not flip one isolated bit; it wipes out a contiguous run of *bytes*. If we make each code symbol a whole byte — an element of $\mathrm{GF}(2^8)$, 256 possible values — then an entire corrupted byte counts as a *single* symbol error, no matter how many of its 8 bits flipped. We trade a fine-grained alphabet for one that matches the physics of the channel. This is exactly why CDs, DVDs, and QR codes all work over $\mathrm{GF}(2^8)$.

    **Limitation 2 — we want to divide.** The slickest codes are built from polynomials, and polynomial algebra (interpolation, root-finding, the Euclidean algorithm) needs *division*. The integers mod 2 let you divide (the only nonzero element is 1), but the integers mod 4 do not: $2 \times 2 = 0 \pmod 4$, so 2 has no inverse. To divide freely we need a **field**, and a finite field with $q$ elements exists *if and only if* $q = p^m$ for a prime $p$. For coding over bytes we want $q = 2^8$, which is not prime — so we cannot just use "integers mod 256." We have to build $\mathrm{GF}(2^8)$ a cleverer way.

    **What a field is.** A field is a set with $+$ and $\times$ obeying the usual rules — commutativity, associativity, distributivity — plus: an additive identity $0$, a multiplicative identity $1$, every element has an additive inverse, and *every nonzero element has a multiplicative inverse*. That last property is the whole point: in a field you can always solve $a x = b$ for $x$ (just $x = b a^{-1}$).

    > [Roth Ch 3](file:///C:/Users/landa/info-theory-course/textbooks/Roth.pdf) develops finite fields from the ground up; this is the cleanest reference for the whole module.
    > [Lin & Costello Ch 6](file:///C:/Users/landa/info-theory-course/textbooks/LinCostello.pdf) introduces finite-field arithmetic specifically for code construction.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Building $\mathrm{GF}(2^m)$: Polynomials Mod an Irreducible

    Here is the construction. An element of $\mathrm{GF}(2^m)$ is a **polynomial of degree $< m$ with coefficients in $\mathrm{GF}(2)$** — equivalently, an $m$-bit string. For $m = 3$, the 8 elements are

    $$0,\; 1,\; x,\; x+1,\; x^2,\; x^2+1,\; x^2+x,\; x^2+x+1,$$

    which we can write as the bit patterns $000, 001, 010, 011, 100, 101, 110, 111$ or as the integers $0,1,2,\dots,7$.

    **Addition** is coefficient-wise mod 2 — which is just **bitwise XOR**. So $(x^2+1) + (x+1) = x^2 + x = 110$, i.e. $5 \oplus 3 = 6$. Notice every element is its own additive inverse: $a + a = 0$. Subtraction *is* addition.

    **Multiplication** is polynomial multiplication, then **reduce modulo a fixed irreducible polynomial** $p(x)$ of degree $m$ (irreducible = does not factor over $\mathrm{GF}(2)$, the analogue of a prime). For $\mathrm{GF}(2^3)$ the standard choice is $p(x) = x^3 + x + 1$. Reducing mod $p$ means: whenever your product has an $x^3$, replace $x^3$ by $x + 1$ (because $x^3 + x + 1 = 0 \Rightarrow x^3 = x+1$), and keep going until the degree drops below 3.

    Example: $x^2 \cdot x^2 = x^4$. Reduce: $x^4 = x \cdot x^3 = x(x+1) = x^2 + x$. So $4 \times 4 = 6$ in this field. Try verifying that by hand — it is strange and wonderful that it stays inside $\{0,\dots,7\}$.

    **The generator $\alpha$ — the key trick.** Take $\alpha = x$ (the element $010$, integer 2). For a well-chosen $p(x)$ (a *primitive* polynomial), the powers $\alpha^0, \alpha^1, \alpha^2, \dots, \alpha^{2^m-2}$ run through **every nonzero element exactly once** before cycling back. So the multiplicative group is *cyclic*: every nonzero element is some power of $\alpha$. This turns multiplication into addition of exponents — $\alpha^i \cdot \alpha^j = \alpha^{(i+j) \bmod (2^m-1)}$ — which gives us fast **log/antilog tables**, the workhorse of every practical implementation.

    The code below builds $\mathrm{GF}(2^3)$ with $p(x) = x^3+x+1$, prints the powers of $\alpha$, and verifies the field axioms numerically.

    > [Roth Ch 3.2–3.3](file:///C:/Users/landa/info-theory-course/textbooks/Roth.pdf) is the canonical treatment of constructing $\mathrm{GF}(q)$ as polynomials mod an irreducible.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def gf_mul_slow(a, b, m, poly):
            _r = 0
            _hi = 1 << m
            while b:
                if b & 1:
                    _r ^= a
                b >>= 1
                a <<= 1
                if a & _hi:
                    a ^= poly
            return _r

        _m = 3
        _poly = 0b1011
        _q = 1 << _m

        print(f"=== GF(2^{_m}) with p(x) = x^3 + x + 1  (poly bits = {_poly:04b}) ===\n")

        _alpha = 2
        _powers = []
        _v = 1
        for _i in range(_q - 1):
            _powers.append(_v)
            _v = gf_mul_slow(_v, _alpha, _m, _poly)
        print("Powers of alpha = x  (should hit every nonzero element once):")
        for _i, _p in enumerate(_powers):
            print(f"  alpha^{_i} = {_p}  = {_p:03b}")
        print(f"  alpha^{_q-1} cycles back to {gf_mul_slow(_powers[-1], _alpha, _m, _poly)} (= alpha^0)")

        _seen = sorted(set(_powers))
        print(f"\nDistinct nonzero elements reached: {len(_seen)} of {_q-1}  -> primitive: {_seen == list(range(1, _q))}")

        print(f"\nSpot-checks against the worked examples:")
        print(f"  4 + 4 = {4 ^ 4}        (every element is its own additive inverse)")
        print(f"  (x^2+1)+(x+1) = 5 XOR 3 = {5 ^ 3}   (expect 6 = x^2+x)")
        print(f"  4 * 4 = {gf_mul_slow(4, 4, _m, _poly)}            (expect 6 = x^2+x)")

        print("\nField axiom checks over all elements:")
        _all_ok = True
        for _a in range(_q):
            for _b in range(_q):
                if gf_mul_slow(_a, _b, _m, _poly) != gf_mul_slow(_b, _a, _m, _poly):
                    _all_ok = False
        print(f"  multiplication commutes: {_all_ok}")
        _inv_ok = all(any(gf_mul_slow(_a, _b, _m, _poly) == 1 for _b in range(_q)) for _a in range(1, _q))
        print(f"  every nonzero element has an inverse: {_inv_ok}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Interactive: A $\mathrm{GF}(2^m)$ Arithmetic Playground

    Theory is one thing; *seeing* a finite field is another. Pick a field size $m$ (giving $\mathrm{GF}(2^m)$ with $2^m$ elements) and an operation. The widget below builds the field with a standard primitive polynomial and renders the **complete operation table** — a Cayley table — as a heatmap.

    Things to notice as you explore:

    - The **addition table is just XOR**: perfectly symmetric, the main diagonal is all zeros (because $a + a = 0$), and every row is a permutation of $\{0,\dots,2^m-1\}$.
    - The **multiplication table** has a zero row and zero column (anything times 0 is 0), and the *nonzero* part is a Latin square — every nonzero value appears exactly once per row. That Latin-square property is precisely the statement that **division is well-defined**.
    - Bump $m$ up to 4 ($\mathrm{GF}(16)$, the field behind small QR codes) and the structure is the same, just larger.
    """)
    return


@app.cell
def _(mo):
    gf_m = mo.ui.slider(start=2, stop=4, step=1, value=3, label="m  (field is GF(2^m))")
    gf_m
    return (gf_m,)


@app.cell
def _(mo):
    gf_op = mo.ui.dropdown(
        options=["Addition (XOR)", "Multiplication"],
        value="Multiplication",
        label="Operation",
    )
    gf_op
    return (gf_op,)


@app.cell
def _(gf_m, gf_op):
    def _run():
        import numpy as np
        import matplotlib.pyplot as plt

        _prim = {2: 0b111, 3: 0b1011, 4: 0b10011}
        _m = int(gf_m.value)
        _poly = _prim[_m]
        _q = 1 << _m
        _hi = 1 << _m

        def _mul(a, b):
            _r = 0
            while b:
                if b & 1:
                    _r ^= a
                b >>= 1
                a <<= 1
                if a & _hi:
                    a ^= _poly
            return _r

        _table = np.zeros((_q, _q), dtype=int)
        for _a in range(_q):
            for _b in range(_q):
                _table[_a, _b] = (_a ^ _b) if gf_op.value.startswith("Addition") else _mul(_a, _b)

        _fig, _ax = plt.subplots(figsize=(6.5, 5.5))
        _im = _ax.imshow(_table, cmap="viridis", origin="upper")
        for _a in range(_q):
            for _b in range(_q):
                _ax.text(_b, _a, str(_table[_a, _b]), ha="center", va="center",
                         color="white" if _table[_a, _b] < _q / 2 else "black", fontsize=8)
        _ax.set_xticks(range(_q))
        _ax.set_yticks(range(_q))
        _ax.set_xlabel("b")
        _ax.set_ylabel("a")
        _opname = "a XOR b" if gf_op.value.startswith("Addition") else "a * b"
        _ax.set_title(f"GF(2^{_m}) Cayley table:  {_opname}   (q = {_q} elements)")
        _fig.colorbar(_im, ax=_ax, fraction=0.046, pad=0.04)
        plt.tight_layout()
        _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. Reed-Solomon as a Polynomial-Evaluation Code

    Now the payoff. A **Reed-Solomon (RS) code** treats your message as the coefficients of a polynomial and ships its *values* at many points. Here is the original (Reed & Solomon, 1960) construction, which is the cleanest way to see *why* it works.

    Work over $\mathrm{GF}(q)$ with $q = 2^m$. Fix the codeword length $n \le q$ and the message length $k < n$. Pick $n$ distinct **evaluation points** $\alpha_1, \dots, \alpha_n$ in the field (often the powers of the generator). To encode a message $(m_0, m_1, \dots, m_{k-1})$:

    1. Form the **message polynomial** $f(x) = m_0 + m_1 x + \cdots + m_{k-1} x^{k-1}$, of degree $\le k-1$.
    2. The codeword is the vector of evaluations $\big(f(\alpha_1), f(\alpha_2), \dots, f(\alpha_n)\big)$.

    That is it. You sent $n$ symbols but only $k$ were "needed" — the extra $n - k$ are redundancy.

    **Why it is so good.** A nonzero polynomial of degree $\le k-1$ has at most $k-1$ roots, so two *different* degree-$(k-1)$ polynomials can agree on at most $k-1$ points. Hence two distinct codewords differ in at least $n - (k-1) = n - k + 1$ positions. The **minimum distance** is therefore

    $$d = n - k + 1,$$

    which meets the **Singleton bound** $d \le n - k + 1$ with equality. Codes that achieve it are called **MDS (maximum distance separable)** — they are *optimally* efficient: no code with the same $n$ and $k$ can have larger minimum distance. RS codes are the most important MDS family in existence.

    **What that distance buys.** With minimum distance $d$ you can:

    - **correct any $t = \lfloor (d-1)/2 \rfloor$ symbol errors** (unknown locations), or
    - **recover any $n - k$ erasures** (known locations — covered in Section 6), or
    - any mix obeying $2(\text{errors}) + (\text{erasures}) < d$.

    Worked example: an RS code with $n = 7$, $k = 3$ over $\mathrm{GF}(2^3)$ has $d = 5$, so it corrects up to 2 symbol errors or up to 4 erasures. The code below builds exactly this code, encodes a message, and confirms the minimum distance by brute force over all codewords.

    > [Roth Ch 5–6](file:///C:/Users/landa/info-theory-course/textbooks/Roth.pdf) covers RS codes, the Singleton bound, and MDS codes in depth.
    > [Lin & Costello Ch 7](file:///C:/Users/landa/info-theory-course/textbooks/LinCostello.pdf) gives the engineering view of RS construction and decoding.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        import itertools

        _m, _poly, _q = 3, 0b1011, 8
        _hi = 1 << _m

        def _mul(a, b):
            _r = 0
            while b:
                if b & 1:
                    _r ^= a
                b >>= 1
                a <<= 1
                if a & _hi:
                    a ^= _poly
            return _r

        def _poly_eval(coeffs, x):
            _acc = 0
            for _c in reversed(coeffs):
                _acc = _mul(_acc, x) ^ _c
            return _acc

        _n, _k = 7, 3
        _points = list(range(1, _n + 1))

        def _encode(msg):
            return [_poly_eval(msg, _a) for _a in _points]

        _msg = [5, 2, 6]
        _cw = _encode(_msg)
        print(f"=== Reed-Solomon over GF(2^3):  n={_n}, k={_k} ===")
        print(f"message polynomial coeffs : {_msg}")
        print(f"evaluation points         : {_points}")
        print(f"codeword (the evaluations): {_cw}")

        _d_min = _n
        for _a in itertools.product(range(_q), repeat=_k):
            for _b in itertools.product(range(_q), repeat=_k):
                if _a == _b:
                    continue
                _ca, _cb = _encode(list(_a)), _encode(list(_b))
                _dist = sum(1 for _x, _y in zip(_ca, _cb) if _x != _y)
                if _dist < _d_min:
                    _d_min = _dist
        print(f"\nbrute-force minimum distance d = {_d_min}")
        print(f"Singleton bound  n - k + 1   = {_n - _k + 1}   -> MDS: {_d_min == _n - _k + 1}")
        print(f"=> corrects t = (d-1)//2 = {(_d_min - 1)//2} symbol errors, or up to n-k = {_n - _k} erasures")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Cyclic Codes and BCH: The Generator-Polynomial View

    The evaluation view of Section 4 is the cleanest *why*. In practice RS and BCH codes are usually described a second, equivalent way — as **cyclic codes** — because that view gives slick shift-register encoders and connects RS to its famous binary cousin, **BCH**.

    **Cyclic codes.** A linear code is *cyclic* if every cyclic shift of a codeword is again a codeword. The magic of cyclicity: identify a length-$n$ vector $(c_0,\dots,c_{n-1})$ with the polynomial $c(x) = c_0 + c_1 x + \cdots + c_{n-1} x^{n-1}$, working modulo $x^n - 1$. Then a cyclic shift is just multiplication by $x$, and the whole code is the set of multiples of a single **generator polynomial** $g(x)$ that divides $x^n - 1$. Encoding becomes one polynomial multiplication; the redundancy is $n - k = \deg g$.

    **BCH codes.** Choose $g(x)$ to have a designed run of consecutive powers of $\alpha$ as roots: $\alpha, \alpha^2, \dots, \alpha^{2t}$. The **BCH bound** then guarantees minimum distance $d \ge 2t + 1$, so the code corrects $t$ errors *by construction* — you design for the error count you want. Binary BCH codes ($\mathrm{GF}(2)$ symbols, $\mathrm{GF}(2^m)$ for the roots) generalize Hamming codes to multiple-error correction and are everywhere in older standards.

    **The punchline connecting them.** A **Reed-Solomon code is exactly a BCH code whose symbol field and root field are the same** — RS is "BCH with $n = q - 1$." Both are cyclic; both are decoded by the same machinery (syndromes → error-locator polynomial → roots). RS is MDS and works on byte symbols; BCH is binary and slightly suboptimal in distance but very cheap in hardware. The demo below builds a narrow-sense RS generator $g(x) = \prod_{i=1}^{n-k}(x - \alpha^i)$ and confirms it divides $x^n - 1$ — the defining property of a cyclic code.

    > [Lin & Costello Ch 6](file:///C:/Users/landa/info-theory-course/textbooks/LinCostello.pdf) is the standard reference for cyclic and BCH codes, including the BCH bound.
    > [Roth Ch 6](file:///C:/Users/landa/info-theory-course/textbooks/Roth.pdf) treats the cyclic / generator-polynomial structure of RS rigorously.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _m, _poly, _q = 4, 0b10011, 16
        _hi = 1 << _m

        def _mul(a, b):
            _r = 0
            while b:
                if b & 1:
                    _r ^= a
                b >>= 1
                a <<= 1
                if a & _hi:
                    a ^= _poly
            return _r

        _exp = [1] * (_q)
        _v = 1
        for _i in range(1, _q - 1):
            _v = _mul(_v, 2)
            _exp[_i] = _v
        _alpha = [_exp[_i] for _i in range(_q - 1)]

        def _poly_mul(p, qpoly):
            _res = [0] * (len(p) + len(qpoly) - 1)
            for _i, _a in enumerate(p):
                for _j, _b in enumerate(qpoly):
                    _res[_i + _j] ^= _mul(_a, _b)
            return _res

        def _poly_mod(num, den):
            _num = num[:]
            _dlead = den[-1]
            _dinv = next(_b for _b in range(1, _q) if _mul(_dlead, _b) == 1)
            for _i in range(len(_num) - 1, len(den) - 2, -1):
                if _num[_i] == 0:
                    continue
                _factor = _mul(_num[_i], _dinv)
                for _j in range(len(den)):
                    _num[_i - (len(den) - 1) + _j] ^= _mul(_factor, den[_j])
            return _num[: len(den) - 1]

        _n, _k = 15, 11
        _g = [1]
        for _i in range(1, _n - _k + 1):
            _g = _poly_mul(_g, [_alpha[_i], 1])
        print(f"=== Narrow-sense RS over GF(2^4):  n={_n}, k={_k},  t={(_n-_k)//2} ===")
        print(f"generator g(x) coeffs (low->high degree): {_g}")
        print(f"deg g = {len(_g) - 1}  should equal n - k = {_n - _k}: {len(_g) - 1 == _n - _k}")

        _xn_minus_1 = [0] * (_n + 1)
        _xn_minus_1[0] = 1
        _xn_minus_1[_n] = 1
        _rem = _poly_mod(_xn_minus_1, _g)
        print(f"\nremainder of (x^{_n} - 1) mod g(x): {_rem}")
        print(f"g(x) divides x^n - 1 (=> code is cyclic): {all(_r == 0 for _r in _rem)}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Erasure Correction by Interpolation

    An **erasure** is an error whose *location you know* but whose *value you do not* — a symbol that arrived flagged as garbage (a missing disk in a RAID array, an obviously-smudged QR module, a dropped network packet). Erasures are far easier than errors, and RS codes shine here.

    Go back to the evaluation view. The codeword is $(f(\alpha_1), \dots, f(\alpha_n))$ for some unknown degree-$(k-1)$ polynomial $f$. Suppose up to $n - k$ symbols are erased. You still hold **at least $k$ good values** $f(\alpha_{i_1}), \dots, f(\alpha_{i_k})$ at known points. And here is the theorem the whole module rests on:

    > **A polynomial of degree $\le k-1$ is uniquely determined by its values at any $k$ distinct points.**

    So we **interpolate**: recover $f$ from any $k$ surviving values (Lagrange interpolation over the finite field), then re-evaluate $f$ at the erased points to fill them back in *exactly*. No approximation, no probability — the recovery is algebraically perfect, as long as no more than $n - k$ symbols were lost. This is precisely how RAID-6, erasure-coded cloud storage, and fountain-style repair work under the hood.

    The Lagrange formula (with field arithmetic in place of ordinary arithmetic) is

    $$f(x) = \sum_{j} y_{j} \prod_{\ell \ne j} \frac{x - x_\ell}{x_j - x_\ell}, \qquad \text{evaluated where you like.}$$

    Section 7 turns this into a live demo you can break and watch repair. The cell below verifies the core claim once, cleanly: erase $n-k$ symbols, interpolate from the survivors, and check the recovered codeword matches the original bit for bit.

    > [Roth Ch 5](file:///C:/Users/landa/info-theory-course/textbooks/Roth.pdf) treats RS decoding including the erasure (interpolation) case.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _m, _poly, _q = 4, 0b10011, 16
        _hi = 1 << _m

        def _mul(a, b):
            _r = 0
            while b:
                if b & 1:
                    _r ^= a
                b >>= 1
                a <<= 1
                if a & _hi:
                    a ^= _poly
            return _r

        def _inv(a):
            return next(_b for _b in range(1, _q) if _mul(a, _b) == 1)

        def _poly_eval(coeffs, x):
            _acc = 0
            for _c in reversed(coeffs):
                _acc = _mul(_acc, x) ^ _c
            return _acc

        def _lagrange_eval(xs, ys, xq):
            _total = 0
            for _j in range(len(xs)):
                _num, _den = 1, 1
                for _l in range(len(xs)):
                    if _l == _j:
                        continue
                    _num = _mul(_num, xq ^ xs[_l])
                    _den = _mul(_den, xs[_j] ^ xs[_l])
                _total ^= _mul(ys[_j], _mul(_num, _inv(_den)))
            return _total

        _n, _k = 12, 8
        _points = list(range(1, _n + 1))
        _msg = [3, 14, 7, 1, 9, 11, 2, 5]
        _cw = [_poly_eval(_msg, _a) for _a in _points]
        print(f"=== RS erasure recovery over GF(2^4):  n={_n}, k={_k}  (tolerates {_n-_k} erasures) ===")
        print(f"original codeword: {_cw}")

        _erased = {1, 4, 7, 10}
        _recv = [None if _i in _erased else _cw[_i] for _i in range(_n)]
        print(f"erased positions : {sorted(_erased)}  ({len(_erased)} symbols)")
        print(f"received         : {_recv}")

        _good_x = [_points[_i] for _i in range(_n) if _i not in _erased]
        _good_y = [_cw[_i] for _i in range(_n) if _i not in _erased]
        _repaired = [
            _cw[_i] if _i not in _erased else _lagrange_eval(_good_x[:_k], _good_y[:_k], _points[_i])
            for _i in range(_n)
        ]
        print(f"repaired         : {_repaired}")
        print(f"perfect recovery : {_repaired == _cw}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Interactive: Reed-Solomon Erasure-Repair Demo

    Time to break a codeword yourself. Below, an RS code of length $n = 12$, dimension $k$ (your choice) over $\mathrm{GF}(2^4)$ encodes a fixed message. Use the sliders to set $k$ (how many symbols are "real," hence how much redundancy you have) and the **number of symbols to erase**. The widget erases that many positions, interpolates from the survivors, and shows you whether recovery succeeded.

    The rule to watch: recovery is **perfect if and only if erasures $\le n - k$**. Push the erasure count one past $n - k$ and the repair fails — you have thrown away more than the redundancy can replace, and the surviving values no longer pin down a unique degree-$(k-1)$ polynomial. Drag $k$ down (more redundancy) and you can survive more erasures; drag $k$ up (more payload, less protection) and the cliff arrives sooner. This single tradeoff — **rate $k/n$ vs. erasure tolerance** — is the entire engineering story of storage codes.
    """)
    return


@app.cell
def _(mo):
    rs_k = mo.ui.slider(start=2, stop=10, step=1, value=6, label="k  (message symbols; n = 12 fixed)")
    rs_k
    return (rs_k,)


@app.cell
def _(mo):
    rs_erasures = mo.ui.slider(start=0, stop=11, step=1, value=4, label="number of symbols to erase")
    rs_erasures
    return (rs_erasures,)


@app.cell
def _(rs_erasures, rs_k):
    def _run():
        import numpy as np
        import matplotlib.pyplot as plt

        _m, _poly, _q = 4, 0b10011, 16
        _hi = 1 << _m

        def _mul(a, b):
            _r = 0
            while b:
                if b & 1:
                    _r ^= a
                b >>= 1
                a <<= 1
                if a & _hi:
                    a ^= _poly
            return _r

        def _inv(a):
            return next(_b for _b in range(1, _q) if _mul(a, _b) == 1)

        def _poly_eval(coeffs, x):
            _acc = 0
            for _c in reversed(coeffs):
                _acc = _mul(_acc, x) ^ _c
            return _acc

        def _lagrange_eval(xs, ys, xq):
            _total = 0
            for _j in range(len(xs)):
                _num, _den = 1, 1
                for _l in range(len(xs)):
                    if _l == _j:
                        continue
                    _num = _mul(_num, xq ^ xs[_l])
                    _den = _mul(_den, xs[_j] ^ xs[_l])
                _total ^= _mul(ys[_j], _mul(_num, _inv(_den)))
            return _total

        _n = 12
        _k = int(rs_k.value)
        _full_msg = [3, 14, 7, 1, 9, 11, 2, 5, 13, 6][: _k]
        _points = list(range(1, _n + 1))
        _cw = [_poly_eval(_full_msg, _a) for _a in _points]

        _rng = np.random.default_rng(7)
        _ne = int(rs_erasures.value)
        _erased = set(_rng.choice(_n, size=min(_ne, _n), replace=False).tolist())

        _good_x = [_points[_i] for _i in range(_n) if _i not in _erased]
        _good_y = [_cw[_i] for _i in range(_n) if _i not in _erased]

        _can = len(_erased) <= _n - _k
        if _can and len(_good_x) >= _k:
            _repaired = [
                _cw[_i] if _i not in _erased
                else _lagrange_eval(_good_x[:_k], _good_y[:_k], _points[_i])
                for _i in range(_n)
            ]
            _ok = _repaired == _cw
        else:
            _repaired = [(_cw[_i] if _i not in _erased else -1) for _i in range(_n)]
            _ok = False

        _fig, _axes = plt.subplots(3, 1, figsize=(8.5, 5.2), sharex=True)
        _idx = np.arange(_n)

        _axes[0].bar(_idx, _cw, color="steelblue")
        _axes[0].set_ylabel("original")
        _axes[0].set_title(f"RS(n=12, k={_k}) over GF(16):  erasures={_ne},  tolerance n-k={_n-_k}")

        _recv_vals = [(_cw[_i] if _i not in _erased else 0) for _i in range(_n)]
        _colors = ["lightgray" if _i in _erased else "steelblue" for _i in range(_n)]
        _axes[1].bar(_idx, _recv_vals, color=_colors)
        _axes[1].set_ylabel("received")
        for _i in _erased:
            _axes[1].text(_i, 0.5, "X", ha="center", va="bottom", color="red", fontweight="bold")

        _rep_vals = [max(_v, 0) for _v in _repaired]
        _rcol = ["seagreen" if (_i in _erased and _ok) else
                 ("crimson" if _i in _erased else "steelblue") for _i in range(_n)]
        _axes[2].bar(_idx, _rep_vals, color=_rcol)
        _axes[2].set_ylabel("repaired")
        _axes[2].set_xlabel("symbol position")
        _axes[2].set_xticks(_idx)

        _verdict = "PERFECT RECOVERY" if _ok else "RECOVERY FAILED (too many erasures)"
        _axes[2].text(0.5, 0.85, _verdict, transform=_axes[2].transAxes,
                      ha="center", va="top",
                      color="seagreen" if _ok else "crimson", fontsize=12, fontweight="bold")
        plt.tight_layout()
        _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 8. When You Do Not Know Where the Errors Are: Berlekamp-Massey (Sketch)

    Erasures were easy because the locations were handed to you. *Errors* are harder: a symbol arrives looking perfectly valid but is wrong, and you must find **both** which positions are corrupted **and** the correct values — using only the redundancy. This is the classical RS/BCH decoding problem, and the elegant solution runs in four stages.

    **1. Syndromes.** Evaluate the received word's polynomial $r(x)$ at the $2t$ designed roots $\alpha^1, \dots, \alpha^{2t}$. If the word is a valid codeword every syndrome $S_j = r(\alpha^j)$ is zero; any nonzero syndrome announces *errors are present*. Crucially, syndromes depend only on the error, not on the original data.

    **2. Error-locator polynomial.** Say there are $\nu$ actual errors at unknown positions, i.e. at field elements $X_1, \dots, X_\nu$ (the "error locators"). Define

    $$\Lambda(x) = \prod_{i=1}^{\nu}(1 - X_i x),$$

    whose roots are the inverses of the error locations. The syndromes and $\Lambda$ are tied together by a linear recurrence — the **key equation** — and finding the shortest $\Lambda$ consistent with the syndromes *is* the decoding problem.

    **3. Berlekamp-Massey.** This is the famous algorithm. It finds the **shortest linear-feedback shift register (LFSR)** that generates the syndrome sequence — equivalently, the lowest-degree $\Lambda(x)$ satisfying the key equation. It sweeps the syndromes once, maintaining a current guess and a discrepancy, and "snaps" the register length up only when forced. It runs in $O(t^2)$ time and is the workhorse inside CD players and QR scanners. (The Euclidean algorithm on $x^{2t}$ and the syndrome polynomial is an equivalent alternative.)

    **4. Chien search + Forney.** Find the roots of $\Lambda$ by trying every field element (the **Chien search**) — their inverses are the error positions. Then **Forney's formula** computes each error *magnitude* from $\Lambda$ and the syndromes. XOR those magnitudes into the flagged positions and you are done.

    The demo below carries out **stage 1** concretely — it shows syndromes vanishing for a clean codeword and lighting up the moment an error is injected, which is the trigger the full decoder keys on. (We implement the easy, fully-worked erasure path live in Sections 6–7; the full error-locator solve is sketched here to keep the module focused.)

    > [Lin & Costello Ch 6–7](file:///C:/Users/landa/info-theory-course/textbooks/LinCostello.pdf) gives the complete Berlekamp-Massey + Chien + Forney decoder.
    > [Roth Ch 6](file:///C:/Users/landa/info-theory-course/textbooks/Roth.pdf) presents the key equation and decoding from the algebraic side.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _m, _poly, _q = 4, 0b10011, 16
        _hi = 1 << _m

        def _mul(a, b):
            _r = 0
            while b:
                if b & 1:
                    _r ^= a
                b >>= 1
                a <<= 1
                if a & _hi:
                    a ^= _poly
            return _r

        _exp = [0] * (_q - 1)
        _v = 1
        for _i in range(_q - 1):
            _exp[_i] = _v
            _v = _mul(_v, 2)

        def _poly_eval(coeffs, x):
            _acc = 0
            for _c in reversed(coeffs):
                _acc = _mul(_acc, x) ^ _c
            return _acc

        def _syndromes(word, two_t):
            return [_poly_eval(word, _exp[_j % (_q - 1)]) for _j in range(1, two_t + 1)]

        _n, _k = 15, 9
        _two_t = _n - _k
        _points = [_exp[_i] for _i in range(_n)]
        _msg = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        _cw = [_poly_eval(_msg, _a) for _a in _points]

        print(f"=== Syndrome detection, RS over GF(2^4):  n={_n}, k={_k},  2t={_two_t} ===")
        _S_clean = _syndromes(_cw, _two_t)
        print(f"syndromes of clean codeword : {_S_clean}")
        print(f"all zero (no errors flagged): {all(_s == 0 for _s in _S_clean)}")

        _bad = _cw[:]
        _bad[3] ^= 11
        _bad[10] ^= 6
        _S_bad = _syndromes(_bad, _two_t)
        print(f"\ninjected 2 symbol errors at positions 3 and 10")
        print(f"syndromes of corrupted word : {_S_bad}")
        print(f"nonzero -> errors detected  : {any(_s != 0 for _s in _S_bad)}")
        print("Berlekamp-Massey would now solve these syndromes for the error-locator polynomial,")
        print("Chien search would find positions {3, 10}, and Forney would recover the magnitudes.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 9. Where These Codes Actually Live

    Reed-Solomon and BCH are not blackboard curiosities — they are arguably the most-deployed error-correcting codes in history. A quick tour of where the algebra of this module is running right now:

    - **QR codes.** Every QR code is Reed-Solomon over $\mathrm{GF}(2^8)$. The four error-correction levels (L/M/Q/H) are just different rates $k/n$ — level H spends $\approx 30\%$ of the symbols on redundancy, which is why a QR code still scans with a logo pasted over the middle or a coffee-ring across a corner. Those are erasures and errors, repaired by exactly Sections 6-8.
    - **CDs, DVDs, Blu-ray.** The CD uses **CIRC** (Cross-Interleaved Reed-Solomon Code): two interleaved RS codes over $\mathrm{GF}(2^8)$. The interleaving spreads a physical scratch across many codewords so each sees only a few symbol errors — turning an uncorrectable burst into easy isolated errors. This is why a scratched CD still plays.
    - **Deep-space telemetry.** Voyager, and later missions, used a concatenated scheme: an inner convolutional code (4C) wrapped by an **outer Reed-Solomon code** to mop up the residual bursts the Viterbi decoder leaves behind. The RS outer code is a NASA/CCSDS standard.
    - **Storage and networking.** RAID-6 is an RS code tolerating two simultaneous disk failures (two erasures). Erasure-coded cloud storage (e.g. $(10,4)$ schemes) and modern flash/SSD controllers all lean on RS. DSL, DVB digital TV, and data-matrix barcodes use BCH or RS.
    - **BCH specifically.** Two-way pagers, older satellite links, and many flash-memory ECC engines use binary BCH because it is cheap in silicon and you dial in $t$ directly.

    The thread through all of it: choose a finite field that matches your symbol size, treat data as a polynomial, send extra evaluations, and let the MDS guarantee $d = n-k+1$ do the rest.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    This is the most coding-theory-flavored module in the course, so the ML connection is more by analogy than by daily use — but the analogies are real and worth carrying:

    - **Erasure coding = redundancy for robustness.** Distributed and federated ML training stores model shards and gradients with erasure codes so a few dropped or stragglerd workers do not stall a run; "coded computing" deliberately adds RS-style redundancy to matrix multiplications so the result is recoverable even when some workers fail. The $n-k$ erasure-tolerance tradeoff you played with in Section 7 is exactly the knob there.
    - **Polynomial interpolation is the same primitive ML leans on.** The "$k$ points determine a degree-$(k-1)$ polynomial" theorem is the noise-free twin of regression and the backbone of **Shamir secret sharing**, which underlies secure aggregation in privacy-preserving ML — a server reconstructs an aggregate from a threshold of shares by Lagrange interpolation over a finite field, precisely the Section 6 computation.
    - **Finite-field linear algebra appears in modern ML systems.** Homomorphic encryption and MPC for private inference compute over rings/fields; understanding $\mathrm{GF}(2^m)$ arithmetic demystifies what those libraries are doing under the hood.
    - **The MDS/Singleton mindset.** "How much redundancy must I pay to tolerate $t$ failures?" is the same question as model/ensemble redundancy and the rate-distortion thinking you will meet in Part 5 and 6E. RS gives the clean, optimal answer for the erasure channel.

    If you skipped here because the algebra looked forbidding: the one transferable idea is **send more than you need, structured so the surplus is interchangeable, and you can lose pieces for free.** That is a design pattern far beyond coding theory.

    Next, **Module 4C** drops the algebra and picks up *convolutional and turbo codes* — codes with memory, decoded by the Viterbi trellis, which is itself a dynamic-programming algorithm you will recognize from sequence models.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. These walk you from finite-field primitives up to a working erasure decoder — the heart of the module. Fill in the `...` blanks; expected answers are in the trailing comments.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Finite-Field Multiplication

    Implement multiplication in $\mathrm{GF}(2^m)$ via "shift-and-XOR with reduction." Multiply $a$ and $b$ bit by bit (XOR a shifted copy of $a$ whenever a bit of $b$ is set), and whenever $a$ overflows past bit $m$, XOR the reduction polynomial back in. Use $\mathrm{GF}(2^4)$ with $p(x)=x^4+x+1$ (poly bits $10011$).
    """)
    return


@app.cell
def _():
    def _run():
        def gf_mul(a, b, m=4, poly=0b10011):
            r = 0
            hi = 1 << m
            # TODO: while b: if b&1 -> r ^= a;  b >>= 1;  a <<= 1;  if a & hi -> a ^= poly
            ...
            return r

        # print(gf_mul(2, 2))      # expect 4   (x * x = x^2)
        # print(gf_mul(2, 8))      # expect 3   (x * x^3 = x^4 = x + 1)
        # print(gf_mul(7, 7))      # expect 6

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Powers of $\alpha$ Sweep the Field

    Using your `gf_mul`, generate the powers $\alpha^0, \alpha^1, \dots, \alpha^{14}$ with $\alpha = 2$ in $\mathrm{GF}(2^4)$. Collect them in a list and confirm the 15 powers are exactly the 15 nonzero elements (so $\alpha$ is *primitive*).
    """)
    return


@app.cell
def _():
    def _run():
        def gf_mul(a, b, m=4, poly=0b10011):
            r, hi = 0, 1 << m
            while b:
                if b & 1:
                    r ^= a
                b >>= 1
                a <<= 1
                if a & hi:
                    a ^= poly
            return r

        powers = []
        v = 1
        # TODO: append v, then v = gf_mul(v, 2), repeated 15 times
        ...

        # print(powers)                              # 15 distinct nonzero values
        # print(sorted(set(powers)) == list(range(1, 16)))   # expect True (primitive)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Polynomial Evaluation (Horner) and RS Encoding

    Implement `poly_eval(coeffs, x)` using Horner's rule over $\mathrm{GF}(2^4)$ (multiply-accumulate from the highest coefficient down, with field multiply and XOR for add). Then encode the message $[5, 2, 6]$ as an RS codeword: its evaluations at points $1, 2, \dots, 7$.
    """)
    return


@app.cell
def _():
    def _run():
        def gf_mul(a, b, m=4, poly=0b10011):
            r, hi = 0, 1 << m
            while b:
                if b & 1:
                    r ^= a
                b >>= 1
                a <<= 1
                if a & hi:
                    a ^= poly
            return r

        def poly_eval(coeffs, x):
            acc = 0
            # TODO: for c in reversed(coeffs): acc = gf_mul(acc, x) XOR c
            ...
            return acc

        msg = [5, 2, 6]
        # TODO: codeword = [poly_eval(msg, a) for a in range(1, 8)]
        codeword = ...

        # print(codeword)         # 7 symbols; first entry poly_eval(msg,1) = 5^2^6 = 1

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Erasure Repair by Lagrange Interpolation

    Given $k$ surviving (point, value) pairs from a degree-$(k-1)$ polynomial, reconstruct its value at any query point via Lagrange interpolation **over the field** (field multiply, XOR for add/subtract, and a field inverse for the division). You are handed `gf_inv`. Recover the value the polynomial would take at an erased point.
    """)
    return


@app.cell
def _():
    def _run():
        def gf_mul(a, b, m=4, poly=0b10011):
            r, hi = 0, 1 << m
            while b:
                if b & 1:
                    r ^= a
                b >>= 1
                a <<= 1
                if a & hi:
                    a ^= poly
            return r

        def gf_inv(a):
            return next(b for b in range(1, 16) if gf_mul(a, b) == 1)

        def lagrange_eval(xs, ys, xq):
            total = 0
            for j in range(len(xs)):
                num, den = 1, 1
                # TODO: for l != j:  num = gf_mul(num, xq XOR xs[l]);  den = gf_mul(den, xs[j] XOR xs[l])
                ...
                total ^= gf_mul(ys[j], gf_mul(num, gf_inv(den)))
            return total

        xs = [1, 2, 3]
        ys = [1, 7, 4]
        # print(lagrange_eval(xs, ys, 4))   # value of the unique degree-2 poly at x=4

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Full Erasure-Channel Round Trip

    Tie it together. Encode a length-$k=4$ message into an $n=8$ RS codeword over $\mathrm{GF}(2^4)$, erase any 4 positions (the maximum, $n-k$), then recover the *whole* codeword by interpolating from the 4 survivors and re-evaluating at the erased points. Assert exact recovery. (Reuse `gf_mul`, `poly_eval`, `lagrange_eval` patterns from above.)
    """)
    return


@app.cell
def _():
    def _run():
        def gf_mul(a, b, m=4, poly=0b10011):
            r, hi = 0, 1 << m
            while b:
                if b & 1:
                    r ^= a
                b >>= 1
                a <<= 1
                if a & hi:
                    a ^= poly
            return r

        def gf_inv(a):
            return next(b for b in range(1, 16) if gf_mul(a, b) == 1)

        def poly_eval(coeffs, x):
            acc = 0
            for c in reversed(coeffs):
                acc = gf_mul(acc, x) ^ c
            return acc

        def lagrange_eval(xs, ys, xq):
            total = 0
            for j in range(len(xs)):
                num, den = 1, 1
                for l in range(len(xs)):
                    if l == j:
                        continue
                    num = gf_mul(num, xq ^ xs[l])
                    den = gf_mul(den, xs[j] ^ xs[l])
                total ^= gf_mul(ys[j], gf_mul(num, gf_inv(den)))
            return total

        n, k = 8, 4
        points = list(range(1, n + 1))
        msg = [9, 3, 14, 6]
        codeword = [poly_eval(msg, a) for a in points]

        erased = {0, 2, 5, 7}
        good_x = [points[i] for i in range(n) if i not in erased]
        good_y = [codeword[i] for i in range(n) if i not in erased]

        # TODO: repaired[i] = codeword[i] if i kept else lagrange_eval(good_x[:k], good_y[:k], points[i])
        repaired = ...

        # print(repaired == codeword)   # expect True (perfect recovery at the n-k limit)

    _run()
    return


if __name__ == "__main__":
    app.run()
