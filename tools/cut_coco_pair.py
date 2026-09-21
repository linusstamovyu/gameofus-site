#!/usr/bin/env python3
"""Coco's start-screen pair: the real photo beside the character, cropped to ONE framing.

The hero's pair is two pictures of one person that the intro slides onto a single spot, scans a
digitise line down and cross-cuts between (heroLab.ts's `drawTransform`). That only reads if the two
are framed the SAME -- same body span, same scale, same head position -- because both are drawn
`standing(im, cx, ground, bigH)`, i.e. at one height with their feet on one line and their centres on
one column. Kai's pair is two full-length pictures. Coco's real photo stops at her thighs (owner:
"crop both so it's the same viewing as in her real photo, so upper torso"), so the CHARACTER is cropped
to meet the photo rather than the photo padded out to meet the character.

IT PRODUCES THE PHOTO HALF ONLY. Cropping can move a figure; it cannot change its proportions, and the
drawing's are not the photograph's -- her drawn head is a fifth too big for the body under it, so every
landmark on her face sits low however the two are cropped. The CHARACTER half is therefore warped onto
this crop by `tools/fit_coco_to_photo.py`, which is run after this and writes `coco_bust.webp`. Run this
one first and that one second; this one must never write the bust, or a re-run silently throws the warp
away.

A WARNING ABOUT THE WAISTBAND BELOW. `waistband()` looks for the first sustained run of denim-blue rows,
which is unambiguous on the CHARACTER and wrong on the PHOTOGRAPH: her jeans are a very light wash and
her white bodysuit is blue-grey in shadow, so it fires on her own top some 130px above the real
waistband and the unit it hands back is 13% short. What saves the crop is that it is barely a crop --
0.05 units of headroom over a unit that long puts the top edge three pixels into a cut-out that is
already trimmed to her, and the bottom lands past the file's own last row -- so what ships is, in
effect, the whole cut-out with a little air either side, which is the right frame whatever the number
said. The proportions are handled downstream, where they are read off a 1% ruler and written down
(`fit_coco_to_photo.py`'s landmark table). Re-crop this and re-read that table.

  python3 tools/cut_coco_pair.py && python3 tools/fit_coco_to_photo.py
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PHOTO = Path("/tmp/coco_cut_raw.png")          # tools/cut_subject_photo.swift on "Coco Real photo.jpg"
ART = ROOT / "source/regen-2026-09/out/coco-photo-pose/coco_fullbody_game_style_v2.png"
OUT = ROOT / "public/lab"

TOP_MARGIN = 0.05   # body units of headroom over the crown, so neither reads as cropped at the skull
SIDE_PAD = 0.06     # body units of air either side of the widest of the two figures


def alpha(im: Image.Image) -> np.ndarray:
    return np.array(im.convert("RGBA"))[:, :, 3]


def crown(a: np.ndarray) -> int:
    ys, _ = np.where(a > 16)
    return int(ys.min())


def waistband(im: Image.Image, run: int = 25, thr: int = 60) -> int:
    """First row of the jeans: the top of the first sustained run of denim-blue rows."""
    px = np.array(im.convert("RGBA")).astype(int)
    op = px[:, :, 3] > 128
    r, g, b = px[:, :, 0], px[:, :, 1], px[:, :, 2]
    rows = (op & (b > r + 12) & (b > 110) & (r > 90) & (g > r)).sum(1)
    for y in range(len(rows) - run):
        if all(rows[y + k] > thr for k in range(run)):
            return y
    raise SystemExit("no waistband found")


def head_centre(a: np.ndarray, top: int, unit: float) -> float:
    """The x the eye anchors on: the centroid of the hair mass in the first fifth of a head."""
    band = a[top:top + int(unit * 0.22)] > 16
    xs = np.where(band)[1]
    return float(xs.mean())


def measure(path: Path):
    im = Image.open(path).convert("RGBA")
    a = alpha(im)
    top, waist = crown(a), waistband(im)
    unit = waist - top                      # 1 body unit = crown -> waistband
    return im, a, top, unit, head_centre(a, top, unit)


photo = measure(PHOTO)
art = measure(ART)
# The photo decides the framing: its own bottom edge, in body units below the waistband.
below = (photo[0].height - (photo[2] + photo[3])) / photo[3]
print(f"photo: crown {photo[2]} unit {photo[3]} head cx {photo[4]:.0f} -> {below:.3f} units below the waist")
print(f"art:   crown {art[2]} unit {art[3]} head cx {art[4]:.0f}")

TOP = -TOP_MARGIN
BOT = 1 + below

# How wide the crop must be: the wider of the two figures inside that band, plus air.
half = 0.0
for im, a, top, unit, cx in (photo, art):
    y0, y1 = int(top + TOP * unit), int(top + BOT * unit)
    band = a[max(0, y0):min(a.shape[0], y1)] > 16
    xs = np.where(band)[1]
    half = max(half, abs(xs.min() - cx) / unit, abs(xs.max() - cx) / unit)
half += SIDE_PAD
print(f"crop: {BOT - TOP:.3f} units tall, {2 * half:.3f} wide")

# The art is measured (it is what decides how wide the frame has to be) but never written: see above.
for im, a, top, unit, cx, name in (
    (*photo, "coco_photo_cut"),
):
    box = (round(cx - half * unit), round(top + TOP * unit),
           round(cx + half * unit), round(top + BOT * unit))
    out = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
    out.paste(im.crop(box), (0, 0))
    dst = OUT / f"{name}.webp"
    out.save(dst, "WEBP", quality=92, method=6)
    print(f"wrote {dst.relative_to(ROOT)} {out.size}")
print("now run: python3 tools/fit_coco_to_photo.py")
