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
}

export interface Tier {
  id: string;
  name: string;
  short: string;
  priceDkk: number;
  from: boolean;
  tag: string;
  friends: string;
  features: string[];
  cta: string;
  star: boolean;
}

export interface Offer {
  tiers: Tier[];
  addons: [string, string][];
  perFriendNote: string;
  deadlines: [string, string][];
}

export interface SiteConfig {
  orderFormUrl: string;
  contactEmail: string;
  analyticsToken: string;
  siteUrl: string;
  isDraft: boolean;
}
