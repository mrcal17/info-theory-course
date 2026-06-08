#flashcards/part5

## 5A: Rate-Distortion

Define the rate-distortion function R(D).
?
The minimum rate (bits/symbol) needed to encode a source so that the expected distortion of the reconstruction is ≤ D.
Formally R(D) = min I(X;X̂) over conditional distributions p(x̂|x) with E[d(X,X̂)] ≤ D.

R(D) for a Bernoulli(p) source under Hamming distortion (p ≤ 1/2).
?
R(D) = H₂(p) − H₂(D) for 0 ≤ D ≤ p, and R(D) = 0 for D ≥ p.
(H₂ is the binary entropy function.)

R(D) for a Gaussian source N(0,σ²) under squared-error distortion.
?
R(D) = ½ log₂(σ²/D) for 0 ≤ D ≤ σ², and R(D) = 0 for D ≥ σ².
Each halving of D costs ½ bit.

What is reverse water-filling?
?
For parallel independent Gaussian sources, choose a water level λ and set distortion Dᵢ = min(λ, σᵢ²).
Components with σᵢ² < λ are left uncoded (Dᵢ = σᵢ²); louder ones are coded down to distortion λ. λ is set so Σ Dᵢ = D.

How does lossy compression relate to lossless?
?
Lossless needs R ≥ H(X) for exact recovery. Lossy tolerates distortion D > 0 and can use R(D) < H(X).
Lossless is the limiting case D → 0, where R(D) → H(X).

## 5B: IT & Statistics

What is a type (and a type class) in the method of types?
?
A type is the empirical distribution (symbol frequencies) of a length-n sequence.
A type class is the set of all sequences sharing that type. There are only ≤ (n+1)^|X| types (polynomial), each class holding ≈ 2^(nH) sequences.

State Sanov's theorem.
?
For i.i.d. samples from q, the probability that the empirical type lands in a set E decays as ≈ 2^(−nD(p*‖q)),
where p* (the I-projection) is the member of E minimizing D(·‖q).

State Stein's lemma (binary hypothesis testing).
?
Testing H₁:p vs H₂:q. Holding the type-I error below ε, the best type-II error exponent is D(p‖q).
The type-II error decays as 2^(−nD(p‖q)).

State the Cramér-Rao bound and the role of Fisher information.
?
For any unbiased estimator θ̂: Var(θ̂) ≥ 1/J(θ), where J(θ) is the Fisher information.
More Fisher information ⇒ lower achievable variance ⇒ more precise estimation.

How is KL divergence D(p‖q) expressed as a likelihood ratio?
?
D(p‖q) = E_p[log₂(p(X)/q(X))] = Σ p(x) log₂(p(x)/q(x)).
It is the expected log-likelihood ratio under the true distribution p — the basis of its hypothesis-testing meaning.

## 5C: Network IT

State the Slepian-Wolf rate region for correlated sources X, Y.
?
R₁ ≥ H(X|Y)
R₂ ≥ H(Y|X)
R₁ + R₂ ≥ H(X,Y)
Separate encoding + joint decoding achieves the joint entropy.

Why is the Slepian-Wolf theorem surprising?
?
Two encoders that never see each other's data still achieve total rate H(X,Y) — the same as a single joint encoder.
Distributed encoding pays no rate penalty when decoding is joint (via random binning).

What bounds define the two-user MAC capacity region?
?
R₁ ≤ I(X₁;Y | X₂)
R₂ ≤ I(X₂;Y | X₁)
R₁ + R₂ ≤ I(X₁,X₂ ; Y)
(Multiple senders → one receiver.)

Contrast the multiple-access channel and the broadcast channel.
?
MAC: many senders → one receiver (capacity region known, a pentagon).
Broadcast: one sender → many receivers, generally distinct messages (uses superposition coding). They are duals.
