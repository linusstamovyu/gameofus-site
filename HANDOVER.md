# Handover · Game of Us website (for the next session)

_Written 15 Sep 2026. Read this, then `STATUS.md` and `DEPLOY.md`._

## Where we are

- **Business plan:** `../Game of Us/` (files 01–16). Plan 16 (`16-website-poc-build-plan.html`, also published at
  https://claude.ai/artifact/7wGzSniWP2bQ6ncSyHnouX) is the 3-week build to **Gate G0, Sat 4 Oct 2026**.
- **Approved design draft:** https://claude.ai/artifact/VfSdTq33xgvoVgGD7r3aVM (the spec).
- **Site code:** this folder, Vite + TypeScript, no framework. Built, 23 tests pass, 400 KB first load.
- **GitHub:** published, private, in sync: https://github.com/linusstamovyu/gameofus-site (branch `main`).
- **Google Calendar:** all 16 plan tasks added as all-day "Game of Us · …" events (15 Sep – 4 Oct).

## Decisions already made (don't reopen)

2D pixel world (not 3D) · walkable beach hero + classic scroll page under it · tap-to-walk + guided tour bar
together · Albufeira squad with real photos (Rico, Kai, Elias, Ethan, Nala; everyone agreed) · Tally + Stripe
for orders · English, sound off · all three tiers shown (1,995 / 6,495 / from 19,995 DKK) · no reviews until real
ones exist · no franchise names or content anywhere (a test sweeps for it).

## Next step (what the owner is doing now)

1. **Cloudflare Pages:** owner creates a free Cloudflare account, then Workers & Pages → Create → Pages → Connect
   to Git → `gameofus-site`. Build command `npm run build`, output `dist`, env `NODE_VERSION=22`.
   Send back the `*.pages.dev` preview URL; verify it loads (beach, tour, photos, prices).
2. Then, in order: domain + trademark check (by 22 Sep), Tally form + Stripe deposit links (week 2), contact email
   and owner's name for the legal pages, device testing (week 3), launch 4 Oct.

## Loose ends

- **An accidental git repo was created on the parent `Frokost Pokemon` folder** (3.4 GB `.git`, remote
  `github.com/linusstamovyu/Frokost-Pokemon`, push failed so nothing uploaded). The folder was not a git repo
  before today. Owner still to: remove it from GitHub Desktop (Remove, don't trash), delete the empty
  `Frokost-Pokemon` repo on github.com. Claude offered to delete the parent `.git` (needs owner's yes).
- Owner has ID-card images in `~/Downloads` (`Screenshot 2026-07-02 at 20.56.14.png`, `IMG_3427.JPG`); suggested
  deleting them.

## How to work in this repo

```bash
export PATH="$HOME/.local/node22/bin:$PATH"   # node is not on PATH on this Mac
npm run assets && npm test && npm run build
```

The Browser pane's rAF is frozen: open `/?debug` and pump `window.__beach.step(1/60)` on an interval to test the
world. Commit with the owner's go-ahead; end messages with the Claude co-author line.
