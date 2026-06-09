#flashcards/part6

## 6A: Cross-Entropy & MaxEnt

Why is minimizing cross-entropy the same as minimizing KL for fixed labels?
?
H(p,q) = H(p) + KL(p‖q).
With labels p fixed, H(p) is constant, so minimizing cross-entropy H(p,q) minimizes the forward KL(p‖q).

MLE as an information-theoretic objective
?
Maximizing average log-likelihood = minimizing cross-entropy of empirical p̂ vs model q_θ
= minimizing KL(p̂‖q_θ) (since H(p̂) is constant).

Maximum-entropy principle → which distribution family?
?
Among all distributions matching given expected-feature constraints E[fₖ], pick the highest-entropy one.
Result: exponential family q(x) ∝ exp(Σ λₖ fₖ(x)), λₖ = Lagrange multipliers.
Softmax/logistic regression are maxent conditional models.

What does label smoothing do, information-theoretically?
?
Replaces one-hot target with (1−ε) on true class, ε spread elsewhere → higher target entropy.
Penalizes over-confident logits, improving calibration; acts as a regularizer.

Forward KL(p‖q) vs reverse KL(q‖p) behavior
?
Forward KL(p‖q) (MLE/cross-entropy): mean-seeking / zero-avoiding → q covers all modes of p.
Reverse KL(q‖p): mode-seeking → q locks onto one mode.

Kelly betting: the optimal fraction and the doubling rate (even-money coin, prob p)
?
Maximize the doubling rate W(f) = p·log₂(1+f) + (1−p)·log₂(1−f).
Log-optimal fraction f* = 2p − 1 ("bet your edge").
Achieved growth W* = 1 − H(p): one bit minus the coin's entropy. Fair coin → 0; predictable coin → 1 bit/round.

Kelly with wrong beliefs and side information — what is each worth?
?
Betting Kelly with a wrong belief q costs exactly D(p‖q) in growth rate (same KL as wasted compression bits / excess log-loss).
Acquiring side information Y correlated with the outcome raises the achievable growth rate by exactly I(X;Y).

## 6B: MDL

MDL two-part code: what is minimized?
?
L(model) + L(data | model).
First term = complexity cost, second = fit/residual cost.
Minimizing the sum balances fit vs complexity (Occam's razor in bits).

BIC formula and its penalty
?
BIC = −2 log L̂ + k·log n (k params, n data points).
Penalty k·log n grows with n → more conservative than AIC's fixed 2k for large n.
BIC ≈ Laplace approximation to the Bayesian marginal likelihood.

MDL and Kolmogorov complexity
?
Kolmogorov complexity = length of shortest program reproducing the data (idealized description length).
It is uncomputable, so MDL approximates it using a restricted, computable model/code class.

What is the bits-back idea?
?
The bits used to choose specific latents/parameters from a posterior aren't truly wasted — they can be recovered.
This lowers the effective code length from the naive two-part code toward the Bayesian marginal / variational free energy.

## 6C: Information Bottleneck

Information Bottleneck Lagrangian
?
min  I(X;T) − β·I(T;Y).
I(X;T): compression (squeeze out info about input X).
I(T;Y): relevance (keep info about label Y).
β tunes the trade-off.

What is the information plane?
?
A 2D plot of each layer/representation T as a point:
x-axis = I(X;T) (input info retained), y-axis = I(T;Y) (label info retained).
Used to watch compression vs relevance during training.

Fitting-then-compression story (Shwartz-Ziv & Tishby)
?
Phase 1 (fitting): both I(X;T) and I(T;Y) rise.
Phase 2 (compression): I(X;T) falls (discard irrelevant input info) while I(T;Y) stays high.
Claimed link to generalization via SGD noise.

Saxe et al. caveat to the compression story
?
Compression phase depends on saturating activations (tanh) and on the MI-binning estimator.
With ReLU/linear nets, compression often doesn't appear yet they still generalize → not a universal cause of generalization.

What is the Deep Variational IB (VIB)?
?
Makes IB tractable for deep nets using variational bounds:
lower bound on I(T;Y), upper bound on I(X;T) (via a prior).
Trained with a stochastic encoder + reparameterization; objective resembles a β-VAE loss.

## 6D: Neural MI

Why is mutual information hard to estimate?
?
MI needs the joint/marginal densities or their ratio.
In high dimensions with finite samples these are hard to estimate → estimators have high bias and variance.
Motivates variational lower bounds.

Donsker-Varadhan bound (basis of MINE)
?
I(X;Y) ≥ E_p(x,y)[T] − log E_p(x)p(y)[e^T], maximized over a neural critic T.
MINE = Mutual Information Neural Estimation; tight but high-variance, with finite-batch bias from the log-of-expectation.

InfoNCE and its log N ceiling
?
InfoNCE is a contrastive lower bound on MI, low-variance but biased low.
It saturates at log N (N = positives + negatives), so it cannot certify MI > log(batch size).

Bias/variance among MI estimators
?
DV/MINE: tight target but high variance + finite-batch bias.
NWJ: lower bound via e^{T−1}, unbiased estimate of the bound.
InfoNCE: stable, low-variance, but underestimates large MI (≤ log N).

Tschannen et al. critique of MI-maximization
?
Downstream representation quality does NOT track the amount of MI estimated.
Tighter MI bounds can yield worse representations → inductive biases (encoder, critic architecture) matter more than the MI value.

## 6E: VAEs & Compression

ELBO as rate + distortion
?
−ELBO = distortion + rate.
Distortion = −E_q[log p(x|z)] (reconstruction cost).
Rate = KL(q(z|x)‖p(z)) (bits to encode latent).
Gives a rate-distortion view of the VAE.

β-VAE and 'Fixing a Broken ELBO'
?
Objective: distortion + β·rate.
Equal ELBO can hide very different (rate, distortion) points (ELBO is degenerate).
Sweeping β moves along the R-D frontier, controlling latent usage vs posterior collapse.

What is posterior collapse (R-D view)?
?
Rate KL(q(z|x)‖p(z)) → 0, so I(x;z) ≈ 0 and the latent is unused.
A powerful decoder still reconstructs without z.
It's the low-rate degenerate corner of the R-D plane.

Bits-back / BB-ANS coding
?
Lossless scheme: recover the bits used to sample z ~ q(z|x) on the decoder side ('get them back').
Effective rate approaches the negative ELBO (marginal description length).
BB-ANS implements it with Asymmetric Numeral Systems.

Learned compression as nonlinear transform coding
?
Learned encoder = nonlinear analysis transform (replaces fixed linear DCT of JPEG).
Latent is quantized + entropy-coded under a learned prior; decoder = synthesis transform.
Train to minimize rate (latent entropy) + λ·distortion.

## 6F: Information Theory in Modern LLMs

What is an LLM's training loss, information-theoretically, and what is its floor?
?
Loss = cross-entropy H(p, q_θ) = H(p) + D(p‖q_θ), the average bits/nats to describe the next token.
Floor = H(p), the entropy rate of text (1C). Scaling removes D(p‖q_θ); the loss can never beat H(p).

Why report loss in bits-per-byte (BPB) instead of per-token?
?
Per-token loss is unfair across tokenizers: how much information each token carries depends on how the tokenizer slices the text.
BPB = total bits / total raw bytes is tokenizer-independent, putting byte-level models, BPE models, and gzip on one axis.

Define perplexity and its meaning.
?
PPL = 2^(cross-entropy loss in bits).
It is the effective branching factor — the effective number of equally-likely tokens chosen per step.
Perfect model → 1; uniform over V → V; floor = 2^H(p).

Neural scaling law L(N) = E + A/N^α — what are the two terms?
?
E = irreducible loss = entropy rate H(p) of text (the asymptote no scale can beat).
A/N^α = reducible loss = model-wrongness D(p‖q_θ), a straight line on log-log.
The whole curve is a compression curve bottoming out at the source's entropy.

In what sense is "language modeling = compression"? (Delétang et al. 2023)
?
Any next-token predictor + arithmetic coder (2C) is a lossless compressor.
Expected codelength = the model's cross-entropy H(p, q_θ).
Better model = lower cross-entropy = fewer bits, so a strong LM beats gzip on text.

What does sampling temperature T control?
?
q_T(i) ∝ exp(z_i / T): T is a dial on the entropy of the output distribution.
T → 0: greedy/argmax, entropy → 0, effective vocab → 1.
T → ∞: uniform, entropy → log₂ V, effective vocab → V. (Softmax-as-maxent of 6A, with a knob.)

How is BPE tokenization understood information-theoretically?
?
As dictionary coding (the Lempel-Ziv idea of 2D): greedily merge the most frequent adjacent pair into a new symbol.
It pre-compresses text into denser units of common chunks; the dictionary does part of the compression, the model does the rest.

What does speculative decoding guarantee about its output?
?
A cheap draft model proposes k tokens; the target model verifies them in one parallel pass via a rejection-sampling test.
The emitted tokens are distributed exactly as if sampled from the target alone — provably distribution-preserving, with fewer big-model passes.
