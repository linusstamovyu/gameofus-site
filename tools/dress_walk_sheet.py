#!/usr/bin/env python3
"""Dress the squad for a world by drawing accessories onto their walk sheets.

The lads' own art is never repainted: tools/outfits/common.py measures head, neck,
body and feet in each of the 9 walk cells, and tools/outfits/<world>.py draws
pieces BEHIND the sprite (packs, capes) and IN FRONT of it (hats, visors, straps).
Output: public/assets/<lad>_walk_<world>.webp, a 2x sheet in the same 9-cell
layout, used by the site for that world (src/world/outfits.ts).

    python3 tools/dress_walk_sheet.py space              # all five lads
    python3 tools/dress_walk_sheet.py space rico nala    # some
    python3 tools/dress_walk_sheet.py space --contact /path/to/check.png
"""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from outfits.common import LADS, SITE, contact, dress  # noqa: E402

WORLDS = ["beach", "space", "neon", "jungle", "ski", "fairy"]


def main(argv: list[str]) -> None:
    if not argv or argv[0] not in WORLDS:
        sys.exit(f"usage: dress_walk_sheet.py <{'|'.join(WORLDS)}> [lads...] [--contact out.png]")
    world, rest = argv[0], argv[1:]
    out = None
    if "--contact" in rest:
        i = rest.index("--contact"); out = Path(rest[i + 1]); rest = rest[:i] + rest[i + 2:]
    mod = importlib.import_module(f"outfits.{world}")
    for who in rest or LADS:
        print("wrote", dress(who, world, mod.behind, mod.front).relative_to(SITE))
    if out:
        print("contact sheet", contact(world, out))


if __name__ == "__main__":
    main(sys.argv[1:])
