#flashcards/part4

## 4A: Linear & Hamming Codes

What does GF(2) arithmetic look like (addition and multiplication)?
?
Addition = XOR: 0+0=0, 1+1=0, 0+1=1.
Multiplication = AND: 1·1=1, else 0.
Each element is its own additive inverse.

How does a systematic generator matrix G = [I | P] relate to H?
?
If G = [I_k | P] then H = [Pᵀ | I_(n−k)] over GF(2).
This guarantees G·Hᵀ = 0.

Steps of syndrome decoding
?
1. Compute s = H·rᵀ.
2. If s = 0, accept r as a codeword.
3. Else look up the coset leader (most likely error e) with that syndrome.
4. Decode as r − e.

Why does the Hamming(7,4) code correct exactly one error?
?
Its minimum distance is d = 3, so t = ⌊(3-1)/2⌋ = 1.
Each nonzero syndrome (3 bits) points to one of 7 error positions.

State the Hamming / sphere-packing bound and what 'perfect' means
?
2^k · Σ_{i=0}^{t} C(n,i) ≤ 2^n.
A perfect code meets it with equality: radius-t balls exactly tile GF(2)ⁿ. Hamming and Golay codes are perfect.

State the Gilbert–Varshamov (GV) bound and how it relates to the Hamming bound.
?
GV (achievability): a code with R ≥ 1 − H₂(δ) is guaranteed to exist (greedy/random construction; δ = d/n).
Hamming (converse): R ≤ 1 − H₂(δ/2).
The two sandwich the achievable rate region; real codes live in the gap between them.

Detection vs correction: what does minimum distance d buy you?
?
A distance-d code detects up to d − 1 errors but corrects only up to ⌊(d−1)/2⌋.
Detection reaches about twice as far per unit of distance — hence detect-and-resend (ARQ) when a return channel exists.

What burst-error guarantee does a degree-r CRC give, and how does it work?
?
A CRC is GF(2) polynomial long division by a degree-r generator g(x) (subtraction = XOR, no carries).
It catches every burst of length ≤ r: such a burst has degree < r and cannot be a multiple of g(x), so the remainder is nonzero.

What fraction of random errors escapes a degree-r CRC, and what is the r=1 case?
?
≈ 2^(−r): an undetected error must be a nonzero multiple of g(x), so a random pattern's remainder is zero with probability 2^(−r).
The parity bit is a CRC with r = 1, g(x) = x + 1 (remainder = XOR of all bits); catches any single flip, slips on even ones at 2^(−1).

## 4B: Reed-Solomon & BCH

How is GF(2^m) constructed?
?
Polynomials over GF(2) of degree < m, with multiplication reduced modulo a fixed irreducible degree-m polynomial.
2^m elements; nonzero ones are powers of a primitive α.

What is the Singleton bound and what does MDS mean?
?
Singleton: d ≤ n − k + 1.
MDS (Maximum Distance Separable) codes meet it with equality — Reed-Solomon codes are MDS.

Reed-Solomon as polynomial evaluation
?
Treat k message symbols as a degree-<k polynomial p(x); the codeword is p evaluated at n distinct field points.
Any k of the n evaluations uniquely recover p.

Error vs erasure correction budget for RS(n,k)
?
d − 1 = n − k.
Errors cost 2 each (location + value), erasures cost 1 each.
Correct if 2·errors + erasures ≤ n − k.

What does Berlekamp-Massey do in BCH/RS decoding?
?
Given the syndromes, it finds the shortest LFSR / error-locator polynomial σ(x).
Its roots locate the errors; then values are found (e.g. Forney).

## 4C: Convolutional & Turbo

What is the trellis of a convolutional code?
?
A time-indexed graph that unrolls the encoder's state diagram: each column is the set of encoder states at one time step, and edges (branches) show allowed state transitions, each labeled with the input bit and the corresponding output bits. Decoding = finding a path through the trellis.

State the core idea of the Viterbi algorithm.
?
Dynamic programming on the trellis:
- At each state keep only the single best (lowest-metric) incoming path = the survivor.
- Add branch metrics, compare, and select (add-compare-select).
- Trace back the final best survivor to recover the ML sequence.
Linear in length, exponential in memory.

What does SISO mean, and why does turbo decoding need it?
?
SISO = Soft-In/Soft-Out decoder. It takes soft (probabilistic, LLR) inputs and produces soft outputs (posterior/extrinsic LLRs) rather than hard bits. Turbo decoding needs SISO components (e.g. BCJR) so the two decoders can iteratively exchange reliability information instead of discarding it.

Define the extrinsic information exchanged in turbo decoding.
?
For each bit, extrinsic info is the new soft belief a decoder produces about that bit using the code constraints and OTHER bits' info, EXCLUDING the channel value and a priori input for that bit itself. Passing only extrinsic info (as LLRs) prevents a decoder from re-feeding its own prior belief, which keeps the iteration from collapsing.

Why are recursive (feedback) convolutional encoders used in turbo codes?
?
Recursive systematic convolutional (RSC) encoders turn most low-weight inputs into infinite/high-weight output sequences. Combined with the interleaver, this ensures that input patterns producing low-weight output in one encoder produce high-weight output in the other, raising the overall minimum distance and giving the steep BER 'waterfall'.

## 4D: LDPC & Polar

LDPC code: what does the parity-check matrix H look like and how is it decoded?
?
H is sparse (low-density): few 1s, small constant row/column weight even as n grows.
Decoded with iterative belief-propagation (sum-product) message passing on the Tanner graph.
Approaches the Shannon limit for long block lengths.

Tanner graph — definition and why it matters
?
Bipartite graph: variable (bit) nodes on one side, check nodes on the other; edge when H[i,j]=1.
BP messages flow along edges.
Girth (shortest cycle) matters: short cycles hurt BP; trees give exact marginals.

Sum-product (belief-propagation) decoding — what messages and what guarantee?
?
Iteratively passes beliefs (e.g. log-likelihood ratios) between variable and check nodes.
Variable nodes combine incoming evidence; check nodes enforce parity constraints.
Exact marginals only on cycle-free graphs; approximate on loopy LDPC graphs.

Density evolution & the BEC threshold
?
Density evolution: tracks the probability distribution of BP messages across iterations for an infinite-length code ensemble.
Threshold = worst channel noise for which error → 0.
On the BEC it collapses to a scalar erasure-probability recursion (a single fixed-point analysis).

Polar codes — polarization, bit placement, and key trait
?
Recursive channel combining + splitting polarizes subchannels toward perfect or useless as N → ∞.
Information bits on good subchannels; frozen (known) bits on bad ones.
First codes proven to achieve capacity with low-complexity (successive-cancellation) decoding.
