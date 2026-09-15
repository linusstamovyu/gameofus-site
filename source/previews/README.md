# Baked game zones for the Games-step previews

Whole zones of the game, rendered by the game's own tile and prop painters at 32 px a tile (half the game's
64), with no characters or UI. `tools/build_site_assets.py` (`PREVIEW_BACKGROUNDS`) crops them into
`public/order-assets/pv_*_bg.webp`; the loops that draw on them are in `src/order/preview/gameScenes.ts`.

Baked 2026-09-15 from world seed 20260809. To re-bake after a map change: open any raw module URL on the
game's dev server (e.g. `http://localhost:5173/src/core/constants.ts`), then in the console import
`/src/world/WorldGenerator.ts` and `/src/world/ModuleLibrary.ts`, build `generateWorld(20260809)`, and for each
zone paint `paintTile` over the grid, `paintProp` for each prop (sorted by row), `paintOverheadTile`, then draw
the canvas at half size and save it here under the zone id. Extras used:

- `gym1_interior.png` has `drawIronParadiseLight(ctx, id, 0, 0, w, h, 0)` on top; `gym1_interior_open.png` is
  the same after `openGym1Gate(zone)`.
- `kart_track.png` draws the fuel can / nitro pad / gantry plates the way `/map-preview.html` does, minus the
  fuel can (the loop places its own).
- `minecraft_station_b.png` is painted twice with a pause, so the station sprites have loaded.

If a crop moves, re-check the tile coordinates written in `gameScenes.ts`.
