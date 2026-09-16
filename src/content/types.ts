export type FighterType = "chill" | "speed" | "charm" | "brawn" | "brains";

export interface SquadMember {
  id: string;
  name: string;
  type: FighterType;
  move: string;
  line: string;
  walk: string;
  face: string;
  /** Optional: a member without a consented real photo shows only the game portrait. */
  photo?: string;
}

export interface Stop {
  id: string;
  /** The stop's own tile (solid: a person or a sign). */
  x: number;
  y: number;
  /** The tile you stand on to talk to it. */
  ax: number;
  ay: number;
  kind: "npc" | "sign";
  who?: string;
  label?: string;
  eyebrow: string;
  title: string;
  text?: string;
  art: string;
  thumbs?: [string, string][];
  steps?: [string, string][];
  showTiers?: boolean;
  last?: boolean;
  /** The builder step this stop is about ("Add this to my game" opens it). */
  step?: string;
  /** The Explore tab with everything on this topic ("See all"). Absent: Explore's top. */
  tab?: string;
  /** The "Add this" button's words. */
  add?: string;
}

export interface TierCopy {
  tag: string;
  friends: string;
  features: string[];
}

/** Card copy for one edition. Prices and cast sizes live in src/order/prices.ts. */
export interface Tier {
  id: "standard" | "deluxe" | "ultimate";
  name: string;
  short: string;
  cta: string;
  star: boolean;
  /** One set of copy per pricing ladder (A and B are both kept for a later decision). */
  copy: Record<"A" | "B", TierCopy>;
}

export interface Offer {
  tiers: Tier[];
  /** Add-ons shown under the cards, per ladder: [price-file id, label, show "from"]. */
  addons: Record<"A" | "B", [string, string, boolean][]>;
  /** Heading line; {people} and {each} are filled from the Deluxe edition. */
  perFriendNote: Record<"A" | "B", string>;
  deadlines: [string, string][];
}

export interface SiteConfig {
  contactEmail: string;
  analyticsToken: string;
  /** PostHog API host; empty means the EU cloud. */
  analyticsHost?: string;
  siteUrl: string;
  isDraft: boolean;
}

/** The home page's occasion doors (plan 19). `id` is an OccasionId from src/order/occasions.ts. */
export interface OccasionTile {
  id: string;
  title: string;
  /** Empty for Christmas, whose line carries the order deadline and is written at run time. */
  line: string;
}

export interface ForTwoCard {
  id: string;
  eyebrow: string;
  title: string;
  line: string;
  art: string;
  cta: string;
}

export interface Occasions {
  tiles: OccasionTile[];
  forTwo: ForTwoCard;
}
