"""Jungle temple: safari hat with a band in the lad's colour, a leather satchel, and a
rolled map or a machete handle over one shoulder. Nala: a mini safari hat and a red neckerchief.

behind(d, c, s) draws under the sprite; front(d, c, s) over it. Coordinates are
native cell pixels (see common.Cell) multiplied by s.
"""
from __future__ import annotations

from PIL import ImageDraw

from .common import INK, LAD_COLOR, Cell

KHAKI = (205, 178, 118, 255)
KHAKI_SHADE = (160, 132, 80, 255)
KHAKI_LIGHT = (232, 210, 158, 255)
LEATHER = (132, 82, 44, 255)
LEATHER_DARK = (92, 56, 30, 255)
BRASS = (226, 186, 72, 255)
PAPER = (236, 222, 178, 255)
PAPER_SHADE = (190, 168, 118, 255)
TIE = (178, 52, 44, 255)
GRIP = (70, 44, 28, 255)
STEEL = (196, 204, 212, 255)
SCARF = (206, 52, 46, 255)
SCARF_SHADE = (150, 34, 32, 255)

# What pokes over each lad's shoulder, so the squad does not read as clones.
SHOULDER = {"rico": "map", "kai": "machete", "elias": "machete", "ethan": "map"}


def W(s: float, w: float) -> int:
    return max(1, int(w * s))


def P(pts, s):
    return [(x * s, y * s) for x, y in pts]


# --------------------------------------------------------------------------- pieces

def shoulder_item(d: ImageDraw.ImageDraw, c: Cell, s: float, base: tuple[float, float], tip: tuple[float, float]) -> None:
    """A rolled map or a machete handle running from base (hidden end) to tip (poking out)."""
    kind = SHOULDER.get(c.who, "map")
    bx, by = base
    tx, ty = tip
    if kind == "map":
        d.line(P([(bx, by), (tx, ty)], s), fill=INK, width=W(s, 6.2))
        d.line(P([(bx, by), (tx, ty)], s), fill=PAPER, width=W(s, 4.2))
        # rolled end: an oval cap with the spiral showing
        d.ellipse([(tx - 3.1) * s, (ty - 2.4) * s, (tx + 3.1) * s, (ty + 2.4) * s], fill=PAPER_SHADE, outline=INK, width=W(s, 1))
        d.ellipse([(tx - 1.2) * s, (ty - 0.9) * s, (tx + 1.2) * s, (ty + 0.9) * s], outline=INK, width=W(s, 0.6))
        # red tie a third of the way down
        mx, my = tx + (bx - tx) * 0.42, ty + (by - ty) * 0.42
        d.line(P([(mx - 2.6, my + 0.6), (mx + 2.6, my - 0.6)], s), fill=TIE, width=W(s, 1.6))
    else:
        # grip, then a brass guard where it disappears into the sheath
        gx, gy = tx + (bx - tx) * 0.62, ty + (by - ty) * 0.62
        d.line(P([(bx, by), (gx, gy)], s), fill=INK, width=W(s, 5.6))
        d.line(P([(bx, by), (gx, gy)], s), fill=LEATHER_DARK, width=W(s, 3.6))
        d.line(P([(gx, gy), (tx, ty)], s), fill=INK, width=W(s, 4.8))
        d.line(P([(gx, gy), (tx, ty)], s), fill=GRIP, width=W(s, 2.8))
        for k in (0.3, 0.6):
            wx, wy = tx + (gx - tx) * k, ty + (gy - ty) * k
            d.line(P([(wx - 1.6, wy), (wx + 1.6, wy)], s), fill=(120, 84, 56, 255), width=W(s, 0.7))
        d.line(P([(gx - 3.2, gy + 0.3), (gx + 3.2, gy - 0.3)], s), fill=INK, width=W(s, 2.8))
        d.line(P([(gx - 2.4, gy + 0.3), (gx + 2.4, gy - 0.3)], s), fill=BRASS, width=W(s, 1.3))
        d.ellipse([(tx - 1.9) * s, (ty - 1.9) * s, (tx + 1.9) * s, (ty + 1.9) * s], fill=BRASS, outline=INK, width=W(s, 0.8))


def strap(d: ImageDraw.ImageDraw, s: float, a: tuple[float, float], b: tuple[float, float], w: float = 2.4) -> None:
    d.line(P([a, b], s), fill=INK, width=W(s, w + 1.6))
    d.line(P([a, b], s), fill=LEATHER, width=W(s, w))


def bag(d: ImageDraw.ImageDraw, s: float, x0: float, y0: float, x1: float, y1: float) -> None:
    d.rounded_rectangle([x0 * s, y0 * s, x1 * s, y1 * s], radius=1.6 * s, fill=LEATHER, outline=INK, width=W(s, 1.1))
    fh = (y1 - y0) * 0.48   # flap
    d.rounded_rectangle([x0 * s, y0 * s, x1 * s, (y0 + fh) * s], radius=1.6 * s, fill=LEATHER_DARK, outline=INK, width=W(s, 1.1))
    mx = (x0 + x1) / 2
    d.rectangle([(mx - 1) * s, (y0 + fh - 1) * s, (mx + 1) * s, (y0 + fh + 1.4) * s], fill=BRASS, outline=INK, width=W(s, 0.5))


def hat(d: ImageDraw.ImageDraw, c: Cell, s: float, cx: float, brim_y: float, crown_w: float, brim_w: float,
        crown_h: float, band: tuple, side: bool = False, back: bool = False) -> None:
    """Safari hat: a domed crown on a wide brim. brim_y is the brim's centre line."""
    lw = W(s, 1.2 if not c.pet else 0.9)
    bh = (3.2 if not c.pet else 2.3) if not side else (2.0 if not c.pet else 1.5)   # brim thickness as seen
    # brim (drawn first; the crown sits on it)
    bx0, bx1 = cx - brim_w / 2, cx + brim_w / 2
    d.ellipse([bx0 * s, (brim_y - bh) * s, bx1 * s, (brim_y + bh) * s], fill=KHAKI_SHADE if not back else KHAKI, outline=INK, width=lw)
    if not back and not side:
        # the upper face of the brim catches the light behind the crown
        d.ellipse([(bx0 + 1) * s, (brim_y - bh + 0.6) * s, (bx1 - 1) * s, (brim_y + bh * 0.2) * s], fill=KHAKI)
    # crown: rectangle body + dome top
    x0, x1 = cx - crown_w / 2, cx + crown_w / 2
    top = brim_y - crown_h
    dome = crown_w * 0.5
    d.pieslice([x0 * s, top * s, x1 * s, (top + dome * 2) * s], 180, 360, fill=KHAKI, outline=INK, width=lw)
    d.rectangle([x0 * s, (top + dome) * s, x1 * s, brim_y * s], fill=KHAKI)
    d.line(P([(x0, top + dome), (x0, brim_y)], s), fill=INK, width=lw)
    d.line(P([(x1, top + dome), (x1, brim_y)], s), fill=INK, width=lw)
    d.rectangle([(x0 + lw / s) * s, (top + dome - 0.5) * s, (x1 - lw / s) * s, (top + dome + 1) * s], fill=KHAKI)
    # shading down one side of the crown, a highlight on the dome
    sh = crown_w * 0.22
    d.rectangle([(x1 - sh - lw / s) * s, (top + dome) * s, (x1 - lw / s) * s, (brim_y - 0.5) * s], fill=KHAKI_SHADE)
    d.arc([(x0 + crown_w * 0.18) * s, (top + 1.4) * s, (x1 - crown_w * 0.18) * s, (top + dome * 1.6) * s], 200, 260,
          fill=KHAKI_LIGHT, width=W(s, 1.2 if not c.pet else 0.8))
    # band in the lad's colour, just above the brim
    bdh = crown_h * (0.24 if not c.pet else 0.3)
    d.rectangle([x0 * s, (brim_y - bdh - 0.4) * s, x1 * s, (brim_y - 0.4) * s], fill=band, outline=INK, width=W(s, 0.8))
    # front brim lip (over the crown's foot) when seen from the front/back
    if not side:
        d.chord([bx0 * s, (brim_y - bh) * s, bx1 * s, (brim_y + bh) * s], 0, 180, fill=KHAKI_SHADE, outline=INK, width=lw)
        d.line(P([(bx0 + 1.5, brim_y), (bx1 - 1.5, brim_y)], s), fill=KHAKI_SHADE, width=W(s, 1))
    else:
        d.line(P([(bx0 + 1, brim_y + bh * 0.2), (bx1 - 1, brim_y + bh * 0.2)], s), fill=KHAKI_SHADE, width=W(s, 0.8))


# --------------------------------------------------------------------------- people

def _person_hat(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    band = LAD_COLOR[c.who]
    brim_y = c.eye - 7.5
    crown_h = min(17.0, max(13.0, brim_y - c.top - 2))
    if c.facing == "left":
        cx = c.hcx + 0.5
        hat(d, c, s, cx, brim_y, crown_w=c.headw * 0.8, brim_w=c.headw * 1.36, crown_h=crown_h, band=band, side=True)
    else:
        cx = (c.head_l + c.head_r) / 2
        hat(d, c, s, cx, brim_y, crown_w=c.headw * 0.78, brim_w=c.headw * 1.34, crown_h=crown_h, band=band,
            back=c.facing == "up")


def _shoulders(c: Cell) -> tuple[float, float, float]:
    """left shoulder x, right shoulder x, shoulder y (front/back views)."""
    sy = c.neck + 3
    return c.body_l + 9, c.body_r - 9, sy


def behind(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    if c.pet:
        return
    right = c.who in ("kai", "ethan")    # which shoulder the item rides over (from the lad's view)
    if c.facing == "down":
        lx, rx, sy = _shoulders(c)
        # lad's right shoulder is on the viewer's left
        if right:
            shoulder_item(d, c, s, base=(lx + 4, sy + 10), tip=(lx - 5, c.neck - 9))
        else:
            shoulder_item(d, c, s, base=(rx - 4, sy + 10), tip=(rx + 5, c.neck - 9))
    elif c.facing == "left":
        # on his back (the right of the cell), poking up behind the neck
        bx = c.head_r - 4
        shoulder_item(d, c, s, base=(bx - 2, c.waist - 2), tip=(bx + 6, c.neck - 9))


def front(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    if c.pet:
        _nala(d, c, s)
        return
    lx, rx, sy = _shoulders(c)
    hip = c.waist + 1
    right = c.who in ("kai", "ethan")
    if c.facing == "down":
        # strap from the shoulder opposite the bag, across the chest to the hip
        if right:
            strap(d, s, (rx, sy - 1), (lx - 1, hip - 2))
            bag(d, s, c.body_l + 3, hip - 4, c.body_l + 15, hip + 7)
        else:
            strap(d, s, (lx, sy - 1), (rx + 1, hip - 2))
            bag(d, s, c.body_r - 15, hip - 4, c.body_r - 3, hip + 7)
    elif c.facing == "up":
        # item over the shoulder lies across the back; bag on the back, strap the other way
        if right:
            shoulder_item(d, c, s, base=(lx + 12, sy + 14), tip=(rx + 4, c.neck - 8))
            strap(d, s, (lx, sy - 1), (rx - 2, hip - 2))
            bag(d, s, c.bcx - 3, hip - 5, c.bcx + 11, hip + 6)
        else:
            shoulder_item(d, c, s, base=(rx - 12, sy + 14), tip=(lx - 4, c.neck - 8))
            strap(d, s, (rx, sy - 1), (lx + 2, hip - 2))
            bag(d, s, c.bcx - 11, hip - 5, c.bcx + 3, hip + 6)
    else:
        # side: strap down the chest, bag at the hip
        bx = c.bcx
        strap(d, s, (bx + 2, c.neck + 1), (bx - 3, hip - 2), w=2.2)
        bag(d, s, bx - 6, hip - 4, bx + 5, hip + 7)
    _person_hat(d, c, s)


# --------------------------------------------------------------------------- Nala

def _nala(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    band = LAD_COLOR["nala"]
    if c.facing == "left":
        # neckerchief tied behind the head, the point showing at the throat
        nx, ny = c.head_r - 1, c.top + c.h * 0.46
        d.polygon(P([(nx - 9, ny - 1), (nx + 3, ny - 4), (nx + 4, ny + 1), (nx - 8, ny + 4)], s), fill=SCARF, outline=INK)
        d.polygon(P([(nx - 9, ny), (nx - 4, ny + 3), (nx - 9, ny + 8)], s), fill=SCARF_SHADE, outline=INK)
        hat(d, c, s, c.hcx + 2, c.top + 7.5, crown_w=13, brim_w=23, crown_h=9, band=band, side=True)
        return
    cx = (c.head_l + c.head_r) / 2
    ny = c.neck - 2 if c.facing == "down" else c.top + 21
    hw = c.headw * 0.34
    if c.facing == "down":
        d.polygon(P([(cx - hw, ny - 2), (cx + hw, ny - 2), (cx + hw - 1, ny + 1.5), (cx - hw + 1, ny + 1.5)], s), fill=SCARF, outline=INK)
        d.polygon(P([(cx - 7, ny + 0.5), (cx + 7, ny + 0.5), (cx, ny + 9)], s), fill=SCARF, outline=INK)
        d.line(P([(cx - 4, ny + 2.5), (cx, ny + 7)], s), fill=SCARF_SHADE, width=W(s, 1))
        d.ellipse([(cx - 1) * s, (ny + 3) * s, (cx + 1) * s, (ny + 5) * s], fill=(255, 240, 220, 255))
    else:
        d.polygon(P([(cx - hw, ny - 3), (cx + hw, ny - 3), (cx + hw - 1, ny + 0.5), (cx - hw + 1, ny + 0.5)], s), fill=SCARF, outline=INK)
        d.ellipse([(cx - 2.2) * s, (ny - 3.2) * s, (cx + 2.2) * s, (ny + 1) * s], fill=SCARF_SHADE, outline=INK, width=W(s, 0.8))
        d.polygon(P([(cx - 1, ny), (cx - 4.5, ny + 6), (cx - 1.2, ny + 5)], s), fill=SCARF, outline=INK)
        d.polygon(P([(cx + 1, ny), (cx + 4.5, ny + 6), (cx + 1.2, ny + 5)], s), fill=SCARF, outline=INK)
    hat(d, c, s, cx, c.top + 8, crown_w=15, brim_w=26, crown_h=9.5, band=band, back=c.facing == "up")
