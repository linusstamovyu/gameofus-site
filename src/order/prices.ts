// The one price table (plan 17). The home page, the order configurator and the checkout Worker all read
// prices from here, and the Worker recomputes every total with `quote` rather than trusting the browser.
// Change a price in Game of Us plan 03 first, then here; tests/prices.test.ts checks the two agree.
//
// ⚖️ TWO LADDERS ARE KEPT ON PURPOSE (owner, 15 Sep 2026). A shows the price per person first (799 / 1,049 /
// 1,399 DKK); B shows the total first and scales the same game with the group (799 / 1,299 / 1,999 DKK +
// Director's Cut). The owner hasn't decided. Screenshots and the reasoning for both are in
// "Game of Us/pricing-versions/README.md"; git tags pricing-a-per-person-first and pricing-b-total-first
// mark each site version. Switching the site is this one constant.
export const ACTIVE_LADDER: LadderId = "A";

export type LadderId = "A" | "B";
export type Currency = "DKK" | "GBP" | "EUR";
export type EditionId = "standard" | "deluxe" | "ultimate";

/** Money in minor units (øre, pence, cents), so no total is ever a float. */
export type Money = Record<Currency, number>;

export const CURRENCIES: Currency[] = ["DKK", "GBP", "EUR"];
export const EDITION_IDS: EditionId[] = ["standard", "deluxe", "ultimate"];
export const FOUNDER_SPOTS = 30;

/** Treated as "every one there is" (vehicle types on Ultimate). */
export const ALL = 99;

export interface Allowance {
  characters: number;
  bigGames: number;
  minigames: number;
  vehicles: number;
  phonePhotos: number;
  phoneBeats: number;
  zones: number;
  evolutions: number;
  cutscenes: number;
  movesPerCharacter: number;
  voiceLines: number;
  revisions: number;
}

export interface Edition {
  id: EditionId;
  founder: Money;
  normal: Money;
  /** Group size the per-person or per-friend figure is worked out for. */
  people: number;
  /** What the contents cost bought as add-ons, in DKK (plan 03), for "worth X" / "you save X". */
  worthDkk: number;
  includes: Allowance;
}

export interface Ladder {
  id: LadderId;
  /** A leads the card with the price per person; B leads with the total and splits only group editions. */
  display: "perPersonFirst" | "totalFirst";
  editions: Record<EditionId, Edition>;
}

const m = (dkk: number, gbp: number, eur: number): Money => ({ DKK: Math.round(dkk * 100), GBP: Math.round(gbp * 100), EUR: Math.round(eur * 100) });

export const LADDERS: Record<LadderId, Ladder> = {
  A: {
    id: "A",
    display: "perPersonFirst",
    editions: {
      standard: { id: "standard", founder: m(799, 89.99, 99.99), normal: m(1049, 119.99, 139.99), people: 2, worthDkk: 2300,
        includes: { characters: 2, bigGames: 1, minigames: 3, vehicles: 1, phonePhotos: 3, phoneBeats: 0, zones: 1, evolutions: 0, cutscenes: 0, movesPerCharacter: 1, voiceLines: 0, revisions: 1 } },
      deluxe: { id: "deluxe", founder: m(1049, 119.99, 139.99), normal: m(1399, 159.99, 179.99), people: 6, worthDkk: 9100,
        includes: { characters: 6, bigGames: 3, minigames: 6, vehicles: 3, phonePhotos: 6, phoneBeats: 1, zones: 3, evolutions: 1, cutscenes: 1, movesPerCharacter: 1, voiceLines: 1, revisions: 2 } },
      ultimate: { id: "ultimate", founder: m(1399, 159.99, 179.99), normal: m(1799, 209.99, 239.99), people: 10, worthDkk: 27300,
        includes: { characters: 10, bigGames: 5, minigames: 12, vehicles: ALL, phonePhotos: 12, phoneBeats: 3, zones: 6, evolutions: 10, cutscenes: 4, movesPerCharacter: 2, voiceLines: 10, revisions: 3 } },
    },
  },
  B: {
    id: "B",
    display: "totalFirst",
    editions: {
      standard: { id: "standard", founder: m(799, 89.99, 99.99), normal: m(1049, 119.99, 139.99), people: 3, worthDkk: 2800,
        includes: { characters: 3, bigGames: 1, minigames: 3, vehicles: 1, phonePhotos: 3, phoneBeats: 0, zones: 1, evolutions: 0, cutscenes: 0, movesPerCharacter: 1, voiceLines: 0, revisions: 1 } },
      deluxe: { id: "deluxe", founder: m(1299, 149.99, 174.99), normal: m(1699, 199.99, 229.99), people: 6, worthDkk: 9100,
        includes: { characters: 6, bigGames: 3, minigames: 6, vehicles: 3, phonePhotos: 6, phoneBeats: 1, zones: 3, evolutions: 1, cutscenes: 1, movesPerCharacter: 1, voiceLines: 1, revisions: 2 } },
      ultimate: { id: "ultimate", founder: m(1999, 229.99, 269.99), normal: m(2599, 299.99, 349.99), people: 10, worthDkk: 16800,
        includes: { characters: 10, bigGames: 5, minigames: 12, vehicles: ALL, phonePhotos: 12, phoneBeats: 3, zones: 5, evolutions: 2, cutscenes: 2, movesPerCharacter: 1, voiceLines: 1, revisions: 3 } },
    },
  },
};

/**
 * Add-ons (plan 03). `custom` add-ons are "from" prices: an order containing one becomes a request we
 * quote, never a checkout. `ladders` limits an add-on to the ladder it belongs to.
 */
export interface Addon {
  id: AddonId;
  name: string;
  price: Money;
  custom?: boolean;
  ladders?: LadderId[];
}

export type AddonId =
  | "character" | "character_custom" | "evolution" | "evolution_custom" | "talking_face" | "voice_line"
  | "move" | "move_custom" | "big_game" | "big_game_custom" | "flashback_gym" | "minigame" | "minigame_custom"
  | "minigames_pack" | "vehicle" | "own_car" | "zone" | "zone_photos" | "shop_sign" | "backdrop" | "backdrop_custom"
  | "cutscene" | "phone_beat" | "phone_beat_custom" | "phone_photo" | "ending" | "ending_custom" | "item"
  | "item_custom" | "party_mode" | "hosting_year" | "directors_cut" | "flex_pass" | "revision" | "trailer" | "gift_card";

const addon = (id: AddonId, name: string, price: Money, opts: Partial<Addon> = {}): Addon => ({ id, name, price, ...opts });

export const ADDONS: Record<AddonId, Addon> = Object.fromEntries([
  addon("character", "Extra character", m(159, 17.99, 20.99)),
  addon("character_custom", "Extra character from photos", m(399, 45.99, 52.99)),
  addon("evolution", "Evolution form", m(199, 22.99, 26.99)),
  addon("evolution_custom", "Evolution form, custom", m(449, 51.99, 59.99)),
  addon("talking_face", "Talking face on load-in", m(149, 16.99, 19.99)),
  addon("voice_line", "Voice line", m(129, 14.99, 16.99)),
  addon("move", "Signature move", m(99, 11.99, 12.99)),
  addon("move_custom", "Signature move, custom", m(249, 28.99, 32.99)),
  addon("big_game", "Big game or gym", m(449, 51.99, 59.99)),
  addon("big_game_custom", "Invent a big game or gym", m(1299, 149.99, 174.99), { custom: true }),
  addon("flashback_gym", "Flashback gym", m(1499, 174.99, 199.99), { custom: true }),
  addon("minigame", "Party minigame", m(59, 6.99, 7.99)),
  addon("minigame_custom", "Invent a minigame", m(599, 69.99, 79.99), { custom: true }),
  addon("minigames_pack", "All 12 party minigames (Standard)", m(299, 34.99, 39.99)),
  addon("vehicle", "Vehicle type", m(199, 22.99, 26.99)),
  addon("own_car", "Your own car", m(399, 45.99, 52.99)),
  addon("zone", "Extra zone", m(299, 34.99, 39.99)),
  addon("zone_photos", "Extra zone from your photos", m(899, 104.99, 119.99)),
  addon("shop_sign", "Your shop or bar as signage", m(59, 6.99, 7.99)),
  addon("backdrop", "Battle backdrop", m(99, 11.99, 12.99)),
  addon("backdrop_custom", "Battle backdrop, custom", m(199, 22.99, 26.99)),
  addon("cutscene", "Plate cutscene", m(399, 45.99, 52.99)),
  addon("phone_beat", "Phone call or news mail", m(129, 14.99, 16.99)),
  addon("phone_beat_custom", "Phone call or news mail, custom", m(249, 28.99, 32.99)),
  addon("phone_photo", "Phone photo", m(59, 6.99, 7.99)),
  addon("ending", "Ending dedication or reveal", m(99, 11.99, 12.99)),
  addon("ending_custom", "Ending reveal, custom", m(399, 45.99, 52.99)),
  addon("item", "Custom item or drink", m(49, 5.99, 6.99)),
  addon("item_custom", "Custom item or drink, drawn", m(99, 11.99, 12.99)),
  addon("party_mode", "Party Mode (18+)", m(299, 34.99, 39.99)),
  addon("hosting_year", "Online multiplayer hosting, 1 year", m(299, 34.99, 39.99)),
  addon("directors_cut", "Director's Cut", m(799, 89.99, 99.99), { ladders: ["B"] }),
  addon("flex_pass", "Flex Pass", m(129, 14.99, 16.99)),
  addon("revision", "Extra revision round", m(249, 28.99, 32.99)),
  addon("trailer", "Trailer video", m(299, 34.99, 39.99)),
  addon("gift_card", "Printable gift card", m(59, 6.99, 7.99)),
].map(a => [a.id, a])) as Record<AddonId, Addon>;

// ---------- quoting ----------

/** What the customer picked. Counts, never prices: the price always comes from this file. */
export interface OrderPicks {
  edition: EditionId;
  friends: number;
  bigGames: number;
  minigames: number;
  /** Everything else, by add-on id and quantity. */
  addons?: Partial<Record<AddonId, number>>;
  /** Rush delivery: +50% of everything else (plan 03). */
  rush?: boolean;
}

export interface LineItem {
  id: string;
  label: string;
  qty: number;
  unit: number;
  total: number;
}

export interface Quote {
  ladder: LadderId;
  currency: Currency;
  edition: EditionId;
  founder: boolean;
  lines: LineItem[];
  total: number;
  /** What the same order costs at normal prices, for the crossed-out figure. */
  normalTotal: number;
  /** A custom item means we quote by hand: send a request, don't check out. */
  isRequest: boolean;
  /** Minor units per friend, for the share message. */
  perFriend: number;
}

export const MAX_FRIENDS = 12;
export const RUSH_SHARE = 0.5;

export function isFounder(paidOrders: number): boolean {
  return paidOrders < FOUNDER_SPOTS;
}

export function quote(picks: OrderPicks, currency: Currency, paidOrders: number, ladderId: LadderId = ACTIVE_LADDER): Quote {
  const ladder = LADDERS[ladderId];
  const ed = ladder.editions[picks.edition];
  const founder = isFounder(paidOrders);
  const friends = clampInt(picks.friends, 1, MAX_FRIENDS);
  const lines: LineItem[] = [];
  const push = (id: string, label: string, qty: number, unit: number) => { if (qty > 0) lines.push({ id, label, qty, unit, total: qty * unit }); };

  const base = (founder ? ed.founder : ed.normal)[currency];
  push(`edition:${ed.id}`, `${cap(ed.id)} edition`, 1, base);
  // Extras over the allowance, at the add-on price. Every extra friend is drawn from their photos.
  push("character_custom", ADDONS.character_custom.name, Math.max(0, friends - ed.includes.characters), ADDONS.character_custom.price[currency]);
  push("big_game", ADDONS.big_game.name, Math.max(0, clampInt(picks.bigGames, 0, 99) - ed.includes.bigGames), ADDONS.big_game.price[currency]);
  push("minigame", ADDONS.minigame.name, Math.max(0, clampInt(picks.minigames, 0, 12) - ed.includes.minigames), ADDONS.minigame.price[currency]);

  let isRequest = false;
  for (const [id, n] of Object.entries(picks.addons ?? {}) as [AddonId, number][]) {
    const a = ADDONS[id];
    if (!a || (a.ladders && !a.ladders.includes(ladderId))) continue; // unknown or not on this ladder: ignored, never charged
    const qty = clampInt(n, 0, 99);
    if (qty > 0 && a.custom) isRequest = true;
    push(id, a.name, qty, a.price[currency]);
  }

  let total = lines.reduce((s, l) => s + l.total, 0);
  let normalTotal = total - base + ed.normal[currency];
  if (picks.rush) {
    const rush = Math.round(total * RUSH_SHARE);
    push("rush", "Rush delivery (+50%)", 1, rush);
    total += rush;
    normalTotal += Math.round(normalTotal * RUSH_SHARE);
  }
  return { ladder: ladderId, currency, edition: ed.id, founder, lines, total, normalTotal, isRequest, perFriend: Math.round(total / friends) };
}

/** The smallest edition whose cast fits the group (the configurator's pre-selection). */
export function smallestEditionFor(friends: number, ladderId: LadderId = ACTIVE_LADDER): EditionId {
  const eds = LADDERS[ladderId].editions;
  return EDITION_IDS.find(id => eds[id].includes.characters >= friends) ?? "ultimate";
}

/** A bigger edition that covers the same picks for no more money, or null (the "Deluxe covers this" hint). */
export function upgradeHint(picks: OrderPicks, currency: Currency, paidOrders: number, ladderId: LadderId = ACTIVE_LADDER): { edition: EditionId; saves: number } | null {
  const now = quote(picks, currency, paidOrders, ladderId).total;
  let best: { edition: EditionId; saves: number } | null = null;
  for (const id of EDITION_IDS.slice(EDITION_IDS.indexOf(picks.edition) + 1)) {
    const t = quote({ ...picks, edition: id }, currency, paidOrders, ladderId).total;
    if (t <= now && (!best || now - t > best.saves)) best = { edition: id, saves: now - t };
  }
  return best;
}

const SYMBOL: Record<Currency, [string, string]> = { DKK: ["", " DKK"], GBP: ["£", ""], EUR: ["€", ""] };

/** "1,049 DKK", "£119.99", "€139.99". Whole kroner drop the decimals; pounds and euros keep them. */
export function formatMoney(minor: number, currency: Currency, opts: { round?: boolean } = {}): string {
  const major = minor / 100;
  const whole = currency === "DKK" || opts.round;
  const n = whole ? Math.round(major).toLocaleString("en-US") : major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [pre, post] = SYMBOL[currency];
  return `${pre}${n}${post}`;
}

function clampInt(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.floor(n))) : lo;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
