#!/usr/bin/env python3
"""Measure a full-body figure's proportions, as percentages of its own height.

    python3 tools/measure_figure_proportions.py <image> [<image> ...]
    python3 tools/measure_figure_proportions.py --against public/lab/kai_photo_cut.webp <new art>

Why percentages: the real photo and the drawn character are different pixel sizes, so the only way to ask
"is the art the same body" is to normalise both to their own height (crown 0%, sole 100%) and compare the
landmarks. `--against` prints the deltas, which is what an art brief needs — "shoulders +20%" is actionable
where "the shoulders look narrow" is not.

The figure is taken from the alpha channel, so the image must be cut out. Landmarks:

* HEAD is crown to chin, the chin being the narrowest row in the top quarter — the neck. That works on a
  standing front view and would not on a turned head or a scarf.
* SHOULDER WIDTH is read a little BELOW the neck, not at the widest row of the upper body: with arms at the
  sides the widest row is the elbows or the hips, which is why an earlier version of this reported the
  shoulder line at 40% down the body.
* CROTCH is the first row below 40% that splits into two runs with a gap STRADDLING THE CENTRE LINE. On
  loose trousers the legs may never separate at all, in which case it is reported as "-" rather than guessed
  — Kai's photo is exactly that case, so do not brief against it.
* HEM is where the torso garment ends, found as the row where the middle of the figure jumps in brightness.
  It is the usable torso/legs landmark when the crotch is hidden, and it is what to brief against.
* SHOE TOP is where the width flares past the ankle's.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

GAP_FRACTION = 0.03   # a leg gap must be this much of the figure's width to count
FLARE = 1.12          # a shoe is this much wider than the ankle above it


def measure(path: Path) -> dict[str, float]:
    a = np.asarray(Image.open(path).convert("RGBA"))
    mask = a[:, :, 3] > 40
    if not mask.any():
        raise SystemExit(f"{path}: nothing opaque in it — is the background cut out?")
    ys, xs = np.nonzero(mask)
    m = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape
    widths = m.sum(axis=1)
    pct = lambda y: y / h * 100

    neck = int(np.argmin(widths[int(h * .08):int(h * .25)])) + int(h * .08)
    head_h, head_w = pct(neck), widths[:neck].max() / h * 100
    shoulder_w = widths[min(h - 1, neck + int(h * .03))] / h * 100

    # THE CROTCH GAP MUST STRADDLE THE CENTRE LINE. With the arms hanging free there is a gap between each
    # arm and the torso from about 40% down, and those sit at roughly 10-25% and 75-85% of the width — an
    # earlier version took the first gap it found and so reported the ARMPIT as the crotch, five points too
    # high, on every figure it measured.
    crotch = None
    for y in range(int(h * .40), int(h * .80)):
        edges = np.diff(np.r_[0, m[y].astype(int), 0])
        starts, ends = np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)
        for i in range(len(starts) - 1):
            lo, hi = ends[i], starts[i + 1]
            if hi - lo > w * GAP_FRACTION and lo < w * .58 and hi > w * .42:
                crotch = pct(y)
                break
        if crotch is not None:
            break

    ankle = np.median(widths[int(h * .78):int(h * .86)])
    shoe = next((pct(y) for y in range(int(h * .82), h) if widths[y] > ankle * FLARE), None)

    # The two shoes separately. They are at DIFFERENT heights in both the photo and the art — the near foot
    # is forward and lower — and it is the FAR (viewer's-left) shoe that decides whether a caption plate
    # tucks behind the sole the way it does on the photo, so aligning on the pair's average is not enough.
    near_cols = m[int(h * .88):].sum(axis=0)
    split = int(w * .3) + int(np.argmin(near_cols[int(w * .3):int(w * .7)]))
    left_w = m[:, :split].sum(axis=1)
    left_ankle = np.median(left_w[int(h * .78):int(h * .86)])
    left_top = next((pct(y) for y in range(int(h * .80), h) if left_w[y] > left_ankle * FLARE), None)
    left_sole = pct(np.nonzero(m[:, :split].any(axis=1))[0].max())
    right_sole = pct(np.nonzero(m[:, split:].any(axis=1))[0].max())

    # Hem: the torso garment is darker than the trousers here, so walk the middle band down and take the
    # first sustained lift in brightness. Sustained, because a single bright row is a highlight or a belt.
    rgb = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1, :3].astype(float)
    band = slice(int(w * .38), int(w * .62))
    tone = np.array([rgb[y, band][m[y, band]].mean() if m[y, band].any() else np.nan for y in range(h)])
    shirt = np.nanpercentile(tone[int(h * .28):int(h * .45)], 50)
    trous = np.nanpercentile(tone[int(h * .60):int(h * .85)], 50)
    hem = None
    if np.isfinite(shirt) and np.isfinite(trous) and trous > shirt:
        thr, run = (shirt + trous) / 2, int(h * .04)
        hem = next((pct(y) for y in range(int(h * .30), int(h * .75))
                    if np.all(tone[y:y + run] > thr)), None)

    return {"head height": head_h, "head width": head_w, "shoulder width": shoulder_w,
            "head:shoulders": shoulder_w / head_w, "heads tall": 100 / head_h,
            "hem": hem if hem is not None else float("nan"),
            "crotch": crotch if crotch is not None else float("nan"),
            "shoe top": shoe if shoe is not None else float("nan"),
            "L shoe top": left_top if left_top is not None else float("nan"),
            "L sole": left_sole, "R sole": right_sole,
            "chest width": widths[int(h * .28)] / h * 100,
            "hip width": widths[int(h * .46)] / h * 100}


def show(label: str, d: dict[str, float]) -> None:
    print(f"--- {label}")
    for k, v in d.items():
        if not np.isfinite(v):
            print(f"    {k:16s}      -   (not visible in this image)")
            continue
        unit = "" if k in ("head:shoulders", "heads tall") else "%"
        print(f"    {k:16s} {v:6.1f}{unit}")


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    ref = None
    if argv[0] == "--against":
        if len(argv) < 3:
            print("--against needs a reference image and at least one image to compare"); return 2
        ref = measure(Path(argv[1])); show(f"{Path(argv[1]).name}  (reference)", ref); print()
        argv = argv[2:]
    for f in argv:
        d = measure(Path(f))
        show(Path(f).name, d)
        if ref:
            print("    deltas to reach the reference:")
            for k in d:
                if not (np.isfinite(d[k]) and np.isfinite(ref[k])):
                    continue
                if k in ("head:shoulders", "heads tall"):
                    print(f"      {k:16s} {d[k]:.2f} -> {ref[k]:.2f}")
                else:
                    diff = ref[k] - d[k]
                    pc = (ref[k] / d[k] - 1) * 100 if d[k] else float("nan")
                    print(f"      {k:16s} {d[k]:5.1f}% -> {ref[k]:5.1f}%  ({diff:+.1f} points, {pc:+.0f}%)")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
