import { describe, expect, it } from "vitest";
import { LADDERS, type EditionId } from "../src/order/prices";
import { MAX_PLACES, worldSection, type Place, type WorldChoices } from "../src/order/sections/world";
import type { SectionContext, UploadRef } from "../src/order/sections/types";

const ctxFor = (edition: EditionId, zones?: number): SectionContext => {
  const includes = { ...LADDERS.A.editions[edition].includes };
  if (zones != null) includes.zones = zones;
  return { edition, includes, friends: ["A", "B"], partyMode: false, currency: "DKK" };
};

const photo = (id: string): UploadRef => ({ id, kind: "image", name: `${id}.jpg`, type: "image/jpeg", size: 1000 });
let n = 0;
const place = (over: Partial<Place> = {}): Place => ({
  id: `p${++n}`, kind: "town", kit: "town", name: "Somewhere", mapPin: "", fromPhotos: false, photos: [], notes: "", ...over,
});
const world = (places: Place[], signs: string[] = []): WorldChoices => ({ places, signs });

describe("world section", () => {
  it("starts empty", () => {
    expect(worldSection.defaults()).toEqual({ places: [], signs: [] });
    expect(worldSection.id).toBe("world");
  });

  it("check() survives junk", () => {
    for (const junk of [null, undefined, 42, "x", [], true, { places: "no", signs: 7 }]) {
      expect(worldSection.check(junk)).toEqual({ places: [], signs: [] });
    }
  });

  it("check() sanitises places", () => {
    const huge = "x".repeat(10_000);
    const c = worldSection.check({
      places: [
        { id: "ok-1", kind: "castle", kit: "moon", name: `  ${huge}`, mapPin: huge, notes: huge, fromPhotos: "yes", photos: "nope" },
        { id: "bad id!", name: "dropped" },
        { id: "x".repeat(41), name: "dropped" },
        { id: "ok-1", name: "duplicate" },
        null,
        5,
        { id: "ok-2", kind: "country", kit: "beach", name: " Berlin ", fromPhotos: true },
      ],
      signs: ["  The Rusty Anchor ", "", 5, huge, null],
    });
    expect(c.places.map(p => p.id)).toEqual(["ok-1", "ok-2"]);
    const [a, b] = c.places;
    expect(a.kind).toBe("town");
    expect(a.kit).toBe("town");
    expect(a.name.length).toBe(80);
    expect(a.mapPin.length).toBe(300);
    expect(a.notes.length).toBe(500);
    expect(a.fromPhotos).toBe(false);
    expect(a.photos).toEqual([]);
    expect(b).toMatchObject({ kind: "country", kit: "beach", name: "Berlin", fromPhotos: true });
    expect(c.signs).toEqual(["The Rusty Anchor", "x".repeat(40)]);
  });

  it("check() caps places at 10 and signs at 10", () => {
    const c = worldSection.check({
      places: Array.from({ length: 50 }, (_, i) => ({ id: `p-${i}`, name: `Place ${i}` })),
      signs: Array.from({ length: 50 }, (_, i) => `Sign ${i}`),
    });
    expect(c.places.length).toBe(MAX_PLACES);
    expect(c.signs.length).toBe(10);
  });

  it("check() validates uploads", () => {
    const c = worldSection.check({
      places: [{
        id: "home", name: "Home", fromPhotos: true,
        photos: [
          photo("good-1"),
          { ...photo("audio"), kind: "audio" },
          { ...photo("neg"), size: -1 },
          { ...photo("nan"), size: Number.NaN },
          { ...photo("strsize"), size: "12" },
          { ...photo("notype"), type: 3 },
          { ...photo("bad/id") },
          photo("good-1"),
          null,
          photo("good-2"), photo("good-3"), photo("good-4"), photo("good-5"), photo("good-6"),
        ],
      }],
    });
    expect(c.places[0].photos.map(p => p.id)).toEqual(["good-1", "good-2", "good-3", "good-4", "good-5"]);
  });

  it("check() keeps valid choices unchanged", () => {
    const good = world([place({ id: "h", kind: "home", kit: "home", name: "Our flat", fromPhotos: true, photos: [photo("a")] })], ["Kebab King"]);
    expect(worldSection.check(good)).toEqual(good);
  });

  describe("addons", () => {
    const editions: EditionId[] = ["standard", "deluxe", "ultimate"];

    it("uses each edition's zone allowance", () => {
      const places = [place(), place(), place(), place(), place(), place(), place()]; // 7 template places
      const got = Object.fromEntries(editions.map(e => [e, worldSection.addons(world(places), ctxFor(e))]));
      expect(got.standard).toEqual({ zone: 7 - LADDERS.A.editions.standard.includes.zones });
      expect(got.deluxe).toEqual({ zone: 7 - LADDERS.A.editions.deluxe.includes.zones });
      expect(got.ultimate).toEqual({ zone: 7 - LADDERS.A.editions.ultimate.includes.zones });
    });

    it("nothing extra within the allowance", () => {
      for (const e of editions) {
        const zones = LADDERS.A.editions[e].includes.zones;
        const places = Array.from({ length: zones }, () => place());
        expect(worldSection.addons(world(places), ctxFor(e))).toEqual({});
      }
      expect(worldSection.addons(world([]), ctxFor("standard"))).toEqual({});
    });

    it("covers from-photos places first", () => {
      const P = (k: number) => Array.from({ length: k }, () => place({ fromPhotos: true, photos: [photo(`f${++n}`)] }));
      const T = (k: number) => Array.from({ length: k }, () => place());
      // zones 5: 2 photo + 4 template -> photos covered, 3 left, 1 extra template
      expect(worldSection.addons(world([...T(4), ...P(2)]), ctxFor("ultimate", 5))).toEqual({ zone: 1 });
      // zones 5: 7 photo + 2 template -> 2 extra photo places, 2 extra template
      expect(worldSection.addons(world([...P(7), ...T(2)]), ctxFor("ultimate", 5))).toEqual({ zone_photos: 2, zone: 2 });
      // standard (1 zone): 1 template + 1 photo -> the photo place takes the slot
      expect(worldSection.addons(world([...T(1), ...P(1)]), ctxFor("standard"))).toEqual({ zone: 1 });
      // zones 5: exactly 5 photo places -> nothing extra
      expect(worldSection.addons(world(P(5)), ctxFor("ultimate", 5))).toEqual({});
    });

    it("charges every sign", () => {
      expect(worldSection.addons(world([place()], ["A", "B", "C"]), ctxFor("ultimate"))).toEqual({ shop_sign: 3 });
    });
  });

  it("problems", () => {
    const ctx = ctxFor("standard");
    expect(worldSection.problems(world([]), ctx)).toEqual(["Add at least your home base."]);
    expect(worldSection.problems(world([place({ name: "Home" })]), ctx)).toEqual([]);
    expect(worldSection.problems(world([place({ name: "" })]), ctx)).toHaveLength(1);
    const noPhotos = worldSection.problems(world([place({ name: "Beach", fromPhotos: true })]), ctx);
    expect(noPhotos).toHaveLength(1);
    expect(noPhotos[0]).toMatch(/photo/);
    expect(worldSection.problems(world([place({ name: "Beach", fromPhotos: true, photos: [photo("z")] })]), ctx)).toEqual([]);
  });

  it("summary", () => {
    const c = world([
      place({ kind: "home", name: "Our flat in Nørrebro", fromPhotos: true, photos: [photo("s1"), photo("s2"), photo("s3")] }),
      place({ kind: "country", kit: "city", name: "Berlin" }),
    ], ["The Rusty Anchor", "Kebab King"]);
    expect(worldSection.summary(c, ctxFor("deluxe"))).toEqual([
      "Home · Our flat in Nørrebro (from 3 photos)",
      "Another country · Berlin (city style)",
      "Signs: The Rusty Anchor, Kebab King",
    ]);
    expect(worldSection.summary(world([]), ctxFor("deluxe"))).toEqual([]);
  });

  it("uploads lists every photo", () => {
    const c = world([
      place({ photos: [photo("u1"), photo("u2")] }),
      place(),
      place({ photos: [photo("u3")] }),
    ]);
    expect(worldSection.uploads(c).map(u => u.id)).toEqual(["u1", "u2", "u3"]);
  });
});
