// season-scroll.html: the hero's map on its own, travelling through the worlds in season order.
import "../styles.css";
import "./seasons.css";
import offerData from "../content/offer.json";
import squadData from "../content/squad.json";
import stopsData from "../content/stops.json";
import type { Offer, SquadMember, Stop } from "../content/types";
import { SeasonWorld } from "./seasonWorld";

// Set here as well as in the HTML: the published phone preview wraps the page in a body of its own.
document.body.classList.add("season-page");

const stage = document.getElementById("stage");
try {
  if (stage) new SeasonWorld(stage, stopsData as unknown as Stop[], squadData as unknown as SquadMember[], offerData as unknown as Offer);
} catch (err) {
  console.error("Season scroll failed to start", err);
  stage?.classList.add("no-world");
}
