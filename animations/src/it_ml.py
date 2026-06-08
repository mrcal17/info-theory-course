from manim import *
import numpy as np


class InformationPlane(Scene):
    """The Shwartz-Ziv & Tishby information plane: layers of a network tracing
    a fitting phase (up-right) then a compression phase (left) across training."""

    def construct(self):
        title = Text("The Information Plane", font_size=30)
        title.to_edge(UP, buff=0.3)
        subtitle = Text("Shwartz-Ziv & Tishby", font_size=18, color=BLUE)
        subtitle.next_to(title, DOWN, buff=0.15)
        self.play(Write(title), run_time=0.7)
        self.play(FadeIn(subtitle, shift=DOWN * 0.2), run_time=0.5)

        # --- Axes ---
        axes = Axes(
            x_range=[0, 10, 2],
            y_range=[0, 6, 2],
            x_length=8.5,
            y_length=4.3,
            axis_config={"include_numbers": False, "stroke_width": 2},
            tips=True,
        )
        axes.shift(DOWN * 0.7 + RIGHT * 0.4)

        x_label = Text("I(X ; T)   compression  →", font_size=20, color=GREY_B)
        x_label.next_to(axes.x_axis, DOWN, buff=0.25)
        y_label = Text("I(T ; Y)   relevance  →", font_size=20, color=GREY_B)
        y_label.rotate(PI / 2)
        y_label.next_to(axes.y_axis, LEFT, buff=0.25)

        self.play(Create(axes), run_time=0.9)
        self.play(Write(x_label), Write(y_label), run_time=0.8)
        self.wait(0.3)

        # --- The layers (coloured dots) ---
        layer_colors = [BLUE_D, TEAL, GREEN, YELLOW, RED]
        n_layers = len(layer_colors)

        # Trajectory in data coordinates for each layer.
        # Phase 1 (fitting): both I(X;T) and I(T;Y) grow -> up & right.
        # Phase 2 (compression): I(X;T) shrinks while I(T;Y) stays high -> left.
        rng = np.random.default_rng(0)

        # start positions: near the origin region, spread vertically a touch
        starts = np.array([
            [1.0, 0.6],
            [1.2, 0.9],
            [1.4, 1.1],
            [1.6, 1.3],
            [1.8, 1.5],
        ])
        # peak (end of fitting): high I(X;T) and high I(T;Y), deeper layers reach higher
        peaks = np.array([
            [8.2, 3.0],
            [8.6, 3.8],
            [9.0, 4.5],
            [9.1, 5.0],
            [9.2, 5.3],
        ])
        # compressed (end of compression): I(X;T) pulled left, relevance held high
        compressed = np.array([
            [6.8, 3.0],
            [5.8, 3.9],
            [4.6, 4.5],
            [3.6, 5.0],
            [2.8, 5.3],
        ])

        dots = VGroup()
        for i in range(n_layers):
            d = Dot(axes.c2p(*starts[i]), radius=0.09, color=layer_colors[i])
            d.set_z_index(5)
            dots.add(d)

        legend = VGroup()
        for i in range(n_layers):
            sw = VGroup(
                Dot(radius=0.07, color=layer_colors[i]),
                Text(f"layer {i+1}", font_size=15, color=GREY_A),
            ).arrange(RIGHT, buff=0.12)
            legend.add(sw)
        legend.arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        legend.to_corner(UR, buff=0.3).shift(DOWN * 0.6)

        self.play(LaggedStartMap(GrowFromCenter, dots, lag_ratio=0.1), run_time=0.9)
        self.play(FadeIn(legend, shift=LEFT * 0.2), run_time=0.6)
        self.wait(0.3)

        # trails (faint paths the dots leave behind)
        trails = VGroup(*[
            TracedPath(dots[i].get_center, stroke_color=layer_colors[i],
                       stroke_width=2.5, stroke_opacity=0.5)
            for i in range(n_layers)
        ])
        self.add(trails)

        # --- Phase 1: FITTING ---
        phase1 = Text("Phase 1: Fitting", font_size=22, color=GREEN)
        phase1.to_corner(UL, buff=0.4).shift(DOWN * 0.8)
        phase1_sub = Text("both I increase → up & right", font_size=15, color=GREY_B)
        phase1_sub.next_to(phase1, DOWN, aligned_edge=LEFT, buff=0.12)
        self.play(FadeIn(phase1, shift=RIGHT * 0.2), FadeIn(phase1_sub), run_time=0.6)

        # intermediate waypoint so the rise has a gentle arc
        mids = (starts + peaks) / 2 + np.array([[-0.3, 0.7]]) * 0  # straight-ish rise
        self.play(
            *[dots[i].animate.move_to(axes.c2p(*mids[i])) for i in range(n_layers)],
            run_time=1.2, rate_func=rate_functions.ease_in_sine,
        )
        self.play(
            *[dots[i].animate.move_to(axes.c2p(*peaks[i])) for i in range(n_layers)],
            run_time=1.2, rate_func=rate_functions.ease_out_sine,
        )
        self.wait(0.4)

        # --- Phase 2: COMPRESSION ---
        phase2 = Text("Phase 2: Compression", font_size=22, color=ORANGE)
        phase2.move_to(phase1)
        phase2_sub = Text("I(X;T) drops, relevance held", font_size=15, color=GREY_B)
        phase2_sub.next_to(phase2, DOWN, aligned_edge=LEFT, buff=0.12)
        self.play(
            ReplacementTransform(phase1, phase2),
            ReplacementTransform(phase1_sub, phase2_sub),
            run_time=0.7,
        )

        # leftward arrow cue near the top of the plane
        comp_arrow = Arrow(
            axes.c2p(8.0, 5.6), axes.c2p(4.0, 5.6),
            color=ORANGE, stroke_width=4, buff=0.0, max_tip_length_to_length_ratio=0.08,
        )
        self.play(GrowArrow(comp_arrow), run_time=0.6)

        self.play(
            *[dots[i].animate.move_to(axes.c2p(*compressed[i])) for i in range(n_layers)],
            run_time=1.8, rate_func=rate_functions.ease_in_out_sine,
        )
        self.wait(0.4)

        caption = Text(
            "Generalization: throw away input detail, keep what predicts Y",
            font_size=17, color=YELLOW,
        )
        caption.to_edge(DOWN, buff=0.18)
        cap_bg = BackgroundRectangle(caption, fill_opacity=0.8, buff=0.1)
        self.play(FadeIn(cap_bg), Write(caption), run_time=1.0)
        self.wait(1.4)


class BetaVAEPlane(Scene):
    """Rate-distortion plane for a beta-VAE: a point sweeps the convex frontier
    as beta changes, trading rate (KL bits) against distortion (reconstruction)."""

    def construct(self):
        title = Text("β-VAE: The Rate-Distortion Plane", font_size=28)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.8)

        # --- Axes ---
        axes = Axes(
            x_range=[0, 10, 2],
            y_range=[0, 8, 2],
            x_length=8.2,
            y_length=4.4,
            axis_config={"include_numbers": False, "stroke_width": 2},
            tips=True,
        )
        axes.shift(DOWN * 0.55 + LEFT * 0.4)

        x_label = Text("Distortion  (reconstruction error)  →", font_size=18, color=GREY_B)
        x_label.next_to(axes.x_axis, DOWN, buff=0.25)
        y_label = Text("Rate  (KL, bits)  →", font_size=18, color=GREY_B)
        y_label.rotate(PI / 2)
        y_label.next_to(axes.y_axis, LEFT, buff=0.25)

        self.play(Create(axes), run_time=0.9)
        self.play(Write(x_label), Write(y_label), run_time=0.7)
        self.wait(0.2)

        # --- Convex feasible frontier ---
        # A decreasing convex curve: low distortion costs high rate, and vice-versa.
        # Parameterize so x in [0.8, 9] and y decreasing & convex.
        def frontier(x):
            # convex, monotonically decreasing
            return 7.2 * np.exp(-0.45 * (x - 0.8)) + 0.4

        x_min, x_max = 0.8, 9.0
        curve = axes.plot(frontier, x_range=[x_min, x_max, 0.02],
                          color=BLUE, stroke_width=4)

        # shade the infeasible region (below/left of frontier is feasible-above-curve
        # is the achievable set; we shade the area under the curve as "feasible")
        feasible = axes.plot(frontier, x_range=[x_min, x_max, 0.02])
        region = axes.get_area(feasible, x_range=[x_min, x_max],
                               color=BLUE, opacity=0.12)

        frontier_label = Text("feasible frontier", font_size=17, color=BLUE)
        frontier_label.move_to(axes.c2p(6.4, 2.6))

        self.play(Create(curve), run_time=1.2)
        self.play(FadeIn(region), FadeIn(frontier_label), run_time=0.7)
        self.wait(0.3)

        # --- Sweeping point + beta label ---
        # beta large -> point at low rate / high distortion (right side, bottom)
        # beta small -> point at high rate / low distortion (left side, top)
        x_tracker = ValueTracker(8.2)  # start: large beta (low rate, high distortion)

        moving_dot = always_redraw(
            lambda: Dot(
                axes.c2p(x_tracker.get_value(), frontier(x_tracker.get_value())),
                radius=0.11, color=YELLOW,
            ).set_z_index(5)
        )

        # dashed guide lines to the axes
        h_line = always_redraw(
            lambda: DashedLine(
                axes.c2p(0, frontier(x_tracker.get_value())),
                axes.c2p(x_tracker.get_value(), frontier(x_tracker.get_value())),
                color=GREY, stroke_width=1.5, dash_length=0.08,
            )
        )
        v_line = always_redraw(
            lambda: DashedLine(
                axes.c2p(x_tracker.get_value(), 0),
                axes.c2p(x_tracker.get_value(), frontier(x_tracker.get_value())),
                color=GREY, stroke_width=1.5, dash_length=0.08,
            )
        )

        def beta_from_x(x):
            # large x (high distortion) -> large beta; small x -> small beta
            # map x in [0.8, 9] to beta in [0.1, 8] increasing
            t = (x - x_min) / (x_max - x_min)
            return 0.1 + t * 7.9

        beta_label = always_redraw(
            lambda: Text(f"β = {beta_from_x(x_tracker.get_value()):.1f}",
                         font_size=26, color=YELLOW).to_corner(UR, buff=0.45).shift(DOWN * 0.3)
        )

        self.play(FadeIn(moving_dot), Create(h_line), Create(v_line),
                  FadeIn(beta_label), run_time=0.7)
        self.wait(0.3)

        # annotate the large-beta end
        big_note = Text("large β\nlow rate, high distortion", font_size=15,
                        color=ORANGE, line_spacing=0.7)
        big_note.move_to(axes.c2p(8.0, 1.9))
        self.play(FadeIn(big_note, shift=UP * 0.2), run_time=0.6)
        self.wait(0.5)

        # sweep to small beta (left: high rate, low distortion)
        self.play(x_tracker.animate.set_value(1.1), run_time=2.6,
                  rate_func=rate_functions.ease_in_out_sine)

        small_note = Text("small β\nhigh rate, low distortion", font_size=15,
                          color=GREEN, line_spacing=0.7)
        small_note.move_to(axes.c2p(2.9, 6.6))
        self.play(FadeIn(small_note, shift=UP * 0.2), run_time=0.6)
        self.wait(0.5)

        # sweep back partway to settle in a balanced spot
        self.play(x_tracker.animate.set_value(4.5), run_time=1.6,
                  rate_func=rate_functions.ease_in_out_sine)
        self.wait(0.3)

        caption = Text("ELBO = rate + distortion;  β picks the point on the frontier",
                       font_size=18, color=YELLOW)
        caption.to_edge(DOWN, buff=0.16)
        cap_bg = BackgroundRectangle(caption, fill_opacity=0.8, buff=0.1)
        self.play(FadeIn(cap_bg), Write(caption), run_time=1.0)
        self.wait(1.4)
