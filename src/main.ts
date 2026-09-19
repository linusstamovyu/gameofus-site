import "./styles.css";
import "./story/story.css";
import faqData from "./content/faq.json";
import occasionsData from "./content/occasions.json";
import offerData from "./content/offer.json";
import siteData from "./content/site.json";
import squadData from "./content/squad.json";
import stopsData from "./content/stops.json";
import type { Occasions, Offer, SiteConfig, SquadMember, Stop } from "./content/types";
import { renderFaq, renderOccasions, renderOffer, renderOrderCalls, renderPause, renderSquad } from "./sections/render";
import { trackClicks } from "./shared/analytics";
import { currentCurrency, initCountryPicker, onCountryChange } from "./shared/countryPicker";
import { SeasonWorld } from "./seasons/seasonWorld";
import { SeasonStory } from "./story/story";
import { BeachWorld } from "./world/world";

const squad = squadData as unknown as SquadMember[];
const stops = stopsData as unknown as Stop[];
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
// The season story (16-17 Sep 2026): scrolling opens the map out and plays the year. ?story=0 is the hero as it was.
const storyOff = new URLSearchParams(location.search).get("story") === "0";
try {
  if (stage && storyOff) new BeachWorld(stage, stops, squad, offer);
  else if (stage) {
    const story = new SeasonStory(stage, squad);
    story.attach(new SeasonWorld(stage, stops, squad, offer, { outfits: "fade", remember: true }));
  }
} catch (err) {
  // A browser that can't run the world still gets the whole page.
  console.error("Beach failed to start", err);
  stage?.classList.add("no-world");
}
