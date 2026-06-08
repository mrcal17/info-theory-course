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
    # 2C: Arithmetic & Range Coding

    > *"The trick is to encode the whole message as a single number."*
    > — the one idea behind arithmetic coding

    In 2B you built Huffman codes — provably optimal *symbol* codes. But "optimal among symbol codes" hides a real defect: a symbol code must spend a **whole number of bits** on every symbol. When a symbol deserves 0.2 bits, Huffman still pays at least 1. For skewed sources that rounding tax is brutal, and the usual fix (blocking symbols together) blows up the codebook.

    Arithmetic coding sidesteps the whole problem. Instead of giving each symbol its own bit-string, it encodes the **entire message as a single number** in the interval $[0, 1)$. Each symbol just narrows the interval a little, in proportion to its probability. The final interval's width is exactly the message's probability, so the number of bits to name a point inside it is essentially $\log_2(1/P(\text{message}))$ — the Shannon ideal, with the per-symbol rounding loss gone.

    This is the first **stream code** in the course: it does not chop the input into independently-coded pieces, it folds the whole stream into one shrinking interval. That structural shift is also what lets the probability model *change as it goes* — the key to adaptive compression, and the reason arithmetic coding (and its integer cousin, range coding) sits inside JPEG, JPEG 2000, H.264/265, and the modern ANS/CABAC family. Let us build it from the interval up.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Symbol Codes Hit a Wall

    Recall the source coding theorem from 2A: the entropy $H(X)$ is the floor on the average code length, and a symbol code can get within one bit of it, $H(X) \le L < H(X) + 1$. That "$+1$" is the problem. The per-symbol overhead is at most one bit — but for a *very* predictable source one bit is enormous.

    Take a binary source with $P(a) = 0.99$, $P(b) = 0.01$. Its entropy is

    $$H = -0.99\log_2 0.99 - 0.01\log_2 0.01 \approx 0.0808 \text{ bits/symbol}.$$

    The ideal code length of the common symbol $a$ is $-\log_2 0.99 \approx 0.0145$ bits. But any symbol code must assign $a$ a codeword of length $\ge 1$ bit. So Huffman is forced to spend at least **1 bit/symbol** — more than **12×** the entropy. You can recover most of that by Huffman-coding *blocks* of $k$ symbols at once (the overhead drops to $1/k$ bit per symbol), but the alphabet of blocks grows as (alphabet size)$^k$, and the codebook becomes unmanageable long before you reach the entropy.

    Arithmetic coding gives you the blocking benefit for *free*: it effectively codes the entire message as one giant block, with no exponential codebook, because it never materializes the codewords at all. It works directly with the cumulative probabilities.

    > [MacKay Ch 6](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) makes exactly this case for stream codes over symbol codes, then builds arithmetic coding from it.
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

        _p = np.array([0.99, 0.01])
        _H = entropy(_p)
        print("=== Why one bit per symbol is too many ===")
        print(f"  source P(a)=0.99, P(b)=0.01")
        print(f"  entropy H              = {_H:.4f} bits/symbol")
        print(f"  ideal length of 'a'    = {-np.log2(0.99):.4f} bits")
        print(f"  Huffman must spend     >= 1.0000 bits/symbol")
        print(f"  Huffman overhead       ~ {1.0 / _H:.1f}x the entropy\n")

        print("  Blocking k symbols recovers it slowly (overhead = 1/k bit/symbol):")
        for _k in [1, 2, 4, 8]:
            _blocks = 2 ** _k
            print(f"    k={_k:2d}:  worst-case L/k <= H + {1.0 / _k:.4f},   "
                  f"codebook size up to {_blocks} blocks")
        print("\n  Arithmetic coding codes the WHOLE message as one block, "
              "with no codebook.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The $[0, 1)$ Interval: One Number for the Whole Message

    Here is the central picture. Every possible message of a given length corresponds to a distinct sub-interval of $[0, 1)$, and the **width of that sub-interval is exactly the probability of the message**. To transmit a message you transmit *any* number that falls inside its interval.

    Why does this work? Lay the symbols of the alphabet end-to-end along $[0, 1)$, each occupying a slice as wide as its probability. The **cumulative distribution** gives the slice boundaries: symbol $s$ occupies $[\,F(s),\ F(s) + p(s)\,)$, where $F(s) = \sum_{s' < s} p(s')$ is the cumulative probability of everything before $s$.

    Reading the *first* symbol tells you which slice you are in — it narrows $[0, 1)$ down to that symbol's slice. Now subdivide *that* slice the same way for the second symbol, and so on. After $n$ symbols you are sitting in a tiny interval whose width is

    $$P(\text{message}) = \prod_{i=1}^{n} p(s_i),$$

    because each step multiplies the current width by the next symbol's probability. Independent probabilities multiply; interval widths multiply; they are the same arithmetic.

    A point inside an interval of width $w$ needs about $\log_2(1/w)$ bits to specify (you need enough binary digits to land in something that narrow). So the message costs about

    $$\log_2 \frac{1}{P(\text{message})} = \sum_{i=1}^n \log_2 \frac{1}{p(s_i)} \text{ bits}$$

    — the sum of the symbols' self-informations, i.e. exactly the Shannon ideal. No rounding per symbol; the only rounding is once, at the very end, when you name the final point.

    > [MacKay Ch 6.2](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) develops the interval picture and the encoder/decoder in detail.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _probs = {"a": 0.5, "b": 0.3, "c": 0.2}
        _symbols = list(_probs.keys())

        _cum = {}
        _acc = 0.0
        for _s in _symbols:
            _cum[_s] = (_acc, _acc + _probs[_s])
            _acc += _probs[_s]

        print("=== Symbol slices of [0, 1) (the model) ===")
        for _s in _symbols:
            _lo, _hi = _cum[_s]
            print(f"  '{_s}': p={_probs[_s]:.2f}   [{_lo:.4f}, {_hi:.4f})   width={_hi - _lo:.4f}")

        _msg = "bac"
        _lo, _hi = 0.0, 1.0
        print(f"\n=== Encoding the message '{_msg}' by successive subdivision ===")
        print(f"  start          [{_lo:.6f}, {_hi:.6f})   width={_hi - _lo:.6f}")
        for _s in _msg:
            _w = _hi - _lo
            _clo, _chi = _cum[_s]
            _hi = _lo + _w * _chi
            _lo = _lo + _w * _clo
            print(f"  after '{_s}'      [{_lo:.6f}, {_hi:.6f})   width={_hi - _lo:.6f}")

        _width = _hi - _lo
        _p_msg = float(np.prod([_probs[_s] for _s in _msg]))
        print(f"\n  final width            = {_width:.6f}")
        print(f"  product of p(symbols)  = {_p_msg:.6f}   (equal — width IS the probability)")
        print(f"  ideal code length      = {-np.log2(_p_msg):.4f} bits")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Watch the Interval Shrink

    Type a message below using the letters **a**, **b**, **c**, **d** (the model's probabilities are fixed at $0.4, 0.3, 0.2, 0.1$). Each symbol you add carves the current interval down to the matching slice. The plot stacks the intervals top-to-bottom so you can *see* the message homing in on a single point — and the panel reports the final width, the message probability, and the resulting code length in bits.

    Notice the rule of thumb: a high-probability symbol (an **a**) barely shrinks the interval, so it costs few bits; a low-probability symbol (a **d**) shrinks it hard, costing more. The bits spent track the surprise, symbol by symbol.
    """)
    return


@app.cell
def _(mo):
    arith_msg = mo.ui.text(value="bad", label="message (use letters a, b, c, d)")
    arith_msg
    return (arith_msg,)


@app.cell
def _(arith_msg):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _probs = {"a": 0.4, "b": 0.3, "c": 0.2, "d": 0.1}
        _symbols = list(_probs.keys())
        _colors = {"a": "#4C72B0", "b": "#55A868", "c": "#C44E52", "d": "#8172B2"}

        _cum = {}
        _acc = 0.0
        for _s in _symbols:
            _cum[_s] = (_acc, _acc + _probs[_s])
            _acc += _probs[_s]

        _raw = arith_msg.value.lower()
        _msg = [c for c in _raw if c in _probs][:12]
        if len(_msg) == 0:
            _msg = ["b"]

        _lo, _hi = 0.0, 1.0
        _steps = [(_lo, _hi, None)]
        for _s in _msg:
            _w = _hi - _lo
            _clo, _chi = _cum[_s]
            _new_hi = _lo + _w * _chi
            _new_lo = _lo + _w * _clo
            _lo, _hi = _new_lo, _new_hi
            _steps.append((_lo, _hi, _s))

        _n = len(_steps)
        _fig, _ax = plt.subplots(figsize=(8, 0.7 * _n + 1.2))

        for _row, (_slo, _shi, _sym) in enumerate(_steps):
            _y = _n - 1 - _row
            _prev_lo, _prev_hi = (_steps[_row - 1][0], _steps[_row - 1][1]) if _row > 0 else (0.0, 1.0)
            _span = _prev_hi - _prev_lo
            if _span <= 0:
                _span = 1e-12
            _x0 = 0.0
            _acc2 = _prev_lo
            for _s in _symbols:
                _p = _probs[_s]
                _seg_lo = _acc2
                _seg_hi = _acc2 + _span * _p
                _left = (_seg_lo - _prev_lo) / _span
                _right = (_seg_hi - _prev_lo) / _span
                _ax.barh(_y, _right - _left, left=_left, height=0.6,
                         color=_colors[_s], alpha=0.35, edgecolor="white")
                _ax.text((_left + _right) / 2, _y, _s, ha="center", va="center",
                         fontsize=9, color="black", alpha=0.7)
                _acc2 = _seg_hi
            if _sym is not None:
                _hl_left = (_slo - _prev_lo) / _span
                _hl_right = (_shi - _prev_lo) / _span
                _ax.barh(_y, _hl_right - _hl_left, left=_hl_left, height=0.6,
                         color=_colors[_sym], alpha=0.95, edgecolor="black", lw=1.2)
                _ax.set_yticks(list(_ax.get_yticks()))

        _labels = ["[0, 1)"] + [f"after '{s}'" for s in _msg]
        _ax.set_yticks(list(range(_n - 1, -1, -1)))
        _ax.set_yticklabels(_labels)
        _ax.set_xlim(0, 1)
        _ax.set_xlabel("each row rescales the highlighted slice above it to full width")
        _ax.set_title("Interval narrowing: encoding '" + "".join(_msg) + "'")
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(arith_msg):
    def _run():
        import numpy as np

        _probs = {"a": 0.4, "b": 0.3, "c": 0.2, "d": 0.1}
        _cum = {}
        _acc = 0.0
        for _s in _probs:
            _cum[_s] = (_acc, _acc + _probs[_s])
            _acc += _probs[_s]

        _raw = arith_msg.value.lower()
        _msg = [c for c in _raw if c in _probs][:12]
        if len(_msg) == 0:
            _msg = ["b"]

        _lo, _hi = 0.0, 1.0
        for _s in _msg:
            _w = _hi - _lo
            _clo, _chi = _cum[_s]
            _hi = _lo + _w * _chi
            _lo = _lo + _w * _clo

        _width = _hi - _lo
        _p_msg = float(np.prod([_probs[_s] for _s in _msg]))
        _bits = -np.log2(_p_msg)
        _bits_plus2 = _bits + 2

        print(f"message            : {''.join(_msg)}  ({len(_msg)} symbols)")
        print(f"final interval     : [{_lo:.8f}, {_hi:.8f})")
        print(f"final width        : {_width:.3e}")
        print(f"P(message)         : {_p_msg:.3e}   (= width)")
        print(f"ideal code length  : {_bits:.3f} bits   (= -log2 P)")
        print(f"arithmetic coder   : <= {_bits_plus2:.3f} bits   (ideal + < 2 bits, total)")
        print(f"per-symbol cost    : {_bits / len(_msg):.3f} bits/symbol")

    _run()
    return


@app.cell
def _(mo):
    mo.image(src="../animations/rendered/ArithmeticInterval.gif")
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. A Working Encoder and Decoder

    The interval picture is the whole algorithm. Here it is as code, in pure floating-point (real implementations use integer arithmetic with renormalization to avoid running out of precision — we will note that below, but floats make the idea crystal clear).

    **Encoder.** Keep a `low` and `high`; start at $0$ and $1$. For each symbol, look up its cumulative range $[F(s), F(s)+p(s))$ and rescale:

    $$\text{low} \leftarrow \text{low} + (\text{high}-\text{low})\,F(s), \qquad \text{high} \leftarrow \text{low} + (\text{high}-\text{low})\,(F(s)+p(s)).$$

    At the end, emit any number in $[\text{low}, \text{high})$ — the shortest such binary fraction is the codeword.

    **Decoder.** Given the transmitted number $t$ and the *same* model, ask "which slice of $[0,1)$ is $t$ in?" — that recovers the first symbol. Rescale $t$ within that slice and repeat. The decoder walks the identical subdivision the encoder did, so it reproduces the message exactly. (It needs to know when to stop — either a transmitted length or a special end-of-message symbol; we use a length here.)

    The demo below encodes a message, picks the midpoint of the final interval as the transmitted number, decodes it back, and confirms a perfect round-trip — then reports the bits used versus the entropy bound.

    > [MacKay Ch 6.2](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) gives the same encoder/decoder and discusses the finite-precision version.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _probs = {"a": 0.4, "b": 0.3, "c": 0.2, "d": 0.1}
        _symbols = list(_probs.keys())
        _cum = {}
        _acc = 0.0
        for _s in _symbols:
            _cum[_s] = (_acc, _acc + _probs[_s])
            _acc += _probs[_s]

        def encode(msg):
            lo, hi = 0.0, 1.0
            for s in msg:
                w = hi - lo
                clo, chi = _cum[s]
                hi = lo + w * chi
                lo = lo + w * clo
            return lo, hi

        def decode(t, n):
            out = []
            for _ in range(n):
                for s in _symbols:
                    clo, chi = _cum[s]
                    if clo <= t < chi:
                        out.append(s)
                        t = (t - clo) / (chi - clo)
                        break
            return "".join(out)

        _msg = "abracadabra".replace("r", "c").replace("b", "b")
        _msg = "".join(c for c in _msg if c in _probs)
        _lo, _hi = encode(_msg)
        _t = (_lo + _hi) / 2.0
        _back = decode(_t, len(_msg))

        print("=== Round trip ===")
        print(f"  message      : {_msg}")
        print(f"  interval     : [{_lo:.10f}, {_hi:.10f})")
        print(f"  transmit t   : {_t:.10f}  (midpoint)")
        print(f"  decoded      : {_back}")
        print(f"  match        : {_back == _msg}")

        _p_msg = float(np.prod([_probs[s] for s in _msg]))
        _ideal = -np.log2(_p_msg)
        _entropy = float(-sum(_probs[s] * np.log2(_probs[s]) for s in _probs))
        print(f"\n  ideal length            = {_ideal:.3f} bits  ({_ideal / len(_msg):.3f} bits/symbol)")
        print(f"  source entropy          = {_entropy:.3f} bits/symbol")
        print(f"  message length          = {len(_msg)} symbols")
        print(f"  arithmetic total bound  <= {_ideal + 2:.3f} bits  (ideal + < 2)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Just How Close to Optimal? Arithmetic vs Huffman

    The payoff is a per-message overhead, not a per-symbol one. An arithmetic coder spends at most $\log_2(1/P(\text{message})) + 2$ bits on the **entire** message (the "+2" covers naming a point inside the interval and flushing the encoder). Divide by message length and the overhead per symbol vanishes as the message grows:

    $$\frac{L}{n} \le H(X) + \frac{2}{n} \xrightarrow{\ n \to \infty\ } H(X).$$

    Huffman, by contrast, carries up to $+1$ bit of overhead *per symbol* — it never goes away. For near-deterministic sources that gap is the whole story.

    Let us measure it. We take a skewed source, generate a long message, and compare (a) the entropy floor, (b) Huffman's expected length, and (c) arithmetic's actual length. The more skewed the source, the more arithmetic wins. (We compute Huffman's expected length directly from its tree — built in pure numpy, no imports beyond it.)

    There is a flip side worth stating plainly: when the source is close to uniform with probabilities near powers of $\tfrac12$, Huffman is already nearly optimal and far simpler, with no arithmetic-precision worries. Arithmetic coding earns its complexity precisely on skewed and **adaptive** sources — which is the topic of the next section.

    > [MacKay Ch 6.3](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) compares the two and explains when each is the right tool.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        import heapq

        def huffman_expected_length(probs):
            live = [i for i, p in enumerate(probs) if p > 0]
            if len(live) == 1:
                return 1.0
            heap = [(p, i) for i, p in enumerate(probs) if p > 0]
            heapq.heapify(heap)
            depth = {i: 0 for i, p in enumerate(probs) if p > 0}
            members = {i: [i] for i, p in enumerate(probs) if p > 0}
            nxt = len(probs)
            while len(heap) > 1:
                p1, a = heapq.heappop(heap)
                p2, b = heapq.heappop(heap)
                grp = members.pop(a) + members.pop(b)
                for m in grp:
                    depth[m] += 1
                members[nxt] = grp
                heapq.heappush(heap, (p1 + p2, nxt))
                nxt += 1
            return float(sum(probs[i] * depth[i] for i in range(len(probs)) if probs[i] > 0))

        def entropy(p):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log2(p)))

        print("=== Bits per symbol: entropy floor vs Huffman vs arithmetic ===\n")
        _sources = {
            "near-uniform [0.30,0.26,0.24,0.20]": [0.30, 0.26, 0.24, 0.20],
            "moderate     [0.50,0.30,0.15,0.05]": [0.50, 0.30, 0.15, 0.05],
            "skewed       [0.90,0.06,0.03,0.01]": [0.90, 0.06, 0.03, 0.01],
            "extreme      [0.97,0.02,0.009,0.001]": [0.97, 0.02, 0.009, 0.001],
        }
        _rng = np.random.default_rng(0)
        _n = 50_000
        print(f"  {'source':40s} {'H':>7s} {'Huffman':>9s} {'arith':>7s} {'gain':>7s}")
        for _name, _p in _sources.items():
            _p = np.array(_p, dtype=float)
            _p = _p / _p.sum()
            _H = entropy(_p)
            _Lhuff = huffman_expected_length(_p)
            _draws = _rng.choice(len(_p), size=_n, p=_p)
            _ideal_bits = float(-np.sum(np.log2(_p[_draws])))
            _arith = (_ideal_bits + 2) / _n
            _gain = (_Lhuff - _arith) / _Lhuff * 100
            print(f"  {_name:40s} {_H:7.4f} {_Lhuff:9.4f} {_arith:7.4f} {_gain:6.1f}%")
        print("\n  Arithmetic tracks H; Huffman pays its rounding tax, "
              "worst on the skewed sources.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Adaptive Models: The Real Superpower

    Everything so far assumed a *fixed* probability table. The deeper reason arithmetic coding dominates practice is that the model can **change between symbols**, and the decoder can change in perfect lockstep — because both sides update the model using only symbols *already* coded.

    The recipe is simple and exact:

    1. Start with some prior counts (e.g. add-one / Laplace counts on every symbol).
    2. To code the next symbol, use the *current* counts to form $p(s)$ and its cumulative range, and narrow the interval.
    3. **Then** increment that symbol's count.
    4. The decoder, seeing the same history, forms the identical $p(s)$ before decoding the symbol, then makes the identical update.

    No probability table is ever transmitted. The model is rebuilt on the fly from the shared past — this is the engine of universal, **adaptive** compression. A fully adaptive arithmetic coder approaches the *empirical* entropy of the actual data, learning the source as it reads it. (PPM, the strongest classical text compressors, are adaptive arithmetic coders with context models; CABAC in H.264/265 is an adaptive binary arithmetic coder.)

    The demo runs an adaptive coder over a repetitive string. Watch the cost-per-symbol *fall* as the model learns the source — the early symbols are expensive (the model is ignorant), the later ones are cheap.

    > [MacKay Ch 6.4](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) covers adaptive models and probabilistic modelling for compression.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def adaptive_cost(text):
            alphabet = sorted(set(text))
            idx = {s: i for i, s in enumerate(alphabet)}
            counts = np.ones(len(alphabet))
            per_symbol = []
            for ch in text:
                total = counts.sum()
                p = counts[idx[ch]] / total
                per_symbol.append(-np.log2(p))
                counts[idx[ch]] += 1
            return np.array(per_symbol), alphabet

        _text = "abc" + "a" * 60
        _bits, _alpha = adaptive_cost(_text)

        print("=== Adaptive arithmetic coding (Laplace counts), source 'abc' then 'aaa...' ===")
        print(f"  text length      : {len(_text)} symbols over alphabet {_alpha}")
        print(f"  total bits        : {_bits.sum():.2f}")
        print(f"  avg bits/symbol   : {_bits.mean():.4f}")
        print(f"  first 5 symbols   : {np.round(_bits[:5], 3)}  (expensive — model ignorant)")
        print(f"  last 5 symbols    : {np.round(_bits[-5:], 4)}  (cheap — model has learned 'a')")

        _emp_p = np.array([_text.count(s) for s in _alpha], dtype=float)
        _emp_p = _emp_p / _emp_p.sum()
        _emp_H = float(-np.sum(_emp_p[_emp_p > 0] * np.log2(_emp_p[_emp_p > 0])))
        print(f"\n  empirical entropy : {_emp_H:.4f} bits/symbol")
        print(f"  adaptive avg cost : {_bits.mean():.4f} bits/symbol  "
              "(approaches it as the model learns)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. A Word on Finite Precision and Range Coding

    The float version above runs out of precision after a couple dozen symbols — the interval gets narrower than a `double` can represent. Real coders fix this with **integer arithmetic and renormalization**: keep `low`/`high` as fixed-width integers, and whenever the leading bits of `low` and `high` agree (the interval has settled into the top or bottom half), **output that bit and shift it out**, doubling the interval back up. Bits stream out as soon as they are determined, and the interval never collapses.

    **Range coding** is the same algorithm bookkept in terms of a "range" (the width) and a low value, emitting whole **bytes** instead of bits and renormalizing at byte boundaries — faster on byte-oriented hardware, and patent-clear, which is why it spread widely. Arithmetic coding and range coding are mathematically the same idea; they differ only in the integer renormalization details.

    The modern descendant is **ANS** (asymmetric numeral systems): it achieves the same near-optimal compression as arithmetic coding but with the speed of table lookups, and it powers Zstandard, LZFSE, and JPEG XL. They all rest on the one insight you built here — *the message is a number, and probability is interval width*.

    The demo verifies the renormalization invariant on a small integer coder: the running interval width stays bounded (never collapses toward zero) because we emit settled bits and rescale.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _probs = {"a": 0.4, "b": 0.3, "c": 0.2, "d": 0.1}
        _symbols = list(_probs.keys())

        _PREC = 16
        _FULL = 1 << _PREC
        _HALF = _FULL >> 1
        _QTR = _FULL >> 2

        _freq = {s: max(1, int(round(_probs[s] * 1024))) for s in _symbols}
        _tot = sum(_freq.values())
        _cum = {}
        _acc = 0
        for _s in _symbols:
            _cum[_s] = (_acc, _acc + _freq[_s])
            _acc += _freq[_s]

        def encode(msg):
            low, high = 0, _FULL - 1
            bits = []
            pending = 0
            widths = []

            def emit(b):
                bits.append(b)

            for s in msg:
                rng = high - low + 1
                clo, chi = _cum[s]
                high = low + rng * chi // _tot - 1
                low = low + rng * clo // _tot
                while True:
                    if high < _HALF:
                        emit(0)
                        for _ in range(pending):
                            emit(1)
                        pending = 0
                    elif low >= _HALF:
                        emit(1)
                        for _ in range(pending):
                            emit(0)
                        pending = 0
                        low -= _HALF
                        high -= _HALF
                    elif low >= _QTR and high < 3 * _QTR:
                        pending += 1
                        low -= _QTR
                        high -= _QTR
                    else:
                        break
                    low <<= 1
                    high = (high << 1) + 1
                widths.append(high - low + 1)
            pending += 1
            if low < _QTR:
                emit(0)
                for _ in range(pending):
                    emit(1)
            else:
                emit(1)
                for _ in range(pending):
                    emit(0)
            return bits, widths

        _msg = "aaaabbccdaaaabbbbccdaaaaaaaab"
        _bits, _widths = encode(_msg)

        print("=== Integer arithmetic coding with renormalization ===")
        print(f"  message            : {_msg}  ({len(_msg)} symbols)")
        print(f"  output bits        : {len(_bits)}  ({len(_bits) / len(_msg):.3f} bits/symbol)")
        _p_msg = float(np.prod([_probs[s] for s in _msg]))
        print(f"  ideal length       : {-np.log2(_p_msg):.3f} bits  "
              f"({-np.log2(_p_msg) / len(_msg):.3f} bits/symbol)")
        print(f"\n  interval width after each symbol stays bounded (never collapses):")
        print(f"    min width seen   : {min(_widths)}  (>= {_QTR}, a quarter of full range)")
        print(f"    max width seen   : {max(_widths)}")
        print("  Renormalization keeps the interval wide enough to stay precise forever.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    Arithmetic coding is not just a classical-compression footnote — it is the bridge between probability *models* and actual *bits*, which is exactly the currency of modern generative ML:

    - **Likelihood = code length.** A probabilistic model assigns $p(x)$ to data; arithmetic coding turns that into $-\log_2 p(x)$ bits, essentially exactly. So a generative model's negative log-likelihood (the loss you already minimize) *is* the compressed size in bits. "Better model" and "better compressor" are the same statement — this is the whole premise of the MDL principle (Module 6B).

    - **Neural compressors.** State-of-the-art lossless compressors put a powerful autoregressive model (an RNN or Transformer predicting the next symbol's distribution) in front of an arithmetic coder. The model supplies $p(s \mid \text{context})$; the coder spends $-\log_2 p$ bits. LLM-driven compressors beat gzip and PNG handily because the model is better — the coder is already optimal.

    - **Bits-back and latent-variable models.** Arithmetic coding's adaptive, exact bit-accounting is what makes **bits-back coding / BB-ANS** work for VAEs (Module 6E): you can code a latent sample and *recover* the bits spent on it, reaching the variational bound in practice. None of that is possible with a symbol code.

    - **Sampling is decoding.** Decoding a uniformly-random number through an arithmetic coder's model is exactly ancestral sampling from that model. Encoding and generation are two directions of the same machine — a unifying view you will see again in flow and diffusion models.

    The throughline of Part 2: entropy says how few bits are possible (2A), Huffman gets close with whole-bit codewords (2B), and arithmetic coding gets *arbitrarily* close by coding the whole stream as one number (2C). Next, **Module 2D** turns to *universal* compression — Lempel-Ziv and dictionary coding — where you do not even need the probability model up front.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise gives a spec and a skeleton — fill in the blanks. Together they build a complete arithmetic coder and the comparison that justifies it.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Build the Cumulative Model

    Given a dict of symbol probabilities, return a dict mapping each symbol to its half-open cumulative range $[F(s),\ F(s)+p(s))$. These ranges are the slices of $[0,1)$ that drive both encoder and decoder.
    """)
    return


@app.cell
def _():
    def _run():
        probs = {"a": 0.4, "b": 0.3, "c": 0.2, "d": 0.1}

        def cumulative_ranges(probs):
            ranges = {}
            acc = 0.0
            # TODO: for each symbol, set ranges[s] = (acc, acc + probs[s]); advance acc
            ...
            return ranges

        # print(cumulative_ranges(probs))
        # expect {'a':(0.0,0.4),'b':(0.4,0.7),'c':(0.7,0.9),'d':(0.9,1.0)}

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: The Encoder

    Implement `encode(msg, probs)` that returns the final $[\text{low}, \text{high})$ interval by successive subdivision. Start at $[0, 1)$ and, for each symbol, rescale `low` and `high` into the symbol's cumulative slice. Check that the width equals the product of the symbol probabilities.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        probs = {"a": 0.4, "b": 0.3, "c": 0.2, "d": 0.1}

        def cumulative_ranges(probs):
            ranges, acc = {}, 0.0
            for s, p in probs.items():
                ranges[s] = (acc, acc + p)
                acc += p
            return ranges

        def encode(msg, probs):
            cum = cumulative_ranges(probs)
            low, high = 0.0, 1.0
            for s in msg:
                w = high - low
                # TODO: clo, chi = cum[s]; update high then low using w
                ...
            return low, high

        # lo, hi = encode("bad", probs)
        # print(hi - lo)  # expect 0.3 * 0.4 * 0.1 = 0.012
        # print(np.isclose(hi - lo, 0.3 * 0.4 * 0.1))  # expect True

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: The Decoder

    Implement `decode(t, n, probs)`: given a transmitted number $t \in [0,1)$, the message length $n$, and the model, recover the message. At each step find which symbol's slice contains $t$, append it, then rescale $t$ into that slice: $t \leftarrow (t - F(s)) / p(s)$. Confirm it inverts your encoder via the interval midpoint.
    """)
    return


@app.cell
def _():
    def _run():
        probs = {"a": 0.4, "b": 0.3, "c": 0.2, "d": 0.1}

        def cumulative_ranges(probs):
            ranges, acc = {}, 0.0
            for s, p in probs.items():
                ranges[s] = (acc, acc + p)
                acc += p
            return ranges

        def decode(t, n, probs):
            cum = cumulative_ranges(probs)
            out = []
            for _ in range(n):
                for s, (clo, chi) in cum.items():
                    if clo <= t < chi:
                        out.append(s)
                        # TODO: rescale t into this slice: t = (t - clo) / (chi - clo)
                        ...
                        break
            return "".join(out)

        # lo, hi = 0.516, 0.528          # the 'bad' interval from Ex.2
        # print(decode((lo + hi) / 2, 3, probs))   # expect "bad"

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Code Length vs Entropy

    For a given source and a random message of length $n$, compute the arithmetic code length $-\log_2 P(\text{message})$ and compare its per-symbol value to the source entropy $H$. Verify that as $n$ grows the per-symbol cost converges to $H$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(0)
        p = np.array([0.5, 0.3, 0.15, 0.05])

        def entropy(p):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log2(p)))

        H = entropy(p)
        for n in [10, 100, 1000, 100_000]:
            draws = rng.choice(len(p), size=n, p=p)
            # TODO: total ideal bits = -sum(log2(p[draws])); per-symbol = total / n
            total_bits = ...
            per_symbol = ...
            # print(f"n={n:6d}  bits/symbol={per_symbol:.4f}  (H={H:.4f})")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: An Adaptive Coder

    Implement an adaptive coder that needs no probability table. Start every symbol with a Laplace count of 1; before coding each symbol charge $-\log_2 p$ using the *current* counts, then increment that symbol's count. Run it on a repetitive string and confirm the average cost falls below $\log_2(\text{alphabet size})$ as the model learns.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def adaptive_bits(text):
            alphabet = sorted(set(text))
            idx = {s: i for i, s in enumerate(alphabet)}
            counts = np.ones(len(alphabet))
            total_bits = 0.0
            for ch in text:
                # TODO: p = counts[idx[ch]] / counts.sum(); total_bits += -log2(p); counts[idx[ch]] += 1
                ...
            return total_bits, len(alphabet)

        # bits, k = adaptive_bits("abababababababababab")
        # print(bits / 20, "bits/symbol vs log2(k) =", np.log2(k))
        # expect average well below log2(2)=1 as the model locks onto the pattern

    _run()
    return


if __name__ == "__main__":
    app.run()
