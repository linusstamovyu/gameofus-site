import { describe, expect, it } from "vitest";
import { ADDONS, LADDERS, quote } from "../src/order/prices";
import {
  cleanDate, formatDay, keepsakesSection as s, wantedByStatus, wantedByTooSoon, type KeepsakesChoices,
} from "../src/order/sections/keepsakes";
import type { SectionContext } from "../src/order/sections/types";

const ctx: SectionContext = { edition: "deluxe", includes: LADDERS.A.editions.deluxe.includes, friends: ["A", "B"], partyMode: false, currency: "DKK" };
const withGift = (patch: Partial<KeepsakesChoices["giftCard"]> = {}): KeepsakesChoices => ({ ...s.defaults(), giftCard: { on: true, recipient: "Sofie", message: "", giveOn: "", ...patch } });

describe("keepsakes section", () => {
  it("starts with nothing picked", () => {
    expect(s.defaults()).toEqual({ trailer: false, giftCard: { on: false, recipient: "", message: "", giveOn: "" }, rush: false, wantedBy: "" });
    expect(s.addons(s.defaults(), ctx)).toEqual({});
    expect(s.problems(s.defaults(), ctx)).toEqual([]);
    expect(s.summary(s.defaults(), ctx)).toEqual([]);
    expect(s.uploads(s.defaults())).toEqual([]);
  });

  it("check() survives junk and sanitises", () => {
    for (const junk of [null, undefined, 5, "x", [], { giftCard: "no" }, { giftCard: [] }]) expect(s.check(junk)).toEqual(s.defaults());
    const c = s.check({
      trailer: "true", rush: 1, wantedBy: "2026-02-30",
      giftCard: { on: true, recipient: `  ${"x".repeat(100)}  `, message: 42, giveOn: "24/12/2026" },
    });
    expect(c.trailer).toBe(false);
    expect(c.rush).toBe(false);
    expect(c.wantedBy).toBe("");
    expect(c.giftCard.on).toBe(true);
    expect(c.giftCard.recipient).toHaveLength(60);
    expect(c.giftCard.message).toBe("");
    expect(c.giftCard.giveOn).toBe("");
    expect(s.check({ trailer: true, rush: true, wantedBy: "2026-12-20", giftCard: { on: true, recipient: " Sofie ", message: "m".repeat(400), giveOn: "2026-12-24" } }))
      .toEqual({ trailer: true, rush: true, wantedBy: "2026-12-20", giftCard: { on: true, recipient: "Sofie", message: "m".repeat(300), giveOn: "2026-12-24" } });
  });

  it("validates dates strictly", () => {
    expect(cleanDate("2028-02-29")).toBe("2028-02-29");
    expect(cleanDate("2027-02-29")).toBe("");
    expect(cleanDate("2026-1-5")).toBe("");
    expect(cleanDate(20261224)).toBe("");
    expect(formatDay("2026-12-24")).toBe("24 Dec 2026");
  });

  it("adds trailer, gift card and the rush key", () => {
    expect(s.addons({ ...withGift(), trailer: true, rush: true }, ctx)).toEqual({ trailer: 1, gift_card: 1, rush: 1 });
    expect(s.addons({ ...s.defaults(), rush: true }, ctx)).toEqual({ rush: 1 });
    expect(s.addons(withGift({ on: false }), ctx)).toEqual({});
  });

  it("needs a recipient only when the gift card is on", () => {
    expect(s.problems(withGift({ recipient: "" }), ctx)).toEqual([expect.objectContaining({ field: "giftcard:recipient" })]);
    expect(s.problems(withGift(), ctx)).toEqual([]);
    expect(s.problems(withGift({ on: false, recipient: "" }), ctx)).toEqual([]);
    // A wanted-by date that's too soon is a warning in the UI, never a problem.
    expect(s.problems({ ...s.defaults(), wantedBy: "2026-09-16" }, ctx)).toEqual([]);
  });

  it("summarises in plain lines", () => {
    const c: KeepsakesChoices = { trailer: true, rush: true, wantedBy: "2026-12-20", giftCard: { on: true, recipient: "Sofie", message: "Press start", giveOn: "2026-12-24" } };
    expect(s.summary(c, ctx)).toEqual(["Trailer video", 'Gift card for Sofie, to give on 24 Dec 2026: "Press start"', "Rush delivery", "Wanted by 20 Dec 2026"]);
    expect(s.summary(withGift(), ctx)).toEqual(["Gift card for Sofie"]);
  });

  it("knows when a wanted-by date is too soon, per edition", () => {
    const today = "2026-09-15";
    expect(wantedByTooSoon("", "standard", today)).toBe(false);
    expect(wantedByTooSoon("2026-09-28", "standard", today)).toBe(true); // 13 days
    expect(wantedByTooSoon("2026-09-29", "standard", today)).toBe(false); // 14 days
    expect(wantedByTooSoon("2026-10-12", "deluxe", today)).toBe(true); // 27 days
    expect(wantedByTooSoon("2026-10-13", "deluxe", today)).toBe(false);
    expect(wantedByTooSoon("2026-10-26", "ultimate", today)).toBe(true); // 41 days
    expect(wantedByTooSoon("2026-10-27", "ultimate", today)).toBe(false);
    expect(wantedByStatus("2026-10-06", "ultimate", today)).toBe("rush"); // 21 days: rush makes it
    expect(wantedByStatus("2026-10-06", "ultimate", today, true)).toBe("ok");
    expect(wantedByStatus("2026-09-20", "standard", today, true)).toBe("tight");
    expect(wantedByStatus("2026-10-06", "ultimate", "not a date")).toBe("");
  });

  it("rush adds 50% of everything else in the price engine", () => {
    const picks = { edition: "deluxe" as const, friends: 6, bigGames: 3, minigames: 6, addons: { trailer: 1, gift_card: 1 } };
    const plain = quote(picks, "DKK", 999, "A");
    const rushed = quote({ ...picks, rush: true }, "DKK", 999, "A");
    expect(rushed.total - plain.total).toBe(Math.round(plain.total * 0.5));
    expect(plain.total).toBe(LADDERS.A.editions.deluxe.normal.DKK + ADDONS.trailer.price.DKK + ADDONS.gift_card.price.DKK);
  });
});
