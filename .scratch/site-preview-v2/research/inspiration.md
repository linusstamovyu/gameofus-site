# Scroll-driven landing page inspiration — research for Game of Us

Date: 2026-09-16. Brief: the owner wants the gameofus-site landing page redesigned around scroll-driven
motion ("components flow together as they scroll" — scroll-linked animation, pinned sections, sequences
that play as you scroll, hand-offs between sections). He will look at each site and say what he likes.

**How this was verified.** Every URL below was fetched on 2026-09-16 and resolves unless marked otherwise
(bot-blocked 403/503 sites are flagged, dead ones dropped). A fetch returns the page's text/markup, not
its motion, so "what to look at" describes the section to open in a browser; where the markup itself
showed the technique (start/end frame sequences, parallax layers, pinned containers) that is said, and
where a claim rests on third-party write-ups (Awwwards case studies, Codrops breakdowns) that is linked.
Search sources are listed at the end.

---

## 1. General best-in-class scroll-driven storytelling

1. **Apple — iPhone 18 Pro** — https://www.apple.com/iphone-18-pro/
   The current flagship product page (the 17 Pro URL now redirects to the iPhone hub).
   Look at: the **Design** section — the phone is pinned while a scrubbed frame sequence turns it (the
   markup ships explicit `startframe`/`endframe` image pairs per section), then hands off to the colour
   gallery; the **Variable aperture** section, where the iris opens/closes as you scroll; and how every
   feature block is "one thing per screen" with the headline arriving before the picture finishes.
   Same grammar on https://www.apple.com/airpods-pro/ (the "Get the highlights" gallery → pinned earbud)
   and https://www.apple.com/macbook-pro/ (lid-open sequence).

2. **Igloo Inc (abeto)** — https://www.igloo.inc/ — Awwwards Site of the Year 2024
   Corporate page for the company behind Pudgy Penguins, built entirely in WebGL.
   Look at: the whole page is ONE continuous scene — scroll drives the camera between ice-block "rooms",
   each project encased in its own crystal, with frost dissolves and chromatic aberration as transitions
   rather than cuts; sound cues lock to scroll waypoints. The hand-off between sections is a camera move,
   not a new section. Case study: https://www.awwwards.com/igloo-inc-case-study.html

3. **Lusion** — https://lusion.co/ — Awwwards Site of the Year 2023 (Lusion v3)
   Bristol 3D/interactive studio; their own site is the reference for "flowing" scroll.
   Look at: the hero WebGL scene that is scrubbed by scroll rather than played; the **Featured Work**
   cards that slide under/over each other as you move; "Play Reel" living inside the flow rather than as
   a modal.

4. **Lando Norris (OFF+BRAND)** — https://landonorris.com/ — Awwwards Site of the Year 2025
   Athlete site, full-page scroll with WebGL.
   Look at: the **Helmet Hall of Fame** — 3D helmets that come forward and rotate as you scroll into
   them, hover to spin; the hero-to-"Message" hand-off where the intro type breaks apart into the next
   section. A good model for "one hero object carried through several sections".

5. **Active Theory** — https://activetheory.net/
   Venice Beach studio (Google, Netflix, Nike work), site runs on their own Hydra engine.
   Look at: scrolling through a 3D reconstruction of their offices — scroll = walking through a space;
   project previews that grow from a card into a full-screen experience with a fluid WebGL transition.
   Reference for the top end of "the page is a world you move through".

6. **Locomotive** — https://locomotive.ca/en
   Montréal agency and authors of Locomotive Scroll.
   Look at: the **Featured Work** list — each case reveals with scroll-linked masks and speed offsets
   (parallax by attribute); the "Design and code are only tools of expression" statement section that
   pins and re-composes as copy scrolls past. Also read their own article "Should I use Locomotive Scroll
   on my project?" — an honest note on when smooth-scroll libraries are a mistake.

7. **Linear** — https://linear.app/
   Product homepage; the counter-example of restraint.
   Look at: product UI panels that reveal on entering the viewport (Intake → Planning → AI → Build) —
   reveal-on-view, not scrubbed; the page never pins. Worth showing the owner as "how much motion is
   enough": most sections should be this, with scrub reserved for two or three moments.

8. **Stripe — Payments** — https://stripe.com/payments
   Product page (the homepage is mostly carousels; the pattern lives here).
   Look at: sticky copy on one side with the demo panel swapping on the other as you scroll through
   Online / Global / In-person payments; live, working checkout components embedded mid-page. The model
   for a "How it works" walkthrough where the game frame stays pinned and the steps scroll past.

9. **GSAP — Scroll plugins page** — https://gsap.com/scroll/ *(not agency work; a library page)*
   The ScrollTrigger / ScrollSmoother / Observer landing.
   Look at: the live demos of **pin**, **scrub**, **snap** and horizontal sections, plus the community
   pieces (WebGL tunnel scrolled through, infinite cover-flow). Everything on this page is reachable by
   one developer with GSAP (free since 2025, ScrollTrigger included).

10. **scroll-driven-animations.style (Bramus Van Damme)** — https://scroll-driven-animations.style/
    *(not agency work; CSS-only demos, zero JavaScript)*
    Look at: **Cover Card to Fixed Header** (hero shrinks into the nav), **Stacking Cards** (cards pile
    up as you scroll — an editions/pricing pattern), **Horizontal Scroll Section**, **Image Reveal
    Effects**, **3D Shoe Explorer** (a scrubbed frame sequence done in pure CSS). Uses the CSS
    `animation-timeline: scroll()/view()` API — see Risks for browser support.

11. **Eduard Bodak (solo freelancer, Cologne)** — https://www.eduardbodak.com/
    *(not agency work)* One-person Webflow designer's portfolio; Codrops breakdown of how each animation
    is built: https://tympanus.net/codrops/2025/07/29/built-to-move-a-closer-look-at-the-animations-behind-eduard-bodaks-portfolio/
    Look at: the hero's 3D cards that fly outward and flip back as you scroll; the **services** section —
    a 350vh sticky container in which three cards fly in from scattered positions into one stack; the
    wheel of 24 cards that rotates with scroll progress. Built with Locomotive Scroll v5 + GSAP timelines.

12. **Joseph Santamaria (solo dev, Ecuador)** — https://joseph-san.com/
    *(not agency work)* Scroll-driven 3D portfolio; Codrops 2026 breakdown:
    https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/
    Look at: scroll mapped directly onto a camera path through Three.js scenes; the switch between
    free-scroll stretches and snap-blocks depending on the scene; GSAP Observer unifying wheel, touch
    and trackpad. The closest single-developer analogue to "the page is a world" (Igloo/Active Theory).

Also worth a look, kept out of the twelve:
- **Messenger (abeto)** — https://messenger.abeto.co/ — Awwwards Site of the Year 2025 alongside Lando
  Norris. NOT scroll-driven: it is a playable WebGL delivery game that *is* the page. Relevant because
  Game of Us already has a playable canvas hero; Messenger shows the alternative bet (no scroll story,
  the game is the story).
- **tinyPod** — https://thetinypod.com/ — a two-person hardware company's Framer-built product page
  ($79 Apple Watch case with a click-wheel): sticky product image with feature copy scrolling past,
  feature-per-screen rhythm. Proof the Apple grammar is reachable on a no-code stack.
- **Lenis** — https://lenis.dev/ — the smooth-scroll library site (snap, horizontal, infinite demos).
  Listed so it can be *not* chosen — see Risks on smooth-scroll + canvas hero.

---

## 2. Game space — do game marketing pages use scroll-driven motion?

| Site | URL | Scroll-driven? | What to look at |
|---|---|---|---|
| Playdate (Panic) | https://play.date/ | **Partly / unverified** | Sections run The System → The Design → **The Crank** → The Season → Catalog → "All for just $229". The markup carries three inline `<video>` loops and an image gallery, no GSAP/canvas — so expect looping videos per section rather than Apple-style scrub. The "crank" moment the owner remembers is in The Crank section; check in a browser whether it is scroll-scrubbed or a loop. The tone ("Yes, the crank. Is it a gimmick? Nah") is the thing to steal regardless. |
| Nintendo Switch 2 hub | https://www.nintendo.com/us/gaming-systems/switch-2/ | **No** | A hub of cards and links (featured games, Direct, welcome centre). Static. |
| Mario Kart World (featured-game site) | https://www.nintendo.com/us/gaming-systems/switch-2/featured-games/mario-kart-world/ | **Mild yes** | Feature-per-section (World / Modes / Free Roam / Drivers / Items / Play Together) with animated galleries and reveal-on-scroll; no pinning or scrub. |
| Donkey Kong Bananza (featured-game site) | https://www.nintendo.com/us/gaming-systems/switch-2/featured-games/donkey-kong-bananza/ | **Yes — best in the game space** | The markup shows parallax background layers in the Gameplay (terrain destruction) section, animated transition sequences for the three Bananza transformations, sequential reveals, and an outro that dissolves into a repeating crystal-banana pattern. This is the one first-party page that behaves like a product page. |
| Pokémon Legends: Z-A | https://legends.pokemon.com/en-us/ | **Mild yes** | Parallax-style backgrounds, an animated Mega Evolution carousel, Lumiose City gallery. Reveals, not scrub. |
| Hollow Knight: Silksong | https://hollowknightsilksong.com/ | **No** | Squarespace: hero, five feature headings, screenshot carousel, press kit. |
| Stardew Valley | https://www.stardewvalley.net/ | **No** | Static: intro, six features, store links, ratings. |
| Untitled Goose Game (House House) | https://goose.game/ | **No** | One-pager: tagline, platform buttons, merch, newsletter. |
| Sea of Stars (Sabotage) | https://seaofstarsgame.co/ | **No scrub** | Carousels + a music player; one interesting bit — a 101-image day/night lighting sequence presented as a slider, i.e. a scrubbable sequence that is not tied to scroll. |
| Astro Bot (PlayStation) | https://www.playstation.com/en-us/games/astro-bot/ | **Mild** | Reveal-on-scroll sections and one click-and-drag "New worlds" element; YouTube embeds. |
| Hades II (Supergiant) | https://www.supergiantgames.com/games/hades-ii/ | **No** | Static; a "parallax hover" on images only. |
| Balatro | https://www.playbalatro.com/ | **No** | Static: platforms, merch, awards. |
| Animal Well | https://www.animalwell.net/ | **No** | Static; gameplay GIFs. |
| Clair Obscur: Expedition 33 | https://www.expedition33.com/ | **No** | Wix: pre-order, news, characters, gallery. |
| Annapurna Interactive | https://annapurnainteractive.com/ | **No** | Hero slider of three games, nav. |
| Devolver Digital | https://www.devolverdigital.com/ | (403/429 to fetchers — live for humans) | Historically a catalogue grid; no scroll storytelling. |
| Steam store pages | https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/ | **No** | Fixed store template; a dev may only set a custom background image. |
| itch.io | https://itch.io/ | **No** | Marketplace grid; no motion. |

**Verdict: rare.** Of 18 game pages checked, none uses Apple-style pinned, scroll-scrubbed sequences.
Only Nintendo's first-party featured-game microsites (Donkey Kong Bananza clearly; Mario Kart World and
Pokémon Legends mildly) use scroll-linked parallax and reveals; every indie page — including the biggest
hits of the last three years (Silksong, Stardew, Balatro, Animal Well, Goose) — is a static Squarespace/
Wix one-pager whose job is to route you to Steam, because the trailer and the Steam page do the selling.
The scroll-driven language lives on **hardware** pages (Apple, Playdate, tinyPod), not game pages. For
Game of Us that is good news: a scroll-driven landing page would look like nothing else that sells a
game, and the right references are product pages, not game pages.

---

## 3. Direct competitors and adjacent personalised-gift sites

Legend — *Scroll motion*: does the landing page use scroll-driven animation. *Reactions*: whether filmed
customer reactions appear ON the landing page, and where social proof actually lives.

1. **Muksun Games** — https://muksungames.com/ — closest direct competitor
   Sells: a custom arcade/platformer game (3 levels, 20–40 min) starring your people as companions,
   side characters, enemies or the final boss, built from photos and inside jokes. **$99** on sale
   (list $189.99), ready in 3–7 days. Shopify.
   Scroll motion: **no** (standard Shopify sections: hero → "Perfect for" → "Real examples" → 3-step
   process → "Reviews & Confessions" → FAQ).
   Reactions: **not on the page.** Social proof is three text quote cards and one "SEE IT IN ACTION"
   gameplay video; the portfolio page (https://muksungames.com/pages/portfolio) is static screenshots
   with theme blurbs. Reaction content lives on their TikTok/Instagram (@muksungames), not the site.

2. **Gift Games** — https://giftgames.store/en/
   Sells: a personalised zombie/puzzle/quiz game with your photos, wishes, item and achievement names;
   nine cover themes. **€37.50 digital / €45 DIY / €60 boxed** (free EU shipping).
   Scroll motion: **no.** Reactions: five text reviews, no media. Long, explanatory page ("What is a
   personalised game?", six feature cards) — the shape of a page written before anyone believed you.

3. **MiniGameGift** — https://minigamegift.com/
   Sells: personalised mini-games as gifts. **No prices on the page.**
   Scroll motion: **no.** Reactions: four text quotes with five-star rows (e.g. "Got this for my boyfriend
   for Valentine's Day"), no photos or video.

4. **Heartbit** — https://heartbit.love/
   Sells: a couples' pixel-art game with hand-drawn sprites in your likeness, original music, interactive
   scenes. **$599 Essential / $999 Premium** (mobile build, custom chiptune covers, custom domain) — the
   only competitor priced above Game of Us's Ultimate tier.
   Scroll motion: **no.** Reactions: **none at all** — one Valentine's 2026 demo game and a comparison
   table. At this price with zero social proof it is the cautionary example.

5. **Wonderbly** — https://www.wonderbly.com/
   Sells: personalised children's books (and gifts); prices not on the homepage. The category leader.
   Scroll motion: **no** (promo bar → bestsellers → four-step process → "Thoughtfully made" → FAQ).
   Reactions: **off-site.** Trustpilot is linked twice (no quotes or score shown inline) plus "helped 10
   million people make someone's day" in the footer. Children's reaction clips are the core of their
   TikTok (@wonderbly — "3 easy steps", search-and-find reveals) but are not embedded on the site.

6. **Hooray Heroes** — https://hoorayheroes.com/ (also .co.uk)
   Sells: personalised books for kids, parents, couples, pets. **$46.99 / £46.99** per book, "shipped in
   3 days", 3.5M copies.
   Scroll motion: **no.** Reactions: none — one repeated claim that the books "moved more than 12,000,000
   people worldwide to tears". A number standing in for the reactions it describes.

7. **Songfinch** — https://www.songfinch.com/ (marketing landing: https://get.songfinch.com/custom-songs-from-real-artists/)
   Sells: a custom song written and recorded by a real artist in 48 hours; prices not on the landing.
   The most instructive analogue, because the *product* is a reaction: their whole brand is "watch them
   hear it for the first time", and "reaction value / social-media appeal" is literally listed as a
   benefit on the page.
   Scroll motion: **no.** Reactions: **still not embedded.** The landing leads with "375,000+ songs
   sold", a press-logo wall, four text review cards and "4.6/5 based on 23,000+ reviews"; the reaction
   videos (blind reactions, an "artists react" YouTube playlist, #songfinchreactions on TikTok) are
   off-site. Their reaction-video strategy is proof the format converts; their landing page shows the gap.

8. **Cameo** — https://www.cameo.com/
   Sells: personalised celebrity videos, **~116–2,247 kr** each (shown as text on the leaderboard).
   Scroll motion: **no** (category browse → Top 10 → charity goals → How it works → reviews).
   Reactions: six short text testimonials about the recipient's reaction ("my dad cried"); sample videos
   are on talent pages, not the homepage. Again: a video product sold with text.

Also checked, not in the eight:
- **LoveBook** — https://www.lovebookonline.com/ — personalised couple's book; "5M+ books, 160+ countries,
  4.8★"; eight text testimonials; no video; no scroll motion.
- **Kustgame** — https://www.kustgame.com/kustadventure.php — free hobby "customise the player, add your
  pictures" mobile game; no reviews, no motion.
- **RPGme.ai** — Kickstarter "personalised retro games about anyone" (https://www.kickstarter.com/projects/rpgme/rpgmeai-create-and-gift-a-customized-rpg-adventure — 403 to fetchers); rpgme.ai returned 503 on 2026-09-16. A watch item, not a live competitor.
- **Hasbro My Monopoly** — mymonopoly.com is dead (TLS error); the product survives on Amazon/eBay and
  the rules page (https://instructions.hasbro.com/en-sg/instruction/my-monopoly-game): personalisation
  is printed sticker sheets via an app. No landing page to learn from.
- **Mess with Humanity** — https://gomwh.com/ — free custom Cards Against Humanity deck maker; no
  reviews, no motion.
- **Etsy** ("custom video game gift", Load-Save's "turn yourself into game art" prints) — Etsy blocks
  fetchers (403); the category is prints, blankets and cases, not playable games.

**The social-proof finding, stated plainly:** across eleven personalised-gift sites, not one embeds a
filmed customer reaction on its landing page — including the two (Songfinch, Cameo) whose product is a
reaction and whose TikTok is nothing but reactions. Every site substitutes a number ("10 million", "12
million tears", "23,000 reviews") or text cards. Game of Us putting the lads' filmed reactions on the
landing page would be genuinely differentiated in the category, not merely well executed.

---

## Patterns worth stealing for Game of Us

- **Pin the hero, scrub a sprite sequence (Apple iPhone 18 Pro / Bramus "3D Shoe Explorer").** Apple's
  start-frame → end-frame scrub is a frame sequence; Game of Us already owns pixel sprite sheets, so the
  cheapest version is a canvas drawing frame N of a sheet at scroll progress — a lad turning to face the
  camera, or the beach hero zooming into one character as the headline lands.
- **Hero shrinks into the header (Bramus "Cover Card to Fixed Header").** The walkable beach becomes a
  thin animated strip under the nav instead of disappearing — the game literally stays with you down the
  page, which also solves "what happens to the canvas when you scroll".
- **Editions as stacking cards (Bramus "Stacking Cards" / Eduard Bodak's 350vh sticky stack).**
  Standard → Deluxe → Ultimate pile up as you scroll, each card carrying one more feature than the last,
  so the upsell is the animation. One sticky container, three transforms.
- **Sticky game frame, steps scroll past (Stripe /payments).** "How it works" with the game frame pinned
  on one side and Upload faces → We draw the lads → Play scrolling on the other; the frame's contents
  swap per step (photo → sprite → gameplay). A hand-off, not three screenshots.
- **One continuous world, camera moves (Igloo Inc / Joseph Santamaria, on a pixel budget).** Instead of
  WebGL, one long pixel-art panorama (beach → strip → bar → flat) as a parallax background that the
  whole page scrolls along, with each section "arriving" at a location. Locomotive-style speed attributes
  are enough; it is the same trick Donkey Kong Bananza's page does with layered backgrounds.
- **Feature-per-screen with cheek (Playdate).** One claim per viewport, a short loop, a line of copy that
  sounds like a person ("Yes, the crank. Is it a gimmick? Nah"). Game of Us's voice already does this.
- **Reactions in the pinned phone (nobody in the category does it — Songfinch shows why it should be
  done).** A phone frame pinned while the page scrolls, playing the lads' filmed reactions muted with
  captions, swapping clip per scroll step, with the ONE number (games delivered / friends starring) next
  to it. Text cards after the clips, not instead of them.
- **Section outro that dissolves into the next (Donkey Kong Bananza's crystal-banana pattern / Lando
  Norris's type break-up).** Each section ends by turning into the next one's texture — the "components
  flow together" the owner asked for, done as a cheap crossfade of two tile patterns.
- **Restraint (Linear).** Reveal-on-view for most sections; reserve pin+scrub for three moments (hero,
  how-it-works, reactions). Every extra pinned section is a phone-performance and motion-sickness cost.
- **Ship on a no-code-sized budget (tinyPod).** A two-person hardware company gets the Apple grammar out
  of Framer with sticky images and view-triggered reveals. The bar is lower than the agency sites suggest.

## Risks

- **Phones.** Frame sequences are the expensive part: 60 frames of a 1600px PNG is tens of MB; Apple
  ships per-breakpoint sequences. Use sprite sheets at the game's own pixel resolution (nearest-neighbour
  upscaled) — kilobytes, not megabytes — and animate only `transform`/`opacity`. Do not scrub a `<video>`
  by `currentTime` on iOS Safari (unreliable seeking); frames on canvas or CSS steps() are the safe path.
  Keep pinned sections short (≤ 300vh) and never pin the full viewport height on mobile: the iOS address
  bar resizes the viewport mid-scroll and every pin recalculates. Measure INP/LCP on a real mid-range
  Android, not a MacBook.
- **Motion sickness / prefers-reduced-motion.** Full-screen rotations, parallax on large areas and
  scroll-jacking are the known triggers. Every scrubbed sequence needs a static end state, and
  `@media (prefers-reduced-motion: reduce)` must collapse pins to plain sections and show that end state.
  Never take over the scroll (no smooth-scroll hijack on mobile). Keep parallax offsets small and on
  small elements.
- **Safari and the CSS scroll-driven animations API vs GSAP ScrollTrigger.** CSS `animation-timeline:
  scroll()/view()` shipped in Safari 26 (Sept 2025), runs threaded from 26.4 and had progress/`play-state`
  bugs fixed in 26.5 (June 2026); Chrome/Edge since 115; **Firefox still behind a flag** despite being an
  Interop 2026 item (WebKit guide: https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/).
  So: CSS timelines for the cheap effects (progress, stacking cards, reveals) behind
  `@supports (animation-timeline: scroll())` with a no-motion fallback, and GSAP ScrollTrigger (free
  since 2025) for anything pinned or sequenced, where one engine has to own layout. Known ScrollTrigger
  traps on iOS: pin jumps on address-bar resize (use `ScrollTrigger.config({ ignoreMobileResize: true })`,
  consider `normalizeScroll`), sticky/pin bumpiness in Safari, and refresh order when images load late
  (`ScrollTrigger.refresh()` after fonts/images). Do not mix Lenis/Locomotive smooth scroll with CSS
  timelines — CSS timelines read native scroll, a smooth-scroll library fakes it.
- **The canvas game hero at the top of the page.** Four concrete conflicts: (1) input — if the hero
  captures wheel/arrow/WASD while focused, the page stops scrolling; only capture keys after a click into
  the game, never wheel, and set `touch-action` so a swipe on the canvas still scrolls on mobile; (2) main
  thread — the game's rAF loop and ScrollTrigger's scrub share one thread; pause the game loop when the
  hero leaves the viewport (IntersectionObserver) and while a pin is active; (3) pinning — ScrollTrigger
  wraps a pinned element in a pin-spacer and CSS `position: sticky` breaks under transformed ancestors,
  so the canvas's resize/DPR handling must survive being re-parented and re-measured; (4) the hand-off —
  if the hero "shrinks into the header" (pattern above), the game must render at a second size or freeze
  to a poster frame; decide which before designing the motion. The Messenger site (SOTY 2025) is the
  opposite bet — no scroll story, the playable world is the whole page — and worth a look before
  committing the hero to a scroll narrative.
- **Reaction videos.** Autoplay only muted with captions burned in or as `<track>`; poster images so the
  pinned phone never shows black; short (≤ 10 s) H.264 + WebM under ~2 MB each, lazy-loaded below the
  fold; written consent from each lad, since the site is a business. Do not put a reaction behind a
  click — the category's lesson is that reactions hidden off-page convert nobody.

## Sources consulted

- Awwwards Sites of the Year: https://www.awwwards.com/websites/sites_of_the_year/ ; Messenger SOTD:
  https://www.awwwards.com/sites/messenger ; Igloo Inc case study: https://www.awwwards.com/igloo-inc-case-study.html
- Codrops: Eduard Bodak breakdown (2025-07-29), Joseph Santamaria breakdown (2026-04-28) — URLs above.
- WebKit, "A guide to Scroll-driven Animations with just CSS": https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/
- Chrome, scroll-triggered animations (Chrome 145): https://developer.chrome.com/blog/scroll-triggered-animations
- GSAP forums on iOS pin/address-bar issues: https://gsap.com/community/forums/topic/40393-gsap-scrolltrigger-pin-position-is-jumping-on-ios-due-to-its-address-bar/ ; https://gsap.com/community/forums/topic/44406-scrolltrigger-pin-jumping-issue-on-enter-and-exit-safari-resize/ ; normalizeScroll docs: https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.normalizeScroll()/
- Framer University on sticky/parallax patterns (tinyPod cited): https://framer.university/blog/10-scroll-animations-to-make-your-website-stand-out
- Wikipedia, "Personalized video game": https://en.wikipedia.org/wiki/Personalized_video_game
- Songfinch reactions on TikTok/YouTube: https://www.tiktok.com/discover/songfinch-reactions ; https://www.youtube.com/playlist?list=PLHZE7uSCvWl4d658AcsuIM6LE77M2nXUH
- Wonderbly on TikTok: https://www.tiktok.com/@wonderbly ; Muksun on TikTok: https://www.tiktok.com/@muksungames
