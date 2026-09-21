// Hero lab (hero-lab.html): the scroll walk as numbers, no DOM. Owner's grilled picks, 17 Sep 2026.
//
// Scroll is measured in "screens" of the pin's height, spent in order:
//   start   the first sliver: any scroll at all plays the transformation (Q4)
//   intro   the cast, before you walk to any of them: each friend's real photo turns into their character, one
//           after the next as you scroll (owner, 20 Sep 2026). It is a BEAT OF THE SCROLL and not a timed pop-up
//           because the transformation it follows can be set off two ways -- Press start, or scrolling -- and a
//           timed panel either fights a visitor who is already scrolling or holds up one who is not. As a phase it
//           reads at whatever pace they scroll, and it gives the scroll something to do before the first walk,
//           which is half of why the pin used to read as a stuck page.
//   friends five stretches, each a walk to one friend then a hold while their card is open (Q2)
//   end     the camera pulls back to the whole beach as the world returns to summer (Q8, Q10),
//           then the ending pop-up holds, then the pin lets go (Q11)

export const START = 0.35;
export const INTRO = 0.9;
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
export const TOTAL = START + INTRO + FRIENDS.length * (WALK + HOLD) + PULL + END_HOLD;

/** The zoom at each friend: a small step out every time (Q8). The end pulls on to the whole beach. */
export const zoomAtFriend = (i: number) => Math.exp(Math.log(0.76) * Math.max(0, i) / (FRIENDS.length - 1));

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const smoother = (t: number) => { const k = clamp01(t); return k * k * k * (k * (k * 6 - 15) + 10); };
export const logLerp = (a: number, b: number, t: number) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);

export type Phase =
  | { kind: "start" }
  | { kind: "intro"; t: number }
  | { kind: "walk"; i: number; t: number }
  | { kind: "hold"; i: number; t: number }
  | { kind: "pull"; t: number }
  | { kind: "end"; t: number };

/** Screens scrolled into the track to the phase. */
export function phaseAt(u: number): Phase {
  let s = u - START;
  if (s < 0) return { kind: "start" };
  if (s < INTRO) return { kind: "intro", t: s / INTRO };
  s -= INTRO;
  for (let i = 0; i < FRIENDS.length; i++) {
    if (s < WALK) return { kind: "walk", i, t: s / WALK };
    s -= WALK;
    if (s < HOLD) return { kind: "hold", i, t: s / HOLD };
    s -= HOLD;
  }
  if (s < PULL) return { kind: "pull", t: s / PULL };
  return { kind: "end", t: clamp01((s - PULL) / END_HOLD) };
}

/** Screens into the track where friend `i`'s card is fully open: the middle of their hold. */
export const atFriend = (i: number) => START + INTRO + i * (WALK + HOLD) + WALK + HOLD / 2;
/** Screens into the track where the ending pop-up is up. */
export const AT_END = START + INTRO + FRIENDS.length * (WALK + HOLD) + PULL + END_HOLD * 0.55;
