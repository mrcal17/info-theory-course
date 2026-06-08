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
    # 4C: Convolutional & Turbo Codes

    > *"A code is a way of spending redundancy wisely."*
    > — after David MacKay

    In 4A you built block codes: chop the message into fixed-size blocks, append parity, decode each block on its own. That works, but it throws away a powerful idea — **memory**. What if every output bit depended not just on the current message bit but on the last few, so that information *bleeds* across time and a single corrupted symbol can be reconstructed from its neighbors?

    That is the convolutional code. It is a tiny shift register, a handful of XOR taps, and an output stream that is a *convolution* of the input with the code's tap pattern. The encoder is almost embarrassingly simple. The magic is on the decoding side: the **Viterbi algorithm**, a dynamic program that finds the single most likely transmitted sequence out of exponentially many, in linear time. You already know dynamic programming — this is the same machinery you have seen in HMMs and sequence models, here doing maximum-likelihood decoding.

    Then we go one step further. In 1993, Berrou, Glavieux, and Thitimajshima bolted two convolutional codes together with an interleaver and decoded them by passing soft beliefs back and forth — and got within **0.5 dB of the Shannon limit**, a result so good the community initially refused to believe it. That is the **turbo code**, and the loop it runs is the same iterative, message-passing idea that powers the LDPC and belief-propagation decoders in 4D.

    By the end of this module you will encode with a shift register, decode with Viterbi, watch a surviving path light up in a trellis as you inject noise, simulate a bit-error-rate curve, and understand why turbo codes finally cashed the check Shannon wrote in 1948.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. The Convolutional Encoder: A Shift Register With Taps

    A rate-$1/n$ convolutional encoder reads one message bit at a time, pushes it into a shift register of $m$ memory cells, and emits $n$ output bits — each a modulo-2 sum (XOR) of a chosen subset of the register contents. Because the output depends on the current bit *and* the past $m$ bits, the code has **memory**; its **constraint length** is $K = m + 1$ (the span of bits each output sees).

    The classic textbook example is the rate-$1/2$, $K=3$ encoder with generator polynomials $(7, 5)$ in octal. Write the register state as $(s_1, s_0)$ holding the two previous input bits, and let $u$ be the current input. The taps are:

    $$g^{(1)} = (1,1,1) \;\to\; v^{(1)} = u \oplus s_1 \oplus s_0 \qquad (\text{octal } 7 = 111_2)$$
    $$g^{(2)} = (1,0,1) \;\to\; v^{(2)} = u \oplus s_0 \qquad\qquad (\text{octal } 5 = 101_2)$$

    Each input bit produces two output bits $v^{(1)} v^{(2)}$, so the code rate is $R = 1/2$: we send twice as many bits as we receive, and that redundancy is what buys reliability. The generator polynomial $7 = 1 + x + x^2$ literally lists which register positions feed the XOR.

    **Why "convolutional"?** The output stream is the discrete convolution of the input stream with the tap pattern, all over $\mathrm{GF}(2)$. The same operation as a 1-D conv filter you know from CNNs — only the multiplications are ANDs and the additions are XORs.

    > [MacKay Ch 48](https://www.inference.org.uk/itprnn/book.pdf) introduces convolutional codes and the trellis.
    > [Lin & Costello Ch 11–12](https://openlibrary.org/books/OL3301344M/Error_control_coding) is the definitive treatment of encoders, structure, and Viterbi.
    """)
    return


@app.cell
def _():
    def _run():
        def encode(bits, g1=0b111, g2=0b101, K=3):
            _state = 0
            _out = []
            for _b in bits:
                _reg = (_b << (K - 1)) | _state
                _v1 = bin(_reg & g1).count("1") & 1
                _v2 = bin(_reg & g2).count("1") & 1
                _out.extend([_v1, _v2])
                _state = (_reg >> 1) & ((1 << (K - 1)) - 1)
            return _out

        _msg = [1, 0, 1, 1, 0, 0]
        _coded = encode(_msg)
        print("=== Rate-1/2, K=3 convolutional encoder, generators (7,5) octal ===")
        print(f"  message  ({len(_msg)} bits): {_msg}")
        print(f"  encoded ({len(_coded)} bits): {_coded}")
        print(f"  rate = {len(_msg)}/{len(_coded)} = {len(_msg) / len(_coded):.3f}")

        print("\nStep-by-step (state holds the two previous input bits):")
        _state = 0
        for _b in _msg:
            _reg = (_b << 2) | _state
            _v1 = bin(_reg & 0b111).count("1") & 1
            _v2 = bin(_reg & 0b101).count("1") & 1
            print(f"  in={_b}  state={_state:02b}  ->  out={_v1}{_v2}")
            _state = (_reg >> 1) & 0b11

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The Trellis: Unrolling the State Machine in Time

    A convolutional encoder is a finite-state machine: with $m=2$ memory cells it has $2^m = 4$ states. At each time step the state takes one of those values, and an input bit drives it to a new state while emitting output bits. Draw the four states as a vertical column, copy that column once per time step, and connect each state to the two states it can reach (input $0$ or input $1$). That picture — states $\times$ time, with labeled transitions — is the **trellis**.

    The trellis is the single most important object in this module, because **every valid codeword is exactly one path through it.** Encoding traces a path left to right. Decoding asks the reverse question: given a noisy received stream, *which path was most likely sent?*

    Two facts make this tractable:

    - From any state there are only **two outgoing edges** (input 0 or 1) and **two incoming edges**. The structure is sparse and regular.
    - Each edge carries a fixed **output label** — the $n$ bits the encoder emits on that transition — so we can compare any edge against the received bits and score it.

    For our $(7,5)$ encoder, label states by $(s_1 s_0)$ = the last two inputs (most recent on the left). The transition table below lists, for each state and input, the next state and the two emitted bits.

    > [Lin & Costello Ch 12](https://openlibrary.org/books/OL3301344M/Error_control_coding) develops the trellis and state diagram in detail.
    """)
    return


@app.cell
def _():
    def _run():
        K = 3
        g1, g2 = 0b111, 0b101
        n_states = 1 << (K - 1)

        print("=== Trellis transition table  (state = last two inputs, s1 s0) ===")
        print(f"{'state':>6} {'input':>6} {'-> next':>8} {'output':>8}")
        for _s in range(n_states):
            for _u in (0, 1):
                _reg = (_u << (K - 1)) | _s
                _v1 = bin(_reg & g1).count("1") & 1
                _v2 = bin(_reg & g2).count("1") & 1
                _next = (_reg >> 1) & (n_states - 1)
                print(f"{_s:>06b} {_u:>6} {_next:>08b} {f'{_v1}{_v2}':>8}")

        print("\nFour states, two edges out of each -> a clean 4-row trellis.")
        print("Every codeword is one left-to-right path through this graph.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Viterbi: Maximum-Likelihood Decoding as a Dynamic Program

    We receive a noisy stream $\mathbf{r}$ and want the codeword $\mathbf{v}$ (equivalently, the path through the trellis) that is most likely to have produced it. For a memoryless channel the maximum-likelihood path minimizes a **path metric** — the sum, over all edges, of a per-edge distance between the edge's output label and the received bits.

    - **Hard-decision** decoding: the receiver first rounds each received value to 0/1, and the edge metric is **Hamming distance** between the 2-bit label and the 2 received bits.
    - **Soft-decision** decoding: the receiver keeps the real-valued channel output, and the edge metric is **squared Euclidean distance** to the $\pm 1$ symbols. Soft decoding is worth about **2 dB** over hard — throwing away the analog confidence is expensive.

    A brute-force search over all $2^L$ paths is hopeless. The Viterbi algorithm exploits the trellis with one observation: **the best path into a state, up to time $t$, must extend the best path into one of its predecessor states.** So we keep, for each state, only the single surviving path with the smallest accumulated metric. At each step:

    $$M_t(s) = \min_{s' \to s}\Big[\, M_{t-1}(s') + \text{branch}(s' \to s)\,\Big]$$

    and we remember which predecessor $s'$ achieved the minimum. After processing the whole stream we pick the best final state and **trace back** the stored choices to recover the decoded bits. The cost is $O(L \cdot 2^m)$ — linear in the message length — instead of exponential. This add-compare-select recursion is exactly the Viterbi step you have met in HMMs; here the "states" are register contents and the "emissions" are code symbols.

    The demo decodes a noisy transmission and confirms it recovers the original message.

    > [MacKay Ch 48](https://www.inference.org.uk/itprnn/book.pdf) and [Lin & Costello Ch 12](https://openlibrary.org/books/OL3301344M/Error_control_coding) both derive Viterbi; [Richardson & Urbanke Ch 6](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) frames it as the max-product / min-sum algorithm on a trellis.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        K, g1, g2 = 3, 0b111, 0b101
        n_states = 1 << (K - 1)

        def _branch(s, u):
            _reg = (u << (K - 1)) | s
            _v1 = bin(_reg & g1).count("1") & 1
            _v2 = bin(_reg & g2).count("1") & 1
            _nxt = (_reg >> 1) & (n_states - 1)
            return _nxt, (_v1, _v2)

        def encode(bits):
            _s, _out = 0, []
            for _b in bits:
                _s, _o = _branch(_s, _b)
                _out.extend(_o)
            return _out

        def viterbi(recv):
            _L = len(recv) // 2
            _INF = float("inf")
            _metric = [_INF] * n_states
            _metric[0] = 0.0
            _back = [[0] * n_states for _ in range(_L)]
            _binp = [[0] * n_states for _ in range(_L)]
            for _t in range(_L):
                _r = recv[2 * _t:2 * _t + 2]
                _new = [_INF] * n_states
                for _s in range(n_states):
                    if _metric[_s] == _INF:
                        continue
                    for _u in (0, 1):
                        _nxt, _lab = _branch(_s, _u)
                        _d = (_lab[0] ^ _r[0]) + (_lab[1] ^ _r[1])
                        _cand = _metric[_s] + _d
                        if _cand < _new[_nxt]:
                            _new[_nxt] = _cand
                            _back[_t][_nxt] = _s
                            _binp[_t][_nxt] = _u
                _metric = _new
            _s = int(np.argmin(_metric))
            _bits = []
            for _t in range(_L - 1, -1, -1):
                _bits.append(_binp[_t][_s])
                _s = _back[_t][_s]
            return _bits[::-1], _metric[int(np.argmin(_metric))]

        _rng = np.random.default_rng(7)
        _msg = [int(_b) for _b in _rng.integers(0, 2, size=12)]
        _clean = encode(_msg)
        _recv = _clean.copy()
        _flips = _rng.choice(len(_recv), size=2, replace=False)
        for _i in _flips:
            _recv[_i] ^= 1

        _dec, _cost = viterbi(_recv)
        print("=== Viterbi hard-decision decoding ===")
        print(f"  message    : {_msg}")
        print(f"  clean code : {_clean}")
        print(f"  channel flipped bit positions: {sorted(_flips.tolist())}")
        print(f"  decoded    : {_dec}")
        print(f"  final path metric (Hamming) : {_cost:.0f}")
        print(f"  recovered original exactly?  {_dec == _msg}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. Interactive Viterbi Trellis Decoder

    Time to make it concrete. Below you choose a short message, set how many channel errors to inject, and watch the decoder work *inside the trellis*. The plot shows all four states across time; faint gray edges are the full trellis, and the bold green path is the **surviving maximum-likelihood path** Viterbi traces back. Red ticks mark where the channel corrupted bits.

    Try this: push the number of injected errors up. With one or two flips the green path still lands on the true message — that is the code correcting errors. Crank it higher and at some point the survivor diverges from the truth: you have exceeded what a $K=3$, rate-$1/2$ code can fix over this block. The free distance of this code is $d_{\text{free}} = 5$, so it reliably corrects up to $\lfloor (5-1)/2 \rfloor = 2$ errors that are spread out — bursts that pile onto the same few symbols defeat it sooner.
    """)
    return


@app.cell
def _(mo):
    vit_seed = mo.ui.slider(start=0, stop=30, step=1, value=3, label="message seed")
    vit_len = mo.ui.slider(start=4, stop=10, step=1, value=6, label="message length (bits)")
    vit_errors = mo.ui.slider(start=0, stop=6, step=1, value=2, label="channel bit-errors injected")
    mo.vstack([vit_seed, vit_len, vit_errors])
    return vit_errors, vit_len, vit_seed


@app.cell
def _(vit_errors, vit_len, vit_seed):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        K, g1, g2 = 3, 0b111, 0b101
        n_states = 1 << (K - 1)

        def _branch(s, u):
            _reg = (u << (K - 1)) | s
            _v1 = bin(_reg & g1).count("1") & 1
            _v2 = bin(_reg & g2).count("1") & 1
            _nxt = (_reg >> 1) & (n_states - 1)
            return _nxt, (_v1, _v2)

        _rng = np.random.default_rng(int(vit_seed.value))
        _L = int(vit_len.value)
        _msg = [int(_b) for _b in _rng.integers(0, 2, size=_L)]

        _s, _clean, _true_path = 0, [], [0]
        for _b in _msg:
            _s, _o = _branch(_s, _b)
            _clean.extend(_o)
            _true_path.append(_s)

        _recv = _clean.copy()
        _ne = min(int(vit_errors.value), len(_recv))
        _flips = _rng.choice(len(_recv), size=_ne, replace=False) if _ne > 0 else np.array([], dtype=int)
        for _i in _flips:
            _recv[_i] ^= 1

        _INF = float("inf")
        _metric = [_INF] * n_states
        _metric[0] = 0.0
        _back = [[0] * n_states for _ in range(_L)]
        _binp = [[0] * n_states for _ in range(_L)]
        for _t in range(_L):
            _r = _recv[2 * _t:2 * _t + 2]
            _new = [_INF] * n_states
            for _st in range(n_states):
                if _metric[_st] == _INF:
                    continue
                for _u in (0, 1):
                    _nxt, _lab = _branch(_st, _u)
                    _d = (_lab[0] ^ _r[0]) + (_lab[1] ^ _r[1])
                    _cand = _metric[_st] + _d
                    if _cand < _new[_nxt]:
                        _new[_nxt] = _cand
                        _back[_t][_nxt] = _st
                        _binp[_t][_nxt] = _u
            _metric = _new

        _sf = int(np.argmin(_metric))
        _dec, _surv = [], [_sf]
        for _t in range(_L - 1, -1, -1):
            _dec.append(_binp[_t][_sf])
            _sf = _back[_t][_sf]
            _surv.append(_sf)
        _dec = _dec[::-1]
        _surv = _surv[::-1]

        _fig, _ax = plt.subplots(figsize=(9, 4.2))
        for _t in range(_L):
            for _st in range(n_states):
                for _u in (0, 1):
                    _nxt, _ = _branch(_st, _u)
                    _ax.plot([_t, _t + 1], [_st, _nxt], color="0.82", lw=1, zorder=1)
        _ax.plot(range(_L + 1), _true_path, color="orange", lw=2.5, ls="--",
                 alpha=0.8, zorder=2, label="true (sent) path")
        _ax.plot(range(_L + 1), _surv, color="seagreen", lw=3, alpha=0.9,
                 zorder=3, label="Viterbi survivor")
        _ax.scatter(range(_L + 1), _surv, color="seagreen", s=45, zorder=4)
        for _i in _flips:
            _ax.axvline(_i // 2 + 0.5, color="red", ls=":", alpha=0.4, zorder=0)
        _ax.set_yticks(range(n_states))
        _ax.set_yticklabels([f"{_st:02b}" for _st in range(n_states)])
        _ax.set_xlabel("time step")
        _ax.set_ylabel("encoder state (s1 s0)")
        _ok = "RECOVERED" if _dec == _msg else "DECODE ERROR"
        _ax.set_title(f"Viterbi trellis  |  {_ne} bit-errors injected  |  {_ok}\n"
                      f"sent={_msg}  decoded={_dec}")
        _ax.legend(loc="upper right", fontsize=8)
        _ax.grid(True, axis="x", alpha=0.25)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.image(src="../animations/rendered/ViterbiTrellis.gif")
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. From Hard to Soft, and the BER-vs-SNR Curve

    How good is a code? The honest answer is a curve. Transmit over an additive-white-Gaussian-noise (AWGN) channel with BPSK modulation: bit $0 \to +1$, bit $1 \to -1$, then add Gaussian noise of variance $\sigma^2$. We sweep the signal-to-noise ratio $E_b/N_0$ (energy per *information* bit over noise density, in dB) and measure the resulting **bit-error rate** (BER) after decoding.

    Three reference points anchor the picture:

    - **Uncoded BPSK** is the baseline — the BER you get with no coding at all, $Q\!\big(\sqrt{2 E_b/N_0}\big)$.
    - **Hard-decision Viterbi** rounds the channel to 0/1 first, then runs the Hamming-metric decoder of Section 3.
    - **Soft-decision Viterbi** feeds the real channel values straight in, using squared-Euclidean branch metrics, and wins roughly **2 dB** for free.

    The all-important quantity is **coding gain**: at a target BER (say $10^{-3}$), how many dB of transmit power does the code save you versus uncoded? For this little $K=3$ code, soft Viterbi buys a few dB; the strong codes of 4D buy almost all of the $\sim 11$ dB gap to the Shannon limit. Read the curve like this — *down and to the left is better*: lower error for less power.

    The simulation below is a real Monte-Carlo run in pure numpy. It transmits thousands of bits per SNR point, decodes three ways, and plots the curves. The waterfall shape — flat at low SNR, then plunging — is the signature of a code that suddenly "kicks in" once the channel is good enough.

    > [Lin & Costello Ch 12](https://openlibrary.org/books/OL3301344M/Error_control_coding) covers soft-decision Viterbi and coding gain; [MacKay Ch 48](https://www.inference.org.uk/itprnn/book.pdf) plots the waterfall.
    """)
    return


@app.cell
def _(mo):
    ber_nbits = mo.ui.slider(start=2000, stop=20000, step=2000, value=8000, label="info bits per SNR point")
    ber_decoder = mo.ui.dropdown(
        options=["soft + hard + uncoded", "soft vs uncoded", "hard vs uncoded"],
        value="soft + hard + uncoded",
        label="curves to show",
    )
    mo.vstack([ber_nbits, ber_decoder])
    return ber_decoder, ber_nbits


@app.cell
def _(ber_decoder, ber_nbits):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt
        from scipy.special import erfc

        K, g1, g2 = 3, 0b111, 0b101
        n_states = 1 << (K - 1)

        def _branch(s, u):
            _reg = (u << (K - 1)) | s
            _v1 = bin(_reg & g1).count("1") & 1
            _v2 = bin(_reg & g2).count("1") & 1
            _nxt = (_reg >> 1) & (n_states - 1)
            return _nxt, (_v1, _v2)

        _table = {(s, u): _branch(s, u) for s in range(n_states) for u in (0, 1)}

        def encode(bits):
            _s, _out = 0, []
            for _b in bits:
                (_s, _o) = _table[(_s, _b)]
                _out.extend(_o)
            return np.array(_out, dtype=int)

        def viterbi(metric_fn, recv_pairs):
            _L = len(recv_pairs)
            _INF = float("inf")
            _m = np.full(n_states, _INF)
            _m[0] = 0.0
            _back = np.zeros((_L, n_states), dtype=int)
            _binp = np.zeros((_L, n_states), dtype=int)
            for _t in range(_L):
                _r = recv_pairs[_t]
                _new = np.full(n_states, _INF)
                for _s in range(n_states):
                    if _m[_s] == _INF:
                        continue
                    for _u in (0, 1):
                        _nxt, _lab = _table[(_s, _u)]
                        _cand = _m[_s] + metric_fn(_lab, _r)
                        if _cand < _new[_nxt]:
                            _new[_nxt] = _cand
                            _back[_t, _nxt] = _s
                            _binp[_t, _nxt] = _u
                _m = _new
            _s = int(np.argmin(_m))
            _bits = np.zeros(_L, dtype=int)
            for _t in range(_L - 1, -1, -1):
                _bits[_t] = _binp[_t, _s]
                _s = _back[_t, _s]
            return _bits

        def _hard_metric(lab, r):
            _b0 = 0 if r[0] >= 0 else 1
            _b1 = 0 if r[1] >= 0 else 1
            return (lab[0] ^ _b0) + (lab[1] ^ _b1)

        def _soft_metric(lab, r):
            _s0 = 1.0 - 2.0 * lab[0]
            _s1 = 1.0 - 2.0 * lab[1]
            return (r[0] - _s0) ** 2 + (r[1] - _s1) ** 2

        _rng = np.random.default_rng(0)
        _nbits = int(ber_nbits.value)
        _msg = _rng.integers(0, 2, size=_nbits)
        _coded = encode(list(_msg))
        _tx = 1.0 - 2.0 * _coded
        _rate = 0.5

        _snr_db = np.arange(0, 8.5, 1.0)
        _ber_unc, _ber_hard, _ber_soft = [], [], []
        for _ebn0_db in _snr_db:
            _ebn0 = 10 ** (_ebn0_db / 10)
            _sigma = np.sqrt(1.0 / (2.0 * _rate * _ebn0))
            _noise = _rng.normal(0, _sigma, size=_tx.shape)
            _rx = _tx + _noise
            _pairs = _rx.reshape(-1, 2)

            _unc_hat = (_rx < 0).astype(int)
            _ber_unc.append(np.mean(_unc_hat != _coded))

            _ber_hard.append(np.mean(viterbi(_hard_metric, _pairs) != _msg))
            _ber_soft.append(np.mean(viterbi(_soft_metric, _pairs) != _msg))

        _ebn0_lin = 10 ** (_snr_db / 10)
        _theory_unc = 0.5 * erfc(np.sqrt(_ebn0_lin))

        _fig, _ax = plt.subplots(figsize=(8, 5))
        _eps = 0.5 / _nbits
        _mode = ber_decoder.value
        _ax.semilogy(_snr_db, np.maximum(_theory_unc, 1e-6), "k--", lw=1.2,
                     alpha=0.7, label="uncoded BPSK (theory)")
        if "uncoded" in _mode:
            _ax.semilogy(_snr_db, np.maximum(_ber_unc, _eps), "o-", color="gray",
                         label="uncoded (sim)")
        if "hard" in _mode:
            _ax.semilogy(_snr_db, np.maximum(_ber_hard, _eps), "s-", color="darkorange",
                         label="hard Viterbi")
        if "soft" in _mode:
            _ax.semilogy(_snr_db, np.maximum(_ber_soft, _eps), "^-", color="seagreen",
                         label="soft Viterbi")
        _ax.axhline(1e-3, color="red", ls=":", alpha=0.4)
        _ax.set_xlabel("Eb/N0 (dB)")
        _ax.set_ylabel("bit-error rate")
        _ax.set_title(f"BER vs SNR  —  rate-1/2 K=3 conv code  ({_nbits} info bits/point)")
        _ax.set_ylim(_eps * 0.5, 1.0)
        _ax.grid(True, which="both", alpha=0.3)
        _ax.legend(loc="lower left", fontsize=9)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. BCJR / MAP Decoding: From Best Path to Best Bit

    Viterbi finds the single most likely *sequence*. But sometimes you want the most likely *individual bit* — and, crucially, a **soft** measure of how sure you are about it. That is what the **BCJR algorithm** (Bahl–Cocke–Jelinek–Raviv, 1974) computes: the exact a-posteriori probability of each message bit, $P(u_t \mid \mathbf{r})$, by a forward–backward sweep over the trellis.

    The structure mirrors the forward–backward algorithm for HMMs you already know:

    - **Forward pass** $\alpha_t(s)$: probability of reaching state $s$ at time $t$ given the received prefix.
    - **Backward pass** $\beta_t(s)$: probability of the received suffix given you are in state $s$.
    - **Branch metric** $\gamma_t(s', s)$: probability of the transition $s' \to s$ and its observation.

    Combine them and the posterior that bit $u_t = 1$ is the total weight of all $u_t=1$ edges:

    $$P(u_t = 1 \mid \mathbf{r}) \;\propto\!\! \sum_{(s' \to s):\, u=1} \alpha_{t-1}(s')\, \gamma_t(s', s)\, \beta_t(s)$$

    The output is usually expressed as a **log-likelihood ratio** $L(u_t) = \log \frac{P(u_t=0\mid \mathbf r)}{P(u_t=1\mid \mathbf r)}$: its **sign** is the hard decision, its **magnitude** is the confidence. That soft, confidence-weighted output is exactly what turbo decoding (next section) needs — Viterbi's single hard path is not enough to feed an iterative loop.

    The demo runs a small BCJR forward–backward and prints per-bit posteriors and LLRs.

    > [Lin & Costello Ch 12,16](https://openlibrary.org/books/OL3301344M/Error_control_coding) presents BCJR/MAP; [Richardson & Urbanke Ch 6](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) casts it as sum-product on the trellis factor graph.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        K, g1, g2 = 3, 0b111, 0b101
        n_states = 1 << (K - 1)

        def _branch(s, u):
            _reg = (u << (K - 1)) | s
            _v1 = bin(_reg & g1).count("1") & 1
            _v2 = bin(_reg & g2).count("1") & 1
            _nxt = (_reg >> 1) & (n_states - 1)
            return _nxt, (_v1, _v2)

        _trans = [(s, u, *_branch(s, u)) for s in range(n_states) for u in (0, 1)]

        def encode(bits):
            _s, _out = 0, []
            for _b in bits:
                _s, _o = _branch(_s, _b)
                _out.extend(_o)
            return np.array(_out)

        _rng = np.random.default_rng(2)
        _msg = np.array([1, 0, 1, 1, 0])
        _coded = encode(list(_msg))
        _tx = 1.0 - 2.0 * _coded
        _sigma = 0.9
        _rx = _tx + _rng.normal(0, _sigma, size=_tx.shape)
        _pairs = _rx.reshape(-1, 2)
        _L = len(_msg)

        def _gamma(t, s, u):
            _nxt, _lab = _branch(s, u)
            _ls = np.array([1.0 - 2.0 * _lab[0], 1.0 - 2.0 * _lab[1]])
            _d = _pairs[t] - _ls
            return np.exp(-np.sum(_d * _d) / (2 * _sigma ** 2))

        _alpha = np.zeros((_L + 1, n_states))
        _alpha[0, 0] = 1.0
        for _t in range(_L):
            for (_s, _u, _nxt, _lab) in _trans:
                _alpha[_t + 1, _nxt] += _alpha[_t, _s] * _gamma(_t, _s, _u)
            _alpha[_t + 1] /= _alpha[_t + 1].sum()

        _beta = np.zeros((_L + 1, n_states))
        _beta[_L] = 1.0 / n_states
        for _t in range(_L - 1, -1, -1):
            for (_s, _u, _nxt, _lab) in _trans:
                _beta[_t, _s] += _beta[_t + 1, _nxt] * _gamma(_t, _s, _u)
            _beta[_t] /= _beta[_t].sum()

        print("=== BCJR / MAP per-bit posteriors  (sigma = 0.9) ===")
        print(f"  true message: {_msg.tolist()}")
        print(f"{'t':>3} {'P(u=0)':>8} {'P(u=1)':>8} {'LLR':>8} {'hard':>5} {'ok':>4}")
        _dec = []
        for _t in range(_L):
            _p0 = _p1 = 0.0
            for (_s, _u, _nxt, _lab) in _trans:
                _w = _alpha[_t, _s] * _gamma(_t, _s, _u) * _beta[_t + 1, _nxt]
                if _u == 0:
                    _p0 += _w
                else:
                    _p1 += _w
            _z = _p0 + _p1
            _p0, _p1 = _p0 / _z, _p1 / _z
            _llr = np.log((_p0 + 1e-12) / (_p1 + 1e-12))
            _bit = 0 if _llr > 0 else 1
            _dec.append(_bit)
            print(f"{_t:>3} {_p0:>8.3f} {_p1:>8.3f} {_llr:>8.2f} {_bit:>5} "
                  f"{'Y' if _bit == _msg[_t] else 'N':>4}")
        print(f"\n  hard decisions from LLR sign: {_dec}  ->  exact? {_dec == _msg.tolist()}")
        print("  Magnitude of LLR = confidence; this soft output is what turbo decoding passes around.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Turbo Codes & Iterative Decoding: Hitting the Limit

    Here is the breakthrough. A **turbo code** takes two simple recursive convolutional encoders and feeds them the *same* message — but the second copy sees the bits in a **scrambled order**, fixed by a pseudo-random **interleaver** $\pi$. You transmit the systematic bits plus the parity from each encoder. Neither component code is strong on its own. Their *combination*, decoded the right way, is astonishingly close to optimal.

    The right way is **iterative decoding**. Each component has its own BCJR/MAP decoder producing soft LLRs. The trick is **extrinsic information**: decoder 1 produces, for each bit, the *new* belief it learned that decoder 2 did not already supply. That extrinsic LLR is deinterleaved and handed to decoder 2 as a prior; decoder 2 does its BCJR, produces *its* extrinsic LLR, interleaves it back, and the loop repeats. Each pass, the two decoders' beliefs reinforce each other — the bit errors melt away over a handful of iterations. The name is an analogy to a turbocharger feeding its own exhaust back in.

    Why does it work so well? Two reasons rooted in the rest of this course:

    - The interleaver makes the two codes' error patterns **nearly independent**, so a burst that fools one decoder looks like scattered noise to the other.
    - Passing *extrinsic* (not total) information keeps the loop from double-counting evidence — exactly the principle behind **belief propagation** on the loopy graph of 4D. Turbo decoding *is* BP on the turbo code's factor graph.

    The payoff: with a long interleaver, turbo codes reach within **0.5 dB of the Shannon capacity** on the AWGN channel — the first practical codes ever to do so, and the reason they went into 3G/4G phones, deep-space links, and DVB. The demo below runs a miniature iterative loop on two soft "decoders" and watches the average LLR magnitude (the confidence) climb with each iteration.

    > [Richardson & Urbanke Ch 6](https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf) is the modern reference on turbo/iterative decoding; [MacKay Ch 48](https://www.inference.org.uk/itprnn/book.pdf) and [Lin & Costello Ch 16](https://openlibrary.org/books/OL3301344M/Error_control_coding) cover construction and performance.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        K, g1, g2 = 3, 0b111, 0b101
        n_states = 1 << (K - 1)

        def _branch(s, u):
            _reg = (u << (K - 1)) | s
            _v1 = bin(_reg & g1).count("1") & 1
            _v2 = bin(_reg & g2).count("1") & 1
            _nxt = (_reg >> 1) & (n_states - 1)
            return _nxt, (_v1, _v2)

        _trans = [(s, u, *_branch(s, u)) for s in range(n_states) for u in (0, 1)]

        def encode(bits):
            _s, _out = 0, []
            for _b in bits:
                _s, _o = _branch(_s, _b)
                _out.extend(_o)
            return np.array(_out)

        def bcjr_llr(sys_llr, parity_llr, apriori):
            _Ln = len(apriori)
            _alpha = np.zeros((_Ln + 1, n_states))
            _alpha[0, 0] = 1.0
            _beta = np.zeros((_Ln + 1, n_states))
            _beta[_Ln] = 1.0 / n_states

            def _g(t, s, u):
                _nxt, _lab = _branch(s, u)
                _pr = 1.0 / (1.0 + np.exp((1 - 2 * u) * (-apriori[t])))
                _sysbit = u
                _val = _pr
                _val *= 1.0 / (1.0 + np.exp((1 - 2 * _sysbit) * (-sys_llr[t])))
                _val *= 1.0 / (1.0 + np.exp((1 - 2 * _lab[1]) * (-parity_llr[t])))
                return _val + 1e-300

            for _t in range(_Ln):
                for (_s, _u, _nxt, _lab) in _trans:
                    _alpha[_t + 1, _nxt] += _alpha[_t, _s] * _g(_t, _s, _u)
                _alpha[_t + 1] /= _alpha[_t + 1].sum() + 1e-300
            for _t in range(_Ln - 1, -1, -1):
                for (_s, _u, _nxt, _lab) in _trans:
                    _beta[_t, _s] += _beta[_t + 1, _nxt] * _g(_t, _s, _u)
                _beta[_t] /= _beta[_t].sum() + 1e-300

            _llr = np.zeros(_Ln)
            for _t in range(_Ln):
                _p0 = _p1 = 0.0
                for (_s, _u, _nxt, _lab) in _trans:
                    _w = _alpha[_t, _s] * _g(_t, _s, _u) * _beta[_t + 1, _nxt]
                    if _u == 0:
                        _p0 += _w
                    else:
                        _p1 += _w
                _llr[_t] = np.log((_p0 + 1e-300) / (_p1 + 1e-300))
            return _llr

        _rng = np.random.default_rng(5)
        _Lm = 16
        _msg = _rng.integers(0, 2, size=_Lm)
        _perm = _rng.permutation(_Lm)

        _par1 = encode(list(_msg)).reshape(-1, 2)[:, 1]
        _par2 = encode(list(_msg[_perm])).reshape(-1, 2)[:, 1]

        _sigma = 1.1
        def _chan_llr(bits):
            _tx = 1.0 - 2.0 * bits
            _rx = _tx + _rng.normal(0, _sigma, size=_tx.shape)
            return 2.0 * _rx / _sigma ** 2

        _Lsys = _chan_llr(_msg)
        _Lpar1 = _chan_llr(_par1)
        _Lpar2 = _chan_llr(_par2)

        print("=== Miniature turbo iterative decoding ===")
        print(f"  message ({_Lm} bits): {_msg.tolist()}")
        _ext = np.zeros(_Lm)
        for _it in range(1, 7):
            _l1 = bcjr_llr(_Lsys, _Lpar1, _ext)
            _e1 = _l1 - _Lsys - _ext
            _l2 = bcjr_llr(_Lsys[_perm], _Lpar2, _e1[_perm])
            _e2 = _l2 - _Lsys[_perm] - _e1[_perm]
            _ext = np.zeros(_Lm)
            _ext[_perm] = _e2
            _post = _Lsys + _ext + _e1
            _hat = (_post < 0).astype(int)
            _errs = int(np.sum(_hat != _msg))
            _conf = float(np.mean(np.abs(_post)))
            print(f"  iter {_it}:  bit-errors = {_errs:>2}   mean |LLR| (confidence) = {_conf:6.2f}")
        print(f"\n  final decode: {_hat.tolist()}")
        print(f"  matches message? {_hat.tolist() == _msg.tolist()}")
        print("  Confidence climbs each pass as the two decoders trade extrinsic beliefs.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 8. Why This Matters for Machine Learning

    Convolutional and turbo codes are not just communications engineering — their core algorithms are load-bearing in ML, and the connections run deep:

    - **Viterbi is your sequence decoder.** The exact same add-compare-select recursion decodes hidden Markov models, finds the best alignment in CTC speech recognition, and runs MAP inference in linear-chain CRFs (the classic NER / POS-tagging backbone). When you call `.decode()` on a sequence model, you are running Section 3.
    - **Forward–backward / BCJR is sum-product on a chain.** The HMM forward–backward algorithm, the E-step of Baum–Welch, and BCJR are *the same algorithm* — marginalization on a chain factor graph. Section 6 is the EM you have already used, viewed through coding theory.
    - **Turbo decoding is loopy belief propagation.** The interleave-decode-extrinsic loop is message passing on a graph with cycles — precisely the framework behind LDPC decoding (4D), Bayesian network inference, and the message-passing layers in graph neural networks. The discovery that loopy BP works *brilliantly* on turbo codes is what revived approximate-inference research in ML in the late 1990s.
    - **Soft information and LLRs.** Keeping a real-valued confidence (the LLR) instead of a hard 0/1 — and gaining 2 dB for it — is the same lesson as using soft probabilities, logits, and temperature in neural nets rather than premature `argmax`. Differentiable, soft decisions carry more gradient and more information.
    - **Approaching a fundamental limit by iteration.** Turbo codes show that a smartly coupled pair of weak learners, refined by passing partial beliefs back and forth, can reach a hard theoretical bound. That is the same spirit as boosting, as iterative refinement in diffusion models, and as the variational lower bounds you will tighten in Part 6.

    Next, **Module 4D** takes the iterative-decoding idea to its modern peak: LDPC codes on Tanner graphs decoded by belief propagation, density evolution to predict their thresholds, and polar codes — the first codes *proven* to achieve capacity. The message-passing loop you just watched in turbo decoding is the engine there too.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise hands you a problem and a skeleton — fill in the missing pieces. Together they walk you from encoder to trellis to Viterbi to a full BER curve, the complete pipeline of this module.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Convolutional Encoder

    Implement the rate-$1/2$, $K=3$ encoder with generators $(7,5)$ octal. Push each input bit into a 2-bit state, XOR the right taps, and emit two output bits. The state should hold the two previous input bits. Verify that encoding `[1,0,1,1]` gives the same stream the Section 1 demo produced.
    """)
    return


@app.cell
def _():
    def _run():
        def encode(bits, g1=0b111, g2=0b101, K=3):
            state = 0
            out = []
            for b in bits:
                # TODO: form reg = (b shifted to the top) OR state
                reg = ...
                # TODO: v1 = parity of (reg AND g1); v2 = parity of (reg AND g2)
                v1 = ...
                v2 = ...
                out.extend([v1, v2])
                # TODO: shift the new bit in, keep only K-1 bits
                state = ...
            return out

        # print(encode([1, 0, 1, 1]))   # expect [1,1, 1,0, 0,0, 0,1]

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Trellis Transition Table

    Build the trellis. For each of the 4 states and each input bit, compute the next state and the 2-bit output label. Return a dict mapping `(state, input) -> (next_state, (v1, v2))`. This table is the backbone every decoder reads from.
    """)
    return


@app.cell
def _():
    def _run():
        def build_trellis(g1=0b111, g2=0b101, K=3):
            n_states = 1 << (K - 1)
            table = {}
            for s in range(n_states):
                for u in (0, 1):
                    reg = (u << (K - 1)) | s
                    # TODO: compute v1, v2 (parities) and nxt (shifted state)
                    v1 = ...
                    v2 = ...
                    nxt = ...
                    table[(s, u)] = (nxt, (v1, v2))
            return table

        # t = build_trellis()
        # print(t[(0, 1)])    # expect (1, (1, 1))
        # print(t[(3, 0)])    # expect (1, (0, 1))

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Viterbi Hard-Decision Decoder

    Implement the add-compare-select recursion. Keep one accumulated Hamming metric per state, remember the best predecessor and input at each step, then trace back from the best final state. Decode a stream with a couple of injected bit-flips and confirm you recover the message.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def build_trellis(g1=0b111, g2=0b101, K=3):
            n = 1 << (K - 1)
            tab = {}
            for s in range(n):
                for u in (0, 1):
                    reg = (u << (K - 1)) | s
                    v1 = bin(reg & g1).count("1") & 1
                    v2 = bin(reg & g2).count("1") & 1
                    tab[(s, u)] = ((reg >> 1) & (n - 1), (v1, v2))
            return tab, n

        def viterbi(recv):
            table, n_states = build_trellis()
            L = len(recv) // 2
            INF = float("inf")
            metric = [INF] * n_states
            metric[0] = 0.0
            back = [[0] * n_states for _ in range(L)]
            binp = [[0] * n_states for _ in range(L)]
            for t in range(L):
                r = recv[2 * t:2 * t + 2]
                new = [INF] * n_states
                for s in range(n_states):
                    if metric[s] == INF:
                        continue
                    for u in (0, 1):
                        nxt, lab = table[(s, u)]
                        # TODO: branch metric = Hamming(lab, r); candidate = metric[s] + that
                        d = ...
                        cand = ...
                        if cand < new[nxt]:
                            new[nxt] = cand
                            back[t][nxt] = s
                            binp[t][nxt] = u
                metric = new
            # TODO: pick best final state, then trace back through binp/back
            s = ...
            bits = []
            for t in range(L - 1, -1, -1):
                bits.append(binp[t][s])
                s = back[t][s]
            return bits[::-1]

        # recv = [1,1, 1,0, 0,0, 0,1]   # clean code for [1,0,1,1]
        # recv[2] ^= 1                  # inject one error
        # print(viterbi(recv))         # expect [1, 0, 1, 1]

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Soft vs Hard Branch Metrics

    Soft decoding wins ~2 dB by using the analog channel value. Write both branch metrics for a 2-bit label against a received pair `r`. Hard: map `r` to bits by sign, then Hamming. Soft: map the label to $\pm 1$ symbols and take squared Euclidean distance. Check that on a clean, confident received pair both agree on the winning edge.
    """)
    return


@app.cell
def _():
    def _run():
        def hard_metric(lab, r):
            # TODO: round each r to a bit by sign (r>=0 -> 0, else 1), then Hamming distance
            b0 = ...
            b1 = ...
            return ...

        def soft_metric(lab, r):
            # TODO: map label bits 0/1 -> +1/-1, then squared Euclidean distance to r
            s0 = ...
            s1 = ...
            return ...

        # r = (0.9, -0.8)               # confident 0, then 1
        # print(hard_metric((0, 1), r)) # expect 0
        # print(soft_metric((0, 1), r)) # expect ~0.05 (small, this is the best edge)
        # print(soft_metric((1, 0), r)) # expect large (worst edge)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: A BER-vs-SNR Point

    Tie it together. For one SNR value, encode random bits, push them through an AWGN channel (BPSK + Gaussian noise of the right variance), decode, and measure the bit-error rate. The noise std for rate $R$ at $E_b/N_0$ (linear) is $\sigma = 1/\sqrt{2 R \, (E_b/N_0)}$. Reuse your `viterbi` from Exercise 3 by first hard-slicing the channel output.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def build_trellis(g1=0b111, g2=0b101, K=3):
            n = 1 << (K - 1)
            tab = {}
            for s in range(n):
                for u in (0, 1):
                    reg = (u << (K - 1)) | s
                    v1 = bin(reg & g1).count("1") & 1
                    v2 = bin(reg & g2).count("1") & 1
                    tab[(s, u)] = ((reg >> 1) & (n - 1), (v1, v2))
            return tab

        def encode(bits):
            tab = build_trellis()
            s, out = 0, []
            for b in bits:
                s, o = tab[(s, b)]
                out.extend(o)
            return np.array(out)

        rng = np.random.default_rng(0)
        rate = 0.5
        ebn0_db = 4.0

        msg = rng.integers(0, 2, size=4000)
        coded = encode(list(msg))
        tx = 1.0 - 2.0 * coded

        # TODO: ebn0 linear from dB; sigma = 1/sqrt(2*rate*ebn0); add Gaussian noise to tx
        ebn0 = ...
        sigma = ...
        rx = ...

        # TODO: hard-slice rx to bits (rx<0 -> 1), Viterbi-decode, compare to msg, compute BER
        hard = ...
        # decoded = viterbi(list(hard))      # from Exercise 3
        # ber = np.mean(np.array(decoded) != msg)
        # print(f"BER at {ebn0_db} dB = {ber:.4f}")   # should be well below uncoded

    _run()
    return


if __name__ == "__main__":
    app.run()
