#!/usr/bin/env python3
"""Deploy the minigame library's BUILT sandboxes into the site, to be played on the Explore page.

    python3 tools/deploy_minigame_demos.py

The twelve party minigames were twelve still posters on the Explore page: the one part of the catalogue a
visitor could not see working, while a tested, playable build of every one of them sits in the sibling
library. This copies those builds in so a card can open the real game.

Reads:  <library>/games/<id>/dist/
Writes: public/minigames/<id>/

It copies BYTES AND NOTHING ELSE, which is the same bargain Game/tools/sync_minigame_embeds.py strikes:
nothing about a game is reimplemented, rewritten or re-tuned here, so what a visitor plays is what Codex
built and tested. Two differences from the game's own deploy, both because a shop window is not a trip:

  * The bundled CC0 deck is KEPT. The game strips it because it already ships that deck once and "never a
    second deck" is a rule there; the site has no deck of its own, and a self-contained folder is what lets
    the iframe be a plain `src=` rather than a document assembled at mount time with a <base> in it.
  * Nothing is excluded for having a native handback. The game compiles tic-tac-toe and blackjack from
    source and must not also embed them; the site has no adapters at all, so every id is copied the same way.

The builds use relative asset paths (./assets/...), so a folder works wherever the site is served from.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

LIBRARY = Path("/Users/linusstamovyu/Downloads/Frokost Pokemon Minigames")
SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "public" / "minigames"
CATALOGUE = SITE / "src" / "order" / "catalogue.ts"


def fail(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def wanted_ids() -> list[str]:
    """The ids the site's own catalogue lists, so the deploy can never drift from the cards."""
    text = CATALOGUE.read_text()
    block = re.search(r"export const MINIGAMES: Minigame\[\] = \[(.*?)\n\];", text, re.S)
    if not block:
        fail(f"no MINIGAMES list in {CATALOGUE}")
    ids = re.findall(r'\{\s*id:\s*"([^"]+)"', block.group(1))
    if not ids:
        fail("MINIGAMES parsed but empty")
    return ids


def main() -> None:
    if not LIBRARY.exists():
        fail(f"the minigame library is not at {LIBRARY}")
    registry = json.loads((LIBRARY / "registry.json").read_text())
    known = {g["id"] for g in registry["games"]}

    ids = wanted_ids()
    missing = [i for i in ids if i not in known]
    if missing:
        fail(f"not in the library's registry: {', '.join(missing)}")

    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for gid in ids:
        src = LIBRARY / "games" / gid / "dist"
        if not (src / "index.html").exists():
            fail(f"{gid}: no built sandbox at {src} (build it in the library first)")
        dest = OUT / gid
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest)
        n = sum(1 for p in dest.rglob("*") if p.is_file())
        kb = sum(p.stat().st_size for p in dest.rglob("*") if p.is_file()) // 1024
        total += kb
        print(f"  {gid:<22} {n:>4} files  {kb:>5} KB")

    # Anything left over is a game the catalogue dropped: a folder nothing can reach.
    stale = [p.name for p in OUT.iterdir() if p.is_dir() and p.name not in ids]
    for name in stale:
        shutil.rmtree(OUT / name)
        print(f"  removed {name} (not in the catalogue any more)")

    print(f"{len(ids)} playable minigames in {OUT.relative_to(SITE)} ({total} KB)")


if __name__ == "__main__":
    main()
