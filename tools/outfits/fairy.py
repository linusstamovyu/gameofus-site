"""Fairy-tale land: pointed wizard hat with a star, short cape, a glowing orb at one hand.
Nala: a flower crown and a tiny cape.

behind(d, c, s) draws under the sprite; front(d, c, s) over it. Coordinates are
native cell pixels (see common.Cell) multiplied by s.
"""
from __future__ import annotations

import colorsys
import math

from PIL import ImageDraw

from .common import INK, LAD_COLOR, Cell

GOLD = (250, 206, 84, 255)
GOLD_DARK = (196, 134, 40, 255)
NIGHT = (44, 32, 86, 255)          # twilight violet the lad colour is sunk into
GLOW = (255, 244, 190)
PETALS = [(247, 150, 196, 255), (255, 236, 150, 255), (190, 160, 240, 255), (255, 255, 255, 255)]
LEAF = (96, 170, 92, 255)


def _mix(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3)) + (255,)


def _deep(col, v):
    """Same hue, more saturated, darker, with a breath of twilight violet (yellow must not turn khaki)."""
    h, sat, _ = colorsys.rgb_to_hsv(*(x / 255 for x in col[:3]))
    r, g, b = colorsys.hsv_to_rgb(h, min(1.0, sat * 1.1), v)
    return _mix((int(r * 255), int(g * 255), int(b * 255)), NIGHT, 0.12)


def _tones(c: Cell):
    lad = LAD_COLOR[c.who]
    return {
        "hat": _deep(lad, 0.78),               # deep, still clearly his colour
        "hat_dark": _deep(lad, 0.52),
        "band": _mix(lad, (255, 255, 255), 0.25),
        "cape": _mix(lad, NIGHT, 0.55),
        "cape_dark": _mix(lad, NIGHT, 0.82),
        "lining": _mix(lad, (255, 255, 255), 0.15),
    }


def _poly(d, pts, s, fill, w=1.2):
    d.polygon([(x * s, y * s) for x, y in pts], fill=fill, outline=INK, width=max(1, int(w * s)))


def _star(d, x, y, r, s, fill=GOLD):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    _poly(d, pts, s, fill, 0.7)


def _swing(c: Cell) -> float:
    return {0: 0.0, 1: 2.0, 2: -1.5}[c.step]


# ---------------------------------------------------------------- people

def _cape_behind(d, c: Cell, s, t):
    y0 = c.neck + 1
    y1 = c.waist + 7
    sw = _swing(c)
    if c.facing == "down":
        # Only the edges show past the shoulders and under the arms.
        _poly(d, [(c.body_l + 4, y0), (c.body_l - 3 - sw * 0.4, y1), (c.bcx, y1 + 2),
                  (c.body_r + 3 + sw * 0.4, y1), (c.body_r - 4, y0)], s, t["lining"])
        _poly(d, [(c.body_l + 5, y0 + 1), (c.body_l - 1 - sw * 0.4, y1 - 1), (c.body_r + 1 + sw * 0.4, y1 - 1),
                  (c.body_r - 5, y0 + 1)], s, t["cape"], 0.8)
    elif c.facing == "left":
        # A long triangle from the nape down his back to knee height, flaring out behind with the step.
        nx, ny = c.hcx + 6, c.neck - 1
        knee = c.top + c.h * 0.8
        back = c.hcx + 12                           # back of the torso (not the swinging arm)
        _poly(d, [(nx, ny), (back, ny + 2), (min(back + 14 + sw, 62), knee), (back + 7 + sw * 0.6, knee + 2.5),
                  (c.hcx + 2, knee - 3), (c.hcx + 2, ny + 4)], s, t["cape"])
        # Lining showing on the trailing edge, and a fold down the middle.
        _poly(d, [(back, ny + 3), (min(back + 14 + sw, 62), knee), (back + 8 + sw * 0.6, knee + 1.5), (back + 1, ny + 10)],
              s, t["lining"], 0.7)
        d.line([(back - 1) * s, (ny + 6) * s, (back + 5 + sw * 0.6) * s, (knee - 1) * s], fill=t["cape_dark"],
               width=int(1.2 * s))


def _cape_back(d, c: Cell, s, t):
    """Seen from behind: the whole cape over his back."""
    y0 = c.neck
    y1 = c.waist + 7
    sw = _swing(c)
    l, r = c.body_l, c.body_r
    _poly(d, [(c.hcx - 8, y0), (c.hcx + 8, y0), (r + 2 + sw * 0.4, y1), (c.bcx + 6, y1 + 2),
              (c.bcx, y1 - 1), (c.bcx - 6, y1 + 2), (l - 2 + sw * 0.4, y1)], s, t["cape"])
    # Fold lines.
    for fx in (-0.28, 0.28):
        x = c.bcx + (r - l) * fx
        d.line([(c.hcx + fx * 12) * s, (y0 + 4) * s, (x + sw * 0.3) * s, (y1 - 1) * s],
               fill=t["cape_dark"], width=int(1.4 * s))
    # Collar across the shoulders.
    d.rounded_rectangle([(c.hcx - 9) * s, (y0 - 1.5) * s, (c.hcx + 9) * s, (y0 + 2.5) * s], radius=2 * s,
                        fill=t["lining"], outline=INK, width=int(0.9 * s))


def _clasp(d, c: Cell, s, t):
    y = c.neck + 1.5
    if c.facing == "down":
        # Collar tips over both shoulders and a gold clasp.
        for side in (-1, 1):
            x0 = c.hcx + side * 3
            _poly(d, [(x0, y - 1.5), (c.hcx + side * 11, y + 0.5), (c.hcx + side * 7, y + 3.5)], s, t["cape"], 0.8)
        d.ellipse([(c.hcx - 2) * s, (y - 1.5) * s, (c.hcx + 2) * s, (y + 2.5) * s], fill=GOLD, outline=INK,
                  width=int(0.7 * s))
    elif c.facing == "left":
        _poly(d, [(c.hcx + 1, y - 2.5), (c.hcx + 9, y - 1.5), (c.hcx + 12.5, y + 3.5), (c.hcx + 5, y + 2)], s, t["cape"], 0.8)
        d.line([(c.hcx - 4) * s, (y + 1) * s, (c.hcx + 5) * s, (y - 1) * s], fill=t["cape_dark"], width=int(1.6 * s))
        d.ellipse([(c.hcx - 5.5) * s, (y - 0.5) * s, (c.hcx - 2) * s, (y + 3) * s], fill=GOLD, outline=INK,
                  width=int(0.7 * s))


def _hat(d, c: Cell, s, t):
    cx = c.hcx + (1.5 if c.facing == "left" else 0)
    bw = max(c.headw * 0.64, 20)                   # brim half-width
    by = c.top + (c.eye - c.top) * 0.42            # brim sits on the hair, well above the eyes
    H = 22
    bend = 7 if c.facing != "left" else 8          # tip droops to screen-right (behind him side-on)
    base = bw * 0.58
    tipx, tipy = cx + bend, by - H + 3
    cone = [
        (cx - base, by),
        (cx - base * 0.62, by - H * 0.42),
        (cx - base * 0.2, by - H * 0.78),
        (cx + 1.5, by - H),
        (tipx, tipy),
        (cx + base * 0.38, by - H * 0.62),
        (cx + base * 0.72, by - H * 0.3),
        (cx + base, by),
    ]
    # Brim back half, then cone, then brim front lip.
    d.ellipse([(cx - bw) * s, (by - 3.4) * s, (cx + bw) * s, (by + 3.4) * s], fill=t["hat_dark"], outline=INK,
              width=int(1.2 * s))
    _poly(d, cone, s, t["hat"], 1.3)
    # Shade down the right side of the cone.
    _poly(d, [(cx + 1.5, by - H + 1.5), (cx + base * 0.38, by - H * 0.62), (cx + base * 0.72, by - H * 0.3),
              (cx + base - 0.5, by - 0.5), (cx + base * 0.45, by - 0.5), (cx + base * 0.3, by - H * 0.4)],
          s, t["hat_dark"], 0.01)
    # Band.
    d.polygon([((cx - base * 0.97) * s, (by - 1) * s), ((cx - base * 0.9) * s, (by - 4.2) * s),
               ((cx + base * 0.9) * s, (by - 4.2) * s), ((cx + base * 0.97) * s, (by - 1) * s)],
              fill=t["band"], outline=INK, width=int(0.8 * s))
    d.arc([(cx - bw) * s, (by - 3.4) * s, (cx + bw) * s, (by + 3.4) * s], 0, 180, fill=INK, width=int(1.4 * s))
    # Tip bobble star and the emblem (emblem only where the front of the hat faces the camera).
    _star(d, tipx + 0.5, tipy + 0.5, 2.6, s)
    if c.facing == "down":
        _star(d, cx - 0.5, by - H * 0.36, 3.6, s)
    elif c.facing == "left":
        _star(d, cx - base * 0.35, by - H * 0.36, 3.0, s)


def _orb(d, x, y, s, lad, r=4.2, halo=True):
    if halo:
        for rr, a in ((8.4, 60), (6.8, 100), (5.4, 150)):
            d.ellipse([(x - rr) * s, (y - rr) * s, (x + rr) * s, (y + rr) * s], fill=_mix(lad, GLOW, 0.6)[:3] + (a,))
    tint = _mix(lad, (255, 255, 255), 0.35)
    d.ellipse([(x - r) * s, (y - r) * s, (x + r) * s, (y + r) * s], fill=tint, outline=INK, width=int(0.9 * s))
    d.ellipse([(x - r * 0.6) * s, (y - r * 0.6) * s, (x + r * 0.45) * s, (y + r * 0.45) * s], fill=GLOW + (255,))
    d.ellipse([(x - r * 0.55) * s, (y - r * 0.65) * s, (x - r * 0.1) * s, (y - r * 0.2) * s], fill=(255, 255, 255, 255))
    # Two sparkles.
    for sx, sy, k in ((x + r + 2, y - r - 1.5, 1.8), (x - r - 1.5, y + r + 1, 1.3)):
        d.line([(sx - k) * s, sy * s, (sx + k) * s, sy * s], fill=(255, 250, 200, 255), width=int(0.8 * s))
        d.line([sx * s, (sy - k) * s, sx * s, (sy + k) * s], fill=(255, 250, 200, 255), width=int(0.8 * s))


def _orb_pos(c: Cell):
    bob = {0: 0.0, 1: -1.0, 2: 1.0}[c.step]
    if c.facing == "down":
        x, y = c.body_r + 4.5, c.waist - 3 + bob
    elif c.facing == "left":
        x, y = c.body_l - 4.5, c.waist - 4 + bob
    else:
        x, y = c.body_l - 4.5, c.waist - 3 + bob
    return min(max(x, 8.5), 64 - 8.5), y   # keep the glow inside the 64px cell


# ---------------------------------------------------------------- Nala

def _nala_crown(d, c: Cell, s):
    if c.facing == "left":
        cx, w = c.head_r - 1.5, c.headw * 0.62
        y = c.top + 5
    else:
        cx, w = c.hcx, c.headw * 0.56
        y = c.top + 5
    n = 5
    # Vine behind the flowers.
    d.arc([(cx - w) * s, (y - 3) * s, (cx + w) * s, (y + 4) * s], 190, 350, fill=LEAF, width=int(1.6 * s))
    for i in range(n):
        f = i / (n - 1)
        x = cx - w * 0.9 + 1.8 * w * 0.9 * f
        yy = y - math.sin(f * math.pi) * 2.2
        col = PETALS[i % len(PETALS)]
        r = 3.1 if i == n // 2 else 2.7
        for k in range(5):
            a = k * 2 * math.pi / 5 - math.pi / 2
            px, py = x + math.cos(a) * r * 0.75, yy + math.sin(a) * r * 0.75
            d.ellipse([(px - r * 0.62) * s, (py - r * 0.62) * s, (px + r * 0.62) * s, (py + r * 0.62) * s],
                      fill=col, outline=INK, width=max(1, int(0.6 * s)))
        d.ellipse([(x - r * 0.4) * s, (yy - r * 0.4) * s, (x + r * 0.4) * s, (yy + r * 0.4) * s], fill=GOLD)


def _nala_cape(d, c: Cell, s, t, layer):
    sw = _swing(c) * 0.6
    if c.facing == "down" and layer == "behind_unused":
        # Flares out past her chest on both sides.
        y0, y1 = c.neck - 3, c.neck + 15
        _poly(d, [(c.body_l + 6, y0), (c.body_l - 5 - sw, y1), (c.bcx, y1 + 2), (c.body_r + 5 + sw, y1),
                  (c.body_r - 6, y0)], s, t["lining"])
        _poly(d, [(c.body_l + 7, y0 + 1), (c.body_l - 3 - sw, y1 - 1), (c.body_r + 3 + sw, y1 - 1),
                  (c.body_r - 7, y0 + 1)], s, t["cape"], 0.8)
    elif c.facing == "down" and layer == "front":
        y = c.neck - 1
        d.arc([(c.hcx - 12) * s, (y - 6) * s, (c.hcx + 12) * s, (y + 2) * s], 20, 160, fill=t["cape"], width=int(2.2 * s))
        d.ellipse([(c.hcx - 2.2) * s, (y - 0.5) * s, (c.hcx + 2.2) * s, (y + 3.9) * s], fill=GOLD, outline=INK,
                  width=int(0.7 * s))
    elif c.facing == "up" and layer == "front":
        y0 = c.top + c.h * 0.40
        y1 = y0 + 10
        _poly(d, [(c.hcx - 7, y0), (c.hcx + 7, y0), (c.body_r - 4 + sw, y1), (c.bcx, y1 + 2),
                  (c.body_l + 4 + sw, y1)], s, t["cape"])
        d.line([c.hcx * s, (y0 + 3) * s, (c.bcx + sw) * s, (y1 - 1) * s], fill=t["cape_dark"], width=int(1.2 * s))
        d.rounded_rectangle([(c.hcx - 8) * s, (y0 - 1.5) * s, (c.hcx + 8) * s, (y0 + 2) * s], radius=1.5 * s,
                            fill=t["lining"], outline=INK, width=int(0.8 * s))
    elif c.facing == "left" and layer == "front":
        # Tied at the back of her neck (behind the ear) and draped along her back, flaring towards the tail.
        nx = c.head_r + 13                          # tucked under the back of the ear, at the nape
        by = c.top + c.h * 0.40                     # her back line
        _poly(d, [(nx, by - 3), (nx + 8, by - 1.5), (nx + 15 + sw, by + 0.5), (nx + 16.5 + sw, by + 5),
                  (nx + 9 + sw * 0.5, by + 6), (nx + 2, by + 4)], s, t["cape"])
        _poly(d, [(nx + 14 + sw, by + 1), (nx + 16.5 + sw, by + 5), (nx + 12 + sw * 0.7, by + 5.5)], s, t["lining"], 0.6)
        d.ellipse([(nx - 3) * s, (by - 3.5) * s, (nx + 1) * s, (by + 0.5) * s], fill=GOLD, outline=INK, width=int(0.7 * s))


# ---------------------------------------------------------------- entry points

def _knight(d, c: Cell, s: float, t, layer: str):
    """Rico: light armour and an open helmet; his curls and face stay recognisable."""
    if layer == "behind" and c.facing == "up":
        _poly(d, [(c.body_l + 3, c.neck + 2), (c.body_r - 3, c.neck + 2),
                  (c.body_r + 3, c.waist + 6), (c.body_l - 3, c.waist + 6)], s, (180, 192, 204, 255))
        return
    if layer != "front":
        return
    steel, shade = (210, 220, 229, 255), (126, 145, 164, 255)
    # Open-faced helm only rides above the brow; it never replaces his hair or face.
    x, y = c.hcx, c.top + 3
    d.arc([(x - c.headw * .55) * s, (y - 7) * s, (x + c.headw * .55) * s, (y + 12) * s], 185, 355,
          fill=steel, width=int(3 * s))
    d.line([(x - c.headw * .48) * s, (y + 2) * s, (x + c.headw * .48) * s, (y + 2) * s], fill=shade, width=int(1.5 * s))
    # Armour reads as broad shoulder plates and a gold-trimmed breastplate.
    y0, y1 = c.neck + 4, c.waist + 2
    _poly(d, [(c.body_l + 2, y0), (c.body_r - 2, y0), (c.body_r - 1, y1), (c.body_l + 1, y1)], s, steel, .9)
    d.line([c.hcx * s, (y0 + 2) * s, c.hcx * s, (y1 - 1) * s], fill=t["band"], width=int(1.5 * s))
    d.ellipse([(c.hcx - 2) * s, (y0 + 5) * s, (c.hcx + 2) * s, (y0 + 9) * s], fill=GOLD, outline=INK, width=int(.6 * s))


def _ranger(d, c: Cell, s: float, t, layer: str):
    """Kai: hooded cloak, bow over the back, and a simple diagonal harness."""
    sw = _swing(c)
    if layer == "behind":
        if c.facing == "up":
            _cape_back(d, c, s, t)
        # The bow is symmetric enough to survive the game's right-facing mirror.
        bx = c.body_r + 5 if c.facing != "left" else c.body_r + 2
        by = c.neck + 6
        d.arc([(bx - 5) * s, (by - 13) * s, (bx + 7) * s, (by + 19) * s], 265, 95, fill=(105, 72, 41, 255), width=int(2 * s))
        d.line([(bx + 1) * s, (by - 12) * s, (bx + 1) * s, (by + 18) * s], fill=(239, 229, 192, 255), width=max(1, int(.7 * s)))
        return
    # A low hood rim deliberately leaves the original fringe and eyes visible.
    d.arc([(c.hcx - c.headw * .54) * s, (c.top - 2) * s, (c.hcx + c.headw * .54) * s, (c.neck + 5) * s],
          192, 345, fill=t["cape"], width=int(3 * s))
    d.line([(c.body_l + 4) * s, (c.neck + 5) * s, (c.body_r - 4 + sw * .2) * s, (c.waist + 2) * s],
           fill=GOLD, width=int(1.6 * s))


def _bard(d, c: Cell, s: float, t, layer: str):
    """Ethan: feathered cap, gold-trimmed tunic, and a lute carried on his back."""
    if layer == "behind":
        # Round lute body with a narrow neck; it flips cleanly with side movement.
        x = c.body_r + 3 if c.facing != "left" else c.body_r - 1
        y = c.waist - 3
        d.ellipse([(x - 7) * s, (y - 2) * s, (x + 7) * s, (y + 12) * s], fill=(166, 103, 52, 255), outline=INK, width=int(1 * s))
        d.line([x * s, (y + 1) * s, (x + 4) * s, (y - 14) * s], fill=(112, 67, 42, 255), width=int(2.3 * s))
        return
    # Soft cap sits on top of the hair, and a large readable feather gives the bard silhouette.
    y = c.top + 4
    d.arc([(c.hcx - c.headw * .58) * s, (y - 4) * s, (c.hcx + c.headw * .58) * s, (y + 10) * s], 180, 360,
          fill=t["hat"], width=int(3 * s))
    _poly(d, [(c.hcx + c.headw * .28, y - 2), (c.hcx + c.headw * .58, y - 11),
              (c.hcx + c.headw * .52, y + 1)], s, (246, 232, 184, 255), .7)
    d.line([(c.body_l + 3) * s, (c.neck + 6) * s, (c.body_r - 3) * s, (c.neck + 6) * s], fill=GOLD, width=int(1.7 * s))


def behind(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    t = _tones(c)
    if c.pet:
        _nala_cape(d, c, s, t, "behind")
        return
    if c.who == "rico":
        _knight(d, c, s, t, "behind"); return
    if c.who == "kai":
        _ranger(d, c, s, t, "behind"); return
    if c.who == "ethan":
        _bard(d, c, s, t, "behind"); return
    _cape_behind(d, c, s, t)
    if c.facing == "up":
        # Held out in front of him: only its glow shows round his side.
        x, y = _orb_pos(c)
        _orb(d, x, y, s, LAD_COLOR[c.who])


def front(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    t = _tones(c)
    if c.pet:
        _nala_cape(d, c, s, t, "front")
        _nala_crown(d, c, s)
        return
    if c.who == "rico":
        _knight(d, c, s, t, "front"); return
    if c.who == "kai":
        _ranger(d, c, s, t, "front"); return
    if c.who == "ethan":
        _bard(d, c, s, t, "front"); return
    if c.facing == "up":
        _cape_back(d, c, s, t)
    else:
        _clasp(d, c, s, t)
        x, y = _orb_pos(c)
        _orb(d, x, y, s, LAD_COLOR[c.who])
    _hat(d, c, s, t)
