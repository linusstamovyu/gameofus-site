#!/usr/bin/env python3
"""Align a drawn figure's VERTICAL landmarks to a reference photo's, by stretching along y only.

    python3 tools/fit_figure_to_photo.py <art> <reference photo> <out.webp>

The fault this fixes is the one that reads worst when the photo and the character stand side by side: the
drawn figure's shirt ends higher up his body than the real one's, so the torso looks short and the legs
long. It is a vertical landmark being in the wrong place, and it can be corrected exactly.

WHY STRETCHING ALONG Y IS SAFE HERE, where scaling the head was not:

* Kai's trousers are VERTICAL STRIPES. Stretching vertically leaves a vertical line vertical — only its
  length changes — so the pattern survives untouched. A horizontal scale would visibly change the stripe
  pitch.
* The t-shirt is plain, so a few percent of extra length is invisible.
* The HEAD IS LEFT ALONE. An earlier version of this tool squeezed the head to match the photo's
  head-to-body ratio; it hit the numbers and made the face look wrong, because a face is the one thing a
  viewer measures against itself rather than against the body. Proportion faults above the neck are for the
  generator to fix, not for a resampler.

What it cannot fix is the SHOE LINE. In the photo the trousers are long and break over the shoes, hiding the
ankle; the drawn trousers stop higher and show the whole trainer. That is drawn content, not geometry — no
amount of stretching produces fabric that isn't there. Ask for it in the prompt instead.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure_figure_proportions import measure  # noqa: E402


def trim(im: Image.Image) -> Image.Image:
    a = np.asarray(im)
    ys, xs = np.nonzero(a[:, :, 3] > 40)
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__)
        return 2
    src, refp, out = Path(argv[0]), Path(argv[1]), Path(argv[2])
    art, ref = measure(src), measure(refp)
    if not np.isfinite(art["hem"]) or not np.isfinite(ref["hem"]):
        print("cannot align: the shirt hem is not measurable in one of the images")
        return 1

    # Anchors as fractions of height: the crown, the neck (the head is carried but never rescaled), the
    # hem, then the far shoe's top and sole, then the soles. The shoe pair matters because a caption plate
    # sits across the feet: it is only the FAR shoe tucking its sole behind the plate, exactly as it does on
    # the photo, that makes the drawing and the photograph read as the same picture.
    neck = art["head height"] / 100
    keys = ["hem", "L shoe top", "L sole"]
    usable = [k for k in keys if np.isfinite(art[k]) and np.isfinite(ref[k])]
    s_pts = [0.0, neck] + [art[k] / 100 for k in usable] + [1.0]
    d_pts = [0.0, neck] + [ref[k] / 100 for k in usable] + [1.0]
    if any(b <= a for a, b in zip(s_pts, s_pts[1:])) or any(b <= a for a, b in zip(d_pts, d_pts[1:])):
        print("landmarks are out of order — refusing to warp"); return 1
    for k in usable:
        print(f"  {k:12s} {art[k]:5.1f}% -> {ref[k]:5.1f}%")

    im = trim(Image.open(src).convert("RGBA"))
    w, h = im.size
    a = np.asarray(im).astype(float)
    rows = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        # Inverse map: which source row does this destination row come from.
        sf = np.interp(y / (h - 1), d_pts, s_pts) * (h - 1)
        y0 = int(np.floor(sf)); y1 = min(h - 1, y0 + 1); t = sf - y0
        rows[y] = (a[y0] * (1 - t) + a[y1] * t).round().astype(np.uint8)

    stretched = trim(Image.fromarray(rows, "RGBA"))

    # --- horizontal: the drawing is narrower than the man at every level ---------------------------------
    # Derived from the CHEST, not from an average of chest, hips and knees. The lower-body ratios are larger
    # (1.17 at the hips, 1.21 at the knees) but they are measuring the TROUSERS, whose cut differs between
    # the photo and the drawing; the chest is the one band where both are measuring the same thing. Taking
    # the median of all three overshoots to ~1.17, which widens the stripe pitch enough to read as a coarser
    # fabric than the photograph's.
    # Applied BELOW THE NECK ONLY, so the face is never rescaled — see the note above about the head.
    k = ref["chest width"] / art["chest width"]
    k = float(np.clip(k, 1.0, 1.25))
    if k > 1.005:
        w2, h2 = stretched.size
        mm = np.asarray(stretched)[:, :, 3] > 40
        nk = int(np.argmin(mm.sum(axis=1)[int(h2 * .08):int(h2 * .25)])) + int(h2 * .08)
        bx = np.nonzero(mm[nk:].any(axis=0))[0]
        cx = (bx.min() + bx.max()) / 2
        body = stretched.crop((0, nk, w2, h2)).resize((max(1, round(w2 * k)), h2 - nk), Image.LANCZOS)
        canvas = Image.new("RGBA", (max(w2, body.width) + 40, h2), (0, 0, 0, 0))
        canvas.alpha_composite(body, (int(round(cx - cx * k)) + 20, nk))
        canvas.alpha_composite(stretched.crop((0, 0, w2, nk)), (20, 0))
        stretched = canvas
        print(f"  chest width  {art['chest width']:5.1f}% -> {ref['chest width']:5.1f}%   (body x{k:.3f}, head untouched)")

    result = trim(stretched)
    result.save(out, "WEBP", quality=95, method=6) if out.suffix == ".webp" else result.save(out)
    print(f"wrote {out}  {result.size[0]}x{result.size[1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
