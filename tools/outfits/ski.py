"""Ski village: knitted bobble beanie, goggles pushed up, striped scarf, skis on the back.

behind(d, c, s) draws under the sprite; front(d, c, s) over it. Coordinates are
native cell pixels (see common.Cell) multiplied by s.
"""
from __future__ import annotations

import math

from PIL import ImageDraw

from .common import INK, LAD_COLOR, Cell

CREAM = (246, 242, 230, 255)
SKI = (44, 70, 122, 255)
SKI_EDGE = (210, 226, 240, 255)
STRAP = (52, 56, 66, 255)
LENS = (86, 204, 232, 255)
LENS_DARK = (40, 120, 170, 255)
GLINT = (255, 255, 255, 230)
# The measured neck sits low on lads with a short head and a bare collar; nudge the scarf up to the chin.
CHIN_DY = {"kai": -6.5}


def shade(col, k: float):
    return (int(col[0] * k), int(col[1] * k), int(col[2] * k), 255)


def lift(col, k: float):
    return tuple(int(v + (255 - v) * k) for v in col[:3]) + (255,)


def seg(d, p0, p1, w, fill, s, outline=1.2):
    """A thick line with round caps and an INK outline."""
    for width, col in ((w + 2 * outline, INK), (w, fill)):
        d.line([p0[0] * s, p0[1] * s, p1[0] * s, p1[1] * s], fill=col, width=max(1, int(width * s)))
        r = width / 2
        for x, y in (p0, p1):
            d.ellipse([(x - r) * s, (y - r) * s, (x + r) * s, (y + r) * s], fill=col)


# ---------------------------------------------------------------- skis

def ski_pair(d, c: Cell, s: float, base, tip):
    """Two parallel skis from base (low end) to tip (high end), with a white edge stripe."""
    bx, by = base
    tx, ty = tip
    L = math.hypot(tx - bx, ty - by)
    nx, ny = -(ty - by) / L, (tx - bx) / L   # normal
    for k in (-1.9, 1.9):
        p0 = (bx + nx * k, by + ny * k)
        p1 = (tx + nx * k, ty + ny * k)
        seg(d, p0, p1, 3.0, SKI, s)
        # edge stripe, stopping short of both ends
        a = (p0[0] + (p1[0] - p0[0]) * 0.1, p0[1] + (p1[1] - p0[1]) * 0.1)
        b = (p0[0] + (p1[0] - p0[0]) * 0.86, p0[1] + (p1[1] - p0[1]) * 0.86)
        d.line([a[0] * s, a[1] * s, b[0] * s, b[1] * s], fill=SKI_EDGE, width=max(1, int(0.9 * s)))
    # binding band holding the pair together
    mx, my = bx + (tx - bx) * 0.42, by + (ty - by) * 0.42
    q0 = (mx + nx * 2.6, my + ny * 2.6)
    q1 = (mx - nx * 2.6, my - ny * 2.6)
    seg(d, q0, q1, 1.6, LAD_COLOR[c.who], s, outline=0.8)


# ---------------------------------------------------------------- scarf

def scarf_tail(d, c: Cell, s: float, x, y, length, dx, width, lad):
    """A hanging scarf end: a slightly swung quad with stripes and a fringe."""
    x2 = x + dx
    y2 = y + length
    hw = width / 2
    poly = [(x - hw, y), (x + hw, y), (x2 + hw, y2), (x2 - hw, y2)]
    d.polygon([(px * s, py * s) for px, py in poly], fill=lad, outline=INK, width=max(1, int(1.1 * s)))
    for f in (0.35, 0.65):
        cx = x + dx * f
        cy = y + length * f
        d.line([(cx - hw + 0.6) * s, cy * s, (cx + hw - 0.6) * s, cy * s], fill=CREAM, width=max(1, int(1.4 * s)))
    for i in range(3):
        fx = x2 - hw + width * (i + 0.5) / 3
        d.line([fx * s, y2 * s, (fx + dx * 0.08) * s, (y2 + 1.8) * s], fill=CREAM, width=max(1, int(0.9 * s)))


def swing(c: Cell) -> float:
    """Loose scarf end sways one way on step A and the other on step B."""
    return [0.0, 2.4, -2.4][c.step]


def wrap(d, s, x0, x1, ny, lad, thick=6.2, sag=1.6):
    """The scarf round the neck: a soft band that dips a little in the middle, with knitted stripes."""
    n = 14
    top, bot = [], []
    for i in range(n + 1):
        f = i / n
        x = x0 + (x1 - x0) * f
        dip = sag * (1 - (2 * f - 1) ** 2)
        end = 1 - (abs(2 * f - 1) ** 6) * 0.35      # rounded ends
        top.append((x, ny + dip - thick / 2 * end))
        bot.append((x, ny + dip + thick / 2 * end))
    poly = top + bot[::-1]
    d.polygon([(px * s, py * s) for px, py in poly], fill=lad, outline=INK, width=max(1, int(1.2 * s)))
    w = x1 - x0
    k = max(2, round(w / 5))
    for i in range(1, k):
        f = i / k
        x = x0 + w * f
        dip = sag * (1 - (2 * f - 1) ** 2)
        d.line([x * s, (ny + dip - thick / 2 + 1.3) * s, x * s, (ny + dip + thick / 2 - 1.3) * s], fill=CREAM, width=max(1, int(1.5 * s)))


def scarf_person(d, c: Cell, s: float):
    lad = LAD_COLOR[c.who]
    ny = c.neck + CHIN_DY.get(c.who, 0.0)
    if c.facing == "left":
        x0, x1 = c.hcx - 7.5, c.hcx + 8.5
        # the loose end streams back behind him and flaps with the walk
        scarf_tail(d, c, s, x1 - 3, ny + 1.5, 11, 3.5 + swing(c), 5.0, lad)
        wrap(d, s, x0, x1, ny, lad)
        return
    half = min(13.0, (c.body_r - c.body_l) * 0.34)
    x0, x1 = c.bcx - half, c.bcx + half
    if c.facing == "down":
        wrap(d, s, x0, x1, ny, lad)
        scarf_tail(d, c, s, c.bcx - half * 0.45, ny + 2.5, 13, swing(c), 5.2, lad)
    else:
        scarf_tail(d, c, s, c.bcx + half * 0.4, ny + 2.0, 11, -swing(c) * 0.8, 5.0, lad)
        wrap(d, s, x0, x1, ny, lad)


# ---------------------------------------------------------------- beanie + goggles

def beanie(d, c: Cell, s: float, cx, w, dome_top, band_top, band_bot, lad, facing, pompom_r):
    x0, x1 = cx - w / 2, cx + w / 2
    dark = shade(lad, 0.74)
    dh = band_top - dome_top
    # dome: a tall half-ellipse, a touch narrower than the band so it reads as knit folding over
    d.chord([(x0 + 0.6) * s, dome_top * s, (x1 - 0.6) * s, (band_top + dh) * s],
            180, 360, fill=lad, outline=INK, width=max(1, int(1.4 * s)))
    # knit ribs converging to the crown
    for f in (-0.55, -0.2, 0.2, 0.55):
        xb = cx + f * w / 2
        xt = cx + f * w / 2 * 0.35
        d.line([xt * s, (dome_top + dh * 0.28) * s, xb * s, (band_top - 0.6) * s], fill=dark, width=max(1, int(0.9 * s)))
    # soft highlight on the upper left of the crown
    d.arc([(x0 + 3) * s, (dome_top + 2.2) * s, (x1 - 3) * s, (band_top + dh - 2) * s], 200, 245,
          fill=lift(lad, 0.5), width=max(1, int(1.5 * s)))
    # ribbed turned-up band
    d.rounded_rectangle([(x0 - 0.8) * s, band_top * s, (x1 + 0.8) * s, band_bot * s], radius=1.8 * s,
                        fill=dark, outline=INK, width=max(1, int(1.3 * s)))
    n = max(3, int(w / 3.0))
    for i in range(1, n):
        xx = x0 - 0.8 + (w + 1.6) * i / n
        d.line([xx * s, (band_top + 1.2) * s, xx * s, (band_bot - 1.2) * s], fill=shade(lad, 0.54), width=max(1, int(0.8 * s)))
    # pompom, sitting down into the crown
    px = cx + (1.5 if facing == "left" else 0)
    py = dome_top + pompom_r * 0.1
    d.ellipse([(px - pompom_r) * s, (py - pompom_r) * s, (px + pompom_r) * s, (py + pompom_r) * s],
              fill=CREAM, outline=INK, width=max(1, int(1.3 * s)))
    for ang, k in ((35, 0.5), (120, 0.55), (210, 0.45), (300, 0.5), (0, 0.0)):
        rx = px + math.cos(math.radians(ang)) * pompom_r * k
        ry = py + math.sin(math.radians(ang)) * pompom_r * k
        rr = pompom_r * 0.2
        d.ellipse([(rx - rr) * s, (ry - rr) * s, (rx + rr) * s, (ry + rr) * s], fill=(212, 204, 188, 255))
    d.ellipse([(px - pompom_r * 0.55) * s, (py - pompom_r * 0.6) * s, (px - pompom_r * 0.1) * s, (py - pompom_r * 0.2) * s], fill=(255, 255, 255, 255))


def lens(d, box, s):
    x0, y0, x1, y1 = box
    d.rounded_rectangle([x0 * s, y0 * s, x1 * s, y1 * s], radius=2.2 * s, fill=LENS_DARK, outline=INK, width=max(1, int(1.2 * s)))
    d.rounded_rectangle([(x0 + 1.2) * s, (y0 + 1.1) * s, (x1 - 1.2) * s, ((y0 + y1) / 2 + 0.3) * s], radius=1.2 * s, fill=LENS)
    d.line([(x0 + 1.8) * s, (y0 + 1.6) * s, (x0 + 3.4) * s, (y0 + 1.6) * s], fill=GLINT, width=max(1, int(0.9 * s)))


def person_head(d, c: Cell, s: float):
    lad = LAD_COLOR[c.who]
    band_bot = c.eye - 7.0
    band_top = band_bot - 6.0
    dome_top = c.top - 4.0
    if c.facing == "left":
        cx = c.hcx + 3.0
        w = 35.0
    else:
        cx = (c.head_l + c.head_r) / 2 * 0.5 + c.hcx * 0.5
        w = min(max(c.headw - 1, 33.0), 38.0)
    beanie(d, c, s, cx, w, dome_top, band_top, band_bot, lad, c.facing, 5.2)

    gy0, gy1 = band_top - 2.4, band_top + 4.2
    if c.facing == "down":
        # goggles pushed up onto the band: strap round the hat, frame centred on the forehead
        d.line([(cx - w / 2 - 0.6) * s, (gy0 + 3.2) * s, (cx + w / 2 + 0.6) * s, (gy0 + 3.2) * s], fill=STRAP, width=max(1, int(2.2 * s)))
        lens(d, (cx - 10.5, gy0, cx - 0.4, gy1), s)
        lens(d, (cx + 0.4, gy0, cx + 10.5, gy1), s)
    elif c.facing == "left":
        x0 = cx - w / 2
        d.line([(x0 + 6) * s, (gy0 + 3.2) * s, (cx + w / 2 + 0.6) * s, (gy0 + 3.6) * s], fill=STRAP, width=max(1, int(2.2 * s)))
        lens(d, (x0 - 1.4, gy0, x0 + 8.0, gy1), s)
    else:
        # from behind only the strap shows, with a little buckle
        d.line([(cx - w / 2 - 0.6) * s, (gy0 + 3.2) * s, (cx + w / 2 + 0.6) * s, (gy0 + 3.2) * s], fill=STRAP, width=max(1, int(2.4 * s)))
        d.rectangle([(cx - 2.2) * s, (gy0 + 1.6) * s, (cx + 2.2) * s, (gy0 + 4.8) * s], fill=(190, 196, 206, 255), outline=INK, width=max(1, int(0.8 * s)))


# ---------------------------------------------------------------- Nala

def nala_front(d, c: Cell, s: float):
    lad = LAD_COLOR[c.who]
    t = c.top
    if c.facing == "left":
        # side-on: head spans x 3..42 with the snout at the left; throat under the jaw
        scarf_tail(d, c, s, 33, t + 36, 7, 2.0 + swing(c) * 0.6, 3.6, lad)
        wrap(d, s, 22, 37, t + 34, lad, thick=5.2)
        beanie(d, c, s, 25.5, 22, t - 6.5, t + 3.5, t + 9, lad, "left", 4.0)
    elif c.facing == "down":
        wrap(d, s, 21, 43, t + 39, lad, thick=5.4)
        scarf_tail(d, c, s, 37, t + 41, 8, swing(c) * 0.7, 3.8, lad)
        beanie(d, c, s, 32, 24, t - 7, t + 3.5, t + 9, lad, "down", 4.0)
    else:
        wrap(d, s, 20, 44, t + 26, lad, thick=5.4)
        beanie(d, c, s, 32, 24, t - 7, t + 3.5, t + 9, lad, "up", 4.0)


# ---------------------------------------------------------------- entry points

def behind(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    if c.pet:
        return
    if c.facing == "down":
        # skis slung on the back: tips poke up past his right shoulder (screen left)
        ski_pair(d, c, s, (c.bcx + 6, c.waist + 4), (c.head_l + 1, c.top + 2))
    elif c.facing == "left":
        # on the back, tips standing up behind the head
        bx = c.hcx + 13
        ski_pair(d, c, s, (bx, c.waist + 10), (bx + 3, c.top - 6))


def front(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    if c.pet:
        nala_front(d, c, s)
        return
    if c.facing == "up":
        ski_pair(d, c, s, (c.bcx - 8, c.waist + 8), (c.head_r - 1, c.top + 2))
    scarf_person(d, c, s)
    person_head(d, c, s)
