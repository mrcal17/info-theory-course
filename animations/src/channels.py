from manim import *
import numpy as np


class ChannelCodingCliff(Scene):
    """Decoding error probability vs rate R, sharpening into a cliff at capacity C
    as block length n grows. Shannon's channel coding theorem visualized."""

    def construct(self):
        title = Text("Channel Coding: The Cliff at Capacity", font_size=30)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.8)

        # --- Axes: error probability (y) vs rate R (x) ---
        axes = Axes(
            x_range=[0, 1, 0.25],
            y_range=[0, 1, 0.25],
            x_length=8.5,
            y_length=4.4,
            axis_config={"include_numbers": False, "stroke_width": 2},
            tips=False,
        )
        axes.shift(DOWN * 0.6)

        x_label = Text("rate  R", font_size=22)
        x_label.next_to(axes.x_axis, RIGHT, buff=0.2)
        y_label = Text("P(error)", font_size=22)
        y_label.next_to(axes.y_axis, UP, buff=0.15)

        # numeric ticks
        x0 = Text("0", font_size=18).next_to(axes.c2p(0, 0), DOWN, buff=0.15)
        y0 = Text("0", font_size=18).next_to(axes.c2p(0, 0), LEFT, buff=0.15)
        y1 = Text("1", font_size=18).next_to(axes.c2p(0, 1), LEFT, buff=0.15)

        self.play(Create(axes), Write(x_label), Write(y_label),
                  FadeIn(x0), FadeIn(y0), FadeIn(y1), run_time=1.0)

        # --- Capacity line ---
        C = 0.5
        cap_line = DashedLine(
            axes.c2p(C, 0), axes.c2p(C, 1),
            color=YELLOW, stroke_width=3, dash_length=0.12,
        )
        cap_label = Text("capacity  C", font_size=22, color=YELLOW)
        cap_label.next_to(axes.c2p(C, 1), UP, buff=0.1)
        self.play(Create(cap_line), Write(cap_label), run_time=0.9)
        self.wait(0.3)

        # --- Error curve as a logistic step centered at C; sharpness grows with n ---
        def err_curve(n):
            k = 6.0 * n  # steepness scales with block length
            return axes.plot(
                lambda x: 1.0 / (1.0 + np.exp(-k * (x - C))),
                x_range=[0.001, 0.999, 0.004],
                color=BLUE,
                stroke_width=4,
            )

        n_label = Text("block length  n = 1", font_size=24, color=BLUE)
        n_label.to_corner(DR, buff=0.5).shift(UP * 0.2)

        curve = err_curve(1)
        self.play(Create(curve), Write(n_label), run_time=1.2)
        self.wait(0.4)

        # Sharpen the curve for growing n
        for n in [2, 4, 8, 20]:
            new_curve = err_curve(n)
            new_label = Text(f"block length  n = {n}", font_size=24, color=BLUE)
            new_label.to_corner(DR, buff=0.5).shift(UP * 0.2)
            self.play(
                Transform(curve, new_curve),
                Transform(n_label, new_label),
                run_time=0.9,
            )
            self.wait(0.2)

        # --- Shade achievable (green, left of C) and forbidden (red, right of C) ---
        achievable = Polygon(
            axes.c2p(0, 0), axes.c2p(C, 0), axes.c2p(C, 1), axes.c2p(0, 1),
            fill_color=GREEN, fill_opacity=0.18, stroke_width=0,
        )
        forbidden = Polygon(
            axes.c2p(C, 0), axes.c2p(1, 0), axes.c2p(1, 1), axes.c2p(C, 1),
            fill_color=RED, fill_opacity=0.18, stroke_width=0,
        )
        ach_text = Text("achievable\nerror → 0", font_size=22, color=GREEN)
        ach_text.move_to(axes.c2p(C / 2, 0.62))
        forb_text = Text("forbidden", font_size=22, color=RED)
        forb_text.move_to(axes.c2p((1 + C) / 2, 0.38))

        self.play(
            FadeIn(achievable), FadeIn(forbidden),
            Write(ach_text), Write(forb_text),
            run_time=1.0,
        )
        self.wait(0.4)

        # --- Final sharp cliff exactly at C ---
        cliff = VGroup(
            Line(axes.c2p(0, 0.0), axes.c2p(C, 0.0), color=BLUE, stroke_width=5),
            Line(axes.c2p(C, 0.0), axes.c2p(C, 1.0), color=BLUE, stroke_width=5),
            Line(axes.c2p(C, 1.0), axes.c2p(1, 1.0), color=BLUE, stroke_width=5),
        )
        final_label = Text("block length  n → ∞", font_size=24, color=BLUE)
        final_label.to_corner(DR, buff=0.5).shift(UP * 0.2)
        self.play(
            Transform(curve, cliff),
            Transform(n_label, final_label),
            run_time=1.2,
        )
        self.wait(1.4)


class WaterFilling(Scene):
    """Water-filling power allocation across parallel sub-channels.
    Water (power) is poured to a common surface; deep (low-noise) bins fill,
    bins whose noise floor sits above the surface stay empty."""

    def construct(self):
        title = Text("Water-Filling: Power Allocation", font_size=30)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.8)

        subtitle = Text("parallel sub-channels", font_size=22, color=BLUE_B)
        subtitle.next_to(title, DOWN, buff=0.18)
        self.play(FadeIn(subtitle), run_time=0.5)

        # --- Bin geometry ---
        n_bins = 7
        bin_w = 1.4
        floor_heights = [0.6, 1.5, 0.3, 2.6, 1.0, 2.0, 0.45]  # noise levels
        total_w = n_bins * bin_w
        left_x = -total_w / 2
        base_y = -2.6  # bottom of all bins
        max_top = 3.2  # top of the container region (data coords)

        def bx(i):
            # center x of bin i
            return left_x + bin_w * (i + 0.5)

        # noise-floor blocks (gray) sitting on the base, height = noise level
        floors = VGroup()
        floor_caps = VGroup()
        for i, h in enumerate(floor_heights):
            cx = bx(i)
            floor = Rectangle(
                width=bin_w, height=h,
                fill_color=GREY_BROWN, fill_opacity=0.9,
                stroke_color=GREY_B, stroke_width=1.5,
            )
            floor.move_to([cx, base_y + h / 2, 0])
            floors.add(floor)
            # a thin cap line on top of each floor to read the level
            cap = Line(
                [cx - bin_w / 2, base_y + h, 0],
                [cx + bin_w / 2, base_y + h, 0],
                color=GREY_A, stroke_width=2,
            )
            floor_caps.add(cap)

        # vertical separators between bins
        seps = VGroup()
        for i in range(n_bins + 1):
            x = left_x + bin_w * i
            seps.add(Line([x, base_y, 0], [x, base_y + max_top, 0],
                          color=GREY_D, stroke_width=1.5))
        base_line = Line([left_x, base_y, 0], [left_x + total_w, base_y, 0],
                         color=WHITE, stroke_width=2.5)

        noise_label = Text("noise floor", font_size=20, color=GREY_BROWN)
        noise_label.next_to(floors[3], UP, buff=0.12)

        self.play(Create(base_line), Create(seps), run_time=0.8)
        self.play(
            *[GrowFromEdge(f, DOWN) for f in floors],
            Create(floor_caps),
            run_time=1.2,
        )
        self.play(FadeIn(noise_label), run_time=0.5)
        self.wait(0.4)

        # --- Determine common water level by water-filling ---
        water_level_h = 2.1  # height above base where the water surface sits
        surface_y = base_y + water_level_h

        # Build water rectangles (power = water above the floor) using a ValueTracker
        level = ValueTracker(base_y)  # current water surface y, starts at base

        waters = VGroup()
        for i, h in enumerate(floor_heights):
            cx = bx(i)
            floor_top_y = base_y + h

            def make_updater(cx=cx, floor_top_y=floor_top_y):
                def updater(rect):
                    top = level.get_value()
                    bottom = floor_top_y
                    if top <= bottom + 1e-3:
                        rect.set_opacity(0)
                        return
                    height = top - bottom
                    new = Rectangle(
                        width=bin_w, height=height,
                        fill_color=BLUE, fill_opacity=0.6,
                        stroke_color=BLUE_B, stroke_width=1,
                    )
                    new.move_to([cx, bottom + height / 2, 0])
                    rect.become(new)
                    rect.set_opacity(0.6)
                return updater

            r = Rectangle(width=bin_w, height=0.01, fill_color=BLUE,
                          fill_opacity=0, stroke_width=0)
            r.move_to([cx, floor_top_y, 0])
            r.add_updater(make_updater())
            waters.add(r)

        self.add(waters)

        # "Pour water" — raise the level to the common surface
        pour_text = Text("pour power (water)", font_size=22, color=BLUE_B)
        pour_text.to_edge(DOWN, buff=0.35)
        self.play(FadeIn(pour_text), run_time=0.4)
        self.play(level.animate.set_value(surface_y), run_time=2.4, rate_func=smooth)

        # freeze updaters
        for r in waters:
            r.clear_updaters()
        self.wait(0.3)

        # --- Common water-level line across the top ---
        water_line = DashedLine(
            [left_x, surface_y, 0], [left_x + total_w, surface_y, 0],
            color=BLUE_A, stroke_width=3, dash_length=0.14,
        )
        water_lab = Text("water level", font_size=22, color=BLUE_A)
        water_lab.next_to(water_line, RIGHT, buff=0.12)
        if water_lab.get_right()[0] > 6.9:
            water_lab.next_to([left_x + total_w, surface_y, 0], UP, buff=0.1).shift(LEFT * 1.0)
        self.play(Create(water_line), Write(water_lab), run_time=0.9)

        # power = water above the noise floor
        self.play(FadeOut(pour_text), run_time=0.3)
        power_text = Text("power = water above the noise floor", font_size=24, color=BLUE)
        power_text.to_edge(DOWN, buff=0.35)
        self.play(Write(power_text), run_time=0.9)

        # Highlight a bin whose floor is above the surface (empty)
        empty_idx = 3  # tallest floor (2.6) sits above surface (2.1)
        empty_arrow = Arrow(
            [bx(empty_idx), surface_y + 1.0, 0],
            [bx(empty_idx), base_y + floor_heights[empty_idx] + 0.05, 0],
            color=RED, stroke_width=4, buff=0.1, max_tip_length_to_length_ratio=0.25,
        )
        empty_note = Text("too noisy:\nno power", font_size=18, color=RED)
        empty_note.next_to(empty_arrow, UP, buff=0.08)
        self.play(GrowArrow(empty_arrow), FadeIn(empty_note), run_time=0.9)
        self.wait(1.6)
