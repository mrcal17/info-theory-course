#flashcards/part1

## 1A: Entropy & Self-Information

Define self-information h(x) and state its intuition.
?
h(x) = -log₂ p(x)
Measures the 'surprise' of outcome x: rarer outcomes (small p) carry more information. Measured in bits when using log₂.

Write the formula for entropy H(X) and say what it averages.
?
H(X) = Σ p(x)·(-log₂ p(x)) = E[h(X)]
It is the expected self-information — the average surprise per symbol.

State the chain rule for the joint entropy of X and Y.
?
H(X,Y) = H(X) + H(Y|X) = H(Y) + H(X|Y)
Joint uncertainty = uncertainty of one variable + remaining uncertainty of the other given the first.

Binary entropy H₂(p): where is it maximized and what is its max value?
?
H₂(p) = -p·log₂p - (1-p)·log₂(1-p)
Maximized at p = ½, giving H₂(½) = 1 bit. It is 0 at p = 0 and p = 1.

State the bound H(X) ≤ log₂|𝒳| and its equality condition. What does 'conditioning reduces entropy' mean?
?
H(X) ≤ log₂|𝒳|, equality iff X is uniform.
Conditioning reduces entropy: H(X|Y) ≤ H(X), equality iff X ⊥ Y.

## 1B: Relative Entropy & Mutual Information

Define KL divergence D(p‖q) and state its two key properties.
?
D(p‖q) = Σ p(x)·log₂(p(x)/q(x))
1) D(p‖q) ≥ 0 (Gibbs), = 0 iff p = q.
2) Asymmetric: D(p‖q) ≠ D(q‖p) in general. Not a metric.

How is cross-entropy related to entropy and KL divergence?
?
Cross-entropy(p, q) = H(p) + D(p‖q)
Expected bits to code p-data with a q-optimal code; the extra D(p‖q) is the mismatch penalty.

Give the equivalent expressions for mutual information I(X;Y).
?
I(X;Y) = H(X) - H(X|Y) = H(Y) - H(Y|X)
= H(X) + H(Y) - H(X,Y)
= D(p(x,y)‖p(x)p(y)) ≥ 0

State the data-processing inequality and the role of Jensen's inequality.
?
For X → Y → Z: I(X;Z) ≤ I(X;Y). Processing can't create information.
Jensen: for convex -log, E[-log(·)] ≥ -log E[·], which yields D(p‖q) ≥ 0.

## 1C: Entropy Rate & the AEP

State the AEP (Asymptotic Equipartition Property).
?
For i.i.d. X₁..Xₙ: -(1/n)·log₂ p(x₁..xₙ) → H(X) in probability.
Typical sequences each have probability ≈ 2^(-nH).

Describe the typical set: its size and the probability it carries.
?
Size ≈ 2^(nH); total probability → 1.
It is a vanishing fraction of all |𝒳|ⁿ = 2^(n·log₂|𝒳|) sequences (when H < log₂|𝒳|) yet holds almost all the probability.

Give the formula for the entropy rate of a stationary Markov chain.
?
H = Σᵢ μᵢ · H(row i)
where μ is the stationary distribution and H(row i) is the entropy of the transition distribution from state i.

What is the entropy rate of an i.i.d. process?
?
H = H(X), the entropy of a single symbol.
For i.i.d. sources H(X₁..Xₙ) = n·H(X), so the per-symbol rate is just H(X).
