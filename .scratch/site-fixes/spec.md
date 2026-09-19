# Spec · site fixes, 17 Sep 2026

Labels: afk (owner pre-approved the build: "don't stop and ask me, just run the builds").

## Problem Statement

Four things on the Game of Us site get in a buyer's way, and three owner rulings are not written down anywhere:

- On the beach, after choosing a different world from the world picker, pressing A to walk switches the world back to Albufeira beach (and S to Ski village).
- On a phone, the guided tour's cards cut off their own buttons: "Next stop" and "Pick your games" / "Add the extras" sit below the bottom of the card, inside a scrolling box nobody knows is there. Elias's card is the worst.
- In the order builder, pressing Next (or Start building on the consent screen) with something missing shows a message at the top of the page, or a list next to the button, but never takes the buyer to what is missing.
- Nobody has checked the order builder at iPhone size since the step-0 work landed.
- The owner deferred three things (couples images, outline loops, events to showcase) and wants a future-work folder to hold deferred items.

## Solution

- The world picker hands focus back to the beach the moment a world is chosen, so the walking keys walk.
- A tour card keeps its buttons in a footer that is always on screen; only the text scrolls, and the art strip is shorter on small screens.
- Next and Start building take the buyer to the first thing that is missing: scroll it into view, outline it in red, put its message right beside it and focus it. The short notice at the top stays.
- A 390×844 pass over every tour card and every order step, fixing anything cut off or overflowing.
- `Game of Us/future-work/` with a README index and one file per deferred topic.

## User Stories

1. As a visitor on the beach, I want to change the world and then walk with WASD, so that I can explore the world I picked.
2. As a visitor using the arrow keys, I want the world picker not to swallow them after I pick, so that the arrows move the character.
3. As a keyboard user, I want to still be able to open the world picker with Tab and change it with the keyboard, so that the picker stays accessible.
4. As a phone visitor on the guided tour, I want to see "Next stop" without scrolling inside the card, so that the tour keeps moving.
5. As a phone visitor, I want the card's Add button ("Pick your games", "Add the extras") always visible, so that I can jump into the builder from any stop.
6. As a phone visitor on Elias's card, I want the explanation of in-jokes becoming moves to fit or scroll clearly above pinned buttons, so that dense info doesn't hide the actions.
7. As a desktop visitor, I want tour cards to look as they do today, so that nothing regresses on a large screen.
8. As a buyer who pressed Start building without ticking the photo-consent box, I want the page to scroll to that box and mark it, so that I know exactly what to do.
9. As a buyer who hasn't answered the 18+ question, I want to be taken to that question, so that I don't hunt for it.
10. As a buyer on the squad step with an empty slot or missing name, I want to land on that slot, so that I can fill it.
11. As a buyer who hasn't picked an edition, I want to be taken to the edition cards.
12. As a buyer on the games step with nothing picked, I want to be taken to the big-games shelf.
13. As a buyer on the world, vehicles, phone, story or keepsakes step, I want to land on the first incomplete field (a place name, a car photo, a call's caller, the memory box, the gift-card recipient), so that each step's rule is easy to satisfy.
14. As a buyer who fixes the problem, I want the red outline and message to clear, so that the page doesn't keep scolding me.
15. As a screen-reader user, I want focus to move to the missing field and its message to be announced, so that I learn what's needed without seeing the outline.
16. As a buyer on an iPhone, I want every order step, the step bar and the Next/Back bar to fit the width without sideways scroll, so that the builder is usable one-handed.
17. As the owner, I want deferred work logged in one folder, so that nothing agreed gets lost between sessions.

## Implementation Decisions

- **World picker:** on `change`, blur the select and focus the stage (without scrolling the page). Keyboard type-ahead in the select before a change is left alone (that's how a select works); the bug is only focus staying on it afterwards.
- **Tour card layout:** the card becomes a column: art, a scrolling body, then a non-scrolling actions footer holding Next stop / the Add button / See all. On short viewports the art strip shrinks. No copy changes.
- **Problems carry a field key:** a step problem gains an optional `field` string naming the control it is about (for example `consent-photos`, `consent-adults`, `friend-2-photo`, `edition`, `big-games`, `place-0-name`, `car-1-photo`, `beat-0-from`, `story-memory`, `giftcard-recipient`). The section contract's `problems()` may return either a plain message or `{ message, field }`, so existing sections keep working while each is upgraded.
- **Views tag their controls** with a matching `data-field` attribute.
- **One shared "show the problem" helper** in the order page: find `[data-field=<key>]` in the panel; scroll it to the centre; add a `needs-fix` class and an inline `role="alert"` message right after it; focus the first focusable element inside it. It clears when the draft next changes that step. With no field, or no element found, it falls back to scrolling the panel top and the existing notice.
- **Consent screen** uses the same helper instead of only its list beside the button.
- **Couples "For two?" card and images:** untouched (another session is replacing them).
- **Suggestions** stay offered with a price and Add button, never pre-ticked (owner ruling on "the total leads").
- **Outline loops:** untouched.

## Testing Decisions

- A good test checks behaviour through the draft rules, not the DOM: given a draft missing X, `problems()` reports a problem whose `field` is X's key, in the order the fields appear on the step.
- Tested: the draft problems for squad, edition, games, and consent; each section's `problems()` returns field keys (world, vehicles, phone, story, keepsakes). Prior art: `tests/order.test.ts`, `tests/section-*.test.ts`, `tests/purpose.test.ts`.
- DOM behaviour (scroll, outline, focus), the card footer and the world picker are verified live in the browser at 390×844 and desktop, with screenshots; the site has no DOM test environment (`environment: node`).
- The full suite, `tsc` and `vite build` must pass.

## Out of Scope

- Couples images and the "For two?" card (another session).
- Outline loop media and choosing events to showcase (future work).
- Any price, edition or copy change.
- The Instagram poll assets.

## Further Notes

- Uncommitted edits already in the tree (explore/index/order/privacy/terms.html, styles.css, pnpm files, a logo webp) belong to another session; commit only this run's files.
- Future-work topics to seed: couples images for the home card and ads; outline loops and which game events to showcase; the Instagram poll; the Co-op and Team packs; the Love kit in the engine once a couple pays.
