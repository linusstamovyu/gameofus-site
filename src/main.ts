import "./styles.css";
import faqData from "./content/faq.json";
import occasionsData from "./content/occasions.json";
import offerData from "./content/offer.json";
import siteData from "./content/site.json";
import squadData from "./content/squad.json";
import type { Occasions, Offer, SiteConfig, SquadMember } from "./content/types";
import { renderFaq, renderOccasions, renderOffer, renderOrderCalls, renderPause, renderSquad } from "./sections/render";
import { trackClicks } from "./shared/analytics";
import { currentCurrency, initCountryPicker, onCountryChange } from "./shared/countryPicker";

const squad = squadData as unknown as SquadMember[];
const offer = offerData as unknown as Offer;
const occasions = occasionsData as unknown as Occasions;
const site = siteData as SiteConfig;

// The page comes first and never waits for the world.
renderSquad(squad);
renderOffer(offer, currentCurrency());
renderOrderCalls(offer);
renderOccasions(occasions, offer);
onCountryChange((_, currency) => renderOffer(offer, currency));
void initCountryPicker();
renderFaq(faqData as unknown as [string, string][]);
renderPause();
trackClicks();
document.querySelectorAll<HTMLElement>("[data-draft]").forEach(n => (n.hidden = !site.isDraft));
const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const stage = document.getElementById("stage");
// THE HERO (19 Sep 2026). Press start turns Kai's real photo into his character and drops him onto the map;
// scrolling then walks him to each friend in turn, a new world each time, and ends on the whole squad.
// It is a page script rather than a class — it owns the pinned track, so it is imported for its side effect
// and reads the markup above by id.
//
// THERE IS NO ?hero=0 ESCAPE HATCH, and that is deliberate rather than an omission. The two older heroes
// were built against the OLD hero markup — a plain `.stage` with a title card over it — and this page now
// carries the pinned track instead, so a query flag would hand them a DOM they cannot drive: tried, it threw
// and drew the unstyled start screen over the season story's canvas. Each keeps its own page instead:
//   story-preview.html  the season story (16-17 Sep), scrolling opens the map out and plays the year
//   season-scroll.html  the seasons world on its own
// Both are another session's work and neither is touched by the hero.
try {
  if (stage) void import("./heroLab/heroLab");
} catch (err) {
  // A browser that can't run the world still gets the whole page.
  console.error("Beach failed to start", err);
  stage?.classList.add("no-world");
}
