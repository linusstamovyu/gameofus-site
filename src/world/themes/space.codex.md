# Mars base — what Codex should generate

Everything in `space.ts` is drawn in code. These assets would take it past what canvas shapes can do. Keep the
palette: rust regolith `#a24326`–`#e29a68`, cold metal `#565d69`–`#c9ced6`, hazard yellow `#f0bd2c`, cyan screens
`#5ef0ff`, deep space `#03030a` with violet/teal nebula. No real agencies, flags, mission patches or lettering;
invented glyphs only.

1. **Comms antenna mast** — replaces `tall()`. 4-frame horizontal strip, each frame 256×640 (drawn ~2.3 tiles wide,
   2.6 tall, feet on the bottom row, centred). Frames are the dish turning a quarter at a time; the red beacon is
   drawn live in code, so leave the top light unlit. Prompt: *Pixel-art game prop, top-down 3/4 view, a slim steel
   lattice communications tower on a small concrete footing on a Mars base, cross-braced legs tapering upward,
   red-and-white warning bands near the top, a small equipment box with a cyan diode halfway up, a white parabolic
   dish on a pivot at the top turning between frames, a thin spire above it. Crisp 1px outlines, soft top-left
   light, transparent background, no text.*

2. **Six-wheel rover and supply-crate stack** — replaces `small()`. Two separate 2-frame sprites, 192×192 each
   (drawn ~1.2 tiles). Frame 2 only changes the status light. Prompt: *Pixel-art game props on transparent
   background, 3/4 view: (a) a small white six-wheeled planetary rover with rocker-bogie suspension, a blue solar
   deck, a gold-foil side panel, a camera mast with a cyan status light, and a whip antenna; (b) a stack of two
   supply crates, white with orange corner caps and a yellow-black hazard strip, plus a grey gas canister with a
   cyan band. Invented stencil glyphs only, no logos.*

3. **Habitat skyline strip** — replaces the `domes()` part of `extras` (row y0). One 2112×96 image (22 tiles × 48,
   ×2 for crispness), not animated; windows lit warm. Prompt: *Pixel-art panoramic strip of a Mars habitat on a
   dark starry sky: five glass geodesic domes of different sizes with green plants inside, on grey metal module
   bases with small warm lit windows, joined by ribbed connecting tubes, tilted solar panels on stilts, one thin
   lattice mast. Dark rust far hills behind, flat bottom edge. No text.*

4. **Airlock door** — replaces `airlock()`. 192×192, 2 frames (status lamp green / dim). Prompt: *Pixel-art sci-fi
   airlock set into red rock: a recessed double sliding steel door with small dark portholes, a thick yellow-black
   hazard-striped frame, a lintel plate with invented cyan glyphs, a round status lamp above, and a little keypad
   on the rock to the right. Front view, transparent outside the rock recess.*

5. **Open-space backdrop** — replaces the static nebula + planet in the `Sea` band (rows y13–17). One 2112×480 image,
   not animated (twinkles, shooting star and satellite stay live in code). Prompt: *Pixel-art deep-space backdrop:
   near-black sky with a soft violet and teal nebula, dense tiny stars, a large pale icy-blue banded planet rising
   from the lower right with a glowing atmosphere rim and a dark night side, a small grey cratered moon on the
   left. Top edge fully dark so it sits under a rock lip. No text.*

6. **Dressed walk sheets for the squad** — `outfits` for the five squad members. One 576×128 sheet per lad, 9 cells,
   exactly the layout of `public/assets/rico_walk.webp`. Prompt: *Same character, same pose layout and cell grid
   as the reference walk sheet, but wearing a light surface EVA suit: off-white suit with orange shoulder panels,
   a clear bubble helmet that keeps the face fully visible and unshaded, a small backpack life-support unit, grey
   boots. Keep hair visible inside the helmet, keep the face as readable as the original. Transparent background.*
