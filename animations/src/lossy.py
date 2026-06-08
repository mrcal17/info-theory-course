from manim import *
import numpy as np


class RateDistortionCurve(Scene):
    """Plot the rate-distortion curve R(D): bits fall convexly as allowed
    distortion D grows, reaching 0 at D_max. A point slides from near-lossless
    (low D, high R) toward lossy (high D, low R), with a shrinking bits counter
    and a coarsening grid as a proxy for the tradeoff."""

    def construct(self):
        title = Text("Rate-Distortion Tradeoff", font_size=30)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.8)

        # --- Axes (left side) ---
        D_max = 1.0
        R_max = 3.0  # bits

        axes = Axes(
            x_range=[0, 1.1, 0.25],
            y_range=[0, 3.2, 1.0],
            x_length=6.2,
            y_length=4.2,
            axis_config={"include_numbers": False, "stroke_width": 2},
            tips=False,
        )
        axes.to_edge(LEFT, buff=0.8).shift(DOWN * 0.4)

        x_label = Text("Distortion  D  →", font_size=20, color=BLUE_B)
        x_label.next_to(axes.x_axis, DOWN, buff=0.2)
        y_label = Text("Rate  R  (bits)", font_size=20, color=YELLOW)
        y_label.rotate(PI / 2).next_to(axes.y_axis, LEFT, buff=0.2)

        # tick annotations
        zero_lab = Text("0", font_size=16).next_to(axes.c2p(0, 0), DL, buff=0.12)
        dmax_lab = Text("D_max", font_size=16, color=BLUE_B).next_to(
            axes.c2p(D_max, 0), DOWN, buff=0.15
        )

        self.play(Create(axes), Write(x_label), Write(y_label), run_time=1.0)
        self.play(FadeIn(zero_lab), FadeIn(dmax_lab), run_time=0.5)

        # --- The convex R(D) curve: hits 0 at D = D_max ---
        def R_of_D(D):
            D = np.clip(D, 0.0, D_max)
            # convex, decreasing, R(0)=R_max, R(D_max)=0
            return R_max * (1.0 - (D / D_max)) ** 2

        curve = axes.plot(
            R_of_D,
            x_range=[0.0, D_max, 0.01],
            color=YELLOW,
            stroke_width=4,
        )
        self.play(Create(curve), run_time=1.4)

        caption = Text("less distortion  ↔  more bits", font_size=24, color=GREEN)
        caption.to_edge(DOWN, buff=0.35)
        self.play(Write(caption), run_time=0.8)

        # --- Region labels on the curve ---
        near_lossless = Text("near-lossless", font_size=16, color=WHITE)
        near_lossless.next_to(axes.c2p(0.06, R_of_D(0.06)), UR, buff=0.1)
        lossy = Text("lossy", font_size=16, color=WHITE)
        lossy.next_to(axes.c2p(0.85, R_of_D(0.85)), UR, buff=0.1)
        self.play(FadeIn(near_lossless), FadeIn(lossy), run_time=0.6)

        # --- Sliding point + dashed guide lines (ValueTracker) ---
        d_tracker = ValueTracker(0.04)

        moving_dot = always_redraw(
            lambda: Dot(
                axes.c2p(d_tracker.get_value(), R_of_D(d_tracker.get_value())),
                color=RED,
                radius=0.10,
            )
        )
        v_line = always_redraw(
            lambda: axes.get_vertical_line(
                axes.c2p(d_tracker.get_value(), R_of_D(d_tracker.get_value())),
                color=GREY_B,
                stroke_width=2,
            )
        )
        h_line = always_redraw(
            lambda: DashedLine(
                axes.c2p(0, R_of_D(d_tracker.get_value())),
                axes.c2p(d_tracker.get_value(), R_of_D(d_tracker.get_value())),
                color=GREY_B,
                stroke_width=2,
            )
        )

        # --- Right panel: bits counter + coarsening grid proxy ---
        panel_x = 4.4
        counter_title = Text("encoded bits / sample", font_size=18, color=YELLOW)
        counter_title.move_to(np.array([panel_x, 2.4, 0]))

        bits_value = always_redraw(
            lambda: Text(
                f"{R_of_D(d_tracker.get_value()):.2f}",
                font_size=46,
                color=RED,
            ).move_to(np.array([panel_x, 1.55, 0]))
        )
        bits_unit = Text("bits", font_size=20, color=GREY_A)
        bits_unit.next_to(bits_value, RIGHT, buff=0.18)

        # Coarsening grid: number of cells per side shrinks as D grows.
        grid_origin = np.array([panel_x, -1.6, 0])
        grid_size = 2.6

        def make_grid():
            D = d_tracker.get_value()
            # n cells per side: fine (8) at D~0 down to coarse (1) at D_max
            n = int(round(8 - 7 * (D / D_max)))
            n = max(1, min(8, n))
            g = VGroup()
            cell = grid_size / n
            rng = np.random.default_rng(0)
            for i in range(n):
                for j in range(n):
                    shade = rng.uniform(0.25, 0.85)
                    sq = Square(
                        side_length=cell,
                        stroke_color=GREY_D,
                        stroke_width=1,
                        fill_color=BLUE_D,
                        fill_opacity=shade,
                    )
                    sq.move_to(
                        grid_origin
                        + np.array(
                            [
                                (j + 0.5) * cell - grid_size / 2,
                                grid_size / 2 - (i + 0.5) * cell,
                                0,
                            ]
                        )
                    )
                    g.add(sq)
            return g

        grid = always_redraw(make_grid)
        grid_caption = Text("quantization grid", font_size=18, color=BLUE_B)
        grid_caption.move_to(grid_origin + np.array([0, grid_size / 2 + 0.4, 0]))

        self.play(
            FadeIn(counter_title),
            FadeIn(bits_unit),
            FadeIn(grid_caption),
            run_time=0.6,
        )
        self.add(moving_dot, v_line, h_line, bits_value, grid)
        self.wait(0.4)

        # --- Slide the point from near-lossless to lossy ---
        self.play(d_tracker.animate.set_value(0.92), run_time=4.5, rate_func=linear)
        self.wait(0.6)

        # final emphasis: flash the caption
        self.play(Indicate(caption, color=GREEN, scale_factor=1.12), run_time=1.0)
        self.wait(0.8)
