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
    # 2D: Universal Compression

    > *"A universal algorithm... compresses every source down to its entropy, without ever being told what the source is."*
    > — the promise of Lempel–Ziv

    So far in Part 2 you have built compressors that *need to know the source*. Huffman (2B) and arithmetic coding (2C) are optimal — but only once you hand them the probabilities $p(x)$. In the real world nobody hands you those numbers. You download a file. You do not know whether it is English prose, a genome, a log file, or a JPEG. What compressor do you reach for?

    The astonishing answer, discovered by Abraham Lempel and Jacob Ziv in 1977–78, is that you can compress **optimally without knowing the source at all**. A *universal* compressor reads the data, learns its statistics on the fly by building a dictionary of repeated patterns, and — given enough input — squeezes any stationary source down to its entropy rate $H$. This is not a heuristic. It is a theorem, and it is the reason `gzip`, `zip`, `PNG`, and `PDF` all work on whatever you throw at them.

    In this module you will build the Lempel–Ziv family from scratch in pure numpy — LZ78, LZW, and LZ77's sliding window — watch the dictionary grow on real text, and *measure* universality directly: the compression ratio sliding down toward the entropy rate as the input gets longer. By the end you will understand exactly what is happening every time you unzip a file.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. The Problem: Compression Without a Model

    Recall the bargain of the previous modules. The source coding theorem (2A) says the best achievable average code length is the entropy $H$. Huffman and arithmetic coding *reach* that floor — but both are **model-based**: you feed them $p(x)$, and they emit an optimal code *for that distribution*. Use the wrong $p$ and you pay a KL-divergence penalty in wasted bits.

    Three things go wrong with model-based coding in practice:

    1. **You usually do not know $p$.** A general-purpose tool like `gzip` cannot assume the input is English. It must work on *anything*.
    2. **Real sources have memory.** Per-symbol entropy badly overstates the true cost of text: `th` is followed by `e` far more often than chance. Capturing that needs a model of correlations, not just marginal frequencies. (Recall the entropy *rate* from 1C — the true floor for a source with memory.)
    3. **Statistics drift.** A file may start as English and end as base64. A fixed model is wrong for at least one part.

    A **universal** code sidesteps all of this. It is a *single* algorithm that, for *every* source in a broad class (e.g. all stationary ergodic sources), achieves a compression rate approaching that source's entropy rate $H$ as the input length $n \to \infty$ — with no prior knowledge of the source. The source teaches the code its own statistics, for free, as a side effect of how the code works.

    The trick is **dictionary coding**: instead of coding symbols, build a growing dictionary of *phrases* the data has already shown you, and replace each new occurrence of a phrase with a short pointer to its dictionary entry. Repetition becomes brevity. Let us make it concrete.

    > [MacKay Ch 6](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) treats stream codes and Lempel–Ziv as the practical counterpart to the symbol codes of Ch 5.
    > [Cover & Thomas Ch 13](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) is the rigorous home of universal source coding and the LZ optimality proof.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. LZ78: Building a Dictionary of Phrases

    The 1978 scheme (LZ78) is the cleanest place to start. Parse the input left to right into **phrases**. The rule: each new phrase is *the longest prefix you have already seen, plus one new symbol*. Encode that phrase as a pair

    $$(\,i,\, c\,) \qquad i = \text{index of the previously seen prefix},\quad c = \text{the new symbol.}$$

    Index $0$ is the empty phrase. Every phrase you emit is added to the dictionary as the next entry, so the dictionary grows by exactly one phrase per output token.

    **Worked example.** Parse `ABABABA`:

    | step | new phrase | as (index, char) | dict entry |
    |------|-----------|------------------|-----------|
    | 1 | `A`   | (0, A) | 1 = `A` |
    | 2 | `B`   | (0, B) | 2 = `B` |
    | 3 | `AB`  | (1, B) | 3 = `AB` |
    | 4 | `ABA` | (3, A) | 4 = `ABA` |

    Seven characters became four tokens. The phrases got *longer* as the dictionary learned the `AB` structure — that lengthening is universality in action. Decoding is trivial and needs no transmitted dictionary: the decoder rebuilds the identical table from the same token stream, because every reference $i$ points only to phrases already decoded.

    Here is LZ78 encode/decode in pure numpy/Python — run it and watch the parse.

    > [Cover & Thomas Ch 13.4](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) gives the LZ78 algorithm and its analysis.
    """)
    return


@app.cell
def _():
    def _run():
        def lz78_encode(s):
            _dict = {"": 0}
            _tokens = []
            _phrase = ""
            for _ch in s:
                if _phrase + _ch in _dict:
                    _phrase = _phrase + _ch
                else:
                    _tokens.append((_dict[_phrase], _ch))
                    _dict[_phrase + _ch] = len(_dict)
                    _phrase = ""
            if _phrase:
                _tokens.append((_dict[_phrase], ""))
            return _tokens

        def lz78_decode(tokens):
            _entries = [""]
            _out = []
            for _i, _ch in tokens:
                _phrase = _entries[_i] + _ch
                _out.append(_phrase)
                _entries.append(_phrase)
            return "".join(_out)

        _s = "ABABABA"
        _tok = lz78_encode(_s)
        print("=== LZ78 on 'ABABABA' ===")
        print(f"  input ({len(_s)} chars): {_s}")
        print(f"  tokens ({len(_tok)}):    {_tok}")
        print(f"  roundtrip decode:      {lz78_decode(_tok)!r}  (matches: {lz78_decode(_tok) == _s})")

        _s2 = "TOBEORNOTTOBEORTOBEORNOT"
        _tok2 = lz78_encode(_s2)
        print("\n=== LZ78 on Hamlet snippet ===")
        print(f"  input ({len(_s2)} chars): {_s2}")
        print(f"  parsed into {len(_tok2)} phrases")
        print(f"  roundtrip ok: {lz78_decode(_tok2) == _s2}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. LZW: One Pointer Per Phrase

    LZ78 emits a *pair* per phrase — an index **and** a literal character. The 1984 refinement by Terry Welch (LZW) removes the literal: it emits only indices. The dictionary is **pre-seeded** with every single symbol of the alphabet, so the encoder always has somewhere to point.

    The LZW loop: keep extending the current string `w` by the next symbol `c` as long as `w + c` is in the dictionary. The moment `w + c` is *not*, output the code for `w`, add `w + c` as a new dictionary entry, and restart with `w = c`. One output code per phrase, no literals.

    **Why it matters.** LZW was the engine of `compress`, the `GIF` format, and early `PDF`. Its appeal is that the output is a clean stream of integer codes — easy to pack into a bitstream of growing width (9 bits, then 10, …, as the dictionary fills). The decoder again reconstructs the dictionary on the fly, with one famous subtlety: it can receive a code it has *not yet built* (the "KwKwK" case), which happens exactly when a phrase repeats immediately. The standard fix is to detect that the code equals the next dictionary index and handle it specially.

    The code below implements LZW encode **and** the tricky decode, and verifies a perfect round-trip.
    """)
    return


@app.cell
def _():
    def _run():
        def lzw_encode(s):
            _alpha = sorted(set(s))
            _dict = {ch: i for i, ch in enumerate(_alpha)}
            _codes = []
            _w = ""
            for _c in s:
                _wc = _w + _c
                if _wc in _dict:
                    _w = _wc
                else:
                    _codes.append(_dict[_w])
                    _dict[_wc] = len(_dict)
                    _w = _c
            if _w:
                _codes.append(_dict[_w])
            return _codes, _alpha

        def lzw_decode(codes, alpha):
            _entries = list(alpha)
            _w = _entries[codes[0]]
            _out = [_w]
            for _code in codes[1:]:
                if _code < len(_entries):
                    _entry = _entries[_code]
                elif _code == len(_entries):
                    _entry = _w + _w[0]
                else:
                    raise ValueError("bad LZW code stream")
                _out.append(_entry)
                _entries.append(_w + _entry[0])
                _w = _entry
            return "".join(_out)

        _s = "TOBEORNOTTOBEORTOBEORNOT"
        _codes, _alpha = lzw_encode(_s)
        print("=== LZW on Hamlet snippet ===")
        print(f"  input ({len(_s)} chars)")
        print(f"  codes ({len(_codes)}): {_codes}")
        _back = lzw_decode(_codes, _alpha)
        print(f"  roundtrip ok: {_back == _s}")

        _s2 = "ABABABABABABAB"
        _c2, _a2 = lzw_encode(_s2)
        print("\n=== The KwKwK case: 'ABABABABABABAB' ===")
        print(f"  codes: {_c2}")
        print(f"  roundtrip ok (handles self-reference): {lzw_decode(_c2, _a2) == _s2}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. LZ77: The Sliding Window

    LZ77 (the 1977 original) takes a different angle and is the one inside `gzip`, `zlib`, and `PNG`'s DEFLATE. There is no explicit dictionary table; the **recent past of the data itself is the dictionary**. Keep a *sliding window* of the last $W$ symbols. To encode the next chunk, find the longest match between the upcoming text (the *look-ahead buffer*) and somewhere in the window, and emit a triple

    $$(\,d,\, \ell,\, c\,) \qquad d = \text{distance back to the match},\quad \ell = \text{match length},\quad c = \text{next literal.}$$

    A *back-reference* `(distance, length)` says "copy $\ell$ symbols from $d$ positions ago." If nothing matches, $\ell = 0$ and you emit the literal alone. Crucially the match may *overlap* the look-ahead — `(1, 5)` means "repeat the previous symbol 5 times," which is how runs collapse.

    **Worked example.** Encode `ABABABA` with a generous window:

    - `A` — no prior text, literal: `(0, 0, A)`
    - `B` — no match, literal: `(0, 0, B)`
    - `ABA` — matches the `AB` two back, then one more `A` via overlap: `(2, 3, ...)`

    DEFLATE (`gzip`/`PNG`/`zip`) then runs the LZ77 triples through **Huffman coding** — universal *dictionary* compression feeding model-based *symbol* compression. The two halves of Part 2 working together. The window size is the central knob: bigger windows find more distant repeats (better ratio) but cost more to search and to address.

    Build it and watch a repetitive string collapse into back-references.

    > [MacKay Ch 6](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) describes the sliding-window idea and its place among stream codes.
    """)
    return


@app.cell
def _():
    def _run():
        def lz77_encode(s, window=64, look=32):
            _i = 0
            _n = len(s)
            _tokens = []
            while _i < _n:
                _start = max(0, _i - window)
                _best_len = 0
                _best_dist = 0
                _max_len = min(look, _n - _i)
                for _j in range(_start, _i):
                    _dist = _i - _j
                    _l = 0
                    while _l < _max_len and s[_j + (_l % _dist)] == s[_i + _l]:
                        _l += 1
                    if _l > _best_len:
                        _best_len = _l
                        _best_dist = _dist
                if _best_len >= 2:
                    _nxt = s[_i + _best_len] if _i + _best_len < _n else ""
                    _tokens.append((_best_dist, _best_len, _nxt))
                    _i += _best_len + (1 if _nxt else 0)
                else:
                    _tokens.append((0, 0, s[_i]))
                    _i += 1
            return _tokens

        def lz77_decode(tokens):
            _out = []
            for _d, _l, _c in tokens:
                if _l > 0:
                    _start = len(_out) - _d
                    for _k in range(_l):
                        _out.append(_out[_start + _k])
                if _c:
                    _out.append(_c)
            return "".join(_out)

        _s = "ABABABABABABABAB"
        _tok = lz77_encode(_s, window=64, look=32)
        print("=== LZ77 sliding window on 'ABABABABABABABAB' ===")
        print(f"  input ({len(_s)} chars)")
        print(f"  tokens ({len(_tok)}): {_tok}")
        print(f"  roundtrip ok: {lz77_decode(_tok) == _s}")

        _s2 = "the cat sat on the mat the cat sat on the hat"
        _tok2 = lz77_encode(_s2, window=64, look=32)
        _nlit = sum(1 for _t in _tok2 if _t[1] == 0)
        _nref = len(_tok2) - _nlit
        print("\n=== LZ77 on a sentence with repeats ===")
        print(f"  input ({len(_s2)} chars) -> {len(_tok2)} tokens")
        print(f"  literals: {_nlit}   back-references: {_nref}")
        print(f"  roundtrip ok: {lz77_decode(_tok2) == _s2}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Explore: The Dictionary Grows

    Type your own text below and watch LZW parse it into phrases. The table shows each phrase as it is added to the dictionary. Two things to look for:

    - **Repetitive text** (`abcabcabcabc...`) makes the dictionary learn long phrases fast, so the phrase count drops far below the character count.
    - **Random or highly varied text** gives short phrases — the dictionary cannot find structure to exploit, and you barely beat one code per symbol.

    The lengthening of phrases over time is exactly *learning the source*. A near-random source teaches the dictionary nothing; a structured source teaches it a lot.
    """)
    return


@app.cell
def _(mo):
    lz_text = mo.ui.text_area(
        value="the rain in spain falls mainly in the plain the rain in spain",
        label="Text to compress with LZW",
        full_width=True,
    )
    lz_text
    return (lz_text,)


@app.cell
def _(lz_text, mo):
    def _run():
        _s = lz_text.value
        if not _s:
            return mo.md("*(type some text above)*")

        _alpha = sorted(set(_s))
        _dict = {ch: i for i, ch in enumerate(_alpha)}
        _added = []
        _w = ""
        _emitted = 0
        for _c in _s:
            _wc = _w + _c
            if _wc in _dict:
                _w = _wc
            else:
                _emitted += 1
                _added.append((len(_dict), _wc, _dict[_w]))
                _dict[_wc] = len(_dict)
                _w = _c
        if _w:
            _emitted += 1

        _rows = []
        for _idx, _phrase, _parent in _added[:40]:
            _show = _phrase.replace(" ", "_")
            _rows.append(f"| {_idx} | `{_show}` | {len(_phrase)} |")
        _table = "\n".join(_rows) if _rows else "| (none) | | |"

        _ratio = _emitted / max(1, len(_s))
        _hdr = (
            f"**Input:** {len(_s)} characters &nbsp;&nbsp; "
            f"**Alphabet:** {len(_alpha)} symbols &nbsp;&nbsp; "
            f"**LZW codes emitted:** {_emitted} &nbsp;&nbsp; "
            f"**codes/char:** {_ratio:.3f}"
        )
        _note = "" if len(_added) <= 40 else f"\n\n*(showing first 40 of {len(_added)} new dictionary entries)*"
        return mo.md(
            _hdr
            + "\n\n### New dictionary phrases (as they were added)\n\n"
            + "| dict index | phrase | length |\n|---|---|---|\n"
            + _table
            + _note
        )

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Universality: Approaching the Entropy Rate

    Here is the headline theorem, the reason any of this matters. Let $\ell_{LZ}(x_1^n)$ be the number of bits LZ uses on the first $n$ symbols of a stationary ergodic source with entropy rate $H$. Then

    $$\lim_{n \to \infty} \frac{1}{n}\, \ell_{LZ}(x_1^n) = H \qquad \text{with probability 1.}$$

    In words: **LZ asymptotically achieves the entropy rate of the source it has never been told about.** It matches what an *optimal model-based* coder — one handed the true distribution — could do. That is the precise meaning of *universal*.

    The intuition for *why* it works: in $n$ symbols, LZ78 produces roughly $c(n) \approx n / \log_2 n$ distinct phrases, and the encoded length is about $c(n) \log_2 c(n)$ bits. Ziv and Lempel proved this quantity is bounded above by $n H + o(n)$ for any stationary ergodic source. The phrases are *asymptotically equiprobable* — each one carries about $\log_2 c(n)$ bits, the maximum it could — so no bits are wasted in the limit.

    The slider below makes this visible. Pick a source entropy rate (a biased binary source, or a Markov-correlated source) and watch the compression ratio computed by an actual LZ78 coder fall toward $H$ as the sequence grows. Short inputs compress poorly — the dictionary has not learned yet. Long inputs ride the floor. *That descent toward $H$ is universality, measured.*

    > [Cover & Thomas Ch 13.5](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) proves LZ78 optimality for stationary ergodic sources.
    """)
    return


@app.cell
def _(mo):
    source_kind = mo.ui.dropdown(
        options=["Biased coin (p=0.11, H=0.5)", "Biased coin (p=0.5, H=1.0)", "Sticky Markov (low H)", "i.i.d. uniform 4-ary (H=2.0)"],
        value="Biased coin (p=0.11, H=0.5)",
        label="Source",
    )
    max_len = mo.ui.slider(start=200, stop=20000, step=200, value=8000, label="Max sequence length n")
    mo.hstack([source_kind, max_len])
    return max_len, source_kind


@app.cell
def _(max_len, source_kind):
    def _run():
        import numpy as np
        import matplotlib.pyplot as plt

        def _h2(p):
            if p <= 0 or p >= 1:
                return 0.0
            return -p * np.log2(p) - (1 - p) * np.log2(1 - p)

        _rng = np.random.default_rng(0)
        _kind = source_kind.value
        _N = max_len.value

        if _kind.startswith("Biased coin (p=0.11"):
            _p = 0.11
            _seq = (_rng.random(_N) < _p).astype(int)
            _H = _h2(_p)
            _alpha_bits = 1.0
        elif _kind.startswith("Biased coin (p=0.5"):
            _p = 0.5
            _seq = (_rng.random(_N) < _p).astype(int)
            _H = _h2(_p)
            _alpha_bits = 1.0
        elif _kind.startswith("Sticky"):
            _stay = 0.95
            _seq = np.zeros(_N, dtype=int)
            for _i in range(1, _N):
                _seq[_i] = _seq[_i - 1] if _rng.random() < _stay else 1 - _seq[_i - 1]
            _H = _h2(1 - _stay)
            _alpha_bits = 1.0
        else:
            _seq = _rng.integers(0, 4, size=_N)
            _H = 2.0
            _alpha_bits = 2.0

        _s = "".join(chr(ord('a') + int(_x)) for _x in _seq)

        def _lz78_bits(text):
            _d = {"": 0}
            _ntok = 0
            _phrase = ""
            for _ch in text:
                if _phrase + _ch in _d:
                    _phrase = _phrase + _ch
                else:
                    _ntok += 1
                    _d[_phrase + _ch] = len(_d)
                    _phrase = ""
            if _phrase:
                _ntok += 1
            _idx_bits = max(1.0, np.log2(max(2, len(_d))))
            _char_bits = max(1.0, np.log2(len(set(text)) if set(text) else 2))
            return _ntok * (_idx_bits + _char_bits)

        _lengths = np.unique(np.clip(np.geomspace(50, _N, 30).astype(int), 50, _N))
        _ratios = []
        for _L in _lengths:
            _bits = _lz78_bits(_s[:_L])
            _ratios.append(_bits / _L)

        _fig, _ax = plt.subplots(figsize=(7.5, 4.5))
        _ax.plot(_lengths, _ratios, "o-", color="steelblue", lw=2, ms=4, label="LZ78 bits / symbol")
        _ax.axhline(_H, color="crimson", ls="--", lw=2, label=f"entropy rate H = {_H:.3f}")
        _ax.axhline(_alpha_bits, color="gray", ls=":", lw=1.5, label=f"raw = {_alpha_bits:.1f} bits/sym")
        _ax.set_xscale("log")
        _ax.set_xlabel("input length n (log scale)")
        _ax.set_ylabel("compressed bits per symbol")
        _ax.set_title("Universality: LZ78 rate descending toward the entropy rate")
        _ax.set_ylim(0, max(_alpha_bits, max(_ratios)) * 1.15 + 0.2)
        _ax.legend(loc="upper right")
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    return _run()


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Compression Ratio vs Input Length

    The previous plot shows *bits per symbol* converging. This one shows the practical figure people quote: the **compression ratio**, original size divided by compressed size (higher = better). It also contrasts LZ78 against LZW and against a per-symbol Huffman-style entropy bound, so you can see all three of Part 2's ideas on one axis.

    Drag the length slider. Watch how on structured text the ratio *climbs* with length — the dictionary keeps finding longer repeats — while on near-random data it flatlines near 1 (incompressible). That climb-with-length is the signature of a universal code paying off the longer it runs.
    """)
    return


@app.cell
def _(mo):
    ratio_source = mo.ui.dropdown(
        options=["Repetitive English", "Natural English", "Random letters", "Mostly one letter"],
        value="Repetitive English",
        label="Data type",
    )
    ratio_len = mo.ui.slider(start=100, stop=6000, step=100, value=3000, label="Number of characters generated")
    mo.hstack([ratio_source, ratio_len])
    return ratio_len, ratio_source


@app.cell
def _(ratio_len, ratio_source):
    def _run():
        import numpy as np
        import matplotlib.pyplot as plt

        _rng = np.random.default_rng(1)
        _kind = ratio_source.value
        _N = ratio_len.value

        if _kind == "Repetitive English":
            _unit = "the quick brown fox jumps over the lazy dog. "
            _s = (_unit * (_N // len(_unit) + 1))[:_N]
        elif _kind == "Natural English":
            _words = ["the", "of", "and", "to", "in", "a", "is", "that", "it", "for",
                      "as", "with", "his", "they", "be", "at", "one", "have", "this", "from"]
            _parts = []
            _tot = 0
            while _tot < _N:
                _wd = _words[_rng.integers(0, len(_words))]
                _parts.append(_wd)
                _tot += len(_wd) + 1
            _s = (" ".join(_parts))[:_N]
        elif _kind == "Random letters":
            _chars = "abcdefghijklmnopqrstuvwxyz "
            _s = "".join(_chars[_i] for _i in _rng.integers(0, len(_chars), size=_N))
        else:
            _draw = _rng.random(_N)
            _s = "".join("a" if _d < 0.9 else "abcde "[_rng.integers(0, 6)] for _d in _draw)

        def _lz78_bits(text):
            _d = {"": 0}
            _ntok = 0
            _ph = ""
            for _ch in text:
                if _ph + _ch in _d:
                    _ph = _ph + _ch
                else:
                    _ntok += 1
                    _d[_ph + _ch] = len(_d)
                    _ph = ""
            if _ph:
                _ntok += 1
            _ib = max(1.0, np.log2(max(2, len(_d))))
            _cb = max(1.0, np.log2(len(set(text)) if set(text) else 2))
            return _ntok * (_ib + _cb)

        def _lzw_bits(text):
            _alpha = sorted(set(text))
            _d = {ch: i for i, ch in enumerate(_alpha)}
            _ncodes = 0
            _w = ""
            for _c in text:
                if _w + _c in _d:
                    _w = _w + _c
                else:
                    _ncodes += 1
                    _d[_w + _c] = len(_d)
                    _w = _c
            if _w:
                _ncodes += 1
            _cb = max(1.0, np.log2(max(2, len(_d))))
            return _ncodes * _cb

        def _h0_bits(text):
            _vals, _cnts = np.unique(list(text), return_counts=True)
            _p = _cnts / _cnts.sum()
            _H = float(-np.sum(_p * np.log2(_p)))
            return len(text) * _H

        _lengths = np.unique(np.clip(np.geomspace(50, _N, 25).astype(int), 50, _N))
        _raw_bits_per = 8.0
        _r_lz78, _r_lzw, _r_h0 = [], [], []
        for _L in _lengths:
            _sub = _s[:_L]
            _raw = _L * _raw_bits_per
            _r_lz78.append(_raw / max(1.0, _lz78_bits(_sub)))
            _r_lzw.append(_raw / max(1.0, _lzw_bits(_sub)))
            _r_h0.append(_raw / max(1.0, _h0_bits(_sub)))

        _fig, _ax = plt.subplots(figsize=(7.5, 4.5))
        _ax.plot(_lengths, _r_lzw, "o-", color="steelblue", lw=2, ms=4, label="LZW (dictionary)")
        _ax.plot(_lengths, _r_lz78, "s-", color="seagreen", lw=2, ms=4, label="LZ78 (dictionary)")
        _ax.plot(_lengths, _r_h0, "^--", color="darkorange", lw=1.8, ms=4, label="order-0 entropy bound")
        _ax.axhline(1.0, color="gray", ls=":", lw=1.2, label="ratio = 1 (no compression)")
        _ax.set_xscale("log")
        _ax.set_xlabel("input length (characters, log scale)")
        _ax.set_ylabel("compression ratio  (8-bit raw / compressed)")
        _ax.set_title(f"Compression ratio vs length — {_kind}")
        _ax.legend(loc="upper left")
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    return _run()


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 8. Real-World LZ: gzip, PNG, zip, and Friends

    The Lempel–Ziv family is not academic — it is the most-deployed compression machinery on Earth. Every box below is LZ at its core:

    | Tool / format | Algorithm | Notes |
    |---|---|---|
    | `gzip`, `zlib`, HTTP `Content-Encoding: gzip` | **DEFLATE** = LZ77 + Huffman | 32 KB window; the web runs on this |
    | `zip`, `.docx`, `.xlsx`, `.jar`, `.apk` | DEFLATE | a `.docx` is a zip of XML |
    | `PNG` | DEFLATE on filtered rows | lossless image compression |
    | `PDF` | DEFLATE (`FlateDecode`) and historically LZW | |
    | `GIF`, old Unix `compress` | **LZW** | the patent-encumbered one (expired 2003) |
    | `7-Zip` (`.7z`), `xz`, `lzma` | **LZMA** = LZ77 + range coding | bigger windows, arithmetic-style backend |
    | `Zstandard` (`zstd`), `Brotli` | LZ77-family + entropy coding | modern, used by Facebook, web fonts, CDNs |

    **The recurring pattern is two-stage.** Stage 1 is a *universal dictionary* model (LZ77/78/W) that turns repetition into back-references — this is where the *memory* of the source is captured. Stage 2 is a *model-based entropy coder* (Huffman in DEFLATE, range/arithmetic coding in LZMA/zstd) that squeezes the residual per-token redundancy down to its entropy. Part 2 in one sentence: **2D removes the redundancy a model would not have known about; 2B/2C remove the redundancy a model can predict.** Together they get you to the entropy rate on real, unknown data.

    A practical note you can feel from the widgets above: LZ needs *length* to win. That is why compressing a 50-byte file often makes it *bigger* (dictionary/header overhead) while a 50-MB log file compresses 20:1. Universality is an asymptotic promise.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def _lzw_codes(text):
            _alpha = sorted(set(text))
            _d = {ch: i for i, ch in enumerate(_alpha)}
            _n = 0
            _w = ""
            for _c in text:
                if _w + _c in _d:
                    _w = _w + _c
                else:
                    _n += 1
                    _d[_w + _c] = len(_d)
                    _w = _c
            if _w:
                _n += 1
            _bits = _n * max(1.0, np.log2(max(2, len(_d))))
            return _n, _bits

        _samples = {
            "highly repetitive": "abcabcabc" * 200,
            "natural-ish English": ("the cat sat on the mat and the dog ran. " * 50),
            "random letters": "".join(np.random.default_rng(2).choice(list("abcdefgh"), 1800)),
        }
        print("=== LZW compression ratio by data type (1800 chars, 8-bit raw) ===")
        print(f"  {'type':22s} {'codes':>7s} {'comp bits':>10s} {'ratio':>7s}")
        for _name, _txt in _samples.items():
            _txt = _txt[:1800]
            _ncodes, _bits = _lzw_codes(_txt)
            _raw = len(_txt) * 8
            print(f"  {_name:22s} {_ncodes:7d} {_bits:10.0f} {_raw / _bits:6.2f}x")
        print("\nStructure -> high ratio. Randomness -> ratio near 1. No model was ever supplied.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    Universal compression and modern ML are two faces of the same coin: *prediction*.

    - **Compression = prediction = a probabilistic model.** A compressor that achieves the entropy rate is implicitly an optimal predictor of the next symbol — and vice versa. An LZ dictionary that has learned that `th` is usually followed by `e` is doing exactly what a language model does. This is the literal foundation of the claim "language models are compressors": an LLM plus arithmetic coding compresses text near its true entropy rate, and recent work (e.g. DeepMind's *Language Modeling Is Compression*) shows large models out-compress `gzip` on text, images, and audio.

    - **The MDL principle (Module 6B).** *Minimum Description Length* picks the model that compresses the data best — universal codes are the formal backbone of "the best model is the one that lets you describe the data in the fewest bits." Occam's razor, made quantitative.

    - **No free lunch, made concrete.** Universality is asymptotic and class-restricted: LZ is optimal for *stationary ergodic* sources but knows nothing about, say, 2D image structure (which is why PNG *filters* rows first). The lesson — a model that assumes nothing pays in convergence speed — is the same tradeoff you navigate when choosing inductive biases for a network.

    - **Tokenization echoes dictionary coding.** Byte-Pair Encoding, the tokenizer behind most LLMs, greedily merges frequent symbol pairs into new vocabulary entries — structurally the *same move* as LZ78/LZW building phrases. Both turn frequent substrings into single units.

    - **Evaluation in bits-per-byte/bits-per-character.** When you read that a model achieves "0.9 bits per byte," that is a compression rate — directly comparable to what `gzip` or LZ would achieve, and a direct estimate of the source's entropy rate from Module 1C.

    Next, Part 3 leaves compression behind and asks the dual question: not "how few bits can I store?" but "how many bits can I reliably *send* through a noisy channel?" — the channel coding theorem.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise gives a spec and a skeleton — fill in the `...` and `TODO`s. These build the LZ family yourself and let you measure universality directly. Expected results are in the trailing comments.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: LZ78 Encoder

    Implement `lz78_encode(s)` returning a list of `(index, char)` tokens. Maintain a dictionary mapping seen phrases to integer indices (start with the empty phrase at index 0). For each new phrase, emit `(index_of_longest_seen_prefix, new_char)` and add the extended phrase to the dictionary.
    """)
    return


@app.cell
def _():
    def _run():
        def lz78_encode(s):
            _dict = {"": 0}
            _tokens = []
            _phrase = ""
            for _ch in s:
                # TODO: if _phrase + _ch already in _dict, extend _phrase; else emit a token and add it
                ...
            # TODO: handle a leftover non-empty _phrase at the end (emit (_dict[_phrase], ""))
            return _tokens

        # print(lz78_encode("ABABABA"))
        # expect [(0,'A'), (0,'B'), (1,'B'), (3,'A')]

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: LZW Encoder

    Implement `lzw_encode(s)`. Seed the dictionary with every distinct symbol of `s` (sorted, indices `0..k-1`). Walk the string keeping a current phrase `w`; while `w + c` is in the dictionary, extend `w`; otherwise output the code for `w`, add `w + c` to the dictionary, and reset `w = c`. Emit the final `w`.
    """)
    return


@app.cell
def _():
    def _run():
        def lzw_encode(s):
            _alpha = sorted(set(s))
            _dict = {ch: i for i, ch in enumerate(_alpha)}
            _codes = []
            _w = ""
            for _c in s:
                # TODO: extend _w if (_w + _c) in _dict; else emit _dict[_w], add _w+_c, set _w = _c
                ...
            # TODO: emit the final _w if non-empty
            return _codes

        # print(lzw_encode("TOBEORTOBEOR"))
        # the codes should round-trip back to the original string

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: LZ77 Sliding-Window Match

    Implement `longest_match(s, i, window)` that searches the window `s[max(0,i-window):i]` for the longest prefix of `s[i:]` and returns `(distance, length)`. Then a back-reference `(distance, length)` means "copy `length` symbols starting `distance` positions back." Allowing overlap (the source range may reach into the look-ahead) is what lets runs like `aaaa` collapse.
    """)
    return


@app.cell
def _():
    def _run():
        def longest_match(s, i, window):
            _start = max(0, i - window)
            _best_len = 0
            _best_dist = 0
            for _j in range(_start, i):
                _l = 0
                # TODO: extend _l while s[_j+_l] == s[i+_l] and i+_l < len(s)
                ...
                if _l > _best_len:
                    _best_len = _l
                    _best_dist = i - _j
            return _best_dist, _best_len

        # print(longest_match("ABABABA", 2, 64))   # expect (2, 5)  -> overlap copy
        # print(longest_match("ABCDEF", 3, 64))    # expect (0, 0)  -> no match

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Compression Ratio of a Source

    Given a string, estimate the LZW compressed size in bits as `(number of codes) * log2(dictionary size)` and report the compression ratio against an 8-bit-per-char raw size. Test that a repetitive string beats a random one.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def lzw_ratio(s):
            _alpha = sorted(set(s))
            _dict = {ch: i for i, ch in enumerate(_alpha)}
            _ncodes = 0
            _w = ""
            for _c in s:
                if _w + _c in _dict:
                    _w = _w + _c
                else:
                    _ncodes += 1
                    _dict[_w + _c] = len(_dict)
                    _w = _c
            if _w:
                _ncodes += 1
            # TODO: comp_bits = _ncodes * log2(len(_dict)); raw_bits = 8 * len(s)
            comp_bits = ...
            raw_bits = ...
            return raw_bits / comp_bits

        # print(lzw_ratio("abcabcabcabc" * 50))   # large ratio (very repetitive)
        # print(lzw_ratio("".join(np.random.default_rng(0).choice(list("abcdefgh"), 600))))  # near 1

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Measuring Universality

    Generate a long sequence from a biased binary source with $P(1) = p$, whose entropy rate is $H_2(p)$. Compute LZ78's bits-per-symbol for increasing prefix lengths and confirm it *descends toward* $H_2(p)$ — universality, with no model supplied. (This is the very last cell; the run guard lives below it.)
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

        def lz78_bits(text):
            _d = {"": 0}
            _ntok = 0
            _ph = ""
            for _ch in text:
                if _ph + _ch in _d:
                    _ph = _ph + _ch
                else:
                    _ntok += 1
                    _d[_ph + _ch] = len(_d)
                    _ph = ""
            if _ph:
                _ntok += 1
            _ib = max(1.0, np.log2(max(2, len(_d))))
            _cb = max(1.0, np.log2(len(set(text)) if set(text) else 2))
            return _ntok * (_ib + _cb)

        rng = np.random.default_rng(0)
        p = 0.11
        seq = (rng.random(20000) < p).astype(int)
        s = "".join("ab"[b] for b in seq)

        # TODO: for n in [500, 2000, 8000, 20000], compute lz78_bits(s[:n]) / n
        # TODO: print each alongside h2(p) and confirm the gap shrinks as n grows
        for n in [500, 2000, 8000, 20000]:
            bps = ...
            # print(f"n={n:6d}  LZ78 bits/sym = {bps:.3f}   H2(p) = {h2(p):.3f}")
            ...

    _run()
    return


if __name__ == "__main__":
    app.run()
