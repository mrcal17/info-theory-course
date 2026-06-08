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
