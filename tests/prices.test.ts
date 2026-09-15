import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import offer from "../src/content/offer.json";
import {
  ACTIVE_LADDER, ADDONS, CURRENCIES, EDITION_IDS, FOUNDER_SPOTS, LADDERS, formatMoney, quote, smallestEditionFor, upgradeHint,
  type AddonId, type Currency, type LadderId,
} from "../src/order/prices";

const plan03 = readFileSync(resolve(__dirname, "../../Game of Us/03-offer-and-catalogue.md"), "utf8");
const ladders = Object.keys(LADDERS) as LadderId[];
const major = (minor: number, c: Currency) => (c === "DKK" ? Math.round(minor / 100).toLocaleString("en-US") : (minor / 100).toFixed(2));

describe("price file agrees with plan 03", () => {
  it.each(ladders)("ladder %s: every edition's founder and normal price is in plan 03", l => {
    for (const id of EDITION_IDS) {
      const e = LADDERS[l].editions[id];
      for (const p of [e.founder, e.normal]) {
        expect(plan03, `${l} ${id} ${p.DKK}`).toContain(`${major(p.DKK, "DKK")} DKK`);
        expect(plan03, `${l} ${id} £`).toContain(`£${major(p.GBP, "GBP")}`);
        expect(plan03, `${l} ${id} €`).toContain(`€${major(p.EUR, "EUR")}`);
      }
    }
  });

  it("every add-on price is in plan 03 as DKK · £ · €", () => {
    for (const a of Object.values(ADDONS)) {
      if (a.id === "hosting_year") continue; // written as "39/month or 299/year" in the plan
      const row = `${major(a.price.DKK, "DKK")} · ${major(a.price.GBP, "GBP")} · ${major(a.price.EUR, "EUR")}`;
      expect(plan03, `${a.id} ${row}`).toContain(row);
    }
  });

  it("the active ladder is one the plan and the site copy know about", () => {
    expect(ladders).toContain(ACTIVE_LADDER);
    for (const [id] of Object.values(offer.addons).flat()) expect(ADDONS, String(id)).toHaveProperty(String(id));
  });
});

describe("price rules", () => {
  it.each(ladders)("ladder %s: charm endings, normal above founder, editions rise", l => {
    let last = 0;
    for (const id of EDITION_IDS) {
      const e = LADDERS[l].editions[id];
      for (const c of CURRENCIES) {
        expect(e.normal[c], `${l} ${id} ${c}`).toBeGreaterThan(e.founder[c]);
        for (const p of [e.founder[c], e.normal[c]]) expect(c === "DKK" ? p % 1000 : p % 100, `${l} ${id} ${c} ${p}`).toBe(c === "DKK" ? 900 : 99);
      }
      expect(e.founder.DKK).toBeGreaterThan(last);
      last = e.founder.DKK;
    }
  });

  it("add-ons end in 9 in every currency", () => {
    for (const a of Object.values(ADDONS)) {
      expect(a.price.DKK % 1000, a.id).toBe(900);
      expect(a.price.GBP % 100, a.id).toBe(99);
      expect(a.price.EUR % 100, a.id).toBe(99);
    }
  });

  it("ladder B's price per friend falls gently as the group grows (the reason B exists)", () => {
    const e = LADDERS.B.editions;
    const per = (id: "deluxe" | "ultimate") => e[id].founder.DKK / e[id].people;
    expect(per("ultimate")).toBeLessThan(per("deluxe"));
    expect(per("ultimate") / per("deluxe")).toBeGreaterThan(0.85);
  });
});

describe("quote", () => {
  const base = { edition: "deluxe" as const, friends: 6, bigGames: 3, minigames: 6 };

  it("charges only the edition when the picks fit the allowance", () => {
    const q = quote(base, "DKK", 0, "B");
    expect(q.total).toBe(LADDERS.B.editions.deluxe.founder.DKK);
    expect(q.lines).toHaveLength(1);
    expect(q.founder).toBe(true);
  });

  it("charges extras over the allowance at the add-on price", () => {
    const q = quote({ ...base, friends: 7, bigGames: 4, minigames: 8 }, "GBP", 0, "B");
    const e = LADDERS.B.editions.deluxe.founder.GBP;
    expect(q.total).toBe(e + ADDONS.character_custom.price.GBP + ADDONS.big_game.price.GBP + 2 * ADDONS.minigame.price.GBP);
  });

  it("switches to normal prices after the founder spots", () => {
    expect(quote(base, "EUR", FOUNDER_SPOTS - 1, "A").founder).toBe(true);
    const q = quote(base, "EUR", FOUNDER_SPOTS, "A");
    expect(q.founder).toBe(false);
    expect(q.total).toBe(LADDERS.A.editions.deluxe.normal.EUR);
  });

  it("turns an order with a custom item into a request", () => {
    expect(quote({ ...base, addons: { big_game_custom: 1 } }, "DKK", 0).isRequest).toBe(true);
    expect(quote({ ...base, addons: { flex_pass: 1 } }, "DKK", 0).isRequest).toBe(false);
  });

  it("never charges for unknown ids, off-ladder add-ons or silly quantities", () => {
    const q = quote({ ...base, friends: 400, bigGames: -3, addons: { nope: 5, directors_cut: 1 } as Partial<Record<AddonId, number>> }, "DKK", 0, "A");
    expect(q.lines.find(l => l.id === "directors_cut")).toBeUndefined();
    expect(q.lines.find(l => l.id === "character_custom")?.qty).toBe(6); // capped at 12 friends
  });

  it("pre-selects the smallest edition that fits and hints an upgrade that costs no more", () => {
    expect(smallestEditionFor(3, "B")).toBe("standard");
    expect(smallestEditionFor(3, "A")).toBe("deluxe");
    expect(smallestEditionFor(12, "B")).toBe("ultimate");
    const heavy = { edition: "standard" as const, friends: 6, bigGames: 3, minigames: 6 };
    expect(upgradeHint(heavy, "DKK", 0, "B")?.edition).toBe("deluxe");
    expect(upgradeHint(base, "DKK", 0, "B")).toBeNull();
  });

  it("formats each currency the way the page shows it", () => {
    expect(formatMoney(104900, "DKK")).toBe("1,049 DKK");
    expect(formatMoney(11999, "GBP")).toBe("£119.99");
    expect(formatMoney(13999, "EUR")).toBe("€139.99");
  });
});
