// What the game is FOR: the four occasion doors of step 0 (plan 19). Pure data and rules, no DOM.
//
// A pack is a DOOR, never a product: it pre-fills the configurator (edition, story outline, tone, the
// add-ons worth suggesting) and has no price of its own. That is what keeps one price ladder as the whole
// engine — prices.ts stays the only place a number lives, and plan 03's "worth X as add-ons" line stays
// true because nothing here invents a bundle.
//
// Suggestions are SUGGESTED, not pre-ticked. The owner's plan reads "pre-ticks the ending dedication", and
// an ending is an add-on (99 DKK): a paid extra that appears in the total on its own is the one thing the
// price rules on this site do not do ("the total leads", plan 03). So each occasion names what it would
// add, the step draws it with its price and a one-tap Add, and the total only moves when the visitor says so.

import type { EditionId } from "./prices";
import type { OutlineId } from "./sections/story";
import type { Tone } from "./sections/story";

export type OccasionId = "trip" | "christmas" | "birthday" | "partner";

/** What one tap on a suggestion does. The step owns the doing; this is only which ones to offer. */
export type SuggestionId = "party_mode" | "gift_card" | "ending_dedication" | "ending_birthday" | "ending_proposal" | "flex_pass";

export interface Occasion {
  id: OccasionId;
  /** On the tile. */
  title: string;
  /** One line under it: who it is for, in the buyer's own words. */
  line: string;
  /** How the recommendation says it back: "Because you are 6 and <why>." */
  why: string;
  /** The edition this occasion opens on when the visitor has not picked one. */
  edition: EditionId;
  /** The story tone it sets (free — a tone is copy, not an add-on). */
  tone: Tone;
  /** Outlines worth showing first, in order. Every occasion can still choose any of them. */
  outlines: OutlineId[];
  /** Add-ons the step offers with their price and a one-tap Add. Never applied on its own. */
  suggests: SuggestionId[];
  /** True for the one occasion whose cast is two people and is never split per friend (plan 03). */
  forTwo?: boolean;
}

export const OCCASIONS: Occasion[] = [
  {
    id: "trip",
    why: "it is for your friends",
    title: "Friends, or a trip",
    line: "A stag do, a hen do, a holiday you all still talk about.",
    edition: "deluxe",
    tone: "lads",
    outlines: ["heist", "crown", "traitor", "night"],
    suggests: ["party_mode", "flex_pass"],
  },
  {
    id: "christmas",
    why: "it is a Christmas gift",
    title: "A Christmas gift",
    line: "Under the tree, or played at the julefrokost.",
    edition: "deluxe",
    tone: "lads",
    outlines: ["crown", "traitor", "heist", "night"],
    suggests: ["gift_card", "flex_pass"],
  },
  {
    id: "birthday",
    why: "it is for a birthday",
    title: "A birthday",
    line: "A 30th, a 40th, a surprise on the big screen.",
    edition: "deluxe",
    tone: "lads",
    outlines: ["crown", "night", "heist", "traitor"],
    suggests: ["ending_birthday", "gift_card"],
  },
  {
    id: "partner",
    why: "it is for your partner",
    title: "My partner",
    line: "The two of you, your places, and how you met.",
    edition: "standard",
    tone: "romance",
    outlines: ["night", "heist"],
    suggests: ["ending_dedication", "ending_proposal"],
    forTwo: true,
  },
];

export const OCCASION_IDS: OccasionId[] = OCCASIONS.map(o => o.id);

/** Each occasion's illustration, named by its id (tools/build_occasion_art.py). The home page's doors, the
 * for-two card and the builder's step-0 tiles all read it, so a door never shows a picture of another occasion. */
export const occasionArt = (id: string): string => `occ_${id}.webp`;

export const occasionById = (id: OccasionId | null | undefined): Occasion | null =>
  OCCASIONS.find(o => o.id === id) ?? null;

/** The group sizes the stepper offers. One is a real answer: a game for one person is allowed. */
export const GROUP_SIZES = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const;

/** The size an occasion opens the stepper on, before the visitor touches it. */
export const suggestedSize = (id: OccasionId): number => (id === "partner" ? 2 : 6);
