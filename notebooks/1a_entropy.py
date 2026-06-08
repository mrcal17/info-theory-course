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
    # 1A: Entropy & Self-Information

    > *"Information is the resolution of uncertainty."*
    > — Claude Shannon

    Welcome to information theory. Everything in this course grows from a single, almost suspiciously simple idea: **information is the reduction of uncertainty**, and uncertainty can be measured in *bits*. Get this one module right and the rest of the course — compression, channel capacity, error-correcting codes, the information-theoretic view of machine learning — is built on solid ground.

    You already know probability cold, so I am not going to re-explain random variables or expectation. Instead I am going to take those tools and use them to answer a question that sounds philosophical but turns out to be perfectly concrete: *how much information does an event carry?* By the end you will have a formula, a unit, and the intuition to feel why both are inevitable.

    We build three quantities in Part 1 — entropy (this module), relative entropy and mutual information (1B), and the entropy rate (1C). They run the entire field. Let us start with the most fundamental: the **entropy** of a single random variable.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Information Is the Resolution of Uncertainty

    Here is the whole subject in one game. I am thinking of a number between 1 and 16. You ask yes/no questions; I answer truthfully. How many questions do you need to *guarantee* you find it?

    The answer is 4 — if you ask well. "Is it ≤ 8?" splits 16 possibilities into 8. "Is it ≤ 4 (within those)?" splits 8 into 4. Then 4 into 2, then 2 into 1. Each good question **halves the uncertainty**, and $16 = 2^4$, so 4 questions suffice.

    That number 4 is not arbitrary. It is $\log_2 16$. The number of yes/no questions — *bits* — needed to pin down one of $N$ equally likely possibilities is $\log_2 N$. A bit is exactly "the amount of information in the answer to one well-posed yes/no question."

    Now flip the framing. Before you ask anything, the answer "it's 11" carries some quantity of information — precisely the uncertainty it resolves. The rarer or more surprising the outcome, the more information learning it gives you. That is the seed of *everything*. Our job in this module is to turn "surprise" into a number.

    > [Stone Ch 1](file:///C:/Users/landa/info-theory-course/textbooks/Stone.pdf) opens with exactly this 20-questions intuition — a perfect gentle first read.
    > [MacKay Ch 1](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) motivates bits and information from communication.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Self-Information: Measuring Surprise

    We want a function $h(x)$ — the **self-information** (or *surprisal*) of an outcome $x$ — that turns its probability $p(x)$ into a number of bits. What should it obey?

    1. **Rarer is more surprising.** If $p(x)$ is small, $h(x)$ should be large. So $h$ decreases in $p$.
    2. **Certainty carries no information.** If $p(x) = 1$, then $h(x) = 0$ — you learned nothing you did not already know.
    3. **Independent surprises add.** If $x$ and $y$ are independent, learning both should give $h(x,y) = h(x) + h(y)$. But probabilities *multiply* for independent events: $p(x,y) = p(x)\,p(y)$.

    The only function that turns multiplication into addition is the logarithm. Those three requirements force a unique answer (up to the choice of log base):

    $$h(x) = \log_2 \frac{1}{p(x)} = -\log_2 p(x)$$

    **Units.** The base of the log is just a unit of measurement:

    - $\log_2 \to$ **bits** (the default in this course)
    - $\ln \to$ **nats** (natural log; common in ML and physics)
    - $\log_{10} \to$ **hartleys** / dits

    **Worked examples.**

    - A fair coin landing heads: $p = \tfrac12$, so $h = -\log_2 \tfrac12 = 1$ bit. One coin flip = one bit. Of course.
    - Rolling a 6 on a fair die: $p = \tfrac16$, so $h = \log_2 6 \approx 2.585$ bits.
    - A guaranteed event: $p = 1$, so $h = 0$ bits.
    - Drawing the ace of spades from a shuffled deck: $p = \tfrac{1}{52}$, so $h = \log_2 52 \approx 5.70$ bits.

    > [MacKay Ch 2](file:///C:/Users/landa/info-theory-course/textbooks/MacKay.pdf) and [Cover & Thomas Ch 2](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) develop self-information and entropy together.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def self_information(p, base=2):
            return -np.log(p) / np.log(base)

        print("=== Self-information (surprisal), in bits ===")
        for _name, _p in [
            ("fair coin = heads", 1 / 2),
            ("fair die = 6", 1 / 6),
            ("certain event", 1.0),
            ("ace of spades", 1 / 52),
            ("1-in-a-million", 1e-6),
        ]:
            print(f"  {_name:22s}  p={_p:<10.6g}  h = {self_information(_p):6.3f} bits")

        print("\nIndependent surprises add: rolling a 6 then a 6")
        _h_one = self_information(1 / 6)
        _h_both = self_information(1 / 36)
        print(f"  h(6) + h(6) = {_h_one:.3f} + {_h_one:.3f} = {2 * _h_one:.3f} bits")
        print(f"  h(6 and 6)  = {_h_both:.3f} bits   (equal — log turns x into +)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Entropy: The Average Surprise

    Self-information measures a *single* outcome. But a random variable $X$ produces many possible outcomes. How surprised should we expect to be *on average*? Take the expectation of the self-information:

    $$H(X) = \mathbb{E}[h(X)] = \sum_{x} p(x)\,\log_2 \frac{1}{p(x)} = -\sum_{x} p(x)\,\log_2 p(x)$$

    This is the **entropy** of $X$ — the single most important quantity in the course. Read it as the *average number of bits needed to describe one outcome of $X$*, or equivalently the *average number of well-posed yes/no questions* to identify the outcome. (By convention $0 \log 0 = 0$, since impossible outcomes contribute nothing.)

    **Worked examples.**

    - **Fair coin:** $H = -\tfrac12\log_2\tfrac12 - \tfrac12\log_2\tfrac12 = 1$ bit.
    - **Biased coin, $p = 0.9$:** $H = -0.9\log_2 0.9 - 0.1\log_2 0.1 \approx 0.469$ bits. *Less* than 1 — a predictable coin carries less information per flip.
    - **Fair die:** $H = \log_2 6 \approx 2.585$ bits.
    - **English text:** with real letter frequencies, $H \approx 4.1$ bits per letter — well below the $\log_2 27 \approx 4.75$ bits you would need if all letters (plus space) were equally likely. That gap is *exactly* why text compresses.

    The code below computes entropy from a probability vector and then measures the entropy of English from letter frequencies.

    > [Cover & Thomas Ch 2.1](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) is the canonical definition; [Stone Ch 2](file:///C:/Users/landa/info-theory-course/textbooks/Stone.pdf) gives the gentle version.
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

        print("=== Entropy H(X), in bits ===")
        print(f"  fair coin            H = {entropy([0.5, 0.5]):.4f}")
        print(f"  biased coin p=0.9    H = {entropy([0.9, 0.1]):.4f}")
        print(f"  fair die             H = {entropy([1/6]*6):.4f}  (log2 6 = {np.log2(6):.4f})")
        print(f"  certain outcome      H = {entropy([1.0, 0.0]):.4f}")

        _freq = {
            'e': 12.7, 't': 9.1, 'a': 8.2, 'o': 7.5, 'i': 7.0, 'n': 6.7, 's': 6.3,
            'h': 6.1, 'r': 6.0, 'd': 4.3, 'l': 4.0, 'c': 2.8, 'u': 2.8, 'm': 2.4,
            'w': 2.4, 'f': 2.2, 'g': 2.0, 'y': 2.0, 'p': 1.9, 'b': 1.5, 'v': 0.98,
            'k': 0.77, 'j': 0.15, 'x': 0.15, 'q': 0.095, 'z': 0.074,
        }
        _p = np.array(list(_freq.values()))
        _p = _p / _p.sum()
        print("\n=== English letters (26, no space) ===")
        print(f"  actual frequencies   H = {entropy(_p):.4f} bits/letter")
        print(f"  if uniform           H = {np.log2(26):.4f} bits/letter")
        print(f"  redundancy gap       ~ {np.log2(26) - entropy(_p):.4f} bits/letter  <- why text compresses")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. The Binary Entropy Function

    The most important special case is a single bit with $P(1) = p$. Its entropy is the **binary entropy function**:

    $$H_2(p) = -p\log_2 p - (1-p)\log_2(1-p)$$

    Drag the slider to set $p$ and watch where you land on the curve. Notice three things: it is **0 at $p=0$ and $p=1$** (a coin that always does the same thing tells you nothing), it is **maximized at $p = \tfrac12$** (a fair coin is maximally uncertain, $H_2 = 1$ bit), and it is **symmetric** about $\tfrac12$ (calling heads "0" or "1" cannot change the information).
    """)
    return


@app.cell
def _(mo):
    coin_bias = mo.ui.slider(start=0.0, stop=1.0, step=0.01, value=0.5, label="p = P(heads)")
    coin_bias
    return (coin_bias,)


@app.cell
def _(coin_bias):
    def _run():
        import numpy as np
        import matplotlib.pyplot as plt

        def _h2(p):
            out = np.zeros_like(p)
            _m = (p > 0) & (p < 1)
            out[_m] = -p[_m] * np.log2(p[_m]) - (1 - p[_m]) * np.log2(1 - p[_m])
            return out

        _p = coin_bias.value
        _ps = np.linspace(0, 1, 501)
        _curve = _h2(_ps)
        _hp = 0.0 if _p in (0.0, 1.0) else -_p * np.log2(_p) - (1 - _p) * np.log2(1 - _p)

        _fig, _ax = plt.subplots(figsize=(7, 4))
        _ax.plot(_ps, _curve, lw=2, color="steelblue")
        _ax.scatter([_p], [_hp], color="red", zorder=5, s=60)
        _ax.axvline(_p, color="red", ls="--", alpha=0.4)
        _ax.annotate(f"H2({_p:.2f}) = {_hp:.3f} bits", xy=(_p, _hp),
                     xytext=(0.5, 0.3), textcoords="axes fraction",
                     arrowprops=dict(arrowstyle="->", color="red", alpha=0.6))
        _ax.set_xlabel("p = P(heads)")
        _ax.set_ylabel("entropy (bits)")
        _ax.set_title("Binary entropy function")
        _ax.grid(True, alpha=0.3)
        _ax.set_ylim(-0.02, 1.05)
        plt.tight_layout()
        _fig

    _run()
    return


@app.cell
def _(mo):
    mo.image(src="../animations/rendered/EntropySurprise.gif")
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Joint and Conditional Entropy

    Real problems involve several random variables at once. Two definitions extend entropy to pairs, and one beautiful identity ties them together.

    **Joint entropy** — the uncertainty in $(X, Y)$ taken together:

    $$H(X, Y) = -\sum_{x, y} p(x, y)\,\log_2 p(x, y)$$

    **Conditional entropy** — the uncertainty left in $Y$ *after* you learn $X$, averaged over $X$:

    $$H(Y \mid X) = \sum_{x} p(x)\,H(Y \mid X = x) = -\sum_{x, y} p(x, y)\,\log_2 p(y \mid x)$$

    **The chain rule.** These are not independent definitions — they satisfy

    $$H(X, Y) = H(X) + H(Y \mid X)$$

    In words: the total uncertainty in the pair equals the uncertainty in $X$ plus whatever uncertainty remains in $Y$ once $X$ is known. It generalizes to any number of variables, and it is the discrete-information echo of the probability chain rule $p(x,y) = p(x)\,p(y\mid x)$ you already know. Conditioning can only *reduce* (or leave unchanged) entropy: $H(Y \mid X) \le H(Y)$ — **information never hurts**, on average. We will prove that inequality properly in 1B once we have mutual information.

    > [Cover & Thomas Ch 2.2–2.5](file:///C:/Users/landa/info-theory-course/textbooks/CoverThomas.pdf) covers joint/conditional entropy and the chain rule in full.
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

        _joint = np.array([
            [1 / 8, 1 / 16, 1 / 16, 1 / 4],
            [1 / 16, 1 / 8, 1 / 16, 0],
            [1 / 32, 1 / 32, 1 / 16, 0],
            [1 / 32, 1 / 32, 1 / 16, 0],
        ])
        print(f"sum of joint = {_joint.sum():.3f}  (must be 1)")

        _px = _joint.sum(axis=1)
        _py = _joint.sum(axis=0)

        _H_X = entropy(_px)
        _H_Y = entropy(_py)
        _H_XY = entropy(_joint.ravel())

        _H_Y_given_X = _H_XY - _H_X

        print(f"\nH(X)      = {_H_X:.4f} bits")
        print(f"H(Y)      = {_H_Y:.4f} bits")
        print(f"H(X,Y)    = {_H_XY:.4f} bits")
        print(f"H(Y|X)    = H(X,Y) - H(X) = {_H_Y_given_X:.4f} bits")
        print(f"\nChain rule check: H(X) + H(Y|X) = {_H_X + _H_Y_given_X:.4f}  ==  H(X,Y) = {_H_XY:.4f}")
        print(f"Information never hurts: H(Y|X) = {_H_Y_given_X:.4f}  <=  H(Y) = {_H_Y:.4f}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. The Properties That Make Entropy Inevitable

    Three properties pin entropy down and get used constantly:

    1. **Non-negativity:** $H(X) \ge 0$. Each term $p\log_2\tfrac1p \ge 0$. You can never have negative uncertainty.
    2. **Maximum at uniform:** for an alphabet of size $N$, $H(X) \le \log_2 N$, with equality **iff** $X$ is uniform. Maximum uncertainty = "no outcome preferred." This is the seed of the *maximum-entropy principle* (Module 6A).
    3. **Concavity:** $H$ is a concave function of the distribution $p$. Mixing distributions never decreases entropy — averaging adds uncertainty.

    Pick a distribution below and compare its entropy to the uniform ceiling $\log_2 N$. No matter what you choose, you cannot beat uniform.
    """)
    return


@app.cell
def _(mo):
    dist_choice = mo.ui.dropdown(
        options=["Uniform", "Slightly peaked", "Very peaked", "Near-deterministic", "Two-mode"],
        value="Uniform",
        label="Distribution over 8 symbols",
    )
    dist_choice
    return (dist_choice,)


@app.cell
def _(dist_choice):
    def _run():
        import numpy as np
        import matplotlib.pyplot as plt

        _n = 8
        _choice = dist_choice.value
        if _choice == "Uniform":
            _p = np.ones(_n)
        elif _choice == "Slightly peaked":
            _p = np.array([3, 2, 2, 1.5, 1.5, 1, 1, 1], dtype=float)
        elif _choice == "Very peaked":
            _p = np.array([10, 3, 2, 1, 0.5, 0.5, 0.3, 0.2], dtype=float)
        elif _choice == "Near-deterministic":
            _p = np.array([50, 1, 1, 0.5, 0.5, 0.3, 0.2, 0.1], dtype=float)
        else:
            _p = np.array([6, 1, 0.3, 0.2, 0.2, 0.3, 1, 6], dtype=float)
        _p = _p / _p.sum()

        _H = float(-np.sum(_p[_p > 0] * np.log2(_p[_p > 0])))
        _ceiling = np.log2(_n)

        _fig, _ax = plt.subplots(figsize=(7, 4))
        _ax.bar(np.arange(_n), _p, color="steelblue", alpha=0.8)
        _ax.set_xlabel("symbol")
        _ax.set_ylabel("probability")
        _ax.set_ylim(0, 1.0)
        _ax.set_title(f"H = {_H:.3f} bits      ceiling log2(8) = {_ceiling:.3f} bits      "
                      f"({100 * _H / _ceiling:.0f}% of max)")
        _ax.grid(True, axis="y", alpha=0.3)
        plt.tight_layout()
        _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(0)
        _n = 8
        _ceiling = np.log2(_n)
        _max_seen = 0.0
        for _ in range(200_000):
            _p = _rng.random(_n)
            _p = _p / _p.sum()
            _H = float(-np.sum(_p[_p > 0] * np.log2(_p[_p > 0])))
            _max_seen = max(_max_seen, _H)
        print(f"Best entropy found over 200,000 random distributions: {_max_seen:.5f} bits")
        print(f"Uniform ceiling log2(8)                              : {_ceiling:.5f} bits")
        print("No random distribution ever beats uniform — as the theorem promises.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 7. Why This Matters for Machine Learning

    Entropy is not a museum piece — it is wired into the tools you already use:

    - **Cross-entropy loss.** The standard classification loss is literally an entropy-family quantity. Training a classifier minimizes the cross-entropy between the true labels and the model's predicted distribution — we will see in 1B and 6A that this is the same as minimizing a KL divergence, and that the irreducible part of that loss *is* the label entropy.
    - **Decision trees.** ID3, C4.5, and friends choose each split to maximize **information gain** — the drop in entropy $H(Y) - H(Y \mid \text{split})$. That conditional entropy is exactly the quantity from Section 5.
    - **Maximum-entropy modeling.** Logistic regression and softmax classifiers are the maximum-entropy distributions consistent with their feature constraints (Module 6A). "Assume the least" = "maximize entropy."
    - **Exploration in RL.** Policy-gradient methods add an *entropy bonus* to keep the policy from collapsing too early — high entropy = keep exploring.
    - **Compression.** Entropy is the hard floor on lossless compression (the source coding theorem, Module 2A). The English-text gap you measured in Section 3 is precisely the room a compressor has to work in.

    Next up, **Module 1B** introduces *relative entropy* (KL divergence) and *mutual information* — the tools that measure the distance between distributions and the information one variable carries about another. They turn the single-variable picture here into the full machinery the rest of the course runs on.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the math-to-code translation for every concept in this module.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Entropy from Scratch

    Implement `entropy(p)` returning bits. Handle zero-probability entries (recall $0\log 0 = 0$). Test it on a fair coin (expect 1.0), a fair die (expect $\log_2 6 \approx 2.585$), and a certain outcome (expect 0.0).
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            # TODO: drop zero entries, then compute -sum p*log(p)/log(base)
            _result = ...
            return _result

        # print(entropy([0.5, 0.5]))      # expect 1.0
        # print(entropy([1/6]*6))         # expect ~2.585
        # print(entropy([1.0, 0.0]))      # expect 0.0

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Surprisal of a Rare Event

    You draw one card from a shuffled 52-card deck. Compute the self-information (in bits) of (a) drawing the ace of spades, and (b) drawing any spade. Which is more surprising, and by how many bits?
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        # TODO: probabilities of each event
        p_ace_spades = ...
        p_any_spade = ...

        # TODO: self-information h = -log2(p)
        h_ace_spades = ...
        h_any_spade = ...

        # print(f"ace of spades: {h_ace_spades:.3f} bits")   # expect ~5.700
        # print(f"any spade:     {h_any_spade:.3f} bits")    # expect 2.000

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Entropy of Real Text

    Given a string, estimate its per-character entropy from the empirical character frequencies. Try it on a repetitive string (low entropy) and on a varied one (higher entropy).
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np
        from collections import Counter

        def text_entropy(s):
            # TODO: count characters, convert to a probability vector, return entropy in bits
            _counts = ...
            _p = ...
            return ...

        # print(text_entropy("aaaaaaaaaa"))                 # expect 0.0
        # print(text_entropy("abcdefgh"))                   # expect 3.0 (8 equally likely)
        # print(text_entropy("the quick brown fox"))        # somewhere in between

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Conditional Entropy & the Chain Rule

    Given the joint distribution below, compute $H(X)$, $H(X,Y)$, and $H(Y\mid X)$ directly from their definitions, then verify the chain rule $H(X,Y) = H(X) + H(Y\mid X)$.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        joint = np.array([
            [0.10, 0.20, 0.05],
            [0.05, 0.30, 0.05],
            [0.05, 0.05, 0.10],
        ])  # rows = X, cols = Y, sums to 1

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        # TODO: marginal p(x) by summing over Y
        px = ...

        # TODO: H(X), H(X,Y)
        H_X = ...
        H_XY = ...

        # TODO: H(Y|X) = H(X,Y) - H(X)
        H_Y_given_X = ...

        # print(f"H(X)={H_X:.4f}, H(X,Y)={H_XY:.4f}, H(Y|X)={H_Y_given_X:.4f}")
        # print("chain rule holds:", np.isclose(H_XY, H_X + H_Y_given_X))

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Uniform Maximizes Entropy

    Confirm the maximum-entropy property empirically. For an alphabet of size $N=5$, sample many random probability vectors, compute each entropy, and check that none exceeds $\log_2 5$ — and that the closest ones are nearly uniform.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        rng = np.random.default_rng(1)
        N = 5
        ceiling = np.log2(N)

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        # TODO: sample 100,000 random distributions over N symbols (hint: rng.random(N) then normalize)
        # TODO: track the maximum entropy seen and the distribution that achieved it
        best_H = ...
        best_p = ...

        # print(f"max H found = {best_H:.5f}  vs  log2(5) = {ceiling:.5f}")
        # print(f"argmax distribution ~ uniform? {np.round(best_p, 3)}")

    _run()
    return


if __name__ == "__main__":
    app.run()
