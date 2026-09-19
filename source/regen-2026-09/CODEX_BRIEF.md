# Codex brief: character art to regenerate for the Game of Us site (Sept 2026)

This is the one brief for every character asset that needs remaking. It comes from an audit of every character image
the Game of Us website uses. Work through the jobs in order: some jobs depend on earlier ones (noted per job).

**Only generate images.** Don't edit code, don't overwrite any existing file, and don't deploy anything. Save every
output into the `out/` folder given below. The site's own tools key the background, cut, scale and deploy.

- **Brief folder:** `/Users/linusstamovyu/Downloads/Frokost Pokemon/gameofus-site/source/regen-2026-09/`
- **References:** `…/source/regen-2026-09/refs/` (listed per job)
- **Save outputs to:** `…/source/regen-2026-09/out/<job id>/` using exactly the filenames given

---

## Rules for every job

**Identity and outfit stay one to one.** Unless a job says otherwise, the face, hair, skin tone, body proportions,
height and every piece of clothing and its colours match the character's reference images exactly. When references
disagree, the job says which one wins.

**Style.** The same polished pixel art as the current sheets: same outline weight, shading, palette depth and
level of detail. Don't make it smoother, more painterly or more detailed than the frames around it.

**No brands, no logos, no real products, no drugs, no alcohol labels.** Plain unbranded shoes (no coloured sole
plugs or three stripes), no readable text on clothing, no characters from existing games or films.

**One-sided details stay on the same side of the body in every frame.** A stripe on the right chest is on the right
chest when he faces you, on the far side when he faces left, and on the near side when he faces right. This is the
single most common fault in the current art. Check it on every frame before saving.

**Feet.** Both feet on one shared ground line in every frame. In side views the figure's feet are centred
horizontally, so turning left or right doesn't make the character hop sideways.

### How to deliver a walk sheet

A walk sheet has 4 facings with 3 frames each:

| Row | Frames, in order | Filename suffix |
|---|---|---|
| Down (facing the camera) | idle, step A, step B | `_down.png` |
| Up (back to the camera) | idle, step A, step B | `_up.png` |
| Left (true side profile, facing screen-left) | idle, step A, step B | `_left.png` |
| **Right** (true side profile, facing screen-right) | idle, step A, step B | `_right.png` |

The **right row is new**. Today the site mirrors the left row to fake it, which puts one-sided details on the wrong
side. Draw it as its own pose, **never as a mirror of the left row**.

- **Idle:** standing still, legs straight, feet together, arms relaxed at the sides.
- **Step A / B:** the two contact poses of a normal walk. A heel-to-toe stride with both feet near the ground, the
  opposite arm swinging, and a slight up-down bob. Step B uses the other leg forward to step A.
- **One PNG per row:** the 3 figures side by side, left to right in the order above, with a wide empty gap between
  them.
  - Background is pure black `#000000` (every background pixel exactly 0,0,0; no floor, shadow or glow), or real
    transparency.
  - Every figure is full body and uncropped, all at the same scale, standing on the same ground line.
  - Any size, around 1536 × 1024 per row is fine.

---

## Job list

| Job | Character | What | Depends on | Priority |
|---|---|---|---|---|
| `01-rico-fullbody` | Rico | Full-body art without the bong | — | Must |
| `02-ethan-walk` | Ethan | Beach walk sheet, jacket consistent | — | Must |
| `03-elias-walk` | Elias | Beach walk sheet, new gait and face | — | Must |
| `04-coco-walk` | Coco | Beach walk sheet, bag fixed | — | Should |
| `05-kai-walk` | Kai | Beach walk sheet, watch and far arm | — | Should |
| `06-rico-walk` | Rico | Beach walk, run and build sheets, hair matched | 01 | Should |
| `07-world-outfits` | All but Nala | 25 world outfit sheets | 02–06 | Must for Elias, should for the rest |
| `08-nala-right` | Nala | Right-facing rows only | — | Minor |
| `09-talking-face` | Order page character | Mouth closed / open pair | — | Should |
| `10-chaser` | Order page chaser | Original chaser design, walk sheet | — | Should |
| `11-photo-retouch` | Rico, Ethan | Retouch two real photos | — | Should |
| `12-portrait-edges` | Rico, Nala | Portraits not cut off at the edges | — | Minor |
| `13-christmas-card` | Squad | Christmas occasion card with the real squad | 06 | Minor |

---

## 01-rico-fullbody (must)

**Why:** Rico's full-body art shows him holding a glass bong. It's going on the homepage's first screen at large
size. His trainers also look like Adidas NMDs.

**References** (`refs/rico/`)
- `rico_fullbody.png`: pose, face, hoodie, cargo shorts and socks to keep. The bong is the thing to remove.
- `rico_selection3d.png`: the same art (it has the bong too).
- `rico_portrait.png`: his face; this wins on the face.
- `rico_photo_full.png`: the real person, for likeness.

**Make**
- The same pose, outfit and face with **an empty right hand**: hand relaxed at his side, or a thumbs-up, or holding
  a phone.
- Plain unbranded dark trainers.
- **Full length:** head to shoes, nothing cropped.
- Background is pure black or transparent, and he stands facing slightly screen-left as now.

**Save:** `out/01-rico-fullbody/rico_fullbody.png`, at least 1024 px tall.

---

## 02-ethan-walk (must)

**Why:** his jacket's gold/white stripe and chest crest swap sides between frames.
- **Front:** frame 2 is a mirror image of frames 0 and 1.
- **Back:** frame 3 curves one way and frames 4 and 5 the other.
- **Side:** the chain at his hip is missing from the standing frame.

**References** (`refs/ethan/`)
- `ethan_fullbody.png`: **the reference for the jacket.** The stripe is on his right chest (screen-left when he
  faces you), the crest on his left chest.
- `ethan_walk_beach_current_2x.png`: the current sheet. Frames 0 and 1 are right, frame 2 is wrong. The bottom row
  shows the mirrored right-facing frames the site draws today, which are wrong.
- `ethan_portrait.png`, `ethan_photo_headshot.webp`: face.

**Make:** a full walk sheet (4 rows, see "How to deliver a walk sheet").
- Every front frame: stripe on his right chest, crest on his left chest.
- Every back frame: the back stripe curving the same way.
- **Left row:** we see his left side, so the crest side.
- **Right row:** we see his right side, so the stripe side.
- The hip chain in every side frame.

**Save:** `out/02-ethan-walk/ethan_walk_beach_down.png`, `_up.png`, `_left.png`, `_right.png`

---

## 03-elias-walk (must)

**Why:** his walk is a stiff high-knee march on the spot. One knee comes up to belt height, a boot floats, and the
forearm is stuck at the same angle in every side frame. His face is a tiny blank doll face with no nose, mouth, chin
or neck, and the hair is lighter than the real person's.

**References** (`refs/elias/`)
- `elias_walk_beach_current_2x.png`: the current sheet. Keep the outfit and hairstyle; replace the gait and face.
- `elias_portrait.png`, `elias_fullbody.png`, `elias_selection3d.png`: outfit and mic.
- `elias_photo_headshot.webp`, `elias_photo_full.png`: likeness. **The photo wins on hair colour:** near-black brown.

**Make:** a full walk sheet (4 rows).
- A normal walk cycle as in the rules. No raised knees, both feet near the ground.
- **Face** at the same size and detail as Kai's and Ethan's: nose, mouth and chin readable, sunglasses at eye height.
- A short visible neck.
- Near-black brown hair.
- The mic held low in his **right** hand in every frame, on the correct side in both the left and right rows.
- **No text on his top** (the current art reads "LOST WITHIN"). Plain black top.

**Save:** `out/03-elias-walk/elias_walk_beach_down.png`, `_up.png`, `_left.png`, `_right.png`

---

## 04-coco-walk (should)

**Why:** in the front view and the full body, the star bag hangs from her right shoulder. In the left-facing frames
it's drawn on the near (left) side, and it moves from the back hip to the front hip between frames. Her feet sit off
centre, so she hops sideways about a quarter of a tile when she turns.

**References** (`refs/coco/`)
- `coco_fullbody.png`: bag on her right shoulder. This is the reference.
- `coco_walk_beach_current_2x.png`: the current sheet.
- `coco_portrait.png`, `coco_photo_headshot.webp`: face.

**Make:** a full walk sheet (4 rows).
- **Left row:** strap over her far (right) shoulder, bag hanging behind her hip, in the same place in all three frames.
- **Right row:** bag on the near side, same place in all three frames.
- Feet centred in every side frame.

**Save:** `out/04-coco-walk/coco_walk_beach_down.png`, `_up.png`, `_left.png`, `_right.png`

---

## 05-kai-walk (should)

**Why:** his watch is on his left wrist but is missing from back step frames 4 and 5. In the side step frames his far
arm is a flat tan block. The right-facing view (currently a mirror) puts the watch on the wrong wrist.

**References** (`refs/kai/`)
- `kai_walk_beach_current_2x.png`: the current sheet; keep everything else.
- `kai_fullbody.png`, `kai_portrait.png`, `kai_photo_headshot.webp`.

**Make:** a full walk sheet (4 rows).
- Watch on his **left** wrist in every frame where that wrist is visible, including back frames 4 and 5.
- **Right row:** watch on the far wrist.
- A readable far arm (shaded arm shape, not a flat block) in all side steps.

**Save:** `out/05-kai-walk/kai_walk_beach_down.png`, `_up.png`, `_left.png`, `_right.png`

---

## 06-rico-walk (should, after 01)

**Why:** Rico is the character people play on the homepage. His walk sprite has an upright spiky tuft of dark
red-brown hair. His photo, portrait and full body all show loose, swept, wavy mid-brown hair. In the front step
frames a fist is raised to chest height, which reads as punching.

**References** (`refs/rico/`)
- `rico_portrait.png` and `out/01-rico-fullbody/rico_fullbody.png` (from job 01): **these win on hair shape and
  colour.**
- `rico_photo_headshot.webp`, `rico_photo_full.png`: likeness.
- `rico_walk_beach_current_2x.png`, `rico_run_current_2x.png`, `rico_walk_build_current_2x.png`: the three current
  sheets. Keep the outfit, gear and poses; change the hair and the front arm swing.

**Make:** three sheets, 4 rows each.
1. **Walk:** arms swinging low in the front view, never raised.
2. **Run:** the same rows as the current run sheet, plus a right row.
3. **Build walk:** carrying the blueprint and pencil as now. **Right row:** blueprint and pencil in the same hands as
   in the left row's matching body side (don't swap hands).

**Save:**
- `out/06-rico-walk/rico_walk_beach_{down,up,left,right}.png`
- `out/06-rico-walk/rico_run_{down,up,left,right}.png`
- `out/06-rico-walk/rico_build_{down,up,left,right}.png`

---

## 07-world-outfits (after 02–06)

The site lets you view the squad in five other worlds: `mars` (space base), `neon` (neon city), `jungle`, `ski`
(ski village) and `fairy` (fairy-tale kingdom). Each character has a dressed walk sheet per world.

**Rebuild each one on top of that character's new beach sheet** from jobs 02–06, same outfit design as the current
world sheet. Kai, Coco and Ethan keep their current world outfits. Rico and Elias get the fixes from their jobs
carried into every world.

**References** (`refs/<character>/`): `<character>_walk_<world>_current_2x.png` for the outfit; the new beach sheet
for identity, gait and one-sided details.

**All sheets**
- Four rows, including a real right row.
- Gear carried on one side (satchels, holsters, rope coils, skis, lutes, wands) stays on the same side of the body in
  the front, back, left and right rows. It must not swap sides of the body between the front and back views.
- **Clean edges:** no red, green or magenta fringe around the outline. The current world sheets all have a thin red
  halo.
- Feet centred in side frames.

**Per character**

| Sheet | Fix on top of the rules above |
|---|---|
| `elias_walk_{mars,neon,jungle,ski,fairy}` | **Must.** New gait and face from job 03 in every world. In fairy his long robe hangs straight when standing and moves with the stride when walking. |
| `rico_walk_{mars,neon,jungle,ski,fairy}` | Hair from job 06 in every world (it currently changes between worlds). **Neon:** glasses in every frame or none. **Ski:** skis carried on his back or shoulder so they don't stick up either side of his head like ears. |
| `ethan_walk_{mars,neon,jungle,ski,fairy}` | Jacket rules from job 02 wherever the jacket shows. **Jungle:** long trousers in every frame (the standing side frame currently wears shorts). **Ski:** skis on his back in the side frames too. **Fairy:** the lute on his back visible in profile. |
| `coco_walk_{mars,neon,jungle,ski,fairy}` | Bag rules from job 04. **Mars:** her hair fully inside the helmet, not passing out through the glass. |
| `kai_walk_{mars,neon,jungle,ski,fairy}` | Watch rules from job 05. **Jungle and ski:** rope coil and skis on the same side of his body front and back. |

**Save:** `out/07-world-outfits/<character>_walk_<world>_{down,up,left,right}.png`, for example
`out/07-world-outfits/elias_walk_fairy_left.png`.

---

## 08-nala-right (minor)

**Why:** Nala (a pug) only needs a real right-facing row for consistency. Her mirrored side view is otherwise fine.

**References** (`refs/nala/`): `nala_walk_beach_current_2x.png` and `nala_walk_<world>_current_2x.png`.

**Make:** a right row only (idle, step A, step B) for the beach and each of the five worlds. Match the left row's
pose rhythm: standing on all four legs for idle, then two trotting steps. Tail curled up, tongue out.

**Save:** `out/08-nala-right/nala_walk_<beach|mars|neon|jungle|ski|fairy>_right.png`

---

## 09-talking-face (should)

**Why:** the order page's "talking face" extra uses a 120 px very blocky face (buzz cut, floral shirt) that is far
cruder than every other image on that page. It looks like a placeholder.

**References** (`refs/order-page/`)
- `loop_talk_rest.png`, `loop_talk_open.png`: the current pair. They set **who** it is and the head-and-shoulders
  framing.
- `loop_story_plate_1.webp` … `loop_story_plate_4.webp`, `loop_story_cut_1.webp`: the same character in the page's
  story art. **These set the style and likeness to match.**

**Make:** two head-and-shoulders portraits, identical in every pixel except the mouth.
1. Mouth closed, relaxed.
2. Mouth open mid-word: lips apart, a dark mouth cavity with the tongue visible.

Square, at least 512 × 512, transparent or pure black background, at the quality of `refs/rico/rico_portrait.png`.

**Save:** `out/09-talking-face/talk_rest.png`, `out/09-talking-face/talk_open.png`

---

## 10-chaser (should)

**Why:** the order page's chase-game preview uses a blond soldier with a green vest, bandana and pickaxe that looks
very close to Fortnite's Jonesy, on a page that also sells building ramps. His side frames are also shorter and
thinner than his front frames, so he shrinks when he runs sideways.

**References** (`refs/order-page/`)
- `jonesy_walk_current_2x.png`: the role only. **Don't copy the look.**
- `pv_rico_walk.webp`: the size and style to match. The chaser stands at the same height as Rico.

**Make:** an original chaser who reads as "the bloke who nicked the passports" on a lads' holiday. For example a
sunburnt lad in a loud patterned shirt and bucket hat, carrying a stack of passports. No military gear, no pickaxe,
no bandana, nothing resembling a character from any game. Full walk sheet (4 rows), the **same figure height in every
row**.

**Save:** `out/10-chaser/chaser_walk_{down,up,left,right}.png`

---

## 11-photo-retouch (should)

These are real photographs of real people. Retouch only: don't change faces, expressions or anything else.

**Rico**
- **Input:** `refs/rico/rico_photo_full.png`
- **Fix:** remove the red-eye in both eyes, so the pupils read as natural dark pupils.
- **Save:** `out/11-photo-retouch/rico.png`, at the same size as the input.

**Ethan**
- **Input:** `refs/ethan/ethan_photo_full.jpg`
- **Fix:** another person's arm is round his shoulders. Remove it and fill in his jacket and the background
  naturally.
- **Save:** `out/11-photo-retouch/ethan.jpg`, at the same size as the input.

---

## 12-portrait-edges (minor)

**Why:** two portraits are cut off by the edge of the image and look clipped when shown with a drop shadow.
- **Rico:** his hoodie is cut in a straight line at the right edge.
- **Nala:** both ears are cut off at the sides.

**References:** `refs/rico/rico_portrait.png`, `refs/nala/nala_portrait.png`

**Make:** the same portraits, pixel-identical in the face and styling, with the canvas extended so the hoodie ends
naturally at the bottom and both of Nala's ears are fully inside the frame. Transparent background, square, 512 × 512
or larger.

**Save:** `out/12-portrait-edges/rico_face.png`, `out/12-portrait-edges/nala_face.png`

---

## 13-christmas-card (minor, after 06)

**Why:** the Christmas occasion card shows six people, but three of them aren't in the squad the homepage has just
introduced.

**References**
- `refs/order-page/occ_christmas.webp`: the current card. Keep the composition, room, lighting and mood.
- `refs/<character>/<character>_fullbody.png` and `_portrait.png` for all six: Rico (use job 01's art), Kai, Elias,
  Ethan, Nala and Coco.

**Make:** the same scene with exactly those six, each matching their references. Nala is a pug. No drinks with labels
or brands in shot.

**Save:** `out/13-christmas-card/occ_christmas.png`, at the same aspect ratio as the current card, at least 1536 px
wide.

---

## Not in this brief

- **Red halo on the current world sheets:** the site's tools can re-key those. Job 07 replaces them anyway.
- **Owner decisions:**
  - `pv_caro.webp` (a real woman's photo on the sales page);
  - `occ_partner.webp` (Ethan and Coco shown as a couple);
  - two order-page story clips set in a red peep-show booth.
- **Game-side use:** the beach walk sheets on the site are cut from the main game's runtime sheets. Whether the new
  sheets also replace the game's own is a separate decision, made after they're delivered.

## Before you finish

Check every output against this list:

1. It is saved at the exact path and filename above.
2. The background is pure black or transparent, with nothing else in the image.
3. Every figure is uncropped, and all figures in one file share one scale and one ground line.
4. One-sided details are on the same side of the body in every frame, and the right row is drawn, not mirrored.
5. There are no brands, logos, readable text on clothing, drugs or alcohol labels.
6. Faces match the portrait and photo references.

Then write `out/DELIVERY.md` listing every file you produced, any job you skipped and why, and anything you weren't
sure about.
