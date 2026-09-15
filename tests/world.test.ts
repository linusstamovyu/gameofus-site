import { describe, expect, it } from "vitest";
import squad from "../src/content/squad.json";
import stopsJson from "../src/content/stops.json";
import type { Stop } from "../src/content/types";
import { BeachMap, H, PALMS, PARASOLS, PLAYER_START, W } from "../src/world/map";
import { findPath } from "../src/world/path";
import { Player } from "../src/world/player";

const stops = stopsJson as Stop[];
const map = new BeachMap(stops);

describe("the beach map", () => {
  it("starts the player on sand they can walk on", () => {
    expect(map.walkable(...PLAYER_START)).toBe(true);
  });

  it("gives every stop a talking tile that is walkable and next to it", () => {
    for (const s of stops) {
      expect(map.walkable(s.ax, s.ay), `${s.id} talking tile`).toBe(true);
      expect(Math.abs(s.ax - s.x) + Math.abs(s.ay - s.y), `${s.id} adjacency`).toBe(1);
    }
  });

  it("can reach every stop from the start, so the tour never strands", () => {
    for (const s of stops) {
      expect(findPath(map, ...PLAYER_START, s.ax, s.ay), s.id).not.toBeNull();
    }
  });

  it("never puts a palm, parasol or stop on a talking tile", () => {
    const blockers = [...PALMS, ...PARASOLS, ...stops.map(s => [s.x, s.y] as [number, number])];
    for (const s of stops) {
      expect(blockers.some(([x, y]) => x === s.ax && y === s.ay), s.id).toBe(false);
    }
  });

  it("leaves no walkable tile unreachable from the start", () => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (map.walkable(x, y)) expect(findPath(map, ...PLAYER_START, x, y), `${x},${y}`).not.toBeNull();
  });

  it("names only squad members that exist", () => {
    const ids = new Set(squad.map(m => m.id));
    for (const s of stops) if (s.who) expect(ids.has(s.who), s.id).toBe(true);
    for (const s of stops) if (s.kind === "npc") expect(s.who, `${s.id} is a person with no one assigned`).toBeTruthy();
  });

  it("ends the tour on the stop that shows prices", () => {
    expect(stops.at(-1)?.last).toBe(true);
    expect(stops.filter(s => s.last)).toHaveLength(1);
  });
});

describe("walking", () => {
  it("finds the shortest route", () => {
    expect(findPath(map, 2, 8, 2, 8)).toEqual([]);
    expect(findPath(map, 2, 8, 4, 8)).toHaveLength(2);
    expect(findPath(map, 2, 8, 0, 14)).toBeNull(); // the sea
  });

  it("walks a route to a stop and arrives facing it", () => {
    const p = new Player(map);
    const kai = stops.find(s => s.id === "kai")!;
    expect(p.walkToStop(kai)).toBe(true);
    let arrived: Stop | null = null;
    for (let i = 0; i < 600 && !arrived; i++) arrived = p.update(1 / 60, null, false);
    expect(arrived?.id).toBe("kai");
    expect([p.x, p.y]).toEqual([kai.ax, kai.ay]);
    expect(p.facingStop()?.id).toBe("kai");
  });

  it("opens a stop straight away when already standing on its talking tile", () => {
    const p = new Player(map);
    const kai = stops.find(s => s.id === "kai")!;
    p.walkToStop(kai);
    for (let i = 0; i < 600 && p.update(1 / 60, null, false) === null; i++);
    p.walkToStop(kai);
    expect(p.update(1 / 60, null, false)?.id).toBe("kai");
  });

  it("lets a held key take over from a route", () => {
    const p = new Player(map);
    p.walkTo(10, 8);
    p.update(1 / 60, "down", false);
    expect(p.path).toEqual([]);
    expect(p.target).toBeNull();
  });
});
