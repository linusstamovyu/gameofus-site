# Fairy-tale land — what Codex should generate

The code theme (`fairy.ts` + `fairy-scene.ts`) already reads as a twilight fairy kingdom. These assets take
the parts code draws flattest past what canvas primitives can do. All original, no franchise look-alikes
(no famous castle silhouette, no known mascot, no lettering). Deliver transparent PNG/WebP, painted
pixel-art at the same crisp 3x-ish style as `public/assets/palm.webp`, into `public/assets/`.

## 1. Magic blossom tree — animated strip (replaces `tall()`)
- **Size / frames:** 4 frames in one horizontal strip, each 256×320, tree anchored bottom-centre (trunk
  foot at x=128, y=312). Drawn at ~2.3 tiles wide, 2.6 tall, like the palm.
- **Purpose:** the hero prop. Code draws blob canopies; art can do real blossom clumps and a gnarled trunk.
- **Prompt:** "Pixel-art fantasy tree for a top-down RPG, twisted spiralling purple-brown trunk with two
  root flares, a big round canopy of pink and lavender blossom clusters with darker undersides and pale
  highlights, four small glowing lantern-orbs (gold, pink, pale cyan) hanging on thin threads below the
  canopy, a few loose petals. Twilight lighting from the upper left. Transparent background. Four frames of a
  gentle sway: canopy shifts 2–3 px left and right, orbs swing slightly, trunk base fixed."
  (Keep orbs where `orbAt` expects them so the additive glow in `lights` still lands on them, or move the glow
  offsets to the art.)

## 2. Giant glowing mushroom — 2-frame pulse (replaces `small()`)
- **Size / frames:** 2 frames, 160×200 each, base centre at (80,192). Drawn ~1.4 tiles tall.
- **Prompt:** "Pixel-art giant fantasy mushroom, pale slightly curved stem with a frilly ring, magenta-to-
  violet domed cap with cream spots, luminous yellow-green gills glowing underneath, two tiny cyan and pink
  baby mushrooms at the base. Transparent background. Frame 2: gills and spots 20% brighter."

## 3. Castle and toadstool cottages backdrop (replaces `extras` rows y0–2)
- **Size / frames:** one still, 1056×144 (22×3 tiles at 48px), plus a 2x version 2112×288.
- **Purpose:** code builds the castle from cones and rectangles; a painted backdrop gets stonework,
  balconies, ivy and roof-tile texture.
- **Prompt:** "Pixel-art side view strip for a top-down RPG, twilight. Centre: an original pastel pink-and-
  cream fairy castle with five round towers, conical lavender and rose roofs with scalloped tiles, golden
  finials, warm lit arched windows, a glowing gate with a portcullis, purple banners. Left end: a big red
  spotted toadstool cottage with a round wooden door and glowing round windows; right end: a lavender spotted
  toadstool cottage. Between them a mossy lavender-grey stone wall with ivy, hanging flowering vines and
  glowing cyan/violet crystal clusters. Top 40 px: violet-to-rose twilight sky, stars, a full moon at x≈206.
  No text, no famous castle silhouette." Pennants and chimney smoke stay live in code.

## 4. Lake swan — 6-frame glide cycle (replaces `drawSwan`)
- **Size / frames:** 6 frames, 96×96, facing right, waterline at y=70.
- **Prompt:** "Pixel-art white swan gliding on dark blue-violet water, top-down 3/4 view, S-shaped neck,
  orange beak, tiny gold crown, soft reflection below. Six frames of paddling: subtle wing-feather ruffle and
  neck bob. Transparent background."

## 5. Fairy-dressed walk sheets for the five squad members
- **Size / frames:** one 9-cell walk sheet per lad, 576×128, exactly the layout of `public/assets/rico_walk.webp`
  (down idle/stepA/stepB, up ×3, left ×3; right mirrors left). Files `<id>_walk_fairy.webp`, wired through
  `OUTFITS.fairy` / `Theme.outfits`.
- **Prompt (per lad, keep face, hair and build identical to his normal sheet):** "Same character, dressed
  for a storybook kingdom: Rico as a wandering bard (green tunic, lute on back), Kai as a knight in light
  pastel armour, Elias as a wizard in a starry violet robe, Ethan as a ranger with a hooded cloak, and Nala the
  dog wearing a tiny flower crown. Pixel art, same palette weight and outline as the source, transparent
  background."
