import { describe, expect, it } from "vitest";
import squad from "../src/content/squad.json";
import stops from "../src/content/stops.json";
import type { Stop } from "../src/content/types";
import { BeachMap, PLAYER_START } from "../src/world/map";
import {
  HOLD, SPEAKER_AT, STATIONS, STORY, faceTowards, STORY_SCREENS, TALKS, WALK, beats, holdPos, logLerp, smoother, talkAt, typed, walkGoal, wordOpacity,
} from "../src/story/storyline";

const map = new BeachMap(stops as unknown as Stop[]);

describe("homepage season story", () => {
  it("is about eight screens: grow, a six-world year, the face", () => {
    expect(STORY).toEqual({ grow: 1, year: 6, end: 1 });
    expect(STORY_SCREENS).toBe(8);
  });

  it("splits the scroll into its beats", () => {
    expect(beats(0)).toMatchObject({ u: 0, g: 0, y: 0, e: 0, done: false });
    const mid = beats(0.5);
    expect(mid.g).toBe(1);
    expect(mid.y).toBeCloseTo(0.5);
    expect(mid.e).toBe(0);
    expect(beats(1)).toMatchObject({ g: 1, y: 1, e: 1, done: true });
    expect(beats(2).u).toBe(8); // past the end is the end
  });

  it("holds on each world before dissolving, and closes the loop on summer", () => {
    expect(holdPos(0)).toBe(0);
    expect(holdPos((HOLD * 0.9) / 6)).toBe(0);
    expect(holdPos((1 + HOLD * 0.5) / 6)).toBe(1);
    const dissolving = holdPos((2 + (1 + HOLD) / 2) / 6);
    expect(dissolving).toBeGreaterThan(2);
    expect(dissolving).toBeLessThan(3);
    expect(holdPos(1)).toBe(6);
  });

  it("shows a world's word while it holds, never mid-dissolve", () => {
    expect(wordOpacity(3)).toBe(1);
    expect(wordOpacity(3.5)).toBe(0);
    expect(wordOpacity(2.9)).toBeGreaterThan(0);
  });

  it("walks Rico from where the game starts him, tile by tile, along a lane nothing stands on", () => {
    expect([WALK.from, WALK.row]).toEqual([...PLAYER_START]);
    for (let x = WALK.from; x <= WALK.to; x++) expect(map.walkable(x, WALK.row), `(${x}, ${WALK.row})`).toBe(true);
    // He walks up to each lad in turn and stops there, and the last stop is the end of the walk.
    expect(walkGoal(0)).toBe(STATIONS[0]);
    expect(walkGoal(5 / 6)).toBe(WALK.to);
    expect(walkGoal(1)).toBe(WALK.to);
    expect(STATIONS.length).toBe(6); // one per world
    let last: number = WALK.from;
    for (let y = 0; y <= 1; y += 0.005) { const g = walkGoal(y); expect(g).toBeGreaterThanOrEqual(last); last = g; }
  });

  it("has a line for every lad he passes, each spoken while he is near them", () => {
    const lads = (stops as unknown as Stop[]).filter(s => s.kind === "npc");
    expect(TALKS.map(t => t.who).filter(w => w !== "rico").sort()).toEqual(lads.map(s => s.id).sort());
    for (const t of TALKS) {
      expect(t.text.length, t.who).toBeLessThanOrEqual(80);
      if (t.who === "rico") continue;
      const s = lads.find(l => l.id === t.who)!;
      // They turn to Rico when he is within four tiles, which is what makes the line read as spoken to him.
      const mid = (t.from + t.to) / 2;
      expect(Math.abs(mid - s.x) + Math.abs(WALK.row - s.y), t.who).toBeLessThanOrEqual(4);
      expect(squad.some(m => m.id === s.who), t.who).toBe(true);
    }
    // Standing at a stop, the line is that stop's.
    STATIONS.forEach((x, i) => expect(talkAt(x), `stop ${x}`).toBe(TALKS[i]));
    // In walking order, never overlapping, and inside the walk.
    for (let i = 1; i < TALKS.length; i++) expect(TALKS[i].from).toBeGreaterThanOrEqual(TALKS[i - 1].to);
    expect(TALKS[0].from).toBeGreaterThanOrEqual(WALK.from);
    expect(talkAt(WALK.to)?.who).toBe("ethan");
    expect(talkAt(WALK.from)).toBeNull();
  });

  it("knows where every speaker stands, and turns Rico to them", () => {
    const all = stops as unknown as Stop[];
    for (const t of TALKS) {
      const at = SPEAKER_AT[t.who];
      expect(at, t.who).toBeDefined();
      const s = all.find(q => q.id === (t.who === "rico" ? "places" : t.who))!;
      expect(at, t.who).toEqual([s.x, s.y]);
    }
    // Nobody talks to Rico from the tile straight above or below him (the speech mark would sit on him).
    STATIONS.forEach((x, i) => { const at = SPEAKER_AT[TALKS[i].who]; expect(at[0] === x && Math.abs(at[1] - WALK.row) === 1).toBe(false); });
    expect(faceTowards(0, -2)).toBe("up");
    expect(faceTowards(1, 1)).toBe("down");
    expect(faceTowards(-3, 1)).toBe("left");
  });

  it("types a line out", () => {
    expect(typed("Hello there", 0)).toBe("");
    expect(typed("Hello there", 0.1)).toBe("Hell");
    expect(typed("Hello there", 10)).toBe("Hello there");
  });

  it("zooms evenly on a log scale and eases without jolts", () => {
    expect(logLerp(1, 16, 0.5)).toBeCloseTo(4);
    expect(smoother(0)).toBe(0);
    expect(smoother(1)).toBe(1);
    expect(smoother(0.5)).toBeCloseTo(0.5);
  });
});
