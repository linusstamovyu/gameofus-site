import { W, tileKey, type BeachMap } from "./map";

export type Tile = [number, number];

/**
 * Shortest 4-way route from (sx,sy) to (tx,ty), excluding the start tile.
 * `[]` when already there, `null` when unreachable.
 */
export function findPath(map: BeachMap, sx: number, sy: number, tx: number, ty: number): Tile[] | null {
  if (sx === tx && sy === ty) return [];
  const start = tileKey(sx, sy);
  const prev = new Map<number, number>([[start, -1]]);
  const queue: Tile[] = [[sx, sy]];
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = tileKey(nx, ny);
      if (!map.walkable(nx, ny) || prev.has(k)) continue;
      prev.set(k, tileKey(x, y));
      if (nx === tx && ny === ty) {
        const out: Tile[] = [];
        for (let c = k; c !== start; c = prev.get(c)!) out.push([c % W, Math.floor(c / W)]);
        return out.reverse();
      }
      queue.push([nx, ny]);
    }
  }
  return null;
}
