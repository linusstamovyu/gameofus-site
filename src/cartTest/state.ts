// The cart test's own little order: who's in the game, which games, which edition. Pure, so the survey page,
// the variant renderers and the tests all read the same rules, and it reuses the real price table (prices.ts)
// rather than inventing survey prices.
import { BIG_GAMES, MINIGAMES, type BigGame, type Minigame } from "../order/catalogue";
import {
  ADDONS, EDITION_IDS, LADDERS, ACTIVE_LADDER, downgradeHint, formatMoney, quote, upgradeHint,
  type Allowance, type Currency, type EditionId, type OrderPicks,
} from "../order/prices";

/** The two ways a task can start (plan: Park et al. 2000 — building up vs trimming down). */
export type Mode = "add" | "trim";
export type VariantId = "B" | "C" | "R7" | "D" | "E";

export interface Friend { id: string; name: string; face: string }

/** Six mates to choose from. Faces are the site's own squad art. */
export const FRIENDS: Friend[] = [
  { id: "rico", name: "Rico", face: "rico_face.webp" },
  { id: "kai", name: "Kai", face: "kai_face.webp" },
  { id: "elias", name: "Elias", face: "elias_face.webp" },
  { id: "coco", name: "Coco", face: "coco_face.webp" },
  { id: "ethan", name: "Ethan", face: "ethan_face.webp" },
  { id: "nala", name: "Nala", face: "nala_face.webp" },
];

/** Party Mode is out of scope for the test, so the drinking games are left off the shelf. */
export const TEST_MINIGAMES: Minigame[] = MINIGAMES.filter(m => !m.drinking);
export const TEST_BIG_GAMES: BigGame[] = BIG_GAMES;

export interface Cart {
  edition: EditionId;
  friends: string[];
  bigGames: string[];
  minigames: string[];
}

export const CURRENCY: Currency = "EUR";
const PAID_ORDERS = 0; // founder prices, as the live site shows today

/** Where a task starts: empty on "add", a full Deluxe loadout on "trim". */
export function startCart(mode: Mode): Cart {
  if (mode === "add") return { edition: "standard", friends: [FRIENDS[0].id], bigGames: [], minigames: [] };
  const inc = allowanceOf("deluxe");
  return {
    edition: "deluxe",
    friends: FRIENDS.slice(0, Math.min(inc.characters, FRIENDS.length)).map(f => f.id),
    bigGames: TEST_BIG_GAMES.slice(0, inc.bigGames).map(g => g.id),
    minigames: TEST_MINIGAMES.slice(0, inc.minigames).map(g => g.id),
  };
}

export const allowanceOf = (edition: EditionId): Allowance => LADDERS[ACTIVE_LADDER].editions[edition].includes;

export const picksOf = (c: Cart): OrderPicks => ({
  edition: c.edition,
  friends: Math.max(1, c.friends.length),
  bigGames: c.bigGames.length,
  minigames: c.minigames.length,
});

export const quoteOf = (c: Cart) => quote(picksOf(c), CURRENCY, PAID_ORDERS);
export const money = (minor: number, round = false) => formatMoney(minor, CURRENCY, { round });
export const editionPrice = (edition: EditionId) => LADDERS[ACTIVE_LADDER].editions[edition].founder[CURRENCY];

/** What this exact order would cost on another edition: the ladder, and the "priced by difference" line. */
export function priceOnEdition(c: Cart, edition: EditionId): number {
  return quote({ ...picksOf(c), edition }, CURRENCY, PAID_ORDERS).total;
}

export interface EditionOption { edition: EditionId; total: number; difference: number; best: boolean }

/** Every edition priced for this order, cheapest difference flagged. Used by the ladder in B, D and E. */
export function editionOptions(c: Cart): EditionOption[] {
  const now = quoteOf(c).total;
  const rows = EDITION_IDS.map(edition => {
    const total = priceOnEdition(c, edition);
    return { edition, total, difference: total - now, best: false };
  });
  const cheapest = rows.reduce((a, b) => (b.total < a.total ? b : a));
  if (cheapest.edition !== c.edition && cheapest.total < now) cheapest.best = true;
  return rows;
}

/** A bigger edition that covers the same picks for the same money or less, or a smaller one that costs less. */
export const betterEdition = (c: Cart) =>
  upgradeHint(picksOf(c), CURRENCY, PAID_ORDERS) ?? downgradeHint(picksOf(c), CURRENCY, PAID_ORDERS);

export type SectionId = "friends" | "bigGames" | "minigames";

export interface SectionState {
  id: SectionId;
  label: string;
  /** What the edition covers. */
  included: number;
  /** Items picked, in pick order. */
  picked: { id: string; name: string; art: string }[];
  /** Picks past the allowance, each charged at `extraEach`. */
  over: number;
  extraEach: number;
}

const artOf = (id: string) => `order-assets/${id}`;

export function sections(c: Cart): SectionState[] {
  const inc = allowanceOf(c.edition);
  const friends = c.friends.map(id => {
    const f = FRIENDS.find(x => x.id === id)!;
    return { id: f.id, name: f.name, art: `assets/${f.face}` };
  });
  const big = c.bigGames.map(id => {
    const g = TEST_BIG_GAMES.find(x => x.id === id)!;
    return { id: g.id, name: g.name, art: artOf(g.art) };
  });
  const mini = c.minigames.map(id => {
    const g = TEST_MINIGAMES.find(x => x.id === id)!;
    return { id: g.id, name: g.name, art: artOf(g.art) };
  });
  return [
    { id: "friends", label: "Squad", included: inc.characters, picked: friends, over: Math.max(0, friends.length - inc.characters), extraEach: ADDONS.character_custom.price[CURRENCY] },
    { id: "bigGames", label: "Big games", included: inc.bigGames, picked: big, over: Math.max(0, big.length - inc.bigGames), extraEach: ADDONS.big_game.price[CURRENCY] },
    { id: "minigames", label: "Party minigames", included: inc.minigames, picked: mini, over: Math.max(0, mini.length - inc.minigames), extraEach: ADDONS.minigame.price[CURRENCY] },
  ];
}

export const totalOver = (c: Cart) => sections(c).reduce((n, s) => n + s.over, 0);

/** Toggle one pick. Returns the new cart and what happened, so the page can count adds and removes. */
export function toggle(c: Cart, section: SectionId, id: string): { cart: Cart; action: "add" | "remove" | "none" } {
  const list = section === "friends" ? c.friends : section === "bigGames" ? c.bigGames : c.minigames;
  const has = list.includes(id);
  // Somebody has to be in the game: the last character can't be removed.
  if (has && section === "friends" && list.length <= 1) return { cart: c, action: "none" };
  const next = has ? list.filter(x => x !== id) : [...list, id];
  const cart: Cart = { ...c, [section]: next } as Cart;
  return { cart, action: has ? "remove" : "add" };
}

export const has = (c: Cart, section: SectionId, id: string) =>
  (section === "friends" ? c.friends : section === "bigGames" ? c.bigGames : c.minigames).includes(id);
