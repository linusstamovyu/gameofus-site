#!/usr/bin/env python3
"""The four couples mockups (plan 19), plus the home page's "For two?" card.

Owner, 16 Sep 2026: the Love kit is ADVERTISING ART ONLY — nothing goes into the engine until a couple
pays. So every picture here is composed from art that already ships (the game's own zones, sprites,
backdrops and full-body plates) plus drawing done in this file, and each one is something we could
honour in a few hours if an order came in tomorrow:

    hearts    a heart thrown instead of a drink, and the meter relabelled  -> item icon + a label
    palette   the flat's living room re-graded warm pink                   -> a palette swap
    select    the two of them on the character-select                      -> the real character pipeline
    proposal  a "will you marry me" plate                                  -> the proposal ending (already sold)

Nothing here mocks up a romance minigame, a music track or a new type chart: all three are real builds
and none of them is being sold yet.

    python3 tools/build_couple_ads.py

Writes the 4:5 ads (1080x1350, Instagram's feed shape, the owner's pick) to public/brand/couples/, which
build_site_assets.py does NOT empty — they are hand-authored, not derived from the game tree. The site
card it also writes goes to public/assets/, which IS emptied, so build_site_assets.py calls build_card()
itself after it has rebuilt that folder.

The cast is Ethan and Coco, two of the lads already on the site's own roster: a mockup is public, and a
public-use consent box is already ticked for both. Do not swap in anybody else without asking.

NOT Rico, though he is the site's own demo lad: his full-body plate has him holding a bong, and
`Game of Us/templates/marketing-clip-rules.md` keeps snus, joints and bongs out of anything we post.
Not Kai either — his plate's trainers carry a recognisable swoosh. Check a plate's hands and feet
before putting it in an ad.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

SITE = Path(__file__).resolve().parent.parent
GAME = SITE.parent / "polishedcrystal-master" / "public" / "assets"
SOURCE = SITE / "source"
ADS = SITE / "public" / "brand" / "couples"
SITE_OUT = SITE / "public" / "assets"

AD = (1080, 1350)
HEAD_H = 168
PIC_H = 910
INK = (32, 36, 44)
NIGHT = (23, 34, 46)
NIGHT_2 = (34, 50, 66)
PAPER = (253, 246, 227)
GOLD = (211, 154, 74)
LOVE = (224, 90, 155)  # --charm on the site, so the kit's pink is the brand's pink
LOVE_DARK = (150, 40, 96)

errors: list[str] = []


def font(size: int, bold: bool = True):
    name = "Trebuchet MS Bold.ttf" if bold else "Trebuchet MS.ttf"
    try:
        return ImageFont.truetype(f"/System/Library/Fonts/Supplemental/{name}", size)
    except OSError:
        return ImageFont.load_default()


def game(rel: str) -> Image.Image | None:
    p = GAME / rel
    if not p.exists():
        errors.append(f"missing source: {p}")
        return None
    return Image.open(p)


def shot(rel: str) -> Image.Image | None:
    """One of our own game captures (source/outlines, see tools/frame_sink.py)."""
    p = SOURCE / rel
    if not p.exists():
        errors.append(f"missing source: {p}")
        return None
    return Image.open(p).convert("RGB")


def walk_cell(folder: str, sid: str, cell: int = 0) -> Image.Image | None:
    """One cell of a character's 9-cell overworld walk sheet, trimmed to the drawing."""
    im = game(f"characters/{folder}/Runtime/{sid}_walk_runtime.png")
    if not im:
        return None
    im = im.convert("RGBA")
    w = im.width // 9
    c = im.crop((cell * w, 0, cell * w + w, im.height))
    return c.crop(c.getbbox() or (0, 0, w, im.height))


def picture(im: Image.Image, top: float = 0.5) -> Image.Image:
    """The ad's picture area. Crop FIRST and draw on top of this: anything drawn before the crop has its
    edges cut off — which is how the first build of the hearts ad lost the left half of the Love Meter."""
    return ImageOps.fit(im.convert("RGB"), (AD[0], PIC_H), Image.LANCZOS, centering=(0.5, top))


def frame(pic: Image.Image, headline: str, lines: list[str], kicker: str) -> Image.Image:
    """The shared ad: brand strip, the picture, then what it says in words."""
    ad = Image.new("RGB", AD, NIGHT)
    d = ImageDraw.Draw(ad)

    d.text((56, 44), "GAME OF US", font=font(40), fill=GOLD)
    d.text((58, 100), kicker, font=font(26, False), fill=PAPER)

    ad.paste(pic if pic.size == (AD[0], PIC_H) else picture(pic), (0, HEAD_H))
    d.rectangle((0, HEAD_H - 5, AD[0], HEAD_H), fill=INK)
    d.rectangle((0, HEAD_H + PIC_H, AD[0], HEAD_H + PIC_H + 5), fill=INK)

    d.rectangle((0, HEAD_H + PIC_H + 5, AD[0], AD[1]), fill=PAPER)
    y = HEAD_H + PIC_H + 44
    d.text((56, y), headline, font=font(58), fill=INK)
    y += 78
    for line in lines:
        d.text((58, y), line, font=font(28, False), fill=(74, 64, 54))
        y += 40
    d.text((58, AD[1] - 52), "An example of a custom build · gameofus", font=font(22, False), fill=(140, 126, 106))
    return ad


def meter(d: ImageDraw.ImageDraw, x: int, y: int, w: int, label: str, value: float, colour) -> None:
    """The game's own HUD panel — cream paper, near-black border — with one bar in it."""
    h = 78
    d.rounded_rectangle((x, y, x + w, y + h), 10, fill=PAPER, outline=INK, width=5)
    d.text((x + 18, y + 12), label, font=font(22), fill=INK)
    bx0, bx1 = x + 18, x + w - 18
    d.rectangle((bx0, y + 46, bx1, y + 64), fill=(214, 202, 176), outline=INK, width=3)
    d.rectangle((bx0 + 3, y + 49, bx0 + 3 + int((bx1 - bx0 - 6) * value), y + 61), fill=colour)


def heart(size: int, colour=LOVE) -> Image.Image:
    """A pixel heart, drawn on its own 16x16 grid and scaled with NEAREST so it stays pixel art."""
    grid = [
        "0011011000110110"[:16],
        "0111111101111111"[:16],
    ]
    rows = [
        "..XXX.....XXX...",
        ".XXXXX...XXXXX..",
        "XXXXXXX.XXXXXXX.",
        "XXXXXXXXXXXXXXX.",
        "XXXXXXXXXXXXXXX.",
        ".XXXXXXXXXXXXX..",
        ".XXXXXXXXXXXXX..",
        "..XXXXXXXXXXX...",
        "...XXXXXXXXX....",
        "....XXXXXXX.....",
        ".....XXXXX......",
        "......XXX.......",
        ".......X........",
    ]
    del grid
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "X":
                shade = colour if y < 9 else LOVE_DARK
                px[x, y + 1] = (*shade, 255)
    # one highlight, so it reads as a drawn item and not a silhouette
    for x, y in ((3, 2), (4, 2), (3, 3)):
        px[x, y] = (255, 214, 232, 255)
    return im.resize((size, size), Image.NEAREST)


def build_hearts() -> Image.Image | None:
    """The catch, with a heart where the drink goes, and the meter relabelled."""
    base = shot("outlines/night_3.jpg")  # the condo pool, top-down
    if not base:
        return None
    pic = picture(base, 0.62)  # biased down: it drops the world's own "Doze" prompt out of frame
    tile = pic.width / 15  # the game draws 15 tiles across its viewport
    her = walk_cell("Coco", "coco")
    if her:
        h = int(tile * 2.1)
        her = her.resize((int(her.width * h / her.height), h), Image.NEAREST)
        pic.paste(her, (int(pic.width * 0.60), int(pic.height * 0.30)), her)
    d = ImageDraw.Draw(pic)
    # the throw: a heart in flight on an arc, with the arc drawn as it fades behind it
    x0, y0 = pic.width * 0.39, pic.height * 0.50
    x1, y1 = pic.width * 0.62, pic.height * 0.36
    for i in range(9):
        q = i / 9
        x = x0 + (x1 - x0) * q
        y = y0 + (y1 - y0) * q - 120 * (q - q * q) * 2
        r = 4 + 3 * q
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 214, 232))
    big = heart(int(tile * 0.9))
    pic.paste(big, (int(x1 - big.width / 2), int(y1 - big.height / 2)), big)
    meter(d, 34, pic.height - 116, 430, "LOVE METER", 0.72, LOVE)
    return frame(
        pic,
        "Throw a heart, not a beer.",
        ["Every item in the game is yours: what you throw to catch",
         "someone, what the meter is called, what a win is worth."],
        "For two",
    )


def build_palette() -> Image.Image | None:
    """The same room, re-graded: a palette swap, with the before shot kept small and honest."""
    base = shot("outlines/night_1.jpg")  # 24B's living room, low sun through the door
    if not base:
        return None
    pic = picture(base)
    r, g, b = pic.split()
    r = r.point(lambda v: min(255, int(v * 1.09 + 14)))
    g = g.point(lambda v: min(255, int(v * 0.99 + 4)))
    b = b.point(lambda v: min(255, int(v * 1.01 + 18)))
    pic = Image.merge("RGB", (r, g, b))
    pic = Image.blend(pic, pic.filter(ImageFilter.GaussianBlur(26)), 0.12)
    # the before, small, in the corner: an ad that hides what changed is not showing a palette swap
    small = picture(base).resize((pic.width // 4, pic.height // 4), Image.LANCZOS)
    pic.paste(small, (pic.width - small.width - 26, 26))
    d = ImageDraw.Draw(pic)
    d.rectangle((pic.width - small.width - 26, 26, pic.width - 26, 26 + small.height), outline=PAPER, width=4)
    d.text((pic.width - small.width - 20, 34 + small.height), "the lads' version", font=font(20), fill=PAPER,
           stroke_width=3, stroke_fill=INK)
    return frame(
        pic,
        "Your palette, not ours.",
        ["The same flat, warmed to a sunset. Every zone in your game",
         "is graded to the mood you want it to have."],
        "For two",
    )


def build_select() -> Image.Image | None:
    """The character select, with the two of them on it and the kit's own words for their types."""
    pic = Image.new("RGB", (1080, 910), NIGHT_2)
    d = ImageDraw.Draw(pic)
    for i in range(0, 910, 6):  # the screen's own soft banding, so the panel is not a flat slab
        d.line((0, i, 1080, i), fill=(30, 46, 60), width=2)
    plates = [
        ("characters/Ethan/Selection3D/ethan_selection3d.png", "ETHAN", "DEVOTED", LOVE),
        ("characters/Coco/Selection3D/coco_selection3d.png", "COCO", "ROMANTIC", LOVE),
    ]
    for i, (rel, name, kind, colour) in enumerate(plates):
        im = game(rel)
        if not im:
            continue
        im = im.convert("RGBA")
        h = 660
        im = im.resize((int(im.width * h / im.height), h), Image.LANCZOS)
        cx = 280 + i * 520
        pic.paste(im, (cx - im.width // 2, 120), im)
        d.rounded_rectangle((cx - 170, 800, cx + 170, 872), 12, fill=PAPER, outline=INK, width=5)
        d.text((cx, 818), name, font=font(34), fill=INK, anchor="mm")
        d.rounded_rectangle((cx - 78, 838, cx + 78, 864), 13, fill=colour)
        d.text((cx, 851), kind, font=font(19), fill=PAPER, anchor="mm")
    d.text((540, 54), "CHOOSE YOUR PAIR", font=font(44), fill=PAPER, anchor="mm")
    return frame(
        pic,
        "Both of you, from your photos.",
        ["Two characters drawn from the pictures you upload, with the",
         "types renamed to suit the two of you."],
        "For two",
    )


def build_proposal() -> Image.Image | None:
    """The ending: the plate a proposal would be told on, in the game's own box."""
    bg = game("backgrounds/battle/condo_grounds.png")
    if not bg:
        return None
    pic = bg.convert("RGB").resize((1080, 720), Image.LANCZOS)
    dusk = Image.new("RGB", pic.size, (255, 166, 140))
    pic = Image.blend(pic, dusk, 0.22)
    for folder, sid, x, flip in (("Ethan", "ethan", 0.36, False), ("Coco", "coco", 0.60, True)):
        cell = walk_cell(folder, sid, 0)
        if not cell:
            continue
        h = 330
        cell = cell.resize((int(cell.width * h / cell.height), h), Image.NEAREST)
        if flip:
            cell = ImageOps.mirror(cell)
        pic.paste(cell, (int(pic.width * x - cell.width / 2), 300), cell)
    d = ImageDraw.Draw(pic)
    hr = heart(96)
    pic.paste(hr, (pic.width // 2 - 48, 210), hr)
    # the game's dialogue box, as the game draws it
    d.rounded_rectangle((40, pic.height - 190, pic.width - 40, pic.height - 30), 14, fill=PAPER, outline=INK, width=6)
    d.rounded_rectangle((70, pic.height - 222, 300, pic.height - 172), 10, fill=GOLD, outline=INK, width=5)
    d.text((185, pic.height - 197), "ETHAN", font=font(26), fill=INK, anchor="mm")
    d.text((80, pic.height - 148), "Will you marry me?", font=font(44), fill=INK)
    canvas = Image.new("RGB", (1080, 910), NIGHT)
    canvas.paste(pic, (0, 95))
    return frame(
        canvas,
        "Ask her inside the game.",
        ["The last scene is yours to write — a dedication, a birthday",
         "reveal, or a question you have been practising."],
        "The ending",
    )


ADS_BUILDERS = {
    "couple_hearts": build_hearts,
    "couple_palette": build_palette,
    "couple_select": build_select,
    "couple_proposal": build_proposal,
}


def build_card() -> list[str]:
    """The home page's "For two?" card (360x240), from the same picture as the hearts ad."""
    ad = build_hearts()
    if ad is None:
        return errors
    pic = ad.crop((0, HEAD_H, AD[0], HEAD_H + PIC_H))
    SITE_OUT.mkdir(parents=True, exist_ok=True)
    ImageOps.fit(pic, (360, 240), Image.LANCZOS, centering=(0.5, 0.45)).save(
        SITE_OUT / "couple_card.webp", "WEBP", quality=80, method=6)
    return errors


def main() -> int:
    ADS.mkdir(parents=True, exist_ok=True)
    for name, fn in ADS_BUILDERS.items():
        ad = fn()
        if ad is None:
            continue
        ad.save(ADS / f"{name}.jpg", quality=88, subsampling=1)
        print(f"{name}.jpg  {(ADS / f'{name}.jpg').stat().st_size // 1024} KB")
    build_card()
    print(f"couple_card.webp  {(SITE_OUT / 'couple_card.webp').stat().st_size // 1024} KB")
    for e in errors:
        print("ERROR:", e)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
