#!/usr/bin/env python3
"""Cut a painted pink backdrop out of a game portrait for the site's face tiles.

Coco's game portrait (unlike the others) ships with a pink radial backdrop baked in. The game keeps
it; the site needs the character alone. Pink is told from skin, hair and the white top by blue beating
green: skin and hair have b < g, the backdrop has b > g. Only pink CONNECTED TO THE BORDER is removed,
plus pockets of it trapped between strands of hair, then pale pink fringe touching it, then stray specks not joined to the figure.

    python3 tools/cut_portrait_backdrop.py <in.png> <out.png>
"""
from __future__ import annotations

import sys

import numpy as np
from PIL import Image
from scipy import ndimage as nd


def cut(src: str) -> Image.Image:
    im = np.asarray(Image.open(src).convert("RGBA")).astype(int)
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    pink = (b > g + 12) & (r > g + 25)
    lab, _ = nd.label(pink)
    border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
    bg = np.isin(lab, list(border))
    # Pockets of backdrop trapped between strands of hair: any pink blob that is not a speck of detail.
    sizes = np.bincount(lab.ravel())
    bg |= np.isin(lab, [i for i in range(1, len(sizes)) if sizes[i] >= 6])
    # Pale pink fringe and anti-aliasing touching the backdrop.
    fringe = (b >= g - 4) & (r > g + 8)
    for _ in range(4):
        bg |= nd.binary_dilation(bg) & fringe
    keep = ~bg
    lab, n = nd.label(keep)
    if n:
        sizes = np.bincount(lab.ravel())[1:]
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 400])
    out = im.copy()
    out[~keep, 3] = 0
    # Despill: the outermost pixels still lean pink.
    edge = keep & nd.binary_dilation(~keep, iterations=2)
    sp = edge & (b > g)
    out[sp, 2] = g[sp]
    return Image.fromarray(out.astype(np.uint8))


if __name__ == "__main__":
    cut(sys.argv[1]).save(sys.argv[2])
