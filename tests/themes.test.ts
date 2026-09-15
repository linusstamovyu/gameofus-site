import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import stopsJson from "../src/content/stops.json";
import { OUTFITS } from "../src/world/outfits";
import { THEMES, themeById } from "../src/world/themes";

const assets = resolve(__dirname, "../public/assets");
const site = resolve(__dirname, "../public");

describe("the world picker", () => {
  it("offers six worlds with unique ids, beach first", () => {
    expect(THEMES.map(t => t.id)).toEqual(["beach", "space", "neon", "jungle", "ski", "fairy"]);
  });

  it("gives every world the words the page shows", () => {
    for (const t of THEMES) {
      expect(t.label, t.id).toBeTruthy();
      expect(t.place, t.id).toMatch(/^(on|in|at) /);
      expect(t.lines.barrier, t.id).toBeTruthy();
    }
  });

  it("falls back to the beach for an unknown world", () => {
    expect(themeById("atlantis").id).toBe("beach");
    expect(themeById(null).id).toBe("beach");
  });

  it("keeps the {place} token in the map stop, so each world names itself", () => {
    expect(stopsJson.find(s => s.id === "places")?.text).toContain("{place}");
  });

  it("ships every file a world names", () => {
    for (const t of THEMES) for (const f of Object.values(t.files ?? {})) expect(existsSync(resolve(assets, f)), f).toBe(true);
  });

  it("has a dressed walk sheet for every lad in every world (python3 tools/dress_walk_sheet.py <world>)", () => {
    for (const sheets of Object.values(OUTFITS)) for (const f of Object.values(sheets ?? {})) expect(existsSync(resolve(site, f)), f).toBe(true);
  });
});
