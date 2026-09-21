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

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cut_portrait_backdrop import cut as cut_backdrop  # noqa: E402
from recut_outfit_sheets import OUT as RECUT  # noqa: E402
from recut_outfit_sheets import OVERRIDES, override_cell  # noqa: E402

SITE = Path(__file__).resolve().parent.parent
GAME = SITE.parent / "polishedcrystal-master" / "public" / "assets"
OUT = SITE / "public" / "assets"
CONTENT = SITE / "src" / "content"
PHOTOS = SITE / "source" / "photos"

BUDGET_BYTES = 3 * 1024 * 1024  # plan 16: first load <= 3 MB (share.jpg is not loaded by the page)

# Squad members drawn on the site. Folder = the game's character folder.
SQUAD = {"rico": "Rico", "kai": "Kai", "elias": "Elias", "ethan": "Ethan", "nala": "Nala", "coco": "Coco"}

# Game portraits painted on a backdrop (the rest are already transparent): cut it out for the site.
PAINTED_BACKDROP = {"coco"}

# Real-photo headshot crops, as (left, top, right, bottom) in the upright source.
# Measured by eye against each photo on 2026-09-15; re-measure if a photo changes.
PHOTO_CROPS = {
    "rico": ("rico.png", (90, 230, 1190, 1330)),
    "kai": ("kai.png", (360, 120, 840, 600)),
    "ethan": ("ethan.jpg", (360, 80, 960, 680)),
    "elias": ("elias.png", (390, 240, 790, 640)),
    "nala": ("nala.png", (80, 620, 880, 1420)),
    "coco": ("coco.png", (60, 10, 340, 290)),
}

# Battle plates used as card art (game key -> site file).
PLATES = ["beach", "harbour", "oura_street", "gym1_interior", "kai_gym_mid", "marina_street", "nightclub_exterior"]

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
        # A whole beach sheet recut from a Codex regen (tools/cut_regen_2026_09.py) wins outright: it is
        # already the 1152x256 nine-cell sheet, already keyed and already sized to the live art, so the
        # game's runtime sheet and the single-cell overrides below have nothing left to contribute.
        # Without this the next full rebuild would quietly put the old art back.
        recut_beach = RECUT / f"{sid}_walk_beach.png"
        if recut_beach.exists():
            im = Image.open(recut_beach).convert("RGBA")
            save_webp(im.resize((im.width // 2, im.height // 2), Image.LANCZOS), f"{sid}_walk.webp")
            walk = None
        else:
            walk = src(GAME / "characters" / folder / "Runtime" / f"{sid}_walk_runtime.png")
        if walk:
            im = Image.open(walk).convert("RGBA")
            # A regenerated standing frame for the beach (source/outfits/regen-requests) replaces its cell.
            for ov in sorted(OVERRIDES.glob(f"{sid}_walk_beach_cell*.png")):
                i = int(ov.stem.rsplit("cell", 1)[1])
                a = np.asarray(im)[:, :, 3] > 40
                side = [c for c in range(9) if c // 3 == i // 3 and c != i]
                hs = [np.ptp(np.nonzero(a[:, c * 128:(c + 1) * 128].any(axis=1))[0]) + 1 for c in side]
                im.paste((0, 0, 0, 0), (i * 128, 0, (i + 1) * 128, 256))
                im.alpha_composite(override_cell(ov, int(np.median(hs))), (i * 128, 0))
            # 9 cells of 128x256 -> 64x128: the beach draws one tile at <= 66 px.
            save_webp(im.resize((im.width // 2, im.height // 2), Image.LANCZOS), f"{sid}_walk.webp")
        face = src(GAME / "characters" / folder / "Portrait" / f"{sid}_portrait.png")
        if face:
            im = cut_backdrop(str(face)) if sid in PAINTED_BACKDROP else Image.open(face).convert("RGBA")
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


# Art for order steps 4–9 (one prefix per section, so each step's agent knows its own files).
# fit: "cover" crops to the card, "prop" centres a small transparent drawing, "cell:x,y,w,h" cuts one
# sheet cell first (then treated as a prop), "gif" takes a GIF's first frame.
SECTION_ART = {
    # world: place kits
    "world_home.webp": ("backgrounds/battle/apartment_flat.png", "cover"),
    "world_town.webp": ("backgrounds/battle/main_street.png", "cover"),
    "world_beach.webp": ("backgrounds/battle/beach.png", "cover"),
    "world_harbour.webp": ("backgrounds/battle/harbour.png", "cover"),
    "world_city.webp": ("backgrounds/battle/ber_kiez.png", "cover"),
    "world_stadium.webp": ("backgrounds/battle/stadium.png", "cover"),
    "world_nightlife.webp": ("backgrounds/battle/nightclub_exterior.png", "cover"),
    "world_countryside.webp": ("backgrounds/battle/high_ground.png", "cover"),
    "world_shopsign.webp": ("shops/mexibar_banner.png", "cover"),
    # vehicles
    "veh_car.webp": ("vehicles/cars/sport_yellow.png", "cell:0,300,100,100"),
    "veh_taxi.webp": ("vehicles/cars/taxi_stock.png", "cell:0,300,100,100"),
    "veh_scooter.webp": ("vehicles/riders/rico_scooter_right.png", "prop"),
    "veh_minecart.webp": ("vehicles/minecart_empty.png", "prop"),
    "veh_kart.webp": ("props/kart_gantry.png", "cover"),
    "veh_dealer.webp": ("shops/auto_albufeira_banner.png", "cover"),
    # phone
    "phone_call.webp": ("phone/app_icons/phone.png", "prop"),
    "phone_mail.webp": ("phone/app_icons/mail.png", "prop"),
    "phone_photos.webp": ("phone/app_icons/photos.png", "prop"),
    "phone_games.webp": ("phone/app_icons/games.png", "prop"),
    "phone_maps.webp": ("phone/app_icons/maps.png", "prop"),
    "phone_news.webp": ("phone/news/jonesy_wanted.png", "prop"),
    "phone_caller.webp": ("cutscene/call_portraits/rico.png", "cover"),
    # story, the extras step and the trailer card play loops instead: tools/build_order_loops.py
    # extras
    "extras_item_drink.webp": ("items/sangria_bucket.png", "prop"),
    "extras_item_can.webp": ("items/cold_one.png", "prop"),
    # keepsakes
}


def fit_card(im: Image.Image, fit: str, card: tuple[int, int]) -> Image.Image:
    if fit.startswith("cell:"):
        x, y, w, h = (int(v) for v in fit[5:].split(","))
        im, fit = im.crop((x, y, x + w, y + h)), "prop"
    if fit == "gif":
        im.seek(0)
        im, fit = im.convert("RGB"), "cover"
    if fit == "cover":
        return ImageOps.fit(im.convert("RGB"), card, Image.LANCZOS)
    out = Image.new("RGB", card, (34, 50, 66))
    im = im.convert("RGBA")
    scale = min((card[0] - 40) / im.width, (card[1] - 30) / im.height)
    resample = Image.NEAREST if max(im.width, im.height) <= 256 else Image.LANCZOS  # keep small pixel art crisp
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), resample)
    out.paste(im, ((card[0] - im.width) // 2, (card[1] - im.height) // 2), im)
    return out


def build_section_art() -> None:
    for name, (rel, fit) in SECTION_ART.items():
        f = src(GAME / rel)
        if f:
            fit_card(Image.open(f), fit, (360, 240)).save(ORDER_OUT / name, "WEBP", quality=80, method=6)
    # A printable gift card mock-up for the keepsakes step: drawn, so nothing to license.
    card = Image.new("RGB", (360, 240), (253, 246, 227))
    d = ImageDraw.Draw(card)
    d.rectangle((6, 6, 353, 233), outline=(32, 36, 44), width=4)
    d.rectangle((6, 6, 353, 60), fill=(26, 158, 149))
    try:
        big = ImageFont.truetype("/System/Library/Fonts/Supplemental/Trebuchet MS Bold.ttf", 26)
        small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Trebuchet MS.ttf", 15)
    except OSError:
        big = small = ImageFont.load_default()
    d.text((20, 18), "Game of Us · Gift card", font=big, fill=(253, 246, 227))
    d.text((20, 80), "You've been given a game", font=small, fill=(32, 36, 44))
    d.text((20, 102), "starring your whole squad.", font=small, fill=(32, 36, 44))
    d.text((20, 190), "Scan to play", font=small, fill=(107, 90, 69))
    for i in range(7):  # a QR-looking block, not a real code
        for j in range(7):
            if (i * 3 + j * 5 + i * j) % 3 != 1 or i in (0, 6) or j in (0, 6):
                d.rectangle((250 + i * 12, 90 + j * 12, 261 + i * 12, 101 + j * 12), fill=(32, 36, 44))
    card.save(ORDER_OUT / "keep_giftcard.webp", "WEBP", quality=85, method=6)


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


# Moving previews on the Games step (src/order/preview). Two kinds of input:
#  * BACKGROUNDS are the game's own zones rendered by the game's own tile painters at 32 px a tile, saved
#    once into source/previews/ (see its README.md for how they were baked). Cropped here in TILE units.
#  * SPRITES come straight from the game tree, shrunk to what a 360x240 card can show at 2x.
PREVIEW_SRC = SITE / "source" / "previews"
PT = 32  # px per tile in the baked zone PNGs
PREVIEW_BACKGROUNDS = {
    # name: (baked file, (x0, y0, x1, y1) in tiles, scale)
    "pv_gym_bg.webp": ("gym1_interior.png", (0.375, 2.5, 11.625, 10), 1),
    "pv_gym_gate.webp": ("gym1_interior_open.png", (1, 2.5, 11, 4.5), 1),
    "pv_kart_bg.webp": ("kart_track.png", (0, 14, 38, 54), 0.75),
    "pv_build_bg.webp": ("kai_gym.png", (3.875, 26, 15.125, 39), 1),
    "pv_craft_bg.webp": ("minecraft_station_b.png", (1.875, 1.5, 13.125, 10.5), 1),
    "pv_escort_bg.webp": ("ber_kiez.png", (15.875, 5, 27.125, 17), 1),
    "pv_chase_bg.webp": ("harbour.png", (4, 23.5, 22, 31), 1),
}
# name: (game file, crop box in px or None, output size)
PREVIEW_SPRITES = {
    "pv_rico_walk.webp": ("characters/Rico/Runtime/rico_walk_runtime.png", None, (576, 128)),
    "pv_rico_run.webp": ("characters/Rico/Runtime/rico_run_runtime.png", None, (576, 128)),
    "pv_rico_build.webp": ("characters/Rico/Runtime/rico_walk_build_runtime.png", None, (576, 128)),
    "pv_morten_crutch.webp": ("characters/Morten/Runtime/morten_crutches_walk_runtime.png", None, (576, 128)),
    "pv_jonesy_walk.webp": ("characters/Jonesy/Runtime/jonesy_walk_runtime.png", None, (576, 128)),
    "pv_car_red.webp": ("vehicles/cars/sport_red.png", (0, 0, 400, 400), (400, 400)),  # 4 bob frames x 4 facings
    "pv_car_blue.webp": ("vehicles/cars/sport_blue.png", (0, 0, 400, 400), (400, 400)),  # 4 bob frames x 4 facings
    "pv_car_white.webp": ("vehicles/cars/sedan_white.png", (0, 0, 400, 400), (400, 400)),  # 4 bob frames x 4 facings
    "pv_fuel.webp": ("props/fuel_can.png", None, (64, 64)),
    "pv_ramp_ghost.webp": ("props/jonesy_ramp_v2/jonesy_ramp_full_blue.png", None, (80, 130)),
    "pv_ramp_blueprint.webp": ("props/jonesy_ramp_v2/jonesy_ramp_up_blueprint.png", None, (80, 130)),
    "pv_ramp_partial.webp": ("props/jonesy_ramp_v2/jonesy_ramp_up_partial.png", None, (80, 130)),
    "pv_ramp_complete.webp": ("props/jonesy_ramp_v2/jonesy_ramp_up_complete.png", None, (80, 130)),
    "pv_rail_v.webp": ("station-a/rails/rail_straight_vertical.png", (0, 0, 203, 213), (64, 67)),
    "pv_cart_up.webp": ("vehicles/riders/rico_minecart_up.png", None, (118, 184)),
    "pv_caro.webp": ("cutscene/caro-tower/caro_subject.jpg", None, (437, 600)),
    "pv_kid.webp": ("cutscene/caro-tower/kid_run_strip.png", None, (1024, 128)),
    "pv_coffee_bg.webp": ("cutscene/berlin-coffee/coffee_barista.png", (131, 0, 1541, 941), (540, 360)),
    "pv_arcade_bg.webp": ("fighter/stages/arcade_near.png", (320, 0, 1280, 640), (540, 360)),
    "pv_spark.webp": ("vfx/fighter_hit_heavy.png", None, (512, 512)),
}
# Only the fighter cells the brawler loop plays: idle 0-3, walk 4-7, heavy punch 24-27, hit 36,
# knockdown 38, downed 39, win 42-43 (FIGHTER_CELLS in the game's data/fighterMoves.ts). Packed 9 x 2 at 128.
PREVIEW_FIGHTER_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 24, 25, 26, 27, 36, 38, 39, 42, 43]


def build_previews() -> None:
    for name, (file, (x0, y0, x1, y1), scale) in PREVIEW_BACKGROUNDS.items():
        f = src(PREVIEW_SRC / file)
        if not f:
            continue
        im = Image.open(f).convert("RGB").crop((round(x0 * PT), round(y0 * PT), round(x1 * PT), round(y1 * PT)))
        if scale != 1:
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        im.save(ORDER_OUT / name, "WEBP", quality=78, method=6)
    for name, (rel, box, size) in PREVIEW_SPRITES.items():
        f = src(GAME / rel)
        if not f:
            continue
        im = Image.open(f)
        im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
        if box:
            im = im.crop(box)
        im.resize(size, Image.LANCZOS).save(ORDER_OUT / name, "WEBP", quality=82, method=6)
    for sid in ("rico", "seb"):
        f = src(GAME / "fighter" / f"{sid}_fighter_runtime.png")
        if not f:
            continue
        sheet = Image.open(f).convert("RGBA")
        atlas = Image.new("RGBA", (9 * 128, 2 * 128))
        for i, cell in enumerate(PREVIEW_FIGHTER_CELLS):
            c = sheet.crop(((cell % 8) * 256, (cell // 8) * 256, (cell % 8 + 1) * 256, (cell // 8 + 1) * 256))
            atlas.paste(c.resize((128, 128), Image.LANCZOS), ((i % 9) * 128, (i // 9) * 128))
        atlas.save(ORDER_OUT / f"pv_{sid}_fighter.webp", "WEBP", quality=82, method=6)


# Plan 18 (beach tour): the bonus's example item icons, and the end-of-tour showcase's blackjack cards and whole
# kart circuit. Cards are Kenney's CC0 pack from the game's shared minigame deck (64 px pixel art, kept as is).
PERK_ITEMS = ["vortes_magazine", "moped_keys", "key_card", "wristband", "bucket_hat", "lucky_euro", "designer_shades",
              "sangria_bucket", "strong_coffee", "map"]
SHOWCASE_CARDS = [("spades", "10"), ("hearts", "6"), ("clubs", "9"), ("hearts", "K"), ("diamonds", "7"),
                  ("clubs", "5"), ("diamonds", "6"), ("hearts", "10"), ("spades", "A"), ("clubs", "8")]


def build_showcase() -> None:
    for name in PERK_ITEMS:
        f = src(GAME / "items" / f"{name}.png")
        if f:
            im = Image.open(f).convert("RGBA")
            im.thumbnail((96, 96), Image.LANCZOS)
            im.save(ORDER_OUT / f"item_{name}.webp", "WEBP", quality=90, method=6)
    deck = GAME / "minigames" / "cards"
    for suit, rank in SHOWCASE_CARDS:
        f = src(deck / "cards" / suit / f"{rank}.png")
        if f:
            Image.open(f).convert("RGBA").save(ORDER_OUT / f"card_{suit}_{rank}.webp", "WEBP", lossless=True)
    f = src(deck / "backs" / "default.png")
    if f:
        Image.open(f).convert("RGBA").save(ORDER_OUT / "card_back.webp", "WEBP", lossless=True)
    f = src(PREVIEW_SRC / "kart_track.png")
    if f:
        im = Image.open(f).convert("RGB")
        im.resize((im.width // 2, im.height // 2), Image.LANCZOS).save(ORDER_OUT / "pv_kart_full.webp", "WEBP", quality=74, method=6)


def main() -> int:
    for folder in (OUT, ORDER_OUT):
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob("*"):
            old.unlink()
    build_squad()
    build_world()
    build_order_art()
    build_section_art()
    build_previews()
    build_showcase()
    build_share_image()
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import build_couple_ads  # the home page's "For two?" card (plan 19); the 4:5 ads it also writes live in public/brand
    errors.extend(build_couple_ads.build_card())
    import build_order_loops  # the order page's looping previews (loop_*), see that file
    errors.extend(build_order_loops.build())
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
