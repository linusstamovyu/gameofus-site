# idea-to-ship ledger · site fixes (17 Sep 2026)

## Phase 0 · orient (done)
- Repo: gameofus-site (git, main). No `gh` → issues as local files under `.scratch/site-fixes/issues/`.
- Plan 19 tasks 1-5 already committed in 728957d. Uncommitted edits to explore/index/order/privacy/terms.html,
  styles.css, pnpm files and logo webp are NOT this run's — leave them.
- Entry: phase 1 (one piece of work: a bundle of fixes + one bug).

## Facts found
- World reset: `#worldSelect` keeps focus after `change`; select type-ahead maps A → "Albufeira beach", S → "Ski village". `src/world/world.ts` bindWorldPicker.
- Tour cards on 390×844: `.card .body` scrolls (500/307, Elias 412/307); action buttons sit inside it below the card bottom.
- Order Next (`src/order/main.ts` #next): `blockingProblems` → one `ctx.notify` toast at the top, no scroll/focus to the field. Consent (`steps/consent.ts`): problem list next to the button, far below the fields.

## Owner rulings (from the message that started this run)
- Suggestions stay offered with a price + Add button, never pre-ticked ("total leads").
- Couples ads: hold off; owner will make images.
- Outline loops: skip for now; log in future work.
- Create a "future work" markdown folder for deferred items.

## Phase 1 · align (done)
Q1 world picker hands focus back · Q2 tour card buttons pinned in a footer · Q3 Next jumps to the first gap
(outline + inline message + focus, top notice kept) · Q4 suggestions offered not pre-ticked; couples images are
another session's · Q5 outline loops untouched, logged · Q6 `Game of Us/future-work/` · Q7 iPhone pass.
Owner: "short spec then build, don't stop and ask me".

## Phase 2-3 · spec + issues (done)
`.scratch/site-fixes/spec.md`, issues 01-05 in `.scratch/site-fixes/issues/` (all afk).

## Phase 4 · build (done, NOT committed)
- 01 `Game of Us/future-work/` README + 5 topic files.
- 02 `src/world/world.ts`: pointer pick → focus to stage; W/A/S/D on the select walk; arrows stay with the select.
  Verified live (pointer pick, A on select, keyboard change).
- 03 `src/world/world.ts` + `src/styles.css` (the one hunk after `.actions .card-all`): actions outside the
  scrolling body; smaller art under 560px. Verified: every card's buttons visible at 390×844 and 375×667; desktop unchanged.
- 04 `StepProblem.field`, `SectionProblem`, `consentGaps`, new `src/order/fix.ts` (`fieldCandidates`,
  `showProblem`), `data-field` tags in consent/squad/edition/games/world/vehicles/phone/story/keepsakes,
  styles at the end of `order.css`. Tests updated + 3 new. Verified live: consent photo box, 18+ question,
  games shelf (tall → message above), world places, story memory.
- 05 iPhone pass: all 10 steps at 390 wide, no horizontal overflow; tour cards at 375×667 all buttons visible.
- Gates: `tsc` clean, 223 tests pass, `vite build` OK (built to scratch, `dist/` untouched).

## Why not committed
Another session has live uncommitted edits in the same tree (occasions, purpose step, html, styles.css,
render.ts, content test, intro lab). `src/styles.css` mixes both sessions' hunks. Commit when that session is
done, or stage only this run's files (list above) and the `@@ -284,6 +284,23 @@` hunk of styles.css.

## Phase 5 · review
Self-review caught one regression (blur-on-change broke stepping through worlds with arrow keys on Windows) —
fixed and re-verified. A fresh-session `code-review` is recommended before merging.
