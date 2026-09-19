// Step 1, What's it for: the occasion doors, how many people, and the shape of the story (plan 19).
//
// Two questions and a shape, then a line saying what we set up and why. Everything it sets stays changeable
// in the steps after it, and nothing it sets costs money: the suggestions are drawn with their price and a
// tap to add, because on this site the total leads and never moves on its own (plan 03).
//
// Mobile first: the tiles are one column on a phone, so the organiser can open this in the group chat.
import "./purpose.css";
import { asset, el } from "../../dom";
import { heading, money, stepEyebrow, type Ctx, type StepView } from "../context";
import { partyModeAvailable, setGroupSize, setOccasion, setOutline, setPartyMode, squadFriends, squadSize, type Draft } from "../draft";
import { GROUP_SIZES, OCCASIONS, occasionArt, occasionById, type SuggestionId } from "../occasions";
import { OUTLINES, outlineById, type StoryChoices } from "../sections/story";
import { setSection } from "../draft";
import { ADDONS, ACTIVE_LADDER, isFounder, LADDERS, type AddonId } from "../prices";
import { loopBox, slideshow } from "./loops";
import offerData from "../../content/offer.json";
import type { Offer } from "../../content/types";
import { track } from "../../shared/analytics";

const offer = offerData as unknown as Offer;

/** What a suggested add-on is and what tapping it does. Priced from ADDONS, so there is no second price here. */
interface Suggestion {
  addon: AddonId;
  label: string;
  blurb: string;
  on(d: Draft): boolean;
  add(d: Draft): Draft;
  /** Why it cannot be added yet, if it cannot. */
  blocked?(d: Draft): string | null;
}

const story = (d: Draft): StoryChoices => d.sections.story as StoryChoices;
const ending = (d: Draft, type: "dedication" | "birthday" | "proposal"): Draft =>
  setSection(d, "story", { ...story(d), ending: { ...story(d).ending, type } });

const SUGGESTIONS: Record<SuggestionId, Suggestion> = {
  party_mode: {
    addon: "party_mode",
    label: "Party Mode",
    blurb: "The drinking layer: sips, dares and three games that only appear with it on. 18+.",
    on: d => d.partyMode,
    add: d => setPartyMode(d, true),
    blocked: d => (partyModeAvailable(d) ? null : "Your group said not everyone is 18 or over."),
  },
  gift_card: {
    addon: "gift_card",
    label: "Printable gift card",
    blurb: "A PDF with a code to the game, so there is something to hand over on the day.",
    on: d => (d.sections.keepsakes as { giftCard: { on: boolean } }).giftCard.on,
    add: d => {
      const k = d.sections.keepsakes as { giftCard: { on: boolean } };
      return setSection(d, "keepsakes", { ...k, giftCard: { ...k.giftCard, on: true } });
    },
  },
  ending_dedication: {
    addon: "ending",
    label: "A dedication at the end",
    blurb: "The last scene carries a message from you, in your own words.",
    on: d => story(d).ending.type === "dedication",
    add: d => ending(d, "dedication"),
  },
  ending_birthday: {
    addon: "ending",
    label: "A birthday reveal",
    blurb: "The game ends on the surprise, with their name and the day.",
    on: d => story(d).ending.type === "birthday",
    add: d => ending(d, "birthday"),
  },
  ending_proposal: {
    addon: "ending",
    label: "A proposal",
    blurb: "The last gym ends with the question. We will ask you exactly how you want it worded.",
    on: d => story(d).ending.type === "proposal",
    add: d => ending(d, "proposal"),
  },
  flex_pass: {
    addon: "flex_pass",
    label: "Flex Pass",
    blurb: "One more round of changes, swap a photo or a friend any time before we start, move the date once.",
    on: d => d.flexPass,
    add: d => ({ ...d, flexPass: true }),
  },
};

/** The outline's three captured frames, played as a crossfading banner. */
const outlineScene = (id: string) =>
  slideshow(`outline-${id}`, [1, 2, 3].map(n => ({ file: `loop_outline_${id}_${n}.webp`, hold: 2.1 })),
    `Three moments from a ${id} story`, { fade: 0.5, push: true, w: 720, h: 240 });

function tiles(ctx: Ctx, d: Draft): HTMLElement {
  const wrap = el("div", "s-purpose-tiles");
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "What the game is for");
  for (const occ of OCCASIONS) {
    const on = d.occasion === occ.id;
    const tile = el("button", `s-purpose-tile${on ? " on" : ""}`);
    tile.type = "button";
    tile.setAttribute("aria-pressed", String(on));
    const art = el("img", "s-purpose-occart") as HTMLImageElement;
    art.src = asset(occasionArt(occ.id));
    art.alt = "";
    art.width = 960;
    art.height = 640;
    art.addEventListener("error", () => art.remove());
    tile.append(art, el("b", null, occ.title), el("span", null, occ.line));
    tile.onclick = () => {
      track("purpose_occasion", { occasion: occ.id });
      ctx.update(dr => setOccasion(dr, occ.id));
    };
    wrap.append(tile);
  }
  return wrap;
}

function sizeRow(ctx: Ctx, d: Draft): HTMLElement {
  const wrap = el("div", "s-purpose-sizes");
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "How many people is it for");
  const started = squadFriends(d).length;
  for (const n of GROUP_SIZES) {
    const on = squadSize(d) === n;
    const chip = el("button", `s-purpose-size${on ? " on" : ""}`, String(n));
    chip.type = "button";
    chip.setAttribute("aria-pressed", String(on));
    // A size below what is already typed in would drop a friend, so it is offered as unavailable instead.
    chip.disabled = n < started;
    chip.onclick = () => {
      track("purpose_size", { size: n });
      ctx.update(dr => setGroupSize(dr, n));
    };
    wrap.append(chip);
  }
  return wrap;
}

function outlineCards(ctx: Ctx, d: Draft): HTMLElement {
  const occ = occasionById(d.occasion);
  const order = occ ? [...occ.outlines, ...OUTLINES.filter(o => !occ.outlines.includes(o.id)).map(o => o.id)] : OUTLINES.map(o => o.id);
  const wrap = el("div", "s-purpose-outlines");
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "The shape of the story");
  const picked = story(d).outline;
  for (const id of order) {
    const o = outlineById(id);
    const on = picked === o.id;
    const card = el("button", `s-purpose-outline${on ? " on" : ""}`);
    card.type = "button";
    card.setAttribute("aria-pressed", String(on));
    if (o.id !== "own") card.append(loopBox(outlineScene(o.id), "s-purpose-art", card));
    const text = el("span", "s-purpose-otext");
    text.append(el("b", null, o.label), el("span", "s-purpose-oblurb", o.blurb));
    if (o.asks) text.append(el("span", "s-purpose-oasks", `You tell us: ${o.asks}`));
    card.append(text);
    card.onclick = () => {
      track("purpose_outline", { outline: o.id });
      ctx.update(dr => setOutline(dr, o.id));
    };
    wrap.append(card);
  }
  return wrap;
}

function recommendation(ctx: Ctx, d: Draft): HTMLElement {
  const occ = occasionById(d.occasion)!;
  const ladder = LADDERS[ACTIVE_LADDER];
  const editionId = d.edition ?? occ.edition;
  const ed = ladder.editions[editionId];
  const name = offer.tiers.find(t => t.id === editionId)?.name ?? editionId;
  const cur = ctx.currency();
  const size = squadSize(d);
  const card = el("div", "s-purpose-rec");
  const price = isFounder(ctx.paidOrders()) ? ed.founder[cur] : ed.normal[cur];
  const perFriend = occ.forTwo || ed.people <= 3 ? "for two" : `≈ ${money(ctx, price / Math.max(1, size), true)} each`;
  card.append(el("b", null, `${name} · ${money(ctx, price)} · ${perFriend}`));
  const people = size === 1 ? "on your own" : `${size} of you`;
  const why = story(d).outline === "own"
    ? `Because ${occ.why} and there are ${people}. Change any of it in the steps after this.`
    : `Because ${occ.why}, there are ${people}, and you picked ${outlineById(story(d).outline).label}.`;
  card.append(el("p", null, why));

  const list = el("div", "s-purpose-sug");
  for (const id of occ.suggests) {
    const s = SUGGESTIONS[id];
    const addon = ADDONS[s.addon];
    const on = s.on(d);
    const stop = s.blocked?.(d) ?? null;
    const row = el("div", `s-purpose-sugrow${on ? " on" : ""}`);
    const text = el("span", "s-purpose-sugtext");
    text.append(el("b", null, `${s.label} · ${money(ctx, addon.price[cur])}`), el("span", null, stop ?? s.blurb));
    const add = el("button", on ? "btn small" : "btn ghost small", on ? "✓ Added" : "Add");
    add.type = "button";
    add.disabled = on || stop !== null;
    add.onclick = () => {
      track("purpose_suggestion", { suggestion: id });
      ctx.update(dr => s.add(dr));
    };
    row.append(text, add);
    list.append(row);
  }
  if (occ.suggests.length) {
    card.append(el("p", "s-purpose-sughead", "Worth adding for this one — nothing is added until you tap it:"), list);
  }
  return card;
}

export const purposeStep: StepView = (ctx, panel) => {
  const d = ctx.draft();
  const occ = occasionById(d.occasion);
  panel.append(heading(stepEyebrow("purpose"), "What's it for?",
    "Two taps and we will set the game up around it. Everything stays changeable afterwards."));
  panel.append(tiles(ctx, d));

  const skip = el("button", "link-btn s-purpose-skip", "Something else — skip this");
  skip.type = "button";
  skip.dataset.track = "purpose_skip";
  skip.onclick = () => ctx.go("squad");
  panel.append(skip);

  if (!occ) return;

  const shelf = (title: string, lede: string, body: HTMLElement) => {
    const s = el("section", "shelf");
    const head = el("div", "shelf-head");
    head.append(el("h2", null, title));
    s.append(head, el("p", "lede", lede), body);
    panel.append(s);
  };

  shelf("How many people is it for?", occ.forTwo
    ? "Two is the usual answer here, and the price is never split for a couple."
    : "Everyone who becomes a character. We will pick the edition that fits.", sizeRow(ctx, d));
  shelf("The shape of the story", "Pick one to start from, or tell us your own. These are the ones we can build fast because the game already plays them.", outlineCards(ctx, d));
  shelf("What we have set up", "", recommendation(ctx, d));
};
