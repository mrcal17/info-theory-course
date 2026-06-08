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
    # 6A: Cross-Entropy, KL & Maximum Entropy

    > *"The fact that a certain probability distribution maximizes entropy subject to certain constraints representing our incomplete information, is the fundamental property which justifies use of that distribution for inference."*
    > — E. T. Jaynes

    You have spent five parts building the machinery — entropy, KL divergence, mutual information, codes, channels. Now we cash it in. **Every time you train a classifier, you are doing information theory.** The cross-entropy loss is not a convenient invention; it is the average codelength you pay for using your model's beliefs to describe reality. Maximum-likelihood estimation is not a separate principle; it is minimizing a KL divergence. And the softmax layer at the end of your network is not an arbitrary squashing function; it is the *unique* maximum-entropy distribution consistent with linear features.

    This module is the hinge between classical information theory and machine learning. You already know KL divergence from 1B and the maximum-entropy property of the uniform distribution from 1A — here we generalize both into the two ideas that quietly run all of supervised learning and a great deal of statistical modeling.

    We will show that **cross-entropy is the classification loss**, that **fitting a model = minimizing $D(\hat p \,\|\, q_\theta)$**, that **label smoothing is entropy regularization**, and then turn the whole thing around with the **maximum-entropy principle**: given only what you know (some moments, some constraints), the least-presumptuous distribution is the one with the most entropy. That principle hands you the exponential families — Gaussians, Bernoullis, softmax, logistic regression — all at once.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 1. Cross-Entropy: The Cost of Describing Truth With a Wrong Model

    Recall from 1B the **cross-entropy** between a true distribution $p$ and a model $q$:

    $$H(p, q) \;=\; -\sum_{x} p(x)\,\log_2 q(x) \;=\; \mathbb{E}_{x\sim p}\!\left[\log_2 \frac{1}{q(x)}\right].$$

    Read it exactly as before: $\log_2 \tfrac{1}{q(x)}$ is the codelength you assign to symbol $x$ when you *believe* the distribution is $q$, and $H(p,q)$ averages that codelength over reality $p$. If your model is perfect ($q = p$) this collapses to the entropy $H(p)$ — the irreducible floor. If your model is wrong you pay more. The decomposition from 1B makes the penalty explicit:

    $$\boxed{\,H(p, q) \;=\; H(p) \;+\; D(p \,\|\, q)\,}$$

    Cross-entropy = the entropy you would pay even with a perfect model, **plus** the KL divergence you waste for being wrong. Since $D(p\|q) \ge 0$ with equality iff $q = p$ (Gibbs' inequality), cross-entropy is minimized exactly when your model matches reality, and its minimum value is $H(p)$.

    **Worked example.** Truth $p = (0.7, 0.3)$, model $q = (0.5, 0.5)$:

    $$H(p, q) = -0.7\log_2 0.5 - 0.3\log_2 0.5 = 0.7 + 0.3 = 1.0 \text{ bit.}$$

    Meanwhile $H(p) = -0.7\log_2 0.7 - 0.3\log_2 0.3 \approx 0.881$ bits, so $D(p\|q) = 1.0 - 0.881 \approx 0.119$ bits. You pay about a tenth of a bit per sample for believing a $70/30$ coin is fair.

    > [Cover & Thomas Ch 2.3](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) defines relative entropy and cross-entropy; [MacKay Ch 2](https://www.inference.org.uk/itprnn/book.pdf) gives the codelength intuition.
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

        def cross_entropy(p, q, base=2):
            p = np.asarray(p, dtype=float)
            q = np.asarray(q, dtype=float)
            _m = p > 0
            return float(-np.sum(p[_m] * np.log(q[_m])) / np.log(base))

        def kl(p, q, base=2):
            p = np.asarray(p, dtype=float)
            q = np.asarray(q, dtype=float)
            _m = p > 0
            return float(np.sum(p[_m] * np.log(p[_m] / q[_m])) / np.log(base))

        _p = np.array([0.7, 0.3])
        _q = np.array([0.5, 0.5])

        print("=== Cross-entropy = entropy + KL ===")
        print(f"  truth p = {_p},  model q = {_q}")
        print(f"  H(p)          = {entropy(_p):.4f} bits   (irreducible floor)")
        print(f"  D(p || q)     = {kl(_p, _q):.4f} bits   (wrongness penalty)")
        print(f"  H(p, q)       = {cross_entropy(_p, _q):.4f} bits   (what you pay)")
        print(f"  H(p) + D(p||q)= {entropy(_p) + kl(_p, _q):.4f} bits   (matches H(p,q))")

        print("\n=== A perfect model pays only the floor ===")
        print(f"  H(p, p) = {cross_entropy(_p, _p):.4f}  ==  H(p) = {entropy(_p):.4f}")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 2. Cross-Entropy *Is* the Classification Loss

    Now the payoff. In multi-class classification, each labelled example $(\mathbf{x}, y)$ has a *true* label distribution that is a **one-hot** vector: $p = \mathbf{e}_y$, all mass on the correct class $y$. Your network outputs a predicted distribution $q_\theta(\cdot \mid \mathbf{x})$ over classes (the softmax). Plug a one-hot $p$ into the cross-entropy and almost every term vanishes:

    $$H(p, q_\theta) \;=\; -\sum_{c} p(c)\,\log q_\theta(c \mid \mathbf{x}) \;=\; -\log q_\theta(y \mid \mathbf{x}).$$

    That is the **negative log-likelihood of the correct class** — exactly the loss every deep-learning framework calls "cross-entropy loss." (Frameworks use $\ln$, i.e. nats; the choice of base only rescales the loss by a constant $\log 2$.) Averaging over a dataset $\{(\mathbf{x}_i, y_i)\}_{i=1}^N$:

    $$\mathcal{L}(\theta) \;=\; \frac{1}{N}\sum_{i=1}^{N} -\log q_\theta(y_i \mid \mathbf{x}_i).$$

    Minimizing this *is* training. Three things are worth feeling in your bones:

    - When the model is **confident and right** ($q_\theta(y\mid\mathbf{x}) \to 1$), the loss $\to 0$.
    - When the model is **confident and wrong** ($q_\theta(y\mid\mathbf{x}) \to 0$), the loss $\to +\infty$. Cross-entropy *savagely* punishes confident mistakes — that asymmetry is why it trains so much better than squared error for classification.
    - The gradient with respect to the softmax logits is the beautifully simple $q_\theta - p$ (predicted minus true) — derived in Section 6.

    The widget below shows the loss surface for a single binary example. Drag the predicted probability of the true class and watch the loss explode as you become confidently wrong.

    > [MacKay Ch 39–41](https://www.inference.org.uk/itprnn/book.pdf) treats classifiers as probabilistic models; [Cover & Thomas Ch 12](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) connects cross-entropy and maximum likelihood.
    """)
    return


@app.cell
def _(mo):
    true_class = mo.ui.dropdown(
        options=["class 0 is correct", "class 1 is correct"],
        value="class 1 is correct",
        label="true label",
    )
    pred_prob = mo.ui.slider(start=0.01, stop=0.99, step=0.01, value=0.6,
                             label="q = model's P(class 1)")
    mo.hstack([true_class, pred_prob])
    return pred_prob, true_class


@app.cell
def _(pred_prob, true_class):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _y = 0 if true_class.value.startswith("class 0") else 1
        _q1 = pred_prob.value
        _q = np.array([1 - _q1, _q1])

        _q1_grid = np.linspace(0.001, 0.999, 500)
        if _y == 1:
            _loss_grid = -np.log2(_q1_grid)
        else:
            _loss_grid = -np.log2(1 - _q1_grid)
        _loss_now = -np.log2(_q[_y])

        _q_correct = _q[_y]

        _fig, (_ax1, _ax2) = plt.subplots(1, 2, figsize=(11, 4.2))

        _ax1.plot(_q1_grid, _loss_grid, lw=2, color="steelblue")
        _ax1.scatter([_q1], [_loss_now], color="red", zorder=5, s=70)
        _ax1.axvline(_q1, color="red", ls="--", alpha=0.4)
        _ax1.set_xlabel("q = model's P(class 1)")
        _ax1.set_ylabel("cross-entropy loss (bits)")
        _ax1.set_title(f"Loss surface  (true = class {_y})")
        _ax1.set_ylim(0, 7)
        _ax1.grid(True, alpha=0.3)
        _ax1.annotate(f"loss = {_loss_now:.3f} bits\n(p_correct = {_q_correct:.2f})",
                      xy=(_q1, _loss_now), xytext=(0.35, 0.7),
                      textcoords="axes fraction",
                      arrowprops=dict(arrowstyle="->", color="red", alpha=0.6))

        _colors = ["#888888", "#888888"]
        _colors[_y] = "seagreen"
        _ax2.bar([0, 1], _q, color=_colors, alpha=0.85)
        _ax2.set_xticks([0, 1])
        _ax2.set_xticklabels(["class 0", "class 1"])
        _ax2.set_ylim(0, 1)
        _ax2.set_ylabel("predicted probability")
        _ax2.set_title("model prediction (green = truth)")
        _ax2.grid(True, axis="y", alpha=0.3)

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 3. Maximum Likelihood = Minimizing KL(empirical ‖ model)

    Here is one of the cleanest bridges in all of statistics. Suppose you fit a parametric model $q_\theta$ to i.i.d. data $x_1, \dots, x_N$ by **maximum likelihood**:

    $$\hat\theta = \arg\max_\theta \frac{1}{N}\sum_{i=1}^N \log q_\theta(x_i) = \arg\min_\theta \;\Big(-\frac{1}{N}\sum_{i=1}^N \log q_\theta(x_i)\Big).$$

    Define the **empirical distribution** $\hat p(x) = \tfrac{1}{N}\sum_i \mathbb{1}[x_i = x]$ — just the histogram of your data. Then the average negative log-likelihood is a cross-entropy:

    $$-\frac{1}{N}\sum_{i=1}^N \log q_\theta(x_i) \;=\; -\sum_x \hat p(x)\,\log q_\theta(x) \;=\; H(\hat p, q_\theta) \;=\; H(\hat p) + D(\hat p \,\|\, q_\theta).$$

    The term $H(\hat p)$ does **not** depend on $\theta$. So maximizing likelihood is *identical* to minimizing the KL divergence from the data's empirical distribution to your model:

    $$\boxed{\;\hat\theta_{\text{MLE}} \;=\; \arg\min_\theta\; D(\hat p \,\|\, q_\theta)\;}$$

    This is why MLE works and what it secretly optimizes: it finds the model that is **information-theoretically closest** to the data you actually saw. As $N \to \infty$ the empirical $\hat p$ converges to the true $p$, so MLE drives $q_\theta$ toward $p$ in KL — the consistency of maximum likelihood, read off in one line.

    The demo fits a categorical model to samples by both routes — direct MLE (the histogram) and numerically minimizing KL — and confirms they land on the same answer.

    > [Cover & Thomas Ch 11.1 & Ch 12](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) on the method of types and maximum entropy; [Polyanskiy & Wu](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf) frames learning as KL minimization.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _rng = np.random.default_rng(7)
        _true_p = np.array([0.5, 0.3, 0.15, 0.05])
        _K = len(_true_p)
        _N = 4000
        _samples = _rng.choice(_K, size=_N, p=_true_p)

        _counts = np.bincount(_samples, minlength=_K)
        _phat = _counts / _N

        def kl(p, q, base=2):
            _m = p > 0
            return float(np.sum(p[_m] * np.log(p[_m] / q[_m])) / np.log(base))

        _best_kl = np.inf
        _best_q = None
        for _ in range(60000):
            _q = _rng.random(_K)
            _q = _q / _q.sum()
            _d = kl(_phat, _q)
            if _d < _best_kl:
                _best_kl = _d
                _best_q = _q

        print("=== MLE for a categorical model ===")
        print(f"  true p                = {np.round(_true_p, 4)}")
        print(f"  empirical p_hat (MLE) = {np.round(_phat, 4)}")
        print(f"  KL-minimizing q       = {np.round(_best_q, 4)}")
        print(f"  min KL(p_hat || q)    = {_best_kl:.5f} bits  (random-search residual; analytic optimum is q = p_hat)")
        print("\nThe analytic MLE for a categorical IS the histogram p_hat,")
        print("and minimizing KL(p_hat || q) over all q recovers exactly that.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 4. Label Smoothing Is Entropy Regularization

    One-hot targets ask the network to drive $q_\theta(y\mid\mathbf{x}) \to 1$, i.e. to push its logits to $\pm\infty$. That makes models **overconfident** and hurts calibration. **Label smoothing** is the standard fix: instead of a one-hot target $p = \mathbf{e}_y$, train against a softened target that mixes in a little uniform mass,

    $$p^{\text{LS}}(c) \;=\; (1-\varepsilon)\,\mathbb{1}[c = y] \;+\; \frac{\varepsilon}{K},$$

    for $K$ classes and a small $\varepsilon$ (e.g. $0.1$). The cross-entropy against this smoothed target splits into two pieces:

    $$H(p^{\text{LS}}, q_\theta) \;=\; (1-\varepsilon)\big(\!-\log q_\theta(y)\big) \;+\; \frac{\varepsilon}{K}\sum_{c}\big(\!-\log q_\theta(c)\big).$$

    The first term is the usual NLL; the second is (up to a constant) the **cross-entropy from the uniform distribution to the model**, which is minimized by spreading probability mass out. Equivalently, minimizing $H(p^{\text{LS}}, q_\theta)$ is the same as minimizing $D(p^{\text{LS}}\|q_\theta)$, and that KL is smallest when $q_\theta = p^{\text{LS}}$ — a target that *keeps a floor of $\varepsilon/K$ on every class*. So label smoothing actively prevents the predicted distribution from collapsing to a spike: it is an **entropy regularizer**, penalizing low-entropy (overconfident) predictions.

    The demo shows what the optimal prediction looks like with and without smoothing, and confirms the smoothed target has strictly higher entropy.

    > [Cover & Thomas Ch 12](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) on maximum entropy as "assume the least"; the same logic underlies why smoothing helps.
    """)
    return


@app.cell
def _(mo):
    smooth_eps = mo.ui.slider(start=0.0, stop=0.5, step=0.02, value=0.1,
                              label="ε = label-smoothing strength")
    smooth_eps
    return (smooth_eps,)


@app.cell
def _(smooth_eps):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _K = 6
        _y = 2
        _eps = smooth_eps.value

        _onehot = np.zeros(_K)
        _onehot[_y] = 1.0
        _smoothed = (1 - _eps) * _onehot + _eps / _K

        def entropy(p, base=2):
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        _H_one = entropy(_onehot)
        _H_smooth = entropy(_smoothed)

        _fig, (_a1, _a2) = plt.subplots(1, 2, figsize=(11, 4), sharey=True)
        _idx = np.arange(_K)

        _c1 = ["#888888"] * _K
        _c1[_y] = "seagreen"
        _a1.bar(_idx, _onehot, color=_c1, alpha=0.85)
        _a1.set_title(f"one-hot target   H = {_H_one:.3f} bits")
        _a1.set_xlabel("class")
        _a1.set_ylabel("target probability")
        _a1.set_ylim(0, 1.05)
        _a1.grid(True, axis="y", alpha=0.3)

        _c2 = ["#888888"] * _K
        _c2[_y] = "seagreen"
        _a2.bar(_idx, _smoothed, color=_c2, alpha=0.85)
        _a2.axhline(_eps / _K, color="crimson", ls="--", alpha=0.6,
                    label=f"floor ε/K = {_eps/_K:.3f}")
        _a2.set_title(f"smoothed target (ε={_eps:.2f})   H = {_H_smooth:.3f} bits")
        _a2.set_xlabel("class")
        _a2.set_ylim(0, 1.05)
        _a2.legend(loc="upper right")
        _a2.grid(True, axis="y", alpha=0.3)

        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        _K = 6
        _y = 2
        print("=== Label smoothing raises target entropy ===")
        print(f"{'eps':>6} | {'H(target) bits':>15} | {'floor eps/K':>12}")
        for _eps in [0.0, 0.05, 0.1, 0.2, 0.4]:
            _t = np.full(_K, _eps / _K)
            _t[_y] += (1 - _eps)
            print(f"{_eps:6.2f} | {entropy(_t):15.4f} | {_eps/_K:12.4f}")
        print("\nHigher entropy targets = less confident = better calibrated.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 5. The Maximum-Entropy Principle

    Now we turn the whole story inside out. So far we measured the cost of a *given* model. But where should a model come from in the first place? Jaynes' answer is the **maximum-entropy principle**:

    > *Among all distributions consistent with what you know, choose the one with the highest entropy.*

    Why? Entropy measures uncertainty (1A). A distribution with *less* than the maximal entropy has smuggled in assumptions beyond your stated constraints — it commits to structure you have no evidence for. The maximum-entropy distribution is the **least presumptuous** one: maximally honest about your ignorance while exactly honoring your knowledge.

    The constraints are usually **moment constraints** — you know certain expected values (a mean, a variance, a set of feature averages). Formally: maximize $H(p) = -\sum_x p(x)\log p(x)$ subject to

    $$\sum_x p(x) = 1 \qquad\text{and}\qquad \sum_x p(x)\,f_k(x) = \mu_k \quad (k = 1, \dots, m).$$

    Solve with **Lagrange multipliers**. The Lagrangian is $\mathcal{L} = -\sum_x p\log p + \lambda_0(\sum p - 1) + \sum_k \lambda_k(\sum p f_k - \mu_k)$. Setting $\partial\mathcal{L}/\partial p(x) = 0$ gives $-\log p(x) - 1 + \lambda_0 + \sum_k \lambda_k f_k(x) = 0$, so

    $$\boxed{\;p^\star(x) \;=\; \frac{1}{Z}\exp\!\Big(\textstyle\sum_k \lambda_k\, f_k(x)\Big)\;}$$

    with $Z = \sum_x \exp(\sum_k \lambda_k f_k(x))$ the **partition function** chosen so probabilities sum to 1. The multipliers $\lambda_k$ are tuned so the constraints $\mathbb{E}[f_k] = \mu_k$ hold. This is an **exponential family** — and it drops out *automatically* from "assume the least."

    **Famous special cases** (all maxent for their constraints):

    - **No constraints** (just normalization) $\Rightarrow$ the **uniform** distribution. (We proved this in 1A: uniform maximizes entropy.)
    - **Fixed mean** on $\{0,1,2,\dots\}$ $\Rightarrow$ the **geometric** distribution; on a finite support it is the corresponding truncated discrete exponential.
    - **Fixed mean and variance** on $\mathbb{R}$ $\Rightarrow$ the **Gaussian** $\mathcal{N}(\mu,\sigma^2)$.
    - **Fixed mean** on $[0,\infty)$ $\Rightarrow$ the **exponential** distribution.

    > [Cover & Thomas Ch 12](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) is the definitive treatment of maximum entropy and exponential families; [MacKay Ch 22–23](https://www.inference.org.uk/itprnn/book.pdf) covers maxent and inference; [Polyanskiy & Wu](https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf) develops the variational view.
    """)
    return


@app.cell
def _(mo):
    mean_constraint = mo.ui.slider(start=1.0, stop=5.5, step=0.1, value=2.5,
                                   label="target mean E[X]  (die faces 1..6)")
    mean_constraint
    return (mean_constraint,)


@app.cell
def _(mean_constraint):
    def _run():
        import numpy as np
        import logging
        logging.getLogger("matplotlib").setLevel(logging.ERROR)
        logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
        import matplotlib.pyplot as plt

        _faces = np.arange(1, 7)
        _target_mean = mean_constraint.value

        def _maxent_lambda(target_mean):
            _lam = 0.0
            for _ in range(200):
                _w = np.exp(_lam * _faces)
                _p = _w / _w.sum()
                _mean = float(np.sum(_p * _faces))
                _var = float(np.sum(_p * (_faces - _mean) ** 2))
                if _var < 1e-12:
                    break
                _lam += (target_mean - _mean) / _var
            _w = np.exp(_lam * _faces)
            return _w / _w.sum(), _lam

        _p, _lam = _maxent_lambda(_target_mean)
        _achieved = float(np.sum(_p * _faces))
        _H = float(-np.sum(_p[_p > 0] * np.log2(_p[_p > 0])))
        _uniform = np.full(6, 1 / 6)

        _fig, _ax = plt.subplots(figsize=(7.5, 4.3))
        _ax.bar(_faces - 0.18, _uniform, width=0.36, color="#bbbbbb",
                alpha=0.8, label="uniform (no constraint)")
        _ax.bar(_faces + 0.18, _p, width=0.36, color="darkorange",
                alpha=0.9, label="maxent | E[X] fixed")
        _ax.axvline(_target_mean, color="crimson", ls="--", alpha=0.6,
                    label=f"target mean = {_target_mean:.2f}")
        _ax.set_xlabel("die face x")
        _ax.set_ylabel("probability")
        _ax.set_xticks(_faces)
        _ax.set_ylim(0, 0.6)
        _ax.set_title(f"Max-entropy distribution   λ={_lam:.3f}   "
                      f"E[X]={_achieved:.2f}   H={_H:.3f} bits")
        _ax.legend(loc="upper center", fontsize=9)
        _ax.grid(True, axis="y", alpha=0.3)
        plt.tight_layout()
        return _fig

    _run()
    return


@app.cell
def _():
    def _run():
        import numpy as np

        _faces = np.arange(1, 7)

        def maxent_given_mean(target_mean, support, iters=300):
            _lam = 0.0
            for _ in range(iters):
                _w = np.exp(_lam * support)
                _p = _w / _w.sum()
                _mean = float(np.sum(_p * support))
                _var = float(np.sum(_p * (support - _mean) ** 2))
                if _var < 1e-12:
                    break
                _lam += (target_mean - _mean) / _var
            _w = np.exp(_lam * support)
            return _w / _w.sum(), _lam

        def entropy(p, base=2):
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        print("=== Maxent over a die, given a target mean ===")
        print(f"{'target':>7} | {'lambda':>8} | {'achieved E[X]':>13} | {'H (bits)':>9}")
        for _tm in [3.5, 4.5, 2.0, 5.0]:
            _p, _lam = maxent_given_mean(_tm, _faces)
            _e = float(np.sum(_p * _faces))
            print(f"{_tm:7.2f} | {_lam:8.4f} | {_e:13.4f} | {entropy(_p):9.4f}")
        print("\nAt target=3.5 the solution is uniform (lambda=0, H=log2 6=2.585):")
        _p, _lam = maxent_given_mean(3.5, _faces)
        print(f"  p = {np.round(_p, 4)}   (uniform, as expected)")
        print("\nNote the maxent form p(x) ∝ exp(lambda*x) is a truncated discrete exponential —")
        print("the bounded-support cousin of the geometric distribution.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## 6. Softmax & Logistic Regression Are Maximum-Entropy Models

    The maximum-entropy form $p(x) \propto \exp(\sum_k \lambda_k f_k(x))$ is not an abstraction — **it is the softmax**. Suppose you want a conditional model $p(y \mid \mathbf{x})$ over $K$ classes, and the only thing you insist on is that the model match the data's average feature values per class (constraints of the form $\mathbb{E}[f_k(\mathbf{x}, y)] = \hat{\mathbb{E}}[f_k]$). Maximum entropy subject to those linear feature constraints gives, by exactly the Lagrange argument of Section 5,

    $$p(y \mid \mathbf{x}) \;=\; \frac{\exp\!\big(\mathbf{w}_y^\top \mathbf{x}\big)}{\sum_{c=1}^{K} \exp\!\big(\mathbf{w}_c^\top \mathbf{x}\big)} \;=\; \mathrm{softmax}(\mathbf{W}\mathbf{x})_y.$$

    The Lagrange multipliers $\mathbf{w}_c$ become the **weights**, the features become the inputs, and the partition function becomes the softmax denominator. For $K = 2$ this collapses to the **logistic (sigmoid)** function $\sigma(\mathbf{w}^\top\mathbf{x}) = 1/(1 + e^{-\mathbf{w}^\top\mathbf{x}})$. So:

    > **Logistic regression and softmax classifiers are the maximum-entropy conditional distributions consistent with linear feature constraints.** Training them by cross-entropy/MLE finds the multipliers that make the constraints hold.

    This closes the loop with stunning economy. The *loss* (cross-entropy, Section 2) and the *model* (softmax, this section) are two faces of one coin: minimizing cross-entropy over the maximum-entropy family is precisely fitting the Lagrange multipliers so the model's expected features match the data's. And the gradient is the famous $\nabla_{\text{logit}} = q_\theta - p$ — "predicted minus true" — which we verify numerically below against a finite-difference gradient.

    > [Cover & Thomas Ch 12](https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X) derives the exponential family from maxent; [MacKay Ch 39–41](https://www.inference.org.uk/itprnn/book.pdf) treats logistic regression as a probabilistic model.
    """)
    return


@app.cell
def _():
    def _run():
        import numpy as np

        def softmax(z):
            z = z - np.max(z)
            _e = np.exp(z)
            return _e / _e.sum()

        def ce_loss(logits, y):
            _q = softmax(logits)
            return float(-np.log(_q[y]))

        _rng = np.random.default_rng(3)
        _K = 5
        _logits = _rng.normal(size=_K)
        _y = 2

        _q = softmax(_logits)
        _p = np.zeros(_K)
        _p[_y] = 1.0
        _analytic_grad = _q - _p

        _eps = 1e-6
        _num_grad = np.zeros(_K)
        for _k in range(_K):
            _lp = _logits.copy(); _lp[_k] += _eps
            _lm = _logits.copy(); _lm[_k] -= _eps
            _num_grad[_k] = (ce_loss(_lp, _y) - ce_loss(_lm, _y)) / (2 * _eps)

        print("=== Softmax cross-entropy gradient = (predicted - true) ===")
        print(f"  logits          = {np.round(_logits, 4)}")
        print(f"  softmax q       = {np.round(_q, 4)}")
        print(f"  true one-hot p  = {_p.astype(int)}")
        print(f"  analytic q - p  = {np.round(_analytic_grad, 6)}")
        print(f"  finite-diff grad= {np.round(_num_grad, 6)}")
        print(f"  max abs error   = {np.max(np.abs(_analytic_grad - _num_grad)):.2e}")
        print("\nThe softmax IS the maxent distribution exp(w.x)/Z; the cross-entropy")
        print("gradient (q - p) nudges logits to make E[features] match the data.")

    _run()
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Why This Matters for Machine Learning

    This module *is* the information-theoretic spine of supervised learning. Everything you train touches at least one of these ideas:

    - **The default loss is cross-entropy** because it is the codelength penalty for a wrong model, and it equals negative log-likelihood. Minimizing it is minimizing $D(\hat p \| q_\theta)$ — pulling your model toward the data in bits. Squared error has no such interpretation for classification, which is exactly why cross-entropy dominates.
    - **MLE is KL minimization.** Every maximum-likelihood fit — from a single Gaussian to a 70-billion-parameter language model predicting the next token — is silently minimizing the divergence from the empirical to the model distribution. Language-model "perplexity" is just $2^{H(\hat p, q_\theta)}$, the cross-entropy exponentiated.
    - **Label smoothing, temperature, and entropy bonuses are all entropy regularization.** Adding $-\beta H(q_\theta)$ (or its cousins) to a loss is a direct dial on how confident the model is allowed to be — used in classification calibration, in knowledge distillation (soft targets), and in RL policies (the entropy bonus that keeps exploration alive).
    - **The maximum-entropy principle picks your model family.** Softmax, logistic regression, Boltzmann machines, conditional random fields, energy-based models, and the entire exponential family are maxent distributions for their constraints. "Assume the least" is not a slogan; it is a constructive recipe that hands you the model.
    - **Exponential families make optimization convex.** Because maxent models are log-linear, the cross-entropy loss is convex in their natural parameters — which is why logistic regression has a unique optimum and why the $q - p$ gradient is so clean.

    From here, **6B (MDL & Model Selection)** turns codelength into a principle for choosing model *complexity* — the description-length view of Occam's razor — and **6C (Information Bottleneck)** uses KL and mutual information to ask which parts of the input a representation should keep. The cross-entropy and KL you mastered here are the running currency of all of Part 6.
    """)
    return


@app.cell
def _(mo):
    mo.md(r"""
    ---

    ## Code It: Implementation Exercises

    Now it is your turn. Each exercise gives a problem and a skeleton — fill in the missing code. These reinforce the loss-as-information and maxent ideas at the heart of this module.
    """)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 1: Cross-Entropy = Entropy + KL

    Implement `cross_entropy(p, q)`, `entropy(p)`, and `kl(p, q)` (all in bits, handling zeros), then verify numerically that $H(p,q) = H(p) + D(p\|q)$ for a few random pairs of distributions.
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
        import numpy as np

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            # TODO: drop zeros, return -sum p log p / log base
            return ...

        def cross_entropy(p, q, base=2):
            p = np.asarray(p, dtype=float)
            q = np.asarray(q, dtype=float)
            # TODO: -sum p*log(q)/log(base), summing only where p>0
            return ...

        def kl(p, q, base=2):
            # TODO: cross_entropy(p, q) - entropy(p)
            return ...

        # _p = np.array([0.7, 0.2, 0.1]); _q = np.array([0.4, 0.4, 0.2])
        # print(cross_entropy(_p, _q), entropy(_p) + kl(_p, _q))   # expect equal

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 2: Classification Loss on One-Hot Labels

    For a one-hot true label and a predicted probability vector `q`, the cross-entropy collapses to $-\log q_y$. Implement it, and confirm it equals the full cross-entropy $-\sum_c p_c \log q_c$ when `p` is one-hot.
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
        import numpy as np

        def nll(q, y, base=2):
            # TODO: negative log-prob of the true class y (in bits)
            return ...

        q = np.array([0.1, 0.7, 0.2])
        y = 1

        # full cross-entropy with one-hot p:
        # p = np.zeros(3); p[y] = 1.0
        # full_ce = -np.sum(p[p>0] * np.log2(q[p>0]))
        # print(nll(q, y), full_ce)        # expect equal, ~0.5146

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 3: MLE Recovers the Empirical Distribution

    Draw `N` samples from a categorical with `K` outcomes. Form the empirical distribution `p_hat` (the histogram), then confirm that `p_hat` minimizes $D(\hat p \| q)$ over all `q` (its KL to itself is 0, and any perturbation raises it).
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
        import numpy as np

        rng = np.random.default_rng(0)
        true_p = np.array([0.5, 0.3, 0.2])
        N = 5000

        # TODO: sample N draws from true_p (hint: rng.choice with p=true_p)
        samples = ...

        # TODO: empirical distribution p_hat = counts / N  (hint: np.bincount)
        p_hat = ...

        def kl(p, q, base=2):
            _m = p > 0
            return float(np.sum(p[_m] * np.log(p[_m] / q[_m])) / np.log(base))

        # print("KL(p_hat || p_hat) =", kl(p_hat, p_hat))     # expect 0.0
        # _perturbed = p_hat + np.array([0.05, -0.05, 0.0])
        # print("KL(p_hat || perturbed) > 0 :", kl(p_hat, _perturbed))

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 4: Label Smoothing Raises Target Entropy

    Build the smoothed target $p^{LS}(c) = (1-\varepsilon)\,\mathbb{1}[c=y] + \varepsilon/K$ and confirm its entropy increases monotonically with $\varepsilon$ (for $\varepsilon$ up to where it equals uniform).
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
        import numpy as np

        def entropy(p, base=2):
            p = np.asarray(p, dtype=float)
            p = p[p > 0]
            return float(-np.sum(p * np.log(p)) / np.log(base))

        K = 5
        y = 0

        def smoothed_target(eps):
            # TODO: (1-eps)*onehot(y) + eps/K, length K
            return ...

        # for eps in [0.0, 0.1, 0.3, 0.5]:
        #     print(eps, entropy(smoothed_target(eps)))   # entropy should rise

    _run()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""
    ### Exercise 5: Maximum-Entropy Distribution Under a Mean Constraint

    Find the maximum-entropy distribution over faces $\{1,\dots,6\}$ with a target mean. The form is $p(x) \propto e^{\lambda x}$; tune $\lambda$ by Newton's method so $\mathbb{E}[X]$ hits the target. Confirm that target mean $3.5$ gives the uniform distribution ($\lambda = 0$).
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
        import numpy as np

        faces = np.arange(1, 7)

        def maxent_given_mean(target_mean, iters=200):
            lam = 0.0
            for _ in range(iters):
                # TODO: p ∝ exp(lam * faces), normalized
                p = ...
                mean = float(np.sum(p * faces))
                var = float(np.sum(p * (faces - mean) ** 2))
                # TODO: Newton step  lam += (target_mean - mean) / var
                ...
            w = np.exp(lam * faces)
            return w / w.sum(), lam

        # _p, _lam = maxent_given_mean(3.5)
        # print(np.round(_p, 4), _lam)         # expect ~uniform, lam ~ 0
        # _p, _lam = maxent_given_mean(4.5)
        # print(np.round(_p, 4), _lam, np.sum(_p*faces))   # mean ~ 4.5

    _run()
    return


if __name__ == "__main__":
    app.run()
