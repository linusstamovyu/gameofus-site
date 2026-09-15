# Game of Us website

The marketing site from Game of Us plan 16: a walkable Albufeira beach as the hero,
then the page sections. Static, Vite + TypeScript, no framework.

```bash
export PATH="$HOME/.local/node22/bin:$PATH"   # node is not on PATH on this Mac
npm install
npm run assets     # rebuild public/assets from the game (fails on a missing file or over budget)
npm run dev        # local dev server
npm test           # map, routes, prices vs plan 03, assets, banned words
npm run build      # type-check + build to dist/
npm run preview    # serve dist/
```

## Where things are

| Path | What |
|---|---|
| `src/content/*.json` | Everything a non-coder changes: squad, beach stops, prices, FAQ, site links |
| `src/world/` | The beach: `map` (tiles, solids), `path` (routes), `player` (movement), `paint` (tiles), `draw` (sprites), `world` (loop, input, tour, cards) |
| `src/sections/render.ts` | Fills the page sections from content |
| `index.html` | Page markup and metadata |
| `privacy.html`, `terms.html` | Draft legal pages. Must be reviewed before taking payment |
| `tools/build_site_assets.py` | The only thing that reads the game repo |
| `source/photos/` | Consented real photos, cropped by the asset script |

## Rules

- **Prices live in `src/content/offer.json`** and a test checks them against plan 03.
- **While `orderFormUrl` in `site.json` is empty**, order buttons scroll to prices and say ordering opens soon.
- **`isDraft: true`** shows the Draft labels. Set it to `false` on launch day.
- **Never name a franchise or celebrity** in copy or metadata; a test sweeps for it.
- **Removing someone's photo** is deleting `photo` from their row in `squad.json`, then `npm run assets`.
- **`?debug`** exposes `window.__beach.step()` for stepping the world by hand in browsers that pause animation.
