#!/usr/bin/env python3
"""Warp Coco's CHARACTER onto her real photo's composition, so the pair registers 1:1.

    python3 tools/fit_coco_to_photo.py            # writes public/lab/coco_bust.webp + the proof sheet

The hero intro slides the two pictures of one person onto ONE spot at one height and runs a digitise
line down the join (heroLab.ts's `drawTransform`), so the two only read as one person becoming a
character if their LANDMARKS sit on the same rows. `tools/cut_coco_pair.py` cropped both to one
framing and stopped there, which was not enough: cropping can move a figure, it cannot change its
proportions, and the drawing's are not the photograph's. Measured in body units of crown -> waistband:

                    photo    art (as drawn)
    glasses top     0.131    0.229
    glasses bottom  0.209    0.339
    chin            0.360    0.428
    neckline        0.470    0.547

i.e. the drawn HEAD IS A FIFTH TOO BIG for the body under it (crown->chin is 0.428 of the torso where
the photograph's is 0.360) and everything on the face therefore sits low. Cross-cut against the photo
that reads as two different people, not as one being digitised.

WHAT IT DOES, and why in this shape:

* ONE PER-ROW RESAMPLE, y and x together. Each destination row is pulled from the source row the
  piecewise-linear landmark map sends it to, and squeezed horizontally by a factor that is itself a
  function of the row. That is `tools/fit_figure_to_photo.py`'s vertical warp with the horizontal
  scale allowed to vary down the figure, which is what lets the head and the body take different
  treatment with no seam between them to hide.
* THE HEAD IS SCALED, NEVER SQUASHED. fit_figure_to_photo.py's lesson is that squeezing a face to hit
  a head-to-body ratio hits the numbers and makes the face wrong, "because a face is the one thing a
  viewer measures against itself rather than against the body". That is an argument about the head's
  own ASPECT, so the fix is to give the head band the same factor on both axes (0.84 here): her face
  keeps its shape exactly and is simply drawn smaller, which is the honest reading of the measurement.
* THE TORSO TAKES THE REST. Below the neckline the map stretches ~1.17, so the correction is shared
  between a head that shrinks a sixth and a torso that lengthens a sixth rather than being paid for
  entirely by either. Her tank top is plain and her jeans' seams are vertical, so a vertical stretch
  is invisible in both -- the same property that made Kai's stripes safe to stretch.
* THE BODY'S WIDTH IS MEASURED, not assumed to follow the head. The median silhouette-width ratio over
  the torso band decides it, clipped, so a re-drawn character cannot narrow her to a stick.
* THE LANDMARKS ARE READ OFF A 1% RULER AND WRITTEN DOWN HERE. Every colour-based finder tried on this
  pair failed on the photograph: her jeans are a very light wash and her white bodysuit is blue-grey in
  shadow, so "the first sustained run of denim" fires on her own top 130px above the waistband -- which
  is exactly what cut_coco_pair.py did, and why its framing was built on a unit 13% short. This is
  `tools/recrop_portraits.py`'s rule: measured and tabled beats a cleverer finder that can be wrong in
  silence. Re-crop either picture and re-read the table; the proof sheet is the tripwire.

The output is the photo crop's OWN pixel size, so the two files overlay exactly.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PHOTO = ROOT / "public/lab/coco_photo_cut.webp"          # tools/cut_coco_pair.py
ART = ROOT / "source/regen-2026-09/out/coco-photo-pose/coco_fullbody_game_style_v2.png"
SHEET = ROOT / "public/assets/coco_walk.webp"
OUT = ROOT / "public/lab/coco_bust.webp"
PROOF = ROOT / "source/regen-2026-09/out/coco-photo-pose/coco_pair_proof.png"   # a dev check, kept out of public/ so it never ships

# Landmarks, as fractions of each file's OWN height, read off a 1%-spaced ruler (see the docstring).
# `waist` is the top of the jeans at the front; `neck` the top of the white top at the centre chest.
PHOTO_MARKS = dict(crown=.034, glasses_top=.129, glasses_bot=.186, chin=.295, neck=.375, waist=.760)
ART_MARKS = dict(crown=.075, glasses_top=.150, glasses_bot=.186, chin=.215, neck=.254, waist=.402)
ORDER = ["crown", "glasses_top", "glasses_bot", "chin", "neck", "waist"]

TORSO_BAND = (0.55, 0.95)   # body units the width ratio is taken over: below the neckline, above the waist
BODY_X_CLIP = (0.75, 1.25)  # how far the body may be narrowed or widened, in case the art is re-drawn


def figure(path: Path, marks: dict[str, float]):
    """The image, its alpha, and its landmarks in body units of crown -> waistband."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)[:, :, 3] > 40
    h = im.height
    top = marks["crown"] * h
    unit = (marks["waist"] - marks["crown"]) * h
    us = {k: (marks[k] * h - top) / unit for k in ORDER}
    # The x the eye anchors on: the centroid of the hair mass over the first fifth of a head.
    band = a[int(top):int(top + unit * us["chin"] * 0.5)]
    cx = float(np.where(band)[1].mean())
    return dict(im=im, a=a, h=h, w=im.width, top=top, unit=unit, u=us, cx=cx)


def width_at(f, u: float) -> float:
    """The silhouette's width at a body-unit height, in body units. NaN where nothing is drawn."""
    y = int(round(f["top"] + u * f["unit"]))
    if not (0 <= y < f["h"]) or not f["a"][y].any():
        return float("nan")
    xs = np.where(f["a"][y])[0]
    return (xs.max() - xs.min() + 1) / f["unit"]


def main() -> int:
    photo, art = figure(PHOTO, PHOTO_MARKS), figure(ART, ART_MARKS)
    print("landmark        photo    art")
    for k in ORDER[1:]:
        print(f"  {k:13s} {photo['u'][k]:6.3f} {art['u'][k]:6.3f}")

    # --- the vertical map: destination body units -> source body units ------------------------------
    d_knots = [photo["u"][k] for k in ORDER]
    s_knots = [art["u"][k] for k in ORDER]
    if any(b <= a for a, b in zip(d_knots, d_knots[1:])) or any(b <= a for a, b in zip(s_knots, s_knots[1:])):
        print("landmarks are out of order — refusing to warp")
        return 1
    # np.interp clamps, so the two open ends carry their nearest segment's slope out to a far knot:
    # above the crown is hair, below the waistband is her jeans, and neither has a landmark to hit.
    up = (s_knots[1] - s_knots[0]) / (d_knots[1] - d_knots[0])
    dn = (s_knots[-1] - s_knots[-2]) / (d_knots[-1] - d_knots[-2])
    d_knots = [-1.0] + d_knots + [5.0]
    s_knots = [s_knots[0] - up] + s_knots + [s_knots[-1] + 4.0 * dn]
    y_src = lambda u: np.interp(u, d_knots, s_knots)

    head_s = photo["u"]["chin"] / art["u"]["chin"]    # the head's y factor; its x factor is the same
    print(f"\nhead   x{head_s:.3f} on both axes (uniform: the face keeps its own shape)")
    print(f"torso  y x{1 / dn:.3f} below the neckline")

    # --- the horizontal map: how much narrower the body is than the drawing ------------------------
    ratios = []
    for u in np.arange(TORSO_BAND[0], TORSO_BAND[1], 0.02):
        pw, aw = width_at(photo, u), width_at(art, y_src(u))
        if np.isfinite(pw) and np.isfinite(aw) and pw > 0:
            ratios.append(aw / pw)
    body_s = float(np.clip(1 / np.median(ratios), *BODY_X_CLIP))
    print(f"body   x{body_s:.3f} (the drawing is x{np.median(ratios):.3f} the photo's width over the torso)")

    # The factor ramps from the head's to the body's across chin -> neckline, so the hair that crosses
    # that band is never cut by a step in the scale.
    ramp0, ramp1 = photo["u"]["chin"], photo["u"]["neck"]
    smooth = lambda t: t * t * (3 - 2 * t)

    # --- resample onto the photo crop's own frame ---------------------------------------------------
    W, H = photo["w"], photo["h"]
    src = np.asarray(art["im"]).astype(np.float32)
    src[:, :, :3] *= src[:, :, 3:4] / 255.0          # premultiply, or the cut-out's edge drags black in
    sh, sw = src.shape[:2]
    out = np.zeros((H, W, 4), np.float32)
    xs_d = (np.arange(W) - photo["cx"]) / photo["unit"]

    for y in range(H):
        u = (y - photo["top"]) / photo["unit"]
        sy = art["top"] + float(y_src(u)) * art["unit"]
        s = head_s + (body_s - head_s) * smooth(float(np.clip((u - ramp0) / (ramp1 - ramp0), 0, 1)))
        sx = art["cx"] + xs_d / s * art["unit"]
        out[y] = sample(src, sx, sy, sw, sh)

    rgba = out.copy()
    al = np.clip(rgba[:, :, 3:4], 1e-6, None)
    rgba[:, :, :3] = np.clip(rgba[:, :, :3] / al * 255.0, 0, 255)   # un-premultiply
    rgba[:, :, 3] = np.clip(rgba[:, :, 3], 0, 255)
    bust = Image.fromarray(rgba.round().astype(np.uint8), "RGBA")
    bust.save(OUT, "WEBP", quality=94, method=6)
    print(f"\nwrote {OUT.relative_to(ROOT)} {bust.size}  (the photo's own frame, so the two overlay 1:1)")

    report_cell(photo, bust)
    proof(photo, bust)
    return 0


def sample(src: np.ndarray, sx: np.ndarray, sy: float, sw: int, sh: int) -> np.ndarray:
    """Bilinear, one destination row at a time. Off the source reads as transparent."""
    y0 = int(np.floor(sy)); fy = sy - y0
    x0 = np.floor(sx).astype(int); fx = (sx - x0)[:, None]
    row = np.zeros((len(sx), 4), np.float32)
    for dy, wy in ((0, 1 - fy), (1, fy)):
        yy = y0 + dy
        if not (0 <= yy < sh) or wy == 0:
            continue
        for dx, wx in ((0, 1 - fx), (1, fx)):
            xx = np.clip(x0 + dx, 0, sw - 1)
            ok = ((x0 + dx) >= 0) & ((x0 + dx) < sw)
            row += src[yy, xx] * (wy * wx) * ok[:, None]
    return row


def report_cell(photo, bust: Image.Image) -> None:
    """heroLab.ts's `cellFill` / `cellTop` for the new framing — the numbers the shrink lands on.

    They say how tall the walk sprite's whole 1x2 cell is beside the bust, and where its top is. The
    two figures are matched on the HEAD: the sprite is chibi and the bust is a crop of a realistic
    body, so no one scale makes both their heads and their feet agree, and the head is what the eye
    follows through the shrink (and the only part of her the bust and the sprite both show).
    """
    a = np.asarray(Image.open(SHEET).convert("RGBA"))[:, :, 3] > 40
    cell_h, cell_w = a.shape[0], a.shape[1] // 9
    crown = int(np.where(a[:, :cell_w].any(1))[0].min())
    chin = SPRITE_CHIN                                   # read off the same ruler, see below
    head_of_cell = (chin - crown) / cell_h
    head_of_bust = (photo["u"]["chin"] - 0) * photo["unit"] / bust.height
    cell_fill = head_of_bust / head_of_cell
    above = crown / cell_h / cell_fill - photo["top"] / bust.height   # cell top over the bust top, in bust heights
    print(f"\nheroLab.ts  cellFill: {cell_fill:.3f}   cellTop: {above:.3f}")


SPRITE_CHIN = 56    # px down the 64x128 walk cell; read off a 4px ruler over cell 0.


def proof(photo, bust: Image.Image) -> None:
    """The photo, the character, and the two silhouettes on top of each other."""
    from PIL import ImageDraw
    H = 980
    def panel(im: Image.Image) -> Image.Image:
        im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
        bg = Image.new("RGB", im.size, (236, 229, 212)); bg.alpha_composite = None
        bg.paste(im, (0, 0), im); return bg
    p, b = panel(photo["im"]), panel(bust)
    pa = np.asarray(photo["im"].resize(p.size, Image.LANCZOS))[:, :, 3] > 40
    ba = np.asarray(bust.resize(p.size, Image.LANCZOS))[:, :, 3] > 40
    ov = np.full((H, p.width, 3), 255, np.uint8)
    ov[pa & ~ba] = (255, 120, 120); ov[ba & ~pa] = (110, 170, 255); ov[pa & ba] = (118, 78, 190)
    over = Image.fromarray(ov)
    gap = 18
    W = p.width + b.width + over.width + gap * 4
    out = Image.new("RGB", (W, H + 34), (24, 24, 24))
    d = ImageDraw.Draw(out)
    x = gap
    for lab, im in (("REAL PHOTO", p), ("CHARACTER, warped", b), ("both (purple = agreed)", over)):
        d.text((x, 9), lab, fill=(255, 220, 110)); out.paste(im, (x, 30)); x += im.width + gap
    for k, col in (("glasses_top", (90, 200, 255)), ("chin", (255, 210, 90)), ("waist", (255, 110, 110))):
        y = 30 + int(H * (photo["u"][k] * photo["unit"] + photo["top"]) / photo["h"])
        d.line([(0, y), (W, y)], fill=col, width=1)
    out.save(PROOF)
    print(f"wrote {PROOF.relative_to(ROOT)}")


if __name__ == "__main__":
    raise SystemExit(main())
