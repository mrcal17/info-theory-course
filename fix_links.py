"""Fix textbook PDF links to use file:// URLs that browsers can open."""
import glob, re, os

os.chdir(os.path.dirname(__file__))

textbooks_dir = os.path.abspath("textbooks").replace("\\", "/")
file_url_base = "file:///" + textbooks_dir

pattern = re.compile(r"\(\.\./textbooks/([^\)]+)\)")

fixed = 0
for nb in sorted(glob.glob("notebooks/*.py")):
    with open(nb, encoding="utf-8") as f:
        content = f.read()

    new_content = pattern.sub(lambda m: f"({file_url_base}/{m.group(1)})", content)

    if new_content != content:
        count = len(pattern.findall(content))
        with open(nb, "w", encoding="utf-8") as f:
            f.write(new_content)
        fixed += count
        print(f"  Fixed {count} links in {os.path.basename(nb)}")

print(f"Total: {fixed} links updated")
print(f"Example URL: {file_url_base}/MML.pdf")
