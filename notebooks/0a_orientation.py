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
    # 0A: Orientation & Notation

    > *"The fundamental problem of communication is that of reproducing at one point either exactly or approximately a message selected at another point."*
    > — Claude Shannon, *A Mathematical Theory of Communication* (1948)

    Welcome. You are about to learn the theory that says exactly how much a message can be squeezed, exactly how fast you can talk across a noisy wire without errors, and exactly what "information" even means as a measurable, physical quantity. It is one of the most beautiful and unreasonably useful theories in all of science — and it is built almost entirely out of one idea you can hold in your head: **a bit is the answer to one well-posed yes/no question.**

    This page is not a lecture. It is a one-page orientation: what information theory *is*, the single unit everything is measured in, the three big things we will build, and the notation we will use so nothing trips you up later. The real teaching starts in **Module 1A** with entropy. Consider this the map you glance at before the hike.

    I am going to assume you are comfortable with probability — random variables, expectations, conditional probability, independence. If any of that feels rusty, that is fine, but it belongs to your probability prerequisites rather than here. This course spends its energy on what you can *do* with probability once you decide to measure surprise in bits.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. What Information Theory Is

    In 1948 Claude Shannon asked a question that sounds almost too simple to be deep: *how much information is in a message?* Not "is the message important" or "is it true" — those are about meaning, and Shannon deliberately threw meaning away. He asked something narrower and answerable: **how much uncertainty does the message resolve?**

    That single move — measuring information as *resolved uncertainty* — turned a vague word into a quantity with units, theorems, and hard limits. Out of it fall results that look like physics:

    - **There is a hard floor on compression.** No lossless compressor can beat the *entropy* of a source asymptotically, on average, though finite blocks have overhead. (Part 2)
    - **There is a hard ceiling on communication.** Every noisy channel has a *capacity* — a maximum rate below which vanishing-error communication is possible with long codes, and above which it is impossible. (Part 3)
    - **The two are duals.** Compression removes redundancy; error-correction adds it back on purpose. Same mathematics, run in opposite directions. (Parts 2-4)

    Information theory is the study of these limits and of the codes that approach them. Once you see it, you see it everywhere: in `gzip` and JPEG, in your phone's 5G modem, in the QR code on a boarding pass, in the cross-entropy loss your neural net minimizes, and in the deep learning theory that tries to explain *why* that net generalizes.

    > [Stone Ch 1](https://arxiv.org/pdf/1802.05968) is the gentlest possible on-ramp — read it first if you want a story before the symbols.
    > [MacKay Ch 1](https://www.inference.org.uk/itprnn/book.pdf) frames the whole field around a single channel-coding puzzle.
    > [Polyanskiy & Wu Ch 1](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf) sets the modern notation we will lean on.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The Bit: One Yes/No Question

    Here is the entire foundation in one game. I am thinking of one of $N$ equally likely things — a number, a card, a word. You may ask yes/no questions; I answer truthfully. **How many questions do you need to guarantee you find it?**

    If you ask well, each question *halves* the set of possibilities. Start with $N$, then $N/2$, then $N/4$, ... until one remains. The number of halvings is $\log_2 N$:

    $$\text{questions needed} = \log_2 N \quad\text{bits.}$$

    A **bit** is exactly that: the amount of information in the answer to one well-posed yes/no question — equivalently, the information needed to choose between two equally likely options. Sixteen possibilities take $\log_2 16 = 4$ questions; a thousand take $\log_2 1000 \approx 9.97$, so ten questions suffice. This is why "20 questions" can pin down one of over a million things: $2^{20} \approx 1.05$ million.

    Notice the logarithm is not a decoration — it is *forced* once we ask for the usual regularity conditions: continuity/monotonicity plus additivity for independent choices. We want a measure where combining two independent situations **adds** their information (ask about a coin *and* a die: $1 + 2.585$ bits), while the number of joint possibilities **multiplies** ($2 \times 6 = 12$). Under those conditions the logarithm is the unique sensible measure, so $\log(\text{possibilities})$ is where the theory starts. The slider below lets you feel $\log_2 N$ directly.

    > [Stone Ch 1](https://arxiv.org/pdf/1802.05968) opens with this exact 20-questions picture.
    """)
    return


@app.cell
def _(mo):
    n_choices = mo.ui.slider(start=2, stop=1024, step=1, value=16, label="N = number of equally-likely possibilities")
    n_choices
    return (n_choices,)


@app.cell
def _(mo, n_choices):
    def _run():
        import numpy as np

        _N = int(n_choices.value)
        _bits = float(np.log2(_N))
        _whole = int(np.ceil(_bits - 1e-9))

        _summary = mo.md(
            f"""
            **N = {_N}** equally-likely possibilities

            - Information to pin one down: $\\log_2 {_N} = $ **{_bits:.3f} bits**
            - Yes/no questions that always suffice: $\\lceil \\log_2 {_N} \\rceil = $ **{_whole}**
            - Check: ${_whole}$ questions can distinguish up to $2^{{{_whole}}} = {2**_whole}$ things $\\ge {_N}$. ✓
            """
        )
        mo.output.replace(_summary)

    _run()
    return


@app.cell
def _(n_choices):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _N = int(n_choices.value)
        _bits = float(np.log2(_N))

        _ns = np.arange(2, 1025)
        _curve = np.log2(_ns)

        _fig, _ax = plt.subplots(figsize=(7, 4))
        _ax.plot(_ns, _curve, lw=2, color="steelblue", label=r"$\log_2 N$")
        _ax.scatter([_N], [_bits], color="red", zorder=5, s=70)
        _ax.axhline(_bits, color="red", ls="--", alpha=0.4)
        _ax.axvline(_N, color="red", ls="--", alpha=0.4)
        _ax.annotate(
            f"N={_N}\n{_bits:.2f} bits",
            xy=(_N, _bits),
            xytext=(0.55, 0.25),
            textcoords="axes fraction",
            arrowprops=dict(arrowstyle="->", color="red", alpha=0.6),
        )
        _ax.set_xlabel("N (equally-likely possibilities)")
        _ax.set_ylabel("information to identify one (bits)")
        _ax.set_title("Twenty Questions: bits = log2(N)")
        _ax.grid(True, alpha=0.3)
        _ax.legend(loc="upper left")
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np

        print("=== bits = log2(N) for some everyday N ===")
        for _name, _N in [
            ("coin (2 sides)", 2),
            ("die (6 faces)", 6),
            ("hex digit (16)", 16),
            ("byte value (256)", 256),
            ("card in a deck (52)", 52),
            ("day of the year (365)", 365),
            ("the '20 questions' limit (2^20)", 2 ** 20),
        ]:
            _bits = np.log2(_N)
            print(f"  {_name:32s}  N={_N:<8d}  log2(N) = {_bits:7.3f} bits   "
                  f"(>= {int(np.ceil(_bits))} questions)")

        print("\nIndependent situations: information ADDS while possibilities MULTIPLY")
        _coin, _die = np.log2(2), np.log2(6)
        print(f"  coin then die:  {_coin:.3f} + {_die:.3f} = {_coin + _die:.3f} bits")
        print(f"  joint outcomes: 2 * 6 = 12,  log2(12) = {np.log2(12):.3f} bits   (same number)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Log Bases & Units: Bits and Nats

    The choice of logarithm base is just a choice of *unit*, exactly like meters versus feet. The information is the same; only the number on the dial changes:

    | Base | Unit | Where you see it |
    |------|------|------------------|
    | $\log_2$ | **bit** (binary digit) | the course default; coding, compression, communication |
    | $\ln$ (base $e$) | **nat** | machine learning, statistics, physics — log-likelihoods are in nats |
    | $\log_{10}$ | **hartley** / dit / ban | early telephony; rare today |

    Converting between units is one multiplication, because $\log_b x = \log_a x / \log_a b$:

    $$1 \text{ nat} = \frac{1}{\ln 2} \text{ bits} \approx 1.4427 \text{ bits}, \qquad 1 \text{ bit} = \ln 2 \text{ nats} \approx 0.6931 \text{ nats}.$$

    **Why you should care.** Your ML code almost always works in nats — `torch.log`, `np.log`, and the cross-entropy loss are natural-log quantities, so a loss of "0.69" is *one bit* of average surprise on a binary problem (it is $\ln 2$). This course states results in **bits** because the operational meaning — *number of yes/no questions, number of binary symbols to transmit* — is cleanest there. When we connect to ML in Part 6 we will switch to nats and the only thing that changes is a factor of $\ln 2$. Keep both straight and you will never be off by a mysterious 1.4427.

    > [MacKay Ch 1](https://www.inference.org.uk/itprnn/book.pdf) uses bits throughout; [Polyanskiy & Wu Ch 1](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf) defaults to nats — a useful contrast to keep both in view.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def info(N, base):
            return np.log(N) / np.log(base)

        print("=== Same information, different units ===")
        print(f"{'N':>6} | {'bits (log2)':>12} | {'nats (ln)':>10} | {'hartleys (log10)':>16}")
        print("-" * 52)
        for _N in [2, 6, 8, 52, 256]:
            print(f"{_N:>6} | {info(_N, 2):>12.4f} | {info(_N, np.e):>10.4f} | {info(_N, 10):>16.4f}")

        print("\n=== The conversion constant ===")
        print(f"  1 nat = 1/ln2 bits = {1 / np.log(2):.4f} bits")
        print(f"  1 bit = ln2  nats  = {np.log(2):.4f} nats")
        print(f"  a cross-entropy loss of {np.log(2):.4f} nats == 1.000 bit of average surprise")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. The Three Pillars: A Roadmap

    Everything in this course hangs off three measures, built once and deeply in **Part 1**, then used relentlessly:

    - **Entropy $H(X)$** — the average surprise of a source, in bits. *How compressible is it?*
    - **Relative entropy $D(p\,\|\,q)$** (KL divergence) — how far one distribution is from another. *How wrong is your model?*
    - **Mutual information $I(X;Y)$** — how much one variable tells you about another. *How much got through?*

    From those three grow the **three pillars** this course is organized around:

    1. **Classical Core** *(Parts 1, 5)* — the measures themselves, the entropy rate of a source, the Asymptotic Equipartition Property, rate-distortion theory, and the bridge to statistics. The theorems that say what is *possible*.

    2. **Practical Coding** *(Parts 2, 3, 4)* — the algorithms that *achieve* those limits. Compression you can run (Huffman, arithmetic, Lempel-Ziv), channel capacity, and error-correcting codes from Hamming through LDPC and polar codes — the math inside every modem and storage device.

    3. **Information Theory for Machine Learning** *(Part 6)* — where it pays off for you: cross-entropy and maximum entropy, the Minimum Description Length principle, the Information Bottleneck, neural estimation of mutual information (MINE/InfoNCE), and the rate-distortion view of VAEs and neural compression.

    Here is the dependency spine in one breath: **0A (you are here) → 1 (the measures) → 2 (compression) and 3 (channels) → 4 (codes) → 5 (lossy + statistics) → 6 (ML)**, with a reference study guide in Part 7. You do not have to go in order after Part 1, but everything leans on Part 1, so we build it carefully.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Notation & Conventions

    A quick reference you can come back to. Nothing here is hard; agreeing on symbols now saves confusion later.

    | Symbol | Meaning |
    |--------|---------|
    | $X, Y, Z$ | random variables (capitals) |
    | $x, y, z$ | specific values they take (lowercase) |
    | $\mathcal{X}, \mathcal{Y}$ | alphabets — the set of values, with size $\lvert\mathcal{X}\rvert$ |
    | $p(x)$, $p_X(x)$ | probability mass function, $P(X = x)$ |
    | $p(x, y)$ | joint pmf; $p(y \mid x)$ conditional pmf |
    | $\mathbb{E}[\,\cdot\,]$ | expectation, $\mathbb{E}[f(X)] = \sum_x p(x) f(x)$ |
    | $\log$ | base-2 unless stated; $\ln$ is natural log |
    | $h(x) = -\log p(x)$ | self-information / surprisal of an outcome |
    | $H(X)$ | entropy; $H(X \mid Y)$ conditional, $H(X,Y)$ joint |
    | $D(p\,\|\,q)$ | relative entropy (KL divergence) |
    | $I(X;Y)$ | mutual information |
    | $x^n = (x_1,\dots,x_n)$ | a length-$n$ sequence / block |
    | $C$ | channel capacity (bits per channel use) |
    | $R$ | rate (bits per symbol); $R(D)$ rate-distortion function |

    **Notation licenses.** In the classical modules I mostly write entropy as $H(X)$ and KL as $D(p\|q)$. In the ML modules you will also see $H(p)$ for the entropy of an explicit distribution and $D_{\mathrm{KL}}(p\|q)$ when $D$ is already being used for distortion. The letter $T$ can mean a bottleneck representation or a critic function depending on the module; each local use is named before it is used.

    Three conventions worth burning in now:

    1. **$0 \log 0 = 0$.** Impossible outcomes contribute nothing to entropy. This is the right limit, since $p \log p \to 0$ as $p \to 0$, and it keeps every formula well-defined.
    2. **"$\log$" means $\log_2$** in this course unless we explicitly write $\ln$. Results are in **bits**.
    3. **Capitals are random, lowercase are fixed.** $H(X)$ is a number attached to the *distribution* of $X$; $h(x)$ depends on the *value* $x$. Mixing these up is the single most common early slip.

    The cell below turns these into running code so the symbols feel concrete.

    > [Polyanskiy & Wu Ch 1](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf) lays out essentially this notation; [Cover & Thomas Ch 2](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) is the citation backstop.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def self_information(p, base=2):
            return -np.log(p) / np.log(base)

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        print("=== Notation, made concrete (a fair die) ===")
        _p = np.full(6, 1 / 6)
        print(f"  alphabet X = {{1,...,6}},  |X| = {_p.size}")
        print(f"  p(x) = 1/6 for every x;  sum p(x) = {_p.sum():.3f}")
        print(f"  h(x) = -log2 p(x) = {self_information(1/6):.3f} bits for any single outcome")
        print(f"  H(X) = E[h(X)]    = {entropy(_p):.3f} bits   (= log2 6, since uniform)")

        print("\n=== The 0*log0 = 0 convention ===")
        _q = np.array([0.5, 0.5, 0.0, 0.0])
        print(f"  distribution {_q.tolist()}  ->  H = {entropy(_q):.3f} bits")
        print("  the two impossible outcomes add nothing — exactly as the convention promises.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. How to Use This Course

    A few practical notes so you get the most out of what follows:

    - **Read, then play, then build.** Each module has lecture sections, *live widgets* (drag the slider, watch the math move), and runnable demo cells. The demos are not decoration — they compute and *verify* the theorems on real numbers. Change them. Break them. That is the fastest way to internalize a result.
    - **Every module ends with "Code It" exercises.** Short skeletons with `TODO`s and expected answers in the comments. Do them. Information theory is a *constructive* subject — you do not understand entropy until you have written `-sum(p * log2(p))` and watched it equal the number you predicted.
    - **References are live public pointers where possible.** Throughout, blockquotes point to author PDFs, arXiv/OpenReview pages, publisher pages, or library metadata for the anchor texts and papers. Follow them when you want depth.
    - **Probability is assumed, not taught.** If a probability step feels shaky, that is a signal to revisit the probability prerequisites rather than a gap in this course.
    - **The path is flexible after Part 1, but not flat.** Build the three measures first; after that you can dive toward compression, channels, codes, or the gentler ML applications in 6A/6B. The later ML modules ramp up: 6C uses rate-distortion ideas from 5A, 6D is the Part-6 estimator capstone, and 6E leans on both 5A and the Gaussian channel in 3C.

    That is the whole orientation. Next stop: **Module 1A — Entropy & Self-Information**, where "surprise" stops being a feeling and becomes a number with a formula. See you there.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    You might wonder why a machine-learning practitioner should care about a 1948 communication theory. The honest answer: modern ML is *soaked* in information theory, usually without saying so out loud.

    - **Your loss function is an entropy.** Cross-entropy loss — the default for classification — is the average number of bits (well, nats) your model spends encoding the true labels. Minimizing it is minimizing a KL divergence between the truth and your prediction. That is Module 6A.
    - **"Bits" is the natural currency of model complexity.** The Minimum Description Length principle says the best model is the one that compresses the data shortest — Occam's razor with a number attached (Module 6B).
    - **Mutual information measures representation quality.** The Information Bottleneck frames learning as keeping the bits about the label while throwing away the rest, and contrastive objectives like InfoNCE are mutual-information lower bounds you can train on (Modules 6C, 6D).
    - **Generative models are compressors.** A VAE's ELBO is a rate-distortion tradeoff in disguise; neural compression makes that literal (Module 6E).

    Even if you only ever do ML, the vocabulary you build here — entropy, KL, mutual information, the bit — is the vocabulary your field already uses to talk about uncertainty, complexity, and what a model has actually learned. Getting it precise now pays off for the entire rest of the course.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Your turn. These are short — this is an orientation, not a full lecture — but they lock in the two ideas you must carry into Module 1A: **bits = log2(N)** and **unit conversion**. Fill in the `...` blanks; expected answers are in the trailing comments.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Bits to Identify One of N

    Write `bits_needed(N)` returning $\log_2 N$ — the information (in bits) to pin down one of $N$ equally likely possibilities. Then write `questions_needed(N)`, the number of yes/no questions that always suffice (round $\log_2 N$ *up*).
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

        def bits_needed(N):
            # TODO: return log base 2 of N
            return ...

        def questions_needed(N):
            # TODO: ceil of bits_needed(N), as an int
            return ...

        # print(bits_needed(16))        # expect 4.0
        # print(bits_needed(1000))      # expect ~9.966
        # print(questions_needed(1000)) # expect 10

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Bits and Nats

    The base of the log is a unit. Implement `bits_to_nats(b)` and `nats_to_bits(n)`. Recall $1 \text{ nat} = 1/\ln 2$ bits and $1 \text{ bit} = \ln 2$ nats.
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

        def bits_to_nats(b):
            # TODO: multiply by ln(2)
            return ...

        def nats_to_bits(n):
            # TODO: divide by ln(2)  (equivalently multiply by 1/ln2)
            return ...

        # print(nats_to_bits(1.0))   # expect ~1.4427
        # print(bits_to_nats(1.0))   # expect ~0.6931
        # print(nats_to_bits(np.log(2)))  # expect 1.0  (a 0.693-nat loss is 1 bit)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Information of an Outcome (Surprisal)

    Even though full self-information is a Module 1A topic, you can already write it: the surprisal of an outcome with probability $p$ is $h = -\log_2 p$ bits. Implement `surprisal(p)` and confirm a fair-coin flip carries 1 bit and a 1-in-1024 event carries 10 bits.
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

        def surprisal(p, base=2):
            # TODO: return -log_base(p)
            return ...

        # print(surprisal(0.5))      # expect 1.0
        # print(surprisal(1/1024))   # expect 10.0
        # print(surprisal(1.0))      # expect 0.0  (a sure thing is no surprise)

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Independent Surprises Add

    Information from independent situations adds, while the number of joint possibilities multiplies. For $N_1$ equally-likely options and an independent $N_2$ equally-likely options, verify that $\log_2 N_1 + \log_2 N_2 = \log_2(N_1 N_2)$.
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

        N1, N2 = 2, 6  # a coin and a die

        # TODO: bits for each separately, and bits for the joint outcome
        bits_1 = ...
        bits_2 = ...
        bits_joint = ...   # log2(N1 * N2)

        # print(bits_1, bits_2, bits_1 + bits_2)   # expect 1.0, 2.585, 3.585
        # print(bits_joint)                        # expect 3.585  (same)
        # print(np.isclose(bits_1 + bits_2, bits_joint))   # expect True

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Twenty Questions Sanity Check

    "20 questions" works because $2^{20}$ is over a million. For a given number of questions $q$, compute how many equally-likely things you can distinguish ($2^q$), and find the smallest $q$ that covers a target population (e.g. 8 billion people). Hint: invert with $\lceil \log_2(\text{target}) \rceil$.
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

        def distinguishable(q):
            # TODO: how many equally-likely things q yes/no questions can pin down
            return ...

        def min_questions_for(target):
            # TODO: smallest q with 2**q >= target  (ceil of log2)
            return ...

        # print(distinguishable(20))           # expect 1048576
        # print(min_questions_for(8e9))        # expect 33   (2**33 ~ 8.6e9)
        # print(distinguishable(min_questions_for(8e9)) >= 8e9)  # expect True

    _run()
    return


if __name__ == "__main__":
    app.run()
