import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MINIGAMES } from "../src/order/catalogue";
import { LOOP_DIP, MINIGAME_LOOPS, dipCover } from "../src/explore/minigameLoops";
import type { Scene } from "../src/order/steps/loops";

const DEMOS = join(__dirname, "..", "public", "minigames");

describe("the playable minigame demos", () => {
  // A card whose Play button opens a 404 is silent: the modal draws its frame and the game never arrives.
  it("has a deployed build behind every card", () => {
    for (const m of MINIGAMES) {
      const index = join(DEMOS, m.id, "index.html");
      expect(existsSync(index), `${m.id}: run tools/deploy_minigame_demos.py`).toBe(true);
    }
  });

  it("deploys nothing the catalogue cannot reach", () => {
    const ids = new Set(MINIGAMES.map(m => m.id));
    const onDisk = readdirSync(DEMOS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    expect(onDisk.filter(n => !ids.has(n))).toEqual([]);
  });

  it("keeps every build's asset paths relative, so it works under any deploy path", () => {
    // The site is built with base "./" and can be served from a preview subpath; an absolute /assets/… in a
    // sandbox's own index.html would only ever load from the domain root.
    for (const m of MINIGAMES) {
      const html = readFileSync(join(DEMOS, m.id, "index.html"), "utf8");
      expect(html.match(/(?:src|href)="\/[^/]/g), m.id).toBeNull();
    }
  });
});

describe("the minigame hover loops", () => {
  it("gives every minigame one, so the tab has no still left in it", () => {
    for (const m of MINIGAMES) expect(MINIGAME_LOOPS[m.id], m.id).toBeTypeOf("function");
  });

  it("names no game the catalogue does not sell", () => {
    const ids = new Set(MINIGAMES.map(m => m.id));
    expect(Object.keys(MINIGAME_LOOPS).filter(k => !ids.has(k))).toEqual([]);
  });

  it("comes back to the same frame it started on, so a lap does not cut", () => {
    // Each of these ends on its outcome, so the two ends of the story do NOT match; what makes the wrap
    // seamless is the dip `scene()` puts over every one of them. Both ends are covered, the middle is not.
    for (const [id, make] of Object.entries(MINIGAME_LOOPS)) {
      const s = make();
      expect(s.id, id).toBe(`mini-${id}`);
      expect(s.duration, id).toBeGreaterThan(LOOP_DIP * 4);
      expect(dipCover(0, s.duration), id).toBe(1);
      expect(dipCover(s.duration, s.duration), id).toBe(1);
      expect(dipCover(s.duration / 2, s.duration), id).toBe(0);
    }
  });

  it("covers the picture at both ends and nowhere else", () => {
    // The dip is drawn, not just computed: the last thing on the canvas at either end has to be a full-bleed
    // fill at full alpha, or the frames at 0 and at `duration` are only equal on paper.
    const s = MINIGAME_LOOPS.blackjack();
    const ends = [record(s, 0), record(s, s.duration)];
    for (const calls of ends) {
      expect(calls.at(-2)).toBe(`fillRect(0.000,0.000,300.000,200.000)`);
      expect(calls).toContain("globalAlpha=1.000");
    }
    expect(record(s, s.duration / 2).at(-1)).not.toBe(`fillRect(0.000,0.000,300.000,200.000)`);
  });

  it("draws every loop, all the way through, without throwing", () => {
    for (const [id, make] of Object.entries(MINIGAME_LOOPS)) {
      const s = make();
      for (let k = 0; k <= 40; k++) expect(() => record(s, (s.duration * k) / 40), `${id} at ${k}/40`).not.toThrow();
    }
  });
});

/** Every drawing call a scene makes at time t, as strings, with no canvas in sight. */
function record(scene: Scene, t: number): string[] {
  const calls: string[] = [];
  const say = (name: string) => (...args: unknown[]) => { calls.push(`${name}(${args.map(a => (typeof a === "number" ? a.toFixed(3) : String(a))).join(",")})`); };
  const g = new Proxy({} as Record<string, unknown>, {
    get: (store, key: string) => (key in store ? store[key] : say(key)),
    set: (store, key: string, value) => { calls.push(`${key}=${typeof value === "number" ? value.toFixed(3) : String(value)}`); store[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
  scene.draw(g, t, () => null);
  return calls;
}
