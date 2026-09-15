// "Send my list" (plan 18 §2, phase 4): the favourites picked on Explore, emailed to the visitor with a link that
// puts them back. PURE: the page builds the request with it and the Worker checks it and writes the email with it,
// so the list in the email can only ever be things the site actually sells.
import { BIG_GAMES, MINIGAMES } from "../order/catalogue";
import { VEHICLE_TYPES } from "../order/sections/vehicles";
import { checkFavourites, favouriteCount, type Favourites } from "./favourites";

/** The fewest favourites before the page offers to send the list (plan 18). */
export const LIST_MIN_FAVOURITES = 3;
/** Emails one address can be sent per day (the Worker's own limit). */
export const LIST_PER_DAY = 3;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ListRequest {
  email: string;
  favourites: Favourites;
  /** Ticked by the visitor, never pre-ticked: founder spots and Christmas deadlines by email. */
  updates: boolean;
}

export type CheckedList = { ok: true; value: ListRequest } | { ok: false; error: string };

export function checkListRequest(raw: unknown): CheckedList {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const email = typeof r.email === "string" ? r.email.trim().slice(0, 200) : "";
  if (!EMAIL.test(email)) return { ok: false, error: "Add an email address we can send the list to." };
  const favourites = checkFavourites(r.favourites);
  if (favouriteCount(favourites) < 1) return { ok: false, error: "Pick something to put on the list first." };
  return { ok: true, value: { email, favourites, updates: r.updates === true } };
}

/** Favourites as a short query value: `g:kart.brawler|m:blackjack|v:taxi`. Ids are [a-z0-9-], so no escaping. */
export function encodeList(f: Favourites): string {
  return ([["g", f.game], ["m", f.minigame], ["v", f.vehicle]] as const)
    .filter(([, ids]) => ids.length).map(([k, ids]) => `${k}:${ids.join(".")}`).join("|");
}

export function decodeList(value: string | null): Favourites {
  const out: Record<string, string[]> = {};
  const keys: Record<string, string> = { g: "game", m: "minigame", v: "vehicle" };
  for (const part of (value ?? "").slice(0, 600).split("|")) {
    const [k, ids] = part.split(":");
    if (keys[k] && ids) out[keys[k]] = ids.split(".");
  }
  return checkFavourites(out);
}

/** The restore link. `siteUrl` has no trailing slash. */
export const listLink = (siteUrl: string, f: Favourites) => `${siteUrl}/explore.html?list=${encodeURIComponent(encodeList(f))}`;

const names = (ids: string[], table: { id: string; name: string }[]) => ids.map(id => table.find(t => t.id === id)?.name ?? id);

/** Plain text on purpose (see worker/email.ts): it always renders and nothing in it can become markup. */
export function listEmail(req: ListRequest, siteUrl: string): { subject: string; text: string } {
  const f = req.favourites;
  const block = (title: string, items: string[]) => (items.length ? [title, ...items.map(i => `  • ${i}`), ""] : []);
  const text = [
    "Here's the list you made on Game of Us.",
    "",
    ...block("Big games", names(f.game, BIG_GAMES)),
    ...block("Party minigames", names(f.minigame, MINIGAMES)),
    ...block("Getting around", names(f.vehicle, VEHICLE_TYPES)),
    "Pick up where you left off (your list comes back already ticked):",
    listLink(siteUrl, f),
    "",
    "Nothing to hand over yet? The photos of your friends can come last, just before you pay.",
    "",
    req.updates
      ? "You asked to hear about founder spots and Christmas deadlines. Reply \"stop\" any time and we won't email again."
      : "That's the only email you'll get from us about this list.",
    "",
    "Game of Us",
  ].join("\n");
  return { subject: "Your Game of Us list", text };
}
