# Re-request: 33 walk rows have the crown cut off

**What is wrong:** the delivery generated 4x3 atlases and sliced them into one PNG per facing. On 33 of
those files the slice went through the heads, so the row opens with the figure already touching y=0 and the
crown sheared flat. The pixels are not anywhere on disk — the atlases were not kept — so this cannot be
re-cut, only re-generated.

**Why it slipped through:** nothing about it is an error. The file is a valid PNG of a valid-looking figure;
the cut sheet gets its usual top margin, because the fitter is measuring a figure whose top merely happens
to be flat. It only shows on the drawn character. `tools/cut_regen_2026_09.py` now REFUSES a row whose
figure touches the top edge, so this cannot ship silently again.

## The rows to re-generate

Only `down`, `up` and `left` matter — the site's sheet is nine cells and draws right by mirroring left.

| file | missing crown |
|---|---|
| `06-rico-walk/rico_walk_beach_left.png` | ~4.7% of the figure |
| `07-world-outfits/rico_walk_jungle_left.png` | ~6.6% |
| `07-world-outfits/rico_walk_mars_left.png` | ~5.5% |
| `07-world-outfits/rico_walk_neon_left.png` | ~7.7% |
| `07-world-outfits/rico_walk_ski_left.png` | ~8.6% |
| `07-world-outfits/kai_walk_neon_left.png` | ~2.2% |
| `07-world-outfits/kai_walk_neon_up.png` | ~2.2% |
| `07-world-outfits/coco_walk_jungle_left.png` | ~7.2% |
| `07-world-outfits/coco_walk_mars_left.png` | ~4.4% |
| `07-world-outfits/coco_walk_ski_left.png` | ~4.4% |
| `07-world-outfits/ethan_walk_ski_left.png` | ~10.7% |

The `*_right.png` rows are clipped too and are NOT worth re-generating: the site never draws them.

**Which of these actually show in the game.** Only the PLAYER animates — every other character is drawn on
the down-idle cell alone. So Rico's five rows and Kai's two are the ones a visitor can see; Coco's and
Ethan's are invisible unless they ever become playable.

## Prompt line to add

> Leave clear space above the head. The top of the hair must sit at least 5% of the figure's height below
> the top edge of the image — do not let any part of the character touch or run off any edge of the frame.

## Meanwhile

The affected sheets are reverted to their previously committed versions, which have intact heads. Deploying
a regenerated row is `python3 tools/cut_regen_2026_09.py <who>:<world>` then
`python3 tools/deploy_regenerated_outfits.py` (worlds) or `build_site_assets.build_squad()` (beach).
