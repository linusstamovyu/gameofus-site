"""Neon City: glowing visor band, light-up headphones, a neon strip on the jacket.

Nala gets a light-up collar with a glowing tag and a tiny visor.
behind(d, c, s) draws under the sprite; front(d, c, s) over it. Coordinates are
native cell pixels (see common.Cell) multiplied by s. Glow is faked with a soft
semi-transparent halo drawn under each bright line.
"""
from __future__ import annotations

from PIL import ImageDraw

from .common import INK, LAD_COLOR, Cell

CYAN = (40, 240, 255)
MAGENTA = (255, 60, 200)
SHELL = (38, 40, 56, 255)       # headphone plastic
SHELL_HI = (78, 82, 104, 255)


def _mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _lift(col, t=0.55):
    """Toward white: the hot core of a neon tube."""
    return _mix(col[:3], (255, 255, 255), t)


def _glow_line(d, pts, col, s, core=1.0, halo=3.2):
    """A neon tube: wide faint halo, mid glow, bright core, all in native px widths."""
    p = [v * s for v in pts]
    d.line(p, fill=col[:3] + (60,), width=int(halo * s), joint="curve")
    d.line(p, fill=col[:3] + (150,), width=int(core * 1.9 * s), joint="curve")
    d.line(p, fill=_lift(col) + (255,), width=max(1, int(core * s)), joint="curve")


def _visor(d, c: Cell, s, x0, x1, y, h, left_to_right=True):
    """Glass band across the eyes: cyan fading to magenta, see-through so the eyes stay readable."""
    y0, y1 = y - h / 2, y + h / 2
    # soft halo round the band
    d.rounded_rectangle([(x0 - 1.2) * s, (y0 - 1.2) * s, (x1 + 1.2) * s, (y1 + 1.2) * s],
                        radius=(h / 2 + 1.2) * s, fill=(180, 120, 255, 46))
    steps = max(1, int((x1 - x0) * 2))
    for i in range(steps):
        t = i / max(1, steps - 1)
        if not left_to_right:
            t = 1 - t
        col = _mix(CYAN, MAGENTA, t)
        xa = x0 + (x1 - x0) * i / steps
        xb = x0 + (x1 - x0) * (i + 1) / steps
        d.rectangle([xa * s, y0 * s, xb * s + 1, y1 * s], fill=_lift(col, 0.25) + (64,))
        # bright rims top and bottom, so the band reads without hiding the eyes
        d.rectangle([xa * s, y0 * s, xb * s + 1, (y0 + 0.75) * s], fill=_lift(col, 0.35) + (255,))
        d.rectangle([xa * s, (y1 - 0.6) * s, xb * s + 1, y1 * s], fill=col + (200,))
    for ex in (x0, x1):
        d.rectangle([(ex - 0.6) * s, (y0 - 0.3) * s, (ex + 0.6) * s, (y1 + 0.3) * s], fill=INK)


RING_BOOST = {"rico": (255, 118, 26, 255)}   # plain orange goes brown against dark hair


def _cup(d, cx, cy, rw, rh, col, s):
    """Ear cup with a glowing ring in the lad's colour."""
    d.ellipse([(cx - rw - 2.0) * s, (cy - rh - 2.0) * s, (cx + rw + 2.0) * s, (cy + rh + 2.0) * s], fill=col[:3] + (140,))
    d.ellipse([(cx - rw) * s, (cy - rh) * s, (cx + rw) * s, (cy + rh) * s], fill=SHELL, outline=INK, width=int(1.1 * s))
    d.ellipse([(cx - rw + 1.1) * s, (cy - rh + 1.1) * s, (cx + rw - 1.1) * s, (cy + rh - 1.1) * s],
              outline=_lift(col, 0.3) + (255,), width=int(2.0 * s))
    d.ellipse([(cx - 0.8) * s, (cy - 0.8) * s, (cx + 0.8) * s, (cy + 0.8) * s], fill=SHELL_HI)


def _band(d, x0, x1, top, ear_y, s, col):
    """Headband arcing over the hair from ear to ear."""
    box = [x0 * s, top * s, x1 * s, (2 * ear_y - top) * s]
    d.arc(box, 180, 360, fill=col[:3] + (70,), width=int(4.2 * s))
    d.arc(box, 180, 360, fill=INK, width=int(2.6 * s))
    d.arc(box, 186, 354, fill=_lift(col, 0.2) + (255,), width=int(1.2 * s))


def _side_band(d, c: Cell, ex, top, ear_y, s, col):
    """Side view: the band rises from the cup, crests over the crown and tucks into the hair in front."""
    crown = c.head_l + c.headw * 0.36
    rx = ex - crown
    box = [(crown - rx) * s, top * s, ex * s, (2 * ear_y - top) * s]
    d.arc(box, 212, 360, fill=col[:3] + (70,), width=int(4.2 * s))
    d.arc(box, 212, 360, fill=INK, width=int(2.6 * s))
    d.arc(box, 218, 354, fill=_lift(col, 0.2) + (255,), width=int(1.2 * s))


def behind(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    if c.pet:
        return
    if c.facing == "left":
        # far headband half and far ear cup are hidden by the head; nothing to draw behind
        return


def _person(d, c: Cell, s: float) -> None:
    col = RING_BOOST.get(c.who, LAD_COLOR[c.who])
    ear_y = c.eye + 3.5
    top = c.top + 3.5

    if c.facing == "down":
        # neon strip down the jacket front
        y0, y1 = c.neck + 4, c.waist - 3
        _glow_line(d, [c.bcx, y0, c.bcx, y1], CYAN, s, core=1.5, halo=4.2)
        d.ellipse([(c.bcx - 1.3) * s, (y1 - 0.2) * s, (c.bcx + 1.3) * s, (y1 + 2.4) * s], fill=_lift(MAGENTA, 0.4) + (255,),
                  outline=INK, width=int(0.6 * s))
        _band(d, c.head_l - 0.5, c.head_r + 0.5, top, ear_y, s, col)
        _visor(d, c, s, c.head_l + 4, c.head_r - 4, c.eye + 0.2, 3.6)
        _cup(d, c.head_l + 0.5, ear_y, 3.0, 4.4, col, s)
        _cup(d, c.head_r - 0.5, ear_y, 3.0, 4.4, col, s)
    elif c.facing == "up":
        # a V on the back of the jacket: shoulder blades down to the spine, inside the torso
        tw = (c.body_r - c.body_l) * 0.26
        ya, yb = c.neck + 5, c.neck + 13
        _glow_line(d, [c.bcx - tw, ya, c.bcx, yb, c.bcx + tw, ya], CYAN, s, core=1.5, halo=4.2)
        d.ellipse([(c.bcx - 1.3) * s, (yb - 0.6) * s, (c.bcx + 1.3) * s, (yb + 2.0) * s],
                  fill=_lift(MAGENTA, 0.4) + (255,), outline=INK, width=int(0.6 * s))
        _band(d, c.head_l - 0.5, c.head_r + 0.5, top, ear_y, s, col)
        # the visor strap wraps round the back of the head, thin
        _glow_line(d, [c.head_l + 2, c.eye + 0.5, c.head_r - 2, c.eye + 0.5], MAGENTA, s, core=0.8, halo=2.2)
        _cup(d, c.head_l + 0.5, ear_y, 3.0, 4.4, col, s)
        _cup(d, c.head_r - 0.5, ear_y, 3.0, 4.4, col, s)
    else:  # left: face on the left, ear just behind the middle of the head
        ex = c.hcx + c.headw * 0.12
        # strip along the side seam
        y0, y1 = c.neck + 4, c.waist - 3
        sx = c.bcx + 1
        _glow_line(d, [sx, y0, sx, y1], CYAN, s, core=1.5, halo=4.2)
        # headband: an arc over the crown down to the cup
        _side_band(d, c, ex, top, ear_y, s, col)
        _visor(d, c, s, c.head_l + 0.8, ex - 2.4, c.eye + 0.2, 3.6)
        _cup(d, ex, ear_y, 3.0, 4.4, col, s)


def _tag(d, tx, ty, col, s):
    d.ellipse([(tx - 3.4) * s, (ty - 3.4) * s, (tx + 3.4) * s, (ty + 3.4) * s], fill=col[:3] + (95,))
    d.ellipse([(tx - 2.1) * s, (ty - 2.1) * s, (tx + 2.1) * s, (ty + 2.1) * s], fill=_lift(col, 0.35) + (255,),
              outline=INK, width=int(0.8 * s))


def _pet(d, c: Cell, s: float) -> None:
    col = LAD_COLOR[c.who]
    if c.facing == "left":
        # collar: a short band round the neck, just behind the head
        nx = c.head_r + 1.0
        y0, y1 = c.eye + 4, c.eye + 16
        box = [(nx - 4.5) * s, y0 * s, (nx + 4.5) * s, y1 * s]
        d.arc(box, 250, 110, fill=MAGENTA + (70,), width=int(5 * s))
        d.arc(box, 250, 110, fill=INK, width=int(3 * s))
        d.arc(box, 256, 104, fill=_lift(MAGENTA, 0.35) + (255,), width=int(1.3 * s))
        _tag(d, nx + 1.2, y1 + 1.8, col, s)
        # tiny visor pushed up on the forehead, clear of the big eye
        _visor(d, c, s, c.head_l + 7, c.head_l + c.headw * 0.7, c.eye - 12, 2.4)
        return
    cx = c.hcx
    ny = c.neck - 3 if c.facing == "down" else c.eye + 5
    w = (c.body_r - c.body_l) * 0.44
    box = [(cx - w) * s, (ny - 4) * s, (cx + w) * s, (ny + 4) * s]
    d.arc(box, 0, 180, fill=MAGENTA + (70,), width=int(5 * s))
    d.arc(box, 0, 180, fill=INK, width=int(3 * s))
    d.arc(box, 8, 172, fill=_lift(MAGENTA, 0.35) + (255,), width=int(1.3 * s))
    if c.facing == "down":
        _tag(d, cx, ny + 4 + 2.0, col, s)
        _visor(d, c, s, c.hcx - 7, c.hcx + 7, c.eye - 12, 2.4)
    else:
        _glow_line(d, [c.hcx - 6, c.eye - 12, c.hcx + 6, c.eye - 12], MAGENTA, s, core=0.8, halo=2.2)


def front(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    (_pet if c.pet else _person)(d, c, s)
