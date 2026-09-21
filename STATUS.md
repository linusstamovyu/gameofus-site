# Build status · website proof of concept

Plan: `../Game of Us/16-website-poc-build-plan.html` · launch target **Sat 4 Oct 2026 (Gate G0)**

_Last updated: 16 Sep 2026_

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
| GitHub repo (private, published) | – | ✅ Done | https://github.com/linusstamovyu/gameofus-site |
| Low-power fallback | 3 | ✅ Done | Sea and palms stop animating under 24 fps or with reduced motion; page never waits for the world |

Verified in the browser: tour walks Rico to Kai and opens his card with the real photo; roster shows all 5 photo → game pairs; 3 tiers, 6 FAQs, no broken images, no console errors.

## Done (16 Sep) — plan 19, occasion packs

| Task | State | Notes |
|---|---|---|
| Step 0 "What's it for" in the builder | ✅ Done | Four occasion doors → tone + edition + slots; size stepper; four story outlines with playing banners; a recommendation line; suggestions priced with an Add button (nothing pre-ticked) |
| Home page occasion tiles + "For two?" card | ✅ Done | `order.html?occasion=<id>`; Christmas's line still comes from `offer.json` deadlines |
| Four story outlines | ✅ Done | Crown of the Group · The Heist · The Traitor in the Group Chat · The Night We Met, plus "our own story"; also on the story step, which follows the pick |
| Outline loops (16 files, 145 KB) | ✅ Done | Three frames each, captured from the real game (`tools/frame_sink.py` → `source/outlines/`), cut by `tools/build_order_loops.py` |
| Couples advertising art | ✅ Done | Four 4:5 mockups in `public/brand/couples/` + the home card, by `tools/build_couple_ads.py`. Advertising only — nothing in the engine |
| `occasion` on the order | ✅ Done | Saved in the draft, sent in the payload, on the owner's order email, tracked in PostHog |
| Tests | ✅ 218 pass | New `tests/purpose.test.ts`; `npm run build` clean; order art 1711 KB of a 2048 KB budget |

Still to do on plan 19: the Instagram poll assets (task 6), then read the tile-click numbers after ~2 weeks
and pick which occasion the hero leads with (task 7).

## Blocked on you

| Task | Needed from you | Unblocks |
|---|---|---|
| Domain + trademark check | Search DKPTO / EUIPO / USPTO, buy the domain | Deploy on the real address, `siteUrl` |
| Cloudflare account | Create it; connect the GitHub repo to Pages | Preview URL, analytics token |
| Tally order form | Build it from plan 07 v0 | `orderFormUrl` |
| Stripe deposit links | Create the account and links | Real deposits, test payment |
| Contact email | Pick the address | Legal pages, footer |
| Legal gaps | Your full name; CVR later; storage provider; AI training settings | Removing the draft notes |

## Still to do (not blocked)

- Device testing on real phones (week 3, needs your devices)
- Stretch: bake the real beach zone from the game's map preview
- Launch day: `isDraft: false`, fill `site.json`, deploy

## Parked (21 Sep) — the Coco hero intro

`coco-lab.html` is the homepage intro with **Coco** as the hero instead of Kai, saved for a possible rework.
**The live homepage stays Kai's.** Built into `dist/` and deployed as `/coco-lab.html` (noindex, not linked).
Everything it needs is one row in `HEROES` in `src/heroLab/heroLab.ts` plus `data-hero="coco"` on the page.

**Future work: fix Coco's pixel art itself.** Her drawn head is about a fifth too big for her body
(crown→chin 0.428 of crown→waistband, against 0.360 in her real photo), so every landmark on her face sat low.
Today that is patched with code: `tools/fit_coco_to_photo.py` warps the character onto the photo (head ×0.84 on
both axes, torso stretched ×1.17 below the neckline, body ×0.83 wide). That works for the start-screen pair but
it's a resample of pixel art — edges go soft, and the walk sprite and every other use of her art are still the
old proportions. The proper fix is to regenerate `source/regen-2026-09/out/coco-photo-pose/coco_fullbody_game_style_v2.png`
with the photo's proportions (smaller head, longer torso), then re-run:

    python3 tools/cut_coco_pair.py && python3 tools/fit_coco_to_photo.py

The warp should then come out near ×1.0 everywhere; `source/regen-2026-09/out/coco-photo-pose/coco_pair_proof.png` is the check.
Update `cellFill` / `cellTop` in `heroLab.ts` from the numbers the tool prints.
