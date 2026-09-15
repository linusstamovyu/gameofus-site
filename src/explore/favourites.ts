// Favourites picked on the Explore page (plan 18 §2), and how they land in the builder. PURE apart from the two
// storage helpers at the bottom, so the hand-off rules are testable.
import { BIG_GAMES, MINIGAMES } from "../order/catalogue";
import { setSection, toggleMinigame, type Draft } from "../order/draft";
import { VEHICLE_TYPES, type VehiclesChoices } from "../order/sections/vehicles";

/** What can be favourited and carried into the builder. Other cards are browse-only. */
export type FavKind = "game" | "minigame" | "vehicle";
export interface Favourites {
  game: string[];
  minigame: string[];
  vehicle: string[];
}

export const emptyFavourites = (): Favourites => ({ game: [], minigame: [], vehicle: [] });

const KNOWN: Record<FavKind, Set<string>> = {
  game: new Set(BIG_GAMES.map(g => g.id)),
  minigame: new Set(MINIGAMES.map(m => m.id)),
  vehicle: new Set(VEHICLE_TYPES.map(v => v.id)),
};

/** Untrusted (a stored value, a restore link) into valid favourites: unknown ids and duplicates dropped. */
export function checkFavourites(raw: unknown): Favourites {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = emptyFavourites();
  for (const kind of Object.keys(KNOWN) as FavKind[]) {
    const list = Array.isArray(r[kind]) ? (r[kind] as unknown[]) : [];
    for (const id of list) if (typeof id === "string" && KNOWN[kind].has(id) && !out[kind].includes(id)) out[kind].push(id);
  }
  return out;
}

export function toggleFavourite(f: Favourites, kind: FavKind, id: string): Favourites {
  if (!KNOWN[kind].has(id)) return f;
  const list = f[kind].includes(id) ? f[kind].filter(x => x !== id) : [...f[kind], id];
  return { ...f, [kind]: list };
}

export const favouriteCount = (f: Favourites): number => f.game.length + f.minigame.length + f.vehicle.length;

/**
 * Tick the favourites in a draft. Adds, never removes, so it can't undo what someone already picked in the
 * builder. A drinking minigame only goes in when Party Mode is already on (toggleMinigame refuses it otherwise).
 */
export function applyFavourites(d: Draft, f: Favourites): Draft {
  let next: Draft = { ...d, bigGames: [...d.bigGames, ...f.game.filter(id => !d.bigGames.includes(id))] };
  for (const id of f.minigame) if (!next.minigames.includes(id)) next = toggleMinigame(next, id);
  const veh = next.sections.vehicles as VehiclesChoices;
  const types = [...veh.types, ...f.vehicle.filter(id => !veh.types.includes(id as VehiclesChoices["types"][number]))] as VehiclesChoices["types"];
  types.sort((a, b) => VEHICLE_TYPES.findIndex(v => v.id === a) - VEHICLE_TYPES.findIndex(v => v.id === b));
  return setSection(next, "vehicles", { ...veh, types });
}

const KEY = "gameofus-favourites";

export function loadFavourites(): Favourites {
  try {
    return checkFavourites(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return emptyFavourites();
  }
}

export function saveFavourites(f: Favourites): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    // Private windows can refuse storage; the favourites still work for this visit.
  }
}
