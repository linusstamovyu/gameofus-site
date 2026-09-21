// The season story (16-17 Sep 2026) on its own page. It used to be mounted from src/main.ts; the hero that
// replaced it on the homepage owns that stage now, so this keeps the story runnable without either of them
// having to know about the other.
import "../styles.css";
import "./story.css";
import offerData from "../content/offer.json";
import squadData from "../content/squad.json";
import stopsData from "../content/stops.json";
import type { Offer, SquadMember, Stop } from "../content/types";
import { SeasonWorld } from "../seasons/seasonWorld";
import { SeasonStory } from "./story";

const squad = squadData as unknown as SquadMember[];
const stops = stopsData as unknown as Stop[];
const offer = offerData as unknown as Offer;

const stage = document.getElementById("stage");
if (stage) {
  const story = new SeasonStory(stage, squad);
  story.attach(new SeasonWorld(stage, stops, squad, offer, { outfits: "fade", remember: true }));
}
