import { describe, expect, it } from "vitest";
import {
  N, SEASONS, blendAt, dominantAt, indexOf, markerFraction, settleStep, shortestDelta, wheelWorlds, wrap,
} from "../src/seasons/seasons";

describe("season scroll", () => {
  it("runs in the owner's order, with Mars between winter and summer", () => {
    expect(SEASONS.map(s => s.world)).toEqual(["beach", "jungle", "fairy", "neon", "ski", "space"]);
    expect(SEASONS.map(s => s.season)).toEqual(["Summer", "Rainy season", "Autumn", "Late autumn", "Winter", "Off-season"]);
  });

  it("loops: the world after the off-season is summer again", () => {
    expect(wrap(6)).toBe(0);
    expect(wrap(-0.25)).toBeCloseTo(5.75);
    expect(blendAt(5.25)).toEqual({ a: 5, b: 0, f: 0.25 });
    expect(blendAt(-0.25).b).toBe(0);
  });

  it("dissolves by how far along it is", () => {
    const { a, b, f } = blendAt(1.3);
    expect([a, b]).toEqual([1, 2]);
    expect(f).toBeCloseTo(0.3);
    // a hair either side of a world is that world alone, not two
    expect(blendAt(2.0005).f).toBe(0);
    expect(blendAt(1.9995)).toEqual({ a: 2, b: 3, f: 0 });
  });

  it("lets the world showing more decide the words", () => {
    expect(dominantAt(1.4)).toBe(1);
    expect(dominantAt(1.6)).toBe(2);
    expect(dominantAt(5.7)).toBe(0);
  });

  it("glides to the nearer world and stops there", () => {
    let p = 2.3;
    for (let i = 0; i < 120; i++) p = settleStep(p, 1 / 60);
    expect(p).toBe(2);
    p = 2.7;
    for (let i = 0; i < 120; i++) p = settleStep(p, 1 / 60);
    expect(p).toBe(3);
  });

  it("takes the short way round for a jump", () => {
    expect(shortestDelta(0, 5)).toBe(-1);
    expect(shortestDelta(5, 0)).toBe(1);
    expect(shortestDelta(1, 3)).toBe(2);
    expect(shortestDelta(0, 3)).toBe(3);
  });

  it("moves one world per map-width of sideways scroll", () => {
    expect(wheelWorlds(800, 0, 800)).toBe(1);
    expect(wheelWorlds(-3, 1, 480)).toBeCloseTo(-0.1);
    expect(wheelWorlds(1, 2, 800)).toBe(1);
    expect(wheelWorlds(50, 0, 0)).toBe(0);
  });

  it("puts each world's marker at the centre of its cell, wrapping at the ends", () => {
    expect(markerFraction(0)).toBeCloseTo(0.5 / N);
    expect(markerFraction(5)).toBeCloseTo(5.5 / N);
    expect(markerFraction(5.5)).toBeCloseTo(0);
    expect(indexOf("ski")).toBe(4);
    expect(indexOf("nowhere")).toBe(-1);
  });
});
