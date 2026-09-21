import { describe, expect, it } from "vitest";
import squad from "../src/content/squad.json";
import stops from "../src/content/stops.json";
import type { SquadMember, Stop } from "../src/content/types";
import { AT_END, END_HOLD, FRIENDS, HOLD, INTRO, PULL, START, TOTAL, WALK, atFriend, phaseAt } from "../src/heroLab/plan";

const stopList = stops as unknown as Stop[];
const squadList = squad as unknown as SquadMember[];

describe("the homepage hero's scroll plan", () => {
  it("spends the track on the cast, the five friends and the ending", () => {
    expect(TOTAL).toBeCloseTo(START + INTRO + FRIENDS.length * (WALK + HOLD) + PULL + END_HOLD, 10);
  });

  it("introduces the cast between the transformation and the first walk", () => {
    // The beat exists so the scroll has something to do before anyone is walked to: a visitor who scrolls
    // straight past the start screen must still meet the five people the walk is about.
    expect(phaseAt(START - 0.01).kind).toBe("start");
    expect(phaseAt(START + INTRO / 2)).toMatchObject({ kind: "intro" });
    expect(phaseAt(START + INTRO + 0.01)).toMatchObject({ kind: "walk", i: 0 });
  });

  it("runs the intro from nothing to whole across its own stretch", () => {
    const first = phaseAt(START + 0.001);
    const last = phaseAt(START + INTRO - 0.001);
    expect(first.kind === "intro" && first.t).toBeLessThan(0.02);
    expect(last.kind === "intro" && last.t).toBeGreaterThan(0.98);
  });

  it("puts every friend's own card up at the spot the rail scrolls to", () => {
    // The rail's faces and the Next stop button are the guided tour: each has to land on the hold where that
    // friend's card is open, or a tour button scrolls to a walk that is still in progress.
    FRIENDS.forEach((_, i) => {
      const ph = phaseAt(atFriend(i));
      expect(ph).toMatchObject({ kind: "hold", i });
    });
    expect(phaseAt(AT_END).kind).toBe("end");
  });

  it("walks the friends in map order, so the route never doubles back", () => {
    const xs = FRIENDS.map(f => stopList.find(s => s.id === f.stop)!.ax);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("meets every friend in a world of their own", () => {
    expect(new Set(FRIENDS.map(f => f.world)).size).toBe(FRIENDS.length);
    expect(FRIENDS.some(f => f.world === 0)).toBe(false); // summer is where it starts and ends
  });

  it("has a real person, with a photo and a portrait, behind every stop on the rail", () => {
    // The rail and the cast intro are drawn from this: a stop with nobody at it is a face-shaped hole.
    for (const f of FRIENDS) {
      const who = stopList.find(s => s.id === f.stop)?.who;
      expect(who, f.stop).toBeTruthy();
      const m = squadList.find(x => x.id === who);
      expect(m, who).toBeTruthy();
      expect(m!.photo, `${who} photo`).toBeTruthy();
      expect(m!.face, `${who} face`).toBeTruthy();
    }
  });
});
