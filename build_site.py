"""Export all Marimo notebooks as WASM-powered interactive HTML for GitHub Pages.

Strategy: Export each notebook to its own subdirectory, then deduplicate
the assets/ folder by symlinking (or on Windows, copying once and pointing
all index.html files to the shared assets).
"""
import subprocess
import os
import glob
import shutil
import re
import sys
import html as html_lib

os.chdir(os.path.dirname(__file__))

DOCS_DIR = "docs"
NOTEBOOKS_DIR = "notebooks"


def prune_copied_instruction_files():
    removed = 0
    for path in glob.glob(os.path.join(DOCS_DIR, "**", "CLAUDE.md"), recursive=True):
        os.remove(path)
        removed += 1
    if removed:
        print(f"Pruned {removed} copied CLAUDE.md files")

# Clean docs
if os.path.exists(DOCS_DIR):
    shutil.rmtree(DOCS_DIR)
os.makedirs(DOCS_DIR, exist_ok=True)

# Copy animations
anim_src = "animations/rendered"
anim_dst = os.path.join(DOCS_DIR, "animations", "rendered")
if os.path.exists(anim_src):
    os.makedirs(anim_dst, exist_ok=True)
    for gif in glob.glob(os.path.join(anim_src, "*.gif")):
        shutil.copy2(gif, anim_dst)
    print(f"Copied {len(glob.glob(os.path.join(anim_dst, '*.gif')))} animation GIFs")

# Export notebooks
notebooks = sorted(glob.glob(os.path.join(NOTEBOOKS_DIR, "*.py")))
succeeded = 0
failed = 0
shared_assets_copied = False

for nb in notebooks:
    name = os.path.basename(nb).replace(".py", "")
    out_dir = os.path.join(DOCS_DIR, name)

    print(f"Exporting {name}...")
    result = subprocess.run(
        [
            sys.executable, "-m", "marimo", "export", "html-wasm",
            nb, "-o", out_dir,
            "--mode", "run",
            "--show-code",
        ],
        capture_output=True, text=True, timeout=120,
    )

    if result.returncode == 0 and os.path.exists(out_dir):
        succeeded += 1
        print(f"  OK: {name}")

        # On first success, keep assets as the shared copy
        if not shared_assets_copied:
            src_assets = os.path.join(out_dir, "assets")
            shared_assets = os.path.join(DOCS_DIR, "assets")
            if os.path.exists(src_assets) and not os.path.exists(shared_assets):
                shutil.copytree(src_assets, shared_assets)
                shared_assets_copied = True
                print(f"  Saved shared assets/ ({len(os.listdir(shared_assets))} files)")

        # Remove duplicate assets from this notebook dir
        local_assets = os.path.join(out_dir, "assets")
        if os.path.exists(local_assets) and shared_assets_copied:
            shutil.rmtree(local_assets)

        # Rewrite the index.html to point to shared assets at ../assets/
        idx_path = os.path.join(out_dir, "index.html")
        if os.path.exists(idx_path):
            with open(idx_path, encoding="utf-8") as f:
                html = f.read()
            # Fix asset references: ./assets/ or assets/ -> ../assets/
            html = html.replace('"./assets/', '"../assets/')
            html = html.replace('"assets/', '"../assets/')
            # Also fix unquoted src/href
            html = re.sub(r'(?<=["\'])assets/', '../assets/', html)
            with open(idx_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(html)

        # Copy shared static files to notebook dir (.nojekyll, favicon, etc)
        for static_file in ["favicon.ico", ".nojekyll"]:
            src = os.path.join(DOCS_DIR, name, static_file)
            dst_root = os.path.join(DOCS_DIR, static_file)
            if os.path.exists(src) and not os.path.exists(dst_root):
                shutil.copy2(src, dst_root)
    else:
        failed += 1
        print(f"  FAILED: {name}")
        if result.stderr:
            print(f"  {result.stderr[:200]}")

# Create root index.html that redirects or copies home's
home_idx = os.path.join(DOCS_DIR, "home", "index.html")
root_idx = os.path.join(DOCS_DIR, "index.html")
if os.path.exists(home_idx):
    with open(home_idx, encoding="utf-8") as f:
        html = f.read()

    # Root index.html lives one level above home/, so shared assets are ./assets/.
    root_html = html.replace('"../assets/', '"./assets/')

    with open(root_idx, "w", encoding="utf-8", newline="\n") as f:
        f.write(root_html)
    print("\nCreated root index.html with shared asset paths")

# Copy standalone HTML pages (quiz, etc.) to docs root
for html_file in glob.glob("*.html"):
    shutil.copy2(html_file, os.path.join(DOCS_DIR, html_file))
    print(f"Copied {html_file} to docs/")

# Publish the markdown flashcard decks so the quiz's source decks are visible.
flashcards_src = "flashcards"
flashcards_dst = os.path.join(DOCS_DIR, "flashcards")
if os.path.isdir(flashcards_src):
    shutil.copytree(flashcards_src, flashcards_dst, dirs_exist_ok=True)
    deck_files = sorted(glob.glob(os.path.join(flashcards_src, "*.md")))
    links = "\n".join(
        f'<li><a href="{html_lib.escape(os.path.basename(path))}">{html_lib.escape(os.path.basename(path))}</a></li>'
        for path in deck_files
    )
    index_html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Information Theory Flashcard Decks</title>
<style>
body{{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.55;color:#172033}}
a{{color:#0369a1}}
li{{margin:.4rem 0}}
</style>
</head>
<body>
<h1>Information Theory Flashcard Decks</h1>
<p>These markdown decks mirror the flashcard content used by the interactive quiz.</p>
<ul>
{links}
</ul>
<p><a href="../quiz.html">Back to the study tool</a></p>
</body>
</html>
"""
    with open(os.path.join(flashcards_dst, "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(index_html)
    print(f"Copied {len(deck_files)} flashcard decks to docs/flashcards/")

prune_copied_instruction_files()

# Copy .nojekyll to root (prevents GitHub from processing with Jekyll)
nojekyll = os.path.join(DOCS_DIR, ".nojekyll")
if not os.path.exists(nojekyll):
    open(nojekyll, "w").close()

print(f"\nSite built: {succeeded} succeeded, {failed} failed")
print(f"Assets size: {sum(os.path.getsize(os.path.join(DOCS_DIR, 'assets', f)) for f in os.listdir(os.path.join(DOCS_DIR, 'assets'))) / 1024 / 1024:.1f} MB (shared)")
