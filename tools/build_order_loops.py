#!/usr/bin/env python3
"""Frames for the order page's looping previews (src/order/steps/loops.ts draws them on a canvas).

Owner, 2026-09-15: "more videos instead of dead photos". There is no ffmpeg on this machine and a clip
would cost hundreds of KB, so every preview is a handful of the game's own frames, sprites and strips,
played by the page. This reads the game (never writes to it) and writes public/order-assets/loop_*.

build_site_assets.py calls build() after it has emptied the folder; it can also run on its own:

    python3 tools/build_order_loops.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps

SITE = Path(__file__).resolve().parent.parent
GAME = SITE.parent / "polishedcrystal-master" / "public" / "assets"
CHARACTER_ASSETS = SITE.parent / "CharacterAssets"
OUT = SITE / "public" / "order-assets"
SOURCE = SITE / "source"

errors: list[str] = []


def load(rel: str) -> Image.Image | None:
    p = GAME / rel
    if not p.exists():
        errors.append(f"missing source: {p}")
        return None
    return Image.open(p)


def load_generation(rel: str) -> Image.Image | None:
    """Read from the project's CharacterAssets tree (generation art), for when the game's deployed copy is worse."""
    p = CHARACTER_ASSETS / rel
    if not p.exists():
        errors.append(f"missing source: {p}")
        return None
    return Image.open(p)


def despill_rim(im: Image.Image, rim: int = 3) -> Image.Image:
    """Take chroma-key green off the silhouette's rim (§chroma-residue): only pixels within `rim` px of
    transparency, only where green exceeds both other channels, and the excess goes back into red and blue so
    a dark outline stays dark rather than turning black or green. Alpha is never touched, so no outline is eaten."""
    import numpy as np
    from PIL import ImageFilter

    a = np.array(im).astype(np.float32)
    opaque = a[..., 3] > 0
    clear = Image.fromarray(((~opaque) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * rim + 1))
    near = (np.array(clear) > 0) & opaque
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    cap = np.maximum(r, b)
    spill = near & (g > cap)
    excess = np.where(spill, g - cap, 0)
    total = r + b + 1e-6
    a[..., 0] = np.where(spill, r + excess * r / total, r)
    a[..., 2] = np.where(spill, b + excess * b / total, b)
    a[..., 1] = np.where(spill, cap, g)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")


def cover(rel: str, name: str, size=(360, 240), top: float = 0.5, quality: int = 78) -> None:
    im = load(rel)
    if im:
        ImageOps.fit(im.convert("RGB"), size, Image.LANCZOS, centering=(0.5, top)).save(OUT / name, "WEBP", quality=quality, method=6)


def sprite(im: Image.Image, name: str, lossless: bool = False) -> None:
    if name.endswith(".png"):  # small pixel art: a palette PNG keeps every pixel exact and stays tiny
        im.quantize(64, method=Image.FASTOCTREE).save(OUT / name, optimize=True)
        return
    im.save(OUT / name, "WEBP", lossless=lossless, quality=82, method=6, alpha_quality=90)


# The four story outlines (plan 19). Three frames each, captured from the real game with
# tools/frame_sink.py and kept in source/outlines/ — the game is not scripted from here, so a frame
# cannot be re-derived on demand the way a sprite can. The loop plays them as a crossfading slideshow
# (src/order/steps/loops.ts `slideshow`), so the banner is a 3:1 cut and the card a 3:2 one.
#
# `top` is the vertical crop bias: a battle plate keeps the fighters (they stand below the middle), a
# top-down zone frame keeps the player, who is dead centre.
OUTLINE_FRAMES: dict[str, list[tuple[str, float]]] = {
    "crown": [("crown_1", 0.42), ("crown_2", 0.42), ("crown_3", 0.45)],
    # heist_1 is biased well up: the thing worth seeing is the marina's colour terrace and the boats
    # behind the promenade, not the paving the lad is standing on. heist_2 keeps the parked cars in.
    "heist": [("heist_1", 0.22), ("heist_2", 0.36), ("heist_3", 0.5)],
    "traitor": [("traitor_1", 0.5), ("traitor_2", 0.5), ("traitor_3", 0.5)],
    "night": [("night_1", 0.5), ("night_2", 0.5), ("night_3", 0.5)],
}


def fit_source(rel: str, name: str, size: tuple[int, int], top: float, quality: int) -> None:
    """Crop one of our own captures (source/, never the game tree) to a card or banner."""
    p = SOURCE / rel
    if not p.exists():
        errors.append(f"missing source: {p}")
        return
    im = Image.open(p).convert("RGB")
    ImageOps.fit(im, size, Image.LANCZOS, centering=(0.5, top)).save(OUT / name, "WEBP", quality=quality, method=6)


def build_outlines() -> None:
    for outline, frames in OUTLINE_FRAMES.items():
        for i, (stem, top) in enumerate(frames, 1):
            fit_source(f"outlines/{stem}.jpg", f"loop_outline_{outline}_{i}.webp", (720, 240), top, 62)
        stem, top = frames[0]
        fit_source(f"outlines/{stem}.jpg", f"outline_{outline}.webp", (360, 240), top, 68)


def build() -> list[str]:
    OUT.mkdir(parents=True, exist_ok=True)

    # ---- extras: talking face (Chris's own two mouth plates, cropped to the head so it can be drawn big)
    for state in ("rest", "open"):
        im = load(f"characters/Chris/Talk/chris_speak_{state}.png")
        if im:
            sprite(im.convert("RGBA").crop((4, 18, 124, 138)), f"loop_talk_{state}.png")

    # ---- extras: evolution (Rico -> mid -> final, with alpha so the page can cut a white silhouette)
    for i, rel in enumerate(["characters/Rico/Portrait/rico_portrait.png",
                             "characters/RicoMidEvo/Portrait/ricomidevo_portrait.png",
                             "characters/RicoFinalEvo/Portrait/ricofinalevo_portrait.png"], 1):
        im = load(rel)
        if im:
            im = im.convert("RGBA")
            im.thumbnail((256, 256), Image.LANCZOS)
            sprite(im, f"loop_evo_{i}.webp")

    # ---- extras: catching a lad with a drink (the game's own capture strips, square cells)
    for band in ("cold_one_throw", "cold_one_rest", "cold_one_wobble",
                 "shared_open", "shared_absorb", "shared_success"):
        im = load(f"vfx/vfx_catch_{band}_sheet.png")
        if im:
            sprite(im.convert("RGBA"), f"loop_catch_{band.replace('cold_one_', '')}.webp")
    # Kai is taken from his GENERATION art, not the game's Runtime/kai_front_runtime.png: that sheet's key
    # ate his dark linework, so the hair strands, eyebrows and eye lines are transparent holes the page's
    # backdrop shows through. kai_front_source.png is the same drawing with an intact matte; its only fault is
    # a faint dark-green spill on the outline, taken off by despill_rim.
    kai = load_generation("Kai/Generation/kai_front_source.png")
    if kai:
        kai = despill_rim(kai.convert("RGBA"))
        kai = kai.crop(kai.getbbox())
        kai.thumbnail((200, 200), Image.LANCZOS)
        sprite(kai, "loop_catch_kai.webp")
    cover("backgrounds/battle/beach.png", "loop_catch_bg.webp")

    # ---- extras: signature move (make_it_rain, 16 cells of 256; the sheet has a guide line baked
    # along the bottom of each row, so each cell is cut 12px short)
    rain = load("vfx/make_it_rain.png")
    if rain:
        rain = rain.convert("RGBA")
        strip = Image.new("RGBA", (16 * 96, 96))
        for i in range(16):
            x, y = (i % 4) * 256, (i // 4) * 256
            cell = rain.crop((x, y + 6, x + 256, y + 244)).resize((96, 89), Image.LANCZOS)
            strip.paste(cell, (i * 96, 3))
        sprite(strip, "loop_move_rain.webp")

    # ---- vehicles: a car's own 12-frame bob, facing right (row 3 of the 4x12 sheet)
    for key, rel in (("car", "vehicles/cars/sport_yellow.png"), ("taxi", "vehicles/cars/taxi_stock.png")):
        im = load(rel)
        if im:
            cell = im.width // 12
            sprite(im.convert("RGBA").crop((0, cell * 3, im.width, cell * 4)), f"loop_veh_{key}.webp")

    # ---- story: plates that are already a sequence in the game. The story step shows them as 3:1 banners
    # across the whole panel, so they are cut at 720x240 with the crop biased up (faces sit high in a plate).
    for i, f in enumerate(("01_shake", "03_pour", "02_finish", "04_present"), 1):
        cover(f"cutscene/rico-mexibar/rico_mexibar_{f}.png", f"loop_story_plate_{i}.webp", (720, 240), 0.1, 72)
    for i, f in enumerate(("01-manager", "02-appreciate", "03-wink"), 1):
        cover(f"cutscene/chris-room/manager/{f}.png", f"loop_story_boss_{i}.webp", (720, 240), 0.3, 72)
    for i, (f, top) in enumerate((("intro_07.png", 0.35), ("intro_09.png", 0.35), ("intro_11.png", 0.4), ("poolside_11_cover.jpg", 0.75)), 1):
        cover(f"cutscene/{f}", f"loop_story_cut_{i}.webp", (720, 240), top, 72)

    build_outlines()
    build_posters()
    return errors


def build_posters() -> None:
    """Stills for the loops: shown before the frames load and to anyone who has asked for reduced motion, so
    each one says the whole thing in one picture rather than freezing the loop at an arbitrary moment."""
    from PIL import ImageDraw, ImageFont

    def font(size: int):
        try:
            return ImageFont.truetype("/System/Library/Fonts/Supplemental/Trebuchet MS Bold.ttf", size)
        except OSError:
            return ImageFont.load_default()

    def open_out(name: str) -> Image.Image | None:
        p = OUT / name
        return Image.open(p).convert("RGBA") if p.exists() else None

    night = (34, 50, 66, 255)
    # evolution: the three forms in a row
    card = Image.new("RGBA", (360, 240), night)
    d = ImageDraw.Draw(card)
    for i in range(3):
        im = open_out(f"loop_evo_{i + 1}.webp")
        if im:
            im = im.resize((112, 112), Image.LANCZOS)
            card.alpha_composite(im, (6 + i * 124, 62))
    for x in (118, 242):
        d.text((x, 104), "→", font=font(26), fill=(253, 246, 227))
    card.convert("RGB").save(OUT / "loop_poster_evo.webp", "WEBP", quality=80, method=6)

    # talking face: the head, mouth open, and a speech bubble
    card = Image.new("RGBA", (360, 240), (246, 236, 212, 255))
    head = open_out("loop_talk_open.png")
    if head:
        card.alpha_composite(head.resize((200, 200), Image.NEAREST), (-4, 44))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((204, 34, 350, 142), 10, fill=(253, 246, 227), outline=(32, 36, 44), width=3)
    d.polygon([(206, 124), (184, 142), (206, 104)], fill=(253, 246, 227))
    d.line([(204, 125), (184, 142), (204, 103)], fill=(32, 36, 44), width=3)
    for n, line in enumerate(["Right lads,", "who's buying", "the first round?"]):
        d.text((216, 48 + n * 26), line, font=font(16), fill=(32, 36, 44))
    card.convert("RGB").save(OUT / "loop_poster_talk.webp", "WEBP", quality=82, method=6)

    # catching: the drink standing where the lad was, the success stars round it
    bg = open_out("loop_catch_bg.webp")
    card = bg if bg else Image.new("RGBA", (360, 240), night)
    for name, cell, h, y in (("loop_catch_rest.webp", 0, 82, 181), ("loop_catch_shared_success.webp", 1, 165, 181)):
        strip = open_out(name)
        if strip:
            side = strip.height
            im = strip.crop((cell * side, 0, cell * side + side, side)).resize((h, h), Image.LANCZOS)
            card.alpha_composite(im, (258 - h // 2, y - h // 2))
    d = ImageDraw.Draw(card)
    d.text((122, 92), "CAUGHT!", font=font(34), fill=(241, 207, 154), anchor="mm", stroke_width=4, stroke_fill=(32, 36, 44))
    card.convert("RGB").save(OUT / "loop_poster_catch.webp", "WEBP", quality=80, method=6)

    # signature move: the busiest frame of the effect
    card = Image.new("RGBA", (240, 240), night)
    rain = open_out("loop_move_rain.webp")
    if rain:
        cell = rain.crop((10 * 96, 0, 11 * 96, 96)).resize((236, 236), Image.LANCZOS)
        card.alpha_composite(cell, (2, 2))
    card.convert("RGB").save(OUT / "loop_poster_move.webp", "WEBP", quality=80, method=6)


if __name__ == "__main__":
    errs = build()
    files = sorted(OUT.glob("loop_*"))
    print(f"{len(files)} loop files, {sum(p.stat().st_size for p in files) / 1024:.0f} KB")
    for e in errs:
        print("ERROR:", e)
    sys.exit(1 if errs else 0)
