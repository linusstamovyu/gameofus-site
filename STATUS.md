# Build status · website proof of concept

Plan: `../Game of Us/16-website-poc-build-plan.html` · launch target **Sat 4 Oct 2026 (Gate G0)**

_Last updated: 15 Sep 2026_

## Done (15 Sep, ahead of schedule)

| Plan task | Week | State | Notes |
|---|---|---|---|
| Scaffold Vite + TypeScript | 1 | ✅ Done | Builds, type-checks, 23 tests pass |
| `build_site_assets.py` | 1 | ✅ Done | WebP output, 400 KB first load (budget 3 MB); fails on missing file / over budget |
| Split the world into modules, content into JSON | 1 | ✅ Done | map, path, player, paint, draw, world; squad, stops, offer, faq, site |
| Touch: tap targets, bottom-sheet cards | 1 | ✅ Done | Checked at 375 px: no sideways scroll, card fits |
| Page sections from the draft | 2 | ✅ Done | Features, squad, how it works, prices, made for, FAQ, CTA |
| Privacy + terms pages | 2 | ✅ Draft | From the templates. Square-bracket gaps + needs review before payment |
| Title, description, share image | 2 | ✅ Done | `assets/share.jpg` 1200×630 |
| Order buttons wired | 2 | ✅ Ready | Point at Tally the moment `orderFormUrl` is filled in |
| Speed pass: WebP art, lazy images, cache headers | 3 | ✅ Done | First load 400 KB (was 1.2 MB); whole site 672 KB |
| Card focus + keyboard return | 3 | ✅ Done | First action focused on open; focus returns to the beach on close |
| Deploy prep: `_headers`, `robots.txt`, 404 page, CI workflow, DEPLOY.md | – | ✅ Done | Cloudflare Pages settings written out; deploys the moment the repo is connected |
| Low-power fallback | 3 | ✅ Done | Sea and palms stop animating under 24 fps or with reduced motion; page never waits for the world |

Verified in the browser: tour walks Rico to Kai and opens his card with the real photo; roster shows all 5 photo → game pairs; 3 tiers, 6 FAQs, no broken images, no console errors.

## Blocked on you

| Task | Needed from you | Unblocks |
|---|---|---|
| Domain + trademark check | Search DKPTO / EUIPO / USPTO, buy the domain | Deploy on the real address, `siteUrl` |
| GitHub repo | Create a private repo, give the URL | `git push` (local repo is already committed) |
| Cloudflare account | Create it; connect the GitHub repo to Pages | Preview URL, analytics token |
| Tally order form | Build it from plan 07 v0 | `orderFormUrl` |
| Stripe deposit links | Create the account and links | Real deposits, test payment |
| Contact email | Pick the address | Legal pages, footer |
| Legal gaps | Your full name; CVR later; storage provider; AI training settings | Removing the draft notes |

## Still to do (not blocked)

- Device testing on real phones (week 3, needs your devices)
- Stretch: bake the real beach zone from the game's map preview
- Launch day: `isDraft: false`, fill `site.json`, deploy
