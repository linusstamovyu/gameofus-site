// Grid movement for the lad you walk as. Pure: no DOM, testable.
import type { Stop } from "../content/types";
import { PLAYER_START, type BeachMap } from "./map";
import { findPath, type Tile } from "./path";

export type Facing = "up" | "down" | "left" | "right";
export const vec = (d: Facing): Tile => (d === "up" ? [0, -1] : d === "down" ? [0, 1] : d === "left" ? [-1, 0] : [1, 0]);
export const dirTo = (dx: number, dy: number): Facing => (dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up");

const WALK_TILES_PER_S = 4.2;
const RUN_TILES_PER_S = 7;

export class Player {
  x = PLAYER_START[0]; y = PLAYER_START[1];
  /** Tile the current step started from. */
  fx = this.x; fy = this.y;
  t = 1; moving = false; running = false; facing: Facing = "down"; step = 0;
  path: Tile[] = [];
  pendingStop: Stop | null = null;
  target: Tile | null = null;

  constructor(private readonly map: BeachMap) {}

  /** Pixel position of the drawn tile, in tile units. */
  get drawX() { return this.fx + (this.x - this.fx) * (this.moving ? this.t : 1); }
  get drawY() { return this.fy + (this.y - this.fy) * (this.moving ? this.t : 1); }

  /** Route to a tile. Returns false when there is no way there. */
  walkTo(tx: number, ty: number): boolean {
    const p = findPath(this.map, this.x, this.y, tx, ty);
    if (!p) return false;
    this.path = p; this.pendingStop = null; this.target = [tx, ty];
    return true;
  }

  /** Route to a stop's talking tile; `onArrive` fires when standing on it facing the stop. */
  walkToStop(s: Stop): boolean {
    const p = findPath(this.map, this.x, this.y, s.ax, s.ay);
    if (!p) return false;
    this.path = p; this.pendingStop = s; this.target = [s.ax, s.ay];
    return true;
  }

  cancelRoute() { this.path = []; this.pendingStop = null; this.target = null; }

  facingStop(): Stop | undefined {
    if (this.moving) return undefined;
    const [dx, dy] = vec(this.facing);
    return this.map.stopAt(this.x + dx, this.y + dy);
  }

  /**
   * Advance one frame. `held` is a keyboard direction (cancels any route).
   * Returns the stop arrived at this frame, if any.
   */
  update(dt: number, held: Facing | null, runHeld: boolean): Stop | null {
    let arrived: Stop | null = null;
    if (this.moving) {
      this.t += dt * (this.running ? RUN_TILES_PER_S : WALK_TILES_PER_S);
      if (this.t >= 1) {
        this.t = 1; this.moving = false; this.fx = this.x; this.fy = this.y;
        if (!this.path.length) arrived = this.finishRoute();
      }
    } else if (!this.path.length && this.pendingStop) {
      arrived = this.finishRoute(); // already standing on the talking tile
    }
    if (this.moving) return arrived;

    let dir = held, run = runHeld;
    if (dir) this.cancelRoute();
    if (!dir && this.path.length) {
      const [nx, ny] = this.path[0];
      if (!this.map.walkable(nx, ny)) { this.cancelRoute(); return arrived; }
      this.path.shift();
      dir = dirTo(nx - this.x, ny - this.y);
      run = this.path.length > 3; // long routes jog, short ones walk
    }
    if (dir) {
      this.facing = dir;
      const [dx, dy] = vec(dir);
      if (this.map.walkable(this.x + dx, this.y + dy)) {
        this.fx = this.x; this.fy = this.y; this.x += dx; this.y += dy;
        this.t = 0; this.moving = true; this.step++; this.running = run;
      }
    }
    return arrived;
  }

  private finishRoute(): Stop | null {
    this.target = null;
    const s = this.pendingStop;
    this.pendingStop = null;
    if (s && this.x === s.ax && this.y === s.ay) {
      this.facing = dirTo(s.x - this.x, s.y - this.y);
      return s;
    }
    return null;
  }
}
