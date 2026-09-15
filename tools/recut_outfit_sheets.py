#!/usr/bin/env python3
"""Recut the regenerated outfit walk sheets from their raw ImageGen strips.

    python3 tools/recut_outfit_sheets.py              # all 30
    python3 tools/recut_outfit_sheets.py rico:mars    # some

Source: source/outfits/Generation/simple-raw/<who>_walk_<world>_raw.png (the black-backdrop strip each
sheet in regenerated-simple was packed from, matched by re-running the old packer and by timestamp).
Output: source/outfits/recut/<who>_walk_<world>.png, 1152x256, nine 128x256 cells.

Why this exists: tools/pack_regenerated_outfit.py keyed EVERY pixel darker than 3/255, so black hair,
lenses, pupils, dark clothes and the outline were punched full of holes. Here:

* The backdrop is pure #000 and the art is not, so only pure black CONNECTED TO THE CANVAS EDGE is
  removed, plus enclosed pure-black pockets of 150px or more (the gaps between legs and arms). Smaller
  enclosed pure-black runs sit along outlines and are art.
* Frames are cut at the empty columns BETWEEN figures, never on a ninth-width grid, so skis, wands and
  feathers stay with their own frame.
* One scale for the whole sheet (sized to the character's game walk sheet, then capped so the widest
  and tallest frames fit), soles on row 247 like the game sheets, and each frame centred on its torso.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

SITE = Path(__file__).resolve().parent.parent
RAW = SITE / "source" / "outfits" / "Generation" / "simple-raw"
OUT = SITE / "source" / "outfits" / "recut"
# Regenerated single frames (source/outfits/regen-requests/CODEX_PROMPT.md): <who>_walk_<world>_cell6.png.
# Dropped in, they replace that cell on the next run; nothing else changes.
OVERRIDES = SITE / "source" / "outfits" / "regen-requests" / "out"
GAME = SITE.parent / "polishedcrystal-master" / "public" / "assets" / "characters"
FOLDER = {"rico": "Rico", "kai": "Kai", "elias": "Elias", "ethan": "Ethan", "nala": "Nala", "coco": "Coco"}
WORLDS = ["ski", "neon", "jungle", "fairy", "mars"]

CELL_W, CELL_H, FEET_Y = 128, 256, 247
POCKET_MIN = 150


def key_backdrop(rgb: np.ndarray) -> np.ndarray:
    """Alpha mask (bool) of the figure."""
    zero = rgb.max(axis=2) == 0
    lab, _ = nd.label(zero)
    border = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    sizes = np.bincount(lab.ravel())
    bg = np.isin(lab, border[border > 0]) | (zero & (sizes[lab] >= POCKET_MIN))
    return ~bg


def figure_runs(alpha: np.ndarray, n: int = 9) -> list[tuple[int, int]]:
    """Column spans of the n figures, split at empty columns."""
    cols = alpha.sum(axis=0)
    occ = cols > 0
    runs, x = [], 0
    while x < len(occ):
        if occ[x]:
            s = x
            while x < len(occ) and occ[x]:
                x += 1
            runs.append([s, x])
        x += 1
    # Specks and detached tips: fold runs holding under 1% of the ink into their nearest neighbour.
    total = alpha.sum()
    while True:
        mass = [alpha[:, a:b].sum() for a, b in runs]
        small = [i for i, m in enumerate(mass) if m < total * 0.01]
        if not small or len(runs) <= 1:
            break
        i = small[0]
        gaps = []
        if i > 0: gaps.append((runs[i][0] - runs[i - 1][1], i - 1))
        if i < len(runs) - 1: gaps.append((runs[i + 1][0] - runs[i][1], i + 1))
        j = min(gaps)[1]
        lo, hi = sorted((i, j))
        runs[lo] = [min(runs[lo][0], runs[hi][0]), max(runs[lo][1], runs[hi][1])]
        del runs[hi]
    # Touching figures: split the widest run at its thinnest column until there are n.
    while len(runs) < n:
        i = max(range(len(runs)), key=lambda k: runs[k][1] - runs[k][0])
        a, b = runs[i]
        w = b - a
        inner = cols[a + w // 4: b - w // 4]
        cut = a + w // 4 + int(np.argmin(inner))
        runs[i:i + 1] = [[a, cut], [cut, b]]
    if len(runs) != n:
        raise ValueError(f"found {len(runs)} figures, expected {n}")
    return [tuple(r) for r in runs]


def median_height(sheet: Path) -> float:
    a = np.asarray(Image.open(sheet).convert("RGBA"))[:, :, 3] > 40
    hs = []
    for i in range(9):
        ys = np.nonzero(a[:, i * CELL_W:(i + 1) * CELL_W].any(axis=1))[0]
        if len(ys): hs.append(ys.max() - ys.min() + 1)
    return float(np.median(hs))


def fit_frame(rgba: np.ndarray, mask: np.ndarray, scale: float | None = None, height: int | None = None) -> Image.Image:
    """One figure into a transparent 128x256 cell: soles on FEET_Y, centred on the torso."""
    ys, xs = np.nonzero(mask)
    y0, y1, a, b = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = Image.fromarray(rgba[y0:y1, a:b]).convert("RGBa")
    if height is not None:
        scale = height / (y1 - y0)
    scale = min(scale, (FEET_Y - 2) / (y1 - y0), (CELL_W - 4) / (b - a))
    w, h = max(1, round((b - a) * scale)), max(1, round((y1 - y0) * scale))
    small = crop.resize((w, h), Image.LANCZOS).convert("RGBA")
    band = np.asarray(small)[int(h * 0.35):int(h * 0.7), :, 3] > 40
    cx = np.nonzero(band)[1].mean() if band.any() else w / 2
    x = max(1, min(CELL_W - w - 1, round(CELL_W / 2 - cx)))
    cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    cell.alpha_composite(small, (x, FEET_Y - h))
    return cell


def override_cell(path: Path, height: int) -> Image.Image:
    """A regenerated frame on a black backdrop (or already transparent), keyed and fitted to `height`."""
    im = Image.open(path).convert("RGBA")
    rgba = np.asarray(im).copy()
    if rgba[:, :, 3].min() == 255:
        rgba[:, :, 3] = key_backdrop(rgba[:, :, :3]) * 255
    lab, n = nd.label(rgba[:, :, 3] > 40)
    if n:  # the figure is the largest piece; specks of generation noise go
        sizes = np.bincount(lab.ravel()); sizes[0] = 0
        rgba[(lab != sizes.argmax()) & (sizes[lab] < sizes.max() * 0.02), 3] = 0
    return fit_frame(rgba, rgba[:, :, 3] > 40, height=height)


def recut(who: str, world: str) -> Path:
    raw = np.asarray(Image.open(RAW / f"{who}_walk_{world}_raw.png").convert("RGB"))
    mask = key_backdrop(raw)
    rgba = np.dstack([raw, (mask * 255).astype(np.uint8)])
    runs = figure_runs(mask)
    frames = []
    for a, b in runs:
        sub = mask[:, a:b]
        ys = np.nonzero(sub.any(axis=1))[0]
        frames.append((a, b, int(ys.min()), int(ys.max()) + 1))
    heights = [y1 - y0 for _, _, y0, y1 in frames]
    widths = [b - a for a, b, _, _ in frames]
    ref = median_height(GAME / FOLDER[who] / "Runtime" / f"{who}_walk_runtime.png")
    scale = min(ref / float(np.median(heights)), (FEET_Y - 2) / max(heights), (CELL_W - 4) / max(widths))
    sheet = Image.new("RGBA", (CELL_W * 9, CELL_H), (0, 0, 0, 0))
    for i, (a, b, y0, y1) in enumerate(frames):
        # The sheet scale is already capped to the biggest frame, so fit_frame's own cap never binds here.
        sheet.alpha_composite(fit_frame(rgba[y0:y1, a:b], mask[y0:y1, a:b], scale=scale), (i * CELL_W, 0))
    for ov in sorted(OVERRIDES.glob(f"{who}_walk_{world}_cell*.png")):
        i = int(ov.stem.rsplit("cell", 1)[1])
        side = [c for c in range(9) if c // 3 == i // 3 and c != i]  # match the other frames facing that way
        target = round(float(np.median([h for c, h in enumerate(heights) if c in side])) * scale)
        sheet.paste((0, 0, 0, 0), (i * CELL_W, 0, (i + 1) * CELL_W, CELL_H))
        sheet.alpha_composite(override_cell(ov, target), (i * CELL_W, 0))
        print("  cell", i, "from", ov.name)
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{who}_walk_{world}.png"
    sheet.save(out)
    return out


def main(argv: list[str]) -> None:
    pairs = [tuple(p.split(":")) for p in argv] or [(w, x) for w in FOLDER for x in WORLDS]
    for who, world in pairs:
        print("wrote", recut(who, world).relative_to(SITE))


if __name__ == "__main__":
    main(sys.argv[1:])
