#!/usr/bin/env python3
"""Pack a reference-guided 9-frame ImageGen strip into the site's exact walk grid.

ImageGen returns a correctly ordered strip but not an exact canvas size. This keeps each
generated frame intact, removes only a solid black generation backdrop, and resizes the
whole strip to nine 128x256 runtime cells. It intentionally never composites source art.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def pack(source: Path, target: Path, reference: Path | None = None) -> None:
    image = Image.open(source).convert("RGBA")
    data = np.asarray(image).copy()
    # The requested transparency is sometimes delivered as a solid #000 canvas. Only
    # near-neutral near-black pixels are keyed, retaining coloured dark-brown outlines.
    rgb = data[:, :, :3]
    black = (rgb.max(axis=2) <= 3) & (rgb.min(axis=2) >= 0)
    data[black, 3] = 0
    # ImageGen commonly leaves a tall empty band above this sprite format. Fit its
    # generated body height to the accepted source's median body height, then anchor
    # the generated soles on the sheet bottom. This preserves the generated drawing
    # rather than borrowing any source pixels.
    prepared = Image.fromarray(data)
    alpha = data[:, :, 3] > 40
    raw_heights = []
    for i in range(9):
        ys = np.nonzero(alpha[:, round(i * prepared.width / 9):round((i + 1) * prepared.width / 9)])[0]
        if len(ys): raw_heights.append(int(ys.max() - ys.min() + 1))
    scale = 256 / prepared.height
    if reference and reference.exists() and raw_heights:
        ref = np.asarray(Image.open(reference).convert("RGBA"))[:, :, 3] > 40
        target_heights = []
        for i in range(9):
            ys = np.nonzero(ref[:, i * 128:(i + 1) * 128])[0]
            if len(ys): target_heights.append(int(ys.max() - ys.min() + 1))
        scale = float(np.median(target_heights)) / float(np.median(raw_heights))
    ys = np.nonzero(alpha)[0]
    bottom = int(ys.max()) + 1
    crop_height = min(prepared.height, max(1, round(256 / scale)))
    top = max(0, bottom - crop_height)
    prepared = prepared.crop((0, top, prepared.width, bottom))
    packed = prepared.resize((1152, 256), Image.Resampling.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    packed.save(target)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("--reference", type=Path)
    args = parser.parse_args()
    pack(args.source, args.target, args.reference)
