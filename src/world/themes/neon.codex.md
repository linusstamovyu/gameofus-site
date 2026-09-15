# Neon city — what Codex should generate

The code draws a readable rainy megacity at midnight (skyline, expressway deck, billboards, shopfronts, LED
walkway, wet plaza, kerb, four-lane road of light streaks, neon pylons, vending machines, holo signs). These
assets would take it past what vector code can draw. No real brands, logos or readable real-world text anywhere:
invented glyphs only.

## 1. Megastructure wall strip — replaces `Ground.Cliff` rows y1–2 (and the static wall in `extras`)
- 2112×192 PNG (22 tiles × 2 tiles at 48 px), 1 frame, opaque. Tiles horizontally.
- Prompt: *Pixel-art side elevation of a rainy Tokyo-flavoured megacity street wall at midnight, 16-bit style,
  tileable left-to-right. Top third: underside of an elevated concrete expressway with a guardrail and amber deck
  lamps. Middle: seven large glowing billboards of different widths in magenta, cyan, amber and violet showing
  invented angular glyphs (no real letters, no logos), AC units and pipes between them. Bottom half: a row of small
  shops — noodle bar with red paper lanterns and a split curtain, an arcade glowing with screens, a half-closed
  corrugated shutter with spray tags, a convenience kiosk with lit shelves — each with a thin neon trim and blade
  signs. Wet stains running down the concrete. Deep blue-violet shadows, saturated neon.*

## 2. Neon sign pylon — replaces `tall()`
- 4-frame horizontal strip, each frame 64×176 (drawn at ~1.3×3.6 tiles), transparent background, foot centred on
  the bottom edge. Frames: fully lit, one glyph flickering, border buzzing dim, fully lit with rain sheen.
- Prompt: *Pixel-art freestanding vertical neon sign on a steel pole with a concrete footing, top-down 3/4 RPG view,
  tall dark box with a glowing magenta tube border and four stacked invented glyphs (no real characters), small
  antenna with a red light, rain beading on the casing, soft halo. Transparent background, 4 animation frames of
  neon flicker.* Ship colour variants (magenta, cyan, amber, lime) as separate strips.

## 3. Vending machine — replaces `small()`
- 2-frame strip, 48×80 each, transparent, footprint 1 tile at the bottom. Frame 2 has the header flickered dim.
- Prompt: *Pixel-art Japanese-style drinks vending machine at night, 3/4 top-down RPG view, white body, glowing
  header panel with invented glyphs, backlit window with three rows of generic unbranded cans and bottles, green
  price lights, coin slot and dispenser flap, cool light spilling onto wet ground below. No logos, no readable text.*

## 4. Traffic sprites — replaces the drawn car bodies in `live`
- 6 cars × 2 directions, 80×32 each, transparent, top-down: hatchback, sedan, taxi (amber, roof lamp), van, sports
  coupe with underglow, delivery scooter. Headlights and tail lights painted bright so the code's streaks line up.
- Prompt: *Top-down pixel-art city cars on a wet night road, 16-bit, generic unbranded shapes, glossy roofs reflecting
  neon, bright headlights at the front and red tail lights at the back, transparent background.*

## 5. Wet plaza decal sheet — layered in `extras` over `Ground.Sand`
- 512×256 transparent atlas: 6 puddles with neon reflections, 3 manhole covers, 2 drains, 4 soaked flyers, 2 large
  faded painted street glyph markings, 1 faded arrow.
- Prompt: *Pixel-art decals for a rain-soaked asphalt plaza at night, top-down: shallow puddles mirroring magenta and
  cyan neon, iron manhole covers with a cross-hatch pattern, gutter grates, soggy paper flyers, faded white painted
  invented glyphs. Transparent background, soft edges, no text.*

## 6. Dressed walk sheets for the squad — `outfits`
- One per squad member (rico, kai, elias, ethan, nala — ids from `squad.json`): 9-cell 576×128 walk sheet, same
  layout as `public/assets/rico_walk.webp` (down idle/A/B, up idle/A/B, left idle/A/B; right mirrors left).
- Prompt: *The same character redrawn for a rainy neon megacity: dark techwear jacket with a reflective cyan piping,
  hood or cap, wet hair highlights, one small glowing accessory (LED earbud or visor band) in their own accent
  colour. Keep face, build, proportions and palette identity so they stay recognisable. Pixel art, transparent
  background, 9 cells.*
