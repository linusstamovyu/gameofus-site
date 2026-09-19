import { describe, expect, it } from "vitest";
import { LADDERS, type EditionId } from "../src/order/prices";
import type { SectionContext, UploadRef } from "../src/order/sections/types";
import { MAX_OWN_CARS, VEHICLE_TYPES, vehiclesSection as s, type VehiclesChoices } from "../src/order/sections/vehicles";

const ctx = (edition: EditionId): SectionContext => ({ edition, includes: LADDERS.A.editions[edition].includes, friends: ["Mads", "Linus"], partyMode: false, currency: "DKK" });
const photo = (id: string): UploadRef => ({ id, kind: "image", name: "golf.jpg", type: "image/jpeg", size: 1234 });
const car = (id: string, description = "Mads's red Golf", p: UploadRef | null = photo(`p-${id}`)) => ({ id, description, photo: p });

describe("vehicles section", () => {
  it("starts empty, with nothing to fix and nothing to pay", () => {
    const d = s.defaults();
    expect(d).toEqual({ types: [], ownCars: [] });
    expect(s.problems(d, ctx("standard"))).toEqual([]);
    expect(s.addons(d, ctx("standard"))).toEqual({});
    expect(s.summary(d, ctx("standard"))).toEqual([]);
    expect(s.uploads(d)).toEqual([]);
  });

  it("never throws on junk and falls back to defaults", () => {
    for (const raw of [undefined, null, 3, "x", [], { types: "car" }, { ownCars: {} }, { types: [null, 7], ownCars: [null, 1, "a"] }]) {
      expect(s.check(raw)).toEqual({ types: [], ownCars: [] });
    }
  });

  it("drops unknown and duplicate vehicle ids and keeps catalogue order", () => {
    const c = s.check({ types: ["kart", "chauffeur", "car", "car", "__proto__", "taxi"] });
    expect(c.types).toEqual(["car", "taxi", "kart"]);
    expect(VEHICLE_TYPES.map(v => v.id)).not.toContain("chauffeur");
  });

  it("sanitises own cars: bad ids, duplicates, overlong text, the cap, bad photos", () => {
    const c = s.check({
      ownCars: [
        car("a", "  " + "x".repeat(300) + "  "),
        car("a"),
        car("bad id!"),
        { id: "x".repeat(41), description: "too long id", photo: null },
        { id: "b", description: 42, photo: { id: "ok", kind: "audio", name: "a", type: "audio/mp4", size: 1 } },
        { id: "c", description: "Van", photo: { id: "has space", kind: "image", type: "image/jpeg", size: 1 } },
        { id: "d", description: "Bike", photo: { id: "p1", kind: "image", type: 5, size: 1 } },
        { id: "e", description: "Bus", photo: { id: "p2", kind: "image", type: "image/jpeg", size: "1" } },
        car("f"), car("g"),
      ],
    });
    expect(c.ownCars.map(o => o.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(c.ownCars).toHaveLength(MAX_OWN_CARS);
    expect(c.ownCars[0].description).toHaveLength(100);
    expect(c.ownCars[1].description).toBe("");
    expect(c.ownCars.slice(1).every(o => o.photo === null)).toBe(true);
  });

  it("keeps a valid photo and strips control characters from text", () => {
    const c = s.check({ ownCars: [{ id: "a", description: `Red${String.fromCharCode(0)}Golf`, photo: { ...photo("p"), extra: "x" } }] });
    expect(c.ownCars[0]).toEqual({ id: "a", description: "Red Golf", photo: photo("p") });
  });

  it("charges vehicle types over the edition's allowance", () => {
    const three: VehiclesChoices = { types: ["car", "scooter", "taxi"], ownCars: [] };
    const five: VehiclesChoices = { types: VEHICLE_TYPES.map(v => v.id), ownCars: [] };
    expect(s.addons(three, ctx("standard"))).toEqual({ vehicle: 2 });
    expect(s.addons(three, ctx("deluxe"))).toEqual({});
    expect(s.addons(five, ctx("deluxe"))).toEqual({ vehicle: 2 });
    // Ultimate includes every vehicle type (99 = all).
    expect(LADDERS.A.editions.ultimate.includes.vehicles).toBe(99);
    expect(s.addons(five, ctx("ultimate"))).toEqual({});
    expect(s.addons({ types: ["car"], ownCars: [] }, ctx("standard"))).toEqual({});
  });

  it("charges every own car, even without picking cars, and on Ultimate", () => {
    const c: VehiclesChoices = { types: [], ownCars: [car("a"), car("b")] };
    expect(s.addons(c, ctx("standard"))).toEqual({ own_car: 2 });
    expect(s.addons({ ...c, types: ["car", "kart"] }, ctx("ultimate"))).toEqual({ own_car: 2 });
    expect(s.addons({ ...c, types: ["car", "kart"] }, ctx("standard"))).toEqual({ vehicle: 1, own_car: 2 });
  });

  it("asks for a description and a photo on each own car", () => {
    const c: VehiclesChoices = { types: [], ownCars: [car("a"), car("b", "  ", null), car("c", "Van", null)] };
    const p = s.problems(c, ctx("standard"));
    expect(p).toHaveLength(3);
    const has = (text: string, what: string, field: string) =>
      p.some(x => typeof x !== "string" && x.message.includes(text) && x.message.includes(what) && x.field === field);
    expect(has("Car 2", "description", "car:1:description")).toBe(true);
    expect(has("Car 2", "photo", "car:1:photo")).toBe(true);
    expect(has("Van", "photo", "car:2:photo")).toBe(true);
    expect(s.problems({ types: ["taxi"], ownCars: [car("a")] }, ctx("standard"))).toEqual([]);
  });

  it("summarises types and own cars in plain lines", () => {
    const c: VehiclesChoices = { types: ["car", "taxi"], ownCars: [car("a")] };
    expect(s.summary(c, ctx("deluxe"))).toEqual(["Vehicles: Cars, Taxi", "Their own car: Mads's red Golf"]);
  });

  it("uploads only the own-car photos that are set", () => {
    const c: VehiclesChoices = { types: [], ownCars: [car("a"), car("b", "Van", null), car("c", "Bus", photo("pc"))] };
    expect(s.uploads(c)).toEqual([photo("p-a"), photo("pc")]);
  });

  it("never names brands the site must not use", () => {
    const text = JSON.stringify(VEHICLE_TYPES);
    for (const w of ["Pokémon", "Pokemon", "Minecraft", "Fortnite", "Ronaldo", "Jonesy", "Lime"]) expect(text).not.toContain(w);
  });
});
