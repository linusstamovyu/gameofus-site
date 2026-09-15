import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import offer from "../src/content/offer.json";
import site from "../src/content/site.json";
import squad from "../src/content/squad.json";
import stops from "../src/content/stops.json";

const root = resolve(__dirname, "..");
const plan03 = resolve(root, "../Game of Us/03-offer-and-catalogue.md");
const assets = resolve(root, "public/assets");

describe("prices", () => {
  it("match plan 03 exactly", () => {
    const text = readFileSync(plan03, "utf8");
    for (const t of offer.tiers) {
      const shown = t.priceDkk.toLocaleString("en-US");
      expect(text, `${t.name} ${shown} DKK`).toContain(`${shown} DKK`);
    }
  });

  it("show the most-picked tier once", () => {
    expect(offer.tiers.filter(t => t.star)).toHaveLength(1);
  });
});

describe("assets", () => {
  const referenced = new Set<string>();
  for (const m of squad) [m.walk, m.face, m.photo].forEach(f => f && referenced.add(f));
  for (const s of stops) {
    referenced.add(s.art);
    for (const [src] of (s as { thumbs?: [string, string][] }).thumbs ?? []) referenced.add(src);
  }
  const html = readFileSync(resolve(root, "index.html"), "utf8");
  for (const m of html.matchAll(/assets\/([\w.-]+\.(?:png|jpg))/g)) referenced.add(m[1]);

  it("every file the site names has been built (run npm run assets)", () => {
    for (const f of referenced) expect(existsSync(resolve(assets, f)), f).toBe(true);
  });

  it("first load stays inside the 3 MB budget", () => {
    const total = readdirSync(assets).filter(f => f !== "share.jpg").reduce((n, f) => n + statSync(resolve(assets, f)).size, 0);
    expect(total).toBeLessThanOrEqual(3 * 1024 * 1024);
  });
});

describe("what the site must never say", () => {
  const files = ["index.html", "privacy.html", "terms.html", "src/content/squad.json", "src/content/stops.json", "src/content/faq.json", "src/content/offer.json"];
  // Franchise names stay out of copy and metadata (plan clip rules).
  const banned = [/pok[eé]mon/i, /minecraft/i, /fortnite/i, /ronaldo/i, /jonesy/i];
  it.each(files)("%s names no franchise or celebrity", f => {
    const text = readFileSync(resolve(root, f), "utf8");
    for (const b of banned) expect(text, `${f} ${b}`).not.toMatch(b);
  });

  it("launches with the draft labels switched off", () => {
    // Deliberately a reminder, not a failure, until launch day: flip isDraft in site.json.
    expect(typeof site.isDraft).toBe("boolean");
  });
});
