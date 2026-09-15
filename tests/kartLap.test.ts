import { describe, expect, it } from "vitest";
import { CENTRELINE, LAP_TILES, LapCounter, dirForHeading, nearest, onTrack, poseAt } from "../src/world/kartLap";

describe("the showcase kart circuit", () => {
  it("is the game's 318-tile lap", () => {
    expect(LAP_TILES).toBe(318);
  });

  it("puts every point of the lap on the tarmac, facing along it", () => {
    for (let d = 0; d < LAP_TILES; d += 0.5) {
      const p = poseAt(d);
      expect(onTrack(p.x, p.y), `d=${d}`).toBe(true);
    }
    expect(poseAt(1).dir).toBe("right");
    expect(poseAt(LAP_TILES - 1).dir).toBe("down");
    expect(onTrack(20, 30)).toBe(false); // the infield sand
  });

  it("counts a lap driven the right way, and nothing for reversing or cutting across", () => {
    const start = poseAt(0);
    const lap = new LapCounter(nearest(start.x, start.y).along);
    for (let d = 0; d <= LAP_TILES; d += 0.2) { const p = poseAt(d); lap.update(p.x, p.y); }
    expect(lap.distance).toBeGreaterThanOrEqual(LAP_TILES - 1);

    const back = new LapCounter(nearest(start.x, start.y).along);
    for (let d = 0; d > -40; d -= 0.2) { const p = poseAt(d); back.update(p.x, p.y); }
    expect(back.distance).toBe(0);

    const cut = new LapCounter(nearest(6.5, 50.5).along);
    cut.update(6.5, 50.5);
    cut.update(6.5, 6.5); // straight up the west side to the other end of the lap
    expect(cut.distance).toBe(0);
  });

  it("picks the car facing closest to a free heading", () => {
    expect(dirForHeading(0)).toBe("right");
    expect(dirForHeading(Math.PI / 2)).toBe("down");
    expect(dirForHeading(Math.PI)).toBe("left");
    expect(CENTRELINE.length).toBeGreaterThan(4);
  });
});
