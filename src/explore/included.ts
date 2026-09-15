// The "Included in X" badge on an Explore card (plan 18 §1), derived from the active ladder so it can never
// disagree with the price cards. PURE.
import { ACTIVE_LADDER, ALL, EDITION_IDS, LADDERS, type Allowance, type EditionId, type LadderId } from "../order/prices";

const NAME: Record<EditionId, string> = { standard: "Standard", deluxe: "Deluxe", ultimate: "Ultimate" };

/**
 * "Standard 1 · Deluxe 3 · Ultimate 5" when every edition has some; "From Deluxe" when the cheaper ones have none;
 * "Add-on" when no edition includes it. `all` is how many exist, so an allowance that covers them says "all".
 */
export function includedBadge(key: keyof Allowance, all?: number, ladder: LadderId = ACTIVE_LADDER): string {
  const counts = EDITION_IDS.map(id => [id, LADDERS[ladder].editions[id].includes[key]] as const);
  const shown = (n: number) => (n >= ALL || (all != null && n >= all) ? "all" : String(n));
  const first = counts.findIndex(([, n]) => n > 0);
  if (first < 0) return "Add-on";
  if (first > 0) return `From ${NAME[counts[first][0]]}`;
  return counts.map(([id, n]) => `${NAME[id]} ${shown(n)}`).join(" · ");
}
