// Edition tiers as card rarities (owner, 15 Sep 2026: "as FIFA and stuff do"). Standard is SILVER, Deluxe is
// GOLD (the one we recommend, so it is the most attractive), Ultimate is a dark holographic SPECIAL.
//
// IT LIVES IN shared/ BECAUSE A TIER IS SHOWN IN FOUR PLACES, NOT ONE (owner, 17 Sep 2026: "the diff version
// buttons should reflect the same color sheme, look everywhere"). It started inside the order page, so the
// home page's price cards and the beach tour's price card each invented their own colours — and the home
// page's said the OPPOSITE thing, painting Deluxe teal and the other two gold. The colours themselves are the
// `.tier-<id>` custom properties in styles.css, which every page loads; this file only names them and builds
// the two small pieces that carry a tier around: the gem and the pill.
import { el } from "../dom";
import type { EditionId } from "../order/prices";

export const TIER_LOOK: Record<EditionId, { metal: string; name: string }> = {
  standard: { metal: "Silver", name: "Standard" },
  deluxe: { metal: "Gold", name: "Deluxe" },
  ultimate: { metal: "Special", name: "Ultimate" },
};

export const tierClass = (id: EditionId) => `tier-${id}`;

/** The little rotated diamond that marks a tier. Takes its colour from the `tier-<id>` class on an ancestor. */
export const tierGem = () => el("i", "tier-gem");

/** A small rarity-coloured pill: "Deluxe", optionally with extra text after it. */
export function tierPill(id: EditionId, text = TIER_LOOK[id].name): HTMLElement {
  const pill = el("span", `tier-pill ${tierClass(id)}`);
  pill.append(tierGem(), document.createTextNode(text));
  return pill;
}
