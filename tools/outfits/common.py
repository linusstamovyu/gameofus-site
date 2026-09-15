"""Shared measuring and compositing for the world outfits. World files never edit this."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SITE = Path(__file__).resolve().parents[2]
ASSETS = SITE / "public" / "assets"
# Dressed sheets live outside public/assets: tools/build_site_assets.py empties that folder
# on every run, and these load only when a world is picked (not part of the first load).
DRESSED = SITE / "public" / "worlds"

COLS = 9
FACING = ["down"] * 3 + ["up"] * 3 + ["left"] * 3   # right is the left frames mirrored by the site
STEP = [0, 1, 2] * 3                                # 0 idle, 1 step A, 2 step B (for swinging capes/scarves)
OUT_SCALE = 2   # dressed sheets are twice the original resolution (1152x256)
SS = 8          # accessories are drawn at 8x, then downsampled

LADS = ["rico", "kai", "elias", "ethan", "nala"]
PETS = {"nala"}
HAS_GLASSES = {"elias", "ethan"}   # already wear sunglasses in their art
# One signature colour per lad, so the squad reads as five people, not clones.
LAD_COLOR = {
    "rico": (231, 111, 58, 255),   # orange
    "kai": (230, 176, 40, 255),    # yellow (speed type)
    "elias": (64, 140, 222, 255),  # blue
    "ethan": (218, 78, 150, 255),  # pink (charm type)
    "nala": (120, 196, 110, 255),  # green
}
INK = (28, 31, 38, 255)


@dataclass
class Cell:
    """Where things are in one 64x128 walk cell, in native pixels. Draw with `x * s`."""
    who: str
    col: int
    facing: str        # "down" | "up" | "left"
    step: int          # 0, 1, 2
    pet: bool
    top: int           # highest opaque row (top of hair / ears)
    bot: int           # lowest opaque row (soles / paws)
    h: int
    neck: float        # chin line (people) / where head meets body (pet)
    waist: float
    feet: float
    eye: float         # eye line
    hcx: float         # head centre x
    head_l: float      # head extents at the widest part of the head
    head_r: float
    body_l: float      # body extents at chest height
    body_r: float

    @property
    def headw(self) -> float:
        return self.head_r - self.head_l

    @property
    def bcx(self) -> float:
        return (self.body_l + self.body_r) / 2


def measure(who: str, col: int, alpha: np.ndarray) -> Cell:
    solid = alpha > 40
    ys, _ = np.nonzero(solid)
    top, bot = int(ys.min()), int(ys.max())
    h = bot - top
    pet = who in PETS
    neck = top + h * (0.58 if pet else 0.39)
    facing = FACING[col]
    rows = solid[top:int(neck)]
    hy, hx = np.nonzero(rows)
    if pet and facing == "left":
        # Side-on pug: the head is the front (left) part of the upper body.
        span = np.nonzero(solid[int(top + h * 0.3)])[0]
        head_l, head_r = float(span.min()), float(span.min() + (span.max() - span.min()) * 0.6)
        hcx = (head_l + head_r) / 2
    else:
        widest = max(range(top, int(neck)), key=lambda y: solid[y].sum())
        span = np.nonzero(solid[widest])[0]
        head_l, head_r = float(span.min()), float(span.max())
        hcx = float(hx.mean())
    chest = np.nonzero(solid[int(top + h * (0.75 if pet else 0.5))])[0]
    return Cell(
        who=who, col=col, facing=facing, step=STEP[col], pet=pet, top=top, bot=bot, h=h,
        neck=neck, waist=top + h * 0.61, feet=bot - h * 0.08,
        eye=top + h * (0.33 if pet else 0.26), hcx=hcx, head_l=head_l, head_r=head_r,
        body_l=float(chest.min()), body_r=float(chest.max()),
    )


def dress(who: str, world: str, behind, front) -> Path:
    """behind/front(d: ImageDraw, c: Cell, s: float) draw one cell's accessories at scale s."""
    src = Image.open(ASSETS / f"{who}_walk.webp").convert("RGBA")
    W, H = src.size
    cw = W // COLS
    alpha = np.array(src)[:, :, 3]
    sheet = Image.new("RGBA", (W * OUT_SCALE, H * OUT_SCALE), (0, 0, 0, 0))
    for col in range(COLS):
        c = measure(who, col, alpha[:, col * cw:(col + 1) * cw])
        sprite = src.crop((col * cw, 0, (col + 1) * cw, H)).resize((cw * OUT_SCALE, H * OUT_SCALE), Image.NEAREST)
        layers = []
        for fn in (behind, front):
            big = Image.new("RGBA", (cw * SS, H * SS), (0, 0, 0, 0))
            fn(ImageDraw.Draw(big), c, SS)
            layers.append(big.resize((cw * OUT_SCALE, H * OUT_SCALE), Image.LANCZOS))
        sheet.paste(Image.alpha_composite(Image.alpha_composite(layers[0], sprite), layers[1]), (col * cw * OUT_SCALE, 0))
    DRESSED.mkdir(exist_ok=True)
    dest = DRESSED / f"{who}_walk_{world}.webp"
    sheet.save(dest, "WEBP", quality=90, method=6, alpha_quality=100)
    return dest


def contact(world: str, out: Path, bg=(92, 84, 96, 255)) -> Path:
    """All five dressed sheets stacked at 2x zoom on a flat background, for checking by eye."""
    def sheet(who: str) -> Image.Image:
        dressed = DRESSED / f"{who}_walk_{world}.webp"
        if dressed.exists():
            return Image.open(dressed).convert("RGBA")
        plain = Image.open(ASSETS / f"{who}_walk.webp").convert("RGBA")   # not dressed yet
        return plain.resize((plain.width * OUT_SCALE, plain.height * OUT_SCALE), Image.NEAREST)
    sheets = [sheet(who) for who in LADS]
    z = 2
    w, h = sheets[0].width * z // 2, sheets[0].height * z // 2
    img = Image.new("RGBA", (w, h * len(sheets)), bg)
    for i, sh in enumerate(sheets):
        img.alpha_composite(sh.resize((w, h), Image.LANCZOS), (0, i * h))
    img.save(out)
    return out
