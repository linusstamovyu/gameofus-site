#!/usr/bin/env python3
"""Cut the September 2026 Codex regen into the site's 9-cell walk sheets.

    python3 tools/cut_regen_2026_09.py            # all of them
    python3 tools/cut_regen_2026_09.py rico:mars  # some ("beach" is a world here)

Source: source/regen-2026-09/out/, which delivers ONE PNG PER FACING holding three figures
(idle, step A, step B) — where tools/recut_outfit_sheets.py's older source was a single strip of
nine. Output: source/outfits/recut/<who>_walk_<world>.png, 1152x256, the same nine 128x256 cells
deploy_regenerated_outfits.py and build_site_assets.py already read.

Everything about keying and fitting is recut_outfit_sheets', imported rather than restated. Two
things are this delivery's own:

* RICO ARRIVED ON A BLACK CARD. His 32 sheets are RGB with no alpha at all, where everybody else's
  came through keyed. key_backdrop handles it — only pure black CONNECTED TO THE EDGE goes, plus
  enclosed pockets — which matters because Rico's outline, soles and hair shadow are dark too, and a
  plain "remove dark pixels" key eats holes straight through him. Measured on his beach sheet: the
  card is 78% of the frame and a loose threshold took 84%, i.e. five points of Rico.
* THE SCALE IS PER FACING, not per sheet. The generator drew each facing at its own size (Kai's rows
  are 295px tall, Rico's 362), so one scale for all nine cells leaves a character changing height as
  he turns. Each facing is scaled so ITS OWN IDLE frame reaches the reference height — the idle, not
  the median, because a walking frame is legitimately shorter than a standing one and anchoring on
  the median would make the stiller facings tall.

* THE ROWS CARRY BLEED FROM THE ROW BELOW. Codex generated 4x3 atlases and sliced them into these
  per-facing PNGs, so most figures come with a detached lump of the next row underneath them —
  measured on Rico's beach-left row, ~1,900px sitting at y334-361 under a body ending at y299. It is
  ~8% of the body, so recut's 2%-of-the-largest speck filter sails straight past it, and because the
  lump is INSIDE the figure's column span it stretches the bounding box: fit_frame then reads the
  lump as the feet, and the character is drawn small and floating with a clot of someone else's hair
  at his ankles. Only pieces vertically TOUCHING the main body are kept. Anything a character
  legitimately holds — Elias's mic, Coco's bag, Kai's watch — is level with the body and survives;
  this is only ever about another row.

The right-facing rows in the delivery are deliberately NOT cut: the site's sheet is nine cells and
draws right by mirroring left. See the note in src/world/draw.ts.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scipy import ndimage as nd  # noqa: E402

from recut_outfit_sheets import (  # noqa: E402
    CELL_H, CELL_W, FEET_Y, OUT, figure_runs, fit_frame, key_backdrop,
)

ROW_BLEED_TOL = 10   # px a piece may sit clear of the body and still count as part of it

SITE = Path(__file__).resolve().parent.parent
SRC = SITE / "source" / "regen-2026-09" / "out"
FACINGS = ("down", "up", "left")          # the three rows a 9-cell sheet holds
WORLDS = ["beach", "mars", "neon", "jungle", "ski", "fairy"]
# Where each <who>_walk_<world>_<facing>.png lives in the delivery.
BEACH_DIR = {"ethan": "02-ethan-walk", "elias": "03-elias-walk", "coco": "04-coco-walk",
             "kai": "05-kai-walk", "rico": "06-rico-walk"}
WHO = list(BEACH_DIR)                     # Nala is not in this delivery bar her right rows
LIVE = SITE / "public" / "assets"         # the sheets the site draws today: our reference size


def ref_height(who: str) -> float:
    """How tall this character stands on the sheet the site draws TODAY, in 256-tall cell units.

    recut_outfit_sheets measures the GAME's runtime sheet, but the game tree moved (it is `Game/`
    now, not `polishedcrystal-master/`) and four site tools still point at the old path. The live
    site sheet is the better reference anyway: matching it is what stops the new art arriving a
    different size from the character it replaces. It is 576x128 against our 1152x256, hence the 2x.
    """
    a = np.asarray(Image.open(LIVE / f"{who}_walk.webp").convert("RGBA"))[:, :, 3] > 40
    w = a.shape[1] // 9
    hs = []
    for i in range(9):
        ys = np.nonzero(a[:, i * w:(i + 1) * w].any(axis=1))[0]
        if len(ys):
            hs.append(ys.max() - ys.min() + 1)
    return float(np.median(hs)) * 2


def source_png(who: str, world: str, facing: str) -> Path:
    folder = BEACH_DIR[who] if world == "beach" else "07-world-outfits"
    return SRC / folder / f"{who}_walk_{world}_{facing}.png"


def read_keyed(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """(rgba, figure mask). Uses the file's own alpha where it has one, else keys the black card."""
    im = Image.open(path).convert("RGBA")
    rgba = np.asarray(im).copy()
    if rgba[:, :, 3].min() == 255:        # no alpha channel in the source: Rico's black card
        rgba[:, :, 3] = key_backdrop(rgba[:, :, :3]) * 255
    return rgba, rgba[:, :, 3] > 40


def body_only(mask: np.ndarray) -> np.ndarray:
    """Drop pieces that do not vertically touch the largest one: bleed from the atlas row below."""
    lab, n = nd.label(mask)
    if n <= 1:
        return mask
    sizes = np.bincount(lab.ravel()); sizes[0] = 0
    main = int(sizes.argmax())
    boxes = nd.find_objects(lab)
    my = boxes[main - 1][0]
    keep = [i + 1 for i in range(n)
            if boxes[i] is not None
            and boxes[i][0].start <= my.stop + ROW_BLEED_TOL
            and boxes[i][0].stop >= my.start - ROW_BLEED_TOL]
    return np.isin(lab, keep)


def crown_clipped(mask: np.ndarray) -> bool:
    """True when the figure runs into the TOP EDGE of its own source row.

    The generator sliced its 4x3 atlases into these per-facing files, and on 33 of them the cut went through
    the heads: the row opens with the crown already gone, sheared flat. It is invisible in the delivery (the
    file is a valid PNG of a valid-looking figure) and invisible in the cut sheet (the cell has its usual top
    margin, because the fitter is measuring a figure whose top happens to be flat) — the only place it shows
    is the drawn character, wearing a haircut nobody asked for. Caught only because the owner spotted Rico.
    """
    return bool(mask[0].any())


def cut(who: str, world: str) -> Path:
    ref = ref_height(who)
    sheet = Image.new("RGBA", (CELL_W * 9, CELL_H), (0, 0, 0, 0))
    for r, facing in enumerate(FACINGS):
        src = source_png(who, world, facing)
        rgba, mask = read_keyed(src)
        if crown_clipped(mask):
            # Refuse rather than ship it: the crown cannot be recovered from a file that never had it, and a
            # sheared head reads as a mistake in the game where a missing sheet reads as art still to come.
            raise ValueError(f"{src.name}: the figure touches the top edge — the crown is cut off in the "
                             f"source. Re-generate this row; a re-cut cannot put back pixels that are absent.")
        runs = figure_runs(mask, n=3)
        boxes, subs = [], []
        for a, b in runs:
            sub = body_only(mask[:, a:b])
            ys = np.nonzero(sub.any(axis=1))[0]
            boxes.append((a, b, int(ys.min()), int(ys.max()) + 1))
            subs.append(sub)
        # Anchor this facing on its own idle frame, then cap so its widest/tallest frame still fits.
        idle_h = boxes[0][3] - boxes[0][2]
        scale = min(ref / idle_h,
                    (FEET_Y - 2) / max(y1 - y0 for _, _, y0, y1 in boxes),
                    (CELL_W - 4) / max(b - a for a, b, _, _ in boxes))
        for c, (a, b, y0, y1) in enumerate(boxes):
            piece = rgba[y0:y1, a:b].copy()
            keep = subs[c][y0:y1]
            piece[~keep, 3] = 0                     # the bleed must not be drawn, only un-measured
            cell = fit_frame(piece, keep, scale=scale)
            sheet.alpha_composite(cell, ((r * 3 + c) * CELL_W, 0))
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{who}_walk_{world}.png"
    sheet.save(out)
    return out


def main(argv: list[str]) -> int:
    pairs = [tuple(p.split(":")) for p in argv] or [(w, x) for w in WHO for x in WORLDS]
    bad = 0
    for who, world in pairs:
        try:
            print("wrote", cut(who, world).relative_to(SITE))
        except Exception as e:                      # a source that will not cut must name itself
            print(f"FAILED {who}:{world}: {e}"); bad += 1
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
