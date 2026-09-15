// The kart circuit for the end-of-tour showcase (plan 18 phase 3). PURE geometry, so the lap can be tested.
// The centreline is copied from the game's src/world/kartTrack.ts (KART_CENTRELINE, KART_HALF_WIDTH) and the
// background is that zone baked by the game's own painters (source/previews/kart_track.png, built to
// pv_kart_full.webp at 16 px a tile). If the game's circuit is re-laid, re-bake the PNG and copy the list again.

export const KART_W = 76;
export const KART_H = 54;
/** Tarmac either side of the centreline, in tiles, plus the half tile the drawn kerb covers. */
export const TRACK_HALF_WIDTH = 2.5;

export const CENTRELINE: readonly (readonly [number, number])[] = [
  [6, 50], [68, 50], [68, 36], [52, 36], [52, 43], [33, 43], [33, 28],
  [68, 28], [68, 6], [45, 6], [45, 17], [26, 17], [26, 6], [6, 6],
];

export type Dir = "down" | "up" | "left" | "right";
export interface Pose { x: number; y: number; dir: Dir; heading: number }

const segs = CENTRELINE.map((p, i) => {
  const q = CENTRELINE[(i + 1) % CENTRELINE.length];
  return { x0: p[0] + 0.5, y0: p[1] + 0.5, x1: q[0] + 0.5, y1: q[1] + 0.5, len: Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) };
});
const starts: number[] = [];
{ let d = 0; for (const s of segs) { starts.push(d); d += s.len; } }

/** Tiles in one lap (318 on the game's circuit). */
export const LAP_TILES = segs.reduce((n, s) => n + s.len, 0);

const dirOf = (dx: number, dy: number): Dir => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");

/** Where you are after driving `d` tiles along the centreline (wraps every lap). */
export function poseAt(d: number): Pose {
  const m = ((d % LAP_TILES) + LAP_TILES) % LAP_TILES;
  let i = segs.length - 1;
  while (i > 0 && starts[i] > m) i--;
  const s = segs[i], t = (m - starts[i]) / s.len;
  const dx = s.x1 - s.x0, dy = s.y1 - s.y0;
  return { x: s.x0 + dx * t, y: s.y0 + dy * t, dir: dirOf(dx, dy), heading: Math.atan2(dy, dx) };
}

/** How far round the lap the nearest point of the centreline is, and how far off it you are (tiles). */
export function nearest(x: number, y: number): { along: number; off: number } {
  let best = { along: 0, off: Infinity };
  segs.forEach((s, i) => {
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0;
    const t = Math.max(0, Math.min(1, ((x - s.x0) * dx + (y - s.y0) * dy) / (dx * dx + dy * dy)));
    const px = s.x0 + dx * t, py = s.y0 + dy * t;
    const off = Math.hypot(x - px, y - py);
    if (off < best.off) best = { along: starts[i] + t * s.len, off };
  });
  return best;
}

export const onTrack = (x: number, y: number): boolean => nearest(x, y).off <= TRACK_HALF_WIDTH;

/** The car sheet has four facings; pick the one closest to a free heading. */
export function dirForHeading(h: number): Dir {
  return dirOf(Math.cos(h), Math.sin(h));
}

/**
 * Lap progress that can't be cheated. Reversing takes progress back off, and a jump in the nearest point of more
 * than MAX_STEP tiles (cutting across the sand onto another part of the circuit) counts for nothing, so a short cut
 * only means driving the skipped part later.
 */
const MAX_STEP = 4;

export class LapCounter {
  private last: number;
  distance = 0;
  constructor(startAlong: number) { this.last = startAlong; }
  update(x: number, y: number): number {
    const { along } = nearest(x, y);
    let step = along - this.last;
    if (step < -LAP_TILES / 2) step += LAP_TILES;
    if (step > LAP_TILES / 2) step -= LAP_TILES;
    if (Math.abs(step) <= MAX_STEP) this.distance = Math.max(0, this.distance + step);
    this.last = along;
    return this.distance;
  }
}
