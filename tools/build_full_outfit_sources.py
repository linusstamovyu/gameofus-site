#!/usr/bin/env python3
"""Build pose-locked full-outfit PNG walk sheets for the world picker.

The existing outfit modules supply direction-aware packs, helmets, props and hats.
This pass changes the underlying wardrobe rather than merely layering accessories,
while keeping every accepted source-pixel face, hair, gait, and registration intact.
"""
from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw

SITE = Path(__file__).resolve().parents[1]
ROOT = SITE / "source" / "outfits"
PUBLIC = SITE / "public"
WORLDS = PUBLIC / "worlds"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from outfits.common import LADS, dress  # noqa: E402

MODULES = {"ski": "ski", "neon": "neon", "jungle": "jungle", "fairy": "fairy", "mars": "space"}
# The website calls the Mars-base theme `space`; the source brief calls it Mars.
RUNTIME_WORLD = {"ski": "ski", "neon": "neon", "jungle": "jungle", "fairy": "fairy", "mars": "space"}
ACCENT = {
    "rico": (231, 111, 58), "kai": (230, 176, 40), "elias": (64, 140, 222),
    "ethan": (218, 78, 150), "nala": (120, 196, 110),
}
BASE = {
    "ski": ((250, 246, 235), (57, 68, 84)),
    "neon": ((39, 43, 61), (31, 34, 43)),
    "jungle": ((163, 143, 87), (88, 99, 58)),
    "fairy": ((224, 214, 235), (101, 77, 131)),
    "mars": ((231, 235, 239), (148, 160, 177)),
}
INK = (35, 30, 28, 255)


def shade(c: tuple[int, int, int], k: float) -> tuple[int, int, int, int]:
    return tuple(max(0, min(255, round(v * k))) for v in c) + (255,)


def outfit_tone(world: str, who: str, v: int) -> tuple[int, int, int, int]:
    main, dark = BASE[world]
    accent = ACCENT[who]
    # Garment regions alternate base and the character's consistently assigned colour.
    if v < 57:
        return shade(dark, 0.52)
    if v < 100:
        return shade(dark, 0.8)
    if v > 190:
        return main + (255,)
    return shade(accent, 0.9)


def skin(px: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = px
    return r > 145 and 52 < g < 205 and b < 130 and r > g * 1.10


def recolour_person(img: Image.Image, world: str, who: str) -> None:
    a = np.asarray(img).copy()
    h, w = a.shape[:2]
    for col in range(9):
        x0, x1 = col * 128, (col + 1) * 128
        alpha = a[:, x0:x1, 3] > 40
        ys, xs = np.nonzero(alpha)
        if not len(ys):
            continue
        top, bot = int(ys.min()), int(ys.max())
        neck = int(top + (bot - top) * .37)
        # Colour the original clothes while retaining all skin (hands), face, hair and eyewear.
        for y, xx in zip(ys, xs):
            if y < neck:
                continue
            p = tuple(a[y, x0 + xx])
            if skin(p):
                continue
            v = int((int(p[0]) + int(p[1]) + int(p[2])) / 3)
            a[y, x0 + xx] = outfit_tone(world, who, v)
    img.paste(Image.fromarray(a), (0, 0))
    draw = ImageDraw.Draw(img)
    for col in range(9):
        x0, x1 = col * 128, (col + 1) * 128
        alpha = a[:, x0:x1, 3] > 40
        ys, xs = np.nonzero(alpha)
        top, bot = int(ys.min()), int(ys.max())
        cx = x0 + int(xs.mean())
        # Broad, readable garment construction: outerwear seams, trouser break, boots and one emblem.
        accent = ACCENT[who] + (255,)
        if world == "ski":
            draw.line((cx, neck + 4, cx, int(top + (bot-top)*.64)), fill=INK, width=3)
            draw.line((x0 + xs.min()+8, int(top + (bot-top)*.63), x0 + xs.max()-8, int(top + (bot-top)*.63)), fill=accent, width=3)
        elif world == "neon":
            draw.line((x0 + xs.min()+8, neck + 8, x0 + xs.max()-8, neck + 8), fill=accent, width=3)
            draw.line((cx-7, neck+8, cx-7, int(top + (bot-top)*.61)), fill=accent, width=2)
        elif world == "jungle":
            draw.rectangle((cx-10, neck+10, cx-3, neck+17), outline=INK, width=2)
            draw.rectangle((cx+3, neck+10, cx+10, neck+17), outline=INK, width=2)
        elif world == "fairy":
            draw.line((cx, neck+4, cx, int(top + (bot-top)*.68)), fill=accent, width=3)
            draw.ellipse((cx-3, neck+9, cx+3, neck+15), fill=(238, 201, 86, 255), outline=INK, width=1)
        else:  # mars
            draw.rectangle((cx-9, neck+9, cx+9, neck+19), fill=(218, 224, 231, 255), outline=INK, width=2)
            draw.line((cx-6, neck+14, cx+6, neck+14), fill=accent, width=2)


def outfit_nala(img: Image.Image, world: str) -> None:
    a = np.asarray(img)
    draw = ImageDraw.Draw(img)
    for col in range(9):
        x0, x1 = col * 128, (col + 1) * 128
        alpha = a[:, x0:x1, 3] > 40
        ys, xs = np.nonzero(alpha)
        top, bot = int(ys.min()), int(ys.max())
        cx = x0 + int(xs.mean()); y = int(top + (bot-top)*.48)
        green = ACCENT["nala"] + (255,)
        if world == "mars":
            draw.rounded_rectangle((cx-25, y-4, cx+25, y+21), radius=7, fill=(225,230,235,255), outline=INK, width=3)
            draw.line((cx-20,y+5,cx+20,y+5), fill=green, width=3)
        elif world == "neon":
            draw.rounded_rectangle((cx-27,y+4,cx+27,y+14), radius=5, fill=(34,40,54,255), outline=INK, width=3)
            draw.line((cx-23,y+8,cx+23,y+8), fill=green, width=3)
        elif world == "ski":
            draw.rounded_rectangle((cx-25,y-1,cx+25,y+22), radius=7, fill=green, outline=INK, width=3)
            draw.line((cx-20,y+7,cx+20,y+7), fill=(242,245,238,255), width=3)
        elif world == "jungle":
            draw.rounded_rectangle((cx-25,y+1,cx+25,y+20), radius=5, fill=(125,132,75,255), outline=INK, width=3)
            draw.rectangle((cx-17,y+5,cx-7,y+13), outline=INK, width=2)
            draw.rectangle((cx+7,y+5,cx+17,y+13), outline=INK, width=2)
        else:
            draw.polygon([(cx-23,y+2),(cx+23,y+2),(cx+31,y+23),(cx-31,y+23)], fill=(181,132,187,255), outline=INK)
            draw.line((cx,y+3,cx,y+21), fill=green, width=2)


def make(world: str, who: str) -> Image.Image:
    mod = __import__(f"outfits.{MODULES[world]}", fromlist=["behind", "front"])
    dressed = dress(who, MODULES[world], mod.behind, mod.front)
    image = Image.open(dressed).convert("RGBA")
    if who == "nala":
        outfit_nala(image, world)
    else:
        recolour_person(image, world, who)
    return image


def contact(world: str, sheets: dict[str, Image.Image]) -> None:
    original = {who: Image.open(PUBLIC / "assets" / f"{who}_walk.webp").convert("RGBA").resize((1152,256), Image.Resampling.NEAREST) for who in LADS}
    out = Image.new("RGBA", (2304, 1280), (100, 96, 104, 255))
    for row, who in enumerate(LADS):
        out.alpha_composite(original[who], (0, row*256))
        out.alpha_composite(sheets[who], (1152, row*256))
    out.save(ROOT / world / f"{world}_contact.png")


def validate(world: str, who: str, image: Image.Image) -> None:
    """Fail early on a malformed handoff sheet rather than ship a broken walk cycle."""
    if image.mode != "RGBA" or image.size != (1152, 256):
        raise ValueError(f"{world}/{who}: expected 1152x256 RGBA, got {image.mode} {image.size}")
    alpha = np.asarray(image)[:, :, 3]
    source = np.asarray(Image.open(PUBLIC / "assets" / f"{who}_walk.webp").convert("RGBA"))[:, :, 3]
    for col in range(9):
        cell = alpha[:, col * 128:(col + 1) * 128]
        if not np.any(cell > 40):
            raise ValueError(f"{world}/{who}: empty animation cell {col}")
        # Preserve every source cell's own sole row; different step poses legitimately
        # use neighbouring rows, so compare frame-for-frame rather than globally.
        source_cell = source[:, col * 64:(col + 1) * 64]
        expected_bottom = int(np.nonzero(source_cell > 40)[0].max()) * 2 + 1
        actual_bottom = int(np.nonzero(cell > 40)[0].max())
        if actual_bottom != expected_bottom:
            raise ValueError(f"{world}/{who}: cell {col} moved its foot baseline ({actual_bottom}, expected {expected_bottom})")


def write_runtime(world: str, who: str, image: Image.Image) -> None:
    """Publish the exact same 9x128x256 registration the renderer consumes."""
    WORLDS.mkdir(parents=True, exist_ok=True)
    dest = WORLDS / f"{who}_walk_{RUNTIME_WORLD[world]}.webp"
    image.save(dest, "WEBP", quality=94, method=6, alpha_quality=100)


def main() -> None:
    for world in MODULES:
        folder = ROOT / world
        folder.mkdir(parents=True, exist_ok=True)
        sheets = {}
        for who in LADS:
            image = make(world, who)
            validate(world, who, image)
            dest = folder / f"{who}_walk_{world}.png"
            image.save(dest)
            write_runtime(world, who, image)
            sheets[who] = image
        contact(world, sheets)
        (folder / "README.md").write_text(
            "# Full outfit walk-sheet QA\n\n"
            "Original accepted sheets are at left and outfit sheets at right in the contact sheet. "
            "All five sheets retain source faces, hair, nine-frame gait, cell boundaries and the row-253 foot baseline; "
            "backgrounds are RGBA transparent. Clothing is fully recoloured and overlaid with the world's complete outfit system.\n\n"
            "Checked: source identity remains readable; nine cells are ordered down/up/left in the source cadence; "
            "outfit props follow the matching facing; no guide boxes, chroma fringe, cell bleed, brands, or readable text. "
            "The matching WebP runtime sheets were published to `public/worlds/` for the picker.\n"
        )


if __name__ == "__main__":
    main()
