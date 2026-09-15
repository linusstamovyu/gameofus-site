"""Albufeira beach: sun hats, a striped towel over one shoulder, sunglasses for the lads without any.

Nala the pug gets her sunglasses pushed up on her head and a little bandana round her neck.

behind(d, c, s) draws under the sprite; front(d, c, s) over it. Coordinates are
native cell pixels (see common.Cell) multiplied by s.
"""
from __future__ import annotations

from PIL import ImageDraw

from .common import HAS_GLASSES, INK, LAD_COLOR, Cell

WHITE = (250, 246, 236, 255)
LENS = (22, 24, 34, 255)
FRAME = (40, 36, 40, 255)
GLINT = (150, 205, 235, 230)

# Hat per lad: bucket hats and backwards caps, alternated so neighbours differ.
HAT = {"rico": "bucket", "kai": "cap", "elias": "bucket", "ethan": "cap"}

# Measured by eye off each sheet, where common's proportional eye line is off:
# (dy to the eye line, face centre offset from hcx in the front view, half eye spacing).
EYE_FIX = {"rico": (0.5, -1.0, 6.8), "kai": (-2.5, -2.5, 4.8)}


def shade(col, k: float):
    return tuple(int(v * k) for v in col[:3]) + (255,)


def lift(col, k: float):
    return tuple(int(v + (255 - v) * k) for v in col[:3]) + (255,)


def P(pts, s):
    return [(x * s, y * s) for x, y in pts]


def W(v, s):
    return max(1, int(v * s))


# ---------------------------------------------------------------- towel

def bez(pts, t):
    """Point and unit normal on a quadratic (3 points) or cubic (4 points) Bezier."""
    if len(pts) == 3:
        p0, p1, p2 = pts
        pts = [p0, (p0[0] + 2 / 3 * (p1[0] - p0[0]), p0[1] + 2 / 3 * (p1[1] - p0[1])),
               (p2[0] + 2 / 3 * (p1[0] - p2[0]), p2[1] + 2 / 3 * (p1[1] - p2[1])), p2]
    p0, p1, p2, p3 = pts
    u = 1 - t
    x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0]
    y = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]
    dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
    dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
    n = (dx * dx + dy * dy) ** 0.5 or 1.0
    return (x, y), (-dy / n, dx / n)


def drape(d, curve, col, s, w0=10.0, w1=12.5, w2=10.5, lanes=5, under=(0.0, 0.0), fringe=True):
    """A soft towel following a Bezier curve. Stripes run along the drape,
    width swells in the middle and tapers at the ends; `under` is the t-range drawn in shadow
    (the side of the towel turning away over the shoulder)."""
    N = 28
    pts = []
    for i in range(N + 1):
        tt = i / N
        (x, y), (nx, ny) = bez(curve, tt)
        w = (w0 + (w1 - w0) * (tt / 0.5)) if tt < 0.5 else (w1 + (w2 - w1) * ((tt - 0.5) / 0.5))
        pts.append((x, y, nx, ny, w, tt))
    dark = shade(col, 0.72)
    white_dim = shade(WHITE, 0.9)
    # Stripes run ACROSS the towel and bend with the drape, one band per `band_len` of length.
    seglen = [((pts[i + 1][0] - pts[i][0]) ** 2 + (pts[i + 1][1] - pts[i][1]) ** 2) ** 0.5 for i in range(N)]
    total = sum(seglen) or 1.0
    walked = 0.0
    for i in range(N):
        a, b = pts[i], pts[i + 1]
        mid = (walked + seglen[i] / 2) / total
        walked += seglen[i]
        q = [(a[0] - a[2] * a[4] * 0.5, a[1] - a[3] * a[4] * 0.5), (a[0] + a[2] * a[4] * 0.5, a[1] + a[3] * a[4] * 0.5),
             (b[0] + b[2] * b[4] * 0.5, b[1] + b[3] * b[4] * 0.5), (b[0] - b[2] * b[4] * 0.5, b[1] - b[3] * b[4] * 0.5)]
        k = int(mid * lanes)
        shadow = under[0] <= a[5] < under[1]
        if k % 2:
            fill = white_dim if shadow else WHITE
        else:
            fill = dark if shadow else col
        d.polygon(P(q, s), fill=fill)
    left = [(x + nx * w * -0.5, y + ny * w * -0.5) for x, y, nx, ny, w, _ in pts]
    right = [(x + nx * w * 0.5, y + ny * w * 0.5) for x, y, nx, ny, w, _ in pts]
    d.line(P(left, s), fill=INK, width=W(1.0, s), joint="curve")
    d.line(P(right, s), fill=INK, width=W(1.0, s), joint="curve")
    for end in (pts[0], pts[-1]):
        x, y, nx, ny, w, _ = end
        d.line(P([(x - nx * w * 0.5, y - ny * w * 0.5), (x + nx * w * 0.5, y + ny * w * 0.5)], s), fill=INK, width=W(1.0, s))
    if fringe:
        x, y, nx, ny, w, _ = pts[-1]
        (_, _), (tnx, tny) = bez(curve, 1.0)
        tx, ty = tny, -tnx   # tangent direction at the hem
        tx, ty = -tx, -ty
        for k in range(6):
            u = -0.42 + 0.84 * k / 5
            fx, fy = x + nx * w * u, y + ny * w * u
            d.line(P([(fx, fy), (fx + tx * 1.8, fy + ty * 1.8)], s), fill=WHITE, width=W(0.8, s))


def towel_front(d, c: Cell, s: float) -> None:
    col = LAD_COLOR[c.who]
    n = c.neck
    if c.facing == "down":
        # Over his left shoulder (the viewer's right): comes over the back of the shoulder,
        # follows the slope of it inwards, and falls to mid-chest.
        x = c.hcx
        drape(d, [(x + 19.5, n + 5), (x + 17, n - 2), (x + 8.5, n - 2.5), (x + 8, n + 16)], col, s, w0=10.5, w1=11.5, w2=12.0, lanes=7, under=(0.0, 0.3))
    elif c.facing == "up":
        # Same shoulder from behind is the viewer's left; falls to mid-back.
        x = c.hcx
        drape(d, [(x - 19.5, n + 5), (x - 17, n - 2), (x - 8.5, n - 2.5), (x - 8.5, n + 18)], col, s, w0=10.5, w1=11.5, w2=12.0, lanes=7, under=(0.0, 0.3))
    else:
        # Side on: folded over the near shoulder, a short drop in front and a short drop behind.
        sx = c.hcx - 1
        sway = {0: 0.0, 1: 1.0, 2: -0.8}[c.step]
        curve = [(sx - 10 - sway * 0.5, n + 11), (sx - 11, n - 4.5), (sx + 12, n - 4.5), (sx + 12 + sway, n + 12)]
        drape(d, curve, col, s, w0=8.5, w1=9.0, w2=8.5, lanes=9, under=(0.62, 1.01))
        # fringe on the front drop too
        (hx, hy), (nx, ny) = bez(curve, 0.0)
        for k in range(5):
            u = -0.4 + 0.8 * k / 4
            fx, fy = hx + nx * 10 * u, hy + ny * 10 * u
            d.line(P([(fx, fy), (fx, fy + 1.8)], s), fill=WHITE, width=W(0.8, s))


def towel_behind(d, c: Cell, s: float) -> None:
    return


# ---------------------------------------------------------------- hats

def bucket_hat(d, c: Cell, s: float) -> None:
    col = LAD_COLOR[c.who]
    dark, light = shade(col, 0.68), lift(col, 0.35)
    cx = c.hcx + (1.5 if c.facing == "left" else 0)
    half = c.headw * 0.5
    ctop = c.top + 3
    brim_y = c.top + c.h * 0.155
    cw = half * 0.70
    bw = half + 3.5
    lw = W(1.2, s)
    # floppy brim sloping down all round: a trapezoid with a rounded bottom
    d.ellipse(P([(cx - bw, brim_y + 0.5), (cx + bw, brim_y + 6.5)], s), fill=dark, outline=INK, width=lw)
    d.polygon(P([(cx - cw - 1, brim_y - 2.5), (cx + cw + 1, brim_y - 2.5), (cx + bw, brim_y + 3.5), (cx - bw, brim_y + 3.5)], s), fill=col)
    d.line(P([(cx - cw - 1, brim_y - 2.5), (cx - bw, brim_y + 3.5)], s), fill=INK, width=lw)
    d.line(P([(cx + cw + 1, brim_y - 2.5), (cx + bw, brim_y + 3.5)], s), fill=INK, width=lw)
    # stitch rings on the brim
    d.arc(P([(cx - bw + 2.5, brim_y - 1.5), (cx + bw - 2.5, brim_y + 4.5)], s), 20, 160, fill=dark, width=W(0.7, s))
    # rounded crown
    d.chord(P([(cx - cw, ctop), (cx + cw, ctop + (brim_y - ctop) * 1.7)], s), 180, 360, fill=col, outline=INK, width=lw)
    d.rectangle(P([(cx - cw, ctop + (brim_y - ctop) * 0.85 - 0.2), (cx + cw, brim_y - 1)], s), fill=col)
    d.line(P([(cx - cw, ctop + (brim_y - ctop) * 0.85), (cx - cw - 1, brim_y - 2.5)], s), fill=INK, width=lw)
    d.line(P([(cx + cw, ctop + (brim_y - ctop) * 0.85), (cx + cw + 1, brim_y - 2.5)], s), fill=INK, width=lw)
    # white band
    d.polygon(P([(cx - cw - 0.2, brim_y - 5), (cx + cw + 0.2, brim_y - 5), (cx + cw + 0.8, brim_y - 2.6), (cx - cw - 0.8, brim_y - 2.6)], s), fill=WHITE)
    # highlight
    hx = cx - cw * 0.5
    d.arc(P([(hx - 2, ctop + 2), (hx + 8, ctop + 16)], s), 190, 250, fill=light, width=W(1.4, s))


def cap_peak_behind(d, c: Cell, s: float) -> None:
    """From the front, the peak of a backwards cap sticks out behind the head; with the camera looking
    down, its edge shows above and beside the dome."""
    if c.pet or HAT.get(c.who) != "cap" or c.facing != "down":
        return
    col = LAD_COLOR[c.who]
    dark = shade(col, 0.62)
    cx, cw = c.hcx, c.headw * 0.47
    top = c.top + 3.5
    # an ellipse whose front half is hidden behind the dome: only the rim beyond it shows
    d.ellipse(P([(cx - cw * 0.9, top - 3.2), (cx + cw * 0.9, top + 10)], s), fill=dark, outline=INK, width=W(1.2, s))


def cap_back(d, c: Cell, s: float) -> None:
    """A backwards cap: a low dome on the hair, the peak pointing back (at the camera from behind)."""
    col = LAD_COLOR[c.who]
    dark, light = shade(col, 0.66), lift(col, 0.35)
    fix = EYE_FIX.get(c.who, (0, 0, 0))[0]
    band = c.eye + fix - 8.5
    cx = c.hcx + (1.0 if c.facing == "left" else 0)
    cw = c.headw * 0.47
    top = c.top + 3.5         # flatter than the head: the cap squashes the hair down
    lw = W(1.2, s)
    box = [(cx - cw, top), (cx + cw, band + (band - top))]
    def dome():
        d.chord(P(box, s), 180, 360, fill=col, outline=INK, width=lw)
        d.line(P([(cx - cw, band), (cx + cw, band)], s), fill=INK, width=lw)
    if c.facing == "up":
        dome()
        # the peak, pointing straight at the camera over the back of his head
        d.chord(P([(cx - cw * 0.98, band - 7), (cx + cw * 0.98, band + 9)], s), 0, 180, fill=col, outline=INK, width=lw)
        d.line(P([(cx - cw * 0.98, band + 1), (cx + cw * 0.98, band + 1)], s), fill=INK, width=lw)
        d.arc(P([(cx - cw * 0.7, band - 4), (cx + cw * 0.7, band + 6.5)], s), 20, 160, fill=dark, width=W(1.0, s))
        seam_end = band - 1
    elif c.facing == "left":
        # peak out behind him (to the right)
        d.polygon(P([(cx + cw * 0.55, band - 3.5), (cx + cw + 8.5, band - 1.5), (cx + cw + 8.5, band + 1.2), (cx + cw * 0.45, band + 0.5)], s),
                  fill=dark, outline=INK, width=W(1.1, s))
        dome()
        # strap opening at the front, over the forehead
        d.chord(P([(cx - cw + 1.5, band - 5.5), (cx - cw + 7.5, band + 5.5)], s), 180, 360, fill=shade(col, 0.3))
        d.line(P([(cx - cw + 1, band - 5.8), (cx - cw + 8, band - 5.8)], s), fill=dark, width=W(1.0, s))
        seam_end = band - 1
    else:
        dome()
        # the snapback: an arched opening in the back panel with the strap across it
        d.chord(P([(cx - 4.2, band - 6), (cx + 4.2, band + 6)], s), 180, 360, fill=shade(col, 0.28), outline=INK, width=W(0.8, s))
        d.line(P([(cx - 4.4, band - 3.2), (cx + 4.4, band - 3.2)], s), fill=dark, width=W(1.4, s))
        seam_end = band - 6.5
    d.line(P([(cx, top + 2), (cx, seam_end)], s), fill=dark, width=W(0.8, s))
    # button on top
    d.ellipse(P([(cx - 1.7, top - 1.4), (cx + 1.7, top + 2.0)], s), fill=dark, outline=INK, width=W(0.7, s))
    hx = cx - cw * 0.55
    d.arc(P([(hx - 2, top + 2), (hx + 8, band + 6)], s), 195, 245, fill=light, width=W(1.3, s))


# ---------------------------------------------------------------- sunglasses

def shades(d, c: Cell, s: float) -> None:
    dy, dx, half = EYE_FIX.get(c.who, (0, 0, 5.5))
    ey = c.eye + dy
    if c.facing == "down":
        cx = c.hcx + dx
        lw, lh = 3.9, 2.6
        for ex in (cx - half, cx + half):
            d.rounded_rectangle(P([(ex - lw, ey - lh), (ex + lw, ey + lh)], s), radius=1.6 * s, fill=LENS, outline=FRAME, width=W(0.9, s))
            d.line(P([(ex - lw + 1.4, ey - lh + 1.2), (ex - 0.6, ey - lh + 1.2)], s), fill=GLINT, width=W(0.9, s))
        d.line(P([(cx - half + lw, ey - 1), (cx + half - lw, ey - 1)], s), fill=FRAME, width=W(1.1, s))
        # arms out to the side of the face
        d.line(P([(cx - half - lw, ey - 1.2), (cx - half - lw - 2.2, ey - 1.8)], s), fill=FRAME, width=W(1.0, s))
        d.line(P([(cx + half + lw, ey - 1.2), (cx + half + lw + 2.2, ey - 1.8)], s), fill=FRAME, width=W(1.0, s))
    elif c.facing == "left":
        ex = {"rico": 19.5, "kai": 24.5}.get(c.who, c.head_l + 5) + (c.hcx - {"rico": 30, "kai": 34}.get(c.who, c.hcx))
        d.line(P([(ex + 2, ey - 1), (ex + 10, ey - 0.4)], s), fill=FRAME, width=W(1.2, s))
        d.rounded_rectangle(P([(ex - 3.2, ey - 2.6), (ex + 2.6, ey + 2.6)], s), radius=1.6 * s, fill=LENS, outline=FRAME, width=W(0.9, s))
        d.line(P([(ex - 2, ey - 1.4), (ex, ey - 1.4)], s), fill=GLINT, width=W(0.9, s))
    # from behind: nothing, the arms are hidden in the hair


# ---------------------------------------------------------------- Nala

def nala_front(d, c: Cell, s: float) -> None:
    col = LAD_COLOR[c.who]
    dark = shade(col, 0.66)
    # bandana round the neck
    if c.facing == "down":
        ny = 85.5 + (c.top - 51)
        cx = c.hcx
        d.polygon(P([(cx - 11, ny - 1.5), (cx + 11, ny - 1.5), (cx + 1.5, ny + 11), (cx - 1.5, ny + 11)], s), fill=col, outline=INK, width=W(1.1, s))
        d.line(P([(cx - 11, ny - 0.3), (cx + 11, ny - 0.3)], s), fill=dark, width=W(1.3, s))
        for px, py in ((cx - 4, ny + 2.5), (cx + 3.5, ny + 3), (cx, ny + 6.5)):
            d.ellipse(P([(px - 0.9, py - 0.9), (px + 0.9, py + 0.9)], s), fill=WHITE)
    elif c.facing == "up":
        ny = 69 + (c.top - 50)
        cx = c.hcx
        d.chord(P([(cx - 12, ny - 4), (cx + 12, ny + 3)], s), 0, 180, fill=col, outline=INK, width=W(1.1, s))
        # knot and two tails
        d.polygon(P([(cx - 1, ny + 2), (cx - 5, ny + 8), (cx - 2, ny + 8.5)], s), fill=col, outline=INK, width=W(0.9, s))
        d.polygon(P([(cx + 1, ny + 2), (cx + 5, ny + 8), (cx + 2, ny + 8.5)], s), fill=col, outline=INK, width=W(0.9, s))
        d.ellipse(P([(cx - 2, ny), (cx + 2, ny + 3.5)], s), fill=dark, outline=INK, width=W(0.8, s))
    else:
        ny = 86 + (c.top - 49)
        x0 = c.head_l + 9
        d.polygon(P([(x0, ny - 2), (x0 + 16, ny - 4), (x0 + 16, ny), (x0 + 1, ny + 2)], s), fill=col, outline=INK, width=W(1.0, s))
        d.polygon(P([(x0 - 0.5, ny), (x0 + 9, ny + 0.5), (x0 + 3, ny + 11)], s), fill=col, outline=INK, width=W(1.0, s))
        d.ellipse(P([(x0 + 3, ny + 2.2), (x0 + 4.6, ny + 3.8)], s), fill=WHITE)

    # sunglasses pushed up on her head
    if c.facing == "down":
        gy = c.top + 4.5
        cx = c.hcx
        for ex in (cx - 6.2, cx + 6.2):
            d.rounded_rectangle(P([(ex - 5, gy - 3.1), (ex + 5, gy + 3.1)], s), radius=2 * s, fill=LENS, outline=FRAME, width=W(0.9, s))
            d.line(P([(ex - 2.8, gy - 1.3), (ex - 0.6, gy - 1.3)], s), fill=GLINT, width=W(0.9, s))
        d.line(P([(cx - 1.2, gy - 1), (cx + 1.2, gy - 1)], s), fill=FRAME, width=W(1.1, s))
    elif c.facing == "up":
        gy = c.top + 3.5
        cx = c.hcx
        d.line(P([(cx - 10, gy), (cx + 10, gy)], s), fill=FRAME, width=W(1.6, s))
        for ex in (cx - 5.5, cx + 5.5):
            d.chord(P([(ex - 4.3, gy - 3), (ex + 4.3, gy + 1)], s), 180, 360, fill=LENS, outline=FRAME, width=W(0.8, s))
    else:
        gy = c.top + 7.5
        ex = c.head_l + 9
        d.line(P([(ex + 2, gy), (ex + 11, gy + 3)], s), fill=FRAME, width=W(1.2, s))
        d.rounded_rectangle(P([(ex - 4.2, gy - 3.1), (ex + 3.6, gy + 3.1)], s), radius=1.6 * s, fill=LENS, outline=FRAME, width=W(0.9, s))
        d.line(P([(ex - 2.2, gy - 1.3), (ex, gy - 1.3)], s), fill=GLINT, width=W(0.9, s))


# ---------------------------------------------------------------- entry points

def behind(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    if c.pet:
        return
    cap_peak_behind(d, c, s)


def front(d: ImageDraw.ImageDraw, c: Cell, s: float) -> None:
    if c.pet:
        nala_front(d, c, s)
        return
    towel_front(d, c, s)
    if c.who not in HAS_GLASSES:
        shades(d, c, s)
    if HAT[c.who] == "bucket":
        bucket_hat(d, c, s)
    else:
        cap_back(d, c, s)
