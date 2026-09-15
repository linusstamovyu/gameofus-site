# Codex brief: full-outfit walk sheets for the Game of Us world picker

## What this is for

The Game of Us website has a walkable preview with a world picker: Albufeira beach, Mars base, Neon city, Jungle
temple, Ski village, Fairy-tale land. When the world changes, the squad walks around in clothes for that world.
Right now a script only adds accessories (hats, scarves, helmets) on top of their normal clothes. **Replace that
with full outfit changes**: regenerate each character's walk sheet wearing a complete outfit for the world.

**The beach is out of scope.** Don't make beach sheets; the beach keeps the original clothes.

## The one rule that matters most

**Only the clothes change. The character stays exactly the same person, one to one.**

Keep identical to the source sheet:
- the face: eyes, eyebrows, nose, mouth, expression, skin tone
- the hair: shape, spikes, colour, length (a hat may sit on it, but it must not change the hairstyle underneath)
- head size, body proportions, height, build and silhouette size
- the pose in every frame, the walk cycle, the facing, and the feet position
- the pixel-art style: outline weight, shading style, palette depth and resolution

Everything else is replaced: top, bottom, shoes and gloves become the world's outfit.
- **Elias and Ethan wear sunglasses as part of their identity.** Keep them in every world except where a helmet visor
  or goggles would sit over them.
- **Nala is a pug.** Her face, ears, markings, curly tail and body must not change; she gets a dog-sized outfit on top.

If you have to choose between a cooler outfit and the character still being recognisable, **choose recognisable**.

## Characters and source files

Use each character's runtime walk sheet as the pose and identity reference, and the portrait for face detail.
Paths are relative to `polishedcrystal-master/public/assets/characters/`.

| id | Character | Walk sheet (the reference) | Face reference | Look today |
|---|---|---|---|---|
| `rico` | Rico | `Rico/Runtime/rico_walk_runtime.png` | `Rico/Portrait/rico_portrait.png`, `Rico/FullBody/rico_fullbody.png` | curly brown hair, tan hoodie, dark shorts |
| `kai` | Kai | `Kai/Runtime/kai_walk_runtime.png` | `Kai/Portrait/kai_portrait.png` | spiky black hair, grey tee, chain, striped trousers |
| `elias` | Elias | `Elias/Runtime/elias_walk_runtime.png` | `Elias/Portrait/elias_portrait.png` | shaggy brown hair, black sunglasses, all-black outfit |
| `ethan` | Ethan | `Ethan/Runtime/ethan_walk_runtime.png` | `Ethan/Portrait/ethan_portrait.png` | spiky black hair, black sunglasses, dark hoodie |
| `nala` | Nala (pug) | `Nala/Runtime/nala_walk_runtime.png` | `Nala/FullBody/nala_fullbody.png` | fawn pug, black mask, curly tail |

## The sheet format (must match exactly or it won't animate)

- One PNG per character per world, **1152 × 256 px**, transparent background (real alpha: no chroma colour, no
  white or black card, no guide boxes or grid lines baked in).
- **9 cells in one row, each 128 × 256**, in this order:
  - 0 facing down (towards the camera), idle
  - 1 facing down, step A
  - 2 facing down, step B
  - 3 facing up (back to the camera), idle
  - 4 facing up, step A
  - 5 facing up, step B
  - 6 facing left, idle
  - 7 facing left, step A
  - 8 facing left, step B

  Right-facing is the left frames mirrored by the game, so keep the left frames free of anything that would look
  wrong mirrored (no writing, no one-sided logos).
- **Same registration as the source.** In every cell the character stands in the same place, with the feet on the
  same bottom row and the same overall height as that frame in the source sheet. Test this by overlaying the new
  sheet on the source: only clothing may move. A hat or helmet may add height above the head, but it must stay
  inside the 128 × 256 cell.
- Cut on the actual cell boundaries (multiples of 128), never on a guessed grid. Nothing from one frame may bleed
  into the next, and nothing may be cropped by the cell edge.
- If you generate on a green or magenta background and key it out, remove the colour fringe from edges (no halo).
- Write the files to `gameofus-site/source/outfits/<world>/<id>_walk_<world>.png`, so 20 PNGs in all
  (4 worlds × 5 characters, or 25 with Mars). Claude converts and wires them into the site.

## The outfits

Give each person a personal colour so the four read as a group rather than clones, and keep it the same across
worlds: **Rico orange, Kai yellow, Elias blue, Ethan pink, Nala green**. Use it as the main or accent colour of the
outfit. Design every outfit so it reads at about 48 px wide on screen: bold shapes, clear outline, 2–4 main colours.

### Ski village (bright, snowy alpine village)
Full ski wear:
- a puffy insulated ski jacket in his colour with a high collar and zip, and padded ski trousers
- ski boots and gloves
- goggles pushed up on the forehead or on a beanie (Elias and Ethan keep their sunglasses on)
- optionally a beanie
- **a pair of skis carried on the back**: visible over the shoulder from the front, across the back from behind,
  and upright behind the body from the side

Nala: a padded dog snow jacket in green, little booties optional. No skis.

### Neon city (rainy futuristic megacity at night, magenta and cyan neon)
Futuristic cyberpunk streetwear:
- a cropped techwear jacket or long coat with glowing light strips along the seams in his colour
- tactical cargo trousers with straps
- chunky tech trainers with light-up soles
- fingerless gloves
- one tech piece each (a light-up visor over the eyes, a glowing collar, a cyber arm plate or a hologram wrist
  band); vary the piece per person

Keep the faces readable: a visor must be see-through enough to show the eyes. Nala: a light-up tech harness with a
glowing collar in green.

### Jungle temple (rainforest ruins, adventure)
Full explorer outfit:
- a khaki safari shirt with rolled sleeves and pockets, and cargo shorts or trousers
- lace-up jungle boots
- a satchel or rope coil
- a wide-brim hat or pith helmet with a band in his colour
- a bandana or a machete or map at the belt (vary per person)

The look is dusty and adventure-worn, but with clean pixel art. Nala: a small explorer vest with pockets and a
neckerchief.

### Fairy-tale land (twilight fantasy kingdom, pastel castle, fireflies)
Full fantasy costume, and a different role per person so the squad reads as a party:
- Rico: a knight in light armour
- Kai: a ranger with a hooded cloak and bow on the back
- Elias: a wizard with a robe and pointed hat
- Ethan: a bard with a feathered cap and lute on the back

Each costume is in his colour with gold trim, and stays pastel and storybook, not dark fantasy. Nala: a tiny cape
and a flower crown.

### Mars base (red planet base, sci-fi)
- a full white-and-grey astronaut suit with his colour on the chest stripe and shoulder patches
- a life-support backpack
- boots and gloves
- a clear glass bubble helmet so the face and hair stay fully visible

Nala: a small pet space suit with a clear bubble helmet.

## Content rules

- No real brands, logos, sports-team marks, franchise costumes or readable real text anywhere. Invented symbols
  only. Generated art in this project has drifted into real brands before, so **open every final PNG and check**.
- Keep it friendly and wholesome. These are real people who agreed to be in the game.

## Acceptance check (do this before handing back)

For each world, make a contact sheet: all 5 characters stacked, all 9 frames, at 2× zoom on a mid-grey background.
Next to it, show the original sheet for comparison. Confirm and write down in a short README in each world folder:
1. Every face and hairstyle matches the original at a glance, and a friend would recognise each person.
2. The walk cycle, facing and foot row match the original frame for frame (overlay check done).
3. The outfit is complete and consistent across all 9 frames: same colours, same pieces, and the skis, bows, lutes
   and packs switch sides correctly for front, back and side.
4. Transparent background, no fringe, no guide boxes, no bleed between cells, nothing cropped.
5. No brands or real text.
