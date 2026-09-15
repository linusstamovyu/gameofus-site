#!/usr/bin/env python3
"""Deploy the regenerated outfit walk sheets to public/worlds/.

Source: source/outfits/recut/<who>_walk_<world>.png (1152x256, 9 cells, transparent), made by
tools/recut_outfit_sheets.py from the raw strips. regenerated-simple is the old, damaged cut; don't deploy it.
The handoff calls the space world "mars"; the site's theme id is "space".
The beach world has NO dressed sheet: the squad walks the beach in their own clothes, so any old
<who>_walk_beach.webp is removed. Replaces the accessory sheets tools/dress_walk_sheet.py drew.

    python3 tools/deploy_regenerated_outfits.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

SITE = Path(__file__).resolve().parent.parent
SRC = SITE / "source" / "outfits" / "recut"
OUT = SITE / "public" / "worlds"
SQUAD = ["rico", "kai", "elias", "ethan", "nala", "coco"]
WORLDS = {"space": "mars", "neon": "neon", "jungle": "jungle", "ski": "ski", "fairy": "fairy"}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    missing = []
    for who in SQUAD:
        for world, name in WORLDS.items():
            f = SRC / f"{who}_walk_{name}.png"
            if not f.exists():
                missing.append(f)
                continue
            im = Image.open(f).convert("RGBA")
            if im.size != (1152, 256):
                missing.append(f"{f} is {im.size}, expected (1152, 256)")
                continue
            im.save(OUT / f"{who}_walk_{world}.webp", "WEBP", quality=90, method=6)
    for old in OUT.glob("*_walk_beach.webp"):
        old.unlink()
    for m in missing:
        print("ERROR:", m)
    print(f"{len(list(OUT.glob('*.webp')))} sheets in public/worlds")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
