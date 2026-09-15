# World theme rubric

The hero preview is one map (`src/world/map.ts`, 22×18 tiles) that can be dressed as different worlds. **Nothing
about the map moves between worlds**: same walkable tiles, same blocked tiles, same people, same signs, same tour.
A theme only changes the pictures. The owner's brief: "the trees turn into buildings if they pick a mega city, then
into jungle" — the point is to show a buyer how different their game could look.

A theme is one file, `src/world/themes/<id>.ts`, exporting a `Theme` (contract in `types.ts`, helpers in `kit.ts`).
`index.ts` already imports all six; the picker, fade and messages are wired in `world.ts`.

## The slots every theme fills

| Slot | Tiles | Rule | Beach does |
|---|---|---|---|
| `Ground.Town` | row y0 | blocked backdrop, the far edge of the world | old-town rooftops |
| `Ground.Cliff` | rows y1–2 | blocked wall | golden cliff |
| `Ground.Board` | row y3 | walkable path along the wall | boardwalk |
| `Ground.Sand` | rows y4–11 | the main walkable ground, where everyone stands | sand |
| `Ground.Wet` | row y12 | walkable edge strip | wet sand |
| `Ground.Sea` | rows y13–17 | blocked, and it should MOVE | sea with waves |
| `tall()` | the 5 `PALMS` tiles | the hero prop, drawn up to ~2.6 tiles tall from the tile's bottom edge, sorted by row | animated palm |
| `small()` | the 4 `PARASOLS` tiles | a 1–1.6 tile prop | parasol |
| `sign()` | MAP and STORY stops | must keep the label readable | wooden sign |

The props are solid, so they must stay on their one tile's footprint at the ground (a shadow ellipse ~0.4T), even
if the drawing reaches upward. People are drawn one tile wide and two tall, feet on the bottom of their tile.

Optional passes, in draw order: `extras` (static, once — for anything bigger than a tile: a temple, a castle, a
planet; clip to the tile bands it belongs to), `live` (animated ground, every frame, only the `View` range),
props and people, `grade` (colour grade over the world, e.g. night), `lights` (additive glow and world-anchored
particles, after the grade), markers, `screen` (weather in screen space).

## Quality bar (score yourself 1–5 on each; ship at 4+ everywhere)

1. **Reads in one second.** A screenshot with no label is obviously this world. Ask: would a stranger name it?
2. **Distinct from every other world.** Different palette, different silhouettes, different motion. Space is not
   "night neon with red ground", jungle is not "fairy-tale without sparkles".
3. **Detail density close to the beach or better.** The beach cliff has flutes, strata and scrub; sand has
   speckles. Every band needs at least two layers of detail (base variation + marks/objects), no flat fills.
   Use `vnoise` + `blocks` for soft ground variation that never shows the tile grid.
4. **No tile grid, no plaid.** Seed column-varying detail from `x` and row-varying detail from `y`, never both on
   the same feature. Features that cross tiles (roads, rivers, tracks, roofs) must line up across tile edges.
5. **Motion.** The barrier band must move. At least one other thing moves (lights, particles, sway, flicker).
   All motion must be a pure function of `time` (no state, no `Math.random`), and `animated === false` must give a
   calm still frame.
6. **People stay readable.** A grade must not turn the lads into silhouettes (keep a grade at or under ~30% dark);
   bright effects must not sit on top of faces. The teal markers are drawn after `lights` and must stay visible.
7. **Walkable looks walkable, blocked looks blocked.** The ground band must look like somewhere you stand; the
   wall and barrier must look like somewhere you cannot go.
8. **Cheap.** `live`, `lights` and `screen` run every frame: keep them to a few hundred draw calls. No
   `getImageData`, no `filter`, no per-frame canvas allocation. Gradients are fine.
9. **Clean content.** No real brands, logos, franchise names or readable real-world trademarks (a test sweeps copy
   for franchise names). Invented glyphs/lettering only.
10. **Words.** `label`, `blurb`, `place` (finishes "You are standing … right now."), and a `lines.barrier` toast
    for tapping the barrier band — short, in the site's friendly voice.

## Working rules

- **Touch only your own theme file** (plus a sibling `<id>-*.ts` if it grows past ~500 lines, and your Codex brief
  below). Do not edit `kit.ts`, `types.ts`, `index.ts`, `world.ts`, `lab.ts`, CSS or HTML — other agents are working
  in parallel. If a shared helper is missing, write it locally in your file.
- Check your work by LOOKING at it. The dev server is on `http://localhost:5391` (do not start another). Shoot the
  whole map with `tools/shoot_world.sh <id> <time> <out.png>` into your scratch directory and Read the PNG. Shoot at
  least two different times to see motion, and fix what looks wrong. Also try `T=34` (phone size).
- Before finishing: `export PATH="$HOME/.local/node22/bin:$PATH"; npx tsc --noEmit -p .` must pass.
- Write `src/world/themes/<id>.codex.md`: what Codex should generate to take this world past what code can draw —
  3–6 assets max, each with purpose, size and frame count, the slot it replaces, and a one-paragraph image prompt.
  Always include the dressed walk sheet idea for the five squad members (9-cell 576×128 walk sheets, same layout
  as `public/assets/rico_walk.webp`).
