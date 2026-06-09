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
    # 6F: Information Theory in Modern LLMs

    > *"The best compression of a dataset is the best understanding of it."*
    > — the predictive-coding view of learning

    Large language models look like an engineering achievement built on attention and gigantic GPU clusters. Strip the engineering away, though, and the *objective* is something you already built by hand in this course. **The training loss of every modern LLM is the cross-entropy of 6A** — the average codelength, in nats or bits, that the model pays to describe the next token. Training a 70-billion-parameter transformer is maximum-likelihood estimation on text, which (6A) is minimizing $D(\hat p \,\|\, q_\theta)$: pulling the model toward the empirical distribution of language, measured in bits.

    That single observation threads almost everything in this module together. **Perplexity** (1C, 2A) is just the cross-entropy exponentiated — the effective branching factor of the model's predictions. **Scaling laws** are compression curves: loss falls as a power law in compute and data, bottoming out at an *irreducible floor* that is nothing other than the entropy rate of text from 1C. **Language modeling literally is compression**: bolt any next-token predictor onto the arithmetic coder you built in 2C and you get a lossless compressor whose expected output length equals the model's cross-entropy — this is the centerpiece demo, and we build it from scratch. **Sampling temperature** is a dial on the entropy of the output distribution. **Tokenizers** are dictionary coders (2D). **Speculative decoding** is a rate trick that costs fewer big-model forward passes per token while provably leaving the sampled distribution unchanged.

    Nothing here is new theory. It is the information theory of Parts 1, 2, and 6 wearing modern clothes. We will keep coming back to the same equation, $\text{loss} = H(p, q_\theta) = H(p) + D(p\|q_\theta)$, and watch it explain one piece of the LLM stack after another.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ---

    ## 1. The Training Objective IS Cross-Entropy

    An autoregressive language model factorizes the probability of a sequence $x_{1:T}$ by the chain rule (1A):

    $$q_\theta(x_{1:T}) = \prod_{t=1}^{T} q_\theta(x_t \mid x_{<t}).$$

    Training maximizes the log-likelihood of real text, which is exactly the negative-log-loss you minimize:

    $$\mathcal{L}(\theta) = -\frac{1}{T}\sum_{t=1}^{T} \log q_\theta(x_t \mid x_{<t}) = \frac{1}{T}\sum_t H\!\big(\mathbf{e}_{x_t},\, q_\theta(\cdot\mid x_{<t})\big).$$

    Each term is the cross-entropy between the one-hot "truth" $\mathbf{e}_{x_t}$ and the model's predicted next-token distribution — the *identical* expression from 6A §2, now summed over positions in a sequence. Averaged over a held-out corpus it estimates the cross-entropy $H(p, q_\theta)$ between the true text distribution $p$ and the model $q_\theta$, and by 6A that decomposes as

    $$\boxed{\;\underbrace{H(p, q_\theta)}_{\text{the loss}} \;=\; \underbrace{H(p)}_{\substack{\text{entropy rate of text} \\ \text{(irreducible floor, 1C)}}} \;+\; \underbrace{D(p \,\|\, q_\theta)}_{\substack{\text{bits wasted for being} \\ \text{a wrong model}}}\;}$$

    No model can drive the loss below $H(p)$ — the entropy rate of language itself (1C). Everything above that floor is KL divergence the model can still squeeze out with more capacity or data.

    **Nats, bits, and bits-per-byte.** Frameworks report loss in **nats** (natural log); divide by $\ln 2$ to get **bits**. But comparing two models by their token-loss is unfair when they use different tokenizers — a coarser vocabulary packs more information into each token (raising per-token loss), while a finer one (think byte-level) spreads the same text over more, individually easier steps (lowering it), so the per-token numbers are not measuring the same thing. The tokenizer-independent unit is **bits-per-byte (BPB)**:

    $$\text{BPB} = \frac{\text{total bits over the corpus}}{\text{total bytes of the raw text}} = \frac{\ln 2^{-1}\sum_t \mathcal{L}_t \cdot (\#\text{tokens})}{\#\text{bytes}}.$$

    Because the *number of bits to encode a fixed string is a property of the string and the model, not of the tokenization*, BPB lets you put a byte-level model, a BPE model, and gzip on one axis. This is exactly the source-coding bound of 2A applied to text, and it is how the "Language Modeling Is Compression" results (§4) are reported.

    > [Cover & Thomas Ch 5](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) on codelength and entropy; [MacKay Ch 6](https://www.inference.org.uk/itprnn/book.pdf) on predictive coding; Shannon's 1951 [*Prediction and Entropy of Printed English*](https://archive.org/details/bstj30-1-50) first measured the entropy rate of text this way.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        # A toy "corpus" of next-token predictions: for each position we have
        # the model's predicted distribution and the token that actually occurred.
        _rng = np.random.default_rng(0)
        _V = 12          # vocab size
        _T = 5000        # positions
        # a "true" distribution over tokens (the source), and a model that is
        # close but imperfect.
        _true = _rng.random(_V) ** 2
        _true /= _true.sum()
        _model = 0.8 * _true + 0.2 * (np.ones(_V) / _V)   # smoothed -> wrong

        _tokens = _rng.choice(_V, size=_T, p=_true)

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float); p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        # cross-entropy = average -log2 q(actual token)
        _nll_bits = float(np.mean(-np.log2(_model[_tokens])))
        _nll_nats = _nll_bits * np.log(2)

        _H = entropy(_true)                       # irreducible floor
        _ce = entropy(_true, 2) + float(np.sum(_true * np.log2(_true / _model)))

        print("=== LLM loss IS cross-entropy ===")
        print(f"  vocab V = {_V},  positions T = {_T}")
        print(f"  empirical loss   = {_nll_bits:.4f} bits/token  = {_nll_nats:.4f} nats/token")
        print(f"  analytic H(p,q)  = {_ce:.4f} bits/token   (matches empirical loss)")
        print(f"  entropy H(p)     = {_H:.4f} bits/token   (irreducible floor)")
        print(f"  KL D(p||q)       = {_ce - _H:.4f} bits/token   (wrongness the model can still remove)")
        print("\n  Lowering the loss = shrinking D(p||q). It can never go below H(p).")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ---

    ## 2. Perplexity: The Effective Branching Factor

    Loss in bits is the natural information-theoretic unit, but the language-modeling community usually reports **perplexity**, which you first met in 1C and 2A. It is simply the cross-entropy exponentiated:

    $$\text{PPL} = 2^{H(p,\,q_\theta)} = \exp\!\big(\text{nats-loss}\big).$$

    Perplexity has a clean meaning: it is the **effective number of equally-likely choices** the model faces at each step — the *branching factor* of the prediction. A model with perplexity 20 on English is, on average, as uncertain as if it had to guess uniformly among 20 tokens at every position. Perfect prediction gives perplexity 1 (no uncertainty); a uniform guess over a vocabulary of size $V$ gives perplexity $V$ (maximal uncertainty).

    Because $2^x$ is monotonically increasing, *minimizing loss and minimizing perplexity are the same optimization* — perplexity just lives on a more interpretable scale. And the floor follows the loss floor: no model can get perplexity below $2^{H(p)}$, the effective branching factor of the language itself. Shannon's 1951 experiments estimated the entropy of printed English at roughly 1 bit per character, i.e. an effective per-character branching factor near 2 — a number modern character-level models have been steadily pushing down toward.

    The demo shows perplexity as the exponentiated cross-entropy for a sweep of model qualities, from random guessing to near-perfect.

    > [MacKay Ch 6](https://www.inference.org.uk/itprnn/book.pdf) and [Cover & Thomas Ch 4](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) on entropy rate; perplexity is the standard LM metric built on exactly that quantity.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(1)
        _V = 50
        _true = _rng.random(_V); _true /= _true.sum()

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float); p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        print("=== Perplexity = 2^(cross-entropy) = effective branching factor ===")
        print(f"  vocab V = {_V}\n")
        print(f"  {'model quality':>22} | {'loss (bits)':>11} | {'perplexity':>11}")
        # interpolate model from uniform (bad) to true (perfect)
        _uniform = np.ones(_V) / _V
        for _label, _mix in [("uniform guess (worst)", 0.0),
                             ("weak", 0.25),
                             ("decent", 0.6),
                             ("strong", 0.9),
                             ("near-perfect", 0.999)]:
            _q = (1 - _mix) * _uniform + _mix * _true
            _ce = float(np.sum(_true * np.log2(_true / _q))) + entropy(_true)
            print(f"  {_label:>22} | {_ce:11.4f} | {2 ** _ce:11.3f}")
        print(f"\n  floor: H(p) = {entropy(_true):.4f} bits  ->  min perplexity 2^H = {2 ** entropy(_true):.3f}")
        print(f"  ceiling: uniform over V gives perplexity = V = {_V}")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ---

    ## 3. Scaling Laws Are Compression Curves

    When you train bigger models on more data, the cross-entropy loss does not fall erratically — it follows a strikingly clean **power law**. Kaplan et al. (2020) and the Chinchilla paper (Hoffmann et al., 2022) fit the test loss as

    $$L(N) \;=\; \underbrace{E}_{\text{irreducible}} \;+\; \frac{A}{N^{\alpha}},$$

    where $N$ is the number of parameters (or, in other forms, the data tokens $D$ or the compute $C$), and $\alpha$ is a small positive exponent. The term $A/N^{\alpha}$ is the **reducible loss** — the part you buy down with scale — and it decays as a straight line on a log-log plot. The constant $E$ is the **irreducible loss**: the asymptote no amount of scale can beat.

    Read this through 6A. The loss is cross-entropy $H(p) + D(p\|q_\theta)$. Scaling shrinks the model-wrongness $D(p\|q_\theta) \to 0$ as the reducible term $A/N^\alpha$; what is left, $E$, is the **entropy rate $H(p)$ of text itself** (1C) — the genuine, irreducible uncertainty of language, the same floor that caps perplexity in §2. *Scaling laws are empirical measurements of how fast a model's KL divergence to the language closes, asymptoting at the language's own entropy rate.* That is why a scaling-law plot is, quite literally, a compression curve: bits-per-token versus model size, bottoming out at the source's entropy.

    Chinchilla's refinement adds the data axis, $L(N, D) = E + A/N^\alpha + B/D^\beta$, and derives the **compute-optimal** rule that parameters and tokens should grow in roughly equal proportion — the famous "train smaller models on more data" correction to Kaplan's original recipe. Both are the same information-theoretic statement: spend compute where it removes the most KL per FLOP.

    The widget below lets you set the irreducible floor $E$, the coefficient $A$, and the exponent $\alpha$, and plots the power law on log-log axes. Watch the curve flatten onto the floor $E$ — the entropy rate — no matter how large $N$ grows.

    > [Kaplan et al., *Scaling Laws for Neural Language Models* (arXiv:2001.08361)](https://arxiv.org/abs/2001.08361); [Hoffmann et al., *Training Compute-Optimal Large Language Models* — "Chinchilla" (arXiv:2203.15556)](https://arxiv.org/abs/2203.15556). The irreducible floor is the entropy rate of [Cover & Thomas Ch 4](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X).
    """)
    return


@app.cell
def _(mo):
    floor_E = mo.ui.slider(start=0.5, stop=2.5, step=0.05, value=1.0,
                           label="E = irreducible loss (entropy rate, bits/token)")
    coef_A = mo.ui.slider(start=2.0, stop=40.0, step=1.0, value=15.0,
                          label="A = reducible-loss coefficient")
    exp_alpha = mo.ui.slider(start=0.02, stop=0.30, step=0.01, value=0.08,
                             label="α = scaling exponent")
    mo.vstack([floor_E, coef_A, exp_alpha])
    return coef_A, exp_alpha, floor_E


@app.cell
def _(coef_A, exp_alpha, floor_E):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _E = floor_E.value
        _A = coef_A.value
        _alpha = exp_alpha.value

        _N = np.logspace(5, 11, 400)          # 1e5 .. 1e11 parameters
        _L = _E + _A / _N ** _alpha
        _reducible = _A / _N ** _alpha

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(11.5, 4.4))

        _ax1.plot(_N, _L, lw=2.2, color="steelblue", label="L(N) = E + A/N^α")
        _ax1.axhline(_E, color="crimson", ls="--", lw=1.6,
                     label=f"irreducible floor E = {_E:.2f}\n(entropy rate H(p))")
        _ax1.set_xscale("log")
        _ax1.set_xlabel("model size N (parameters)")
        _ax1.set_ylabel("test loss (bits/token)")
        _ax1.set_title("Scaling law: loss vs model size")
        _ax1.set_ylim(0, _E + _A / 1e5 ** _alpha * 1.05)
        _ax1.legend(loc="upper right", fontsize=9)
        _ax1.grid(True, which="both", alpha=0.3)

        # the reducible part is a clean straight line on log-log
        _ax2.plot(_N, _reducible, lw=2.2, color="darkorange")
        _ax2.set_xscale("log")
        _ax2.set_yscale("log")
        _ax2.set_xlabel("model size N (parameters)")
        _ax2.set_ylabel("reducible loss  A/N^α  =  D(p‖q)")
        _ax2.set_title(f"Reducible loss is a power law (slope = -α = -{_alpha:.2f})")
        _ax2.grid(True, which="both", alpha=0.3)

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np

        # Fit a power law to synthetic "measured" losses and recover E, A, alpha.
        _E_true, _A_true, _alpha_true = 1.10, 18.0, 0.085
        _rng = np.random.default_rng(2)
        _N = np.logspace(6, 10, 9)
        _L = _E_true + _A_true / _N ** _alpha_true
        _L = _L * (1 + 0.01 * _rng.standard_normal(_L.shape))   # 1% noise

        # If E were known, log(L - E) is linear in log(N): slope -alpha, intercept log A.
        # Grid-search E (the floor), then linear-fit the rest.
        _best = None
        for _E in np.linspace(0.6, 1.6, 201):
            _resid = _L - _E
            if np.any(_resid <= 0):
                continue
            _x = np.log(_N); _y = np.log(_resid)
            _slope, _intercept = np.polyfit(_x, _y, 1)
            _pred = _E + np.exp(_intercept) * _N ** _slope
            _sse = float(np.sum((_pred - _L) ** 2))
            if _best is None or _sse < _best[0]:
                _best = (_sse, _E, -_slope, float(np.exp(_intercept)))

        _, _Efit, _alphafit, _Afit = _best
        print("=== Fitting a scaling law L(N) = E + A/N^alpha ===")
        print(f"  {'param':>8} | {'true':>9} | {'recovered':>9}")
        print(f"  {'E':>8} | {_E_true:9.3f} | {_Efit:9.3f}")
        print(f"  {'A':>8} | {_A_true:9.3f} | {_Afit:9.3f}")
        print(f"  {'alpha':>8} | {_alpha_true:9.3f} | {_alphafit:9.3f}")
        print("\n  The recovered floor E is the model's estimate of the text entropy rate H(p):")
        print("  the loss you can never beat, no matter how much compute you pour in.")

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ---

    ## 4. Language Modeling *Is* Compression (the centerpiece)

    Here is the deepest connection in this module, and the one you can run end-to-end. Delétang et al. (2023), *Language Modeling Is Compression*, make the equivalence explicit: **any probabilistic next-symbol predictor, paired with the arithmetic coder of 2C, is a lossless compressor**, and its expected codelength is exactly the model's cross-entropy.

    You already proved both halves of this in earlier modules. From 2C: arithmetic coding spends $-\log_2 q(s\mid\text{context})$ bits on symbol $s$, to within a 2-bit total overhead, for *any* probability model — and the model may change between symbols as long as encoder and decoder update identically from the shared past. From 6A: the expected value of $-\log_2 q$ under the true source is the cross-entropy $H(p, q)$. Put them together:

    $$\mathbb{E}_{x\sim p}\big[\text{codelength}\big] \;=\; \mathbb{E}_{x\sim p}\Big[\textstyle\sum_t -\log_2 q_\theta(x_t\mid x_{<t})\Big] \;=\; T\cdot H(p, q_\theta).$$

    A better language model (lower cross-entropy) is **literally** a better compressor (fewer bits), and a perfect model reaches the entropy floor $H(p)$. There is no daylight between "predict the next token well" and "compress text well" — they are the *same problem*. Delétang et al. push this so far they run the equivalence backwards too: a strong predictor + arithmetic coder beats general-purpose compressors like gzip on text, and the same machine even compresses images and audio.

    **Build it.** Below we implement the whole thing in pure numpy: an **adaptive character-level $n$-gram model** (an order-$k$ context model with Laplace counts — exactly the adaptive idea from 2C §6, now conditioned on the previous $k$ characters), driving an **integer arithmetic coder with renormalization** (the 2C §7 coder). Type any text and the demo:

    1. compresses it and reports **bits/char**,
    2. verifies a perfect **round-trip** (decompress == original),
    3. compares against **zlib** (the stdlib's gzip engine, an LZ77 + Huffman compressor — see 2D), and against the **unigram entropy** floor of the text.

    The $n$-gram model is a *toy* stand-in for the transformer: same coder, weaker predictor. Raise the order and watch bits/char fall — better prediction, better compression — the entire thesis of the paper, demonstrated on your own keyboard.

    > [Delétang et al., *Language Modeling Is Compression* (arXiv:2309.10668)](https://arxiv.org/abs/2309.10668); the coder is from [MacKay Ch 6](https://www.inference.org.uk/itprnn/book.pdf), the equivalence from [Cover & Thomas Ch 5](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X).
    """)
    return


@app.cell
def _(mo):
    llm_text = mo.ui.text_area(
        value=("the quick brown fox jumps over the lazy dog. "
               "the quick brown fox jumps over the lazy dog. "
               "information theory is the science of compression and communication. "
               "better prediction is better compression: they are the same problem."),
        label="text to compress (try repetitive vs. random text)",
        full_width=True,
    )
    ngram_order = mo.ui.slider(start=0, stop=4, step=1, value=2,
                               label="n-gram context order k (0 = unigram)")
    mo.vstack([llm_text, ngram_order])
    return llm_text, ngram_order


@app.cell
def _(llm_text, ngram_order):
    def _run():
        import numpy as np
        import zlib

        # ---------- the adaptive n-gram model + arithmetic coder ----------
        _PREC = 32
        _FULL = 1 << _PREC
        _HALF = _FULL >> 1
        _QTR = _FULL >> 2
        _THREE_QTR = 3 * _QTR
        _MASK = _FULL - 1
        _TOTAL_FREQ = 1 << 16

        class NGramModel:
            # order-k adaptive model over a fixed alphabet, Laplace(alpha) counts
            def __init__(self, alphabet, order=1, alpha=1.0):
                self.alphabet = alphabet
                self.K = len(alphabet)
                self.idx = {c: i for i, c in enumerate(alphabet)}
                self.order = order
                self.alpha = alpha
                self.tables = {}
                self.context = ()

            def _counts(self, ctx):
                if ctx not in self.tables:
                    self.tables[ctx] = np.full(self.K, self.alpha, dtype=np.float64)
                return self.tables[ctx]

            def freqs(self):
                _c = self._counts(self.context)
                _p = _c / _c.sum()
                _f = np.maximum(1, np.floor(_p * _TOTAL_FREQ).astype(np.int64))
                _f[int(np.argmax(_f))] += _TOTAL_FREQ - int(_f.sum())
                _cum = np.zeros(self.K + 1, dtype=np.int64)
                _cum[1:] = np.cumsum(_f)
                return _cum, int(_cum[-1])

            def update(self, ch):
                self._counts(self.context)[self.idx[ch]] += 1.0
                if self.order > 0:
                    self.context = (self.context + (ch,))[-self.order:]

        def _encode(text, model):
            _low, _high, _pending, _out = 0, _MASK, 0, []
            for _ch in text:
                _cum, _tot = model.freqs()
                _i = model.idx[_ch]
                _rng = _high - _low + 1
                _high = _low + (_rng * int(_cum[_i + 1])) // _tot - 1
                _low = _low + (_rng * int(_cum[_i])) // _tot
                while True:
                    if _high < _HALF:
                        _out.append(0); _out.extend([1] * _pending); _pending = 0
                    elif _low >= _HALF:
                        _out.append(1); _out.extend([0] * _pending); _pending = 0
                        _low -= _HALF; _high -= _HALF
                    elif _low >= _QTR and _high < _THREE_QTR:
                        _pending += 1; _low -= _QTR; _high -= _QTR
                    else:
                        break
                    _low = (_low << 1) & _MASK
                    _high = ((_high << 1) & _MASK) | 1
                model.update(_ch)
            _pending += 1
            if _low < _QTR:
                _out.append(0); _out.extend([1] * _pending)
            else:
                _out.append(1); _out.extend([0] * _pending)
            return _out

        def _decode(bits, n, model):
            _buf = list(bits) + [0] * (_PREC + 2)
            _pos = 0
            _code = 0
            for _ in range(_PREC):
                _code = (_code << 1) | _buf[_pos]; _pos += 1
            _low, _high, _out = 0, _MASK, []
            for _ in range(n):
                _cum, _tot = model.freqs()
                _rng = _high - _low + 1
                _val = ((_code - _low + 1) * _tot - 1) // _rng
                _i = int(np.searchsorted(_cum, _val, side="right") - 1)
                _i = max(0, min(model.K - 1, _i))
                _ch = model.alphabet[_i]
                _out.append(_ch)
                _high = _low + (_rng * int(_cum[_i + 1])) // _tot - 1
                _low = _low + (_rng * int(_cum[_i])) // _tot
                while True:
                    if _high < _HALF:
                        pass
                    elif _low >= _HALF:
                        _low -= _HALF; _high -= _HALF; _code -= _HALF
                    elif _low >= _QTR and _high < _THREE_QTR:
                        _low -= _QTR; _high -= _QTR; _code -= _QTR
                    else:
                        break
                    _low = (_low << 1) & _MASK
                    _high = ((_high << 1) & _MASK) | 1
                    _code = ((_code << 1) & _MASK) | _buf[_pos]; _pos += 1
                model.update(_ch)
            return "".join(_out)

        def _unigram_entropy(text):
            _chars = sorted(set(text))
            _counts = np.array([text.count(c) for c in _chars], dtype=float)
            _p = _counts / _counts.sum()
            return float(-np.sum(_p * np.log2(_p)))

        # ---------- run on the user's text ----------
        _text = llm_text.value
        if len(_text) < 2 or len(set(_text)) < 2:
            _text = "information theory is compression"
        _order = int(ngram_order.value)
        _alpha = 0.1 if _order >= 2 else 1.0

        _alphabet = sorted(set(_text))
        _enc_model = NGramModel(_alphabet, order=_order, alpha=_alpha)
        _bits = _encode(_text, _enc_model)
        _dec_model = NGramModel(_alphabet, order=_order, alpha=_alpha)
        _back = _decode(_bits, len(_text), _dec_model)

        _bpc = len(_bits) / len(_text)
        _z = zlib.compress(_text.encode("utf-8"), 9)
        _zbpc = len(_z) * 8 / len(_text)
        _H1 = _unigram_entropy(_text)

        print("=== Language modeling IS compression ===")
        print(f"  text length          : {len(_text)} chars, alphabet {len(_alphabet)}")
        print(f"  n-gram order k        : {_order}  (Laplace alpha = {_alpha})")
        print(f"  ROUND-TRIP exact     : {_back == _text}")
        print()
        print(f"  {'method':>26} | {'bits/char':>9}")
        print(f"  {'raw UTF-8':>26} | {len(_text.encode('utf-8')) * 8 / len(_text):9.4f}")
        print(f"  {'unigram entropy (floor)':>26} | {_H1:9.4f}")
        print(f"  {'zlib (LZ77+Huffman, 2D)':>26} | {_zbpc:9.4f}")
        print(f"  {'adaptive n-gram + AC':>26} | {_bpc:9.4f}   <-- our coder")
        print()
        if _order == 0:
            print("  Order-0 tracks the unigram entropy floor (plus a little learning cost).")
        else:
            print(f"  Order-{_order} conditions on the previous {_order} char(s): better prediction,")
            print("  fewer bits. Raise the order to watch bits/char fall.")
        print("  zlib wins on long verbatim repeats (LZ matching); the n-gram model")
        print("  wins on short / less-repetitive text (no block overhead). A real LLM,")
        print("  with a huge learned context, beats both.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    The plot below sweeps the context order on a fixed sample and shows bits/char falling as the model conditions on more history — the compression-equals-prediction curve in miniature, with zlib and the unigram floor drawn in for reference.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        import zlib
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _TOTAL_FREQ = 1 << 16

        def _bits_for_order(text, order, alpha):
            # cost-only adaptive n-gram (no coder needed for the *expected* bits):
            # sum of -log2 p(char | context) under the running counts == coder length.
            _alphabet = sorted(set(text))
            _K = len(_alphabet)
            _idx = {c: i for i, c in enumerate(_alphabet)}
            _tables = {}
            _ctx = ()
            _bits = 0.0
            for _ch in text:
                if _ctx not in _tables:
                    _tables[_ctx] = np.full(_K, alpha, dtype=np.float64)
                _c = _tables[_ctx]
                _p = _c[_idx[_ch]] / _c.sum()
                _bits += -np.log2(_p)
                _c[_idx[_ch]] += 1.0
                if order > 0:
                    _ctx = (_ctx + (_ch,))[-order:]
            return _bits / len(text)

        _sample = ("information theory is the science of compression and "
                   "communication. a good model assigns high probability to what "
                   "actually happens, and arithmetic coding turns that probability "
                   "directly into a number of bits. better prediction is better "
                   "compression. ") * 3

        _orders = [0, 1, 2, 3, 4]
        _bpc = [_bits_for_order(_sample, _o, 0.1 if _o >= 2 else 1.0) for _o in _orders]

        _chars = sorted(set(_sample))
        _cnt = np.array([_sample.count(c) for c in _chars], dtype=float)
        _pp = _cnt / _cnt.sum()
        _H1 = float(-np.sum(_pp * np.log2(_pp)))
        _z = zlib.compress(_sample.encode("utf-8"), 9)
        _zbpc = len(_z) * 8 / len(_sample)

        _fig, _ax = plt.subplots(figsize=(7.8, 4.4))
        _ax.plot(_orders, _bpc, "o-", lw=2.2, color="steelblue",
                 label="adaptive n-gram + arithmetic coder")
        _ax.axhline(_H1, color="crimson", ls="--", alpha=0.7,
                    label=f"unigram entropy floor = {_H1:.2f}")
        _ax.axhline(_zbpc, color="darkorange", ls=":", alpha=0.9,
                    label=f"zlib (LZ77+Huffman) = {_zbpc:.2f}")
        _ax.set_xlabel("n-gram context order k")
        _ax.set_ylabel("bits / char")
        _ax.set_xticks(_orders)
        _ax.set_title("Better prediction = better compression")
        _ax.legend(loc="upper right", fontsize=9)
        _ax.grid(True, alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    > **Why the order-0 cost slightly exceeds the unigram entropy:** the entropy floor assumes you *already know* the symbol frequencies. The adaptive coder must *learn* them on the fly from Laplace-smoothed counts, paying extra on the early symbols — exactly the adaptive-model behavior you saw in 2C §6. As the text grows, the gap shrinks. A model that is *given* the true distribution would hit the floor.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Sampling Temperature Is Entropy Control

    Once trained, an LLM produces logits $z_1, \dots, z_V$ at each step and you turn them into a distribution with a **temperature-scaled softmax** (the softmax-as-maxent of 6A, with a knob):

    $$q_T(i) = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)}.$$

    Temperature $T$ is a direct dial on the **entropy** of the sampling distribution — i.e. on how much uncertainty (and diversity) you allow into generation:

    - $T \to 0$: the distribution collapses onto the single most-likely token (**greedy / argmax**). Entropy $\to 0$, effective vocabulary $\to 1$. Deterministic, repetitive, "safe."
    - $T = 1$: you sample from the model's *actual* learned distribution. Entropy = the model's predictive entropy.
    - $T \to \infty$: the logits wash out toward **uniform**. Entropy $\to \log_2 V$ (maximal), effective vocabulary $\to V$. Maximally random, incoherent.

    The natural information-theoretic readout is the **perplexity of the sampling distribution**, $2^{H(q_T)}$ — by §2, the *effective vocabulary*: the number of tokens the model is genuinely choosing among at this step. Raising $T$ raises entropy raises effective vocabulary; lowering $T$ does the reverse. This is the same entropy-as-uncertainty quantity from 1A and the same maximum-entropy/temperature relationship Jaynes' principle predicts (6A) — heating a distribution toward uniform is heating it toward maximum entropy.

    The widget sweeps $T$ over a fixed set of logits and reports the resulting entropy and effective vocabulary, with the distribution drawn out so you can watch it sharpen and flatten.

    > [Cover & Thomas Ch 2 & 12](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) (entropy, maximum entropy); the temperature–entropy link is the softmax-as-maxent story from 6A.
    """)
    return


@app.cell
def _(mo):
    temperature = mo.ui.slider(start=0.05, stop=3.0, step=0.05, value=1.0,
                               label="sampling temperature T")
    temperature
    return (temperature,)


@app.cell
def _(temperature):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        # a fixed, illustrative set of next-token logits
        _rng = np.random.default_rng(4)
        _V = 16
        _logits = np.sort(_rng.normal(scale=2.2, size=_V))[::-1]

        _T = temperature.value

        def _softmax_T(z, T):
            _zz = z / T
            _zz = _zz - _zz.max()
            _e = np.exp(_zz)
            return _e / _e.sum()

        _q = _softmax_T(_logits, _T)
        _H = float(-np.sum(_q[_q > 0] * np.log2(_q[_q > 0])))
        _eff_vocab = 2 ** _H
        _Hmax = np.log2(_V)

        # entropy vs T curve
        _Ts = np.linspace(0.05, 3.0, 200)
        _Hs = []
        for _t in _Ts:
            _qt = _softmax_T(_logits, _t)
            _Hs.append(-np.sum(_qt[_qt > 0] * np.log2(_qt[_qt > 0])))
        _Hs = np.array(_Hs)

        _fig, (_a1, _a2) = plt.subplots(1, 2, figsize=(11.5, 4.4))

        _a1.bar(np.arange(_V), _q, color="mediumpurple", alpha=0.85)
        _a1.set_xlabel("token index (sorted by logit)")
        _a1.set_ylabel("sampling probability")
        _a1.set_ylim(0, 1.0)
        _a1.set_title(f"q_T at T={_T:.2f}   H={_H:.2f} bits   eff. vocab={_eff_vocab:.2f}")
        _a1.grid(True, axis="y", alpha=0.3)

        _a2.plot(_Ts, _Hs, lw=2.2, color="teal")
        _a2.scatter([_T], [_H], color="crimson", zorder=5, s=70)
        _a2.axhline(_Hmax, color="gray", ls="--", alpha=0.7,
                    label=f"max H = log2 V = {_Hmax:.2f} (T→∞, uniform)")
        _a2.axhline(0.0, color="black", ls=":", alpha=0.5,
                    label="H = 0 (T→0, greedy)")
        _a2.set_xlabel("temperature T")
        _a2.set_ylabel("entropy of q_T (bits)")
        _a2.set_title("Temperature controls output entropy")
        _a2.legend(loc="lower right", fontsize=8)
        _a2.grid(True, alpha=0.3)

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(4)
        _V = 16
        _logits = np.sort(_rng.normal(scale=2.2, size=_V))[::-1]

        def _softmax_T(z, T):
            _zz = z / T; _zz -= _zz.max()
            _e = np.exp(_zz)
            return _e / _e.sum()

        def _entropy(p):
            p = p[p > 0]
            return float(-np.sum(p * np.log2(p)))

        print("=== Temperature as an entropy / effective-vocabulary dial ===")
        print(f"  vocab V = {_V},  max entropy log2 V = {np.log2(_V):.3f} bits\n")
        print(f"  {'T':>6} | {'entropy (bits)':>14} | {'eff. vocab 2^H':>14} | {'top-token p':>11}")
        for _T in [0.1, 0.5, 1.0, 1.5, 2.0, 5.0]:
            _q = _softmax_T(_logits, _T)
            _H = _entropy(_q)
            print(f"  {_T:6.1f} | {_H:14.3f} | {2 ** _H:14.3f} | {_q.max():11.3f}")
        print("\n  T->0: entropy->0, eff. vocab->1 (greedy).  "
              "T->inf: entropy->log2 V, eff. vocab->V (uniform).")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Two More Rate Tricks: Tokenization and Speculative Decoding

    Two pieces of the LLM stack are pure information theory in disguise.

    ### Tokenization is dictionary coding (BPE ≈ LZ)

    Before text reaches the model it is **tokenized** — chopped into subword units by **Byte-Pair Encoding (BPE)** or its cousins. BPE starts from bytes and *greedily merges the most frequent adjacent pair* into a new symbol, over and over, building a dictionary of common chunks ("ing", "tion", " the"). That is precisely the **dictionary-coding** idea of 2D: Lempel-Ziv also builds a dictionary of frequently-seen substrings and replaces them with shorter references. BPE is, in effect, a *frequency-driven, fixed-vocabulary LZ* run once as a preprocessing pass. It pre-compresses text into denser units so the model spends its probability budget on meaningful chunks rather than individual bytes — which is exactly why per-token loss is not comparable across tokenizers and why we needed bits-per-byte in §1. The dictionary does part of the compression; the model does the rest.

    ### Speculative decoding is a rate trick

    Generating one token normally costs one forward pass of the big model. **Speculative decoding** cuts that cost without changing the output distribution at all. A small, cheap **draft model** proposes a short run of $k$ candidate tokens; the big **target model** then scores all $k$ in a *single* parallel forward pass and accepts the longest prefix consistent with its own distribution, via a rejection-sampling test. Accepted tokens were effectively generated for free (the big model only had to *verify*, not *search*), so each expensive forward pass yields several tokens instead of one.

    The information-theoretic punchline: the acceptance test is calibrated so that **the tokens emitted are distributed exactly as if sampled from the target model alone** — the algorithm is provably distribution-preserving. The draft model is a low-rate side channel that proposes; the target model is the high-rate authority that verifies. You pay full price (and full quality) only where the draft and target disagree, and you save compute everywhere they already agree — a clean rate/compute trade with zero distortion to the sampled distribution. It is the same spirit as the verify-cheaply, correct-rarely structure that runs all through coding theory.

    > [Cover & Thomas Ch 13](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) on Lempel-Ziv and universal coding (the BPE analogy); the distribution-preserving property of speculative decoding is a rejection-sampling argument in the style of [MacKay Ch 29](https://www.inference.org.uk/itprnn/book.pdf).
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        # ---- BPE-style greedy pair merging on a tiny corpus (the 2D idea) ----
        _text = "the theory of the theme is there in the theater"
        _tokens = list(_text)
        _vocab0 = len(set(_tokens))
        _merges = []
        for _ in range(6):
            _pairs = {}
            for _a, _b in zip(_tokens[:-1], _tokens[1:]):
                _pairs[(_a, _b)] = _pairs.get((_a, _b), 0) + 1
            if not _pairs:
                break
            _best = max(_pairs, key=_pairs.get)
            if _pairs[_best] < 2:
                break
            _merged = _best[0] + _best[1]
            _merges.append((_best, _pairs[_best]))
            _new = []
            _i = 0
            while _i < len(_tokens):
                if _i < len(_tokens) - 1 and (_tokens[_i], _tokens[_i + 1]) == _best:
                    _new.append(_merged); _i += 2
                else:
                    _new.append(_tokens[_i]); _i += 1
            _tokens = _new

        print("=== BPE = greedy dictionary coding (the LZ idea of 2D) ===")
        print(f"  text: {_text!r}")
        print(f"  start: {len(list(_text))} byte-tokens, {_vocab0} distinct symbols")
        for _pair, _freq in _merges:
            print(f"    merge {_pair[0]!r}+{_pair[1]!r}  (seen {_freq}x)  ->  {(_pair[0]+_pair[1])!r}")
        print(f"  after merges: {len(_tokens)} tokens  ->  {_tokens}")
        print("  Frequent chunks become single tokens, exactly like an LZ dictionary entry.")

        # ---- speculative decoding: acceptance test is distribution-preserving ----
        print("\n=== Speculative decoding leaves the target distribution unchanged ===")
        _rng = np.random.default_rng(7)
        _V = 8
        _target = _rng.random(_V); _target /= _target.sum()
        _draft = _rng.random(_V); _draft /= _draft.sum()

        # standard speculative sampling for ONE token:
        # propose x ~ draft; accept w.p. min(1, target[x]/draft[x]);
        # on reject, sample from the normalized positive residual (target-draft)_+.
        _N = 200_000
        _emitted = np.zeros(_V, dtype=np.int64)
        _resid = np.maximum(_target - _draft, 0.0)
        _resid = _resid / _resid.sum()
        for _ in range(_N):
            _x = _rng.choice(_V, p=_draft)
            if _rng.random() < min(1.0, _target[_x] / _draft[_x]):
                _emitted[_x] += 1
            else:
                _emitted[_rng.choice(_V, p=_resid)] += 1
        _emp = _emitted / _N

        print(f"  target distribution : {np.round(_target, 3)}")
        print(f"  draft  distribution : {np.round(_draft, 3)}")
        print(f"  emitted (empirical) : {np.round(_emp, 3)}")
        print(f"  max |emitted-target|: {np.max(np.abs(_emp - _target)):.4f}  (-> 0: provably exact)")
        print("  The cheap draft proposes, the target verifies; the SAMPLED distribution")
        print("  is identical to sampling the target alone — fewer big-model passes, zero distortion.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    This module is the cash-out of the whole course for the systems you actually use:

    - **The loss is cross-entropy; the floor is the entropy rate.** Every LLM minimizes $H(p, q_\theta) = H(p) + D(p\|q_\theta)$ (6A). Training removes the KL term; the irreducible $H(p)$ is the entropy rate of language (1C). Report it as bits-per-byte and you can compare any two models — or a model and gzip — on one axis.
    - **Perplexity is the branching factor.** $2^{\text{loss}}$ is the effective number of choices per step (1C, 2A). Lower loss, lower perplexity, lower compressed size — three views of one number.
    - **Scaling laws are compression curves.** $L(N)=E+A/N^\alpha$ measures how fast $D(p\|q_\theta)$ closes with scale, asymptoting at the entropy floor $E$. Chinchilla's compute-optimal rule is "spend FLOPs where they remove the most KL."
    - **Prediction = compression, exactly.** A next-token model + arithmetic coder (2C) is a lossless compressor whose length is the cross-entropy. "Better model" and "better compressor" are the same sentence — which is why a strong LM beats gzip, and why MDL (6B) treats learning *as* compression.
    - **Temperature is entropy control.** Sampling at temperature $T$ is a dial on the output distribution's entropy and effective vocabulary, straight from softmax-as-maxent (6A). Tokenization is dictionary coding (2D); speculative decoding is a rate/compute trade that preserves the distribution.

    You have now traced one equation — codelength equals negative log-probability — from Shannon's 1948 source-coding theorem, through Huffman and arithmetic coding, all the way to the loss function of a frontier language model. The machine is bigger; the information theory is the same. From here, **7A (the Study Guide)** collects every theorem and algorithm in the course into one filterable reference.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. Each exercise gives a spec and a skeleton — fill in the blanks. Together they rebuild the information-theoretic core of an LLM: the loss, perplexity, the scaling-law floor, the compressor, and the temperature dial.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Cross-Entropy Loss and Bits-per-Byte

    Given a list of predicted next-token distributions and the tokens that actually occurred, compute the average cross-entropy loss in bits/token. Then, given the number of raw bytes the tokens encode, convert to bits-per-byte. Confirm the loss never falls below the entropy of the token stream.
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
        V, T = 10, 2000
        true_p = rng.random(V); true_p /= true_p.sum()
        model_q = 0.7 * true_p + 0.3 * np.ones(V) / V
        tokens = rng.choice(V, size=T, p=true_p)
        n_bytes = 3500   # say the corpus is 3500 raw bytes

        def loss_bits_per_token(q, tokens):
            # TODO: average of -log2 q[token] over all positions
            return ...

        def bits_per_byte(q, tokens, n_bytes):
            # TODO: (loss_bits_per_token * num_tokens) / n_bytes
            return ...

        # print("loss bits/token:", loss_bits_per_token(model_q, tokens))
        # print("bits/byte      :", bits_per_byte(model_q, tokens, n_bytes))
        # floor: -sum true_p log2 true_p  -- the loss should sit above it
        # H = -np.sum(true_p[true_p>0]*np.log2(true_p[true_p>0])); print("H(p):", H)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Perplexity = Effective Branching Factor

    Implement `perplexity(loss_bits)` $= 2^{\text{loss}}$. Confirm that (a) a perfect model (loss $\to 0$) gives perplexity 1, and (b) a uniform guess over $V$ tokens (loss $= \log_2 V$) gives perplexity exactly $V$.
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

        def perplexity(loss_bits):
            # TODO: 2 ** loss_bits
            return ...

        V = 32
        # print(perplexity(0.0))            # expect 1.0  (perfect model)
        # print(perplexity(np.log2(V)))     # expect 32.0 (uniform over V)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: The Irreducible Floor of a Scaling Law

    For the power law $L(N) = E + A/N^\alpha$, the limit as $N \to \infty$ is the irreducible loss $E$ — the entropy rate. Implement `scaling_loss(N, E, A, alpha)` and verify that for large $N$ the loss approaches $E$ from above, and that the *reducible* part $L(N) - E$ halves when $N$ grows by a factor of $2^{1/\alpha}$.
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

        def scaling_loss(N, E, A, alpha):
            # TODO: E + A / N**alpha
            return ...

        E, A, alpha = 1.0, 20.0, 0.1
        # for N in [1e6, 1e8, 1e10, 1e12]:
        #     print(N, scaling_loss(N, E, A, alpha))   # approaches E=1.0
        # factor = 2 ** (1/alpha)
        # r1 = scaling_loss(1e6, E, A, alpha) - E
        # r2 = scaling_loss(1e6 * factor, E, A, alpha) - E
        # print("reducible halves:", r1 / r2)          # expect ~2.0

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: An Adaptive Compressor (Prediction = Compression)

    Build the *cost side* of the language-modeling-is-compression demo without the coder: an adaptive order-$k$ character model with Laplace counts. Before coding each char, charge $-\log_2 p(\text{char}\mid\text{context})$ using the current counts, then update. Return total bits / length. Confirm bits/char falls as you raise the order on repetitive text, and that order 0 sits near the unigram entropy.
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

        def adaptive_bits_per_char(text, order, alpha=1.0):
            alphabet = sorted(set(text))
            idx = {c: i for i, c in enumerate(alphabet)}
            tables = {}
            ctx = ()
            total_bits = 0.0
            for ch in text:
                if ctx not in tables:
                    tables[ctx] = np.full(len(alphabet), alpha)
                counts = tables[ctx]
                # TODO: p = counts[idx[ch]] / counts.sum(); total_bits += -log2(p)
                ...
                # TODO: counts[idx[ch]] += 1
                # TODO: if order>0: ctx = (ctx + (ch,))[-order:]
            return total_bits / len(text)

        text = "abcabcabcabcabcabcabcabcabc" * 4
        # for k in [0, 1, 2, 3]:
        #     print(k, adaptive_bits_per_char(text, k, 0.1))   # falls as k rises

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Temperature Controls Entropy

    Implement `softmax_with_temperature(logits, T)` and `entropy(p)` (bits). For a fixed set of logits, verify that entropy *increases monotonically* with $T$, approaching $\log_2 V$ as $T \to \infty$, and approaching $0$ (a single spike) as $T \to 0$.
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

        def softmax_with_temperature(logits, T):
            # TODO: z = logits / T; subtract max for stability; exp; normalize
            return ...

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float); p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        logits = np.array([3.0, 1.0, 0.5, -1.0, -2.0])
        V = len(logits)
        # for T in [0.1, 0.5, 1.0, 2.0, 10.0]:
        #     print(T, entropy(softmax_with_temperature(logits, T)))
        # entropy should rise with T, approaching log2(V) = {:.3f}.format(np.log2(V))

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    # Course navigation cell
    mo.md(
        r"""
    ---

    [&#8593; Course home](../) &nbsp;|&nbsp; &#8592; Prev: [6E: Rate-Distortion, VAEs & Neural Compression](../6e_vae_compression/) &nbsp;|&nbsp; Next: [7A: Algorithm & Theorem Study Guide](../7a_study_guide/) &#8594;
    """
    )
    return


if __name__ == "__main__":
    app.run()
