# Character art: what needs regenerating

Audit of every character asset the Game of Us site uses, 16 Sep 2026. Read-only: nothing was edited or regenerated.
Every walk sheet was looked at cell by cell, enlarged, over a neutral grey, cream and sand, with the left-facing
cells next to their mirrored right-facing versions. The sheets were also measured (bounds, ground line, stray
pixels, key-colour edges).

## Must fix

| # | Asset | Problem | Where it shows |
|---|---|---|---|
| 1 | `public/lab/rico_fullbody.webp` (and its source `CharacterAssets/Rico/FullBody/rico_fullbody.png`, `Selection3D/rico_selection3d.png`) | Rico is holding a **bong** | Intro lab hero (`src/introLab.ts`). Everything in `public/` is copied into the build, so this file also goes live at `/lab/rico_fullbody.webp` even though no deployed page links to it |
| 2 | `public/assets/ethan_walk.webp` | The jacket's gold stripe and chest crest **swap sides between frames** in the front and back walk cycles, and again when he faces right | Homepage beach (Ethan turns to face you); the "Walking" strip in the intro lab. The owner has already spotted it |
| 3 | `public/assets/elias_walk.webp` and all five `public/worlds/elias_walk_*.webp` | The walk is a stiff **high-knee march**, the forearm stays stuck out in every frame, and the face is a tiny blank doll face | Homepage beach in all six worlds; any place he walks. The owner has already flagged it |
| 4 | Every walk sheet (all 36) | **Right-facing is the left row mirrored**, so anything one-sided swaps to the wrong side. It is worst on Ethan (see 2) and Coco (her bag), and minor for Kai (watch) | Every character that faces right on the beach; Rico and Kai walking right in the order page's "playing together" loop |

## Should fix

- **Red (and some green) key halo** around the figures in the world outfit sheets. The beach sheets are clean.
- **Rico's walk sprite hair** does not match his portrait, photo, full body, fighter sheet or occasion art. It also changes between worlds.
- **Ethan jungle**: the standing side frame wears shorts, but the walking frames wear long trousers.
- **Coco**: her bag moves to the wrong shoulder in profile, and she jumps sideways about a quarter of a tile when she turns.
- **Rico neon**: orange glasses appear in the side frames only.
- **Order page talking-face loop**: much cruder art than everything around it.
- **Jonesy chase sprite**: looks like Fortnite's Jonesy, and shrinks when he turns sideways.
- **`rico_photo.webp`**: the real photo has red-eye. This needs a retouch, not a regeneration.

Two things to check with the owner. They are not art faults:

- `pv_caro.webp` is a real photograph of a real woman.
- `occ_partner.webp` shows Ethan and Coco as a couple.

---

## How the site uses the walk sheets (affects how visible each flag is)

- **Rico is the player.** The homepage beach draws all 9 of his cells constantly.
- **The other five are standing NPCs.** On the homepage they only use their standing frames: front (cell 0), back
  (cell 3), left (cell 6) and the mirror of cell 6 for right. They turn to face Rico when he is within 4 tiles. Their
  step frames (1, 2, 4, 5, 7, 8) show up in only two places:
  - the intro lab's side-by-side "Walking" strip, which loops cells 1 and 2;
  - Kai's walk in the order page's "playing together" loop, which uses cells 6, 7 and 8 mirrored so he walks right.

  They will show everywhere these characters walk in the real product.
- **The world picker** swaps every sheet for its `public/worlds/<id>_walk_<world>.webp` version, with the same frame
  usage as above.
- **Several standing side frames (cell 6) were regenerated separately.** Those replacement frames are in
  `source/outfits/regen-requests/out` and are pasted in at build time. They are the frames most likely to disagree
  with the rest of their sheet (see Ethan jungle).

---

## Cross-cutting

### Mirrored right-facing cells (all characters)
- **Files:** all 6 `public/assets/*_walk.webp` and all 30 `public/worlds/*_walk_*.webp`.
- **What is wrong:** there is no right-facing art, so `drawCharacter` flips the left row. Any detail that belongs on
  one side of the body jumps to the other side when a character faces right. Per character:
  - **Ethan:** crest and stripe (must fix, see Ethan).
  - **Coco:** bag shoulder (should fix).
  - **Kai:** watch wrist (minor).
  - **Rico build pose:** blueprint and pencil swap hands (minor).
  - **Jungle, ski and fairy outfits:** satchels, holsters, rope coils and ski straps change sides.
- **Severity:** must fix for Ethan; should fix for Coco; minor elsewhere.
- **Ask for:** a real right-facing row (idle, step A, step B) for every sheet, drawn with the same one-sided details
  kept on the same side of the body. See the code note at the end.

### Key-colour halo on the world outfit sheets
- **Files:** `public/worlds/*_walk_{space,neon,jungle,ski,fairy}.webp`.
- **What is wrong:** a thin red, and sometimes yellow-green, fringe runs round the outline. The beach sheets have
  none. It shows most clearly on light world backgrounds. Worst sheets:
  - **Rico:** neon, ski, fairy.
  - **Ethan:** fairy (hat and feather), ski.
  - **Kai:** fairy, jungle (around the fists).
  - **Coco:** fairy (hair, with a green halo round the wand and boots), neon.
  - **Elias and Nala:** mild.
- **Severity:** should fix.
- **Ask for:** a clean despill/re-key of the outfit sheets. If they are regenerated anyway for other reasons, ask
  for a clean alpha edge with no coloured rim. This may not need new generation at all.

### Registration when turning left/right
- **Files:** most walk sheets.
- **What is wrong:** in the left idle frame the feet sit left of the cell's centre, so the mirrored right frame
  sits the same distance to the right. When a character turns, the sprite hops sideways. Measured hop, as a
  fraction of a tile:
  - **Coco:** 0.22 on the beach, 0.22–0.28 in worlds.
  - **Rico:** 0.16 on the beach, 0.12–0.17 in worlds.
  - **Kai:** fairy 0.22, jungle 0.16.
  - **Elias:** jungle and ski 0.20.
  - **Everyone else:** under 0.12.
- **Severity:** should fix for Coco, minor otherwise.
- **Ask for:** feet centred on the cell's centre line in every side frame. This can be a recut rather than a
  regeneration.

---

## Rico

- **`public/lab/rico_fullbody.webp`** — must fix
  - **What is wrong:** he holds a glass bong in his right hand. The source files have it too:
    `CharacterAssets/Rico/FullBody/rico_fullbody.png` and `Selection3D/rico_selection3d.png`. The source also has
    sneakers with red and blue sole plugs, which look like Adidas NMDs; the site copy crops them out.
  - **Where:** intro lab hero. `src/introLab.ts` already marks it as a placeholder. The file is published at
    `/lab/rico_fullbody.webp`, because `public/lab` is copied into `dist`.
  - **Ask for:** the same pose and outfit with an empty hand: hand in the other pocket, a thumbs-up, or holding a
    phone or a can with no brand on it. Plain unbranded trainers. Keep the hoodie, cargo shorts and face.

- **`public/assets/rico_walk.webp` (also `order-assets/pv_rico_walk.webp`, `pv_rico_run.webp`, `pv_rico_build.webp`)** — should fix
  - **What is wrong:** the walk sprite has an upright spiky tuft of dark red-brown hair. His photo, portrait, full
    body, fighter sheet and every occasion and story illustration show loose, swept, wavy mid-brown hair. It is the
    one on-screen likeness mismatch in the squad, and Rico is the character walking the whole homepage.
  - **Also:** the front step frames lift a fist to chest height, which reads as punching rather than walking (minor).
  - **Ask for:** a walk, run and build set with his portrait's hair shape and colour. Arms should swing low in the
    front walk.

- **`public/worlds/rico_walk_*.webp`** — should fix
  - **What is wrong:**
    - His hair changes between worlds: the spiky tuft in space, neon and fairy, and wavy hair closer to the
      portrait in jungle and ski.
    - **Neon:** orange glasses appear in the three side frames but not in the front or back frames.
    - **Ski:** the skis stick up either side of his head in the front view and read as ears.
    - Red halo, as in the cross-cutting section.
  - **Ask for:** regenerate once the base sprite's hair is settled, with one hair shape in all worlds. Glasses in
    every frame or none. Skis carried so they do not frame the head.

- **`public/assets/rico_photo.webp`** — should fix (retouch, not regeneration)
  - **What is wrong:** red-eye in both eyes.
  - **Where:** homepage squad card and his stop card, beside the portrait.

- **`public/assets/rico_face.webp`** — minor
  - **What is wrong:** fine as art, but the hoodie is cut off hard at the right edge. At 140 px with a drop shadow
    the straight edge shows.

## Kai

- **`public/assets/kai_walk.webp`** — minor
  - **What is wrong:**
    - The watch is on his left wrist, which is correct in the front, back and left frames. The mirrored right
      frame puts it on his right wrist.
    - In the side step frames (7, 8) his far arm shows as a flat tan block behind his back.
    - The watch is missing from back step frames 4 and 5.
  - **Where:** homepage (standing frames); the order page "playing together" loop walks him right, so both the
    mirror and the arm block are seen there.
  - **Ask for:** a right-facing row with the watch kept on the far (left) wrist, and a readable far arm in the side
    steps.

- **`public/worlds/kai_walk_*.webp`** — minor
  - **What is wrong:** in jungle and ski, the back view carries the rope coil and skis on the same side of the
    screen as the front view does, so they switch sides of his body when he turns round. The fairy sheet has a
    0.22-tile turn hop. Red halo on fairy and jungle.
  - **Ask for:** back views with side-specific gear mirrored correctly.

- **`public/assets/kai_face.webp`, `kai_photo.webp`, `lab/kai_fullbody.webp`, `order-assets/loop_catch_kai.webp`** — no issues found.

## Elias

- **`public/assets/elias_walk.webp`** — must fix (owner-flagged)
  - **What is wrong:**
    - **Gait.** Nothing strides. In the front steps (1, 2) and back step (4) one knee is pulled up to belt height
      and the other leg stays straight: a march in place. In the side steps (7, 8) the near thigh sticks straight
      forward with the shin hidden, and in step 8 the boot floats behind like a separate blob. The body does not
      lean or bob.
    - **Arms.** The front forearm is held out at the same angle in all three side frames, so it looks stuck.
    - **Face.** Very small and pale inside a large hair mass. No readable nose or mouth, glasses sitting low, and
      no chin or neck (the head sits straight on the shoulders). In the front frames a light streak runs from the
      parting down to the glasses. It reads more like a doll than like his photo.
    - **Missing props.** The squad line sells "the mic is his idea of an entrance", but the walk sprite has no mic.
      The portrait and full body both show one.
  - **Where:** homepage beach (standing frames all the time, step frames wherever he walks); intro lab "Walking"
    strip.
  - **Ask for:**
    - A normal walk cycle: heel-to-toe stride with both feet near the ground, an opposite arm swing, and a slight
      bob.
    - A face at the same scale and detail as Kai's and Ethan's: nose, mouth and chin visible, glasses at eye
      height.
    - A short neck.
    - Darker hair matching the photo, which is near-black brown where the sprite is mid-brown.
    - Optionally the mic held low in one hand, drawn on a dedicated right-facing row so it does not swap hands.

- **`public/worlds/elias_walk_*.webp` (space, neon, jungle, ski, fairy)** — must fix (after the base)
  - **What is wrong:** all five reuse the same marching leg poses and the same face. Jungle and ski also have a
    0.20-tile turn hop and gear on the wrong side in the back view.
  - **Ask for:** regenerate all five from the fixed base walk.

- **`public/assets/elias_face.webp`, `public/lab/elias_fullbody.webp`** — minor
  - **What is wrong:**
    - Both show "LOST WITHIN" printed on his top. Check it is not a real clothing brand.
    - The portrait is cut off hard at both sides, through the mic hand and the jacket.
    - The full body's hair is mid-brown against a near-black real photo.
    - The full body has very wide flared trousers and a small head. That is a style call, but it makes him look
      proportioned differently from the others.
  - **Ask for:** (if regenerated) no text on the top, or text confirmed as not a brand; darker hair.

## Ethan

- **`public/assets/ethan_walk.webp`** — must fix (owner-flagged)
  - **What is wrong:**
    - **Front walk cycle.** In frames 0 and 1 the gold/white stripe is on his right chest and the crest on his left.
      Frame 2 is a mirror image, with the stripe and crest swapped. The intro lab's "Walking" strip alternates
      frames 1 and 2, so the jacket visibly flips every step.
    - **Back walk cycle.** Frame 3 has the back stripe curving one way and frames 4 and 5 the other.
    - **Facing right.** The mirrored left idle shows the crest on his right chest, where the full body and the front
      frames have the stripe.
    - **Chain.** The chain at his hip is missing from the standing side frame (6), which was regenerated separately,
      but present in steps 7 and 8. Minor.
  - **Where:** homepage beach (he turns front, back, left and right to face you); intro lab "Walking" strip.
  - **Ask for:**
    - A walk sheet where every front frame matches `ethan_fullbody` (stripe on his right chest, crest on his left
      chest) and every back frame has the stripe running the same way.
    - A dedicated right-facing row, showing the stripe side of the jacket.
    - The hip chain in all side frames.

- **`public/worlds/ethan_walk_jungle.webp`** — should fix
  - **What is wrong:** the standing side frame (6), the regenerated one, wears knee-length shorts with bare legs.
    Steps 7 and 8 and the front and back frames wear long trousers, so his legs change when he stops.
  - **Ask for:** redo frame 6 in long trousers matching frames 7 and 8.

- **`public/worlds/ethan_walk_ski.webp`** — minor
  - **What is wrong:** the skis are visible in the front and back frames but vanish in all side frames.
  - **Ask for:** skis on his back in the side frames too.

- **`public/worlds/ethan_walk_fairy.webp`** — should fix
  - **What is wrong:** a strong red halo around the hat, feather and sleeves, the most visible of the set. The lute
    on his back disappears in the side frames.
  - **Ask for:** a clean edge; the lute visible behind him in profile.

- **`public/worlds/ethan_walk_{space,neon}.webp`** — minor (mirroring only).

- **`public/assets/ethan_photo.webp`** — minor
  - **What is wrong:** another person's arm is round his shoulders in the crop.

- **`public/assets/ethan_face.webp`, `public/lab/ethan_fullbody.webp`** — no issues found. The full body has the
  stripe on his right chest, which is the reference the walk sheet should match.

## Nala

- **`public/assets/nala_walk.webp` and `public/worlds/nala_walk_*.webp`** — no must-fix or should-fix issues.
  - The dark circles under the tail in the back step frames are her raised hind paw pads, not a drawing error.
  - The tongue changes sides when mirrored, which is fine on a pug.
  - The green in the neon and ski sheets is the outfit, not key spill.
  - Space (minor): a small ring is drawn on the suit's seat in the back view. It is ambiguous at a glance.
- **`public/assets/nala_face.webp`** — minor
  - **What is wrong:** both ears are cut off by the left and right edges of the image.
- **`public/lab/nala_fullbody.webp`, `nala_photo.webp`** — no issues found.

## Coco

- **`public/assets/coco_walk.webp`** — should fix
  - **What is wrong:**
    - **Bag shoulder.** Front and back frames (and the full body) have the star bag on her right shoulder. The left
      side frames show it on her left side, the side facing the camera.
    - **Bag position.** The bag also moves between frames, sitting at the back hip in frame 6 and at the front hip in
      steps 7 and 8.
    - **Turn hop.** A 0.22-tile sideways hop when she turns.
  - **Where:** homepage beach (she turns to face you).
  - **Ask for:**
    - Side frames with the bag strap over the far (right) shoulder and the bag hanging behind her, in the same place
      in every side frame.
    - A dedicated right-facing row with the bag on the near side.
    - Feet centred in the cell.

- **`public/worlds/coco_walk_*.webp`** — should fix
  - **What is wrong:**
    - The turn hop is the largest in the set (0.22–0.28 tile).
    - **Space:** her long hair passes out through the helmet glass and down her back, and a couple of stray blue
      pixels sit near her feet in the side frames.
    - **Fairy:** red halo on the hair and a green halo round the wand and boots.
    - **Neon:** red halo.
  - **Ask for:** feet centred; hair tucked inside the space helmet; clean edges.

- **`public/assets/coco_face.webp`, `coco_photo.webp`, `lab/coco_fullbody.webp`** — no issues found.

---

## Other character art on the site

- **`public/order-assets/loop_talk_rest.png`, `loop_talk_open.png`** (and the poster `loop_poster_talk.webp`) — should fix
  - **What is wrong:** a 120 px, very blocky pixel face (buzz cut, floral shirt) in a much cruder style than every
    other character image on the order page, including the story plates of the same character. It looks like a
    placeholder.
  - **Where:** order page and explore page, "Talking face" extra.
  - **Ask for:** a mouth-closed / mouth-open pair at portrait quality, matching `rico_face.webp` or the story plates,
    differing only in the mouth.

- **`public/order-assets/pv_jonesy_walk.webp`** — should fix (brand risk, owner decision)
  - **What is wrong:** a blond soldier with a green vest, bandana and pickaxe, named Jonesy. It is very close to
    Fortnite's Jonesy, on a page that also sells "build ramps". His side frames are also shorter (91 px against
    98 px) and much thinner than the front frames, so he shrinks when he runs sideways. He is about 10% shorter
    than Rico next to him.
  - **Where:** order page "Chase" game preview.
  - **Ask for:** an original design, not based on any game character, drawn at the same height as the squad in every
    facing.

- **`public/order-assets/pv_caro.webp`** — check, not regenerate
  - **What is wrong:** this is a real photograph of a real woman, used as the photo-game preview.
  - **Check:** she has agreed to it being on a public sales page. Otherwise swap in a stand-in or an illustration.

- **`public/assets/occ_partner.webp`** — check
  - **What is wrong:** the partner occasion card shows Ethan and Coco walking arm in arm as a couple.
  - **Check:** both are happy to be shown as a couple. Otherwise redraw with an anonymous pair.

- **`public/assets/occ_christmas.webp`** — minor
  - **What is wrong:** three of the six people are not in the homepage squad (a blond lad with glasses, a muscular
    lad with curly hair, a lad in a grey tee), next to Rico, Ethan and Nala. It reads as a different squad from
    the one the page has just introduced.

- **`public/order-assets/pv_rico_fighter.webp`** — minor
  - **What is wrong:** Rico's hair is right here but not in his walk sprite; see Rico.

- **`public/order-assets/loop_story_boss_2.webp`, `loop_story_boss_3.webp`** — check
  - **What is wrong:** a man in an open shirt in a red-lit "peep show" booth room.
  - **Check:** the images are not explicit, but check this is the tone wanted on a clean brand.

- **No issues found:**
  - `pv_seb_fighter.webp`
  - `pv_morten_crutch.webp`
  - `pv_kid.webp`
  - `loop_evo_1-3.webp`
  - `loop_catch_*.webp` (the can has no brand)
  - `phone_caller.webp`
  - `occ_birthday.webp`
  - `occ_trip.webp`
  - `loop_story_plate_*.webp`
  - `loop_story_cut_*.webp`
  - `loop_outline_*.webp`
  - `couple_card.webp`

- **Note:** the full bodies in `public/lab/` are cropped off above the shoes, except Nala's. That is fine for the
  intro lab, but they are not usable as full-length art as they are.

---

## Code-side alternative for the mirroring problem (not done)

Instead of relying on the flip, the sheets could carry their own right-facing row, and `drawCharacter` could use it:

- **Sheets:** grow each walk sheet from 9 to 12 cells, adding right idle, right step A and right step B as cells 9–11.
- **`src/world/draw.ts` (`drawCharacter`):**
  - add `right: 9` to the `base` map;
  - compute the frame width from the actual cell count, not a fixed `/ 9` (for example by checking
    `naturalWidth / naturalHeight`);
  - drop the `scale(-1, 1)` flip when the sheet has 12 cells;
  - keep the flip as a fallback for 9-cell sheets, so sheets can be upgraded one at a time.
- **Other places with the same `/ 9` and flip assumption:**
  - `walker()` in `src/order/preview/gameScenes.ts`;
  - the `togetherScene` walker in `src/order/steps/extrasScenes.ts`;
  - the intro lab's CSS walk strip (`background-size: 900%`).

Once a sheet has real right-facing cells, a jacket stripe, bag, watch or mic stays on the correct side without any
flip.
