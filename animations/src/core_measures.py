from manim import *
import numpy as np


class EntropySurprise(Scene):
    """Self-information turning into entropy: the -log2(p) surprise curve, then
    entropy as the probability-weighted average of surprise, contrasting a fair
    coin (H=1) with a biased coin (H<1)."""

    def construct(self):
        title = Text("Surprise and Entropy", font_size=30)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.7)

        # --- Self-information curve: surprise = -log2(p) ---
        axes = Axes(
            x_range=[0, 1.02, 0.25],
            y_range=[0, 5, 1],
            x_length=5.6,
            y_length=3.6,
            axis_config={"include_numbers": False, "stroke_width": 1.5},
            tips=False,
        )
        axes.to_edge(LEFT, buff=0.7).shift(DOWN * 0.4)

        x_lab = Text("p", font_size=20, color=BLUE_B)
        x_lab.next_to(axes.x_axis, RIGHT, buff=0.15)
        y_lab = Text("surprise", font_size=18, color=YELLOW)
        y_lab.next_to(axes.y_axis, UP, buff=0.1)

        curve = axes.plot(
            lambda x: -np.log2(x),
            x_range=[0.03, 1.0, 0.005],
            color=YELLOW,
            stroke_width=3,
        )
        curve_eq = Text("surprise(p) = -log₂ p", font_size=22, color=YELLOW)
        curve_eq.next_to(axes, UP, buff=0.1)

        self.play(Create(axes), Write(x_lab), Write(y_lab), run_time=0.8)
        self.play(Create(curve), Write(curve_eq), run_time=1.0)

        # Pointer (dot + value) sweeping from high p (low surprise) to low p (high surprise)
        p_tracker = ValueTracker(0.9)

        def make_dot():
            p = p_tracker.get_value()
            return Dot(axes.c2p(p, -np.log2(p)), color=RED, radius=0.08)

        dot = always_redraw(make_dot)

        def make_drop():
            p = p_tracker.get_value()
            return DashedLine(
                axes.c2p(p, 0),
                axes.c2p(p, -np.log2(p)),
                color=RED,
                stroke_width=1.5,
                dash_length=0.06,
            )
        drop = always_redraw(make_drop)

        self.add(dot, drop)
        self.play(p_tracker.animate.set_value(0.9), run_time=0.2)
        self.play(p_tracker.animate.set_value(0.06), run_time=2.2, rate_func=smooth)
        grow_note = Text("rarer → more surprising", font_size=18, color=RED)
        grow_note.next_to(axes, DOWN, buff=0.25)
        self.play(FadeIn(grow_note, shift=UP * 0.2), run_time=0.6)
        self.wait(0.4)

        # --- Right side: entropy as weighted average of surprise ---
        ent_title = Text("Entropy = average surprise", font_size=22, color=GREEN_B)
        ent_title.to_edge(RIGHT, buff=0.6).shift(UP * 2.3)

        # Fair coin bars: two outcomes p=0.5 each
        def coin_bars(probs, base_x, color):
            grp = VGroup()
            bar_w = 0.55
            max_h = 2.0
            for i, p in enumerate(probs):
                bar = Rectangle(
                    width=bar_w,
                    height=max(max_h * p, 0.04),
                    fill_color=color,
                    fill_opacity=0.85,
                    stroke_color=WHITE,
                    stroke_width=1,
                )
                bar.move_to(base_x + RIGHT * (i * (bar_w + 0.25)), DOWN)
                lab = Text(f"{p:.2f}", font_size=15, color=WHITE)
                lab.next_to(bar, UP, buff=0.08)
                grp.add(VGroup(bar, lab))
            return grp

        base_y = DOWN * 0.9
        fair = coin_bars([0.5, 0.5], RIGHT * 2.1 + base_y, BLUE)
        biased = coin_bars([0.85, 0.15], RIGHT * 4.6 + base_y, ORANGE)

        fair_lab = Text("Fair coin", font_size=18, color=BLUE_B)
        fair_lab.next_to(fair, DOWN, buff=0.2)
        biased_lab = Text("Biased coin", font_size=18, color=ORANGE)
        biased_lab.next_to(biased, DOWN, buff=0.2)

        self.play(Write(ent_title), run_time=0.6)
        self.play(
            *[GrowFromEdge(b[0], DOWN) for b in fair],
            *[FadeIn(b[1]) for b in fair],
            Write(fair_lab),
            run_time=0.9,
        )

        # H of fair coin
        h_fair = Text("H = 0.5·1 + 0.5·1 = 1.00 bit", font_size=18, color=BLUE_B)
        h_fair.next_to(fair_lab, DOWN, buff=0.25)
        self.play(Write(h_fair), run_time=0.8)
        self.wait(0.3)

        self.play(
            *[GrowFromEdge(b[0], DOWN) for b in biased],
            *[FadeIn(b[1]) for b in biased],
            Write(biased_lab),
            run_time=0.9,
        )
        h_biased = Text("H ≈ 0.61 bit  (< 1)", font_size=18, color=ORANGE)
        h_biased.next_to(h_fair, DOWN, buff=0.18, aligned_edge=LEFT)
        self.play(Write(h_biased), run_time=0.8)
        self.wait(0.4)

        # Final caption
        caption = Text("H(X) = average surprise (bits)", font_size=26, color=GREEN_B)
        cap_bg = SurroundingRectangle(caption, color=GREEN_B, buff=0.18, stroke_width=2)
        cap_grp = VGroup(cap_bg, caption)
        cap_grp.to_edge(DOWN, buff=0.25)
        self.play(
            FadeOut(grow_note),
            FadeIn(cap_bg),
            Write(caption),
            run_time=1.0,
        )
        self.wait(1.2)


class MutualInfoDiagram(Scene):
    """Two overlapping circles H(X), H(Y): overlap = I(X;Y), left-only = H(X|Y),
    right-only = H(Y|X). Strong overlap (dependent) sliding apart to near-independent."""

    def construct(self):
        title = Text("Mutual Information", font_size=30)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.7)

        r = 2.0
        # Trackers control the horizontal offset of each circle from center
        offset = ValueTracker(0.9)  # small offset => strong overlap

        cx = always_redraw(
            lambda: Circle(radius=r, color=BLUE, stroke_width=3)
            .set_fill(BLUE, opacity=0.30)
            .move_to(LEFT * offset.get_value())
        )
        cy = always_redraw(
            lambda: Circle(radius=r, color=RED, stroke_width=3)
            .set_fill(RED, opacity=0.30)
            .move_to(RIGHT * offset.get_value())
        )

        hx_lab = always_redraw(
            lambda: Text("H(X)", font_size=24, color=BLUE_B).move_to(
                LEFT * (offset.get_value() + r * 0.62) + UP * (r * 0.55)
            )
        )
        hy_lab = always_redraw(
            lambda: Text("H(Y)", font_size=24, color=RED).move_to(
                RIGHT * (offset.get_value() + r * 0.62) + UP * (r * 0.55)
            )
        )

        self.play(Create(cx), Create(cy), run_time=1.0)
        self.play(FadeIn(hx_lab), FadeIn(hy_lab), run_time=0.6)
        self.wait(0.3)

        # Region labels (positioned for the strong-overlap configuration)
        i_lab = Text("I(X;Y)", font_size=22, color=YELLOW, weight=BOLD)
        i_lab.move_to(ORIGIN + DOWN * 0.0)
        i_sub = Text("shared", font_size=15, color=YELLOW)
        i_sub.next_to(i_lab, DOWN, buff=0.08)
        i_grp = VGroup(i_lab, i_sub)

        hxy_lab = Text("H(X|Y)", font_size=20, color=BLUE_B)
        hxy_lab.move_to(LEFT * 2.3 + DOWN * 0.1)

        hyx_lab = Text("H(Y|X)", font_size=20, color=RED)
        hyx_lab.move_to(RIGHT * 2.3 + DOWN * 0.1)

        self.play(FadeIn(i_grp, scale=0.6), run_time=0.7)
        self.play(Write(hxy_lab), Write(hyx_lab), run_time=0.8)
        self.wait(0.5)

        dep_note = Text("dependent → large I", font_size=20, color=YELLOW)
        dep_note.to_edge(DOWN, buff=0.5)
        self.play(FadeIn(dep_note), run_time=0.6)
        self.wait(0.6)

        # Slide apart toward near-independence: I -> 0
        indep_note = Text("near-independent → I → 0", font_size=20, color=GREY_A)
        indep_note.to_edge(DOWN, buff=0.5)

        # Keep conditional labels tracking the moving circle centers
        self.play(
            offset.animate.set_value(1.9),
            i_lab.animate.scale(0.55).set_opacity(0.6),
            i_sub.animate.set_opacity(0.0),
            hxy_lab.animate.move_to(LEFT * 2.6),
            hyx_lab.animate.move_to(RIGHT * 2.6),
            FadeOut(dep_note),
            FadeIn(indep_note),
            run_time=2.2,
            rate_func=smooth,
        )
        self.wait(0.6)

        # Final caption
        caption = Text("I(X;Y) = shared information", font_size=26, color=YELLOW)
        cap_bg = SurroundingRectangle(caption, color=YELLOW, buff=0.18, stroke_width=2)
        cap_grp = VGroup(cap_bg, caption)
        cap_grp.to_edge(DOWN, buff=0.25)
        self.play(FadeOut(indep_note), FadeIn(cap_bg), Write(caption), run_time=1.0)
        self.wait(1.2)


class TypicalSet(Scene):
    """A large square = all 2^n sequences; a small highlighted rectangle = the
    typical set (~2^{nH}). Sample dots almost all land inside the typical region."""

    def construct(self):
        title = Text("The Typical Set", font_size=30)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.7)

        # Big square = all possible sequences
        big = Square(side_length=5.2, color=GREY_B, stroke_width=2.5)
        big.set_fill(GREY_E, opacity=0.5)
        big.shift(DOWN * 0.4 + LEFT * 1.6)
        big_lab = Text("all 2ⁿ sequences", font_size=20, color=GREY_A)
        big_lab.next_to(big, UP, buff=0.12)

        self.play(Create(big), Write(big_lab), run_time=1.0)
        self.wait(0.3)

        # Small typical-set rectangle inside
        typ = Rectangle(width=1.4, height=1.0, color=GREEN, stroke_width=3)
        typ.set_fill(GREEN, opacity=0.35)
        typ.move_to(big.get_center() + RIGHT * 0.4 + UP * 0.3)
        typ_lab = Text("typical set\n≈ 2ⁿᴴ", font_size=18, color=GREEN_B, line_spacing=0.8)
        typ_lab.move_to(typ.get_center())

        self.play(Create(typ), run_time=0.8)
        self.play(Write(typ_lab), run_time=0.7)

        frac_note = Text("a tiny fraction of the\nwhole space", font_size=18,
                         color=GREEN_B, line_spacing=0.8)
        frac_note.to_edge(RIGHT, buff=0.5).shift(UP * 0.6)
        arrow = Arrow(frac_note.get_left(), typ.get_right(), color=GREEN_B,
                      stroke_width=2.5, buff=0.15)
        self.play(FadeIn(frac_note), GrowArrow(arrow), run_time=0.8)
        self.wait(0.4)

        # Sample dots: most land inside the typical rectangle
        rng = np.random.default_rng(0)
        n_inside = 27
        n_outside = 3

        tc = typ.get_center()
        tw, th = typ.width / 2 - 0.12, typ.height / 2 - 0.12

        inside_pts = []
        for _ in range(n_inside):
            px = tc[0] + rng.uniform(-tw, tw)
            py = tc[1] + rng.uniform(-th, th)
            inside_pts.append(np.array([px, py, 0.0]))

        # Outside points: somewhere in the big square but not in typ
        bc = big.get_center()
        bs = big.side_length / 2 - 0.25
        outside_pts = []
        while len(outside_pts) < n_outside:
            px = bc[0] + rng.uniform(-bs, bs)
            py = bc[1] + rng.uniform(-bs, bs)
            if abs(px - tc[0]) > tw + 0.35 or abs(py - tc[1]) > th + 0.35:
                outside_pts.append(np.array([px, py, 0.0]))

        inside_dots = VGroup(*[Dot(p, radius=0.05, color=YELLOW) for p in inside_pts])
        outside_dots = VGroup(*[Dot(p, radius=0.05, color=GREY_A) for p in outside_pts])

        self.play(
            LaggedStart(*[FadeIn(d, scale=0.4) for d in inside_dots], lag_ratio=0.06),
            run_time=2.2,
        )
        self.play(
            LaggedStart(*[FadeIn(d, scale=0.4) for d in outside_dots], lag_ratio=0.2),
            run_time=0.8,
        )
        self.wait(0.4)

        # Flash the typical set to emphasize concentration of probability
        self.play(Indicate(typ, color=GREEN, scale_factor=1.15), run_time=0.8)

        # Caption
        caption = Text(
            "typical set ≈ 2ⁿᴴ sequences — a vanishing fraction,\nyet ~all the probability",
            font_size=20, color=GREEN_B, line_spacing=0.9,
        )
        cap_bg = SurroundingRectangle(caption, color=GREEN_B, buff=0.18, stroke_width=2)
        cap_grp = VGroup(cap_bg, caption)
        cap_grp.to_edge(DOWN, buff=0.2)
        self.play(FadeIn(cap_bg), Write(caption), run_time=1.2)
        self.wait(1.3)
