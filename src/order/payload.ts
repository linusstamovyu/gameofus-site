// What the order page sends the Worker, and how the Worker checks it. Shared by both, pure, tested.
// The Worker never trusts a count or a total from the browser: it rebuilds the picks from the lists and
// quotes them itself with prices.ts.
import { BIG_GAMES, MINIGAMES } from "./catalogue";
import { ACTIVE_LADDER, EDITION_IDS, LADDERS, MAX_FRIENDS, type AddonId, type Currency, type EditionId, type OrderPicks } from "./prices";
import { checkSections, sectionAddons, sectionUploads, type SectionChoices } from "./sections";
import type { SectionContext, UploadRef } from "./sections/types";

export const PHOTO_KIND_IDS = ["face", "body", "outfit"] as const;
export type PhotoKindId = (typeof PHOTO_KIND_IDS)[number];

export interface OrderPayload {
  edition: EditionId;
  currency: Currency;
  country: string;
  friends: { id: string; name: string }[];
  bigGames: string[];
  minigames: string[];
  customGame: string;
  partyMode: boolean;
  flexPass: boolean;
  directorsCut: boolean;
  /** Steps 4–9; re-checked with each section's own check() on arrival. */
  sections: SectionChoices;
  organiser: {
    name: string;
    email: string;
    birthYear: string;
    adultsConfirmed: boolean;
    photosPermission: boolean;
    startNow: boolean;
  };
  /** What the page showed, so the Worker can say so if the price moved (e.g. founder spots ran out). */
  shownTotal: number;
}

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v: unknown) => v === true;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID = /^[a-z0-9-]{1,40}$/i;

export function checkPayload(raw: unknown, thisYear = new Date().getFullYear()): Checked<OrderPayload> {
  if (!raw || typeof raw !== "object") return { ok: false, error: "The order is empty." };
  const r = raw as Record<string, unknown>;
  const edition = r.edition as EditionId;
  if (!EDITION_IDS.includes(edition)) return { ok: false, error: "Unknown edition." };
  const currency = r.currency as Currency;
  if (!["DKK", "GBP", "EUR"].includes(currency)) return { ok: false, error: "Unknown currency." };
  const friendsRaw = Array.isArray(r.friends) ? r.friends : [];
  if (friendsRaw.length < 1 || friendsRaw.length > MAX_FRIENDS) return { ok: false, error: `An order has 1 to ${MAX_FRIENDS} friends.` };
  const friends = friendsRaw.map(f => ({ id: str((f as Record<string, unknown>)?.id, 40), name: str((f as Record<string, unknown>)?.name, 60) }));
  if (friends.some(f => !ID.test(f.id) || !f.name)) return { ok: false, error: "Every friend needs a name." };
  if (new Set(friends.map(f => f.id)).size !== friends.length) return { ok: false, error: "Two friends share an id." };
  const known = (list: unknown, ids: Set<string>) => [...new Set((Array.isArray(list) ? list : []).filter((x): x is string => typeof x === "string" && ids.has(x)))];
  const bigGames = known(r.bigGames, new Set(BIG_GAMES.map(g => g.id)));
  const partyMode = bool(r.partyMode);
  const minigames = known(r.minigames, new Set(MINIGAMES.filter(m => partyMode || !m.drinking).map(m => m.id)));
  const customGame = str(r.customGame, 2000);
  if (!bigGames.length && !customGame) return { ok: false, error: "Pick at least one big game, or describe your own." };
  const o = (r.organiser ?? {}) as Record<string, unknown>;
  const organiser = {
    name: str(o.name, 80),
    email: str(o.email, 200),
    birthYear: str(o.birthYear, 4),
    adultsConfirmed: bool(o.adultsConfirmed),
    photosPermission: bool(o.photosPermission),
    startNow: bool(o.startNow),
  };
  if (!organiser.name) return { ok: false, error: "Add your name." };
  if (!EMAIL.test(organiser.email)) return { ok: false, error: "Add a valid email address." };
  if (!organiser.photosPermission || !organiser.startNow) return { ok: false, error: "Tick the two confirmations." };
  if (partyMode) {
    const y = Number(organiser.birthYear);
    if (!/^\d{4}$/.test(organiser.birthYear) || thisYear - y < 18 || !organiser.adultsConfirmed) return { ok: false, error: "Party Mode is 18+." };
  }
  return {
    ok: true,
    value: {
      edition, currency, country: str(r.country, 2).toUpperCase() || "XX", friends, bigGames, minigames, customGame, partyMode,
      flexPass: bool(r.flexPass), directorsCut: bool(r.directorsCut), sections: checkSections(r.sections), organiser,
      shownTotal: Number.isFinite(r.shownTotal) ? Number(r.shownTotal) : 0,
    },
  };
}

/** What each section is told about a checked payload (the Worker's twin of draft.sectionContext). */
export function contextFromPayload(p: OrderPayload): SectionContext {
  return { edition: p.edition, includes: LADDERS[ACTIVE_LADDER].editions[p.edition].includes, friends: p.friends.map(f => f.name), partyMode: p.partyMode, currency: p.currency };
}

/** The picks prices.ts quotes, rebuilt from a checked payload. */
export function picksFromPayload(p: OrderPayload): OrderPicks {
  const addons: Partial<Record<AddonId, number>> = {};
  if (p.customGame) addons.big_game_custom = 1;
  if (p.partyMode) addons.party_mode = 1;
  if (p.flexPass) addons.flex_pass = 1;
  if (p.directorsCut) addons.directors_cut = 1;
  const { rush, ...fromSections } = sectionAddons(p.sections, contextFromPayload(p));
  for (const [id, n] of Object.entries(fromSections)) addons[id as AddonId] = (addons[id as AddonId] ?? 0) + n;
  return { edition: p.edition, friends: p.friends.length, bigGames: p.bigGames.length, minigames: p.minigames.length, addons, rush: Boolean(rush) };
}

/** Every section file the order refers to, with ids made safe and unique. */
export function payloadUploads(p: OrderPayload): (UploadRef & { section: string })[] {
  const seen = new Set<string>();
  return sectionUploads(p.sections).filter(u => /^[a-zA-Z0-9-]{1,40}$/.test(u.id) && !seen.has(u.id) && seen.add(u.id));
}

export interface CreatedOrder {
  id: string;
  total: number;
  currency: Currency;
  isRequest: boolean;
  /** True when the Worker's total differs from what the page showed. */
  priceChanged: boolean;
}

export type SubmitResult = { kind: "checkout"; url: string } | { kind: "request" };
