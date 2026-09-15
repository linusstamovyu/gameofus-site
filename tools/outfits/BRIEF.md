# Outfit accessories brief (shared by every world's outfit agent)

Goal: in each world the five squad members keep their own look but wear gear for that world. We do NOT repaint
anyone's clothes (Codex will regenerate full outfits later); a script draws accessories ONTO the existing walk
sheets. Rico's space helmet (`tools/outfits/space.py`) is the approved proof of concept — match or beat its quality.

## How it works
- `python3 tools/dress_walk_sheet.py <world> [lads] --contact <out.png>` writes `public/worlds/<lad>_walk_<world>.webp`
  (9 cells: down idle/stepA/stepB, up ×3, left ×3; the site mirrors left for right) and a contact sheet.
- `tools/outfits/common.py` (DO NOT EDIT) measures each cell into a `Cell`: top/bot of the figure, neck (chin),
  waist, feet, eye line, head centre and extents, body extents, facing, step (for swinging capes/scarves), `pet`
  (Nala the pug), plus `LAD_COLOR` per lad and `HAS_GLASSES` (Elias and Ethan already wear sunglasses).
- Your file `tools/outfits/<world>.py` exports `behind(d, c, s)` (drawn under the sprite: packs, capes, skis) and
  `front(d, c, s)` (over it: hats, visors, straps). `d` is a PIL ImageDraw on an 8x supersampled cell; draw in native
  cell pixels × `s`. RGBA fills work; keep a dark outline (`INK`) on pieces so they match the pixel art.

## Quality bar
1. **The lad is still himself.** Never cover the face (eyes, mouth). Helmets are clear glass; hats sit on the hair.
2. **Fits every frame.** Check all 9 cells for all 5 lads: nothing floating off the head, nothing clipped, pieces
   follow the head/body as it bobs, straps and packs switch sides correctly for down / up / left.
3. **Reads at game size.** The site draws a lad about 48px wide. Bold shapes, 2–4 colours, a clean outline. Tiny
   detail is fine only on top of a clear silhouette.
4. **Each lad is distinct** where the draft says so (use `LAD_COLOR`).
5. **Nala gets a pet-sized version** on her own head/body (she is a pug; her head is most of her front view).
6. **Matches the world's palette** (look at the world in the lab) and the style of the pixel sprites.
7. **Clean content:** no logos, brands or real text.

## Rules
- Touch ONLY `tools/outfits/<world>.py` and the 5 files it outputs. Other agents are doing other worlds in parallel.
- Look at your work: Read the contact sheet, and crop/zoom it (PIL) to inspect individual frames at 4x. Also shoot the
  world with `tools/shoot_world.sh <world> 2 <out.png>` (dev server is on :5391) to see the lads in context (the lab
  draws them facing down). Iterate until every point above is a 4/5 or better.
- Final reply, 5–8 lines: what each lad wears, self-scores, anything you could not get right, the contact sheet path.
