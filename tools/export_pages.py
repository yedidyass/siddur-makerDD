"""Export approved, complete source pages to public/pages/.

Every exported image is one whole PDF page. Nothing is cropped, retouched or
re-typeset. Pages are normalised to one width so the reader keeps a constant
aspect ratio, and bilevel scans are stored as 1-bit PNG (smaller and sharper
than JPEG for black-and-white type).
"""
from __future__ import annotations

import argparse
import io
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "01-siddur.pdf"
OUTPUT = ROOT / "public" / "pages"
WIDTH = 1750

# Printed page numbers equal PDF page numbers in this source (see review/source-audit.md).
# 29-42 ברכות השחר; 69-250 אדון עולם through the end of the scan. Pages 43-68
# (תקון חצות, פתיחת אליהו) are not in the Shacharit recipe; see review/exclusions.md.
# Keep in step with sourcePages in public/block-catalog.js and PAGES in public/sw.js.
APPROVED = [*range(29, 43), *range(69, 251)]


def is_bilevel(image: Image.Image) -> bool:
    histogram = image.convert("L").histogram()
    return sum(histogram[16:240]) <= 0.002 * sum(histogram)


def export(number: int, document: fitz.Document) -> Path:
    xref = document[number - 1].get_images()[0][0]
    image = Image.open(io.BytesIO(document.extract_image(xref)["image"])).convert("L")
    bilevel = is_bilevel(image)
    if image.width != WIDTH:
        image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.LANCZOS)
    destination = OUTPUT / f"page-{number:03d}.png"
    if bilevel:
        image.point(lambda value: 255 if value >= 128 else 0).convert("1").save(destination, optimize=True)
    else:
        image.save(destination, optimize=True)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with fitz.open(args.source) as document:
        for number in APPROVED:
            export(number, document)
    print(f"Exported {len(APPROVED)} pages to {OUTPUT}")


if __name__ == "__main__":
    main()
