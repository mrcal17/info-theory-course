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

    # Fix links: /?file=X.py -> ../X/index.html (relative from home/)
    # But for root index.html, links should be ./X/index.html
    root_html = html.replace('"../assets/', '"./assets/')
    root_html = re.sub(
        r'href="/?[?]file=(\w+)\.py"',
        lambda m: f'href="./{m.group(1)}/index.html"',
        root_html,
    )
    root_html = re.sub(
        r'href="/\?file=(\w+)\.py"',
        lambda m: f'href="./{m.group(1)}/index.html"',
        root_html,
    )

    with open(root_idx, "w", encoding="utf-8", newline="\n") as f:
        f.write(root_html)
    print("\nCreated root index.html with fixed links")

    # Also fix links in home/index.html for when accessed at /home/
    with open(home_idx, encoding="utf-8") as f:
        html = f.read()
    html = re.sub(
        r'href="/?[?]file=(\w+)\.py"',
        lambda m: f'href="../{m.group(1)}/index.html"',
        html,
    )
    html = re.sub(
        r'href="/\?file=(\w+)\.py"',
        lambda m: f'href="../{m.group(1)}/index.html"',
        html,
    )
    with open(home_idx, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)

# Copy standalone HTML pages (quiz, etc.) to docs root
for html_file in glob.glob("*.html"):
    shutil.copy2(html_file, os.path.join(DOCS_DIR, html_file))
    print(f"Copied {html_file} to docs/")

prune_copied_instruction_files()

# Copy .nojekyll to root (prevents GitHub from processing with Jekyll)
nojekyll = os.path.join(DOCS_DIR, ".nojekyll")
if not os.path.exists(nojekyll):
    open(nojekyll, "w").close()

print(f"\nSite built: {succeeded} succeeded, {failed} failed")
print(f"Assets size: {sum(os.path.getsize(os.path.join(DOCS_DIR, 'assets', f)) for f in os.listdir(os.path.join(DOCS_DIR, 'assets'))) / 1024 / 1024:.1f} MB (shared)")
