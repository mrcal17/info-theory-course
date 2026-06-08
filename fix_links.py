"""Normalize course reference links to public URLs for GitHub Pages."""
import glob
import os
import re


os.chdir(os.path.dirname(__file__))

PUBLIC_URLS = {
    "Ash.pdf": "https://openlibrary.org/books/OL1884498M/Information_theory",
    "CoverThomas.pdf": "https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X",
    "CsiszarKorner.pdf": "https://www.cambridge.org/core/books/information-theory/contents/EE0A80439BEAC23B499A71942AFF7B34",
    "Gallager.pdf": "https://www.wiley-vch.de/de/fachgebiete/ingenieurwesen/elektrotechnik-und-elektronik-10ee/kommunikationstechnik-10ee2/information-theory-and-reliable-communication-978-0-471-29048-3",
    "Gallager-LDPC.pdf": "https://www.webee.technion.ac.il/people/sason/Gallager_monograph.pdf",
    "Grunwald-MDL.pdf": "https://arxiv.org/pdf/math/0406077",
    "LinCostello.pdf": "https://openlibrary.org/books/OL3301344M/Error_control_coding",
    "MacKay.pdf": "https://www.inference.org.uk/itprnn/book.pdf",
    "Moser.pdf": "https://moser-isi.ethz.ch/scripts.html",
    "Moser-notes.pdf": "https://moser-isi.ethz.ch/scripts.html",
    "PolyanskiyWu.pdf": "https://people.lids.mit.edu/yp/homepage/data/itbook-export.pdf",
    "RichardsonUrbanke.pdf": "https://documents.epfl.ch/groups/i/ip/ipg/www/2010-2011/Statistical_Physics_for_Communication_and_Computer_Science/mct-new.pdf",
    "Roth.pdf": "https://www.cambridge.org/core/books/introduction-to-coding-theory/377D24BE73F473B15378776B0AE63CA3",
    "Stone.pdf": "https://arxiv.org/pdf/1802.05968",
    "Yeung.pdf": "https://iest2.ie.cuhk.edu.hk/~whyeung/post/draft2.pdf",
}

LOCAL_LINK_PATTERNS = [
    re.compile(r"file:///[^)\s]+/textbooks/([^)/\s]+\.pdf)"),
    re.compile(r"\.\./textbooks/([^)\s]+\.pdf)"),
]


def public_url(match):
    filename = match.group(1)
    return PUBLIC_URLS.get(filename, match.group(0))


fixed = 0
for nb in sorted(glob.glob("notebooks/*.py")):
    with open(nb, encoding="utf-8") as f:
        content = f.read()

    new_content = content
    for pattern in LOCAL_LINK_PATTERNS:
        new_content, count = pattern.subn(public_url, new_content)
        fixed += count

    if new_content != content:
        with open(nb, "w", encoding="utf-8", newline="\n") as f:
            f.write(new_content)
        print(f"  Normalized links in {os.path.basename(nb)}")

print(f"Total: {fixed} legacy textbook links normalized")
