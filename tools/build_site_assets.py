#!/usr/bin/env python3
"""Build the website's lean asset folder from the game.

The game repo is 1.7 GB and changes every day; the site needs about 2 MB of it.
This script is the only thing that crosses that line: it reads the game (never
writes to it), resizes what the beach and the page draw, and writes
public/assets/. Re-run it after any art change in the game.

It FAILS (exit 1) when:
  * a source file is missing, or
  * a file named in src/content/*.json is not produced, or
  * the total goes over the first-load budget.

    python3 tools/build_site_assets.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

SITE = Path(__file__).resolve().parent.parent
GAME = SITE.parent / "polishedcrystal-master" / "public" / "assets"
OUT = SITE / "public" / "assets"
CONTENT = SITE / "src" / "content"
PHOTOS = SITE / "source" / "photos"

BUDGET_BYTES = 3 * 1024 * 1024  # plan 16: first load <= 3 MB (share.jpg is not loaded by the page)

# Squad members drawn on the site. Folder = the game's character folder.
SQUAD = {"rico": "Rico", "kai": "Kai", "elias": "Elias", "ethan": "Ethan", "nala": "Nala"}

# Real-photo headshot crops, as (left, top, right, bottom) in the upright source.
# Measured by eye against each photo on 2026-09-15; re-measure if a photo changes.
PHOTO_CROPS = {
    "rico": ("rico.png", (90, 230, 1190, 1330)),
    "kai": ("kai.png", (360, 120, 840, 600)),
    "ethan": ("ethan.jpg", (360, 80, 960, 680)),
    "elias": ("elias.png", (390, 240, 790, 640)),
    "nala": ("nala.png", (80, 620, 880, 1420)),
}

# Battle plates used as card art (game key -> site file).
PLATES = ["beach", "harbour", "oura_street", "gym1_interior", "kai_gym_mid", "marina_street"]

# The order page's art (plan 07 Q12: existing game art as stills for now; the owner replaces look-alike
# art later). It lives in its own folder with its own budget, loaded only on /order, so the home page's
# first-load budget is untouched. Output name -> (game file, how to fit it into a 3:2 card).
ORDER_OUT = SITE / "public" / "order-assets"
ORDER_BUDGET_BYTES = 2 * 1024 * 1024
MINIGAMES = ["blackjack", "kings-cup", "the-bus", "dice-push-your-luck", "three-cup-shuffle", "landmine",
             "reaction-light", "stop-the-pour", "safecracker", "mini-battleships", "takeaway-nim", "tic-tac-toe"]
BIG_GAMES = {
    "game_kart.webp": ("props/kart_gantry.png", "cover"),
    "game_brawler.webp": ("fighter/stages/arcade_mid.png", "cover"),
    "game_build.webp": ("backgrounds/battle/kai_gym_mid.png", "cover"),
    "game_craft.webp": ("station-a/props/crafting_table.png", "prop"),
    "game_gym.webp": ("backgrounds/battle/gym1_interior.png", "cover"),
    "game_photo.webp": ("phone/photos/albufeira_caro_tower.jpg", "cover"),
    "game_escort.webp": ("backgrounds/battle/ber_kiez.png", "cover"),
    "game_quiz.webp": ("cutscene/berlin-coffee/coffee_cup.png", "cover"),
    "game_chase.webp": ("backgrounds/battle/harbour.png", "cover"),
}

errors: list[str] = []


def src(path: Path) -> Path | None:
    if not path.exists():
        errors.append(f"missing source: {path}")
        return None
    return path


def save_webp(im: Image.Image, name: str, quality: int = 90) -> None:
    # WebP with alpha: about a third of the PNG size, supported by every current browser.
    im.save(OUT / name, "WEBP", quality=quality, method=6)


def build_squad() -> None:
    for sid, folder in SQUAD.items():
        walk = src(GAME / "characters" / folder / "Runtime" / f"{sid}_walk_runtime.png")
        if walk:
            im = Image.open(walk).convert("RGBA")
            # 9 cells of 128x256 -> 64x128: the beach draws one tile at <= 66 px.
            save_webp(im.resize((im.width // 2, im.height // 2), Image.LANCZOS), f"{sid}_walk.webp")
        face = src(GAME / "characters" / folder / "Portrait" / f"{sid}_portrait.png")
        if face:
            im = Image.open(face).convert("RGBA")
            im.thumbnail((256, 256), Image.LANCZOS)
            save_webp(im, f"{sid}_face.webp")
        file, box = PHOTO_CROPS[sid]
        photo = src(PHOTOS / file)
        if photo:
            im = ImageOps.exif_transpose(Image.open(photo)).convert("RGB").crop(box)
            save_webp(im.resize((256, 256), Image.LANCZOS), f"{sid}_photo.webp", quality=84)


def build_world() -> None:
    palm = src(GAME / "props" / "palm_retro.png")
    if palm:
        save_webp(Image.open(palm).convert("RGBA"), "palm.webp")
    for key in PLATES:
        plate = src(GAME / "backgrounds" / "battle" / f"{key}.png")
        if plate:
            im = Image.open(plate).convert("RGB")
            im.thumbnail((720, 480), Image.LANCZOS)
            save_webp(im, f"bg_{key}.webp", quality=80)


def build_order_art() -> None:
    card = (360, 240)
    for name, (rel, fit) in BIG_GAMES.items():
        f = src(GAME / rel)
        if not f:
            continue
        im = Image.open(f).convert("RGBA")
        if fit == "cover":
            out = ImageOps.fit(im.convert("RGB"), card, Image.LANCZOS)
        else:  # a small prop on transparency: centre it on the site's night panel colour
            out = Image.new("RGB", card, (34, 50, 66))
            im.thumbnail((card[0] - 60, card[1] - 40), Image.LANCZOS)
            out.paste(im, ((card[0] - im.width) // 2, (card[1] - im.height) // 2), im)
        out.save(ORDER_OUT / name, "WEBP", quality=80, method=6)
    for mid in MINIGAMES:
        f = src(GAME / "minigames" / "covers" / f"{mid}.png")
        if f:
            im = Image.open(f).convert("RGB")
            im.thumbnail((192, 192), Image.LANCZOS)
            im.save(ORDER_OUT / f"mini_{mid}.webp", "WEBP", quality=80, method=6)


def build_share_image() -> None:
    """1200x630 share card: the squad's portraits on the sea."""
    card = Image.new("RGB", (1200, 630), (28, 95, 130))
    draw = ImageDraw.Draw(card)
    draw.rectangle((0, 440, 1200, 630), fill=(239, 220, 179))
    draw.rectangle((0, 436, 1200, 444), fill=(32, 36, 44))
    faces = [OUT / f"{sid}_face.webp" for sid in SQUAD]
    x = 60
    for f in faces:
        if not f.exists():
            continue
        im = Image.open(f).convert("RGBA").resize((210, 210), Image.LANCZOS)
        card.paste(im, (x, 236), im)
        x += 220
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Trebuchet MS Bold.ttf", 66)
        small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Trebuchet MS.ttf", 30)
    except OSError:
        font = small = ImageFont.load_default()
    draw.text((60, 60), "Game of Us", font=font, fill=(253, 246, 227))
    draw.text((62, 150), "Your friends. Your places. Your game.", font=small, fill=(253, 246, 227))
    draw.text((62, 540), "A retro RPG starring your friends", font=small, fill=(32, 36, 44))
    card.save(OUT / "share.jpg", quality=86)


def check_content_refs() -> None:
    """Every asset a content file names must exist after the build."""
    for jf in sorted(CONTENT.glob("*.json")):
        json.loads(jf.read_text())  # a broken content file fails here, not in the browser
        for token in re.findall(r'"([\w.-]+\.(?:png|jpg|webp))"', jf.read_text()):
            if not (OUT / token).exists() and not (ORDER_OUT / token).exists():
                errors.append(f"{jf.name} names {token}, which was not built")


def main() -> int:
    for folder in (OUT, ORDER_OUT):
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob("*"):
            old.unlink()
    build_squad()
    build_world()
    build_order_art()
    build_share_image()
    check_content_refs()

    total = sum(p.stat().st_size for p in OUT.glob("*") if p.name != "share.jpg")
    print(f"{len(list(OUT.glob('*')))} files, first-load total {total / 1024:.0f} KB "
          f"(budget {BUDGET_BYTES / 1024:.0f} KB)")
    if total > BUDGET_BYTES:
        errors.append(f"over budget: {total} > {BUDGET_BYTES} bytes")
    order_total = sum(p.stat().st_size for p in ORDER_OUT.glob("*"))
    print(f"order page art: {len(list(ORDER_OUT.glob('*')))} files, {order_total / 1024:.0f} KB (budget {ORDER_BUDGET_BYTES / 1024:.0f} KB)")
    if order_total > ORDER_BUDGET_BYTES:
        errors.append(f"order art over budget: {order_total} > {ORDER_BUDGET_BYTES} bytes")
    for e in errors:
        print("ERROR:", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
