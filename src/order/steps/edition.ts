// Step 2, Your edition: the three cartridges, the smallest that fits pre-selected (plan 07 Q16), each shown
// the way the live pricing ladder shows it on the home page. Each card is dressed as a card rarity (tier.ts,
// order.css "edition tiers"): Standard silver, Deluxe gold, Ultimate a dark holographic special.
import { el } from "../../dom";
import offerData from "../../content/offer.json";
import type { Offer } from "../../content/types";
import { checkbox, heading, money, stepEyebrow, type StepView } from "../context";
import { chooseEdition, squadFriends } from "../draft";
import { tierClass } from "../../shared/tier";
import { ACTIVE_LADDER, ADDONS, EDITION_IDS, FOUNDER_SPOTS, isFounder, LADDERS } from "../prices";

const offer = offerData as unknown as Offer;

export const editionStep: StepView = (ctx, panel) => {
  const d = ctx.draft();
  const squad = squadFriends(d).length;
  const ladder = LADDERS[ACTIVE_LADDER];
  const cur = ctx.currency();
  const founder = isFounder(ctx.paidOrders());
  const spots = ctx.founderSpotsLeft();
  panel.append(heading(stepEyebrow("edition"), "Pick your edition",
    `You have ${squad} ${squad === 1 ? "friend" : "friends"} in the squad. Every edition is the same kind of game; bigger ones hold more people, places and games.`));
  if (founder) {
    panel.append(el("p", "founder-line", spots === null
      ? `Founder prices for the first ${FOUNDER_SPOTS} orders.`
      : `Founder prices: ${spots} of ${FOUNDER_SPOTS} spots left.`));
  }

  const grid = el("div", "editions");
  grid.dataset.field = "edition";
  for (const id of EDITION_IDS) {
    const ed = ladder.editions[id];
    const tier = offer.tiers.find(t => t.id === id)!;
    const copy = tier.copy[ladder.id];
    const chosen = d.edition === id;
    const card = el("div", `edition ${tierClass(id)}${chosen ? " on" : ""}${tier.star ? " star" : ""}`);
    const head = el("span", "ed-head");
    const title = el("span", "ed-title");
    title.append(el("i", "tier-gem"), el("b", null, tier.name));
    head.append(title, el("span", "tag", copy.tag));
    const price = el("span", "ed-price");
    const shown = founder ? ed.founder[cur] : ed.normal[cur];
    if (ladder.display === "perPersonFirst") {
      price.append(el("strong", null, money(ctx, shown / ed.people, true)), el("small", null, " per person"));
      const line = el("span", "ed-total", `${money(ctx, shown)} for ${ed.people}`);
      if (founder) line.append(" ", el("s", null, money(ctx, ed.normal[cur])));
      price.append(line);
    } else {
      price.append(el("strong", null, money(ctx, shown)));
      if (founder) price.append(" ", el("s", null, money(ctx, ed.normal[cur])));
      price.append(el("span", "ed-total", ed.people > 3 ? `≈ ${money(ctx, shown / ed.people, true)} per friend` : "For two"));
    }
    const fits = el("span", "ed-fit");
    const extra = Math.max(0, squad - ed.includes.characters);
    fits.textContent = extra ? `+${extra} extra ${extra === 1 ? "friend" : "friends"} at ${money(ctx, ADDONS.character_custom.price[cur])} each` : "Fits your squad";
    if (extra) fits.classList.add("over");
    const ul = el("ul");
    copy.features.forEach(f => ul.append(el("li", null, f)));
    const pick = el("button", chosen ? "btn ed-pick" : "btn ghost ed-pick", chosen ? `✓ ${tier.name} selected` : `Choose ${tier.name}`);
    pick.type = "button";
    pick.setAttribute("aria-pressed", String(chosen));
    pick.onclick = () => ctx.update(dr => chooseEdition(dr, id));
    card.onclick = e => { if (e.target !== pick) pick.click(); };
    card.append(head, price, fits, ul, pick);
    grid.append(card);
  }
  panel.append(grid);

  if (ladder.id === "B") {
    const dc = el("div", "upsell");
    dc.append(el("b", null, `Director's Cut · ${money(ctx, ADDONS.directors_cut.price[cur])}`),
      el("p", null, "An evolution for every character, two more cutscenes, a second move each, voices for the whole cast and online multiplayer for a year."),
      checkbox("Add the Director's Cut", d.directorsCut, v => ctx.update(dr => ({ ...dr, directorsCut: v }))));
    panel.append(dc);
  }
};
