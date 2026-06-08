"""
Render all Manim animations for the Information Theory course.
Run from the course directory:  python render_animations.py

Renders each scene to a GIF in animations/rendered/<SceneName>.gif at medium quality.
Adapted for Manim Community v0.20.x, which names outputs <Scene>_ManimCE_vX.Y.Z.gif —
we locate that file and copy it to the clean <SceneName>.gif the notebooks expect.

NOTE: scenes use Text/MarkupText only (no MathTex/Tex) so no LaTeX install is required.
"""
import subprocess
import sys
import os
import glob
import shutil
from pathlib import Path

# (source_file, scene_class_name) — one entry per animation embedded in the notebooks.
SCENES = [
    # Part 1 — Core Measures
    ("core_measures.py", "EntropySurprise"),     # 1A
    ("core_measures.py", "MutualInfoDiagram"),   # 1B
    ("core_measures.py", "TypicalSet"),          # 1C
    # Part 2 — Source Coding
    ("source_coding.py", "HuffmanTree"),         # 2B
    ("source_coding.py", "ArithmeticInterval"),  # 2C
    # Part 3 — Channels
    ("channels.py", "ChannelCodingCliff"),       # 3B
    ("channels.py", "WaterFilling"),             # 3C
    # Part 4 — Codes
    ("codes.py", "ViterbiTrellis"),              # 4C
    ("codes.py", "MessagePassing"),              # 4D
    # Part 5 — Lossy
    ("lossy.py", "RateDistortionCurve"),         # 5A
    # Part 6 — IT for ML
    ("it_ml.py", "InformationPlane"),            # 6C
    ("it_ml.py", "BetaVAEPlane"),                # 6E
]

QUALITY = "m"  # l/m/h/k -> 480p/720p/1080p/4k


def render_scene(src_file: str, scene_name: str) -> bool:
    src_path = Path("animations/src") / src_file
    out_dir = Path("animations/rendered")
    media_dir = out_dir / "_media"
    final_gif = out_dir / f"{scene_name}.gif"

    if not src_path.exists():
        print(f"  SKIP: {src_path} not found")
        return False
    if final_gif.exists():
        print(f"  EXISTS: {final_gif}")
        return True

    cmd = [
        sys.executable, "-m", "manim", "render",
        f"-q{QUALITY}", "--format", "gif",
        "--media_dir", str(media_dir),
        str(src_path), scene_name,
    ]
    print(f"  Rendering {scene_name} ...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT: {scene_name}")
        return False

    if result.returncode != 0:
        print(f"  FAILED: {scene_name}\n  {result.stderr[-400:]}")
        return False

    # Manim CE v0.20 writes <Scene>_ManimCE_vX.Y.Z.gif somewhere under media_dir.
    matches = glob.glob(str(media_dir / "videos" / "**" / f"*{scene_name}*.gif"), recursive=True)
    if not matches:
        print(f"  WARNING: render OK but no GIF found for {scene_name}")
        return False
    matches.sort(key=os.path.getmtime)
    shutil.copy2(matches[-1], final_gif)
    print(f"  OK: {final_gif}")
    return True


def main():
    os.chdir(Path(__file__).parent)
    out_dir = Path("animations/rendered")
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Rendering {len(SCENES)} animations...\n")
    ok = fail = 0
    for i, (src_file, scene_name) in enumerate(SCENES, 1):
        print(f"[{i}/{len(SCENES)}] {src_file}::{scene_name}")
        if render_scene(src_file, scene_name):
            ok += 1
        else:
            fail += 1

    print(f"\n{'=' * 50}\nDone: {ok} rendered, {fail} failed")
    print(f"GIFs in: {out_dir.resolve()}")


if __name__ == "__main__":
    main()
