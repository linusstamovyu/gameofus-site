# Game of Us — live site customer-journey audit

Audited 2026-09-16 against https://gameofus-site.linusstamovyu.workers.dev/ in the Browser pane.
Desktop = 1024×768 viewport (the pane's own size; screenshots reported in an 800×600 frame).
Mobile = 375×812 preset. All copy below is quoted verbatim from the live pages.

Pane caveats applied: the hero beach canvas and the animated card previews run on `requestAnimationFrame`,
which the hidden pane freezes, so a static beach or a dark preview box was NOT counted as a site bug
(see the note in §3 on the Explore previews). The payment backend is expected to be closed until 4 Oct;
that is noted, not scored.

Important: the brief for this audit says "up to 3/6/10 characters at 799/1,299/1,999 DKK". **The live
site says 2/6/10 characters at 799 / 1,049 / 1,399 DKK** (normal 1,049 / 1,399 / 1,799). Every figure
below is what the site actually shows; the brief-vs-site mismatch is itself listed in §4.

---

## 1. Page inventory

### 1.1 Home `/` (title: "Game of Us · A retro RPG starring your friends")

Document: `lang="en"`, 5,437px tall at desktop, 9,324px tall on mobile (11.5 phone screens).

**Country strip (desktop only — `display:none` on mobile)**: `🇩🇰 Shopping from Denmark? Prices are shown in DKK.`
buttons `Yes` / `Change`. It is `position: sticky; z-index: 40` and sits ON TOP of the nav (see §5 F-2).

**Nav "Main"** (sticky, z-index 30): logo link `Game of Us` (→ `#top`) with a `Draft` pill next to it ·
links `The game` (#features) · `Explore` (explore.html) · `The squad` (#squad) · `How it works` (#how) ·
`Prices` (#prices) · `FAQ` (#faq) · country button `🇩🇰 DKK` (accessible name "Shopping from Denmark,
prices in DKK. Change country") · button link `Start your order` → `order.html`.
- At 1024px `The squad` and `FAQ` are already hidden (width 0). At 375px **all six links are hidden and
  there is no hamburger** — the phone nav is logo + DKK + `Start your order` only.

**Hero (banner, playable beach canvas)**
- Eyebrow: `A RETRO RPG STARRING YOUR FRIENDS`
- H1: `Your friends. Your places. Your game.` (last two words teal)
- Sub: `We turn your group's real photos, places and in-jokes into a game you play together. This beach is a real one: walk around and meet the squad.`
- Buttons: `Take the tour ▶` (starts the 7-stop guided tour overlay) · `See everything in it` → explore.html
- Hint line: `Or just walk around` (button) `· Tap or click the sand to walk · WASD Shift E after clicking the world`
- Top-right: `WORLD` combobox `Albufeira beach` with options Albufeira beach ("The real trip") / Mars base / Neon city / Jungle temple / Ski village / Fairy-tale land
- Bottom bar: `GUIDED TOUR · 7 stops · Albufeira beach` · `◀` · `Start ▶`
- Under the canvas: `Rather read than walk? Everything on the beach is also on this page.` · link `Scroll to the site ↓` (#features)
- Guided tour stop 1 (verified): `YOUR SQUAD` / `Everyone's in it. The dog counts.` / `CHARM Nala · Signature move: Derp Beam` / `Every friend becomes a fighter with a type, stats and signature moves. Nala is in as herself, same face, same tongue. Pick how many of you there are; the photos can come last.` then three tiles `Standard 799 DKK 2 friends · Deluxe 1,049 DKK 6 friends · Ultimate 1,399 DKK 10 friends` · `Next stop ▶`. So a price IS reachable above the fold — but only after pressing "Take the tour".

**Section "WHAT'S IN YOUR GAME"** (#features, desktop y=762; mobile y=812)
- H2: `A real adventure, not a greeting card`
- Lede: `Every game is built on the same engine as our flagship: an overworld to explore, turn-based battles with types and evolutions, and a story that ends somewhere only your group understands.`
- Three cards: `TURN-BASED BATTLES` (animated battle: "Rico used Casual Nutmeg!") · `YOUR PLACES, AS THE MAP` (Nala on the marina, has a `❚❚` pause button) · `A STORY THAT REALLY HAPPENED` (Elias on the avenue, pause button).

**Section "MEET THE SQUAD"** (#squad, desktop y=1,521; mobile y=2,470)
- H2: `From your camera roll to the character select`
- Lede: `These are the real people from our flagship game, Lads Trip to Albufeira, next to the characters we made from their photos. The dog counts.`
- Six cards, each `REAL PHOTO →` game sprite, name + type chip, one line, `Signature move: …`:
  Rico CHILL · Kai SPEED · Elias CHILL · Ethan CHARM · Nala CHARM · Coco CHARM.
- Note under the grid: `Everyone shown agreed to appear. We never use photos of children, and your source photos are deleted 30 days after delivery.`

**Section "HOW IT WORKS"** (#how, desktop y=2,606; mobile y=4,151)
- H2: `Three steps, about four weeks` · lede `You bring the stories. We do the building, and you see the game twice before it's finished.`
- Step 1 `Tell us about your group` — `Build your order online, then a 20-minute call.` bullets: One photo of each friend, head to feet / Your places, as photos or map pins / The in-jokes and the night everyone remembers · `Day 1–5`
- Step 2 `We build it` — `You approve the cast first, then play a preview.` bullets: Character select preview to check the faces / A playable preview link / Two rounds of changes included · `Day 5–26`
- Step 3 `Play it together` — `A private link that runs in the browser, nothing to install.` bullets: Play on one laptop or everyone on the same wifi / A 60-second trailer to share / Bugs fixed free for 30 days · `Day 28`
- CTA: `Want to see what can go in it first?` `Explore every game, vehicle and extra ▶` → explore.html

**Section "PRICES"** (#prices, desktop y=3,363 = 4.4 screens down; mobile y=5,615 = 6.9 screens down)
- H2: `Pick your cartridge`
- `Split between six friends, a Deluxe game is 175 DKK each. Pay in full at order, or spread it with Klarna.`
- `Founder prices for the first 30 orders. The crossed-out price is the normal price after that. Prices in DKK, including VAT where it applies.`
- Card **Standard** · badge `2 WEEKS` · `FOUNDER PRICE 400 DKK per person` · `799 DKK for 2 friends ~~1,049 DKK~~` · `Worth 2,300 DKK as add-ons` · 2 characters from your photos / 1 home zone, 1 big game and 3 minigames / A short story, about 20–30 minutes / 1 round of changes · CTA `Choose Standard` → `order.html?edition=standard`
- Card **Deluxe** · badge `MOST PICKED` · `175 DKK per person` · `1,049 DKK for 6 friends ~~1,399 DKK~~` · `Worth 9,100 DKK as add-ons` · 6 characters, one with an evolution / 3 zones, 3 big games and 6 minigames / A main quest from a real memory / Same-wifi multiplayer / 2 rounds of changes · CTA `Choose Deluxe` → `order.html?edition=deluxe`
- Card **Ultimate** · badge `6–10 WEEKS` · `140 DKK per person` · `1,399 DKK for 10 friends ~~1,799 DKK~~` · `Worth 27,300 DKK as add-ons` · 10 characters, all with evolutions / 6 zones, even a second country / 5 big games and all 12 minigames / Illustrated cutscenes and online multiplayer / 3 rounds of changes · CTA `Choose Ultimate` → `order.html?edition=ultimate`
- Line: `Add-ons: Extra friend from 159 DKK · Big game 449 DKK · Extra zone from 299 DKK · Voice line 129 DKK · Party Mode (18+) 299 DKK · Flex Pass 129 DKK`

**Section "MADE FOR"** (no H2 at all — eyebrow only; tiles are not links)
`Stag & hen dos` — A hype gift before the trip, or a memorial after it. · `Group trips` — Turn the holiday photos into the map. · `Big birthdays` — Reveal it at the party, on the TV. · `Christmas` — Order a Deluxe game by 8 Nov to have it for Christmas.

**Section "QUESTIONS"** (#faq, desktop y=4,283; mobile y=7,643) — H2 `Before you order`, 7 accordions:
1. `What do you need from us?` → `3–5 photos of each friend (face, full body, a typical outfit), photos or pins of your places, and the stories. Every person in the game signs a short consent form.`
2. `What do we play it on?` → `Any laptop or desktop browser, nothing to install. It's played with a keyboard; phones show a short "open this on a laptop" card.`
3. `Can we change things?` → `Yes. You approve the faces first, then play a preview. Standard includes one round of changes, Deluxe two, Ultimate three. A Flex Pass adds one more.`
4. `What if we don't like it?` → `You see your characters within 5 days. If you don't love the preview, you get a full refund before we build the game.`
5. `What happens to our photos?` → `They're only used to make your game, and deleted 30 days after delivery. We never use photos of children, celebrities or brands.`
6. `Can we split the cost?` → `The organiser pays once, in full or spread with Klarna. Your order summary shows each friend's share and a message to send the group.`
7. `Is the art made with AI?` → `We use AI tools to help draw characters from your photos, then check and fix every image by hand. Nothing is published without your approval.`

**Closing band** — H2 `Put your group in a game` · `Christmas order deadlines: Ultimate 25 Oct · Deluxe 8 Nov · Standard 29 Nov.` · CTA `Start your order ▶` → order.html

**Footer**: `© 2026 Game of Us · custom retro RPGs starring your friends · Copenhagen` · `Privacy` · `Terms of sale` · `· Draft design, not a live shop`

Meta: description present; `og:title`, `og:description`, `og:image=assets/share.jpg` (**relative URL**), `twitter:card=summary_large_image`, `theme-color #7a4a26`; favicon is an inline SVG data-URI diamond (no PNG / apple-touch-icon). Fonts: Pixelify Sans (display) + Trebuchet MS stack (body) from Google Fonts. Zero `<form>`, zero email inputs, zero `mailto:`, zero external links on the whole page.

### 1.2 Explore `/explore.html` (title "Explore everything in your game · Game of Us")

6,469px desktop / 9,678px mobile. **Nav differs from home**: logo · `The game` (./#features) · `Explore` · `How it works` (./#how) · `Prices` (./#prices) · DKK · `Start your order` — no `The squad`, no `FAQ`. On mobile all links hidden again.

- Hero: eyebrow `EXPLORE` · H1 `Everything that can go in your game` · `No photos needed to look around. Tap ♥ on anything you like, and it's already picked when you start building.` · CTA `▶ Or walk the beach tour` → `./#top`
- Sticky sub-nav: `Big games` `Party minigames` `Getting around` `Your world` `The phone` `Your story` `Extras & keepsakes` (horizontally scrolls on mobile, third item cut to "Getting aro…").
- H2 `Big games` (9 cards, each with a ♥ "Add … to your favourites" button and a badge `Standard 1 · Deluxe 3 · Ultimate 5`): Kart Race · Arcade Brawler · Build & Climb · Mine & Craft · Gym Puzzle · Photo Shoot · Escort Errand · Memory Quiz · Chase & Showdown. CTA `Add these to my game ▶` → `order.html?from=explore&step=games`
- H2 `Party minigames` (12, badge `Standard 3 · Deluxe 6 · Ultimate all`; King's Cup and The Bus badged `Party Mode (18+)`): Blackjack 21, King's Cup, The Bus, Push Your Luck, Three-Cup Shuffle, Landmine, Reaction Light, Stop the Pour, Safecracker, Mini Battleships, Takeaway Nim, Tic-Tac-Toe. Same CTA.
- H2 `Getting around` (`Standard 1 · Deluxe 3 · Ultimate all`): Cars, Rental scooters, Taxi, Mine carts, Karts, `Your own car` (Add-on). CTA → `…step=vehicles`
- H2 `Your world` (`Standard 1 · Deluxe 3 · Ultimate 6`, no hearts): Home base, Your town, Beach, Harbour, City, Stadium, Nightlife, Countryside, `Your bar's sign` (Add-on). CTA → `…step=world`
- H2 `The phone`: Photos app (`Standard 3 · Deluxe 6 · Ultimate 12`), Phone calls (From Deluxe), Breaking news (From Deluxe), Maps app (Free), Games app (Free). CTA → `…step=phone`
- H2 `Your story`: The memory (Always included), The villain (Always included), Cutscenes (From Deluxe), The ending (Add-on). CTA → `…step=story`
- H2 `Extras & keepsakes`: Evolutions (From Deluxe), Signature moves (`Standard 1 · Deluxe 1 · Ultimate 2`), Voice lines (From Deluxe), Talking face (Add-on), Catch the squad (Free), Your own items (Add-on), Trailer video (Add-on), Printable gift card (Add-on). CTA → `…step=extras`
- Closing: H2 `Seen enough? Put your group in it` · `Pick an edition, add your friends' photos last. It saves on this device as you go.` · CTA `Start building ▶`
- Footer identical to home. **Not one price on the whole page** — only "Add-on / Free / From Deluxe / Standard 1 · Deluxe 3".

### 1.3 Order `/order.html` (title "Build your game · Game of Us"; the URL rewrites to `/order`)

Nav: logo · text `Build your game` · `🇩🇰 DKK` (no `Start your order`, correctly). Footer: `© 2026 Game of Us · custom retro RPGs starring your friends` (no "Copenhagen") · Privacy · Terms of sale · Draft design, not a live shop.

Banner at the top of every visit: `Ordering opens on 4 October. You can build your order now; it's saved on this device.`

**Gate ("BEFORE YOU START")** — H1 `A couple of things first`
`Your game is made from photos of your friends, so we need to know they're happy with that, and whether your group is old enough for Party Mode.`
- H2 `Photos of your friends` — 4 bullets (photo stays on device until Pay/Send; photo check runs in browser; each friend gets a consent form; no under-18s) · checkbox `Everyone in the photos has agreed to be in the game.` · `How we handle the photos and how long we keep them is in our privacy policy. The terms of sale apply when you order.`
- H2 `Is everyone in your group 18 or over?` — `This decides whether Party Mode (18+, 299 DKK) and its drinking minigames can be added.` radios `Yes, everyone is 18+` / `No, not everyone`
- CTA `Start building ▶`. Pressing it empty shows two red lines above the button: `Confirm that everyone in the photos has agreed to be in the game.` / `Tell us whether everyone in your group is 18 or over.` The gate is remembered; a second visit skips straight to Step 1.

**Stepper** (10 numbered circles; label shown only for the current step): 1 Your squad · 2 Your edition · 3 Games · 4 Your world · 5 Getting around · 6 The phone · 7 Your story · 8 Extras · 9 Keepsakes · 10 Review. On mobile it wraps to two rows and the page auto-scrolls so only `7 8 9 10` stay visible above the panel.

**Sticky bottom order bar** on every step: `◀ Back` · `◆ Deluxe 1,049 DKK ~~1,399 DKK~~ founder price` · `Next ▶` (`Review ▶` on step 9, nothing on step 10). Deluxe is pre-selected on a fresh visit.

Step by step (what is asked, what is required to pass):
1. **Your squad** — H1 `Who's in the game?` · `Add each friend with one photo: just them, standing, face clear, head to feet. We pick out the full body and the face from it; the final character is drawn by hand.` · `No photos to hand? You can add them last, before you pay. Just show me what's in it ▶` (→ explore) · inline edition radios `Standard 2 characters / Deluxe 6 characters / Ultimate 10 characters` · privacy note · **six pre-created empty slots** each with `Their name, as it should appear in the game`, `Remove slot`, `Drop one photo here`, `Choose a photo`, `Take a photo` · `+ Add a character  Extra character · 399 DKK each, beyond Deluxe's 6` · summary `0 of 6 characters added · 6 empty slots to fill or remove`. Removing slots down to one shows the nudge `Deluxe holds 6 characters and you have 1. Standard would cost 250 DKK less for this squad. Switch to Standard`; the last slot cannot be removed (`A game needs at least one character`). Required to pass: nothing.
2. **Your edition** — H1 `Pick your edition` · `You have 0 friends in the squad. Every edition is the same kind of game; bigger ones hold more people, places and games.` · `Founder prices for the first 30 orders.` · the same three cards as the home page with `Fits your squad` and `Choose …` / `✓ Deluxe selected`. Notice at top: `No rush on the photos: carry on picking, and finish your squad before you pay.`
3. **Games** — H1 `Choose the games` · `Big games 1 of 3 big games included` (9 clickable cards with live canvas previews) · `Invent a game — Got a memory that needs its own rules? Describe it and we'll quote it (from 1,299 DKK). Orders with a custom game are sent as a request, not paid straight away.` · `Party minigames 0 of 6 minigames included` · `Party Mode (18+) · 299 DKK: drinking stakes on the minigames, sips on wins and a Drunk Meter. Unlocks King's Cup and The Bus.` · 12 minigames grouped Cards / Dice & luck / Reflex / Strategy. **Required: at least one big game** (`Pick at least one big game, or describe your own.`). Page is 5,323px tall on mobile.
4. **Your world** — H1 `Where does your story happen?` · `Places 0 of 3 places included` · `Each place is built in the art style closest to it. Want it to look like the real thing? Build it from your photos (899 DKK as an extra place). Included places cover photo places first.` · `Add your home base` → a place card: type chips Home/Town/Landmark/Another country · `Name` (placeholder `Our flat in Nørrebro`) · `Closest art style` tiles (Home ✓, Town, Beach, Harbour, City, Stadium, Nightlife, Countryside) · `Build it from our photos (899 DKK if it's an extra place)` `Add photo` · `Map link or address (optional)` · `Anything we should know (optional)` · `Add another place` · `Shop and bar signs — Your real local, kebab shop or corner shop on a sign in the game. 59 DKK each.` `Sign name` `Add sign`. **Required: a home base with a name** (`Add at least your home base.` / `Give place 1 a name.`).
5. **Getting around** — H1 `How do you get around?` · `Pick the ways to travel in your game. Nothing here is required: walking works fine too.` · `Vehicle types 0 of 3 vehicle types included` (Cars, Rental scooters, Taxi, Mine carts, Karts) · `Your own car — Put a real car from the group in the game, drawn from a photo: 399 DKK each, up to 5.` `Add a car`. Nothing required.
6. **The phone** — H1 `What's on the phone?` · `Photos app 0 of 6 photos included … Extra photos are 59 DKK each.` `Add photos` · `Calls and news mails 0 of 1 calls and mails included … 129 DKK each, or 249 DKK drawn specially for you` `Add a call` `Add a news mail` · `Apps Free: Maps app ✓ Games app ✓`. Nothing required.
7. **Your story** — H1 `Tell us the story` · textarea `The night everyone still talks about` (`0 / 4000 · at least 20 characters, or add a voice note`) · file button `Record or attach a voice note` · `Tone` Lads / Romance / Family / Corporate · `Language the game is written in` (select) · `The boss — Who or what the squad is up against (optional)` · `Key moments 0 of 1 cutscenes included … Up to 8 beats` `Add a key moment` · `The ending … 99 DKK, or 399 DKK for a bespoke reveal scene.` radios No special ending / Dedication / Birthday / Proposal. **Required: ≥20 characters or a voice note.**
8. **Extras** — H1 `Extras for your characters` · `Most of these are made for a particular friend, so add your squad's names first.` `Back to your squad` · Evolutions `0 of 1 evolutions included … templates (199 DKK) … we design one (449 DKK)` · Talking faces `149 DKK each` · Voice lines `0 of 1 voice lines included (129 DKK each beyond)` `Add a voice line` · Signature moves `One move per character included; extras are 99 DKK each, or 249 DKK with its own custom effect` · Custom items and drinks `49 DKK … or 99 DKK drawn for you` `Add an item` · Playing together: `Recruit your squad … Free` · Multiplayer: `Just one player ✓` / `Same wifi … Included` / `Online … We host it for a year: 299 DKK`. Nothing required.
9. **Keepsakes** — H1 `Keepsakes and delivery` · `Trailer video — A 60-second trailer of your game to share with the group · 299 DKK` · `Printable gift card — A PDF with a QR code to the game, to hand over on the day · 59 DKK` · `Delivery: Rush delivery · +50% of your order (about +525 DKK right now)` · `Need it by a certain date? (optional)` · `Deluxe is usually ready about 4 weeks after we have everything we need (photos and answers). Rush roughly halves that.` · `Peace of mind: Add a Flex Pass · 129 DKK`. Nothing required. Bar button becomes `Review ▶`.
10. **Review** — H1 `Check it and send it` · `Here's your game. Change anything by going back; nothing is sent until you press the button at the bottom.` · `Your squad` (empty — no line, no warning, no Change link) · `◆ Deluxe edition` · `Big games: Kart Race` · `Party minigames: none` · `Your world Change` · `The phone Change` · `Your story Change` · `Your price` table `Deluxe edition 1,049 DKK / Total, founder price 1,049 DKK ~~1,399 DKK~~` · `Bought as separate add-ons, what's in your edition would cost about 9,100 DKK.` · Flex Pass checkbox · `Love the preview or your money back: you'll see your characters within 5 days, and if you don't like them we refund you in full before we build the game.` · `Your details`: `Your name`, `Email, for your receipt and the preview` · `Everyone in your group is 18 or over. Change` · consent checkbox (pre-ticked from the gate) · `I agree to the terms of sale. Start work straight away: I understand my right to cancel ends once production starts, and until then I can cancel for a full refund.` · CTA `Pay 1,049 DKK ▶` · `Card, Apple Pay, Google Pay, MobilePay or Klarna (pay in 3), on Stripe's secure checkout.`
    Pressing Pay empty lists nine red bullets: `Slot 1 is empty — add a friend or remove the slot.` … `Slot 6 is empty …` (six identical lines) · `Add your name.` · `Add an email address we can reach you on.` · `Tick that we can start work straight away.` Photo upload could not be exercised from the pane, so the closed-checkout message itself was not seen.

### 1.4 Privacy `/privacy.html` ("Privacy · Game of Us")
Nav: logo only. H1 `Privacy policy` · `Last updated 15 September 2026` · orange box: `Draft. This policy follows the Game of Us plan outline and must be checked (Erhvervshus session or paid review) before the site takes any payment. Items in square brackets are still to be filled in.` · H2s: Who is responsible for your data (`Game of Us, run by [owner's full name], Copenhagen, Denmark. [CVR number once registered.] Contact: [contact email: to be added before launch].`) · What we collect · Why we use it · **Emailing yourself a list from Explore** · Who else handles it (OpenAI, Anthropic, Cloudflare R2, Stripe, Klarna, Resend) · Photos while you build your order · How long we keep it · Children · Your rights · Complaints (Datatilsynet) · Changes. Footer: `Game of Us Home · Terms of sale`.

### 1.5 Terms `/terms.html` ("Terms of sale · Game of Us")
Same shell and same `Draft.` box. H2s 1–13: Who we are · What we sell · Ordering · Prices and payment (`Prices are shown in Danish kroner, pounds or euros depending on the country you choose, and include [moms/VAT, once registered]`) · Delivery (`Standard: about 2 weeks. Deluxe: about 4 weeks. Ultimate: 6–10 weeks.`) · Right of withdrawal · Changes (incl. `Preview guarantee … within 5 days … tell us within 3 days`) · Content rules · Licence · Hosting (`2 years (Standard), 3 years (Deluxe) or 5 years (Ultimate, which also includes an offline copy). [What happens afterwards: renewal price or download.]`) · Bugs and complaints · Liability · Law. Footer: `Game of Us Home · Privacy`.

### 1.6 404 (`/this-page-does-not-exist`, title "Lost · Game of Us")
Navy page, one cream card: `You walked off the map` · `There's nothing at this address. The beach is still where you left it.` · button `Back to the beach` → `/`. No nav, no footer, **system sans font (not Pixelify)** — the one page off-brand.

---

## 2. First 5 seconds

### Desktop (1024×768)
Above the fold: brown nav (logo, `Draft` pill, 4 of 6 links, DKK, green `Start your order`), the DKK country strip, and the beach canvas (y 129–740) with the cream title card on its left half: eyebrow, H1 `Your friends. Your places. Your game.`, the two-sentence sub, `Take the tour ▶`, `See everything in it`, the WASD hint. Right half: sprites walking on sand, `MAP`/`STORY` signposts, the world dropdown, the tour bar. Just under the fold: `Rather read than walk? …` / `Scroll to the site ↓`.

- **What is sold**: implied ("a game you play together" made from "your group's real photos"), not stated as a product ("a personalised retro RPG, delivered as a link"). The word "retro RPG" is only in the 15px eyebrow.
- **For whom**: "your friends / your group" — stag dos, trips, birthdays and Christmas are 4.4 screens down.
- **At what price**: **nothing** above the fold. First price on screen is the guided-tour stop 1 (only if you press `Take the tour`), otherwise the price section at y=3,363.
- **What to do next**: three competing verbs — `Take the tour`, `See everything in it`, `Start your order` — plus "walk around". None says "see prices".
- **Proof**: none visible; the "REAL PHOTO → in game" cards are at y=1,817.

### Mobile (375×812)
Above the fold: nav (logo, `🇩🇰 DKK`, `Start your order` — the green button runs to the viewport's right edge with its corner clipped in the screenshot), then the card fills ~85% of the width: eyebrow (wraps to 2 lines), H1 at 28px (2 lines), sub (4 lines), `Take the tour ▶`, `See everything in it`. The beach is a thin strip around the card; the `Albufeira beach ▾` select and the tour bar (`GUIDED TOUR 7 stops · Alb… Start ▶`) sit at y≈560–680; `Rather read than walk?` and `Scroll to the site ↓` are at the very bottom.

- No menu. No price. No occasion. `Start your order` is the only nav action and it leads to a consent gate before any product info.
- Price section starts at **y=5,615 → 6.9 phone screens down**; FAQ at 9.4 screens; the whole page is 11.5 screens.
- The country strip (`Shopping from Denmark?`) is hidden on mobile, so a phone visitor never sees the currency question — fine — but also never sees the "prices are in DKK" reassurance until the price section.

---

## 3. Missing things (checklist)

| Check | Status | Evidence |
|---|---|---|
| Value proposition in one line | Partial | H1 is a slogan; "what it is / how delivered / how long" is spread over three sections. Meta description (`We turn your group's real photos, places and in-jokes into a retro RPG you play together in the browser. Made for stag dos, group trips, big birthdays and Christmas.`) is actually the clearest sentence on the site and appears nowhere on the page. |
| Reviews / testimonials / star rating | **Missing** | Zero on any page. |
| Reaction video / "watch the reveal" | **Missing** | The only video-ish thing is the animated beach. No clip of a real group playing. |
| "As seen in" / press / social handles | **Missing** | No Instagram/TikTok link anywhere (0 external links site-wide). |
| Who is behind it (founder, face, story) | **Missing** | "Copenhagen" in the footer; legal pages say `[owner's full name]`. A one-person business selling a personal product with no person on it. |
| Contact (email / form / chat) | **Missing** | 0 `mailto:`, 0 forms. Both legal pages say `Contact: [contact email: to be added before launch]`. |
| Returns / refund guarantee | Present but buried | FAQ 4 and the Review step (`Love the preview or your money back`). Not near the price cards. |
| Payment logos / security | Text only | `Card, Apple Pay, Google Pay, MobilePay or Klarna (pay in 3), on Stripe's secure checkout.` appears only under the Pay button on step 10. No logos anywhere on the home page. |
| CVR / company identity | **Missing** | `[CVR number once registered.]` on both legal pages. |
| Pricing: per-person vs total | Present, mixed | Cards lead with `175 DKK per person` (big) then `1,049 DKK for 6 friends` (small). The order bar shows only the total. |
| Pricing: VAT | Ambiguous | Home: `including VAT where it applies`; Terms: `include [moms/VAT, once registered]`. |
| Pricing: non-DKK visitors | Present | Country picker gives DKK/GBP/EUR (11 countries). But Sweden and Norway are priced in EUR, not SEK/NOK. |
| Delivery time near the price | Partial | Badges `2 WEEKS` / `6–10 WEEKS` on Standard and Ultimate; Deluxe's badge is `MOST PICKED`, so the most-picked edition shows no delivery time on its card. |
| FAQ coverage — NOT answered | Gaps | Do I need every friend's photo *before* ordering? (yes/no — the order page says "add them last", the FAQ says "3–5 photos"). What is the 20-minute call? Can I give it as a gift / does the recipient see it before Christmas? How long is the game (only Standard says 20–30 min)? Does it work on a phone for *playing* (FAQ says no)? How many players at once? Who owns the art / can we post it? What if a friend refuses consent after I pay? Can I order for a group I'm not in? Is Danish available (order step 7 has a language select but nothing says which languages)? Hosting duration (only in Terms). Can I pay in instalments (Klarna is named but "pay in 3" only appears on step 10). |
| Urgency / scarcity | Present, weak | `Founder prices for the first 30 orders` is a 14px line under the H2; no counter ("17 of 30 left"), not repeated in the order bar or the Review total. Christmas deadlines appear only in the closing band and the Christmas tile. |
| Email capture / waitlist | **Missing** | Ordering is closed until 4 Oct and there is no "tell me when it opens" anywhere. The privacy policy has a whole section `Emailing yourself a list from Explore` and a marketing tick-box, but **no such email field exists on the Explore page**. |
| Sharing | **Missing** | No share buttons, no "send this to the group". Hearts on Explore save to this device only. |
| Footer basics | Partial | Copyright, Privacy, Terms, "Copenhagen". No address, no CVR, no email, no socials, no language switch. |
| Favicon | Present (SVG data URI) | Works in modern browsers; no PNG fallback, no `apple-touch-icon`, so an iPhone "Add to Home Screen" gets a screenshot tile. |
| Meta / OG | Present, one bug | `og:image` is the **relative** path `assets/share.jpg`; Facebook, iMessage, WhatsApp and Slack require an absolute URL, so link previews from Instagram DMs will have no image. No `og:url`, no `twitter:image`. |
| Language switch | **Missing** | `lang="en"` only. A Danish shop, Danish audience, DKK prices, but every word is English and there is no DA toggle. |
| Accessibility: contrast | Mostly fine | Measured: H1 14.4:1, body 9.7:1, FAQ 13.8:1, strike-through price 6.1:1. **Fails**: the closing band's white-on-teal deadline line at 3.30:1 (16px normal text, AA needs 4.5). Nav links 4.98:1 (pass, barely). |
| Accessibility: alt text | Good | All 12 home `<img>` have alt; Explore/Order previews are CSS/canvas with card text. |
| Accessibility: keyboard | Good/partial | `:focus-visible` teal 3px outline, skip link present, dialog role on the tour card. But order-flow **stepper buttons, edition radios, the file "Choose a photo" button and "+ Add a character" have no accessible name** (read as unnamed `button`/`radio`), and the story textarea is labelled only by its placeholder. The squad H3s read as `Ricochill`, `Kaispeed` (name + type chip concatenated). |
| 404 | Present, off-brand | In-character copy, but system font and no nav/footer. |
| Console / network hygiene | Minor | Two real 404s on Explore: `/order-assets/order-assets/veh_car.webp` and `/order-assets/order-assets/veh_taxi.webp` (doubled path). |
| Explore previews | Verify on a real device | In the pane, 5 of the 9 big-game canvases (Gym Puzzle → Chase & Showdown) rendered as flat dark boxes on Explore while the same cards animated fine on order step 3; all 53 `.ex-art` images return 200. Most likely the frozen-rAF pane limitation, but worth one look on a phone. |

---

## 4. Inconsistencies

**Prices and counts**
1. **Brief vs live site**: brief says 3/6/10 characters at 799/1,299/1,999 DKK; the site says **2/6/10 at 799/1,049/1,399** (normal 1,049/1,399/1,799). One of the two is stale.
2. `Extra friend from 159 DKK` (home add-ons line) vs `Extra character · 399 DKK each, beyond Deluxe's 6` (order step 1). 159 appears nowhere in the order flow.
3. `Extra zone from 299 DKK` (home) vs `Build it from your photos (899 DKK as an extra place)` (order step 4). 299 appears nowhere in the order flow.
4. `Big game 449 DKK` (home) — order step 3 shows no price for an extra big game at all; the only number is `Invent a game … from 1,299 DKK`. Meanwhile `449 DKK` is the designed-evolution price on step 8.
5. `A 60-second trailer to share` is listed as **included** in How-it-works Step 3 and in the Deluxe-era copy; Explore badges `Trailer video` as `Add-on`; order step 9 prices it at **299 DKK**.
6. `Voice line 129 DKK` (home) vs Explore `Voice lines — From Deluxe` vs step 8 `0 of 1 voice lines included · 129 DKK each beyond`. Standard buyers cannot tell if they can buy one.
7. Online multiplayer: Ultimate card says `Illustrated cutscenes and online multiplayer` (included); step 8 says `Online … We host it for a year: 299 DKK`.
8. `Two rounds of changes included` (How it works, Step 2 — reads as universal) vs Standard `1 round of changes`.
9. Step 1 summary says `0 of 6 characters added · 1 empty slot` and, two lines later, `Deluxe holds 6 characters and you have 1` — an empty slot is counted as a character in one sentence and not the other.
10. Step 2 says `You have 0 friends in the squad` while step 1's bar still charges for Deluxe (6).
11. Photo requirement: FAQ `3–5 photos of each friend (face, full body, a typical outfit)` vs How-it-works `One photo of each friend, head to feet` vs order `one photo of each friend`.

**Time**
12. H2 `Three steps, about four weeks` and `Day 28` describe Deluxe only; Standard's badge says `2 WEEKS`, Ultimate `6–10 WEEKS`, and the Deluxe card carries no time badge at all.
13. `Build your order online, then a 20-minute call.` — the call is never mentioned again (not in the order flow, Review, FAQ or Terms).
14. `Ordering opens on 4 October` (order page) vs Christmas deadlines already advertised as if orderable (`Order a Deluxe game by 8 Nov`).

**Terminology and tone**
15. Friends / squad / group / characters / mates / lads / "cast" are used interchangeably; the price H2 is `Pick your cartridge` while every other surface says "edition". Explore's last section is `Extras & keepsakes`; the order stepper splits it into `Extras` and `Keepsakes`.
16. Review H1 `Check it and send it` / `nothing is sent until you press the button` — the button says `Pay 1,049 DKK ▶`. "Send" vs "pay" (the gate also says `until you press Pay or Send`).
17. CTA labels: `Start your order` (nav, home), `Start building ▶` (Explore, order gate), `Choose Deluxe` (cards), `Add these to my game ▶` (Explore), `Take the tour ▶` / `Start ▶` (hero). Five verbs for the same journey.
18. Legal-page draft box says `Erhvervshus session` (Danish) on an otherwise English page.

**Navigation / chrome**
19. Nav is different on every template: home 6 links; Explore 4 (no `The squad`, no `FAQ`); order none (label `Build your game`); privacy/terms logo only; 404 nothing. Home's `The squad`/`FAQ` links vanish at 1024px, all links vanish at 375px with no menu.
20. Footer differs: home/explore have `· Copenhagen`; order drops it; privacy/terms use `Game of Us Home · Terms of sale` / `Home · Privacy` and omit the copyright line.
21. `Draft` appears in four places (nav pill, footer line, both legal boxes) — a paying visitor is told four times that this is not real.

**Visual**
22. 404 page uses the system sans font; every other page uses Pixelify Sans for headings.
23. Mobile order bar: `1,049 DKK` wraps to `1,049` / `DKK` on two lines beside the strike-through and `founder price`, and the `◀ Back` button's arrow is a different glyph size from `Next ▶`.
24. The sticky country strip (z 40, 41px) paints over the sticky nav (z 30) once you scroll on desktop: the `Start your order` button spans y 8–54, so 33 of its 46px are hidden — the primary CTA is ~70% covered on every scrolled desktop screen.

**Currency**
25. Sweden and Norway are offered in EUR; every other non-DKK/GBP country is EUR too, so "Change country" is really a three-currency switch dressed as eleven flags.
26. GBP rounding: `£89.99 / £119.99 / £159.99` (retail .99 style) vs DKK `799 / 1,049 / 1,399` (round) — two pricing personalities.

**Copy that mentions things that aren't there**
27. Privacy: `Emailing yourself a list from Explore` and a marketing opt-in box — no email field exists on Explore.
28. Privacy: `your birth year if you add Party Mode` — the order asks only a yes/no 18+ radio, never a birth year.
29. FAQ 6: `Your order summary shows each friend's share and a message to send the group` — the Review step shows neither a per-friend share nor a message.
30. Home FAQ says the game is keyboard-only and phones show an "open this on a laptop" card, yet the hero invites phone visitors to `Tap or click the sand to walk`.

---

## 5. Customer-journey friction

Persona: a woman on Instagram, phone in hand, wants a Christmas present for her five friends from the summer trip. Budget-curious, never heard of the brand.

| # | Where | Friction | Impact |
|---|---|---|---|
| F-1 | Home, mobile fold | She lands on a game she is invited to play, not a product. No price, no "for groups of 2–10", no occasion, no menu. The only nav action is `Start your order`, which she will not press before knowing the price. | **High** |
| F-2 | Home, desktop after scroll | The country strip covers 70% of the sticky `Start your order` button (see §4-24). On her laptop later, the CTA is half a button. | High (desktop only) |
| F-3 | Home, mobile | Prices are 6.9 screens down; "Made for … Christmas" is 9 screens down; no in-page jump because the nav links are hidden. | High |
| F-4 | Price cards | "Five friends" → is that 5 or 6 characters? Cards say `1,049 DKK for 6 friends` and `175 DKK per person`; Standard holds `2 characters`. She has to infer that she + 5 = Deluxe, and that Standard is useless for her. No "how many are you?" selector. | Medium |
| F-5 | Price cards | Deluxe (the one she needs) has no delivery-time badge; the deadline `8 Nov` is only in the Christmas tile and the closing band. She cannot tell from the card whether a mid-November order arrives in time. | Medium |
| F-6 | Everywhere | No reviews, no founder, no contact, `Draft` ×4, `[contact email: to be added]`. Sending 1,049 DKK of friends' photos to an anonymous site is the biggest single reason to bounce. | **High** |
| F-7 | Order gate | Before seeing anything she must tick `Everyone in the photos has agreed to be in the game` and answer the 18+ question. It's a surprise gift — she hasn't asked anyone. The gate blocks with two red errors if she doesn't. | High |
| F-8 | Step 1 of 10 | The first thing asked is photos: six empty slots, each with "Drop one photo here / Choose a photo / Take a photo". The reassurance `You can add them last, before you pay` is a 14px line. Ten steps are announced up front. | Medium-High |
| F-9 | Steps 3, 4, 7 (mobile) | Validation messages render at the top of the step panel, i.e. under the sticky nav (measured: error top = y 0, nav = 66px tall, Next button at y 703). On a phone she presses `Next`, nothing visibly happens, and she assumes the button is broken. Reproduced on step 3 (`Pick at least one big game`) and step 4 (`Add at least your home base.`, `Give place 1 a name.`). | **High** |
| F-10 | Step 3 | 5,300px of game cards to scroll on a phone, and she is *required* to pick a big game she has never seen played. | Medium |
| F-11 | Step 4 | Required to name a home base; optional fields (map link, notes, photos) look required because they are inside the same card. | Low-Medium |
| F-12 | Step 7 | Required ≥20-character story before she can proceed — for a gift she may not have "the night everyone talks about" ready; the voice-note alternative is a file picker, not a recorder. | Medium |
| F-13 | Order bar | Total is always visible (good) but never itemised until Review; extras added on steps 4–9 change the number with no line saying why. `Founder price` is shown but not "first 30 orders" or a countdown. | Low-Medium |
| F-14 | Step 10 | Pressing Pay lists **six identical** `Slot n is empty` lines plus name/email/terms — the empty-slot problem she was told she could leave until later is now nine bullets. `Your squad` on the Review has no Change link. | High |
| F-15 | Step 10 → checkout | `Ordering opens on 4 October` — she cannot pay today and there is no "email me when it opens" and no way to save/share the build except "on this device" (the order is not in localStorage-visible keys, so a cleared Safari or a switch to her laptop loses it). | **High** |
| F-16 | After payment (unknown) | Nothing on the site says what happens after Pay: when the 20-minute call is, how friends receive consent forms, when the 5-day preview lands, how she hands it over on Christmas Day (the QR gift card is a 59 DKK add-on on step 9, never suggested for the Christmas persona). | Medium |
| F-17 | Explore | Beautiful catalogue, zero prices — she cannot tell what an add-on costs until she is deep in the order. `Add these to my game ▶` jumps into the 10-step flow at a mid step. | Medium |
| F-18 | Language | Danish buyer, Danish audience, English-only site; step 7 offers a "Language the game is written in" select but the marketing never says Danish is possible. | Medium |

**Order-flow facts**: gate + 10 steps; price is committed (Deluxe preselected, 1,049 DKK in the bar) on step 1 before anything is asked; total visible on every step; can go back/forward via the stepper freely; state persists per device (survived a desktop reload and skipped the gate); no account, no link, no email save; end state is `Pay 1,049 DKK ▶` → Stripe (closed until 4 Oct).

---

## 6. What works (keep)

1. **The playable hero is a genuine differentiator** — a real, walkable slice of the flagship with the real squad on it, plus a `Rather read than walk?` escape hatch and a `Scroll to the site ↓` link. Nobody else in the gift market has this.
2. **`REAL PHOTO →` game-sprite cards** are the single strongest proof on the site ("The dog counts." is the best line in the copy).
3. **Guided tour stop 1 shows all three prices** inside the hero — the mechanism to surface price above the fold already exists.
4. **Per-person price led, total second, crossed-out normal price** — the price card structure is right; only its position is wrong.
5. **Live total bar with Back/Next on every step**, and the smart nudge `Deluxe holds 6 characters and you have 1. Standard would cost 250 DKK less. Switch to Standard`.
6. **Honest privacy posture**: photos stay on-device until Pay, browser-side photo check, 30-day deletion, no under-18s, consent forms — said plainly on the gate and in the FAQ.
7. **Refund guarantee copy** (`Love the preview or your money back`) and the withdrawal-rights tick box are clear and legally sensible.
8. **Accessibility basics**: skip link, `:focus-visible` outlines, labelled ♥ buttons (`Add Kart Race to your favourites`), alt on every real image, dialog roles.
9. **Country/currency picker** with persisted choice and accessible names.
10. **Explore's taxonomy** (Big games / Party minigames / Getting around / Your world / The phone / Your story / Extras & keepsakes) maps 1:1 onto the order steps, so a favourited item really is pre-picked.
11. **In-character 404** (`You walked off the map`).

---

## 7. Quick wins vs redesign

### (a) Fix in an hour — copy and placement
1. Give the country strip `z-index` below the nav (or drop it into the nav row) so `Start your order` is never covered.
2. Put one price line in the hero card: `From 799 DKK · about 4 weeks · groups of 2–10` under the sub-copy, and change `See everything in it` to `See prices` (or keep it and add a third small link `Prices ↓`).
3. Add a `Prices` (and `FAQ`) link to the mobile nav — even a single text link beside the DKK button — until a proper menu exists.
4. Reconcile every number to one table: extra friend 159 vs 399; extra zone 299 vs 899; big game 449 vs unpriced; trailer included vs 299; online multiplayer included vs 299; voice line 129 everywhere. Put the same add-on prices on the Explore badges.
5. Change How-it-works H2 to say which edition (`Three steps, about four weeks for a Deluxe game`) and add `4 WEEKS` to the Deluxe card badge (move `MOST PICKED` to a corner ribbon).
6. Fix the "add-ons" line in the price section to match step-level prices, and delete or correct FAQ 1 (`3–5 photos`) vs the order flow (`one photo`).
7. Replace the four `Draft` markers with one, and fill the three `[…]` placeholders on privacy/terms with at least a contact email — a mailbox costs nothing and its absence is the biggest trust hole.
8. Add a `mailto:` / "Questions? hello@…" line in the footer and on the Review step.
9. Make `og:image` absolute (`https://gameofus-site…/assets/share.jpg`) and add `og:url`; add a 180×180 `apple-touch-icon`.
10. Show the founder-price scarcity where the money is: bar text `founder price · first 30 orders` and a `Founder price (first 30 orders)` row on the Review total.
11. Move the `Christmas order deadlines` line up next to the price cards and fix its contrast (dark text on the teal band, or a cream pill).
12. Order-flow errors: scroll the error into view / duplicate it above the `Next` button; collapse the six `Slot n is empty` lines into one; add a `Change` link on the Review's `Your squad`.
13. Rename the Review CTA and copy consistently (`Pay …` everywhere, or `Send` everywhere); rename `Pick your cartridge` to `Pick your edition`.
14. Add the missing H2 to the `MADE FOR` section and make its tiles link to the order (`?occasion=christmas`).
15. Add `aria-label`s to the stepper buttons (`Step 3: Games`), the edition radios and `Choose a photo`; associate the story textarea with its label; put the type chip outside the H3 so screen readers stop hearing `Ricochill`.
16. Fix the doubled `order-assets/order-assets/` path for `veh_car.webp` / `veh_taxi.webp`.
17. Change the 404 page to the site's font and give it the nav.

### (b) Needs the redesign
1. **A product-first fold** on mobile: one sentence that says what it is, one price line, one proof image (real photo → sprite), one primary CTA (`See prices` or `Build yours`), with the playable beach as the section *below* or as a "Try the demo" tab — not the whole first screen.
2. **Proof layer**: at least three short testimonials or reaction clips from the flagship group, a founder card ("Made in Copenhagen by …"), and social links. Nothing in the current template has a slot for these.
3. **Group-size-first order flow**: ask "How many of you?" and "What's the occasion / when do you need it?" before photos; derive the edition and delivery date from the answers; make photos the *last* step by default (the copy already promises this — the UI does the opposite). Ten steps → five to six.
4. **Email capture / waitlist** before 4 Oct (`Tell me when ordering opens` on the home page, the order banner and the Explore CTA), plus "email me my build" / shareable link — the privacy policy already describes this feature; build it.
5. **Persistent, itemised basket** (edition + every add-on with its price) visible from step 2 onward, not only on Review.
6. **Proper mobile navigation** (hamburger with The game / Explore / Prices / FAQ / Start) shared across all templates, and one footer across all pages.
7. **Danish language version** (or at least a DA toggle on the home page and order flow) — the audience, the currency and the legal frame are Danish; the copy is not.
8. **Gift framing**: a "Giving it as a present?" path that explains the reveal (printable card, trailer, "the game ends by wishing them a happy birthday") and hides the friend-consent gate until after purchase.
9. **Explore with prices**: every card badge carries its add-on price and the edition it's included in; Explore's `Add these to my game` should land on a summary, not mid-flow.
10. **Post-purchase page / "what happens next" timeline** (payment → 20-min call → consent forms → 5-day cast preview → playable preview → delivery), surfaced on the Review step and in the FAQ.
