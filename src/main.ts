import "./styles.css";
import faqData from "./content/faq.json";
import offerData from "./content/offer.json";
import siteData from "./content/site.json";
import squadData from "./content/squad.json";
import stopsData from "./content/stops.json";
import type { Offer, SiteConfig, SquadMember, Stop } from "./content/types";
import { renderFaq, renderOffer, renderOrderCalls, renderPause, renderSquad } from "./sections/render";
import { currentCurrency, initCountryPicker, onCountryChange } from "./shared/countryPicker";
import { BeachWorld } from "./world/world";

const squad = squadData as unknown as SquadMember[];
const stops = stopsData as unknown as Stop[];
const offer = offerData as unknown as Offer;
const site = siteData as SiteConfig;

// The page comes first and never waits for the world.
renderSquad(squad);
renderOffer(offer, currentCurrency());
renderOrderCalls(offer);
onCountryChange((_, currency) => renderOffer(offer, currency));
void initCountryPicker();
renderFaq(faqData as unknown as [string, string][]);
renderPause();
document.querySelectorAll<HTMLElement>("[data-draft]").forEach(n => (n.hidden = !site.isDraft));
const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const stage = document.getElementById("stage");
try {
  if (stage) new BeachWorld(stage, stops, squad, offer);
} catch (err) {
  // A browser that can't run the world still gets the whole page.
  console.error("Beach failed to start", err);
  stage?.classList.add("no-world");
}
