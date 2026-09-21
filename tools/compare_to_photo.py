#!/usr/bin/env python3
"""Stand a drawn figure next to the real photo at the same height, under the measured guide lines.

    python3 tools/compare_to_photo.py <art> [<art> ...]          # against Kai's photo
    python3 tools/compare_to_photo.py --photo <ref> <art> ...

Writes `figure-compare.png` next to the first art file and prints the verdict per landmark.

Why this exists rather than asking the generator for the comparison: an image model told to "place your
character beside the attached photograph" REDRAWS the photograph, so its own check image shows the character
next to a drawing of the man, not the man. The lines then line up with each other and prove nothing. This
composites the real file.

The lines are the photo's own landmarks — chin, shirt hem, top of the visible shoe. A pass is all three
crossing the same feature on both figures.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure_figure_proportions import measure  # noqa: E402

SITE = Path(__file__).resolve().parent.parent
DEFAULT_PHOTO = SITE / "public" / "lab" / "kai_photo_cut.webp"
H = 900
PAPER = (232, 222, 202)
LINES = [("head height", (90, 170, 255), "chin"),
         ("hem", (255, 205, 80), "shirt hem"),
         ("shoe top", (255, 110, 110), "top of shoe")]


def trim(p: Path) -> Image.Image:
    im = Image.open(p).convert("RGBA")
    a = np.asarray(im)
    ys, xs = np.nonzero(a[:, :, 3] > 40)
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def panel(p: Path) -> Image.Image:
    im = trim(p)
    im = im.resize((max(1, round(im.width * H / im.height)), H), Image.LANCZOS)
    bg = Image.new("RGBA", im.size, PAPER + (255,))
    bg.alpha_composite(im)
    return bg.convert("RGB")


def main(argv: list[str]) -> int:
    photo = DEFAULT_PHOTO
    if argv and argv[0] == "--photo":
        photo, argv = Path(argv[1]), argv[2:]
    if not argv:
        print(__doc__)
        return 2

    ref = measure(photo)
    panels = [("PHOTO", panel(photo))] + [(Path(f).stem[:26], panel(Path(f))) for f in argv]
    gutter, left = 26, 150
    W = left + sum(p.width + gutter for _, p in panels)
    out = Image.new("RGB", (W, H + 46), (26, 26, 26))
    d = ImageDraw.Draw(out)

    x = left
    for label, p in panels:
        d.text((x, 10), label, fill=(255, 220, 100))
        out.paste(p, (x, 34))
        x += p.width + gutter
    for key, col, label in LINES:
        if not np.isfinite(ref[key]):
            continue
        y = 34 + int(H * ref[key] / 100)
        d.line([(0, y), (W, y)], fill=col, width=1)
        d.text((4, y - 13), f"{label} {ref[key]:.1f}%", fill=col)

    dest = Path(argv[0]).with_name("figure-compare.png")
    out.save(dest)
    print(f"wrote {dest}\n")

    for f in argv:
        art = measure(Path(f))
        print(f"--- {Path(f).name}")
        for key, _, label in LINES:
            if not (np.isfinite(art[key]) and np.isfinite(ref[key])):
                print(f"    {label:14s} not measurable")
                continue
            diff = art[key] - ref[key]
            verdict = "PASS" if abs(diff) <= 1.0 else ("close" if abs(diff) <= 2.0 else "FAIL")
            print(f"    {label:14s} {art[key]:5.1f}%  vs photo {ref[key]:5.1f}%   {diff:+5.1f}  {verdict}")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
