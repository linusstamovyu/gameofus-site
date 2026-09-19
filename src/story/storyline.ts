// The homepage season story, as numbers (no DOM): what the page shows at each point of the scroll.
//
// Scrolling the hero's track gives a progress p from 0 to 1, spent in three beats, measured in screens:
//   grow  (1)  the framed map opens out to full screen, and the world a visitor picked dissolves back to summer
//   year  (6)  Rico walks the beach while the camera pulls back and the worlds turn, holding on each one;
//              the lads he passes each say one thing the game can do
//   end   (1)  the camera finds Rico's face, and his real photo comes up beside it
// then the pin releases and the page carries on. Owner's picks, 17 Sep 2026.
import { ease } from "../seasons/seasons";

export const STORY = { grow: 1, year: 6, end: 1 } as const;
export const STORY_SCREENS = STORY.grow + STORY.year + STORY.end;
/** Share of each world's stretch of scroll where it stays whole before dissolving into the next. */
export const HOLD = 0.45;
/** Stop scrolling this long during the year and the map wakes up for exploring. */
export const EXPLORE_AFTER = 1.2;

/** Rico's walk: along row 8 from where he starts the game to the far end. */
export const WALK = { row: 8, from: 9, to: 25 } as const;
/**
 * Where he stops on the way, one per talk: he walks up to a lad, stops, and they speak, like a cutscene in the
 * game. There is one stop per world, so each line is said while its world holds. Walking the goal
 * forward a tile at a time instead made him step, stand, step, because a scroll is slower than a walk.
 */
export const STATIONS = [11, 14, 16, 20, 23, 25] as const;
/** Where each speaker stands (Rico reads the MAP sign at 19,5), for the camera to lean towards and Rico to face. */
export const SPEAKER_AT: Record<string, [number, number]> = {
  nala: [11, 6], kai: [15, 5], elias: [15, 10], rico: [19, 5], coco: [24, 6], ethan: [26, 9],
};
/** Which way Rico turns to listen: along whichever axis the speaker is further away on (ties look up or down). */
export const faceTowards = (dx: number, dy: number): "up" | "down" | "left" | "right" =>
  Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? "up" : "down") : dx < 0 ? "left" : "right";
/** Where the head sits on a character drawn at tile (x, y), relative to the tile's centre: one tile wide, two tall. */
export const HEAD = { dy: -0.86, h: 0.66 } as const;

/**
 * Who speaks as Rico walks past, and between which columns of his walk. Each lad says one thing the game can do,
 * in the site's voice; `who` is the stop id (the speech mark goes over them), and Rico reads the MAP sign himself.
 */
export interface Talk { who: string; from: number; to: number; text: string }
export const TALKS: Talk[] = [
  { who: "nala", from: 10, to: 13, text: "Woof. (Everyone in your group becomes a fighter. Even the dog.)" },
  { who: "kai", from: 13.5, to: 15.5, text: "My gym's a timber yard. You climb it with ramps you build yourself." },
  { who: "elias", from: 15.5, to: 18, text: "The thing I always do? It's an attack now. It's called Siren Song." },
  { who: "rico", from: 18.5, to: 21.5, text: "Hang on. This is our actual town." },
  { who: "coco", from: 22, to: 24.5, text: "Cars, scooters, taxis, a mine cart. Walking's for the rest of you." },
  { who: "ethan", from: 24.5, to: 27, text: "Your phone's going to ring. It's usually trouble." },
];
/** Whoever is talking when Rico is at column x. */
export const talkAt = (x: number): Talk | null => TALKS.find(t => x >= t.from && x < t.to) ?? null;

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Zoom is interpolated on its logarithm, so a push-in looks the same speed all the way through. */
export const logLerp = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));
/** Starts and stops with no speed and no acceleration: for the big camera moves. */
export const smoother = (t: number) => { const k = clamp01(t); return k * k * k * (k * (k * 6 - 15) + 10); };

export interface Beats { u: number; g: number; y: number; e: number; done: boolean }

/** Progress (0..1) to the three beats. `u` is in screens; g, y and e each run 0..1 inside their own beat. */
export function beats(p: number): Beats {
  const u = clamp01(p) * STORY_SCREENS;
  return {
    u,
    g: smoother(u / STORY.grow),
    y: clamp01((u - STORY.grow) / STORY.year),
    e: clamp01((u - STORY.grow - STORY.year) / STORY.end),
    done: p >= 1,
  };
}

/** Year progress to a season position, holding on each world. 0 and 6 are both summer. */
export function holdPos(y: number, n = 6): number {
  const t = clamp01(y) * n;
  const k = Math.min(n - 1, Math.floor(t));
  const l = t - k;
  return k + (l < HOLD ? 0 : ease((l - HOLD) / (1 - HOLD)));
}

/** The world's word is fully shown while the world holds and gone a quarter of the way into a dissolve. */
export const wordOpacity = (pos: number) => 1 - clamp01(Math.abs(pos - Math.round(pos)) / 0.22);

/** The column Rico should be walking to at year progress y: the stop that belongs to the world on screen. */
export const walkGoal = (y: number) => STATIONS[Math.min(STATIONS.length - 1, Math.floor(clamp01(y) * STATIONS.length))];

/** Seconds of dialogue typed so far to characters shown. */
export const TYPE_CPS = 42;
export const typed = (text: string, seconds: number) => text.slice(0, Math.max(0, Math.floor(seconds * TYPE_CPS)));
