"""The occasion doors' art: one illustration per occasion (plan 19), from source/occasions/.

Writes public/assets/occ_<id>.webp at 960x640. The file name is the occasion id, so the home page's tiles,
the for-two card and the builder's step-0 tiles all find it without a table.

    python3 tools/build_occasion_art.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source" / "occasions"
OUT = ROOT / "public" / "assets"

# The chosen take of each; the other takes stay in source/occasions/ for comparison.
PICKS = {
    "trip": "trip-feature-v1.png",
    "christmas": "christmas-feature-v2.png",   # v1's on-screen sprites don't match the lads on the sofa
    "birthday": "birthday-feature-v3.png",     # the birthday lad surrounded by the group, per the brief
    "partner": "partner-feature-v1.png",
}

for occ, name in PICKS.items():
    im = Image.open(SRC / name).convert("RGB").resize((960, 640), Image.LANCZOS)
    out = OUT / f"occ_{occ}.webp"
    im.save(out, "WEBP", quality=80, method=6)
    print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")
