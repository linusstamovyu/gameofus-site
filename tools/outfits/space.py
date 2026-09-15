"""Mars base: glass bubble helmet, collar ring, chest panel, life-support pack.

behind(d, c, s) draws under the sprite; front(d, c, s) over it. Coordinates are
native cell pixels (see common.Cell) multiplied by s.

Things that are the way they are for a reason:
- The helmet is FITTED to each frame's own head pixels (the smallest circle holding
  hair, ears and chin), centred per frame so it rides the bob, with one radius per lad
  per facing so it never pulses as he walks. Down and up share a radius (same head).
- The chin is found as the narrowest row above the measured neck, and in side frames
  it is taken at the lad's highest chin across the three frames: a hood or collar can
  make one frame's narrowest row his shoulders, which inflates that helmet.
- The pack's front and back placement comes off the IDLE frame's torso (a step frame's
  chest row includes a swinging arm), but side-on it is read per frame from the
  shoulder row just under the chin, where the arm is still joined to the body.
- The lad's colour goes on the collar, the shoulder patches, and the pack's stripes, so
  the four read as four astronauts from every side.
- Nala's bubble is an ELLIPSE, wider than tall: a pug's head is, and a circle round her
  ears reaches down over her chest. From behind it fits only the back of her head, or
  it swallows her tail.
"""
from __future__ import annotations

from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw

from .common import ASSETS, COLS, FACING, INK, LAD_COLOR, Cell

SUIT = (226, 230, 236, 255)
SUIT_SHADE = (158, 166, 180, 255)
GLASS = (170, 215, 255, 52)
RED = (235, 60, 50, 255)
GREEN = (80, 220, 120, 255)


def w(x: float, s: float) -> int:
    return max(1, int(round(x * s)))


# ---------------------------------------------------------------- measuring

@lru_cache(maxsize=None)
def _alpha(who: str) -> np.ndarray:
    return np.array(Image.open(ASSETS / f"{who}_walk.webp").convert("RGBA"))[:, :, 3] > 40


def _cell(who: str, col: int) -> np.ndarray:
    a = _alpha(who)
    cw = a.shape[1] // COLS
    return a[:, col * cw:(col + 1) * cw]


def _top(who: str, col: int) -> int:
    return int(np.nonzero(_cell(who, col).any(1))[0].min())


def _bot(who: str, col: int) -> int:
    return int(np.nonzero(_cell(who, col).any(1))[0].max())


@lru_cache(maxsize=None)
def _raw_chin(who: str, col: int) -> int:
    m = _cell(who, col)
    top, bot = _top(who, col), _bot(who, col)
    neck = top + (bot - top) * 0.39
    return min(range(int(neck) - 12, int(neck) + 1), key=lambda y: m[y].sum())


@lru_cache(maxsize=None)
def _chin(who: str, col: int) -> int:
    if FACING[col] != "left":
        return _raw_chin(who, col)
    rel = min(_raw_chin(who, k) - _top(who, k) for k in range(6, 9))
    return _top(who, col) + rel


def _corners(xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
    return np.concatenate([np.stack([xs, ys], 1), np.stack([xs + 1, ys + 1], 1),
                           np.stack([xs + 1, ys], 1), np.stack([xs, ys + 1], 1)]).astype(float)


def _min_ellipse(pts: np.ndarray, aspect: float = 1.0) -> tuple[float, float, float, float]:
    """Smallest ellipse of the given rx/ry holding every point: (cx, cy, rx, ry)."""
    xs, ys = pts[:, 0] / aspect, pts[:, 1]
    best = (0.0, 0.0, 1e9)
    for cx in np.arange(xs.min(), xs.max() + 0.01, 0.5):
        dx2 = (xs - cx) ** 2
        for cy in np.arange(ys.min(), ys.max() + 0.01, 0.5):
            r = float(np.sqrt((dx2 + (ys - cy) ** 2).max()))
            if r < best[2]:
                best = (float(cx), float(cy), r)
    return best[0] * aspect, best[1], best[2] * aspect, best[2]


@lru_cache(maxsize=None)
def _lad_helmets(who: str) -> dict[int, tuple[float, float, float]]:
    """col -> (cx, cy, r)."""
    fits = {}
    for col in range(COLS):
        ys, xs = np.nonzero(_cell(who, col))
        sel = ys <= _chin(who, col)
        cx, cy, r, _ = _min_ellipse(_corners(xs[sel], ys[sel]))
        fits[col] = (cx, cy, r)
    pad = 2.2
    r_du = max(fits[k][2] for k in range(6)) + pad
    r_side = max(fits[k][2] for k in range(6, 9)) + pad
    out = {}
    for col, (cx, cy, _) in fits.items():
        r = r_du if col < 6 else r_side
        cx = min(max(cx, r + 0.8), 64 - r - 0.8)   # never clipped by the cell
        out[col] = (cx, cy, r)
    return out


@lru_cache(maxsize=None)
def _torso(who: str, col: int) -> tuple[float, float]:
    """Torso extents at chest height, relative to the helmet centre, from the idle frame of that facing."""
    idle = col - col % 3
    m = _cell(who, idle)
    top, bot = _top(who, idle), _bot(who, idle)
    row = np.nonzero(m[int(top + (bot - top) * 0.5)])[0]
    hx = _lad_helmets(who)[idle][0]
    return float(row.min() - hx), float(row.max() - hx)


@lru_cache(maxsize=None)
def _shoulders(who: str, col: int) -> tuple[float, float]:
    """Left/right edge of the shoulders a few rows under the chin (arm still joined to body)."""
    m = _cell(who, col)
    ch = _chin(who, col)
    row = np.nonzero(m[ch + 5])[0]
    # The back edge is the furthest point over the upper back (a hood can stand proud of it).
    back = max(np.nonzero(m[y])[0].max() for y in range(ch + 3, ch + 11))
    return float(row.min()), float(back if FACING[col] == "left" else row.max())


@lru_cache(maxsize=None)
def _neck_x(who: str, col: int) -> float:
    row = np.nonzero(_cell(who, col)[_chin(who, col)])[0]
    return float(row.min() + row.max() + 1) / 2


# ---------------------------------------------------------------- drawing bits

def _box(d, box, s, radius, fill, lw=1.2):
    d.rounded_rectangle([v * s for v in box], radius=radius * s, fill=fill, outline=INK, width=w(lw, s))


def _bubble(d, cx, cy, rx, ry, facing, s, lw=2.4) -> None:
    """Clear glass dome: faint tint, dark rim, pale inner ring, highlight arc, glint, antenna."""
    d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=GLASS)
    d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], outline=INK, width=w(lw, s))
    i = lw * 0.66
    d.ellipse([(cx - rx + i) * s, (cy - ry + i) * s, (cx + rx - i) * s, (cy + ry - i) * s],
              outline=(205, 214, 226, 255), width=w(lw * 0.45, s))
    h = lw * 1.6
    start = 200 if facing != "left" else 215
    d.arc([(cx - rx + h) * s, (cy - ry + h) * s, (cx + rx - h) * s, (cy + ry - h) * s], start, start + 55,
          fill=(255, 255, 255, 190), width=w(lw * 0.66, s))
    gx, gy, g = cx + rx * 0.42, cy - ry * 0.5, lw * 0.5
    d.ellipse([(gx - g) * s, (gy - g) * s, (gx + g) * s, (gy + g) * s], fill=(255, 255, 255, 220))
    k = lw / 2.4   # antenna scales with the rim, so Nala's is a little one
    ax = cx + rx * (0.55 if facing != "left" else 0.35)
    ay = cy - ry * 0.83
    d.line([ax * s, ay * s, (ax + 2 * k) * s, (ay - 6 * k) * s], fill=INK, width=w(1.2 * k, s))
    tx, ty, tr = ax + 2 * k, ay - 6.6 * k, 1.5 * max(k, 0.8)
    d.ellipse([(tx - tr) * s, (ty - tr) * s, (tx + tr) * s, (ty + tr) * s], fill=RED, outline=INK, width=w(0.6, s))


def _collar(d, cx, ny, half, s, col, thick=3.6) -> None:
    d.ellipse([(cx - half) * s, (ny - thick) * s, (cx + half) * s, (ny + thick) * s], fill=col, outline=INK, width=w(1.2, s))
    d.ellipse([(cx - half + 3) * s, (ny - thick + 1.1) * s, (cx + half - 3) * s, (ny + 0.2) * s], fill=SUIT)


def _patch(d, x, y, s, col) -> None:
    """Mission patch: white-rimmed disc in his colour, outlined, so it reads even on a shirt his own colour."""
    d.ellipse([(x - 3.4) * s, (y - 3.4) * s, (x + 3.4) * s, (y + 3.4) * s], fill=SUIT, outline=INK, width=w(1.0, s))
    d.ellipse([(x - 2.0) * s, (y - 2.0) * s, (x + 2.0) * s, (y + 2.0) * s], fill=col)


# ---------------------------------------------------------------- people

def behind(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    """Life-support pack: peeks past the shoulders from the front, sticks out behind from the side."""
    if c.pet:
        return _pet_behind(d, c, s)
    col = LAD_COLOR[c.who]
    cx = _lad_helmets(c.who)[c.col][0]
    y0, y1 = c.neck + 1, c.waist - 1
    if c.facing == "down":
        tl, tr = _torso(c.who, c.col)
        box = (cx + tl - 3, y0, cx + tr + 3, y1)
        _box(d, box, s, 3, SUIT_SHADE)
        for x in (box[0] + 1, box[2] - 3):
            d.rectangle([x * s, (y0 + 4) * s, (x + 2) * s, (y0 + 9) * s], fill=col)
    elif c.facing == "left":
        back = _shoulders(c.who, c.col)[1]
        box = (back - 8, y0, back + 6, y1)
        _box(d, box, s, 3, SUIT_SHADE)
        _box(d, (back + 1, y0 + 3, back + 4.5, y1 - 3), s, 1.2, col, lw=0.7)


def front(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    if c.pet:
        return _pet_front(d, c, s)
    col = LAD_COLOR[c.who]
    cx, cy, r = _lad_helmets(c.who)[c.col]
    facing = c.facing
    chin = _chin(c.who, c.col)
    sl, sr = _shoulders(c.who, c.col)

    if facing == "up":
        # Pack on his back: two air tanks either side of a stripe in his colour.
        tl, tr = _torso(c.who, c.col)
        x0, x1 = cx + tl - 1, cx + tr + 1
        y0, y1 = c.neck + 1, c.waist + 2
        _box(d, (x0, y0, x1, y1), s, 4, SUIT)
        tw = (x1 - x0) * 0.32
        for tx in (x0 + (x1 - x0) * 0.12, x1 - (x1 - x0) * 0.12 - tw):
            _box(d, (tx, y0 + 3, tx + tw, y1 - 3), s, tw * 0.5, SUIT_SHADE, lw=0.8)
        mid = (x0 + x1) / 2
        _box(d, (mid - 2, y0 + 4, mid + 2, y1 - 4), s, 1, col, lw=0.6)

    # Collar ring the helmet locks onto, in his colour.
    ny = max(chin + 3.5, cy + r - 1.5)
    nx = _neck_x(c.who, c.col) if facing != "left" else (sl + sr) / 2
    _collar(d, nx, ny, min(r * 0.8, 17) if facing != "left" else min(r * 0.62, 12), s, col)

    if facing == "down":
        # Mission patches high on both arms, clear of the collar.
        py = ny + 7
        row = np.nonzero(_cell(c.who, c.col)[int(py)])[0]
        _patch(d, row.min() + 4, py, s, col)
        _patch(d, row.max() - 3, py, s, col)
        # Chest control panel with two status lights.
        px, pyy = _neck_x(c.who, c.col), max(c.neck + 7, ny + 5)
        _box(d, (px - 6, pyy, px + 6, pyy + 7), s, 1.5, SUIT, lw=1.0)
        d.ellipse([(px - 4) * s, (pyy + 2) * s, (px - 1) * s, (pyy + 5) * s], fill=RED)
        d.ellipse([(px + 1) * s, (pyy + 2) * s, (px + 4) * s, (pyy + 5) * s], fill=GREEN)
    elif facing == "left":
        # One patch on the near shoulder.
        _patch(d, (sl + sr) / 2 + 1, ny + 7, s, col)

    _bubble(d, cx, cy, r, r, facing, s)


# ---------------------------------------------------------------- Nala

@lru_cache(maxsize=None)
def _pet_helmets() -> dict[int, tuple[float, float, float, float]]:
    """col -> (cx, cy, rx, ry). Front: whole face to the tongue. Behind: back of the head only.
    Side: the front 40 px of her, snout to ears."""
    out = {}
    for col in range(COLS):
        m = _cell("nala", col)
        ys, xs = np.nonzero(m)
        top, bot = ys.min(), ys.max()
        h = bot - top
        # Ear tips are left under the rim line (pressed against the glass): enclosing
        # them too makes the dome a hat brim wider than her whole body.
        if FACING[col] == "down":
            sel, aspect = (ys >= top + 3) & (ys <= top + int(h * 0.48)), 1.1
        elif FACING[col] == "up":
            sel, aspect = (ys >= top + 3) & (ys <= top + int(h * 0.27)), 1.35
        else:
            sel = ys <= top + int(h * 0.48)
            sel &= xs <= xs[sel].min() + 38
            aspect = 1.05
        cx, cy, rx, ry = _min_ellipse(_corners(xs[sel], ys[sel]), aspect)
        pad = 1.4 if FACING[col] == "left" else 0.6
        out[col] = (cx, cy, rx + pad, ry + pad)
    # One size per facing, never clipped by the cell.
    for f in ("down", "up", "left"):
        cols = [k for k in range(COLS) if FACING[k] == f]
        rx = max(out[k][2] for k in cols)
        ry = max(out[k][3] for k in cols)
        for k in cols:
            cx = min(max(out[k][0], rx + 0.8), 64 - rx - 0.8)
            out[k] = (cx, out[k][1], rx, ry)
    # From behind, the dome is nearly the front's size: same bottom edge as the fit (so the
    # tail stays clear), grown UPWARD into a bubble rather than a flat saucer.
    rx_f, ry_f = out[0][2], out[0][3]
    for k in range(3, 6):
        cx, cy, rx, ry = out[k]
        bottom = cy + ry + 1.5
        ry2 = max(ry, ry_f * 0.82)
        out[k] = (cx, bottom - ry2, max(rx, rx_f - 2), ry2)
    return out


def _tank(d, x0, y0, x1, y1, s, col) -> None:
    """Tiny upright air tank: a capsule with a valve on top and a band in her colour."""
    xm = (x0 + x1) / 2
    d.rectangle([(xm - 1.1) * s, (y0 - 1.8) * s, (xm + 1.1) * s, (y0 + 0.6) * s], fill=SUIT_SHADE, outline=INK, width=w(0.6, s))
    _box(d, (x0, y0, x1, y1), s, (x1 - x0) * 0.5, SUIT, lw=1.0)
    m = y0 + (y1 - y0) * 0.55
    d.rectangle([(x0 + 0.9) * s, (m - 1.1) * s, (x1 - 0.9) * s, (m + 1.1) * s], fill=col)


def _pet_behind(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    if c.facing != "left":
        return
    # Side-on the tank stands on her back behind the body, poking up past her shoulders;
    # her curly tail is drawn over its foot.
    cx, cy, rx, ry = _pet_helmets()[c.col]
    x0 = cx + rx - 1.5
    _tank(d, x0, cy - 4, x0 + 7.5, cy + ry + 2, s, LAD_COLOR["nala"])


def _pet_front(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    col = LAD_COLOR["nala"]
    cx, cy, rx, ry = _pet_helmets()[c.col]
    if c.facing == "up":
        # Twin mini tanks on her back, either side of the tail.
        by = cy + ry
        _collar(d, cx, by - 0.5, rx * 0.5, s, col, thick=2.4)
        for x in (cx - 16, cx + 9):
            _tank(d, x, by + 1, x + 7, by + 12, s, col)
        _bubble(d, cx, cy, rx, ry, c.facing, s, lw=1.9)
        return
    # Seal ring where the bubble meets her collar.
    if c.facing == "left":
        _collar(d, cx + rx * 0.35, cy + ry - 1, rx * 0.5, s, col, thick=2.6)
    else:
        _collar(d, cx, cy + ry - 0.5, rx * 0.62, s, col, thick=2.6)
    _bubble(d, cx, cy, rx, ry, c.facing, s, lw=1.9)
