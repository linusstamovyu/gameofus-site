// Edition tiers as card rarities (owner, 15 Sep 2026: "as FIFA and stuff do"). Standard is SILVER, Deluxe is
// GOLD (the one we recommend, so it is the most attractive), Ultimate is a dark holographic SPECIAL. The
// colours live in order.css under `.tier-<id>`; this file only names them and builds the small pill that
// carries the tier everywhere an edition is shown (squad step, sticky bar, review).
import { el } from "../dom";
import type { EditionId } from "./prices";

export const TIER_LOOK: Record<EditionId, { metal: string; name: string }> = {
  standard: { metal: "Silver", name: "Standard" },
  deluxe: { metal: "Gold", name: "Deluxe" },
  ultimate: { metal: "Special", name: "Ultimate" },
};

export const tierClass = (id: EditionId) => `tier-${id}`;

/** A small rarity-coloured pill: "Deluxe", optionally with extra text after it. */
export function tierPill(id: EditionId, text = TIER_LOOK[id].name): HTMLElement {
  const pill = el("span", `tier-pill ${tierClass(id)}`);
  pill.append(el("i", "tier-gem"), document.createTextNode(text));
  return pill;
}
