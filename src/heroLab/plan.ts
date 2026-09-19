// Hero lab (hero-lab.html): the scroll walk as numbers, no DOM. Owner's grilled picks, 17 Sep 2026.
//
// Scroll is measured in "screens" of the pin's height, spent in order:
//   start   the first sliver: any scroll at all plays the transformation (Q4)
//   friends five stretches, each a walk to one friend then a hold while their card is open (Q2)
//   end     the camera pulls back to the whole beach as the world returns to summer (Q8, Q10),
//           then the ending pop-up holds, then the pin lets go (Q11)

export const START = 0.35;
export const WALK = 0.6;
export const HOLD = 0.6;
export const PULL = 0.8;
export const END_HOLD = 1.1;

/** A friend on the walk: which stop they stand at, which world they are met in (index into SEASONS). */
export interface Friend { stop: string; world: number }
/** In walking order along the beach, so the route never doubles back (Q6, Q9). */
export const FRIENDS: Friend[] = [
  { stop: "nala", world: 1 },   // jungle
  { stop: "kai", world: 2 },    // fairy tale (Rico stands here: Kai is the player)
  { stop: "elias", world: 3 },  // neon
  { stop: "coco", world: 4 },   // snow
  { stop: "ethan", world: 5 },  // mars
];
export const TOTAL = START + FRIENDS.length * (WALK + HOLD) + PULL + END_HOLD;

/** The zoom at each friend: a small step out every time (Q8). The end pulls on to the whole beach. */
export const zoomAtFriend = (i: number) => Math.exp(Math.log(0.76) * Math.max(0, i) / (FRIENDS.length - 1));

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const smoother = (t: number) => { const k = clamp01(t); return k * k * k * (k * (k * 6 - 15) + 10); };
export const logLerp = (a: number, b: number, t: number) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);

export type Phase =
  | { kind: "start" }
  | { kind: "walk"; i: number; t: number }
  | { kind: "hold"; i: number; t: number }
  | { kind: "pull"; t: number }
  | { kind: "end"; t: number };

/** Screens scrolled into the track to the phase. */
export function phaseAt(u: number): Phase {
  let s = u - START;
  if (s < 0) return { kind: "start" };
  for (let i = 0; i < FRIENDS.length; i++) {
    if (s < WALK) return { kind: "walk", i, t: s / WALK };
    s -= WALK;
    if (s < HOLD) return { kind: "hold", i, t: s / HOLD };
    s -= HOLD;
  }
  if (s < PULL) return { kind: "pull", t: s / PULL };
  return { kind: "end", t: clamp01((s - PULL) / END_HOLD) };
}
