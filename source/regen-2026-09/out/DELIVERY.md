# Asset delivery

> **Cut and deployed, 19 September 2026.** Verified independently: 145 unique files listed here, 145 on
> disk, an exact match — the "146 of 146" below double-counts one line, and the brief asks for 145. All of them
> decode. Cut by `tools/cut_regen_2026_09.py` into `source/outfits/recut/`, then deployed by
> `deploy_regenerated_outfits.py` (25 world sheets) and `build_site_assets.build_squad()` (5 beach sheets).
>
> The **39 right-facing rows are deliberately not cut**: the site's sheet is nine cells and draws right by
> mirroring left, so using them needs a 12-cell format. Compared side by side the mirror reads better, and
> Elias's real right row has no microphone in its idle cell — the one cell an NPC ever draws.
>
> Two faults were found on the way in and fixed in the cutter rather than the art: **Rico's 32 sheets are on
> a flat black card with no alpha** (key only pure black connected to the border — a looser threshold eats
> his outline and soles), and **every per-facing PNG carries a lump of the atlas row below under the
> figure's feet**, big enough to clear a 2% speck filter and to drag the bounding box down so the fitter
> reads it as the feet. Elias's neon microphone is missing from his step frames; the site never draws those
> for an NPC, so it ships as-is.

Completed: **146 of 146 requested image files**. No jobs were skipped. All output files decode successfully. No source references, site code, or deployed assets were changed.

## Verification

| Check | Result | Evidence |
|---|---:|---|
| Total requested files | Pass | 146/146 |
| Rico full body ≥1024px tall | Pass | (916, 1717) |
| 11-photo-retouch/rico.png matches input dimensions | Pass | (1179, 2556) |
| 11-photo-retouch/ethan.jpg matches input dimensions | Pass | (1046, 2249) |
| 12-portrait-edges/rico_face.png square ≥512 | Pass | 1254×1254 |
| 12-portrait-edges/nala_face.png square ≥512 | Pass | 1254×1254 |
| 09-talking-face/talk_rest.png square ≥512 | Pass | 1254×1254 |
| 09-talking-face/talk_open.png square ≥512 | Pass | 1254×1254 |
| Christmas card ≥1536px wide and 3:2 | Pass | 1536×1024 |
| Transparent/pure-black asset corners | Pass | All non-photo/non-scene asset corners are transparent or pure black |
| Talking pair differs only within mouth region | Pass | After shared margin scaling, diff bbox 531,753–732,860 |

## Files produced

### 01-rico-fullbody

- `01-rico-fullbody/rico_fullbody.png`

### 02-ethan-walk

- `02-ethan-walk/ethan_walk_beach_down.png`
- `02-ethan-walk/ethan_walk_beach_left.png`
- `02-ethan-walk/ethan_walk_beach_right.png`
- `02-ethan-walk/ethan_walk_beach_up.png`

### 03-elias-walk

- `03-elias-walk/elias_walk_beach_down.png`
- `03-elias-walk/elias_walk_beach_left.png`
- `03-elias-walk/elias_walk_beach_right.png`
- `03-elias-walk/elias_walk_beach_up.png`

### 04-coco-walk

- `04-coco-walk/coco_walk_beach_down.png`
- `04-coco-walk/coco_walk_beach_left.png`
- `04-coco-walk/coco_walk_beach_right.png`
- `04-coco-walk/coco_walk_beach_up.png`

### 05-kai-walk

- `05-kai-walk/kai_walk_beach_down.png`
- `05-kai-walk/kai_walk_beach_left.png`
- `05-kai-walk/kai_walk_beach_right.png`
- `05-kai-walk/kai_walk_beach_up.png`

### 06-rico-walk

- `06-rico-walk/rico_build_down.png`
- `06-rico-walk/rico_build_left.png`
- `06-rico-walk/rico_build_right.png`
- `06-rico-walk/rico_build_up.png`
- `06-rico-walk/rico_run_down.png`
- `06-rico-walk/rico_run_left.png`
- `06-rico-walk/rico_run_right.png`
- `06-rico-walk/rico_run_up.png`
- `06-rico-walk/rico_walk_beach_down.png`
- `06-rico-walk/rico_walk_beach_left.png`
- `06-rico-walk/rico_walk_beach_right.png`
- `06-rico-walk/rico_walk_beach_up.png`

### 07-world-outfits

- `07-world-outfits/coco_walk_fairy_down.png`
- `07-world-outfits/coco_walk_fairy_left.png`
- `07-world-outfits/coco_walk_fairy_right.png`
- `07-world-outfits/coco_walk_fairy_up.png`
- `07-world-outfits/coco_walk_jungle_down.png`
- `07-world-outfits/coco_walk_jungle_left.png`
- `07-world-outfits/coco_walk_jungle_right.png`
- `07-world-outfits/coco_walk_jungle_up.png`
- `07-world-outfits/coco_walk_mars_down.png`
- `07-world-outfits/coco_walk_mars_left.png`
- `07-world-outfits/coco_walk_mars_right.png`
- `07-world-outfits/coco_walk_mars_up.png`
- `07-world-outfits/coco_walk_neon_down.png`
- `07-world-outfits/coco_walk_neon_left.png`
- `07-world-outfits/coco_walk_neon_right.png`
- `07-world-outfits/coco_walk_neon_up.png`
- `07-world-outfits/coco_walk_ski_down.png`
- `07-world-outfits/coco_walk_ski_left.png`
- `07-world-outfits/coco_walk_ski_right.png`
- `07-world-outfits/coco_walk_ski_up.png`
- `07-world-outfits/elias_walk_fairy_down.png`
- `07-world-outfits/elias_walk_fairy_left.png`
- `07-world-outfits/elias_walk_fairy_right.png`
- `07-world-outfits/elias_walk_fairy_up.png`
- `07-world-outfits/elias_walk_jungle_down.png`
- `07-world-outfits/elias_walk_jungle_left.png`
- `07-world-outfits/elias_walk_jungle_right.png`
- `07-world-outfits/elias_walk_jungle_up.png`
- `07-world-outfits/elias_walk_mars_down.png`
- `07-world-outfits/elias_walk_mars_left.png`
- `07-world-outfits/elias_walk_mars_right.png`
- `07-world-outfits/elias_walk_mars_up.png`
- `07-world-outfits/elias_walk_neon_down.png`
- `07-world-outfits/elias_walk_neon_left.png`
- `07-world-outfits/elias_walk_neon_right.png`
- `07-world-outfits/elias_walk_neon_up.png`
- `07-world-outfits/elias_walk_ski_down.png`
- `07-world-outfits/elias_walk_ski_left.png`
- `07-world-outfits/elias_walk_ski_right.png`
- `07-world-outfits/elias_walk_ski_up.png`
- `07-world-outfits/ethan_walk_fairy_down.png`
- `07-world-outfits/ethan_walk_fairy_left.png`
- `07-world-outfits/ethan_walk_fairy_right.png`
- `07-world-outfits/ethan_walk_fairy_up.png`
- `07-world-outfits/ethan_walk_jungle_down.png`
- `07-world-outfits/ethan_walk_jungle_left.png`
- `07-world-outfits/ethan_walk_jungle_right.png`
- `07-world-outfits/ethan_walk_jungle_up.png`
- `07-world-outfits/ethan_walk_mars_down.png`
- `07-world-outfits/ethan_walk_mars_left.png`
- `07-world-outfits/ethan_walk_mars_right.png`
- `07-world-outfits/ethan_walk_mars_up.png`
- `07-world-outfits/ethan_walk_neon_down.png`
- `07-world-outfits/ethan_walk_neon_left.png`
- `07-world-outfits/ethan_walk_neon_right.png`
- `07-world-outfits/ethan_walk_neon_up.png`
- `07-world-outfits/ethan_walk_ski_down.png`
- `07-world-outfits/ethan_walk_ski_left.png`
- `07-world-outfits/ethan_walk_ski_right.png`
- `07-world-outfits/ethan_walk_ski_up.png`
- `07-world-outfits/kai_walk_fairy_down.png`
- `07-world-outfits/kai_walk_fairy_left.png`
- `07-world-outfits/kai_walk_fairy_right.png`
- `07-world-outfits/kai_walk_fairy_up.png`
- `07-world-outfits/kai_walk_jungle_down.png`
- `07-world-outfits/kai_walk_jungle_left.png`
- `07-world-outfits/kai_walk_jungle_right.png`
- `07-world-outfits/kai_walk_jungle_up.png`
- `07-world-outfits/kai_walk_mars_down.png`
- `07-world-outfits/kai_walk_mars_left.png`
- `07-world-outfits/kai_walk_mars_right.png`
- `07-world-outfits/kai_walk_mars_up.png`
- `07-world-outfits/kai_walk_neon_down.png`
- `07-world-outfits/kai_walk_neon_left.png`
- `07-world-outfits/kai_walk_neon_right.png`
- `07-world-outfits/kai_walk_neon_up.png`
- `07-world-outfits/kai_walk_ski_down.png`
- `07-world-outfits/kai_walk_ski_left.png`
- `07-world-outfits/kai_walk_ski_right.png`
- `07-world-outfits/kai_walk_ski_up.png`
- `07-world-outfits/rico_walk_fairy_down.png`
- `07-world-outfits/rico_walk_fairy_left.png`
- `07-world-outfits/rico_walk_fairy_right.png`
- `07-world-outfits/rico_walk_fairy_up.png`
- `07-world-outfits/rico_walk_jungle_down.png`
- `07-world-outfits/rico_walk_jungle_left.png`
- `07-world-outfits/rico_walk_jungle_right.png`
- `07-world-outfits/rico_walk_jungle_up.png`
- `07-world-outfits/rico_walk_mars_down.png`
- `07-world-outfits/rico_walk_mars_left.png`
- `07-world-outfits/rico_walk_mars_right.png`
- `07-world-outfits/rico_walk_mars_up.png`
- `07-world-outfits/rico_walk_neon_down.png`
- `07-world-outfits/rico_walk_neon_left.png`
- `07-world-outfits/rico_walk_neon_right.png`
- `07-world-outfits/rico_walk_neon_up.png`
- `07-world-outfits/rico_walk_ski_down.png`
- `07-world-outfits/rico_walk_ski_left.png`
- `07-world-outfits/rico_walk_ski_right.png`
- `07-world-outfits/rico_walk_ski_up.png`

### 08-nala-right

- `08-nala-right/nala_walk_beach_right.png`
- `08-nala-right/nala_walk_fairy_right.png`
- `08-nala-right/nala_walk_jungle_right.png`
- `08-nala-right/nala_walk_mars_right.png`
- `08-nala-right/nala_walk_neon_right.png`
- `08-nala-right/nala_walk_ski_right.png`

### 09-talking-face

- `09-talking-face/talk_open.png`
- `09-talking-face/talk_rest.png`

### 10-chaser

- `10-chaser/chaser_walk_down.png`
- `10-chaser/chaser_walk_left.png`
- `10-chaser/chaser_walk_right.png`
- `10-chaser/chaser_walk_up.png`

### 11-photo-retouch

- `11-photo-retouch/ethan.jpg`
- `11-photo-retouch/rico.png`

### 12-portrait-edges

- `12-portrait-edges/nala_face.png`
- `12-portrait-edges/rico_face.png`

### 13-christmas-card

- `13-christmas-card/occ_christmas.png`

## Visual review notes

- The generated sprite sheets have the requested four directions, including independently generated right-facing rows. Image generation is nondeterministic, so one-sided accessories should receive a final in-game animation review before deployment.
- Rico: the ski rows were regenerated so the skis sit lower on his back. Some step A/B poses across the Rico sheets remain visually similar.
- Ethan: Jungle uses long trousers throughout; Ski keeps skis visible in side profiles; Fairy keeps the lute in profile. The generated Jungle, Ski, and Fairy rows have subtle dark or colored fringe pixels around some outlines.
- Elias: the generated hair reads dark brown but can appear lighter than the requested near-black. The microphone shifts or is omitted in some generated poses, and some world edges retain faint fringe pixels.
- Coco: Mars was regenerated with her hair enclosed by the helmet; Neon was regenerated with the correct black and cyan outfit. Bag placement varies in a few poses, especially the beach left profile.
- Kai: Mars was regenerated with the yellow astronaut suit. Watch visibility and exact wrist placement vary in some profile poses.
- Nala: all six right-facing rows contain three uncropped poses. The expanded portrait closely matches the reference, but its face is regenerated rather than pixel-identical.
- Talking face: the final open-mouth file was composited from the closed portrait so all changed pixels are confined to the mouth region. The mouth region itself includes the intended open lips, dark cavity, teeth and tongue.
- Christmas card: the scene contains exactly Rico, Kai, Elias, Ethan, Coco and Nala, with five people and one pug.

## Generation method and prompt set

Built-in image generation was used. Each character scope used the matching full-body, portrait, photo and current-sheet references. The prompts consistently required polished pixel art, three frames per direction, independently drawn right profiles, shared scale and ground line, transparent or pure-black backgrounds, stable body-side details, and no brands, logos or readable clothing text. World prompts additionally locked each existing world outfit and the job-specific fixes. Photo prompts were limited to red-eye removal for Rico and arm removal/background reconstruction for Ethan. Portrait prompts extended the canvas while preserving the subject. The talking portrait used an identity-preserving closed portrait followed by a mouth-only compositing pass.
