// The beach: Praia de Albufeira cut down to one screen-and-a-bit.
// Pure data and rules only (no DOM), so tests can load it.
import type { Stop } from "../content/types";

/** Open beach added on the left (2026-09-16), so the player starts clear of the title card and the camera can centre on him. */
export const PAD_LEFT = 7;
export const W = 22 + PAD_LEFT;
export const H = 18;

export const Ground = { Town: 0, Cliff: 1, Board: 2, Sand: 3, Wet: 4, Sea: 5 } as const;
export type Ground = (typeof Ground)[keyof typeof Ground];

/** Bands, north to south: old town, cliff, boardwalk, sand, wet sand, sea. */
export function groundAt(_x: number, y: number): Ground {
  if (y === 0) return Ground.Town;
  if (y <= 2) return Ground.Cliff;
  if (y === 3) return Ground.Board;
  if (y <= 11) return Ground.Sand;
  if (y === 12) return Ground.Wet;
  return Ground.Sea;
}

export const PALMS: [number, number][] = [[9, 5], [16, 4], [22, 4], [28, 8], [8, 11]];
export const PARASOLS: [number, number][] = [[10, 9], [17, 11], [23, 11], [27, 5]];
export const PLAYER_START: [number, number] = [9, 8];

export const tileKey = (x: number, y: number) => y * W + x;

export class BeachMap {
  private readonly solid = new Set<number>();
  constructor(readonly stops: Stop[]) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const g = groundAt(x, y);
        if (g === Ground.Town || g === Ground.Cliff || g === Ground.Sea) this.solid.add(tileKey(x, y));
      }
    for (const [x, y] of [...PALMS, ...PARASOLS]) this.solid.add(tileKey(x, y));
    for (const s of stops) this.solid.add(tileKey(s.x, s.y));
  }
  inBounds(x: number, y: number) { return x >= 0 && y >= 0 && x < W && y < H; }
  walkable(x: number, y: number) { return this.inBounds(x, y) && !this.solid.has(tileKey(x, y)); }
  stopAt(x: number, y: number) { return this.stops.find(s => s.x === x && s.y === y); }
}

/** Deterministic 0..1 noise per tile, so the sand speckles never shimmer. */
export function hash(x: number, y: number, s = 0): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
