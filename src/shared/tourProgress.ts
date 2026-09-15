// What this device remembers about the beach tour (plan 18 phase 2): which stops have been talked to, and when the
// bonus was unlocked. localStorage can throw (private windows); the tour and the order work without it.
import { perkActive } from "../order/perk";

const VISITED = "gameofus-tour-visited";
const PERK = "gameofus-perk";

export function loadVisited(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(VISITED) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function saveVisited(ids: Iterable<string>): void {
  try { localStorage.setItem(VISITED, JSON.stringify([...ids])); } catch { /* not saved */ }
}

/** The unlock time, or null when there is none or it has run out. */
export function loadPerk(): number | null {
  try {
    const t = Number(localStorage.getItem(PERK));
    return perkActive(t) ? t : null;
  } catch {
    return null;
  }
}

/** The stored unlock time, active or not (null when the tour was never finished on this device). */
function storedPerk(): number | null {
  try {
    const raw = localStorage.getItem(PERK);
    const t = raw === null ? NaN : Number(raw);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

/**
 * Unlock ONCE PER DEVICE (owner, 15 Sep 2026): the first finished tour starts the 7 days and walking it again,
 * during or after them, never starts a new window. Returns the one unlock time.
 */
export function unlockPerk(now = Date.now()): number {
  const had = storedPerk();
  if (had !== null) return had;
  try { localStorage.setItem(PERK, String(now)); } catch { /* this visit only */ }
  return now;
}
