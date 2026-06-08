from manim import *
import numpy as np


class ViterbiTrellis(Scene):
    """Viterbi forward pass over a trellis, then traceback of the ML path.

    5 time columns x 4 encoder-state rows. At each step, for every state we
    keep the surviving (lower-cost) incoming edge and dim the losers. After the
    forward sweep we trace back the single maximum-likelihood path in a bright
    color from end to start.
    """

    def construct(self):
        title = Text("Viterbi Decoding: Trellis", font_size=30)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.7)

        n_cols = 5
        n_rows = 4

        # Geometry of the node grid.
        x_left = -5.2
        x_right = 5.2
        y_top = 1.9
        y_bot = -2.3
        xs = np.linspace(x_left, x_right, n_cols)
        ys = np.linspace(y_top, y_bot, n_rows)

        # Build nodes.
        nodes = {}          # (col, row) -> Dot
        for c in range(n_cols):
            for r in range(n_rows):
                d = Dot(point=[xs[c], ys[r], 0], radius=0.10,
                        color=BLUE_B, z_index=3)
                nodes[(c, r)] = d

        # State labels on the left.
        state_labels = VGroup()
        for r in range(n_rows):
            lab = Text(f"S{r}", font_size=18, color=GREY_B)
            lab.move_to([x_left - 0.75, ys[r], 0])
            state_labels.add(lab)

        # Column / time labels along the bottom.
        col_labels = VGroup()
        for c in range(n_cols):
            lab = Text(f"t{c}", font_size=18, color=GREY_B)
            lab.move_to([xs[c], y_bot - 0.55, 0])
            col_labels.add(lab)

        self.play(
            LaggedStart(*[GrowFromCenter(nodes[k]) for k in nodes],
                        lag_ratio=0.02),
            FadeIn(state_labels), FadeIn(col_labels),
            run_time=1.3,
        )

        # Deterministic per-edge "branch metric" cost.
        rng = np.random.default_rng(0)
        # edges[(c, r_from, r_to)] = cost; we connect each state to two
        # successor states (a typical rate-1/2 convolutional code butterfly).
        def successors(r):
            # two outgoing transitions
            return [(2 * r) % n_rows, (2 * r + 1) % n_rows]

        edge_costs = {}
        edge_lines = {}
        for c in range(n_cols - 1):
            for r in range(n_rows):
                for rt in successors(r):
                    cost = float(rng.integers(0, 4))
                    edge_costs[(c, r, rt)] = cost
                    ln = Line(nodes[(c, r)].get_center(),
                              nodes[(c + 1, rt)].get_center(),
                              stroke_width=2.0, color=GREY, z_index=1)
                    edge_lines[(c, r, rt)] = ln

        self.play(
            LaggedStart(*[Create(ln) for ln in edge_lines.values()],
                        lag_ratio=0.01),
            run_time=1.4,
        )

        caption = Text("forward pass: keep the lower-cost survivor",
                       font_size=20, color=YELLOW)
        caption.to_edge(DOWN, buff=0.25)
        self.play(FadeIn(caption), run_time=0.5)

        # ---- Viterbi forward pass ----
        # path_cost[(c, r)] = best accumulated cost to reach state r at time c
        INF = 1e9
        path_cost = {(0, r): 0.0 for r in range(n_rows)}
        survivor_from = {}  # (c+1, rt) -> r  (best predecessor)

        for c in range(n_cols - 1):
            # For each destination state, collect incoming candidate edges.
            incoming = {rt: [] for rt in range(n_rows)}
            for r in range(n_rows):
                for rt in successors(r):
                    incoming[rt].append(r)

            win_anims = []
            lose_anims = []
            for rt in range(n_rows):
                cands = incoming.get(rt, [])
                if not cands:
                    continue
                best_r = None
                best_total = INF
                totals = {}
                for r in cands:
                    total = path_cost.get((c, r), INF) + edge_costs[(c, r, rt)]
                    totals[r] = total
                    if total < best_total:
                        best_total = total
                        best_r = r
                path_cost[(c + 1, rt)] = best_total
                survivor_from[(c + 1, rt)] = best_r
                # Animate: winner brightens, losers dim.
                for r in cands:
                    ln = edge_lines[(c, r, rt)]
                    if r == best_r:
                        win_anims.append(
                            ln.animate.set_stroke(color=TEAL, width=3.2,
                                                  opacity=1.0))
                    else:
                        lose_anims.append(
                            ln.animate.set_stroke(color=GREY_D, width=1.0,
                                                  opacity=0.25))

            self.play(*win_anims, *lose_anims, run_time=0.9)
            self.wait(0.25)

        self.wait(0.3)

        # ---- Traceback of the ML path ----
        new_caption = Text("traceback: maximum-likelihood path",
                           font_size=20, color=GOLD)
        new_caption.to_edge(DOWN, buff=0.25)
        self.play(Transform(caption, new_caption), run_time=0.5)

        # Choose the best final state.
        final_state = min(range(n_rows),
                          key=lambda r: path_cost.get((n_cols - 1, r), INF))

        # Reconstruct path from end to start.
        path_states = [final_state]
        cur = final_state
        for c in range(n_cols - 1, 0, -1):
            prev = survivor_from[(c, cur)]
            path_states.append(prev)
            cur = prev
        path_states = path_states[::-1]  # now t0 -> t_last

        # Highlight nodes + edges along the path, from end to start.
        tb_anims = []
        end_node = nodes[(n_cols - 1, path_states[-1])]
        self.play(end_node.animate.set_color(GOLD).scale(1.6), run_time=0.4)

        for c in range(n_cols - 1, 0, -1):
            r_to = path_states[c]
            r_from = path_states[c - 1]
            ln = edge_lines[(c - 1, r_from, r_to)]
            node = nodes[(c - 1, r_from)]
            self.play(
                ln.animate.set_stroke(color=GOLD, width=5.0, opacity=1.0),
                node.animate.set_color(GOLD).scale(1.6),
                run_time=0.45,
            )

        self.wait(1.2)


class MessagePassing(Scene):
    """Belief propagation on a small Tanner graph.

    6 circular variable nodes (top) and 3 square check nodes (bottom), joined
    by edges. Messages flow variable->check then check->variable for two
    iterations; one initially-wrong (red) bit flips to correct (green) as the
    beliefs update.
    """

    def construct(self):
        title = Text("LDPC: Tanner Graph", font_size=30)
        title.to_edge(UP, buff=0.3)
        self.play(Write(title), run_time=0.7)

        n_var = 6
        n_chk = 3

        # Variable nodes (top row).
        var_xs = np.linspace(-4.5, 4.5, n_var)
        var_y = 1.5
        # Check nodes (bottom row).
        chk_xs = np.linspace(-3.0, 3.0, n_chk)
        chk_y = -1.6

        var_nodes = []
        var_labels = []
        # Initial bit values; bit index 2 starts WRONG (red).
        bit_values = ["0", "1", "1", "0", "1", "0"]
        wrong_idx = 2
        for i in range(n_var):
            col = RED if i == wrong_idx else GREEN
            c = Circle(radius=0.32, color=WHITE, stroke_width=2.5,
                       fill_color=col, fill_opacity=0.85, z_index=3)
            c.move_to([var_xs[i], var_y, 0])
            lab = Text(bit_values[i], font_size=22, color=BLACK, z_index=4)
            lab.move_to(c.get_center())
            var_nodes.append(c)
            var_labels.append(lab)

        chk_nodes = []
        for j in range(n_chk):
            sq = Square(side_length=0.55, color=WHITE, stroke_width=2.5,
                        fill_color=BLUE_E, fill_opacity=0.9, z_index=3)
            sq.move_to([chk_xs[j], chk_y, 0])
            plus = Text("+", font_size=24, color=WHITE, z_index=4)
            plus.move_to(sq.get_center())
            chk_nodes.append(VGroup(sq, plus))

        # Edges: each check connects to a subset of variables (parity checks).
        # A simple, connected, regular-ish structure.
        check_conns = {
            0: [0, 1, 2, 3],
            1: [1, 2, 4, 5],
            2: [0, 3, 4, 5],
        }

        edges = {}  # (j, i) -> Line
        for j, vars_in in check_conns.items():
            for i in vars_in:
                ln = Line(chk_nodes[j][0].get_center(),
                          var_nodes[i].get_center(),
                          stroke_width=1.8, color=GREY, z_index=1)
                edges[(j, i)] = ln

        var_group = VGroup(*var_nodes, *var_labels)
        chk_group = VGroup(*chk_nodes)

        self.play(
            LaggedStart(*[GrowFromCenter(c) for c in var_nodes],
                        lag_ratio=0.05),
            *[FadeIn(l) for l in var_labels],
            run_time=1.0,
        )
        self.play(
            LaggedStart(*[GrowFromCenter(g) for g in chk_nodes],
                        lag_ratio=0.08),
            run_time=0.8,
        )
        self.play(
            LaggedStart(*[Create(e) for e in edges.values()],
                        lag_ratio=0.02),
            run_time=1.2,
        )

        # Node-type legend.
        v_leg = VGroup(
            Circle(radius=0.16, color=WHITE, stroke_width=2,
                   fill_color=GREEN, fill_opacity=0.85),
            Text("variable (bit)", font_size=16, color=GREY_A),
        ).arrange(RIGHT, buff=0.18)
        c_leg = VGroup(
            Square(side_length=0.3, color=WHITE, stroke_width=2,
                   fill_color=BLUE_E, fill_opacity=0.9),
            Text("check (parity)", font_size=16, color=GREY_A),
        ).arrange(RIGHT, buff=0.18)
        legend = VGroup(v_leg, c_leg).arrange(RIGHT, buff=0.7)
        legend.next_to(title, DOWN, buff=0.15)
        self.play(FadeIn(legend), run_time=0.5)

        caption = Text("belief propagation decoding",
                       font_size=22, color=YELLOW)
        caption.to_edge(DOWN, buff=0.3)
        self.play(FadeIn(caption), run_time=0.5)

        def flow_dot(start, end, color):
            d = Dot(point=start, radius=0.07, color=color, z_index=5)
            return d, MoveAlongPath(d, Line(start, end), run_time=0.6)

        def send_messages(var_to_check, color):
            """Animate a wave of message dots along all edges."""
            dots = []
            anims = []
            for (j, i), ln in edges.items():
                v_pt = var_nodes[i].get_center()
                c_pt = chk_nodes[j][0].get_center()
                if var_to_check:
                    start, end = v_pt, c_pt
                else:
                    start, end = c_pt, v_pt
                d = Dot(point=start, radius=0.07, color=color, z_index=5)
                dots.append(d)
                anims.append(MoveAlongPath(d, Line(start, end)))
            self.add(*dots)
            self.play(LaggedStart(*anims, lag_ratio=0.03), run_time=0.9)
            self.play(*[FadeOut(d) for d in dots], run_time=0.3)

        # ---- Iteration 1 ----
        it_label = Text("iteration 1", font_size=18, color=ORANGE)
        it_label.to_corner(UR, buff=0.4).shift(DOWN * 0.6)
        self.play(FadeIn(it_label), run_time=0.3)

        # variable -> check
        v2c = Text("variable → check", font_size=18, color=TEAL)
        v2c.next_to(it_label, DOWN, buff=0.2)
        self.play(FadeIn(v2c), run_time=0.3)
        send_messages(var_to_check=True, color=TEAL)

        # check -> variable
        c2v = Text("check → variable", font_size=18, color=MAROON_B)
        c2v.move_to(v2c)
        self.play(Transform(v2c, c2v), run_time=0.3)
        send_messages(var_to_check=False, color=MAROON_B)

        # ---- Iteration 2 ----
        it2 = Text("iteration 2", font_size=18, color=ORANGE)
        it2.move_to(it_label)
        self.play(Transform(it_label, it2), run_time=0.3)

        v2c2 = Text("variable → check", font_size=18, color=TEAL)
        v2c2.move_to(v2c)
        self.play(Transform(v2c, v2c2), run_time=0.3)
        send_messages(var_to_check=True, color=TEAL)

        c2v2 = Text("check → variable", font_size=18, color=MAROON_B)
        c2v2.move_to(v2c)
        self.play(Transform(v2c, c2v2), run_time=0.3)
        send_messages(var_to_check=False, color=MAROON_B)

        # ---- Belief update: the wrong bit flips to correct ----
        flip_caption = Text("beliefs converge: bit corrected",
                            font_size=22, color=GREEN)
        flip_caption.to_edge(DOWN, buff=0.3)
        self.play(Transform(caption, flip_caption), run_time=0.4)

        # Flash the connected checks, then flip the red bit to green and "0".
        connected_checks = [j for j, vs in check_conns.items()
                            if wrong_idx in vs]
        self.play(
            *[Indicate(chk_nodes[j], color=YELLOW, scale_factor=1.2)
              for j in connected_checks],
            run_time=0.8,
        )

        new_label = Text("0", font_size=22, color=BLACK, z_index=4)
        new_label.move_to(var_nodes[wrong_idx].get_center())
        self.play(
            var_nodes[wrong_idx].animate.set_fill(GREEN, opacity=0.85),
            Transform(var_labels[wrong_idx], new_label),
            Flash(var_nodes[wrong_idx].get_center(), color=GREEN,
                  flash_radius=0.55),
            run_time=1.0,
        )
        self.wait(1.2)
