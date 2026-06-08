#flashcards/part0

## 0A: Orientation & Notation

What is a 'bit' as a unit of information?
?
The information gained from answering one yes/no question with two equally likely outcomes.
It is the natural unit when uncertainty is measured with log₂.

Log base ↔ information unit
?
log₂ → bits
ln (base e) → nats
log₁₀ → bans (hartleys)

How many bits is 1 nat? (and how to convert)
?
1 nat = log₂(e) ≈ 1.4427 bits.
bits → nats: multiply by ln2 ≈ 0.6931.
nats → bits: multiply by 1.4427.

What are the three pillars of the course?
?
1. Classical core: entropy, mutual information, channel capacity.
2. Practical coding: compression + error correction.
3. Information theory for machine learning.

Why measure uncertainty in bits?
?
Because the number of bits equals the average number of optimal yes/no questions needed to identify an outcome — exactly what log₂ counts.
