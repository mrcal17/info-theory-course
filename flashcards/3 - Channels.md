#flashcards/part3

## 3A: Channel Capacity

Define the capacity of a discrete memoryless channel.
?
C = max over input distributions p(x) of I(X;Y).
Units: bits per channel use.
The channel law p(y|x) is fixed; you optimize the input.

BSC capacity formula and its meaning.
?
C = 1 - H₂(p) for crossover probability p.
H₂(p) = -p log₂ p - (1-p) log₂(1-p) is the bits of uncertainty injected per use.
C = 0 at p = 1/2; C = 1 at p = 0 or 1.

BEC capacity formula and intuition.
?
C = 1 - e for erasure probability e.
Fraction e of symbols are erased (known losses), so only fraction (1-e) get through.
Erasures are easier than flips: no 1 - H₂(e) penalty.

What does the Blahut-Arimoto algorithm do?
?
Numerically computes channel capacity by iteratively finding the capacity-achieving input distribution p(x).
Alternates updating p(x) and the reverse channel p(x|y); converges monotonically to C.

Why is a uniform input optimal for the BSC?
?
The BSC is symmetric in its inputs.
For symmetric channels, the uniform input distribution maximizes I(X;Y), making the output uniform and achieving capacity.

## 3B: Noisy-Channel Coding Theorem

Define the rate R of a block code with M codewords and block length n.
?
R = log₂(M)/n bits per channel use.
log₂(M) = number of message bits; n = channel uses per codeword.

State the noisy-channel coding theorem (both directions).
?
Achievability: for any R < C there exist codes with error → 0 as n → ∞.
Converse: for any R > C, error is bounded away from 0.
Reliable communication is possible iff R < C.

What is the random coding argument and why is it nonconstructive?
?
Generate codewords i.i.d. from the capacity-achieving p(x); average error over the random ensemble → 0 for R < C.
If the AVERAGE codebook is good, at least one specific codebook is good — but the proof never builds it explicitly.

How does jointly-typical decoding work, and what causes errors?
?
Decode to the unique codeword xⁿ that is jointly typical with received yⁿ.
Errors: (1) the true pair isn't jointly typical (rare by AEP), or (2) a wrong codeword is also jointly typical (probability ≈ 2^(−n(I(X;Y)−R)), small when R < I(X;Y)).

State Fano's inequality and its role in the converse.
?
H(W|Ŵ) ≤ H(Pₑ) + Pₑ·log₂(|W|−1) ≤ 1 + Pₑ·log₂(M).
A small error probability Pₑ forces small residual uncertainty; combined with I(W;Ŵ) ≤ nC this yields R ≤ C for reliable communication.

## 3C: Gaussian Channel

Why can differential entropy be negative while discrete entropy cannot?
?
Discrete entropy sums −p log p with 0 ≤ p ≤ 1, so each term is ≥ 0.
Differential entropy integrates −f log f, but a density f can exceed 1 (it's a density, not a probability), making log f positive and the integral negative.
Example: Uniform on [0, ½] has h = log₂(½) = −1 bit.

State the maximum-entropy property of the Gaussian.
?
Among all continuous distributions with a fixed variance σ², the Gaussian N(μ, σ²) maximizes differential entropy.
Max value: h = ½ log₂(2πe σ²).
Consequence: Gaussian noise is the 'worst case' — it gives the smallest capacity for a given noise power.

Write the AWGN channel capacity and define each symbol.
?
C = ½ log₂(1 + SNR) bits per channel use.
SNR = P/N, where P = average signal (input) power and N = noise variance.
Achieved by a Gaussian input X ~ N(0, P).

State the Shannon–Hartley theorem and how it relates to the per-use formula.
?
C = B log₂(1 + S/N) bits per second.
B = bandwidth (Hz), S = signal power, N = noise power (N = N₀B).
Link: a bandwidth-B channel gives 2B real samples/s; each contributes ½ log₂(1+SNR) bits, so 2B · ½ log₂(1+SNR) = B log₂(1+SNR).

Describe the water-filling solution for parallel Gaussian channels.
?
Goal: maximize Σ ½ log₂(1 + Pᵢ/Nᵢ) subject to Σ Pᵢ ≤ P.
Solution: Pᵢ = (ν − Nᵢ)⁺ = max(0, ν − Nᵢ).
Picture: pour water (power) over a floor of heights Nᵢ; water level ν is chosen so total power = P. Low-noise channels get more power; channels with Nᵢ ≥ ν get none.
