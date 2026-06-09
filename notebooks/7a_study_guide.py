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
    # 7A: Algorithm & Theorem Study Guide

    > *"It is the theory that decides what can be observed."*
    > — Albert Einstein

    You have reached the end of the course, and you now carry a surprising amount of machinery: two dozen theorems and principles, a dozen algorithms, and a handful of channel codes, all stitched together by three core measures — entropy, relative entropy, and mutual information. This module is **not** a lecture. It is the map you wished you had on day one.

    Everything you built across Parts 0 through 6 is gathered here as a single **filterable catalogue**. Each entry has a name, a one-line statement, the key formula, the intuition in a sentence, and — most importantly — its *connections* to the rest of the course. Information theory is not a list of facts; it is a tightly woven web, and the connections are where understanding lives. The source coding theorem and the channel coding theorem are mirror images. Huffman, arithmetic, and LZ are three answers to the same question. KL divergence shows up in compression, in hypothesis testing, in the ELBO, and in the loss function of every classifier you will ever train.

    Use this module two ways. **As a study guide:** filter by Part to review one chunk at a time before a quiz, or filter by type to drill all the theorems, then all the algorithms. **As a reference:** when a later course or a paper mentions "Fano's inequality" or "reverse water-filling" or "the data-processing inequality," come back here, find the one-line statement and the formula, and follow the connections back to the module where you built it. The catalogue itself is a plain Python list of dicts at the bottom — read the data, and you will see the whole course in one screen.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. How the Catalogue Is Built

    Below, the entire course is encoded as a list of dictionaries. Each entry is one *named thing* — a theorem, a piece of source code (compressor / decompressor), a channel code, or an ML technique — with a fixed schema:

    | field | meaning |
    |-------|---------|
    | `name` | the canonical name you should be able to recall |
    | `part` | which Part (0–6) it lives in |
    | `module` | the module code, e.g. `1A`, `3B`, `6D` |
    | `kind` | one of `theorem`, `source code`, `channel code`, `ml` |
    | `statement` | a one-line plain-English statement |
    | `formula` | the key equation (LaTeX) |
    | `intuition` | the one-sentence "why it is true / why you care" |
    | `connects` | the other modules / ideas it links to |

    The next cell defines the catalogue and prints a summary so you can see the shape of the data. After that come the **filter widgets** — pick a Part and a type, and the table updates live. Everything is driven off this one list, exactly the way a real reference tool would be.

    > This module synthesizes the whole course. For the source texts behind any single entry, follow that entry's home module; the four anchors are
    > [MacKay](https://www.inference.org.uk/itprnn/book.pdf),
    > [Stone](https://arxiv.org/pdf/1802.05968),
    > [Cover & Thomas](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X), and
    > [Polyanskiy & Wu](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf).
    """)
    return


@app.cell
def _():
    def build_catalogue():
        return [
            {
                "name": "Self-information (surprisal)",
                "part": 1, "module": "1A", "kind": "theorem",
                "statement": "The information content of an outcome is the log of one over its probability.",
                "formula": r"h(x) = \log_2 \tfrac{1}{p(x)} = -\log_2 p(x)",
                "intuition": "Rarer outcomes are more surprising; log is the only function making independent surprises add.",
                "connects": "Averaged over X gives entropy (1A); base of log sets the unit (bits/nats).",
            },
            {
                "name": "Entropy",
                "part": 1, "module": "1A", "kind": "theorem",
                "statement": "Average surprise of a random variable; the cost in bits to describe one outcome.",
                "formula": r"H(X) = -\sum_x p(x)\log_2 p(x)",
                "intuition": "Maximized by the uniform distribution, zero for a sure thing.",
                "connects": "Floor for source coding (2A); 0<=H<=log N; feeds MI (1B) and entropy rate (1C).",
            },
            {
                "name": "Joint & conditional entropy / chain rule",
                "part": 1, "module": "1A", "kind": "theorem",
                "statement": "Uncertainty in a pair splits into one variable plus the leftover in the other.",
                "formula": r"H(X,Y) = H(X) + H(Y\mid X)",
                "intuition": "Conditioning never increases entropy: information never hurts on average.",
                "connects": "Mirror of the probability chain rule; underlies MI (1B) and Slepian-Wolf (5C).",
            },
            {
                "name": "Binary entropy function",
                "part": 1, "module": "1A", "kind": "theorem",
                "statement": "Entropy of a single biased bit as a function of its bias.",
                "formula": r"H_2(p) = -p\log_2 p - (1-p)\log_2(1-p)",
                "intuition": "A concave bump: 0 at the ends, peaks at 1 bit when p=1/2.",
                "connects": "Capacity of the BSC is 1 - H_2(f) (3A); shows up everywhere a bit is flipped.",
            },
            {
                "name": "Relative entropy (KL divergence)",
                "part": 1, "module": "1B", "kind": "theorem",
                "statement": "The extra bits paid for coding with the wrong distribution q instead of the true p.",
                "formula": r"D(p\,\|\,q) = \sum_x p(x)\log_2\tfrac{p(x)}{q(x)} \ge 0",
                "intuition": "Always non-negative (Gibbs), zero iff p=q, but asymmetric — not a distance.",
                "connects": "Cross-entropy loss (6A), MDL (6B), Sanov & Stein (5B), the engine of the whole course.",
            },
            {
                "name": "Mutual information",
                "part": 1, "module": "1B", "kind": "theorem",
                "statement": "How many bits knowing one variable tells you about another.",
                "formula": r"I(X;Y) = H(X) - H(X\mid Y) = D\big(p(x,y)\,\|\,p(x)p(y)\big)",
                "intuition": "The overlap in the I-diagram; zero iff X and Y are independent.",
                "connects": "Channel capacity maximizes it (3A); IB (6C) and MINE (6D) estimate/optimize it.",
            },
            {
                "name": "Jensen-Shannon divergence & f-divergences",
                "part": 1, "module": "1B", "kind": "theorem",
                "statement": "A symmetric, always-finite divergence via the mixture m; KL/TV/chi^2 are all f-divergences.",
                "formula": r"\mathrm{JSD}(p,q) = \tfrac12 D(p\|m) + \tfrac12 D(q\|m),\ m=\tfrac{p+q}{2}",
                "intuition": "Routing through the average bounds it to 1 bit; sqrt(JSD) is a true metric, unlike KL.",
                "connects": "Fixes KL's asymmetry/blow-up (1B); D_f>=0 from Jensen (1B); the GAN objective minimizes JSD (6E).",
            },
            {
                "name": "Data-processing inequality",
                "part": 1, "module": "1B", "kind": "theorem",
                "statement": "Post-processing cannot create information about the source.",
                "formula": r"X\to Y\to Z \;\Rightarrow\; I(X;Z) \le I(X;Y)",
                "intuition": "No clever function of the data recovers information the data did not contain.",
                "connects": "Converse proofs (3B), the IB Lagrangian (6C), generalization bounds.",
            },
            {
                "name": "Jensen's inequality",
                "part": 1, "module": "1B", "kind": "theorem",
                "statement": "For a convex function, the function of the mean is below the mean of the function.",
                "formula": r"f(\mathbb{E}[X]) \le \mathbb{E}[f(X)]\quad(f\text{ convex})",
                "intuition": "The workhorse behind D>=0, concavity of H, and the ELBO bound.",
                "connects": "Proves Gibbs (1B), the maxent ceiling (1A/6A), and the VAE ELBO (6E).",
            },
            {
                "name": "Entropy rate",
                "part": 1, "module": "1C", "kind": "theorem",
                "statement": "Per-symbol entropy of a stochastic process in the long run.",
                "formula": r"H(\mathcal{X}) = \lim_{n\to\infty}\tfrac1n H(X_1,\dots,X_n)",
                "intuition": "For a Markov chain it is the conditional entropy of the next symbol given the current state.",
                "connects": "The true compression floor for sources with memory (2D); generalizes H (1A).",
            },
            {
                "name": "Asymptotic equipartition property (AEP)",
                "part": 1, "module": "1C", "kind": "theorem",
                "statement": "For an i.i.d. source, long sequences are typical with high probability and nearly equiprobable.",
                "formula": r"-\tfrac1n\log_2 p(X^n) \to H(X)\ \text{in probability}",
                "intuition": "About 2^{nH} sequences carry essentially all the probability — the rest are negligible.",
                "connects": "The combinatorial heart of source coding (2A) and channel coding (3B).",
            },
            {
                "name": "Kraft inequality",
                "part": 2, "module": "2A", "kind": "theorem",
                "statement": "Codeword lengths of a prefix code fit in a fixed budget.",
                "formula": r"\sum_i 2^{-\ell_i} \le 1",
                "intuition": "Short codewords are expensive: each one rules out a whole subtree.",
                "connects": "Both necessary and sufficient for prefix codes; bounds source coding (2A).",
            },
            {
                "name": "Source coding theorem",
                "part": 2, "module": "2A", "kind": "theorem",
                "statement": "No uniquely decodable code can beat the entropy; Shannon codes get within one bit.",
                "formula": r"H(X) \le L^\star < H(X) + 1",
                "intuition": "Entropy is the hard floor on lossless compression — the dual of the channel theorem.",
                "connects": "Achieved tightly by Huffman (2B) and arithmetic coding (2C).",
            },
            {
                "name": "Shannon code",
                "part": 2, "module": "2A", "kind": "source code",
                "statement": "Assign each symbol a length equal to its rounded-up surprisal.",
                "formula": r"\ell_i = \lceil \log_2 \tfrac{1}{p_i}\rceil",
                "intuition": "Provably within 1 bit of entropy, but not optimal — Huffman does better.",
                "connects": "Proves the source coding upper bound (2A); baseline for Huffman (2B).",
            },
            {
                "name": "Huffman coding",
                "part": 2, "module": "2B", "kind": "source code",
                "statement": "Build the optimal prefix code by greedily merging the two least-likely symbols.",
                "formula": r"\text{merge } \arg\min_2 p \;\to\; \text{parent of weight } p_i+p_j",
                "intuition": "The provably optimal symbol code; its only flaw is the >=1 bit-per-symbol overhead.",
                "connects": "Beats Shannon (2A); block/extended Huffman shrinks the gap; arithmetic (2C) removes it.",
            },
            {
                "name": "Arithmetic / range coding",
                "part": 2, "module": "2C", "kind": "source code",
                "statement": "Code a whole message as a single interval on [0,1), narrowed symbol by symbol.",
                "formula": r"[\,\text{lo},\text{hi}) \leftarrow \text{subinterval of width } \prod_t p(x_t)",
                "intuition": "Achieves fractional bits per symbol, so it hits entropy with no per-symbol overhead.",
                "connects": "Beats Huffman's integer-length limit (2B); pairs with adaptive models; basis of ANS (6E).",
            },
            {
                "name": "Lempel-Ziv (LZ77/78/W)",
                "part": 2, "module": "2D", "kind": "source code",
                "statement": "Replace repeated substrings with pointers into a growing dictionary.",
                "formula": r"\text{rate}\to H(\mathcal{X})\ \text{without knowing }p",
                "intuition": "Universal: it learns the statistics on the fly and still reaches the entropy rate.",
                "connects": "Powers gzip/PNG/ZIP; reaches the entropy rate (1C) with no model given in advance.",
            },
            {
                "name": "Channel capacity",
                "part": 3, "module": "3A", "kind": "theorem",
                "statement": "The most information a channel can carry per use, over all input distributions.",
                "formula": r"C = \max_{p(x)} I(X;Y)",
                "intuition": "BSC: C=1-H_2(f); BEC: C=1-e. The ceiling no code can exceed.",
                "connects": "The target of the channel coding theorem (3B); computed by Blahut-Arimoto.",
            },
            {
                "name": "Blahut-Arimoto algorithm",
                "part": 3, "module": "3A", "kind": "channel code",
                "statement": "Alternating-maximization that converges to capacity (and to R(D)).",
                "formula": r"p^{(t+1)}(x)\propto p(x)\exp\!\big(\textstyle\sum_y p(y\mid x)\log\tfrac{p(y\mid x)}{p(y)}\big)",
                "intuition": "Coordinate ascent on a concave objective — it cannot get stuck.",
                "connects": "Solves capacity (3A) and, with a sign flip, the rate-distortion function (5A).",
            },
            {
                "name": "Noisy-channel coding theorem",
                "part": 3, "module": "3B", "kind": "theorem",
                "statement": "Reliable communication is possible iff the rate is below capacity.",
                "formula": r"R < C \Rightarrow P_e\to 0;\quad R > C \Rightarrow P_e \not\to 0",
                "intuition": "Random codes prove achievability; Fano proves the converse — a sharp cliff at C.",
                "connects": "Dual of source coding (2A); justifies every code in Part 4; built on the AEP (1C).",
            },
            {
                "name": "Fano's inequality",
                "part": 3, "module": "3B", "kind": "theorem",
                "statement": "A lower bound on error probability in terms of conditional entropy.",
                "formula": r"H(X\mid Y) \le H_2(P_e) + P_e\log_2(|\mathcal{X}|-1)",
                "intuition": "If much uncertainty remains after observing Y, you must make errors.",
                "connects": "The converse engine for channel coding (3B); used in ML generalization bounds.",
            },
            {
                "name": "Differential entropy",
                "part": 3, "module": "3C", "kind": "theorem",
                "statement": "The continuous analogue of entropy (can be negative; not coordinate-free).",
                "formula": r"h(X) = -\int f(x)\log_2 f(x)\,dx",
                "intuition": "Gaussian maximizes it for fixed variance: h = (1/2)log2(2 pi e sigma^2).",
                "connects": "Underlies the Gaussian channel (3C) and continuous rate-distortion (5A).",
            },
            {
                "name": "Shannon-Hartley (Gaussian channel)",
                "part": 3, "module": "3C", "kind": "theorem",
                "statement": "Capacity of a power-limited Gaussian channel in terms of SNR.",
                "formula": r"C = \tfrac12\log_2(1 + \mathrm{SNR})\ \text{bits/use}",
                "intuition": "Doubling bandwidth or SNR has very different payoffs — bits grow only with log SNR.",
                "connects": "Water-filling extends it to parallel channels (3C); R(D) is its lossy mirror (5A).",
            },
            {
                "name": "Water-filling",
                "part": 3, "module": "3C", "kind": "channel code",
                "statement": "Optimal power allocation across parallel Gaussian channels.",
                "formula": r"P_i = (\nu - N_i)^+,\quad \textstyle\sum_i P_i = P",
                "intuition": "Pour power into the quietest channels first; flood until the budget runs out.",
                "connects": "Reverse water-filling solves the Gaussian R(D) (5A); used in MIMO/OFDM.",
            },
            {
                "name": "Linear & Hamming codes",
                "part": 4, "module": "4A", "kind": "channel code",
                "statement": "Codewords are the null space / row space of GF(2) matrices; decode by syndrome.",
                "formula": r"c = mG,\quad s = Hr^\top,\quad d_{\min}=3\Rightarrow\text{correct 1 error}",
                "intuition": "The syndrome names exactly which bit flipped; perfect Hamming codes waste nothing.",
                "connects": "Foundation for all of Part 4; the Hamming/Singleton bounds limit any code.",
            },
            {
                "name": "Gilbert-Varshamov bound",
                "part": 4, "module": "4A", "kind": "theorem",
                "statement": "Achievability: a code of distance d exists whenever its spheres do not yet cover the space.",
                "formula": r"M\cdot V(n,d-1) < 2^n \;\Rightarrow\; R \ge 1 - H_2(\delta)",
                "intuition": "A greedy code keeps grabbing words at distance >= d; the Hamming picture run in reverse.",
                "connects": "Floor to the Hamming converse (4A); the achievability/converse sandwich of channel coding (3B).",
            },
            {
                "name": "CRC & error detection",
                "part": 4, "module": "4A", "kind": "channel code",
                "statement": "GF(2) polynomial division: a zero remainder means clean, else discard and retransmit.",
                "formula": r"T(x) = x^r m(x) \oplus (x^r m(x)\bmod g(x)),\ \deg g = r",
                "intuition": "A degree-r CRC catches every burst <= r and lets random errors slip at only 2^{-r}.",
                "connects": "Detection beats correction per bit of distance (4A); the detect-and-resend ARQ behind Ethernet/TCP.",
            },
            {
                "name": "Reed-Solomon & BCH",
                "part": 4, "module": "4B", "kind": "channel code",
                "statement": "Cyclic codes over GF(2^m) hitting the Singleton bound (MDS).",
                "formula": r"d_{\min} = n - k + 1\quad(\text{MDS})",
                "intuition": "Evaluate a polynomial at many points; any k points recover it, so erasures are cheap.",
                "connects": "Decoded by Berlekamp-Massey; used in CDs, QR codes, RAID, deep space.",
            },
            {
                "name": "Berlekamp-Massey",
                "part": 4, "module": "4B", "kind": "channel code",
                "statement": "Find the shortest LFSR (error-locator polynomial) consistent with the syndromes.",
                "formula": r"\Lambda(x):\ \deg\Lambda \le t,\ \Lambda(\alpha^{-i})=0\ \text{at errors}",
                "intuition": "Turns decoding into finding the roots of a small polynomial over a finite field.",
                "connects": "The decoder for RS/BCH (4B); a finite-field cousin of LFSR synthesis.",
            },
            {
                "name": "Convolutional codes & Viterbi",
                "part": 4, "module": "4C", "kind": "channel code",
                "statement": "Encode with a sliding shift register; decode the maximum-likelihood path through a trellis.",
                "formula": r"\hat{x} = \arg\max_{\text{path}} \sum_t \log p(y_t\mid \text{path})",
                "intuition": "Viterbi is dynamic programming: keep only the best path into each state.",
                "connects": "Trellis = unrolled state machine; turbo codes (4C) iterate two of these.",
            },
            {
                "name": "Turbo codes",
                "part": 4, "module": "4C", "kind": "channel code",
                "statement": "Two convolutional codes plus an interleaver, decoded by exchanging soft information.",
                "formula": r"L^{\text{ext}}_1 \rightleftarrows L^{\text{ext}}_2\ \text{(iterate)}",
                "intuition": "Each decoder's output becomes the other's prior — they bootstrap to near-capacity.",
                "connects": "Iterative decoding idea shared with LDPC/BP (4D); used in 3G/4G.",
            },
            {
                "name": "LDPC codes & belief propagation",
                "part": 4, "module": "4D", "kind": "channel code",
                "statement": "Sparse parity checks decoded by message passing on a Tanner graph.",
                "formula": r"\text{messages: }\tanh(\tfrac{L}{2})\ \text{products at checks, sums at bits}",
                "intuition": "Local belief updates on a sparse graph converge to near-ML decoding.",
                "connects": "Threshold predicted by density evolution / EXIT charts (4D); BP = sum-product inference (6C).",
            },
            {
                "name": "Density evolution & EXIT charts",
                "part": 4, "module": "4D", "kind": "channel code",
                "statement": "Track the message distribution to predict the decoding threshold.",
                "formula": r"p^{(t+1)} = F(p^{(t)});\ \text{threshold} = \sup\{\text{noise}:p^{(t)}\to 0\}",
                "intuition": "EXIT charts read the threshold off where two information-transfer curves touch.",
                "connects": "Designs capacity-approaching LDPC ensembles (4D); mutual-information bookkeeping (1B).",
            },
            {
                "name": "Polar codes",
                "part": 4, "module": "4D", "kind": "channel code",
                "statement": "Recursively transform channels so each becomes nearly perfect or nearly useless.",
                "formula": r"W_n^{(i)}\to\{\text{noiseless}\}\cup\{\text{pure noise}\}",
                "intuition": "Send data on the polarized 'good' channels; the first provably capacity-achieving code.",
                "connects": "Channel polarization (4D); the control channels in 5G use them.",
            },
            {
                "name": "Fountain / LT codes",
                "part": 4, "module": "4D", "kind": "channel code",
                "statement": "Rateless erasure codes: generate endless parity until enough arrives.",
                "formula": r"\text{any } (1+\epsilon)k\ \text{symbols} \Rightarrow \text{recover } k",
                "intuition": "No fixed rate — keep transmitting random XORs until the receiver has enough.",
                "connects": "Solves the erasure channel (3A) without feedback; used in multicast/streaming.",
            },
            {
                "name": "Rate-distortion function R(D)",
                "part": 5, "module": "5A", "kind": "theorem",
                "statement": "The fewest bits per symbol needed to reconstruct within average distortion D.",
                "formula": r"R(D) = \min_{p(\hat{x}\mid x):\,\mathbb{E}[d]\le D} I(X;\hat{X})",
                "intuition": "The lossy mirror of source coding — pay fewer bits, accept more error.",
                "connects": "Solved by Blahut-Arimoto (3A); Gaussian case uses reverse water-filling; ELBO (6E).",
            },
            {
                "name": "Reverse water-filling (Gaussian R(D))",
                "part": 5, "module": "5A", "kind": "theorem",
                "statement": "Allocate distortion across independent Gaussian components by a threshold.",
                "formula": r"D_i = \min(\lambda,\sigma_i^2),\quad R = \sum_i \tfrac12\log_2\tfrac{\sigma_i^2}{D_i}",
                "intuition": "Spend bits on the high-variance components; drop the ones below the water level.",
                "connects": "Dual of channel water-filling (3C); the R-D plane of a VAE traces it (6E).",
            },
            {
                "name": "Method of types & Sanov",
                "part": 5, "module": "5B", "kind": "theorem",
                "statement": "Group sequences by empirical distribution; rare-event probabilities decay by KL.",
                "formula": r"P(\hat{P}\in E) \doteq 2^{-n\,\min_{q\in E} D(q\|p)}",
                "intuition": "Large deviations are governed by the closest distribution in KL, not by variance.",
                "connects": "Re-derives AEP (1C) combinatorially; the engine for hypothesis testing (5B).",
            },
            {
                "name": "Stein's lemma (hypothesis testing)",
                "part": 5, "module": "5B", "kind": "theorem",
                "statement": "The best error exponent in a binary test is the KL divergence between the hypotheses.",
                "formula": r"\beta_n \doteq 2^{-n\,D(p_0\|p_1)}",
                "intuition": "KL is literally the asymptotic 'distinguishability' of two distributions.",
                "connects": "Gives KL (1B) an operational meaning; Sanov (5B); links to MDL (6B).",
            },
            {
                "name": "Fisher information & Cramer-Rao",
                "part": 5, "module": "5B", "kind": "theorem",
                "statement": "Unbiased estimators cannot beat the inverse Fisher information.",
                "formula": r"\mathrm{Var}(\hat\theta) \ge 1/I(\theta),\quad I(\theta)=\mathbb{E}[(\partial_\theta\log p)^2]",
                "intuition": "Fisher info is the local curvature of KL — the 'sharpness' of the likelihood.",
                "connects": "Local quadratic approximation of KL (1B); appears in BIC/MDL (6B) and natural gradient.",
            },
            {
                "name": "Slepian-Wolf",
                "part": 5, "module": "5C", "kind": "theorem",
                "statement": "Two correlated sources can be compressed separately at the joint entropy total.",
                "formula": r"R_X\ge H(X\mid Y),\ R_Y\ge H(Y\mid X),\ R_X+R_Y\ge H(X,Y)",
                "intuition": "Distributed encoders pay no penalty over a single joint encoder — surprising and useful.",
                "connects": "Uses conditional entropy (1A); the rate region is read off the I-diagram (1B).",
            },
            {
                "name": "Cross-entropy & MLE = min KL",
                "part": 6, "module": "6A", "kind": "ml",
                "statement": "Training a classifier minimizes cross-entropy, which equals entropy plus KL to the truth.",
                "formula": r"H(p,q) = H(p) + D(p\|q);\ \min_q H(p,q)\equiv\min_q D(p\|q)",
                "intuition": "The irreducible loss is the label entropy; learning closes the KL gap.",
                "connects": "KL (1B) and entropy (1A); label smoothing shifts the target; softmax-as-maxent (6A).",
            },
            {
                "name": "Maximum-entropy principle",
                "part": 6, "module": "6A", "kind": "ml",
                "statement": "Among distributions matching given constraints, pick the one with the most entropy.",
                "formula": r"p(x)\propto \exp\!\big(\textstyle\sum_k \lambda_k f_k(x)\big)",
                "intuition": "Assume the least beyond what you know — yields the exponential family.",
                "connects": "Softmax/logistic regression are maxent (6A); Gaussian is maxent for fixed variance (3C).",
            },
            {
                "name": "Kelly criterion & doubling rate",
                "part": 6, "module": "6A", "kind": "theorem",
                "statement": "Log-optimal proportional betting; max wealth growth per round is 1 - H_2(p) at even money.",
                "formula": r"f^\star = 2p-1,\quad W^\star = 1 - H_2(p)",
                "intuition": "Entropy is the tax on growth; wrong beliefs q cost exactly D(p||q), the third hat of KL.",
                "connects": "Third operational meaning of entropy (1A); betting on q = log-loss/cross-entropy (6A); side info worth I(X;Y) (1B).",
            },
            {
                "name": "Minimum description length (MDL)",
                "part": 6, "module": "6B", "kind": "ml",
                "statement": "The best model is the one that compresses the data plus itself the most.",
                "formula": r"\min_{\mathcal{M}}\ L(\mathcal{M}) + L(\text{data}\mid\mathcal{M})",
                "intuition": "Occam's razor as code length — complexity is paid for in bits.",
                "connects": "Two-part codes = source coding (2A); relates to BIC and Bayesian evidence (6B).",
            },
            {
                "name": "Information bottleneck (IB)",
                "part": 6, "module": "6C", "kind": "ml",
                "statement": "Compress X into T while keeping the information T carries about a target Y.",
                "formula": r"\min_{p(t\mid x)}\ I(X;T) - \beta\, I(T;Y)",
                "intuition": "Trade representation size against task-relevance; beta sweeps the information plane.",
                "connects": "Built on MI (1B) and the DPI; a rate-distortion view of representation (5A); deep-learning caveat (Saxe).",
            },
            {
                "name": "MINE / variational MI bounds",
                "part": 6, "module": "6D", "kind": "ml",
                "statement": "Estimate mutual information with a neural critic via lower bounds (DV, NWJ, InfoNCE).",
                "formula": r"I(X;Y) \ge \mathbb{E}_{p(x,y)}[T] - \log \mathbb{E}_{p(x)p(y)}[e^{T}]",
                "intuition": "Turn an intractable MI into an optimization over a learned function T.",
                "connects": "Estimates MI (1B); InfoNCE has a log-N ceiling; powers contrastive learning and the IB (6C).",
            },
            {
                "name": "ELBO as rate-distortion (VAE)",
                "part": 6, "module": "6E", "kind": "ml",
                "statement": "The VAE objective is a rate (KL to prior) plus a distortion (reconstruction) term.",
                "formula": r"\mathcal{L} = \underbrace{\mathbb{E}[-\log p(x\mid z)]}_{\text{distortion}} + \beta\,\underbrace{D(q(z\mid x)\|p(z))}_{\text{rate}}",
                "intuition": "beta sweeps a rate-distortion curve in latent space — the same R(D) tradeoff as Part 5.",
                "connects": "ELBO from Jensen (1B); rate-distortion (5A); bits-back/ANS = arithmetic coding (2C) for compression.",
            },
            {
                "name": "LLM loss = cross-entropy / bits-per-byte",
                "part": 6, "module": "6F", "kind": "ml",
                "statement": "An LLM's training loss is the cross-entropy of the next token; bits-per-byte is the tokenizer-free unit.",
                "formula": r"\mathcal{L} = \tfrac1T\sum_t -\log_2 q_\theta(x_t\mid x_{<t}) = H(p,q_\theta)",
                "intuition": "Training is MLE on text = minimizing D(p||q); the loss can never drop below the entropy rate H(p).",
                "connects": "Cross-entropy = H(p)+D(p||q) (6A); entropy rate floor (1C); perplexity = 2^loss (2A).",
            },
            {
                "name": "Neural scaling laws",
                "part": 6, "module": "6F", "kind": "ml",
                "statement": "Test loss falls as a power law in model size, bottoming out at an irreducible floor.",
                "formula": r"L(N) = E + A\,N^{-\alpha},\quad E = H(p)",
                "intuition": "The reducible part is the shrinking KL D(p||q); the floor E is the entropy rate of text itself.",
                "connects": "A scaling curve is a compression curve (2A); floor = entropy rate (1C); KL closing with scale (6A).",
            },
            {
                "name": "Language modeling is compression",
                "part": 6, "module": "6F", "kind": "ml",
                "statement": "Any next-token predictor + arithmetic coder is a lossless compressor; its length is the cross-entropy.",
                "formula": r"\mathbb{E}[\text{codelength}] = \textstyle\sum_t -\log_2 q_\theta(x_t\mid x_{<t}) = T\,H(p,q_\theta)",
                "intuition": "Better prediction is literally fewer bits — predict well and compress well are one problem.",
                "connects": "Arithmetic coding (2C); cross-entropy loss (6A); MDL's learning-as-compression view (6B).",
            },
            {
                "name": "Temperature sampling as entropy control",
                "part": 6, "module": "6F", "kind": "ml",
                "statement": "The temperature-scaled softmax dials the entropy and effective vocabulary of generation.",
                "formula": r"q_T(i) = \tfrac{\exp(z_i/T)}{\sum_j \exp(z_j/T)}",
                "intuition": "T->0 is greedy (H->0); T->inf washes out to uniform (H->log2 V); 2^H is the effective vocabulary.",
                "connects": "Softmax-as-maxent with a knob (6A); entropy as uncertainty (1A); effective branching factor (2A).",
            },
            {
                "name": "Speculative decoding",
                "part": 6, "module": "6F", "kind": "ml",
                "statement": "A cheap draft model proposes tokens; the target verifies in parallel, preserving its distribution.",
                "formula": r"\text{accept }x\sim\text{draft w.p. }\min\!\big(1,\tfrac{p_{\text{tgt}}(x)}{p_{\text{draft}}(x)}\big)",
                "intuition": "Verify cheaply, correct rarely: fewer big-model passes per token with zero distortion to the samples.",
                "connects": "Distribution-preserving rejection sampling; same verify-then-fix spirit as ARQ/CRC (4A) and coding theory.",
            },
        ]

    def _run():
        _cat = build_catalogue()
        _kinds = {}
        _parts = {}
        for _e in _cat:
            _kinds[_e["kind"]] = _kinds.get(_e["kind"], 0) + 1
            _parts[_e["part"]] = _parts.get(_e["part"], 0) + 1
        print(f"=== Course catalogue: {len(_cat)} entries ===\n")
        print("By type:")
        for _k in ["theorem", "source code", "channel code", "ml"]:
            print(f"  {_k:14s} {_kinds.get(_k, 0):2d}")
        print("\nBy Part:")
        for _p in sorted(_parts):
            print(f"  Part {_p}   {_parts[_p]:2d}")
        _fields = set()
        for _e in _cat:
            _fields |= set(_e.keys())
        print(f"\nSchema fields: {sorted(_fields)}")

    _run()
    return (build_catalogue,)


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. The Filterable Catalogue

    Pick a **Part** and a **type** below. "All" on either axis keeps everything on that axis. The table updates the instant you change a dropdown — exactly one row per named theorem / algorithm / code, with its statement, formula, intuition, and connections.

    Try these study routines:

    - **Part 1, type = theorem** — the three core measures and the inequalities that govern them.
    - **Part 2, type = source code** — Shannon, Huffman, arithmetic, LZ side by side: four answers to "how few bits?"
    - **Part 4, type = channel code** — the full ladder from Hamming to polar.
    - **Part 6, type = ml** — the information-theoretic spine of modern machine learning.
    - **All / All** — the whole course on one screen; sort the table by any column.
    """)
    return


@app.cell
def _(mo):
    part_filter = mo.ui.dropdown(
        options=["All", "0", "1", "2", "3", "4", "5", "6"],
        value="All",
        label="Filter by Part",
    )
    kind_filter = mo.ui.dropdown(
        options=["All", "theorem", "source code", "channel code", "ml"],
        value="All",
        label="Filter by type",
    )
    mo.hstack([part_filter, kind_filter], justify="start", gap=2)
    return kind_filter, part_filter


@app.cell
def _(build_catalogue, kind_filter, mo, part_filter):
    def _run():
        _cat = build_catalogue()
        _pf = part_filter.value
        _kf = kind_filter.value

        _rows = []
        for _e in _cat:
            if _pf != "All" and str(_e["part"]) != _pf:
                continue
            if _kf != "All" and _e["kind"] != _kf:
                continue
            _rows.append(
                {
                    "Module": _e["module"],
                    "Type": _e["kind"],
                    "Name": _e["name"],
                    "Statement": _e["statement"],
                    "Key formula": f"$ {_e['formula']} $",
                    "Intuition": _e["intuition"],
                    "Connects to": _e["connects"],
                }
            )

        _caption = mo.md(
            f"**{len(_rows)} entr"
            + ("y" if len(_rows) == 1 else "ies")
            + f"** matching  Part = `{_pf}`,  type = `{_kf}`."
        )

        if not _rows:
            mo.output.replace(
                mo.vstack([_caption, mo.md("*No entries match this filter.*")])
            )
            return

        _table = mo.ui.table(
            data=_rows,
            selection=None,
            pagination=False,
            label="Course catalogue (filtered)",
        )
        mo.output.replace(mo.vstack([_caption, _table]))

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. The Five Theorems That Carry the Course

    Of everything in the catalogue, five results are load-bearing — if you internalize only these, the rest hangs off them. Notice the deep symmetry: **source coding and channel coding are mirror images** (one removes redundancy down to a floor, the other adds redundancy up to a ceiling), and **rate-distortion is the lossy version of source coding**, solved by the *same* Blahut-Arimoto machinery as capacity.

    | Theorem | Module | The one inequality | Mirror / dual |
    |---------|--------|--------------------|---------------|
    | **Source coding** | 2A | $H(X) \le L^\star < H(X)+1$ | dual of channel coding |
    | **Noisy-channel coding** | 3B | reliable $\iff R < C$ | dual of source coding |
    | **Rate-distortion** | 5A | $R(D) = \min I(X;\hat X)$ | lossy source coding |
    | **AEP** | 1C | $-\tfrac1n\log p(X^n)\to H$ | proves both coding theorems |
    | **Data-processing** | 1B | $I(X;Z)\le I(X;Y)$ | the converse engine |

    Both coding theorems are proved the same way: the **AEP** (1C) says only $\approx 2^{nH}$ sequences matter, **random coding** shows a good code exists on average, and **Fano** (3B) supplies the converse. KL divergence (1B) and mutual information (1B) are the *measures* in which all five are stated. Master the AEP and KL, and you can re-derive most of the course from scratch.
    """)
    return


@app.cell
def _(build_catalogue):
    def _run():
        _cat = build_catalogue()
        _by_module = {}
        for _e in _cat:
            _by_module.setdefault(_e["module"], []).append(_e["name"])

        print("=== Entries per module (the spine of the course) ===\n")
        for _m in sorted(_by_module):
            _names = _by_module[_m]
            print(f"  {_m}: {len(_names)} ->")
            for _n in _names:
                print(f"        - {_n}")
        print(f"\nTotal modules covered: {len(_by_module)}")
        print(f"Total named results  : {len(_cat)}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. The Connection Web

    Information theory is not a pile of separate facts — almost every entry points at several others. A few hub ideas show up again and again; if you understand the hubs, the spokes follow.

    - **KL divergence (1B)** is the single busiest node. It is the *extra bits* in source coding, the *non-negativity* that proves Gibbs, the *error exponent* in Stein's lemma (5B), the *loss* in cross-entropy training (6A), the *rate* term in the VAE ELBO (6E), and the *complexity penalty* in MDL (6B).
    - **Mutual information (1B)** is the quantity you *maximize* for capacity (3A), *constrain* in the bottleneck (6C), *estimate* with MINE (6D), and *track* through EXIT charts (4D).
    - **The AEP / typicality (1C)** is the combinatorial engine behind *both* coding theorems (2A, 3B) and is re-derived by the method of types (5B).
    - **Blahut-Arimoto (3A)** solves *two* problems with one algorithm: channel capacity (3A) and the rate-distortion function (5A).
    - **Water-filling (3C)** appears forward for the parallel Gaussian channel and *in reverse* for the Gaussian source (5A) — the same Lagrangian, the same picture, mirrored.
    - **Iterative / message-passing decoding** unifies turbo (4C) and LDPC belief propagation (4D), and BP is exactly the sum-product inference that reappears in graphical models and the IB (6C).

    The cell below builds a tiny reverse index: for a handful of hub concepts, it lists which modules reference them in their `connects` field.
    """)
    return


@app.cell
def _(build_catalogue):
    def _run():
        _cat = build_catalogue()

        _hubs = {
            "KL": ["kl", "d(p", "d(q", "d(p_0"],
            "Mutual information": ["mi (", "mi(", "i(x;", "mutual"],
            "AEP / typicality": ["aep", "typical"],
            "Blahut-Arimoto": ["blahut"],
            "Water-filling": ["water-filling"],
            "Source coding (2A)": ["(2a)", "source coding"],
        }

        print("=== Reverse index: which entries cite each hub idea ===\n")
        for _hub, _keys in _hubs.items():
            _hits = []
            for _e in _cat:
                _text = (_e["connects"] + " " + _e["statement"] + " " + _e["intuition"]).lower()
                if any(_k in _text for _k in _keys):
                    _hits.append(_e["module"])
            _hits = sorted(set(_hits))
            print(f"  {_hub:22s} <- {', '.join(_hits)}  ({len(_hits)} modules)")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. Why This Matters for Machine Learning

    A reference module earns its keep by showing you the *throughline*. Every Part 6 idea is a classical result wearing modern clothes:

    - **Cross-entropy loss = entropy + KL.** Training any classifier (6A) minimizes $D(p\|q)$ between the data distribution and the model — the exact KL divergence you defined in 1B. The irreducible part of the loss is the label entropy (1A).
    - **Softmax / logistic regression = maximum entropy.** The maxent principle (6A) is the same one that picks the Gaussian as the maximizer of differential entropy (3C). "Assume the least" is an information-theoretic statement.
    - **Regularization = compression.** MDL (6B) says the best model minimizes a *two-part code* — model bits plus data-given-model bits — which is literally source coding (2A) applied to learning. Occam's razor is measured in bits.
    - **Representation learning = the information bottleneck.** The IB (6C) is a rate-distortion problem (5A) on the *relevant* information $I(T;Y)$, optimized with the same MI machinery (1B) and constrained by the data-processing inequality.
    - **Contrastive learning = MI estimation.** InfoNCE and MINE (6D) are variational *lower bounds* on the mutual information from 1B; their log-$N$ ceiling is a direct consequence of the bound's structure.
    - **VAEs = rate-distortion in latent space.** The ELBO (6E) is a rate term (KL to the prior) plus a distortion term (reconstruction) — reverse water-filling (5A) in disguise — and bits-back coding turns it into a real compressor using arithmetic coding (2C).

    The punchline of the whole course: the quantities Shannon defined in 1948 to send telegrams over noisy wires turn out to be the *same* quantities that govern how a neural network learns, generalizes, compresses, and represents the world. When you reach for a loss function, a regularizer, or a representation objective in your own ML work, you are reaching for information theory — and now you can read the bits.

    This is the end of the course content. Use the catalogue above before quizzes, and come back whenever a paper drops a name you half-remember. Then build something with it.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    A reference module deserves reference *tooling*. These exercises have you build small query and analysis functions over the catalogue itself — the kind of thing a real study app is made of. The catalogue list is reproduced inside each cell (self-contained), so you can run them independently.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Filter the Catalogue

    Write `query(catalogue, part=None, kind=None)` that returns the list of entries matching the given Part and/or type. `None` means "don't filter on that field." In this mini-catalogue, test that filtering Part 2 returns the single Huffman entry and that `kind="ml"` returns the Part 6 entry.
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
        catalogue = [
            {"name": "Entropy", "part": 1, "kind": "theorem"},
            {"name": "Huffman coding", "part": 2, "kind": "source code"},
            {"name": "Channel capacity", "part": 3, "kind": "theorem"},
            {"name": "LDPC & belief propagation", "part": 4, "kind": "channel code"},
            {"name": "Cross-entropy & MLE", "part": 6, "kind": "ml"},
        ]

        def query(cat, part=None, kind=None):
            # TODO: keep entry e iff (part is None or e["part"]==part)
            #                    and (kind is None or e["kind"]==kind)
            _result = ...
            return _result

        # print(len(query(catalogue, part=2)))            # expect 1 (in this mini set)
        # print([e["name"] for e in query(catalogue, kind="theorem")])
        # expect ['Entropy', 'Channel capacity']

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Count by Part

    Write `count_by_part(catalogue)` returning a dict mapping each Part number to how many entries it has. This is the bar chart you would put at the top of a study dashboard.
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
        catalogue = [
            {"name": "Entropy", "part": 1, "kind": "theorem"},
            {"name": "Mutual information", "part": 1, "kind": "theorem"},
            {"name": "Huffman coding", "part": 2, "kind": "source code"},
            {"name": "Arithmetic coding", "part": 2, "kind": "source code"},
            {"name": "Channel capacity", "part": 3, "kind": "theorem"},
        ]

        def count_by_part(cat):
            # TODO: loop over entries, tally e["part"] into a dict
            _counts = ...
            return _counts

        # print(count_by_part(catalogue))   # expect {1: 2, 2: 2, 3: 1}

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: Keyword Search

    Write `search(catalogue, term)` that returns the names of all entries whose `name` or `statement` contains `term` (case-insensitive). This is the search bar of the study tool.
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
        catalogue = [
            {"name": "KL divergence", "statement": "Extra bits for coding with the wrong distribution."},
            {"name": "Mutual information", "statement": "Bits one variable tells you about another."},
            {"name": "Channel capacity", "statement": "Max mutual information over input distributions."},
        ]

        def search(cat, term):
            term = term.lower()
            # TODO: return [e["name"] for e in cat if term appears in name or statement (lowercased)]
            _hits = ...
            return _hits

        # print(search(catalogue, "mutual"))   # expect ['Mutual information', 'Channel capacity']
        # print(search(catalogue, "bits"))     # expect ['KL divergence', 'Mutual information']

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Connection Degree

    Each entry's `connects` string mentions other modules like `(1B)` or `(3A)`. Write `connection_degree(entry)` that counts how many distinct module references appear in the `connects` text. Use it to find the most-connected hub idea.
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
        import re

        entry = {
            "name": "KL divergence",
            "connects": "Cross-entropy loss (6A), MDL (6B), Sanov & Stein (5B), the engine of the course.",
        }

        def connection_degree(e):
            # TODO: find all module tags like (6A), (6B), (5B) with a regex,
            #       then count the number of DISTINCT tags
            _tags = ...        # hint: re.findall(r"\(\d[A-E]\)", e["connects"])
            _distinct = ...
            return _distinct

        # print(connection_degree(entry))   # expect 3

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Build a Flashcard Deck

    Turn the catalogue into a study deck. Write `make_flashcards(catalogue)` that returns a list of `(front, back)` tuples where the front is the entry name and the back is `"<statement>  |  <formula>"`. Then print one random card to quiz yourself. (This is the very last code cell — note the module-level run guard after the return.)
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
        import random

        catalogue = [
            {"name": "Entropy",
             "statement": "Average surprise of a random variable.",
             "formula": "H(X) = -sum p log p"},
            {"name": "KL divergence",
             "statement": "Extra bits for the wrong distribution.",
             "formula": "D(p||q) = sum p log(p/q)"},
            {"name": "Channel capacity",
             "statement": "Max info a channel carries per use.",
             "formula": "C = max I(X;Y)"},
        ]

        def make_flashcards(cat):
            # TODO: return [(e["name"], e["statement"] + "  |  " + e["formula"]) for e in cat]
            _deck = ...
            return _deck

        # deck = make_flashcards(catalogue)
        # _card = random.choice(deck)
        # print("FRONT:", _card[0])
        # print("BACK :", _card[1])

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    # Course navigation cell
    mo.md(
        r"""
    ---

    [&#8593; Course home](../) &nbsp;|&nbsp; &#8592; Prev: [6F: Information Theory in Modern LLMs](../6f_it_llms/) &nbsp;|&nbsp; [Quiz & Flashcards](../quiz.html)
    """
    )
    return


if __name__ == "__main__":
    app.run()
