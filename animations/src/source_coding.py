from manim import *
import numpy as np


class HuffmanTree(Scene):
    """Build a Huffman tree bottom-up, then read off the codewords."""

    def construct(self):
        title = Text("Huffman Coding", font_size=32)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.8)

        # --- symbol palette ---
        symbols = ["A", "B", "C", "D", "E"]
        probs = {"A": 0.40, "B": 0.20, "C": 0.20, "D": 0.10, "E": 0.10}
        colors = {
            "A": BLUE, "B": GREEN, "C": YELLOW, "D": ORANGE, "E": RED,
        }

        def make_node(label, p, color=WHITE, is_leaf=True):
            """Return a VGroup: rounded box + symbol(s) + prob text. Has .leaves list."""
            box = RoundedRectangle(
                width=1.05, height=0.7, corner_radius=0.12,
                stroke_color=color, stroke_width=2.5,
                fill_color=color, fill_opacity=0.18,
            )
            name = Text(label, font_size=20, color=color, weight=BOLD)
            name.move_to(box.get_center() + UP * 0.12)
            pval = Text(f"{p:.2f}", font_size=16, color=WHITE)
            pval.move_to(box.get_center() + DOWN * 0.16)
            grp = VGroup(box, name, pval)
            grp.prob = p
            grp.box = box
            grp.label = label
            return grp

        # Leaf nodes laid out along the bottom
        leaf_y = -2.7
        xs = np.linspace(-4.6, 4.6, len(symbols))
        nodes = []
        leaf_anims = []
        for x, s in zip(xs, symbols):
            n = make_node(s, probs[s], colors[s])
            n.move_to([x, leaf_y, 0])
            n.leaf_x = x  # remember original x for codeword placement later
            nodes.append(n)
            leaf_anims.append(FadeIn(n, shift=UP * 0.3))

        subtitle = Text("Merge the two least-likely symbols, repeat", font_size=20, color=GREY_B)
        subtitle.next_to(title, DOWN, buff=0.2)
        self.play(Write(subtitle), run_time=0.6)
        self.play(LagRatio := AnimationGroup(*leaf_anims, lag_ratio=0.15), run_time=1.3)
        self.wait(0.4)

        # Track edges so we can label them later. edge -> (line_mobject, child_node, side)
        edges = []  # list of dicts: {line, child, bit_side}

        # active list of (node, prob) -- we merge from this
        active = list(nodes)
        merge_level_y = leaf_y + 1.1
        cur_y = merge_level_y

        merge_step = 0
        while len(active) > 1:
            # pick two lowest-prob nodes
            active.sort(key=lambda nd: nd.prob)
            a, b = active[0], active[1]
            rest = active[2:]

            new_p = a.prob + b.prob
            # parent positioned above the midpoint of its two children
            mid_x = (a.get_center()[0] + b.get_center()[0]) / 2.0
            parent_label = f"{a.label}{b.label}"
            parent = make_node(parent_label, new_p, color=PURPLE_B)
            # constrain parent height so labels stay readable as names grow
            parent[1].set_font_size(16)
            parent.move_to([mid_x, cur_y, 0])

            # connecting lines from parent box to each child box
            line_a = Line(
                parent.box.get_bottom(), a.box.get_top(),
                stroke_width=2.5, color=GREY_A,
            )
            line_b = Line(
                parent.box.get_bottom(), b.box.get_top(),
                stroke_width=2.5, color=GREY_A,
            )

            # highlight the two chosen nodes
            self.play(
                a.box.animate.set_stroke(width=4).set_fill(opacity=0.35),
                b.box.animate.set_stroke(width=4).set_fill(opacity=0.35),
                run_time=0.5,
            )
            self.play(
                Create(line_a), Create(line_b),
                FadeIn(parent, shift=DOWN * 0.2),
                run_time=0.9,
            )
            # un-highlight children
            self.play(
                a.box.animate.set_stroke(width=2.5),
                b.box.animate.set_stroke(width=2.5),
                run_time=0.3,
            )

            # left child is the one with smaller x -> bit 0, right -> bit 1
            if a.get_center()[0] <= b.get_center()[0]:
                left_child, left_line = a, line_a
                right_child, right_line = b, line_b
            else:
                left_child, left_line = b, line_b
                right_child, right_line = a, line_a
            edges.append({"line": left_line, "child": left_child, "bit": "0"})
            edges.append({"line": right_line, "child": right_child, "bit": "1"})

            active = rest + [parent]
            cur_y += 1.0
            merge_step += 1

        root = active[0]
        self.play(Indicate(root, color=PURPLE_A, scale_factor=1.15), run_time=0.8)
        self.wait(0.3)

        # --- label edges 0 / 1 ---
        bit_labels = []
        bit_anims = []
        for e in edges:
            ln = e["line"]
            t = Text(e["bit"], font_size=18, color=WHITE, weight=BOLD)
            t.move_to(ln.point_from_proportion(0.5))
            # nudge off the line a touch
            offset = LEFT * 0.18 if e["bit"] == "0" else RIGHT * 0.18
            t.shift(offset)
            bg = BackgroundRectangle(t, fill_opacity=0.7, buff=0.04)
            grp = VGroup(bg, t)
            bit_labels.append(grp)
            bit_anims.append(FadeIn(grp, scale=0.6))
        new_sub = Text("Label edges: left = 0, right = 1", font_size=20, color=GREY_B)
        new_sub.next_to(title, DOWN, buff=0.2)
        self.play(Transform(subtitle, new_sub), run_time=0.5)
        self.play(AnimationGroup(*bit_anims, lag_ratio=0.08), run_time=1.2)
        self.wait(0.4)

        # --- derive codewords by walking parent->...->leaf ---
        # Build child -> bit map (only the bit on the edge directly above each child)
        edge_bit = {id(e["child"]): e["bit"] for e in edges}
        # Build child -> parent map via the line endpoints is messy; instead reconstruct
        # by remembering merges. Easier: recompute codes from the edge list structure.
        # Each leaf's code = concat of bits from root down. We recorded parent labels as
        # concatenations, so we can derive membership by substring of the final root label.
        # Walk: for each leaf, find sequence of nodes whose label contains the leaf symbol.
        # Collect all nodes that ever existed.
        all_nodes = []
        for e in edges:
            all_nodes.append(e["child"])
        all_nodes.append(root)
        # dedupe preserving
        seen = set()
        uniq_nodes = []
        for n in all_nodes:
            if id(n) not in seen:
                seen.add(id(n))
                uniq_nodes.append(n)

        codes = {}
        for leaf in nodes:
            sym = leaf.label
            # nodes whose label contains sym, sorted by tree depth (longer label = closer to root)
            chain = [n for n in uniq_nodes if sym in n.label]
            chain.sort(key=lambda n: len(n.label), reverse=True)  # root first
            bits = ""
            # for each step from a parent to its child in the chain, append child's edge bit
            for n in chain:
                if id(n) in edge_bit:  # not the root
                    bits += edge_bit[id(n)]
            codes[sym] = bits

        # --- codeword table on the right side / bottom ---
        table_rows = VGroup()
        header = VGroup(
            Text("sym", font_size=18, color=GREY_B),
            Text("p", font_size=18, color=GREY_B),
            Text("code", font_size=18, color=GREY_B),
        ).arrange(RIGHT, buff=0.55)
        table_rows.add(header)
        for s in symbols:
            row = VGroup(
                Text(s, font_size=18, color=colors[s], weight=BOLD),
                Text(f"{probs[s]:.2f}", font_size=18, color=WHITE),
                Text(codes[s], font_size=18, color=WHITE),
            ).arrange(RIGHT, buff=0.55)
            # align columns by fixing widths
            row[0].move_to(header[0].get_center()[0] * RIGHT + row[0].get_center()[1] * UP)
            row[1].move_to(header[1].get_center()[0] * RIGHT + row[1].get_center()[1] * UP)
            row[2].move_to(header[2].get_center()[0] * RIGHT + row[2].get_center()[1] * UP)
            table_rows.add(row)
        table_rows.arrange(DOWN, buff=0.18, aligned_edge=LEFT)
        table_rows.to_corner(UR, buff=0.5).shift(DOWN * 0.4)
        box = SurroundingRectangle(table_rows, color=GREY_B, buff=0.2, stroke_width=1.5)
        bg = BackgroundRectangle(box, fill_opacity=0.65, buff=0.0)

        self.play(FadeIn(bg), Create(box), Write(header), run_time=0.8)
        for i, s in enumerate(symbols):
            self.play(FadeIn(table_rows[i + 1], shift=LEFT * 0.2), run_time=0.35)
        self.wait(0.4)

        caption = Text("Frequent symbols get shorter codes", font_size=20, color=YELLOW)
        caption.to_edge(DOWN, buff=0.3)
        cbg = BackgroundRectangle(caption, fill_opacity=0.8, buff=0.1)
        self.play(FadeIn(cbg), Write(caption), run_time=0.9)
        self.wait(1.4)


class ArithmeticInterval(Scene):
    """Encode a message by recursively shrinking the [0,1) interval."""

    def construct(self):
        title = Text("Arithmetic Coding", font_size=32)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.8)

        # Alphabet + probabilities define sub-interval widths within [0,1)
        alphabet = ["A", "B", "C"]
        probs = {"A": 0.5, "B": 0.3, "C": 0.2}
        colors = {"A": BLUE, "B": GREEN, "C": ORANGE}
        # cumulative lower bounds within a unit interval
        order = ["A", "B", "C"]
        cum = {}
        acc = 0.0
        for s in order:
            cum[s] = (acc, acc + probs[s])
            acc += probs[s]

        message = ["B", "A", "C"]
        msg_text = Text(
            "message:  " + " ".join(message),
            font_size=22, color=WHITE,
        )
        msg_text.next_to(title, DOWN, buff=0.2)
        self.play(Write(msg_text), run_time=0.6)

        # Geometry of the bar
        bar_left = -5.0
        bar_right = 5.0
        bar_y = 1.2
        bar_h = 0.9
        bar_w = bar_right - bar_left

        def x_at(frac):
            return bar_left + frac * bar_w

        # The current working interval in absolute [0,1) coordinates
        lo, hi = 0.0, 1.0

        # Draw the initial [0,1) bar split into A/B/C
        def build_segments(lo, hi, y, height, show_labels=True):
            """Return VGroup of colored segments for the alphabet within [lo,hi]."""
            segs = VGroup()
            width = hi - lo
            for s in order:
                c0, c1 = cum[s]
                seg_lo = lo + c0 * width
                seg_hi = lo + c1 * width
                rect = Rectangle(
                    width=(seg_hi - seg_lo) * bar_w,
                    height=height,
                    fill_color=colors[s], fill_opacity=0.45,
                    stroke_color=WHITE, stroke_width=1.5,
                )
                rect.move_to([x_at((seg_lo + seg_hi) / 2.0), y, 0])
                segs.add(rect)
                if show_labels and (seg_hi - seg_lo) * bar_w > 0.55:
                    lbl = Text(s, font_size=18, color=WHITE, weight=BOLD)
                    lbl.move_to(rect.get_center())
                    segs.add(lbl)
            return segs

        # axis ticks 0 and 1 under the master bar
        tick0 = Text("0", font_size=18, color=GREY_B)
        tick1 = Text("1", font_size=18, color=GREY_B)
        tick0.move_to([x_at(0.0), bar_y - bar_h / 2 - 0.3, 0])
        tick1.move_to([x_at(1.0), bar_y - bar_h / 2 - 0.3, 0])

        segs = build_segments(0.0, 1.0, bar_y, bar_h)
        self.play(Create(segs), FadeIn(tick0), FadeIn(tick1), run_time=1.1)
        self.wait(0.4)

        # range readout
        range_txt = Text("[0.000, 1.000)", font_size=22, color=YELLOW)
        range_txt.move_to([0, bar_y - bar_h / 2 - 0.85, 0])
        self.play(FadeIn(range_txt), run_time=0.4)

        # Lower "zoom" bar where we show the selected sub-interval expanded to full width
        zoom_y = -1.8
        zoom_h = 0.9

        prev_zoom = None
        prev_brace = None
        prev_arrow = None

        for step, sym in enumerate(message):
            width = hi - lo
            c0, c1 = cum[sym]
            new_lo = lo + c0 * width
            new_hi = lo + c1 * width

            # highlight the chosen sub-interval on the TOP bar (in current abs coords)
            hl = Rectangle(
                width=(new_hi - new_lo) * bar_w,
                height=bar_h,
                fill_color=colors[sym], fill_opacity=0.0,
                stroke_color=colors[sym], stroke_width=5,
            )
            hl.move_to([x_at((new_lo + new_hi) / 2.0), bar_y, 0])

            pick = Text(f"pick {sym}", font_size=20, color=colors[sym], weight=BOLD)
            pick.move_to([0, bar_y + bar_h / 2 + 0.45, 0])

            self.play(Create(hl), FadeIn(pick, shift=DOWN * 0.15), run_time=0.7)

            # brace + arrow connecting the highlighted slice down to the zoom bar
            brace = Line(
                [x_at(new_lo), bar_y - bar_h / 2 - 0.05, 0],
                [x_at(new_hi), bar_y - bar_h / 2 - 0.05, 0],
                color=colors[sym], stroke_width=4,
            )
            arrow = Arrow(
                start=[0, bar_y - bar_h / 2 - 0.1, 0],
                end=[0, zoom_y + zoom_h / 2 + 0.1, 0],
                color=colors[sym], stroke_width=4, buff=0.05,
                max_tip_length_to_length_ratio=0.12,
            )

            # the zoom bar: the chosen sub-interval re-subdivided into A/B/C
            zoom_segs = build_segments(new_lo, new_hi, zoom_y, zoom_h)
            # but build_segments uses absolute coords scaled by bar_w; we want this slice
            # STRETCHED to full width. Rebuild manually expanded to [bar_left,bar_right].
            zoom_segs = VGroup()
            sub_w = new_hi - new_lo
            for s in order:
                cc0, cc1 = cum[s]
                s_lo = cc0
                s_hi = cc1
                rect = Rectangle(
                    width=(s_hi - s_lo) * bar_w,
                    height=zoom_h,
                    fill_color=colors[s], fill_opacity=0.45,
                    stroke_color=WHITE, stroke_width=1.5,
                )
                rect.move_to([x_at((s_lo + s_hi) / 2.0), zoom_y, 0])
                zoom_segs.add(rect)
                if (s_hi - s_lo) * bar_w > 0.55:
                    lbl = Text(s, font_size=18, color=WHITE, weight=BOLD)
                    lbl.move_to(rect.get_center())
                    zoom_segs.add(lbl)

            zlabel = Text(
                f"zoom into {sym}'s interval",
                font_size=18, color=GREY_B,
            )
            zlabel.move_to([0, zoom_y + zoom_h / 2 + 0.4, 0])

            new_range = Text(
                f"[{new_lo:.3f}, {new_hi:.3f})",
                font_size=22, color=YELLOW,
            )
            new_range.move_to(range_txt.get_center())

            anims = [GrowFromCenter(brace), GrowArrow(arrow)]
            if prev_zoom is not None:
                anims.append(FadeOut(prev_zoom))
            if prev_brace is not None:
                anims.append(FadeOut(prev_brace))
            if prev_arrow is not None:
                anims.append(FadeOut(prev_arrow))
            self.play(*anims, run_time=0.6)
            self.play(
                FadeIn(zoom_segs, scale=0.9),
                Transform(range_txt, new_range),
                FadeIn(zlabel, shift=UP * 0.1),
                run_time=0.9,
            )
            self.wait(0.4)

            # Promote the zoom bar to become the new TOP bar for the next round:
            # fade out highlight + pick + old top segments, move zoom up.
            self.play(
                FadeOut(hl), FadeOut(pick), FadeOut(zlabel),
                FadeOut(segs),
                run_time=0.4,
            )
            # move zoom segments up to the top bar position
            self.play(
                zoom_segs.animate.shift(UP * (bar_y - zoom_y)),
                FadeOut(brace), FadeOut(arrow),
                run_time=0.7,
            )
            segs = zoom_segs
            prev_zoom = None
            prev_brace = None
            prev_arrow = None

            lo, hi = new_lo, new_hi
            self.wait(0.2)

        # Final: pick a binary fraction inside [lo, hi)
        # choose a short binary fraction in the interval
        def binary_in(lo, hi, max_bits=16):
            bits = ""
            x = 0.0
            step_val = 0.5
            for _ in range(max_bits):
                if x + step_val < hi and (x + step_val >= lo or True):
                    # greedily add bit if it keeps us below hi, then check containment
                    cand = x + step_val
                    if cand < hi:
                        x = cand
                        bits += "1"
                    else:
                        bits += "0"
                else:
                    bits += "0"
                step_val /= 2.0
                if lo <= x < hi and len(bits) >= 1:
                    # check that x is within interval and we can stop
                    if x >= lo:
                        break
            # ensure inside
            return bits, x

        # simpler robust pick: scan increasing bit-depth for a fraction inside [lo,hi)
        chosen_frac = None
        chosen_bits = None
        for depth in range(1, 24):
            denom = 2 ** depth
            for num in range(1, denom):
                val = num / denom
                if lo <= val < hi:
                    chosen_frac = val
                    chosen_bits = format(num, f"0{depth}b")
                    # strip representation: num/2^depth -> binary 0.xxxx
                    break
            if chosen_frac is not None:
                break

        # convert chosen_frac to a clean 0.bbbb binary string
        # chosen_bits currently is num in binary with `depth` bits; value = num / 2^depth
        # so 0.<bits> where bits has length depth (left padded). Build properly:
        frac_bits = ""
        x = chosen_frac
        for _ in range(20):
            x *= 2
            if x >= 1:
                frac_bits += "1"
                x -= 1
            else:
                frac_bits += "0"
            if x == 0:
                break
        # trim trailing zeros
        frac_bits = frac_bits.rstrip("0")
        if frac_bits == "":
            frac_bits = "0"

        # Clear the lingering top bar + range readout so the final result has room.
        self.play(
            FadeOut(segs), FadeOut(range_txt),
            FadeOut(tick0), FadeOut(tick1),
            run_time=0.5,
        )

        final_box = VGroup(
            Text(f"final interval  [{lo:.3f}, {hi:.3f})", font_size=24, color=YELLOW),
            Text(f"code: 0.{frac_bits}  (binary)", font_size=30, color=WHITE, weight=BOLD),
            Text(f"= {chosen_frac:.4f} in decimal", font_size=20, color=GREY_B),
        ).arrange(DOWN, buff=0.3)
        final_box.move_to([0, -0.3, 0])
        fbg = BackgroundRectangle(final_box, fill_opacity=0.75, buff=0.25)
        self.play(FadeIn(fbg), Write(final_box), run_time=1.0)
        self.wait(0.3)

        caption = Text(
            "the whole message → one shrinking interval",
            font_size=22, color=YELLOW,
        )
        caption.to_edge(DOWN, buff=0.3)
        capbg = BackgroundRectangle(caption, fill_opacity=0.8, buff=0.1)
        self.play(FadeIn(capbg), Write(caption), run_time=0.9)
        self.wait(1.5)
