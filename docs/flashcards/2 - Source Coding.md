#flashcards/part2

## 2A: Source Coding Theorem

State the Kraft inequality and what it guarantees.
?
Σ 2^(-lᵢ) ≤ 1 (binary).
If satisfied, a prefix code with those lengths exists.
McMillan: all uniquely-decodable codes also obey it.

Order the three code classes from least to most restrictive.
?
Nonsingular ⊃ Uniquely decodable ⊃ Prefix (instantaneous).
Each is a strict subset of the previous.

What are Shannon code lengths and the resulting bound on L?
?
lᵢ = ⌈log₂(1/pᵢ)⌉.
Gives H ≤ L < H + 1 (within one bit of entropy).

Why is L ≥ H, and when is equality achieved?
?
Source coding theorem: no uniquely-decodable code beats entropy on average.
Equality iff every pᵢ is a power of 1/2 (dyadic), so lᵢ = log₂ 1/pᵢ is an integer.

Give an example of a nonsingular code that is NOT uniquely decodable.
?
{0, 1, 01}: all distinct, but '01' could be parsed as '01' or as '0','1'.

## 2B: Huffman Coding

Describe the Huffman merge rule.
?
Greedy bottom-up: repeatedly merge the two least-probable nodes into a parent (sum their probabilities) until one tree remains.

In what sense is Huffman optimal?
?
Minimum expected length among all symbol (per-symbol) prefix codes for a given distribution.
Not optimal vs arithmetic coding.

What is Huffman's integer-length limitation and its fix?
?
Each symbol needs ≥ 1 whole bit, so it can't match log₂ 1/p for skewed sources.
Fix: block/extended Huffman over n-symbol groups (overhead < 1/n).

Huffman expected length vs entropy bound?
?
H ≤ L < H + 1.
Gap → 0 as block size grows; large for highly skewed two-symbol sources.

Why does plain Huffman fail on p=0.99/0.01 source?
?
Two symbols force 1 bit each (L=1), but H ≈ 0.08 bits/symbol.
Need block or arithmetic coding to approach entropy.

## 2C: Arithmetic Coding

How does arithmetic coding represent an entire message?
?
As a single number lying within a subinterval of [0,1).
The interval is narrowed symbol by symbol; the width of the final interval ≈ the message's probability.

Code length achieved by arithmetic coding for a message of probability p
?
≈ −log₂ p bits.
Overhead is a small constant (≈2 bits) for the whole stream, not per symbol — so it approaches the entropy bound.

Why does arithmetic coding beat Huffman on skewed/adaptive sources?
?
No per-symbol integer rounding: it can spend a fraction of a bit per symbol.
Huffman's minimum codeword is 1 bit, wasting nearly a bit when a symbol has p close to 1.

What makes adaptive arithmetic coding possible without sending a probability table?
?
Encoder and decoder update the model identically, using only symbols already processed.
This keeps them synchronized and lets the model track non-stationary sources.

Range coding vs classic arithmetic coding
?
Range coding = arithmetic coding on a large integer range with byte-oriented renormalization.
Nearly identical compression, but faster/simpler on byte-based machines; emits whole bytes instead of single bits.

## 2D: Universal Compression

What is dictionary coding?
?
A compression approach that replaces repeated substrings with short references into a dictionary of previously seen data.
The dictionary is built adaptively from the input itself (LZ family), so no preset code table is needed.

LZ77: what is the sliding window and what does a token look like?
?
Sliding window = a bounded buffer of recently seen bytes used as the dictionary.
Token = (offset, length, next symbol): copy 'length' bytes starting 'offset' positions back, then output the next literal.
Match offsets are limited to the window size.

LZ78 / LZW: how is the dictionary grown?
?
LZ78: parse input into phrases; each new phrase = a previously stored phrase + one new symbol, added as a new entry.
LZW: start with all single symbols, emit the code for the longest match, then add (matched phrase + next symbol) to the dictionary.
No explicit window; the dictionary accumulates phrases.

What does 'universality' mean for LZ compression?
?
For a stationary ergodic source, the achieved rate → the entropy rate H as input length → ∞.
Key point: this happens WITHOUT knowing the source distribution in advance.
LZ adapts to the data, so it is asymptotically optimal for a broad class of sources.

Where are LZ algorithms used in the real world?
?
gzip / zlib / zip / PNG → DEFLATE = LZ77 + Huffman coding.
GIF and Unix 'compress' → LZW (an LZ78 variant).
PNG chose DEFLATE over LZW partly to avoid the LZW patent.
