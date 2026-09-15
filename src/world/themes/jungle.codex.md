# Jungle temple: what Codex should generate

The code draws the jungle from vector primitives (`jungle.ts` for motion, props and sign; `jungle-scenery.ts` for
the static layer). These assets would take it past what code can draw. Deploy to `public/assets/` and register
them in the theme's `files`; every one falls back to the current code drawing if missing.

## 1. Stepped temple (extras, replaces `temple()`)
- 6×3 tiles at 64px/tile → **384×192 PNG**, transparent, 1 frame. Drawn at tile (8,0)-(14,3), stair centred on x=11.
- Prompt: *Top-down 3/4 pixel-art jungle temple, stepped pyramid of weathered pale limestone in three tiers with a
  small shrine and a dark corbel-arch doorway on top, a straight central staircase running to the bottom edge,
  invented carved glyph friezes (spirals, faces, step frets; no real script), thick moss on every ledge, hanging
  vines, two stone braziers at the stair foot (unlit — flames are drawn live), light from the upper left, soft
  16-bit JRPG style, crisp outlines, transparent background, the bottom edge flat so it sits on a path.*

## 2. Big jungle tree (tall prop, replaces `tree()`)
- **4 frames × 160×176 PNG strip (640×176)**, frames = gentle canopy sway (rest, lean, rest, lean back), like `palm.webp`.
- Prompt: *Pixel-art rainforest tree seen top-down 3/4, pale grey-brown trunk with flaring buttress roots on the
  ground, a wide layered canopy in four greens with bright leaf highlights, hanging vines with small leaves, a red
  bromeliad on the trunk, transparent background, trunk base centred at the bottom middle of each frame, 4-frame
  subtle sway loop where only the canopy and vines move.*

## 3. Ruin wall strip (Cliff band, replaces `wall()` + `vines()`)
- **1408×128 PNG** (22 tiles × 2 tiles at 64px), tileable horizontally, 1 frame.
- Prompt: *Seamless horizontal pixel-art strip of an overgrown ancient stone wall: four courses of irregular
  carved limestone blocks, some with invented glyph panels, cracks, a few fallen-out blocks with ferns growing in
  the holes, moss creeping over block tops, vines hanging from above, darker at the top where the canopy shades
  it, fern clumps along the base, top-down 3/4 view, left and right edges tile seamlessly.*

## 4. River crocodile (live, replaces `crocodile()`)
- **6 frames × 128×48 PNG strip (768×48)**: drift with eye blink on frame 4 and tail flick on 5–6. Eyes and snout
  above water, body a dark submerged shape, surface ripples baked in lightly.
- Prompt: *Pixel-art crocodile swimming east in murky green river water, only the eyes, nostrils and back ridges
  breaking the surface, body a darker blur under water, yellow eyes with slit pupils, small V ripples, transparent
  background, 6-frame loop with a slow blink, friendly-sneaky not scary.*

## 5. Campfire (small prop, replaces `campfire()`)
- **6 frames × 64×80 PNG strip (384×80)**: flame flicker loop, stone ring and crossed logs static.
- Prompt: *Pixel-art jungle campfire top-down 3/4, ring of grey river stones, three crossed logs with glowing
  ends, layered orange-yellow flames, transparent background, 6-frame flicker loop, fire base at bottom centre.*

## 6. Dressed walk sheets for the squad
- Five sheets, **576×128** each, 9 cells in the exact layout of `public/assets/rico_walk.webp` (down, up, left ×
  idle / step A / step B; right mirrors left). Files: `<id>_walk_jungle.webp` for rico, kai, elias, nala, ethan.
- Prompt (per lad, fed the lad's normal walk sheet as reference): *Redraw this exact character and walk cycle,
  same face, hair, body and proportions, dressed for a jungle expedition: khaki explorer shirt with rolled sleeves,
  cargo shorts, hiking boots, a canvas satchel strap across the chest, optional bandana or bucket hat (keep the
  hair readable), same 9-cell layout and cell size, transparent background, no logos.* For the dog (nala) a small
  neckerchief only.
