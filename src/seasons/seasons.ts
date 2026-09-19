// Season scroll (season-scroll.html): the six worlds in the order of the year, as a loop.
// Pure numbers only (no DOM, no themes), so the rules can be tested.
//
// A position is a real number: 0 is summer, 1 is the rainy season, 5 is the off-season and 6 is summer again.
// Between two whole numbers the map is a cross-dissolve: 1.3 is 70% jungle and 30% fairy-tale.
import type { ThemeId } from "../world/themes/types";

/** `word` is the one small word the homepage story shows as the world arrives; `light` worlds take dark text. */
export interface Season { world: ThemeId; season: string; word: string; light: boolean }

/** Owner, 16 Sep 2026: his example order, with Mars as an off-season stop between winter and summer. */
export const SEASONS: Season[] = [
  { world: "beach", season: "Summer", word: "beach", light: true },
  { world: "jungle", season: "Rainy season", word: "jungle", light: false },
  { world: "fairy", season: "Autumn", word: "fairytale", light: false },
  { world: "neon", season: "Late autumn", word: "neon", light: false },
  { world: "ski", season: "Winter", word: "snow", light: true },
  { world: "space", season: "Off-season", word: "mars", light: false },
];
export const N = SEASONS.length;

/** A blend this close to a whole number is drawn as one world, not two. */
export const BLEND_EPS = 0.002;
/** Seconds after the last sideways scroll before the map glides to the nearer world. */
export const SETTLE_DELAY = 0.5;
/** How fast the glide closes the gap (1/s). About 95% of the way in half a second. */
export const SETTLE_RATE = 6;
/** A strip tap or a drop-down pick fades straight to that world over this long. */
export const JUMP_SECONDS = 0.7;

export const wrap = (p: number) => ((p % N) + N) % N;
export const indexOf = (world: string | null | undefined) => SEASONS.findIndex(s => s.world === world);

/** The two worlds a position sits between, and how far along it is (0 = all `a`). */
export function blendAt(p: number): { a: number; b: number; f: number } {
  const w = wrap(p);
  let a = Math.floor(w), f = w - a;
  if (f >= 1 - BLEND_EPS) { a = (a + 1) % N; f = 0; }
  if (f <= BLEND_EPS) f = 0;
  return { a: a % N, b: (a + 1) % N, f };
}

/** The world showing more; it decides the words (barrier toasts, "You are standing …") and the drop-down. */
export const dominantAt = (p: number) => Math.round(wrap(p)) % N;

/** Signed steps from one world to another the short way round the loop (a tie goes forwards). */
export function shortestDelta(from: number, to: number): number {
  const d = wrap(to - from);
  return d > N / 2 ? d - N : d;
}

/** One frame of the glide towards the nearer whole number. */
export function settleStep(p: number, dt: number): number {
  const target = Math.round(p), d = target - p;
  if (Math.abs(d) < BLEND_EPS) return target;
  return p + d * Math.min(1, dt * SETTLE_RATE);
}

/** A wheel event's sideways travel, in worlds. One map-width of scrolling is one world. */
export function wheelWorlds(deltaX: number, deltaMode: number, width: number): number {
  const px = deltaMode === 1 ? deltaX * 16 : deltaMode === 2 ? deltaX * width : deltaX;
  return width > 0 ? px / width : 0;
}

/** Where the strip's marker sits, 0..1 across the strip. Each world owns an equal cell and sits at its centre. */
export const markerFraction = (p: number) => wrap(p + 0.5) / N;

export const ease = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };
