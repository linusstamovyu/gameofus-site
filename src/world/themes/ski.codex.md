# Ski village — what Codex should generate

The code-drawn world (`ski.ts` + `ski-village.ts`) already reads as an alpine village: chalet row, timber
terrace, powder with ski tracks, packed ridge, frozen lake, snowy pines, snowmen, trail signs. These assets take
it past what canvas shapes can do. Every one is optional: the theme draws fully without them. Deliver as WebP
with alpha into `public/assets/worlds/ski/`, and wire them through `files` in the theme.

## 1. Chalet row backdrop (replaces `extras` → `backdrop` + `chalet` + `gapProps`)
- 1056×144 (22×3 tiles at T=48; also a 2× 2112×288), 1 frame, opaque.
- Prompt: "Pixel-art, front-on 3/4 view, a row of five Swiss alpine chalets on a bright cold day, drawn to sit
  exactly in a 22-wide by 3-tall tile strip. Top third: thick snow-laden roofs with rounded snow cornices,
  icicles along the eaves, stone chimneys with snow caps; two chalets have a front gable with vertical planks
  and a small arched lit window. Middle: dark honey log walls with crossed log ends at the corners, lit warm
  amber windows with red, green and blue shutters with heart cut-outs, full-width balconies with carved
  railings (round and diamond cut-outs) with snow along the rail. Bottom: cream render ground floor with arched
  plank doors and wall lanterns, grey stone foundation. Gaps between chalets: a small snowy pine, a rack of
  colourful skis, a firewood store under a lean-to. Behind: pale blue sky, distant snowy peaks, a dark
  teal pine forest line. No lettering, no logos. Palette bright and saturated, not grey."

## 2. Snowy pine sway sheet (replaces `tall()` / `drawPine`)
- 4 frames, 96×128 each (strip 384×128), alpha, base centred at the bottom edge.
- Prompt: "Pixel-art spruce tree, five layered dark green tiers, each tier capped with a thick lumpy layer of
  fresh snow and small snow clumps on the drooping branch tips, short brown trunk in a small snow mound.
  4-frame gentle wind sway: the trunk base stays fixed, the tip moves 3px left and right, snow clumps shift
  with the branches. Light from the top left, blue shadow on the right side. Transparent background."

## 3. Snowman (replaces `small()`)
- 2 frames, 64×80 each (strip 128×80), alpha, feet at the bottom edge.
- Prompt: "Pixel-art snowman of three snowballs with soft blue shading on the lower right, coal eyes and coal
  smile, carrot nose, stick arms with twig fingers, red knitted bobble hat with a white stripe and white
  pom-pom, red striped scarf with a tail. Frame 2: scarf tail lifted by the wind. Transparent background."

## 4. Frozen lake tile set (replaces the `Ground.Sea` tile and `cracks`)
- 384×240 seamless (8×5 tiles at T=48), 1 frame, opaque; plus a 96×48 shore-ridge strip that tiles
  horizontally for row 12.
- Prompt: "Top-down pixel-art frozen alpine lake surface, seamless horizontally. Pale turquoise ice with deeper
  clear blue patches, white frost streaks combed by wind, thin branching cracks with white highlight edges, a
  star-burst fracture of thin ice, trapped air bubbles, wind-blown powder drifts. No reflections of objects.
  Separate strip: packed snow bank rolling over an aqua ice lip with icicles."

## 5. Snow sparkle + smoke overlay strip (replaces the `live` twinkles and chimney smoke in `lights`)
- 8 frames, 32×32 each (strip 256×32), alpha: a snow crystal glint that grows and fades; plus a 6-frame
  48×48 strip of a soft white smoke puff rising and dissolving.
- Prompt: "Pixel-art four-point sparkle glint on transparent background, 8-frame twinkle from nothing to a bright
  white star with a faint blue halo and back. Separate: 6-frame soft grey-white chimney smoke puff swelling and
  fading as it drifts right."

## 6. Dressed walk sheets for the squad (theme `outfits`)
- Five sheets, one per squad member, 576×128, 9 cells, same layout, facing order and foot line as
  `public/assets/rico_walk.webp`; saved as `public/assets/worlds/ski/<id>_walk.webp`.
- Prompt: "Re-dress this exact walk sheet for a ski trip, keeping the pose, proportions, face, hair and
  animation frame for frame: puffy ski jacket in the character's own colour, knitted beanie or ski goggles pushed
  up on the forehead, scarf, snow trousers and chunky snow boots. Same pixel scale and outline as the source
  sheet, transparent background, no logos."
