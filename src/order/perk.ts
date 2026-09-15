// The beach tour bonus (plan 18 §5, phase 2). Finish the 7 stops on the home page and something already built
// comes free for 7 days. PURE: the page, the draft, the payload and the Worker all use these rules, and the Worker
// re-derives the bonus from the unlock time rather than trusting any price from the browser.
//
// It is unlocked on the visitor's own device, so it can be faked with dev tools; the owner accepted that (it gives
// away work that already exists, and faking it is more effort than walking the beach).
import type { AddonId, EditionId } from "./prices";

export const PERK_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

/** What the bonus makes free, as unit counts the quote subtracts before charging. */
export interface PerkFree {
  /** Party minigames past the edition's allowance. */
  minigame?: number;
  party_mode?: number;
  item?: number;
}

export type PerkKind = "minigames" | "party_mode" | "items";

/** A valid unlock time: in the past (a little clock skew allowed) and under PERK_DAYS old. */
export function perkActive(unlockedAt: unknown, now = Date.now()): unlockedAt is number {
  return typeof unlockedAt === "number" && Number.isFinite(unlockedAt) && unlockedAt <= now + 5 * 60 * 1000 && now - unlockedAt < PERK_DAYS * DAY;
}

/** Whole days left, at least 1 while it's active. */
export function perkDaysLeft(unlockedAt: number, now = Date.now()): number {
  return Math.max(1, Math.ceil((PERK_DAYS * DAY - (now - unlockedAt)) / DAY));
}

/**
 * Which bonus an order gets. Ultimate already includes all 12 minigames, so it gets Party Mode instead, unless the
 * group said not everyone is 18+, in which case 3 custom items from the game's existing icons.
 */
export function perkKind(edition: EditionId, adults: "yes" | "no" | null): PerkKind {
  if (edition !== "ultimate") return "minigames";
  return adults === "no" ? "items" : "party_mode";
}

export const PERK_ITEMS = 3;

export function perkFree(kind: PerkKind): PerkFree {
  if (kind === "minigames") return { minigame: 12 };
  if (kind === "party_mode") return { party_mode: 1 };
  return { item: PERK_ITEMS };
}

/** Plain words for the finale card and Review. */
export const PERK_LABEL: Record<PerkKind, string> = {
  minigames: "All 12 party minigames at no extra cost",
  party_mode: "Party Mode (18+) free",
  items: `${PERK_ITEMS} custom items free, from the game's own icons`,
};

/** Add-on ids a bonus can touch, so the quote knows what to subtract from. */
export const PERK_ADDONS: (AddonId & keyof PerkFree)[] = ["party_mode", "item"];

/** Examples for the 3 free items: art that already ships in the game (plan 18). */
export const PERK_ITEM_EXAMPLES: [string, string][] = [
  ["A magazine", "vortes_magazine"], ["Keys", "moped_keys"], ["A key card", "key_card"], ["A wristband", "wristband"],
  ["A bucket hat", "bucket_hat"], ["A lucky coin", "lucky_euro"], ["Sunglasses", "designer_shades"],
  ["A sangria bucket", "sangria_bucket"], ["A coffee", "strong_coffee"], ["A map", "map"],
];
